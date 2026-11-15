import { beforeEach, describe, expect, it } from "vitest";
import { ACTIVE_PROFILE_HEADER, ACTIVE_PROFILE_KEY, activeProfileHeaders, getActiveProfileId, isProfileId, setActiveProfileId } from "./active-profile";

const ID = "11111111-1111-4111-8111-111111111111";

describe("perfil activo", () => {
    beforeEach(() => window.localStorage.clear());

    it("solo acepta ids con forma de UUID", () => {
        expect(isProfileId(ID)).toBe(true);
        expect(isProfileId("no-es-un-id")).toBe(false);
        expect(isProfileId("1; DROP TABLE")).toBe(false);
        expect(isProfileId(undefined)).toBe(false);
    });

    it("guarda, lee y borra la elección", () => {
        expect(getActiveProfileId()).toBeNull();
        setActiveProfileId(ID);
        expect(getActiveProfileId()).toBe(ID);
        setActiveProfileId(null);
        expect(getActiveProfileId()).toBeNull();
    });

    it("ignora lo guardado que no sea un id y no guarda valores inválidos", () => {
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, "basura");
        expect(getActiveProfileId()).toBeNull();
        setActiveProfileId("basura");
        expect(window.localStorage.getItem(ACTIVE_PROFILE_KEY)).toBeNull();
    });

    it("manda la cabecera solo cuando hay un perfil elegido", () => {
        expect(activeProfileHeaders()).toEqual({});
        setActiveProfileId(ID);
        expect(activeProfileHeaders()).toEqual({ [ACTIVE_PROFILE_HEADER]: ID });
    });
});
