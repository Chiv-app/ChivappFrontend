"use client";

import Link from "next/link";
import { Button } from "@heroui/react";

export default function MusicianNotFound() {
    return (
        <div className="pt-8 pb-20 px-4 md:px-8">
            <div className="max-w-content mx-auto text-center py-20">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Músico no encontrado
                </h1>
                <p className="text-default-500 mb-8">
                    El perfil que buscas no existe o ya no está disponible.
                </p>
                <Button
                    as={Link}
                    href="/"
                    color="primary"
                    radius="lg"
                    className="font-semibold"
                >
                    Volver al inicio
                </Button>
            </div>
        </div>
    );
}
