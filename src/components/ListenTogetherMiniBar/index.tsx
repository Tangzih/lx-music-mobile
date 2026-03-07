/**
 * 一起听最小化悬浮条
 * 当用户在一起听房间内，但最小化 RoomDetail 页面时，
 * 本组件会挂在 PlayerBar 上方显示房间状态，点击后返回房间。
 */
import React, { useCallback } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Navigation } from 'react-native-navigation'
import { useIsInRoom, useCurrentRoom } from '@/store/listenTogether'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { COMPONENT_IDS } from '@/config/constant'
import { getState as getLTState } from '@/store/listenTogether/state'
import { ROOM_DETAIL_SCREEN } from '@/screens/ListenTogether/RoomDetail/screenNames'

export default function ListenTogetherMiniBar() {
  const theme = useTheme()
  const isInRoom = useIsInRoom()
  const currentRoom = useCurrentRoom()

  const handlePress = useCallback(() => {
    const ltState = getLTState()
    if (!ltState.currentRoom) return
    // 跳回 RoomDetail，不重新加入（已在房间中）
    Navigation.push(COMPONENT_IDS.home, {
      component: {
        name: ROOM_DETAIL_SCREEN,
        passProps: {
          roomId: ltState.currentRoom.id,
        },
      },
    })
  }, [])

  if (!isInRoom || !currentRoom) return null

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.primary }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* 左侧：图标 + 房间名 */}
      <View style={styles.left}>
        <Icon name="account-group" size={16} color="#fff" />
        <Text style={styles.roomName} numberOfLines={1}>
          {currentRoom.name}
        </Text>
      </View>

      {/* 右侧：成员数 + 返回图标 */}
      <View style={styles.right}>
        <Icon name="account" size={14} color="rgba(255,255,255,0.8)" />
        <Text style={styles.memberCount}>
          {currentRoom.currentMembers}/{currentRoom.maxMembers}
        </Text>
        <Icon name="chevron-up" size={16} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6 }} />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    // 圆角只上方
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  roomName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
  },
  memberCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
})
