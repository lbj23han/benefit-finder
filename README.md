# 혜택줍줍 (Benefit Finder)

> 나에게 맞는 정부 지원 혜택을 자동으로 찾아주는 모바일 PWA

[![Data Update](https://github.com/lbj23han/benefit-finder/actions/workflows/update-policies.yml/badge.svg)](https://github.com/lbj23han/benefit-finder/actions/workflows/update-policies.yml)

---

## 제품 소개

**혜택줍줍**은 나이·지역·직업·소득·가구 유형을 입력하면 받을 수 있는 정부 지원 혜택을 자동으로 추천해주는 프론트엔드 PWA입니다.

정책 데이터는 **복지로 공식 API · 정부24 API (data.go.kr)** 에서 매일 자동으로 수집·갱신되며, **Claude AI (Haiku)**가 각 정책의 대상 특성·지원 금액·일반 관련도를 분석해 추천 품질을 높입니다.

현재 **4,539개 정책** 수록 (전국 459건 + 서울 875건 + 경기 524건 + 전국 17개 시도 전체)

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 맞춤 추천 | 나이·지역·직업·소득·가구 유형 기반 3-요소 점수화 알고리즘 |
| 세부 지역 필터 | 시·도 + 구/시/군 2단계 지역 필터링. 종로구 설정 시 타 구 정책 하드블록 |
| AI 보강 | Claude Haiku가 정책별 `targetSpecialty` · `relevanceScore` · `estimatedBenefitText` 추출 |
| 강력한 필터링 | 군인·농업인·원양어선 등 특수 대상 하드블록, 프로필 맥락 기반 우선순위 조정 |
| 정책 상세 | 자격 요건, 혜택 금액(또는 AI 예상 혜택), 공식 사이트 직링크 |
| 북마크 | 관심 정책 로컬 저장 및 저장 목록 페이지 |
| 검색·필터·정렬 | 키워드 검색, 카테고리 필터, 금액순/마감순 정렬 |
| 자동 데이터 갱신 | GitHub Actions + 복지로/정부24 API → 매일 새벽 자동 업데이트 |
| PWA | 설치 가능, 오프라인 대응, 모바일 최적화 |
| 반응형 | 모바일 / 태블릿 / 데스크탑 전 구간 지원 |

---

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React (크로스 플랫폼 SVG 아이콘)
- **State**: React hooks + localStorage
- **AI 보강**: Claude Haiku (claude-haiku-4-5) — 빌드 타임 배치 처리
- **Data Pipeline**: GitHub Actions + 복지로 Open API + 정부24 API (data.go.kr)
- **Deployment**: Vercel

---

## 데이터 파이프라인 구조

```
매일 새벽 2시 KST
  └─ GitHub Actions (.github/workflows/update-policies.yml)
       ├─ scripts/fetchPolicies.mjs 실행
       │    ├─ [1/4] 복지로 V001 API (국가복지정보)
       │    ├─ [2/4] 복지로 V2 API (국가복지정보 V2)
       │    ├─ [3/4] 복지로 LCGV API (지자체복지정보, 4,500건+)
       │    │         └─ ctpvNm/sggNm → 시도+구시군 정규화
       │    │              (서울특별시 → 서울 / 마포구 → 마포구)
       │    ├─ [4/4] 정부24 API (serviceList, 1,500건)
       │    │         └─ 소관기관명 기반 지역 추론
       │    │              (서울특별시 마포구 → ['서울', '마포구'])
       │    ├─ 중복 제거 (id 기준)
       │    ├─ Claude Haiku 배치 보강 (20개씩, 4.5초 간격)
       │    │    ├─ targetSpecialty  (veteran/military/maritime 등)
       │    │    ├─ relevanceScore   (0~1, 일반 시민 기준 관련도)
       │    │    └─ estimatedBenefitText (예: "월 최대 33만원")
       │    ├─ 특수 대상 정책 후처리 필터링
       │    └─ src/data/policies.generated.json 저장
       └─ 변경사항 git commit & push
            └─ Vercel 자동 감지 → 재빌드 (약 2분)
```

API 호출 실패 시 기존 데이터 보존, 앱은 항상 정상 동작합니다.

---

## 지역 필터링 설계

### 2단계 지역 구조

```
profile.region = '서울'           → 시/도 단위 (필수)
profile.district = '종로구'       → 구/시/군 단위 (선택)
```

### 하드블록 규칙

| 조건 | 동작 |
|------|------|
| policy.region = ['전국'] | 항상 통과 |
| policy.region에 profile.region 미포함 | 블록 (score 0.05) |
| district 설정 + 정책이 구 단위 특정 + 구 불일치 | 블록 (score 0.05) |
| district 설정 + 정책이 시 전체 (['서울']) | 통과 (구 무관 표시) |

### 구 단위 감지 기준

`policy.region` 내 문자열이 `[구시군]$` 패턴으로 끝나면 구 단위 정책으로 판단.
- `['서울 마포구']` → 구 단위 → district 하드블록 적용
- `['서울']` → 시 단위 → district 블록 없음 (전체 서울 노출)

### 지역 이름 정규화

LCGV API가 반환하는 전체 지역명을 프로필 약칭으로 변환:

| API 반환값 | 정규화 결과 |
|-----------|------------|
| 서울특별시 | 서울 |
| 강원특별자치도 / 강원도 | 강원 |
| 전라북도 / 전북특별자치도 | 전북 |
| 제주특별자치도 | 제주 |

---

## 추천 점수 알고리즘

최종 점수 = **적격성×0.5 + 실용성×0.3 + 혜택가치×0.2**

### 1. 적격성 점수 (eligibilityScore)

**하드 블록 (→ e = 0.03~0.07)**
- `targetSpecialty` 필드: veteran / military / maritime / agriculture / foreign-national / religion
- 제목·설명 패턴 매칭: 국가유공자, 원양어선, 농업인, 현역군인, 한센인 등
- 직업·카테고리 불일치: 소상공인 정책 → 비자영업자, 보육 카테고리 → 비자녀가구
- `relevanceScore` < 0.30 (Claude가 틈새 대상으로 판단)

**구조화 조건 점수 (가중 곱)**

| 조건 | 일치 | 불일치 |
|------|------|--------|
| 지역 | 통과 | 즉시 0.05 반환 |
| 구/시/군 (district 설정 시) | 통과 or +18% | 즉시 0.05 반환 |
| 나이 (명시) | 1.0 | 즉시 0.05 반환 |
| 나이 (추론) | ×0.88 | 즉시 0.05 반환 |
| 나이 (미상) | ×0.65 | — |
| 직업 | ×1.0 | ×0.10 |
| 소득 | ×1.0 | ×0.10 |
| 가구 유형 | ×1.0 | ×0.28 |

**적격성 게이트**: e < 0.35 → 최종 점수 대폭 감산

### 2. 실용성 점수 (practicalityScore)

- 상시접수: +0.35 / 현재 접수 중: +0.20 / 마감: -0.30
- 유형별 보너스: 현금 +0.20 · 바우처 +0.14 · 서비스 +0.08 · 세금감면 +0.04 · 대출 -0.05

### 3. 혜택가치 점수 (benefitScore)

- 현금 1.0 · 바우처 0.85 · 세금감면 0.65 · 대출 0.45 · 서비스 0.35
- 지원 금액을 최대 유용 금액(5,000만원) 대비 정규화

### 4. 프로필 맥락 기반 우선순위 조정

| 조건 | 조정 |
|------|------|
| 비저소득 + 조건 없는 보편 서비스 | ×0.72 |
| 저소득 + 현금/바우처 (e ≥ 0.40) | ×1.18 |
| 저소득 + 주거 카테고리 (e ≥ 0.40) | ×1.12 |
| 저소득 + 대출 (e ≥ 0.40) | ×0.78 |
| 30대 이하 1인가구 + 주거 | ×1.20 |
| 재직자 + 취업 카테고리 | ×1.12 |
| 자영업자 + 창업·취업 | ×1.12 |
| district 일치 (e ≥ 0.25) | ×1.18 |

**isFullMatch**: e ≥ 0.60 AND 최종 점수 ≥ 65 → "신청 가능성 높음" 배지

---

## 정확도 검증

5개 프로필 시뮬레이션 기준 평균 **~89-90% 정확도**:

| 프로필 | 주요 결과 |
|--------|-----------|
| 30대 서울 미취업 기초수급 1인가구 | 긴급복지 생계/주거/연료/의료 상위 |
| 20대 경기 학생 중하위소득 | 인문장학금·국가장학금 1~2위 |
| 40대 부산 자영업 중산층 자녀있음 | 중장년 창업센터 등 자영업 정책 상위 5개 |
| 30대 서울 재직자 중하위 자녀있음 | 근로·자녀장려금 1위 (score 89) |
| 60대 인천 미취업 중하위 부부 | 기초연금·치매검진 1~2위 |

---

## 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

### 정책 데이터 직접 갱신 (선택)

```bash
# .env.local 에 API 키 설정
cp .env.local.example .env.local
# DATA_GO_KR_KEY=발급받은키 입력
# ANTHROPIC_API_KEY=Claude API 키 입력

# 데이터 수동 갱신 (복지로 API + Claude 보강)
npm run fetch:policies

# 기존 데이터 지역 패치 (Claude 재실행 없이)
node scripts/patchRegions.mjs
```

> 복지로 API 키 발급: data.go.kr → 로그인 → 마이페이지 → 인증키

---

## GitHub Actions 설정

```
GitHub repo → Settings → Secrets and variables → Actions → New secret

이름: DATA_GO_KR_KEY      값: 복지로 서비스키
이름: ANTHROPIC_API_KEY   값: Claude API 키
```

---

## 폴더 구조

```
src/
  app/
    page.tsx               # 홈 (맞춤 TOP 5 + 카테고리 단축)
    results/page.tsx       # 전체 추천 목록 + 필터
    saved/page.tsx         # 북마크 목록
    profile/page.tsx       # 프로필 수정 (필드별 모달 편집)
    policy/[id]/page.tsx   # 정책 상세
    onboarding/page.tsx    # 최초 프로필 입력 (3단계)
  components/
    layout/                # AppShell, BottomNav (모바일) / 사이드바 (데스크탑)
    policy/                # PolicyCard, FilterBar
    profile/               # ProfileFieldModal (지역·구 동적 옵션 포함)
    common/                # BookmarkButton, EmptyState, FreshnessBar, SearchInput
  constants/
    districts.ts           # 시/도 → 구/시/군 목록 (전국 17개 시도)
  data/
    policies.generated.json # GitHub Actions 자동 생성 (4,539건)
    policies.ts            # 수작업 폴백 데이터
  hooks/
    usePolicies.ts         # 데이터 로드 훅 (30분 폴링 + 탭 포커스 갱신)
  lib/
    recommendation.ts      # 추천 점수 알고리즘 (핵심 로직)
    policyCache.ts         # API 캐시 관리
    storage.ts             # localStorage (프로필 + 북마크)
    utils.ts               # 포맷·레이블·아이콘 유틸
  types/
    index.ts               # Policy, UserProfile, RecommendationResult 등
scripts/
  fetchPolicies.mjs        # 데이터 수집 + Claude 보강 스크립트
  patchRegions.mjs         # 기존 데이터 지역 패치 스크립트
.github/workflows/
  update-policies.yml      # 자동 갱신 워크플로우
```

---

## 라이선스

MIT
