// ═══════════════════════════════════════════════
//  CloudBase 统一配置 & 初始化
// ═══════════════════════════════════════════════

import cloudbaseSDK from '@cloudbase/js-sdk'

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'sjy-d0gxtaklr8e1be761'
const region = import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai'
const publishableKey = import.meta.env.VITE_TCB_PUBLISHABLE_KEY || ''

// 统一初始化
export const cloudbase = cloudbaseSDK.init({
  env: envId,
  region,
  accessKey: publishableKey,
})

export const tcbConfig = {
  env: envId,
  region,
  publishableKey,
  endpoints: {
    storage: `https://${envId}-1429062856.tcb.qcloud.la`,
    auth: `https://${envId}.${region}.tcb-api.tencentcloudapi.com`,
    http: `https://${envId}-1429062856.${region}.app.tcloudbase.com`,
  },
} as const

// 数据库实例
let db: any = null
export async function getDb() {
  if (db) return db
  await cloudbase.auth({ persistence: 'local' }).anonymousAuthProvider().signIn().catch(() => {})
  db = cloudbase.database()
  return db
}

/** 检查 CloudBase 是否已配置 */
export function isCloudBaseReady(): boolean {
  return !!(publishableKey && envId)
}

/** 获取匿名访问令牌 */
export async function getAnonymousToken(): Promise<{ access_token: string; expires_in: number } | null> {
  if (!publishableKey) return null
  try {
    const res = await fetch(tcbConfig.endpoints.auth + '/auth/v1/signin/anonymously', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publishableKey}`,
      },
      body: JSON.stringify({}),
    })
    if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn('[CloudBase] Anonymous auth failed:', e)
    return null
  }
}

/** 上传文件到云存储 */
export async function uploadFile(file: File, path: string): Promise<string | null> {
  const token = await getAnonymousToken()
  if (!token) return null
  try {
    const url = `${tcbConfig.endpoints.storage}/upload?cloudPath=${encodeURIComponent(path)}`
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.access_token}` },
      body: form,
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    const data = await res.json()
    return data?.fileId || data?.download_url || null
  } catch (e) {
    console.warn('[CloudBase] Upload failed:', e)
    return null
  }
}

/** 获取云存储文件下载URL */
export function getFileUrl(fileId: string): string {
  return `${tcbConfig.endpoints.storage}/${fileId}`
}

// ═══════════════════════════════════════════════
//  数据库工具（统一导出）
// ═══════════════════════════════════════════════
export {
  dbQuery,
  dbGetById,
  dbInsert,
  dbBatchInsert,
  dbUpdate,
  dbDelete,
  dbCount,
  type DbResult,
  type DbOneResult,
  type DbFilter,
  type SortDirection,
  type Pagination,
} from './rdb'
