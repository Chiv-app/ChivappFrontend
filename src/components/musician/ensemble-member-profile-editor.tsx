"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Input,
    addToast,
    Form,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import ChipListInput from "@/components/ui/chip-list-input";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";
import { updateMusicianProfile } from "@/lib/profiles";
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
    const [isUpgradeConfirmOpen, setIsUpgradeConfirmOpen] = useState(false);

    useEffect(() => {
        void Promise.resolve().then(() => {
            setFullname(user?.fullname || "");
            setPhone(user?.phone || "");
            setInstruments(profile.instruments || []);
        });
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
        } catch (error: unknown) {
            addToast({
                title: "Error",
                description: (error as Error).message || "No se pudo guardar el perfil.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpgrade = async () => {
        setIsUpgrading(true);
        try {
            await updateMusicianProfile({
                is_ensemble_only: false,
                stage_name: profile.stage_name || fullname || "Mi agrupación",
            });
            addToast({
                title: "¡Perfil Pro habilitado!",
                description: "Ahora debes completar el resto de tus datos.",
                color: "success",
            });
            setIsUpgradeConfirmOpen(false);
            onUpgradeToPro();
        } catch (error: unknown) {
            addToast({
                title: "Error",
                description: (error as Error).message || "No se pudo cambiar a Perfil Pro.",
                color: "danger",
            });
        } finally {
            setIsUpgrading(false);
        }
    };

    return (
        <div className="space-y-6">
            <ConfirmDialog
                isOpen={isUpgradeConfirmOpen}
                onOpenChange={setIsUpgradeConfirmOpen}
                title="Convertir a perfil Pro"
                description="Al convertir tu perfil a Pro, deberás completar información adicional como precios, DNI y fotos para aparecer en el directorio y recibir reservaciones."
                confirmLabel="Convertir a perfil Pro"
                color="primary"
                isLoading={isUpgrading}
                onConfirm={handleUpgrade}
            />
            <Card className="shadow-sm border-default-200">
                <CardHeader className="flex flex-col items-start gap-1 pb-0 px-6 pt-6">
                    <h2 className="text-xl font-bold text-default-900">Perfil de integrante</h2>
                    <p className="text-sm text-default-500">
                        Como integrante de una agrupación, tienes un perfil básico.
                    </p>
                </CardHeader>
                <CardBody className="gap-6 px-6 pb-6 pt-4">
                    <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }} validationBehavior="native" className="w-full flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
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
                            placeholder="+51 987 654 321"
                            value={phone}
                            onValueChange={setPhone}
                            variant="bordered"
                            description="Incluye el código de país (ej. +51 para Perú)"
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
                            type="submit"
                            color="primary"
                            isLoading={isSaving}
                            startContent={!isSaving && <Icon icon="material-symbols:save" />}
                        >
                            Guardar cambios
                        </Button>
                    </div>
                    </Form>
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
                        onPress={() => setIsUpgradeConfirmOpen(true)}
                        startContent={!isUpgrading && <Icon icon="material-symbols:rocket-launch" />}
                    >
                        Convertir a perfil Pro
                    </Button>
                </CardBody>
            </Card>
        </div>
    );
}
