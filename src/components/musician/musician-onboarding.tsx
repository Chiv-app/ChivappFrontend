"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Button,
    Card,
    CardBody,
    Input,
    addToast,
    Progress,
    CardHeader,
    Image,
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
    getYoutubeThumbnailUrl,
} from "@/lib/video-urls";
import type { MusicianProfileOut } from "@/types/api";

export default function MusicianOnboarding() {
    const router = useRouter();
    const { user, refresh } = useAuth();
    
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Step 1: Stage Name
    const [stageName, setStageName] = useState("");
    
    // Step 2: Genres and City
    const [genres, setGenres] = useState<string[]>([]);
    const [locationCity, setLocationCity] = useState("");
    
    // Step 3: Photo & Videos
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [videoDraft, setVideoDraft] = useState("");
    
    useEffect(() => {
        getMusicianProfile()
            .then((profile) => {
                if (profile.status === "published" || profile.status === "rejected" || profile.is_ensemble_only) {
                    router.replace("/musician");
                    return;
                }
                setStageName(profile.stage_name || "");
                setGenres(profile.genres || []);
                setLocationCity(profile.location_city || "");
                setProfileImageUrl(profile.profile_image_url || null);
                setVideoUrls(profile.videos || []);
                setIsLoading(false);
            })
            .catch(() => {
                setIsLoading(false);
            });
    }, [router]);
    
    const handleAddVideoUrl = () => {
        const normalized = normalizeUrl(videoDraft);
        if (!isSupportedVideoUrl(normalized)) {
            addToast({
                title: "URL no válida",
                description: "Usa un enlace de YouTube o Vimeo.",
                color: "warning",
            });
            return;
        }
        if (videoUrls.includes(normalized)) {
            addToast({
                title: "Video duplicado",
                description: "Ese enlace ya está en tu lista.",
                color: "warning",
            });
            return;
        }
        setVideoUrls((current) => [...current, normalized]);
        setVideoDraft("");
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!stageName.trim()) {
                addToast({ title: "Campo requerido", description: "Ingresa tu nombre artístico.", color: "danger" });
                return;
            }
            setIsSaving(true);
            try {
                await updateMusicianProfile({ stage_name: stageName.trim() });
                setStep(2);
            } catch (e) {
                addToast({ title: "Error", description: "El nombre artístico podría estar en uso.", color: "danger" });
            } finally {
                setIsSaving(false);
            }
        } else if (step === 2) {
            if (genres.length === 0) {
                addToast({ title: "Campo requerido", description: "Agrega al menos un género musical.", color: "danger" });
                return;
            }
            if (!locationCity.trim()) {
                addToast({ title: "Campo requerido", description: "Ingresa la ciudad donde te presentas.", color: "danger" });
                return;
            }
            setIsSaving(true);
            try {
                await updateMusicianProfile({ 
                    genres,
                    location_city: locationCity.trim()
                });
                setStep(3);
            } catch (e) {
                addToast({ title: "Error al guardar", color: "danger" });
            } finally {
                setIsSaving(false);
            }
        } else if (step === 3) {
            if (!profileImageUrl) {
                addToast({ title: "Campo requerido", description: "Agrega una foto de perfil.", color: "danger" });
                return;
            }
            setIsSaving(true);
            try {
                await updateMusicianProfile({ 
                    profile_image_url: profileImageUrl,
                    videos: videoUrls
                });
                await onboardMusicianProfile();
                await refresh();
                addToast({ title: "¡Perfil publicado!", description: "Ahora los clientes pueden encontrarte en búsquedas.", color: "success" });
                router.replace("/musician");
            } catch (e) {
                addToast({ title: "Error al completar", color: "danger" });
            } finally {
                setIsSaving(false);
            }
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-content2">
                <div className="animate-pulse w-32 h-32 bg-default-200 rounded-full" />
            </div>
        );
    }
    
    const progress = (step / 3) * 100;

    return (
        <div className="min-h-screen bg-content2 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-primary mb-2">Comienza en Chivapp</h1>
                    <p className="text-default-500">
                        Configura lo esencial para que los clientes puedan encontrarte y contratarte.
                    </p>
                </div>
                
                <Card className="shadow-soft border-default-200">
                    <Progress value={progress} size="sm" color="primary" className="rounded-none" radius="none" />
                    
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
                                    onValueChange={setStageName}
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
                                
                                <ChipListInput
                                    label="Géneros musicales"
                                    values={genres}
                                    onChange={setGenres}
                                    placeholder="Ej. Cumbia, Rancheras, Pop"
                                />
                                
                                <Input
                                    label="Ciudad"
                                    placeholder="Ej. Lima"
                                    value={locationCity}
                                    onValueChange={setLocationCity}
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
                                
                                <FileUploadField
                                    label="Foto de perfil"
                                    value={profileImageUrl}
                                    onChange={setProfileImageUrl}
                                    accept="image/jpeg,image/png,image/webp"
                                    helperText="Usa una foto nítida y atractiva"
                                />
                                
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Input
                                            label="Enlace de video (Opcional)"
                                            placeholder="YouTube o Vimeo"
                                            value={videoDraft}
                                            onValueChange={setVideoDraft}
                                            variant="bordered"
                                        />
                                        <Button 
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
                                                                className="h-full w-full"
                                                            />
                                                        </div>
                                                    ) : null}
                                                    <span className="text-xs text-default-600 truncate flex-grow">{url}</span>
                                                    <Button
                                                        isIconOnly
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
                                {step === 3 ? "Finalizar y publicar" : "Continuar"}
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
