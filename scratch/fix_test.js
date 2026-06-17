const fs = require('fs')
const path = 'src/actions/__tests__/finance.test.ts'
let c = fs.readFileSync(path, 'utf8')
c = c.replace(/role: 'manager'/g, "role: 'finance_manager'")
c = c.replace(/\/manager\/i/g, "/Insufficient permission/i")
fs.writeFileSync(path, c)
console.log('Fixed test mocks')
