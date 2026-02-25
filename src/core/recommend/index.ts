/**
 * 推荐歌曲核心逻辑
 */

import { callRecommendAPI } from './api'
import settingState from '@/store/setting/state'
import listState from '@/store/list/state'
import { getListMusics } from '@/utils/listManage'
import { search } from '@/core/search/music'

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
 * @returns 提示词
 */
export const buildPrompt = (musicList: string[], recommendCount: number): string => {
  if (musicList.length === 0) {
    return '用户歌单为空，请随机推荐一些热门歌曲。'
  }

  return `用户常听的歌曲：
${musicList.map((song, index) => `${index + 1}. ${song}`).join('\n')}

请分析这些歌曲，推测用户的音乐喜好，并推荐${recommendCount}首可能喜欢的新歌曲。`
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
 * 搜索推荐歌曲
 * @param songName 歌曲名（格式：歌曲名 - 歌手）
 * @returns 搜索到的歌曲信息，未找到返回 null
 */
export const searchRecommendSong = async(songName: string): Promise<LX.Music.MusicInfoOnline | null> => {
  try {
    // 解析歌曲名和歌手
    const parts = songName.split(' - ')
    const searchText = parts[0]?.trim() || songName.trim()

    if (!searchText) {
      return null
    }

    // 使用聚合搜索
    const results = await search(searchText, 1, 'all')

    if (results && results.length > 0) {
      // 返回第一首匹配的歌曲
      return results[0]
    }

    return null
  } catch (error) {
    console.log('搜索推荐歌曲失败:', songName, error)
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
  const analyzeCount = settingState.setting['recommend.analyzeCount']
  const recommendCount = settingState.setting['recommend.recommendCount']

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
    const prompt = buildPrompt(musicList, recommendCount)

    // 3. 调用 AI API 获取推荐
    onProgress?.('获取 AI 推荐中...')
    const recommendedSongs = await callRecommendAPI(apiHost, apiKey, prompt, recommendCount)

    // 4. 获取现有歌曲 ID 用于去重
    const existingIds = getCurrentMusicIds()
    const searchedSongs = new Set<string>()
    const result: LX.Music.MusicInfoOnline[] = []

    // 5. 搜索推荐歌曲
    onProgress?.('搜索推荐歌曲中...')
    for (const songName of recommendedSongs) {
      // 去重检查
      if (isSongExists(songName, existingIds, searchedSongs)) {
        continue
      }

      // 搜索歌曲
      const musicInfo = await searchRecommendSong(songName)

      if (musicInfo) {
        result.push(musicInfo)
        searchedSongs.add(songName.toLowerCase())

        // 达到推荐数量后停止
        if (result.length >= recommendCount) {
          break
        }
      }
    }

    return result
  } catch (error: any) {
    const errorMsg = error.message || '获取推荐失败'
    onError?.(errorMsg)
    throw error
  }
}
