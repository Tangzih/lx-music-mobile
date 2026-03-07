export interface InitState {
  /**
   * 推荐歌曲列表
   */
  recommendList: LX.Music.MusicInfoOnline[]

  /**
   * 是否正在加载
   */
  isLoading: boolean

  /**
   * 错误信息
   */
  error: string | null

  /**
   * 当前进度状态
   */
  progress: string

  /**
   * 上次清空推荐列表的时间戳
   */
  lastClearTime: number
}

const state: InitState = {
  recommendList: [],
  isLoading: false,
  error: null,
  progress: '',
  lastClearTime: 0,
}

export default state
