import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, Clock3, Heart, Play, Search, Star, Theater } from 'lucide-react'
import PaymentModal from './PaymentModal'
import { loadDanmuFromCloud, syncDanmuToCloud } from '../utils/cloudSync'

type PlayItem = {
  id: string
  title: string
  troupe: string
  duration: string
  level: string
  heat: string
  category: string
  description: string
  actors: string[]
  image: string
  videoSource: string
  dates: string[]
  price: number
  comments: { author: string; text: string }[]
}

type Danmu = { id: number; author: string; text: string; top: number; delay: number; tone: string }

const playCover = (n: number) => new URL(`../assets/plays/play-${n}.svg`, import.meta.url).href

const categories = ['全部', '经典剧目', '折子戏', '名家导赏', '新编戏']
const danmuTones = ['bg-amber-400/22 text-amber-50', 'bg-sky-400/20 text-sky-50', 'bg-rose-400/20 text-rose-50', 'bg-emerald-400/18 text-emerald-50']

const playsData: PlayItem[] = [
  { id: '1', title: '打金枝', troupe: '山西省晋剧院', duration: '42:18', level: '经典复排', heat: '9.6', category: '经典剧目', description: '唐代名臣郭子仪之子郭暧与升平公主之间的宫廷故事，唱做并重，是晋剧最具代表性的经典剧目之一。', actors: ['王爱爱 饰 升平公主', '郭彩萍 饰 郭暧', '李月仙 饰 郭子仪', '武忠 饰 唐王'], image: playCover(1), videoSource: '晋剧院高清修复片源 · 1080P', dates: ['2026-05-18', '2026-05-25', '2026-06-01'], price: 168, comments: [{ author: '戏迷小张', text: '经典中的经典，唱腔太有味道。' }, { author: '晋韵票友', text: '郭子仪的表演很稳。' }] },
  { id: '2', title: '傅山进京', troupe: '太原实验晋剧团', duration: '36:02', level: '名家导赏', heat: '9.2', category: '名家导赏', description: '以傅山拒仕的历史故事为底本，呈现文人气节和晋地文化风骨。', actors: ['谢涛 饰 傅山', '王波 饰 康熙', '张玉梅 饰 傅母'], image: playCover(2), videoSource: '太原剧场导赏版 · 720P', dates: ['2026-05-16', '2026-05-30'], price: 198, comments: [{ author: '文化爱好者', text: '傅山精神很动人。' }] },
  { id: '3', title: '见皇姑', troupe: '青年传承班', duration: '28:45', level: '折子戏', heat: '8.9', category: '折子戏', description: '《秦香莲》中的经典折子戏，青衣唱腔婉转动人，适合入门欣赏。', actors: ['陈秀英 饰 秦香莲', '马玉楼 饰 皇姑'], image: playCover(3), videoSource: '青年传承班课堂片源 · 720P', dates: ['2026-05-20', '2026-06-04'], price: 98, comments: [{ author: '老票友', text: '青衣唱段特别细。' }] },
  { id: '4', title: '三关点帅', troupe: '山西演艺集团', duration: '38:20', level: '传承经典', heat: '9.0', category: '经典剧目', description: '杨家将题材代表作，老旦与须生对手戏紧凑，武戏场面精彩。', actors: ['张鸣琴 饰 佘太君', '侯玉兰 饰 杨六郎', '刘汉银 饰 焦赞'], image: playCover(4), videoSource: '舞台实录精选 · 1080P', dates: ['2026-05-22', '2026-06-08'], price: 148, comments: [{ author: '军事迷', text: '杨家将故事百看不厌。' }] },
  { id: '5', title: '窦娥冤', troupe: '晋中市晋剧团', duration: '45:10', level: '经典名剧', heat: '9.4', category: '经典剧目', description: '关汉卿名作改编，悲剧张力强烈，唱腔与舞台调度极具感染力。', actors: ['程玉英 饰 窦娥', '乔玉仙 饰 蔡婆', '张宝魁 饰 张驴儿'], image: playCover(5), videoSource: '经典剧目资料馆 · 1080P', dates: ['2026-05-24', '2026-06-10'], price: 128, comments: [{ author: '文学爱好者', text: '每次看都很震撼。' }] },
  { id: '6', title: '小宴', troupe: '山西戏剧职业学院', duration: '22:30', level: '教学示范', heat: '8.7', category: '折子戏', description: '以小生和小旦身段为重点的教学示范片，适合搭配课程练习。', actors: ['田桂兰 饰 貂蝉', '王宝钗 饰 吕布', '郭凤英 饰 王允'], image: playCover(6), videoSource: '教学示范片源 · 720P', dates: ['2026-05-19', '2026-06-02'], price: 78, comments: [] },
  { id: '7', title: '春草闯堂', troupe: '山西省晋剧院青年团', duration: '32:15', level: '新编戏', heat: '8.8', category: '新编戏', description: '轻喜剧风格的新编晋剧，节奏明快，适合年轻观众入门。', actors: ['栗桂莲 饰 春草', '张智 饰 薛玫庭', '陈转英 饰 小姐'], image: playCover(7), videoSource: '青年团新编戏片源 · 1080P', dates: ['2026-05-26', '2026-06-12'], price: 88, comments: [{ author: '年轻观众', text: '原来晋剧也可以这么轻快。' }] },
  { id: '8', title: '名家名段演唱会', troupe: '山西卫视《走进大戏台》', duration: '60:00', level: '特别节目', heat: '9.5', category: '名家导赏', description: '汇集多位晋剧名家代表唱段，是了解晋剧声腔的最佳入口之一。', actors: ['王爱爱', '谢涛', '栗桂莲', '张鸣琴', '陈秀英'], image: playCover(8), videoSource: '电视栏目授权片段 · 1080P', dates: ['2026-05-28', '2026-06-15'], price: 238, comments: [{ author: '新戏迷', text: '一次看到这么多名家，很值。' }] },
]

const seedDanmu = ['这句拖腔太稳了', '水袖这里很好看', '第一次看晋剧，被惊艳到', '这一段板式很有味道', '演员眼神太到位了']

export default function WatchPanel({ isAdmin }: { isAdmin: boolean }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selectedPlay, setSelectedPlay] = useState<PlayItem | null>(null)
  const [playing, setPlaying] = useState(false)
  const [booking, setBooking] = useState<PlayItem | null>(null)
  const [paidPlay, setPaidPlay] = useState<string | null>(null)
  const [danmuInput, setDanmuInput] = useState('')
  const [danmus, setDanmus] = useState<Danmu[]>([])
  const [loading, setLoading] = useState(true)

  // 从云端加载弹幕
  useEffect(() => {
    const loadDanmu = async () => {
      setLoading(true)
      try {
        const cloudDanmu = await loadDanmuFromCloud()
        if (cloudDanmu.length > 0) {
          setDanmus(cloudDanmu.map((d: any, i: number) => ({
            id: d.id || i + 1,
            author: d.author || '观众',
            text: d.text || '',
            top: d.top || 14 + i * 13,
            delay: d.delay || i * 0.65,
            tone: d.tone || danmuTones[i % danmuTones.length]
          })))
        } else {
          // 使用种子弹幕
          setDanmus(seedDanmu.map((text, i) => ({
            id: i + 1,
            author: `票友${i + 1}`,
            text,
            top: 14 + i * 13,
            delay: i * 0.65,
            tone: danmuTones[i % danmuTones.length]
          })))
          // 同步种子弹幕到云端
          const seedDanmuData = seedDanmu.map((text, i) => ({
            id: i + 1,
            author: `票友${i + 1}`,
            text,
            top: 14 + i * 13,
            delay: i * 0.65,
            tone: danmuTones[i % danmuTones.length]
          }))
          await syncDanmuToCloud(seedDanmuData)
        }
      } catch (err) {
        console.error('加载弹幕失败:', err)
        // 失败时使用种子弹幕
        setDanmus(seedDanmu.map((text, i) => ({
          id: i + 1,
          author: `票友${i + 1}`,
          text,
          top: 14 + i * 13,
          delay: i * 0.65,
          tone: danmuTones[i % danmuTones.length]
        })))
      } finally {
        setLoading(false)
      }
    }
    loadDanmu()
  }, [])

  // 弹幕变化时同步到云端
  useEffect(() => {
    if (!loading && danmus.length > 0) {
      const syncInterval = setInterval(async () => {
        await syncDanmuToCloud(danmus)
      }, 5000) // 每5秒同步一次
      return () => clearInterval(syncInterval)
    }
  }, [danmus, loading])

  const filtered = useMemo(() => playsData.filter(p => {
    if (category !== '全部' && p.category !== category) return false
    if (query && !p.title.includes(query) && !p.troupe.includes(query)) return false
    return true
  }), [category, query])

  const coverFor = useCallback((p: PlayItem) => p.image, [])

  const openPlay = (play: PlayItem) => {
    setSelectedPlay(play)
    setPlaying(false)
  }

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const sendDanmu = () => {
    const text = danmuInput.trim()
    if (!text) return
    setDanmus(prev => [...prev.slice(-24), { id: Date.now(), author: '我', text, top: 10 + Math.round(Math.random() * 72), delay: 0, tone: danmuTones[prev.length % danmuTones.length] }])
    setDanmuInput('')
  }

  if (selectedPlay) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setSelectedPlay(null)} className="ios-touch ios-focus-ring inline-flex items-center gap-2 rounded-2xl glass-control px-4 py-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            返回剧目列表
          </button>
          <div className="flex gap-2">
            <button onClick={() => toggleFav(selectedPlay.id)} className="ios-touch rounded-2xl glass-control px-4 py-2 text-sm text-white/70 hover:text-red-200">
              <Heart className={`mr-1 inline h-4 w-4 ${favorites.has(selectedPlay.id) ? 'fill-red-400 text-red-400' : ''}`} />
              收藏
            </button>
            <button onClick={() => setBooking(selectedPlay)} className="ios-touch rounded-2xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30">
              购票 ¥{selectedPlay.price}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.8rem] border border-white/12 bg-black/35 shadow-2xl shadow-black/30">
          <div className="relative aspect-video overflow-hidden bg-black">
            <img src={coverFor(selectedPlay)} alt={selectedPlay.title} className={`absolute inset-0 h-full w-full object-cover opacity-62 ${playing ? 'scale-105 blur-[1px]' : ''} transition-all duration-700`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/35" />
            <div className="absolute left-5 top-5 rounded-full bg-black/45 px-3 py-1 text-xs text-white/70 backdrop-blur-xl">{selectedPlay.videoSource}</div>
            <div className="absolute inset-x-0 top-12 bottom-28 overflow-hidden pointer-events-none">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-white/50">弹幕加载中...</div>
                </div>
              ) : (
                danmus.map(d => (
                  <span key={d.id} className={`danmu-item absolute whitespace-nowrap rounded-full border border-white/15 px-3 py-1 text-sm shadow-lg backdrop-blur-md ${d.tone}`} style={{ top: `${d.top}%`, animationDelay: `${d.delay}s` }}>
                    {d.author}: {d.text}
                  </span>
                ))
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <button onClick={() => setPlaying(p => !p)} className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/90 text-black shadow-2xl shadow-amber-500/20 transition-transform active:scale-95">
                <Play className="h-8 w-8 ml-1" fill="currentColor" />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className={`h-full rounded-full bg-gradient-to-r from-red-600 to-amber-400 ${playing ? 'animate-progress' : ''}`} style={{ width: playing ? '100%' : '8%', animationDuration: '42s' }} />
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{selectedPlay.title}</h2>
                  <p className="text-sm text-white/55">{selectedPlay.troupe} · {selectedPlay.duration} · {selectedPlay.level}</p>
                  <p className="text-xs text-white/40 mt-1">{selectedPlay.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBooking(selectedPlay)} className="ios-touch rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/30">购票</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white/70 mb-3">💬 弹幕互动</h3>
          <div className="flex gap-2">
            <input
              value={danmuInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDanmuInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && sendDanmu()}
              placeholder="说点什么..."
              className="flex-1 rounded-xl bg-white/5 px-4 py-2 text-sm text-white outline-none placeholder-white/40"
            />
            <button onClick={sendDanmu} className="ios-touch rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/30">发送</button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white/70 mb-3">🎭 演职人员</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedPlay.actors.map((actor, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                {actor}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white/70 mb-3">💬 观众评论</h3>
          <div className="space-y-3">
            {selectedPlay.comments.map((comment, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">👤</div>
                <div>
                  <div className="text-sm font-medium text-white/80">{comment.author}</div>
                  <div className="text-xs text-white/50">{comment.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-lg">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
        <input value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} placeholder="搜索剧目名称或剧团..." className="w-full rounded-2xl pl-12 pr-4 py-3 text-white outline-none placeholder-white/40 glass-control" />
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(c => <button key={c} onClick={() => setCategory(c)} className={`rounded-2xl px-4 py-2 text-sm transition-all ${category === c ? 'bg-amber-500/25 text-amber-200 border border-amber-500/30' : 'text-white/60 glass-control hover:text-white'}`}>{c}</button>)}
      </div>

      {isAdmin && <div className="rounded-2xl glass-panel p-4 border border-amber-500/15 flex items-center justify-between"><div><div className="text-sm font-semibold text-amber-300">管理员面板</div><p className="text-xs text-white/50 mt-1">支持封面替换、片源标识和弹幕互动预览</p></div><button className="rounded-xl px-4 py-2 text-sm font-medium glass-control hover:text-amber-400">+ 添加剧目</button></div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(p => (
          <motion.div key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl overflow-hidden group cursor-pointer hover:border-amber-500/20 transition-all" onClick={() => openPlay(p)}>
            <div className="relative h-40 overflow-hidden bg-black">
              <img src={coverFor(p)} alt={p.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
              <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-black/50 text-white/80">{p.level}</span>
              <span className="absolute bottom-2 right-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-100">有片源</span>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0"><h3 className="font-bold text-white truncate">{p.title}</h3><p className="text-xs text-white/50 mt-0.5 flex items-center gap-1"><Theater className="h-3 w-3" />{p.troupe}</p></div>
                <button onClick={(e) => { e.stopPropagation(); toggleFav(p.id) }} className="rounded-lg p-1.5 hover:bg-white/10"><Heart className={`h-4 w-4 ${favorites.has(p.id) ? 'fill-red-400 text-red-400' : 'text-white/40'}`} /></button>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-white/50"><span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{p.duration}</span><span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{p.heat}</span><span>¥{p.price}</span></div>
              <div className="flex gap-2 mt-3"><button onClick={(e) => { e.stopPropagation(); openPlay(p) }} className="flex-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 py-1.5 text-xs font-medium text-amber-300">播放</button><button onClick={(e) => { e.stopPropagation(); setBooking(p) }} className="rounded-xl bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 text-xs font-medium text-red-300">购票</button></div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {booking && <PaymentModal config={{ orderId: `JHPLAY${booking.id}${Date.now().toString().slice(-4)}`, amount: booking.price, type: 'shop', summary: [{ label: '剧目', value: booking.title }, { label: '场次', value: `${booking.dates[0]} 19:30` }] }} onClose={() => setBooking(null)} onSuccess={() => { setPaidPlay(booking.title); setBooking(null); setTimeout(() => setPaidPlay(null), 2200) }} />}
      </AnimatePresence>
      <SuccessToast paidPlay={paidPlay} />
    </div>
  )
}

function SuccessToast({ paidPlay }: { paidPlay: string | null }) {
  return (
    <AnimatePresence>
      {paidPlay && (
        <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} className="fixed top-6 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-green-500/90 px-6 py-3 text-white shadow-lg">
          <CheckCircle className="h-5 w-5" />
          <div><div className="font-bold">购票成功</div><div className="text-sm text-white/75">{paidPlay}</div></div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
