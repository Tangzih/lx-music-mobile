import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'

import InputItem from '../../components/InputItem'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const maxTokens = useSettingValue('recommend.maxTokens')

  const handleUpdate = (text: string, callback: (value: string) => void) => {
    const num = parseInt(text)
    if (isNaN(num) || num < 1000) {
      callback(String(maxTokens))
      return
    }
    if (num > 32000) {
      updateSetting({ 'recommend.maxTokens': 32000 })
      callback('32000')
      return
    }
    updateSetting({ 'recommend.maxTokens': num })
    callback(text)
  }

  return (
    <View style={styles.content}>
      <InputItem
        label={t('recommend_max_tokens')}
        value={String(maxTokens)}
        placeholder="4000"
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