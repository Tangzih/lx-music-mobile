import { memo } from 'react'

import Section from '../../components/Section'
import ApiHost from './ApiHost'
import ApiKey from './ApiKey'
import AnalyzeCount from './AnalyzeCount'
import RecommendCount from './RecommendCount'

import { useI18n } from '@/lang'

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_recommend')}>
      <ApiHost />
      <ApiKey />
      <AnalyzeCount />
      <RecommendCount />
    </Section>
  )
})
