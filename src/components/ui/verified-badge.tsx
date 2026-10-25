import { Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

type Props = {
    className?: string;
    size?: "sm" | "md";
    variant?: "solid" | "overlay";
};

export default function VerifiedBadge({
    className = "",
    size = "sm",
    variant = "solid",
}: Props) {
    const sizeClasses = size === "md" ? "text-sm px-3 py-1" : "text-xs px-2.5 py-0.5";
    const variantClasses =
        variant === "overlay"
            ? "bg-emerald-800 text-white border border-white/20 backdrop-blur-sm"
            : "bg-success/15 text-success-text border border-success/30";

    return (
        <Chip
            size={size === "md" ? "md" : "sm"}
            variant="flat"
            className={`${sizeClasses} font-semibold ${variantClasses} ${className}`}
            startContent={
                <Icon
                    icon="material-symbols:verified"
                    width={size === "md" ? 18 : 14}
                    height={size === "md" ? 18 : 14}
                />
            }
        >
            Verificado
        </Chip>
    );
}
