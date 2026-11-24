"use client";

import { useState } from "react";
import {
    Button,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { formatBookingDate, formatBookingTime } from "@/lib/booking-labels";

type Role = "musician" | "contractor";
type CardAspect = "story" | "square";
type CardTheme = "obsidian" | "ivory";

export type BookingAchievementShareModalProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role;
    eventType: string;
    eventDate: string;
    startTime: string;
    city?: string | null;
    musicianName: string;
};

function wrapCanvasText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
): number {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    for (let n = 0; n < words.length; n += 1) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, currentY);
            line = words[n] + " ";
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), x, currentY);
    return currentY + lineHeight;
}

function renderAchievementCanvas({
    role,
    aspect,
    theme,
    eventType,
    formattedDate,
    formattedTime,
    cityLabel,
    musicianName,
}: {
    role: Role;
    aspect: CardAspect;
    theme: CardTheme;
    eventType: string;
    formattedDate: string;
    formattedTime: string;
    cityLabel: string;
    musicianName: string;
}): HTMLCanvasElement {
    const width = 1080;
    const height = aspect === "story" ? 1920 : 1080;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const isDark = theme === "obsidian";

    // Fondo minimalista con degradado sutil
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (isDark) {
        bgGrad.addColorStop(0, "#090D16");
        bgGrad.addColorStop(0.5, "#0F172A");
        bgGrad.addColorStop(1, "#0B1F2A");
    } else {
        bgGrad.addColorStop(0, "#FAFAFA");
        bgGrad.addColorStop(0.6, "#F1F5F9");
        bgGrad.addColorStop(1, "#E0F2FE");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Halo radial decorativo
    const glowGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        40,
        width * 0.5,
        height * 0.35,
        width * 0.65,
    );
    glowGrad.addColorStop(
        0,
        isDark ? "rgba(20, 184, 166, 0.22)" : "rgba(14, 165, 233, 0.14)",
    );
    glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // Marco interior minimalista
    const pad = aspect === "story" ? 84 : 68;
    ctx.strokeStyle = isDark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(15, 23, 42, 0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, 48);
    ctx.stroke();

    ctx.textAlign = "center";
    const centerX = width / 2;
    let cursorY = aspect === "story" ? 310 : 190;

    // Píldora superior
    const badgeText =
        role === "musician"
            ? "FECHA RESERVADA · AGENDA OFICIAL"
            : "MÚSICA EN VIVO CONFIRMADA";
    ctx.font = "700 26px system-ui, -apple-system, sans-serif";
    const badgeWidth = ctx.measureText(badgeText).width + 72;
    ctx.fillStyle = isDark
        ? "rgba(20, 184, 166, 0.16)"
        : "rgba(13, 148, 136, 0.12)";
    ctx.beginPath();
    ctx.roundRect(centerX - badgeWidth / 2, cursorY - 38, badgeWidth, 56, 28);
    ctx.fill();

    ctx.fillStyle = isDark ? "#2DD4BF" : "#0F766E";
    ctx.fillText(badgeText, centerX, cursorY);

    cursorY += aspect === "story" ? 180 : 120;

    // Nombre del artista / agrupación
    ctx.fillStyle = isDark ? "#FFFFFF" : "#0F172A";
    ctx.font =
        aspect === "story"
            ? "800 72px system-ui, -apple-system, sans-serif"
            : "800 60px system-ui, -apple-system, sans-serif";
    cursorY = wrapCanvasText(
        ctx,
        musicianName,
        centerX,
        cursorY,
        width - pad * 3,
        aspect === "story" ? 84 : 70,
    );

    cursorY += aspect === "story" ? 40 : 24;

    // Subtítulo del logro
    ctx.fillStyle = isDark ? "#94A3B8" : "#475569";
    ctx.font = "500 34px system-ui, -apple-system, sans-serif";
    const subCopy =
        role === "musician"
            ? "Presentación confirmada para"
            : "Estará presente en nuestro";
    ctx.fillText(subCopy, centerX, cursorY);

    cursorY += aspect === "story" ? 110 : 80;

    // Tipo de evento destacado
    ctx.fillStyle = isDark ? "#38BDF8" : "#0284C7";
    ctx.font =
        aspect === "story"
            ? "900 84px system-ui, -apple-system, sans-serif"
            : "900 68px system-ui, -apple-system, sans-serif";
    cursorY = wrapCanvasText(
        ctx,
        eventType.toUpperCase(),
        centerX,
        cursorY,
        width - pad * 3,
        aspect === "story" ? 92 : 76,
    );

    cursorY += aspect === "story" ? 70 : 42;

    // Caja de Fecha y Ciudad (sin dirección exacta por privacidad)
    const boxWidth = width - pad * 3.2;
    const boxHeight = aspect === "story" ? 230 : 170;
    ctx.fillStyle = isDark
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(15, 23, 42, 0.04)";
    ctx.strokeStyle = isDark
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(15, 23, 42, 0.08)";
    ctx.beginPath();
    ctx.roundRect(centerX - boxWidth / 2, cursorY, boxWidth, boxHeight, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDark ? "#F8FAFC" : "#0F172A";
    ctx.font = "700 38px system-ui, -apple-system, sans-serif";
    ctx.fillText(
        `${formattedDate} · ${formattedTime} hrs`,
        centerX,
        cursorY + (aspect === "story" ? 95 : 74),
    );

    ctx.fillStyle = isDark ? "#94A3B8" : "#64748B";
    ctx.font = "600 32px system-ui, -apple-system, sans-serif";
    ctx.fillText(
        cityLabel,
        centerX,
        cursorY + (aspect === "story" ? 165 : 130),
    );

    // Sello inferior Chivapp
    const footerY = height - pad - (aspect === "story" ? 90 : 55);
    ctx.fillStyle = isDark ? "#2DD4BF" : "#0F766E";
    ctx.font = "800 34px system-ui, -apple-system, sans-serif";
    ctx.fillText("chivapp", centerX, footerY - 38);

    ctx.fillStyle = isDark ? "#64748B" : "#64748B";
    ctx.font = "500 24px system-ui, -apple-system, sans-serif";
    ctx.fillText(
        role === "musician"
            ? "Reserva fechas verificadas en chivapp.pe"
            : "Contratación musical verificada",
        centerX,
        footerY,
    );

    return canvas;
}

export default function BookingAchievementShareModal({
    isOpen,
    onOpenChange,
    role,
    eventType,
    eventDate,
    startTime,
    city,
    musicianName,
}: BookingAchievementShareModalProps) {
    const [aspect, setAspect] = useState<CardAspect>("story");
    const [theme, setTheme] = useState<CardTheme>("obsidian");
    const [isSharing, setIsSharing] = useState(false);

    const formattedDate = formatBookingDate(eventDate);
    const formattedTime = formatBookingTime(startTime);
    const cityLabel = city?.trim() || "Perú";
    const isDark = theme === "obsidian";

    const captionText =
        role === "musician"
            ? `🎶 ¡Nueva fecha reservada! Estaremos presentes en un ${eventType} este ${formattedDate} en ${cityLabel}. Reserva tu presentación con ${musicianName} en Chivapp.`
            : `🎶 ¡Tenemos música en vivo confirmada! ${musicianName} estará en nuestro ${eventType} este ${formattedDate}.`;

    async function handleDownloadOrShare(mode: "download" | "share") {
        setIsSharing(true);
        try {
            const canvas = renderAchievementCanvas({
                role,
                aspect,
                theme,
                eventType,
                formattedDate,
                formattedTime,
                cityLabel,
                musicianName,
            });

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/png"),
            );
            if (!blob) throw new Error("No se pudo generar la imagen.");

            const fileName = `chivapp-${eventType.toLowerCase().replace(/\s+/g, "-")}-${eventDate}.png`;

            if (
                mode === "share" &&
                typeof navigator !== "undefined" &&
                navigator.share
            ) {
                const file = new File([blob], fileName, { type: "image/png" });
                const canShareFiles =
                    typeof navigator.canShare === "function" &&
                    navigator.canShare({ files: [file] });
                if (canShareFiles) {
                    await navigator.share({
                        title: `${musicianName} · ${eventType}`,
                        text: captionText,
                        files: [file],
                    });
                    return;
                }
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(captionText).catch(() => {});
            }
            addToast({
                title: "Imagen lista para tus redes",
                description:
                    "Se descargó la tarjeta en alta resolución y copiamos el texto sugerido al portapapeles.",
                color: "success",
            });
        } catch (error) {
            if ((error as Error)?.name !== "AbortError") {
                addToast({
                    title: "No se pudo compartir",
                    description:
                        error instanceof Error
                            ? error.message
                            : "Intenta descargar la imagen.",
                    color: "warning",
                });
            }
        } finally {
            setIsSharing(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="lg"
            scrollBehavior="inside"
            placement="center"
            closeButton={<ModalCloseButton aria-label="Cerrar" />}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 pb-2">
                            <span className="text-lg font-bold text-foreground">
                                Compartir logro en redes
                            </span>
                            <span className="text-xs font-normal text-default-500">
                                {role === "musician"
                                    ? "Publica en tus historias o estados que cerraste una nueva fecha (sin mostrar dirección exacta ni datos privados del cliente)."
                                    : "Comparte con tus invitados o en tus historias que ya tienes música en vivo confirmada."}
                            </span>
                        </ModalHeader>

                        <ModalBody className="flex flex-col gap-4 py-3">
                            {/* Controles de formato y estilo */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="inline-flex items-center gap-1 rounded-full border border-default-200 bg-default-100/70 p-1">
                                    <button
                                        type="button"
                                        aria-pressed={aspect === "story"}
                                        onClick={() => setAspect("story")}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                                            aspect === "story"
                                                ? "bg-primary text-primary-foreground"
                                                : "text-default-600"
                                        }`}
                                    >
                                        Historia (9:16)
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={aspect === "square"}
                                        onClick={() => setAspect("square")}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                                            aspect === "square"
                                                ? "bg-primary text-primary-foreground"
                                                : "text-default-600"
                                        }`}
                                    >
                                        Post (1:1)
                                    </button>
                                </div>

                                <div className="inline-flex items-center gap-1 rounded-full border border-default-200 bg-default-100/70 p-1">
                                    <button
                                        type="button"
                                        aria-pressed={theme === "obsidian"}
                                        onClick={() => setTheme("obsidian")}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                                            theme === "obsidian"
                                                ? "bg-foreground text-background"
                                                : "text-default-600"
                                        }`}
                                    >
                                        Oscuro
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={theme === "ivory"}
                                        onClick={() => setTheme("ivory")}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                                            theme === "ivory"
                                                ? "bg-foreground text-background"
                                                : "text-default-600"
                                        }`}
                                    >
                                        Claro
                                    </button>
                                </div>
                            </div>

                            {/* Vista previa minimalista en vivo */}
                            <div className="flex justify-center">
                                <div
                                    className={`relative overflow-hidden rounded-3xl border p-6 flex flex-col items-center justify-between text-center shadow-xl transition-all ${
                                        aspect === "story"
                                            ? "w-64 aspect-[9/16]"
                                            : "w-72 aspect-square"
                                    } ${
                                        isDark
                                            ? "bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 border-white/15 text-white"
                                            : "bg-gradient-to-br from-white via-slate-50 to-sky-50 border-slate-200 text-slate-900"
                                    }`}
                                >
                                    <Chip
                                        size="sm"
                                        variant="flat"
                                        color="primary"
                                        className="text-[10px] font-bold tracking-wider uppercase"
                                    >
                                        {role === "musician"
                                            ? "Fecha reservada"
                                            : "Música en vivo confirmada"}
                                    </Chip>

                                    <div className="flex flex-col items-center gap-1.5 my-auto px-2">
                                        <p className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">
                                            {musicianName}
                                        </p>
                                        <p
                                            className={`text-[11px] ${
                                                isDark
                                                    ? "text-slate-400"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            {role === "musician"
                                                ? "Presentación confirmada para"
                                                : "Estará presente en nuestro"}
                                        </p>
                                        <p className="text-xl sm:text-2xl font-black uppercase tracking-wide text-sky-400 mt-0.5">
                                            {eventType}
                                        </p>

                                        <div
                                            className={`mt-3 w-full rounded-2xl border px-3 py-2.5 text-xs ${
                                                isDark
                                                    ? "border-white/10 bg-white/5 text-slate-200"
                                                    : "border-slate-200 bg-white/80 text-slate-800"
                                            }`}
                                        >
                                            <p className="font-bold capitalize">
                                                {formattedDate}
                                            </p>
                                            <p className="text-[11px] opacity-80 mt-0.5">
                                                {formattedTime} hrs · {cityLabel}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-xs font-extrabold tracking-tight text-teal-400">
                                            chivapp
                                        </span>
                                        <span className="text-[10px] opacity-65">
                                            {role === "musician"
                                                ? "Agenda verificada en chivapp.pe"
                                                : "Contratación musical verificada"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </ModalBody>

                        <ModalFooter className="flex flex-wrap items-center justify-between gap-2">
                            <Button
                                variant="flat"
                                radius="full"
                                size="sm"
                                onPress={onClose}
                            >
                                Cerrar
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="bordered"
                                    radius="full"
                                    size="sm"
                                    isLoading={isSharing}
                                    onPress={() =>
                                        void handleDownloadOrShare("download")
                                    }
                                    startContent={
                                        <Icon
                                            icon="material-symbols:download"
                                            width={17}
                                        />
                                    }
                                    className="font-semibold"
                                >
                                    Descargar PNG
                                </Button>
                                <Button
                                    color="primary"
                                    radius="full"
                                    size="sm"
                                    isLoading={isSharing}
                                    onPress={() =>
                                        void handleDownloadOrShare("share")
                                    }
                                    startContent={
                                        <Icon
                                            icon="material-symbols:ios-share"
                                            width={17}
                                        />
                                    }
                                    className="font-bold"
                                >
                                    Compartir ahora
                                </Button>
                            </div>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
