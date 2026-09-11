'use client';

import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { MapPin, Navigation, Crosshair, StopCircle, Layers, Map as MapIcon, Image as ImageIcon } from 'lucide-react';

export default function CesiumViewer() {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const userEntityRef = useRef<Cesium.Entity | null>(null);
  const accuracyEntityRef = useRef<Cesium.Entity | null>(null);

  // Precise VIT Bhopal coordinates (Default)
  const pilotLon = 76.84978;
  const pilotLat = 23.07551;
  const pilotDestination = Cesium.Cartesian3.fromDegrees(pilotLon, pilotLat, 2000);
  
  useEffect(() => {
    if (cesiumContainer.current === null) return;

    (window as any).CESIUM_BASE_URL = '/cesium';

    // Set Ion Token (if available)
    if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
      Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    }

    const v = new Cesium.Viewer(cesiumContainer.current, {
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      infoBox: false,
      selectionIndicator: false,
      sceneModePicker: false,
      creditContainer: document.createElement('div'),
      terrain: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ? 
        Cesium.Terrain.fromWorldTerrain() : undefined,
    });

    // Add Google Maps 2D Satellite with Labels (Asset ID 3830183)
    if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
      Cesium.IonImageryProvider.fromAssetId(3830183)
        .then((provider) => {
          // Remove the default Bing Maps base layer and use Google Maps
          v.imageryLayers.removeAll();
          v.imageryLayers.addImageryProvider(provider);
        })
        .catch((err) => console.warn("Failed to load Google Maps 2D Satellite:", err));
    }

    // Start from space
    v.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(pilotLon, pilotLat, 15000000),
    });

    // Fly in
    v.camera.flyTo({
      destination: pilotDestination,
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-45.0),
      },
      duration: 4.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT
    });

    setViewer(v);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      v.destroy();
    };
  }, []);

  // Fetch hazards
  useEffect(() => {
    if (!viewer) return;

    const fetchHazards = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/hazards');
        const hazards = await response.json();
        
        // Remove old hazards (keep user location entities intact by not using removeAll)
        viewer.entities.values.forEach(entity => {
          if (entity.id.startsWith('hazard-')) {
            viewer.entities.remove(entity);
          }
        });

        const colorMap: Record<string, Cesium.Color> = {
          'pothole': Cesium.Color.RED,
          'garbage': Cesium.Color.YELLOW,
          'construction': Cesium.Color.ORANGE,
          'debris': Cesium.Color.GREEN,
          'exposed_wire': Cesium.Color.BLUE
        };

        hazards.forEach((hazard: any) => {
          viewer.entities.add({
            id: `hazard-${hazard.id}`,
            position: Cesium.Cartesian3.fromDegrees(hazard.lon, hazard.lat),
            point: {
              pixelSize: 15,
              color: colorMap[hazard.hazard_class] || Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          });
        });
      } catch (error) {
        console.warn("Backend unavailable, using cached/empty hazards:", error);
      }
    };

    fetchHazards();
    const interval = setInterval(fetchHazards, 5000);
    return () => clearInterval(interval);
  }, [viewer]);

  const updateUserLocation = (lat: number, lon: number, accuracy: number, heading: number | null) => {
    if (!viewer) return;
    const position = Cesium.Cartesian3.fromDegrees(lon, lat);

    if (!userEntityRef.current) {
      // Create user marker
      userEntityRef.current = viewer.entities.add({
        id: 'user-location',
        position: position as any,
        point: {
          pixelSize: 18,
          color: Cesium.Color.DODGERBLUE,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
      
      // Create accuracy circle
      accuracyEntityRef.current = viewer.entities.add({
        id: 'user-accuracy',
        position: position as any,
        ellipse: {
          semiMinorAxis: accuracy,
          semiMajorAxis: accuracy,
          material: Cesium.Color.DODGERBLUE.withAlpha(0.2),
          outline: true,
          outlineColor: Cesium.Color.DODGERBLUE.withAlpha(0.5)
        }
      });
    } else {
      userEntityRef.current.position = position as any;
      if (accuracyEntityRef.current && accuracyEntityRef.current.ellipse) {
        accuracyEntityRef.current.position = position as any;
        accuracyEntityRef.current.ellipse.semiMinorAxis = new Cesium.ConstantProperty(accuracy) as any;
        accuracyEntityRef.current.ellipse.semiMajorAxis = new Cesium.ConstantProperty(accuracy) as any;
      }
    }

    if (isFollowing) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1000),
        duration: 1.0
      });
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGeoError("Browser does not support geolocation.");
      return;
    }
    
    setIsTracking(true);
    setIsFollowing(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading } = pos.coords;
        updateUserLocation(latitude, longitude, accuracy, heading);
        if (viewer) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1000),
            duration: 2.0
          });
        }
      },
      (err) => setGeoError("Location access denied. Enable browser location permission to use live tracking."),
      { enableHighAccuracy: true }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading } = pos.coords;
        updateUserLocation(latitude, longitude, accuracy, heading);
      },
      (err) => console.warn("Watch position error:", err),
      { enableHighAccuracy: true }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setIsFollowing(false);
    if (userEntityRef.current && viewer) viewer.entities.remove(userEntityRef.current);
    if (accuracyEntityRef.current && viewer) viewer.entities.remove(accuracyEntityRef.current);
    userEntityRef.current = null;
    accuracyEntityRef.current = null;
  };

  const handleRecenter = () => {
    if (viewer) {
      viewer.camera.flyTo({
        destination: pilotDestination,
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-45.0),
        },
        duration: 2.0
      });
    }
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={cesiumContainer} className="absolute inset-0" />
      
      {geoError && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg backdrop-blur-md shadow-2xl z-30 font-medium">
          {geoError}
        </div>
      )}

      {/* Layer Controls Placeholder */}
      <div className="absolute top-[96px] right-[24px] bg-black/60 backdrop-blur-lg border border-white/10 rounded-xl p-[16px] z-20 flex flex-col gap-[12px] min-w-[140px]">
        <h3 className="text-white/50 text-[12px] font-bold uppercase tracking-widest mb-[4px]">Layers</h3>
        <div className="flex items-center gap-[12px] text-white/90 hover:text-white transition-colors text-[14px] font-medium whitespace-nowrap cursor-pointer">
          <ImageIcon className="w-[16px] h-[16px] text-blue-400 flex-shrink-0" /> <span>Satellite</span>
        </div>
        <div className="flex items-center gap-[12px] text-white/90 hover:text-white transition-colors text-[14px] font-medium whitespace-nowrap cursor-pointer">
          <MapIcon className="w-[16px] h-[16px] text-green-400 flex-shrink-0" /> <span>Terrain</span>
        </div>
        <div className="flex items-center gap-[12px] text-white/90 hover:text-white transition-colors text-[14px] font-medium whitespace-nowrap cursor-pointer">
          <Layers className="w-[16px] h-[16px] text-orange-400 flex-shrink-0" /> <span>Road Context</span>
        </div>
      </div>
      
      {/* Tracking Controls */}
      <div className="absolute bottom-[32px] left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-[12px] md:gap-[16px] bg-black/50 p-[8px] rounded-full backdrop-blur-md border border-white/10 shadow-2xl">
        {!isTracking ? (
          <div 
            onClick={startTracking}
            className="px-[16px] md:px-[24px] py-[10px] bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-lg transition-all flex items-center justify-center gap-[8px] whitespace-nowrap text-[14px] md:text-[16px] cursor-pointer"
          >
            <Navigation className="w-[16px] h-[16px] flex-shrink-0" /> <span>MY LOCATION</span>
          </div>
        ) : (
          <>
            <div 
              onClick={() => setIsFollowing(!isFollowing)}
              className={`px-[16px] md:px-[24px] py-[10px] font-semibold rounded-full shadow-lg transition-all flex items-center justify-center gap-[8px] whitespace-nowrap text-[14px] md:text-[16px] cursor-pointer ${isFollowing ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'}`}
            >
              <Crosshair className="w-[16px] h-[16px] flex-shrink-0" /> <span>{isFollowing ? 'FOLLOWING' : 'FOLLOW ME'}</span>
            </div>
            <div 
              onClick={stopTracking}
              className="px-[16px] py-[10px] bg-red-600/80 hover:bg-red-500 text-white font-semibold rounded-full shadow-lg transition-all flex items-center justify-center gap-[8px] whitespace-nowrap text-[14px] md:text-[16px] cursor-pointer"
            >
              <StopCircle className="w-[16px] h-[16px] flex-shrink-0" /> <span>STOP</span>
            </div>
          </>
        )}
        <div 
          onClick={handleRecenter}
          className="px-[16px] md:px-[24px] py-[10px] bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full shadow-lg transition-all flex items-center justify-center gap-[8px] border border-white/10 whitespace-nowrap text-[14px] md:text-[16px] cursor-pointer"
        >
          <MapPin className="w-[16px] h-[16px] flex-shrink-0" /> <span>RECENTER</span>
        </div>
      </div>
    </div>
  );
}
