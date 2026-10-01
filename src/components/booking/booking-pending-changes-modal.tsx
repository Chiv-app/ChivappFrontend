"use client";

import { useMemo, useState } from "react";
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
import LocationMapPreview from "@/components/ui/location-map-preview";
import { decideBookingChange } from "@/lib/bookings";
import type { BookingOut } from "@/types/api";

type Props = {
    booking: BookingOut;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: (booking: BookingOut) => void;
};

type DiffRow = {
    key: string;
    label: string;
    before: string;
    after: string;
    changed: boolean;
};

function displayText(value: string | null | undefined): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : "—";
}

function valuesEqual(
    before: string | null | undefined,
    after: string | null | undefined,
): boolean {
    return (before ?? "").trim() === (after ?? "").trim();
}

export default function BookingPendingChangesModal({
    booking,
    isOpen,
    onOpenChange,
    onUpdated,
}: Props) {
    const [isDeciding, setIsDeciding] = useState(false);

    const historyRows = useMemo<DiffRow[]>(() => {
        const rows: DiffRow[] = [
            {
                key: "address",
                label: "Dirección",
                before: displayText(booking.location_address),
                after: displayText(booking.pending_location_address),
                changed: !valuesEqual(
                    booking.location_address,
                    booking.pending_location_address,
                ),
            },
            {
                key: "city",
                label: "Ciudad",
                before: displayText(booking.location_city),
                after: displayText(booking.pending_location_city),
                changed: !valuesEqual(
                    booking.location_city,
                    booking.pending_location_city,
                ),
            },
            {
                key: "reference",
                label: "Referencia / ubicación",
                before: displayText(booking.location_reference),
                after: displayText(booking.pending_location_reference),
                changed: !valuesEqual(
                    booking.location_reference,
                    booking.pending_location_reference,
                ),
            },
            {
                key: "description",
                label: "Descripción",
                before: displayText(booking.event_description),
                after: displayText(booking.pending_event_description),
                changed: !valuesEqual(
                    booking.event_description,
                    booking.pending_event_description,
                ),
            },
        ];

        if (booking.pending_change_notes?.trim()) {
            rows.push({
                key: "notes",
                label: "Notas del cambio",
                before: "—",
                after: displayText(booking.pending_change_notes),
                changed: true,
            });
        }

        return rows;
    }, [booking]);

    async function handleDecide(accept: boolean) {
        setIsDeciding(true);
        try {
            const updated = await decideBookingChange(booking.id, { accept });
            onUpdated(updated);
            onOpenChange(false);
            addToast({
                title: accept ? "Cambios aceptados" : "Cambios rechazados",
                color: accept ? "success" : "warning",
            });
        } catch (error) {
            addToast({
                title: "No se pudo responder",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsDeciding(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="3xl"
            scrollBehavior="inside"
            placement="center"
            classNames={{
                base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[92vh]",
                wrapper: "items-end sm:items-center",
                body: "px-4 sm:px-6 py-2",
                header: "px-4 sm:px-6",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col items-start gap-2 pb-2">
                            <Chip color="warning" variant="flat" size="sm">
                                Pendiente de tu respuesta
                            </Chip>
                            <span className="text-xl font-bold">Cambios propuestos</span>
                            <span className="text-sm font-normal text-default-500">
                                Compara el antes y después. El precio ya fue pagado
                                y no cambia.
                            </span>
                        </ModalHeader>
                        <ModalBody className="gap-5">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-3">
                                    Historial del cambio
                                </h3>
                                <div className="rounded-2xl border border-default-200 overflow-hidden">
                                    <div className="hidden sm:grid grid-cols-[1.1fr_1fr_1fr] gap-3 bg-default-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-default-500">
                                        <span>Campo</span>
                                        <span>Antes</span>
                                        <span>Después</span>
                                    </div>
                                    <ul className="divide-y divide-default-200">
                                        {historyRows.map((row) => (
                                            <li
                                                key={row.key}
                                                className={`px-4 py-3 text-sm ${
                                                    row.changed
                                                        ? "bg-warning/5"
                                                        : "bg-content1"
                                                }`}
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1fr_1fr] gap-2 sm:gap-3">
                                                    <div className="flex items-center gap-2 font-semibold text-foreground">
                                                        {row.changed ? (
                                                            <Icon
                                                                icon="material-symbols:compare-arrows"
                                                                width={16}
                                                                className="text-warning shrink-0"
                                                            />
                                                        ) : (
                                                            <Icon
                                                                icon="material-symbols:remove"
                                                                width={16}
                                                                className="text-default-300 shrink-0"
                                                            />
                                                        )}
                                                        {row.label}
                                                    </div>
                                                    <div>
                                                        <p className="sm:hidden text-[11px] uppercase text-default-400 mb-0.5">
                                                            Antes
                                                        </p>
                                                        <p className="text-default-600 break-words">
                                                            {row.before}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="sm:hidden text-[11px] uppercase text-default-400 mb-0.5">
                                                            Después
                                                        </p>
                                                        <p
                                                            className={`break-words ${
                                                                row.changed
                                                                    ? "text-foreground font-medium"
                                                                    : "text-default-600"
                                                            }`}
                                                        >
                                                            {row.after}
                                                        </p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-foreground mb-2">
                                        Ubicación actual
                                    </p>
                                    {isOpen ? (
                                        <LocationMapPreview
                                            key={`${booking.id}-before-${booking.updated_at}`}
                                            address={booking.location_address}
                                            city={booking.location_city}
                                            reference={booking.location_reference}
                                        />
                                    ) : null}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground mb-2">
                                        Ubicación propuesta
                                    </p>
                                    {isOpen ? (
                                        <LocationMapPreview
                                            key={`${booking.id}-after-${booking.change_requested_at ?? ""}`}
                                            address={booking.pending_location_address}
                                            city={booking.pending_location_city}
                                            reference={
                                                booking.pending_location_reference
                                            }
                                        />
                                    ) : null}
                                </div>
                            </div>

                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="flat"
                                radius="lg"
                                onPress={onClose}
                                isDisabled={isDeciding}
                            >
                                Cerrar
                            </Button>
                            <Button
                                color="danger"
                                variant="flat"
                                radius="lg"
                                isLoading={isDeciding}
                                onPress={() => handleDecide(false)}
                            >
                                Rechazar
                            </Button>
                            <Button
                                color="success"
                                radius="lg"
                                className="font-semibold"
                                isLoading={isDeciding}
                                onPress={() => handleDecide(true)}
                            >
                                Aceptar cambios
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
