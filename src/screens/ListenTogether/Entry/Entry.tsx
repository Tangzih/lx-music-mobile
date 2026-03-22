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
import { setInRoom, setCurrentRoom } from '@/store/listenTogether/action'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Button from '@/components/common/Button'
import PageContent from '@/components/PageContent'
import { ROOM_LIST_SCREEN } from '../RoomList/screenNames'
import { ROOM_DETAIL_SCREEN } from '../RoomDetail/screenNames'
import { LISTEN_TOGETHER_ENTRY_SCREEN } from './screenNames'
import { setConnectMode } from '@/store/listenTogether/action'
import { canDrawOverlays, requestOverlayPermission } from '@/utils/nativeModules/utils'
import PlayerBar from '@/components/player/PlayerBar'

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
  // 模式： 'server' (普通服务器, websocket) | 'local' (内网直连房主, TCP)
  const [connectMode, setConnectMode] = useState<'server' | 'local'>('server')
  const [connecting, setConnecting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [serverHistory, setServerHistory] = useState<string[]>([])
  
  // Use global connectMode when returning to this screen
  const { connectMode: globalConnectMode, isInRoom } = useListenTogether()

  const [localName, setLocalName] = useState('')
  const [localPort, setLocalPort] = useState('2333')
  const [hosting, setHosting] = useState(false)
  const [hasOverlayPermission, setHasOverlayPermission] = useState(true)

  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    void canDrawOverlays().then(setHasOverlayPermission)
  }, [])

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

    let address = serverAddress.trim()
    
    // 如果没有输入协议前缀，根据模式自动补全
    if (!/^[a-zA-Z]+:\/\//.test(address)) {
      if (connectMode === 'server') {
        address = `ws://${address}`
      } else {
        address = `tcp://${address}`
      }
    }

    // 尝试解析并验证 URL，如果在 React Native 中 WebSocket 找不到协议会导致崩溃
    try {
      const urlObj = new URL(address)
      if (!['ws:', 'wss:', 'http:', 'https:', 'tcp:'].includes(urlObj.protocol)) {
        Alert.alert('提示', '不支持的协议类型')
        return
      }
    } catch {
      Alert.alert('提示', '请输入有效的服务器地址')
      return
    }

    setConnecting(true)

    try {
      // Generate a unique user ID
      const userId = `user_${Date.now()}`

      await initService(address, userId)

      // Save to history
      const newHistory = [address, ...serverHistory.filter(s => s !== address)].slice(0, 5)
      setServerHistory(newHistory)
      
      setConnectMode(connectMode)

      if (address.startsWith('tcp://') || connectMode === 'local') {
        // TCP Direct Room: join directly and skip room list
        const service = getService()
        if (service) {
          service.joinRoom({ roomId: 'local_room' })
        }
        Navigation.push(componentId, {
          component: { name: ROOM_DETAIL_SCREEN },
        })
      } else {
        // Standard server WebSocket: wait for handshake then show room list
        Navigation.push(componentId, {
          component: { name: ROOM_LIST_SCREEN },
        })
      }
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

  const handleCreateLocalRoom = useCallback(async () => {
    if (!localName.trim()) {
      Alert.alert('提示', '请输入房主名字')
      return
    }
    const portNum = parseInt(localPort, 10)
    if (!localPort.trim() || isNaN(portNum)) {
      Alert.alert('提示', '请输入有效的端口号')
      return
    }

    setHosting(true)
    try {
      const { listenTogetherHostServer } = require('@/core/listenTogether/hostServer')
      
      // Start TCP server
      await listenTogetherHostServer.start(portNum, localName.trim())

      // Connect to self
      const userId = `host_${Date.now()}`
      await initService(`tcp://127.0.0.1:${portNum}`, userId, localName.trim())
      
      const service = getService()
      // Get the real room ID from the host server
      const roomState = listenTogetherHostServer.getRoomState()
      const roomId = roomState?.id ?? 'local_room'

      if (service) {
        service.joinRoom({ roomId })
      }
      
      // Immediately update state so MiniBar/overlay can respond
      if (roomState) {
        setCurrentRoom({
          ...roomState,
          hostName: localName.trim(),
          maxMembers: 50,
          currentMembers: 1,
          isPublic: false,
          hasPassword: false,
          allowMemberControl: true,
        } as any)
        setInRoom(true)
      }

      setConnectMode('local')

      Navigation.push(componentId, {
        component: {
          name: ROOM_DETAIL_SCREEN,
          passProps: { roomId },
          options: {
            topBar: {
              visible: false,
              drawBehind: true,
            },
          },
        },
      })
    } catch (err) {
      Alert.alert('创建失败', err instanceof Error ? err.message : '无法创建本地服务器, 请确保端口未被占用。')
    } finally {
      setHosting(false)
    }

  }, [localName, localPort, componentId])

  const handleSelectHistory = useCallback((address: string) => {
    setServerAddress(address)
    setShowHistory(false)
  }, [])

  return (
    <PageContent skipStatusbarUpdate>
      {/* Header */}
      <View style={[styles.header, { paddingTop: statusBarHeight }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => Navigation.pop(componentId)}
        >
          <Icon name="arrow-left" size={24} color={theme['c-font']} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme['c-font'] }]}>一起听</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Join Server Section */}
        <View style={[styles.section, { backgroundColor: theme['c-content-background'] }]}>
          <Text style={[styles.sectionTitle, { color: theme['c-font'] }]}>加入服务器</Text>

          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, connectMode === 'server' && { backgroundColor: theme['c-button-background'] }]}
              onPress={() => setConnectMode('server')}
              disabled={isConnected}
            >
              <Text style={{ color: connectMode === 'server' ? theme['c-button-font'] : theme['c-font'] }}>服务器模式(有房间列表)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, connectMode === 'local' && { backgroundColor: theme['c-button-background'] }]}
              onPress={() => setConnectMode('local')}
              disabled={isConnected}
            >
              <Text style={{ color: connectMode === 'local' ? theme['c-button-font'] : theme['c-font'] }}>直连自建房(IP:端口)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  color: theme['c-font'],
                  backgroundColor: isConnected ? theme['c-primary-light-100-alpha-300'] : theme['c-main-background'],
                  borderColor: theme['c-primary-light-100-alpha-300'],
                },
              ]}
              placeholder={connectMode === 'server' ? "服务器地址 (如: 192.168.1.5:3100 或 ws://...)" : "直连地址 (如: 192.168.1.6:2333)"}
              placeholderTextColor={theme['c-primary-dark-100-alpha-600']}
              value={serverAddress}
              onChangeText={setServerAddress}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isConnected}
            />

            {/* History dropdown */}
            {showHistory && serverHistory.length > 0 && !isConnected && (
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
              <Icon name="check-circle" size={16} color={theme['c-success']} />
              <Text style={[styles.statusText, { color: theme['c-success'] }]}>已连接</Text>
            </View>
          )}

          {error && (
            <View style={styles.statusRow}>
              <Icon name="alert-circle" size={16} color={theme['c-error']} />
              <Text style={[styles.statusText, { color: theme['c-error'] }]}>{error}</Text>
            </View>
          )}

          {/* Connect/Disconnect Buttons */}
          <View style={styles.buttonRow}>
            {isConnected && globalConnectMode === 'server' ? (
              <>
                <Button
                  style={[styles.button, { backgroundColor: theme['c-button-background'] }]}
                  onPress={() => Navigation.push(componentId, {
                    component: {
                      name: isInRoom ? ROOM_DETAIL_SCREEN : ROOM_LIST_SCREEN,
                      passProps: isInRoom ? undefined : {},
                      options: {
                        topBar: {
                          visible: false,
                          drawBehind: true,
                        },
                      },
                    },
                  })}
                >
                  <Text style={[styles.buttonText, { color: theme['c-button-font'] }]}>
                    {isInRoom ? '返回房间' : '进入房间列表'}
                  </Text>
                </Button>
                <Button
                  style={[styles.button, styles.disconnectBtn, { backgroundColor: theme['c-error'] }]}
                  onPress={handleDisconnect}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>断开连接</Text>
                </Button>
              </>
            ) : (
              <Button
                style={[
                  styles.button,
                  styles.fullButton,
                  { backgroundColor: connecting || (isConnected && globalConnectMode === 'local') ? 'rgba(0,0,0,0.2)' : theme['c-button-background'] },
                ]}
                onPress={handleConnect}
                disabled={connecting || (isConnected && globalConnectMode === 'local')}
              >
                <Text style={[styles.buttonText, { color: connecting || (isConnected && globalConnectMode === 'local') ? theme['c-font'] : theme['c-button-font'] }]}>
                  {connecting ? '连接中...' : (isConnected && globalConnectMode === 'local' ? '本地模式中' : '连接')}
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
        <View style={[styles.section, { backgroundColor: theme['c-content-background'] }]}>
          <Text style={[styles.sectionTitle, { color: theme['c-font'] }]}>通过此设备创建房间</Text>
          <Text style={[styles.sectionDesc, { color: theme['c-font'] }]}>
            将此设备作为服务器(内网/穿透)，其他设备只需输入此设备的 IP 和 端口 即可直接进入你的房间。
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme['c-font'],
                  backgroundColor: isConnected ? theme['c-primary-light-100-alpha-300'] : theme['c-main-background'],
                  borderColor: theme['c-primary-light-100-alpha-300'],
                  marginBottom: 12,
                },
              ]}
              placeholder="输入你的名字 (如: 小明)"
              placeholderTextColor={theme['c-primary-dark-100-alpha-600']}
              value={localName}
              onChangeText={setLocalName}
              editable={!isConnected}
            />
            <TextInput
              style={[
                styles.input,
                {
                  color: theme['c-font'],
                  backgroundColor: isConnected ? theme['c-primary-light-100-alpha-300'] : theme['c-main-background'],
                  borderColor: theme['c-primary-light-100-alpha-300'],
                },
              ]}
              placeholder="端口号 (默认: 2333)"
              placeholderTextColor={theme['c-primary-dark-100-alpha-600']}
              value={localPort}
              onChangeText={setLocalPort}
              keyboardType="number-pad"
              editable={!isConnected}
            />
          </View>

          <View style={styles.buttonRow}>
            {isConnected && globalConnectMode === 'local' ? (
              <>
                <Button
                  style={[styles.button, { backgroundColor: theme['c-button-background'] }]}
                  onPress={() => Navigation.push(componentId, {
                    component: {
                      name: ROOM_DETAIL_SCREEN,
                      options: {
                        topBar: {
                          visible: false,
                          drawBehind: true,
                        },
                      },
                    },
                  })}
                >
                  <Text style={[styles.buttonText, { color: theme['c-button-font'] }]}>返回房间</Text>
                </Button>
                <Button
                  style={[styles.button, styles.disconnectBtn, { backgroundColor: theme['c-error'] }]}
                  onPress={handleDisconnect}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>解散房间</Text>
                </Button>
              </>
            ) : (
              <Button
                style={[styles.button, styles.fullButton, { backgroundColor: hosting || (isConnected && globalConnectMode === 'server') ? 'rgba(0,0,0,0.2)' : theme['c-button-background'] }]}
                onPress={handleCreateLocalRoom}
                disabled={hosting || (isConnected && globalConnectMode === 'server')}
              >
                <Text style={[styles.buttonText, { color: hosting || (isConnected && globalConnectMode === 'server') ? theme['c-font'] : theme['c-button-font'] }]}>{hosting ? '创建中...' : '建房并进入'}</Text>
              </Button>
            )}
          </View>
        </View>

        {/* Overlay Permission Alert Section */}
        {!hasOverlayPermission && (
          <View style={[styles.section, { backgroundColor: theme['c-content-background'] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="alert-circle" size={18} color={theme['c-error']} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme['c-font'], marginBottom: 0 }]}>需要悬浮窗权限</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: theme['secondary-font'] }]}>
              缺少悬浮窗权限，您可能无法在一起听后台时看到快捷入口。请授权以获得最佳体验。
            </Text>
            <Button
              style={[
                styles.button,
                { backgroundColor: theme['c-button-background'] },
              ]}
              onPress={async () => {
                const result = await requestOverlayPermission()
                if (result) {
                  setHasOverlayPermission(true)
                } else {
                  Alert.alert('提示', '未能获取悬浮窗权限，请手动在系统设置中为软件开启悬浮窗权限')
                }
              }}
            >
              <Text style={[styles.buttonText, { color: theme['c-button-font'] }]}>
                去授权
              </Text>
            </Button>
          </View>
        )}

      </ScrollView>
      <PlayerBar />
    </PageContent>
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
    width: 24,
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
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeTabs: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
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