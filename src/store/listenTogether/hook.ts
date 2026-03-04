/**
 * 一起听状态 Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getState } from './state'
import type { ListenTogetherState } from './state'
import {
  setConnectionStatus,
  setInRoom,
  setCurrentRoom,
  setMembers,
  addMember,
  removeMember,
  addMessage,
  addReaction,
  setRoomList,
  setMyRooms,
  setError,
  setLoading,
  clearMessages,
} from './action'
import { ListenTogetherService } from '@/core/listenTogether'

let serviceInstance: ListenTogetherService | null = null
let serviceConfig: { serverUrl: string; userId: string } | null = null

export const initService = async (serverUrl: string, userId: string, userName?: string, userAvatar?: string) => {
  if (serviceInstance) {
    serviceInstance.disconnect()
  }

  const actualUserName = userName || '未知用户'

  serviceConfig = { serverUrl, userId }
  serviceInstance = new ListenTogetherService({
    serverUrl,
    userId,
    userName: actualUserName,
    userAvatar,
  })

  // 设置事件监听
  serviceInstance.on('connected', () => {
    setConnectionStatus(true)
    setError(null)
  })

  serviceInstance.on('disconnected', () => {
    setConnectionStatus(false)
  })

  serviceInstance.on('error', (err) => {
    setError(err instanceof Error ? err.message : '连接错误')
  })

  serviceInstance.on('roomStateUpdated', (data) => {
    setCurrentRoom(data.room)
    setMembers(data.members)
    setInRoom(true)
  })

  serviceInstance.on('playbackStateUpdated', (state) => {
    const { currentRoom } = getState()
    if (currentRoom) {
      setCurrentRoom({
        ...currentRoom,
        playbackState: state,
      })
    }
  })

  serviceInstance.on('progressSync', (currentTime) => {
    const { currentRoom } = getState()
    if (currentRoom?.playbackState) {
      setCurrentRoom({
        ...currentRoom,
        playbackState: {
          ...currentRoom.playbackState,
          currentTime,
        },
      })
    }
  })

  serviceInstance.on('newMessage', (message) => {
    addMessage(message)
  })

  serviceInstance.on('memberJoined', (member) => {
    addMember(member)
  })

  serviceInstance.on('memberLeft', (memberId) => {
    removeMember(memberId)
  })

  serviceInstance.on('reactionReceived', (data) => {
    addReaction({
      userId: data.userId,
      emoji: data.emoji,
      timestamp: data.timestamp,
    })
  })

  serviceInstance.on('serverError', (error) => {
    setError(error.message)
  })

  // 连接服务器
  try {
    setLoading(true)
    await serviceInstance.connect()
    setLoading(false)
  } catch (err) {
    setLoading(false)
    setError(err instanceof Error ? err.message : '连接失败')
  }
}

export const getService = (): ListenTogetherService | null => {
  return serviceInstance
}

export const disconnectService = () => {
  if (serviceInstance) {
    serviceInstance.disconnect()
    serviceInstance = null
  }
  setConnectionStatus(false)
  setInRoom(false)
  setCurrentRoom(null)
  setMembers([])
  clearMessages()
}

export const useListenTogetherState = () => {
  const [state, setLocalState] = useState<ListenTogetherState>(getState())

  useEffect(() => {
    // 模拟状态订阅
    const interval = setInterval(() => {
      const currentState = getState()
      // 浅比较，如果状态变化则更新
      if (JSON.stringify(currentState) !== JSON.stringify(state)) {
        setLocalState(currentState)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [state])

  return state
}

export const useCurrentRoom = () => {
  const state = useListenTogetherState()
  return state.currentRoom
}

export const useRoomMembers = () => {
  const state = useListenTogetherState()
  return state.members
}

export const useRoomMessages = () => {
  const state = useListenTogetherState()
  return state.messages
}

export const useConnectionStatus = () => {
  const state = useListenTogetherState()
  return state.isConnected
}

export const useRoomList = () => {
  const state = useListenTogetherState()
  return state.roomList
}

export const useMyRooms = () => {
  const state = useListenTogetherState()
  return state.myRooms
}

export const useIsInRoom = () => {
  const state = useListenTogetherState()
  return state.isInRoom
}

/**
 * 一起听 Hook，用于组件中获取状态和操作方法
 */
export const useListenTogether = () => {
  const state = useListenTogetherState()
  const initRef = useRef(false)

  useEffect(() => {
    // 自动初始化服务（如果配置了服务器地址）
    // 实际使用时应该从设置中读取
    if (!initRef.current && !serviceInstance) {
      // TODO: 从设置中读取服务器地址和用户ID
      // const settings = getSettings()
      // if (settings.listenTogetherServerUrl) {
      //   initService(settings.listenTogetherServerUrl, settings.userId)
      // }
      initRef.current = true
    }

    return () => {
      // 组件卸载时不自动断开连接，保持服务运行
    }
  }, [])

  const createRoom = useCallback((params: LX.ListenTogether.CreateRoomParams) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.createRoom(params)
  }, [])

  const joinRoom = useCallback((params: LX.ListenTogether.JoinRoomParams) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.joinRoom(params)
  }, [])

  const leaveRoom = useCallback(() => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.leaveRoom()
    setInRoom(false)
    setCurrentRoom(null)
    setMembers([])
    clearMessages()
  }, [])

  const sendMessage = useCallback((content: string, type: LX.ListenTogether.MessageType = 'text') => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.sendMessage(content, type)
  }, [])

  const sendReaction = useCallback((emoji: string) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.sendReaction(emoji)
  }, [])

  const changeSong = useCallback((index: number) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.changeSong(index)
  }, [])

  const play = useCallback((musicInfo: LX.Music.MusicInfo) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.play(musicInfo)
  }, [])

  const pause = useCallback(() => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.pause()
  }, [])

  const resume = useCallback(() => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.resume()
  }, [])

  const seek = useCallback((currentTime: number) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.seek(currentTime)
  }, [])

  const addToQueue = useCallback((musicInfo: LX.Music.MusicInfo) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.addToQueue(musicInfo)
  }, [])

  const uploadPlaylist = useCallback((playlist: LX.Music.MusicInfo[]) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.uploadPlaylist(playlist)
  }, [])

  const addToPlaylist = useCallback((musicInfo: LX.Music.MusicInfo) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.addToPlaylist(musicInfo)
  }, [])

  const removeFromPlaylist = useCallback((index: number) => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.removeFromPlaylist(index)
  }, [])

  const connect = useCallback(async (serverUrl: string, userId: string, userAvatar?: string) => {
    await initService(serverUrl, userId, userAvatar)
  }, [])

  const disconnect = useCallback(() => {
    disconnectService()
  }, [])

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendReaction,
    changeSong,
    play,
    pause,
    resume,
    seek,
    addToQueue,
    uploadPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    connect,
    disconnect,
  }
}