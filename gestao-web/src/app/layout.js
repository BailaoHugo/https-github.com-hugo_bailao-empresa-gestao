import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Gestão Empresa - Orçamentos",
  description: "Plataforma interna de gestão da empresa Solid Projects",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-PT">
      <body className={`${inter.variable} font-sans antialiased bg-[#f8fafc] text-[#0f172a]`}>
        <div className="max-w-[1400px] mx-auto p-6">
          {children}
        </div>
      </body>
    </html>
  );
}
