# 🚀 OpenSourceCommunity Cloudflare 배포 가이드북

본 문서는 **OpenSourceCommunity** 풀스택 애플리케이션을 **Cloudflare** 실서버 환경에 가장 세련되고 안정적인 100% 무인 자동 배포(CI/CD) 방식으로 런칭하기 위한 공식 가이드라인입니다.

오픈소스 제작사 가이드(Self-hosting)에 명시된 바와 같이, 윈도우 로컬의 child_process 파이프 통신 장벽(데드락)을 완전히 극복하기 위해 **"GitHub 연동 클라우드 무인 빌드"** 방식을 적용합니다. 이 방식을 사용하면 로컬 컴퓨터의 리소스를 전혀 쓰지 않고, 깃허브 푸시 한 번으로 클라우드의 청정 리눅스 컨테이너가 100% 완벽하게 빌드 및 글로벌 배포를 완료해 줍니다!

---

## 🎨 1. 프론트엔드 배포 (Cloudflare Pages - GitHub 무인 빌드)

사용자 화면 UI를 담당하는 **Next.js** 애플리케이션(`apps/web`)을 글로벌 엣지 네트워크에 정적 배포하는 과정입니다.

### 📌 Pages 생성 절차
1. [Cloudflare 대시보드](https://dash.cloudflare.com/)에 로그인합니다.
2. 왼쪽 사이드바 메뉴에서 **[Workers & Pages]** -> **[Create application]** -> **[Pages]** 탭을 순서대로 클릭합니다.
3. **[Connect to Git]** 버튼을 눌러 사용자님의 깃허브 계정을 연동합니다.
4. 연동된 목록 중 방금 우리가 완성한 **`OpenSourceCommunity`** 저장소를 선택하고 **[Begin setup]**을 클릭합니다.

### ⚙️ 빌드 및 아키텍처 설정값
설정 창에서 아래 표의 값을 정확하게 입력해 줍니다.

| 항목 (Setting Field) | 설정할 값 (Value to enter) | 설명 (Context) |
| :--- | :--- | :--- |
| **Project Name** | `opensource-community` | 실서버 도메인 주소의 이름이 됩니다. |
| **Production Branch** | `main` | 실서버로 보낼 핵심 메인 브랜치입니다. |
| **Framework Preset** | **`Next.js`** | 프레임워크 규격을 Next.js로 지정합니다. |
| **Root Directory** | **`apps/web`** | 모노레포 하위의 프론트 폴더 경로를 지정합니다. |
| **Build Command** | `pnpm --filter web build` | 핀포인트로 오직 프론트엔드만 격리 배포하여 백엔드 중복 에러를 방지하는 무적의 빌드 명령어입니다. |
| **Build Output Directory** | **`.vercel/output`** | Cloudflare Pages의 Next.js 표준 빌드 아웃풋 경로입니다. |

### 🔑 1-1. 프론트엔드와 백엔드 실서버 연동 열쇠 (중요!)
빌드 설정 화면 하단의 **[Environment variables (setup optional)]**를 펼쳐, 프론트엔드가 방금 가동시킨 백엔드 API 주소를 바라보도록 연동 변수를 꽂아 줍니다!

* **Variable Name**: `NEXT_PUBLIC_API_URL`
* **Value**: **`https://osc-api.jcodestudio.workers.dev`** (우리가 성공적으로 쏘아 올린 실서버 백엔드 공식 주소!)

> **[Save and Deploy]** 버튼을 클릭하시면, 클라우드플레어의 청정 리눅스 컨테이너가 깃허브로부터 코드를 땡겨와 단 한 치의 오차도 없이 100% 빌드를 통과시키며 전 세계 접속용 정식 웹사이트 도메인을 발급해 줍니다! 🎉

---

## 🔌 2. 백엔드 API 배포 (Cloudflare Workers)

백엔드 데이터 처리 및 데이터베이스 연동을 담당하는 **Hono API** 서버(`apps/api`)를 배포하는 과정입니다.

백엔드는 터미널 창에서 딱 한 줄의 명령어로 1초 만에 배포가 완료됩니다!

### 📌 Workers 배포 절차
1. 터미널 창에서 모노레포 루트 경로(`d:\work\OpenSourceCommunity`)를 기준으로 아래 명령어를 입력하고 엔터를 칩니다.
   ```bash
   pnpm --filter api run deploy
   ```
2. 배포 즉시 백엔드 실서버 가동 주소인 **`https://osc-api.jcodestudio.workers.dev`** 가 영롱하게 활성화됩니다!

### 🔑 2-1. 백엔드 환경 변수 등록하기
Cloudflare 대시보드 **[Workers & Pages]** -> 배포된 **`osc-api` Worker** 클릭 -> **[Settings]** -> **[Variables]** 탭에서 아래 두 가지 Supabase 보안 열쇠를 꽂아 줍니다.

| Variable Name (이름) | Value (실제 값) | 역할 (Role) |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | `postgres://...` (Connection Pooler 주소) | Supabase 데이터베이스 접속을 위한 심장 주소 |
| **`SUPABASE_JWT_SECRET`** | `your-actual-jwt-secret-key` | 로그인 및 사용자 토큰을 해독하는 보안 열쇠 |

---

## 🔄 3. 평생 무인 자동 배포(CI/CD) 파이프라인

이 모든 세팅을 단 1번만 해두시면, 이후부터는 아래와 같은 **환상적인 무정전 자동 업데이트 사이클**이 영구적으로 작동합니다!

로컬 코드 수정 ➡️ 배치 파일 더블클릭(`.\commit-and-push.bat`) ➡️ GitHub 저장소 자동 푸시 ➡️ Cloudflare Pages 실시간 감지 및 초고속 빌드 ➡️ 실서버 자동 업데이트 완료!

이 백서를 보시면서 편안하고 짜릿하게 실서버 런칭을 완료해 보세요! 수고 많으셨습니다! 🏆🚀💚
