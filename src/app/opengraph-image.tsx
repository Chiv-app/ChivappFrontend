import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const alt = "Chivapp — Encuentra y contrata músicos para tu evento";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
    let logoDataUrl = "";
    try {
        const logoPath = path.join(process.cwd(), "public", "logo-chivapp.png");
        const logoBuffer = fs.readFileSync(logoPath);
        logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch {
        // Fallback if file read fails in any environment
    }

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "64px 72px",
                    background:
                        "linear-gradient(135deg, #090B0C 0%, #0E1618 35%, #132428 70%, #1A383F 100%)",
                    color: "#F5F7F8",
                    fontFamily: "sans-serif",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                    }}
                >
                    {logoDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoDataUrl}
                            alt="Chivapp"
                            width={280}
                            height={89}
                            style={{ objectFit: "contain" }}
                        />
                    ) : (
                        <div
                            style={{
                                fontSize: 44,
                                fontWeight: 800,
                                letterSpacing: "-0.04em",
                                color: "#46C0D9",
                            }}
                        >
                            Chivapp
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div
                        style={{
                            fontSize: 60,
                            fontWeight: 800,
                            letterSpacing: "-0.03em",
                            lineHeight: 1.12,
                            maxWidth: 960,
                            color: "#FFFFFF",
                        }}
                    >
                        Encuentra y contrata músicos para tu evento
                    </div>
                    <div
                        style={{
                            fontSize: 26,
                            color: "#94A3B8",
                            maxWidth: 860,
                            lineHeight: 1.35,
                        }}
                    >
                        Perfiles verificados · Pago protegido · Reserva directa en minutos
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 22,
                        color: "#64748B",
                        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                        paddingTop: "24px",
                    }}
                >
                    <span style={{ color: "#46C0D9", fontWeight: 600 }}>Chivapp</span>
                    <span>Música en vivo para bodas, serenatas y celebraciones</span>
                </div>
            </div>
        ),
        { ...size },
    );
}
