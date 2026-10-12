import os
import re

p = "src/app/(public)/pay/[token]/checkout-client.tsx"
c = open(p, encoding='utf-8').read()

import_statement = """import LocationMapPickerField, { type MapLocation } from "@/components/ui/location-map-picker-field";
import { formatCurrency } from "@/lib/booking-labels";"""

new_import_statement = """import LocationMapPickerField, { type MapLocation } from "@/components/ui/location-map-picker-field";
import { formatCurrency } from "@/lib/booking-labels";
import BookingContractConfirmCard from "@/components/booking/booking-contract-confirm-card";
import { getBooking, getBookingContract } from "@/lib/bookings";
import { useAuth } from "@/contexts/auth-context";
import type { BookingOut, ContractOut } from "@/types/api";"""

c = c.replace(import_statement, new_import_statement)

init_state = """    const [selectedKeys, setSelectedKeys] = useState(new Set(["1"]));"""

new_init_state = """    const [selectedKeys, setSelectedKeys] = useState(new Set(["1"]));
    const { refresh: refreshAuth } = useAuth();
    const [booking, setBooking] = useState<BookingOut | null>(null);
    const [contract, setContract] = useState<ContractOut | null>(null);
    const [isLoadingContract, setIsLoadingContract] = useState(false);"""

c = c.replace(init_state, new_init_state)

c = re.sub(
    r'addToast\(\{[\s\S]*?window\.location\.href = `/contractor/bookings/\$\{res\.booking_id\}`;',
    """            addToast({ title: "¡Reserva creada!", description: "Generando contrato...", color: "success" });
            await refreshAuth();
            setIsLoadingContract(true);
            setSelectedKeys(new Set(["3"]));
            try {
                const [fetchedBooking, fetchedContract] = await Promise.all([
                    getBooking(res.booking_id),
                    getBookingContract(res.booking_id)
                ]);
                setBooking(fetchedBooking);
                setContract(fetchedContract);
            } catch (err) {
                console.error("Error al cargar contrato", err);
            } finally {
                setIsLoadingContract(false);
            }""",
    c
)

# Step 3 Replacement
c = re.sub(
    r'<AccordionItem\s+key="3"[\s\S]*?</AccordionItem>',
    """                <AccordionItem 
                    key="3" 
                    title={<span className="font-semibold">3. Confirmación y Pago</span>}
                    subtitle="Revisa el contrato y procede al pago"
                    startContent={<Icon icon="lucide:credit-card" className="text-primary" width={24}/>}
                >
                    <div className="flex flex-col gap-4 py-2">
                        {booking ? (
                            <BookingContractConfirmCard
                                booking={booking}
                                contract={contract}
                                isLoadingContract={isLoadingContract}
                                bypassVerificationCheck={true}
                                onUpdated={(updatedBooking) => {
                                    window.location.href = `/contractor/bookings/${updatedBooking.id}`;
                                }}
                            />
                        ) : (
                            <>
                                <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                                    <p className="text-sm text-primary-800 mb-2">
                                        Al proceder con el pago, aceptas nuestros Términos y Condiciones, así como el contrato de prestación de servicios musicales con <b>{linkData.musician.stage_name}</b>.
                                    </p>
                                </div>
                                <Button 
                                    color="primary" 
                                    size="lg" 
                                    className="w-full font-bold shadow-md"
                                    onPress={handleSubmit}
                                    isLoading={isSubmitting}
                                    startContent={!isSubmitting && <Icon icon="lucide:check-circle-2" width={20} />}
                                >
                                    Generar contrato y continuar
                                </Button>
                            </>
                        )}
                    </div>
                </AccordionItem>""",
    c
)

c = c.replace("Total a pagar", "Monto")

open(p, 'w', encoding='utf-8').write(c)
print("done checkout")
