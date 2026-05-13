// ═══════════════════════════════════════════════
//  CloudBase 配置 & 匿名认证
// ═══════════════════════════════════════════════

export const tcbConfig = {
  env: import.meta.env.VITE_TCB_ENV || 'sjy-d0gxtaklr8e1be761',
  publishableKey: import.meta.env.VITE_TCB_PUBLISHABLE_KEY || '',
  region: 'ap-shanghai',
  // HTTP API 端点
  endpoints: {
    storage: `https://sjy-d0gxtaklr8e1be761-1429062856.tcb.qcloud.la`,
    auth: `https://sjy-d0gxtaklr8e1be761.ap-shanghai.tcb-api.tencentcloudapi.com`,
    http: `https://sjy-d0gxtaklr8e1be761-1429062856.ap-shanghai.app.tcloudbase.com`,
  },
} as const

/** 获取匿名访问令牌 */
export async function getAnonymousToken(): Promise<{ access_token: string; expires_in: number } | null> {
  if (!tcbConfig.publishableKey) {
    console.warn('[CloudBase] PublishableKey not configured')
    return null
  }
  try {
    const res = await fetch(tcbConfig.endpoints.auth + '/auth/v1/signin/anonymously', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tcbConfig.publishableKey}`,
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

/** 检查CloudBase是否已配置 */
export function isCloudBaseReady(): boolean {
  return !!(tcbConfig.publishableKey && tcbConfig.env)
}
