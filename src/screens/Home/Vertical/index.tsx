import Content from './Content'
import PlayerBar from '@/components/player/PlayerBar'
import ListenTogetherMiniBar from '@/components/ListenTogetherMiniBar'

export default () => {
  return (
    <>
      <Content />
      <ListenTogetherMiniBar />
      <PlayerBar isHome />
    </>
  )
}
