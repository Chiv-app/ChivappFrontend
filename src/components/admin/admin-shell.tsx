"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { ADMIN_NAV, isNavItemActive } from "@/lib/dashboard-nav";

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="max-w-[1400px] mx-auto min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 sm:gap-6 items-start">
                <aside className="lg:sticky lg:top-[calc(var(--app-navbar-height)+1rem)] min-w-0">
                    <div className="rounded-3xl border border-default-200/70 bg-content1 shadow-soft p-2 sm:p-3">
                        <p className="px-3 pt-2 pb-3 text-xs font-semibold uppercase tracking-wide text-default-500">
                            Consola admin
                        </p>
                        <nav className="flex lg:flex-col gap-1 overflow-x-auto overscroll-x-contain lg:overflow-visible pb-1 lg:pb-0 -mx-1 px-1">
                            {ADMIN_NAV.map((item) => {
                                const active = isNavItemActive(pathname, item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                                            active
                                                ? "bg-primary text-primary-foreground"
                                                : "text-default-600 hover:bg-default-100"
                                        }`}
                                    >
                                        <Icon icon={item.icon} width={18} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </aside>
                <div className="min-w-0">{children}</div>
            </div>
        </div>
    );
}
