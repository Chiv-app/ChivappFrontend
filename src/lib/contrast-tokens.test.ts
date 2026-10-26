import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../tailwind.config";

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "").trim();
    const normalized =
        clean.length === 3
            ? clean
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : clean;
    const num = Number.parseInt(normalized, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
    const l1 = relativeLuminance(hexA);
    const l2 = relativeLuminance(hexB);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

describe("WCAG 2.1 AA Contrast & Accessibility Guards (UX5-13, UX4-12, UX6-01, UX6-04)", () => {
    const globalsCssPath = path.resolve(process.cwd(), "src/app/globals.css");
    const globalsCss = fs.readFileSync(globalsCssPath, "utf8");

    it("enforces >= 4.5:1 contrast for semantic text tokens against surfaces in light and dark themes", () => {
        const lightSurfaces = ["#F5F7F8", "#FFFFFF", "#F5F7F8", "#EBEDEF", "#E2E5E8"];
        const lightTextTokens: Record<string, string> = {
            foreground: "#101826",
            "foreground-500": "#52525B",
            "default-600": "#3F3F46",
            "default-700": "#27272A",
            "primary-text": "#1D6478",
            "secondary-text": "#2E4F55",
            "success-text": "#166534",
            "warning-text": "#92400E",
            "danger-text": "#991B1B",
        };

        for (const [token, hex] of Object.entries(lightTextTokens)) {
            for (const surface of ["#F5F7F8", "#FFFFFF", "#EBEDEF"]) {
                const ratio = contrastRatio(hex, surface);
                expect(
                    ratio,
                    `Light token ${token} (${hex}) vs ${surface} = ${ratio.toFixed(2)}:1`,
                ).toBeGreaterThanOrEqual(4.5);
            }
        }
        // Primary/success/warning/danger text tokens must also pass >= 4.5:1 on content3 (#EBEDEF)
        for (const token of ["primary-text", "secondary-text", "success-text", "warning-text", "danger-text"]) {
            for (const surface of lightSurfaces.slice(0, 4)) {
                expect(contrastRatio(lightTextTokens[token], surface)).toBeGreaterThanOrEqual(4.5);
            }
        }

        const darkSurfaces = ["#0B0F14", "#141A22", "#1A222C", "#222B36", "#2B3542"];
        const darkTextTokens: Record<string, string> = {
            foreground: "#F5F7F8",
            "foreground-500": "#B4B4BE",
            "default-600": "#C4C4CC",
            "default-700": "#D4D4D8",
            "primary-text": "#6FD3E6",
            "secondary-text": "#9CC4C7",
            "success-text": "#4ADE80",
            "warning-text": "#FBBF24",
            "danger-text": "#FCA5A5",
        };

        for (const [token, hex] of Object.entries(darkTextTokens)) {
            for (const surface of darkSurfaces.slice(0, 4)) {
                const ratio = contrastRatio(hex, surface);
                expect(
                    ratio,
                    `Dark token ${token} (${hex}) vs ${surface} = ${ratio.toFixed(2)}:1`,
                ).toBeGreaterThanOrEqual(4.5);
            }
        }
    });

    it("enforces >= 3.0:1 non-text contrast (WCAG 1.4.11) for focus and field border tokens", () => {
        // Light mode: focus (#1D6478) and default-400 (#63636B) vs background (#F5F7F8) and content1 (#FFFFFF)
        expect(contrastRatio("#1D6478", "#F5F7F8")).toBeGreaterThanOrEqual(3.0);
        expect(contrastRatio("#1D6478", "#FFFFFF")).toBeGreaterThanOrEqual(3.0);
        expect(contrastRatio("#63636B", "#F5F7F8")).toBeGreaterThanOrEqual(3.0);
        expect(contrastRatio("#63636B", "#FFFFFF")).toBeGreaterThanOrEqual(3.0);

        // Dark mode: focus (#46C0D9) and default-400 (#9A9AA5) vs background (#0B0F14) and content1 (#141A22)
        expect(contrastRatio("#46C0D9", "#0B0F14")).toBeGreaterThanOrEqual(3.0);
        expect(contrastRatio("#46C0D9", "#141A22")).toBeGreaterThanOrEqual(3.0);
        expect(contrastRatio("#9A9AA5", "#0B0F14")).toBeGreaterThanOrEqual(3.0);
        expect(contrastRatio("#9A9AA5", "#141A22")).toBeGreaterThanOrEqual(3.0);
    });

    it("defines the complete foreground scale in tailwind.config.ts (UX4-12)", () => {
        const plugins = (tailwindConfig as { plugins?: unknown[] }).plugins;
        expect(Array.isArray(plugins)).toBe(true);
        const configSource = fs.readFileSync(
            path.resolve(process.cwd(), "tailwind.config.ts"),
            "utf8",
        );
        expect(configSource).toContain("500: \"#52525B\"");
        expect(configSource).toContain("500: \"#B4B4BE\"");
    });

    it("preserves HeroUI flat chip overrides and keyboard focus guard in globals.css (UX4-03, UX6-03, UX6-04)", () => {
        expect(globalsCss).toContain("html:not(.dark) :is(.text-primary:not(.bg-primary), .text-primary-600)");
        expect(globalsCss).toContain("html:not(.dark) :is(.text-danger:not(.bg-danger), .text-danger-500, .text-danger-600)");
        expect(globalsCss).toContain(".contract-doc-page");
        expect(globalsCss).toContain("body:has(input:focus");
    });

    it("keeps hero subtitle and auth modal title static without unpausable setInterval (UX6-01)", () => {
        const heroSource = fs.readFileSync(
            path.resolve(process.cwd(), "src/components/home/hero-search-section.tsx"),
            "utf8",
        );
        const authModalSource = fs.readFileSync(
            path.resolve(process.cwd(), "src/components/auth/auth-modal.tsx"),
            "utf8",
        );
        expect(heroSource).not.toContain("setInterval");
        expect(authModalSource).not.toContain("setInterval");
    });
});
