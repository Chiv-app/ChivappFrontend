import { Suspense } from "react";
import type { Metadata } from "next";
import MultiQuoteForm from "@/components/booking/multi-quote-form";
import { MULTI_QUOTE_NAME, MULTI_QUOTE_PATH } from "@/lib/multi-quote";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: MULTI_QUOTE_NAME,
    description: `Pide cotización a varios artistas a la vez en ${SITE_NAME} completando los datos de tu evento una sola vez.`,
    path: MULTI_QUOTE_PATH,
    noIndex: true,
});

export default function MultiQuotePage() {
    return (
        <div className="container mx-auto max-w-content px-4 sm:px-6 py-10 sm:py-14">
            <Suspense fallback={<p className="text-default-500">Cargando…</p>}>
                <MultiQuoteForm />
            </Suspense>
        </div>
    );
}
