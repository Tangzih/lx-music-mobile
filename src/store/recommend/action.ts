import recommendState from './state'
import { setTempList } from '@/core/list'
import { fetchRecommendations } from '@/core/recommend'

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

    // 2. 设置临时列表
    if (recommendations.length > 0) {
      await setTempList('recommend', recommendations)
      setRecommendList(recommendations)
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
  clearRecommendList,
}
