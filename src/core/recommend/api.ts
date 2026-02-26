/**
 * OpenAI 格式 API 调用封装
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}

interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: ChatMessage
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface RecommendAPIResult {
  songs: string[]
  response: string
}

/**
 * 调用 OpenAI 格式 API 获取推荐歌曲
 * @param apiHost API 地址
 * @param apiKey API 密钥
 * @param model 模型名称
 * @param prompt 提示词
 * @param recommendCount 推荐歌曲数量
 * @returns 推荐歌曲名列表和原始响应
 */
export const callRecommendAPI = async(
  apiHost: string,
  apiKey: string,
  model: string,
  prompt: string,
  recommendCount: number
): Promise<RecommendAPIResult> => {
  const url = apiHost.replace(/\/+$/, '') + '/chat/completions'

  const requestBody: ChatCompletionRequest = {
    model: model || 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `你是一个音乐推荐助手。根据用户提供的歌曲列表，分析用户的音乐喜好，并推荐可能喜欢的新歌曲。
请只返回歌曲名列表，格式为 JSON 数组，不要包含其他解释性文字。
例如：["歌曲名 1 - 歌手 1", "歌曲名 2 - 歌手 2"]
请推荐 ${recommendCount} 首歌曲。`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 请求失败：${response.status} ${response.statusText} - ${errorText}`)
  }

  const data: ChatCompletionResponse = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error('API 返回结果为空')
  }

  const content = data.choices[0].message.content.trim()

  // 尝试解析 JSON 数组
  let songs: string[] = []
  try {
    // 尝试直接解析 JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const jsonArray = JSON.parse(jsonMatch[0])
      if (Array.isArray(jsonArray)) {
        songs = jsonArray.filter((item: any) => typeof item === 'string' && item.trim())
      }
    }
  } catch (e) {
    console.log('JSON 解析失败，尝试其他方式解析')
  }

  // 如果不是 JSON 格式，尝试按行解析
  if (songs.length === 0) {
    const lines = content.split('\n').filter(line => line.trim())
    for (const line of lines) {
      // 移除可能的项目符号、数字前缀等
      const cleaned = line.replace(/^[\s]*[-*•\d.)]+\s*/, '').trim()
      if (cleaned) {
        songs.push(cleaned)
      }
    }
  }

  return {
    songs,
    response: content,
  }
}