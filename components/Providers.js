'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import AdminModeProvider from '@/components/AdminModeProvider';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <AdminModeProvider>{children}</AdminModeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
