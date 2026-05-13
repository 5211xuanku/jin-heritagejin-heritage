import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Compass, Navigation, Clock, AlertCircle } from 'lucide-react'

const venues = [
  {
    id: 1,
    name: '山西大剧院',
    address: '太原市晋源区长风商务区',
    lngLat: [112.528, 37.807] as [number, number],
    type: '现代剧场',
    desc: '山西省规模最大的综合演艺场馆，常年上演晋剧经典剧目。',
    hours: '演出日 19:30 开演',
  },
  {
    id: 2,
    name: '山西省晋剧院',
    address: '太原市迎泽区新建南路8号',
    lngLat: [112.558, 37.851] as [number, number],
    type: '院团剧场',
    desc: '山西省晋剧院驻地，省级非遗传承单位，定期举办晋剧惠民演出。',
    hours: '排练日 09:00-17:00 开放观摩',
  },
  {
    id: 3,
    name: '太原工人文化宫',
    address: '太原市迎泽大街248号',
    lngLat: [112.541, 37.862] as [number, number],
    type: '群众剧场',
    desc: '太原市群众戏曲活动中心，周末有戏迷票友汇演。',
    hours: '周六 14:00 戏迷活动',
  },
  {
    id: 4,
    name: '平遥古县衙戏台',
    address: '晋中市平遥古城内',
    lngLat: [112.176, 37.205] as [number, number],
    type: '古戏台',
    desc: '始建于元代，平遥古城内保存最完整的古戏台，节假日有晋剧实景演出。',
    hours: '节假日 10:00/15:00 演出',
  },
  {
    id: 5,
    name: '晋祠水镜台',
    address: '太原市晋源区晋祠镇',
    lngLat: [112.444, 37.713] as [number, number],
    type: '古戏台',
    desc: '明代古戏台，晋祠博物馆内标志性建筑，每年农历七月有庙会戏。',
    hours: '博物馆开放时间 08:30-17:30',
  },
  {
    id: 6,
    name: '解州关帝庙戏台',
    address: '运城市盐湖区解州镇',
    lngLat: [110.981, 34.902] as [number, number],
    type: '古戏台',
    desc: '关帝庙内明清古戏台，庙会期间有蒲剧、晋剧等地方戏展演。',
    hours: '庙会期间 10:00/14:00',
  },
  {
    id: 7,
    name: '大同华严寺戏台',
    address: '大同市平城区下寺坡街',
    lngLat: [113.299, 40.093] as [number, number],
    type: '古戏台',
    desc: '辽代古刹华严寺内的清代戏台，每年农历四月初八有佛诞戏曲活动。',
    hours: '四月庙会期间有演出',
  },
]

export default function OperaMap({
  onExploreFace,
}: {
  onExploreFace?: (templateId: string) => void
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [selectedVenue, setSelectedVenue] = useState<number | null>(null)
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        if (!mapContainer.current) return

        ;(window as any)._AMapSecurityConfig = {
          securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JSCODE_1 || '3c709401bd41805fad01259802e16754',
        }

        const AMap = await loadAMap()
        if (cancelled || !mapContainer.current) return

        const map = new AMap.Map(mapContainer.current, {
          zoom: 8,
          center: [112.5, 37.5],
          viewMode: '2D',
          mapStyle: 'amap://styles/darkblue',
        })

        if (cancelled) {
          map.destroy()
          return
        }

        mapInstance.current = map
        setMapStatus('ready')

        venues.forEach((venue) => {
          const marker = new AMap.Marker({
            position: venue.lngLat,
            title: venue.name,
            content: `
              <div style="
                width: 36px; height: 36px;
                background: linear-gradient(135deg, #d97706, #b91c1c);
                border: 2px solid rgba(251,191,36,0.6);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 0 12px rgba(185,28,28,0.5);
              ">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
            `,
          })

          marker.on('click', () => {
            setSelectedVenue(venue.id)
            map.setCenter(venue.lngLat, true)
            map.setZoom(13, true)
          })

          marker.setMap(map)
          markersRef.current.push(marker)
        })
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Map init failed:', err)
          setMapStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
      markersRef.current.forEach((m) => {
        try { m.setMap(null) } catch {}
      })
      markersRef.current = []
      if (mapInstance.current) {
        try { mapInstance.current.destroy() } catch {}
        mapInstance.current = null
      }
    }
  }, [])

  const focusVenue = (id: number) => {
    const venue = venues.find((v) => v.id === id)
    if (!venue || !mapInstance.current) return
    setSelectedVenue(id)
    mapInstance.current.setCenter(venue.lngLat, true)
    mapInstance.current.setZoom(14, true)
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Compass className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
            山西戏曲文化线下地图
          </h2>
        </div>
        <p className="text-white/70 leading-relaxed">
          山西是中国戏曲的重要发源地之一，拥有晋剧、蒲剧、北路梆子、上党梆子四大梆子戏。
          三晋大地上散布着众多古戏台与现代剧场，它们是戏曲文化传承的重要载体。
          以下地图标注了山西省内主要戏曲演出场所，方便戏迷朋友实地探访、现场感受梆子声腔的魅力。
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="relative min-h-[400px]">
          {mapStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl z-20 border border-amber-500/20">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-amber-400/80 text-sm">加载地图中...</p>
              </div>
            </div>
          )}

          {mapStatus === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-20 border border-amber-500/20">
              <div className="text-center px-6 max-w-md">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="text-amber-300/90 text-base font-medium mb-2">地图暂不可用</p>
                <p className="text-white/50 text-sm leading-relaxed">
                  高德地图加载失败，请检查网络连接或稍后重试。
                  您仍可浏览下方列表中的戏曲文化场所信息。
                </p>
              </div>
            </div>
          )}

          <div
            ref={mapContainer}
            className="w-full h-[520px] rounded-xl overflow-hidden border border-amber-500/20 bg-[#0a0a0f]"
          />

          {mapStatus === 'ready' && (
            <div className="absolute bottom-4 left-4 glass-window rounded-xl px-3 py-2 text-xs text-amber-400/70 z-10 flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5" />
              共标注 {venues.length} 个文化场所
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
          {venues.map((venue) => (
            <motion.button
              key={venue.id}
              type="button"
              onClick={() => focusVenue(venue.id)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: venue.id * 0.05 }}
              className={`w-full text-left rounded-xl p-4 transition-all ${
                selectedVenue === venue.id
                  ? 'glass-panel border-amber-400/50'
                  : 'glass-control hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  selectedVenue === venue.id
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'bg-white/10 text-white/60'
                }`}>
                  {venue.id}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-base font-bold text-white/90 truncate">{venue.name}</h3>
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">{venue.type}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-white/55 line-clamp-2">{venue.desc}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {venue.address}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {venue.hours}
                    </span>
                  </div>
                </div>
              </div>
              {onExploreFace && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const templates: Record<number, string> = {
                      1: 'jing', 2: 'jing', 3: 'chou', 4: 'guanyu',
                      5: 'baozheng', 6: 'caocao', 7: 'zhangfei', 8: 'wukong',
                    }
                    onExploreFace(templates[venue.id] || 'jing')
                  }}
                  className="mt-2 w-full text-center text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 py-1.5 rounded-lg transition-colors"
                >
                  画脸谱
                </button>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

async function loadAMap(): Promise<any> {
  if ((window as any).AMap) return (window as any).AMap

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${import.meta.env.VITE_AMAP_KEY_1 || 'a8fa95b350347b80d35952a0354c8622'}`
    script.async = true
    script.onload = () => {
      if ((window as any).AMap) {
        resolve((window as any).AMap)
      } else {
        reject(new Error('AMap 加载失败'))
      }
    }
    script.onerror = () => reject(new Error('AMap 脚本加载失败'))
    document.head.appendChild(script)
  })
}
