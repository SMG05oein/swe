import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Admin.css';
import {
  fetchChecklistConfig,
  saveChecklistConfig,
  triggerDataRefresh,
  fetchRefreshStatus,
} from '../api/adminApi';
import { DEFAULT_CHECKLIST_CONFIG } from '../domain/checklist';

const TOKEN_KEY = 'swe_admin_token';

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [authed, setAuthed] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [config, setConfig] = useState(DEFAULT_CHECKLIST_CONFIG);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('child');

  const load = async () => {
    try {
      const [cfg, st] = await Promise.all([fetchChecklistConfig(), fetchRefreshStatus()]);
      setConfig({ ...DEFAULT_CHECKLIST_CONFIG, ...cfg });
      setStatus(st);
    } catch (e) {
      setMessage(e.message || '설정을 불러오지 못했습니다. 백엔드(8000)를 확인하세요.');
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    localStorage.setItem(TOKEN_KEY, token);
    setAuthed(true);
    setMessage('');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveChecklistConfig(config, token);
      setConfig(saved);
      setMessage('설정이 저장되었습니다.');
    } catch (e) {
      setMessage(e.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setMessage('');
    try {
      const st = await triggerDataRefresh(token);
      setStatus(st);
      setMessage('데이터 갱신이 기록되었습니다.');
    } catch (e) {
      setMessage(e.message || '갱신 실패');
    }
  };

  const updateItem = (index, patch) => {
    setConfig((prev) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });
  };

  const currentPersonaData = config.personas?.[selectedPersona] || DEFAULT_CHECKLIST_CONFIG.personas?.[selectedPersona];
  const activeIterNum = currentPersonaData?.activeIteration || 5;
  const currentIterData =
    currentPersonaData?.iterations?.find((it) => it.iteration === activeIterNum) ||
    currentPersonaData?.iterations?.[currentPersonaData.iterations.length - 1];

  const updatePersonaIteration = (personaKey, iterNum) => {
    setConfig((prev) => {
      const personas = { ...(prev.personas || DEFAULT_CHECKLIST_CONFIG.personas) };
      if (personas[personaKey]) {
        personas[personaKey] = {
          ...personas[personaKey],
          activeIteration: Number(iterNum),
        };
      }
      return { ...prev, personas };
    });
  };

  if (!authed) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <h1>관리자 로그인</h1>
          <p>서버 환경변수 ADMIN_TOKEN과 동일한 토큰을 입력하세요.</p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_TOKEN"
          />
          <button type="button" onClick={handleLogin}>
            입장
          </button>
          <Link to="/">보호자 화면으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>관리자 · 평가 기준 / 데이터 갱신</h1>
        <Link to="/">보호자 화면</Link>
      </header>

      {message && <div className="admin-msg">{message}</div>}

      <section className="admin-card">
        <h2>공공데이터 갱신</h2>
        <p className="admin-help">
          수동 갱신으로 서버 캐시 상태를 갱신합니다. 주기(시간)는 아래 설정과 연동됩니다.
        </p>
        <div className="admin-row">
          <button type="button" onClick={handleRefresh}>
            지금 갱신
          </button>
          <span>
            상태: {status?.message || '-'} / 최근 성공:{' '}
            {status?.lastSuccessAt || '없음'}
          </span>
        </div>
        <label>
          주기 갱신 간격(시간)
          <input
            type="number"
            min="0"
            value={config.refreshIntervalHours ?? 24}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                refreshIntervalHours: Number(e.target.value),
              }))
            }
          />
        </label>
      </section>

      <section className="admin-card">
        <h2>페르소나별 5단계 고도화 평가표 설정</h2>
        <p className="admin-help">
          각 페르소나(어린이, 어르신, 관리자)별로 1~5회차 고도화 평가표를 선택하고 적용할 단계를 지정합니다.
        </p>
        <div className="admin-row" style={{ gap: '8px', marginBottom: '14px' }}>
          {[
            { key: 'child', label: '어린이 보호자' },
            { key: 'elder', label: '어르신 보호자' },
            { key: 'admin', label: '교통안전 관리자' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.key}
              style={{
                background: selectedPersona === tab.key ? '#0284c7' : '#1e293b',
                color: selectedPersona === tab.key ? '#fff' : '#94a3b8',
                border: '1px solid #334155',
              }}
              onClick={() => setSelectedPersona(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {currentPersonaData && (
          <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>{currentPersonaData.name} 적용 단계 (1~5단계)</strong>
              <select
                value={activeIterNum}
                onChange={(e) => updatePersonaIteration(selectedPersona, e.target.value)}
                style={{
                  background: '#020617',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 10px',
                }}
              >
                {(currentPersonaData.iterations || []).map((it) => (
                  <option key={it.iteration} value={it.iteration}>
                    {it.iteration}단계: {it.title} (합격 {it.passThreshold}점)
                  </option>
                ))}
              </select>
            </div>

            {currentIterData && (
              <div>
                <p style={{ fontSize: '13px', color: '#38bdf8', margin: '4px 0 10px' }}>
                  현재 적용 지표 ({currentIterData.items?.length || 0}개 항목 / 기준 {currentIterData.passThreshold}점):
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  {(currentIterData.items || []).map((it) => (
                    <div
                      key={it.id}
                      style={{
                        background: '#1e293b',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        border: '1px solid #334155',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{it.label}</div>
                      <div style={{ color: '#94a3b8' }}>
                        가중치: {it.weight}점 · <code>{it.facilityKey}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2>기본 체크리스트 항목 · 가중치 (글로벌)</h2>
        {(config.items || []).map((item, idx) => (
          <div className="admin-item" key={item.id || idx}>
            <input
              value={item.label}
              onChange={(e) => updateItem(idx, { label: e.target.value })}
            />
            <input
              type="number"
              value={item.weight}
              onChange={(e) => updateItem(idx, { weight: Number(e.target.value) })}
            />
            <code>{item.facilityKey}</code>
          </div>
        ))}
        <label>
          합격 기준 점수
          <input
            type="number"
            value={config.passThreshold ?? 60}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, passThreshold: Number(e.target.value) }))
            }
          />
        </label>
        <div className="admin-row">
          <label>
            안전 최대 위험구역 수
            <input
              type="number"
              value={config.routeGrade?.safeMax ?? 0}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  routeGrade: {
                    ...(prev.routeGrade || {}),
                    safeMax: Number(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label>
            주의 최대 위험구역 수
            <input
              type="number"
              value={config.routeGrade?.cautionMax ?? 2}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  routeGrade: {
                    ...(prev.routeGrade || {}),
                    cautionMax: Number(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label>
            경로 복도(m)
            <input
              type="number"
              value={config.corridorMeters ?? 80}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  corridorMeters: Number(e.target.value),
                }))
              }
            />
          </label>
        </div>
        <button type="button" disabled={saving} onClick={handleSave}>
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </section>
    </div>
  );
}
