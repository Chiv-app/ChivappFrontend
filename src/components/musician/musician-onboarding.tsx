"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Button,
    Card,
    CardBody,
    Input,
    addToast,
    Progress,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { getMusicianProfile, updateMusicianProfile, onboardMusicianProfile } from "@/lib/profiles";
import ChipListInput from "@/components/ui/chip-list-input";
import FileUploadField from "@/components/ui/file-upload-field";
import {
    normalizeUrl,
    isSupportedVideoUrl,
    getVideoEmbedUrl,
} from "@/lib/video-urls";

export default function MusicianOnboarding() {
    const router = useRouter();
    const { user, isLoading: isAuthLoading, refresh } = useAuth();

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Step 1: Stage Name
    const [stageName, setStageName] = useState("");
    const [stageNameError, setStageNameError] = useState<string | null>(null);

    // Step 2: Genres and City
    const [genres, setGenres] = useState<string[]>([]);
    const [genresError, setGenresError] = useState<string | null>(null);
    const [locationCity, setLocationCity] = useState("");
    const [cityError, setCityError] = useState<string | null>(null);

    // Step 3: Photo & Videos
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [videoDraft, setVideoDraft] = useState("");
    const [videoError, setVideoError] = useState<string | null>(null);

    const loadProfile = useCallback(async () => {
        if (isAuthLoading) return;
        if (!user) {
            router.replace("/login?redirect=/musician/onboarding");
            return;
        }
        if (user.role !== "musician") {
            router.replace(user.role === "admin" ? "/admin" : "/contractor/bookings");
            return;
        }

        setIsLoading(true);
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
            setStageName(profile.stage_name || "");
            setGenres(profile.genres || []);
            setLocationCity(profile.location_city || "");
            setProfileImageUrl(profile.profile_image_url || null);
            setVideoUrls(profile.videos || []);
        } catch (err) {
            setLoadError(
                err instanceof Error && err.message
                    ? err.message
                    : "No pudimos cargar tu perfil inicial. Revisa tu conexión e inténtalo de nuevo.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [isAuthLoading, router, user]);

    useEffect(() => {
        void Promise.resolve().then(() => loadProfile());
    }, [loadProfile]);

    const handleAddVideoUrl = () => {
        const normalized = normalizeUrl(videoDraft);
        if (!isSupportedVideoUrl(normalized)) {
            setVideoError("Usa un enlace válido de YouTube o Vimeo.");
            addToast({
                title: "URL no válida",
                description: "Usa un enlace de YouTube o Vimeo.",
                color: "warning",
            });
            return;
        }
        if (videoUrls.includes(normalized)) {
            setVideoError("Ese enlace ya está en tu lista.");
            addToast({
                title: "Video duplicado",
                description: "Ese enlace ya está en tu lista.",
                color: "warning",
            });
            return;
        }
        setVideoError(null);
        setVideoUrls((current) => [...current, normalized]);
        setVideoDraft("");
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!stageName.trim()) {
                setStageNameError("Ingresa tu nombre artístico o el de tu agrupación.");
                addToast({ title: "Campo requerido", description: "Ingresa tu nombre artístico.", color: "danger" });
                return;
            }
            setStageNameError(null);
            setIsSaving(true);
            try {
                await updateMusicianProfile({ stage_name: stageName.trim() });
                setStep(2);
            } catch (error) {
                const msg =
                    error instanceof Error && error.message
                        ? error.message
                        : "El nombre artístico podría estar en uso.";
                setStageNameError(msg);
                addToast({
                    title: "Error",
                    description: msg,
                    color: "danger",
                });
            } finally {
                setIsSaving(false);
            }
        } else if (step === 2) {
            let hasError = false;
            if (genres.length === 0) {
                setGenresError("Agrega al menos un género musical.");
                hasError = true;
            } else {
                setGenresError(null);
            }
            if (!locationCity.trim()) {
                setCityError("Ingresa la ciudad donde te presentas.");
                hasError = true;
            } else {
                setCityError(null);
            }
            if (hasError) {
                addToast({ title: "Campos requeridos", description: "Revisa los géneros musicales y la ciudad.", color: "danger" });
                return;
            }
            setIsSaving(true);
            try {
                await updateMusicianProfile({
                    genres,
                    location_city: locationCity.trim(),
                });
                setStep(3);
            } catch (error) {
                addToast({
                    title: "Error al guardar",
                    description:
                        error instanceof Error && error.message
                            ? error.message
                            : "No pudimos actualizar tu ubicación y géneros.",
                    color: "danger",
                });
            } finally {
                setIsSaving(false);
            }
        } else if (step === 3) {
            if (!profileImageUrl) {
                setPhotoError("Sube una foto de perfil antes de continuar.");
                addToast({ title: "Campo requerido", description: "Agrega una foto de perfil.", color: "danger" });
                return;
            }
            setPhotoError(null);
            setIsSaving(true);
            try {
                await updateMusicianProfile({
                    profile_image_url: profileImageUrl,
                    videos: videoUrls,
                });
                await onboardMusicianProfile();
                await refresh();
                addToast({
                    title: "¡Paso inicial guardado!",
                    description: "Ahora completa tu biografía, instrumentos, horarios y documentos para publicar tu perfil en el catálogo.",
                    color: "success",
                });
                router.replace("/musician/profile");
            } catch (error) {
                addToast({
                    title: "Error al completar",
                    description:
                        error instanceof Error && error.message
                            ? error.message
                            : "Asegúrate de haber completado todos los pasos.",
                    color: "danger",
                });
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (isAuthLoading || isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-content2">
                <div className="animate-pulse w-32 h-32 bg-default-200 rounded-full" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen bg-content2 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-soft border border-danger/30">
                    <CardBody className="p-6 flex flex-col gap-4 text-center items-center" role="alert">
                        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger-text flex items-center justify-center">
                            <Icon icon="solar:danger-triangle-bold" width={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground mb-1">No pudimos cargar tu perfil</h1>
                            <p className="text-sm text-default-500">{loadError}</p>
                        </div>
                        <Button color="primary" onPress={() => void loadProfile()}>
                            Reintentar
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    const progress = (step / 3) * 100;

    return (
        <div className="min-h-screen bg-content2 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="mb-8 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-text mb-1">
                        Paso {step} de 3
                    </p>
                    <h1 className="text-3xl font-bold text-primary-text mb-2">Comienza en Chivapp</h1>
                    <p className="text-default-500">
                        Configura lo esencial para activar tu cuenta artística y pasar a completar tu perfil.
                    </p>
                </div>

                <Card className="shadow-soft border-default-200">
                    <Progress
                        aria-label={`Progreso de configuración inicial: paso ${step} de 3`}
                        value={progress}
                        size="sm"
                        color="primary"
                        className="rounded-none"
                        radius="none"
                    />

                    <CardBody className="p-8">
                        {step === 1 && (
                            <div className="flex flex-col gap-6 animate-appearance-in">
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold mb-2">Tu identidad artística</h2>
                                    <p className="text-default-500 text-sm">
                                        ¿Bajo qué nombre te presentas o se llama tu agrupación?
                                    </p>
                                </div>

                                <Input
                                    label="Nombre artístico"
                                    placeholder="Ej. Mariachi Sol de México"
                                    value={stageName}
                                    onValueChange={(val) => {
                                        setStageName(val);
                                        if (stageNameError) setStageNameError(null);
                                    }}
                                    isInvalid={Boolean(stageNameError)}
                                    errorMessage={stageNameError ?? undefined}
                                    size="lg"
                                    autoFocus
                                    variant="bordered"
                                />
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex flex-col gap-6 animate-appearance-in">
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold mb-2">Estilo y ubicación</h2>
                                    <p className="text-default-500 text-sm">
                                        Para que te encuentren clientes que buscan exactamente lo que ofreces.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <ChipListInput
                                        label="Géneros musicales"
                                        values={genres}
                                        onChange={(next) => {
                                            setGenres(next);
                                            if (genresError && next.length > 0) setGenresError(null);
                                        }}
                                        placeholder="Ej. Cumbia, Rancheras, Pop"
                                    />
                                    {genresError && (
                                        <p className="text-xs text-danger-text" role="alert">
                                            {genresError}
                                        </p>
                                    )}
                                </div>

                                <Input
                                    label="Ciudad"
                                    placeholder="Ej. Lima"
                                    value={locationCity}
                                    onValueChange={(val) => {
                                        setLocationCity(val);
                                        if (cityError) setCityError(null);
                                    }}
                                    isInvalid={Boolean(cityError)}
                                    errorMessage={cityError ?? undefined}
                                    variant="bordered"
                                />
                            </div>
                        )}

                        {step === 3 && (
                            <div className="flex flex-col gap-6 animate-appearance-in">
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold mb-2">Tu vitrina</h2>
                                    <p className="text-default-500 text-sm">
                                        Sube tu mejor foto y si quieres, agrega un video de YouTube para mostrar tu talento.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <FileUploadField
                                        label="Foto de perfil"
                                        value={profileImageUrl}
                                        onChange={(val) => {
                                            setProfileImageUrl(val);
                                            if (photoError && val) setPhotoError(null);
                                        }}
                                        accept="image/jpeg,image/png,image/webp"
                                        helperText="Usa una foto nítida y atractiva"
                                    />
                                    {photoError && (
                                        <p className="text-xs text-danger-text" role="alert">
                                            {photoError}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Input
                                            label="Enlace de video (opcional)"
                                            placeholder="YouTube o Vimeo"
                                            value={videoDraft}
                                            onValueChange={(val) => {
                                                setVideoDraft(val);
                                                if (videoError) setVideoError(null);
                                            }}
                                            isInvalid={Boolean(videoError)}
                                            errorMessage={videoError ?? undefined}
                                            variant="bordered"
                                        />
                                        <Button
                                            isIconOnly
                                            aria-label="Agregar enlace de video"
                                            color="primary"
                                            variant="flat"
                                            className="h-14"
                                            onPress={handleAddVideoUrl}
                                            isDisabled={!videoDraft.trim()}
                                        >
                                            <Icon icon="material-symbols:add" width={24} />
                                        </Button>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-2">
                                        {videoUrls.map((url) => {
                                            const embedUrl = getVideoEmbedUrl(url);
                                            return (
                                                <div key={url} className="flex items-center gap-3 p-2 border border-default-200 rounded-lg">
                                                    {embedUrl ? (
                                                        <div className="h-16 w-24 bg-default-900 rounded overflow-hidden flex-shrink-0">
                                                            <iframe
                                                                src={embedUrl}
                                                                title="Vista previa del video"
                                                                className="h-full w-full"
                                                            />
                                                        </div>
                                                    ) : null}
                                                    <span className="text-xs text-default-600 truncate flex-grow">{url}</span>
                                                    <Button
                                                        isIconOnly
                                                        aria-label="Eliminar video"
                                                        size="sm"
                                                        variant="light"
                                                        color="danger"
                                                        onPress={() => setVideoUrls((curr) => curr.filter((u) => u !== url))}
                                                    >
                                                        <Icon icon="material-symbols:delete" width={20} />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-default-200 bg-content2/70 p-3.5 text-xs text-default-600 space-y-2">
                                    <p className="font-semibold text-foreground">
                                        ¿Qué sigue después de este registro inicial?
                                    </p>
                                    <ol className="flex flex-wrap items-center gap-1.5 font-medium">
                                        <li className="text-primary-text font-semibold">1. Registro inicial</li>
                                        <li aria-hidden="true">→</li>
                                        <li>2. Completar perfil y documentos</li>
                                        <li aria-hidden="true">→</li>
                                        <li>3. Revisión y publicación en el catálogo</li>
                                    </ol>
                                    <p className="text-default-500 leading-relaxed">
                                        Para que el equipo pueda aprobar y publicar tu perfil en el catálogo público, en el siguiente paso deberás completar tu biografía, instrumentos, disponibilidad horaria, documento de identidad, firma digital y plantilla de contrato.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-8 pt-6 border-t border-default-100">
                            {step > 1 ? (
                                <Button
                                    variant="light"
                                    onPress={() => setStep(step - 1)}
                                    isDisabled={isSaving}
                                >
                                    Volver
                                </Button>
                            ) : (
                                <div></div>
                            )}

                            <Button
                                color="primary"
                                onPress={handleNext}
                                isLoading={isSaving}
                                endContent={!isSaving && <Icon icon={step === 3 ? "material-symbols:check" : "material-symbols:arrow-forward"} width={20} />}
                            >
                                {step === 3 ? "Guardar y completar mi perfil" : "Continuar"}
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
