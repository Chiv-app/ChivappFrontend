"use client";

import React from "react";
import { Icon } from "@iconify/react";

export function ModalCloseButton(
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
    return (
        <button {...props} type="button" aria-label="Cerrar">
            {props.children ?? (
                <Icon
                    icon="material-symbols:close"
                    width={18}
                    aria-hidden="true"
                />
            )}
        </button>
    );
}
