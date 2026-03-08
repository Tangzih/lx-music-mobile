import TcpSocket from 'react-native-tcp-socket'
import Event from '@/event/Event'

class ListenTogetherHostServer extends Event {
  private server: TcpSocket.Server | null = null
  private clients = new Map<string, TcpSocket.Socket>()
  private roomState: LX.ListenTogether.RoomInfo | null = null
  private members = new Map<string, LX.ListenTogether.RoomMember>()
  private playbackState: LX.ListenTogether.PlaybackState | null = null

  start(port: number, hostName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve()
        return
      }
      try {
        this.server = TcpSocket.createServer((socket) => {
          let buffer = ''
          const clientId = socket.remoteAddress + ':' + socket.remotePort
          this.clients.set(clientId, socket)

          socket.on('data', (data) => {
            buffer += data.toString('utf-8')
            let newlineIndex
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIndex)
              buffer = buffer.slice(newlineIndex + 1)
              if (line.trim()) {
                this.handleMessage(clientId, socket, line)
              }
            }
          })

          socket.on('error', (err) => {
            console.log('socket error', err)
          })

          socket.on('close', () => {
            this.handleClientDisconnect(clientId)
          })
        })

        this.server.on('error', (error) => {
          this.emit('error', error)
          reject(error)
        })

        this.server.listen({ port, host: '0.0.0.0' }, () => {
          const roomId = 'local_room_' + Date.now()
          this.roomState = {
            id: roomId,
            name: hostName + ' 的房间',
            hostId: '', 
            createdAt: Date.now(),
          }
          this.playbackState = null
          this.emit('started', port)
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  stop() {
    if (this.server) {
      this.server.close()
      this.server = null
    }
    for (const socket of this.clients.values()) {
      socket.destroy()
    }
    this.clients.clear()
    this.members.clear()
    this.roomState = null
  }

  getRoomState(): LX.ListenTogether.RoomInfo | null {
    return this.roomState
  }

  private handleClientDisconnect(clientId: string) {
    this.clients.delete(clientId)
    let disconnectedMemberId: string | null = null
    for (const [memberId, member] of this.members.entries()) {
      if ((member as any)._clientId === clientId) {
        disconnectedMemberId = memberId
        break
      }
    }
    if (disconnectedMemberId) {
      this.members.delete(disconnectedMemberId)
      this.broadcast('member_left', { memberId: disconnectedMemberId })
      this.broadcastRoomState()
    }
  }

  private broadcast(type: string, data: any) {
    const payload = JSON.stringify({ type, data, timestamp: Date.now() }) + '\n'
    for (const socket of this.clients.values()) {
      try {
        socket.write(payload)
      } catch (err) {
        console.warn('Failed to broadcast to a client', err)
      }
    }
  }

  private broadcastRoomState() {
    this.broadcast('room_state', {
      room: this.roomState,
      members: Array.from(this.members.values()).map(m => {
        const sm = { ...m }
        delete (sm as any)._clientId
        return sm
      }),
    })
  }

  private handleMessage(clientId: string, socket: TcpSocket.Socket, rawData: string) {
    try {
      const msg = JSON.parse(rawData)
      const { type, data } = msg

      switch (type) {
        case 'ping':
          socket.write(JSON.stringify({ type: 'pong', timestamp: Date.now() }) + '\n')
          break
        case 'join_room': {
          const { userId, userName, userAvatar } = data
          if (this.roomState && !this.roomState.hostId) {
            this.roomState.hostId = userId
          }
          const member: any = {
            id: userId,
            name: userName,
            avatar: userAvatar,
            joinedAt: Date.now(),
            _clientId: clientId,
          }
          this.members.set(userId, member)
          
          const safeMember = { ...member }
          delete safeMember._clientId

          const roomStatePayload = JSON.stringify({
            type: 'room_state',
            data: {
              room: this.roomState,
              members: Array.from(this.members.values()).map(m => {
                const sm = { ...m }
                delete (sm as any)._clientId
                return sm
              }),
            },
            timestamp: Date.now(),
          }) + '\n'
          socket.write(roomStatePayload)

          this.broadcast('member_joined', { member: safeMember })

          if (this.playbackState) {
            const playbackPayload = JSON.stringify({
              type: 'playback_state',
              data: { state: this.playbackState, triggeredBy: userId },
              timestamp: Date.now(),
            }) + '\n'
            socket.write(playbackPayload)
          }
          break
        }
        case 'leave_room': {
          this.handleClientDisconnect(clientId)
          break
        }
        case 'play': {
          this.playbackState = {
            musicInfo: data.musicInfo,
            status: 'playing',
            currentTime: 0,
            timestamp: Date.now(),
          } as any
          this.broadcast('playback_state', { state: this.playbackState, triggeredBy: data.triggeredBy })
          break
        }
        case 'pause': {
          if (this.playbackState) this.playbackState.status = 'paused'
          this.broadcast('playback_state', { state: this.playbackState, triggeredBy: data.triggeredBy })
          break
        }
        case 'resume': {
          if (this.playbackState) this.playbackState.status = 'playing'
          this.broadcast('playback_state', { state: this.playbackState, triggeredBy: data.triggeredBy })
          break
        }
        case 'seek': {
          if (this.playbackState) this.playbackState.currentTime = data.currentTime
          this.broadcast('progress_sync', { currentTime: data.currentTime, triggeredBy: data.triggeredBy })
          break
        }
        case 'change_song': {
          this.broadcast('change_song', data)
          break
        }
        case 'upload_playlist': {
          if (!this.playbackState) {
            this.playbackState = {
              status: 'paused',
              currentTime: 0,
              timestamp: Date.now(),
            } as any
          }
          this.playbackState!.playlist = data.playlist
          this.broadcast('playback_state', { state: this.playbackState, triggeredBy: data.triggeredBy })
          break
        }
        case 'add_to_playlist': {
          if (!this.playbackState) {
            this.playbackState = {
              playlist: [],
              status: 'paused',
              currentTime: 0,
              timestamp: Date.now(),
            } as any
          }
          if (!this.playbackState.playlist) this.playbackState.playlist = []
          if (Array.isArray(data.musicInfo)) {
             this.playbackState.playlist.push(...data.musicInfo)
          } else {
             this.playbackState.playlist.push(data.musicInfo)
          }
          this.broadcast('playback_state', { state: this.playbackState, triggeredBy: data.triggeredBy })
          break
        }
        case 'send_message': {
          const chatMsg = {
            id: 'msg_' + Date.now(),
            roomId: data.roomId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            content: data.content,
            type: data.type,
            timestamp: Date.now(),
          }
          this.broadcast('new_message', { message: chatMsg })
          break
        }
        case 'reaction': {
          this.broadcast('reaction_received', {
            userId: data.userId,
            emoji: data.emoji,
            timestamp: Date.now(),
          })
          break
        }
      }
    } catch (err) {
      console.log('Error parsing TCP message', err)
    }
  }
}

export const listenTogetherHostServer = new ListenTogetherHostServer()
