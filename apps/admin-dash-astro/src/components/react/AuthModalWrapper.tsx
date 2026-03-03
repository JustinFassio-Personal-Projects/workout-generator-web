/**
 * Listens for showAuthModal custom event and renders AuthModal (for admin login page).
 */
import React, { useState, useEffect } from 'react';
import AuthModal from './AuthModal';

const AuthModalWrapper: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('showAuthModal', handler);
    return () => window.removeEventListener('showAuthModal', handler);
  }, []);

  return <AuthModal isOpen={show} onClose={() => setShow(false)} />;
};

export default AuthModalWrapper;
