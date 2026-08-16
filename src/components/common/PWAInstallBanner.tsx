import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Si déjà installé/vu dans cette session → ne rien faire
    if (sessionStorage.getItem('pwa-banner-installed')) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const alreadyDismissed = sessionStorage.getItem('pwa-banner-dismissed');
    if (alreadyDismissed) return;

    const iosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

    if (iosDevice && isSafari) {
      setIsIOS(true);
      setShowBanner(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setShowBanner(false);
    setDeferredPrompt(null);
    sessionStorage.setItem('pwa-banner-installed', 'true');
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  if (!showBanner || dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      style={{ background: 'transparent' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-w-lg mx-auto rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#1e3a8a', border: '1px solid #2563eb' }}>
        <div className="flex items-start gap-3 p-4">
          <img src="https://static.lumi.new/03/034a4498624c57232c7c8fa83a5df6df.webp" alt="SoplanÉlevage" className="w-14 h-14 rounded-xl flex-shrink-0 object-contain" style={{ background: '#000' }} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">Installer SoplanÉlevage</p>
            <p className="text-blue-200 text-xs mt-0.5 leading-snug">
              {isIOS
                ? 'Appuyez sur le bouton Partager puis "Sur l\'écran d\'accueil"'
                : 'Ajoutez l\'app sur votre écran d\'accueil pour un accès rapide'}
            </p>
            {!isIOS && (
              <button onClick={handleInstall} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#2563eb' }}>
                <Download size={14} />
                Installer
              </button>
            )}
            {isIOS && (
              <div className="mt-2 flex items-center gap-1.5 text-blue-200 text-xs">
                <span>Appuyez sur</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                <span>puis "Sur l'écran d'accueil"</span>
              </div>
            )}
          </div>
          <button onClick={handleDismiss} className="p-1 text-blue-300 hover:text-white flex-shrink-0 mt-0.5 cursor-pointer" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}