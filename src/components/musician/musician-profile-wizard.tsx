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
import ChipListInput from "@/components/ui/chip-list-input";
import FileUploadField from "@/components/ui/file-upload-field";
import SignaturePad from "@/components/ui/signature-pad";
import RepertoireListInput from "@/components/ui/repertoire-list-input";
import MusicianVerifiedPreview from "@/components/musician/musician-verified-preview";
import ChangePasswordModal from "@/components/profile/change-password-modal";
import ProfileWizardStepper, {
    WIZARD_STEPS,
} from "@/components/musician/profile-wizard/profile-wizard-stepper";
import ContractDesigner from "@/components/musician/profile-wizard/contract-designer";
import { getInitialStepIndex } from "@/components/musician/profile-wizard/constants";
import {
    ensureTitleHeading,
    extractTitleFromHtml,
    getContractDesignerConfig,
    normalizeContractBodyToHtml,
} from "@/lib/contract-templates";
import { COMMON_INSTRUMENTS, getInstrumentIcon } from "@/lib/instrument-icons";
import { createAvailability, deleteAvailability, getMyAvailability } from "@/lib/availability";
import { AVAILABILITY_DAY_LABELS, findOverlappingSlot } from "@/lib/availability-calendar";
import { createMedia, deleteMedia, getMyMedia } from "@/lib/media";
import {
    generateMusicianContractPdf,
    getMusicianProfile,
    getMusicianProfileStatus,
    submitMusicianProfile,
    updateMusicianProfile,
} from "@/lib/profiles";
import { resolveUploadUrl, uploadSignatureDataUrl } from "@/lib/uploads";
import {
    getVideoEmbedUrl,
    getVideoPlatformLabel,
    getYoutubeThumbnailUrl,
    isSupportedVideoUrl,
    isValidSocialUrl,
    normalizeUrl,
} from "@/lib/video-urls";
import {
    collectMissingFieldLabels,
    labelProfileField,
} from "@/lib/profile-validation/field-labels";
import { validateMusicianForm } from "@/lib/profile-validation/musician";
import { useAuth } from "@/contexts/auth-context";
import type {
    AvailabilityOut,
    AvailabilityType,
    MusicianMediaOut,
    MusicianProfileOut,
    MusicianProfileUpdate,
    ProfileValidationOut,
    RepertoireItem,
} from "@/types/api";

function repertoireFromProfile(profileData: MusicianProfileOut): RepertoireItem[] {
    if (profileData.repertoire?.length) {
        return profileData.repertoire.map((item) => ({
            title: item.title,
            youtube_url: item.youtube_url ?? null,
        }));
    }
    return (profileData.songs ?? []).map((title) => ({
        title,
        youtube_url: null,
    }));
}

const dayLabels = AVAILABILITY_DAY_LABELS;

const INSTRUMENT_SUGGESTIONS = COMMON_INSTRUMENTS.map((label) => ({
    label,
    icon: getInstrumentIcon(label),
}));

const SOCIAL_FIELDS = [
    {
        key: "instagram_url" as const,
        label: "Instagram",
        placeholder: "https://instagram.com/tu_usuario",
        icon: "mdi:instagram",
    },
    {
        key: "facebook_url" as const,
        label: "Facebook",
        placeholder: "https://facebook.com/tu_pagina",
        icon: "mdi:facebook",
    },
    {
        key: "tiktok_url" as const,
        label: "TikTok",
        placeholder: "https://tiktok.com/@tu_usuario",
        icon: "mdi:tiktok",
    },
    {
        key: "youtube_channel_url" as const,
        label: "YouTube",
        placeholder: "https://youtube.com/@tu_canal",
        icon: "mdi:youtube",
    },
    {
        key: "spotify_url" as const,
        label: "Spotify",
        placeholder: "https://open.spotify.com/artist/...",
        icon: "mdi:spotify",
    },
    {
        key: "website_url" as const,
        label: "Sitio web",
        placeholder: "https://tu-sitio.com",
        icon: "material-symbols:language",
    },
];

export default function MusicianProfileWizard() {
    const { user, refresh } = useAuth();
    const [profile, setProfile] = useState<MusicianProfileOut | null>(null);
    const [validation, setValidation] = useState<ProfileValidationOut | null>(null);
    const [isEditingVerified, setIsEditingVerified] = useState(false);
    const [availability, setAvailability] = useState<AvailabilityOut[]>([]);
    const [media, setMedia] = useState<MusicianMediaOut[]>([]);
    const [activeStep, setActiveStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [username, setUsername] = useState("");
    const [usernameCheck, setUsernameCheck] = useState<{available: boolean, message: string} | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [fullname, setFullname] = useState("");
    const [email, setEmail] = useState("");
    const [stageName, setStageName] = useState("");
    const [bio, setBio] = useState("");
    const [genres, setGenres] = useState<string[]>([]);
    const [instruments, setInstruments] = useState<string[]>([]);
    const [repertoire, setRepertoire] = useState<RepertoireItem[]>([]);
    const [locationCity, setLocationCity] = useState("");
    const [locationZone, setLocationZone] = useState("");
    const [pricePerHour, setPricePerHour] = useState("");
    const [pricePerEvent, setPricePerEvent] = useState("");
    const [availabilityType, setAvailabilityType] = useState<AvailabilityType>("both");
    const [portfolioDescription, setPortfolioDescription] = useState("");
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [showreelVideoUrl, setShowreelVideoUrl] = useState<string | null>(null);
    const [videoDraft, setVideoDraft] = useState("");
    const [instagramUrl, setInstagramUrl] = useState("");
    const [facebookUrl, setFacebookUrl] = useState("");
    const [tiktokUrl, setTiktokUrl] = useState("");
    const [youtubeChannelUrl, setYoutubeChannelUrl] = useState("");
    const [spotifyUrl, setSpotifyUrl] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
    const [contractTitle, setContractTitle] = useState("");
    const [contractBody, setContractBody] = useState("");
    const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

    const [payoutMethod, setPayoutMethod] = useState<string>("bank_transfer");
    const [payoutBankName, setPayoutBankName] = useState("");
    const [payoutAccountNumber, setPayoutAccountNumber] = useState("");
    const [payoutCci, setPayoutCci] = useState("");
    const [payoutPhone, setPayoutPhone] = useState("");
    const [payoutBeneficiaryName, setPayoutBeneficiaryName] = useState("");
    const [payoutBeneficiaryDocument, setPayoutBeneficiaryDocument] = useState("");
    const [payoutMpEmail, setPayoutMpEmail] = useState("");

    const [availabilityDay, setAvailabilityDay] = useState("1");

    const [availabilityStart, setAvailabilityStart] = useState("18:00");
    const [availabilityEnd, setAvailabilityEnd] = useState("22:00");

    const currentStepDef = WIZARD_STEPS[activeStep];
    const mediaImageCount = useMemo(
        () => media.filter((item) => item.type === "image").length,
        [media],
    );
    const liveValidation = useMemo(() => {
        if (!validation) return null;
        return validateMusicianForm(
            {
                username,
                fullname,
                stageName,
                bio,
                genres,
                instruments,
                songs: repertoire.map((item) => item.title),
                repertoire,
                locationCity,
                locationZone,
                pricePerHour,
                pricePerEvent,
                availabilityType,
                profileImageUrl,
                videoUrls,
                instagramUrl,
                facebookUrl,
                tiktokUrl,
                youtubeChannelUrl,
                spotifyUrl,
                websiteUrl,
                idDocumentUrl,
                contractBody,
                signatureImageUrl: signatureDataUrl || signatureImageUrl,
                mediaImageCount,
                availabilityCount: availability.length,
            },
            validation.status,
            validation.is_public,
        );
    }, [
        validation,
        username,
        fullname,
        stageName,
        bio,
        genres,
        instruments,
        repertoire,
        locationCity,
        locationZone,
        pricePerHour,
        pricePerEvent,
        availabilityType,
        profileImageUrl,
        videoUrls,
        instagramUrl,
        facebookUrl,
        tiktokUrl,
        youtubeChannelUrl,
        spotifyUrl,
        websiteUrl,
        idDocumentUrl,
        contractBody,
        signatureImageUrl,
        signatureDataUrl,
        mediaImageCount,
        availability.length,
    ]);
    const displayValidation = liveValidation ?? validation;

    function applyProfileData(profileData: MusicianProfileOut) {
        setUsername(profileData.username || user?.username || profileData.slug || "");
        setFullname(profileData.fullname || user?.fullname || "");
        setEmail(profileData.email || user?.email || "");
        setStageName(profileData.stage_name ?? "");
        setBio(profileData.bio ?? "");
        setGenres(profileData.genres ?? []);
        setInstruments(profileData.instruments ?? []);
        setRepertoire(repertoireFromProfile(profileData));
        setLocationCity(profileData.location_city ?? "");
        setLocationZone(profileData.location_zone ?? "");
        setPricePerHour(profileData.price_per_hour?.toString() ?? "");
        setPricePerEvent(profileData.price_per_event?.toString() ?? "");
        setAvailabilityType(profileData.availability_type ?? "both");
        setPortfolioDescription(profileData.portfolio_description ?? "");
        setProfileImageUrl(profileData.profile_image_url);
        setVideoUrls(profileData.videos ?? []);
        setShowreelVideoUrl(profileData.showreel_video_url ?? null);
        setInstagramUrl(profileData.instagram_url ?? "");
        setFacebookUrl(profileData.facebook_url ?? "");
        setTiktokUrl(profileData.tiktok_url ?? "");
        setYoutubeChannelUrl(profileData.youtube_channel_url ?? "");
        setSpotifyUrl(profileData.spotify_url ?? "");
        setWebsiteUrl(profileData.website_url ?? "");
        setIdDocumentUrl(profileData.id_document_url);
        setSignatureImageUrl(profileData.signature_image_url);
        setSignatureDataUrl(null);
        setPayoutMethod(profileData.payout_method || "bank_transfer");
        setPayoutBankName(profileData.payout_bank_name || "");
        setPayoutAccountNumber(profileData.payout_account_number || "");
        setPayoutCci(profileData.payout_cci || "");
        setPayoutPhone(profileData.payout_phone || "");
        setPayoutBeneficiaryName(profileData.payout_beneficiary_name || "");
        setPayoutBeneficiaryDocument(profileData.payout_beneficiary_document || "");
        setPayoutMpEmail(profileData.payout_mp_email || "");
        const normalizedBody = normalizeContractBodyToHtml(profileData.contract_template_body);
        const fallbackTitle =
            profileData.contract_template_title ||
            getContractDesignerConfig("musician").defaultTitle;
        const bodyWithTitle = ensureTitleHeading(normalizedBody, fallbackTitle);
        setContractTitle(
            profileData.contract_template_title || extractTitleFromHtml(bodyWithTitle, fallbackTitle),
        );
        setContractBody(bodyWithTitle);
    }

    function buildPayload(): MusicianProfileUpdate {
        return {
            username: username.trim() || null,
            fullname: fullname.trim() || null,
            stage_name: stageName,
            bio,
            genres,
            instruments,
            repertoire,
            songs: repertoire.map((item) => item.title),
            location_city: locationCity,
            location_zone: locationZone,
            price_per_hour:
                availabilityType === "per_event"
                    ? null
                    : pricePerHour
                      ? Number(pricePerHour)
                      : null,
            price_per_event:
                availabilityType === "hourly"
                    ? null
                    : pricePerEvent
                      ? Number(pricePerEvent)
                      : null,
            availability_type: availabilityType,
            portfolio_description: portfolioDescription,
            profile_image_url: profileImageUrl,
            videos: videoUrls,
            showreel_video_url:
                showreelVideoUrl && videoUrls.includes(showreelVideoUrl)
                    ? showreelVideoUrl
                    : null,
            instagram_url: instagramUrl.trim() || null,
            facebook_url: facebookUrl.trim() || null,
            tiktok_url: tiktokUrl.trim() || null,
            youtube_channel_url: youtubeChannelUrl.trim() || null,
            spotify_url: spotifyUrl.trim() || null,
            website_url: websiteUrl.trim() || null,
            id_document_url: idDocumentUrl,
            contract_template_title: contractTitle,
            contract_template_body: contractBody,
            signature_image_url: signatureImageUrl,
            payout_method: payoutMethod || null,
            payout_bank_name: payoutBankName.trim() || null,
            payout_account_number: payoutAccountNumber.trim() || null,
            payout_cci: payoutCci.trim() || null,
            payout_phone: payoutPhone.trim() || null,
            payout_beneficiary_name: payoutBeneficiaryName.trim() || null,
            payout_beneficiary_document: payoutBeneficiaryDocument.trim() || null,
            payout_mp_email: payoutMpEmail.trim() || null,
        };
    }


    async function resolveSignatureForSave(): Promise<string | null> {
        if (signatureDataUrl) {
            const uploaded = await uploadSignatureDataUrl(
                signatureDataUrl,
                "firma-musico",
            );
            setSignatureImageUrl(uploaded);
            setSignatureDataUrl(null);
            return uploaded;
        }
        return signatureImageUrl;
    }

    async function refreshValidation() {
        const statusData = await getMusicianProfileStatus();
        setValidation(statusData);
        return statusData;
    }

    async function refreshProfileState() {
        const [profileData, statusData] = await Promise.all([
            getMusicianProfile(),
            getMusicianProfileStatus(),
        ]);
        setProfile(profileData);
        setValidation(statusData);
        if (profileData.status !== "published") {
            setIsEditingVerified(true);
        }
        return profileData;
    }

    async function loadData() {
        setIsLoading(true);
        setLoadError(null);
        try {
            const [profileData, statusData] = await Promise.all([
                getMusicianProfile(),
                getMusicianProfileStatus(),
            ]);
            setProfile(profileData);
            setValidation(statusData);
            applyProfileData(profileData);
            setActiveStep(getInitialStepIndex(statusData.steps));

            const [availabilityData, mediaData] = await Promise.all([
                getMyAvailability().catch(() => [] as AvailabilityOut[]),
                getMyMedia().catch(() => [] as MusicianMediaOut[]),
            ]);
            setAvailability(availabilityData);
            setMedia(mediaData);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudo cargar tu perfil de músico.";
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
            const resolvedSignature = await resolveSignatureForSave();
            const updated = await updateMusicianProfile({
                ...buildPayload(),
                signature_image_url: resolvedSignature,
            });
            setProfile(updated);
            setSignatureImageUrl(updated.signature_image_url);
            await refresh();
            const statusData = await refreshValidation();
            if (wasPublished && updated.status === "draft") {
                setIsEditingVerified(true);
            }
            if (showToast) {
                if (wasPublished && updated.status === "draft") {
                    addToast({
                        title: "Perfil en borrador",
                        description: statusData.can_submit
                            ? "Tus cambios quitaron la publicación. Ya puedes enviar a revisión sin recorrer los demás pasos."
                            : "Tus cambios quitaron la publicación. Completa los campos obligatorios pendientes y envía a revisión.",
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
        if (activeStep < WIZARD_STEPS.length - 1) {
            setActiveStep((current) => current + 1);
            addToast({
                title: "Paso guardado",
                description: `Continúa con "${WIZARD_STEPS[activeStep + 1].title}".`,
                color: "success",
            });
        }
    }

    async function handleSubmitProfile() {
        setIsSubmitting(true);
        try {
            // Guarda el cambio actual y valida contra el estado persistido.
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

            const updated = await submitMusicianProfile();
            setProfile(updated);
            await refreshValidation();
            addToast({
                title: "Perfil enviado",
                description: "Tu perfil fue enviado a revisión manual.",
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

    async function handleGeneratePdf() {
        setIsGeneratingPdf(true);
        try {
            const saved = await handleSave(false);
            if (!saved) return;
            const result = await generateMusicianContractPdf();
            setProfile((current) =>
                current ? { ...current, contract_pdf_url: result.contract_pdf_url } : current,
            );
            addToast({
                title: "PDF generado",
                description: "Tu contrato PDF fue generado correctamente.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "Error al generar PDF",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsGeneratingPdf(false);
        }
    }

    async function handleAddAvailability() {
        const dayOfWeek = Number(availabilityDay);

        if (availabilityEnd <= availabilityStart) {
            addToast({
                title: "Horario inválido",
                description: "La hora de fin debe ser mayor que la hora de inicio.",
                color: "warning",
            });
            return;
        }

        const overlap = findOverlappingSlot(
            availability,
            dayOfWeek,
            availabilityStart,
            availabilityEnd,
        );
        if (overlap) {
            addToast({
                title: "Horario repetido",
                description: `Ya tienes disponibilidad los ${dayLabels[dayOfWeek]} de ${overlap.start_time.slice(0, 5)} a ${overlap.end_time.slice(0, 5)} que se cruza con este horario.`,
                color: "warning",
            });
            return;
        }

        try {
            const created = await createAvailability({
                day_of_week: dayOfWeek,
                start_time: availabilityStart,
                end_time: availabilityEnd,
            });
            setAvailability((current) => [...current, created]);
            await refreshValidation();
        } catch (error) {
            addToast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "No se pudo agregar la disponibilidad.",
                color: "danger",
            });
        }
    }

    async function handleDeleteAvailability(id: string) {
        await deleteAvailability(id);
        setAvailability((current) => current.filter((item) => item.id !== id));
        await refreshValidation();
    }

    async function handleUploadMediaFiles(files: File[]) {
        if (files.length === 0) return;
        const { uploadFile } = await import("@/lib/uploads");
        const uploaded: MusicianMediaOut[] = [];
        let orderIndex = media.length;
        let failedCount = 0;
        let lastErrorMessage = "";

        for (const file of files) {
            try {
                const url = await uploadFile(file);
                const created = await createMedia({
                    type: "image",
                    url,
                    order_index: orderIndex,
                });
                uploaded.push(created);
                orderIndex += 1;
            } catch (err) {
                failedCount += 1;
                if (err instanceof Error) lastErrorMessage = err.message;
            }
        }

        if (uploaded.length > 0) {
            setMedia((current) => [...current, ...uploaded]);
            await refreshProfileState();
        }

        if (failedCount === 0 && uploaded.length > 0) {
            addToast({
                title: uploaded.length > 1 ? "Fotos cargadas" : "Foto cargada",
                description: `Se ${uploaded.length > 1 ? "agregaron" : "agregó"} ${uploaded.length} ${uploaded.length > 1 ? "imágenes" : "imagen"} a tu galería.`,
                color: "success",
            });
        } else if (failedCount > 0) {
            addToast({
                title: uploaded.length > 0 ? "Algunas imágenes no se pudieron subir" : "Error al subir imágenes",
                description:
                    uploaded.length > 0
                        ? `${uploaded.length} de ${files.length} imágenes se cargaron correctamente.`
                        : lastErrorMessage || "No se pudo cargar la imagen seleccionada.",
                color: uploaded.length > 0 ? "warning" : "danger",
            });
        }
    }

    function handleAddVideoUrl() {
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
        if (!showreelVideoUrl && videoUrls.length === 0) {
            setShowreelVideoUrl(normalized);
        }
        setVideoDraft("");
    }

    function renderStepContent() {
        switch (currentStepDef.key) {
            case "identity":
                return (
                    <div className="flex flex-col gap-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nombre de usuario"
                                placeholder="Ej. mariachi-sol-de-oro"
                                description={usernameCheck ? usernameCheck.message : "Identificador único para tu URL pública."}
                                color={usernameCheck ? (usernameCheck.available ? "success" : "danger") : "default"}
                                errorMessage={usernameCheck && !usernameCheck.available ? usernameCheck.message : undefined}
                                value={username}
                                onValueChange={(val) => {
                                    setUsername(val.toLowerCase().replace(/\s+/g, "-"));
                                }}
                                variant="bordered"
                                isRequired
                            />
                            <Input
                                label="Nombre completo"
                                placeholder="Ej. Juan Pérez González"
                                description="Nombre y apellidos del titular o representante legal."
                                value={fullname}
                                onValueChange={setFullname}
                                variant="bordered"
                                isRequired
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nombre artístico"
                                placeholder="Ej. Mariachi Sol de Oro"
                                description="Es el nombre que verán los contratistas en tu perfil público."
                                value={stageName}
                                onValueChange={setStageName}
                                variant="bordered"
                                isRequired
                            />
                            <Input
                                label="Correo electrónico"
                                value={email || user?.email || ""}
                                description="Correo asociado a tu cuenta (no modificable)."
                                variant="bordered"
                                isReadOnly
                                isDisabled
                            />
                        </div>
                        <Textarea
                            label="Biografía"
                            placeholder="Cuéntanos tu experiencia, estilo y qué te hace único..."
                            description="Mínimo 40 caracteres. Sé claro y cercano."
                            value={bio}
                            onValueChange={setBio}
                            variant="bordered"
                            minRows={5}
                        />
                        <FileUploadField
                            label="Foto de perfil"
                            value={profileImageUrl}
                            onChange={setProfileImageUrl}
                            accept="image/jpeg,image/png,image/webp"
                            helperText="Usa una foto nítida, preferiblemente en horizontal."
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

            case "specialty":
                return (
                    <div className="flex flex-col gap-6">
                        <ChipListInput
                            label="Géneros musicales"
                            values={genres}
                            onChange={setGenres}
                            placeholder="Ej. Cumbia, Salsa, Rock"
                        />
                        <ChipListInput
                            label="Instrumentos"
                            values={instruments}
                            onChange={setInstruments}
                            placeholder="Ej. Guitarra, Voz, Trompeta"
                            suggestions={INSTRUMENT_SUGGESTIONS}
                        />
                        <Select
                            label="Tipo de disponibilidad"
                            description="Indica cómo prefieres cotizar tus servicios. En tu perfil solo se mostrará lo seleccionado."
                            selectedKeys={[availabilityType]}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as AvailabilityType;
                                if (!value) return;
                                setAvailabilityType(value);
                                if (value === "hourly") setPricePerEvent("");
                                if (value === "per_event") setPricePerHour("");
                            }}
                            variant="bordered"
                        >
                            <SelectItem key="hourly">Por hora</SelectItem>
                            <SelectItem key="per_event">Por evento</SelectItem>
                            <SelectItem key="both">Ambos</SelectItem>
                        </Select>
                    </div>
                );

            case "location_pricing":
                return (
                    <div className="flex flex-col gap-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Ciudad"
                                value={locationCity}
                                onValueChange={setLocationCity}
                                variant="bordered"
                            />
                            <Input
                                label="Zona / distrito"
                                value={locationZone}
                                onValueChange={setLocationZone}
                                variant="bordered"
                            />
                        </div>
                        <div
                            className={`grid grid-cols-1 gap-4 ${
                                availabilityType === "both" ? "md:grid-cols-2" : ""
                            }`}
                        >
                            {availabilityType === "hourly" ||
                            availabilityType === "both" ? (
                                <Input
                                    label="Precio por hora (S/)"
                                    value={pricePerHour}
                                    onValueChange={setPricePerHour}
                                    variant="bordered"
                                    type="number"
                                />
                            ) : null}
                            {availabilityType === "per_event" ||
                            availabilityType === "both" ? (
                                <Input
                                    label="Precio por evento (S/)"
                                    value={pricePerEvent}
                                    onValueChange={setPricePerEvent}
                                    variant="bordered"
                                    type="number"
                                />
                            ) : null}
                        </div>
                        <Textarea
                            label="Descripción del portafolio"
                            value={portfolioDescription}
                            onValueChange={setPortfolioDescription}
                            variant="bordered"
                            placeholder="Describe el tipo de eventos en los que sueles participar."
                        />

                        <div className="border-t border-default-200/80 pt-5 mt-2 flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                    <Icon
                                        icon="material-symbols:account-balance-wallet"
                                        className="text-primary text-xl"
                                    />
                                    Datos para recibir tus pagos (Desembolsos)
                                </h3>
                                <p className="text-sm text-default-500">
                                    Configura la cuenta donde Chivapp te transferirá el dinero de tus presentaciones una vez finalizado el evento. Esta información es confidencial.
                                </p>
                            </div>

                            <Select
                                label="Método de cobro preferido"
                                selectedKeys={[payoutMethod]}
                                onSelectionChange={(keys) => {
                                    const val = Array.from(keys)[0]?.toString();
                                    if (val) setPayoutMethod(val);
                                }}
                                variant="bordered"
                            >
                                <SelectItem
                                    key="bank_transfer"
                                    startContent={<Icon icon="material-symbols:account-balance" className="text-lg text-default-600" />}
                                >
                                    Transferencia bancaria / CCI
                                </SelectItem>
                                <SelectItem
                                    key="yape_plin"
                                    startContent={<Icon icon="material-symbols:smartphone" className="text-lg text-default-600" />}
                                >
                                    Billetera móvil (Yape / Plin)
                                </SelectItem>
                                <SelectItem
                                    key="mercadopago"
                                    startContent={<Icon icon="material-symbols:credit-card" className="text-lg text-default-600" />}
                                >
                                    Cuenta Mercado Pago
                                </SelectItem>
                            </Select>

                            {payoutMethod === "bank_transfer" && (
                                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-default-50/50 border border-default-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Banco"
                                            placeholder="Ej. BCP, BBVA, Interbank, Scotiabank"
                                            value={payoutBankName}
                                            onValueChange={setPayoutBankName}
                                            variant="bordered"
                                        />
                                        <Input
                                            label="Número de cuenta bancaria"
                                            placeholder="Ej. 193-xxxxxxxx-x-xx"
                                            value={payoutAccountNumber}
                                            onValueChange={setPayoutAccountNumber}
                                            variant="bordered"
                                        />
                                    </div>
                                    <Input
                                        label="Código de Cuenta Interbancario (CCI)"
                                        placeholder="20 dígitos (ej. 002193xxxxxxxxxxxxxx)"
                                        value={payoutCci}
                                        onValueChange={setPayoutCci}
                                        variant="bordered"
                                        description="Recomendado para transferencias inmediatas desde cualquier entidad."
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Nombre del titular de la cuenta"
                                            placeholder="Nombre completo o razón social"
                                            value={payoutBeneficiaryName}
                                            onValueChange={setPayoutBeneficiaryName}
                                            variant="bordered"
                                        />
                                        <Input
                                            label="DNI o RUC del titular"
                                            placeholder="Ej. 72345678 o 20601234567"
                                            value={payoutBeneficiaryDocument}
                                            onValueChange={setPayoutBeneficiaryDocument}
                                            variant="bordered"
                                        />
                                    </div>
                                </div>
                            )}

                            {payoutMethod === "yape_plin" && (
                                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-default-50/50 border border-default-200">
                                    <Input
                                        label="Número de celular registrado en Yape / Plin"
                                        placeholder="987654321"
                                        value={payoutPhone}
                                        onValueChange={setPayoutPhone}
                                        variant="bordered"
                                        type="tel"
                                        maxLength={15}
                                        startContent={<span className="text-default-400 text-sm font-semibold">+51</span>}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Nombre del titular en Yape / Plin"
                                            placeholder="Tal como aparece registrado"
                                            value={payoutBeneficiaryName}
                                            onValueChange={setPayoutBeneficiaryName}
                                            variant="bordered"
                                        />
                                        <Input
                                            label="DNI del titular"
                                            placeholder="Ej. 72345678"
                                            value={payoutBeneficiaryDocument}
                                            onValueChange={setPayoutBeneficiaryDocument}
                                            variant="bordered"
                                        />
                                    </div>
                                </div>
                            )}

                            {payoutMethod === "mercadopago" && (
                                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-default-50/50 border border-default-200">
                                    <Input
                                        label="Correo electrónico de Mercado Pago"
                                        placeholder="usuario@ejemplo.com"
                                        value={payoutMpEmail}
                                        onValueChange={setPayoutMpEmail}
                                        variant="bordered"
                                        type="email"
                                    />
                                    <Input
                                        label="Nombre del titular de la cuenta"
                                        placeholder="Nombre registrado en Mercado Pago"
                                        value={payoutBeneficiaryName}
                                        onValueChange={setPayoutBeneficiaryName}
                                        variant="bordered"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );


            case "repertoire":
                return (
                    <RepertoireListInput
                        values={repertoire}
                        onChange={setRepertoire}
                    />
                );

            case "media":
                return (
                    <div className="flex flex-col gap-6">
                        <div>
                            <p className="text-sm font-medium mb-3">Galería de fotos</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {media
                                    .filter((item) => item.type === "image")
                                    .map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-2xl border border-default-200 overflow-hidden"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={resolveUploadUrl(item.url) ?? item.url}
                                                alt="Foto del portafolio"
                                                className="h-44 w-full object-cover"
                                            />
                                            <div className="p-3">
                                                <Button
                                                    size="sm"
                                                    color="danger"
                                                    variant="flat"
                                                    onPress={async () => {
                                                        await deleteMedia(item.id);
                                                        setMedia((current) =>
                                                            current.filter(
                                                                (entry) => entry.id !== item.id,
                                                            ),
                                                        );
                                                        await refreshProfileState();
                                                    }}
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            <Button
                                className="mt-4"
                                variant="flat"
                                startContent={
                                    <Icon icon="material-symbols:add-photo-alternate" width={20} />
                                }
                                onPress={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.accept = "image/jpeg,image/png,image/webp";
                                    input.multiple = true;
                                    input.onchange = async () => {
                                        const files = input.files ? Array.from(input.files) : [];
                                        if (files.length > 0) await handleUploadMediaFiles(files);
                                    };
                                    input.click();
                                }}
                            >
                                Subir fotos
                            </Button>
                            <p className="text-xs text-default-400 mt-2">
                                Puedes seleccionar varias imágenes a la vez.
                            </p>
                        </div>

                        <div className="border-t border-default-200 pt-6">
                            <p className="text-sm font-medium mb-1">Videos (YouTube / Vimeo)</p>
                            <p className="text-xs text-default-500 mb-4">
                                Pega enlaces de YouTube o Vimeo. Marca cuál aparece en la vista
                                principal del perfil (showreel). El resto se muestra en Studio &amp;
                                Live Portafolio.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={videoDraft}
                                    onValueChange={setVideoDraft}
                                    variant="bordered"
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            handleAddVideoUrl();
                                        }
                                    }}
                                />
                                <Button color="primary" variant="flat" onPress={handleAddVideoUrl}>
                                    Agregar video
                                </Button>
                            </div>
                            <div className="mt-4 flex flex-col gap-3">
                                {videoUrls.map((url, index) => {
                                    const embedUrl = getVideoEmbedUrl(url);
                                    const thumb = getYoutubeThumbnailUrl(url);
                                    const isShowreel =
                                        showreelVideoUrl === url ||
                                        (!showreelVideoUrl && index === 0);
                                    return (
                                        <div
                                            key={url}
                                            className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl border p-3 ${
                                                isShowreel
                                                    ? "border-primary/50 bg-primary/5"
                                                    : "border-default-200"
                                            }`}
                                        >
                                            {embedUrl ? (
                                                <div className="h-28 w-full sm:w-44 rounded-lg overflow-hidden bg-default-900 shrink-0">
                                                    <iframe
                                                        src={embedUrl}
                                                        title="Vista previa del video"
                                                        className="h-full w-full"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                </div>
                                            ) : thumb ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={thumb}
                                                    alt="Miniatura del video"
                                                    className="h-28 w-full sm:w-44 rounded-lg object-cover shrink-0"
                                                />
                                            ) : (
                                                <div className="h-28 w-full sm:w-44 rounded-lg bg-default-100 flex items-center justify-center shrink-0">
                                                    <Icon
                                                        icon="material-symbols:play-circle"
                                                        width={28}
                                                    />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <Chip size="sm" variant="flat">
                                                        {getVideoPlatformLabel(url)}
                                                    </Chip>
                                                    {isShowreel ? (
                                                        <Chip size="sm" color="primary" variant="flat">
                                                            Vista principal
                                                        </Chip>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm truncate">{url}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {!isShowreel ? (
                                                    <Button
                                                        size="sm"
                                                        variant="flat"
                                                        color="primary"
                                                        onPress={() => setShowreelVideoUrl(url)}
                                                    >
                                                        Usar en vista principal
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="danger"
                                                    onPress={() => {
                                                        setVideoUrls((current) =>
                                                            current.filter((item) => item !== url),
                                                        );
                                                        setShowreelVideoUrl((current) =>
                                                            current === url ? null : current,
                                                        );
                                                    }}
                                                >
                                                    <Icon icon="material-symbols:delete" width={20} />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );

            case "social":
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-default-500">
                            Agrega al menos una red social o sitio web para que los contratistas
                            puedan conocerte mejor.
                        </p>
                        {SOCIAL_FIELDS.map((field) => {
                            const valueMap = {
                                instagram_url: instagramUrl,
                                facebook_url: facebookUrl,
                                tiktok_url: tiktokUrl,
                                youtube_channel_url: youtubeChannelUrl,
                                spotify_url: spotifyUrl,
                                website_url: websiteUrl,
                            };
                            const setters = {
                                instagram_url: setInstagramUrl,
                                facebook_url: setFacebookUrl,
                                tiktok_url: setTiktokUrl,
                                youtube_channel_url: setYoutubeChannelUrl,
                                spotify_url: setSpotifyUrl,
                                website_url: setWebsiteUrl,
                            };
                            const value = valueMap[field.key];
                            const setValue = setters[field.key];
                            const isInvalid = value.trim().length > 0 && !isValidSocialUrl(value);

                            return (
                                <Input
                                    key={field.key}
                                    label={field.label}
                                    placeholder={field.placeholder}
                                    value={value}
                                    onValueChange={setValue}
                                    variant="bordered"
                                    isInvalid={isInvalid}
                                    errorMessage={
                                        isInvalid ? "Ingresa una URL válida" : undefined
                                    }
                                    startContent={
                                        <Icon icon={field.icon} width={20} className="text-default-400" />
                                    }
                                />
                            );
                        })}
                    </div>
                );

            case "availability":
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-default-500">
                            Estos horarios definen qué días y franjas verá el contratista
                            en el calendario al solicitar una reserva. Si solo agregas un
                            día (por ejemplo sábado), solo ese día quedará seleccionable.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <Select
                                label="Día"
                                selectedKeys={[availabilityDay]}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0]?.toString();
                                    if (value) setAvailabilityDay(value);
                                }}
                                variant="bordered"
                            >
                                {dayLabels.map((label, index) => (
                                    <SelectItem key={String(index)}>{label}</SelectItem>
                                ))}
                            </Select>
                            <Input
                                label="Inicio"
                                type="time"
                                value={availabilityStart}
                                onValueChange={setAvailabilityStart}
                                variant="bordered"
                            />
                            <Input
                                label="Fin"
                                type="time"
                                value={availabilityEnd}
                                onValueChange={setAvailabilityEnd}
                                variant="bordered"
                            />
                            <div className="flex items-end">
                                <Button color="primary" onPress={handleAddAvailability}>
                                    Agregar horario
                                </Button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {availability.map((slot) => (
                                <div
                                    key={slot.id}
                                    className="flex items-center justify-between rounded-2xl border border-default-200 px-4 py-3"
                                >
                                    <span className="text-sm">
                                        {dayLabels[slot.day_of_week]} · {slot.start_time} -{" "}
                                        {slot.end_time}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="light"
                                        color="danger"
                                        onPress={() => handleDeleteAvailability(slot.id)}
                                    >
                                        Eliminar
                                    </Button>
                                </div>
                            ))}
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

            case "contract":
                return (
                    <div className="flex flex-col gap-6">
                        <ContractDesigner
                            variant="musician"
                            title={contractTitle}
                            body={contractBody}
                            resetKey={profile?.updated_at ?? profile?.id ?? "new"}
                            stageName={stageName}
                            artistEmail={user?.email ?? ""}
                            artistPhone={user?.phone ?? null}
                            pricePerHour={pricePerHour}
                            pricePerEvent={pricePerEvent}
                            pdfUrl={profile?.contract_pdf_url ?? null}
                            isGeneratingPdf={isGeneratingPdf}
                            onTitleChange={setContractTitle}
                            onBodyChange={setContractBody}
                            onGeneratePdf={handleGeneratePdf}
                        />
                        <div className="rounded-2xl border border-default-200 bg-default-50/60 p-4 flex flex-col gap-4">
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    Tu firma digital
                                </h3>
                                <p className="text-sm text-default-500 mt-1">
                                    Esta firma se insertará automáticamente en el PDF de
                                    cada contrata que generes (lado del artista).
                                </p>
                            </div>
                            {signatureImageUrl && !signatureDataUrl ? (
                                <div className="flex flex-col gap-3">
                                    <div className="overflow-hidden rounded-2xl border border-default-200 bg-white p-4 max-w-md">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={
                                                resolveUploadUrl(signatureImageUrl) ||
                                                signatureImageUrl
                                            }
                                            alt="Firma del músico"
                                            className="max-h-28 w-full object-contain"
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        radius="lg"
                                        className="w-fit"
                                        onPress={() => {
                                            setSignatureImageUrl(null);
                                            setSignatureDataUrl(null);
                                        }}
                                    >
                                        Cambiar firma
                                    </Button>
                                </div>
                            ) : (
                                <SignaturePad
                                    value={signatureDataUrl}
                                    onChange={setSignatureDataUrl}
                                    label="Dibuja tu firma"
                                    helperText="Usa el mouse o el dedo. Se guardará con tu plantilla de contrato."
                                />
                            )}
                        </div>
                    </div>
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
                        <h1 className="text-2xl font-bold">Completa tu perfil de músico</h1>
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
        const mediaGalleryUrls = media
            .filter((item) => item.type === "image")
            .map((item) => item.url);

        return (
            <MusicianVerifiedPreview
                profile={profile}
                mediaGalleryUrls={mediaGalleryUrls}
                onEdit={() => {
                    setActiveStep(0);
                    setIsEditingVerified(true);
                    addToast({
                        title: "Modo edición",
                        description:
                            "Si guardas cambios, el perfil dejará de ser público hasta nueva aprobación.",
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
    const isCurrentStepRequired = currentValidationStep?.required !== false
        && currentStepDef.required !== false;
    const isLastStep = activeStep === WIZARD_STEPS.length - 1;
    // Perfil ya creado/revisado: un solo cambio basta para reenviar (sin recorrer pasos).
    const isEditMode =
        isEditingVerified ||
        profile?.status === "rejected" ||
        profile?.status === "published" ||
        Boolean(profile?.submitted_at) ||
        Boolean(profile?.published_at);
    const isReReview = isEditMode || profile?.status === "draft";
    const canReturnToPreview =
        isEditingVerified && profile?.status === "published" && activeStep === 0;
    const canShowSubmit =
        isEditMode || displayValidation.can_submit || isLastStep;
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
            ? "Un administrador está revisando tu información. Podrás volver a editar si te lo solicitan."
            : isEditMode
              ? "Solo son obligatorios Identidad, Especialidad y Documento. El resto es opcional."
              : "Completa Identidad, Especialidad y Documento para enviar a revisión. El resto es opcional y puedes hacerlo después.";
    const timelineBadge =
        isReReview && profile?.status !== "pending_review"
            ? "Edición de perfil"
            : "Onboarding de músico";

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
            <div className="flex justify-end gap-2">
                {user?.is_ensemble_member && profile?.status === "draft" && !profile?.is_ensemble_only ? (
                    <Button
                        size="sm"
                        variant="bordered"
                        color="danger"
                        radius="lg"
                        isLoading={isSaving}
                        onPress={async () => {
                            if (!window.confirm("¿Estás seguro que deseas descartar el Perfil PRO y volver a tu perfil básico de integrante?")) return;
                            try {
                                setIsSaving(true);
                                await updateMusicianProfile({ is_ensemble_only: true });
                                window.location.reload();
                            } catch (e) {
                                addToast({ title: "Error", description: "No se pudo volver a perfil básico", color: "danger" });
                                setIsSaving(false);
                            }
                        }}
                    >
                        Volver a perfil básico
                    </Button>
                ) : null}
                {profile?.status === "published" && isEditingVerified ? (
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
                ) : null}
            </div>

            <ProfileWizardStepper
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
                                        Paso {activeStep + 1} de {WIZARD_STEPS.length}
                                        {isCurrentStepRequired ? "" : " · Opcional"}
                                    </p>
                                    <h2 className="text-xl font-bold">{currentStepDef.title}</h2>
                                </div>
                            </div>
                            <p className="text-sm text-default-500 mt-2">
                                {currentStepDef.description}
                            </p>
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
                                ) : isCurrentStepRequired ? (
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
                                ) : (
                                    <div className="mt-3 w-full rounded-2xl border border-default-200 bg-default-50/80 px-3 py-2.5 flex items-center gap-2">
                                        <Icon
                                            icon="material-symbols:info-outline"
                                            width={18}
                                            className="text-default-500 shrink-0"
                                        />
                                        <p className="text-sm text-default-600">
                                            Paso opcional. Puedes saltarlo y completarlo después.
                                        </p>
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
                                    isDisabled={
                                        isCurrentStepRequired && !isCurrentStepComplete
                                    }
                                    onPress={handleNext}
                                    endContent={
                                        <Icon
                                            icon="material-symbols:arrow-forward"
                                            width={20}
                                            height={20}
                                        />
                                    }
                                >
                                    {isCurrentStepRequired
                                        ? "Guardar y continuar"
                                        : "Continuar"}
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
