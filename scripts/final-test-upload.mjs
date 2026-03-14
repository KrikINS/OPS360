const items = [
  { 'Brand': 'Ethan', 'Item Name': 'Ethan Arctic 1.5T', 'Serial Number': 'SN-TEST-001', 'Branch': 'Test Branch 1', 'Estimated Cost': 45000, 'Inward Date': '2026-01-01T00:00:00Z' },
  { 'Brand': 'Ethan', 'Item Name': 'Ethan Arctic 1.5T', 'Serial Number': 'SN-TEST-002', 'Branch': 'Test Branch 1', 'Estimated Cost': 45000, 'Inward Date': '2026-03-10T00:00:00Z' },
  { 'Brand': 'Ethan', 'Item Name': 'Ethan Wave 20L', 'Serial Number': 'SN-TEST-003', 'Branch': 'Test Branch 2', 'Estimated Cost': 8500, 'Inward Date': '2026-02-15T00:00:00Z' },
  { 'Brand': 'Panasonic', 'Item Name': 'Panasonic OLED 4K', 'Serial Number': 'SN-TEST-004', 'Branch': 'Test Main Branch', 'Estimated Cost': 120000, 'Inward Date': '2026-03-14T00:00:00Z' }
];

async function runImport() {
  try {
    const res = await fetch('http://localhost:3000/api/inventory/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (err) {
    console.error('Import Failed:', err);
  }
}

runImport();
