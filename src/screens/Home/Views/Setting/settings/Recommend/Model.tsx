import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'

import InputItem from '../../components/InputItem'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const model = useSettingValue('recommend.model')

  const handleUpdate = (text: string, callback: (value: string) => void) => {
    updateSetting({ 'recommend.model': text })
    callback(text)
  }

  return (
    <View style={styles.content}>
      <InputItem
        label={t('recommend_model')}
        value={model}
        placeholder="gpt-3.5-turbo"
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