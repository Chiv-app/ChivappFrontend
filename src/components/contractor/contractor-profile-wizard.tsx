"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    Select,
    SelectItem,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import FileUploadField from "@/components/ui/file-upload-field";
import ContractorVerifiedPreview from "@/components/contractor/contractor-verified-preview";
import ChangePasswordModal from "@/components/profile/change-password-modal";
import ContractorProfileWizardStepper from "@/components/contractor/profile-wizard/profile-wizard-stepper";
import {
    CONTRACTOR_WIZARD_STEPS,
    getInitialStepIndex,
} from "@/components/contractor/profile-wizard/constants";
import {
    getContractorProfile,
    getContractorProfileStatus,
    submitContractorProfile,
    updateContractorProfile,
} from "@/lib/profiles";
import { useAuth } from "@/contexts/auth-context";
import {
    collectMissingFieldLabels,
    labelProfileField,
} from "@/lib/profile-validation/field-labels";
import { validateContractorForm } from "@/lib/profile-validation/contractor";
import type { ContractorProfileOut, ContractorProfileUpdate, ProfileValidationOut } from "@/types/api";

export default function ContractorProfileWizard() {
    const { user, refresh } = useAuth();
    const [profile, setProfile] = useState<ContractorProfileOut | null>(null);
    const [validation, setValidation] = useState<ProfileValidationOut | null>(null);
    const [isEditingVerified, setIsEditingVerified] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [fullname, setFullname] = useState("");
    const [username, setUsername] = useState("");
    const [usernameCheck, setUsernameCheck] = useState<{available: boolean, message: string} | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [documentType, setDocumentType] = useState("DNI");
    const [documentNumber, setDocumentNumber] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [bio, setBio] = useState("");
    const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);

    const currentStepDef = CONTRACTOR_WIZARD_STEPS[activeStep];
    const liveValidation = useMemo(() => {
        if (!validation) return null;
        return validateContractorForm(
            {
                fullname,
                username,
                phone,
                documentType,
                documentNumber,
                address,
                city,
                idDocumentUrl,
            },
            validation.status,
            validation.is_public,
        );
    }, [validation, fullname, username, phone, documentType, documentNumber, address, city, idDocumentUrl]);
    const displayValidation = liveValidation ?? validation;

    function applyProfileData(profileData: ContractorProfileOut) {
        setFullname(profileData.fullname ?? user?.fullname ?? "");
        setUsername(profileData.username ?? user?.username ?? "");
        setPhone(profileData.phone ?? user?.phone ?? "");
        setEmail(profileData.email ?? user?.email ?? "");
        setDocumentType(profileData.document_type ?? "DNI");
        setDocumentNumber(profileData.document_number ?? "");
        setAddress(profileData.address ?? "");
        setCity(profileData.city ?? "");
        setBio(profileData.bio ?? "");
        setIdDocumentUrl(profileData.id_document_url);
    }

    function buildPayload(): ContractorProfileUpdate {
        return {
            fullname: fullname.trim() || null,
            username: username.trim() || null,
            phone: phone.trim() || null,
            document_type: documentType,
            document_number: documentNumber,
            address,
            city,
            bio,
            id_document_url: idDocumentUrl,
        };
    }

    async function refreshValidation() {
        const statusData = await getContractorProfileStatus();
        setValidation(statusData);
        return statusData;
    }

    async function loadData() {
        setIsLoading(true);
        setLoadError(null);
        try {
            const [profileData, statusData] = await Promise.all([
                getContractorProfile(),
                getContractorProfileStatus(),
            ]);
            setProfile(profileData);
            setValidation(statusData);
            applyProfileData(profileData);
            setActiveStep(getInitialStepIndex(statusData.steps));
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudo cargar tu perfil de contratista.";
            setLoadError(message);
            addToast({ title: "Error", description: message, color: "danger" });
        } finally {
            setIsLoading(false);
        }
    }


    useEffect(() => {
        if (!username || username === user?.username) {
            setUsernameCheck(null);
            return;
        }
        setIsCheckingUsername(true);
        const timer = setTimeout(async () => {
            try {
                const { checkUsername } = await import("@/lib/profiles");
                const res = await checkUsername(username);
                setUsernameCheck(res);
            } catch (e) {
                setUsernameCheck(null);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [username, user?.username]);

    useEffect(() => {
        void loadData();
        // Carga inicial única al montar el wizard.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSave(showToast = true) {
        const wasPublished = profile?.status === "published";
        setIsSaving(true);
        try {
            const updated = await updateContractorProfile(buildPayload());
            setProfile(updated);
            try {
                await refresh();
            } catch {
                // auth refresh is non-blocking
            }
            const statusData = await refreshValidation();
            if (wasPublished && updated.status === "draft") {
                setIsEditingVerified(true);
            }
            if (showToast) {
                if (wasPublished && updated.status === "draft") {
                    addToast({
                        title: "Perfil en borrador",
                        description: statusData.can_submit
                            ? "Tus cambios quitaron la verificación. Ya puedes enviar a revisión sin recorrer los demás pasos."
                            : "Tus cambios quitaron la verificación. Completa los campos obligatorios pendientes y envía a revisión.",
                        color: "warning",
                    });
                } else {
                    addToast({
                        title: "Cambios guardados",
                        description: statusData.can_submit
                            ? "Listo. Puedes enviar a revisión con este cambio."
                            : "Guardado. Revisa los campos obligatorios pendientes antes de enviar.",
                        color: statusData.can_submit ? "success" : "warning",
                    });
                }
            }
            return true;
        } catch (error) {
            addToast({
                title: "Error al guardar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
            return false;
        } finally {
            setIsSaving(false);
        }
    }

    async function handleNext() {
        const saved = await handleSave(false);
        if (!saved) return;
        if (activeStep < CONTRACTOR_WIZARD_STEPS.length - 1) {
            setActiveStep((current) => current + 1);
            addToast({
                title: "Paso guardado",
                description: `Continúa con "${CONTRACTOR_WIZARD_STEPS[activeStep + 1].title}".`,
                color: "success",
            });
        }
    }

    async function handleSubmitProfile() {
        setIsSubmitting(true);
        try {
            const saved = await handleSave(false);
            if (!saved) return;

            const statusData = await refreshValidation();
            if (!statusData.can_submit) {
                const missing = collectMissingFieldLabels(statusData.steps);
                addToast({
                    title: "Campos obligatorios incompletos",
                    description:
                        missing.length > 0
                            ? `No hace falta recorrer todos los pasos, pero debes completar: ${missing.join(", ")}.`
                            : "Revisa los campos obligatorios pendientes antes de enviar.",
                    color: "warning",
                });
                return;
            }

            const updated = await submitContractorProfile();
            setProfile(updated);
            await refreshValidation();
            addToast({
                title: "Perfil enviado",
                description: "Tu verificación fue enviada a revisión manual.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo enviar",
                description:
                    error instanceof Error
                        ? error.message
                        : "Verifica que todos los campos obligatorios estén completos.",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    function renderStepContent() {
        switch (currentStepDef.key) {
            case "personal":
                return (
                    <div className="flex flex-col gap-4">
                        <Input
                            label="Nombre completo"
                            placeholder="Tu nombre y apellidos completos"
                            value={fullname}
                            onValueChange={setFullname}
                            variant="bordered"
                            isRequired
                            description="Nombre de la persona o entidad que realiza las contrataciones"
                        />
                        <Input
                            label="Nombre de usuario (opcional)"
                            placeholder="ej. juan-perez"
                            description={usernameCheck ? usernameCheck.message : "Identificador único para tu perfil público."}
                            color={usernameCheck ? (usernameCheck.available ? "success" : "danger") : "default"}
                            errorMessage={usernameCheck && !usernameCheck.available ? usernameCheck.message : undefined}
                            value={username}
                            onValueChange={(val) => {
                                const sanitized = val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
                                setUsername(sanitized);
                            }}
                            variant="bordered"
                        />
                        <Input
                            label="Correo electrónico"
                            value={email || user?.email || ""}
                            variant="bordered"
                            isReadOnly
                            description="Correo vinculado a tu cuenta"
                        />
                        <Input
                            label="Teléfono"
                            placeholder="+51 999 999 999"
                            value={phone}
                            onValueChange={setPhone}
                            variant="bordered"
                            description="Para coordinaciones de eventos y contacto directo"
                        />
                        <Select
                            label="Tipo de documento"
                            selectedKeys={[documentType]}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0]?.toString();
                                if (value) setDocumentType(value);
                            }}
                            variant="bordered"
                        >
                            <SelectItem key="DNI">DNI</SelectItem>
                            <SelectItem key="CE">Carnet de extranjería</SelectItem>
                            <SelectItem key="Pasaporte">Pasaporte</SelectItem>
                        </Select>
                        <Input
                            label="Número de documento"
                            value={documentNumber}
                            onValueChange={setDocumentNumber}
                            variant="bordered"
                            isRequired
                        />
                        <Input
                            label="Ciudad"
                            value={city}
                            onValueChange={setCity}
                            variant="bordered"
                            isRequired
                        />
                        <Input
                            label="Dirección"
                            value={address}
                            onValueChange={setAddress}
                            variant="bordered"
                            isRequired
                        />
                        <Textarea
                            label="Notas adicionales (opcional)"
                            value={bio}
                            onValueChange={setBio}
                            variant="bordered"
                        />
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-default-200/80 bg-default-50/50 mt-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                    <Icon icon="solar:lock-password-bold-duotone" className="text-2xl" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Contraseña de acceso</p>
                                    <p className="text-xs text-default-500">
                                        {user?.has_password
                                            ? "Puedes actualizar tu contraseña de acceso en cualquier momento."
                                            : "Aún no tienes una contraseña configurada para acceso con correo."}
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="flat"
                                color="primary"
                                size="sm"
                                startContent={<Icon icon="solar:pen-new-square-linear" className="text-base" />}
                                onPress={() => setIsPasswordModalOpen(true)}
                                className="shrink-0"
                            >
                                {user?.has_password ? "Cambiar contraseña" : "Crear contraseña"}
                            </Button>
                        </div>
                    </div>
                );

            case "documents":
                return (
                    <FileUploadField
                        label="Foto de documento de identidad"
                        value={idDocumentUrl}
                        onChange={setIdDocumentUrl}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        helperText="Sube una foto clara de tu DNI, CE o pasaporte."
                    />
                );

            default:
                return null;
        }
    }

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto">
                <div className="h-96 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
            </div>
        );
    }

    if (loadError || !displayValidation) {
        return (
            <div className="max-w-6xl mx-auto">
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="gap-4 p-6">
                        <h1 className="text-2xl font-bold">Verificación de contratista</h1>
                        <p className="text-default-500">
                            {loadError ?? "No se pudo cargar la información de tu perfil."}
                        </p>
                        <Button color="primary" onPress={loadData}>
                            Reintentar
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    const showVerifiedPreview =
        profile?.status === "published" &&
        displayValidation.is_public &&
        !isEditingVerified;

    if (showVerifiedPreview && profile) {
        return (
            <ContractorVerifiedPreview
                profile={profile}
                fullname={user?.fullname}
                email={user?.email}
                onEdit={() => {
                    setActiveStep(0);
                    setIsEditingVerified(true);
                    addToast({
                        title: "Modo edición",
                        description:
                            "Si guardas cambios, tu perfil volverá a revisión y las reservas se pausarán temporalmente.",
                        color: "warning",
                    });
                }}
            />
        );
    }

    const currentValidationStep = displayValidation.steps.find(
        (step) => step.key === currentStepDef.key,
    );
    const isCurrentStepComplete = currentValidationStep?.completed ?? false;
    const isLastStep = activeStep === CONTRACTOR_WIZARD_STEPS.length - 1;
    const isEditMode =
        isEditingVerified ||
        profile?.status === "rejected" ||
        profile?.status === "published" ||
        Boolean(profile?.submitted_at) ||
        Boolean(profile?.published_at);
    const canReturnToPreview =
        isEditingVerified && profile?.status === "published" && activeStep === 0;
    const canShowSubmit = isEditMode || isLastStep;
    const submitDisabled = displayValidation.status === "pending_review";
    const canSubmitNow =
        displayValidation.can_submit && displayValidation.status !== "pending_review";

    const timelineHeading =
        profile?.status === "pending_review"
            ? "Perfil en revisión"
            : isEditMode
              ? "Edita tu perfil"
              : "Completa tu perfil paso a paso";
    const timelineSubtitle =
        profile?.status === "pending_review"
            ? "Un administrador está revisando tu información."
            : isEditMode
              ? "Modifica lo que necesites y envía a revisión."
              : "Valida tu identidad para habilitar reservas. Los contratos de cada evento los diseña el músico.";
    const timelineBadge =
        isEditMode || profile?.status === "draft"
            ? "Edición de perfil"
            : "Verificación de contratista";

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
            {profile?.status === "published" && isEditingVerified ? (
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        variant="light"
                        radius="lg"
                        onPress={() => {
                            setIsEditingVerified(false);
                            setActiveStep(0);
                        }}
                    >
                        Volver a vista previa
                    </Button>
                </div>
            ) : null}

            <ContractorProfileWizardStepper
                activeStep={activeStep}
                validation={displayValidation}
                onStepSelect={setActiveStep}
                rejectionReason={profile?.rejection_reason}
                heading={timelineHeading}
                subtitle={timelineSubtitle}
                badgeLabel={timelineBadge}
            />

            <div className="flex flex-col gap-6">
                    <Card className="border border-default-200/70 shadow-soft">
                        <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6 pb-0">
                            <div className="flex items-center gap-3">
                                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                                    <Icon icon={currentStepDef.icon} width={24} height={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-default-500">
                                        Paso {activeStep + 1} de {CONTRACTOR_WIZARD_STEPS.length}
                                    </p>
                                    <h2 className="text-xl font-bold">{currentStepDef.title}</h2>
                                </div>
                            </div>
                            <p className="text-sm text-default-500 mt-2">{currentStepDef.description}</p>
                            {currentValidationStep ? (
                                currentValidationStep.completed ? (
                                    <div className="mt-3 w-full rounded-2xl border border-success/30 bg-success/10 px-3 py-2.5 flex items-center gap-2">
                                        <Icon
                                            icon="material-symbols:check-circle"
                                            width={18}
                                            className="text-success shrink-0"
                                        />
                                        <p className="text-sm text-success font-medium">
                                            Este paso está completo
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-3 w-full rounded-2xl border border-warning/40 bg-warning/10 px-3 py-2.5">
                                        <div className="flex items-start gap-2">
                                            <Icon
                                                icon="material-symbols:error-outline"
                                                width={18}
                                                className="text-warning shrink-0 mt-0.5"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {isEditMode
                                                        ? "Falta información obligatoria"
                                                        : "Completa este paso para continuar"}
                                                </p>
                                                {currentValidationStep.missing.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {currentValidationStep.missing.map(
                                                            (field) => (
                                                                <Chip
                                                                    key={field}
                                                                    size="sm"
                                                                    color="warning"
                                                                    variant="flat"
                                                                >
                                                                    {labelProfileField(field)}
                                                                </Chip>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : null}
                        </CardHeader>
                        <CardBody className="p-6">{renderStepContent()}</CardBody>
                    </Card>

                    <div className="sticky bottom-4 z-10 rounded-4xl border border-default-200/70 bg-content1/90 backdrop-blur-xl p-4 shadow-elevated flex flex-wrap items-center justify-between gap-3">
                        <Button
                            variant="flat"
                            isDisabled={activeStep === 0 && !canReturnToPreview}
                            onPress={() => {
                                if (canReturnToPreview) {
                                    setIsEditingVerified(false);
                                    setActiveStep(0);
                                    return;
                                }
                                setActiveStep((current) => Math.max(0, current - 1));
                            }}
                            startContent={
                                <Icon icon="material-symbols:arrow-back" width={20} height={20} />
                            }
                        >
                            {canReturnToPreview ? "Volver" : "Anterior"}
                        </Button>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="bordered"
                                isLoading={isSaving}
                                isDisabled={isSubmitting}
                                onPress={() => handleSave()}
                            >
                                Guardar cambios
                            </Button>

                            {!isLastStep && !isEditMode ? (
                                <Button
                                    color="primary"
                                    isLoading={isSaving}
                                    isDisabled={!isCurrentStepComplete}
                                    onPress={handleNext}
                                    endContent={
                                        <Icon
                                            icon="material-symbols:arrow-forward"
                                            width={20}
                                            height={20}
                                        />
                                    }
                                >
                                    Guardar y continuar
                                </Button>
                            ) : null}

                            {!isLastStep && isEditMode ? (
                                <Button
                                    variant="flat"
                                    isLoading={isSaving}
                                    isDisabled={isSubmitting}
                                    onPress={handleNext}
                                    endContent={
                                        <Icon
                                            icon="material-symbols:arrow-forward"
                                            width={20}
                                            height={20}
                                        />
                                    }
                                >
                                    Siguiente
                                </Button>
                            ) : null}

                            {canShowSubmit ? (
                                <Button
                                    color={canSubmitNow ? "primary" : "secondary"}
                                    isLoading={isSubmitting}
                                    isDisabled={submitDisabled}
                                    onPress={handleSubmitProfile}
                                    startContent={
                                        canSubmitNow ? (
                                            <Icon
                                                icon="material-symbols:send"
                                                width={18}
                                            />
                                        ) : undefined
                                    }
                                >
                                    Enviar a revisión
                                </Button>
                            ) : null}
                        </div>
                    </div>
            </div>
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}
