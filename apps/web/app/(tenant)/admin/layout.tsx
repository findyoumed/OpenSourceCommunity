// [LOG: 20260527_1449]
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import { redirect } from 'next/navigation'
import { AdminSubnav } from './admin-subnav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let isAdmin = false
  try {
    const profile = await apiGet<{ role: string }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin'
  } catch {}

  if (!isAdmin) redirect('/home')

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <AdminSubnav />

      {/* Page content */}
      {children}
    </div>
  )
}
