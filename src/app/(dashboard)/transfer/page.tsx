"use client"

import { useState, Suspense } from "react"
import { Card } from "@/components/ui/card"
import { 
  ArrowRightLeft, 
  ChevronRight, ClipboardList, 
  ArrowUpRight, Truck
} from "lucide-react"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog"
import { StockRequestsView, type StockRequest } from "./components/StockRequestsView"
import { StockTransfersView } from "./components/StockTransfersView"
import { cn } from "@/lib/utils"

export default function TransferControlCenter() {
  const [activeModal, setActiveModal] = useState<'requests' | 'transfers' | null>(null)
  const [prefillRequest, setPrefillRequest] = useState<StockRequest | null>(null)

  const handleFulfillTrigger = (req: StockRequest) => {
    setPrefillRequest(req)
    setActiveModal('transfers')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-2xl shadow-2xl">
            <ArrowRightLeft className="h-8 w-8 text-[#7FD1E3]" />
          </div>
          Transfer Control Center
        </h1>
        <p className="text-slate-500 font-medium text-lg ml-1">Unified logistics hub for internal demand and inter-branch stock movement.</p>
      </div>

      {/* ── Hero Buttons ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Stock Requests Hero */}
        <button 
          onClick={() => setActiveModal('requests')}
          className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-1 text-left transition-all hover:border-[#7FD1E3] hover:shadow-2xl hover:shadow-blue-500/10 active:scale-[0.98]"
        >
          <div className="flex flex-col gap-6 p-10">
            <div className="flex items-start justify-between">
              <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                <ClipboardList className="h-10 w-10 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <ArrowUpRight className="h-6 w-6 text-slate-200 group-hover:text-blue-400 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">STOCK REQUESTS</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                Don't know who has stock? Broadcast a request — any branch with availability can step in and fulfill it.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 text-[10px] font-black uppercase tracking-widest text-[#7FD1E3] bg-slate-900 w-fit px-4 py-2 rounded-full shadow-lg">
              Manage Demands
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>
          {/* Subtle Background Pattern */}
          <div className="absolute -right-8 -bottom-8 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110">
            <ClipboardList size={240} />
          </div>
        </button>

        {/* Inter-Branch Transfers Hero */}
        <button 
          onClick={() => setActiveModal('transfers')}
          className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-1 text-left transition-all hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-600/10 active:scale-[0.98]"
        >
          <div className="flex flex-col gap-6 p-10">
            <div className="flex items-start justify-between">
              <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
                <Truck className="h-10 w-10 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <ArrowUpRight className="h-6 w-6 text-slate-200 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">STOCK TRANSFERS</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                Already know the source and destination? Send stock directly — no request needed.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 w-fit px-4 py-2 rounded-full shadow-lg shadow-blue-500/20">
              Manage Logistics
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>
          {/* Subtle Background Pattern */}
          <div className="absolute -right-8 -bottom-8 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110">
            <Truck size={240} />
          </div>
        </button>
      </div>

      {/* ── Visual Context Cards (Optional but adds premium feel) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-8 border-t border-slate-100">
        <Card className="bg-slate-50/50 border-none p-6 space-y-3">
          <Badge className="bg-slate-900 text-white text-[9px] font-black px-3">GUIDELINE</Badge>
          <h4 className="font-black text-sm text-slate-800">Atomic Inventory Sync</h4>
          <p className="text-xs text-slate-500 font-medium leading-normal">
            Product serials are automatically updated across branch ledgers only upon physical verification at the destination.
          </p>
        </Card>
        <Card className="bg-slate-50/50 border-none p-6 space-y-3">
          <Badge className="bg-blue-600 text-white text-[9px] font-black px-3">ITM PROTOCOL</Badge>
          <h4 className="font-black text-sm text-slate-800">Waybill Generation</h4>
          <p className="text-xs text-slate-500 font-medium leading-normal">
            Every transfer generates a unique waybill (TX-ID) used for tracking through the &apos;Pending Shipments&apos; module.
          </p>
        </Card>
        <Card className="bg-slate-50/50 border-none p-6 space-y-3">
          <Badge className="bg-emerald-600 text-white text-[9px] font-black px-3">STATUS</Badge>
          <h4 className="font-black text-sm text-slate-800">Verified Arrival</h4>
          <p className="text-xs text-slate-500 font-medium leading-normal">
            Branch Managers must manually report discrepancies if the physical manifest doesn&apos;t match the digital record.
          </p>
        </Card>
        <Card className="bg-slate-50/50 border-none p-6 space-y-3">
          <Badge className="bg-purple-600 text-white text-[9px] font-black px-3">HOW THEY CONNECT</Badge>
          <h4 className="font-black text-sm text-slate-800">Requests Become Transfers</h4>
          <p className="text-xs text-slate-500 font-medium leading-normal">
            Fulfilling a request automatically creates a tracked transfer between the two branches — nothing is duplicated.
          </p>
        </Card>
      </div>

      {/* ── Modals ── */}
      
      {/* Stock Requests Modal */}
      <Dialog open={activeModal === 'requests'} onOpenChange={(open) => !open && setActiveModal(null)}>
      <DialogContent className="md:max-w-5xl md:max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-slate-50 md:rounded-3xl shadow-2xl">
          <div className="bg-white p-8 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl">
                  <ClipboardList className="h-6 w-6 text-[#7FD1E3]" />
                </div>
                Stock Request Control
              </DialogTitle>
              <DialogDescription className="text-base font-medium text-slate-500">
                Manage internal supply chain demands and branch-to-branch requests.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-8 pt-6">
            <Suspense fallback={<div className="flex justify-center p-8"><span className="text-slate-400 font-medium">Loading requests...</span></div>}>
              <StockRequestsView onFulfill={handleFulfillTrigger} />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Transfers Modal */}
      <Dialog open={activeModal === 'transfers'} onOpenChange={(open) => !open && setActiveModal(null)}>
      <DialogContent className="md:max-w-6xl md:max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-slate-50 md:rounded-3xl shadow-2xl">
          <div className="bg-white p-8 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                Inter-Branch Logistics
              </DialogTitle>
              <DialogDescription className="text-base font-medium text-slate-500">
                Oversee physical stock movement and waybill tracking.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-8 pt-6">
            <Suspense fallback={<div className="flex justify-center p-8"><span className="text-slate-400 font-medium">Loading transfers...</span></div>}>
              <StockTransfersView 
                prefillRequest={prefillRequest} 
                onClearPrefill={() => setPrefillRequest(null)} 
              />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset", className)}>
      {children}
    </span>
  )
}
