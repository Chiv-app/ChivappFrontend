import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContractorPublicView from "@/components/contractor/contractor-public-view";
import { ApiError } from "@/lib/api";
import { getContractorById } from "@/lib/contractors";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    try {
        const contractor = await getContractorById(id);
        return buildPageMetadata({
            title: contractor.fullname,
            description:
                contractor.bio ??
                `Perfil de ${contractor.fullname} en Chivapp.`,
            path: `/contractors/${id}`,
            // Perfiles de clientes: privados, no deben indexarse.
            noIndex: true,
        });
    } catch {
        return buildPageMetadata({
            title: "Cliente no encontrado",
            description: "Este perfil no está disponible.",
            path: `/contractors/${id}`,
            noIndex: true,
        });
    }
}

export default async function ContractorPublicPage({ params }: PageProps) {
    const { id } = await params;

    let contractor;
    try {
        contractor = await getContractorById(id);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            notFound();
        }
        throw error;
    }

    return <ContractorPublicView contractor={contractor} />;
}
