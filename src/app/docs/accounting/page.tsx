import { 
  Calculator, 
  BookOpen, 
  ArrowRightLeft, 
  FileText, 
  CreditCard,
  Building,
  Download
} from "lucide-react"

export default function AccountingDocsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">
          Finance & Accounts
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          Comprehensive guide to double-entry accounting, automated journal entries, and financial reporting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overview */}
        <section className="space-y-4 p-8 border rounded-2xl bg-white shadow-sm">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-[#7FD1E3]" />
            Overview
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ul>
              <li><strong>Automated double-entry accounting:</strong> The system ensures balanced books.</li>
              <li>Every GRN and POS sale auto-generates journal entries instantly.</li>
              <li>No manual bookkeeping required for routine operations.</li>
              <li>Branch-scoped reporting based on the Indian FY (April-March).</li>
            </ul>
          </div>
        </section>

        {/* Chart of Accounts */}
        <section className="space-y-4 p-8 border rounded-2xl bg-white shadow-sm">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#7FD1E3]" />
            Chart of Accounts
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>The system comes with 23 pre-seeded accounts (Assets, Liabilities, Equity, Revenue, Expense, Tax).</p>
            <ul>
              <li><strong>System accounts are locked:</strong> Core accounts cannot be deleted to maintain integrity.</li>
              <li><strong>Standard coding:</strong>
                <ul>
                  <li><code>1xxx</code> - Assets</li>
                  <li><code>2xxx</code> - Liabilities</li>
                  <li><code>3xxx</code> - Equity</li>
                  <li><code>4xxx</code> - Revenue</li>
                  <li><code>5xxx</code> - Expenses</li>
                </ul>
              </li>
            </ul>
          </div>
        </section>

        {/* Automated Journal Entries */}
        <section className="space-y-4 p-8 border rounded-2xl bg-white shadow-sm md:col-span-2">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-[#7FD1E3]" />
            Automated Journal Entries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-bold mb-2">GRN Posted</h3>
              <ul className="text-sm space-y-1 font-mono text-slate-700">
                <li>DR 1040 Inventory Asset (landed cost)</li>
                <li>DR 1050 GST Input Credit (GST paid)</li>
                <li>CR 2010 Accounts Payable (full invoice amount)</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-bold mb-2">POS Sale Completed</h3>
              <ul className="text-sm space-y-1 font-mono text-slate-700">
                <li>DR 1010 Cash (sale amount)</li>
                <li>CR 4000 Sales Revenue (subtotal ex-tax)</li>
                <li>CR 2020/2030 GST Payable CGST/SGST (tax collected)</li>
                <li>DR 5010 COGS (inventory cost)</li>
                <li>CR 1040 Inventory Asset (reduce stock value)</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-bold mb-2">Expense Approved</h3>
              <ul className="text-sm space-y-1 font-mono text-slate-700">
                <li>DR [expense account] (amount)</li>
                <li>CR 1010/1020 Cash/Bank (payment)</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-bold mb-2">Vendor Payment</h3>
              <ul className="text-sm space-y-1 font-mono text-slate-700">
                <li>DR 2010 Accounts Payable (reduces liability)</li>
                <li>CR 1010/1020 Cash/Bank (payment out)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Financial Reports */}
        <section className="space-y-4 p-8 border rounded-2xl bg-white shadow-sm md:col-span-2">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#7FD1E3]" />
            Financial Reports
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ul>
              <li><strong>Dashboard:</strong> P&L summary cards, revenue/expense breakdown, GST position, and recent journal entries.</li>
              <li><strong>Balance Sheet:</strong> Verifies Assets = Liabilities + Equity, includes an accounting equation banner and balance check indicator.</li>
              <li><strong>Journal Ledger:</strong> View all entries with source badges (GRN/SALES/EXPENSE/PAYMENT/OPENING_BALANCE). Includes branch and FY filters.</li>
              <li><strong>GST Summary:</strong> Tracks CGST/SGST/IGST collected vs ITC paid, with automated GSTR filing notes.</li>
              <li><strong>Margin Report:</strong> Product-level revenue/COGS/gross profit tracking, margin %, discount analysis, and manager approval tracking.</li>
            </ul>
          </div>
        </section>

        {/* Expense Management */}
        <section className="space-y-4 p-8 border rounded-2xl bg-white shadow-sm">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[#7FD1E3]" />
            Expense Management
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ul>
              <li>Staff submits an expense with a category and payment source.</li>
              <li>Manager or Admin approves the expense, which auto-posts the journal entry.</li>
              <li><strong>Categories:</strong> COGS, Freight, Utilities, Rent, Salaries, Marketing, Miscellaneous.</li>
              <li><strong>Payment sources:</strong> Cash, Bank.</li>
            </ul>
          </div>
        </section>

        {/* Vendor Payments */}
        <section className="space-y-4 p-8 border rounded-2xl bg-white shadow-sm">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Building className="h-6 w-6 text-[#7FD1E3]" />
            Vendor Payments (Accounts Payable)
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ul>
              <li>Record payment against any received Purchase Order.</li>
              <li><strong>Payment methods:</strong> Bank Transfer, UPI, Cheque, Cash.</li>
              <li>Reference number tracking (UTR/Cheque/UPI ref).</li>
              <li>Auto-posts journal: DR Accounts Payable, CR Cash/Bank.</li>
              <li>Easily accessible from the PO Actions dropdown as "Record Payment".</li>
            </ul>
          </div>
        </section>

        {/* Opening Balance */}
        <section className="space-y-4 p-8 border rounded-2xl bg-white shadow-sm md:col-span-2">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Building className="h-6 w-6 text-[#7FD1E3]" />
            Opening Balance
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ul>
              <li>Import opening stock via a branded Excel template.</li>
              <li>Download the template complete with product and branch reference sheets for easy input.</li>
              <li>Upload validation checks for product codes, branch names, duplicate serials, and cost values.</li>
              <li>Auto-posts opening balance journal entries per branch: DR 1040 Inventory Asset, CR 3010 Retained Earnings.</li>
            </ul>
          </div>
        </section>

        {/* Export */}
        <section className="space-y-4 p-8 border rounded-2xl bg-white shadow-sm md:col-span-2">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Download className="h-6 w-6 text-[#7FD1E3]" />
            Export
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ul>
              <li>CSV export available for all report tabs.</li>
              <li>PDF print with branded template matching PO/GRN styles (Company header, address, GSTIN, timestamp).</li>
              <li>Date range filtering supported with a quick FY toggle button.</li>
            </ul>
          </div>
        </section>

      </div>
    </div>
  )
}
