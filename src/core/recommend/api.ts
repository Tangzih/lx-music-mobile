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

export interface RecommendSong {
  name: string       // 歌曲名
  singer: string     // 歌手
  source?: string    // 平台: kw/kg/tx/wy/mg，可选
  album?: string     // 专辑，可选
}

export interface RecommendAPIResult {
  songs: RecommendSong[]
  response: string
}

/**
 * 调用 OpenAI 格式 API 获取推荐歌曲
 * @param apiHost API 地址
 * @param apiKey API 密钥
 * @param model 模型名称
 * @param prompt 提示词
 * @param recommendCount 推荐歌曲数量
 * @returns 推荐歌曲列表和原始响应
 */
export const callRecommendAPI = async(
  apiHost: string,
  apiKey: string,
  model: string,
  prompt: string,
  recommendCount: number,
  signal?: AbortSignal
): Promise<RecommendAPIResult> => {
  const url = apiHost.replace(/\/+$/, '') + '/chat/completions'

  const requestBody: ChatCompletionRequest = {
    model: model || 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `你是一个音乐推荐助手。根据用户提供的歌曲列表，分析用户的音乐喜好，并推荐可能喜欢的新歌曲。

请返回 JSON 数组格式的歌曲列表，每首歌曲包含以下字段：
- name: 歌曲名（必填）
- singer: 歌手名（必填）
- source: 音乐平台代码（可选，如果知道该歌曲在哪个平台有版权，请填写：kw=酷我, kg=酷狗, tx=QQ音乐, wy=网易云音乐, mg=咪咕）
- album: 专辑名（可选）

返回格式示例：
[
  {"name": "晴天", "singer": "周杰伦", "source": "tx", "album": "叶惠美"},
  {"name": "七里香", "singer": "周杰伦", "source": "wy"}
]

注意：
1. 必须返回有效的 JSON 数组格式
2. 如果不确定某首歌在哪个平台有版权，source 字段可以不填或留空
3. 请推荐 ${recommendCount} 首歌曲
4. 不要包含任何解释性文字，只返回 JSON 数组`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal,
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

  // 只提取 JSON 数组内容（兼容任何模型格式，包括深度思考模型）
  // 从响应中提取第一个方括号包裹的 JSON 数组
  let songs: RecommendSong[] = []
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const jsonArray = JSON.parse(jsonMatch[0])
      if (Array.isArray(jsonArray)) {
        songs = jsonArray
          .filter((item: any) => typeof item === 'object' && item.name)
          .map((item: any) => ({
            name: String(item.name || '').trim(),
            singer: String(item.singer || '').trim(),
            source: item.source ? String(item.source).trim().toLowerCase() : undefined,
            album: item.album ? String(item.album).trim() : undefined,
          }))
          .filter((item: RecommendSong) => item.name)
      }
    }
  } catch (e) {
    console.log('JSON 解析失败，尝试其他方式解析:', e)
  }

  // 如果解析失败，尝试按行解析旧格式
  if (songs.length === 0) {
    const lines = content.split('\n').filter(line => line.trim())
    for (const line of lines) {
      // 移除可能的项目符号、数字前缀等
      const cleaned = line.replace(/^[\s]*[-*•\d.)]+\s*/, '').trim()
      if (cleaned) {
        // 尝试解析 "歌曲名 - 歌手" 格式
        const parts = cleaned.split(' - ').map(p => p.trim())
        if (parts.length >= 1) {
          songs.push({
            name: parts[0],
            singer: parts[1] || '',
          })
        }
      }
    }
  }

  console.log('[推荐] AI 返回歌曲列表:', songs.map(s => `${s.name} - ${s.singer}${s.source ? ` [${s.source}]` : ''}`))

  return {
    songs,
    response: content,
  }
}