# Task ID: 58

**Title:** Configure Twilio environment variables in Railway

**Status:** done

**Dependencies:** 57 ✓

**Priority:** high

**Description:** Add Twilio credentials and admin WhatsApp number to Railway backend service environment variables

**Details:**

In Railway dashboard for the backend service:
1. Add TWILIO_ACCOUNT_SID from Twilio console
2. Add TWILIO_AUTH_TOKEN from Twilio console
3. Add TWILIO_WHATSAPP_NUMBER in format whatsapp:+14155238886 (sandbox or dedicated number)
4. Add ADMIN_TWILIO_WHATSAPP in format whatsapp:+502XXXXXXXX (admin's personal number that completed opt-in)
5. Verify MIRCE_PERSONAL_PHONE is already configured (should be 50250191753 per .env.example)
6. Trigger Railway redeploy to load new environment variables
7. Check deployment logs to ensure no missing environment variable errors

**Test Strategy:**

After deployment, verify environment variables are accessible by checking Railway logs. Optionally add a temporary health check endpoint that confirms Twilio credentials are present (without exposing values).
