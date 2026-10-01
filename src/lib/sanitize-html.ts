import DOMPurify, { type DOMPurify as DOMPurifyInstance } from "dompurify";

/**
 * Sanitización del HTML de contratos (TipTap) escrito por músicos/clientes.
 *
 * Se usa DOMPurify en el navegador. Los componentes que lo consumen son
 * client components y el contenido del contrato se obtiene en el cliente,
 * así que en el servidor (sin `window`) devolvemos "" (fail-closed) en vez
 * de arrastrar jsdom al bundle del servidor.
 */

const ALLOWED_TAGS = [
    "p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre",
    "h1", "h2", "h3", "h4",
    "ul", "ol", "li", "blockquote", "hr",
    "span", "div",
    "table", "thead", "tbody", "tr", "th", "td",
    "a", "img",
];

const ALLOWED_ATTR = [
    "class",
    "style",
    "href",
    "target",
    "rel",
    "src",
    "alt",
    "width",
    "height",
    "colspan",
    "rowspan",
    "data-contract-variable",
];

/** Propiedades CSS que genera el editor (alineación, color, tipografía, ancho de imagen). */
const ALLOWED_STYLE_PROPERTIES = new Set([
    "text-align",
    "color",
    "background-color",
    "font-size",
    "font-family",
    "font-weight",
    "font-style",
    "text-decoration",
    "width",
    "max-width",
    "height",
]);

const SAFE_STYLE_VALUE = /^[#a-z0-9\s.,%'"()-]+$/i;
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|var\s*\(|javascript:|@import/i;
const SAFE_CLASS_TOKEN = /^contract-[a-z0-9-]+$/;
const SAFE_LINK_HREF = /^(?:https?:|mailto:)/i;
const SAFE_DIMENSION = /^\d{1,4}(?:px|%)?$/;
const DEFAULT_UPLOAD_BUCKET = "https://storage.googleapis.com/";

function filterStyle(value: string): string {
    return value
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .map((declaration) => {
            const separator = declaration.indexOf(":");
            if (separator <= 0) return null;
            const property = declaration.slice(0, separator).trim().toLowerCase();
            const propertyValue = declaration.slice(separator + 1).trim();
            if (!ALLOWED_STYLE_PROPERTIES.has(property)) return null;
            if (!propertyValue || propertyValue.length > 120) return null;
            if (!SAFE_STYLE_VALUE.test(propertyValue) || UNSAFE_STYLE_VALUE.test(propertyValue)) {
                return null;
            }
            return `${property}: ${propertyValue}`;
        })
        .filter((declaration): declaration is string => Boolean(declaration))
        .join("; ");
}

function filterClass(value: string): string {
    return value
        .split(/\s+/)
        .filter((token) => SAFE_CLASS_TOKEN.test(token))
        .join(" ");
}

function getAllowedImagePrefixes(): string[] {
    const prefixes = [DEFAULT_UPLOAD_BUCKET];
    const bucket = process.env.NEXT_PUBLIC_GCS_BUCKET_URL?.trim();
    if (bucket && bucket.startsWith("https://")) {
        prefixes.push(bucket.endsWith("/") ? bucket : `${bucket}/`);
    }
    return prefixes;
}

/** Solo imágenes subidas a Chivapp: `/uploads/...` (mismo origen) o el bucket de uploads (https). */
export function isAllowedContractImageSrc(src: string | null | undefined): boolean {
    const value = (src ?? "").trim();
    if (!value) return false;
    if (/[\s\\]/.test(value) || value.includes("..")) return false;
    if (value.startsWith("/uploads/")) {
        return !value.startsWith("/uploads//");
    }
    return getAllowedImagePrefixes().some((prefix) => value.startsWith(prefix));
}

let purifier: DOMPurifyInstance | null = null;

function getPurifier(): DOMPurifyInstance | null {
    if (typeof window === "undefined") return null;
    if (purifier) return purifier;

    const instance = DOMPurify(window);

    instance.addHook("uponSanitizeAttribute", (_node, data) => {
        if (data.attrName === "style") {
            const filtered = filterStyle(data.attrValue);
            if (filtered) {
                data.attrValue = filtered;
            } else {
                data.keepAttr = false;
            }
        } else if (data.attrName === "class") {
            const filtered = filterClass(data.attrValue);
            if (filtered) {
                data.attrValue = filtered;
            } else {
                data.keepAttr = false;
            }
        } else if (data.attrName === "width" || data.attrName === "height") {
            if (!SAFE_DIMENSION.test(data.attrValue.trim())) data.keepAttr = false;
        }
    });

    instance.addHook("afterSanitizeAttributes", (node) => {
        const element = node as Element;
        const tag = element.tagName?.toLowerCase();

        if (tag === "a") {
            const href = element.getAttribute("href");
            if (href && SAFE_LINK_HREF.test(href.trim())) {
                element.setAttribute("target", "_blank");
                element.setAttribute("rel", "noopener noreferrer");
            } else {
                element.removeAttribute("href");
                element.removeAttribute("target");
                element.removeAttribute("rel");
            }
            return;
        }

        if (tag === "img") {
            // Se marca y se elimina después del recorrido de DOMPurify.
            if (!isAllowedContractImageSrc(element.getAttribute("src"))) {
                element.removeAttribute("src");
            }
            return;
        }

        element.removeAttribute("href");
        element.removeAttribute("src");
        element.removeAttribute("target");
        element.removeAttribute("rel");
        if (tag !== "span") element.removeAttribute("data-contract-variable");
        if (tag !== "td" && tag !== "th") {
            element.removeAttribute("colspan");
            element.removeAttribute("rowspan");
        }
    });

    purifier = instance;
    return purifier;
}

export function sanitizeContractHtml(html: string): string {
    if (!html) return "";
    const instance = getPurifier();
    if (!instance) return "";

    const fragment = instance.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
        ALLOW_ARIA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        // href/src: http(s), mailto o rutas relativas /uploads/; el filtro fino va en los hooks.
        ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/(?!\/))/i,
        // Atributos no-URL que no deben evaluarse contra ALLOWED_URI_REGEXP.
        ADD_URI_SAFE_ATTR: ["data-contract-variable", "width", "height", "colspan", "rowspan", "target", "rel"],
        KEEP_CONTENT: true,
        RETURN_DOM_FRAGMENT: true,
    });

    fragment.querySelectorAll("img:not([src])").forEach((img) => img.remove());

    const container = document.createElement("div");
    container.appendChild(fragment);
    return container.innerHTML;
}
