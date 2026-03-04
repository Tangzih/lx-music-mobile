import Btn from './Btn'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'


export default () => {
  const handleShowListenTogether = () => {
    navigations.pushRoomListScreen(commonState.componentIds.playDetail!)
  }

  return <Btn icon="account-multiple" onPress={handleShowListenTogether} />
}