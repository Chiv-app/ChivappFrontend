"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { DashboardModule } from "@/lib/dashboard-nav";

type Props = {
    module: DashboardModule;
    locked?: boolean;
};

export default function DashboardModuleCard({ module, locked = false }: Props) {
    const router = useRouter();
    const isInteractive = !locked && !module.comingSoon;

    return (
        <Card
            isPressable={isInteractive}
            onPress={() => {
                if (isInteractive) router.push(module.href);
            }}
            className={`border border-default-200/70 shadow-soft h-full transition-all duration-300 text-left ${
                locked
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary/40 hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer"
            }`}
        >
            <CardBody className="gap-4 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-soft shrink-0">
                            <Icon icon={module.icon} width={24} height={24} />
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                            {module.badge && !locked ? (
                                <Chip size="sm" variant="flat" color="primary">
                                    {module.badge}
                                </Chip>
                            ) : null}
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
                                        <Icon
                                            icon="material-symbols:lock"
                                            width={14}
                                            height={14}
                                        />
                                    }
                                >
                                    Verificación requerida
                                </Chip>
                            ) : null}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">
                            {module.title}
                        </h3>
                        <p className="text-sm text-default-500 mt-1.5 leading-relaxed">
                            {module.description}
                        </p>
                    </div>
                </div>

                {module.subLinks && module.subLinks.length > 0 && !locked ? (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="pt-3 border-t border-default-200/60 flex flex-wrap gap-1.5"
                    >
                        {module.subLinks.map((sub) => (
                            <Link
                                key={sub.href}
                                href={sub.href}
                                className="inline-flex items-center gap-1 rounded-xl border border-default-200 bg-default-50/80 px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary-text transition-colors"
                            >
                                {sub.icon ? (
                                    <Icon
                                        icon={sub.icon}
                                        width={14}
                                        aria-hidden="true"
                                    />
                                ) : null}
                                <span>{sub.label}</span>
                            </Link>
                        ))}
                    </div>
                ) : null}
            </CardBody>
        </Card>
    );
}
