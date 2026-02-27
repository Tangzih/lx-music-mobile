import { memo } from 'react'
import { View } from 'react-native'

import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { useSettingValue } from '@/store/setting/hook'
import InputItem from '../../components/InputItem'

export default memo(() => {
  const t = useI18n()
  const autoClearHours = useSettingValue('recommend.autoClearHours')

  const handleUpdate = (text: string, callback: (value: string) => void) => {
    const num = parseInt(text)
    if (isNaN(num) || num < 0) {
      callback(String(autoClearHours))
      return
    }
    if (num > 720) { // 最大30天
      updateSetting({ 'recommend.autoClearHours': 720 })
      callback('720')
      return
    }
    updateSetting({ 'recommend.autoClearHours': num })
    callback(text)
  }

  return (
    <View style={styles.container}>
      <InputItem
        label={t('recommend_auto_clear_hours')}
        value={String(autoClearHours)}
        placeholder="24"
        keyboardType="numeric"
        onChanged={handleUpdate}
      />
    </View>
  )
})

const styles = createStyle({
  container: {
    marginTop: 5,
  },
})