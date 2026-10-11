import { useState, useEffect } from 'react';
import './Main.css';
import GNB from '../components/GNB';
import MapView from '../components/MapView';
import SpotDetailCard from '../components/SpotDetailCard';
import SpotListCard from '../components/SpotListCard';
import ApiKeyModal from '../components/ApiKeyModal';
import {
  fetchChildAccidents,
  fetchChildGeneralAccidents,
  fetchElderAccidents,
  fetchViolationAccidents,
} from '../api/trafficApi';
import { getApiKeys, saveApiKeys } from '../api/apiClient';
import { fetchFacilities } from '../api/facilitiesApi';
import ChecklistPanel from '../components/ChecklistPanel';
import { REGION_PRESETS } from '../data/mockData';

export default function Main() {
  const [currentRegion, setCurrentRegion] = useState('shinbu');
  const [activeTab, setActiveTab] = useState('all'); // 통합보기가 기본

  const [childSchoolzoneData, setChildSchoolzoneData] = useState([]);
  const [childGenData, setChildGenData] = useState([]);
  const [elderData, setElderData] = useState([]);
  const [violationData, setViolationData] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [statusMsg, setStatusMsg] = useState('실시간 API 조회 중...');
  const [isMockMode, setIsMockMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [keys, setKeys] = useState({ koroadKey: '', dataGoKrKey: '' });
  const [facilities, setFacilities] = useState({ loading: true });

  const loadFacilities = () => {
    setFacilities({ loading: true });
    fetchFacilities()
      .then((f) => setFacilities({ ...f, loading: false }))
      .catch((e) =>
        setFacilities({ loading: false, message: e.message, cctv: null, speedBump: null })
      );
  };

  useEffect(() => {
    fetchFacilities()
      .then((f) => setFacilities({ ...f, loading: false }))
      .catch((e) =>
        setFacilities({ loading: false, message: e.message, cctv: null, speedBump: null })
      );
  }, []);

  const [apiStatuses, setApiStatuses] = useState({
    child_schoolzone: { success: false, statusText: '확인 중' },
    child_gen: { success: false, statusText: '확인 중' },
    elder: { success: false, statusText: '확인 중' },
    violation: { success: false, statusText: '확인 중' },
  });

  const reloadData = async () => {
    const currentKeys = getApiKeys();
    setKeys(currentKeys);

    const [childRes, childGenRes, elderRes, violRes] = await Promise.all([
      fetchChildAccidents(),
      fetchChildGeneralAccidents(),
      fetchElderAccidents(),
      fetchViolationAccidents(),
    ]);

    setChildSchoolzoneData(childRes.items || []);
    setChildGenData(childGenRes.items || []);
    setElderData(elderRes.items || []);
    setViolationData(violRes.items || []);

    setApiStatuses({
      child_schoolzone: {
        success: childRes.success && childRes.items?.length > 0,
        statusText: childRes.statusText,
        message: childRes.message,
      },
      child_gen: {
        success: childGenRes.success && childGenRes.items?.length > 0,
        statusText: childGenRes.statusText,
        message: childGenRes.message,
      },
      elder: {
        success: elderRes.success && elderRes.items?.length > 0,
        statusText: elderRes.statusText,
        message: elderRes.message,
      },
      violation: {
        success: violRes.success && violRes.items?.length > 0,
        statusText: violRes.statusText,
        message: violRes.message,
      },
    });

    const totalRealItems =
      (childRes.items?.length || 0) +
      (childGenRes.items?.length || 0) +
      (elderRes.items?.length || 0) +
      (violRes.items?.length || 0);

    setIsMockMode(false);
    setStatusMsg(
      totalRealItems > 0
        ? `실시간 API 수신 완료 (${totalRealItems}건)`
        : '실시간 API 연동 대기'
    );

    const firstSpot =
      childRes.items?.[0] ||
      elderRes.items?.[0] ||
      violRes.items?.[0] ||
      childGenRes.items?.[0] ||
      null;
    setSelectedSpot(firstSpot);
  };

  useEffect(() => {
    let active = true;
    async function init() {
      const currentKeys = getApiKeys();
      if (!active) return;
      setKeys(currentKeys);

      const [childRes, childGenRes, elderRes, violRes] = await Promise.all([
        fetchChildAccidents(),
        fetchChildGeneralAccidents(),
        fetchElderAccidents(),
        fetchViolationAccidents(),
      ]);

      if (!active) return;
      setChildSchoolzoneData(childRes.items || []);
      setChildGenData(childGenRes.items || []);
      setElderData(elderRes.items || []);
      setViolationData(violRes.items || []);

      setApiStatuses({
        child_schoolzone: {
          success: childRes.success && childRes.items?.length > 0,
          statusText: childRes.statusText,
          message: childRes.message,
        },
        child_gen: {
          success: childGenRes.success && childGenRes.items?.length > 0,
          statusText: childGenRes.statusText,
          message: childGenRes.message,
        },
        elder: {
          success: elderRes.success && elderRes.items?.length > 0,
          statusText: elderRes.statusText,
          message: elderRes.message,
        },
        violation: {
          success: violRes.success && violRes.items?.length > 0,
          statusText: violRes.statusText,
          message: violRes.message,
        },
      });

      const totalRealItems =
        (childRes.items?.length || 0) +
        (childGenRes.items?.length || 0) +
        (elderRes.items?.length || 0) +
        (violRes.items?.length || 0);

      setIsMockMode(false);
      setStatusMsg(
        totalRealItems > 0
          ? `실시간 API 수신 완료 (${totalRealItems}건)`
          : '실시간 API 연동 대기'
      );

      const firstSpot =
        childRes.items?.[0] ||
        elderRes.items?.[0] ||
        violRes.items?.[0] ||
        childGenRes.items?.[0] ||
        null;
      setSelectedSpot(firstSpot);
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  const handleSaveKeys = (newKeys) => {
    saveApiKeys(newKeys);
    setKeys(newKeys);
    reloadData();
    loadFacilities();
  };

  // 탭에 맞는 실시간 데이터만 취합 (더미 데이터 없음)
  const currentSpots = [];
  if (activeTab === 'all' || activeTab === 'child_schoolzone') {
    currentSpots.push(
      ...childSchoolzoneData.map((d) => ({
        ...d,
        color: '#38bdf8',
        label: '어린이보호구역',
        badgeClass: 'child',
      }))
    );
  }
  if (activeTab === 'all' || activeTab === 'child_gen') {
    currentSpots.push(
      ...childGenData.map((d) => ({
        ...d,
        color: '#06b6d4',
        label: '어린이(보행)',
        badgeClass: 'child',
      }))
    );
  }
  if (activeTab === 'all' || activeTab === 'elder') {
    currentSpots.push(
      ...elderData.map((d) => ({
        ...d,
        color: '#f59e0b',
        label: '노인(보행)',
        badgeClass: 'elder',
      }))
    );
  }
  if (activeTab === 'all' || activeTab === 'violation') {
    currentSpots.push(
      ...violationData.map((d) => ({
        ...d,
        color: '#f43f5e',
        label: d.violation_name || '법규위반',
        badgeClass: 'violation',
      }))
    );
  }

  const totalAccidents = currentSpots.reduce(
    (acc, cur) => acc + (parseInt(cur.occrrnc_cnt, 10) || 0),
    0
  );
  const totalCasualties = currentSpots.reduce(
    (acc, cur) => acc + (parseInt(cur.caslt_cnt, 10) || 0),
    0
  );
  const totalDeaths = currentSpots.reduce(
    (acc, cur) => acc + (parseInt(cur.dth_dnv_cnt, 10) || 0),
    0
  );

  const currentTabStatus =
    activeTab === 'child_schoolzone'
      ? apiStatuses.child_schoolzone
      : activeTab === 'child_gen'
      ? apiStatuses.child_gen
      : activeTab === 'elder'
      ? apiStatuses.elder
      : activeTab === 'violation'
      ? apiStatuses.violation
      : null;

  return (
    <div className="main-page">
      <GNB
        statusMsg={statusMsg}
        isMockMode={isMockMode}
        onOpenSettings={() => setShowSettings(true)}
        currentRegion={currentRegion}
        onSelectRegion={setCurrentRegion}
      />

      <section className="control-bar">
        <div className="mode-tabs">
          <button
            className={`mode-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            통합보기
          </button>
          <button
            className={`mode-tab ${
              activeTab === 'child_schoolzone' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('child_schoolzone')}
          >
            어린이 보호구역 사고 ({childSchoolzoneData.length})
            <span
              className={`tab-status ${
                apiStatuses.child_schoolzone.success ? 'live' : 'mock'
              }`}
            >
              {apiStatuses.child_schoolzone.success ? '수신완료' : '확인'}
            </span>
          </button>
          <button
            className={`mode-tab ${activeTab === 'child_gen' ? 'active' : ''}`}
            onClick={() => setActiveTab('child_gen')}
          >
            어린이 교통사고 ({childGenData.length})
            <span
              className={`tab-status ${
                apiStatuses.child_gen.success ? 'live' : 'mock'
              }`}
            >
              {apiStatuses.child_gen.success ? '수신완료' : '데이터없음'}
            </span>
          </button>
          <button
            className={`mode-tab ${activeTab === 'elder' ? 'active' : ''}`}
            onClick={() => setActiveTab('elder')}
          >
            노인 교통사고 ({elderData.length})
            <span
              className={`tab-status ${
                apiStatuses.elder.success ? 'live' : 'mock'
              }`}
            >
              {apiStatuses.elder.success ? '수신완료' : '확인'}
            </span>
          </button>
          <button
            className={`mode-tab ${activeTab === 'violation' ? 'active' : ''}`}
            onClick={() => setActiveTab('violation')}
          >
            법규위반 다발지 ({violationData.length})
            <span
              className={`tab-status ${
                apiStatuses.violation.success ? 'live' : 'mock'
              }`}
            >
              {apiStatuses.violation.success ? '수신완료' : '확인'}
            </span>
          </button>
        </div>

        <div className="kpi-row">
          <div className="kpi-badge">
            실시간 다발지 <span className="kpi-value">{currentSpots.length}곳</span>
          </div>
          <div className="kpi-badge">
            보호구역 취약지{' '}
            <span className="kpi-value" style={{ color: '#10b981' }}>
              {(facilities.protectionZones || []).length}개소
            </span>
          </div>
          <div className="kpi-badge">
            총 사고 <span className="kpi-value">{totalAccidents}건</span>
          </div>
          <div className="kpi-badge">
            총 사상자 <span className="kpi-value">{totalCasualties}명</span>
          </div>
          <div className="kpi-badge">
            사망자{' '}
            <span className="kpi-value" style={{ color: '#f43f5e' }}>
              {totalDeaths}명
            </span>
          </div>
        </div>
      </section>

      <main className="main-view">
        <MapView
          spots={currentSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={setSelectedSpot}
          protectionZones={facilities.protectionZones || []}
          currentRegion={currentRegion}
          regionPresets={REGION_PRESETS}
        />


        <aside className="detail-panel">
          {currentSpots.length === 0 ? (
            <div className="panel-card" style={{ padding: '24px 16px' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#f59e0b',
                  marginBottom: '8px',
                }}
              >
                API 데이터가 없습니다
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                {currentTabStatus?.message ||
                  '해당 카테고리의 2023년 천안시 동남구 실시간 공공데이터가 없거나 조회 조건과 일치하지 않습니다.'}
              </p>
            </div>
          ) : (
            <>
              <SpotDetailCard spot={selectedSpot} />
              <ChecklistPanel spot={selectedSpot} facilities={facilities} />
              <SpotListCard
                spots={currentSpots}
                selectedSpot={selectedSpot}
                onSelectSpot={setSelectedSpot}
              />
            </>
          )}
        </aside>
      </main>

      <ApiKeyModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        initialKeys={keys}
        onSave={handleSaveKeys}
      />
    </div>
  );
}
