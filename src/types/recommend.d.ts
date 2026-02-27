declare global {
  namespace LX.Recommend {
    interface AILogEntry {
      timestamp: number
      model: string
      prompt: string
      response: string
      requestSongs: string[]
      recommendedSongs: string[]
      attempt?: number // 记录当前是第几次尝试
    }
  }
}

export {}