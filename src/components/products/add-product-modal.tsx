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
import { generateProductCode } from "@/lib/product-coding"
import { getNextSequenceAction } from "@/app/actions/products"
import { getGlobalMastersAction } from "@/app/actions/masters"
import { round2 } from "@/lib/utils"

interface AddProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddProductModal({ open, onOpenChange, onSuccess }: AddProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [brands, setBrands] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loadingMasters, setLoadingMasters] = useState(false)
  const [formData, setFormData] = useState({
    model_name: "",
    brand: "",
    category: "",
    hsn_code: "",
    base_price: "",
    mrp: "",
    dealer_price: "",
    min_sell_price: "",
    margin_pct: "5",
    max_discount_pct: "10",
    gst_rate: "18",
    warranty_months: "12",
    min_stock_level: "0",
    description: "",
  })
  const [generatedCode, setGeneratedCode] = useState("")



  useEffect(() => {
    async function fetchMasters() {
      if (!open) return
      setLoadingMasters(true)
      
      const { data } = await getGlobalMastersAction()
      if (data) {
        setBrands((data as { b?: { name: string }[] }).b?.map((b: { name: string }) => b.name) || [])
        setCategories((data as { c?: { name: string }[] }).c?.map((c: { name: string }) => c.name) || [])
      }
      
      setLoadingMasters(false)
    }
    fetchMasters()
  }, [open])

  // Update EHA Code whenever category or brand changes
  useEffect(() => {
    async function updateCode() {
      if (formData.category && formData.brand) {
        const nextSeq = await getNextSequenceAction(formData.category, formData.brand)
        // setSequence(nextSeq)
        setGeneratedCode(generateProductCode(formData.category, formData.brand, nextSeq))
      } else {
        setGeneratedCode("")
      }
    }
    updateCode()
  }, [formData.category, formData.brand])

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
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          base_price: parseFloat(formData.base_price),
          mrp: parseFloat(formData.mrp),
          dealer_price: parseFloat(formData.dealer_price || "0"),
          min_sell_price: finalMinSell,
          margin_pct: parseFloat(formData.margin_pct || "5"),
          max_discount_pct: parseFloat(formData.max_discount_pct || "10"),
          gst_rate: parseFloat(formData.gst_rate),
          warranty_months: parseInt(formData.warranty_months),
          min_stock_level: parseInt(formData.min_stock_level),
          product_code: generatedCode
        }),
      })

      if (!res.ok) throw new Error("Failed to create product")

      onSuccess()
      onOpenChange(false)
      setFormData({
        model_name: "",
        brand: "",
        category: "",
        hsn_code: "",
        base_price: "",
        mrp: "",
        dealer_price: "",
        min_sell_price: "",
        margin_pct: "5",
        max_discount_pct: "10",
        gst_rate: "18",
        warranty_months: "12",
        min_stock_level: "0",
        description: "",
      })
    } catch (error) {
      console.error(error)
      alert("Error creating product")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Select 
                onValueChange={(v) => setFormData({ ...formData, brand: v || "" })}
                value={formData.brand}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Brand" />
                </SelectTrigger>
                <SelectContent>
                  {loadingMasters ? (
                    <div className="p-2 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-300" /></div>
                  ) : (
                    brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                onValueChange={(v) => setFormData({ ...formData, category: v || "" })}
                value={formData.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {loadingMasters ? (
                    <div className="p-2 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-300" /></div>
                  ) : (
                    categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <Label className="text-blue-700 font-semibold">Generated EHA Code</Label>
            <div className="text-xl font-mono font-bold text-blue-900 uppercase">
              {generatedCode || "EHA-[CAT]-[BRN]-[SEQ]"}
            </div>
            <p className="text-[10px] text-blue-600">This code is auto-generated based on Category and Brand.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_name">Item Name *</Label>
            <Input 
              id="model_name" 
              placeholder="e.g. Ethan Arctic 2T" 
              required
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hsn_code">HSN Code</Label>
              <Input 
                id="hsn_code" 
                placeholder="8-digit HSN" 
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mrp">MRP / Retail Price (₹) *</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Maximum Retail Price incl. GST</p>
              <Input 
                id="mrp" 
                type="number" 
                step="0.01" 
                required
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
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_price">Unit Rate (Ex-GST) *</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Auto-calculated from MRP</p>
              <Input 
                id="base_price" 
                type="number" 
                step="0.01" 
                required
                readOnly
                className="bg-slate-50 text-slate-500"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="space-y-2">
              <Label htmlFor="dealer_price">Dealer Cost (₹)</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Price paid to distributor, excl. GST</p>
              <Input 
                id="dealer_price" 
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
              <Label htmlFor="margin_pct">Min Margin %</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Required gross margin — drives Min Sell Price</p>
              <Input
                id="margin_pct"
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
              <Label htmlFor="min_sell_price">Min Sell Price (₹)</Label>
              <p className="text-[10px] text-slate-500 -mt-1 mb-1">Auto-derived from dealer cost ÷ (1 − margin). Override allowed.</p>
              <Input
                id="min_sell_price"
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
              <Label htmlFor="gst_rate">GST Rate (%) *</Label>
              <Input 
                id="gst_rate" 
                type="number" 
                step="0.1" 
                required
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty_months">Warranty (Months)</Label>
              <Input 
                id="warranty_months" 
                type="number" 
                value={formData.warranty_months}
                onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_stock">Min Stock Level</Label>
              <Input 
                id="min_stock" 
                type="number" 
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_discount_pct">Max Discount %</Label>
              <Input 
                id="max_discount_pct" 
                type="number" 
                step="0.1" 
                value={formData.max_discount_pct}
                onChange={(e) => setFormData({ ...formData, max_discount_pct: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Product technical specifications..."
              className="resize-none"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#001529]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
