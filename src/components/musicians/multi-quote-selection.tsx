"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Button } from "@heroui/react";
import {
    MULTI_QUOTE_MAX,
    MULTI_QUOTE_MIN,
    MULTI_QUOTE_NAME,
    buildMultiQuoteHref,
} from "@/lib/multi-quote";

type SelectableCardProps = {
    enabled: boolean;
    selected: boolean;
    /** Se alcanzó el máximo y este artista no está elegido. */
    blocked: boolean;
    name: string;
    onToggle: () => void;
    children: ReactNode;
};

/**
 * En modo "Cotización múltiple" un clic sobre la tarjeta agrega o quita al artista
 * (en lugar de abrir su perfil). Fuera de ese modo no cambia nada.
 */
export function SelectableCard({
    enabled,
    selected,
    blocked,
    name,
    onToggle,
    children,
}: SelectableCardProps) {
    if (!enabled) return <>{children}</>;
    return (
        <div
            className={`relative rounded-3xl sm:rounded-4xl transition-shadow ${
                selected ? "ring-4 ring-primary" : blocked ? "opacity-60" : ""
            }`}
            onClickCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!blocked) onToggle();
            }}
        >
            <span
                aria-hidden="true"
                className={`absolute top-3 left-3 z-20 flex size-9 items-center justify-center rounded-full border-2 shadow-elevated ${
                    selected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-content1 border-default-300 text-default-600"
                }`}
            >
                <Icon icon={selected ? "material-symbols:check" : "material-symbols:add"} width={22} />
            </span>
            <span className="sr-only" aria-live="polite">
                {selected ? `${name} agregado a la cotización múltiple` : blocked ? "Máximo alcanzado" : ""}
            </span>
            {children}
        </div>
    );
}

type BarProps = {
    selected: Array<{ id: string; name: string }>;
    onClear: () => void;
};

/** Barra fija con el resumen de la selección y el botón para continuar. */
export function MultiQuoteBar({ selected, onClear }: BarProps) {
    const count = selected.length;
    const ready = count >= MULTI_QUOTE_MIN;
    return (
        <div
            role="region"
            aria-label={MULTI_QUOTE_NAME}
            className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-default-200 bg-content1 p-3 shadow-elevated sm:flex-row sm:items-center sm:justify-between sm:p-4"
        >
            <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                    {count} de {MULTI_QUOTE_MAX} artistas elegidos
                </p>
                <p className="truncate text-xs text-default-600">
                    {count === 0
                        ? `Toca las tarjetas para elegir entre ${MULTI_QUOTE_MIN} y ${MULTI_QUOTE_MAX} artistas.`
                        : ready
                          ? selected.map((item) => item.name).join(" · ")
                          : `Elige al menos ${MULTI_QUOTE_MIN} artistas para continuar.`}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {count > 0 ? (
                    <Button variant="light" radius="lg" size="sm" onPress={onClear}>
                        Limpiar
                    </Button>
                ) : null}
                <Button
                    as={Link}
                    href={ready ? buildMultiQuoteHref(selected.map((item) => item.id)) : "#"}
                    color="primary"
                    radius="lg"
                    className="font-semibold"
                    isDisabled={!ready}
                >
                    Pedir cotización a {count || "varios"}
                </Button>
            </div>
        </div>
    );
}
