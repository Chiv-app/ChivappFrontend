"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    createPublicShareReview,
    getPublicShare,
    guestNameStorageKey,
    listPublicShareReviews,
    uploadPublicShareFile,
} from "@/lib/booking-share";
import {
    formatBookingDate,
    formatBookingTime,
} from "@/lib/booking-labels";
import { resolveUploadUrl } from "@/lib/uploads";
import { formatPeruDateTime } from "@/lib/date-utils";
import type { BookingReviewOut, BookingSharePublicOut } from "@/types/api";

const REVIEW_EMOJIS = ["🤩", "🔥", "💃", "👏", "❤️", "🎵", "🥳", "✨"];

function formatReviewTime(value: string): string {
    return formatPeruDateTime(value);
}

export default function GuestShareView({ token }: { token: string }) {
    const [share, setShare] = useState<BookingSharePublicOut | null>(null);
    const [reviews, setReviews] = useState<BookingReviewOut[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [guestName, setGuestName] = useState("");
    const [joined, setJoined] = useState(false);

    const [rating, setRating] = useState(5);
    const [emoji, setEmoji] = useState("🤩");
    const [comment, setComment] = useState("");
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const saved =
            typeof window !== "undefined"
                ? window.localStorage.getItem(guestNameStorageKey(token))
                : null;
        if (saved && saved.trim().length >= 2) {
            setGuestName(saved);
            setJoined(true);
        }
    }, [token]);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        Promise.all([getPublicShare(token), listPublicShareReviews(token)])
            .then(([shareData, reviewData]) => {
                setShare(shareData);
                setReviews(reviewData);
            })
            .catch((err) => {
                setShare(null);
                setReviews([]);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Este enlace ya no está disponible.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [token]);

    function handleJoin(event: FormEvent) {
        event.preventDefault();
        const name = guestName.trim();
        if (name.length < 2) {
            addToast({
                title: "Nombre requerido",
                description: "Escribe tu nombre para entrar.",
                color: "warning",
            });
            return;
        }
        window.localStorage.setItem(guestNameStorageKey(token), name);
        setGuestName(name);
        setJoined(true);
    }

    async function handleUpload(file: File | null) {
        if (!file) return;
        setIsUploading(true);
        try {
            const url = await uploadPublicShareFile(token, file);
            setPhotoUrl(url);
            addToast({ title: "Foto cargada", color: "success" });
        } catch {
            addToast({
                title: "No se pudo subir",
                description: "Intenta con otra imagen.",
                color: "danger",
            });
        } finally {
            setIsUploading(false);
        }
    }

    async function handlePublish(event: FormEvent) {
        event.preventDefault();
        setIsSaving(true);
        try {
            const created = await createPublicShareReview(token, {
                guest_name: guestName.trim(),
                rating,
                emoji,
                comment: comment.trim() || null,
                photo_urls: photoUrl ? [photoUrl] : [],
                video_urls: [],
            });
            setReviews((current) => [...current, created]);
            setComment("");
            setPhotoUrl(null);
            setRating(5);
            setEmoji("🤩");
            addToast({ title: "Reacción publicada", color: "success" });
        } catch (err) {
            addToast({
                title: "No se pudo publicar",
                description: err instanceof Error ? err.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16">
                <div className="h-72 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    if (error || !share) {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <Icon
                    icon="material-symbols:link-off"
                    width={40}
                    className="mx-auto text-default-400 mb-4"
                />
                <h1 className="text-2xl font-bold text-foreground">
                    Enlace no disponible
                </h1>
                <p className="text-default-500 mt-3">
                    {error ||
                        "La reserva finalizó o el compartir fue cancelado."}
                </p>
            </div>
        );
    }

    if (!joined) {
        return (
            <div className="max-w-md mx-auto px-4 py-16">
                <Card className="border border-default-200/70 shadow-soft overflow-hidden">
                    <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 py-6">
                        <Chip color="primary" variant="flat" size="sm" className="mb-3">
                            Invitado
                        </Chip>
                        <h1 className="text-2xl font-bold text-foreground">
                            {share.event_type}
                        </h1>
                        <p className="text-sm text-default-600 mt-2">
                            {share.message}
                        </p>
                    </div>
                    <CardBody className="p-6">
                        <form onSubmit={handleJoin} className="flex flex-col gap-4">
                            <Input
                                label="Tu nombre"
                                placeholder="Ej. Ana Pérez"
                                value={guestName}
                                onValueChange={setGuestName}
                                variant="bordered"
                                autoFocus
                                isRequired
                            />
                            <Button
                                type="submit"
                                color="primary"
                                radius="lg"
                                className="font-semibold"
                            >
                                Entrar al show
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-8 sm:py-10 flex flex-col gap-6">
            <Card className="border border-default-200/70 shadow-soft overflow-hidden">
                <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                            <Chip color="primary" variant="flat" size="sm" className="mb-3">
                                Detalle del evento
                            </Chip>
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                                {share.event_type}
                            </h1>
                            <p className="text-default-600 mt-2">
                                Hola,{" "}
                                <span className="font-semibold text-foreground">
                                    {guestName}
                                </span>
                                <span className="text-default-500"> · Invitado</span>
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="flat"
                            radius="lg"
                            onPress={() => {
                                window.localStorage.removeItem(guestNameStorageKey(token));
                                setJoined(false);
                            }}
                        >
                            Cambiar nombre
                        </Button>
                    </div>
                </div>
                <CardBody className="gap-3 p-6 text-sm">
                    <p>
                        <span className="text-default-500">Artista: </span>
                        <span className="font-semibold text-foreground">
                            {share.musician_name || "Por confirmar"}
                        </span>
                    </p>
                    <p>
                        <span className="text-default-500">Fecha: </span>
                        {formatBookingDate(share.event_date)} ·{" "}
                        {formatBookingTime(share.start_time)}
                        {share.end_time ? ` – ${formatBookingTime(share.end_time)}` : ""}
                    </p>
                    {share.location_city ? (
                        <p>
                            <span className="text-default-500">Ciudad: </span>
                            {share.location_city}
                        </p>
                    ) : null}
                    <p className="text-xs text-default-400 mt-2">
                        Vista mínima para invitados. No se muestran montos ni documentos.
                    </p>
                </CardBody>
            </Card>

            <Card className="border border-secondary/30 shadow-soft overflow-hidden">
                <div className="bg-gradient-to-br from-secondary/15 via-secondary/5 to-transparent px-6 py-5">
                    <Chip color="secondary" variant="flat" size="sm" className="mb-3">
                        {reviews.length}{" "}
                        {reviews.length === 1 ? "reacción" : "reacciones"}
                    </Chip>
                    <h2 className="text-xl font-bold text-foreground">
                        Timeline del show
                    </h2>
                    <p className="text-sm text-default-600 mt-2">
                        Deja tu reacción mientras disfrutas el evento.
                    </p>
                </div>
                <CardBody className="gap-6 p-6">
                    {share.reactions_open ? (
                        <form
                            onSubmit={handlePublish}
                            className="rounded-2xl border border-secondary/25 bg-secondary/5 p-4 flex flex-col gap-4"
                        >
                            <p className="font-semibold text-foreground">
                                Nueva reacción
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <Button
                                        key={value}
                                        size="sm"
                                        radius="lg"
                                        variant={rating === value ? "solid" : "bordered"}
                                        color="warning"
                                        onPress={() => setRating(value)}
                                    >
                                        {value}★
                                    </Button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {REVIEW_EMOJIS.map((item) => (
                                    <Button
                                        key={item}
                                        size="sm"
                                        radius="lg"
                                        variant={emoji === item ? "solid" : "flat"}
                                        color="secondary"
                                        onPress={() => setEmoji(item)}
                                    >
                                        {item}
                                    </Button>
                                ))}
                            </div>
                            <Textarea
                                label="Comentario (opcional)"
                                value={comment}
                                onValueChange={setComment}
                                variant="bordered"
                                minRows={2}
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(event) =>
                                        handleUpload(event.target.files?.[0] ?? null)
                                    }
                                />
                                <Button
                                    variant="flat"
                                    radius="lg"
                                    isLoading={isUploading}
                                    onPress={() => fileRef.current?.click()}
                                >
                                    {photoUrl ? "Cambiar foto" : "Agregar foto"}
                                </Button>
                                {photoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={resolveUploadUrl(photoUrl) ?? undefined}
                                        alt="Vista previa"
                                        className="h-16 w-16 rounded-xl object-cover border border-default-200"
                                    />
                                ) : null}
                            </div>
                            <Button
                                type="submit"
                                color="secondary"
                                radius="lg"
                                className="font-semibold w-fit"
                                isLoading={isSaving}
                                startContent={
                                    <Icon icon="material-symbols:send" width={18} />
                                }
                            >
                                Publicar reacción
                            </Button>
                        </form>
                    ) : (
                        <p className="text-sm text-default-500">
                            Las reacciones se abrirán cuando el show esté activo.
                        </p>
                    )}

                    {reviews.length === 0 ? (
                        <p className="text-sm text-default-500 text-center py-6">
                            Aún no hay reacciones. ¡Sé el primero!
                        </p>
                    ) : (
                        <ol className="flex flex-col gap-4">
                            {reviews.map((review) => {
                                const photos = (review.photo_urls ?? []).filter(Boolean);
                                return (
                                    <li
                                        key={review.id}
                                        className="rounded-2xl border border-default-200 bg-content1 px-4 py-3"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold text-foreground">
                                                    {review.author_label ||
                                                        review.guest_name ||
                                                        "Invitado"}
                                                </p>
                                                <Chip size="sm" color="warning" variant="flat">
                                                    {review.rating}★
                                                </Chip>
                                                {review.emoji ? (
                                                    <span className="text-lg">{review.emoji}</span>
                                                ) : null}
                                            </div>
                                            <p className="text-xs text-default-400">
                                                {formatReviewTime(review.created_at)}
                                            </p>
                                        </div>
                                        {review.comment ? (
                                            <p className="text-sm text-default-700 mt-2 whitespace-pre-wrap">
                                                {review.comment}
                                            </p>
                                        ) : null}
                                        {photos.length > 0 ? (
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {photos.map((url) => {
                                                    const src = resolveUploadUrl(url);
                                                    if (!src) return null;
                                                    return (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            key={url}
                                                            src={src}
                                                            alt="Foto del show"
                                                            className="max-h-56 w-full rounded-xl object-cover border border-default-200"
                                                        />
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
