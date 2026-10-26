import { describe, expect, it } from "vitest";
import { translateValidationItem } from "./api";

describe("translateValidationItem (FE6-09 / FE5-09)", () => {
    it("translates string_too_short with field label", () => {
        expect(
            translateValidationItem({
                loc: ["body", "otp"],
                type: "string_too_short",
                ctx: { min_length: 6 },
                msg: "String should have at least 6 characters",
            }),
        ).toBe("Código OTP: debe tener al menos 6 caracteres");
    });

    it("translates greater_than_equal with field label", () => {
        expect(
            translateValidationItem({
                loc: ["body", "price_agreed"],
                type: "greater_than_equal",
                ctx: { ge: "10.00" },
                msg: "Input should be greater than or equal to 10.00",
            }),
        ).toBe("Precio acordado: debe ser mayor o igual a 10.00");
    });

    it("translates decimal_max_places in Spanish (FE6-09)", () => {
        expect(
            translateValidationItem({
                loc: ["body", "price_agreed"],
                type: "decimal_max_places",
                ctx: { decimal_places: 2 },
                msg: "Decimal input should have no more than 2 decimal places",
            }),
        ).toBe("Precio acordado: debe tener como máximo 2 decimales");
    });

    it("translates decimal_parsing, float_parsing, and int_parsing in Spanish", () => {
        expect(
            translateValidationItem({
                loc: ["body", "price"],
                type: "decimal_parsing",
                msg: "Input should be a valid decimal",
            }),
        ).toBe("Precio: debe ser un número válido");

        expect(
            translateValidationItem({
                loc: ["body", "amount"],
                type: "float_parsing",
                msg: "Input should be a valid number",
            }),
        ).toBe("Monto: debe ser un número válido");

        expect(
            translateValidationItem({
                loc: ["body", "duration_hours"],
                type: "int_parsing",
                msg: "Input should be a valid integer",
            }),
        ).toBe("Duración: debe ser un número entero");
    });

    it("translates string_pattern_mismatch in Spanish", () => {
        expect(
            translateValidationItem({
                loc: ["body", "phone"],
                type: "string_pattern_mismatch",
                msg: "String should match pattern",
            }),
        ).toBe("Teléfono: tiene un formato no válido");
    });
});
