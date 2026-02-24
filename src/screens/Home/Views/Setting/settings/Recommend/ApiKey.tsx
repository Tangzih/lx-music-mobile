import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'

import InputItem from '../../components/InputItem'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const apiKey = useSettingValue('recommend.apiKey')

  const handleUpdate = (text: string, callback: (value: string) => void) => {
    updateSetting({ 'recommend.apiKey': text })
    callback(text)
  }

  return (
    <View style={styles.content}>
      <InputItem
        label={t('recommend_api_key')}
        value={apiKey}
        placeholder="sk-..."
        secureTextEntry
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
