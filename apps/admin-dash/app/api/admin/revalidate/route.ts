import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { notifyMainSiteRevalidate } from '@/lib/notify-main-site'

export async function POST(request: Request) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paths } = await request.json()
    let pathList: string[]
    if (paths === undefined || paths === null) {
      pathList = ['all']
    } else if (Array.isArray(paths) && paths.every((p) => typeof p === 'string')) {
      pathList = paths
    } else {
      return NextResponse.json(
        { error: 'Invalid paths. Expected an array of strings.' },
        { status: 400 }
      )
    }

    const shouldNotify =
      pathList.includes('all') ||
      pathList.includes('blog') ||
      pathList.includes('deep-research')
    if (shouldNotify) {
      notifyMainSiteRevalidate()
    }

    return NextResponse.json({ success: true, revalidated: pathList })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
