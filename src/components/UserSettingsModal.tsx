import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Key, Package, Shield, User } from 'lucide-react'
import { Account, updateAccount, changePassword, updateAccountRole, getAccounts } from '../accountStore'
import { loadOrders as loadRentalOrders, RentalOrder, statusConfig, loadOrdersFromDB } from '../data/hanfuData'
import { getShopOrders } from '../data/dbStore'

type Tab = 'profile' | 'password' | 'orders' | 'admin'

export default function UserSettingsModal({
  account, accountsSnapshot = [], onClose, onUpdate,
}: {
  account: Account
  accountsSnapshot?: Account[]
  onClose: () => void
  onUpdate: (updated: Account) => void
}) {
  const isAdmin = account.role === 'admin'
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [displayName, setDisplayName] = useState(account.displayName || '')
  const [email, setEmail] = useState(account.email)
  const [phone, setPhone] = useState(account.phone)
  const [avatar, setAvatar] = useState(account.avatar || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Password
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  // Orders
  const [shopOrders, setShopOrders] = useState<any[]>([])
  const [rentalOrders, setRentalOrders] = useState<RentalOrder[]>([])

  // Admin
  const [allAccounts, setAllAccounts] = useState<Account[]>([])

  const refreshAccountList = async () => {
    const fromDb = await getAccounts()
    const merged = new Map<string, Account>()
    ;[...accountsSnapshot, ...fromDb].forEach(a => merged.set(a.id, a))
    setAllAccounts(Array.from(merged.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')))
  }

  useEffect(() => {
    // Load orders from Dexie first, localStorage fallback
    getShopOrders(account.id).then(dbo => {
      if (dbo.length > 0) setShopOrders(dbo.map(o => ({ orderNo: o.id, items: o.items, total: o.total, createdAt: o.createdAt })))
      else { const so = JSON.parse(localStorage.getItem('jh_orders') || '[]'); setShopOrders(so) }
    }).catch(() => { const so = JSON.parse(localStorage.getItem('jh_orders') || '[]'); setShopOrders(so) })
    loadOrdersFromDB(account.id).then(dbr => {
      if (dbr.length > 0) setRentalOrders(dbr)
      else setRentalOrders(loadRentalOrders())
    }).catch(() => setRentalOrders(loadRentalOrders()))
    if (isAdmin) refreshAccountList()
  }, [isAdmin, account.id, accountsSnapshot])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 2000) }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await updateAccount(account.id, { displayName: displayName.trim() || account.username, email, phone, avatar: avatar || undefined })
      onUpdate({ ...account, displayName: displayName.trim() || account.username, email, phone, avatar })
      showMsg('✅ 资料已保存')
    } catch (e: any) {
      showMsg('❌ ' + (e.message || '保存失败'))
    }
    setSaving(false)
  }

  const changePw = async () => {
    if (newPw !== confirmPw) { showMsg('❌ 两次密码不一致'); return }
    if (newPw.length < 4) { showMsg('❌ 密码至少4位'); return }
    setSaving(true)
    try {
      await changePassword(account.id, oldPw, newPw)
      setOldPw(''); setNewPw(''); setConfirmPw('')
      showMsg('✅ 密码已修改')
    } catch (e: any) {
      showMsg('❌ ' + (e.message || '修改失败'))
    }
    setSaving(false)
  }

  const handleRoleChange = async (userId: string, role: 'admin' | 'user') => {
    try {
      await updateAccountRole(userId, role)
      await refreshAccountList()
      showMsg('✅ 角色已更新')
    } catch { showMsg('❌ 更新失败') }
  }

  const tabs: { key: Tab; icon: typeof User; label: string }[] = [
    { key: 'profile', icon: User, label: '个人资料' },
    { key: 'password', icon: Key, label: '修改密码' },
    { key: 'orders', icon: Package, label: '我的订单' },
    ...(isAdmin ? [{ key: 'admin' as Tab, icon: Shield, label: '用户管理' }] : []),
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#0d0610] glass-window overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-red-600 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{account.displayName?.[0] || account.username?.[0] || 'U'}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{account.displayName || account.username}</h2>
              <p className="text-xs text-white/40">{account.role === 'admin' ? '管理员' : '用户'} · {account.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 glass-control text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 shrink-0 px-5 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === t.key ? 'border-amber-400 text-amber-300' : 'border-transparent text-white/50 hover:text-white/70'}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[55vh]">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-red-600 flex items-center justify-center overflow-hidden">
                    {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-white">{account.displayName?.[0] || 'U'}</span>}
                  </div>
                  <label className="absolute -bottom-1 -right-1 rounded-full bg-white/10 hover:bg-white/20 p-1.5 cursor-pointer border border-white/20">
                    <Camera className="h-3.5 w-3.5 text-white/70" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (f.size > 2 * 1024 * 1024) { showMsg('❌ 头像不能超过2MB'); return }
                      const r = new FileReader()
                      r.onload = () => setAvatar(r.result as string)
                      r.readAsDataURL(f)
                    }} />
                  </label>
                </div>
                <div>
                  <div className="text-sm text-white/60">上传头像（≤2MB）</div>
                  <div className="text-xs text-white/30 mt-1">或粘贴图片URL到下方输入框</div>
                </div>
              </div>
              <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="头像URL地址" className="w-full rounded-xl px-4 py-2.5 text-sm text-white glass-control" />
              <div className="grid grid-cols-1 gap-3">
                <div><label className="text-xs text-white/40 mb-1 block">昵称</label><input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-sm text-white glass-control" /></div>
                <div><label className="text-xs text-white/40 mb-1 block">邮箱</label><input value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-sm text-white glass-control" /></div>
                <div><label className="text-xs text-white/40 mb-1 block">手机号</label><input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-sm text-white glass-control" /></div>
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="w-full rounded-xl bg-amber-500/20 hover:bg-amber-500/30 py-3 text-sm font-bold text-amber-300 disabled:opacity-50">
                {saving ? '保存中...' : '保存资料'}
              </button>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="原密码" className="w-full rounded-xl px-4 py-2.5 text-sm text-white glass-control" />
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="新密码（至少4位）" className="w-full rounded-xl px-4 py-2.5 text-sm text-white glass-control" />
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="确认新密码" className="w-full rounded-xl px-4 py-2.5 text-sm text-white glass-control" />
              <button onClick={changePw} disabled={saving}
                className="w-full rounded-xl bg-amber-500/20 hover:bg-amber-500/30 py-3 text-sm font-bold text-amber-300 disabled:opacity-50">
                {saving ? '修改中...' : '修改密码'}
              </button>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Rental Orders */}
              <div>
                <h3 className="text-sm font-semibold text-white/70 mb-3">👘 汉服租赁</h3>
                {rentalOrders.length === 0 ? (
                  <p className="text-white/30 text-sm py-4 text-center">暂无租赁记录</p>
                ) : (
                  rentalOrders.slice(0, 10).map(o => {
                    const cfg = statusConfig[o.status]
                    return (
                      <div key={o.id} className="glass-panel rounded-xl p-3 mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-white/30 font-mono">{o.id}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: cfg.color + '20', color: cfg.color }}>{cfg.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {o.items.slice(0, 3).map(i => (
                            <span key={i.id} className="text-xs text-white/60">{i.name}</span>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-white/30">租金 ¥{o.totalRentalFee.toFixed(0)}</span>
                          <span className="text-amber-400">押金 ¥{o.totalDeposit.toFixed(0)}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              {/* Shop Orders */}
              <div>
                <h3 className="text-sm font-semibold text-white/70 mb-3">🛍️ 精品好物</h3>
                {shopOrders.length === 0 ? (
                  <p className="text-white/30 text-sm py-4 text-center">暂无商城记录</p>
                ) : (
                  shopOrders.slice(0, 10).map((o: any) => (
                    <div key={o.orderNo} className="glass-panel rounded-xl p-3 mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-white/30 font-mono">{o.orderNo}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/15 text-green-400">已支付</span>
                      </div>
                      <div className="text-xs text-white/60">¥{o.total} · {o.items?.length || 0}件 · {o.createdAt}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white/70 mb-3">👥 用户管理（{allAccounts.length}人）</h3>
              {allAccounts.map(a => (
                <div key={a.id} className="glass-panel rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-red-600 flex items-center justify-center shrink-0">
                    {a.avatar ? <img src={a.avatar} className="w-full h-full object-cover rounded-xl" /> : <span className="text-sm font-bold text-white">{a.displayName?.[0] || a.username?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80">{a.displayName || a.username}</div>
                    <div className="text-xs text-white/40">{a.email}</div>
                  </div>
                  <select value={a.role} onChange={e => handleRoleChange(a.id, e.target.value as 'admin' | 'user')}
                    className="rounded-xl px-3 py-1.5 text-xs glass-control text-white/80">
                    <option value="user" className="bg-gray-900">用户</option>
                    <option value="admin" className="bg-gray-900">管理员</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toast */}
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl glass-panel px-4 py-2 text-sm text-white/80">
              {msg}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
