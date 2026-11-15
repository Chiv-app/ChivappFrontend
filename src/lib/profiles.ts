import { apiFetch } from "@/lib/api";
import type {
    ContractorContractGenerateOut,
    ContractorProfileOut,
    ContractorProfileUpdate,
    MusicianContractGenerateOut,
    MusicianProfileOut,
    MusicianProfileSummary,
    MusicianProfileUpdate,
    ProfileValidationOut,
    UserRole,
} from "@/types/api";

export type ProfileVerificationRole = Extract<UserRole, "musician" | "contractor">;

export const PROFILE_VERIFICATION_INVALIDATED_EVENT =
    "chivapp:profile-verification-invalidated";

type CacheEntry = {
    data?: ProfileValidationOut;
    expiresAt: number;
    promise?: Promise<ProfileValidationOut>;
};

export const profileStatusCache = new Map<ProfileVerificationRole, CacheEntry>();

export function invalidateProfileVerificationCache(role?: ProfileVerificationRole) {
    if (role) {
        profileStatusCache.delete(role);
    } else {
        profileStatusCache.clear();
    }
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent(PROFILE_VERIFICATION_INVALIDATED_EVENT, {
                detail: { role },
            }),
        );
    }
}

export function getMusicianProfile() {
    return apiFetch<MusicianProfileOut>("/profiles/musician/me");
}

/** Los perfiles artísticos de la persona, el principal primero. */
export function listMyMusicianProfiles() {
    return apiFetch<MusicianProfileSummary[]>("/profiles/musician/mine");
}

/** Crea un perfil adicional en borrador (reutiliza documento, firma y cobro de la persona). */
export function createAdditionalMusicianProfile() {
    return apiFetch<MusicianProfileOut>("/profiles/musician/additional", { method: "POST" });
}

export function getMusicianProfileStatus() {
    return apiFetch<ProfileValidationOut>("/profiles/musician/me/status");
}

export async function updateMusicianProfile(payload: MusicianProfileUpdate) {
    const res = await apiFetch<MusicianProfileOut>("/profiles/musician", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    invalidateProfileVerificationCache("musician");
    return res;
}

export async function submitMusicianProfile() {
    const res = await apiFetch<MusicianProfileOut>("/profiles/musician/submit", {
        method: "POST",
    });
    invalidateProfileVerificationCache("musician");
    return res;
}

export async function onboardMusicianProfile() {
    const res = await apiFetch<MusicianProfileOut>("/profiles/musician/onboard", {
        method: "POST",
    });
    invalidateProfileVerificationCache("musician");
    return res;
}

export function generateMusicianContractPdf() {
    return apiFetch<MusicianContractGenerateOut>("/profiles/musician/contract/generate", {
        method: "POST",
    });
}

export function getContractorProfile() {
    return apiFetch<ContractorProfileOut>("/profiles/contractor/me");
}

export function getContractorProfileStatus() {
    return apiFetch<ProfileValidationOut>("/profiles/contractor/me/status");
}

export async function updateContractorProfile(payload: ContractorProfileUpdate) {
    const res = await apiFetch<ContractorProfileOut>("/profiles/contractor", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    invalidateProfileVerificationCache("contractor");
    return res;
}

export async function submitContractorProfile() {
    const res = await apiFetch<ContractorProfileOut>("/profiles/contractor/submit", {
        method: "POST",
    });
    invalidateProfileVerificationCache("contractor");
    return res;
}

export function generateContractorContractPdf() {
    return apiFetch<ContractorContractGenerateOut>("/profiles/contractor/contract/generate", {
        method: "POST",
    });
}

function isSafeInternalPath(path: string): boolean {
    // "/\evil.com" lo normalizan los navegadores a "//evil.com".
    return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

function matchesPathPrefix(path: string, prefix: string): boolean {
    return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * Destino por defecto tras login/registro según rol.
 *
 * Un músico que aún no está aprobado va a la guía de alta: si no la terminó, la retoma; si ya la envió,
 * la propia guía lo lleva a su panel. Quien es solo integrante de una agrupación no tiene perfil propio
 * que armar y va a sus reservas.
 */
export function getPostLoginPath(role: string, isVerified = true, isEnsembleMember = false): string {
    if (role === "admin") return "/admin";
    if (role === "musician") {
        if (isEnsembleMember) return "/musician/bookings";
        return isVerified ? "/" : "/musician/onboarding";
    }
    // El contratista vuelve al landing (home público).
    return "/";
}

/**
 * Resuelve el redirect post-auth: respeta `?redirect=` solo si es seguro
 * y compatible con el rol (evita paneles ajenos → pantalla vacía).
 */
export function resolveAuthRedirect(
    role: string,
    requestedRedirect: string | null | undefined,
    isVerified = true,
    isEnsembleMember = false,
): string {
    const fallback = getPostLoginPath(role, isVerified, isEnsembleMember);
    if (!requestedRedirect) return fallback;
    if (!isSafeInternalPath(requestedRedirect)) return fallback;

    const pathOnly = requestedRedirect.split(/[?#]/)[0] || "/";

    if (pathOnly === "/") {
        // Home o home con hash/query (ej. /#musicians).
        if (
            requestedRedirect !== "/" &&
            (role === "musician" || role === "contractor")
        ) {
            return requestedRedirect;
        }
        return fallback;
    }

    if (role === "admin") {
        return matchesPathPrefix(pathOnly, "/admin") ? requestedRedirect : fallback;
    }

    if (role === "musician") {
        if (matchesPathPrefix(pathOnly, "/musician")) {
            return requestedRedirect;
        }
        if (
            matchesPathPrefix(pathOnly, "/musicians") ||
            matchesPathPrefix(pathOnly, "/contractors") ||
            matchesPathPrefix(pathOnly, "/share")
        ) {
            return requestedRedirect;
        }
        return fallback;
    }

    if (role === "contractor") {
        if (matchesPathPrefix(pathOnly, "/contractor") || matchesPathPrefix(pathOnly, "/pay")) {
            return requestedRedirect;
        }
        if (
            matchesPathPrefix(pathOnly, "/musicians") ||
            matchesPathPrefix(pathOnly, "/contractors") ||
            matchesPathPrefix(pathOnly, "/share")
        ) {
            return requestedRedirect;
        }
        return fallback;
    }

    return fallback;
}

export async function checkUsername(username: string): Promise<{ available: boolean; message: string; normalized?: string }> {
    return apiFetch<{ available: boolean; message: string; normalized?: string }>(`/profiles/check-username?username=${encodeURIComponent(username)}`);
}
