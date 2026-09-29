import re

with open("src/components/musician/musician-profile-wizard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

if "Form," not in content:
    content = content.replace(
        'Button,\n    Card,',
        'Button,\n    Card,\n    Form,'
    )

old_body_start = '<CardBody className="p-6">{renderStepContent()}</CardBody>'
new_body_start = '<CardBody className="p-6"><Form onSubmit={(e) => { e.preventDefault(); handleNext(); }} validationBehavior="native" className="w-full">{renderStepContent()}</Form></CardBody>'

content = content.replace(old_body_start, new_body_start)

# Change the "Guardar y Continuar" button to be a submit button instead of directly calling handleNext on press.
# Wait, actually since the button is outside the Card (in sticky bottom footer), we need to link it using form="wizard-form"
old_body_start = '<CardBody className="p-6"><Form onSubmit={(e) => { e.preventDefault(); handleNext(); }} validationBehavior="native" className="w-full">{renderStepContent()}</Form></CardBody>'
new_body_start_2 = '<CardBody className="p-6"><Form id="wizard-form" onSubmit={(e) => { e.preventDefault(); handleNext(); }} validationBehavior="native" className="w-full">{renderStepContent()}</Form></CardBody>'
content = content.replace(old_body_start, new_body_start_2)

old_button = """                        <Button
                            color="primary"
                            variant="solid"
                            onPress={handleNext}
                            isLoading={isSaving}
                            className="font-semibold shadow-soft hover:shadow-elevated px-6"
                            endContent={<Icon icon="material-symbols:arrow-forward" width={20} />}
                        >
                            {activeStep < WIZARD_STEPS.length - 1 ? "Guardar y Continuar" : "Guardar Perfil"}
                        </Button>"""

new_button = """                        <Button
                            type="submit"
                            form="wizard-form"
                            color="primary"
                            variant="solid"
                            isLoading={isSaving}
                            className="font-semibold shadow-soft hover:shadow-elevated px-6"
                            endContent={<Icon icon="material-symbols:arrow-forward" width={20} />}
                        >
                            {activeStep < WIZARD_STEPS.length - 1 ? "Guardar y Continuar" : "Guardar Perfil"}
                        </Button>"""

content = content.replace(old_button, new_button)

with open("src/components/musician/musician-profile-wizard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
