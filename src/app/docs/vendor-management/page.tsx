import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { CopyButton } from "@/components/docs/copy-button"
import { Feedback } from "@/components/docs/feedback"
import { Info, ShieldCheck, ChevronRight } from "lucide-react"
import Image from "next/image"

export default function VendorManagementDocs() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className="hover:text-slate-600 cursor-pointer">Docs</span>
        <ChevronRight className="h-3 w-3" />
        <span className="hover:text-slate-600 cursor-pointer">Procurement</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#001529]">Vendors</span>
      </nav>

      <section className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">
          Vendor Onboarding & Compliance Protocols
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Standardized procedures for registering new suppliers and ensuring audit-ready compliance status.
        </p>
      </section>

      {/* Procurement Lock Rule */}
      <div className="p-6 rounded-2xl bg-[#001529] text-white flex items-start gap-5 overflow-hidden relative group">
        <div className="bg-[#7FD1E3] p-3 rounded-xl transform rotate-3 transition-transform group-hover:rotate-0">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div className="relative z-10">
          <h2 className="text-lg font-bold">The Procurement Lock Rule</h2>
          <p className="mt-1 text-slate-300 text-sm leading-relaxed">
            Purchase Orders (POs) CANNOT be generated for vendors with a <span className="text-[#7FD1E3] font-bold italic">&apos;Pending&apos;</span> or <span className="text-rose-400 font-bold italic">&apos;Blacklisted&apos;</span> status. 
            All vendors must be marked as <span className="text-emerald-400 font-bold italic">&apos;Verified&apos;</span> by an Area Manager.
          </p>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShieldCheck className="h-24 w-24" />
        </div>
      </div>

      {/* Registration Flow Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#001529] border-b pb-3">The 3-Step Registration Flow</h2>
        <p className="text-slate-600">All vendors must be registered through the Ops360 Vendor Portal following these sequential steps:</p>
        
        {/* Form Screenshot */}
        <div className="relative rounded-2xl border-4 border-slate-100 overflow-hidden shadow-2xl bg-white shadow-slate-200/50 my-8">
          <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-medium">Ops360 Vendor Registration UI</span>
          </div>
          <div className="p-1 bg-slate-200/20">
            <Image 
              src="/vendor-form-screenshot.png" 
              alt="Vendor Registration Form Step 1" 
              width={1200} 
              height={800} 
              className="rounded-lg shadow-sm"
            />
          </div>
        </div>

        <Accordion className="w-full space-y-3">
          <AccordionItem value="step-1" className="border rounded-xl px-4 bg-slate-50/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4 text-left">
                <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center font-bold text-[#001529] shadow-sm">1</div>
                <div>
                  <h3 className="font-bold text-[#001529]">Identity & Tax Details</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Focus: Legal Entity Verification</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2 text-slate-600 leading-relaxed border-t mt-2">
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-semibold text-[#001529]">Legal Company Name:</span> Must match exactly with the GST certificate.</li>
                <li><span className="font-semibold text-[#001529]">GSTIN Verification:</span> A 15-digit unique identifier is mandatory for all Indian vendors.</li>
                <li><span className="font-semibold text-[#001529]">PAN Number:</span> Automatically extracted from GSTIN but must be cross-checked manually.</li>
              </ul>
              
              {/* Compliance Tip */}
              <div className="mt-6 p-4 rounded-xl bg-sky-50 border border-sky-100 flex gap-4">
                <Info className="h-5 w-5 text-[#7FD1E3] shrink-0" />
                <div className="text-sm">
                  <h4 className="font-bold text-[#001529]">Compliance Tip</h4>
                  <p className="mt-1 text-slate-600">&quot;Always verify the 15-digit GSTIN against the GST Portal before marking a vendor as &apos;Verified&apos;.&quot;</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-2" className="border rounded-xl px-4 bg-slate-50/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4 text-left">
                <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center font-bold text-[#001529] shadow-sm">2</div>
                <div>
                  <h3 className="font-bold text-[#001529]">Contact & Address</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Focus: Logistics & Billing Communication</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2 text-slate-600 leading-relaxed border-t mt-2">
              <p>Capture contact details of the primary account manager and the physical billing address for invoicing documentation.</p>
              <div className="mt-4 p-4 bg-white rounded-lg border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">DATA ENTRY RULE</span>
                  <code className="text-xs font-mono text-[#001529]">FORMAT: [+91] [TEN DIGIT MOBILE]</code>
                </div>
                <CopyButton text="+91" />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-3" className="border rounded-xl px-4 bg-slate-50/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4 text-left">
                <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center font-bold text-[#001529] shadow-sm">3</div>
                <div>
                  <h3 className="font-bold text-[#001529]">Commercials & Banking</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Focus: Settlement details</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2 text-slate-600 leading-relaxed border-t mt-2">
              <p>Requires Bank Name, Account Number, and IFSC Code. Crucial for automated NEFT/RTGS payments via Ops360.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 border rounded-lg bg-white">
                  <span className="text-slate-400 font-bold block mb-1">STATE CODES</span>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Maharashtra: 27</span>
                    <CopyButton text="27" />
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-white">
                  <span className="text-slate-400 font-bold block mb-1">STATE CODES</span>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Delhi: 07</span>
                    <CopyButton text="07" />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <Feedback />
    </div>
  )
}
