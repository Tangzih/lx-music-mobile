import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Navigation } from 'react-native-navigation'
import { useListenTogether, useCurrentRoom, useRoomMembers, useRoomMessages, useConnectionStatus, useListenTogetherState } from '@/store/listenTogether'
import { useTheme } from '@/store/theme/hook'
import { useStatusbarHeight } from '@/store/common/hook'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import StatusBar from '@/components/common/StatusBar'
import PageContent from '@/components/PageContent'
import { getListMusics } from '@/core/list'
import { useMyList } from '@/store/list/hook'
import PlayerBar from '@/components/player/PlayerBar'
import CheckBox from '@/components/common/CheckBox'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS, HEADER_HEIGHT } from '@/config/constant'
import PlaylistView from './PlaylistView'
import { scaleSizeH } from '@/utils/pixelRatio'

interface Props {
  componentId: string
  roomId: string
}

// 常量：避免每次渲染时重新创建对象

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
  const statusbarHeight = useStatusbarHeight()
  const [messageInput, setMessageInput] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'playlist'>('chat')
  const [hasJoined, setHasJoined] = useState(false)
  const [showListModal, setShowListModal] = useState(false)
  const [isOverwritePlaylist, setIsOverwritePlaylist] = useState(false)
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false)
  const myLists = useMyList()

  const {
    leaveRoom,
    dissolveRoom,
    joinRoom,
    sendMessage,
    uploadPlaylist,
  } = useListenTogether()
  const ltState = useListenTogetherState()
  const currentRoom = useCurrentRoom()
  const members = useRoomMembers()
  const messages = useRoomMessages()
  const isConnected = useConnectionStatus()

  // 判断当前用户是不是房主
  const isHost = !!currentRoom && !!ltState.userId && currentRoom.hostId === ltState.userId

  // 注册 componentId，确保 DrawerLayoutAndroid 在返回时正确重绘
  useEffect(() => {
    setComponentId(COMPONENT_IDS.listenTogetherRoomDetail, componentId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 本地建房模式下房主已在 Entry 加入房间，无需重复加入；其他情况正常加入
    if (isConnected && roomId && !hasJoined && !ltState.isInRoom) {
      joinRoom({ roomId })
      setHasJoined(true)
    } else if (ltState.isInRoom && !hasJoined) {
      // 已在房间中（本地建房房主），只标记已加入
      setHasJoined(true)
    }
  }, [isConnected, roomId, hasJoined, joinRoom, ltState.isInRoom])

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
    // 点击返回时，仅最小化页面，不退出房间
    Navigation.pop(componentId)
  }, [componentId])

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
  const canControlPlayback = !!currentRoom && (currentRoom.allowMemberControl === true || currentRoom.hostId === ltState.userId)

  // 打开上传歌单弹窗
  const handleOpenPlaylistModal = useCallback(() => {
    if (!canControlPlayback) return
    setShowListModal(true)
  }, [canControlPlayback])

  // 上传选定的本地歌单到房间播放列表
  const handleSelectPlaylist = useCallback((listInfo: LX.List.MyListInfo) => {
    if (!canControlPlayback) return

    const actionText = isOverwritePlaylist ? '此操作会覆盖掉所有歌曲，确定吗？' : '是否追加到播放列表？'
    
    Alert.alert(
      '提示',
      actionText,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          onPress: async () => {
             setShowListModal(false)
             setIsImportingPlaylist(true)
             try {
               const listMusics = await getListMusics(listInfo.id)
               if (listMusics && listMusics.length > 0) {
                 if (isOverwritePlaylist) {
                   uploadPlaylist(listMusics)
                 } else {
                   // 追加模式：合并现有列表，用 uploadPlaylist 一次发送避免 N 条 TCP 消息
                   const existing = currentRoom?.playbackState?.playlist ?? []
                   const existingIds = new Set(existing.map(s => s.id))
                   const newSongs = listMusics.filter(s => !existingIds.has(s.id))
                   if (newSongs.length > 0) {
                     uploadPlaylist([...existing, ...newSongs])
                   }
                 }
               }
             } catch (err) {
               console.error('Failed to upload/append playlist:', err)
             } finally {
               setIsImportingPlaylist(false)
             }
          }
        }
      ]
    )
  }, [canControlPlayback, isOverwritePlaylist, uploadPlaylist, currentRoom?.playbackState?.playlist])

  return (
    <PageContent skipStatusbarUpdate>
      <StatusBar />
      {/* 顶部导航 */}
      <View
        style={[
          styles.navBar,
          {
            borderBottomColor: theme['c-primary-light-100-alpha-300'],
            height: scaleSizeH(HEADER_HEIGHT) + statusbarHeight,
            paddingTop: statusbarHeight,
          },
        ]}
      >
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
              <Text style={[styles.roomInfoText, { color: theme['c-font'] }]} >
                人数: {currentRoom.currentMembers}/{currentRoom.maxMembers}
              </Text>
            </View>
            <View style={styles.roomInfoRow}>
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
          { key: 'chat' as const, label: '聊天', icon: 'comment' },
          { key: 'members' as const, label: '成员' },
          { key: 'playlist' as const, label: '播放列表', icon: 'list-order' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && { borderBottomColor: theme['c-primary-font'] },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            {tab.icon && (
              <Icon
                name={tab.icon}
                size={18}
                color={activeTab === tab.key ? theme['c-primary-font'] : theme['c-500']}
              />
            )}
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
                <Text style={{ color: messageInput.trim() ? theme['c-button-font'] : theme['c-500'], fontSize: 13, fontWeight: 'bold' }}>发送</Text>
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
                onPress={handleOpenPlaylistModal}
              >
                <Icon name='add_folder' size={16} color={theme['c-button-font']} />
                <Text style={[styles.actionBtnText, { color: theme['c-button-font'] }]}>上传歌单</Text>
              </TouchableOpacity>
            </View>

            {isImportingPlaylist ? (
              <View style={styles.emptyPlaylist}>
                <ActivityIndicator size="large" color={theme['c-primary-font']} />
                <Text style={[styles.emptyText, { color: theme['c-500'] }]}>正在加载歌单...</Text>
              </View>
            ) : (
              <PlaylistView
                playlist={currentRoom?.playbackState?.playlist ?? []}
                currentIndex={currentRoom?.playbackState?.currentIndex ?? -1}
                canControl={canControlPlayback}
              />
            )}
          </View>
        )}
      </View>

      {/* 歌单选择弹窗 */}
      <Modal
        visible={showListModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowListModal(false)}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowListModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme['c-content-background'] }]}>
            <Text style={[styles.modalTitle, { color: theme['c-font'] }]}>选择要上传的歌单</Text>
            
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {myLists.map(list => (
                <TouchableOpacity
                  key={list.id}
                  style={[styles.modalListItem, { borderBottomColor: theme['c-primary-light-100-alpha-300'] }]}
                  onPress={() => handleSelectPlaylist(list)}
                >
                  <Icon name="list-music" size={20} color={theme['c-500']} />
                  <Text style={{ marginLeft: 12, fontSize: 14, color: theme['c-font'] }}>
                    {list.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalAction}>
               <CheckBox 
                 check={isOverwritePlaylist} 
                 onChange={setIsOverwritePlaylist}
                 label="覆盖所有歌曲"
               />
            </View>
          </View>
        </View>
      </Modal>

      <PlayerBar hideRoomBar />
    </PageContent>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 300,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalAction: {
    marginTop: 16,
    paddingTop: 16,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  },
  playlistActions: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
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
