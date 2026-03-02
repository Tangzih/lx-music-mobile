import React, { useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native'
import { Navigation } from 'react-native-navigation'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Slider from '@/components/common/Slider'

interface Props {
  componentId: string
  onCreate?: (params: LX.ListenTogether.CreateRoomParams) => void
}

const CreateRoomModal: React.FC<Props> = ({ componentId, onCreate }) => {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxMembers, setMaxMembers] = useState(10)
  const [isPublic, setIsPublic] = useState(true)
  const [allowRequest, setAllowRequest] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = useCallback(() => {
    Navigation.dismissModal(componentId)
  }, [componentId])

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return

    setIsLoading(true)

    const params: LX.ListenTogether.CreateRoomParams = {
      name: name.trim(),
      description: description.trim() || undefined,
      maxMembers,
      isPublic,
      allowRequest,
    }

    if (onCreate) {
      await onCreate(params)
    }

    setIsLoading(false)
    handleClose()
  }, [name, description, maxMembers, isPublic, allowRequest, onCreate, handleClose])

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]} >
      {/* 头部 */}
      <View style={[styles.header, { borderBottomColor: theme.border }]} >
        <Button onPress={handleClose} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: theme['secondary-font'] }]} >取消</Text>
        </Button>

        <Text style={[styles.headerTitle, { color: theme['primary-font'] }]} >创建房间</Text>

        <Button
          onPress={handleCreate}
          disabled={!name.trim() || isLoading}
          style={[
            styles.createBtn,
            { backgroundColor: name.trim() ? theme.primary : theme.disabled },
          ]}
        >
          <Text style={styles.createBtnText}>创建</Text>
        </Button>
      </View>

      {/* 表单内容 */}
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* 房间名称 */}
        <View style={styles.formItem}>
          <Text style={[styles.label, { color: theme['primary-font'] }]} >房间名称 *</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder='给你的房间起个名字'
            maxLength={30}
            style={styles.input}
          />
          <Text style={[styles.charCount, { color: theme['secondary-font'] }]} >
            {name.length}/30
          </Text>
        </View>

        {/* 房间描述 */}
        <View style={styles.formItem}>
          <Text style={[styles.label, { color: theme['primary-font'] }]} >房间描述</Text>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder='描述一下你的房间'
            maxLength={100}
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textarea]}
          />
          <Text style={[styles.charCount, { color: theme['secondary-font'] }]} >
            {description.length}/100
          </Text>
        </View>

        {/* 最大人数 */}
        <View style={styles.formItem}>
          <Text style={[styles.label, { color: theme['primary-font'] }]} >
            最大人数: {maxMembers} 人
          </Text>
          <Slider
            value={maxMembers}
            minimumValue={2}
            maximumValue={50}
            step={1}
            onValueChange={setMaxMembers}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.border}
            style={styles.slider}
          />
          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabel, { color: theme['secondary-font'] }]} >2人</Text>
            <Text style={[styles.sliderLabel, { color: theme['secondary-font'] }]} >50人</Text>
          </View>
        </View>

        {/* 开关选项 */}
        <View style={[styles.formItem, styles.switchItem]}>
          <Text style={[styles.label, { color: theme['primary-font'] }]} >公开房间</Text>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor='#fff'
          />
        </View>

        <View style={[styles.formItem, styles.switchItem]}>
          <Text style={[styles.label, { color: theme['primary-font'] }]} >允许点歌</Text>
          <Switch
            value={allowRequest}
            onValueChange={setAllowRequest}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor='#fff'
          />
        </View>

        {
/* 底部留白 */
}        <View style={styles.bottomPadding} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  createBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formItem: {
    marginBottom: 20,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  slider: {
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
  },
  bottomPadding: {
    height: 40,
  },
})

export default CreateRoomModal
