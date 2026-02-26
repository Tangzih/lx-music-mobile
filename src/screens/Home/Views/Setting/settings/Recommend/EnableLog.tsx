import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'

import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const enableLog = useSettingValue('recommend.enableLog')

  const handleUpdate = (value: boolean) => {
    updateSetting({ 'recommend.enableLog': value })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem check={enableLog} label={t('recommend_enable_log')} onChange={handleUpdate} />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})