import React, { useRef, useState, useEffect } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideActionProps {
  onAction: () => void;
  label?: string;
  icon?: LucideIcon;
  actionText?: string;
  className?: string;
}

export function SlideAction({
  onAction,
  label = "Glisser pour terminer",
  icon: Icon = ArrowRight,
  className,
}: SlideActionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const [isSuccess, setIsSuccess] = useState(false);
  const [bounds, setBounds] = useState({ left: 0, right: 0 });

  const x = useMotionValue(0);

  // Map the x position to opacity to fade out the text as we drag
  const textOpacity = useTransform(x, [0, 150], [1, 0]);

  useEffect(() => {
    if (containerRef.current && knobRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const knobWidth = knobRef.current.offsetWidth;
      setBounds({ left: 0, right: containerWidth - knobWidth - 8 });
    }
  }, []);

  const handleDragEnd = async (event: any, info: any) => {
    if (!containerRef.current || !knobRef.current) return;
    
    const maxDrag = bounds.right;
    
    // Threshold to trigger action (e.g. 75% of max drag)
    if (info.offset.x > maxDrag * 0.75) {
      setIsSuccess(true);
      await controls.start({ x: maxDrag, transition: { type: "spring", stiffness: 300, damping: 25 } });
      onAction();
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      // Reset after some time if needed, but usually we unmount or navigate
      const timer = setTimeout(() => {
        setIsSuccess(false);
        controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 25 } });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, controls]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-[72px] w-full items-center overflow-hidden rounded-[36px] p-2",
        "bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {/* Glossy overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-gradient-to-b from-white/40 to-transparent opacity-50" />

      {/* Shimmer text effect */}
      <motion.div
        style={{ opacity: textOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center pl-10"
      >
        <span className="font-semibold tracking-wide text-slate-800/60 mix-blend-overlay text-[15px]">
          {label}
        </span>
        
        {/* Animated shimmer over text */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-[shimmer_2.5s_infinite] w-[200%] mix-blend-overlay" />
      </motion.div>

      <motion.div
        ref={knobRef}
        drag={isSuccess ? false : "x"}
        dragConstraints={bounds}
        dragElastic={0.02}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        style={{ x }}
        className={cn(
          "relative z-10 flex h-[56px] w-[56px] cursor-grab items-center justify-center rounded-full transition-all duration-500 ease-out active:cursor-grabbing",
          isSuccess 
            ? "bg-emerald-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)]" 
            : "bg-white text-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
        )}
      >
        {/* Inner subtle gradient for knob */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-transparent opacity-50 pointer-events-none" />
        <Icon className={cn("relative z-10 h-6 w-6 transition-transform duration-500", isSuccess ? "scale-110" : "")} />
      </motion.div>
    </div>
  );
}

