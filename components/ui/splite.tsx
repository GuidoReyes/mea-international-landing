'use client'

import { Suspense, lazy, Component, type ReactNode } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

interface ErrorBoundaryState { hasError: boolean }

class SplineErrorBoundary extends Component<{ children: ReactNode; className?: string }, ErrorBoundaryState> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className={`w-full h-full flex items-center justify-center ${this.props.className ?? ''}`}>
          <div className="w-12 h-12 border-4 border-[#00C4B4]/30 rounded-full" />
        </div>
      )
    }
    return this.props.children
  }
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <SplineErrorBoundary className={className}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#00C4B4] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Spline scene={scene} className={className} />
      </Suspense>
    </SplineErrorBoundary>
  )
}
