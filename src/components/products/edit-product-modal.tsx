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
import { round2 } from "@/lib/utils"
import { TRACKING_TYPES } from "@/lib/tracking-types"

interface Product {
  id: string
  model_name: string
  base_price: number
  hsn_code: string
  min_stock_level: number
  tracking_type: string
  description: string
  mrp?: number
  dealer_price?: number
  min_sell_price?: number
  margin_pct?: number
  max_discount_pct?: number
  gst_rate?: number
  warranty_months?: number
  is_archived?: boolean
}

interface EditProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  product: Product | null
}

interface FormState {
  model_name: string
  hsn_code: string
  base_price: string
  mrp: string
  min_stock_level: string
  tracking_type: string
  description: string
  dealer_price: string
  min_sell_price: string
  margin_pct: string
  max_discount_pct: string
  gst_rate: string
  warranty_months: string
}

export function EditProductModal({ open, onOpenChange, onSuccess, product }: EditProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormState>({
    model_name: product?.model_name || "",
    base_price: product?.base_price?.toString() || "0",
    mrp: product?.mrp?.toString() || "",
    hsn_code: product?.hsn_code || "",
    dealer_price: product?.dealer_price?.toString() || "",
    min_sell_price: product?.min_sell_price?.toString() || "",
    margin_pct: product?.margin_pct?.toString() || "5",
    max_discount_pct: product?.max_discount_pct?.toString() || "10",
    min_stock_level: product?.min_stock_level?.toString() || "0",
    tracking_type: product?.tracking_type || "Stocked",
    description: product?.description || "",
    gst_rate: product?.gst_rate?.toString() || "18",
    warranty_months: product?.warranty_months?.toString() || "12"
  })

  useEffect(() => {
    if (product) {
      setFormData({
        model_name: product.model_name || "",
        base_price: product.base_price?.toString() || "0",
        mrp: product.mrp?.toString() || "",
        hsn_code: product.hsn_code || "",
        dealer_price: product.dealer_price?.toString() || "",
        min_sell_price: product.min_sell_price?.toString() || "",
        margin_pct: product.margin_pct?.toString() || "5",
        max_discount_pct: product.max_discount_pct?.toString() || "10",
        min_stock_level: product.min_stock_level?.toString() || "0",
        tracking_type: product.tracking_type || "Stocked",
        description: product.description || "",
        gst_rate: product.gst_rate?.toString() || "18",
        warranty_months: product.warranty_months?.toString() || "12"
      })
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let finalMinSell = parseFloat(formData.min_sell_price || "0")
    if (finalMinSell > parseFloat(formData.base_price)) {
      finalMinSell = parseFloat(formData.base_price)
    }

    if (parseFloat(formData.dealer_price || "0") > parseFloat(formData.base_price)) {
      alert("Dealer Price cannot exceed Unit Rate (Ex-GST)")
      setLoading(false)
      return
    }

    if (finalMinSell < parseFloat(formData.dealer_price || "0")) {
      alert("Min Sell Price cannot be below Dealer Price (would result in a loss)")
      setLoading(false)
      return
    }

    try {
      if (!product) throw new Error("No product context provided")
      
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_name: formData.model_name,
          base_price: parseFloat(formData.base_price),
          mrp: formData.mrp ? parseFloat(formData.mrp) : null,
          dealer_price: parseFloat(formData.dealer_price || "0"),
          min_sell_price: finalMinSell,
          margin_pct: parseFloat(formData.margin_pct || "5"),
          max_discount_pct: parseFloat(formData.max_discount_pct || "10"),
          hsn_code: formData.hsn_code,
          min_stock_level: parseInt(formData.min_stock_level),
          tracking_type: formData.tracking_type,
          description: formData.description,
          gst_rate: parseFloat(formData.gst_rate),
          warranty_months: parseInt(formData.warranty_months)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update product");
      }

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
              <Label htmlFor="edit-hsn">HSN Code</Label>
              <Input 
                id="edit-hsn" 
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mrp">MRP / Retail Price (₹) *</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Maximum Retail Price incl. GST</p>
              <Input 
                id="edit-mrp" 
                type="number" 
                step="0.01" 
                value={formData.mrp}
                onChange={(e) => {
                  const mrp = parseFloat(e.target.value) || 0;
                  const gst = parseFloat(formData.gst_rate) || 0;
                  const base_price = mrp > 0 ? round2(mrp / (1 + gst / 100)).toFixed(2) : formData.base_price;
                  
                  setFormData({ 
                    ...formData, 
                    mrp: e.target.value,
                    base_price
                  });
                }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Unit Rate (Ex-GST) *</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Auto-calculated from MRP</p>
              <Input 
                id="edit-price" 
                type="number" 
                step="0.01" 
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                required
                readOnly
                className="bg-slate-50 text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="space-y-2">
              <Label htmlFor="edit-dealer">Dealer Cost (₹)</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Price paid to distributor, excl. GST</p>
              <Input 
                id="edit-dealer" 
                type="number" 
                step="0.01" 
                value={formData.dealer_price}
                onChange={(e) => {
                  const dp = e.target.value;
                  const dpVal = parseFloat(dp) || 0;
                  const marginPct = parseFloat(formData.margin_pct || "0");
                  const nextMinSell = dpVal > 0 && marginPct > 0 && marginPct < 100
                    ? (dpVal / (1 - marginPct / 100)).toFixed(2)
                    : dpVal > 0 ? dpVal.toFixed(2) : "";
                  setFormData({ ...formData, dealer_price: dp, min_sell_price: nextMinSell });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-margin">Min Margin %</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Required gross margin — drives Min Sell Price</p>
              <Input
                id="edit-margin"
                type="number"
                step="0.01"
                className="border-slate-200"
                value={formData.margin_pct}
                onChange={(e) => {
                  const m = e.target.value;
                  const mVal = parseFloat(m) || 0;
                  const dpVal = parseFloat(formData.dealer_price || "0");
                  const nextMinSell = dpVal > 0 && mVal > 0 && mVal < 100
                    ? (dpVal / (1 - mVal / 100)).toFixed(2)
                    : formData.min_sell_price;
                  setFormData({ ...formData, margin_pct: m, min_sell_price: nextMinSell });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-min-sell">Min Sell Price (₹)</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Auto-derived from dealer cost ÷ (1 − margin). Override allowed.</p>
              <Input
                id="edit-min-sell"
                type="number"
                step="0.01"
                value={formData.min_sell_price}
                onChange={(e) => setFormData({ ...formData, min_sell_price: e.target.value })}
              />
            </div>
          </div>
          
          {parseFloat(formData.dealer_price || "0") > parseFloat(formData.base_price || "0") && parseFloat(formData.base_price || "0") > 0 && (
            <div className="text-red-600 text-sm font-semibold p-2 bg-red-50 border border-red-200 rounded">
              Warning: Dealer Cost cannot exceed Unit Rate (Ex-GST).
            </div>
          )}
          {parseFloat(formData.min_sell_price || "0") > 0 && parseFloat(formData.base_price || "0") > 0 && 
           parseFloat(formData.min_sell_price || "0") <= parseFloat(formData.base_price || "0") && 
           (parseFloat(formData.base_price || "0") - parseFloat(formData.min_sell_price || "0")) / parseFloat(formData.base_price || "0") < 0.05 && (
            <div className="text-yellow-600 text-sm font-semibold p-2 bg-yellow-50 border border-yellow-200 rounded">
              Warning: Min Sell Price is very close to Unit Rate (&lt; 5% headroom).
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tax">GST Rate (%) *</Label>
              <Input 
                id="edit-tax" 
                type="number" 
                step="0.1" 
                value={formData.gst_rate}
                onChange={(e) => {
                  const gst = parseFloat(e.target.value) || 0;
                  const mrp = parseFloat(formData.mrp) || 0;
                  const base_price = mrp > 0 ? round2(mrp / (1 + gst / 100)).toFixed(2) : formData.base_price;
                  
                  setFormData({ 
                    ...formData, 
                    gst_rate: e.target.value,
                    base_price
                  });
                }}
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
                onValueChange={(v) => setFormData({ ...formData, tracking_type: (v as string) || "Stocked" })}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-max-discount">Max Discount %</Label>
              <Input 
                id="edit-max-discount" 
                type="number" 
                step="0.1" 
                value={formData.max_discount_pct}
                onChange={(e) => setFormData({ ...formData, max_discount_pct: e.target.value })}
              />
            </div>
            <div className="space-y-2">
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
