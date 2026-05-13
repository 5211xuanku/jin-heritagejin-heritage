export type HanfuItem = {
  id: string
  name: string
  style: string
  coverIdx: number
  coverUrl?: string
  pricePerDay: number
  deposit: number
  stock: number
  sales: number
  sizes: string[]
  colors: string[]
  gender: '男' | '女' | '中性'
  tags: string[]
  desc: string
}

export type RentalOrder = {
  id: string
  items: RentalOrderItem[]
  renter: RenterInfo
  rentStart: string
  rentEnd: string
  totalDays: number
  totalRentalFee: number
  totalDeposit: number
  grandTotal: number
  status: RentalStatus
  statusText: string
  createTime: string
  pickupTime?: string
  returnTime?: string
  notes?: string
}

export type RentalOrderItem = {
  id: string
  name: string
  coverIdx: number
  coverUrl?: string
  selectedSize: string
  selectedColor: string
  quantity: number
  pricePerDay: number
  deposit: number
  rentStart: string
  rentEnd: string
  subtotal: number
}

export type RenterInfo = {
  name: string
  phone: string
  idCard: string
  pickupMethod: 'store' | 'delivery'
  address: string
  notes: string
}

export type RentalStatus = 'pending_pickup' | 'renting' | 'returned' | 'overdue' | 'cancelled'

export const statusConfig: Record<RentalStatus, { label: string; color: string }> = {
  pending_pickup: { label: '待取衣', color: '#E6A23C' },
  renting: { label: '租赁中', color: '#409EFF' },
  returned: { label: '已归还', color: '#67C23A' },
  overdue: { label: '逾期中', color: '#F56C6C' },
  cancelled: { label: '已取消', color: '#999' },
}

export const hanfuList: HanfuItem[] = [
  { id: 'h1', name: '齐胸襦裙 · 石榴红', style: '唐制', coverIdx: 1, pricePerDay: 68, deposit: 200, stock: 5, sales: 168, sizes: ['S','M','L','XL'], colors: ['石榴红','碧蓝色'], gender: '女', tags: ['热门','唐制','女装'], desc: '唐制齐胸襦裙，仿敦煌壁画配色，面料为提花锦缎，裙摆三米摆，行走飘逸如仙。配披帛一条。' },
  { id: 'h2', name: '圆领袍 · 玄青色', style: '唐制', coverIdx: 2, pricePerDay: 58, deposit: 150, stock: 8, sales: 142, sizes: ['M','L','XL','XXL'], colors: ['玄青色','月白色'], gender: '男', tags: ['唐制','男装'], desc: '唐制圆领袍，仿昭陵壁画形制，纯棉面料透气舒适，腰束蹀躞带，尽显大唐风范。' },
  { id: 'h3', name: '褙子套装 · 藕荷色', style: '宋制', coverIdx: 3, pricePerDay: 78, deposit: 250, stock: 4, sales: 96, sizes: ['S','M','L'], colors: ['藕荷色','烟青色'], gender: '女', tags: ['宋制','女装'], desc: '宋制褙子+宋裤套装，改良直领对襟，两侧开衩，上身为天丝面料，下裳为百褶裤。' },
  { id: 'h4', name: '道袍 · 茶褐色', style: '明制', coverIdx: 4, pricePerDay: 68, deposit: 200, stock: 6, sales: 213, sizes: ['M','L','XL'], colors: ['茶褐色','竹青色'], gender: '男', tags: ['明制','男装','热卖'], desc: '明制道袍，直领大襟，暗纹织花，袖宽三尺。面料纯棉麻混纺，古朴儒雅。' },
  { id: 'h5', name: '马面裙套装 · 凤穿牡丹', style: '明制', coverIdx: 5, pricePerDay: 98, deposit: 300, stock: 3, sales: 287, sizes: ['S','M','L','XL'], colors: ['藏蓝色','酒红色'], gender: '女', tags: ['明制','女装','爆款'], desc: '明制竖领长衫+马面裙，织金工艺，裙襕绣凤穿牡丹花纹，五对褶裙，华贵大气。' },
  { id: 'h6', name: '飞鱼服 · 绯红色', style: '明制', coverIdx: 6, pricePerDay: 128, deposit: 400, stock: 2, sales: 156, sizes: ['L','XL'], colors: ['绯红色','玄黑色'], gender: '男', tags: ['明制','男装','高端'], desc: '明制飞鱼服，云锦面料，肩袖绣飞鱼纹，贴里+曳撒形制，适合古风拍摄、舞台演出。' },
  { id: 'h7', name: '袒领襦裙 · 葡萄紫', style: '唐制', coverIdx: 7, pricePerDay: 88, deposit: 250, stock: 4, sales: 132, sizes: ['S','M','L'], colors: ['葡萄紫','琥珀黄'], gender: '女', tags: ['唐制','女装'], desc: '唐制袒领半臂+高腰襦裙，坦领设计显锁骨线条，间色裙配色大胆，唐风浓郁。' },
  { id: 'h8', name: '直裾深衣 · 玄纁色', style: '晋制', coverIdx: 8, pricePerDay: 78, deposit: 200, stock: 3, sales: 89, sizes: ['M','L','XL'], colors: ['玄纁色'], gender: '中性', tags: ['晋制','经典'], desc: '晋制直裾深衣，交领右衽，宽袍大袖，玄衣纁裳。衣缘镶朱红云纹，古朴庄重。' },
  { id: 'h9', name: '诃子裙 · 天水碧', style: '唐制', coverIdx: 9, pricePerDay: 108, deposit: 300, stock: 3, sales: 201, sizes: ['S','M','L'], colors: ['天水碧','胭脂粉'], gender: '女', tags: ['唐制','女装','爆款'], desc: '唐制诃子裙大袖衫，诃子为改良吊带式，外配大袖衫，裙摆四米，仙气十足。' },
  { id: 'h10', name: '魏晋风大袖 · 月华白', style: '魏晋', coverIdx: 10, pricePerDay: 88, deposit: 250, stock: 5, sales: 176, sizes: ['均码'], colors: ['月华白','烟灰蓝'], gender: '中性', tags: ['魏晋','中性','写真'], desc: '魏晋风大袖衫，双层纱质面料，广袖飘飘，仙风道骨。适合古风写真、汉服活动。' },
  { id: 'h11', name: '圆领衫 · 竹青色', style: '宋制', coverIdx: 11, pricePerDay: 65, deposit: 180, stock: 7, sales: 118, sizes: ['M','L','XL'], colors: ['竹青色','月白色'], gender: '男', tags: ['宋制','男装'], desc: '宋制圆领衫，纯棉面料，窄袖设计，日常穿着舒适便利，文艺气息十足。' },
  { id: 'h12', name: '对襟襦裙 · 杏子黄', style: '晋制', coverIdx: 12, pricePerDay: 72, deposit: 200, stock: 4, sales: 76, sizes: ['S','M','L'], colors: ['杏子黄','藕荷色'], gender: '女', tags: ['晋制','女装'], desc: '晋制对襟襦裙，清新配色，裙摆三米，上襦刺绣缠枝莲纹，温婉大方。' },
]

export const faqList = [
  { q: '租期如何计算？', a: '租赁以天为单位，从取衣日起算至还衣日，不足一天按一天计算。建议预留1天用于试穿调整。' },
  { q: '押金如何退还？', a: '还衣验收无误后，押金于3个工作日内原路退还。如有污损，根据程度酌情扣除。' },
  { q: '支持异地归还吗？', a: '目前仅支持门店取还。山西省内支持顺丰到付寄还，请在使用后3天内寄出。' },
  { q: '可以试穿吗？', a: '欢迎到店试穿！门店提供免费试穿服务，确认尺码后再下单租赁。' },
  { q: '衣服脏了怎么办？', a: '轻微污渍免费清洗。重度污损或不可逆损坏按定价的30%-50%赔偿。' },
]

export const coverGradient = (idx: number): string => {
  const colors = [
    'linear-gradient(135deg, #D44444, #F5A0A0)',
    'linear-gradient(135deg, #2D3E50, #5C7A9A)',
    'linear-gradient(135deg, #B8A0C0, #E8D0F0)',
    'linear-gradient(135deg, #8B6F4E, #C4A97D)',
    'linear-gradient(135deg, #1A3A5C, #4A7A9C)',
    'linear-gradient(135deg, #8B0000, #CC3333)',
    'linear-gradient(135deg, #6B3F8A, #A070C0)',
    'linear-gradient(135deg, #2D2D2D, #6B6B6B)',
    'linear-gradient(135deg, #3B8E8E, #80C0C0)',
    'linear-gradient(135deg, #C0C0C0, #F0F0F0)',
    'linear-gradient(135deg, #5B8E3E, #8BC060)',
    'linear-gradient(135deg, #D4A050, #F0D080)',
  ]
  return colors[(idx - 1) % colors.length]
}

export const colorMap: Record<string, string> = {
  '石榴红': '#D44444', '碧蓝色': '#4A90D9', '玄青色': '#2D3E50', '月白色': '#E8F0F0',
  '藕荷色': '#B8A0C0', '烟青色': '#6B8A8A', '茶褐色': '#8B6F4E', '竹青色': '#6B8A4E',
  '藏蓝色': '#1A3A5C', '酒红色': '#8B0000', '绯红色': '#CC3333', '玄黑色': '#2D2D2D',
  '葡萄紫': '#6B3F8A', '琥珀黄': '#C9A84C', '玄纁色': '#8B3A3A', '天水碧': '#3B8E8E',
  '胭脂粉': '#F0A0A0', '月华白': '#F0F0F0', '烟灰蓝': '#9090A0', '杏子黄': '#E8C860',
}

export const styles = ['全部', '唐制', '宋制', '明制', '晋制', '魏晋']

export function calcDays(start: string, end: string): number {
  if (!start || !end) return 0
  return Math.max(0, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)))
}

export function formatDate(d: string): string {
  if (!d) return '-'
  const parts = d.split('-')
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

export function formatDateShort(d: string): string {
  if (!d) return ''
  const parts = d.split('-')
  return `${parts[1]}/${parts[2]}`
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function saveOrders(orders: RentalOrder[]) {
  localStorage.setItem('jh_rental_orders', JSON.stringify(orders))
}

export function loadOrders(): RentalOrder[] {
  try {
    return JSON.parse(localStorage.getItem('jh_rental_orders') || '[]')
  } catch {
    return []
  }
}

// Dexie helpers for rental orders
export async function loadOrdersFromDB(accountId?: string): Promise<RentalOrder[]> {
  try {
    const { getRentalOrders } = await import('./dbStore')
    const dbOrders = await getRentalOrders(accountId)
    return dbOrders.map(o => ({
      id: o.id, items: o.items.map(i => ({ id: i.itemId, name: i.name, coverIdx: 0, selectedSize: i.size, selectedColor: i.color, quantity: i.quantity, pricePerDay: i.dailyPrice, deposit: 0, rentStart: o.rentalStart, rentEnd: o.rentalEnd, subtotal: i.subtotal })),
      renter: { name: o.recipient, phone: o.phone, idCard: '', pickupMethod: 'store' as const, address: o.address || '', notes: '' },
      rentStart: o.rentalStart, rentEnd: o.rentalEnd, totalDays: o.totalDays,
      totalRentalFee: o.subtotal, totalDeposit: o.deposit, grandTotal: o.totalAmount,
      status: (o.status === 'renting' ? 'renting' : o.status === 'returned' || o.status === 'completed' ? 'returned' : o.status === 'cancelled' ? 'cancelled' : 'pending_pickup') as RentalStatus,
      statusText: ({pending:'待取衣',paid:'已支付',shipped:'已发货',renting:'租赁中',returned:'已归还',completed:'已完成',cancelled:'已取消'})[o.status] || o.status,
      createTime: o.createdAt, pickupTime: o.status === 'renting' || o.status === 'returned' ? o.createdAt : undefined, returnTime: o.returnedAt,
    } as RentalOrder))
  } catch {
    return []
  }
}

export async function saveOrderToDB(order: RentalOrder, accountId: string) {
  try {
    const { placeRentalOrder } = await import('./dbStore')
    await placeRentalOrder({
      id: order.id, accountId,
      items: order.items.map(i => ({ itemId: i.id, name: i.name, size: i.selectedSize, color: i.selectedColor, quantity: i.quantity, dailyPrice: i.pricePerDay, days: order.totalDays, subtotal: i.subtotal })),
      totalDays: order.totalDays, rentalStart: order.rentStart, rentalEnd: order.rentEnd,
      subtotal: order.totalRentalFee, deposit: order.totalDeposit, totalAmount: order.grandTotal,
      recipient: order.renter.name, phone: order.renter.phone, address: order.renter.address || '',
      status: 'pending', createdAt: order.createTime,
    })
  } catch (e) { console.warn('DB save failed, using localStorage fallback', e) }
}
