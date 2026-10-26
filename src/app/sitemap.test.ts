import { describe, expect, it, vi } from "vitest";
import type { MusicianCard } from "@/types/ui/musician";

const getMusiciansMock = vi.fn();

vi.mock("@/lib/musicians", () => ({
    getMusicians: (...args: unknown[]) => getMusiciansMock(...args),
}));

import sitemap, * as sitemapModule from "./sitemap";

function makeMusician(index: number): MusicianCard {
    return {
        id: `m-${index}`,
        slug: `musico-${index}`,
        name: `Músico ${index}`,
        genre: "Mariachi",
        genres: ["Mariachi"],
        instruments: ["Trompeta"],
        bio: null,
        city: "Lima",
        zone: null,
        price: 500,
        priceLabel: "S/ 500",
        image: null,
        images: [],
        rating: 5,
        ratingCount: 1,
        verified: true,
    };
}

describe("sitemap (FE3-03, FE5-03, FE6-06)", () => {
    it("exports dynamic='force-dynamic' and does not export revalidate", () => {
        expect(sitemapModule.dynamic).toBe("force-dynamic");
        expect("revalidate" in sitemapModule).toBe(false);
    });

    it("paginates getMusicians with limit=50 and includes musician + SEO routes", async () => {
        getMusiciansMock.mockReset();
        const firstPage = Array.from({ length: 50 }, (_, idx) => makeMusician(idx + 1));
        const secondPage = [makeMusician(51)];

        getMusiciansMock
            .mockResolvedValueOnce(firstPage)
            .mockResolvedValueOnce(secondPage);

        const entries = await sitemap();

        expect(getMusiciansMock).toHaveBeenCalledTimes(2);
        expect(getMusiciansMock).toHaveBeenNthCalledWith(1, { limit: 50, skip: 0 });
        expect(getMusiciansMock).toHaveBeenNthCalledWith(2, { limit: 50, skip: 50 });

        const urls = entries.map((entry) => entry.url);
        expect(urls.some((u) => u.endsWith("/legal/reembolsos"))).toBe(true);
        expect(urls.some((u) => u.endsWith("/musicians/musico-1"))).toBe(true);
        expect(urls.some((u) => u.endsWith("/musicians/musico-51"))).toBe(true);
        expect(urls.some((u) => u.endsWith("/musicos/mariachi/lima"))).toBe(true);
    });

    it("rejects when getMusicians fails on the first page (FE6-06)", async () => {
        getMusiciansMock.mockReset();
        getMusiciansMock.mockRejectedValueOnce(new Error("Backend unavailable"));

        await expect(sitemap()).rejects.toThrow("Backend unavailable");
    });
});
