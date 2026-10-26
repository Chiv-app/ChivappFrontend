"use client";

import dynamic from "next/dynamic";

const MusicianReportsView = dynamic(
    () => import("@/components/dashboard/musician-reports-view"),
    { ssr: false },
);

export default function MusicianReportsPage() {
    return <MusicianReportsView />;
}
