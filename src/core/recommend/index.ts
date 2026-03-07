/**
 * 推荐歌曲核心逻辑
 */

import { callRecommendAPI, type RecommendSong } from './api'
import settingState from '@/store/setting/state'
import { allMusicList, userLists, getListMusics } from '@/utils/listManage'
import recommendState from '@/store/recommend/state'
import { search } from '@/core/search/music'
import { addAILog } from '@/store/recommend/logAction'
import musicSdk from '@/utils/musicSdk'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'

// 支持的音源平台
const VALID_SOURCES: LX.OnlineSource[] = ['kw', 'kg', 'tx', 'wy', 'mg']

/**
 * 估算文本的token数量（简化算法：中文约1.5字符/token，英文约4字符/token）
 * @param text 要估算的文本
 * @returns 估算的token数量
 */
const estimateTokens = (text: string): number => {
  if (!text) return 0
  // 统计中文字符数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  // 非中文字符数
  const nonChineseChars = text.length - chineseChars
  // 中文约1.5字符/token，英文约4字符/token
  return Math.ceil(chineseChars / 1.5 + nonChineseChars / 4)
}

/**
 * 预加载所有歌单数据
 * 确保网络歌单等延迟加载的列表在分析前已加载
 */
const preloadAllListData = async() => {
  console.log('[推荐] 开始预加载歌单数据...')

  // 获取所有需要加载的歌单ID
  const listIds: string[] = []

  // 添加收藏列表
  listIds.push(LIST_IDS.LOVE)

  // 添加所有用户自定义歌单
  for (const list of userLists) {
    listIds.push(list.id)
  }

  // 同时从 listState.allList 获取（确保不遗漏）
  for (const list of listState.allList) {
    if (!listIds.includes(list.id)) {
      listIds.push(list.id)
    }
  }

  console.log('[推荐] 需要预加载的歌单数量:', listIds.length)

  // 并行加载所有歌单
  await Promise.all(listIds.map(listId => getListMusics(listId)))

  console.log('[推荐] 歌单数据预加载完成, allMusicList size:', allMusicList.size)
}

/**
 * 获取用户歌单中的歌曲（简单模式：仅歌曲名和歌手信息）
 * @param analyzeCount 单次分析歌曲数量
 * @returns 歌曲信息字符串数组
 */
export const getUserMusicList = async(analyzeCount: number): Promise<string[]> => {
  // 先预加载所有歌单数据
  await preloadAllListData()

  const musicStrings: string[] = []

  console.log('[推荐] allMusicList size:', allMusicList.size)

  // 遍历所有列表收集歌曲
  allMusicList.forEach((musics, listId) => {
    // 跳过临时列表、试听列表和推荐列表，只保留自定义歌单和收藏列表
    if (listId === LIST_IDS.TEMP || listId === LIST_IDS.DEFAULT || listId === LIST_IDS.RECOMMEND) return

    console.log('[推荐] listId:', listId, 'musics count:', musics?.length || 0)

    if (musics && musics.length > 0) {
      for (const music of musics) {
        musicStrings.push(`${music.name} - ${music.singer}`)
      }
    }
  })

  console.log('[推荐] 收集到的歌曲数:', musicStrings.length)

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
  const musicIds = new Set<string>()

  allMusicList.forEach((musics, listId) => {
    // 跳过临时列表、试听列表、收藏列表和推荐列表，只保留自定义歌单
    if (listId === LIST_IDS.TEMP || listId === LIST_IDS.DEFAULT || listId === LIST_IDS.LOVE || listId === LIST_IDS.RECOMMEND) return

    for (const music of musics) {
      musicIds.add(music.id)
    }
  })

  return musicIds
}

/**
 * 获取推荐列表中已有的歌曲ID（用于追加推荐时去重）
 * @returns 歌曲 ID 集合
 */
export const getRecommendedMusicIds = (): Set<string> => {
  const ids = new Set<string>()
  for (const music of recommendState.recommendList) {
    ids.add(music.id)
  }
  return ids
}

/**
 * 构建 AI 提示词
 * @param musicList 歌曲列表
 * @param recommendCount 推荐数量
 * @param extraPrompt 附加提示词
 * @param existedSongs 已存在推荐列表的歌曲（用于排除重复）
 * @param failedSearchSongs 搜索失败的歌曲（用于告知AI这些找不到了）
 * @param maxTokens 最大token限制
 * @returns 提示词和token警告
 */
export const buildPrompt = (
  musicList: string[],
  recommendCount: number,
  extraPrompt?: string,
  existedSongs?: Set<string>,
  failedSearchSongs?: Set<string>,
  maxTokens?: number
): { prompt: string; tokenWarning?: string } => {
  let prompt: string
  let tokenWarning: string | undefined

  // 获取已推荐的歌曲（全部）
  const recommendedSongs = recommendState.recommendList
    .map(m => `${m.name} - ${m.singer}`)

  if (musicList.length === 0) {
    prompt = '用户歌单为空，请随机推荐一些热门歌曲。'
  } else {
    prompt = `用户常听的歌曲：
${musicList.map((song, index) => `${index + 1}. ${song}`).join('\n')}

请分析这些歌曲，推测用户的音乐喜好，并推荐${recommendCount}首可能喜欢的新歌曲。`
  }

  // 添加已推荐歌曲信息，避免重复
  if (recommendedSongs.length > 0) {
    prompt += `

注意：以下歌曲已经推荐过，请不要重复推荐：
已推荐歌曲：
${recommendedSongs.map((song, index) => `${index + 1}. ${song}`).join('\n')}`
  }

  // 添加已存在推荐列表的歌曲信息（用于排除重复）
  if (existedSongs && existedSongs.size > 0) {
    const existedList = Array.from(existedSongs).slice(-100) // 最多100首
    prompt += `

注意：以下歌曲已经存在于推荐列表中，请推荐其他歌曲：
${existedList.map((song, index) => `${index + 1}. ${song}`).join('\n')}`
  }

  // 添加搜索失败的歌曲信息（告知AI这些找不到了）
  if (failedSearchSongs && failedSearchSongs.size > 0) {
    const failedList = Array.from(failedSearchSongs).slice(-100) // 最多100首
    prompt += `

特别注意：以下歌曲已被尝试搜索但未能找到资源，请避免再次推荐这些具体歌曲：
${failedList.map((song, index) => `${index + 1}. ${song}`).join('\n')}`
  }

  // 添加附加提示词
  if (extraPrompt && extraPrompt.trim()) {
    prompt += `\n\n附加要求：${extraPrompt.trim()}`

    // 如果用户指定了特定要求，强调必须达到推荐数量
    prompt += `\n\n重要：必须推荐满${recommendCount}首歌曲。如果指定的歌手/风格歌曲不足，请推荐风格相似的其他歌曲。`
  }

  // Token限制检查和调整
  if (maxTokens) {
    const reservedForResponse = 500
    const availableTokens = maxTokens - reservedForResponse
    let currentTokens = estimateTokens(prompt)

    // 如果超出token限制，减少已推荐歌曲数量
    if (currentTokens > availableTokens && recommendedSongs.length > 0) {
      // 计算需要保留的已推荐歌曲数量
      const basePromptWithoutRecommended = prompt.split('注意：以下歌曲已经推荐过')[0]
      const baseTokens = estimateTokens(basePromptWithoutRecommended)
      const tokensForRecommended = availableTokens - baseTokens

      // 每首歌曲约20-30 tokens
      const maxRecommendedSongs = Math.floor(tokensForRecommended / 25)

      if (maxRecommendedSongs < recommendedSongs.length && maxRecommendedSongs > 0) {
        tokenWarning = `已推荐歌曲数量过多，仅保留最近${maxRecommendedSongs}首以避免超出token限制`

        // 重新构建提示词
        prompt = prompt.replace(
          /已推荐歌曲：[\s\S]*?(?=\n\n注意：以下歌曲已经尝试过|$)/,
          `已推荐歌曲：\n${recommendedSongs.slice(-maxRecommendedSongs).map((song, index) => `${index + 1}. ${song}`).join('\n')}`
        )
      } else if (maxRecommendedSongs <= 0) {
        tokenWarning = '提示词过长，已省略已推荐歌曲列表'
        // 移除已推荐歌曲部分
        prompt = prompt.replace(/注意：以下歌曲已经推荐过[\s\S]*?(?=\n\n注意：以下歌曲已经尝试过|$)/, '')
      }
    }
  }

  return { prompt, tokenWarning }
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
 * 计算两个字符串的相似度
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 相似度（0-1之间的数值，1表示完全相同）
 */
const calculateNameSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  // 完全匹配
  if (s1 === s2) return 1.0

  // 长度差异过大则相似度很低
  const lenDiff = Math.abs(s1.length - s2.length) / Math.max(s1.length, s2.length)
  if (lenDiff > 0.5) return 0 // 长度相差超过一半，直接返回0

  // 使用最长公共子序列算法计算相似度
  const lcsLength = longestCommonSubsequence(s1, s2)
  const similarity = (2 * lcsLength) / (s1.length + s2.length)

  return similarity
}

/**
 * 计算两个字符串的最长公共子序列长度
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 最长公共子序列长度
 */
const longestCommonSubsequence = (str1: string, str2: string): number => {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp[m][n]
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
 * 搜索推荐歌曲（带重试和降级机制）
 * @param song AI 推荐的歌曲信息
 * @param retryCount 重试次数（默认 0）
 * @returns 搜索到的歌曲信息，未找到返回 null
 */
export const searchRecommendSong = async(song: RecommendSong, retryCount = 0): Promise<LX.Music.MusicInfoOnline | null> => {
  const { name, singer, source: aiSource, album } = song

  if (!name) {
    console.log('[推荐] 歌曲名为空，跳过')
    return null
  }

  // 验证 AI 返回的音源
  const preferSource = validateSource(aiSource)

  // 构建搜索关键词：歌曲名 + 歌手
  const searchText = singer ? `${name} ${singer}` : name

  try {
    // 如果 AI 指定了有效平台，优先在该平台搜索（带重试）
    if (preferSource) {
      let preferSourceResults = await search(searchText, 1, preferSource)

      // 如果第一次搜索无结果且还有重试次数，重试
      if ((!preferSourceResults || preferSourceResults.length === 0) && retryCount < 2) {
        console.log(`[推荐] 在 ${preferSource} 首次搜索无结果，准备重试`)
        await new Promise(resolve => setTimeout(resolve, 300))
        preferSourceResults = await search(searchText, 1, preferSource)
        retryCount++
      }

      if (preferSourceResults && preferSourceResults.length > 0) {
        // 如果有歌手名，验证匹配度
        if (singer) {
          const matched = preferSourceResults.find(r => matchSinger(r.singer, singer))
          if (matched) {
            console.log(`[推荐] 在 ${preferSource} 找到匹配歌曲: ${matched.name} - ${matched.singer}`)
            return matched
          }
          // 没有精确匹配歌手，降级到聚合搜索
          console.log(`[推荐] 在 ${preferSource} 未精确匹配歌手，降级到聚合搜索`)
        } else {
          // 没有歌手信息时，检查歌曲名相似度
          const nameSimilarity = calculateNameSimilarity(preferSourceResults[0].name, name)
          if (nameSimilarity > 0.7) {
            console.log(`[推荐] 在 ${preferSource} 找到歌曲（名称相似）: ${preferSourceResults[0].name} - ${preferSourceResults[0].singer}`)
            return preferSourceResults[0]
          }
          // 名称不匹配，降级到聚合搜索
          console.log(`[推荐] 在 ${preferSource} 歌曲名不匹配，降级到聚合搜索`)
        }
      } else {
        // 指定平台无结果，降级到聚合搜索
        console.log(`[推荐] 在 ${preferSource} 未找到歌曲，降级到聚合搜索`)
      }
    }

    // 聚合搜索（带重试）
    let results = await search(searchText, 20, 'all')

    // 如果第一次聚合搜索无结果且还有重试次数，重试
    if ((!results || results.length === 0) && retryCount < 2) {
      console.log(`[推荐] 聚合搜索首次无结果，准备重试`)
      await new Promise(resolve => setTimeout(resolve, 300))
      results = await search(searchText, 20, 'all')
      retryCount++
    }

    if (!results || results.length === 0) {
      console.log(`[推荐] 聚合搜索重试后仍无结果: ${searchText}`)
      return null
    }

    // 智能匹配搜索结果
    if (singer) {
      // 优先精确匹配歌手和歌曲名
      const exactMatch = results.find(result =>
        matchSinger(result.singer, singer) &&
        result.name.toLowerCase().includes(name.toLowerCase())
      )
      if (exactMatch) {
        console.log(`[推荐] 聚合搜索找到精确匹配: ${exactMatch.name} - ${exactMatch.singer} [${exactMatch.source}]`)
        return exactMatch
      }

      // 次之匹配歌手，歌曲名相似（小范围模糊匹配）
      const singerMatch = results.find(result => {
        if (matchSinger(result.singer, singer)) {
          // 检查歌曲名是否相似（长度相近且有一定字符重叠）
          const nameSimilarity = calculateNameSimilarity(result.name, name)
          return nameSimilarity > 0.6 // 至少60%相似度
        }
        return false
      })
      if (singerMatch) {
        console.log(`[推荐] 聚合搜索歌手匹配，歌曲名相似: ${singerMatch.name} - ${singerMatch.singer} [${singerMatch.source}]`)
        return singerMatch
      }

      // 再次匹配歌曲名，忽略歌手（可能是AI识别错误），并使用小范围模糊匹配
      const nameMatch = results.find(result => {
        const nameSimilarity = calculateNameSimilarity(result.name, name)
        return nameSimilarity > 0.7 // 更高的相似度要求
      })
      if (nameMatch) {
        console.log(`[推荐] 聚合搜索歌曲名模糊匹配: ${nameMatch.name} - ${nameMatch.singer} [${nameMatch.source}]`)
        return nameMatch
      }

      // 如果有专辑名，尝试匹配专辑（使用字符串相似度）
      if (album) {
        const albumMatch = results.find(result => {
          if (result.meta.albumName) {
            // 使用字符串相似度匹配专辑名
            const albumSimilarity = calculateNameSimilarity(result.meta.albumName, album)
            return albumSimilarity > 0.6 // 至少60%相似度
          }
          return false
        })
        if (albumMatch) {
          console.log(`[推荐] 聚合搜索专辑匹配: ${albumMatch.name} - ${albumMatch.singer} [${albumMatch.source}]`)
          return albumMatch
        }
      }
    } else {
      // 没有歌手信息时，主要匹配歌曲名（使用小范围模糊匹配）
      const nameMatch = results.find(result => {
        const nameSimilarity = calculateNameSimilarity(result.name, name)
        return nameSimilarity > 0.7
      })
      if (nameMatch) {
        console.log(`[推荐] 聚合搜索歌曲名匹配: ${nameMatch.name} - ${nameMatch.singer} [${nameMatch.source}]`)
        return nameMatch
      }
    }

    // 如果没有找到合适的匹配，返回null表示搜索失败
    console.log(`[推荐] 未找到匹配的歌曲: ${name} - ${singer || '未知歌手'}`)
    return null
  } catch (error) {
    console.log('[推荐] 搜索歌曲失败:', searchText, error)
    // 异常情况下，如果还有重试次数，重试
    if (retryCount < 2) {
      console.log(`[推荐] 搜索异常，准备重试`)
      await new Promise(resolve => setTimeout(resolve, 300))
      return searchRecommendSong(song, retryCount + 1)
    }
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
  const maxRetries = settingState.setting['recommend.maxRetries']
  const maxTokens = settingState.setting['recommend.maxTokens']

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

    console.log('[推荐] 分析歌曲数量:', musicList.length)

    // 2. 获取推荐列表中已有的歌曲 ID 用于去重（只过滤推荐列表中的重复）
    const recommendedIds = getRecommendedMusicIds()
    const searchedSongs = new Set<string>() // 已搜索过的歌曲（避免重复搜索）
    const triedSongs = new Set<string>() // 已尝试推荐的歌曲（用于补充推荐时排除）
    const result: LX.Music.MusicInfoOnline[] = []

    // 3. 循环获取推荐直到达到目标数量
    let attempt = 0
    let tokenWarningShown = false
    const existedSongs = new Set<string>() // 已存在于推荐列表的歌曲
    const failedSearchSongs = new Set<string>() // 搜索失败的歌曲

    while (result.length < recommendCount && attempt < maxRetries) {
      attempt++

      // 计算还需要多少首
      const needCount = recommendCount - result.length

      // 构建提示词（包含已存在的歌曲和搜索失败的歌曲信息）
      const { prompt, tokenWarning } = buildPrompt(musicList, needCount, extraPrompt, existedSongs, failedSearchSongs, maxTokens)

      // 显示token警告（只显示一次）
      if (tokenWarning && !tokenWarningShown) {
        console.log('[推荐] Token警告:', tokenWarning)
        tokenWarningShown = true
      }

      // 调用 AI API 获取推荐
      onProgress?.(`获取 AI 推荐中... (第${attempt}次，还需${needCount}首)`)
      const { songs: recommendedSongs, response } = await callRecommendAPI(apiHost, apiKey, model, prompt, needCount)

      // 记录 AI 日志（每次重试都记录）
      addAILog({
        model,
        prompt,
        response,
        requestSongs: musicList,
        recommendedSongs: recommendedSongs.map(s => `${s.name} - ${s.singer}${s.source ? ` [${s.source}]` : ''}`),
        existedSongs: Array.from(existedSongs), // 已存在于推荐列表的歌曲
        failedSearchSongs: Array.from(failedSearchSongs), // 搜索失败的歌曲
        attempt, // 记录当前是第几次尝试
      })

      // 搜索推荐歌曲
      onProgress?.('搜索推荐歌曲中...')
      let foundInThisRound = 0
      let searchFailedCount = 0
      let duplicateCount = 0

      for (const song of recommendedSongs) {
        const songKey = `${song.name} - ${song.singer}`.toLowerCase()

        // 去重检查（避免重复搜索）
        if (searchedSongs.has(songKey)) {
          duplicateCount++
          continue
        }

        // 搜索歌曲
        const musicInfo = await searchRecommendSong(song)

        if (musicInfo) {
          // 检查是否已在推荐列表中
          if (!recommendedIds.has(musicInfo.id)) {
            result.push(musicInfo)
            searchedSongs.add(songKey)
            recommendedIds.add(musicInfo.id) // 添加到已存在集合，防止本次推荐重复
            existedSongs.add(songKey) // 添加到已存在推荐列表的歌曲集合
            foundInThisRound++
          } else {
            console.log(`[推荐] 歌曲已在推荐列表中: ${song.name} - ${song.singer}`)
            duplicateCount++
          }
        } else {
          console.log(`[推荐] 搜索失败: ${song.name} - ${song.singer}`)
          failedSearchSongs.add(songKey) // 添加到搜索失败的歌曲集合
          searchFailedCount++
        }
        // 不再提前 break，处理完所有 AI 返回的歌曲
      }

      console.log(`[推荐] 第${attempt}次尝试: AI返回${recommendedSongs.length}首, 找到${foundInThisRound}首, 搜索失败${searchFailedCount}首, 重复${duplicateCount}首, 当前共${result.length}首`)

      // 如果这轮没找到任何新歌曲，说明AI可能已经无法提供更多了
      if (foundInThisRound === 0) {
        console.log('[推荐] 本轮未找到新歌曲，停止尝试')
        break
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