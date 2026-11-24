"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";

export type ModuleSubNavItem = {
    href: string;
    label: string;
    mobileLabel?: string;
    icon: string;
};

export const AGENDA_SUB_NAV: ModuleSubNavItem[] = [
    {
        href: "/musician/bookings",
        label: "Reservas",
        mobileLabel: "Reservas",
        icon: "material-symbols:event-upcoming-rounded",
    },
    {
        href: "/musician/calendar",
        label: "Calendario",
        mobileLabel: "Calendario",
        icon: "material-symbols:calendar-view-week-rounded",
    },
    {
        href: "/musician/links",
        label: "Enlaces de pago",
        mobileLabel: "Pagos",
        icon: "material-symbols:add-link-rounded",
    },
];

export const EQUIPO_SUB_NAV: ModuleSubNavItem[] = [
    {
        href: "/musician/members",
        label: "Integrantes",
        mobileLabel: "Integrantes",
        icon: "material-symbols:groups-rounded",
    },
    {
        href: "/musician/payouts",
        label: "Reparto por evento",
        mobileLabel: "Reparto",
        icon: "material-symbols:account-balance-wallet-rounded",
    },
];

export const FINANZAS_SUB_NAV: ModuleSubNavItem[] = [
    {
        href: "/musician/earnings",
        label: "Mis cobros y Retiros",
        mobileLabel: "Cobros",
        icon: "material-symbols:payments-rounded",
    },
    {
        href: "/musician/reports",
        label: "Reportes y Analítica",
        mobileLabel: "Reportes",
        icon: "material-symbols:analytics-rounded",
    },
];

export function DashboardModuleHeader({
    title,
    subtitle,
    subNav,
    subNavAriaLabel = "Secciones del módulo",
    actions,
    badge,
}: {
    title: string;
    subtitle?: string;
    subNav?: ModuleSubNavItem[];
    subNavAriaLabel?: string;
    actions?: ReactNode;
    badge?: ReactNode;
}) {
    const pathname = usePathname();

    return (
        <header className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                        {title}
                    </h1>
                    {badge}
                    {subNav && subNav.length > 0 ? (
                        <nav
                            aria-label={subNavAriaLabel}
                            className="hidden sm:inline-flex items-center gap-1 rounded-full border border-default-200/80 bg-content1 p-1 shadow-xs"
                        >
                            {subNav.map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    pathname.startsWith(`${item.href}/`);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        aria-current={isActive ? "page" : undefined}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                                            isActive
                                                ? "bg-primary/15 text-primary-text"
                                                : "text-default-600 font-semibold hover:text-foreground hover:bg-default-100/70"
                                        }`}
                                    >
                                        <Icon
                                            icon={item.icon}
                                            width={16}
                                            aria-hidden="true"
                                        />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    ) : null}
                </div>

                {actions ? (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {actions}
                    </div>
                ) : null}
            </div>

            {subtitle ? (
                <p className="text-xs sm:text-sm text-default-500 max-w-3xl">
                    {subtitle}
                </p>
            ) : null}

            {subNav && subNav.length > 0 ? (
                <nav
                    aria-label={`${subNavAriaLabel} móvil`}
                    className="grid sm:hidden gap-1 rounded-full border border-default-200/80 bg-content1 p-1 shadow-xs"
                    style={{
                        gridTemplateColumns: `repeat(${subNav.length}, minmax(0, 1fr))`,
                    }}
                >
                    {subNav.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? "page" : undefined}
                                className={`inline-flex items-center justify-center gap-1.5 rounded-full py-2 px-2 text-xs transition-colors ${
                                    isActive
                                        ? "bg-primary/15 text-primary-text font-bold"
                                        : "text-default-600 font-semibold"
                                }`}
                            >
                                <Icon
                                    icon={item.icon}
                                    width={15}
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    {item.mobileLabel ?? item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            ) : null}
        </header>
    );
}

export type KpiStripItem = {
    key: string;
    label: string;
    value: string | number;
    dotClass?: string;
    activeClass?: string;
    href?: string;
    isSelected?: boolean;
    onClick?: () => void;
};

export function DashboardKpiStrip({
    items,
    summaryLabel,
    summaryValue,
    summaryHref,
    onSummaryClick,
    summarySelected = false,
}: {
    items: KpiStripItem[];
    summaryLabel?: string;
    summaryValue?: string | number;
    summaryHref?: string;
    onSummaryClick?: () => void;
    summarySelected?: boolean;
}) {
    return (
        <div className="rounded-2xl border border-default-200/80 bg-content1 p-2.5 sm:px-4 sm:py-2.5 shadow-soft">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                    {items.map((item) => {
                        const baseClass = `inline-flex items-center justify-between sm:justify-start gap-2 rounded-xl border px-3 py-2 sm:py-1.5 text-xs sm:text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                            item.isSelected
                                ? item.activeClass ||
                                  "bg-primary/15 border-primary/40 text-foreground"
                                : "border-transparent bg-default-100/70 sm:bg-transparent hover:bg-default-100 text-default-700"
                        }`;
                        const inner = (
                            <>
                                <span className="inline-flex items-center gap-2 min-w-0">
                                    <span
                                        aria-hidden="true"
                                        className={`size-2.5 rounded-full shrink-0 ${
                                            item.dotClass || "bg-primary"
                                        }`}
                                    />
                                    <span className="truncate font-medium">
                                        {item.label}
                                    </span>
                                </span>
                                <span className="font-extrabold text-foreground tabular-nums">
                                    {item.value}
                                </span>
                            </>
                        );

                        if (item.href) {
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className={baseClass}
                                >
                                    {inner}
                                </Link>
                            );
                        }

                        if (item.onClick) {
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    aria-pressed={Boolean(item.isSelected)}
                                    onClick={item.onClick}
                                    className={baseClass}
                                >
                                    {inner}
                                </button>
                            );
                        }

                        return (
                            <div key={item.key} className={baseClass}>
                                {inner}
                            </div>
                        );
                    })}
                </div>

                {summaryLabel && summaryValue !== undefined ? (
                    summaryHref ? (
                        <Link
                            href={summaryHref}
                            className="inline-flex items-center justify-between sm:justify-end gap-2 rounded-xl border border-transparent bg-default-100/70 sm:bg-transparent px-3 py-2 sm:py-1.5 text-xs sm:text-sm hover:bg-default-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                            <span className="text-default-600 font-medium">
                                {summaryLabel}
                            </span>
                            <span className="font-extrabold text-primary-text text-sm sm:text-base tabular-nums">
                                {summaryValue}
                            </span>
                        </Link>
                    ) : onSummaryClick ? (
                        <button
                            type="button"
                            aria-pressed={summarySelected}
                            onClick={onSummaryClick}
                            className="inline-flex items-center justify-between sm:justify-end gap-2 rounded-xl border border-transparent bg-default-100/70 sm:bg-transparent px-3 py-2 sm:py-1.5 text-xs sm:text-sm hover:bg-default-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                            <span className="text-default-600 font-medium">
                                {summaryLabel}
                            </span>
                            <span className="font-extrabold text-primary-text text-sm sm:text-base tabular-nums">
                                {summaryValue}
                            </span>
                        </button>
                    ) : (
                        <div className="inline-flex items-center justify-between sm:justify-end gap-2 rounded-xl border border-transparent bg-default-100/70 sm:bg-transparent px-3 py-2 sm:py-1.5 text-xs sm:text-sm">
                            <span className="text-default-600 font-medium">
                                {summaryLabel}
                            </span>
                            <span className="font-extrabold text-primary-text text-sm sm:text-base tabular-nums">
                                {summaryValue}
                            </span>
                        </div>
                    )
                ) : null}
            </div>
        </div>
    );
}

export function DashboardPillTabs<T extends string>({
    items,
    selectedKey,
    onSelect,
    ariaLabel,
}: {
    items: Array<{ key: T; label: string; count?: number; icon?: string }>;
    selectedKey: T;
    onSelect: (key: T) => void;
    ariaLabel: string;
}) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            {items.map((pill) => {
                const active = selectedKey === pill.key;
                return (
                    <button
                        key={pill.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onSelect(pill.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                            active
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-content1 text-default-700 border-default-200/80 hover:border-default-300"
                        }`}
                    >
                        {pill.icon ? (
                            <Icon
                                icon={pill.icon}
                                width={15}
                                aria-hidden="true"
                            />
                        ) : null}
                        <span>{pill.label}</span>
                        {pill.count !== undefined ? (
                            <span className="tabular-nums opacity-90">
                                ({pill.count})
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
