import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PersonCalendar from "./person-calendar";
import type { CalendarEvent } from "@/lib/calendar";

const { getEvents, getBusy } = vi.hoisted(() => ({ getEvents: vi.fn(), getBusy: vi.fn() }));

vi.mock("@/lib/calendar", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/calendar")>();
    return { ...actual, getCalendarEvents: getEvents, getCalendarBusy: getBusy };
});

const wide = vi.hoisted(() => ({ value: true }));
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => wide.value }));

function iso(offsetDays: number, hour: number, minute = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    return {
        id: "booking:1",
        booking_id: "1",
        kind: "booking",
        role: "owner",
        state: "confirmed",
        title: "Boda",
        event_type: "Boda",
        start: iso(0, 18),
        end: iso(0, 20),
        city: "Lima",
        address: "Jr. Ayacucho 123",
        profile_id: "p1",
        profile_name: "Carlos Solista",
        synced: false,
        conflict: false,
        ...overrides,
    };
}

const connected = { connected: true, needs_reconnect: false, busy: [] };

describe("PersonCalendar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        wide.value = true;
        getEvents.mockResolvedValue([]);
        getBusy.mockResolvedValue(connected);
        Element.prototype.scrollIntoView = vi.fn();
    });

    it("empieza por la semana en pantalla ancha y por el día en celular", async () => {
        const first = render(<PersonCalendar role="musician" />);
        expect((await screen.findByRole("tab", { name: "Semana" })).getAttribute("aria-selected")).toBe("true");
        const calls = getEvents.mock.calls[0];
        expect(new Date(`${calls[1]}T00:00:00`).getTime() - new Date(`${calls[0]}T00:00:00`).getTime()).toBe(6 * 86_400_000);
        first.unmount();

        wide.value = false;
        render(<PersonCalendar role="musician" />);
        expect((await screen.findByRole("tab", { name: "Día" })).getAttribute("aria-selected")).toBe("true");
    });

    it("muestra los eventos con su estado, su perfil y su hora, de forma accesible", async () => {
        getEvents.mockResolvedValue([
            event(),
            event({ id: "booking:2", booking_id: "2", title: "Cumpleaños", state: "tentative", start: iso(0, 10), end: iso(0, 11), profile_name: "Los Hermanos" }),
        ]);
        render(<PersonCalendar role="musician" />);

        const confirmed = await screen.findByRole("button", { name: /Boda, 18:00 – 20:00, Confirmado, perfil Carlos Solista/ });
        expect(confirmed).toBeTruthy();
        expect(screen.getByRole("button", { name: /Cumpleaños, 10:00 – 11:00, Tentativo/ })).toBeTruthy();
        expect(screen.queryByText("No tienes eventos en este periodo. Cuando se confirme una reserva aparecerá aquí.")).toBeNull();
    });

    it("avisa cuando un evento se cruza con otro", async () => {
        getEvents.mockResolvedValue([event({ conflict: true }), event({ id: "booking:2", booking_id: "2", conflict: true, start: iso(0, 19), end: iso(0, 21) })]);
        render(<PersonCalendar role="musician" />);

        expect(await screen.findByText(/2 eventos se cruzan con otro/)).toBeTruthy();
        expect((await screen.findAllByRole("button", { name: /se cruza con otro compromiso/ })).length).toBe(2);
    });

    it("abre el detalle al tocar un evento y lo explica", async () => {
        getEvents.mockResolvedValue([event({ synced: true })]);
        const user = userEvent.setup();
        render(<PersonCalendar role="musician" />);

        await user.click(await screen.findByRole("button", { name: /Boda, 18:00/ }));

        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText("Confirmado")).toBeTruthy();
        expect(within(dialog).getByText(/pago de la reserva está retenido/)).toBeTruthy();
        expect(within(dialog).getByText("Jr. Ayacucho 123, Lima")).toBeTruthy();
        expect(within(dialog).getByText("Perfil: Carlos Solista")).toBeTruthy();
        expect(within(dialog).getByText("Ya está en tu Google Calendar.")).toBeTruthy();
        expect(within(dialog).getByRole("button", { name: "Ver mis reservas" }).getAttribute("href")).toBe("/musician/bookings");
    });

    it("al contratante lo lleva a sus propias reservas", async () => {
        getEvents.mockResolvedValue([event({ role: "contractor", profile_id: null, profile_name: null, title: "Boda con Carlos" })]);
        const user = userEvent.setup();
        render(<PersonCalendar role="contractor" />);

        await user.click(await screen.findByRole("button", { name: /Boda con Carlos/ }));
        expect((await screen.findByRole("button", { name: "Ver mis reservas" })).getAttribute("href")).toBe("/contractor/bookings");
    });

    it("con varios perfiles ofrece filtrarlos y oculta los que se apagan", async () => {
        getEvents.mockResolvedValue([
            event(),
            event({ id: "booking:2", booking_id: "2", title: "Quinceañero", profile_id: "p2", profile_name: "Los Hermanos", start: iso(0, 12), end: iso(0, 14) }),
        ]);
        const user = userEvent.setup();
        render(<PersonCalendar role="musician" />);
        await screen.findByRole("button", { name: /Quinceañero/ });

        const filter = screen.getByRole("button", { name: "Los Hermanos", pressed: true });
        await user.click(filter);

        await waitFor(() => expect(screen.queryByRole("button", { name: /Quinceañero/ })).toBeNull());
        expect(screen.getByRole("button", { name: /Boda, 18:00/ })).toBeTruthy();
        expect(filter.getAttribute("aria-pressed")).toBe("false");
    });

    it("cambia de vista y vuelve a pedir el rango correspondiente", async () => {
        const user = userEvent.setup();
        render(<PersonCalendar role="musician" />);
        await screen.findByRole("tab", { name: "Semana" });
        getEvents.mockClear();

        await user.click(screen.getByRole("tab", { name: "Mes" }));
        await waitFor(() => expect(getEvents).toHaveBeenCalledTimes(1));
        const [start, end] = getEvents.mock.calls[0];
        expect((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000).toBeGreaterThanOrEqual(27);
        expect(screen.getByRole("tab", { name: "Mes" }).getAttribute("aria-selected")).toBe("true");
    });

    it("navega al período anterior, siguiente y vuelve a hoy", async () => {
        const user = userEvent.setup();
        render(<PersonCalendar role="musician" />);
        await screen.findByRole("tab", { name: "Semana" });
        const first = getEvents.mock.calls[0][0] as string;

        await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
        await waitFor(() => expect(getEvents).toHaveBeenCalledTimes(2));
        const next = getEvents.mock.calls[1][0] as string;
        expect((new Date(`${next}T00:00:00`).getTime() - new Date(`${first}T00:00:00`).getTime()) / 86_400_000).toBe(7);

        await user.click(screen.getByRole("button", { name: "Hoy" }));
        await waitFor(() => expect(getEvents).toHaveBeenCalledTimes(3));
        expect(getEvents.mock.calls[2][0]).toBe(first);
    });

    it("invita a conectar Google si no hay cuenta, y a volver a conectar si falta el permiso", async () => {
        getBusy.mockResolvedValue({ connected: false, needs_reconnect: false, busy: [] });
        const first = render(<PersonCalendar role="musician" />);
        expect(await screen.findByText(/Conecta tu Google Calendar/)).toBeTruthy();
        expect(screen.getByRole("button", { name: "Conectar" }).getAttribute("href")).toBe("/musician/profile");
        first.unmount();

        getBusy.mockResolvedValue({ connected: true, needs_reconnect: true, busy: [] });
        render(<PersonCalendar role="musician" />);
        expect(await screen.findByText(/vuelve a conectar Google Calendar/)).toBeTruthy();
        expect(screen.queryByText("Ocupado en Google")).toBeNull();
    });

    it("sigue funcionando si las horas de Google fallan", async () => {
        getBusy.mockRejectedValue(new Error("Google caído"));
        getEvents.mockResolvedValue([event()]);
        render(<PersonCalendar role="musician" />);

        expect(await screen.findByRole("button", { name: /Boda, 18:00/ })).toBeTruthy();
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("muestra las horas ocupadas en Google con su leyenda", async () => {
        getBusy.mockResolvedValue({ connected: true, needs_reconnect: false, busy: [{ start: iso(0, 9), end: iso(0, 10, 30) }] });
        render(<PersonCalendar role="musician" />);

        expect(await screen.findByText("Ocupado en Google")).toBeTruthy();
        expect(await screen.findByTitle("Ocupado en tu Google Calendar")).toBeTruthy();
    });

    it("si no se pueden cargar los eventos, ofrece reintentar", async () => {
        getEvents.mockRejectedValueOnce(new Error("sin red"));
        const user = userEvent.setup();
        render(<PersonCalendar role="musician" />);

        expect(await screen.findByRole("alert")).toBeTruthy();
        getEvents.mockResolvedValue([event()]);
        await user.click(screen.getByRole("button", { name: "Reintentar" }));
        expect(await screen.findByRole("button", { name: /Boda, 18:00/ })).toBeTruthy();
    });

    it("sin eventos lo dice con claridad", async () => {
        render(<PersonCalendar role="musician" />);
        expect(await screen.findByText("No tienes eventos en este periodo. Cuando se confirme una reserva aparecerá aquí.")).toBeTruthy();
    });
});
