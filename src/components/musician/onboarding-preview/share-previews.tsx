"use client";

// Cómo se vería el enlace del perfil al compartirlo en cada red. El título, la descripción y la imagen
// salen igual que en la app: título "<nombre> | Chivapp", descripción = biografía y la imagen que genera
// /musicians/[id]/opengraph-image. Son maquetas decorativas, no réplicas exactas de cada aplicación.
import { Icon } from "@iconify/react";

export type ShareDraft = {
    name: string;
    city: string;
    genres: string[];
    bio: string;
    photo: string | null;
};

function slugify(value: string): string {
    return (
        value
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "tu-perfil"
    );
}

function shareData(d: ShareDraft) {
    const name = d.name.trim() || "Tu nombre artístico";
    const genre = d.genres[0] ?? "";
    return {
        name,
        title: `${name} | Chivapp`,
        description: d.bio.trim() || `Contrata a ${name}${genre ? ` (${genre})` : ""} para tu evento en Chivapp.`,
        url: `chiv.app/musicians/${slugify(name)}`,
        genre,
        city: d.city,
    };
}

/** Réplica de /musicians/[id]/opengraph-image (1200×630), escalada con unidades de contenedor. */
export function OgImage({ draft, className = "" }: { draft: ShareDraft; className?: string }) {
    const { name, genre, city } = shareData(draft);
    return (
        <div className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: "1200 / 630", containerType: "inline-size", backgroundColor: "#132428" }}>
            {draft.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #090B0C 0%, #132428 100%)" }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.95) 100%)" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-chivappv2.png" alt="Chivapp" className="absolute object-contain" style={{ top: "4cqw", left: "4cqw", height: "5cqw" }} />
            <div className="absolute flex flex-col" style={{ left: "4cqw", right: "4cqw", bottom: "4.67cqw", gap: "1cqw" }}>
                <div className="flex items-center" style={{ gap: "1.4cqw" }}>
                    <span className="font-extrabold leading-[1.1] text-white" style={{ fontSize: "6cqw" }}>{name}</span>
                    <span className="flex items-center justify-center rounded-full" style={{ width: "4cqw", height: "4cqw", backgroundColor: "#46C0D9" }}>
                        <svg viewBox="0 0 24 24" style={{ width: "2.3cqw", height: "2.3cqw" }} fill="none"><path d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z" fill="white" /></svg>
                    </span>
                </div>
                <div className="flex font-semibold" style={{ fontSize: "3cqw", color: "#94A3B8", gap: "1.3cqw" }}>
                    {genre ? <span>{genre}</span> : null}
                    {genre && city ? <span>•</span> : null}
                    {city ? <span>{city}</span> : null}
                </div>
            </div>
        </div>
    );
}

function Clamp({ lines, className = "", children }: { lines: number; className?: string; children: React.ReactNode }) {
    return (
        <span className={className} style={{ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {children}
        </span>
    );
}

/* ----------------------------------------------------------------------------------------- */

export function WhatsAppShare({ draft }: { draft: ShareDraft }) {
    const s = shareData(draft);
    return (
        <div className="flex h-full flex-col text-white" style={{ backgroundColor: "#0B141A" }}>
            <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ backgroundColor: "#1F2C34" }}>
                <Icon icon="mdi:chevron-left" width={26} aria-hidden="true" />
                <span className="flex size-9 items-center justify-center rounded-full bg-[#6B7C85] text-sm font-bold">C</span>
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[16px] font-semibold">Cliente</p>
                    <p className="text-[12px] text-white/60">en línea</p>
                </div>
                <Icon icon="mdi:video-outline" width={24} aria-hidden="true" />
                <Icon icon="mdi:phone" width={20} aria-hidden="true" />
                <Icon icon="mdi:dots-vertical" width={22} aria-hidden="true" />
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2 px-3 pb-3">
                <div className="ml-auto max-w-[82%] rounded-xl rounded-tr-sm px-2.5 py-1.5 text-[15px]" style={{ backgroundColor: "#005C4B" }}>
                    Hola, te comparto mi perfil en Chivapp 🎶
                    <span className="ml-2 align-bottom text-xs text-white/60">10:23</span>
                </div>
                <div className="ml-auto w-[82%] overflow-hidden rounded-xl rounded-tr-sm p-1" style={{ backgroundColor: "#005C4B" }}>
                    <div className="overflow-hidden rounded-lg" style={{ backgroundColor: "#025144" }}>
                        <OgImage draft={draft} />
                        <div className="px-2.5 py-2">
                            <p className="text-[14px] font-semibold leading-snug">{s.title}</p>
                            <Clamp lines={2} className="mt-0.5 text-[13px] leading-snug text-white/70">{s.description}</Clamp>
                            <p className="mt-1 text-[12px] text-white/50">chiv.app</p>
                        </div>
                    </div>
                    <p className="px-2 pb-1 pt-1.5 text-[14px] leading-snug" style={{ color: "#53BDEB" }}>
                        <span className="break-all underline">https://{s.url}</span>
                        <span className="ml-2 inline-flex items-center gap-0.5 align-bottom text-xs text-white/60">
                            10:24 <Icon icon="mdi:check-all" width={16} style={{ color: "#53BDEB" }} aria-hidden="true" />
                        </span>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 px-2 pb-9 pt-1">
                <div className="flex h-11 flex-1 items-center gap-2 rounded-full px-3 text-white/60" style={{ backgroundColor: "#1F2C34" }}>
                    <Icon icon="mdi:emoticon-outline" width={22} aria-hidden="true" />
                    <span className="flex-1 text-[15px]">Mensaje</span>
                    <Icon icon="mdi:paperclip" width={20} aria-hidden="true" />
                    <Icon icon="mdi:camera-outline" width={21} aria-hidden="true" />
                </div>
                <span className="flex size-11 items-center justify-center rounded-full" style={{ backgroundColor: "#00A884" }}>
                    <Icon icon="mdi:microphone" width={22} aria-hidden="true" />
                </span>
            </div>
        </div>
    );
}

export function FacebookShare({ draft }: { draft: ShareDraft }) {
    const s = shareData(draft);
    return (
        <div className="flex h-full flex-col" style={{ backgroundColor: "#F0F2F5", color: "#050505" }}>
            <div className="flex items-center justify-between bg-white px-3 py-2">
                <span className="flex items-center gap-1 text-[26px] font-extrabold" style={{ color: "#0866FF" }}>
                    <Icon icon="mdi:facebook" width={34} aria-hidden="true" /> facebook
                </span>
                <Icon icon="mdi:magnify" width={26} aria-hidden="true" />
            </div>
            <div className="mt-2 bg-white pb-2">
                <div className="flex items-center gap-2.5 px-3 pt-3">
                    <span className="flex size-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: "#0866FF" }}>{s.name.charAt(0).toUpperCase()}</span>
                    <div className="leading-tight">
                        <p className="text-[15px] font-semibold">{s.name}</p>
                        <p className="flex items-center gap-1 text-[13px]" style={{ color: "#65676B" }}>Ahora · <Icon icon="mdi:earth" width={13} aria-hidden="true" /></p>
                    </div>
                </div>
                <p className="px-3 pb-2.5 pt-2.5 text-[16px] leading-snug">¡Ya estoy en Chivapp! Contrátame para tu próximo evento 🎶</p>
                <OgImage draft={draft} />
                <div className="px-3 py-2.5" style={{ backgroundColor: "#F0F2F5" }}>
                    <p className="text-[12px] uppercase tracking-wide" style={{ color: "#65676B" }}>chiv.app</p>
                    <p className="text-[16px] font-semibold leading-snug">{s.title}</p>
                    <Clamp lines={1} className="text-[14px]">{s.description}</Clamp>
                </div>
                <div className="mt-1 flex items-center justify-around border-t px-3 pt-2 text-[14px] font-semibold" style={{ borderColor: "#E4E6EB", color: "#65676B" }}>
                    <span className="flex items-center gap-1.5"><Icon icon="mdi:thumb-up-outline" width={20} aria-hidden="true" /> Me gusta</span>
                    <span className="flex items-center gap-1.5"><Icon icon="mdi:comment-outline" width={20} aria-hidden="true" /> Comentar</span>
                    <span className="flex items-center gap-1.5"><Icon icon="mdi:share-outline" width={20} aria-hidden="true" /> Compartir</span>
                </div>
            </div>
        </div>
    );
}

export function InstagramShare({ draft }: { draft: ShareDraft }) {
    const s = shareData(draft);
    return (
        <div className="flex h-full flex-col bg-black text-white">
            <div className="flex items-center gap-3 px-3 py-2.5">
                <Icon icon="mdi:chevron-left" width={28} aria-hidden="true" />
                <span className="flex size-9 items-center justify-center rounded-full bg-[#363636] text-sm font-bold">C</span>
                <div className="flex-1 leading-tight">
                    <p className="text-[15px] font-semibold">cliente</p>
                    <p className="text-[12px] text-white/50">Activo ahora</p>
                </div>
                <Icon icon="mdi:phone" width={22} aria-hidden="true" />
                <Icon icon="mdi:video-outline" width={26} aria-hidden="true" />
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2 px-3 pb-3">
                <div className="ml-auto max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px]" style={{ background: "linear-gradient(135deg, #7638FA 0%, #D300C5 100%)" }}>
                    Te dejo mi perfil para que me contrates 🎶
                </div>
                <div className="ml-auto w-[78%] overflow-hidden rounded-3xl" style={{ backgroundColor: "#262626" }}>
                    <OgImage draft={draft} />
                    <div className="px-3.5 py-2.5">
                        <p className="text-[14px] font-semibold leading-snug">{s.title}</p>
                        <p className="mt-0.5 text-[12px] text-white/50">chiv.app</p>
                    </div>
                </div>
                <p className="ml-auto text-xs text-white/40">Visto</p>
            </div>
            <div className="flex items-center gap-2 px-3 pb-9 pt-1">
                <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-white/20 px-3.5 text-white/50">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#0095F6]"><Icon icon="mdi:camera-outline" width={16} className="text-white" aria-hidden="true" /></span>
                    <span className="flex-1 text-[15px]">Mensaje...</span>
                    <Icon icon="mdi:microphone-outline" width={22} aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}

export function XShare({ draft }: { draft: ShareDraft }) {
    const s = shareData(draft);
    return (
        <div className="flex h-full flex-col bg-black text-white">
            <div className="flex items-center gap-6 px-4 py-3 text-[17px] font-bold">
                <Icon icon="mdi:arrow-left" width={22} aria-hidden="true" />
                Post
            </div>
            <div className="border-b px-4 pb-3" style={{ borderColor: "#2F3336" }}>
                <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-full bg-[#1D9BF0] text-base font-bold">{s.name.charAt(0).toUpperCase()}</span>
                    <div className="leading-tight">
                        <p className="text-[16px] font-bold">{s.name}</p>
                        <p className="text-[14px]" style={{ color: "#71767B" }}>@{slugify(s.name).replace(/-/g, "_")}</p>
                    </div>
                </div>
                <p className="mt-3 text-[18px] leading-snug">¡Ya estoy en Chivapp! Contrátame para tu próximo evento 🎶 <span style={{ color: "#1D9BF0" }}>{s.url}</span></p>
                <div className="relative mt-3 overflow-hidden rounded-2xl border" style={{ borderColor: "#2F3336" }}>
                    <OgImage draft={draft} />
                    <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>{s.title}</span>
                </div>
                <p className="mt-1.5 text-[13px]" style={{ color: "#71767B" }}>De chiv.app</p>
                <p className="mt-3 text-[14px]" style={{ color: "#71767B" }}>10:24 a. m. · 14 nov. 2026</p>
                <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "#2F3336", color: "#71767B" }}>
                    <Icon icon="mdi:comment-outline" width={21} aria-hidden="true" />
                    <Icon icon="mdi:repeat" width={21} aria-hidden="true" />
                    <Icon icon="mdi:heart-outline" width={21} aria-hidden="true" />
                    <Icon icon="mdi:chart-bar" width={21} aria-hidden="true" />
                    <Icon icon="mdi:share-outline" width={21} aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}
