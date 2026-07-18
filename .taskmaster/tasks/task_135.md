# Task ID: 135

**Title:** Add inscription badge and disclaimer to Planes section

**Status:** done

**Dependencies:** 134 ✓

**Priority:** medium

**Description:** Add a prominent Q100 inscription badge above the plan cards and a clear disclaimer below explaining the one-time payment structure

**Details:**

In the #planes section, before the plan cards grid, add a centered badge similar to lines 589-592 pattern but adapted: Single badge showing 'Q100 inscripción' with 'pago único' label, using same styling (bg-white/5 border border-white/10 rounded-full). After the plan cards grid, add a FadeIn wrapper with disclaimer text: 'Todos los planes requieren una inscripción única de Q100 (pago único, no se repite cada mes). Las mensualidades del plan elegido se pagan por separado, sin acumularse con la inscripción.' Use text-slate-500 text-sm styling matching line 683 pattern but with enhanced clarity about non-accumulation. Add section header before cards: 'Planes de Pago Mensual' with subtitle explaining flexible payment options.

**Test Strategy:**

Visual inspection: verify Q100 badge displays clearly with 'pago único' label, verify disclaimer text is readable and clearly explains the one-time nature of inscription fee. Test on mobile to ensure text wraps properly. Verify semantic HTML structure is accessible.
