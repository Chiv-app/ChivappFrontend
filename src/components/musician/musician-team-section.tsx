import Link from "next/link";
import { Icon } from "@iconify/react";
import type { PublicGroupLink, PublicTeamMember } from "@/types/api";

const HEADING = "text-3xl font-bold text-foreground mb-6 tracking-tight";
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

type Props = {
    members: PublicTeamMember[];
    playsWith: PublicGroupLink[];
};

/**
 * Equipo del grupo y grupos en los que toca un solista. El enlace a su perfil profesional es discreto:
 * un texto chico bajo el nombre, solo cuando esa persona tiene un perfil de solista publicado.
 */
export default function MusicianTeamSection({ members, playsWith }: Props) {
    if (members.length === 0 && playsWith.length === 0) return null;

    return (
        <>
            {members.length > 0 ? (
                <section data-preview="team">
                    <h2 className={HEADING}>Integrantes</h2>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {members.map((member) => (
                            <li key={`${member.name}-${member.profile_slug ?? ""}`} className="flex items-start gap-3 rounded-2xl border border-default-200/70 bg-content1 p-4">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                                    <Icon icon="mdi:account-music-outline" width={22} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground">{member.name}</p>
                                    {member.specialties.length > 0 ? <p className="text-sm text-default-500">{member.specialties.join(", ")}</p> : null}
                                    {member.profile_slug ? (
                                        <Link
                                            href={`/musicians/${member.profile_slug}`}
                                            className={`${FOCUS_RING} mt-1 inline-flex min-h-6 items-center gap-1 text-xs text-primary-text underline-offset-2 hover:underline`}
                                        >
                                            <Icon icon="mdi:link-variant" width={14} aria-hidden="true" />
                                            Perfil profesional
                                            <span className="sr-only"> de {member.name}</span>
                                        </Link>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
            {playsWith.length > 0 ? (
                <section data-preview="plays-with">
                    <h2 className={HEADING}>Toca con</h2>
                    <ul className="flex flex-wrap gap-2.5">
                        {playsWith.map((group) => (
                            <li key={group.slug}>
                                <Link
                                    href={`/musicians/${group.slug}`}
                                    className={`${FOCUS_RING} inline-flex min-h-11 items-center gap-2 rounded-full border border-default-200/70 bg-content1 px-4 py-2 text-sm font-medium text-default-700 transition hover:border-primary-text motion-reduce:transition-none`}
                                >
                                    <Icon icon="mdi:account-group-outline" width={18} aria-hidden="true" />
                                    {group.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </>
    );
}
