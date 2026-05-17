async function test() {
  const key = "ZjdmOGVjZjgtMDk4ZS00ZTdhLWEyMmEtYWMzN2I1MzU3NTBiOmJGUWVxSW16akpUWA==";
  const headers = { 
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  const payload = {
    name: "API Test Campaign",
    campaign_schedule: {
      schedules: [
        {
          name: "Test Schedule",
          timezone: "Etc/GMT+12",
          days: [true, true, true, true, true, false, false], // Trying array
          timing: {
            from: "00:01",
            to: "23:59"
          }
        }
      ]
    }
  };

  try {
    const res = await fetch('https://api.instantly.ai/api/v2/campaigns', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('SUCCESS Array:', data);
  } catch (err) {
    console.log('ERROR Array:', err);
  }

  const payload2 = {
    name: "API Test Campaign 2",
    campaign_schedule: {
      schedules: [
        {
          name: "Test Schedule",
          timezone: "Etc/GMT+12",
          days: { "0": true, "1": true, "2": true, "3": true, "4": true, "5": false, "6": false }, // Trying object
          timing: {
            from: "00:01",
            to: "23:59"
          }
        }
      ]
    }
  };

  try {
    const res2 = await fetch('https://api.instantly.ai/api/v2/campaigns', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload2)
    });
    const data2 = await res2.json();
    console.log('SUCCESS Object:', data2);
  } catch (err) {
    console.log('ERROR Object:', err);
  }
}

test();
