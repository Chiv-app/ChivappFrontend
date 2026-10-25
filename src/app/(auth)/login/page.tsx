"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildAuthModalUrl } from "@/contexts/auth-modal-context";

/** Deep link / OAuth: redirige a la home abriendo el modal de login. */
export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        router.replace(
            buildAuthModalUrl("login", {
                redirect: searchParams.get("redirect"),
                oauthError:
                    searchParams.get("oauth_error") ||
                    searchParams.get("error"),
            }),
        );
    }, [router, searchParams]);

    return (
        <div className="w-full max-w-md h-80 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
    );
}
