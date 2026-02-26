import { memo } from 'react'

import Section from '../../components/Section'
import ApiHost from './ApiHost'
import ApiKey from './ApiKey'
import Model from './Model'
import AnalyzeCount from './AnalyzeCount'
import RecommendCount from './RecommendCount'
import EnableLog from './EnableLog'
import ContinuousRecommend from './ContinuousRecommend'
import ExtraPrompt from './ExtraPrompt'
import ViewLog from './ViewLog'

import { useI18n } from '@/lang'

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_recommend')}>
      <ApiHost />
      <ApiKey />
      <Model />
      <AnalyzeCount />
      <RecommendCount />
      <ContinuousRecommend />
      <ExtraPrompt />
      <EnableLog />
      <ViewLog />
    </Section>
  )
})