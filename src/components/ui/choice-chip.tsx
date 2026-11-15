"use client";

import { Icon } from "@iconify/react";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

type Props = {
    label: string;
    icon: string;
    selected: boolean;
    disabled?: boolean;
    onToggle: () => void;
};

/** Ficha de opción: el ícono va siempre a la izquierda y lo elegido se marca con borde y una insignia. */
export default function ChoiceChip({ label, icon, selected, disabled, onToggle }: Props) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={onToggle}
            className={`${FOCUS_RING} relative inline-flex min-h-12 items-center gap-2.5 rounded-xl border-2 px-4 text-base transition active:scale-[0.97] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-45 ${
                selected
                    ? "border-primary-text bg-primary/10 font-semibold text-primary-text"
                    : "border-default-200 bg-content1 enabled:hover:border-primary-text"
            }`}
        >
            <Icon icon={icon} width={20} aria-hidden="true" />
            {label}
            {selected ? (
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary-text text-background">
                    <Icon icon="material-symbols:check" width={14} aria-hidden="true" />
                </span>
            ) : null}
        </button>
    );
}
