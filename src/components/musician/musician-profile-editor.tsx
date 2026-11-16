"use client";

import { Suspense, useEffect, useState } from "react";
import ConnectedAccountsCard from "@/components/auth/connected-accounts-card";
import CalendarConnectionCard from "@/components/musician/calendar-connection-card";
import MusicianProfileWizard from "@/components/musician/musician-profile-wizard";
import EnsembleMemberProfileEditor from "@/components/musician/ensemble-member-profile-editor";
import MyEnsemblesCard from "@/components/musician/my-ensembles-card";
import { getMusicianProfile } from "@/lib/profiles";
import type { MusicianProfileOut } from "@/types/api";

export default function MusicianProfileEditor() {
    const [profile, setProfile] = useState<MusicianProfileOut | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const data = await getMusicianProfile();
            setProfile(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(() => loadProfile());
    }, []);

    if (isLoading) {
        return (
            <div className="p-8">
                <div className="h-64 rounded-2xl bg-default-100 animate-pulse" />
            </div>
        );
    }

    if (!profile) {
        return <div className="p-8 text-center text-default-500">Error al cargar perfil.</div>;
    }

    // Si es un integrante que aún no convierte su perfil a pro
    if (profile.is_ensemble_only) {
        return (
            <div className="flex flex-col gap-6 pb-10">
                <MyEnsemblesCard />
                <EnsembleMemberProfileEditor
                    profile={profile}
                    onUpgradeToPro={() => {
                        // Recargar perfil para mostrar el wizard
                        void loadProfile();
                    }}
                />
                <div className="max-w-3xl mx-auto w-full px-4 md:px-0">
                    <Suspense fallback={null}>
                        <ConnectedAccountsCard />
                    </Suspense>
                    <CalendarConnectionCard />
                </div>
            </div>
        );
    }

    return <MusicianProfileWizard />;
}
