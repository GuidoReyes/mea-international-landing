/**
 * True when `url` is inside the configured R2 public bucket (same origin as
 * `publicUrlPrefix`, not just a string that happens to start with it — otherwise
 * "https://media.mea.edu.gt.evil.com" would pass a naive startsWith check).
 */
export function isTrustedR2Url(url: string, publicUrlPrefix: string): boolean {
  try {
    const target = new URL(url);
    const trusted = new URL(publicUrlPrefix);
    return target.protocol === trusted.protocol && target.host === trusted.host;
  } catch {
    return false;
  }
}
