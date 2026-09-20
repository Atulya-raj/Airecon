"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { logoutAction } from "@/app/actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  orgName?: string;
  anomalousCount?: number;
}

export function Sidebar({ orgName = "My Organization", anomalousCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      badge: anomalousCount > 0 ? anomalousCount : undefined,
    },
    {
      href: "/transactions",
      label: "Transactions",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
      ),
    },
    {
      href: "/vendors",
      label: "Vendors",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: "/forecast",
      label: "Forecast",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
    },
    {
      href: "/bank-feeds",
      label: "Bank Feeds",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="app-sidebar flex flex-col bg-[var(--surface-primary)] border-r border-[var(--border-default)]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border-subtle)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white shadow-sm flex-shrink-0">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-[var(--text-primary)] tracking-tight truncate">
            ReconAI
          </h1>
          <p className="text-[11px] text-[var(--text-tertiary)] truncate">
            Smart Reconciliation
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)] shadow-xs"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                }
              `.trim()}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={`flex-shrink-0 transition-colors ${
                  isActive
                    ? "text-[var(--color-primary-600)]"
                    : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-warning-500)] px-1.5 text-[11px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-primary-500)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border-subtle)] px-4 py-4 space-y-3">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--text-tertiary)]">Appearance</span>
          <ThemeToggle />
        </div>

        {/* Org info & Logout */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-xs font-bold text-[var(--text-secondary)] flex-shrink-0">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {orgName}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">Active Session</p>
            </div>
          </div>
          <form action={logoutAction} className="flex-shrink-0">
            <button
              type="submit"
              title="Sign Out"
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--color-danger-500)] hover:bg-[rgba(239,68,68,0.1)] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
