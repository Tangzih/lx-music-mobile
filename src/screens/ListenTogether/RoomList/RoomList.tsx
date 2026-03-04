import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { Navigation } from 'react-native-navigation'
import { useListenTogether, useRoomList, useMyRooms } from '@/store/listenTogether'
import { useTheme } from '@/store/theme/hook'
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
  const { isConnected, createRoom, joinRoom } = useListenTogether()
  const roomList = useRoomList()
  const myRooms = useMyRooms()

  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'recommend' | 'my' | 'joined'>('recommend')

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    // 这里应该调用刷新房间列表的方法
    // await refreshRoomList()
    setRefreshing(false)
  }, [])

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
    Navigation.push(componentId, {
      component: {
        name: ROOM_DETAIL_SCREEN,
        passProps: {
          roomId: room.id,
        },
      },
    })
  }, [componentId])

  const renderRoomItem = useCallback(({ item }: { item: LX.ListenTogether.RoomInfo }) => (
    <RoomListItem room={item} onPress={() => handleJoinRoom(item)} />
  ), [handleJoinRoom])

  const getCurrentList = () => {
    switch (activeTab) {
      case 'recommend':
        return roomList
      case 'my':
        return myRooms
      case 'joined':
        // 应该返回已加入的房间
        return []
      default:
        return roomList
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]} >
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme['primary-font'] }]} >一起听</Text>
        <Button
          onPress={handleCreateRoom}
          disabled={!isConnected}
          style={[styles.createBtn, { backgroundColor: isConnected ? theme.success : theme.disabled }]}
        >
          <Text style={styles.createBtnText}>创建房间</Text>
        </Button>
      </View>

      {/* 标签栏 */}
      <View style={styles.tabBar}>
        {[
          { key: 'recommend' as const, label: '推荐' },
          { key: 'my' as const, label: '我的房间' },
          { key: 'joined' as const, label: '已加入' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && { borderBottomColor: theme.primary },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? theme['primary-font'] : theme['secondary-font'] },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 房间列表 */}
      <FlatList
        data={getCurrentList()}
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
            <Text style={[styles.emptyText, { color: theme['secondary-font'] }]} >
              暂无房间
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 14,
    marginTop: 12,
  },
})

export default RoomList
