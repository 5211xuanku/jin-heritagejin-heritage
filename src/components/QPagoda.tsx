import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ──────────────────── 应县木塔（五层八角）────────────────────
// 缩小放左下角

function cyl(rTop: number, rBot: number, h: number, seg: number, color: number): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg)
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 })
  const m = new THREE.Mesh(geo, mat); m.castShadow = true
  return m
}

function plate(rOut: number, rIn: number, h: number, color: number): THREE.Mesh {
  const shape = new THREE.Shape()
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8
    ;(i === 0 ? shape.moveTo : shape.lineTo).call(shape, Math.cos(a) * rOut, Math.sin(a) * rOut)
  }
  const hole = new THREE.Path()
  for (let i = 8; i >= 0; i--) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8
    hole.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn)
  }
  shape.holes.push(hole)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false })
  geo.translate(0, 0, -h / 2)
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 }))
}

/** Build mezzanine (平座) — balcony between floors */
function buildMezzanine(opts: {
  baseR: number; deckH: number; railH: number; colorDeck: number; colorRail: number
  zOffset: number
}) {
  const g = new THREE.Group()
  // Deck ring
  const dk = plate(opts.baseR + 0.35, opts.baseR - 0.05, opts.deckH, opts.colorDeck)
  dk.position.z = opts.deckH / 2; g.add(dk)
  // Rail posts
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const pst = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, opts.railH, 4),
      new THREE.MeshStandardMaterial({ color: opts.colorRail, roughness: 0.5 }))
    pst.position.set(Math.cos(a) * (opts.baseR + 0.3), Math.sin(a) * (opts.baseR + 0.3), opts.deckH + opts.railH / 2)
    g.add(pst)
  }
  // Rail ring
  const rl = plate(opts.baseR + 0.32, opts.baseR + 0.12, 0.02, opts.colorRail)
  rl.position.z = opts.deckH + opts.railH; g.add(rl)
  // Second rail
  const rl2 = plate(opts.baseR + 0.32, opts.baseR + 0.12, 0.02, opts.colorRail)
  rl2.position.z = opts.deckH + opts.railH * 0.4; g.add(rl2)
  g.userData = { draggable: true, snapped: true }
  return { group: g, pos: new THREE.Vector3(0, 0, opts.zOffset) }
}

/** Build one octagonal floor with enhanced dougong */
function buildFloor(opts: {
  wallR: number; wallH: number; wallThick: number
  eaveR: number; eaveH: number
  ridgeR: number
  colR: number; colN: number
  colorWall: number; colorCol: number; colorEave: number; colorRidge: number
  zOffset: number
}) {
  const g = new THREE.Group()
  const w = cyl(opts.wallR, opts.wallR + opts.wallThick, opts.wallH, 8, opts.colorWall)
  w.position.z = opts.wallH / 2; g.add(w)
  // Plank wall behind columns
  const pw = cyl(opts.wallR + 0.06, opts.wallR + 0.06, opts.wallH * 0.7, 8, 0x8b5e3c)
  pw.position.z = opts.wallH * 0.35; g.add(pw)
  // Columns (corner pillars)
  for (let i = 0; i < opts.colN; i++) {
    const a = (i / opts.colN) * Math.PI * 2 - Math.PI / opts.colN
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, opts.wallH, 6),
      new THREE.MeshStandardMaterial({ color: opts.colorCol, roughness: 0.4 }))
    col.position.set(Math.cos(a) * (opts.wallR + 0.09), Math.sin(a) * (opts.wallR + 0.09), opts.wallH / 2)
    g.add(col)
  }
  // Eave — wide & deep (应县木塔出檐深远)
  const e = plate(opts.eaveR, opts.wallR - 0.1, opts.eaveH, opts.colorEave)
  e.position.z = opts.wallH + opts.eaveH / 2; g.add(e)
  // Ridge ring
  const r = plate(opts.ridgeR, opts.ridgeR * 0.5, 0.04, opts.colorRidge)
  r.position.z = opts.wallH + opts.eaveH + 0.02; g.add(r)
  // Railing on the floor
  const ra = plate(opts.wallR + 0.15, opts.wallR - 0.02, 0.04, opts.colorRidge)
  ra.position.z = opts.wallH - 0.03; g.add(ra)
  // Layer 1 dougong — brackets on columns
  for (let i = 0; i < opts.colN; i++) {
    const a = (i / opts.colN) * Math.PI * 2 - Math.PI / opts.colN
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.06),
      new THREE.MeshStandardMaterial({ color: opts.colorCol, roughness: 0.4 }))
    d.position.set(Math.cos(a) * (opts.wallR + 0.12), Math.sin(a) * (opts.wallR + 0.12), opts.wallH - 0.02)
    d.lookAt(0, 0, 0); g.add(d)
  }
  // Layer 2 dougong — brackets between columns
  for (let i = 0; i < opts.colN * 2; i++) {
    const a = (i / (opts.colN * 2)) * Math.PI * 2
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: opts.colorCol, roughness: 0.4 }))
    d.position.set(Math.cos(a) * (opts.wallR + 0.14), Math.sin(a) * (opts.wallR + 0.14), opts.wallH - 0.04)
    d.lookAt(0, 0, 0); g.add(d)
  }
  // — Upward eave tips (飞檐) at 8 corners
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4),
      new THREE.MeshStandardMaterial({ color: opts.colorEave, roughness: 0.5 }))
    tip.position.set(Math.cos(a) * (opts.eaveR - 0.05), Math.sin(a) * (opts.eaveR - 0.05), opts.wallH + opts.eaveH)
    tip.rotation.x = Math.cos(a) * 0.2; tip.rotation.y = Math.sin(a) * 0.2
    g.add(tip)
  }
  g.userData = { draggable: true, snapped: true }
  const pos = new THREE.Vector3(0, 0, opts.zOffset)
  return { group: g, pos }
}

export default function QPagoda() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const W = window.innerWidth
    const H = window.innerHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = null
    const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 100)
    cam.position.set(0, 2.0, 12)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0
    el.appendChild(renderer.domElement)

    // Lighting — warm, atmospheric
    scene.add(new THREE.AmbientLight(0x554433, 0.8))
    const s1 = new THREE.DirectionalLight(0xffeedd, 2.5); s1.position.set(6, 8, 10); s1.castShadow = true; scene.add(s1)
    const s2 = new THREE.DirectionalLight(0x9988bb, 1.0); s2.position.set(-4, -2, -5); scene.add(s2)
    const s3 = new THREE.PointLight(0xffaa66, 1.8, 15); s3.position.set(0, 4, 5); scene.add(s3)

    // ── Root group ──
    const root = new THREE.Group()
    root.position.set(-7, -3.5, 0)
    root.scale.set(0.35, 0.35, 0.35)
    root.rotation.x = -Math.PI / 2
    scene.add(root)

    const pieces: { obj: THREE.Object3D; target: THREE.Vector3 }[] = []

    // Colors — 应县木塔 classic palette
    const C_roof  = 0x3a3a3a  // dark grey tiles
    const C_wall  = 0xc43a2a  // vermillion red walls
    const C_wood  = 0xb89464  // aged timber
    const C_gold  = 0xd4a020  // gilded spire
    const C_red   = 0xaa2222  // deep red columns
    const C_base  = 0x5a4a3a  // stone base
    const C_deck  = 0x8a7a5a  // deck wood

    // 0) Minimal base — no visible octagon
    const base = new THREE.Group()
    const b0 = cyl(0.3, 0.35, 0.04, 32, C_base); b0.receiveShadow = true; base.add(b0)
    base.userData = { draggable: true, snapped: true }
    const posBase = new THREE.Vector3(0, 0, 0)
    base.position.copy(posBase); root.add(base); pieces.push({ obj: base, target: posBase })

    // 1) Mezzanine 0 (底层平座)
    const mz0 = buildMezzanine({ baseR: 1.3, deckH: 0.05, railH: 0.12, colorDeck: C_deck, colorRail: C_wood, zOffset: 0.2 })
    mz0.group.position.copy(mz0.pos); root.add(mz0.group); pieces.push({ obj: mz0.group, target: mz0.pos })

    // 2) Floor 1 (一楼)
    const f1 = buildFloor({
      wallR: 1.2, wallH: 0.40, wallThick: 0.05,
      eaveR: 2.1, eaveH: 0.09,
      ridgeR: 0.7,
      colR: 1.3, colN: 8,
      colorWall: C_wall, colorCol: C_red, colorEave: C_roof, colorRidge: C_wood,
      zOffset: 0.4,
    })
    f1.group.position.copy(f1.pos); root.add(f1.group); pieces.push({ obj: f1.group, target: f1.pos })

    // 3) Mezzanine 1 (二层平座)
    const mz1 = buildMezzanine({ baseR: 0.95, deckH: 0.04, railH: 0.10, colorDeck: C_deck, colorRail: C_wood, zOffset: 0.9 })
    mz1.group.position.copy(mz1.pos); root.add(mz1.group); pieces.push({ obj: mz1.group, target: mz1.pos })

    // 4) Floor 2 (二楼)
    const f2 = buildFloor({
      wallR: 0.9, wallH: 0.34, wallThick: 0.04,
      eaveR: 1.65, eaveH: 0.08,
      ridgeR: 0.55,
      colR: 1.0, colN: 8,
      colorWall: C_wall, colorCol: C_red, colorEave: C_roof, colorRidge: C_wood,
      zOffset: 1.05,
    })
    f2.group.position.copy(f2.pos); root.add(f2.group); pieces.push({ obj: f2.group, target: f2.pos })

    // 5) Mezzanine 2 (三层平座)
    const mz2 = buildMezzanine({ baseR: 0.7, deckH: 0.03, railH: 0.08, colorDeck: C_deck, colorRail: C_wood, zOffset: 1.5 })
    mz2.group.position.copy(mz2.pos); root.add(mz2.group); pieces.push({ obj: mz2.group, target: mz2.pos })

    // 6) Floor 3 (三楼)
    const f3 = buildFloor({
      wallR: 0.65, wallH: 0.28, wallThick: 0.03,
      eaveR: 1.25, eaveH: 0.07,
      ridgeR: 0.4,
      colR: 0.75, colN: 8,
      colorWall: C_wall, colorCol: C_red, colorEave: C_roof, colorRidge: C_wood,
      zOffset: 1.65,
    })
    f3.group.position.copy(f3.pos); root.add(f3.group); pieces.push({ obj: f3.group, target: f3.pos })

    // 7) Mezzanine 3 (四层平座)
    const mz3 = buildMezzanine({ baseR: 0.5, deckH: 0.025, railH: 0.06, colorDeck: C_deck, colorRail: C_wood, zOffset: 2.05 })
    mz3.group.position.copy(mz3.pos); root.add(mz3.group); pieces.push({ obj: mz3.group, target: mz3.pos })

    // 8) Floor 4 (四楼)
    const f4 = buildFloor({
      wallR: 0.45, wallH: 0.22, wallThick: 0.025,
      eaveR: 0.95, eaveH: 0.06,
      ridgeR: 0.3,
      colR: 0.55, colN: 6,
      colorWall: C_wall, colorCol: C_red, colorEave: C_roof, colorRidge: C_wood,
      zOffset: 2.2,
    })
    f4.group.position.copy(f4.pos); root.add(f4.group); pieces.push({ obj: f4.group, target: f4.pos })

    // 9) Mezzanine 4 (五层平座)
    const mz4 = buildMezzanine({ baseR: 0.35, deckH: 0.02, railH: 0.05, colorDeck: C_deck, colorRail: C_wood, zOffset: 2.55 })
    mz4.group.position.copy(mz4.pos); root.add(mz4.group); pieces.push({ obj: mz4.group, target: mz4.pos })

    // 10) Floor 5 (五楼) — topmost
    const f5 = buildFloor({
      wallR: 0.3, wallH: 0.18, wallThick: 0.02,
      eaveR: 0.7, eaveH: 0.05,
      ridgeR: 0.2,
      colR: 0.38, colN: 6,
      colorWall: C_wall, colorCol: C_red, colorEave: C_roof, colorRidge: C_wood,
      zOffset: 2.7,
    })
    f5.group.position.copy(f5.pos); root.add(f5.group); pieces.push({ obj: f5.group, target: f5.pos })

    // 11) Spire (塔刹) — ornate, multi-tier
    const spire = new THREE.Group()
    const sm = new THREE.MeshStandardMaterial({ color: C_gold, roughness: 0.15, metalness: 0.9 })
    // Base plate
    const spBase = plate(0.2, 0.05, 0.05, C_gold)
    spBase.position.z = 0.025; spire.add(spBase)
    // Inverted bowl (覆钵)
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), sm)
    bowl.position.z = 0.1; bowl.scale.set(1, 1, 0.4); spire.add(bowl)
    // Rings (相轮) — 7 rings
    for (let i = 0; i < 7; i++) {
      const sr = new THREE.Mesh(new THREE.TorusGeometry(0.1 - i * 0.008, 0.015, 6, 12), sm)
      sr.position.z = 0.18 + i * 0.04; spire.add(sr)
    }
    // Umbrella (宝盖)
    const umb = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.02, 8), sm)
    umb.position.z = 0.48; spire.add(umb)
    // Finial (宝珠)
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 6), sm)
    fin.position.z = 0.6; spire.add(fin)
    const finB = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), sm)
    finB.position.z = 0.72; spire.add(finB)

    spire.userData = { draggable: true, snapped: true }
    const posSpire = new THREE.Vector3(0, 0, 2.95)
    spire.position.copy(posSpire); root.add(spire); pieces.push({ obj: spire, target: posSpire })

    // ── Floating lantern particles ──
    const fp1 = (() => {
      const n = 80, pos = new Float32Array(n * 3), col = new Float32Array(n * 3)
      const c = new THREE.Color()
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const r = 2.5 + Math.sin(i * 5.7) * 0.4
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r; pos[i * 3 + 2] = Math.sin(i * 2.1) * 0.3
        c.setHSL(0.08 + (i / n) * 0.04, 0.6, 0.3 + (i / n) * 0.3)
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
      return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.04, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.25 }))
    })()
    fp1.position.z = -0.2; root.add(fp1)

    // ── Drag / Orbit ──
    const m2 = new THREE.Vector2(), m3 = new THREE.Vector3(), lm = new THREE.Vector3()
    const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(), wp = new THREE.Vector3()
    const drag = { obj: null as THREE.Object3D | null, off: new THREE.Vector3(), on: false }
    const orb = { on: false, px: 0, v: 0, ry: 0 }

    const allMeshes = () => {
      const ms: THREE.Mesh[] = [], map = new Map<THREE.Mesh, THREE.Object3D>()
      for (const p of pieces) {
        if ((p.obj as THREE.Mesh).isMesh) { ms.push(p.obj as THREE.Mesh); map.set(p.obj as THREE.Mesh, p.obj) }
        else p.obj.traverse((c) => { if ((c as THREE.Mesh).isMesh) { ms.push(c as THREE.Mesh); map.set(c as THREE.Mesh, p.obj) } })
      }
      return { ms, map }
    }

    const hit = (e: PointerEvent) => {
      m2.x = (e.clientX / W) * 2 - 1; m2.y = -(e.clientY / H) * 2 + 1
      raycaster.setFromCamera(m2, cam)
      const { ms, map } = allMeshes()
      const hits = raycaster.intersectObjects(ms.filter(m => map.get(m)?.userData.draggable), false)
      return hits.length ? map.get(hits[0].object as THREE.Mesh) || null : null
    }

    const projPlane = () => { raycaster.setFromCamera(m2, cam); raycaster.ray.intersectPlane(plane, m3) }

    const down = (e: PointerEvent) => {
      const p = hit(e)
      if (p) {
        p.getWorldPosition(wp)
        const d = new THREE.Vector3(); cam.getWorldDirection(d)
        plane.setFromNormalAndCoplanarPoint(d.negate(), wp)
        projPlane(); root.worldToLocal(lm.copy(m3))
        drag.off.copy(lm).sub(p.position); drag.obj = p; drag.on = true
        renderer.domElement.setPointerCapture(e.pointerId)
        p.userData.snapped = false
      } else {
        orb.on = true; orb.px = e.clientX; orb.v = 0
        renderer.domElement.setPointerCapture(e.pointerId)
      }
    }

    const move = (e: PointerEvent) => {
      m2.x = (e.clientX / W) * 2 - 1; m2.y = -(e.clientY / H) * 2 + 1
      if (drag.on && drag.obj) {
        projPlane(); root.worldToLocal(lm.copy(m3))
        drag.obj.position.copy(lm).sub(drag.off)
        drag.obj.position.z = Math.max(0, drag.obj.position.z)
      } else if (orb.on) {
        orb.v = (e.clientX - orb.px) * 0.008; orb.ry += orb.v
        root.rotation.y = orb.ry; orb.px = e.clientX
      }
    }

    const up = () => {
      if (drag.on && drag.obj) {
        const t = pieces.find(x => x.obj === drag.obj)?.target
        if (t && drag.obj.position.distanceTo(t) < 0.7) {
          pieces.find(x => x.obj === drag.obj)!.obj.userData.snapped = true
        }
        drag.obj = null; drag.on = false
      }
      orb.on = false
    }

    const dom = renderer.domElement
    dom.addEventListener('pointerdown', down); dom.addEventListener('pointermove', move)
    dom.addEventListener('pointerup', up); dom.addEventListener('pointerleave', up)
    dom.style.touchAction = 'none'

    // ── Animation ──
    const clock = new THREE.Clock()
    let aid: number

    const animate = () => {
      const t = clock.getElapsedTime()

      for (const { obj, target } of pieces) {
        if (drag.on && drag.obj === obj) continue
        if (!obj.userData.snapped) {
          obj.position.lerp(target, 0.06)
          if (obj.position.distanceTo(target) < 0.015) { obj.position.copy(target); obj.userData.snapped = true }
        } else {
          obj.rotation.z += (Math.sin(t * 0.02) * 0.003 - obj.rotation.z) * 0.03
        }
      }

      fp1.rotation.z += 0.0008; fp1.rotation.x += 0.0003

      if (!orb.on && Math.abs(orb.v) > 0.0008) {
        orb.v *= 0.96; orb.ry += orb.v; root.rotation.y = orb.ry
      } else if (!orb.on) orb.v = 0

      // Gentle camera sway
      cam.position.x = Math.sin(t * 0.04) * 0.2
      cam.position.y = 2.0 + Math.sin(t * 0.03) * 0.08
      cam.lookAt(0, 1.0, 0.5)

      renderer.render(scene, cam)
      aid = requestAnimationFrame(animate)
    }
    animate()

    const resize = () => {
      const ww = window.innerWidth, wh = window.innerHeight
      cam.aspect = ww / wh; cam.updateProjectionMatrix(); renderer.setSize(ww, wh)
    }
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(aid)
      dom.removeEventListener('pointerdown', down); dom.removeEventListener('pointermove', move)
      dom.removeEventListener('pointerup', up); dom.removeEventListener('pointerleave', up)
      window.removeEventListener('resize', resize)
      el.removeChild(dom)
      renderer.dispose()
    }
  }, [])

  return <div ref={ref} className="fixed inset-0 z-[5]" style={{ cursor: 'grab' }} />
}
