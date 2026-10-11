import { useState, useEffect, useCallback } from 'react';
import './Main.css';
import GNB from '../components/GNB';
import MapView from '../components/MapView';
import { REGION_PRESETS } from '../data/regions';
import SpotDetailCard from '../components/SpotDetailCard';
import SpotListCard from '../components/SpotListCard';
import ApiKeyModal from '../components/ApiKeyModal';
import {
  fetchChildAccidents,
  fetchChildGeneralAccidents,
  fetchElderAccidents,
} from '../api/trafficApi';
import { getApiKeys, saveApiKeys } from '../api/apiClient';
import { fetchFacilities } from '../api/facilitiesApi';
import ChecklistPanel from '../components/ChecklistPanel';
import DetailModal from '../components/DetailModal';

export default function Main() {
  const [currentRegion, setCurrentRegion] = useState('shinbu');
  const [selectedYear, setSelectedYear] = useState('2023');
  const [activeTab, setActiveTab] = useState('all'); // 통합보기가 기본

  const [childSchoolzoneData, setChildSchoolzoneData] = useState([]);
  const [childGenData, setChildGenData] = useState([]);
  const [elderData, setElderData] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [isAccidentsLoading, setIsAccidentsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('실시간 데이터 불러오는 중...');
  const [isMockMode, setIsMockMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
  });

  const reloadData = useCallback(
    async (targetYear = selectedYear, targetRegion = currentRegion) => {
      setIsAccidentsLoading(true);
      setStatusMsg('실시간 API 데이터 불러오는 중...');
      const currentKeys = getApiKeys();
      setKeys(currentKeys);

      const targetGuGun = targetRegion === 'dujeong' ? '133' : '131';

      // 노인 사고와 어린이 사고 2대 핵심 취약계층 데이터만 수신
      const [childRes, childGenRes, elderRes] = await Promise.all([
        fetchChildAccidents({ searchYearCd: targetYear, guGun: targetGuGun }),
        fetchChildGeneralAccidents({ searchYearCd: targetYear, guGun: targetGuGun }),
        fetchElderAccidents({ searchYearCd: targetYear, guGun: targetGuGun }),
      ]);

      setChildSchoolzoneData(childRes.items || []);
      setChildGenData(childGenRes.items || []);
      setElderData(elderRes.items || []);

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
      });

      const totalRealItems =
        (elderRes.items?.length || 0) +
        (childRes.items?.length || 0) +
        (childGenRes.items?.length || 0);

      setIsMockMode(false);
      setIsAccidentsLoading(false);

      const yearLabel =
        targetYear === 'ALL'
          ? '2012~2025년 전체'
          : targetYear === 'RECENT3'
          ? '최근 3개년'
          : `${targetYear}년`;

      setStatusMsg(
        totalRealItems > 0
          ? `실시간 API 수신 완료 (${yearLabel} ${totalRealItems}건)`
          : '실시간 API 연동 대기'
      );

      const firstSpot =
        elderRes.items?.[0] ||
        childRes.items?.[0] ||
        childGenRes.items?.[0] ||
        null;
      setSelectedSpot(firstSpot);
    },
    [selectedYear, currentRegion]
  );

  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      if (!isCancelled) {
        reloadData(selectedYear, currentRegion);
      }
    }, 0);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [selectedYear, currentRegion, reloadData]);

  const handleSaveKeys = (newKeys) => {
    saveApiKeys(newKeys);
    setKeys(newKeys);
    reloadData();
    loadFacilities();
  };

  // 노인 사고와 어린이 사고 2가지 유형만 취합
  const currentSpots = [];
  if (activeTab === 'all' || activeTab === 'elder') {
    currentSpots.push(
      ...elderData.map((d) => ({
        ...d,
        color: '#f59e0b',
        label: '노인 사고 (보행)',
        badgeClass: 'elder',
      }))
    );
  }
  if (activeTab === 'all' || activeTab === 'child' || activeTab === 'child_schoolzone') {
    currentSpots.push(
      ...childSchoolzoneData.map((d) => ({
        ...d,
        color: '#38bdf8',
        label: '어린이 사고 (스쿨존)',
        badgeClass: 'child',
      }))
    );
  }
  if (activeTab === 'all' || activeTab === 'child' || activeTab === 'child_gen') {
    currentSpots.push(
      ...childGenData.map((d) => ({
        ...d,
        color: '#06b6d4',
        label: '어린이 사고 (보행)',
        badgeClass: 'child',
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

  const totalChildCount = childSchoolzoneData.length + childGenData.length;
  const currentTabStatus =
    activeTab === 'elder'
      ? apiStatuses.elder
      : activeTab === 'child'
      ? (apiStatuses.child_schoolzone.success || apiStatuses.child_gen.success
          ? { success: true, statusText: '수신완료' }
          : { success: false, statusText: '데이터없음' })
      : null;

  return (
    <div className="main-page">
      <GNB
        statusMsg={statusMsg}
        isMockMode={isMockMode}
        onOpenSettings={() => setShowSettings(true)}
        currentRegion={currentRegion}
        onSelectRegion={setCurrentRegion}
        currentYear={selectedYear}
        onSelectYear={(yr) => setSelectedYear(yr)}
      />

      <section className="control-bar">
        <div className="mode-tabs">
          <button
            className={`mode-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            통합보기 ({elderData.length + totalChildCount})
          </button>
          <button
            className={`mode-tab ${activeTab === 'elder' ? 'active' : ''}`}
            onClick={() => setActiveTab('elder')}
          >
            노인 사고 ({elderData.length})
            <span
              className={`tab-status ${
                isAccidentsLoading
                  ? 'loading'
                  : apiStatuses.elder.success
                  ? 'live'
                  : 'mock'
              }`}
            >
              {isAccidentsLoading
                ? '불러오는 중...'
                : apiStatuses.elder.success
                ? '수신완료'
                : '데이터없음'}
            </span>
          </button>
          <button
            className={`mode-tab ${activeTab === 'child' ? 'active' : ''}`}
            onClick={() => setActiveTab('child')}
          >
            어린이 사고 ({totalChildCount})
            <span
              className={`tab-status ${
                isAccidentsLoading
                  ? 'loading'
                  : apiStatuses.child_schoolzone.success || apiStatuses.child_gen.success
                  ? 'live'
                  : 'mock'
              }`}
            >
              {isAccidentsLoading
                ? '불러오는 중...'
                : apiStatuses.child_schoolzone.success || apiStatuses.child_gen.success
                ? '수신완료'
                : '데이터없음'}
            </span>
          </button>
        </div>

        <div className="kpi-row">
          <div className="kpi-badge" style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
            통계 기준{' '}
            <span className="kpi-value" style={{ color: '#38bdf8' }}>
              {selectedYear === 'ALL'
                ? '2012~2025년 통합'
                : selectedYear === 'RECENT3'
                ? '최근 3개년'
                : `${selectedYear}년`}
            </span>
          </div>
          <div className="kpi-badge">
            다발지점{' '}
            <span className="kpi-value">
              {isAccidentsLoading ? '불러오는 중...' : `${currentSpots.length}곳`}
            </span>
          </div>
          <div className="kpi-badge">
            보호구역 (스쿨+실버){' '}
            <span className="kpi-value" style={{ color: '#10b981' }}>
              {facilities.loading
                ? '불러오는 중...'
                : `${(facilities.protectionZones || []).length +
                    (facilities.elderProtectionZones || []).length}개소`}
            </span>
          </div>
          <div className="kpi-badge">
            총 사고{' '}
            <span className="kpi-value">
              {isAccidentsLoading ? '불러오는 중...' : `${totalAccidents}건`}
            </span>
          </div>
          <div className="kpi-badge">
            총 사상자{' '}
            <span className="kpi-value">
              {isAccidentsLoading ? '불러오는 중...' : `${totalCasualties}명`}
            </span>
          </div>
          <div className="kpi-badge">
            사망자{' '}
            <span className="kpi-value" style={{ color: '#f43f5e' }}>
              {isAccidentsLoading ? '불러오는 중...' : `${totalDeaths}명`}
            </span>
          </div>
        </div>
      </section>

      <main className="main-view">
        <MapView
          spots={currentSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={setSelectedSpot}
          protectionZones={[
            ...(facilities.protectionZones || []),
            ...(facilities.elderProtectionZones || []),
          ]}
          currentRegion={currentRegion}
          regionPresets={REGION_PRESETS}
          onOpenDetail={(spot) => {
            setSelectedSpot(spot);
            setShowDetailModal(true);
          }}
        />


        <aside className="detail-panel">
          {currentSpots.length === 0 ? (
            <div className="panel-card" style={{ padding: '24px 16px' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isAccidentsLoading ? '#38bdf8' : '#f59e0b',
                  marginBottom: '8px',
                }}
              >
                {isAccidentsLoading ? '데이터 불러오는 중...' : 'API 데이터가 없습니다'}
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                {isAccidentsLoading
                  ? '실시간 교통사고 및 시설물 데이터를 불러오는 중입니다. 잠시만 기다려 주세요.'
                  : currentTabStatus?.message ||
                    '해당 카테고리의 2023년 천안시 동남구 실시간 공공데이터가 없거나 조회 조건과 일치하지 않습니다.'}
              </p>
            </div>
          ) : (
            <>
              <SpotDetailCard
                spot={selectedSpot}
                onOpenDetail={() => setShowDetailModal(true)}
              />
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

      <DetailModal
        spot={selectedSpot}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        facilities={facilities}
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
