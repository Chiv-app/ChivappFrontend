"use client";

import { FormEvent, useEffect, useState } from "react";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import FileUploadField from "@/components/ui/file-upload-field";
import { createFinalBookingReview } from "@/lib/bookings";

type Props = {
    bookingId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmitted: (result?: {
        mode: "review" | "complaint";
        completed?: boolean;
    }) => void | Promise<void>;
};

export default function BookingFinalReviewModal({
    bookingId,
    isOpen,
    onOpenChange,
    onSubmitted,
}: Props) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [withComplaint, setWithComplaint] = useState(false);
    const [complaintReason, setComplaintReason] = useState("");
    const [complaintEvidence, setComplaintEvidence] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setRating(5);
        setComment("");
        setWithComplaint(false);
        setComplaintReason("");
        setComplaintEvidence(null);
        setIsSaving(false);
    }, [isOpen, bookingId]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (withComplaint) {
            const reason = complaintReason.trim();
            if (reason.length < 10) {
                addToast({
                    title: "Describe la queja",
                    description:
                        "La queja necesita al menos 10 caracteres. El monto lo define el admin al liquidar.",
                    color: "warning",
                });
                return;
            }

            setIsSaving(true);
            try {
                const result = await createFinalBookingReview(bookingId, {
                    complaint_reason: reason,
                    ...(complaintEvidence
                        ? { complaint_evidence_url: complaintEvidence }
                        : {}),
                });
                addToast({
                    title: "Queja registrada",
                    description:
                        "La reserva quedó finalizada en disputa. El admin liquidará cuando ambas partes respondan.",
                    color: "warning",
                });
                // Backend already completes on complaint path; refresh parent state.
                await onSubmitted(result);
                onOpenChange(false);
            } catch (error) {
                addToast({
                    title: "No se pudo registrar la queja",
                    description:
                        error instanceof Error ? error.message : "Intenta de nuevo.",
                    color: "danger",
                });
            } finally {
                setIsSaving(false);
            }
            return;
        }

        const trimmed = comment.trim();
        if (trimmed.length < 10) {
            addToast({
                title: "Comentario corto",
                description: "La reseña final necesita al menos 10 caracteres.",
                color: "warning",
            });
            return;
        }

        setIsSaving(true);
        try {
            await createFinalBookingReview(bookingId, {
                rating,
                comment: trimmed,
            });
            addToast({
                title: "Reseña publicada",
                description:
                    "Cerrando la contratación. Los fondos quedan como deuda de la app hasta el desembolso.",
                color: "success",
            });
            await onSubmitted({ mode: "review", completed: false });
            onOpenChange(false);
        } catch (error) {
            addToast({
                title: "No se pudo publicar la reseña",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="lg"
            scrollBehavior="inside"
            placement="center"
            isDismissable={!isSaving}
            hideCloseButton={isSaving}
            classNames={{
                base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-lg",
                wrapper: "items-end sm:items-center",
                body: "px-4 sm:px-6",
                header: "px-4 sm:px-6",
                footer: "px-4 sm:px-6",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <form onSubmit={handleSubmit} className="contents">
                        <ModalHeader className="flex flex-col items-start gap-1 pb-2">
                            <span className="text-xl font-bold tracking-tight">
                                {withComplaint
                                    ? "Registrar queja del show"
                                    : "Reseña final del show"}
                            </span>
                            <span className="text-sm font-normal text-default-500">
                                {withComplaint
                                    ? "Describe el problema. No indiques montos: el admin los define al liquidar."
                                    : "Antes de finalizar, cuenta cómo estuvo el evento."}
                            </span>
                        </ModalHeader>
                        <ModalBody className="gap-4 pb-2">
                            {!withComplaint ? (
                                <>
                                    <div className="flex flex-wrap gap-2">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <Button
                                                key={value}
                                                type="button"
                                                size="sm"
                                                radius="lg"
                                                variant={
                                                    rating === value ? "solid" : "bordered"
                                                }
                                                color="warning"
                                                onPress={() => setRating(value)}
                                                isDisabled={isSaving}
                                            >
                                                {value}★
                                            </Button>
                                        ))}
                                    </div>
                                    <Textarea
                                        label="Comentario"
                                        placeholder="Cuéntanos cómo estuvo el show (mín. 10 caracteres)"
                                        value={comment}
                                        onValueChange={setComment}
                                        variant="bordered"
                                        minRows={4}
                                        isRequired
                                        isDisabled={isSaving}
                                    />
                                    <button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={() => setWithComplaint(true)}
                                        className="w-full text-left rounded-2xl border-2 border-danger/40 bg-danger/10 p-4 hover:bg-danger/15 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <Icon
                                                icon="material-symbols:report"
                                                width={24}
                                                className="text-danger shrink-0 mt-0.5"
                                            />
                                            <div>
                                                <p className="font-bold text-danger">
                                                    ¿Encontraste un problema? Registrar
                                                    queja
                                                </p>
                                                <p className="text-sm text-default-600 mt-1">
                                                    Se ocultará la reseña. La reserva
                                                    quedará finalizada en disputa.
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </>
                            ) : (
                                <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold text-danger flex items-center gap-2">
                                            <Icon
                                                icon="material-symbols:report"
                                                width={20}
                                            />
                                            Queja del show
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="light"
                                            onPress={() => {
                                                setWithComplaint(false);
                                                setComplaintReason("");
                                                setComplaintEvidence(null);
                                            }}
                                            isDisabled={isSaving}
                                        >
                                            Volver a reseña
                                        </Button>
                                    </div>
                                    <Textarea
                                        label="Motivo de la queja"
                                        placeholder="Describe qué ocurrió (sin indicar montos)"
                                        value={complaintReason}
                                        onValueChange={setComplaintReason}
                                        variant="bordered"
                                        minRows={4}
                                        isRequired
                                        isDisabled={isSaving}
                                    />
                                    <FileUploadField
                                        label="Evidencia (opcional)"
                                        value={complaintEvidence}
                                        onChange={setComplaintEvidence}
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                    />
                                    <p className="text-xs text-default-500">
                                        No indiques montos aquí. El admin fijará la
                                        diferencia al liquidar, tras la respuesta del
                                        músico.
                                    </p>
                                </div>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="light"
                                radius="lg"
                                onPress={onClose}
                                isDisabled={isSaving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                color={withComplaint ? "danger" : "success"}
                                radius="lg"
                                className="font-semibold"
                                isLoading={isSaving}
                                startContent={
                                    isSaving ? undefined : (
                                        <Icon
                                            icon={
                                                withComplaint
                                                    ? "material-symbols:report"
                                                    : "material-symbols:check-circle"
                                            }
                                            width={18}
                                        />
                                    )
                                }
                            >
                                {withComplaint
                                    ? "Enviar queja y finalizar"
                                    : "Publicar y finalizar"}
                            </Button>
                        </ModalFooter>
                    </form>
                )}
            </ModalContent>
        </Modal>
    );
}

