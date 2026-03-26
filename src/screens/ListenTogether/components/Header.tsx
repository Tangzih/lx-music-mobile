import React from 'react'
import { View, StyleSheet, TouchableOpacity, StatusBar as RNStatusBar } from 'react-native'

import StatusBar from '@/components/common/StatusBar'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { HEADER_HEIGHT } from '@/config/constant'
import { useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'

interface Props {
  title: string
  onBack: () => void
  right?: React.ReactNode
  borderBottom?: boolean
}

const ListenTogetherHeader = ({ title, onBack, right, borderBottom = false }: Props) => {
  const theme = useTheme()
  const statusbarHeight = useStatusbarHeight()
  const nativeStatusbarHeight = RNStatusBar.currentHeight ?? 0
  const resolvedStatusbarHeight = statusbarHeight > 0 && nativeStatusbarHeight > 0
    ? Math.min(statusbarHeight, nativeStatusbarHeight)
    : Math.max(statusbarHeight, nativeStatusbarHeight)

  return (
    <View
      style={[
        styles.wrapper,
        {
          minHeight: scaleSizeH(HEADER_HEIGHT) + resolvedStatusbarHeight,
          paddingTop: resolvedStatusbarHeight,
        },
        borderBottom && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme['c-primary-light-100-alpha-300'],
        },
      ]}
    >
      <StatusBar />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.sideButton}>
          <Icon name='arrow-left' size={24} color={theme['c-font']} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme['c-font'] }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.sideButton}>
          {right}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 8,
  },
  header: {
    height: scaleSizeH(HEADER_HEIGHT),
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
})

export default ListenTogetherHeader