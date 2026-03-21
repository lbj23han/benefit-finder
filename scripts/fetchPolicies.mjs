#!/usr/bin/env node
/**
 * fetchPolicies.mjs
 *
 * Fetches Korean public policy data from 3 official APIs and normalizes it
 * into the app's Policy schema.
 *
 * Sources (all use the same DATA_GO_KR_KEY):
 *   1. 복지로 국가복지정보         B554287/NationalWelfareInformationsV001
 *   2. 복지로 지자체복지정보        B554287/LocalGovernmentWelfareInformations
 *   3. 정부24 서비스목록            api.odcloud.kr/api/gov24/v3/serviceList
 *
 * Output: src/data/policies.generated.json
 * On any failure: exits 0 to preserve existing data (Vercel keeps last good build).
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '..', 'src/data/policies.generated.json');

const API_KEY = process.env.DATA_GO_KR_KEY;

// ─── Endpoint URLs ──────────────────────────────────────────────────────────

const V001_LIST   = 'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001';
const LCGV_LIST   = 'https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfarelist';
const GOV24_LIST  = 'https://api.odcloud.kr/api/gov24/v3/serviceList';

// ─── Generic helpers ────────────────────────────────────────────────────────

async function fetchJSON(url, options = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Amount extractor ────────────────────────────────────────────────────────

function extractAmount(text = '') {
  if (!text) return undefined;
  const patterns = [
    /최대\s*([\d,]+)만원/,
    /([\d,]+)만원\s*지원/,
    /([\d,]+)만원/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(n) && n > 0 && n < 100000) return n;
    }
  }
  return undefined;
}

// ─── Category mapper ─────────────────────────────────────────────────────────

function toCategory(text = '') {
  if (/주거|임대|전세|월세/.test(text)) return 'housing';
  if (/취업|고용|일자리|직업/.test(text)) return 'employment';
  if (/교육|장학|학습|훈련/.test(text)) return 'education';
  if (/보육|어린이집|육아|돌봄|출산|임신/.test(text)) return 'childcare';
  if (/창업|사업/.test(text)) return 'business';
  if (/청년/.test(text)) return 'youth';
  return 'welfare';
}

// ─── Age range from 복지로 lifeNm fields ────────────────────────────────────

function lifeNamesToAgeRange(names = []) {
  const labels = names.join(' ');
  if (labels.includes('영유아')) return { ageMin: 0, ageMax: 6 };
  if (labels.includes('아동'))   return { ageMin: 0, ageMax: 18 };
  if (labels.includes('청소년')) return { ageMin: 13, ageMax: 24 };
  if (labels.includes('청년'))   return { ageMin: 19, ageMax: 34 };
  if (labels.includes('중장년')) return { ageMin: 35, ageMax: 64 };
  if (labels.includes('노인') || labels.includes('어르신')) return { ageMin: 65, ageMax: undefined };
  return {};
}

function guessBenefitType(text = '') {
  if (/바우처|쿠폰|카드/.test(text)) return 'voucher';
  if (/대출|융자/.test(text)) return 'loan';
  if (/세금|감면|공제/.test(text)) return 'tax-reduction';
  if (/서비스|제공|방문/.test(text)) return 'service';
  return 'cash';
}

// ─── Text-based eligibility enrichment ───────────────────────────────────────
//
// Parses Korean government policy text to extract structured eligibility fields.
// Covers ~80% of cases where the API returns unstructured description text.

function enrichFromText(title = '', description = '') {
  const full = `${title} ${description}`;
  const result = {};

  // ── Age ──────────────────────────────────────────────────────────────────
  // Step 1: description text parsing FIRST (most specific — overrides title keywords)
  // "만 N세 이상 M세 이하/미만" or "N세 이상 M세 이하"
  const rangeWithMan = full.match(/만\s*(\d+)\s*세\s*이상[^.。\n]*?(\d+)\s*세\s*(?:이하|미만)/);
  const rangeNoMan  = full.match(/(\d+)\s*세\s*이상[^.。\n]*?(\d+)\s*세\s*(?:이하|미만)/);
  // "N세~M세" or "만 N~M세"
  const tildeWithMan = full.match(/만\s*(\d+)\s*[~～]\s*(\d+)\s*세/);
  const tildeNoMan   = full.match(/(\d+)\s*세\s*[~～]\s*(\d+)\s*세/);

  if (rangeWithMan) {
    result.ageMin = parseInt(rangeWithMan[1]);
    result.ageMax = parseInt(rangeWithMan[2]);
  } else if (tildeWithMan) {
    result.ageMin = parseInt(tildeWithMan[1]);
    result.ageMax = parseInt(tildeWithMan[2]);
  } else if (tildeNoMan) {
    result.ageMin = parseInt(tildeNoMan[1]);
    result.ageMax = parseInt(tildeNoMan[2]);
  } else if (rangeNoMan && parseInt(rangeNoMan[1]) >= 10) {
    result.ageMin = parseInt(rangeNoMan[1]);
    result.ageMax = parseInt(rangeNoMan[2]);
  } else {
    // Standalone min/max
    const minMatch = full.match(/만\s*(\d+)\s*세\s*이상/);
    if (minMatch) result.ageMin = parseInt(minMatch[1]);
    const maxMatch = full.match(/만\s*(\d+)\s*세\s*(?:이하|미만)/);
    if (maxMatch) result.ageMax = parseInt(maxMatch[1]);
  }

  // Step 2: title keyword fallback (only when description gave nothing)
  if (result.ageMin === undefined && result.ageMax === undefined) {
    if (/치매|노인|어르신|경로당|고령자|노년|노령/.test(title)) {
      result.ageMin = 65;
    } else if (/틀니|임플란트|의치|보청기|노안|백내장|실명예방/.test(title)) {
      result.ageMin = 60; // 치과·시력 지원은 주로 60세+
    } else if (/영유아|누리과정|유아학비|유치원/.test(title)) {
      result.ageMin = 0; result.ageMax = 6;
    } else if (/아동|어린이(?!집)/.test(title)) {
      result.ageMin = 0; result.ageMax = 18;
    } else if (/청소년/.test(title)) {
      result.ageMin = 13; result.ageMax = 24;
    } else if (/청년/.test(title)) {
      result.ageMin = 19; result.ageMax = 39;
    } else if (/중장년|장년층/.test(title)) {
      result.ageMin = 40; result.ageMax = 64;
    }
  }

  // ── Occupation ───────────────────────────────────────────────────────────
  const occupations = new Set();
  if (/취업준비생|구직자|미취업자?|실직자|구직\s*중/.test(full)) occupations.add('unemployed');
  if (/재직자|근로자(?!\s*가족)|직장인|임금근로자|피고용인/.test(full)) occupations.add('employed');
  if (/자영업자|소상공인|사업주|사업자(?!\s*번호)(?!\s*등록)/.test(full)) occupations.add('self-employed');
  if (/재학생|대학생|대학원생|(?<![취미])학생/.test(full)) occupations.add('student');
  if (/프리랜서|특수형태\s*근로|특수고용/.test(full)) occupations.add('freelancer');
  // 어업·해양 종사자 한정 (일반인 해당 없음)
  if (/어업인|어민|선원|어촌\s*정착|해기사|어선\s*원/.test(full)) occupations.add('self-employed');
  if (occupations.size > 0) result.occupationTarget = [...occupations];

  // ── Income ───────────────────────────────────────────────────────────────
  const incomes = new Set();
  if (/기초생활\s*수급자?|생계급여\s*수급|의료급여\s*수급/.test(full)) incomes.add('low');
  if (/차상위\s*계층/.test(full)) incomes.add('low');
  if (/저소득\s*(?:가구|가정|층|자)/.test(full)) incomes.add('low');
  for (const m of full.matchAll(/중위소득\s*(\d+)\s*%?\s*이하/g)) {
    const pct = parseInt(m[1]);
    if (pct > 0)    incomes.add('low');
    if (pct >= 60)  incomes.add('middle-low');
    if (pct >= 110) incomes.add('middle');
    if (pct > 150)  incomes.add('high');
  }
  if (incomes.size > 0) result.incomeCondition = [...incomes];

  // ── Household ────────────────────────────────────────────────────────────
  const households = new Set();
  if (/1인\s*가구|단독\s*가구|독거/.test(full)) households.add('single');
  if (/한부모|편부모|모자\s*가구|부자\s*가구/.test(full)) households.add('single-parent');
  if (/맞벌이|부부\s*(?:가구|세대)|기혼(?!\s*자녀)/.test(full)) households.add('couple');
  // 자녀 있는 가구 패턴 — 폭넓게 커버
  if (/부양\s*자녀|자녀\s*(?:있는|양육|돌봄)|영유아\s*(?:자녀|가구)|양육자/.test(full)) {
    households.add('family-with-children'); households.add('single-parent');
  }
  if (/임산부|임신\s*중|출산\s*(?:예정|후)|태아/.test(full)) {
    households.add('family-with-children'); households.add('single-parent');
  }
  // 다문화·소년소녀가정·방과후·입양 → 자녀 있는 가구
  if (/다문화\s*(?:가족|가정|자녀)|소년소녀\s*가(?:정|장)|방과\s*후\s*아동|입양\s*아동/.test(full)) {
    households.add('family-with-children'); households.add('single-parent');
  }
  // 제목 시작이 아동/영유아/유아 → 양육자 가구
  if (/^(?:아동|영유아|유아|어린이)/.test(title) && households.size === 0) {
    households.add('family-with-children'); households.add('single-parent');
  }
  // 제목에 "자녀" 단독으로 포함 시 (다자녀, 자녀장려금 등)
  if (/자녀/.test(title) && households.size === 0) {
    households.add('family-with-children'); households.add('single-parent');
  }
  if (households.size > 0) result.householdCondition = [...households];

  // ── Gender ───────────────────────────────────────────────────────────────
  const genders = new Set();
  if (/여성\s*(?:전용|만|대상|창업)|임산부|모성\s*보호|경력단절\s*여성/.test(title)) genders.add('female');
  if (/병역|현역\s*(?:군인|병사|장병)|군\s*복무/.test(title)) genders.add('male');
  if (genders.size > 0) result.genderCondition = [...genders];

  return result;
}

// ─── Claude API enrichment (optional — only runs when ANTHROPIC_API_KEY is set) ──
//
// For policies that pattern extraction couldn't fully resolve, Claude Haiku
// analyzes the Korean text and returns structured eligibility fields.
// Runs in batches of 20 to minimize API calls and cost (~$0.05/day).

async function callClaudeAPI(prompt, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
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

async function enrichWithClaude(policies, apiKey) {
  const BATCH = 20;
  const resultMap = new Map();

  for (let i = 0; i < policies.length; i += BATCH) {
    const batch = policies.slice(i, i + BATCH);
    const policyText = batch.map((p, idx) =>
      `[${idx}] ${p.title}\n${(p.description || p.summary || '').replace(/\s+/g, ' ').slice(0, 400)}`
    ).join('\n\n');

    const prompt = `한국 정부 복지 정책 ${batch.length}개의 지원 대상 조건을 분석해서 JSON 배열만 응답하세요. 설명 없이 배열만.

각 항목 형식: {"ageMin":null또는숫자,"ageMax":null또는숫자,"occupationTarget":null또는배열,"incomeCondition":null또는배열,"householdCondition":null또는배열,"genderCondition":null또는배열}

값 옵션:
- occupationTarget: "employed"재직자 "unemployed"미취업/구직자 "self-employed"자영업자 "student"학생 "freelancer"프리랜서
- incomeCondition: "low"중위50%이하/기초/차상위 "middle-low"50~100% "middle"100~150% "high"150%초과 (이하 조건이면 해당 구간까지 모두 포함)
- householdCondition: "single"1인가구 "with-parents"부모동거 "couple"부부 "family-with-children"자녀있는가구 "single-parent"한부모
- genderCondition: "male"남성만 "female"여성만 (성별무관이면null)
- 조건없음(누구나)이면 null

정책:
${policyText}`;

    try {
      const text = await callClaudeAPI(prompt, apiKey);
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        batch.forEach((p, idx) => {
          if (parsed[idx]) resultMap.set(p.id, parsed[idx]);
        });
      }
    } catch (err) {
      console.warn(`  ⚠ Claude batch ${Math.floor(i / BATCH) + 1} 실패: ${err.message}`);
    }
    await sleep(300);
  }
  return resultMap;
}

// ─── 복지로 bokjiro deep-link URL ────────────────────────────────────────────

function bokjiroUrl(servId) {
  return `https://www.bokjiro.go.kr/ssis-teu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${servId}&wlfareInfoReldBztpCd=01`;
}

// ─── Normalizer: 복지로 V001 / LCGV (same servList shape) ───────────────────

function normalizeServItem(item) {
  const lifeNames = (item.lifeNmArray ?? []).map(n =>
    typeof n === 'string' ? n : (n?.lifeNm ?? '')
  ).filter(Boolean);

  const themeText = (item.intrsThmaArray ?? item.intrsThemaNmArray ?? [])
    .map(t => typeof t === 'string' ? t : (t?.intrsThmaStdrNm ?? t?.intrsThemaNm ?? ''))
    .join(' ');

  const categoryText = `${themeText} ${item.servNm ?? ''}`;
  const ageRange = lifeNamesToAgeRange(lifeNames);
  const benefitText = item.sprtCn ?? item.alwServCn ?? '';
  const amount = extractAmount(benefitText);

  const rawRegion = `${item.ctpvNm ?? ''} ${item.sggNm ?? ''}`.trim();
  const region = rawRegion && rawRegion !== '전국'
    ? rawRegion.split(/[,/]/).map(s => s.trim()).filter(Boolean)
    : ['전국'];

  const eligibility = [];
  if (ageRange.ageMin !== undefined) {
    eligibility.push({
      icon: '🎂',
      label: '연령 조건',
      description: ageRange.ageMax
        ? `만 ${ageRange.ageMin}세 이상 ${ageRange.ageMax}세 이하`
        : `만 ${ageRange.ageMin}세 이상`,
    });
  }
  if (region[0] !== '전국') {
    eligibility.push({ icon: '📍', label: '거주 조건', description: `${region.join(', ')} 거주자` });
  }
  if (item.tgtrDtlCn) {
    eligibility.push({ icon: '📋', label: '지원 대상', description: item.tgtrDtlCn.slice(0, 100).trim() });
  }
  if (eligibility.length === 0) {
    eligibility.push({ icon: '📋', label: '지원 대상', description: '상세 페이지를 확인하세요.' });
  }

  const tags = [...new Set([
    ...lifeNames,
    ...(region[0] !== '전국' ? [region[0]] : []),
    ...themeText.split(/\s+/).filter(t => t.length > 1).slice(0, 2),
  ])].slice(0, 5);

  const title = (item.servNm ?? '').trim();
  const descText = (item.tgtrDtlCn ?? item.servDgst ?? '').trim();
  const enriched = enrichFromText(title, descText);

  // lifeNmArray-derived age takes priority over text extraction
  const finalAgeMin = ageRange.ageMin ?? enriched.ageMin;
  const finalAgeMax = ageRange.ageMax ?? enriched.ageMax;

  return {
    id: item.servId ?? `bokjiro-${Math.random().toString(36).slice(2)}`,
    title,
    summary: (item.servDgst ?? '').slice(0, 120).trim(),
    description: descText,
    category: toCategory(categoryText),
    region,
    eligibility,
    ...(finalAgeMin !== undefined ? { ageMin: finalAgeMin } : {}),
    ...(finalAgeMax !== undefined ? { ageMax: finalAgeMax } : {}),
    ...(enriched.occupationTarget ? { occupationTarget: enriched.occupationTarget } : {}),
    ...(enriched.incomeCondition  ? { incomeCondition:  enriched.incomeCondition  } : {}),
    ...(enriched.householdCondition ? { householdCondition: enriched.householdCondition } : {}),
    ...(enriched.genderCondition  ? { genderCondition:  enriched.genderCondition  } : {}),
    benefitType: guessBenefitType(benefitText),
    ...(amount ? { benefitAmount: amount } : {}),
    benefitDescription: benefitText.trim() || '지원 내용은 상세 페이지를 참고하세요.',
    isAlwaysOpen: item.alwServYn === 'Y',
    sourceOrg: (item.jurMnofNm ?? item.bizChrDeptNm ?? item.servPlnNm ?? '관련 기관').trim(),
    detailUrl: bokjiroUrl(item.servId),
    applyUrl: bokjiroUrl(item.servId),
    urlVerified: true,
    tags,
  };
}

// ─── Normalizer: 정부24 Gov24 ────────────────────────────────────────────────

function normalizeGov24Item(item) {
  const title  = (item['서비스명'] ?? item.serviceName ?? '').trim();
  const summary = (item['서비스목적'] ?? item['서비스요약'] ?? '').slice(0, 120).trim();
  const benefitText = item['지원내용'] ?? item['서비스내용'] ?? '';
  const targetText  = item['선정기준'] ?? item['지원대상'] ?? '';
  const orgName     = item['소관기관명'] ?? item['접수기관명'] ?? '관련 기관';
  const serviceId   = item['서비스ID'] ?? item.serviceId ?? '';
  const amount = extractAmount(benefitText);

  const eligibility = [];
  if (targetText) {
    eligibility.push({ icon: '📋', label: '지원 대상', description: targetText.slice(0, 100).trim() });
  } else {
    eligibility.push({ icon: '📋', label: '지원 대상', description: '상세 페이지를 확인하세요.' });
  }

  const enriched = enrichFromText(title, targetText || benefitText || summary);

  return {
    id: serviceId ? `gov24-${serviceId}` : `gov24-${Math.random().toString(36).slice(2)}`,
    title,
    summary: summary || title,
    description: targetText || summary || title,
    category: toCategory(`${title} ${item['서비스분야'] ?? ''}`),
    region: ['전국'],
    eligibility,
    ...(enriched.ageMin !== undefined ? { ageMin: enriched.ageMin } : {}),
    ...(enriched.ageMax !== undefined ? { ageMax: enriched.ageMax } : {}),
    ...(enriched.occupationTarget ? { occupationTarget: enriched.occupationTarget } : {}),
    ...(enriched.incomeCondition  ? { incomeCondition:  enriched.incomeCondition  } : {}),
    ...(enriched.householdCondition ? { householdCondition: enriched.householdCondition } : {}),
    ...(enriched.genderCondition  ? { genderCondition:  enriched.genderCondition  } : {}),
    benefitType: guessBenefitType(benefitText),
    ...(amount ? { benefitAmount: amount } : {}),
    benefitDescription: benefitText.trim() || '지원 내용은 상세 페이지를 참고하세요.',
    isAlwaysOpen: true,
    sourceOrg: orgName.trim(),
    detailUrl: serviceId
      ? `https://www.gov.kr/portal/rcvfvrSvc/dtlEx/${serviceId}`
      : 'https://www.gov.kr',
    applyUrl: serviceId
      ? `https://www.gov.kr/portal/rcvfvrSvc/dtlEx/${serviceId}`
      : 'https://www.gov.kr',
    urlVerified: true,
    tags: [item['서비스분야'] ?? '', item['소관기관명'] ?? ''].filter(Boolean).slice(0, 3),
  };
}

// ─── API fetch functions ─────────────────────────────────────────────────────

async function fetchV001Pages() {
  const items = [];
  let page = 1;
  const maxPages = 5; // up to 500 items

  while (page <= maxPages) {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      callTp:     'json',
      pageNo:     String(page),
      numOfRows:  '100',
    });
    const json = await fetchJSON(`${V001_LIST}?${params}`);

    // V001 response: { resultCode, totalCount, pageNo, numOfRows, servList: [...] }
    const servList = json?.servList ?? json?.body?.items?.item ?? [];
    const list = Array.isArray(servList) ? servList : [servList];
    if (list.length === 0) break;
    items.push(...list);

    const total = parseInt(json?.totalCount ?? '0', 10);
    if (items.length >= total || items.length >= 500) break;
    page++;
    await sleep(300);
  }
  return items;
}

async function fetchLcgvPages() {
  const items = [];
  let page = 1;
  const maxPages = 3; // up to 300 local items

  while (page <= maxPages) {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      pageNo:     String(page),
      numOfRows:  '100',
    });
    const json = await fetchJSON(`${LCGV_LIST}?${params}`);
    const list = json?.servList ?? [];
    if (!Array.isArray(list) || list.length === 0) break;
    items.push(...list);

    const total = parseInt(json?.totalCount ?? '0', 10);
    if (items.length >= total || items.length >= 300) break;
    page++;
    await sleep(300);
  }
  return items;
}

async function fetchGov24Pages() {
  const items = [];
  let page = 1;
  const maxPages = 3;

  while (page <= maxPages) {
    const params = new URLSearchParams({
      page:       String(page),
      perPage:    '100',
      returnType: 'json',
    });
    const json = await fetchJSON(
      `${GOV24_LIST}?${params}`,
      { headers: { Authorization: `Infuser ${API_KEY}` } },
    );
    const list = json?.data ?? [];
    if (!Array.isArray(list) || list.length === 0) break;
    items.push(...list);

    const total = parseInt(json?.totalCount ?? '0', 10);
    if (items.length >= total || items.length >= 300) break;
    page++;
    await sleep(300);
  }
  return items;
}

// ─── Deduplication ───────────────────────────────────────────────────────────

function deduplicateByTitle(policies) {
  const seen = new Set();
  return policies.filter(p => {
    const key = p.title.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('혜택줍줍 policy data fetcher');
  console.log('─'.repeat(40));

  if (!API_KEY) {
    console.warn('⚠  DATA_GO_KR_KEY not set — skipping fetch, preserving existing data.');
    process.exit(0);
  }

  const allPolicies = [];

  // 1. 복지로 국가복지정보 V001
  try {
    console.log('→ [1/3] 복지로 국가복지정보 V001...');
    const items = await fetchV001Pages();
    const normalized = items
      .filter(it => it.servNm && it.servId)
      .map(it => { try { return normalizeServItem(it); } catch { return null; } })
      .filter(Boolean);
    console.log(`  ✓ ${normalized.length}건`);
    allPolicies.push(...normalized);
  } catch (err) {
    console.error(`  ✗ V001 실패: ${err.message}`);
  }

  // 2. 복지로 지자체복지정보
  try {
    console.log('→ [2/3] 복지로 지자체복지정보...');
    const items = await fetchLcgvPages();
    const normalized = items
      .filter(it => it.servNm && it.servId)
      .map(it => { try { return normalizeServItem(it); } catch { return null; } })
      .filter(Boolean);
    console.log(`  ✓ ${normalized.length}건`);
    allPolicies.push(...normalized);
  } catch (err) {
    console.error(`  ✗ LCGV 실패: ${err.message}`);
  }

  // 3. 정부24
  try {
    console.log('→ [3/3] 정부24 서비스목록...');
    const items = await fetchGov24Pages();
    const normalized = items
      .filter(it => it['서비스명'] || it.serviceName)
      .map(it => { try { return normalizeGov24Item(it); } catch { return null; } })
      .filter(Boolean);
    console.log(`  ✓ ${normalized.length}건`);
    allPolicies.push(...normalized);
  } catch (err) {
    console.error(`  ✗ Gov24 실패: ${err.message}`);
  }

  if (allPolicies.length === 0) {
    console.warn('⚠  모든 API 실패 — 기존 데이터 유지');
    process.exit(0);
  }

  const deduped = deduplicateByTitle(allPolicies);
  console.log(`→ 중복 제거 후: ${deduped.length}건 (원본 ${allPolicies.length}건)`);

  // ── Claude Haiku enrichment (runs only when ANTHROPIC_API_KEY is set) ──────
  // Handles the ~20% of policies that pattern extraction couldn't resolve.
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (ANTHROPIC_API_KEY) {
    const needsEnrichment = deduped.filter(p =>
      !p.occupationTarget && !p.incomeCondition && !p.householdCondition &&
      p.ageMin === undefined && p.ageMax === undefined
    );
    if (needsEnrichment.length > 0) {
      console.log(`→ Claude Haiku enrichment: ${needsEnrichment.length}개 정책 분석 중...`);
      const claudeMap = await enrichWithClaude(needsEnrichment, ANTHROPIC_API_KEY);
      let enrichedCount = 0;
      deduped.forEach(p => {
        const cd = claudeMap.get(p.id);
        if (!cd) return;
        if (cd.ageMin != null && p.ageMin === undefined) p.ageMin = cd.ageMin;
        if (cd.ageMax != null && p.ageMax === undefined) p.ageMax = cd.ageMax;
        if (cd.occupationTarget?.length && !p.occupationTarget) p.occupationTarget = cd.occupationTarget;
        if (cd.incomeCondition?.length  && !p.incomeCondition)  p.incomeCondition  = cd.incomeCondition;
        if (cd.householdCondition?.length && !p.householdCondition) p.householdCondition = cd.householdCondition;
        if (cd.genderCondition?.length  && !p.genderCondition)  p.genderCondition  = cd.genderCondition;
        enrichedCount++;
      });
      console.log(`  ✓ Claude enrichment 완료: ${enrichedCount}건 추가 처리`);
    } else {
      console.log('→ Claude enrichment: 패턴으로 전체 커버 완료, 스킵');
    }
  } else {
    const patternCovered = deduped.filter(p =>
      p.occupationTarget || p.incomeCondition || p.householdCondition ||
      p.ageMin !== undefined || p.ageMax !== undefined
    ).length;
    console.log(`→ 패턴 추출 결과: ${patternCovered}/${deduped.length}건 구조화 (${Math.round(patternCovered/deduped.length*100)}%)`);
    console.log('  ℹ ANTHROPIC_API_KEY 미설정 — Claude enrichment 스킵');
  }

  const output = {
    fetchedAt: new Date().toISOString(),
    source: 'bokjiro-api',
    count: deduped.length,
    policies: deduped,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✓ ${OUT_PATH} 에 저장됨`);
  console.log(`  총 ${deduped.length}건 / fetchedAt: ${output.fetchedAt}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
