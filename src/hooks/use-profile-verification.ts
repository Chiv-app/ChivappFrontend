"use client";

import { useCallback, useEffect, useState } from "react";
import {
    getContractorProfileStatus,
    getMusicianProfileStatus,
    invalidateProfileVerificationCache,
    PROFILE_VERIFICATION_INVALIDATED_EVENT,
    profileStatusCache,
    type ProfileVerificationRole,
} from "@/lib/profiles";
import type { ProfileValidationOut } from "@/types/api";

export { invalidateProfileVerificationCache };

const STATUS_CACHE_TTL_MS = 10_000;

function fetchProfileStatusDeduplicated(
    role: ProfileVerificationRole,
    force = false,
): Promise<ProfileValidationOut> {
    if (force) {
        profileStatusCache.delete(role);
    }
    const now = Date.now();
    const existing = profileStatusCache.get(role);
    if (existing?.promise) {
        return existing.promise;
    }
    if (existing?.data && existing.expiresAt > now) {
        return Promise.resolve(existing.data);
    }

    const fetchStatus =
        role === "musician" ? getMusicianProfileStatus : getContractorProfileStatus;

    const promise = fetchStatus()
        .then((data) => {
            profileStatusCache.set(role, {
                data,
                expiresAt: Date.now() + STATUS_CACHE_TTL_MS,
            });
            return data;
        })
        .catch((err) => {
            profileStatusCache.delete(role);
            throw err;
        });

    profileStatusCache.set(role, {
        data: existing?.data,
        expiresAt: existing?.expiresAt ?? 0,
        promise,
    });

    return promise;
}

export function useProfileVerification(
    role: ProfileVerificationRole,
    enabled: boolean,
    userIsVerified = false,
) {
    const [status, setStatus] = useState<ProfileValidationOut | null>(null);
    const [loadedRole, setLoadedRole] = useState<ProfileVerificationRole | null>(null);
    const [hasError, setHasError] = useState(false);

    const refetch = useCallback(
        async (force = true) => {
            if (!enabled) return;
            try {
                const data = await fetchProfileStatusDeduplicated(role, force);
                setStatus(data);
                setHasError(false);
            } catch {
                setStatus(null);
                setHasError(true);
            } finally {
                setLoadedRole(role);
            }
        },
        [enabled, role],
    );

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        fetchProfileStatusDeduplicated(role)
            .then((data) => {
                if (!cancelled) {
                    setStatus(data);
                    setHasError(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setStatus(null);
                    setHasError(true);
                }
            })
            .finally(() => {
                if (!cancelled) setLoadedRole(role);
            });

        function handleInvalidated(event: Event) {
            const detail = (event as CustomEvent<{ role?: ProfileVerificationRole }>).detail;
            if (!detail?.role || detail.role === role) {
                void refetch(true);
            }
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                void refetch(true);
            }
        }

        window.addEventListener(
            PROFILE_VERIFICATION_INVALIDATED_EVENT,
            handleInvalidated,
        );
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            cancelled = true;
            window.removeEventListener(
                PROFILE_VERIFICATION_INVALIDATED_EVENT,
                handleInvalidated,
            );
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [enabled, role, refetch]);

    const hasLoaded = loadedRole === role;

    const profileIsVerified = hasError
        ? userIsVerified
        : (status?.status === "published" || status?.is_public === true) &&
          userIsVerified;

    return {
        isLoading: enabled && !hasLoaded,
        isVerified: enabled && profileIsVerified,
        status: enabled ? status : null,
        error: enabled && hasError,
        refetch,
    };
}
