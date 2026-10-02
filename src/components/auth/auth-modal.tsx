"use client";
import Image from "next/image";

import {
    Modal,
    ModalBody,
    ModalContent,
    Chip
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import AppLogo from "@/components/layout/app-logo";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import type { UserRole } from "@/types/api";

export type AuthModalMode = "login" | "register";

type Props = {
    isOpen: boolean;
    mode: AuthModalMode;
    redirect?: string | null;
    oauthError?: string | null;
    defaultRole?: UserRole;
    onOpenChange: (open: boolean) => void;
    onSwitchMode: (mode: AuthModalMode) => void;
    onAuthenticated: (destination: string) => void;
};


const ROTATING_WORDS = ["perfecta", "ideal", "en vivo", "soñada"];

function RotatingText() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((current) => (current + 1) % ROTATING_WORDS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <span className="inline-block relative text-cyan-400 w-[200px] text-left">
            <AnimatePresence mode="wait">
                <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-0 left-0"
                >
                    {ROTATING_WORDS[index]}
                </motion.span>
            </AnimatePresence>
            {/* Invisible spacer to maintain height/width */}
            <span className="invisible">perfecta</span>
        </span>
    );
}

export default function AuthModal({
    isOpen,
    mode,
    redirect,
    oauthError,
    defaultRole,
    onOpenChange,
    onSwitchMode,
    onAuthenticated,
}: Props) {
    const isLogin = mode === "login";

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="5xl"
            backdrop="blur"
            scrollBehavior="inside"
            placement="center"
            hideCloseButton
            classNames={{
                base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-[1000px] rounded-[2.5rem] border border-default-200/60 shadow-2xl bg-content1 max-h-[calc(100dvh-4rem)] sm:max-h-[92dvh] overflow-hidden",
                wrapper: "items-end sm:items-center",
                body: "p-0",
                header: "hidden",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <ModalBody className="p-0">
                        <div className="flex flex-col sm:flex-row w-full min-h-[600px]">
                            {/* Left Column (Brand/Info) */}
                            <div className="hidden sm:flex flex-col justify-between w-[440px] shrink-0 bg-[#0B1221] text-white p-10 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#0a1930] to-[#0B1221] opacity-50 pointer-events-none" />
                                
                                <div className="relative z-10 flex-1 flex flex-col justify-center">
                                    <AppLogo height={32} className="mb-8" color="white" priority />
                                    
                                    <h2 className="text-5xl font-extrabold leading-[1.1] mb-6 text-white tracking-tight flex flex-col gap-2">
                                        <span>Encuentra la música</span>
                                        <RotatingText />
                                        <span>para tu evento</span>
                                    </h2>
                                    
                                    <p className="text-[1.05rem] text-white/80 leading-relaxed font-medium">
                                        Conecta de inmediato con agrupaciones y solistas verificados, cotizaciones claras y pago protegido.
                                    </p>
                                </div>
                                
                                <div className="relative z-10 mt-12 bg-[#131F33]/80 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Icon icon="lucide:shield-check" className="text-cyan-400 text-lg" />
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-default-400">Integraciones oficiales</span>
                                        <span className="text-[11px] font-bold text-cyan-400 ml-auto">100% seguro</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <Icon icon="thesvg-color:mercado-pago" height={20} />
                                        <Icon icon="logos:google-calendar" height={22} />
                                        <Icon icon="logos:whatsapp-icon" height={24} />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Right Column (Form) */}
                            <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 relative">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 text-default-400 hover:text-foreground hover:bg-default-100 rounded-full transition-colors"
                                >
                                    <Icon icon="lucide:x" width={20} />
                                </button>
                                
                                <div className="w-full max-w-sm mx-auto">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                                {isLogin ? "Iniciar sesión" : "Crear cuenta"}
                                            </h3>
                                            <p className="text-sm text-default-500 mt-1">
                                                {isLogin ? "Accede a tu cuenta de Chivapp" : "Comienza gratis en menos de un minuto."}
                                            </p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => onSwitchMode(isLogin ? "register" : "login")}
                                            className="text-sm font-bold text-primary hover:text-primary-600 transition-colors bg-primary/10 px-3 py-1.5 rounded-lg"
                                        >
                                            {isLogin ? "Crear cuenta" : "Iniciar sesión"}
                                        </button>
                                    </div>

                                    {isLogin ? (
                                        <LoginForm
                                            key="login"
                                            redirect={redirect}
                                            oauthError={oauthError}
                                            onSuccess={onAuthenticated}
                                        />
                                    ) : (
                                        <RegisterForm
                                            key={`register-${defaultRole ?? "none"}`}
                                            redirect={redirect}
                                            oauthError={oauthError}
                                            defaultRole={defaultRole}
                                            onSuccess={onAuthenticated}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                )}
            </ModalContent>
        </Modal>
    );
}
