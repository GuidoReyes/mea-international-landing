# Task ID: 67

**Title:** Configure Twilio webhook URL in Twilio console

**Status:** done

**Dependencies:** 66 ✓, 58 ✓

**Priority:** high

**Description:** Set up webhook URL in Twilio Sandbox settings to point to Railway backend endpoint

**Details:**

In Twilio Console:

1. Navigate to Messaging → Try it Out → Send a WhatsApp Message → Sandbox Settings
2. Find "When a message comes in" webhook configuration
3. Set webhook URL: https://<railway-backend-url>/api/twilio/webhook
   - Replace <railway-backend-url> with actual Railway deployment URL (e.g., backend-production-xxxx.up.railway.app)
4. Set HTTP method: POST
5. Click Save
6. For production with dedicated Twilio number: Phone Numbers → Manage → Active Numbers → Select your number → Configure webhook under Messaging

Webhook must be publicly accessible HTTPS URL. Railway provides HTTPS by default. Twilio will call this endpoint whenever admin sends message to Twilio number.

**Test Strategy:**

After configuration, send test message from admin's WhatsApp to Twilio sandbox number. Check Railway logs for incoming webhook request. Verify signature validation passes. Verify webhook responds with 200 status. Twilio console should show successful delivery in logs.
