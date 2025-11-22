import { useEffect, useRef, useState } from 'react'

const DEFAULT_COLOR = '#22d3ee'
const DEFAULT_SIZE = 3

function drawStroke(ctx, stroke) {
  if (!stroke?.points?.length) return
  ctx.strokeStyle = stroke.color || DEFAULT_COLOR
  ctx.lineWidth = stroke.size || DEFAULT_SIZE
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const [first, ...rest] = stroke.points
  ctx.moveTo(first.x, first.y)
  for (const p of rest) ctx.lineTo(p.x, p.y)
  ctx.stroke()
}

export default function CanvasBoard({ room = 'global' }) {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [stroke, setStroke] = useState({ color: DEFAULT_COLOR, size: DEFAULT_SIZE, points: [] })
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [size, setSize] = useState(DEFAULT_SIZE)
  const wsRef = useRef(null)
  const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  // Resize canvas to device pixel ratio
  const resizeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctxRef.current = ctx
  }

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  // Load history
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${backendBase}/api/canvas/${room}`)
        const data = await res.json()
        const ctx = ctxRef.current
        if (ctx) {
          for (const e of data.events || []) drawStroke(ctx, e.stroke)
        }
      } catch (e) {
        console.warn('Failed to load canvas history', e)
      }
    }
    load()
  }, [room])

  // WebSocket connect
  useEffect(() => {
    const wsUrl = (backendBase.replace('http', 'ws')) + `/ws/canvas/${room}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg?.type === 'stroke' && msg.data?.stroke) {
          const ctx = ctxRef.current
          if (ctx) drawStroke(ctx, msg.data.stroke)
        }
      } catch {}
    }
    return () => ws.close()
  }, [room])

  const start = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.nativeEvent.offsetX
    const y = e.nativeEvent.offsetY
    setStroke({ color, size, points: [{ x, y }] })
    setIsDrawing(true)
  }

  const move = (e) => {
    if (!isDrawing) return
    const x = e.nativeEvent.offsetX
    const y = e.nativeEvent.offsetY
    setStroke((s) => {
      const next = { ...s, points: [...s.points, { x, y }] }
      const ctx = ctxRef.current
      if (ctx) drawStroke(ctx, { ...next, points: next.points.slice(-2) })
      return next
    })
  }

  const end = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const s = stroke
    if (s.points.length > 1) {
      // redraw fully to ensure smoothness
      const ctx = ctxRef.current
      if (ctx) drawStroke(ctx, s)
      try {
        wsRef.current?.send(JSON.stringify({ stroke: s }))
      } catch {}
    }
    setStroke({ color, size, points: [] })
  }

  const clearLocal = () => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Reload strokes from server to repopulate
      fetch(`${backendBase}/api/canvas/${room}`).then(r=>r.json()).then(d=>{
        for (const e of d.events || []) drawStroke(ctx, e.stroke)
      })
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-3 bg-slate-900/70 border-b border-slate-800 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-slate-200 text-sm">Color</label>
          <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} className="h-8 w-10 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-slate-200 text-sm">Size</label>
          <input type="range" min={1} max={30} value={size} onChange={(e)=>setSize(parseInt(e.target.value))} />
          <span className="text-slate-300 text-sm w-6 text-center">{size}</span>
        </div>
        <button onClick={clearLocal} className="ml-auto px-3 py-1.5 rounded bg-cyan-600 text-white hover:bg-cyan-500">Refresh</button>
      </div>
      <div className="flex-1 relative bg-slate-950">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={(e)=>{ const t=e.touches[0]; if(!t) return; const rect=e.target.getBoundingClientRect(); const x=t.clientX-rect.left; const y=t.clientY-rect.top; setStroke({ color, size, points:[{x,y}]}); setIsDrawing(true); }}
          onTouchMove={(e)=>{ if(!isDrawing) return; const t=e.touches[0]; if(!t) return; const rect=e.target.getBoundingClientRect(); const x=t.clientX-rect.left; const y=t.clientY-rect.top; setStroke((s)=>{ const next={...s, points:[...s.points,{x,y}]}; const ctx=ctxRef.current; if(ctx) drawStroke(ctx, { ...next, points: next.points.slice(-2) }); return next; }); e.preventDefault(); }}
          onTouchEnd={end}
        />
      </div>
    </div>
  )
}
