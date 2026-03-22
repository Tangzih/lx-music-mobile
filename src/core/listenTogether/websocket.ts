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
  private isTcp = false
  private buffer = ''

  constructor(options: WSOptions) {
    super()
    this.url = options.url
    this.reconnectInterval = options.reconnectInterval ?? 5000
    this.heartbeatInterval = options.heartbeatInterval ?? 30000
    this.isTcp = this.url.startsWith('tcp://')
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
        if (this.isTcp) {
          const tcpModule = require('react-native-tcp-socket')
          const TcpSocket = tcpModule.default || tcpModule
          const [host, portStr] = this.url.replace('tcp://', '').split(':')
          
          this.ws = TcpSocket.createConnection(
            { host, port: parseInt(portStr || '2333', 10) },
            () => {
              this.isConnecting = false
              this.startHeartbeat()
              this.emit('open')
              resolve()
            }
          )

          this.ws.on('data', (data: any) => {
            this.buffer += data.toString('utf-8')
            let newlineIndex
            while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
              const line = this.buffer.slice(0, newlineIndex)
              this.buffer = this.buffer.slice(newlineIndex + 1)
              if (line.trim()) {
                try {
                  const message = JSON.parse(line) as LX.ListenTogether.WSMessage
                  this.emit('message', message)
                  this.emit(message.type, message.data)
                } catch (err) {
                  this.emit('error', err)
                }
              }
            }
          })

          this.ws.on('close', () => {
            this.isConnecting = false
            this.stopHeartbeat()
            this.emit('close')

            if (!this.isManuallyClosed) {
              this.scheduleReconnect()
            }
          })

          this.ws.on('error', (error: any) => {
            this.isConnecting = false
            this.emit('error', error)
            reject(error)
          })
          
        } else {
          try {
            this.ws = new WebSocket(this.url)

            this.ws.onopen = () => {
              this.isConnecting = false
              this.startHeartbeat()
              this.emit('open')
              resolve()
            }

            this.ws.onmessage = (event: any) => {
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

            this.ws.onerror = (error: any) => {
              this.isConnecting = false
              this.emit('error', error)
              reject(error)
            }
          } catch (err) {
            this.isConnecting = false
            reject(err)
          }
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
    if (this.isTcp) {
      // TCP sockets don't have readyState; check if the socket exists and is not destroyed
      if (!(this.ws as any) || (this.ws as any).destroyed) {
        return false
      }
    } else if (this.ws?.readyState !== WebSocket.OPEN) {
      return false
    }

    const message: LX.ListenTogether.WSMessage<T> = {
      type,
      data,
      timestamp: Date.now(),
    }

    if (this.isTcp && (this.ws as any)?.write) {
      try {
        ;(this.ws as any).write(JSON.stringify(message) + '\n')
        return true
      } catch (err) {
        return false
      }
    } else if (this.ws?.send) {
      this.ws.send(JSON.stringify(message))
      return true
    }
    return false
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.isManuallyClosed = true
    this.clearReconnectTimer()
    this.stopHeartbeat()

    if (this.ws) {
      if (this.isTcp && (this.ws as any).destroy) {
        ;(this.ws as any).destroy()
      } else if (this.ws.close) {
        this.ws.close()
      }
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
    if (this.isTcp) {
      return !!this.ws && !(this.ws as any).destroyed
    }
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export default ListenTogetherWebSocket
