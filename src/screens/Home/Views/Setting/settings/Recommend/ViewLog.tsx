import { memo, useState, useCallback } from 'react'
import { View, ScrollView, TouchableOpacity, Modal, Text as RNText } from 'react-native'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { getAILogs, clearAILogs } from '@/store/recommend/logAction'

// 原生 JavaScript 格式化时间
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

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const [modalVisible, setModalVisible] = useState(false)
  const [logs, setLogs] = useState<LX.Recommend.AILogEntry[]>([])
  const [selectedLog, setSelectedLog] = useState<LX.Recommend.AILogEntry | null>(null)

  const handleViewLogs = useCallback(() => {
    setLogs(getAILogs())
    setModalVisible(true)
  }, [])

  const handleClose = useCallback(() => {
    setModalVisible(false)
    setSelectedLog(null)
  }, [])

  const handleClearLogs = useCallback(() => {
    clearAILogs()
    setLogs([])
    setSelectedLog(null)
  }, [])

  const handleSelectLog = useCallback((log: LX.Recommend.AILogEntry) => {
    setSelectedLog(log)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedLog(null)
  }, [])

  return (
    <>
      <View style={styles.content}>
        <TouchableOpacity onPress={handleViewLogs} style={styles.button}>
          <Text color={theme['c-primary']}>{t('recommend_view_log')}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={handleClose}
        transparent={false}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme['c-content-background'] }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme['c-border-background'] }]}>
            <Text style={styles.modalTitle} size={18} color={theme['c-font']}>
              {selectedLog ? t('recommend_log_detail') : t('recommend_ai_log')}
            </Text>
            <View style={styles.modalButtons}>
              {!selectedLog && logs.length > 0 && (
                <TouchableOpacity onPress={handleClearLogs} style={styles.clearButton}>
                  <Text color={theme['c-red']}>{t('recommend_clear_log')}</Text>
                </TouchableOpacity>
              )}
              {selectedLog && (
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <Text color={theme['c-primary']}>{t('back')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text color={theme['c-primary']}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {selectedLog ? (
            <ScrollView style={styles.logDetailContainer}>
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel} color={theme['c-500']}>{t('recommend_log_time')}</Text>
                <Text color={theme['c-font']}>{formatTime(selectedLog.timestamp)}</Text>
              </View>
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel} color={theme['c-500']}>{t('recommend_log_model')}</Text>
                <Text color={theme['c-font']}>{selectedLog.model}</Text>
              </View>
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel} color={theme['c-500']}>{t('recommend_log_request_songs')}</Text>
                <Text color={theme['c-font']}>{selectedLog.requestSongs.join('\n')}</Text>
              </View>
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel} color={theme['c-500']}>{t('recommend_log_prompt')}</Text>
                <Text color={theme['c-font']}>{selectedLog.prompt}</Text>
              </View>
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel} color={theme['c-500']}>{t('recommend_log_response')}</Text>
                <Text color={theme['c-font']}>{selectedLog.response}</Text>
              </View>
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel} color={theme['c-500']}>{t('recommend_log_recommended_songs')}</Text>
                <Text color={theme['c-font']}>{selectedLog.recommendedSongs.join('\n')}</Text>
              </View>
            </ScrollView>
          ) : logs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text color={theme['c-500']}>{t('recommend_log_empty')}</Text>
            </View>
          ) : (
            <ScrollView style={styles.logListContainer}>
              {logs.map((log, index) => (
                <TouchableOpacity
                  key={log.timestamp}
                  style={[styles.logItem, { borderBottomColor: theme['c-border-background'] }]}
                  onPress={() => handleSelectLog(log)}
                >
                  <Text color={theme['c-font']} size={14}>{formatTime(log.timestamp)}</Text>
                  <Text color={theme['c-500']} size={12}>{log.model}</Text>
                  <Text color={theme['c-500']} size={12} numberOfLines={1}>
                    {t('recommend_log_songs_count', { count: log.recommendedSongs.length } as any)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginRight: 15,
  },
  backButton: {
    marginRight: 15,
  },
  closeButton: {},
  logListContainer: {
    flex: 1,
  },
  logItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  logDetailContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  logDetailSection: {
    marginBottom: 15,
  },
  logDetailLabel: {
    marginBottom: 5,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})