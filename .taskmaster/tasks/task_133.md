# Task ID: 133

**Title:** Refactor courses section to remove pricing information

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Remove all Quetzal pricing (Q300, Q250, Q1,600) from the existing #cursos section while maintaining the card design and structure

**Details:**

Edit app/page.tsx lines 115-161 to remove the 'price' field from the courses array data structure. Update lines 638-648 to remove the pricing display block while maintaining the card layout integrity. The courses array should retain all other fields: text, title, features, highlighted, and badge. Update the section heading from 'Elige tu plan de inglés' to 'Elige tu curso de inglés' (line 578) to reflect the separation of concepts. Remove or update lines 586-600 that display the Q100 inscription + Q130 platform badges. Update the bottom disclaimer (lines 683-688) to remove pricing references. The CTA button can be changed to 'Ver planes' linking to #planes or remain as 'Inscríbete Ahora' with WhatsApp link - recommend keeping WhatsApp link for continuity.

**Test Strategy:**

Visual inspection in dev mode (npm run dev): verify no Q300/Q250/Q1,600 amounts appear in the courses section, verify card layout remains intact with EvervaultCard visual, features list, and CTA button. Check responsive behavior on mobile breakpoints. Verify build passes with 'next build'.
