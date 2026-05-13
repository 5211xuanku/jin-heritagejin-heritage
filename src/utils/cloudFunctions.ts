// ═══════════════════════════════════════════════
//  云函数调用工具（前端使用）
// ═══════════════════════════════════════════════

// 动态导入 CloudBase SDK，避免首屏加载 694KB 的 SDK
let _cloudbase: any = null
let _initPromise: Promise<any> | null = null

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'sjy-d0gxtaklr8e1be761'
const region = import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai'
const publishableKey = import.meta.env.VITE_TCB_PUBLISHABLE_KEY || ''

async function getCloudbase() {
  if (_cloudbase) return _cloudbase
  if (_initPromise) return _initPromise

  _initPromise = import('@cloudbase/js-sdk').then(mod => {
    const sdk = mod.default
    _cloudbase = sdk.init({
      env: envId,
      region,
      accessKey: publishableKey || undefined,
    })
    return _cloudbase
  })
  return _initPromise
}

// ─── 类型定义 ───────────────────────────────

export interface CloudFunctionResponse<T = any> {
  code: number
  message: string
  data?: T
  error?: string
}

// ─── 核心调用方法 ───────────────────────────

export async function callFunction<T = any>(
  name: string,
  data: Record<string, any>,
): Promise<CloudFunctionResponse<T>> {
  try {
    const cloudbase = await getCloudbase()
    const result = await cloudbase.callFunction({ name, data })
    const res = (result as any)?.result || result
    return {
      code: res.code ?? 0,
      message: res.message ?? 'ok',
      data: res.data,
      error: res.error,
    }
  } catch (error: any) {
    return {
      code: -1,
      message: `云函数调用失败: ${error.message || error}`,
    }
  }
}

// ─── 便捷方法：auth ─────────────────────────

export const authApi = {
  register: (data: { username: string; password: string; displayName?: string }) =>
    callFunction('auth', { action: 'register', ...data }),

  login: (data: { username: string; password: string }) =>
    callFunction<{ token: string; user: any }>('auth', { action: 'login', ...data }),

  anonymous: () =>
    callFunction<{ uid: string; token: string }>('auth', { action: 'anonymous' }),

  getProfile: (userId: string) =>
    callFunction('auth', { action: 'profile', userId }),

  updateProfile: (userId: string, updates: Record<string, any>) =>
    callFunction('auth', { action: 'profile', userId, updates }),

  listUsers: (params?: { page?: number; pageSize?: number; keyword?: string; role?: string }) =>
    callFunction('auth', { action: 'list', ...params }),

  setRole: (userId: string, role: 'admin' | 'user') =>
    callFunction('auth', { action: 'setRole', userId, role }),

  removeUser: (userId: string) =>
    callFunction('auth', { action: 'remove', userId }),
}

// ─── 便捷方法：crud ─────────────────────────

export const crudApi = {
  list: <T = any>(collection: string, params?: {
    condition?: Record<string, any>
    orderBy?: string
    order?: 'asc' | 'desc'
    page?: number
    pageSize?: number
  }) => callFunction<{ list: T[]; total: number; totalPages: number }>('crud', {
    action: 'list',
    collection,
    ...params,
  }),

  get: <T = any>(collection: string, id: string) =>
    callFunction<T>('crud', { action: 'get', collection, id }),

  create: (collection: string, data: Record<string, any>) =>
    callFunction<{ id: string }>('crud', { action: 'create', collection, data }),

  update: (collection: string, id: string, data: Record<string, any>) =>
    callFunction('crud', { action: 'update', collection, id, data }),

  remove: (collection: string, id: string) =>
    callFunction('crud', { action: 'remove', collection, id }),

  batchCreate: (collection: string, dataList: Record<string, any>[]) =>
    callFunction('crud', { action: 'batchCreate', collection, dataList }),

  batchRemove: (collection: string, ids: string[]) =>
    callFunction('crud', { action: 'batchRemove', collection, ids }),

  count: (collection: string, condition?: Record<string, any>) =>
    callFunction<{ total: number }>('crud', { action: 'count', collection, condition }),
}

// ─── 便捷方法：storage ──────────────────────

export const storageApi = {
  getUploadPath: (params: { filename: string; prefix?: string; mimeType?: string; userId?: string }) =>
    callFunction<{ cloudPath: string }>('storage', { action: 'uploadUrl', ...params }),

  deleteFile: (fileId: string) =>
    callFunction('storage', { action: 'deleteFile', fileId }),

  batchDelete: (fileIds: string[]) =>
    callFunction('storage', { action: 'batchDelete', fileIds }),

  getFileUrl: (fileId: string) =>
    callFunction<{ url: string }>('storage', { action: 'getFileUrl', fileId }),

  batchGetUrl: (fileIds: string[]) =>
    callFunction('storage', { action: 'batchGetUrl', fileIds }),

  getTempUrl: (fileId: string, expire?: number) =>
    callFunction<{ url: string }>('storage', { action: 'getTempUrl', fileId, expire }),
}

// ─── 便捷方法：business ─────────────────────

export const businessApi = {
  createOrder: (data: {
    product: string
    buyer: string
    phone?: string
    address?: string
    amount: number
    items?: any[]
    remark?: string
  }) => callFunction<{ orderId: string }>('business', { action: 'createOrder', ...data }),

  updateOrderStatus: (orderId: string, status: string, remark?: string) =>
    callFunction('business', { action: 'updateOrderStatus', orderId, status, remark }),

  createRentalOrder: (data: {
    hanfuName: string
    hanfuId?: string
    renter: string
    phone?: string
    startDate: string
    endDate: string
    amount: number
    remark?: string
  }) => callFunction<{ orderId: string; rentalDays: number }>('business', { action: 'createRentalOrder', ...data }),

  updateRentalStatus: (orderId: string, status: string, remark?: string) =>
    callFunction('business', { action: 'updateRentalStatus', orderId, status, remark }),

  getDashboard: () =>
    callFunction('business', { action: 'getDashboard' }),

  getSalesStats: (period?: 'week' | 'month' | 'year') =>
    callFunction('business', { action: 'getSalesStats', period }),

  getPopularProducts: (limit?: number) =>
    callFunction('business', { action: 'getPopularProducts', limit }),
}

export default callFunction
