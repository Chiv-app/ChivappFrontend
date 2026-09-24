"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Chip,
    useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import BookActionButton from "@/components/auth/book-action-button";
import BookingRequestModal from "@/components/booking/booking-request-modal";
import MusicianRepertoireSection from "@/components/musician/musician-repertoire-section";
import ShareProfileButton from "@/components/musician/share-profile-button";
import { useAuth } from "@/contexts/auth-context";
import ImageLightboxModal from "@/components/ui/image-lightbox-modal";
import MasonryItem from "@/components/ui/masonry-item";
import VerifiedBadge from "@/components/ui/verified-badge";
import VideoPlaybackModal from "@/components/ui/video-playback-modal";
import { useVideoPlayback } from "@/hooks/use-video-playback";
import { getVisibleMusicianPrices } from "@/lib/musician-pricing";
import {
    getVideoEmbedUrl,
    getYoutubeThumbnailUrl,
} from "@/lib/video-urls";
import type { MusicianDetail } from "@/types/ui/musician";

type Props = {
    musician: MusicianDetail;
    /** Owner preview of the same public layout (no booking CTA). */
    mode?: "public" | "owner";
    onEdit?: () => void;
};

function formatPrice(amount: number | null): string {
    if (amount == null) return "Consultar";
    return `S/ ${amount.toLocaleString("es-PE")}`;
}

function formatLocation(city: string | null, zone: string | null): string | null {
    if (city && zone) return `${city}, ${zone}`;
    return city ?? zone;
}

function resolveTagline(bio: string | null, portfolio: string | null): string | null {
    const source = bio?.trim() || portfolio?.trim();
    if (!source) return null;
    const sentence = source.split(/(?<=[.!?])\s+/)[0] ?? source;
    return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}

function DropCapParagraph({ text }: { text: string }) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const first = trimmed.charAt(0).toLocaleUpperCase("es-PE");
    const rest = trimmed.slice(1);

    // Inline (not float) so the next glyph sits tight against the initial.
    return (
        <p className="text-default-600 font-light leading-relaxed text-base sm:text-lg">
            <span className="inline-block align-[-0.08em] text-[1.55em] font-semibold text-primary leading-none tracking-tighter mr-[0.02em]">
                {first}
            </span>
            {rest}
        </p>
    );
}

const PORTFOLIO_PAGE_SIZE = 11;

/**
 * Intercala dos listas manteniendo la proporción del total: si el 30% de
 * todo el material es video, cualquier prefijo del resultado (ej. las
 * primeras 11 tiles que se muestran) también tendrá ~30% de video, en vez
 * de mostrar solo fotos hasta agotarlas.
 */
function interleaveByShare<A, B>(primary: A[], secondary: B[]): (A | B)[] {
    const result: (A | B)[] = [];
    let i = 0;
    let j = 0;
    while (i < primary.length || j < secondary.length) {
        const primaryShare = primary.length === 0 ? 1 : i / primary.length;
        const secondaryShare = secondary.length === 0 ? 1 : j / secondary.length;
        if (j < secondary.length && (i >= primary.length || secondaryShare <= primaryShare)) {
            result.push(secondary[j]);
            j += 1;
        } else {
            result.push(primary[i]);
            i += 1;
        }
    }
    return result;
}

const SOCIAL_LINKS = [
    { key: "instagramUrl" as const, label: "Instagram", icon: "mdi:instagram" },
    { key: "facebookUrl" as const, label: "Facebook", icon: "mdi:facebook" },
    { key: "tiktokUrl" as const, label: "TikTok", icon: "mdi:tiktok" },
    { key: "youtubeChannelUrl" as const, label: "YouTube", icon: "mdi:youtube" },
    { key: "spotifyUrl" as const, label: "Spotify", icon: "mdi:spotify" },
    { key: "websiteUrl" as const, label: "Sitio web", icon: "material-symbols:language" },
];

export default function MusicianDetailView({
    musician,
    mode = "public",
    onEdit,
}: Props) {
    const isOwner = mode === "owner";
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const {
        isOpen: isBookingOpen,
        onOpen: onBookingOpen,
        onOpenChange: onBookingOpenChange,
    } = useDisclosure();
    const videoPlayback = useVideoPlayback();
    const [isCtaDocked, setIsCtaDocked] = useState(false);
    // En modo "owner" la barra siempre está visible (no hay hero a pantalla
    // completa que despejar); en público arranca oculta hasta el scroll.
    const [isCtaRevealed, setIsCtaRevealed] = useState(isOwner);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [lightboxAlt, setLightboxAlt] = useState("Imagen ampliada");
    const [portfolioVisibleCount, setPortfolioVisibleCount] = useState(PORTFOLIO_PAGE_SIZE);
    const {
        isOpen: isLightboxOpen,
        onOpen: onLightboxOpen,
        onOpenChange: onLightboxOpenChange,
    } = useDisclosure();

    function openLightbox(src: string, alt: string) {
        setLightboxSrc(src);
        setLightboxAlt(alt);
        onLightboxOpen();
    }

    // Reinicia la paginación del portafolio al cambiar de músico, ajustando
    // el estado durante el render (sin efecto) para no disparar un render
    // extra: https://react.dev/learn/you-might-not-need-an-effect
    const [portfolioResetKey, setPortfolioResetKey] = useState(musician.id);
    if (portfolioResetKey !== musician.id) {
        setPortfolioResetKey(musician.id);
        setPortfolioVisibleCount(PORTFOLIO_PAGE_SIZE);
    }

    useEffect(() => {
        if (isOwner) return;
        // Solo el contratista puede reservar: un músico logueado que vuelve
        // de /login con ?reservar=1 (por ej. si abrió el CTA sin sesión y se
        // logueó con la cuenta equivocada) no debe ver el modal de reserva.
        if (user && user.role !== "contractor") return;
        if (searchParams.get("reservar") === "1") {
            onBookingOpen();
        }
    }, [searchParams, onBookingOpen, isOwner, user]);

    // Keep CTA fixed while browsing the profile; dock it as the last section when the site footer enters view.
    useEffect(() => {
        const footer = document.querySelector("footer");
        if (!footer) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsCtaDocked(entry?.isIntersecting ?? false);
            },
            { root: null, threshold: 0 },
        );
        observer.observe(footer);
        return () => observer.disconnect();
    }, []);

    // La barra de precio/CTA arranca oculta (igual que el navbar) para que
    // el hero se vea completo al entrar; ambas aparecen juntas al hacer un
    // scroll mínimo, con el mismo umbral que usa AppNavbar.
    useEffect(() => {
        if (isOwner) return;
        function handleScroll() {
            setIsCtaRevealed(window.scrollY > 24);
        }
        const raf = requestAnimationFrame(handleScroll);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [isOwner]);

    const location = formatLocation(musician.city, musician.zone);
    const tagline = resolveTagline(musician.bio, musician.portfolioDescription);
    const socialLinks = SOCIAL_LINKS.map((item) => ({
        ...item,
        href: musician[item.key],
    })).filter((item) => item.href);

    const visiblePrices = getVisibleMusicianPrices(
        musician.availabilityType,
        musician.pricePerHour,
        musician.pricePerEvent,
    );
    const hasPricing =
        visiblePrices.pricePerHour != null || visiblePrices.pricePerEvent != null;

    const showreelUrl = useMemo(() => {
        if (
            musician.showreelVideoUrl &&
            musician.videos.includes(musician.showreelVideoUrl)
        ) {
            return musician.showreelVideoUrl;
        }
        return musician.videos[0] ?? null;
    }, [musician.showreelVideoUrl, musician.videos]);

    const showreelThumb = showreelUrl ? getYoutubeThumbnailUrl(showreelUrl) : null;

    const portfolioVideos = musician.videos
        .map((url) => ({
            url,
            embed: getVideoEmbedUrl(url),
            thumb: getYoutubeThumbnailUrl(url),
        }))
        .filter((v) => v.embed != null);

    const quoteReviews = musician.reviews.filter((review) => review.comment.trim());
    const hasPortfolio =
        musician.galleryImages.length > 0 || portfolioVideos.length > 0;
    const compromisos = musician.ratingCount ?? 0;
    const hasTrajectory =
        quoteReviews.length > 0 ||
        musician.rating != null ||
        compromisos > 0;

    type PortfolioTile =
        | { kind: "image"; key: string; src: string; alt: string }
        | {
              kind: "video";
              key: string;
              url: string;
              thumb: string | null;
          };

    const galleryTiles = musician.galleryImages.map((src, index) => ({
        kind: "image" as const,
        key: `img-${src}-${index}`,
        src,
        alt: `${musician.name} — foto ${index + 1}`,
    }));
    const videoTiles = portfolioVideos.map(({ url, thumb }) => ({
        kind: "video" as const,
        key: `vid-${url}`,
        url,
        thumb,
    }));
    const portfolioTiles: PortfolioTile[] = interleaveByShare(galleryTiles, videoTiles);
    const visiblePortfolioTiles = portfolioTiles.slice(0, portfolioVisibleCount);
    const hasMorePortfolio = portfolioTiles.length > portfolioVisibleCount;

    // Misma "píldora" flotante que el navbar (inset, rounded-full, blur),
    // reflejada en la barra inferior de precio/CTA.
    const ctaBarClassName = [
        "inset-x-3 sm:inset-x-6 z-40 rounded-full border border-default-200/60 bg-content1/70 backdrop-blur-md shadow-elevated hide-on-keyboard",
        "transition-transform duration-300 ease-out",
        isCtaDocked ? "absolute bottom-3 sm:bottom-4" : "fixed bottom-3 sm:bottom-4",
        isCtaRevealed || isCtaDocked
            ? "translate-y-0"
            : "translate-y-[150%] pointer-events-none",
    ].join(" ");

    return (
        <>
            <div className="relative">
            <main
                className={
                    isOwner
                        ? "pb-28 -mx-4 lg:-mx-8 -mt-4 lg:-mt-8"
                        : "pb-28"
                }
            >
                {isOwner ? (
                    <div className="border-b border-success/20 bg-gradient-to-br from-success/10 via-content1 to-content1">
                        <div className="container mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-5 sm:py-6">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <Chip color="success" variant="flat" size="sm">
                                            Perfil verificado
                                        </Chip>
                                        <VerifiedBadge size="sm" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                                        Mi perfil público
                                    </h2>
                                    <p className="text-default-600 mt-1.5 max-w-xl text-sm sm:text-base">
                                        Así te ven los contratistas. Si editas información, el
                                        perfil volverá a revisión y dejará de mostrarse hasta nueva
                                        aprobación.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        as={Link}
                                        href={`/musicians/${musician.slug || musician.id}`}
                                        target="_blank"
                                        variant="flat"
                                        radius="lg"
                                        className="font-semibold"
                                        startContent={
                                            <Icon
                                                icon="material-symbols:open-in-new"
                                                width={18}
                                            />
                                        }
                                    >
                                        Ver página pública
                                    </Button>
                                    <Button
                                        color="primary"
                                        radius="lg"
                                        className="font-semibold"
                                        onPress={onEdit}
                                        startContent={
                                            <Icon icon="material-symbols:edit" width={18} />
                                        }
                                    >
                                        Editar perfil
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Hero: llena la pantalla completa (foto + video enteros,
                    sin recortar) porque ni el navbar ni la barra de precio
                    se muestran todavía; ambos aparecen flotando al hacer
                    scroll. En modo "owner" (con el banner superior) se
                    conservan alturas relativas en vh. */}
                <section
                    className={`grid w-full border-b border-default-200/70 ${
                        isOwner
                            ? showreelUrl
                                ? "grid-cols-1 lg:grid-cols-2 min-h-[65vh] lg:min-h-[80vh]"
                                : "grid-cols-1 min-h-[50vh] lg:min-h-[65vh]"
                            : `min-h-[100dvh] ${
                                  showreelUrl ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                              }`
                    }`}
                >
                    <div className="relative min-h-[50vh] lg:min-h-full overflow-hidden group bg-default-900">
                        {musician.image ? (
                            <Image
                                src={musician.image}
                                alt={musician.name}
                                fill
                                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                priority
                                sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-default-400">
                                <Icon icon="material-symbols:music-note" width={72} height={72} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20" />

                        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20">
                            <ShareProfileButton
                                musicianId={musician.id}
                                slug={musician.slug}
                                name={musician.name}
                            />
                        </div>

                        <div className="absolute bottom-0 left-0 p-6 sm:p-10 lg:p-14 w-full">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                {musician.verified ? (
                                    <VerifiedBadge size="md" variant="overlay" />
                                ) : null}
                                {musician.genre ? (
                                    <span className="inline-flex items-center rounded-full border border-white/35 bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm backdrop-blur-md">
                                        {musician.genre}
                                    </span>
                                ) : null}
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[0.95] tracking-tight mb-4 max-w-3xl text-balance drop-shadow-[0_2px_24px_rgba(0,0,0,0.85)]">
                                {musician.name}
                            </h1>
                            {tagline ? (
                                <p className="text-white max-w-md font-medium text-base sm:text-lg leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                                    {tagline}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {showreelUrl ? (
                        <div className="relative min-h-[40vh] lg:min-h-full overflow-hidden flex flex-col justify-center items-center border-t lg:border-t-0 lg:border-l border-default-200/70 bg-default-900">
                            {showreelThumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={showreelThumb}
                                    alt={`Video de ${musician.name}`}
                                    className="absolute inset-0 size-full object-cover opacity-80"
                                />
                            ) : musician.image ? (
                                <Image
                                    src={musician.image}
                                    alt=""
                                    fill
                                    className="object-cover opacity-55 grayscale"
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                />
                            ) : null}
                            <div className="absolute inset-0 bg-black/50" />
                            <button
                                type="button"
                                onClick={() =>
                                    videoPlayback.openVideo(
                                        showreelUrl,
                                        musician.name,
                                    )
                                }
                                className="group relative z-10 flex size-20 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-primary hover:border-primary hover:text-primary-foreground shadow-elevated"
                                aria-label={`Reproducir video de ${musician.name}`}
                            >
                                <Icon
                                    icon="material-symbols:play-arrow"
                                    width={40}
                                    className="ml-1"
                                />
                            </button>
                        </div>
                    ) : null}
                </section>

                <div className="container mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-10 lg:py-16">
                    {!isOwner ? (
                        <div className="mb-8">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-default-500 hover:text-foreground transition-colors"
                            >
                                <Icon
                                    icon="material-symbols:arrow-back"
                                    width={20}
                                    height={20}
                                />
                                Volver al inicio
                            </Link>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
                        <aside className="lg:col-span-3 lg:sticky lg:top-[calc(var(--app-navbar-height)+1.5rem)] h-fit space-y-8">
                            {(location || socialLinks.length > 0) && (
                                <div className="rounded-2xl border border-default-200/70 bg-content1 p-5 space-y-4 shadow-soft">
                                    {location ? (
                                        <div className="flex items-start gap-3">
                                            <Icon
                                                icon="material-symbols:location-on"
                                                width={22}
                                                className="text-primary shrink-0 mt-0.5"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    {location}
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}

                                    {socialLinks.length > 0 ? (
                                        <div
                                            className={
                                                location
                                                    ? "border-t border-default-200/70 pt-4"
                                                    : undefined
                                            }
                                        >
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-default-500 mb-3">
                                                Redes
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {socialLinks.map((link) => (
                                                    <a
                                                        key={link.key}
                                                        href={link.href!}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        aria-label={link.label}
                                                        className="inline-flex size-10 items-center justify-center rounded-full border border-default-200/70 text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-colors"
                                                    >
                                                        <Icon icon={link.icon} width={18} />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {musician.instruments.length > 0 ? (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-default-500 mb-3">
                                        Instrumentos
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {musician.instruments.map((instrument) => (
                                            <span
                                                key={instrument}
                                                className="rounded-lg border border-default-200/70 bg-content1 px-3 py-1.5 text-xs text-default-600"
                                            >
                                                {instrument}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {musician.genres.length > 0 ? (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-default-500 mb-3">
                                        Géneros
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {musician.genres.map((genre) => (
                                            <span
                                                key={genre}
                                                className="rounded-lg border border-default-200/70 bg-content1 px-3 py-1.5 text-xs text-default-600"
                                            >
                                                {genre}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {(compromisos > 0 || musician.rating != null) && (
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-default-200/70">
                                    <div>
                                        <span className="block text-2xl font-semibold text-foreground tabular-nums">
                                            {compromisos}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-widest text-default-500">
                                            Compromisos
                                        </span>
                                    </div>
                                    {musician.rating != null ? (
                                        <div>
                                            <span className="block text-2xl font-semibold text-foreground tabular-nums">
                                                {musician.rating.toFixed(1)}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-widest text-default-500">
                                                Calificación
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </aside>

                        <div className="lg:col-span-9 space-y-14">
                            {(musician.bio || musician.portfolioDescription) && (
                                <section>
                                    <h2 className="text-3xl font-bold text-foreground mb-6 tracking-tight">
                                        Sobre el artista
                                    </h2>
                                    <div className="space-y-4">
                                        {musician.bio ? (
                                            <DropCapParagraph text={musician.bio} />
                                        ) : null}
                                        {musician.portfolioDescription ? (
                                            <p
                                                className={`text-default-600 font-light leading-relaxed text-base sm:text-lg ${
                                                    musician.bio
                                                        ? "pt-4 border-t border-default-200/70"
                                                        : ""
                                                }`}
                                            >
                                                {musician.portfolioDescription}
                                            </p>
                                        ) : null}
                                    </div>
                                </section>
                            )}

                            {hasPortfolio ? (
                                <section>
                                    <h2 className="text-3xl font-bold text-foreground mb-8 tracking-tight">
                                        Studio &amp; Live Portafolio
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-[10px]">
                                        {visiblePortfolioTiles.map((tile, index) => (
                                            <MasonryItem key={tile.key} index={index}>
                                                {tile.kind === "image" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openLightbox(
                                                                tile.src,
                                                                tile.alt,
                                                            )
                                                        }
                                                        className="group relative block w-full overflow-hidden rounded-4xl border border-default-200/70 bg-default-200 shadow-soft mb-6 text-left"
                                                        aria-label={`Ver ${tile.alt} en tamaño grande`}
                                                    >
                                                        <Image
                                                            src={tile.src}
                                                            alt={tile.alt}
                                                            width={500}
                                                            height={300}
                                                            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                        />
                                                        <span className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full bg-black/55 text-white border border-white/30 shadow-sm">
                                                            <Icon
                                                                icon="material-symbols:zoom-in"
                                                                width={18}
                                                            />
                                                        </span>
                                                    </button>
                                                ) : null}

                                                {tile.kind === "video" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            videoPlayback.openVideo(
                                                                tile.url,
                                                                musician.name,
                                                            )
                                                        }
                                                        className="group relative w-full overflow-hidden rounded-4xl border border-default-200/70 bg-default-900 shadow-soft mb-6 text-left"
                                                    >
                                                        {tile.thumb ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={tile.thumb}
                                                                alt="Video del portafolio"
                                                                className="w-full h-auto object-cover brightness-75 transition-transform duration-700 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className="aspect-video w-full bg-default-800" />
                                                        )}
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Icon
                                                                icon="material-symbols:play-circle"
                                                                width={48}
                                                                className="text-white drop-shadow-lg transition-transform group-hover:scale-110"
                                                            />
                                                        </div>
                                                    </button>
                                                ) : null}

                                            </MasonryItem>
                                        ))}
                                    </div>

                                    {hasMorePortfolio ? (
                                        <div className="flex justify-center mt-8 sm:mt-10">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPortfolioVisibleCount(
                                                        (count) => count + PORTFOLIO_PAGE_SIZE,
                                                    )
                                                }
                                                aria-label="Ver más fotos y videos"
                                                className="group flex items-center justify-center"
                                            >
                                                <span className="relative flex items-center justify-center size-9 sm:size-10">
                                                    <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                                                    <span className="absolute inset-0 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                                                    <Icon
                                                        icon="material-symbols:keyboard-arrow-down-rounded"
                                                        width={22}
                                                        height={22}
                                                        className="relative text-default-600 group-hover:text-primary transition-colors"
                                                    />
                                                </span>
                                            </button>
                                        </div>
                                    ) : null}
                                </section>
                            ) : null}

                            {hasTrajectory ? (
                                <section>
                                    <h2 className="text-3xl font-bold text-foreground mb-6 tracking-tight">
                                        Reseñas y trayectoria
                                    </h2>

                                    <div className="flex flex-wrap gap-8 sm:gap-12 mb-8 pb-8 border-b border-default-200/70">
                                        {compromisos > 0 ? (
                                            <div>
                                                <span className="block text-2xl font-semibold text-foreground tabular-nums">
                                                    {compromisos}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-widest text-default-500">
                                                    Compromisos
                                                </span>
                                            </div>
                                        ) : null}
                                        {musician.rating != null ? (
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 text-2xl font-semibold text-foreground tabular-nums">
                                                    <Icon
                                                        icon="material-symbols:star"
                                                        width={22}
                                                        className="text-warning"
                                                    />
                                                    {musician.rating.toFixed(1)}
                                                </span>
                                                <span className="block text-[10px] uppercase tracking-widest text-default-500 mt-0.5">
                                                    Calificación
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>

                                    {quoteReviews.length > 0 ? (
                                        <ul className="space-y-6">
                                            {quoteReviews.slice(0, 4).map((review) => (
                                                <li
                                                    key={review.id}
                                                    className="border-b border-default-200/70 pb-6 last:border-b-0 last:pb-0"
                                                >
                                                    <div className="flex items-center gap-1 mb-2">
                                                        {Array.from({ length: 5 }).map(
                                                            (_, starIndex) => (
                                                                <Icon
                                                                    key={starIndex}
                                                                    icon="material-symbols:star"
                                                                    width={14}
                                                                    className={
                                                                        starIndex <
                                                                        review.rating
                                                                            ? "text-warning"
                                                                            : "text-default-300"
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                    <p className="text-default-600 font-light leading-relaxed text-base sm:text-lg italic">
                                                        “{review.comment}”
                                                    </p>
                                                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-default-500">
                                                        {review.authorLabel}
                                                        {review.eventType
                                                            ? ` · ${review.eventType}`
                                                            : ""}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-default-600 font-light leading-relaxed text-base sm:text-lg">
                                            Aún no hay comentarios públicos; la
                                            calificación refleja eventos completados.
                                        </p>
                                    )}
                                </section>
                            ) : null}

                            {musician.repertoire.length > 0 || musician.songs.length > 0 ? (
                                <MusicianRepertoireSection
                                    repertoire={musician.repertoire}
                                    songs={musician.songs}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            </main>

            <div
                className={ctaBarClassName}
                role="region"
                aria-label={
                    isOwner ? "Acciones del perfil" : "Precio y contratación"
                }
            >
                <div className="container mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6 min-w-0">
                        {hasPricing ? (
                            <>
                                {visiblePrices.pricePerHour != null ? (
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-default-500">
                                            Por hora
                                        </span>
                                        <span className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
                                            {formatPrice(visiblePrices.pricePerHour)}
                                        </span>
                                    </div>
                                ) : null}
                                {visiblePrices.pricePerEvent != null ? (
                                    <div
                                        className={`flex flex-col min-w-0 ${
                                            visiblePrices.pricePerHour != null
                                                ? "hidden sm:flex border-l border-default-200/70 pl-6"
                                                : ""
                                        }`}
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-default-500">
                                            Por evento
                                        </span>
                                        <span className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
                                            {formatPrice(visiblePrices.pricePerEvent)}
                                        </span>
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-default-500">
                                    Precio
                                </span>
                                <span className="text-lg font-bold text-foreground">
                                    Consultar
                                </span>
                            </div>
                        )}
                    </div>

                    {isOwner ? (
                        <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0">
                            <Button
                                as={Link}
                                href={`/musicians/${musician.slug || musician.id}`}
                                target="_blank"
                                variant="flat"
                                radius="full"
                                size="sm"
                                className="font-semibold px-2 sm:px-4 sm:h-10 sm:text-sm"
                                startContent={
                                    <Icon
                                        icon="material-symbols:open-in-new"
                                        className="text-base sm:text-lg"
                                    />
                                }
                            >
                                <span className="hidden sm:inline">Ver página pública</span>
                                <span className="sm:hidden">Ver público</span>
                            </Button>
                            <Button
                                color="primary"
                                radius="full"
                                size="sm"
                                className="font-semibold shadow-glow px-3 sm:px-4 sm:h-10 sm:text-sm"
                                onPress={onEdit}
                                startContent={
                                    <Icon icon="material-symbols:edit" className="text-base sm:text-lg" />
                                }
                            >
                                Editar perfil
                            </Button>
                        </div>
                    ) : (
                        <BookActionButton
                            musicianId={musician.id}
                            label="Solicitar reserva"
                            radius="full"
                            size="md"
                            className="font-semibold shadow-glow hover:shadow-glow-lg shrink-0"
                            onBook={onBookingOpen}
                        />
                    )}
                </div>
            </div>
            </div>

            {!isOwner ? (
                <BookingRequestModal
                    musician={{ id: musician.id, name: musician.name }}
                    isOpen={isBookingOpen}
                    onOpenChange={onBookingOpenChange}
                />
            ) : null}

            <VideoPlaybackModal
                isOpen={videoPlayback.isOpen}
                onOpenChange={videoPlayback.onOpenChange}
                url={videoPlayback.url}
                title={videoPlayback.title}
            />

            <ImageLightboxModal
                isOpen={isLightboxOpen}
                onOpenChange={onLightboxOpenChange}
                src={lightboxSrc}
                alt={lightboxAlt}
            />
        </>
    );
}

