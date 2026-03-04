import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native'
import { Navigation } from 'react-native-navigation'
import { useListenTogether, useCurrentRoom, useRoomMembers, useRoomMessages, useConnectionStatus, useIsInRoom } from '@/store/listenTogether'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Button from '@/components/common/Button'
import PageContent from '@/components/PageContent'
import { getListMusics } from '@/utils/data'

interface Props {
  componentId: string
  roomId: string
}

interface MemberItemProps {
  member: LX.ListenTogether.RoomMember
  isHost: boolean
}

const MemberItem: React.FC<MemberItemProps> = ({ member, isHost }) => {
  const theme = useTheme()

  return (
    <View style={[styles.memberItem, { backgroundColor: theme.secondary }]} >
      <View style={styles.memberAvatar}>
        {member.avatar ? (
          <Image source={{ uri: member.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]} >
            <Text style={[styles.avatarText, { color: theme['primary-font'] }]} >
              {member.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: theme['primary-font'] }]} >
          {member.name}
          {isHost && (
            <Text style={[styles.hostBadge, { color: theme.success }]} > 房主</Text>
          )}
        </Text>
        <Text style={[styles.memberStatus, { color: theme['secondary-font'] }]} >
          {member.isOnline ? '在线' : '离线'}
        </Text>
      </View>

      {member.role === 'admin' && (
        <View style={[styles.roleBadge, { backgroundColor: theme.warning }]} >
          <Text style={styles.roleText}>管理</Text>
        </View>
      )}
    </View>
  )
}

const RoomDetail: React.FC<Props> = ({ componentId, roomId }) => {
  const theme = useTheme()
  const [messageInput, setMessageInput] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'playlist'>('chat')

  const {
    leaveRoom,
    sendMessage,
    sendReaction,
    changeSong,
    play,
    pause,
    seek,
    uploadPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    addToQueue,
  } = useListenTogether()
  const currentRoom = useCurrentRoom()
  const members = useRoomMembers()
  const messages = useRoomMessages()
  const isConnected = useConnectionStatus()
  const isInRoom = useIsInRoom()

  useEffect(() => {
    // 加入房间
    if (isConnected && roomId) {
      // joinRoom({ roomId })
    }

    return () => {
      leaveRoom()
    }
  }, [roomId, isConnected])

  const handleBack = useCallback(() => {
    Navigation.pop(componentId)
  }, [componentId])

  const handleSendMessage = useCallback(() => {
    if (messageInput.trim()) {
      sendMessage(messageInput.trim())
      setMessageInput('')
    }
  }, [messageInput, sendMessage])

  const handleReaction = useCallback((emoji: string) => {
    sendReaction(emoji)
  }, [sendReaction])

  const handleSyncPlayback = useCallback(() => {
    if (!currentRoom?.playbackState) return

    // 同步播放状态
    const { currentSong, isPlaying, currentTime } = currentRoom.playbackState
    if (currentSong) {
      // TODO: 播放指定歌曲
      console.log('syncPlayback', { currentSong, isPlaying, currentTime })
    }
  }, [currentRoom])

  const renderMessage = useCallback(({ item }: { item: LX.ListenTogether.ChatMessage }) => (
    <View style={[styles.messageItem, { backgroundColor: theme.secondary }]} >
      <View style={styles.messageHeader}>
        <Text style={[styles.senderName, { color: theme['primary-font'] }]} >
          {item.senderName}
        </Text>
        <Text style={[styles.messageTime, { color: theme['secondary-font'] }]} >
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={[styles.messageContent, { color: theme['primary-font'] }]} >
        {item.content}
      </Text>
    </View>
  ), [theme])

  // 判断当前用户是否可以控制播放
  // 房主始终可以控制，如果 allowMemberControl 为 true 则成员也可以控制
  const canControlPlayback = currentRoom?.allowMemberControl === true || currentRoom?.hostId != null

  // 上传本地歌单到房间播放列表
  const handleUploadPlaylist = useCallback(async () => {
    if (!canControlPlayback) return

    // 获取本地收藏列表的歌曲
    try {
      const defaultListMusics = await getListMusics('default')
      if (defaultListMusics && defaultListMusics.length > 0) {
        uploadPlaylist(defaultListMusics)
      }
    } catch (err) {
      console.error('Failed to upload playlist:', err)
    }
  }, [canControlPlayback, uploadPlaylist])

  // 添加歌曲到播放列表
  const handleAddSong = useCallback(() => {
    if (!canControlPlayback) return
    // TODO: 打开歌曲选择器
    console.log('Add song to playlist')
  }, [canControlPlayback])

  return (
    <PageContent style={styles.container}>
      {/* 顶部导航 */}
      <View style={[styles.navBar, { borderBottomColor: theme.border }]} >
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Icon name='arrow-left' size={24} color={theme['primary-font']} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme['primary-font'] }]} >
          {currentRoom?.name ?? '房间'}
        </Text>
        <TouchableOpacity onPress={handleSyncPlayback} style={styles.syncBtn}>
          <Icon name='sync' size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* 房间信息 */}
      {currentRoom && (
        <View style={[styles.roomInfo, { backgroundColor: theme.secondary }]} >
          <View style={styles.roomInfoRow}>
            <Icon name='account' size={16} color={theme['secondary-font']} />
            <Text style={[styles.roomInfoText, { color: theme['secondary-font'] }]} >
              {currentRoom.currentMembers}/{currentRoom.maxMembers} 人
            </Text>
          </View>
          <View style={styles.roomInfoRow}>
            <Icon name='account-circle' size={16} color={theme['secondary-font']} />
            <Text style={[styles.roomInfoText, { color: theme['secondary-font'] }]} >
              房主: {currentRoom.hostName}
            </Text>
          </View>
        </View>
      )}

      {/* 标签栏 */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]} >
        {[
          { key: 'chat' as const, label: '聊天', icon: 'message-text' },
          { key: 'members' as const, label: '成员', icon: 'account-group' },
          { key: 'playlist' as const, label: '播放列表', icon: 'playlist-music' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && { borderBottomColor: theme.primary },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Icon
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? theme.primary : theme['secondary-font']}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? theme.primary : theme['secondary-font'] },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 内容区域 */}
      <View style={styles.content}>
        {activeTab === 'chat' && (
          <>
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              inverted={false}
              showsVerticalScrollIndicator={false}
            />
            <View style={[styles.inputContainer, { backgroundColor: theme.secondary, borderTopColor: theme.border }]} >
              <TextInput
                style={[styles.input, { color: theme['primary-font'], backgroundColor: theme.primary }]}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder='说点什么...'
                placeholderTextColor={theme['secondary-font']}
                multiline
                maxLength={200}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: messageInput.trim() ? theme.primary : theme.disabled }]}
                onPress={handleSendMessage}
                disabled={!messageInput.trim()}
              >
                <Icon name='send' size={18} color='#fff' />
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'members' && (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MemberItem
                member={item}
                isHost={item.id === currentRoom?.hostId}
              />
            )}
            contentContainerStyle={styles.memberList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {activeTab === 'playlist' && (
          <View style={styles.playlistContainer}>
            {/* 操作按钮 */}
            <View style={styles.playlistActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                onPress={handleUploadPlaylist}
              >
                <Icon name='upload' size={16} color='#fff' />
                <Text style={styles.actionBtnText}>上传歌单</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.secondary }]}
                onPress={handleAddSong}
              >
                <Icon name='plus' size={16} color={theme['primary-font']} />
                <Text style={[styles.actionBtnText, { color: theme['primary-font'] }]}>添加歌曲</Text>
              </TouchableOpacity>
            </View>

            {/* 当前播放 */}
            {currentRoom?.playbackState?.currentSong && (
              <View style={[styles.currentSongSection, { borderBottomColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme['secondary-font'] }]}>正在播放</Text>
                <View style={[styles.currentSongItem, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.songName, { color: theme.primary, fontWeight: '600' }]}>
                    {currentRoom.playbackState.currentSong.name}
                  </Text>
                  <Text style={[styles.singerName, { color: theme['secondary-font'] }]}>
                    {currentRoom.playbackState.currentSong.singer}
                  </Text>
                </View>
              </View>
            )}

            {/* 待播放队列 */}
            {currentRoom?.playbackState?.queue && currentRoom.playbackState.queue.length > 0 && (
              <View style={styles.queueSection}>
                <Text style={[styles.sectionTitle, { color: theme['secondary-font'] }]}>
                  待播放 ({currentRoom.playbackState.queue.length})
                </Text>
                {currentRoom.playbackState.queue.map((item, index) => (
                  <View key={`queue-${index}`} style={[styles.queueItem, { backgroundColor: theme.secondary }]}>
                    <Text style={[styles.songName, { color: theme['primary-font'] }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.singerName, { color: theme['secondary-font'] }]}>
                      {item.singer}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* 播放列表 */}
            {currentRoom?.playbackState?.playlist && currentRoom.playbackState.playlist.length > 0 ? (
              <View style={styles.playlistSection}>
                <Text style={[styles.sectionTitle, { color: theme['secondary-font'] }]}>
                  播放列表 ({currentRoom.playbackState.playlist.length})
                </Text>
                <FlatList
                  data={currentRoom.playbackState.playlist}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={[
                        styles.playlistItem,
                        index === currentRoom.playbackState?.currentIndex && {
                          backgroundColor: theme.primary + '20',
                        },
                      ]}
                      onPress={() => canControlPlayback && changeSong(index)}
                      disabled={!canControlPlayback}
                    >
                      <Text style={[styles.songName, { color: theme['primary-font'] }]} >
                        {item.name}
                      </Text>
                      <Text style={[styles.singerName, { color: theme['secondary-font'] }]} >
                        {item.singer}
                      </Text>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : (
              <View style={styles.emptyPlaylist}>
                <Icon name='playlist-music' size={48} color={theme['secondary-font']} />
                <Text style={[styles.emptyText, { color: theme['secondary-font'] }]} >
                  播放列表为空
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </PageContent>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  navTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  syncBtn: {
    padding: 8,
    marginRight: -8,
  },
  roomInfo: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
  },
  roomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  roomInfoText: {
    fontSize: 12,
    marginLeft: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 12,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  messageList: {
    padding: 12,
  },
  messageItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 11,
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  memberList: {
    padding: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
  },
  hostBadge: {
    fontSize: 12,
  },
  memberStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  playlistContainer: {
    flex: 1,
    padding: 12,
  },
  playlistActions: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  currentSongSection: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  queueSection: {
    marginBottom: 12,
  },
  playlistSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  currentSongItem: {
    padding: 12,
    borderRadius: 8,
  },
  queueItem: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  playlistItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  songName: {
    fontSize: 14,
    fontWeight: '500',
  },
  singerName: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyPlaylist: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
})

export default RoomDetail
