"use client";

import { useState } from "react";
import { Button, Input, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { apiFetch } from "@/lib/api";

type Props = {
    onSuccess: () => void;
};

export default function MusicianCreateLinkForm({ onSuccess }: Props) {
    const [price, setPrice] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdLink, setCreatedLink] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await apiFetch<BookingLinkOut>("/booking-links", {
                method: "POST",
                body: JSON.stringify({
                    price: parseFloat(price),
                    event_date: eventDate || null,
                    start_time: startTime || null,
                })
            });
            const url = `${window.location.origin}/pay/${res.token}`;
            setCreatedLink(url);
            addToast({
                title: "Link creado",
                description: "El link de pago ha sido generado.",
                color: "success"
            });
        } catch (error: unknown) {
            addToast({
                title: "Error",
                description: (error as Error).message || "No se pudo crear el link",
                color: "danger"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (createdLink) {
        return (
            <div className="flex flex-col gap-4 py-4 text-center">
                <Icon icon="lucide:check-circle-2" className="text-success mx-auto" width={48} />
                <h3 className="text-xl font-bold">¡Contrata Rápida Lista!</h3>
                <p className="text-sm text-default-500">Comparte este link con tu cliente. El link expira en 24 horas.</p>
                <div className="bg-content2 p-3 rounded-lg flex items-center justify-between gap-2 border border-default-200">
                    <span className="text-sm truncate select-all">{createdLink}</span>
                    <Button 
                        isIconOnly 
                        size="sm" 
                        color="primary" 
                        variant="flat"
                        onPress={() => {
                            navigator.clipboard.writeText(createdLink);
                            addToast({ title: "Copiado al portapapeles", color: "success" });
                        }}
                    >
                        <Icon icon="lucide:copy" width={16} />
                    </Button>
                </div>
                <Button color="primary" onPress={onSuccess} className="mt-4">Cerrar</Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
            <Input
                label="Precio acordado (Obligatorio)"
                type="number"
                min={1}
                step="0.01"
                isRequired
                value={price}
                onValueChange={setPrice}
                variant="bordered"
                startContent={<span className="text-default-400 text-sm">S/</span>}
            />
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Fecha del evento (Opcional)"
                    type="date"
                    value={eventDate}
                    onValueChange={setEventDate}
                    variant="bordered"
                />
                <Input
                    label="Hora (Opcional)"
                    type="time"
                    value={startTime}
                    onValueChange={setStartTime}
                    variant="bordered"
                />
            </div>
            <div className="bg-primary/10 p-3 rounded-lg mt-2">
                <p className="text-xs text-primary-800">
                    El cliente abrirá el link, llenará sus datos personales, la direcci&oacute;n del evento y pagar&aacute; de forma segura. Se generará el contrato y la reserva automáticamente.
                </p>
            </div>
            <div className="flex justify-end gap-2 mt-2">
                <Button type="submit" color="primary" isLoading={isSubmitting}>
                    Generar Link
                </Button>
            </div>
        </form>
    );
}
