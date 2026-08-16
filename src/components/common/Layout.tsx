import React from 'react';
import { Navigation } from './Navigation';
import { LanguageSelector } from './LanguageSelector';

declare const __APP_VERSION__: string;
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate?: (screen: string) => void;
  currentScreen?: string;
}

export function Layout({ children, onNavigate, currentScreen }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Navigation (gère tout : mobile + desktop) */}
      <Navigation onNavigate={onNavigate} currentScreen={currentScreen} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 pt-10 lg:pt-0">
        {/* Header with Language Selector and Version */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <div className="text-sm text-gray-500 font-medium">
            v{appVersion}
          </div>
          <LanguageSelector />
        </header>
        
        <main className="p-4 md:p-6 lg:p-8 pb-20 lg:pb-8 overflow-y-auto mx-auto max-w-screen-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}
