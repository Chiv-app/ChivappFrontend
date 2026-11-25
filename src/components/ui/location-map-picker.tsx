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
import { Button, Chip, Input, Spinner, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  reverseGeocode,
  searchPlaces,
  buildFallbackLocation,
  looksLikeSharedLocationText,
  resolveSharedLocation,
  type MapLocation,
} from "@/lib/geocoding";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="
    position: relative;
    width: 32px;
    height: 42px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
  ">
    <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16C0 27.2 14.2 40.6 15.1 41.4C15.6 41.9 16.4 41.9 16.9 41.4C17.8 40.6 32 27.2 32 16C32 7.163 24.837 0 16 0Z" fill="#0E7490"/>
      <circle cx="16" cy="15" r="6.5" fill="#FFFFFF"/>
    </svg>
  </div>`,
  iconSize: [32, 42],
  iconAnchor: [16, 41],
  popupAnchor: [0, -36],
});

type Props = {
  value: MapLocation | null;
  onChange: (location: MapLocation) => void;
  fallbackQuery?: string;
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
    const targetZoom = hasSelection ? Math.max(map.getZoom(), 16) : map.getZoom();
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

export default function LocationMapPicker({
  value,
  onChange,
  fallbackQuery,
}: Props) {
  const [searchQuery, setSearchQuery] = useState(
    () => value?.address ?? fallbackQuery ?? "",
  );
  const [suggestions, setSuggestions] = useState<MapLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  const isUserTypingRef = useRef(false);
  const resolveReqIdRef = useRef(0);
  const searchReqIdRef = useRef(0);
  const lastAutoGeocodedRef = useRef("");
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

  const autoGeocodeTarget = useMemo(() => {
    if (hasValidCoords) return "";
    const fromVal = [value?.address, value?.city]
      .filter((item): item is string => Boolean(item && item.trim()))
      .join(", ")
      .trim();
    if (fromVal.length >= 3) return fromVal;
    const fromFallback = (fallbackQuery ?? "").trim();
    return fromFallback.length >= 3 ? fromFallback : "";
  }, [hasValidCoords, value?.address, value?.city, fallbackQuery]);

  useEffect(() => {
    if (!autoGeocodeTarget || isUserTypingRef.current) return;
    if (lastAutoGeocodedRef.current === autoGeocodeTarget) return;
    lastAutoGeocodedRef.current = autoGeocodeTarget;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const matches = await searchPlaces(autoGeocodeTarget);
        if (cancelled || matches.length === 0) return;
        const current = valueRef.current;
        if (
          current &&
          Number.isFinite(current.lat) &&
          Number.isFinite(current.lng)
        ) {
          return;
        }
        const top = matches[0];
        const resolvedAddress = current?.address?.trim() || top.address;
        const resolvedCity = current?.city?.trim() || top.city || null;
        if (!isUserTypingRef.current) {
          setSearchQuery(resolvedAddress);
        }
        onChange({
          lat: normalizeCoord(top.lat),
          lng: normalizeCoord(top.lng),
          address: resolvedAddress,
          city: resolvedCity,
        });
      } catch {
        // Silencioso en auto-geocodificación inicial
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [autoGeocodeTarget, onChange]);

  const valLat = value?.lat;
  const valLng = value?.lng;

  const center = useMemo<[number, number]>(() => {
    if (
      typeof valLat === "number" &&
      Number.isFinite(valLat) &&
      typeof valLng === "number" &&
      Number.isFinite(valLng)
    ) {
      return [valLat, valLng];
    }
    return DEFAULT_CENTER;
  }, [valLat, valLng]);

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
    setIsUserTyping(false);
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
        setIsUserTyping(false);
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
      setIsUserTyping(false);
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
      setIsUserTyping(false);
      setSearchQuery(fallbackLocation.address);
      setSuggestions([]);
      onChange(fallbackLocation);
    } finally {
      if (reqId === resolveReqIdRef.current) {
        setIsResolving(false);
      }
    }
  }

  async function handleResolveSharedText(
    rawText: string,
    options?: { silentIfNotFound?: boolean },
  ): Promise<boolean> {
    const trimmed = rawText.trim();
    if (!trimmed) return false;

    resolveReqIdRef.current += 1;
    const reqId = resolveReqIdRef.current;
    setIsResolving(true);
    setSuggestions([]);

    try {
      const resolved = await resolveSharedLocation(trimmed);
      if (reqId !== resolveReqIdRef.current) return false;

      if (resolved) {
        isUserTypingRef.current = false;
        setIsUserTyping(false);
        const normalized: MapLocation = {
          address: resolved.address,
          city: resolved.city ?? valueRef.current?.city ?? null,
          lat: normalizeCoord(resolved.lat),
          lng: normalizeCoord(resolved.lng),
        };
        setSearchQuery(normalized.address);
        onChange(normalized);
        addToast({
          title: "Ubicación detectada en el mapa",
          description: `${normalized.address}${
            normalized.city ? ` (${normalized.city})` : ""
          }`,
          color: "success",
        });
        return true;
      }

      if (!options?.silentIfNotFound) {
        addToast({
          title: "No se pudo leer el enlace de ubicación",
          description:
            "Pega el enlace completo de Google Maps / WhatsApp o escribe la dirección.",
          color: "warning",
        });
      }
      return false;
    } catch {
      if (!options?.silentIfNotFound) {
        addToast({
          title: "Error al procesar la ubicación",
          description: "Intenta pegar nuevamente el enlace o busca la calle.",
          color: "warning",
        });
      }
      return false;
    } finally {
      if (reqId === resolveReqIdRef.current) {
        setIsResolving(false);
      }
    }
  }

  async function handlePasteFromClipboardButton() {
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
      addToast({
        title: "Pega en el buscador",
        description:
          "Mantén presionado el campo de texto y selecciona Pegar (Ctrl+V).",
        color: "warning",
      });
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        addToast({
          title: "Portapapeles vacío",
          description:
            "Copia primero la ubicación o enlace desde WhatsApp o Google Maps.",
          color: "warning",
        });
        return;
      }
      const ok = await handleResolveSharedText(text, { silentIfNotFound: true });
      if (!ok) {
        setSearchQuery(text.trim());
        void applyManualSearchQuery(text.trim());
      }
    } catch {
      addToast({
        title: "Permiso de portapapeles",
        description:
          "Pega directamente el enlace de WhatsApp dentro del cuadro de búsqueda (Ctrl+V).",
        color: "warning",
      });
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
      let errMsg =
        "Permite el acceso a la ubicación desde el ícono junto a la barra de direcciones, o pega el link de WhatsApp / Google Maps.";
      if (err.code === err.TIMEOUT) {
        errMsg =
          "Se agotó el tiempo buscando el GPS. Puedes tocar el mapa o pegar el link de WhatsApp.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        errMsg =
          "Tu dispositivo no reportó señal GPS. Toca el mapa o pega el link de ubicación de WhatsApp.";
      }

      addToast({
        title: "No se pudo obtener tu GPS actual",
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
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 },
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 },
    );
  };

  useEffect(() => {
    if (!isUserTypingRef.current) {
      return;
    }

    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 3) {
      return;
    }

    // Si el texto pegado es un enlace de WhatsApp / Google Maps o coordenadas GPS, resolverlo de inmediato
    if (looksLikeSharedLocationText(trimmed)) {
      const timer = window.setTimeout(() => {
        void handleResolveSharedText(trimmed, { silentIfNotFound: true });
      }, 120);
      return () => window.clearTimeout(timer);
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
    }, 320);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  function handleSuggestionSelect(location: MapLocation) {
    resolveReqIdRef.current += 1;
    isUserTypingRef.current = false;
    setIsUserTyping(false);
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

    if (looksLikeSharedLocationText(trimmed)) {
      const resolvedOk = await handleResolveSharedText(trimmed, {
        silentIfNotFound: true,
      });
      if (resolvedOk) return;
    }

    resolveReqIdRef.current += 1;
    const reqId = resolveReqIdRef.current;
    isUserTypingRef.current = false;
    setIsUserTyping(false);
    const currentSuggestions = suggestions;
    setSuggestions([]);

    const currentVal = valueRef.current;

    if (currentSuggestions.length > 0) {
      const top = currentSuggestions[0];
      onChange({
        lat: normalizeCoord(top.lat),
        lng: normalizeCoord(top.lng),
        address: trimmed,
        city: top.city || currentVal?.city || null,
      });
      return;
    }

    setIsSearching(true);
    try {
      const matches = await searchPlaces(trimmed);
      if (reqId !== resolveReqIdRef.current) return;
      if (matches.length > 0) {
        const top = matches[0];
        const cleanAddress =
          looksLikeSharedLocationText(trimmed) || /^https?:/i.test(trimmed)
            ? top.address
            : trimmed;
        setSearchQuery(cleanAddress);
        onChange({
          lat: normalizeCoord(top.lat),
          lng: normalizeCoord(top.lng),
          address: cleanAddress,
          city: top.city || currentVal?.city || null,
        });
        return;
      }
    } catch {
      // Fallback below if searchPlaces fails
    } finally {
      if (reqId === resolveReqIdRef.current) {
        setIsSearching(false);
      }
    }

    if (
      currentVal &&
      Number.isFinite(currentVal.lat) &&
      Number.isFinite(currentVal.lng)
    ) {
      onChange({
        lat: currentVal.lat,
        lng: currentVal.lng,
        address: trimmed,
        city: currentVal.city ?? null,
      });
      return;
    }

    onChange({
      lat: Number.NaN,
      lng: Number.NaN,
      address: trimmed,
      city: currentVal?.city ?? null,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-default-500 flex items-center gap-1.5">
          <Icon
            icon="ic:baseline-whatsapp"
            className="text-success shrink-0"
            width={15}
          />
          Puedes pegar un link o mensaje de ubicación de WhatsApp / Google Maps
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="flat"
            color="success"
            radius="full"
            className="h-7 text-xs font-semibold px-3"
            isLoading={isResolving}
            onPress={() => void handlePasteFromClipboardButton()}
            startContent={
              !isResolving ? (
                <Icon icon="lucide:clipboard-paste" className="w-3.5 h-3.5" />
              ) : undefined
            }
          >
            Pegar de WhatsApp / Maps
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            radius="full"
            className="h-7 text-xs font-semibold px-3"
            isLoading={isResolving}
            onPress={requestCurrentLocation}
            startContent={
              !isResolving ? (
                <Icon icon="lucide:locate-fixed" className="w-3.5 h-3.5" />
              ) : undefined
            }
          >
            Mi ubicación GPS
          </Button>
        </div>
      </div>

      <div className="relative z-30 flex gap-2 items-start">
        <div className="flex-1 relative">
          <Input
            label="Buscar lugar o pegar link de WhatsApp / Maps"
            placeholder="Ej. Av. Mariscal Cáceres 820, Ayacucho o pega https://maps.app.goo.gl/..."
            description="Escribe la calle, pega la ubicación compartida de WhatsApp o toca el mapa para fijar el pin."
            value={searchQuery}
            onPaste={(e) => {
              const pasted = e.clipboardData?.getData("text") ?? "";
              if (pasted && looksLikeSharedLocationText(pasted)) {
                e.preventDefault();
                setSearchQuery(pasted.trim());
                void handleResolveSharedText(pasted);
              }
            }}
            onValueChange={(val) => {
              isUserTypingRef.current = true;
              setIsUserTyping(true);
              setSearchQuery(val);
              const trimmed = val.trim();
              if (!trimmed || trimmed.length < 3) {
                setSuggestions([]);
              } else if (
                !looksLikeSharedLocationText(trimmed) &&
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
                {isSearching || isResolving ? (
                  <Spinner size="sm" color="primary" />
                ) : null}
                {searchQuery.trim().length >= 3 ? (
                  <Button
                    color="primary"
                    variant="light"
                    size="sm"
                    isIconOnly
                    onPress={() => {
                      void applyManualSearchQuery(searchQuery);
                    }}
                    aria-label="Buscar dirección en el mapa"
                    className="text-primary-text hover:bg-primary-50"
                  >
                    <Icon icon="lucide:search" className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>
            }
          />
          {suggestions.length > 0 ? (
            <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-2xl border border-default-200 bg-content1 shadow-lg">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.lat}-${suggestion.lng}-${index}`}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm hover:bg-default-100 transition-colors flex items-start gap-2"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <Icon
                      icon="lucide:map-pin"
                      className="w-4 h-4 text-primary shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {suggestion.address}
                      </p>
                      {suggestion.city ? (
                        <p className="text-xs text-default-500">
                          {suggestion.city}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {searchQuery.trim().length >= 3 &&
      (isUserTyping || !hasValidCoords || value?.address !== searchQuery.trim()) ? (
        <Button
          size="sm"
          variant="flat"
          color="secondary"
          className="self-start text-xs font-medium max-w-full text-left whitespace-normal h-auto py-1.5"
          onPress={() => {
            void applyManualSearchQuery(searchQuery);
          }}
        >
          {looksLikeSharedLocationText(searchQuery)
            ? "Detectar coordenadas y dirección desde el enlace pegado"
            : `Usar "${searchQuery.trim()}" como lugar del evento`}
        </Button>
      ) : null}

      <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden border border-default-200 isolate bg-default-100">
        <MapContainer
          center={center}
          zoom={hasValidCoords ? 16 : 13}
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
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[400] rounded-xl border border-primary/25 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-sm flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">
                  {isResolving
                    ? "Actualizando dirección..."
                    : "Pin GPS confirmado"}
                </p>
                {value.city ? (
                  <Chip size="sm" variant="flat" color="primary" className="h-4 text-[10px]">
                    {value.city}
                  </Chip>
                ) : null}
              </div>
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
                : "Toca el mapa para fijar el pin o pega la ubicación de WhatsApp."}
            </p>
            {isResolving ? <Spinner size="sm" color="warning" /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
