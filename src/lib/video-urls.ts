const YOUTUBE_PATTERN =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/|m\.youtube\.com\/watch\?v=)[\w-]+/i;

const VIMEO_PATTERN = /^(https?:\/\/)?(www\.)?(vimeo\.com\/|player\.vimeo\.com\/video\/)\d+/i;

export function isSupportedVideoUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;
    return YOUTUBE_PATTERN.test(trimmed) || VIMEO_PATTERN.test(trimmed);
}

export function normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://${trimmed}`;
}

export function isValidSocialUrl(url: string): boolean {
    const normalized = normalizeUrl(url);
    try {
        new URL(normalized);
        return true;
    } catch {
        return false;
    }
}

export function getVideoPlatformLabel(url: string): string {
    if (YOUTUBE_PATTERN.test(url)) return "YouTube";
    if (VIMEO_PATTERN.test(url)) return "Vimeo";
    return "Video";
}

export function getVimeoVideoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    return match?.[1] ?? null;
}

/** Extracts a YouTube video ID from common URL formats. */
export function getYoutubeVideoId(url: string): string | null {
    const normalized = normalizeUrl(url);
    if (!normalized) return null;

    try {
        const parsed = new URL(normalized);
        const host = parsed.hostname.replace(/^www\./, "");

        if (host === "youtu.be") {
            return parsed.pathname.slice(1).split("/")[0] || null;
        }

        if (host.includes("youtube.com") || host === "m.youtube.com") {
            const fromQuery = parsed.searchParams.get("v");
            if (fromQuery) return fromQuery;

            const path = parsed.pathname;
            const embedMatch = path.match(/\/embed\/([^/?]+)/);
            if (embedMatch?.[1]) return embedMatch[1];

            const shortsMatch = path.match(/\/shorts\/([^/?]+)/);
            if (shortsMatch?.[1]) return shortsMatch[1];

            const vMatch = path.match(/\/v\/([^/?]+)/);
            if (vMatch?.[1]) return vMatch[1];
        }
    } catch {
        return null;
    }

    return null;
}

export function getYoutubeEmbedUrl(url: string): string | null {
    const id = getYoutubeVideoId(url);
    if (!id) return null;
    try {
        const parsed = new URL(normalizeUrl(url));
        const list = parsed.searchParams.get("list");
        if (list) {
            return `https://www.youtube.com/embed/${id}?list=${list}`;
        }
    } catch {}
    return `https://www.youtube.com/embed/${id}`;
}

export function getYoutubeThumbnailUrl(url: string): string | null {
    const id = getYoutubeVideoId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function getVideoEmbedUrl(url: string): string | null {
    const trimmed = url.trim();
    if (!trimmed) return null;

    const youtubeEmbed = getYoutubeEmbedUrl(trimmed);
    if (youtubeEmbed) return youtubeEmbed;

    const vimeoId = getVimeoVideoId(trimmed);
    return vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : null;
}

/** Embed URL with autoplay-friendly params for modal playback. */
export function getVideoAutoplayEmbedUrl(url: string): string | null {
    const embed = getVideoEmbedUrl(url);
    if (!embed) return null;

    try {
        const parsed = new URL(embed);
        // Privacy-enhanced YouTube host tends to behave more reliably in modals.
        if (parsed.hostname.includes("youtube.com")) {
            parsed.hostname = "www.youtube-nocookie.com";
        }
        parsed.searchParams.set("autoplay", "1");
        parsed.searchParams.set("rel", "0");
        parsed.searchParams.set("modestbranding", "1");
        parsed.searchParams.set("playsinline", "1");
        return parsed.toString();
    } catch {
        const joiner = embed.includes("?") ? "&" : "?";
        return `${embed}${joiner}autoplay=1`;
    }
}
