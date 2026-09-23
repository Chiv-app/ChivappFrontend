"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Button, Input, Spinner } from "@heroui/react";
import {
    reverseGeocode,
    searchPlaces,
    buildFallbackLocation,
    type MapLocation,
} from "@/lib/geocoding";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];

const markerIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

type Props = {
    value: MapLocation | null;
    onChange: (location: MapLocation) => void;
};

function MapClickHandler({
    onSelect,
}: {
    onSelect: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(event) {
            onSelect(event.latlng.lat, event.latlng.lng);
        },
    });
    return null;
}

function MapRecenter({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

function InvalidateSizeOnMount() {
    const map = useMap();
    useEffect(() => {
        const timers = [50, 200, 400].map((ms) =>
            window.setTimeout(() => map.invalidateSize(), ms),
        );
        return () => timers.forEach((id) => window.clearTimeout(id));
    }, [map]);
    return null;
}

export default function LocationMapPicker({ value, onChange }: Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<MapLocation[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isResolving, setIsResolving] = useState(false);

    const requestCurrentLocation = () => {
        if (typeof window !== "undefined" && navigator.geolocation) {
            setIsResolving(true);
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    try {
                        const loc = await reverseGeocode(lat, lng);
                        if (loc) {
                            onChange(loc);
                            setSearchQuery(loc.address);
                        } else {
                            const fallback = buildFallbackLocation(lat, lng);
                            onChange(fallback);
                            setSearchQuery(fallback.address);
                        }
                    } catch (e) {
                        console.error("Error obtiendo ubicación", e);
                    } finally {
                        setIsResolving(false);
                    }
                },
                (err) => {
                    console.error("Ubicación denegada", err);
                    setIsResolving(false);
                }
            );
        }
    };

    const center = useMemo<[number, number]>(() => {
        if (value) return [value.lat, value.lng];
        return DEFAULT_CENTER;
    }, [value]);

    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.trim().length < 3) {
            setSuggestions([]);
            return;
        }

        const timeout = window.setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchPlaces(searchQuery);
                setSuggestions(results);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => window.clearTimeout(timeout);
    }, [searchQuery]);

    async function resolvePoint(lat: number, lng: number) {
        setIsResolving(true);
        try {
            const location = await reverseGeocode(lat, lng);
            if (location) {
                onChange(location);
                setSearchQuery(location.address);
                setSuggestions([]);
                return;
            }

            const fallback = buildFallbackLocation(lat, lng);
            onChange(fallback);
            setSearchQuery(fallback.address);
            setSuggestions([]);
        } finally {
            setIsResolving(false);
        }
    }

    function handleSuggestionSelect(location: MapLocation) {
        onChange(location);
        setSearchQuery(location.address);
        setSuggestions([]);
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="relative z-30 flex gap-2 items-start">
                <div className="flex-1 relative">
                    <Input
                        label="Buscar lugar"
                        placeholder="Escribe una dirección o zona..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        variant="bordered"
                        endContent={isSearching ? <Spinner size="sm" color="primary" /> : null}
                    />
                    {suggestions.length > 0 ? (
                        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-2xl border border-default-200 bg-content1 shadow-lg">
                            {suggestions.map((suggestion) => (
                                <li key={`${suggestion.lat}-${suggestion.lng}`}>
                                    <button
                                        type="button"
                                        className="w-full px-4 py-3 text-left text-sm hover:bg-default-100 transition-colors"
                                        onClick={() => handleSuggestionSelect(suggestion)}
                                    >
                                        {suggestion.address}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
                <Button 
                    isIconOnly
                    color="primary"
                    variant="flat"
                    className="h-14 w-14 shrink-0"
                    onPress={requestCurrentLocation}
                    title="Usar mi ubicación actual"
                >
                    📍
                </Button>
            </div>

            {searchQuery.trim().length >= 3 && (!value || value.address !== searchQuery.trim()) ? (
                <Button
                    size="sm"
                    variant="flat"
                    color="secondary"
                    className="self-start text-xs font-medium max-w-full text-left whitespace-normal h-auto py-1.5"
                    onPress={() => {
                        const manualLocation: MapLocation = {
                            lat: center[0],
                            lng: center[1],
                            address: searchQuery.trim(),
                            city: value?.city || "Lima",
                        };
                        onChange(manualLocation);
                        setSuggestions([]);
                    }}
                >
                    Usar &quot;{searchQuery.trim()}&quot; como lugar del evento
                </Button>
            ) : null}

            <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden border border-default-200 isolate bg-default-100">
                {isResolving ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                        <Spinner color="primary" />
                    </div>
                ) : null}
                <MapContainer
                    center={center}
                    zoom={value ? 15 : 12}
                    className="h-full w-full bg-default-100"
                    scrollWheelZoom
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapRecenter center={center} />
                    <InvalidateSizeOnMount />
                    <MapClickHandler onSelect={resolvePoint} />
                    {value ? (
                        <Marker position={[value.lat, value.lng]} icon={markerIcon} />
                    ) : null}
                </MapContainer>
            </div>

            <p className="text-xs text-default-500">
                Busca una dirección o toca el mapa para marcar el lugar exacto del evento.
            </p>

            {value ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="text-xs font-semibold text-primary mb-1">Lugar seleccionado</p>
                    <p className="text-sm text-foreground">{value.address}</p>
                </div>
            ) : (
                <p className="text-sm text-warning">Selecciona un punto en el mapa para continuar.</p>
            )}
        </div>
    );
}
