import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo, useState, useRef, useEffect } from 'react'
import { View, TextInput, StyleSheet } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import Text from '@/components/common/Text'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const extraPrompt = useSettingValue('recommend.extraPrompt')
  const [text, setText] = useState(extraPrompt)
  const isMountRef = useRef(false)

  useEffect(() => {
    isMountRef.current = true
    return () => {
      isMountRef.current = false
    }
  }, [])

  useEffect(() => {
    if (extraPrompt !== text) {
      setText(extraPrompt)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPrompt])

  const handleBlur = () => {
    updateSetting({ 'recommend.extraPrompt': text })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label} size={14}>{t('recommend_extra_prompt')}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={handleBlur}
        placeholder={t('recommend_extra_prompt_placeholder')}
        placeholderTextColor={theme['c-font-label']}
        style={[styles.input, { backgroundColor: theme['c-primary-input-background'], color: theme['c-font'] }]}
        multiline={true}
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingLeft: 25,
    marginBottom: 15,
  },
  label: {
    marginBottom: 2,
  },
  input: {
    borderRadius: 4,
    padding: 10,
    minHeight: 80,
    maxWidth: 300,
    fontSize: 14,
  },
})