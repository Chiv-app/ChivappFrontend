import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapLocation } from "@/lib/geocoding";

const {
    reverseGeocodeMock,
    searchPlacesMock,
    setViewMock,
    invalidateSizeMock,
    mapClickState,
    markerDragState,
} = vi.hoisted(() => ({
    reverseGeocodeMock: vi.fn(),
    searchPlacesMock: vi.fn(),
    setViewMock: vi.fn(),
    invalidateSizeMock: vi.fn(),
    mapClickState: {
        handler: null as ((event: { latlng: { lat: number; lng: number } }) => void) | null,
    },
    markerDragState: {
        dragend: null as ((event: { target: { getLatLng: () => { lat: number; lng: number } } }) => void) | null,
    },
}));

vi.mock("react-leaflet", () => ({
    MapContainer: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="leaflet-map">{children}</div>
    ),
    TileLayer: () => <div data-testid="tile-layer" />,
    Marker: ({
        position,
        eventHandlers,
    }: {
        position: [number, number];
        eventHandlers?: { dragend?: (e: unknown) => void };
    }) => {
        markerDragState.dragend = (eventHandlers?.dragend as typeof markerDragState.dragend) ?? null;
        return (
            <div
                data-testid="map-marker"
                data-lat={position[0]}
                data-lng={position[1]}
            />
        );
    },
    useMap: () => ({
        setView: setViewMock,
        getZoom: () => 12,
        invalidateSize: invalidateSizeMock,
        getContainer: () => document.createElement("div"),
    }),
    useMapEvents: (handlers: {
        click?: (event: { latlng: { lat: number; lng: number } }) => void;
    }) => {
        mapClickState.handler = handlers.click ?? null;
        return null;
    },
}));

vi.mock("@/lib/geocoding", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/geocoding")>();
    return {
        ...actual,
        reverseGeocode: (...args: unknown[]) => reverseGeocodeMock(...args),
        searchPlaces: (...args: unknown[]) => searchPlacesMock(...args),
    };
});

import LocationMapPicker from "./location-map-picker";

describe("LocationMapPicker", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mapClickState.handler = null;
        markerDragState.dragend = null;
    });

    it("captures coordinates immediately on map click before reverseGeocode resolves and does not trigger searchPlaces", async () => {
        let resolveGeo!: (loc: MapLocation | null) => void;
        reverseGeocodeMock.mockReturnValueOnce(
            new Promise<MapLocation | null>((resolve) => {
                resolveGeo = resolve;
            }),
        );

        const onChange = vi.fn();
        render(<LocationMapPicker value={null} onChange={onChange} />);

        expect(mapClickState.handler).not.toBeNull();
        mapClickState.handler?.({
            latlng: { lat: -12.1219874, lng: -77.0298761 },
        });

        // Immediately called before reverseGeocode resolves
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenLastCalledWith({
            lat: -12.121987,
            lng: -77.029876,
            address: "Ubicación marcada (-12.12199, -77.02988)",
            city: null,
        });

        // Now resolve reverseGeocode
        resolveGeo({
            lat: -12.121987,
            lng: -77.029876,
            address: "Av. José Larco 812, Miraflores",
            city: "Miraflores",
        });

        await waitFor(() => {
            expect(onChange).toHaveBeenLastCalledWith({
                lat: -12.121987,
                lng: -77.029876,
                address: "Av. José Larco 812, Miraflores",
                city: "Miraflores",
            });
        });

        expect(searchPlacesMock).not.toHaveBeenCalled();
    });

    it("falls back gracefully when reverseGeocode rejects and updates coordinates on marker drag", async () => {
        reverseGeocodeMock.mockRejectedValueOnce(new Error("Network failure"));

        const onChange = vi.fn();
        const initial: MapLocation = {
            lat: -12.0464,
            lng: -77.0428,
            address: "Plaza Mayor de Lima",
            city: "Lima",
        };
        render(<LocationMapPicker value={initial} onChange={onChange} />);

        expect(markerDragState.dragend).not.toBeNull();
        markerDragState.dragend?.({
            target: {
                getLatLng: () => ({ lat: -12.0951234, lng: -77.0354321 }),
            },
        });

        await waitFor(() => {
            expect(onChange).toHaveBeenLastCalledWith({
                lat: -12.095123,
                lng: -77.035432,
                address: "Ubicación marcada (-12.09512, -77.03543)",
                city: "Lima",
            });
        });
    });

    it("keeps pin coordinates when user refines the address text in the search input", async () => {
        searchPlacesMock.mockResolvedValue([]);
        const user = userEvent.setup();
        const onChange = vi.fn();
        const initial: MapLocation = {
            lat: -12.111222,
            lng: -77.033444,
            address: "Av. Arequipa 1200",
            city: "Lince",
        };

        render(<LocationMapPicker value={initial} onChange={onChange} />);

        const input = screen.getByLabelText(/Buscar lugar/i);
        await user.clear(input);
        await user.type(input, "Av. Arequipa 1200, Dpto 402");

        expect(onChange).toHaveBeenLastCalledWith({
            lat: -12.111222,
            lng: -77.033444,
            address: "Av. Arequipa 1200, Dpto 402",
            city: "Lince",
        });
    });
});
