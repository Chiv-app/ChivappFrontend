"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Link as HeroLink,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import FileUploadField from "@/components/ui/file-upload-field";
import { formatDateTime } from "@/lib/date-utils";
import {
    getAdminPaymentInstructions,
    getAdminPayments,
    getAdminPayoutRequests,
    getAdminSettlements,
    getAdminSettlementsExportUrl,
    processAdminPayoutRequest,
    refundAdminPayment,
    rejectAdminPayoutRequest,
    sendAdminRefundTransfer,
    settleAdminBooking,
    updateAdminPaymentInstructions,
} from "@/lib/admin";
import { formatCurrency, PAYMENT_STATUS_LABELS } from "@/lib/booking-labels";
import { UI } from "@/lib/ui-classes";
import { resolveUploadUrl } from "@/lib/uploads";
import type {
    AdminPaymentOut,
    AdminPayoutRequestOut,
    AdminSettlementOut,
    PlatformPaymentInstructions,
} from "@/types/api";


const STATUS_FILTERS = [
    { key: "all", label: "Todos" },
    { key: "initiated", label: "Iniciados" },
    { key: "retained", label: "Retenidos" },
    { key: "released", label: "Liberados" },
    { key: "failed", label: "Fallidos" },
    { key: "refunded", label: "Reembolsados" },
];

const STATUS_COLOR: Record<
    string,
    "default" | "primary" | "success" | "warning" | "danger"
> = {
    initiated: "warning",
    retained: "primary",
    released: "success",
    failed: "danger",
    refunded: "default",
};

const SETTLEMENT_LABEL: Record<string, string> = {
    payable: "Por desembolsar",
    disputed: "En disputa (espera músico)",
    awaiting_admin: "Disputa por liquidar",
    refund_pending_transfer: "Devolver al contratista",
    refund_pending_validation: "Espera validación contratista",
    settled: "Liquidado",
};

const PAGE_SIZE = 100;

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<AdminPaymentOut[]>([]);
    const [settlements, setSettlements] = useState<AdminSettlementOut[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<AdminPayoutRequestOut[]>([]);
    const [instructions, setInstructions] = useState<PlatformPaymentInstructions | null>(
        null,
    );
    const [status, setStatus] = useState("all");
    const [loading, setLoading] = useState(true);
    const [loadingMorePayments, setLoadingMorePayments] = useState(false);
    const [hasMorePayments, setHasMorePayments] = useState(false);
    const [loadingMoreSettlements, setLoadingMoreSettlements] = useState(false);
    const [hasMoreSettlements, setHasMoreSettlements] = useState(false);
    const [loadingMorePayouts, setLoadingMorePayouts] = useState(false);
    const [hasMorePayouts, setHasMorePayouts] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);
    const [payoutActionNotes, setPayoutActionNotes] = useState("");
    const [savingInstructions, setSavingInstructions] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [phoneLabel, setPhoneLabel] = useState("Yape / Plin");
    const [accountName, setAccountName] = useState("");
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [instructionsText, setInstructionsText] = useState("");
    const [feePercent, setFeePercent] = useState("2");
    const [settleTarget, setSettleTarget] = useState<AdminSettlementOut | null>(null);
    const [musicianAmount, setMusicianAmount] = useState("");
    const [contractorRefund, setContractorRefund] = useState("0");
    const [settleNotes, setSettleNotes] = useState("");
    const [payoutReference, setPayoutReference] = useState("");
    const [payoutEvidenceUrl, setPayoutEvidenceUrl] = useState<string | null>(null);
    const [settling, setSettling] = useState(false);
    const [refundTarget, setRefundTarget] = useState<AdminSettlementOut | null>(null);
    const [refundEvidence, setRefundEvidence] = useState<string | null>(null);
    const [refundNotes, setRefundNotes] = useState("");
    const [sendingRefund, setSendingRefund] = useState(false);
    const [payoutActionConfirm, setPayoutActionConfirm] = useState<{
        id: string;
        action: "process" | "reject";
        musicianName: string;
        amount: number;
    } | null>(null);

    function renderMusicianPayoutCard(payout?: AdminSettlementOut["musician_payout_info"]) {
        if (!payout || !payout.payout_method) {
            return (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning-700 flex items-center gap-2">
                    <Icon icon="material-symbols:warning" className="text-base shrink-0" />
                    <span>El músico aún no ha configurado sus datos de desembolso en su perfil.</span>
                </div>
            );
        }

        const copyToClipboard = (text: string, label: string) => {
            navigator.clipboard.writeText(text);
            addToast({ title: `${label} copiado al portapapeles`, color: "success" });
        };

        if (payout.payout_method === "bank_transfer") {
            return (
                <div className="rounded-xl border border-default-200 bg-content2/40 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Icon icon="material-symbols:account-balance" className="text-primary text-sm" />
                            {payout.payout_bank_name || "Transferencia Bancaria"}
                        </span>
                        <Chip size="sm" variant="flat" color="primary">Banco / CCI</Chip>
                    </div>
                    {payout.payout_account_number && (
                        <div className="flex items-center justify-between bg-content1 px-2.5 py-1 rounded-lg border border-default-200">
                            <span className="text-default-700 font-mono text-xs">Cta: {payout.payout_account_number}</span>
                            <Button
                                size="sm"
                                variant="light"
                                isIconOnly
                                aria-label="Copiar número de cuenta"
                                className="h-6 w-6 min-w-6 text-default-500"
                                onPress={() => copyToClipboard(payout.payout_account_number!, "Número de cuenta")}
                            >
                                <Icon icon="material-symbols:content-copy" className="text-xs" />
                            </Button>
                        </div>
                    )}
                    {payout.payout_cci && (
                        <div className="flex items-center justify-between bg-content1 px-2.5 py-1 rounded-lg border border-default-200">
                            <span className="text-default-700 font-mono text-xs">CCI: {payout.payout_cci}</span>
                            <Button
                                size="sm"
                                variant="light"
                                isIconOnly
                                aria-label="Copiar CCI"
                                className="h-6 w-6 min-w-6 text-default-500"
                                onPress={() => copyToClipboard(payout.payout_cci!, "CCI")}
                            >
                                <Icon icon="material-symbols:content-copy" className="text-xs" />
                            </Button>
                        </div>
                    )}
                    {(payout.payout_beneficiary_name || payout.payout_beneficiary_document) && (
                        <p className="text-default-500 pt-0.5">
                            Titular: <span className="text-foreground font-medium">{payout.payout_beneficiary_name || "—"}</span>
                            {payout.payout_beneficiary_document ? ` (${payout.payout_beneficiary_document})` : ""}
                        </p>
                    )}
                </div>
            );
        }

        if (payout.payout_method === "yape_plin") {
            return (
                <div className="rounded-xl border border-default-200 bg-content2/40 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Icon icon="material-symbols:smartphone" className="text-secondary text-sm" />
                            Yape / Plin
                        </span>
                        <Chip size="sm" variant="flat" color="secondary">Billetera móvil</Chip>
                    </div>
                    {payout.payout_phone && (
                        <div className="flex items-center justify-between bg-content1 px-2.5 py-1.5 rounded-lg border border-default-200">
                            <span className="text-foreground font-mono font-bold text-sm">{payout.payout_phone}</span>
                            <Button
                                size="sm"
                                variant="light"
                                isIconOnly
                                aria-label="Copiar teléfono"
                                className="h-6 w-6 min-w-6 text-default-500"
                                onPress={() => copyToClipboard(payout.payout_phone!, "Teléfono")}
                            >
                                <Icon icon="material-symbols:content-copy" className="text-xs" />
                            </Button>
                        </div>
                    )}
                    {(payout.payout_beneficiary_name || payout.payout_beneficiary_document) && (
                        <p className="text-default-500 pt-0.5">
                            Titular: <span className="text-foreground font-medium">{payout.payout_beneficiary_name || "—"}</span>
                            {payout.payout_beneficiary_document ? ` (${payout.payout_beneficiary_document})` : ""}
                        </p>
                    )}
                </div>
            );
        }

        if (payout.payout_method === "mercadopago") {
            return (
                <div className="rounded-xl border border-default-200 bg-content2/40 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Icon icon="material-symbols:credit-card" className="text-primary text-sm" />
                            Mercado Pago
                        </span>
                        <Chip size="sm" variant="flat" color="primary">MP</Chip>
                    </div>
                    {payout.payout_mp_email && (
                        <div className="flex items-center justify-between bg-content1 px-2.5 py-1 rounded-lg border border-default-200">
                            <span className="text-default-700 font-mono text-xs">{payout.payout_mp_email}</span>
                            <Button
                                size="sm"
                                variant="light"
                                isIconOnly
                                aria-label="Copiar correo de Mercado Pago"
                                className="h-6 w-6 min-w-6 text-default-500"
                                onPress={() => copyToClipboard(payout.payout_mp_email!, "Email Mercado Pago")}
                            >
                                <Icon icon="material-symbols:content-copy" className="text-xs" />
                            </Button>
                        </div>
                    )}
                    {payout.payout_beneficiary_name && (
                        <p className="text-default-500 pt-0.5">
                            Titular: <span className="text-foreground font-medium">{payout.payout_beneficiary_name}</span>
                        </p>
                    )}
                </div>
            );
        }

        return null;
    }

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [paymentRes, settlementRes, payoutRes] = await Promise.allSettled([
                getAdminPayments({
                    status: status === "all" ? undefined : status,
                    skip: 0,
                    limit: PAGE_SIZE,
                }),
                getAdminSettlements({ skip: 0, limit: PAGE_SIZE }),
                getAdminPayoutRequests({ skip: 0, limit: PAGE_SIZE }),
            ]);

            const errors: string[] = [];

            if (paymentRes.status === "fulfilled") {
                setPayments(paymentRes.value);
                setHasMorePayments(paymentRes.value.length === PAGE_SIZE);
            } else {
                setHasMorePayments(false);
                errors.push(
                    paymentRes.reason instanceof Error
                        ? `Pagos: ${paymentRes.reason.message}`
                        : "No se pudieron cargar los pagos.",
                );
            }

            if (settlementRes.status === "fulfilled") {
                setSettlements(settlementRes.value);
                setHasMoreSettlements(settlementRes.value.length === PAGE_SIZE);
            } else {
                setHasMoreSettlements(false);
                errors.push(
                    settlementRes.reason instanceof Error
                        ? `Liquidaciones: ${settlementRes.reason.message}`
                        : "No se pudieron cargar las liquidaciones.",
                );
            }

            if (payoutRes.status === "fulfilled") {
                setPayoutRequests(payoutRes.value);
                setHasMorePayouts(payoutRes.value.length === PAGE_SIZE);
            } else {
                setHasMorePayouts(false);
                errors.push(
                    payoutRes.reason instanceof Error
                        ? `Retiros: ${payoutRes.reason.message}`
                        : "No se pudieron cargar las solicitudes de retiro.",
                );
            }

            if (errors.length > 0) {
                const msg = errors.join(" · ");
                setLoadError(msg);
                addToast({
                    title: "Carga parcial de tesorería",
                    description: msg,
                    color: "danger",
                });
            }
        } finally {
            setLoading(false);
        }
    }, [status]);

    async function loadMoreSettlements() {
        setLoadingMoreSettlements(true);
        try {
            const data = await getAdminSettlements({
                skip: settlements.length,
                limit: PAGE_SIZE,
            });
            setSettlements((current) => [...current, ...data]);
            setHasMoreSettlements(data.length === PAGE_SIZE);
        } catch (err) {
            addToast({
                title: "No se pudieron cargar más liquidaciones",
                description: err instanceof Error ? err.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setLoadingMoreSettlements(false);
        }
    }

    async function loadMorePayouts() {
        setLoadingMorePayouts(true);
        try {
            const data = await getAdminPayoutRequests({
                skip: payoutRequests.length,
                limit: PAGE_SIZE,
            });
            setPayoutRequests((current) => [...current, ...data]);
            setHasMorePayouts(data.length === PAGE_SIZE);
        } catch (err) {
            addToast({
                title: "No se pudieron cargar más solicitudes de retiro",
                description: err instanceof Error ? err.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setLoadingMorePayouts(false);
        }
    }

    async function loadMorePayments() {
        setLoadingMorePayments(true);
        try {
            const data = await getAdminPayments({
                status: status === "all" ? undefined : status,
                skip: payments.length,
                limit: PAGE_SIZE,
            });
            setPayments((current) => [...current, ...data]);
            setHasMorePayments(data.length === PAGE_SIZE);
        } catch (err) {
            addToast({
                title: "No se pudieron cargar más pagos",
                description: err instanceof Error ? err.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setLoadingMorePayments(false);
        }
    }

    async function handleProcessPayoutRequest(requestId: string, notes?: string | null) {
        setProcessingPayoutId(requestId);
        try {
            await processAdminPayoutRequest(requestId, { notes: notes || null });
            addToast({
                title: "Solicitud de retiro procesada",
                color: "success",
            });
            await load();
        } catch (error) {
            addToast({
                title: "No se pudo procesar la solicitud",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setProcessingPayoutId(null);
        }
    }

    async function handleRejectPayoutRequest(requestId: string, notes?: string | null) {
        setProcessingPayoutId(requestId);
        try {
            await rejectAdminPayoutRequest(requestId, { notes: notes || null });
            addToast({
                title: "Solicitud de retiro rechazada",
                color: "warning",
            });
            await load();
        } catch (error) {
            addToast({
                title: "No se pudo rechazar la solicitud",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setProcessingPayoutId(null);
        }
    }

    const loadInstructions = useCallback(async () => {
        try {
            const instructionData = await getAdminPaymentInstructions();
            setInstructions(instructionData);
            setPhoneNumber(instructionData.phone_number || "");
            setPhoneLabel(instructionData.phone_label || "Yape / Plin");
            setAccountName(instructionData.account_name || "");
            setQrUrl(instructionData.qr_image_url);
            setInstructionsText(instructionData.instructions || "");
            setFeePercent(String(instructionData.platform_fee_percent ?? 0));
        } catch (error) {
            addToast({
                title: "No se pudo cargar la cuenta de cobro",
                description:
                    error instanceof Error ? error.message : "Intenta actualizar la página.",
                color: "danger",
            });
        }
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => {
            void load();
        }, 0);
        return () => window.clearTimeout(t);
    }, [load]);

    useEffect(() => {
        const t = window.setTimeout(() => {
            void loadInstructions();
        }, 0);
        return () => window.clearTimeout(t);
    }, [loadInstructions]);

    async function saveInstructions(event: FormEvent) {
        event.preventDefault();
        const phone = phoneNumber.trim();
        if (phone.length < 6) {
            addToast({
                title: "Número incompleto",
                description: "Ingresa el celular Yape/Plin (mín. 6 caracteres) antes de guardar.",
                color: "warning",
            });
            return;
        }

        setSavingInstructions(true);
        try {
            const percent = Number(feePercent);
            if (Number.isNaN(percent) || percent < 0 || percent > 100) {
                addToast({
                    title: "Comisión inválida",
                    description: "Usa un porcentaje entre 0 y 100.",
                    color: "warning",
                });
                setSavingInstructions(false);
                return;
            }
            const updated = await updateAdminPaymentInstructions({
                phone_number: phone,
                phone_label: phoneLabel.trim() || "Yape / Plin",
                account_name: accountName.trim() || null,
                qr_image_url: qrUrl,
                instructions: instructionsText.trim() || null,
                platform_fee_percent: percent,
            });
            setInstructions(updated);
            setPhoneNumber(updated.phone_number || "");
            setPhoneLabel(updated.phone_label || "Yape / Plin");
            setAccountName(updated.account_name || "");
            setQrUrl(updated.qr_image_url);
            setInstructionsText(updated.instructions || "");
            setFeePercent(String(updated.platform_fee_percent ?? 0));
            addToast({
                title: "Cuenta de pago actualizada",
                description: updated.qr_image_url
                    ? "El QR, el número y la comisión ya están activos."
                    : "Guardado. Sube un QR cuando lo tengas para mostrarlo en los pagos.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo guardar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setSavingInstructions(false);
        }
    }

    function openSettle(item: AdminSettlementOut) {
        setSettleTarget(item);
        if (item.complaint) {
            setMusicianAmount("");
            setContractorRefund("");
        } else {
            setMusicianAmount(String(item.retained_total));
            setContractorRefund("0");
        }
        setSettleNotes(item.payout_notes || "");
        setPayoutReference(item.payout_reference || "");
        setPayoutEvidenceUrl(item.payout_evidence_url || null);
    }

    async function handleSettle() {
        if (!settleTarget) return;
        const musician = Number(musicianAmount);
        const refund = Number(contractorRefund);
        if (Number.isNaN(musician) || Number.isNaN(refund)) {
            addToast({ title: "Montos inválidos", color: "warning" });
            return;
        }
        setSettling(true);
        try {
            await settleAdminBooking(settleTarget.booking_id, {
                musician_amount: musician,
                contractor_refund: refund,
                notes: settleNotes.trim() || null,
                payout_reference: payoutReference.trim() || null,
                payout_evidence_url: payoutEvidenceUrl || null,
            });
            addToast({ title: "Liquidación y desembolso registrados", color: "success" });
            setSettleTarget(null);
            await load();
        } catch (error) {
            addToast({
                title: "No se pudo liquidar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setSettling(false);
        }
    }


    function openRefundTransfer(item: AdminSettlementOut) {
        setRefundTarget(item);
        setRefundEvidence(null);
        setRefundNotes("");
    }

    async function handleRefundTransfer() {
        if (!refundTarget) return;
        if (!refundEvidence) {
            addToast({
                title: "Falta el comprobante",
                description: "Adjunta la evidencia de la transferencia al contratista.",
                color: "warning",
            });
            return;
        }
        setSendingRefund(true);
        try {
            await sendAdminRefundTransfer(refundTarget.booking_id, {
                evidence_url: refundEvidence,
                notes: refundNotes.trim() || null,
            });
            addToast({
                title: "Devolución registrada",
                description: "El contratista fue notificado para validar el comprobante.",
                color: "success",
            });
            setRefundTarget(null);
            await load();
        } catch (error) {
            addToast({
                title: "No se pudo registrar la devolución",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setSendingRefund(false);
        }
    }

    const actionable = settlements.filter((s) =>
        ["payable", "awaiting_admin", "refund_pending_transfer"].includes(
            s.settlement_state,
        ),
    );
    const pendingPayoutRequests = payoutRequests.filter((r) => r.status === "pending");

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Tesorería y pagos"
                description="Configura la cuenta de cobro, liquida deudas a músicos y consulta el historial de pagos. Para validar o rechazar el comprobante de una reserva, entra a su detalle en Reservas."
            />

            {loadError ? (
                <Card className="border border-danger/30 bg-danger/5">
                    <CardBody className="flex flex-row flex-wrap items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-2 text-danger text-sm">
                            <Icon icon="material-symbols:error" width={20} />
                            <span>{loadError}</span>
                        </div>
                        <Button size="sm" color="danger" variant="flat" onPress={load}>
                            Reintentar
                        </Button>
                    </CardBody>
                </Card>
            ) : null}

            <Card className="border border-default-200 shadow-soft">
                <CardBody className="gap-4 p-6">
                    <div className="flex items-center gap-2">
                        <Icon icon="material-symbols:qr-code-2" width={22} />
                        <h2 className="text-lg font-bold">Cuenta de cobro (plataforma)</h2>
                    </div>
                    <form
                        onSubmit={saveInstructions}
                        noValidate
                        className="flex flex-col gap-4"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Número Yape / Plin"
                                value={phoneNumber}
                                onValueChange={setPhoneNumber}
                                variant="bordered"
                                isRequired
                                description="Obligatorio para que los contratistas puedan copiarlo."
                            />
                            <Input
                                label="Etiqueta"
                                value={phoneLabel}
                                onValueChange={setPhoneLabel}
                                variant="bordered"
                            />
                            <Input
                                label="Titular"
                                value={accountName}
                                onValueChange={setAccountName}
                                variant="bordered"
                            />
                            <Input
                                label="Comisión de plataforma (%)"
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={feePercent}
                                onValueChange={setFeePercent}
                                variant="bordered"
                                description="Se suma al precio del músico. Solo la paga el contratista; el músico recibe su precio íntegro."
                            />
                        </div>
                        <Textarea
                            label="Instrucciones"
                            value={instructionsText}
                            onValueChange={setInstructionsText}
                            variant="bordered"
                            minRows={2}
                        />
                        <FileUploadField
                            label="Imagen QR"
                            value={qrUrl}
                            onChange={(url) => setQrUrl(url)}
                            accept="image/jpeg,image/png,image/webp"
                            helperText="Opcional. Sube el QR y pulsa «Guardar cuenta de pago» para publicarlo."
                        />
                        <Button
                            type="submit"
                            color="primary"
                            radius="lg"
                            className="w-fit font-semibold"
                            isLoading={savingInstructions}
                        >
                            Guardar cuenta de pago
                        </Button>
                        {instructions?.updated_at ? (
                            <p className="text-xs text-default-400">
                                Última actualización:{" "}
                                {formatDateTime(instructions.updated_at)}
                            </p>
                        ) : null}
                    </form>
                </CardBody>
            </Card>

            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold">Solicitudes de retiro de músicos</h2>
                        <p className="text-sm text-default-500">
                            Solicitudes enviadas por músicos para el desembolso de sus eventos culminados.
                        </p>
                    </div>
                    <Chip color={pendingPayoutRequests.length > 0 ? "warning" : "default"} variant="flat">
                        {pendingPayoutRequests.length} pendientes
                    </Chip>
                </div>

                {payoutRequests.length === 0 ? (
                    <Card className="border border-default-200">
                        <CardBody className="p-6 text-center text-default-500 text-sm">
                            {loading
                                ? "Cargando…"
                                : loadError
                                  ? "No se pudieron cargar las solicitudes de retiro."
                                  : "No hay solicitudes de retiro registradas."}
                        </CardBody>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-3">
                        {payoutRequests.map((req) => (
                            <Card key={req.id} className="border border-default-200 shadow-soft">
                                <CardBody className="gap-3 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold">
                                                    {req.musician_name || "Músico"}
                                                </p>
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    color={
                                                        req.status === "pending"
                                                            ? "warning"
                                                            : req.status === "processed"
                                                              ? "success"
                                                              : "danger"
                                                    }
                                                >
                                                    {req.status === "pending"
                                                        ? "Pendiente"
                                                        : req.status === "processed"
                                                          ? "Procesado"
                                                          : "Rechazado"}
                                                </Chip>
                                            </div>
                                            {req.musician_email ? (
                                                <p className="text-xs text-default-500 mt-0.5">
                                                    {req.musician_email}
                                                </p>
                                            ) : null}
                                            <p className="text-xs text-default-500 mt-1">
                                                Solicitado: {formatDateTime(req.created_at)}
                                                {req.processed_at
                                                    ? ` · Procesado: ${formatDateTime(req.processed_at)}`
                                                    : ""}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">
                                                {formatCurrency(Number(req.amount))}
                                            </p>
                                            <p className="text-xs text-default-500">monto solicitado</p>
                                        </div>
                                    </div>

                                    {renderMusicianPayoutCard(req.musician_payout_info)}

                                    {req.notes ? (
                                        <p className="text-xs text-default-600 bg-default-100/70 rounded-lg px-3 py-2">
                                            <span className="font-semibold">Nota: </span>
                                            {req.notes}
                                        </p>
                                    ) : null}

                                    {req.status === "pending" ? (
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <Button
                                                size="sm"
                                                color="success"
                                                className="font-semibold"
                                                isLoading={processingPayoutId === req.id}
                                                onPress={() => {
                                                    setPayoutActionNotes("");
                                                    setPayoutActionConfirm({
                                                        id: req.id,
                                                        action: "process",
                                                        musicianName: req.musician_name || "Músico",
                                                        amount: Number(req.amount),
                                                    });
                                                }}
                                            >
                                                Marcar procesado
                                            </Button>
                                            <Button
                                                size="sm"
                                                color="danger"
                                                variant="flat"
                                                isLoading={processingPayoutId === req.id}
                                                onPress={() => {
                                                    setPayoutActionNotes("");
                                                    setPayoutActionConfirm({
                                                        id: req.id,
                                                        action: "reject",
                                                        musicianName: req.musician_name || "Músico",
                                                        amount: Number(req.amount),
                                                    });
                                                }}
                                            >
                                                Rechazar solicitud
                                            </Button>
                                        </div>
                                    ) : null}
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}

                {hasMorePayouts && !loading ? (
                    <div className="flex justify-center pt-2">
                        <Button
                            variant="flat"
                            color="primary"
                            radius="lg"
                            isLoading={loadingMorePayouts}
                            onPress={loadMorePayouts}
                        >
                            Cargar más solicitudes de retiro ({payoutRequests.length} mostradas)
                        </Button>
                    </div>
                ) : null}
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold">Cola de liquidaciones</h2>
                        <p className="text-sm text-default-500">
                            Shows finalizados con fondos retenidos. El monto de ajuste lo
                            defines tú tras las respuestas.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            as="a"
                            href={getAdminSettlementsExportUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            variant="flat"
                            color="default"
                            startContent={<Icon icon="material-symbols:download" className="text-base" />}
                        >
                            Exportar CSV para pagos
                        </Button>
                        <Chip color="warning" variant="flat">
                            {actionable.length} pendientes
                        </Chip>
                    </div>
                </div>

                {settlements.length === 0 ? (
                    <Card className="border border-default-200">
                        <CardBody className="p-8 text-center text-default-500 text-sm">
                            {loading ? "Cargando…" : "No hay liquidaciones pendientes."}
                        </CardBody>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-3">
                        {settlements.map((item) => (
                            <Card
                                key={item.booking_id}
                                className="border border-default-200 shadow-soft"
                            >
                                <CardBody className="gap-3 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold">
                                                    {item.event_type}
                                                </p>
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    color={
                                                        item.settlement_state === "payable"
                                                            ? "primary"
                                                            : item.settlement_state ===
                                                                "awaiting_admin"
                                                              ? "warning"
                                                              : item.settlement_state ===
                                                                  "disputed"
                                                                ? "danger"
                                                                : item.settlement_state ===
                                                                    "refund_pending_transfer"
                                                                  ? "warning"
                                                                  : item.settlement_state ===
                                                                      "refund_pending_validation"
                                                                    ? "secondary"
                                                                    : "success"
                                                    }
                                                >
                                                    {SETTLEMENT_LABEL[item.settlement_state] ||
                                                        item.settlement_state}
                                                </Chip>
                                            </div>
                                            <p className="text-sm text-default-500 mt-1">
                                                {item.event_date}
                                                {item.location_city
                                                    ? ` · ${item.location_city}`
                                                    : ""}
                                            </p>
                                            <p className="text-xs text-default-500 mt-1">
                                                M: {item.musician_name || "—"} · C:{" "}
                                                {item.contractor_name || "—"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">
                                                {formatCurrency(item.retained_total)}
                                            </p>
                                            <p className="text-xs text-default-500">
                                                pool músico (sin comisión)
                                            </p>
                                            {(item.retained_gross ?? 0) > 0 ? (
                                                <p className="text-xs text-default-500 mt-1">
                                                    Bruto retenido{" "}
                                                    {formatCurrency(item.retained_gross ?? 0)}
                                                    {(item.platform_fee_on_retained ?? 0) > 0
                                                        ? ` · comisión ${formatCurrency(item.platform_fee_on_retained ?? 0)}`
                                                        : ""}
                                                </p>
                                            ) : null}
                                            {item.complaint?.admin_contractor_refund ? (
                                                <p className="text-xs text-success mt-1">
                                                    Devolución:{" "}
                                                    {formatCurrency(
                                                        Number(
                                                            item.complaint.admin_contractor_refund,
                                                        ),
                                                    )}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    {renderMusicianPayoutCard(item.musician_payout_info)}

                                    {item.payout_reference ? (
                                        <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-xs text-default-700 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 font-medium text-success-700">
                                                <Icon icon="material-symbols:check-circle" className="text-base shrink-0" />
                                                <span>Desembolso registrado: <strong>{item.payout_reference}</strong></span>
                                            </div>
                                            {item.payout_evidence_url ? (
                                                <a
                                                    href={resolveUploadUrl(item.payout_evidence_url) || item.payout_evidence_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="underline text-primary font-medium"
                                                >
                                                    Ver comprobante de transferencia
                                                </a>
                                            ) : null}
                                        </div>
                                    ) : null}


                                    {item.complaint ? (
                                        <div className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm">
                                            <p className="font-semibold text-danger">Queja</p>
                                            <p className="text-default-600 mt-1">
                                                {item.complaint.reason}
                                            </p>
                                            {item.complaint.musician_response ? (
                                                <p className="text-default-600 mt-2">
                                                    <span className="font-semibold">
                                                        Músico:{" "}
                                                    </span>
                                                    {item.complaint.musician_response}
                                                </p>
                                            ) : (
                                                <p className="text-warning mt-2">
                                                    Aún espera respuesta del músico.
                                                </p>
                                            )}
                                            {item.complaint.status === "settled" ? (
                                                <p className="text-default-600 mt-2">
                                                    Músico:{" "}
                                                    {formatCurrency(
                                                        Number(
                                                            item.complaint.admin_musician_amount ??
                                                                0,
                                                        ),
                                                    )}
                                                    {" · "}
                                                    Contratista:{" "}
                                                    {formatCurrency(
                                                        Number(
                                                            item.complaint
                                                                .admin_contractor_refund ?? 0,
                                                        ),
                                                    )}
                                                    {item.complaint.refund_status
                                                        ? ` · Estado devolución: ${item.complaint.refund_status}`
                                                        : ""}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {["payable", "awaiting_admin"].includes(
                                        item.settlement_state,
                                    ) ? (
                                        <Button
                                            color="success"
                                            radius="lg"
                                            className="font-semibold w-fit"
                                            onPress={() => openSettle(item)}
                                        >
                                            Liquidar / desembolsar
                                        </Button>
                                    ) : null}

                                    {item.settlement_state === "refund_pending_transfer" ? (
                                        <Button
                                            color="warning"
                                            radius="lg"
                                            className="font-semibold w-fit"
                                            onPress={() => openRefundTransfer(item)}
                                        >
                                            Registrar devolución con evidencia
                                        </Button>
                                    ) : null}

                                    {item.settlement_state === "refund_pending_validation" ? (
                                        <p className="text-sm text-secondary-text">
                                            Comprobante enviado. Esperando validación del
                                            contratista.
                                            {item.complaint?.refund_evidence_url ? (
                                                <>
                                                    {" "}
                                                    <a
                                                        href={
                                                            resolveUploadUrl(
                                                                item.complaint.refund_evidence_url,
                                                            ) || "#"
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="underline text-primary"
                                                    >
                                                        Ver evidencia
                                                    </a>
                                                </>
                                            ) : null}
                                        </p>
                                    ) : null}
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}

                {hasMoreSettlements && !loading ? (
                    <div className="flex justify-center pt-2">
                        <Button
                            variant="flat"
                            color="primary"
                            radius="lg"
                            isLoading={loadingMoreSettlements}
                            onPress={loadMoreSettlements}
                        >
                            Cargar más liquidaciones ({settlements.length} mostradas)
                        </Button>
                    </div>
                ) : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <Select
                    label="Estado de pagos"
                    selectedKeys={new Set([status])}
                    onSelectionChange={(keys) => {
                        if (keys === "all") return;
                        setStatus(Array.from(keys)[0]?.toString() ?? "all");
                    }}
                    variant="bordered"
                    className="sm:w-64"
                >
                    {STATUS_FILTERS.map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                    ))}
                </Select>
                <Button color="primary" radius="lg" className="sm:self-end" onPress={load}>
                    Actualizar
                </Button>
            </div>

            <div className={UI.tablePanel}>
                <Table
                    aria-label="Pagos admin"
                    removeWrapper
                    classNames={{ base: "min-w-[720px]" }}
                >
                    <TableHeader>
                        <TableColumn>Pago</TableColumn>
                        <TableColumn>Evento</TableColumn>
                        <TableColumn>Partes</TableColumn>
                        <TableColumn>Monto</TableColumn>
                        <TableColumn>Estado</TableColumn>
                        <TableColumn>Evidencia</TableColumn>
                    </TableHeader>
                    <TableBody
                        emptyContent={loading ? "Cargando…" : "Sin pagos"}
                        isLoading={loading}
                        items={payments}
                    >
                        {(payment) => (
                            <TableRow key={payment.id}>
                                <TableCell>
                                    <div>
                                        <p className="font-medium capitalize">
                                            {payment.payment_type || "pago"}
                                        </p>
                                        <p className="text-xs text-default-500">
                                            {formatDateTime(payment.created_at)}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div>
                                        <p className="text-sm">
                                            {payment.event_type || "—"}
                                        </p>
                                        <p className="text-xs text-default-500">
                                            {payment.event_date || "—"}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs space-y-1">
                                    <p>M: {payment.musician_name || "—"}</p>
                                    <p>C: {payment.contractor_name || "—"}</p>
                                </TableCell>
                                <TableCell className="font-semibold">
                                    {formatCurrency(Number(payment.amount))}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-start gap-1.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Chip
                                                size="sm"
                                                variant="flat"
                                                color={STATUS_COLOR[payment.status] ?? "default"}
                                            >
                                                {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                                            </Chip>
                                            {payment.needs_refund ? (
                                                <Chip size="sm" variant="flat" color="danger">
                                                    Requiere devolución
                                                </Chip>
                                            ) : null}
                                        </div>
                                        {payment.needs_refund_reason ? (
                                            <p className="text-xs text-danger-text max-w-xs">
                                                {{
                                                    invalid_amount_or_currency:
                                                        "Monto o moneda cobrada no coincide con lo acordado",
                                                    event_passed:
                                                        "El pago ingresó cuando la fecha del evento ya había pasado",
                                                    schedule_overlap:
                                                        "Conflicto de horario: otro cliente confirmó primero",
                                                    duplicate_or_unpayable:
                                                        "Pago duplicado o recibido en una reserva cancelada/no pagable",
                                                }[payment.needs_refund_reason] ?? payment.needs_refund_reason}
                                            </p>
                                        ) : null}
                                        {(payment.needs_refund || payment.status === "needs_refund") ? (
                                            <Button
                                                size="sm"
                                                color="danger"
                                                variant="flat"
                                                onPress={async () => {
                                                    try {
                                                        const updated = await refundAdminPayment(payment.id);
                                                        setPayments((prev) =>
                                                            prev.map((item) =>
                                                                item.id === updated.id ? updated : item,
                                                            ),
                                                        );
                                                        addToast({
                                                            title: "Reembolso ejecutado",
                                                            description: "Mercado Pago procesó la devolución del cobro huérfano.",
                                                            color: "success",
                                                        });
                                                    } catch (err) {
                                                        addToast({
                                                            title: "Error al reembolsar",
                                                            description:
                                                                err instanceof Error
                                                                    ? err.message
                                                                    : "No se pudo ejecutar el reembolso en Mercado Pago.",
                                                            color: "danger",
                                                        });
                                                    }
                                                }}
                                            >
                                                Reembolsar en MP
                                            </Button>
                                        ) : null}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {payment.evidence_url &&
                                    resolveUploadUrl(payment.evidence_url) ? (
                                        <HeroLink
                                            href={resolveUploadUrl(payment.evidence_url)!}
                                            isExternal
                                            showAnchorIcon
                                            size="sm"
                                        >
                                            Ver
                                        </HeroLink>
                                    ) : (
                                        <span className="text-xs text-default-500">—</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {hasMorePayments && !loading ? (
                <div className="flex justify-center">
                    <Button
                        variant="flat"
                        color="primary"
                        radius="lg"
                        isLoading={loadingMorePayments}
                        onPress={loadMorePayments}
                    >
                        Cargar más pagos ({payments.length} mostrados)
                    </Button>
                </div>
            ) : null}

            <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />}
                isOpen={!!settleTarget}
                onOpenChange={(open) => {
                    if (!open) setSettleTarget(null);
                }}
                size="lg"
                placement="center"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Liquidar reserva
                                <span className="text-sm font-normal text-default-500">
                                    Pool músico (sin comisión):{" "}
                                    {formatCurrency(settleTarget?.retained_total ?? 0)}.
                                    {(settleTarget?.retained_gross ?? 0) > 0
                                        ? ` Bruto retenido ${formatCurrency(settleTarget?.retained_gross ?? 0)}` +
                                          ((settleTarget?.platform_fee_on_retained ?? 0) > 0
                                              ? ` (comisión ${formatCurrency(settleTarget?.platform_fee_on_retained ?? 0)})`
                                              : "") +
                                          "."
                                        : ""}{" "}
                                    La suma músico + devolución debe igualar el pool.
                                </span>
                            </ModalHeader>
                            <ModalBody className="gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-1.5">
                                        Datos de cobro del músico
                                    </p>
                                    {renderMusicianPayoutCard(settleTarget?.musician_payout_info)}
                                </div>

                                {settleTarget?.complaint ? (
                                    <div className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm">
                                        <p className="font-semibold">Queja activa</p>
                                        <p className="mt-1">{settleTarget.complaint.reason}</p>
                                        {settleTarget.complaint.musician_response ? (
                                            <p className="mt-2">
                                                Desc./aceptación:{" "}
                                                {settleTarget.complaint.musician_response}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : (
                                    <p className="text-sm text-default-600">
                                        Sin queja: desembolsa el total al músico (reembolso
                                        contratista = 0).
                                    </p>
                                )}
                                <Input
                                    label="Monto al músico (S/)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={musicianAmount}
                                    onValueChange={setMusicianAmount}
                                    variant="bordered"
                                    isRequired
                                />
                                <Input
                                    label="Devolución al contratista (S/)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={contractorRefund}
                                    onValueChange={setContractorRefund}
                                    variant="bordered"
                                    isDisabled={!settleTarget?.complaint}
                                    isRequired
                                    description="Parte del pool músico que se devolverá al contratista."
                                />
                                <Input
                                    label="N° Operación / Referencia de desembolso (opcional)"
                                    placeholder="Ej. BCP Op. 1293847 o MP #9283742"
                                    value={payoutReference}
                                    onValueChange={setPayoutReference}
                                    variant="bordered"
                                    description="Identificador de la transferencia realizada al músico."
                                />
                                <FileUploadField
                                    label="Comprobante de desembolso (opcional)"
                                    value={payoutEvidenceUrl}
                                    onChange={setPayoutEvidenceUrl}
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    privateUpload
                                />
                                <Textarea
                                    label="Notas internas (opcional)"
                                    value={settleNotes}
                                    onValueChange={setSettleNotes}
                                    variant="bordered"
                                    minRows={2}
                                />
                            </ModalBody>

                            <ModalFooter>
                                <Button variant="light" onPress={onClose} isDisabled={settling}>
                                    Cancelar
                                </Button>
                                <Button
                                    color="success"
                                    className="font-semibold"
                                    isLoading={settling}
                                    onPress={handleSettle}
                                >
                                    Confirmar liquidación
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />}
                isOpen={!!refundTarget}
                onOpenChange={(open) => {
                    if (!open) setRefundTarget(null);
                }}
                size="lg"
                placement="center"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Registrar devolución
                                <span className="text-sm font-normal text-default-500">
                                    Monto a devolver:{" "}
                                    {formatCurrency(
                                        Number(
                                            refundTarget?.complaint
                                                ?.admin_contractor_refund ?? 0,
                                        ),
                                    )}
                                    . Adjunta el comprobante de la transferencia al
                                    contratista.
                                </span>
                            </ModalHeader>
                            <ModalBody className="gap-4">
                                <FileUploadField
                                    label="Comprobante de devolución"
                                    value={refundEvidence}
                                    onChange={setRefundEvidence}
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    privateUpload
                                />
                                <Textarea
                                    label="Notas (opcional)"
                                    value={refundNotes}
                                    onValueChange={setRefundNotes}
                                    variant="bordered"
                                    minRows={2}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    variant="light"
                                    onPress={onClose}
                                    isDisabled={sendingRefund}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    color="warning"
                                    className="font-semibold"
                                    isLoading={sendingRefund}
                                    onPress={handleRefundTransfer}
                                >
                                    Enviar y notificar
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />}
                isOpen={payoutActionConfirm != null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPayoutActionConfirm(null);
                        setPayoutActionNotes("");
                    }
                }}
                size="md"
                placement="center"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>
                                {payoutActionConfirm?.action === "process"
                                    ? "¿Marcar retiro como procesado?"
                                    : "¿Rechazar solicitud de retiro?"}
                            </ModalHeader>
                            <ModalBody className="gap-3">
                                <p className="text-sm text-default-600">
                                    {payoutActionConfirm?.action === "process"
                                        ? `Confirmas que se procesó el desembolso de ${formatCurrency(payoutActionConfirm.amount)} para ${payoutActionConfirm.musicianName}.`
                                        : `Se rechazará la solicitud de retiro de ${formatCurrency(payoutActionConfirm?.amount ?? 0)} de ${payoutActionConfirm?.musicianName ?? "este músico"}.`}
                                </p>
                                <Textarea
                                    label={
                                        payoutActionConfirm?.action === "process"
                                            ? "Referencia / notas de operación (opcional)"
                                            : "Motivo del rechazo (opcional)"
                                    }
                                    placeholder={
                                        payoutActionConfirm?.action === "process"
                                            ? "Ej. Transferencia BCP Op. 129384"
                                            : "Ej. Datos bancarios incompletos o cuenta inválida"
                                    }
                                    value={payoutActionNotes}
                                    onValueChange={setPayoutActionNotes}
                                    variant="bordered"
                                    minRows={2}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    variant="light"
                                    onPress={onClose}
                                    isDisabled={
                                        processingPayoutId != null &&
                                        processingPayoutId === payoutActionConfirm?.id
                                    }
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    color={
                                        payoutActionConfirm?.action === "process"
                                            ? "success"
                                            : "danger"
                                    }
                                    className="font-semibold"
                                    isLoading={
                                        processingPayoutId != null &&
                                        processingPayoutId === payoutActionConfirm?.id
                                    }
                                    onPress={async () => {
                                        if (!payoutActionConfirm) return;
                                        const { id, action } = payoutActionConfirm;
                                        const trimmedNotes = payoutActionNotes.trim() || null;
                                        if (action === "process") {
                                            await handleProcessPayoutRequest(id, trimmedNotes);
                                        } else {
                                            await handleRejectPayoutRequest(id, trimmedNotes);
                                        }
                                        setPayoutActionConfirm(null);
                                        setPayoutActionNotes("");
                                    }}
                                >
                                    {payoutActionConfirm?.action === "process"
                                        ? "Marcar procesado"
                                        : "Rechazar solicitud"}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
