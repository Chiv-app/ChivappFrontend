import sys

file_path = 'src/components/auth/auth-modal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure framer-motion is imported
if 'import { motion, AnimatePresence } from "framer-motion";' not in content:
    content = content.replace(
        'import { Icon } from "@iconify/react";',
        'import { Icon } from "@iconify/react";\nimport { motion, AnimatePresence } from "framer-motion";\nimport { useState, useEffect } from "react";'
    )

# The component RotatingText
rotating_text_comp = """
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
        <span className="inline-block relative text-cyan-400 w-[140px] text-left">
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
"""

if 'function RotatingText()' not in content:
    # Insert before AuthModal
    content = content.replace('export default function AuthModal(', rotating_text_comp + '\nexport default function AuthModal(')

# Replace the heading
content = content.replace(
    '<h2 className="text-4xl font-extrabold leading-[1.15] mb-5 text-white tracking-tight">\n                                        Encuentra la música perfecta para tu evento\n                                    </h2>',
    '<h2 className="text-4xl font-extrabold leading-[1.15] mb-5 text-white tracking-tight flex flex-wrap gap-x-2">\n                                        <span>Encuentra la música</span>\n                                        <RotatingText />\n                                        <span>para tu evento</span>\n                                    </h2>'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
