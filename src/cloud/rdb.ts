// ═══════════════════════════════════════════════
//  CloudBase 数据库工具封装（NoSQL）
// ═══════════════════════════════════════════════

import { getDb } from './index'

// ─── 类型定义 ───────────────────────────────

export interface DbResult<T = any> {
  data: T[]
  error: null | { code: number; message: string }
}

export interface DbOneResult<T = any> {
  data: T | null
  error: null | { code: number; message: string }
}

export type DbFilter = {
  field: string
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'
  value: any
}

export type SortDirection = 'asc' | 'desc'

export interface Pagination {
  page: number
  pageSize: number
}

// ─── 核心方法 ───────────────────────────────

/**
 * 查询集合数据
 */
export async function dbQuery<T = any>(
  collection: string,
  options?: {
    filters?: DbFilter[]
    orderBy?: { field: string; direction: SortDirection }
    pagination?: Pagination
  },
): Promise<DbResult<T>> {
  try {
    const db = await getDb()
    let query = db.collection(collection)

    // 构建查询条件
    if (options?.filters?.length) {
      const where: Record<string, any> = {}
      for (const f of options.filters) {
        where[f.field] = f.value
      }
      query = query.where(where)
    }

    // 排序
    if (options?.orderBy) {
      query = query.orderBy(options.orderBy.field, options.orderBy.direction)
    }

    // 分页
    const pageSize = options?.pagination?.pageSize || 100
    const page = options?.pagination?.page || 1
    query = query.limit(pageSize).skip((page - 1) * pageSize)

    const { data } = await query.get()
    return { data: data as T[], error: null }
  } catch (error: any) {
    console.warn(`[DB] 查询 ${collection} 失败:`, error)
    return { data: [], error: { code: -1, message: error.message } }
  }
}

/**
 * 根据 ID 获取单条
 */
export async function dbGetById<T = any>(
  collection: string,
  id: string,
): Promise<DbOneResult<T>> {
  try {
    const db = await getDb()
    const { data } = await db.collection(collection).doc(id).get()
    return { data: data as T, error: null }
  } catch (error: any) {
    return { data: null, error: { code: -1, message: error.message } }
  }
}

/**
 * 插入数据
 */
export async function dbInsert<T = any>(
  collection: string,
  doc: Record<string, any>,
): Promise<DbOneResult<T>> {
  try {
    const db = await getDb()
    const result = await db.collection(collection).add({
      ...doc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return { data: { id: result.id, ...doc } as T, error: null }
  } catch (error: any) {
    return { data: null, error: { code: -1, message: error.message } }
  }
}

/**
 * 批量插入
 */
export async function dbBatchInsert<T = any>(
  collection: string,
  docs: Record<string, any>[],
): Promise<DbResult<T>> {
  try {
    const results: T[] = []
    for (const doc of docs) {
      const result = await dbInsert<T>(collection, doc)
      if (result.data) results.push(result.data)
    }
    return { data: results, error: null }
  } catch (error: any) {
    return { data: [], error: { code: -1, message: error.message } }
  }
}

/**
 * 更新数据
 */
export async function dbUpdate(
  collection: string,
  id: string,
  updates: Record<string, any>,
): Promise<{ success: boolean; error: null | { code: number; message: string } }> {
  try {
    const db = await getDb()
    await db.collection(collection).doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: { code: -1, message: error.message } }
  }
}

/**
 * 删除数据
 */
export async function dbDelete(
  collection: string,
  id: string,
): Promise<{ success: boolean; error: null | { code: number; message: string } }> {
  try {
    const db = await getDb()
    await db.collection(collection).doc(id).remove()
    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: { code: -1, message: error.message } }
  }
}

/**
 * 统计数量
 */
export async function dbCount(
  collection: string,
  filters?: DbFilter[],
): Promise<{ count: number; error: null | { code: number; message: string } }> {
  try {
    const db = await getDb()
    let query = db.collection(collection)
    if (filters?.length) {
      const where: Record<string, any> = {}
      for (const f of filters) {
        where[f.field] = f.value
      }
      query = query.where(where)
    }
    const { total } = await query.count()
    return { count: total, error: null }
  } catch (error: any) {
    return { count: 0, error: { code: -1, message: error.message } }
  }
}
