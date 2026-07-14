'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_ROUTES, apiRequest, clearStoredAuth, getStoredToken, setStoredUser } from '@/config';

export function AuthGuard({ children, allowedRoles = [] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      // Allow login page without auth
      if (pathname === '/login') {
        setReady(true);
        setIsAuthorized(true);
        return;
      }

      const token = getStoredToken();
      if (!token) {
        if (isMounted) {
          router.replace('/login');
          setReady(true);
        }
        return;
      }

      try {
        const response = await apiRequest(API_ROUTES.auth.me);
        if (!isMounted) {
          return;
        }

        const user = response?.data?.user;
        setStoredUser(user);

        // Check role authorization
        if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
          setReady(true);
          setIsAuthorized(false);
          router.replace('/');
          return;
        }

        setReady(true);
        setIsAuthorized(true);
      } catch (error) {
        if (isMounted) {
          clearStoredAuth();
          setReady(true);
          setIsAuthorized(false);
          router.replace('/login');
        }
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [allowedRoles, pathname, router]);

  // Show loading state while verifying authentication
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is verified and authorized, show content
  if (isAuthorized) {
    return children;
  }

  // If not authorized, return null (redirect already happened)
  return null;
}
