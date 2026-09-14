"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import ContractPdfViewer from "@/components/booking/contract-pdf-viewer";
import { getBookingContractPdfBlob } from "@/lib/contracts";
import { normalizeContractBodyToHtml } from "@/lib/contract-templates";
import { resolveUploadUrl } from "@/lib/uploads";
import { formatCurrency, formatBookingDate } from "@/lib/booking-labels";
import { formatDateTime } from "@/lib/date-utils";
import type { BookingOut, ContractOut } from "@/types/api";

type Props = {
    contract: ContractOut | null;
    bookingId: string;
    isLoading?: boolean;
    title?: string;
    description?: string;
    /** Por defecto usa el endpoint del participante; el admin pasa su propia función. */
    fetchPdfBlob?: (bookingId: string) => Promise<Blob>;
};

function contextValue(
    context: Record<string, string> | null | undefined,
    key: string,
): string | null {
    const value = context?.[key]?.trim();
    return value && value !== "—" ? value : null;
}

export default function ContractDocumentView({
    contract,
    bookingId,
    isLoading = false,
    title = "Contrato de la solicitud",
    description = "Contenido del acuerdo asociado a esta reserva.",
    fetchPdfBlob = getBookingContractPdfBlob,
}: Props) {
    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);
    const [showPdfPreview, setShowPdfPreview] = useState(false);

    const hasSnapshot = Boolean(contract?.title && contract?.body);
    const legacyPdfUrl =
        contract?.contract_signed_pdf_url || contract?.contract_pdf_url || null;
    const contractorSignatureUrl = resolveUploadUrl(contract?.contractor_signature_url);
    const musicianSignatureUrl = resolveUploadUrl(contract?.musician_signature_url);
    const bodyHtml = useMemo(
        () => (contract?.body ? normalizeContractBodyToHtml(contract.body) : ""),
        [contract?.body],
    );

    const meta = useMemo(() => {
        const ctx = contract?.context;
        if (!ctx) return [];
        return [
            { label: "Artista", value: contextValue(ctx, "{{nombre_artista}}") },
            { label: "Cliente", value: contextValue(ctx, "{{nombre_cliente}}") },
            {
                label: "Evento",
                value: [
                    contextValue(ctx, "{{tipo_evento}}"),
                    contextValue(ctx, "{{fecha_evento}}"),
                    contextValue(ctx, "{{hora_evento}}"),
                ]
                    .filter(Boolean)
                    .join(" · "),
            },
            { label: "Lugar", value: contextValue(ctx, "{{lugar_evento}}") },
            { label: "Monto", value: contextValue(ctx, "{{monto_total}}") },
            { label: "Anticipo", value: contextValue(ctx, "{{anticipo}}") },
        ].filter((item) => item.value);
    }, [contract?.context]);

    useEffect(() => {
        return () => {
            if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
        };
    }, [pdfObjectUrl]);

    useEffect(() => {
        setShowPdfPreview(false);
        setPdfError(null);
        if (pdfObjectUrl) {
            URL.revokeObjectURL(pdfObjectUrl);
            setPdfObjectUrl(null);
        }
        // Reset when contract identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contract?.id, contract?.contractor_signed, contract?.updated_at]);

    async function ensurePdfObjectUrl(): Promise<string | null> {
        if (pdfObjectUrl) return pdfObjectUrl;
        setIsLoadingPdf(true);
        setPdfError(null);
        try {
            const blob = await fetchPdfBlob(bookingId);
            const url = URL.createObjectURL(blob);
            setPdfObjectUrl(url);
            return url;
        } catch (error) {
            setPdfError(
                error instanceof Error
                    ? error.message
                    : "No se pudo generar el PDF del contrato.",
            );
            return null;
        } finally {
            setIsLoadingPdf(false);
        }
    }

    async function handleDownloadPdf() {
        const url = await ensurePdfObjectUrl();
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.download = contract?.contractor_signed
            ? `contrato-firmado-${bookingId}.pdf`
            : `contrato-${bookingId}.pdf`;
        link.click();
    }

    async function handleTogglePdfPreview() {
        if (showPdfPreview) {
            setShowPdfPreview(false);
            return;
        }
        const url = await ensurePdfObjectUrl();
        if (url) setShowPdfPreview(true);
    }

    if (isLoading) {
        return (
            <div className="h-96 rounded-2xl border border-default-200 bg-default-100 animate-pulse" />
        );
    }

    if (!contract) {
        return (
            <Card shadow="none" className="border border-warning/30 bg-warning/5">
                <CardBody className="gap-2 p-5">
                    <p className="font-semibold text-foreground">
                        Contrato no disponible
                    </p>
                    <p className="text-sm text-default-600">
                        Aún no hay un contrato asociado a esta solicitud.
                    </p>
                </CardBody>
            </Card>
        );
    }

    if (!hasSnapshot) {
        return (
            <ContractPdfViewer
                pdfUrl={legacyPdfUrl}
                title={
                    contract.contract_signed_pdf_url
                        ? "Contrato firmado"
                        : "Contrato PDF"
                }
                description={description}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-default-500 mt-1">{description}</p>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                    <Button
                        variant="flat"
                        color="primary"
                        radius="lg"
                        className="w-full sm:w-auto"
                        isLoading={isLoadingPdf}
                        onPress={() => void handleTogglePdfPreview()}
                        startContent={
                            <Icon icon="material-symbols:picture-as-pdf" width={20} />
                        }
                    >
                        {showPdfPreview ? "Ocultar PDF" : "Ver PDF"}
                    </Button>
                    <Button
                        variant="bordered"
                        radius="lg"
                        className="w-full sm:w-auto"
                        isLoading={isLoadingPdf}
                        onPress={() => void handleDownloadPdf()}
                        startContent={
                            <Icon icon="material-symbols:download" width={20} />
                        }
                    >
                        Descargar PDF
                    </Button>
                </div>
            </div>

            {pdfError ? (
                <Card shadow="none" className="border border-danger/20 bg-danger/5">
                    <CardBody className="p-4">
                        <p className="text-sm text-default-700">{pdfError}</p>
                    </CardBody>
                </Card>
            ) : null}

            {showPdfPreview && pdfObjectUrl ? (
                <div className="overflow-hidden rounded-2xl border border-default-200 bg-default-50 shadow-soft">
                    <iframe
                        src={`${pdfObjectUrl}#toolbar=1&view=FitH`}
                        title={title}
                        className="h-[min(55vh,28rem)] sm:h-[min(70vh,42rem)] w-full bg-white"
                    />
                </div>
            ) : null}

            <Card shadow="none" className="border border-default-200">
                <CardBody className="gap-5 p-5 sm:p-6">
                    <div>
                        {contract.musician_signed ? (
                            <p className="text-sm text-success">
                                Firma del artista incluida
                                {contract.musician_sign_timestamp
                                    ? ` — ${formatDateTime(contract.musician_sign_timestamp)}`
                                    : ""}
                            </p>
                        ) : (
                            <p className="text-sm text-default-500">
                                Pendiente de firma del artista en su perfil
                            </p>
                        )}
                        {contract.contractor_signed ? (
                            <p className="text-sm text-success mt-1">
                                Firmado digitalmente por el contratista
                                {contract.contractor_sign_timestamp
                                    ? ` — ${formatDateTime(contract.contractor_sign_timestamp)}`
                                    : ""}
                            </p>
                        ) : (
                            <p className="text-sm text-default-500 mt-1">
                                Pendiente de firma del contratista
                            </p>
                        )}
                    </div>

                    {meta.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {meta.map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-xl border border-default-200 bg-default-50/70 px-4 py-3"
                                >
                                    <p className="text-xs text-default-500">
                                        {item.label}
                                    </p>
                                    <p className="text-sm font-medium text-foreground mt-1">
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <Divider />

                    <div className="rounded-2xl border border-default-200 bg-default-100/80 p-2 sm:p-3 overflow-x-auto">
                        <article className="contract-doc-page mx-auto w-full max-w-[720px] min-w-[260px] rounded-xl shadow-lg px-4 py-6 sm:px-8 sm:py-10 md:px-10 md:py-12">
                            <div
                                className="contract-doc"
                                dangerouslySetInnerHTML={{ __html: bodyHtml }}
                            />
                        </article>
                    </div>

                    {musicianSignatureUrl || contractorSignatureUrl ? (
                        <>
                            <Divider />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-3">
                                    <p className="font-semibold text-foreground">
                                        Firma del artista
                                    </p>
                                    {musicianSignatureUrl ? (
                                        <div className="overflow-hidden rounded-2xl border border-default-200 bg-white p-4">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={musicianSignatureUrl}
                                                alt="Firma del artista"
                                                className="max-h-32 w-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-sm text-default-500">
                                            Sin firma del artista en este contrato.
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-3">
                                    <p className="font-semibold text-foreground">
                                        Firma del contratista
                                    </p>
                                    {contractorSignatureUrl ? (
                                        <>
                                            <div className="overflow-hidden rounded-2xl border border-default-200 bg-white p-4">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={contractorSignatureUrl}
                                                    alt="Firma del contratista"
                                                    className="max-h-32 w-full object-contain"
                                                />
                                            </div>
                                            <Button
                                                as={Link}
                                                href={contractorSignatureUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                size="sm"
                                                variant="flat"
                                                className="w-fit"
                                                startContent={
                                                    <Icon
                                                        icon="material-symbols:open-in-new"
                                                        width={18}
                                                    />
                                                }
                                            >
                                                Abrir firma
                                            </Button>
                                        </>
                                    ) : (
                                        <p className="text-sm text-default-500">
                                            Pendiente de firma del contratista.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : null}
                </CardBody>
            </Card>
        </div>
    );
}


