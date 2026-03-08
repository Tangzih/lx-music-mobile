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
import { useListenTogether, useCurrentRoom, useRoomMembers, useRoomMessages, useConnectionStatus, useIsInRoom, useListenTogetherState } from '@/store/listenTogether'
import { Alert } from 'react-native'
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
    <View style={[styles.memberItem, { borderBottomColor: theme['c-primary-light-100-alpha-300'] }]} >
      <View style={styles.memberAvatar}>
        {member.avatar ? (
          <Image source={{ uri: member.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme['c-primary-light-100-alpha-300'] }]} >
            <Text style={[styles.avatarText, { color: theme['c-font'] }]} >
              {member.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: theme['c-font'] }]} >
          {member.name}
          {isHost && (
            <Text style={[styles.hostBadge, { color: theme['c-primary-font'] }]} > 房主</Text>
          )}
        </Text>
        <Text style={[styles.memberStatus, { color: theme['c-500'] }]} >
          {member.isOnline ? '在线' : '离线'}
        </Text>
      </View>

      {member.role === 'admin' && (
        <View style={[styles.roleBadge, { backgroundColor: theme['c-button-background'] }]} >
          <Text style={[styles.roleText, { color: theme['c-button-font'] }]}>管理</Text>
        </View>
      )}
    </View>
  )
}

const RoomDetail: React.FC<Props> = ({ componentId, roomId }) => {
  const theme = useTheme()
  const [messageInput, setMessageInput] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'playlist'>('chat')
  const [hasJoined, setHasJoined] = useState(false)

  const {
    leaveRoom,
    dissolveRoom,
    joinRoom,
    sendMessage,
    sendReaction,
    changeSong,
    play,
    pause,
    seek,
    uploadPlaylist,
    addToQueue,
  } = useListenTogether()
  const ltState = useListenTogetherState()
  const currentRoom = useCurrentRoom()
  const members = useRoomMembers()
  const messages = useRoomMessages()
  const isConnected = useConnectionStatus()

  // 判断当前用户是不是房主
  const isHost = !!currentRoom && !!ltState.userId && currentRoom.hostId === ltState.userId

  useEffect(() => {
    // 连接就就加入房间（仅一次）
    if (isConnected && roomId && !hasJoined) {
      joinRoom({ roomId })
      setHasJoined(true)
    }
  }, [isConnected, roomId, hasJoined, joinRoom])

  // 监听房间解散事件
  useEffect(() => {
    if (ltState.error && ltState.error.includes('解散') && !ltState.isInRoom) {
      Alert.alert('房间已解散', ltState.error || '房主已离开，房间已解散', [
        {
          text: '确定',
          onPress: () => Navigation.pop(componentId),
        },
      ])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ltState.error, ltState.isInRoom])

  const handleBack = useCallback(() => {
    // 当成员点返回时，退出房间
    leaveRoom()
    Navigation.pop(componentId)
  }, [componentId, leaveRoom])

  const handleLeaveOrDissolve = useCallback(() => {
    if (isHost) {
      Alert.alert(
        '解散房间',
        '你是房主，离开后房间将解散，所有成员将被踢出。确定解散吗？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '解散房间',
            style: 'destructive',
            onPress: () => {
              dissolveRoom()
              Navigation.pop(componentId)
            },
          },
        ]
      )
    } else {
      Alert.alert(
        '退出房间',
        '确定退出当前房间？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '退出',
            style: 'destructive',
            onPress: () => {
              leaveRoom()
              Navigation.pop(componentId)
            },
          },
        ]
      )
    }
  }, [isHost, dissolveRoom, leaveRoom, componentId])

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
    <View style={[styles.messageItem, { backgroundColor: theme['c-primary-light-100-alpha-300'] }]} >
      <View style={styles.messageHeader}>
        <Text style={[styles.senderName, { color: theme['c-font'] }]} >
          {item.senderName}
        </Text>
        <Text style={[styles.messageTime, { color: theme['c-500'] }]} >
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={[styles.messageContent, { color: theme['c-font'] }]} >
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
      <View style={[styles.navBar, { borderBottomColor: theme['c-primary-light-100-alpha-300'] }]} >
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Icon name='arrow-left' size={24} color={theme['c-font']} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme['c-font'] }]} >
          {currentRoom?.name ?? '房间'}
        </Text>
        <TouchableOpacity onPress={handleLeaveOrDissolve} style={styles.syncBtn}>
          <Icon name='exit2' size={20} color={isHost ? theme['c-error'] ?? '#f44' : theme['c-font']} />
        </TouchableOpacity>
      </View>

      {/* 房间信息 */}
      {currentRoom && (
        <View style={styles.roomInfo} >
          <View style={[styles.roomInfoContainer, { backgroundColor: theme['c-primary-light-100-alpha-300'] }]}>
            <View style={styles.roomInfoRow}>
              <Icon name='account' size={16} color={theme['c-500']} />
              <Text style={[styles.roomInfoText, { color: theme['c-font'] }]} >
                {currentRoom.currentMembers}/{currentRoom.maxMembers} 人
              </Text>
            </View>
            <View style={styles.roomInfoRow}>
              <Icon name='account-circle' size={16} color={theme['c-500']} />
              <Text style={[styles.roomInfoText, { color: theme['c-font'] }]} >
                房主: {currentRoom.hostName}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 标签栏 */}
      <View style={[styles.tabBar, { borderBottomColor: theme['c-primary-light-100-alpha-300'] }]} >
        {[
          { key: 'chat' as const, label: '聊天', icon: 'message-text' },
          { key: 'members' as const, label: '成员', icon: 'account-group' },
          { key: 'playlist' as const, label: '播放列表', icon: 'playlist-music' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && { borderBottomColor: theme['c-primary-font'] },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Icon
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? theme['c-primary-font'] : theme['c-500']}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? theme['c-primary-font'] : theme['c-500'] },
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
            <View style={[styles.inputContainer, { backgroundColor: theme['c-content-background'], borderTopColor: theme['c-primary-light-100-alpha-300'] }]} >
              <TextInput
                style={[styles.input, { color: theme['c-font'], backgroundColor: theme['c-main-background'] }]}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder='说点什么...'
                placeholderTextColor={theme['c-500']}
                multiline
                maxLength={200}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: messageInput.trim() ? theme['c-button-background'] : theme['c-primary-light-100-alpha-300'] }]}
                onPress={handleSendMessage}
                disabled={!messageInput.trim()}
              >
                <Icon name='send' size={18} color={messageInput.trim() ? theme['c-button-font'] : theme['c-500']} />
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
                style={[styles.actionBtn, { backgroundColor: theme['c-button-background'] }]}
                onPress={handleUploadPlaylist}
              >
                <Icon name='upload' size={16} color={theme['c-button-font']} />
                <Text style={[styles.actionBtnText, { color: theme['c-button-font'] }]}>上传歌单</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme['c-primary-light-100-alpha-300'] }]}
                onPress={handleAddSong}
              >
                <Icon name='plus' size={16} color={theme['c-font']} />
                <Text style={[styles.actionBtnText, { color: theme['c-font'] }]}>添加歌曲</Text>
              </TouchableOpacity>
            </View>

            {/* 当前播放 */}
            {currentRoom?.playbackState?.currentSong && (
              <View style={[styles.currentSongSection, { borderBottomColor: theme['c-primary-light-100-alpha-300'] }]}>
                <Text style={[styles.sectionTitle, { color: theme['c-500'] }]}>正在播放</Text>
                <View style={[styles.listItem, { backgroundColor: theme['c-primary-background-hover'], borderRadius: 8 }]}>
                    <Icon style={styles.listSn} name="play-outline" size={13} color={theme['c-primary-font']} />
                    <View style={styles.listItemInfo}>
                      <Text style={{ color: theme['c-primary-font'], fontWeight: '600' }}>{currentRoom.playbackState.currentSong.name}</Text>
                      <View style={styles.listItemSingle}>
                        <Text style={{ fontSize: 11, color: theme['c-primary-alpha-200'] }}>{currentRoom.playbackState.currentSong.singer}</Text>
                      </View>
                    </View>
                </View>
              </View>
            )}

            {/* 待播放队列 */}
            {currentRoom?.playbackState?.queue && currentRoom.playbackState.queue.length > 0 && (
              <View style={styles.queueSection}>
                <Text style={[styles.sectionTitle, { color: theme['c-500'] }]}>
                  待播放 ({currentRoom.playbackState.queue.length})
                </Text>
                {currentRoom.playbackState.queue.map((item, index) => (
                  <View key={`queue-${index}`} style={[styles.listItem, { backgroundColor: theme['c-primary-light-100-alpha-300'], borderRadius: 6, marginBottom: 6 }]}>
                    <Text style={[styles.listSn, { color: theme['c-300'] }]} size={13}>{index + 1}</Text>
                    <View style={styles.listItemInfo}>
                      <Text style={{ color: theme['c-font'] }}>
                        {item.name}
                      </Text>
                      <View style={styles.listItemSingle}>
                        <Text style={{ fontSize: 11, color: theme['c-500'] }}>
                          {item.singer}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 播放列表 */}
            {currentRoom?.playbackState?.playlist && currentRoom.playbackState.playlist.length > 0 ? (
              <View style={styles.playlistSection}>
                <Text style={[styles.sectionTitle, { color: theme['c-500'] }]}>
                  播放列表 ({currentRoom.playbackState.playlist.length})
                </Text>
                <FlatList
                  data={currentRoom.playbackState.playlist}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={[
                        styles.listItem,
                        index === currentRoom.playbackState?.currentIndex && {
                          backgroundColor: theme['c-primary-background-hover'],
                        },
                      ]}
                      onPress={() => canControlPlayback && changeSong(index)}
                      disabled={!canControlPlayback}
                    >
                      {index === currentRoom.playbackState?.currentIndex ?
                        <Icon style={styles.listSn} name="play-outline" size={13} color={theme['c-primary-font']} /> :
                        <Text style={styles.listSn} size={13} color={theme['c-300']}>{index + 1}</Text>
                      }
                      <View style={styles.listItemInfo}>
                        <Text style={{ color: index === currentRoom.playbackState?.currentIndex ? theme['c-primary-font'] : theme['c-font'] }}>
                          {item.name}
                        </Text>
                        <View style={styles.listItemSingle}>
                          <Text style={{ fontSize: 11, color: index === currentRoom.playbackState?.currentIndex ? theme['c-primary-alpha-200'] : theme['c-500'] }}>
                            {item.singer}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : (
              <View style={styles.emptyPlaylist}>
                <Icon name='playlist-music' size={48} color={theme['c-500']} />
                <Text style={[styles.emptyText, { color: theme['c-500'] }]} >
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  roomInfoContainer: {
    flexDirection: 'row',
    padding: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 2,
    height: 54,
  },
  listSn: {
    width: 38,
    textAlign: 'center',
    paddingLeft: 3,
    paddingRight: 3,
  },
  listItemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 2,
  },
  listItemSingle: {
    paddingTop: 3,
    flexDirection: 'row',
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
