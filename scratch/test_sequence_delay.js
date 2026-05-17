async function test() {
  const key = "ZjdmOGVjZjgtMDk4ZS00ZTdhLWEyMmEtYWMzN2I1MzU3NTBiOmJGUWVxSW16akpUWA==";
  const headers = { 
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  try {
    const res = await fetch('https://api.instantly.ai/api/v2/campaigns/55641521-61e7-41e9-8b41-f1f24df4f364', { headers });
    const campaign = await res.json();
    console.log(JSON.stringify(campaign.sequences, null, 2));
  } catch (err) {
    console.log('ERROR:', err);
  }
}

test();
