import { createClient } from '@supabase/supabase-js'

const applyChanges = process.argv.includes('--apply')
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`)
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const checkedDate = '2026-09-14'

function replaceRequired(content, before, after, label) {
  if (!content.includes(before)) throw new Error(`${label}: expected content not found`)
  return content.replace(before, after)
}

function removeImage(content, imageUrl) {
  const escaped = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.replace(new RegExp(`<img[^>]+src=["']${escaped}["'][^>]*>`, 'g'), '')
}

async function importPexelsPhoto(photo) {
  const response = await fetch(photo.imageUrl, { redirect: 'error' })
  if (!response.ok) throw new Error(`Pexels image download failed (${response.status})`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > 15_000_000) throw new Error('Unexpected Pexels image size')
  const storagePath = `licensed/pexels-${photo.id}.jpg`
  const { error: uploadError } = await supabase.storage.from('blog-images').upload(storagePath, bytes, {
    contentType: response.headers.get('content-type') || 'image/jpeg', cacheControl: '31536000', upsert: true,
  })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('blog-images').getPublicUrl(storagePath)
  const now = new Date().toISOString()
  const { error: assetError } = await supabase.from('image_assets').upsert({
    image_url: data.publicUrl,
    host: new URL(data.publicUrl).hostname,
    storage_path: storagePath,
    origin_type: 'licensed_stock',
    rights_status: 'verified',
    source_url: photo.sourceUrl,
    creator: photo.creator,
    license_name: 'Pexels License',
    verification_note: `Pexels API metadata verified and self-hosted ${checkedDate}`,
    verified_at: now,
    last_seen_at: now,
    updated_at: now,
  }, { onConflict: 'image_url' })
  if (assetError) throw assetError
  return data.publicUrl
}

const photos = {
  airline: { id: '3374249', creator: 'Brady Knoll', sourceUrl: 'https://www.pexels.com/photo/white-airplane-wing-3374249/', imageUrl: 'https://images.pexels.com/photos/3374249/pexels-photo-3374249.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  utility: { id: '4554239', creator: 'cottonbro studio', sourceUrl: 'https://www.pexels.com/photo/person-in-blue-denim-jeans-standing-beside-brown-cardboard-box-4554239/', imageUrl: 'https://images.pexels.com/photos/4554239/pexels-photo-4554239.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  package: { id: '4440788', creator: 'Polina Tankilevitch', sourceUrl: 'https://www.pexels.com/photo/a-brown-delivery-box-with-mailing-details-4440788/', imageUrl: 'https://images.pexels.com/photos/4440788/pexels-photo-4440788.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  health: { id: '8286759', creator: 'furkanfdemir', sourceUrl: 'https://www.pexels.com/photo/cooked-food-in-the-bowl-8286759/', imageUrl: 'https://images.pexels.com/photos/8286759/pexels-photo-8286759.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  registration: { id: '842528', creator: 'Brett Jordan', sourceUrl: 'https://www.pexels.com/photo/car-keys-on-white-surface-842528/', imageUrl: 'https://images.pexels.com/photos/842528/pexels-photo-842528.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  license: { id: '14401959', creator: 'Axwell Wallets', sourceUrl: 'https://www.pexels.com/photo/man-sitting-in-car-and-holding-wallet-with-cards-14401959/', imageUrl: 'https://images.pexels.com/photos/14401959/pexels-photo-14401959.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
}
const imageUrls = Object.fromEntries(await Promise.all(Object.entries(photos).map(async ([key, photo]) => [
  key, applyChanges ? await importPexelsPhoto(photo) : `SELF_HOSTED_PEXELS_${photo.id}`,
])))

const targetSlugs = [
  'choose-airline-going-korea-usa', 'us-move-in-utilities-setup', 'korea-us-package-tariff',
  'hypertension-cholesterol-korean-meal-plan', 'austin-texas-travel-plan',
  'california-dmv-vehicle-registration-address-change', 'california-dmv-license-renewal', 'us-korea-what-to-buy',
]
const { data: rows, error: readError } = await supabase.from('posts').select('*').in('slug', targetSlugs)
if (readError) throw readError
if (rows?.length !== targetSlugs.length) throw new Error(`Expected ${targetSlugs.length} posts, found ${rows?.length || 0}`)
const posts = new Map(rows.map((post) => [post.slug, post]))
const updates = []

function replaceSingleImagePost(slug, newImage, alt) {
  const post = posts.get(slug)
  const oldImage = post.cover_image
  let content = removeImage(post.content, oldImage)
  const firstParagraphEnd = content.indexOf('</p>') + 4
  if (firstParagraphEnd < 4) throw new Error(`${slug}: opening paragraph not found`)
  content = `${content.slice(0, firstParagraphEnd)}<img class="rounded-lg" src="${newImage}" alt="${alt}" width="75%">${content.slice(firstParagraphEnd)}`
  updates.push({ post, values: { cover_image: newImage, content }, removedAssets: [oldImage] })
}

replaceSingleImagePost('choose-airline-going-korea-usa', imageUrls.airline, '장거리 노선 항공사 선택을 앞두고 본 비행기 창밖 날개와 구름')
replaceSingleImagePost('us-move-in-utilities-setup', imageUrls.utility, '새집 유틸리티 개통을 준비하며 정리한 이삿짐 상자')
replaceSingleImagePost('california-dmv-license-renewal', imageUrls.license, '차 안에서 지갑 속 신분증 카드를 확인하는 모습')

{
  const post = posts.get('california-dmv-vehicle-registration-address-change')
  const oldImage = post.cover_image
  let content = removeImage(post.content, oldImage)
  content = replaceRequired(
    content,
    '</p><h2>사실 작년부터 조짐이 있었다</h2>',
    `</p><img class="rounded-lg" src="${imageUrls.registration}" alt="차량 등록 갱신과 주소 변경 전에 확인한 자동차 열쇠" width="75%"><p><strong>정보 확인일: ${checkedDate}</strong> · 내 계정에서 배우자 명의 차량이 처리되지 않았던 것은 실제 경험이다. 공식적으로 확인되는 기준은 <a target="_blank" rel="noopener noreferrer" href="https://www.dmv.ca.gov/portal/online-change-of-address-coa-system/">California DMV 주소 변경 안내</a>가 ‘본인 소유 차량만 변경할 수 있다’고 명시하고, 면허 주소만 바꾸면 차량 주소가 자동 변경되지 않는다고 설명한다는 점이다. 차량 주소 변경은 MyDMV garage에 차량을 추가해야 하며 처리에 최대 3일이 걸릴 수 있다. <a target="_blank" rel="noopener noreferrer" href="https://www.dmv.ca.gov/portal/vehicle-registration/vehicle-registration-renewal/">차량 등록 갱신 공식 안내</a>도 갱신 최소 3일 전에 주소를 바꾸라고 안내한다.</p><h2>사실 작년부터 조짐이 있었다</h2>`,
    'DMV sources',
  )
  content = content.replace('공식 안내 어디에도 그 얘긴 없다.', '공식 페이지에는 타인 차량의 주소를 바꿀 수 없다고 적혀 있지만, 실제 화면에서는 실패 이유가 분명하게 보이지 않았다.')
  updates.push({ post, values: { cover_image: imageUrls.registration, content }, removedAssets: [oldImage] })
}

{
  const post = posts.get('austin-texas-travel-plan')
  let content = replaceRequired(
    post.content,
    '</p><p>찾아보니 오스틴의 대표적인 곳들이',
    `</p><p><strong>아직 다녀온 후기가 아니다.</strong> ${checkedDate}에 공식 자료를 다시 확인해 만든 사전 계획이며, 다녀온 뒤 실제 이동 시간과 대기 시간을 보완할 예정이다. 다운타운 위치는 <a target="_blank" rel="noopener noreferrer" href="https://www.austintexas.org/plan-a-trip/visitor-center/">Austin Visitor Center</a>, 박쥐 관찰 시기와 위치는 <a target="_blank" rel="noopener noreferrer" href="https://www.austintexas.org/things-to-do/outdoors/bat-watching/">Visit Austin 박쥐 안내</a>, 수영장 운영·요금은 <a target="_blank" rel="noopener noreferrer" href="https://www.austintexas.gov/services/visit-barton-springs-pool">City of Austin Barton Springs 공식 안내</a>를 대조했다. 운영시간과 시설 상태는 바뀔 수 있어 출발 당일 다시 확인한다.</p><p>찾아보니 오스틴의 대표적인 곳들이`,
    'Austin methodology',
  )
  content = content.replace('수온이 대략 화씨 70도(섭씨 21도 안팎)라고 하니', '공식 안내의 평균 수온은 화씨 68~70도라고 하니')
  updates.push({ post, values: {
    title: '텍사스 오스틴 2일 여행 계획 | 공식 자료로 짠 다운타운 동선',
    meta_title: '오스틴 2일 여행 계획 | 공식 자료로 짠 핵심 동선',
    meta_description: '아직 방문 전인 오스틴 여행을 공식 관광·시청 자료로 설계했다. 의사당·SoCo·박쥐 다리·Barton Springs를 2일로 묶은 동선과 당일 재확인 항목을 정리했다.',
    content,
  }, removedAssets: [] })
}

{
  const post = posts.get('hypertension-cholesterol-korean-meal-plan')
  const oldImage = post.cover_image
  let content = removeImage(post.content, oldImage)
  const firstParagraphEnd = content.indexOf('</p>') + 4
  content = `${content.slice(0, firstParagraphEnd)}<img class="rounded-lg" src="${imageUrls.health}" alt="통곡물과 채소, 콩을 함께 담은 균형 잡힌 한 끼" width="75%"><p><strong>자료 확인일: ${checkedDate}</strong> · 이 표는 내가 건강 관리를 위해 <a target="_blank" rel="noopener noreferrer" href="https://www.nhlbi.nih.gov/health/dash-eating-plan">미국 NIH 산하 NHLBI의 DASH 식단</a>을 한식 재료로 다시 구성한 계획표다. 1인분별 영양 분석을 마친 치료식이나 개인 처방은 아니므로, ‘하루 30g’ 같은 수치는 실제 제품 라벨과 섭취량에 따라 달라진다. NHLBI는 일반 DASH 기준을 나트륨 2,300mg, 더 낮은 선택을 1,500mg으로 제시하지만 신장질환·당뇨·복용약이 있다면 의료진과 개인 기준을 먼저 정해야 한다.</p>${content.slice(firstParagraphEnd)}`
  updates.push({ post, values: {
    title: '고혈압·고지혈증 한식 식단표 | DASH 기준으로 짠 7일 계획',
    meta_title: '고혈압·고지혈증 한식 식단 | DASH 7일 계획표',
    meta_description: 'NIH DASH 기준을 한식 재료로 옮겨 구성한 7일 계획표. 치료식으로 단정하지 않고 나트륨·식이섬유 목표와 개인 질환에 따른 확인점을 공식 자료로 설명한다.',
    cover_image: imageUrls.health,
    content,
  }, removedAssets: [oldImage] })
}

{
  const post = posts.get('korea-us-package-tariff')
  const oldImage = post.cover_image
  const content = `<p>나는 한국 쇼핑몰에서 주문한 생활용품을 우체국으로 모아 미국에서 받아 쓰곤 했다. 예전에는 $800 이하 소포를 대체로 면세로 생각했지만, 2025년 8월 29일부터 미국의 저가 수입품 de minimis 적용이 중단되면서 계산 방식이 달라졌다. 이제는 물건값만 보고 주문하지 않고 <strong>품목·원산지·운송사가 산정한 세금과 수수료</strong>를 함께 확인한다.</p><img class="rounded-lg" src="${imageUrls.package}" alt="세관 신고서가 붙은 국제 배송 상자를 확인하는 모습" width="75%"><p><strong>정보 확인일: ${checkedDate}</strong> · 아래 내용은 <a target="_blank" rel="noopener noreferrer" href="https://www.help.cbp.gov/s/article/Article-1902">미국 CBP 국제우편 관세 안내</a>, <a target="_blank" rel="noopener noreferrer" href="https://www.cbp.gov/sites/default/files/2025-08/factsheet_suspension_of_duty-free_de_minimis_treatment.pdf">CBP de minimis 중단 자료</a>, <a target="_blank" rel="noopener noreferrer" href="https://www.whitehouse.gov/presidential-actions/2025/07/further-modifying-the-reciprocal-tariff-rates/">백악관 국가별 상호관세 표</a>를 대조했다.</p><h2>$800 이하 자동 면세가 중단된 것이 핵심</h2><p>CBP는 2025년 8월 29일부터 모든 국가의 $800 이하 수입품이 기존 de minimis 면세를 더 이상 자동 적용받지 않으며, 해당 관세·세금·수수료 대상이 된다고 설명한다. 그렇다고 <strong>모든 소포에 똑같은 금액이 무조건 붙는다는 뜻은 아니다.</strong> CBP 담당자가 신고가액, 품목, 원산지와 적용 예외를 보고 실제 금액을 결정한다.</p><h2>‘한국발이면 무조건 15%’로 계산하지 않는다</h2><p>백악관 표에는 한국의 상호관세율이 15%로 제시돼 있다. 하지만 실제 수입세액은 상품의 HTS 분류, 원산지, 기존 KORUS·MFN 세율, 품목별 추가관세와 면제 여부에 따라 달라질 수 있다. 그래서 예전 글의 “K뷰티·앨범·라면도 예외 없이 물건값의 15%”라는 문장과 단순 계산표는 삭제했다. 배송사가 청구한 금액이 예상과 다르면 적용 HS/HTS 코드와 수수료 항목부터 확인해야 한다.</p><h2>우편과 특송은 납부 방식이 다를 수 있다</h2><p>CBP 설명상 국제우편은 세관 심사 뒤 관세와 수수료가 있으면 지역 우체국을 통해 납부하는 방식이 일반적이다. FedEx·UPS·DHL 같은 특송은 운송사가 통관을 처리하고 수취인 또는 계약상 납부자에게 관세와 별도 통관 수수료를 청구할 수 있다. 한국 우체국 상품의 접수 가능 여부와 선납 방식은 바뀔 수 있으므로 발송 당일 <a target="_blank" rel="noopener noreferrer" href="https://ems.epost.go.kr/front.EmsDeliveryDelivery02.postal">우체국 EMS 요금·접수 안내</a>에서 확인한다.</p><h2>내가 주문 전에 확인하는 네 항목</h2><ol><li><p><strong>정확한 품명과 원산지</strong>: ‘gift’나 ‘goods’처럼 뭉뚱그리지 않고 실제 내용과 가액을 적는다.</p></li><li><p><strong>운임 포함 총비용</strong>: 상품가, 국제배송비, 예상 관세, 운송사 통관 수수료를 합쳐 미국 현지가와 비교한다.</p></li><li><p><strong>반입 제한</strong>: 식품·의약품·화장품은 관세 외에 FDA·USDA 등 별도 규정이 있을 수 있다.</p></li><li><p><strong>납부 주체</strong>: 판매자 선납인지 수취인 납부인지 결제 전 확인한다.</p></li></ol><h2>$100 선물 예외도 자동이라고 생각하지 않는다</h2><p>개인이 보내는 bona fide gift에는 별도 면세 규정이 적용될 수 있지만, 구매대행·직구 물건을 선물로 적는다고 바뀌지는 않는다. 발송 횟수, 수취인, 실제 가액과 내용에 따라 판단되므로 “$100 이하면 모두 면세”라고 단정하지 않고 CBP 또는 운송사에 확인한다. 허위·축소 신고는 피해야 한다.</p><h2>지금 남겨둘 결론</h2><p>바뀐 핵심은 $800 이하라는 이유만으로 자동 면세되던 경로가 사라졌다는 점이다. 반면 실제 세액은 상품마다 다르므로 15% 하나를 전체 주문에 곱하는 방식도 정확하지 않다. 나는 이제 한국에서 주문하기 전에 운송사가 보여주는 landed cost와 미국 현지가를 비교하고, 세금 계산 근거를 주문 화면이나 영수증으로 남긴다. 관세 정책은 자주 바뀌므로 실제 발송일의 CBP·운송사 안내가 이 글보다 우선한다.</p>`
  updates.push({ post, values: {
    title: '한국에서 미국으로 택배 보낼 때 관세 | $800 면세 중단 후 확인법',
    meta_title: '한국→미국 택배 관세 | $800 면세 중단 후 확인법',
    meta_description: '미국 $800 de minimis 중단 뒤 한국발 택배의 관세를 확인하는 법. 15% 일괄 계산 대신 품목·원산지·운송사 수수료와 CBP 공식 기준을 확인한다.',
    cover_image: imageUrls.package,
    content,
  }, removedAssets: [oldImage] })
}

{
  const post = posts.get('us-korea-what-to-buy')
  const oldImage = post.cover_image
  const verifiedImage = 'https://jcdznrqhpaezhleqxayt.supabase.co/storage/v1/object/public/blog-images/licensed/pexels-16739102.jpg'
  let content = removeImage(post.content, oldImage)
  if (!content.includes(verifiedImage)) throw new Error('gift guide: verified image not found')
  updates.push({ post, values: { cover_image: verifiedImage, content }, removedAssets: [oldImage] })
}

console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', posts: updates.map(({ post, values, removedAssets }) => ({
  slug: post.slug,
  oldChars: post.content.replace(/<[^>]+>/g, ' ').length,
  newChars: values.content.replace(/<[^>]+>/g, ' ').length,
  removedImages: removedAssets.length,
  title: values.title || post.title,
})) }, null, 2))

if (!applyChanges) process.exit(0)

// The tariff article is substantially rewritten. Keep the exact published version as a
// non-public draft so the operation is reversible without relying on storage deletion or Git.
const tariffPost = posts.get('korea-us-package-tariff')
const backupSlug = 'backup-korea-us-package-tariff-20260914'
const { data: existingBackup, error: backupReadError } = await supabase.from('posts').select('id').eq('slug', backupSlug).maybeSingle()
if (backupReadError) throw backupReadError
if (!existingBackup) {
  const { error: backupError } = await supabase.from('posts').insert({
    title: `[백업] ${tariffPost.title}`,
    slug: backupSlug,
    content: tariffPost.content,
    excerpt: tariffPost.excerpt || '',
    cover_image: tariffPost.cover_image,
    published: false,
    published_at: null,
    tags: tariffPost.tags || [],
    meta_title: tariffPost.meta_title,
    meta_description: tariffPost.meta_description,
    category: tariffPost.category,
    cluster: tariffPost.cluster,
    status: 'draft',
    social_hook: tariffPost.social_hook,
  })
  if (backupError) throw backupError
}

for (const { post, values, removedAssets } of updates) {
  const { error } = await supabase.from('posts').update({ ...values, updated_at: new Date().toISOString() }).eq('id', post.id)
  if (error) throw error
  for (const imageUrl of removedAssets) {
    const { error: assetError } = await supabase.from('image_assets').upsert({
      image_url: imageUrl,
      host: new URL(imageUrl).hostname,
      origin_type: 'unknown',
      rights_status: 'rejected',
      verification_note: `Removed from published post ${checkedDate}; original source and license were not documented.`,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'image_url' })
    if (assetError) throw assetError
  }
}
console.log(`Updated ${updates.length} watch posts.`)
