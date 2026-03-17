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
              counter-reset: page 1;
            }
            #grn-print-template {
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
              color: #000000 !important;
            }
            .print-footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              border-top: 1px solid #000000;
              background: white;
            }
            .page-number:after {
              content: "Page " counter(page);
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}} />

        {/* Corporate Header */}
        <div className="px-10 py-2.5 flex justify-between items-baseline w-full shrink-0 border-b-2 border-black">
          <h1 className="text-[18pt] font-bold tracking-tighter text-[#000000] m-0 leading-none uppercase">
            Goods Receipt Note
          </h1>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[18pt] font-bold text-[#000000] m-0 uppercase tracking-tight">
                Ethan Home Appliances
              </p>
              <p className="text-[10px] uppercase tracking-[0.3em] font-black m-0 text-slate-500">Ops360 Enterprise ERP</p>
            </div>
            <div className="bg-white p-1 rounded-lg border border-slate-200">
               <Image src="/ethan-logo.png" alt="Ethan Logo" width={40} height={40} className="h-9 w-auto object-contain" />
            </div>
          </div>
        </div>

        {/* Dynamic HQ Mapping Section */}
        <div className="px-10 py-4 flex justify-between items-start bg-slate-50 border-b border-slate-200">
          <div className="space-y-0.5 text-[10px] font-bold text-black uppercase tracking-tight">
            <p className="m-0">Ethan Home Appliances HQ</p>
            <p className="m-0">Minzta Hotel, Vazhappilly Tower, Koratty</p>
            <p className="m-0">Thrissur, Kerala</p>
            <p className="m-0">Contact No: 9747552277 | Email: ethanops360@gmail.com</p>
          </div>
          <div className="text-right text-[10px] font-bold text-black">
            <p className="m-0 uppercase tracking-widest text-slate-500">Document Reference</p>
            <p className="text-sm font-black m-0">{grn.grn_number}</p>
            <p className="m-0 text-slate-500 mt-1">PO Link: {grn.po_number || 'N/A'}</p>
          </div>
        </div>

        <div className="p-10 space-y-10 flex-1">
          {/* Branch & Reception Details */}
          <div className="grid grid-cols-2 gap-8 p-8 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#001529]">
                <Building2 className="h-5 w-5" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Receiving Branch</Label>
              </div>
              <div className="pl-6 border-l-2 border-slate-900">
                <p className="font-bold text-lg text-black m-0">{branch?.name || 'Central Hub'}</p>
                <p className="text-[10px] text-black mt-1 m-0">{branch?.full_address || 'Branch address registry required'}</p>
                <p className="text-[9px] font-black text-black mt-1 m-0 uppercase flex items-center gap-2">
                   <span className="opacity-50 tracking-tighter">GSTIN:</span> 
                   {branch?.gstin || '32BBBBB0000B1Z5'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#001529]">
                <ShieldAlert className="h-5 w-5" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Audit Information</Label>
              </div>
              <div className="pl-6 border-l-2 border-slate-900 font-bold">
                <p className="font-bold text-lg text-black m-0">{grn.originator_name || 'System Operator'}</p>
                <p className="text-[10px] text-slate-600 font-black uppercase m-0">GRN Verification Source</p>
                {grn.approver_email && (
                  <p className="text-[9px] font-mono text-slate-500 mt-1 truncate">{grn.approver_email}</p>
                )}
                <div className="mt-2 p-2 bg-white rounded border-2 border-black">
                   <p className="text-[8px] font-black uppercase text-black mb-1">Condition Notes</p>
                   <p className="text-[10px] text-black m-0 italic">{grn.condition_notes || 'No observation notes provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Received Items Table */}
          <div className="space-y-4">
            <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest flex items-center gap-2 m-0">
              <LayoutGrid className="h-4 w-4" />
              Received Item Specification
            </h4>
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse">
                <thead className="bg-white">
                  <tr className="border-b-2 border-black">
                    <th className="p-4 text-center w-[60px] font-black uppercase text-[9px] tracking-widest text-[#000000]">#</th>
                    <th className="p-4 text-left font-black uppercase text-[9px] tracking-widest text-[#000000]">Model Name & Code</th>
                    <th className="p-4 text-center w-20 font-black uppercase text-[9px] tracking-widest text-[#000000]">Qty</th>
                    <th className="p-4 text-left font-black uppercase text-[9px] tracking-widest text-[#000000]">Scanned Serial Numbers</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] text-black">
                  {grn.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="p-4 text-center font-bold text-black border-r border-slate-100">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-black text-sm">{item.product.model_name}</div>
                        <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">EHA Code: {item.product.product_code}</div>
                        <div className="text-[8px] text-black font-black uppercase tracking-widest mt-1">HSN: {item.product.hsn_code}</div>
                      </td>
                      <td className="p-4 text-center border-x border-slate-100">
                        <span className="font-black text-black font-mono">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[400px]">
                          {item.serial_numbers.map((sn, snIdx) => (
                            <span key={snIdx} className="bg-slate-50 text-black px-1.5 py-0.5 rounded text-[9px] font-mono border border-black font-bold">
                              {sn}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Corporate Footer */}
        <div 
          className="w-full px-10 py-6 border-t font-bold text-black uppercase tracking-widest shrink-0 bg-white print-footer"
        >
          <div className="flex justify-between items-end w-full">
            <div className="w-[45%] flex flex-col gap-1">
              <p className="m-0 text-black font-black text-[9px]">CLASSIFICATION: CONFIDENTIAL – GOODS RECEIPT AUDIT</p>
              <p className="text-[7px] opacity-100 m-0 leading-tight">Subject to Ernakulam/Kochi Jurisdiction. Document ID: {grn.id}</p>
            </div>
            
            <div className="text-center">
              <p className="m-0 page-number text-[10px]"></p>
            </div>

            <div className="w-[55%] text-right flex flex-row items-end justify-end gap-6 text-[8px]">
              <div className="flex flex-col gap-1">
                <p className="m-0 uppercase tracking-tighter">Intake Timestamp: {systemTimestamp}</p>
                <p className="text-[7px] opacity-100 m-0 uppercase flex items-center gap-1 justify-end font-black text-black">
                   <CheckCircle2 className="h-2 w-2" /> Verified Inventory Intake
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
