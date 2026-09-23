"use client";

import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";

type Props = {
    intent?: "login" | "link";
    className?: string;
};

function oauthStartUrl(provider: "google" | "facebook", intent: "login" | "link") {
    const base = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    return `${base}/auth/oauth/${provider}/start?intent=${intent}`;
}

export default function SocialAuthButtons({
    intent = "login",
    className = "",
}: Props) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <Button
                as="a"
                href={oauthStartUrl("google", intent)}
                variant="bordered"
                radius="lg"
                className="font-semibold border-default-300"
                startContent={<Icon icon="logos:google-icon" width={18} />}
            >
                Continuar con Google
            </Button>
            
        </div>
    );
}


