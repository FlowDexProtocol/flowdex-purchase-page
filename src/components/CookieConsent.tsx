'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'fdp_cookie';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alreadySet = false;
    try {
      alreadySet = localStorage.getItem(STORAGE_KEY) != null;
    } catch {
      alreadySet = false;
    }
    if (alreadySet) return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss(value: 'accepted' | 'declined') {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // localStorage unavailable — banner simply won't persist across reloads
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-[380px] rounded-2xl border border-white/[0.06] bg-[rgba(22,22,96,0.95)] px-6 py-5 text-[13px] leading-relaxed text-white/50 backdrop-blur-2xl max-sm:bottom-[70px] max-sm:left-3 max-sm:right-3 max-sm:max-w-none">
      <p>
        We use cookies to improve your experience and analyze site traffic. By continuing, you agree
        to our use of cookies.
      </p>
      <div className="mt-3.5 flex gap-2.5">
        <button
          type="button"
          onClick={() => dismiss('accepted')}
          className="rounded-full bg-white/10 border border-white/[0.15] px-5 py-2 text-xs text-white transition-colors duration-300 hover:bg-white/[0.18] cursor-pointer"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => dismiss('declined')}
          className="rounded-full bg-transparent border border-white/[0.15] px-5 py-2 text-xs text-white transition-colors duration-300 hover:bg-white/[0.18] cursor-pointer"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
