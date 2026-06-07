import React from 'react';
import { 
  Building2, 
  Truck, 
  LayoutGrid,
  CheckCircle2,
  User
} from "lucide-react";
import Image from "next/image";
import { useBranding } from "@/providers/GlobalBrandingProvider";

interface WaybillPrintTemplateProps {
  data: {
    transfer_details: {
      number: string;
      status: string;
      created_at: string;
      completed_at: string | null;
    };
    source_branch: {
      name: string;
      address: string;
    };
    destination_branch: {
      name: string;
      address: string;
    };
    originator: {
      full_name: string;
    };
    items: {
      model_name: string;
      category: string;
      serial_number: string;
    }[];
  };
}

export const WaybillPrintTemplate = React.forwardRef<HTMLDivElement, WaybillPrintTemplateProps>(
  ({ data }, ref) => {
    const { transfer_details, source_branch, destination_branch, originator, items } = data;
    const { companyName, logoUrl } = useBranding();
    
    const systemTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    return (
      <div 
        ref={ref}
        id="waybill-print-template" 
        className="bg-white text-black flex flex-col w-[210mm] min-h-[297mm] p-0 mx-auto font-sans relative [print-color-adjust:exact]"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
            .print-header { position: fixed; top: 0; left: 0; right: 0; width: 100%; background: white; z-index: 100; }
            .print-footer { position: fixed; bottom: 0; left: 0; right: 0; width: 100%; border-top: 1px solid #000; background: white; }
            tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
        `}} />

        {/* Fixed Header */}
        <div className="print-header">
          <div className="px-10 py-4 flex justify-between items-center w-full border-b-2 border-black bg-white">
            <div>
              <h1 className="text-[14pt] font-black tracking-tighter uppercase m-0 leading-none">Stock Transfer Waybill</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="bg-white p-1 rounded border border-slate-200">
                  <Image src={logoUrl || "/ethan-logo-final.png"} alt={`${companyName} Logo`} width={32} height={32} className="h-7 w-auto object-contain" />
                </div>
                <div>
                   <p className="text-[10pt] font-black m-0 uppercase tracking-tight">{companyName}</p>
                   <p className="text-[7px] uppercase tracking-[0.2em] font-black m-0 text-slate-500">Logistics Hub</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Waybill ID</p>
              <p className="text-[20pt] font-black tracking-tighter leading-none">{transfer_details.number}</p>
            </div>
          </div>
        </div>

        <table className="w-full">
          <thead><tr><td><div className="h-[25mm]"></div></td></tr></thead>
          <tbody>
            <tr>
              <td>
                <div className="px-10 space-y-8 py-6">
                  {/* Waybill Identification & Barcode */}
                  <div className="flex justify-between items-center p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction ID</Label>
                      <p className="text-2xl font-black m-0 tracking-tighter">{transfer_details.number}</p>
                      <p className="text-[10px] font-bold text-slate-500">Issued: {new Date(transfer_details.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="bg-white p-2 border border-black rounded-lg">
                      {/* Barcode API - Using BWIP-JS for Code128 */}
                      <Image 
                        src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${transfer_details.number}&scale=2&rotate=N&includetext`}
                        alt="Barcode"
                        width={200}
                        height={60}
                        unoptimized
                        className="h-12 w-auto grayscale"
                      />
                    </div>
                  </div>

                  {/* Logistics Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl border-2 border-black space-y-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dispatch From</span>
                      </div>
                      <div>
                        <p className="font-black text-lg m-0">{source_branch.name}</p>
                        <p className="text-[10px] font-medium leading-relaxed mt-1">{source_branch.address}</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border-2 border-black space-y-3">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Receive At</span>
                      </div>
                      <div>
                        <p className="font-black text-lg m-0">{destination_branch.name}</p>
                        <p className="text-[10px] font-medium leading-relaxed mt-1">{destination_branch.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Item Table */}
                  <div className="space-y-4">
                    <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 m-0">
                      <LayoutGrid className="h-4 w-4" />
                      Transfer Manifest
                    </h4>
                    <div className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full border-collapse">
                        <thead className="bg-slate-50">
                          <tr className="border-b-2 border-black text-[9px] font-black uppercase tracking-tight">
                            <th className="p-3 text-center border-r border-black w-10">#</th>
                            <th className="p-3 text-left border-r border-black">Item Specification</th>
                            <th className="p-3 text-left border-r border-black">Category</th>
                            <th className="p-3 text-left">Serial Number</th>
                          </tr>
                        </thead>
                        <tbody className="text-[11px] font-bold">
                          {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-200 last:border-0">
                              <td className="p-3 text-center border-r border-slate-200">{idx + 1}</td>
                              <td className="p-3 border-r border-slate-200 uppercase">{item.model_name}</td>
                              <td className="p-3 border-r border-slate-200 uppercase text-slate-500 text-[10px]">{item.category}</td>
                              <td className="p-3 font-mono text-blue-600">{item.serial_number}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Authorization Section */}
                  <div className="grid grid-cols-2 gap-10 pt-10">
                    <div className="space-y-12">
                      <div className="flex items-center gap-3">
                        <User className="h-8 w-8 p-1.5 bg-slate-100 rounded-full" />
                        <div>
                          <p className="text-[8px] font-black uppercase text-slate-400 m-0">Initiated By</p>
                          <p className="text-sm font-black m-0">{originator.full_name}</p>
                        </div>
                      </div>
                      <div className="w-full border-t border-black pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-center">Dispatched By Signature</p>
                        <p className="text-[7px] text-center text-slate-400 mt-1 uppercase tracking-tighter">Seal & Date</p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="w-full border-t border-black pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-center">Received By Signature</p>
                        <p className="text-[7px] text-center text-slate-400 mt-1 uppercase tracking-tighter">Seal & Date</p>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot><tr><td><div className="h-[25mm]"></div></td></tr></tfoot>
        </table>

        {/* Fixed Footer */}
        <div className="w-full px-10 py-6 border-t border-black bg-white print-footer">
          <div className="flex justify-between items-end w-full">
            <div className="space-y-1">
              <p className="m-0 font-black text-[9px]">DOC TYPE: INTERNAL WAREHOUSE WAYBILL</p>
              <p className="text-[7px] m-0 font-bold uppercase tracking-wider text-slate-500">Subject to standard logistics audit protocols of {companyName}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="m-0 text-[8px] font-bold uppercase">Timestamp: {systemTimestamp}</p>
                <p className="text-[7px] m-0 text-emerald-600 font-black flex items-center justify-end gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" /> SECURE LOGISTICS ASSET
                </p>
              </div>
              <div className="bg-white p-0.5 border border-black h-10 w-10">
                <Image 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(transfer_details.number)}`} 
                  alt="QR" width={40} height={40} unoptimized className="grayscale" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

WaybillPrintTemplate.displayName = 'WaybillPrintTemplate';

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("block", className)}>{children}</span>
);

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(' ');
}
