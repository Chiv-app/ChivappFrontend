"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LiveMapPoint = {
    key: string;
    lat: number;
    lng: number;
    label: string;
    color: string;
};

type Props = {
    points: LiveMapPoint[];
    className?: string;
};

function coloredIcon(color: string) {
    return L.divIcon({
        className: "",
        html: `<span style="
            display:block;
            width:18px;height:18px;
            border-radius:9999px;
            background:${color};
            border:2px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,.35);
        "></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -10],
    });
}

function FitBounds({ points }: { points: LiveMapPoint[] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        if (points.length === 1) {
            map.setView([points[0].lat, points[0].lng], 15);
            return;
        }
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds.pad(0.25), { maxZoom: 16 });
    }, [map, points]);

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

    return null;
}

export default function LiveLocationMapInner({ points, className }: Props) {
    const center = useMemo<[number, number]>(() => {
        if (points.length === 0) return [-12.0464, -77.0428];
        return [points[0].lat, points[0].lng];
    }, [points]);

    return (
        <div
            className={`relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-default-200 isolate ${className ?? ""}`}
        >
            <MapContainer
                center={center}
                zoom={14}
                className="h-full w-full"
                scrollWheelZoom={false}
                dragging
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {points.map((point) => (
                    <Marker
                        key={point.key}
                        position={[point.lat, point.lng]}
                        icon={coloredIcon(point.color)}
                    >
                        <Popup>{point.label}</Popup>
                    </Marker>
                ))}
                <FitBounds points={points} />
            </MapContainer>
        </div>
    );
}
