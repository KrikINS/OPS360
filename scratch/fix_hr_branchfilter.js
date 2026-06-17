const fs = require('fs')

let content = fs.readFileSync('src/actions/hr.ts', 'utf8')
const lines = content.split('\n')

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const allowedBranches = await branchFilterFor(session)')) {
    // Find the capability by looking backwards for `hasCapability('hr', `
    let capability = null;
    for (let j = i; j >= Math.max(0, i - 10); j--) {
      const match = lines[j].match(/hasCapability\('hr',\s*'([^']+)'/)
      if (match) {
        capability = match[1]
        break
      }
    }
    
    if (capability) {
      lines[i] = lines[i].replace(
        'branchFilterFor(session)',
        `branchFilterFor(session, "hr", "${capability}")`
      )
    } else {
      console.log(`Could not find capability for line ${i + 1}`)
    }
  }
}

fs.writeFileSync('src/actions/hr.ts', lines.join('\n'))
console.log('Fixed branchFilterFor calls in hr.ts')
