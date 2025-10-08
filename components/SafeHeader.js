import dynamic from 'next/dynamic';
import React from 'react';

const Header = dynamic(() => import('./Header')
  .then(mod => {
    const H = mod.default ?? mod.Header ?? mod;
    // Validate it's a function or a valid React component before using
    if (typeof H !== 'function' && typeof H !== 'object') {
      return () => null;
    }
    return H;
  })
  .catch(() => Promise.resolve(() => null)),
  { ssr: false, loading: () => null }
);

export default function SafeHeader(props) {
  return <Header {...props} />;
}