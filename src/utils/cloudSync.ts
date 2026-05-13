import { getDb, isCloudBaseReady, loginPromise, tcbConfig } from './cloudbase'
import db from '../db'
import type { DbHanfuItem, DbOrder, DbProduct, DbRentalOrder } from '../db'

export const CLOUD_COLLECTIONS = {
  products: 'products',
  hanfuItems: 'hanfuItems',
  orders: 'orders',
  rentalOrders: 'rentalOrders',
  users: 'users',
  favorites: 'favorites',
  danmus: 'danmus',
} as const

type CollectionName = (typeof CLOUD_COLLECTIONS)[keyof typeof CLOUD_COLLECTIONS]

export interface CloudDanmu {
  id?: string | number
  playId?: string
  text: string
  user?: string
  author?: string
  color?: string
  position?: 'top' | 'bottom' | 'middle'
  top?: number
  delay?: number
  tone?: string
  createdAt?: string
}

export interface CloudOrder {
  id: string
  product?: string
  buyer?: string
  phone?: string
  address?: string
  amount?: number
  status?: string
  createdAt?: string
  [key: string]: unknown
}

export interface CloudRentalOrder {
  id: string
  hanfuName?: string
  renter?: string
  phone?: string
  startDate?: string
  endDate?: string
  amount?: number
  status?: string
  createdAt?: string
  [key: string]: unknown
}

export interface CloudUser {
  id: string
  username?: string
  displayName?: string
  email?: string
  phone?: string
  avatar?: string
  role?: 'admin' | 'user'
  createdAt?: string
  lastLoginAt?: string
}

export function getCloudSyncStatus() {
  return {
    ready: isCloudBaseReady(),
    env: tcbConfig.env,
    region: tcbConfig.region,
  }
}

async function ensureCloudReady(): Promise<boolean> {
  if (!isCloudBaseReady()) return false
  await loginPromise
  return true
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUndefined) as T
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, item]) => {
      if (item !== undefined) acc[key] = stripUndefined(item)
      return acc
    }, {}) as T
  }
  return value
}

function docId(id: string | number): string {
  return String(id).replace(/[/.#[\]\s]/g, '_')
}

export async function upsertCloudDocument<T extends { id?: string | number }>(
  collectionName: CollectionName,
  id: string | number,
  data: T,
): Promise<boolean> {
  try {
    if (!(await ensureCloudReady())) return false
    const payload = stripUndefined({
      ...data,
      id: data.id ?? String(id),
      updatedAt: new Date().toISOString(),
    })
    await getDb().collection(collectionName).doc(docId(id)).set(payload)
    return true
  } catch (error) {
    console.warn(`[CloudBase] 同步 ${collectionName}/${id} 失败:`, error)
    return false
  }
}

export async function deleteCloudDocument(collectionName: CollectionName, id: string | number): Promise<boolean> {
  try {
    if (!(await ensureCloudReady())) return false
    await getDb().collection(collectionName).doc(docId(id)).remove()
    return true
  } catch (error) {
    console.warn(`[CloudBase] 删除 ${collectionName}/${id} 失败:`, error)
    return false
  }
}

export async function listCloudDocuments<T>(collectionName: CollectionName, limit = 300): Promise<T[]> {
  try {
    if (!(await ensureCloudReady())) return []
    const result: any = await getDb().collection(collectionName).limit(limit).get()
    return Array.isArray(result?.data) ? result.data as T[] : []
  } catch (error) {
    console.warn(`[CloudBase] 拉取 ${collectionName} 失败:`, error)
    return []
  }
}

export async function syncProductToCloud(product: DbProduct): Promise<boolean> {
  return upsertCloudDocument(CLOUD_COLLECTIONS.products, product.id, product)
}

export async function syncHanfuItemToCloud(item: DbHanfuItem): Promise<boolean> {
  return upsertCloudDocument(CLOUD_COLLECTIONS.hanfuItems, item.id, item)
}

export async function syncOrderToCloud(order: DbOrder | CloudOrder): Promise<boolean> {
  return upsertCloudDocument(CLOUD_COLLECTIONS.orders, order.id, {
    ...order,
    createdAt: order.createdAt || new Date().toISOString(),
  })
}

export async function syncRentalOrderToCloud(order: DbRentalOrder | CloudRentalOrder): Promise<boolean> {
  return upsertCloudDocument(CLOUD_COLLECTIONS.rentalOrders, order.id, {
    ...order,
    createdAt: order.createdAt || new Date().toISOString(),
  })
}

export async function syncFavoritesToCloud(accountId: string, productIds: string[]): Promise<boolean> {
  return upsertCloudDocument(CLOUD_COLLECTIONS.favorites, accountId, {
    id: accountId,
    accountId,
    productIds,
  })
}

export async function loadFavoritesFromCloud(accountId: string): Promise<string[]> {
  const result = await listCloudDocuments<{ accountId: string; productIds?: string[] }>(CLOUD_COLLECTIONS.favorites)
  return result.find(item => item.accountId === accountId)?.productIds || []
}

export async function syncUserToCloud(user: CloudUser): Promise<boolean> {
  return upsertCloudDocument(CLOUD_COLLECTIONS.users, user.id, {
    ...user,
    createdAt: user.createdAt || new Date().toISOString(),
  })
}

export async function loadUserFromCloud(userId: string): Promise<CloudUser | null> {
  const docs = await listCloudDocuments<CloudUser>(CLOUD_COLLECTIONS.users)
  return docs.find(item => item.id === userId) || null
}

export async function syncDanmuToCloud(danmus: CloudDanmu[], playId = 'default'): Promise<boolean> {
  return upsertCloudDocument(CLOUD_COLLECTIONS.danmus, playId, {
    id: playId,
    playId,
    items: danmus,
  })
}

export async function loadDanmuFromCloud(playId = 'default'): Promise<CloudDanmu[]> {
  try {
    const doc: any = await getDb().collection(CLOUD_COLLECTIONS.danmus).doc(docId(playId)).get()
    const items = doc?.data?.items
    if (Array.isArray(items)) return items
  } catch {
    // 兼容旧集合 danmu/danmu_list。
  }

  try {
    const legacy: any = await getDb().collection('danmu').doc('danmu_list').get()
    const items = legacy?.data?.items
    return Array.isArray(items) ? items : []
  } catch (error) {
    console.warn('[CloudBase] 拉取弹幕失败:', error)
    return []
  }
}

async function pushTable<T extends { id: string }>(
  name: string,
  rows: T[],
  syncOne: (row: T) => Promise<boolean>,
  results: Record<string, boolean>,
) {
  if (rows.length === 0) {
    results[name] = true
    return
  }
  for (const row of rows) {
    results[`${name}_${row.id}`] = await syncOne(row)
  }
}

export async function pullCloudDataToLocal(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  const products = await listCloudDocuments<DbProduct>(CLOUD_COLLECTIONS.products)
  if (products.length > 0) {
    await db.products.bulkPut(products)
    counts.products = products.length
  }

  const hanfuItems = await listCloudDocuments<DbHanfuItem>(CLOUD_COLLECTIONS.hanfuItems)
  if (hanfuItems.length > 0) {
    await db.hanfuItems.bulkPut(hanfuItems)
    counts.hanfuItems = hanfuItems.length
  }

  const orders = await listCloudDocuments<DbOrder>(CLOUD_COLLECTIONS.orders)
  if (orders.length > 0) {
    await db.orders.bulkPut(orders)
    counts.orders = orders.length
  }

  const rentalOrders = await listCloudDocuments<DbRentalOrder>(CLOUD_COLLECTIONS.rentalOrders)
  if (rentalOrders.length > 0) {
    await db.rentalOrders.bulkPut(rentalOrders)
    counts.rentalOrders = rentalOrders.length
  }

  // 用户集合只同步公开资料和角色，不覆盖本地账号密码表。
  const users = await listCloudDocuments<CloudUser>(CLOUD_COLLECTIONS.users)
  counts.users = users.length

  return counts
}

export async function syncAllToCloud(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {}

  await pushTable('product', await db.products.toArray(), syncProductToCloud, results)
  await pushTable('hanfu', await db.hanfuItems.toArray(), syncHanfuItemToCloud, results)
  await pushTable('order', await db.orders.toArray(), syncOrderToCloud, results)
  await pushTable('rental', await db.rentalOrders.toArray(), syncRentalOrderToCloud, results)

  for (const favorite of await db.favorites.toArray()) {
    results[`favorite_${favorite.accountId}`] = await syncFavoritesToCloud(favorite.accountId, favorite.productIds)
  }

  for (const account of await db.accounts.toArray()) {
    results[`user_${account.id}`] = await syncUserToCloud({
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      email: account.email,
      phone: account.phone,
      avatar: account.avatar,
      role: account.role,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
    })
  }

  const cachedDanmus = (window as any).__LOCAL_DANMU__ as CloudDanmu[] | undefined
  if (cachedDanmus?.length) {
    results.danmus = await syncDanmuToCloud(cachedDanmus)
  }

  return results
}
