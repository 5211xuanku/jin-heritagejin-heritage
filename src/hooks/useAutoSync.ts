// ═══════════════════════════════════════════════
//  自动同步 Hook
// ═══════════════════════════════════════════════
//  登录后自动将本地数据同步到云端
//  - 防重复：同一会话只同步一次
//  - 防抖：避免短时间内重复触发
//  - 静默：后台执行，不打扰用户

import { useState, useCallback, useRef } from 'react'
import { syncSpecificCollections, getLocalStats, type SyncAllResult } from '../utils/syncToCloud'

export interface AutoSyncStatus {
  syncing: boolean
  lastSyncTime: Date | null
  lastResult: SyncAllResult | null
  error: string | null
}

/** 同步间隔：至少间隔 10 分钟才允许再次自动同步 */
const SYNC_INTERVAL = 10 * 60 * 1000

/** 需要自动同步的集合 */
const AUTO_SYNC_COLLECTIONS = [
  'products',
  'hanfuItems',
  'orders',
  'rentalOrders',
  'users',
  'favorites',
]

/**
 * 自动同步 Hook
 *
 * @example
 * ```tsx
 * const { status, triggerSync } = useAutoSync()
 *
 * // 登录成功后触发
 * useEffect(() => {
 *   if (isLoggedIn) triggerSync()
 * }, [isLoggedIn])
 * ```
 */
export function useAutoSync() {
  const [status, setStatus] = useState<AutoSyncStatus>({
    syncing: false,
    lastSyncTime: null,
    lastResult: null,
    error: null,
  })

  const lastSyncTimeRef = useRef<number>(0)
  const syncingRef = useRef(false)

  const triggerSync = useCallback(async () => {
    // 防重复：正在同步中
    if (syncingRef.current) {
      console.log('[AutoSync] 正在同步中，跳过')
      return
    }

    // 防重复：距离上次同步不到 10 分钟
    const now = Date.now()
    if (now - lastSyncTimeRef.current < SYNC_INTERVAL) {
      const remaining = Math.ceil((SYNC_INTERVAL - (now - lastSyncTimeRef.current)) / 60000)
      console.log(`[AutoSync] 距离上次同步不足 ${remaining} 分钟，跳过`)
      return
    }

    syncingRef.current = true
    setStatus(prev => ({ ...prev, syncing: true, error: null }))

    try {
      // 先检查本地是否有数据
      const stats = await getLocalStats()
      const totalRecords = Object.values(stats).reduce((sum: number, count: number) => sum + count, 0)

      if (totalRecords === 0) {
        console.log('[AutoSync] 本地无数据，跳过同步')
        setStatus({
          syncing: false,
          lastSyncTime: new Date(),
          lastResult: null,
          error: null,
        })
        syncingRef.current = false
        return
      }

      console.log(`[AutoSync] 开始自动同步，本地共 ${totalRecords} 条记录`)

      // 执行同步
      const result = await syncSpecificCollections(AUTO_SYNC_COLLECTIONS)

      lastSyncTimeRef.current = Date.now()

      const success = result.overallSuccess
      console.log(
        `[AutoSync] 同步完成：${result.summary.successRecords}/${result.summary.totalRecords} 条成功`,
        success ? '✅' : '⚠️',
      )

      setStatus({
        syncing: false,
        lastSyncTime: new Date(),
        lastResult: result,
        error: success ? null : `部分数据同步失败（${result.summary.failRecords} 条）`,
      })
    } catch (error: any) {
      console.warn('[AutoSync] 同步失败:', error)
      setStatus(prev => ({
        ...prev,
        syncing: false,
        error: error.message || '同步失败',
      }))
    } finally {
      syncingRef.current = false
    }
  }, [])

  return { status, triggerSync }
}

export default useAutoSync
