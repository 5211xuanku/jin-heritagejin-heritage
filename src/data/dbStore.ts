import db from '../db'
import type { DbHanfuItem, DbOrder, DbProduct, DbRentalOrder } from '../db'
import {
  CLOUD_COLLECTIONS,
  deleteCloudDocument,
  listCloudDocuments,
  syncHanfuItemToCloud,
  syncOrderToCloud,
  syncProductToCloud,
  syncRentalOrderToCloud,
} from '../utils/cloudSync'

const pulledTables = new Set<string>()

async function pullOnce<T>(
  tableName: string,
  collectionName: string,
  table: { bulkPut(items: T[]): Promise<unknown> },
): Promise<void> {
  if (pulledTables.has(tableName)) return
  pulledTables.add(tableName)
  const cloudRows = await listCloudDocuments<T>(collectionName as any)
  if (cloudRows.length > 0) await table.bulkPut(cloudRows)
}

async function pushInBackground(task: Promise<boolean>) {
  task.catch(error => console.warn('[CloudBase] 后台同步失败:', error))
}

export async function getHanfuItems(): Promise<DbHanfuItem[]> {
  await pullOnce<DbHanfuItem>('hanfuItems', CLOUD_COLLECTIONS.hanfuItems, db.hanfuItems)
  return db.hanfuItems.toArray()
}

export async function addHanfuItem(item: DbHanfuItem): Promise<void> {
  await db.hanfuItems.put(item)
  pushInBackground(syncHanfuItemToCloud(item))
}

export async function updateHanfuItem(id: string, updates: Partial<DbHanfuItem>): Promise<void> {
  await db.hanfuItems.update(id, updates)
  const next = await db.hanfuItems.get(id)
  if (next) pushInBackground(syncHanfuItemToCloud(next))
}

export async function seedHanfuItemsIfEmpty(items: DbHanfuItem[]): Promise<void> {
  await pullOnce<DbHanfuItem>('hanfuItems', CLOUD_COLLECTIONS.hanfuItems, db.hanfuItems)
  const count = await db.hanfuItems.count()
  if (count === 0 && items.length > 0) {
    await db.hanfuItems.bulkPut(items)
    items.forEach(item => pushInBackground(syncHanfuItemToCloud(item)))
  }
}

export async function getRentalOrders(accountId?: string): Promise<DbRentalOrder[]> {
  await pullOnce<DbRentalOrder>('rentalOrders', CLOUD_COLLECTIONS.rentalOrders, db.rentalOrders)
  if (accountId) return db.rentalOrders.where('accountId').equals(accountId).toArray()
  return db.rentalOrders.toArray()
}

export async function placeRentalOrder(order: DbRentalOrder): Promise<void> {
  await db.rentalOrders.put(order)
  pushInBackground(syncRentalOrderToCloud(order))
}

export async function updateRentalOrder(id: string, updates: Partial<DbRentalOrder>): Promise<void> {
  await db.rentalOrders.update(id, updates)
  const next = await db.rentalOrders.get(id)
  if (next) pushInBackground(syncRentalOrderToCloud(next))
}

export async function updateRentalOrderStatus(id: string, status: DbRentalOrder['status'], returnedAt?: string): Promise<void> {
  const updates: Partial<DbRentalOrder> = { status }
  if (returnedAt) updates.returnedAt = returnedAt
  await updateRentalOrder(id, updates)
}

export async function getProducts(): Promise<DbProduct[]> {
  await pullOnce<DbProduct>('products', CLOUD_COLLECTIONS.products, db.products)
  return db.products.toArray()
}

export async function addProduct(product: DbProduct): Promise<void> {
  await db.products.put(product)
  pushInBackground(syncProductToCloud(product))
}

export async function updateProduct(id: string, updates: Partial<DbProduct>): Promise<void> {
  await db.products.update(id, updates)
  const next = await db.products.get(id)
  if (next) pushInBackground(syncProductToCloud(next))
}

export async function deleteProduct(id: string): Promise<void> {
  await db.products.delete(id)
  pushInBackground(deleteCloudDocument(CLOUD_COLLECTIONS.products, id))
}

export async function seedProductsIfEmpty(items: DbProduct[]): Promise<void> {
  await pullOnce<DbProduct>('products', CLOUD_COLLECTIONS.products, db.products)
  const count = await db.products.count()
  if (count === 0 && items.length > 0) {
    await db.products.bulkPut(items)
    items.forEach(item => pushInBackground(syncProductToCloud(item)))
  }
}

export async function getShopOrders(accountId?: string): Promise<DbOrder[]> {
  await pullOnce<DbOrder>('orders', CLOUD_COLLECTIONS.orders, db.orders)
  if (accountId) return db.orders.where('accountId').equals(accountId).toArray()
  return db.orders.toArray()
}

export async function placeShopOrder(order: DbOrder): Promise<void> {
  await db.orders.put(order)
  pushInBackground(syncOrderToCloud(order))
}

export function saveCache(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function loadCache<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) as T : fallback
  } catch {
    return fallback
  }
}
