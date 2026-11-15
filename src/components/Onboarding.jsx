import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { markOnboardingSeen } from './onboardingStorage';
import './Onboarding.css';

const INTRO_LINE = 'M58 150 C 95 120, 120 160, 150 128 S 205 92, 228 60';

// 경로 그림: 출발 → 도착 순서로 이어 그림. delay·dur는 각 구간 길이에 비례(초)
const ROUTE_CASING = [
  { d: 'M60 70H90V110', delay: 0.75, dur: 0.35 },
  { d: 'M90 110V140H230', delay: 1.1, dur: 0.85 },
];
const ROUTE_LINES = [
  { d: 'M60 70H90V100', color: '#2563eb', delay: 0.75, dur: 0.3 },
  { d: 'M90 100V140H150', color: '#f5b301', delay: 1.05, dur: 0.5 },
  { d: 'M150 140H220', color: '#e5484d', delay: 1.55, dur: 0.35 },
  { d: 'M220 140H230', color: '#2563eb', delay: 1.9, dur: 0.05 },
];
const timing = ({ delay, dur }) => ({ animationDelay: `${delay}s`, animationDuration: `${dur}s` });

function IntroArt() {
  return (
    <svg viewBox="0 0 280 200" className="ob-art ob-art-intro" aria-hidden="true">
      <defs>
        {/* 점선은 길이로 그릴 수 없어서, 실선 마스크를 그려 점선이 차례로 드러나게 함 */}
        <mask id="ob-intro-line" maskUnits="userSpaceOnUse" x="0" y="0" width="280" height="200">
          <path className="ob-draw ob-intro-line" pathLength="1" d={INTRO_LINE} fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
        </mask>
      </defs>
      <circle className="ob-pop ob-intro-bg" cx="140" cy="100" r="84" fill="#eaf1fe" />
      <path d={INTRO_LINE} mask="url(#ob-intro-line)" fill="none" stroke="#bfd3fb" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 12" />
      <circle className="ob-pop ob-intro-start" cx="58" cy="150" r="9" fill="#16a34a" stroke="#fff" strokeWidth="3" />
      <circle className="ob-pop ob-intro-end" cx="228" cy="60" r="9" fill="#e5484d" stroke="#fff" strokeWidth="3" />
      <g className="ob-pop ob-intro-icon">
        <rect x="104" y="56" width="72" height="72" rx="20" fill="#2563eb" />
        <path className="ob-draw ob-intro-shield" pathLength="1" d="M140 72 l-18 8 v14 c0 11 8 21 18 25 c10 -4 18 -14 18 -25 v-14 z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
        <path className="ob-draw ob-intro-check" pathLength="1" d="m132 95 6 6 11 -11" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function RouteArt() {
  return (
    <svg viewBox="0 0 280 200" className="ob-art ob-art-route" aria-hidden="true">
      <rect x="20" y="14" width="240" height="172" rx="20" fill="#eef0f3" />
      <g stroke="#fff" strokeWidth="10" strokeLinecap="round">
        <path d="M20 70H260" />
        <path d="M20 140H260" />
        <path d="M90 14V186" />
        <path d="M190 14V186" />
      </g>
      <circle className="ob-fade ob-route-zone" cx="190" cy="140" r="34" fill="#e5484d" opacity="0.1" stroke="#e5484d" strokeOpacity="0.4" />
      <g fill="none" strokeWidth="9" strokeLinecap="round">
        {ROUTE_CASING.map((seg) => (
          <path key={seg.d} className="ob-draw ob-route-seg" pathLength="1" d={seg.d} stroke="#fff" strokeWidth="13" style={timing(seg)} />
        ))}
        {ROUTE_LINES.map((seg) => (
          <path key={seg.d} className="ob-draw ob-route-seg" pathLength="1" d={seg.d} stroke={seg.color} style={timing(seg)} />
        ))}
      </g>
      <g className="ob-pop ob-route-start">
        <rect x="38" y="44" width="44" height="22" rx="11" fill="#16a34a" />
        <text x="60" y="59" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">출발</text>
      </g>
      <g className="ob-pop ob-route-end">
        <rect x="208" y="114" width="44" height="22" rx="11" fill="#e5484d" />
        <text x="230" y="129" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">도착</text>
      </g>
    </svg>
  );
}

function HazardArt() {
  return (
    <svg viewBox="0 0 280 200" className="ob-art ob-art-hazard" aria-hidden="true">
      <g className="ob-rise ob-hazard-card">
        <rect x="44" y="16" width="192" height="168" rx="20" fill="#fff" stroke="#e3e6eb" strokeWidth="2" />
      </g>
      {/* 번호 핀을 누른 느낌: 핀이 튀어나온 뒤 원이 한 번 퍼짐 */}
      <circle className="ob-ripple" cx="74" cy="48" r="13" fill="none" stroke="#e5484d" strokeWidth="2" />
      <g className="ob-pop ob-hazard-pin">
        <circle cx="74" cy="48" r="13" fill="#e5484d" />
        <text x="74" y="53" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">1</text>
      </g>
      <rect className="ob-grow" style={{ animationDelay: '0.6s' }} x="96" y="40" width="96" height="9" rx="4.5" fill="#191f28" />
      <rect className="ob-grow" style={{ animationDelay: '0.72s' }} x="96" y="54" width="60" height="7" rx="3.5" fill="#cfd4dc" />
      {/* 위험도 막대가 차오르고 기준선이 내려앉음 */}
      <rect className="ob-fade ob-hazard-gauge" x="62" y="80" width="156" height="8" rx="4" fill="#e9ecf1" />
      <rect className="ob-grow ob-hazard-gauge-fill" x="62" y="80" width="40" height="8" rx="4" fill="#d93036" />
      <rect className="ob-drop ob-hazard-marker" x="180" y="76" width="2.5" height="16" fill="#191f28" />
      {/* 점검 항목이 한 줄씩: ✕ ✕ 다음 마지막 줄은 ✓가 그려짐 */}
      {[0, 1, 2].map((i) => {
        const delay = 1.35 + i * 0.2;
        return (
          <g key={i} transform={`translate(62 ${108 + i * 24})`}>
            <g className="ob-rise" style={{ animationDelay: `${delay}s` }}>
              <g className="ob-pop" style={{ animationDelay: `${delay + 0.05}s` }}>
                <circle cx="9" cy="6" r="9" fill={i === 2 ? '#e6f6ee' : '#fdecec'} />
                {i !== 2 && (
                  <path d="M5.5 2.5l7 7M12.5 2.5l-7 7" stroke="#d93036" strokeWidth="2.2" strokeLinecap="round" />
                )}
              </g>
              {i === 2 && (
                <path
                  className="ob-draw"
                  style={{ animationDelay: `${delay + 0.25}s`, animationDuration: '0.3s' }}
                  pathLength="1"
                  d="m4.5 6 3 3 6 -6"
                  fill="none"
                  stroke="#0f8a4f"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <rect className="ob-grow" style={{ animationDelay: `${delay + 0.08}s` }} x="26" y="2" width={i === 1 ? 86 : 104} height="8" rx="4" fill="#cfd4dc" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

const STEPS = [
  {
    title: '아이와 어르신이 걷는 길,\n미리 살펴볼게요',
    body: '천안 신부동·두정동의 교통사고 기록과 안전시설 공공데이터로 보행 경로의 위험을 알려드려요.',
    Art: IntroArt,
  },
  {
    title: '출발지와 도착지만 정하면\n위험한 구간을 색으로 보여드려요',
    body: '사고다발지역을 지나는 구간은 빨강, 안전시설이 부족한 보호구역 근처는 노랑으로 표시해요.',
    Art: RouteArt,
  },
  {
    title: '위험한 곳은\n번호로 알려드려요',
    body: '번호를 누르면 사고 기록, 안전시설 점검 결과, 보호자를 위한 AI 유의점을 볼 수 있어요.',
    Art: HazardArt,
  },
  {
    title: '누구의 길을\n확인할까요?',
    body: '걸음 속도와 글자 크기를 맞춰 드려요. 나중에 언제든 바꿀 수 있어요.',
    choose: true,
  },
];

const PERSONAS = [
  { id: 'child', icon: 'child', label: '어린이', desc: '보호자와 함께 걷는 속도로 계산해요' },
  { id: 'elder', icon: 'elder', label: '어르신', desc: '느린 걸음으로 계산하고 글자를 크게 보여드려요' },
];

export default function Onboarding({ initialPersona = 'child', onFinish }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState('next');
  const [persona, setPersona] = useState(initialPersona);
  const primaryRef = useRef(null);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  const finish = (chosen) => {
    markOnboardingSeen();
    onFinish(chosen);
  };

  const go = (delta) => {
    const next = step + delta;
    if (next < 0) return;
    if (next >= STEPS.length) {
      finish(persona);
      return;
    }
    setDir(delta > 0 ? 'next' : 'prev');
    setStep(next);
  };

  useEffect(() => {
    primaryRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="ob-backdrop">
      <div className="ob-sheet" role="dialog" aria-modal="true" aria-labelledby="ob-title">
        <header className="ob-header">
          {step > 0 ? (
            <button type="button" className="icon-btn" aria-label="이전" onClick={() => go(-1)}>
              <Icon name="back" size={22} />
            </button>
          ) : (
            <span className="ob-header-space" />
          )}
          {!last && (
            <button type="button" className="ob-skip" onClick={() => finish(null)}>
              건너뛰기
            </button>
          )}
        </header>

        <div key={step} className={`ob-content slide-${dir}`}>
          <h2 id="ob-title" className="ob-title">{current.title}</h2>
          <p className="ob-body">{current.body}</p>

          {current.choose ? (
            <div className="ob-choices" role="radiogroup" aria-label="보행 대상">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={persona === p.id}
                  className={`ob-choice ${persona === p.id ? 'selected' : ''}`}
                  onClick={() => setPersona(p.id)}
                >
                  <span className="ob-choice-icon">
                    <Icon name={p.icon} size={26} />
                  </span>
                  <span className="ob-choice-text">
                    <span className="ob-choice-label">{p.label}</span>
                    <span className="ob-choice-desc">{p.desc}</span>
                  </span>
                  <span className="ob-radio" aria-hidden="true">
                    {persona === p.id && <Icon name="check" size={14} strokeWidth={3} />}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="ob-art-wrap">
              <current.Art />
            </div>
          )}
        </div>

        <footer className="ob-footer">
          <div className="ob-dots" aria-label={`${STEPS.length}단계 중 ${step + 1}단계`}>
            {STEPS.map((_, i) => (
              <span key={i} className={i === step ? 'active' : ''} />
            ))}
          </div>
          <button ref={primaryRef} type="button" className="gd-btn-primary ob-next" onClick={() => go(1)}>
            {last ? '시작하기' : '다음'}
          </button>
        </footer>
      </div>
    </div>
  );
}
