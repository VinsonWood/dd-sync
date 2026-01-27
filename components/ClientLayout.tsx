"use client";

import { ThemeProvider } from "./ThemeProvider";
import Sidebar from "./Sidebar";
import TermsOfService from "./TermsOfService";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider>
            <TermsOfService />
            <Sidebar />
            <main className="ml-64">{children}</main>
        </ThemeProvider>
    );
}
