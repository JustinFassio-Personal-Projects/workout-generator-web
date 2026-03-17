"use client";

import * as React from "react";
import { signOut } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";
import Image from "next/image";
import Link from "next/link";
import { User } from "firebase/auth";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface UserDropdownProps {
  user: User;
}

export function UserDropdown({ user }: UserDropdownProps) {
  const { tier, openCustomerPortal } = useSubscription();

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error("Failed to open subscription portal:", error);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-full border border-gray-200 w-8 h-8 flex items-center justify-center">
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.displayName || "User"}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <span className="text-xs">
              {user.displayName?.[0] || user.email?.[0] || "U"}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-gray-50 min-w-[180px] w-auto z-[60] py-1"
          side="bottom"
          align="end"
          sideOffset={8}
          alignOffset={0}
        >
          <DropdownMenu.Label className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
            {user.displayName || user.email || "User"}
          </DropdownMenu.Label>
          <DropdownMenu.Item
            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer block w-full text-left whitespace-nowrap outline-none"
            asChild
          >
            <Link href="/dashboard" className="block w-full">
              Dashboard
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer block w-full text-left whitespace-nowrap outline-none"
            asChild
          >
            <Link href="/history" className="block w-full">
              Workout History
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer block w-full text-left whitespace-nowrap outline-none"
            asChild
          >
            <Link href="/profile" className="block w-full">
              Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer block w-full text-left whitespace-nowrap outline-none"
            asChild
          >
            <Link href="/equipment" className="block w-full">
              Equipment
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          <DropdownMenu.Item
            className={`px-4 py-2 block w-full text-left whitespace-nowrap outline-none ${
              tier === "free"
                ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            }`}
            disabled={tier === "free"}
            onSelect={(event) => {
              event.preventDefault();
              if (tier === "free") return;
              void handleManageSubscription();
            }}
          >
            {tier === "free" ? "No active subscription" : "Manage subscription"}
          </DropdownMenu.Item>
          {tier !== "elite" && (
            <DropdownMenu.Item
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer block w-full text-left whitespace-nowrap outline-none"
              asChild
            >
              <Link href="/pricing" className="block w-full">
                Upgrade
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          <DropdownMenu.Item
            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer block w-full text-left whitespace-nowrap outline-none"
            onSelect={signOut}
          >
            Sign Out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
