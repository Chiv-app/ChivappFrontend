"use client";

import { useEffect, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    getBookingReviewGraceDeadline,
    getPeruEventEndDate,
    getRemainingCountdown,
} from "@/lib/date-utils";
import type { BookingOut, UserRole } from "@/types/api";

type Role = Extract<UserRole, "musician" | "contractor">;

type Props = {
    booking: BookingOut;
    role: Role;
    hasContractorReview: boolean;
    hasMusicianRecommendation: boolean;
    isLoadingMusicianRecommendation?: boolean;
    onOpenContractorFinalReview?: () => void;
    onCountdownExpiredChange?: (expired: boolean) => void;
};

export default function BookingReviewStatusCountdown({
    booking,
    role,
    hasContractorReview,
    hasMusicianRecommendation,
    isLoadingMusicianRecommendation = false,
    onOpenContractorFinalReview,
    onCountdownExpiredChange,
}: Props) {
    const [now, setNow] = useState<Date>(() => new Date());

    const eventEnd =
        booking.event_date && booking.start_time
            ? getPeruEventEndDate(booking.event_date, booking.start_time, booking.end_time)
            : null;
    const deadline = getBookingReviewGraceDeadline(
        booking.event_date,
        booking.start_time,
        booking.end_time,
    );

    const isEventFinished = eventEnd ? now.getTime() >= eventEnd.getTime() : false;
    const countdown = isEventFinished ? getRemainingCountdown(deadline, now) : null;
    const isGraceExpired = Boolean(countdown?.expired);
    const bothReviewed = hasContractorReview && hasMusicianRecommendation;
    const isUnlocked =
        booking.status === "completed" || bothReviewed || isGraceExpired;

    useEffect(() => {
        onCountdownExpiredChange?.(isGraceExpired);
    }, [isGraceExpired, onCountdownExpiredChange]);

    useEffect(() => {
        if (bothReviewed && booking.status === "completed") return;
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => window.clearInterval(timer);
    }, [bothReviewed, booking.status]);

    const missingLabel =
        !hasContractorReview && !hasMusicianRecommendation
            ? "Faltan las reseñas del contratista y del músico"
            : !hasContractorReview
              ? "Falta la reseña final del contratista"
              : !hasMusicianRecommendation
                ? "Falta la reseña/recomendación del músico"
                : "Ambas reseñas fueron registradas";

    return (
        <div
            className={`rounded-2xl border p-5 shadow-soft flex flex-col gap-4 ${
                isUnlocked
                    ? "border-success/35 bg-success/5"
                    : isEventFinished
                      ? "border-warning/40 bg-warning/5"
                      : "border-default-200/80 bg-content1"
            }`}
        >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                    <div
                        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                            isUnlocked
                                ? "bg-success/15 text-success"
                                : isEventFinished
                                  ? "bg-warning/15 text-warning-text"
                                  : "bg-secondary/10 text-secondary"
                        }`}
                    >
                        <Icon
                            icon={
                                isUnlocked
                                    ? "material-symbols:lock-open-outline"
                                    : isEventFinished
                                      ? "material-symbols:timer-outline"
                                      : "material-symbols:schedule"
                            }
                            width={24}
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">
                                {isUnlocked
                                    ? "Cobro del artista desbloqueado"
                                    : isEventFinished
                                      ? "Contador para reseñas y desbloqueo de cobro (24 h)"
                                      : "Estado de reseñas para cierre y cobro"}
                            </h3>
                            <Chip
                                size="sm"
                                variant="flat"
                                color={
                                    bothReviewed
                                        ? "success"
                                        : isUnlocked
                                          ? "primary"
                                          : isEventFinished
                                            ? "warning"
                                            : "default"
                                }
                            >
                                {bothReviewed
                                    ? "2 de 2 reseñas listas"
                                    : hasContractorReview || hasMusicianRecommendation
                                      ? "1 de 2 reseñas listas"
                                      : "0 de 2 reseñas listas"}
                            </Chip>
                        </div>
                        <p className="text-xs sm:text-sm text-default-600 mt-1">
                            {bothReviewed
                                ? "Tanto el contratista como el músico registraron su reseña. El cobro para el artista está habilitado."
                                : isUnlocked
                                  ? `El cobro al músico ya se desbloqueó tras cumplirse las 24 h del show. (${missingLabel}: aún se puede registrar por única vez).`
                                  : isEventFinished
                                    ? role === "musician"
                                        ? `${missingLabel}. Si ambos califican antes de que termine el reloj, tu cobro se habilita al instante; de lo contrario, se desbloqueará automáticamente al llegar a 00:00:00.`
                                        : `${missingLabel}. Si ambos califican ahora, el pago al artista se libera de inmediato; si falta alguna reseña, se desbloqueará automáticamente cuando el reloj llegue a 00:00:00.`
                                    : "Cuando finalice el horario del show se activará el reloj de 24 horas para calificar y liberar el cobro al artista."}
                        </p>
                    </div>
                </div>

                {isEventFinished && !isUnlocked && countdown ? (
                    <div
                        aria-live="polite"
                        className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-content1 px-4 py-3 shrink-0 self-start lg:self-center shadow-soft"
                    >
                        <Icon
                            icon="material-symbols:alarm-on-outline"
                            width={22}
                            className="text-warning-text shrink-0"
                        />
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-default-500">
                                Desbloqueo automático en
                            </p>
                            <p className="text-xl font-bold font-mono tabular-nums text-foreground leading-tight">
                                {countdown.clock}
                            </p>
                        </div>
                    </div>
                ) : isUnlocked ? (
                    <Chip
                        color="success"
                        variant="flat"
                        size="md"
                        className="font-semibold shrink-0 self-start lg:self-center"
                        startContent={
                            <Icon icon="material-symbols:verified-outline" width={18} />
                        }
                    >
                        {bothReviewed
                            ? "Desbloqueado por reseñas"
                            : "Desbloqueado (plazo 24 h cumplido)"}
                    </Chip>
                ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Estado reseña del contratista */}
                <div
                    className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
                        hasContractorReview
                            ? "border-success/30 bg-content1"
                            : "border-warning/35 bg-content1"
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <Icon
                            icon={
                                hasContractorReview
                                    ? "material-symbols:check-circle"
                                    : "material-symbols:pending-actions"
                            }
                            width={20}
                            className={
                                hasContractorReview
                                    ? "text-success shrink-0"
                                    : "text-warning-text shrink-0"
                            }
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                Reseña del contratista
                            </p>
                            <p className="text-xs text-default-500 truncate">
                                {hasContractorReview
                                    ? "Calificación final registrada"
                                    : role === "contractor"
                                      ? "Falta tu reseña final del evento"
                                      : "El cliente aún no deja su reseña"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!hasContractorReview &&
                        role === "contractor" &&
                        isEventFinished &&
                        onOpenContractorFinalReview ? (
                            <Button
                                size="sm"
                                color="primary"
                                radius="lg"
                                className="font-semibold"
                                onPress={onOpenContractorFinalReview}
                            >
                                Calificar
                            </Button>
                        ) : null}
                        <Chip
                            size="sm"
                            variant="flat"
                            color={hasContractorReview ? "success" : "warning"}
                        >
                            {hasContractorReview ? "Completada" : "Pendiente"}
                        </Chip>
                    </div>
                </div>

                {/* Estado recomendación del músico */}
                <div
                    className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
                        hasMusicianRecommendation
                            ? "border-success/30 bg-content1"
                            : "border-warning/35 bg-content1"
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <Icon
                            icon={
                                hasMusicianRecommendation
                                    ? "material-symbols:check-circle"
                                    : "material-symbols:pending-actions"
                            }
                            width={20}
                            className={
                                hasMusicianRecommendation
                                    ? "text-success shrink-0"
                                    : "text-warning-text shrink-0"
                            }
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                Reseña del músico
                            </p>
                            <p className="text-xs text-default-500 truncate">
                                {isLoadingMusicianRecommendation
                                    ? "Verificando estado..."
                                    : hasMusicianRecommendation
                                      ? "Recomendación al cliente registrada"
                                      : role === "musician"
                                        ? "Falta tu recomendación abajo"
                                        : "El músico aún no deja su reseña"}
                            </p>
                        </div>
                    </div>
                    <Chip
                        size="sm"
                        variant="flat"
                        color={hasMusicianRecommendation ? "success" : "warning"}
                        className="shrink-0"
                    >
                        {isLoadingMusicianRecommendation
                            ? "..."
                            : hasMusicianRecommendation
                              ? "Completada"
                              : "Pendiente"}
                    </Chip>
                </div>
            </div>
        </div>
    );
}
