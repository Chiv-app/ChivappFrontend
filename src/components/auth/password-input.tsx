"use client";

import { forwardRef, useState } from "react";
import { Input, type InputProps } from "@heroui/react";
import { Icon } from "@iconify/react";

export type PasswordInputProps = Omit<InputProps, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    function PasswordInput({ endContent, ...props }, ref) {
        const [isVisible, setIsVisible] = useState(false);

        const toggleVisibility = () => setIsVisible((prev) => !prev);

        return (
            <Input
                ref={ref}
                type={isVisible ? "text" : "password"}
                endContent={
                    <div className="flex items-center gap-1">
                        {endContent}
                        <button
                            type="button"
                            onClick={toggleVisibility}
                            aria-label={isVisible ? "Ocultar contraseña" : "Ver contraseña"}
                            className="text-default-400 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1 transition-colors"
                        >
                            <Icon
                                icon={
                                    isVisible
                                        ? "material-symbols:visibility-off-outline"
                                        : "material-symbols:visibility-outline"
                                }
                                className="text-xl"
                            />
                        </button>
                    </div>
                }
                {...props}
            />
        );
    },
);

PasswordInput.displayName = "PasswordInput";
