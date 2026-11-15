"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Input, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import ChoiceChip from "@/components/ui/choice-chip";
import { ApiError } from "@/lib/api";
import { CITY_OPTIONS } from "@/lib/onboarding-guide";
import { getCityIcon } from "@/lib/onboarding-icons";
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
    SETUP_OPTIONS,
    TRAVEL_FEE_OPTIONS,
    YES_NO_OPTIONS,
    type GroupSize,
    type Option,
    type ProfileDetails,
    type ProfileKind,
    parseDetails,
    toggleInList,
    withoutGroupOnly,
} from "@/lib/profile-details";
import { getMusicianProfile, updateMusicianProfile } from "@/lib/profiles";

type SingleKey = "audience" | "duration" | "setup" | "travel_fee" | "notice" | "experience" | "format" | "reduced";
type MultiKey = "event_types" | "includes" | "other_cities";

type FormState = { kind: ProfileKind; size: GroupSize | null; details: ProfileDetails };

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <fieldset className="grid gap-3">
            <legend className="text-[15px] font-semibold">{label}</legend>
            {hint ? <p className="-mt-1 text-sm text-default-500">{hint}</p> : null}
            <div className="flex flex-wrap gap-2.5">{children}</div>
        </fieldset>
    );
}

/**
 * Tipo de perfil y detalles que ven los clientes. Es el lugar donde un perfil ya publicado completa lo que
 * la guía de alta pide ahora. Guardar aquí no manda el perfil a revisión.
 */
export default function ProfileDetailsCard() {
    const [form, setForm] = useState<FormState | null>(null);
    const [initial, setInitial] = useState<string>("");
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [otherCity, setOtherCity] = useState("");
    const [homeCity, setHomeCity] = useState("");

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const profile = await getMusicianProfile();
                if (cancelled) return;
                const state: FormState = {
                    kind: profile.profile_type === "group" ? "group" : "solo",
                    size: GROUP_SIZE_OPTIONS.find((o) => o.value === profile.group_size)?.value ?? null,
                    details: parseDetails(profile.details),
                };
                setForm(state);
                setInitial(JSON.stringify(state));
                setHomeCity(profile.location_city ?? "");
            } catch {
                if (!cancelled) setLoadFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const dirty = useMemo(() => form !== null && JSON.stringify(form) !== initial, [form, initial]);

    if (loadFailed) return null;
    if (!form) return <div className="mx-auto h-40 w-full max-w-3xl animate-pulse rounded-2xl bg-default-100" />;

    const setDetails = (update: (current: ProfileDetails) => ProfileDetails) => {
        setForm((current) => (current ? { ...current, details: update(current.details) } : current));
        setMessage(null);
    };
    const toggleSingle = (key: SingleKey, value: string) =>
        setDetails((current) => {
            const next = { ...current };
            if (next[key] === value) delete next[key];
            else next[key] = value;
            return next;
        });
    const toggleMulti = (key: MultiKey, value: string) =>
        setDetails((current) => {
            const list = toggleInList(current[key], value);
            const next = { ...current };
            if (list) next[key] = list;
            else delete next[key];
            return next;
        });
    const single = (key: SingleKey, options: Option[]) =>
        options.map((o) => <ChoiceChip key={o.value} label={o.label} icon={o.icon} selected={form.details[key] === o.value} onToggle={() => toggleSingle(key, o.value)} />);
    const multi = (key: MultiKey, options: Option[]) =>
        options.map((o) => <ChoiceChip key={o.value} label={o.label} icon={o.icon} selected={(form.details[key] ?? []).includes(o.value)} onToggle={() => toggleMulti(key, o.value)} />);

    function chooseKind(kind: ProfileKind) {
        setForm((current) =>
            current
                ? {
                      kind,
                      size: kind === "group" ? current.size : null,
                      details: kind === "solo" ? withoutGroupOnly(current.details) : current.details,
                  }
                : current,
        );
        setMessage(null);
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

    async function save() {
        if (!form || saving) return;
        if (form.kind === "group" && !form.size) {
            setMessage("Indica cuántas personas son para guardar un perfil de grupo.");
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            await updateMusicianProfile({
                profile_type: form.kind,
                group_size: form.kind === "group" ? form.size : null,
                details: form.details,
            });
            setInitial(JSON.stringify(form));
            addToast({ title: "Detalles guardados", description: "Tu perfil se actualiza sin pasar por revisión.", color: "success" });
        } catch (error) {
            const text = error instanceof ApiError && error.message ? error.message : "No pudimos guardar. Inténtalo de nuevo.";
            setMessage(text);
            addToast({ title: "No se pudo guardar", description: text, color: "danger" });
        } finally {
            setSaving(false);
        }
    }

    const cityChips: Option[] = [
        ...CITY_OPTIONS.filter((city) => city !== homeCity).map((city) => ({ value: city, label: city, icon: getCityIcon(city) })),
        ...(form.details.other_cities ?? [])
            .filter((city) => !CITY_OPTIONS.includes(city))
            .map((city) => ({ value: city, label: city, icon: getCityIcon(city) })),
    ];
    const citiesFull = (form.details.other_cities?.length ?? 0) >= MAX_OTHER_CITIES;

    return (
        <Card className="mx-auto w-full max-w-3xl" shadow="sm">
            <CardHeader className="flex flex-col items-start gap-1 px-5 pt-5 sm:px-6">
                <h2 className="text-xl font-bold">Detalles de tu perfil</h2>
                <p className="text-sm text-default-500">
                    Completa lo que quieras: los clientes lo ven en tu perfil. Cambiar esto no manda tu perfil a revisión.
                </p>
            </CardHeader>
            <CardBody className="grid gap-7 px-5 pb-6 sm:px-6">
                <div role="radiogroup" aria-label="Cómo trabajas" className="grid gap-3 sm:grid-cols-2">
                    {PROFILE_KIND_OPTIONS.map((option) => {
                        const on = form.kind === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => chooseKind(option.value)}
                                className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none ${
                                    on ? "border-primary-text bg-primary/10" : "border-default-200 bg-content1 hover:border-primary-text"
                                }`}
                            >
                                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${on ? "bg-primary-text text-background" : "bg-default-100"}`}>
                                    <Icon icon={option.icon} width={24} aria-hidden="true" />
                                </span>
                                <span className="grid">
                                    <span className="font-semibold">{option.title}</span>
                                    <span className="text-sm text-default-500">{option.description}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                {form.kind === "group" ? (
                    <>
                        <Group label="¿Cuántas personas son?">
                            {GROUP_SIZE_OPTIONS.map((o) => (
                                <ChoiceChip key={o.value} label={o.label} icon={o.icon} selected={form.size === o.value} onToggle={() => setForm((c) => (c ? { ...c, size: o.value } : c))} />
                            ))}
                        </Group>
                        <Group label="¿Cómo suena tu grupo?">{single("format", FORMAT_OPTIONS)}</Group>
                    </>
                ) : null}

                <Group label="Eventos que animas (puedes elegir varios)">{multi("event_types", EVENT_TYPE_OPTIONS)}</Group>
                <Group label="¿Con cuántos invitados sueles trabajar?">{single("audience", AUDIENCE_OPTIONS)}</Group>
                <Group label="Duración habitual de tu show">{single("duration", DURATION_OPTIONS)}</Group>
                <Group label="¿Qué incluye tu tarifa? (puedes elegir varios)" hint="El cliente lo ve antes de contratar y te hace menos preguntas.">
                    {multi("includes", INCLUDE_OPTIONS)}
                </Group>
                <Group label="Tiempo que necesitas para montar">{single("setup", SETUP_OPTIONS)}</Group>
                {form.kind === "group" ? <Group label="¿Pueden tocar con menos integrantes?">{single("reduced", YES_NO_OPTIONS)}</Group> : null}

                <fieldset className="grid gap-3">
                    <legend className="text-[15px] font-semibold">Otras ciudades donde te presentas (puedes elegir varias)</legend>
                    <div className="flex flex-wrap gap-2.5">{multi("other_cities", cityChips)}</div>
                    <div className="flex gap-2">
                        <Input
                            aria-label="Agregar otra ciudad"
                            placeholder="Otra ciudad"
                            variant="bordered"
                            radius="lg"
                            value={otherCity}
                            onValueChange={setOtherCity}
                            isDisabled={citiesFull}
                            maxLength={60}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addOtherCity();
                                }
                            }}
                        />
                        <Button type="button" variant="bordered" radius="lg" className="h-12 shrink-0" isDisabled={otherCity.trim().length < 2 || citiesFull} onPress={addOtherCity}>
                            Agregar
                        </Button>
                    </div>
                </fieldset>
                <Group label="¿Cobras viáticos fuera de tu ciudad?">{single("travel_fee", TRAVEL_FEE_OPTIONS)}</Group>
                <Group label="Antelación mínima para reservar">{single("notice", NOTICE_OPTIONS)}</Group>
                <Group label="Años de experiencia">{single("experience", EXPERIENCE_OPTIONS)}</Group>

                {message ? (
                    <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger-text">
                        <Icon icon="material-symbols:error-outline" width={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{message}</span>
                    </p>
                ) : null}
                <div className="flex items-center justify-end gap-3">
                    {!dirty ? <span className="text-sm text-default-500">Sin cambios por guardar</span> : null}
                    <Button color="primary" radius="lg" size="lg" className="font-semibold" isLoading={saving} isDisabled={!dirty} onPress={() => void save()}>
                        Guardar detalles
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}
