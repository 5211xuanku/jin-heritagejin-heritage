import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Package, BookOpen, Shield, TrendingUp, Clock, ChevronDown } from 'lucide-react'
import type { Account } from '../accountStore'
import { getAccounts, updateAccountRole } from '../accountStore'
import { loadOrders as loadRentalOrders, loadOrdersFromDB, RentalOrder, statusConfig } from '../data/hanfuData'
// import { pullCloudDataToLocal, syncAllToCloud } from '../utils/cloudSync'
import CloudSyncPanel from './CloudSyncPanel'
import CloudSyncDebug from './CloudSyncDebug'
import { getShopOrders } from '../data/dbStore'
import { CheckCircle, AlertCircle } from 'lucide-react'

type AdminTab = 'overview' | 'users' | 'orders' | 'content'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [rentalOrders, setRentalOrders] = useState<RentalOrder[]>([])
  const [shopOrders, setShopOrders] = useState<any[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // const [_syncing, setSyncing] = useState(false)
  // const [syncResult, setSyncResult] = useState<Record<string, boolean> | null>(null)
  const [syncResult, _setSyncResult] = useState<Record<string, boolean> | null>(null)
  const [showSyncPanel, setShowSyncPanel] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setAccounts(await getAccounts())
    const dbRentalOrders = await loadOrdersFromDB()
    setRentalOrders(dbRentalOrders.length > 0 ? dbRentalOrders : loadRentalOrders())
    setShopOrders(await getShopOrders())
  }



  const adminAccounts = accounts.filter(a => a.role === 'admin')
  const userAccounts = accounts.filter(a => a.role === 'user')
  const totalRevenue = shopOrders.reduce((s: number, o: any) => s + (o.total || 0), 0)
    + rentalOrders.reduce((s, o) => s + (o.grandTotal || 0), 0)
  const pendingRentals = rentalOrders.filter(o => o.status === 'pending_pickup')

  const tabs: { key: AdminTab; icon: typeof Shield; label: string; count?: number }[] = [
    { key: 'overview', icon: TrendingUp, label: '概览' },
    { key: 'users', icon: Users, label: '用户', count: accounts.length },
    { key: 'orders', icon: Package, label: '订单', count: rentalOrders.length + shopOrders.length },
    { key: 'content', icon: BookOpen, label: '内容' },
  ]

  const handleRole = async (id: string, role: 'admin' | 'user') => {
    await updateAccountRole(id, role)
    await loadData()
  }

  const toggleExpand = (id: string) => {
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-all ${activeTab === t.key ? 'bg-amber-500/20 text-amber-300' : 'glass-control text-white/60 hover:text-white'}`}>
            <t.icon className="h-4 w-4" />{t.label}
            {t.count !== undefined && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '👤', label: '总用户', value: accounts.length, color: 'from-amber-500/20 to-amber-600/10' },
              { icon: '🛡️', label: '管理员', value: adminAccounts.length, color: 'from-red-500/20 to-red-600/10' },
              { icon: '📦', label: '总订单', value: rentalOrders.length + shopOrders.length, color: 'from-blue-500/20 to-blue-600/10' },
              { icon: '💰', label: '总流水', value: '¥' + totalRevenue.toLocaleString(), color: 'from-green-500/20 to-green-600/10' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="glass-panel rounded-2xl p-5 text-center">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/50 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Pending rentals */}
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" />待处理租赁 ({pendingRentals.length})</h3>
              {pendingRentals.length === 0 ? <p className="text-white/30 text-sm">无待处理订单</p> : pendingRentals.slice(0, 5).map(o => {
                const cfg = statusConfig[o.status]
                return (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <div className="text-sm text-white/80 truncate">{o.renter.name}</div>
                      <div className="text-xs text-white/40">{o.items?.[0]?.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-amber-400">¥{o.grandTotal}</div>
                      <div className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recent users */}
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-amber-400" />最近用户</h3>
              {accounts.slice(-5).reverse().map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-red-600 flex items-center justify-center text-xs font-bold text-white">{a.displayName?.[0] || 'U'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 truncate">{a.displayName || a.username}</div>
                    <div className="text-xs text-white/40">{a.email || a.phone || '—'}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${a.role === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-white/10 text-white/50'}`}>{a.role === 'admin' ? '管理' : '用户'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Users ─── */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm text-white/40 mb-2">
            <span>管理员 {adminAccounts.length} 人</span>
            <span>普通用户 {userAccounts.length} 人</span>
          </div>
          {accounts.map(a => (
            <div key={a.id} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-red-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0">
                {a.avatar ? <img src={a.avatar} className="w-full h-full object-cover" /> : (a.displayName?.[0] || a.username?.[0] || 'U')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80">{a.displayName || a.username}</div>
                <div className="text-xs text-white/40">{a.email || a.phone || '无联系方式'} · {a.id.startsWith('tcb-') ? 'CloudBase账户' : '本地账户'}</div>
              </div>
              <select value={a.role} onChange={e => handleRole(a.id, e.target.value as 'admin' | 'user')}
                className="rounded-xl px-3 py-1.5 text-xs glass-control text-white/80">
                <option value="user" className="bg-gray-900">用户</option>
                <option value="admin" className="bg-gray-900">管理员</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* ─── Orders ─── */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">👘 租赁订单 ({rentalOrders.length})</h3>
            {rentalOrders.length === 0 ? <p className="text-white/30 text-sm">暂无</p> :
              rentalOrders.map(o => {
                const cfg = statusConfig[o.status]
                const isOpen = expanded.has(o.id)
                return (
                  <div key={o.id} className="glass-panel rounded-2xl p-4 mb-2 cursor-pointer" onClick={() => toggleExpand(o.id)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-white/30 font-mono mr-2">{o.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: cfg.color + '20', color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-400">¥{o.grandTotal}</span>
                        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    <div className="text-xs text-white/50 mt-1">{o.renter.name} · {o.renter.phone} · {o.totalDays}天</div>
                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-xs text-white/50">
                        {o.items.map((i, idx) => <div key={idx}>{i.name} ×{i.quantity} ({i.selectedSize}/{i.selectedColor})</div>)}
                        <div>取衣: {o.rentStart} → 还衣: {o.rentEnd}</div>
                        {o.renter.notes && <div>备注: {o.renter.notes}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">🛍️ 商城订单 ({shopOrders.length})</h3>
            {shopOrders.length === 0 ? <p className="text-white/30 text-sm">暂无</p> :
              shopOrders.map((o: any) => (
                <div key={o.orderNo} className="glass-panel rounded-2xl p-4 mb-2">
                  <div className="flex justify-between">
                    <div>
                      <span className="text-xs text-white/30 font-mono">{o.orderNo}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 ml-2">已支付</span>
                    </div>
                    <span className="text-sm font-bold text-amber-400">¥{o.total}</span>
                  </div>
                  <div className="text-xs text-white/50 mt-1">{o.recip} · {o.phone} · {o.createdAt}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─── Content ─── */}
      {activeTab === 'content' && (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: '🎭', label: '剧目管理', desc: `${playsData.length} 部剧目`, hint: '前往演艺观赏 → 管理员添加' },
            { icon: '👘', label: '汉服管理', desc: '12 款汉服', hint: '前往汉服租赁 → 管理员编辑封面' },
            { icon: '🛍️', label: '商品管理', desc: '前往精品好物', hint: '添加/编辑商品和图片' },
            { icon: '📖', label: '课程管理', desc: '6 门课程', hint: '前往普惠教学 → 管理员添加' },
          ].map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-2xl p-5">
              <div className="text-3xl mb-2">{c.icon}</div>
              <h3 className="text-sm font-bold text-white/80">{c.label}</h3>
              <p className="text-xs text-white/50 mt-1">{c.desc}</p>
              <p className="text-[10px] text-amber-400/60 mt-2">{c.hint}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="text-center pt-4">
        <button onClick={loadData} className="rounded-xl glass-control px-4 py-2 text-xs text-white/50 hover:text-white mr-2">
          🔄 刷新数据
        </button>
        <button onClick={() => setShowSyncPanel(true)}
          className="rounded-xl px-4 py-2 text-xs font-bold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 flex items-center gap-2 mx-2">
          📡 同步腾讯云
        </button>
        {syncResult && (
          <div className="mt-3 text-left max-h-48 overflow-auto rounded-xl glass-panel p-3 text-xs space-y-1">
            <div className="font-bold text-amber-300 mb-2">同步结果：</div>
            {Object.entries(syncResult).map(([key, ok]) => (
              <div key={key} className={`flex items-center gap-2 ${ok ? 'text-green-400' : 'text-red-400'}`}>
                {ok ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                <span className="text-white/50">{key}</span>
                <span>{ok ? '成功' : '失败'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 云端同步弹窗 */}
      {showSyncPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSyncPanel(false)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <CloudSyncPanel
              onClose={() => {
                setShowSyncPanel(false)
                loadData() // 同步完成后刷新数据
              }}
            />
          </div>
        </div>
      )}

      {/* 云端同步调试 */}
      <div className="mt-8">
        <CloudSyncDebug />
      </div>
        </div>
    )
}

// Static data for content overview
const playsData = ['打金枝', '傅山进京', '见皇姑']
