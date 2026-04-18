    'use client';
    import React from 'react';
import { useRouter } from 'next/navigation';
    import { motion, useScroll, useTransform, type Variants } from 'framer-motion';

    const containerVariants: Variants = {
    hidden: {},
    show: {
        transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
        },
    },
    };

    const wordVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        },
    },
    };

    const HeroSection = () => {

    const router = useRouter(); // أضف هذا السطر    
    const { scrollY } = useScroll();
    const parallaxY = useTransform(scrollY, [0, 400], [0, -60]);

   const handleStartFree = () => {
        router.push('/dashboard'); // استخدم push بدلاً من redirect
    };

    const title = "Software Startup Incubator Platform";
    const titleWords = title.split(" ");

    const subTitle =
        "Build, launch, and scale your software startup with expert guidance, smart tools, and a collaborative ecosystem designed for ambitious founders.";

    return (
        <div className="relative overflow-hidden bg-white">
        
        {/* --- الخلفية المتحركة (تدرجات هادئة جداً) --- */}
        <div className="absolute inset-0 -z-10 h-full w-full">
            <motion.div 
            animate={{
                x: [0, 20, 0],
                opacity: [0.4, 0.6, 0.4],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-5%] right-[-5%] w-[500px] h-[500px] bg-orange-50 rounded-full blur-[120px]" 
            />
        </div>

        <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            style={{ y: parallaxY }}
            className="flex flex-col items-center mt-10 lg:mt-24 px-4 min-h-[85vh] justify-center"
        >
            {/* Title: استخدام الأسود القاتم مع لمسات البرتقالي */}
            <motion.h1 className="text-5xl sm:text-7xl lg:text-9xl text-center tracking-tighter font-black text-[#0f172a] flex flex-wrap justify-center leading-[0.95]">
            {titleWords.map((word, index) => {
                // تلوين كلمات معينة بالبرتقالي لكسر الجمود
                const isHighlight = word === "Incubator" || word === "Platform";
                return (
                <motion.span
                    key={index}
                    variants={wordVariants}
                    className={`mx-2 ${isHighlight ? 'text-[#f87115]' : 'text-[#0f172a]'}`}
                >
                    {word}
                </motion.span>
                );
            })}
            </motion.h1>

            {/* Sub Title: خط أسود متوسط الوضوح */}
            <motion.p
            variants={wordVariants}
            className="mt-8 text-lg sm:text-xl lg:text-2xl text-center max-w-4xl text-[#334155] font-semibold leading-relaxed"
            >
            {subTitle}
            </motion.p>

            {/* Description: خط أنحف للوصف التفصيلي */}
            <motion.p
            variants={wordVariants}
            className="mt-6 text-base sm:text-lg text-center max-w-2xl text-gray-500 font-medium"
            >
            A digital incubator dedicated to software and tech projects, helping founders
            transform ideas into <span className="text-[#0f172a] font-bold">scalable applications</span>.
            </motion.p>

            {/* Buttons: زر برتقالي بظل أسود خفيف */}
            <motion.div variants={wordVariants} className="mt-12 flex flex-col sm:flex-row gap-4">
            <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "#ea580c" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartFree}
                className="bg-[#f87115] py-5 px-10 rounded-2xl text-white font-black text-xl shadow-[0_20px_50px_rgba(248,113,21,0.3)] transition-all duration-300 uppercase tracking-tight"
            >
                Start for Free
            </motion.button>
            

            </motion.div>

            {/* مؤشر إحصائي بسيط لتعزيز الثقة */}

        </motion.div>
        </div>
    );
    };

    export default HeroSection;