/**
 * 一起听权限守卫
 *
 * 所有涉及播放控制的动作（切歌、进度、播放/暂停）在进入房间状态下需要通过此模块判断：
 *  - 未进入房间 → 正常放行
 *  - 在房间中 → 仅房主 / allowMemberControl=true 的成员可以控制
 *
 * 若不允许操作，返回 false，调用方应阻止继续执行。
 */
import { getState } from '@/store/listenTogether/state'

/**
 * 判断当前用户是否有播放控制权限。
 * 未进房间时始终返回 true。
 */
export const canControlPlayback = (): boolean => {
  const state = getState()
  if (!state.isInRoom) return true               // 不在房间，任意控制
  if (!state.currentRoom) return true

  const { userId, currentRoom } = state
  if (userId && currentRoom.hostId === userId) return true   // 房主
  if (currentRoom.allowMemberControl) return true            // 成员被授权

  return false
}

/**
 * 判断当前用户是否有追加歌曲到房间歌单的权限。
 * 未进房间时返回 false（没有房间歌单可追加）。
 */
export const canAddToRoomPlaylist = (): boolean => {
  const state = getState()
  if (!state.isInRoom) return false
  if (!state.currentRoom) return false

  const { userId, currentRoom } = state
  if (userId && currentRoom.hostId === userId) return true
  if (currentRoom.allowMemberControl) return true

  return false
}

/**
 * 当前是否在房间中（用于禁止本地播放器切歌）
 */
export const isInRoom = (): boolean => getState().isInRoom
