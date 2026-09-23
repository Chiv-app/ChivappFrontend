import type { UserRole } from "./enums";

export type LoginRequest = {
    email: string;
    password: string;
};

export type RegisterRequest = {
    email: string;
    password: string;
    fullname?: string | null;
    username?: string | null;
    role: UserRole;
    phone?: string | null;
    accepted_terms: boolean;
};

export type TokenOut = {
    access_token: string;
    token_type: "bearer";
};

export type UserOut = {
    id: string;
    email: string;
    username?: string | null;
    fullname?: string | null;
    role: UserRole;
    phone: string | null;
    profile_picture_url: string | null;
    is_verified: boolean;
    is_active?: boolean;
    is_email_verified?: boolean;
    has_connected_calendar?: boolean;
    has_password?: boolean;
    /** Integrante de alguna agrupación (puede ver Reservas en solo lectura) */
    is_ensemble_member?: boolean;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
};



