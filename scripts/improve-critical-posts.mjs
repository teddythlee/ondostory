import { createClient } from '@supabase/supabase-js'

const applyChanges = process.argv.includes('--apply')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const checkedDate = '2026-09-14'

function replaceRequired(content, before, after, label) {
  if (!content.includes(before)) throw new Error(`${label}: expected content not found`)
  return content.replace(before, after)
}

function replaceSection(content, startHeading, nextHeading, replacement, label) {
  const start = content.indexOf(startHeading)
  const end = content.indexOf(nextHeading, start + startHeading.length)
  if (start < 0 || end < 0) throw new Error(`${label}: section boundary not found`)
  return content.slice(0, start) + replacement + content.slice(end)
}

function externalLinkCount(content) {
  return [...content.matchAll(/<a\b[^>]+href=["']https?:/gi)].length
}

async function importPexelsPhoto(photo) {
  const response = await fetch(photo.imageUrl, { redirect: 'error' })
  if (!response.ok) throw new Error(`Pexels image download failed (${response.status})`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > 15_000_000) throw new Error('Unexpected Pexels image size')
  const storagePath = `licensed/pexels-${photo.id}.jpg`
  const { error: uploadError } = await supabase.storage.from('blog-images').upload(storagePath, bytes, {
    contentType: response.headers.get('content-type') || 'image/jpeg',
    cacheControl: '31536000',
    upsert: true,
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

const slugs = [
  'create-us-child-bank-account',
  'us-apartment-vs-house-rentals',
  'costco-beef-cuts-korean',
  'costco-fish-types-korean',
]
const { data: rows, error: readError } = await supabase.from('posts').select('*').in('slug', slugs)
if (readError) throw readError
if (rows?.length !== slugs.length) throw new Error(`Expected ${slugs.length} posts, found ${rows?.length || 0}`)
const posts = new Map(rows.map((post) => [post.slug, post]))
const updates = []

{
  const post = posts.get('create-us-child-bank-account')
  const oldCover = 'https://jcdznrqhpaezhleqxayt.supabase.co/storage/v1/object/public/blog-images/1784732632306-vyfryz9hvv.jpg'
  const oldBonusGraphic = 'https://jcdznrqhpaezhleqxayt.supabase.co/storage/v1/object/public/blog-images/1782317918098-24nkl96wzmyj.jpg'
  const newCover = applyChanges ? await importPexelsPhoto({
    id: '10972839',
    imageUrl: 'https://images.pexels.com/photos/10972839/pexels-photo-10972839.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    sourceUrl: 'https://www.pexels.com/photo/a-person-holding-a-bank-card-10972839/',
    creator: 'Towfiqu barbhuiya',
  }) : 'SELF_HOSTED_PEXELS_10972839'
  let content = post.content.replaceAll(oldCover, newCover)
  content = content.replace(new RegExp(`<img[^>]+src=["']${oldBonusGraphic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'g'), '')
  content = replaceRequired(
    content,
    '</p><h2>아이 계좌는 사실 세 종류다</h2>',
    `</p><p><strong>정보 확인일: ${checkedDate}</strong> · 아래 상품 조건과 보너스는 바뀔 수 있어 실제 신청 직전에 공식 페이지를 다시 확인했다.</p><h2>아이 계좌는 사실 세 종류다</h2>`,
    'child checked date',
  )
  content = replaceSection(
    content,
    '<h2>은행마다 크레딧(보너스)을 준다</h2>',
    '<h2>부모 계좌에 묶인다</h2>',
    `<h2>내가 받은 $125와 지금 확인되는 오퍼를 분리해서 봐야 한다</h2><p>내가 계좌를 열었을 때는 체이스 오퍼 코드를 사용해 $125를 받았다. 다만 이 금액을 상시 혜택처럼 보면 안 된다. <strong>${checkedDate}에 확인한 <a target="_blank" rel="noopener noreferrer" href="https://account.chase.com/consumer/banking/high-school-checking-account-offer">체이스 공식 오퍼</a>는 2026년 10월 14일까지 계좌를 열고, 등록 후 60일 안에 인정 거래 5회를 마치면 $125를 지급하는 조건</strong>이다. 인정 거래에는 데빗카드 구매뿐 아니라 Zelle, ACH 입금, QuickDeposit, 온라인 청구서 결제도 포함되고, 조건 완료 후 15일 안에 입금된다고 명시돼 있다.</p><p>따라서 이 글의 $125는 내 실제 수령 경험이면서 동시에 만료일이 있는 현재 오퍼다. 이 날짜가 지난 뒤에는 검색 결과의 숫자를 믿지 말고 공식 페이지에서 새 금액·기한·제외 조건을 다시 확인해야 한다.</p>`,
    'child bonus',
  )
  content = replaceSection(
    content,
    '<h2>데빗카드와 125불 받는 법</h2>',
    '<h2>대학생이 되면 어떻게 되나</h2>',
    `<h2>지점에서 실제로 한 순서</h2><ol><li><p>공식 오퍼 페이지에서 코드를 이메일로 받았다.</p></li><li><p>아이와 함께 지점을 방문해 계좌를 열고 데빗카드를 신청했다.</p></li><li><p>60일 안에 인정 거래 5회를 채웠다.</p></li><li><p>조건을 채운 뒤 약 보름 안에 아이 계좌로 $125가 들어오는지 확인했다.</p></li></ol><p>현재 공식 안내도 13~17세 자녀와 부모가 함께 지점에 와야 하고, 자녀는 허용되는 신분증 두 가지를 준비하라고 적고 있다. 필요한 서류는 체류 신분과 지점 확인에 따라 달라질 수 있으므로 <a target="_blank" rel="noopener noreferrer" href="https://www.chase.com/personal/checking/high-school-checking">체이스 High School Checking 공식 안내</a>와 예약 지점에 모두 확인하는 편이 안전하다.</p>`,
    'child branch steps',
  )
  content = replaceSection(
    content,
    '<h2>체이스가 아니어도 — Capital One MONEY 같은 대안</h2>',
    '<h2>크레딧은 언제 시작해줘야 하나 — 어소라이즈드 유저</h2>',
    `<h2>부모가 체이스를 쓰지 않는다면</h2><p>체이스 High School Checking은 부모의 적격 체이스 체킹 계좌와 연결해야 한다. 이 조건이 맞지 않으면 무리하게 부모 계좌부터 만들기보다 다른 틴 계좌를 비교하는 편이 낫다. 예를 들어 <a target="_blank" rel="noopener noreferrer" href="https://www.capitalone.com/bank/checking-accounts/checking-accounts-for-students/">Capital One 공식 안내</a>의 MONEY Teen Checking은 6세 이상 자녀와 부모·법정 보호자가 공동으로 신청할 수 있고, 월 수수료와 최소 잔액 조건이 없다고 안내한다. 부모와 자녀의 주소·생년월일·SSN 또는 ITIN 같은 정보가 필요하므로 기능뿐 아니라 준비 서류도 함께 비교해야 한다.</p>`,
    'child alternative',
  )
  content = replaceSection(
    content,
    '<h2>크레딧은 언제 시작해줘야 하나 — 어소라이즈드 유저</h2>',
    '<h2>목돈을 모아줄 땐 세금과 학자금을 먼저 봐라</h2>',
    `<h2>데빗카드는 돈 관리 연습이지 크레딧 쌓기는 아니다</h2><p>여기서 내가 처음 혼동한 부분이 있다. 아이가 본인 이름의 데빗카드를 써도 그 자체로 신용 이력이 생기는 것은 아니다. <a target="_blank" rel="noopener noreferrer" href="https://www.consumerfinance.gov/ask-cfpb/what-are-some-ways-to-start-or-rebuild-a-good-credit-history-en-2155/">미 소비자금융보호국(CFPB)</a>도 데빗카드와 현금 사용은 빚을 갚는 거래가 아니어서 신용 이력 형성에 도움이 되지 않는다고 설명한다.</p><p>부모 신용카드의 authorized user로 추가하는 방법은 카드사가 해당 정보를 신용평가사에 보고할 때만 도움이 될 수 있다. CFPB도 모든 발급사가 이를 보고하는 것은 아니라고 설명하므로, 카드사에 <strong>미성년 사용자도 보고하는지</strong>를 먼저 묻고 연체·높은 사용률이 자녀에게 미칠 영향까지 확인해야 한다.</p>`,
    'child credit',
  )
  content = replaceSection(
    content,
    '<h2>목돈을 모아줄 땐 세금과 학자금을 먼저 봐라</h2>',
    '<h2>자녀 계좌 개설 정보 요약</h2>',
    `<h2>목돈 계좌는 세금·학자금 성격이 완전히 다르다</h2><p>생활비를 쓰는 틴 체킹과 아이 소유의 UTMA/UGMA는 같은 ‘자녀 계좌’가 아니다. UTMA/UGMA에서 이자·배당 같은 불로소득이 생기면 kiddie tax 대상이 될 수 있다. <a target="_blank" rel="noopener noreferrer" href="https://www.irs.gov/taxtopics/tc553">IRS Topic 553</a>은 2026년 기준 자녀의 불로소득이 $2,700을 넘는 경우 Form 8615 규칙이 적용될 수 있다고 안내한다. 연령·부양·신고 조건이 함께 적용되므로 금액 하나만 보고 판단하면 안 된다.</p><p>학자금 신청에서도 구분이 필요하다. <a target="_blank" rel="noopener noreferrer" href="https://studentaid.gov/articles/things-you-need-for-fafsa/">Federal Student Aid의 FAFSA 준비 안내</a>는 학생이 소유한 UGMA/UTMA를 신고 대상 투자자산으로 열거한다. 대학 자금이 목적이라면 틴 체킹에 생활비를 넣는 문제와 UTMA·529 중 무엇을 쓸지는 따로 검토해야 한다.</p>`,
    'child tax aid',
  )
  content = content.replaceAll('rel="noopener noreferrer nofollow" href="/blog/', 'rel="noopener noreferrer" href="/blog/')
  updates.push({
    post,
    values: {
      cover_image: newCover,
      content,
      meta_title: '미국 자녀 은행계좌 만들기 | 체이스 틴 계좌 실제 개설',
      meta_description: '미국에서 11학년 자녀의 체이스 하이스쿨 체킹을 직접 개설한 순서와 준비물. 2026년 $125 오퍼 만료일, 대안 계좌, 데빗카드와 크레딧의 차이, UTMA 세금·FAFSA까지 공식 출처로 확인했다.',
    },
    removedAssets: [oldCover, oldBonusGraphic],
  })
}

{
  const post = posts.get('us-apartment-vs-house-rentals')
  let content = replaceRequired(
    post.content,
    '<p>집주인이 보수적인 데는 이유가 있다. <strong>캘리포니아는 테넌트 보호가 강한 주</strong>라 세입자가 월세를 밀려도 바로 내보내기 어렵고, 법적 절차도 길고 비용도 든다. 그래서 처음부터 가장 안정적인 세입자를 고르려 한다. 결국 렌트비는 하우스가 싸 보여도 <strong>실제 입주 허들은 아파트보다 훨씬 높았다.</strong></p>',
    `<p>내가 지원했을 때 개인 집주인이 소득과 렌트 이력을 더 꼼꼼히 본 이유도 이해는 됐다. 캘리포니아에서 퇴거는 집주인이 임의로 자물쇠를 바꾸는 방식이 아니라 통지와 법원 절차를 거쳐야 한다. <a target="_blank" rel="noopener noreferrer" href="https://selfhelp.courts.ca.gov/eviction">California Courts의 퇴거 절차 안내</a>를 보면 통지, 소송, 판결, sheriff 집행 순서가 명시돼 있다. 다만 이것이 모든 하우스가 ‘월세 3배’나 특정 크레딧 점수를 법으로 요구한다는 뜻은 아니다. 그 숫자는 내가 본 매물의 심사 기준이었고 집주인·관리회사마다 달랐다.</p>`,
    'rental eviction',
  )
  content = replaceSection(
    content,
    '<h2>신용·렌트 이력이 없다면 — 아파트 들어가는 법</h2>',
    '<h2>렌트 말고 \'진짜\' 월 비용</h2>',
    `<h2>신용·렌트 이력이 없을 때 실제로 준비한 것</h2><p>정착 초기에는 더 많은 돈을 무조건 먼저 내겠다고 제안하기보다, 신청 전에 리싱 오피스나 집주인에게 심사 기준을 서면으로 묻는 편이 안전하다. 나는 다음 자료를 한 묶음으로 준비하는 방식이 가장 실용적이었다.</p><ul><li><p><strong>소득 자료</strong>: 오퍼레터, 최근 페이스텁, 필요한 경우 은행 잔고 증명</p></li><li><p><strong>신원·거주 자료</strong>: 사진 신분증과 이전 주소, 연락 가능한 이전 집주인 정보</p></li><li><p><strong>대체 조건 확인</strong>: 렌트 이력이 없을 때 보증인(co-signer)을 받는지, 어떤 추가 서류를 인정하는지 신청 전에 질문</p></li><li><p><strong>비용 확인</strong>: 신청비를 내기 전에 환불 여부, 심사 기준, 보증금과 입주 시 총액을 서면으로 확인</p></li></ul><p><strong>${checkedDate} 기준 캘리포니아의 일반적인 주거용 보증금 한도는 월세 1개월분</strong>이다. 소규모 개인 집주인에게는 일정 조건에서 2개월분 예외가 있다. <a target="_blank" rel="noopener noreferrer" href="https://oag.ca.gov/system/files/media/Know-Your-Rights-Security-Deposits-English.pdf">캘리포니아 법무부 보증금 안내</a>에 명시된 내용이므로, ‘신용이 없으니 보증금을 원하는 만큼 더 내면 된다’거나 ‘몇 달치를 선납하면 승인된다’고 일반화하면 안 된다. 실제 제안은 현재 법과 해당 계약서를 먼저 확인해야 한다.</p>`,
    'rental application',
  )
  content = replaceRequired(
    content,
    '<p>둘의 부가 비용 차이가 생각보다 작았던 데는 이유가 있다. 이런 계획 단지의 하우스에는 <strong>HOA(관리비)</strong>가 붙고 이게 꽤 큰데, <strong>세입자가 아니라 집주인이 부담</strong>한다. 그래서 렌트에 더해 내가 매달 내는 부가 비용은 낮게 유지됐다. 결국 월 부담을 가르는 건 잡비가 아니라 렌트 자체와, 하우스에서 늘어나는 \'내 시간과 손\'이다.</p>',
    '<p>내가 계약한 하우스에서는 HOA 비용을 집주인이 부담해 별도 청구가 없었다. 하지만 이것은 모든 하우스의 공통 규칙이 아니라 <strong>매물과 리스 계약에 따라 달라지는 항목</strong>이다. 그래서 렌트 숫자만 비교하지 않고 HOA 전가 여부, 정원 관리, 유틸리티, 수리 연락 창구를 계약 전에 한 줄씩 확인했다. 결국 월 부담을 가르는 건 렌트 자체와 하우스에서 늘어나는 시간·관리 책임이었다.</p>',
    'rental hoa',
  )
  content = replaceRequired(
    content,
    '<p>아파트의 가장 큰 장점은 관리다. 에어컨이 고장 나거나 수도 문제가 생기면 Maintenance 요청만 하면 된다. 온라인으로 접수되고 비교적 빨리 처리된다.</p>',
    '<p>아파트에서 내가 가장 크게 체감한 장점은 관리 창구가 하나라는 점이었다. 에어컨이나 수도 문제가 생겼을 때 온라인 Maintenance로 접수하고 처리 기록을 남길 수 있었다. 법적 수리 책임의 범위와 별개로 실제 처리 속도는 관리회사와 문제 유형에 따라 다르므로, 입주 전에는 긴급 수리 연락처와 접수 방식을 확인하는 편이 좋다. 현재 캘리포니아의 수리·보증금·계약 기준은 <a target="_blank" rel="noopener noreferrer" href="https://www.dre.ca.gov/publications/ResourceGuidebook/2026_Landlord_Tenant_Guide.pdf">2026 California Tenants Guide</a>에서 확인할 수 있다.</p>',
    'rental maintenance',
  )
  content = content.replaceAll('rel="noopener noreferrer nofollow" href="/blog/', 'rel="noopener noreferrer" href="/blog/')
  updates.push({
    post,
    values: {
      title: '미국 아파트 렌트 vs 하우스 렌트 | 둘 다 살아보고 달랐던 비용·관리',
      content,
      meta_title: '미국 아파트 vs 하우스 렌트 | 실제 비용·관리 차이',
      meta_description: '오렌지카운티에서 아파트와 하우스 렌트를 모두 겪고 비교했다. 실제 월 부대비용, 심사 기준, 관리·소음 차이와 캘리포니아 보증금 한도를 공식 자료로 확인했다.',
    },
    removedAssets: [],
  })
}

{
  const post = posts.get('costco-beef-cuts-korean')
  const firstHeading = '<h2>코스트코에서 실제로 담아온 부위들</h2>'
  const headingIndex = post.content.indexOf(firstHeading)
  if (headingIndex < 0) throw new Error('beef first heading not found')
  const cover = 'https://jcdznrqhpaezhleqxayt.supabase.co/storage/v1/object/public/blog-images/1784675033668-3wo8ouisjqd.jpg'
  let content = `<p>코스트코에서 소고기를 살 때 내가 필요한 건 부위 백과사전이 아니라 <strong>영어 라벨을 보고 오늘 만들 한식에 맞는 팩을 고르는 기준</strong>이었다. 며칠 동안 터스틴 매장의 라벨을 직접 찍고, 미국식 절단명과 한국에서 익숙한 용도를 대조했다. 이 글의 가격은 사진을 찍은 날의 매장 표시값이며 현재 판매가를 뜻하지 않는다.</p><img class="rounded-lg" src="${cover}" alt="미국 소고기 절단 위치와 코스트코 영어 라벨을 함께 보는 그림" width="75%"><p>미국식 cut과 한국식 부위는 절단 방식이 달라 완전한 1:1 번역이 아니다. 그래서 아래에서는 ‘같은 부위’라고 단정하기보다 <strong>어느 primal에서 나오고 어떤 조리에 가까운지</strong>를 기준으로 적었다. 미국 부위 위치와 표준 명칭은 <a target="_blank" rel="noopener noreferrer" href="https://www.beefitswhatsfordinner.com/cuts/cut-charts">Beef Cut Charts</a>, 등급 설명은 <a target="_blank" rel="noopener noreferrer" href="https://ask.fsis.usda.gov/article/What-do-beef-grades-mean">USDA FSIS의 Prime·Choice·Select 안내</a>와 대조했다. 실제 한식 용도와 가격 판단은 내가 찍은 라벨과 집에서 쓰는 방식을 바탕으로 했다.</p><p>장보기 순서는 간단했다. <strong>국·장조림이면 chuck·brisket·round를 먼저 보고, 센 불에 짧게 구울 거면 loin·rib·skirt 쪽을 본다.</strong> 그다음 두께, 결 방향, 팩 무게를 확인했다.</p><h2>사진 속 코스트코 라벨을 이렇게 읽었다</h2>` + post.content.slice(headingIndex + firstHeading.length)
  content = content.replace('<h2>미국 라벨 ↔ 한국 부위 대응표</h2>', '<h2>한식 메뉴에서 거꾸로 찾는 라벨표</h2>')
  content = content.replace('<h2>한국 요리에 맞춰 고기를 집는 기준</h2>', '<h2>내 장바구니 기준: 요리부터 정하고 부위를 골랐다</h2>')
  content = content.replace('<h2>부위 선택할 때 헷갈리는 질문</h2>', '<h2>라벨 앞에서 마지막으로 확인할 것</h2>')
  content = content.replaceAll('rel="noopener noreferrer nofollow" href="/blog/', 'rel="noopener noreferrer" href="/blog/')
  updates.push({
    post,
    values: {
      title: '코스트코 소고기 라벨 해석 | 불고기·국거리·구이용 영어 부위 찾기',
      content,
      meta_title: '코스트코 소고기 라벨 | 불고기·국거리 영어 부위',
      meta_description: '터스틴 코스트코 정육 라벨을 직접 찍어 미국식 소고기 부위를 한식 용도로 해석했다. 불고기·국거리·장조림·구이용 라벨과 USDA 등급을 실제 팩 기준으로 찾는다.',
    },
    removedAssets: [],
  })
}

{
  const post = posts.get('costco-fish-types-korean')
  const firstHeading = '<h2>코스트코에서 담아온 생선들</h2>'
  const headingIndex = post.content.indexOf(firstHeading)
  if (headingIndex < 0) throw new Error('fish first heading not found')
  const cover = 'https://jcdznrqhpaezhleqxayt.supabase.co/storage/v1/object/public/blog-images/1785727358213-axnawq2m37.jpg'
  let content = `<p>이번 장보기에서 가장 궁금했던 건 생선 이름의 번역보다 <strong>락피시로 매운탕을 끓였을 때 한국에서 먹던 맛이 나는지, 그리고 코스트코 생선을 회로 먹어도 되는지</strong>였다. 터스틴 매장에서 라벨을 찍고 락피시는 직접 끓여봤다. 결론부터 말하면 매운탕 맛은 만족스러웠지만 생선 자체의 냄새는 강했고, 회로는 먹지 않았다.</p><img class="rounded-lg" src="${cover}" alt="터스틴 코스트코 수산 코너에서 확인한 생선 라벨" width="50%"><p>우리 집의 평소 생선 반찬은 한인마트 냉동 저염 임연수·고등어 구이다. 코스트코에서는 익숙한 연어 외에 rockfish, Pacific cod, tilapia, branzino를 보고 ‘오늘 할 조리’에 맞춰 골랐다. 아래 가격·원산지는 사진을 찍은 날의 라벨 기록이라 매장과 시기에 따라 달라질 수 있다.</p><h2>먹어본 결과와 다음에 살 기준</h2>` + post.content.slice(headingIndex + firstHeading.length)
  content = content.replace('<h2>미국 라벨 ↔ 한국 생선 대응표</h2>', '<h2>탕·구이·전 중 무엇을 할지부터 정했다</h2>')
  content = content.replace('<h2>손질·보관·생식 전에 확인할 점</h2>', '<h2>회보다 가열을 택한 이유</h2>')
  content = replaceRequired(
    content,
    '<p>괜찮다. 잡은 뒤 신선도를 위해 배·가공 단계에서 한 번 냉동했다가 해동해 파는 것이라, 해동 상태로 <strong>대구탕·맑은탕·대구전</strong>에 그대로 쓰면 된다. 다만 이미 해동된 거라 다시 얼리기보다 며칠 안에 조리하는 게 좋다.</p>',
    '<p>라벨의 previously frozen은 이전에 냉동됐다가 판매를 위해 해동됐다는 뜻이다. 냉장 상태가 계속 유지됐다면 조리해 먹을 수 있고, <a target="_blank" rel="noopener noreferrer" href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/freezing-and-food-safety">USDA 냉동·재냉동 안내</a>에 따르면 적절히 취급된 소매점의 previously frozen 생선은 재냉동도 가능하다. 다만 해동 과정에서 수분이 빠져 품질은 떨어질 수 있어 나는 살 양만 사고 빠르게 조리하는 쪽을 택했다.</p>',
    'fish refreeze',
  )
  content = replaceRequired(
    content,
    '<p>권하지 않습니다. 라벨이 전부 <strong>가열조리용(cook to 145°F)</strong>이고 생식용으로 파는 게 아니라서, 기생충 안전 기준(생식용 냉동)을 보증하지 않습니다. 회는 생식용으로 파는 곳에서 드시는 게 안전합니다.</p>',
    '<p>나는 회로 먹지 않았다. 매장에서 본 라벨은 145°F 가열을 안내했고 생식용 냉동 이력을 확인할 자료가 없었다. <a target="_blank" rel="noopener noreferrer" href="https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely">FDA의 생선 선택·섭취 안내</a>도 가장 안전한 방법은 충분히 익히는 것이며, 날로 먹는다면 previously frozen 생선을 선택하는 것이 기본 원칙이라고 설명한다. 단순히 ‘한 번 얼었다’는 표시만 보고 FDA Food Code의 기생충 제어 시간·온도 조건까지 충족했다고 추정해서는 안 된다.</p>',
    'fish raw',
  )
  content = replaceRequired(
    content,
    '<p>회로 드시는 분도 많지만, <strong>코스트코 수산 코너 연어도 라벨은 가열조리(cook to 145°F) 표기</strong>이지 생식용으로 파는 게 아니다. 양식 연어가 자연산보다 기생충 위험이 낮다고 알려져 있긴 하지만, 라벨이 생식용 냉동 기준을 보증하는 건 아니다. <strong>우리 집은 회로는 안 먹고 버터 구이로</strong> 즐긴다. 생식 여부는 각자 안전을 판단해 결정하는 게 맞다.</p>',
    '<p><strong>우리 집은 코스트코 연어를 회로 먹지 않고 버터 구이로</strong> 먹는다. 판매 라벨이 145°F 가열을 안내하고 생식용 취급 이력을 확인하지 못했기 때문이다. 정부의 <a target="_blank" rel="noopener noreferrer" href="https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures">안전 내부온도표</a>는 생선 필렛과 통생선을 145°F(63°C), 또는 살이 불투명해지고 포크로 쉽게 갈라질 때까지 익히라고 안내한다.</p>',
    'fish salmon raw',
  )
  content = content.replace('<h2>오늘 요리에 맞춰 생선을 고른다면</h2>', '<h2>다시 산다면 이렇게 고른다</h2>')
  content = content.replaceAll('rel="noopener noreferrer nofollow" href="/blog/', 'rel="noopener noreferrer" href="/blog/')
  updates.push({
    post,
    values: {
      title: '코스트코 생선 고르기 | 락피시 매운탕 후기와 회로 먹지 않은 이유',
      content,
      meta_title: '코스트코 생선 고르기 | 락피시 매운탕 실제 후기',
      meta_description: '터스틴 코스트코 락피시로 매운탕을 끓여본 결과와 대구·틸라피아·브란지노·연어 선택 기준. 라벨 가격, 재냉동, 생식과 145°F 가열 기준을 공식 자료로 확인했다.',
    },
    removedAssets: [],
  })
}

console.log(JSON.stringify({
  mode: applyChanges ? 'apply' : 'dry-run',
  posts: updates.map(({ post, values }) => ({
    slug: post.slug,
    oldChars: post.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length,
    newChars: values.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length,
    oldExternalLinks: externalLinkCount(post.content),
    newExternalLinks: externalLinkCount(values.content),
    title: values.title || post.title,
  })),
}, null, 2))

if (!applyChanges) process.exit(0)

for (const { post, values, removedAssets } of updates) {
  const { error } = await supabase.from('posts').update({ ...values, updated_at: new Date().toISOString() }).eq('id', post.id)
  if (error) throw error
  for (const imageUrl of removedAssets) {
    const { error: assetError } = await supabase.from('image_assets').update({
      rights_status: 'rejected',
      verification_note: `Removed from published post ${checkedDate}; original source and license were not documented.`,
      updated_at: new Date().toISOString(),
    }).eq('image_url', imageUrl)
    if (assetError) throw assetError
  }
}

console.log(`Updated ${updates.length} critical posts.`)
