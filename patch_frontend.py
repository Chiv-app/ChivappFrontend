import sys

file_path = 'src/lib/ensemble-members.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_functions = """
export function listMyEnsembleInvites(): Promise<EnsembleMemberOut[]> {
    return apiFetch("/musician/my-ensemble-invites");
}

export function respondEnsembleInvite(
    id: string,
    action: "accept" | "decline"
): Promise<EnsembleMemberOut> {
    return apiFetch(`/musician/my-ensemble-invites/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
    });
}
"""

with open(file_path, 'a', encoding='utf-8') as f:
    f.write(new_functions)
