const fs = require('fs')
let content = fs.readFileSync('src/actions/hr.ts', 'utf8')

content = content.replace(
  "import { hasCapability, branchFilterFor } from '@/lib/rbac'",
  "import { hasCapability, branchFilterFor } from '@/lib/access'"
)

fs.writeFileSync('src/actions/hr.ts', content)
console.log('Fixed imports in hr.ts')
