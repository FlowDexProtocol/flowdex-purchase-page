'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'flowdex-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'accepted') setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // localStorage unavailable — banner simply won't persist across reloads
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg-soft/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-center text-xs text-ink-dim sm:text-left">We use cookies to improve your experience.</p>
        <button
          onClick={accept}
          className="shrink-0 rounded-xl bg-gradient-to-br from-primary to-[#4E65BB] px-5 py-2 text-xs font-semibold text-[#03131a] transition-transform hover:-translate-y-0.5"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
