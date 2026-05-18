'use client'

import { useRef, useEffect, useState, memo, Component, type ReactNode } from 'react'
import type { Application } from '@splinetool/runtime'

interface SplineSceneProps {
  scene: string
  className?: string
}

interface EBState { hasError: boolean }

class SplineErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  state: EBState = { hasError: false }
  static getDerivedStateFromError(): EBState { return { hasError: true } }
  componentDidCatch(error: Error) { console.error('[Spline] render error:', error) }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

const Spinner = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="w-16 h-16 border-4 border-[#00C4B4]/20 border-t-[#00C4B4] rounded-full animate-spin" />
  </div>
)

// Uses Application from @splinetool/runtime directly so the canvas is never
// hidden (display:none), which would give clientWidth/clientHeight = 0 and
// break the WebGL renderer initialization in Three.js.
function SplineInner({ scene, className }: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const appRef      = useRef<Application | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let disposed = false

    import('@splinetool/runtime')
      .then(({ Application }) => {
        if (disposed) return

        const app = new Application(canvas, { renderMode: 'continuous' })
        appRef.current = app

        return app.load(scene).then(() => {
          if (disposed) return
          const { width, height } = container.getBoundingClientRect()
          if (width > 0 && height > 0) app.setSize(width, height)
          setLoaded(true)
        })
      })
      .catch((err: unknown) => {
        if (disposed) return
        console.error('[Spline] scene load failed:', err)
        setFailed(true)
      })

    let resizeRaf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        const app = appRef.current
        if (!app) return
        const { width, height } = container.getBoundingClientRect()
        if (width > 0 && height > 0) app.setSize(width, height)
      })
    })
    ro.observe(container)

    return () => {
      disposed = true
      cancelAnimationFrame(resizeRaf)
      ro.disconnect()
      appRef.current?.dispose()
      appRef.current = null
    }
  }, [scene])

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className ?? ''}`}>
      {!loaded && !failed && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <Spinner />
        </div>
      )}
      {failed ? (
        <Spinner />
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            opacity: loaded ? 1 : 0,
          }}
        />
      )}
    </div>
  )
}

function SplineOuter(props: SplineSceneProps) {
  return (
    <SplineErrorBoundary fallback={<Spinner />}>
      <SplineInner {...props} />
    </SplineErrorBoundary>
  )
}

export const SplineScene = memo(SplineOuter)
