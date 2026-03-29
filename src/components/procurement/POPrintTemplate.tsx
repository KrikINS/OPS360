import React from 'react';
import { numberToWords } from '@/lib/number-to-words';
import { 
  Building2, 
  Truck, 
  ShieldAlert, 
  LayoutGrid,
  CheckCircle2
} from "lucide-react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/format";

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
    approver_email?: string;
    terms_content?: string;
    items: {
      product?: {
        model_name: string;
        product_code: string;
        hsn_code: string;
      };
      quantity: number;
      unit_price: number;
      tax_rate: number;
      total_item_cost: number;
    }[];
  };
  vendor: {
    name: string;
    state?: string;
    gstin?: string;
  };
  branch: Branch;
}

export const POPrintTemplate = React.forwardRef<HTMLDivElement, POPrintTemplateProps>(
  ({ po, vendor, branch }, ref) => {
    const systemTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Lead Architect: Net Taxable Value is the base sum (Quantity * Unit Price)
    const netTaxableValue = po.items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    const totalTax = po.items.reduce((acc, item) => acc + (item.unit_price * item.quantity * (item.tax_rate / 100)), 0);
    const grandTotal = netTaxableValue + totalTax;
    
    // Split GST for display purposes (assuming 50/50 CGST/SGST which is standard for local)
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;

    return (
      <div 
        ref={ref}
        id="po-print-template" 
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
              counter-reset: page 0;
            }
            #po-print-template {
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
              color: #000000 !important;
            }
            /* Single fixed header — same on ALL pages */
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
            /* Padding now handled by standard container classes and table spacers */
            .print-content {}
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

        {/* Single fixed header — same on ALL pages */}
        <div className="print-header">
          <div className="px-10 py-3 flex justify-between items-center w-full border-b-2 border-black bg-white">
            <div>
              <h1 className="text-[14pt] font-bold tracking-tighter text-black m-0 leading-none uppercase">Purchase Order</h1>
              <p className="text-[10px] font-black text-slate-500 m-0">Ref: {po.po_number}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[13pt] font-bold text-black m-0 uppercase tracking-tight">Ethan Home Appliances</p>
                <p className="text-[8px] uppercase tracking-[0.3em] font-black m-0 text-slate-500">Ops360 Enterprise ERP</p>
              </div>
              <div className="bg-white p-1 rounded border border-slate-200">
                <Image src="/ethan-logo.png" alt="Ethan Logo" width={32} height={32} className="h-7 w-auto object-contain" />
              </div>
            </div>
          </div>
        </div>
        {/* HTML Table Spacer Hack to prevent overlap.
            thead / tfoot repeat automatically on every page.
            The fixed header / footer visually sit on top of the empty transparent spacer rows. */}
        <table className="w-full">
          <thead>
            <tr>
              <td>
                <div className="h-[23mm]"></div> {/* Matches fixed header height */}
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="px-10 space-y-10 print-content">
          {/* HQ Address + Reference — first body section (was second header strip) */}
          <div className="py-6 px-10 flex justify-between items-start bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-0.5 text-[10px] font-bold text-black uppercase tracking-tight">
              <p className="m-0">Ethan Home Appliances HQ</p>
              <p className="m-0">Minzta Hotel, Vazhappilly Tower, Koratty</p>
              <p className="m-0">Thrissur, Kerala</p>
              <p className="m-0">Contact No: 9747552277 | Email: ethanops360@gmail.com</p>
            </div>
            <div className="text-right text-[10px] font-bold text-black">
              <p className="m-0 uppercase tracking-widest text-slate-500">Reference Number</p>
              <p className="text-sm font-black m-0">{po.po_number}</p>
              <p className="m-0 text-slate-500 mt-1">{new Date(po.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          {/* Metadata Grid (Ship-To and Vendor) */}
          <div className="grid grid-cols-2 gap-8 p-8 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#001529]">
                <Building2 className="h-5 w-5" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Ship-To Destination</Label>
              </div>
              <div className="pl-6 border-l-2 border-slate-900">
                <p className="font-bold text-lg text-black m-0">{branch?.name || 'Central Hub'}</p>
                <p className="text-xs text-slate-600 font-medium m-0">Branch Delivery Registry</p>
                <p className="text-[10px] text-black mt-1 m-0">{branch?.full_address || 'Site delivery as per instructions'}</p>
                <p className="text-[9px] font-black text-black mt-1 m-0 uppercase flex items-center gap-2">
                   <span className="opacity-50 tracking-tighter">GSTIN:</span> 
                   {branch?.gstin || '32BBBBB0000B1Z5'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#001529]">
                <Truck className="h-5 w-5" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vendor Partner</Label>
              </div>
              <div className="pl-6 border-l-2 border-slate-900">
                <p className="font-bold text-lg text-black m-0">{vendor.name}</p>
                <p className="text-xs text-slate-600 font-medium m-0">{vendor.state || 'Registered Vendor'}</p>
                <p className="text-[10px] font-mono mt-1 text-black font-bold uppercase m-0 flex items-center gap-2">
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
                <thead className="bg-white">
                  <tr className="border-b-2 border-black">
                    <th className="p-3 text-center w-[40px] font-black uppercase text-[8px] tracking-tight text-black">#</th>
                    <th className="p-3 text-left w-[25%] font-black uppercase text-[8px] tracking-tight text-black">Model Specification</th>
                    <th className="p-3 text-left font-black uppercase text-[8px] tracking-tight text-black">HSN/SAC</th>
                    <th className="p-3 text-center font-black uppercase text-[8px] tracking-tight text-black">Qty</th>
                    <th className="p-3 text-right font-black uppercase text-[8px] tracking-tight text-black">Unit Price</th>
                    <th className="p-3 text-right font-black uppercase text-[8px] tracking-tight text-black">Tax Slab</th>
                    <th className="p-3 text-right font-black uppercase text-[8px] tracking-tight text-black">Total GST</th>
                    <th className="p-3 text-right font-black uppercase text-[8px] tracking-tight text-black">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] text-black bg-white">
                  {po.items.map((item, idx) => {
                    const qty = Number(item.quantity)
                    const price = Number(item.unit_price)
                    const rate = Number(item.tax_rate || 0)
                    const taxable = price * qty
                    const taxTotal = taxable * (rate / 100)
                    const lineTotal = taxable + taxTotal

                    return (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="p-3 text-center align-top font-bold text-black border-r border-slate-100">{idx + 1}</td>
                        <td className="p-3 align-top w-[25%]">
                          <div className="font-bold text-black text-[11px] whitespace-normal break-words leading-tight">{item.product?.model_name || 'Item'}</div>
                          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">SKU: {item.product?.product_code}</div>
                        </td>
                        <td className="p-3 align-top text-black font-mono text-[9px] font-bold tracking-tighter">
                          {item.product?.hsn_code || '---'}
                        </td>
                        <td className="p-3 text-center font-black text-black font-mono border-x border-slate-100 align-top">
                          {qty}
                        </td>
                        <td className="p-3 text-right font-bold text-black align-top">{formatCurrency(price)}</td>
                        <td className="p-3 text-right align-top">
                           <div className="flex flex-col items-end">
                              <span className="font-bold text-black">GST @ {rate}%</span>
                              <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">({rate/2}% + {rate/2}%)</span>
                           </div>
                        </td>
                        <td className="p-3 text-right font-bold text-black align-top">
                           {formatCurrency(taxTotal)}
                        </td>
                        <td className="p-3 text-right font-black text-black align-top">
                           {formatCurrency(lineTotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Block */}
            <div className="flex justify-end pt-4">
              <div className="w-[320px] space-y-2 p-6 border-2 border-black">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-black uppercase tracking-tight">Net Taxable Value</span>
                  <span className="font-black text-black">{formatCurrency(netTaxableValue)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-black uppercase tracking-tight">Total Gst component</span>
                  <span className="font-black text-black">{formatCurrency(totalTax)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b-2 border-black">
                  <div className="flex flex-col">
                    <span className="font-bold text-black uppercase tracking-tight">Split GST Registry</span>
                    <span className="text-[8px] opacity-50 uppercase tracking-widest font-black">CGST + SGST (50/50 Allocation)</span>
                  </div>
                  <span className="font-black text-black">{formatCurrency(cgst)} + {formatCurrency(sgst)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-black uppercase tracking-tighter">Amount Payable (Net)</span>
                  <span className="text-xl font-black text-black">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-dashed border-black">
                   <Label className="text-[9px] text-black font-bold uppercase tracking-widest block mb-1">Total Value in Words</Label>
                   <p className="text-[10px] font-black italic m-0 underline decoration-slate-900 underline-offset-4 text-black">
                      {numberToWords(Math.round(grandTotal))}.
                   </p>
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

            </div>

            <div className="space-y-6">
               <div className="p-6 text-black relative border-2 border-black">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <ShieldAlert className="h-20 w-20" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 m-0">Security Compliance Audit</h4>
                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="space-y-0.5">
                      <p className="text-[8px] text-slate-600 font-bold uppercase m-0">Originator</p>
                      <p className="text-xs font-black m-0">{po.requester_name || 'System Auto-Gen'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] text-slate-600 font-bold uppercase m-0">Certification</p>
                      <p className="text-xs font-black text-black m-0">
                        {po.approver_name ? 'Certified Approved' : 'Awaiting Review'}
                      </p>
                      {po.approver_email && (
                        <p className="text-[8px] font-mono text-slate-600 truncate">{po.approver_email}</p>
                      )}
                    </div>
                  </div>
               </div>

               <div className="flex justify-end pt-4">
                <div className="text-center w-full max-w-[200px] border-t-2 pt-4 border-black">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] m-0 text-black">Authorized Signatory</p>
                  <p className="text-[7px] font-bold text-slate-600 mt-1 uppercase m-0 tracking-widest">Validated Digital Document</p>
                </div>
              </div>
            </div>
          </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>
                <div className="h-[30mm]"></div> {/* Matches fixed footer height + extra visual padding */}
              </td>
            </tr>
          </tfoot>
        </table>

        <div 
          className="w-full px-10 py-6 border-t font-bold text-black uppercase tracking-widest shrink-0 bg-white print-footer"
        >
          <div className="flex justify-between items-end w-full">
            <div className="w-[45%] flex flex-col gap-1">
              <p className="m-0 text-black font-black text-[9px]">DOCUMENT VERIFICATION: OPS360 ENTERPRISE ERP</p>
              <p className="text-[7px] opacity-100 m-0 leading-tight font-bold uppercase tracking-wider">This is an electronically generated document. No physical signature is required.</p>
            </div>
            
            <div className="text-center">
              {/* Page numbers handled by browser */}
            </div>

            <div className="w-[55%] text-right flex flex-row items-end justify-end gap-6 text-[8px]">
              <div className="flex flex-col gap-1">
                <p className="m-0 uppercase tracking-tighter">Generated: {systemTimestamp}</p>
                <p className="text-[7px] opacity-100 m-0 uppercase flex items-center gap-1 justify-end font-black text-black">
                   <CheckCircle2 className="h-2 w-2" /> Verified Digital Asset
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-black text-black uppercase tracking-widest">Scan to Verify<br/>Authenticity</span>
                <div className="bg-white p-1 border border-black h-12 w-12 flex items-center justify-center">
                  <Image 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`OPS360-PO-${po.po_number}`)}`} 
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
      </div>
    );
  }
);

POPrintTemplate.displayName = 'POPrintTemplate';
