"use client";

import Link from "next/link";
import Image from "next/image";

interface AppLogoProps {
  href?: string;
  size?: number;
}

export function AppLogo({ href = "/dashboard", size = 32 }: AppLogoProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="AI Workout Generator"
    >
      <Image
        src="/images/favicon-for-app/icon1.png"
        alt="AI Workout Generator"
        width={size}
        height={size}
        priority
        className="rounded-lg"
      />
    </Link>
  );
}
