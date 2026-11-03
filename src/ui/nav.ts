export const NAV = {
  zh: [
    { href: '/zh/', label: '대시보드', icon: '◎' },
    { href: '/zh/lessons/', label: '수업기록', icon: '≡' },
    { href: '/zh/vocab/', label: '단어장', icon: '字' },
    { href: '/zh/fixes/', label: '교정노트', icon: '✎' },
    { href: '/zh/review/', label: '복습', icon: '⟳' },
  ],
  en: [
    { href: '/en/', label: '대시보드', icon: '◎' },
    { href: '/en/vocab/', label: '단어장', icon: 'Aa' },
    { href: '/en/expressions/', label: '표현', icon: '“' },
    { href: '/en/shadowing/', label: '쉐도잉', icon: '♪' },
    { href: '/en/review/', label: '복습', icon: '⟳' },
  ],
  interview: [
    { href: '/interview/', label: '질문 은행', icon: '?' },
    { href: '/interview/practice/', label: '연습', icon: '▶' },
    { href: '/interview/review/', label: '복습', icon: '⟳' },
  ],
} as const;
