'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Crosshair, StopCircle, Layers, Map as MapIcon, Image as ImageIcon } from 'lucide-react';

declare const window: any;

export default function CesiumViewer() {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const userEntityRef = useRef<Cesium.Entity | null>(null);
  const accuracyEntityRef = useRef<Cesium.Entity | null>(null);

  // Precise VIT Bhopal coordinates (Default)
  const pilotLon = 76.84978;
  const pilotLat = 23.07551;
  const pilotDestination = Cesium.Cartesian3.fromDegrees(pilotLon, pilotLat, 2000);
  
  useEffect(() => {
    if (cesiumContainer.current === null) return;
    
    // Wait for CDN script to load
    if (!window.Cesium) {
      const checkInterval = setInterval(() => {
        if (window.Cesium) {
          clearInterval(checkInterval);
          initCesium();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    } else {
      initCesium();
    }

    function initCesium() {
      const Cesium = window.Cesium;
      window.CESIUM_BASE_URL = 'https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/';

      // Set Ion Token (if available)
      if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
        Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
      }

    try {
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
          .catch(() => {});
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
    }
  }, []);

  // Fetch hazards
  useEffect(() => {
    if (!viewer) return;

    const fetchHazards = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://argus-aybo.onrender.com';
        const response = await fetch(`${API_BASE}/hazards`);
        const hazards = await response.json();
        
        // Remove old hazards (keep user location entities intact by not using removeAll)
        viewer.entities.values.forEach(entity => {
          if (entity.id.startsWith('hazard-')) {
            viewer.entities.remove(entity);
          }
        });

        const Cesium = window.Cesium;
        if (!Cesium) return;
        const colorMap: Record<string, any> = {
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
        // Silently fail if backend is down
      }
    };

    fetchHazards();
    const interval = setInterval(fetchHazards, 5000);
    return () => clearInterval(interval);
  }, [viewer]);

  const updateUserLocation = (lat: number, lon: number, accuracy: number, heading: number | null) => {
    if (!viewer) return;
    const Cesium = window.Cesium;
    if (!Cesium) return;
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
    <div className="relative w-full h-full flex-1">
      {initError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          <div className="bg-red-900/30 border border-red-500 p-6 rounded-lg max-w-lg text-center">
            <h3 className="text-red-400 font-bold mb-2 uppercase tracking-widest text-sm">Command Centre Offline</h3>
            <p className="text-red-200 text-xs font-mono mb-4">{initError}</p>
            <p className="text-white/60 text-xs font-mono">This usually happens if NEXT_PUBLIC_CESIUM_ION_TOKEN is missing in Vercel Environment Variables, or if Cesium assets failed to load.</p>
          </div>
        </div>
      )}
      <div ref={cesiumContainer} className="absolute inset-0" />
      
      {/* Geo Error Toast */}
      {geoError && (
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.8)', padding: '10px 20px', borderRadius: 4,
          fontSize: 11, letterSpacing: '0.12em', fontFamily: 'monospace',
          zIndex: 30, backdropFilter: 'blur(12px)', whiteSpace: 'nowrap',
        }}>
          ⚠ {geoError}
        </div>
      )}

      {/* ── LAYERS PANEL (right side) ── */}
      <div style={{
        position: 'absolute', top: 80, right: 20, zIndex: 20,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '14px 16px', minWidth: 140,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.25em',
          color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace',
          textTransform: 'uppercase', marginBottom: 2,
        }}>LAYERS</span>
        {[
          { icon: ImageIcon, label: 'SATELLITE' },
          { icon: MapIcon,   label: 'TERRAIN'   },
          { icon: Layers,    label: 'ROAD CTX'  },
        ].map(({ icon: Icon, label }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
          }}>
            <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span style={{ fontSize: 11, letterSpacing: '0.15em', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── BOTTOM CONTROLS ── */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '6px 8px',
      }}>
        {/* MY LOCATION / FOLLOWING / STOP */}
        {!isTracking ? (
          <div
            onClick={startTracking}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Navigation style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>MY LOCATION</span>
          </div>
        ) : (
          <>
            <div
              onClick={() => setIsFollowing(!isFollowing)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 18px',
                border: `1px solid ${isFollowing ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}`,
                background: isFollowing ? 'rgba(255,255,255,0.08)' : 'transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
            >
              <Crosshair style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>
                {isFollowing ? 'FOLLOWING' : 'FOLLOW ME'}
              </span>
            </div>
            <div
              onClick={stopTracking}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 18px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <StopCircle style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>STOP</span>
            </div>
          </>
        )}

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {/* RECENTER */}
        <div
          onClick={handleRecenter}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 18px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <MapPin style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>RECENTER</span>
        </div>
      </div>
    </div>
  );
}
