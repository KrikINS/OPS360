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
              counter-reset: page 0;
            }
            .page-number:after {
              counter-increment: page;
              content: counter(page) " / " counter(pages);
            }
            #debit-note-print-template {
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
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}} />

        <div className="px-10 py-5 flex justify-between items-baseline w-full shrink-0 border-b-2 border-black">
          <h1 className="text-[18pt] font-bold tracking-tighter text-[#000000] m-0 leading-none uppercase">
            Debit Note
          </h1>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[18pt] font-bold text-[#000000] m-0 uppercase tracking-tight">
                Ethan Home Appliances
              </p>
              <p className="text-[10px] uppercase tracking-[0.3em] font-black m-0 text-slate-500">Reverse Logistics Division</p>
            </div>
            <div className="bg-white p-1 rounded-lg border border-slate-200">
               <Image src="/ethan-logo.png" alt="Ethan Logo" width={40} height={40} className="h-9 w-auto object-contain" />
            </div>
          </div>
        </div>

        {/* Standardized 4-line HQ Block */}
        <div className="px-10 py-4 flex justify-between items-start bg-slate-50 border-b border-slate-200">
          <div className="space-y-0.5 text-[10px] font-bold text-black uppercase tracking-tight">
            <p className="m-0">Ethan Home Appliances HQ</p>
            <p className="m-0">Minzta Hotel, Vazhappilly Tower, Koratty</p>
            <p className="m-0">Thrissur, Kerala</p>
            <p className="m-0">Contact No: 9747552277 | Email: ethanops360@gmail.com</p>
          </div>
          <div className="text-right text-[10px] font-bold text-black">
            <p className="m-0 uppercase tracking-widest text-slate-500">Document Ref</p>
            <p className="text-sm font-black m-0">{debitNote.debit_note_number}</p>
            <p className="m-0 text-slate-500 mt-1">{new Date(debitNote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="p-10 space-y-8 flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-8 p-8 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#001529]">
                <Building2 className="h-5 w-5" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Originating Branch</Label>
              </div>
              <div className="pl-6 border-l-2 border-slate-900">
                <p className="font-bold text-lg text-black m-0">{branch.name}</p>
                <p className="text-[10px] text-black mt-1 m-0">{branch.full_address}</p>
                <p className="text-[9px] font-black text-black mt-1 m-0 uppercase">
                   GSTIN: {branch.gstin}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#001529]">
                <Truck className="h-5 w-5" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vendor Creditor</Label>
              </div>
              <div className="pl-6 border-l-2 border-slate-900">
                <p className="font-bold text-lg text-black m-0">{vendor.name}</p>
                <p className="text-[10px] text-black mt-1 m-0">{vendor.address}</p>
                <p className="text-[9px] font-black text-black mt-1 m-0 uppercase">
                   GSTIN: {vendor.gstin}
                </p>
              </div>
            </div>
          </div>

          {/* Return Metadata & Financials */}
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
                <tbody className="text-[11px]">
                  <tr className="border-b border-slate-100">
                    <td className="p-4">
                      <div className="font-bold text-black text-sm">Purchase Return: {debitNote.reason}</div>
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

            <div className="flex justify-end pt-4">
              <div className="w-[320px] space-y-2 p-6 border-2 border-black">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-black">Net Deductible</span>
                  <span className="font-black">{formatCurrency(netValue)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-black">CGST Reversed (9%)</span>
                  <span className="font-black">{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b-2 border-black">
                  <span className="font-bold text-black">SGST Reversed (9%)</span>
                  <span className="font-black">{formatCurrency(sgst)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black uppercase tracking-tighter">Total Debit</span>
                  <span className="text-xl font-black">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification & compliance */}
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-4">
               <div className="space-y-1">
                 <Label className="text-[9px] text-black font-bold uppercase tracking-widest">Total Reversal Value in Words</Label>
                 <p className="text-[10px] font-black italic m-0 underline decoration-slate-900 underline-offset-4 text-black">{numberToWords(grandTotal)}.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="text-[10px] font-black uppercase flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" /> Rejection Clause
                </h4>
                <p className="text-[8px] font-medium leading-tight">This debit note is issued in accordance with the purchase return protocol. The corresponding amount will be adjusted against the vendor&apos;s pending invoices or future payments.</p>
              </div>
            </div>

            <div className="space-y-6">
               <div className="p-5 border-2 border-black flex flex-col items-center justify-center gap-2">
                  <p className="text-[9px] font-black uppercase tracking-widest">Digital Verification</p>
                  <div className="bg-white p-1 border border-black">
                     <Image 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`OPS360-DN-${debitNote.debit_note_number}`)}`} 
                      alt="Compliance QR" 
                      width={64}
                      height={64}
                      unoptimized
                      className="grayscale"
                    />
                  </div>
                  <p className="text-[7px] font-bold text-slate-500">Scan for cloud validation</p>
               </div>
            </div>
          </div>
        </div>

        <div className="w-full px-10 py-6 border-t font-bold text-black uppercase tracking-widest shrink-0 print-footer">
          <div className="flex justify-between items-end w-full">
            <div className="w-1/2">
              <p className="m-0 text-black font-black text-[9px]">FINANCIAL INSTRUMENT: DEBIT NOTE</p>
              <p className="text-[7px] m-0">Generated by Ops360 ERP | Reverse Logistics Layer</p>
            </div>
            
            <div className="text-center">
              <p className="m-0 page-number text-[10px]"></p>
            </div>

            <div className="text-right">
              <p className="m-0 text-[8px]">TIMESTAMP: {systemTimestamp}</p>
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
