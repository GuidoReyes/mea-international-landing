# Task ID: 34

**Title:** Create notification service with WhatsApp and Microsoft Graph email

**Status:** done

**Dependencies:** 24 ✓

**Priority:** medium

**Description:** Build notification utilities for admin alerts on new leads via WhatsApp and transactional emails via MS Graph API

**Details:**

Create backend/src/services/notifications.ts. Function notifyAdminNewLead(lead): call sendWhatsAppMessage(process.env.ADMIN_WA_NUMBER, `🆕 Nuevo lead\n📱 +${lead.telefono}\n💬 ${lead.interes || 'Sin mensaje'}`). Function sendTransactionalEmail(to, subject, html): implement OAuth2 client_credentials flow with MS Graph. POST to https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token with client_id, client_secret, scope=https://graph.microsoft.com/.default. Cache token in memory (expires 3600s). POST to https://graph.microsoft.com/v1.0/users/{ADMIN_EMAIL}/sendMail with body: {message:{subject, body:{contentType:'HTML',content:html}, toRecipients:[{emailAddress:{address:to}}]}}. Add env vars: ADMIN_WA_NUMBER, ADMIN_EMAIL, MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET. Update backend/src/routes/whatsapp.webhook.ts: after guardarMensajes(), check if lead just created (track this with boolean or check conversaciones.length === 1), call notifyAdminNewLead(lead) without await (fire and forget).

**Test Strategy:**

Create new lead via WhatsApp webhook, verify admin receives WhatsApp notification. Test sendTransactionalEmail separately with test email, verify email arrives (check spam). Mock MS Graph in tests to avoid real API calls.

## Subtasks

### 34.1. Create notifications service with WhatsApp admin alert function

**Status:** done  
**Dependencies:** None  

Create backend/src/services/notifications.ts with notifyAdminNewLead function that sends formatted WhatsApp messages to admin

**Details:**

Create backend/src/services/notifications.ts file. Import sendWhatsAppMessage from '../lib/whatsapp-send'. Define Lead type with properties: telefono (string), interes (string | null). Export async function notifyAdminNewLead(lead: Lead): Promise<void>. Inside function: get adminNumber from process.env.ADMIN_WA_NUMBER, construct message template: `🆕 Nuevo lead\n📱 +${lead.telefono}\n💬 ${lead.interes || 'Sin mensaje'}`. Call sendWhatsAppMessage(adminNumber, message) but don't await (fire and forget). Wrap in try-catch to log errors without throwing. Follow existing code patterns from whatsapp-send.ts (error handling, logging format).

### 34.2. Implement Microsoft Graph OAuth2 token management with in-memory caching

**Status:** done  
**Dependencies:** 34.1  

Add MS Graph OAuth2 client_credentials flow with token caching to notifications.ts

**Details:**

In backend/src/services/notifications.ts, add interface MSGraphToken { access_token: string; expires_at: number }. Create module-level variable: let cachedToken: MSGraphToken | null = null. Export async function getMSGraphToken(): Promise<string>. Check if cachedToken exists and expires_at > Date.now(), return cached token if valid. Otherwise, fetch new token: POST to https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token with body (URL-encoded): grant_type=client_credentials, client_id=MS_CLIENT_ID, client_secret=MS_CLIENT_SECRET, scope=https://graph.microsoft.com/.default. Parse response, cache token with expires_at = Date.now() + (expires_in * 1000) - 60000 (subtract 60s buffer). Return access_token. Add error handling for missing env vars and failed requests.

### 34.3. Implement sendTransactionalEmail function with MS Graph API

**Status:** done  
**Dependencies:** 34.2  

Create sendTransactionalEmail function that uses MS Graph /sendMail endpoint with OAuth2 token

**Details:**

In backend/src/services/notifications.ts, export async function sendTransactionalEmail(to: string, subject: string, html: string): Promise<void>. Call getMSGraphToken() to get access token. Construct request body: { message: { subject, body: { contentType: 'HTML', content: html }, toRecipients: [{ emailAddress: { address: to }}], from: null }}. POST to https://graph.microsoft.com/v1.0/users/${process.env.ADMIN_EMAIL}/sendMail with headers: Authorization: 'Bearer ' + token, Content-Type: 'application/json'. Check response.ok, throw error if failed. Add console.log for success: '[Email] Sent to ${to} - ${subject}'. Handle errors with try-catch, log but don't throw (fire and forget pattern). Add env vars validation at function start.

### 34.4. Integrate admin notification into WhatsApp webhook for new leads

**Status:** done  
**Dependencies:** 34.1  

Update whatsapp.webhook.ts to call notifyAdminNewLead when a new lead is created

**Details:**

In backend/src/routes/whatsapp.webhook.ts, import notifyAdminNewLead from '../services/notifications'. In POST route after guardarMensajes() call (line 74), detect if this is a new lead: query conversaciones count before guardarMensajes or track if lead was just created. Add logic: after guardarMensajes succeeds, check if this was first conversation for lead. If yes, call notifyAdminNewLead({ telefono, interes: null }) without await (fire and forget). Wrap in try-catch to prevent notification failure from affecting webhook. Add environment variables to .env.example: ADMIN_WA_NUMBER, ADMIN_EMAIL, MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET. Update backend/.env.example with these new variables and descriptions.
