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

  const load = async () => {
    try {
      const [cfg, st] = await Promise.all([fetchChecklistConfig(), fetchRefreshStatus()]);
      setConfig(cfg);
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
        <h2>체크리스트 항목 · 가중치</h2>
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
