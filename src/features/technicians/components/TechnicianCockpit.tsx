import React, { useState } from 'react';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";

interface Mission {
  id: string;
  client: string;
  type: string;
  address: string;
  eta: string;
  distance: string;
}

const mockMissions: Mission[] = devUiPreviewEnabled ? [
  {
    id: "1",
    client: "Jean Dupont",
    type: "Porte Claquée",
    address: "Rue Neuve 12, 1000 Bruxelles",
    eta: "10 min",
    distance: "2.3 km"
  },
  {
    id: "2",
    client: "Marie Lambert",
    type: "Perte de Clés",
    address: "Avenue Louise 45, 1050 Ixelles",
    eta: "25 min",
    distance: "6.1 km"
  }
] : [];

export default function TechnicianCockpit() {
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  return (
    <div className="w-screen h-screen flex bg-slate-900 overflow-hidden font-sans">
      <LeftPanel />
      
      <CenterPanel 
        missions={mockMissions} 
        onSelectMission={setSelectedMission} 
        selectedMissionId={selectedMission?.id} 
      />
      
      <RightPanel 
        selectedMission={selectedMission} 
      />
    </div>
  );
}
