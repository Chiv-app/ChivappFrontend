"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
    Button,
    Chip,
    Spinner,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { ApiError } from "@/lib/api";
import {
    getContractorRecommendation,
    recommendContractor,
} from "@/lib/bookings";
import type { BookingOut, ContractorRecommendationOut } from "@/types/api";

type Props = {
    booking: BookingOut;
};

export default function RecommendContractorCard({ booking }: Props) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [existing, setExisting] = useState<ContractorRecommendationOut | null>(
        null,
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [reloadCount, setReloadCount] = useState(0);

    const isLocked = existing != null;
    const isCompleted = booking.status === "completed";

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) {
                setIsLoading(true);
                setLoadError(null);
            }
        });
        getContractorRecommendation(booking.id)
            .then((data) => {
                if (!cancelled) setExisting(data);
            })
            .catch((err) => {
                if (cancelled) return;
                if (err instanceof ApiError && err.status === 404) {
                    setExisting(null);
                } else {
                    setExisting(null);
                    setLoadError(
                        err instanceof Error
                            ? err.message
                            : "No se pudo verificar el estado de tu recomendación.",
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [booking.id, reloadCount]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (isLocked) return;

        const trimmed = comment.trim();
        if (trimmed.length < 10) {
            addToast({
                title: "Comentario corto",
                description: "Escribe al menos 10 caracteres.",
                color: "warning",
            });
            return;
        }
        setIsSaving(true);
        try {
            const created = await recommendContractor(booking.id, {
                rating,
                comment: trimmed,
            });
            setExisting(created);
            addToast({
                title: "Recomendación publicada",
                description:
                    "Quedará visible en el perfil del cliente. Ya puedes pagar a tus integrantes en Pagos.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo publicar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div
            className={`border shadow-soft rounded-2xl bg-content1 p-6 flex flex-col gap-4 ${
                isLocked
                    ? "border-default-200/70 opacity-95"
                    : "border-primary/25"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <Icon
                            icon={
                                isLocked
                                    ? "material-symbols:lock"
                                    : "material-symbols:thumb-up"
                            }
                            width={22}
                            className={
                                isLocked
                                    ? "text-default-400 mt-0.5"
                                    : "text-primary mt-0.5"
                            }
                        />
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-foreground">
                                Recomendar al cliente
                            </h3>
                            <p className="text-sm text-default-500 mt-1">
                                {isLocked
                                    ? "Ya enviaste tu recomendación para esta reserva. Solo se permite una vez."
                                    : "Tu recomendación se mostrará en el perfil público del contratista. Solo puedes enviarla una vez."}
                            </p>
                        </div>
                    </div>
                    {isLocked ? (
                        <Chip size="sm" variant="flat" color="default">
                            Bloqueado
                        </Chip>
                    ) : isCompleted ? (
                        <Chip size="sm" variant="flat" color="warning">
                            Última oportunidad
                        </Chip>
                    ) : null}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-6">
                        <Spinner size="sm" color="primary" />
                    </div>
                ) : loadError ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                        <span>{loadError}</span>
                        <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            onPress={() => setReloadCount((c) => c + 1)}
                            startContent={<Icon icon="material-symbols:refresh" width={16} />}
                        >
                            Reintentar
                        </Button>
                    </div>
                ) : isLocked && existing ? (
                    <div className="rounded-2xl border border-default-200/70 bg-default-50 px-4 py-3 space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                            {"★".repeat(existing.rating)}
                            <span className="text-default-400">
                                {"★".repeat(Math.max(0, 5 - existing.rating))}
                            </span>
                        </p>
                        <p className="text-sm text-default-600 whitespace-pre-wrap">
                            {existing.comment}
                        </p>
                        <Link
                            href={`/contractors/${booking.contractor_id}`}
                            className="inline-flex text-sm font-semibold text-primary"
                        >
                            Ver perfil del cliente
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                        <Textarea
                            label="Comentario"
                            placeholder="¿Cómo fue trabajar con este cliente?"
                            value={comment}
                            onValueChange={setComment}
                            variant="bordered"
                            minRows={3}
                            isRequired
                        />
                        <Button
                            type="submit"
                            color="primary"
                            radius="lg"
                            className="w-fit font-semibold"
                            isLoading={isSaving}
                        >
                            Publicar recomendación
                        </Button>
                    </form>
                )}
        </div>
    );
}
