import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { useHorizontalMode } from '@/utils/hooks'
import PageContent from '@/components/PageContent'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import Vertical from './Vertical'
import Horizontal from './Horizontal'
import { navigations } from '@/navigation'
import settingState from '@/store/setting/state'
import { useIsInRoom } from '@/store/listenTogether'
import ListenTogetherFloatingButton from '@/screens/ListenTogether/ListenTogetherOverlay'


interface Props {
  componentId: string
}


export default ({ componentId }: Props) => {
  const isHorizontalMode = useHorizontalMode()
  const isInRoom = useIsInRoom()
  useEffect(() => {
    setComponentId(COMPONENT_IDS.home, componentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps

    if (settingState.setting['player.startupPushPlayDetailScreen']) {
      navigations.pushPlayDetailScreen(componentId, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PageContent>
      <View style={styles.content}>
        {
          isHorizontalMode
            ? <Horizontal />
            : <Vertical />
        }
        {isInRoom && <ListenTogetherFloatingButton componentId={componentId} />}
      </View>
    </PageContent>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
})
