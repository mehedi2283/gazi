async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/stats/dashboard');
    const data = await res.json();
    console.log('Local API Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('Error fetching local API:', err);
  }
}
run();
