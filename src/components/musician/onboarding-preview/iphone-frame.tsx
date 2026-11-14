"use client";

import type { ReactNode } from "react";
import { Icon } from "@iconify/react";

/** Tamaño lógico de un iPhone 15 (en puntos). */
export const PHONE_W = 390;
export const PHONE_H = 844;
export const STATUS_H = 47;
export const SAFARI_H = 84;

type Props = {
    children: ReactNode;
    /** Escala visual del teléfono completo. */
    scale?: number;
    /** Barra de direcciones de Safari abajo (para la página web); sin ella, la app ocupa toda la pantalla. */
    showSafari?: boolean;
    /** Fondo de la barra de estado (debe coincidir con la pantalla que muestra). */
    statusClassName?: string;
    /** Color del texto y los íconos de la barra de estado. */
    statusText?: string;
    /** Color de la barra inferior de inicio. */
    homeClassName?: string;
    url?: string;
};

/** Alto lógico disponible para el contenido, según haya o no barra de Safari. */
export function contentHeight(showSafari: boolean): number {
    return PHONE_H - STATUS_H - (showSafari ? SAFARI_H : 0);
}

/** Marco de iPhone (solo decorativo): barra de estado, isla dinámica y, si se pide, Safari. */
export default function IPhoneFrame({
    children,
    scale = 0.76,
    showSafari = true,
    statusClassName = "bg-background",
    statusText = "text-foreground",
    homeClassName = "bg-foreground/80",
    url = "chiv.app",
}: Props) {
    const bezel = 9;
    const w = PHONE_W * scale;
    const h = PHONE_H * scale;

    return (
        <div className="relative mx-auto" style={{ width: w + bezel * 2, height: h + bezel * 2 }}>
            <span aria-hidden="true" className="absolute -left-[3px] top-[84px] h-[22px] w-[3px] rounded-l-sm bg-[#2b2b2e]" />
            <span aria-hidden="true" className="absolute -left-[3px] top-[130px] h-[40px] w-[3px] rounded-l-sm bg-[#2b2b2e]" />
            <span aria-hidden="true" className="absolute -left-[3px] top-[182px] h-[40px] w-[3px] rounded-l-sm bg-[#2b2b2e]" />
            <span aria-hidden="true" className="absolute -right-[3px] top-[150px] h-[66px] w-[3px] rounded-r-sm bg-[#2b2b2e]" />

            <div className="absolute inset-0 rounded-[52px] bg-gradient-to-b from-[#55555a] via-[#1d1d1f] to-[#4c4c51] p-[9px] shadow-[0_24px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                <div className="relative overflow-hidden rounded-[43px] bg-black" style={{ width: w, height: h }}>
                    <div className="relative origin-top-left" style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})` }}>
                        <span aria-hidden="true" className="absolute left-1/2 top-[11px] z-30 h-[34px] w-[120px] -translate-x-1/2 rounded-full bg-black" />

                        <div
                            aria-hidden="true"
                            className={`absolute inset-x-0 top-0 z-20 flex items-end justify-between px-[34px] pb-[6px] text-[16px] font-semibold ${statusClassName} ${statusText}`}
                            style={{ height: STATUS_H }}
                        >
                            <span className="tabular-nums">9:41</span>
                            <span className="flex items-center gap-1.5">
                                <Icon icon="mdi:signal-cellular-3" width={18} />
                                <Icon icon="mdi:wifi" width={18} />
                                <Icon icon="mdi:battery-high" width={24} />
                            </span>
                        </div>

                        <div className="absolute inset-x-0 overflow-hidden" style={{ top: STATUS_H, bottom: showSafari ? SAFARI_H : 0 }}>
                            {children}
                        </div>

                        {showSafari ? (
                            <div
                                aria-hidden="true"
                                className="absolute inset-x-0 bottom-0 z-20 border-t border-default-200/60 bg-content1/95 px-3 pt-2 backdrop-blur"
                                style={{ height: SAFARI_H }}
                            >
                                <div className="mx-auto flex h-11 max-w-[360px] items-center justify-between rounded-2xl bg-default-100 px-3.5 text-[16px] text-foreground">
                                    <span className="text-[13px] font-semibold text-default-500">aA</span>
                                    <span className="flex items-center gap-1.5">
                                        <Icon icon="mdi:lock-outline" width={14} className="text-default-500" />
                                        {url}
                                    </span>
                                    <Icon icon="mdi:reload" width={18} className="text-default-500" />
                                </div>
                            </div>
                        ) : null}

                        <span aria-hidden="true" className={`absolute bottom-2 left-1/2 z-30 h-[5px] w-[134px] -translate-x-1/2 rounded-full ${homeClassName}`} />
                    </div>
                </div>
            </div>
        </div>
    );
}
