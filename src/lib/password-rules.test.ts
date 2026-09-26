import { describe, expect, it } from "vitest";
import { evaluatePasswordRules, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "./password-rules";

describe("evaluatePasswordRules", () => {
    it("evaluates empty password as invalid", () => {
        const result = evaluatePasswordRules("");
        expect(result.isValid).toBe(false);
        expect(result.minLength).toBe(false);
        expect(result.score).toBe(0);
        expect(result.strengthLabel).toBe("Muy débil");
    });

    it("detects short passwords", () => {
        const result = evaluatePasswordRules("Ab1!");
        expect(result.minLength).toBe(false);
        expect(result.hasUppercase).toBe(true);
        expect(result.hasLowercase).toBe(true);
        expect(result.hasNumber).toBe(true);
        expect(result.hasSpecial).toBe(true);
        expect(result.isValid).toBe(false);
    });

    it("detects missing uppercase", () => {
        const result = evaluatePasswordRules("abcdef12!");
        expect(result.hasUppercase).toBe(false);
        expect(result.isValid).toBe(false);
    });

    it("detects missing special characters", () => {
        const result = evaluatePasswordRules("Abcdef123");
        expect(result.hasSpecial).toBe(false);
        expect(result.isValid).toBe(false);
    });

    it("detects password exceeding maximum length", () => {
        const longPassword = "A1!" + "a".repeat(MAX_PASSWORD_LENGTH + 10);
        const result = evaluatePasswordRules(longPassword);
        expect(result.maxLength).toBe(false);
        expect(result.isValid).toBe(false);
    });

    it("approves strong password meeting all criteria", () => {
        const result = evaluatePasswordRules("Mariachi2026!", "Mariachi2026!");
        expect(result.isValid).toBe(true);
        expect(result.score).toBe(5);
        expect(result.strengthLabel).toBe("Muy fuerte");
        expect(result.matchesConfirm).toBe(true);
    });

    it("fails if confirmation does not match", () => {
        const result = evaluatePasswordRules("Mariachi2026!", "DifferentPass1!");
        expect(result.matchesConfirm).toBe(false);
        expect(result.isValid).toBe(false);
    });
});
