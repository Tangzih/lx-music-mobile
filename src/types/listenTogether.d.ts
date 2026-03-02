declare namespace LX.ListenTogether {
  /**
   * 房间信息
   */
  interface RoomInfo {
    /** 房间ID */
    id: string
    /** 房间名称 */
    name: string
    /** 房间描述 */
    description?: string
    /** 房主ID */
    hostId: string
    /** 房主名称 */
    hostName: string
    /** 最大人数 */
    maxMembers: number
    /** 当前人数 */
    currentMembers: number
    /** 是否公开 */
    isPublic: boolean
    /** 是否允许点歌 */
    allowRequest: boolean
    /** 创建时间 */
    createdAt: number
    /** 当前播放状态 */
    playbackState?: PlaybackState
  }

  /**
   * 房间成员
   */
  interface RoomMember {
    /** 用户ID */
    id: string
    /** 用户名称 */
    name: string
    /** 头像 */
    avatar?: string
    /** 角色 */
    role: MemberRole
    /** 加入时间 */
    joinedAt: number
    /** 是否在线 */
    isOnline: boolean
  }

  /**
   * 成员角色
   */
  type MemberRole = 'host' | 'admin' | 'member'

  /**
   * 播放状态
   */
  interface PlaybackState {
    /** 当前播放歌曲 */
    currentSong: LX.Music.MusicInfo | null
    /** 是否正在播放 */
    isPlaying: boolean
    /** 当前播放进度（秒） */
    currentTime: number
    /** 总时长（秒） */
    duration: number
    /** 播放模式 */
    playMode: LX.Player.PlayMode
    /** 播放列表 */
    playlist: LX.Music.MusicInfo[]
    /** 当前播放索引 */
    currentIndex: number
  }

  /**
   * 聊天消息
   */
  interface ChatMessage {
    /** 消息ID */
    id: string
    /** 发送者ID */
    senderId: string
    /** 发送者名称 */
    senderName: string
    /** 发送者头像 */
    senderAvatar?: string
    /** 消息内容 */
    content: string
    /** 消息类型 */
    type: MessageType
    /** 发送时间 */
    timestamp: number
  }

  /**
   * 消息类型
   */
  type MessageType = 'text' | 'emoji' | 'system'

  /**
   * 表情反应
   */
  interface Reaction {
    /** 用户ID */
    userId: string
    /** 表情 */
    emoji: string
    /** 发送时间 */
    timestamp: number
  }

  /**
   * WebSocket 消息格式
   */
  interface WSMessage<T = unknown> {
    /** 消息类型 */
    type: string
    /** 消息数据 */
    data: T
    /** 时间戳 */
    timestamp: number
  }

  /**
   * 创建房间参数
   */
  interface CreateRoomParams {
    name: string
    description?: string
    maxMembers?: number
    isPublic?: boolean
    allowRequest?: boolean
  }

  /**
   * 加入房间参数
   */
  interface JoinRoomParams {
    roomId: string
    password?: string
  }
}
