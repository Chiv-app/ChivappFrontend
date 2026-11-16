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
    overrideImageUrl?: string | null;
    overrideName?: string | null;
};

export default function UserAvatar({
    user,
    size = "sm",
    className,
    showBorder = false,
    overrideImageUrl,
    overrideName,
}: Props) {
    const fromUser = resolveUploadUrl(user.profile_picture_url);
    const fromOverride = overrideImageUrl !== undefined ? resolveUploadUrl(overrideImageUrl) : undefined;
    const [musicianImageUrl, setMusicianImageUrl] = useState<string | null>(null);
    const [hasLoadedMusician, setHasLoadedMusician] = useState(false);

    useEffect(() => {
        if (user.role !== "musician" || overrideImageUrl !== undefined) {
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
    }, [user.id, user.role, overrideImageUrl]);

    const displayName = overrideName?.trim() || user.fullname;
    const imageUrl =
        fromOverride !== undefined
            ? fromOverride || fromUser
            : user.role === "musician"
              ? hasLoadedMusician && musicianImageUrl
                  ? musicianImageUrl
                  : fromUser
              : fromUser;

    return (
        <Avatar
            src={imageUrl ?? undefined}
            name={getUserInitials(displayName)}
            showFallback
            getInitials={() => getUserInitials(displayName)}
            size={size}
            className={`${showBorder ? "ring-2 ring-primary/20" : ""} ${className ?? ""}`}
            classNames={{
                base: "bg-secondary/15 text-secondary shrink-0",
                name: "font-semibold",
            }}
        />
    );
}
