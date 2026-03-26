/**
 * 一起听状态 Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getState, setState as setGlobalState, subscribe } from './state'
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
  setConnectMode,
} from './action'
import { ListenTogetherService } from '@/core/listenTogether'
import { setMusicList } from '@/utils/listManage'
import { LISTEN_TOGETHER_ROOM_PLAYLIST_ID } from '@/core/listenTogether/constants'

let serviceInstance: ListenTogetherService | null = null
let serviceConfig: { serverUrl: string; userId: string } | null = null

/**
 * Clean up player state when leaving a room.
 * Stops playback and resets playlist / played / temp lists so the player
 * does not continue operating on the room playlist after exit.
 */
const cleanupPlayerState = () => {
  void Promise.all([
    import('@/core/player/player'),
    import('@/core/player/playInfo'),
    import('@/core/player/playedList'),
    import('@/core/player/tempPlayList'),
  ]).then(([{ stop }, { setPlayMusicInfo, setPlayListId }, { clearPlayedList }, { clearTempPlayeList }]) => {
    void stop()
    clearPlayedList()
    clearTempPlayeList()
    setPlayMusicInfo(null, null)
    setPlayListId(null)
  })
}

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
    if (Array.isArray(data.room?.playbackState?.playlist)) {
      setMusicList(LISTEN_TOGETHER_ROOM_PLAYLIST_ID, data.room.playbackState.playlist)
    }
    setCurrentRoom(data.room)
    setMembers(data.members)
    setInRoom(true)
  })

  serviceInstance.on('roomListUpdated', (rooms) => {
    setRoomList(rooms)
  })

  serviceInstance.on('roomDissolved', (data) => {
    // 房间被解散：清空所有房间相关状态
    setMusicList(LISTEN_TOGETHER_ROOM_PLAYLIST_ID, [])
    cleanupPlayerState()
    setInRoom(false)
    setCurrentRoom(null)
    setMembers([])
    clearMessages()
    // data.reason 可用于 UI 提示
    setError(data.reason || '房间已解散')
  })

  serviceInstance.on('playbackStateUpdated', (state) => {
    const { currentRoom } = getState()
    if (Array.isArray(state.playlist)) {
      setMusicList(LISTEN_TOGETHER_ROOM_PLAYLIST_ID, state.playlist)
    }
    if (currentRoom) {
      const prevSongId = currentRoom.playbackState?.currentSong?.id
      setCurrentRoom({
        ...currentRoom,
        playbackState: state,
      })
      // Trigger actual playback when the current song changes (room-initiated song switch)
      if (state.currentSong && state.currentSong.id !== prevSongId) {
        void Promise.all([
          import('@/core/player/player'),
          import('@/core/player/playedList'),
          import('@/core/player/tempPlayList'),
        ]).then(([{ playMusicInfo }, { clearPlayedList }, { clearTempPlayeList }]) => {
          clearPlayedList()
          clearTempPlayeList()
          void playMusicInfo(LISTEN_TOGETHER_ROOM_PLAYLIST_ID, state.currentSong!, false)
        })
      }
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
    const { currentRoom } = getState()
    if (currentRoom?.hostId === memberId) {
      setMusicList(LISTEN_TOGETHER_ROOM_PLAYLIST_ID, [])
      cleanupPlayerState()
      setInRoom(false)
      setCurrentRoom(null)
      setMembers([])
      clearMessages()
      setError('房间已解散')
    }
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
  const currentState = getState()
  
  if (serviceInstance) {
    serviceInstance.disconnect()
    serviceInstance = null
  }
  setConnectionStatus(false)
  setMusicList(LISTEN_TOGETHER_ROOM_PLAYLIST_ID, [])
  if (currentState.isInRoom) cleanupPlayerState()
  setInRoom(false)
  setCurrentRoom(null)
  setMembers([])
  clearMessages()
  
  if (currentState.connectMode === 'local') {
    try {
      const { listenTogetherHostServer } = require('@/core/listenTogether/hostServer')
      listenTogetherHostServer.stop()
    } catch (err) {
      console.error('Failed to stop local host server', err)
    }
  }
  setConnectMode(null)
}

export const useListenTogetherState = () => {
  const [state, setLocalState] = useState<ListenTogetherState>(getState())

  useEffect(() => {
    return subscribe(setLocalState)
  }, [])

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
    const currentState = getState()
    if (currentState.connectMode === 'local') {
      // 本地建房：直接调用全局的 disconnectService，关闭本机的 TCP 服务器
      disconnectService()
    } else {
      setMusicList(LISTEN_TOGETHER_ROOM_PLAYLIST_ID, [])
      cleanupPlayerState()
      setInRoom(false)
      setCurrentRoom(null)
      setMembers([])
      clearMessages()
    }
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
    setMusicList(LISTEN_TOGETHER_ROOM_PLAYLIST_ID, [])
    cleanupPlayerState()
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
