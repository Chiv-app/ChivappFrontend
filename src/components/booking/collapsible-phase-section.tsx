"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

type Props = {
    icon: string;
    title: string;
    summary?: string;
    /** Ya completado (colapsa por defecto) vs. aún pendiente (expandido). */
    done?: boolean;
    doneLabel?: string;
    pendingLabel?: string;
    /** Fuerza un texto libre para el badge a la derecha. Si se provee, ignora doneLabel/pendingLabel. */
    customBadgeLabel?: string;
    /** Fuerza un color para el badge a la derecha. 'default' | 'success' | 'warning' */
    customBadgeColor?: "default" | "success" | "warning";
    /** Fuerza el estado inicial; por defecto se deriva de `done`. */
    defaultExpanded?: boolean;
    children: React.ReactNode;
};

export default function CollapsiblePhaseSection({
    icon,
    title,
    summary,
    done = true,
    doneLabel = "Completado",
    pendingLabel = "Pendiente",
    customBadgeLabel,
    customBadgeColor,
    defaultExpanded,
    children,
}: Props) {
    const [expanded, setExpanded] = useState(defaultExpanded ?? !done);

    const isSuccess = customBadgeColor === "success" || (!customBadgeColor && done);
    const isWarning = customBadgeColor === "warning" || (!customBadgeColor && !done);
    const isDefault = customBadgeColor === "default";

    const badgeText = customBadgeLabel || (done ? doneLabel : pendingLabel);

    let iconColorClass = "bg-default-100 text-default-600";
    if (isSuccess) iconColorClass = "bg-success/15 text-success";
    if (isWarning) iconColorClass = "bg-warning/15 text-warning";

    let badgeColorClass = "bg-default-100 text-default-600";
    if (isSuccess) badgeColorClass = "bg-success/15 text-success";
    if (isWarning) badgeColorClass = "bg-warning/15 text-warning";

    return (
        <div className="flex flex-col gap-3">
            <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-default-200/70 bg-content1 px-5 py-3.5 text-left shadow-soft hover:border-default-300 transition-colors"
            >
                <span className="flex items-center gap-3 min-w-0">
                    <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconColorClass}`}
                    >
                        <Icon icon={icon} width={20} />
                    </span>
                    <span className="min-w-0">
                        <span className="block font-bold text-foreground truncate">
                            {title}
                        </span>
                        {summary ? (
                            <span className="block text-xs text-default-500 truncate">
                                {summary}
                            </span>
                        ) : null}
                    </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                    <span
                        className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeColorClass}`}
                    >
                        {badgeText}
                    </span>
                    <Icon
                        icon="material-symbols:keyboard-arrow-down-rounded"
                        width={22}
                        className={`text-default-500 transition-transform duration-300 ${
                            expanded ? "rotate-180" : ""
                        }`}
                    />
                </span>
            </button>

            {expanded ? <div className="animate-fade-in-up">{children}</div> : null}
        </div>
    );
}
