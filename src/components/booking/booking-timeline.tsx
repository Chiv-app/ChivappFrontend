"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button, Card, CardBody, Chip, Progress } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    buildBookingTimeline,
    type BookingTimelineStep,
} from "@/lib/booking-timeline";
import type { BookingStatus, UserRole } from "@/types/api";

type Props = {
    status: BookingStatus;
    role: Extract<UserRole, "musician" | "contractor">;
    hasReview?: boolean;
    /** vertical = sidebar list; horizontal = top progress rail */
    orientation?: "vertical" | "horizontal";
    /** When false, parent handles sticky positioning (vertical only). */
    sticky?: boolean;
    /**
     * Horizontal only: sticks under the navbar, collapses on scroll to
     * phase titles, and publishes --booking-timeline-height for siblings.
     */
    collapseOnScroll?: boolean;
    /** Optional back link shown in the timeline card header. */
    backHref?: string;
};

const TRANSITION = "duration-250 ease-out";

const PHASE_ICON: Record<string, string> = {
    request: "material-symbols:edit-note-outline-rounded",
    quote: "material-symbols:request-quote-outline-rounded",
    contract: "material-symbols:contract-outline",
    advance: "material-symbols:account-balance-wallet-outline",
    confirmed: "material-symbols:event-available-outline-rounded",
    event: "material-symbols:music-note-rounded",
    done: "material-symbols:flag-rounded",
};

function PhaseMarker({
    step,
    size = "md",
}: {
    step: BookingTimelineStep;
    size?: "sm" | "md";
}) {
    const box = size === "sm" ? "size-8" : "size-9 sm:size-10";
    const iconSize = size === "sm" ? 16 : 18;
    const phaseIcon = PHASE_ICON[step.id] ?? "material-symbols:circle";

    if (step.state === "done") {
        return (
            <span
                className={`relative z-10 flex ${box} items-center justify-center rounded-full bg-success text-success-foreground shadow-soft`}
                title={step.title}
            >
                <Icon icon="material-symbols:check-rounded" width={iconSize} />
            </span>
        );
    }

    if (step.state === "current") {
        return (
            <span
                className={`relative z-10 flex ${box} items-center justify-center`}
                title={step.title}
            >
                <span
                    aria-hidden
                    className={`absolute inset-0 rounded-full bg-primary/35 animate-timeline-pulse`}
                />
                <span
                    aria-hidden
                    className={`absolute inset-0 rounded-full bg-primary/20 animate-timeline-pulse [animation-delay:0.55s]`}
                />
                <span
                    className={`relative flex ${box} items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow ring-4 ring-primary/20`}
                >
                    <Icon icon={phaseIcon} width={iconSize} />
                </span>
            </span>
        );
    }

    if (step.state === "skipped") {
        return (
            <span
                className={`relative z-10 flex ${box} items-center justify-center rounded-full bg-default-200 text-default-400`}
                title={step.title}
            >
                <Icon icon={phaseIcon} width={iconSize - 2} />
            </span>
        );
    }

    return (
        <span
            className={`relative z-10 flex ${box} items-center justify-center rounded-full border-2 border-default-300 bg-content1 text-default-500`}
            title={step.title}
        >
            <Icon icon={phaseIcon} width={iconSize} />
        </span>
    );
}

function phaseProgressRatio(steps: BookingTimelineStep[]): number {
    const currentIndex = steps.findIndex((step) => step.state === "current");
    let progressIndex = currentIndex;
    if (progressIndex < 0) {
        progressIndex = -1;
        for (let i = 0; i < steps.length; i += 1) {
            if (steps[i].state === "done" || steps[i].state === "skipped") {
                progressIndex = i;
            }
        }
        if (progressIndex < 0) progressIndex = 0;
    }
    if (steps.length <= 1) return 0;
    return progressIndex / (steps.length - 1);
}

function CancelledBanner({ message }: { message: string }) {
    return (
        <Card className="border border-danger/30 bg-danger/5 shadow-soft">
            <CardBody className="gap-2 p-4">
                <div className="flex items-center gap-2">
                    <Icon
                        icon="material-symbols:cancel"
                        width={20}
                        className="text-danger"
                    />
                    <p className="font-semibold text-foreground">Reserva cancelada</p>
                </div>
                <p className="text-sm text-default-600">{message}</p>
            </CardBody>
        </Card>
    );
}

const SHORT_PHASE_LABEL: Record<string, string> = {
    request: "Solicitud",
    quote: "Cotización",
    contract: "Contrato",
    advance: "Anticipo",
    confirmed: "Confirmada",
    balance: "Abono",
    event: "Evento",
    done: "Listo",
};

function phaseLabel(step: BookingTimelineStep, compact: boolean): string {
    if (!compact) return step.title;
    return SHORT_PHASE_LABEL[step.id] ?? step.title;
}

function PhaseRail({
    steps,
    compact = false,
}: {
    steps: BookingTimelineStep[];
    compact?: boolean;
}) {
    const progressRatio = phaseProgressRatio(steps);
    const markerSize = compact ? "sm" : "md";
    // Centers the track on the marker row (size-8 = 2rem, size-9/10 ≈ 2.25–2.5rem).
    const trackTop = compact ? "top-4" : "top-[1.125rem] sm:top-5";

    return (
        <nav aria-label="Fases de la reserva" className={`w-full overflow-x-auto scrollbar-none ${compact ? "pb-0" : "pb-1.5"}`}>
            <ol
                className={`relative grid gap-x-1 sm:gap-x-1.5 ${
                    compact ? "min-w-[480px] sm:min-w-0" : "min-w-[560px] sm:min-w-0"
                } w-full`}
                style={{
                    gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))`,
                }}
            >
                <li
                    aria-hidden
                    className={`pointer-events-none absolute ${trackTop} -translate-y-1/2 h-0.5`}
                    style={{
                        gridColumn: "1 / -1",
                        left: `calc(100% / ${Math.max(steps.length, 1)} / 2)`,
                        right: `calc(100% / ${Math.max(steps.length, 1)} / 2)`,
                    }}
                >
                    <span className="absolute inset-0 rounded-full bg-default-200/90" />
                    <span
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-[width] duration-500"
                        style={{ width: `${progressRatio * 100}%` }}
                    />
                </li>

                                {steps.map((step, index) => (
                    <li
                        key={step.id}
                        className="relative z-10 flex flex-col items-center text-center min-w-0 px-1"
                    >
                        <button
                            type="button"
                            className="flex flex-col items-center group focus:outline-none transition-transform active:scale-95 cursor-pointer w-full"
                            aria-label={`Ver fase ${step.title}`}
                        >
                            <div
                                className={`flex items-center justify-center transition-transform group-hover:scale-110 ${
                                    compact ? "h-8" : "h-9 sm:h-10"
                                }`}
                            >
                                <PhaseMarker step={step} size={markerSize} />
                            </div>
                            <span
                                className={`${compact ? "mt-0.5" : "mt-2"} w-full font-semibold leading-tight line-clamp-2 transition-colors group-hover:text-foreground ${
                                    compact
                                        ? "text-[9px] sm:text-[10px] md:text-xs"
                                        : "text-[10px] sm:text-xs"
                                } ${
                                    step.state === "current"
                                        ? "text-primary group-hover:text-primary-500"
                                        : step.state === "done"
                                          ? "text-success group-hover:text-success-500"
                                          : step.state === "skipped"
                                            ? "text-default-400 group-hover:text-default-600"
                                            : "text-default-600 group-hover:text-default-800"
                                }`}
                                title={step.title}
                            >
                                {compact ? (
                                    phaseLabel(step, true)
                                ) : (
                                    <>
                                        <span className="hidden sm:inline">{step.title}</span>
                                        <span className="sm:hidden">
                                            {phaseLabel(step, true)}
                                        </span>
                                    </>
                                )}
                            </span>
                            {!compact ? (
                                <span className="mt-1 text-[9px] sm:text-[10px] tabular-nums text-default-400 group-hover:text-default-500 transition-colors opacity-0">
                                    -
                                </span>
                            ) : null}
                        </button>
                    </li>
                ))}
            </ol>
        </nav>
    );
}

function CollapsedPhaseRail({
    steps,
}: {
    steps: BookingTimelineStep[];
}) {
    return <PhaseRail steps={steps} compact />;
}

function ExpandedPhaseStepper({
    timeline,
}: {
    timeline: ReturnType<typeof buildBookingTimeline>;
}) {
    const current =
        timeline.steps.find((step) => step.state === "current") ?? null;

    return (
        <div className="flex flex-col gap-4">
            <PhaseRail steps={timeline.steps} />

            {current ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-3">
                    <div className="flex items-center gap-2 shrink-0">
                        <PhaseMarker step={current} size="sm" />
                        <Chip size="sm" color="primary" variant="solid">
                            Ahora · {current.title}
                        </Chip>
                    </div>
                    <p className="text-sm text-foreground leading-snug text-pretty min-w-0">
                        {current.actorHint}
                    </p>
                </div>
            ) : null}
        </div>
    );
}

function TimelineBackButton({ href }: { href: string }) {
    return (
        <Button
            as={Link}
            href={href}
            isIconOnly
            variant="flat"
            radius="lg"
            size="sm"
            aria-label="Volver a reservas"
            className="shrink-0"
        >
            <Icon icon="material-symbols:arrow-back" width={18} />
        </Button>
    );
}

function ExpandedTimelineCard({
    status,
    timeline,
    backHref,
}: {
    status: BookingStatus;
    timeline: ReturnType<typeof buildBookingTimeline>;
    backHref?: string;
}) {
    return (
        <div className="overflow-hidden rounded-4xl border border-default-200/70 bg-content1 shadow-soft">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                        {backHref ? <TimelineBackButton href={backHref} /> : null}
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                                Timeline
                            </p>
                            <h2 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                                Camino de la reserva
                            </h2>
                            <p className="text-xs text-default-500 mt-1">
                                Destino:{" "}
                                <span className="font-semibold text-foreground">
                                    {timeline.destination}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:min-w-[11rem] sm:pt-1">
                        <div className="flex-1 sm:w-40">
                            <Progress
                                aria-label="Progreso de la reserva"
                                value={timeline.progressPercent}
                                color={
                                    timeline.progressPercent >= 100
                                        ? "success"
                                        : "primary"
                                }
                                size="sm"
                            />
                        </div>
                        <Chip
                            color={
                                timeline.progressPercent >= 100
                                    ? "success"
                                    : "primary"
                            }
                            variant="flat"
                            size="sm"
                            className="shrink-0"
                        >
                            {timeline.progressPercent}%
                        </Chip>
                    </div>
                </div>

                <div
                    className={`mt-3 rounded-xl border px-3.5 py-2.5 ${
                        status === "completed"
                            ? "border-success/30 bg-success/5"
                            : "border-default-200 bg-default-50/70"
                    }`}
                >
                    <p className="text-[11px] text-default-500">
                        {status === "completed" ? "Estado" : "Siguiente paso"}
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-snug mt-0.5">
                        {timeline.nextAction}
                    </p>
                </div>
            </div>

            <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-1">
                <ExpandedPhaseStepper timeline={timeline} />
            </div>
        </div>
    );
}

function StickyCollapsingHorizontalTimeline({
    status,
    timeline,
    backHref,
}: {
    status: BookingStatus;
    timeline: ReturnType<typeof buildBookingTimeline>;
    backHref?: string;
}) {
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const pillRef = useRef<HTMLDivElement | null>(null);
    const mobilePillRef = useRef<HTMLDivElement | null>(null);
    const expandedRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setPortalTarget(document.getElementById("navbar-center-slot"));
    }, []);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) return;
                setCollapsed(!entry.isIntersecting);
            },
            {
                root: null,
                threshold: 0,
                rootMargin: "-64px 0px 0px 0px",
            },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty("--booking-timeline-height", "0px");
    }, []);

    useGSAP(() => {
        // Animate expanded view out, pill in
        if (collapsed) {
            if (expandedRef.current) {
                gsap.to(expandedRef.current, { opacity: 0, y: -10, duration: 0.3, ease: "power2.inOut" });
            }
            if (pillRef.current) {
                gsap.fromTo(pillRef.current, 
                    { opacity: 0, y: -20, scale: 0.95 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.5)", delay: 0.1 }
                );
            }
            if (mobilePillRef.current) {
                gsap.fromTo(mobilePillRef.current, 
                    { opacity: 0, y: -20, scale: 0.95 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.5)", delay: 0.1 }
                );
            }
        } else {
            if (expandedRef.current) {
                gsap.to(expandedRef.current, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
            }
            if (pillRef.current) {
                gsap.to(pillRef.current, { opacity: 0, y: -15, scale: 0.95, duration: 0.2, ease: "power2.in" });
            }
            if (mobilePillRef.current) {
                gsap.to(mobilePillRef.current, { opacity: 0, y: -15, scale: 0.95, duration: 0.2, ease: "power2.in" });
            }
        }
    }, [collapsed]);

    // Pill for the navbar (only visible on large screens when collapsed)
    const navbarPill = (
        <div
            ref={pillRef}
            className="flex items-center gap-3 max-w-full rounded-full bg-content2/40 shadow-[inset_0_1px_4px_rgba(0,0,0,0.2)] border border-default-200/50 px-4 py-1 opacity-0 pointer-events-auto h-12"
            aria-hidden={!collapsed}
        >
            {backHref ? <TimelineBackButton href={backHref} /> : null}
            <div className="min-w-0 flex-1">
                <CollapsedPhaseRail steps={timeline.steps} />
            </div>
        </div>
    );

    return (
        <div className="relative w-full">
            {/* Ancla para observar el scroll */}
            <div ref={sentinelRef} className="absolute top-0 w-full h-px pointer-events-none" />

            {/* Versión Expandida */}
            <div ref={expandedRef} className="will-change-transform" aria-hidden={collapsed}>
                <ExpandedTimelineCard
                    status={status}
                    timeline={timeline}
                    backHref={backHref}
                />
            </div>

            {/* Versión Flotante en Móvil */}
            <div
                ref={mobilePillRef}
                className={`xl:hidden fixed z-40 left-0 right-0 pointer-events-none flex justify-center px-4 top-[calc(var(--app-navbar-height)+0.75rem)] opacity-0`}
                aria-hidden={!collapsed}
            >
                <div className="pointer-events-auto flex items-center gap-2 max-w-full rounded-[2rem] border border-default-200/60 bg-content1/85 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-5 py-2.5">
                    {backHref ? <TimelineBackButton href={backHref} /> : null}
                    <div className="min-w-0 flex-1">
                        <CollapsedPhaseRail steps={timeline.steps} />
                    </div>
                </div>
            </div>

            {/* Portal to Navbar (Desktop) */}
            {portalTarget ? createPortal(navbarPill, portalTarget) : null}
        </div>
    );
}
function VerticalTimeline({
    status,
    timeline,
    sticky,
}: {
    status: BookingStatus;
    timeline: ReturnType<typeof buildBookingTimeline>;
    sticky: boolean;
}) {
    return (
        <Card
            className={`border border-default-200/70 shadow-soft overflow-hidden ${
                sticky ? "lg:sticky lg:top-6" : ""
            }`}
        >
            <div className="bg-gradient-to-b from-primary/15 via-primary/5 to-transparent px-4 py-4 border-b border-default-200">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Timeline
                </p>
                <h3 className="text-base font-bold text-foreground mt-1">
                    Camino de la reserva
                </h3>
                <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-default-500">
                        Destino:{" "}
                        <span className="font-semibold text-foreground">
                            {timeline.destination}
                        </span>
                    </p>
                    <Chip
                        color={
                            timeline.progressPercent >= 100 ? "success" : "primary"
                        }
                        variant="flat"
                        size="sm"
                    >
                        {timeline.progressPercent}%
                    </Chip>
                </div>
                <Progress
                    aria-label="Progreso de la reserva"
                    value={timeline.progressPercent}
                    color={timeline.progressPercent >= 100 ? "success" : "primary"}
                    className="mt-3"
                    size="sm"
                />
                <div
                    className={`mt-3 rounded-xl bg-content1 border px-3 py-2 ${
                        status === "completed"
                            ? "border-success/30"
                            : "border-primary/20"
                    }`}
                >
                    <p className="text-[11px] text-default-500">
                        {status === "completed" ? "Estado" : "Tu turno"}
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-snug mt-0.5">
                        {timeline.nextAction}
                    </p>
                </div>
            </div>

            <CardBody className="p-3">
                <ol className="relative flex flex-col">
                    {timeline.steps.map((step, index) => {
                        const isLast = index === timeline.steps.length - 1;
                        const completed =
                            step.state === "done" || step.state === "skipped";

                        return (
                            <li
                                key={step.id}
                                className={`relative flex gap-3 pb-4 last:pb-0 rounded-xl px-1 ${
                                    step.state === "done"
                                        ? "bg-success/10"
                                        : step.state === "current"
                                          ? "bg-primary/10"
                                          : ""
                                }`}
                            >
                                {!isLast ? (
                                    <span
                                        className={`absolute left-[1.125rem] sm:left-5 top-10 h-[calc(100%-1.25rem)] w-0.5 ${
                                            completed
                                                ? "bg-success/60"
                                                : step.state === "current"
                                                  ? "bg-primary/30"
                                                  : "bg-default-200"
                                        }`}
                                        aria-hidden
                                    />
                                ) : null}

                                <div className="relative z-10 shrink-0 mt-0.5">
                                    <PhaseMarker step={step} size="md" />
                                </div>

                                <div
                                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 transition-colors ${
                                        step.state === "current"
                                            ? "border-primary/50 bg-primary/5 shadow-soft"
                                            : step.state === "done"
                                              ? "border-success/40 bg-success/15"
                                              : step.state === "skipped"
                                                ? "border-default-200 bg-default-100/80 opacity-60"
                                                : "border-default-200 bg-content1 opacity-75"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p
                                            className={`text-sm font-semibold leading-snug ${
                                                step.state === "done"
                                                    ? "text-success"
                                                    : step.state === "current"
                                                      ? "text-primary"
                                                      : "text-foreground"
                                            }`}
                                        >
                                            {index + 1}. {step.title}
                                        </p>
                                        {step.state === "done" ? (
                                            <Chip size="sm" color="success" variant="flat">
                                                Hecho
                                            </Chip>
                                        ) : step.state === "current" ? (
                                            <Chip size="sm" color="primary" variant="solid">
                                                Ahora
                                            </Chip>
                                        ) : null}
                                    </div>
                                    <p className="text-xs text-default-600 mt-1 leading-relaxed">
                                        {step.description}
                                    </p>
                                    {step.state === "current" ? (
                                        <p className="text-xs font-medium text-primary mt-2">
                                            {step.actorHint}
                                        </p>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </CardBody>
        </Card>
    );
}

export default function BookingTimeline({
    status,
    role,
    hasReview = false,
    orientation = "vertical",
    sticky = true,
    collapseOnScroll = false,
    backHref,
}: Props) {
    const timeline = buildBookingTimeline(status, role, { hasReview });

    if (timeline.isCancelled) {
        return <CancelledBanner message={timeline.nextAction} />;
    }

    if (orientation === "horizontal") {
        if (collapseOnScroll) {
            return (
                <StickyCollapsingHorizontalTimeline
                    status={status}
                    timeline={timeline}
                    backHref={backHref}
                />
            );
        }
        return (
            <ExpandedTimelineCard
                status={status}
                timeline={timeline}
                backHref={backHref}
            />
        );
    }

    return (
        <VerticalTimeline status={status} timeline={timeline} sticky={sticky} />
    );
}
