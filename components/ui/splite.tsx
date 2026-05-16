'use client'

import { Suspense, lazy, Component, type ReactNode } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

interface EBState { hasError: boolean }

class SplineErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  state: EBState = { hasError: false }
  static getDerivedStateFromError(): EBState { return { hasError: true } }
  reset = () => this.setState({ hasError: false })
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

const Fallback = ({ className }: { className?: string }) => (
  <div className={`w-full h-full flex items-center justify-center ${className ?? ''}`}>
    <div className="w-16 h-16 border-4 border-[#00C4B4]/20 border-t-[#00C4B4] rounded-full animate-spin" />
  </div>
)

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <SplineErrorBoundary fallback={<Fallback className={className} />}>
      <Suspense fallback={<Fallback className={className} />}>
        <Spline scene={scene} className={className} />
      </Suspense>
    </SplineErrorBoundary>
  )
}
