"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"


interface Product {
  id: string
  model_name: string
  base_price: number
  hsn_code: string
  min_stock_level: number
  tracking_type: string
  description: string
  tax_rate?: number
  warranty_months?: number
  is_archived?: boolean
}

interface EditProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  product: Product | null
}

const TRACKING_TYPES = [
  { value: "Stocked", label: "Stocked" },
  { value: "On-Demand", label: "On-Demand" },
  { value: "Legacy", label: "Legacy" }
]

interface FormState {
  model_name: string
  base_price: string
  hsn_code: string
  min_stock_level: string
  tracking_type: string
  description: string
  tax_rate: string
  warranty_months: string
}

export function EditProductModal({ open, onOpenChange, onSuccess, product }: EditProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormState>({
    model_name: product?.model_name || "",
    base_price: product?.base_price?.toString() || "0",
    hsn_code: product?.hsn_code || "",
    min_stock_level: product?.min_stock_level?.toString() || "0",
    tracking_type: product?.tracking_type || "Stocked",
    description: product?.description || "",
    tax_rate: product?.tax_rate?.toString() || "18",
    warranty_months: product?.warranty_months?.toString() || "12"
  })

  useEffect(() => {
    if (product) {
      setFormData({
        model_name: product.model_name || "",
        base_price: product.base_price?.toString() || "0",
        hsn_code: product.hsn_code || "",
        min_stock_level: product.min_stock_level?.toString() || "0",
        tracking_type: product.tracking_type || "Stocked",
        description: product.description || "",
        tax_rate: product.tax_rate?.toString() || "18",
        warranty_months: product.warranty_months?.toString() || "12"
      })
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!product) throw new Error("No product context provided")
      
      const { error } = await import("@/app/actions/generics").then(m => m.updateData("products", {
          id: product.id,
          model_name: formData.model_name,
          base_price: parseFloat(formData.base_price),
          hsn_code: formData.hsn_code,
          min_stock_level: parseInt(formData.min_stock_level),
          tracking_type: formData.tracking_type,
          description: formData.description,
          tax_rate: parseFloat(formData.tax_rate),
          warranty_months: parseInt(formData.warranty_months)
        }))

      if (error) throw error

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      alert("Error: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Product: {product?.model_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Product Name *</Label>
            <Input 
              id="edit-name" 
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Unit Rate (Excl. Tax) *</Label>
              <Input 
                id="edit-price" 
                type="number" 
                step="0.01" 
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                required
              />
              {formData.base_price && formData.tax_rate && (
                <p className="text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                  Estimated MRP (Incl. Tax): <span className="font-bold text-[#001529]">₹{(parseFloat(formData.base_price) * (1 + parseFloat(formData.tax_rate) / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hsn">HSN Code</Label>
              <Input 
                id="edit-hsn" 
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tax">Tax Rate (%) *</Label>
              <Input 
                id="edit-tax" 
                type="number" 
                step="0.1" 
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-warranty">Warranty (Months)</Label>
              <Input 
                id="edit-warranty" 
                type="number" 
                value={formData.warranty_months}
                onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tracking">Tracking Type</Label>
              <Select 
                onValueChange={(v) => setFormData({ ...formData, tracking_type: v || "Stocked" })}
                value={formData.tracking_type}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRACKING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-min-stock">Min Stock</Label>
              <Input 
                id="edit-min-stock" 
                type="number" 
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea 
              id="edit-desc" 
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#001529]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
