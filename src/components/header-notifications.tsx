"use client";

import { BellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Header notifications — placeholder until Phase 4c (Tasks) lights this up
 * with real unread events. Per Spec §6.2: a bell icon is part of the
 * intended chrome from day 1, even if there's nothing to notify about
 * yet, so users learn where to look.
 */
export function HeaderNotifications() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
          />
        }
      >
        <BellIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <div className="px-3 py-6 text-center">
          <BellIcon className="text-muted-foreground/40 mx-auto size-6" />
          <p className="text-muted-foreground mt-2 text-xs">
            You&apos;re all caught up.
          </p>
          <p className="text-muted-foreground/70 mt-1 text-[10px]">
            Task notifications will appear here once the Tasks module ships.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
