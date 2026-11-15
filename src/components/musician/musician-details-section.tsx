import { Icon } from "@iconify/react";
import { type ProfileDetails, type ProfileKind, eventLabels, showRows } from "@/lib/profile-details";

type Props = {
    details: ProfileDetails;
    kind: ProfileKind;
};

const HEADING = "text-3xl font-bold text-foreground mb-6 tracking-tight";

/** «Eventos que anima» y «Sobre el show»: solo se dibujan las partes que el artista completó. */
export default function MusicianDetailsSection({ details, kind }: Props) {
    const events = eventLabels(details);
    const rows = showRows(details, kind);
    if (events.length === 0 && rows.length === 0) return null;

    return (
        <>
            {events.length > 0 ? (
                <section data-preview="events">
                    <h2 className={HEADING}>Eventos que anima</h2>
                    <ul className="flex flex-wrap gap-2.5">
                        {events.map((label) => (
                            <li key={label} className="rounded-full border border-default-200/70 bg-content1 px-4 py-2 text-sm text-default-700">
                                {label}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
            {rows.length > 0 ? (
                <section data-preview="show">
                    <h2 className={HEADING}>Sobre el show</h2>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        {rows.map((row) => (
                            <div key={row.key} className="flex items-start gap-3 rounded-2xl border border-default-200/70 bg-content1 p-4">
                                <Icon icon={row.icon} width={22} className="mt-0.5 shrink-0 text-primary-text" aria-hidden="true" />
                                <div>
                                    <dt className="text-xs font-semibold text-default-500">{row.label}</dt>
                                    <dd className="mt-0.5 text-sm text-foreground">{row.value}</dd>
                                </div>
                            </div>
                        ))}
                    </dl>
                </section>
            ) : null}
        </>
    );
}
