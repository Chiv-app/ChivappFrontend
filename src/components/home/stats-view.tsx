import { Icon } from "@iconify/react";
import type { PlatformStatsOut } from "@/types/api";
import { Card, CardBody } from "@heroui/react";

type Props = {
    stats: PlatformStatsOut | null;
};

function buildStatItems(stats: PlatformStatsOut | null) {
    if (!stats) return [];
    const items: { icon: string; value: string; label: string }[] = [];

    if (stats.musicians_count > 0) {
        items.push({
            icon: "material-symbols:verified-outline",
            value: `+${stats.musicians_count}`,
            label: "Músicos verificados",
        });
    }
    if (stats.completed_bookings_count > 0) {
        items.push({
            icon: "material-symbols:celebration-outline",
            value: `${stats.completed_bookings_count}`,
            label: "Eventos realizados",
        });
    }
    if (stats.average_rating != null) {
        items.push({
            icon: "material-symbols:star-rounded",
            value: stats.average_rating.toFixed(1),
            label: "Calificación promedio",
        });
    }

    return items;
}

export default function StatsSection({ stats }: Props) {
    const items = buildStatItems(stats);

    if (items.length === 0) return null;

    return (
        <section className="border-t border-default-200/60 py-12 sm:py-16">
            <div className="max-w-content mx-auto px-4 sm:px-6 md:px-8">
                <div
                    className={`grid grid-cols-1 ${
                        items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
                    } gap-6 sm:gap-8`}
                >
                    {items.map((item) => (
                        <Card
                            key={item.label}
                            shadow="sm"
                            className="border border-default-200/60 bg-content1/50 backdrop-blur-md"
                        >
                            <CardBody className="flex flex-col items-center text-center gap-2 sm:gap-3 p-6 sm:p-8">
                                <div className="flex size-11 sm:size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                                    <Icon icon={item.icon} width={24} height={24} />
                                </div>
                                <div className="text-3xl sm:text-4xl font-bold tabular-nums leading-none text-foreground">
                                    {item.value}
                                </div>
                                <div className="text-sm text-default-500 font-medium">
                                    {item.label}
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
