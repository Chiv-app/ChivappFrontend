import Image from "next/image";

type Props = {
    /** Alto del logo en px (el ancho se ajusta según el aspect ratio real). */
    height?: number;
    className?: string;
    priority?: boolean;
    /**
     * default: Muestra el logo original (texto oscuro)
     * white: Muestra el logo para fondos oscuros (texto blanco)
     * dynamic: Cambia automáticamente usando CSS (dark mode)
     */
    color?: "default" | "white" | "dynamic";
};

const RATIO_V1 = 900 / 287;
const RATIO_V2 = 2170 / 725;

export default function AppLogo({ height = 28, className = "", priority, color = "default" }: Props) {
    if (color === "dynamic") {
        return (
            <>
                <Image
                    src="/logo-chivapp.png"
                    alt="Chivapp"
                    width={Math.round(height * RATIO_V1)}
                    height={height}
                    priority={priority}
                    className={`dark:hidden ${className}`.trim()}
                />
                <Image
                    src="/logo-chivappv2.png"
                    alt="Chivapp"
                    width={Math.round(height * RATIO_V2)}
                    height={height}
                    priority={priority}
                    className={`hidden dark:block ${className}`.trim()}
                />
            </>
        );
    }

    const isWhite = color === "white";
    const src = isWhite ? "/logo-chivappv2.png" : "/logo-chivapp.png";
    const width = Math.round(height * (isWhite ? RATIO_V2 : RATIO_V1));

    return (
        <Image
            src={src}
            alt="Chivapp"
            width={width}
            height={height}
            priority={priority}
            className={className.trim()}
        />
    );
}
