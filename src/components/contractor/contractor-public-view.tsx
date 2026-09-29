"use client";

import { Icon } from "@iconify/react";
import type { ContractorProfilePublicOut } from "@/types/api";

export default function ContractorPublicView({
    contractor,
}: {
    contractor: ContractorProfilePublicOut;
}) {
    return (
        <main className="pt-6 sm:pt-10 pb-20 px-3 sm:px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="rounded-4xl border border-default-200/70 bg-content1 shadow-soft p-4 sm:p-6 md:p-8 mb-8">
                    <p className="text-xs font-semibold uppercase tracking-wide text-default-400 mb-2">
                        Cliente verificado
                    </p>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                        {contractor.fullname}
                    </h1>
                    {contractor.city ? (
                        <p className="mt-3 flex items-center gap-2 text-default-500">
                            <Icon icon="material-symbols:location-on" width={18} />
                            {contractor.city}
                        </p>
                    ) : null}
                    {contractor.bio ? (
                        <p className="mt-4 text-default-600 leading-relaxed">
                            {contractor.bio}
                        </p>
                    ) : null}
                    {contractor.rating_avg != null ? (
                        <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-default-200 px-4 py-2">
                            <Icon
                                icon="material-symbols:star"
                                width={18}
                                className="text-warning"
                            />
                            <span className="font-bold tabular-nums">
                                {contractor.rating_avg.toFixed(1)}
                            </span>
                            <span className="text-sm text-default-500">
                                Â· {contractor.rating_count ?? 0}{" "}
                                {(contractor.rating_count ?? 0) === 1
                                    ? "recomendaciÃ³n"
                                    : "recomendaciones"}
                            </span>
                        </div>
                    ) : null}
                </div>

                <section>
                    <h2 className="text-2xl font-bold tracking-tight mb-4">
                        Recomendaciones de mÃºsicos
                    </h2>
                    {contractor.recommendations.length === 0 ? (
                        <div className="rounded-4xl border border-dashed border-default-300 px-6 py-10 text-center text-default-500">
                            AÃºn no hay recomendaciones pÃºblicas.
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-4">
                            {contractor.recommendations.map((item) => (
                                <li
                                    key={item.id}
                                    className="rounded-4xl border border-default-200/70 bg-content1 shadow-soft px-5 py-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-semibold text-foreground">
                                            {item.musician_name}
                                        </p>
                                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-warning">
                                            <Icon
                                                icon="material-symbols:star"
                                                width={16}
                                            />
                                            {item.rating.toFixed(1)}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-default-600 leading-relaxed whitespace-pre-wrap">
                                        {item.comment}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}

