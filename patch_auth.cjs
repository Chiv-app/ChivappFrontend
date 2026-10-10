const fs = require('fs');

let content = fs.readFileSync('src/lib/auth.ts', 'utf8');

const newFunctions = `
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
`;

content = content + newFunctions;
fs.writeFileSync('src/lib/auth.ts', content);
