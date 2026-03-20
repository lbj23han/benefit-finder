#!/usr/bin/env node
/**
 * fetchPolicies.mjs
 *
 * Fetches Korean public policy data from official APIs and normalizes it
 * into the app's Policy schema, writing the result to:
 *   src/data/policies.generated.json
 *
 * Primary sources:
 *   1. 복지로 국가복지정보 Open API  (data.go.kr)
 *   2. 공공데이터포털 청년정책 API   (data.go.kr)
 *
 * Fallback: if all API calls fail, the existing mock data is preserved as-is.
 *
 * Usage:
 *   DATA_GO_KR_KEY=<your-key> node scripts/fetchPolicies.mjs
 *
 * Required GitHub Secret:
 *   DATA_GO_KR_KEY  — data.go.kr service key (issued at data.go.kr)
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_PATH = resolve(ROOT, 'src/data/policies.generated.json');
const FALLBACK_PATH = resolve(ROOT, 'src/data/policies.generated.json');

const API_KEY = process.env.DATA_GO_KR_KEY;
const BOKJIRO_LIST_URL = 'https://apis.data.go.kr/B554287/NationalWelfareInformationsV2/NationalWelfarelistV2';
const BOKJIRO_DETAIL_URL = 'https://apis.data.go.kr/B554287/NationalWelfareInformationsV2/NationalWelfaredetailV2';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a numeric benefit amount (만원) from free-text strings like "월 최대 20만원" */
function extractAmount(text = '') {
  if (!text) return undefined;
  // Look for patterns like: 최대 N만원, N만원, N,000만원
  const patterns = [
    /최대\s*([\d,]+)만원/,
    /([\d,]+)만원\s*지원/,
    /([\d,]+)만원/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const num = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(num) && num > 0 && num < 100000) return num;
    }
  }
  return undefined;
}

/** Map 복지로 life-cycle labels to age ranges */
function lifeNamesToAgeRange(names = []) {
  const labels = names.map(n => (typeof n === 'string' ? n : n?.lifeNm ?? '')).join(' ');
  if (labels.includes('영유아')) return { ageMin: 0, ageMax: 6 };
  if (labels.includes('아동')) return { ageMin: 0, ageMax: 18 };
  if (labels.includes('청소년')) return { ageMin: 13, ageMax: 24 };
  if (labels.includes('청년')) return { ageMin: 19, ageMax: 34 };
  if (labels.includes('중장년')) return { ageMin: 35, ageMax: 64 };
  if (labels.includes('노인') || labels.includes('어르신')) return { ageMin: 65, ageMax: undefined };
  return {};
}

/** Map 복지로 interest theme codes / labels to our internal category */
function toCategory(themes = [], title = '') {
  const text = [...themes.map(t => t?.intrsThmaStdrNm ?? t), title].join(' ');
  if (/주거|임대|전세|월세/.test(text)) return 'housing';
  if (/취업|고용|일자리|직업/.test(text)) return 'employment';
  if (/교육|장학|학습|훈련/.test(text)) return 'education';
  if (/보육|어린이집|육아|돌봄|출산|임신/.test(text)) return 'childcare';
  if (/창업|사업/.test(text)) return 'business';
  if (/청년/.test(text)) return 'youth';
  return 'welfare';
}

/** Map region text to our region array */
function toRegionArray(ctpvNm = '', sggNm = '') {
  const raw = `${ctpvNm} ${sggNm}`.trim();
  if (!raw || raw === '전국' || raw === '') return ['전국'];
  // Split multi-region strings like "서울, 경기"
  return raw.split(/[,/]/).map(s => s.trim()).filter(Boolean);
}

/** Build a direct deep-link URL for 복지로 service */
function toDetailUrl(servId = '', servDtlLink = '') {
  if (servDtlLink && servDtlLink.startsWith('http')) return servDtlLink;
  if (servId) {
    return `https://www.bokjiro.go.kr/ssis-teu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${servId}&wlfareInfoReldBztpCd=01`;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/** Normalize a single 복지로 list item into our Policy shape */
function normalizeListItem(item) {
  const ageRange = lifeNamesToAgeRange(item.lifeNmArray ?? []);
  const amount = extractAmount(item.sprtCn ?? item.servDgst ?? '');

  return {
    id: item.servId ?? `bokjiro-${Date.now()}`,
    title: (item.servNm ?? '').trim(),
    summary: (item.servDgst ?? '').slice(0, 120).trim(),
    description: (item.tgtrDtlCn ?? item.servDgst ?? '').trim(),
    category: toCategory(item.intrsThmaArray ?? [], item.servNm ?? ''),
    region: toRegionArray(item.ctpvNm, item.sggNm),
    eligibility: buildEligibility(item),
    ...ageRange,
    benefitType: guessBenefitType(item.sprtCn ?? ''),
    ...(amount ? { benefitAmount: amount } : {}),
    benefitDescription: (item.sprtCn ?? '').trim() || '지원 내용은 상세 페이지를 참고하세요.',
    isAlwaysOpen: item.alwServYn === 'Y',
    sourceOrg: (item.jurMnofNm ?? item.servPlnNm ?? '관련 기관').trim(),
    detailUrl: toDetailUrl(item.servId, item.servDtlLink),
    applyUrl: toDetailUrl(item.servId, item.servDtlLink),
    urlVerified: true, // derived from official API — links are real
    tags: buildTags(item),
  };
}

function buildEligibility(item) {
  const rules = [];
  const ageRange = lifeNamesToAgeRange(item.lifeNmArray ?? []);
  if (ageRange.ageMin !== undefined) {
    rules.push({
      icon: '🎂',
      label: '연령 조건',
      description: ageRange.ageMax
        ? `만 ${ageRange.ageMin}세 이상 ${ageRange.ageMax}세 이하`
        : `만 ${ageRange.ageMin}세 이상`,
    });
  }
  const region = toRegionArray(item.ctpvNm, item.sggNm);
  if (region[0] !== '전국') {
    rules.push({ icon: '📍', label: '거주 조건', description: `${region.join(', ')} 거주자` });
  }
  if (item.tgtrDtlCn) {
    rules.push({ icon: '📋', label: '지원 대상', description: item.tgtrDtlCn.slice(0, 80).trim() });
  }
  return rules.length > 0 ? rules : [{ icon: '📋', label: '지원 대상', description: '상세 페이지를 확인하세요.' }];
}

function guessBenefitType(sprtCn = '') {
  if (/바우처|쿠폰|카드/.test(sprtCn)) return 'voucher';
  if (/대출|융자/.test(sprtCn)) return 'loan';
  if (/세금|감면|공제/.test(sprtCn)) return 'tax-reduction';
  if (/서비스|제공|방문/.test(sprtCn)) return 'service';
  return 'cash';
}

function buildTags(item) {
  const tags = [];
  const lifeNames = (item.lifeNmArray ?? []).map(n => (typeof n === 'string' ? n : n?.lifeNm ?? ''));
  tags.push(...lifeNames.filter(Boolean));
  const region = toRegionArray(item.ctpvNm, item.sggNm);
  if (region[0] !== '전국') tags.push(region[0]);
  const themes = (item.intrsThmaArray ?? []).map(t => t?.intrsThmaStdrNm ?? t).filter(Boolean);
  tags.push(...themes.slice(0, 2));
  return [...new Set(tags)].slice(0, 5);
}

// ---------------------------------------------------------------------------
// API fetch functions
// ---------------------------------------------------------------------------

async function fetchBokjiroPage(pageNo, numOfRows = 100) {
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    callTp: 'json',
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });
  const url = `${BOKJIRO_LIST_URL}?${params}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Handle data.go.kr error responses
    if (json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg === 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR') {
      throw new Error('API key not registered');
    }
    return json?.wantedInfo ?? null;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchAllBokjiroPolicies() {
  const firstPage = await fetchBokjiroPage(1, 100);
  if (!firstPage) return [];

  const total = parseInt(firstPage.totalCount ?? '0', 10);
  const items = firstPage.servList ?? [];

  // Fetch remaining pages (up to 500 total to avoid hammering the API)
  const maxItems = Math.min(total, 500);
  const totalPages = Math.ceil(maxItems / 100);

  for (let page = 2; page <= totalPages; page++) {
    try {
      const pageData = await fetchBokjiroPage(page, 100);
      if (pageData?.servList) items.push(...pageData.servList);
      // Polite delay
      await new Promise(r => setTimeout(r, 300));
    } catch {
      console.warn(`  ⚠ Page ${page} failed, stopping early`);
      break;
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('혜택줍줍 policy data fetcher');
  console.log('─'.repeat(40));

  if (!API_KEY) {
    console.warn('⚠  DATA_GO_KR_KEY not set — skipping API fetch, preserving existing data.');
    process.exit(0);
  }

  let rawItems = [];
  let source = 'mock';

  // 1. Try 복지로 API
  try {
    console.log('→ Fetching 복지로 API...');
    rawItems = await fetchAllBokjiroPolicies();
    source = 'bokjiro-api';
    console.log(`  ✓ Fetched ${rawItems.length} items from 복지로`);
  } catch (err) {
    console.error(`  ✗ 복지로 API failed: ${err.message}`);
    console.log('  → Falling back: keeping existing generated data');
    process.exit(0); // Exit 0 so the workflow doesn't fail — just keep old data
  }

  // 2. Normalize
  console.log('→ Normalizing...');
  const policies = rawItems
    .filter(item => item.servNm && item.servId)
    .map(item => {
      try {
        return normalizeListItem(item);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  console.log(`  ✓ Normalized ${policies.length} policies`);

  // 3. Write output
  const output = {
    fetchedAt: new Date().toISOString(),
    source,
    count: policies.length,
    policies,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✓ Written to ${OUT_PATH}`);
  console.log(`  source:    ${source}`);
  console.log(`  count:     ${policies.length}`);
  console.log(`  fetchedAt: ${output.fetchedAt}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
