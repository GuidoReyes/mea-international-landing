# Task ID: 157

**Title:** Create RegisterModal component with dual registration (email/WhatsApp)

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Build reusable registration modal with tabs for email+password and WhatsApp+OTP flows

**Details:**

Create components/auth/RegisterModal.tsx. Use Radix UI Tabs with 2 tabs: 'WhatsApp' (recommended) and 'Correo electrónico'. WhatsApp tab: phone input + 'Enviar código' button → calls /api/auth-alumno/otp/solicitar, then code input field + verify button → calls /api/auth-alumno/otp/verificar. Email tab: email + password inputs (min 8 chars) + submit → calls /api/auth-alumno/registro. On success both paths: save JWT token, close modal, refresh page or update auth state. Show loading states, error messages. Link to login: '¿Ya tenés cuenta? Iniciá sesión'. Use brand colors, match existing modal patterns (see LegalModal).

**Test Strategy:**

Test both registration flows end-to-end, verify validation (email format, password length, phone format), test error handling (invalid code, duplicate email, rate limits), verify JWT storage, test modal open/close, responsive design
