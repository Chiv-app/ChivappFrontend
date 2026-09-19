"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import MusicianCard from "@/components/layout/musician-card";
import EmptyMusiciansState from "@/components/musicians/empty-musicians-state";
import MasonryItem from "@/components/ui/masonry-item";
import { searchMusicians } from "@/lib/musicians";
import type { MusicianCard as MusicianCardModel } from "@/types/ui/musician";

const PAGE_SIZE = 20;

type Filters = {
    city: string;
    genre: string;
    instrument: string;
    minPrice: string;
    maxPrice: string;
};

const EMPTY_FILTERS: Filters = {
    city: "",
    genre: "",
    instrument: "",
    minPrice: "",
    maxPrice: "",
};

function hasActiveFilters(filters: Filters): boolean {
    return Object.values(filters).some((value) => value.trim() !== "");
}

type FilterPillProps = {
    icon: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "number";
};

/** Píldora flotante: ícono solo hasta hover/focus, ahí se abre el input. */
function FilterPill({ icon, placeholder, value, onChange, type = "text" }: FilterPillProps) {
    const isActive = value.trim() !== "";
    return (
        <label
            className={[
                "group relative flex items-center h-10 rounded-full shrink-0",
                "border backdrop-blur-md shadow-soft cursor-text",
                "transition-[width,background-color,border-color] duration-300 ease-out",
                "w-10 hover:w-[9.5rem] focus-within:w-[9.5rem]",
                isActive
                    ? "border-primary/50 bg-primary/10"
                    : "border-default-200/60 bg-content1/85 hover:border-primary/40",
            ].join(" ")}
        >
            <span
                className={[
                    "flex items-center justify-center size-10 shrink-0 transition-colors",
                    isActive
                        ? "text-primary"
                        : "text-default-500 group-hover:text-primary group-focus-within:text-primary",
                ].join(" ")}
            >
                <Icon icon={icon} width={18} height={18} />
            </span>
            <input
                type={type}
                inputMode={type === "number" ? "decimal" : undefined}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className={[
                    "w-0 group-hover:w-24 group-focus-within:w-24 min-w-0 pr-3.5",
                    "bg-transparent outline-none text-sm text-foreground placeholder:text-default-400",
                    "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                    "transition-[width,opacity] duration-300 ease-out",
                ].join(" ")}
            />
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
    
    // Si ya nos pasaron músicos iniciales desde el servidor, no necesitamos cargar
    const hasInitialData = initialMusicians && initialMusicians.length > 0;
    const [isLoading, setIsLoading] = useState(!hasInitialData);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    
    // Asumimos que si hay datos iniciales y son == PAGE_SIZE, podría haber más.
    const [hasMore, setHasMore] = useState(hasInitialData ? initialMusicians.length === PAGE_SIZE : true);
    
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const requestIdRef = useRef(0);
    // Para evitar que el efecto de cambio de filtros dispare una carga inútil en el primer render si ya hay datos
    const isFirstRender = useRef(true);

    const loadPage = useCallback(async (activeFilters: Filters, skip: number) => {
        const requestId = ++requestIdRef.current;
        const isFirstPage = skip === 0;
        if (isFirstPage) setIsLoading(true);
        else setIsLoadingMore(true);

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
                skip,
                limit: PAGE_SIZE,
            });
            if (requestId !== requestIdRef.current) return; // filtros cambiaron mientras cargaba

            setMusicians((current) => (isFirstPage ? page : [...current, ...page]));
            setHasMore(page.length === PAGE_SIZE);
        } catch {
            if (requestId !== requestIdRef.current) return;
            if (isFirstPage) setMusicians([]);
            setHasMore(false);
        } finally {
            if (requestId !== requestIdRef.current) return;
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    // Recarga desde cero cuando cambian los filtros (con debounce).
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Si ya hay datos iniciales y son los filtros por defecto (o los iniciales), no cargamos
            if (hasInitialData) return;
        }
        
        const t = window.setTimeout(() => {
            void loadPage(filters, 0);
        }, 300);
        return () => window.clearTimeout(t);
    }, [filters, loadPage, hasInitialData]);

    // Scroll infinito: al acercarse al final, pide la siguiente página.
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

    return (
        <div className="w-full">
            <div
                className="sticky top-[calc(var(--app-navbar-reveal-offset)+0.75rem)] z-30 pointer-events-none transition-[top] duration-300 ease-out"
            >
                <div className="max-w-[1800px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16">
                    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 w-full">
                        <FilterPill
                            icon="material-symbols:location-on-outline"
                            placeholder="Ciudad"
                            value={filters.city}
                            onChange={(v) => updateFilter("city", v)}
                        />
                        <FilterPill
                            icon="material-symbols:library-music-outline"
                            placeholder="Género"
                            value={filters.genre}
                            onChange={(v) => updateFilter("genre", v)}
                        />
                        <FilterPill
                            icon="material-symbols:piano"
                            placeholder="Instrumento"
                            value={filters.instrument}
                            onChange={(v) => updateFilter("instrument", v)}
                        />
                        <FilterPill
                            icon="material-symbols:trending-down-rounded"
                            placeholder="Precio mín."
                            type="number"
                            value={filters.minPrice}
                            onChange={(v) => updateFilter("minPrice", v)}
                        />
                        <FilterPill
                            icon="material-symbols:trending-up-rounded"
                            placeholder="Precio máx."
                            type="number"
                            value={filters.maxPrice}
                            onChange={(v) => updateFilter("maxPrice", v)}
                        />
                        {hasActiveFilters(filters) ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                aria-label="Limpiar filtros"
                                className="flex items-center justify-center size-10 rounded-full border border-default-200/60 bg-content1/85 backdrop-blur-md shadow-soft text-default-500 hover:text-danger hover:border-danger/40 transition-colors shrink-0"
                            >
                                <Icon icon="material-symbols:close" width={18} />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="max-w-[1800px] mx-auto w-full px-4 sm:px-8 md:px-12 lg:px-16 pt-6 sm:pt-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 lg:gap-8">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-3xl sm:rounded-4xl bg-content1 border border-default-200/70 animate-pulse min-h-64 sm:min-h-72"
                            />
                        ))}
                    </div>
                ) : musicians.length === 0 ? (
                    <div className="grid grid-cols-1">
                        <EmptyMusiciansState />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 lg:gap-8 grid-flow-dense auto-rows-[10px]">
                            {musicians.map((m, i) => (
                                <MasonryItem key={m.id} index={i}>
                                    <MusicianCard musician={m} index={i} />
                                </MasonryItem>
                            ))}
                        </div>

                        <div ref={sentinelRef} className="h-px w-full" aria-hidden />

                        {isLoadingMore ? (
                            <p className="text-center text-sm text-default-500 py-8">
                                Cargando más músicos…
                            </p>
                        ) : null}

                        {!hasMore && musicians.length > 0 ? (
                            <p className="text-center text-sm text-default-400 py-8">
                                Ya viste a todos los músicos disponibles.
                            </p>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
