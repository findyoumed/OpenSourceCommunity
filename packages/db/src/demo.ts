import * as fs from 'fs'
import * as path from 'path'

// Load .env.local if it exists to make it easy to run
try {
  const possiblePaths = [
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '../web/.env.local'),
    path.resolve(__dirname, '../../../apps/web/.env.local'),
    path.resolve(__dirname, '../../apps/web/.env.local')
  ]
  let envPath = ''
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      envPath = p
      break
    }
  }
  if (envPath) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match && match[1]) {
        const key = match[1]
        let val = match[2] || ''
        val = val.trim()
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
} catch {}

import { createClient } from './client'
import {
  users,
  members,
  tenants,
} from './schema/core'
import {
  forumCategories,
  forumThreads,
  forumPosts,
  forumReactions,
} from './schema/forums'
import {
  ideas,
  ideaVotes,
  ideaComments,
} from './schema/ideas'
import {
  events,
  eventRsvps,
} from './schema/events'
import {
  courses,
  courseLessons,
  courseEnrollments,
} from './schema/courses'
import {
  webinars,
  webinarRegistrations,
} from './schema/webinars'
import {
  kbCategories,
  kbArticles,
} from './schema/kb'
import {
  chatChannels,
  chatMessages,
} from './schema/chat'
import {
  siKeywordGroups,
  siMentions,
  siAlerts,
} from './schema/social-intel'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

// [LOG: 20260527_1535]
let TENANT_ID: string = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// ---------------------------------------------------------------------------
// Helper to create a Supabase auth user
// ---------------------------------------------------------------------------
async function createAuthUser(
  email: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const data = (await res.json()) as { id?: string; message?: string; msg?: string }
  if (!data.id) {
    // user may already exist — try listing
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      },
    )
    const listData = (await listRes.json()) as { users?: { id: string; email: string }[] }
    const existing = listData.users?.find((u) => u.email === email)
    if (existing) return existing.id
    throw new Error(
      `Failed to create auth user ${email}: ${data.message ?? data.msg ?? JSON.stringify(data)}`,
    )
  }
  return data.id
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000)

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function seed() {
  const db = createClient(DATABASE_URL!)

  // [LOG: 20260527_1540] Resolve tenant dynamically from DB if possible
  const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || 'community'
  const { eq } = await import('drizzle-orm')
  try {
    const [tenantRecord] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1)
    if (tenantRecord) {
      TENANT_ID = tenantRecord.id
      console.log(`Resolved dynamic tenant ID from database: ${TENANT_ID} (slug: ${tenantSlug})`)
    } else {
      console.log(`Tenant with slug "${tenantSlug}" not found. Using default TENANT_ID: ${TENANT_ID}`)
    }
  } catch (err) {
    console.warn(`Could not fetch tenant, using default: ${TENANT_ID}`, err)
  }

  // -------------------------------------------------------------------------
  // Step 1: Create auth users
  // -------------------------------------------------------------------------
  console.log('Creating Supabase auth users...')
  const userDefs = [
    { email: 'admin@acme.com',  password: 'password123', displayName: 'Admin User',   role: 'org_admin'  as const, username: 'admin',  bio: 'Community admin and product evangelist at Acme.', avatar: 'admin'  },
    { email: 'sarah@acme.com',  password: 'password123', displayName: 'Sarah Chen',   role: 'moderator'  as const, username: 'sarah',  bio: 'Community moderator. Passionate about developer experience.', avatar: 'sarah'  },
    { email: 'alex@acme.com',   password: 'password123', displayName: 'Alex Rivera',  role: 'member'     as const, username: 'alex',   bio: 'Full-stack engineer, integration enthusiast.', avatar: 'alex'   },
    { email: 'maya@acme.com',   password: 'password123', displayName: 'Maya Patel',   role: 'member'     as const, username: 'maya',   bio: 'Head of Operations. Automates everything possible.', avatar: 'maya'   },
    { email: 'james@acme.com',  password: 'password123', displayName: 'James Okafor', role: 'member'     as const, username: 'james',  bio: 'Startup founder. Using OpenSourceCommunity to scale support.', avatar: 'james'  },
    { email: 'priya@acme.com',  password: 'password123', displayName: 'Priya Singh',  role: 'member'     as const, username: 'priya',  bio: 'Customer Success Manager. Loves webinars.', avatar: 'priya'  },
    { email: 'tom@acme.com',    password: 'password123', displayName: 'Tom Nguyen',   role: 'member'     as const, username: 'tom',    bio: 'Backend engineer, API power user.', avatar: 'tom'    },
    { email: 'guest@acme.com',  password: 'password123', displayName: 'Guest User',   role: 'guest'      as const, username: 'guest',  bio: 'Just exploring the community.', avatar: 'guest'  },
  ]

  const authIds: string[] = []
  for (const u of userDefs) {
    const id = await createAuthUser(u.email, u.password)
    authIds.push(id)
    console.log(`  ✓ ${u.email} → ${id}`)
  }

  // -------------------------------------------------------------------------
  // Step 2: Insert users rows
  // -------------------------------------------------------------------------
  console.log('Inserting users rows...')
  const userRows = userDefs.map((u, i) => ({
    id: authIds[i]!,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar}`,
  }))
  await db.insert(users).values(userRows).onConflictDoNothing()

  // -------------------------------------------------------------------------
  // Step 3: Insert members rows
  // -------------------------------------------------------------------------
  console.log('Inserting members rows...')
  const memberRows = userDefs.map((u, i) => ({
    tenantId: TENANT_ID,
    userId: authIds[i]!,
    role: u.role,
    displayName: u.displayName,
    username: u.username,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar}`,
    bio: u.bio,
    socialHandles: u.username === 'admin'
      ? { twitter: '@acmecommunity', linkedin: 'acme-community' }
      : u.username === 'sarah'
      ? { twitter: '@sarahchen_dev', github: 'sarahchen' }
      : u.username === 'alex'
      ? { github: 'alexrivera', twitter: '@alexrivera_eng' }
      : u.username === 'maya'
      ? { linkedin: 'mayapatel-ops' }
      : u.username === 'james'
      ? { twitter: '@jamesokafor', linkedin: 'james-okafor' }
      : u.username === 'priya'
      ? { linkedin: 'priya-singh-cs', twitter: '@priyasingh_cs' }
      : u.username === 'tom'
      ? { github: 'tomnguyen', twitter: '@tomng_dev' }
      : {},
    lastActiveAt: daysAgo(Math.floor(Math.random() * 7)),
  }))
  await db
    .insert(members)
    .values(memberRows)
    .onConflictDoNothing()
    .returning({ id: members.id, userId: members.userId })

  // Build userId -> memberId map
  // Re-query to get member IDs reliably
  const { inArray } = await import('drizzle-orm')
  const memberRecords = await db
    .select({ id: members.id, userId: members.userId })
    .from(members)
    .where(inArray(members.userId, authIds))
  const memberByUserId: Record<string, string> = {}
  for (const m of memberRecords) {
    memberByUserId[m.userId] = m.id
  }

  const [adminMId, sarahMId, alexMId, mayaMId, jamesMId, priyaMId, tomMId, guestMId] =
    authIds.map((uid) => memberByUserId[uid]!) as [string, string, string, string, string, string, string, string]

  console.log(`  Members: ${Object.keys(memberByUserId).length} found`)

  // -------------------------------------------------------------------------
  // Step 4: Forum categories
  // -------------------------------------------------------------------------
  console.log('Creating forum categories...')
  await db
    .insert(forumCategories)
    .values([
      {
        tenantId: TENANT_ID,
        name: '공지사항',
        slug: 'announcements',
        description: 'Acme 팀의 공식 안내와 새로운 소식을 전해드리는 공간입니다.',
        sortOrder: 0,
        visibility: 'members' as const,
      },
      {
        tenantId: TENANT_ID,
        name: '자유 토론',
        slug: 'general',
        description: '오픈소스 커뮤니티, 연동 작업, 모범 사례 등 다양한 주제로 자유롭게 이야기하는 공간입니다.',
        sortOrder: 1,
        visibility: 'members' as const,
      },
      {
        tenantId: TENANT_ID,
        name: '질문 및 피드백',
        slug: 'help',
        description: '궁금한 점을 질문하고, 버그를 제보하며, 플랫폼 개선 의견을 나누어 주세요.',
        sortOrder: 2,
        visibility: 'members' as const,
      },
    ])
    .onConflictDoNothing()
    .returning({ id: forumCategories.id })

  // If they already exist, fetch them
  const allCats = await db
    .select({ id: forumCategories.id, slug: forumCategories.slug })
    .from(forumCategories)
    .where(eq(forumCategories.tenantId, TENANT_ID))

  const catMap: Record<string, string> = {}
  for (const c of allCats) catMap[c.slug] = c.id
  const annCatId = catMap['announcements']
  const genCatId = catMap['general']
  const helpCatId = catMap['help']
  console.log(`  Categories: announcements=${annCatId?.slice(0,8)}, general=${genCatId?.slice(0,8)}, help=${helpCatId?.slice(0,8)}`)

  // -------------------------------------------------------------------------
  // Step 5: Forum threads & posts
  // -------------------------------------------------------------------------
  console.log('Creating forum threads and posts...')

  const richBody = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

  const threadDefs = [
    // Announcements
    {
      catId: annCatId, authorId: adminMId, isPinned: true, isFeatured: true,
      title: 'Acme 공식 커뮤니티에 오신 것을 환영합니다! 🎉',
      body: richBody("공식 Acme 커뮤니티 플랫폼이 문을 열게 되어 매우 기쁩니다! 이곳은 우리 플랫폼의 파워 유저들이 함께 소통하고, 유용한 노하우를 공유하며, 제품 로드맵에 피드백을 전달할 수 있는 여러분 모두의 공간입니다. 아래 댓글로 가볍게 인사를 나누어 주세요!"),
      createdAt: daysAgo(58),
      replies: [
        { authorId: sarahMId, body: richBody("이런 공간이 생기다니 정말 기대되네요! 다른 고수분들과 연동 사례나 활용 팁을 편하게 나눌 수 있는 전용 포럼을 손꼽아 기다렸습니다."), createdAt: daysAgo(57) },
        { authorId: alexMId, body: richBody("아주 훌륭한 시도입니다. 가입하자마자 통합 연동 가이드 섹션을 읽어봤는데 벌써 큰 도움이 되었습니다."), createdAt: daysAgo(57) },
        { authorId: jamesMId, body: richBody("방금 가입을 완료했습니다! 게시판 UI가 엄청 깔끔하고 반응이 빨라서 마음에 드네요. 앞으로 잘 부탁드립니다."), createdAt: daysAgo(56) },
      ],
    },
    {
      catId: annCatId, authorId: adminMId, isPinned: true, isFeatured: false,
      title: '플랫폼 v2.1 업데이트 소식 — 주요 변경 사항 안내 🚀',
      body: richBody("플랫폼 v2.1 정식 업데이트 버전이 배포되었습니다! 주요 사항: 1) 커스텀 도메인 정식 연동(GA), 2) Zapier 타사 플랫폼 통합 연동 베타 릴리스, 3) 실시간 알림 이메일 전송 속도 40% 향상. 상세 내역은 지식 베이스(KB)에서 전문을 보실 수 있습니다."),
      createdAt: daysAgo(14),
      replies: [
        { authorId: mayaMId, body: richBody("커스텀 도메인을 드디어 쓸 수 있군요! 저희 서비스 도메인으로 브랜딩하려고 많이 기대하고 있었습니다. 오늘 바로 세팅 완료하겠습니다."), createdAt: daysAgo(13) },
        { authorId: tomMId, body: richBody("이메일 전송 지연이 체감될 정도로 획기적으로 줄어든 것이 보입니다. 고생하신 개발 및 인프라 팀원분들께 감사드립니다!"), createdAt: daysAgo(13) },
      ],
    },
    // General
    {
      catId: genCatId, authorId: alexMId, isPinned: false, isFeatured: true,
      title: 'API를 활용해 신규 회원 가입 온보딩을 자동화한 사례가 있나요?',
      body: richBody("저희는 Salesforce에 새로운 연락처가 영업 성사 단계로 등록되는 즉시, 커뮤니티로 자동 초대장을 발송하고 회원 가입을 트리거하는 Zapier 워크플로우를 연동하여 사용 중입니다. 혹시 다른 기업 고객사분들은 API나 웹훅을 어떤 독특한 플로우로 연결해서 쓰시는지 노하우를 듣고 싶습니다."),
      createdAt: daysAgo(45),
      replies: [
        { authorId: mayaMId, body: richBody("저희도 HubSpot을 사용해 아주 유사하게 구현했습니다! 거래가 클로즈되는 시점에 웹훅을 태워 커뮤니티 멤버 API를 자동 호출하는데, 사람이 손댈 필요 없이 누수가 없어서 매우 만족스럽습니다."), createdAt: daysAgo(44) },
        { authorId: tomMId, body: richBody("좋은 사례 공유네요. 저희는 가입뿐 아니라 탈퇴나 결제 만료 시에도 회원 역할을 자동으로 'guest'로 즉시 강등 처리하는 웹훅 동기화 단계를 추가해 보안 리스크를 통제하고 있습니다."), createdAt: daysAgo(44) },
        { authorId: jamesMId, body: richBody("엄청난 꿀팁이네요! 혹시 신규 멤버 생성 API를 찌를 때 보내는 JSON 데이터의 구체적인 샘플 코드나 레이아웃을 볼 수 있을까요?"), createdAt: daysAgo(43) },
        { authorId: alexMId, body: richBody("@james 네! { email, displayName, role, metadata: { sfAccountId } } 구조로 찌르면 됩니다. 정말 간결하고 직관적이라 개발 공수도 적게 들어요!"), createdAt: daysAgo(43) },
      ],
    },
    {
      catId: genCatId, authorId: priyaMId, isPinned: false, isFeatured: false,
      title: '첫 커뮤니티 웨비나를 성공적으로 운영하기 위한 유용한 팁이 있을까요?',
      body: richBody("저희가 다음 달에 처음으로 커뮤니티 활성화를 위한 실시간 교육 웨비나를 기획 중입니다. 진행 도중 참가자들의 질문 유도나 주의 집중, 이탈 방지를 위한 실무 노하우가 있다면 조언 한마디씩 부탁드립니다!"),
      createdAt: daysAgo(38),
      replies: [
        { authorId: sarahMId, body: richBody("웨비나 오프닝 때 5분 내외의 가벼운 '아이스브레이킹 투표'를 띄우는 걸 추천해 드려요! 분위기도 한결 가벼워지고, 참가 목적 데이터도 수집할 수 있습니다. 실제로 이걸 도입하고 Q&A 참여율이 3배나 뛰었습니다."), createdAt: daysAgo(37) },
        { authorId: adminMId, body: richBody("발표 시간은 가급적 45분 이내로 타이트하게 잡고, 발표 20분 차 중간 지점에 실시간 핵심 문서 링크를 챗에 투척해 시선을 집중시키세요. 그리고 마지막엔 명확한 다음 단계 참여를 유도하는 CTA(행동 유도)로 정리를 매듭짓는 게 정석입니다."), createdAt: daysAgo(37) },
        { authorId: priyaMId, body: richBody("두 분 모두 금쪽같은 노하우 감사합니다! 다음 주 오프닝 기획안에 실시간 투표를 바로 설계해 넣어야겠습니다."), createdAt: daysAgo(36) },
      ],
    },
    {
      catId: genCatId, authorId: jamesMId, isPinned: false, isFeatured: false,
      title: '커뮤니티 주도 성장(CLG) 도입 3개월 차 지표와 성과를 공유합니다 📈',
      body: richBody("플랫폼을 전면 가동한 지 딱 3개월이 경과했습니다. 저희의 주요 핵심 지표: 총 활성 회원 430명 도달, 월간 참여율 62% 기록, 그리고 연동 전 대비 고객지원 문의 티켓 인입량이 34%나 감소하는 효과를 거두었습니다. 궁금한 점이 있으시다면 언제든 질문해 주세요!"),
      createdAt: daysAgo(30),
      replies: [
        { authorId: alexMId, body: richBody("고객 문의 티켓 34% 감소는 엄청난 운영 효율화 성과네요! 구체적으로 지식 베이스(KB)의 어떤 카테고리 문서가 자가 해결(Self-serve)을 가장 많이 유도했나요?"), createdAt: daysAgo(29) },
        { authorId: priyaMId, body: richBody("저희는 도입 2개월 차에 접어들며 문의 28% 감소를 보이고 있습니다. 혹시 신규 회원이 가입한 직후 가장 먼저 마주하는 온보딩 저니맵(Journey Map)이 어떻게 설정되어 있으신지 정보가 탐납니다."), createdAt: daysAgo(29) },
        { authorId: jamesMId, body: richBody("초기 시작 가이드(Getting Started) 아티클들과 포럼 게시판 맨 위에 고정해 둔 '이용 안내 및 가이드' 공지 스레드가 큰 역할을 했습니다. 이 가이드라인 공지글 조회만으로 전체 문의 자가 차단의 15% 정도가 커버되고 있습니다."), createdAt: daysAgo(28) },
      ],
    },
    {
      catId: genCatId, authorId: tomMId, isPinned: false, isFeatured: false,
      title: '실시간 채팅방 vs 포럼 게시판 — 지식 아카이빙 측면에서의 솔직한 장단점',
      body: richBody("기존에는 슬랙(Slack) 채널을 파서 모든 질의응답을 소화했었는데, 최근에 포럼 스레드 게시판 체제로 전환했습니다. 경험상 포럼에 아카이빙된 정보들이 질문이 반복되는 것을 막는 수명이 5배 이상 길다고 느끼는데, 다른 매니저님들의 체감도는 어떠신가요?"),
      createdAt: daysAgo(22),
      replies: [
        { authorId: sarahMId, body: richBody("완전 공감합니다! 포럼 글은 구조적 검색이 아주 용이하고 구글에 인덱싱이 되는 반면, 실시간 채팅은 며칠만 지나도 휘발되는 블랙홀에 가깝더군요. 마이그레이션이 신의 한 수였습니다."), createdAt: daysAgo(21) },
        { authorId: mayaMId, body: richBody("저희는 공지 공유 및 네트워킹은 실시간 채팅 채널로 처리하고, 공식 기술 지원이나 솔루션 관련 정량 질의응답은 완전히 포럼으로 분리해서 교환 범위를 교통정리하여 최고의 균형을 잡았습니다."), createdAt: daysAgo(21) },
      ],
    },
    {
      catId: genCatId, authorId: mayaMId, isPinned: false, isFeatured: false,
      title: '고객사 멤버 등급에 따라 커뮤니티 권한 및 스페이스를 분할하는 모범 사례',
      body: richBody("저희 서비스는 무료체험, 프로, 그리고 엔터프라이즈 등급으로 권한이 나뉩니다. 커스텀 역할 관리 기능을 활용해 특정 포럼 카테고리나 실시간 웨비나 코스를 차등 차단하고 노출하고 있습니다. 설정한 역할 권한 매트릭스를 필요로 하시는 분들을 위해 본문에 템플릿 파일로 공유해 놓겠습니다."),
      createdAt: daysAgo(18),
      replies: [
        { authorId: adminMId, body: richBody("플랫폼이 설계된 다중 권한 목적을 최고 수준으로 녹여내신 멋진 예제군요! 다음 달 정기 웨비나에서 우수 고객 활용기로 소개해 주시면 큰 영광이겠습니다."), createdAt: daysAgo(17) },
        { authorId: alexMId, body: richBody("중간에 멤버가 등급을 업그레이드하거나 멤버십이 중단되는 갱신 이벤트 처리는 어떻게 처리하셨나요? 수작업으로 역할을 조정하시나요?"), createdAt: daysAgo(17) },
        { authorId: mayaMId, body: richBody("Stripe(스트라이프) 결제 대시보드에서 결제 완료 및 보류 이벤트 웹훅을 쏘아주면, 백엔드가 회원 업데이트 API를 실시간으로 자동 찔러 역할을 바꾸게 시스템화해 두었습니다."), createdAt: daysAgo(16) },
      ],
    },
    // Help & Feedback
    {
      catId: helpCatId, authorId: alexMId, isPinned: false, isFeatured: false,
      title: '대량 멤버 마이그레이션 도중 API 호출 횟수 제한(Rate Limit) 초과 해결법',
      body: richBody("약 2000명의 기존 이메일 회원을 한 번에 일괄 임포트하는 과정에서 429(Too Many Requests) 에러 폭탄을 만났습니다. 한 번에 보낼 수 있는 일괄 등록 엔드포인트나 일시적인 속도 제한 해제 방법이 있나요?"),
      createdAt: daysAgo(40),
      replies: [
        { authorId: adminMId, body: richBody("안녕하세요 Alex님! 기술 지원팀에 요청 주시면 마이그레이션 기간 동안 한도를 수동 상향 조정해 드릴 수 있습니다. 또한 v2.2 업데이트 스펙에 일괄 멤버 생성용 배치 `/members/bulk` 엔드포인트가 공식 추가될 계획입니다."), createdAt: daysAgo(39) },
        { authorId: tomMId, body: richBody("저도 같은 진통을 겪었습니다. 당시 편법으로 API 요청 주기 사이에 100ms 지연 시간(Sleep)을 주고, 50개 레코드 단위로 끊어서 루프를 돌리는 방식으로 해결했는데 호출 실패율이 0%로 떨어졌습니다."), createdAt: daysAgo(39) },
        { authorId: alexMId, body: richBody("답변 주신 두 분 모두 진심으로 감사합니다! Tom님이 제안해 주신 100ms 딜레이 슬립 기법을 구현하여 무사히 2,000명 주입에 성공했습니다! 추후 정식 배치 API가 오픈되면 더욱 좋겠네요."), createdAt: daysAgo(38) },
      ],
    },
    {
      catId: helpCatId, authorId: priyaMId, isPinned: false, isFeatured: false,
      title: '동영상 녹화본 업로드 후 완료 상태로 변하지 않고 먹통인 현상 📹',
      body: richBody("웨비나 녹화 동영상 파일을 대시보드에 업로드한 지 48시간이 경과했는데도 여전히 상태가 '처리 중(processing)'에 멈춰 있습니다. 혹시 단일 비디오 용량 제한이 있거나 원래 오랜 시간 처리가 걸리는 건가요?"),
      createdAt: daysAgo(28),
      replies: [
        { authorId: sarahMId, body: richBody("안녕하세요 Priya님! 단일 파일 크기가 2GB 이상인 대용량 비디오의 경우 클라우드 인코딩 처리 파이프라인 상 최대 72시간까지 연장 대기가 발생하더군요. 업로드하신 원본 비디오 크기가 어떻게 되시나요?"), createdAt: daysAgo(27) },
        { authorId: priyaMId, body: richBody("확인해 보니 녹화본 크기가 3.1GB였습니다. 역시 용량이 너무 컸던 탓이네요! 방금 들어가 보니 드디어 인코딩이 풀려 라이브로 업로드된 걸 확인했습니다. 서아님 조언 정말 감사합니다!"), createdAt: daysAgo(26) },
      ],
    },
    {
      catId: helpCatId, authorId: jamesMId, isPinned: false, isFeatured: false,
      title: '기능 건의: 이메일 요약 메신저(Digest)의 주기 세분화 필터 희망',
      body: richBody("현재 이메일 요약본 발송 주기는 전체 알림 끄기 아니면 전체 켜기만 제어되어 노이즈가 심합니다. 카테고리별로 필터링을 지원해서, 중요 긴급 공지사항은 즉시 메일로 받고 자유게시판 글은 매주 금요일에 묶음 요약본으로 받는 식의 디테일한 세팅이 가능했으면 합니다."),
      createdAt: daysAgo(20),
      replies: [
        { authorId: mayaMId, body: richBody("여기에 적극 1표 추가합니다! 자유게시판에 올라오는 수많은 소통 알림 메일 때문에 피로감을 느껴 아예 커뮤니티 알림을 모두 차단해 버리는 회원이 많아 심각하게 개편을 고민하고 있었습니다."), createdAt: daysAgo(19) },
        { authorId: adminMId, body: richBody("현장의 아픈 목소리가 담긴 아주 통찰력 있는 기능 개선 피드백 감사합니다! 해당 요구사항을 제품 로드맵 회의에 공식 보고했습니다. 아이디어 게시판에도 마침 유사 건의가 올라와 있으니 투표해 힘을 보태주세요!"), createdAt: daysAgo(19) },
        { authorId: tomMId, body: richBody("소식을 듣고 이미 투표를 완료했습니다. 이 기능은 사용자 경험(UX) 피로도를 낮추는 정말 훌륭한 게임 체인저 개선안입니다."), createdAt: daysAgo(18) },
      ],
    },
    {
      catId: helpCatId, authorId: tomMId, isPinned: false, isFeatured: false,
      title: '포럼 게시글 본문에 지식 베이스(KB) 문서를 카드로 예쁘게 노출하는 방법',
      body: richBody("스레드 게시글 본문에 유용한 지식 아티클 주소를 카피해서 넣었는데 그냥 밑줄 그어진 단조로운 텍스트 링크로만 렌더링되네요. 혹시 슬랙이나 타 서비스처럼 제목과 요약 미리보기가 구현된 풍부한 임베드 카드로 넣을 수 있나요?"),
      createdAt: daysAgo(12),
      replies: [
        { authorId: sarahMId, body: richBody("본문 에디터 상에서 `/embed` 또는 `/임베드` 커맨드를 치신 뒤 지식 베이스 문서의 전체 URL을 입력해 주시면 됩니다. 그러면 자동으로 문서 썸네일 제목과 핵심 요약 본문이 품위 있는 카드 박스 형태로 동적 변환됩니다."), createdAt: daysAgo(11) },
        { authorId: tomMId, body: richBody("설명해 주신 대로 해보니 정말 마법처럼 예쁜 연동 카드가 바로 완성되네요! 진작 알았다면 좋았을 텐데, 에디터 조작법에 관한 공식 사용자 지식 아티클이 있으면 유용할 것 같습니다!"), createdAt: daysAgo(11) },
      ],
    },
    {
      catId: helpCatId, authorId: guestMId, isPinned: false, isFeatured: false,
      title: '비로그인 또는 게스트(Guest) 회원도 시작 강좌(Course) 수강 신청이 가능할까요?',
      body: richBody("저는 현재 게스트 역할로 커뮤니티를 서핑 중입니다. 대시보드 강좌 목록에는 학습 가이드 코스가 정상적으로 나타나는데, 수강하기 버튼을 클릭하면 계속 권한 에러 팝업이 뜹니다. 원래 등급 제약이 걸려 있나요?"),
      createdAt: daysAgo(5),
      replies: [
        { authorId: adminMId, body: richBody("안녕하세요! 네, 기본 보안 구성 환경 하에 모든 온라인 클래스 강좌 등록 및 과제 진행은 최소 'member' 회원 이상 등급을 충족하셔야 합니다. 관리자님께 등급 승급을 요청해 보세요. 또는 운영자가 특정 입문 강좌에 한해서만 비회원/게스트에게 게이트를 전격 개방하도록 설정해 줄 수도 있습니다."), createdAt: daysAgo(4) },
        { authorId: guestMId, body: richBody("답변 확인했습니다! 명쾌하고 친절한 지원 답변 감사드립니다. 커뮤니티 관리자 채널을 찾아 등급 상향 조정을 급히 문의해 봐야겠습니다."), createdAt: daysAgo(4) },
      ],
    },
  ]

  const insertedThreadIds: string[] = []
  for (const t of threadDefs) {
    if (!t.catId) continue
    const [thread] = await db
      .insert(forumThreads)
      .values({
        tenantId: TENANT_ID,
        categoryId: t.catId,
        authorId: t.authorId,
        title: t.title,
        body: t.body,
        isPinned: t.isPinned,
        isFeatured: t.isFeatured,
        viewCount: Math.floor(Math.random() * 300) + 50,
        replyCount: t.replies.length,
        lastActivityAt: t.replies.length > 0 ? t.replies[t.replies.length - 1]!.createdAt : t.createdAt,
        createdAt: t.createdAt,
        status: 'open' as const,
      })
      .onConflictDoNothing()
      .returning({ id: forumThreads.id })

    if (!thread) continue
    insertedThreadIds.push(thread.id)

    // Insert the OP as a post
    const [opPost] = await db
      .insert(forumPosts)
      .values({
        tenantId: TENANT_ID,
        threadId: thread.id,
        authorId: t.authorId,
        body: t.body,
        depth: 0,
        createdAt: t.createdAt,
      })
      .onConflictDoNothing()
      .returning({ id: forumPosts.id })

    // Add a reaction to the OP
    if (opPost) {
      await db.insert(forumReactions).values({
        tenantId: TENANT_ID,
        postId: opPost.id,
        memberId: t.authorId === adminMId ? sarahMId : adminMId,
        emoji: '👍',
        createdAt: t.createdAt,
      }).onConflictDoNothing()
    }

    // Insert replies
    for (const r of t.replies) {
      await db
        .insert(forumPosts)
        .values({
          tenantId: TENANT_ID,
          threadId: thread.id,
          authorId: r.authorId,
          body: r.body,
          depth: 1,
          createdAt: r.createdAt,
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${insertedThreadIds.length} threads`)

  // -------------------------------------------------------------------------
  // Step 6: Ideas
  // -------------------------------------------------------------------------
  console.log('Creating ideas...')

  const ideaDefs = [
    {
      title: '다크 모드 테마 정식 지원',
      body: richBody('커뮤니티 플랫폼 전체에 다크 모드 테마 옵션을 추가해 주세요. 늦은 밤에 포럼 글을 읽거나 강좌를 시청하는 회원들이 많은데, 어두운 화면이 지원되면 눈의 피로를 크게 경감해 줄 것 같습니다.'),
      status: 'under_review' as const,
      voteCount: 47,
      category: 'UI/UX',
      tags: ['ui', '웹접근성', '테마'],
      authorId: alexMId,
      createdAt: daysAgo(55),
      comments: [
        { authorId: sarahMId, body: richBody('충분히 공감하는 귀중한 피드백입니다! 현재 디자인 기획 팀에서 이를 적극 검토 중이며, 올해 2분기 내로 시각적 검증을 마치고 베타 릴리스를 목표로 설계하고 있습니다.'), isOfficial: true, createdAt: daysAgo(40) },
        { authorId: mayaMId, body: richBody('사용자 OS 설정값에 따라 자동으로 연동되는 다크/라이트 테마 자동 감지(OS preferences) 옵션도 필히 연계되면 대단히 편리하겠습니다.'), isOfficial: false, createdAt: daysAgo(35) },
      ],
    },
    {
      title: 'Salesforce(세일즈포스) CRM 연동',
      body: richBody('자사 Salesforce CRM과의 강력한 양방향 동기화를 제안합니다. 예컨대 세일즈포스에서 고객사의 거래 조건이 성사/업그레이드되는 즉시 커뮤니티 회원 등급이 자동 전환되고, 어드민 프로필 화면 내에서 CRM 데이터가 일목요연하게 파악되면 관리 공수가 비약적으로 절감될 것 같습니다.'),
      status: 'planned' as const,
      voteCount: 38,
      category: 'Integrations',
      tags: ['salesforce', 'crm', '동기화'],
      authorId: mayaMId,
      createdAt: daysAgo(50),
      comments: [
        { authorId: adminMId, body: richBody('올해 3분기 공식 로드맵으로 반영되어 예정에 있습니다! 공식 Salesforce ISV 솔루션 파트너사와 전략 협력해 고도화된 사양으로 구현할 계획입니다. 사전에 찬성 표를 던져주신 분들께 클로즈드 베타 체험 혜택을 우선 부여하겠습니다.'), isOfficial: true, createdAt: daysAgo(30) },
        { authorId: jamesMId, body: richBody('꼭 필요한 기능입니다. 매주 수작업으로 두 시스템 간 회원 정보를 대조해 오던 저희 비즈니스 팀원들에게 엄청난 단비가 되겠네요.'), isOfficial: false, createdAt: daysAgo(28) },
        { authorId: tomMId, body: richBody('세일즈포스의 커스텀 오브젝트(Custom Object)까지 임의 매핑이 지원되나요, 아니면 표준 contacts/accounts 필드 수준으로만 수용이 되나요?'), isOfficial: false, createdAt: daysAgo(25) },
      ],
    },
    {
      title: '모바일 전용 네이티브 앱 출시 (iOS & Android)',
      body: richBody('커뮤니티 회원들을 위한 모바일 전용 앱이 지원되면 좋겠습니다. 현재 모바일 웹 브라우저 경험도 양호하나, 디바이스 네이티브 푸시 알림과 간편 생체 로그인, 오프라인 임시 저장 글 읽기가 받쳐준다면 커뮤니티 활성 지표와 리텐션이 엄청나게 도약할 것입니다.'),
      status: 'new' as const,
      voteCount: 82,
      category: 'Mobile',
      tags: ['모바일', 'ios', 'android', '푸시알림'],
      authorId: jamesMId,
      createdAt: daysAgo(48),
      comments: [
        { authorId: priyaMId, body: richBody('기업 등급의 B2B 대형 바이어 고객사분들이 미팅 시마다 늘 문의하는 가장 강력한 요구사항 중 하나입니다. 이것만 출시된다면 엔터프라이즈 단독 결제를 고려할 가치가 있습니다.'), isOfficial: false, createdAt: daysAgo(45) },
        { authorId: sarahMId, body: richBody('현재 React Native(리액트 네이티브) 프레임워크와 네이티브 킷 중 성능 최적화를 위한 저울질 검토 단계에 있습니다. 선호하는 디바이스나 특화 기능이 있으시다면 아래 토론을 이어나가 주세요!'), isOfficial: true, createdAt: daysAgo(42) },
        { authorId: alexMId, body: richBody('단일 코드베이스로 빠른 이터레이션을 발휘하기에는 역시 React Native가 독보적인 생산성을 내줄 것으로 강력 조언합니다.'), isOfficial: false, createdAt: daysAgo(40) },
      ],
    },
    {
      title: '커스텀 도메인 무상 결합 서비스',
      body: richBody('커뮤니티 플랫폼의 전체 서빙 주소를 자사의 독자적인 도메인 주소(예: community.yourbrand.com)로 완벽하게 바인딩하고, SSL 보안 인증서가 매끄럽게 자동 발급 및 갱신되도록 관리하는 기능을 제안합니다.'),
      status: 'shipped' as const,
      voteCount: 29,
      category: 'Branding',
      tags: ['도메인', '브랜딩', 'ssl'],
      authorId: priyaMId,
      createdAt: daysAgo(60),
      comments: [
        { authorId: adminMId, body: richBody('v2.1 버전에 성공적으로 이식이 완료되어 출시되었습니다! 대시보드 설정 > 커스텀 도메인 메뉴에서 DNS 설정 가이드를 보고 쉽게 연결하실 수 있으며, SSL은 Let\'s Encrypt를 통해 즉시 발급됩니다.'), isOfficial: true, createdAt: daysAgo(14) },
        { authorId: mayaMId, body: richBody('확인하고 바로 변경해 보았는데 5분 만에 전파까지 깔끔하게 끝났습니다. 브랜드 정체성을 유지하기에 최고의 연동 기능입니다!'), isOfficial: false, createdAt: daysAgo(13) },
      ],
    },
    {
      title: '엑셀 CSV 회원 리스트 대량 임포트 유틸리티',
      body: richBody('수백 수천 명의 회원을 한 번에 일괄 등록하고 엑셀 컬럼과 데이터베이스 필드를 가볍게 마우스로 매핑할 수 있는 CSV 파일 업로더를 희망합니다. 현재는 수작업으로 한 명씩 추가하거나 개발자가 API 연동 코드를 새로 빌드해 가동해야만 해서 불편합니다.'),
      status: 'new' as const,
      voteCount: 15,
      category: 'Administration',
      tags: ['대량업로드', 'csv', '회원추가', '어드민'],
      authorId: tomMId,
      createdAt: daysAgo(35),
      comments: [
        { authorId: jamesMId, body: richBody('저희 팀도 최근 사흘간 파이썬 일회성 코드를 짜서 간신히 회원을 집어넣었습니다. CSV 업로드 단추 하나만 있었어도 그 피로를 겪지 않았을 텐데요.'), isOfficial: false, createdAt: daysAgo(32) },
        { authorId: sarahMId, body: richBody('정말 큰 불편이었을 점 십분 인정합니다! 관련 사안을 어드민 최우선 개발 백로그 리스트에 정규 접수했습니다. 빠른 구현이 가능한 기능이므로 빠른 고도화 진행하겠습니다.'), isOfficial: true, createdAt: daysAgo(30) },
      ],
    },
    {
      title: 'Zapier(재피어) 연동 지원 모듈 출시',
      body: richBody('코딩 지식이 없는 일반 매니저도 OpenSourceCommunity 플랫폼을 슬랙, 지메일, 노션, 메일침프 등 타 비즈니스 툴과 즉각 자동 연동할 수 있도록 공식 Zapier 앱 출시를 제안합니다. 트리거: 신규 가입, 새 포럼 글, 건의 추천 투표 / 액션: 어드민 공지 대행, 신규 가입 자동 처리 등'),
      status: 'planned' as const,
      voteCount: 24,
      category: 'Integrations',
      tags: ['zapier', '자동화', '노코드'],
      authorId: mayaMId,
      createdAt: daysAgo(42),
      comments: [
        { authorId: adminMId, body: richBody('베타 버전 개발이 완료되어 현재 열려 있습니다! 설정 > 연동 > Zapier 경로에서 바로 이용해 보실 수 있으며, 올해 v2.2 배포와 함께 퍼블릭 마켓플레이스에 정식 등록될 예정입니다.'), isOfficial: true, createdAt: daysAgo(14) },
        { authorId: priyaMId, body: richBody('공지 듣고 즉각 이메일 발송 자동화 도구에 연결해 보았는데 딜레이 없이 한 방에 연계 성립 완료되었습니다. 10점 만점에 10점입니다!'), isOfficial: false, createdAt: daysAgo(12) },
        { authorId: alexMId, body: richBody('추후 댓글이나 답변글, 대화방 메시지 발생 건에 대해서도 이벤트 웹훅 트리거 범위가 세부 확장되기를 기대합니다.'), isOfficial: false, createdAt: daysAgo(10) },
      ],
    },
    {
      title: '엔터프라이즈 전용 대규모 API 호출 한도(Rate Limit) 확장',
      body: richBody('현재 분당 1000회의 기본 상한 제한은 대형 기업용 서비스 인프라에 현저히 모자랍니다. 저희는 약 5만 명 이상의 멤버 상태 동기화 배치를 아침마다 돌리고 있어 상시 제한 벽에 차단당합니다. 엔터프라이즈 급에서는 최소 분당 10,000회 상한 보장을 원합니다.'),
      status: 'new' as const,
      voteCount: 19,
      category: 'API',
      tags: ['api', '호출제한', '엔터프라이즈'],
      authorId: tomMId,
      createdAt: daysAgo(25),
      comments: [
        { authorId: adminMId, body: richBody('엔터프라이즈 요금제 가입 기업 고객사분들께는 요청 즉시 기술 전담팀을 통해 유연한 속도 제한 커스텀 오버라이드를 수동 부여하고 있습니다. 향후 어드민 UI에서 자유롭게 제어 가능한 실시간 대시보드도 신설 계획 중입니다.'), isOfficial: true, createdAt: daysAgo(22) },
        { authorId: alexMId, body: richBody('곧 릴리스 예정인 대량 리소스 일괄 처리(Bulk APIs) 계열 엔드포인트들을 개편 적용하셔도 단일 건당 리퀘스트 호출 빈도가 수십 분의 일 수준으로 획기적으로 낮아질 것입니다.'), isOfficial: false, createdAt: daysAgo(20) },
      ],
    },
    {
      title: '2단계 OTP 보안 인증 (2FA)',
      body: richBody('관리자 계정 해킹 및 데이터 도용 사고 예방을 위해 구글 일회용 패스워드(TOTP) 방식 등의 2단계 보안 인증 설정을 희망합니다. 대기업 영업 및 정보보호 관리체계 준수를 위한 최우선 1순위 필수 요구사항입니다.'),
      status: 'under_review' as const,
      voteCount: 31,
      category: 'Security',
      tags: ['보안', '2단계인증', 'totp', '엔터프라이즈'],
      authorId: jamesMId,
      createdAt: daysAgo(33),
      comments: [
        { authorId: sarahMId, body: richBody('현재 철저한 보안 규격 내부 심사 및 아키텍처 디자인 단계에 착수해 있습니다. 복잡한 복구 인증 UX 문제 등으로 사용자가 락아웃되지 않도록 세련된 동선을 고민하고 있습니다.'), isOfficial: true, createdAt: daysAgo(20) },
        { authorId: priyaMId, body: richBody('하드웨어 물리 보안 키(WebAuthn 규격) 또한 누락 없이 범용 지원해 주세요. 특정 하이테크 기업 파트너사 협업 시 강력한 하드 에센셜 규정입니다.'), isOfficial: false, createdAt: daysAgo(18) },
        { authorId: tomMId, body: richBody('하드웨어 키 적극 찬성합니다. FIDO2 통합 규격을 채택하면 TOTP 소프트웨어 앱과 생체 정보, 물리 키 모두가 모범적으로 대응 가능할 것으로 압니다.'), isOfficial: false, createdAt: daysAgo(15) },
      ],
    },
  ]

  const ideaIds: string[] = []
  for (const idea of ideaDefs) {
    const [inserted] = await db
      .insert(ideas)
      .values({
        tenantId: TENANT_ID,
        authorId: idea.authorId,
        title: idea.title,
        body: idea.body,
        status: idea.status,
        voteCount: idea.voteCount,
        category: idea.category,
        tags: idea.tags,
        createdAt: idea.createdAt,
      })
      .onConflictDoNothing()
      .returning({ id: ideas.id })

    if (!inserted) continue
    ideaIds.push(inserted.id)

    // Insert votes (distribute among members)
    const voters = [adminMId, sarahMId, alexMId, mayaMId, jamesMId, priyaMId, tomMId, guestMId]
    const voteCount = Math.min(idea.voteCount, voters.length)
    for (let i = 0; i < voteCount; i++) {
      await db
        .insert(ideaVotes)
        .values({
          tenantId: TENANT_ID,
          ideaId: inserted.id,
          memberId: voters[i]!,
          createdAt: daysAgo(Math.floor(Math.random() * 30) + 1),
        })
        .onConflictDoNothing()
    }

    // Insert comments
    for (const c of idea.comments) {
      await db
        .insert(ideaComments)
        .values({
          tenantId: TENANT_ID,
          ideaId: inserted.id,
          authorId: c.authorId,
          body: c.body,
          isOfficial: c.isOfficial,
          createdAt: c.createdAt,
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${ideaIds.length} ideas`)

  // -------------------------------------------------------------------------
  // Step 7: Events
  // -------------------------------------------------------------------------
  console.log('Creating events...')
  const allMembers = [adminMId, sarahMId, alexMId, mayaMId, jamesMId, priyaMId, tomMId, guestMId]

  const eventDefs = [
    {
      title: 'Q1 커뮤니티 킥오프 공식 모임 🚀',
      body: richBody('대망의 공식 첫 커뮤니티 킥오프 모임에 여러분을 초대합니다! 1분기 핵심 로드맵을 공개하고, 초기 참여 우수 회원들을 축하하며 실시간 현장 Q&A를 나눌 예정입니다. 실시간 참석을 못 하시는 분들을 위해 전체 녹화본도 제공됩니다.'),
      startsAt: daysAgo(90),
      endsAt: new Date(daysAgo(90).getTime() + 2 * 3600_000),
      timezone: 'Asia/Seoul',
      status: 'published' as const,
      location: { type: 'virtual', url: 'https://zoom.us/j/123456789' },
      tags: ['킥오프', '로드맵', 'Q1'],
      rsvpCount: 45,
      rsvpStatus: 'going' as const,
    },
    {
      title: '제품 로드맵 실시간 AMA (무엇이든 물어보세요) 🎤',
      body: richBody('제품 총괄 책임자(CPO)와 엔지니어링 리드들이 직접 출연하여 제품에 대한 여러분의 날카로운 질문에 실시간으로 답변해 드립니다. 사전 질문을 제출하시거나 행사 당일 자유롭게 챗으로 질문해 주세요. 슬라이드 없이 진솔한 대화로 채워집니다.'),
      startsAt: daysAgo(30),
      endsAt: new Date(daysAgo(30).getTime() + 90 * 60_000),
      timezone: 'Asia/Seoul',
      status: 'published' as const,
      location: { type: 'virtual', url: 'https://zoom.us/j/987654321' },
      tags: ['ama', '로드맵', '제품기획'],
      rsvpCount: 67,
      rsvpStatus: 'going' as const,
    },
    {
      title: '2026 오프라인 여름 밋업 & 네트워킹 ☀️',
      body: richBody('커뮤니티 회원들과 직접 대면하는 첫 오프라인 밋업 행사입니다! 현장에 오지 못하시는 분들을 위해 버추얼 라이브 송출도 병행합니다. 라이트닝 토크, 자유 네트워킹, 미공개 차세대 기능들의 실시간 시연이 준비되어 있습니다. 다과와 음료가 무상 제공됩니다.'),
      startsAt: daysFromNow(60),
      endsAt: new Date(daysFromNow(60).getTime() + 4 * 3600_000),
      timezone: 'Asia/Seoul',
      status: 'published' as const,
      location: { type: 'hybrid', address: '서울특별시 강남구 테헤란로 스타트업 허브 2층', url: 'https://zoom.us/j/555666777' },
      tags: ['밋업', '오프라인', '네트워킹'],
      rsvpCount: 23,
      rsvpStatus: 'going' as const,
    },
    {
      title: '고급 API 연동 마스터클래스 워크숍 💻',
      body: richBody('OpenSourceCommunity API를 극한까지 활용하고 싶은 개발자분들을 위한 실무 밀착형 워크숍입니다. 웹훅 설계, 대량 회원 일괄 동기화(Bulk API), 세부 권한 매핑, 실시간 이벤트 구독을 직접 함께 구현해 봅니다. 개인 노트북을 꼭 지참해 주세요!'),
      startsAt: daysFromNow(90),
      endsAt: new Date(daysFromNow(90).getTime() + 3 * 3600_000),
      timezone: 'Asia/Seoul',
      status: 'published' as const,
      location: { type: 'in-person', address: '서울특별시 마포구 백범로 개발자 협회 세미나실 302호' },
      capacity: 30,
      tags: ['워크숍', 'api', '개발자자습', '오프라인'],
      rsvpCount: 8,
      rsvpStatus: 'going' as const,
    },
  ]

  for (const e of eventDefs) {
    const [evt] = await db
      .insert(events)
      .values({
        tenantId: TENANT_ID,
        creatorId: adminMId,
        title: e.title,
        body: e.body,
        location: e.location,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        timezone: e.timezone,
        status: e.status,
        capacity: (e as any).capacity ?? null,
        tags: e.tags,
        createdAt: new Date(e.startsAt.getTime() - 14 * 86_400_000),
      })
      .onConflictDoNothing()
      .returning({ id: events.id })

    if (!evt) continue

    // Add RSVPs from members we have
    const rsvpMembers = allMembers.slice(0, Math.min(e.rsvpCount, allMembers.length))
    for (const mId of rsvpMembers) {
      await db
        .insert(eventRsvps)
        .values({
          tenantId: TENANT_ID,
          eventId: evt.id,
          memberId: mId,
          status: e.rsvpStatus,
          createdAt: new Date(e.startsAt.getTime() - 7 * 86_400_000),
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${eventDefs.length} events`)

  // -------------------------------------------------------------------------
  // Step 8: Courses
  // -------------------------------------------------------------------------
  console.log('Creating courses...')

  const courseDefs = [
    {
      title: '오픈소스 커뮤니티 플랫폼 시작 가이드',
      description: '오픈소스 커뮤니티 플랫폼을 성공적으로 활성화하고 구축하는 데 필요한 A to Z 실무 코스입니다. 회원 온보딩 설계, 역할/권한 세팅, 핵심 모듈 관리법 및 가입 초기 30일 활성화 공식 플레이북을 마스터해 보세요.',
      status: 'published' as const,
      enrollmentCount: 156,
      lessons: [
        {
          title: '기본 설정 및 브랜드 세팅',
          sortOrder: 1,
          durationMinutes: 12,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>오픈소스 커뮤니티 플랫폼에 오신 것을 환영합니다</h2><p>본 강의에서는 커뮤니티 가동을 위한 초기 설정(브랜딩, 커스텀 도메인 매핑, 초기 파운더 초청법)을 단계별로 같이 밟아 나갑니다.</p><ol><li><strong>설정 &gt; 일반</strong> 메뉴로 이동하여 로고와 기본 이미지를 업로드하세요.</li><li>브랜드 정체성에 맞는 기본 색상(Primary Brand Color)을 지정합니다.</li><li><strong>설정 &gt; 커스텀 도메인</strong> 메뉴에서 전용 도메인을 등록해 신뢰감을 높입니다.</li></ol><p>기본 설정이 끝나면 <strong>멤버 &gt; 초대</strong> 메뉴에서 초기 파운더 사용자들을 가입시켜 보세요.</p>' }] }] },
        },
        {
          title: '역할 정의와 세부 권한 매핑 이해',
          sortOrder: 2,
          durationMinutes: 8,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>역할 & 권한 관리</h2><p>플랫폼에는 기본적으로 <strong>org_admin(소유자)</strong>, <strong>moderator(조정자)</strong>, <strong>member(정회원)</strong>, <strong>guest(게스트)</strong> 네 가지 내장 역할이 주어집니다. 비즈니스 요구에 맞춰 얼마든지 세분화된 커스텀 역할도 무한 생성할 수 있습니다.</p><p>커스텀 역할을 영리하게 활용하여 등급별 콘텐츠 접근을 통제해 보세요. 예컨대 "프로 멤버" 전용 특수 역할을 가진 정회원에게만 고품격 유료 코스나 기밀 토론 포럼 스페이스가 열리게끔 쉽게 락을 걸 수 있습니다.</p>' }] }] },
        },
        {
          title: '비즈니스 목적에 따른 핵심 기능 모듈 활성화',
          sortOrder: 3,
          durationMinutes: 10,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>핵심 기능 모듈 제어</h2><p>우리 커뮤니티의 모든 개별 핵심 기능(포럼, 아이디어 건의, 이벤트, 강좌 코스, 웨비나, 지식 베이스, 소셜 인텔리전스 등)은 하나의 모듈 단위로 완전히 쪼개져 있습니다. <strong>설정 &gt; 모듈</strong> 메뉴에서 현재 비즈니스 성장에 가장 꼭 필요한 모듈만 직관적으로 ON/OFF 하실 수 있습니다.</p><p>실무 팁: 초기 론칭 시에는 티켓 감소 및 지식 아카이빙 극대화를 위해 포럼과 지식 베이스(KB) 모듈만 켜서 단단하게 다지세요. 그 후 충성 활성 회원이 50명을 돌파하는 시점에 아이디어 건의와 이벤트를 추가 오픈하시는 것이 운영 리스크 분산에 유리합니다.</p>' }] }] },
        },
        {
          title: '론칭 초기 30일: 활성화 플레이북 공식 전략',
          sortOrder: 4,
          durationMinutes: 15,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>초기 30일 론칭 성공 플레이북</h2><p>처음 30일 동안의 분위기가 커뮤니티의 장기적인 리텐션과 명운을 결정합니다. 실제 수많은 우수 커뮤니티에서 검증된 주차별 실무 지침서입니다:</p><ul><li><strong>1주차:</strong> 사내 서포터즈 및 핵심 파워 유저 20-30명을 초대하고, 유인용 질문 스레드 5개를 정성 들여 선제 구축합니다.</li><li><strong>2주차:</strong> 가벼운 실시간 입문 환영 라이브 웨비나를 개최해 심리적 장벽을 허눕니다.</li><li><strong>3주차:</strong> 자주 묻는 질문 중심의 양질의 지식문서(KB) 3개를 공식 발행합니다.</li><li><strong>4주차:</strong> 사은품이 걸린 첫 아이디어 건의 캠페인을 가동해 대규모 추천 투표를 유도합니다.</li></ul><p>이 성공 공식을 정밀 준수하여 안착한 커뮤니티는 그렇지 않은 곳 대비 90일 차 리텐션율이 3배 이상 압도적으로 높았습니다.</p>' }] }] },
        },
      ],
    },
    {
      title: 'OpenSourceCommunity API를 활용한 맞춤형 연동 가이드',
      description: '개발자들을 위한 심도 있는 기술 연동 코스입니다. 웹훅 구조, 대량 배치 임포트 API, 커스텀 권한 매핑, 실시간 비동기 이벤트 스트림을 활용해 자사의 CRM이나 협업 사내 도구들과 매끄럽게 연결해 보세요.',
      status: 'published' as const,
      enrollmentCount: 43,
      lessons: [
        {
          title: 'API 인증 메커니즘 & 호출 횟수 제한(Rate Limits)',
          sortOrder: 1,
          durationMinutes: 10,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>API 인증 가이드</h2><p>모든 API 리퀘스트는 Authorization 헤더에 Bearer 토큰 인증 정보를 담아 수신되어야 합니다. API 토큰 키는 <strong>설정 &gt; API 키</strong>에서 안전하게 발급하실 수 있습니다. 안전한 서버사이드 데이터 변경 목적에는 service-role 키를, 클라이언트 단의 제한적 처리에는 restricted 키를 가려 발급하세요.</p><h2>호출 속도 한도</h2><p>기본 상한선: 정회원 계정 요금제 분당 1000회, 엔터프라이즈 요금제 분당 5000회 제한입니다. API 응답 헤더 내 <code>X-RateLimit-Remaining</code> 필드를 모니터링하여 가용 쿼타를 수시로 체크하세요. <code>/members/bulk</code> 대량 배치 엔드포인트는 한 번에 수십 수백 명의 레코드를 묶어 처리하더라도 오직 단 1회의 API 호출 횟수로만 차감 산정되므로 매우 유용합니다.</p>' }] }] },
        },
        {
          title: '웹훅(Webhooks): 실시간 비동기 이벤트 스트리밍',
          sortOrder: 2,
          durationMinutes: 14,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>실시간 웹훅 연동</h2><p><strong>설정 &gt; 웹훅</strong> 메뉴에서 알림을 수신할 외부 엔드포인트를 간편 등록할 수 있습니다. 각 웹훅 등록 시 서명 대조용 고유 비밀번호(Signing Secret)가 매칭되어 발송되므로, 수신 서버 핸들러에서 안전한 데이터 수렴을 위해 헤더 내 <code>X-UC-Signature</code> 시그니처 값을 반드시 자체 검증하는 로직을 삽입하세요. 지원 이벤트: <code>member.created</code>, <code>member.updated</code>, <code>thread.created</code>, <code>idea.voted</code> 등을 비롯한 20종 이상의 풍부한 이벤트를 지원합니다.</p><p>수신 핸들러 구축 시 네트워크 유실 대응을 위해, 중복 처리 방지(Idempotency Key) 로직을 연계하여 재전송 요청을 누수 없이 견고하게 핸들링하도록 설계하십시오.</p>' }] }] },
        },
        {
          title: 'CRM 동기화 설계 패턴: Salesforce & HubSpot 실무',
          sortOrder: 3,
          durationMinutes: 18,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>CRM 통합 아키텍처 패턴</h2><p>실제 엔터프라이즈 환경에서 가장 보편적으로 구사되는 핵심 아키텍처 설계 패턴입니다. CRM 내부에서 특정 거래 딜 등급이 낙찰/변경되는 시점에 커뮤니티 회원의 혜택 권한 등급을 실시간 연동하는 정석 플로우입니다:</p><ol><li>고객사 구독 단계가 승급되며 CRM 웹훅이 트리거를 감지해 발송함.</li><li>자사 미들웨어 수신단이 고객 이메일을 키값으로 커뮤니티의 해당 사용자 계정을 자동 조회함.</li><li>조회 결과를 토대로 PATCH /members/:id API를 찔러 바뀐 회원 역할 및 부가 메타데이터를 즉시 갱신함.</li><li>해당 유저가 커뮤니티 브라우저 새로고침을 할 필요도 없이 실시간으로 잠겨있던 스페이스 락이 해제됨.</li></ol><p>개발 공수가 일절 필요 없는 HubSpot 및 Salesforce용 정식 Native 패키지 연동 앱을 기본 탑재하고 있어 마우스 클릭 한 번만으로 즉시 구동도 가능합니다.</p>' }] }] },
        },
      ],
    },
  ]

  for (const course of courseDefs) {
    const [insertedCourse] = await db
      .insert(courses)
      .values({
        tenantId: TENANT_ID,
        creatorId: adminMId,
        title: course.title,
        description: course.description,
        status: course.status,
        requiresEnrollment: true,
        createdAt: daysAgo(45),
      })
      .onConflictDoNothing()
      .returning({ id: courses.id })

    if (!insertedCourse) continue

    const lessonIds: string[] = []
    for (const lesson of course.lessons) {
      const [insertedLesson] = await db
        .insert(courseLessons)
        .values({
          tenantId: TENANT_ID,
          courseId: insertedCourse.id,
          title: lesson.title,
          body: lesson.body,
          sortOrder: lesson.sortOrder,
          durationMinutes: lesson.durationMinutes,
          isPublished: true,
          createdAt: daysAgo(44),
        })
        .onConflictDoNothing()
        .returning({ id: courseLessons.id })
      if (insertedLesson) lessonIds.push(insertedLesson.id)
    }

    // Enroll existing members (all 8 of them)
    for (const mId of allMembers) {
      const isCompleted = Math.random() > 0.4
      await db
        .insert(courseEnrollments)
        .values({
          tenantId: TENANT_ID,
          courseId: insertedCourse.id,
          memberId: mId,
          status: isCompleted ? 'completed' : 'enrolled',
          completedLessonIds: isCompleted ? lessonIds : lessonIds.slice(0, Math.floor(Math.random() * lessonIds.length)),
          completedAt: isCompleted ? daysAgo(Math.floor(Math.random() * 20) + 1) : null,
          createdAt: daysAgo(Math.floor(Math.random() * 30) + 10),
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${courseDefs.length} courses`)

  // -------------------------------------------------------------------------
  // Step 9: Webinars
  // -------------------------------------------------------------------------
  console.log('Creating webinars...')

  const webinarDefs = [
    {
      title: '커뮤니티 주도 성장(CLG) 최고 권위 마스터클래스 🏆',
      description: '커뮤니티 플랫폼을 최고의 비즈니스 레버리지 성장 동력으로 삼는 실무 방법론을 90분 동안 완벽히 마스터합니다. 단 1년 만에 제로에서 10,000명의 액티브 활성 회원을 달성한 유니콘 기업들의 성공 비결과 사례 집중 해부.',
      scheduledAt: daysAgo(60),
      durationMinutes: 90,
      status: 'ended' as const,
      recordingUrl: 'https://example.com/recordings/community-led-growth',
      registrationCount: 234,
    },
    {
      title: '비즈니스 연동 쇼케이스: 내 모든 업무 도구 연결하기',
      description: '현장에서 널리 쓰이는 주요 대표 툴 6개(Salesforce, HubSpot, Zendesk, Slack, Zapier, Stripe)와의 실시간 라이브 연동 작동 시연. 연동 기술 전문 설계 팀원들과의 실시간 라이브 Q&A 소통 시간.',
      scheduledAt: daysAgo(20),
      durationMinutes: 60,
      status: 'ended' as const,
      recordingUrl: 'https://example.com/recordings/integration-showcase',
      registrationCount: 89,
    },
    {
      title: '2026 차세대 플랫폼 제품 로드맵 대공개 라이브 📢',
      description: 'CEO와 수석 제품 담당 팀원들이 총출동하여 2026년 차세대 모바일 네이티브 앱 출시일정, 강력한 소셜 인텔리전스 AI 신기능, 엔터프라이즈 보안 강화 공표를 실시간 공유해 드립니다. 절대 놓치지 마세요!',
      scheduledAt: daysFromNow(42),
      durationMinutes: 75,
      status: 'scheduled' as const,
      recordingUrl: null,
      registrationCount: 312,
    },
  ]

  for (const webinar of webinarDefs) {
    const [insertedWebinar] = await db
      .insert(webinars)
      .values({
        tenantId: TENANT_ID,
        creatorId: adminMId,
        title: webinar.title,
        description: webinar.description,
        speakerIds: [adminMId, sarahMId],
        scheduledAt: webinar.scheduledAt,
        durationMinutes: webinar.durationMinutes,
        status: webinar.status,
        recordingUrl: webinar.recordingUrl,
        maxAttendees: 500,
        viewCount: webinar.status === 'ended' ? Math.floor(Math.random() * 200) + 50 : 0,
        createdAt: new Date(webinar.scheduledAt.getTime() - 21 * 86_400_000),
      })
      .onConflictDoNothing()
      .returning({ id: webinars.id })

    if (!insertedWebinar) continue

    // Register all members
    for (const mId of allMembers) {
      await db
        .insert(webinarRegistrations)
        .values({
          tenantId: TENANT_ID,
          webinarId: insertedWebinar.id,
          memberId: mId,
          attendedAt: webinar.status === 'ended' ? webinar.scheduledAt : null,
          createdAt: new Date(webinar.scheduledAt.getTime() - 7 * 86_400_000),
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${webinarDefs.length} webinars`)

  // -------------------------------------------------------------------------
  // Step 10: Knowledge Base
  // -------------------------------------------------------------------------
  console.log('Creating knowledge base...')

  const kbCatDefs = [
    { name: '시작하기', slug: 'getting-started', description: '가입 첫날부터 커뮤니티를 성공적으로 론칭하기 위해 필요한 온보딩 핵심 가이드.', sortOrder: 0 },
    { name: '연동 가이드', slug: 'integrations', description: 'OpenSourceCommunity와 자사 협업 비즈니스 업무 툴(CRM, 슬랙 등) 연결 방법.', sortOrder: 1 },
    { name: '시스템 관리', slug: 'administration', description: '멤버 권한 관리, 커스텀 역할 생성 및 플랫폼 보안 설정 설명.', sortOrder: 2 },
  ]

  for (const cat of kbCatDefs) {
    await db
      .insert(kbCategories)
      .values({ tenantId: TENANT_ID, ...cat, createdAt: daysAgo(50) })
      .onConflictDoNothing()
  }

  const allKbCats = await db
    .select({ id: kbCategories.id, slug: kbCategories.slug })
    .from(kbCategories)
    .where(eq(kbCategories.tenantId, TENANT_ID))

  const kbCatMap: Record<string, string> = {}
  for (const c of allKbCats) kbCatMap[c.slug] = c.id

  const kbArticleDefs = [
    {
      catSlug: 'getting-started',
      title: '빠른 시작 가이드: 15분 만에 첫 커뮤니티 론칭하기',
      slug: 'quick-start',
      excerpt: '단 15분 만에 내 브랜드 커뮤니티 서비스를 실시간으로 가동하기 위한 전체 실무 퀵 가이드.',
      tags: ['초기세팅', '온보딩'],
      helpfulCount: 142,
      viewCount: 1820,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>퀵 스타트 가이드</h2><p>환영합니다! 본 가이드는 15분 이내에 커뮤니티를 성공적으로 개설하고 라이브 상태로 전파하는 최단 동선을 다룹니다.</p><h3>1단계: 테넌트 계정 생성</h3><p>app.opensourcecommunity.io 포털에서 회원가입을 마치세요. 초기 커뮤니티 고유 URL은 기본적으로 <code>yourslug.opensourcecommunity.io</code> 형식으로 자동 세팅됩니다.</p><h3>2단계: 브랜드 기본 테마 설정</h3><p>어드민 설정 &gt; 일반 탭으로 이동하세요. 고해상도 로고 이미지(권장: 200x200px PNG)를 등록하고, 기업의 대표 색상(Primary Brand Color)을 조율한 뒤 따뜻한 첫 환영 인사말을 입력합니다.</p><h3>3단계: 필요 모듈 활성화</h3><p>설정 &gt; 모듈 메뉴에서 원하는 기능 슬롯을 켜세요. 첫 시작 시에는 가장 활발한 소통과 정보 아카이빙을 돕는 포럼과 지식 베이스(KB) 모듈 탑재를 권장합니다.</p><h3>4단계: 초기 멤버 초대</h3><p>멤버 &gt; 초대 탭에서 동료 직원이나 충성 유저 5-10명을 선정해 초대장을 보냅니다. 이들은 첫 토론 스레드를 윤택하게 채워줄 파운더 그룹이 됩니다.</p><h3>5단계: 씨앗 콘텐츠 업로드</h3><p>첫 포럼 카테고리를 개설하고 따뜻한 어조의 공식 가입 환영 스레드를 작성해 보세요. 신규 회원들이 접속하자마자 바로 볼 수 있도록 공지로 고정(Pin)해 둡니다.</p><p>축하합니다 — 이제 여러분의 멋진 브랜드 커뮤니티가 완전히 살아 숨 쉬기 시작했습니다!</p>' }] }] },
    },
    {
      catSlug: 'getting-started',
      title: '커뮤니티 회원 라이프사이클의 정석 이해',
      slug: 'member-lifecycle',
      excerpt: '사용자가 초대 단계를 거쳐 온보딩하고, 활성 활동을 벌이다 졸업하는 전체 라이프사이클 구조 분석.',
      tags: ['멤버관리', '생애주기', '온보딩'],
      helpfulCount: 87,
      viewCount: 940,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>회원 라이프사이클(Lifecycle)</h2><p>커뮤니티에 합류하는 모든 사용자는 다음 4가지 핵심 유기적 단계로 움직입니다:</p><ol><li><strong>초대됨(Invited)</strong> — 초대 이메일 발송 완료 상태이나, 아직 가입 수락 버튼을 누르지 않은 상태입니다.</li><li><strong>온보딩(Onboarding)</strong> — 계정은 생성했으나 아직 프로필 사진을 등록하지 않았거나 첫 글 작성을 완료하지 않은 극초기 상태입니다. 이 시점에 웰컴 다이렉트 메시지(DM)를 발송하고 가장 흥미로운 추천 링크를 연결해 주어야 이탈률이 낮아집니다.</li><li><strong>활성(Active)</strong> — 정기적으로 플랫폼을 방문해 소통하는 정상 활성 단계입니다. 유저 테이블 내 <code>lastActiveAt</code> 타임스탬프 필드를 활용해 이들의 접속 주기를 추적하세요.</li><li><strong>휴면(Churned)</strong> — 지난 90일 이상 일절 접속 기록이 없는 이탈 회원입니다. API 웹훅과 자동 메일링 시스템을 연동해 가벼운 컴백 유도 이메일을 발송해 재활성화를 시도해 보세요.</li></ol><p>메타데이터 필드를 유연하게 커스텀하여 자사 비즈니스 모델에 특화된 고유 생애주기 지표를 직접 정의할 수도 있습니다.</p>' }] }] },
    },
    {
      catSlug: 'getting-started',
      title: '포럼 카테고리 구성 전략 및 권한 설계 가이드',
      slug: 'forum-categories',
      excerpt: '활발하고 정돈된 대화 흐름을 유도하는 이상적인 게시판 레이아웃 수립 전략.',
      tags: ['포럼게시판', '카테고리', '권한세팅'],
      helpfulCount: 64,
      viewCount: 710,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>게시판 카테고리 설계 모범 사례</h2><p>정연하게 구조화된 카테고리 배치는 활발한 소통이 일어나는 포럼의 척도입니다. 성공적인 B2B B2C 브랜드 커뮤니티들이 보편적으로 채택하는 입증된 구조입니다:</p><ul><li><strong>공지사항 (Announcements)</strong> — 관리자(Admin) 그룹만 글을 쓸 수 있고, 모든 회원은 정독만 가능한 핵심 카테고리입니다. 이 스페이스는 상단에 공지 고정해 둡니다.</li><li><strong>자유 토론 (General Discussion)</strong> — 모든 회원이 자유롭게 질의응답을 올리고 노하우를 나눕니다. 일상 잡담부터 실무 팁까지 아우르는 메인 광장입니다.</li><li><strong>제품 피드백 (Product Feedback)</strong> — 정규 건의 제안으로 넘어가기 전, 가볍게 기능에 대한 아이디어 브레인스토밍을 나누는 인큐베이터입니다.</li><li><strong>나의 활용사례 공유 (Show & Tell)</strong> — 사용자들이 자사 솔루션을 어떻게 기발하게 사용하고 있는지 자랑하는 코너입니다. 최고의 영업 레퍼런스가 될 고객 성공 사례가 여기서 발굴됩니다.</li></ul><h3>카테고리 노출 등급 세팅</h3><p>대부분의 채널은 기본 정회원(members) 등급이 읽을 수 있게 노출하되, 엔터프라이즈 전담 VIP 스페이스나 개발자 기밀 소통방은 특정 커스텀 역할을 부여해 노출을 격리 설계하세요.</p>' }] }] },
    },
    {
      catSlug: 'integrations',
      title: 'Zapier 연동을 통한 무코드 업무 자동화 가이드',
      slug: 'zapier-integration',
      excerpt: '단 한 줄의 백엔드 코딩 없이 5000개 이상의 외부 앱과 커뮤니티를 유기적으로 자동화하는 방법.',
      tags: ['재피어', '업무자동화', '노코드'],
      helpfulCount: 93,
      viewCount: 1150,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>재피어(Zapier) 노코드 연동</h2><p>공식 Zapier 앱을 활용하면 백엔드 API 코딩 지식이 전무하더라도 커뮤니티 데이터를 슬랙, 세일즈포스, 노션, 메일침프 등 5000개 이상의 유수 업무 도구와 다이렉트로 결합할 수 있습니다.</p><h3>시작하기</h3><ol><li>어드민 대시보드 <strong>설정 &gt; 연동 &gt; Zapier</strong> 탭으로 이동합니다.</li><li><strong>Zapier 연결하기</strong> 단추를 클릭해 API Oauth 권한 승인을 완료합니다.</li><li>재피어 포털로 로그인하여 새 Zap을 만들고 서비스 검색창에 "OpenSourceCommunity"를 찾습니다.</li></ol><h3>가용한 연동 트리거(Triggers)</h3><ul><li>신규 회원 가입 완료 시</li><li>새 포럼 스레드 글 등록 시</li><li>신규 아이디어 건의서 제출 시</li><li>특정 회원 등급/역할 변동 시</li></ul><h3>가용한 연동 액션(Actions)</h3><ul><li>새로운 멤버 강제 생성</li><li>지정한 멤버의 역할 변경</li><li>공식 공지사항 글 자동 발행</li><li>외부 슬랙 채널로 커뮤니티 알림 전송</li></ul><p>인기 템플릿 예시: HubSpot CRM에서 거래가 \'성공(Won)\'으로 바뀌는 순간, 해당 고객을 커뮤니티 Pro 멤버 역할로 백그라운드에서 자동 가입시킵니다.</p>' }] }] },
    },
    {
      catSlug: 'integrations',
      title: '실시간 이벤트 연동 웹훅(Webhooks) 개발 기술 가이드',
      slug: 'webhook-reference',
      excerpt: '플랫폼 내부에서 발생하는 모든 상태 이벤트를 실시간 JSON 스트림으로 수신 및 처리하는 방법.',
      tags: ['웹훅', '개발자자료', 'api연동'],
      helpfulCount: 78,
      viewCount: 890,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>웹훅(Webhooks) 연동 개발 명세</h2><p>웹훅을 사용하면 커뮤니티 내에서 특정 사건이 발생하는 즉시 자사 백엔드 웹 서버로 구조화된 JSON 데이터 페이로드를 전달받을 수 있습니다.</p><h3>보안 검증 정책</h3><p>모든 웹훅 전송 건은 HTTP 헤더에 <code>X-UC-Signature</code> 서명 해시를 동반합니다. 유출을 대비해 자사 서버 수신 로직 상에서 발급받은 Webhook Secret 키를 사용해 HMAC-SHA256 해시 암호 검증을 무조건 선행해 주십시오. 서명 대조가 생략된 핸들러는 보안 위협에 노출됩니다.</p><h3>핵심 이벤트 규격</h3><ul><li><code>member.created</code> — 신규 회원 가입 발생</li><li><code>member.updated</code> — 멤버의 프로필 정보나 권한 등급이 갱신됨</li><li><code>thread.created</code> — 새 토론 게시글이 포럼에 올라옴</li><li><code>post.created</code> — 특정 게시글에 신규 답변/댓글이 등록됨</li><li><code>idea.created</code> — 새로운 아이디어 피드백 제안서 등록</li><li><code>idea.voted</code> — 특정 아이디어에 추천 투표가 찍힘</li><li><code>event.rsvp</code> — 오프라인 모임에 누군가 참가 신청(RSVP)함</li><li><code>webinar.registered</code> — 실시간 라이브 세미나 신청 완료</li></ul><h3>장애 재시도 정책</h3><p>자사 서버 일시 다운 등으로 웹훅 응답이 실패(Non-2xx)할 경우, 시스템은 지수 백오프(1초, 5초, 30초, 5분, 30분 간격) 형태로 최대 5회까지 자동 복구 재전송을 가동합니다.</p>' }] }] },
    },
    {
      catSlug: 'integrations',
      title: 'HubSpot CRM 고객 양방향 동기화 가이드',
      slug: 'hubspot-sync',
      excerpt: 'HubSpot 영업 리드 고객 데이터와 커뮤니티 멤버 데이터를 코딩 없이 양방향 정밀 매핑하는 방법.',
      tags: ['허브스팟', 'crm연동', '고객동기화'],
      helpfulCount: 55,
      viewCount: 620,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>HubSpot CRM 양방향 연동</h2><p>HubSpot 연동 솔루션을 활성화하면 플랫폼의 멤버 리스트와 HubSpot의 연락처(Contacts) 리포트를 실시간 양방향으로 완벽 싱크합니다. CRM에서 딜이 최종 클로즈되면 고객에게 자동으로 환영 커뮤니티 초대장이 발송되며, 플랫폼에서 휴면 전환된 유저는 CRM 연락처 속성에 자동으로 휴면 태그가 마킹됩니다.</p><h3>설정 절차</h3><ol><li>어드민 대시보드 <strong>설정 &gt; 연동 &gt; HubSpot</strong> 메뉴로 진입합니다.</li><li><strong>HubSpot 연동</strong> 버튼을 눌러 공식 OAuth 로그인 인증을 마칩니다.</li><li>필드 매핑 탭에서 대조할 연락처 필드를 잇습니다. (이메일 주소가 항상 핵심 매핑 고유 키가 됩니다)</li><li>동기화 조건 정의: 세일즈 파이프라인의 어느 딜 단계(Deal Stage)가 도달했을 때 멤버 계정을 생성할지 설정합니다.</li></ol><h3>속성 동기화 세부 필드</h3><p>HubSpot의 임의의 커스텀 연락처 속성(Property) 값을 커뮤니티 유저 테이블의 메타데이터 필드에 1:1로 맞출 수 있습니다. 예컨대 Company 속성은 회사 정보에, Lifecycle Stage는 회원 등급에 매칭이 수월합니다.</p>' }] }] },
    },
    {
      catSlug: 'administration',
      title: '멤버 역할 구성과 커스텀 권한 세부 관리법',
      slug: 'roles-and-permissions',
      excerpt: '어드민, 조정자, 정회원, 게스트 등 플랫폼이 제공하는 모든 권한 설정 체계 백과사전.',
      tags: ['역할관리', '어드민권한', '보안통제'],
      helpfulCount: 108,
      viewCount: 1340,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>회원 역할 및 세부 권한 매뉴얼</h2><h3>기본 제공 핵심 역할</h3><ul><li><strong>org_admin(소유자)</strong> — 요금제 결제 정보, API 토큰 키 발급, 시스템 전체 파라미터 설정을 포함한 절대적 마스터 권한을 가집니다.</li><li><strong>moderator(조정자)</strong> — 음란 스팸 글 검열 삭제, 회원 차단, 강제 스레드 고정 등 내부 콘텐츠 유지를 전담하되 민감한 결제나 시스템 연동 설정에는 접근 불가합니다.</li><li><strong>member(정회원)</strong> — 포럼 게시글 및 댓글 작성, 대화 참여, 강좌 수강, 건의 추천 등 커뮤니티의 모든 핵심 활동을 영위하는 가장 보편적인 등급입니다.</li><li><strong>guest(게스트)</strong> — 가입하지 않고 공개로 설정된 일반 포럼 글과 백과사전 문서만 조회할 수 있는 읽기 전용 상태입니다.</li></ul><h3>커스텀 역할 무한 생성</h3><p><strong>설정 &gt; 역할 관리</strong> 메뉴에서 기업 비즈니스 고유의 임의 역할을 생성할 수 있습니다. 예컨대 `forum.post`, `forum.moderate`, `kb.edit`, `events.create` 등의 마이크로 권한들을 슬라이더 단추로 쉽게 인가하여 VIP 파트너 전용 임시 서브 어드민 등을 배정 가능합니다.</p><h3>API 대량 일괄 역할 업데이트</h3><p><code>PATCH /members/bulk</code> 엔드포인트에 대상 회원 UUID 리스트 배열과 변경하고자 하는 역할명을 담아 JSON 호출하면, 한 번에 수천 명의 회원 권한 등급을 순식간에 승급시킬 수 있습니다.</p>' }] }] },
    },
    {
      catSlug: 'administration',
      title: '감사 로그(Audit Logs)를 활용한 플랫폼 보안 관리',
      slug: 'audit-log',
      excerpt: '관리자의 모든 시스템 조작 내역을 변경할 수 없는 원장 기록으로 보존하고 모니터링하기.',
      tags: ['감사로그', '시스템보안', '규제준수'],
      helpfulCount: 42,
      viewCount: 480,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>시스템 감사 로그(Audit Log)</h2><p>Every admin action in OpenSourceCommunity is recorded in the immutable audit log. Access it under <strong>Settings &gt; Audit Log</strong>.</p><h3>추적 대상 활동 범위</h3><ul><li>멤버 역할 강제 승급 및 강등 내역</li><li>게시글 강제 블라인드 처리 및 복구 내역</li><li>시스템 기본 메인 테마 색상 및 일반 설정 변경 내역</li><li>외부 연동 키(Zapier, CRM 등)의 연결 및 해제 정보</li><li>API 토큰 키 신규 발행 및 강제 만료(Revoke) 내역</li></ul><h3>정밀 필터링 및 다운로드</h3><p>조작을 유발한 계정명, 작업 대상 리소스, 일자 시간 범위 필터를 통해 정교한 조회가 가능하며, 컴플라이언스 심사 보고서 제출용 CSV 포맷 내보내기를 완벽 지원합니다.</p><h3>플랜별 보관 주기</h3><p>스타터(Starter) 요금제: 최근 30일 보관 / 그로스(Growth) 요금제: 1년 보존 / 엔터프라이즈(Enterprise) 요금제: 영구 보존 및 커스텀 원격 스토리지 백업 지원.</p>' }] }] },
    },
    {
      catSlug: 'administration',
      title: '이메일 알림 및 정기 소식지 발송 구성 정책',
      slug: 'email-notifications',
      excerpt: '회원들이 피로를 느끼지 않으면서도 가장 참여율 높은 알림 빈도를 정밀 세팅하는 방법.',
      tags: ['이메일', '시스템알림', '구독뉴스레터'],
      helpfulCount: 71,
      viewCount: 830,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>이메일 노티피케이션 가이드</h2><p>플랫폼은 회원들이 가동 소식을 누락 없이 정독하여 참여율을 극대화할 수 있도록 마이크로 단위 트랜잭션 메일과 정기 뉴스레터 요약을 고루 발송합니다. <strong>설정 &gt; 이메일 알림</strong> 메뉴에서 조정 가능합니다.</p><h3>트랜잭션 메일 (실시간 즉시 발송)</h3><ul><li>내 아이디 직접 맨션 (@username) 호출 발생 시</li><li>내가 작성한 토론 글에 새로운 답변/댓글이 올라왔을 때</li><li>내가 평소 적극 추천 투표해 둔 아이디어 건의안의 처리 진행 상태(status)가 변했을 때</li><li>참가 예정인 오프라인 행사 24시간 전 및 1시간 전 자동 리마인더</li></ul><h3>요약 브리핑 메일 (Weekly Digest)</h3><p>매주 1회 가장 화제를 모았던 포럼 베스트 인기 글과 새롭게 올라온 영리한 아이디어, 다가오는 라이브 미팅 목록을 예쁜 디자인의 메일로 자동 집계해 송신합니다. 주기: 일간, 주간, 혹은 수신 거부 설정 가능.</p><h3>사용자 개인 수신 설정권</h3><p>각 멤버들은 본인의 프로필 설정 > 알림 메뉴에서 수신하고자 하는 세부 카테고리를 자유 조절할 수 있습니다. 관리자는 신규 멤버가 최초 합류했을 때 가입 기본 권장 프리셋을 사전 일괄 설정해 줄 수 있어 피로도를 방지합니다.</p><h3>자사 메일 서버 결합 (Custom SMTP)</h3><p>엔터프라이즈 전용: 자사의 메일 서버 인프라(AWS SES, SendGrid 등)를 SMTP로 다이렉트 연계하여 발송 발신 도메인 주소를 커스텀으로 완전 단일화 가능합니다.</p>' }] }] },
    },
  ]

  for (const article of kbArticleDefs) {
    const catId = kbCatMap[article.catSlug]
    if (!catId) continue
    await db
      .insert(kbArticles)
      .values({
        tenantId: TENANT_ID,
        authorId: adminMId,
        categoryId: catId,
        title: article.title,
        slug: article.slug,
        body: article.body,
        excerpt: article.excerpt,
        tags: article.tags,
        visibility: 'members' as const,
        helpfulCount: article.helpfulCount,
        viewCount: article.viewCount,
        isPublished: true,
        publishedAt: daysAgo(Math.floor(Math.random() * 40) + 5),
        createdAt: daysAgo(Math.floor(Math.random() * 40) + 10),
      })
      .onConflictDoNothing()
  }
  console.log(`  Created ${kbArticleDefs.length} KB articles`)

  // -------------------------------------------------------------------------
  // Step 11: Chat channels and messages
  // -------------------------------------------------------------------------
  console.log('Creating chat channels and messages...')

  await db
    .insert(chatChannels)
    .values({
      tenantId: TENANT_ID,
      name: '일반-잡담방',
      slug: 'general',
      description: '커뮤니티 회원들의 자유로운 소통 공간 — 가볍게 첫 인사를 건네보세요!',
      isPrivate: false,
      createdBy: adminMId,
      createdAt: daysAgo(58),
    })
    .onConflictDoNothing()
    .returning({ id: chatChannels.id })

  await db
    .insert(chatChannels)
    .values({
      tenantId: TENANT_ID,
      name: '공지사항',
      slug: 'announcements',
      description: 'Acme 공식 운영팀이 전달하는 정규 소식 및 공지사항 채널.',
      isPrivate: false,
      createdBy: adminMId,
      createdAt: daysAgo(58),
    })
    .onConflictDoNothing()
    .returning({ id: chatChannels.id })

  // Fetch channels if they already existed
  const allChannels = await db
    .select({ id: chatChannels.id, slug: chatChannels.slug })
    .from(chatChannels)
    .where(eq(chatChannels.tenantId, TENANT_ID))

  const channelMap: Record<string, string> = {}
  for (const ch of allChannels) channelMap[ch.slug] = ch.id

  const genChId = channelMap['general']
  const annChId = channelMap['announcements']

  if (genChId) {
    const generalMessages = [
      { authorId: alexMId, body: "안녕하세요 모두들! 방금 Zapier 연동을 마무리 지었습니다. 가입한 멤버가 HubSpot 연락처로 누수 없이 실시간 자동 동기화되는 것을 확인했어요 🎉", createdAt: daysAgo(7) },
      { authorId: mayaMId, body: "@alex 님 최고네요! 저희 비즈니스 팀도 네이티브 연동 기능이 정식 배포되면 즉시 Salesforce 쪽에 동일하게 맞출 계획입니다. 지금은 우선 API 웹훅으로 구성해 뒀어요.", createdAt: daysAgo(7) },
      { authorId: jamesMId, body: "좋은 아침입니다 여러분! 혹시 API 호출 속도 제한 관련 Q&A 스레드 보신 분 계신가요? Tom 님이 공유해 주신 해결 꿀팁 덕분에 엄청난 개발 시간이 절약되었습니다.", createdAt: daysAgo(6) },
      { authorId: tomMId, body: "도움이 되었다니 기쁘네요! 꿀팁을 하나 더 보태자면 X-RateLimit-Remaining 헤더를 주의 깊게 모니터링 하셔야 합니다. 상한 벽에 막히기 전에 사전에 모니터링 알람을 구성해 두는 것이 최고입니다.", createdAt: daysAgo(6) },
      { authorId: priyaMId, body: "질문이 하나 있습니다! 혹시 다음 주에 있을 웨비나 후속 후기 이메일 발송용 템플릿 양식을 갖고 계신 분이 있나요? 첫 개최라 맨땅에 헤딩하려니 막막하네요.", createdAt: daysAgo(6) },
      { authorId: sarahMId, body: "@priya 님 걱정 마세요! 지식 베이스 검색창에 '시작하기 > 웨비나 플레이북'을 찾아보시면 바로 활용하실 수 있는 마케팅용 메일 템플릿 3종이 내장되어 있습니다.", createdAt: daysAgo(6) },
      { authorId: priyaMId, body: "확인했습니다, 고맙습니다 Sarah 님! 발송 이메일 템플릿 문구가 완전 프로페셔널해서 바로 써도 되겠네요.", createdAt: daysAgo(5) },
      { authorId: alexMId, body: "오늘의 숨겨진 유용한 기능 팁: 포럼에 답글 달 때 `/embed` 슬래시 단추 명령을 사용하면 지식 베이스(KB) 문서 미리보기 카드를 본문에 예쁘게 렌더링해 꽂을 수 있습니다. 우연히 발견했는데 퀄리티가 끝내주네요.", createdAt: daysAgo(5) },
      { authorId: guestMId, body: "반갑습니다 여러분! 가볍게 참관차 게스트 등급으로 들어왔습니다. 전반적인 분위기가 벌써부터 엄청 활기차고 매력적이네요. 조속히 정회원으로 전환해서 대화에 깊이 참여하고 싶습니다!", createdAt: daysAgo(5) },
      { authorId: adminMId, body: "대단히 환영합니다 @guest 님! 조속히 계정 등급 승급 처리를 검토하겠습니다. 그전까지 공개 게시판과 유용한 지식 문서를 마음껏 둘러보시며 감을 익혀 보세요.", createdAt: daysAgo(5) },
      { authorId: jamesMId, body: "와, 저희 커뮤니티 활성 회원 수가 방금 막 500명을 돌파했습니다! 대단한 마일스톤이네요. 활발하게 불을 지펴주시는 모든 참여자분들께 진심으로 감사드립니다.", createdAt: daysAgo(4) },
      { authorId: mayaMId, body: "500명 돌파라니! 🎉 운영팀 정말 축하드립니다. 대화방 스레드 활성 지표가 정말 엄청납니다 — 매월 평균 전체 회원의 70% 이상이 왕성하게 글을 쓰고 대화에 참여하고 있네요.", createdAt: daysAgo(4) },
      { authorId: tomMId, body: "혹시 2026 차세대 제품 로드맵 공개 웨비나 신청하신 분들 계신가요? 전 메일 알림 보자마자 바로 등록했습니다.", createdAt: daysAgo(3) },
      { authorId: priyaMId, body: "저도 알림 뜨자마자 단 1초의 고민도 없이 바로 넣었습니다. 벌써 312명이 모였다니 역대급 모임이 되겠네요.", createdAt: daysAgo(3) },
      { authorId: sarahMId, body: "유용한 공지: 건의 게시판에 아직 투표 안 하신 분들은 꼭 한 표씩 힘을 실어주세요! 특히 모바일 전용 앱 출시 제안이 현재 82표로 독보적인데, 얼른 100표 채워서 정식 개발 착수하도록 밀어붙여 봅시다!", createdAt: daysAgo(3) },
      { authorId: alexMId, body: "저도 방금 누르고 왔습니다. 2단계 OTP 보안인증 도입 건도요 — 저희 몇몇 금융/엔터프라이즈 계열 고객사 영업을 위해 필수로 통과되어야 하는 중대 사안이거든요.", createdAt: daysAgo(2) },
      { authorId: jamesMId, body: "혹시 지난 개발자 워크숍에서 다뤘던 CSV 대량 가입 API 실습 예제 돌려보신 분 계신가요? 아주 잘 도는데, 역시 편하게 단추로 쓸 수 있는 관리자용 화면 UI가 빨리 보강되면 정말 완벽하겠어요.", createdAt: daysAgo(2) },
      { authorId: tomMId, body: "@james 님, 마침 그 건도 아이디어 건의판에 정식 제안으로 올라가 있습니다 — 현재 약 15표 정도 얻었네요. 얼른 가셔서 소중한 추천 1표와 코멘트를 함께 더해 주세요!", createdAt: daysAgo(2) },
      { authorId: mayaMId, body: "방금 지식 베이스에 CRM 연동 설계 아키텍처에 대한 상세 기술 정리 아티클을 새로 기고했습니다. 이전에 복잡한 필드 동기화 구현을 마쳐본 유경험자 개발자분들의 피어 리뷰를 조심스레 기대해 봅니다.", createdAt: daysAgo(1) },
      { authorId: adminMId, body: "좋은 아침입니다 모두들! 짧고 중요한 소식 하나 공유합니다: 다음 주 중으로 개별 유저 맞춤형 이메일 및 시스템 수신 세부 컨트롤러 화면이 정식 배포됩니다. 자세한 릴리스 노트를 기대해 주세요.", createdAt: daysAgo(1) },
      { authorId: priyaMId, body: "저희 헤비 유저분들이 대시보드 열 때마다 목놓아 부르짖던 숙원 기능이 드디어 나오는군요! 벌써부터 가슴이 뜁니다.", createdAt: daysAgo(0) },
      { authorId: alexMId, body: "월요일 아침을 기분 좋게 깨워주는 소식이네요. 활기차게 한 주를 시작해 봅시다!", createdAt: daysAgo(0) },
    ]

    for (const msg of generalMessages) {
      await db
        .insert(chatMessages)
        .values({
          tenantId: TENANT_ID,
          channelId: genChId,
          authorId: msg.authorId,
          body: msg.body,
          createdAt: msg.createdAt,
        })
        .onConflictDoNothing()
    }
  }

  if (annChId) {
    const annMessages = [
      { authorId: adminMId, body: "🎉 Acme 공식 커뮤니티에 합류하신 여러분을 진심으로 뜨겁게 환영합니다! 가입 즉시 포럼의 최상단 고정 공지 환영 스레드를 정독해 주시면 서비스 이용에 큰 도움이 됩니다.", createdAt: daysAgo(58) },
      { authorId: adminMId, body: "플랫폼 v2.0 정식 버전이 대대적으로 배포되었습니다! 주요 개편 사양: 양방향 아이디어 건의판 개설, 통합 지식 백과사전 론칭, 그리고 비약적인 대시보드 성능 고도화. 자세한 사양은 포럼 > 공지사항을 참조하세요.", createdAt: daysAgo(30) },
      { authorId: adminMId, body: "Zapier 노코드 연동 베타가 전격 오픈되었습니다! 설정 > 연동 > Zapier 메뉴에서 간편하게 신청하실 수 있습니다. 선착순 50개 팀에게는 본사 엔지니어가 직접 1:1로 자동화 워크플로우를 공짜로 설계해 드리는 특전을 지원합니다.", createdAt: daysAgo(14) },
      { authorId: adminMId, body: "플랫폼 v2.1 릴리스 안내: 이제 커스텀 도메인 결합이 정식 제공(GA)됩니다. 더불어 Zapier 마켓플레이스 공식 출시 및 이메일 전송 딜레이 성능이 40% 이상 개선되었습니다. 세부 명세는 지식 베이스를 참고해 주세요.", createdAt: daysAgo(14) },
      { authorId: adminMId, body: "📅 6주 뒤에 기동할 '2026 차세대 플랫폼 제품 로드맵 대공개' 실시간 웨비나 — 벌써 312명의 업계 전문가분들이 신청 완료하셨습니다! 어서 웨비나 탭에서 무료 좌석을 선점하세요.", createdAt: daysAgo(1) },
    ]

    for (const msg of annMessages) {
      await db
        .insert(chatMessages)
        .values({
          tenantId: TENANT_ID,
          channelId: annChId,
          authorId: msg.authorId,
          body: msg.body,
          createdAt: msg.createdAt,
        })
        .onConflictDoNothing()
    }
  }
  console.log('  Created chat channels and messages')

  // -------------------------------------------------------------------------
  // Step 12: Social Intelligence
  // -------------------------------------------------------------------------
  console.log('Creating social intelligence data...')

  await db
    .insert(siKeywordGroups)
    .values({
      tenantId: TENANT_ID,
      name: 'Acme 브랜드',
      type: 'brand' as const,
      terms: ['acme community', 'ultimatecommunity', '@acmecommunity', '#acmecommunity'],
      platforms: ['twitter', 'reddit', 'linkedin'],
      isActive: true,
      createdAt: daysAgo(45),
    })
    .onConflictDoNothing()
    .returning({ id: siKeywordGroups.id })

  await db
    .insert(siKeywordGroups)
    .values({
      tenantId: TENANT_ID,
      name: '경쟁 솔루션 분석',
      type: 'competitor' as const,
      terms: ['circle.so', 'mighty networks', 'tribe.so', 'disciple media'],
      platforms: ['twitter', 'reddit', 'linkedin'],
      isActive: true,
      createdAt: daysAgo(45),
    })
    .onConflictDoNothing()
    .returning({ id: siKeywordGroups.id })

  await db
    .insert(siKeywordGroups)
    .values({
      tenantId: TENANT_ID,
      name: '커뮤니티 주도 성장(CLG)',
      type: 'custom' as const,
      terms: ['community led growth', 'community-led', 'clg', 'community flywheel'],
      platforms: ['twitter', 'linkedin'],
      isActive: true,
      createdAt: daysAgo(45),
    })
    .onConflictDoNothing()
    .returning({ id: siKeywordGroups.id })

  // Fetch keyword groups
  const allGroups = await db
    .select({ id: siKeywordGroups.id, name: siKeywordGroups.name })
    .from(siKeywordGroups)
    .where(eq(siKeywordGroups.tenantId, TENANT_ID))

  const groupMap: Record<string, string> = {}
  for (const g of allGroups) groupMap[g.name] = g.id

  const brandGroupId = groupMap['Acme 브랜드']
  const competitorGroupId = groupMap['경쟁 솔루션 분석']
  const customGroupId = groupMap['커뮤니티 주도 성장(CLG)']

  const mentionDefs = [
    // Positive brand mentions
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_001', authorHandle: '@devops_dan', contentUrl: 'https://twitter.com/devops_dan/status/1', textPreview: "방금 저희 커뮤니티 서비스를 @acmecommunity 플랫폼으로 마이그레이션했는데 와... 온보딩 경험이 이전보다 10배는 훌륭해졌네요. API도 정말 깔끔하게 떨어지고 웹훅이 돌처럼 단단하고 정교하게 작동합니다.", publishedAt: daysAgo(3), sentiment: 'positive' as const, sentimentScore: 0.91, engagementCount: 47 },
    { groupId: brandGroupId, platform: 'linkedin', externalId: 'li_001', authorHandle: 'Sarah Kim', contentUrl: 'https://linkedin.com/posts/sarahkim_001', textPreview: "OpenSourceCommunity를 도입하고 가동한 지 6개월이 지났습니다. 당사의 월간 활성 참여율(Engagement Rate)은 평균 68%로, 업계 평균 수치인 20-30%를 월등히 상회하고 있습니다. B2B 비즈니스용 커뮤니티를 준비 중이라면 이 플랫폼이 정답입니다.", publishedAt: daysAgo(5), sentiment: 'positive' as const, sentimentScore: 0.88, engagementCount: 134 },
    { groupId: brandGroupId, platform: 'reddit', externalId: 'rd_001', authorHandle: 'u/community_builder', contentUrl: 'https://reddit.com/r/communitymanagement/comments/001', textPreview: "혹시 엔터프라이즈 B2B 환경에서 OpenSourceCommunity 플랫폼을 실제로 운영 중인 기업이 계신가요? 저희는 약 1만 명 규모의 잠재 사용자가 있으며, 정교한 역할 기반 접근(RBAC) 통제가 필수로 요구됩니다. 여기 커스텀 역할 기능이 꽤 유망해 보이네요.", publishedAt: daysAgo(4), sentiment: 'neutral' as const, sentimentScore: 0.55, engagementCount: 23 },
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_002', authorHandle: '@techfounder', contentUrl: 'https://twitter.com/techfounder/status/2', textPreview: "Acme 커뮤니티의 #acmecommunity 아이디어 건의판 기능은 정말 놀랍도록 똑똑합니다. 고객은 본인들이 원하는 제품 피드백에 직접 투표하고, 창업자는 이를 통해 우선순위가 정렬된 제품 개발 로드맵을 도출해 내며, 모든 사용자가 존중받고 경청되고 있음을 체감하게 됩니다. 커뮤니티 주도 제품 개발(Community-led product development)의 모범 사례입니다.", publishedAt: daysAgo(2), sentiment: 'positive' as const, sentimentScore: 0.86, engagementCount: 89 },
    { groupId: brandGroupId, platform: 'linkedin', externalId: 'li_002', authorHandle: 'Marcus Webb', contentUrl: 'https://linkedin.com/posts/marcuswebb_002', textPreview: "오늘 @acmecommunity API 기술 문서를 파보면서 꽤나 좌절스러운 경험을 했습니다. 정확히 무엇 때문에 속도 한계 제약(Rate Limit) 예외가 유발되었는지 에러 페이로드에 컨텍스트가 전혀 없었거든요. 웹훅 수신부 오류라는 것을 찾아내는 데 꼬박 2시간이 걸렸습니다. 에러 메시지를 좀 더 명확하게 제공해 주면 좋겠네요.", publishedAt: daysAgo(6), sentiment: 'negative' as const, sentimentScore: 0.18, engagementCount: 12 },
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_003', authorHandle: '@csm_rachel', contentUrl: 'https://twitter.com/csm_rachel/status/3', textPreview: "@acmecommunity 솔루션을 통해 당사 최초의 공식 실시간 세미나를 성공적으로 마무리했습니다. 234명 사전 신청에 출석률 71%를 기록했네요. 풍부한 실시간 Q&A 탭과 즉각적인 투표 기능들 덕분에 뻔한 Zoom 미팅이 아닌 고품격 디지털 컨퍼런스에 참여한 듯한 몰입감을 주었습니다.", publishedAt: daysAgo(8), sentiment: 'positive' as const, sentimentScore: 0.93, engagementCount: 67 },
    { groupId: brandGroupId, platform: 'reddit', externalId: 'rd_002', authorHandle: 'u/saas_ops', contentUrl: 'https://reddit.com/r/saas/comments/002', textPreview: "B2B SaaS에 결합할 커뮤니티 빌더 제품군들을 전방위 비교 분석 중입니다. OpenSourceCommunity vs Circle vs Mighty Networks. UC(UltimateCommunity)가 연동 웹훅과 백엔드 API 명세 측면에서는 단연 압도적인 승리이지만, 상대적으로 아직 모바일 뷰 전용 앱 제공이 다소 부족한 부분이 있네요. 모바일 공식 앱 론칭을 손꼽아 기다리고 있습니다.", publishedAt: daysAgo(10), sentiment: 'mixed' as const, sentimentScore: 0.52, engagementCount: 41 },
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_004', authorHandle: '@growthops', contentUrl: 'https://twitter.com/growthops/status/4', textPreview: "@acmecommunity 내에 기본으로 내장된 소셜 인텔리전스 여론 분석 기능은 정말 최고입니다. 저희 비즈니스 브랜드에 대한 잠재적 부정 평가 급증 스파이크를 사전에 감지하여 대형 PR 위기가 되기 전에 선제 진화했습니다. 1시간 이내로 즉각 대응을 완료했네요. 이것이 바로 차세대 플랫폼의 미래입니다.", publishedAt: daysAgo(1), sentiment: 'positive' as const, sentimentScore: 0.87, engagementCount: 55 },
    // Competitor mentions
    { groupId: competitorGroupId, platform: 'twitter', externalId: 'tw_c001', authorHandle: '@startup_cto', contentUrl: 'https://twitter.com/startup_cto/status/c001', textPreview: "기존에 사용하던 circle.so에서 OpenSourceCommunity로 갈아탔습니다. 가장 핵심적인 이전 요인은 압도적인 고성능 API, 웹훅 신뢰성, 그리고 실시간 소셜 모니터링 분석 기능 때문이었습니다. Circle도 크리에이터나 개인 팬덤 커뮤니티용으로는 훌륭하지만, 비즈니스 중심의 B2B 빌딩 영역에서는 UC가 무조건 왕좌입니다.", publishedAt: daysAgo(7), sentiment: 'positive' as const, sentimentScore: 0.79, engagementCount: 38 },
    { groupId: competitorGroupId, platform: 'reddit', externalId: 'rd_c001', authorHandle: 'u/platform_eval', contentUrl: 'https://reddit.com/r/communitymanagement/comments/c001', textPreview: "전체 종합 심층 비교: OpenSourceCommunity vs Mighty Networks vs Circle. UC가 확연하게 앞서는 지점은 풍부한 백엔드 API, 연동성, 싱글사인온(SSO), 그리고 정밀한 대시보드 통계입니다. 아쉬운 부문은 아직 자체 폐쇄형 모바일 정규 앱의 유무 및 아주 작은 소규모 소모임 기준으로는 요금 단가가 다소 부담될 수 있다는 점입니다.", publishedAt: daysAgo(12), sentiment: 'mixed' as const, sentimentScore: 0.58, engagementCount: 95 },
    { groupId: competitorGroupId, platform: 'linkedin', externalId: 'li_c001', authorHandle: 'Jennifer Park', contentUrl: 'https://linkedin.com/posts/jenniferpark_c001', textPreview: "대기업 환경에서 대안 솔루션 중 tribe.so 대신 최종적으로 OpenSourceCommunity를 최종 선택한 명백한 근거: 완벽한 테넌트별 데이터 격리 보안, 마이크로 커스텀 권한 매핑, 변경 내역 감사 로그(Audit log), 그리고 철저한 실무 SLA 약정 제공입니다. 합리적인 예산 범위 내에서 최고의 엔터프라이즈 사양을 얻었습니다.", publishedAt: daysAgo(9), sentiment: 'positive' as const, sentimentScore: 0.82, engagementCount: 74 },
    // Custom / CLG mentions
    { groupId: customGroupId, platform: 'twitter', externalId: 'tw_cu001', authorHandle: '@clg_champion', contentUrl: 'https://twitter.com/clg_champion/status/cu001', textPreview: "커뮤니티 주도 성장(Community-Led Growth)은 오늘날 B2B SaaS 기업의 고투마켓(GTM) 전략 중 가장 과소평가된 초강력 무기입니다. 유저들이 자발적으로 동료의 애로사항을 돕고 답변을 축적하는 공간을 형성하는 순간, 그 어떤 경쟁사도 흉내 낼 수 없는 거대한 기술적 해자(Moat)가 탄생합니다.", publishedAt: daysAgo(4), sentiment: 'positive' as const, sentimentScore: 0.90, engagementCount: 156 },
    { groupId: customGroupId, platform: 'linkedin', externalId: 'li_cu001', authorHandle: 'Daniel Torres', contentUrl: 'https://linkedin.com/posts/danieltorres_cu001', textPreview: "커뮤니티 선순환 성장 플라이휠(Community Flywheel): 신규 가입 멤버 증가 → 양질의 질의응답 노하우 누적 → 포털 검색 최적화(SEO) 지수 폭등 → 유기적인 웹 방문자 및 신규 가입 자동 연쇄 폭발 → 멤버 풀 증가. 당사는 이 기적 같은 복리 효과를 지난 12개월간 몸소 증명해 내고 있습니다. 커뮤니티 주도 성장은 진실입니다.", publishedAt: daysAgo(6), sentiment: 'positive' as const, sentimentScore: 0.88, engagementCount: 203 },
    { groupId: customGroupId, platform: 'twitter', externalId: 'tw_cu002', authorHandle: '@vcbacked', contentUrl: 'https://twitter.com/vcbacked/status/cu002', textPreview: "냉정한 한마디: 제품의 본질적인 매력과 사용성이 엉망이라면 아무리 훌륭한 커뮤니티 주도 성장(#CLG) 전략을 외쳐도 아무 소용없습니다. 커뮤니티는 본질적으로 양방향의 입소문을 기하급수적으로 증폭시키는 메가폰에 불과합니다. 먼저 제품의 뼈대를 단단하게 고친 후, 커뮤니티라는 날개를 다는 것이 올바른 순서입니다.", publishedAt: daysAgo(3), sentiment: 'mixed' as const, sentimentScore: 0.48, engagementCount: 267 },
    { groupId: customGroupId, platform: 'linkedin', externalId: 'li_cu002', authorHandle: 'Priya Anand', contentUrl: 'https://linkedin.com/posts/priyaanand_cu002', textPreview: "커뮤니티 주도 성장을 성공적으로 계측하기 위한 4가지 절대 지표: 월간 활성 회원(MAM), 게시물 답변 완료율(Resolution Rate), 고객지원 상담원 티켓 인입 감소 비율, 그리고 커뮤니티 참여군과 비참여군 간의 순추천고객지수(NPS) 격차 대조. 이 4종 세트를 꾸준히 트래킹하면 CLG의 재무적 기여도를 완벽히 입증할 수 있습니다.", publishedAt: daysAgo(8), sentiment: 'neutral' as const, sentimentScore: 0.65, engagementCount: 118 },
    // More brand mentions to hit 20
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_005', authorHandle: '@devadvocate', contentUrl: 'https://twitter.com/devadvocate/status/5', textPreview: "@acmecommunity의 개발자 사용자 경험(DX)은 진정한 업계 최고 수준입니다. 매우 촘촘하고 친절한 API 레퍼런스 가이드, 친절한 예외 처리 메시지 설계, 그리고 질문을 올리면 십여 분 내에 현업 실무자들이 발 벗고 나서서 집단지성으로 해결해 주는 활기찬 생태계를 보유하고 있습니다.", publishedAt: daysAgo(11), sentiment: 'positive' as const, sentimentScore: 0.84, engagementCount: 33 },
    { groupId: brandGroupId, platform: 'reddit', externalId: 'rd_003', authorHandle: 'u/csm_pro', contentUrl: 'https://reddit.com/r/customersuccess/comments/003', textPreview: "혹시 고객 성공(CS) 부서 차원에서 비즈니스 성과 증명을 위해 OpenSourceCommunity를 결합해 활용 중인 곳이 계신가요? 당사는 Gainsight 솔루션과 플랫폼을 연동했는데 고객 건강 스코어링을 실시간 갱신하는 데 있어 게임 체인저가 되었습니다. 유저들의 활동 데이터가 건강 예측 모델에 그대로 녹아들어 정확도가 눈에 띄게 올랐어요.", publishedAt: daysAgo(13), sentiment: 'positive' as const, sentimentScore: 0.85, engagementCount: 28 },
    { groupId: brandGroupId, platform: 'linkedin', externalId: 'li_003', authorHandle: 'Alex Thompson', contentUrl: 'https://linkedin.com/posts/alexthompson_003', textPreview: "OpenSourceCommunity팀에 바라는 한 가지 솔직한 피드백: 데이터 통계 애널리틱스 대시보드가 더 강화되어야 합니다. 현재 UI는 매우 기본적인 수치 증감만 보여주지만, 궁극적으로는 유저 기수별 코호트 리포트, 복합적인 사용자 여정 맵 추적, 그리고 어떤 아티클 콘텐츠가 실질적 비즈니스 전환율을 유발했는지 기여도 추적이 함께 제공되어야 합니다.", publishedAt: daysAgo(15), sentiment: 'negative' as const, sentimentScore: 0.25, engagementCount: 19 },
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_006', authorHandle: '@ops_hacker', contentUrl: 'https://twitter.com/ops_hacker/status/6', textPreview: "고대하던 @acmecommunity 플랫폼과 Stripe 결제 게이트웨이의 완전 자동 결합 연동을 마침내 성공시켰습니다! 외부 결제창에서 유료 구독권이 발생하면 시스템이 API를 타고 유저 등급을 'Pro Member' 역할로 즉각 승급시킵니다. 사람의 수작업 개입이 0%로 줄었습니다. 진정한 무결점 비즈니스 자동화입니다.", publishedAt: daysAgo(2), sentiment: 'positive' as const, sentimentScore: 0.92, engagementCount: 61 },
    { groupId: customGroupId, platform: 'twitter', externalId: 'tw_cu003', authorHandle: '@b2b_growth', contentUrl: 'https://twitter.com/b2b_growth/status/cu003', textPreview: "오늘의 놀라운 커뮤니티 주도 성장 실증 통계: 왕성한 브랜드 소통 커뮤니티를 유지하는 기업들은 일반 유저 그룹에 비해 충성 커뮤니티 회원군으로부터 무려 5.4배 더 높은 순추천고객지수(NPS)를 획득하고 있습니다. 데이터가 가리키는 지표는 명징합니다 — 주저 말고 커뮤니티에 과감히 투자하십시오.", publishedAt: daysAgo(1), sentiment: 'positive' as const, sentimentScore: 0.89, engagementCount: 189 },
  ]

  let mentionsCreated = 0
  for (const mention of mentionDefs) {
    if (!mention.groupId) continue
    await db
      .insert(siMentions)
      .values({
        tenantId: TENANT_ID,
        keywordGroupId: mention.groupId,
        platform: mention.platform,
        externalId: mention.externalId,
        authorHandle: mention.authorHandle,
        contentUrl: mention.contentUrl,
        textPreview: mention.textPreview,
        publishedAt: mention.publishedAt,
        sentiment: mention.sentiment,
        sentimentScore: mention.sentimentScore,
        status: 'new' as const,
        engagementCount: mention.engagementCount,
        rawMetadata: {},
        collectedAt: new Date(),
      })
      .onConflictDoNothing()
    mentionsCreated++
  }

  // Alerts
  if (brandGroupId) {
    await db
      .insert(siAlerts)
      .values([
        {
          tenantId: TENANT_ID,
          alertType: 'volume_spike' as const,
          payload: {
            keywordGroupId: brandGroupId,
            keywordGroupName: 'Acme 브랜드',
            spikeMultiplier: 3.8,
            mentionCount: 19,
            timeWindowHours: 24,
            message: '브랜드 언급 언급량이 임계 기준점 대비 무려 3.8배 급증했습니다 — 최근 단행한 v2.1 릴리스 발표 공지가 다양한 미디어 및 소셜 채널로 강력하게 확산된 영향으로 판단됩니다.',
          },
          status: 'open',
          triggeredAt: daysAgo(14),
        },
        {
          tenantId: TENANT_ID,
          alertType: 'crisis' as const,
          payload: {
            keywordGroupId: brandGroupId,
            keywordGroupName: 'Acme 브랜드',
            negativeRatio: 0.62,
            mentionCount: 8,
            timeWindowHours: 6,
            message: '부정적 평가 여론이 급속도로 감지되었습니다. 일부 API 오류 메시지의 불투명함으로 인해 프런트엔드 개발자들의 불만 섞인 트윗과 게시글이 증가하고 있습니다. DevRel 팀의 즉각적인 해명 피드백 작성을 강력히 권장합니다.',
          },
          status: 'open',
          triggeredAt: daysAgo(6),
        },
      ])
      .onConflictDoNothing()
  }
  console.log(`  Created ${mentionsCreated} mentions and 2 alerts`)

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  console.log('\n✅ Demo seed complete!')
  console.log(`   Users: ${userDefs.length}`)
  console.log(`   Members: ${userDefs.length}`)
  console.log(`   Forum categories: 3`)
  console.log(`   Forum threads: ${insertedThreadIds.length} (with replies and reactions)`)
  console.log(`   Ideas: ${ideaIds.length} (with votes and comments)`)
  console.log(`   Events: ${eventDefs.length} (with RSVPs)`)
  console.log(`   Courses: ${courseDefs.length} (with lessons and enrollments)`)
  console.log(`   Webinars: ${webinarDefs.length} (with registrations)`)
  console.log(`   KB articles: ${kbArticleDefs.length}`)
  console.log(`   Chat messages: ${22 + 5} (2 channels)`)
  console.log(`   SI mentions: ${mentionsCreated} | SI alerts: 2`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
