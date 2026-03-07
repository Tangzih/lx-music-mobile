import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'

import InputItem from '../../components/InputItem'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const apiHost = useSettingValue('recommend.apiHost')

  const handleUpdate = (text: string, callback: (value: string) => void) => {
    updateSetting({ 'recommend.apiHost': text })
    callback(text)
  }

  return (
    <View style={styles.content}>
      <InputItem
        label={t('recommend_api_host')}
        value={apiHost}
        placeholder="https://api.openai.com/v1"
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
