export interface AILogEntry {
  timestamp: number
  model: string
  prompt: string
  response: string
  requestSongs: string[]
  recommendedSongs: string[]
}

export interface InitState {
  logs: AILogEntry[]
  maxLogs: number
}

const state: InitState = {
  logs: [],
  maxLogs: 50,
}

export default state