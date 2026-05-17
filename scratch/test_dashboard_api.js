const http = require('http');

http.get('http://localhost:3000/api/stats/dashboard', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", JSON.parse(data));
  });
}).on('error', (err) => {
  console.error("Request failed:", err);
});
