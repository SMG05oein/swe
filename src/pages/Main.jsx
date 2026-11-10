import { useState, useEffect, useCallback, useMemo } from 'react';
import './Main.css';
import TopBar from '../components/TopBar';
import MapView from '../components/MapView';
import RouteSearchBox from '../components/RouteSearchBox';
import RouteResults from '../components/RouteResults';
import HazardList from '../components/HazardList';
import HazardDetail from '../components/HazardDetail';
import ApiKeyModal from '../components/ApiKeyModal';
import Onboarding from '../components/Onboarding';
import { hasSeenOnboarding, readSavedPersona, savePersona } from '../components/onboardingStorage';
import Icon from '../components/Icon';
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
import { gradeRoute } from '../domain/routeGrade';
import { segmentRouteByHazards } from '../domain/routeSegments';
import { getSampleAccidents } from '../data/sampleAccidents';

const SHEET_STATES = ['peek', 'half', 'full'];

export default function Main() {
  const [currentRegion, setCurrentRegion] = useState('shinbu');
  const [selectedYear, setSelectedYear] = useState('2023');
  const [vulnerableType, setVulnerableTypeState] = useState(readSavedPersona);
  const setVulnerableType = useCallback((persona) => {
    setVulnerableTypeState(persona);
    savePersona(persona);
  }, []);
  const [showDetail, setShowDetail] = useState(false);
  const [sheet, setSheet] = useState('half');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showIntro, setShowIntro] = useState(() => !hasSeenOnboarding());
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
        vulnerableType,
      }),
    [accidents, allProtectionZones, facilities, checklistConfig, vulnerableType]
  );

  const resetSelection = () => {
    setSelectedHazard(null);
    setShowDetail(false);
  };

  const handleSearchRoute = async () => {
    if (!origin || !destination) return;
    setRouteLoading(true);
    setAltRoute(null);
    setAltHazards([]);
    setActiveRouteKey('primary');
    setPickMode(null);
    setErrorBanner('');
    resetSelection();
    try {
      const result = await fetchPedestrianRoute([origin, destination], {
        vulnerableType,
      });
      setRoute(result);
      setHazards(analyzePath(result.path));
      setSheet('half');
    } catch (e) {
      setErrorBanner(e.message || '경로를 찾지 못했습니다.');
      setBannerDismissed(false);
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
      const via = avoidWaypointFromHazards(origin, destination, hazards);
      const waypoints = via ? [origin, via, destination] : [origin, destination];
      const result = await fetchPedestrianRoute(waypoints, { vulnerableType });
      setAltRoute(result);
      setAltHazards(analyzePath(result.path));
      setActiveRouteKey('alt');
      resetSelection();
    } catch (e) {
      setErrorBanner(e.message || '대체 경로를 찾지 못했습니다.');
      setBannerDismissed(false);
    } finally {
      setAltLoading(false);
    }
  };

  const isAlt = activeRouteKey === 'alt' && Boolean(altRoute);
  const displayHazards = isAlt ? altHazards : hazards;
  const displayRoute = isAlt ? altRoute : route;
  const otherRoute = altRoute ? (isAlt ? route : altRoute) : null;
  const routeSegments = useMemo(
    () => segmentRouteByHazards(displayRoute?.path, displayHazards),
    [displayRoute, displayHazards]
  );

  const primarySummary = useMemo(
    () =>
      route && {
        distance: route.distance,
        duration: route.duration,
        hazardCount: hazards.length,
        grade: gradeRoute(hazards.length, checklistConfig),
      },
    [route, hazards.length, checklistConfig]
  );
  const altSummary = useMemo(
    () =>
      altRoute && {
        distance: altRoute.distance,
        duration: altRoute.duration,
        hazardCount: altHazards.length,
        grade: gradeRoute(altHazards.length, checklistConfig),
      },
    [altRoute, altHazards.length, checklistConfig]
  );

  const handleSelectComparedRoute = (key) => {
    setActiveRouteKey(key);
    resetSelection();
  };

  const handleSelectOtherRoute = useCallback(() => {
    setActiveRouteKey((k) => (k === 'alt' ? 'primary' : 'alt'));
    setSelectedHazard(null);
    setShowDetail(false);
  }, []);

  const handleSelectHazard = useCallback((h) => {
    setSelectedHazard(h);
    setShowDetail(true);
    setSheet((s) => (s === 'peek' ? 'half' : s));
  }, []);

  const handleMapClick = useCallback(
    async ({ lat, lng }) => {
      if (!pickMode) return;
      const target = pickMode;
      setPickMode(null);
      let place;
      try {
        place = await reverseGeocode(lat, lng);
      } catch {
        place = { lat, lng, name: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
      }
      if (target === 'origin') setOrigin(place);
      else setDestination(place);
    },
    [pickMode]
  );

  const handleSaveKeys = (newKeys) => {
    saveApiKeys(newKeys);
    setKeys(newKeys);
    reloadData();
    loadFacilities();
  };

  const detailSpot = useMemo(() => {
    if (!selectedHazard) return null;
    if (selectedHazard.spot) return { ...selectedHazard.spot, _hazardKind: selectedHazard.kind };
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
      _hazardKind: selectedHazard.kind,
    };
  }, [selectedHazard, vulnerableType]);

  const selectedIndex = selectedHazard
    ? displayHazards.findIndex((h) => h.id === selectedHazard.id)
    : -1;

  const cycleSheet = () => {
    const i = SHEET_STATES.indexOf(sheet);
    setSheet(SHEET_STATES[(i + 1) % SHEET_STATES.length]);
  };

  const banner = !bannerDismissed && errorBanner;

  return (
    <div className={`gd-app persona-${vulnerableType}`}>
      <TopBar
        currentRegion={currentRegion}
        onSelectRegion={setCurrentRegion}
        currentYear={selectedYear}
        onSelectYear={setSelectedYear}
        statusMsg={statusMsg}
        isSample={usingCache}
        isLoading={isAccidentsLoading}
        onOpenKeys={() => setShowSettings(true)}
        onOpenIntro={() => setShowIntro(true)}
      />

      <main className="gd-layout">
        <aside className={`gd-panel sheet-${sheet}`} aria-label="길찾기">
          <button
            type="button"
            className="sheet-handle"
            aria-label="패널 크기 바꾸기"
            onClick={cycleSheet}
          >
            <span />
          </button>

          {banner && (
            <div className="notice" role="status">
              <Icon name="info" size={16} />
              <span>{banner}</span>
              <button type="button" aria-label="알림 닫기" onClick={() => setBannerDismissed(true)}>
                <Icon name="close" size={14} />
              </button>
            </div>
          )}

          {showDetail && detailSpot ? (
            <HazardDetail
              key={selectedHazard.id}
              hazard={selectedHazard}
              index={selectedIndex >= 0 ? selectedIndex : null}
              spot={detailSpot}
              facilities={facilities}
              checklistConfig={checklistConfig}
              vulnerableType={vulnerableType}
              onBack={() => setShowDetail(false)}
            />
          ) : (
            <div className="panel-scroll">
              <RouteSearchBox
                vulnerableType={vulnerableType}
                onVulnerableTypeChange={setVulnerableType}
                origin={origin}
                destination={destination}
                onSetOrigin={setOrigin}
                onSetDestination={setDestination}
                pickMode={pickMode}
                onPickModeChange={setPickMode}
                onSearch={handleSearchRoute}
                loading={routeLoading}
              />

              {route ? (
                <>
                  <RouteResults
                    primary={primarySummary}
                    alternative={altSummary}
                    active={isAlt ? 'alt' : 'primary'}
                    onSelect={handleSelectComparedRoute}
                    onRequestAlt={handleAltRoute}
                    altLoading={altLoading}
                    vulnerableType={vulnerableType}
                  />
                  <HazardList
                    hazards={displayHazards}
                    selectedId={selectedHazard?.id}
                    onSelect={handleSelectHazard}
                    routeLabel={isAlt ? '회피 경로' : '기본 경로'}
                  />
                </>
              ) : (
                <div className="empty-guide">
                  <p className="empty-title">
                    {vulnerableType === 'elder' ? '어르신이' : '아이가'} 걸어갈 길, 미리 확인하세요
                  </p>
                  <ol className="empty-steps">
                    <li>출발지와 도착지를 검색하거나 지도에서 고르세요.</li>
                    <li>경로 주변의 사고다발지역과 점검 미달 보호구역을 찾아 안전 등급을 매깁니다.</li>
                    <li>위험 지점을 누르면 안전시설 점검표와 AI 유의점을 볼 수 있습니다.</li>
                  </ol>
                  {isAccidentsLoading && <p className="empty-loading">사고·시설 데이터를 불러오는 중…</p>}
                </div>
              )}
            </div>
          )}
        </aside>

        <MapView
          spots={accidents}
          hazards={displayHazards}
          protectionZones={allProtectionZones}
          routePath={displayRoute?.path}
          routeSegments={routeSegments}
          altRoutePath={otherRoute?.path}
          onSelectOtherRoute={handleSelectOtherRoute}
          origin={origin}
          destination={destination}
          selectedHazard={selectedHazard}
          onSelectHazard={handleSelectHazard}
          onMapClick={handleMapClick}
          pickMode={pickMode}
          showAccidents={showAccidents}
          onToggleAccidents={setShowAccidents}
          currentRegion={currentRegion}
          regionPresets={REGION_PRESETS}
        />
      </main>

      {showIntro && (
        <Onboarding
          initialPersona={vulnerableType}
          onFinish={(persona) => {
            if (persona) setVulnerableType(persona);
            setShowIntro(false);
          }}
        />
      )}

      <ApiKeyModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        initialKeys={keys}
        onSave={handleSaveKeys}
      />
    </div>
  );
}
