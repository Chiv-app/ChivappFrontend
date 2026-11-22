"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@heroui/react";
import MusicianCard from "@/components/layout/musician-card";
import EmptyMusiciansState from "@/components/musicians/empty-musicians-state";
import MasonryItem from "@/components/ui/masonry-item";
import { todayPeruIso } from "@/lib/date-utils";
import { searchMusicians } from "@/lib/musicians";
import { EVENT_TYPE_OPTIONS } from "@/lib/profile-details";
import { MULTI_QUOTE_MAX, MULTI_QUOTE_MIN, MULTI_QUOTE_NAME } from "@/lib/multi-quote";
import { MultiQuoteBar, SelectableCard } from "@/components/musicians/multi-quote-selection";
import type { MusicianCard as MusicianCardModel } from "@/types/ui/musician";

const PAGE_SIZE = 20;

const POPULAR_GENRES = ["Rock", "Salsa", "Cumbia", "Orquesta", "DJ", "Jazz", "Música criolla"];
const POPULAR_CITIES = ["Lima", "Arequipa", "Cusco", "Trujillo", "Piura"];

type Filters = {
    city: string;
    genre: string;
    instrument: string;
    minPrice: string;
    maxPrice: string;
    availableDate: string;
    /** "" (todos), "solo" o "group". */
    profileType: string;
    /** Tipo de evento (clave de EVENT_TYPE_OPTIONS) o "". */
    eventType: string;
};

/** Ficha de filtro: la elegida se rellena; el resto es discreto. */
function chipClass(selected: boolean): string {
    return [
        "inline-flex items-center gap-1.5 min-h-9 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors",
        selected ? "bg-primary text-primary-foreground font-semibold" : "bg-default-100 text-default-700 hover:bg-default-200",
    ].join(" ");
}

const PROFILE_TYPE_CHOICES = [
    { value: "solo", label: "Solistas", icon: "mdi:account-music-outline" },
    { value: "group", label: "Grupos", icon: "mdi:account-group-outline" },
];

const EMPTY_FILTERS: Filters = {
    city: "",
    genre: "",
    instrument: "",
    minPrice: "",
    maxPrice: "",
    availableDate: "",
    profileType: "",
    eventType: "",
};

function hasActiveFilters(filters: Filters): boolean {
    return Object.values(filters).some((value) => value.trim() !== "");
}

function countActiveFilters(filters: Filters): number {
    return Object.values(filters).filter((value) => value.trim() !== "").length;
}

type FilterFieldProps = {
    id: string;
    label: string;
    icon: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "number" | "date";
    listId?: string;
    suggestions?: string[];
};

function FilterField({
    id,
    label,
    icon,
    placeholder,
    value,
    onChange,
    type = "text",
    listId,
    suggestions,
}: FilterFieldProps) {
    const isActive = value.trim() !== "";
    return (
        <label
            htmlFor={id}
            className={[
                "flex items-center gap-2 h-12 px-3.5 rounded-2xl border transition-all bg-content1/95 shadow-soft focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary",
                isActive
                    ? "border-primary bg-primary/5"
                    : "border-default-300/80 hover:border-default-400",
            ].join(" ")}
        >
            <Icon
                icon={icon}
                width={18}
                height={18}
                className={isActive ? "text-primary-text shrink-0" : "text-default-400 shrink-0"}
                aria-hidden="true"
            />
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground/85 leading-none">
                    {label}
                </span>
                <input
                    id={id}
                    type={type}
                    inputMode={type === "number" ? "numeric" : undefined}
                    min={type === "date" ? todayPeruIso() : type === "number" ? 0 : undefined}
                    list={listId}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    aria-label={label}
                    className="w-full min-w-[6.5rem] bg-transparent outline-none text-base sm:text-sm font-medium text-foreground placeholder:font-normal placeholder:text-slate-400/85 dark:placeholder:text-slate-500 focus:placeholder:opacity-45 mt-0.5"
                />
                {listId && suggestions ? (
                    <datalist id={listId}>
                        {suggestions.map((item) => (
                            <option key={item} value={item} />
                        ))}
                    </datalist>
                ) : null}
            </div>
            {isActive ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        onChange("");
                    }}
                    aria-label={`Borrar filtro de ${label.toLowerCase()}`}
                    className="inline-flex size-9 min-w-9 min-h-9 items-center justify-center rounded-full text-default-500 hover:bg-default-200/60 hover:text-foreground transition-colors shrink-0"
                >
                    <Icon icon="material-symbols:close" width={14} />
                </button>
            ) : null}
        </label>
    );
}

type Props = {
    initialFilters?: Partial<Filters>;
    initialMusicians?: MusicianCardModel[];
};

export default function MusiciansBrowseView({ initialFilters, initialMusicians }: Props = {}) {
    const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, ...initialFilters });
    const [musicians, setMusicians] = useState<MusicianCardModel[]>(initialMusicians || []);
    const [loadError, setLoadError] = useState(false);

    const hasInitialData = initialMusicians !== undefined;
    const [isLoading, setIsLoading] = useState(!hasInitialData);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(
        hasInitialData ? initialMusicians.length === PAGE_SIZE : true,
    );

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const [multiMode, setMultiMode] = useState(false);
    const [selected, setSelected] = useState<Array<{ id: string; name: string }>>([]);

    const toggleSelected = useCallback((musician: MusicianCardModel) => {
        setSelected((current) => {
            if (current.some((item) => item.id === musician.id)) {
                return current.filter((item) => item.id !== musician.id);
            }
            if (current.length >= MULTI_QUOTE_MAX) return current;
            return [...current, { id: musician.id, name: musician.name }];
        });
    }, []);

    const toggleMultiMode = useCallback(() => {
        setMultiMode((current) => {
            if (current) setSelected([]);
            return !current;
        });
    }, []);
    const requestIdRef = useRef(0);
    const isFirstRender = useRef(true);

    const loadPage = useCallback(async (activeFilters: Filters, skip: number) => {
        const requestId = ++requestIdRef.current;
        const isFirstPage = skip === 0;
        if (isFirstPage) {
            setIsLoading(true);
            setLoadError(false);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const page = await searchMusicians({
                city: activeFilters.city.trim() || undefined,
                genres: activeFilters.genre.trim() ? [activeFilters.genre.trim()] : undefined,
                instruments: activeFilters.instrument.trim()
                    ? [activeFilters.instrument.trim()]
                    : undefined,
                min_price_per_event: activeFilters.minPrice
                    ? Number(activeFilters.minPrice)
                    : undefined,
                max_price_per_event: activeFilters.maxPrice
                    ? Number(activeFilters.maxPrice)
                    : undefined,
                available_date: activeFilters.availableDate.trim() || undefined,
                profile_type: activeFilters.profileType === "solo" || activeFilters.profileType === "group" ? activeFilters.profileType : undefined,
                event_types: activeFilters.eventType ? [activeFilters.eventType] : undefined,
                skip,
                limit: PAGE_SIZE,
            });
            if (requestId !== requestIdRef.current) return;

            setMusicians((current) => (isFirstPage ? page : [...current, ...page]));
            setHasMore(page.length === PAGE_SIZE);
            setLoadError(false);
        } catch {
            if (requestId !== requestIdRef.current) return;
            if (isFirstPage) {
                setMusicians([]);
                setLoadError(true);
            }
            setHasMore(false);
        } finally {
            if (requestId !== requestIdRef.current) return;
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams();
            if (filters.city.trim()) params.set("city", filters.city.trim());
            if (filters.genre.trim()) params.set("genre", filters.genre.trim());
            if (filters.instrument.trim()) params.set("instrument", filters.instrument.trim());
            if (filters.minPrice.trim()) params.set("min_price", filters.minPrice.trim());
            if (filters.maxPrice.trim()) params.set("max_price", filters.maxPrice.trim());
            if (filters.availableDate.trim()) params.set("available_date", filters.availableDate.trim());
            if (filters.profileType) params.set("profile_type", filters.profileType);
            if (filters.eventType) params.set("event", filters.eventType);
            const qs = params.toString();
            const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
            if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
                window.history.replaceState(null, "", nextUrl);
            }
        }

        if (isFirstRender.current) {
            isFirstRender.current = false;
            if (hasInitialData) return;
        }

        const t = window.setTimeout(() => {
            void loadPage(filters, 0);
        }, 300);
        return () => window.clearTimeout(t);
    }, [filters, loadPage, hasInitialData]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0]?.isIntersecting &&
                    hasMore &&
                    !isLoading &&
                    !isLoadingMore
                ) {
                    void loadPage(filters, musicians.length);
                }
            },
            { rootMargin: "600px 0px" },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [filters, hasMore, isLoading, isLoadingMore, loadPage, musicians.length]);

    function updateFilter(key: keyof Filters, value: string) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    function clearFilters() {
        setFilters(EMPTY_FILTERS);
    }

    const activeFilterFlag = hasActiveFilters(filters);
    const activeFilterCount = countActiveFilters(filters);
    const [showMobileFilters, setShowMobileFilters] = useState(activeFilterFlag);

    return (
        <div className="w-full">
            <section
                aria-label="Filtros de búsqueda de músicos"
                className="w-full px-3 sm:px-6"
            >
                <div className="rounded-3xl border border-default-200/80 bg-content1/90 backdrop-blur-md p-3.5 sm:p-4 shadow-soft">
                    <div className="flex items-center justify-between gap-2 sm:hidden mb-2.5">
                        <button
                            type="button"
                            aria-expanded={showMobileFilters}
                            aria-controls="musicians-filters-grid"
                            onClick={() => setShowMobileFilters((prev) => !prev)}
                            className="inline-flex items-center gap-2 min-h-9 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-default-200 bg-content2/70 text-foreground hover:bg-content2 transition-colors"
                        >
                            <Icon icon="material-symbols:tune-rounded" width={16} />
                            {activeFilterCount > 0
                                ? `Filtros (${activeFilterCount})`
                                : "Filtrar por ciudad, instrumento o precio"}
                            <Icon
                                icon={
                                    showMobileFilters
                                        ? "material-symbols:expand-less"
                                        : "material-symbols:expand-more"
                                }
                                width={16}
                            />
                        </button>
                    </div>
                    <div
                        id="musicians-filters-grid"
                        className={`${
                            showMobileFilters ? "grid" : "hidden sm:grid"
                        } grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5`}
                    >
                        <FilterField
                            id="filter-city"
                            label="Ciudad"
                            icon="material-symbols:location-on-outline"
                            placeholder="Ej. Lima, Cusco"
                            value={filters.city}
                            onChange={(v) => updateFilter("city", v)}
                            listId="musicians-city-suggestions"
                            suggestions={POPULAR_CITIES}
                        />
                        <FilterField
                            id="filter-genre"
                            label="Género musical"
                            icon="material-symbols:library-music-outline"
                            placeholder="Ej. Rock, Salsa, Jazz"
                            value={filters.genre}
                            onChange={(v) => updateFilter("genre", v)}
                            listId="musicians-genre-suggestions"
                            suggestions={POPULAR_GENRES}
                        />
                        <FilterField
                            id="filter-instrument"
                            label="Instrumento"
                            icon="material-symbols:piano"
                            placeholder="Ej. Guitarra, Piano, Voz"
                            value={filters.instrument}
                            onChange={(v) => updateFilter("instrument", v)}
                        />
                        <FilterField
                            id="filter-date"
                            label="Fecha disponible"
                            icon="material-symbols:calendar-month-outline-rounded"
                            placeholder="Seleccionar fecha"
                            type="date"
                            value={filters.availableDate}
                            onChange={(v) => updateFilter("availableDate", v)}
                        />
                        <FilterField
                            id="filter-min-price"
                            label="Precio mín. (S/)"
                            icon="material-symbols:trending-down-rounded"
                            placeholder="Desde S/"
                            type="number"
                            value={filters.minPrice}
                            onChange={(v) => updateFilter("minPrice", v)}
                        />
                        <FilterField
                            id="filter-max-price"
                            label="Precio máx. (S/)"
                            icon="material-symbols:trending-up-rounded"
                            placeholder="Hasta S/"
                            type="number"
                            value={filters.maxPrice}
                            onChange={(v) => updateFilter("maxPrice", v)}
                        />
                    </div>

                    <div className={`${showMobileFilters ? "flex" : "hidden sm:flex"} mt-3 flex-col gap-2.5 pt-2.5 border-t border-default-200/60`}>
                        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tipo de artista">
                            <span className="text-xs font-medium text-default-500 mr-1">Tipo:</span>
                            {PROFILE_TYPE_CHOICES.map((choice) => {
                                const selected = filters.profileType === choice.value;
                                return (
                                    <button
                                        key={choice.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => updateFilter("profileType", selected ? "" : choice.value)}
                                        className={chipClass(selected)}
                                    >
                                        <Icon icon={choice.icon} width={14} aria-hidden="true" />
                                        {choice.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tipo de evento">
                            <span className="text-xs font-medium text-default-500 mr-1">Evento:</span>
                            {EVENT_TYPE_OPTIONS.map((option) => {
                                const selected = filters.eventType === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => updateFilter("eventType", selected ? "" : option.value)}
                                        className={chipClass(selected)}
                                    >
                                        <Icon icon={option.icon} width={14} aria-hidden="true" />
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-default-200/60">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-default-500 mr-1">
                                Populares:
                            </span>
                            {POPULAR_GENRES.map((genre) => {
                                const selected =
                                    filters.genre.trim().toLowerCase() === genre.toLowerCase();
                                return (
                                    <button
                                        key={genre}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() =>
                                            updateFilter("genre", selected ? "" : genre)
                                        }
                                        className={[
                                            "inline-flex items-center min-h-9 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors",
                                            selected
                                                ? "bg-primary text-primary-foreground font-semibold"
                                                : "bg-default-100 text-default-700 hover:bg-default-200",
                                        ].join(" ")}
                                    >
                                        {genre}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-3">
                            <p
                                role="status"
                                aria-live="polite"
                                className="text-xs font-medium text-default-600"
                            >
                                {isLoading
                                    ? "Buscando músicos…"
                                    : `${musicians.length} ${
                                          musicians.length === 1
                                              ? "músico mostrado"
                                              : "músicos mostrados"
                                      }`}
                            </p>
                            {activeFilterFlag ? (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1 min-h-9 rounded-full px-3.5 py-1.5 text-xs font-semibold text-danger-text hover:bg-danger/10 transition-colors"
                                >
                                    <Icon icon="material-symbols:close" width={14} />
                                    Limpiar filtros
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>

            <div className="w-full px-3 sm:px-6 pt-6 sm:pt-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-7 lg:gap-8">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-3xl sm:rounded-4xl bg-content1 border border-default-200/70 animate-pulse min-h-64 sm:min-h-72"
                            />
                        ))}
                    </div>
                ) : musicians.length === 0 ? (
                    <div className="grid grid-cols-1">
                        <EmptyMusiciansState
                            hasActiveFilters={activeFilterFlag}
                            onClearFilters={clearFilters}
                            hasError={loadError}
                            onRetry={() => void loadPage(filters, 0)}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-default-600 text-pretty">
                                {multiMode
                                    ? `${MULTI_QUOTE_NAME}: elige entre ${MULTI_QUOTE_MIN} y ${MULTI_QUOTE_MAX} artistas, completa los datos de tu evento una sola vez y compara sus cotizaciones.`
                                    : "¿Quieres comparar precios? Pide cotización a varios artistas a la vez."}
                            </p>
                            <Button
                                variant={multiMode ? "solid" : "bordered"}
                                color="primary"
                                radius="full"
                                className="shrink-0 font-semibold"
                                aria-pressed={multiMode}
                                startContent={<Icon icon="material-symbols:checklist" width={20} />}
                                onPress={toggleMultiMode}
                            >
                                {multiMode ? "Salir de cotización múltiple" : MULTI_QUOTE_NAME}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-7 lg:gap-8 grid-flow-dense auto-rows-[10px]">
                            {musicians.map((m, i) => {
                                const isSelected = selected.some((item) => item.id === m.id);
                                return (
                                    <MasonryItem key={m.id} index={i}>
                                        <SelectableCard
                                            enabled={multiMode}
                                            selected={isSelected}
                                            blocked={!isSelected && selected.length >= MULTI_QUOTE_MAX}
                                            name={m.name}
                                            onToggle={() => toggleSelected(m)}
                                        >
                                            <MusicianCard musician={m} index={i} priority={i < 3} />
                                        </SelectableCard>
                                    </MasonryItem>
                                );
                            })}
                        </div>

                        <div ref={sentinelRef} className="h-px w-full" aria-hidden />

                        {isLoadingMore ? (
                            <p className="text-center text-sm text-default-500 py-8">
                                Cargando más músicos…
                            </p>
                        ) : hasMore ? (
                            <div className="flex justify-center py-8">
                                <Button
                                    variant="bordered"
                                    radius="full"
                                    onPress={() => void loadPage(filters, musicians.length)}
                                    className="font-semibold"
                                >
                                    Cargar más músicos
                                </Button>
                            </div>
                        ) : null}

                        {!hasMore && musicians.length > 0 ? (
                            <p className="text-center text-sm text-default-500 py-8">
                                Ya viste a todos los músicos disponibles.
                            </p>
                        ) : null}
                    </>
                )}
            </div>

            {multiMode ? (
                <>
                    <div aria-hidden className="h-28" />
                    <MultiQuoteBar selected={selected} onClear={() => setSelected([])} />
                </>
            ) : null}
        </div>
    );
}
