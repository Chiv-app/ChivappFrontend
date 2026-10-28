"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function InvalidateSize({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        const timers = [80, 250, 500].map((ms) =>
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

    useEffect(() => {
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            map.setView([lat, lng], map.getZoom());
        }
    }, [lat, lng, map]);

    return null;
}

type Props = {
    lat: number;
    lng: number;
};

export default function LocationMapPreviewInner({ lat, lng }: Props) {
    return (
        <div className="relative h-52 sm:h-60 rounded-2xl overflow-hidden border border-default-200 isolate">
            <MapContainer
                center={[lat, lng]}
                zoom={15}
                className="h-full w-full"
                scrollWheelZoom={false}
                dragging
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]} icon={markerIcon} />
                <InvalidateSize lat={lat} lng={lng} />
            </MapContainer>
        </div>
    );
}
