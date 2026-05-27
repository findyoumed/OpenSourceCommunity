// [LOG: 20260527_1028]

// ─── 1. Translation Dictionary ────────────────────────────────────────────────
export const dictionary = {
  en: {
    // Sidebar
    'nav.home': 'Home',
    'nav.forums': 'Forums',
    'nav.ideas': 'Ideas',
    'nav.events': 'Events',
    'nav.kb': 'Knowledge Base',
    'nav.courses': 'Courses',
    'nav.webinars': 'Webinars',
    'nav.chat': 'Chat',
    'nav.intelligence': 'Intelligence',
    'nav.members': 'Members',
    'nav.admin': 'Admin',

    // Header
    'header.search': 'Search…',
    'header.profile': 'Profile',
    'header.settings': 'Settings',
    'header.signout': 'Sign out',

    // Forums Page
    'forums.title': 'Forums',
    'forums.description': 'Browse discussions by category',
    'forums.newBtn': 'New discussion',
    'forums.emptyTitle': 'No discussions yet',
    'forums.emptyDesc': 'Be the first to start a discussion in your community.',
    'forums.emptyAction': 'Start the first discussion →',
    'forums.threads': 'threads',
    'forums.posts': 'posts',
    'forums.latest': 'Latest',
    'forums.by': 'by',
    'forums.error': 'Failed to load forum categories. Please try refreshing the page.',

    // Settings Page
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your profile, language, and account preferences',
    'settings.profile.title': 'Edit Profile',
    'settings.profile.desc': 'This is what other members see when they view your profile.',
    'settings.language.title': 'Language Preferences',
    'settings.language.desc': 'Content in forums and other modules will be translated to your chosen language on demand. You can also change this any time using the globe icon in the top bar.',
    'settings.notifications.title': 'Notifications',
    'settings.notifications.desc': 'Control which emails and in-app alerts you receive.',
    'settings.notifications.manage': 'Manage',
    'settings.account.title': 'Account',
    'settings.account.desc': 'Email and password are managed through your identity provider.',
    'settings.account.signedIn': 'Signed in as',
  },
  ko: {
    // Sidebar
    'nav.home': '홈',
    'nav.forums': '포럼 게시판',
    'nav.ideas': '아이디어 건의',
    'nav.events': '이벤트/모임',
    'nav.kb': '지식 베이스',
    'nav.courses': '온라인 강좌',
    'nav.webinars': '웨비나',
    'nav.chat': '실시간 채팅',
    'nav.intelligence': '인텔리전스',
    'nav.members': '멤버 목록',
    'nav.admin': '관리자 설정',

    // Header
    'header.search': '검색…',
    'header.profile': '내 프로필',
    'header.settings': '개인 설정',
    'header.signout': '로그아웃',

    // Forums Page
    'forums.title': '포럼 게시판',
    'forums.description': '카테고리별로 자유롭게 소통해 보세요',
    'forums.newBtn': '새 토론 개설',
    'forums.emptyTitle': '아직 작성된 글이 없습니다',
    'forums.emptyDesc': '우리 커뮤니티의 첫 번째 토론을 직접 시작해 보세요.',
    'forums.emptyAction': '첫 번째 토론 시작하기 →',
    'forums.threads': '스레드',
    'forums.posts': '댓글',
    'forums.latest': '최신 글',
    'forums.by': '작성자',
    'forums.error': '포럼 카테고리를 불러오지 못했습니다. 새로고침을 시도해 주세요.',

    // Settings Page
    'settings.title': '개인 설정',
    'settings.subtitle': '프로필, 언어 및 계정 기본 설정을 관리합니다',
    'settings.profile.title': '프로필 수정',
    'settings.profile.desc': '다른 회원들이 내 프로필 카드를 볼 때 표시되는 정보입니다.',
    'settings.language.title': '화면 및 본문 언어 설정',
    'settings.language.desc': '선택하신 언어로 포럼 게시글 번역 기능이 제공되며, 상단 지구본 아이콘을 통해서도 실시간으로 사이트 언어를 전환할 수 있습니다.',
    'settings.notifications.title': '이메일 및 앱 알림',
    'settings.notifications.desc': '수신할 이메일 소식 및 서비스 내 실시간 알림을 설정합니다.',
    'settings.notifications.manage': '관리하기',
    'settings.account.title': '내 계정 정보',
    'settings.account.desc': '이메일 주소 및 패스워드는 인증 공급업체를 통해 안전하게 관리됩니다.',
    'settings.account.signedIn': '로그인된 계정',
  },
} as const

export type Locale = 'en' | 'ko'
export type DictionaryKey = keyof typeof dictionary['en']

// ─── 2. Pure Synchronous Translation Function (For Server & Client) ──────────
export function t(key: DictionaryKey, lang?: string | null): string {
  const currentLang = (lang === 'ko' ? 'ko' : 'en') as Locale
  return dictionary[currentLang][key] || dictionary['en'][key] || String(key)
}
