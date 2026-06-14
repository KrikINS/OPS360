import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getProfitAndLoss,
  getBalanceSheet,
  getGSTSummary,
  getJournalEntries,
  getExpenses,
  getMarginReport,
  getBranches,
  getAPAgeing,
} from '@/actions/finance'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
import AccountingClient from './client'

export default async function AccountingPage(props: {
  searchParams: Promise<{
    tab?: string
    fromDate?: string
    toDate?: string
  }>
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner']
    .includes(role)

  const branchId = await getEffectiveBranchId(session)

  // Current financial year defaults
  const now = new Date()
  const fyStart = now.getMonth() + 1 >= 4
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`
  const fyEnd = now.toISOString().split('T')[0]

  const fromDate = searchParams.fromDate ?? fyStart
  const toDate = searchParams.toDate ?? fyEnd

  // Fetch all data in parallel
  const [plResult, bsResult, gstResult,
         journalResult, expenseResult, marginResult, branchesResult,
         apAgeingResult] = await Promise.all([
    getProfitAndLoss({
      branchId: isAdmin ? undefined : branchId ?? undefined,
      fromDate,
      toDate,
    }),
    getBalanceSheet({
      branchId: isAdmin ? undefined : branchId ?? undefined,
      asOfDate: toDate,
    }),
    getGSTSummary({
      branchId: isAdmin ? undefined : branchId ?? undefined,
      fromDate,
      toDate,
    }),
    getJournalEntries({
      branchId: isAdmin ? undefined : branchId ?? undefined,
      fromDate,
      toDate,
    }),
    getExpenses({
      branchId: isAdmin ? undefined : branchId ?? undefined,
    }),
    getMarginReport({
      branchId: isAdmin ? undefined : branchId ?? undefined,
      fromDate,
      toDate,
    }),
    getBranches(),
    getAPAgeing({
      branchId: isAdmin ? undefined : branchId ?? undefined,
      asOfDate: toDate,
    }),
  ])

  return (
    <AccountingClient
      activeTab={searchParams.tab ?? 'dashboard'}
      isAdmin={isAdmin}
      pl={plResult.success ? plResult : null}
      bs={bsResult.success ? bsResult : null}
      gst={gstResult.success ? gstResult : null}
      journal={journalResult.success
        ? journalResult.entries : []}
      expenses={expenseResult.success
        ? expenseResult.expenses : []}
      userId={session.user.id}
      branchId={branchId}
      fromDate={fromDate}
      toDate={toDate}
      fyStart={fyStart}
      fyEnd={fyEnd}
      marginData={marginResult.success ? marginResult : null}
      branchList={branchesResult.success ? branchesResult.branches : []}
      apAgeing={(apAgeingResult.success && apAgeingResult.rows && apAgeingResult.totals) ? { rows: apAgeingResult.rows, totals: apAgeingResult.totals } : null}
    />
  )
}
