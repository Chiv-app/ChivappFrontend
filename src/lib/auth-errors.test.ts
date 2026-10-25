import { describe, expect, it } from "vitest";
import { isEmailTakenError } from "./auth-errors";

describe("isEmailTakenError", () => {
    it("detects the backend's duplicate-email messages", () => {
        expect(isEmailTakenError("Ese correo ya está en uso")).toBe(true);
        expect(isEmailTakenError("El correo ya fue usado por otra cuenta")).toBe(true);
        expect(isEmailTakenError("Ese correo ya está registrado")).toBe(true);
        expect(isEmailTakenError("Este correo ya tiene una cuenta. Por favor inicia sesión.")).toBe(true);
    });

    it("is case-insensitive", () => {
        expect(isEmailTakenError("CORREO YA USADO")).toBe(true);
    });

    it("does not false-positive on unrelated 'ya existe' collisions", () => {
        expect(
            isEmailTakenError("Ya existe una cuenta con ese número de teléfono"),
        ).toBe(false);
        expect(isEmailTakenError("Ya existe un perfil con ese nombre de artista")).toBe(
            false,
        );
    });

    it("does not match generic errors", () => {
        expect(isEmailTakenError("Credenciales inválidas")).toBe(false);
        expect(isEmailTakenError("No se pudo iniciar sesión. Intenta de nuevo.")).toBe(
            false,
        );
    });
});
