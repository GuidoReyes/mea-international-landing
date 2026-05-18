'use client'

import { Suspense, lazy, useState, memo, Component, type ReactNode } from 'react'
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

// lazy-loaded so the Spline bundle doesn't block the initial page render
const SplineLazy = lazy(() => import('@splinetool/react-spline'))

function SplineInner({ scene, className }: SplineSceneProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      {!loaded && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <Spinner />
        </div>
      )}
      {/* Suspense fallback is null so the outer div (with explicit h-[400px]) keeps
          its dimensions — the canvas never gets display:none / 0×0 sizing. */}
      <Suspense fallback={null}>
        <SplineLazy
          scene={scene}
          onLoad={(_app: Application) => setLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            opacity: loaded ? 1 : 0,
          }}
        />
      </Suspense>
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
