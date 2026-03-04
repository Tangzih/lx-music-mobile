import Event from '@/event/Event'

/**
 * 一起听 WebSocket 服务
 * 负责实时双向通信
 */

interface WSOptions {
  url: string
  reconnectInterval?: number
  heartbeatInterval?: number
}

export class ListenTogetherWebSocket extends Event {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number
  private heartbeatInterval: number
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private isConnecting = false
  private isManuallyClosed = false

  constructor(options: WSOptions) {
    super()
    this.url = options.url
    this.reconnectInterval = options.reconnectInterval ?? 5000
    this.heartbeatInterval = options.heartbeatInterval ?? 30000
  }

  /**
   * 连接 WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        reject(new Error('正在连接中'))
        return
      }

      this.isConnecting = true
      this.isManuallyClosed = false

      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          this.isConnecting = false
          this.startHeartbeat()
          this.emit('open')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as LX.ListenTogether.WSMessage
            this.emit('message', message)
            this.emit(message.type, message.data)
          } catch (err) {
            this.emit('error', err)
          }
        }

        this.ws.onclose = () => {
          this.isConnecting = false
          this.stopHeartbeat()
          this.emit('close')

          if (!this.isManuallyClosed) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          this.isConnecting = false
          this.emit('error', error)
          reject(error)
        }
      } catch (err) {
        this.isConnecting = false
        reject(err)
      }
    })
  }

  /**
   * 发送消息
   */
  send<T = unknown>(type: string, data: T): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return false
    }

    const message: LX.ListenTogether.WSMessage<T> = {
      type,
      data,
      timestamp: Date.now(),
    }

    this.ws.send(JSON.stringify(message))
    return true
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.isManuallyClosed = true
    this.clearReconnectTimer()
    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send('ping', {})
    }, this.heartbeatInterval)
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 计划重连
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      void this.connect()
    }, this.reconnectInterval)
  }

  /**
   * 清除重连定时器
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * 是否已连接
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export default ListenTogetherWebSocket
