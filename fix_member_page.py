import re

path = "src/app/invite/member/[token]/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add password state
if "const [password, setPassword] = useState" not in content:
    content = content.replace(
        "const [isWorking, setIsWorking] = useState<\"accept\" | \"decline\" | null>(null);",
        "const [isWorking, setIsWorking] = useState<\"accept\" | \"decline\" | null>(null);\n    const [password, setPassword] = useState(\"\");"
    )

    # Need the Input component
    content = content.replace('import { Button, Card, CardBody, Chip, addToast } from "@heroui/react";', 'import { Button, Card, CardBody, Chip, Input, addToast } from "@heroui/react";')

# Update respond function
old_respond = """    async function respond(action: "accept" | "decline") {
        setIsWorking(action);
        try {
            const updated = await respondBookingMemberInvite(token, action);"""

new_respond = """    async function respond(action: "accept" | "decline") {
        if (action === "accept" && preview?.needs_password && password.length < 8) {
            addToast({
                title: "Contraseña inválida",
                description: "La contraseña debe tener al menos 8 caracteres.",
                color: "warning",
            });
            return;
        }
        setIsWorking(action);
        try {
            const updated = await respondBookingMemberInvite(token, action, action === "accept" && preview?.needs_password ? password : undefined);"""

content = content.replace(old_respond, new_respond)

# Add password input UI
old_render = """                        {preview.can_respond ? (
                            <div className="grid grid-cols-2 gap-3">"""

new_render = """                        {preview.can_respond ? (
                            <div className="flex flex-col gap-4">
                                {preview.needs_password && (
                                    <div className="bg-primary-50 text-primary-800 p-4 rounded-xl text-sm mb-2">
                                        <p className="font-semibold mb-2">Crea tu contraseña para aceptar</p>
                                        <p className="opacity-90 mb-4">Para confirmar tu asistencia y acceder a tu perfil en Chivapp, necesitas crear una contraseña.</p>
                                        <Input
                                            type="password"
                                            label="Nueva contraseña"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                            variant="bordered"
                                            color="primary"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">"""

content = content.replace(old_render, new_render)
content = content.replace("</div>\n                        ) : (", "</div>\n                            </div>\n                        ) : (")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
