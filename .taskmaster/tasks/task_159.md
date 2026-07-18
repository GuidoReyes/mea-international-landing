# Task ID: 159

**Title:** Implement OTP generation and WhatsApp delivery backend

**Status:** done

**Dependencies:** 158 ✓

**Priority:** high

**Description:** Create backend endpoints for OTP request and verification using existing sendWhatsAppMessage

**Details:**

In backend/src/routes/auth-alumno.ts add: POST /otp/solicitar - validates phone number format, checks rate limit (max 3 codes per hour per number via OtpCode records), generates 6-digit numeric code, hashes with bcrypt (BCRYPT_ROUNDS), stores in OtpCode with 10min expiry, sends via sendWhatsAppMessage() from lib/whatsapp-send.ts with message 'Tu código de verificación MEA: {código}. Válido 10 minutos.'. Returns success/error (don't expose code in response). POST /otp/verificar - takes whatsapp + codigo, finds unexpired unused OtpCode, verifies hash with bcrypt.compare, if valid: mark usado=true, create/login Alumno (generate carnet like WEB-{nextId}), return JWT. Implement cleanup cron to delete expired codes.

**Test Strategy:**

Test /otp/solicitar with valid/invalid phones, verify WhatsApp message received with 6-digit code, test rate limiting (4th request in hour should fail), test /otp/verificar with correct/incorrect/expired codes, verify Alumno created with only whatsapp, verify JWT returned and works, test error cases
