/**
 * 一起听状态管理
 */

export interface ListenTogetherState {
  /** 是否已连接到服务器 */
  isConnected: boolean
  /** 是否在房间中（用于禁用本地播放器） */
  isInRoom: boolean
  /** 当前房间信息 */
  currentRoom: LX.ListenTogether.RoomInfo | null
  /** 当前房间成员列表 */
  members: LX.ListenTogether.RoomMember[]
  /** 聊天消息列表 */
  messages: LX.ListenTogether.ChatMessage[]
  /** 表情反应列表 */
  reactions: LX.ListenTogether.Reaction[]
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 房间列表 */
  roomList: LX.ListenTogether.RoomInfo[]
  /** 我的房间列表 */
  myRooms: LX.ListenTogether.RoomInfo[]
  /** 当前用户 ID */
  userId: string | null
  /** 当前连接模式: 服务器 | 直连自建房 | 未连接 */
  connectMode: 'server' | 'local' | null
}

export const initialState: ListenTogetherState = {
  isConnected: false,
  isInRoom: false,
  currentRoom: null,
  members: [],
  messages: [],
  reactions: [],
  isLoading: false,
  error: null,
  roomList: [],
  myRooms: [],
  userId: null,
  connectMode: null,
}

let listeners: Array<(state: ListenTogetherState) => void> = []

export const subscribe = (listener: (state: ListenTogetherState) => void) => {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

let state = { ...initialState }

export const getState = () => state

export const setState = (newState: Partial<ListenTogetherState>): void => {
  state = { ...state, ...newState }
  listeners.forEach(listener => listener(state))
}

export const resetState = (): void => {
  state = { ...initialState }
  listeners.forEach(listener => listener(state))
}
