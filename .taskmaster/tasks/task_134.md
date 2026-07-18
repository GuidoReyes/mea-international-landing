# Task ID: 134

**Title:** Create new Planes section component with static pricing data

**Status:** done

**Dependencies:** 133 ✓

**Priority:** high

**Description:** Create a new #planes section in app/page.tsx with 2 hardcoded plan cards matching the visual style of the courses section

**Details:**

After the #cursos section (around line 690), insert a new <section id="planes"> with the same styling pattern (bg-[#0A2540], radial gradient overlay, max-w-7xl container). Create a new data array 'planes' with 2 items: 1) Plan Plataforma (Q150/mes) with features: ['Acceso a la plataforma educativa', 'Material digital y clases grabadas', 'Soporte por WhatsApp', 'Sin clases grupales en vivo'], highlighted: false. 2) Plan Plataforma + Grupos (Q300/mes) with features: ['Todo lo del Plan Plataforma', 'Clases grupales en vivo por Zoom', 'Horarios flexibles de clases', 'Certificado al completar nivel'], highlighted: true, badge: 'Más popular'. Use the same card rendering pattern as courses: EvervaultCard visual component, same Tailwind classes for borders/shadows/backgrounds, same feature list checkmark styling (lines 651-659 pattern), same CTA button with WhatsApp link. Use FadeIn wrapper for animations matching courses section. Display 2 cards in a grid: 'grid md:grid-cols-2 gap-8 items-start max-w-5xl mx-auto' for better centering of 2 cards.

**Test Strategy:**

Visual inspection: verify 2 plan cards appear with correct pricing (Q150, Q300), verify 'Más popular' badge on Q300 plan, verify same visual style as courses (EvervaultCard, borders, colors, hover effects). Test responsiveness - cards should stack on mobile. Verify WhatsApp CTA links work. Check build success.
