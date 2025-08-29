import "../styles/globals.css"; // ← global CSS importeres KUN her
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strømsammenligning",
  description: "Finn billigste strømavtale i Norge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body className="antialiased bg-gray-50">
<main className="debug mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6">
  {children}
</main>
      </body>
    </html>
  );
}