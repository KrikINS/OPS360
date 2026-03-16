import React from 'react';
import { numberToWords } from '@/lib/number-to-words';
import { 
  Building2, 
  Truck, 
  ShieldAlert, 
  LayoutGrid,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { Label } from "@/components/ui/label";

interface Branch {
  id: string;
  name: string;
  full_address?: string; // Corrected column name
  gstin?: string;
}

interface POPrintTemplateProps {
  po: {
    id: string;
    po_number: string;
    status: string;
    created_at: string;
    total_amount: number;
    requester_name?: string;
    approver_name?: string;
    terms_content?: string;
    items: {
      product?: {
        model_name: string;
        product_code: string;
        hsn_code: string;
      };
      quantity: number;
      unit_price: number;
      total_item_cost: number;
    }[];
  };
  vendor: {
    name: string;
    state?: string;
    gstin?: string;
  };
  branch: Branch;
  corporateHQ: Branch;
}

export const POPrintTemplate = React.forwardRef<HTMLDivElement, POPrintTemplateProps>(
  ({ po, vendor, branch, corporateHQ }, ref) => {
    const systemTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Lead Architect: Net Taxable Value is the base sum
    const netTaxableValue = po.items.reduce((acc, item) => acc + item.total_item_cost, 0);
    const cgst = netTaxableValue * 0.09;
    const sgst = netTaxableValue * 0.09;
    const grandTotal = netTaxableValue + cgst + sgst;

    return (
      <div 
        ref={ref}
        id="po-print-template" 
        className="bg-white text-[#1e293b] flex flex-col overflow-hidden"
        style={{ 
          width: '210mm', 
          minHeight: '297mm', 
          padding: '0', 
          margin: '0 auto', 
          fontFamily: "'Inter', system-ui, sans-serif",
          boxSizing: 'border-box',
          position: 'relative',
          colorScheme: 'light',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        } as React.CSSProperties}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #po-print-template {
              width: 210mm !important;
              height: 297mm !important;
              overflow: hidden !important;
            }
          }
        `}} />

        {/* Lead Architect: Header Re-Alignment */}
        <div 
          style={{ backgroundColor: '#111827' }} 
          className="p-10 text-white flex justify-between items-start w-full shrink-0"
        >
          {/* Left Side: PO Reference and Date */}
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tighter text-white m-0 leading-none">
              Purchase Order
            </h1>
            <div className="space-y-1">
              <p className="text-xl font-bold m-0 flex items-center gap-2">
                <span className="opacity-60 text-sm uppercase tracking-widest font-black">Ref:</span>
                {po.po_number}
              </p>
              <p className="text-slate-400 font-medium text-sm m-0">
                <span className="opacity-60 text-[10px] uppercase tracking-widest font-black mr-2">Date:</span>
                {new Date(po.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Right Side: Logo and Company Info */}
          <div className="text-right flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-black text-white m-0 uppercase tracking-tighter">Ethan Home Appliances</p>
                <p style={{ color: '#7FD1E3' }} className="text-[10px] uppercase tracking-[0.3em] font-black m-0">Ops360 Enterprise ERP</p>
              </div>
              <div className="bg-white p-2 rounded-lg">
                 <img src="/ethan-logo.png" alt="Ethan Logo" className="h-12 w-auto object-contain" />
              </div>
            </div>
            
            {/* Header Address Mapping: Corporate HQ */}
            <div className="text-[10px] text-slate-400 font-bold max-w-[280px] leading-tight mt-2 italic">
               <p className="m-0 uppercase tracking-widest text-[#7FD1E3] mb-1">Corporate Headquarters</p>
               <p className="m-0 mb-1">{corporateHQ?.full_address || 'Building 42, Innovation Hub, Kochi, Kerala'}</p>
               <p className="m-0 uppercase tracking-widest font-black">GSTIN: {corporateHQ?.gstin || '32AAAAA0000A1Z5'}</p>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-10 flex-1">
          {/* Metadata Grid (Ship-To and Vendor) */}
          <div className="grid grid-cols-2 gap-8 p-8 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="space-y-3">
              <div style={{ color: '#001529' }} className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Ship-To Destination</Label>
              </div>
              <div className="pl-6 border-l-2 border-slate-200">
                <p className="font-bold text-lg text-slate-900 m-0">{branch?.name || 'Central Hub'}</p>
                <p className="text-xs text-slate-500 font-medium m-0">Branch Delivery Registry</p>
                <p className="text-[10px] text-slate-400 mt-1 italic m-0">{branch?.full_address || 'Site delivery as per instructions'}</p>
                <p className="text-[9px] font-black text-slate-500 mt-1 m-0 uppercase flex items-center gap-2">
                   <span className="opacity-50 tracking-tighter">GSTIN:</span> 
                   {branch?.gstin || '32BBBBB0000B1Z5'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div style={{ color: '#001529' }} className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vendor Partner</Label>
              </div>
              <div className="pl-6 border-l-2 border-slate-200">
                <p className="font-bold text-lg text-slate-900 m-0">{vendor.name}</p>
                <p className="text-xs text-slate-500 font-medium m-0">{vendor.state || 'Registered Vendor'}</p>
                <p className="text-[10px] font-mono mt-1 text-slate-400 font-bold uppercase m-0 flex items-center gap-2">
                   <span className="opacity-50 tracking-tighter tracking-widest font-sans">GSTIN:</span> 
                   {vendor.gstin || 'Awaiting Verification'}
                </p>
              </div>
            </div>
          </div>

          {/* Line Item Breakdown */}
          <div className="space-y-4">
            <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest flex items-center gap-2 m-0">
              <LayoutGrid className="h-4 w-4" />
              Line Item Breakdown
            </h4>
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse">
                <thead className="bg-[#001529]/5">
                  <tr className="border-b border-slate-100">
                    <th className="p-4 text-center w-[60px] font-black uppercase text-[9px] tracking-widest text-slate-500">#</th>
                    <th className="p-4 text-left font-black uppercase text-[9px] tracking-widest text-slate-500">Model Specification</th>
                    <th className="p-4 text-left font-black uppercase text-[9px] tracking-widest text-slate-500">HSN/SAC</th>
                    <th className="p-4 text-center w-20 font-black uppercase text-[9px] tracking-widest text-slate-500">Qty</th>
                    <th className="p-4 text-right w-32 font-black uppercase text-[9px] tracking-widest text-slate-500">Net Rate</th>
                    <th className="p-4 text-right w-32 font-black uppercase text-[9px] tracking-widest text-slate-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {po.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 odd:bg-slate-50/20">
                      <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{item.product?.model_name || 'Item'}</div>
                        <div className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">SKU: {item.product?.product_code}</div>
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-[10px] font-bold tracking-tighter">
                        {item.product?.hsn_code || '---'}
                      </td>
                      <td className="p-4 text-center font-black text-slate-100 font-mono" style={{ backgroundColor: '#001529', color: 'white', borderRadius: '4px' }}>
                        {item.quantity}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-600">₹{item.unit_price.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#001529' }} className="p-4 text-right font-black">₹{item.total_item_cost.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Financial Summary Block - Lead Architect: Repositioned after table */}
            <div className="flex justify-end pt-4">
              <div className="w-[320px] space-y-2 p-6 rounded-2xl bg-[#001529]/5 border border-[#001529]/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-tight">Net Taxable Value</span>
                  <span className="font-black text-slate-900">₹{netTaxableValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-tight">CGST (9%)</span>
                  <span className="font-black text-slate-900">₹{cgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-500 uppercase tracking-tight">SGST (9%)</span>
                  <span className="font-black text-slate-900">₹{sgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-[#001529] uppercase tracking-tighter">Grand Total</span>
                  <span className="text-xl font-black text-[#001529]">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount in Words & Terms */}
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 m-0">
                <ShieldAlert className="h-4 w-4" />
                Contractual Terms & Conditions
              </h4>
              <div className="text-[10px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap p-5 rounded-xl border border-slate-100 bg-slate-50/50 italic">
                {po.terms_content || "1. Supply as per agreed specifications and delivery schedule.\n2. Invoices must mention the PO Number and GSTIN of both parties.\n3. Subject to Ernakulam/Kochi Jurisdiction."}
              </div>
              <div className="space-y-1">
                 <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Total Value in Words</Label>
                 <p style={{ color: '#001529' }} className="text-[10px] font-black italic m-0 underline decoration-slate-300 underline-offset-4">{numberToWords(Math.round(grandTotal))} Only.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div style={{ backgroundColor: '#0f172a' }} className="rounded-2xl p-6 text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5">
                   <ShieldCheck className="h-16 w-16" />
                 </div>
                 <h4 style={{ color: '#7FD1E3' }} className="text-[9px] font-black uppercase tracking-[0.2em] mb-4 m-0">Security Compliance Audit</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-0.5">
                     <p className="text-[8px] text-slate-400 font-bold uppercase m-0">Originator</p>
                     <p className="text-xs font-bold m-0">{po.requester_name || 'System Auto-Gen'}</p>
                   </div>
                   <div className="space-y-0.5">
                     <p className="text-[8px] text-slate-400 font-bold uppercase m-0">Certification</p>
                     <p className="text-xs font-bold text-green-400 m-0">
                       {po.approver_name ? 'Certified Approved' : 'Awaiting Review'}
                     </p>
                   </div>
                 </div>
              </div>

              <div className="flex justify-end pt-4">
                <div style={{ borderColor: '#001529' }} className="text-center w-full max-w-[200px] border-t-2 pt-4">
                  <p style={{ color: '#001529' }} className="text-[10px] font-black uppercase tracking-[0.2em] m-0">Authorized Signatory</p>
                  <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase m-0 tracking-widest">Validated Digital Document</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Architect: PDF Specs (A4) Footer */}
        <div 
          className="w-full px-10 py-6 border-t border-slate-100 flex justify-between items-end text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0 bg-white"
          style={{ position: 'absolute', bottom: '0', left: '0', width: '210mm' }}
        >
          <div className="flex flex-col gap-1">
            <p className="m-0 text-[#001529]/80 font-black">CLASSIFICATION: CONFIDENTIAL – AUTHORIZED VENDOR USE ONLY</p>
            <p className="text-[7px] opacity-60 m-0 leading-tight">Subject to Ernakulam/Kochi Jurisdiction. System-generated PO ID: {po.id}</p>
          </div>
          <div className="text-center">
            <p className="m-0">Page 1 of 1</p>
          </div>
          <div className="text-right flex flex-col gap-1">
            <p className="m-0 uppercase tracking-tighter">Timestamp: {systemTimestamp}</p>
            <p style={{ color: '#3b82f6' }} className="text-[7px] opacity-70 m-0 uppercase flex items-center gap-1 justify-end font-black underline underline-offset-2">
               <CheckCircle2 className="h-2 w-2" /> Verified Digital Asset
            </p>
          </div>
        </div>
      </div>
    );
  }
);

POPrintTemplate.displayName = 'POPrintTemplate';
