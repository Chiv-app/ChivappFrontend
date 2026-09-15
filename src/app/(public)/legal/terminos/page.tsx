import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Términos y Condiciones",
    description: `Términos y condiciones de uso de ${SITE_NAME}.`,
    path: "/legal/terminos",
});

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {title}
            </h2>
            <div className="flex flex-col gap-3 text-default-600 leading-relaxed text-sm sm:text-base">
                {children}
            </div>
        </section>
    );
}

export default function TermsPage() {
    return (
        <div className="container mx-auto max-w-content px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                    Términos y Condiciones de Uso
                </h1>
                <p className="text-default-500 text-sm">
                    Última actualización: 8 de septiembre de 2026 · Legislación de la República del Perú
                </p>
            </header>

            <Section title="1. Aceptación de estos términos">
                <p>
                    Al crear una cuenta, navegar o utilizar la plataforma {SITE_NAME}, aceptas estos Términos y
                    Condiciones en su totalidad, así como nuestra{" "}
                    <Link href="/legal/privacidad" className="text-primary underline underline-offset-2">
                        Política de Privacidad
                    </Link>
                    . Si no estás de acuerdo con alguna de las disposiciones aquí establecidas, debes abstenerte de usar la plataforma.
                </p>
            </Section>

            <Section title="2. Naturaleza del Servicio">
                <p>
                    {SITE_NAME} es una plataforma tecnológica de intermediación que conecta a{" "}
                    <strong className="text-foreground">contratistas</strong> (personas naturales o jurídicas que requieren servicios musicales para eventos)
                    con <strong className="text-foreground">músicos o agrupaciones</strong> (artistas independientes que ofrecen sus presentaciones).
                </p>
                <p>
                    {SITE_NAME} actúa como intermediario facilitador de descubrimiento, cotización, formalización de contratos con firma electrónica,
                    custodia transaccional y desembolso. La relación contractual sustantiva sobre la prestación del show musical se establece directamente
                    entre el contratista y el músico según las condiciones acordadas en cada reserva.
                </p>
            </Section>

            <Section title="3. Cuentas, Registro y Verificación">
                <p>
                    Para acceder a las funcionalidades de contratación o publicación de servicios debes registrarte proporcionando información veraz,
                    vigente y comprobable. Puedes registrarte mediante tu correo electrónico y contraseña, o mediante el inicio de sesión con{" "}
                    <strong className="text-foreground">Google</strong>, autorizando a {SITE_NAME} a crear tu identidad de usuario a partir de los datos básicos de tu perfil.
                </p>
                <p>
                    Nos reservamos el derecho de solicitar documentos de identidad (DNI, Carné de Extranjería o RUC) y validar antecedentes o referencias
                    artísticas antes de activar o publicar un perfil, con el fin de proteger la seguridad y confianza de la comunidad.
                </p>
            </Section>

            <Section title="4. Firma Electrónica y Validez Contractual (Ley N° 27269)">
                <p>
                    Al formalizar una reserva dentro de {SITE_NAME}, el contratista y el músico prestan su consentimiento expreso para celebrar el{" "}
                    <strong className="text-foreground">Contrato de Prestación de Servicios Artísticos</strong> mediante{" "}
                    <strong className="text-foreground">firma electrónica</strong>, de conformidad con lo establecido en la{" "}
                    <strong className="text-foreground">Ley N° 27269 (Ley de Firmas y Certificados Digitales del Perú)</strong> y el Código Civil peruano.
                </p>
                <p>
                    Las firmas electrónicas y digitales capturadas en la plataforma identifican fehacientemente al suscriptor, acreditan su voluntad
                    de obligarse conforme a los términos del acuerdo y tienen la misma validez legal, vinculante y probatoria que una firma manuscrita sobre papel.
                    El contrato firmado permanece inmutable y disponible en formato digital descargable (PDF) en los paneles de ambas partes.
                </p>
            </Section>

            <Section title="5. Pagos, Pasarela Mercado Pago, Fondos en Custodia y Liquidaciones">
                <p>
                    Para asegurar la transparencia y el cumplimiento de las obligaciones pactadas, el esquema de pagos opera bajo las siguientes condiciones:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-2">
                    <li>
                        <strong className="text-foreground">Pasarela de Pagos (Mercado Pago):</strong>{" "}
                        Los pagos con tarjeta de crédito, débito u otros medios autorizados son procesados a través de{" "}
                        <strong className="text-foreground">Mercado Pago Perú S.R.L.</strong> Al efectuar un pago, el contratista declara aceptar también los
                        términos y condiciones de la pasarela de pagos. {SITE_NAME} no almacena datos confidenciales de tarjetas (PCI-DSS).
                    </li>
                    <li>
                        <strong className="text-foreground">Fondos Retenidos en Custodia (Escrow):</strong>{" "}
                        Para protección del contratista y garantía del músico, los pagos por adelanto o saldo total del show son retenidos
                        en custodia por {SITE_NAME} hasta la fecha y hora de culminación del evento.
                    </li>
                    <li>
                        <strong className="text-foreground">Liquidación y Desembolso al Músico:</strong>{" "}
                        Una vez finalizado el show sin que medie una queja formal justificada dentro de la ventana de protección, {SITE_NAME} procede a
                        liberar y desembolsar el monto neto acordado hacia la cuenta bancaria, Código de Cuenta Interbancario (CCI), billetera digital
                        (Yape / Plin) o cuenta de Mercado Pago registrada confidencialmente por el músico en su perfil.
                    </li>
                    <li>
                        <strong className="text-foreground">Comisiones y Obligaciones Tributarias (SUNAT):</strong>{" "}
                        {SITE_NAME} cobra una comisión por servicio de intermediación tecnológica detallada de forma transparente antes de confirmar la operación.
                        El músico, como prestador directo del servicio artístico, es responsable de emitir al contratista el comprobante de pago legal
                        correspondiente (Recibo por Honorarios Electrónico o Factura) de conformidad con la normativa de la SUNAT.
                    </li>
                </ul>
            </Section>

            <Section title="6. Cancelaciones, Disputas y Prohibición de Contracargos Injustificados">
                <p>
                    Las políticas de cancelación aplicables a cada reserva se encuentran estipuladas en el contrato específico suscrito entre las partes:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                    <li>
                        <strong className="text-foreground">Disputas y Mediación:</strong> En caso de retrasos graves, inasistencia o discrepancias sobre
                        el servicio prestado, cualquiera de las partes puede abrir una queja dentro de la reserva antes de la liberación del pago retenido.
                        El equipo de administración evaluará las pruebas documentales y podrá disponer el reembolso total o parcial al contratista y/o el desembolso proporcional al músico.
                    </li>
                    <li>
                        <strong className="text-foreground">Contracargos Fraudulentos:</strong> Queda terminantemente prohibido iniciar desconocimientos de pago o
                        contracargos bancarios fraudulentos o de mala fe ante la entidad financiera emisora de la tarjeta habiendo recibido el servicio musical conforme.
                        Cualquier contracargo no justificado facultará a {SITE_NAME} a suspender la cuenta del usuario e iniciar las acciones legales de cobranza e indemnización correspondientes.
                    </li>
                </ul>
            </Section>

            <Section title="7. Uso Aceptable y Conducta">
                <p>Los usuarios se comprometen a utilizar la plataforma con respeto, honestidad y apego a la ley. Queda prohibido:</p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                    <li>Suplantar la identidad de terceros o utilizar documentos o cuentas bancarias ajenas sin autorización.</li>
                    <li>Publicar fotos, videos o repertorios musicales que infrinjan derechos de autor de terceros o que contengan contenido ilícito u ofensivo.</li>
                    <li>Eludir la plataforma para contactar a usuarios con fines de evadir el uso de contratos seguros o comisiones una vez iniciado el contacto en {SITE_NAME}.</li>
                    <li>Vulnerar la seguridad tecnológica, ejecutar ataques de denegación de servicio o intentar acceder a bases de datos protegidas.</li>
                </ul>
            </Section>

            <Section title="8. Seguridad, Privacidad y Cookies">
                <p>
                    {SITE_NAME} implementa estándares de seguridad técnicos estrictos para proteger tu información. 
                    Tus sesiones de usuario (logins) están protegidas utilizando <strong>Cookies HTTP-Only</strong> y 
                    comunicaciones cifradas a través de <strong>certificados SSL/TLS (HTTPS)</strong> para mitigar riesgos de 
                    robo de credenciales o ataques (XSS, CSRF).
                </p>
                <p>
                    Ningún dato de inicio de sesión sensible se almacena de forma desprotegida en tu navegador. 
                    Nuestra infraestructura en la nube garantiza el manejo confidencial de tu información, alineada con 
                    la Ley de Protección de Datos Personales (Ley N° 29733).
                </p>
            </Section>

            <Section title="9. Suspensión y Cierre de Cuentas">
                <p>
                    {SITE_NAME} se reserva la potestad de suspender temporal o permanentemente el acceso a cualquier cuenta que incumpla estos términos,
                    incurra en actos de estafa, acumule quejas graves no resueltas de contratistas o músicos, o genere riesgos de seguridad para la plataforma.
                </p>
            </Section>

            <Section title="10. Protección al Consumidor y Libro de Reclamaciones (Ley N° 29571)">
                <p>
                    En cumplimiento de la <strong className="text-foreground">Ley N° 29571 (Código de Protección y Defensa del Consumidor de la República del Perú)</strong>,
                    {SITE_NAME} garantiza los derechos de los usuarios y pone a disposición su sistema de atención de consultas, solicitudes y Libro de Reclamaciones Virtual
                    para asentar cualquier queja o reclamo formal sobre el servicio de intermediación provisto.
                </p>
            </Section>

            <Section title="11. Ley Aplicable y Jurisdicción">
                <p>
                    Estos Términos y Condiciones se rigen e interpretan en su totalidad por las{" "}
                    <strong className="text-foreground">leyes de la República del Perú</strong>.
                    Para cualquier controversia, litigio o reclamación derivada de la existencia, validez, interpretación o ejecución de estos términos que no
                    pueda ser resuelta de mutuo acuerdo mediante conciliación previa, las partes renuncian al fuero de sus domicilios y se someten expresamente
                    a la jurisdicción y competencia de los Jueces y Tribunales del Distrito Judicial de Lima Cercado, Perú.
                </p>
            </Section>

            <Section title="12. Contacto y Soporte">
                <p>
                    Para consultas, dudas sobre estos términos o requerimientos de asistencia, puedes comunicarte a través del módulo de{" "}
                    <span className="text-foreground font-semibold">ayuda y comentarios</span> en la aplicación o escribiéndonos directamente a{" "}
                    <span className="text-foreground font-semibold">contacto@chiv.app</span>.
                </p>
            </Section>
        </div>
    );
}
