"use client";

import React, { useEffect, useRef } from 'react';
import './GalaxyButton.css';

interface GalaxyButtonProps {
    text?: string;
    onClick?: () => void;
    className?: string;
    children?: React.ReactNode;
    /**
     * Si false : rend un div (pas de &lt;button&gt;), pour pouvoir imbriquer des contrôles interactifs
     * (ex. lecture) sans HTML invalide ni double zone cliquable.
     */
    asInteractiveButton?: boolean;
}

const GalaxyButton: React.FC<GalaxyButtonProps> = ({
    text,
    onClick,
    className,
    children,
    asInteractiveButton = true,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const surfaceRef = useRef<HTMLElement | null>(null);
    const setSurfaceRef = (el: HTMLButtonElement | HTMLDivElement | null) => {
        surfaceRef.current = el;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const btn = surfaceRef.current;
        if (!canvas || !btn) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width: number, height: number, stars: any[] = [];
        const STAR_COUNT = 6000; // Augmentation pour un effet de galaxie dense et riche
        let speedMultiplier = 1;
        let targetSpeed = 1;

        let targetX: number, targetY: number;
        let currentX: number, currentY: number;

        const COLORS = [
            { r: 255, g: 255, b: 255 }, // Blanc pur (Dominant)
            { r: 255, g: 255, b: 255 }, // Blanc pur
            { r: 248, g: 250, b: 252 }, // Slate 50 (Ice)
            { r: 241, g: 245, b: 249 }, // Slate 100 (Très clair)
            { r: 224, g: 242, b: 254 }, // Sky 100 (Bleu très pâle)
        ];

        const GALAXY_TILT = 1.1;
        const GALAXY_ANGLE = 0.3;

        const initCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            width = btn.offsetWidth;
            height = btn.offsetHeight;
            
            // Ajustement de la résolution du canvas pour éviter le flou/déformation
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            targetX = currentX = width / 2;
            targetY = currentY = height / 2;

            stars = [];
            // On base le rayon sur la largeur car le bouton est très large (70vh)
            const baseRadius = width * 0.75; 

            for (let i = 0; i < STAR_COUNT; i++) {
                let radius;
                if (i < STAR_COUNT * 0.3) {
                    // Cœur de la galaxie (plus dense)
                    radius = Math.sqrt(Math.random()) * (baseRadius * 0.4);
                } else {
                    // Périphérie
                    radius = Math.random() * baseRadius;
                }

                const angle = Math.random() * Math.PI * 2;
                const color = COLORS[Math.floor(Math.random() * COLORS.length)];

                stars.push({
                    radius: radius,
                    angle: angle,
                    // Vitesse angulaire adaptée à la distance pour un effet naturel
                    angularVelocity: (0.001 + Math.random() * 0.002) * (1 / (1 + radius * 0.002)),
                    size: Math.random() * 0.4 + 0.1, // Étoiles légèrement plus marquées
                    opacity: Math.random() * 0.6 + 0.2, // Plus d'éclat
                    twinkleSpeed: Math.random() * 0.02 + 0.01,
                    z: (Math.random() - 0.5) * 60, // Plus de profondeur verticale
                    color: color
                });
            }
        };

        let animationFrameId: number;

        const animate = () => {
            // Utiliser les dimensions réelles pour le clear
            ctx.clearRect(0, 0, width, height);

            currentX += (targetX - currentX) * 0.08;
            currentY += (targetY - currentY) * 0.08;
            speedMultiplier += (targetSpeed - speedMultiplier) * 0.05;

            stars.forEach(star => {
                star.angle += star.angularVelocity * speedMultiplier;

                // Calcul des positions en respectant l'aspect ratio
                let x = Math.cos(star.angle) * star.radius;
                let y = Math.sin(star.angle) * star.radius;
                let z = star.z;

                // Application de l'inclinaison (Tilt)
                let y1 = y * Math.cos(GALAXY_TILT) - z * Math.sin(GALAXY_TILT);
                let z1 = y * Math.sin(GALAXY_TILT) + z * Math.cos(GALAXY_TILT);

                // Application de l'angle de vue
                let x2 = x * Math.cos(GALAXY_ANGLE) - y1 * Math.sin(GALAXY_ANGLE);
                let y2 = x * Math.sin(GALAXY_ANGLE) + y1 * Math.cos(GALAXY_ANGLE);

                const finalX = currentX + x2;
                const finalY = currentY + y2;

                // On dessine seulement si c'est visible (avec une petite marge)
                if (finalX >= -50 && finalX <= width + 50 && finalY >= -50 && finalY <= height + 50) {
                    const depthScale = (z1 + 150) / 150;
                    const finalSize = Math.max(0.1, star.size * depthScale);

                    ctx.beginPath();
                    ctx.arc(finalX, finalY, finalSize, 0, Math.PI * 2);

                    const twinkle = (Math.sin(Date.now() * 0.002 * star.twinkleSpeed) + 1) * 0.5;
                    const alpha = star.opacity * (0.3 + twinkle * 0.7) * Math.min(1, depthScale);

                    const c = star.color;
                    ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(0, alpha)})`;
                    ctx.fill();
                }
            });

            // Update background gradient to follow mouse
            const xPct = (currentX / width) * 100;
            const yPct = (currentY / height) * 100;
            btn.style.background = `radial-gradient(circle at ${xPct}% ${yPct}%, var(--center-glow) 0%, var(--btn-bg) 120%)`;

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseEnter = () => {
            targetSpeed = 4;
        };

        const handleMouseMove = (e: Event) => {
            const me = e as MouseEvent;
            const rect = btn.getBoundingClientRect();
            targetX = me.clientX - rect.left;
            targetY = me.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            targetSpeed = 1;
            targetX = width / 2;
            targetY = height / 2;
        };

        btn.addEventListener('mouseenter', handleMouseEnter);
        btn.addEventListener('mousemove', handleMouseMove);
        btn.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', initCanvas);

        initCanvas();
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            btn.removeEventListener('mouseenter', handleMouseEnter);
            btn.removeEventListener('mousemove', handleMouseMove);
            btn.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', initCanvas);
        };
    }, [asInteractiveButton]);

    const inner = (
        <>
            <canvas ref={canvasRef} id="stars-canvas"></canvas>
            <div className="btn-content">{children || text}</div>
        </>
    );

    return (
        <div className={`galaxy-button-container ${className || ''}`}>
            {asInteractiveButton ? (
                <button ref={setSurfaceRef} type="button" className="premium-btn" onClick={onClick}>
                    {inner}
                </button>
            ) : (
                <div ref={setSurfaceRef} className="premium-btn premium-btn--surface" role="presentation">
                    {inner}
                </div>
            )}
        </div>
    );
};

export default GalaxyButton;
