import { useState, useMemo, useEffect, useCallback, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, Plus, Minus, ChevronLeft, CheckCircle, Clock3, Edit } from 'lucide-react'
import PaymentModal from './PaymentModal'
import type { Account } from '../accountStore'
import {
  HanfuItem, RentalOrder, RenterInfo, RentalStatus,
  hanfuList, faqList, styles, statusConfig,
  coverGradient, colorMap, calcDays, formatDate, formatDateShort,
  todayStr, addDays, saveOrders, loadOrders, loadOrdersFromDB, saveOrderToDB
} from '../data/hanfuData'
import { updateHanfuItem } from '../data/dbStore'
import { uploadFile } from '../utils/cloudbase'

type CartItem = HanfuItem & {
  selectedSize: string
  selectedColor: string
  quantity: number
  rentStart: string
  rentEnd: string
  coverUrl?: string
}

type ViewState = 'list' | 'detail' | 'cart' | 'checkout' | 'orders' | 'order-detail'

// ─── Helper ───
const genOrderId = () => 'HFR' + Date.now().toString(36).toUpperCase()
const hanfuCover = (id: string) => new URL(`../assets/hanfu/hanfu-${id.replace('h', '')}.svg`, import.meta.url).href
const withGeneratedCover = (item: HanfuItem): HanfuItem => item.coverUrl ? item : { ...item, coverUrl: hanfuCover(item.id) }

function CoverImg({ coverUrl, className, emojiSize }: { coverUrl?: string; className?: string; emojiSize?: string }) {
  if (coverUrl) return <img src={coverUrl} alt="" className={`w-full h-full object-cover ${className || ''}`} />
  
  return <span className={emojiSize || 'text-2xl'}>👘</span>
}

// ─── Main Component ───
export default function HanfuRental({ currentAccount }: { currentAccount?: Account }) {
  const isAdmin = currentAccount?.role === 'admin'
  const [view, setView] = useState<ViewState>('list')
  const [activeStyle, setActiveStyle] = useState('全部')
  const [activeGender, setActiveGender] = useState('')
  const [query, setQuery] = useState('')
  const [showFaq, setShowFaq] = useState(false)
  const [selectedItem, setSelectedItem] = useState<HanfuItem | null>(null)

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('jh_rental_cart') || '[]') } catch { return [] }
  })

  // Orders
  const [orders, setOrders] = useState<RentalOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<RentalOrder | null>(null)

  // Admin: custom image management
  const [hanfuItems, setHanfuItems] = useState<HanfuItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('jh_hanfu_items') || 'null')
      // Validate: each item must have pricePerDay (not DbHanfuItem.rentalPrice from broken seed)
      if (saved && Array.isArray(saved) && saved.length > 0 && saved[0].pricePerDay) return (saved as HanfuItem[]).map(withGeneratedCover)
    } catch { /* ignore */ }
    return hanfuList.map(withGeneratedCover)
  })
  const [editImgId, setEditImgId] = useState<string | null>(null)
  const [editImgVal, setEditImgVal] = useState('')

    // Persist cart
  useEffect(() => { localStorage.setItem('jh_rental_cart', JSON.stringify(cart)) }, [cart])

  // Persist hanfu items
  useEffect(() => { localStorage.setItem('jh_hanfu_items', JSON.stringify(hanfuItems)) }, [hanfuItems])

  const startEditImg = useCallback((id: string, img: string) => { setEditImgId(id); setEditImgVal(img) }, [])
  const saveEditImg = useCallback(() => {
    if (!editImgId || !editImgVal.trim()) return
    try {
      setHanfuItems(prev => prev.map(x => x.id === editImgId ? { ...x, coverIdx: 0, coverUrl: editImgVal.trim() } as HanfuItem : x))
      // Also sync to Dexie
      updateHanfuItem(editImgId, { images: [editImgVal.trim()] }).catch(() => {})
      setEditImgId(null)
    } catch (e) {
      console.error('保存图片失败', e)
    }
  }, [editImgId, editImgVal])

  const filteredList = useMemo(() => {
    return hanfuItems.filter(item => {
      const m1 = activeStyle === '全部' || item.style === activeStyle
      const m2 = !activeGender || item.gender === activeGender
      const m3 = !query || item.name.includes(query) || item.desc.includes(query) || item.tags.some(t => t.includes(query))
      return m1 && m2 && m3
    })
  }, [activeStyle, activeGender, query])

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart])
  const totalRentalFee = useMemo(() => cart.reduce((s, i) => s + i.pricePerDay * calcDays(i.rentStart, i.rentEnd) * i.quantity, 0), [cart])
  const totalDeposit = useMemo(() => cart.reduce((s, i) => s + i.deposit * i.quantity, 0), [cart])

  const addToCart = useCallback((item: CartItem) => {
    setCart(prev => {
      const idx = prev.findIndex(i =>
        i.id === item.id && i.selectedSize === item.selectedSize &&
        i.selectedColor === item.selectedColor && i.rentStart === item.rentStart && i.rentEnd === item.rentEnd
      )
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity }
        return next
      }
      return [...prev, item]
    })
  }, [])

  const removeFromCart = useCallback((idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const updateCartQty = useCallback((idx: number, delta: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const q = item.quantity + delta
      return q <= 0 ? { ...item, quantity: 0 } : { ...item, quantity: q }
    }).filter(item => item.quantity > 0))
  }, [])

  const loadOrderList = useCallback(() => {
    // Load from Dexie first, fall back to localStorage
    loadOrdersFromDB().then(dbOrders => {
      if (dbOrders.length > 0) {
        setOrders(dbOrders)
      } else {
        setOrders(loadOrders())
      }
    }).catch(() => setOrders(loadOrders()))
  }, [])

  useEffect(() => {
    if (view === 'orders' || view === 'order-detail') loadOrderList()
  }, [view, loadOrderList])

  // ─── Render ───
  return (
    <div className="space-y-5">
      {/* Header with cart/orders buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="搜索汉服款式..."
            className="w-full rounded-2xl pl-12 pr-4 py-3 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadOrderList(); setView('orders') }}
            className="rounded-2xl px-4 py-3 text-sm glass-control hover:text-amber-400">📋 租赁订单</button>
          <button onClick={() => setView('cart')}
            className="relative rounded-2xl px-4 py-3 glass-control hover:text-amber-400">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* Style & Gender filters */}
      {view === 'list' && (
        <>
          {/* Hero Banner */}
          <div className="hanfu-hero relative rounded-2xl overflow-hidden p-6 md:p-10 text-center border border-amber-200/15">
            <div className="relative z-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-amber-100/25 bg-white/10 shadow-2xl shadow-amber-500/20 backdrop-blur-xl">
                <span className="text-4xl">👘</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">汉服租赁馆</h1>
              <p className="text-sm text-white/60 mb-3">唐制 · 宋制 · 明制 · 晋制 · 魏晋 | 多款汉服可选，到店免费试穿</p>
              <div className="flex justify-center gap-3 text-xs text-white/40">
                <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />租金 ¥58/天起</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />押金可退</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {styles.map(s => (
              <button key={s} onClick={() => setActiveStyle(s)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition-all ${activeStyle === s ? 'bg-amber-500/30 text-amber-300' : 'glass-control text-white/60 hover:text-white'}`}>{s}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {[{ k: '', l: '全部' }, { k: '女', l: '👩 女款' }, { k: '男', l: '👨 男款' }, { k: '中性', l: '⚤ 中性' }].map(g => (
              <button key={g.k} onClick={() => setActiveGender(g.k)}
                className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all ${activeGender === g.k ? 'bg-amber-500/30 text-amber-300' : 'glass-control text-white/60 hover:text-white'}`}>{g.l}</button>
            ))}
          </div>

          {/* FAQ */}
          <div className="rounded-2xl glass-panel p-3 cursor-pointer" onClick={() => setShowFaq(p => !p)}>
            <div className="flex justify-between items-center text-sm text-white/70">
              <span>📋 租赁须知 & FAQ</span>
              <span className="text-white/40">{showFaq ? '▲' : '▼'}</span>
            </div>
          </div>
          {showFaq && (
            <div className="rounded-2xl glass-panel p-4 space-y-3">
              {faqList.map((f, i) => (
                <details key={i} className="text-sm">
                  <summary className="text-white/80 cursor-pointer py-1 font-medium">{f.q}</summary>
                  <p className="text-white/50 mt-1 pl-4">{f.a}</p>
                </details>
              ))}
            </div>
          )}

          {/* Product grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => { setSelectedItem(item); setView('detail') }} className="group cursor-pointer">
                <div className="glass-panel rounded-2xl overflow-hidden transition-all group-hover:scale-[1.02]">
                  <div className="relative h-48 flex items-center justify-center" style={{ background: item.coverUrl ? 'transparent' : coverGradient(item.coverIdx) }}>
                    {item.coverUrl ? <img src={item.coverUrl} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-6xl" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>👘</span>}
                    {/* Admin edit overlay */}
                    {isAdmin && editImgId === item.id ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/92 backdrop-blur-sm gap-2 p-3 z-20" onClick={e => e.stopPropagation()}>
                        {/* Always show input row */}
                        <div className="flex items-center gap-2 w-full">
                          <input value={editImgVal} onChange={e => setEditImgVal(e.target.value)} placeholder="粘贴图片URL地址"
                            className="flex-1 rounded-lg px-3 py-2 text-xs text-white bg-white/10 border border-white/15 outline-none focus:border-amber-500/50" />
                          <label className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium">
                            <span>📁 选文件</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 5 * 1024 * 1024) { alert('图片不能超过5MB'); return } const r = new FileReader(); r.onload = () => setEditImgVal(r.result as string); r.readAsDataURL(f); uploadFile(f, `hanfu/${editImgId || Date.now()}.jpg`).then(url => { if (url) setEditImgVal(url) }).catch(() => {}) }} />
                          </label>
                        </div>
                        {/* Preview below */}
                        {editImgVal && (
                          <div className="relative w-full h-24 flex items-center justify-center bg-black/40 rounded-lg mb-1">
                            <img src={editImgVal} alt="预览" className="max-w-full max-h-full rounded object-contain" />
                            <button onClick={e => { e.stopPropagation(); setEditImgVal('') }} className="absolute top-1 right-1 rounded-full bg-red-500/80 w-5 h-5 flex items-center justify-center text-white text-xs z-10">×</button>
                          </div>
                        )}
                        <div className="flex gap-2 w-full">
                          <button onClick={e => { e.stopPropagation(); saveEditImg() }} disabled={!editImgVal.trim()}
                            className="flex-1 rounded-lg py-2 text-xs font-bold bg-green-500/30 text-green-300 disabled:opacity-30 hover:bg-green-500/40">✅ 保存</button>
                          <button onClick={e => { e.stopPropagation(); setEditImgId(null) }}
                            className="rounded-lg px-4 py-2 text-xs text-white/50 glass-control">取消</button>
                        </div>
                      </div>
                    ) : isAdmin && (
                      <button onClick={e => { e.stopPropagation(); startEditImg(item.id, item.coverUrl || '') }}
                        className="absolute bottom-3 right-12 rounded-lg bg-black/60 hover:bg-black/80 p-2 text-white/70 hover:text-amber-400 transition-all" title="自定义图片">
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    <span className="absolute top-3 left-3 rounded-lg bg-black/50 px-2.5 py-1 text-xs text-white">{item.style}</span>
                    <span className="absolute top-3 right-3 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold"
                      style={{ background: item.gender === '男' ? '#409EFF' : item.gender === '女' ? '#F56C6C' : '#909399', color: '#fff' }}>
                      {item.gender === '男' ? '♂' : item.gender === '女' ? '♀' : '⚤'}
                    </span>
                    {item.tags.includes('爆款') && <span className="absolute bottom-3 left-3 rounded-lg bg-red-500/80 px-2 py-0.5 text-xs text-white">🔥 爆款</span>}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white/90 group-hover:text-amber-400">{item.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-bold text-amber-400">¥{item.pricePerDay}</span>
                      <span className="text-xs text-white/40">/天</span>
                      <span className="ml-auto text-xs text-white/30">押金 ¥{item.deposit}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-white/40">
                      <span>{item.sizes.join('/')}</span>
                      <span>已租 {item.sales}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.slice(0, 2).map(t => <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/50">#{t}</span>)}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setSelectedItem(item); setView('detail') }}
                      className="mt-3 w-full rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 py-2 text-sm font-bold text-amber-300">查看详情</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {filteredList.length === 0 && <div className="py-20 text-center text-white/40"><Search className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>暂无匹配汉服</p></div>}
        </>
      )}

      {/* Detail View */}
      {view === 'detail' && selectedItem && (
        <DetailView item={selectedItem} onBack={() => setView('list')} onAddToCart={addToCart} onGoCart={() => setView('cart')} />
      )}

      {/* Cart View */}
      {view === 'cart' && (
        <CartView cart={cart} onBack={() => setView('list')} onRemove={removeFromCart} onUpdateQty={updateCartQty}
          totalFee={totalRentalFee} totalDeposit={totalDeposit} onCheckout={() => setView('checkout')} />
      )}

      {/* Checkout View */}
      {view === 'checkout' && (
        <CheckoutView cart={cart} totalFee={totalRentalFee} totalDeposit={totalDeposit}
          onBack={() => setView('cart')} onSuccess={(order) => { setCart([]); setSelectedOrder(order); setView('order-detail') }}
          currentAccount={currentAccount} />
      )}

      {/* Orders View */}
      {view === 'orders' && (
        <OrdersView orders={orders} onBack={() => setView('list')}
          onSelectOrder={(o) => { setSelectedOrder(o); setView('order-detail') }}
          onRefresh={loadOrderList} />
      )}

      {/* Order Detail View */}
      {view === 'order-detail' && selectedOrder && (
        <OrderDetailView order={selectedOrder} onBack={() => setView('orders')} onCancel={() => { cancelOrder(selectedOrder.id); loadOrderList(); setView('orders') }}
          onStatusChange={(id, status) => { updateOrderStatus(id, status); loadOrderList() }} isAdmin={isAdmin} />
      )}
    </div>
  )

  function cancelOrder(orderId: string) {
    const list = loadOrders()
    const o = list.find(x => x.id === orderId)
    if (o) { o.status = 'cancelled'; o.statusText = '已取消'; saveOrders(list) }
    // Sync to Dexie
    import('../data/dbStore').then(({ updateRentalOrder }) =>
      updateRentalOrder(orderId, { status: 'cancelled' }).catch(() => {})
    ).catch(() => {})
  }

  function updateOrderStatus(orderId: string, newStatus: RentalStatus) {
    const list = loadOrders()
    const o = list.find(x => x.id === orderId)
    if (o) {
      o.status = newStatus
      o.statusText = statusConfig[newStatus].label
      if (newStatus === 'renting') o.pickupTime = new Date().toISOString()
      if (newStatus === 'returned') o.returnTime = new Date().toISOString()
      saveOrders(list)
    }
    // Sync to Dexie
    const statusMap: Record<string, string> = { pending_pickup: 'pending', renting: 'renting', returned: 'completed', overdue: 'renting', cancelled: 'cancelled' }
    import('../data/dbStore').then(({ updateRentalOrder }) =>
      updateRentalOrder(orderId, { status: statusMap[newStatus] as any, returnedAt: newStatus === 'returned' ? new Date().toISOString() : undefined }).catch(() => {})
    ).catch(() => {})
  }
}

// ─── Detail View ───
function DetailView({ item, onBack, onAddToCart, onGoCart }: {
  item: HanfuItem; onBack: () => void; onAddToCart: (item: CartItem) => void; onGoCart: () => void
}) {
  const today = todayStr()
  const [size, setSize] = useState(item.sizes[0] || '')
  const [color, setColor] = useState(item.colors[0] || '')
  const [rentStart, setRentStart] = useState(addDays(today, 1))
  const [rentEnd, setRentEnd] = useState(addDays(today, 3))
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const days = calcDays(rentStart, rentEnd)
  const rental = item.pricePerDay * days * qty
  const deposit = item.deposit * qty

  const handleAdd = () => {
    onAddToCart({ ...item, selectedSize: size, selectedColor: color, quantity: qty, rentStart, rentEnd, coverUrl: item.coverUrl })
    setAdded(true)
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 rounded-2xl px-4 py-2 text-sm glass-control text-white/70 hover:text-white">
        <ChevronLeft className="h-4 w-4" /> 返回列表
      </button>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="h-64 flex items-center justify-center relative" style={{ background: item.coverUrl ? 'transparent' : coverGradient(item.coverIdx) }}>
          {item.coverUrl ? <img src={item.coverUrl} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-7xl" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}>👘</span>}
        </div>
        <div className="p-5">
          <div className="flex gap-2 mb-2">
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">{item.style}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">{item.gender === '男' ? '♂ 男款' : item.gender === '女' ? '♀ 女款' : '⚤ 中性'}</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{item.name}</h2>
          <p className="mt-2 text-sm text-white/60">{item.desc}</p>
          <div className="mt-4 flex items-center justify-between p-4 rounded-2xl bg-white/5">
            <div>
              <span className="text-3xl font-bold text-amber-400">¥{item.pricePerDay}</span>
              <span className="text-sm text-white/40 ml-1">/天</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/40">押金</div>
              <div className="text-lg font-bold text-amber-300">¥{item.deposit}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-3">📏 选择尺码</h3>
        <div className="flex gap-2">
          {item.sizes.map(s => (
            <button key={s} onClick={() => setSize(s)}
              className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-all ${size === s ? 'bg-amber-500/30 text-amber-300 border border-amber-500/30' : 'glass-control text-white/60'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Color */}
      {item.colors.length > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-3">🎨 选择颜色</h3>
          <div className="flex gap-2 flex-wrap">
            {item.colors.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm transition-all ${color === c ? 'bg-amber-500/30 text-amber-300 border border-amber-500/30' : 'glass-control text-white/60'}`}>
                <span className="w-3.5 h-3.5 rounded-full" style={{ background: colorMap[c] || '#999' }} />
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-3">📅 选择租期</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-white/40 mb-1 block">取衣</label>
            <input type="date" value={rentStart} min={today} onChange={e => { setRentStart(e.target.value); if (rentEnd <= e.target.value) setRentEnd(addDays(e.target.value, 2)) }}
              className="w-full rounded-2xl px-4 py-2.5 text-sm text-white glass-control" />
          </div>
          <span className="text-white/30 mt-5">→</span>
          <div className="flex-1">
            <label className="text-xs text-white/40 mb-1 block">还衣</label>
            <input type="date" value={rentEnd} min={rentStart || today} onChange={e => setRentEnd(e.target.value)}
              className="w-full rounded-2xl px-4 py-2.5 text-sm text-white glass-control" />
          </div>
        </div>
        {days > 0 && (
          <div className="mt-3 p-3 rounded-2xl bg-white/5 space-y-1 text-sm">
            <div className="flex justify-between text-white/60"><span>租赁天数</span><span className="text-white">{days}天</span></div>
            <div className="flex justify-between"><span className="text-white/60">租金</span><span className="text-amber-400 font-semibold">¥{rental}</span></div>
            <div className="flex justify-between"><span className="text-white/60">押金</span><span className="text-amber-300 font-semibold">¥{deposit}</span></div>
            <div className="flex justify-between pt-2 border-t border-white/10"><span className="text-white font-semibold">合计</span><span className="text-amber-400 font-bold text-lg">¥{rental + deposit}</span></div>
          </div>
        )}
      </div>

      {/* Qty */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-3">🔢 数量</h3>
        <div className="flex items-center gap-3">
          <button onClick={() => setQty(p => Math.max(1, p - 1))} className="rounded-2xl p-2 glass-control"><Minus className="h-5 w-5" /></button>
          <span className="text-xl font-bold text-white w-8 text-center">{qty}</span>
          <button onClick={() => setQty(p => Math.min(item.stock, p + 1))} className="rounded-2xl p-2 glass-control"><Plus className="h-5 w-5" /></button>
          <span className="text-xs text-white/30 ml-auto">库存 {item.stock} 件</span>
        </div>
      </div>

      {/* Add to cart */}
      <div className="flex gap-3 sticky bottom-0 py-3">
        <button onClick={handleAdd}
          className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500/30 to-red-900/40 py-3.5 font-bold text-amber-300 hover:from-amber-500/40">
          {added ? '✅ 已加入' : '加入租赁清单'}
        </button>
        <button onClick={onGoCart}
          className="rounded-2xl bg-gradient-to-r from-red-800 to-red-600 px-6 py-3.5 font-bold text-white hover:from-red-700 hover:to-red-500">
          去结算
        </button>
      </div>
    </div>
  )
}

// ─── Cart View ───
function CartView({ cart, onBack, onRemove, onUpdateQty, totalFee, totalDeposit, onCheckout }: {
  cart: CartItem[]; onBack: () => void; onRemove: (idx: number) => void; onUpdateQty: (idx: number, delta: number) => void
  totalFee: number; totalDeposit: number; onCheckout: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-2xl p-2 glass-control text-white/70 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-xl font-bold text-white">🧺 租赁清单</h2>
      </div>

      {cart.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">👘</div>
          <p className="text-white/50 text-sm">租赁清单还是空的</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl glass-panel p-3 text-sm text-white/60">
            📌 请确认尺码和租期无误后再提交
          </div>

          {cart.map((item, idx) => {
            const days = calcDays(item.rentStart, item.rentEnd)
            return (
              <div key={idx} className="glass-panel rounded-2xl p-4 flex gap-3 items-start">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: item.coverUrl ? "#transparent" : coverGradient(item.coverIdx) }}>
                  <CoverImg coverUrl={item.coverUrl} emojiSize="text-2xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white/90 text-sm">{item.name}</h4>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/50">📏 {item.selectedSize}</span>
                    {item.selectedColor && <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/50">🎨 {item.selectedColor}</span>}
                  </div>
                  <div className="text-xs text-white/40 mt-1">{formatDateShort(item.rentStart)} → {formatDateShort(item.rentEnd)} <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded ml-1">{days}天</span></div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-white/40">¥{item.pricePerDay}/天 × {item.quantity}</span>
                    <span className="text-amber-400 font-semibold">¥{item.pricePerDay * days * item.quantity}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onUpdateQty(idx, -1)} className="w-6 h-6 rounded-full glass-control flex items-center justify-center text-xs"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-bold text-white w-5 text-center">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(idx, 1)} className="w-6 h-6 rounded-full glass-control flex items-center justify-center text-xs"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => onRemove(idx)} className="text-xs text-white/30 hover:text-red-400">🗑️</button>
                </div>
              </div>
            )
          })}

          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white/80 mb-3">💰 费用明细</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/60"><span>租金总计</span><span className="text-white">¥{totalFee}</span></div>
              <div className="flex justify-between text-white/60"><span>押金总计（可退）</span><span className="text-amber-300">¥{totalDeposit}</span></div>
              <div className="flex justify-between pt-2 border-t border-white/10 text-base">
                <span className="text-white font-semibold">需预付</span>
                <span className="text-amber-400 font-bold text-xl">¥{totalFee + totalDeposit}</span>
              </div>
              <p className="text-xs text-white/30 mt-1">* 押金还衣验收后3个工作日内退还</p>
            </div>
          </div>

          <button onClick={onCheckout}
            className="w-full rounded-2xl bg-gradient-to-r from-red-800 to-red-600 py-3.5 font-bold text-white hover:from-red-700 hover:to-red-500">
            提交租赁（¥{totalFee + totalDeposit}）
          </button>
        </>
      )}
    </div>
  )
}

// ─── Checkout View ───
function CheckoutView({ cart, totalFee, totalDeposit, onBack, onSuccess, currentAccount }: {
  cart: CartItem[]; totalFee: number; totalDeposit: number; onBack: () => void; onSuccess: (order: RentalOrder) => void
  currentAccount?: Account
}) {
  const acct = currentAccount
  const [renter, setRenter] = useState<RenterInfo>(() => {
    const saved = JSON.parse(localStorage.getItem('jh_renter_info') || 'null')
    return { name: acct?.displayName || acct?.username || saved?.name || '', phone: saved?.phone || '', idCard: saved?.idCard || '', pickupMethod: 'store', address: saved?.address || '', notes: '' }
  })
  const [selectedSlot, setSelectedSlot] = useState('10:00-12:00')
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paymentView, setPaymentView] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<RentalOrder | null>(null)
  const timeSlots = ['10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00']
  const pickupMethods = [
    { id: 'store' as const, icon: '🏪', label: '到店自取', desc: '免费试穿，当场确认尺码' },
    { id: 'delivery' as const, icon: '📦', label: '邮寄（到付）', desc: '仅限山西省内，顺丰到付' },
  ]
  const canSubmit = agreed && renter.name.trim() && renter.phone.trim() && renter.idCard.trim()

  const genOrder = (): RentalOrder => {
    const orderId = genOrderId()
    const start = cart[0]?.rentStart || ''
    const end = cart[0]?.rentEnd || ''
    const days = calcDays(start, end)
    localStorage.setItem('jh_renter_info', JSON.stringify({ name: renter.name, phone: renter.phone, idCard: renter.idCard, address: renter.address }))
    return {
      id: orderId, items: cart.map(i => ({ id: i.id, name: i.name, coverIdx: i.coverIdx, selectedSize: i.selectedSize, selectedColor: i.selectedColor, quantity: i.quantity, pricePerDay: i.pricePerDay, deposit: i.deposit, rentStart: i.rentStart, rentEnd: i.rentEnd, subtotal: i.pricePerDay * days * i.quantity })),
      renter: { ...renter }, rentStart: start, rentEnd: end, totalDays: days,
      totalRentalFee: totalFee, totalDeposit: totalDeposit, grandTotal: totalFee + totalDeposit,
      status: 'pending_pickup', statusText: '待取衣', createTime: new Date().toISOString(),
    }
  }

  const handlePlace = () => {
    if (!canSubmit) return
    setSubmitting(true)
    setTimeout(() => {
      setPendingOrder(genOrder())
      setSubmitting(false)
      setPaymentView(true)
    }, 800)
  }

  const handlePaid = () => {
    setTimeout(() => {
      if (pendingOrder) {
        // Save to Dexie as primary store
        saveOrderToDB(pendingOrder, currentAccount?.id || 'guest').then(() => {
          // Then also save to localStorage as cache
          const orders = loadOrders()
          orders.unshift(pendingOrder)
          saveOrders(orders)
        }).catch(() => {
          // Fallback to localStorage only
          const orders = loadOrders()
          orders.unshift(pendingOrder)
          saveOrders(orders)
        })
        setPaymentView(false)
        onSuccess(pendingOrder)
      }
    }, 600)
  }

  const updateRenter = (k: keyof RenterInfo, v: string) => setRenter(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-2xl p-2 glass-control text-white/70 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-xl font-bold text-white">确认租赁订单</h2>
      </div>

      {/* 租客信息 */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white/80">👤 租客信息</h3>
        {(['name', 'phone', 'idCard', 'notes'] as const).map(field => (
          <div key={field}>
            <label className="text-xs text-white/40 mb-1 block">
              {field === 'name' ? '姓名' : field === 'phone' ? '手机号' : field === 'idCard' ? '身份证号' : '备注（选填）'}
            </label>
            <input value={renter[field]} onChange={e => updateRenter(field, e.target.value)}
              placeholder={field === 'name' ? '请输入真实姓名' : field === 'phone' ? '请输入手机号' : field === 'idCard' ? '租赁需登记身份信息' : '如有特殊需求请备注'}
              className="w-full rounded-2xl px-4 py-2.5 text-sm text-white glass-control" />
          </div>
        ))}
      </div>

      {/* 取衣方式 */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-3">取衣方式</h3>
        <div className="space-y-2">
          {pickupMethods.map(m => (
            <div key={m.id} onClick={() => updateRenter('pickupMethod', m.id)}
              className={`flex items-center gap-3 rounded-2xl p-3 cursor-pointer transition-all ${renter.pickupMethod === m.id ? 'bg-amber-500/10 border border-amber-500/20' : 'glass-control'}`}>
              <span className="text-2xl">{m.icon}</span>
              <div className="flex-1"><div className="text-sm text-white/80 font-medium">{m.label}</div><div className="text-xs text-white/40">{m.desc}</div></div>
            </div>
          ))}
        </div>
        {renter.pickupMethod === 'delivery' && (
          <textarea value={renter.address} onChange={e => updateRenter('address', e.target.value)}
            placeholder="请填写详细收货地址（仅限山西省内）"
            className="w-full mt-3 rounded-2xl px-4 py-2.5 text-sm text-white glass-control" rows={2} />
        )}
      </div>

      {/* 预约时间 */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-3">⏰ 预约取衣时间</h3>
        <div className="flex gap-2 flex-wrap">
          {timeSlots.map(s => (
            <button key={s} onClick={() => setSelectedSlot(s)}
              className={`rounded-2xl px-4 py-2 text-sm transition-all ${selectedSlot === s ? 'bg-amber-500/30 text-amber-300 border border-amber-500/30' : 'glass-control text-white/60'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* 租赁物品 */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-3">👘 租赁清单</h3>
        {cart.map((item, idx) => {
          const days = calcDays(item.rentStart, item.rentEnd)
          return (
            <div key={idx} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: item.coverUrl ? "#transparent" : coverGradient(item.coverIdx) }}>
                <CoverImg coverUrl={item.coverUrl} emojiSize="text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80">{item.name}</div>
                <div className="text-xs text-white/40">{item.selectedSize} · {item.selectedColor} · ×{item.quantity}</div>
              </div>
              <div className="text-sm text-amber-400 font-semibold">¥{item.pricePerDay * days * item.quantity}</div>
            </div>
          )
        })}
      </div>

      {/* 费用 */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-white/60"><span>租金</span><span>¥{totalFee}</span></div>
          <div className="flex justify-between text-white/60"><span>押金</span><span className="text-amber-300">¥{totalDeposit}</span></div>
          <div className="flex justify-between text-white/60"><span>取衣方式</span><span>{renter.pickupMethod === 'store' ? '到店自取' : '邮寄（到付）'}</span></div>
          <div className="flex justify-between pt-2 border-t border-white/10 text-base">
            <span className="text-white font-semibold">需预付</span>
            <span className="text-amber-400 font-bold text-xl">¥{totalFee + totalDeposit}</span>
          </div>
        </div>
      </div>

      {/* 协议 */}
      <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="rounded accent-amber-500" />
        <span>我已阅读并同意 <span className="text-amber-400 underline cursor-pointer" onClick={e => { e.preventDefault(); setShowTerms(true) }}>《汉服租赁协议》</span></span>
      </label>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowTerms(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm rounded-2xl p-6 glass-window" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-3">📋 汉服租赁协议</h3>
              <div className="space-y-2 text-sm text-white/60">
                <p>1. 租客需提供真实身份信息进行实名登记。</p>
                <p>2. 租赁期间请爱惜衣物，避免污损、撕裂、染色等损坏。</p>
                <p>3. 轻微污渍无需赔偿，重度污损按定价的30%-50%赔偿。</p>
                <p>4. 逾期归还按日租金的2倍收取超期费用。</p>
                <p>5. 押金在还衣验收无误后3个工作日内退还。</p>
                <p>6. 如因特殊原因无法按时取衣，请提前24小时联系客服改期。</p>
              </div>
              <button onClick={() => { setShowTerms(false); setAgreed(true) }} className="w-full mt-4 rounded-2xl bg-amber-500/20 py-3 text-sm font-bold text-amber-300">我已阅读并同意</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={handlePlace} disabled={!canSubmit || submitting}
        className="w-full rounded-2xl bg-gradient-to-r from-red-800 to-red-600 py-3.5 font-bold text-white disabled:opacity-50 hover:from-red-700 hover:to-red-500">
        {submitting ? '提交中...' : `提交租赁订单（¥${totalFee + totalDeposit}）`}
      </button>

  
      {/* Payment Modal */}
      <AnimatePresence>
        {paymentView && pendingOrder && (
          <PaymentModal
            config={{ orderId: pendingOrder.id, amount: totalFee + totalDeposit, type: 'rental', summary: [
              { label: '租金', value: '¥' + totalFee },
              { label: '押金（可退）', value: '¥' + totalDeposit },
            ]}}
            onClose={() => setPaymentView(false)}
            onSuccess={handlePaid}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function OrdersView({ orders, onBack, onSelectOrder, onRefresh }: {
  orders: RentalOrder[]; onBack: () => void; onSelectOrder: (o: RentalOrder) => void; onRefresh: () => void
}) {
  const [filterStatus, setFilterStatus] = useState<RentalStatus | 'all'>('all')
  const statusTabs: { key: RentalStatus | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending_pickup', label: '待取衣' },
    { key: 'renting', label: '租赁中' },
    { key: 'returned', label: '已归还' },
    { key: 'overdue', label: '逾期' },
  ]
  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-2xl p-2 glass-control text-white/70 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-xl font-bold text-white">📋 租赁订单</h2>
        <button onClick={onRefresh} className="ml-auto rounded-2xl px-3 py-2 text-sm glass-control text-white/50 hover:text-white">刷新</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {statusTabs.map(t => (
          <button key={t.key} onClick={() => setFilterStatus(t.key)}
            className={`shrink-0 rounded-2xl px-4 py-2 text-sm transition-all ${filterStatus === t.key ? 'bg-amber-500/30 text-amber-300' : 'glass-control text-white/60'}`}>{t.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">👘</div>
          <p className="text-white/50 text-sm">还没有租赁记录</p>
        </div>
      ) : (
        filtered.map(order => {
          const cfg = statusConfig[order.status]
          const firstItem = order.items[0]
          return (
            <div key={order.id} onClick={() => onSelectOrder(order)} className="glass-panel rounded-2xl p-4 cursor-pointer hover:border-amber-500/20 transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-white/30 font-mono">{order.id}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: cfg.color + '20', color: cfg.color }}>{cfg.label}</span>
              </div>
              {firstItem && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: coverGradient(firstItem.coverIdx) }}>
                    <CoverImg coverUrl={firstItem.coverUrl} emojiSize="text-lg" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/80">{firstItem.name}</div>
                    <div className="text-xs text-white/40">{firstItem.selectedSize} · ×{firstItem.quantity} {order.items.length > 1 && `+${order.items.length - 1}件`}</div>
                  </div>
                </div>
              )}
              <div className="flex justify-between text-xs text-white/40">
                <span>📅 {formatDate(order.rentStart)} → {formatDate(order.rentEnd)}</span>
                <span className="text-amber-400 font-semibold">¥{order.grandTotal}</span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Order Detail View ───
function OrderDetailView({ order, onBack, onCancel, onStatusChange, isAdmin }: { order: RentalOrder; onBack: () => void; onCancel: () => void; onStatusChange: (id: string, status: RentalStatus) => void; isAdmin: boolean }) {
  const cfg = statusConfig[order.status]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-2xl p-2 glass-control text-white/70 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-xl font-bold text-white">订单详情</h2>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xs text-white/30 font-mono">{order.id}</div>
            <div className="text-xs text-white/40 mt-1">{new Date(order.createTime).toLocaleString('zh-CN')}</div>
          </div>
          <span className="text-sm font-semibold px-3 py-1 rounded" style={{ background: cfg.color + '20', color: cfg.color }}>{cfg.label}</span>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: item.coverUrl ? "#transparent" : coverGradient(item.coverIdx) }}>
                <CoverImg coverUrl={item.coverUrl} emojiSize="text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80">{item.name}</div>
                <div className="text-xs text-white/40">{item.selectedSize} · {item.selectedColor} · ×{item.quantity}</div>
              </div>
              <div className="text-sm text-amber-400 font-semibold">¥{item.subtotal}</div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        {(order.pickupTime || order.returnTime) && (
          <div className="mb-4 p-3 rounded-2xl bg-white/5 space-y-2">
            {order.pickupTime && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-white/50">已取衣</span>
                <span className="text-white/30">{new Date(order.pickupTime).toLocaleString('zh-CN')}</span>
              </div>
            )}
            {order.returnTime && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="text-white/50">已归还</span>
                <span className="text-white/30">{new Date(order.returnTime).toLocaleString('zh-CN')}</span>
              </div>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-white/5">
            <div className="text-xs text-white/40">取衣</div>
            <div className="text-sm text-white/80 mt-1">{formatDate(order.rentStart)}</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5">
            <div className="text-xs text-white/40">还衣</div>
            <div className="text-sm text-white/80 mt-1">{formatDate(order.rentEnd)}</div>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-1 text-sm mb-4">
          <div className="flex justify-between text-white/60"><span>租金</span><span>¥{order.totalRentalFee}</span></div>
          <div className="flex justify-between text-white/60"><span>押金</span><span className="text-amber-300">¥{order.totalDeposit}</span></div>
          <div className="flex justify-between text-white/60"><span>租期</span><span>{order.totalDays}天</span></div>
          <div className="flex justify-between pt-2 border-t border-white/10 text-base">
            <span className="text-white">预付合计</span>
            <span className="text-amber-400 font-bold text-lg">¥{order.grandTotal}</span>
          </div>
        </div>

        {/* Renter Info */}
        <div className="p-3 rounded-2xl bg-white/5 text-sm space-y-1">
          <div className="text-xs text-white/40 mb-1">租客信息</div>
          <div className="text-white/70">{order.renter.name} · {order.renter.phone}</div>
          <div className="text-white/40 text-xs">取衣：{order.renter.pickupMethod === 'store' ? '到店自取' : '邮寄'}</div>
          {order.renter.notes && <div className="text-white/40 text-xs">备注：{order.renter.notes}</div>}
        </div>

        {/* User Action */}
        {order.status === 'pending_pickup' && !isAdmin && (
          <button onClick={() => { if (confirm('确定取消订单吗？')) onCancel() }}
            className="w-full mt-4 rounded-2xl glass-control py-3 text-sm text-white/50 hover:text-red-400">取消订单</button>
        )}

        {/* Admin Actions */}
        {isAdmin && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-white/40 mb-2">🔧 管理操作</div>
            {order.status === 'pending_pickup' && (
              <button onClick={() => { if (confirm('确认租客已取衣？')) onStatusChange(order.id, 'renting') }}
                className="w-full rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 py-2.5 text-sm font-bold text-blue-300">✅ 确认取衣</button>
            )}
            {order.status === 'renting' && (
              <button onClick={() => { if (confirm('确认衣物已归还？')) onStatusChange(order.id, 'returned') }}
                className="w-full rounded-2xl bg-green-500/20 hover:bg-green-500/30 py-2.5 text-sm font-bold text-green-300">📦 确认归还</button>
            )}
            {order.status === 'pending_pickup' && (
              <button onClick={() => { if (confirm('确定取消此订单？')) onCancel() }}
                className="w-full rounded-2xl bg-red-500/10 hover:bg-red-500/20 py-2.5 text-sm text-red-400">❌ 取消订单</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
