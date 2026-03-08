// @flow

import { Navigation } from 'react-native-navigation'

import {
  Home,
  PlayDetail,
  SonglistDetail,
  Comment,
  RoomList,
  RoomDetail,
  CreateRoomModal,
  Entry,
  // Setting,
} from '@/screens'
import { Provider } from '@/store/Provider'

import {
  HOME_SCREEN,
  PLAY_DETAIL_SCREEN,
  SONGLIST_DETAIL_SCREEN,
  COMMENT_SCREEN,
  VERSION_MODAL,
  PACT_MODAL,
  SYNC_MODE_MODAL,
  // SETTING_SCREEN,
} from './screenNames'
import {
  ROOM_LIST_SCREEN,
  ROOM_DETAIL_SCREEN,
  CREATE_ROOM_MODAL,
} from '@/screens/ListenTogether/RoomList/screenNames'
import { LISTEN_TOGETHER_ENTRY_SCREEN } from '@/screens/ListenTogether/Entry/screenNames'
import { LISTEN_TOGETHER_OVERLAY } from '@/navigation/screenNames'
import ListenTogetherOverlay from '@/screens/ListenTogether/ListenTogetherOverlay'
import VersionModal from './components/VersionModal'
import PactModal from './components/PactModal'
import SyncModeModal from './components/SyncModeModal'

function WrappedComponent(Component: any) {
  return function inject(props: Record<string, any>) {
    const EnhancedComponent = () => (
      <Provider>
        <Component
          {...props}
        />
      </Provider>
    )

    return <EnhancedComponent />
  }
}

export default () => {
  Navigation.registerComponent(HOME_SCREEN, () => WrappedComponent(Home))
  Navigation.registerComponent(PLAY_DETAIL_SCREEN, () => WrappedComponent(PlayDetail))
  Navigation.registerComponent(SONGLIST_DETAIL_SCREEN, () => WrappedComponent(SonglistDetail))
  Navigation.registerComponent(COMMENT_SCREEN, () => WrappedComponent(Comment))
  Navigation.registerComponent(VERSION_MODAL, () => WrappedComponent(VersionModal))
  Navigation.registerComponent(PACT_MODAL, () => WrappedComponent(PactModal))
  Navigation.registerComponent(SYNC_MODE_MODAL, () => WrappedComponent(SyncModeModal))
  // Navigation.registerComponent(SETTING_SCREEN, () => WrappedComponent(Setting))
  Navigation.registerComponent(LISTEN_TOGETHER_OVERLAY, () => WrappedComponent(ListenTogetherOverlay))

  // 一起听屏幕
  Navigation.registerComponent(LISTEN_TOGETHER_ENTRY_SCREEN, () => WrappedComponent(Entry))
  Navigation.registerComponent(ROOM_LIST_SCREEN, () => WrappedComponent(RoomList))
  Navigation.registerComponent(ROOM_DETAIL_SCREEN, () => WrappedComponent(RoomDetail))
  Navigation.registerComponent(CREATE_ROOM_MODAL, () => WrappedComponent(CreateRoomModal))

  console.info('All screens have been registered...')
}
