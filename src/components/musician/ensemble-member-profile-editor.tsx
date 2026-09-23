"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Input,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import ChipListInput from "@/components/ui/chip-list-input";
import { useAuth } from "@/contexts/auth-context";
import { getMusicianProfile, updateMusicianProfile } from "@/lib/profiles";
import { COMMON_INSTRUMENTS, getInstrumentIcon } from "@/lib/instrument-icons";
import type { MusicianProfileOut } from "@/types/api";

export default function EnsembleMemberProfileEditor({
    profile: initialProfile,
    onUpgradeToPro,
}: {
    profile: MusicianProfileOut;
    onUpgradeToPro: () => void;
}) {
    const { user, refresh } = useAuth();
    const [profile, setProfile] = useState<MusicianProfileOut>(initialProfile);
    
    // Form state
    const [fullname, setFullname] = useState(user?.fullname || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [instruments, setInstruments] = useState<string[]>(profile.instruments || []);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isUpgrading, setIsUpgrading] = useState(false);

    useEffect(() => {
        setFullname(user?.fullname || "");
        setPhone(user?.phone || "");
        setInstruments(profile.instruments || []);
    }, [profile, user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Actualizar datos del usuario/perfil
            const updated = await updateMusicianProfile({
                fullname,
                // phone no se actualiza vía updateMusicianProfile actualmente, pero el usuario puede actualizarlo después si implementamos endpoint. 
                // Asumimos que los instrumentos están en el perfil:
                instruments,
                stage_name: fullname || profile.stage_name || "", // El integrante puede usar su nombre como stage_name
            });
            setProfile(updated);
            addToast({
                title: "Perfil guardado",
                description: "Tus datos básicos han sido actualizados.",
                color: "success",
            });
            await refresh(); // refrescar contexto de usuario
        } catch (error: any) {
            addToast({
                title: "Error",
                description: error.message || "No se pudo guardar el perfil.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpgrade = async () => {
        if (!window.confirm("¿Estás seguro que deseas convertir tu perfil a PRO? Deberás completar información adicional como precios y fotos para recibir reservaciones.")) {
            return;
        }
        setIsUpgrading(true);
        try {
            await updateMusicianProfile({
                is_ensemble_only: false,
                stage_name: profile.stage_name || fullname || "Mi Agrupación",
            });
            addToast({
                title: "¡Perfil Pro habilitado!",
                description: "Ahora debes completar el resto de tus datos.",
                color: "success",
            });
            onUpgradeToPro();
        } catch (error: any) {
            addToast({
                title: "Error",
                description: error.message || "No se pudo cambiar a Perfil Pro.",
                color: "danger",
            });
        } finally {
            setIsUpgrading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-sm border-default-200">
                <CardHeader className="flex flex-col items-start gap-1 pb-0 px-6 pt-6">
                    <h2 className="text-xl font-bold text-default-900">Perfil de Integrante</h2>
                    <p className="text-sm text-default-500">
                        Como integrante de una agrupación, tienes un perfil básico.
                    </p>
                </CardHeader>
                <CardBody className="gap-6 px-6 pb-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Nombre completo"
                            placeholder="Ej. Juan Pérez"
                            value={fullname}
                            onValueChange={setFullname}
                            variant="bordered"
                            isRequired
                        />
                        <Input
                            label="Correo electrónico"
                            value={user?.email || ""}
                            variant="bordered"
                            isReadOnly
                            description="El correo no se puede cambiar"
                        />
                        <Input
                            label="Teléfono"
                            placeholder="+52 55 1234 5678"
                            value={phone}
                            onValueChange={setPhone}
                            variant="bordered"
                            description="Debe incluir código de país (ej. +52 o +57)"
                        />
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold mb-2">Instrumentos que tocas</h3>
                        <ChipListInput
                            label="Instrumentos"
                            values={instruments}
                            onChange={setInstruments}
                            placeholder="Ej. Violín, Trompeta..."
                            suggestions={COMMON_INSTRUMENTS.map((label) => ({ label, icon: getInstrumentIcon(label) }))}
                        />
                    </div>
                    
                    <div className="pt-2">
                        <Button
                            color="primary"
                            isLoading={isSaving}
                            onPress={handleSave}
                            startContent={!isSaving && <Icon icon="material-symbols:save" />}
                        >
                            Guardar cambios
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card className="shadow-sm border-primary/20 bg-primary/5">
                <CardBody className="flex flex-col md:flex-row items-center justify-between gap-4 p-6">
                    <div>
                        <h3 className="text-lg font-bold text-primary">¿Quieres ser líder de tu propia agrupación?</h3>
                        <p className="text-sm text-default-600 mt-1">
                            Al convertirte en Perfil Pro, podrás aparecer en el directorio de músicos, recibir reservaciones directas y gestionar a tus propios integrantes.
                        </p>
                    </div>
                    <Button
                        color="primary"
                        variant="solid"
                        size="lg"
                        className="shrink-0"
                        isLoading={isUpgrading}
                        onPress={handleUpgrade}
                        startContent={!isUpgrading && <Icon icon="material-symbols:rocket-launch" />}
                    >
                        Convertir Perfil Pro
                    </Button>
                </CardBody>
            </Card>
        </div>
    );
}
