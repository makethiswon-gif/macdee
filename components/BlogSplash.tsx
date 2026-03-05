"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BlogSplashProps {
    name: string;
    brandColor: string;
    profileImageUrl?: string;
}

export default function BlogSplash({ name, brandColor, profileImageUrl }: BlogSplashProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const storageKey = `blog_splash_shown_${name}`;
        const alreadyShown = sessionStorage.getItem(storageKey);
        if (alreadyShown) {
            setShow(false);
            return;
        }
        // First visit this session — show splash
        setShow(true);
        sessionStorage.setItem(storageKey, "1");
        const timer = setTimeout(() => setShow(false), 2200);
        return () => clearTimeout(timer);
    }, [name]);

    // Split name + "변호사" into individual characters for scatter
    const nameChars = name.split("");
    const titleChars = " 변호사".split("");
    const allChars = [...nameChars, ...titleChars];

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0A0A]"
                >
                    {/* Ambient glow */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at 50% 50%, ${brandColor}08 0%, transparent 50%)`,
                        }}
                    />

                    {/* Profile photo */}
                    {profileImageUrl && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.3,
                                filter: "blur(8px)",
                                transition: { duration: 0.4 },
                            }}
                            className="mb-6 w-16 h-16 rounded-full overflow-hidden border-2 border-white/10"
                        >
                            <img
                                src={profileImageUrl}
                                alt={name}
                                className="w-full h-full object-cover"
                            />
                        </motion.div>
                    )}

                    {/* Name + 변호사 chars */}
                    <div className="relative flex items-baseline justify-center gap-[2px]">
                        {allChars.map((char, i) => {
                            // Random scatter direction for each character
                            const angle = (Math.random() - 0.5) * 360;
                            const distance = 120 + Math.random() * 200;
                            const exitX = Math.cos((angle * Math.PI) / 180) * distance;
                            const exitY = Math.sin((angle * Math.PI) / 180) * distance;
                            const exitRotate = (Math.random() - 0.5) * 90;
                            const isTitle = i >= nameChars.length;

                            return (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: {
                                            duration: 0.5,
                                            delay: i * 0.08,
                                            ease: [0.22, 1, 0.36, 1],
                                        },
                                    }}
                                    exit={{
                                        opacity: 0,
                                        x: exitX,
                                        y: exitY,
                                        rotate: exitRotate,
                                        scale: 0.3,
                                        filter: "blur(8px)",
                                        transition: {
                                            duration: 0.7,
                                            delay: i * 0.03,
                                            ease: [0.55, 0, 1, 0.45],
                                        },
                                    }}
                                    className={`inline-block tracking-tighter ${isTitle
                                        ? "text-[clamp(0.7rem,2vw,1.1rem)] font-light text-white/40"
                                        : "text-[clamp(1.5rem,5vw,3rem)] font-black text-white"
                                        }`}
                                    style={{
                                        textShadow: isTitle ? "none" : `0 0 80px ${brandColor}30`,
                                    }}
                                >
                                    {char}
                                </motion.span>
                            );
                        })}
                    </div>

                    {/* English subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{
                            opacity: 0.25,
                            y: 0,
                            transition: { duration: 0.4, delay: 0.8 },
                        }}
                        exit={{
                            opacity: 0,
                            y: -20,
                            filter: "blur(4px)",
                            transition: { duration: 0.3 },
                        }}
                        className="mt-6 text-[12px] text-white/20 tracking-[0.25em] uppercase font-light"
                    >
                        Attorney at Law
                    </motion.p>

                    {/* Thin accent line */}
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{
                            scaleX: 1,
                            transition: { duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] },
                        }}
                        exit={{
                            scaleX: 0,
                            opacity: 0,
                            transition: { duration: 0.3 },
                        }}
                        className="absolute mt-48 h-px w-16 origin-center"
                        style={{ background: brandColor }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
