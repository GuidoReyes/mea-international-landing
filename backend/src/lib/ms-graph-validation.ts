const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Microsoft acepta estos literales en vez de un tenant GUID para apps multi-tenant.
const SPECIAL_TENANTS = new Set(["common", "organizations", "consumers"]);

/**
 * Validates MS_TENANT_ID before it is interpolated into the OAuth token URL
 * (vuln_051). Accepts either a real tenant GUID or one of Microsoft's own
 * special literals — restricting to UUID-only would reject a valid multi-tenant
 * configuration.
 */
export function isValidTenantId(value: string): boolean {
  return UUID_PATTERN.test(value) || SPECIAL_TENANTS.has(value.toLowerCase());
}

/** MS_CLIENT_ID is always an Azure AD application (client) GUID — no special literals. */
export function isValidClientId(value: string): boolean {
  return UUID_PATTERN.test(value);
}
