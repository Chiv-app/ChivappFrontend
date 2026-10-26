"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { getBookingContractPdfBlob } from "@/lib/contracts";
import { resolveUploadUrl } from "@/lib/uploads";
import type { ContractOut } from "@/types/api";

type Props = {
    contract: ContractOut | null;
    bookingId: string;
    isLoading?: boolean;
    title?: string;
    description?: string;
    /** Por defecto usa el endpoint del participante; el admin pasa su propia función. */
    fetchPdfBlob?: (bookingId: string) => Promise<Blob>;
};

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

    const legacyPdfUrl =
        contract?.contract_signed_pdf_url || contract?.contract_pdf_url || null;
    const contractorSignatureUrl = resolveUploadUrl(contract?.contractor_signature_url);
    const musicianSignatureUrl = resolveUploadUrl(contract?.musician_signature_url);

    useEffect(() => {
        return () => {
            if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
        };
    }, [pdfObjectUrl]);

    useEffect(() => {
        void Promise.resolve().then(() => {
            setShowPdfPreview(false);
            setPdfError(null);
            if (pdfObjectUrl) {
                URL.revokeObjectURL(pdfObjectUrl);
                setPdfObjectUrl(null);
            }
        });
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

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-default-500 mt-1">{description}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    as={legacyPdfUrl ? "a" : "button"}
                    href={legacyPdfUrl ? (resolveUploadUrl(legacyPdfUrl) || undefined) : undefined}
                    target={legacyPdfUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    variant="flat"
                    color="primary"
                    radius="lg"
                    className="flex-1 font-semibold"
                    onPress={() => {
                        if (!legacyPdfUrl) {
                            handleTogglePdfPreview();
                        }
                    }}
                    isLoading={isLoadingPdf}
                    startContent={<Icon icon="material-symbols:contract" width={20} />}
                >
                    Ver contrato del músico
                </Button>
                
                <Button
                    as="a"
                    href="/legal/terminos"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="flat"
                    color="secondary"
                    radius="lg"
                    className="flex-1 font-semibold"
                    startContent={<Icon icon="material-symbols:info" width={20} />}
                >
                    Términos y condiciones
                </Button>
            </div>

            {showPdfPreview && pdfObjectUrl ? (
                <div className="overflow-hidden rounded-2xl border border-default-200 bg-default-50 shadow-soft mt-2">
                    <iframe
                        src={`${pdfObjectUrl}#toolbar=1&view=FitH`}
                        title={title}
                        className="h-[min(55vh,28rem)] sm:h-[min(70vh,42rem)] w-full bg-white"
                    />
                </div>
            ) : null}

            {pdfError ? (
                <p className="text-sm text-danger mt-1">{pdfError}</p>
            ) : null}
            
            {musicianSignatureUrl || contractorSignatureUrl ? (
                <Card shadow="none" className="border border-default-200 mt-2">
                    <CardBody className="gap-4 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <p className="text-sm font-semibold text-foreground">Firma del artista</p>
                                {musicianSignatureUrl ? (
                                    <div className="overflow-hidden rounded-xl border border-default-200 bg-white p-2">
                                        <img src={musicianSignatureUrl} alt="Firma del artista" className="max-h-20 w-full object-contain" />
                                    </div>
                                ) : (
                                    <p className="text-xs text-default-500">Sin firma del artista.</p>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-sm font-semibold text-foreground">Firma del contratista</p>
                                {contractorSignatureUrl ? (
                                    <div className="overflow-hidden rounded-xl border border-default-200 bg-white p-2">
                                        <img src={contractorSignatureUrl} alt="Firma del contratista" className="max-h-20 w-full object-contain" />
                                    </div>
                                ) : (
                                    <p className="text-xs text-default-500">Pendiente de firma.</p>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            ) : null}
        </div>
    );
}