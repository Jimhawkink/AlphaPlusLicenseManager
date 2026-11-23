import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'AlphaPlus Software License & DRM Studio | Enterprise Authority',
    description: 'Enterprise Hardware Locking, DRM License Provisioning, and Terminal Security for Alpha Retail and Cloud Systems',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-slate-100 min-h-screen antialiased selection:bg-blue-600 selection:text-white">
                {children}
            </body>
        </html>
    );
}
