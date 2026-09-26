export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;

export type PasswordEvaluation = {
    minLength: boolean;
    maxLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    matchesConfirm: boolean;
    isValid: boolean;
    score: number; // 0 to 5
    strengthLabel: "Muy débil" | "Débil" | "Media" | "Fuerte" | "Muy fuerte";
    strengthColor: "danger" | "warning" | "primary" | "success";
};

export function evaluatePasswordRules(
    password: string,
    confirmPassword?: string,
): PasswordEvaluation {
    const minLength = password.length >= MIN_PASSWORD_LENGTH;
    const maxLength = password.length <= MAX_PASSWORD_LENGTH && password.length > 0;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

    const matchesConfirm =
        confirmPassword !== undefined
            ? confirmPassword.length > 0 && password === confirmPassword
            : true;

    // Rules that contribute to password complexity (out of 5)
    let score = 0;
    if (minLength && maxLength) score += 1;
    if (hasUppercase) score += 1;
    if (hasLowercase) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;

    let strengthLabel: PasswordEvaluation["strengthLabel"] = "Muy débil";
    let strengthColor: PasswordEvaluation["strengthColor"] = "danger";

    if (password.length === 0) {
        strengthLabel = "Muy débil";
        strengthColor = "danger";
    } else if (score <= 2) {
        strengthLabel = "Débil";
        strengthColor = "danger";
    } else if (score === 3) {
        strengthLabel = "Media";
        strengthColor = "warning";
    } else if (score === 4) {
        strengthLabel = "Fuerte";
        strengthColor = "primary";
    } else if (score === 5) {
        strengthLabel = "Muy fuerte";
        strengthColor = "success";
    }

    const isValid =
        minLength &&
        maxLength &&
        hasUppercase &&
        hasLowercase &&
        hasNumber &&
        hasSpecial &&
        matchesConfirm;

    return {
        minLength,
        maxLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecial,
        matchesConfirm,
        isValid,
        score,
        strengthLabel,
        strengthColor,
    };
}
