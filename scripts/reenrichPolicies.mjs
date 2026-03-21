#!/usr/bin/env node
/**
 * reenrichPolicies.mjs
 *
 * Re-runs Claude Haiku enrichment on ALL existing policies to add:
 *   - targetSpecialty (veteran/military/maritime/etc.)
 *   - relevanceScore (0-1 general applicability)
 *   - estimatedBenefitText (short benefit summary)
 *
 * Also fills in any still-missing eligibility fields.
 * Reads & writes src/data/policies.generated.json in-place.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, '..', 'src/data/policies.generated.json');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function enrichBatch(batch) {
  const policyText = batch.map((p, idx) =>
    `[${idx}] ${p.title}\n${(p.description || p.summary || '').replace(/\s+/g, ' ').slice(0, 350)}`
  ).join('\n\n');

  const prompt = `한국 정부 복지 정책 ${batch.length}개를 분석해서 JSON 배열만 응답하세요. 설명 없이 배열만.

각 항목 형식:
{"ageMin":null|숫자,"ageMax":null|숫자,"occupationTarget":null|배열,"incomeCondition":null|배열,"householdCondition":null|배열,"genderCondition":null|배열,"targetSpecialty":null|문자열,"relevanceScore":0.0~1.0,"estimatedBenefitText":null|문자열}

값 옵션:
- occupationTarget: "employed"재직자 "unemployed"미취업/구직자 "self-employed"자영업자 "student"학생 "freelancer"프리랜서
- incomeCondition: "low"중위50%이하/기초/차상위 "middle-low"50~100% "middle"100~150% "high"150%초과 (이하 조건이면 해당 구간까지 모두 포함)
- householdCondition: "single"1인가구 "with-parents"부모동거 "couple"부부 "family-with-children"자녀있는가구 "single-parent"한부모
- genderCondition: "male"남성만 "female"여성만 (성별무관이면null)
- targetSpecialty: 아래 중 하나(해당하면 반드시 설정, 아니면 null)
  "veteran" 국가유공자/보훈/참전유공자/전몰군경/순직군경/6.25/고엽제
  "military" 현역군인/군무원/사관생도/부사관/장교/병역의무
  "maritime" 원양어선/어업인/어민/수산업종사자/해기사/귀어귀촌
  "agriculture" 농업인/농민/귀농/영농후계
  "hansen" 한센인/나병환자
  "foreign-national" 외국인근로자/결혼이민자/귀화외국인/이주민
  "disability-severe" 1~2급 중증장애인 한정(일반 장애인 지원 아님)
  "religion" 성직자/목회자 한정
- relevanceScore: 서울 거주 20~40대 일반 시민 기준 관련도
  1.0 = 거의 모든 시민 신청 가능 (전세대출, 실업급여 등)
  0.7 = 조건 맞으면 대부분 신청 가능 (저소득 주거급여, 청년수당)
  0.4 = 특정 상황 한정 (창업자, 한부모, 특정 연령대)
  0.2 이하 = 극소수 (농어업인, 군인 가족, 국가유공자 등)
  → targetSpecialty가 있으면 반드시 0.2 이하
- estimatedBenefitText: 지원 금액/내용 간단 요약 (예: "월 최대 33만원 현금", "연 150만원 교육비", "전세보증금 최대 1억 대출", "무료 서비스"). 내용 불명확하면 null

정책:
${policyText}`;

  const text = await callClaude(prompt);
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in response');
  return JSON.parse(match[0]);
}

async function main() {
  console.log('혜택줍줍 — Claude 전체 재보강 시작');
  console.log('─'.repeat(45));

  const raw = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  const policies = raw.policies;
  console.log(`→ 정책 수: ${policies.length}건`);

  const BATCH = 20;
  let enrichedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < policies.length; i += BATCH) {
    const batch = policies.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const totalBatches = Math.ceil(policies.length / BATCH);
    process.stdout.write(`  배치 ${batchNum}/${totalBatches} (${i + 1}~${Math.min(i + BATCH, policies.length)})... `);

    try {
      const results = await enrichBatch(batch);

      batch.forEach((p, idx) => {
        const cd = results[idx];
        if (!cd) return;

        // Eligibility fields — only fill if missing
        if (cd.ageMin != null && p.ageMin === undefined)              p.ageMin = cd.ageMin;
        if (cd.ageMax != null && p.ageMax === undefined)              p.ageMax = cd.ageMax;
        if (cd.occupationTarget?.length && !p.occupationTarget)      p.occupationTarget = cd.occupationTarget;
        if (cd.incomeCondition?.length  && !p.incomeCondition)       p.incomeCondition  = cd.incomeCondition;
        if (cd.householdCondition?.length && !p.householdCondition)  p.householdCondition = cd.householdCondition;
        if (cd.genderCondition?.length  && !p.genderCondition)       p.genderCondition  = cd.genderCondition;

        // New fields — always overwrite with Claude's judgment
        if (cd.targetSpecialty)        p.targetSpecialty      = cd.targetSpecialty;
        if (cd.relevanceScore != null) p.relevanceScore       = cd.relevanceScore;
        if (cd.estimatedBenefitText)   p.estimatedBenefitText = cd.estimatedBenefitText;

        enrichedCount++;
      });
      console.log('✓');
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 60)}`);
      errorCount++;
    }

    await sleep(400);
  }

  raw.policies = policies;
  raw.enrichedAt = new Date().toISOString();
  raw.enrichmentVersion = '2.0-specialty';

  writeFileSync(JSON_PATH, JSON.stringify(raw, null, 2), 'utf-8');

  console.log('─'.repeat(45));
  console.log(`✓ 완료: ${enrichedCount}건 처리, ${errorCount}건 실패`);

  // Stats
  const withSpecialty = policies.filter(p => p.targetSpecialty).length;
  const withRelevance = policies.filter(p => p.relevanceScore !== undefined).length;
  const withBenefit   = policies.filter(p => p.estimatedBenefitText).length;
  const withAmount    = policies.filter(p => p.benefitAmount).length;
  const lowRelevance  = policies.filter(p => p.relevanceScore !== undefined && p.relevanceScore < 0.3).length;

  console.log(`  targetSpecialty 설정: ${withSpecialty}건`);
  console.log(`  relevanceScore 설정: ${withRelevance}건 (낮은 점수 <0.3: ${lowRelevance}건)`);
  console.log(`  estimatedBenefitText: ${withBenefit}건`);
  console.log(`  benefitAmount (기존): ${withAmount}건`);
  console.log(`  금액 정보 있음 (합계): ${new Set([...policies.filter(p => p.benefitAmount || p.estimatedBenefitText).map(p => p.id)]).size}건`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
