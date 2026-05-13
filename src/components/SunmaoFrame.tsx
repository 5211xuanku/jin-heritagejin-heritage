import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ── 榫卯构件生成器 ──

function createMortiseBlock(size: number, color: number): THREE.Group {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.5, metalness: 0.35,
  })
  const main = new THREE.Mesh(new THREE.BoxGeometry(size, size, size * 0.7), mat)
  main.castShadow = true; main.userData.isPart = true
  group.add(main)

  const grooveMat = new THREE.MeshStandardMaterial({
    color: 0x1a0a15, roughness: 0.9, metalness: 0.1,
  })
  ;[
    [size * 0.2, size * 0.32, size * 0.75, size * 0.35, 0, 0],
    [size * 0.2, size * 0.32, size * 0.75, -size * 0.35, 0, 0],
    [size * 0.32, size * 0.2, size * 0.75, 0, size * 0.35, 0],
    [size * 0.32, size * 0.2, size * 0.75, 0, -size * 0.35, 0],
  ].forEach(([gw, gh, gd, px, py, pz]) => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), grooveMat)
    g.position.set(px, py, pz); g.userData.isPart = true
    group.add(g)
  })
  return group
}

function createBeam(length: number, thick: number, color: number, axis: 'x' | 'y'): THREE.Group {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.45, metalness: 0.4,
  })
  const w = axis === 'x' ? length : thick
  const h = axis === 'y' ? thick : thick
  const d = axis === 'x' ? thick : length

  const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.64, h, d * 0.64), mat)
  body.castShadow = true; body.userData.isPart = true
  group.add(body)

  const tenonSize = axis === 'x' ? length * 0.18 : thick * 0.3
  ;[
    axis === 'x' ? [-(length * 0.41), 0, 0] : [0, 0, -(length * 0.41)],
    axis === 'x' ? [(length * 0.41), 0, 0] : [0, 0, (length * 0.41)],
  ].forEach(([px, py, pz]) => {
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(tenonSize, h * 0.32, thick * 0.32), mat
    )
    t.position.set(px, py, pz); t.castShadow = true; t.userData.isPart = true
    group.add(t)
  })
  return group
}

function createParticleRing(count: number, radius: number): THREE.Points {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const color = new THREE.Color()
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const r = radius + (Math.sin(i * 7.3) * 0.4 + Math.cos(i * 11.1) * 0.3)
    positions[i * 3] = Math.cos(angle) * r
    positions[i * 3 + 1] = Math.sin(angle) * r
    positions[i * 3 + 2] = 0
    color.setHSL(0.12 + (i / count) * 0.08, 0.7, 0.5 + (i / count) * 0.3)
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.08, vertexColors: true, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.7,
  }))
}

export default function SunmaoFrame() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = window.innerWidth, h = window.innerHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
    camera.position.set(0, 0, 18)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.AmbientLight(0x3a1a2e, 1.5))
    const key = new THREE.DirectionalLight(0xffd4a0, 4); key.position.set(8, 6, 10); key.castShadow = true; scene.add(key)
    const rim = new THREE.DirectionalLight(0x8055cc, 3); rim.position.set(-6, -3, -6); scene.add(rim)
    const top = new THREE.PointLight(0xffcc80, 6, 30); top.position.set(0, 8, 5); scene.add(top)

    // ─── Build frame ───
    const frameGroup = new THREE.Group()
    scene.add(frameGroup)

    const woodLight = 0xc4924a, woodDark = 0x8b5e3c, woodWarm = 0xd4a76a
    const frameW = 11, frameH = 7, blockSize = 1.0, beamThick = 0.6
    const halfW = frameW / 2, halfH = frameH / 2

    const corners: THREE.Group[] = []
    const cornerPositions: [number, number][] = [[-halfW, halfH], [halfW, halfH], [-halfW, -halfH], [halfW, -halfH]]
    const cornerColors = [woodDark, woodLight, woodLight, woodDark]
    cornerPositions.forEach(([cx, cy], i) => {
      const block = createMortiseBlock(blockSize, cornerColors[i])
      block.position.set(cx, cy, 0); block.userData.isDraggable = true; block.userData.basePos = new THREE.Vector3(cx, cy, 0)
      frameGroup.add(block); corners.push(block)
    })

    const beams: THREE.Group[] = []
    const beamDefs: [number, number, number, 'x' | 'y'][] = [
      [0, halfH, woodWarm, 'x'], [0, -halfH, woodWarm, 'x'],
      [-halfW + 0.02, 0, woodLight, 'y'], [halfW - 0.02, 0, woodLight, 'y'],
    ]
    beamDefs.forEach(([bx, by, color, axis]) => {
      const len = axis === 'x' ? frameW - blockSize * 1.2 : frameH - blockSize * 1.2
      const beam = createBeam(len, beamThick, color, axis)
      beam.position.set(bx, by, 0); beam.userData.isDraggable = true; beam.userData.basePos = new THREE.Vector3(bx, by, 0)
      frameGroup.add(beam); beams.push(beam)
    })

    const ring1 = createParticleRing(400, frameW * 0.55); ring1.position.z = 0.3; frameGroup.add(ring1)
    const ring2 = createParticleRing(300, frameW * 0.42); ring2.position.z = 0.5; ring2.rotation.z = Math.PI * 0.15; frameGroup.add(ring2)

    // ─── Drag state ───
    const reactiveObjs = [...corners, ...beams]
    // bases for proximity — stored in userData.basePos already
    const drag = { piece: null as THREE.Group | null, base: new THREE.Vector3(), offset: new THREE.Vector3(), active: false, grabDist: 0 }

    // ─── Pointer (mouse/touch) events ───
    const mouse = new THREE.Vector2()
    const mouse3D = new THREE.Vector3()
    const raycaster = new THREE.Raycaster()
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

    const updateMouse3D = () => {
      raycaster.setFromCamera(mouse, camera)
      raycaster.ray.intersectPlane(planeZ, mouse3D)
    }

    const getHitPiece = (event: PointerEvent): THREE.Group | null => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      // Collect all meshes from draggable groups
      const meshes: THREE.Mesh[] = []
      const map = new Map<THREE.Mesh, THREE.Group>()
      for (const g of reactiveObjs) {
        g.children.forEach((c: THREE.Object3D) => {
          if ((c as THREE.Mesh).isMesh) { meshes.push(c as THREE.Mesh); map.set(c as THREE.Mesh, g) }
        })
      }
      const hits = raycaster.intersectObjects(meshes, false)
      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh
        return map.get(hitMesh) || null
      }
      return null
    }

    const onPointerDown = (event: PointerEvent) => {
      const piece = getHitPiece(event)
      if (piece) {
        updateMouse3D()
        drag.piece = piece
        drag.base.copy(piece.userData.basePos)
        drag.offset.copy(mouse3D).sub(piece.position)
        drag.grabDist = mouse3D.distanceTo(piece.position)
        drag.active = true
        renderer.domElement.setPointerCapture(event.pointerId)
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
      if (drag.active && drag.piece) {
        updateMouse3D()
        drag.piece.position.copy(mouse3D).sub(drag.offset)
        // Pull slightly forward in Z when dragging
        drag.piece.position.z = Math.min(1.2, drag.grabDist * 0.08)
      }
    }

    const onPointerUp = () => {
      if (drag.active && drag.piece) {
        const b = drag.piece.userData.basePos
        drag.piece.userData.shouldSnap = true
        drag.piece.userData.snapTarget = b
        drag.active = false
        drag.piece = null
      }
    }

    const el = renderer.domElement
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointerleave', onPointerUp)
    el.style.touchAction = 'none'

    // ─── Animation ───
    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      const elapsed = clock.getElapsedTime()
      // Always update mouse projection for proximity
      raycaster.setFromCamera(mouse, camera)
      raycaster.ray.intersectPlane(planeZ, mouse3D)

      for (let i = 0; i < reactiveObjs.length; i++) {
        const obj = reactiveObjs[i]
        const base = obj.userData.basePos

        // Handle snap-back animation
        if (obj.userData.shouldSnap && obj.userData.snapTarget) {
          obj.position.lerp(obj.userData.snapTarget, 0.08)
          if (obj.position.distanceTo(obj.userData.snapTarget) < 0.01) {
            obj.position.copy(obj.userData.snapTarget)
            obj.position.z = 0
            obj.userData.shouldSnap = false
            obj.userData.snapTarget = null
          }
          continue
        }

        // Skip wave/repel if currently being dragged
        if (drag.active && drag.piece === obj) continue

        // Organic wave
        const waveX = Math.sin(elapsed * 0.7 + base.x * 0.4) * 0.08
        const waveY = Math.cos(elapsed * 0.6 + base.y * 0.35) * 0.08
        const waveZ = Math.sin(elapsed * 0.5 + base.length()) * 0.05

        // Proximity repel
        let repelX = 0, repelY = 0, repelZ = 0
        if (mouse3D.length() < 30 && !drag.active) {
          const dx = base.x - mouse3D.x
          const dy = base.y - mouse3D.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const threshold = 3.5
          if (dist < threshold && dist > 0.05) {
            const force = ((threshold - dist) / threshold) * 0.7
            repelX = (dx / dist) * force
            repelY = (dy / dist) * force
            repelZ = force * 0.3
          }
        }

        obj.position.set(base.x + waveX + repelX, base.y + waveY + repelY, base.z + waveZ + repelZ)
        obj.rotation.x += (Math.sin(elapsed * 1.3 + i) * 0.002 - obj.rotation.x) * 0.02
        obj.rotation.y += (Math.cos(elapsed * 1.1 + i * 1.5) * 0.002 - obj.rotation.y) * 0.02
      }

      // Frame breathe
      const breathe = 1 + Math.sin(elapsed * 0.3) * 0.015
      frameGroup.scale.setScalar(breathe)

      ring1.rotation.z += 0.002; ring2.rotation.z -= 0.0015
      ring1.rotation.x += 0.001; ring2.rotation.x -= 0.0008

      camera.position.x = Math.sin(elapsed * 0.08) * 0.6
      camera.position.y = Math.cos(elapsed * 0.06) * 0.4
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      animId = requestAnimationFrame(animate)
    }
    animate()

    const resize = () => {
      const ww = window.innerWidth, wh = window.innerHeight
      camera.aspect = ww / wh; camera.updateProjectionMatrix()
      renderer.setSize(ww, wh)
    }
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animId)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointerleave', onPointerUp)
      window.removeEventListener('resize', resize)
      container.removeChild(el)
      renderer.dispose()
    }
  }, [])

  return <div ref={containerRef} className="fixed inset-0 z-[5]" style={{ cursor: 'grab' }} />
}
