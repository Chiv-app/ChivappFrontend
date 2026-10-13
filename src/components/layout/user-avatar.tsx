"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@heroui/react";
import { resolveUploadUrl } from "@/lib/uploads";
import { getMusicianProfile } from "@/lib/profiles";
import type { UserOut } from "@/types/api";

export function getUserInitials(fullname: string | null | undefined): string {
    if (!fullname?.trim()) return "?";
    const parts = fullname.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type Props = {
    user: UserOut;
    size?: "sm" | "md" | "lg";
    className?: string;
    showBorder?: boolean;
};

export default function UserAvatar({
    user,
    size = "sm",
    className,
    showBorder = false,
}: Props) {
    const fromUser = resolveUploadUrl(user.profile_picture_url);
    const [musicianImageUrl, setMusicianImageUrl] = useState<string | null>(null);
    const [hasLoadedMusician, setHasLoadedMusician] = useState(false);

    useEffect(() => {
        if (user.role !== "musician") {
            return;
        }

        let cancelled = false;
        getMusicianProfile()
            .then((profile) => {
                if (!cancelled) {
                    setMusicianImageUrl(resolveUploadUrl(profile.profile_image_url));
                    setHasLoadedMusician(true);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setMusicianImageUrl(null);
                    setHasLoadedMusician(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [user.id, user.role]);

    // Priority: 1. Musician Profile Image (if loaded and exists), 2. Google/User Profile Picture, 3. Fallback
    const imageUrl = user.role === "musician" 
        ? (hasLoadedMusician && musicianImageUrl ? musicianImageUrl : fromUser)
        : fromUser;

    return (
        <Avatar
            src={imageUrl ?? undefined}
            name={getUserInitials(user.fullname)}
            showFallback
            getInitials={() => getUserInitials(user.fullname)}
            size={size}
            className={`${showBorder ? "ring-2 ring-primary/20" : ""} ${className ?? ""}`}
            classNames={{
                base: "bg-secondary/15 text-secondary shrink-0",
                name: "font-semibold",
            }}
        />
    );
}
