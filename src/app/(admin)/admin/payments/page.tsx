"use client";

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
    getAdminSettlements,
    getAdminSettlementsExportUrl,
    releaseAdminSettlement,
    sendAdminRefundTransfer,
    settleAdminBooking,
    updateAdminPaymentInstructions,
} from "@/lib/admin";
import { formatCurrency } from "@/lib/booking-labels";
import { UI } from "@/lib/ui-classes";
import { resolveUploadUrl } from "@/lib/uploads";
import type {
    AdminPaymentOut,
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

import { PAYMENT_STATUS_LABELS } from "@/lib/booking-labels";

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
    awaiting_admin: "Listo para liquidar",
    refund_pending_transfer: "Devolver al contratista",
    refund_pending_validation: "Espera validación contratista",
    settled: "Liquidado",
};

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<AdminPaymentOut[]>([]);
    const [settlements, setSettlements] = useState<AdminSettlementOut[]>([]);
    const [instructions, setInstructions] = useState<PlatformPaymentInstructions | null>(
        null,
    );
    const [status, setStatus] = useState("all");
    const [loading, setLoading] = useState(true);
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
        try {
            const [paymentData, settlementData] = await Promise.all([
                getAdminPayments({
                    status: status === "all" ? undefined : status,
                    limit: 100,
                }).catch(() => [] as AdminPaymentOut[]),
                getAdminSettlements({ limit: 100 }).catch(() => [] as AdminSettlementOut[]),
            ]);
            setPayments(paymentData);
            setSettlements(settlementData);
        } finally {
            setLoading(false);
        }
    }, [status]);

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
        void load();
    }, [load]);

    useEffect(() => {
        void loadInstructions();
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

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Tesorería y pagos"
                description="Configura la cuenta de cobro, liquida deudas a músicos y consulta el historial de pagos. Para validar o rechazar el comprobante de una reserva, entra a su detalle en Reservas."
            />

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
                                                <p className="text-xs text-default-400 mt-1">
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
                                        <p className="text-sm text-secondary">
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
                                    <Chip
                                        size="sm"
                                        variant="flat"
                                        color={STATUS_COLOR[payment.status] ?? "default"}
                                    >
                                        {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                                    </Chip>
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
                                        <span className="text-xs text-default-400">—</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Modal
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

            <Modal
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
        </div>
    );
}


