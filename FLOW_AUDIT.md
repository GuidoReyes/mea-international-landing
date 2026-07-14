# FLOW_AUDIT.md — Auditoría del flujo de mea.edu.gt

Fecha: 2026-07-12 · Auditado contra el código real en `main` (commit `2d26fef`) y la DB de producción.

## 1. Tabla: Sección → CTA → Destino real → Estado

| # | Sección | Botón / CTA | Destino en el código | Estado |
|---|---|---|---|---|
| 1 | Navbar | Inicio / Cursos / Planes / Nosotros / Testimonios / FAQ | anclas `#...` | ✅ OK |
| 2 | Navbar | "Plataforma" | `/cursos` | ✅ OK (agregado hoy) |
| 3 | Navbar | "Portal Alumno" | `/alumno/login` | ✅ OK (agregado hoy) |
| 4 | Navbar | CTA WhatsApp | `wa.me/50256311728` | ✅ OK |
| 5 | Hero | "Inscríbete Ahora" | WhatsApp | ✅ OK (convierte fuera del sitio) |
| 6 | Hero | "Ver Cursos" | `#cursos` (niveles, sin precio) | ⚠️ Conecta, pero el camino a plan tiene 2 saltos |
| 7 | Stats | — (sin CTA) | — | ➖ Sección informativa |
| 8 | **Features ("¿Por qué elegir MEA?", tabs)** | **"Inscríbete Ahora" (tab 1)** | **NINGUNO — `<Button>` sin href/onClick** | ❌ **DEAD BUTTON** |
| 9 | Features | **"Ver Testimonios" (tab 2)** | **NINGUNO** | ❌ **DEAD BUTTON** |
| 10 | Features | **"Inscríbete Ahora" (tab 3)** | **NINGUNO** | ❌ **DEAD BUTTON** |
| 11 | Testimonios ("Alumnos") | — (sin CTA propio) | — | ⚠️ No conecta a conversión |
| 12 | World Map | CTA WhatsApp | WhatsApp | ✅ OK |
| 13 | Cursos `#cursos` (niveles Pre A/B1 B2/VIP) | "Ver planes" | `#planes` | ✅ OK (corregido hoy; sin precios) |
| 14 | Planes `#planes` (Q150/Q300) | "Inscríbete Ahora" | WhatsApp | ✅ OK |
| 15 | Planes `#planes` | "Elegí tu plan y pagá con depósito" | `/planes` | ✅ OK (agregado hoy) |
| 16 | Planes `#planes` | "Entrá al portal de alumnos" | `/alumno/login` | ✅ OK (agregado hoy) |
| 17 | FAQ | link WhatsApp | WhatsApp | ✅ OK |
| 18 | CTA final | "Inscríbete Ahora" | WhatsApp | ✅ OK |
| 19 | Footer | nav completo + tel + redes | anclas + páginas + `tel:` | ✅ OK (ampliado hoy) |
| 20 | Cookies (modal legal) | "Política de Privacidad" | **`href="#"`** | ❌ **Link muerto** |
| 21 | Botón flotante WhatsApp | WhatsApp | WhatsApp | ✅ OK |

Rutas destino verificadas en el App Router: `/cursos`, `/cursos/[slug]`, `/cursos/[slug]/leccion/[slug]`, `/planes`, `/checkout/[planPrecioId]`, `/clases-en-vivo`, `/alumno/login`, `/mis-cursos` — todas existen y compilan.

## 2. Problemas encontrados (ordenados por impacto en conversión)

1. **No existe auto-registro de alumnos.** Los alumnos solo pueden ser creados por el admin. El funnel "probar lección gratis → crear cuenta → pagar plan" **no puede cerrar solo**: quien llega a una lección bloqueada no tiene forma de registrarse. Es el mayor freno estructural a la conversión online.
2. **3 botones muertos en la sección Features** (los "Inscríbete Ahora" de las tabs 1 y 3, y "Ver Testimonios"): el usuario hace clic y no pasa nada — pérdida directa de intención de compra en una sección de venta.
3. **Las lecciones gratis casi no existen y están mal repartidas:** solo 5 lecciones con `esGratis` en toda la plataforma (2 de general, 2 de talleres, 1 de oficina). Las rutas **Viajar, Restaurantes, Técnicos PC y Call Center tienen CERO lecciones gratis** — su página de ruta no ofrece nada probable sin pagar.
4. **Las rutas vocacionales (el diferenciador) no aparecen en la landing.** Existen 7 rutas publicadas en `/cursos` pero la home no las menciona; la sección "Cursos" de la landing muestra niveles genéricos.
5. **`/planes` no soporta segmentación por nivel** (`?nivel=`): no hay forma de que una tarjeta de nivel lleve al plan con contexto, ni de pasar esa señal al CRM.
6. **Cero SEO técnico:** no hay `sitemap.ts` ni `robots.ts`; las lecciones gratis (cuando existan) no están optimizadas para indexarse — se pierde la ventaja frente a Papora (que exige cuenta hasta para mirar).
7. **Link muerto a Política de Privacidad** dentro del modal de cookies (`href="#"`) — menor, pero es exactamente el tipo de dead-end que pedía cazar el prompt.

## 3. Diagrama del flujo actual (texto)

```
Usuario entra a mea.edu.gt
 ├─ Hero ──"Inscríbete"──────────────► WhatsApp (sale del sitio; convierte Mirce/bot)
 ├─ Hero ──"Ver Cursos"──► #cursos ──"Ver planes"──► #planes ─┬─► WhatsApp
 │                                                            ├─► /planes ► /checkout ► depósito+boleta ✅
 │                                                            └─► /alumno/login (solo si YA tiene cuenta)
 ├─ Features ──"Inscríbete Ahora"──► ∅ (click muerto) ❌
 ├─ Nav "Plataforma" ──► /cursos ► ruta ► lección
 │        ├─ lección gratis (solo 5 en total) ──► se puede completar sin pagar ⚠️
 │        └─ lección de pago sin sesión ──► pantalla de bloqueo SIN opción de registrarse ❌ (callejón)
 └─ Sale (rebote)
```

**Conclusión:** después del enlazado de hoy, el camino *WhatsApp* y el camino *pagar con depósito* están completos. El camino *probar gratis → registrarse solo → pagar* — el que escala sin humanos — **no existe**: le faltan las lecciones gratis distribuidas, el registro self-service (email o teléfono+OTP) y el muro con modal de registro.

## 4. Estado de los requisitos de Fase 2 vs. el repo (lo que ya está hecho)

| Requisito del prompt | Estado |
|---|---|
| Rutas vocacionales General/Restaurantes/Call Center/Oficina | ✅ Ya existen (+3 más) en `/cursos/[slug]` |
| `isFree`/`order` en el schema | ✅ Ya existen (`Leccion.esGratis`, `RutaLeccion.orden`) |
| Contraseñas hasheadas, admin sin ver contraseñas | ✅ Ya se cumple (bcrypt + cookie httpOnly) |
| Reset de contraseña desde admin | ⚠️ Existe tempPassword al crear; falta botón "Resetear" en la ficha |
| Tarjetas de nivel A1-C1, `?nivel=`, LessonGate, RegisterModal, OTP WhatsApp, sitemap | ❌ Por construir (Fase 2) |
| Colores #1F3D61/#D96371 del prompt | ✖️ Se usarán los reales de la marca: #0A2540/#00C4B4 |
