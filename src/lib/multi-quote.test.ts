import { describe, expect, it } from "vitest";
import {
    MULTI_QUOTE_MAX,
    buildMultiQuoteHref,
    parseMultiQuoteIds,
} from "@/lib/multi-quote";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("Cotización múltiple", () => {
    it("lee los artistas de la URL sin repetidos ni valores inválidos", () => {
        expect(parseMultiQuoteIds(`${A},${B},${A}, <script>`)).toEqual([A, B]);
        expect(parseMultiQuoteIds("")).toEqual([]);
        expect(parseMultiQuoteIds(null)).toEqual([]);
    });

    it("no acepta más de 5 artistas", () => {
        const many = Array.from({ length: 9 }, (_, i) => `0000000${i}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`);
        expect(parseMultiQuoteIds(many.join(","))).toHaveLength(MULTI_QUOTE_MAX);
    });

    it("arma el enlace con los artistas elegidos", () => {
        expect(buildMultiQuoteHref([A, B])).toBe(`/cotizacion-multiple?ids=${A},${B}`);
    });
});
