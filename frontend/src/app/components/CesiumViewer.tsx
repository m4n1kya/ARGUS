'use client';

import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { MapPin } from 'lucide-react';

export default function CesiumViewer() {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

  // VIT Bhopal coordinates
  const pilotDestination = Cesium.Cartesian3.fromDegrees(76.8491, 23.0775, 5000);
  const pilotOrientation = {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-45.0),
  };

  useEffect(() => {
    if (cesiumContainer.current === null) return;

    // Set base URL for Cesium static assets
    (window as any).CESIUM_BASE_URL = '/cesium';

    const v = new Cesium.Viewer(cesiumContainer.current, {
      terrainProvider: undefined,
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      infoBox: false,
      selectionIndicator: false,
      sceneModePicker: false,
      creditContainer: document.createElement('div'), // Hide credits for cleaner UI
    });

    // Fly to VIT Bhopal University Pilot Zone initially
    v.camera.flyTo({
      destination: pilotDestination,
      orientation: pilotOrientation
    });

    setViewer(v);

    return () => {
      v.destroy();
    };
  }, []);

  const handleRecenter = () => {
    if (viewer) {
      viewer.camera.flyTo({
        destination: pilotDestination,
        orientation: pilotOrientation,
        duration: 2.0 // 2 seconds animation
      });
    }
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={cesiumContainer} className="absolute inset-0" />
      
      {/* Floating Recenter Button */}
      <button 
        onClick={handleRecenter}
        className="absolute bottom-8 right-8 z-20 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-xl transition-transform hover:scale-105 backdrop-blur-md flex items-center gap-2"
      >
        <MapPin className="w-5 h-5" /> Recenter to Pilot Zone
      </button>
    </div>
  );
}
