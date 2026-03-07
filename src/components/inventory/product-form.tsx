"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"

type DimType = "length" | "width" | "thickness"
interface Dimension {
  type: DimType
  value: string
  unit: string
}

const DIM_LABELS: Record<DimType, string> = {
  length: "Length",
  width: "Width",
  thickness: "Thickness",
}

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
    shopUnit: string | null
    reorderPoint: number
    location: string | null
    notes: string | null
    leadTimeDays: number | null
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
  const [shopUnit, setShopUnit] = useState(product?.shopUnit || NONE_VALUE)
  const [reorderPoint, setReorderPoint] = useState(product?.reorderPoint?.toString() || "0")
  const [location, setLocation] = useState(product?.location || "")
  const [notes, setNotes] = useState(product?.notes || "")
  const [leadTimeDays, setLeadTimeDays] = useState(product?.leadTimeDays?.toString() || "")

  // Build initial dimensions from existing product data
  const initialDims: Dimension[] = []
  if (product?.dimLength) initialDims.push({ type: "length", value: product.dimLength.toString(), unit: product.dimLengthUnit || "ft" })
  if (product?.dimWidth) initialDims.push({ type: "width", value: product.dimWidth.toString(), unit: product.dimWidthUnit || "ft" })
  if (product?.dimThickness) initialDims.push({ type: "thickness", value: product.dimThickness.toString(), unit: product.dimThicknessUnit || "in" })
  const [dimensions, setDimensions] = useState<Dimension[]>(initialDims)

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

  function getDimValue(type: DimType): number | null {
    const dim = dimensions.find((d) => d.type === type)
    return dim?.value ? parseFloat(dim.value) : null
  }

  function getDimUnit(type: DimType): string | null {
    const dim = dimensions.find((d) => d.type === type)
    return dim?.value ? dim.unit : null
  }

  function addDimension(type: DimType) {
    setDimensions((prev) => [...prev, { type, value: "", unit: type === "thickness" ? "in" : "ft" }])
  }

  function removeDimension(type: DimType) {
    setDimensions((prev) => prev.filter((d) => d.type !== type))
  }

  function updateDimension(type: DimType, field: "value" | "unit", val: string) {
    setDimensions((prev) =>
      prev.map((d) => (d.type === type ? { ...d, [field]: val } : d))
    )
  }

  const availableDims: DimType[] = (["length", "width", "thickness"] as DimType[]).filter(
    (t) => !dimensions.some((d) => d.type === t)
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body = {
      name,
      sku: sku || null,
      categoryId,
      tier,
      unitOfMeasure,
      shopUnit: shopUnit === NONE_VALUE ? null : shopUnit,
      reorderPoint: parseFloat(reorderPoint) || 0,
      location: location || null,
      notes: notes || null,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : null,
      dimLength: getDimValue("length"),
      dimLengthUnit: getDimUnit("length"),
      dimWidth: getDimValue("width"),
      dimWidthUnit: getDimUnit("width"),
      dimThickness: getDimValue("thickness"),
      dimThicknessUnit: getDimUnit("thickness"),
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
          <Label htmlFor="uom">Order Unit *</Label>
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

      {/* Shop Unit */}
      <div className="space-y-2">
        <Label>Shop Unit</Label>
        <Select value={shopUnit} onValueChange={setShopUnit}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Select shop unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None (same as order unit)</SelectItem>
            <SelectItem value="ft">Linear Feet (ft)</SelectItem>
            <SelectItem value="in">Inches (in)</SelectItem>
            <SelectItem value="sq ft">Square Feet (sq ft)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-text-muted">How the shop measures this item. Uses dimensions for conversion.</p>
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

      {/* Dimensions */}
      <div className="space-y-3">
        <Label className="text-base">Dimensions</Label>

        {availableDims.length > 0 && (
          <div className="flex gap-2">
            {availableDims.map((type) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                onClick={() => addDimension(type)}
                className="h-10 px-4 text-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {DIM_LABELS[type]}
              </Button>
            ))}
          </div>
        )}

        {dimensions.length === 0 && availableDims.length > 0 && (
          <p className="text-xs text-text-muted">Tap a button to add a dimension.</p>
        )}

        {dimensions.map((dim) => (
          <div key={dim.type} className="flex items-center gap-2">
            <span className="w-20 text-sm text-text-secondary shrink-0">{DIM_LABELS[dim.type]}</span>
            <Input
              type="number"
              min="0"
              step="any"
              value={dim.value}
              onChange={(e) => updateDimension(dim.type, "value", e.target.value)}
              placeholder="—"
              className="h-11 flex-1"
            />
            <Select value={dim.unit} onValueChange={(v) => updateDimension(dim.type, "unit", v)}>
              <SelectTrigger className="h-11 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ft">ft</SelectItem>
                <SelectItem value="in">in</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeDimension(dim.type)}
              className="h-11 w-11 shrink-0 text-text-muted hover:text-status-red"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {dimensions.length > 0 && (
          <p className="text-xs text-text-muted">Length is used for BOM piece conversion (e.g., 8 ft angle = 1 piece)</p>
        )}
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
