import axios from 'axios'

const BASE = 'https://api.instantly.ai/api/v2'

type ListCampaignsParams = {
  limit?: number
  starting_after?: string
  search?: string
  tag_ids?: string
  ai_sales_agent_id?: string
  status?: number
}

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

export async function updateCampaign(id: string, data: any) {
  try {
    return await retryRequest(() => axios.patch(`${BASE}/campaigns/${id}`, data, { headers: getAuthHeaders() }))
  } catch (err: any) {
    throw getAxiosError(err)
  }
}

export async function listCampaigns(params: ListCampaignsParams = {}) {
  try {
    return await retryRequest(() => axios.get(`${BASE}/campaigns`, {
      headers: getAuthHeaders(),
      params
    }))
  } catch (err: any) {
    throw getAxiosError(err)
  }
}

export async function listAllCampaigns(params: Omit<ListCampaignsParams, 'starting_after'> = {}) {
  const campaigns: any[] = []
  let startingAfter: string | undefined
  let page = 0

  do {
    const response = await listCampaigns({
      ...params,
      limit: params.limit || 100,
      starting_after: startingAfter
    })
    const items = Array.isArray(response.data?.items) ? response.data.items : []
    campaigns.push(...items)
    startingAfter = response.data?.next_starting_after || undefined
    page += 1
  } while (startingAfter && page < 20)

  return campaigns
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

export async function deleteCampaign(id: string) {
  try {
    return await retryRequest(() => axios.delete(`${BASE}/campaigns/${id}`, { headers: getAuthHeaders() }))
  } catch (err: any) {
    throw getAxiosError(err)
  }
}

export async function getCampaignAnalytics(id: string) {
  return axios.get(`${BASE}/campaigns/${id}/analytics/overview/summary`, { headers: getAuthHeaders() })
}

export default { createCampaign, updateCampaign, listCampaigns, listAllCampaigns, activateCampaign, pauseCampaign, deleteCampaign, getCampaignAnalytics }
