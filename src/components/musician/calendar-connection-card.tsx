"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { apiClient } from "@/lib/api";

export default function CalendarConnectionCard() {
    const [loading, setLoading] = useState(false);

    async function handleConnect() {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/v1/calendar-auth/url');
            if (res.data && res.data.auth_url) {
                window.location.href = res.data.auth_url;
            } else {
                throw new Error("No se recibio URL de Google");
            }
        } catch (error) {
            addToast({
                title: "Error de conexin",
                description: "No se pudo iniciar la conexin con Google Calendar.",
                color: "danger",
            });
            setLoading(false);
        }
    }

    return (
        <Card className="border border-default-200/70 shadow-soft mt-6">
            <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
                <h2 className="text-lg font-bold text-foreground">Google Calendar (Agendas)</h2>
                <p className="text-sm text-default-500">
                    Conecta tu calendario para sincronizar automticamente las agendas de tus eventos pagados y enviarlas a tus integrantes.
                </p>
            </CardHeader>
            <CardBody className="gap-3 px-6 pb-6">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-default-200 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Icon icon="logos:google-calendar" width={22} />
                        <div className="min-w-0">
                            <p className="font-semibold text-foreground">Google Calendar</p>
                            <p className="text-xs text-default-500 truncate">
                                Sincronizacin de Agendas
                            </p>
                        </div>
                    </div>
                    
                    <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        radius="lg"
                        isLoading={loading}
                        onPress={handleConnect}
                    >
                        Conectar
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}
