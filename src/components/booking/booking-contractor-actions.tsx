"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import BookingContractConfirmCard from "@/components/booking/booking-contract-confirm-card";
import BookingContractorRequestedCard from "@/components/booking/booking-contractor-requested-card";
import BookingQuoteReviewCard from "@/components/booking/booking-quote-review-card";
import { acceptQuote, rejectQuote } from "@/lib/bookings";
import { getBookingContract } from "@/lib/contracts";
import type { BookingOut, ContractOut } from "@/types/api";

type Props = {
    booking: BookingOut;
    onUpdated: (booking: BookingOut) => void;
    onEdit?: () => void;
};

export default function BookingContractorActions({
    booking,
    onUpdated,
    onEdit,
}: Props) {
    const [contract, setContract] = useState<ContractOut | null>(null);
    const [isLoadingContract, setIsLoadingContract] = useState(false);
    const [isAcceptingQuote, setIsAcceptingQuote] = useState(false);
    const [isRejectingQuote, setIsRejectingQuote] = useState(false);

    useEffect(() => {
        if (
            booking.status !== "contract_pending" &&
            booking.status !== "contract_signed"
        ) {
            void Promise.resolve().then(() => setContract(null));
            return;
        }

        void Promise.resolve().then(() => setIsLoadingContract(true));
        getBookingContract(booking.id)
            .then(setContract)
            .catch(() => {
                setContract(null);
                addToast({
                    title: "Contrato no disponible",
                    description: "No se pudo cargar el acuerdo. Recarga la página.",
                    color: "warning",
                });
            })
            .finally(() => setIsLoadingContract(false));
    }, [booking.id, booking.status]);

    async function handleAcceptQuote() {
        setIsAcceptingQuote(true);
        try {
            const currentContract = contract ?? (await getBookingContract(booking.id));
            setContract(currentContract);
            const updated = await acceptQuote(booking.id, {
                contract_body_sha256: currentContract.body_sha256 ?? null,
            });
            onUpdated(updated);
            addToast({
                title: "Cotización aceptada",
                description:
                    "Revisa el contrato, fírmalo y confirma de forma segura con Mercado Pago.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsAcceptingQuote(false);
        }
    }

    async function handleRejectQuote() {
        setIsRejectingQuote(true);
        try {
            const updated = await rejectQuote(booking.id);
            onUpdated(updated);
            addToast({ title: "Cotización rechazada", color: "success" });
        } catch (error) {
            addToast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsRejectingQuote(false);
        }
    }

    if (booking.status === "requested") {
        return (
            <BookingContractorRequestedCard
                booking={booking}
                onUpdated={onUpdated}
                onEdit={onEdit}
            />
        );
    }

    if (booking.status === "accepted") {
        return (
            <BookingQuoteReviewCard
                booking={booking}
                isAccepting={isAcceptingQuote}
                isRejecting={isRejectingQuote}
                onAccept={handleAcceptQuote}
                onReject={handleRejectQuote}
            />
        );
    }

    if (
        booking.status === "contract_pending" ||
        booking.status === "contract_signed"
    ) {
        return (
            <BookingContractConfirmCard
                booking={booking}
                contract={contract}
                isLoadingContract={isLoadingContract}
                onUpdated={onUpdated}
            />
        );
    }

    if (booking.status === "cancelled") {
        return (
            <Card className="border border-danger/30 bg-danger/5 shadow-soft">
                <CardBody className="gap-2 p-6">
                    <div className="flex items-center gap-2">
                        <Icon
                            icon="material-symbols:cancel"
                            width={22}
                            className="text-danger shrink-0"
                        />
                        <p className="font-semibold text-foreground">
                            Reserva cancelada
                        </p>
                    </div>
                    <p className="text-sm text-default-600">
                        Esta reserva fue cancelada y no requiere más acciones.
                    </p>
                </CardBody>
            </Card>
        );
    }

    return null;
}
