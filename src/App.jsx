import { useState } from 'react'
import CanvasBoard from './components/CanvasBoard'
import SharedNote from './components/SharedNote'

function App() {
  const [tab, setTab] = useState('canvas')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-6">
          <div className="text-xl font-semibold">Anon Board</div>
          <nav className="flex items-center gap-2">
            <button
              className={`px-3 py-1.5 rounded ${tab==='canvas'?'bg-cyan-600 text-white':'bg-slate-800 hover:bg-slate-700'}`}
              onClick={() => setTab('canvas')}
            >Infinite Canvas</button>
            <button
              className={`px-3 py-1.5 rounded ${tab==='note'?'bg-cyan-600 text-white':'bg-slate-800 hover:bg-slate-700'}`}
              onClick={() => setTab('note')}
            >Death Note</button>
          </nav>
          <a href="/test" className="ml-auto text-sm text-slate-300 hover:text-white underline">System check</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto h-[calc(100vh-65px)] px-4">
        <div className="h-full rounded-lg overflow-hidden border border-slate-800">
          {tab === 'canvas' ? (
            <CanvasBoard room="global" />
          ) : (
            <SharedNote room="global" />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
