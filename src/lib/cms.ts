// ══════════════════════════════════════════════════
// src/lib/cms.ts
// Fetches editable page copy from the backend CMS (GET /api/cms/page/:page).
// The real response is a flat object keyed by "section.field" — NOT an
// array — matching flowdex-backend's actual getPageContent() helper.
// Every call site must keep its own hardcoded fallback text: if the API
// is unreachable or a field was never set, cms() falls back to it so the
// site never breaks because the CMS is down.
// ══════════════════════════════════════════════════

import { cache } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.flowdexprotocol.com').replace(/\/$/, '');

export type CmsPageData = Record<string, string>;

// cache() memoizes per server-request — safe for concurrent requests,
// unlike a module-level mutable variable which would leak across them.
export const fetchPageContent = cache(async (page: string): Promise<CmsPageData> => {
  try {
    const res = await fetch(`${API_BASE}/api/cms/page/${encodeURIComponent(page)}`);
    if (!res.ok) return {};
    return (await res.json()) as CmsPageData;
  } catch {
    return {};
  }
});

export function cms(data: CmsPageData, section: string, field: string, fallback: string): string {
  return data[`${section}.${field}`] || fallback;
}
