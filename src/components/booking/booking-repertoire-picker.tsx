"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Checkbox,
    CheckboxGroup,
    Chip,
    Input,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import VideoPlaybackModal from "@/components/ui/video-playback-modal";
import { useVideoPlayback } from "@/hooks/use-video-playback";
import { updateRequestedRepertoire } from "@/lib/bookings";
import { getMusicianById } from "@/lib/musicians";
import type { BookingOut } from "@/types/api";
import type { MusicianRepertoireItem } from "@/types/ui/musician";

type Props = {
    booking: BookingOut;
    canEdit: boolean;
    onUpdated: (booking: BookingOut) => void;
};

const VISIBLE_LIMIT = 5;
const OTHER_PREFIX = "Otros:";

function parseOtherTitle(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed.toLowerCase().startsWith("otros:")) return null;
    return trimmed.slice(trimmed.indexOf(":") + 1).trim() || null;
}

function formatOtherTitle(custom: string): string {
    return `${OTHER_PREFIX} ${custom.trim()}`;
}

function normalizeCatalog(
    repertoire: MusicianRepertoireItem[],
    songs: string[],
): MusicianRepertoireItem[] {
    const source =
        repertoire.length > 0
            ? repertoire
            : songs.map((title) => ({ title, youtubeUrl: null }));

    const byTitle = new Map<string, MusicianRepertoireItem>();
    for (const item of source) {
        const title = item.title.trim();
        if (!title || byTitle.has(title)) continue;
        byTitle.set(title, {
            title,
            youtubeUrl: item.youtubeUrl?.trim() || null,
        });
    }
    return Array.from(byTitle.values());
}

function YoutubePlayButton({
    title,
    onPlay,
}: {
    title: string;
    onPlay: () => void;
}) {
    return (
        <Button
            isIconOnly
            size="sm"
            variant="light"
            radius="full"
            aria-label={`Reproducir ${title} en YouTube`}
            className="shrink-0 text-danger min-w-8 w-8 h-8"
            onPress={onPlay}
        >
            <Icon icon="mdi:youtube" width={18} />
        </Button>
    );
}

export default function BookingRepertoirePicker({
    booking,
    canEdit,
    onUpdated,
}: Props) {
    const [available, setAvailable] = useState<MusicianRepertoireItem[]>([]);
    const [selectedCatalog, setSelectedCatalog] = useState<string[]>([]);
    const [otherEnabled, setOtherEnabled] = useState(false);
    const [otherText, setOtherText] = useState("");
    const [filter, setFilter] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [reloadCount, setReloadCount] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const videoPlayback = useVideoPlayback();

    useEffect(() => {
        const saved = booking.requested_repertoire ?? [];
        const other = saved.map(parseOtherTitle).find(Boolean) ?? null;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedCatalog(saved.filter((title) => !parseOtherTitle(title)));
        setOtherEnabled(Boolean(other));
        setOtherText(other ?? "");
        setFilter("");
        setExpanded(false);
    }, [booking.id, booking.requested_repertoire]);

    useEffect(() => {
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (!cancelled) {
                setIsLoading(true);
                setLoadError(null);
            }
        });

        getMusicianById(booking.musician_id)
            .then((musician) => {
                if (cancelled) return;
                setAvailable(
                    normalizeCatalog(musician.repertoire, musician.songs),
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setAvailable([]);
                    setLoadError("No se pudo cargar el catálogo de temas del músico.");
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [booking.musician_id, reloadCount]);

    const youtubeByTitle = useMemo(() => {
        const map = new Map<string, string>();
        for (const item of available) {
            if (item.youtubeUrl) map.set(item.title, item.youtubeUrl);
        }
        return map;
    }, [available]);

    const selectedPayload = useMemo(() => {
        const next = [...selectedCatalog];
        const custom = otherText.trim();
        if (otherEnabled && custom) {
            next.push(formatOtherTitle(custom));
        }
        return next;
    }, [selectedCatalog, otherEnabled, otherText]);

    const dirty = useMemo(() => {
        const current = [...(booking.requested_repertoire ?? [])].sort();
        const next = [...selectedPayload].sort();
        if (current.length !== next.length) return true;
        return current.some((title, index) => title !== next[index]);
    }, [booking.requested_repertoire, selectedPayload]);

    const filtered = useMemo(() => {
        const query = filter.trim().toLowerCase();
        if (!query) return available;
        return available.filter((item) =>
            item.title.toLowerCase().includes(query),
        );
    }, [available, filter]);

    const visibleItems = expanded
        ? filtered
        : filtered.slice(0, VISIBLE_LIMIT);
    const hiddenCount = Math.max(filtered.length - VISIBLE_LIMIT, 0);

    async function handleSave() {
        if (otherEnabled && !otherText.trim()) {
            addToast({
                title: "Tema especial incompleto",
                description: "Escribe el nombre del tema en «Otros» o desmárcalo.",
                color: "warning",
            });
            return;
        }

        setIsSaving(true);
        try {
            const updated = await updateRequestedRepertoire(booking.id, {
                requested_repertoire: selectedPayload,
            });
            onUpdated(updated);
            addToast({
                title: "Repertorio guardado",
                description: "Los temas quedaron en el detalle de la solicitud.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo guardar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="h-36 rounded-2xl border border-default-200 bg-default-100 animate-pulse" />
        );
    }

    return (
        <>
            <div className="rounded-2xl border border-secondary/25 bg-secondary/5 p-4 flex flex-col gap-4">
                <div className="flex items-start gap-2">
                    <Icon
                        icon="material-symbols:library-music"
                        width={22}
                        className="text-secondary shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                            Temas de repertorio
                        </p>
                        <p className="text-sm text-default-600 mt-1">
                            Elige hasta las canciones del catálogo o indica un tema
                            especial en «Otros». Se guardan en el detalle de la
                            solicitud.
                        </p>
                    </div>
                </div>

                {canEdit ? (
                    <>
                        {loadError ? (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                                <span>{loadError}</span>
                                <Button
                                    size="sm"
                                    color="danger"
                                    variant="flat"
                                    onPress={() => setReloadCount((c) => c + 1)}
                                    startContent={<Icon icon="material-symbols:refresh" width={16} />}
                                >
                                    Reintentar
                                </Button>
                            </div>
                        ) : available.length > 0 ? (
                            <Input
                                size="sm"
                                variant="bordered"
                                radius="lg"
                                label="Filtrar temas"
                                placeholder="Buscar por nombre…"
                                value={filter}
                                onValueChange={(value) => {
                                    setFilter(value);
                                    setExpanded(false);
                                }}
                                startContent={
                                    <Icon
                                        icon="material-symbols:search"
                                        width={18}
                                        className="text-default-400"
                                    />
                                }
                                isClearable
                                onClear={() => {
                                    setFilter("");
                                    setExpanded(false);
                                }}
                            />
                        ) : (
                            <p className="text-sm text-default-600">
                                Este músico aún no tiene temas publicados. Puedes
                                pedir uno especial con «Otros».
                            </p>
                        )}

                        {available.length > 0 ? (
                            filtered.length === 0 ? (
                                <p className="text-sm text-default-500">
                                    Ningún tema coincide con «{filter.trim()}».
                                </p>
                            ) : (
                                <>
                                    <CheckboxGroup
                                        value={selectedCatalog}
                                        onValueChange={setSelectedCatalog}
                                        classNames={{
                                            base: "gap-2",
                                            label: "text-sm",
                                        }}
                                    >
                                        {visibleItems.map((item) => (
                                            <div
                                                key={item.title}
                                                className="flex items-center gap-0.5 w-fit max-w-full"
                                            >
                                                <Checkbox
                                                    value={item.title}
                                                    classNames={{
                                                        base: "max-w-full min-w-0",
                                                        label: "truncate pe-0",
                                                    }}
                                                >
                                                    {item.title}
                                                </Checkbox>
                                                {item.youtubeUrl ? (
                                                    <YoutubePlayButton
                                                        title={item.title}
                                                        onPlay={() =>
                                                            videoPlayback.openVideo(
                                                                item.youtubeUrl!,
                                                                item.title,
                                                            )
                                                        }
                                                    />
                                                ) : null}
                                            </div>
                                        ))}
                                    </CheckboxGroup>

                                    {hiddenCount > 0 || expanded ? (
                                        <Button
                                            size="sm"
                                            variant="light"
                                            radius="lg"
                                            className="w-fit font-semibold"
                                            onPress={() =>
                                                setExpanded((value) => !value)
                                            }
                                            endContent={
                                                <Icon
                                                    icon={
                                                        expanded
                                                            ? "material-symbols:expand-less"
                                                            : "material-symbols:expand-more"
                                                    }
                                                    width={18}
                                                />
                                            }
                                        >
                                            {expanded
                                                ? "Ver menos"
                                                : `Ver ${hiddenCount} más`}
                                        </Button>
                                    ) : null}
                                </>
                            )
                        ) : null}

                        <div className="rounded-2xl border border-default-200 bg-content1/70 p-3 flex flex-col gap-3">
                            <Checkbox
                                isSelected={otherEnabled}
                                onValueChange={(checked) => {
                                    setOtherEnabled(checked);
                                    if (!checked) setOtherText("");
                                }}
                            >
                                Otros (tema especial)
                            </Checkbox>
                            {otherEnabled ? (
                                <Input
                                    size="sm"
                                    variant="bordered"
                                    radius="lg"
                                    label="Nombre del tema"
                                    placeholder="Ej. Canción pedida para la entrada"
                                    value={otherText}
                                    onValueChange={setOtherText}
                                    isRequired
                                />
                            ) : null}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-default-500">
                                {selectedPayload.length} seleccionado
                                {selectedPayload.length === 1 ? "" : "s"}
                            </p>
                            <Button
                                color="secondary"
                                radius="lg"
                                className="font-semibold"
                                isDisabled={!dirty}
                                isLoading={isSaving}
                                onPress={() => void handleSave()}
                            >
                                Guardar temas
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {(booking.requested_repertoire ?? []).length === 0 ? (
                            <p className="text-sm text-default-500">
                                Sin temas seleccionados.
                            </p>
                        ) : (
                            (booking.requested_repertoire ?? []).map((title) => {
                                const youtubeUrl = youtubeByTitle.get(title);
                                return (
                                    <Chip
                                        key={title}
                                        size="sm"
                                        variant="flat"
                                        color={
                                            parseOtherTitle(title)
                                                ? "warning"
                                                : "secondary"
                                        }
                                        endContent={
                                            youtubeUrl ? (
                                                <YoutubePlayButton
                                                    title={title}
                                                    onPlay={() =>
                                                        videoPlayback.openVideo(
                                                            youtubeUrl,
                                                            title,
                                                        )
                                                    }
                                                />
                                            ) : undefined
                                        }
                                    >
                                        {title}
                                    </Chip>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            <VideoPlaybackModal
                isOpen={videoPlayback.isOpen}
                onOpenChange={videoPlayback.onOpenChange}
                url={videoPlayback.url}
                title={videoPlayback.title}
            />
        </>
    );
}
