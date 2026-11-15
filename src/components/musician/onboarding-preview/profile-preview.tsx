"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import MusicianCard from "@/components/layout/musician-card";
import type { MusicianCard as MusicianCardData } from "@/types/ui/musician";
import IPhoneFrame, { contentHeight } from "./iphone-frame";
import { FacebookShare, InstagramShare, WhatsAppShare, XShare } from "./share-previews";
import TabList, { type TabItem } from "./tab-list";
import {
    PREVIEW_DRAFT_MESSAGE,
    PREVIEW_READY_MESSAGE,
    PREVIEW_ROUTE,
    type PreviewDraft,
    type PreviewFocus,
} from "./types";

type ViewKey = "perfil" | "busqueda" | "compartir";
type NetworkKey = "whatsapp" | "facebook" | "instagram" | "x";

const VIEWS: TabItem<ViewKey>[] = [
    { key: "perfil", label: "Perfil", icon: "material-symbols:person-outline" },
    { key: "busqueda", label: "Buscador", icon: "mdi:magnify" },
    { key: "compartir", label: "Compartir", icon: "mdi:share-variant-outline" },
];

const NETWORKS: TabItem<NetworkKey>[] = [
    { key: "whatsapp", label: "WhatsApp", icon: "mdi:whatsapp" },
    { key: "facebook", label: "Facebook", icon: "mdi:facebook" },
    { key: "instagram", label: "Instagram", icon: "mdi:instagram" },
    { key: "x", label: "X", icon: "mdi:twitter" },
];

const SHARE_FRAME: Record<NetworkKey, { status: string; text: string; home: string }> = {
    whatsapp: { status: "bg-[#1F2C34]", text: "text-white", home: "bg-white" },
    facebook: { status: "bg-white", text: "text-black", home: "bg-black" },
    instagram: { status: "bg-black", text: "text-white", home: "bg-white" },
    x: { status: "bg-black", text: "text-white", home: "bg-white" },
};

type Props = {
    draft: PreviewDraft;
    focus: PreviewFocus;
    /** Escala del teléfono (0.76 en escritorio; menor en celular). */
    scale?: number;
};

function cardFromDraft(draft: PreviewDraft): MusicianCardData {
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
        profileType: draft.profileType,
        groupSize: draft.groupSize || null,
    };
}

/**
 * Vista previa de cómo se verá el perfil: el perfil público real (en un iframe a ancho de celular), la
 * tarjeta del buscador y cómo se ve el enlace al compartirlo en cada red.
 */
export default function ProfilePreview({ draft, focus, scale = 0.76 }: Props) {
    const uid = useId();
    const viewId = `${uid}-view`;
    const networkId = `${uid}-network`;
    const [view, setView] = useState<ViewKey>("perfil");
    const [network, setNetwork] = useState<NetworkKey>("whatsapp");
    const frame = useRef<HTMLIFrameElement>(null);
    const [readyTick, setReadyTick] = useState(0);
    const card = useMemo(() => cardFromDraft(draft), [draft]);
    const networkLabel = NETWORKS.find((n) => n.key === network)?.label ?? "";

    // El iframe avisa cuando está listo; solo se acepta lo que viene de esa ventana y de nuestro origen.
    useEffect(() => {
        function onMessage(event: MessageEvent) {
            if (event.origin !== window.location.origin) return;
            if (event.source !== frame.current?.contentWindow) return;
            if (event.data?.type === PREVIEW_READY_MESSAGE) setReadyTick((tick) => tick + 1);
        }
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, []);

    useEffect(() => {
        if (readyTick === 0 || view !== "perfil") return;
        frame.current?.contentWindow?.postMessage(
            { type: PREVIEW_DRAFT_MESSAGE, draft, focus },
            window.location.origin,
        );
    }, [draft, focus, readyTick, view]);

    const shareDescription = `Vista previa de cómo se ve tu enlace en ${networkLabel}: título «${
        draft.name.trim() || "Tu nombre artístico"
    } | Chivapp», con tu foto y el inicio de tu biografía.`;

    const panelId = view === "compartir" ? `${networkId}-panel` : `${viewId}-panel`;
    const labelledBy = view === "compartir" ? `${networkId}-tab-${network}` : `${viewId}-tab-${view}`;
    const shareStyle = SHARE_FRAME[network];

    return (
        <div>
            <h2 className="mb-2 text-sm font-semibold">
                {view === "compartir" ? "Así se ve cuando compartes tu enlace" : "Así te ve un cliente"}
            </h2>

            <TabList id={viewId} panelId={panelId} label="Qué quieres previsualizar" items={VIEWS} value={view} onChange={setView} variant="segmented" />
            {view === "compartir" ? (
                <div className="mt-2">
                    <TabList id={networkId} panelId={panelId} label="Red social" items={NETWORKS} value={network} onChange={setNetwork} variant="networks" />
                </div>
            ) : null}

            <div role="tabpanel" id={panelId} aria-labelledby={labelledBy} className="mt-4">
                {view === "perfil" ? (
                    <IPhoneFrame showSafari scale={scale}>
                        <iframe
                            ref={frame}
                            src={PREVIEW_ROUTE}
                            title="Vista previa de tu perfil público"
                            className="block w-full border-0"
                            style={{ height: contentHeight(true) }}
                        />
                    </IPhoneFrame>
                ) : null}

                {view === "busqueda" ? (
                    <div className="mx-auto w-[260px] pt-2">
                        <MusicianCard musician={card} />
                    </div>
                ) : null}

                {view === "compartir" ? (
                    <div role="img" aria-label={shareDescription}>
                        <IPhoneFrame
                            showSafari={false}
                            scale={scale}
                            statusClassName={shareStyle.status}
                            statusText={shareStyle.text}
                            homeClassName={shareStyle.home}
                        >
                            {network === "whatsapp" ? <WhatsAppShare draft={draft} /> : null}
                            {network === "facebook" ? <FacebookShare draft={draft} /> : null}
                            {network === "instagram" ? <InstagramShare draft={draft} /> : null}
                            {network === "x" ? <XShare draft={draft} /> : null}
                        </IPhoneFrame>
                    </div>
                ) : null}
            </div>

            <p className="mx-auto mt-3 flex max-w-[320px] items-start gap-2 text-xs text-default-500">
                <Icon icon={view === "perfil" ? "material-symbols:touch-app-outline" : "material-symbols:info-outline"} width={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                    {view === "perfil"
                        ? "Así se verá cuando tu perfil esté aprobado. Desliza dentro del teléfono: al bajar aparecen la barra superior y la de precio."
                        : view === "busqueda"
                          ? "Así aparece tu tarjeta cuando un cliente busca músicos."
                          : `Así se ve tu enlace en ${networkLabel}: tu foto, tu nombre y el inicio de tu biografía.`}
                </span>
            </p>
        </div>
    );
}
