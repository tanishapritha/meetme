import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "MeetMe",
    description: "Enterprise-grade meeting intelligence.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} antialiased`}>
                <main className="min-h-screen bg-black overflow-hidden font-sans">
                    {children}
                </main>
            </body>
        </html>
    );
}
