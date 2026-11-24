"use client";

import { Icon } from "@iconify/react";

export type CircularStepItem = {
    id: string | number;
    title: string;
    subtitle?: string;
    state: "done" | "current" | "upcoming";
    disabled?: boolean;
};

type Props = {
    steps: CircularStepItem[];
    onStepClick?: (step: CircularStepItem, index: number) => void;
    ariaLabel?: string;
    compact?: boolean;
};

export default function CircularStepper({
    steps,
    onStepClick,
    ariaLabel = "Progreso de pasos",
    compact = false,
}: Props) {
    const currentIndex = steps.findIndex((s) => s.state === "current");
    let progressIndex = currentIndex;
    if (progressIndex < 0) {
        for (let i = 0; i < steps.length; i += 1) {
            if (steps[i].state === "done") progressIndex = i;
        }
        if (progressIndex < 0) progressIndex = 0;
    }
    const progressRatio =
        steps.length <= 1 ? 0 : progressIndex / (steps.length - 1);

    const circleSize = compact ? "size-7 text-xs" : "size-8 sm:size-9 text-xs sm:text-sm";
    const trackTop = compact ? "top-3.5" : "top-4 sm:top-[1.125rem]";

    return (
        <nav aria-label={ariaLabel} className="w-full">
            <ol
                className="relative grid gap-x-1 sm:gap-x-2 w-full"
                style={{
                    gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))`,
                }}
            >
                {/* Línea conectora entre los círculos */}
                {steps.length > 1 ? (
                    <li
                        aria-hidden
                        className={`pointer-events-none absolute ${trackTop} -translate-y-1/2 h-0.5`}
                        style={{
                            gridColumn: "1 / -1",
                            left: `calc(100% / ${steps.length} / 2)`,
                            right: `calc(100% / ${steps.length} / 2)`,
                        }}
                    >
                        <span className="absolute inset-0 rounded-full bg-default-200/90" />
                        <span
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-success via-primary to-primary/80 transition-[width] duration-300"
                            style={{ width: `${progressRatio * 100}%` }}
                        />
                    </li>
                ) : null}

                {steps.map((step, index) => {
                    const isDone = step.state === "done";
                    const isCurrent = step.state === "current";
                    const isInteractive = Boolean(onStepClick && !step.disabled);

                    const content = (
                        <>
                            <span
                                className={`relative z-10 flex ${circleSize} items-center justify-center rounded-full font-bold transition-all ${
                                    isDone
                                        ? "bg-success text-success-foreground shadow-soft"
                                        : isCurrent
                                          ? "bg-primary text-primary-foreground shadow-glow ring-4 ring-primary/20"
                                          : "border-2 border-default-300 bg-content1 text-default-500"
                                }`}
                            >
                                {isDone ? (
                                    <Icon
                                        icon="lucide:check"
                                        width={compact ? 13 : 16}
                                        strokeWidth={3}
                                    />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <span
                                className={`mt-1.5 w-full font-semibold leading-tight line-clamp-2 text-center ${
                                    compact ? "text-[11px]" : "text-xs"
                                } ${
                                    isCurrent
                                        ? "text-primary-text"
                                        : isDone
                                          ? "text-success-text"
                                          : "text-default-500"
                                }`}
                            >
                                {step.title}
                            </span>
                            {step.subtitle && !compact ? (
                                <span className="text-[11px] text-default-400 leading-tight line-clamp-1 mt-0.5">
                                    {step.subtitle}
                                </span>
                            ) : null}
                        </>
                    );

                    return (
                        <li
                            key={step.id}
                            aria-current={isCurrent ? "step" : undefined}
                            className="relative z-10 flex flex-col items-center text-center min-w-0 px-1"
                        >
                            {isInteractive ? (
                                <button
                                    type="button"
                                    onClick={() => onStepClick?.(step, index)}
                                    className="flex flex-col items-center w-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus cursor-pointer transition-transform active:scale-95"
                                >
                                    {content}
                                </button>
                            ) : (
                                <div className="flex flex-col items-center w-full">
                                    {content}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
