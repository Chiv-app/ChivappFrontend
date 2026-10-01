export type ContractTemplate = {
    id: string;
    name: string;
    description: string;
    title: string;
    /** HTML enriquecido (el mismo formato que produce el editor tipo Word). */
    bodyHtml: string;
};

export type ContractPreviewContext = {
    artistName: string;
    artistEmail: string;
    artistPhone: string;
    pricePerHour: string;
    pricePerEvent: string;
    contractDate: string;
};

export type ContractPlaceholder = {
    key: string;
    label: string;
    sample: string;
};

export const CONTRACT_PLACEHOLDERS: ContractPlaceholder[] = [
    { key: "{{nombre_artista}}", label: "Nombre artístico", sample: "Los Chivitos del Sur" },
    { key: "{{correo_artista}}", label: "Correo del artista", sample: "contacto@artista.com" },
    { key: "{{telefono_artista}}", label: "Teléfono del artista", sample: "+51 999 888 777" },
    { key: "{{tarifa_hora}}", label: "Tarifa por hora", sample: "S/ 350" },
    { key: "{{tarifa_evento}}", label: "Tarifa por evento", sample: "S/ 1,200" },
    { key: "{{nombre_cliente}}", label: "Nombre del cliente", sample: "María González" },
    { key: "{{documento_cliente}}", label: "Documento del cliente", sample: "DNI 12345678" },
    { key: "{{tipo_evento}}", label: "Tipo de evento", sample: "Boda" },
    { key: "{{fecha_evento}}", label: "Fecha del evento", sample: "15/08/2026" },
    { key: "{{hora_evento}}", label: "Hora del evento", sample: "19:00" },
    { key: "{{lugar_evento}}", label: "Lugar del evento", sample: "Salón Los Jardines, Lima" },
    { key: "{{duracion_servicio}}", label: "Duración", sample: "2 horas" },
    { key: "{{monto_total}}", label: "Monto total", sample: "S/ 1,200" },
    { key: "{{fecha_contrato}}", label: "Fecha del contrato", sample: "23/07/2026" },
];

/**
 * Compatibilidad: plantillas guardadas antes del pago único (100 %) pueden usar
 * el marcador del antiguo anticipo. Ya no se ofrece, pero se sigue
 * reemplazando (con el monto total) para que nunca se muestre crudo.
 */
export const LEGACY_ADVANCE_PLACEHOLDER = "{{anticipo}}";

/** Coincide con un span de resaltado de variable generado por el editor tipo Word. */
const VARIABLE_SPAN_PATTERN =
    /<span[^>]*data-contract-variable[^>]*>\s*(\{\{[a-z_]+\}\})\s*<\/span>/gi;
const PLACEHOLDER_TOKEN_PATTERN = /\{\{[a-z_]+\}\}/g;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const LEGACY_SECTION_HEADER_PATTERN = /^##\s+(.+)$/;

function escapeHtml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Envuelve `{{clave}}` en un span resaltado, igual que al insertarlas desde el editor. */
function wrapVariablesForDisplay(html: string): string {
    return html.replace(
        PLACEHOLDER_TOKEN_PATTERN,
        (token) => `<span data-contract-variable="true" class="contract-variable">${token}</span>`,
    );
}

/** Quita el span de resaltado dejando el token `{{clave}}` como texto plano. */
export function unwrapVariableSpans(html: string): string {
    return html.replace(VARIABLE_SPAN_PATTERN, "$1");
}

const FIRST_HEADING_PATTERN = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i;

function decodeHtmlEntities(value: string): string {
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
}

/**
 * El título ahora es parte del documento (primer encabezado). Esta función lo
 * extrae para seguir guardando un campo de título plano en el backend.
 */
export function extractTitleFromHtml(html: string, fallback: string): string {
    const match = html.match(FIRST_HEADING_PATTERN);
    if (!match) return fallback;
    const text = decodeHtmlEntities(match[1].replace(HTML_TAG_PATTERN, " "))
        .replace(/\s+/g, " ")
        .trim();
    return text || fallback;
}

/** Garantiza que el documento empiece con un encabezado de título editable. */
export function ensureTitleHeading(html: string, title: string): string {
    const trimmed = html.trim();
    if (FIRST_HEADING_PATTERN.test(trimmed)) {
        return trimmed;
    }
    return `<h1>${escapeHtml(title)}</h1>${trimmed}`;
}

/** Longitud del texto real (sin etiquetas HTML), útil para validar contenido mínimo. */
export function contractHtmlTextLength(html: string | null | undefined): number {
    if (!html) return 0;
    const text = html.replace(HTML_TAG_PATTERN, " ").replace(/&nbsp;/gi, " ");
    return text.replace(/\s+/g, " ").trim().length;
}

/**
 * Convierte contenido legado (texto plano con encabezados `## Título`) al
 * formato HTML enriquecido que usa el editor tipo Word. Si el contenido ya
 * parece HTML, se devuelve tal cual.
 */
export function normalizeContractBodyToHtml(body: string | null | undefined): string {
    const trimmed = (body ?? "").trim();
    if (!trimmed) return "";
    if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
        return trimmed;
    }

    const parts: string[] = [];
    for (const rawLine of trimmed.split("\n")) {
        const line = rawLine.trim();
        if (!line) continue;
        const match = line.match(LEGACY_SECTION_HEADER_PATTERN);
        if (match) {
            parts.push(`<h3>${escapeHtml(match[1].trim())}</h3>`);
        } else {
            parts.push(`<p>${escapeHtml(line)}</p>`);
        }
    }
    return wrapVariablesForDisplay(parts.join(""));
}

export function buildPreviewContext(input: {
    stageName: string;
    artistEmail: string;
    artistPhone: string | null;
    pricePerHour: string;
    pricePerEvent: string;
}): ContractPreviewContext {
    const formatPrice = (value: string, fallback: string) => {
        const numeric = Number(value);
        if (!value || Number.isNaN(numeric)) return fallback;
        return `S/ ${numeric.toLocaleString("es-PE")}`;
    };

    return {
        artistName: input.stageName || "Nombre artístico",
        artistEmail: input.artistEmail || "contacto@artista.com",
        artistPhone: input.artistPhone || "+51 999 888 777",
        pricePerHour: formatPrice(input.pricePerHour, "S/ 350"),
        pricePerEvent: formatPrice(input.pricePerEvent, "S/ 1,200"),
        contractDate: new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" }),
    };
}

export function replaceContractPlaceholders(
    html: string,
    context: ContractPreviewContext,
    mode: "preview" | "pdf",
): string {
    const sampleMap = Object.fromEntries(
        CONTRACT_PLACEHOLDERS.map((item) => [item.key, item.sample]),
    ) as Record<string, string>;
    // Plantillas antiguas: el "anticipo" ahora es el pago único del total.
    sampleMap[LEGACY_ADVANCE_PLACEHOLDER] = sampleMap["{{monto_total}}"];

    const artistMap: Record<string, string> = {
        "{{nombre_artista}}": context.artistName,
        "{{correo_artista}}": context.artistEmail,
        "{{telefono_artista}}": context.artistPhone,
        "{{tarifa_hora}}": context.pricePerHour,
        "{{tarifa_evento}}": context.pricePerEvent,
        "{{fecha_contrato}}": context.contractDate,
    };

    const clientKeys = new Set([
        "{{nombre_cliente}}",
        "{{documento_cliente}}",
        "{{tipo_evento}}",
        "{{fecha_evento}}",
        "{{hora_evento}}",
        "{{lugar_evento}}",
        "{{duracion_servicio}}",
        "{{monto_total}}",
        LEGACY_ADVANCE_PLACEHOLDER,
    ]);

    return unwrapVariableSpans(html).replace(PLACEHOLDER_TOKEN_PATTERN, (token) => {
        if (artistMap[token]) return artistMap[token];
        if (mode === "preview") return sampleMap[token] ?? token;
        if (clientKeys.has(token)) return "________________________";
        return sampleMap[token] ?? token;
    });
}

function sectionsToHtml(sections: Array<{ title: string; content: string }>): string {
    return sections
        .map((section) => {
            const paragraphs = section.content
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => `<p>${line}</p>`)
                .join("");
            return `<h3>${section.title}</h3>${paragraphs}`;
        })
        .join("");
}

function buildTemplate(input: {
    id: string;
    name: string;
    description: string;
    title: string;
    sections: Array<{ title: string; content: string }>;
}): ContractTemplate {
    const titleHtml = `<h1>${escapeHtml(input.title)}</h1>`;
    return {
        id: input.id,
        name: input.name,
        description: input.description,
        title: input.title,
        bodyHtml: titleHtml + wrapVariablesForDisplay(sectionsToHtml(input.sections)),
    };
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
    buildTemplate({
        id: "standard",
        name: "Servicios musicales estándar",
        description: "Contrato general y completo para presentaciones en eventos privados.",
        title: "Contrato de prestación de servicios musicales",
        sections: [
            {
                title: "Partes",
                content:
                    "Entre {{nombre_artista}}, con correo de contacto {{correo_artista}} y teléfono {{telefono_artista}}, en adelante EL ARTISTA, y {{nombre_cliente}}, identificado(a) con {{documento_cliente}}, en adelante EL CLIENTE, se celebra el presente contrato de prestación de servicios musicales con fecha {{fecha_contrato}}.",
            },
            {
                title: "Objeto del contrato",
                content:
                    "EL ARTISTA se compromete a prestar un servicio musical en vivo de tipo {{tipo_evento}} el día {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, con una duración aproximada de {{duracion_servicio}}.\nEl repertorio, el formato musical (número de integrantes) y los momentos especiales del evento serán acordados previamente entre las partes por escrito.",
            },
            {
                title: "Honorarios y forma de pago",
                content:
                    "El monto total acordado por el servicio es {{monto_total}}. EL CLIENTE pagará el 100 % de dicho monto en un único pago a través de Chivapp (Mercado Pago) para confirmar la reserva; no existen pagos posteriores.\nTarifas de referencia de EL ARTISTA: {{tarifa_evento}} por evento completo o {{tarifa_hora}} por hora adicional. El tiempo extra al pactado se cobrará según esta tarifa y deberá acordarse el mismo día del evento.",
            },
            {
                title: "Equipo técnico y logística",
                content:
                    "EL ARTISTA llevará su propio instrumental y vestuario. El equipo de sonido, iluminación y/o tarima, de ser necesarios, serán coordinados previamente indicando qué parte los proporciona.\nEL CLIENTE garantizará un espacio adecuado para la presentación, así como acceso a un punto de energía eléctrica estable si el show lo requiere.",
            },
            {
                title: "Obligaciones del artista",
                content:
                    "EL ARTISTA se compromete a llegar con un mínimo de 45 minutos de anticipación para el montaje y prueba de sonido, presentar una imagen y desempeño profesional, y cumplir con el repertorio y tiempo acordados, salvo causas de fuerza mayor.",
            },
            {
                title: "Obligaciones del cliente",
                content:
                    "EL CLIENTE se compromete a confirmar la dirección exacta y datos de contacto del lugar del evento con al menos 48 horas de anticipación, informar oportunamente cualquier cambio de horario o lugar, y realizar los pagos en las fechas acordadas.",
            },
            {
                title: "Cancelaciones y reprogramación",
                content:
                    "Las cancelaciones y reembolsos se rigen por la política de Chivapp: si EL CLIENTE cancela con más de 15 días de anticipación se le reembolsa el 100 % de lo pagado (sin el costo de la pasarela de pagos); entre 7 y 15 días, el 50 %; y con menos de 7 días no hay reembolso. Los reembolsos son revisados y aprobados por Chivapp.\nSi EL ARTISTA no pudiera asistir por causas propias, EL CLIENTE recibirá el reembolso del 100 % de lo pagado o, de común acuerdo, se podrá proponer una fecha alternativa o un reemplazo de igual o mejor calidad artística. Toda reprogramación deberá constar por escrito.",
            },
            {
                title: "Fuerza mayor y derechos de imagen",
                content:
                    "Ninguna de las partes será responsable por el incumplimiento de sus obligaciones cuando este se deba a caso fortuito o fuerza mayor debidamente acreditado.\nEL CLIENTE podrá tomar fotografías y videos del evento para uso personal. El uso de dicho material con fines comerciales o publicitarios requerirá la autorización previa y expresa de EL ARTISTA.",
            },
            {
                title: "Legislación aplicable y contacto",
                content:
                    "El presente contrato se rige por las leyes de la República del Perú. Cualquier controversia será sometida a los jueces y tribunales del distrito judicial correspondiente al lugar del evento.\nPara coordinaciones, EL CLIENTE podrá comunicarse con EL ARTISTA mediante {{correo_artista}} o {{telefono_artista}}.",
            },
        ],
    }),
    buildTemplate({
        id: "wedding",
        name: "Boda o celebración familiar",
        description: "Ideal para matrimonios, quinceañeros y aniversarios.",
        title: "Contrato de servicios musicales para evento social",
        sections: [
            {
                title: "Partes",
                content:
                    "Celebran el presente contrato, de una parte, {{nombre_artista}} (en adelante EL ARTISTA), y de otra parte, {{nombre_cliente}}, identificado(a) con {{documento_cliente}} (en adelante EL CLIENTE), con fecha {{fecha_contrato}}, para la prestación de un servicio musical con motivo de {{tipo_evento}}.",
            },
            {
                title: "Detalle del evento",
                content:
                    "El servicio se brindará el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, con una duración aproximada de {{duracion_servicio}}.\nEL CLIENTE indicará con anticipación el orden del evento (por ejemplo: ceremonia, entrada, brindis, primer baile u otros momentos especiales) para que EL ARTISTA pueda planificar su presentación.",
            },
            {
                title: "Repertorio y momentos especiales",
                content:
                    "Se interpretará el repertorio previamente coordinado entre las partes. Las canciones especiales (entrada, ceremonia, baile principal, sorpresas) deberán confirmarse con un mínimo de 7 días de anticipación. Cambios de última hora se atenderán en la medida en que sean razonablemente viables.",
            },
            {
                title: "Honorarios e inversión",
                content:
                    "El monto total del servicio es {{monto_total}}. Para confirmar la reserva, EL CLIENTE pagará el 100 % en un único pago a través de Chivapp (Mercado Pago).\nTarifa referencial de EL ARTISTA: {{tarifa_evento}} por presentación completa. Horas adicionales se cotizan a {{tarifa_hora}} cada una.",
            },
            {
                title: "Equipo técnico y logística",
                content:
                    "EL CLIENTE garantizará a EL ARTISTA un espacio digno para prepararse (camerino o zona reservada), acceso a electricidad y, de ser posible, alimentación durante el evento. Cualquier requerimiento técnico adicional (sonido, luces, tarima) deberá coordinarse con al menos 5 días de anticipación.",
            },
            {
                title: "Obligaciones de las partes",
                content:
                    "EL ARTISTA se presentará puntualmente, con al menos 45 minutos de anticipación para pruebas de sonido, y ofrecerá una presentación acorde al tipo de evento contratado.\nEL CLIENTE proporcionará información precisa sobre el lugar, horarios y contactos de coordinación (wedding planner o similar, de existir).",
            },
            {
                title: "Cancelaciones y reprogramación",
                content:
                    "Las cancelaciones y reembolsos se rigen por la política de Chivapp: si EL CLIENTE cancela con más de 15 días de anticipación se le reembolsa el 100 % de lo pagado (sin el costo de la pasarela de pagos); entre 7 y 15 días, el 50 %; y con menos de 7 días no hay reembolso. Los reembolsos son revisados y aprobados por Chivapp. Si EL ARTISTA cancela por causas propias, EL CLIENTE recibirá el reembolso del 100 % de lo pagado o se coordinará una alternativa de mutuo acuerdo.",
            },
            {
                title: "Disposiciones finales",
                content:
                    "Cualquier modificación al presente contrato deberá constar por escrito y ser aceptada por ambas partes. Este documento se rige por la legislación peruana vigente.",
            },
        ],
    }),
    buildTemplate({
        id: "corporate",
        name: "Evento corporativo",
        description: "Presentaciones empresariales, ferias y activaciones de marca.",
        title: "Contrato de servicios musicales corporativos",
        sections: [
            {
                title: "Partes contratantes",
                content:
                    "{{nombre_artista}} (en adelante EL ARTISTA) y {{nombre_cliente}}, en representación de la entidad contratante, identificado(a) con {{documento_cliente}} (en adelante EL CLIENTE), celebran el presente contrato de servicios musicales corporativos con fecha {{fecha_contrato}}.",
            },
            {
                title: "Alcance del servicio",
                content:
                    "EL ARTISTA prestará un servicio musical en vivo el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, con motivo de {{tipo_evento}}, por una duración aproximada de {{duracion_servicio}}.\nEl formato de la presentación (número de músicos, repertorio, dinámica con el público) se acordará previamente conforme a los objetivos del evento corporativo.",
            },
            {
                title: "Honorarios y facturación",
                content:
                    "Los honorarios acordados ascienden a {{monto_total}}. EL CLIENTE pagará el 100 % en un único pago a través de Chivapp (Mercado Pago) para la reserva de la fecha.\nEL CLIENTE deberá remitir los datos de facturación (razón social, RUC y dirección fiscal) con un mínimo de 5 días hábiles de anticipación.",
            },
            {
                title: "Equipo técnico y producción",
                content:
                    "Los requerimientos técnicos (sonido, iluminación, tarima, backline) serán definidos en un anexo técnico (rider) que ambas partes revisarán previamente. EL CLIENTE proveerá el equipo indicado o autorizará su alquiler según lo acordado.",
            },
            {
                title: "Obligaciones del artista",
                content:
                    "EL ARTISTA se compromete a llegar con la anticipación necesaria para el montaje y pruebas de sonido, y a mantener una conducta profesional acorde al entorno corporativo del evento.",
            },
            {
                title: "Obligaciones del cliente",
                content:
                    "EL CLIENTE facilitará el acceso al recinto con la anticipación necesaria para el montaje del equipo, así como un punto de contacto designado durante el evento para coordinaciones de último momento.",
            },
            {
                title: "Confidencialidad",
                content:
                    "Ambas partes se comprometen a mantener confidencialidad respecto de información comercial, estratégica o de terceros a la que pudieran tener acceso con motivo de la organización del evento.",
            },
            {
                title: "Imagen y derechos",
                content:
                    "El uso de fotografías, videos o grabaciones del show con fines comerciales o publicitarios por parte de EL CLIENTE requerirá la autorización previa y expresa de EL ARTISTA, salvo acuerdo distinto por escrito.",
            },
            {
                title: "Fuerza mayor y legislación aplicable",
                content:
                    "Ninguna de las partes será responsable por incumplimientos derivados de caso fortuito o fuerza mayor debidamente acreditado. El presente contrato se rige por las leyes de la República del Perú.",
            },
        ],
    }),
    buildTemplate({
        id: "serenade",
        name: "Serenata o evento íntimo",
        description: "Presentaciones cortas y sorpresas: serenatas, pedidas de mano, cumpleaños.",
        title: "Contrato de servicio de serenata",
        sections: [
            {
                title: "Partes",
                content:
                    "Entre {{nombre_artista}} (en adelante EL ARTISTA) y {{nombre_cliente}}, identificado(a) con {{documento_cliente}} (en adelante EL CLIENTE), se acuerda la prestación de un servicio de serenata con fecha {{fecha_contrato}}.",
            },
            {
                title: "Detalle del servicio",
                content:
                    "EL ARTISTA se presentará el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, con una duración aproximada de {{duracion_servicio}}, para interpretar el repertorio previamente coordinado con EL CLIENTE.\nPor tratarse de un servicio de tipo {{tipo_evento}}, EL CLIENTE deberá indicar con anticipación el motivo de la serenata y las canciones especiales que desea incluir.",
            },
            {
                title: "Honorarios y forma de pago",
                content:
                    "El monto total acordado es {{monto_total}}, que EL CLIENTE pagará al 100 % en un único pago a través de Chivapp (Mercado Pago) para confirmar la fecha y hora.",
            },
            {
                title: "Puntualidad y confidencialidad de la sorpresa",
                content:
                    "EL ARTISTA se compromete a llegar puntualmente al lugar indicado y a mantener discreción sobre la sorpresa hasta el momento acordado con EL CLIENTE.\nEL CLIENTE deberá proporcionar una dirección exacta y de fácil acceso, así como un número de contacto disponible el día del servicio.",
            },
            {
                title: "Cancelaciones y reprogramación",
                content:
                    "Cualquier cambio de fecha, hora o lugar deberá comunicarse con al menos 48 horas de anticipación. Las cancelaciones y reembolsos se rigen por la política de Chivapp: si EL CLIENTE cancela con más de 15 días de anticipación se le reembolsa el 100 % de lo pagado (sin el costo de la pasarela de pagos); entre 7 y 15 días, el 50 %; y con menos de 7 días no hay reembolso. Los reembolsos son revisados y aprobados por Chivapp.",
            },
            {
                title: "Responsabilidad y permisos",
                content:
                    "EL CLIENTE es responsable de gestionar los permisos necesarios (por ejemplo, en condominios, edificios o vía pública) para la realización de la serenata. EL ARTISTA no se hace responsable por inconvenientes derivados de la falta de dichos permisos.",
            },
            {
                title: "Disposiciones finales",
                content:
                    "Cualquier acuerdo adicional deberá constar por escrito. Este contrato se rige por la legislación peruana vigente.",
            },
        ],
    }),
    buildTemplate({
        id: "wake",
        name: "Velorio u homenaje",
        description: "Acompañamiento musical para despedidas, misas y homenajes.",
        title: "Contrato de servicio musical para homenaje",
        sections: [
            {
                title: "Partes",
                content:
                    "Entre {{nombre_artista}} (en adelante EL ARTISTA) y {{nombre_cliente}}, identificado(a) con {{documento_cliente}} (en adelante EL CLIENTE), se acuerda la prestación de un servicio musical de acompañamiento con fecha {{fecha_contrato}}.",
            },
            {
                title: "Detalle del servicio",
                content:
                    "EL ARTISTA brindará acompañamiento musical el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, con una duración aproximada de {{duracion_servicio}}, en el marco de {{tipo_evento}}.",
            },
            {
                title: "Honorarios y forma de pago",
                content:
                    "El monto acordado por el servicio es {{monto_total}}. EL CLIENTE pagará el 100 % en un único pago a través de Chivapp (Mercado Pago) para confirmar la reserva.",
            },
            {
                title: "Repertorio y sensibilidad del servicio",
                content:
                    "Dada la naturaleza del evento, el repertorio se acordará previamente entre las partes, priorizando piezas acordes al momento (música religiosa, tradicional o de preferencia del homenajeado). EL ARTISTA se compromete a mantener un comportamiento respetuoso y discreto durante todo el servicio.",
            },
            {
                title: "Puntualidad y logística",
                content:
                    "EL ARTISTA llegará con la anticipación necesaria para coordinar con los organizadores del homenaje (familiares, funeraria o iglesia) el momento exacto de su participación.\nEL CLIENTE facilitará información de contacto de la persona a cargo de la logística del lugar para una coordinación adecuada.",
            },
            {
                title: "Cambios de horario",
                content:
                    "Dado que estos eventos pueden reprogramarse por motivos ajenos a las partes, cualquier cambio de horario informado con al menos 3 horas de anticipación será atendido sin penalidad, sujeto a la disponibilidad de EL ARTISTA.",
            },
            {
                title: "Disposiciones finales",
                content:
                    "Cualquier acuerdo adicional deberá constar por escrito. Este contrato se rige por la legislación peruana vigente.",
            },
        ],
    }),
    buildTemplate({
        id: "festival",
        name: "Festival o evento público",
        description: "Conciertos y presentaciones en escenarios con producción técnica.",
        title: "Contrato de presentación artística para evento público",
        sections: [
            {
                title: "Partes",
                content:
                    "Entre {{nombre_artista}} (en adelante EL ARTISTA) y {{nombre_cliente}}, en representación de la organización del evento, identificado(a) con {{documento_cliente}} (en adelante EL ORGANIZADOR), se celebra el presente contrato de presentación artística con fecha {{fecha_contrato}}.",
            },
            {
                title: "Objeto y alcance de la presentación",
                content:
                    "EL ARTISTA se presentará en vivo el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, en el marco de {{tipo_evento}}, con una duración de presentación de {{duracion_servicio}}.\nEl horario exacto de ingreso a escenario será confirmado por EL ORGANIZADOR con al menos 48 horas de anticipación.",
            },
            {
                title: "Honorarios y forma de pago",
                content:
                    "Los honorarios acordados son {{monto_total}}. EL ORGANIZADOR pagará el 100 % en un único pago a través de Chivapp (Mercado Pago) para confirmar la participación de EL ARTISTA.",
            },
            {
                title: "Rider técnico y producción",
                content:
                    "EL ORGANIZADOR se compromete a proveer el equipo técnico de sonido, iluminación y escenario detallado en el rider técnico entregado por EL ARTISTA, o a coordinar previamente cualquier excepción. Las pruebas de sonido se realizarán en el horario que EL ORGANIZADOR asigne dentro de la programación general del evento.",
            },
            {
                title: "Camerinos, alimentación y hospedaje",
                content:
                    "EL ORGANIZADOR proveerá un camerino o espacio privado adecuado para EL ARTISTA y su equipo, así como alimentación y, de ser necesario por la distancia o duración del evento, hospedaje y traslados, según lo acordado previamente entre las partes.",
            },
            {
                title: "Obligaciones del artista",
                content:
                    "EL ARTISTA se compromete a presentarse en el horario asignado, cumplir con el tiempo de show acordado y respetar las normas de seguridad y convivencia del recinto.",
            },
            {
                title: "Obligaciones del organizador y permisos",
                content:
                    "EL ORGANIZADOR es responsable de la difusión, boletería, seguridad general del evento y del cumplimiento de los permisos municipales o de autoridad competente necesarios para su realización, así como de garantizar condiciones de seguridad para EL ARTISTA, su equipo e instrumentos durante el montaje, la presentación y el desmontaje.",
            },
            {
                title: "Uso de imagen y derechos de autor",
                content:
                    "EL ORGANIZADOR podrá realizar registro fotográfico y audiovisual del evento para fines de difusión no comercial. Cualquier uso comercial, transmisión en vivo (streaming) o grabación con fines de explotación económica requerirá autorización previa y expresa de EL ARTISTA.",
            },
            {
                title: "Fuerza mayor y legislación aplicable",
                content:
                    "Ninguna de las partes será responsable por el incumplimiento de sus obligaciones derivado de caso fortuito o fuerza mayor. El presente contrato se rige por las leyes de la República del Perú.",
            },
        ],
    }),
];

export type ContractDesignerVariant = "musician" | "contractor";

export const CONTRACTOR_PLACEHOLDERS: ContractPlaceholder[] = [
    { key: "{{nombre_cliente}}", label: "Tu nombre", sample: "María González" },
    { key: "{{documento_cliente}}", label: "Tu documento", sample: "DNI 12345678" },
    { key: "{{tipo_documento_cliente}}", label: "Tipo de documento", sample: "DNI" },
    { key: "{{direccion_cliente}}", label: "Tu dirección", sample: "Av. Principal 123" },
    { key: "{{ciudad_cliente}}", label: "Tu ciudad", sample: "Lima" },
    { key: "{{correo_cliente}}", label: "Tu correo", sample: "cliente@email.com" },
    { key: "{{telefono_cliente}}", label: "Tu teléfono", sample: "+51 999 888 777" },
    { key: "{{nombre_artista}}", label: "Nombre del artista", sample: "Los Chivitos del Sur" },
    { key: "{{tipo_evento}}", label: "Tipo de evento", sample: "Boda" },
    { key: "{{fecha_evento}}", label: "Fecha del evento", sample: "15/08/2026" },
    { key: "{{hora_evento}}", label: "Hora del evento", sample: "19:00" },
    { key: "{{lugar_evento}}", label: "Lugar del evento", sample: "Salón Los Jardines, Lima" },
    { key: "{{duracion_servicio}}", label: "Duración", sample: "2 horas" },
    { key: "{{monto_total}}", label: "Monto total", sample: "S/ 1,200" },
    { key: "{{fecha_contrato}}", label: "Fecha del contrato", sample: "23/07/2026" },
];

export const CONTRACTOR_TEMPLATES: ContractTemplate[] = [
    buildTemplate({
        id: "hire-standard",
        name: "Contratación estándar",
        description: "Contrato general y completo para reservar un músico en eventos privados.",
        title: "Contrato de contratación de servicios musicales",
        sections: [
            {
                title: "Partes",
                content:
                    "{{nombre_cliente}}, identificado(a) con {{tipo_documento_cliente}} {{documento_cliente}}, domiciliado(a) en {{direccion_cliente}}, {{ciudad_cliente}} (en adelante EL CLIENTE), contrata los servicios de {{nombre_artista}} (en adelante EL ARTISTA), mediante el presente contrato con fecha {{fecha_contrato}}.",
            },
            {
                title: "Servicio contratado",
                content:
                    "EL ARTISTA prestará un servicio musical en vivo de tipo {{tipo_evento}} el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, por una duración aproximada de {{duracion_servicio}}.\nEl repertorio y los momentos especiales del evento serán coordinados previamente entre las partes.",
            },
            {
                title: "Honorarios y forma de pago",
                content:
                    "EL CLIENTE pagará {{monto_total}} por el servicio contratado. El pago es del 100 % en un único pago a través de Chivapp (Mercado Pago) para confirmar la reserva.",
            },
            {
                title: "Requerimientos técnicos y logística",
                content:
                    "EL CLIENTE informará con anticipación si el lugar cuenta con las condiciones necesarias (espacio, energía eléctrica, acceso) o si requiere que EL ARTISTA coordine equipo adicional de sonido o iluminación.",
            },
            {
                title: "Obligaciones del cliente",
                content:
                    "EL CLIENTE se compromete a confirmar la dirección exacta y datos de contacto del lugar del evento con al menos 48 horas de anticipación, comunicar oportunamente cualquier cambio de horario o lugar, y realizar los pagos acordados en las fechas establecidas.",
            },
            {
                title: "Obligaciones del artista",
                content:
                    "EL ARTISTA se compromete a llegar con al menos 45 minutos de anticipación, cumplir con el repertorio y horario acordados, y mantener una presentación profesional durante todo el servicio.",
            },
            {
                title: "Cancelaciones y reprogramación",
                content:
                    "Las cancelaciones y reembolsos se rigen por la política de Chivapp: si EL CLIENTE cancela con más de 15 días de anticipación se le reembolsa el 100 % de lo pagado (sin el costo de la pasarela de pagos); entre 7 y 15 días, el 50 %; y con menos de 7 días no hay reembolso. Los reembolsos son revisados y aprobados por Chivapp. Si EL ARTISTA no pudiera asistir por causas propias, EL CLIENTE recibirá el reembolso del 100 % de lo pagado o se reprogramará de común acuerdo.",
            },
            {
                title: "Fuerza mayor y derechos de imagen",
                content:
                    "Ninguna de las partes será responsable por incumplimientos derivados de caso fortuito o fuerza mayor. El uso comercial de fotografías o videos del show requerirá autorización expresa de EL ARTISTA.",
            },
            {
                title: "Legislación aplicable y contacto",
                content:
                    "Este contrato se rige por las leyes de la República del Perú. Para coordinaciones, EL CLIENTE podrá comunicarse mediante {{correo_cliente}} o {{telefono_cliente}}.",
            },
        ],
    }),
    buildTemplate({
        id: "hire-social",
        name: "Evento social",
        description: "Bodas, cumpleaños y celebraciones familiares.",
        title: "Contrato de contratación para evento social",
        sections: [
            {
                title: "Partes",
                content:
                    "EL CLIENTE {{nombre_cliente}} ({{tipo_documento_cliente}} {{documento_cliente}}), domiciliado(a) en {{direccion_cliente}}, {{ciudad_cliente}}, contrata a EL ARTISTA {{nombre_artista}} para un evento social con fecha de firma {{fecha_contrato}}.",
            },
            {
                title: "Detalle del evento",
                content:
                    "El servicio se realizará el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, con una duración estimada de {{duracion_servicio}}, con motivo de {{tipo_evento}}.",
            },
            {
                title: "Repertorio y momentos especiales",
                content:
                    "EL CLIENTE confirmará el repertorio y los momentos clave del evento (por ejemplo, entrada, ceremonia, brindis, baile principal) con al menos 5 días de anticipación.",
            },
            {
                title: "Inversión y forma de pago",
                content:
                    "El monto total acordado es {{monto_total}}. EL CLIENTE pagará el 100 % en un único pago a través de Chivapp (Mercado Pago) para reservar la fecha.",
            },
            {
                title: "Logística del evento",
                content:
                    "EL CLIENTE garantizará un espacio adecuado para la presentación, acceso a energía eléctrica y, de ser posible, un área de descanso para EL ARTISTA durante el evento.",
            },
            {
                title: "Obligaciones de las partes",
                content:
                    "EL ARTISTA se compromete a llegar puntualmente y ofrecer una presentación acorde al evento contratado. EL CLIENTE se compromete a informar oportunamente cualquier cambio en la programación.",
            },
            {
                title: "Cancelaciones y reprogramación",
                content:
                    "Las cancelaciones y reembolsos se rigen por la política de Chivapp: si EL CLIENTE cancela con más de 15 días de anticipación se le reembolsa el 100 % de lo pagado (sin el costo de la pasarela de pagos); entre 7 y 15 días, el 50 %; y con menos de 7 días no hay reembolso. Los reembolsos son revisados y aprobados por Chivapp. Toda reprogramación deberá coordinarse por escrito y quedará sujeta a la disponibilidad de EL ARTISTA.",
            },
            {
                title: "Disposiciones finales",
                content:
                    "Cualquier modificación al presente contrato deberá constar por escrito. Este documento se rige por la legislación peruana vigente.",
            },
        ],
    }),
    buildTemplate({
        id: "hire-corporate",
        name: "Evento corporativo",
        description: "Empresas, ferias y activaciones de marca.",
        title: "Contrato de contratación de servicios musicales corporativos",
        sections: [
            {
                title: "Partes",
                content:
                    "{{nombre_cliente}}, representando a la organización contratante, identificado(a) con {{tipo_documento_cliente}} {{documento_cliente}}, contrata los servicios de {{nombre_artista}} mediante el presente contrato con fecha {{fecha_contrato}}.",
            },
            {
                title: "Alcance del servicio",
                content:
                    "EL ARTISTA realizará una presentación musical corporativa el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, con motivo de {{tipo_evento}}, por una duración de {{duracion_servicio}}.",
            },
            {
                title: "Honorarios y facturación",
                content:
                    "Los honorarios totales acordados son {{monto_total}}. EL CLIENTE pagará el 100 % en un único pago a través de Chivapp (Mercado Pago) para confirmar la reserva. Los datos de facturación serán enviados a {{correo_cliente}} con al menos 5 días hábiles de anticipación.",
            },
            {
                title: "Rider técnico y producción",
                content:
                    "Los requerimientos técnicos (sonido, iluminación, tarima) serán coordinados previamente entre las partes conforme al rider técnico proporcionado por EL ARTISTA.",
            },
            {
                title: "Obligaciones del cliente",
                content:
                    "EL CLIENTE facilitará el acceso al recinto con la anticipación necesaria para el montaje del equipo, así como un punto de contacto designado durante el evento.",
            },
            {
                title: "Obligaciones del artista",
                content:
                    "EL ARTISTA se compromete a llegar con la anticipación necesaria para el montaje y pruebas de sonido, manteniendo una conducta profesional acorde al entorno corporativo.",
            },
            {
                title: "Confidencialidad",
                content:
                    "Ambas partes se comprometen a mantener confidencialidad sobre información comercial o estratégica a la que tengan acceso con motivo del evento.",
            },
            {
                title: "Uso de imagen y derechos",
                content:
                    "Cualquier uso comercial de fotografías o videos del show requerirá autorización expresa de EL ARTISTA, salvo acuerdo distinto por escrito.",
            },
            {
                title: "Fuerza mayor y legislación aplicable",
                content:
                    "Ninguna de las partes será responsable por incumplimientos derivados de caso fortuito o fuerza mayor. Este contrato se rige por las leyes de la República del Perú.",
            },
        ],
    }),
    buildTemplate({
        id: "hire-serenade",
        name: "Serenata o sorpresa",
        description: "Para contratar serenatas, pedidas de mano o sorpresas musicales.",
        title: "Contrato de contratación de serenata",
        sections: [
            {
                title: "Partes",
                content:
                    "{{nombre_cliente}}, identificado(a) con {{tipo_documento_cliente}} {{documento_cliente}} (en adelante EL CLIENTE), contrata a {{nombre_artista}} (en adelante EL ARTISTA) para un servicio de serenata, con fecha {{fecha_contrato}}.",
            },
            {
                title: "Detalle del servicio",
                content:
                    "El servicio se realizará el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, con una duración aproximada de {{duracion_servicio}}, con motivo de {{tipo_evento}}.",
            },
            {
                title: "Honorarios y forma de pago",
                content:
                    "El monto total acordado es {{monto_total}}. EL CLIENTE pagará el 100 % en un único pago a través de Chivapp (Mercado Pago) para confirmar la fecha y hora.",
            },
            {
                title: "Coordinación y confidencialidad de la sorpresa",
                content:
                    "EL CLIENTE indicará con anticipación las canciones especiales y el motivo de la sorpresa. EL ARTISTA se compromete a mantener discreción hasta el momento acordado.\nEL CLIENTE es responsable de gestionar los permisos necesarios (condominios, edificios, vía pública) para la realización de la serenata.",
            },
            {
                title: "Cancelaciones y cambios de horario",
                content:
                    "Cualquier cambio de fecha, hora o lugar deberá comunicarse con al menos 48 horas de anticipación. Las cancelaciones y reembolsos se rigen por la política de Chivapp: si EL CLIENTE cancela con más de 15 días de anticipación se le reembolsa el 100 % de lo pagado (sin el costo de la pasarela de pagos); entre 7 y 15 días, el 50 %; y con menos de 7 días no hay reembolso. Los reembolsos son revisados y aprobados por Chivapp.",
            },
            {
                title: "Disposiciones finales",
                content:
                    "Cualquier acuerdo adicional deberá constar por escrito. Este contrato se rige por la legislación peruana vigente.",
            },
        ],
    }),
    buildTemplate({
        id: "hire-wake",
        name: "Velorio u homenaje",
        description: "Para contratar acompañamiento musical en despedidas y homenajes.",
        title: "Contrato de contratación de servicio musical para homenaje",
        sections: [
            {
                title: "Partes",
                content:
                    "{{nombre_cliente}}, identificado(a) con {{tipo_documento_cliente}} {{documento_cliente}} (en adelante EL CLIENTE), contrata a {{nombre_artista}} (en adelante EL ARTISTA) para un servicio de acompañamiento musical, con fecha {{fecha_contrato}}.",
            },
            {
                title: "Detalle del servicio",
                content:
                    "El servicio se realizará el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, con una duración aproximada de {{duracion_servicio}}, en el marco de {{tipo_evento}}.",
            },
            {
                title: "Honorarios y forma de pago",
                content:
                    "El monto acordado es {{monto_total}}. EL CLIENTE pagará el 100 % en un único pago a través de Chivapp (Mercado Pago) para confirmar la reserva.",
            },
            {
                title: "Coordinación del servicio",
                content:
                    "EL CLIENTE proporcionará información de contacto de la persona a cargo de la logística del lugar (funeraria, parroquia o salón) para una adecuada coordinación con EL ARTISTA.",
            },
            {
                title: "Cambios de horario",
                content:
                    "Dado que estos eventos pueden reprogramarse por motivos ajenos a las partes, cualquier cambio de horario informado con al menos 3 horas de anticipación será atendido sujeto a la disponibilidad de EL ARTISTA.",
            },
            {
                title: "Disposiciones finales",
                content:
                    "Cualquier acuerdo adicional deberá constar por escrito. Este contrato se rige por la legislación peruana vigente.",
            },
        ],
    }),
    buildTemplate({
        id: "hire-festival",
        name: "Festival o evento público",
        description: "Para organizadores de conciertos y presentaciones con producción técnica.",
        title: "Contrato de contratación para evento público",
        sections: [
            {
                title: "Partes",
                content:
                    "{{nombre_cliente}}, en representación de la organización del evento, identificado(a) con {{tipo_documento_cliente}} {{documento_cliente}} (en adelante EL ORGANIZADOR), contrata la participación de {{nombre_artista}} (en adelante EL ARTISTA) mediante el presente contrato con fecha {{fecha_contrato}}.",
            },
            {
                title: "Alcance de la presentación",
                content:
                    "EL ARTISTA se presentará en vivo el {{fecha_evento}} a las {{hora_evento}} horas, en {{lugar_evento}}, en el marco de {{tipo_evento}}, con una duración de presentación de {{duracion_servicio}}.",
            },
            {
                title: "Honorarios y forma de pago",
                content:
                    "Los honorarios acordados son {{monto_total}}. EL ORGANIZADOR pagará el 100 % en un único pago a través de Chivapp (Mercado Pago) para confirmar la participación de EL ARTISTA.",
            },
            {
                title: "Rider técnico y producción",
                content:
                    "EL ORGANIZADOR proveerá el equipo técnico de sonido, iluminación y escenario conforme al rider técnico proporcionado por EL ARTISTA, o coordinará previamente cualquier excepción.",
            },
            {
                title: "Camerinos y logística",
                content:
                    "EL ORGANIZADOR proveerá un camerino o espacio privado adecuado, así como alimentación y, de ser necesario, hospedaje y traslados, según lo acordado previamente.",
            },
            {
                title: "Seguridad y permisos",
                content:
                    "EL ORGANIZADOR es responsable de los permisos municipales o de autoridad competente necesarios para la realización del evento, así como de la seguridad general del recinto.",
            },
            {
                title: "Uso de imagen y derechos",
                content:
                    "EL ORGANIZADOR podrá realizar registro fotográfico y audiovisual del evento para fines de difusión no comercial. Cualquier uso comercial o transmisión en vivo requerirá autorización previa y expresa de EL ARTISTA.",
            },
            {
                title: "Fuerza mayor y legislación aplicable",
                content:
                    "Ninguna de las partes será responsable por incumplimientos derivados de caso fortuito o fuerza mayor. Este contrato se rige por las leyes de la República del Perú.",
            },
        ],
    }),
];

export type ContractorPreviewContext = {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    documentType: string;
    documentNumber: string;
    address: string;
    city: string;
    contractDate: string;
};

export function buildContractorPreviewContext(input: {
    clientName: string;
    clientEmail: string;
    clientPhone: string | null;
    documentType: string;
    documentNumber: string;
    address: string;
    city: string;
}): ContractorPreviewContext {
    return {
        clientName: input.clientName || "Nombre del cliente",
        clientEmail: input.clientEmail || "cliente@email.com",
        clientPhone: input.clientPhone || "+51 999 888 777",
        documentType: input.documentType || "DNI",
        documentNumber: input.documentNumber || "12345678",
        address: input.address || "Av. Principal 123",
        city: input.city || "Lima",
        contractDate: new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" }),
    };
}

export function replaceContractorPlaceholders(
    html: string,
    context: ContractorPreviewContext,
    mode: "preview" | "pdf",
): string {
    const sampleMap = Object.fromEntries(
        CONTRACTOR_PLACEHOLDERS.map((item) => [item.key, item.sample]),
    ) as Record<string, string>;
    // Plantillas antiguas: el "anticipo" ahora es el pago único del total.
    sampleMap[LEGACY_ADVANCE_PLACEHOLDER] = sampleMap["{{monto_total}}"];

    const clientMap: Record<string, string> = {
        "{{nombre_cliente}}": context.clientName,
        "{{documento_cliente}}": context.documentNumber,
        "{{tipo_documento_cliente}}": context.documentType,
        "{{direccion_cliente}}": context.address,
        "{{ciudad_cliente}}": context.city,
        "{{correo_cliente}}": context.clientEmail,
        "{{telefono_cliente}}": context.clientPhone,
        "{{fecha_contrato}}": context.contractDate,
    };

    const eventKeys = new Set([
        "{{nombre_artista}}",
        "{{tipo_evento}}",
        "{{fecha_evento}}",
        "{{hora_evento}}",
        "{{lugar_evento}}",
        "{{duracion_servicio}}",
        "{{monto_total}}",
        LEGACY_ADVANCE_PLACEHOLDER,
    ]);

    return unwrapVariableSpans(html).replace(PLACEHOLDER_TOKEN_PATTERN, (token) => {
        if (clientMap[token]) return clientMap[token];
        if (mode === "preview") return sampleMap[token] ?? token;
        if (eventKeys.has(token)) return "________________________";
        return sampleMap[token] ?? token;
    });
}

export function getContractDesignerConfig(variant: ContractDesignerVariant) {
    if (variant === "contractor") {
        return {
            templates: CONTRACTOR_TEMPLATES,
            placeholders: CONTRACTOR_PLACEHOLDERS,
            defaultTitle: "Contrato de contratación de servicios musicales",
            titlePlaceholder: "Contrato de contratación de servicios musicales",
            introText:
                "Diseña el contrato que usarás al contratar músicos, con el mismo estilo (negritas, colores, alineación) que verá el cliente. Elige una plantilla, personalízala y previsualiza el resultado.",
            previewHeading: "Vista previa del contrato",
            previewHint:
                "Ejemplo con datos ficticios del artista y evento. Tus datos personales se completan automáticamente.",
            previewMetaLabel: "Cliente",
            previewMetaValueKey: "clientName" as const,
            footerLeftLabel: "EL CLIENTE",
            footerLeftValueKey: "clientName" as const,
            footerRightLabel: "EL ARTISTA",
            footerRightFallback: "Nombre artístico y firma",
            pdfButtonLabel: "Generar PDF del contrato",
            placeholderHint:
                "Inserta variables que se completarán al reservar un músico. En la vista previa verás ejemplos.",
        };
    }

    return {
        templates: CONTRACT_TEMPLATES,
        placeholders: CONTRACT_PLACEHOLDERS,
        defaultTitle: "Contrato de prestación de servicios musicales",
        titlePlaceholder: "Contrato de prestación de servicios musicales",
        introText:
            "Diseña el contrato que entregarás a tus clientes con un editor tipo Word: aplica negritas, colores, alineación y tamaños de letra. Usa una plantilla, personaliza el texto y previsualiza el resultado exactamente como se verá en el PDF.",
        previewHeading: "Vista previa para el cliente",
        previewHint:
            "Ejemplo con datos ficticios. Los campos del cliente quedarán en blanco en el PDF.",
        previewMetaLabel: "Artista",
        previewMetaValueKey: "artistName" as const,
        footerLeftLabel: "EL ARTISTA",
        footerLeftValueKey: "artistName" as const,
        footerRightLabel: "EL CLIENTE",
        footerRightFallback: "Nombre y firma",
        pdfButtonLabel: "Generar PDF para clientes",
        placeholderHint:
            "Inserta variables que se completarán con datos del cliente al generar el contrato final. En la vista previa verás ejemplos.",
    };
}
