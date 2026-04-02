import recommendState from './state'
import { fetchRecommendations as fetchRecommendationsCore } from '@/core/recommend'
import { addAILog } from './logAction'
import settingState from '@/store/setting/state'
import playerState from '@/store/player/state'
import { saveData, getData, removeData } from '@/plugins/storage'
import { saveListMusics, getListMusics } from '@/utils/data'
import { LIST_IDS } from '@/config/constant'
import { allMusicList } from '@/utils/listManage'

// 存储key
const STORAGE_KEY_RECOMMEND_LIST = 'recommend_list'
const STORAGE_KEY_LAST_CLEAR_TIME = 'recommend_last_clear_time'

/**
 * 设置推荐歌曲列表
 */
const setRecommendList = (list: LX.Music.MusicInfoOnline[]) => {
  recommendState.recommendList = list
  global.state_event.recommendListUpdated(list)
}

/**
 * 保存推荐列表到本地存储（使用和"我的列表"相同的机制）
 * 同时更新内存中的 allMusicList
 */
const saveRecommendListToStorage = async(list: LX.Music.MusicInfoOnline[]) => {
  try {
    // 保存到专用存储（用于显示）
    await saveData(STORAGE_KEY_RECOMMEND_LIST, list)
    // 同时保存到 allMusicList 存储系统（用于播放器读取）
    await saveListMusics([{ id: LIST_IDS.RECOMMEND, musics: list }])
    // 更新内存中的 allMusicList（播放器从这里读取）
    allMusicList.set(LIST_IDS.RECOMMEND, list)
  } catch (e) {
    console.error('[推荐] 保存推荐列表失败:', e)
  }
}

/**
 * 从本地存储加载推荐列表
 * 同时更新内存中的 allMusicList
 */
const loadRecommendListFromStorage = async(): Promise<LX.Music.MusicInfoOnline[]> => {
  try {
    // 优先从 allMusicList 存储系统加载（和"我的列表"一致）
    const list = await getListMusics(LIST_IDS.RECOMMEND)
    if (list && list.length > 0) {
      // 更新内存中的 allMusicList（播放器从这里读取）
      allMusicList.set(LIST_IDS.RECOMMEND, list)
      return list as LX.Music.MusicInfoOnline[]
    }
    // 兼容旧数据：从专用存储加载
    const legacyList = await getData<LX.Music.MusicInfoOnline[]>(STORAGE_KEY_RECOMMEND_LIST)
    if (legacyList && legacyList.length > 0) {
      // 更新内存中的 allMusicList
      allMusicList.set(LIST_IDS.RECOMMEND, legacyList)
    }
    return legacyList || []
  } catch (e) {
    console.error('[推荐] 加载推荐列表失败:', e)
    return []
  }
}

/**
 * 保存上次清空时间到本地存储
 */
const saveLastClearTimeToStorage = async(time: number) => {
  try {
    await saveData(STORAGE_KEY_LAST_CLEAR_TIME, time)
  } catch (e) {
    console.error('[推荐] 保存清空时间失败:', e)
  }
}

/**
 * 从本地存储加载上次清空时间
 */
const loadLastClearTimeFromStorage = async(): Promise<number> => {
  try {
    const time = await getData<number>(STORAGE_KEY_LAST_CLEAR_TIME)
    return time || 0
  } catch (e) {
    console.error('[推荐] 加载清空时间失败:', e)
    return 0
  }
}

/**
 * 刷新定时清空计时器的起始时间
 */
const refreshLastClearTime = () => {
  const now = Date.now()
  recommendState.lastClearTime = now
  saveLastClearTimeToStorage(now).catch((err) => {
    console.error('[推荐] 保存清空时间失败:', err)
  })
}

/**
 * 初始化推荐列表（应用启动时调用）
 */
const initRecommendList = async() => {
  // 加载推荐列表（使用和"我的列表"相同的方式）
  const list = await loadRecommendListFromStorage()
  setRecommendList(list)

  // 加载上次清空时间
  const lastClearTime = await loadLastClearTimeFromStorage()
  recommendState.lastClearTime = lastClearTime

  // 检查是否需要自动清空
  checkAutoClear()

  // 监听音乐播放事件，如果播放的是推荐列表的歌曲，重置定时清空的计时时间（从最后一次播放开始算）
  global.state_event.on('playMusicInfoChanged', (playMusicInfo) => {
    if (playMusicInfo && playMusicInfo.listId === LIST_IDS.RECOMMEND) {
      refreshLastClearTime()
    }
  })

  // 监听设置修改事件，如果在设置里更改了定时清理时间开关/时长，也重新开始计时
  global.state_event.on('configUpdated', (keys, settings) => {
    if (keys.includes('recommend.autoClear') || keys.includes('recommend.autoClearHours')) {
      refreshLastClearTime()
    }
  })
}

/**
 * 检查是否需要自动清空（只在应用启动时调用）
 * 注意：如果用户正在播放推荐列表的歌曲，不清空
 */
const checkAutoClear = async() => {
  const autoClear = settingState.setting['recommend.autoClear']
  const autoClearHours = settingState.setting['recommend.autoClearHours']

  // 如果未启用自动清空或时间为 0，不处理
  if (!autoClear || autoClearHours <= 0) return

  // 如果用户正在播放推荐列表的歌曲，不清空（避免打断播放）
  if (playerState.playMusicInfo.listId === LIST_IDS.RECOMMEND && recommendState.recommendList.length > 0) {
    console.log('[推荐] 用户正在播放推荐列表，跳过自动清空')
    return
  }

  const now = Date.now()
  let lastClearTime = recommendState.lastClearTime
  if (!lastClearTime) {
    // 兼容刚升级/初次打开：如果内存中时间缺失，就以此时作为起点并将其持久化，否则每次打开算出的过去小时间永远是0
    lastClearTime = now
    recommendState.lastClearTime = now
    await saveLastClearTimeToStorage(now)
  }
  const hoursPassed = (now - lastClearTime) / (1000 * 60 * 60)

  // 如果超过设定时间，清空推荐列表
  if (hoursPassed >= autoClearHours) {
    console.log(`[推荐] 距离上次清空已${hoursPassed.toFixed(1)}小时，超过设定值${autoClearHours}小时，清空推荐列表`)
    await clearRecommendList()
  }
}

/**
 * 设置加载状态
 */
const setIsLoading = (isLoading: boolean) => {
  recommendState.isLoading = isLoading
  global.state_event.recommendLoadingUpdated(isLoading)
}

/**
 * 设置 AbortController
 */
const setAbortController = (controller: AbortController | null) => {
  recommendState.abortController = controller
}

/**
 * 取消推荐请求
 */
const cancelRecommendations = () => {
  if (recommendState.abortController) {
    recommendState.abortController.abort()
    setAbortController(null)
  }
  setIsLoading(false)
  setProgress('')
}

/**
 * 设置错误信息
 */
const setError = (error: string | null) => {
  recommendState.error = error
  global.state_event.recommendErrorUpdated(error)
}

/**
 * 设置进度状态
 */
const setProgress = (progress: string) => {
  recommendState.progress = progress
  global.state_event.recommendProgressUpdated(progress)
}

/**
 * 获取推荐歌曲
 */
const getRecommendations = async(): Promise<void> => {
  // 如果已经在加载中，先取消之前的请求
  if (recommendState.abortController) {
    recommendState.abortController.abort()
  }

  // 创建新的 AbortController
  const abortController = new AbortController()
  setAbortController(abortController)
  setIsLoading(true)
  setError(null)

  try {
    // 1. 获取推荐歌曲（传入当前推荐列表和日志回调）
    const recommendations = await fetchRecommendationsCore(
      recommendState.recommendList, // 传入当前推荐列表
      (log) => addAILog(log), // 日志回调
      (error) => setError(error),
      (status) => setProgress(status),
      abortController.signal
    )

    // 2. 追加到现有列表
    if (recommendations.length > 0) {
      const currentList = recommendState.recommendList
      const currentIds = new Set(currentList.map(m => m.id))

      // 过滤掉已存在的歌曲
      const newSongs = recommendations.filter(m => !currentIds.has(m.id))

      if (newSongs.length > 0) {
        const newList = [...currentList, ...newSongs]
        setRecommendList(newList)
        // 保存到本地存储（使用和"我的列表"相同的机制）
        await saveRecommendListToStorage(newList)
      }
      setProgress('')
    } else {
      // 如果已有推荐列表，不清空，只显示提示
      if (recommendState.recommendList.length === 0) {
        setError('未找到推荐的歌曲')
      }
      setProgress('')
    }
  } catch (error: any) {
    // 如果是用户取消，不显示错误
    if (error.name === 'AbortError') {
      console.log('[推荐] 用户取消推荐请求')
    } else {
      // 如果已有列表，用 toast 显示错误（在父组件处理）
      if (recommendState.recommendList.length === 0) {
        setError(error.message || '获取推荐失败')
      }
    }
    setProgress('')
  } finally {
    setIsLoading(false)
    setAbortController(null)
  }
}

/**
 * 追加推荐歌曲到列表末尾
 */
const appendRecommendations = async(): Promise<void> => {
  setIsLoading(true)
  setError(null)

  try {
    // 1. 获取推荐歌曲（传入当前推荐列表和日志回调）
    const recommendations = await fetchRecommendationsCore(
      recommendState.recommendList, // 传入当前推荐列表
      (log) => addAILog(log), // 日志回调
      (error) => setError(error),
      (status) => setProgress(status)
    )

    // 2. 追加到推荐列表
    if (recommendations.length > 0) {
      const currentList = recommendState.recommendList
      const currentIds = new Set(currentList.map(m => m.id))

      // 过滤掉已存在的歌曲
      const newSongs = recommendations.filter(m => !currentIds.has(m.id))

      if (newSongs.length > 0) {
        const newList = [...currentList, ...newSongs]
        setRecommendList(newList)
        // 保存到本地存储（使用和"我的列表"相同的机制）
        await saveRecommendListToStorage(newList)
      }
      setProgress('')
    } else {
      setError('未找到推荐的歌曲')
      setProgress('')
    }
  } catch (error: any) {
    setError(error.message || '获取推荐失败')
    setProgress('')
  } finally {
    setIsLoading(false)
  }
}

/**
 * 检查是否需要持续推荐
 * 当播放到推荐列表最后一首时自动追加新歌曲
 */
const checkContinuousRecommend = async() => {
  // 检查是否启用持续推荐
  if (!settingState.setting['recommend.continuousRecommend']) return

  // 检查是否正在播放推荐列表
  if (playerState.playMusicInfo.listId !== LIST_IDS.RECOMMEND) return

  // 检查是否正在加载
  if (recommendState.isLoading) return

  // 获取当前播放索引和列表长度
  const currentIndex = playerState.playInfo.playIndex
  const listLength = recommendState.recommendList.length

  // 如果列表为空，不处理
  if (listLength === 0) return

  // 当播放到倒数第二首时开始获取新推荐
  // 这样可以确保在播放到最后一首时新歌曲已经准备好
  if (currentIndex >= listLength - 2) {
    await appendRecommendations()
  }
}

/**
 * 清空推荐列表
 */
const clearRecommendList = async() => {
  setRecommendList([])
  setError(null)
  setProgress('')
  // 清空本地存储
  await removeData(STORAGE_KEY_RECOMMEND_LIST)
  // 同时清空 allMusicList 中的数据
  await saveListMusics([{ id: LIST_IDS.RECOMMEND, musics: [] }])
  // 从内存中的 allMusicList 删除
  allMusicList.delete(LIST_IDS.RECOMMEND)
  // 更新清空时间
  const now = Date.now()
  recommendState.lastClearTime = now
  await saveLastClearTimeToStorage(now)
}

/**
 * 从推荐列表移除歌曲
 */
const removeSongsFromList = async(ids: string[]) => {
  const newList = recommendState.recommendList.filter(m => !ids.includes(m.id))
  setRecommendList(newList)
  // 更新本地存储
  await saveRecommendListToStorage(newList)
}

export default {
  setRecommendList,
  setIsLoading,
  setError,
  setProgress,
  getRecommendations,
  appendRecommendations,
  checkContinuousRecommend,
  clearRecommendList,
  initRecommendList,
  removeSongsFromList,
  cancelRecommendations,
}