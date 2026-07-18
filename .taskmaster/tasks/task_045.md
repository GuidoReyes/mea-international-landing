# Task ID: 45

**Title:** Add Phase 2 models: Abono, Certificado, AuditoriaAlumno, Egreso, Campana

**Status:** done

**Dependencies:** 28 ✓

**Priority:** medium

**Description:** Extend Prisma schema with finance, certification, and marketing campaign models

**Details:**

Add to schema.prisma: Abono (id, pagoId FK, monto DECIMAL(10,2), fecha default now(), nota? String), Certificado (id, inscripcionId unique FK, alumnoId FK, codigo unique String (8 hex), urlPdf?, urlQr?, emitidoEn default now(), activo default true), AuditoriaAlumno (id, alumnoId FK, accion, detalle?, adminId?, ip?, creadoEn), Egreso (id, concepto String, monto DECIMAL(10,2), moneda default 'GTQ', categoria enum SALARIO|COMISION|OPERATIVO|MARKETING, fecha DateTime, activo default true), CampanaWhatsApp (id, nombre, template String @db.Text, variables Json?, estado default 'BORRADOR' enum BORRADOR|ENVIANDO|COMPLETADA, totalDestinatarios default 0, enviados default 0, errores default 0, creadoEn, actualizadoEn), CampanaDestinatario (id, campanaId FK, leadId FK, estado default 'PENDIENTE' enum PENDIENTE|ENVIADO|ERROR, error?, enviadoEn?). Add Abono relation to Pago, Certificado relations to Inscripcion and Alumno. Run npx prisma migrate dev --name fase2-models.

**Test Strategy:**

Run migration successfully. Use Prisma Studio to verify models and relations. Test JSON variables field in CampanaWhatsApp stores/retrieves correctly.
