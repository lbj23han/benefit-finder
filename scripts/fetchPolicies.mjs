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

  return {
    id: item.servId ?? `bokjiro-${Math.random().toString(36).slice(2)}`,
    title: (item.servNm ?? '').trim(),
    summary: (item.servDgst ?? '').slice(0, 120).trim(),
    description: (item.tgtrDtlCn ?? item.servDgst ?? '').trim(),
    category: toCategory(categoryText),
    region,
    eligibility,
    ...ageRange,
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

  return {
    id: serviceId ? `gov24-${serviceId}` : `gov24-${Math.random().toString(36).slice(2)}`,
    title,
    summary: summary || title,
    description: targetText || summary || title,
    category: toCategory(`${title} ${item['서비스분야'] ?? ''}`),
    region: ['전국'],
    eligibility,
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
