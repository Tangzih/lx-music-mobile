import { memo } from 'react'
import { View } from 'react-native'

import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { useSettingValue } from '@/store/setting/hook'
import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const autoClear = useSettingValue('recommend.autoClear')

  const handleToggle = (value: boolean) => {
    updateSetting({ 'recommend.autoClear': value })
  }

  return (
    <View style={styles.container}>
      <CheckBoxItem check={autoClear} onChange={handleToggle} label={t('recommend_auto_clear')} />
    </View>
  )
})

const styles = createStyle({
  container: {
    marginTop: 5,
  },
})