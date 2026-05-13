import db, { type DbAccount } from './db'

export type { DbAccount as Account }
export type AccountRole = 'admin' | 'user'

const HASH_PREFIX = 'pbkdf2'
const HASH_ITERATIONS = 210_000

function legacyHashPassword(pw: string): string {
  let masked = ''
  for (let i = 0; i < pw.length; i++) {
    masked += String.fromCharCode(pw.charCodeAt(i) ^ 0x2a)
  }
  return btoa(masked)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: HASH_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return `${HASH_PREFIX}$${HASH_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`
}

async function verifyPassword(pw: string, stored: string): Promise<{ ok: boolean; needsMigration: boolean }> {
  if (!stored.startsWith(`${HASH_PREFIX}$`)) {
    return { ok: stored === legacyHashPassword(pw), needsMigration: true }
  }

  const [, iterations, saltValue, hashValue] = stored.split('$')
  if (!iterations || !saltValue || !hashValue) return { ok: false, needsMigration: false }

  const salt = base64ToBytes(saltValue)
  const saltBuffer = new ArrayBuffer(salt.byteLength)
  new Uint8Array(saltBuffer).set(salt)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations: Number(iterations), hash: 'SHA-256' },
    key,
    256,
  )
  return { ok: bytesToBase64(new Uint8Array(bits)) === hashValue, needsMigration: false }
}

function normalize(v: string) { return v.trim().toLowerCase() }

function syncAccountProfile(account: DbAccount) {
  import('./utils/cloudSync')
    .then(({ syncUserToCloud }) => syncUserToCloud({
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      email: account.email,
      phone: account.phone,
      avatar: account.avatar,
      role: account.role,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
    }))
    .catch(error => console.warn('[CloudBase] 用户资料同步失败:', error))
}

export async function findAccount(identifier: string): Promise<DbAccount | undefined> {
  const key = normalize(identifier)
  return db.accounts
    .filter(a => normalize(a.username) === key || normalize(a.email) === key || normalize(a.phone) === key)
    .first()
}

export async function loginAccount(identifier: string, password: string): Promise<DbAccount | null> {
  const account = await findAccount(identifier)
  if (!account) return null
  const verification = await verifyPassword(password, account.password)
  if (!verification.ok) return null
  const lastLoginAt = new Date().toISOString()
  const updates: Partial<DbAccount> = { lastLoginAt }
  if (verification.needsMigration) updates.password = await hashPassword(password)
  await db.accounts.update(account.id, updates)
  const next = { ...account, ...updates }
  syncAccountProfile(next)
  return next
}

export async function registerAccount(input: {
  username: string
  displayName: string
  email: string
  phone: string
  password: string
}): Promise<DbAccount> {
  const username = input.username.trim()
  const email = input.email.trim()
  const phone = input.phone.trim()

  if (!username || !email || !phone || !input.password) throw new Error('请填写完整账户资料')

  const existing = await db.accounts
    .filter(a => normalize(a.username) === normalize(username) || normalize(a.email) === normalize(email) || normalize(a.phone) === normalize(phone))
    .first()
  if (existing) {
    if (normalize(existing.username) === normalize(username)) throw new Error('账号已存在')
    if (normalize(existing.email) === normalize(email)) throw new Error('邮箱已被注册')
    throw new Error('手机号已被注册')
  }

  const id = `user-${Date.now()}`
  const account: DbAccount = {
    id,
    username,
    displayName: input.displayName.trim() || username,
    email,
    phone,
    password: await hashPassword(input.password),
    role: 'user',
    createdAt: new Date().toISOString(),
  }
  await db.accounts.add(account)
  syncAccountProfile(account)
  return account
}

export async function resetAccountPassword(identifier: string, newPassword: string): Promise<void> {
  const account = await findAccount(identifier)
  if (!account) throw new Error('未找到账户')
  if (account.role === 'admin') throw new Error('管理员账号请使用默认密码登录后修改')
  if (!newPassword.trim()) throw new Error('请填写新密码')
  await db.accounts.update(account.id, { password: await hashPassword(newPassword) })
}

export async function getAccounts(): Promise<DbAccount[]> {
  try {
    return await db.accounts.toArray()
  } catch {
    return []
  }
}

export async function updateAccount(id: string, updates: Partial<Pick<DbAccount, 'displayName' | 'email' | 'phone' | 'avatar'>>): Promise<void> {
  const account = await db.accounts.get(id)
  if (!account) throw new Error('账户不存在')
  await db.accounts.update(id, updates)
  syncAccountProfile({ ...account, ...updates })
}

export async function changePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
  const account = await db.accounts.get(id)
  if (!account) throw new Error('账户不存在')
  const verification = await verifyPassword(oldPassword, account.password)
  if (!verification.ok) throw new Error('原密码错误')
  if (!newPassword.trim()) throw new Error('新密码不能为空')
  await db.accounts.update(id, { password: await hashPassword(newPassword) })
}

export async function updateAccountRole(id: string, role: 'admin' | 'user'): Promise<void> {
  await db.accounts.update(id, { role })
  const account = await db.accounts.get(id)
  if (account) syncAccountProfile(account)
}

// Sync fallback for backward compat - returns empty (admin handled separately)
export function getAccountsSync(): DbAccount[] { return [] }
