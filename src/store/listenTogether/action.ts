/**
 * 一起听状态操作
 */

import { getState, setState, resetState } from './state'
import type { ListenTogetherState } from './state'
import { Navigation } from 'react-native-navigation'
import { LISTEN_TOGETHER_OVERLAY } from '@/navigation/screenNames'

let isOverlayShowing = false

export const showListenTogetherOverlay = (): void => {
  if (!isOverlayShowing) {
    isOverlayShowing = true
    Navigation.showOverlay({
      component: {
        id: LISTEN_TOGETHER_OVERLAY,
        name: LISTEN_TOGETHER_OVERLAY,
        options: {
          layout: {
            componentBackgroundColor: 'transparent',
          },
          overlay: {
            interceptTouchOutside: false,
          },
        },
      },
    }).catch(() => {
      isOverlayShowing = false
    })
  }
}

export const hideListenTogetherOverlay = (): void => {
  if (isOverlayShowing) {
    isOverlayShowing = false
    Navigation.dismissOverlay(LISTEN_TOGETHER_OVERLAY).catch(() => {})
  }
}

/** 设置连接状态 */
export const setConnectionStatus = (isConnected: boolean): void => {
  setState({ isConnected })
}

/** 设置是否在房间中 */
export const setInRoom = (isInRoom: boolean): void => {
  setState({ isInRoom })
  if (!isInRoom) {
    hideListenTogetherOverlay()
  }
}

/** 设置当前房间 */
export const setCurrentRoom = (room: LX.ListenTogether.RoomInfo | null): void => {
  setState({ currentRoom: room })
}

/** 设置房间成员 */
export const setMembers = (members: LX.ListenTogether.RoomMember[]): void => {
  setState({ members })
}

/** 添加成员 */
export const addMember = (member: LX.ListenTogether.RoomMember): void => {
  const { members } = getState()
  const exists = members.find(m => m.id === member.id)
  if (!exists) {
    setState({ members: [...members, member] })
  }
}

/** 移除成员 */
export const removeMember = (memberId: string): void => {
  const { members } = getState()
  setState({ members: members.filter(m => m.id !== memberId) })
}

/** 更新成员 */
export const updateMember = (memberId: string, updates: Partial<LX.ListenTogether.RoomMember>): void => {
  const { members } = getState()
  setState({
    members: members.map(m =>
      m.id === memberId ? { ...m, ...updates } : m
    ),
  })
}

/** 添加聊天消息 */
export const addMessage = (message: LX.ListenTogether.ChatMessage): void => {
  const { messages } = getState()
  setState({
    messages: [...messages, message].slice(-500), // 保留最近500条
  })
}

/** 清空消息 */
export const clearMessages = (): void => {
  setState({ messages: [] })
}

/** 添加表情反应 */
export const addReaction = (reaction: LX.ListenTogether.Reaction): void => {
  const { reactions } = getState()
  setState({
    reactions: [...reactions, reaction].slice(-100),
  })
}

/** 设置加载状态 */
export const setLoading = (isLoading: boolean): void => {
  setState({ isLoading })
}

/** 设置错误信息 */
export const setError = (error: string | null): void => {
  setState({ error })
}

/** 设置房间列表 */
export const setRoomList = (roomList: LX.ListenTogether.RoomInfo[]): void => {
  setState({ roomList })
}

/** 设置我的房间列表 */
export const setMyRooms = (myRooms: LX.ListenTogether.RoomInfo[]): void => {
  setState({ myRooms })
}

/** 添加房间到列表 */
export const addRoom = (room: LX.ListenTogether.RoomInfo): void => {
  const { roomList } = getState()
  const exists = roomList.find(r => r.id === room.id)
  if (!exists) {
    setState({ roomList: [...roomList, room] })
  }
}

/** 从列表移除房间 */
export const removeRoom = (roomId: string): void => {
  const { roomList } = getState()
  setState({ roomList: roomList.filter(r => r.id !== roomId) })
}

/** 更新房间信息 */
export const updateRoom = (roomId: string, updates: Partial<LX.ListenTogether.RoomInfo>): void => {
  const { roomList, currentRoom } = getState()
  const newState: Partial<typeof getState> = {}

  // 更新房间列表
  newState.roomList = roomList.map(r =>
    r.id === roomId ? { ...r, ...updates } : r
  )

  // 更新当前房间
  if (currentRoom?.id === roomId) {
    newState.currentRoom = { ...currentRoom, ...updates }
  }

  setState(newState as Parameters<typeof setState>[0])
}

/** 清空状态 */
export const clearState = (): void => {
  resetState()
}

/** 设置连接模式 */
export const setConnectMode = (connectMode: ListenTogetherState['connectMode']): void => {
  setState({ connectMode })
}
