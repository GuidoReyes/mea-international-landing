# Task ID: 130

**Title:** Create /clases-en-vivo frontend page with live banner

**Status:** done

**Dependencies:** 129 ✓

**Priority:** medium

**Description:** Implement app/clases-en-vivo/page.tsx with live class banner, weekly schedule grid, and 60s refresh interval

**Details:**

Create `app/clases-en-vivo/page.tsx` with:

1. Server Component wrapper that fetches initial data
2. Client Component with setInterval(60s) to refresh liveNow/nextClass
3. Live banner with pulsing animation when classes are live
4. Weekly schedule grid (only Mon/Tue/Wed/Thu columns)
5. Call-to-action based on session state

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getHorarioClases, type HorarioClasesResponse, nombreDiaSemana, colorAudiencia, colorNivel } from '@/lib/clases-en-vivo';
import { CheckCircle, Clock, Users } from 'lucide-react';
import Link from 'next/link';

export default function ClasesEnVivoPage() {
  const [data, setData] = useState<HorarioClasesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getHorarioClases();
        setData(result);
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh every 60 seconds to update liveNow/nextClass
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);
  
  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12">Cargando...</div>;
  if (!data) return <div className="max-w-7xl mx-auto px-4 py-12">Error cargando horario</div>;
  
  const { horarioSemanal, liveNow, nextClass } = data;
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-[#0A2540] mb-4">Clases en Vivo</h1>
        <p className="text-lg text-slate-600 mb-8">
          Conectate en tiempo real con profesores y compañeros. Horario de Guatemala.
        </p>
        
        {/* Live NOW banner */}
        {liveNow.length > 0 ? (
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-4">EN VIVO AHORA</h2>
            {liveNow.map((clase) => (
              <div key={clase.grupoId} className="mb-4 last:mb-0">
                <p className="text-xl font-semibold">{clase.nombre}</p>
                <p className="text-sm opacity-90">Nivel: {clase.niveles} • Termina a las {clase.horaFin}</p>
              </div>
            ))}
            {/* TODO: Add button logic based on session state */}
            <Link href="/planes" className="inline-block mt-4 bg-white text-red-600 px-6 py-3 rounded-full font-bold hover:bg-slate-100">
              Desbloquear clases en vivo
            </Link>
          </div>
        ) : nextClass ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-bold text-[#0A2540] mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00C4B4]" />
              Próxima clase
            </h2>
            <p className="text-lg">{nextClass.nombre}</p>
            <p className="text-sm text-slate-500">
              {nombreDiaSemana(nextClass.diaSemana)} a las {nextClass.horaInicio} • En {Math.floor(nextClass.minutosHasta / 60)}h {nextClass.minutosHasta % 60}min
            </p>
          </div>
        ) : null}
        
        {/* Weekly schedule grid */}
        <div className="bg-white rounded-2xl border border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-[#0A2540] mb-6">Horario Semanal</h2>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(dia => (
              <div key={dia}>
                <h3 className="font-bold text-[#0A2540] mb-3 text-center">{nombreDiaSemana(dia)}</h3>
                <div className="space-y-3">
                  {horarioSemanal
                    .filter(g => g.horarios.some(h => h.diaSemana === dia))
                    .map(grupo => 
                      grupo.horarios
                        .filter(h => h.diaSemana === dia)
                        .map((horario, idx) => {
                          const isLive = liveNow.some(live => live.grupoId === grupo.id && live.grupoSlug === grupo.slug);
                          return (
                            <div key={`${grupo.id}-${idx}`} className={`p-3 rounded-lg border ${
                              isLive ? 'border-[#00C4B4] bg-[#00C4B4]/5' : 'border-slate-100'
                            }`}>
                              <p className="font-semibold text-sm text-[#0A2540]">{horario.horaInicio}</p>
                              <p className="text-xs font-medium mt-1">{grupo.nombre}</p>
                              <div className="flex gap-1 mt-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${colorAudiencia(grupo.audiencia)}`}>
                                  {grupo.audiencia}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${colorNivel(grupo.niveles)}`}>
                                  {grupo.niveles}
                                </span>
                              </div>
                            </div>
                          );
                        })
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* How it works section */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-[#0A2540] mb-6">¿Cómo funcionan las clases en vivo?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00C4B4]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-[#00C4B4]" />
              </div>
              <h3 className="font-bold mb-2">1. Contratar plan</h3>
              <p className="text-sm text-slate-600">El Plan Profesional incluye clases en vivo ilimitadas</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00C4B4]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-[#00C4B4]" />
              </div>
              <h3 className="font-bold mb-2">2. Revisar horario</h3>
              <p className="text-sm text-slate-600">Elegí el horario que mejor te funcione</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00C4B4]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-[#00C4B4]" />
              </div>
              <h3 className="font-bold mb-2">3. Entrar a Zoom</h3>
              <p className="text-sm text-slate-600">Conectate desde esta página cuando esté en vivo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Use MEA color palette: primary #0A2540, accent #00C4B4 (from app/globals.css).

**Test Strategy:**

Manual test: (1) Visit /clases-en-vivo page, (2) When no class is live, see "Próxima clase" card, (3) Weekly grid shows 4 columns (Mon-Thu) with correct classes, (4) Wait 60s and verify data refreshes via network tab, (5) During a live class, verify "EN VIVO AHORA" banner appears with pulsing animation.
