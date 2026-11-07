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
          Última actualización: 5 de noviembre de 2026 · Legislación de la
          República del Perú
        </p>
      </header>

      <div className="rounded-2xl border border-default-200 bg-content1 p-5 sm:p-6 shadow-soft">
        <h2 className="text-base sm:text-lg font-bold text-foreground mb-3">
          Resumen rápido de reembolsos
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-default-200 text-default-500">
                <th className="py-2 pr-4 font-semibold">Escenario</th>
                <th className="py-2 pr-4 font-semibold">Reembolso al cliente</th>
                <th className="py-2 font-semibold">Pago al músico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-200/70 text-default-700">
              <tr>
                <td className="py-2.5 pr-4 font-medium text-foreground">
                  Cancela el cliente con {policy.full_refund_min_days} días o más
                </td>
                <td className="py-2.5 pr-4">100 % de la tarifa del artista</td>
                <td className="py-2.5">0 %</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-foreground">
                  Cancela el cliente entre {policy.partial_refund_min_days} y {maxPartialDays} días
                </td>
                <td className="py-2.5 pr-4">{policy.partial_refund_percent} % de la tarifa del artista</td>
                <td className="py-2.5">{100 - policy.partial_refund_percent} % de la tarifa</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-foreground">
                  Cancela el cliente con menos de {policy.no_refund_below_days} días
                </td>
                <td className="py-2.5 pr-4">0 %</td>
                <td className="py-2.5">100 % de la tarifa del artista</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-foreground">
                  Cancela el músico o no se presenta
                </td>
                <td className="py-2.5 pr-4">
                  {policy.musician_fault_refund_percent} % de la tarifa del artista
                </td>
                <td className="py-2.5">0 %</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-default-500 mt-3">
          Nota: La comisión de servicio de {SITE_NAME} y el costo de procesamiento de la pasarela no son reembolsables en ningún escenario.
        </p>
      </div>

      <Section title="1. Pago protegido y ventana de protección">
        <p>
          Al confirmar una reserva en {SITE_NAME}, el contratista abona el 100%
          del monto acordado a través de Mercado Pago (Yape, Plin o tarjeta). El
          importe permanece resguardado por {SITE_NAME} durante la{" "}
          <strong className="text-foreground">ventana de protección</strong>{" "}
          (desde la confirmación del pago hasta la finalización del evento y la
          conformidad mediante reseña mutua o liquidación administrativa sin
          reclamos abiertos).
        </p>
        <p>
          Lo que abona el contratista se compone de la{" "}
          <strong className="text-foreground">tarifa del artista</strong>, la{" "}
          <strong className="text-foreground">comisión de servicio</strong> de{" "}
          {SITE_NAME} y el costo de la pasarela de pagos. En cualquier
          cancelación el reembolso se calcula únicamente sobre la tarifa del
          artista: la comisión de servicio y el costo de la pasarela{" "}
          <strong className="text-foreground">no son reembolsables</strong>.
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
            la tarifa del artista.
          </li>
          <li>
            <strong className="text-foreground">
              Entre {policy.partial_refund_min_days} y {maxPartialDays} días calendario de anticipación:
            </strong>{" "}
            reembolso del <strong className="text-foreground">{policy.partial_refund_percent}%</strong> de
            la tarifa del artista; el {100 - policy.partial_refund_percent}% restante de la tarifa se
            destina al artista como compensación por el bloqueo de su agenda.
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
            {policy.musician_fault_refund_percent}% de la tarifa del artista
          </strong>{" "}
          (la comisión de servicio y el costo de la pasarela no se reembolsan) y puede solicitar asistencia prioritaria para encontrar una agrupación
          de reemplazo.
        </p>
      </Section>

      <Section title="4. Plazos de procesamiento y disputas">
        <p>
          Todo reembolso aprobado lo transfiere {SITE_NAME} directamente al
          contratista (por Yape, Plin o transferencia bancaria, según los datos
          que nos indique) dentro de los 5 a 10 días hábiles siguientes a la
          resolución, sujeto a los tiempos de acreditación de cada entidad
          financiera. Cuando la transferencia sale, te avisamos por la app y por
          correo con la referencia de la operación. Consulta también nuestros{" "}
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
