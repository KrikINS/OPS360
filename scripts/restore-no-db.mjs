import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('--- RESTORE START ---');
  
  const bPath = path.resolve(__dirname, '../branches_full_clean.json');
  if (fs.existsSync(bPath)) {
    const content = fs.readFileSync(bPath, 'utf8');
    console.log('Content preview:', content.substring(0, 50));
    try {
      const data = JSON.parse(content);
      console.log('Parsed branches:', Array.isArray(data) ? data.length : 'object');
    } catch (err) {
      console.error('JSON Parse Error:', err.message);
      console.error('At char:', err.at);
    }
  }

  console.log('--- RESTORE END ---');
}

main().catch(console.error);
