'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollableTable } from '@/components/ui/scrollable-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, Package, ShoppingCart, CheckSquare, Square, Loader2, Settings2 } from 'lucide-react'
import { getLowStockItems, updateMinStockLevel, getAllProductsWithStockLevel } from '@/actions/inventory'
import { createPurchaseOrder } from '@/actions/procurement'
import { fmtINR } from '@/lib/utils'

type StockItem = {
  id: string; model_name: string; brand: string; product_code: string
  min_stock_level: number; base_price: number
  vendor_id: string | null; vendor_name: string | null
  available_units: number; total_available: number
}

type AllProduct = {
  id: string; model_name: string; brand: string; product_code: string
  min_stock_level: number; vendor_id: string | null; vendor_name: string | null
  available_units: number
}

export default function StockAlertsPage() {
  const [lowStockItems, setLowStockItems]   = useState<StockItem[]>([])
  const [allProducts, setAllProducts]        = useState<AllProduct[]>([])
  const [loading, setLoading]               = useState(true)
  const [activeTab, setActiveTab]           = useState<'alerts' | 'manage'>('alerts')
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [reorderQtys, setReorderQtys]       = useState<Record<string, number>>({})
  const [editingMin, setEditingMin]         = useState<Record<string, number>>({})
  const [savingMin, setSavingMin]           = useState<Record<string, boolean>>({})
  const [creatingPO, setCreatingPO]         = useState(false)
  const [toast, setToast]                   = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [sessionBranchId, setSessionBranchId] = useState<string>('')
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [assigningVendor, setAssigningVendor] = useState<Record<string, boolean>>({})

  useEffect(() => {
    import('next-auth/react').then(({ getSession }) => {
      getSession().then(session => {
        if (session?.user?.branchId) setSessionBranchId(session.user.branchId)
      })
    })
  }, [])

  useEffect(() => {
    import('@/actions/procurement').then(mod => {
      if (mod.getVendorsAction) {
        mod.getVendorsAction().then((result: any) => {
          if (result?.data) setVendors(result.data.map((v: any) => ({ id: v.id, name: v.name })))
        })
      }
    })
  }, [])

  const handleAssignVendor = async (productId: string, vendorId: string) => {
    setAssigningVendor(p => ({ ...p, [productId]: true }))
    try {
      const { assignVendorToProduct } = await import('@/actions/inventory')
      const result = await assignVendorToProduct({ productId, vendorId })
      if (result.success) {
        showToast('success', 'Vendor assigned')
        load()
      } else {
        showToast('error', result.error ?? 'Failed to assign vendor')
      }
    } catch {
      showToast('error', 'Failed to assign vendor')
    } finally {
      setAssigningVendor(p => ({ ...p, [productId]: false }))
    }
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [low, all] = await Promise.all([
      getLowStockItems({ branchId: null }),
      getAllProductsWithStockLevel({ branchId: null }),
    ])
    if (low.success)  setLowStockItems(low.items)
    if (all.success)  setAllProducts(all.items)
    // Auto-init reorder qtys = min_stock_level * 2, minimum 1
    if (low.success) {
      const qtys: Record<string, number> = {}
      low.items.forEach(i => { qtys[i.id] = Math.max(1, i.min_stock_level * 2 - i.available_units) })
      setReorderQtys(qtys)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === lowStockItems.length) setSelected(new Set())
    else setSelected(new Set(lowStockItems.map(i => i.id)))
  }

  const handleSaveMinLevel = async (productId: string, value: number) => {
    setSavingMin(p => ({ ...p, [productId]: true }))
    const result = await updateMinStockLevel({ productId, minStockLevel: value })
    setSavingMin(p => ({ ...p, [productId]: false }))
    if (result.success) { showToast('success', 'Min stock level updated'); load() }
    else showToast('error', result.error ?? 'Failed to update')
  }

  const handleCreatePOs = async () => {
    if (!sessionBranchId) { showToast('error', 'Branch not set — please refresh and try again'); return }
    const selectedItems = lowStockItems.filter(i => selected.has(i.id) && i.vendor_id)
    if (selectedItems.length === 0) { showToast('error', 'Select items with vendors assigned to create POs'); return }

    // Group by vendor
    const byVendor = selectedItems.reduce((acc, item) => {
      const vid = item.vendor_id!
      if (!acc[vid]) acc[vid] = []
      acc[vid].push(item)
      return acc
    }, {} as Record<string, StockItem[]>)

    setCreatingPO(true)
    let successCount = 0
    let errorCount = 0

    const today = new Date()
    const deliveryDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    for (const [vendorId, items] of Object.entries(byVendor)) {
      const result = await createPurchaseOrder({
        branchId: sessionBranchId,
        vendorId,
        expectedDeliveryDate: deliveryDate,
        items: items.map(i => ({
          productId:  i.id,
          orderedQty: reorderQtys[i.id] ?? 1,
          unitCost:   i.base_price,
        })),
      })
      if (result.success) successCount++
      else errorCount++
    }

    setCreatingPO(false)
    if (successCount > 0) {
      showToast('success', `${successCount} PO${successCount > 1 ? 's' : ''} created successfully`)
      setSelected(new Set())
      load()
    }
    if (errorCount > 0) showToast('error', `${errorCount} PO${errorCount > 1 ? 's' : ''} failed to create`)
  }

  const outOfStock    = lowStockItems.filter(i => i.available_units === 0)
  const criticalStock = lowStockItems.filter(i => i.available_units > 0)
  const noVendor      = lowStockItems.filter(i => !i.vendor_id)
  const selectedWithVendor = lowStockItems.filter(i => selected.has(i.id) && i.vendor_id)

  // Group selected by vendor for PO preview
  const vendorGroups = selectedWithVendor.reduce((acc, item) => {
    const key = item.vendor_name ?? 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, StockItem[]>)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 rounded-xl text-red-600 border border-red-100">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">Stock Alerts</h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">
              Low Stock Detection & Reorder Management
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'alerts' ? 'default' : 'outline'}
            className={activeTab === 'alerts' ? 'bg-[#001529]' : ''} onClick={() => setActiveTab('alerts')}>
            <AlertTriangle className="h-4 w-4 mr-2" /> Alerts
          </Button>
          <Button variant={activeTab === 'manage' ? 'default' : 'outline'}
            className={activeTab === 'manage' ? 'bg-[#001529]' : ''} onClick={() => setActiveTab('manage')}>
            <Settings2 className="h-4 w-4 mr-2" /> Manage Levels
          </Button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`px-4 py-3 rounded-lg text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {toast.message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><Package className="h-6 w-6 text-red-500" /></div>
            <div><p className="text-2xl font-black text-red-600">{outOfStock.length}</p><p className="text-xs font-bold uppercase text-slate-400">Out of Stock</p></div>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg"><AlertTriangle className="h-6 w-6 text-amber-500" /></div>
            <div><p className="text-2xl font-black text-amber-600">{criticalStock.length}</p><p className="text-xs font-bold uppercase text-slate-400">Critical Low</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg"><ShoppingCart className="h-6 w-6 text-slate-500" /></div>
            <div><p className="text-2xl font-black">{noVendor.length}</p><p className="text-xs font-bold uppercase text-slate-400">No Vendor Assigned</p></div>
          </CardContent>
        </Card>
      </div>

      {/* ── ALERTS TAB ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Reorder action bar */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between bg-[#001529] text-white rounded-xl px-5 py-3">
              <div className="text-sm font-semibold">
                {selected.size} item{selected.size > 1 ? 's' : ''} selected
                {selectedWithVendor.length < selected.size && (
                  <span className="text-amber-300 ml-2 text-xs">({selected.size - selectedWithVendor.length} without vendor — will be skipped)</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {Object.keys(vendorGroups).length > 0 && (
                  <div className="text-xs text-slate-300">
                    {Object.keys(vendorGroups).length} PO{Object.keys(vendorGroups).length > 1 ? 's' : ''} will be created:
                    {Object.keys(vendorGroups).map(v => ` ${v}`).join(',')}
                  </div>
                )}
                <Button size="sm" onClick={handleCreatePOs} disabled={creatingPO || selectedWithVendor.length === 0}
                  className="bg-white text-[#001529] hover:bg-slate-100 font-bold gap-2">
                  {creatingPO ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  Create PO{Object.keys(vendorGroups).length > 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="bg-muted/30 border-b py-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Low Stock Items ({lowStockItems.length})
                </div>
                {lowStockItems.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
                    {selected.size === lowStockItems.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
              ) : lowStockItems.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Package className="h-12 w-12 mx-auto text-emerald-300" />
                  <p className="font-semibold text-emerald-600">All stocked up!</p>
                  <p className="text-slate-400 text-sm">No products are below their minimum stock levels.</p>
                </div>
              ) : (
                <ScrollableTable minWidth="900px">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-center">In Stock</TableHead>
                        <TableHead className="text-center">Min Level</TableHead>
                        <TableHead className="text-center">Reorder Qty</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map(item => (
                        <TableRow key={item.id} className={selected.has(item.id) ? 'bg-blue-50/50' : ''}>
                          <TableCell>
                            <button onClick={() => toggleSelect(item.id)} className="text-slate-400 hover:text-blue-600">
                              {selected.has(item.id)
                                ? <CheckSquare className="h-4 w-4 text-blue-600" />
                                : <Square className="h-4 w-4" />}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{item.model_name}</div>
                            <div className="text-xs text-slate-400">{item.brand}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-400">{item.product_code}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-lg font-black ${item.available_units === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                              {item.available_units}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm text-slate-500">{item.min_stock_level}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number" min={1} className="h-8 w-20 text-center text-sm mx-auto"
                              value={reorderQtys[item.id] ?? 1}
                              onChange={e => setReorderQtys(p => ({ ...p, [item.id]: parseInt(e.target.value) || 1 }))}
                            />
                          </TableCell>
                          <TableCell>
                            {item.vendor_name ? (
                              <span className="text-sm">{item.vendor_name}</span>
                            ) : (
                              <select
                                className="text-xs border rounded px-2 py-1 bg-white text-slate-700 h-7"
                                disabled={assigningVendor[item.id]}
                                defaultValue=""
                                onChange={e => e.target.value && handleAssignVendor(item.id, e.target.value)}
                              >
                                <option value="" disabled>Assign vendor...</option>
                                {vendors.map(v => (
                                  <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                              </select>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] font-bold border ${item.available_units === 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {item.available_units === 0 ? '🔴 Out of Stock' : '🟡 Low Stock'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollableTable>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── MANAGE LEVELS TAB ── */}
      {activeTab === 'manage' && (
        <Card>
          <CardHeader className="bg-muted/30 border-b py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings2 className="h-4 w-4" /> Set Minimum Stock Levels — All Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
            ) : (
              <ScrollableTable minWidth="700px">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Product</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-center">In Stock</TableHead>
                      <TableHead className="text-center">Min Level</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProducts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm">{p.model_name}</TableCell>
                        <TableCell className="text-sm text-slate-400">{p.brand}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{p.product_code}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold text-sm ${p.available_units === 0 ? 'text-red-600' : p.available_units <= (editingMin[p.id] ?? p.min_stock_level) ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {p.available_units}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number" min={0} className="h-8 w-20 text-center text-sm mx-auto"
                            value={editingMin[p.id] ?? p.min_stock_level}
                            onChange={e => setEditingMin(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            disabled={savingMin[p.id] || (editingMin[p.id] === undefined || editingMin[p.id] === p.min_stock_level)}
                            onClick={() => handleSaveMinLevel(p.id, editingMin[p.id] ?? p.min_stock_level)}>
                            {savingMin[p.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollableTable>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
