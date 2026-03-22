import React, { useRef, useState, useCallback, useMemo } from 'react'
import { View, Animated, PanResponder, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { pushListenTogetherEntryScreen } from '@/navigation/navigation'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const BUTTON_SIZE = 50

export default ({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - BUTTON_SIZE - 20, y: SCREEN_HEIGHT / 2 })).current
  const [isDragging, setIsDragging] = useState(false)

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // 如果移动距离超过 5 像素才判定为拖拽
          const { dx, dy } = gestureState
          return Math.abs(dx) > 5 || Math.abs(dy) > 5
        },
        onPanResponderGrant: () => {
          pan.setOffset({
            x: (pan.x as any)._value,
            y: (pan.y as any)._value,
          })
          pan.setValue({ x: 0, y: 0 })
          setIsDragging(true)
        },
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: (evt, gestureState) => {
          pan.flattenOffset()
          setIsDragging(false)
          
          // 吸附到屏幕边缘
          const currentX = (pan.x as any)._value
          const currentY = (pan.y as any)._value
          
          let targetX = currentX
          if (currentX < SCREEN_WIDTH / 2) {
            targetX = 10
          } else {
            targetX = SCREEN_WIDTH - BUTTON_SIZE - 10
          }
          
          let targetY = currentY
          if (currentY < 50) targetY = 50
          if (currentY > SCREEN_HEIGHT - 100) targetY = SCREEN_HEIGHT - 100

          Animated.spring(pan, {
            toValue: { x: targetX, y: targetY },
            useNativeDriver: false,
          }).start()
        },
      }),
    [pan]
  )

  const handlePress = useCallback(() => {
    pushListenTogetherEntryScreen(componentId)
  }, [componentId])

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.bubble,
          {
            transform: pan.getTranslateTransform(),
            backgroundColor: theme['c-button-background'],
            opacity: isDragging ? 0.8 : 1,
            shadowColor: theme['c-font'],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.touchable}
          onPress={handlePress}
          activeOpacity={0.8}
          disabled={isDragging}
        >
          <Icon name="logo" size={24} color={theme['c-button-font']} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  touchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
