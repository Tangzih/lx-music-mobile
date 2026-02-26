import { memo, useRef, useState, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react'
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, type FlatListProps } from 'react-native'

import ListItem, { ITEM_HEIGHT } from './ListItem'
import { createStyle, getRowInfo } from '@/utils/tools'
import { usePlayInfo, usePlayMusicInfo } from '@/store/player/hook'
import type { Position } from './ListMenu'
import type { SelectMode } from './MultipleModeBar'
import { useSettingValue } from '@/store/setting/hook'
import { playList } from '@/core/player/player'

type FlatListType = FlatListProps<LX.Music.MusicInfo>

export interface ListProps {
  musicList: LX.Music.MusicInfoOnline[]
  onShowMenu: (musicInfo: LX.Music.MusicInfo, index: number, position: Position) => void
  onMuiltSelectMode: () => void
  onSelectAll: (isAll: boolean) => void
}

export interface ListType {
  setIsMultiSelectMode: (isMultiSelectMode: boolean) => void
  setSelectMode: (mode: SelectMode) => void
  selectAll: (isAll: boolean) => void
  getSelectedList: () => LX.List.ListMusics
  scrollToInfo: (info: LX.Music.MusicInfo) => void
  scrollToTop: () => void
}

const List = forwardRef<ListType, ListProps>(({ musicList, onShowMenu, onMuiltSelectMode, onSelectAll }, ref) => {
  const flatListRef = useRef<FlatList>(null)
  const [currentList, setList] = useState<LX.List.ListMusics>([])
  const isMultiSelectModeRef = useRef(false)
  const selectModeRef = useRef<SelectMode>('single')
  const prevSelectIndexRef = useRef(-1)
  const [selectedList, setSelectedList] = useState<LX.List.ListMusics>([])
  const selectedListRef = useRef<LX.List.ListMusics>([])
  const rowInfo = useRef(getRowInfo())
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')

  useImperativeHandle(ref, () => ({
    setIsMultiSelectMode(isMultiSelectMode) {
      isMultiSelectModeRef.current = isMultiSelectMode
      if (!isMultiSelectMode) {
        prevSelectIndexRef.current = -1
        handleUpdateSelectedList([])
      }
    },
    setSelectMode(mode) {
      selectModeRef.current = mode
    },
    selectAll(isAll) {
      let list: LX.List.ListMusics
      if (isAll) {
        list = [...currentList]
      } else {
        list = []
      }
      selectedListRef.current = list
      setSelectedList(list)
    },
    getSelectedList() {
      return selectedListRef.current
    },
    scrollToInfo(info) {
      const index = currentList.findIndex(m => m.id == info.id)
      if (index < 0) return
      flatListRef.current?.scrollToIndex({ index: Math.floor(index / (rowInfo.current.rowNum ?? 1)), viewPosition: 0.3, animated: true })
    },
    scrollToTop() {
      flatListRef.current?.scrollToOffset({
        offset: 0,
        animated: true,
      })
    },
  }))

  useEffect(() => {
    setList([...musicList])
    selectedListRef.current = []
    setSelectedList([])
  }, [musicList])

  const playMusicInfo = usePlayMusicInfo()
  const playInfo = usePlayInfo()

  const activeIndex = useMemo(() => {
    // 推荐列表使用临时列表的播放状态
    return playMusicInfo.listId == 'temp' ? playInfo.playIndex : -1
  }, [playMusicInfo.listId, playInfo.playIndex])

  const handlePlay = useCallback((index: number) => {
    void playList('temp', index)
  }, [])

  const handleUpdateSelectedList = useCallback((newList: LX.List.ListMusics) => {
    selectedListRef.current = newList
    setSelectedList(newList)
  }, [])

  const handleSelect = useCallback((item: LX.Music.MusicInfo, pressIndex: number) => {
    let newList: LX.List.ListMusics
    if (selectModeRef.current == 'single') {
      prevSelectIndexRef.current = pressIndex
      const index = selectedListRef.current.indexOf(item)
      if (index < 0) {
        newList = [...selectedListRef.current, item]
      } else {
        newList = [...selectedListRef.current]
        newList.splice(index, 1)
      }
    } else {
      if (selectedListRef.current.length) {
        const prevIndex = prevSelectIndexRef.current
        const currentIndex = pressIndex
        if (prevIndex == currentIndex) {
          newList = []
        } else if (currentIndex > prevIndex) {
          newList = currentList.slice(prevIndex, currentIndex + 1)
        } else {
          newList = currentList.slice(currentIndex, prevIndex + 1)
          newList.reverse()
        }
      } else {
        newList = [item]
        prevSelectIndexRef.current = pressIndex
      }
    }

    handleUpdateSelectedList(newList)
  }, [currentList, handleUpdateSelectedList])

  const handlePress = useCallback((item: LX.Music.MusicInfo, index: number) => {
    if (!global.lx.homePagerIdle) return
    if (isMultiSelectModeRef.current) {
      handleSelect(item, index)
    } else {
      handlePlay(index)
    }
  }, [handleSelect, handlePlay])

  const handleLongPress = useCallback((item: LX.Music.MusicInfo, index: number) => {
    if (isMultiSelectModeRef.current) return
    prevSelectIndexRef.current = index
    handleUpdateSelectedList([item])
    onMuiltSelectMode()
  }, [handleUpdateSelectedList, onMuiltSelectMode])

  const handleShowMenu = useCallback((item: LX.Music.MusicInfo, index: number, position: Position) => {
    onShowMenu(item, index, position)
  }, [onShowMenu])

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem
      item={item}
      index={index}
      activeIndex={activeIndex}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onShowMenu={handleShowMenu}
      selectedList={selectedList}
      rowInfo={rowInfo.current}
      isShowAlbumName={isShowAlbumName}
      isShowInterval={isShowInterval}
    />
  )

  const getkey: FlatListType['keyExtractor'] = item => item.id

  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  }

  // extraData 需要包含所有会影响渲染的数据
  const extraData = useMemo(() => ({
    activeIndex,
    selectedList,
  }), [activeIndex, selectedList])

  return (
    <FlatList
      ref={flatListRef}
      style={styles.list}
      data={currentList}
      maxToRenderPerBatch={4}
      numColumns={rowInfo.current.rowNum}
      horizontal={false}
      windowSize={8}
      removeClippedSubviews={true}
      initialNumToRender={12}
      renderItem={renderItem}
      keyExtractor={getkey}
      extraData={extraData}
      getItemLayout={getItemLayout}
    />
  )
})

const styles = createStyle({
  container: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
})

export default List