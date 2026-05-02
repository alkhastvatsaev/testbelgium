import React, { useEffect, useRef } from 'react';
import './Waveform.css';

interface WaveformProps {
    color?: string;
    barCount?: number;
    analyser?: AnalyserNode | null;
}

const Waveform: React.FC<WaveformProps> = ({ color = 'white', barCount = 12, analyser }) => {
    const barsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (!analyser) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let animationId: number;

        const update = () => {
            analyser.getByteFrequencyData(dataArray);
            
            // Map the frequencies to the bars. We use lower frequencies generally.
            const step = Math.floor((dataArray.length * 0.5) / barCount); // Focus on lower half of frequencies
            
            barsRef.current.forEach((bar, i) => {
                if (bar) {
                    const value = dataArray[i * step];
                    // Map 0-255 to 10%-100% height
                    const height = 10 + (value / 255) * 90;
                    bar.style.height = `${height}%`;
                }
            });

            animationId = requestAnimationFrame(update);
        };

        update();

        return () => {
            cancelAnimationFrame(animationId);
            // reset heights
            barsRef.current.forEach(bar => {
                if (bar) bar.style.height = '45%';
            });
        };
    }, [analyser, barCount]);

    return (
        <div className="waveform-container flex items-center justify-center gap-[3px] h-full">
            {[...Array(barCount)].map((_, i) => (
                <div 
                    key={i} 
                    ref={(el) => { barsRef.current[i] = el; }}
                    className={`waveform-bar ${!analyser ? 'animate-waveform' : ''}`} 
                    style={{ 
                        backgroundColor: color,
                        animation: analyser ? 'none' : `bounce ${2.0 + Math.random() * 1.5}s ease-in-out ${i * 0.05}s infinite alternate`,
                        height: '45%',
                        width: '4px',
                        borderRadius: '2px',
                        transition: analyser ? 'height 0.05s ease-out' : 'none'
                    }} 
                />
            ))}
        </div>
    );
};

export default Waveform;
