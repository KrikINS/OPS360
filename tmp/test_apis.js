
async function testEndpoints() {
  const base = 'http://localhost:3000';
  const endpoints = [
    '/api/products',
    '/api/procurement/purchase-orders',
    '/api/vendors'
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Testing ${ep}...`);
      const res = await fetch(base + ep);
      console.log(`Status: ${res.status}`);
      if (res.status === 200) {
        const data = await res.json();
        console.log(`Success: Received ${Array.isArray(data) ? data.length : 'object'} items`);
      } else {
        const err = await res.json();
        console.log(`Error:`, err);
      }
    } catch (e) {
      console.log(`Failed to reach ${ep}:`, e.message);
    }
  }
}

testEndpoints();
