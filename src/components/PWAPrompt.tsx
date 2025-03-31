import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions } from '@fluentui/react-components';
import { Bike } from 'lucide-react';

let deferredPrompt: any = null;

const PWAPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            deferredPrompt = e;
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        deferredPrompt = null;
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <Dialog open={showPrompt} onOpenChange={(_, { open }) => setShowPrompt(open)}>
            <DialogSurface>
                <DialogBody>
                    <DialogTitle>Install Pedal App</DialogTitle>
                    <DialogContent className="py-4">
                        <div className="flex items-center gap-4">
                            <img src="/pwa-512x512.png" alt="Pedal App Logo" className="w-16 h-16 rounded-full" />
                            <div>
                                <p className="text-lg font-semibold">Install Pedal for easier access!</p>
                                <p className="text-subtle mt-1">
                                    Install this app on your device for the best experience and offline access.
                                </p>
                            </div>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={() => setShowPrompt(false)}>
                            Maybe Later
                        </Button>
                        <Button appearance="primary" onClick={handleInstall}>
                            Install
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};

export default PWAPrompt;
