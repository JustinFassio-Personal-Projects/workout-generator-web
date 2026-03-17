import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work with Justin Fassio | Coach Plans - AI Workout Generator",
  description:
    "Get hands-on coaching from Justin Fassio. Training people since 1996. TACP, MFT/UFPM at Fort Hood, San Diego Core Fitness founder. Choose from Coach ($99/mo) or Coach Pro ($199/mo) plans with live classes, 1-on-1 coaching, and program design.",
  openGraph: {
    title: "Work with Justin Fassio | Coach Plans",
    description:
      "Get hands-on coaching from Justin Fassio. Training people since 1996. Real-world coaching experience from military units to fitness businesses.",
    type: "website",
  },
};

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
