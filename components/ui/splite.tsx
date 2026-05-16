'use client'

import { Suspense, lazy, memo, Component, type ReactNode } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

interface EBState { hasError: boolean }

class SplineErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  state: EBState = { hasError: false }
  static getDerivedStateFromError(): EBState { return { hasError: true } }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

const Fallback = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="w-16 h-16 border-4 border-[#00C4B4]/20 border-t-[#00C4B4] rounded-full animate-spin" />
  </div>
)

// memo prevents parent re-renders (e.g. Framer Motion frames) from resetting
// the canvas display:none that Spline's runtime temporarily overrides during init
export const SplineScene = memo(function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <SplineErrorBoundary fallback={<Fallback />}>
        <Suspense fallback={<Fallback />}>
          <Spline
            scene={scene}
            className="absolute inset-0 w-full h-full"
            renderOnDemand={false}
            onLoad={() => window.dispatchEvent(new Event('resize'))}
          />
        </Suspense>
      </SplineErrorBoundary>
    </div>
  )
})
