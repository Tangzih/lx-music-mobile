import { useEffect, useRef, useCallback, useState } from 'react'
import { ListenTogetherService } from '@/core/listenTogether'
import { EventEmitter } from 'events'

interface UseListenTogetherOptions {
  serverUrl: string
  userId: string
  userName?: string
  userAvatar?: string
}

interface ListenTogetherState {
  isConnected: boolean
  currentRoom: LX.ListenTogether.RoomInfo | null
  members: LX.ListenTogether.RoomMember[]
  messages: LX.ListenTogether.ChatMessage[]
  playbackState: LX.ListenTogether.PlaybackState | null
  isLoading: boolean
  error: string | null
}

/**
 * 一起听 Hook
 * 提供一起听功能的完整状态管理和操作方法
 */
export const useListenTogether = (options: UseListenTogetherOptions) => {
  const serviceRef = useRef<ListenTogetherService | null>(null)
  const eventRef = useRef<EventEmitter | null>(null)

  const [state, setState] = useState<ListenTogetherState>({
    isConnected: false,
    currentRoom: null,
    members: [],
    messages: [],
    playbackState: null,
    isLoading: false,
    error: null,
  })

  // 初始化服务
  useEffect(() => {
    const initService = async () => {
      try {
        const userName = options.userName ?? '未知用户'
        serviceRef.current = new ListenTogetherService({
          serverUrl: options.serverUrl,
          userId: options.userId,
          userName,
          userAvatar: options.userAvatar,
        })

        // 设置事件监听
        setupEventListeners()

        // 连接服务器
        await serviceRef.current.connect()
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : '连接失败',
        }))
      }
    }

    void initService()

    return () => {
      serviceRef.current?.disconnect()
      serviceRef.current = null
      eventRef.current = null
    }
  }, [options.serverUrl, options.userId])

  // 设置事件监听器
  const setupEventListeners = () => {
    if (!serviceRef.current) return

    serviceRef.current.on('connected', () => {
      setState(prev => ({ ...prev, isConnected: true, error: null }))
    })

    serviceRef.current.on('disconnected', () => {
      setState(prev => ({ ...prev, isConnected: false }))
    })

    serviceRef.current.on('error', (err) => {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : '发生错误',
      }))
    })

    serviceRef.current.on('roomStateUpdated', (data) => {
      setState(prev => ({
        ...prev,
        currentRoom: data.room,
        members: data.members,
      }))
    })

    serviceRef.current.on('playbackStateUpdated', (state) => {
      setState(prev => ({ ...prev, playbackState: state }))
    })

    serviceRef.current.on('newMessage', (message) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message].slice(-500),
      }))
    })

    serviceRef.current.on('memberJoined', (member) => {
      setState(prev => ({
        ...prev,
        members: [...prev.members, member],
      }))
    })

    serviceRef.current.on('memberLeft', (memberId) => {
      setState(prev => ({
        ...prev,
        members: prev.members.filter(m => m.id !== memberId),
      }))
    })

    serviceRef.current.on('serverError', (error) => {
      setState(prev => ({ ...prev, error: error.message }))
    })
  }

  // 操作方法
  const createRoom = useCallback((params: LX.ListenTogether.CreateRoomParams) => {
    serviceRef.current?.createRoom(params)
  }, [])

  const joinRoom = useCallback((params: LX.ListenTogether.JoinRoomParams) => {
    serviceRef.current?.joinRoom(params)
  }, [])

  const leaveRoom = useCallback(() => {
    serviceRef.current?.leaveRoom()
    setState(prev => ({
      ...prev,
      currentRoom: null,
      members: [],
      messages: [],
    }))
  }, [])

  const sendMessage = useCallback((content: string, type?: LX.ListenTogether.MessageType) => {
    serviceRef.current?.sendMessage(content, type)
  }, [])

  const sendReaction = useCallback((emoji: string) => {
    serviceRef.current?.sendReaction(emoji)
  }, [])

  const syncPlaybackState = useCallback((isPlaying: boolean, currentTime: number) => {
    if (!serviceRef.current) return

    if (isPlaying) {
      serviceRef.current.resume()
    } else {
      serviceRef.current.pause()
    }

    serviceRef.current.seek(currentTime)
  }, [])

  const changeSong = useCallback((index: number) => {
    serviceRef.current?.changeSong(index)
  }, [])

  const addToQueue = useCallback((musicInfo: LX.Music.MusicInfo) => {
    serviceRef.current?.addToQueue(musicInfo)
  }, [])

  return {
    // 状态
    ...state,

    // 操作方法
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendReaction,
    syncPlaybackState,
    changeSong,
    addToQueue,
  }
}

export default useListenTogether
