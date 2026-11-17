import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
  ArMarkerControls,
  ArToolkitContext,
  ArToolkitSource,
} from '@ar-js-org/ar.js/three.js/build/ar-threex.mjs'
import './App.css'

const AR_BASE = `${import.meta.env.BASE_URL}ar/`

const MODELS = [
  { label: 'Zorro', url: '/glTF-Sample-Assets/Models/Fox/glTF-Binary/Fox.glb' },
  { label: 'Casco', url: '/glTF-Sample-Assets/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb' },
  { label: 'Palta', url: '/glTF-Sample-Assets/Models/Avocado/glTF-Binary/Avocado.glb' },
  { label: 'Radio', url: '/glTF-Sample-Assets/Models/BoomBox/glTF-Binary/BoomBox.glb' },
]

async function loadModel(url) {
  const { scene } = await new GLTFLoader().loadAsync(url)
  scene.traverse((c) => {
    if (c.isMesh) c.frustumCulled = false
  })
  const box = new THREE.Box3().setFromObject(scene)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const scale = 1.2 / (Math.max(size.x, size.y, size.z) || 1)
  scene.scale.setScalar(scale)
  scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
  const group = new THREE.Group()
  group.add(scene)
  group.rotation.y = Math.PI / 5
  return group
}

export default function App() {
  const stageRef = useRef(null)
  const arRef = useRef(null)
  const busyRef = useRef(false)
  const keysRef = useRef(new Set())
  const posRef = useRef({ x: 0, z: 0, y: 0, vy: 0 })

  const [modelUrl, setModelUrl] = useState(MODELS[0].url)
  const [vertical, setVertical] = useState(true)
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('Marcador Hiro · Mover: WASD / Flechas · Saltar: Espacio · Centrar: R')

  const jump = () => {
    if (posRef.current.y <= 0.001) posRef.current.vy = 4.6
  }

  const reset = () => {
    posRef.current = { x: 0, z: 0, y: 0, vy: 0 }
    if (arRef.current) arRef.current.mover.position.set(0, 0, 0)
  }

  useEffect(() => {
    const down = (e) => {
      if (!arRef.current) return
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault()
      }
      keysRef.current.add(e.code)
      if (e.code === 'Space') jump()
      if (e.code === 'KeyR') reset()
    }
    const up = (e) => keysRef.current.delete(e.code)
    const clear = () => keysRef.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  useEffect(() => {
    const stage = arRef.current?.stage
    if (!stage) return
    stage.rotation.set(vertical ? -Math.PI / 2 : 0, 0, 0)
    stage.position.set(0, vertical ? 0.35 : 0.15, 0)
  }, [vertical])

  useEffect(() => {
    const ar = arRef.current
    if (!ar) return
    let active = true
    loadModel(modelUrl).then((mesh) => {
      if (!active || !arRef.current) return
      if (ar.model) ar.mover.remove(ar.model)
      ar.model = mesh
      ar.mover.add(mesh)
      reset()
    })
    return () => {
      active = false
    }
  }, [modelUrl])

  function stopAR() {
    const ar = arRef.current
    if (!ar) return
    arRef.current = null
    keysRef.current.clear()
    cancelAnimationFrame(ar.raf)
    window.removeEventListener('resize', ar.onResize)
    try {
      ar.context.dispose?.()
      ar.source.dispose?.()
    } catch {}
    ar.env.dispose()
    ar.renderer.dispose()
    ar.renderer.domElement.remove()
    ar.source.domElement.remove()
    setRunning(false)
    setMsg('Marcador Hiro · Mover: WASD / Flechas · Saltar: Espacio · Centrar: R')
  }

  useEffect(() => stopAR, [])

  async function startAR() {
    const el = stageRef.current
    if (!el || arRef.current || busyRef.current) return
    busyRef.current = true
    setMsg('Aceptá el permiso de cámara…')

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = env.texture
    pmrem.dispose()

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    scene.add(camera, new THREE.AmbientLight(0xffffff, 1), new THREE.HemisphereLight(0xffffff, 0x666666, 1.5))
    const light = new THREE.DirectionalLight(0xffffff, 2.2)
    light.position.set(2, 3, 4)
    scene.add(light)

    const root = new THREE.Group()
    const stage = new THREE.Group()
    const mover = new THREE.Group()
    stage.rotation.set(vertical ? -Math.PI / 2 : 0, 0, 0)
    stage.position.set(0, vertical ? 0.35 : 0.15, 0)
    stage.add(mover)
    root.add(stage)
    scene.add(root)

    const source = new ArToolkitSource({
      sourceType: 'webcam',
      displayWidth: window.innerWidth,
      displayHeight: window.innerHeight,
    })

    try {
      await new Promise((res, rej) => source.init(res, rej))
    } catch (err) {
      env.dispose()
      renderer.dispose()
      busyRef.current = false
      setMsg(`No se pudo abrir la cámara (${err?.message || 'revisá si otra pestaña o app la está usando'}).`)
      return
    }

    const video = source.domElement
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.style.cssText = ''
    video.className = 'ar-video'
    renderer.domElement.style.cssText = ''
    renderer.domElement.className = 'ar-canvas'
    el.append(video, renderer.domElement)
    video.onloadedmetadata = () => video.play().catch(() => {})
    video.play().catch(() => {})

    const context = new ArToolkitContext({
      cameraParametersUrl: `${AR_BASE}data/camera_para.dat`,
      detectionMode: 'mono',
      canvasWidth: 640,
      canvasHeight: 480,
    })

    await new Promise((res) => {
      context.init(() => {
        camera.projectionMatrix.copy(context.getProjectionMatrix())
        res()
      })
    })

    new ArMarkerControls(context, root, {
      type: 'pattern',
      patternUrl: `${AR_BASE}data/patt.hiro`,
      changeMatrixMode: 'modelViewMatrix',
    })

    const model = await loadModel(modelUrl).catch(() => null)
    if (model) mover.add(model)
    reset()

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      if (context.arController) camera.projectionMatrix.copy(context.getProjectionMatrix())
    }
    window.addEventListener('resize', onResize)

    arRef.current = { source, context, renderer, scene, camera, env, stage, mover, model, t: performance.now(), raf: 0, onResize }

    const loop = () => {
      const ar = arRef.current
      if (!ar) return
      ar.raf = requestAnimationFrame(loop)
      const now = performance.now()
      const dt = Math.min((now - ar.t) / 1000, 0.05)
      ar.t = now

      const k = keysRef.current
      const p = posRef.current
      if (k.has('ArrowLeft') || k.has('KeyA')) p.x -= 1.6 * dt
      if (k.has('ArrowRight') || k.has('KeyD')) p.x += 1.6 * dt
      if (k.has('ArrowUp') || k.has('KeyW')) p.z -= 1.6 * dt
      if (k.has('ArrowDown') || k.has('KeyS')) p.z += 1.6 * dt
      p.x = Math.max(-2.8, Math.min(2.8, p.x))
      p.z = Math.max(-2.8, Math.min(2.8, p.z))

      if (p.y > 0 || p.vy > 0) {
        p.vy -= 12.5 * dt
        p.y += p.vy * dt
        if (p.y <= 0) {
          p.y = 0
          p.vy = 0
        }
      }

      ar.mover.position.set(p.x, p.y, p.z)
      if (ar.source.ready && video.videoWidth > 0) ar.context.update(video)
      ar.renderer.render(ar.scene, ar.camera)
    }
    loop()
    busyRef.current = false
    setRunning(true)
  }

  return (
    <div className="app">
      <div className="bar">
        <select value={modelUrl} onChange={(e) => { setModelUrl(e.target.value); e.target.blur() }}>
          {MODELS.map((m) => (
            <option key={m.url} value={m.url}>{m.label}</option>
          ))}
        </select>
        <button type="button" onClick={(e) => { setVertical((v) => !v); e.currentTarget.blur() }}>
          {vertical ? 'Vertical' : 'Horizontal'}
        </button>
        {running && (
          <>
            <button type="button" onClick={(e) => { jump(); e.currentTarget.blur() }}>Saltar</button>
            <button type="button" onClick={(e) => { reset(); e.currentTarget.blur() }}>Centrar</button>
          </>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur()
            if (running) stopAR()
            else startAR()
          }}
        >
          {running ? 'Detener' : 'Iniciar AR'}
        </button>
      </div>

      <div ref={stageRef} className="stage">
        {!running && <p className="hint">{msg}</p>}
      </div>
    </div>
  )
}
