import axios from 'axios'

const BASE = 'https://api.instantly.ai/api/v2'

function getAuthHeaders() {
  const key = process.env.INSTANTLY_API_KEY
  return { Authorization: `Bearer ${key}` }
}

async function retryRequest(fn: () => Promise<any>, retries = 3) {
  let attempt = 0
  while (attempt < retries) {
    try {
      return await fn()
    } catch (err) {
      attempt++
      const wait = Math.pow(2, attempt) * 100
      await new Promise((r) => setTimeout(r, wait))
      if (attempt >= retries) throw err
    }
  }
}

function getAxiosError(err: any) {
  const responseData = err?.response?.data
  const message = responseData?.message || responseData?.error || responseData || err?.message || 'Instantly request failed'

  return {
    message,
    status: err?.response?.status,
    data: responseData
  }
}

export async function createCampaign(data: any) {
  try {
    return await retryRequest(() => axios.post(`${BASE}/campaigns`, data, { headers: getAuthHeaders() }))
  } catch (err: any) {
    throw getAxiosError(err)
  }
}

export async function activateCampaign(id: string) {
  try {
    return await retryRequest(() => axios.post(`${BASE}/campaigns/${id}/activate`, {}, { headers: getAuthHeaders() }))
  } catch (err: any) {
    throw getAxiosError(err)
  }
}

export async function pauseCampaign(id: string) {
  try {
    return await retryRequest(() => axios.post(`${BASE}/campaigns/${id}/pause`, {}, { headers: getAuthHeaders() }))
  } catch (err: any) {
    throw getAxiosError(err)
  }
}

export async function getCampaignAnalytics(id: string) {
  return axios.get(`${BASE}/campaigns/${id}/analytics/overview/summary`, { headers: getAuthHeaders() })
}

export async function addLead(data: any) {
  return axios.post(`${BASE}/leads`, data, { headers: getAuthHeaders() })
}

export async function addLeadsBulk(leads: any[]) {
  for (const lead of leads) {
    await addLead(lead)
    await new Promise((r) => setTimeout(r, 500))
  }
}

export default { createCampaign, activateCampaign, pauseCampaign, getCampaignAnalytics, addLead, addLeadsBulk }
