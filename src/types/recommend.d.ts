declare global {
  namespace LX.Recommend {
    interface AILogEntry {
      timestamp: number
      model: string
      prompt: string
      response: string
      requestSongs: string[]
      recommendedSongs: string[]
    }
  }
}

export {}