import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
    title: "dd视频同步",
    description: "类似 bili-sync 的视频同步工具",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <head>
                <meta name="referrer" content="no-referrer" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            try {
                                const theme = localStorage.getItem('theme') || 'system';
                                let isDark = false;

                                if (theme === 'dark') {
                                    isDark = true;
                                } else if (theme === 'light') {
                                    isDark = false;
                                } else {
                                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                }

                                if (isDark) {
                                    document.documentElement.classList.add('dark');
                                }
                            } catch (e) {}
                        `,
                    }}
                />
            </head>
            <body className="bg-gray-50 dark:bg-gray-950">
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
