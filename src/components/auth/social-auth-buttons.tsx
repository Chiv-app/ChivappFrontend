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
                radius="md"
                size="lg"
                className="font-bold border-default-200/50 bg-transparent shadow-none text-foreground hover:bg-content2 transition-colors w-full"
                startContent={<Icon icon="logos:google-icon" width={18} />}
            >
                Continuar con Google
            </Button>
            
        </div>
    );
}


