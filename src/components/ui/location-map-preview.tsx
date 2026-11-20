"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    buildGoogleMapsUrl,
    buildOpenStreetMapUrl,
    parseLocationReference,
    searchPlaces,
} from "@/lib/geocoding";

type Props = {
    address: string | null | undefined;
    city: string | null | undefined;
    reference: string | null | undefined;
    className?: string;
};

const LocationMapPreviewInner = dynamic(
    () => import("@/components/ui/location-map-preview-inner"),
    {
        ssr: false,
        loading: () => (
            <div className="h-52 rounded-2xl border border-default-200 bg-default-100 animate-pulse" />
        ),
    },
);

export default function LocationMapPreview({
    address,
    city,
    reference,
    className,
}: Props) {
    const parsedCoords = parseLocationReference(reference);
    const [geocodedState, setGeocodedState] = useState<{
        query: string;
        coords: { lat: number; lng: number } | null;
        loading: boolean;
    }>({ query: "", coords: null, loading: false });

    const fallbackQuery = [address?.trim(), city?.trim()]
        .filter(Boolean)
        .join(", ")
        .trim();

    useEffect(() => {
        if (parsedCoords || fallbackQuery.length < 3) {
            return;
        }
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (cancelled) return;
            setGeocodedState((prev) =>
                prev.query === fallbackQuery && prev.coords
                    ? prev
                    : { query: fallbackQuery, coords: null, loading: true },
            );
            return searchPlaces(fallbackQuery)
                .then((matches) => {
                    if (cancelled) return;
                    const top = matches[0];
                    setGeocodedState({
                        query: fallbackQuery,
                        coords: top ? { lat: top.lat, lng: top.lng } : null,
                        loading: false,
                    });
                })
                .catch(() => {
                    if (cancelled) return;
                    setGeocodedState({
                        query: fallbackQuery,
                        coords: null,
                        loading: false,
                    });
                });
        });
        return () => {
            cancelled = true;
        };
    }, [parsedCoords, fallbackQuery]);

    const coords =
        parsedCoords ??
        (geocodedState.query === fallbackQuery ? geocodedState.coords : null);
    const isResolvingFallback =
        !parsedCoords &&
        fallbackQuery.length >= 3 &&
        (geocodedState.loading || geocodedState.query !== fallbackQuery);

    const googleMapsUrl = buildGoogleMapsUrl({
        lat: coords?.lat,
        lng: coords?.lng,
        address,
        city,
    });
    const openStreetMapUrl = coords
        ? buildOpenStreetMapUrl(coords.lat, coords.lng)
        : null;
    const placeLine = [address, city].filter(Boolean).join(" · ");
    const textReference =
        !parsedCoords && reference?.trim() ? reference.trim() : null;

    return (
        <div className={`flex flex-col gap-3 ${className ?? ""}`}>
            {coords ? (
                <LocationMapPreviewInner lat={coords.lat} lng={coords.lng} />
            ) : isResolvingFallback ? (
                <div className="h-52 rounded-2xl border border-default-200 bg-default-100 animate-pulse" />
            ) : (
                <div className="h-52 rounded-2xl border border-dashed border-default-300 bg-default-50 flex items-center justify-center px-4 text-center">
                    <p className="text-sm text-default-500">
                        No hay coordenadas para mostrar el mapa. Usa los enlaces
                        con la dirección.
                    </p>
                </div>
            )}

            {placeLine ? (
                <p className="text-sm text-foreground">{placeLine}</p>
            ) : null}
            {textReference ? (
                <p className="text-xs text-default-500">
                    Referencia: {textReference}
                </p>
            ) : null}

            {(googleMapsUrl || openStreetMapUrl) && (
                <div className="flex flex-wrap gap-2">
                    {googleMapsUrl ? (
                        <Button
                            as="a"
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            color="primary"
                            variant="flat"
                            radius="lg"
                            startContent={
                                <Icon icon="material-symbols:map" width={18} />
                            }
                        >
                            Abrir en Google Maps
                        </Button>
                    ) : null}
                    {openStreetMapUrl ? (
                        <Button
                            as="a"
                            href={openStreetMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            variant="bordered"
                            radius="lg"
                            startContent={
                                <Icon icon="material-symbols:public" width={18} />
                            }
                        >
                            Abrir en OpenStreetMap
                        </Button>
                    ) : null}
                </div>
            )}
        </div>
    );
}
