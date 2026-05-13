import { Suspense, lazy, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Camera,
  GraduationCap,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Palette,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Shield,
  Sparkles,
  Star,
  Theater,
  Users,
  Wand2,
} from 'lucide-react'
import { Account } from '../accountStore'

const ShopPanel = lazy(() => import('./ShopPanel'))
const SalesFlowMap = lazy(() => import('./SalesFlowMap'))
const OperaMap = lazy(() => import('./OperaMap'))
const AIChat = lazy(() => import('./AIChat'))
const FaceWorkshop = lazy(() => import('./FaceWorkshop'))
const HanfuRental = lazy(() => import('./HanfuRental'))
const AdminDashboard = lazy(() => import('./AdminDashboard'))
const WatchPanel = lazy(() => import('./WatchPanel'))
const UserSettingsModal = lazy(() => import('./UserSettingsModal'))
const logoUrl = `${import.meta.env.BASE_URL}logo.png`

function ModuleFallback() {
  return (
    <div className="flex min-h-[18rem] items-center justify-center">
      <div className="glass-control rounded-2xl px-5 py-3 text-sm text-white/60">正在加载模块...</div>
    </div>
  )
}

type TabId = 'watch' | 'study' | 'shop' | 'course' | 'social' | 'map' | 'chat' | 'face' | 'admin'

const menuItems: Array<{ id: TabId; icon: typeof Theater; label: string }> = [
  { id: 'watch', icon: Theater, label: '演艺观赏' },
  { id: 'study', icon: Camera, label: '汉服租赁' },
  { id: 'shop', icon: ShoppingBag, label: '精品好物' },
  { id: 'course', icon: GraduationCap, label: '普惠教学' },
  { id: 'social', icon: Users, label: '文化社交' },
  { id: 'map', icon: MapPin, label: '戏曲地图' },
  { id: 'face', icon: Palette, label: '脸谱工坊' },
  { id: 'chat', icon: MessageCircle, label: '小e' },
  { id: 'admin', icon: Shield, label: '管理后台' },
]

const tabContent: Record<TabId, { title: string; subtitle: string }> = {
  watch: { title: '晋剧演艺观赏区', subtitle: '沉浸式数字剧场，经典剧目云端呈现' },
  study: { title: '汉服租赁馆', subtitle: '唐制/宋制/明制汉服租赁与写真服务' },
  shop: { title: '精品好物市集', subtitle: '非遗手作，匠心传承' },
  course: { title: '普惠教学课堂', subtitle: '系统化课程，从零起步学习晋剧' },
  social: { title: '文化社交广场', subtitle: '戏迷社群，共话梨园' },
  map: { title: '戏曲文化线下地图', subtitle: '探访三晋戏台，感受现场梆子声腔' },
  face: { title: '戏曲脸谱创工坊', subtitle: '数字画笔绘制传统脸谱，感受戏曲色彩之美' },
  admin: { title: '管理员后台', subtitle: '用户 · 订单 · 内容管理' },
  chat: { title: '小e · AI助手', subtitle: '与智能助手对话，快速获取晋剧文化和文创推荐' },
}

const courseCover = (n: number) => new URL(`../assets/courses/course-${n}.svg`, import.meta.url).href

const courses = [
  { id: 1, title: '晋剧身段入门', category: '基础课程', total: 12, done: 8, teacher: '王老师', teacherTitle: '国家一级演员', next: '水袖基础组合', level: '入门', students: 156, rating: 4.8, description: '系统学习晋剧身段的基本功，从站姿、步法到水袖运用，掌握传统戏曲表演的基础技巧。', tags: ['身段', '基础', '表演'], image: courseCover(1), lessons: ['台步与圆场', '云手与亮相', '水袖基础组合'], outcome: '能完成一段 60 秒身段小组合' },
  { id: 2, title: '唱念发声训练', category: '声乐课程', total: 10, done: 5, teacher: '李老师', teacherTitle: '戏曲声乐专家', next: '上口字归韵', level: '中级', students: 89, rating: 4.9, description: '专业晋剧唱腔训练，学习梆子腔、流水板等传统唱法，培养纯正的戏曲发声技巧。', tags: ['唱腔', '发声', '声乐'], image: courseCover(2), lessons: ['气息支撑', '上口字归韵', '流水板唱段'], outcome: '能独立演唱一段基础唱腔' },
  { id: 3, title: '锣鼓经节奏课', category: '音乐课程', total: 8, done: 3, teacher: '张老师', teacherTitle: '晋剧音乐传承人', next: '慢板转快板', level: '入门', students: 124, rating: 4.7, description: '学习晋剧传统锣鼓经的节奏规律，从基础节奏到复杂板式变化，感受戏曲音乐的韵律美。', tags: ['锣鼓', '节奏', '音乐'], image: courseCover(3), lessons: ['基础锣鼓点', '慢板转快板', '动作与节奏配合'], outcome: '能听辨常用板式并跟拍练习' },
  { id: 4, title: '晋剧经典剧目赏析', category: '理论课程', total: 15, done: 6, teacher: '刘老师', teacherTitle: '戏曲理论研究员', next: '《打金枝》人物分析', level: '进阶', students: 203, rating: 4.9, description: '深入剖析晋剧经典剧目，理解剧情结构、人物塑造和艺术特色，提升欣赏水平。', tags: ['剧目', '赏析', '理论'], image: courseCover(4), lessons: ['《打金枝》结构', '人物行当分析', '舞台调度解读'], outcome: '能写出一份剧目赏析笔记' },
  { id: 5, title: '戏曲化妆与造型', category: '实践课程', total: 6, done: 2, teacher: '陈老师', teacherTitle: '戏曲化妆师', next: '脸谱绘制基础', level: '入门', students: 78, rating: 4.6, description: '学习传统戏曲化妆技巧，从基础打底到脸谱绘制，掌握人物造型的艺术表现。', tags: ['化妆', '造型', '实践'], image: courseCover(5), lessons: ['底妆与眉眼', '脸谱色彩含义', '角色造型搭配'], outcome: '能完成一张角色妆面设计稿' },
  { id: 6, title: '晋剧文化历史', category: '文化课程', total: 10, done: 4, teacher: '赵老师', teacherTitle: '戏曲史专家', next: '清代晋剧发展', level: '中级', students: 167, rating: 4.8, description: '探索晋剧的历史发展脉络，了解戏曲文化的传承与演变，感受传统文化魅力。', tags: ['历史', '文化', '传承'], image: courseCover(6), lessons: ['蒲州梆子源流', '班社与名家', '当代传承案例'], outcome: '能讲清晋剧发展脉络和代表人物' }
]

type Course = (typeof courses)[number]

type Comment = { author: string; text: string }

type Post = {
  id: number; author: string; avatar: string; level: string; topic: string; type: string
  replies: number; likes: number; time: string; tags: string[]; content: string; comments?: Comment[]
}

const posts: Post[] = [
  { id: 1, author: '汉服摄影社', avatar: '👗', level: '金牌社团', topic: '本周限定汉服写真套餐上线，赠送精修六张。', type: '活动', replies: 28, likes: 126, time: '2小时前', tags: ['汉服', '写真', '优惠'], content: '春季汉服写真季正式开启！提供多种古风场景选择，专业摄影师团队，赠送6张精修照片。适合个人写真、情侣拍摄、闺蜜聚会等多种需求。预约从速！' },
  { id: 2, author: '晋风影像', avatar: '📸', level: '专业团队', topic: '寻求晋剧主题商业活动合作，现场布景与摄影支持。', type: '合作', replies: 17, likes: 88, time: '4小时前', tags: ['商业', '合作', '晋剧'], content: '我们团队专注于晋剧文化主题的商业活动拍摄，提供完整的现场布景搭建、专业灯光设备和后期制作服务。已合作多家品牌，期待与您携手打造精彩活动！' },
  { id: 3, author: '古风租赁部', avatar: '👘', level: '认证商家', topic: '节日汉服租赁已开抢，大学生专属折扣。', type: '促销', replies: 9, likes: 64, time: '6小时前', tags: ['租赁', '折扣', '学生'], content: '清明节将至，汉服租赁优惠活动开启！大学生出示证件享8折优惠，多款新品上架，支持线上预订线下试穿。库存有限，先到先得！' },
  { id: 4, author: '梨园小戏迷', avatar: '🎭', level: '戏迷', topic: '分享我第一次观看晋剧的感受，太震撼了！', type: '分享', replies: 23, likes: 45, time: '8小时前', tags: ['初体验', '感受', '推荐'], content: '昨晚第一次去现场观看晋剧《打金枝》，演员们的唱腔身段都太精彩了！特别是老生那段唱腔，余音绕梁三日不绝。强烈推荐大家去现场感受传统文化的魅力！' },
  { id: 5, author: '戏曲研习者', avatar: '📚', level: '学者', topic: '讨论晋剧中"梆子腔"的音乐特色和传承意义', type: '讨论', replies: 31, likes: 67, time: '12小时前', tags: ['梆子腔', '音乐', '传承'], content: '梆子腔作为晋剧的灵魂，承载着丰富的音乐内涵。从节奏到旋律，都蕴含着深厚的文化底蕴。大家怎么看梆子腔在现代戏曲传承中的地位和作用？' },
  { id: 6, author: '晋韵票友团', avatar: '🎤', level: '票友组织', topic: '本周末票友聚会，欢迎新老票友加入！', type: '活动', replies: 15, likes: 38, time: '1天前', tags: ['聚会', '票友', '交流'], content: '晋韵票友团本周末举办月度聚会活动，内容包括唱段交流、身段练习和茶话会。无论你是资深票友还是戏曲爱好者，都欢迎前来参加！地址：山西大戏楼，时间：周六下午2点。' },
]

type NewCourse = {
  title: string; category: string; total: number; teacher: string; teacherTitle: string
  level: string; students: number; rating: number; description: string; tags: string
}

type NavigatePayload = {
  courseQuery?: string
  socialQuery?: string
  shopQuery?: string
  faceTemplate?: string
}

export default function Dashboard({
  currentAccount,
  accounts,
  onLogout,
}: {
  currentAccount: Account
  accounts: Account[]
  onLogout?: () => void
}) {
  const isAdmin = currentAccount.role === 'admin'
  const [activeTab, setActiveTab] = useState<TabId>('watch')
  const [likedPosts, setLikedPosts] = useState(() => new Set<number>())
  const [naviTemplate, setNaviTemplate] = useState<string | undefined>(undefined)
  const [shopEntryQuery, setShopEntryQuery] = useState('')
  const [globalQuery, setGlobalQuery] = useState('')
  const [recentActions, setRecentActions] = useState<string[]>(['演艺观赏', '汉服租赁', '精品好物'])
  const [accountInfo, setAccountInfo] = useState(currentAccount)
  const handleAccountUpdate = useCallback((updated: Account) => { setAccountInfo(updated) }, [])

  const [courseQuery, setCourseQuery] = useState('')
  const [selectedCourseCategory, setSelectedCourseCategory] = useState('全部')
  const [socialQuery, setSocialQuery] = useState('')
  const [selectedPostType, setSelectedPostType] = useState('全部')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showCourseDetail, setShowCourseDetail] = useState(false)
  const [coursesState, setCoursesState] = useState<Course[]>(courses)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newCourse, setNewCourse] = useState<NewCourse>({ title: '', category: '基础课程', total: 8, teacher: '', teacherTitle: '', level: '入门', students: 0, rating: 4.5, description: '', tags: '' })
  const [postsState, setPostsState] = useState<Post[]>(posts)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showPostDetail, setShowPostDetail] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAdminMenu, setShowAdminMenu] = useState(false)

  const currentTab = tabContent[activeTab]

  const navigateTo = useCallback((tab: TabId, payload: NavigatePayload = {}) => {
    if (payload.courseQuery !== undefined) setCourseQuery(payload.courseQuery)
    if (payload.socialQuery !== undefined) setSocialQuery(payload.socialQuery)
    if (payload.shopQuery !== undefined) setShopEntryQuery(payload.shopQuery)
    if (payload.faceTemplate !== undefined) setNaviTemplate(payload.faceTemplate)
    setActiveTab(tab)
    setRecentActions(prev => [tabContent[tab].title.replace('区', '').replace('馆', '').replace('市集', ''), ...prev].slice(0, 3))
  }, [])

  const handleGoToFace = useCallback((templateId: string) => navigateTo('face', { faceTemplate: templateId }), [navigateTo])

  const handleSmartSearch = useCallback(() => {
    const q = globalQuery.trim()
    if (!q) return
    if (/汉服|租|写真|服装/.test(q)) navigateTo('study')
    else if (/买|商品|文创|脸谱|盲盒|周边|礼物/.test(q)) navigateTo('shop', { shopQuery: q })
    else if (/课程|学|唱腔|身段|教学/.test(q)) navigateTo('course', { courseQuery: q })
    else if (/动态|社交|分享|活动|帖子/.test(q)) navigateTo('social', { socialQuery: q })
    else if (/地图|戏台|剧院|线下/.test(q)) navigateTo('map')
    else if (/脸谱|画|创作|关羽|包拯/.test(q)) navigateTo('face', { faceTemplate: 'jing' })
    else navigateTo('chat')
  }, [globalQuery, navigateTo])

  const courseCategories = useMemo(() => ['全部', ...Array.from(new Set(coursesState.map(c => c.category)))], [coursesState])
  const filteredCourses = useMemo(() => {
    return coursesState.filter(course => {
      const matchesCategory = selectedCourseCategory === '全部' || course.category === selectedCourseCategory
      const matchesQuery = course.title.toLowerCase().includes(courseQuery.toLowerCase()) || course.teacher.toLowerCase().includes(courseQuery.toLowerCase()) || course.tags.some(tag => tag.toLowerCase().includes(courseQuery.toLowerCase()))
      return matchesCategory && matchesQuery
    })
  }, [courseQuery, selectedCourseCategory])

  const postTypes = ['全部', '活动', '讨论', '分享', '合作', '促销']

  const handleSelectCourse = useCallback((course: Course) => { setSelectedCourse(course); setShowCourseDetail(true) }, [])
  const handleCloseCourseDetail = useCallback(() => { setShowCourseDetail(false); setSelectedCourse(null) }, [])
  const handleAddCourse = useCallback(() => {
    const title = newCourse.title.trim()
    if (!title || !newCourse.teacher.trim()) return
    setCoursesState(prev => [{ id: Date.now(), title, category: newCourse.category, total: Number(newCourse.total) || 8, done: 0, teacher: newCourse.teacher.trim(), teacherTitle: newCourse.teacherTitle.trim(), next: '新课导学', level: newCourse.level, students: Number(newCourse.students) || 0, rating: Number(newCourse.rating) || 4.5, description: newCourse.description.trim(), tags: newCourse.tags.split(',').map(t => t.trim()).filter(Boolean), image: courseCover(((prev.length % 6) + 1)), lessons: ['课程导学', '核心示范', '课后练习'], outcome: '完成一份学习作品' } as Course, ...prev])
    setShowAddCourse(false)
    setNewCourse({ title: '', category: '基础课程', total: 8, teacher: '', teacherTitle: '', level: '入门', students: 0, rating: 4.5, description: '', tags: '' })
  }, [newCourse])

  const handleAddComment = useCallback((postId: number, author: string, text: string) => { setPostsState(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), { author, text }] } : p)) }, [])
  const handlePublishPost = useCallback((content: string, topic: string, type: string) => {
    setPostsState(prev => [{ id: Date.now(), author: accountInfo.displayName || accountInfo.username, avatar: accountInfo.avatar || '👤', level: '用户', topic: topic || content.slice(0, 30), type, replies: 0, likes: 0, time: '刚刚', tags: [], content } as Post, ...prev])
  }, [accountInfo])

  return (
    <div className="ios-app-bg flex min-h-full flex-col lg:h-full lg:overflow-hidden">
      {/* ===== HEADER BAR (all screen sizes) ===== */}
      <header className="sticky top-0 z-50 flex shrink-0 items-center ios-topbar px-3 lg:px-6">
        {/* LOGO */}
        <div className="flex items-center gap-2.5 mr-4">
          <img src={logoUrl} alt="晋梆智绎" className="brand-mark h-9 w-9 rounded-xl" />
          <div className="hidden sm:block">
            <span className="block text-base font-bold text-amber-100">晋梆智绎</span>
            <span className="block text-[11px] text-white/38">三晋非遗数字平台</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {isAdmin && <button onClick={() => setShowAdminMenu(!showAdminMenu)}
            className={`ios-touch ios-focus-ring flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${showAdminMenu ? 'bg-white/[0.16] text-amber-100' : 'bg-white/10 text-amber-200 hover:bg-white/[0.16]'}`}>
            <ShieldCheck className="h-3.5 w-3.5" />管理
          </button>}
          <div className="ios-touch ios-focus-ring flex items-center gap-1.5 rounded-full px-1.5 py-1 text-xs text-white/60 cursor-pointer hover:bg-white/[0.08] hover:text-white/[0.82] transition-all" onClick={() => setShowSettings(true)}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-red-600 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden ring-1 ring-white/20">
              {accountInfo.avatar ? <img src={accountInfo.avatar} className="w-full h-full object-cover" /> : (accountInfo.displayName?.[0] || 'U')}
            </div>
            <span className="hidden sm:inline">{accountInfo.displayName || accountInfo.username}</span>
          </div>
          {onLogout && <button onClick={onLogout} className="ios-touch ios-focus-ring rounded-full p-2 text-xs text-white/35 hover:bg-white/[0.08] hover:text-red-300 ml-1"><LogOut className="h-3.5 w-3.5" /></button>}
        </div>
      </header>

      {/* Admin quick panel */}
      <AnimatePresence>
        {showAdminMenu && isAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50" onClick={() => setShowAdminMenu(false)}>
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="absolute top-[calc(3.75rem+env(safe-area-inset-top)+0.5rem)] right-4 w-64 glass-window rounded-3xl p-4 shadow-2xl border border-white/12">
              <div className="text-sm font-bold text-amber-300 mb-3">⚡ 管理员快捷面板</div>
            <div className="space-y-1">
              {[
                { t: 'watch', icon: '🎭', label: '添加剧目' },
                { t: 'study', icon: '👘', label: '管理汉服租赁' },
                { t: 'course', icon: '📖', label: '添加课程' },
                { t: 'social', icon: '💬', label: '管理动态' },
                { t: 'shop', icon: '🛍️', label: '管理商品' },
              ].map(({ t, icon, label }) => (
                <button key={t} onClick={() => { navigateTo(t as TabId); setShowAdminMenu(false) }}
                  className="ios-touch ios-focus-ring w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-white/70 hover:bg-white/[0.08] hover:text-amber-200 transition-all">
                  <span>{icon}</span><span>{label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAdminMenu(false)}
              className="ios-touch ios-focus-ring w-full mt-3 rounded-2xl glass-control py-2 text-xs text-white/60">关闭</button>
            <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/40">
              <span>租赁订单总数：{(() => { try { return JSON.parse(localStorage.getItem("jh_rental_orders") || "[]").length } catch { return 0 } })()} 笔</span>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav */}
      <nav className="fixed z-40 flex justify-around ios-tabbar px-1 py-1 lg:hidden">
        {menuItems.filter(item => item.id !== 'admin' || isAdmin).map(item => (
          <button key={item.id} onClick={() => navigateTo(item.id)}
            className={`ios-touch ios-focus-ring flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl text-[10px] transition-all ${activeTab === item.id ? 'nav-active' : 'text-white/48 hover:text-white/80 hover:bg-white/[0.06]'}`}>
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Body: sidebar + main + right sidebar */}
      <div className="min-h-0 flex-1 pb-24 lg:flex lg:overflow-hidden lg:pb-0">
        {/* Desktop Sidebar */}
        <aside className="ios-sidebar hidden lg:flex lg:w-56 lg:flex-col lg:overflow-y-auto text-white">
          <nav className="flex-1 px-3 pt-5 space-y-1">
            {menuItems.filter(item => item.id !== 'admin' || isAdmin).map(item => (
              <button key={item.id} onClick={() => navigateTo(item.id)}
                className={`ios-touch ios-focus-ring flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-sm font-medium transition-all ${activeTab === item.id ? 'nav-active' : 'text-white/[0.52] hover:text-white/[0.86] hover:bg-white/[0.07]'}`}>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ios-main min-w-0 flex-1 overflow-y-auto rounded-[2rem] mx-2 my-2 text-white">
          <div className="p-3 sm:p-4 lg:p-7">
            {/* Tab Header Card */}
            <div className="ios-hero p-5 sm:p-6 mb-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="section-kicker mb-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px]">
                    <Sparkles className="h-3.5 w-3.5" />
                    模块联动 · 最近访问 {recentActions.join(' / ')}
                  </div>
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">{currentTab.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/58">{currentTab.subtitle}</p>
                </div>
                <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      value={globalQuery}
                      onChange={e => setGlobalQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSmartSearch() }}
                      placeholder="搜索课程、文创、汉服、戏台..."
                      className="ios-focus-ring w-full rounded-2xl pl-11 pr-4 py-3 text-sm text-white outline-none placeholder-white/35 glass-control"
                    />
                  </div>
                  <button onClick={handleSmartSearch} className="ios-touch ios-focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400/18 px-5 py-3 text-sm font-bold text-amber-100 hover:bg-amber-400/24">
                    智能前往
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <ConnectedHub activeTab={activeTab} onNavigate={navigateTo} />

            {/* Tab Content Wrapper */}
            <div className="ios-content p-4 sm:p-5 lg:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Suspense fallback={<ModuleFallback />}>
                    {activeTab === 'watch' && <WatchPanel isAdmin={isAdmin} />}
                    {activeTab === 'study' && <HanfuRental currentAccount={accountInfo} />}
                    {activeTab === 'shop' && (<div className="space-y-5"><ShopPanel currentAccount={accountInfo} initialQuery={shopEntryQuery} /><SalesFlowMap /></div>)}
                    {activeTab === 'chat' && <AIChat />}
                    {activeTab === 'course' && <CoursePanel query={courseQuery} onQueryChange={setCourseQuery} selectedCategory={selectedCourseCategory} onCategoryChange={setSelectedCourseCategory} courses={filteredCourses} categories={courseCategories} onSelectCourse={handleSelectCourse} isAdmin={isAdmin} showAddCourse={showAddCourse} onToggleAddCourse={() => setShowAddCourse(p => !p)} newCourse={newCourse} onNewCourseChange={setNewCourse} onAddCourse={handleAddCourse} />}
                    {activeTab === 'social' && <SocialPanel query={socialQuery} onQueryChange={setSocialQuery} posts={postsState} selectedType={selectedPostType} onTypeChange={setSelectedPostType} types={postTypes} likedPosts={likedPosts} onToggleLike={(id) => setLikedPosts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })} onSelectPost={(p) => { setSelectedPost(p); setShowPostDetail(true) }} onPublish={handlePublishPost} onDeletePost={(id) => setPostsState(p => p.filter(x => x.id !== id))} isAdmin={isAdmin} />}
                    {activeTab === 'map' && <OperaMap onExploreFace={handleGoToFace} />}
                    {activeTab === 'face' && <FaceWorkshop initialTemplate={naviTemplate} onViewShop={(query) => navigateTo('shop', { shopQuery: query })} />}
                    {activeTab === 'admin' && isAdmin && <AdminDashboard />}
                    {activeTab === 'admin' && !isAdmin && <div className="py-20 text-center text-white/30"><Shield className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">仅管理员可访问</p></div>}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Desktop Right Sidebar */}
        <aside className="ios-sidebar hidden xl:flex xl:w-72 xl:flex-col xl:overflow-y-auto p-4 text-white">
          <div className="space-y-5">
            {/* Cross-module recommendations */}
            <CrossRecommendations activeTab={activeTab} onNavigate={(tab) => navigateTo(tab)} />
            {/* My stats */}
            <div className="ios-content p-4">
              <h3 className="text-sm font-semibold text-white/70 mb-3">👤 我的</h3>
              <div className="space-y-2">
                <button onClick={() => setShowSettings(true)}
                  className="ios-touch ios-focus-ring w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-white/60 hover:text-amber-200 hover:bg-white/[0.08] transition-all">
                  👤 个人资料
                </button>
                <button onClick={() => navigateTo('study')}
                  className="ios-touch ios-focus-ring w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-white/60 hover:text-amber-200 hover:bg-white/[0.08] transition-all">
                  👘 租赁汉服
                </button>
                <button onClick={() => navigateTo('course')}
                  className="ios-touch ios-focus-ring w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-white/60 hover:text-amber-200 hover:bg-white/[0.08] transition-all">
                  📖 学习课程
                </button>
                <button onClick={() => navigateTo('social')}
                  className="ios-touch ios-focus-ring w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-white/60 hover:text-amber-200 hover:bg-white/[0.08] transition-all">
                  💬 发布动态
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPostDetail && selectedPost && <PostDetailPanel post={selectedPost} onClose={() => setShowPostDetail(false)} onAddComment={handleAddComment} />}
        {showCourseDetail && selectedCourse && <CourseDetailPanel course={selectedCourse} onClose={handleCloseCourseDetail} />}
        {showSettings && <UserSettingsModal account={accountInfo} accountsSnapshot={accounts} onClose={() => setShowSettings(false)} onUpdate={handleAccountUpdate} />}
      </AnimatePresence>
    </div>
  )
}


function ConnectedHub({ activeTab, onNavigate }: { activeTab: TabId; onNavigate: (tab: TabId, payload?: NavigatePayload) => void }) {
  const flows: Array<{ from: TabId; icon: typeof Theater; title: string; desc: string; action: string; target: TabId; payload?: NavigatePayload }> = [
    { from: 'watch', icon: BookOpen, title: '看完去学', desc: '把剧目里的身段、唱腔接到课程练习', action: '打开身段课', target: 'course', payload: { courseQuery: '身段' } },
    { from: 'course', icon: Palette, title: '学完实操', desc: '化妆造型课后直接进入脸谱工坊', action: '开始画脸谱', target: 'face', payload: { faceTemplate: 'jing' } },
    { from: 'face', icon: ShoppingBag, title: '作品变周边', desc: '按当前角色搜索脸谱、盲盒和文创', action: '找脸谱文创', target: 'shop', payload: { shopQuery: '脸谱' } },
    { from: 'shop', icon: Camera, title: '搭配租赁', desc: '文创、服饰和写真服务连成套餐', action: '租一套汉服', target: 'study' },
    { from: 'study', icon: Users, title: '晒出造型', desc: '租赁后去文化广场发布穿搭动态', action: '发布分享', target: 'social', payload: { socialQuery: '汉服' } },
    { from: 'social', icon: MapPin, title: '线下相见', desc: '从活动帖子找到附近戏台和剧院', action: '看线下地图', target: 'map' },
    { from: 'map', icon: Theater, title: '回到剧场', desc: '选好地点后继续浏览近期演出', action: '看演艺', target: 'watch' },
    { from: 'chat', icon: Wand2, title: '问完即行动', desc: '让小e给建议，再进入课程或商城验证', action: '去课程', target: 'course', payload: { courseQuery: '入门' } },
  ]
  const primary = flows.find(item => item.from === activeTab) || flows[0]
  const quick = [
    { label: '演艺到课程', target: 'course' as TabId, payload: { courseQuery: '晋剧' }, icon: Theater },
    { label: '脸谱到文创', target: 'shop' as TabId, payload: { shopQuery: '脸谱' }, icon: Palette },
    { label: '汉服到社交', target: 'social' as TabId, payload: { socialQuery: '汉服' }, icon: Camera },
    { label: '地图到工坊', target: 'face' as TabId, payload: { faceTemplate: 'guanyu' }, icon: MapPin },
  ]

  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-[1.2fr_2fr]">
      <button
        onClick={() => onNavigate(primary.target, primary.payload)}
        className="glass-panel rounded-xl p-4 text-left transition-all hover:border-amber-400/30"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <primary.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white">{primary.title}</div>
            <div className="mt-1 text-xs leading-relaxed text-white/45">{primary.desc}</div>
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
              {primary.action}
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {quick.map(item => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.target, item.payload)}
            className="glass-control rounded-xl p-3 text-left hover:border-amber-500/25"
          >
            <item.icon className="mb-2 h-4 w-4 text-amber-300/80" />
            <div className="text-xs font-semibold text-white/80">{item.label}</div>
            <div className="mt-1 text-[11px] text-white/35">一键带入上下文</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Post Detail Panel ───
function PostDetailPanel({ post, onClose, onAddComment }: { post: Post; onClose: () => void; onAddComment: (postId: number, author: string, text: string) => void }) {
  const [commentText, setCommentText] = useState('')
  const submit = () => { if (!commentText.trim()) return; onAddComment(post.id, '我', commentText.trim()); setCommentText('') }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} className="w-full max-w-3xl rounded-3xl bg-[#090507] p-6 glass-window" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-amber-300">{post.author}</div>
            <h2 className="mt-2 text-2xl font-bold text-white">{post.topic}</h2>
            <p className="mt-3 text-white/70">{post.content}</p>
          </div>
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-white/70 glass-control hover:text-white">关闭</button>
        </div>
        <div className="mt-6">
          <div className="text-sm text-white/60 mb-2">评论</div>
          <div className="space-y-3">{(post.comments || []).map((c, i) => (<div key={i} className="rounded-xl p-3 bg-white/5 text-white/75"><div className="font-medium">{c.author}</div><div className="text-sm mt-1">{c.text}</div></div>))}</div>
          <div className="mt-4"><textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} className="w-full rounded-xl px-4 py-2 bg-black/20 text-white" rows={3} placeholder="写下你的评论" /><div className="mt-2 text-right"><button onClick={submit} className="rounded-xl bg-amber-500 px-4 py-2 text-black">发表评论</button></div></div>
        </div>
      </motion.aside>
    </motion.div>
  )
}

// ─── Course Detail Panel ───
function CourseDetailPanel({ course, onClose }: { course: Course; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#090507] p-5 glass-window" onClick={(e) => e.stopPropagation()}>
        <div className="grid gap-5 md:grid-cols-[1.05fr_1fr]">
          <img src={course.image || courseCover(1)} alt={course.title} className="h-64 w-full rounded-2xl object-cover border border-white/10" />
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-amber-100">{course.category}</span>
                <h2 className="mt-3 text-2xl font-bold text-white">{course.title}</h2>
                <div className="text-sm text-white/60 mt-2">讲师：{course.teacher} · {course.teacherTitle}</div>
              </div>
              <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-white/70 glass-control hover:text-white">关闭</button>
            </div>
            <p className="mt-4 text-sm leading-7 text-white/70">{course.description}</p>
            <div className="mt-4 rounded-2xl bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/75">课程内容</div>
              <div className="mt-3 grid gap-2">
                {course.lessons.map((lesson, i) => <div key={lesson} className="flex items-center gap-2 text-sm text-white/60"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-200">{i + 1}</span>{lesson}</div>)}
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-100">学习成果：{course.outcome}</div>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  )
}

// ─── Course Panel ───
function CoursePanel({ query, onQueryChange, selectedCategory, onCategoryChange, courses, categories, onSelectCourse, isAdmin, showAddCourse, onToggleAddCourse, newCourse, onNewCourseChange, onAddCourse }: {
  query: string; onQueryChange: (v: string) => void; selectedCategory: string; onCategoryChange: (v: string) => void
  courses: Course[]; categories: string[]; onSelectCourse: (c: Course) => void
  isAdmin: boolean; showAddCourse: boolean; onToggleAddCourse: () => void
  newCourse: NewCourse; onNewCourseChange: (c: NewCourse) => void; onAddCourse: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-lg"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" /><input value={query} onChange={e => onQueryChange(e.target.value)} placeholder="搜索课程..." className="w-full rounded-xl pl-12 pr-4 py-3 text-white outline-none placeholder-white/40 glass-control" /></div>
        <select value={selectedCategory} onChange={e => onCategoryChange(e.target.value)} className="rounded-xl px-4 py-3 text-sm text-white glass-control">{categories.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}</select>
      </div>
      {isAdmin && (
        <div className="glass-panel rounded-xl p-4 border border-amber-500/15">
          <div className="flex justify-between items-center"><div className="text-sm font-semibold text-amber-300">管理员添加课程</div><button onClick={onToggleAddCourse} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 glass-control text-sm"><Plus className="h-4 w-4" />{showAddCourse ? '关闭' : '添加'}</button></div>
          {showAddCourse && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3"><input value={newCourse.title} onChange={e => onNewCourseChange({ ...newCourse, title: e.target.value })} placeholder="课程名称" className="rounded-xl px-4 py-2 text-sm text-white glass-control" /><input value={newCourse.teacher} onChange={e => onNewCourseChange({ ...newCourse, teacher: e.target.value })} placeholder="讲师" className="rounded-xl px-4 py-2 text-sm text-white glass-control" /></div>
              <button onClick={onAddCourse} className="rounded-xl bg-gradient-to-r from-red-800 to-red-600 px-5 py-2 text-sm font-bold text-white">保存</button>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map(c => (
          <div key={c.id} onClick={() => onSelectCourse(c)} className="glass-panel rounded-2xl overflow-hidden cursor-pointer hover:border-amber-500/20 transition-all">
            <div className="relative h-36 overflow-hidden">
              <img src={c.image || courseCover(1)} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute left-3 top-3 text-xs px-2 py-0.5 rounded-full bg-white/15 text-white/80">{c.category}</span>
              <span className="absolute right-3 top-3 text-xs text-amber-300"><Star className="h-3 w-3 inline fill-amber-400" /> {c.rating}</span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-white/90">{c.title}</h3>
              <p className="text-xs text-white/40 mt-1">{c.teacher} · {c.teacherTitle}</p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/50">{c.description}</p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">{c.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/50">#{t}</span>)}</div>
              <div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-red-700 to-amber-400" style={{ width: `${Math.round(c.done / c.total * 100)}%` }} /></div>
              <div className="mt-2 flex justify-between text-xs text-white/40"><span>{c.done}/{c.total} 节 · {c.next}</span><span>{c.students} 学员</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Social Panel ───
function SocialPanel({ query, onQueryChange, posts, selectedType, onTypeChange, types, likedPosts, onToggleLike, onSelectPost, onPublish, onDeletePost, isAdmin }: {
  query: string; onQueryChange: (v: string) => void; posts: Post[]; selectedType: string; onTypeChange: (v: string) => void
  types: string[]; likedPosts: Set<number>; onToggleLike: (id: number) => void
  onSelectPost: (p: Post) => void; onPublish: (content: string, topic: string, type: string) => void
  onDeletePost: (id: number) => void; isAdmin: boolean
}) {
  const [showPublish, setShowPublish] = useState(false)
  const [pubContent, setPubContent] = useState('')
  const [pubTopic, setPubTopic] = useState('')
  const [pubType, setPubType] = useState('分享')
  const filtered = posts.filter(p => { const m1 = selectedType === '全部' || p.type === selectedType; const m2 = !query || p.content.includes(query) || p.topic.includes(query) || p.author.includes(query); return m1 && m2 })
  const handlePublish = () => { if (!pubContent.trim()) return; onPublish(pubContent.trim(), pubTopic.trim(), pubType); setPubContent(''); setPubTopic(''); setPubType('分享'); setShowPublish(false) }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-lg"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" /><input value={query} onChange={e => onQueryChange(e.target.value)} placeholder="搜索动态..." className="w-full rounded-xl pl-12 pr-4 py-3 text-white outline-none placeholder-white/40 glass-control" /></div>
        <button onClick={() => setShowPublish(true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 px-5 py-3 text-sm font-bold text-amber-300 hover:bg-amber-500/30"><Plus className="h-4 w-4" />发布动态</button>
      </div>
      <AnimatePresence>
        {showPublish && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowPublish(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-lg rounded-3xl bg-[#090507] p-6 glass-window" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4">发布动态</h3>
              <input value={pubTopic} onChange={e => setPubTopic(e.target.value)} placeholder="标题（可选）" className="w-full rounded-xl px-4 py-2.5 mb-3 text-sm text-white glass-control" />
              <textarea value={pubContent} onChange={e => setPubContent(e.target.value)} placeholder="分享你的想法..." className="w-full rounded-xl px-4 py-2.5 mb-3 text-sm text-white glass-control min-h-[120px] resize-none" />
              <div className="flex gap-2 mb-4">{types.filter(t => t !== '全部').map(t => (<button key={t} onClick={() => setPubType(t)} className={`rounded-xl px-3 py-1.5 text-xs ${pubType === t ? 'bg-amber-500/30 text-amber-300' : 'glass-control text-white/60'}`}>{t}</button>))}</div>
              <div className="flex gap-2"><button onClick={() => setShowPublish(false)} className="flex-1 rounded-xl py-2.5 glass-control text-sm text-white/60">取消</button><button onClick={handlePublish} className="flex-1 rounded-xl py-2.5 bg-amber-500/20 text-sm font-bold text-amber-300">发布</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-2 overflow-x-auto">{types.map(t => (<button key={t} onClick={() => onTypeChange(t)} className={`shrink-0 rounded-xl px-4 py-2 text-sm transition-all ${selectedType === t ? 'bg-amber-500/30 text-amber-300' : 'glass-control text-white/60'}`}>{t}</button>))}</div>
      <div className="space-y-4">
        {filtered.map(post => (
          <div key={post.id} onClick={() => onSelectPost(post)} className="glass-panel rounded-xl p-5 cursor-pointer hover:border-amber-500/20 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{post.avatar}</span>
              <div className="flex-1"><div className="flex items-center gap-2"><span className="font-semibold text-white/90">{post.author}</span><span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{post.level}</span></div><div className="text-xs text-white/40 mt-0.5">{post.time}</div></div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">{post.type}</span>
              {isAdmin && <button onClick={(e) => { e.stopPropagation(); if (confirm('确定删除这条动态？')) onDeletePost(post.id) }} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20">删除</button>}
            </div>
            <h4 className="font-bold text-white/85 mb-2">{post.topic}</h4>
            <p className="text-sm text-white/60 line-clamp-3">{post.content}</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">{post.tags.map(t => <span key={t} className="text-xs text-amber-400/60">#{t}</span>)}</div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-white/40">
              <button onClick={(e) => { e.stopPropagation(); onToggleLike(post.id) }} className={`flex items-center gap-1 ${likedPosts.has(post.id) ? 'text-red-400' : 'hover:text-white/60'}`}><Heart className={`h-3.5 w-3.5 ${likedPosts.has(post.id) ? 'fill-red-400' : ''}`} />{post.likes}</button>
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{post.replies}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Cross-module Recommendation Engine ───
function CrossRecommendations({ activeTab, onNavigate }: { activeTab: TabId; onNavigate: (tab: TabId) => void }) {
  const recs: Record<TabId, { icon: string; label: string; desc: string; target: TabId }[]> = {
    watch: [
      { icon: '📖', label: '学身段', desc: '王老师《晋剧身段入门》12节课', target: 'course' },
      { icon: '👘', label: '租戏服', desc: '明制马面裙·凤穿牡丹 ¥98/天', target: 'study' },
      { icon: '🎨', label: '画脸谱', desc: '数字画笔绘制《打金枝》脸谱', target: 'face' },
    ],
    study: [
      { icon: '🎭', label: '看剧目', desc: '《打金枝》· 王春梅经典唱段', target: 'watch' },
      { icon: '💬', label: '晒汉服', desc: '发动态秀造型，票友点赞', target: 'social' },
      { icon: '📸', label: '约写真', desc: '汉服写真套餐 ¥699起', target: 'shop' },
    ],
    course: [
      { icon: '🎭', label: '看剧目', desc: '学完身段看《傅山进京》', target: 'watch' },
      { icon: '👘', label: '租汉服', desc: '穿着汉服学身段，更有感觉', target: 'study' },
      { icon: '🎨', label: '画脸谱', desc: '学完化妆课来实操脸谱', target: 'face' },
    ],
    social: [
      { icon: '👘', label: '去租赁', desc: '汉服摄影社同款汉服', target: 'study' },
      { icon: '🛍️', label: '买文创', desc: '热门非遗好物推荐', target: 'shop' },
      { icon: '🎭', label: '去看戏', desc: '票友推荐《见皇姑》', target: 'watch' },
    ],
    shop: [
      { icon: '👘', label: '租汉服', desc: '搭配文创拍照更好看', target: 'study' },
      { icon: '💬', label: '晒好物', desc: '买了什么？发动态分享', target: 'social' },
      { icon: '🎭', label: '看晋剧', desc: '文创灵感来自经典剧目', target: 'watch' },
    ],
    map: [
      { icon: '🎭', label: '看剧目', desc: '在古戏台看过戏了吗？', target: 'watch' },
      { icon: '👘', label: '租汉服', desc: '穿汉服逛古戏台', target: 'study' },
      { icon: '🛍️', label: '买文创', desc: '古戏台主题文创', target: 'shop' },
    ],
    face: [
      { icon: '🎭', label: '看剧目', desc: '画完脸谱去看对应角色', target: 'watch' },
      { icon: '📖', label: '学课程', desc: '戏曲化妆造型课', target: 'course' },
      { icon: '🛍️', label: '买脸谱', desc: '晋剧脸谱盲盒 ¥68', target: 'shop' },
    ],
    admin: [{ icon: '🛡️', label: '用户管理', desc: '管理所有用户账户', target: 'admin' as TabId },{ icon: '📦', label: '订单管理', desc: '查看所有美美租赁订单', target: 'admin' as TabId },],
    chat: [
      { icon: '🎭', label: '看剧目', desc: '聊完了去看一场', target: 'watch' },
      { icon: '👘', label: '租汉服', desc: 'AI推荐明制道袍 ¥68/天', target: 'study' },
      { icon: '📖', label: '学课程', desc: '把AI说的技巧学起来', target: 'course' },
    ],
  }
  const items = recs[activeTab] || []
  if (items.length === 0) return null
  return (
    <div className="glass-panel rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-white/70 mb-3">🔗 探索更多</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <button key={i} onClick={() => onNavigate(item.target)}
            className="w-full flex items-center gap-3 p-3 rounded-xl glass-control hover:border-amber-500/20 transition-all text-left">
            <span className="text-2xl shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white/80">{item.label}</div>
              <div className="text-[11px] text-white/40 truncate">{item.desc}</div>
            </div>
            <span className="shrink-0 text-white/20">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
