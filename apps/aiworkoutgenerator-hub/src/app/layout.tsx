import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ErrorBoundary } from "@/components/error-boundary";
import { SupportFAB } from "@/components/support/SupportFAB";
import { SessionProvider } from "@/lib/session-tracker";
import { SessionTracker } from "@/components/session-tracker";
import { UpgradeModalProvider } from "@/components/upgrade";
import { ReverseTrialCapabilitiesProvider } from "@/components/reverse-trial/ReverseTrialCapabilitiesContext";
import { ReverseTrialBanner } from "@/components/reverse-trial/ReverseTrialBanner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Workout Generator",
  description: "Your Personal AI Fitness Team",
  openGraph: {
    title: "AI Workout Generator",
    description: "Your Personal AI Fitness Team",
    type: "website",
    images: [
      {
        url: "/images/favicon-for-app/icon1.png",
        width: 96,
        height: 96,
        alt: "AI Workout Generator",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "AI Workout Generator",
    description: "Your Personal AI Fitness Team",
    images: ["/images/favicon-for-app/icon1.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <UpgradeModalProvider>
                <ReverseTrialCapabilitiesProvider>
                  <SessionProvider>
                    <SessionTracker />
                    <ReverseTrialBanner />
                    {children}
                    <SupportFAB />
                  </SessionProvider>
                </ReverseTrialCapabilitiesProvider>
              </UpgradeModalProvider>
            </AuthProvider>
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
