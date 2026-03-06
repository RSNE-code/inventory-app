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
    pieceUnit: string | null
    dimLength: number | null
    dimLengthUnit: string | null
    dimWidth: number | null
    dimWidthUnit: string | null
    dimThickness: number | null
    dimThicknessUnit: string | null
  }
}

const NONE_VALUE = "__none__"

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
  const [pieceUnit, setPieceUnit] = useState(product?.pieceUnit || NONE_VALUE)
  const [dimLength, setDimLength] = useState(product?.dimLength?.toString() || "")
  const [dimLengthUnit, setDimLengthUnit] = useState(product?.dimLengthUnit || "ft")
  const [dimWidth, setDimWidth] = useState(product?.dimWidth?.toString() || "")
  const [dimWidthUnit, setDimWidthUnit] = useState(product?.dimWidthUnit || "ft")
  const [dimThickness, setDimThickness] = useState(product?.dimThickness?.toString() || "")
  const [dimThicknessUnit, setDimThicknessUnit] = useState(product?.dimThicknessUnit || "in")

  useEffect(() => {
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
    fetchCategories()
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
      pieceUnit: pieceUnit === NONE_VALUE ? null : pieceUnit,
      dimLength: dimLength ? parseFloat(dimLength) : null,
      dimLengthUnit: dimLength ? dimLengthUnit : null,
      dimWidth: dimWidth ? parseFloat(dimWidth) : null,
      dimWidthUnit: dimWidth ? dimWidthUnit : null,
      dimThickness: dimThickness ? parseFloat(dimThickness) : null,
      dimThicknessUnit: dimThickness ? dimThicknessUnit : null,
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

      {/* Piece Unit */}
      <div className="space-y-2">
        <Label>Piece Unit</Label>
        <Select value={pieceUnit} onValueChange={setPieceUnit}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Select piece unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None</SelectItem>
            <SelectItem value="pieces">Pieces</SelectItem>
            <SelectItem value="sheets">Sheets</SelectItem>
            <SelectItem value="panels">Panels</SelectItem>
            <SelectItem value="units">Units</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-text-muted">How this product is counted on a BOM for the shop</p>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        <Label className="text-base">Dimensions</Label>

        {/* Length */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-sm text-text-secondary shrink-0">Length</span>
          <Input
            type="number"
            min="0"
            step="any"
            value={dimLength}
            onChange={(e) => setDimLength(e.target.value)}
            placeholder="—"
            className="h-11 flex-1"
          />
          <Select value={dimLengthUnit} onValueChange={setDimLengthUnit}>
            <SelectTrigger className="h-11 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ft">ft</SelectItem>
              <SelectItem value="in">in</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Width */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-sm text-text-secondary shrink-0">Width</span>
          <Input
            type="number"
            min="0"
            step="any"
            value={dimWidth}
            onChange={(e) => setDimWidth(e.target.value)}
            placeholder="—"
            className="h-11 flex-1"
          />
          <Select value={dimWidthUnit} onValueChange={setDimWidthUnit}>
            <SelectTrigger className="h-11 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ft">ft</SelectItem>
              <SelectItem value="in">in</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Thickness */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-sm text-text-secondary shrink-0">Thickness</span>
          <Input
            type="number"
            min="0"
            step="any"
            value={dimThickness}
            onChange={(e) => setDimThickness(e.target.value)}
            placeholder="—"
            className="h-11 flex-1"
          />
          <Select value={dimThicknessUnit} onValueChange={setDimThicknessUnit}>
            <SelectTrigger className="h-11 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ft">ft</SelectItem>
              <SelectItem value="in">in</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-text-muted">Length is used for BOM piece conversion (e.g., 8 ft angle = 1 piece)</p>
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
