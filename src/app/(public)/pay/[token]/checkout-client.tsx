"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToast, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { resolveUploadUrl } from "@/lib/uploads";
import { BookingLinkPublicOut, checkoutBookingLink, checkIdentityBookingLink, sendOtpBookingLink, BookingLinkIdentityStatus } from "@/lib/booking-links";
import LocationMapPickerField, { type MapLocation } from "@/components/ui/location-map-picker-field";
import { formatCurrency } from "@/lib/booking-labels";
import { useAuth } from "@/contexts/auth-context";
import BookingMercadoPagoModal from "@/components/booking/booking-mercadopago-modal";
import type { BookingOut } from "@/types/api";

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
    // Identity Flow State
    const [identityStatus, setIdentityStatus] = useState<BookingLinkIdentityStatus | "idle">("idle");
    const [identityMessage, setIdentityMessage] = useState<string | null>(null);
    const [isCheckingIdentity, setIsCheckingIdentity] = useState(false);
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [otpSent, setOtpSent] = useState(false);

    const [activeStep, setActiveStep] = useState<number>(1);
    const [completedSteps, setCompletedSteps] = useState(new Set<number>());
    const { refresh: refreshAuth } = useAuth();
    
    const [termsAccepted, setTermsAccepted] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState("yape");

    const [booking, setBooking] = useState<BookingOut | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const handleEmailBlur = async () => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        setIsCheckingIdentity(true);
        try {
            const res = await checkIdentityBookingLink(linkData.token, email);
            setIdentityStatus(res.status);
            setIdentityMessage(res.message || null);
            if (res.status === 'exists_verified') {
                handleSendOtp();
            }
        } catch (error) {
            console.error("Failed to check identity", error);
        } finally {
            setIsCheckingIdentity(false);
        }
    };

    const handleSendOtp = async () => {
        try {
            await sendOtpBookingLink(linkData.token, email);
            setOtpSent(true);
            addToast({ title: "Código enviado", description: "Revisa tu correo para obtener el código de acceso.", color: "success" });
        } catch (error: any) {
            addToast({ title: "Error", description: error.message || "No se pudo enviar el código", color: "danger" });
        }
    };

    const goToStep = (step: number) => {
        if (step === 2) {
            if (!eventDate || !startTime || !eventType || !location?.address) {
                addToast({ title: "Datos incompletos", description: "Completa la fecha, hora, tipo de evento y ubicación.", color: "danger" });
                return;
            }
            setCompletedSteps(prev => new Set(prev).add(1));
        } else if (step === 3) {
            if (!fullname || !email || !phone) {
                addToast({ title: "Datos incompletos", description: "El nombre, correo y celular son obligatorios.", color: "danger" });
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                addToast({ title: "Correo inválido", description: "Ingresa un correo electrónico válido.", color: "danger" });
                return;
            }
            if (identityStatus === 'self') {
                addToast({ title: "Acción no permitida", description: "No puedes contratarte a ti mismo con tu cuenta de músico.", color: "danger" });
                return;
            }
            if (identityStatus === 'exists_verified' && !otp) {
                addToast({ title: "Falta código", description: "Ingresa el código OTP enviado a tu correo.", color: "danger" });
                return;
            }
            if (identityStatus === 'exists_unverified' && !password) {
                addToast({ title: "Falta contraseña", description: "Ingresa tu contraseña para continuar.", color: "danger" });
                return;
            }
            setCompletedSteps(prev => new Set(prev).add(2));
        }
        setActiveStep(step);
    };

    const handlePayAndConfirm = async () => {
        if (!termsAccepted) {
            addToast({ title: "Términos obligatorios", description: "Debes aceptar los términos para continuar.", color: "warning" });
            return;
        }

        if (!booking) {
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
                    document_number: documentNumber,
                    otp: identityStatus === 'exists_verified' ? otp : undefined,
                    password: identityStatus === 'exists_unverified' ? password : undefined,
                });
                
                await refreshAuth();
                setBooking({ id: res.booking_id } as BookingOut); // Minimal mock for modal
                setIsPaymentModalOpen(true);
            } catch (error: unknown) {
                let errorMsg = (error as Error).message || "Ocurrió un problema inesperado.";
                if (error && typeof error === 'object' && 'response' in error) {
                    const response = (error as any).response;
                    if (response?.data?.detail) {
                        errorMsg = typeof response.data.detail === 'string' ? response.data.detail : JSON.stringify(response.data.detail);
                    }
                }
                addToast({ title: "Problema al procesar", description: errorMsg, color: "danger" });
            } finally {
                setIsSubmitting(false);
            }
        } else {
            setIsPaymentModalOpen(true);
        }
    };

    return (
        <div className="font-sans antialiased selection:bg-primary/20 selection:text-primary relative bg-[#080e17] text-[#dde2f0] min-h-screen">
            {/* Ambient Backdrop Glow */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
                <div className="absolute -top-32 left-1/4 w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 right-0 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6 sm:gap-8">
                {/* 1. HERO CABECERA */}
                <section className="bg-[#11161d] rounded-[2rem] p-6 sm:p-8 border border-white/[0.03] shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-8 lg:gap-12">
                    {/* Ambient Background Glow */}
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                    {/* LADO IZQUIERDO: Información del Músico */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 lg:w-[45%] relative z-10">
                        
                        {/* Foto de Perfil con Marco Cyan */}
                        <div className="relative flex-shrink-0">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl p-[2px] bg-gradient-to-b from-cyan-400 to-cyan-500/40">
                                <img 
                                    alt={linkData.musician.stage_name} 
                                    className="w-full h-full rounded-[14px] object-cover object-top bg-[#080e17]" 
                                    src={resolveUploadUrl(linkData.musician.profile_image_url) || "https://ui-avatars.com/api/?name=M"} 
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-cyan-400 text-[#080e17] p-1.5 rounded-full shadow-lg border-4 border-[#11161d] flex items-center justify-center">
                                <Icon icon="lucide:check" className="w-4 h-4 stroke-[4]" />
                            </div>
                        </div>

                        {/* Detalles e Insignias */}
                        <div className="space-y-4 min-w-0 flex-1 text-center sm:text-left mt-2 sm:mt-0">
                            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">{linkData.musician.stage_name}</h2>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 border border-cyan-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-cyan-400/5">
                                    <Icon icon="lucide:check-circle-2" className="w-3.5 h-3.5" /> Oficial
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-center sm:justify-start gap-3 text-sm text-slate-400 flex-wrap">
                                <div className="flex items-center text-amber-400 font-bold gap-1.5 bg-[#1a1f26] px-2.5 py-1 rounded-lg border border-white/5 shadow-sm">
                                    <Icon icon="lucide:star" className="w-4 h-4 fill-amber-400 text-amber-400" /> 
                                    <span>{linkData.musician.rating_avg || '5.0'}</span>
                                </div>
                                <span className="text-slate-600 font-bold">•</span>
                                <span className="text-slate-300 font-medium">
                                    {linkData.musician.rating_count ? `${linkData.musician.rating_count} presentaciones realizadas` : 'Nuevo en la plataforma'}
                                </span>
                            </div>

                            {linkData.musician.genres && linkData.musician.genres.length > 0 && (
                                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-1">
                                    {linkData.musician.genres.slice(0, 3).map((genre, i) => (
                                        <span key={i} className="text-xs font-medium text-slate-300 bg-[#1a1f26] border border-white/5 px-3.5 py-1.5 rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors cursor-default">
                                            <Icon icon={i === 0 ? "lucide:music" : i === 1 ? "lucide:heart" : "lucide:sparkles"} className={`w-3.5 h-3.5 ${i % 2 === 0 ? 'text-cyan-400' : 'text-slate-400'}`} /> {genre}
                                        </span>
                                    ))}
                                </div>
                            )}
                            
                            {linkData.musician.portfolio_description && (
                                <div className="text-sm text-slate-400 leading-relaxed pr-0 sm:pr-4 pt-2">
                                    <p className="line-clamp-2">{linkData.musician.portfolio_description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LADO DERECHO: Portafolio Visual y Multimedia */}
                    <div className="flex flex-col lg:w-[55%] relative z-10 space-y-4">
                        
                        {/* Pestañas (Tabs Row) */}
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-4 sm:gap-6">
                                <button className="text-xs font-bold text-slate-900 bg-cyan-400 px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_-3px_rgba(0,210,238,0.4)]">
                                    <Icon icon="lucide:play" className="w-4 h-4 fill-slate-900" /> Videos
                                </button>
                                <button className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5">
                                    <Icon icon="lucide:image" className="w-4 h-4" /> Fotos
                                </button>
                                <button className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5">
                                    <Icon icon="lucide:star" className="w-4 h-4 fill-amber-400 text-amber-400" /> Comentarios
                                    <span className="bg-amber-400/10 text-amber-400 px-1.5 rounded text-[10px] ml-0.5 border border-amber-400/20">{linkData.musician.rating_avg || '5.0'}</span>
                                </button>
                            </div>
                            <div className="hidden sm:flex text-xs font-medium text-slate-400">
                                En {linkData.musician.location_city || 'Ayacucho'}
                            </div>
                        </div>

                        {/* Contenedor Multimedia Principal */}
                        <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-[#0c1017] shadow-inner group">
                            {linkData.musician.showreel_video_url ? (
                                <video 
                                    src={resolveUploadUrl(linkData.musician.showreel_video_url) || undefined} 
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                                    poster={linkData.musician.gallery_images?.[0] ? resolveUploadUrl(linkData.musician.gallery_images[0]) || undefined : undefined}
                                />
                            ) : (linkData.musician.gallery_images && linkData.musician.gallery_images.length > 0) ? (
                                <img 
                                    src={resolveUploadUrl(linkData.musician.gallery_images[0]) || undefined} 
                                    alt="Galería del Artista" 
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                    <Icon icon="lucide:music" className="w-12 h-12 text-white/10" />
                                </div>
                            )}
                            
                            {/* Superposiciones (Badges Flotantes) */}
                            <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex gap-2">
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-lg backdrop-blur-md">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> EN VIVO
                                </span>
                                <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2.5 py-1 rounded-md border border-white/10 hidden sm:flex items-center">
                                    Plaza Mayor Huamanga
                                </span>
                            </div>
                            
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(0,210,238,0.5)] cursor-pointer pointer-events-auto hover:scale-110 transition-transform">
                                    <Icon icon="lucide:play" className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-900 text-slate-900 ml-1" />
                                </div>
                            </div>

                            <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                                <span className="bg-black/70 backdrop-blur-md text-cyan-300 text-[10px] font-medium px-3 py-1.5 rounded-md border border-white/10 flex items-center gap-1.5">
                                    <Icon icon="lucide:music" className="w-3 h-3" /> En Vivo en Huamanga • 7 músicos
                                </span>
                            </div>

                            <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 hidden sm:block">
                                <span className="bg-cyan-400 text-slate-900 text-[9px] font-black tracking-wider px-2.5 py-1.5 rounded-md shadow-sm">
                                    4K AUDIO REAL
                                </span>
                            </div>
                        </div>
                        
                        {/* Miniaturas de galería (Opcional, si hay más imágenes) */}
                        {linkData.musician.gallery_images && linkData.musician.gallery_images.length > 1 && (
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
                                {linkData.musician.gallery_images.slice(1, 6).map((img, i) => (
                                    <img key={i} src={resolveUploadUrl(img) || undefined} alt="Miniatura" className="rounded-lg aspect-video object-cover w-full shadow-sm border border-white/5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer" />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* 2. CUERPO CENTRAL */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* COLUMNA IZQUIERDA: Acordeones */}
                    <section className="lg:col-span-7 space-y-4">
                        
                        {/* PASO 1 */}
                        <div className={`bg-[#161c25]/72 backdrop-blur-xl rounded-3xl transition-all duration-300 overflow-hidden shadow-2xl relative ${activeStep === 1 ? 'border border-primary/45' : 'border border-white/10'}`}>
                            <div className="p-5 sm:p-6 flex items-center justify-between cursor-pointer border-b border-white/[0.08] bg-[#111824]" onClick={() => goToStep(1)}>
                                <div className="flex items-center space-x-3.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold ${activeStep === 1 ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_15px_-3px_rgba(0,210,238,0.35)]' : 'bg-white/5 text-slate-300 border-white/10'}`}>
                                        <Icon icon="lucide:calendar" className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className={`text-base font-extrabold flex items-center gap-2 ${activeStep === 1 ? 'text-white' : 'text-slate-200'}`}>1. Datos del Evento</h3>
                                        <p className="text-xs text-slate-400">Cuándo y dónde será la presentación</p>
                                    </div>
                                </div>
                                {activeStep === 1 && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-primary text-[11px] font-bold px-2.5 py-1 bg-primary/10 rounded-full border border-primary/25">Paso actual</span>
                                    </div>
                                )}
                            </div>
                            
                            {activeStep === 1 && (
                                <div className="p-6 sm:p-7 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                <Icon icon="lucide:calendar-days" className="w-3.5 h-3.5 text-primary" /> Fecha de la presentación <span className="text-primary">*</span>
                                            </label>
                                            <input 
                                                className="bg-[#0e141d]/88 border border-white/11 w-full rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                                type="date" 
                                                value={eventDate} 
                                                onChange={(e) => setEventDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-primary" /> Hora aproximada <span className="text-primary">*</span>
                                            </label>
                                            <input 
                                                className="bg-[#0e141d]/88 border border-white/11 w-full rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                                type="time" 
                                                value={startTime} 
                                                onChange={(e) => setStartTime(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <Icon icon="lucide:sparkles" className="w-3.5 h-3.5 text-primary" /> Tipo de evento (ej. Cumpleaños, Boda) <span className="text-primary">*</span>
                                        </label>
                                        <input 
                                            type="text"
                                            className="bg-[#0e141d]/88 border border-white/11 w-full rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                            value={eventType}
                                            onChange={(e) => setEventType(e.target.value)}
                                            placeholder="Ej. Cumpleaños, Boda"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <Icon icon="lucide:map-pin" className="w-3.5 h-3.5 text-primary" /> Ubicación del evento <span className="text-primary">*</span>
                                        </label>
                                        <div className="bg-[#0e141d]/88 border border-white/11 rounded-xl overflow-hidden">
                                            <LocationMapPickerField value={location} onChange={setLocation} />
                                        </div>
                                    </div>

                                    
                                    
                                    <div className="pt-2 flex justify-end">
                                        <button 
                                            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-cyan-400 hover:from-cyan-300 hover:to-primary text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer" 
                                            onClick={() => goToStep(2)} 
                                            type="button"
                                        >
                                            <span>Continuar al Paso 2: Datos personales</span>
                                            <Icon icon="lucide:arrow-right" className="w-4 h-4 stroke-[3]" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PASO 2 */}
                        <div className={`bg-[#161c25]/72 backdrop-blur-xl rounded-3xl transition-all duration-300 overflow-hidden shadow-2xl relative ${activeStep === 2 ? 'border border-primary/45' : 'border border-white/10'}`}>
                            <div className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]" onClick={() => { if (completedSteps.has(1)) goToStep(2) }}>
                                <div className="flex items-center space-x-3.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold ${activeStep === 2 ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_15px_-3px_rgba(0,210,238,0.35)]' : 'bg-white/5 text-slate-300 border-white/10'}`}>
                                        <Icon icon="lucide:user" className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className={`text-base font-bold flex items-center gap-2 ${activeStep === 2 ? 'text-white' : 'text-slate-200'}`}>2. Tus datos personales</h3>
                                        <p className="text-xs text-slate-400">Información de contacto del contratista</p>
                                    </div>
                                </div>
                            </div>
                            
                            {activeStep === 2 && (
                                <div className="p-6 sm:p-7 space-y-5 border-t border-white/10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre y Apellidos completos <span className="text-primary">*</span></label>
                                            <input 
                                                className="bg-[#0e141d]/88 border border-white/11 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                                placeholder="Ej. Carlos Mendoza" 
                                                type="text" 
                                                value={fullname}
                                                onChange={(e) => setFullname(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Correo electrónico <span className="text-primary">*</span></label>
                                            <input 
                                                className={`bg-[#0e141d]/88 border ${identityStatus === 'self' ? 'border-danger text-danger' : 'border-white/11'} w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none`}
                                                placeholder="ejemplo@gmail.com" 
                                                type="email" 
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setIdentityStatus("idle"); setIdentityMessage(null); }}
                                                onBlur={handleEmailBlur}
                                            />
                                            {isCheckingIdentity && <span className="text-[10px] text-primary mt-1 block">Verificando...</span>}
                                            {identityStatus === 'self' && <span className="text-[10px] text-danger mt-1 block">{identityMessage}</span>}
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Teléfono celular / WhatsApp <span className="text-primary">*</span></label>
                                            <input 
                                                className="bg-[#0e141d]/88 border border-white/11 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                                placeholder="966 123 456" 
                                                type="tel" 
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Documento de Identidad (DNI/CE)</label>
                                            <input 
                                                className="bg-[#0e141d]/88 border border-white/11 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                                maxLength={12} 
                                                placeholder="8 dígitos" 
                                                type="text" 
                                                value={documentNumber}
                                                onChange={(e) => setDocumentNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {identityStatus === 'exists_verified' && (
                                        <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 flex flex-col gap-3">
                                            <p className="text-sm font-medium text-primary-400">
                                                {identityMessage || "Este correo ya está registrado."} Hemos enviado un código a tu correo para verificar tu identidad.
                                            </p>
                                            <input 
                                                className="bg-[#0e141d]/88 border border-primary/30 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none" 
                                                placeholder="Código OTP (000000)" 
                                                maxLength={6}
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                            />
                                            <button type="button" onClick={handleSendOtp} className="text-xs text-primary self-start font-semibold">Reenviar código</button>
                                        </div>
                                    )}

                                    {identityStatus === 'exists_unverified' && (
                                        <div className="bg-warning/10 p-4 rounded-xl border border-warning/20 flex flex-col gap-3">
                                            <p className="text-sm font-medium text-warning-400">
                                                {identityMessage || "Este correo ya está registrado pero requiere contraseña."}
                                            </p>
                                            <input 
                                                className="bg-[#0e141d]/88 border border-warning/30 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none" 
                                                type="password"
                                                placeholder="Tu contraseña de Chivapp" 
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    

                                    <div className="pt-3 flex justify-between items-center">
                                        <button className="text-xs text-slate-400 hover:text-white px-3 py-2 font-semibold transition-colors" onClick={() => goToStep(1)} type="button">
                                            ← Volver al paso 1
                                        </button>
                                        <button 
                                            className="px-7 py-3 rounded-2xl bg-gradient-to-r from-primary to-cyan-400 hover:from-cyan-300 hover:to-primary text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-[0_0_15px_-3px_rgba(0,210,238,0.35)] transition-all" 
                                            onClick={() => goToStep(3)} 
                                            type="button"
                                        >
                                            <span>Continuar al Paso 3: Pago</span>
                                            <Icon icon="lucide:arrow-right" className="w-4 h-4 stroke-[3]" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PASO 3 */}
                        <div className={`bg-[#161c25]/72 backdrop-blur-xl rounded-3xl transition-all duration-300 overflow-hidden shadow-2xl relative ${activeStep === 3 ? 'border border-primary/45' : 'border border-white/10'}`}>
                            <div className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]" onClick={() => { if (completedSteps.has(2)) goToStep(3) }}>
                                <div className="flex items-center space-x-3.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold ${activeStep === 3 ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_15px_-3px_rgba(0,210,238,0.35)]' : 'bg-white/5 text-slate-300 border-white/10'}`}>
                                        <Icon icon="lucide:credit-card" className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className={`text-base font-bold flex items-center gap-2 ${activeStep === 3 ? 'text-white' : 'text-slate-200'}`}>3. Confirmación y Pago de Seña</h3>
                                        <p className="text-xs text-slate-400">Revisa el contrato y reserva</p>
                                    </div>
                                </div>
                            </div>
                            
                            {activeStep === 3 && (
                                <div className="p-6 sm:p-7 space-y-6 border-t border-white/10">
                                    <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 text-xs text-slate-300 space-y-2.5">
                                        <div className="font-extrabold text-white flex items-center gap-2 text-sm">
                                            <Icon icon="lucide:file-text" className="w-4 h-4 text-primary" /> Términos del Contrato Rápido:
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                                            <li>La seña asegura la fecha en la agenda exclusiva de <strong className="text-primary font-bold">{linkData.musician.stage_name}</strong>.</li>
                                            <li>Llegada garantizada a la hora coordinada con vestimenta completa.</li>
                                            <li>Confirmación inmediata enviada por correo.</li>
                                        </ul>
                                        <label className="flex items-center gap-2.5 pt-2 text-slate-200 cursor-pointer select-none">
                                            <input 
                                                checked={termsAccepted} 
                                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                                className="w-4 h-4 rounded text-primary focus:ring-0 bg-slate-900 border-white/20" 
                                                type="checkbox" 
                                            />
                                            <span className="text-xs">He leído y acepto los términos del contrato de actuación.</span>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-3">Selecciona medio de pago para la seña</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className={`relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'yape' ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/30 hover:border-white/20'}`}>
                                                <input checked={paymentMethod === 'yape'} onChange={() => setPaymentMethod('yape')} className="sr-only" name="payment_method" type="radio" value="yape" />
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`font-bold text-xs ${paymentMethod === 'yape' ? 'text-white' : 'text-slate-300'}`}>Mercado Pago (Yape / Tarjetas)</span>
                                                    <Icon icon="lucide:smartphone" className={`w-4 h-4 ${paymentMethod === 'yape' ? 'text-primary' : 'text-slate-400'}`} />
                                                </div>
                                                <span className="text-[11px] text-slate-400">Pago seguro con QR, Débito o Crédito</span>
                                                {paymentMethod === 'yape' && <div className="mt-2 text-primary text-[10px] font-black uppercase tracking-wider">Recomendado</div>}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-black/80 to-[#0A1220] border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div>
                                            <span className="text-xs text-slate-400 block font-medium">Total a pagar ahora:</span>
                                            <span className="text-3xl font-black text-primary">{formatCurrency(linkData.price)}</span>
                                        </div>
                                        <button 
                                            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-cyan-300 hover:from-cyan-300 hover:to-primary text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50" 
                                            id="btn-confirm-booking" 
                                            type="button"
                                            onClick={handlePayAndConfirm}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? <Spinner size="sm" color="current" /> : <Icon icon="lucide:lock" className="w-4 h-4 stroke-[3]" />}
                                            <span>Pagar y Confirmar</span>
                                        </button>
                                    </div>
                                    <div className="flex justify-start">
                                        <button className="text-xs text-slate-400 hover:text-white px-3 py-1 font-semibold transition-colors" onClick={() => goToStep(2)} type="button">
                                            ← Volver al paso 2
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </section>

                    {/* COLUMNA DERECHA: Resumen */}
                    <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
                        <div className="bg-[#161c25]/72 backdrop-blur-xl rounded-3xl p-6 border border-primary/30 shadow-2xl relative space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                                    <Icon icon="lucide:receipt" className="w-4 h-4 text-primary" /> Resumen de tu Reserva
                                </h3>
                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Icon icon="lucide:check" className="w-3 h-3" /> Tarifa oficial
                                </span>
                            </div>
                            
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1424] to-[#141f33] border border-primary/30 shadow-lg relative overflow-hidden flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-xs uppercase tracking-wider text-slate-300 font-bold block">Seña para asegurar fecha:</span>
                                    <span className="text-[12px] text-emerald-400 font-semibold flex items-center gap-1.5">
                                        <Icon icon="lucide:shield-check" className="w-3.5 h-3.5" /> Saldo a pagar el día del show
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl sm:text-4xl font-black text-primary tracking-tight drop-shadow-sm flex items-baseline justify-end gap-1">
                                        {formatCurrency(linkData.price)}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                    <Icon icon="lucide:lock" className="w-4 h-4" />
                                </div>
                                <div className="text-xs">
                                    <span className="font-extrabold text-white block">Reserva 100% Protegida</span>
                                    <span className="text-slate-300 text-[11px]">Contrato directo garantizado por Chivapp</span>
                                </div>
                            </div>
                        </div>
                        

                    </aside>
                </div>
            </div>

            {booking && (
                <BookingMercadoPagoModal 
                    isOpen={isPaymentModalOpen} 
                    onClose={() => setIsPaymentModalOpen(false)} 
                    booking={booking} 
                    amount={linkData.price} 
                    onSuccess={() => {
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
