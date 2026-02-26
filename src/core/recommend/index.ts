/**
 * 推荐歌曲核心逻辑
 */

import { callRecommendAPI, type RecommendSong } from './api'
import settingState from '@/store/setting/state'
import listState from '@/store/list/state'
import { getListMusics } from '@/utils/listManage'
import { search } from '@/core/search/music'
import { addAILog } from '@/store/recommend/logAction'
import musicSdk from '@/utils/musicSdk'

// 支持的音源平台
const VALID_SOURCES: LX.OnlineSource[] = ['kw', 'kg', 'tx', 'wy', 'mg']

/**
 * 获取用户歌单中的歌曲（简单模式：仅歌曲名和歌手信息）
 * @param analyzeCount 单次分析歌曲数量
 * @returns 歌曲信息字符串数组
 */
export const getUserMusicList = async(analyzeCount: number): Promise<string[]> => {
  const allMusicList = listState.allMusicList
  const musicStrings: string[] = []

  // 遍历所有列表收集歌曲
  for (const [listId, musics] of allMusicList.entries()) {
    // 跳过临时列表
    if (listId === 'temp') continue

    for (const music of musics) {
      musicStrings.push(`${music.name} - ${music.singer}`)
    }
  }

  // 如果歌曲数量超过 analyzeCount，随机抽取
  if (musicStrings.length > analyzeCount) {
    const shuffled = musicStrings.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, analyzeCount)
  }

  return musicStrings
}

/**
 * 获取当前用户歌单中的所有歌曲（用于去重）
 * @returns 歌曲 ID 集合
 */
export const getCurrentMusicIds = (): Set<string> => {
  const allMusicList = listState.allMusicList
  const musicIds = new Set<string>()

  for (const [listId, musics] of allMusicList.entries()) {
    // 跳过临时列表
    if (listId === 'temp') continue

    for (const music of musics) {
      musicIds.add(music.id)
    }
  }

  return musicIds
}

/**
 * 构建 AI 提示词
 * @param musicList 歌曲列表
 * @param recommendCount 推荐数量
 * @param extraPrompt 附加提示词
 * @returns 提示词
 */
export const buildPrompt = (musicList: string[], recommendCount: number, extraPrompt?: string): string => {
  let prompt: string

  if (musicList.length === 0) {
    prompt = '用户歌单为空，请随机推荐一些热门歌曲。'
  } else {
    prompt = `用户常听的歌曲：
${musicList.map((song, index) => `${index + 1}. ${song}`).join('\n')}

请分析这些歌曲，推测用户的音乐喜好，并推荐${recommendCount}首可能喜欢的新歌曲。`
  }

  // 添加附加提示词
  if (extraPrompt && extraPrompt.trim()) {
    prompt += `\n\n附加要求：${extraPrompt.trim()}`
  }

  return prompt
}

/**
 * 检查歌曲是否已存在
 * @param songName 歌曲名（格式：歌曲名 - 歌手）
 * @param existingIds 已存在的歌曲 ID 集合
 * @param searchedSongs 已搜索过的歌曲集合
 * @returns 是否已存在
 */
const isSongExists = (songName: string, existingIds: Set<string>, searchedSongs: Set<string>): boolean => {
  // 检查是否已经搜索过
  if (searchedSongs.has(songName.toLowerCase())) {
    return true
  }
  return false
}

/**
 * 模糊匹配歌手名（处理别名、英文名等情况）
 * @param searchSinger 搜索结果中的歌手名
 * @param targetSinger 目标歌手名
 * @returns 是否匹配
 */
const matchSinger = (searchSinger: string, targetSinger: string): boolean => {
  const normalizeStr = (str: string) => str.toLowerCase().replace(/[\s\-_.]/g, '')
  const normalizedSearch = normalizeStr(searchSinger)
  const normalizedTarget = normalizeStr(targetSinger)

  // 完全匹配
  if (normalizedSearch === normalizedTarget) return true

  // 包含匹配（处理 "周杰伦" 匹配 "周杰伦/Jay Chou" 的情况）
  if (normalizedSearch.includes(normalizedTarget) || normalizedTarget.includes(normalizedSearch)) {
    return true
  }

  return false
}

/**
 * 验证并规范化音源平台代码
 * @param source AI 返回的音源代码
 * @returns 有效的音源代码或 null
 */
const validateSource = (source?: string): LX.OnlineSource | null => {
  if (!source) return null
  const normalized = source.toLowerCase().trim()
  if (VALID_SOURCES.includes(normalized as LX.OnlineSource)) {
    return normalized as LX.OnlineSource
  }
  return null
}

/**
 * 搜索推荐歌曲
 * @param song AI 推荐的歌曲信息
 * @returns 搜索到的歌曲信息，未找到返回 null
 */
export const searchRecommendSong = async(song: RecommendSong): Promise<LX.Music.MusicInfoOnline | null> => {
  const { name, singer, source: aiSource, album } = song

  if (!name) {
    console.log('[推荐] 歌曲名为空，跳过')
    return null
  }

  // 验证 AI 返回的音源
  const preferSource = validateSource(aiSource)

  // 构建搜索关键词：歌曲名 + 歌手
  const searchText = singer ? `${name} ${singer}` : name

  console.log(`[推荐] 搜索歌曲: ${searchText}${preferSource ? ` [优先平台: ${preferSource}]` : ' [聚合搜索]'}`)

  try {
    // 如果 AI 指定了有效平台，优先在该平台搜索
    if (preferSource) {
      const results = await search(searchText, 1, preferSource)
      if (results && results.length > 0) {
        // 如果有歌手名，验证匹配度
        if (singer) {
          const matched = results.find(r => matchSinger(r.singer, singer))
          if (matched) {
            console.log(`[推荐] 在 ${preferSource} 找到匹配歌曲: ${matched.name} - ${matched.singer}`)
            return matched
          }
          // 没有精确匹配，返回第一个结果
          console.log(`[推荐] 在 ${preferSource} 未精确匹配歌手，使用第一个结果: ${results[0].name} - ${results[0].singer}`)
          return results[0]
        }
        console.log(`[推荐] 在 ${preferSource} 找到歌曲: ${results[0].name} - ${results[0].singer}`)
        return results[0]
      }
      console.log(`[推荐] 在 ${preferSource} 未找到歌曲，尝试聚合搜索`)
    }

    // 聚合搜索
    const results = await search(searchText, 20, 'all')

    if (!results || results.length === 0) {
      console.log(`[推荐] 聚合搜索无结果: ${searchText}`)
      return null
    }

    // 如果有歌手名，尝试匹配歌手来筛选结果
    if (singer) {
      // 优先匹配歌手的结果
      const matchedResult = results.find(result => matchSinger(result.singer, singer))
      if (matchedResult) {
        console.log(`[推荐] 聚合搜索匹配到歌手: ${matchedResult.name} - ${matchedResult.singer} [${matchedResult.source}]`)
        return matchedResult
      }

      // 如果有专辑名，尝试匹配专辑
      if (album) {
        const albumMatched = results.find(result =>
          result.meta.albumName && matchSinger(result.meta.albumName, album)
        )
        if (albumMatched) {
          console.log(`[推荐] 聚合搜索匹配到专辑: ${albumMatched.name} - ${albumMatched.singer} [${albumMatched.source}]`)
          return albumMatched
        }
      }
    }

    // 返回第一个结果
    console.log(`[推荐] 聚合搜索使用第一个结果: ${results[0].name} - ${results[0].singer} [${results[0].source}]`)
    return results[0]
  } catch (error) {
    console.log('[推荐] 搜索歌曲失败:', searchText, error)
    return null
  }
}

/**
 * 获取推荐歌曲
 * @param onError 错误回调
 * @param onProgress 进度回调
 * @returns 推荐歌曲列表
 */
export const fetchRecommendations = async(
  onError?: (error: string) => void,
  onProgress?: (status: string) => void
): Promise<LX.Music.MusicInfoOnline[]> => {
  const apiHost = settingState.setting['recommend.apiHost']
  const apiKey = settingState.setting['recommend.apiKey']
  const model = settingState.setting['recommend.model']
  const analyzeCount = settingState.setting['recommend.analyzeCount']
  const recommendCount = settingState.setting['recommend.recommendCount']
  const extraPrompt = settingState.setting['recommend.extraPrompt']

  // 检查 API 配置
  if (!apiHost || !apiKey) {
    const errorMsg = '请先在设置中配置 API 地址和密钥'
    onError?.(errorMsg)
    throw new Error(errorMsg)
  }

  try {
    // 1. 获取用户歌单
    onProgress?.('分析歌单中...')
    const musicList = await getUserMusicList(analyzeCount)

    // 2. 构建提示词
    const prompt = buildPrompt(musicList, recommendCount, extraPrompt)

    // 3. 调用 AI API 获取推荐
    onProgress?.('获取 AI 推荐中...')
    const { songs: recommendedSongs, response } = await callRecommendAPI(apiHost, apiKey, model, prompt, recommendCount)

    // 4. 记录 AI 日志
    addAILog({
      model,
      prompt,
      response,
      requestSongs: musicList,
      recommendedSongs: recommendedSongs.map(s => `${s.name} - ${s.singer}${s.source ? ` [${s.source}]` : ''}`),
    })

    // 5. 获取现有歌曲 ID 用于去重
    const existingIds = getCurrentMusicIds()
    const searchedSongs = new Set<string>()
    const result: LX.Music.MusicInfoOnline[] = []

    // 6. 搜索推荐歌曲
    onProgress?.('搜索推荐歌曲中...')
    for (const song of recommendedSongs) {
      // 去重检查
      const songKey = `${song.name} - ${song.singer}`.toLowerCase()
      if (searchedSongs.has(songKey)) {
        continue
      }

      // 搜索歌曲
      const musicInfo = await searchRecommendSong(song)

      if (musicInfo) {
        // 检查是否已在用户歌单中
        if (!existingIds.has(musicInfo.id)) {
          result.push(musicInfo)
          searchedSongs.add(songKey)

          // 达到推荐数量后停止
          if (result.length >= recommendCount) {
            break
          }
        } else {
          console.log(`[推荐] 歌曲已存在于歌单中: ${song.name} - ${song.singer}`)
        }
      }
    }

    console.log(`[推荐] 最终找到 ${result.length} 首歌曲`)
    return result
  } catch (error: any) {
    const errorMsg = error.message || '获取推荐失败'
    onError?.(errorMsg)
    throw error
  }
}