/* eslint-disable */
// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Crosshair, StopCircle, Layers, Map as MapIcon, Image as ImageIcon } from 'lucide-react';

const CESIUM_VERSION = '1.119';
const CESIUM_CDN_BASE = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium`;

/**
 * Programmatically loads Cesium from jsDelivr CDN.
 * Sets CESIUM_BASE_URL BEFORE the script loads (critical requirement).
 * Returns a Promise that resolves with the Cesium object.
 */
function loadCesiumFromCDN() {
  return new Promise((resolve, reject) => {
    // Already loaded?
    if ((window as any).Cesium) {
      resolve((window as any).Cesium);
      return;
    }

    // 1. Set CESIUM_BASE_URL BEFORE the script loads — Cesium reads this on init
    (window as any).CESIUM_BASE_URL = `${CESIUM_CDN_BASE}/`;

    // 2. Load the CSS
    if (!document.querySelector('link[data-cesium-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${CESIUM_CDN_BASE}/Widgets/widgets.css`;
      link.setAttribute('data-cesium-css', 'true');
      document.head.appendChild(link);
    }

    // 3. Load the JS
    const script = document.createElement('script');
    script.src = `${CESIUM_CDN_BASE}/Cesium.js`;
    script.async = true;
    script.onload = () => {
      if ((window as any).Cesium) {
        resolve((window as any).Cesium);
      } else {
        reject(new Error('Cesium script loaded but window.Cesium is undefined'));
      }
    };
    script.onerror = () => reject(new Error(`Failed to load Cesium from ${script.src}`));
    document.head.appendChild(script);
  });
}

export default function CesiumViewer() {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const [viewerReady, setViewerReady] = useState(false);

  const [isTracking, setIsTracking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [initError, setInitError] = useState(null);
  const [activeLayer, setActiveLayer] = useState('SATELLITE');

  const watchIdRef = useRef(null);
  const userEntityRef = useRef(null);
  const accuracyEntityRef = useRef(null);
  const isFollowingRef = useRef(false);

  const PILOT_LON = 76.84978;
  const PILOT_LAT = 23.07551;

  // Keep isFollowingRef in sync
  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  // Main initialization effect
  useEffect(() => {
    if (!cesiumContainer.current) return;
    let destroyed = false;

    loadCesiumFromCDN()
      .then((C) => {
        if (destroyed) return;

        if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
          C.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        }

        const v = new C.Viewer(cesiumContainer.current, {
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
          // Don't add default imagery — we'll add our own below
          baseLayer: false,
          terrain: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN
            ? C.Terrain.fromWorldTerrain()
            : undefined,
        });

        // Add imagery: Google Maps via Ion if token exists, else free Esri Satellite
        if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
          C.IonImageryProvider.fromAssetId(3830183)
            .then((provider) => {
              if (!destroyed) {
                v.imageryLayers.addImageryProvider(provider);
              }
            })
            .catch(() => {
              // Fallback to Esri if Ion fails
              v.imageryLayers.addImageryProvider(
                new C.UrlTemplateImageryProvider({
                  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                  credit: 'Esri, Maxar, Earthstar Geographics',
                  maximumLevel: 18,
                })
              );
            });
        } else {
          // No Ion token — use free Esri Satellite tiles
          v.imageryLayers.addImageryProvider(
            new C.UrlTemplateImageryProvider({
              url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              credit: 'Esri, Maxar, Earthstar Geographics',
              maximumLevel: 18,
            })
          );
        }

        v.camera.setView({
          destination: C.Cartesian3.fromDegrees(PILOT_LON, PILOT_LAT, 15000000),
        });

        v.camera.flyTo({
          destination: C.Cartesian3.fromDegrees(PILOT_LON, PILOT_LAT, 2000),
          orientation: {
            heading: C.Math.toRadians(0.0),
            pitch: C.Math.toRadians(-45.0),
          },
          duration: 4.0,
          easingFunction: C.EasingFunction.CUBIC_IN_OUT,
        });

        // Prevent zooming past imagery limits
        v.scene.screenSpaceCameraController.minimumZoomDistance = 150;

        viewerRef.current = v;
        setViewerReady(true);
      })
      .catch((err) => {
        console.error('Cesium initialization failed:', err);
        setInitError(err.message || String(err));
      });

    return () => {
      destroyed = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Fetch hazards
  useEffect(() => {
    if (!viewerReady) return;

    const fetchHazards = async () => {
      try {
        const C = (window as any).Cesium;
        if (!C || !viewerRef.current) return;

        const API_BASE =
          process.env.NEXT_PUBLIC_API_BASE || 'https://argus-aybo.onrender.com';
        const response = await fetch(`${API_BASE}/hazards`);
        const hazards = await response.json();

        const v = viewerRef.current;

        // Remove old hazard entities
        const toRemove = v.entities.values.filter((e) =>
          e.id.startsWith('hazard-')
        );
        toRemove.forEach((e) => v.entities.remove(e));

        const colorMap = {
          pothole: C.Color.RED,
          garbage: C.Color.YELLOW,
          construction: C.Color.ORANGE,
          debris: C.Color.GREEN,
          exposed_wire: C.Color.BLUE,
        };

        hazards.forEach((hazard) => {
          v.entities.add({
            id: `hazard-${hazard.id}`,
            position: C.Cartesian3.fromDegrees(hazard.lon, hazard.lat),
            point: {
              pixelSize: 15,
              color: colorMap[hazard.hazard_class] || C.Color.WHITE,
              outlineColor: C.Color.BLACK,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });
      } catch {
        // Silently fail if backend is down
      }
    };

    fetchHazards();
    const interval = setInterval(fetchHazards, 5000);
    return () => clearInterval(interval);
  }, [viewerReady]);

  const updateUserLocation = (lat, lon, accuracy) => {
    const C = (window as any).Cesium;
    const v = viewerRef.current;
    if (!C || !v) return;

    const position = C.Cartesian3.fromDegrees(lon, lat);

    if (!userEntityRef.current) {
      userEntityRef.current = v.entities.add({
        id: 'user-location',
        position,
        point: {
          pixelSize: 18,
          color: C.Color.DODGERBLUE,
          outlineColor: C.Color.WHITE,
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      accuracyEntityRef.current = v.entities.add({
        id: 'user-accuracy',
        position,
        ellipse: {
          semiMinorAxis: accuracy,
          semiMajorAxis: accuracy,
          material: C.Color.DODGERBLUE.withAlpha(0.2),
          outline: true,
          outlineColor: C.Color.DODGERBLUE.withAlpha(0.5),
        },
      });
    } else {
      userEntityRef.current.position = new C.ConstantPositionProperty(position);
      if (accuracyEntityRef.current?.ellipse) {
        accuracyEntityRef.current.position = new C.ConstantPositionProperty(position);
        accuracyEntityRef.current.ellipse.semiMinorAxis = new C.ConstantProperty(accuracy);
        accuracyEntityRef.current.ellipse.semiMajorAxis = new C.ConstantProperty(accuracy);
      }
    }

    if (isFollowingRef.current) {
      v.camera.flyTo({
        destination: C.Cartesian3.fromDegrees(lon, lat, 1000),
        duration: 1.0,
      });
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGeoError('Browser does not support geolocation.');
      return;
    }

    setIsTracking(true);
    setIsFollowing(true);
    isFollowingRef.current = true;
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        updateUserLocation(latitude, longitude, accuracy);
        const C = (window as any).Cesium;
        const v = viewerRef.current;
        if (C && v) {
          v.camera.flyTo({
            destination: C.Cartesian3.fromDegrees(longitude, latitude, 1000),
            duration: 2.0,
          });
        }
      },
      () => setGeoError('Location access denied. Enable browser location permission.'),
      { enableHighAccuracy: true }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        updateUserLocation(latitude, longitude, accuracy);
      },
      (err) => console.warn('Watch position error:', err),
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
    isFollowingRef.current = false;

    const v = viewerRef.current;
    if (v) {
      if (userEntityRef.current) v.entities.remove(userEntityRef.current);
      if (accuracyEntityRef.current) v.entities.remove(accuracyEntityRef.current);
    }
    userEntityRef.current = null;
    accuracyEntityRef.current = null;
  };

  const handleRecenter = () => {
    const C = (window as any).Cesium;
    const v = viewerRef.current;
    if (!C || !v) return;
    v.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(PILOT_LON, PILOT_LAT, 2000),
      orientation: {
        heading: C.Math.toRadians(0.0),
        pitch: C.Math.toRadians(-45.0),
      },
      duration: 2.0,
    });
  };

  return (
    <div className="relative w-full h-full flex-1">
      {initError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          <div className="bg-red-900/30 border border-red-500 p-6 rounded-lg max-w-lg text-center">
            <h3 className="text-red-400 font-bold mb-2 uppercase tracking-widest text-sm">
              Command Centre Offline
            </h3>
            <p className="text-red-200 text-xs font-mono mb-4">{initError}</p>
            <p className="text-white/60 text-xs font-mono">
              Check your NEXT_PUBLIC_CESIUM_ION_TOKEN environment variable in Vercel,
              or check your browser console for more details.
            </p>
          </div>
        </div>
      )}

      <div ref={cesiumContainer} className="absolute inset-0" />

      {geoError && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.8)',
            padding: '10px 20px',
            borderRadius: 4,
            fontSize: 11,
            letterSpacing: '0.12em',
            fontFamily: 'monospace',
            zIndex: 30,
            backdropFilter: 'blur(12px)',
            whiteSpace: 'nowrap',
          }}
        >
          ⚠ {geoError}
        </div>
      )}

      {/* Layers Panel */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 20,
          zIndex: 20,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '14px 16px',
          minWidth: 140,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.25em',
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          LAYERS
        </span>
        {[
          { icon: ImageIcon, label: 'SATELLITE', layerKey: 'SATELLITE' },
          { icon: MapIcon, label: 'TERRAIN', layerKey: 'ROAD' },
          { icon: Layers, label: 'ROAD CTX', layerKey: 'ROAD' },
        ].map(({ icon: Icon, label, layerKey }) => (
          <div
            key={label}
            onClick={() => {
              const C = (window as any).Cesium;
              const v = viewerRef.current;
              if (!C || !v) return;
              v.imageryLayers.removeAll();
              if (layerKey === 'SATELLITE') {
                v.imageryLayers.addImageryProvider(
                  new C.UrlTemplateImageryProvider({
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    credit: 'Esri, Maxar, Earthstar Geographics',
                    maximumLevel: 18,
                  })
                );
                setActiveLayer(label);
              } else {
                v.imageryLayers.addImageryProvider(
                  new C.OpenStreetMapImageryProvider({
                    url: 'https://tile.openstreetmap.org/',
                  })
                );
                setActiveLayer(label);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              color: activeLayer === label ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
              padding: '4px 6px',
              borderRadius: 6,
              background: activeLayer === label ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span
              style={{
                fontSize: 11,
                letterSpacing: '0.15em',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '6px 8px',
        }}
      >
        {!isTracking ? (
          <div
            onClick={startTracking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            <Navigation
              style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.18em',
                color: 'rgba(255,255,255,0.8)',
                fontFamily: 'monospace',
              }}
            >
              MY LOCATION
            </span>
          </div>
        ) : (
          <>
            <div
              onClick={() => {
                setIsFollowing((f) => !f);
                isFollowingRef.current = !isFollowingRef.current;
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                border: `1px solid ${isFollowing ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}`,
                background: isFollowing ? 'rgba(255,255,255,0.08)' : 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <Crosshair
                style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  color: 'rgba(255,255,255,0.8)',
                  fontFamily: 'monospace',
                }}
              >
                {isFollowing ? 'FOLLOWING' : 'FOLLOW ME'}
              </span>
            </div>
            <div
              onClick={stopTracking}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <StopCircle
                style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'monospace',
                }}
              >
                STOP
              </span>
            </div>
          </>
        )}

        <div
          style={{
            width: 1,
            height: 20,
            background: 'rgba(255,255,255,0.1)',
            margin: '0 4px',
          }}
        />

        <div
          onClick={handleRecenter}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'transparent')
          }
        >
          <MapPin
            style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'monospace',
            }}
          >
            RECENTER
          </span>
        </div>
      </div>
    </div>
  );
}
