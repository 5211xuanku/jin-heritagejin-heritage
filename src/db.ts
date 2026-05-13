import Dexie, { type EntityTable } from 'dexie'

export interface DbAccount {
  id: string
  username: string
  displayName: string
  email: string
  phone: string
  password: string
  role: 'admin' | 'user'
  avatar?: string
  createdAt: string
  lastLoginAt?: string
}

export interface DbProduct {
  id: string
  name: string
  category: string
  price: number
  originalPrice?: number
  description: string
  image: string
  rating: number
  sales: number
  tags: string[]
  isNew?: boolean
  isHot?: boolean
}

export interface DbOrder {
  id: string
  accountId: string
  items: { productId: string; name: string; price: number; quantity: number }[]
  total: number
  recipient: string
  phone: string
  address: string
  status: 'pending' | 'paid' | 'shipped' | 'delivered'
  createdAt: string
}

export interface DbDrawing {
  id: string
  accountId: string
  name: string
  canvasData: string
  template: string
  createdAt: string
}

export interface DbFavorite {
  accountId: string
  productIds: string[]
}

export interface DbHanfuItem {
  id: string
  name: string
  dynasty: string       // 朝代风格：唐制/宋制/明制/魏晋/晋制
  category: string      // 款式：上衣/下裙/披风/整套
  gender: '男' | '女' | '通用'
  sizes: string[]       // 可用尺码
  colors: { name: string; hex: string }[]
  rentalPrice: number   // 日租价格
  deposit: number       // 押金
  originalPrice: number // 原价
  description: string
  images: string[]
  tags: string[]
  stock: Record<string, number>  // { "M-红色": 3, "L-红色": 2 }
  isNew?: boolean
  isHot?: boolean
  isAvailable: boolean
}

export interface DbRentalOrder {
  id: string
  accountId: string
  items: {
    itemId: string
    name: string
    size: string
    color: string
    quantity: number
    dailyPrice: number
    days: number
    subtotal: number
  }[]
  totalDays: number
  rentalStart: string   // ISO date
  rentalEnd: string     // ISO date
  subtotal: number
  deposit: number
  totalAmount: number
  recipient: string
  phone: string
  address: string
  status: 'pending' | 'paid' | 'shipped' | 'renting' | 'returned' | 'completed' | 'cancelled'
  createdAt: string
  returnedAt?: string
}

const db = new Dexie('JinbangDB') as Dexie & {
  accounts: EntityTable<DbAccount, 'id'>
  products: EntityTable<DbProduct, 'id'>
  orders: EntityTable<DbOrder, 'id'>
  drawings: EntityTable<DbDrawing, 'id'>
  favorites: EntityTable<DbFavorite, 'accountId'>
  hanfuItems: EntityTable<DbHanfuItem, 'id'>
  rentalOrders: EntityTable<DbRentalOrder, 'id'>
}

db.version(1).stores({
  accounts: 'id, username, email, role',
  products: 'id, name, category, price',
  orders: 'id, accountId, status, createdAt',
  drawings: 'id, accountId, createdAt',
  favorites: 'accountId',
})

db.version(2).stores({
  accounts: 'id, username, email, role',
  products: 'id, name, category, price',
  orders: 'id, accountId, status, createdAt',
  drawings: 'id, accountId, createdAt',
  favorites: 'accountId',
  hanfuItems: 'id, name, dynasty, category, gender, rentalPrice, isAvailable',
  rentalOrders: 'id, accountId, status, createdAt, rentalStart, rentalEnd',
})

// Seed default data on first open
db.on('populate', () => {
  db.accounts.add({
    id: 'admin-root',
    username: 'admin',
    displayName: '系统管理员',
    email: 'admin@jhfyjxpt.local',
    phone: '13800000000',
    password: btoa('123456'.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 0x2a)).join('')),
    role: 'admin',
    createdAt: '2026-05-07T00:00:00.000Z',
  })

  const products: DbProduct[] = [
    { id: '1', name: '晋剧脸谱盲盒', category: '文创周边', price: 68, originalPrice: 88, description: '精选晋剧经典脸谱造型，随机抽取惊喜款，附赠收藏证书，', image: '../assets/products/product-1.svg', rating: 4.8, sales: 1256, tags: ['盲盒', '脸谱', '限量'], isNew: true },
    { id: '2', name: '剪纸艺术书签套装', category: '文创周边', price: 35, description: '传统晋北剪纸技艺，精选12款非遗图案，金属质感', image: '../assets/products/product-2.svg', rating: 4.6, sales: 892, tags: ['剪纸', '书签', '文艺'] },
    { id: '3', name: '皮影戏人偶套装', category: '手作体验', price: 128, originalPrice: 168, description: '手工上色皮影人物，含舞台架，可动手操作表演，', image: '../assets/products/product-3.svg', rating: 4.9, sales: 567, tags: ['皮影', '手作', '亲子'], isHot: true },
    { id: '4', name: '木版年画装饰画', category: '艺术收藏', price: 198, description: '朱仙镇木版年画复刻，手工刷色，装裱完成可直接悬挂', image: '../assets/products/product-4.svg', rating: 4.7, sales: 334, tags: ['年画', '装饰', '装裱'] },
    { id: '5', name: '戏曲主题丝巾', category: '服饰配件', price: 88, originalPrice: 128, description: '真丝材质，晋剧旦角图案数码印花，优雅大方', image: '../assets/products/product-5.svg', rating: 4.5, sales: 1523, tags: ['丝巾', '真丝', '时尚'], isHot: true },
    { id: '6', name: '青铜纹饰文创摆件', category: '家居装饰', price: 256, description: '晋侯墓地青铜器纹饰复刻，树脂材质，精致仿古，', image: '../assets/products/product-6.svg', rating: 4.8, sales: 245, tags: ['青铜', '摆件', '收藏'] },
    { id: '7', name: '刺绣香囊挂件', category: '手作体验', price: 45, description: '平遥刺绣工艺，内含中药香囊，可作车挂/包挂', image: '../assets/products/product-7.svg', rating: 4.4, sales: 2134, tags: ['刺绣', '香囊', '传统'] },
    { id: '8', name: '非遗陶瓷茶具套装', category: '家居生活', price: 368, originalPrice: 428, description: '大同陶瓷工艺，手工拉坯，包含茶壶+6茶杯', image: '../assets/products/product-8.svg', rating: 4.9, sales: 678, tags: ['陶瓷', '茶具', '非遗'], isNew: true },
    { id: '9', name: '晋剧唱腔CD专辑', category: '音像制品', price: 58, description: '收录经典唱段15首，老艺人原声录制，精装盒装', image: '../assets/products/product-9.svg', rating: 4.7, sales: 456, tags: ['CD', '唱腔', '经典'] },
  ]
  products.forEach(p => db.products.add(p))

  db.favorites.add({ accountId: 'admin-root', productIds: [] })

  const hanfuItems: DbHanfuItem[] = [
    { id: 'h1', name: '唐制齐胸襦裙·牡丹', dynasty: '唐制', category: '整套', gender: '女', sizes: ['S','M','L','XL'], colors: [{name:'嫣红',hex:'#DC2626'},{name:'鹅黄',hex:'#FBBF24'},{name:'翠绿',hex:'#059669'}], rentalPrice: 68, deposit: 300, originalPrice: 599, description: '经典唐制齐胸襦裙，牡丹刺绣纹样，轻盈飘逸，适合写真拍摄与主题聚会。', images: ['../assets/hanfu/hanfu-1.svg','../assets/hanfu/hanfu-2.svg'], tags: ['唐风','齐胸','襦裙','刺绣'], stock: {'S-嫣红':2,'M-嫣红':3,'L-嫣红':2,'XL-嫣红':1,'S-鹅黄':2,'M-鹅黄':3,'L-鹅黄':1,'S-翠绿':1,'M-翠绿':2,'L-翠绿':1}, isNew: true, isHot: true, isAvailable: true },
    { id: 'h2', name: '宋制褙子·兰亭序', dynasty: '宋制', category: '整套', gender: '女', sizes: ['S','M','L'], colors: [{name:'月白',hex:'#E2E8F0'},{name:'青绿',hex:'#10B981'},{name:'浅棕',hex:'#D4A574'}], rentalPrice: 55, deposit: 250, originalPrice: 499, description: '宋制长褙子搭配百褶裙，《兰亭序》印花，清雅温婉，适合古风摄影与文化活动。', images: ['../assets/hanfu/hanfu-3.svg','../assets/hanfu/hanfu-4.svg'], tags: ['宋风','褙子','百褶裙','印花'], stock: {'S-月白':3,'M-月白':3,'L-月白':2,'S-青绿':1,'M-青绿':2,'L-青绿':1,'S-浅棕':2,'M-浅棕':2}, isNew: true, isAvailable: true },
    { id: 'h3', name: '明制长袄·凤求凰', dynasty: '明制', category: '整套', gender: '女', sizes: ['M','L','XL'], colors: [{name:'大红',hex:'#DC2626'},{name:'藏蓝',hex:'#1E3A5F'},{name:'墨绿',hex:'#065F46'}], rentalPrice: 88, deposit: 400, originalPrice: 799, description: '明制立领长袄配马面裙，凤求凰金线绣花，大气华贵，适合婚礼、节日庆典等正式场合。', images: ['../assets/hanfu/hanfu-5.svg','../assets/hanfu/hanfu-6.svg'], tags: ['明风','长袄','马面裙','金绣'], stock: {'M-大红':2,'L-大红':2,'XL-大红':1,'M-藏蓝':2,'L-藏蓝':2,'XL-藏蓝':1,'M-墨绿':1,'L-墨绿':2}, isHot: true, isAvailable: true },
    { id: 'h4', name: '魏晋风骨·广袖流仙', dynasty: '魏晋', category: '整套', gender: '女', sizes: ['S','M','L','XL'], colors: [{name:'素白',hex:'#F8FAFC'},{name:'烟灰',hex:'#9CA3AF'},{name:'淡紫',hex:'#C4B5FD'}], rentalPrice: 75, deposit: 350, originalPrice: 680, description: '魏晋风格交领广袖长袍，双层纱质飘逸，仙气十足，武侠风与仙侠风摄影首选。', images: ['../assets/hanfu/hanfu-7.svg','../assets/hanfu/hanfu-8.svg'], tags: ['魏晋','广袖','仙侠','飘逸'], stock: {'S-素白':2,'M-素白':3,'L-素白':2,'XL-素白':1,'S-烟灰':2,'M-烟灰':2,'L-烟灰':1,'S-淡紫':1,'M-淡紫':2,'L-淡紫':2}, isHot: true, isAvailable: true },
    { id: 'h5', name: '晋制交领·松石', dynasty: '晋制', category: '上衣', gender: '通用', sizes: ['S','M','L','XL'], colors: [{name:'松石绿',hex:'#0F766E'},{name:'米白',hex:'#F5F5DC'}], rentalPrice: 30, deposit: 150, originalPrice: 299, description: '晋制交领衫，松石色系，男女皆可穿，搭配下裙或裤装，简约古朴。', images: ['../assets/hanfu/hanfu-9.svg'], tags: ['晋制','交领','上衣','百搭'], stock: {'S-松石绿':3,'M-松石绿':4,'L-松石绿':3,'XL-松石绿':2,'S-米白':3,'M-米白':3,'L-米白':2}, isNew: true, isAvailable: true },
    { id: 'h6', name: '唐制圆领袍·长安少年', dynasty: '唐制', category: '整套', gender: '男', sizes: ['M','L','XL','2XL'], colors: [{name:'玄色',hex:'#111827'},{name:'赭红',hex:'#7F1D1D'},{name:'靛蓝',hex:'#1E3A8A'}], rentalPrice: 78, deposit: 350, originalPrice: 699, description: '唐制圆领袍服，腰佩蹀躞带，英气飒爽，男士古风摄影、汉服活动首选。', images: ['../assets/hanfu/hanfu-1.svg','../assets/hanfu/hanfu-5.svg'], tags: ['唐风','圆领袍','男装','英武'], stock: {'M-玄色':2,'L-玄色':3,'XL-玄色':2,'2XL-玄色':1,'M-赭红':1,'L-赭红':2,'XL-赭红':1,'M-靛蓝':1,'L-靛蓝':2,'XL-靛蓝':2}, isHot: true, isAvailable: true },
    { id: 'h7', name: '马面裙·织金', dynasty: '明制', category: '下裙', gender: '女', sizes: ['S','M','L','XL'], colors: [{name:'黛蓝',hex:'#374151'},{name:'石榴红',hex:'#991B1B'},{name:'月华',hex:'#FDE68A'}], rentalPrice: 40, deposit: 200, originalPrice: 359, description: '明制织金马面裙，裙摆绣花精美，可搭配各种上衣，独立租赁灵活搭配。', images: ['../assets/hanfu/hanfu-3.svg'], tags: ['明风','马面裙','织金','百搭'], stock: {'S-黛蓝':2,'M-黛蓝':3,'L-黛蓝':2,'XL-黛蓝':1,'S-石榴红':1,'M-石榴红':2,'L-石榴红':2,'S-月华':2,'M-月华':3,'L-月华':2}, isAvailable: true },
    { id: 'h8', name: '大袖披风·蝶恋花', dynasty: '宋制', category: '披风', gender: '女', sizes: ['均码'], colors: [{name:'藕荷',hex:'#D8B4FE'},{name:'雾蓝',hex:'#93C5FD'}], rentalPrice: 50, deposit: 250, originalPrice: 459, description: '宋制大袖披风，蝴蝶花卉刺绣，穿脱方便，搭配齐腰/齐胸襦裙或褙子皆可。', images: ['../assets/hanfu/hanfu-9.svg','../assets/hanfu/hanfu-4.svg'], tags: ['宋风','披风','刺绣','百搭'], stock: {'均码-藕荷':3,'均码-雾蓝':2}, isNew: true, isAvailable: true },
  ]
  hanfuItems.forEach(h => db.hanfuItems.add(h))
})

export default db
