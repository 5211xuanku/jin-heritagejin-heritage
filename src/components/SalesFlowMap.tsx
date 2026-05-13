import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { syncOrderToCloud, syncRentalOrderToCloud } from '../utils/cloudSync'

// 从 localStorage 读取真实订单数据生成发货日志
function buildLogsFromOrders() {
  const logs: { id: number; city: string; goods: string; quantity: number; time: string }[] = []
  let idCounter = 1

  // 读取商城订单
  try {
    const shopOrders = JSON.parse(localStorage.getItem('jh_orders') || '[]')
    const cityPool = ['浙江省杭州市', '北京市朝阳区', '广东省广州市', '四川省成都市', '上海市浦东新区', '陕西省西安市', '江苏省南京市', '湖北省武汉市', '广东省深圳市', '湖南省长沙市', '重庆市渝中区']
    for (const o of shopOrders) {
      if (o.items && o.items.length > 0) {
        const city = cityPool[Math.floor(Math.random() * cityPool.length)]
        for (const item of o.items) {
          logs.push({
            id: idCounter++,
            city,
            goods: item.name || '文创商品',
            quantity: item.qty || item.quantity || 1,
            time: o.createdAt ? `${Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)}分钟前` : '刚刚'
          })
        }
      }
    }
  } catch { /* ignore */ }

  // 读取租赁订单
  try {
    const rentalOrders = JSON.parse(localStorage.getItem('jh_rental_orders') || '[]')
    for (const o of rentalOrders) {
      if (o.items && o.items.length > 0) {
        for (const item of o.items) {
          logs.push({
            id: idCounter++,
            city: o.address?.includes('北京') ? '北京市' : o.address?.includes('上海') ? '上海市' : o.address?.includes('广州') ? '广州市' : o.address?.includes('杭州') ? '浙江省杭州市' : '山西省太原市',
            goods: item.name || '汉服租赁',
            quantity: item.quantity || 1,
            time: o.createdAt ? `${Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)}分钟前` : '刚刚'
          })
        }
      }
    }
  } catch { /* ignore */ }

  // 如果没有任何订单，使用默认示例
  if (logs.length === 0) {
    logs.push(
      { id: idCounter++, city: '浙江省杭州市', goods: '晋剧脸谱盲盒 x2', quantity: 2, time: '刚刚' },
      { id: idCounter++, city: '北京市朝阳区', goods: '皮影戏人偶套装 x1', quantity: 1, time: '2分钟前' },
      { id: idCounter++, city: '广东省广州市', goods: '汉服租赁·明制 x3', quantity: 3, time: '5分钟前' },
      { id: idCounter++, city: '四川省成都市', goods: '戏曲主题丝巾 x1', quantity: 1, time: '8分钟前' },
      { id: idCounter++, city: '山西省太原市', goods: '剪纸艺术书签套装 x2', quantity: 2, time: '10分钟前' },
      { id: idCounter++, city: '上海市浦东新区', goods: '非遗陶瓷茶具 x1', quantity: 1, time: '12分钟前' },
      { id: idCounter++, city: '江苏省南京市', goods: '刺绣香囊挂件 x4', quantity: 4, time: '15分钟前' },
      { id: idCounter++, city: '湖北省武汉市', goods: '汉服租赁·唐制 x2', quantity: 2, time: '18分钟前' },
      { id: idCounter++, city: '陕西省西安市', goods: '木版年画装饰画 x1', quantity: 1, time: '20分钟前' },
      { id: idCounter++, city: '湖南省长沙市', goods: '青铜纹饰文创摆件 x1', quantity: 1, time: '22分钟前' },
    )
  }

  return logs
}

// 中国城市坐标数据
const cityCoords: Record<string, { lng: number; lat: number }> = {
  '浙江省杭州市': { lng: 120.1551, lat: 30.2741 },
  '北京市朝阳区': { lng: 116.4074, lat: 39.9042 },
  '广东省广州市': { lng: 113.2644, lat: 23.1291 },
  '四川省成都市': { lng: 104.0665, lat: 30.5723 },
  '上海市浦东新区': { lng: 121.4737, lat: 31.2304 },
  '陕西省西安市': { lng: 108.9398, lat: 34.3416 },
  '江苏省南京市': { lng: 118.7969, lat: 32.0603 },
  '湖北省武汉市': { lng: 114.3054, lat: 30.5931 },
  '广东省深圳市': { lng: 114.0579, lat: 22.5431 },
  '湖南省长沙市': { lng: 112.9388, lat: 28.2282 },
  '重庆市渝中区': { lng: 106.5516, lat: 29.5630 },
  '山西省太原市': { lng: 112.5489, lat: 37.8706 },
}

// 中国中心坐标
const chinaCenter = { lng: 104.1954, lat: 35.8617 }

function lngLatToCanvas(lng: number, lat: number, width: number, height: number, centerLng: number, centerLat: number) {
  const x = (lng - centerLng) * (width / 80)
  const y = -(lat - centerLat) * (height / 60)
  return { x, y }
}

export default function SalesFlowMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logs, setLogs] = useState(() => buildLogsFromOrders())
  const [orderCount, setOrderCount] = useState(() => {
    try {
      const shopOrders = JSON.parse(localStorage.getItem('jh_orders') || '[]')
      const rentalOrders = JSON.parse(localStorage.getItem('jh_rental_orders') || '[]')
      return shopOrders.length + rentalOrders.length
    } catch {
      return 0
    }
  })

  // 订单数据同步到 CloudBase
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const shopOrders = JSON.parse(localStorage.getItem('jh_orders') || '[]')
        const rentalOrders = JSON.parse(localStorage.getItem('jh_rental_orders') || '[]')
        
        for (const order of shopOrders) {
          await syncOrderToCloud(order)
        }
        for (const order of rentalOrders) {
          await syncRentalOrderToCloud(order)
        }
      } catch (err) {
        console.error('订单同步到 CloudBase 失败:', err)
      }
    }, 10000) // 每 10 秒同步一次

    return () => clearInterval(syncInterval)
  }, [])

  // 模拟实时订单更新
  useEffect(() => {
    const interval = setInterval(() => {
      setOrderCount((prev: number) => prev + 1)
      // const newLogs = buildLogsFromOrders()
      const newLog = {
        id: Date.now(),
        city: Object.keys(cityCoords)[Math.floor(Math.random() * Object.keys(cityCoords).length)],
        goods: ['晋剧脸谱盲盒', '皮影戏人偶套装', '汉服租赁·明制', '戏曲主题丝巾', '剪纸艺术书签套装'][Math.floor(Math.random() * 5)],
        quantity: Math.floor(Math.random() * 3) + 1,
        time: '刚刚'
      } as const
      setLogs(prev => [newLog, ...prev.slice(0, 19)])
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // 绘制地图
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 绘制城市坐标点
    Object.entries(cityCoords).forEach(([city, { lng, lat }]) => {
      const { x, y } = lngLatToCanvas(lng, lat, width, height, chinaCenter.lng, chinaCenter.lat)
      
      // 绘制城市点
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.fill()

      // 绘制城市名称
      ctx.font = '12px sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.textAlign = 'center'
      ctx.fillText(city.replace(/省|市|区/g, ''), x, y - 8)
    })

    // 绘制发货路线和动态效果
    const drawFlow = () => {
      ctx.clearRect(0, 0, width, height)

      // 绘制基础地图
      Object.entries(cityCoords).forEach(([city, { lng, lat }]) => {
        const { x, y } = lngLatToCanvas(lng, lat, width, height, chinaCenter.lng, chinaCenter.lat)
        
        // 绘制城市点
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.fill()

        // 绘制城市名称
        ctx.font = '12px sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.textAlign = 'center'
        ctx.fillText(city.replace(/省|市|区/g, ''), x, y - 8)
      })

      // 绘制发货路线（从山西省太原市出发）
      const taiyuan = cityCoords['山西省太原市']
      Object.entries(cityCoords).forEach(([city, { lng, lat }]) => {
        if (city === '山西省太原市') return

        const { x: startX, y: startY } = lngLatToCanvas(taiyuan.lng, taiyuan.lat, width, height, chinaCenter.lng, chinaCenter.lat)
        const { x: endX, y: endY } = lngLatToCanvas(lng, lat, width, height, chinaCenter.lng, chinaCenter.lat)

        // 绘制路线
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)'
        ctx.lineWidth = 1
        ctx.stroke()

        // 绘制动态流向
        const time = Date.now() / 1000
        const progress = (time % 2) / 2
        const currentX = startX + (endX - startX) * progress
        const currentY = startY + (endY - startY) * progress

        ctx.beginPath()
        ctx.arc(currentX, currentY, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(251, 191, 36, 0.8)'
        ctx.fill()
      })

      requestAnimationFrame(drawFlow)
    }

    const animationId = requestAnimationFrame(drawFlow)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/70">📦 订单流向图</h3>
        <div className="text-xs text-white/40">实时同步中</div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full h-64 bg-gradient-to-b from-slate-900 to-slate-800"
        />

        {/* 右下角图例 */}
        <div className="absolute bottom-4 right-4 glass-panel rounded-lg p-3 z-10">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-red-500/60" />
              <span className="text-white/60">路线</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-amber-400 relative">
                <div className="absolute right-0 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              </div>
              <span className="text-white/60">流向</span>
            </div>
          </div>
        </div>
      </div>

      {/* 订单统计 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{orderCount}</div>
          <div className="text-xs text-white/40">总订单数</div>
        </div>
        <div className="glass-panel rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">¥{(orderCount * 128).toLocaleString()}</div>
          <div className="text-xs text-white/40">总销售额</div>
        </div>
        <div className="glass-panel rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-sky-400">12</div>
          <div className="text-xs text-white/40">覆盖城市</div>
        </div>
      </div>

      {/* 滚动日志 */}
      <AnimatedLogList logs={logs} />
    </div>
  )
}

// 滚动日志组件
function AnimatedLogList({ logs }: { logs: { id: number; city: string; goods: string; quantity: number; time: string }[] }) {
  return (
    <div className="space-y-2">
      {logs.slice(0, 8).map((log, index) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
            <span className="text-white/70 truncate">发往 {log.city}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-amber-400/60">{log.goods}</span>
            <span className="text-white/40">{log.time}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
