import { useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { useApp } from "../context";

/* Uses the browser's built-in BarcodeDetector (Chrome/Edge on Android and desktop,
   Safari 17+): no extra library. Where it is missing, the Scan button is hidden. */
interface Detector { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> }
declare global {
  interface Window { BarcodeDetector?: new (options: { formats: string[] }) => Detector }
}

export const canScan = () => typeof window !== "undefined" && "BarcodeDetector" in window
  && Boolean(navigator.mediaDevices?.getUserMedia);

export default function BarcodeScanner({ show, onDetected, onClose }:
  { show: boolean; onDetected: (code: string) => void; onClose: () => void }) {
  const { t } = useApp();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show || !window.BarcodeDetector) return;
    const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a"] });
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const scan = async () => {
          if (stopped || !video.current) return;
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes.length) return onDetected(codes[0].rawValue);
          timer = window.setTimeout(scan, 250);
        };
        scan();
      } catch {
        setError(t("cameraError"));
      }
    })();

    return () => {                          // always release the camera
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [show, onDetected, t]);

  return (
    <Modal show={show} onHide={onClose} centered onExited={() => setError("")}>
      <Modal.Header closeButton><Modal.Title as="h5" className="display-face">{t("scanTitle")}</Modal.Title></Modal.Header>
      <Modal.Body>
        {error ? <div className="alert alert-warning mb-0">{error}</div> : (
          <>
            <video ref={video} className="scanner-video" muted playsInline />
            <p className="meta mt-2 mb-0">{t("scanHint")}</p>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
