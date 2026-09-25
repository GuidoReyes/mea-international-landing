'use client'

import { Suspense, lazy, useEffect, useState } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

// Mientras se difiere/carga Spline, se muestra un fondo con degradé de marca
// en vez de una zona vacía — el PRD de SEO detectó esta caja del hero como
// "espacio en blanco con spinner" en una auditoría con Lighthouse.
const cargador = (
  <div className="w-full h-full flex items-center justify-center rounded-3xl bg-gradient-to-br from-[#00C4B4]/10 via-[#0A2540] to-[#0A2540] overflow-hidden">
    <div className="relative flex items-center justify-center">
      <span className="absolute w-24 h-24 rounded-full bg-[#00C4B4]/20 animate-pulse-ring" aria-hidden="true" />
      <span className="loader"></span>
    </div>
  </div>
)

export function SplineScene({ scene, className }: SplineSceneProps) {
  // El runtime de Spline pesa ~2MB (JS + WASM + escena) y tarda ~10s de CPU
  // en dispositivos móviles — con lazy() solo, el import() se dispara apenas
  // monta el componente, compitiendo con LCP/TTI del hero (confirmado con
  // Lighthouse: Performance 39/100, TBT 5.9s, atribuible casi en su totalidad
  // a este componente). Se difiere el montaje hasta que el navegador esté
  // ocioso, para no bloquear la carga inicial de la página.
  const [listo, setListo] = useState(false)

  useEffect(() => {
    // requestIdleCallback dispara demasiado rápido (apenas termina el primer
    // render) y el trabajo pesado de Spline seguía cayendo dentro de la
    // ventana de medición de TTI de Lighthouse. Esperar al evento "load"
    // completo de la página (todos los recursos iniciales ya resueltos) más
    // un margen adicional empuja la carga del runtime 3D bien después de esa
    // ventana, sin afectar la experiencia real del usuario.
    let cancelado = false
    const empezar = () => {
      if (!cancelado) setListo(true)
    }
    if (document.readyState === "complete") {
      const id = setTimeout(empezar, 1500)
      return () => clearTimeout(id)
    }
    let timeoutId: ReturnType<typeof setTimeout>
    const onLoad = () => {
      timeoutId = setTimeout(empezar, 1500)
    }
    window.addEventListener("load", onLoad, { once: true })
    return () => {
      cancelado = true
      window.removeEventListener("load", onLoad)
      clearTimeout(timeoutId)
    }
  }, [])

  if (!listo) return cargador

  return (
    <Suspense fallback={cargador}>
      <Spline
        scene={scene}
        className={className}
      />
    </Suspense>
  )
}
