import type { Metadata } from "next";
import OnboardingPreviewClient from "./preview-client";

export const metadata: Metadata = {
    title: "Vista previa de tu perfil",
    robots: { index: false, follow: false },
};

export default function OnboardingPreviewPage() {
    return <OnboardingPreviewClient />;
}
