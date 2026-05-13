type AiRole = 'system' | 'user' | 'assistant'

export type AiMessage = {
  role: AiRole
  content: string
}

type AiChatOptions = {
  messages: AiMessage[]
  temperature?: number
  maxTokens?: number
}

export async function requestAiChat({ messages, temperature = 0.7, maxTokens = 600 }: AiChatOptions): Promise<string | null> {
  const proxyUrl = import.meta.env.VITE_AI_PROXY_URL
  if (!proxyUrl) return null

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error?.message || `AI proxy failed: ${response.status}`)
  }

  const result = await response.json()
  return result.choices?.[0]?.message?.content?.trim() || null
}
