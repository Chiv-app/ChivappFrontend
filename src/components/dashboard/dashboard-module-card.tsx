"use client";

import Link from "next/link";
import { Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { DashboardModule } from "@/lib/dashboard-nav";

type Props = {
    module: DashboardModule;
    locked?: boolean;
};

export default function DashboardModuleCard({ module, locked = false }: Props) {
    const content = (
        <Card
            className={`border border-default-200/70 shadow-soft h-full transition-all duration-300 ${
                locked
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary/40 hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer"
            }`}
        >
            <CardBody className="gap-4 p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-soft shrink-0">
                        <Icon icon={module.icon} width={24} height={24} />
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        {module.comingSoon ? (
                            <Chip size="sm" variant="flat" color="default">
                                Próximamente
                            </Chip>
                        ) : null}
                        {locked ? (
                            <Chip
                                size="sm"
                                variant="flat"
                                color="warning"
                                startContent={
                                    <Icon icon="material-symbols:lock" width={14} height={14} />
                                }
                            >
                                Verificación requerida
                            </Chip>
                        ) : null}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-foreground">{module.title}</h3>
                    <p className="text-sm text-default-500 mt-2 leading-relaxed">
                        {module.description}
                    </p>
                </div>
            </CardBody>
        </Card>
    );

    if (locked || module.comingSoon) {
        return content;
    }

    return (
        <Link href={module.href} className="block h-full">
            {content}
        </Link>
    );
}
