"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/react";
import {
    getActiveProfileId,
    saveOnboardingReturnState,
    setActiveProfileId,
} from "@/lib/active-profile";
import { ApiError } from "@/lib/api";
import { profileBadge } from "@/lib/profile-details";
import { createAdditionalMusicianProfile, invalidateProfileVerificationCache, listMyMusicianProfiles } from "@/lib/profiles";
import type { MusicianProfileSummary } from "@/types/api";

/** Máximo de perfiles por persona (el servidor lo hace cumplir). */
export const MAX_PROFILES = 3;

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const STATUS_LABEL: Record<string, string> = {
    draft: "En borrador",
    pending_review: "En revisión",
    published: "Publicado",
    rejected: "Rechazado",
};

function nameOf(profile: MusicianProfileSummary): string {
    return profile.stage_name?.trim() || "Perfil nuevo";
}

type Props = { className?: string };

/**
 * Perfil con el que se trabaja y acceso a «Agregar otro perfil». Cambiar de perfil recarga la página: todo el
 * panel (reservas, agenda, equipo) se vuelve a pedir ya con el perfil elegido.
 */
export default function ProfileSwitcher({ className = "" }: Props) {
    const router = useRouter();
    const menuId = useId();
    const [profiles, setProfiles] = useState<MusicianProfileSummary[] | null>(null);
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const list = await listMyMusicianProfiles();
                if (!cancelled) setProfiles(list);
            } catch {
                if (!cancelled) setProfiles([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Cierra con Escape y al hacer clic fuera.
    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        const onClick = (event: MouseEvent) => {
            if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onClick);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onClick);
        };
    }, [open]);

    const choose = useCallback((id: string) => {
        setActiveProfileId(id);
        setOpen(false);
        window.location.reload();
    }, []);

    async function addProfile() {
        if (adding) return;
        setAdding(true);
        try {
            const currentActiveId = getActiveProfileId() ?? profiles?.[0]?.id ?? null;
            const currentPath =
                typeof window !== "undefined" ? window.location.pathname : "/musician";
            const created = await createAdditionalMusicianProfile();
            saveOnboardingReturnState(currentActiveId, currentPath);
            setActiveProfileId(created.id);
            invalidateProfileVerificationCache("musician");
            router.push("/musician/onboarding");
        } catch (error) {
            const description = error instanceof ApiError && error.message ? error.message : "No pudimos crear el perfil. Inténtalo de nuevo.";
            addToast({ title: "No se pudo agregar el perfil", description, color: "danger" });
            setAdding(false);
        }
    }

    if (!profiles || profiles.length === 0) return null;

    const primary = profiles[0];
    const stored = getActiveProfileId();
    const active = profiles.find((p) => p.id === stored) ?? primary;
    const canAdd = profiles.length < MAX_PROFILES && primary.status !== "draft";
    // Con un solo perfil y sin poder agregar otro (aún en borrador), no hay nada que elegir.
    if (profiles.length === 1 && !canAdd) return null;

    return (
        <div ref={root} className={`relative ${className}`}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((v) => !v)}
                className={`${FOCUS_RING} inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-full border border-default-200 bg-content1 py-1.5 pl-2 pr-3.5 text-sm shadow-sm transition hover:border-primary-text motion-reduce:transition-none`}
            >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                    <Icon icon={active.profile_type === "group" ? "mdi:account-group-outline" : "mdi:account-music-outline"} width={18} aria-hidden="true" />
                </span>
                <span className="grid min-w-0 text-left leading-tight">
                    <span className="text-[11px] text-default-500">Perfil activo</span>
                    <span className="truncate font-semibold">{nameOf(active)}</span>
                </span>
                <Icon icon="material-symbols:expand-more" width={20} className={`shrink-0 text-default-500 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            {open ? (
                <div
                    id={menuId}
                    role="menu"
                    aria-label="Tus perfiles"
                    className="absolute left-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-default-200 bg-content1 p-1.5 shadow-elevated motion-safe:animate-appearance-in"
                >
                    {profiles.map((profile) => {
                        const on = profile.id === active.id;
                        return (
                            <button
                                key={profile.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={on}
                                onClick={() => (on ? setOpen(false) : choose(profile.id))}
                                className={`${FOCUS_RING} flex min-h-14 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-default-100 motion-reduce:transition-none ${on ? "bg-primary/10" : ""}`}
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-default-100 text-default-700">
                                    <Icon icon={profile.profile_type === "group" ? "mdi:account-group-outline" : "mdi:account-music-outline"} width={20} aria-hidden="true" />
                                </span>
                                <span className="grid min-w-0 flex-1">
                                    <span className="truncate font-semibold">{nameOf(profile)}</span>
                                    <span className="truncate text-xs text-default-500">
                                        {profileBadge(profile.profile_type, profile.group_size)} · {STATUS_LABEL[profile.status] ?? profile.status}
                                        {profile.is_primary ? " · Principal" : ""}
                                    </span>
                                </span>
                                {on ? <Icon icon="material-symbols:check" width={20} className="shrink-0 text-primary-text" aria-hidden="true" /> : null}
                            </button>
                        );
                    })}
                    <div className="mt-1 border-t border-default-200 pt-1">
                        <button
                            type="button"
                            role="menuitem"
                            disabled={!canAdd || adding}
                            onClick={() => void addProfile()}
                            className={`${FOCUS_RING} flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-primary-text transition enabled:hover:bg-default-100 disabled:cursor-not-allowed disabled:text-default-400 motion-reduce:transition-none`}
                        >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <Icon icon="material-symbols:add" width={20} aria-hidden="true" />
                            </span>
                            <span className="grid">
                                <span className="font-semibold">{adding ? "Creando…" : "Agregar otro perfil"}</span>
                                {!canAdd ? (
                                    <span className="text-xs text-default-500">
                                        {profiles.length >= MAX_PROFILES ? `Máximo ${MAX_PROFILES} perfiles` : "Primero envía tu perfil principal"}
                                    </span>
                                ) : (
                                    <span className="text-xs text-default-500">Un solista o tu grupo, sin repetir documento ni firma</span>
                                )}
                            </span>
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
