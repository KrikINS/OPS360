import React from 'react';
import { 
  Building2, 
  ShieldAlert, 
  LayoutGrid,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { Label } from "@/components/ui/label";

interface Branch {
  id: string;
  name: string;
  full_address?: string;
  gstin?: string;
}

interface GRNPrintTemplateProps {
  grn: {
    id: string;
    grn_number: string;
    created_at: string;
    condition_notes?: string;
    po_number: string;
    originator_name?: string;
    approver_email?: string;
    items: {
      product: {
        model_name: string;
        product_code: string;
        hsn_code: string;
      };
      quantity: number;
      serial_numbers: string[];
    }[];
  };
  branch: Branch;
}

export const GRNPrintTemplate = React.forwardRef<HTMLDivElement, GRNPrintTemplateProps>(
  ({ grn, branch }, ref) => {
    const systemTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return (
      <div 
        ref={ref}
        id="grn-print-template" 
        className="bg-white text-[#000000] flex flex-col w-[210mm] min-h-[297mm] p-0 mx-auto font-sans relative [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: white !important;
            }
            #grn-print-template {
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
              color: #000000 !important;
            }
            .print-header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              width: 100%;
              background: white;
              z-index: 100;
            }
            .print-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              width: 100%;
              border-top: 1px solid #000000;
              background: white;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            * {
              color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
          }
        `}} />

        {/* Standardized Header */}
        <div className="print-header">
          <div className="px-10 py-3 flex justify-between items-center w-full border-b-2 border-black bg-white">
            <div>
              <h1 className="text-[14pt] font-bold tracking-tighter text-black m-0 leading-none uppercase">Goods Receipt Note</h1>
              <p className="text-[10px] font-black text-slate-500 m-0">Ref: {grn.grn_number}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[13pt] font-bold text-black m-0 uppercase tracking-tight">Ethan Home Appliances</p>
                <p className="text-[8px] uppercase tracking-[0.3em] font-black m-0 text-slate-500">Inventory Management Hub</p>
              </div>
              <div className="bg-white p-1 rounded border border-slate-200">
                <Image src="/ethan-logo.png" alt="Ethan Logo" width={32} height={32} className="h-7 w-auto object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Table Flow Container */}
        <table className="w-full">
          <thead>
            <tr>
              <td>
                <div className="h-[23mm]"></div> {/* Fixed header height spacer */}
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="px-10 space-y-10 py-6">
                  {/* HQ Address Section - Matches PO Body First Block */}
                  <div className="py-6 px-10 flex justify-between items-start bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-0.5 text-[10px] font-bold text-black uppercase tracking-tight">
                      <p className="m-0">Ethan Home Appliances HQ</p>
                      <p className="m-0">Minzta Hotel, Vazhappilly Tower, Koratty</p>
                      <p className="m-0">Thrissur, Kerala</p>
                      <p className="m-0">Contact No: 9747552277 | Email: ethanops360@gmail.com</p>
                    </div>
                    <div className="text-right text-[10px] font-bold text-black">
                      <p className="m-0 uppercase tracking-widest text-slate-500">Receipt Reference</p>
                      <p className="text-sm font-black m-0 leading-none">{grn.grn_number}</p>
                      <p className="m-0 text-slate-500 mt-1">{new Date(grn.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <p className="m-0 text-[#001529] font-black text-[9px] mt-1 italic tracking-tight underline">Ref PO: {grn.po_number}</p>
                    </div>
                  </div>

                  {/* Metadata Grid (Receiving Branch & Audit) */}
                  <div className="grid grid-cols-2 gap-8 p-8 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[#001529]">
                        <Building2 className="h-5 w-5" />
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Receiving Branch</Label>
                      </div>
                      <div className="pl-6 border-l-2 border-slate-900">
                        <p className="font-bold text-lg text-black m-0">{branch?.name || 'Central Hub'}</p>
                        <p className="text-xs text-slate-600 font-medium m-0 italic">Authorized Stock Intake Point</p>
                        <p className="text-[10px] text-black mt-1 m-0">{branch?.full_address || 'Address verification pending'}</p>
                        <p className="text-[9px] font-black text-black mt-1 m-0 uppercase flex items-center gap-2">
                           <span className="opacity-50 tracking-tighter">GSTIN:</span> 
                           {branch?.gstin || '32BBBBB0000B1Z5'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[#001529]">
                        <ShieldAlert className="h-5 w-5" />
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Audit Verification</Label>
                      </div>
                      <div className="pl-6 border-l-2 border-slate-900">
                        <p className="font-bold text-lg text-black m-0">{grn.originator_name || 'System Auto-Gen'}</p>
                        <p className="text-xs text-slate-600 font-medium m-0">Inbound Quality Controller</p>
                        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                           <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Inspection Notes</p>
                           <p className="text-[10px] text-slate-900 m-0 italic font-medium leading-relaxed">
                             &quot;{grn.condition_notes || 'All received items matched quantity and quality standards during initial inbound staging.'}&quot;
                           </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item Breakdown */}
                  <div className="space-y-4">
                    <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest flex items-center gap-2 m-0">
                      <LayoutGrid className="h-4 w-4" />
                      Received Item Breakdown
                    </h4>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full border-collapse">
                        <thead className="bg-white">
                          <tr className="border-b-2 border-black">
                            <th className="p-4 text-center w-[60px] font-black uppercase text-[9px] tracking-widest text-black">#</th>
                            <th className="p-4 text-left font-black uppercase text-[9px] tracking-widest text-black">Model Specification</th>
                            <th className="p-4 text-left w-[120px] font-black uppercase text-[9px] tracking-widest text-black">HSN/SAC</th>
                            <th className="p-4 text-center w-[120px] font-black uppercase text-[9px] tracking-widest text-black">Received Qty</th>
                          </tr>
                        </thead>
                        <tbody className="text-[11px] text-black">
                          {grn.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="p-4 text-center align-top font-bold text-black border-r border-slate-100">{idx + 1}</td>
                              <td className="p-4 align-top">
                                <div className="font-bold text-black text-sm whitespace-normal break-words leading-tight">{item.product.model_name}</div>
                                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mt-1">SKU: {item.product.product_code}</div>
                                
                                {item.serial_numbers && item.serial_numbers.length > 0 && (
                                  <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Registered Serial Inventory</p>
                                    <div className="grid grid-cols-4 gap-2">
                                      {item.serial_numbers.map((sn, snIdx) => (
                                        <div key={snIdx} className="bg-white border border-slate-200 px-2 py-1 rounded font-mono text-[9px] font-bold text-center">
                                          {sn}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 align-top text-black font-mono text-[10px] font-bold tracking-tighter">
                                {item.product.hsn_code}
                              </td>
                              <td className="p-4 text-center align-top">
                                <span className="bg-[#064E3B] text-white font-black px-3 py-1 rounded text-xs">
                                  {item.quantity} Units
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Certification Block */}
                  <div className="flex justify-end pt-6">
                    <div className="text-center w-full max-w-[240px] border-t-2 pt-6 border-black">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] m-0 text-black">Inbound Verifier</p>
                       <p className="text-[7px] font-bold text-slate-500 mt-1 uppercase m-0 tracking-[0.3em]">Electronically Validated Stage 1</p>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>
                <div className="h-[30mm]"></div> {/* Fixed footer height spacer */}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Standardized Footer */}
        <div className="w-full px-10 py-6 border-t font-bold text-black uppercase tracking-widest shrink-0 bg-white print-footer">
          <div className="flex justify-between items-end w-full">
            <div className="w-[45%] flex flex-col gap-1">
              <p className="m-0 text-black font-black text-[9px]">CLASSIFICATION: CONFIDENTIAL – INTERNAL INVENTORY AUDIT</p>
              <p className="text-[7px] opacity-100 m-0 leading-tight font-bold uppercase tracking-wider">INTAKE VERIFIED BY OPS360 ENTERPRISE LOGISTICS SUITE</p>
            </div>
            
            <div className="w-[55%] text-right flex flex-row items-end justify-end gap-6 text-[8px]">
              <div className="flex flex-col gap-1">
                <p className="m-0 uppercase tracking-tighter">Receipt Timestamp: {systemTimestamp}</p>
                <p className="text-[7px] opacity-100 m-0 uppercase flex items-center gap-1 justify-end font-black text-[#064E3B]">
                   <CheckCircle2 className="h-2 w-2" /> Authenticated Hub Entry
                </p>
              </div>
              <div className="bg-white p-1 border border-black h-12 w-12 flex items-center justify-center">
                <Image 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`OPS360-GRN-${grn.grn_number}-${grn.id}`)}`} 
                  alt="QR Code" 
                  width={48}
                  height={48}
                  unoptimized
                  className="h-full w-full object-contain grayscale"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

GRNPrintTemplate.displayName = 'GRNPrintTemplate';
