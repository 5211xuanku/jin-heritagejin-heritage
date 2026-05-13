import { useState, useRef } from 'react'
import { requestAiChat } from '../utils/aiClient'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `你是"晋梆智绎"平台的AI助手"小e"，专门服务于山西晋剧非遗文化领域。你的知识源于：山西12座古戏台实地采集数据、6位晋剧老艺人数字化声腔存档、50+非遗技艺工序拆解。

核心知识储备：
- 晋剧四大梆子：中路梆子（晋剧）、蒲州梆子（蒲剧）、北路梆子、上党梆子
- 经典剧目：《打金枝》《空城计》《算粮登殿》《傅山进京》《三关点帅》《见皇姑》等
- 晋剧角色行当：须生（老生）、青衣、花脸、小生、小旦、老旦、丑
- 唱腔板式：平板、夹板、二性、流水板、介板、滚白等
- 晋剧特色乐器：晋胡、二股弦、三股弦、四股弦（呼胡家族）
- 非遗技艺：平遥推光漆器、晋剧脸谱、木版年画、剪纸、皮影、榫卯古建等

回答准则：
1. 用词精准专业，能区分"梆子腔"和"北路梆子"的区别
2. 提到唱腔时，说明是哪个板式、哪位老艺人的代表作
3. 推荐文创时关联具体剧目和文化元素
4. 回应不超过300字，简洁有力
5. 如被问非晋剧/非遗问题，礼貌引导回晋剧文化主题`

const quickQuestions = [
  '《打金枝》里王春梅用的什么板式？',
  '晋胡和二胡有什么区别？',
  '北路梆子和晋剧是什么关系？',
  '推荐一套适合晋剧主题的汉服',
  '学唱梆子腔从哪句入门？',
]

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'system', content: SYSTEM_PROMPT }])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const sendMessage = async (text?: string) => {
    const msg = (text || inputValue).trim()
    if (!msg) return
    setError(null)
    const userMessage: ChatMessage = { role: 'user', content: msg }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInputValue('')
    setLoading(true)

    try {
      const reply = await requestAiChat({
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        maxTokens: 600,
      }) || demoReply(msg)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  const demoReply = (q: string): string => {
    if (q.includes('板式')) return '《打金枝》中王春梅老师的唱段主要运用了"平板"转"夹板"再转"二性"的三段式结构，其中平板部分舒展大气，夹板部分节奏加快表现人物心理，二性部分情绪推向高潮。这是晋剧须生唱腔的经典范式。'
    if (q.includes('晋胡')) return '晋胡（又称呼胡）是晋剧的灵魂乐器，比二胡琴筒更大，音色更浑厚苍劲。关键区别：晋胡用丝弦（传统蚕丝弦），定弦为"反调"（52弦），音域比二胡低五度，适合表现梆子腔的慷慨悲壮。牛宝林、刘和仁是当代晋胡大师。'
    if (q.includes('北路梆子')) return '四大梆子同源，都源于山陕梆子腔。晋剧（中路梆子）以太原为中心，唱腔婉转细腻；北路梆子以大同为中心，风格更为高亢激越。两者板式结构相似但调式不同——北路梆子多用上调（G调），晋剧多用平调（D调）。'
    if (q.includes('汉服')) return '推荐明制马面裙套装：竖领长衫搭配织金马面裙，凤穿牡丹纹样与晋剧《打金枝》中公主的服饰元素呼应。裙摆五对褶，暗合晋剧"五行"声腔体系。租价¥98/天，押金¥300。到店可免费试穿确认尺码。'
    if (q.includes('入门')) return '学梆子腔从"叫板"开始——即一句"哎——"的拖腔。关键技巧：用丹田气、舌尖抵上颚、喉头放松。推荐"平板"入门，节奏较慢容易掌握。平台"普惠教学"栏目有《晋剧身段入门》和《唱念发声训练》课程，分别是王老师（国家一级演员）和李老师（戏曲声乐专家）授课。'
    return '这个问题很有意思！晋剧有四大梆子体系，每个都有独特的声腔特点。您想了解具体的剧目、唱腔技巧、还是非遗文创推荐呢？我可以用平台的专业数据为您详细解答。'
  }

  const clearChat = () => { setMessages([{ role: 'system', content: SYSTEM_PROMPT }]); setError(null) }

  return (
    <div className="space-y-4">
      {/* Quick questions */}
      <div className="flex flex-wrap gap-2">
        {quickQuestions.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} disabled={loading}
            className="shrink-0 rounded-xl px-4 py-2 text-xs glass-control text-white/70 hover:text-amber-300 hover:border-amber-500/30 transition-all">
            {q}
          </button>
        ))}
      </div>

      {/* Chat panel */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">🤖 小e · AI文化助手</h2>
            <p className="text-xs text-white/40 mt-0.5">基于12座古戏台实地数据 × 6位老艺人声腔存档 × 50+非遗技艺</p>
          </div>
          <button onClick={clearChat} className="rounded-xl px-3 py-1.5 glass-control text-xs text-amber-300">清空</button>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {messages.slice(1).length === 0 && (
            <div className="text-center py-8 text-white/30 text-sm">
              <div className="text-3xl mb-2">🎭</div>
              <p>问我晋剧、非遗、汉服、文创相关问题</p>
              <p className="text-xs mt-1">👆 点击上方快捷问题或直接输入</p>
            </div>
          )}
          {messages.slice(1).map((m, i) => (
            <div key={i} className={`rounded-xl p-4 ${m.role === 'user' ? 'bg-amber-500/10 border border-amber-500/15 ml-8' : 'bg-white/5 border border-white/5 mr-8'}`}>
              <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">{m.role === 'user' ? '你' : '小e'}</div>
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/85">{m.content}</div>
            </div>
          ))}
        </div>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">{error}</div>}

        <div className="flex gap-2">
          <input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="问晋剧、非遗、汉服、唱腔……" disabled={loading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-white/30 glass-control" />
          <button onClick={() => sendMessage()} disabled={loading}
            className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 px-5 py-2.5 text-sm font-bold text-amber-300">
            {loading ? '…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
}
