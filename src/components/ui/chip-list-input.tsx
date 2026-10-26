"use client";

import { useState } from "react";
import { Button, Chip, Input } from "@heroui/react";
import { Icon } from "@iconify/react";

type Suggestion = {
    label: string;
    icon?: string;
};

type Props = {
    label: string;
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    suggestions?: Suggestion[];
};

export default function ChipListInput({
    label,
    values,
    onChange,
    placeholder = "Escribe y presiona Enter",
    suggestions = [],
}: Props) {
    const [draft, setDraft] = useState("");

    function addValue(raw?: string) {
        const trimmed = (raw ?? draft).trim();
        if (!trimmed || values.includes(trimmed)) return;
        onChange([...values, trimmed]);
        setDraft("");
    }

    const availableSuggestions = suggestions.filter(
        (item) => !values.includes(item.label),
    );

    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <div className="flex gap-2">
                <Input
                    aria-label={label}
                    value={draft}
                    onValueChange={setDraft}
                    placeholder={placeholder}
                    variant="bordered"
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            addValue();
                        }
                    }}
                />
                <Button radius="lg" variant="flat" onPress={() => addValue()}>
                    Agregar
                </Button>
            </div>

            {availableSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {availableSuggestions.map((item) => (
                        <Button
                            key={item.label}
                            size="sm"
                            variant="bordered"
                            radius="full"
                            className="h-8 min-w-0 px-3 text-xs font-medium"
                            onPress={() => addValue(item.label)}
                            startContent={
                                item.icon ? (
                                    <Icon icon={item.icon} width={14} />
                                ) : undefined
                            }
                        >
                            {item.label}
                        </Button>
                    ))}
                </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                    const suggestion = suggestions.find((item) => item.label === value);

                    return (
                        <Chip
                            key={value}
                            onClose={() =>
                                onChange(values.filter((item) => item !== value))
                            }
                            variant="flat"
                            startContent={
                                suggestion?.icon ? (
                                    <Icon icon={suggestion.icon} width={14} />
                                ) : undefined
                            }
                        >
                            {value}
                        </Chip>
                    );
                })}
            </div>
        </div>
    );
}
