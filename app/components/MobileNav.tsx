"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileNavProps {
  anomalousCount?: number;
}

export function MobileNav({ anomalousCount = 0 }: MobileNavProps) {
  const pathname = usePathname();

  const items = [
    {
      href: "/dashboard",
      label: "Home",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      href: "/reconcile",
      label: "Reconcile",
      badge: anomalousCount > 0 ? anomalousCount : undefined,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      href: "/transactions",
      label: "Transactions",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
      ),
    },
    {
      href: "/forecast",
      label: "Forecast",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
    },
    {
      href: "/bank-feeds",
      label: "Banks",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="7" cy="15" r="1" />
        </svg>
      ),
    },
    {
      href: "/settings",
      label: "Settings",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-surface border-t border-[var(--border-default)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl
                transition-all duration-200 min-w-[56px]
                ${
                  isActive
                    ? "text-[var(--color-primary-600)]"
                    : "text-[var(--text-tertiary)]"
                }
              `.trim()}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-warning-500)] px-1 text-[9px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--color-primary-500)]" />
              )}
            </Link>
          );
        })}
      </div>
      {/* Safe area for iPhones */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
