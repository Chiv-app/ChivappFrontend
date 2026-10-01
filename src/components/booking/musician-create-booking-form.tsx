"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
    Button,
    Divider,
    Input,
    Select,
    SelectItem,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import LocationMapPickerField, { type MapLocation } from "@/components/ui/location-map-picker-field";
import { createMusicianBooking } from "@/lib/bookings";
import {
    formatLocationReference,
    getMinEventDate,
    normalizeStartTime,
    validateBookingRequest,
} from "@/lib/geocoding";

const EVENT_TYPES = [
    "Boda",
    "Quinceañero",
    "Cumpleaños",
    "Aniversario",
    "Evento corporativo",
    "Serenata",
    "Otro",
];

const DOCUMENT_TYPES = ["DNI", "CE", "Pasaporte", "RUC", "Otro"];

type Props = {
    onSuccess?: () => void;
};

export default function MusicianCreateBookingForm({ onSuccess }: Props) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [contractorFullname, setContractorFullname] = useState("");
    const [contractorEmail, setContractorEmail] = useState("");
    const [contractorPhone, setContractorPhone] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [documentNumber, setDocumentNumber] = useState("");
    const [contractorAddress, setContractorAddress] = useState("");
    const [contractorCity, setContractorCity] = useState("");

    const [eventDate, setEventDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [eventType, setEventType] = useState("");
    const [eventDescription, setEventDescription] = useState("");
    const [location, setLocation] = useState<MapLocation | null>(null);

    const [priceAgreed, setPriceAgreed] = useState("");
    const [quoteNotes, setQuoteNotes] = useState("");

    const minEventDate = useMemo(() => getMinEventDate(), []);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!contractorFullname.trim()) {
            addToast({
                title: "Nombre requerido",
                description: "Indica el nombre del contratista.",
                color: "warning",
            });
            return;
        }

        const validationError = validateBookingRequest({
            eventDate,
            startTime,
            eventType,
            location,
        });
        if (validationError) {
            addToast({
                title: "Campos incompletos",
                description: validationError,
                color: "warning",
            });
            return;
        }

        const price = Number(priceAgreed);
        if (!price || price <= 0) {
            addToast({
                title: "Precio requerido",
                description: "Indica el precio total de la contrata.",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const booking = await createMusicianBooking({
                contractor_fullname: contractorFullname.trim(),
                contractor_email: contractorEmail.trim().toLowerCase() || null,
                contractor_phone: contractorPhone.trim() || null,
                document_type: documentType || null,
                document_number: documentNumber.trim() || null,
                contractor_address: contractorAddress.trim() || null,
                contractor_city: contractorCity.trim() || null,
                event_date: eventDate,
                start_time: normalizeStartTime(startTime),
                end_time: null,
                location_address: location!.address,
                location_city: location!.city,
                location_reference: formatLocationReference(location!.lat, location!.lng),
                event_type: eventType,
                event_description: eventDescription.trim() || null,
                price_agreed: price,
                musician_quote_notes: quoteNotes.trim() || null,
            });

            addToast({
                title: "Propuesta creada",
                description:
                    "El cliente recibirá la propuesta para aceptarla, firmar el contrato y pagar a través de Chivapp.",
                color: "success",
            });
            onSuccess?.();
            router.push(`/musician/bookings/${booking.id}`);
        } catch (error) {
            addToast({
                title: "No se pudo crear",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:person" width={20} className="text-primary" />
                    <h3 className="font-semibold text-foreground">Datos del contratista</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="Nombre completo"
                        isRequired
                        value={contractorFullname}
                        onValueChange={setContractorFullname}
                        variant="bordered"
                        radius="lg"
                    />
                    <Input
                        label="Correo (opcional)"
                        type="email"
                        value={contractorEmail}
                        onValueChange={setContractorEmail}
                        variant="bordered"
                        radius="lg"
                    />
                    <Input
                        label="Teléfono (opcional)"
                        value={contractorPhone}
                        onValueChange={setContractorPhone}
                        variant="bordered"
                        radius="lg"
                    />
                    <Select
                        label="Tipo de documento (opcional)"
                        selectedKeys={documentType ? [documentType] : []}
                        onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0];
                            setDocumentType(value ? String(value) : "");
                        }}
                        variant="bordered"
                        radius="lg"
                    >
                        {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type}>{type}</SelectItem>
                        ))}
                    </Select>
                    <Input
                        label="Número de documento (opcional)"
                        value={documentNumber}
                        onValueChange={setDocumentNumber}
                        variant="bordered"
                        radius="lg"
                    />
                    <Input
                        label="Ciudad del cliente (opcional)"
                        value={contractorCity}
                        onValueChange={setContractorCity}
                        variant="bordered"
                        radius="lg"
                    />
                    <Input
                        className="sm:col-span-2"
                        label="Dirección del cliente (opcional)"
                        value={contractorAddress}
                        onValueChange={setContractorAddress}
                        variant="bordered"
                        radius="lg"
                    />
                </div>
            </section>

            <Divider />

            <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:event" width={20} className="text-primary" />
                    <h3 className="font-semibold text-foreground">Evento y lugar</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="Fecha del evento"
                        type="date"
                        isRequired
                        min={minEventDate}
                        value={eventDate}
                        onValueChange={setEventDate}
                        variant="bordered"
                        radius="lg"
                    />
                    <Input
                        label="Hora de inicio"
                        type="time"
                        isRequired
                        value={startTime}
                        onValueChange={setStartTime}
                        variant="bordered"
                        radius="lg"
                    />
                    <Select
                        className="sm:col-span-2"
                        label="Tipo de evento"
                        isRequired
                        selectedKeys={eventType ? [eventType] : []}
                        onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0];
                            setEventType(value ? String(value) : "");
                        }}
                        variant="bordered"
                        radius="lg"
                    >
                        {EVENT_TYPES.map((type) => (
                            <SelectItem key={type}>{type}</SelectItem>
                        ))}
                    </Select>
                </div>
                <LocationMapPickerField value={location} onChange={setLocation} />
                <Textarea
                    label="Descripción del evento (opcional)"
                    value={eventDescription}
                    onValueChange={setEventDescription}
                    variant="bordered"
                    radius="lg"
                    minRows={2}
                />
            </section>

            <Divider />

            <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:payments" width={20} className="text-primary" />
                    <h3 className="font-semibold text-foreground">Precio</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="Lo que tú recibes (precio total)"
                        type="number"
                        min={1}
                        step="0.01"
                        isRequired
                        value={priceAgreed}
                        onValueChange={setPriceAgreed}
                        variant="bordered"
                        radius="lg"
                        startContent={<span className="text-default-400 text-sm">S/</span>}
                    />
                </div>
                <Textarea
                    label="Notas / condiciones (opcional)"
                    value={quoteNotes}
                    onValueChange={setQuoteNotes}
                    variant="bordered"
                    radius="lg"
                    minRows={2}
                    placeholder="Detalle de horas, repertorio, condiciones especiales…"
                />
            </section>

            <Divider />

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
                <Icon
                    icon="material-symbols:info"
                    width={22}
                    className="text-primary shrink-0 mt-0.5"
                />
                <p className="text-sm text-default-600 leading-relaxed">
                    Se creará como propuesta. El cliente la recibirá para aceptarla, firmar
                    el contrato y pagar el 100 % de forma segura a través de Chivapp con
                    Mercado Pago. La reserva se confirma automáticamente al acreditarse el
                    pago.
                </p>
            </div>

            <div className="flex justify-end gap-2">
                <Button
                    type="submit"
                    color="primary"
                    radius="lg"
                    className="font-semibold"
                    isLoading={isSubmitting}
                    startContent={
                        isSubmitting ? undefined : (
                            <Icon icon="material-symbols:add-circle" width={18} />
                        )
                    }
                >
                    Enviar propuesta
                </Button>
            </div>
        </form>
    );
}
