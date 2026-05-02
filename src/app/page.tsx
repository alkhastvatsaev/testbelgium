"use client";
import React from 'react';
import MapboxView from '@/features/map/components/MapboxView';
import SpotlightSearch from '@/features/dashboard/components/SpotlightSearch';
import LoginOverlay from '@/features/auth/components/LoginOverlay';
import MacroDroidIndicator from '@/features/dashboard/components/MacroDroidIndicator';
import AutoProcessUploads from '@/features/dashboard/components/AutoProcessUploads';
import DesktopOnlyGate from '@/features/app/DesktopOnlyGate';
import { DateProvider } from '@/context/DateContext';

export default function Dashboard() {
  return (
    <DateProvider>
      <DesktopOnlyGate>
        <LoginOverlay>
          <main className="dashboard-layout mode-presentation">
            <SpotlightSearch />
            <MapboxView />
            <MacroDroidIndicator />
            <AutoProcessUploads />
          </main>
        </LoginOverlay>
      </DesktopOnlyGate>
    </DateProvider>
  );
}
