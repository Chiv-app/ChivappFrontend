import { apiFetch, ApiError } from "@/lib/api";
import {
    toMusicianCardFromList,
    toMusicianCardFromSearch,
    toMusicianDetail,
} from "@/lib/mappers";
import type {
    MusicianProfileListOut,
    MusicianProfilePublicOut,
    MusicianSearchFilters,
    MusicianSearchResult,
    PlatformStatsOut,
} from "@/types/api";
import type { MusicianCard, MusicianDetail } from "@/types/ui/musician";

type ListMusiciansParams = {
    skip?: number;
    limit?: number;
};

function filterVerifiedMusicians(musicians: MusicianCard[]): MusicianCard[] {
    return musicians.filter((musician) => musician.verified);
}

export async function getMusicians(
    params: ListMusiciansParams = {},
): Promise<MusicianCard[]> {
    const skip = params.skip ?? 0;
    const limit = params.limit ?? 20;

    const data = await apiFetch<MusicianProfileListOut[]>(
        `/profiles/musicians?skip=${skip}&limit=${limit}`,
    );

    return filterVerifiedMusicians(data.map(toMusicianCardFromList));
}

export async function getMusicianById(id: string): Promise<MusicianDetail> {
    const data = await apiFetch<MusicianProfilePublicOut>(
        `/profiles/musicians/${id}`,
    );

    const musician = toMusicianDetail(data);
    if (!musician.verified) {
        throw new ApiError(`/profiles/musicians/${id}`, 404, "Perfil no encontrado");
    }

    return musician;
}

/** Cifras reales para la landing. Nunca rompe el render del home si falla. */
export async function getPlatformStats(): Promise<PlatformStatsOut | null> {
    try {
        return await apiFetch<PlatformStatsOut>("/profiles/stats");
    } catch {
        return null;
    }
}

export async function getLatestReviews(limit: number = 6): Promise<any[]> {
    try {
        return await apiFetch<any[]>(`/profiles/reviews/latest?limit=${limit}`);
    } catch {
        return [];
    }
}

export async function searchMusicians(
    filters: MusicianSearchFilters,
): Promise<MusicianCard[]> {
    const data = await apiFetch<MusicianSearchResult[]>("/musicians/search", {
        method: "POST",
        body: JSON.stringify(filters),
    });

    return filterVerifiedMusicians(data.map(toMusicianCardFromSearch));
}
