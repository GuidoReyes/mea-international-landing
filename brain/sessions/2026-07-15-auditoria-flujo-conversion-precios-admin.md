---
type: session
area: operaciones
date: 2026-07-15
slug: auditoria-flujo-conversion-precios-admin
title: "Auditoría de flujo de conversión, precios reales Q150/Q300 y refuerzo de seguridad de cuentas admin"
tags: [flow-audit, conversion, otp-whatsapp, precios, planes, seed-admin, admin-fantasma, task-master, prisma, alumno]
status: active
related:
  - 2026-07-15-leccion-duolingo-audio-imagenes-reales
  - 2026-05-13-admin-rediseniado-saas-planificado
  - 2026-05-08-backend-railway-desplegado
sources:
  - repo:FLOW_AUDIT.md
  - repo:.taskmaster/docs/flujo-auditoria-optimizacion.md
  - repo:backend/prisma/schema.prisma
  - repo:backend/src/routes/auth-alumno.ts
  - repo:backend/src/scripts/seed-cursos-online.ts
superseded_by: null
---

# Auditoría de flujo de conversión, precios reales Q150/Q300 y refuerzo de seguridad de cuentas admin

## Contexto

El usuario pidió una auditoría completa del flujo de mea.edu.gt con una "regla de oro" explícita: diagnosticar primero (Fase 1, sin implementar nada) y esperar confirmación antes de tocar código. Tras entregar el diagnóstico, el usuario autorizó ejecución totalmente autónoma para el resto de la sesión ("ejecuta todas las tareas sin pedir permiso me voy a encontrar fuera y no estare para darte click"), lo que se mantuvo como modo de operación por el resto de la sesión. En paralelo se pidieron cambios puntuales de negocio: repreciar los planes con valores reales manteniendo el checkout por depósito, y dos rondas de mantenimiento de cuentas admin (reset de contraseña, eliminación de una cuenta fantasma).

## Decisiones

- **Fase 1 estrictamente diagnóstica**: se entregó `FLOW_AUDIT.md` (tabla CTA→destino→estado, ranking de problemas) sin tocar código, respetando la regla explícita del usuario, y se esperó confirmación antes de generar tasks de Task Master (150-163) e implementar.
- **Checkout se mantiene por depósito, no Recurrente**: decisión explícita del usuario al pedir el repricing — no se tocó el mecanismo de pago, solo los montos y el copy.
- **Planes repreciados con renombrado de slug, no filas nuevas**: `esencial`→`plataforma` (Q150/mes), `profesional`→`plataforma-grupos` (Q300/mes); mismos descuentos 10/20/30% a 3/6/12 meses. `seedPlanes()` hace `findFirst` por slug viejo-o-nuevo antes de `create`/`update`, siguiendo el mismo patrón ya usado para renombrar cursos, para no duplicar filas existentes en producción.
- **Admin fantasma verificado antes de borrar**: cuenta id=3 con email vacío y `activo: true`; se confirmaron 0 referencias FK (`lead.count`, `auditoriaAdmin.count`) antes de `prisma.admin.delete()`. Causa raíz fue `??` en vez de `||` en el fallback de `ADMIN_EMAIL` en `seed-admin.ts` — un `ADMIN_EMAIL=""` vacío no debe crear un admin sin email nunca más.
- **Registro dual para alumnos** (WhatsApp+OTP como opción recomendada, email+password como alternativa): reduce fricción de registro identificada en la auditoría como el mayor cuello de botella de conversión.
- **Lecciones gratis redistribuidas por nivel, no solo por ruta**: primeras 3 lecciones de CADA nivel (A1-C1) dentro de "general" quedan gratis, además de las primeras 3 de cada ruta vocacional — 30 lecciones gratis en total, en vez de estar concentradas solo en los niveles iniciales.

## Output

- Task Master: PRD `.taskmaster/docs/flujo-auditoria-optimizacion.md`, tasks 150-163 (todas `done`).
- `FLOW_AUDIT.md` (raíz del repo) — deliverable de Fase 1.
- Commits: `2d26fef` (precios reales Q150/Q300), `c052356` (flujo: registro dual OTP, lecciones gratis, niveles A1-C1, SEO), `3f5467a` (fix seed-admin: `ADMIN_EMAIL` vacío ya no crea admin fantasma), `db0fac5` (landing enlaza plataforma/portal alumno), `e2343bc` (portal: badge de sesión visible, fix 404 en Continuar, lecciones gratis por nivel), `33fca44` (marcador de puntos en vivo + guardado real + rotación de preguntas).
- Backend: modelo Prisma `OtpCode` nuevo (código de 6 dígitos bcrypt-hasheado, expira 10 min, rate-limit 3/hora); rutas `POST /registro`, `POST /otp/solicitar`, `POST /otp/verificar` en `auth-alumno.ts`; `POST /:id/reset-password` admin-only con `auditLog` en `alumnos.ts`; `GET /mis/progreso` con nuevo campo `rutaSlug` (mapa `RUTA_PRINCIPAL_POR_CURSO`) que arregló el 404 al continuar una lección.
- `backend/src/scripts/marcar-lecciones-gratis.ts` reescrito: agrupa por `capitulo.nivel` dentro de "general", marca primeras 3 de cada nivel.
- Frontend: `components/alumno/RegisterModal.tsx` y `components/alumno/SesionAlumnoBadge.tsx` (nuevos); badge agregado a 5 páginas (`/cursos`, `/cursos/[slug]`, `/clases-en-vivo`, lección, `/mis-cursos`).
- Dos resets de contraseña de `admin@mea.edu.gt` ejecutados en sesiones separadas (contraseña bcrypt-hasheada, entregada en texto plano una sola vez, nunca persistida).
- Admin fantasma (id=3) eliminado tras verificar 0 referencias FK.

## Pendiente

- Ninguno explícito de esta parte — las 14 tasks del PRD de flujo (150-163) quedaron `done`. El pendiente de fondo (expansión a 500 lecciones únicas) vive en [[2026-07-15-leccion-duolingo-audio-imagenes-reales]].

## Cross-refs

- [[2026-07-15-leccion-duolingo-audio-imagenes-reales]] — misma sesión; la política de lecciones gratis por nivel definida acá alimenta directamente el contenido de lecciones de ese nodo.
- [[2026-05-13-admin-rediseniado-saas-planificado]] — panel admin cuya seguridad (reset de contraseña, eliminación de cuenta fantasma) se reforzó en esta sesión.
- [[2026-05-08-backend-railway-desplegado]] — infraestructura Railway donde corrieron las migraciones Prisma (`OtpCode`, `Alumno.whatsapp` único) y los scripts de seed de esta sesión.

## Fuentes

- `repo:FLOW_AUDIT.md`
- `repo:.taskmaster/docs/flujo-auditoria-optimizacion.md`
- `repo:backend/prisma/schema.prisma`
- `repo:backend/src/routes/auth-alumno.ts`
- `repo:backend/src/routes/alumnos.ts`
- `repo:backend/src/scripts/seed-cursos-online.ts`
- `repo:backend/src/scripts/seed-admin.ts`
