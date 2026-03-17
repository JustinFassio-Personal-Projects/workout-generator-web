'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { Home } from '../components/Home';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <Home />
    </ProtectedRoute>
  );
}
