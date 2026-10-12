"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Accordion, AccordionItem, Input, Button, addToast, User as UserUI } from "@heroui/react";
import { Icon } from "@iconify/react";
import { BookingLinkPublicOut, checkoutBookingLink } from "@/lib/booking-links";
import LocationMapPickerField, { type MapLocation } from "@/components/ui/location-map-picker-field";
import { formatCurrency } from "@/lib/booking-labels";
import BookingContractConfirmCard from "@/components/booking/booking-contract-confirm-card";
import { getBooking } from "@/lib/bookings";
import { getBookingContract } from "@/lib/contracts";
import { useAuth } from "@/contexts/auth-context";
import type { BookingOut, ContractOut } from "@/types/api";

export default function CheckoutClient({ linkData }: { linkData: BookingLinkPublicOut }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [eventDate, setEventDate] = useState(linkData.event_date || "");
    const [startTime, setStartTime] = useState(linkData.start_time || "");
    const [eventType, setEventType] = useState("");
    const [location, setLocation] = useState<MapLocation | null>(null);
    
    const [fullname, setFullname] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [documentNumber, setDocumentNumber] = useState("");

    const [selectedKeys, setSelectedKeys] = useState(new Set(["1"]));
    const { refresh: refreshAuth } = useAuth();
    const [booking, setBooking] = useState<BookingOut | null>(null);
    const [contract, setContract] = useState<ContractOut | null>(null);
    const [isLoadingContract, setIsLoadingContract] = useState(false);

    const handleNext = (currentStep: string, nextStep: string) => {
        // Here we could add validation
        setSelectedKeys(new Set([nextStep]));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await checkoutBookingLink(linkData.token, {
                event_date: eventDate,
                start_time: startTime,
                event_type: eventType,
                location_address: location?.address || "",
                location_city: location?.city || "", 
                fullname,
                email,
                phone,
                document_number: documentNumber
            });
            
                        addToast({ title: "¡Reserva creada!", description: "Generando contrato...", color: "success" });
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
            }
            
        } catch (error: unknown) {
            addToast({
                title: "Problema al procesar",
                description: (error as Error).message || "Ocurrió un problema inesperado. Por favor, intenta nuevamente.",
                color: "danger"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-content1 p-6 rounded-2xl shadow-sm flex items-center justify-between border border-default-200">
                <UserUI 
                    name={linkData.musician.stage_name}
                    description="Contrato rápido"
                    avatarProps={{ src: linkData.musician.profile_picture_url || undefined, size: "lg" }}
                />
                <div className="text-right">
                    <p className="text-sm text-default-500">Monto</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(linkData.price)}</p>
                </div>
            </div>

            <Accordion 
                variant="splitted"
                selectedKeys={selectedKeys}
                onSelectionChange={(keys) => setSelectedKeys(new Set(keys as Iterable<string>))}
                className="px-0 gap-4"
            >
                <AccordionItem 
                    key="1" 
                    title={<span className="font-semibold">1. Datos del evento</span>}
                    subtitle="Cuándo y dónde será la presentación"
                    startContent={<Icon icon="lucide:calendar-clock" className="text-primary" width={24}/>}
                >
                    <div className="flex flex-col gap-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Fecha" 
                                type="date" 
                                value={eventDate} 
                                onValueChange={setEventDate}
                                isRequired
                                variant="bordered"
                            />
                            <Input 
                                label="Hora de inicio" 
                                type="time" 
                                value={startTime} 
                                onValueChange={setStartTime}
                                isRequired
                                variant="bordered"
                            />
                        </div>
                        <Input 
                            label="Tipo de evento (ej. Cumpleaños, Boda)" 
                            value={eventType} 
                            onValueChange={setEventType}
                            isRequired
                            variant="bordered"
                        />
                        <LocationMapPickerField value={location} onChange={setLocation} />
                        <div className="flex justify-end mt-2">
                            <Button color="primary" onPress={() => handleNext("1", "2")}>
                                Siguiente paso
                            </Button>
                        </div>
                    </div>
                </AccordionItem>

                <AccordionItem 
                    key="2" 
                    title={<span className="font-semibold">2. Tus datos personales</span>}
                    subtitle="Información de contacto del contratista"
                    startContent={<Icon icon="lucide:user" className="text-primary" width={24}/>}
                >
                    <div className="flex flex-col gap-4 py-2">
                        <Input 
                            label="Nombre completo" 
                            value={fullname} 
                            onValueChange={setFullname}
                            isRequired
                            variant="bordered"
                        />
                        <Input 
                            label="Correo electrónico" 
                            type="email"
                            value={email} 
                            onValueChange={setEmail}
                            isRequired
                            variant="bordered"
                        />
                        <Input 
                            label="Teléfono (WhatsApp)" 
                            type="tel"
                            value={phone} 
                            onValueChange={setPhone}
                            isRequired
                            variant="bordered"
                        />
                        <Input 
                            label="Documento de Identidad (DNI/CE)" 
                            value={documentNumber} 
                            onValueChange={setDocumentNumber}
                            variant="bordered"
                        />
                        <div className="flex justify-end mt-2">
                            <Button color="primary" onPress={() => handleNext("2", "3")}>
                                Siguiente paso
                            </Button>
                        </div>
                    </div>
                </AccordionItem>

                                <AccordionItem 
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
                </AccordionItem>
            </Accordion>
        </div>
    );
}
