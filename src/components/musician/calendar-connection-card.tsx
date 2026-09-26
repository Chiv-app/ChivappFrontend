"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export default function CalendarConnectionCard() {
    const { user, refresh } = useAuth();
    const [loading, setLoading] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const isConnected = user?.has_connected_calendar;

    async function handleConnect() {
        setLoading(true);
        try {
            const res = await apiFetch<{auth_url: string}>('/calendar-auth/url');
            if (res && res.auth_url) {
                window.location.href = res.auth_url;
            } else {
                throw new Error("No se recibio URL de Google");
            }
        } catch (error) {
            addToast({
                title: "Error de conexión",
                description: "No se pudo iniciar la conexión con Google Calendar.",
                color: "danger",
            });
            setLoading(false);
        }
    }

    async function handleDisconnect() {
        setDisconnecting(true);
        try {
            await apiFetch('/calendar-auth/disconnect', { method: "DELETE" });
            await refresh();
            addToast({
                title: "Calendario desvinculado",
                description: "Ya no se sincronizarán nuevas reservas.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "Error al desvincular",
                description: "Ocurrió un error al intentar desconectar Google Calendar.",
                color: "danger",
            });
        } finally {
            setDisconnecting(false);
        }
    }

    return (
        <Card className="border border-default-200/70 shadow-soft mt-6">
            <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
                <h2 className="text-lg font-bold text-foreground">Google Calendar (Agendas)</h2>
                <p className="text-sm text-default-500">
                    Conecta tu calendario para sincronizar automáticamente las agendas de tus eventos pagados y enviarlas a tus integrantes.
                </p>
            </CardHeader>
            <CardBody className="gap-3 px-6 pb-6">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-default-200 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Icon icon="logos:google-calendar" width={22} />
                        <div className="min-w-0 flex items-center gap-2">
                            <p className="font-semibold text-foreground">Google Calendar</p>
                            {isConnected && (
                                <Chip size="sm" color="success" variant="flat">
                                    Conectado
                                </Chip>
                            )}
                        </div>
                    </div>
                    
                    {!isConnected && (
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
                    )}
                    {isConnected && (
                        <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            radius="lg"
                            isLoading={disconnecting}
                            onPress={handleDisconnect}
                        >
                            Desvincular
                        </Button>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}



