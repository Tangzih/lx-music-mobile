import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'

import SwitchItem from '../../components/SwitchItem'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const enableLog = useSettingValue('recommend.enableLog')

  const handleUpdate = (value: boolean) => {
    updateSetting({ 'recommend.enableLog': value })
  }

  return (
    <View style={styles.content}>
      <SwitchItem
        label={t('recommend_enable_log')}
        value={enableLog}
        onChanged={handleUpdate}
      />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})