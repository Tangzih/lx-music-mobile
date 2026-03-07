/**
 * 一起听状态 Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getState, setState as setGlobalState } from './state'
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
  setGlobalState({ userId })
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

  serviceInstance.on('roomListUpdated', (rooms) => {
    setRoomList(rooms)
  })

  serviceInstance.on('roomDissolved', (data) => {
    // 房间被解散：清空所有房间相关状态
    setInRoom(false)
    setCurrentRoom(null)
    setMembers([])
    clearMessages()
    // data.reason 可用于 UI 提示
    setError(data.reason || '房间已解散')
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

  /**
   * 音源回退 - 别人向我请求音源链接
   * 如果我本地当前播放的歌和对方请求的一致，将已缓存的播放 URL 回复给他
   */
  serviceInstance.on('urlRequested', async (data: {
    songId: string
    musicInfo: LX.Music.MusicInfo
    requesterId: string
  }) => {
    const playerState = (await import('@/store/player/state')).default
    const currentMusicInfo = playerState.playMusicInfo.musicInfo
    if (!currentMusicInfo) return
    // 检查对方请求的歌曲 ID 是否和我在播的一致
    const myId = currentMusicInfo.id
    if (myId !== data.songId) return
    // 拿我本地当前播放链接（来自播放器 state）
    const url = playerState.progress?.url ?? (currentMusicInfo as any)._url
    if (!url) return
    serviceInstance?.respondUrl(data.requesterId, data.songId, url)
  })

  /**
   * 音源回退 - 收到他人回复的音源 URL
   * 直接用这条 URL 播放，不走正常的 getMusicUrl 流程，不跳歌，不影响进度同步
   */
  serviceInstance.on('urlResponseReceived', async (data: {
    songId: string
    url: string
    fromUserId: string
  }) => {
    const { setResource } = await import('@/plugins/player')
    const playerState = (await import('@/store/player/state')).default
    const currentMusicInfo = playerState.playMusicInfo.musicInfo
    if (!currentMusicInfo || currentMusicInfo.id !== data.songId) return
    // 用回退 URL 设置资源，保持当前进度
    setResource(currentMusicInfo, data.url, playerState.progress.nowPlayTime)
    console.log(`[一起听] 使用来自 ${data.fromUserId} 的音源回退 URL`)
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

  const refreshRoomList = useCallback(() => {
    if (!serviceInstance) {
      console.warn('Service not initialized')
      return
    }
    serviceInstance.getRoomList()
  }, [])

  // 房主专用：主动解散房间
  const dissolveRoom = useCallback(() => {
    if (!serviceInstance) return
    // 房主发送 leave_room，服务端会广播 room_dissolved 给其他成员
    serviceInstance.leaveRoom()
    setInRoom(false)
    setCurrentRoom(null)
    setMembers([])
    clearMessages()
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
    dissolveRoom,
    refreshRoomList,
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