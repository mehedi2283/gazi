const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://api.apollo.io/v1';
const API_KEY = process.env.APOLLO_API_KEY || '';

async function testSearch() {
  const url = `${BASE}/mixed_people/search`;
  const filters = {
    q_organization_domains: "google.com",
    page: 1,
    display_mode: "regular_mode"
  };

  console.log('Testing Apollo Search...');
  console.log('API Key length:', API_KEY.length);

  try {
    // Try with Authorization header
    console.log('\nTrying with Authorization header...');
    const resp1 = await axios.post(url, filters, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    }).catch(e => e.response);
    
    console.log('Status (Auth Header):', resp1?.status);
    if (resp1?.status !== 200) {
      console.log('Error Data:', resp1?.data);
    }

    // Try with api_key in body
    console.log('\nTrying with api_key in body...');
    const resp2 = await axios.post(url, { ...filters, api_key: API_KEY }, {
      headers: { 'Content-Type': 'application/json' }
    }).catch(e => e.response);
    
    console.log('Status (API Key in body):', resp2?.status);
    if (resp2?.status !== 200) {
      console.log('Error Data:', resp2?.data);
    }
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

testSearch();
