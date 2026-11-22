"use client";

import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import VerifiedBadge from "@/components/ui/verified-badge";
import { resolveUploadUrl } from "@/lib/uploads";
import type { ContractorProfileOut } from "@/types/api";

type Props = {
    profile: ContractorProfileOut;
    fullname?: string | null;
    email?: string | null;
    onEdit: () => void;
};

function maskDocument(value: string | null): string {
    if (!value) return "—";
    if (value.length <= 4) return value;
    return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export default function ContractorVerifiedPreview({
    profile,
    fullname,
    email,
    onEdit,
}: Props) {
    const documentUrl = resolveUploadUrl(profile.id_document_url);

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="rounded-3xl border border-success/25 bg-gradient-to-br from-success/10 via-content1 to-content1 px-6 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Chip color="success" variant="flat" size="sm">
                                Perfil verificado
                            </Chip>
                            <VerifiedBadge size="sm" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">Mi perfil</h1>
                        <p className="text-default-600 mt-2 max-w-2xl">
                            Tu perfil está verificado y activo. Puedes actualizar tu información cuando lo necesites.
                        </p>
                    </div>
                    <Button
                        color="primary"
                        radius="lg"
                        className="font-semibold"
                        onPress={onEdit}
                        startContent={<Icon icon="material-symbols:edit" width={18} />}
                    >
                        Editar perfil
                    </Button>
                </div>
            </div>

            <section className="rounded-4xl border border-default-200/70 bg-content1 shadow-soft overflow-hidden">
                <div className="bg-gradient-to-br from-secondary/10 via-transparent to-transparent px-6 py-6 border-b border-default-200">
                    <p className="text-sm text-default-500">Contratista</p>
                    <h2 className="text-2xl font-bold text-foreground mt-1">
                        {fullname || "Sin nombre"}
                    </h2>
                    {email ? (
                        <p className="text-sm text-default-500 mt-2 flex items-center gap-2">
                            <Icon icon="material-symbols:mail" width={16} />
                            {email}
                        </p>
                    ) : null}
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-default-400 mb-1">
                            Documento
                        </p>
                        <p className="font-semibold text-foreground">
                            {profile.document_type || "Documento"} ·{" "}
                            {maskDocument(profile.document_number)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-default-400 mb-1">
                            Ciudad
                        </p>
                        <p className="font-semibold text-foreground">
                            {profile.city || "—"}
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-wide text-default-400 mb-1">
                            Dirección
                        </p>
                        <p className="font-semibold text-foreground">
                            {profile.address || "—"}
                        </p>
                    </div>
                    {profile.bio ? (
                        <div className="md:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-default-400 mb-1">
                                Bio
                            </p>
                            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                                {profile.bio}
                            </p>
                        </div>
                    ) : null}
                    {documentUrl ? (
                        <div className="md:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-default-400 mb-2">
                                Documento de identidad
                            </p>
                            <a
                                href={documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                            >
                                <Icon icon="material-symbols:description" width={18} />
                                Ver documento cargado
                            </a>
                        </div>
                    ) : null}
                </div>
            </section>

            <div className="rounded-2xl border border-default-200 bg-default-50 px-5 py-4 text-sm text-default-600 flex items-start gap-3">
                <Icon
                    icon="material-symbols:info"
                    width={20}
                    className="text-secondary shrink-0 mt-0.5"
                />
                <p>
                    Al editar y guardar cambios, tu perfil pasará a borrador y deberás enviarlo
                    otra vez a revisión para recuperar el estado verificado.
                </p>
            </div>
        </div>
    );
}
