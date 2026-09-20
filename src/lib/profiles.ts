import { apiFetch } from "@/lib/api";
import type {
    ContractorContractGenerateOut,
    ContractorProfileOut,
    ContractorProfileUpdate,
    MusicianContractGenerateOut,
    MusicianProfileOut,
    MusicianProfileUpdate,
    ProfileValidationOut,
} from "@/types/api";

export function getMusicianProfile() {
    return apiFetch<MusicianProfileOut>("/profiles/musician/me");
}

export function getMusicianProfileStatus() {
    return apiFetch<ProfileValidationOut>("/profiles/musician/me/status");
}

export function updateMusicianProfile(payload: MusicianProfileUpdate) {
    return apiFetch<MusicianProfileOut>("/profiles/musician", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function submitMusicianProfile() {
    return apiFetch<MusicianProfileOut>("/profiles/musician/submit", {
        method: "POST",
    });
}

export function onboardMusicianProfile() {
    return apiFetch<MusicianProfileOut>("/profiles/musician/onboard", {
        method: "POST",
    });
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

export function updateContractorProfile(payload: ContractorProfileUpdate) {
    return apiFetch<ContractorProfileOut>("/profiles/contractor", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function submitContractorProfile() {
    return apiFetch<ContractorProfileOut>("/profiles/contractor/submit", {
        method: "POST",
    });
}

export function generateContractorContractPdf() {
    return apiFetch<ContractorContractGenerateOut>("/profiles/contractor/contract/generate", {
        method: "POST",
    });
}

function isSafeInternalPath(path: string): boolean {
    return path.startsWith("/") && !path.startsWith("//");
}

function matchesPathPrefix(path: string, prefix: string): boolean {
    return path === prefix || path.startsWith(`${prefix}/`);
}

/** Destino por defecto tras login/registro según rol. */
export function getPostLoginPath(role: string, isVerified = true): string {
    void isVerified;
    if (role === "admin") return "/admin";
    // Músico y contratista vuelven al landing (home público).
    if (role === "musician" || role === "contractor") return "/";
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
): string {
    const fallback = getPostLoginPath(role, isVerified);
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
        if (matchesPathPrefix(pathOnly, "/contractor")) {
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
