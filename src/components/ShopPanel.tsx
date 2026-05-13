import { useState, useCallback, useEffect, useMemo, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Heart, Search, Star, Plus, Minus, ChevronLeft, Edit, X, Package, Truck, ShieldCheck, CreditCard, CheckCircle } from 'lucide-react'
import { getProducts, updateProduct, placeShopOrder } from '../data/dbStore'
import PaymentModal from './PaymentModal'
import type { Account } from '../accountStore'

type Product = {
  id: string; name: string; category: string; price: number; originalPrice?: number
  description: string; image: string; rating: number; sales: number
  tags: string[]; isNew?: boolean; isHot?: boolean
}

const img = (n: number) => new URL(`../assets/products/product-${n}.svg`, import.meta.url).href
const resolveProductImage = (image: string | undefined, id: string) => {
  const matched = image?.match(/product-(\d+)\.svg/)
  if (matched) return img(Number(matched[1]))
  return image || img(Number(id) || 1)
}

const products: Product[] = [
  { id: '1', name: '晋剧脸谱盲盒', category: '文创周边', price: 68, originalPrice: 88, description: '精选晋剧经典脸谱造型，随机抽取惊喜款，附赠收藏证书，', image: img(1), rating: 4.8, sales: 1256, tags: ['盲盒', '脸谱', '限量'], isNew: true },
  { id: '2', name: '剪纸艺术书签套装', category: '文创周边', price: 35, description: '传统晋北剪纸技艺，精选12款非遗图案，金属质感', image: img(2), rating: 4.6, sales: 892, tags: ['剪纸', '书签', '文艺'] },
  { id: '3', name: '皮影戏人偶套装', category: '手作体验', price: 128, originalPrice: 168, description: '手工上色皮影人物，含舞台架，可动手操作表演，', image: img(3), rating: 4.9, sales: 567, tags: ['皮影', '手作', '亲子'], isHot: true },
  { id: '4', name: '木版年画装饰画', category: '艺术收藏', price: 198, description: '朱仙镇木版年画复刻，手工刷色，装裱完成可直接悬挂', image: img(4), rating: 4.7, sales: 334, tags: ['年画', '装饰', '装裱'] },
  { id: '5', name: '戏曲主题丝巾', category: '服饰配件', price: 88, originalPrice: 128, description: '真丝材质，晋剧旦角图案数码印花，优雅大方', image: img(5), rating: 4.5, sales: 1523, tags: ['丝巾', '真丝', '时尚'], isHot: true },
  { id: '6', name: '青铜纹饰文创摆件', category: '家居装饰', price: 256, description: '晋侯墓地青铜器纹饰复刻，树脂材质，精致仿古，', image: img(6), rating: 4.8, sales: 245, tags: ['青铜', '摆件', '收藏'] },
  { id: '7', name: '刺绣香囊挂件', category: '手作体验', price: 45, description: '平遥刺绣工艺，内含中药香囊，可作车挂/包挂', image: img(7), rating: 4.4, sales: 2134, tags: ['刺绣', '香囊', '传统'] },
  { id: '8', name: '非遗陶瓷茶具套装', category: '家居生活', price: 368, originalPrice: 428, description: '大同陶瓷工艺，手工拉坯，包含茶壶+6茶杯', image: img(8), rating: 4.9, sales: 678, tags: ['陶瓷', '茶具', '非遗'], isNew: true },
  { id: '9', name: '晋剧唱腔CD专辑', category: '音像制品', price: 58, description: '收录经典唱段15首，老艺人原声录制，精装盒装', image: img(9), rating: 4.7, sales: 456, tags: ['CD', '唱腔', '经典'] },
]

const categories = ['全部', '文创周边', '手作体验', '艺术收藏', '服饰配件', '家居装饰', '家居生活', '音像制品']
type SortType = 'default' | 'price-asc' | 'price-desc' | 'sales'

export default function ShopPanel({ currentAccount: ca, initialQuery = '' }: { currentAccount?: Account; initialQuery?: string }) {
  const isAdmin = ca?.role === 'admin'
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [query, setQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [sortBy, setSortBy] = useState<SortType>('default')
  const [cart, setCart] = useState<Map<string, number>>(new Map())
  const [cartOpen, setCartOpen] = useState(false)
  const [cartView, setCartView] = useState<'cart' | 'checkout'>('cart')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [addedAnim, setAddedAnim] = useState<string | null>(null)
  const [productList, setPL] = useState<Product[]>(() => {
  try {
    const saved = localStorage.getItem('jh_products')
    if (saved) return (JSON.parse(saved) as Product[]).map(p => ({ ...p, image: resolveProductImage(p.image, p.id) }))
  } catch { /* ignore */ }
  return products
})

  // Load from Dexie on mount
  useEffect(() => {
    getProducts().then(dbProducts => {
      if (dbProducts.length > 0) {
        setPL(dbProducts.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, originalPrice: p.originalPrice, description: p.description, image: resolveProductImage(p.image, p.id), rating: p.rating, sales: p.sales, tags: p.tags, isNew: p.isNew, isHot: p.isHot } as Product)))
      }
    }).catch(() => {})
  }, [])
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState<string>('')
  const [newP, setNewP] = useState({ name: '', category: '文创周边', price: '', description: '', tags: '', image: '' })
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paidOrder, setPaidOrder] = useState<{ orderNo: string; total: number } | null>(null)
  const [showOrders, setShowOrders] = useState(false)
  const [savedOrders, setSavedOrders] = useState<any[]>([])

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery)
  }, [initialQuery])

  const toggleFav = useCallback((id: string) => setFavorites(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }), [])
  const addCart = useCallback((id: string) => {
    setCart(p => { const n = new Map(p); n.set(id, (n.get(id) || 0) + 1); return n })
    setAddedAnim(id)
    setTimeout(() => setAddedAnim(null), 800)
  }, [])
  const remCart = useCallback((id: string) => setCart(p => { const n = new Map(p); const c = n.get(id) || 0; c <= 1 ? n.delete(id) : n.set(id, c - 1); return n }), [])
  const cartIds = useMemo(() => Array.from(cart.keys()), [cart])
  const totalItems = useMemo(() => Array.from(cart.values()).reduce((s, c) => s + c, 0), [cart])
  const cartTotal = useMemo(() => cartIds.reduce((s, id) => { const p = productList.find(x => x.id === id); return s + (p ? p.price * (cart.get(id) || 0) : 0) }, 0), [cartIds, cart, productList])
  const cartProds = useMemo(() => productList.filter(p => cart.has(p.id)), [cart, productList])
  const addProduct = useCallback(() => {
    if (!newP.name.trim() || !newP.description.trim()) return
    const price = Number(newP.price)
    if (isNaN(price) || price <= 0) return
    const newId = `admin-${Date.now()}`
    const newItem: Product = { id: newId, name: newP.name.trim(), category: newP.category, price, description: newP.description.trim(), image: newP.image || img(1), rating: 4.5, sales: 0, tags: newP.tags.split(',').map(t => t.trim()).filter(Boolean), isNew: true }
    // Save to Dexie
    import('../data/dbStore').then(({ addProduct }) => addProduct({
      id: newId, name: newP.name.trim(), category: newP.category, price, description: newP.description.trim(), image: newP.image || img(1), rating: 4.5, sales: 0, tags: newP.tags.split(',').map(t => t.trim()).filter(Boolean), isNew: true,
    })).catch(() => {})
    setPL(prev => [newItem, ...prev])
    setShowAdd(false); setNewP({ name: '', category: '文创周边', price: '', description: '', tags: '', image: '' })
  }, [newP])
  const startEdit = useCallback((id: string, img: string) => { setEditId(id); setEditVal(img) }, [])
  const saveImage = useCallback(() => {
    if (!editId || !editVal.trim()) return
    try {
      setPL(p => p.map(x => x.id === editId ? { ...x, image: editVal.trim() } : x))
      // Sync to Dexie
      updateProduct(editId, { image: editVal.trim() }).catch(() => {})
      setEditId(null)
    } catch (e) {
      console.error('保存图片失败', e)
    }
  }, [editId, editVal])
  const filtered = useMemo(() => {
    let list = productList.filter(p => (selectedCategory === '全部' || p.category === selectedCategory) && p.name.toLowerCase().includes(query.toLowerCase()))
    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price)
    else if (sortBy === 'sales') list.sort((a, b) => b.sales - a.sales)
    return list
  }, [productList, selectedCategory, query, sortBy])

  const closeCart = useCallback(() => { setCartOpen(false); setTimeout(() => setCartView('cart'), 300) }, [])

  // Persist product changes (admin edits, uploaded images) to localStorage
  useEffect(() => {
    localStorage.setItem('jh_products', JSON.stringify(productList))
  }, [productList])

  const orderNo = useMemo(() => `JH${Date.now().toString(36).toUpperCase()}`, [])

  const completeOrder = useCallback((recip: string, phone: string, addr: string) => {
    const order = { orderNo, items: cartProds.map(p => ({ id: p.id, name: p.name, price: p.price, qty: cart.get(p.id) })), total: cartTotal, recip, phone, addr, createdAt: new Date().toLocaleString() }
    // Save to Dexie as primary store
    placeShopOrder({ id: orderNo, accountId: ca?.id || 'guest', items: cartProds.map(p => ({ productId: p.id, name: p.name, price: p.price, quantity: cart.get(p.id) || 0 })), total: cartTotal, recipient: recip, phone, address: addr, status: 'paid', createdAt: new Date().toISOString() }).catch((e) => {
      console.warn('Dexie save failed, saving to localStorage', e)
      // Fallback to localStorage
      const saved = JSON.parse(localStorage.getItem('jh_orders') || '[]')
      saved.unshift(order)
      localStorage.setItem('jh_orders', JSON.stringify(saved.slice(0, 20)))
    })
    setSavedOrders(prev => [order, ...prev])
  }, [orderNo, cartProds, cartTotal, cart, ca])

  const startPayment = useCallback(() => {
    setPaymentOpen(true)
  }, [])

  return (<div className="space-y-6">
    {/* Search + Sort + Cart */}
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="relative flex-1 max-w-lg"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
        <input type="text" placeholder="搜索非遗文创商品..." value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} className="w-full rounded-xl pl-12 pr-4 py-3 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50" /></div>
      <div className="flex items-center gap-3">
        <select value={sortBy} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as SortType)} className="rounded-xl px-4 py-3 text-sm text-white glass-control focus:border-amber-500/50">
          <option className="bg-gray-900" value="default">默认排序</option>
          <option className="bg-gray-900" value="price-asc">价格从低到高</option>
          <option className="bg-gray-900" value="price-desc">价格从高到低</option>
          <option className="bg-gray-900" value="sales">销量优先</option>
        </select>
        {ca && <button type="button" onClick={() => { const os = JSON.parse(localStorage.getItem('jh_orders') || '[]'); setSavedOrders(os); setShowOrders(!showOrders) }}
          className="rounded-xl px-4 py-3 text-sm glass-control hover:text-amber-400">{showOrders ? '返回商城' : '我的订单'}</button>}
        <button type="button" onClick={() => { setCartOpen(true); setCartView('cart') }} className="relative rounded-xl px-4 py-3 glass-control hover:text-amber-400">
          <ShoppingBag className="h-5 w-5" />{totalItems > 0 && <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{totalItems}</span>}</button>
      </div>
    </div>

    {/* Admin panel */}
    {isAdmin && !showOrders && <div className="rounded-xl glass-panel p-4 border border-amber-500/15">
      <div className="flex justify-between items-center"><div><div className="text-sm font-semibold text-amber-300">管理员面板</div><p className="text-xs text-white/50 mt-1">新增商品实时出现在列表中</p></div>
        <button type="button" onClick={() => setShowAdd(p => !p)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium glass-control hover:text-amber-400"><Plus className="h-4 w-4" />{showAdd ? '关闭' : '添加'}</button></div>
      {showAdd && <div className="mt-4 p-4 rounded-lg bg-white/[0.03] border border-white/5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="名称" value={newP.name} onChange={e => setNewP(p => ({ ...p, name: e.target.value }))} className="rounded-xl px-4 py-2 text-sm text-white outline-none placeholder-white/30 glass-control" />
          <select value={newP.category} onChange={e => setNewP(p => ({ ...p, category: e.target.value }))} className="rounded-xl px-4 py-2 text-sm text-white glass-control">{categories.filter(c => c !== '全部').map(c => <option key={c} className="bg-gray-900" value={c}>{c}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" placeholder="价格" value={newP.price} onChange={e => setNewP(p => ({ ...p, price: e.target.value }))} className="rounded-xl px-4 py-2 text-sm text-white outline-none placeholder-white/30 glass-control" />
          <input placeholder="标签(逗号分隔)" value={newP.tags} onChange={e => setNewP(p => ({ ...p, tags: e.target.value }))} className="rounded-xl px-4 py-2 text-sm text-white outline-none placeholder-white/30 glass-control" /></div>
        <textarea placeholder="描述" rows={3} value={newP.description} onChange={e => setNewP(p => ({ ...p, description: e.target.value }))} className="w-full rounded-xl px-4 py-2 text-sm text-white outline-none placeholder-white/30 glass-control resize-none" />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white/60 glass-control cursor-pointer hover:text-amber-400">
              <span>{newP.image ? '已选图片' : '选择图片'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setNewP(p => ({ ...p, image: r.result as string })); r.readAsDataURL(f) } }} />
            </label>
            {newP.image && <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-900/50"><img src={newP.image} className="h-full w-full object-cover" /></div>}
            {newP.image && <button onClick={() => setNewP(p => ({ ...p, image: '' }))} className="text-xs text-white/40 hover:text-red-400">清除</button>}
          </div>
        <button onClick={addProduct} disabled={!newP.name.trim() || !newP.description.trim() || !newP.price} className="w-full rounded-xl bg-amber-500/20 hover:bg-amber-500/30 py-2 text-sm font-bold text-amber-300 disabled:opacity-50">提交</button></div>}
    </div>}

    {/* Order history */}
    {showOrders ? <div className="rounded-xl glass-panel p-6">
      <h2 className="text-lg font-bold text-white mb-4">我的订单</h2>
      {savedOrders.length === 0 ? <p className="text-white/40 text-sm">暂无订单</p> : savedOrders.map((o, i) => <div key={i} className="mb-4 p-4 rounded-lg bg-white/[0.03] border border-white/5">
        <div className="flex justify-between text-xs text-white/50 mb-2"><span>订单号：{o.orderNo}</span><span>{o.createdAt}</span></div>
        {o.items?.map((it: any, j: number) => <div key={j} className="flex justify-between text-sm text-white/80 py-1"><span>{it.name} ×{it.qty}</span><span>¥{it.price * it.qty}</span></div>)}
        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between"><span className="text-white/50">合计</span><span className="text-amber-400 font-bold">¥{o.total}</span></div>
        <div className="mt-1 text-xs text-white/40">{o.recip} · {o.phone}<br />{o.addr}</div>
      </div>)}
    </div> : <>
    {/* Categories */}
    <div className="flex flex-wrap gap-2">{categories.map(cat => (
      <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-amber-500/30 text-amber-300' : 'glass-control text-white/60 hover:text-white'}`}>{cat}</button>
    ))}</div>

    {/* Grid */}
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((p, i) => (
      <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
        onClick={() => setSelectedProduct(p)} className="group cursor-pointer">
        <div className="glass-panel rounded-xl overflow-hidden transition-all group-hover:scale-[1.02]">
          <div className="relative h-48 overflow-hidden bg-gray-900">
            <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40" />
            {p.isNew && <span className="absolute top-3 left-3 rounded-lg bg-blue-500/80 px-2 py-1 text-xs font-bold text-white">新品</span>}
            {p.isHot && <span className="absolute top-3 left-3 rounded-lg bg-red-500/80 px-2 py-1 text-xs font-bold text-white">热销</span>}
            {isAdmin && editId === p.id ? <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/92 backdrop-blur-sm gap-2 p-3 z-20" onClick={e => e.stopPropagation()}>
              {/* Always show input row */}
              <div className="flex items-center gap-2 w-full">
                <input value={editVal} onChange={e => setEditVal(e.target.value)} placeholder="粘贴图片URL地址"
                  className="flex-1 rounded-lg px-3 py-2 text-xs text-white bg-white/10 border border-white/15 outline-none focus:border-amber-500/50" />
                <label className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium">
                  <span>📁 选文件</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 5 * 1024 * 1024) { alert('图片不能超过5MB'); return } const r = new FileReader(); r.onload = () => setEditVal(r.result as string); r.readAsDataURL(f) }} />
                </label>
              </div>
              {/* Preview below */}
              {editVal && (
                <div className="relative w-full h-24 flex items-center justify-center bg-black/40 rounded-lg mb-1">
                  <img src={editVal} alt="预览" className="max-w-full max-h-full rounded object-contain" />
                  <button onClick={e => { e.stopPropagation(); setEditVal('') }} className="absolute top-1 right-1 rounded-full bg-red-500/80 w-5 h-5 flex items-center justify-center text-white text-xs z-10">×</button>
                </div>
              )}
              <div className="flex gap-2 w-full">
                <button onClick={e => { e.stopPropagation(); saveImage() }} disabled={!editVal.trim()}
                  className="flex-1 rounded-lg py-2 text-xs font-bold bg-green-500/30 text-green-300 disabled:opacity-30 hover:bg-green-500/40">✅ 保存</button>
                <button onClick={e => { e.stopPropagation(); setEditId(null) }}
                  className="rounded-lg px-4 py-2 text-xs text-white/50 glass-control">取消</button>
              </div>
            </div> : isAdmin && <button onClick={e => { e.stopPropagation(); startEdit(p.id, p.image) }} className="absolute bottom-3 right-12 rounded-lg bg-black/60 hover:bg-black/80 p-2 text-white/70 hover:text-amber-400 transition-all" title="自定义图片"><Edit className="h-4 w-4" /></button>}
            <button type="button" onClick={e => { e.stopPropagation(); toggleFav(p.id) }} className={`absolute top-3 right-3 rounded-lg bg-black/30 p-2 ${favorites.has(p.id) ? 'text-red-400' : 'text-white/60 hover:text-red-400'}`}>
              <Heart className={`h-4 w-4 ${favorites.has(p.id) ? 'fill-current' : ''}`} /></button>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-white/90 group-hover:text-amber-400">{p.name}</h3>
            <p className="mt-1 text-xs text-white/40 line-clamp-2">{p.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">{p.tags.map(t => <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/50">#{t}</span>)}</div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xl font-bold text-amber-400">¥{p.price}{p.originalPrice && <span className="ml-2 text-sm text-white/30 line-through">¥{p.originalPrice}</span>}</span>
              <span className="text-xs text-white/40 flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{p.rating} | {p.sales}人已购</span>
            </div>
            <button onClick={e => { e.stopPropagation(); addCart(p.id) }} className="mt-4 w-full rounded-xl bg-amber-500/20 hover:bg-amber-500/30 py-2 text-sm font-bold text-amber-300 transition-all active:scale-95">{addedAnim === p.id ? '✅ 已加入' : '加入购物车'}</button>
          </div>
        </div>
      </motion.div>
    ))}</div>
    {filtered.length === 0 && <div className="py-20 text-center text-white/40"><Search className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>暂无匹配商品</p></div>}

    {/* Detail modal */}
    <AnimatePresence>{selectedProduct && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-2xl glass-window rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="relative h-64 overflow-hidden bg-gray-900">
          <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60" />
          <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 rounded-lg bg-black/30 p-2 text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white">{selectedProduct.name}</h2>
          <div className="mt-2 flex flex-wrap gap-2">{selectedProduct.tags.map(t => <span key={t} className="rounded-md bg-amber-500/10 px-3 py-1 text-xs text-amber-300">#{t}</span>)}</div>
          <p className="mt-4 text-white/70">{selectedProduct.description}</p>
          <div className="mt-4 flex gap-6 text-sm text-white/50">
            <span><Star className="h-4 w-4 inline fill-amber-400 text-amber-400" /> {selectedProduct.rating}</span>
            <span><Package className="h-4 w-4 inline" /> {selectedProduct.sales}人已购</span>
            <span><Truck className="h-4 w-4 inline" /> 包邮</span>
            <span><ShieldCheck className="h-4 w-4 inline" /> 正品</span>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-3xl font-bold text-amber-400">¥{selectedProduct.price}{selectedProduct.originalPrice && <span className="ml-2 text-sm line-through text-white/30">¥{selectedProduct.originalPrice}</span>}</span>
            <button onClick={() => { addCart(selectedProduct.id); setSelectedProduct(null) }} className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 px-8 py-3 font-bold text-amber-300 transition-all active:scale-95">{addedAnim === selectedProduct?.id ? '✅ 已加入' : '加入购物车'}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>}</AnimatePresence>

    {/* Cart sidebar (inside fragment) */}
    {cartOpen && <CartSidebar cartView={cartView} setCartView={setCartView} closeCart={closeCart} cart={cart} cartProds={cartProds} cartTotal={cartTotal} totalItems={totalItems} addCart={addCart} remCart={remCart} completeOrder={completeOrder} onCheckout={startPayment} />}</>}

    {/* Payment modal (standalone, not inside sidebar) */}
    {paymentOpen && <PaymentModal config={{ orderId: orderNo, amount: cartTotal, type: 'shop' }} onClose={() => setPaymentOpen(false)} onSuccess={() => { setPaymentOpen(false); setPaidOrder({ orderNo, total: cartTotal }); setCart(new Map()) }} />}

    {/* Payment success toast */}
    <AnimatePresence>{paidOrder && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="fixed top-6 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-3 rounded-xl bg-green-500/90 px-6 py-3 text-white shadow-lg" style={{ backdropFilter: 'blur(12px)' }}>
      <CheckCircle className="h-5 w-5" /><div><div className="font-bold">支付成功</div><div className="text-sm text-white/70">¥{paidOrder.total}</div></div>
      <button onClick={() => setPaidOrder(null)} className="ml-4 rounded-lg p-1 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
    </motion.div>}</AnimatePresence>
  </div>)
}

function CartSidebar({ cartView, setCartView, closeCart, cart, cartProds, cartTotal, totalItems, addCart, remCart, completeOrder, onCheckout }: {
  cartView: string; setCartView: (v: 'cart'|'checkout') => void; closeCart: () => void
  cart: Map<string, number>; cartProds: Product[]; cartTotal: number; totalItems: number
  addCart: (id: string) => void; remCart: (id: string) => void; completeOrder: (r: string, p: string, a: string) => void; onCheckout: () => void
}) {
  const [recipient, setRec] = useState(''); const [phone, setPhone] = useState(''); const [address, setAddr] = useState('')
  return (<><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={closeCart} />
    <motion.div initial={{ opacity: 0, x: 400 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 400 }} transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed right-3 top-3 z-50 w-full max-w-md max-h-[calc(100vh-1.5rem)] rounded-xl overflow-y-auto"
      style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.10),rgba(10,0,5,0.25))', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(40px)' }}>
      {cartView === 'cart' && <div className="p-6"><div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-amber-400" />购物车</h2>
        <button onClick={closeCart} className="rounded-lg p-2 text-white/60 hover:text-white glass-control"><X className="h-5 w-5" /></button></div>
        {cartProds.length === 0 ? <p className="py-20 text-center text-white/40">购物车是空的</p> : <>{cartProds.map(p => <div key={p.id} className="flex items-center gap-3 rounded-xl p-3 glass-control mb-2">
          <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-900/50 overflow-hidden"><img src={p.image} alt={p.name} className="h-full w-full object-cover" /></div>
          <div className="flex-1"><div className="text-sm text-white/90">{p.name}</div><div className="text-amber-400 font-bold">¥{p.price}</div></div>
          <div className="flex items-center gap-2"><button onClick={() => remCart(p.id)} className="rounded-lg p-1 text-white/60 glass-control hover:text-white"><Minus className="h-4 w-4" /></button>
            <span className="text-white w-6 text-center">{cart.get(p.id)}</span><button onClick={() => addCart(p.id)} className="rounded-lg p-1 text-white/60 glass-control hover:text-white"><Plus className="h-4 w-4" /></button></div>
        </div>)}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between"><span className="text-2xl font-bold text-amber-400">¥{cartTotal}</span>
          <button onClick={() => setCartView('checkout')} className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 px-8 py-3 font-bold text-amber-300">去结算({totalItems}件)</button></div>
        </>}
      </div>}
      {cartView === 'checkout' && <div className="p-6"><div className="flex items-center gap-3 mb-4"><button onClick={() => setCartView('cart')} className="rounded-lg p-1.5 glass-control text-white/60 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-400" />确认订单</h2></div>
        {cartProds.map(p => <div key={p.id} className="flex items-center gap-3 py-2"><div className="h-12 w-12 shrink-0 rounded-lg bg-gray-900/50 overflow-hidden"><img src={p.image} alt={p.name} className="h-full w-full object-cover" /></div>
          <span className="flex-1 text-sm text-white/85">{p.name}</span><span className="text-white/50">×{cart.get(p.id)}</span><span className="text-amber-400">¥{p.price * (cart.get(p.id) || 0)}</span></div>)}
        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm"><span>共{totalItems}件</span><span className="text-amber-400 font-bold">¥{cartTotal}</span></div>
        <div className="mt-4 space-y-3">{['收货人','手机号','收货地址'].map((pl, i) => <input key={pl} type={i===1?'tel':'text'} placeholder={pl} value={[recipient,phone,address][i]}
          onChange={e => [setRec,setPhone,setAddr][i](e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-white/30 glass-control" />)}</div>
        <button disabled={!recipient||!phone||!address} onClick={() => { completeOrder(recipient, phone, address); closeCart(); onCheckout() }}
          className="mt-4 w-full rounded-xl bg-amber-500/20 hover:bg-amber-500/30 py-3 font-bold text-amber-300 disabled:opacity-50">去支付 ¥{cartTotal}</button>
      </div>}
    </motion.div>
  </>)
}
