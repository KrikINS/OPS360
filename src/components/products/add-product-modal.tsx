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

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          base_price: parseFloat(formData.base_price),
          mrp: parseFloat(formData.mrp),
          dealer_price: parseFloat(formData.dealer_price || "0"),
          min_sell_price: parseFloat(formData.min_sell_price || "0"),
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
              <Label htmlFor="base_price">Unit Rate (Excl. Tax) *</Label>
              <Input 
                id="base_price" 
                type="number" 
                step="0.01" 
                required
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
              {formData.base_price && formData.gst_rate && (
                <p className="text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                  Calculated Price (Incl. Tax): <span className="font-bold text-[#001529]">₹{(parseFloat(formData.base_price) * (1 + parseFloat(formData.gst_rate) / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mrp">MRP (Incl. Tax) *</Label>
              <Input 
                id="mrp" 
                type="number" 
                step="0.01" 
                required
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="space-y-2">
              <Label htmlFor="dealer_price">Dealer Price</Label>
              <Input 
                id="dealer_price" 
                type="number" 
                step="0.01" 
                value={formData.dealer_price}
                onChange={(e) => {
                  const dp = parseFloat(e.target.value) || 0;
                  const mp = parseFloat(formData.margin_pct) || 0;
                  setFormData({ 
                    ...formData, 
                    dealer_price: e.target.value,
                    min_sell_price: (dp * (1 + mp / 100)).toFixed(2)
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin_pct">Margin %</Label>
              <Input 
                id="margin_pct" 
                type="number" 
                step="0.1" 
                value={formData.margin_pct}
                onChange={(e) => {
                  const mp = parseFloat(e.target.value) || 0;
                  const dp = parseFloat(formData.dealer_price) || 0;
                  setFormData({ 
                    ...formData, 
                    margin_pct: e.target.value,
                    min_sell_price: (dp * (1 + mp / 100)).toFixed(2)
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_sell_price">Min Sell Price</Label>
              <Input 
                id="min_sell_price" 
                type="number" 
                step="0.01" 
                value={formData.min_sell_price}
                onChange={(e) => setFormData({ ...formData, min_sell_price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gst_rate">GST Rate (%) *</Label>
              <Input 
                id="gst_rate" 
                type="number" 
                step="0.1" 
                required
                value={formData.gst_rate}
                onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
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
