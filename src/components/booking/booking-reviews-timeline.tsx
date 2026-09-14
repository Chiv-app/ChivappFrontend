"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatPeruDateTime } from "@/lib/date-utils";
import { Button, Card, CardBody, Chip, Textarea, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import FileUploadField from "@/components/ui/file-upload-field";
import {
    createBookingReview,
    listBookingReviews,
} from "@/lib/bookings";
import { resolveUploadUrl } from "@/lib/uploads";
import type { BookingOut, BookingReviewOut, UserRole } from "@/types/api";

type Role = Extract<UserRole, "musician" | "contractor">;

type Props = {
    booking: BookingOut;
    role: Role;
    canAdd: boolean;
    onReviewsChanged?: (count: number, hasFinal: boolean) => void;
};

const REVIEW_EMOJIS = ["🤩", "🔥", "💃", "👏", "❤️", "🎵", "🥳", "✨"];

function formatReviewTime(value: string): string {
    return formatPeruDateTime(value);
}

function ReviewTimelineItem({
    review,
    isLast,
}: {
    review: BookingReviewOut;
    isLast: boolean;
}) {
    const photos = (review.photo_urls ?? []).filter(Boolean);

    return (
        <li className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast ? (
                <span
                    className="absolute left-[15px] top-8 h-[calc(100%-0.75rem)] w-0.5 bg-secondary/30"
                    aria-hidden
                />
            ) : null}
            <div className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-lg shadow-soft ring-4 ring-secondary/15">
                {review.is_final ? "★" : review.emoji || "★"}
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border border-default-200 bg-content1 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                            {review.author_label || review.guest_name || "Participante"}
                        </p>
                        <Chip size="sm" color="warning" variant="flat">
                            {review.rating}★
                        </Chip>
                        {review.is_final ? (
                            <Chip size="sm" color="primary" variant="flat">
                                Reseña final
                            </Chip>
                        ) : null}
                    </div>
                    <p className="text-xs text-default-400">
                        {formatReviewTime(review.created_at)}
                    </p>
                </div>
                {review.comment ? (
                    <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {review.comment}
                    </p>
                ) : (
                    <p className="mt-2 text-sm text-default-400 italic">
                        Sin comentario — solo reacción
                    </p>
                )}
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
                                    alt="Foto del evento"
                                    className="max-h-56 w-full rounded-xl border border-default-200 object-cover bg-default-50"
                                />
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </li>
    );
}

export default function BookingReviewsTimeline({
    booking,
    role,
    canAdd,
    onReviewsChanged,
}: Props) {
    const [reviews, setReviews] = useState<BookingReviewOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rating, setRating] = useState(5);
    const [emoji, setEmoji] = useState("🤩");
    const [comment, setComment] = useState("");
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    function notifyChanged(next: BookingReviewOut[]) {
        onReviewsChanged?.(
            next.length,
            next.some((review) => Boolean(review.is_final)),
        );
    }

    function refreshReviews() {
        return listBookingReviews(booking.id)
            .then((data) => {
                setReviews(data);
                notifyChanged(data);
            })
            .catch(() => {
                setReviews([]);
                notifyChanged([]);
            });
    }

    useEffect(() => {
        setIsLoading(true);
        refreshReviews().finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking.id, booking.status]);

    async function handleAddReaction(event: FormEvent) {
        event.preventDefault();
        setIsSaving(true);
        try {
            const created = await createBookingReview(booking.id, {
                rating,
                emoji,
                comment: comment.trim() || null,
                photo_urls: photoUrl ? [photoUrl] : [],
                video_urls: [],
                is_final: false,
            });
            setReviews((current) => {
                const next = [...current, created];
                notifyChanged(next);
                return next;
            });
            setComment("");
            setPhotoUrl(null);
            setRating(5);
            setEmoji("🤩");
            addToast({
                title: "Reacción publicada",
                description: "Se agregó al timeline del show.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo publicar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Card className="border border-secondary/30 shadow-soft overflow-hidden">
            <div className="bg-gradient-to-br from-secondary/15 via-secondary/5 to-transparent px-6 py-5">
                <Chip color="secondary" variant="flat" size="sm" className="mb-3">
                    {reviews.length} {reviews.length === 1 ? "entrada" : "entradas"}
                </Chip>
                <h3 className="text-xl font-bold text-foreground">
                    {role === "contractor" ? "Timeline del show" : "Reacciones del evento"}
                </h3>
                <p className="text-sm text-default-600 mt-2 max-w-2xl">
                    {role === "contractor"
                        ? "Comparte reacciones en vivo durante el evento. La reseña final se pide al finalizar la contratación."
                        : "Reacciones del contratista y la reseña final del show."}
                </p>
            </div>

            <CardBody className="gap-6 p-6">
                {canAdd ? (
                    <form
                        onSubmit={handleAddReaction}
                        className="rounded-2xl border border-secondary/25 bg-secondary/5 p-4 flex flex-col gap-4"
                    >
                        <div className="flex items-center gap-2">
                            <Icon
                                icon="material-symbols:add-comment"
                                width={20}
                                className="text-secondary"
                            />
                            <p className="font-semibold text-foreground">
                                Nueva reacción (opcional)
                            </p>
                        </div>
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
                            placeholder="¿Qué está pasando en el show?"
                            value={comment}
                            onValueChange={setComment}
                            variant="bordered"
                            minRows={2}
                        />
                        <FileUploadField
                            label="Foto del momento"
                            value={photoUrl}
                            onChange={setPhotoUrl}
                            accept="image/jpeg,image/png,image/webp"
                        />
                        {photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={resolveUploadUrl(photoUrl) ?? undefined}
                                alt="Vista previa"
                                className="max-h-40 w-fit rounded-xl border border-default-200 object-cover"
                            />
                        ) : null}
                        <Button
                            type="submit"
                            color="secondary"
                            radius="lg"
                            isLoading={isSaving}
                            className="font-semibold w-fit"
                            startContent={
                                <Icon icon="material-symbols:send" width={18} />
                            }
                        >
                            Publicar en el timeline
                        </Button>
                    </form>
                ) : null}

                {isLoading ? (
                    <div className="h-40 rounded-2xl bg-default-100 animate-pulse" />
                ) : reviews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-default-300 px-4 py-8 text-center">
                        <p className="text-sm text-default-500">
                            {role === "contractor"
                                ? "Aún no hay reacciones. La reseña final se pedirá al finalizar."
                                : "Todavía no hay reseñas del contratista."}
                        </p>
                    </div>
                ) : (
                    <ol className="flex flex-col">
                        {reviews.map((review, index) => (
                            <ReviewTimelineItem
                                key={review.id}
                                review={review}
                                isLast={index === reviews.length - 1}
                            />
                        ))}
                    </ol>
                )}
            </CardBody>
        </Card>
    );
}
