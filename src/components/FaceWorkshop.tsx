import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { requestAiChat } from '../utils/aiClient'
import {
  Download,
  Eraser,
  Grid3X3,
  Minus,
  Paintbrush,
  Palette,
  Plus,
  RotateCcw,
  ShoppingBag,
  Undo2,
} from 'lucide-react'

/* ---- Types ---- */

interface Point {
  x: number
  y: number
}

interface Stroke {
  points: Point[]
  color: string
  size: number
  isEraser: boolean
}

type TemplateId = 'blank' | 'jing' | 'chou' | 'guanyu' | 'baozheng' | 'caocao' | 'zhangfei' | 'wukong'
type DrawMode = 'freehand' | 'bead' | 'complex'
type ComplexTool = 'brush' | 'fill' | 'spray' | 'calligraphy' | 'marker' | 'watercolor'

/* ---- Color Data ---- */

interface FaceColor {
  hex: string
  name: string
  meaning: string
}

const FACE_COLORS: FaceColor[] = [
  { hex: '#CC0000', name: '红色', meaning: '忠诚正直' },
  { hex: '#1A1A1A', name: '黑色', meaning: '刚直勇猛' },
  { hex: '#E8E8E8', name: '白色', meaning: '奸诈多疑' },
  { hex: '#0055AA', name: '蓝色', meaning: '刚强骁勇' },
  { hex: '#007755', name: '绿色', meaning: '侠肝义胆' },
  { hex: '#DDB800', name: '黄色', meaning: '勇猛凶暴' },
  { hex: '#660099', name: '紫色', meaning: '稳重刚正' },
  { hex: '#C8922A', name: '金色', meaning: '神仙鬼怪' },
  { hex: '#A0A0A0', name: '银色', meaning: '妖魔鬼怪' },
  { hex: '#E87777', name: '粉红', meaning: '年迈衰弱' },
]

/* ---- Constants ---- */

const BRUSH_MIN_SIZE = 2
const BRUSH_MAX_SIZE = 40
const BRUSH_DEFAULT_SIZE = 8
const ERASER_DEFAULT_SIZE = 16
const CANVAS_SIZE = 600

// Bead mode
const BEAD_CELL = 15
const BEAD_COLS = 36
const BEAD_ROWS = 36
const BEAD_R = 6.5
const BEAD_OX = (CANVAS_SIZE - BEAD_COLS * BEAD_CELL) / 2
const BEAD_OY = (CANVAS_SIZE - BEAD_ROWS * BEAD_CELL) / 2

// Complex mode
const COMPLEX_SPRAY_RADIUS = 20
const COMPLEX_FILL_TOLERANCE = 30
const COMPLEX_OPACITY_DEFAULT = 1
const TEMPLATE_OPTIONS: { id: TemplateId; label: string }[] = [
  { id: 'blank', label: '空白' },
  { id: 'jing', label: '净角' },
  { id: 'chou', label: '丑角' },
  { id: 'guanyu', label: '关羽' },
  { id: 'baozheng', label: '包拯' },
  { id: 'caocao', label: '曹操' },
  { id: 'zhangfei', label: '张飞' },
  { id: 'wukong', label: '悟空' },
]

const TEMPLATE_INFO: Record<string, { role: string; play: string; desc: string; tip: string }> = {
  jing: { role: '净角', play: '花脸', desc: '性格气质相貌上有特异之处的男性角色，使用各种颜色勾勒脸谱。', tip: '以底色为主，重点填充脸谱轮廓内的区域。' },
  chou: { role: '丑角', play: '小花脸', desc: '喜剧角色，鼻梁上抹白粉，语言幽默、动作滑稽。', tip: '白粉区域是标志，先用白色填鼻梁再做细节。' },
  guanyu: { role: '红脸关公', play: '《单刀会》《千里走单骑》', desc: '以忠义著称的武圣人。红色脸谱代表忠勇正直，卧蚕眉、丹凤眼是标志。', tip: '大面积正红为底，黑色勾眉眼，金色点缀装饰纹样。' },
  baozheng: { role: '黑脸包拯', play: '《铡美案》《探阴山》', desc: '铁面无私的一代名臣。黑色脸谱象征刚正不阿，额头月牙代表明察秋毫。', tip: '黑色铺面，月牙留白，可用灰白渐变渲染刚毅。' },
  caocao: { role: '白脸曹操', play: '《群英会》《战宛城》', desc: '一代枭雄，白脸象征多疑奸诈。面如傅粉，细目长髯。', tip: '白脸打底，用灰黑细线勾勒细长眉眼，体现阴鸷气质。' },
  zhangfei: { role: '黑脸张飞', play: '《长坂坡》《当阳桥》', desc: '勇猛粗犷的猛将。黑色脸谱配虎目，性格直爽暴烈。', tip: '黑色铺面，白色强调环眼，夸张的浓眉表现怒气。' },
  wukong: { role: '猴王悟空', play: '《大闹天宫》《三打白骨精》', desc: '齐天大圣，机灵顽皮。脸谱上金色猴脸配红色桃心，额有金箍。', tip: '红色桃心打底，金色勾眼眶，棕色画猴毛纹理。' },
}

/* ---- Drawing Helpers ---- */

function midPoint(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  size: number,
  isEraser: boolean,
) {
  if (points.length < 1) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size
  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color
  }
  if (points.length === 1) {
    ctx.beginPath()
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const mid = midPoint(points[i - 1], points[i])
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mid.x, mid.y)
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    ctx.stroke()
  }
  ctx.restore()
}

/* ---- Complex Mode Tools ---- */

function floodFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillColor: string,
  tolerance: number,
) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const img = ctx.getImageData(0, 0, w, h)
  const src = img.data
  const px = (Math.round(y) * w + Math.round(x)) * 4
  const targetR = src[px], targetG = src[px+1], targetB = src[px+2]
  const r = parseInt(fillColor.slice(1,3), 16)
  const g = parseInt(fillColor.slice(3,5), 16)
  const b = parseInt(fillColor.slice(5,7), 16)

  if (Math.abs(r - targetR) < tolerance && Math.abs(g - targetG) < tolerance && Math.abs(b - targetB) < tolerance) return

  const visited = new Uint8Array(w * h)
  const stack: [number, number][] = [[Math.round(x), Math.round(y)]]

  while (stack.length) {
    const [cx, cy] = stack.pop()!
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue
    const idx = cy * w + cx
    if (visited[idx]) continue
    const si = idx * 4
    if (Math.abs(src[si] - targetR) > tolerance || Math.abs(src[si+1] - targetG) > tolerance || Math.abs(src[si+2] - targetB) > tolerance) continue
    visited[idx] = 1
    src[si] = r; src[si+1] = g; src[si+2] = b; src[si+3] = 255
    stack.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1])
  }

  ctx.putImageData(img, 0, 0)
}

function drawSpray(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
  opacity: number,
) {
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = color
  const count = Math.round(radius * 2.5)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.sqrt(Math.random()) * radius
    const sx = x + Math.cos(angle) * dist
    const sy = y + Math.sin(angle) * dist
    const size = Math.random() * 2.5 + 0.5
    ctx.beginPath()
    ctx.arc(sx, sy, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/* ---- Extra Brush Styles ---- */

function drawCalligraphyStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  baseSize: number,
  opacity: number,
) {
  if (points.length < 1) return
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.lineCap = 'square'
  ctx.lineJoin = 'bevel'
  ctx.strokeStyle = color
  ctx.fillStyle = color

  if (points.length === 1) {
    ctx.beginPath(); ctx.arc(points[0].x, points[0].y, baseSize * 0.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    return
  }

  // Simulate calligraphy by varying width based on slope
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i]
    const dx = p1.x - p0.x, dy = p1.y - p0.y
    const speed = Math.sqrt(dx * dx + dy * dy)
    // Fast strokes are thinner (brush lifts), slow strokes are thicker (brush pressed)
    const width = Math.max(2, Math.min(baseSize * 4, baseSize * (3 - speed * 0.03)))
    const angle = Math.atan2(dy, dx)
    const perpX = Math.cos(angle + Math.PI / 2) * width * 0.5
    const perpY = Math.sin(angle + Math.PI / 2) * width * 0.5
    ctx.beginPath()
    ctx.moveTo(p0.x + perpX, p0.y + perpY)
    ctx.lineTo(p1.x + perpX, p1.y + perpY)
    ctx.lineTo(p1.x - perpX, p1.y - perpY)
    ctx.lineTo(p0.x - perpX, p0.y - perpY)
    ctx.closePath()
    ctx.fill()
    // Ink bleed dot at endpoint
    if (i === points.length - 1) {
      ctx.beginPath(); ctx.arc(p1.x, p1.y, width * 0.15, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

function drawMarkerStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  size: number,
  opacity: number,
) {
  if (points.length < 1) return
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.strokeStyle = color
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  ctx.lineWidth = size
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
  ctx.restore()
}

function drawWatercolorStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  size: number,
  opacity: number,
) {
  if (points.length < 1) return
  ctx.save()
  ctx.globalAlpha = opacity * 0.4
  // Underlayer: soft blurred blob
  const avgX = points.reduce((s, p) => s + p.x, 0) / points.length
  const avgY = points.reduce((s, p) => s + p.y, 0) / points.length
  const maxDist = Math.max(
    ...points.map(p => Math.sqrt((p.x - avgX)**2 + (p.y - avgY)**2)),
    size * 2,
  )
  const grad = ctx.createRadialGradient(avgX, avgY, 0, avgX, avgY, maxDist)
  grad.addColorStop(0, color)
  grad.addColorStop(0.3, color)
  grad.addColorStop(0.6, ctx.canvas.style.backgroundColor || 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(avgX, avgY, maxDist, 0, Math.PI * 2)
  ctx.fill()
  // Detail: scattered dots for paper texture
  const dotCount = Math.min(30, points.length * 2)
  ctx.fillStyle = color
  ctx.globalAlpha = opacity * 0.6
  for (let i = 0; i < dotCount; i++) {
    const p = points[Math.floor(Math.random() * points.length)]
    const jx = p.x + (Math.random() - 0.5) * size * 0.8
    const jy = p.y + (Math.random() - 0.5) * size * 0.8
    const dotR = Math.random() * size * 0.3 + 1
    ctx.beginPath(); ctx.arc(jx, jy, dotR, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

/* ---- Bead Drawing ---- */

function drawBead(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, r = BEAD_R) {
  // Main circle
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  // Highlight — top-left reflection
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx, cy, r)
  grad.addColorStop(0, 'rgba(255,255,255,0.45)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.08)')
  grad.addColorStop(1, 'rgba(0,0,0,0.15)')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
  // Subtle stroke
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.lineWidth = 0.6
  ctx.stroke()
}

function drawBeadGrid(
  ctx: CanvasRenderingContext2D,
  beadGrid: Record<string, string>,
  w: number,
  h: number,
) {
  // Dim background
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(0, 0, w, h)

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 0.5
  for (let row = 0; row <= BEAD_ROWS; row++) {
    const y = BEAD_OY + row * BEAD_CELL
    ctx.beginPath()
    ctx.moveTo(BEAD_OX, y)
    ctx.lineTo(BEAD_OX + BEAD_COLS * BEAD_CELL, y)
    ctx.stroke()
  }
  for (let col = 0; col <= BEAD_COLS; col++) {
    const x = BEAD_OX + col * BEAD_CELL
    ctx.beginPath()
    ctx.moveTo(x, BEAD_OY)
    ctx.lineTo(x, BEAD_OY + BEAD_ROWS * BEAD_CELL)
    ctx.stroke()
  }

  // Draw placed beads
  for (const [key, color] of Object.entries(beadGrid)) {
    const [row, col] = key.split(',').map(Number)
    const cx = BEAD_OX + col * BEAD_CELL + BEAD_CELL / 2
    const cy = BEAD_OY + row * BEAD_CELL + BEAD_CELL / 2
    drawBead(ctx, cx, cy, color)
  }
}

/* ---- Face Template Drawing ---- */

function drawFaceGuideLines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  const cx = w / 2
  const cy = h / 2
  ctx.beginPath()
  ctx.moveTo(cx, 0)
  ctx.lineTo(cx, h)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, cy)
  ctx.lineTo(w, cy)
  ctx.stroke()
  ctx.restore()
}

function drawJingTemplate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  ctx.save()
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.32, h * 0.42, 0, 0, Math.PI * 2)
  ctx.stroke()
  const eyeY = cy - h * 0.12
  const eyeSpacing = w * 0.16
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.ellipse(cx - eyeSpacing, eyeY, w * 0.06, h * 0.035, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(cx + eyeSpacing, eyeY, w * 0.06, h * 0.035, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 3
  const browY = eyeY - h * 0.055
  ctx.beginPath()
  ctx.moveTo(cx - eyeSpacing - w * 0.04, browY - h * 0.02)
  ctx.lineTo(cx - eyeSpacing, browY - h * 0.04)
  ctx.lineTo(cx + eyeSpacing, browY - h * 0.04)
  ctx.lineTo(cx + eyeSpacing + w * 0.04, browY - h * 0.02)
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - h * 0.03)
  ctx.lineTo(cx, cy + h * 0.06)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy + h * 0.06, w * 0.015, 0, Math.PI, true)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy + h * 0.14, w * 0.1, 0.1, Math.PI - 0.1)
  ctx.stroke()
  ctx.restore()
}

function drawChouTemplate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  ctx.save()
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.30, h * 0.38, 0, 0, Math.PI * 2)
  ctx.stroke()
  const eyeY = cy - h * 0.08
  const eyeSpacing = w * 0.14
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.ellipse(cx - eyeSpacing, eyeY, w * 0.07, h * 0.045, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(cx + eyeSpacing, eyeY, w * 0.07, h * 0.045, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy + h * 0.02, w * 0.025, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy + h * 0.14, w * 0.09, 0.05, Math.PI - 0.05)
  ctx.stroke()
  const dotR = 3
  ctx.fillStyle = '#888'
  ctx.beginPath()
  ctx.arc(cx - eyeSpacing - w * 0.04, cy + h * 0.06, dotR, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + eyeSpacing + w * 0.04, cy + h * 0.06, dotR, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFaceTemplate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  template: TemplateId,
) {
  drawFaceGuideLines(ctx, w, h)
  if (template === 'jing') drawJingTemplate(ctx, w, h)
  else if (template === 'chou') drawChouTemplate(ctx, w, h)
  else if (template === 'guanyu') drawGuanYuTemplate(ctx, w, h)
  else if (template === 'baozheng') drawBaoZhengTemplate(ctx, w, h)
  else if (template === 'caocao') drawCaoCaoTemplate(ctx, w, h)
  else if (template === 'zhangfei') drawZhangFeiTemplate(ctx, w, h)
  else if (template === 'wukong') drawWuKongTemplate(ctx, w, h)
}

/* ---- Character Face Templates ---- */

function drawGuanYuTemplate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2, cy = h / 2
  ctx.save()
  // Face: long oval, heroic
  ctx.strokeStyle = '#c0392b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.30, h * 0.42, 0, 0, Math.PI * 2)
  ctx.stroke()
  // Phoenix eyes (slanted up)
  const eyeY = cy - h * 0.12, es = w * 0.15
  ctx.strokeStyle = '#922b21'
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(cx - es - w*0.04, eyeY + h*0.02); ctx.lineTo(cx - es, eyeY - h*0.02); ctx.lineTo(cx - es + w*0.04, eyeY + h*0.02); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + es - w*0.04, eyeY + h*0.02); ctx.lineTo(cx + es, eyeY - h*0.02); ctx.lineTo(cx + es + w*0.04, eyeY + h*0.02); ctx.stroke()
  // Phoenix eye pupils
  ctx.beginPath(); ctx.arc(cx - es, eyeY, w*0.025, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + es, eyeY, w*0.025, 0, Math.PI*2); ctx.fill()
  // Sweeping eyebrows
  ctx.strokeStyle = '#7b241c'
  ctx.lineWidth = 3
  const by = eyeY - h * 0.06
  ctx.beginPath(); ctx.moveTo(cx - es - w*0.06, by + h*0.01); ctx.quadraticCurveTo(cx - es - w*0.01, by - h*0.04, cx - es + w*0.02, by); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + es - w*0.02, by); ctx.quadraticCurveTo(cx + es + w*0.01, by - h*0.04, cx + es + w*0.06, by + h*0.01); ctx.stroke()
  // Nose
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(cx, cy - h*0.02); ctx.lineTo(cx, cy + h*0.05); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy + h*0.05, w*0.015, 0, Math.PI, true); ctx.stroke()
  // Mouth
  ctx.beginPath(); ctx.arc(cx, cy + h*0.14, w*0.09, 0.05, Math.PI - 0.05); ctx.stroke()
  // Long flowing beard
  ctx.strokeStyle = '#641e16'
  ctx.lineWidth = 2
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(cx + i * w*0.02, cy + h*0.16); ctx.quadraticCurveTo(cx + i * w*0.03, cy + h*0.30, cx + i * w*0.01, cy + h*0.38); ctx.stroke()
  }
  ctx.restore()
}

function drawBaoZhengTemplate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2, cy = h / 2
  ctx.save()
  // Face: square-jawed oval
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.28, h * 0.40, 0, 0, Math.PI * 2)
  ctx.stroke()
  // Crescent moon on forehead
  ctx.strokeStyle = '#bbb'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy - h * 0.16, w * 0.045, Math.PI * 0.3, Math.PI * 0.7)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy - h * 0.16, w * 0.06, Math.PI * 0.3, Math.PI * 0.7)
  ctx.stroke()
  // Eyes: wide, stern
  const eyeY = cy - h * 0.08, es = w * 0.14
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.ellipse(cx - es, eyeY, w*0.05, h*0.03, 0, 0, Math.PI*2); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(cx + es, eyeY, w*0.05, h*0.03, 0, 0, Math.PI*2); ctx.stroke()
  // Pupils
  ctx.fillStyle = '#444'
  ctx.beginPath(); ctx.arc(cx - es, eyeY, w*0.02, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + es, eyeY, w*0.02, 0, Math.PI*2); ctx.fill()
  // Straight stern eyebrows
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 3
  const by = eyeY - h * 0.055
  ctx.beginPath(); ctx.moveTo(cx - es - w*0.04, by); ctx.lineTo(cx - es + w*0.04, by); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + es - w*0.04, by); ctx.lineTo(cx + es + w*0.04, by); ctx.stroke()
  // Nose
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(cx, cy - h*0.02); ctx.lineTo(cx, cy + h*0.05); ctx.stroke()
  // Mouth
  ctx.beginPath(); ctx.arc(cx, cy + h*0.14, w*0.07, 0.1, Math.PI - 0.1); ctx.stroke()
  ctx.restore()
}

function drawCaoCaoTemplate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2, cy = h / 2
  ctx.save()
  // Face: narrow, pale
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.26, h * 0.40, 0, 0, Math.PI * 2)
  ctx.stroke()
  // Narrow cunning eyes
  const eyeY = cy - h * 0.10, es = w * 0.13
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(cx - es - w*0.04, eyeY); ctx.lineTo(cx - es + w*0.04, eyeY); ctx.lineTo(cx - es + w*0.05, eyeY - h*0.01); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + es - w*0.04, eyeY); ctx.lineTo(cx + es + w*0.04, eyeY); ctx.lineTo(cx + es + w*0.05, eyeY - h*0.01); ctx.stroke()
  // Thin eyebrows
  ctx.strokeStyle = '#777'
  ctx.lineWidth = 1.5
  const by = eyeY - h * 0.05
  ctx.beginPath(); ctx.moveTo(cx - es - w*0.02, by); ctx.quadraticCurveTo(cx - es, by - h*0.02, cx - es + w*0.02, by); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + es - w*0.02, by); ctx.quadraticCurveTo(cx + es, by - h*0.02, cx + es + w*0.02, by); ctx.stroke()
  // Nose
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(cx, cy - h*0.02); ctx.lineTo(cx, cy + h*0.04); ctx.stroke()
  // Thin smile
  ctx.beginPath(); ctx.arc(cx, cy + h*0.12, w*0.04, 0.15, Math.PI - 0.15); ctx.stroke()
  // Two-strip mustache
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(cx - w*0.03, cy + h*0.10); ctx.quadraticCurveTo(cx - w*0.08, cy + h*0.14, cx - w*0.10, cy + h*0.16); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + w*0.03, cy + h*0.10); ctx.quadraticCurveTo(cx + w*0.08, cy + h*0.14, cx + w*0.10, cy + h*0.16); ctx.stroke()
  ctx.restore()
}

function drawZhangFeiTemplate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2, cy = h / 2
  ctx.save()
  // Face: wide, round
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.32, h * 0.38, 0, 0, Math.PI * 2)
  ctx.stroke()
  // Bulging fierce eyes
  const eyeY = cy - h * 0.06, es = w * 0.16
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.ellipse(cx - es, eyeY, w*0.065, h*0.04, 0, 0, Math.PI*2); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(cx + es, eyeY, w*0.065, h*0.04, 0, 0, Math.PI*2); ctx.stroke()
  // Huge pupils
  ctx.fillStyle = '#000'
  ctx.beginPath(); ctx.arc(cx - es, eyeY, w*0.03, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + es, eyeY, w*0.03, 0, Math.PI*2); ctx.fill()
  // Bushy fierce eyebrows (upward angry)
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 3.5
  const by = eyeY - h * 0.065
  ctx.beginPath(); ctx.moveTo(cx - es - w*0.05, by); ctx.quadraticCurveTo(cx - es - w*0.01, by - h*0.04, cx - es + w*0.05, by + h*0.01); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + es - w*0.05, by + h*0.01); ctx.quadraticCurveTo(cx + es + w*0.01, by - h*0.04, cx + es + w*0.05, by); ctx.stroke()
  // Nose: broad
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(cx, cy - h*0.02); ctx.lineTo(cx, cy + h*0.04); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy + h*0.04, w*0.02, 0, Math.PI, true); ctx.stroke()
  // Wide fierce mouth (shout/growl)
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(cx, cy + h*0.14, w*0.10, 0.15, Math.PI - 0.15); ctx.stroke()
  // Beard stubble (short marks)
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1.5
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(cx + i * w*0.025, cy + h*0.18); ctx.lineTo(cx + i * w*0.02, cy + h*0.24); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx + i * w*0.025, cy + h*0.14); ctx.lineTo(cx + i * w*0.02, cy + h*0.19); ctx.stroke()
  }
  ctx.restore()
}

function drawWuKongTemplate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2, cy = h / 2
  ctx.save()
  // Face: heart/monkey shape (wider at top, narrower at chin)
  ctx.strokeStyle = '#c08'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.26, h * 0.38, 0, 0, Math.PI * 2)
  ctx.stroke()
  // Monkey cheek fur (round patches on sides)
  ctx.strokeStyle = '#a06'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(cx - w*0.18, cy + h*0.04, w*0.05, 0, Math.PI*2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx + w*0.18, cy + h*0.04, w*0.05, 0, Math.PI*2); ctx.stroke()
  // Eyes: golden round, snappy
  const eyeY = cy - h * 0.10, es = w * 0.12
  ctx.strokeStyle = '#330'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(cx - es, eyeY, w*0.055, h*0.03, 0, 0, Math.PI*2); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(cx + es, eyeY, w*0.055, h*0.03, 0, 0, Math.PI*2); ctx.stroke()
  // Golden pupils
  ctx.fillStyle = '#c90'
  ctx.beginPath(); ctx.arc(cx - es, eyeY, w*0.025, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + es, eyeY, w*0.025, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#420'
  ctx.beginPath(); ctx.arc(cx - es, eyeY, w*0.014, 0, Math.PI*2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx + es, eyeY, w*0.014, 0, Math.PI*2); ctx.stroke()
  // Headpiece / crown
  ctx.strokeStyle = '#e80'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(cx, cy - h*0.24, w*0.04, Math.PI*1.2, Math.PI*1.8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - w*0.04, cy - h*0.28); ctx.lineTo(cx - w*0.01, cy - h*0.32); ctx.lineTo(cx + w*0.01, cy - h*0.32); ctx.lineTo(cx + w*0.04, cy - h*0.28); ctx.stroke()
  // Nose: monkey-like small
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(cx, cy - h*0.01); ctx.lineTo(cx, cy + h*0.025); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy + h*0.025, w*0.012, 0, Math.PI, true); ctx.stroke()
  // Grinning monkey mouth
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(cx, cy + h*0.12, w*0.06, 0.1, Math.PI - 0.1); ctx.stroke()
  // Wrinkle lines on nose bridge
  ctx.strokeStyle = '#c08'
  ctx.lineWidth = 1
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(cx - w*0.03, cy - h*0.05 + i * h*0.015); ctx.lineTo(cx + w*0.03, cy - h*0.05 + i * h*0.015); ctx.stroke()
  }
  ctx.restore()
}

/* ---- Color Wheel ---- */

function hsvToHex(h: number, s: number, v: number): string {
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r = 0, g = 0, b = 0
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

const WHEEL_SIZE = 156

/* ---- ToolButton ---- */

function ToolButton({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${
        active
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          : disabled
            ? 'text-white/20 cursor-not-allowed'
            : 'text-white/60 hover:text-white/80 hover:bg-white/5 border border-transparent'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

/* ---- FaceWorkshop Main ---- */

export default function FaceWorkshop({
  initialTemplate,
  onViewShop,
}: {
  initialTemplate?: string
  onViewShop?: (query: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Mode
  const [mode, setMode] = useState<DrawMode>('freehand')

  // Freehand state
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [brushSize, setBrushSize] = useState(BRUSH_DEFAULT_SIZE)
  const [isEraser, setIsEraser] = useState(false)
  const [strokeCount, setStrokeCount] = useState(0)

  // Bead state
  const [beadGrid, setBeadGrid] = useState<Record<string, string>>({})
  const [beadHistory, setBeadHistory] = useState<Record<string, string>[]>([])

  // Shared
  const [selectedColor, setSelectedColor] = useState('#CC0000')
  const [customColors, setCustomColors] = useState<string[]>([])
  const [symmetric, setSymmetric] = useState(false)
  const [template, setTemplate] = useState<TemplateId>('blank')

  // Color picker ref
  const colorInputRef = useRef<HTMLInputElement>(null)

  // Complex mode
  const [complexTool, setComplexTool] = useState<ComplexTool>('brush')
  const [opacity, setOpacity] = useState(COMPLEX_OPACITY_DEFAULT)
  const [symmetry4, setSymmetry4] = useState(false)
  const complexToolRef = useRef(complexTool)
  complexToolRef.current = complexTool
  const opacityRef = useRef(opacity)
  opacityRef.current = opacity
  const symmetry4Ref = useRef(symmetry4)
  symmetry4Ref.current = symmetry4

  // AI state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{ area: string; color: string; note: string }[]>([])
  const [aiError, setAiError] = useState('')

  // Color wheel
  const wheelRef = useRef<HTMLCanvasElement>(null)
  const wheelIndicatorRef = useRef<HTMLCanvasElement>(null)
  const [wheelHsv, setWheelHsv] = useState(() => hexToHsv('#CC0000'))
  const [brightness, setBrightness] = useState(1)

  // Refs for canvas drawing
  const modeRef = useRef(mode)
  modeRef.current = mode
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  const beadGridRef = useRef(beadGrid)
  beadGridRef.current = beadGrid
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<Stroke | null>(null)
  const symmetricRef = useRef(symmetric)
  symmetricRef.current = symmetric
  const brushSizeRef = useRef(brushSize)
  brushSizeRef.current = brushSize
  const isEraserRef = useRef(isEraser)
  isEraserRef.current = isEraser
  const selectedColorRef = useRef(selectedColor)
  selectedColorRef.current = selectedColor
  const templateRef = useRef(template)
  templateRef.current = template

  // Offscreen buffer canvas — caches background (template + completed strokes)
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const updateBuffer = useCallback(() => {
    let buf = bufferRef.current
    if (!buf) {
      buf = document.createElement('canvas')
      buf.width = CANVAS_SIZE
      buf.height = CANVAS_SIZE
      bufferRef.current = buf
    }
    const bctx = buf.getContext('2d')!
    bctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    drawFaceTemplate(bctx, CANVAS_SIZE, CANVAS_SIZE, templateRef.current)
    for (const s of strokesRef.current) {
      drawStroke(bctx, s.points, s.color, s.size, s.isEraser)
    }
  }, [])

  /* ---- Color wheel render & events ---- */

  useEffect(() => {
    const canvas = wheelRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, cx = w / 2, cy = w / 2, r = w / 2 - 2
    const img = ctx.createImageData(w, w)
    for (let y = 0; y < w; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= r) {
          const hue = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)
          const sat = Math.min(dist / r, 1)
          const hex = hsvToHex(hue, sat, 1)
          const ri = parseInt(hex.slice(1,3), 16), gi = parseInt(hex.slice(3,5), 16), bi = parseInt(hex.slice(5,7), 16)
          const px = (y * w + x) * 4
          img.data[px] = ri; img.data[px+1] = gi; img.data[px+2] = bi; img.data[px+3] = 255
        }
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [])

  // Draw wheel indicator
  useEffect(() => {
    const canvas = wheelIndicatorRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, cx = w / 2, cy = w / 2, r = w / 2 - 2
    ctx.clearRect(0, 0, w, w)
    const angle = wheelHsv.h * Math.PI * 2 - Math.PI
    const dist = wheelHsv.s * r
    const ix = cx + Math.cos(angle) * dist
    const iy = cy + Math.sin(angle) * dist
    // Outer ring
    ctx.beginPath()
    ctx.arc(ix, iy, 6, 0, Math.PI * 2)
    ctx.fillStyle = 'white'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
    // Inner dot
    ctx.beginPath()
    ctx.arc(ix, iy, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fill()
  }, [wheelHsv])

  const getWheelHsv = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = wheelRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    const w = canvas.width, cx = w / 2, cy = w / 2, r = w / 2 - 2
    const dx = x - cx, dy = y - cy
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), r)
    const hue = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)
    const sat = dist / r
    return { h: hue, s: sat, v: brightness }
  }, [brightness])

  const onWheelPointer = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = wheelRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const hsv = getWheelHsv(e)
    const dist = Math.sqrt(Math.pow(e.clientX - canvas.getBoundingClientRect().left - canvas.width/2 * (canvas.width/canvas.getBoundingClientRect().width), 2) + Math.pow(e.clientY - canvas.getBoundingClientRect().top - canvas.height/2 * (canvas.height/canvas.getBoundingClientRect().height), 2))
    const scaledR = (canvas.width/2 - 2) * (canvas.width/canvas.getBoundingClientRect().width)
    if (dist <= scaledR + 10) {
      setWheelHsv(hsv)
      const hex = hsvToHex(hsv.h, hsv.s, hsv.v)
      setSelectedColor(hex)
      setCustomColors((prev) => {
        const filtered = prev.filter((c) => c !== hex)
        return [hex, ...filtered].slice(0, 8)
      })
      if (colorInputRef.current) colorInputRef.current.value = hex
      if (mode === 'freehand') setIsEraser(false)
    }
  }, [getWheelHsv, mode])

  /* ---- Redraw ---- */

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    if (modeRef.current === 'bead') {
      // Template as guide
      drawFaceTemplate(ctx, w, h, templateRef.current)
      // Beads on top
      drawBeadGrid(ctx, beadGridRef.current, w, h)
    } else {
      drawFaceTemplate(ctx, w, h, templateRef.current)
      for (const s of strokesRef.current) {
        drawStroke(ctx, s.points, s.color, s.size, s.isEraser)
      }
    }
  }, [])

  useEffect(() => {
    updateBuffer()
    redraw()
  }, [template, mode, redraw, updateBuffer])

  // React to external navigation — select template when navigated from map
  useEffect(() => {
    if (initialTemplate && initialTemplate !== templateRef.current) {
      strokesRef.current = []
      setStrokes([])
      setStrokeCount(0)
      beadGridRef.current = {}
      setBeadGrid({})
      setBeadHistory([])
      setTemplate(initialTemplate as TemplateId)
    }
  }, [initialTemplate])

  /* ---- Bead click handler ---- */

  const getCell = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) * (canvas.width / r.width)
    const y = (e.clientY - r.top) * (canvas.height / r.height)
    const col = Math.floor((x - BEAD_OX) / BEAD_CELL)
    const row = Math.floor((y - BEAD_OY) / BEAD_CELL)
    if (col < 0 || col >= BEAD_COLS || row < 0 || row >= BEAD_ROWS) return null
    return { row, col, key: `${row},${col}` }
  }

  const handleBeadPointerDown = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    const cell = getCell(e)
    if (!cell) return
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    const color = selectedColorRef.current
    setBeadGrid((prev) => {
      const next = { ...prev }
      if (next[cell.key]) {
        delete next[cell.key]
      } else {
        next[cell.key] = color
      }
      beadGridRef.current = next
      return next
    })
    redraw()
  }, [redraw])

  const handleBeadPointerMove = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    // Only draw if pointer is captured (button held down)
    const canvas = canvasRef.current
    if (!canvas) return
    // Check if pointer is captured via the pointer event's buttons
    if (e.buttons !== 1) return
    const cell = getCell(e)
    if (!cell) return
    const color = selectedColorRef.current
    setBeadGrid((prev) => {
      const next = { ...prev }
      next[cell.key] = color
      beadGridRef.current = next
      return next
    })
    redraw()
  }, [redraw])

  /* ---- Freehand pointer handlers ---- */

  const getPoint = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    }
  }

  const handlePointerDown = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const pt = getPoint(e)
    const color = isEraserRef.current ? '#000000' : selectedColorRef.current
    const size = isEraserRef.current ? ERASER_DEFAULT_SIZE : brushSizeRef.current
    const stroke: Stroke = { points: [pt], color, size, isEraser: isEraserRef.current }
    currentStrokeRef.current = stroke
    isDrawingRef.current = true
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return
    const pt = getPoint(e)
    const cs = currentStrokeRef.current
    cs.points = [...cs.points, pt]
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height
    // Draw buffer (template + completed strokes) then overlay current stroke
    const buf = bufferRef.current
    if (buf) {
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(buf, 0, 0)
    } else {
      ctx.clearRect(0, 0, w, h)
      drawFaceTemplate(ctx, w, h, templateRef.current)
      for (const s of strokesRef.current) {
        drawStroke(ctx, s.points, s.color, s.size, s.isEraser)
      }
    }
    // Draw current stroke with appropriate brush style
    const ct = complexToolRef.current
    if (ct === 'calligraphy') {
      drawCalligraphyStroke(ctx, cs.points, cs.color, cs.size, opacityRef.current)
    } else if (ct === 'marker') {
      drawMarkerStroke(ctx, cs.points, cs.color, cs.size, opacityRef.current)
    } else if (ct === 'watercolor') {
      drawWatercolorStroke(ctx, cs.points, cs.color, cs.size, opacityRef.current)
    } else {
      drawStroke(ctx, cs.points, cs.color, cs.size, cs.isEraser)
    }
    if (symmetricRef.current) {
      const cx = w / 2
      const reflected = cs.points.map((p) => ({ x: cx + (cx - p.x), y: p.y }))
      if (ct === 'calligraphy') {
        drawCalligraphyStroke(ctx, reflected, cs.color, cs.size, opacityRef.current)
      } else if (ct === 'marker') {
        drawMarkerStroke(ctx, reflected, cs.color, cs.size, opacityRef.current)
      } else if (ct === 'watercolor') {
        drawWatercolorStroke(ctx, reflected, cs.color, cs.size, opacityRef.current)
      } else {
        drawStroke(ctx, reflected, cs.color, cs.size, cs.isEraser)
      }
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return
    isDrawingRef.current = false
    const final = { ...currentStrokeRef.current, points: [...currentStrokeRef.current.points] }
    currentStrokeRef.current = null
    let newStrokes: Stroke[]
    if (symmetricRef.current) {
      const cx = canvasRef.current!.width / 2
      const reflectedPoints = final.points.map((p) => ({ x: cx + (cx - p.x), y: p.y }))
      const reflected: Stroke = { points: reflectedPoints, color: final.color, size: final.size, isEraser: final.isEraser }
      newStrokes = [...strokesRef.current, final, reflected]
    } else {
      newStrokes = [...strokesRef.current, final]
    }
    strokesRef.current = newStrokes
    setStrokes(newStrokes)
    setStrokeCount((c) => c + 1)
    updateBuffer()
    redraw()
  }, [redraw, updateBuffer])

  /* ---- Complex mode fill ---- */

  const handleFillDown = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    const pt = getPoint(e)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    floodFill(ctx, pt.x, pt.y, selectedColorRef.current, COMPLEX_FILL_TOLERANCE)
  }, [])

  /* ---- Complex mode spray ---- */

  const sprayPointsRef = useRef<Point[]>([])

  const handleSprayDown = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const pt = getPoint(e)
    sprayPointsRef.current = [pt]
    isDrawingRef.current = true
    const ctx = canvas.getContext('2d')!
    drawSpray(ctx, pt.x, pt.y, selectedColorRef.current, COMPLEX_SPRAY_RADIUS, opacityRef.current)
    if (symmetricRef.current) {
      drawSpray(ctx, canvas.width - pt.x, pt.y, selectedColorRef.current, COMPLEX_SPRAY_RADIUS, opacityRef.current)
    }
    if (symmetry4Ref.current) {
      drawSpray(ctx, pt.x, canvas.height - pt.y, selectedColorRef.current, COMPLEX_SPRAY_RADIUS, opacityRef.current)
      drawSpray(ctx, canvas.width - pt.x, canvas.height - pt.y, selectedColorRef.current, COMPLEX_SPRAY_RADIUS, opacityRef.current)
    }
  }, [])

  const handleSprayMove = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const pt = getPoint(e)
    const last = sprayPointsRef.current[sprayPointsRef.current.length - 1]
    const steps = Math.max(1, Math.round(Math.sqrt((pt.x - last.x) ** 2 + (pt.y - last.y) ** 2) / 3))
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const ix = last.x + (pt.x - last.x) * t
      const iy = last.y + (pt.y - last.y) * t
      drawSpray(ctx, ix, iy, selectedColorRef.current, COMPLEX_SPRAY_RADIUS, opacityRef.current)
      if (symmetricRef.current) {
        drawSpray(ctx, canvas.width - ix, iy, selectedColorRef.current, COMPLEX_SPRAY_RADIUS, opacityRef.current)
      }
      if (symmetry4Ref.current) {
        drawSpray(ctx, ix, canvas.height - iy, selectedColorRef.current, COMPLEX_SPRAY_RADIUS, opacityRef.current)
        drawSpray(ctx, canvas.width - ix, canvas.height - iy, selectedColorRef.current, COMPLEX_SPRAY_RADIUS, opacityRef.current)
      }
    }
    sprayPointsRef.current.push(pt)
  }, [])

  const handleSprayUp = useCallback(() => {
    isDrawingRef.current = false
    sprayPointsRef.current = []
  }, [])

  /* ---- Canvas event dispatch ---- */

  const onCanvasPointerDown = mode === 'bead' ? handleBeadPointerDown
    : mode === 'complex' && complexTool === 'fill' ? handleFillDown
    : mode === 'complex' && complexTool === 'spray' ? handleSprayDown
    : handlePointerDown
  const onCanvasPointerMove = mode === 'bead' ? handleBeadPointerMove
    : mode === 'complex' && complexTool === 'spray' ? handleSprayMove
    : handlePointerMove
  const onCanvasPointerUp = mode === 'bead' ? undefined
    : mode === 'complex' && complexTool === 'spray' ? handleSprayUp
    : handlePointerUp

  /* ---- Actions ---- */

  const undo = useCallback(() => {
    if (mode === 'bead') {
      if (beadHistory.length === 0) {
        // Quick undo: revert last placed cells by removing everything and restoring previous state
        // Actually simpler: store history snapshots
        setBeadGrid((prev) => {
          const keys = Object.keys(prev)
          if (keys.length === 0) return prev
          const lastKey = keys[keys.length - 1]
          const next = { ...prev }
          delete next[lastKey]
          beadGridRef.current = next
          return next
        })
        redraw()
      }
    } else {
      if (strokesRef.current.length === 0) return
      const count = symmetricRef.current ? 2 : 1
      const newStrokes = strokesRef.current.slice(0, -count)
      strokesRef.current = newStrokes
      setStrokes(newStrokes)
      setStrokeCount((c) => Math.max(0, c - 1))
      updateBuffer()
      redraw()
    }
  }, [mode, redraw, updateBuffer])

  const clearCanvas = useCallback(() => {
    if (mode === 'bead') {
      beadGridRef.current = {}
      setBeadGrid({})
      setBeadHistory([])
    } else {
      strokesRef.current = []
      setStrokes([])
      setStrokeCount(0)
    }
    updateBuffer()
    redraw()
  }, [mode, redraw, updateBuffer])

  const switchMode = useCallback((m: DrawMode) => {
    if (m === modeRef.current) return
    setMode(m)
    // Clear on mode switch
    strokesRef.current = []
    setStrokes([])
    setStrokeCount(0)
    beadGridRef.current = {}
    setBeadGrid({})
    setBeadHistory([])
  }, [])

  const changeTemplate = useCallback((t: TemplateId) => {
    if (t === templateRef.current) return
    strokesRef.current = []
    setStrokes([])
    setStrokeCount(0)
    beadGridRef.current = {}
    setBeadGrid({})
    setBeadHistory([])
    setTemplate(t)
  }, [])

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `faceworkshop-${templateRef.current}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  /* ---- AI ---- */

  const handleAiGenerate = useCallback(async () => {
    const prompt = aiPrompt.trim()
    if (!prompt) return
    setAiLoading(true)
    setAiError('')
    try {
      const templateName = templateRef.current === 'jing' ? '净角' :
        templateRef.current === 'chou' ? '丑角' :
        templateRef.current === 'guanyu' ? '关羽' :
        templateRef.current === 'baozheng' ? '包拯' :
        templateRef.current === 'caocao' ? '曹操' :
        templateRef.current === 'zhangfei' ? '张飞' :
        templateRef.current === 'wukong' ? '悟空' : '空白'
      const systemPrompt = `你是一个中国戏曲脸谱配色专家。用户描述想要的风格，你返回JSON数组建议。每个建议包含：area(面部区域名), color(十六进制色码), note(为什么用这个颜色，一句话)。最多5条。格式：[{"area":"额头","color":"#CC0000","note":"正红色象征忠勇"}]`
      const text = await requestAiChat({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `当前底版：${templateName}。用户需求：${prompt}` },
          ],
        temperature: 0.8,
        maxTokens: 800,
      })

      if (!text) {
        setAiError('请先配置 AI 代理服务')
        setAiLoading(false)
        return
      }

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        setAiSuggestions(parsed.slice(0, 5))
      } else {
        setAiError('AI 返回格式异常')
      }
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : '请求失败')
    }
    setAiLoading(false)
  }, [aiPrompt])

  const handleAiPaintFace = useCallback(() => {
    const text = aiPrompt.trim()
    const hasAny = (words: string[]) => words.some(word => text.includes(word))
    const picked: TemplateId =
      hasAny(['\u5173\u7fbd', '\u5173\u516c', '\u5fe0', '\u7ea2', '\u4e49']) ? 'guanyu' :
      hasAny(['\u5305\u62ef', '\u5305\u516c', '\u9ed1', '\u521a\u6b63', '\u516c\u6b63']) ? 'baozheng' :
      hasAny(['\u66f9\u64cd', '\u767d', '\u5978', '\u7591']) ? 'caocao' :
      hasAny(['\u5f20\u98de', '\u731b', '\u6012', '\u52c7']) ? 'zhangfei' :
      hasAny(['\u609f\u7a7a', '\u7334', '\u7075', '\u91d1']) ? 'wukong' :
      hasAny(['\u4e11', '\u559c', '\u6ed1\u7a3d']) ? 'chou' :
      templateRef.current === 'blank' ? 'jing' : templateRef.current

    const style =
      hasAny(['\u534e\u4e3d', '\u91d1', '\u5bcc\u8d35', '\u5bab\u5ef7']) ? 'gold' :
      hasAny(['\u6218', '\u6b66', '\u70c8', '\u9738']) ? 'battle' :
      hasAny(['\u6c34', '\u67d4', '\u96c5', '\u9752\u8863']) ? 'soft' :
      hasAny(['\u795e', '\u5996', '\u5e7b', '\u7075']) ? 'myth' :
      'classic'

    setMode('complex')
    setTemplate(picked)
    templateRef.current = picked
    strokesRef.current = []
    setStrokes([])
    setStrokeCount(0)
    setAiError('')

    const canvas = canvasRef.current
    if (!canvas) return
    updateBuffer()
    const targets = [canvas, bufferRef.current].filter(Boolean) as HTMLCanvasElement[]
    const palettes: Record<string, string[]> = {
      guanyu: ['#CC0000', '#1A1A1A', '#C8922A', '#F5E6C8'],
      baozheng: ['#101010', '#E8E8E8', '#C8922A', '#8B1E1E'],
      caocao: ['#F1EEE8', '#1A1A1A', '#E87777', '#6B7280'],
      zhangfei: ['#111111', '#E8E8E8', '#CC0000', '#DDB800'],
      wukong: ['#CC0000', '#C8922A', '#1A1A1A', '#E87777'],
      chou: ['#F8F1E4', '#CC0000', '#1A1A1A', '#DDB800'],
      jing: ['#CC0000', '#0055AA', '#1A1A1A', '#DDB800'],
      blank: ['#CC0000', '#1A1A1A', '#DDB800', '#F8F1E4'],
    }
    const palette = palettes[picked] || palettes.jing

    const drawSymmetric = (ctx: CanvasRenderingContext2D, draw: () => void) => {
      draw()
      ctx.save()
      ctx.translate(CANVAS_SIZE, 0)
      ctx.scale(-1, 1)
      draw()
      ctx.restore()
    }

    targets.forEach(target => {
      const ctx = target.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      drawFaceTemplate(ctx, CANVAS_SIZE, CANVAS_SIZE, picked)
      ctx.save()
      ctx.globalAlpha = 0.88
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = style === 'soft' ? 14 : 20
      ctx.strokeStyle = palette[0]
      ctx.beginPath()
      ctx.moveTo(300, 118)
      ctx.bezierCurveTo(245, 160, 238, 252, 300, 322)
      ctx.bezierCurveTo(362, 252, 355, 160, 300, 118)
      ctx.stroke()

      drawSymmetric(ctx, () => {
        ctx.strokeStyle = palette[1]
        ctx.lineWidth = style === 'battle' ? 16 : 11
        ctx.beginPath()
        ctx.moveTo(202, 222)
        ctx.bezierCurveTo(232, 204, 267, 214, 292, 250)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(194, 300)
        ctx.bezierCurveTo(230, 282, 266, 290, 300, 326)
        ctx.stroke()
      })

      ctx.strokeStyle = palette[2]
      ctx.lineWidth = style === 'gold' ? 10 : 7
      ctx.beginPath()
      if (style === 'myth' || picked === 'wukong') {
        ctx.arc(300, 106, 42, Math.PI * 0.12, Math.PI * 0.88)
        ctx.moveTo(258, 138)
        ctx.bezierCurveTo(280, 160, 320, 160, 342, 138)
      } else if (style === 'battle' || picked === 'zhangfei') {
        ctx.moveTo(246, 112)
        ctx.lineTo(300, 72)
        ctx.lineTo(354, 112)
        ctx.moveTo(266, 140)
        ctx.lineTo(334, 140)
      } else {
        ctx.moveTo(300, 76)
        ctx.lineTo(330, 140)
        ctx.lineTo(300, 124)
        ctx.lineTo(270, 140)
        ctx.closePath()
      }
      ctx.stroke()

      drawSymmetric(ctx, () => {
        ctx.strokeStyle = palette[3]
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(214, 360)
        ctx.bezierCurveTo(240, 382, 272, 384, 300, 360)
        ctx.stroke()
      })
      ctx.restore()
    })
  }, [aiPrompt, updateBuffer])

  /* ---- Render ---- */

  const currentColor = FACE_COLORS.find((c) => c.hex === selectedColor)
  const beadCount = useMemo(() => Object.keys(beadGrid).length, [beadGrid])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 flex-wrap"
      >
        {/* Mode switch */}
        <div className="flex items-center gap-0.5 mr-1 glass-panel rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => switchMode('freehand')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
              mode === 'freehand'
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Paintbrush className="w-4 h-4" />
            <span className="hidden sm:inline">手绘</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('bead')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
              mode === 'bead'
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">拼豆</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('complex')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
              mode === 'complex'
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <span className="text-base">⚙</span>
            <span className="hidden sm:inline">复杂</span>
          </button>
        </div>

        <ToolButton
          icon={<Undo2 className="w-4 h-4" />}
          label="撤销"
          disabled={mode === 'freehand' ? strokes.length === 0 : beadCount === 0}
          onClick={undo}
        />
        <ToolButton
          icon={<RotateCcw className="w-4 h-4" />}
          label="清空"
          disabled={mode === 'freehand' ? strokes.length === 0 : beadCount === 0}
          onClick={clearCanvas}
        />

        {mode === 'complex' && (
          <>
            <div className="flex items-center gap-0.5 mr-0.5 glass-panel rounded-xl p-0.5">
              {(['brush', 'calligraphy', 'marker', 'watercolor'] as ComplexTool[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setComplexTool(t)}
                  className={`px-2 py-1.5 rounded-lg text-xs transition-all ${
                    complexTool === t
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                  title={t === 'brush' ? '圆笔' : t === 'calligraphy' ? '书法' : t === 'marker' ? '马克' : '水彩'}
                >
                  {t === 'brush' ? '⚫' : t === 'calligraphy' ? '✒' : t === 'marker' ? '▬' : '💧'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 mr-0.5 glass-panel rounded-xl p-0.5">
              {(['fill', 'spray'] as ComplexTool[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setComplexTool(t)}
                  className={`px-2 py-1.5 rounded-lg text-xs transition-all ${
                    complexTool === t
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                  title={t === 'fill' ? '填充' : '喷枪'}
                >
                  {t === 'fill' ? '▣' : '◌'}
                </button>
              ))}
            </div>
            {/* Opacity Slider */}
            <div className="flex items-center gap-1.5 px-2">
              <label className="text-[10px] text-white/30">不透明</label>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-16 h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgba(255,255,255,0.1), ${selectedColor})`,
                  accentColor: selectedColor,
                }}
              />
            </div>
            {/* Symmetry toggles */}
            <ToolButton
              icon={<span className={`text-base ${symmetric ? '' : 'opacity-40'}`}>⚋</span>}
              label="↔对称"
              active={symmetric}
              onClick={() => setSymmetric((s) => !s)}
            />
            <ToolButton
              icon={<span className={`text-base ${symmetry4 ? '' : 'opacity-40'}`}>⊞</span>}
              label="四向"
              active={symmetry4}
              onClick={() => setSymmetry4((s) => !s)}
            />
          </>
        )}

        {mode === 'freehand' && (
          <>
            <ToolButton
              icon={<span className={`text-base ${symmetric ? '' : 'opacity-40'}`}>⚋</span>}
              label="对称"
              active={symmetric}
              onClick={() => setSymmetric((s) => !s)}
            />
            <ToolButton
              icon={<Minus className="w-4 h-4" />}
              label="减小"
              disabled={brushSize <= BRUSH_MIN_SIZE}
              onClick={() => setBrushSize((s) => Math.max(BRUSH_MIN_SIZE, s - 2))}
            />
            <ToolButton
              icon={<Plus className="w-4 h-4" />}
              label="增大"
              disabled={brushSize >= BRUSH_MAX_SIZE}
              onClick={() => setBrushSize((s) => Math.min(BRUSH_MAX_SIZE, s + 2))}
            />
            <ToolButton
              icon={isEraser ? <Paintbrush className="w-4 h-4" /> : <Eraser className="w-4 h-4" />}
              label={isEraser ? '画笔' : '橡皮'}
              active={isEraser}
              onClick={() => setIsEraser((e) => !e)}
            />
          </>
        )}

        <ToolButton
          icon={<Download className="w-4 h-4" />}
          label="导出"
          onClick={exportPng}
        />
        {onViewShop && template !== 'blank' && (
          <ToolButton
            icon={<ShoppingBag className="w-4 h-4" />}
            label="文创"
            onClick={() => onViewShop(
              template === 'jing' ? '脸谱' :
              template === 'chou' ? '丑角' :
              template === 'guanyu' ? '关羽' :
              template === 'baozheng' ? '包拯' :
              template === 'caocao' ? '曹操' :
              template === 'zhangfei' ? '张飞' : '悟空'
            )}
          />
        )}
      </motion.div>

      {/* Canvas + Controls Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-xl p-3 flex-shrink-0"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            className={`w-full max-w-[600px] rounded-lg ${
              mode === 'bead' ? 'cursor-pointer' : 'cursor-crosshair'
            }`}
            style={{ touchAction: 'none', background: 'rgba(255,255,255,0.05)' }}
          />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {TEMPLATE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => changeTemplate(opt.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  template === opt.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-white/40 hover:text-white/60 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleAiPaintFace}
              className="ml-auto rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-200 transition-all hover:bg-amber-500/30"
            >
              AI生成脸谱
            </button>
          </div>

          {/* Role info card */}
          {template !== 'blank' && TEMPLATE_INFO[template] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/5"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-amber-400/80 font-medium">
                  {TEMPLATE_INFO[template].role}
                </span>
                <span className="text-[10px] text-white/30">
                  {TEMPLATE_INFO[template].play}
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-1.5">
                {TEMPLATE_INFO[template].desc}
              </p>
              <p className="text-[10px] text-amber-300/50 leading-relaxed">
                💡 {TEMPLATE_INFO[template].tip}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Side Panel */}
        <div className="flex flex-col gap-3 min-w-[180px]">
          {/* Color Palette */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-xl p-3"
          >
            <h3 className="text-xs text-white/40 font-medium mb-2 tracking-wide">
              {mode === 'bead' ? '豆色' : '色板'}
            </h3>
            <div className="grid grid-cols-5 gap-1.5">
              {FACE_COLORS.map((c) => (
                <motion.button
                  key={c.hex}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSelectedColor(c.hex)
                    setWheelHsv(hexToHsv(c.hex))
                    if (mode === 'freehand') setIsEraser(false)
                  }}
                  title={`${c.name} — ${c.meaning}`}
                  className={`w-7 h-7 rounded-lg transition-all border-2 ${
                    selectedColor === c.hex
                      ? 'border-white/80 scale-110 shadow-lg'
                      : 'border-transparent hover:border-white/30'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              {/* Custom color picker trigger */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => colorInputRef.current?.click()}
                title="自定义颜色"
                className="w-7 h-7 rounded-lg border-2 border-dashed border-white/20 hover:border-white/50 transition-all flex items-center justify-center"
              >
                <Palette className="w-3.5 h-3.5 text-white/40" />
              </motion.button>
              <input
                ref={colorInputRef}
                type="color"
                className="sr-only"
                value={selectedColor}
                onChange={(e) => {
                  const hex = e.target.value
                  setSelectedColor(hex)
                  setWheelHsv(hexToHsv(hex))
                  setCustomColors((prev) => {
                    const filtered = prev.filter((c) => c !== hex)
                    return [hex, ...filtered].slice(0, 8)
                  })
                  if (mode === 'freehand') setIsEraser(false)
                }}
              />
              {/* Recent custom colors */}
              {customColors.map((hex) => (
                <motion.button
                  key={hex}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSelectedColor(hex)
                    setWheelHsv(hexToHsv(hex))
                    if (mode === 'freehand') setIsEraser(false)
                  }}
                  title={hex}
                  className={`w-7 h-7 rounded-lg transition-all border-2 ${
                    selectedColor === hex
                      ? 'border-white/80 scale-110 shadow-lg'
                      : 'border-transparent hover:border-white/30'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            {currentColor ? (
              <p className="text-xs text-white/50 mt-2">
                <span className="text-white/80">{currentColor.name}</span>
                {' · '}
                {currentColor.meaning}
              </p>
            ) : (
              <p className="text-xs text-white/50 mt-2">
                自定义 · {selectedColor}
              </p>
            )}
          </motion.div>

          {/* Color Wheel */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-panel rounded-xl p-3"
          >
            <h3 className="text-xs text-white/40 font-medium mb-2 tracking-wide">色环</h3>
            <div className="relative mx-auto" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
              <canvas
                ref={wheelRef}
                width={WHEEL_SIZE}
                height={WHEEL_SIZE}
                className="absolute inset-0 rounded-full"
              />
              <canvas
                ref={wheelIndicatorRef}
                width={WHEEL_SIZE}
                height={WHEEL_SIZE}
                onPointerDown={onWheelPointer}
                onPointerMove={(e) => {
                  if (e.buttons === 1) onWheelPointer(e)
                }}
                className="absolute inset-0 rounded-full cursor-crosshair"
                style={{ touchAction: 'none' }}
              />
            </div>
            {/* Brightness slider */}
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={brightness}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setBrightness(v)
                const newHsv = { ...wheelHsv, v }
                setWheelHsv(newHsv)
                setSelectedColor(hsvToHex(newHsv.h, newHsv.s, v))
                if (mode === 'freehand') setIsEraser(false)
              }}
              className="w-full mt-2 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #000, ${hsvToHex(wheelHsv.h, wheelHsv.s, 1)})`,
                accentColor: selectedColor,
              }}
            />
          </motion.div>

          {/* AI Color Suggestions - Complex Mode Only */}
          {mode === 'complex' && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel rounded-xl p-3"
            >
              <h3 className="text-xs text-white/40 font-medium mb-2 tracking-wide">AI 配色</h3>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="描述想要的风格..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 placeholder-white/20 outline-none focus:border-amber-500/40 transition-colors"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !aiLoading) handleAiGenerate() }}
                />
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    aiLoading
                      ? 'bg-amber-500/10 text-amber-500/50 cursor-wait'
                      : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  }`}
                >
                  {aiLoading ? '...' : '生成'}
                </button>
              </div>
              {aiError && (
                <p className="text-[10px] text-red-400/70 mt-1.5">{aiError}</p>
              )}
              {aiSuggestions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {aiSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedColor(s.color)
                        setWheelHsv(hexToHsv(s.color))
                      }}
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <span
                        className="w-5 h-5 rounded-md shrink-0 border border-white/10"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-[11px] text-white/60 leading-tight">
                        <span className="text-white/80">{s.area}</span>
                        {' · '}
                        {s.note}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!aiError && aiSuggestions.length === 0 && !aiLoading && (
                <p className="text-[10px] text-white/20 mt-1.5">输入描述后点击「生成」获取配色建议</p>
              )}
            </motion.div>
          )}

          {/* Tips */}
          <div className="glass-panel rounded-xl p-3">
            <h3 className="text-xs text-white/50 font-medium mb-1 tracking-wide">操作提示</h3>
            <ul className="text-xs text-white/40 space-y-1 leading-relaxed">
              {mode === 'bead' ? (
                <>
                  <li>• 点击网格放置豆子</li>
                  <li>• 按住拖动连续铺豆</li>
                  <li>• 再次点击已铺的豆子可移除</li>
                  <li>• 点击🎨图标打开自定义调色盘</li>
                  <li>• 切换底版作为参考线</li>
                </>
              ) : mode === 'complex' ? (
                <>
                  <li>• 笔刷：自由绘制，支持透明度和对称</li>
                  <li>• 填充：点击封闭区域注色</li>
                  <li>• 喷枪：拖动散布色点，适合晕染</li>
                  <li>• 四向对称：水平+垂直镜像</li>
                  <li>• 导出为透明背景 PNG</li>
                </>
              ) : (
                <>
                  <li>• 打开"对称"可左右镜像绘制</li>
                  <li>• 选底版后沿着参考线铺色</li>
                  <li>• 点击🎨或色环调出自定色</li>
                  <li>• 导出为透明背景 PNG</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-4 text-xs text-white/40 px-1"
      >
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ backgroundColor: mode === 'bead' || !isEraser ? selectedColor : '#ffffff' }}
          />
          {mode === 'bead'
            ? `拼豆模式 · ${currentColor?.name ?? selectedColor}`
            : isEraser
              ? '橡皮擦'
              : currentColor
                ? `${currentColor.name} · ${currentColor.meaning}`
                : `自定义 · ${selectedColor}`}
        </span>
        <span>|</span>
        {mode === 'freehand' ? (
          <>
            <span>画笔 · {brushSize}px</span>
            <span>|</span>
            <span>对称: {symmetric ? '开' : '关'}</span>
            <span>|</span>
            <span>{strokeCount} 笔</span>
          </>
        ) : mode === 'complex' ? (
          <>
            <span>{complexTool === 'brush' ? '笔刷' : complexTool === 'fill' ? '填充' : '喷枪'} · {Math.round(opacity * 100)}%</span>
            <span>|</span>
            <span>对称二: {symmetric ? '开' : '关'}</span>
            <span>|</span>
            <span>四向: {symmetry4 ? '开' : '关'}</span>
          </>
        ) : (
          <>
            <span>{BEAD_COLS}×{BEAD_ROWS} 网格</span>
            <span>|</span>
            <span>{beadCount} 颗豆</span>
          </>
        )}
      </motion.div>
    </div>
  )
}
