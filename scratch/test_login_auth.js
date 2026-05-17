const http = require('http');

const payload = JSON.stringify({
  email: 'test@gmail.com',
  password: 'password'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", res.headers);
    console.log("Response:", data);
  });
});

req.on('error', (err) => {
  console.error("Request failed:", err);
});

req.write(payload);
req.end();
