import type { Metadata } from "next";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

export const metadata: Metadata = {
  title: "Scanoza - AR Scanner",
  description: "Scan images to unlock hidden AR content",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#18181b',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: 700,
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
