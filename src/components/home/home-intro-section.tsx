"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import MusicianCard from "@/components/layout/musician-card";
import EmptyMusiciansState from "@/components/musicians/empty-musicians-state";
import MasonryItem from "@/components/ui/masonry-item";
import type { MusicianCard as MusicianCardModel } from "@/types/ui/musician";
import { motion } from "framer-motion";

type Props = {
    musicians: MusicianCardModel[];
    hasMoreMusicians?: boolean;
};

export default function HomeIntroSection({ musicians, hasMoreMusicians = false }: Props) {
    return (
        <section id="musicians" className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pb-32">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 px-2"
            >
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground">
                        Artistas destacados
                    </h2>
                    <p className="text-default-500 text-lg">
                        Descubre el talento mejor valorado por la comunidad.
                    </p>
                </div>
                
                {/* Filtros visuales (UI placeholder para el futuro backend) */}
                <div className="flex flex-wrap gap-2">
                    <button className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-105 transition-transform">
                        Todos
                    </button>
                    <button className="px-5 py-2 rounded-full bg-content1 border border-default-200/70 text-sm font-semibold text-foreground hover:bg-default-100 transition-colors shadow-soft">
                        Orquestas
                    </button>
                    <button className="px-5 py-2 rounded-full bg-content1 border border-default-200/70 text-sm font-semibold text-foreground hover:bg-default-100 transition-colors shadow-soft">
                        DJs
                    </button>
                    <button className="px-5 py-2 rounded-full bg-content1 border border-default-200/70 text-sm font-semibold text-foreground hover:bg-default-100 transition-colors shadow-soft">
                        Mariachis
                    </button>
                </div>
            </motion.div>

            {musicians.length === 0 ? (
                <EmptyMusiciansState />
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ staggerChildren: 0.1 }}
                    className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-7 grid-flow-dense auto-rows-[10px]"
                >
                    {musicians.map((m, i) => (
                        <MasonryItem key={m.id} index={i}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className="h-full"
                            >
                                <MusicianCard musician={m} index={i} size="large" />
                            </motion.div>
                        </MasonryItem>
                    ))}
                </motion.div>
            )}

            {hasMoreMusicians ? (
                <div className="flex justify-center mt-12 sm:mt-16">
                    <Link
                        href="/musicians"
                        className="inline-flex items-center gap-2 rounded-full border border-default-200/70 bg-content1/80 backdrop-blur-md px-8 py-4 font-bold text-foreground shadow-soft hover:shadow-elevated hover:-translate-y-1 transition-all"
                    >
                        Explorar todos los artistas
                        <Icon icon="material-symbols:arrow-forward" width={20} />
                    </Link>
                </div>
            ) : null}
        </section>
    );
}
