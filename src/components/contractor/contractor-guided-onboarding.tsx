"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import AppLogo from "@/components/layout/app-logo";
import ChoiceChip from "@/components/ui/choice-chip";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import {
    CONTRACTOR_CHAPTERS,
    CONTRACTOR_FLOW,
    CONTRACTOR_STEP_CHAPTER,
    DOCUMENT_TYPES,
    type ContractorGuideData,
    type ContractorGuideError,
    type ContractorGuideField,
    type ContractorStepId,
    contractorDataFromProfile,
    contractorMinutesLeft,
    emptyContractorData,
    resumeContractorStep,
    validateContractorStep,
} from "@/lib/contractor-onboarding";
import { CITY_OPTIONS } from "@/lib/onboarding-guide";
import { getCityIcon } from "@/lib/onboarding-icons";
import { getContractorProfile, submitContractorProfile, updateContractorProfile } from "@/lib/profiles";
import { uploadFile } from "@/lib/uploads";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const STEP_COPY: Record<Exclude<ContractorStepId, "enviado">, { title: string; lead: string; privacy?: string }> = {
    contacto: {
        title: "¿Cómo te llamas?",
        lead: "Así te identifican los músicos cuando les envías una solicitud.",
        privacy: "Tu nombre y tu ciudad se muestran en tu perfil de contratante.",
    },
    donde: {
        title: "¿Dónde vives?",
        lead: "Estos datos van en el contrato de cada reserva.",
        privacy: "La dirección va al contrato y no se muestra en tu perfil.",
    },
    documento: {
        title: "Confirma que eres tú",
        lead: "Sube una foto de tu documento para validar tu identidad.",
        privacy: "La foto solo la ve el equipo de Chivapp. El número va al contrato y no se muestra en tu perfil.",
    },
    revision: {
        title: "Revisa y envía",
        lead: "Un integrante del equipo revisa tu perfil. Te avisamos en la app y por correo.",
    },
};

const FOCUS_SELECTORS: Record<ContractorGuideField, string> = {
    fullname: "#contractor-fullname",
    city: "#contractor-city button",
    address: "#contractor-address",
    documentNumber: "#contractor-document-number",
    document: "#contractor-document-pick",
};

function errorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError && error.message) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function FieldError({ error, field }: { error: ContractorGuideError | null; field: ContractorGuideField }) {
    if (error?.field !== field) return null;
    return (
        <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger-text">
            <Icon icon="material-symbols:error-outline" width={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error.message}</span>
        </p>
    );
}

function ChapterBar({ step }: { step: ContractorStepId }) {
    const chapterId = step === "enviado" ? null : CONTRACTOR_STEP_CHAPTER[step];
    const currentIndex = step === "enviado" ? CONTRACTOR_CHAPTERS.length : CONTRACTOR_CHAPTERS.findIndex((c) => c.id === chapterId);
    return (
        <div className="grid gap-1.5">
            <div
                role="progressbar"
                aria-label="Progreso del perfil"
                aria-valuemin={0}
                aria-valuemax={CONTRACTOR_CHAPTERS.length}
                aria-valuenow={Math.max(0, currentIndex)}
                className="flex gap-1.5"
            >
                {CONTRACTOR_CHAPTERS.map((chapter, index) => {
                    const stepsHere = CONTRACTOR_FLOW.filter((s) => CONTRACTOR_STEP_CHAPTER[s as Exclude<ContractorStepId, "enviado">] === chapter.id);
                    const position = chapterId === chapter.id ? stepsHere.indexOf(step) : 0;
                    const fill = index < currentIndex ? 100 : index === currentIndex ? ((position + 0.4) / stepsHere.length) * 100 : 0;
                    return (
                        <div key={chapter.id} className="h-[5px] flex-1 overflow-hidden rounded-full bg-default-200">
                            <div className="h-full rounded-full bg-primary-text transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${fill}%` }} />
                        </div>
                    );
                })}
            </div>
            <div className="hidden gap-1.5 sm:flex" aria-hidden="true">
                {CONTRACTOR_CHAPTERS.map((chapter, index) => (
                    <span key={chapter.id} className={`flex-1 text-[11px] ${index === currentIndex ? "font-semibold text-primary-text" : index < currentIndex ? "text-default-600" : "text-default-400"}`}>
                        {chapter.title}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function ContractorGuidedOnboarding() {
    const router = useRouter();
    const { user, isLoading: isAuthLoading, refresh } = useAuth();

    const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [step, setStep] = useState<ContractorStepId>("contacto");
    const [data, setData] = useState<ContractorGuideData>(emptyContractorData());
    const [returnTo, setReturnTo] = useState<ContractorStepId | null>(null);
    const [error, setError] = useState<ContractorGuideError | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [documentPreview, setDocumentPreview] = useState<string | null>(null);
    const [showSaved, setShowSaved] = useState(false);
    const [chapterNote, setChapterNote] = useState<string | null>(null);

    const headingRef = useRef<HTMLHeadingElement>(null);
    const documentInput = useRef<HTMLInputElement>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const later = (fn: () => void, ms: number) => {
        timers.current.push(setTimeout(fn, ms));
    };
    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach(clearTimeout);
    }, []);
    useEffect(() => {
        return () => {
            if (documentPreview) URL.revokeObjectURL(documentPreview);
        };
    }, [documentPreview]);

    const load = useCallback(async () => {
        if (isAuthLoading) return;
        if (!user) {
            router.replace("/login?redirect=/contractor/onboarding");
            return;
        }
        if (user.role !== "contractor") {
            router.replace(user.role === "admin" ? "/admin" : "/musician");
            return;
        }
        setPhase("loading");
        setLoadError(null);
        try {
            const profile = await getContractorProfile();
            // Solo el borrador pasa por la guía; el resto edita su perfil en el panel.
            if (profile.status !== "draft") {
                router.replace("/contractor/profile");
                return;
            }
            const initial = contractorDataFromProfile(profile, user.fullname);
            setData(initial);
            const hasProgress = Boolean(initial.city.trim() || initial.address.trim() || initial.documentNumber.trim() || initial.documentUrl || initial.phone.trim());
            setStep(hasProgress ? resumeContractorStep(initial) : "contacto");
            setPhase("ready");
        } catch (err) {
            setLoadError(errorMessage(err, "No pudimos cargar tu perfil. Revisa tu conexión e inténtalo de nuevo."));
            setPhase("error");
        }
    }, [isAuthLoading, router, user]);

    useEffect(() => {
        void Promise.resolve().then(() => load());
    }, [load]);

    useEffect(() => {
        if (phase !== "ready") return;
        window.scrollTo?.({ top: 0 });
        if (step === "contacto") return;
        headingRef.current?.focus({ preventScroll: true });
    }, [step, phase]);

    function patch(partial: Partial<ContractorGuideData>, clear?: ContractorGuideField) {
        setData((current) => ({ ...current, ...partial }));
        setFormError(null);
        if (clear && error?.field === clear) setError(null);
    }

    function showError(next: ContractorGuideError) {
        setError(next);
        if (next.field === "review") return;
        const field = next.field;
        requestAnimationFrame(() => document.querySelector<HTMLElement>(FOCUS_SELECTORS[field])?.focus());
    }

    function goTo(next: ContractorStepId) {
        setError(null);
        setFormError(null);
        const from = step === "enviado" ? null : CONTRACTOR_STEP_CHAPTER[step];
        const to = next === "enviado" ? null : CONTRACTOR_STEP_CHAPTER[next];
        const forward = CONTRACTOR_FLOW.indexOf(next) > CONTRACTOR_FLOW.indexOf(step);
        if (!returnTo && forward && from && to && from !== to) {
            const done = CONTRACTOR_CHAPTERS.find((c) => c.id === from)?.title;
            const upcoming = CONTRACTOR_CHAPTERS.find((c) => c.id === to)?.title;
            setChapterNote(`${done} listo. Sigue: ${upcoming}.`);
            later(() => setChapterNote(null), 3500);
        } else {
            setChapterNote(null);
        }
        setStep(next);
    }

    function advance() {
        if (returnTo) {
            const target = returnTo;
            setReturnTo(null);
            goTo(target);
            return;
        }
        goTo(CONTRACTOR_FLOW[CONTRACTOR_FLOW.indexOf(step) + 1] ?? "enviado");
    }

    function goBack() {
        if (returnTo) {
            const target = returnTo;
            setReturnTo(null);
            goTo(target);
            return;
        }
        const index = CONTRACTOR_FLOW.indexOf(step);
        if (index > 0) goTo(CONTRACTOR_FLOW[index - 1]);
    }

    async function persist(current: ContractorStepId) {
        switch (current) {
            case "contacto":
                await updateContractorProfile({ fullname: data.fullname.trim(), phone: data.phone.trim() || null });
                break;
            case "donde":
                await updateContractorProfile({ city: data.city.trim(), address: data.address.trim() });
                break;
            case "documento":
                await updateContractorProfile({
                    document_type: data.documentType,
                    document_number: data.documentNumber.trim(),
                    id_document_url: data.documentUrl,
                });
                break;
            default:
                break;
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (busy || uploading) return;
        if (step === "enviado") {
            router.replace("/contractor");
            return;
        }
        const problem = validateContractorStep(step, data);
        if (problem) {
            showError(problem);
            return;
        }
        setError(null);
        setFormError(null);
        setBusy(true);
        try {
            if (step === "revision") {
                await submitContractorProfile();
                try {
                    await refresh();
                } catch {
                    // refrescar la sesión no debe impedir mostrar que el perfil se envió
                }
                goTo("enviado");
            } else {
                await persist(step);
                setShowSaved(true);
                later(() => setShowSaved(false), 1800);
                advance();
            }
        } catch (err) {
            const message = errorMessage(err, "No pudimos guardar. Inténtalo de nuevo.");
            if (step === "revision") showError({ field: "review", message });
            else setFormError(message);
            addToast({ title: "No se pudo guardar", description: message, color: "danger" });
        } finally {
            setBusy(false);
        }
    }

    async function handleDocument(file: File | undefined) {
        if (!file) return;
        setUploading(true);
        setError(null);
        setFormError(null);
        try {
            const url = await uploadFile(file, { private: true });
            setDocumentPreview(URL.createObjectURL(file));
            patch({ documentUrl: url }, "document");
        } catch (err) {
            showError({ field: "document", message: errorMessage(err, "No pudimos subir el archivo. Inténtalo de nuevo.") });
        } finally {
            setUploading(false);
        }
    }

    if (isAuthLoading || phase === "loading") {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-background" role="status" aria-label="Cargando tu perfil">
                <div className="h-24 w-24 animate-pulse rounded-full bg-default-200 motion-reduce:animate-none" />
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
                <div className="grid max-w-sm gap-4 text-center" role="alert">
                    <h1 className="text-xl font-bold">No pudimos cargar tu perfil</h1>
                    <p className="text-default-500">{loadError}</p>
                    <Button color="primary" size="lg" onPress={() => void load()}>
                        Reintentar
                    </Button>
                </div>
            </div>
        );
    }

    const inFlow = step !== "enviado";
    const copy = inFlow ? STEP_COPY[step] : null;
    const chapterId = inFlow ? CONTRACTOR_STEP_CHAPTER[step] : null;
    const chapter = CONTRACTOR_CHAPTERS.find((c) => c.id === chapterId);
    const chapterSteps = CONTRACTOR_FLOW.filter((s) => CONTRACTOR_STEP_CHAPTER[s as Exclude<ContractorStepId, "enviado">] === chapterId);
    const chapterPosition = chapterSteps.indexOf(step) + 1;
    const inputClasses = { inputWrapper: "min-h-14", input: "text-[17px]" };
    const ctaLabel = step === "enviado" ? "Ir a mi panel" : step === "revision" ? "Enviar a revisión" : returnTo ? "Guardar y volver" : "Continuar";

    function renderBody() {
        switch (step) {
            case "contacto":
                return (
                    <>
                        <div className="grid gap-2">
                            <Input
                                id="contractor-fullname"
                                label="Nombre completo"
                                labelPlacement="outside"
                                placeholder="Tu nombre y apellidos"
                                variant="bordered"
                                radius="lg"
                                size="lg"
                                classNames={inputClasses}
                                startContent={<Icon icon="material-symbols:person-outline" width={22} className="text-default-500" aria-hidden="true" />}
                                value={data.fullname}
                                onValueChange={(v) => patch({ fullname: v }, "fullname")}
                                autoComplete="name"
                                maxLength={150}
                                autoFocus
                                isInvalid={error?.field === "fullname"}
                            />
                            <FieldError error={error} field="fullname" />
                        </div>
                        <Input
                            label="Teléfono (opcional)"
                            labelPlacement="outside"
                            placeholder="+51 999 999 999"
                            description="Para coordinar los detalles de tu evento."
                            variant="bordered"
                            radius="lg"
                            size="lg"
                            classNames={inputClasses}
                            startContent={<Icon icon="material-symbols:call-outline" width={22} className="text-default-500" aria-hidden="true" />}
                            value={data.phone}
                            onValueChange={(v) => patch({ phone: v })}
                            inputMode="tel"
                            autoComplete="tel"
                            maxLength={30}
                        />
                    </>
                );
            case "donde":
                return (
                    <>
                        <div className="grid gap-3" role="group" aria-labelledby="lbl-contractor-city">
                            <span id="lbl-contractor-city" className="text-[15px] font-semibold">
                                Ciudad
                            </span>
                            <div id="contractor-city" className="flex flex-wrap gap-2.5">
                                {CITY_OPTIONS.map((city) => (
                                    <ChoiceChip key={city} label={city} icon={getCityIcon(city)} selected={data.city === city} onToggle={() => patch({ city }, "city")} />
                                ))}
                            </div>
                            <Input
                                aria-label="Otra ciudad"
                                placeholder="Otra ciudad"
                                variant="bordered"
                                radius="lg"
                                size="lg"
                                classNames={inputClasses}
                                startContent={<Icon icon="material-symbols:location-on-outline" width={22} className="text-default-500" aria-hidden="true" />}
                                value={CITY_OPTIONS.includes(data.city) ? "" : data.city}
                                onValueChange={(v) => patch({ city: v }, "city")}
                                autoComplete="address-level2"
                                maxLength={120}
                            />
                            <FieldError error={error} field="city" />
                        </div>
                        <div className="grid gap-2">
                            <Input
                                id="contractor-address"
                                label="Dirección"
                                labelPlacement="outside"
                                placeholder="Calle, número y distrito"
                                variant="bordered"
                                radius="lg"
                                size="lg"
                                classNames={inputClasses}
                                startContent={<Icon icon="material-symbols:home-outline" width={22} className="text-default-500" aria-hidden="true" />}
                                value={data.address}
                                onValueChange={(v) => patch({ address: v }, "address")}
                                autoComplete="street-address"
                                maxLength={250}
                                isInvalid={error?.field === "address"}
                            />
                            <FieldError error={error} field="address" />
                        </div>
                    </>
                );
            case "documento":
                return (
                    <>
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">Tipo de documento</legend>
                            <div className="flex flex-wrap gap-2.5">
                                {DOCUMENT_TYPES.map((option) => (
                                    <ChoiceChip key={option.value} label={option.label} icon={option.icon} selected={data.documentType === option.value} onToggle={() => patch({ documentType: option.value })} />
                                ))}
                            </div>
                        </fieldset>
                        <div className="grid gap-2">
                            <Input
                                id="contractor-document-number"
                                label="Número de documento"
                                labelPlacement="outside"
                                placeholder="Ej. 45678912"
                                variant="bordered"
                                radius="lg"
                                size="lg"
                                classNames={inputClasses}
                                startContent={<Icon icon="material-symbols:badge-outline" width={22} className="text-default-500" aria-hidden="true" />}
                                value={data.documentNumber}
                                onValueChange={(v) => patch({ documentNumber: v.replace(/[^0-9A-Za-z]/g, "") }, "documentNumber")}
                                maxLength={20}
                                isInvalid={error?.field === "documentNumber"}
                            />
                            <FieldError error={error} field="documentNumber" />
                        </div>
                        <div className="grid gap-3">
                            <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm text-primary-text">
                                {documentPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={documentPreview} alt="Foto de tu documento" className="max-h-64 w-full object-contain" />
                                ) : data.documentUrl ? (
                                    <span className="inline-flex items-center gap-2 font-semibold">
                                        <Icon icon="material-symbols:check-circle-outline" width={18} aria-hidden="true" /> Documento recibido
                                    </span>
                                ) : (
                                    <span>Coloca el documento dentro del cuadro, sin reflejos</span>
                                )}
                            </div>
                            <div>
                                <Button
                                    id="contractor-document-pick"
                                    type="button"
                                    variant="bordered"
                                    radius="lg"
                                    size="lg"
                                    isLoading={uploading}
                                    startContent={<Icon icon="material-symbols:camera-outline" width={20} aria-hidden="true" />}
                                    onPress={() => documentInput.current?.click()}
                                >
                                    {data.documentUrl ? "Cambiar foto del documento" : "Tomar o elegir foto"}
                                </Button>
                            </div>
                            <input
                                ref={documentInput}
                                type="file"
                                accept="image/*"
                                hidden
                                aria-label="Subir foto del documento"
                                onChange={(e) => {
                                    void handleDocument(e.target.files?.[0]);
                                    e.target.value = "";
                                }}
                            />
                            <FieldError error={error} field="document" />
                        </div>
                    </>
                );
            case "revision": {
                const dash = "—";
                const rows: { label: string; value: string; go: ContractorStepId }[] = [
                    { label: "Nombre", value: [data.fullname.trim(), data.phone.trim()].filter(Boolean).join(" · ") || dash, go: "contacto" },
                    { label: "Dirección", value: [data.city, data.address.trim()].filter(Boolean).join(" · ") || dash, go: "donde" },
                    {
                        label: "Documento",
                        value: data.documentNumber && data.documentUrl ? `${data.documentType} ${data.documentNumber} · foto recibida ✓` : dash,
                        go: "documento",
                    },
                ];
                return (
                    <>
                        <div className="border-t border-default-200">
                            {rows.map((row) => (
                                <div key={row.label} className="flex min-w-0 items-center justify-between gap-3 border-b border-default-200 py-4">
                                    <span className="w-24 shrink-0 text-[13px] text-default-500">{row.label}</span>
                                    <span className="line-clamp-2 min-w-0 flex-1 text-[15px]">{row.value}</span>
                                    <button
                                        type="button"
                                        aria-label={`Cambiar ${row.label.toLowerCase()}`}
                                        className={`${FOCUS_RING} inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-primary-text hover:underline`}
                                        onClick={() => {
                                            setReturnTo("revision");
                                            goTo(row.go);
                                        }}
                                    >
                                        <Icon icon="material-symbols:edit-outline" width={16} aria-hidden="true" />
                                        Cambiar
                                    </button>
                                </div>
                            ))}
                        </div>
                        {error?.field === "review" ? (
                            <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger-text">
                                <Icon icon="material-symbols:error-outline" width={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span>{error.message}</span>
                            </p>
                        ) : null}
                    </>
                );
            }
            case "enviado":
                return (
                    <div className="grid justify-items-center gap-5 text-center">
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success-text motion-safe:animate-appearance-in">
                            <Icon icon="material-symbols:check" width={40} aria-hidden="true" />
                        </span>
                        <div>
                            <h1 ref={headingRef} tabIndex={-1} className="text-[28px] font-bold leading-tight tracking-tight outline-none">
                                Perfil enviado
                            </h1>
                            <p className="mx-auto mt-2.5 max-w-[42ch] text-default-500">Lo revisamos y te avisamos por la app y por correo en cuanto esté aprobado.</p>
                        </div>
                    </div>
                );
        }
    }

    return (
        <div className="min-h-[100dvh] bg-background text-foreground">
            <header className="mx-auto flex max-w-xl items-center px-4 py-4">
                <AppLogo height={30} priority />
            </header>

            <div className="mx-auto max-w-xl px-4 pb-8">
                <form onSubmit={handleSubmit} noValidate aria-label="Crear tu perfil de contratante" className="flex min-h-[calc(100dvh-6rem)] flex-col">
                    <div className="grid gap-2 pb-3">
                        <div className="flex min-h-11 items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                {inFlow && step !== "contacto" ? (
                                    <button type="button" aria-label="Volver al paso anterior" onClick={goBack} className={`${FOCUS_RING} -ml-2.5 flex h-11 w-11 items-center justify-center rounded-full hover:bg-default-100`}>
                                        <Icon icon="material-symbols:chevron-left" width={24} aria-hidden="true" />
                                    </button>
                                ) : null}
                                <span className="inline-flex items-center gap-1.5 text-sm text-default-600" aria-live="polite">
                                    {inFlow && chapter ? <Icon icon={chapter.icon} width={18} className="text-primary-text" aria-hidden="true" /> : null}
                                    {inFlow ? `${chapter?.title} · ${chapterPosition} de ${chapterSteps.length}` : "Enviado"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span role="status" className={`text-[13px] text-success-text transition-opacity motion-reduce:transition-none ${showSaved ? "opacity-100" : "opacity-0"}`}>
                                    {showSaved ? "Guardado ✓" : ""}
                                </span>
                                {inFlow ? <span className="text-[13px] text-default-500">≈ {contractorMinutesLeft(step)} min</span> : null}
                            </div>
                        </div>
                        <ChapterBar step={step} />
                    </div>

                    {chapterNote ? (
                        <p role="status" className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success-text motion-safe:animate-appearance-in">
                            <Icon icon="material-symbols:check-circle-outline" width={18} aria-hidden="true" />
                            {chapterNote}
                        </p>
                    ) : null}

                    <div key={step} className="grid flex-1 content-start gap-6 py-4 motion-safe:animate-appearance-in">
                        {copy ? (
                            <div>
                                <h1 ref={headingRef} tabIndex={-1} className="text-[28px] font-bold leading-tight tracking-tight outline-none">
                                    {copy.title}
                                </h1>
                                <p className="mt-2.5 max-w-[42ch] text-default-500">{copy.lead}</p>
                            </div>
                        ) : null}
                        {renderBody()}
                        {copy?.privacy ? (
                            <p className="flex items-start gap-2 text-sm text-default-500">
                                <Icon icon="material-symbols:lock-outline" width={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span>{copy.privacy}</span>
                            </p>
                        ) : null}
                        {formError ? (
                            <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger-text">
                                <Icon icon="material-symbols:error-outline" width={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span>{formError}</span>
                            </p>
                        ) : null}
                    </div>

                    <div className="sticky bottom-0 -mx-4 border-t border-default-200 bg-background px-4 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] pr-20 pt-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:pr-0">
                        <Button
                            type="submit"
                            color="primary"
                            size="lg"
                            radius="lg"
                            fullWidth
                            className="h-14 text-[17px] font-semibold"
                            isLoading={busy || uploading}
                            endContent={busy || uploading ? null : <Icon icon={step === "revision" ? "material-symbols:send-outline" : "material-symbols:arrow-forward"} width={22} aria-hidden="true" />}
                        >
                            {uploading ? "Subiendo…" : busy && step === "revision" ? "Enviando…" : ctaLabel}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
