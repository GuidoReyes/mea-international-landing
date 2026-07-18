# Task ID: 57

**Title:** Setup Twilio account and WhatsApp Sandbox configuration

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Create Twilio account, configure WhatsApp Sandbox, perform admin opt-in, and document credentials

**Details:**

1. Create Twilio account at twilio.com using ghreyes.montenegro@gmail.com
2. Navigate to Messaging → Try it Out → Send a WhatsApp Message → Sandbox
3. Note the sandbox number (e.g., whatsapp:+14155238886) and join code
4. From admin's personal WhatsApp (+50256311728 or actual admin number), send 'join <code>' to the sandbox number to complete opt-in
5. Document the following credentials:
   - TWILIO_ACCOUNT_SID (from console)
   - TWILIO_AUTH_TOKEN (from console)
   - TWILIO_WHATSAPP_NUMBER (sandbox number in format whatsapp:+14155238886)
   - ADMIN_TWILIO_WHATSAPP (admin's personal number in format whatsapp:+502XXXXXXXX)
6. For production, consider upgrading to dedicated Twilio number with WhatsApp Business API approval
7. Store credentials securely for Railway deployment

**Test Strategy:**

Verify opt-in by sending a test message from Twilio console to admin's WhatsApp. Confirm message is received. Verify all four credentials are documented and formatted correctly.
