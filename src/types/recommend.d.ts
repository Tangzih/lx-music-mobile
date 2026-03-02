declare global {
  namespace LX.Recommend {
    interface AILogEntry {
      timestamp: number
      model: string
      prompt: string
      response: string
      requestSongs: string[]
      recommendedSongs: string[]
      existedSongs?: string[] // 已存在于推荐列表的歌曲
      failedSearchSongs?: string[] // 搜索失败的歌曲
      attempt?: number // 记录当前是第几次尝试
    }
  }
}

export {}