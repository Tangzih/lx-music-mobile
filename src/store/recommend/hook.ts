import { useEffect, useState } from 'react'
import recommendState from './state'

/**
 * 获取推荐歌曲列表
 */
export const useRecommendList = (): LX.Music.MusicInfoOnline[] => {
  const [list, setList] = useState(recommendState.recommendList)

  useEffect(() => {
    const handleListUpdate = (newList: LX.Music.MusicInfoOnline[]) => {
      setList(newList)
    }

    global.state_event.on('recommendListUpdated', handleListUpdate)

    return () => {
      global.state_event.off('recommendListUpdated', handleListUpdate)
    }
  }, [])

  return list
}

/**
 * 获取加载状态
 */
export const useRecommendLoading = (): boolean => {
  const [isLoading, setIsLoading] = useState(recommendState.isLoading)

  useEffect(() => {
    const handleLoadingUpdate = (isLoading: boolean) => {
      setIsLoading(isLoading)
    }

    global.state_event.on('recommendLoadingUpdated', handleLoadingUpdate)

    return () => {
      global.state_event.off('recommendLoadingUpdated', handleLoadingUpdate)
    }
  }, [])

  return isLoading
}

/**
 * 获取错误信息
 */
export const useRecommendError = (): string | null => {
  const [error, setError] = useState(recommendState.error)

  useEffect(() => {
    const handleErrorUpdate = (error: string | null) => {
      setError(error)
    }

    global.state_event.on('recommendErrorUpdated', handleErrorUpdate)

    return () => {
      global.state_event.off('recommendErrorUpdated', handleErrorUpdate)
    }
  }, [])

  return error
}

/**
 * 获取进度状态
 */
export const useRecommendProgress = (): string => {
  const [progress, setProgress] = useState(recommendState.progress)

  useEffect(() => {
    const handleProgressUpdate = (progress: string) => {
      setProgress(progress)
    }

    global.state_event.on('recommendProgressUpdated', handleProgressUpdate)

    return () => {
      global.state_event.off('recommendProgressUpdated', handleProgressUpdate)
    }
  }, [])

  return progress
}
