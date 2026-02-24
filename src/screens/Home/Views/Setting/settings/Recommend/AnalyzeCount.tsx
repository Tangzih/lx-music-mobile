import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo, useState } from 'react'
import { View } from 'react-native'

import InputItem from '../../components/InputItem'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const analyzeCount = useSettingValue('recommend.analyzeCount')

  const handleUpdate = (text: string, callback: (value: string) => void) => {
    const num = parseInt(text)
    if (isNaN(num) || num < 1) {
      callback(String(analyzeCount))
      return
    }
    if (num > 100) {
      updateSetting({ 'recommend.analyzeCount': 100 })
      callback('100')
      return
    }
    updateSetting({ 'recommend.analyzeCount': num })
    callback(text)
  }

  return (
    <View style={styles.content}>
      <InputItem
        label={t('recommend_analyze_count')}
        value={String(analyzeCount)}
        placeholder="20"
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
