export const runtime = 'edge'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

import { headers, cookies } from 'next/headers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// [LOG: 20260528_1258] Brand Update to Study With Me
export const metadata: Metadata = {
  title: {
    template: '%s | Study With Me',
    default: 'Study With Me — The community platform that sees everything',
  },
  description:
    'A modular B2B SaaS community platform with forums, ideas, events, courses, and intelligent insights.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ),
  icons: {
    icon: '/icon.svg',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // [LOG: 20260528_1522] Dynamically resolve HTML lang attribute based on cookie or browser header to avoid browser translation prompts
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const resolvedLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  return (
    <html lang={resolvedLang} className={inter.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
