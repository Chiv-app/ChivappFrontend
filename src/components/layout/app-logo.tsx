import Image from "next/image";

type Props = {
    /** Alto del logo en px (el ancho se ajusta según el aspect ratio real). */
    height?: number;
    className?: string;
    priority?: boolean;
    /** Si es "white", aplica un filtro para volver el logo completamente blanco (ideal para fondos oscuros) */
    color?: "default" | "white";
};

const LOGO_ASPECT_RATIO = 900 / 287;

export default function AppLogo({ height = 28, className = "", priority, color = "default" }: Props) {
    const filterClass = color === "white" ? "brightness-0 invert" : "";
    return (
        <Image
            src="/logo-chivapp.png"
            alt="Chivapp"
            width={Math.round(height * LOGO_ASPECT_RATIO)}
            height={height}
            priority={priority}
            className={`${filterClass} ${className}`.trim()}
        />
    );
}
