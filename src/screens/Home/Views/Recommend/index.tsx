import { memo } from 'react'
import { View, ScrollView } from 'react-native'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { useRecommendList, useRecommendLoading, useRecommendError, useRecommendProgress } from '@/store/recommend/hook'
import recommendActions from '@/store/recommend/action'
import List from './List'
import Loading from '@/components/common/Loading'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const recommendList = useRecommendList()
  const isLoading = useRecommendLoading()
  const error = useRecommendError()
  const progress = useRecommendProgress()

  const handleGetRecommendations = () => {
    void recommendActions.getRecommendations()
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} size={18} color={theme['c-font']}>
          {t('nav_recommend')}
        </Text>
        <Button onPress={handleGetRecommendations} disabled={isLoading}>
          <Text size={14} color={theme['c-primary']}>{t('recommend_get')}</Text>
        </Button>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Loading label={progress || t('recommend_loading')} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text color={theme['c-red']} size={14}>
            {t('recommend_error')}: {error}
          </Text>
        </View>
      ) : recommendList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text color={theme['c-500']} size={14}>
            {t('recommend_empty_tip')}
          </Text>
        </View>
      ) : (
        <List musicList={recommendList} />
      )}
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 10,
  },
  title: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
})
