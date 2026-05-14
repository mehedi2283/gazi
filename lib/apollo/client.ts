import axios from 'axios'

const BASE = 'https://api.apollo.io/v1'
const API_KEY = process.env.APOLLO_API_KEY || ''

function headers() {
  return {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json'
  }
}

export async function searchPeople(filters: any) {
  const url = `${BASE}/mixed_people/search`
  const resp = await axios.post(url, { ...filters, api_key: API_KEY }, { headers: headers() })
  return resp.data
}

export async function enrichPerson(payload: any) {
  const url = `${BASE}/people/match`
  const resp = await axios.post(url, { ...payload, api_key: API_KEY }, { headers: headers() })
  return resp.data
}

export default { searchPeople, enrichPerson }
