# 혜택줍줍 (Benefit Finder)

> 나에게 맞는 정부 지원 혜택을 자동으로 찾아주는 모바일 PWA

[![Data Update](https://github.com/lbj23han/benefit-finder/actions/workflows/update-policies.yml/badge.svg)](https://github.com/lbj23han/benefit-finder/actions/workflows/update-policies.yml)

---

## 제품 소개

**혜택줍줍**은 나이, 지역, 직업, 소득 조건을 입력하면 받을 수 있는 정부 지원 혜택을 자동으로 추천해주는 프론트엔드 PWA입니다.

정책 데이터는 **복지로 공식 API (data.go.kr)** 에서 매일 자동으로 수집·갱신됩니다.
수동으로 데이터를 관리하지 않아도 항상 최신 정보를 보여줍니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 맞춤 추천 | 나이·지역·직업·소득·가구 유형 기반 점수화 |
| 정책 상세 | 자격 요건, 혜택 금액, 공식 사이트 직링크 |
| 북마크 | 관심 정책 로컬 저장 |
| 검색·필터·정렬 | 키워드 검색, 카테고리 필터, 금액순/마감순 정렬 |
| 자동 데이터 갱신 | GitHub Actions + 복지로 API → 매일 새벽 자동 업데이트 |
| PWA | 설치 가능, 오프라인 대응, 모바일 최적화 |
| 반응형 | 모바일 / 태블릿 / 데스크탑 전 구간 지원 |

---

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State**: React hooks + localStorage
- **Data Pipeline**: GitHub Actions + 복지로 Open API (data.go.kr)
- **Deployment**: Vercel

---

## 데이터 파이프라인 구조

```
매일 새벽 2시 KST
  └─ GitHub Actions (.github/workflows/update-policies.yml)
       ├─ scripts/fetchPolicies.mjs 실행
       │    ├─ 복지로 API 호출 (NationalWelfareInformationsV2)
       │    ├─ 정책 데이터 정규화 (Policy 타입으로 변환)
       │    └─ src/data/policies.generated.json 저장
       └─ 변경사항 git commit & push
            └─ Vercel 자동 감지 → 재빌드 (약 2분)
```

API 호출 실패 시 기존 데이터 보존, 앱은 항상 정상 동작합니다.

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

# 데이터 수동 갱신
npm run fetch:policies
```

> API 키 발급: data.go.kr → 로그인 → 마이페이지 → 인증키
> 신청 API: 복지로 국가복지정보 서비스 (NationalWelfareInformationsV2)

---

## GitHub Actions 설정

자동 갱신을 활성화하려면 레포지토리 Secret을 등록하세요.

```
GitHub repo → Settings → Secrets and variables → Actions → New secret

이름: DATA_GO_KR_KEY
값:   발급받은 서비스키
```

등록 후 매일 자동 실행되며, GitHub Actions 탭에서 수동으로도 실행 가능합니다.

---

## 폴더 구조

```
src/
  app/                       # Next.js App Router 페이지
  components/                # 공통 컴포넌트 (layout, policy, profile, common)
  data/
    policies.ts              # 수작업 폴백 데이터 (21개)
    policies.generated.json  # GitHub Actions 자동 생성
    index.ts                 # generated > fallback 우선순위 병합
  hooks/
    usePolicies.ts           # 데이터 로드 훅
  lib/
    policyCache.ts / recommendation.ts / storage.ts / deeplink.ts
  types/
    index.ts
scripts/
  fetchPolicies.mjs          # 데이터 수집 스크립트
.github/workflows/
  update-policies.yml        # 자동 갱신 워크플로우
```

---

## 추천 점수 알고리즘

| 조건 | 점수 |
|------|------|
| 거주 지역 일치 | +30 |
| 나이 조건 충족 | +25 |
| 직업 조건 일치 | +20 |
| 소득 조건 충족 | +15 |
| 가구 유형 일치 | +10 |
| 현재 신청 기간 활성 | +10 |

점수 70점 이상 → "완전 매칭" / 미만 → "조건 일치" 표시

---

## 라이선스

MIT
