import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import {Toaster} from "@/shared/ui/sonner";
import {AuthProvider, EffectorProvider} from "@/providers";

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
  title: "HellConf",
  description: "Приложение для видеконференций",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/logo.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${inter.className} antialiased bg-dark-2`}
      >
        <EffectorProvider>
          <AuthProvider>
            <Toaster richColors />
            {children}
          </AuthProvider>
        </EffectorProvider>
      </body>
    </html>
  );
}
