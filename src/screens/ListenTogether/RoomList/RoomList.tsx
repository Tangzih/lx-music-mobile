import React, { useCallback, useState } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { Navigation } from 'react-native-navigation'
import { useListenTogether, useRoomList } from '@/store/listenTogether'
import { useTheme } from '@/store/theme/hook'
import { useStatusbarHeight } from '@/store/common/hook'
import { disconnectService } from '@/store/listenTogether/hook'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Button from '@/components/common/Button'
import { ROOM_DETAIL_SCREEN, CREATE_ROOM_MODAL } from './screenNames'

interface RoomListItemProps {
  room: LX.ListenTogether.RoomInfo
  onPress: () => void
}

const RoomListItem: React.FC<RoomListItemProps> = ({ room, onPress }) => {
  const theme = useTheme()

  return (
    <TouchableOpacity
      style={[styles.roomItem, { backgroundColor: theme.secondary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.roomHeader}>
        <Text style={[styles.roomName, { color: theme['primary-font'] }]} numberOfLines={1}>
          {room.name}
        </Text>
        {room.isPublic ? (
          <View style={[styles.badge, { backgroundColor: theme.success }]} >
            <Text style={styles.badgeText}>公开</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: theme.warning }]} >
            <Text style={styles.badgeText}>私密</Text>
          </View>
        )}
      </View>

      {room.description ? (
        <Text style={[styles.roomDesc, { color: theme['secondary-font'] }]} numberOfLines={2}>
          {room.description}
        </Text>
      ) : null}

      <View style={styles.roomFooter}>
        <View style={styles.footerItem}>
          <Icon name='account' size={14} color={theme['secondary-font']} />
          <Text style={[styles.footerText, { color: theme['secondary-font'] }]}>
            {room.currentMembers}/{room.maxMembers}
          </Text>
        </View>

        {room.hasPassword && (
          <View style={[styles.footerItem, { marginLeft: 0, marginRight: 16 }]}>
            <Icon name='lock' size={14} color={theme['secondary-font']} />
          </View>
        )}

        <View style={styles.footerItem}>
          <Icon name='account-circle' size={14} color={theme['secondary-font']} />
          <Text style={[styles.footerText, { color: theme['secondary-font'] }]} numberOfLines={1}>
            {room.hostName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

interface Props {
  componentId: string
}

const RoomList: React.FC<Props> = ({ componentId }) => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  const { isConnected, createRoom, joinRoom, refreshRoomList } = useListenTogether()
  const roomList = useRoomList()

  const [refreshing, setRefreshing] = useState(false)

  // Initial load
  React.useEffect(() => {
    if (isConnected) {
      refreshRoomList()
    }
  }, [isConnected, refreshRoomList])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    refreshRoomList()
    setTimeout(() => setRefreshing(false), 1000)
  }, [refreshRoomList])

  const handleCreateRoom = useCallback(() => {
    Navigation.showModal({
      stack: {
        children: [{
          component: {
            name: CREATE_ROOM_MODAL,
            passProps: {
              onCreate: (params: LX.ListenTogether.CreateRoomParams) => {
                createRoom(params)
              },
            },
          },
        }],
      },
    })
  }, [createRoom])

  const handleJoinRoom = useCallback((room: LX.ListenTogether.RoomInfo) => {
    if (room.hasPassword) {
      import('react-native').then(({ Alert }) => {
        Alert.prompt(
          '输入密码',
          '该房间需要密码才能进入',
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '确定', 
              onPress: (password) => {
                if (!password) return
                joinRoom({ roomId: room.id, password })
                Navigation.push(componentId, {
                  component: {
                    name: ROOM_DETAIL_SCREEN,
                    passProps: { roomId: room.id },
                  },
                })
              }
            }
          ],
          'secure-text'
        )
      })
      return
    }

    joinRoom({ roomId: room.id })
    Navigation.push(componentId, {
      component: {
        name: ROOM_DETAIL_SCREEN,
        passProps: {
          roomId: room.id,
        },
      },
    })
  }, [componentId, joinRoom])

  const handleDisconnect = useCallback(() => {
    disconnectService()
    Navigation.pop(componentId)
  }, [componentId])

  const handleBack = useCallback(() => {
    Navigation.pop(componentId)
  }, [componentId])

  const renderRoomItem = useCallback(({ item }: { item: LX.ListenTogether.RoomInfo }) => (
    <RoomListItem room={item} onPress={() => handleJoinRoom(item)} />
  ), [handleJoinRoom])

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: statusBarHeight }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Icon name="arrow-left" size={24} color={theme['primary-font']} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: theme['primary-font'] }]}>房间列表</Text>
        </View>
        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
          <Icon name="exit2" size={22} color={theme['primary-font']} />
        </TouchableOpacity>
      </View>

      {/* Create Room Button */}
      <View style={styles.actionBar}>
        <Button
          onPress={handleCreateRoom}
          disabled={!isConnected}
          style={[
            styles.createBtn,
            { backgroundColor: isConnected ? theme.success : theme.disabled },
          ]}
        >
          <Icon name="plus" size={18} color="#fff" />
          <Text style={styles.createBtnText}>创建房间</Text>
        </Button>
      </View>

      {/* Room List */}
      <FlatList
        data={roomList}
        keyExtractor={(item) => item.id}
        renderItem={renderRoomItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name='music-off' size={48} color={theme['secondary-font']} />
            <Text style={[styles.emptyText, { color: theme['secondary-font'] }]}>
              暂无房间
            </Text>
            <Text style={[styles.emptyHint, { color: theme['secondary-font'] }]}>
              点击上方"创建房间"按钮创建一个新房间
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  disconnectBtn: {
    padding: 8,
  },
  actionBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  listContainer: {
    padding: 12,
  },
  roomItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  roomDesc: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  roomFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  footerText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    marginTop: 8,
    opacity: 0.7,
  },
})

export default RoomList