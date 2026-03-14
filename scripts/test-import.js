const fetch = require('node-fetch');
const items = [{ 
  'Brand': 'Ethan', 
  'Item Name': 'Ethan Arctic 1.5T', 
  'Serial Number': 'TEST-SN-FINAL-' + Date.now(), 
  'Branch': 'Test Branch 2', 
  'Estimated Cost': 45000 
}];

fetch('http://localhost:3000/api/inventory/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items })
})
.then(r => r.json())
.then(data => {
  console.log('Import Result:', JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('Import Error:', err);
});
