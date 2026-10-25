// Antes también matcheaba "ya existe" a secas, lo que hacía que choques de
// teléfono/nombre de artista ("Ya existe una cuenta con ese número de
// teléfono") se mostraran incorrectamente como error de correo duplicado.
export function isEmailTakenError(message: string): boolean {
    return /correo.*(uso|usado|registrad|tiene una cuenta)/i.test(message);
}

export function isUsernameTakenError(message: string): boolean {
    return /(nombre de usuario|slug)/i.test(message);
}

export function isMusicianNameTakenError(message: string): boolean {
    if (isUsernameTakenError(message)) {
        return false;
    }
    return /(nombre de artista|perfil con ese nombre|músico registrado con ese nombre|artista registrado)/i.test(message);
}

