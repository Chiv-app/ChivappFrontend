import MusicianMembersView from "@/components/dashboard/musician-members-view";
import GroupOnlyGate from "@/components/musician/group-only-gate";

export default function MusicianMembersPage() {
    return (
        <GroupOnlyGate>
            <MusicianMembersView />
        </GroupOnlyGate>
    );
}
