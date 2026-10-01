import { Accordion, AccordionItem, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

export default function AccordionTest() {
    return (
        <Accordion variant="splitted" selectionMode="multiple">
            <AccordionItem
                key="1"
                startContent={
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-default-100 text-default-600">
                        <Icon icon="material-symbols:groups" width={20} />
                    </div>
                }
                title={
                    <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-foreground text-base">Integrantes del evento</span>
                        <Chip size="sm" variant="flat" color="default">0 activos • Opcional</Chip>
                    </div>
                }
                subtitle={<span className="text-xs text-default-500">Reparto y sincronizacin de mgsicos</span>}
            >
                <div className="p-4">Content here</div>
            </AccordionItem>
        </Accordion>
    );
}
