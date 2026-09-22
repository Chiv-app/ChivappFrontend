import re

path = "src/app/(admin)/admin/contractors/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacement = """    async function openDetail(id: string) {
        try {
            setSelected(await getContractorAdminDetail(id));
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error: any) {
            addToast({ title: "Error al cargar detalle", description: error.message, color: "danger" });
        }
    }"""

content = re.sub(
    r"\s*async function openDetail\(id: string\) \{.*?\n\s*\}",
    "\n" + replacement,
    content,
    flags=re.DOTALL
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
