const fs = require('fs')
let content = fs.readFileSync('src/actions/__tests__/service.test.ts', 'utf8')

content = content.replace(
  /expect\(result\.error\)\.toMatch\(\/manager\/i\)/g,
  `expect(result.error).toMatch(/permission/i)`
)

fs.writeFileSync('src/actions/__tests__/service.test.ts', content)
console.log('Fixed test error message check')
