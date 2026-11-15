"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppNavbar from "@/components/layout/app-navbar";
import MusicianDetailView from "@/components/musician/musician-detail-view";
import {
    EMPTY_PREVIEW_DRAFT,
    PREVIEW_DRAFT_MESSAGE,
    PREVIEW_READY_MESSAGE,
    parsePreviewDraft,
    parsePreviewFocus,
    type PreviewDraft,
    type PreviewFocus,
} from "@/components/musician/onboarding-preview/types";
import type { MusicianDetail } from "@/types/ui/musician";

const FOCUS_SELECTORS: Record<Exclude<PreviewFocus, null>, string[]> = {
    name: ['[data-preview="name"]'],
    photo: ['[data-preview="photo"]'],
    specialty: ['[data-preview="instruments"]', '[data-preview="genres"]'],
    bio: ['[data-preview="about"]', '[data-preview="tagline"]'],
    events: ['[data-preview="events"]'],
    show: ['[data-preview="show"]'],
    location: ['[data-preview="location"]'],
    price: ['[data-preview="price"]'],
};

// Borde de la parte del perfil que alimenta el paso actual de la guía.
const FOCUS_STYLE = `
[data-preview-focus]{outline:3px solid #46C0D9;outline-offset:6px;border-radius:16px}
[data-preview="photo"][data-preview-focus]{outline-offset:-6px;border-radius:0}
`;

function toDetail(draft: PreviewDraft): MusicianDetail {
    const price = Number(draft.price) > 0 ? Number(draft.price) : null;
    return {
        id: "preview",
        slug: "preview",
        name: draft.name.trim() || "Tu nombre artístico",
        genre: draft.genres[0] ?? "",
        genres: draft.genres,
        instruments: draft.instruments,
        bio: draft.bio.trim() || null,
        city: draft.city || null,
        zone: null,
        price,
        priceLabel: price ? `S/ ${price}` : "",
        image: draft.photo,
        images: draft.photo ? [draft.photo] : [],
        rating: null,
        ratingCount: null,
        verified: true,
        availabilityType: "per_event",
        pricePerHour: null,
        pricePerEvent: price,
        galleryImages: [],
        videos: [],
        showreelVideoUrl: null,
        songs: [],
        repertoire: [],
        portfolioDescription: null,
        instagramUrl: null,
        facebookUrl: null,
        tiktokUrl: null,
        youtubeChannelUrl: null,
        spotifyUrl: null,
        websiteUrl: null,
        reviews: [],
        profileType: draft.profileType,
        groupSize: draft.groupSize || null,
        details: draft.details,
    };
}

function scrollBehavior(): ScrollBehavior {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * Perfil público real con los datos de la guía. Solo se muestra dentro del iframe de la propia guía:
 * recibe el borrador por postMessage (validado y solo del mismo origen) y no hace nada más.
 */
export default function OnboardingPreviewClient() {
    const [draft, setDraft] = useState<PreviewDraft>(EMPTY_PREVIEW_DRAFT);
    const [focus, setFocus] = useState<PreviewFocus>(null);
    // Foco para el que ya se desplazó la vista: se desplaza una sola vez por paso, cuando la sección existe.
    const scrolledFor = useRef<PreviewFocus | undefined>(undefined);
    const musician = useMemo(() => toDetail(draft), [draft]);

    useEffect(() => {
        function onMessage(event: MessageEvent) {
            if (event.origin !== window.location.origin || event.source !== window.parent) return;
            if (event.data?.type !== PREVIEW_DRAFT_MESSAGE) return;
            const parsed = parsePreviewDraft(event.data.draft);
            if (!parsed) return;
            setDraft(parsed);
            setFocus(parsePreviewFocus(event.data.focus));
        }
        window.addEventListener("message", onMessage);
        if (window.parent !== window) {
            window.parent.postMessage({ type: PREVIEW_READY_MESSAGE }, window.location.origin);
        }
        return () => window.removeEventListener("message", onMessage);
    }, []);

    // Resalta la parte del perfil del paso actual y, una vez por paso, lleva la vista hasta ella.
    useEffect(() => {
        document.querySelectorAll("[data-preview-focus]").forEach((el) => el.removeAttribute("data-preview-focus"));

        const timer = window.setTimeout(() => {
            if (!focus) {
                if (scrolledFor.current !== null) {
                    window.scrollTo({ top: 0, behavior: scrollBehavior() });
                    scrolledFor.current = null;
                }
                return;
            }
            const targets = FOCUS_SELECTORS[focus]
                .map((selector) => document.querySelector<HTMLElement>(selector))
                .filter((el): el is HTMLElement => el !== null);
            targets.forEach((el) => el.setAttribute("data-preview-focus", ""));
            if (scrolledFor.current === focus) return;

            if (focus === "name" || focus === "photo") {
                window.scrollTo({ top: 0, behavior: scrollBehavior() });
                scrolledFor.current = focus;
            } else if (focus === "price") {
                // La barra de precio aparece al hacer scroll: se baja lo justo para que se vea.
                window.scrollTo({ top: Math.max(window.scrollY, 160), behavior: scrollBehavior() });
                scrolledFor.current = focus;
            } else if (targets[0]) {
                // La sección puede no existir todavía (p. ej. sin géneros): se espera a que aparezca.
                const top = window.scrollY + targets[0].getBoundingClientRect().top - window.innerHeight * 0.3;
                window.scrollTo({ top: Math.max(top, 0), behavior: scrollBehavior() });
                scrolledFor.current = focus;
            }
        }, 150);
        return () => window.clearTimeout(timer);
    }, [focus, draft]);

    // La vista previa es solo para mirar: se puede desplazar, pero ningún enlace ni botón hace nada.
    useEffect(() => {
        function block(event: Event) {
            const target = event.target as HTMLElement | null;
            if (target?.closest("a,button,[role='button'],input,textarea,select,label")) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
        document.addEventListener("click", block, true);
        document.addEventListener("submit", block, true);
        return () => {
            document.removeEventListener("click", block, true);
            document.removeEventListener("submit", block, true);
        };
    }, []);

    return (
        <>
            <style>{FOCUS_STYLE}</style>
            <AppNavbar />
            <MusicianDetailView musician={musician} mode="public" />
        </>
    );
}
