import { heroui } from "@heroui/react";

const config = {
    darkMode: "class",
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
                mono: ["var(--font-geist-mono)", "monospace"],
            },
            colors: {
                "primary-text": "var(--color-primary-text)",
                "secondary-text": "var(--color-secondary-text)",
                "success-text": "var(--color-success-text)",
                "warning-text": "var(--color-warning-text)",
                "danger-text": "var(--color-danger-text)",
            },
            borderRadius: {
                "4xl": "2rem",
            },
            maxWidth: {
                content: "80rem",
                footer: "75rem",
            },
            boxShadow: {
                soft: "0 2px 12px -4px rgb(16 24 32 / 0.06)",
                elevated: "0 16px 40px -12px rgb(16 24 32 / 0.16)",
                glow: "0 8px 30px -6px rgb(70 192 217 / 0.45)",
                "glow-lg": "0 20px 60px -12px rgb(70 192 217 / 0.4)",
            },
            backgroundImage: {
                "gradient-brand":
                    "linear-gradient(135deg, #6FD3E6 0%, #46C0D9 45%, #3A6169 100%)",
                "gradient-radial-brand":
                    "radial-gradient(120% 120% at 20% 0%, rgba(70,192,217,0.22) 0%, rgba(70,192,217,0) 55%)",
                "gradient-surface":
                    "linear-gradient(160deg, rgba(255,255,255,0.9) 0%, rgba(245,247,248,0.6) 100%)",
            },
        },
    },

    plugins: [
        heroui({
            themes: {
                light: {
                    colors: {
                        background: "#F5F7F8",
                        foreground: "#101826",
                        primary: {
                            50: "#F0FBFD",
                            100: "#DFF6FA",
                            200: "#C3EEF5",
                            300: "#9EE3EF",
                            400: "#6FD3E6",
                            500: "#46C0D9",
                            600: "#2FA3BE",
                            700: "#227F97",
                            800: "#1D6478",
                            900: "#1A4F5F",
                            DEFAULT: "#46C0D9",
                            foreground: "#101826",
                        },
                        secondary: {
                            50: "#EFF5F5",
                            100: "#D6E4E5",
                            200: "#AEC9CB",
                            300: "#7FA8AB",
                            400: "#588488",
                            500: "#3A6169",
                            600: "#2E4F55",
                            700: "#243D42",
                            800: "#1A2C2F",
                            900: "#101C1E",
                            DEFAULT: "#3A6169",
                            foreground: "#FFFFFF",
                        },
                        focus: "#1D6478",
                        content1: "#FFFFFF",
                        content2: "#F5F7F8",
                        content3: "#EBEDEF",
                        content4: "#E2E5E8",
                        default: {
                            50: "#FAFAFA",
                            100: "#F4F4F5",
                            200: "#E4E4E7",
                            300: "#D4D4D8",
                            400: "#63636B",
                            500: "#52525B",
                            600: "#3F3F46",
                            700: "#27272A",
                            800: "#18181B",
                            900: "#0F1213",
                            DEFAULT: "#D4D4D8",
                            foreground: "#101826",
                        },
                        success: {
                            DEFAULT: "#22C55E",
                            foreground: "#101826",
                        },
                        warning: {
                            DEFAULT: "#F59E0B",
                            foreground: "#101826",
                        },
                        danger: {
                            DEFAULT: "#DC2626",
                            foreground: "#FFFFFF",
                        },
                    },
                    layout: {
                        radius: {
                            small: "0.5rem",
                            medium: "0.75rem",
                            large: "2rem",
                        },
                    },
                },
                dark: {
                    colors: {
                        background: "#0B0F14",
                        foreground: "#F5F7F8",
                        primary: {
                            50: "#F0FBFD",
                            100: "#DFF6FA",
                            200: "#C3EEF5",
                            300: "#9EE3EF",
                            400: "#6FD3E6",
                            500: "#46C0D9",
                            600: "#2FA3BE",
                            700: "#227F97",
                            800: "#1D6478",
                            900: "#1A4F5F",
                            DEFAULT: "#46C0D9",
                            foreground: "#0B0F14",
                        },
                        secondary: {
                            50: "#EFF5F5",
                            100: "#D6E4E5",
                            200: "#AEC9CB",
                            300: "#7FA8AB",
                            400: "#7FA8AB",
                            500: "#3A6169",
                            600: "#2E4F55",
                            700: "#243D42",
                            800: "#1A2C2F",
                            900: "#101C1E",
                            DEFAULT: "#3A6169",
                            foreground: "#FFFFFF",
                        },
                        focus: "#46C0D9",
                        content1: "#141A22",
                        content2: "#1A222C",
                        content3: "#222B36",
                        content4: "#2B3542",
                        default: {
                            50: "#121820",
                            100: "#1A222C",
                            200: "#2A3340",
                            300: "#3F4652",
                            400: "#9A9AA5",
                            500: "#B4B4BE",
                            600: "#C4C4CC",
                            700: "#D4D4D8",
                            800: "#E4E4E7",
                            900: "#0A0D10",
                            DEFAULT: "#3F4652",
                            foreground: "#F5F7F8",
                        },
                        success: {
                            DEFAULT: "#22C55E",
                            foreground: "#0B0F14",
                        },
                        warning: {
                            DEFAULT: "#F59E0B",
                            foreground: "#0B0F14",
                        },
                        danger: {
                            DEFAULT: "#F87171",
                            foreground: "#0B0F14",
                        },
                    },
                    layout: {
                        radius: {
                            small: "0.5rem",
                            medium: "0.75rem",
                            large: "2rem",
                        },
                    },
                },
            },
        }),
    ],
};

export default config;
