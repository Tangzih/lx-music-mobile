import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'

import InputItem from '../../components/InputItem'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const maxRetries = useSettingValue('recommend.maxRetries')

  const handleUpdate = (text: string, callback: (value: string) => void) => {
    const num = parseInt(text)
    if (isNaN(num) || num < 1) {
      callback(String(maxRetries))
      return
    }
    if (num > 10) {
      updateSetting({ 'recommend.maxRetries': 10 })
      callback('10')
      return
    }
    updateSetting({ 'recommend.maxRetries': num })
    callback(text)
  }

  return (
    <View style={styles.content}>
      <InputItem
        label={t('recommend_max_retries')}
        value={String(maxRetries)}
        placeholder="5"
        keyboardType="numeric"
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