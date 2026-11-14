import { describe, expect, it } from "vitest";
import { ICON_COLLECTIONS } from "@/lib/icon-data.generated";
import { getInstrumentIcon } from "@/lib/instrument-icons";
import { CITY_OPTIONS, GENRE_OPTIONS, INSTRUMENT_OPTIONS } from "@/lib/onboarding-guide";
import {
    OTHER_GENRE_ICON,
    OTHER_INSTRUMENT_ICON,
    getCityIcon,
    getGenreIcon,
    getGuideInstrumentIcon,
} from "@/lib/onboarding-icons";

/** True si el ícono está en el paquete sin conexión (si no, se vería en blanco). */
function isBundled(icon: string): boolean {
    const [prefix, name] = icon.split(":");
    const collection = ICON_COLLECTIONS.find((c) => c.prefix === prefix);
    if (!collection) return false;
    return Boolean(collection.icons[name] ?? collection.aliases?.[name]);
}

const genreIcons = GENRE_OPTIONS.map(getGenreIcon);
const instrumentIcons = INSTRUMENT_OPTIONS.map(getGuideInstrumentIcon);
const cityIcons = CITY_OPTIONS.map(getCityIcon);

describe("íconos de la guía", () => {
    it("todos están en el paquete sin conexión", () => {
        const all = [...genreIcons, ...instrumentIcons, ...cityIcons, OTHER_GENRE_ICON, OTHER_INSTRUMENT_ICON];
        const missing = all.filter((icon) => !isBundled(icon));
        expect(missing).toEqual([]);
    });

    it("cada opción de un mismo grupo tiene un ícono propio", () => {
        expect(new Set(genreIcons).size).toBe(genreIcons.length);
        expect(new Set(instrumentIcons).size).toBe(instrumentIcons.length);
        expect(new Set(cityIcons).size).toBe(cityIcons.length);
    });

    it("«Otro género» y «Otro instrumento» no repiten ícono entre sí ni con ninguna ficha", () => {
        expect(OTHER_GENRE_ICON).not.toBe(OTHER_INSTRUMENT_ICON);
        const chips = new Set([...genreIcons, ...instrumentIcons, ...cityIcons]);
        expect(chips.has(OTHER_GENRE_ICON)).toBe(false);
        expect(chips.has(OTHER_INSTRUMENT_ICON)).toBe(false);
    });

    it("lo que el usuario escribe a mano cae en un ícono genérico que existe", () => {
        expect(isBundled(getGenreIcon("Tango"))).toBe(true);
        expect(isBundled(getCityIcon("Tacna"))).toBe(true);
        expect(isBundled(getGuideInstrumentIcon("Ocarina"))).toBe(true);
    });
});

describe("íconos de instrumentos del perfil público", () => {
    it("ninguno de los instrumentos conocidos se ve en blanco", () => {
        const names = [
            "guitarra", "voz", "trompeta", "violín", "viola", "chelo", "violonchelo", "guitarrón", "arpa",
            "flauta", "piano", "batería", "percusión", "acordeón", "saxofón", "contrabajo", "clarinete",
            "bandoneón", "maracas", "tambor", "charango", "quena", "cajón", "teclado", "bajo", "vihuela",
        ];
        const missing = names.map(getInstrumentIcon).filter((icon) => !isBundled(icon));
        expect(missing).toEqual([]);
    });
});
