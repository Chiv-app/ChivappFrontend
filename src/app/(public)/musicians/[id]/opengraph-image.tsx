import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getMusicianById } from "@/lib/musicians";
import { absoluteImageUrl } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Perfil de músico en Chivapp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    
    let musician;
    try {
        musician = await getMusicianById(id);
    } catch {
        return new Response("Not found", { status: 404 });
    }

    const rawImageUrl = musician.image ?? musician.galleryImages[0] ?? null;
    const imageUrl = rawImageUrl ? absoluteImageUrl(rawImageUrl) : null;

    let logoDataUrl = "";
    try {
        const logoPath = path.join(process.cwd(), "public", "logo-chivapp.png");
        const logoBuffer = fs.readFileSync(logoPath);
        logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch {
        // Fallback
    }

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    backgroundColor: "#132428",
                    color: "white",
                    position: "relative",
                    fontFamily: "sans-serif",
                }}
            >
                {/* Background image */}
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt={musician.name}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                ) : (
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "linear-gradient(135deg, #090B0C 0%, #132428 100%)",
                        }}
                    />
                )}

                {/* Dark gradient overlay to ensure text/logo readability */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.95) 100%)",
                    }}
                />

                {/* Logo Top Left */}
                <div
                    style={{
                        position: "absolute",
                        top: 48,
                        left: 48,
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    {logoDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoDataUrl}
                            alt="Chivapp"
                            height={60}
                            style={{ objectFit: "contain" }}
                        />
                    ) : (
                        <div style={{ fontSize: 40, fontWeight: "bold", color: "#46C0D9" }}>
                            Chivapp
                        </div>
                    )}
                </div>

                {/* Musician Details Bottom */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 56,
                        left: 48,
                        right: 48,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, color: "#FFFFFF" }}>
                            {musician.name}
                        </div>
                        {musician.verified && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, backgroundColor: "#46C0D9", borderRadius: 24 }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z" fill="white"/>
                                </svg>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ fontSize: 36, color: "#94A3B8", fontWeight: 600, display: "flex", gap: 16 }}>
                        {musician.genre && <span>{musician.genre}</span>}
                        {musician.genre && musician.city && <span>•</span>}
                        {musician.city && <span>{musician.city}</span>}
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
