import Event from './Event'

/**
 * 一起听事件
 */
export class ListenTogetherEvent extends Event {
  /**
   * 连接状态改变
   */
  connectionChanged(isConnected: boolean) {
    this.emit('connectionChanged', isConnected)
  }

  /**
   * 房间状态更新
   */
  roomStateUpdated(data: {
    room: LX.ListenTogether.RoomInfo
    members: LX.ListenTogether.RoomMember[]
  }) {
    this.emit('roomStateUpdated', data)
  }

  /**
   * 播放状态更新
   */
  playbackStateUpdated(state: LX.ListenTogether.PlaybackState, triggeredBy: string) {
    this.emit('playbackStateUpdated', state, triggeredBy)
  }

  /**
   * 进度同步
   */
  progressSync(currentTime: number, triggeredBy: string) {
    this.emit('progressSync', currentTime, triggeredBy)
  }

  /**
   * 新消息
   */
  newMessage(message: LX.ListenTogether.ChatMessage) {
    this.emit('newMessage', message)
  }

  /**
   * 成员加入
   */
  memberJoined(member: LX.ListenTogether.RoomMember) {
    this.emit('memberJoined', member)
  }

  /**
   * 成员离开
   */
  memberLeft(memberId: string) {
    this.emit('memberLeft', memberId)
  }

  /**
   * 表情反应
   */
  reactionReceived(data: {
    userId: string
    emoji: string
    timestamp: number
  }) {
    this.emit('reactionReceived', data)
  }

  /**
   * 服务器错误
   */
  serverError(error: { code: string; message: string }) {
    this.emit('serverError', error)
  }

  /**
   * 房间列表更新
   */
  roomListUpdated(rooms: LX.ListenTogether.RoomInfo[]) {
    this.emit('roomListUpdated', rooms)
  }

  /**
   * 我的房间列表更新
   */
  myRoomsUpdated(rooms: LX.ListenTogether.RoomInfo[]) {
    this.emit('myRoomsUpdated', rooms)
  }
}

export type ListenTogetherEventType = Omit<ListenTogetherEvent, keyof Event>

export const createListenTogetherEventHub = (): ListenTogetherEventType => {
  return new ListenTogetherEvent()
}
