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
  personas: {
    child: {
      name: '어린이 보호자',
      activeIteration: 5,
      iterations: [
        {
          iteration: 1,
          title: '기초 시설 점검',
          passThreshold: 60,
          items: [
            { id: 'cctv', label: 'CCTV', weight: 25, facilityKey: 'cctv' },
            { id: 'speed_bump', label: '과속방지턱', weight: 25, facilityKey: 'speedBump' },
            { id: 'ped_light', label: '보행신호등', weight: 25, facilityKey: 'pedestrianLight' },
            { id: 'countdown', label: '잔여시간표시기', weight: 25, facilityKey: 'countdown' },
          ],
        },
        {
          iteration: 2,
          title: '방호 및 인지 시설 도입',
          passThreshold: 70,
          items: [
            { id: 'safety_fence', label: '방호울타리', weight: 25, facilityKey: 'safetyFence' },
            { id: 'yellow_carpet', label: '옐로카펫', weight: 20, facilityKey: 'yellowCarpet' },
            { id: 'cctv', label: 'CCTV', weight: 20, facilityKey: 'cctv' },
            { id: 'ped_light', label: '보행신호등', weight: 20, facilityKey: 'pedestrianLight' },
            { id: 'speed_bump', label: '과속방지턱', weight: 15, facilityKey: 'speedBump' },
          ],
        },
        {
          iteration: 3,
          title: '스쿨존 규제 및 시간대 사고 연동',
          passThreshold: 70,
          items: [
            { id: 'school_cam', label: '스쿨존 단속카메라', weight: 25, facilityKey: 'schoolZoneCamera' },
            { id: 'safety_fence', label: '방호울타리', weight: 25, facilityKey: 'safetyFence' },
            { id: 'yellow_carpet', label: '옐로카펫', weight: 20, facilityKey: 'yellowCarpet' },
            { id: 'speed_bump', label: '과속방지턱', weight: 15, facilityKey: 'speedBump' },
            { id: 'countdown', label: '잔여시간표시기', weight: 15, facilityKey: 'countdown' },
          ],
        },
        {
          iteration: 4,
          title: '보행 공간 기하구조 및 시야 평가',
          passThreshold: 75,
          items: [
            { id: 'safety_fence', label: '보차분리 방호울타리', weight: 25, facilityKey: 'safetyFence' },
            { id: 'school_cam', label: '불법주정차 단속CCTV', weight: 20, facilityKey: 'schoolZoneCamera' },
            { id: 'yellow_carpet', label: '시야유도 옐로카펫', weight: 20, facilityKey: 'yellowCarpet' },
            { id: 'ped_light', label: '보행신호체계', weight: 20, facilityKey: 'pedestrianLight' },
            { id: 'speed_bump', label: '진입감속 과속방지턱', weight: 15, facilityKey: 'speedBump' },
          ],
        },
        {
          iteration: 5,
          title: '통합 어린이 보행안전 스코어카드(C-Safety)',
          passThreshold: 80,
          items: [
            { id: 'safety_fence', label: '보차분리 방호울타리', weight: 25, facilityKey: 'safetyFence' },
            { id: 'school_cam', label: '스쿨존 무인단속카메라', weight: 20, facilityKey: 'schoolZoneCamera' },
            { id: 'yellow_carpet', label: '옐로카펫·노란횡단보도', weight: 20, facilityKey: 'yellowCarpet' },
            { id: 'floor_light', label: '바닥형 스마트신호등', weight: 20, facilityKey: 'floorLight' },
            { id: 'countdown', label: '보행신호 잔여시간표시기', weight: 15, facilityKey: 'countdown' },
          ],
        },
      ],
    },
    elder: {
      name: '어르신 보호자',
      activeIteration: 5,
      iterations: [
        {
          iteration: 1,
          title: '기초 시설 점검',
          passThreshold: 60,
          items: [
            { id: 'cctv', label: 'CCTV', weight: 25, facilityKey: 'cctv' },
            { id: 'speed_bump', label: '과속방지턱', weight: 25, facilityKey: 'speedBump' },
            { id: 'ped_light', label: '보행신호등', weight: 25, facilityKey: 'pedestrianLight' },
            { id: 'countdown', label: '잔여시간표시기', weight: 25, facilityKey: 'countdown' },
          ],
        },
        {
          iteration: 2,
          title: '보행 속도 적정성 및 신호 인지 도입',
          passThreshold: 65,
          items: [
            { id: 'countdown', label: '잔여시간표시기(신호적정)', weight: 30, facilityKey: 'countdown' },
            { id: 'acoustic_signal', label: '보행음향신호기', weight: 20, facilityKey: 'acousticSignal' },
            { id: 'floor_light', label: '바닥형 보행신호등', weight: 20, facilityKey: 'floorLight' },
            { id: 'ped_light', label: '보행신호등', weight: 15, facilityKey: 'pedestrianLight' },
            { id: 'speed_bump', label: '과속방지턱', weight: 15, facilityKey: 'speedBump' },
          ],
        },
        {
          iteration: 3,
          title: '무장애 수평 이동 및 경사도·단차 평가',
          passThreshold: 70,
          items: [
            { id: 'barrier_free', label: '보도 턱낮춤·무장애보행로', weight: 30, facilityKey: 'barrierFree' },
            { id: 'countdown', label: '보행잔여시간표시기', weight: 25, facilityKey: 'countdown' },
            { id: 'floor_light', label: '바닥형 보행신호등', weight: 20, facilityKey: 'floorLight' },
            { id: 'acoustic_signal', label: '음향신호기', weight: 15, facilityKey: 'acousticSignal' },
            { id: 'speed_bump', label: '과속방지턱', weight: 10, facilityKey: 'speedBump' },
          ],
        },
        {
          iteration: 4,
          title: '고령자 활동 거점 및 무단횡단 취약지 연동',
          passThreshold: 70,
          items: [
            { id: 'barrier_free', label: '무장애 턱낮춤 보행로', weight: 25, facilityKey: 'barrierFree' },
            { id: 'safety_fence', label: '무단횡단 방지펜스', weight: 25, facilityKey: 'safetyFence' },
            { id: 'countdown', label: '잔여시간표시기', weight: 20, facilityKey: 'countdown' },
            { id: 'floor_light', label: '바닥형 신호등', weight: 15, facilityKey: 'floorLight' },
            { id: 'acoustic_signal', label: '음향신호기', weight: 15, facilityKey: 'acousticSignal' },
          ],
        },
        {
          iteration: 5,
          title: '통합 어르신 무장애 안심 스코어카드(S-Safety)',
          passThreshold: 75,
          items: [
            { id: 'barrier_free', label: '무장애 보도 턱낮춤·단차제거', weight: 25, facilityKey: 'barrierFree' },
            { id: 'smart_shelter', label: '스마트 쉼터·폭염한파대피소', weight: 20, facilityKey: 'smartShelter' },
            { id: 'floor_light', label: '바닥형 보행신호등', weight: 20, facilityKey: 'floorLight' },
            { id: 'acoustic_signal', label: '시각·노인 음향신호기', weight: 20, facilityKey: 'acousticSignal' },
            { id: 'countdown', label: '보행 여유 잔여시간표시기', weight: 15, facilityKey: 'countdown' },
          ],
        },
      ],
    },
    admin: {
      name: '교통안전 관리자',
      activeIteration: 5,
      iterations: [
        {
          iteration: 1,
          title: '기초 시설 단순 집계',
          passThreshold: 60,
          items: [
            { id: 'cctv', label: 'CCTV', weight: 25, facilityKey: 'cctv' },
            { id: 'speed_bump', label: '과속방지턱', weight: 25, facilityKey: 'speedBump' },
            { id: 'ped_light', label: '보행신호등', weight: 25, facilityKey: 'pedestrianLight' },
            { id: 'countdown', label: '잔여시간표시기', weight: 25, facilityKey: 'countdown' },
          ],
        },
        {
          iteration: 2,
          title: '법정 보호구역 안전설비 충족률',
          passThreshold: 75,
          items: [
            { id: 'safety_fence', label: '법정 방호울타리', weight: 25, facilityKey: 'safetyFence' },
            { id: 'school_cam', label: '무인단속CCTV', weight: 25, facilityKey: 'schoolZoneCamera' },
            { id: 'speed_bump', label: '고원식 과속방지턱', weight: 20, facilityKey: 'speedBump' },
            { id: 'ped_light', label: '보행신호등', weight: 15, facilityKey: 'pedestrianLight' },
            { id: 'yellow_carpet', label: '옐로카펫', weight: 15, facilityKey: 'yellowCarpet' },
          ],
        },
        {
          iteration: 3,
          title: '사고심각도(EPDO) 및 결측 인과 분석',
          passThreshold: 80,
          items: [
            { id: 'school_cam', label: '사고다발 단속카메라', weight: 25, facilityKey: 'schoolZoneCamera' },
            { id: 'safety_fence', label: '사상사고 차단울타리', weight: 25, facilityKey: 'safetyFence' },
            { id: 'speed_bump', label: '제동유도 방지턱', weight: 20, facilityKey: 'speedBump' },
            { id: 'floor_light', label: '스마트 바닥신호등', weight: 15, facilityKey: 'floorLight' },
            { id: 'barrier_free', label: '보행 연속성(턱낮춤)', weight: 15, facilityKey: 'barrierFree' },
          ],
        },
        {
          iteration: 4,
          title: '예산 대비 사고감소 B/C 및 투자 우선순위',
          passThreshold: 80,
          items: [
            { id: 'school_cam', label: '고위험 무인단속카메라', weight: 25, facilityKey: 'schoolZoneCamera' },
            { id: 'safety_fence', label: '방호울타리 확충', weight: 25, facilityKey: 'safetyFence' },
            { id: 'floor_light', label: '스마트 횡단보도 바닥등', weight: 20, facilityKey: 'floorLight' },
            { id: 'barrier_free', label: '무장애 보도 정비', weight: 15, facilityKey: 'barrierFree' },
            { id: 'smart_shelter', label: '폭염그늘막·쉼터', weight: 15, facilityKey: 'smartShelter' },
          ],
        },
        {
          iteration: 5,
          title: '통합 스마트 거버넌스(M-Safety)',
          passThreshold: 85,
          items: [
            { id: 'school_cam', label: '스마트 단속 및 시민민원연계', weight: 25, facilityKey: 'schoolZoneCamera' },
            { id: 'safety_fence', label: '보행로 방호울타리', weight: 20, facilityKey: 'safetyFence' },
            { id: 'floor_light', label: '바닥형 스마트신호등', weight: 20, facilityKey: 'floorLight' },
            { id: 'barrier_free', label: '무장애 단차정비', weight: 20, facilityKey: 'barrierFree' },
            { id: 'smart_shelter', label: '스마트 안심쉼터', weight: 15, facilityKey: 'smartShelter' },
          ],
        },
      ],
    },
  },
};

/**
 * Resolves items and passThreshold for a specific persona and iteration.
 */
export function resolveConfigForPersona(config, persona = 'child', iteration = null) {
  const base = config || DEFAULT_CHECKLIST_CONFIG;
  const personas = base.personas || DEFAULT_CHECKLIST_CONFIG.personas;
  const pData = personas?.[persona];

  if (!pData) {
    return {
      items: base.items || DEFAULT_CHECKLIST_CONFIG.items,
      passThreshold: base.passThreshold ?? DEFAULT_CHECKLIST_CONFIG.passThreshold,
      routeGrade: base.routeGrade || DEFAULT_CHECKLIST_CONFIG.routeGrade,
      corridorMeters: base.corridorMeters || DEFAULT_CHECKLIST_CONFIG.corridorMeters,
      persona: persona || 'default',
      iteration: 1,
      title: '기초 시설 점검',
      allIterations: [],
      activeIteration: 1,
    };
  }

  const targetIter = iteration ?? pData.activeIteration ?? 5;
  const iterItem =
    pData.iterations?.find((it) => it.iteration === targetIter) ||
    pData.iterations?.[pData.iterations.length - 1] ||
    {
      items: base.items,
      passThreshold: base.passThreshold,
      title: pData.name,
    };

  return {
    items: iterItem.items || base.items || DEFAULT_CHECKLIST_CONFIG.items,
    passThreshold: iterItem.passThreshold ?? base.passThreshold ?? 60,
    routeGrade: base.routeGrade || DEFAULT_CHECKLIST_CONFIG.routeGrade,
    corridorMeters: base.corridorMeters || DEFAULT_CHECKLIST_CONFIG.corridorMeters,
    persona,
    iteration: iterItem.iteration ?? targetIter,
    title: iterItem.title || pData.name,
    allIterations: pData.iterations || [],
    activeIteration: pData.activeIteration || 5,
  };
}

/**
 * @param {Record<string, number|null|undefined>} counts facility counts; null/undefined = unknown
 * @param {typeof DEFAULT_CHECKLIST_CONFIG} config
 * @param {string|{ persona?: string, vulnerableType?: string, iteration?: number }} [personaOrOptions]
 * @returns {{ score: number, maxScore: number, items: Array, grade: 'pass'|'fail', threshold: number, persona: string, iteration: number, title: string }}
 */
export function evaluateChecklist(counts, config = DEFAULT_CHECKLIST_CONFIG, personaOrOptions = 'child') {
  const options =
    typeof personaOrOptions === 'string'
      ? { persona: personaOrOptions }
      : personaOrOptions || {};

  const personaKey = options.persona || options.vulnerableType || config?.activePersona || 'child';
  const resolved = resolveConfigForPersona(config, personaKey, options.iteration);

  const items = (resolved.items || DEFAULT_CHECKLIST_CONFIG.items).map((item) => {
    const raw = counts?.[item.facilityKey];
    if (raw === null || raw === undefined) {
      return {
        id: item.id,
        label: item.label,
        weight: item.weight,
        facilityKey: item.facilityKey,
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
      facilityKey: item.facilityKey,
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
  const threshold = resolved.passThreshold ?? 60;

  return {
    score: normalized,
    rawScore: score,
    maxScore,
    items,
    grade: normalized >= threshold ? 'pass' : 'fail',
    threshold,
    persona: resolved.persona,
    iteration: resolved.iteration,
    title: resolved.title,
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
    tips.push('보도 턱이나 경사로가 있는 구간에서는 발을 헛디디지 않도록 천천히 보행하세요.');
  } else {
    tips.push('주정차 차량 사이로 뛰어나오지 말고, 보호자와 함께 손을 잡고 건너세요.');
    tips.push('횡단보도 대기 시 옐로카펫 안쪽이나 안전선 뒤에서 대기하세요.');
  }

  return {
    guardianTips: tips,
    pedestrianTips: tips.slice(0, 1),
    source: 'default_text',
  };
}
