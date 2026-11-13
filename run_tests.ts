// 사용법: npx tsx run_tests.ts            (같은 폴더의 SafetyEvaluator.ts 테스트)
//        npx tsx run_tests.ts ./SafetyEvaluator.reference.ts
import fs from 'fs';
const target = process.argv[2] || './SafetyEvaluator.ts';
const { SafetyEvaluator } = await import(target);
const criteria = JSON.parse(fs.readFileSync('checklist_criteria.json', 'utf-8'));
const cases = JSON.parse(fs.readFileSync('test_cases.json', 'utf-8'));
let pass = 0;
for (const tc of cases) {
  const fails: string[] = [];
  let result: any;
  try {
    result = new SafetyEvaluator().evaluateRoutes(criteria, tc.zones, { available: tc.available, facilities: tc.facilities });
  } catch (e: any) { fails.push('실행 오류: ' + e.message); }
  if (result) {
    if (result.routeGrade !== tc.expected.routeGrade) fails.push(`routeGrade: 기대 ${tc.expected.routeGrade}, 실제 ${result.routeGrade}`);
    for (const [zid, exp] of Object.entries<any>(tc.expected.zones)) {
      const got = (result.zones || []).find((z: any) => z.zoneId === zid);
      if (!got) { fails.push(`${zid}: 결과에 없음`); continue; }
      for (const [k, v] of Object.entries<any>(exp)) {
        if (k === 'items') {
          for (const [iid, st] of Object.entries<any>(v)) {
            const gi = (got.items || []).find((i: any) => i.id === iid);
            if (!gi || gi.status !== st) fails.push(`${zid}.${iid}: 기대 ${st}, 실제 ${gi ? gi.status : '없음'}`);
          }
        } else if (JSON.stringify(got[k]) !== JSON.stringify(v)) fails.push(`${zid}.${k}: 기대 ${JSON.stringify(v)}, 실제 ${JSON.stringify(got[k])}`);
      }
    }
  }
  if (!fails.length) pass++;
  console.log(`${fails.length ? 'FAIL' : 'PASS'} ${tc.id} ${tc.title}`);
  fails.forEach((m) => console.log('     - ' + m));
}
console.log(`\n${pass}/${cases.length} 통과`);
