import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingLinkPublicOut } from "@/lib/booking-links";
import CheckoutClient from "./checkout-client";

const {
    checkoutBookingLinkMock,
    checkIdentityMock,
    useIsClientMock,
    addToastMock,
} = vi.hoisted(() => ({
    checkoutBookingLinkMock: vi.fn(),
    checkIdentityMock: vi.fn(),
    useIsClientMock: vi.fn(() => true),
    addToastMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/contexts/auth-context", () => ({
    useAuth: () => ({
        user: null,
        refresh: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock("@/hooks/use-is-client", () => ({
    useIsClient: () => useIsClientMock(),
}));

vi.mock("@/lib/booking-links", () => ({
    checkoutBookingLink: (...args: unknown[]) =>
        checkoutBookingLinkMock(...args),
    checkIdentityBookingLink: (...args: unknown[]) =>
        checkIdentityMock(...args),
    sendOtpBookingLink: vi.fn(),
}));

vi.mock("@/components/ui/location-map-picker-field", () => ({
    default: ({
        value,
        onChange,
    }: {
        value: { address: string; city: string } | null;
        onChange: (v: { address: string; city: string }) => void;
    }) => (
        <input
            aria-label="Ubicación del evento"
            value={value?.address || ""}
            onChange={(e) =>
                onChange({ address: e.target.value, city: "Lima" })
            }
        />
    ),
}));

vi.mock("@/components/ui/signature-pad", () => ({
    default: ({
        value,
        onChange,
    }: {
        value: string;
        onChange: (v: string) => void;
    }) => (
        <button
            type="button"
            onClick={() => onChange("data:image/png;base64,iVBORw0KGgo=")}
        >
            {value ? "Firma capturada" : "Firmar contrato"}
        </button>
    ),
}));

vi.mock("@/components/booking/booking-mercadopago-modal", () => ({
    default: ({
        isOpen,
        onClose,
    }: {
        isOpen: boolean;
        onClose: () => void;
    }) =>
        isOpen ? (
            <div data-testid="mp-modal">
                <button type="button" onClick={onClose}>
                    Cerrar modal de pago
                </button>
            </div>
        ) : null,
}));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: addToastMock };
});

const ALL_34_PLACEHOLDERS = [
    "{{nombre_artista}}",
    "{{documento_artista}}",
    "{{correo_artista}}",
    "{{telefono_artista}}",
    "{{instrumentos_artista}}",
    "{{generos_artista}}",
    "{{modalidad}}",
    "{{nombre_cliente}}",
    "{{documento_cliente}}",
    "{{tipo_documento_cliente}}",
    "{{correo_cliente}}",
    "{{telefono_cliente}}",
    "{{ciudad_cliente}}",
    "{{direccion_cliente}}",
    "{{tipo_evento}}",
    "{{descripcion_evento}}",
    "{{fecha_evento}}",
    "{{hora_evento}}",
    "{{hora_inicio}}",
    "{{hora_fin}}",
    "{{lugar_evento}}",
    "{{ciudad_evento}}",
    "{{referencia_evento}}",
    "{{duracion_servicio}}",
    "{{monto_total}}",
    "{{total_cliente}}",
    "{{anticipo}}",
    "{{saldo_pendiente}}",
    "{{tarifa_evento}}",
    "{{tarifa_hora}}",
    "{{neto_artista}}",
    "{{comision_plataforma}}",
    "{{porcentaje_comision}}",
    "{{fecha_contrato}}",
];

function makeLinkData(): BookingLinkPublicOut {
    return {
        id: "link-1",
        token: "tok-public-123",
        price: 500,
        fee_percent: 2,
        fee_amount: 10,
        total_payable: 510,
        event_date: "2027-06-15",
        start_time: "20:00",
        status: "active",
        expires_at: "2027-06-20T00:00:00Z",
        contract_template_title: "Contrato Estándar",
        contract_template_body: `<p>${ALL_34_PLACEHOLDERS.join(" | ")}</p>`,
        musician: {
            id: "m-1",
            stage_name: "Mariachi Imperial",
            bio: "Show completo",
            location_city: "Lima",
            instruments: ["Trompeta", "Vihuela"],
            genres: ["Mariachi"],
            gallery_images: [],
            videos: [],
            average_rating: 5,
            total_reviews: 12,
        },
    } as unknown as BookingLinkPublicOut;
}

describe("CheckoutClient (FE4-08, FE5-06, FE6-07)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useIsClientMock.mockReturnValue(true);
        checkIdentityMock.mockResolvedValue({
            status: "new",
            message: "Cliente nuevo",
        });
    });

    it("does not render raw contract HTML during SSR (!isClient) and shows loading skeleton instead (FE6-07)", async () => {
        useIsClientMock.mockReturnValue(false);
        const user = userEvent.setup();
        render(<CheckoutClient linkData={makeLinkData()} />);

        await user.type(
            screen.getByLabelText(/Tipo de evento/i),
            "Aniversario",
        );
        await user.type(
            screen.getByLabelText(/Ubicación del evento/i),
            "Av. Larco 123, Miraflores",
        );
        await user.click(
            screen.getByRole("button", { name: /Continuar al paso 2/i }),
        );

        await user.type(
            screen.getByLabelText(/Nombre y apellidos completos/i),
            "Ana Gómez",
        );
        await user.type(
            screen.getByLabelText(/Correo electrónico/i),
            "ana@example.com",
        );
        await user.type(
            screen.getByLabelText(/Celular \/ WhatsApp/i),
            "987654321",
        );
        await user.click(
            screen.getByRole("button", { name: /Continuar al paso 3/i }),
        );

        expect(screen.getByLabelText("Cargando contrato")).toHaveAttribute(
            "aria-busy",
            "true",
        );
        expect(
            screen.queryByText(/Mariachi Imperial \| Visible en el contrato/i),
        ).not.toBeInTheDocument();
    });

    it("replaces all 34 contract placeholders and triggers a second checkout when event fields change (FE5-06, FE4-08)", async () => {
        checkoutBookingLinkMock
            .mockResolvedValueOnce({
                booking_id: "b-first",
                message: "Creada",
                signature_image_url: "/uploads/private/sig1.png",
                contract_body_sha256: "hash-1",
            })
            .mockResolvedValueOnce({
                booking_id: "b-first",
                message: "Actualizada",
                signature_image_url: "/uploads/private/sig1.png",
                contract_body_sha256: "hash-2",
            });

        const user = userEvent.setup();
        const { container } = render(
            <CheckoutClient linkData={makeLinkData()} />,
        );

        // Step 1
        await user.type(
            screen.getByLabelText(/Tipo de evento/i),
            "Cumpleaños 50",
        );
        await user.type(
            screen.getByLabelText(/Ubicación del evento/i),
            "Av. Arequipa 1500, Lince",
        );
        await user.click(
            screen.getByRole("button", { name: /Continuar al paso 2/i }),
        );

        // Step 2
        await user.type(
            screen.getByLabelText(/Nombre y apellidos completos/i),
            "Carlos Mendoza",
        );
        await user.type(
            screen.getByLabelText(/Correo electrónico/i),
            "carlos@example.com",
        );
        await user.type(
            screen.getByLabelText(/Celular \/ WhatsApp/i),
            "999888777",
        );
        await user.click(
            screen.getByRole("button", { name: /Continuar al paso 3/i }),
        );

        // Step 3: verify all 34 placeholders were substituted (no "{{" remains)
        const contractDoc = container.querySelector(".contract-doc");
        expect(contractDoc).not.toBeNull();
        expect(contractDoc?.textContent).toContain("Mariachi Imperial");
        expect(contractDoc?.textContent).toContain("Carlos Mendoza");
        expect(contractDoc?.textContent).toContain("Cumpleaños 50");
        expect(contractDoc?.textContent).not.toContain("{{");

        // Sign and accept terms -> First checkout
        await user.click(
            screen.getByRole("button", { name: /Firmar contrato/i }),
        );
        await user.click(screen.getByRole("checkbox"));
        await user.click(
            screen.getByRole("button", { name: /Pagar y confirmar/i }),
        );

        await waitFor(() => {
            expect(checkoutBookingLinkMock).toHaveBeenCalledTimes(1);
        });
        expect(screen.getByTestId("mp-modal")).toBeInTheDocument();

        // Close modal without paying, click "Pagar y confirmar" without changes -> does NOT call checkout again
        await user.click(
            screen.getByRole("button", { name: /Cerrar modal de pago/i }),
        );
        await user.click(
            screen.getByRole("button", { name: /Pagar y confirmar/i }),
        );
        expect(checkoutBookingLinkMock).toHaveBeenCalledTimes(1);

        // Close modal, go back to Step 1, change eventType, return to Step 3 -> MUST call checkout a 2nd time
        await user.click(
            screen.getByRole("button", { name: /Cerrar modal de pago/i }),
        );
        await user.click(
            screen.getByRole("button", { name: /1\. Datos del evento/i }),
        );
        const eventTypeInput = screen.getByLabelText(/Tipo de evento/i);
        await user.clear(eventTypeInput);
        await user.type(eventTypeInput, "Boda Civil");
        await user.click(
            screen.getByRole("button", { name: /3\. Confirmación y pago/i }),
        );
        await user.click(
            screen.getByRole("button", { name: /Pagar y confirmar/i }),
        );

        await waitFor(() => {
            expect(checkoutBookingLinkMock).toHaveBeenCalledTimes(2);
            expect(checkoutBookingLinkMock).toHaveBeenLastCalledWith(
                "tok-public-123",
                expect.objectContaining({
                    event_type: "Boda Civil",
                }),
            );
        });
    });
});
