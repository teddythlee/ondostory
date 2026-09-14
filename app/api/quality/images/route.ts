export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { registerLicensedImage, updateImageAsset, type ImageOrigin, type ImageRightsStatus } from '@/lib/image-provenance'

const ORIGINS = new Set<ImageOrigin>(['unknown', 'original', 'licensed_stock', 'ai_generated', 'business_provided'])
const STATUSES = new Set<ImageRightsStatus>(['unverified', 'verified', 'rejected'])

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = (await req.json()) as { imageUrl?: string; sourceUrl?: string; creator?: string; licenseName?: string }
    if (!body.imageUrl || !body.sourceUrl || !body.creator || !body.licenseName) {
      return NextResponse.json({ error: '이미지·원본·촬영자·라이선스 정보가 모두 필요합니다.' }, { status: 400 })
    }
    await registerLicensedImage({ imageUrl: body.imageUrl, sourceUrl: body.sourceUrl, creator: body.creator, licenseName: body.licenseName })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '출처 등록 실패' }, { status: 500 })
  }
}
export async function PATCH(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = (await req.json()) as {
      imageUrl?: string
      originType?: ImageOrigin
      rightsStatus?: ImageRightsStatus
      sourceUrl?: string
      creator?: string
      licenseName?: string
      verificationNote?: string
    }
    if (!body.imageUrl || !body.originType || !ORIGINS.has(body.originType) || !body.rightsStatus || !STATUSES.has(body.rightsStatus)) {
      return NextResponse.json({ error: '올바른 이미지 URL·유형·상태가 필요합니다.' }, { status: 400 })
    }
    const asset = await updateImageAsset(body.imageUrl, {
      origin_type: body.originType,
      rights_status: body.rightsStatus,
      source_url: body.sourceUrl,
      creator: body.creator,
      license_name: body.licenseName,
      verification_note: body.verificationNote,
    })
    return NextResponse.json({ ok: true, asset })
  } catch (error) {
    const message = error instanceof Error ? error.message : '이미지 출처 저장 실패'
    return NextResponse.json({ error: message }, { status: message.includes('필요합니다') ? 400 : 500 })
  }
}
