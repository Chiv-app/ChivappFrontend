import sys
import re

file_path = 'src/components/booking/booking-ensemble-panel.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new imports
new_imports = """
import {
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@heroui/react";
import ChipListInput from "@/components/ui/chip-list-input";
import { COMMON_INSTRUMENTS } from "@/lib/instrument-icons";
import { createEnsembleMember } from "@/lib/ensemble-members";
import { ApiError } from "@/lib/api";
"""
content = content.replace('import { Icon } from "@iconify/react";', 'import { Icon } from "@iconify/react";\n' + new_imports)

# 2. Add state and logic for new member
state_code = """    const [workingId, setWorkingId] = useState<string | null>(null);

    // New member form
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCreatingMember, setIsCreatingMember] = useState(false);
    const [newMemberForm, setNewMemberForm] = useState({
        fullname: "",
        email: "",
        phone: "",
        specialties: [] as string[],
    });

    async function handleCreateAndInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!newMemberForm.fullname.trim() || !newMemberForm.email.trim()) {
            addToast({ title: "Completa nombre y correo", color: "warning" });
            return;
        }
        if (newMemberForm.specialties.length === 0) {
            addToast({ title: "Agrega al menos una especialidad", color: "warning" });
            return;
        }

        setIsCreatingMember(true);
        try {
            // 1. Crear el integrante (envía email de invitación a la agrupación)
            const created = await createEnsembleMember({
                fullname: newMemberForm.fullname.trim(),
                email: newMemberForm.email.trim(),
                phone: newMemberForm.phone.trim() || null,
                specialties: newMemberForm.specialties,
                notes: null,
            });

            // 2. Invitar al evento automáticamente
            const createdInvites = await createBookingMemberInvites(booking.id, [created.id]);

            // 3. Actualizar estado
            setMembers((prev) => [created, ...prev]);
            setInvites((prev) => {
                const map = new Map(prev.map((i) => [i.ensemble_member_id, i]));
                for (const row of createdInvites) map.set(row.ensemble_member_id, row);
                return Array.from(map.values());
            });

            addToast({
                title: "Integrante creado e invitado",
                description: "Se le ha enviado un correo para configurar su cuenta.",
                color: "success",
            });
            setIsFormOpen(false);
            setNewMemberForm({ fullname: "", email: "", phone: "", specialties: [] });
        } catch (error) {
            addToast({
                title: "No se pudo crear/invitar",
                description: error instanceof ApiError ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsCreatingMember(false);
        }
    }
"""
content = content.replace('    const [workingId, setWorkingId] = useState<string | null>(null);', state_code)

# 3. Add button in UI and the Modal
button_code = """
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 flex flex-col gap-3">
                                <Button
                                    variant="flat"
                                    color="primary"
                                    className="self-start"
                                    startContent={<Icon icon="lucide:plus" width={18} />}
                                    onPress={() => setIsFormOpen(true)}
                                >
                                    Crear e invitar integrante
                                </Button>
                                {selectable.length > 0 ? (
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectable.map((m) => (
"""
content = content.replace('                        <div className="flex flex-col sm:flex-row gap-4">\n                            <ul className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">', button_code)
content = content.replace('                        <div className="flex flex-col sm:flex-row gap-4">\r\n                            <ul className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">', button_code)

modal_code = """
            <Modal isOpen={isFormOpen} onOpenChange={setIsFormOpen} scrollBehavior="inside">
                <ModalContent>
                    {(onClose) => (
                        <form onSubmit={handleCreateAndInvite}>
                            <ModalHeader>Crear e invitar integrante</ModalHeader>
                            <ModalBody className="flex flex-col gap-4">
                                <p className="text-sm text-default-600">
                                    Esta persona recibirá un correo para crear su contraseña, unirse a tu agrupación y aceptar este evento específico.
                                </p>
                                <Input
                                    label="Nombre completo"
                                    variant="bordered"
                                    value={newMemberForm.fullname}
                                    onValueChange={(val) => setNewMemberForm(prev => ({ ...prev, fullname: val }))}
                                    isRequired
                                />
                                <Input
                                    label="Correo electrónico"
                                    type="email"
                                    variant="bordered"
                                    value={newMemberForm.email}
                                    onValueChange={(val) => setNewMemberForm(prev => ({ ...prev, email: val }))}
                                    isRequired
                                />
                                <Input
                                    label="Teléfono"
                                    placeholder="Opcional"
                                    variant="bordered"
                                    value={newMemberForm.phone}
                                    onValueChange={(val) => setNewMemberForm(prev => ({ ...prev, phone: val }))}
                                />
                                <ChipListInput
                                    label="Especialidades"
                                    values={newMemberForm.specialties}
                                    onChange={(val) => setNewMemberForm(prev => ({ ...prev, specialties: val }))}
                                    placeholder="Ej. Violín, Trompeta"
                                    suggestions={COMMON_INSTRUMENTS.map(label => ({
                                        label,
                                        icon: getInstrumentIcon(label)
                                    }))}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="flat" onPress={onClose}>
                                    Cancelar
                                </Button>
                                <Button color="primary" type="submit" isLoading={isCreatingMember}>
                                    Crear e invitar
                                </Button>
                            </ModalFooter>
                        </form>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
"""

content = content.replace('        </div>\n    );\n}', modal_code)
content = content.replace('        </div>\r\n    );\r\n}', modal_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
