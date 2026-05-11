import React from 'react';

interface Mission {
  id: string;
  client: string;
  type: string;
  address: string;
  eta: string;
  distance: string;
}

interface RightPanelProps {
  selectedMission: Mission | null;
}

export default function RightPanel({ selectedMission }: RightPanelProps) {
  return (
    <div className="w-[450px] h-full bg-white border-l border-slate-200 flex flex-col p-8">
      
    </div>
  );
}
