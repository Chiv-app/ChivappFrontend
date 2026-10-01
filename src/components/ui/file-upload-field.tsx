"use client";

import { useRef, useState } from "react";
import { Button, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { uploadFiles, resolveUploadUrl } from "@/lib/uploads";

type CommonProps = {
    label: string;
    accept?: string;
    helperText?: string;
    maxFiles?: number;
    /** Sube como documento privado (DNI, evidencias). Ver UploadOptions. */
    privateUpload?: boolean;
};

type SingleProps = CommonProps & {
    multiple?: false;
    value: string | null;
    onChange: (url: string | null) => void;
};

type MultiProps = CommonProps & {
    multiple: true;
    value: string[];
    onChange: (urls: string[]) => void;
};

type Props = SingleProps | MultiProps;

function isImageAccept(accept: string): boolean {
    return accept.includes("image");
}

function isPdfUrl(url: string): boolean {
    return /\.pdf(\?|$)/i.test(url);
}

export default function FileUploadField(props: Props) {
    const {
        label,
        accept = "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf",
        helperText,
        maxFiles = 8,
        privateUpload = false,
    } = props;
    const multiple = props.multiple === true;
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const currentUrls: string[] = multiple
        ? props.value
        : props.value
          ? [props.value]
          : [];

    async function handleFilesSelected(fileList: FileList | null) {
        if (!fileList?.length) return;

        const selected = Array.from(fileList);
        const remaining = multiple
            ? Math.max(0, maxFiles - currentUrls.length)
            : 1;
        const toUpload = selected.slice(0, remaining || 1);

        if (multiple && selected.length > remaining) {
            addToast({
                title: "Límite de archivos",
                description: `Puedes adjuntar hasta ${maxFiles} archivos.`,
                color: "warning",
            });
        }

        setIsUploading(true);
        try {
            const uploaded = await uploadFiles(toUpload, { private: privateUpload });
            if (multiple) {
                props.onChange([...currentUrls, ...uploaded]);
            } else {
                props.onChange(uploaded[0] ?? null);
            }
            addToast({
                title: uploaded.length > 1 ? "Archivos cargados" : "Archivo cargado",
                description:
                    uploaded.length > 1
                        ? `${uploaded.length} archivos se subieron y optimizaron.`
                        : "El archivo se subió y optimizó correctamente.",
                color: "success",
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "No se pudo cargar el archivo.";
            addToast({
                title: "Error al subir",
                description: message,
                color: "danger",
            });
        } finally {
            setIsUploading(false);
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }

    function removeAt(index: number) {
        if (multiple) {
            props.onChange(currentUrls.filter((_, i) => i !== index));
            return;
        }
        props.onChange(null);
    }

    const canAddMore = multiple ? currentUrls.length < maxFiles : true;
    const buttonLabel = multiple
        ? currentUrls.length
            ? "Agregar más archivos"
            : "Seleccionar archivos"
        : currentUrls.length
          ? "Reemplazar archivo"
          : "Seleccionar archivo";

    return (
        <div className="flex flex-col gap-3">
            <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                {helperText ? (
                    <p className="text-xs text-default-500 mt-1">{helperText}</p>
                ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    className="hidden"
                    onChange={(event) => handleFilesSelected(event.target.files)}
                />
                <Button
                    type="button"
                    variant="flat"
                    radius="lg"
                    isLoading={isUploading}
                    isDisabled={!canAddMore}
                    onPress={() => inputRef.current?.click()}
                    startContent={
                        isUploading ? undefined : (
                            <Icon icon="material-symbols:upload-file" width={18} />
                        )
                    }
                >
                    {buttonLabel}
                </Button>
            </div>

            {currentUrls.length > 0 ? (
                <div className="flex flex-col gap-2">
                    {currentUrls.map((url, index) => {
                        const previewUrl = resolveUploadUrl(url);
                        if (!previewUrl) return null;
                        const showImage =
                            isImageAccept(accept) && !isPdfUrl(previewUrl);
                        return (
                            <div
                                key={`${url}-${index}`}
                                className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50/70 px-3 py-2"
                            >
                                {showImage ? (
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-default-200"
                                        title="Clic para abrir imagen en tamaño completo"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={previewUrl}
                                            alt={`${label} ${index + 1}`}
                                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                                            <Icon
                                                icon="material-symbols:open-in-new"
                                                width={16}
                                                className="text-white"
                                            />
                                        </div>
                                    </a>
                                ) : (
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-16 w-16 items-center justify-center rounded-lg border border-default-200 bg-content1 shrink-0 hover:bg-default-100 transition-colors"
                                        title="Clic para abrir documento"
                                    >
                                        <Icon
                                            icon="material-symbols:picture-as-pdf"
                                            width={28}
                                            className="text-danger"
                                        />
                                    </a>
                                )}
                                <div className="min-w-0 flex-1">
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-medium text-primary hover:underline truncate inline-flex items-center gap-1"
                                    >
                                        {multiple
                                            ? `Archivo ${index + 1}`
                                            : "Ver documento cargado"}
                                        <Icon
                                            icon="material-symbols:open-in-new"
                                            width={14}
                                            className="shrink-0"
                                        />
                                    </a>
                                    <p className="text-xs text-default-500 mt-0.5">
                                        Clic para abrir en una pestaña nueva
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    radius="lg"
                                    isIconOnly
                                    aria-label="Quitar archivo"
                                    onPress={() => removeAt(index)}
                                >
                                    <Icon icon="material-symbols:close" width={18} />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
