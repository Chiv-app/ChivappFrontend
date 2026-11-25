"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
                zoom={16}
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
