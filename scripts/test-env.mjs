import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function test() {
  console.log('--- TEST START ---');
  const branchesPath = path.resolve(__dirname, '../branches_full.json');
  if (fs.existsSync(branchesPath)) {
    const branchesContent = fs.readFileSync(branchesPath, 'utf16le');
    const branchesData = JSON.parse(branchesContent);
    console.log('Branches count:', Array.isArray(branchesData) ? branchesData.length : 'object');
  }
  console.log('--- TEST END ---');
}

test().catch(console.error);
