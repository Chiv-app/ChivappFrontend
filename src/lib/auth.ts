import { ApiError, apiFetch } from "@/lib/api";
import type { LoginRequest, RegisterRequest, TokenOut, UserOut } from "@/types/api";

export type OAuthAccountOut = {
    provider: string;
    email: string | null;
    linked: boolean;
};

export type OAuthAccountsOut = {
    accounts: OAuthAccountOut[];
    has_password: boolean;
};

export type OAuthPendingOut = {
    email: string | null;
    fullname: string;
    provider: string;
    picture_url: string | null;
};

export async function getCurrentUser(): Promise<UserOut | null> {
    try {
        return await apiFetch<UserOut>("/auth/me");
    } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            return null;
        }
        throw error;
    }
}

export async function loginUser(credentials: LoginRequest): Promise<UserOut> {
    await apiFetch<TokenOut>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
    });

    const user = await getCurrentUser();
    if (!user) {
        throw new Error("No se pudo obtener el usuario autenticado");
    }

    return user;
}

export async function registerUser(data: RegisterRequest): Promise<UserOut> {
    return apiFetch<UserOut>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function logoutUser(): Promise<void> {
    await apiFetch("/auth/logout", { method: "POST" });
}

const verifyEmailPromiseCache = new Map<
    string,
    Promise<{ message: string; email_verified: boolean }>
>();

export async function verifyEmail(token: string) {
    const existing = verifyEmailPromiseCache.get(token);
    if (existing) {
        return existing;
    }
    const request = apiFetch<{ message: string; email_verified: boolean }>(
        `/auth/verify-email/${encodeURIComponent(token)}`,
        { method: "POST" },
    ).catch((err) => {
        verifyEmailPromiseCache.delete(token);
        throw err;
    });
    verifyEmailPromiseCache.set(token, request);
    return request;
}

export async function resendVerificationEmail(email?: string) {
    return apiFetch<{ message: string; email_verified: boolean }>(
        "/auth/resend-verification",
        {
            method: "POST",
            ...(email ? { body: JSON.stringify({ email }) } : {}),
        },
    );
}

export async function forgotPassword(email: string) {
    return apiFetch<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export async function previewPasswordReset(token: string) {
    return apiFetch<{ email: string; fullname: string }>(
        `/auth/password-reset/${encodeURIComponent(token)}`,
    );
}

export async function resetPassword(token: string, password: string) {
    await apiFetch<UserOut>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
    });
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("No se pudo obtener el usuario autenticado");
    }
    return user;
}

export async function getOAuthPending(): Promise<OAuthPendingOut> {
    return apiFetch<OAuthPendingOut>("/auth/oauth/pending");
}

export async function completeOAuthRegistration(payload: {
    role: "musician" | "contractor";
    phone?: string | null;
}): Promise<UserOut> {
    await apiFetch<TokenOut>("/auth/oauth/complete", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("No se pudo obtener el usuario autenticado");
    }
    return user;
}

export async function getOAuthAccounts(): Promise<OAuthAccountsOut> {
    return apiFetch<OAuthAccountsOut>("/auth/oauth/accounts");
}

export async function unlinkOAuthAccount(provider: "google" | "facebook") {
    return apiFetch(`/auth/oauth/${provider}`, { method: "DELETE" });
}

export async function changePassword(payload: {
    current_password?: string;
    new_password: string;
}): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}


export type LoginStepOneResponse = {
    status: "not_found" | "requires_password" | "otp_sent";
    message?: string;
};

export async function loginStepOne(email: string): Promise<LoginStepOneResponse> {
    return apiFetch<LoginStepOneResponse>("/auth/login-step-one", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export async function loginOtp(email: string, otp: string): Promise<UserOut> {
    await apiFetch<TokenOut>("/auth/login-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
    });
    
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("No se pudo obtener el usuario autenticado");
    }
    return user;
}
