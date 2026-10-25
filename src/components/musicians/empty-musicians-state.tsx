import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";

type Props = {
    hasActiveFilters?: boolean;
    onClearFilters?: () => void;
    hasError?: boolean;
    onRetry?: () => void;
};

export default function EmptyMusiciansState({
    hasActiveFilters = false,
    onClearFilters,
    hasError = false,
    onRetry,
}: Props = {}) {
    if (hasError) {
        return (
            <div
                role="alert"
                className="col-span-full flex flex-col items-center gap-3 py-16 text-center"
            >
                <span className="flex size-14 items-center justify-center rounded-full bg-danger/10 text-danger-text">
                    <Icon icon="material-symbols:cloud-off-rounded" width={26} />
                </span>
                <h3 className="text-lg font-bold text-foreground">
                    No pudimos cargar los músicos
                </h3>
                <p className="text-default-500 text-sm max-w-sm text-pretty">
                    Ocurrió un problema temporal al consultar el catálogo. Intenta nuevamente en unos segundos.
                </p>
                {onRetry ? (
                    <Button
                        color="primary"
                        variant="flat"
                        radius="full"
                        onPress={onRetry}
                        startContent={<Icon icon="material-symbols:refresh" width={18} />}
                        className="mt-2 font-semibold"
                    >
                        Reintentar
                    </Button>
                ) : null}
            </div>
        );
    }

    if (hasActiveFilters) {
        return (
            <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                    <Icon icon="material-symbols:filter-alt-off-outline" width={26} />
                </span>
                <h3 className="text-lg font-bold text-foreground">
                    No encontramos músicos con estos filtros
                </h3>
                <p className="text-default-500 text-sm max-w-sm text-pretty">
                    Prueba ajustando la ciudad, el género o el rango de presupuesto para ver más opciones disponibles.
                </p>
                {onClearFilters ? (
                    <Button
                        color="primary"
                        radius="full"
                        onPress={onClearFilters}
                        startContent={<Icon icon="material-symbols:restart-alt" width={18} />}
                        className="mt-2 font-semibold text-primary-foreground"
                    >
                        Limpiar filtros
                    </Button>
                ) : null}
            </div>
        );
    }

    return (
        <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                <Icon icon="material-symbols:search-off-rounded" width={26} />
            </span>
            <h3 className="text-lg font-bold text-foreground">
                Aún no hay músicos publicados
            </h3>
            <p className="text-default-500 text-sm max-w-sm text-pretty">
                Estamos sumando artistas verificados. Vuelve pronto o
                regístrate para que te avisemos cuando haya disponibilidad.
            </p>
        </div>
    );
}
