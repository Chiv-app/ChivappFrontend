import PersonCalendar from "@/components/calendar/person-calendar";
import {
    AGENDA_SUB_NAV,
    DashboardModuleHeader,
} from "@/components/dashboard/dashboard-module-header";

export const metadata = { title: "Calendario" };

export default function MusicianCalendarPage() {
    return (
        <div className="w-full flex flex-col gap-4">
            <DashboardModuleHeader
                title="Calendario"
                subNav={AGENDA_SUB_NAV}
                subNavAriaLabel="Secciones de Agenda"
            />
            <PersonCalendar role="musician" />
        </div>
    );
}
