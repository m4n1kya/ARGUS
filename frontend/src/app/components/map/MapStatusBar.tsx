import { SatelliteMetadata } from '../../services/satelliteProvider';

interface MapStatusBarProps {
  satelliteStatus: SatelliteMetadata | null;
  locationStatus: 'OFF' | 'ACTIVE' | 'DENIED' | 'UNAVAILABLE';
  incidentCount: number;
}

export default function MapStatusBar({ satelliteStatus, locationStatus, incidentCount }: MapStatusBarProps) {
  
  const renderSatStatus = () => {
    if (!satelliteStatus) return <span className="text-white/30">INITIALIZING...</span>;
    if (satelliteStatus.status === 'FETCHING') return <span className="text-blue-400 animate-pulse">UPDATING...</span>;
    if (satelliteStatus.status === 'UNAVAILABLE') return <span className="text-red-400">UNAVAILABLE</span>;
    
    if (satelliteStatus.daysOld !== null) {
      if (satelliteStatus.daysOld === 0) return <span className="text-green-400">TODAY</span>;
      if (satelliteStatus.daysOld === 1) return <span className="text-green-400">1 DAY AGO</span>;
      if (satelliteStatus.status === 'CURRENT') return <span className="text-green-400">{satelliteStatus.daysOld} DAYS AGO</span>;
      return <span className="text-yellow-400">{satelliteStatus.daysOld} DAYS AGO</span>;
    }
    
    return <span className="text-white/50">UNKNOWN</span>;
  };

  const renderLocStatus = () => {
    if (locationStatus === 'ACTIVE') return <span className="text-green-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_#4ade80]"></div>ACTIVE</span>;
    if (locationStatus === 'OFF') return <span className="text-white/40 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>OFF</span>;
    return <span className="text-red-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>{locationStatus}</span>;
  };

  return (
    <div className="absolute bottom-12 left-4 z-[1000] flex flex-col gap-1.5 font-mono text-[10px] tracking-widest uppercase pointer-events-none">
      
      <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded flex items-center gap-3 w-fit">
        <span className="text-white/40 font-bold">MAP</span>
        <span className="text-green-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_#4ade80]"></div>ONLINE</span>
      </div>

      <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded flex items-center gap-3 w-fit">
        <span className="text-white/40 font-bold">SATELLITE</span>
        {renderSatStatus()}
      </div>

      <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded flex items-center gap-3 w-fit">
        <span className="text-white/40 font-bold">LOCATION</span>
        {renderLocStatus()}
      </div>

      <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded flex items-center gap-3 w-fit">
        <span className="text-white/40 font-bold">INCIDENTS</span>
        <span className="text-white/90">{incidentCount} LOADED</span>
      </div>

    </div>
  );
}
