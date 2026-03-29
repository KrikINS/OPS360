import React from 'react';
import { numberToWords } from '@/lib/number-to-words';
import { 
  Building2, 
  Truck, 
  LayoutGrid,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/format";

interface DebitNotePrintTemplateProps {
  debitNote: {
    id: string;
    debit_note_number: string;
    po_number: string;
    reason: string;
    amount: number;
    created_at: string;
    serial_numbers: string[];
    item_names?: string[];
    evidence_url?: string;
  };
  vendor: {
    name: string;
    gstin?: string;
    address?: string;
  };
  branch: {
    name: string;
    full_address?: string;
    gstin?: string;
  };
}

export const DebitNotePrintTemplate = React.forwardRef<HTMLDivElement, DebitNotePrintTemplateProps>(
  ({ debitNote, vendor, branch }, ref) => {
    const systemTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Lead Architect: Debit Note amount is already the Grand Total (Tax Inclusive)
    const grandTotal = debitNote.amount;
    const netValue = grandTotal / 1.18;
    const cgst = netValue * 0.09;
    const sgst = netValue * 0.09;

    return (
      <div 
        ref={ref}
        id="debit-note-print-template" 
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
            #debit-note-print-template {
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
          }
        `}} />

        {/* Fixed Header */}
        <div className="print-header">
          <div className="px-10 py-3 flex justify-between items-center w-full border-b-2 border-black bg-white">
            <div>
              <h1 className="text-[14pt] font-bold tracking-tighter text-black m-0 leading-none uppercase">Debit Note</h1>
              <p className="text-[10px] font-black text-slate-500 m-0">Ref: {debitNote.debit_note_number}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[13pt] font-bold text-black m-0 uppercase tracking-tight">Ethan Home Appliances</p>
                <p className="text-[8px] uppercase tracking-[0.3em] font-black m-0 text-slate-500">Reverse Logistics Division</p>
              </div>
              <div className="bg-white p-1 rounded border border-slate-200">
                <Image src="/ethan-logo.png" alt="Ethan Logo" width={32} height={32} className="h-7 w-auto object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Body Table with Spacers */}
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
                <div className="px-10 space-y-10 py-6">
                  {/* HQ Block (Ethans Details First Content) */}
                  <div className="py-6 px-10 flex justify-between items-start bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-0.5 text-[10px] font-bold text-black uppercase tracking-tight">
                      <p className="m-0">Ethan Home Appliances HQ</p>
                      <p className="m-0">Minzta Hotel, Vazhappilly Tower, Koratty</p>
                      <p className="m-0">Thrissur, Kerala</p>
                      <p className="m-0">Contact No: 9747552277 | Email: ethanops360@gmail.com</p>
                    </div>
                    <div className="text-right text-[10px] font-bold text-black">
                      <p className="m-0 uppercase tracking-widest text-slate-500">Debit Note Reference</p>
                      <p className="text-sm font-black m-0">{debitNote.debit_note_number}</p>
                      <p className="m-0 text-slate-500 mt-1">{new Date(debitNote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-8 p-8 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[#001529]">
                        <Building2 className="h-5 w-5" />
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Originating Branch</Label>
                      </div>
                      <div className="pl-6 border-l-2 border-slate-900">
                        <p className="font-bold text-lg text-black m-0">{branch?.name || 'Authorized Branch'}</p>
                        <p className="text-[10px] text-black mt-1 m-0">{branch?.full_address || 'Address information pending'}</p>
                        <p className="text-[9px] font-black text-black mt-1 m-0 uppercase flex items-center gap-2">
                           <span className="opacity-50">GSTIN:</span> {branch?.gstin || 'GSTIN Pending'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[#001529]">
                        <Truck className="h-5 w-5" />
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vendor Creditor</Label>
                      </div>
                      <div className="pl-6 border-l-2 border-slate-900">
                        <p className="font-bold text-lg text-black m-0">{vendor?.name || 'Vendor Partner'}</p>
                        <p className="text-[10px] text-black mt-1 m-0">{vendor?.address || 'Vendor address record'}</p>
                        <p className="text-[9px] font-black text-black mt-1 m-0 uppercase flex items-center gap-2">
                           <span className="opacity-50">GSTIN:</span> {vendor?.gstin || 'Verification Pending'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Return Details */}
                  <div className="space-y-4">
                    <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest flex items-center gap-2 m-0">
                      <LayoutGrid className="h-4 w-4" />
                      Reversal Transaction Details
                    </h4>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b-2 border-black">
                            <th className="p-4 text-left font-black uppercase text-[9px] tracking-widest text-[#000000]">Description of Reversal</th>
                            <th className="p-4 text-left font-black uppercase text-[9px] tracking-widest text-[#000000]">Linked PO</th>
                            <th className="p-4 text-right w-40 font-black uppercase text-[9px] tracking-widest text-[#000000]">Deductible Amount</th>
                          </tr>
                        </thead>
                        <tbody className="text-[11px] text-black">
                          <tr className="border-b border-slate-100">
                            <td className="p-4">
                              <div className="font-bold text-black text-sm">Purchase Return: {debitNote.reason}</div>
                              <div className="text-[11px] font-black text-blue-600 mt-0.5">
                                {debitNote.item_names?.join(", ") || "Multiple Specified Units"}
                              </div>
                              <div className="text-[9px] font-bold text-slate-600 uppercase mt-1">
                                Serials: {debitNote.serial_numbers?.join(', ') || 'N/A'}
                              </div>
                            </td>
                            <td className="p-4 font-black">{debitNote.po_number}</td>
                            <td className="p-4 text-right font-black">{formatCurrency(debitNote.amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-start pt-4 gap-12">
                    {/* Rejection Clause & Value in Words on the left */}
                    <div className="flex-1 space-y-6 pt-2">
                       <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <h4 className="text-[10px] font-black uppercase flex items-center gap-2 m-0 text-black">
                          <AlertCircle className="h-3 w-3 text-rose-600" /> Rejection & Debit Clause
                        </h4>
                        <p className="text-[9px] font-bold leading-relaxed text-slate-700 italic m-0">
                          This debit note is issued in accordance with the purchase return protocol. 
                          The corresponding amount will be deducted from the vendor&apos;s pending balance 
                          or adjusted in upcoming payment cycles. Acceptance of this return implies 
                          agreement to the associated financial adjustments.
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                         <Label className="text-[9px] text-black font-bold uppercase tracking-widest opacity-60">Total Reversal Value in Words</Label>
                         <p className="text-[10px] font-black italic m-0 underline decoration-slate-900 underline-offset-4 text-black">{numberToWords(grandTotal)}.</p>
                      </div>
                    </div>

                    {/* Financial Summary on the right */}
                    <div className="w-[320px] space-y-2 p-6 border-2 border-slate-900 bg-white shadow-sm">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-black uppercase tracking-tight">Net Deductible</span>
                        <span className="font-black">{formatCurrency(netValue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-black uppercase tracking-tight">CGST Reversed (9%)</span>
                        <span className="font-black">{formatCurrency(cgst)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-2 border-b-2 border-slate-900">
                        <span className="font-bold text-black uppercase tracking-tight">SGST Reversed (9%)</span>
                        <span className="font-black">{formatCurrency(sgst)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-black uppercase tracking-tighter">Total Debit</span>
                        <span className="text-xl font-black font-mono">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Verification & compliance footer */}
                  <div className="flex justify-between items-end border-t border-slate-200 pt-10">
                    <div className="text-left py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] m-0 text-black">Inbound Verifier / Branch Manager</p>
                      <p className="text-[7px] font-bold text-slate-500 mt-1 uppercase m-0 tracking-widest">Validated Electronic Document</p>
                    </div>

                    <div className="text-center w-full max-w-[200px] border-t-2 pt-4 border-slate-900">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] m-0 text-black">Authorized Signatory</p>
                      <p className="text-[7px] font-bold text-slate-500 mt-1 uppercase m-0 tracking-widest">Digital Authentication Hub</p>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>
                <div className="h-[30mm]"></div> {/* Matches fixed footer height */}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Fixed Footer */}
        <div className="w-full px-10 py-6 border-t font-bold text-black uppercase tracking-widest shrink-0 bg-white print-footer">
          <div className="flex justify-between items-end w-full">
            <div className="w-[45%] flex flex-col gap-1">
              <p className="m-0 text-black font-black text-[9px]">DOCUMENT VERIFICATION: OPS360 ENTERPRISE ERP</p>
              <p className="text-[7px] m-0 leading-tight font-bold uppercase tracking-wider">This is an electronically generated document. No physical signature is required.</p>
            </div>
            
            <div className="text-center text-[10px] flex items-center gap-2">
              <span className="text-black font-black text-right leading-none">SCAN TO VERIFY<br/>AUTHENTICITY</span>
              <div className="bg-white p-0.5 border border-slate-900 leading-none">
                 {/* Standard img used for consistent print rendering of external QR source */}
                 <Image 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`OPS360-DN-${debitNote.debit_note_number}`)}`} 
                  alt="Compliance QR" 
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 block grayscale contrast-125"
                />
              </div>
            </div>

            <div className="w-[30%] text-right flex flex-col gap-1">
              <p className="m-0 text-[8px] tracking-tighter uppercase">Timestamp: {systemTimestamp}</p>
              <p className="text-[7px] m-0 flex items-center gap-1 justify-end font-black">
                 <CheckCircle2 className="h-2 w-2" /> SECURE AUDITED DOCUMENT
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DebitNotePrintTemplate.displayName = 'DebitNotePrintTemplate';
