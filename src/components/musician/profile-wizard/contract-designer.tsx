"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Button,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import RichTextEditor from "@/components/musician/profile-wizard/rich-text-editor";
import {
    buildContractorPreviewContext,
    buildPreviewContext,
    ensureTitleHeading,
    extractTitleFromHtml,
    getContractDesignerConfig,
    replaceContractPlaceholders,
    replaceContractorPlaceholders,
    type ContractDesignerVariant,
} from "@/lib/contract-templates";
import { sanitizeContractHtml } from "@/lib/sanitize-html";
import { resolveUploadUrl } from "@/lib/uploads";

type MusicianContextProps = {
    variant: "musician";
    stageName: string;
    artistEmail: string;
    artistPhone: string | null;
    pricePerHour: string;
    pricePerEvent: string;
};

type ContractorContextProps = {
    variant: "contractor";
    clientName: string;
    clientEmail: string;
    clientPhone: string | null;
    documentType: string;
    documentNumber: string;
    address: string;
    city: string;
};

type Props = {
    title: string;
    body: string;
    resetKey: string;
    pdfUrl: string | null;
    isGeneratingPdf: boolean;
    onTitleChange: (value: string) => void;
    onBodyChange: (value: string) => void;
    onGeneratePdf: () => Promise<void>;
} & (MusicianContextProps | ContractorContextProps);

export default function ContractDesigner(props: Props) {
    return <ContractDesignerEditor key={props.resetKey} {...props} />;
}

function ContractDesignerEditor(props: Props) {
    const {
        title,
        body,
        pdfUrl,
        isGeneratingPdf,
        onTitleChange,
        onBodyChange,
        onGeneratePdf,
    } = props;

    const variant: ContractDesignerVariant = props.variant;
    const config = getContractDesignerConfig(variant);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("custom");
    const [templateVersion, setTemplateVersion] = useState(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // El título ahora vive dentro del documento (primer encabezado). Si el
    // contenido cargado no trae uno (contratos antiguos), lo insertamos una
    // sola vez al montar y forzamos la recarga del editor con `templateVersion`
    // (el mismo mecanismo que usa "aplicar plantilla").
    const didEnsureTitle = useRef(false);
    useEffect(() => {
        if (didEnsureTitle.current) return;
        didEnsureTitle.current = true;
        const withTitle = ensureTitleHeading(body, title || config.defaultTitle);
        if (withTitle !== body) {
            onBodyChange(withTitle);
            setTemplateVersion((current) => current + 1);
        }
        if (!title) {
            onTitleChange(extractTitleFromHtml(withTitle, config.defaultTitle));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleBodyChange(html: string) {
        onBodyChange(html);
        onTitleChange(extractTitleFromHtml(html, config.defaultTitle));
    }

    const previewContext = useMemo(() => {
        if (variant === "contractor" && props.variant === "contractor") {
            return buildContractorPreviewContext({
                clientName: props.clientName,
                clientEmail: props.clientEmail,
                clientPhone: props.clientPhone,
                documentType: props.documentType,
                documentNumber: props.documentNumber,
                address: props.address,
                city: props.city,
            });
        }

        return buildPreviewContext({
            stageName: props.variant === "musician" ? props.stageName : "",
            artistEmail: props.variant === "musician" ? props.artistEmail : "",
            artistPhone: props.variant === "musician" ? props.artistPhone : null,
            pricePerHour: props.variant === "musician" ? props.pricePerHour : "",
            pricePerEvent: props.variant === "musician" ? props.pricePerEvent : "",
        });
    }, [props, variant]);

    const previewBodyHtml = useMemo(() => {
        if (variant === "contractor") {
            return sanitizeContractHtml(
                replaceContractorPlaceholders(
                    body,
                    previewContext as ReturnType<typeof buildContractorPreviewContext>,
                    "preview",
                ),
            );
        }
        return sanitizeContractHtml(
            replaceContractPlaceholders(
                body,
                previewContext as ReturnType<typeof buildPreviewContext>,
                "preview",
            ),
        );
    }, [body, previewContext, variant]);

    const footerLeftValue =
        variant === "contractor"
            ? (previewContext as ReturnType<typeof buildContractorPreviewContext>).clientName
            : (previewContext as ReturnType<typeof buildPreviewContext>).artistName;

    function applyTemplate(templateId: string) {
        const template = config.templates.find((item) => item.id === templateId);
        if (!template) return;

        setSelectedTemplateId(templateId);
        onTitleChange(template.title);
        onBodyChange(template.bodyHtml);
        setTemplateVersion((current) => current + 1);
        addToast({
            title: "Plantilla aplicada",
            description: `Se cargó "${template.name}". Puedes editar el texto y el estilo libremente.`,
            color: "success",
        });
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm text-default-700">{config.introText}</p>
            </div>

            <div>
                <p className="text-sm font-medium mb-2">Plantillas de inicio</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {config.templates.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => applyTemplate(template.id)}
                            className={`rounded-2xl border p-4 text-left transition-all hover:border-primary ${
                                selectedTemplateId === template.id
                                    ? "border-primary bg-primary/10"
                                    : "border-default-200 bg-content1"
                            }`}
                        >
                            <p className="font-semibold text-sm">{template.name}</p>
                            <p className="text-xs text-default-500 mt-1">{template.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Contenido del contrato</p>
                        <Chip size="sm" variant="flat" color="primary">
                            Editor tipo Word
                        </Chip>
                    </div>
                    <Button
                        size="sm"
                        variant="bordered"
                        startContent={<Icon icon="material-symbols:visibility-outline" width={18} />}
                        onPress={() => setIsPreviewOpen(true)}
                    >
                        Vista previa
                    </Button>
                </div>
                <p className="text-xs text-default-500 mb-3">
                    Edita el título, el texto, los colores y agrega tu logo directamente
                    sobre la hoja. Da clic en &quot;Vista previa&quot; para ver cómo se
                    verá el contrato final con los datos reemplazados.
                </p>
                <RichTextEditor
                    value={body}
                    onChange={handleBodyChange}
                    placeholders={config.placeholders}
                    placeholderHint={config.placeholderHint}
                    syncKey={templateVersion}
                />
            </div>

            <Modal
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                size="3xl"
                scrollBehavior="inside"
                placement="center"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col items-start gap-1">
                        <span className="text-lg font-bold">{config.previewHeading}</span>
                        <span className="text-xs font-normal text-default-500">
                            {config.previewHint}
                        </span>
                    </ModalHeader>
                    <ModalBody className="pb-6">
                        <div className="rounded-3xl border border-default-200/70 bg-default-100 p-2 sm:p-4 overflow-x-auto">
                            <article className="contract-doc-page mx-auto w-full max-w-[680px] min-w-[280px] rounded-xl shadow-lg px-5 py-8 sm:px-10 sm:py-12">
                                <div
                                    className="contract-doc"
                                    dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
                                />

                                <footer className="mt-12 pt-8 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-zinc-900">
                                    <div>
                                        <p className="font-semibold mb-8">{config.footerLeftLabel}</p>
                                        <div className="border-t border-zinc-400 pt-2">
                                            {footerLeftValue}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-8">{config.footerRightLabel}</p>
                                        <div className="border-t border-zinc-400 pt-2">
                                            {config.footerRightFallback}
                                        </div>
                                    </div>
                                </footer>
                            </article>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>

            <div className="flex flex-wrap gap-3 pt-2 border-t border-default-200">
                <Button
                    color="primary"
                    isLoading={isGeneratingPdf}
                    startContent={<Icon icon="material-symbols:picture-as-pdf" width={20} />}
                    onPress={onGeneratePdf}
                >
                    {config.pdfButtonLabel}
                </Button>
                {pdfUrl ? (
                    <Button
                        as="a"
                        href={resolveUploadUrl(pdfUrl) ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        variant="bordered"
                        startContent={<Icon icon="material-symbols:open-in-new" width={18} />}
                    >
                        Abrir PDF guardado
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
