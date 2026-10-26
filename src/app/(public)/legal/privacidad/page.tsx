import type { Metadata } from "next";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Privacidad y Cookies",
    description: `Política de privacidad y cookies de ${SITE_NAME}.`,
    path: "/legal/privacidad",
});

function Section({
    id,
    title,
    children,
}: {
    id?: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="flex flex-col gap-3 scroll-mt-28">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {title}
            </h2>
            <div className="flex flex-col gap-3 text-default-600 leading-relaxed text-sm sm:text-base">
                {children}
            </div>
        </section>
    );
}

export default function PrivacyPage() {
    return (
        <div className="container mx-auto max-w-content px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                    Política de Privacidad y Protección de Datos
                </h1>
                <p className="text-default-500 text-sm">
                    Última actualización: 8 de septiembre de 2026 · Conforme a la Ley N° 29733 (Perú) y estándares internacionales
                </p>
            </header>

            <Section title="1. Marco Legal y Compromiso de Privacidad">
                <p>
                    En {SITE_NAME} valoramos y respetamos tu derecho a la privacidad. Esta Política de
                    Privacidad describe cómo recopilamos, utilizamos, almacenamos, divulgamos y protegemos
                    la información personal de nuestros usuarios (contratistas y músicos).
                </p>
                <p>
                    El tratamiento de datos personales en {SITE_NAME} se realiza en estricto cumplimiento de la{" "}
                    <strong className="text-foreground">Ley N° 29733 (Ley de Protección de Datos Personales de la República del Perú)</strong>,
                    su Reglamento aprobado por <strong className="text-foreground">Decreto Supremo N° 003-2013-JUS</strong>, y las directivas
                    emitidas por la Autoridad Nacional de Protección de Datos Personales (ANPDP).
                </p>
            </Section>

            <Section title="2. Datos personales que recolectamos">
                <p>Para la correcta prestación de nuestros servicios recolectamos las siguientes categorías de datos:</p>
                <ul className="list-disc pl-5 flex flex-col gap-2">
                    <li>
                        <strong className="text-foreground">Datos de cuenta y autenticación:</strong>{" "}
                        nombre, apellidos, dirección de correo electrónico, número de teléfono celular y contraseña cifrada.
                        Si eliges registrarte o autenticarte a través de servicios de terceros como{" "}
                        <strong className="text-foreground">Google</strong>, recopilamos tu nombre, correo electrónico verificado,
                        identificador único de usuario y foto de perfil autorizados por ti en la pantalla de consentimiento.
                    </li>
                    <li>
                        <strong className="text-foreground">Datos de perfil artístico (Músicos):</strong>{" "}
                        nombre artístico o de agrupación, biografía, géneros musicales, instrumentos, tarifas y precios por hora/show,
                        cobertura geográfica, fotografías, enlaces de video, y una firma digitalizada manuscrita empleada
                        exclusivamente para suscribir contratos de prestación de servicios musicales.
                    </li>
                    <li>
                        <strong className="text-foreground">Datos bancarios y de desembolso (Músicos):</strong>{" "}
                        entidad financiera, número de cuenta bancaria, Código de Cuenta Interbancario (CCI), número celular afiliado
                        a billeteras móviles (Yape / Plin), correo de cuenta Mercado Pago, así como nombre y documento de identidad (DNI/RUC)
                        del titular de la cuenta. Estos datos son de carácter estrictamente confidencial.
                    </li>
                    <li>
                        <strong className="text-foreground">Datos de transacciones y reservas:</strong>{" "}
                        fechas, horarios, ubicaciones de los eventos, requerimientos artísticos, mensajería interna entre
                        contratista y músico, contratos electrónicos celebrados, importes facturados y comprobantes de pago.
                    </li>
                    <li>
                        <strong className="text-foreground">Datos técnicos y de navegación:</strong>{" "}
                        dirección IP, tipo de navegador, sistema operativo, identificadores de sesión y registros de actividad para
                        fines de auditoría, seguridad y prevención de fraudes.
                    </li>
                </ul>
            </Section>

            <Section title="3. Pasarela de Pagos (Mercado Pago) y Seguridad Financiera">
                <p>
                    La seguridad de tus operaciones de pago es una prioridad fundamental. Los pagos con tarjeta de débito,
                    tarjeta de crédito, transferencias y otros medios electrónicos son procesados a través de la pasarela autorizada{" "}
                    <strong className="text-foreground">Mercado Pago Perú S.R.L.</strong> (o sus afiliadas de MercadoLibre).
                </p>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-2 text-sm">
                    <p className="font-semibold text-primary-text">
                        Compromiso de No Almacenamiento de Datos de Tarjetas (PCI-DSS)
                    </p>
                    <p>
                        {SITE_NAME}{" "}
                        <strong className="text-foreground">
                            NUNCA almacena, procesa ni tiene acceso a los números completos de tus tarjetas de crédito o débito,
                            fechas de vencimiento ni códigos de seguridad (CVV/CVC)
                        </strong>.
                        Toda captura de dichos datos se realiza de forma directa en el entorno seguro y cifrado de Mercado Pago,
                        el cual cuenta con la certificación de seguridad internacional{" "}
                        <strong className="text-foreground">PCI-DSS Nivel 1 (Payment Card Industry Data Security Standard)</strong>.
                    </p>
                </div>
                <p>
                    {SITE_NAME} únicamente recibe de Mercado Pago la confirmación del estado de la transacción (aprobado, pendiente o rechazado),
                    el código de referencia de la operación y el monto pagado para actualizar el estado de tu reserva y emitir los comprobantes pertinentes.
                </p>
                <p>
                    Respecto a los datos de cobro de los músicos (cuentas bancarias, CCI y números de billetera digital), estos se custodian bajo
                    mecanismos de cifrado y se emplean <strong className="text-foreground">únicamente</strong> para transferir el dinero acordado una vez
                    que el servicio musical ha sido ejecutado satisfactoriamente. Ningún contratista u otro usuario tiene acceso a dicha información financiera.
                </p>
            </Section>

            <Section title="4. Finalidad del Tratamiento de los Datos">
                <p>Tus datos personales son tratados para las siguientes finalidades legítimas:</p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                    <li>Gestionar la creación y mantenimiento de tu cuenta de usuario.</li>
                    <li>Permitir la publicación de perfiles artísticos, cotización y contratación de servicios musicales.</li>
                    <li>Procesar las reservas, formalizar contratos de prestación de servicios con firma electrónica y gestionar pagos y desembolsos.</li>
                    <li>Garantizar la seguridad de la plataforma, prevenir fraudes, usurpación de identidad y actividades ilícitas.</li>
                    <li>Remitir notificaciones transaccionales y operativas (confirmación de reserva, recordatorios de show, avisos de pago) mediante correo electrónico o mensajería.</li>
                    <li>Atender solicitudes, reclamos, quejas o disputas mediante nuestro centro de soporte y mediación.</li>
                    <li>Cumplir con mandatos judiciales, normativas tributarias (SUNAT) y demás obligaciones legales aplicables en el Perú.</li>
                </ul>
            </Section>

            <Section title="5. Política de Datos de Usuario de Google (Google API Services User Data Policy)">
                <p>
                    En caso de utilizar el inicio de sesión con Google, el uso y transferencia a cualquier otra aplicación de la información
                    recibida de las APIs de Google por parte de {SITE_NAME} se apega a la{" "}
                    <strong className="text-foreground">Google API Services User Data Policy</strong>, incluidos los requisitos de Uso Limitado
                    (<em>Limited Use requirements</em>).
                </p>
                <p>
                    {SITE_NAME} no comercializa, transfiere ni utiliza los datos de perfil de Google para fines publicitarios, creación de perfiles
                    de comportamiento ajenos a la app, ni para el entrenamiento de tecnologías de inteligencia artificial general.
                </p>
            </Section>

            <Section id="cookies" title="6. Cookies y Almacenamiento de Sesión">
                <p>
                    {SITE_NAME} utiliza únicamente cookies técnicas y de seguridad indispensables para el funcionamiento y la integridad del servicio:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                    <li>
                        <code className="px-1.5 py-0.5 rounded bg-default-100 text-foreground text-xs">access_token</code> y{" "}
                        <code className="px-1.5 py-0.5 rounded bg-default-100 text-foreground text-xs">refresh_token</code>:
                        cookies protegidas con atributos HTTP-Only, Secure y SameSite para mantener tu sesión autenticada sin exposición a ataques XSS.
                    </li>
                    <li>
                        <code className="px-1.5 py-0.5 rounded bg-default-100 text-foreground text-xs">oauth_pending</code>:
                        cookie temporal y cifrada que vincula la autorización inicial de Google con la selección de tu rol en la plataforma.
                    </li>
                </ul>
                <p>
                    No empleamos cookies de rastreo publicitario de terceros ni vendemos hábitos de navegación a anunciantes.
                </p>
            </Section>

            <Section title="7. Transferencia y Destinatarios de los Datos">
                <p>
                    Tus datos personales no serán vendidos ni compartidos con fines comerciales. Únicamente se transfieren o comunican a:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                    <li>
                        <strong className="text-foreground">La contraparte de la reserva:</strong> los datos estrictamente necesarios para la ejecución del evento (nombres, contacto directo y detalles del servicio musical acordado).
                    </li>
                    <li>
                        <strong className="text-foreground">Proveedores de servicios esenciales (Encargados del Tratamiento):</strong> empresas de infraestructura en la nube (Google Cloud Platform con altos estándares de seguridad física y lógica ISO/IEC 27001), plataformas de pago (Mercado Pago Perú S.R.L.) y servicios de envío de correos transaccionales (Brevo), todos ellos sujetos a estrictos acuerdos de confidencialidad y protección de datos.
                    </li>
                    <li>
                        <strong className="text-foreground">Autoridades competentes:</strong> cuando sea requerido formalmente por mandato legal, fiscal o judicial en el marco de la legislación peruana.
                    </li>
                </ul>
            </Section>

            <Section title="8. Plazo de Conservación de Datos">
                <p>
                    Los datos personales se conservarán mientras mantengas activa tu cuenta en {SITE_NAME}. Una vez solicitada la cancelación o eliminación de tu cuenta,
                    los datos serán bloqueados y conservados únicamente durante los plazos legalmente exigibles para la atención de responsabilidades contractuales,
                    civiles o tributarias (conforme al Código Tributario del Perú ante la SUNAT, que exige la custodia de información transaccional por un plazo mínimo de 5 años).
                    Transcurrido dicho periodo, se procederá a su eliminación segura o anonimización definitiva.
                </p>
            </Section>

            <Section id="eliminacion-datos" title="9. Ejercicio de Derechos ARCO y Eliminación de Datos de Usuario (Facebook / Google)">
                <p>
                    De conformidad con la Ley N° 29733 y los lineamientos de las plataformas de autenticación (Meta / Facebook y Google),
                    tienes derecho a solicitar la eliminación o cancelación definitiva de tus datos personales y cuentas vinculadas en cualquier momento:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                    <li><strong className="text-foreground">Acceso:</strong> conocer qué datos tuyos poseemos, su origen y la finalidad de su tratamiento.</li>
                    <li><strong className="text-foreground">Rectificación:</strong> solicitar la actualización, precisión o corrección de datos inexactos o incompletos.</li>
                    <li><strong className="text-foreground">Cancelación:</strong> solicitar la supresión de tus datos cuando hayan dejado de ser necesarios o pertinentes.</li>
                    <li><strong className="text-foreground">Oposición:</strong> negarte al tratamiento de tus datos para finalidades específicas por motivos fundados y legítimos.</li>
                </ul>
                <p>
                    Para ejercer tus derechos ARCO, puedes presentar una solicitud a través del módulo de{" "}
                    <strong className="text-foreground">Ayuda y Soporte</strong> dentro de la plataforma o escribiendo al correo electrónico{" "}
                    <strong className="text-foreground">privacidad@chiv.app</strong>, adjuntando una copia o escaneo de tu documento de identidad (DNI o Pasaporte) para validar tu titularidad.
                    Tus solicitudes serán atendidas dentro de los plazos fijados por ley (hasta 20 días hábiles para el derecho de acceso y hasta 10 días hábiles para rectificación, cancelación u oposición).
                </p>
            </Section>

            <Section title="10. Medidas de Seguridad">
                <p>
                    {SITE_NAME} adopta medidas técnicas, organizativas y legales apropiadas para salvaguardar la confidencialidad, integridad y disponibilidad
                    de los datos personales, mitigando riesgos de acceso no autorizado, alteración, pérdida o divulgación indebida. Esto incluye comunicaciones
                    cifradas mediante protocolos TLS/HTTPS, contraseñas protegidas con algoritmos de hash criptográfico unidireccional y políticas estrictas de control de acceso basadas en el principio de mínimo privilegio.
                </p>
            </Section>

            <Section title="11. Modificaciones y Contacto">
                <p>
                    Nos reservamos el derecho de modificar esta Política de Privacidad para adecuarla a novedades legislativas o mejoras en la plataforma.
                    Cualquier cambio sustancial será comunicado mediante la app o al correo electrónico registrado.
                </p>
                <p>
                    Para cualquier consulta sobre el tratamiento de tus datos personales, puedes contactarnos a través del botón de{" "}
                    <span className="text-foreground font-semibold">ayuda y comentarios</span> en la app o enviando un mensaje a{" "}
                    <span className="text-foreground font-semibold">privacidad@chiv.app</span>.
                </p>
            </Section>
        </div>
    );
}

