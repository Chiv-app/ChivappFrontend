import { describe, expect, it } from "vitest";
import { isAllowedContractImageSrc, sanitizeContractHtml } from "@/lib/sanitize-html";

describe("sanitizeContractHtml", () => {
    it("removes images with onerror handlers and external sources", () => {
        const out = sanitizeContractHtml('<p>Hola</p><img src=x onerror=alert(1)>');
        expect(out).toBe("<p>Hola</p>");
        expect(out).not.toContain("onerror");

        expect(sanitizeContractHtml('<img src="https://evil.com/a.png">')).toBe("");
        expect(sanitizeContractHtml('<img src="http://storage.googleapis.com/b/a.png">')).toBe("");
        expect(sanitizeContractHtml('<img src="data:image/png;base64,AAAA">')).toBe("");
        expect(sanitizeContractHtml('<img src="javascript:alert(1)">')).toBe("");
        expect(sanitizeContractHtml('<img src="//evil.com/a.png">')).toBe("");
    });

    it("keeps uploaded images with allowed attributes only", () => {
        const out = sanitizeContractHtml(
            '<p><img src="/uploads/logo.png" alt="Logo" width="220" onload="alert(1)" style="width: 220px; max-width: 100%; height: auto; position: fixed"></p>',
        );
        expect(out).toContain('src="/uploads/logo.png"');
        expect(out).toContain('alt="Logo"');
        expect(out).toContain('width="220"');
        expect(out).toContain("width: 220px");
        expect(out).not.toContain("onload");
        expect(out).not.toContain("position");

        const bucket = sanitizeContractHtml(
            '<img src="https://storage.googleapis.com/chivapp-uploads/logo.png" alt="">',
        );
        expect(bucket).toContain("https://storage.googleapis.com/chivapp-uploads/logo.png");
    });

    it("strips script tags and javascript: hrefs", () => {
        const out = sanitizeContractHtml(
            '<p>Texto<script>alert(1)</script></p><a href="javascript:alert(1)">clic</a>',
        );
        expect(out).not.toContain("<script");
        expect(out).not.toContain("alert(1)");
        expect(out).not.toContain("javascript:");
        expect(out).toContain("clic");
    });

    it("forces rel/target on safe links", () => {
        const out = sanitizeContractHtml('<a href="https://chiv.app" target="_self">Chivapp</a>');
        expect(out).toContain('href="https://chiv.app"');
        expect(out).toContain('target="_blank"');
        expect(out).toContain('rel="noopener noreferrer"');
        expect(sanitizeContractHtml('<a href="mailto:hola@chiv.app">m</a>')).toContain(
            'href="mailto:hola@chiv.app"',
        );
    });

    it("drops __proto__-style and event attributes", () => {
        const out = sanitizeContractHtml(
            '<p __proto__="x" constructor="y" onclick="alert(1)" data-foo="z">Hola</p>',
        );
        expect(out).toBe("<p>Hola</p>");
    });

    it("keeps contract variable spans", () => {
        const html =
            '<p>Cliente: <span data-contract-variable="true" class="contract-variable">{{nombre_cliente}}</span></p>';
        expect(sanitizeContractHtml(html)).toBe(html);
    });

    it("preserves basic formatting and text alignment", () => {
        const out = sanitizeContractHtml(
            '<h2 style="text-align: center">Contrato</h2><p><strong>A</strong> <em>B</em> <u>C</u> <s>D</s></p><ul><li>uno</li></ul><blockquote>cita</blockquote><hr><table><tbody><tr><td>x</td></tr></tbody></table>',
        );
        expect(out).toContain('<h2 style="text-align: center">Contrato</h2>');
        expect(out).toContain("<strong>A</strong> <em>B</em> <u>C</u> <s>D</s>");
        expect(out).toContain("<ul><li>uno</li></ul>");
        expect(out).toContain("<blockquote>cita</blockquote>");
        expect(out).toContain("<hr>");
        expect(out).toContain("<td>x</td>");
    });

    it("drops non-contract classes and unsafe styles", () => {
        const out = sanitizeContractHtml(
            '<div class="fixed inset-0 z-50 contract-note" style="background-color: red; background-image: url(https://evil.com/x)">x</div>',
        );
        expect(out).toBe('<div class="contract-note" style="background-color: red">x</div>');
    });

    it("rejects iframes", () => {
        expect(sanitizeContractHtml('<iframe src="https://evil.com"></iframe><p>ok</p>')).toBe(
            "<p>ok</p>",
        );
    });
});

describe("isAllowedContractImageSrc", () => {
    it("accepts only upload paths and the bucket", () => {
        expect(isAllowedContractImageSrc("/uploads/a.png")).toBe(true);
        expect(isAllowedContractImageSrc("/uploads/../api/v1/x")).toBe(false);
        expect(isAllowedContractImageSrc("/api/v1/users/me")).toBe(false);
        expect(isAllowedContractImageSrc("https://storage.googleapis.com/b/a.png")).toBe(true);
        expect(isAllowedContractImageSrc("https://storage.googleapis.com.evil.com/a.png")).toBe(false);
    });
});
