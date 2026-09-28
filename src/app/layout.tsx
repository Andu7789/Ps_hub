import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/ui/header";
import { getCurrentMembership, getMemberships, getUser } from "@/lib/auth";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { PRODUCT_NAME } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` },
  description: "Staff, policies and compliance for small businesses, in one place.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  const [memberships, current] = user ? await Promise.all([getMemberships(), getCurrentMembership()]) : [[], null];
  const brandColor = current?.business.brand_color ?? "#0f766e";

  return (
    <html lang="en-GB" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* Every bg-brand/text-brand utility resolves to this property (see
          globals.css), so the whole portal takes on the business's colour. */}
      <head>
        <style>{`:root { --brand: ${brandColor}; }`}</style>
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Header
          signedIn={Boolean(user)}
          platformAdmin={isPlatformAdminEmail(user?.email)}
          current={current ? { businessId: current.business_id, name: current.business.name, logoUrl: current.business.logo_url } : null}
          businesses={memberships.map((m) => ({ id: m.business_id, name: m.business.name }))}
        />
        <main className="w-full flex-1">{children}</main>
      </body>
    </html>
  );
}
