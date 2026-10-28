"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Button, Input, Spinner, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
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
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
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

function normalizeCoord(coord: number): number {
  return Number(coord.toFixed(6));
}

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

function MapRecenter({
  lat,
  lng,
  hasSelection,
}: {
  lat: number;
  lng: number;
  hasSelection: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const targetZoom = hasSelection ? Math.max(map.getZoom(), 15) : map.getZoom();
    map.setView([lat, lng], targetZoom);
  }, [lat, lng, hasSelection, map]);
  return null;
}

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const timers = [50, 200, 450, 800].map((ms) =>
      window.setTimeout(() => map.invalidateSize(), ms),
    );
    const container = map.getContainer();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && container) {
      observer = new ResizeObserver(() => {
        map.invalidateSize();
      });
      observer.observe(container);
    }
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      observer?.disconnect();
    };
  }, [map]);
  return null;
}

export default function LocationMapPicker({ value, onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState(() => value?.address ?? "");
  const [suggestions, setSuggestions] = useState<MapLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const isUserTypingRef = useRef(false);
  const resolveReqIdRef = useRef(0);
  const searchReqIdRef = useRef(0);
  const valueRef = useRef<MapLocation | null>(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (value?.address && !isUserTypingRef.current) {
      setSearchQuery(value.address);
    }
  }, [value?.address]);

  const hasValidCoords = Boolean(
    value && Number.isFinite(value.lat) && Number.isFinite(value.lng),
  );

  const center = useMemo<[number, number]>(() => {
    if (value && Number.isFinite(value.lat) && Number.isFinite(value.lng)) {
      return [value.lat, value.lng];
    }
    return DEFAULT_CENTER;
  }, [value?.lat, value?.lng]);

  async function resolvePoint(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const normLat = normalizeCoord(lat);
    const normLng = normalizeCoord(lng);

    resolveReqIdRef.current += 1;
    const reqId = resolveReqIdRef.current;

    const currentVal = valueRef.current;
    const fallback = buildFallbackLocation(normLat, normLng);
    const existingAddress =
      currentVal?.address &&
      !currentVal.address.startsWith("Ubicación marcada (")
        ? currentVal.address
        : fallback.address;

    const immediateLocation: MapLocation = {
      lat: normLat,
      lng: normLng,
      address: existingAddress,
      city: currentVal?.city ?? fallback.city,
    };

    isUserTypingRef.current = false;
    setSuggestions([]);
    onChange(immediateLocation);
    if (!currentVal?.address) {
      setSearchQuery(immediateLocation.address);
    }

    setIsResolving(true);
    try {
      const location = await reverseGeocode(normLat, normLng);
      if (reqId !== resolveReqIdRef.current) return;

      if (location && location.address) {
        const resolved: MapLocation = {
          lat: normLat,
          lng: normLng,
          address: location.address,
          city: location.city ?? valueRef.current?.city ?? null,
        };
        isUserTypingRef.current = false;
        setSearchQuery(resolved.address);
        setSuggestions([]);
        onChange(resolved);
        return;
      }

      const fallbackLocation: MapLocation = {
        ...fallback,
        city: valueRef.current?.city ?? null,
      };
      isUserTypingRef.current = false;
      setSearchQuery(fallbackLocation.address);
      setSuggestions([]);
      onChange(fallbackLocation);
    } catch (error) {
      if (reqId !== resolveReqIdRef.current) return;
      console.error("Error obteniendo dirección en el mapa", error);
      const fallbackLocation: MapLocation = {
        ...fallback,
        city: valueRef.current?.city ?? null,
      };
      isUserTypingRef.current = false;
      setSearchQuery(fallbackLocation.address);
      setSuggestions([]);
      onChange(fallbackLocation);
    } finally {
      if (reqId === resolveReqIdRef.current) {
        setIsResolving(false);
      }
    }
  }

  const requestCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      addToast({
        title: "No soportado",
        description: "Tu navegador no soporta geolocalización.",
        color: "danger",
      });
      return;
    }

    setIsResolving(true);

    const handleSuccess = (pos: GeolocationPosition) => {
      void resolvePoint(pos.coords.latitude, pos.coords.longitude);
    };

    const handleFinalError = (err: GeolocationPositionError) => {
      console.error("Ubicación error", err);
      let errMsg = "Por favor permite el acceso a tu ubicación en tu navegador.";
      if (err.code === err.TIMEOUT) {
        errMsg = "Se agotó el tiempo buscando tu ubicación.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        errMsg = "La información de ubicación no está disponible.";
      }

      addToast({
        title: "Error de ubicación",
        description: errMsg,
        color: "warning",
      });
      setIsResolving(false);
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          handleFinalError(err);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleFinalError,
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  };

  useEffect(() => {
    if (!isUserTypingRef.current) {
      return;
    }

    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    searchReqIdRef.current += 1;
    const reqId = searchReqIdRef.current;

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaces(trimmed);
        if (reqId === searchReqIdRef.current && isUserTypingRef.current) {
          setSuggestions(results);
        }
      } catch {
        if (reqId === searchReqIdRef.current) {
          setSuggestions([]);
        }
      } finally {
        if (reqId === searchReqIdRef.current) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  function handleSuggestionSelect(location: MapLocation) {
    resolveReqIdRef.current += 1;
    isUserTypingRef.current = false;
    setIsResolving(false);
    const normalized: MapLocation = {
      address: location.address,
      city: location.city,
      lat: normalizeCoord(location.lat),
      lng: normalizeCoord(location.lng),
    };
    setSearchQuery(normalized.address);
    setSuggestions([]);
    onChange(normalized);
  }

  async function applyManualSearchQuery(rawQuery: string) {
    const trimmed = rawQuery.trim();
    if (trimmed.length < 3) return;

    resolveReqIdRef.current += 1;
    const reqId = resolveReqIdRef.current;
    isUserTypingRef.current = false;
    setSuggestions([]);

    const currentVal = valueRef.current;
    if (
      currentVal &&
      Number.isFinite(currentVal.lat) &&
      Number.isFinite(currentVal.lng)
    ) {
      onChange({
        lat: currentVal.lat,
        lng: currentVal.lng,
        address: trimmed,
        city: currentVal.city || "Lima",
      });
      return;
    }

    if (suggestions.length > 0) {
      const top = suggestions[0];
      onChange({
        lat: normalizeCoord(top.lat),
        lng: normalizeCoord(top.lng),
        address: trimmed,
        city: top.city || "Lima",
      });
      return;
    }

    const provisional: MapLocation = {
      lat: center[0],
      lng: center[1],
      address: trimmed,
      city: currentVal?.city || "Lima",
    };
    onChange(provisional);

    try {
      const matches = await searchPlaces(trimmed);
      if (reqId !== resolveReqIdRef.current || matches.length === 0) return;
      const top = matches[0];
      onChange({
        lat: normalizeCoord(top.lat),
        lng: normalizeCoord(top.lng),
        address: trimmed,
        city: top.city || "Lima",
      });
    } catch {
      // Keep provisional location if searchPlaces fails
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative z-30 flex gap-2 items-start">
        <div className="flex-1 relative">
          <Input
            label="Buscar lugar"
            placeholder="Escribe una dirección o zona..."
            description="Busca una dirección o toca el mapa para marcar el lugar exacto."
            value={searchQuery}
            onValueChange={(val) => {
              isUserTypingRef.current = true;
              setSearchQuery(val);
              const trimmed = val.trim();
              if (!trimmed || trimmed.length < 3) {
                setSuggestions([]);
              } else if (
                valueRef.current &&
                Number.isFinite(valueRef.current.lat) &&
                Number.isFinite(valueRef.current.lng)
              ) {
                onChange({
                  ...valueRef.current,
                  address: trimmed,
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (suggestions.length > 0) {
                  handleSuggestionSelect(suggestions[0]);
                } else {
                  void applyManualSearchQuery(searchQuery);
                }
              }
            }}
            variant="bordered"
            endContent={
              <div className="flex items-center gap-1">
                {isSearching ? <Spinner size="sm" color="primary" /> : null}
                <Button
                  color="primary"
                  variant="light"
                  size="sm"
                  isIconOnly
                  onPress={requestCurrentLocation}
                  aria-label="Usar mi ubicación actual"
                  className="text-primary-text hover:bg-primary-50"
                >
                  <Icon icon="lucide:crosshair" className="w-5 h-5" />
                </Button>
              </div>
            }
          />
          {suggestions.length > 0 ? (
            <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-2xl border border-default-200 bg-content1 shadow-lg">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.lat}-${suggestion.lng}-${index}`}>
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
      </div>

      {searchQuery.trim().length >= 3 &&
      (!value || value.address !== searchQuery.trim()) ? (
        <Button
          size="sm"
          variant="flat"
          color="secondary"
          className="self-start text-xs font-medium max-w-full text-left whitespace-normal h-auto py-1.5"
          onPress={() => {
            void applyManualSearchQuery(searchQuery);
          }}
        >
          Usar &quot;{searchQuery.trim()}&quot; como lugar del evento
        </Button>
      ) : null}

      <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden border border-default-200 isolate bg-default-100">
        <MapContainer
          center={center}
          zoom={hasValidCoords ? 15 : 12}
          className="h-full w-full bg-default-100"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter
            lat={center[0]}
            lng={center[1]}
            hasSelection={hasValidCoords}
          />
          <InvalidateSizeOnMount />
          <MapClickHandler onSelect={resolvePoint} />
          {hasValidCoords && value ? (
            <Marker
              position={[value.lat, value.lng]}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend(event) {
                  const marker = event.target as L.Marker;
                  const pos = marker.getLatLng();
                  void resolvePoint(pos.lat, pos.lng);
                },
              }}
            />
          ) : null}
        </MapContainer>

        {hasValidCoords && value ? (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[400] rounded-xl border border-primary/20 bg-background/90 backdrop-blur-sm px-3 py-2 shadow-sm flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">
                {isResolving
                  ? "Actualizando dirección..."
                  : "Lugar seleccionado"}
              </p>
              <p className="text-xs font-medium text-foreground truncate">
                {value.address}
              </p>
            </div>
            {isResolving ? <Spinner size="sm" color="primary" /> : null}
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[400] rounded-xl border border-warning/20 bg-warning-50/90 backdrop-blur-sm px-3 py-2 shadow-sm flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-warning-700">
              {isResolving
                ? "Obteniendo ubicación..."
                : "Toca el mapa para seleccionar un punto."}
            </p>
            {isResolving ? <Spinner size="sm" color="warning" /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
