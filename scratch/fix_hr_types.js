const fs = require('fs')
let content = fs.readFileSync('src/actions/hr.ts', 'utf8')

// Fix hasCapability
content = content.replace(/hasCapability\(session\.user\.role, 'hr', 'view'\)/g, "await hasCapability('hr', 'view', session)")
content = content.replace(/hasCapability\(session\.user\.role, 'hr', 'edit'\)/g, "await hasCapability('hr', 'edit', session)")

// Fix branchFilterFor
content = content.replace(/branchFilterFor\(session\.user\)/g, "branchFilterFor(session)")

fs.writeFileSync('src/actions/hr.ts', content)
console.log('Fixed hr.ts types')
