'use client';

import { ThemeProvider } from './ThemeProvider';
import Sidebar from './Sidebar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Sidebar />
      <main className="ml-64">
        {children}
      </main>
    </ThemeProvider>
  );
}
