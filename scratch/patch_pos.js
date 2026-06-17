const fs = require('fs');
const file = 'src/actions/__tests__/pos.test.ts';
let code = fs.readFileSync(file, 'utf8');

const helper = `
async function mockSession(userId: string, branchId: string, role: string) {
  await db.insert(schema.users).values({ id: userId, email: userId + '@test.com', password_hash: 'hash', role }).onConflictDoNothing()
  await db.insert(schema.user_branch_access).values({ user_id: userId, branch_id: branchId }).onConflictDoNothing()
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: userId, branchId, role }
  })
}
`;

// Insert the helper after the beforeAll block
code = code.replace(/afterAll\(.*?\n/, match => match + helper);

// Replace all occurrences of vi.mocked(getServerSession)...
const regex = /vi\.mocked\(getServerSession\)\.mockResolvedValue\(\{\s*user:\s*\{\s*id:\s*'([^']+)',\s*branchId:\s*([^,]+),\s*role:\s*'([^']+)'\s*\}\,?\s*\}\)/g;

code = code.replace(regex, "await mockSession('$1', $2, '$3')");

fs.writeFileSync(file, code);
