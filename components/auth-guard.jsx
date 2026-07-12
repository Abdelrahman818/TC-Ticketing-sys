'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_ROUTES, apiRequest, clearStoredAuth, getStoredToken, setStoredUser } from '@/config';

export function AuthGuard({ children, allowedRoles = [] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      if (pathname === '/login') {
        setReady(true);
        return;
      }

      const token = getStoredToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const response = await apiRequest(API_ROUTES.auth.me);
        if (!isMounted) {
          return;
        }

        const user = response?.data?.user;
        setStoredUser(user);

        if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
          router.replace('/');
          return;
        }

        setReady(true);
      } catch (error) {
        clearStoredAuth();
        router.replace('/login');
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [allowedRoles, pathname, router]);

  if (!ready) {
    return null;
  }

  return children;
}
