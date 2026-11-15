"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader, Textarea, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import AppLogo from "@/components/layout/app-logo";
import ProfilePreview from "@/components/musician/onboarding-preview/profile-preview";
import { isSafePhotoSrc, type PreviewDraft, type PreviewFocus } from "@/components/musician/onboarding-preview/types";
import ChoiceChip from "@/components/ui/choice-chip";
import SignaturePad from "@/components/ui/signature-pad";
import { useAuth } from "@/contexts/auth-context";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ApiError } from "@/lib/api";
import {
    BIO_MIN_LENGTH,
    CHAPTERS,
    CITY_OPTIONS,
    FLOW_STEPS,
    GENRE_OPTIONS,
    GUIDE_STEPS,
    INSTRUMENT_OPTIONS,
    MAX_GENRES,
    OPTIONAL_STEPS,
    STEP_CHAPTER,
    buildBioDraft,
    dataFromProfile,
    emptyGuideData,
    minutesLeft,
    resumeStep,
    totalMinutes,
    validateStep,
    type GuideData,
    type GuideError,
    type GuideField,
    type GuideStepId,
} from "@/lib/onboarding-guide";
import {
    OTHER_GENRE_ICON,
    OTHER_INSTRUMENT_ICON,
    getCityIcon,
    getGenreIcon,
    getGuideInstrumentIcon,
} from "@/lib/onboarding-icons";
import {
    AUDIENCE_OPTIONS,
    DURATION_OPTIONS,
    EVENT_TYPE_OPTIONS,
    EXPERIENCE_OPTIONS,
    FORMAT_OPTIONS,
    GROUP_SIZE_OPTIONS,
    INCLUDE_OPTIONS,
    MAX_OTHER_CITIES,
    NOTICE_OPTIONS,
    PROFILE_KIND_OPTIONS,
    type Option,
    type ProfileDetails,
    SETUP_OPTIONS,
    TRAVEL_FEE_OPTIONS,
    YES_NO_OPTIONS,
    eventLabels,
    profileBadge,
    showRows,
    toggleInList,
    withoutGroupOnly,
} from "@/lib/profile-details";
import { getMusicianProfile, submitMusicianProfile, updateMusicianProfile } from "@/lib/profiles";
import { resolveUploadUrl, uploadFile, uploadSignatureDataUrl } from "@/lib/uploads";

const FOCUS_SELECTORS: Record<GuideField, string> = {
    kind: "#guide-kind button",
    groupSize: "#guide-group-size button",
    name: "#guide-name",
    genres: "#guide-genres button:not([disabled])",
    instruments: "#guide-instruments button",
    city: "#guide-city button",
    price: "#guide-price",
    photo: "#guide-photo-pick",
    bio: "#guide-bio",
    fullname: "#guide-fullname",
    dni: "#guide-dni-pick",
    signature: "#guide-signature canvas",
    review: "[data-guide-change]",
};

/** Parte del perfil público que alimenta cada paso (se resalta en la vista previa). */
const STEP_FOCUS: Partial<Record<GuideStepId, PreviewFocus>> = {
    tipo: "name",
    nombre: "name",
    toca: "specialty",
    eventos: "events",
    donde: "location",
    show: "show",
    reservas: "show",
    foto: "photo",
    bio: "bio",
};

/** Texto que explica qué parte del perfil alimenta el paso. */
const STEP_FEEDS: Partial<Record<GuideStepId, string>> = {
    tipo: "Alimenta la etiqueta de tu perfil",
    nombre: "Alimenta el título de tu perfil",
    toca: "Alimenta Instrumentos y Géneros",
    eventos: "Alimenta «Eventos que anima»",
    donde: "Alimenta tu ubicación y la barra de precio",
    show: "Alimenta «Sobre el show»",
    reservas: "Alimenta «Sobre el show»",
    foto: "Alimenta la portada de tu perfil",
    bio: "Alimenta «Sobre el artista»",
};

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function errorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError && error.message) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function FieldError({ id, error, field }: { id: string; error: GuideError | null; field: GuideField }) {
    const active = error?.field === field;
    return (
        <p id={id} role="alert" className={active ? "flex items-start gap-2 text-sm font-medium text-danger-text" : "hidden"}>
            {active ? (
                <>
                    <Icon icon="material-symbols:error-outline" width={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{error?.message}</span>
                </>
            ) : null}
        </p>
    );
}

/** Progreso por capítulos: cada tramo se llena a medida que se avanza y el capítulo actual se lee a la vista. */
function ChapterBar({ step }: { step: GuideStepId }) {
    const currentId = STEP_CHAPTER[step];
    const done = step === "enviado";
    const currentIndex = done ? CHAPTERS.length : CHAPTERS.findIndex((c) => c.id === currentId);
    return (
        <div className="grid gap-1.5">
            <div
                role="progressbar"
                aria-label="Progreso del perfil"
                aria-valuemin={0}
                aria-valuemax={CHAPTERS.length}
                aria-valuenow={Math.max(0, currentIndex)}
                className="flex gap-1.5"
            >
                {CHAPTERS.map((chapter, index) => {
                    const stepsHere = FLOW_STEPS.filter((s) => STEP_CHAPTER[s] === chapter.id);
                    const position = currentId === chapter.id ? stepsHere.indexOf(step) : 0;
                    const fill = index < currentIndex ? 100 : index === currentIndex ? ((position + 0.4) / stepsHere.length) * 100 : 0;
                    return (
                        <div key={chapter.id} className="h-[5px] flex-1 overflow-hidden rounded-full bg-default-200">
                            <div className="h-full rounded-full bg-primary-text transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${fill}%` }} />
                        </div>
                    );
                })}
            </div>
            <div className="hidden gap-1.5 sm:flex" aria-hidden="true">
                {CHAPTERS.map((chapter, index) => (
                    <span key={chapter.id} className={`flex-1 text-[11px] ${index === currentIndex ? "font-semibold text-primary-text" : index < currentIndex ? "text-default-600" : "text-default-400"}`}>
                        {chapter.title}
                    </span>
                ))}
            </div>
        </div>
    );
}

type SingleDetailKey = "audience" | "duration" | "setup" | "travel_fee" | "notice" | "experience" | "format" | "reduced";
type MultiDetailKey = "event_types" | "includes" | "other_cities";

function Note({ children }: { children: React.ReactNode }) {
    return (
        <p className="flex items-start gap-2 text-sm text-default-500">
            <Icon icon="material-symbols:lock-outline" width={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}

export default function MusicianGuidedOnboarding() {
    const router = useRouter();
    const { user, isLoading: isAuthLoading, refresh } = useAuth();
    const isDesktop = useMediaQuery("(min-width: 1024px)");

    const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [step, setStep] = useState<GuideStepId>("welcome");
    const [data, setData] = useState<GuideData>(emptyGuideData());
    const [returnTo, setReturnTo] = useState<GuideStepId | null>(null);
    const [error, setError] = useState<GuideError | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState<"photo" | "dni" | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [dniPreview, setDniPreview] = useState<string | null>(null);
    const [showSaved, setShowSaved] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [otherGenre, setOtherGenre] = useState("");
    const [otherInstrument, setOtherInstrument] = useState("");
    const [otherCity, setOtherCity] = useState("");
    const [chapterNote, setChapterNote] = useState<string | null>(null);
    const [showHour, setShowHour] = useState(false);
    const [announce, setAnnounce] = useState("");
    // El campo que se está editando manda sobre el paso: la vista previa resalta lo que tocas.
    const [fieldFocus, setFieldFocus] = useState<PreviewFocus>(null);

    const headingRef = useRef<HTMLHeadingElement>(null);
    const photoInput = useRef<HTMLInputElement>(null);
    const dniInput = useRef<HTMLInputElement>(null);
    const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async () => {
        if (isAuthLoading) return;
        if (!user) {
            router.replace("/login?redirect=/musician/onboarding");
            return;
        }
        if (user.role !== "musician") {
            router.replace(user.role === "admin" ? "/admin" : "/contractor/bookings");
            return;
        }
        setPhase("loading");
        setLoadError(null);
        try {
            const profile = await getMusicianProfile();
            if (
                profile.status === "published" ||
                profile.status === "pending_review" ||
                profile.status === "rejected" ||
                profile.is_ensemble_only
            ) {
                router.replace("/musician");
                return;
            }
            const initial = dataFromProfile(profile, user.fullname);
            setData(initial);
            setShowHour(Boolean(initial.priceHour));
            setStep(resumeStep(initial));
            setPhase("ready");
        } catch (err) {
            setLoadError(
                errorMessage(err, "No pudimos cargar tu perfil. Revisa tu conexión e inténtalo de nuevo."),
            );
            setPhase("error");
        }
    }, [isAuthLoading, router, user]);

    useEffect(() => {
        void Promise.resolve().then(() => load());
    }, [load]);

    // El foco va al título del paso (o al primer campo del primer paso): así lo anuncian los lectores de pantalla.
    useEffect(() => {
        if (phase !== "ready") return;
        window.scrollTo({ top: 0 });
        if (step === "nombre") return;
        headingRef.current?.focus({ preventScroll: true });
    }, [step, phase]);

    useEffect(() => {
        if (!showSaved) return;
        savedTimer.current = setTimeout(() => setShowSaved(false), 1800);
        return () => {
            if (savedTimer.current) clearTimeout(savedTimer.current);
        };
    }, [showSaved]);

    useEffect(() => {
        return () => {
            if (noteTimer.current) clearTimeout(noteTimer.current);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (photoPreview) URL.revokeObjectURL(photoPreview);
        };
    }, [photoPreview]);
    useEffect(() => {
        return () => {
            if (dniPreview) URL.revokeObjectURL(dniPreview);
        };
    }, [dniPreview]);

    function patch(partial: Partial<GuideData>, clear?: GuideField) {
        setData((current) => ({ ...current, ...partial }));
        setFormError(null);
        if (clear && error?.field === clear) setError(null);
    }

    function showError(next: GuideError) {
        setError(next);
        requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(FOCUS_SELECTORS[next.field]);
            el?.focus();
        });
    }

    function goTo(next: GuideStepId) {
        setError(null);
        setFormError(null);
        setFieldFocus(null);
        // Al terminar un capítulo se reconoce el avance. Solo hacia adelante y fuera de «Cambiar» desde la revisión.
        const from = STEP_CHAPTER[step];
        const to = STEP_CHAPTER[next];
        const forward = FLOW_STEPS.indexOf(next) > FLOW_STEPS.indexOf(step);
        if (noteTimer.current) clearTimeout(noteTimer.current);
        if (!returnTo && forward && from && to && from !== to) {
            const done = CHAPTERS.find((c) => c.id === from)?.title;
            const upcoming = CHAPTERS.find((c) => c.id === to)?.title;
            setChapterNote(`${done} listo. Sigue: ${upcoming}.`);
            noteTimer.current = setTimeout(() => setChapterNote(null), 3500);
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
        goTo(GUIDE_STEPS[GUIDE_STEPS.indexOf(step) + 1]);
    }

    function goBack() {
        if (returnTo) {
            const target = returnTo;
            setReturnTo(null);
            goTo(target);
            return;
        }
        const index = GUIDE_STEPS.indexOf(step);
        if (index > 0) goTo(GUIDE_STEPS[index - 1]);
    }

    async function persist(current: GuideStepId) {
        switch (current) {
            case "tipo":
                await updateMusicianProfile({
                    profile_type: data.profileType ?? "solo",
                    group_size: data.profileType === "group" ? data.groupSize : null,
                    details: data.details,
                });
                break;
            case "nombre":
                await updateMusicianProfile({ stage_name: data.name.trim() });
                break;
            case "toca":
                await updateMusicianProfile({ genres: data.genres, instruments: data.instruments, details: data.details });
                break;
            case "eventos":
            case "show":
            case "reservas":
                await updateMusicianProfile({ details: data.details });
                break;
            case "donde":
                await updateMusicianProfile({
                    location_city: data.city.trim(),
                    price_per_event: Number(data.price),
                    price_per_hour: data.priceHour ? Number(data.priceHour) : null,
                });
                break;
            case "foto":
                await updateMusicianProfile({ profile_image_url: data.photoUrl });
                break;
            case "bio":
                await updateMusicianProfile({ bio: data.bio.trim(), details: data.details });
                break;
            case "dni":
                await updateMusicianProfile({ fullname: data.fullname.trim(), id_document_url: data.dniUrl });
                break;
            case "firma":
                if (data.signatureDataUrl) {
                    const url = await uploadSignatureDataUrl(data.signatureDataUrl);
                    await updateMusicianProfile({ signature_image_url: url });
                    setData((currentData) => ({ ...currentData, signatureUrl: url, signatureDataUrl: null }));
                }
                break;
            default:
                break;
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (busy || uploading) return;
        if (step === "welcome") {
            goTo("tipo");
            return;
        }
        if (step === "enviado") {
            router.replace("/musician");
            return;
        }
        const problem = validateStep(step, data);
        if (problem) {
            showError(problem);
            return;
        }
        setError(null);
        setFormError(null);
        setBusy(true);
        try {
            if (step === "revision") {
                await submitMusicianProfile();
                await refresh();
                goTo("enviado");
            } else {
                await persist(step);
                setShowSaved(true);
                advance();
            }
        } catch (err) {
            const message = errorMessage(err, "No pudimos guardar. Inténtalo de nuevo.");
            if (step === "nombre") {
                showError({ field: "name", message });
            } else if (step === "revision") {
                showError({ field: "review", message });
            } else {
                setFormError(message);
            }
            addToast({ title: "No se pudo guardar", description: message, color: "danger" });
        } finally {
            setBusy(false);
        }
    }

    async function handleFile(kind: "photo" | "dni", file: File | undefined) {
        if (!file) return;
        setUploading(kind);
        setError(null);
        setFormError(null);
        try {
            const url = await uploadFile(file, { private: kind === "dni" });
            const preview = URL.createObjectURL(file);
            if (kind === "photo") {
                setPhotoPreview(preview);
                patch({ photoUrl: url }, "photo");
            } else {
                setDniPreview(preview);
                patch({ dniUrl: url }, "dni");
            }
        } catch (err) {
            const message = errorMessage(err, "No pudimos subir el archivo. Inténtalo de nuevo.");
            showError({ field: kind === "photo" ? "photo" : "dni", message });
        } finally {
            setUploading(null);
        }
    }

    // Actualizador funcional: dos toques seguidos no pisan el estado del anterior.
    function toggle(list: "genres" | "instruments", value: string) {
        setData((current) => {
            const items = current[list];
            if (items.includes(value)) return { ...current, [list]: items.filter((item) => item !== value) };
            if (list === "genres" && items.length >= MAX_GENRES) return current;
            return { ...current, [list]: [...items, value] };
        });
        setFormError(null);
        if (error?.field === list) setError(null);
    }

    function chooseKind(value: "solo" | "group") {
        setData((current) => ({
            ...current,
            profileType: value,
            groupSize: value === "group" ? current.groupSize : null,
            details: value === "solo" ? withoutGroupOnly(current.details) : current.details,
        }));
        setFormError(null);
        if (error?.field === "kind") setError(null);
    }

    function setDetails(update: (current: ProfileDetails) => ProfileDetails) {
        setData((current) => ({ ...current, details: update(current.details) }));
        setFormError(null);
    }

    function toggleSingle(key: SingleDetailKey, value: string) {
        setDetails((current) => {
            const next = { ...current };
            if (next[key] === value) delete next[key];
            else next[key] = value;
            return next;
        });
    }

    function toggleMulti(key: MultiDetailKey, value: string) {
        setDetails((current) => {
            const list = toggleInList(current[key], value);
            const next = { ...current };
            if (list) next[key] = list;
            else delete next[key];
            return next;
        });
    }

    function addOtherCity() {
        const raw = otherCity.trim();
        if (raw.length < 2) return;
        const value = raw.charAt(0).toUpperCase() + raw.slice(1);
        setDetails((current) => {
            const list = current.other_cities ?? [];
            if (list.includes(value) || list.length >= MAX_OTHER_CITIES) return current;
            return { ...current, other_cities: [...list, value] };
        });
        setOtherCity("");
    }

    function addOther(list: "genres" | "instruments") {
        const raw = (list === "genres" ? otherGenre : otherInstrument).trim();
        if (!raw) return;
        const value = raw.charAt(0).toUpperCase() + raw.slice(1);
        if (list === "genres" && data.genres.length >= MAX_GENRES && !data.genres.includes(value)) return;
        setData((current) => {
            const items = current[list];
            return items.includes(value) ? current : { ...current, [list]: [...items, value] };
        });
        if (list === "genres") setOtherGenre("");
        else setOtherInstrument("");
        setAnnounce(`${value} agregado`);
        if (error?.field === list) setError(null);
    }

    const flowIndex = FLOW_STEPS.indexOf(step) + 1; // 0 si no es un paso numerado
    const inFlow = flowIndex > 0;
    const chapterId = STEP_CHAPTER[step];
    const chapter = CHAPTERS.find((c) => c.id === chapterId);
    const chapterSteps = FLOW_STEPS.filter((s) => STEP_CHAPTER[s] === chapterId);
    const chapterPosition = chapterSteps.indexOf(step) + 1;
    const isOptional = OPTIONAL_STEPS.includes(step);
    const photoSrc = photoPreview || resolveUploadUrl(data.photoUrl);
    const genresFull = data.genres.length >= MAX_GENRES;
    const previewFocus = fieldFocus ?? STEP_FOCUS[step] ?? null;
    const previewDraft = useMemo<PreviewDraft>(
        () => ({
            profileType: data.profileType ?? "solo",
            groupSize: data.groupSize ?? "",
            details: data.details,
            name: data.name,
            city: data.city,
            price: data.price,
            genres: data.genres,
            instruments: data.instruments,
            bio: data.bio,
            photo: photoSrc && isSafePhotoSrc(photoSrc) ? photoSrc : null,
        }),
        [data.profileType, data.groupSize, data.details, data.name, data.city, data.price, data.genres, data.instruments, data.bio, photoSrc],
    );
    const ctaLabel =
        step === "welcome"
            ? "Empezar"
            : step === "revision"
              ? "Enviar a revisión"
              : step === "enviado"
                ? "Ir a mi panel"
                : returnTo
                  ? "Guardar y volver"
                  : "Continuar";
    const ctaIcon = step === "revision" ? "material-symbols:send-outline" : "material-symbols:arrow-forward";

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

    function renderStep() {
        const title = (text: string, lead?: string) => (
            <div>
                {OPTIONAL_STEPS.includes(step) ? (
                    <span className="mb-2 inline-flex rounded-full bg-default-100 px-2.5 py-0.5 text-xs font-medium text-default-600">
                        Opcional · puedes omitirlo
                    </span>
                ) : null}
                <h1 ref={headingRef} tabIndex={-1} className="text-[28px] font-bold leading-tight tracking-tight outline-none">
                    {text}
                </h1>
                {lead ? <p className="mt-2.5 max-w-[42ch] text-default-500">{lead}</p> : null}
                {/* Texto informativo: sin fondo ni borde para que no parezca un botón. */}
                {STEP_FEEDS[step] ? (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-primary-text">
                        <Icon icon="material-symbols:visibility-outline" width={16} aria-hidden="true" />
                        {STEP_FEEDS[step]}
                    </p>
                ) : null}
            </div>
        );
        const inputClasses = { inputWrapper: "min-h-14", input: "text-[17px]" };
        const singleChips = (key: SingleDetailKey, options: Option[]) =>
            options.map((option) => (
                <ChoiceChip key={option.value} label={option.label} icon={option.icon} selected={data.details[key] === option.value} onToggle={() => toggleSingle(key, option.value)} />
            ));
        const multiChips = (key: MultiDetailKey, options: Option[]) =>
            options.map((option) => (
                <ChoiceChip key={option.value} label={option.label} icon={option.icon} selected={(data.details[key] ?? []).includes(option.value)} onToggle={() => toggleMulti(key, option.value)} />
            ));
        const genreOptions = [...GENRE_OPTIONS, ...data.genres.filter((g) => !GENRE_OPTIONS.includes(g))];
        const instrumentOptions = [...INSTRUMENT_OPTIONS, ...data.instruments.filter((i) => !INSTRUMENT_OPTIONS.includes(i))];

        switch (step) {
            case "welcome":
                return (
                    <>
                        {title(
                            "Armemos tu perfil",
                            `${FLOW_STEPS.length} pasos cortos, unos ${totalMinutes()} minutos. ${OPTIONAL_STEPS.length} son opcionales. Se guarda solo: puedes salir y seguir cuando quieras.`,
                        )}
                        <Note>Tus datos privados, como tu documento, los ve solo el equipo de Chivapp.</Note>
                    </>
                );
            case "tipo":
                return (
                    <>
                        {title("¿Cómo trabajas?", "Así armamos tu perfil con lo que realmente te sirve. Puedes cambiarlo después.")}
                        <div id="guide-kind" role="radiogroup" aria-label="Cómo trabajas" className="grid gap-3">
                            {PROFILE_KIND_OPTIONS.map((option) => {
                                const on = data.profileType === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={on}
                                        onClick={() => chooseKind(option.value)}
                                        className={`${FOCUS_RING} flex min-h-24 items-start gap-4 rounded-2xl border-2 p-4 text-left transition active:scale-[0.98] motion-reduce:transition-none ${
                                            on ? "border-primary-text bg-primary/10" : "border-default-200 bg-content1 hover:border-primary-text"
                                        }`}
                                    >
                                        <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${on ? "bg-primary-text text-background" : "bg-default-100"}`}>
                                            <Icon icon={option.icon} width={26} aria-hidden="true" />
                                        </span>
                                        <span className="grid gap-0.5">
                                            <span className="text-lg font-semibold">{option.title}</span>
                                            <span className="text-default-600">{option.description}</span>
                                            <span className="text-sm text-default-500">{option.note}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <FieldError id="err-kind" error={error} field="kind" />
                        {data.profileType === "group" ? (
                            <div className="grid gap-3 motion-safe:animate-appearance-in" role="group" aria-labelledby="lbl-group-size">
                                <span id="lbl-group-size" className="text-[15px] font-semibold">
                                    ¿Cuántas personas son?
                                </span>
                                <div id="guide-group-size" className="flex flex-wrap gap-2.5">
                                    {GROUP_SIZE_OPTIONS.map((option) => (
                                        <ChoiceChip
                                            key={option.value}
                                            label={option.label}
                                            icon={option.icon}
                                            selected={data.groupSize === option.value}
                                            onToggle={() => patch({ groupSize: option.value }, "groupSize")}
                                        />
                                    ))}
                                </div>
                                <FieldError id="err-group-size" error={error} field="groupSize" />
                            </div>
                        ) : null}
                    </>
                );
            case "nombre":
                return (
                    <>
                        {title("¿Cómo te conocen?", "Es lo primero que verá un cliente. Usa tu nombre artístico o el de tu grupo.")}
                        <div className="grid gap-2">
                            <Input
                                id="guide-name"
                                label={data.profileType === "group" ? "Nombre del grupo" : "Nombre artístico"}
                                labelPlacement="outside"
                                placeholder={data.profileType === "group" ? "Ej. Grupo Aurora" : "Ej. Carlos Rivera"}
                                variant="bordered"
                                radius="lg"
                                size="lg"
                                classNames={inputClasses}
                                startContent={<Icon icon={data.profileType === "group" ? "mdi:account-group-outline" : "mdi:account-music-outline"} width={22} className="text-default-500" aria-hidden="true" />}
                                value={data.name}
                                onValueChange={(value) => patch({ name: value }, "name")}
                                autoComplete="nickname"
                                enterKeyHint="next"
                                maxLength={60}
                                autoFocus
                                isInvalid={error?.field === "name"}
                                aria-describedby="err-name"
                            />
                            <FieldError id="err-name" error={error} field="name" />
                        </div>
                    </>
                );
            case "toca":
                return (
                    <>
                        {title("¿Qué tocas?", "Así te encuentran cuando buscan por género o instrumento.")}
                        <div className="grid gap-3" role="group" aria-labelledby="lbl-genres">
                            <span id="lbl-genres" className="text-[15px] font-semibold">
                                Géneros <span className="font-normal text-default-500">({data.genres.length} de {MAX_GENRES})</span>
                            </span>
                            <div id="guide-genres" className="flex flex-wrap gap-2.5">
                                {genreOptions.map((genre) => (
                                    <ChoiceChip
                                        key={genre}
                                        label={genre}
                                        icon={getGenreIcon(genre)}
                                        selected={data.genres.includes(genre)}
                                        disabled={genresFull && !data.genres.includes(genre)}
                                        onToggle={() => toggle("genres", genre)}
                                    />
                                ))}
                            </div>
                            {genresFull ? (
                                <p role="status" className="flex items-start gap-2 text-sm text-default-500">
                                    <Icon icon="material-symbols:info-outline" width={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    Llegaste al máximo de {MAX_GENRES} géneros. Quita uno para elegir otro.
                                </p>
                            ) : null}
                            <div className="flex gap-2">
                                <Input
                                    aria-label="Agregar otro género"
                                    placeholder="Otro género"
                                    variant="bordered"
                                    radius="lg"
                                    startContent={<Icon icon={OTHER_GENRE_ICON} width={20} className="text-default-500" aria-hidden="true" />}
                                    value={otherGenre}
                                    onValueChange={setOtherGenre}
                                    isDisabled={genresFull}
                                    enterKeyHint="done"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addOther("genres");
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="bordered"
                                    radius="lg"
                                    className="h-12 shrink-0"
                                    isDisabled={!otherGenre.trim() || genresFull}
                                    startContent={<Icon icon="material-symbols:add" width={20} aria-hidden="true" />}
                                    onPress={() => addOther("genres")}
                                >
                                    Agregar
                                </Button>
                            </div>
                            <FieldError id="err-genres" error={error} field="genres" />
                        </div>
                        <div className="grid gap-3" role="group" aria-labelledby="lbl-instruments">
                            <span id="lbl-instruments" className="text-[15px] font-semibold">
                                Instrumentos
                            </span>
                            <div id="guide-instruments" className="flex flex-wrap gap-2.5">
                                {instrumentOptions.map((instrument) => (
                                    <ChoiceChip
                                        key={instrument}
                                        label={instrument}
                                        icon={getGuideInstrumentIcon(instrument)}
                                        selected={data.instruments.includes(instrument)}
                                        onToggle={() => toggle("instruments", instrument)}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    aria-label="Agregar otro instrumento"
                                    placeholder="Otro instrumento"
                                    variant="bordered"
                                    radius="lg"
                                    startContent={<Icon icon={OTHER_INSTRUMENT_ICON} width={20} className="text-default-500" aria-hidden="true" />}
                                    value={otherInstrument}
                                    onValueChange={setOtherInstrument}
                                    enterKeyHint="done"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addOther("instruments");
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="bordered"
                                    radius="lg"
                                    className="h-12 shrink-0"
                                    isDisabled={!otherInstrument.trim()}
                                    startContent={<Icon icon="material-symbols:add" width={20} aria-hidden="true" />}
                                    onPress={() => addOther("instruments")}
                                >
                                    Agregar
                                </Button>
                            </div>
                            <FieldError id="err-instruments" error={error} field="instruments" />
                        </div>
                        {data.profileType === "group" ? (
                            <fieldset className="grid gap-3">
                                <legend className="text-[15px] font-semibold">
                                    ¿Cómo suena tu grupo? <span className="font-normal text-default-500">(opcional)</span>
                                </legend>
                                <div className="flex flex-wrap gap-2.5">{singleChips("format", FORMAT_OPTIONS)}</div>
                            </fieldset>
                        ) : null}
                    </>
                );
            case "eventos":
                return (
                    <>
                        {title("¿Qué eventos animas?", "Elige los que más haces. Un cliente que busca una boda te encuentra más rápido.")}
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">
                                Tipos de evento <span className="font-normal text-default-500">(puedes elegir varios)</span>
                            </legend>
                            <div className="flex flex-wrap gap-2.5">{multiChips("event_types", EVENT_TYPE_OPTIONS)}</div>
                        </fieldset>
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">¿Con cuántos invitados sueles trabajar?</legend>
                            <div className="flex flex-wrap gap-2.5">{singleChips("audience", AUDIENCE_OPTIONS)}</div>
                        </fieldset>
                    </>
                );
            case "show":
                return (
                    <>
                        {title("Cuéntanos de tu show", "Lo que dejes claro aquí es lo que el cliente ya no te tendrá que preguntar.")}
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">Duración habitual de tu show</legend>
                            <div className="flex flex-wrap gap-2.5">{singleChips("duration", DURATION_OPTIONS)}</div>
                        </fieldset>
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">
                                ¿Qué incluye tu tarifa? <span className="font-normal text-default-500">(puedes elegir varios)</span>
                            </legend>
                            <p className="-mt-1 text-sm text-default-500">El cliente lo ve antes de contratar y te hace menos preguntas.</p>
                            <div className="flex flex-wrap gap-2.5">{multiChips("includes", INCLUDE_OPTIONS)}</div>
                        </fieldset>
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">Tiempo que necesitas para montar</legend>
                            <div className="flex flex-wrap gap-2.5">{singleChips("setup", SETUP_OPTIONS)}</div>
                        </fieldset>
                        {data.profileType === "group" ? (
                            <fieldset className="grid gap-3">
                                <legend className="text-[15px] font-semibold">¿Pueden tocar con menos integrantes?</legend>
                                <div className="flex flex-wrap gap-2.5">{singleChips("reduced", YES_NO_OPTIONS)}</div>
                            </fieldset>
                        ) : null}
                    </>
                );
            case "reservas": {
                const cityChips: Option[] = [
                    ...CITY_OPTIONS.filter((city) => city !== data.city).map((city) => ({ value: city, label: city, icon: getCityIcon(city) })),
                    ...(data.details.other_cities ?? [])
                        .filter((city) => !CITY_OPTIONS.includes(city))
                        .map((city) => ({ value: city, label: city, icon: getCityIcon(city) })),
                ];
                const citiesFull = (data.details.other_cities?.length ?? 0) >= MAX_OTHER_CITIES;
                return (
                    <>
                        {title("Cómo recibes reservas", "Para que solo te lleguen solicitudes que puedes atender.")}
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">
                                Otras ciudades donde te presentas <span className="font-normal text-default-500">(puedes elegir varias)</span>
                            </legend>
                            <div className="flex flex-wrap gap-2.5">{multiChips("other_cities", cityChips)}</div>
                            <div className="flex gap-2">
                                <Input
                                    aria-label="Agregar otra ciudad"
                                    placeholder="Otra ciudad"
                                    variant="bordered"
                                    radius="lg"
                                    startContent={<Icon icon="material-symbols:location-on-outline" width={20} className="text-default-500" aria-hidden="true" />}
                                    value={otherCity}
                                    onValueChange={setOtherCity}
                                    isDisabled={citiesFull}
                                    maxLength={60}
                                    enterKeyHint="done"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addOtherCity();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="bordered"
                                    radius="lg"
                                    className="h-12 shrink-0"
                                    isDisabled={otherCity.trim().length < 2 || citiesFull}
                                    startContent={<Icon icon="material-symbols:add" width={20} aria-hidden="true" />}
                                    onPress={addOtherCity}
                                >
                                    Agregar
                                </Button>
                            </div>
                        </fieldset>
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">¿Cobras viáticos fuera de tu ciudad?</legend>
                            <div className="flex flex-wrap gap-2.5">{singleChips("travel_fee", TRAVEL_FEE_OPTIONS)}</div>
                        </fieldset>
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">Antelación mínima para reservar</legend>
                            <div className="flex flex-wrap gap-2.5">{singleChips("notice", NOTICE_OPTIONS)}</div>
                        </fieldset>
                    </>
                );
            }
            case "donde":
                return (
                    <>
                        {title("¿Dónde trabajas y cuánto cobras?", "Con tu ciudad y tu tarifa apareces en las búsquedas.")}
                        <div className="grid gap-3" role="group" aria-labelledby="lbl-city">
                            <span id="lbl-city" className="text-[15px] font-semibold">
                                Ciudad
                            </span>
                            <div id="guide-city" className="flex flex-wrap gap-2.5">
                                {CITY_OPTIONS.map((city) => (
                                    <ChoiceChip
                                        key={city}
                                        label={city}
                                        icon={getCityIcon(city)}
                                        selected={data.city === city}
                                        onToggle={() => {
                                            setFieldFocus("location");
                                            patch({ city }, "city");
                                        }}
                                    />
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
                                onValueChange={(value) => patch({ city: value }, "city")}
                                onFocus={() => setFieldFocus("location")}
                                autoComplete="address-level2"
                            />
                            <FieldError id="err-city" error={error} field="city" />
                        </div>
                        <div className="grid gap-2">
                            <Input
                                id="guide-price"
                                label="Tarifa por evento"
                                labelPlacement="outside"
                                placeholder="300"
                                variant="bordered"
                                radius="lg"
                                size="lg"
                                classNames={inputClasses}
                                startContent={<span className="font-semibold text-default-500">S/</span>}
                                inputMode="numeric"
                                enterKeyHint="done"
                                maxLength={6}
                                value={data.price}
                                onValueChange={(value) => patch({ price: value.replace(/[^0-9]/g, "") }, "price")}
                                onFocus={() => setFieldFocus("price")}
                                onBlur={() => setFieldFocus(null)}
                                isInvalid={error?.field === "price"}
                                aria-describedby="err-price"
                            />
                            <FieldError id="err-price" error={error} field="price" />
                            <Note>Tú recibes esta tarifa completa. La comisión de Chivapp la paga quien te contrata.</Note>
                        </div>
                        {showHour ? (
                            <Input
                                id="guide-price-hour"
                                label="Tarifa por hora (opcional)"
                                labelPlacement="outside"
                                placeholder="120"
                                variant="bordered"
                                radius="lg"
                                size="lg"
                                classNames={inputClasses}
                                startContent={<span className="font-semibold text-default-500">S/</span>}
                                inputMode="numeric"
                                maxLength={6}
                                value={data.priceHour}
                                onValueChange={(value) => patch({ priceHour: value.replace(/[^0-9]/g, "") })}
                            />
                        ) : (
                            <div>
                                <Button
                                    type="button"
                                    variant="light"
                                    radius="lg"
                                    className="min-h-11 px-2 text-primary-text"
                                    startContent={<Icon icon="material-symbols:add-circle-outline" width={20} aria-hidden="true" />}
                                    onPress={() => setShowHour(true)}
                                >
                                    Agregar también una tarifa por hora
                                </Button>
                            </div>
                        )}
                    </>
                );
            case "foto":
                return (
                    <>
                        {title("Ponle cara a tu perfil", "Una foto clara genera confianza desde el primer vistazo.")}
                        <div className="grid justify-items-center gap-5">
                            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-default-200 bg-default-100 text-default-400">
                                {photoSrc ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={photoSrc} alt="Tu foto de perfil" className="h-full w-full object-cover" />
                                ) : (
                                    <Icon icon="material-symbols:camera-outline" width={40} aria-hidden="true" />
                                )}
                            </div>
                            <div className="flex flex-wrap justify-center gap-2.5">
                                <Button id="guide-photo-pick" type="button" variant="bordered" radius="lg" size="lg" isLoading={uploading === "photo"} startContent={<Icon icon="material-symbols:camera-outline" width={20} aria-hidden="true" />} onPress={() => photoInput.current?.click()}>
                                    {photoSrc ? "Cambiar foto" : "Tomar o elegir foto"}
                                </Button>
                            </div>
                            <input
                                ref={photoInput}
                                type="file"
                                accept="image/*"
                                hidden
                                aria-label="Subir foto de perfil"
                                onChange={(e) => {
                                    void handleFile("photo", e.target.files?.[0]);
                                    e.target.value = "";
                                }}
                            />
                            <FieldError id="err-photo" error={error} field="photo" />
                        </div>
                    </>
                );
            case "bio": {
                const bioLength = data.bio.trim().length;
                return (
                    <>
                        {title("Cuéntanos de ti", "Tres frases bastan: quién eres, qué tocas y qué eventos animas.")}
                        <fieldset className="grid gap-3">
                            <legend className="text-[15px] font-semibold">
                                Años de experiencia <span className="font-normal text-default-500">(opcional)</span>
                            </legend>
                            <div className="flex flex-wrap gap-2.5">{singleChips("experience", EXPERIENCE_OPTIONS)}</div>
                        </fieldset>
                        <div className="grid gap-3">
                            <div>
                                <Button
                                    type="button"
                                    variant="bordered"
                                    radius="lg"
                                    startContent={<Icon icon="material-symbols:auto-awesome-outline" width={20} aria-hidden="true" />}
                                    onPress={() => patch({ bio: buildBioDraft(data) }, "bio")}
                                >
                                    Usar un borrador con mis datos
                                </Button>
                            </div>
                            <Textarea
                                id="guide-bio"
                                label="Tu biografía"
                                labelPlacement="outside"
                                placeholder="Cuéntales quién eres y qué te gusta de animar un evento."
                                variant="bordered"
                                radius="lg"
                                minRows={5}
                                maxLength={400}
                                classNames={{ input: "text-[17px]" }}
                                value={data.bio}
                                onValueChange={(value) => patch({ bio: value }, "bio")}
                                isInvalid={error?.field === "bio"}
                                aria-describedby="err-bio"
                            />
                            <p className={`flex items-center gap-1.5 text-sm tabular-nums ${bioLength >= BIO_MIN_LENGTH ? "text-success-text" : "text-default-500"}`}>
                                <Icon icon={bioLength >= BIO_MIN_LENGTH ? "material-symbols:check" : "material-symbols:edit-outline"} width={16} aria-hidden="true" />
                                {bioLength >= BIO_MIN_LENGTH ? "Suficiente" : `${bioLength} de ${BIO_MIN_LENGTH} caracteres como mínimo`}
                            </p>
                            <FieldError id="err-bio" error={error} field="bio" />
                        </div>
                    </>
                );
            }
            case "dni":
                return (
                    <>
                        {title("Confirma que eres tú", "Sube una foto de tu DNI, carné de extranjería o pasaporte.")}
                        <div className="grid gap-2">
                            <Input
                                id="guide-fullname"
                                label="Nombre completo"
                                labelPlacement="outside"
                                placeholder="Como aparece en tu documento"
                                variant="bordered"
                                radius="lg"
                                size="lg"
                                classNames={inputClasses}
                                startContent={<Icon icon="material-symbols:person-outline" width={22} className="text-default-500" aria-hidden="true" />}
                                value={data.fullname}
                                onValueChange={(value) => patch({ fullname: value }, "fullname")}
                                autoComplete="name"
                                enterKeyHint="done"
                                isInvalid={error?.field === "fullname"}
                                aria-describedby="err-fullname"
                            />
                            <FieldError id="err-fullname" error={error} field="fullname" />
                        </div>
                        <div className="grid gap-3">
                            <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm text-primary-text">
                                {dniPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={dniPreview} alt="Foto de tu documento" className="max-h-64 w-full object-contain" />
                                ) : data.dniUrl ? (
                                    <span className="inline-flex items-center gap-2 font-semibold">
                                        <Icon icon="material-symbols:check-circle-outline" width={18} aria-hidden="true" /> Documento recibido
                                    </span>
                                ) : (
                                    <span>Coloca el documento dentro del cuadro, sin reflejos</span>
                                )}
                            </div>
                            <div>
                                <Button id="guide-dni-pick" type="button" variant="bordered" radius="lg" size="lg" isLoading={uploading === "dni"} startContent={<Icon icon="material-symbols:camera-outline" width={20} aria-hidden="true" />} onPress={() => dniInput.current?.click()}>
                                    {data.dniUrl ? "Cambiar foto del documento" : "Tomar o elegir foto"}
                                </Button>
                            </div>
                            <input
                                ref={dniInput}
                                type="file"
                                accept="image/*"
                                hidden
                                aria-label="Subir foto del documento"
                                onChange={(e) => {
                                    void handleFile("dni", e.target.files?.[0]);
                                    e.target.value = "";
                                }}
                            />
                            <FieldError id="err-dni" error={error} field="dni" />
                            <Note>Solo la ve el equipo de Chivapp para validar tu identidad. Nunca aparece en tu perfil.</Note>
                        </div>
                    </>
                );
            case "firma":
                return (
                    <>
                        {title("Tu firma para los contratos", "La haces una vez y se usa en cada contrato. Nosotros ya preparamos el contrato.")}
                        <div id="guide-signature" className="grid gap-3">
                            {data.signatureUrl && !data.signatureDataUrl ? (
                                <p className="inline-flex items-center gap-2 text-sm font-semibold text-success-text">
                                    <Icon icon="material-symbols:check-circle-outline" width={18} aria-hidden="true" /> Ya tienes una firma guardada. Dibuja otra solo si quieres cambiarla.
                                </p>
                            ) : null}
                            <SignaturePad
                                value={data.signatureDataUrl}
                                onChange={(dataUrl) => patch({ signatureDataUrl: dataUrl }, "signature")}
                                label="Tu firma"
                                helperText="Dibújala con el dedo o el mouse, o escribe tu nombre como firma."
                                isInvalid={error?.field === "signature"}
                            />
                            <FieldError id="err-signature" error={error} field="signature" />
                        </div>
                        <details className="text-sm text-default-500">
                            <summary className={`${FOCUS_RING} min-h-11 cursor-pointer text-primary-text underline underline-offset-4`}>Ver un resumen del contrato</summary>
                            <div className="grid max-w-[46ch] gap-2 pb-2">
                                <p>1. Objeto: el artista presta servicios musicales en la fecha, hora y lugar acordados.</p>
                                <p>2. Tarifa: la acordada con el contratante; el pago queda resguardado hasta el evento.</p>
                                <p>3. Cancelación: reembolso según la anticipación de la cancelación.</p>
                                <p>Podrás personalizarlo después desde tu perfil.</p>
                            </div>
                        </details>
                    </>
                );
            case "revision": {
                const SIN_COMPLETAR = "Sin completar";
                const events = eventLabels(data.details).join(", ");
                const showText = showRows(data.details, data.profileType ?? "solo")
                    .filter((row) => ["duration", "includes", "setup", "format", "reduced"].includes(row.key))
                    .map((row) => (row.key === "includes" ? `incluye ${row.value.toLowerCase()}` : row.value))
                    .join(" · ");
                const bookingText = showRows(data.details, data.profileType ?? "solo")
                    .filter((row) => ["notice", "cities", "travel"].includes(row.key))
                    .map((row) => row.value)
                    .join(" · ");
                const rows: { label: string; value: React.ReactNode; go: GuideStepId; optional?: boolean }[] = [
                    {
                        label: "Cómo trabajas",
                        value: data.profileType ? profileBadge(data.profileType, data.groupSize) : "—",
                        go: "tipo",
                    },
                    { label: "Nombre", value: data.name.trim() || "—", go: "nombre" },
                    { label: "Toca", value: `${data.genres.join(", ")} · ${data.instruments.join(", ")}`, go: "toca" },
                    { label: "Eventos", value: events || SIN_COMPLETAR, go: "eventos", optional: true },
                    { label: "Ciudad", value: `${data.city || "—"} · S/ ${data.price || "—"} por evento`, go: "donde" },
                    { label: "Tu show", value: showText || SIN_COMPLETAR, go: "show", optional: true },
                    { label: "Reservas", value: bookingText || SIN_COMPLETAR, go: "reservas", optional: true },
                    {
                        label: "Foto",
                        value: photoSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={photoSrc} alt="Tu foto" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                            "—"
                        ),
                        go: "foto",
                    },
                    { label: "Biografía", value: data.bio.trim() || "—", go: "bio" },
                    { label: "Documento", value: data.dniUrl ? <span className="font-semibold text-success-text">Recibido ✓</span> : "—", go: "dni" },
                    { label: "Firma", value: data.signatureDataUrl || data.signatureUrl ? <span className="font-semibold text-success-text">Lista ✓</span> : "—", go: "firma" },
                ];
                const skipped = rows.filter((row) => row.optional && row.value === SIN_COMPLETAR).length;
                return (
                    <>
                        {title("Revisa y envía", "Un integrante del equipo revisa tu perfil. Te avisamos en la app y por correo.")}
                        {skipped > 0 ? (
                            <p className="flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary-text">
                                <Icon icon="mdi:lightbulb-on-outline" width={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span>
                                    Omitiste {skipped} {skipped === 1 ? "paso opcional" : "pasos opcionales"}. Puedes enviarlo así y completarlo luego desde «Mi perfil», pero los clientes te verán con menos detalle.
                                </span>
                            </p>
                        ) : null}
                        <div className="border-t border-default-200">
                            {rows.map((row) => {
                                const empty = row.value === SIN_COMPLETAR;
                                return (
                                    <div key={row.label} className="flex min-w-0 items-center justify-between gap-3 border-b border-default-200 py-4">
                                        <span className="w-24 shrink-0 text-[13px] text-default-500">{row.label}</span>
                                        <span className={`line-clamp-2 min-w-0 flex-1 text-[15px] ${empty ? "text-default-400" : ""}`}>{row.value}</span>
                                        <button
                                            type="button"
                                            data-guide-change
                                            aria-label={`${empty ? "Completar" : "Cambiar"} ${row.label.toLowerCase()}`}
                                            className={`${FOCUS_RING} inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-primary-text hover:underline`}
                                            onClick={() => {
                                                setReturnTo("revision");
                                                goTo(row.go);
                                            }}
                                        >
                                            <Icon icon={empty ? "material-symbols:add" : "material-symbols:edit-outline"} width={16} aria-hidden="true" />
                                            {empty ? "Completar" : "Cambiar"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <FieldError id="err-review" error={error} field="review" />
                    </>
                );
            }
            case "enviado":
                return (
                    <div className="grid justify-items-center gap-5 text-center">
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success-text">
                            <Icon icon="material-symbols:check" width={40} aria-hidden="true" />
                        </span>
                        {title("Perfil enviado", "Lo revisamos y te avisamos por la app y por correo en cuanto esté aprobado.")}
                        <ol className="grid w-full max-w-sm gap-3 text-left text-sm">
                            {[
                                ["mdi:account-check-outline", "Revisamos tu perfil", "Un integrante del equipo valida tus datos."],
                                ["mdi:bell-outline", "Te avisamos", "Por la app y por correo."],
                                ["mdi:inbox-arrow-down-outline", "Recibes solicitudes", "Los clientes te encuentran y te escriben."],
                            ].map(([icon, heading, text]) => (
                                <li key={heading} className="flex items-start gap-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                                        <Icon icon={icon} width={20} aria-hidden="true" />
                                    </span>
                                    <span>
                                        <span className="block font-semibold">{heading}</span>
                                        <span className="text-default-500">{text}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="min-h-[100dvh] bg-background text-foreground">
            <header className="mx-auto flex max-w-5xl items-center px-4 py-4">
                <AppLogo height={30} priority />
            </header>

            <p className="sr-only" role="status" aria-live="polite">
                {announce}
            </p>

            <div className="mx-auto grid max-w-5xl gap-10 px-4 pb-8 lg:grid-cols-[minmax(0,32rem)_23rem] lg:justify-center lg:gap-14">
                <form onSubmit={handleSubmit} noValidate aria-label="Crear tu perfil" className="flex min-h-[calc(100dvh-6rem)] flex-col">
                    <div className="grid gap-1.5 pb-3">
                        <div className="flex min-h-11 items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                {inFlow ? (
                                    <button type="button" aria-label="Volver al paso anterior" onClick={goBack} className={`${FOCUS_RING} -ml-2.5 flex h-11 w-11 items-center justify-center rounded-full hover:bg-default-100`}>
                                        <Icon icon="material-symbols:chevron-left" width={24} aria-hidden="true" />
                                    </button>
                                ) : null}
                                <span className="inline-flex items-center gap-1.5 text-sm text-default-600" aria-live="polite">
                                    {inFlow && chapter ? <Icon icon={chapter.icon} width={18} className="text-primary-text" aria-hidden="true" /> : null}
                                    {inFlow ? `${chapter?.title} · ${chapterPosition} de ${chapterSteps.length}` : step === "enviado" ? "Enviado" : "Tu perfil en Chivapp"}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span role="status" className={`text-[13px] text-success-text transition-opacity motion-reduce:transition-none ${showSaved ? "opacity-100" : "opacity-0"}`}>
                                    {showSaved ? "Guardado ✓" : ""}
                                </span>
                                {inFlow ? <span className="hidden text-[13px] text-default-500 sm:inline">≈ {minutesLeft(step)} min restantes</span> : null}
                                {inFlow && !isDesktop ? (
                                    <Button type="button" variant="light" radius="lg" size="sm" className="min-h-11 px-2 text-primary-text" startContent={<Icon icon="material-symbols:visibility-outline" width={18} aria-hidden="true" />} onPress={() => setPreviewOpen(true)}>
                                        Ver cómo te ven
                                    </Button>
                                ) : null}
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
                        {renderStep()}
                        {formError ? (
                            <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger-text">
                                <Icon icon="material-symbols:error-outline" width={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span>{formError}</span>
                            </p>
                        ) : null}
                    </div>

                    <div className="sticky bottom-0 -mx-4 grid gap-1 border-t border-default-200 bg-background px-4 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] pt-3 lg:static lg:mx-0 lg:border-0 lg:px-0">
                        <Button
                            type="submit"
                            color="primary"
                            size="lg"
                            radius="lg"
                            fullWidth
                            className="h-14 text-[17px] font-semibold"
                            isLoading={busy || uploading !== null}
                            endContent={busy || uploading ? null : <Icon icon={ctaIcon} width={22} aria-hidden="true" />}
                        >
                            {uploading ? "Subiendo…" : busy && step === "revision" ? "Enviando…" : ctaLabel}
                        </Button>
                        {isOptional && !returnTo ? (
                            <Button type="button" variant="light" radius="lg" fullWidth className="min-h-11" isDisabled={busy} onPress={advance}>
                                Omitir por ahora
                            </Button>
                        ) : null}
                    </div>
                </form>

                {isDesktop ? (
                    <aside aria-label="Vista previa de tu perfil" className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
                        <ProfilePreview draft={previewDraft} focus={previewFocus} />
                    </aside>
                ) : null}
            </div>

            {!isDesktop ? (
                <Modal isOpen={previewOpen} onOpenChange={setPreviewOpen} placement="bottom" size="lg" scrollBehavior="inside">
                    <ModalContent>
                        <ModalHeader className="text-base">Vista previa de tu perfil</ModalHeader>
                        <ModalBody className="pb-6">
                            <ProfilePreview draft={previewDraft} focus={previewFocus} scale={0.7} />
                        </ModalBody>
                    </ModalContent>
                </Modal>
            ) : null}
        </div>
    );
}
