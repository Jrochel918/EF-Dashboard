'use client';

import { useEffect, useState } from 'react';

export default function AuthCodeErrorPage() {
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#fff',
      fontFamily: 'var(--font-space-grotesk), sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 24px' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.3, marginBottom: 32 }}>
          Advisory
        </p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 16 }}>
          Sign-in didn't work
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#000', opacity: 0.5, lineHeight: 1.7, marginBottom: 40 }}>
          Something went wrong during the Google sign-in process. This usually happens if the link expired or the browser blocked the redirect.
        </p>
        <a href={origin || '/'}
          style={{
            display: 'block', width: '100%', padding: '13px 0', backgroundColor: '#000', color: '#fff',
            textAlign: 'center', textDecoration: 'none',
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
          Try again
        </a>
        <p style={{ marginTop: 24, fontSize: '0.7rem', color: '#000', opacity: 0.35, lineHeight: 1.6 }}>
          If this keeps happening, make sure third-party cookies are enabled in your browser, or try a different browser.
        </p>
      </div>
    </div>
  );
}
