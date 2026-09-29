import Image from "next/image";

type Props = {
    /** Alto del logo en px (el ancho se ajusta segn el aspect ratio real). */
    height?: number;
    className?: string;
    priority?: boolean;
    /**
     * @deprecated El nuevo logo se usa tanto para dark como para light. Se mantiene por compatibilidad.
     */
    color?: "default" | "white" | "dynamic";
};

const RATIO = 865 / 289;

export default function AppLogo({ height = 28, className = "", priority }: Props) {
    const width = Math.round(height * RATIO);

    return (
        <Image
            src="/logo-chivapp.png"
            alt="Chivapp"
            width={width}
            height={height}
            priority={priority}
            className={className.trim()}
        />
    );
}
