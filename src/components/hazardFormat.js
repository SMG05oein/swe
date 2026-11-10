// 위험 지점 표시용 문구 (목록·상세 공용)

export function hazardKindLabel(h) {
  if (h.kind === 'accident') return '사고다발지역';
  return h.zone?.type === 'elder' ? '실버존 점검 미달' : '스쿨존 점검 미달';
}

export function hazardMeta(h) {
  const parts = [];
  if (h.kind === 'accident') {
    const cnt = Number(h.spot?.occrrnc_cnt) || 0;
    if (cnt) parts.push(`사고 ${cnt}건`);
  } else if (h.checklist) {
    parts.push(`점검 ${h.checklist.score}점 (기준 ${h.checklist.threshold}점)`);
  }
  parts.push(`경로에서 ${h.distanceToRoute}m`);
  return parts.join(' · ');
}
