/** Checklist scoring — missing facility data never deducts points */

export const DEFAULT_CHECKLIST_CONFIG = {
  items: [
    { id: 'cctv', label: 'CCTV', weight: 25, facilityKey: 'cctv' },
    { id: 'speed_bump', label: '과속방지턱', weight: 25, facilityKey: 'speedBump' },
    { id: 'ped_light', label: '보행신호등', weight: 25, facilityKey: 'pedestrianLight' },
    { id: 'countdown', label: '잔여시간표시기', weight: 25, facilityKey: 'countdown' },
  ],
  passThreshold: 60,
  routeGrade: { safeMax: 0, cautionMax: 2 },
  corridorMeters: 80,
  refreshIntervalHours: 24,
};

/**
 * @param {Record<string, number|null|undefined>} counts facility counts; null/undefined = unknown
 * @param {typeof DEFAULT_CHECKLIST_CONFIG} config
 * @returns {{ score: number, maxScore: number, items: Array, grade: 'pass'|'fail' }}
 */
export function evaluateChecklist(counts, config = DEFAULT_CHECKLIST_CONFIG) {
  const items = (config.items || DEFAULT_CHECKLIST_CONFIG.items).map((item) => {
    const raw = counts?.[item.facilityKey];
    if (raw === null || raw === undefined) {
      return {
        id: item.id,
        label: item.label,
        weight: item.weight,
        status: 'unknown',
        present: null,
        earned: 0,
        counted: false,
      };
    }
    const present = Number(raw) > 0;
    return {
      id: item.id,
      label: item.label,
      weight: item.weight,
      status: present ? 'ok' : 'missing',
      present,
      earned: present ? item.weight : 0,
      counted: true,
    };
  });

  const counted = items.filter((i) => i.counted);
  const maxScore = counted.reduce((s, i) => s + i.weight, 0) || 0;
  const score = counted.reduce((s, i) => s + i.earned, 0);
  const normalized = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
  const threshold = config.passThreshold ?? 60;

  return {
    score: normalized,
    rawScore: score,
    maxScore,
    items,
    grade: normalized >= threshold ? 'pass' : 'fail',
    threshold,
  };
}

export function buildDefaultTips({ spotName, category, checklist }) {
  const failItems = (checklist?.items || [])
    .filter((i) => i.status === 'missing')
    .map((i) => i.label);

  const who = category === 'elder' ? '어르신' : '어린이';
  const tips = [];

  if (failItems.length) {
    tips.push(
      `${spotName || '해당 구역'} 주변에 ${failItems.join(', ')}이(가) 부족하니 ${who} 보행 시 좌우를 더 확인하세요.`
    );
  } else {
    tips.push(
      `${spotName || '해당 구역'}은 기본 안전시설이 확인되었으나 사고다발 이력이 있으면 횡단 전 반드시 차량을 확인하세요.`
    );
  }

  if (category === 'elder') {
    tips.push('점멸 신호나 잔여시간이 짧을 때는 무리하게 건너지 말고 다음 신호를 기다리세요.');
  } else {
    tips.push('주정차 차량 사이로 뛰어나오지 말고, 보호자와 함께 손을 잡고 건너세요.');
  }

  return {
    guardianTips: tips,
    pedestrianTips: tips.slice(0, 1),
    source: 'default_text',
  };
}
