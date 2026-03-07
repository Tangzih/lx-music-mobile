import { ListenTogetherWebSocket } from './websocket'
import Event from '@/event/Event'

/**
 * 一起听服务
 * 处理房间管理、同步播放、聊天等业务逻辑
 */

interface ServiceOptions {
  serverUrl: string
  userId: string
  userName: string
  userAvatar?: string
}

export class ListenTogetherService extends Event {
  private ws: ListenTogetherWebSocket
  private userId: string
  private userName: string
  private userAvatar?: string
  private currentRoomId: string | null = null
  private playbackState: LX.ListenTogether.PlaybackState | null = null

  constructor(options: ServiceOptions) {
    super()
    this.userId = options.userId
    this.userName = options.userName
    this.userAvatar = options.userAvatar
    this.ws = new ListenTogetherWebSocket({
      url: options.serverUrl,
    })
    this.setupWebSocketListeners()
  }

  /**
   * 设置 WebSocket 监听器
   */
  private setupWebSocketListeners(): void {
    this.ws.on('open', () => {
      this.emit('connected')
    })

    this.ws.on('close', () => {
      this.emit('disconnected')
    })

    this.ws.on('error', (error) => {
      this.emit('error', error)
    })

    // 房间状态更新
    this.ws.on('room_state', (data: {
      room: LX.ListenTogether.RoomInfo
      members: LX.ListenTogether.RoomMember[]
    }) => {
      this.emit('roomStateUpdated', data)
    })

    // 房间列表更新
    this.ws.on('room_list', (data: {
      rooms: LX.ListenTogether.RoomInfo[]
    }) => {
      this.emit('roomListUpdated', data.rooms)
    })

    // 房间被解散（房主离开）
    this.ws.on('room_dissolved', (data: {
      roomId: string
      reason: string
    }) => {
      this.currentRoomId = null
      this.emit('roomDissolved', data)
    })

    // 播放状态更新
    this.ws.on('playback_state', (data: {
      state: LX.ListenTogether.PlaybackState
      triggeredBy: string
    }) => {
      this.playbackState = data.state
      this.emit('playbackStateUpdated', data.state, data.triggeredBy)
    })

    // 进度同步
    this.ws.on('progress_sync', (data: {
      currentTime: number
      triggeredBy: string
    }) => {
      this.emit('progressSync', data.currentTime, data.triggeredBy)
    })

    // 新聊天消息
    this.ws.on('new_message', (data: {
      message: LX.ListenTogether.ChatMessage
    }) => {
      this.emit('newMessage', data.message)
    })

    // 成员加入
    this.ws.on('member_joined', (data: {
      member: LX.ListenTogether.RoomMember
    }) => {
      this.emit('memberJoined', data.member)
    })

    // 成员离开
    this.ws.on('member_left', (data: {
      memberId: string
    }) => {
      this.emit('memberLeft', data.memberId)
    })

    // 表情反应
    this.ws.on('reaction_received', (data: {
      userId: string
      emoji: string
      timestamp: number
    }) => {
      this.emit('reactionReceived', data)
    })

    // 错误信息
    this.ws.on('error', (data: {
      code: string
      message: string
    }) => {
      this.emit('serverError', data)
    })
  }

  /**
   * 连接到服务器
   */
  async connect(): Promise<void> {
    await this.ws.connect()
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.ws.close()
  }

  /**
   * 获取房间列表
   */
  getRoomList(): void {
    this.ws.send('get_room_list', {})
  }

  /**
   * 创建房间
   */
  createRoom(params: LX.ListenTogether.CreateRoomParams): void {
    this.ws.send('create_room', {
      ...params,
      userId: this.userId,
      userName: this.userName,
      userAvatar: this.userAvatar,
    })
  }

  /**
   * 加入房间
   */
  joinRoom(params: LX.ListenTogether.JoinRoomParams): void {
    this.currentRoomId = params.roomId
    this.ws.send('join_room', {
      ...params,
      userId: this.userId,
      userName: this.userName,
      userAvatar: this.userAvatar,
    })
  }

  /**
   * 离开房间
   */
  leaveRoom(): void {
    if (this.currentRoomId) {
      this.ws.send('leave_room', {
        roomId: this.currentRoomId,
        userId: this.userId,
      })
      this.currentRoomId = null
    }
  }

  /**
   * 播放歌曲
   */
  play(musicInfo: LX.Music.MusicInfo): void {
    this.ws.send('play', {
      roomId: this.currentRoomId,
      musicInfo,
      triggeredBy: this.userId,
    })
  }

  /**
   * 暂停播放
   */
  pause(): void {
    this.ws.send('pause', {
      roomId: this.currentRoomId,
      triggeredBy: this.userId,
    })
  }

  /**
   * 恢复播放
   */
  resume(): void {
    this.ws.send('resume', {
      roomId: this.currentRoomId,
      triggeredBy: this.userId,
    })
  }

  /**
   * 跳转进度
   */
  seek(currentTime: number): void {
    this.ws.send('seek', {
      roomId: this.currentRoomId,
      currentTime,
      triggeredBy: this.userId,
    })
  }

  /**
   * 切歌
   */
  changeSong(index: number): void {
    this.ws.send('change_song', {
      roomId: this.currentRoomId,
      index,
      triggeredBy: this.userId,
    })
  }

  /**
   * 添加歌曲到队列
   */
  addToQueue(musicInfo: LX.Music.MusicInfo): void {
    this.ws.send('add_to_queue', {
      roomId: this.currentRoomId,
      musicInfo,
      triggeredBy: this.userId,
    })
  }

  /**
   * 上传/替换播放列表
   */
  uploadPlaylist(playlist: LX.Music.MusicInfo[]): void {
    this.ws.send('upload_playlist', {
      roomId: this.currentRoomId,
      playlist,
      triggeredBy: this.userId,
    })
  }

  /**
   * 添加歌曲到播放列表
   */
  addToPlaylist(musicInfo: LX.Music.MusicInfo): void {
    this.ws.send('add_to_playlist', {
      roomId: this.currentRoomId,
      musicInfo,
      triggeredBy: this.userId,
    })
  }

  /**
   * 从播放列表移除歌曲
   */
  removeFromPlaylist(index: number): void {
    this.ws.send('remove_from_playlist', {
      roomId: this.currentRoomId,
      index,
      triggeredBy: this.userId,
    })
  }

  /**
   * 发送聊天消息
   */
  sendMessage(content: string, type: LX.ListenTogether.MessageType = 'text'): void {
    this.ws.send('send_message', {
      roomId: this.currentRoomId,
      senderId: this.userId,
      senderName: this.userName,
      senderAvatar: this.userAvatar,
      content,
      type,
    })
  }

  /**
   * 发送表情反应
   */
  sendReaction(emoji: string): void {
    this.ws.send('reaction', {
      roomId: this.currentRoomId,
      userId: this.userId,
      emoji,
    })
  }

  /**
   * 获取当前房间ID
   */
  getCurrentRoomId(): string | null {
    return this.currentRoomId
  }

  /**
   * 获取当前播放状态
   */
  getPlaybackState(): LX.ListenTogether.PlaybackState | null {
    return this.playbackState
  }

  /**
   * 是否已连接
   */
  get isConnected(): boolean {
    return this.ws.isConnected
  }
}

export default ListenTogetherService
