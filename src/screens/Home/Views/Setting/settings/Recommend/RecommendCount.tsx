import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'

import InputItem from '../../components/InputItem'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const recommendCount = useSettingValue('recommend.recommendCount')

  const handleUpdate = (text: string, callback: (value: string) => void) => {
    const num = parseInt(text)
    if (isNaN(num) || num < 1) {
      callback(String(recommendCount))
      return
    }
    if (num > 50) {
      updateSetting({ 'recommend.recommendCount': 50 })
      callback('50')
      return
    }
    updateSetting({ 'recommend.recommendCount': num })
    callback(text)
  }

  return (
    <View style={styles.content}>
      <InputItem
        label={t('recommend_recommend_count')}
        value={String(recommendCount)}
        placeholder="10"
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
