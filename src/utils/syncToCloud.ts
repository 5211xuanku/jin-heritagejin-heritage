// ═══════════════════════════════════════════════
//  本地数据 → 腾讯云同步工具
// ═══════════════════════════════════════════════

import { crudApi } from './cloudFunctions'
import { loginPromise, isCloudBaseReady } from '../utils/cloudbase'
import db from '../db'
// import type { DbProduct, DbOrder, DbRentalOrder, DbHanfuItem, DbAccount, DbFavorite } from '../db'

// ─── 类型定义 ───────────────────────────────

export interface SyncProgress {
  collection: string
  current: number
  total: number
  status: 'pending' | 'syncing' | 'success' | 'error'
  message?: string
}

export interface SyncResult {
  success: boolean
  collection: string
  total: number
  successCount: number
  failCount: number
  errors: Array<{ id: string; error: string }>
  duration: number
}

export interface SyncAllResult {
  overallSuccess: boolean
  results: SyncResult[]
  totalDuration: number
  summary: {
    totalRecords: number
    successRecords: number
    failRecords: number
  }
}

export type ProgressCallback = (progress: SyncProgress) => void

// ─── 同步配置 ───────────────────────────────

const SYNC_BATCH_SIZE = 50 // 每批同步数量

interface SyncConfig {
  collection: string
  getData: () => Promise<any[]>
  transform?: (item: any) => any
}

const syncConfigs: SyncConfig[] = [
  {
    collection: 'products',
    getData: () => db.products.toArray(),
  },
  {
    collection: 'hanfuItems',
    getData: () => db.hanfuItems.toArray(),
  },
  {
    collection: 'orders',
    getData: () => db.orders.toArray(),
  },
  {
    collection: 'rentalOrders',
    getData: () => db.rentalOrders.toArray(),
  },
  {
    collection: 'users',
    getData: async () => {
      const accounts = await db.accounts.toArray()
      return accounts.map(acc => ({
        id: acc.id,
        username: acc.username,
        displayName: acc.displayName,
        email: acc.email,
        phone: acc.phone,
        avatar: acc.avatar,
        role: acc.role,
        createdAt: acc.createdAt,
        lastLoginAt: acc.lastLoginAt,
      }))
    },
  },
  {
    collection: 'favorites',
    getData: () => db.favorites.toArray(),
  },
]

// ─── 核心同步方法 ───────────────────────────

/**
 * 同步单个集合到云端
 */
export async function syncCollectionToCloud(
  config: SyncConfig,
  onProgress?: ProgressCallback,
): Promise<SyncResult> {
  const startTime = Date.now()
  const { collection, getData, transform } = config

  // 更新进度：开始
  onProgress?.({
    collection,
    current: 0,
    total: 0,
    status: 'syncing',
    message: '正在读取本地数据...',
  })

  try {
    // 0. 检查 CloudBase 认证状态
    if (!isCloudBaseReady()) {
      const errorMsg = 'CloudBase 未初始化，请检查配置'
      onProgress?.({ collection, current: 0, total: 0, status: 'error', message: errorMsg })
      return { success: false, collection, total: 0, successCount: 0, failCount: 0, errors: [{ id: 'auth', error: errorMsg }], duration: Date.now() - startTime }
    }

    try {
      await loginPromise
    } catch (loginErr: any) {
      const errorMsg = 'CloudBase 认证失败: ' + (loginErr.message || '未知错误')
      onProgress?.({ collection, current: 0, total: 0, status: 'error', message: errorMsg })
      return { success: false, collection, total: 0, successCount: 0, failCount: 0, errors: [{ id: 'auth', error: errorMsg }], duration: Date.now() - startTime }
    }

    // 1. 读取本地数据
    const localData = await getData()
    const total = localData.length

    if (total === 0) {
      return {
        success: true,
        collection,
        total: 0,
        successCount: 0,
        failCount: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // 更新进度：数据读取完成
    onProgress?.({
      collection,
      current: 0,
      total,
      status: 'syncing',
      message: `共 ${total} 条记录，开始同步...`,
    })

    // 2. 分批处理
    const errors: Array<{ id: string; error: string }> = []
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < total; i += SYNC_BATCH_SIZE) {
      const batch = localData.slice(i, i + SYNC_BATCH_SIZE)
      const batchNum = Math.floor(i / SYNC_BATCH_SIZE) + 1
      const totalBatches = Math.ceil(total / SYNC_BATCH_SIZE)

      // 更新进度：当前批次
      onProgress?.({
        collection,
        current: i,
        total,
        status: 'syncing',
        message: `正在同步第 ${batchNum}/${totalBatches} 批 (${batch.length} 条)...`,
      })

      // 转换数据
      const transformedBatch = transform
        ? batch.map(transform)
        : batch.map(item => ({
            ...item,
            id: String(item.id), // 确保 id 是字符串
          }))

      // 批量上传到云端
      const result = await crudApi.batchCreate(collection, transformedBatch)

      if (result.code === 0 && result.data) {
        successCount += transformedBatch.length
      } else {
        // 批量失败，尝试单条上传
        for (const item of transformedBatch) {
          try {
            const singleResult = await crudApi.create(collection, item)
            if (singleResult.code === 0) {
              successCount++
            } else {
              failCount++
              errors.push({ id: item.id, error: singleResult.message || '创建失败' })
            }
          } catch (error: any) {
            failCount++
            errors.push({ id: item.id, error: error.message || '未知错误' })
          }
        }
      }

      // 更新进度：批次完成
      onProgress?.({
        collection,
        current: Math.min(i + SYNC_BATCH_SIZE, total),
        total,
        status: 'syncing',
        message: `已完成 ${Math.min(i + SYNC_BATCH_SIZE, total)}/${total} 条`,
      })

      // 小延迟，避免请求过快
      if (i + SYNC_BATCH_SIZE < total) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // 更新进度：完成
    const success = failCount === 0
    onProgress?.({
      collection,
      current: total,
      total,
      status: success ? 'success' : 'error',
      message: success
        ? `同步完成：${successCount} 条成功`
        : `同步完成：${successCount} 条成功，${failCount} 条失败`,
    })

    return {
      success,
      collection,
      total,
      successCount,
      failCount,
      errors: errors.slice(0, 10), // 只保留前10个错误
      duration: Date.now() - startTime,
    }

  } catch (error: any) {
    onProgress?.({
      collection,
      current: 0,
      total: 0,
      status: 'error',
      message: `同步失败：${error.message}`,
    })

    return {
      success: false,
      collection,
      total: 0,
      successCount: 0,
      failCount: 0,
      errors: [{ id: 'global', error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

/**
 * 同步所有集合到云端
 */
export async function syncAllToCloud(
  onProgress?: ProgressCallback,
  onCollectionComplete?: (result: SyncResult) => void,
): Promise<SyncAllResult> {
  const startTime = Date.now()
  const results: SyncResult[] = []

  for (const config of syncConfigs) {
    const result = await syncCollectionToCloud(config, onProgress)
    results.push(result)
    onCollectionComplete?.(result)

    // 集合间延迟，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  const totalRecords = results.reduce((sum, r) => sum + r.total, 0)
  const successRecords = results.reduce((sum, r) => sum + r.successCount, 0)
  const failRecords = results.reduce((sum, r) => sum + r.failCount, 0)

  return {
    overallSuccess: results.every(r => r.success),
    results,
    totalDuration: Date.now() - startTime,
    summary: {
      totalRecords,
      successRecords,
      failRecords,
    },
  }
}

/**
 * 同步指定集合到云端
 */
export async function syncSpecificCollections(
  collectionNames: string[],
  onProgress?: ProgressCallback,
): Promise<SyncAllResult> {
  const startTime = Date.now()
  const results: SyncResult[] = []

  const configs = syncConfigs.filter(c => collectionNames.includes(c.collection))

  for (const config of configs) {
    const result = await syncCollectionToCloud(config, onProgress)
    results.push(result)

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  const totalRecords = results.reduce((sum, r) => sum + r.total, 0)
  const successRecords = results.reduce((sum, r) => sum + r.successCount, 0)
  const failRecords = results.reduce((sum, r) => sum + r.failCount, 0)

  return {
    overallSuccess: results.every(r => r.success),
    results,
    totalDuration: Date.now() - startTime,
    summary: {
      totalRecords,
      successRecords,
      failRecords,
    },
  }
}

// ─── 便捷方法 ───────────────────────────────

/** 获取本地数据统计 */
export async function getLocalStats(): Promise<Record<string, number>> {
  const [products, hanfuItems, orders, rentalOrders, accounts, favorites] = await Promise.all([
    db.products.count(),
    db.hanfuItems.count(),
    db.orders.count(),
    db.rentalOrders.count(),
    db.accounts.count(),
    db.favorites.count(),
  ])

  return {
    products,
    hanfuItems,
    orders,
    rentalOrders,
    users: accounts,
    favorites,
  }
}

export default syncAllToCloud
