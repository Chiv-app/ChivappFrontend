import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Footer from "@/components/layout/footer";
import PrivacyPage from "@/app/(public)/legal/privacidad/page";
import TermsPage from "@/app/(public)/legal/terminos/page";
import { LEGAL_OPERATOR_NAME } from "@/lib/seo";

vi.mock("@/lib/cancellation-policy", async (importOriginal) => {
    const original = await importOriginal<typeof import("@/lib/cancellation-policy")>();
    return {
        ...original,
        fetchCancellationPolicy: vi.fn().mockResolvedValue(original.DEFAULT_CANCELLATION_POLICY),
    };
});

// Meta verifica que el nombre legal del negocio aparezca en el sitio web.
describe("titular legal visible en el sitio", () => {
    it("el nombre coincide con el de la ficha RUC", () => {
        expect(LEGAL_OPERATOR_NAME).toBe("TUCTO RIVERA MIGUEL ANGEL");
    });

    it("aparece en el pie de página", () => {
        render(<Footer />);
        expect(screen.getByText(new RegExp(`operado por ${LEGAL_OPERATOR_NAME}`))).toBeTruthy();
    });

    it("aparece en la política de privacidad como responsable del tratamiento", () => {
        render(<PrivacyPage />);
        expect(screen.getByText(LEGAL_OPERATOR_NAME)).toBeTruthy();
        expect(screen.getByText("Responsable del tratamiento:")).toBeTruthy();
    });

    it("aparece en los términos y condiciones", async () => {
        render(await TermsPage());
        expect(screen.getByText(LEGAL_OPERATOR_NAME)).toBeTruthy();
    });
});
