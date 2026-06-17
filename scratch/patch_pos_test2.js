const fs = require('fs')
const path = require('path')

const target = path.join(__dirname, '../src/actions/__tests__/pos.test.ts')
let content = fs.readFileSync(target, 'utf8')

// Regex to find vi.mocked(getServerSession) and the branch variable it uses.
// E.g., user: { id: '...', branchId: branch.id, ... } or branchId: branch1.id
content = content.replace(
  /vi\.mocked\(getServerSession\)\.mockResolvedValue(?:Once)?\(\{\s*user:\s*\{\s*id:\s*'([^']+)',\s*branchId:\s*([^,]+),\s*role:\s*'([^']+)'\s*\},\s*\}\)/g,
  (match, id, branchId, role) => {
    return `await db.insert(schema.users).values({ id: '${id}', email: '${id}@test.com', password_hash: 'hash', role: '${role}' }).onConflictDoNothing()
    await db.insert(schema.user_branch_access).values({ user_id: '${id}', branch_id: ${branchId} }).onConflictDoNothing()
    ${match}`
  }
)

fs.writeFileSync(target, content, 'utf8')
console.log('Successfully patched pos.test.ts with DB seed')
