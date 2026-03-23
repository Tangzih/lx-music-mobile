import { useCallback, useRef, useState } from 'react'
import { View, FlatList, TouchableOpacity } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { createStyle, getRowInfo } from '@/utils/tools'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import ListItem, { ITEM_HEIGHT } from '@/screens/Home/Views/Mylist/MusicList/ListItem'
import Menu, { type MenuType, type Menus, type Position } from '@/components/common/Menu'
import MusicAddModal, { type MusicAddModalType } from '@/components/MusicAddModal'
import { useListenTogether, useCurrentRoom } from '@/store/listenTogether'
import { addTempPlayList } from '@/core/player/tempPlayList'
import { LISTEN_TOGETHER_ROOM_PLAYLIST_ID } from '@/core/listenTogether/constants'

const EMPTY_SELECTED: LX.Music.MusicInfo[] = []
const rowInfo = getRowInfo()

const menuList: Menus = [
  { action: 'play', label: '播放' },
  { action: 'playLater', label: '下一首播放' },
  { action: 'add', label: '添加到本地歌单' },
  { action: 'remove', label: '从列表删除' },
]

interface Props {
  playlist: LX.Music.MusicInfo[]
  currentIndex: number
  canControl: boolean
}

const EmptyView = () => {
  const theme = useTheme()
  return (
    <View style={styles.empty}>
      <Icon name="list-order" size={48} color={theme['c-500']} />
      <Text style={{ marginTop: 12 }} size={14} color={theme['c-500']}>播放列表为空</Text>
    </View>
  )
}

export default ({ playlist, currentIndex, canControl }: Props) => {
  const theme = useTheme()
  const { changeSong, uploadPlaylist } = useListenTogether()
  const currentRoom = useCurrentRoom()
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')

  const menuRef = useRef<MenuType>(null)
  const musicAddModalRef = useRef<MusicAddModalType>(null)
  const selectedItemRef = useRef<{ item: LX.Music.MusicInfo; index: number } | null>(null)
  const [menuVisible, setMenuVisible] = useState(false)

  const handlePress = useCallback((item: LX.Music.MusicInfo, index: number) => {
    if (canControl) changeSong(index)
  }, [canControl, changeSong])

  const handleLongPress = useCallback((item: LX.Music.MusicInfo, index: number) => {
    // Long press has no special action for now; menu is via the ... button
  }, [])

  const handleShowMenu = useCallback((item: LX.Music.MusicInfo, index: number, position: Position) => {
    selectedItemRef.current = { item, index }
    if (menuVisible) {
      menuRef.current?.show(position)
    } else {
      setMenuVisible(true)
      requestAnimationFrame(() => {
        menuRef.current?.show(position)
      })
    }
  }, [menuVisible])

  const handleMenuPress = useCallback(({ action }: Menus[number]) => {
    const selected = selectedItemRef.current
    if (!selected) return
    const { item, index } = selected

    switch (action) {
      case 'play':
        if (canControl) changeSong(index)
        break
      case 'playLater':
        addTempPlayList([{ listId: LISTEN_TOGETHER_ROOM_PLAYLIST_ID, musicInfo: item }])
        break
      case 'add':
        musicAddModalRef.current?.show({ musicInfo: item, listId: '', isMove: false })
        break
      case 'remove':
        if (canControl) {
          const updated = (currentRoom?.playbackState?.playlist ?? playlist).filter((_, i) => i !== index)
          uploadPlaylist(updated)
        }
        break
    }
  }, [canControl, changeSong, currentRoom, playlist, uploadPlaylist])

  const renderItem = useCallback(({ item, index }: { item: LX.Music.MusicInfo; index: number }) => (
    <ListItem
      item={item}
      index={index}
      activeIndex={currentIndex}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onShowMenu={handleShowMenu}
      selectedList={EMPTY_SELECTED}
      rowInfo={rowInfo}
      isShowAlbumName={isShowAlbumName}
      isShowInterval={isShowInterval}
    />
  ), [currentIndex, handlePress, handleLongPress, handleShowMenu, isShowAlbumName, isShowInterval])

  const getItemLayout = useCallback((_: unknown, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), [])

  return (
    <View style={styles.container}>
      <FlatList
        data={playlist}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        maxToRenderPerBatch={8}
        windowSize={8}
        removeClippedSubviews={true}
        initialNumToRender={16}
        showsVerticalScrollIndicator={false}
        extraData={currentIndex}
        ListEmptyComponent={EmptyView}
      />
      {menuVisible && (
        <Menu
          ref={menuRef}
          menus={menuList}
          onPress={handleMenuPress}
          onHide={() => {}}
        />
      )}
      <MusicAddModal ref={musicAddModalRef} />
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
})
