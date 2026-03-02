/**
 * 一起听状态 Hook
 */

import { useState, useEffect, useCallback } from 'react'
import { getState } from './state'
import type { ListenTogetherState } from './state'

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

/**
 * 简化版一起听 Hook，用于组件中获取状态和基本操作
 */
export const useListenTogether = () => {
  const state = useListenTogetherState()

  const createRoom = useCallback(async (params: LX.ListenTogether.CreateRoomParams) => {
    // TODO: 实现创建房间逻辑
    console.log('createRoom', params)
  }, [])

  const joinRoom = useCallback(async (params: LX.ListenTogether.JoinRoomParams) => {
    // TODO: 实现加入房间逻辑
    console.log('joinRoom', params)
  }, [])

  const leaveRoom = useCallback(async () => {
    // TODO: 实现离开房间逻辑
    console.log('leaveRoom')
  }, [])

  const sendMessage = useCallback(async (content: string, type?: LX.ListenTogether.MessageType) => {
    // TODO: 实现发送消息逻辑
    console.log('sendMessage', content, type)
  }, [])

  const sendReaction = useCallback(async (emoji: string) => {
    // TODO: 实现发送表情逻辑
    console.log('sendReaction', emoji)
  }, [])

  const changeSong = useCallback(async (index: number) => {
    // TODO: 实现切歌逻辑
    console.log('changeSong', index)
  }, [])

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendReaction,
    changeSong,
  }
}
