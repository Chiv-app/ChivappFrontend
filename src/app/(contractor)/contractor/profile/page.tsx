import ConnectedAccountsCard from "@/components/auth/connected-accounts-card";
import ContractorProfileEditor from "@/components/contractor/contractor-profile-editor";
import CalendarConnectionCard from "@/components/musician/calendar-connection-card";

export default function ContractorProfilePage() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <ContractorProfileEditor />
            <div className="w-full pb-10">
                <ConnectedAccountsCard />
                <CalendarConnectionCard />
            </div>
        </div>
    );
}



