"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { labelProfileField } from "@/lib/profile-validation/field-labels";
import type { ProfileValidationOut } from "@/types/api";

export type ProfileWizardStepDef = {
    key: string;
    title: string;
    description: string;
    icon: string;
    shortTitle?: string;
    required?: boolean;
};

type StepState = "done" | "current" | "upcoming";

type RailStep = {
    id: string;
    title: string;
    shortTitle: string;
    description: string;
    icon: string;
    state: StepState;
    missing: string[];
    required: boolean;
};

type Props = {
    steps: ProfileWizardStepDef[];
    activeStep: number;
    validation: ProfileValidationOut;
    onStepSelect: (index: number) => void;
    rejectionReason?: string | null;
    /** Main heading shown inside the expanded timeline card */
    heading: string;
    /** Short friendly subtitle under the heading */
    subtitle: string;
    /** Small chip above the heading */
    badgeLabel?: string;
    collapseOnScroll?: boolean;
};

const TRANSITION = "duration-250 ease-out";

function isStepRequired(
    stepDef: ProfileWizardStepDef,
    validation: ProfileValidationOut,
): boolean {
    const fromValidation = validation.steps.find((item) => item.key === stepDef.key);
    if (typeof fromValidation?.required === "boolean") {
        return fromValidation.required;
    }
    return stepDef.required !== false;
}

function getStepState(
    index: number,
    activeStep: number,
    isCompleted: boolean,
): StepState {
    if (isCompleted) return "done";
    if (index === activeStep) return "current";
    return "upcoming";
}

function buildRailSteps(
    steps: ProfileWizardStepDef[],
    activeStep: number,
    validation: ProfileValidationOut,
): RailStep[] {
    return steps.map((step, index) => {
        const validationStep = validation.steps.find((item) => item.key === step.key);
        const isCompleted = validationStep?.completed ?? false;
        return {
            id: step.key,
            title: step.title,
            shortTitle: step.shortTitle ?? step.title,
            description: step.description,
            icon: step.icon,
            state: getStepState(index, activeStep, isCompleted),
            missing: validationStep?.missing ?? [],
            required: isStepRequired(step, validation),
        };
    });
}

function phaseProgressRatio(steps: RailStep[]): number {
    const currentIndex = steps.findIndex((step) => step.state === "current");
    let progressIndex = currentIndex;
    if (progressIndex < 0) {
        progressIndex = -1;
        for (let i = 0; i < steps.length; i += 1) {
            if (steps[i].state === "done") progressIndex = i;
        }
        if (progressIndex < 0) progressIndex = 0;
    }
    if (steps.length <= 1) {
        return progressIndex >= 0 && steps[0]?.state === "done" ? 1 : 0;
    }
    return progressIndex / (steps.length - 1);
}

function PhaseMarker({
    step,
    size = "md",
}: {
    step: RailStep;
    size?: "sm" | "md";
}) {
    const box = size === "sm" ? "size-8" : "size-9 sm:size-10";
    const iconSize = size === "sm" ? 16 : 18;

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
                    className="absolute inset-0 rounded-full bg-primary/35 animate-timeline-pulse"
                />
                <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-primary/20 animate-timeline-pulse [animation-delay:0.55s]"
                />
                <span
                    className={`relative flex ${box} items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow ring-4 ring-primary/20`}
                >
                    <Icon icon={step.icon} width={iconSize} />
                </span>
            </span>
        );
    }

    return (
        <span
            className={`relative z-10 flex ${box} items-center justify-center rounded-full border-2 border-default-300 bg-content1 text-default-500`}
            title={step.title}
        >
            <Icon icon={step.icon} width={iconSize} />
        </span>
    );
}

function PhaseRail({
    steps,
    onStepSelect,
    compact = false,
}: {
    steps: RailStep[];
    onStepSelect?: (index: number) => void;
    compact?: boolean;
}) {
    const scrollRef = useRef<HTMLElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <nav 
            ref={scrollRef}
            aria-label="Pasos del perfil" 
            className="w-full overflow-x-auto pb-2 scrollbar-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
        >
            <ol className="flex items-center gap-2.5 w-max min-w-full px-1">
                {steps.map((step, index) => {
                    const isCurrent = step.state === "current";
                    const isDone = step.state === "done";
                    const isUpcoming = step.state === "upcoming";
                    const phaseIcon = isDone ? "material-symbols:check-circle-rounded" : step.icon || "material-symbols:circle";

                    const Tag = onStepSelect ? "button" : "div";
                    const props = onStepSelect ? { onClick: () => onStepSelect(index), type: "button" as const } : {};

                    return (
                        <li key={step.id} className="shrink-0">
                            <Tag
                                // @ts-ignore dynamic tag
                                {...props}
                                className={`group relative flex items-center h-10 sm:h-11 rounded-full border backdrop-blur-md shadow-soft transition-all duration-300 ease-out px-4 gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    onStepSelect ? "cursor-pointer" : ""
                                } ${
                                    isCurrent
                                        ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
                                        : isDone
                                          ? "border-success/40 bg-success/10 text-success hover:bg-success/15"
                                          : "border-default-200/60 bg-content1/85 text-default-500 hover:border-primary/40 hover:text-foreground"
                                }`}
                                aria-current={isCurrent ? "step" : undefined}
                                aria-label={`${index + 1}. ${step.title}${step.required ? "" : " (opcional)"}`}
                            >
                                <span className={`flex items-center justify-center shrink-0 ${isDone ? "text-success" : isCurrent ? "text-primary" : "text-default-400 group-hover:text-primary"}`}>
                                    <Icon icon={phaseIcon} width={18} height={18} />
                                </span>
                                <span className={`text-sm font-semibold whitespace-nowrap ${isCurrent ? "text-primary" : isDone ? "text-success" : "text-default-600 group-hover:text-foreground"}`}>
                                    {compact ? step.shortTitle : step.title}
                                </span>
                                {!step.required && !compact ? (
                                    <span className="text-[10px] font-medium opacity-60 ml-1">
                                        (Opcional)
                                    </span>
                                ) : null}
                            </Tag>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

function ExpandedTimelineCard({
    railSteps,
    validation,
    onStepSelect,
    rejectionReason,
    heading,
    subtitle,
    badgeLabel,
    requiredDone,
    requiredTotal,
}: {
    railSteps: RailStep[];
    validation: ProfileValidationOut;
    onStepSelect: (index: number) => void;
    rejectionReason?: string | null;
    heading: string;
    subtitle: string;
    badgeLabel?: string;
    requiredDone: number;
    requiredTotal: number;
}) {
    const current = railSteps.find((step) => step.state === "current") ?? null;
    const currentMissingLabels = (current?.missing ?? []).map(labelProfileField);
    const readyToSubmit = validation.can_submit;

    let currentHint = current?.description ?? "";
    if (current) {
        if (current.state === "done" || current.missing.length === 0) {
            currentHint = current.required
                ? "Este paso ya está listo."
                : "Opcional: puedes completarlo ahora o más adelante.";
        } else if (current.required) {
            currentHint =
                currentMissingLabels.length > 0
                    ? `Completa: ${currentMissingLabels.join(", ")}`
                    : "Completa este paso para poder enviar tu perfil.";
        } else {
            currentHint = "Opcional: mejora tu perfil cuando quieras.";
        }
    }

    return (
        <div className="overflow-hidden rounded-4xl border border-default-200/70 bg-content1 shadow-soft">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                        {badgeLabel ? (
                            <Chip color="primary" variant="flat" size="sm" className="mb-2">
                                {badgeLabel}
                            </Chip>
                        ) : (
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">
                                Timeline
                            </p>
                        )}
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground text-balance">
                            {heading}
                        </h1>
                        <p className="text-sm text-default-500 mt-1.5 text-pretty max-w-2xl">
                            {subtitle}
                        </p>
                    </div>
                    <Chip
                        color={readyToSubmit ? "success" : "primary"}
                        variant="flat"
                        size="sm"
                        className="shrink-0 self-start"
                    >
                        {readyToSubmit
                            ? "Listo para enviar"
                            : `${requiredDone}/${requiredTotal} obligatorios`}
                    </Chip>
                </div>

                {validation.status === "rejected" && rejectionReason ? (
                    <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5">
                        <p className="text-[11px] text-danger font-semibold">
                            Necesita correcciones
                        </p>
                        <p className="text-xs text-default-700 mt-0.5">{rejectionReason}</p>
                    </div>
                ) : null}
            </div>

            <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-1 flex flex-col gap-4">
                <PhaseRail steps={railSteps} onStepSelect={onStepSelect} />

                {current ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-3">
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <PhaseMarker step={current} size="sm" />
                            <Chip size="sm" color="primary" variant="solid">
                                Ahora · {current.title}
                            </Chip>
                            {!current.required ? (
                                <Chip size="sm" color="default" variant="flat">
                                    Opcional
                                </Chip>
                            ) : null}
                        </div>
                        <p className="text-sm text-foreground leading-snug text-pretty min-w-0">
                            {currentHint}
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function StickyCollapsingTimeline({
    railSteps,
    validation,
    onStepSelect,
    rejectionReason,
    heading,
    subtitle,
    badgeLabel,
    requiredDone,
    requiredTotal,
}: {
    railSteps: RailStep[];
    validation: ProfileValidationOut;
    onStepSelect: (index: number) => void;
    rejectionReason?: string | null;
    heading: string;
    subtitle: string;
    badgeLabel?: string;
    requiredDone: number;
    requiredTotal: number;
}) {
    const shellRef = useRef<HTMLDivElement | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        let rafId: number | null = null;

        const handleScroll = () => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = null;
                const scrollY = window.scrollY || document.documentElement.scrollTop;
                // Histéresis limpia: colapsa al hacer scroll (> 120px) y solo re-expande cerca del top (< 40px)
                if (scrollY > 120) {
                    setCollapsed(true);
                } else if (scrollY < 40) {
                    setCollapsed(false);
                }
            });
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();

        return () => {
            if (rafId !== null) window.cancelAnimationFrame(rafId);
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <div
            ref={shellRef}
            className={`sticky z-40 top-[var(--app-navbar-height)] transition-[padding,background-color,border-color,backdrop-filter] ${TRANSITION} ${
                collapsed
                    ? "bg-background/85 backdrop-blur-xl border-b border-default-200/50 py-2 sm:py-2.5 -mx-4 px-4 lg:-mx-8 lg:px-8 shadow-xs"
                    : "bg-transparent border-b border-transparent py-0 mb-1"
            }`}
        >
            <div className="max-w-6xl mx-auto">
                <div
                    className={`overflow-hidden transition-all ${TRANSITION} ${
                        collapsed
                            ? "max-h-0 opacity-0 -translate-y-1 scale-[0.99] pointer-events-none"
                            : "max-h-96 opacity-100 translate-y-0 scale-100"
                    }`}
                    aria-hidden={collapsed}
                >
                    <ExpandedTimelineCard
                        railSteps={railSteps}
                        validation={validation}
                        onStepSelect={onStepSelect}
                        rejectionReason={rejectionReason}
                        heading={heading}
                        subtitle={subtitle}
                        badgeLabel={badgeLabel}
                        requiredDone={requiredDone}
                        requiredTotal={requiredTotal}
                    />
                </div>
                <div
                    className={`overflow-hidden transition-all ${TRANSITION} ${
                        collapsed
                            ? "max-h-24 opacity-100 translate-y-0 scale-100"
                            : "max-h-0 opacity-0 translate-y-1 scale-[0.99] pointer-events-none"
                    }`}
                    aria-hidden={!collapsed}
                >
                    <PhaseRail
                        steps={railSteps}
                        onStepSelect={onStepSelect}
                        compact
                    />
                </div>
            </div>
        </div>
    );
}

export default function ProfileWizardTimeline({
    steps,
    activeStep,
    validation,
    onStepSelect,
    rejectionReason,
    heading,
    subtitle,
    badgeLabel,
    collapseOnScroll = true,
}: Props) {
    const railSteps = buildRailSteps(steps, activeStep, validation);
    const requiredSteps = railSteps.filter((step) => step.required);
    const requiredDone = requiredSteps.filter((step) => step.state === "done").length;
    const requiredTotal = Math.max(requiredSteps.length, 1);

    if (collapseOnScroll) {
        return (
            <StickyCollapsingTimeline
                railSteps={railSteps}
                validation={validation}
                onStepSelect={onStepSelect}
                rejectionReason={rejectionReason}
                heading={heading}
                subtitle={subtitle}
                badgeLabel={badgeLabel}
                requiredDone={requiredDone}
                requiredTotal={requiredTotal}
            />
        );
    }

    return (
        <ExpandedTimelineCard
            railSteps={railSteps}
            validation={validation}
            onStepSelect={onStepSelect}
            rejectionReason={rejectionReason}
            heading={heading}
            subtitle={subtitle}
            badgeLabel={badgeLabel}
            requiredDone={requiredDone}
            requiredTotal={requiredTotal}
        />
    );
}
