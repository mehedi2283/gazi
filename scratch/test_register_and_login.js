const http = require('http');

const email = `new_test_${Date.now()}@example.com`;
const password = 'password123';
const name = 'New Test User';

function post(path, payload, callback) {
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      callback(null, res.statusCode, JSON.parse(data));
    });
  });

  req.on('error', (err) => {
    callback(err);
  });

  req.write(payload);
  req.end();
}

console.log("Registering user:", email);
post('/api/auth/register', JSON.stringify({
  full_name: name,
  email: email,
  password: password
}), (err, status, registerResp) => {
  if (err) {
    console.error("Register request failed:", err);
    return;
  }
  console.log("Register Status:", status, "Response:", registerResp);

  if (status !== 200) {
    console.error("Failed to register.");
    return;
  }

  console.log("\nLogging in user:", email);
  post('/api/auth/login', JSON.stringify({
    email: email,
    password: password
  }), (err2, status2, loginResp) => {
    if (err2) {
      console.error("Login request failed:", err2);
      return;
    }
    console.log("Login Status:", status2, "Response:", loginResp);
  });
});
