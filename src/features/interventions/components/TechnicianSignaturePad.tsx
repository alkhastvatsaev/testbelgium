"use client";

import SignatureCanvas from "react-signature-canvas";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type TechnicianSignaturePadHandle = {
  clear: () => void;
  getPngDataUrl: () => string | null;
};

const TechnicianSignaturePad = forwardRef<TechnicianSignaturePadHandle>(function TechnicianSignaturePad(
  _props,
  ref,
) {
  const [mounted, setMounted] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => setMounted(true), []);

  useImperativeHandle(ref, () => ({
    clear: () => sigRef.current?.clear(),
    getPngDataUrl: () => {
      const pad = sigRef.current;
      if (!pad || pad.isEmpty()) return null;
      return pad.getTrimmedCanvas().toDataURL("image/png");
    },
  }));

  if (!mounted) {
    return (
      <div
        data-testid="technician-signature-pad"
        className="h-[200px] animate-pulse rounded-[18px] bg-slate-100"
        aria-hidden
      />
    );
  }

  return (
    <div
      data-testid="technician-signature-pad"
      className="touch-none overflow-hidden rounded-[18px] border border-black/[0.08] bg-white shadow-inner"
    >
      <SignatureCanvas
        ref={sigRef}
        canvasProps={{
          className: "h-[200px] w-full touch-none",
          "aria-label": "Signature client",
        }}
        penColor="#0f172a"
        backgroundColor="rgba(255,255,255,1)"
      />
    </div>
  );
});

export default TechnicianSignaturePad;
