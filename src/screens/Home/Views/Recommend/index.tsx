import { memo, useCallback, useRef, useEffect, useState } from 'react'
import { View } from 'react-native'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { useRecommendList, useRecommendLoading, useRecommendError, useRecommendProgress } from '@/store/recommend/hook'
import recommendActions from '@/store/recommend/action'
import List, { type ListType } from './List'
import Loading from '@/components/common/Loading'
import ListMenu, { type ListMenuType, type Position, type SelectInfo } from './ListMenu'
import MultipleModeBar, { type SelectMode, type MultipleModeBarType } from './MultipleModeBar'
import SearchBar, { type RecommendSearchBarType } from './SearchBar'
import ListMusicAdd, { type MusicAddModalType as ListMusicAddType } from '@/components/MusicAddModal'
import ListMusicMultiAdd, { type MusicMultiAddModalType as ListAddMultiType } from '@/components/MusicMultiAddModal'
import { playList, playNext } from '@/core/player/player'
import { addTempPlayList } from '@/core/player/tempPlayList'
import { shareMusic } from '@/utils/tools'
import settingState from '@/store/setting/state'
import { addDislikeInfo, hasDislike } from '@/core/dislikeList'
import { confirmDialog, openUrl, toast } from '@/utils/tools'
import playerState from '@/store/player/state'
import { usePlayInfo, usePlayMusicInfo } from '@/store/player/hook'
import musicSdk from '@/utils/musicSdk'
import { toOldMusicInfo } from '@/utils'
import recommendState from '@/store/recommend/state'
import { addListMusics } from '@/core/list'
import { LIST_IDS } from '@/config/constant'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const recommendList = useRecommendList()
  const isLoading = useRecommendLoading()
  const error = useRecommendError()
  const progress = useRecommendProgress()
  const listRef = useRef<ListType>(null)
  const listMenuRef = useRef<ListMenuType>(null)
  const multipleModeBarRef = useRef<MultipleModeBarType>(null)
  const listMusicAddRef = useRef<ListMusicAddType>(null)
  const listMusicMultiAddRef = useRef<ListAddMultiType>(null)
  const isMultiSelectModeRef = useRef(false)
  const playMusicInfo = usePlayMusicInfo()
  const playInfo = usePlayInfo()
  const searchBarRef = useRef<RecommendSearchBarType>(null)
  const [filteredList, setFilteredList] = useState<LX.Music.MusicInfo[]>([])
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [showHeader, setShowHeader] = useState(true) // 控制header显示/隐藏
  const prevErrorRef = useRef<string | null>(null)
  const prevListLengthRef = useRef<number>(0) // 追踪上一次列表长度

  // 搜索功能 - 四线程分批次搜索
  const handleSearch = useCallback((keyword: string) => {
    if (!keyword) {
      setFilteredList(recommendList)
      return
    }

    const lowerKeyword = keyword.toLowerCase()
    const listLength = recommendList.length
    const batchSize = Math.ceil(listLength / 4) // 分成 4 批处理

    // 如果列表很小，直接同步处理
    if (listLength <= 20) {
      const filtered = recommendList.filter(music =>
        music.name.toLowerCase().includes(lowerKeyword) ||
        music.singer.toLowerCase().includes(lowerKeyword)
      )
      setFilteredList(filtered)
      return
    }

    // 分 4 批处理，模拟多线程效果
    const results: LX.Music.MusicInfo[][] = [[], [], [], []]
    let completedCount = 0

    const processBatch = (batchIndex: number, startIndex: number, endIndex: number) => {
      // 使用 setTimeout 让出主线程，避免阻塞 UI
      setTimeout(() => {
        for (let i = startIndex; i < endIndex && i < listLength; i++) {
          const music = recommendList[i]
          const nameLower = music.name.toLowerCase()
          const singerLower = music.singer.toLowerCase()
          if (nameLower.includes(lowerKeyword) || singerLower.includes(lowerKeyword)) {
            results[batchIndex].push(music)
          }
        }
        completedCount++

        // 所有批次完成，合并结果
        if (completedCount === 4) {
          const filtered = [...results[0], ...results[1], ...results[2], ...results[3]]
          setFilteredList(filtered)
        }
      }, 0)
    }

    // 启动 4 个批次的处理
    processBatch(0, 0, batchSize)
    processBatch(1, batchSize, batchSize * 2)
    processBatch(2, batchSize * 2, batchSize * 3)
    processBatch(3, batchSize * 3, listLength)
  }, [recommendList])

  // 打开搜索
  const handleShowSearch = useCallback(() => {
    setIsSearchMode(true)
    setFilteredList(recommendList)
    searchBarRef.current?.show()
  }, [recommendList])

  // 退出搜索
  const handleExitSearch = useCallback(() => {
    setIsSearchMode(false)
    setFilteredList([])
    searchBarRef.current?.hide()
  }, [])

  // 当推荐列表变化时，更新过滤列表
  useEffect(() => {
    if (isSearchMode) {
      setFilteredList(recommendList)
    }
  }, [recommendList, isSearchMode])

  // 当列表有歌曲时，错误使用 Toast 提示
  useEffect(() => {
    if (error && error !== prevErrorRef.current && recommendList.length > 0) {
      prevErrorRef.current = error
      toast(`${t('recommend_error')}: ${error}`)
    }
  }, [error, recommendList.length, t])

  // 持续推荐：监听播放状态变化
  useEffect(() => {
    const checkContinuousRecommend = async() => {
      // 检查是否启用持续推荐
      if (!settingState.setting['recommend.continuousRecommend']) return

      // 检查是否正在播放推荐列表
      if (playMusicInfo.listId !== LIST_IDS.RECOMMEND) return

      // 检查是否正在加载
      if (recommendState.isLoading) return

      // 获取当前播放索引和列表长度
      const currentIndex = playInfo.playIndex
      const listLength = recommendState.recommendList.length

      // 如果列表为空，不处理
      if (listLength === 0) return

      // 如果播放索引无效，不处理（防止首次加载时误触发）
      // 注意：playIndex 从 0 开始，必须在有效范围内
      if (currentIndex < 0 || currentIndex >= listLength) return

      // 如果列表长度发生变化（新增了歌曲），更新追踪值但不触发推荐
      if (listLength !== prevListLengthRef.current) {
        prevListLengthRef.current = listLength
        return
      }

      // 当播放到倒数第二首时开始获取新推荐
      // 只有当索引确实接近末尾时才触发
      if (currentIndex >= listLength - 2) {
        console.log('[持续推荐] 触发追加推荐，当前索引:', currentIndex, '列表长度:', listLength)
        await recommendActions.appendRecommendations()
      }
    }

    void checkContinuousRecommend()
  }, [playMusicInfo.listId, playInfo.playIndex])

  const handleGetRecommendations = useCallback(() => {
    void recommendActions.getRecommendations()
  }, [])

  const handleMultiSelect = useCallback(() => {
    isMultiSelectModeRef.current = true
    setShowHeader(false) // 隐藏header
    multipleModeBarRef.current?.show()
    listRef.current?.setIsMultiSelectMode(true)
  }, [])

  const handleExitSelect = useCallback(() => {
    multipleModeBarRef.current?.exitSelectMode()
    listRef.current?.setIsMultiSelectMode(false)
    isMultiSelectModeRef.current = false
    setShowHeader(true) // 显示header
  }, [])

  const handleSwitchSelectMode = useCallback((mode: SelectMode) => {
    multipleModeBarRef.current?.setSwitchMode(mode)
    listRef.current?.setSelectMode(mode)
  }, [])

  const showMenu = useCallback((musicInfo: LX.Music.MusicInfo, index: number, position: Position) => {
    listMenuRef.current?.show({
      musicInfo,
      index,
      listId: LIST_IDS.RECOMMEND,
      single: false,
      selectedList: listRef.current?.getSelectedList() ?? [],
    }, position)
  }, [])

  // 播放
  const handlePlay = useCallback((info: SelectInfo) => {
    // 将歌曲加入试听列表
    void addListMusics('default', [info.musicInfo], 'bottom')
    void playList(LIST_IDS.RECOMMEND, info.index)
  }, [])

  // 稍后播放
  const handlePlayLater = useCallback((info: SelectInfo) => {
    if (info.selectedList.length) {
      addTempPlayList(info.selectedList.map(s => ({ listId: LIST_IDS.RECOMMEND, musicInfo: s })))
      handleExitSelect()
    } else {
      addTempPlayList([{ listId: LIST_IDS.RECOMMEND, musicInfo: info.musicInfo }])
    }
  }, [handleExitSelect])

  // 添加到歌单
  const handleAddMusic = useCallback((info: SelectInfo) => {
    if (info.selectedList.length) {
      listMusicMultiAddRef.current?.show({ selectedList: info.selectedList, listId: LIST_IDS.RECOMMEND, isMove: false })
    } else {
      listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: LIST_IDS.RECOMMEND, isMove: false })
    }
  }, [])

  // 从推荐列表移除
  const handleRemove = useCallback((info: SelectInfo) => {
    const removeIds = info.selectedList.length
      ? info.selectedList.map(s => s.id)
      : [info.musicInfo.id]

    // 从推荐列表中移除并更新存储
    void recommendActions.removeSongsFromList(removeIds)

    handleExitSelect()
  }, [handleExitSelect])

  // 复制名称
  const handleCopyName = useCallback((info: SelectInfo) => {
    shareMusic(settingState.setting['common.shareType'], settingState.setting['download.fileName'], info.musicInfo)
  }, [])

  // 不喜欢
  const handleDislikeMusic = useCallback(async(info: SelectInfo) => {
    const confirm = await confirmDialog({
      message: info.musicInfo.singer
        ? global.i18n.t('lists_dislike_music_singer_tip', { name: info.musicInfo.name, singer: info.musicInfo.singer })
        : global.i18n.t('lists_dislike_music_tip', { name: info.musicInfo.name }),
      cancelButtonText: global.i18n.t('cancel_button_text_2'),
      confirmButtonText: global.i18n.t('confirm_button_text'),
      bgClose: false,
    })
    if (!confirm) return
    await addDislikeInfo([{ name: info.musicInfo.name, singer: info.musicInfo.singer }])
    toast(global.i18n.t('lists_dislike_music_add_tip'))
    if (hasDislike(playerState.playMusicInfo.musicInfo)) {
      void playNext(true)
    }
  }, [])

  // 音乐源详情
  const handleMusicSourceDetail = useCallback((info: SelectInfo) => {
    const url = musicSdk[info.musicInfo.source as LX.OnlineSource]?.getMusicDetailPageUrl(toOldMusicInfo(info.musicInfo))
    if (!url) return
    void openUrl(url)
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={{ ...styles.header, opacity: showHeader ? 1 : 0 }}>
          <Text style={styles.title} size={16} color={theme['c-font']}>
            {isLoading && recommendList.length > 0 ? (progress || t('recommend_loading')) : t('nav_recommend')}
          </Text>
          <View style={styles.headerButtons}>
            <Button onPress={handleShowSearch}>
              <Text size={14} color={theme['c-primary']}>{t('search')}</Text>
            </Button>
            <View style={styles.buttonSpacing} />
            <Button onPress={handleGetRecommendations} disabled={isLoading}>
              <Text size={14} color={theme['c-primary']}>{t('recommend_get')}</Text>
            </Button>
          </View>
        </View>
        <MultipleModeBar
          ref={multipleModeBarRef}
          onSwitchMode={handleSwitchSelectMode}
          onSelectAll={isAll => listRef.current?.selectAll(isAll)}
          onExitSelectMode={handleExitSelect}
        />
        <SearchBar
          ref={searchBarRef}
          onSearch={handleSearch}
          onExitSearch={handleExitSearch}
        />
      </View>

      {isLoading && recommendList.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Loading label={progress || t('recommend_loading')} />
        </View>
      ) : error && recommendList.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text color={theme['c-red']} size={14}>
            {t('recommend_error')}: {error}
          </Text>
        </View>
      ) : recommendList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text color={theme['c-500']} size={14}>
            {t('recommend_empty_tip')}
          </Text>
        </View>
      ) : (
        <List
          ref={listRef}
          musicList={isSearchMode ? filteredList : recommendList}
          onShowMenu={showMenu}
          onMuiltSelectMode={handleMultiSelect}
          onSelectAll={isAll => listRef.current?.selectAll(isAll)}
        />
      )}

      <ListMenu
        ref={listMenuRef}
        onPlay={handlePlay}
        onPlayLater={handlePlayLater}
        onAdd={handleAddMusic}
        onCopyName={handleCopyName}
        onDislikeMusic={handleDislikeMusic}
        onRemove={handleRemove}
        onMusicSourceDetail={handleMusicSourceDetail}
      />
      <ListMusicAdd ref={listMusicAddRef} onAdded={handleExitSelect} />
      <ListMusicMultiAdd ref={listMusicMultiAddRef} onAdded={handleExitSelect} />
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  headerContainer: {
    zIndex: 2,
    height: 46, // 固定高度，与header + padding一致
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 10,
    height: 46, // 固定高度
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonSpacing: {
    width: 10,
  },
  title: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
})