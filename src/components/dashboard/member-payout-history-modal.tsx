"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  addToast,
  Card,
  CardBody,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  BOOKING_STATUS_LABELS,
  formatBookingDate,
  formatCurrency,
} from "@/lib/booking-labels";
import { getMemberPayoutHistory } from "@/lib/ensemble-members";
import type {
  BookingStatus,
  EnsembleMemberOut,
  MemberPayoutHistoryItem,
  MemberPayoutHistoryOut,
} from "@/types/api";

type Props = {
  member: EnsembleMemberOut | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

type StatusFilter = "all" | "paid" | "locked" | "draft";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  locked: "Confirmado",
  paid: "Pagado",
};

export default function MemberPayoutHistoryModal({
  member,
  isOpen,
  onOpenChange,
}: Props) {
  const [data, setData] = useState<MemberPayoutHistoryOut | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!isOpen || !member) return;
    let cancelled = false;
    setIsLoading(true);
    setFilter("all");
    getMemberPayoutHistory(member.id)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => {
        if (cancelled) return;
        addToast({
          title: "No se pudo cargar el historial",
          description:
            error instanceof Error ? error.message : "Intenta de nuevo.",
          color: "danger",
        });
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, member]);

  const items =
    data?.items.filter((item) =>
      filter === "all" ? true : item.status === filter,
    ) ?? [];

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="3xl"
      scrollBehavior="inside"
      backdrop="blur"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span>Historial de {member?.fullname ?? "integrante"}</span>
              <span className="text-sm font-normal text-default-500">
                Pagos asignados, confirmados y pagados por evento.
              </span>
            </ModalHeader>
            <ModalBody className="gap-5">
              {isLoading ? (
                <div className="h-40 rounded-3xl bg-default-100 animate-pulse" />
              ) : !data ? (
                <p className="text-sm text-default-500">
                  No hay información disponible.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Shows",
                        value: String(data.shows_count),
                      },
                      {
                        label: "Asignado",
                        value: formatCurrency(Number(data.total_assigned)),
                      },
                      {
                        label: "Pendiente",
                        value: formatCurrency(Number(data.total_pending)),
                      },
                      {
                        label: "Pagado",
                        value: formatCurrency(Number(data.total_paid)),
                      },
                    ].map((card) => (
                      <Card
                        key={card.label}
                        shadow="none"
                        className="border border-default-200 bg-default-50/70"
                      >
                        <CardBody className="px-3 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-default-400">
                            {card.label}
                          </p>
                          <p className="mt-1 font-bold text-foreground">
                            {card.value}
                          </p>
                        </CardBody>
                      </Card>
                    ))}
                  </div>

                  <Tabs
                    selectedKey={filter}
                    onSelectionChange={(key) => setFilter(key as StatusFilter)}
                    size="sm"
                    variant="solid"
                    color="secondary"
                  >
                    <Tab key="all" title="Todos" />
                    <Tab key="paid" title="Pagados" />
                    <Tab key="locked" title="Confirmados" />
                    <Tab key="draft" title="Borrador" />
                  </Tabs>

                  {items.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-default-300 px-4 py-10 text-center">
                      <Icon
                        icon="material-symbols:payments"
                        width={32}
                        className="mx-auto text-default-400"
                      />
                      <p className="mt-2 font-medium">
                        Sin pagos en este filtro
                      </p>
                      <p className="text-sm text-default-500 mt-1">
                        Cuando asignes montos a este integrante aparecerán aquí.
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {items.map((item) => (
                        <HistoryRow key={item.payout_id} item={item} />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" radius="lg" onPress={onClose}>
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function HistoryRow({ item }: { item: MemberPayoutHistoryItem }) {
  return (
    <Card as="li" shadow="none" className="border border-default-200">
      <CardBody className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold truncate">{item.event_type}</p>
            <Chip
              size="sm"
              variant="flat"
              color={
                item.status === "paid"
                  ? "success"
                  : item.status === "locked"
                    ? "secondary"
                    : "default"
              }
            >
              {STATUS_LABEL[item.status] || item.status}
            </Chip>
          </div>
          <p className="text-sm text-default-500 mt-1">
            {formatBookingDate(item.event_date)}
            {item.location_city ? ` · ${item.location_city}` : ""}
            {" · "}
            {BOOKING_STATUS_LABELS[item.booking_status as BookingStatus] ||
              item.booking_status}
          </p>
          {item.note ? (
            <p className="text-xs text-default-500 mt-1 line-clamp-2">
              Nota: {item.note}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="font-bold">{formatCurrency(Number(item.amount))}</p>
          <Button
            as={Link}
            href={`/musician/bookings/${item.booking_id}`}
            size="sm"
            variant="flat"
            radius="lg"
          >
            Ver
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
