"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserDropdown } from "@/components/ui/UserDropdown";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dumbbell, Menu } from "lucide-react";
import type { User } from "firebase/auth";
import { AppLogo } from "@/components/app";

interface LandingHeaderProps {
  user: User | null;
  loading: boolean;
  showPricing?: boolean;
}

export function LandingHeader({
  user,
  loading,
  showPricing,
}: LandingHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl transition-all duration-300 overflow-visible">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Menu */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-3/4 sm:max-w-sm">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 mt-8">
                {/* Navigation Links */}
                <nav className="flex flex-col gap-4">
                  {user ? (
                    <>
                      <Link
                        href="/dashboard"
                        onClick={() => setDrawerOpen(false)}
                        className="text-muted-foreground transition-colors hover:text-foreground text-base font-medium"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/daily-checkin"
                        onClick={() => setDrawerOpen(false)}
                        className="text-muted-foreground transition-colors hover:text-foreground text-base font-medium"
                      >
                        Daily Check-In
                      </Link>
                      <Link
                        href="/generate"
                        onClick={() => setDrawerOpen(false)}
                        className="text-muted-foreground transition-colors hover:text-foreground text-base font-medium"
                      >
                        Generate
                      </Link>
                      <Link
                        href="/history"
                        onClick={() => setDrawerOpen(false)}
                        className="text-muted-foreground transition-colors hover:text-foreground text-base font-medium"
                      >
                        Workout History
                      </Link>
                      <Link
                        href="/equipment"
                        onClick={() => setDrawerOpen(false)}
                        className="text-muted-foreground transition-colors hover:text-foreground text-base font-medium"
                      >
                        Equipment
                      </Link>
                      {showPricing && (
                        <Link
                          href="/pricing"
                          onClick={() => setDrawerOpen(false)}
                          className="text-muted-foreground transition-colors hover:text-foreground text-base font-medium"
                        >
                          Upgrade
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      {["Features", "Pricing", "How It Works"].map((item) => (
                        <a
                          key={item}
                          href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                          onClick={() => setDrawerOpen(false)}
                          className="text-muted-foreground transition-colors hover:text-foreground text-base font-medium"
                        >
                          {item}
                        </a>
                      ))}
                    </>
                  )}
                </nav>

                {/* Mode Toggle */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm font-medium text-muted-foreground">
                    Theme
                  </span>
                  <ModeToggle />
                </div>

                {/* Auth Buttons */}
                {!user && !loading && (
                  <div className="flex flex-col gap-3 pt-4 border-t">
                    <Button
                      asChild
                      variant="default"
                      className="rounded-full w-full shadow-lg shadow-primary/20 transition-all"
                    >
                      <Link
                        href="/login?mode=signup"
                        onClick={() => setDrawerOpen(false)}
                      >
                        Get Started
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-full w-full border-primary text-primary bg-transparent hover:bg-primary/10 transition-all"
                    >
                      <Link href="/login" onClick={() => setDrawerOpen(false)}>
                        Login
                      </Link>
                    </Button>
                  </div>
                )}

                {/* User Dropdown for logged in users */}
                {loading ? (
                  <div className="pt-4 border-t">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  </div>
                ) : user ? (
                  <div className="pt-4 border-t">
                    <UserDropdown user={user} />
                  </div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link
            href={user ? "/dashboard" : "/"}
            className="flex items-center gap-3 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              AI Workout Generator
            </span>
          </Link>
        </div>
        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/daily-checkin"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Daily Check-In
              </Link>
              <Link
                href="/generate"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Generate
              </Link>
              <Link
                href="/history"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Workout History
              </Link>
              <Link
                href="/equipment"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Equipment
              </Link>
              {showPricing && (
                <Link
                  href="/pricing"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Upgrade
                </Link>
              )}
            </>
          ) : (
            <>
              {["Features", "Pricing", "How It Works"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item}
                </a>
              ))}
            </>
          )}
        </nav>

        {/* Mobile: logo top right */}
        <div className="flex md:hidden items-center shrink-0">
          <AppLogo href={user ? "/dashboard" : "/"} size={32} />
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <AppLogo href={user ? "/dashboard" : "/"} size={32} />
          <ModeToggle />
          {loading ? (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <UserDropdown user={user} />
          ) : (
            <>
              <Button
                asChild
                variant="default"
                className="rounded-full px-6 shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-0"
              >
                <Link href="/login?mode=signup">Get Started</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full px-6 border-primary text-primary bg-transparent hover:bg-primary/10 transition-all hover:translate-y-[-1px] active:translate-y-0"
              >
                <Link href="/login">Login</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
