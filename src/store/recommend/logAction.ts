import logState from './logState'
import settingState from '@/store/setting/state'

/**
 * 添加 AI 日志
 */
export const addAILog = (log: Omit<LX.Recommend.AILogEntry, 'timestamp'>) => {
  if (!settingState.setting['recommend.enableLog']) return

  const newLog: LX.Recommend.AILogEntry = {
    ...log,
    timestamp: Date.now(),
  }

  // 限制日志数量
  if (logState.logs.length >= logState.maxLogs) {
    logState.logs = logState.logs.slice(-logState.maxLogs + 1)
  }

  logState.logs.push(newLog)
  global.state_event.recommendAILogAdded(newLog)
}

/**
 * 获取所有日志
 */
export const getAILogs = () => {
  return [...logState.logs]
}

/**
 * 清空日志
 */
export const clearAILogs = () => {
  logState.logs = []
  global.state_event.recommendAILogCleared()
}

/**
 * 获取最新日志
 */
export const getLatestAILog = () => {
  return logState.logs[logState.logs.length - 1] || null
}