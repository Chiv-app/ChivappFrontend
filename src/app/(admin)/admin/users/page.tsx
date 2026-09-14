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
import { formatDateTime } from "@/lib/date-utils";
import { getAdminUsers, updateAdminUser } from "@/lib/admin";
import { UI } from "@/lib/ui-classes";
import type { AdminUserOut } from "@/types/api";

const ROLE_LABELS: Record<string, string> = {
    musician: "Músico",
    contractor: "Contratista",
    admin: "Admin",
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUserOut[]>([]);
    const [q, setQ] = useState("");
    const [role, setRole] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminUsers({
                q: q.trim() || undefined,
                role: role || undefined,
                limit: 100,
            });
            setUsers(data);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [q, role]);

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
                                        isSelected={user.is_active !== false}
                                        isDisabled={busyId === user.id || user.role === "admin"}
                                        onValueChange={(value) =>
                                            patchUser(user.id, { is_active: value })
                                        }
                                    />
                                </TableCell>
                                <TableCell className="text-xs text-default-500">
                                    {formatDateTime(user.created_at)}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

