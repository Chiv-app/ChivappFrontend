"use client";

import { useEffect, useState } from "react";
import MusicianProfileWizard from "@/components/musician/musician-profile-wizard";
import EnsembleMemberProfileEditor from "@/components/musician/ensemble-member-profile-editor";
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
        void loadProfile();
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
            <EnsembleMemberProfileEditor 
                profile={profile} 
                onUpgradeToPro={() => {
                    // Recargar perfil para mostrar el wizard
                    void loadProfile();
                }} 
            />
        );
    }

    return <MusicianProfileWizard />;
}
