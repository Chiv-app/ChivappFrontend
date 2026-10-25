export const AUTH_UNAUTHORIZED_EVENT = "chivapp:unauthorized";

function getApiUrl(): string {
    if (typeof window !== "undefined") {
        return process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    }
    if (process.env.API_URL_INTERNAL) {
        return process.env.API_URL_INTERNAL.replace(/\/$/, "");
    }
    if (process.env.API_PROXY_TARGET) {
        const base = process.env.API_PROXY_TARGET.replace(/\/$/, "");
        return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    }
    if (process.env.BACKEND_URL) {
        const base = process.env.BACKEND_URL.replace(/\/$/, "");
        return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    }
    const publicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicUrl && (publicUrl.startsWith("http://") || publicUrl.startsWith("https://"))) {
        return publicUrl.replace(/\/$/, "");
    }
    if (process.env.NODE_ENV === "production") {
        return "https://api.chiv.app/api/v1";
    }
    return "http://localhost:8000/api/v1";
}


export class ApiError extends Error {
    constructor(
        public endpoint: string,
        public status: number,
        message?: string,
    ) {
        super(message ?? `API error: ${endpoint} (${status})`);
        this.name = "ApiError";
    }
}

const VALIDATION_FIELD_LABELS: Record<string, string> = {
    price: "Precio",
    price_agreed: "Precio acordado",
    location_address: "Dirección del evento",
    location_city: "Ciudad",
    location_reference: "Referencia",
    event_type: "Tipo de evento",
    event_date: "Fecha del evento",
    start_time: "Hora de inicio",
    end_time: "Hora de fin",
    fullname: "Nombre completo",
    phone: "Teléfono",
    document_number: "Documento de identidad",
    email: "Correo electrónico",
    client_email: "Correo del cliente",
    password: "Contraseña",
    otp: "Código OTP",
};

function translateValidationItem(item: {
    type?: string;
    msg?: string;
    message?: string;
    ctx?: Record<string, unknown>;
}): string | null {
    const rawMsg = item.msg ?? item.message;
    if (!rawMsg) return null;

    if (item.type === "greater_than_equal" && item.ctx?.ge !== undefined) {
        return `debe ser mayor o igual a ${item.ctx.ge}`;
    }
    if (item.type === "less_than_equal" && item.ctx?.le !== undefined) {
        return `debe ser menor o igual a ${item.ctx.le}`;
    }
    if (item.type === "greater_than" && item.ctx?.gt !== undefined) {
        return `debe ser mayor que ${item.ctx.gt}`;
    }
    if (item.type === "less_than" && item.ctx?.lt !== undefined) {
        return `debe ser menor que ${item.ctx.lt}`;
    }
    if (item.type === "string_too_long" && item.ctx?.max_length !== undefined) {
        return `debe tener como máximo ${item.ctx.max_length} caracteres`;
    }
    if (item.type === "string_too_short" && item.ctx?.min_length !== undefined) {
        return `debe tener al menos ${item.ctx.min_length} caracteres`;
    }
    if (item.type === "missing") {
        return "es obligatorio";
    }
    if (
        item.type === "value_error" ||
        rawMsg.startsWith("Value error, ")
    ) {
        const cleaned = rawMsg.replace(/^Value error,\s*/i, "");
        if (/email/i.test(cleaned)) {
            return "ingresa un correo electrónico válido";
        }
        return cleaned;
    }
    if (/valid email/i.test(rawMsg)) {
        return "ingresa un correo electrónico válido";
    }
    if (/Input should be greater than or equal to (\S+)/i.test(rawMsg)) {
        const match = rawMsg.match(/Input should be greater than or equal to (\S+)/i);
        return `debe ser mayor o igual a ${match?.[1] ?? ""}`.trim();
    }
    if (/Input should be less than or equal to (\S+)/i.test(rawMsg)) {
        const match = rawMsg.match(/Input should be less than or equal to (\S+)/i);
        return `debe ser menor o igual a ${match?.[1] ?? ""}`.trim();
    }
    if (/String should have at most (\d+) characters/i.test(rawMsg)) {
        const match = rawMsg.match(/String should have at most (\d+) characters/i);
        return `debe tener como máximo ${match?.[1] ?? ""} caracteres`.trim();
    }
    if (/String should have at least (\d+) characters/i.test(rawMsg)) {
        const match = rawMsg.match(/String should have at least (\d+) characters/i);
        return `debe tener al menos ${match?.[1] ?? ""} caracteres`.trim();
    }
    if (/Field required/i.test(rawMsg)) {
        return "es obligatorio";
    }
    return rawMsg;
}

async function parseErrorMessage(res: Response): Promise<string> {
    try {
        const body = await res.json();
        if (typeof body.detail === "string") return body.detail;
        if (typeof body.error === "string") return body.error;
        if (Array.isArray(body.detail)) {
            return body.detail
                .map((item: {
                    type?: string;
                    msg?: string;
                    message?: string;
                    loc?: Array<string | number>;
                    ctx?: Record<string, unknown>;
                }) => {
                    const msg = translateValidationItem(item);
                    if (!msg) return null;
                    const rawField = item.loc
                        ?.filter((part) => part !== "body" && part !== "query" && part !== "path")
                        .join(".");
                    const field = rawField
                        ? VALIDATION_FIELD_LABELS[rawField] ?? rawField
                        : "";
                    return field ? `${field}: ${msg}` : msg;
                })
                .filter(Boolean)
                .join(". ");
        }
    } catch {
        // ignore parse errors
    }
    return `Error ${res.status}`;
}

function shouldBroadcastUnauthorized(endpoint: string): boolean {
    return (
        !endpoint.startsWith("/auth/login") &&
        !endpoint.startsWith("/auth/register") &&
        !endpoint.startsWith("/auth/guest-register") &&
        !endpoint.startsWith("/auth/me") &&
        !endpoint.startsWith("/booking-links/") &&
        !endpoint.startsWith("/booking-invites/")
    );
}

export async function apiFetchWithHeaders<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<{ data: T; headers: Headers }> {
    let res: Response;
    try {
        res = await fetch(`${getApiUrl()}${endpoint}`, {
            ...options,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
        });
    } catch {
        throw new ApiError(
            endpoint,
            0,
            "No se pudo conectar con el servidor. Verifica que la aplicación esté en ejecución.",
        );
    }

    if (!res.ok) {
        const message = await parseErrorMessage(res);
        if (
            res.status === 401 &&
            typeof window !== "undefined" &&
            shouldBroadcastUnauthorized(endpoint)
        ) {
            window.dispatchEvent(
                new CustomEvent(AUTH_UNAUTHORIZED_EVENT, {
                    detail: { endpoint },
                }),
            );
        }
        throw new ApiError(endpoint, res.status, message);
    }

    if (res.status === 204) {
        return { data: undefined as T, headers: res.headers };
    }

    const data = (await res.json()) as T;
    return { data, headers: res.headers };
}

export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const { data } = await apiFetchWithHeaders<T>(endpoint, options);
    return data;
}
