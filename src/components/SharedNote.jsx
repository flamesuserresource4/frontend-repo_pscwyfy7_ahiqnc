import { useEffect, useRef, useState } from 'react'

export default function SharedNote({ room = 'global' }) {
  const [content, setContent] = useState('')
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`${backendBase}/api/note/${room}`)
        const data = await res.json()
        setContent(data.content || '')
      } catch {}
    }
    init()
  }, [room])

  useEffect(() => {
    const wsUrl = (backendBase.replace('http', 'ws')) + `/ws/note/${room}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'init' || msg.type === 'update') {
          setContent(msg.content || '')
        }
      } catch {}
    }
    return () => ws.close()
  }, [room])

  const onChange = (e) => {
    const value = e.target.value
    setContent(value)
    // debounce slightly
    clearTimeout(onChange._t)
    onChange._t = setTimeout(() => {
      try { wsRef.current?.send(JSON.stringify({ type: 'update', content: value })) } catch {}
    }, 150)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-slate-900/70 border-b border-slate-800 flex items-center gap-3">
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
        <span className="text-slate-300 text-sm">{connected ? 'Live' : 'Connecting...'}</span>
      </div>
      <textarea
        value={content}
        onChange={onChange}
        placeholder="Write anything... your words will appear for everyone."
        className="flex-1 p-4 bg-slate-950 text-slate-100 outline-none resize-none font-mono text-base"
      />
    </div>
  )
}
