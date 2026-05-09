import axios from 'axios'

const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || ''
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export async function callAI(system: string, user: string, maxTokens = 1000) {
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]

  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: MODEL,
      messages,
      max_tokens: maxTokens
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )

  return resp.data
}

export default { callAI }
