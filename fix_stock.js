const fs = require('fs');

const file = 'src/app/(dashboard)/transfer/components/StockTransfersView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add useSession import
if (!code.includes('useSession')) {
  code = code.replace('import { useService }', 'import { useSession } from "next-auth/react"\nimport { useService }');
  if (!code.includes('useSession')) {
    code = code.replace('import React', 'import { useSession } from "next-auth/react"\nimport React');
  }
}

// 2. Add useSession at top of component
code = code.replace('export function StockTransfersView({ prefillRequest, onClearPrefill }: { prefillRequest?: StockRequest, onClearPrefill?: () => void }) {', 
  'export function StockTransfersView({ prefillRequest, onClearPrefill }: { prefillRequest?: StockRequest, onClearPrefill?: () => void }) {\n  const { data: session } = useSession();');

// 3. Fix init() inside useEffect
code = code.replace(/const { data: { user } } = await import\("@\/app\/actions\/user"\)\.then\(m => m\.getUserAction\(\)\)/g, 'const user = session?.user');
code = code.replace(/await \(Promise\.resolve\(\{ data: \[\] \}\) as any\)\.eq\('id', user\.id\)\.single\(\)/g, 'await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))');
code = code.replace(/await \(Promise\.resolve\(\{ data: \[\] \}\) as any\)\.eq\('user_id', user\.id\)\.eq\('module', 'transfer'\)\.eq\('enabled', true\)/g, 'await import("@/app/actions/transfers").then(m => m.getUserPermissionsAction(user.id, "transfer"))');
code = code.replace(/await \(Promise\.resolve\(\{ data: \[\] \}\) as any\)/g, '{ data: [] }');

// 4. Fix fetchPendingDemands
code = code.replace(/const { data: demands } = await import\("@\/app\/actions\/generics"\)\.then\(m => m\.fetchData\("stock_requests"\)\)\s*\n\s*\.eq\('status', 'Pending'\)\s*\n\s*\.eq\('source_branch_id', sourceId \|\| userBranchId \|\| ""\)/g, 
  'const { data: demands } = await import("@/app/actions/transfers").then(m => m.getPendingDemandsAction(sourceId || userBranchId || ""))');

// 5. Fix openReceiveVerification
code = code.replace(/await null\s*\n\s*\.from\('stock_transfer_items'\)\s*\n\s*\.select\([\s\S]*?\)\s*\n\s*\.eq\('transfer_id', tx\.id\)/g, 
  'await import("@/app/actions/transfers").then(m => m.getTransferItemsAction(tx.id))');

fs.writeFileSync(file, code);
console.log('Fixed StockTransfersView');
