'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'luv-cookie-notice-accepted';

export function PrivacyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(STORAGE_KEY) !== 'true');
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <p className="text-muted-foreground">
          Diese App verwendet nur technisch notwendige Cookies für Anmeldung und Sicherheit. Es findet kein Tracking statt.
          {' '}
          <Link href="/datenschutz" className="text-primary underline-offset-4 hover:underline">
            Datenschutz
          </Link>
        </p>
        <Button
          size="sm"
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, 'true');
            setVisible(false);
          }}
        >
          Verstanden
        </Button>
      </div>
    </div>
  );
}
