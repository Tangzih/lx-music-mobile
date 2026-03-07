import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native'
import { Navigation } from 'react-native-navigation'
import { useTheme } from '@/store/theme/hook'
import { useStatusbarHeight } from '@/store/common/hook'
import { useListenTogether, useConnectionStatus } from '@/store/listenTogether'
import { initService, disconnectService, getService } from '@/store/listenTogether/hook'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Button from '@/components/common/Button'
import { ROOM_LIST_SCREEN } from '../RoomList/screenNames'
import { LISTEN_TOGETHER_ENTRY_SCREEN } from './screenNames'

interface Props {
  componentId: string
}

// Server address history key
const SERVER_HISTORY_KEY = 'listenTogetherServerHistory'

const Entry: React.FC<Props> = ({ componentId }) => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  const isConnected = useConnectionStatus()
  const { isLoading, error } = useListenTogether()

  const [serverAddress, setServerAddress] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [serverHistory, setServerHistory] = useState<string[]>([])

  const inputRef = useRef<TextInput>(null)

  // Load server history from storage (placeholder - would use AsyncStorage in production)
  useEffect(() => {
    setComponentId(COMPONENT_IDS.listenTogetherEntry, componentId)
    // TODO: Load from AsyncStorage
    // For now, use empty array
    setServerHistory([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnect = useCallback(async () => {
    if (!serverAddress.trim()) {
      Alert.alert('提示', '请输入服务器地址')
      return
    }

    // Validate URL format
    try {
      new URL(serverAddress.trim())
    } catch {
      Alert.alert('提示', '请输入有效的服务器地址')
      return
    }

    setConnecting(true)

    try {
      // Generate a unique user ID (in production, this should come from user settings)
      const userId = `user_${Date.now()}`
      await initService(serverAddress.trim(), userId)

      // Save to history
      const newHistory = [serverAddress.trim(), ...serverHistory.filter(s => s !== serverAddress.trim())].slice(0, 5)
      setServerHistory(newHistory)
      // TODO: Save to AsyncStorage

      // Navigate to room list
      Navigation.push(componentId, {
        component: {
          name: ROOM_LIST_SCREEN,
        },
      })
    } catch (err) {
      Alert.alert('连接失败', err instanceof Error ? err.message : '无法连接到服务器')
    } finally {
      setConnecting(false)
    }
  }, [serverAddress, serverHistory, componentId])

  const handleDisconnect = useCallback(() => {
    disconnectService()
    setServerAddress('')
  }, [])

  const handleCreateLocalRoom = useCallback(() => {
    Alert.alert('提示', '此功能开发中，敬请期待')
  }, [])

  const handleSelectHistory = useCallback((address: string) => {
    setServerAddress(address)
    setShowHistory(false)
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: statusBarHeight }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => Navigation.pop(componentId)}
        >
          <Icon name="arrow-left" size={24} color={theme['primary-font']} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme['primary-font'] }]}>一起听</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Join Server Section */}
        <View style={[styles.section, { backgroundColor: theme.secondary }]}>
          <Text style={[styles.sectionTitle, { color: theme['primary-font'] }]}>加入服务器</Text>

          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  color: theme['c-font'],
                  backgroundColor: theme['c-content-background'],
                  borderColor: theme['c-primary-light-100-alpha-300'],
                },
              ]}
              placeholder="输入服务器地址 (如: http://192.168.1.1:2333)"
              placeholderTextColor={theme['c-primary-dark-100-alpha-600']}
              value={serverAddress}
              onChangeText={setServerAddress}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            {/* History dropdown */}
            {showHistory && serverHistory.length > 0 && (
              <View style={[styles.historyList, { backgroundColor: theme['c-content-background'] }]}>
                {serverHistory.map((address, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.historyItem}
                    onPress={() => handleSelectHistory(address)}
                  >
                    <Text style={{ color: theme['c-font'] }}>{address}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Connection Status */}
          {isConnected && (
            <View style={styles.statusRow}>
              <Icon name="check-circle" size={16} color={theme.success} />
              <Text style={[styles.statusText, { color: theme.success }]}>已连接</Text>
            </View>
          )}

          {error && (
            <View style={styles.statusRow}>
              <Icon name="alert-circle" size={16} color={theme.error} />
              <Text style={[styles.statusText, { color: theme.error }]}>{error}</Text>
            </View>
          )}

          {/* Connect/Disconnect Buttons */}
          <View style={styles.buttonRow}>
            {isConnected ? (
              <>
                <Button
                  style={[styles.button, { backgroundColor: theme.primary }]}
                  onPress={() => Navigation.push(componentId, {
                    component: { name: ROOM_LIST_SCREEN },
                  })}
                >
                  <Text style={styles.buttonText}>进入房间列表</Text>
                </Button>
                <Button
                  style={[styles.button, styles.disconnectBtn, { backgroundColor: theme.error }]}
                  onPress={handleDisconnect}
                >
                  <Text style={styles.buttonText}>断开连接</Text>
                </Button>
              </>
            ) : (
              <Button
                style={[
                  styles.button,
                  styles.fullButton,
                  { backgroundColor: connecting ? theme.disabled : theme.primary },
                ]}
                onPress={handleConnect}
                disabled={connecting}
              >
                <Text style={styles.buttonText}>
                  {connecting ? '连接中...' : '连接'}
                </Text>
              </Button>
            )}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme['c-primary-light-100-alpha-300'] }]} />
          <Text style={[styles.dividerText, { color: theme['secondary-font'] }]}>或</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme['c-primary-light-100-alpha-300'] }]} />
        </View>

        {/* Create Local Room Section */}
        <View style={[styles.section, { backgroundColor: theme.secondary }]}>
          <Text style={[styles.sectionTitle, { color: theme['primary-font'] }]}>通过此设备创建房间</Text>
          <Text style={[styles.sectionDesc, { color: theme['secondary-font'] }]}>
            将此设备作为服务器，其他设备可以连接
          </Text>
          <Button
            style={[styles.button, styles.fullButton, { backgroundColor: theme.disabled }]}
            onPress={handleCreateLocalRoom}
          >
            <Text style={styles.buttonText}>开发中...</Text>
          </Button>
        </View>

        {/* Placeholder for future features */}
        <View style={styles.placeholderSection}>
          <Text style={[styles.placeholderText, { color: theme['secondary-font'] }]}>
            局域网/内网穿透模式即将推出
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  historyList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 8,
    marginTop: 4,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  historyItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullButton: {
    flex: 1,
  },
  disconnectBtn: {
    flex: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  placeholderSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderText: {
    fontSize: 14,
  },
})

export default Entry