import re

with open("src/components/home/stats-view.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add Card imports
if "Card" not in content:
    content = content.replace(
        'import type { PlatformStatsOut } from "@/types/api";',
        'import type { PlatformStatsOut } from "@/types/api";\nimport { Card, CardBody } from "@heroui/react";'
    )

old_stat = """<div
                            key={item.label}
                            className="flex flex-col items-center text-center gap-2 sm:gap-3"
                        >
                            <div className="flex size-11 sm:size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                                <Icon icon={item.icon} width={24} height={24} />
                            </div>
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums leading-none text-foreground">
                                {item.value}
                            </div>
                            <div className="text-sm text-default-500 font-medium">
                                {item.label}
                            </div>
                        </div>"""

new_stat = """<Card
                            key={item.label}
                            shadow="sm"
                            className="border border-default-200/60 bg-content1/50 backdrop-blur-md"
                        >
                            <CardBody className="flex flex-col items-center text-center gap-2 sm:gap-3 p-6 sm:p-8">
                                <div className="flex size-11 sm:size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                                    <Icon icon={item.icon} width={24} height={24} />
                                </div>
                                <div className="text-3xl sm:text-4xl font-bold tabular-nums leading-none text-foreground">
                                    {item.value}
                                </div>
                                <div className="text-sm text-default-500 font-medium">
                                    {item.label}
                                </div>
                            </CardBody>
                        </Card>"""

content = content.replace(old_stat, new_stat)

with open("src/components/home/stats-view.tsx", "w", encoding="utf-8") as f:
    f.write(content)
