import re

with open('src/components/dashboard/musician-members-view.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Avatar to imports
new_header = '''import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Textarea,
    Tooltip,
    addToast,
    Avatar,
} from "@heroui/react";'''
content = re.sub(r'import \{.*?} from "@heroui/react";', new_header, content, flags=re.DOTALL)

# Add Avatar to member table
old_col1 = '''                                    <div className="min-w-0">
                                        <p className="text-xs font-medium uppercase tracking-wide text-default-400 md:hidden mb-1">
                                            Integrante
                                        </p>
                                        <p className="font-semibold text-foreground truncate">
                                            {member.fullname}
                                        </p>
                                        <p className="text-sm text-default-500 truncate">
                                            {member.email}
                                        </p>
                                    </div>'''
new_col1 = '''                                    <div className="min-w-0">
                                        <p className="text-xs font-medium uppercase tracking-wide text-default-400 md:hidden mb-1">
                                            Integrante
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={member.fullname} size="sm" className="flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-foreground truncate">
                                                    {member.fullname}
                                                </p>
                                                <p className="text-sm text-default-500 truncate">
                                                    {member.email}
                                                </p>
                                            </div>
                                        </div>
                                    </div>'''
content = content.replace(old_col1, new_col1)

with open('src/components/dashboard/musician-members-view.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
