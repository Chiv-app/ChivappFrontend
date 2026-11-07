"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, Chip, Input, Select, SelectItem, Textarea } from "@heroui/react";
import { useAuth } from "@/contexts/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { createBookingsBatch } from "@/lib/bookings";
import { todayPeruIso } from "@/lib/date-utils";
import { getMusicianById } from "@/lib/musicians";
import {
    MULTI_QUOTE_MAX,
    MULTI_QUOTE_MIN,
    MULTI_QUOTE_NAME,
    parseMultiQuoteIds,
} from "@/lib/multi-quote";
import type { BookingBatchCreate, BookingOut } from "@/types/api";

const EVENT_TYPES = [
    "Boda",
    "Quinceañero",
    "Cumpleaños",
    "Aniversario",
    "Evento corporativo",
    "Serenata",
    "Otro",
];

type Artist = { id: string; name: string };

function toOptionalNumber(value: string): number | undefined {
    const parsed = Number(value);
    return value.trim() !== "" && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export default function MultiQuoteForm() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { user, isLoading } = useAuth();
    const { openLogin, openRegister } = useAuthModal();

    const idsKey = parseMultiQuoteIds(searchParams.get("ids")).join(",");
    const hasIds = idsKey !== "";
    const [artists, setArtists] = useState<Artist[] | null>(null);
    const [unavailableCount, setUnavailableCount] = useState(0);

    const [eventType, setEventType] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [city, setCity] = useState("");
    const [address, setAddress] = useState("");
    const [guests, setGuests] = useState("");
    const [duration, setDuration] = useState("");
    const [budget, setBudget] = useState("");
    const [description, setDescription] = useState("");
    const [attempted, setAttempted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<BookingOut[] | null>(null);

    useEffect(() => {
        if (!idsKey) return;
        let cancelled = false;
        const ids = idsKey.split(",");
        void Promise.allSettled(ids.map((id) => getMusicianById(id))).then((results) => {
            if (cancelled) return;
            const found: Artist[] = [];
            let missing = 0;
            results.forEach((result, index) => {
                if (result.status === "fulfilled") {
                    found.push({ id: ids[index], name: result.value.name });
                } else {
                    missing += 1;
                }
            });
            setArtists(found);
            setUnavailableCount(missing);
        });
        return () => {
            cancelled = true;
        };
    }, [idsKey]);

    const today = useMemo(() => todayPeruIso(), []);
    const redirectTarget = `${pathname}?ids=${idsKey}`;

    const errors = {
        eventType: !eventType ? "Elige el motivo del evento" : null,
        eventDate: !eventDate
            ? "Indica la fecha"
            : eventDate < today
              ? "La fecha no puede ser anterior a hoy"
              : null,
        startTime: !startTime ? "Indica la hora de inicio" : null,
        city: !city.trim() ? "Indica el distrito o la ciudad" : null,
    };
    const hasErrors = Object.values(errors).some(Boolean);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAttempted(true);
        setError(null);
        if (hasErrors || !artists || artists.length < MULTI_QUOTE_MIN) return;

        const payload: BookingBatchCreate = {
            musician_ids: artists.map((artist) => artist.id),
            event_date: eventDate,
            start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
            location_city: city.trim(),
            location_address: address.trim() || undefined,
            event_type: eventType,
            event_description: description.trim() || undefined,
            guests_count: toOptionalNumber(guests),
            duration_hours: toOptionalNumber(duration),
            estimated_budget: toOptionalNumber(budget),
        };
        setSubmitting(true);
        try {
            setCreated(await createBookingsBatch(payload));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No pudimos enviar tus solicitudes. Inténtalo de nuevo.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    const heading = (
        <header className="mb-6 flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {MULTI_QUOTE_NAME}
            </h1>
            <p className="max-w-2xl text-default-600 text-pretty">
                Completa los datos de tu evento una sola vez y pide cotización a entre{" "}
                {MULTI_QUOTE_MIN} y {MULTI_QUOTE_MAX} artistas. Cada uno te responde con su
                precio y tú eliges con quién seguir; las demás solicitudes las puedes cancelar cuando quieras.
            </p>
        </header>
    );

    if (created) {
        return (
            <div className="mx-auto max-w-2xl">
                <Card className="border border-success/30 bg-success/5 shadow-soft">
                    <CardBody className="gap-4 p-6">
                        <h1 className="text-2xl font-bold text-foreground">
                            ¡Listo! Enviamos tu solicitud a {created.length} artistas
                        </h1>
                        <p className="text-default-600">
                            Cada artista te responderá con su cotización. Te avisaremos cuando
                            respondan; podrás compararlas en <strong>Mis reservas</strong> y elegir con
                            quién seguir.
                        </p>
                        <ul className="flex flex-wrap gap-2" aria-label="Artistas a los que pediste cotización">
                            {(artists ?? []).map((artist) => (
                                <li key={artist.id}>
                                    <Chip color="success" variant="flat">
                                        {artist.name}
                                    </Chip>
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button as={Link} href="/contractor/bookings" color="primary" radius="lg" className="font-semibold">
                                Ver mis cotizaciones
                            </Button>
                            <Button as={Link} href="/musicians" variant="bordered" radius="lg">
                                Seguir explorando
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    }

    if (!hasIds) {
        return (
            <div className="mx-auto max-w-2xl">
                {heading}
                <Card className="border border-default-200 shadow-soft">
                    <CardBody className="gap-3 p-6">
                        <p className="text-default-700">
                            Aún no elegiste artistas. En el listado pulsa «{MULTI_QUOTE_NAME}» y toca las
                            tarjetas de los artistas que te interesan.
                        </p>
                        <Button as={Link} href="/musicians" color="primary" radius="lg" className="w-fit font-semibold">
                            Elegir artistas
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return <p className="text-default-500">Cargando…</p>;
    }

    if (!user) {
        return (
            <div className="mx-auto max-w-2xl">
                {heading}
                <Card className="border border-default-200 shadow-soft">
                    <CardBody className="gap-4 p-6">
                        <p className="text-default-700">
                            Para pedir cotización necesitas una cuenta de cliente. Es gratis y toma
                            un minuto; tus artistas elegidos se guardan en esta página.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                                color="primary"
                                radius="lg"
                                className="font-semibold"
                                onPress={() => openRegister({ redirect: redirectTarget, defaultRole: "contractor" })}
                            >
                                Crear cuenta
                            </Button>
                            <Button variant="bordered" radius="lg" onPress={() => openLogin({ redirect: redirectTarget })}>
                                Ya tengo cuenta
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    }

    if (user.role !== "contractor") {
        return (
            <div className="mx-auto max-w-2xl">
                {heading}
                <Card className="border border-warning/30 bg-warning/5 shadow-soft">
                    <CardBody className="gap-2 p-6">
                        <p className="text-default-700">
                            La cotización múltiple es para clientes que buscan artistas. Inicia sesión con una
                            cuenta de cliente para usarla.
                        </p>
                    </CardBody>
                </Card>
            </div>
        );
    }

    const tooFew = artists !== null && artists.length < MULTI_QUOTE_MIN;

    return (
        <div className="mx-auto max-w-2xl">
            {heading}

            <section aria-label="Artistas elegidos" className="mb-6 rounded-2xl border border-default-200 bg-content1 p-4">
                <p className="mb-2 text-sm font-semibold text-foreground">
                    Artistas elegidos {artists ? `(${artists.length})` : ""}
                </p>
                {artists === null ? (
                    <p className="text-sm text-default-500">Cargando artistas…</p>
                ) : (
                    <ul className="flex flex-wrap gap-2">
                        {artists.map((artist) => (
                            <li key={artist.id}>
                                <Chip variant="flat" color="primary">
                                    {artist.name}
                                </Chip>
                            </li>
                        ))}
                    </ul>
                )}
                {unavailableCount > 0 ? (
                    <p className="mt-2 text-sm text-warning-text" role="status">
                        {unavailableCount === 1
                            ? "Uno de los artistas ya no está disponible en Chivapp y se quitó de la lista."
                            : `${unavailableCount} artistas ya no están disponibles en Chivapp y se quitaron de la lista.`}
                    </p>
                ) : null}
                {tooFew ? (
                    <p className="mt-2 text-sm text-danger-text" role="alert">
                        Necesitas al menos {MULTI_QUOTE_MIN} artistas.{" "}
                        <Link href="/musicians" className="font-semibold underline underline-offset-2">
                            Elegir más artistas
                        </Link>
                    </p>
                ) : null}
            </section>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <Select
                    label="Motivo del evento"
                    selectedKeys={eventType ? new Set([eventType]) : new Set<string>()}
                    onSelectionChange={(keys) => setEventType(Array.from(keys)[0]?.toString() ?? "")}
                    variant="bordered"
                    isRequired
                    isInvalid={attempted && Boolean(errors.eventType)}
                    errorMessage={attempted ? errors.eventType : undefined}
                >
                    {EVENT_TYPES.map((type) => (
                        <SelectItem key={type}>{type}</SelectItem>
                    ))}
                </Select>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                        type="date"
                        label="Fecha del evento"
                        min={today}
                        value={eventDate}
                        onValueChange={setEventDate}
                        variant="bordered"
                        isRequired
                        isInvalid={attempted && Boolean(errors.eventDate)}
                        errorMessage={attempted ? errors.eventDate : undefined}
                    />
                    <Input
                        type="time"
                        label="Hora de inicio"
                        value={startTime}
                        onValueChange={setStartTime}
                        variant="bordered"
                        isRequired
                        isInvalid={attempted && Boolean(errors.startTime)}
                        errorMessage={attempted ? errors.startTime : undefined}
                    />
                </div>

                <Input
                    label="Distrito o ciudad"
                    placeholder="Ej.: Miraflores, Lima"
                    value={city}
                    onValueChange={setCity}
                    variant="bordered"
                    isRequired
                    isInvalid={attempted && Boolean(errors.city)}
                    errorMessage={attempted ? errors.city : undefined}
                    description="La dirección exacta la puedes dar después, cuando elijas al artista."
                />

                <Input
                    label="Dirección (opcional)"
                    value={address}
                    onValueChange={setAddress}
                    variant="bordered"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input
                        type="number"
                        min="1"
                        label="Invitados (opcional)"
                        value={guests}
                        onValueChange={setGuests}
                        variant="bordered"
                    />
                    <Input
                        type="number"
                        min="0.5"
                        step="0.5"
                        label="Horas de música (opcional)"
                        value={duration}
                        onValueChange={setDuration}
                        variant="bordered"
                    />
                    <Input
                        type="number"
                        min="1"
                        label="Presupuesto S/ (opcional)"
                        value={budget}
                        onValueChange={setBudget}
                        variant="bordered"
                    />
                </div>

                <Textarea
                    label="Detalles del evento (opcional)"
                    placeholder="Estilo de música, repertorio que te gustaría, tipo de lugar…"
                    value={description}
                    onValueChange={setDescription}
                    variant="bordered"
                    minRows={3}
                    maxLength={1000}
                />

                {error ? (
                    <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger-text">
                        {error}
                    </div>
                ) : null}

                <p className="text-xs text-default-600">
                    Es todo o nada: si algún artista no puede recibir tu solicitud, no se envía a ninguno y
                    te decimos cuál fue. No pagas nada por pedir cotización.
                </p>

                <Button
                    type="submit"
                    color="primary"
                    radius="lg"
                    size="lg"
                    className="font-semibold"
                    isLoading={submitting}
                    isDisabled={tooFew || artists === null}
                >
                    Pedir cotización a {artists?.length ?? "varios"} artistas
                </Button>
            </form>
        </div>
    );
}
