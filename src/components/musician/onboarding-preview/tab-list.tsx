"use client";

import { useRef, type KeyboardEvent } from "react";
import { Icon } from "@iconify/react";

export type TabItem<T extends string> = { key: T; label: string; icon: string };

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

type Props<T extends string> = {
    id: string;
    label: string;
    items: TabItem<T>[];
    value: T;
    onChange: (key: T) => void;
    /** `segmented`: pestañas iguales en una sola fila; `networks`: botones con el ícono sobre el nombre. */
    variant: "segmented" | "networks";
    /** Id del panel que controla este grupo de pestañas. */
    panelId: string;
};

/** Pestañas accesibles: una sola parada de tabulador y flechas / Inicio / Fin para moverse. */
export default function TabList<T extends string>({ id, label, items, value, onChange, variant, panelId }: Props<T>) {
    const refs = useRef<Record<string, HTMLButtonElement | null>>({});

    function onKeyDown(event: KeyboardEvent, index: number) {
        const last = items.length - 1;
        let next = index;
        if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
        else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = last;
        else return;
        event.preventDefault();
        onChange(items[next].key);
        refs.current[items[next].key]?.focus();
    }

    return (
        <div
            role="tablist"
            aria-label={label}
            className={
                variant === "segmented"
                    ? "grid gap-1 rounded-2xl bg-default-100 p-1"
                    : "grid gap-1.5"
            }
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
            {items.map((item, index) => {
                const selected = item.key === value;
                return (
                    <button
                        key={item.key}
                        ref={(el) => {
                            refs.current[item.key] = el;
                        }}
                        id={`${id}-tab-${item.key}`}
                        role="tab"
                        type="button"
                        aria-selected={selected}
                        aria-controls={panelId}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onChange(item.key)}
                        onKeyDown={(event) => onKeyDown(event, index)}
                        className={`${FOCUS_RING} ${
                            variant === "segmented"
                                ? `inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 text-sm font-medium transition motion-reduce:transition-none ${
                                      selected ? "bg-content1 text-foreground shadow-sm" : "text-default-500 hover:text-foreground"
                                  }`
                                : `flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-xs font-medium transition motion-reduce:transition-none ${
                                      selected
                                          ? "border-primary-text bg-primary/10 text-primary-text"
                                          : "border-default-200 bg-content1 text-default-500 hover:border-primary-text"
                                  }`
                        }`}
                    >
                        <Icon icon={item.icon} width={variant === "segmented" ? 18 : 22} aria-hidden="true" />
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
