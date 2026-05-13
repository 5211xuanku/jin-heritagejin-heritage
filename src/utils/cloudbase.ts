import cloudbaseSDK from '@cloudbase/js-sdk'

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'sjy-d0gxtaklr8e1be761'
const region = import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai'
const publishableKey = import.meta.env.VITE_TCB_PUBLISHABLE_KEY || ''

export const cloudbase = cloudbaseSDK.init({
  env: envId,
  region,
  accessKey: publishableKey || undefined,
})

async function signInAnonymously() {
  try {
    const authObj: any = cloudbase.auth()
    if (typeof authObj.login === 'function') {
      return await authObj.login({ anonymous: true })
    }
    if (typeof authObj.anonymousAuthProvider === 'function') {
      return await authObj.anonymousAuthProvider().signIn()
    }
  } catch (error) {
    console.warn('[CloudBase] 匿名登录失败:', error)
  }
  return null
}

export const loginPromise = signInAnonymously()
export const auth = cloudbase.auth()

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

let dbInstance: ReturnType<typeof cloudbase.database> | null = null

export function getDb() {
  if (!dbInstance) dbInstance = cloudbase.database()
  return dbInstance
}

// ═══════════════════════════════════════════════
//  RDB 关系型数据库
// ═══════════════════════════════════════════════

let rdbInstance: ReturnType<typeof cloudbase.rdb> | null = null

/** 获取 RDB 关系型数据库实例（单例） */
export function getRdb() {
  if (!rdbInstance) rdbInstance = cloudbase.rdb()
  return rdbInstance
}

export function isCloudBaseReady(): boolean {
  return Boolean(envId)
}

export async function getAnonymousToken(): Promise<{ access_token: string; expires_in: number } | null> {
  if (!publishableKey) return null
  try {
    const res = await fetch(`${tcbConfig.endpoints.auth}/auth/v1/signin/anonymously`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publishableKey}`,
      },
      body: JSON.stringify({}),
    })
    if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
    return await res.json()
  } catch (error) {
    console.warn('[CloudBase] 匿名令牌获取失败:', error)
    return null
  }
}

export async function uploadFile(file: File, path: string): Promise<string | null> {
  const token = await getAnonymousToken()
  if (!token) return null

  try {
    const url = `${tcbConfig.endpoints.storage}/upload?cloudPath=${encodeURIComponent(path)}`
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.access_token}` },
      body: form,
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    const data = await res.json()
    return data?.fileId || data?.download_url || null
  } catch (error) {
    console.warn('[CloudBase] 文件上传失败:', error)
    return null
  }
}

export function getFileUrl(fileId: string): string {
  return `${tcbConfig.endpoints.storage}/${fileId}`
}

export default cloudbase
