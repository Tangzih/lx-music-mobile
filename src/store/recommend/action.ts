import recommendState from './state'
import { setTempList, addListMusics } from '@/core/list'
import { fetchRecommendations } from '@/core/recommend'
import settingState from '@/store/setting/state'
import playerState from '@/store/player/state'

/**
 * 设置推荐歌曲列表
 */
const setRecommendList = (list: LX.Music.MusicInfoOnline[]) => {
  recommendState.recommendList = list
  global.state_event.recommendListUpdated(list)
}

/**
 * 设置加载状态
 */
const setIsLoading = (isLoading: boolean) => {
  recommendState.isLoading = isLoading
  global.state_event.recommendLoadingUpdated(isLoading)
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
  setIsLoading(true)
  setError(null)

  try {
    // 1. 获取推荐歌曲
    const recommendations = await fetchRecommendations(
      (error) => setError(error),
      (status) => setProgress(status)
    )

    // 2. 追加到现有列表
    if (recommendations.length > 0) {
      const currentList = recommendState.recommendList
      const currentIds = new Set(currentList.map(m => m.id))

      // 过滤掉已存在的歌曲
      const newSongs = recommendations.filter(m => !currentIds.has(m.id))

      if (newSongs.length > 0) {
        const newList = [...currentList, ...newSongs]
        await setTempList('recommend', newList)
        setRecommendList(newList)
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
    // 如果已有列表，用toast显示错误（在父组件处理）
    if (recommendState.recommendList.length === 0) {
      setError(error.message || '获取推荐失败')
    }
    setProgress('')
  } finally {
    setIsLoading(false)
  }
}

/**
 * 追加推荐歌曲到列表末尾
 */
const appendRecommendations = async(): Promise<void> => {
  setIsLoading(true)
  setError(null)

  try {
    // 1. 获取推荐歌曲
    const recommendations = await fetchRecommendations(
      (error) => setError(error),
      (status) => setProgress(status)
    )

    // 2. 追加到临时列表
    if (recommendations.length > 0) {
      const currentList = recommendState.recommendList
      const currentIds = new Set(currentList.map(m => m.id))

      // 过滤掉已存在的歌曲
      const newSongs = recommendations.filter(m => !currentIds.has(m.id))

      if (newSongs.length > 0) {
        const newList = [...currentList, ...newSongs]
        await addListMusics('temp', newSongs, 'bottom')
        setRecommendList(newList)
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

  // 检查是否正在播放推荐列表（临时列表）
  if (playerState.playMusicInfo.listId !== 'temp') return

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
const clearRecommendList = () => {
  setRecommendList([])
  setError(null)
  setProgress('')
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
}