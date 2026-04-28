import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEA International — Academia Premium de Inglés Online",
  description:
    "Domina el inglés real con clases personalizadas y resultados rápidos. Más de 2,000 estudiantes en Guatemala y Latinoamérica confían en MEA International.",
  keywords: "inglés online, clases de inglés, academia inglés Guatemala, TOEFL, IELTS, inglés corporativo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#0A2540]">{children}</body>
    </html>
  );
}
