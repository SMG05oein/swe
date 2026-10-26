import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Main.css';
import GNB from '../components/GNB';
import MapView from '../components/MapView';
import RouteInputPanel from '../components/RouteInputPanel';
import HazardList from '../components/HazardList';
import RouteCompare from '../components/RouteCompare';
import ApiKeyModal from '../components/ApiKeyModal';
import DetailModal from '../components/DetailModal';
import ChecklistPanel from '../components/ChecklistPanel';
import { REGION_PRESETS } from '../data/regions';
import {
  fetchChildAccidents,
  fetchChildGeneralAccidents,
  fetchElderAccidents,
} from '../api/trafficApi';
import { getApiKeys, saveApiKeys } from '../api/apiClient';
import { fetchFacilities, getSampleFacilities } from '../api/facilitiesApi';
import { fetchPedestrianRoute } from '../api/routeApi';
import { reverseGeocode } from '../api/geocodeApi';
import { fetchChecklistConfig, fetchCachedPublicData } from '../api/adminApi';
import { DEFAULT_CHECKLIST_CONFIG } from '../domain/checklist';
import { findHazardsNearRoute, avoidWaypointFromHazards } from '../domain/hazards';
import { gradeRoute, formatDistance, formatDuration } from '../domain/routeGrade';
import { getSampleAccidents } from '../data/sampleAccidents';

const SIDEBAR_WIDTH_KEY = 'swe_sidebar_width';
const SIDEBAR_MIN = 280;
const SIDEBAR_MAX = 640;
const SIDEBAR_DEFAULT = 380;

function readSidebarWidth() {
  const raw = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
  if (!Number.isFinite(raw)) return SIDEBAR_DEFAULT;
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, raw));
}

export default function Main() {
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const layoutRef = useRef(null);
  const [currentRegion, setCurrentRegion] = useState('shinbu');
  const [selectedYear, setSelectedYear] = useState('2023');
  const [vulnerableType, setVulnerableType] = useState('child');
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [pickMode, setPickMode] = useState(null);

  const [route, setRoute] = useState(null);
  const [altRoute, setAltRoute] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [altHazards, setAltHazards] = useState([]);
  const [activeRouteKey, setActiveRouteKey] = useState('primary');
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [altLoading, setAltLoading] = useState(false);

  const [childSchoolzoneData, setChildSchoolzoneData] = useState([]);
  const [childGenData, setChildGenData] = useState([]);
  const [elderData, setElderData] = useState([]);
  const [isAccidentsLoading, setIsAccidentsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('데이터 불러오는 중...');
  const [usingCache, setUsingCache] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [keys, setKeys] = useState({ koroadKey: '', dataGoKrKey: '' });
  const [facilities, setFacilities] = useState({ loading: true });
  const [checklistConfig, setChecklistConfig] = useState(DEFAULT_CHECKLIST_CONFIG);
  const [showAccidents, setShowAccidents] = useState(true);
  const [errorBanner, setErrorBanner] = useState('');

  const loadFacilities = useCallback(() => {
    setFacilities({ loading: true });
    fetchFacilities()
      .then((f) => {
        setFacilities({ ...f, loading: false });
        if (f.fromSample) {
          setUsingCache(true);
          setErrorBanner(f.message || '공공데이터포털 장애로 샘플 시설 데이터를 사용합니다.');
        }
      })
      .catch(async () => {
        const cached = await fetchCachedPublicData();
        if (cached?.available && cached.data?.facilities) {
          setFacilities({ ...cached.data.facilities, loading: false, fromCache: true });
          setUsingCache(true);
          setErrorBanner('외부 API 장애로 저장된 시설 데이터를 사용 중입니다.');
        } else {
          setFacilities({ ...getSampleFacilities(), loading: false });
          setUsingCache(true);
          setErrorBanner('공공데이터포털 연결 실패로 시설 샘플 모드로 전환합니다.');
        }
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadFacilities();
      fetchChecklistConfig()
        .then(setChecklistConfig)
        .catch(() => setChecklistConfig(DEFAULT_CHECKLIST_CONFIG));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFacilities]);

  const reloadData = useCallback(
    async (targetYear = selectedYear, targetRegion = currentRegion) => {
      setIsAccidentsLoading(true);
      setStatusMsg('실시간 API 데이터 불러오는 중...');
      setKeys(getApiKeys());
      const targetGuGun = targetRegion === 'dujeong' ? '133' : '131';

      try {
        const [childRes, childGenRes, elderRes] = await Promise.all([
          fetchChildAccidents({ searchYearCd: targetYear, guGun: targetGuGun }),
          fetchChildGeneralAccidents({ searchYearCd: targetYear, guGun: targetGuGun }),
          fetchElderAccidents({ searchYearCd: targetYear, guGun: targetGuGun }),
        ]);

        const total =
          (childRes.items?.length || 0) +
          (childGenRes.items?.length || 0) +
          (elderRes.items?.length || 0);

        if (total > 0) {
          setChildSchoolzoneData(childRes.items || []);
          setChildGenData(childGenRes.items || []);
          setElderData(elderRes.items || []);
          setUsingCache(false);
          setStatusMsg(`실시간 수신 완료 (${total}건)`);
          setErrorBanner('');
        } else {
          const sample = getSampleAccidents();
          setChildSchoolzoneData(sample.childSchoolzone);
          setChildGenData(sample.childGen);
          setElderData(sample.elder);
          setUsingCache(true);
          setStatusMsg('샘플 데이터로 서비스 중');
          setErrorBanner(
            '공공데이터포털 연결이 지연되어 천안 샘플 사고 데이터를 사용합니다.'
          );
        }
      } catch {
        const cached = await fetchCachedPublicData();
        if (cached?.available && cached.data?.accidents) {
          const a = cached.data.accidents;
          setChildSchoolzoneData(a.childSchoolzone || []);
          setChildGenData(a.childGen || []);
          setElderData(a.elder || []);
          setUsingCache(true);
          setStatusMsg('저장된 데이터로 서비스 중');
          setErrorBanner('외부 API 장애로 저장된 사고 데이터를 사용 중입니다.');
        } else {
          const sample = getSampleAccidents();
          setChildSchoolzoneData(sample.childSchoolzone);
          setChildGenData(sample.childGen);
          setElderData(sample.elder);
          setUsingCache(true);
          setStatusMsg('샘플 데이터로 서비스 중');
          setErrorBanner(
            '공공데이터포털 연결 실패로 천안 샘플 사고 데이터를 사용합니다.'
          );
        }
      } finally {
        setIsAccidentsLoading(false);
      }
    },
    [selectedYear, currentRegion]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      reloadData(selectedYear, currentRegion);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedYear, currentRegion, reloadData]);

  const accidents = useMemo(() => {
    if (vulnerableType === 'elder') {
      return elderData.map((d) => ({
        ...d,
        color: '#f59e0b',
        category: 'elder',
        radius: d.radius || 100,
      }));
    }
    return [
      ...childSchoolzoneData.map((d) => ({
        ...d,
        color: '#38bdf8',
        category: 'child',
        radius: d.radius || 300,
      })),
      ...childGenData.map((d) => ({
        ...d,
        color: '#06b6d4',
        category: 'child',
        radius: d.radius || 300,
      })),
    ];
  }, [vulnerableType, elderData, childSchoolzoneData, childGenData]);

  const allProtectionZones = useMemo(
    () => [...(facilities.protectionZones || []), ...(facilities.elderProtectionZones || [])],
    [facilities]
  );

  const analyzePath = useCallback(
    (path) =>
      findHazardsNearRoute({
        path,
        accidents,
        protectionZones: allProtectionZones,
        facilities,
        config: checklistConfig,
      }),
    [accidents, allProtectionZones, facilities, checklistConfig]
  );

  const handleSearchRoute = async () => {
    if (!origin || !destination) return;
    setRouteLoading(true);
    setAltRoute(null);
    setAltHazards([]);
    setActiveRouteKey('primary');
    setErrorBanner('');
    try {
      const result = await fetchPedestrianRoute([origin, destination], {
        vulnerableType,
      });
      const found = analyzePath(result.path);
      setRoute(result);
      setHazards(found);
      setSelectedHazard(found[0] || null);
    } catch (e) {
      setErrorBanner(e.message || '경로를 찾지 못했습니다.');
      setRoute(null);
      setHazards([]);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleAltRoute = async () => {
    if (!origin || !destination || !route) return;
    setAltLoading(true);
    setErrorBanner('');
    try {
      if (!hazards.length) {
        setErrorBanner('회피할 위험 구역이 없습니다. 기본 경로와 동일합니다.');
        setAltRoute(null);
        setAltHazards([]);
        return;
      }
      const via = avoidWaypointFromHazards(origin, destination, hazards);
      const waypoints = via ? [origin, via, destination] : [origin, destination];
      const result = await fetchPedestrianRoute(waypoints, { vulnerableType });
      const found = analyzePath(result.path);
      setAltRoute(result);
      setAltHazards(found);
      setActiveRouteKey('alt');
      setSelectedHazard(found[0] || null);
    } catch (e) {
      setErrorBanner(e.message || '대체 경로를 찾지 못했습니다.');
    } finally {
      setAltLoading(false);
    }
  };

  const displayHazards = activeRouteKey === 'alt' && altRoute ? altHazards : hazards;
  const displayRoute = activeRouteKey === 'alt' && altRoute ? altRoute : route;
  const displayGrade = useMemo(
    () => gradeRoute(displayHazards.length, checklistConfig),
    [displayHazards.length, checklistConfig]
  );

  const handleSelectComparedRoute = (key) => {
    setActiveRouteKey(key);
    const list = key === 'alt' ? altHazards : hazards;
    setSelectedHazard(list[0] || null);
  };

  const handleMapClick = async ({ lat, lng }) => {
    if (!pickMode) return;
    try {
      const place = await reverseGeocode(lat, lng);
      if (pickMode === 'origin') setOrigin(place);
      else setDestination(place);
    } catch {
      const place = { lat, lng, name: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
      if (pickMode === 'origin') setOrigin(place);
      else setDestination(place);
    }
    setPickMode(null);
  };

  const handleSaveKeys = (newKeys) => {
    saveApiKeys(newKeys);
    setKeys(newKeys);
    reloadData();
    loadFacilities();
  };

  const detailSpot = useMemo(() => {
    if (!selectedHazard) return null;
    if (selectedHazard.spot) return selectedHazard.spot;
    return {
      spot_nm: selectedHazard.name,
      la_crd: selectedHazard.lat,
      lo_crd: selectedHazard.lng,
      category: vulnerableType,
      radius: 150,
      caslt_cnt: 0,
      dth_dnv_cnt: 0,
      se_dnv_cnt: 0,
      sl_dnv_cnt: 0,
      wnd_dnv_cnt: 0,
      occrrnc_cnt: 0,
      _checklist: selectedHazard.checklist,
      _hazardKind: selectedHazard.kind,
    };
  }, [selectedHazard, vulnerableType]);

  useEffect(() => {
    if (!isResizing) return undefined;

    const onMove = (event) => {
      const root = layoutRef.current;
      if (!root) return;
      const left = root.getBoundingClientRect().left;
      const next = Math.min(
        SIDEBAR_MAX,
        Math.max(SIDEBAR_MIN, event.clientX - left)
      );
      setSidebarWidth(next);
    };

    const onUp = () => {
      setIsResizing(false);
      setSidebarWidth((w) => {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(w)));
        return w;
      });
    };

    document.body.classList.add('is-sidebar-resizing');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      document.body.classList.remove('is-sidebar-resizing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isResizing]);

  return (
    <div className="main-page guardian-layout">
      <GNB
        statusMsg={statusMsg}
        isMockMode={usingCache}
        onOpenSettings={() => setShowSettings(true)}
        currentRegion={currentRegion}
        onSelectRegion={setCurrentRegion}
        currentYear={selectedYear}
        onSelectYear={setSelectedYear}
        extraActions={<Link className="btn-admin-link" to="/admin">관리자</Link>}
      />

      {errorBanner && <div className="api-banner">{errorBanner}</div>}

      <main
        className={`main-view guardian-view ${isResizing ? 'resizing' : ''}`}
        ref={layoutRef}
        style={{ '--sidebar-width': `${sidebarWidth}px` }}
      >
        <aside className="guardian-sidebar">
          <RouteInputPanel
            vulnerableType={vulnerableType}
            onVulnerableTypeChange={setVulnerableType}
            origin={origin}
            destination={destination}
            pickMode={pickMode}
            onPickModeChange={setPickMode}
            onSetOrigin={setOrigin}
            onSetDestination={setDestination}
            onSearchRoute={handleSearchRoute}
            onRequestAlt={handleAltRoute}
            loading={routeLoading}
            altLoading={altLoading}
            hasRoute={Boolean(route)}
            routeMeta={
              displayRoute
                ? {
                    distanceLabel: formatDistance(displayRoute.distance),
                    durationLabel: `${formatDuration(displayRoute.duration)} (보행)`,
                  }
                : null
            }
            routeGrade={displayRoute ? displayGrade : null}
          />
          <HazardList
            hazards={displayHazards}
            selectedId={selectedHazard?.id}
            onSelect={(h) => {
              setSelectedHazard(h);
              setShowDetailModal(true);
            }}
            grade={displayRoute ? displayGrade : null}
          />
          <RouteCompare
            active={activeRouteKey}
            onSelect={handleSelectComparedRoute}
            primary={
              route
                ? {
                    distance: route.distance,
                    duration: route.duration,
                    hazardCount: hazards.length,
                  }
                : null
            }
            alternative={
              altRoute
                ? {
                    distance: altRoute.distance,
                    duration: altRoute.duration,
                    hazardCount: altHazards.length,
                  }
                : null
            }
          />
          {selectedHazard && (
            <div className="sidebar-checklist">
              <ChecklistPanel
                spot={detailSpot}
                facilities={facilities}
                checklistResult={selectedHazard.checklist}
                config={checklistConfig}
              />
            </div>
          )}
          {isAccidentsLoading && (
            <p className="sidebar-hint">사고·시설 데이터를 불러오는 중...</p>
          )}
        </aside>

        <div
          className="sidebar-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="사이드바 너비 조절"
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          aria-valuenow={Math.round(sidebarWidth)}
          onPointerDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          onDoubleClick={() => {
            setSidebarWidth(SIDEBAR_DEFAULT);
            localStorage.setItem(SIDEBAR_WIDTH_KEY, String(SIDEBAR_DEFAULT));
          }}
        />

        <MapView
          spots={accidents}
          hazards={displayHazards}
          protectionZones={allProtectionZones}
          routePath={displayRoute?.path}
          altRoutePath={
            altRoute
              ? activeRouteKey === 'alt'
                ? route?.path
                : altRoute.path
              : null
          }
          origin={origin}
          destination={destination}
          selectedHazard={selectedHazard}
          onSelectHazard={(h) => {
            setSelectedHazard(h);
            setShowDetailModal(true);
          }}
          onMapClick={handleMapClick}
          pickMode={pickMode}
          showAccidents={showAccidents}
          onToggleAccidents={setShowAccidents}
          currentRegion={currentRegion}
          regionPresets={REGION_PRESETS}
        />
      </main>

      <DetailModal
        spot={detailSpot}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        facilities={facilities}
        checklistConfig={checklistConfig}
        precomputedChecklist={selectedHazard?.checklist}
        vulnerableType={vulnerableType}
      />

      <ApiKeyModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        initialKeys={keys}
        onSave={handleSaveKeys}
      />
    </div>
  );
}
