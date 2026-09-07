// ══════════════════════════════════════════════════
// src/lib/url-safety.ts
// Validates CMS-sourced URLs before they're used as an <img src> or a link
// href. CMS text fields are admin-editable, plain strings with no server-
// side scheme restriction — an unsanitized javascript:/data:/vbscript:
// value would execute on render or on click.
// ══════════════════════════════════════════════════

// Images: only ever admin-uploaded CDN assets — always absolute https://.
// No legitimate case for a relative path, http://, or any other scheme.
export function sanitizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  return /^https:\/\//i.test(trimmed) ? trimmed : '';
}

// Links: absolute https:// URLs (external CTAs/social links) or a
// same-origin relative path starting with a single "/" (internal nav) are
// both legitimate. Protocol-relative "//" (can point off-domain), and any
// non-https scheme (javascript:, data:, vbscript:, etc.), are not.
export function isSafeLinkUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (/^https:\/\//i.test(trimmed)) return true;
  return trimmed.startsWith('/') && !trimmed.startsWith('//');
}
