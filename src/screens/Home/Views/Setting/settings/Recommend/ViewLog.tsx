import { memo, useRef, useState, useEffect, useCallback } from 'react'
import { View, ScrollView } from 'react-native'
import { useI18n } from '@/lang'
import { createStyle, toast } from '@/utils/tools'
import SubTitle from '../../components/SubTitle'
import Button from '../../components/Button'
import Text from '@/components/common/Text'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import { getAILogs, clearAILogs } from '@/store/recommend/logAction'

// 格式化时间
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 格式化日志内容
const formatLogs = (logs: LX.Recommend.AILogEntry[]): string => {
  if (logs.length === 0) return ''

  return logs.map((log, index) => {
    const lines = [
      `【${index + 1}】${formatTime(log.timestamp)}`,
      `模型: ${log.model}`,
      `分析歌曲: ${log.requestSongs.slice(0, 5).join(', ')}${log.requestSongs.length > 5 ? '...' : ''}`,
      `推荐歌曲: ${log.recommendedSongs.join(', ')}`,
      `---`,
      `提示词:`,
      log.prompt,
      `---`,
      `AI响应:`,
      log.response,
      ``,
    ]
    return lines.join('\n')
  }).join('\n\n')
}

export default memo(() => {
  const t = useI18n()
  const alertRef = useRef<ConfirmAlertType>(null)
  const [logText, setLogText] = useState('')
  const isUnmountedRef = useRef(true)

  const getLogContent = useCallback(() => {
    const logs = getAILogs()
    if (isUnmountedRef.current) return
    setLogText(formatLogs(logs))
  }, [])

  const openLogModal = useCallback(() => {
    getLogContent()
    alertRef.current?.setVisible(true)
  }, [getLogContent])

  const handleCleanLog = useCallback(() => {
    clearAILogs()
    toast(t('setting_other_log_tip_clean_success'))
    setLogText('')
  }, [t])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  return (
    <>
      <SubTitle title={t('recommend_ai_log')}>
        <View style={styles.btn}>
          <Button onPress={openLogModal}>{t('setting_other_log_btn_show')}</Button>
        </View>
      </SubTitle>
      <ConfirmAlert
        ref={alertRef}
        cancelText={t('setting_other_log_btn_hide')}
        confirmText={t('setting_other_log_btn_clean')}
        onConfirm={handleCleanLog}
        showConfirm={!!logText}
        reverseBtn={true}
      >
        <ScrollView style={styles.logContainer} onStartShouldSetResponder={() => true}>
          {
            logText
              ? <Text selectable size={13}>{logText}</Text>
              : <Text size={13}>{t('recommend_log_empty')}</Text>
          }
        </ScrollView>
      </ConfirmAlert>
    </>
  )
})

const styles = createStyle({
  btn: {
    flexDirection: 'row',
  },
  logContainer: {
    maxHeight: 400,
  },
})