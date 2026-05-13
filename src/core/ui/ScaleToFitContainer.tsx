"use client";

import React, { useEffect, useRef, useState } from "react";

type ScaleToFitContainerProps = {
  children: React.ReactNode;
  /** Largeur de référence (ex: 1440 pour le Macbook Air 13") */
  targetWidth?: number;
  /** Hauteur de référence (ex: 900 pour le Macbook Air 13") */
  targetHeight?: number;
  /** Le fond du conteneur parent (lettrebox) */
  backgroundColor?: string;
  className?: string;
};

/**
 * Premium Scale-to-Fit Container (Letterbox)
 *
 * Garde le layout EXACTEMENT aux proportions cibles (ex: 1440x900)
 * et le redimensionne de façon fluide (scale) sans JAMAIS casser la mise en page.
 *
 * Idéal pour les interfaces "Dashboard/HUD" où le positionnement absolu et
 * les ratios sont primordiaux. Similaire au comportement de Figma en mode Prototype.
 */
export default function ScaleToFitContainer({
  children,
  targetWidth = 1440,
  targetHeight = 900,
  backgroundColor = "transparent",
  className = "",
}: ScaleToFitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;

      // Calcul du facteur d'échelle pour faire rentrer exactement le 1440x900 dans l'écran
      const scaleX = clientWidth / targetWidth;
      const scaleY = clientHeight / targetHeight;

      // On prend le plus petit pour s'assurer que tout rentre (mode "contain")
      const newScale = Math.min(scaleX, scaleY);
      
      // On peut ajouter une limite max si on ne veut pas que ça devienne gigantesque
      // sur un écran 4K, mais pour l'immersion, on laisse scaler.
      // const clampedScale = Math.min(newScale, 1.2); 
      
      setScale(newScale);
    };

    // Calcul initial
    handleResize();

    // Observer pour les changements fluides
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [targetWidth, targetHeight]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundColor }}
    >
      {/* Conteneur "Verrouillé" à la résolution exacte */}
      <div
        className="relative flex-shrink-0 origin-center transition-transform duration-75 ease-linear"
        style={{
          width: targetWidth,
          height: targetHeight,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
