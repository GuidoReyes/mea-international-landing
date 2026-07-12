# Task ID: 22

**Title:** Obtener credenciales Meta WhatsApp Business API

**Status:** done

**Dependencies:** 7 ✓

**Priority:** high

**Description:** Conseguir las 5 credenciales necesarias para integrar WhatsApp Cloud API y configurarlas en Railway.

**Details:**

Seguir estos pasos en orden:
1. META_WEBHOOK_VERIFY_TOKEN: Generar con 'openssl rand -hex 16'. Es un token propio que vos elegís.
2. META_APP_SECRET: Ir a developers.facebook.com → tu App → Settings → Basic → App Secret → Show.
3. META_WHATSAPP_TOKEN: En tu App → WhatsApp → API Setup → copiar el Temporary Access Token (o crear uno permanente en System Users).
4. META_PHONE_ID: En tu App → WhatsApp → API Setup → bajo 'From' aparece el Phone Number ID (número largo).
5. META_WABA_ID: En tu App → WhatsApp → API Setup → WhatsApp Business Account ID.
Luego ir a Railway → servicio backend → Variables → agregar las 5 variables con sus valores.

**Test Strategy:**

No test strategy provided.

## Subtasks

### 22.1. Generate META_WEBHOOK_VERIFY_TOKEN using openssl

**Status:** done  
**Dependencies:** None  

Generate a secure random token for webhook verification using openssl command. This is a self-generated token that you control and will be used by Meta to verify your webhook endpoint.

**Details:**

Run the command `openssl rand -hex 16` in terminal to generate a 32-character hexadecimal token. This token is used during Meta's webhook verification process (GET request to /api/meta/webhook) where Meta sends hub.verify_token and expects it to match this value. Copy the generated token value - you will need it for both Meta Business Manager configuration and Railway environment variables. This token is already referenced in backend/src/routes/whatsapp.webhook.ts:33 where it's compared against process.env.META_WEBHOOK_VERIFY_TOKEN.

### 22.2. Obtain META_APP_SECRET from Meta App Dashboard

**Status:** done  
**Dependencies:** None  

Retrieve the App Secret from Meta Business Manager which is used for HMAC-SHA256 signature verification of incoming webhook requests.

**Details:**

Navigate to developers.facebook.com and log in. Select your WhatsApp Business App from the app dashboard. Go to Settings → Basic in the left sidebar. Locate the 'App Secret' field and click 'Show' button. Copy the displayed secret value. This secret is critical for security - it's used in backend/src/middleware/hmac.middleware.ts:12 to verify that incoming webhook POST requests are genuinely from Meta by validating the x-hub-signature-256 header using HMAC-SHA256 cryptographic hashing.

### 22.3. Obtain META_WHATSAPP_TOKEN from Meta App Dashboard

**Status:** done  
**Dependencies:** None  

Get the WhatsApp API access token (temporary or permanent) required for sending messages via the WhatsApp Cloud API.

**Details:**

In your Meta App dashboard at developers.facebook.com, navigate to WhatsApp → API Setup section. Locate the 'Temporary Access Token' field and copy the token value. Note: Temporary tokens expire after 24 hours. For production use, consider creating a permanent System User token: go to Business Settings → System Users → Add → assign WhatsApp permissions → Generate Token. This token will be used in Task 8 (backend/src/lib/whatsapp-send.ts) as the Authorization Bearer token when making POST requests to https://graph.facebook.com/v21.0/{META_PHONE_ID}/messages to send WhatsApp messages.

### 22.4. Obtain META_PHONE_ID from Meta App Dashboard

**Status:** done  
**Dependencies:** None  

Retrieve the Phone Number ID which identifies the WhatsApp Business phone number associated with your app.

**Details:**

In Meta App dashboard at developers.facebook.com, go to WhatsApp → API Setup. In the 'From' section, you will see a 'Phone Number ID' displayed - this is typically a long numeric string (15+ digits). Copy this Phone Number ID value. This ID is used to identify which WhatsApp Business phone number will send messages. It's required as part of the API endpoint URL in Task 8: https://graph.facebook.com/v21.0/{META_PHONE_ID}/messages. The Phone Number ID is different from the actual phone number displayed to users.

### 22.5. Obtain META_WABA_ID and configure all credentials in Railway

**Status:** done  
**Dependencies:** 22.1, 22.2, 22.3, 22.4  

Retrieve the WhatsApp Business Account ID from Meta dashboard and add all 5 environment variables to Railway backend service configuration.

**Details:**

In Meta App dashboard at developers.facebook.com, navigate to WhatsApp → API Setup. Locate the 'WhatsApp Business Account ID' field and copy its value (typically a 15+ digit number). Then go to Railway dashboard at railway.app, select your backend service (mea-international-landing-production), navigate to the Variables tab. Add the following 5 environment variables with their respective values obtained from previous subtasks: META_WEBHOOK_VERIFY_TOKEN (from subtask 1), META_APP_SECRET (from subtask 2), META_WHATSAPP_TOKEN (from subtask 3), META_PHONE_ID (from subtask 4), META_WABA_ID (value just obtained). Click 'Add' or 'Deploy' to save changes. Railway will automatically redeploy the backend service with the new environment variables.
