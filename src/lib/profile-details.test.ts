import { describe, expect, it } from "vitest";
import {
    eventLabels,
    hasPublicDetails,
    parseDetails,
    profileBadge,
    showRows,
    toggleInList,
    withoutGroupOnly,
} from "./profile-details";

describe("parseDetails", () => {
    it("deja pasar solo lo que el backend acepta", () => {
        expect(
            parseDetails({
                event_types: ["bodas", "fiesta-secreta", "bodas"],
                audience: "150",
                duration: "10h",
                includes: ["sound"],
                other_cities: ["  Arequipa ", "x", "Arequipa"],
                travel_fee: "maybe",
                clave_vieja: "x",
            }),
        ).toEqual({
            event_types: ["bodas"],
            audience: "150",
            includes: ["sound"],
            other_cities: ["Arequipa"],
            travel_fee: "maybe",
        });
    });

    it("devuelve vacío ante cualquier cosa que no sea un objeto", () => {
        expect(parseDetails(null)).toEqual({});
        expect(parseDetails("hola")).toEqual({});
        expect(parseDetails([1, 2])).toEqual({});
    });

    it("limita las ciudades adicionales a 10", () => {
        const cities = Array.from({ length: 14 }, (_, i) => `Ciudad ${i}`);
        expect(parseDetails({ other_cities: cities }).other_cities).toHaveLength(10);
    });
});

describe("profileBadge", () => {
    it("nombra dúo, trío y grupos por tamaño", () => {
        expect(profileBadge("solo", null)).toBe("Solista");
        expect(profileBadge(undefined, null)).toBe("Solista");
        expect(profileBadge("group", "2")).toBe("Dúo");
        expect(profileBadge("group", "3")).toBe("Trío");
        expect(profileBadge("group", "4-5")).toBe("Grupo de 4 a 5");
        expect(profileBadge("group", null)).toBe("Grupo");
    });
});

describe("toggleInList y withoutGroupOnly", () => {
    it("agrega, quita y devuelve undefined cuando queda vacía", () => {
        expect(toggleInList(undefined, "a")).toEqual(["a"]);
        expect(toggleInList(["a", "b"], "a")).toEqual(["b"]);
        expect(toggleInList(["a"], "a")).toBeUndefined();
    });

    it("quita lo exclusivo de grupo", () => {
        expect(withoutGroupOnly({ format: "mixed", reduced: "yes", duration: "2h" })).toEqual({ duration: "2h" });
    });
});

describe("lo que se muestra en el perfil público", () => {
    it("no muestra nada si no hay datos", () => {
        expect(hasPublicDetails({}, "solo")).toBe(false);
        expect(showRows({}, "solo")).toEqual([]);
        expect(eventLabels({})).toEqual([]);
    });

    it("muestra formato y formación solo en grupos", () => {
        const details = { format: "mixed", reduced: "yes", duration: "3h" };
        expect(showRows(details, "solo").map((row) => row.key)).toEqual(["duration"]);
        expect(showRows(details, "group").map((row) => row.key)).toEqual(["duration", "format", "reduced"]);
    });

    it("ordena experiencia, duración, qué incluye, reserva y ciudades", () => {
        const rows = showRows(
            {
                experience: "5-10",
                duration: "2h",
                includes: ["sound", "lights"],
                notice: "1w",
                other_cities: ["Cusco"],
                travel_fee: "yes",
            },
            "solo",
        );
        expect(rows.map((row) => row.key)).toEqual(["experience", "duration", "includes", "notice", "cities", "travel"]);
        expect(rows.find((row) => row.key === "includes")?.value).toBe("Sonido, Iluminación");
        expect(rows.find((row) => row.key === "notice")?.value).toBe("1 semana de antelación");
    });

    it("los eventos salen con su nombre legible", () => {
        expect(eventLabels({ event_types: ["bodas", "cumpleanos"] })).toEqual(["Bodas", "Cumpleaños"]);
        expect(hasPublicDetails({ event_types: ["bodas"] }, "solo")).toBe(true);
    });
});
