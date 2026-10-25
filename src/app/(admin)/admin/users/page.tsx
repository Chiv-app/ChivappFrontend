"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Button,
    Chip,
    Input,
    Select,
    SelectItem,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    addToast,
} from "@heroui/react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { formatDateTime } from "@/lib/date-utils";
import { getAdminUsers, updateAdminUser } from "@/lib/admin";
import { UI } from "@/lib/ui-classes";
import type { AdminUserOut } from "@/types/api";

const ROLE_LABELS: Record<string, string> = {
    musician: "Músico",
    contractor: "Contratista",
    admin: "Admin",
};

const PAGE_SIZE = 100;

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUserOut[]>([]);
    const [q, setQ] = useState("");
    const [role, setRole] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [suspendTarget, setSuspendTarget] = useState<AdminUserOut | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await getAdminUsers({
                q: q.trim() || undefined,
                role: role || undefined,
                skip: 0,
                limit: PAGE_SIZE,
            });
            setUsers(data);
            setHasMore(data.length === PAGE_SIZE);
        } catch (err) {
            setUsers([]);
            setHasMore(false);
            setLoadError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron cargar los usuarios.",
            );
        } finally {
            setLoading(false);
        }
    }, [q, role]);

    async function loadMore() {
        setLoadingMore(true);
        try {
            const data = await getAdminUsers({
                q: q.trim() || undefined,
                role: role || undefined,
                skip: users.length,
                limit: PAGE_SIZE,
            });
            setUsers((current) => [...current, ...data]);
            setHasMore(data.length === PAGE_SIZE);
        } catch (err) {
            addToast({
                title: "No se pudieron cargar más usuarios",
                description: err instanceof Error ? err.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setLoadingMore(false);
        }
    }

    useEffect(() => {
        const t = window.setTimeout(() => {
            void load();
        }, 250);
        return () => window.clearTimeout(t);
    }, [load]);

    async function patchUser(
        userId: string,
        payload: { is_verified?: boolean; is_active?: boolean },
    ) {
        setBusyId(userId);
        try {
            const updated = await updateAdminUser(userId, payload);
            setUsers((current) =>
                current.map((user) => (user.id === userId ? updated : user)),
            );
            addToast({ title: "Usuario actualizado", color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo actualizar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Usuarios y acceso"
                description="Busca cuentas, verifica identidad y suspende accesos sin tocar el resto del sistema."
            />

            {loadError ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-danger">
                            Error al cargar los usuarios
                        </p>
                        <p className="text-xs text-default-600">{loadError}</p>
                    </div>
                    <Button size="sm" color="danger" variant="flat" onPress={load}>
                        Reintentar
                    </Button>
                </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3">
                <Input
                    label="Buscar"
                    placeholder="Nombre o email"
                    value={q}
                    onValueChange={setQ}
                    variant="bordered"
                    className="flex-1"
                />
                <Select
                    label="Rol"
                    selectedKeys={role ? new Set([role]) : new Set(["all"])}
                    onSelectionChange={(keys) => {
                        if (keys === "all") return;
                        const value = Array.from(keys)[0]?.toString() ?? "all";
                        setRole(value === "all" ? "" : value);
                    }}
                    variant="bordered"
                    className="sm:w-56"
                >
                    <SelectItem key="all">Todos</SelectItem>
                    <SelectItem key="musician">Músicos</SelectItem>
                    <SelectItem key="contractor">Contratistas</SelectItem>
                    <SelectItem key="admin">Admins</SelectItem>
                </Select>
                <Button color="primary" radius="lg" className="sm:self-end" onPress={load}>
                    Actualizar
                </Button>
            </div>

            <div className={UI.tablePanel}>
                <Table
                    aria-label="Usuarios"
                    removeWrapper
                    classNames={{ base: "min-w-[640px]" }}
                >
                    <TableHeader>
                        <TableColumn>Usuario</TableColumn>
                        <TableColumn>Rol</TableColumn>
                        <TableColumn>Estado</TableColumn>
                        <TableColumn>Verificado</TableColumn>
                        <TableColumn>Activo</TableColumn>
                        <TableColumn>Origen</TableColumn>
                        <TableColumn>Registro</TableColumn>
                    </TableHeader>
                    <TableBody
                        emptyContent={loading ? "Cargando…" : "Sin usuarios"}
                        isLoading={loading}
                        items={users}
                    >
                        {(user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {user.fullname || "-"}
                                        </p>
                                        <p className="text-xs text-default-500">
                                            {user.email}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Chip size="sm" variant="flat">
                                        {ROLE_LABELS[user.role] ?? user.role}
                                    </Chip>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="sm"
                                        color={user.is_active === false ? "danger" : "success"}
                                        variant="flat"
                                    >
                                        {user.is_active === false ? "Suspendido" : "Activo"}
                                    </Chip>
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        size="sm"
                                        aria-label={`Verificar a ${user.fullname || user.email}`}
                                        isSelected={user.is_verified}
                                        isDisabled={busyId === user.id || user.role === "admin"}
                                        onValueChange={(value) =>
                                            patchUser(user.id, { is_verified: value })
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        size="sm"
                                        color="danger"
                                        aria-label={`Activar o suspender a ${user.fullname || user.email}`}
                                        isSelected={user.is_active !== false}
                                        isDisabled={busyId === user.id || user.role === "admin"}
                                        onValueChange={(value) => {
                                            if (!value) {
                                                setSuspendTarget(user);
                                            } else {
                                                void patchUser(user.id, { is_active: true });
                                            }
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="sm"
                                        variant="flat"
                                        color={user.registration_type === "google" ? "primary" : "secondary"}
                                    >
                                        {user.registration_type === "google" ? "Google" : "Chivapp"}
                                    </Chip>
                                </TableCell>
                                <TableCell className="text-xs text-default-500">
                                    {formatDateTime(user.created_at)}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {hasMore && !loading ? (
                <div className="flex justify-center">
                    <Button
                        variant="flat"
                        color="primary"
                        radius="lg"
                        isLoading={loadingMore}
                        onPress={loadMore}
                    >
                        Cargar más ({users.length} mostrados)
                    </Button>
                </div>
            ) : null}

            <ConfirmDialog
                isOpen={suspendTarget != null}
                onOpenChange={(open) => {
                    if (!open) setSuspendTarget(null);
                }}
                title="¿Suspender acceso del usuario?"
                description={`Se suspenderá el acceso de ${suspendTarget?.fullname || suspendTarget?.email || "este usuario"} a la plataforma.`}
                confirmLabel="Suspender cuenta"
                color="danger"
                isLoading={busyId != null && busyId === suspendTarget?.id}
                onConfirm={async () => {
                    if (!suspendTarget) return;
                    const targetId = suspendTarget.id;
                    await patchUser(targetId, { is_active: false });
                    setSuspendTarget(null);
                }}
            />
        </div>
    );
}
