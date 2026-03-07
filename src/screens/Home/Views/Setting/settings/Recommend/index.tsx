import { memo } from 'react'

import Section from '../../components/Section'
import ApiHost from './ApiHost'
import ApiKey from './ApiKey'
import Model from './Model'
import AnalyzeCount from './AnalyzeCount'
import RecommendCount from './RecommendCount'
import ExtraPrompt from './ExtraPrompt'
import MaxRetries from './MaxRetries'
import MaxTokens from './MaxTokens'
import AutoClearSwitch from './AutoClearSwitch'
import AutoClearHours from './AutoClearHours'
import ViewLog from './ViewLog'
import ContinuousRecommend from './ContinuousRecommend'
import EnableLog from './EnableLog'

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
      <ExtraPrompt />
      <MaxRetries />
      <MaxTokens />
      <AutoClearSwitch />
      <AutoClearHours />
      <ViewLog />
      <ContinuousRecommend />
      <EnableLog />
    </Section>
  )
})