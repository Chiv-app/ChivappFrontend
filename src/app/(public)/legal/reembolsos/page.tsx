import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";
import {
  fetchCancellationPolicy,
  getPartialRefundMaxDays,
} from "@/lib/cancellation-policy";

export const metadata: Metadata = buildPageMetadata({
  title: "Política de cancelación y reembolsos",
  description: `Condiciones de cancelación, custodia de pagos y reembolsos en ${SITE_NAME}.`,
  path: "/legal/reembolsos",
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

export default async function RefundPolicyPage() {
  const policy = await fetchCancellationPolicy();
  const maxPartialDays = getPartialRefundMaxDays(policy);
  return (
    <div className="container mx-auto max-w-content px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          Política de cancelación y reembolsos
        </h1>
        <p className="text-default-500 text-sm">
          Última actualización: 23 de octubre de 2026 · Legislación de la
          República del Perú
        </p>
      </header>

      <Section title="1. Custodia del pago (Escrow)">
        <p>
          Al confirmar una reserva en {SITE_NAME}, el contratista abona el 100%
          del monto acordado a través de Mercado Pago (Yape o tarjeta). El
          importe permanece retenido en custodia de {SITE_NAME} y se libera al
          músico únicamente después de que la presentación se ha realizado sin
          incidencias reportadas dentro de la ventana de protección.
        </p>
      </Section>

      <Section title="2. Cancelación solicitada por el contratista">
        <p>
          Si el contratista solicita cancelar una reserva confirmada antes de la
          fecha del evento, el porcentaje de reembolso se calcula en días
          calendario respecto a la fecha del evento (hora oficial del Perú,
          America/Lima):
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            <strong className="text-foreground">
              {policy.full_refund_min_days} días calendario o más de anticipación:
            </strong>{" "}
            reembolso del <strong className="text-foreground">100%</strong> de
            lo pagado (sin incluir el costo no reembolsable de la pasarela de
            pagos).
          </li>
          <li>
            <strong className="text-foreground">
              Entre {policy.partial_refund_min_days} y {maxPartialDays} días calendario de anticipación:
            </strong>{" "}
            reembolso del <strong className="text-foreground">{policy.partial_refund_percent}%</strong> de lo
            pagado (sin incluir el costo de la pasarela), reteniendo el {100 - policy.partial_refund_percent}%
            restante como compensación por bloqueo de agenda del artista.
          </li>
          <li>
            <strong className="text-foreground">
              Menos de {policy.no_refund_below_days} días calendario de anticipación:
            </strong>{" "}
            no aplica reembolso (<strong className="text-foreground">0%</strong>
            ), salvo caso fortuito o fuerza mayor debidamente acreditado y
            evaluado por el equipo de soporte.
          </li>
        </ul>
      </Section>

      <Section title="3. Cancelación o inasistencia del músico">
        <p>
          Si el músico cancela una reserva confirmada o no se presenta en la
          fecha, hora y lugar pactados en el contrato electrónico, el
          contratista recibe el reembolso del{" "}
          <strong className="text-foreground">
            {policy.musician_fault_refund_percent}% del importe abonado
          </strong>{" "}
          y puede solicitar asistencia prioritaria para encontrar una agrupación
          de reemplazo.
        </p>
      </Section>

      <Section title="4. Plazos de procesamiento y disputas">
        <p>
          Todo reembolso aprobado se procesa hacia el mismo medio de pago
          utilizado en Mercado Pago dentro de los 5 a 10 días hábiles siguientes
          a la resolución, sujeto a los tiempos de acreditación de cada entidad
          financiera. Consulta también nuestros{" "}
          <Link
            href="/legal/terminos"
            className="text-primary underline underline-offset-2"
          >
            Términos y condiciones
          </Link>{" "}
          y nuestra{" "}
          <Link
            href="/legal/privacidad"
            className="text-primary underline underline-offset-2"
          >
            Política de privacidad
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
