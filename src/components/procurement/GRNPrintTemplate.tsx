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

    interface PageChunk {
      pageIndex: number;
      items: {
        product: {
          model_name: string;
          product_code: string;
          hsn_code: string;
        };
        quantity: number;
        serial_numbers: string[];
        isContinuation: boolean;
        originalIndex: number;
      }[];
    }

    const pages: PageChunk[] = [];
    let currentPageItems: PageChunk['items'] = [];
    let currentSNCount = 0;

    grn.items.forEach((item, itemIdx) => {
      const sns = item.serial_numbers;
      if (!sns || sns.length === 0) {
        currentPageItems.push({
          ...item,
          originalIndex: itemIdx,
          isContinuation: false,
          serial_numbers: []
        });
        currentSNCount += 8; // Item with no SNs still consumes header space
      } else {
        let snIndex = 0;
        let isCont = false;
        while (snIndex < sns.length) {
          // Page 1 has Branch details, so capacity is lower. Page 2+ only has corporate header.
          const pageLimit = pages.length === 0 ? 48 : 68;
          
          if (currentSNCount >= pageLimit) {
            pages.push({ pageIndex: pages.length + 1, items: currentPageItems });
            currentPageItems = [];
            currentSNCount = 0;
            isCont = true;
          }
          
          // Header box consumes ~8 units equivalent visual space
          const spaceLeft = Math.max(0, pageLimit - currentSNCount - 8); 
          if (spaceLeft <= 0) {
            pages.push({ pageIndex: pages.length + 1, items: currentPageItems });
            currentPageItems = [];
            currentSNCount = 0;
            isCont = true;
            continue;
          }
          
          const chunk = sns.slice(snIndex, snIndex + spaceLeft);
          currentPageItems.push({
            ...item,
            originalIndex: itemIdx,
            isContinuation: isCont,
            serial_numbers: chunk
          });
          
          snIndex += chunk.length;
          currentSNCount += chunk.length + 8;
        }
      }
    });

    if (currentPageItems.length > 0) {
      pages.push({ pageIndex: pages.length + 1, items: currentPageItems });
    }
    // ------

    return (
      <div 
        ref={ref}
        id="grn-print-template" 
        className="bg-slate-200 text-[#000000] flex flex-col items-center w-full min-h-screen py-4 font-sans relative [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
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
              background: white !important;
            }
            #grn-print-template {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-page {
               width: 210mm;
               min-height: 296mm;
               margin: 0 auto;
               padding: 10mm;
               page-break-after: always;
               background: white;
               display: flex;
               flex-direction: column;
               border: none !important;
               box-shadow: none !important;
            }
            .print-page:last-child {
               page-break-after: auto;
            }
          }
        `}} />

        {pages.map((page, pIdx) => (
          <div key={pIdx} className="print-page w-[210mm] min-h-[297mm] bg-white shadow-xl mx-auto flex flex-col p-[8mm] mb-8 last:mb-0 border border-slate-300">
            {/* Corporate Header */}
            <div className="px-6 py-2 flex justify-between items-baseline w-full shrink-0 border-b-2 border-black">
              <h1 className="text-[16pt] font-black tracking-tighter text-[#000000] m-0 leading-none uppercase">
                Goods Receipt Note
              </h1>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[14pt] font-black text-[#000000] m-0 uppercase tracking-tight leading-none">
                    Ethan Home Appliances
                  </p>
                  <p className="text-[8px] uppercase tracking-[0.3em] font-black m-0 text-slate-500">Ops360 Enterprise ERP</p>
                </div>
                <div className="bg-white p-1 flex items-center justify-center border border-slate-200 h-10 w-10">
                   <Image src="/ethan-logo.png" alt="Ethan Logo" width={32} height={32} className="h-full w-auto object-contain" />
                </div>
              </div>
            </div>

            {/* Dynamic HQ Mapping Section */}
            <div className="px-6 py-3 flex justify-between items-start bg-slate-50 border-b border-black">
              <div className="space-y-0.5 text-[9px] font-bold text-black uppercase tracking-tight">
                <p className="m-0 font-black">Ethan Home Appliances HQ</p>
                <p className="m-0 text-slate-600">Minzta Hotel, Vazhappilly Tower, Koratty</p>
                <p className="m-0 text-slate-600">Thrissur, Kerala</p>
                <p className="m-0 text-slate-600">Contact No: 9747552277 | Email: ethanops360@gmail.com</p>
              </div>
              <div className="text-right text-[10px] font-bold text-black">
                <p className="m-0 uppercase tracking-widest text-slate-500 text-[8px]">Document Reference</p>
                <p className="text-sm font-black m-0">{grn.grn_number}</p>
                <p className="m-0 text-slate-600 mt-1 text-[9px]">PO Link: {grn.po_number || 'N/A'}</p>
              </div>
            </div>

            <div className="px-6 py-4 flex flex-col flex-1">
              {/* Branch & Reception Details ONLY ON PAGE 1 */}
              {pIdx === 0 && (
                <div className="grid grid-cols-2 gap-8 p-6 rounded-xl bg-slate-50 border border-slate-200 mb-6 shrink-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#001529]">
                      <Building2 className="h-4 w-4" />
                      <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Receiving Branch</Label>
                    </div>
                    <div className="pl-6 border-l-2 border-slate-900">
                      <p className="font-bold text-sm text-black m-0">{branch?.name || 'Central Hub'}</p>
                      <p className="text-[9px] text-slate-700 mt-1 m-0">{branch?.full_address || 'Branch address registry required'}</p>
                      <p className="text-[8px] font-black text-slate-800 mt-1 m-0 uppercase flex items-center gap-2 tracking-widest">
                         <span className="opacity-50">GSTIN:</span> 
                         {branch?.gstin || '32BBBBB0000B1Z5'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#001529]">
                      <ShieldAlert className="h-4 w-4" />
                      <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Audit Information</Label>
                    </div>
                    <div className="pl-6 border-l-2 border-slate-900 font-bold">
                      <p className="font-bold text-sm text-black m-0 tracking-tight">{grn.originator_name || 'System Operator'}</p>
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest m-0 mt-0.5">GRN Verification Source</p>
                      {grn.approver_email && (
                        <p className="text-[8px] font-mono text-slate-600 mt-1 truncate">{grn.approver_email}</p>
                      )}
                      <div className="mt-2 p-2 bg-white rounded border border-black shadow-sm">
                         <p className="text-[7px] font-black uppercase text-black mb-1">Condition Notes</p>
                         <p className="text-[9px] text-black m-0 italic font-medium">{grn.condition_notes || 'No observation notes provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Received Items (Auto-Flow Block Layout) */}
              <div className="space-y-0 w-full flex-1">
                <h4 className="font-black text-[10px] uppercase text-slate-500 tracking-widest flex items-center gap-2 m-0 mb-3">
                  <LayoutGrid className="h-3 w-3" />
                  {pIdx === 0 ? "Received Item Specification" : `Received Item Specification (Continued)`}
                </h4>
                
                <div className="border-t-2 border-black pt-4">
                  {page.items.map((item, idx) => (
                    <div key={idx} className="block w-full border-b border-slate-200 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
                      <div className="mb-2 flex justify-between items-start bg-slate-50 p-2 px-3 rounded text-black border border-slate-200">
                        <div>
                           <div className="font-bold text-black text-[11px] uppercase tracking-tight">
                             #{item.originalIndex + 1} - {item.product.model_name} {item.isContinuation ? '(Cont.)' : ''}
                           </div>
                           <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">EHA Code: {item.product.product_code} &nbsp;|&nbsp; HSN: {item.product.hsn_code}</div>
                        </div>
                        <div className="text-right flex items-center gap-2 bg-white px-2 py-1 border border-black rounded shadow-sm">
                           <span className="text-[8px] uppercase tracking-widest font-black">
                             {item.isContinuation ? 'Chunk Qty:' : 'Received Qty:'}
                           </span>
                           <span className="font-black text-black font-mono text-xs">{item.serial_numbers.length} / {item.quantity}</span>
                        </div>
                      </div>
                      
                      <div className="px-1 mt-3">
                        {item.serial_numbers.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {item.serial_numbers.map((sn, snIdx) => (
                              <div key={snIdx} className="bg-white text-black px-2 py-1.5 rounded text-[9px] font-mono border border-slate-300 font-bold shadow-sm text-center tracking-tighter overflow-hidden text-ellipsis whitespace-nowrap">
                                {sn}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[9px] italic text-slate-500">No serial numbers mapped for this condition.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Corporate Footer */}
            <div className="w-full px-6 py-4 mt-auto border-t-2 border-slate-900 border-dashed font-bold text-black shrink-0 bg-white">
              <div className="flex justify-between items-end w-full">
                <div className="w-[45%] flex flex-col gap-1">
                  <p className="m-0 text-black font-black text-[8px] uppercase tracking-widest">CLASSIFICATION: CONFIDENTIAL – GOODS RECEIPT AUDIT</p>
                  <p className="text-[7px] text-slate-600 m-0 leading-tight">Subject to Ernakulam/Kochi Jurisdiction. Document ID: {grn.id}</p>
                </div>
                
                <div className="text-center">
                  <p className="m-0 text-[10px] uppercase font-black tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-slate-600">
                    Page {page.pageIndex} of {pages.length}
                  </p>
                </div>

                <div className="w-[45%] text-right flex flex-row items-end justify-end gap-4 text-[8px]">
                  <div className="flex flex-col gap-1">
                    <p className="m-0 uppercase tracking-tighter">Intake Timestamp: {systemTimestamp}</p>
                    <p className="text-[7px] opacity-100 m-0 uppercase flex items-center gap-1 justify-end font-black text-[#5A9E78]">
                       <CheckCircle2 className="h-2.5 w-2.5" /> Verified Inventory Intake
                    </p>
                  </div>
                  <div className="bg-white p-1 border border-slate-300 h-10 w-10 flex items-center justify-center rounded">
                    <Image 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`OPS360-GRN-${grn.grn_number}-${grn.id}`)}`} 
                      alt="QR Code" 
                      width={40}
                      height={40}
                      unoptimized
                      className="h-full w-full object-contain grayscale"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
);

GRNPrintTemplate.displayName = 'GRNPrintTemplate';
