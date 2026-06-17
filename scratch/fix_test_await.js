const fs = require('fs')
let content = fs.readFileSync('src/actions/__tests__/service.test.ts', 'utf8')

content = content.replace(
  /const requests = Array\.from\(\{ length: 10 \}, \(\) => \{\n\s*await setupUserAccess\(db, STAFF_ID, 'staff', branch\.id\)/g,
  "await setupUserAccess(db, STAFF_ID, 'staff', branch.id)\n    const requests = Array.from({ length: 10 }, () => {"
)

fs.writeFileSync('src/actions/__tests__/service.test.ts', content)
console.log('Fixed await error in service tests')
