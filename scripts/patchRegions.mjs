#!/usr/bin/env node
/**
 * patchRegions.mjs
 *
 * policies.generated.json에서 region: ['전국']인 정책들을
 * sourceOrg 기관명 기준으로 실제 지역으로 패치합니다.
 * Claude API 재실행 없이 기존 데이터를 수정합니다.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'src/data/policies.generated.json');

function inferRegionFromOrg(orgName) {
  if (!orgName) return null;
  const METRO = {
    '서울특별시': '서울', '경기도': '경기', '부산광역시': '부산',
    '대구광역시': '대구', '인천광역시': '인천', '광주광역시': '광주',
    '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
    '강원특별자치도': '강원', '강원도': '강원', '충청북도': '충북',
    '충청남도': '충남', '전라북도': '전북', '전북특별자치도': '전북',
    '전라남도': '전남', '경상북도': '경북', '경상남도': '경남',
    '제주특별자치도': '제주',
    '서울': '서울', '경기': '경기', '인천': '인천', '부산': '부산',
    '대구': '대구', '광주': '광주', '대전': '대전', '울산': '울산',
    '세종': '세종', '강원': '강원', '충북': '충북', '충남': '충남',
    '전북': '전북', '전남': '전남', '경북': '경북', '경남': '경남', '제주': '제주',
  };
  let region = null;
  for (const [full, short] of Object.entries(METRO).sort((a, b) => b[0].length - a[0].length)) {
    if (orgName.includes(full)) { region = short; break; }
  }
  if (!region) return null;
  const districtMatch = orgName.match(/([가-힣]+[구시군])\s*$/);
  if (districtMatch) return [region, districtMatch[1]];
  return [region];
}

const raw = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
const policies = raw.policies ?? raw;

let patched = 0;
const regionStats = {};

for (const p of policies) {
  if (p.region.length === 1 && p.region[0] === '전국') {
    const inferred = inferRegionFromOrg(p.sourceOrg);
    if (inferred) {
      p.region = inferred;
      patched++;
      const key = inferred.join(' ');
      regionStats[key] = (regionStats[key] || 0) + 1;
    }
  }
}

const output = raw.policies ? { ...raw, policies } : policies;
writeFileSync(DATA_PATH, JSON.stringify(output, null, 2));

console.log(`✓ 패치 완료: ${patched}개 정책 지역 수정`);
console.log('\n수정된 지역 분포 (상위 20개):');
Object.entries(regionStats)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([r, c]) => console.log(`  ${r}: ${c}건`));

// 결과 검증
const total = policies.length;
const jeonkuk = policies.filter(p => p.region[0] === '전국').length;
console.log(`\n전체: ${total}건, 전국: ${jeonkuk}건 (${(jeonkuk/total*100).toFixed(1)}%)`);
