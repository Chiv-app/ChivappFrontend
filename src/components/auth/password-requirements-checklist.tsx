"use client";

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import {
    evaluatePasswordRules,
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_LENGTH,
} from "@/lib/password-rules";

type Props = {
    password: string;
    confirmPassword?: string;
    showMatch?: boolean;
    showStrengthBar?: boolean;
    className?: string;
};

export default function PasswordRequirementsChecklist({
    password,
    confirmPassword,
    showMatch = true,
    showStrengthBar = true,
    className = "",
}: Props) {
    const evaluation = useMemo(
        () => evaluatePasswordRules(password, confirmPassword),
        [password, confirmPassword],
    );

    const lengthValid = evaluation.minLength && evaluation.maxLength;
    const hasStartedTyping = password.length > 0;

    const requirements = [
        {
            key: "length",
            label: `Entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres (${password.length}/${MAX_PASSWORD_LENGTH})`,
            met: lengthValid,
        },
        {
            key: "casing",
            label: "Al menos una mayúscula y una minúscula",
            met: evaluation.hasUppercase && evaluation.hasLowercase,
        },
        {
            key: "number",
            label: "Al menos un número (0-9)",
            met: evaluation.hasNumber,
        },
        {
            key: "special",
            label: "Al menos un carácter especial (!@#$%...)",
            met: evaluation.hasSpecial,
        },
    ];

    if (showMatch && confirmPassword !== undefined) {
        requirements.push({
            key: "match",
            label: "Las contraseñas coinciden",
            met: evaluation.matchesConfirm,
        });
    }

    // Map color to tailwind class for strength bar
    const barColorClass =
        evaluation.strengthColor === "success"
            ? "bg-success"
            : evaluation.strengthColor === "primary"
              ? "bg-primary"
              : evaluation.strengthColor === "warning"
                ? "bg-warning"
                : "bg-danger";

    const progressWidth = `${(evaluation.score / 5) * 100}%`;

    return (
        <div className={`flex flex-col gap-2 rounded-xl border border-default-200/60 bg-default-50/50 p-2.5 sm:p-3 text-xs text-default-600 ${className}`}>
            {showStrengthBar && hasStartedTyping && (
                <div className="flex flex-col gap-1 mb-0.5">
                    <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-default-500">Seguridad:</span>
                        <span
                            className={
                                evaluation.strengthColor === "success"
                                    ? "text-success font-semibold"
                                    : evaluation.strengthColor === "primary"
                                      ? "text-primary font-semibold"
                                      : evaluation.strengthColor === "warning"
                                        ? "text-warning font-semibold"
                                        : "text-danger font-semibold"
                            }
                        >
                            {evaluation.strengthLabel}
                        </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-default-200">
                        <div
                            className={`h-full transition-all duration-300 ease-out ${barColorClass}`}
                            style={{ width: progressWidth }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {requirements.map((req) => (
                    <div
                        key={req.key}
                        className={`flex items-center gap-1.5 transition-colors ${
                            req.met
                                ? "text-success font-medium"
                                : hasStartedTyping
                                  ? "text-default-500"
                                  : "text-default-400"
                        }`}
                    >
                        <Icon
                            icon={
                                req.met
                                    ? "material-symbols:check-circle-rounded"
                                    : "material-symbols:radio-button-unchecked"
                            }
                            className={`text-sm shrink-0 ${
                                req.met ? "text-success" : "text-default-400"
                            }`}
                        />
                        <span>{req.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
