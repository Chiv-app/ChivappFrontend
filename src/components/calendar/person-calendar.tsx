"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
    type BusyBlock,
    type CalendarBusy,
    type CalendarEvent,
    type CalendarView,
    buildGoogleCalendarTemplateUrl,
    describeState,
    downloadCalendarIcs,
    eventsOnDay,
    formatRange,
    formatTime,
    getCalendarBusy,
    getCalendarEvents,
    isSameDay,
    placeEvents,
    rangeFor,
    stepAnchor,
    STATE_LABEL,
    toIsoDate,
    visibleDays,
} from "@/lib/calendar";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const HOUR_PX = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const VIEW_LABEL: Record<CalendarView, string> = { month: "Mes", week: "Semana", day: "Día" };

/** Un color por perfil, para distinguirlos de un vistazo. Las convocatorias (sin perfil propio) van en gris. */
const PROFILE_TONES = [
    { dot: "bg-primary-text", box: "border-primary-text bg-primary/15" },
    { dot: "bg-secondary", box: "border-secondary bg-secondary/15" },
    { dot: "bg-success", box: "border-success bg-success/15" },
];
const NEUTRAL_TONE = { dot: "bg-default-500", box: "border-default-500 bg-default-200/60" };

const BUSY_STRIPES =
    "bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(127,127,127,0.2)_6px,rgba(127,127,127,0.2)_12px)]";

type Props = {
    role: "musician" | "contractor";
};

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function titleFor(view: CalendarView, anchor: Date): string {
    if (view === "day") return capitalize(new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(anchor));
    if (view === "month") return capitalize(new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(anchor));
    const days = visibleDays("week", anchor);
    const first = days[0];
    const last = days[6];
    const month = new Intl.DateTimeFormat("es-PE", { month: "short" });
    const sameMonth = first.getMonth() === last.getMonth();
    return sameMonth
        ? `${first.getDate()}–${last.getDate()} ${month.format(last)} ${last.getFullYear()}`
        : `${first.getDate()} ${month.format(first)} – ${last.getDate()} ${month.format(last)} ${last.getFullYear()}`;
}

function eventLabel(event: CalendarEvent): string {
    const parts = [event.title, formatRange(event), STATE_LABEL[event.state]];
    if (event.profile_name) parts.push(`perfil ${event.profile_name}`);
    if (event.conflict) parts.push("se cruza con otro compromiso");
    return parts.join(", ");
}

/**
 * Calendario de la persona: todo lo que tiene en agenda, por mes, semana o día. Los eventos confirmados van
 * rellenos, los tentativos (sin pago) con borde punteado, los cruces con aviso y lo que ya tiene ocupado en Google
 * con rayas. Cada perfil tiene su color.
 */
export default function PersonCalendar({ role }: Props) {
    const isWide = useMediaQuery("(min-width: 768px)");
    const [view, setView] = useState<CalendarView | null>(null);
    const [anchor, setAnchor] = useState<Date>(() => new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [google, setGoogle] = useState<CalendarBusy>({ connected: true, needs_reconnect: false, busy: [] });
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<CalendarEvent | null>(null);
    const [now, setNow] = useState<Date>(() => new Date());
    const requestId = useRef(0);
    const scroller = useRef<HTMLDivElement>(null);

    // En el celular se empieza por el día: una semana de siete columnas no cabe.
    const activeView: CalendarView = view ?? (isWide ? "week" : "day");
    const days = useMemo(() => visibleDays(activeView, anchor), [activeView, anchor]);
    const range = useMemo(() => rangeFor(activeView, anchor), [activeView, anchor]);

    const load = useCallback(async () => {
        const id = ++requestId.current;
        setStatus("loading");
        try {
            const [list, busy] = await Promise.all([
                getCalendarEvents(range.start, range.end),
                // Las horas de Google son un extra: si fallan, el calendario sigue funcionando.
                getCalendarBusy(range.start, range.end).catch(() => null),
            ]);
            if (id !== requestId.current) return;
            setEvents(list);
            if (busy) setGoogle(busy);
            setStatus("ready");
        } catch {
            if (id !== requestId.current) return;
            setStatus("error");
        }
    }, [range.start, range.end]);

    useEffect(() => {
        void Promise.resolve().then(() => load());
    }, [load]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    // Perfiles presentes, en orden estable, para asignar colores y armar los filtros.
    const profiles = useMemo(() => {
        const seen = new Map<string, string>();
        events.forEach((e) => {
            if (e.profile_id && !seen.has(e.profile_id)) seen.set(e.profile_id, e.profile_name ?? "Perfil");
        });
        return [...seen.entries()].map(([id, name], index) => ({ id, name, tone: PROFILE_TONES[index % PROFILE_TONES.length] }));
    }, [events]);
    const toneOf = useCallback(
        (event: CalendarEvent) => profiles.find((p) => p.id === event.profile_id)?.tone ?? NEUTRAL_TONE,
        [profiles],
    );
    const visibleEvents = useMemo(() => events.filter((e) => !e.profile_id || !hidden.has(e.profile_id)), [events, hidden]);

    // Al cambiar de vista o de periodo, se lleva el scroll a la primera hora con eventos (o a las 8:00).
    useEffect(() => {
        if (status !== "ready" || activeView === "month" || !scroller.current) return;
        const starts = days.flatMap((d) => placeEvents(eventsOnDay(visibleEvents, d), d).map((p) => p.top));
        const first = starts.length ? Math.min(...starts) : 8 * 60;
        scroller.current.scrollTop = Math.max(0, (first / 60) * HOUR_PX - 48);
    }, [status, activeView, range.start, days, visibleEvents]);

    function go(direction: 1 | -1) {
        setAnchor((current) => stepAnchor(activeView, current, direction));
    }

    function openDay(day: Date) {
        setAnchor(day);
        setView("day");
    }

    const busyForDay = (day: Date): BusyBlock[] =>
        eventsOnDay(google.busy, day) as BusyBlock[];

    const today = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const detailHref = role === "musician" ? "/musician/bookings" : "/contractor/bookings";
    const profileHref = role === "musician" ? "/musician/profile" : "/contractor/profile";
    const conflicts = visibleEvents.filter((e) => e.conflict).length;

    function renderEvent(event: CalendarEvent, style: React.CSSProperties | undefined, compact = false) {
        const tone = toneOf(event);
        return (
            <button
                key={event.id}
                type="button"
                onClick={() => setSelected(event)}
                aria-label={eventLabel(event)}
                style={style}
                className={`${FOCUS_RING} ${compact ? "relative flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left" : "absolute z-10 overflow-hidden rounded-lg px-2 py-1 text-left"} border-l-4 text-xs transition hover:brightness-110 motion-reduce:transition-none ${tone.box} ${
                    event.state === "tentative" ? "border-dashed bg-content1/70" : ""
                } ${event.conflict ? "ring-2 ring-danger" : ""}`}
            >
                {compact ? (
                    <>
                        <span className="shrink-0 tabular-nums text-default-500">{formatTime(event.start)}</span>
                        <span className="truncate font-medium">{event.title}</span>
                    </>
                ) : (
                    <>
                        <span className="flex items-center gap-1 font-semibold leading-tight">
                            {event.conflict ? <Icon icon="material-symbols:warning-outline" width={14} className="shrink-0 text-danger-text" aria-hidden="true" /> : null}
                            <span className="truncate">{event.title}</span>
                        </span>
                        <span className="block tabular-nums text-default-600">{formatRange(event)}</span>
                        {event.profile_name ? <span className="block truncate text-default-500">{event.profile_name}</span> : null}
                    </>
                )}
            </button>
        );
    }

    function renderTimeGrid() {
        const columns = days.length;
        return (
            <div ref={scroller} className="max-h-[68vh] overflow-auto rounded-2xl border border-default-200 bg-content1" tabIndex={0} aria-label="Agenda por horas">
                <div style={{ minWidth: columns > 1 ? 720 : undefined }}>
                    <div className="sticky top-0 z-20 grid border-b border-default-200 bg-content1" style={{ gridTemplateColumns: `3.25rem repeat(${columns}, minmax(0, 1fr))` }}>
                        <div />
                        {days.map((day) => {
                            const isToday = isSameDay(day, today);
                            return (
                                <button
                                    key={toIsoDate(day)}
                                    type="button"
                                    onClick={() => openDay(day)}
                                    className={`${FOCUS_RING} px-1 py-2 text-center text-xs ${isToday ? "font-bold text-primary-text" : "text-default-600"}`}
                                    aria-label={`Ver el día ${new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(day)}`}
                                >
                                    <span className="block uppercase tracking-wide">{new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(day)}</span>
                                    <span className={`mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full text-base ${isToday ? "bg-primary-text text-background" : ""}`}>{day.getDate()}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: `3.25rem repeat(${columns}, minmax(0, 1fr))` }}>
                        <div className="relative" aria-hidden="true">
                            {HOURS.map((h) => (
                                <div key={h} className="pr-2 text-right text-[11px] tabular-nums text-default-400" style={{ height: HOUR_PX }}>
                                    {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                                </div>
                            ))}
                        </div>
                        {days.map((day) => {
                            const placed = placeEvents(eventsOnDay(visibleEvents, day), day);
                            const busy = placeEvents(busyForDay(day), day);
                            const isToday = isSameDay(day, today);
                            return (
                                <div key={toIsoDate(day)} className="relative border-l border-default-200" style={{ height: HOUR_PX * 24 }} role="group" aria-label={new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(day)}>
                                    {HOURS.map((h) => (
                                        <div key={h} className="border-t border-default-100" style={{ height: HOUR_PX }} aria-hidden="true" />
                                    ))}
                                    {busy.map((b) => (
                                        <div
                                            key={`${b.event.start}-${b.event.end}`}
                                            className={`pointer-events-none absolute inset-x-0.5 z-0 rounded-md border border-default-300/60 ${BUSY_STRIPES}`}
                                            style={{ top: (b.top / 60) * HOUR_PX, height: ((b.bottom - b.top) / 60) * HOUR_PX }}
                                            title="Ocupado en tu Google Calendar"
                                        >
                                            <span className="m-1 inline-block rounded bg-content1/80 px-1 text-[10px] text-default-500">Ocupado</span>
                                        </div>
                                    ))}
                                    {placed.map((p) =>
                                        renderEvent(p.event, {
                                            top: (p.top / 60) * HOUR_PX,
                                            height: Math.max(((p.bottom - p.top) / 60) * HOUR_PX - 2, 22),
                                            left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                                            width: `calc(${100 / p.lanes}% - 4px)`,
                                        }),
                                    )}
                                    {isToday ? (
                                        <div className="pointer-events-none absolute inset-x-0 z-30 flex items-center" style={{ top: (nowMinutes / 60) * HOUR_PX }} aria-hidden="true">
                                            <span className="size-2.5 -translate-x-1 rounded-full bg-danger" />
                                            <span className="h-px flex-1 bg-danger" />
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    function renderMonth() {
        const weekdays = visibleDays("week", new Date(2026, 0, 5)); // un lunes cualquiera, solo para los nombres
        return (
            <div className="overflow-hidden rounded-2xl border border-default-200 bg-content1">
                <div className="grid grid-cols-7 border-b border-default-200 text-center text-xs uppercase tracking-wide text-default-500">
                    {weekdays.map((d) => (
                        <div key={d.getDay()} className="py-2">
                            {new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(d)}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {days.map((day) => {
                        const list = eventsOnDay(visibleEvents, day).sort((a, b) => a.start.localeCompare(b.start));
                        const inMonth = day.getMonth() === anchor.getMonth();
                        const isToday = isSameDay(day, today);
                        const hasBusy = busyForDay(day).length > 0;
                        return (
                            <div key={toIsoDate(day)} className={`min-h-24 border-b border-r border-default-100 p-1 ${inMonth ? "" : "bg-default-50 text-default-400"}`}>
                                <button
                                    type="button"
                                    onClick={() => openDay(day)}
                                    className={`${FOCUS_RING} mb-1 flex size-7 items-center justify-center rounded-full text-xs ${isToday ? "bg-primary-text font-bold text-background" : "hover:bg-default-100"}`}
                                    aria-label={`Ver el día ${new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(day)}`}
                                >
                                    {day.getDate()}
                                </button>
                                <div className="grid gap-0.5">
                                    {list.slice(0, 3).map((event) => renderEvent(event, undefined, true))}
                                    {list.length > 3 ? (
                                        <button type="button" onClick={() => openDay(day)} className={`${FOCUS_RING} rounded px-1.5 text-left text-[11px] text-primary-text hover:underline`}>
                                            +{list.length - 3} más
                                        </button>
                                    ) : null}
                                    {hasBusy && list.length === 0 ? <span className={`h-2 rounded ${BUSY_STRIPES}`} title="Ocupado en Google" aria-label="Ocupado en Google" /> : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <section aria-labelledby="calendar-title" className="grid w-full gap-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button isIconOnly variant="bordered" radius="full" aria-label={activeView === "month" ? "Mes anterior" : activeView === "week" ? "Semana anterior" : "Día anterior"} onPress={() => go(-1)} className="min-h-11 min-w-11">
                        <Icon icon="material-symbols:chevron-left" width={22} aria-hidden="true" />
                    </Button>
                    <Button isIconOnly variant="bordered" radius="full" aria-label={activeView === "month" ? "Mes siguiente" : activeView === "week" ? "Semana siguiente" : "Día siguiente"} onPress={() => go(1)} className="min-h-11 min-w-11">
                        <Icon icon="material-symbols:chevron-right" width={22} aria-hidden="true" />
                    </Button>
                    <Button variant="bordered" radius="full" className="min-h-11 font-medium" onPress={() => setAnchor(new Date())}>
                        Hoy
                    </Button>
                    <h1 id="calendar-title" aria-live="polite" className="ml-1 text-xl font-bold sm:text-2xl">
                        {titleFor(activeView, anchor)}
                    </h1>
                </div>
                <div role="tablist" aria-label="Vista del calendario" className="inline-flex rounded-full bg-default-100 p-1">
                    {(["month", "week", "day"] as CalendarView[]).map((v) => (
                        <button
                            key={v}
                            type="button"
                            role="tab"
                            aria-selected={activeView === v}
                            onClick={() => setView(v)}
                            className={`${FOCUS_RING} min-h-10 rounded-full px-4 text-sm font-medium transition motion-reduce:transition-none ${activeView === v ? "bg-content1 shadow-sm" : "text-default-600 hover:text-foreground"}`}
                        >
                            {VIEW_LABEL[v]}
                        </button>
                    ))}
                </div>
            </header>

            {!google.connected ? (
                <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm">
                    <p className="flex items-start gap-2">
                        <Icon icon="logos:google-calendar" width={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>Conecta tu Google Calendar: tus reservas se envían solas y aquí ves lo que ya tienes ocupado.</span>
                    </p>
                    <Button as={Link} href={profileHref} size="sm" color="primary" radius="lg" className="font-semibold">
                        Conectar
                    </Button>
                </div>
            ) : null}
            {google.connected && google.needs_reconnect ? (
                <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
                    <p className="flex items-start gap-2">
                        <Icon icon="material-symbols:sync-problem-outline" width={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>Para ver tus horas ocupadas, vuelve a conectar Google Calendar: necesitamos un permiso nuevo (solo lee inicio y fin, no el contenido).</span>
                    </p>
                    <Button as={Link} href={profileHref} size="sm" color="warning" variant="flat" radius="lg" className="font-semibold">
                        Volver a conectar
                    </Button>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-default-600">
                {profiles.length > 1
                    ? profiles.map((p) => {
                          const off = hidden.has(p.id);
                          return (
                              <button
                                  key={p.id}
                                  type="button"
                                  aria-pressed={!off}
                                  onClick={() =>
                                      setHidden((current) => {
                                          const next = new Set(current);
                                          if (next.has(p.id)) next.delete(p.id);
                                          else next.add(p.id);
                                          return next;
                                      })
                                  }
                                  className={`${FOCUS_RING} inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 ${off ? "border-default-200 text-default-400 line-through" : "border-default-300 text-foreground"}`}
                              >
                                  <span className={`size-2.5 rounded-full ${p.tone.dot}`} aria-hidden="true" />
                                  {p.name}
                              </button>
                          );
                      })
                    : null}
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded border-l-4 border-primary-text bg-primary/15" aria-hidden="true" />Confirmado</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded border-l-4 border-dashed border-primary-text bg-content1" aria-hidden="true" />Tentativo (sin pago)</span>
                {google.connected && !google.needs_reconnect ? <span className="inline-flex items-center gap-1.5"><span className={`h-3 w-5 rounded border border-default-300 ${BUSY_STRIPES}`} aria-hidden="true" />Ocupado en Google</span> : null}
                {conflicts > 0 ? <span className="inline-flex items-center gap-1.5 font-medium text-danger-text"><Icon icon="material-symbols:warning-outline" width={14} aria-hidden="true" />{conflicts} {conflicts === 1 ? "evento se cruza" : "eventos se cruzan"} con otro</span> : null}
            </div>

            {status === "error" ? (
                <div role="alert" className="grid justify-items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-8 text-center">
                    <p className="font-medium">No pudimos cargar tu calendario.</p>
                    <Button color="primary" radius="lg" onPress={() => void load()}>
                        Reintentar
                    </Button>
                </div>
            ) : (
                <div aria-busy={status === "loading"} className={status === "loading" ? "opacity-60 transition-opacity motion-reduce:transition-none" : ""}>
                    {activeView === "month" ? renderMonth() : renderTimeGrid()}
                </div>
            )}

            {status === "ready" && visibleEvents.length === 0 ? (
                <p role="status" className="text-center text-sm text-default-500">
                    No tienes eventos en este periodo. Cuando se confirme una reserva aparecerá aquí.
                </p>
            ) : null}

            <Modal isOpen={selected !== null} onOpenChange={(open) => !open && setSelected(null)} placement="center" size="md">
                <ModalContent>
                    {selected ? (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <span className="text-lg font-bold">{selected.title}</span>
                                <span className="text-sm font-normal text-default-500">
                                    {capitalize(new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(new Date(selected.start)))} · {formatRange(selected)}
                                </span>
                            </ModalHeader>
                            <ModalBody className="grid gap-3 text-sm">
                                <p className={`inline-flex items-center gap-2 font-medium ${selected.state === "confirmed" ? "text-success-text" : "text-default-600"}`}>
                                    <Icon icon={selected.state === "confirmed" ? "material-symbols:check-circle-outline" : "material-symbols:schedule-outline"} width={18} aria-hidden="true" />
                                    {STATE_LABEL[selected.state]}
                                </p>
                                <p className="text-default-600">{describeState(selected)}</p>
                                {selected.conflict ? (
                                    <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 p-3 text-danger-text">
                                        <Icon icon="material-symbols:warning-outline" width={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                                        Este compromiso se cruza con otro en tu agenda. Revisa cuál puedes atender.
                                    </p>
                                ) : null}
                                {selected.city || selected.address ? (
                                    <p className="flex items-start gap-2">
                                        <Icon icon="material-symbols:location-on-outline" width={18} className="mt-0.5 shrink-0 text-default-500" aria-hidden="true" />
                                        {[selected.address, selected.city].filter(Boolean).join(", ")}
                                    </p>
                                ) : null}
                                {selected.profile_name ? (
                                    <p className="flex items-center gap-2">
                                        <Icon icon="mdi:account-music-outline" width={18} className="text-default-500" aria-hidden="true" />
                                        Perfil: {selected.profile_name}
                                    </p>
                                ) : null}
                                <p className="flex items-center gap-2 text-default-600">
                                    <Icon icon={selected.synced ? "logos:google-calendar" : "material-symbols:event-busy-outline"} width={18} aria-hidden="true" />
                                    {selected.synced ? "Ya está en tu Google Calendar." : "Todavía no está en tu Google Calendar."}
                                </p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Button
                                        as="a"
                                        href={buildGoogleCalendarTemplateUrl({
                                            title: `Chivapp: ${selected.title}${selected.profile_name ? ` - ${selected.profile_name}` : ""}`,
                                            startIso: selected.start,
                                            endIso: selected.end,
                                            location: [selected.address, selected.city].filter(Boolean).join(", "),
                                            description: describeState(selected),
                                        })}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="sm"
                                        variant="bordered"
                                        radius="lg"
                                        startContent={<Icon icon="logos:google-calendar" width={15} />}
                                    >
                                        Abrir en Google Calendar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="bordered"
                                        radius="lg"
                                        onPress={() =>
                                            downloadCalendarIcs({
                                                uid: selected.booking_id,
                                                title: `Chivapp: ${selected.title}${selected.profile_name ? ` - ${selected.profile_name}` : ""}`,
                                                startIso: selected.start,
                                                endIso: selected.end,
                                                location: [selected.address, selected.city].filter(Boolean).join(", "),
                                                description: describeState(selected),
                                            })
                                        }
                                        startContent={<Icon icon="lucide:download" width={15} />}
                                    >
                                        Descargar .ics
                                    </Button>
                                </div>
                            </ModalBody>
                            <ModalFooter className="flex-wrap">
                                <Button variant="light" radius="lg" onPress={() => setSelected(null)}>
                                    Cerrar
                                </Button>
                                <Button as={Link} href={`${detailHref}/${selected.booking_id}`} variant="flat" color="primary" radius="lg" className="font-semibold">
                                    Ir a esta reserva
                                </Button>
                                <Button as={Link} href={detailHref} color="primary" radius="lg" className="font-semibold">
                                    Ver mis reservas
                                </Button>
                            </ModalFooter>
                        </>
                    ) : null}
                </ModalContent>
            </Modal>
        </section>
    );
}
