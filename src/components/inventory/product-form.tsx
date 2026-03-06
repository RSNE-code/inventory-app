"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
}

interface ProductFormProps {
  product?: {
    id: string
    name: string
    sku: string | null
    categoryId: string
    tier: string
    unitOfMeasure: string
    reorderPoint: number
    location: string | null
    notes: string | null
    leadTimeDays: number | null
    pieceSize: number | null
    pieceUnit: string | null
  }
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const [name, setName] = useState(product?.name || "")
  const [sku, setSku] = useState(product?.sku || "")
  const [categoryId, setCategoryId] = useState(product?.categoryId || "")
  const [tier, setTier] = useState(product?.tier || "TIER_1")
  const [unitOfMeasure, setUnitOfMeasure] = useState(product?.unitOfMeasure || "ea")
  const [reorderPoint, setReorderPoint] = useState(product?.reorderPoint?.toString() || "0")
  const [location, setLocation] = useState(product?.location || "")
  const [notes, setNotes] = useState(product?.notes || "")
  const [leadTimeDays, setLeadTimeDays] = useState(product?.leadTimeDays?.toString() || "")
  const [pieceSize, setPieceSize] = useState(product?.pieceSize?.toString() || "")
  const [pieceUnit, setPieceUnit] = useState(product?.pieceUnit || "")

  useEffect(() => {
    fetch("/api/inventory?limit=1")
      .then((r) => r.json())
      .then((data) => {
        // Fetch categories from a separate list
        fetch("/api/inventory?limit=1").then(() => {
          // Get unique categories
          fetchCategories()
        })
      })

    async function fetchCategories() {
      const res = await fetch("/api/inventory?limit=500")
      const json = await res.json()
      const cats: Category[] = []
      const seen = new Set<string>()
      for (const p of json.data || []) {
        if (p.category && !seen.has(p.category.id)) {
          seen.add(p.category.id)
          cats.push({ id: p.category.id, name: p.category.name })
        }
      }
      cats.sort((a, b) => a.name.localeCompare(b.name))
      setCategories(cats)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body = {
      name,
      sku: sku || null,
      categoryId,
      tier,
      unitOfMeasure,
      reorderPoint: parseFloat(reorderPoint) || 0,
      location: location || null,
      notes: notes || null,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : null,
      pieceSize: pieceSize ? parseFloat(pieceSize) : null,
      pieceUnit: pieceUnit || null,
    }

    try {
      const url = product ? `/api/inventory/${product.id}` : "/api/inventory"
      const method = product ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save product")
      }

      const json = await res.json()
      toast.success(product ? "Product updated" : "Product created")
      router.push(`/inventory/${json.data.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="name">Product Name *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sku">SKU / Part Number</Label>
        <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} className="h-12" />
      </div>

      <div className="space-y-2">
        <Label>Category *</Label>
        <Select value={categoryId} onValueChange={setCategoryId} required>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tier</Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TIER_1">Tier 1 (Tracked)</SelectItem>
              <SelectItem value="TIER_2">Tier 2 (Costing Only)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="uom">Unit of Measure *</Label>
          <Select value={unitOfMeasure} onValueChange={setUnitOfMeasure}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ea">Each</SelectItem>
              <SelectItem value="ft">Linear Ft</SelectItem>
              <SelectItem value="sq ft">Sq Ft</SelectItem>
              <SelectItem value="sheet">Sheet</SelectItem>
              <SelectItem value="tube">Tube</SelectItem>
              <SelectItem value="roll">Roll</SelectItem>
              <SelectItem value="box">Box</SelectItem>
              <SelectItem value="gal">Gallon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reorderPoint">Reorder Point</Label>
          <Input
            id="reorderPoint"
            type="number"
            min="0"
            step="0.01"
            value={reorderPoint}
            onChange={(e) => setReorderPoint(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="leadTime">Lead Time (days)</Label>
          <Input
            id="leadTime"
            type="number"
            min="1"
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(e.target.value)}
            className="h-12"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location in Shop</Label>
        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Rack A3, Bay 2" className="h-12" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pieceSize">Piece Size</Label>
          <Input
            id="pieceSize"
            type="number"
            min="0"
            step="any"
            value={pieceSize}
            onChange={(e) => setPieceSize(e.target.value)}
            placeholder="e.g., 8"
            className="h-12"
          />
          <p className="text-xs text-text-muted">How many units per piece (e.g., 8 ft per piece)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pieceUnit">Piece Unit</Label>
          <Input
            id="pieceUnit"
            value={pieceUnit}
            onChange={(e) => setPieceUnit(e.target.value)}
            placeholder="e.g., piece, panel"
            className="h-12"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-12" />
      </div>

      <Button
        type="submit"
        disabled={loading || !name || !categoryId}
        className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base mt-6"
      >
        {loading ? "Saving..." : product ? "Save Changes" : "Add Product"}
      </Button>
    </form>
  )
}
