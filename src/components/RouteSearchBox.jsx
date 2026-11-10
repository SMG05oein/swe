import { useState } from 'react';
import Icon from './Icon';
import { searchPlaces } from '../api/geocodeApi';

const PERSONAS = [
  { id: 'child', label: '어린이', icon: 'child' },
  { id: 'elder', label: '어르신', icon: 'elder' },
];

function shortPlaceName(place) {
  if (!place?.name) return '';
  return place.name.split(',')[0].trim();
}

function PlaceField({ kind, place, draft, onDraft, onSelect, picking, onTogglePick }) {
  const [hits, setHits] = useState(null);
  const [searching, setSearching] = useState(false);
  const label = kind === 'origin' ? '출발지' : '도착지';
  const value = draft ?? shortPlaceName(place);

  const runSearch = async () => {
    const q = (draft ?? '').trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      setHits(await searchPlaces(q));
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={`place-field ${picking ? 'picking' : ''}`}>
      <span className={`place-dot ${kind}`} aria-hidden="true" />
      <input
        value={value}
        placeholder={picking ? '지도를 눌러 위치를 정하세요' : `${label} 검색`}
        aria-label={label}
        onChange={(e) => {
          onDraft(e.target.value);
          setHits(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') runSearch();
          if (e.key === 'Escape') setHits(null);
        }}
      />
      {draft ? (
        <button type="button" className="field-btn" aria-label={`${label} 검색`} onClick={runSearch}>
          <Icon name="search" size={16} />
        </button>
      ) : (
        <button
          type="button"
          className={`field-btn ${picking ? 'active' : ''}`}
          aria-label={`지도에서 ${label} 지정`}
          aria-pressed={picking}
          title={`지도에서 ${label} 지정`}
          onClick={onTogglePick}
        >
          <Icon name="crosshair" size={16} />
        </button>
      )}

      {(searching || hits) && (
        <ul className="popover place-hits" role="listbox">
          {searching && <li className="place-hits-empty">검색 중…</li>}
          {!searching && hits?.length === 0 && (
            <li className="place-hits-empty">천안 안에서 찾지 못했습니다. 다른 이름으로 검색하거나 지도를 눌러 주세요.</li>
          )}
          {!searching &&
            hits?.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(h);
                    onDraft(null);
                    setHits(null);
                  }}
                >
                  <Icon name="pin" size={16} />
                  <span className="hit-text">
                    <span className="hit-name">{shortPlaceName(h)}</span>
                    <span className="hit-addr">{h.name.split(',').slice(1, 4).join(',')}</span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export default function RouteSearchBox({
  vulnerableType,
  onVulnerableTypeChange,
  origin,
  destination,
  onSetOrigin,
  onSetDestination,
  pickMode,
  onPickModeChange,
  onSearch,
  loading,
}) {
  const [drafts, setDrafts] = useState({ origin: null, destination: null });
  const [hint, setHint] = useState('');

  const setDraft = (kind) => (v) => setDrafts((d) => ({ ...d, [kind]: v }));
  const togglePick = (kind) => () => {
    setDrafts((d) => ({ ...d, [kind]: null }));
    onPickModeChange(pickMode === kind ? null : kind);
  };

  const swap = () => {
    setDrafts({ origin: null, destination: null });
    onSetOrigin(destination);
    onSetDestination(origin);
  };

  const submit = () => {
    if (!origin || !destination) {
      setHint(!origin ? '출발지를 정해 주세요.' : '도착지를 정해 주세요.');
      return;
    }
    setHint('');
    onSearch();
  };

  return (
    <section className="search-box">
      <div className="persona-tabs" role="tablist" aria-label="보행 대상">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={vulnerableType === p.id}
            className={vulnerableType === p.id ? 'active' : ''}
            onClick={() => onVulnerableTypeChange(p.id)}
          >
            <Icon name={p.icon} size={16} />
            {p.label}
          </button>
        ))}
      </div>

      <div className="place-fields">
        <div className="place-stack">
          <PlaceField
            kind="origin"
            place={origin}
            draft={drafts.origin}
            onDraft={setDraft('origin')}
            onSelect={onSetOrigin}
            picking={pickMode === 'origin'}
            onTogglePick={togglePick('origin')}
          />
          <PlaceField
            kind="destination"
            place={destination}
            draft={drafts.destination}
            onDraft={setDraft('destination')}
            onSelect={onSetDestination}
            picking={pickMode === 'destination'}
            onTogglePick={togglePick('destination')}
          />
        </div>
        <button type="button" className="icon-btn swap-btn" aria-label="출발지와 도착지 바꾸기" onClick={swap}>
          <Icon name="swap" size={18} />
        </button>
      </div>

      <button type="button" className="gd-btn-primary search-submit" onClick={submit} disabled={loading}>
        {loading ? '경로 찾는 중…' : '안심 경로 찾기'}
      </button>
      {hint && <p className="field-hint">{hint}</p>}
    </section>
  );
}
