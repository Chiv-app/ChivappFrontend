function getApiUrl(): string {
    if (typeof window !== "undefined") {
        return process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    }
    return (
        process.env.API_URL_INTERNAL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:8000/api/v1"
    );
}

function getUploadBaseUrl(): string {
    if (typeof window !== "undefined") {
        // Prefer same-origin rewrite (/uploads → backend) when no public uploads URL.
        return process.env.NEXT_PUBLIC_UPLOADS_URL || "";
    }
    return process.env.UPLOADS_URL_INTERNAL || "http://localhost:8000";
}

function toUploadsPath(pathname: string): string | null {
    if (!pathname.startsWith("/uploads")) return null;
    return pathname;
}

/**
 * Normalize stored upload paths to a browser-usable URL.
 * Prefer same-origin `/uploads/...` so next/image can use the Next rewrite
 * instead of hitting localhost (blocked as private IP in Next 16).
 */
export function resolveUploadUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        try {
            const parsed = new URL(trimmed);
            if (parsed.pathname.startsWith("/uploads/")) {
                const filename = parsed.pathname.replace("/uploads/", "");
                if (process.env.NEXT_PUBLIC_GCS_BUCKET_URL) {
                    return `${process.env.NEXT_PUBLIC_GCS_BUCKET_URL}/${filename}`;
                }
                const asUploads = toUploadsPath(parsed.pathname);
                if (asUploads) return asUploads;
            }
        } catch {
            // fall through
        }
        return trimmed;
    }

    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    
    if (path.startsWith("/uploads/")) {
        if (process.env.NEXT_PUBLIC_GCS_BUCKET_URL) {
            const filename = path.replace("/uploads/", "");
            return `${process.env.NEXT_PUBLIC_GCS_BUCKET_URL}/${filename}`;
        }
    }

    const asUploads = toUploadsPath(path);
    if (asUploads) {
        return asUploads;
    }

    const base = getUploadBaseUrl().replace(/\/$/, "");
    if (!base) {
        return path;
    }
    return `${base}${path}`;
}

/** Absolute URL for embeds that need a full origin (e.g. Google Docs viewer). */
export function toAbsoluteUploadUrl(url: string | null | undefined): string | null {
    const resolved = resolveUploadUrl(url);
    if (!resolved) return null;
    if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
        return resolved;
    }
    if (typeof window === "undefined") {
        const site =
            process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
            (process.env.NODE_ENV === "production" ? "https://chiv.app" : "http://localhost:3000");
        return `${site}${resolved.startsWith("/") ? resolved : `/${resolved}`}`;
    }
    return `${window.location.origin}${resolved.startsWith("/") ? resolved : `/${resolved}`}`;
}

const COMPRESS_MAX_EDGE = 2000;
const COMPRESS_QUALITY = 0.85;
const COMPRESS_MIN_BYTES = 280_000;

function loadImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("No se pudo leer la imagen"));
        };
        image.src = url;
    });
}

/**
 * Reduce peso de imágenes grandes sin bajar nitidez legible (comprobantes).
 * PDFs y archivos no-imagen se dejan igual.
 */
export async function compressImageForUpload(file: File): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
        return file;
    }

    try {
        const image = await loadImageElement(file);
        const longest = Math.max(image.naturalWidth, image.naturalHeight);
        const needsResize = longest > COMPRESS_MAX_EDGE;
        const isHeavy = file.size > COMPRESS_MIN_BYTES;
        const needsEncode = needsResize || isHeavy;

        if (!needsEncode) {
            return file;
        }

        const scale = needsResize ? COMPRESS_MAX_EDGE / longest : 1;
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        // Fondo blanco para PNG → JPEG (comprobantes); firmas pequeñas no llegan aquí.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((result) => resolve(result), "image/jpeg", COMPRESS_QUALITY);
        });

        if (!blob || blob.size >= file.size) {
            return file;
        }

        const baseName = file.name.replace(/\.[^.]+$/, "") || "comprobante";
        return new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
        });
    } catch {
        return file;
    }
}

export async function uploadFile(file: File): Promise<string> {
    const prepared = await compressImageForUpload(file);
    const formData = new FormData();
    formData.append("file", prepared);

    const res = await fetch(`${getApiUrl()}/uploads/`, {
        method: "POST",
        credentials: "include",
        body: formData,
    });

    if (!res.ok) {
        let errorDetail = "No se pudo subir el archivo";
        try {
            const errData = await res.json();
            if (typeof errData?.detail === "string") {
                errorDetail = errData.detail;
            } else if (typeof errData?.error === "string") {
                errorDetail = errData.error;
            } else if (Array.isArray(errData?.detail)) {
                errorDetail = errData.detail
                    .map((item: { msg?: string }) => item.msg)
                    .filter(Boolean)
                    .join(", ");
            }
        } catch {
            // ignore
        }
        throw new Error(errorDetail);
    }

    const data = (await res.json()) as { url: string };
    return data.url;
}

export async function uploadFiles(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
        urls.push(await uploadFile(file));
    }
    return urls;
}

/** Sube una firma dibujada (data URL PNG) al endpoint de uploads. */
export async function uploadSignatureDataUrl(
    dataUrl: string,
    filenamePrefix = "firma",
): Promise<string> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `${filenamePrefix}-${Date.now()}.png`, {
        type: "image/png",
    });
    return uploadFile(file);
}
