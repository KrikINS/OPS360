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
import { generateProductCode, getNextSequence } from "@/lib/product-coding"
import { createClient } from "@/utils/supabase/client"

interface AddProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const CATEGORIES = [
  "Air Conditioner",
  "Microwave",
  "Refrigerator",
  "Washing Machine",
  "Television",
  "Kitchen Appliance"
]

const BRANDS = [
  "Ethan",
  "Samsung",
  "LG",
  "Whirlpool",
  "Sony",
  "Panasonic"
]

export function AddProductModal({ open, onOpenChange, onSuccess }: AddProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    model_name: "",
    brand: "",
    category: "",
    hsn_code: "",
    base_price: "",
    min_stock_level: "0",
    description: "",
  })
  const [generatedCode, setGeneratedCode] = useState("")

  const supabase = createClient()

  // Update EHA Code whenever category or brand changes
  useEffect(() => {
    async function updateCode() {
      if (formData.category && formData.brand) {
        const nextSeq = await getNextSequence(supabase, formData.category, formData.brand)
        // setSequence(nextSeq)
        setGeneratedCode(generateProductCode(formData.category, formData.brand, nextSeq))
      } else {
        setGeneratedCode("")
      }
    }
    updateCode()
  }, [formData.category, formData.brand, supabase])

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
      <DialogContent className="sm:max-w-[600px]">
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
                  {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
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
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
              <Label htmlFor="base_price">Base Price *</Label>
              <Input 
                id="base_price" 
                type="number" 
                step="0.01" 
                required
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
            </div>
          </div>

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
