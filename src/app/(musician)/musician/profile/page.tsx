import ConnectedAccountsCard from "@/components/auth/connected-accounts-card";
import MusicianProfileEditor from "@/components/musician/musician-profile-editor";
import CalendarConnectionCard from "@/components/musician/calendar-connection-card";

export default function MusicianProfilePage() {
    return (
        <div className="flex flex-col gap-6">
            <MusicianProfileEditor />
            <div className="max-w-3xl mx-auto w-full px-4 md:px-0 pb-10">
                <ConnectedAccountsCard />
                <CalendarConnectionCard />
            </div>
        </div>
    );
}
