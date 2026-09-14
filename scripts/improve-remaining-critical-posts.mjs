import { createClient } from '@supabase/supabase-js'

const applyChanges = process.argv.includes('--apply')
const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const name of requiredEnv) if (!process.env[name]) throw new Error(`Missing ${name}`)

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const checkedDate = '2026-09-14'

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

function textLength(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length
}

const slugs = ['visa-bulletin-where-to-check', 'back-to-school-shopping-list', 'review-crystal-cove-irvines-best']
const { data: rows, error: readError } = await supabase.from('posts').select('*').in('slug', slugs)
if (readError) throw readError
if (rows?.length !== slugs.length) throw new Error(`Expected ${slugs.length} posts, found ${rows?.length || 0}`)
const posts = new Map(rows.map((post) => [post.slug, post]))

const visaPhoto = {
  id: '11773871',
  imageUrl: 'https://images.pexels.com/photos/11773871/pexels-photo-11773871.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  sourceUrl: 'https://www.pexels.com/photo/a-person-holding-black-pen-pointing-on-calendar-11773871/',
  creator: 'Towfiqu barbhuiya',
}
const schoolPhoto = {
  id: '5905436',
  imageUrl: 'https://images.pexels.com/photos/5905436/pexels-photo-5905436.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  sourceUrl: 'https://www.pexels.com/photo/school-desk-with-stationery-and-backpacks-on-chairs-5905436/',
  creator: 'Katerina Holmes',
}

const visaCover = applyChanges ? await importPexelsPhoto(visaPhoto) : 'SELF_HOSTED_PEXELS_11773871'
const schoolCover = applyChanges ? await importPexelsPhoto(schoolPhoto) : 'SELF_HOSTED_PEXELS_5905436'

const updates = [
  {
    post: posts.get('visa-bulletin-where-to-check'),
    values: {
      title: '비자 불러틴 보는 법 | 국무부 표와 USCIS 적용 차트 확인 순서',
      meta_title: '비자 불러틴 보는 법 | 국무부·USCIS 차트 확인',
      cover_image: visaCover,
      meta_description: 'F2A 영주권 절차를 진행하며 매달 확인한 방식대로, 국무부 비자 불러틴에서 카테고리·국가·우선일자를 찾고 USCIS 적용 차트를 대조하는 순서를 공식 링크와 함께 정리했다.',
      content: `<p>F2A 영주권 절차를 진행하면서 나는 매달 비자 불러틴 발표를 기다려봤다. 처음에는 검색 결과의 요약 글을 보다가 이미 새 표가 나왔는데도 이전 달 자료를 보고 “아직 안 나왔나”라고 착각했다. 그 뒤로는 <strong>국무부 원본과 USCIS 적용 차트 페이지 두 곳만</strong> 즐겨찾기에 넣고 확인한다.</p><img class="rounded-lg" src="${visaCover}" alt="매달 비자 불러틴 확인 날짜를 달력에 표시하는 모습" width="75%"><p><strong>정보 확인일: ${checkedDate}</strong> · 비자 문호와 적용 차트는 매달 달라진다. 이 글은 내 사례의 승인 가능일을 예측하는 글이 아니라, 공식 표를 잘못 보지 않기 위한 확인 순서다.</p><h2>1. 국무부 페이지에서 해당 월 원본을 연다</h2><p>원본은 미 국무부의 <a target="_blank" rel="noopener noreferrer" href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html">Visa Bulletin 공식 목록</a>이다. 페이지 상단의 Current Visa Bulletin에서 확인할 월을 열고, 표의 날짜 형식이 <strong>일-영문 월-연도(dd-mmm-yy)</strong>라는 점부터 확인한다. 검색 결과 제목만 보고 들어가지 않고 주소가 travel.state.gov인지 확인하니 오래된 표를 보는 실수가 줄었다.</p><p>발표일을 “매달 며칠”로 고정해 기다리지는 않는다. 국무부가 다음 달 불러틴을 미리 게시하는 경우가 많지만 고정된 보장 일정을 찾지 못했기 때문이다. 그래서 월 중순 무렵부터 공식 목록의 Current와 Upcoming 항목이 바뀌었는지를 본다.</p><h2>2. 내 카테고리와 출생국 열을 찾는다</h2><p>가족초청은 F1·F2A·F2B·F3·F4, 취업이민은 EB 분류에서 본인 카테고리를 찾는다. 그다음 국적이 아니라 일반적으로 <strong>chargeability country(대개 출생국)</strong>에 맞는 열을 선택한다. 한국처럼 별도 열이 없는 경우에는 보통 “All Chargeability Areas Except Those Listed” 열을 보지만, 교차 적용처럼 예외가 있을 수 있어 개인 사건은 서류와 공식 지침을 함께 확인해야 한다.</p><p>표의 <strong>C</strong>는 current, <strong>U</strong>는 unavailable을 뜻한다. 날짜가 적혀 있다면 내 priority date가 표의 cut-off date보다 앞선지 비교한다. 경계 날짜나 카테고리가 헷갈리면 표만으로 접수 결정을 내리지 않는다.</p><h2>3. 두 표의 역할을 나눠서 읽는다</h2><table><tbody><tr><td><strong>표</strong></td><td><strong>확인 목적</strong></td></tr><tr><td>Final Action Dates</td><td>비자 번호가 최종 승인 단계에 사용 가능한지 보는 기준</td></tr><tr><td>Dates for Filing</td><td>서류 제출 준비·접수가 가능한 범위를 보는 기준</td></tr></tbody></table><p>두 표 중 날짜가 더 빠른 쪽만 골라 보면 안 된다. 특히 미국 안에서 I-485 신분조정을 신청하려면 USCIS가 그 달에 어느 표를 사용하라고 공지했는지 별도로 확인해야 한다.</p><h2>4. USCIS에서 그 달의 접수용 차트를 다시 확인한다</h2><p><a target="_blank" rel="noopener noreferrer" href="https://www.uscis.gov/visabulletininfo">USCIS Adjustment of Status Filing Charts</a>에서 가족초청과 취업이민 중 해당 항목을 연다. USCIS는 비자 수가 충분하다고 판단할 때 Dates for Filing 사용을 허용할 수 있고, 그렇지 않으면 Final Action Dates를 사용하도록 안내한다. 예전 글에 있던 “국무부 발표 뒤 1~2일이면 반드시 올라온다”는 문장은 공식 보장 일정이 아니어서 뺐다.</p><ol><li><p>국무부 공식 목록에서 정확한 월을 연다.</p></li><li><p>가족·취업 카테고리와 chargeability 열을 찾는다.</p></li><li><p>Final Action Dates와 Dates for Filing을 구분한다.</p></li><li><p>미국 내 신분조정이라면 USCIS의 그 달 적용 표를 확인한다.</p></li><li><p>내 priority date와 cut-off date를 비교하고 캡처 대신 원문 링크를 기록한다.</p></li></ol><p>나는 이 순서로 바꾼 뒤 사설 사이트의 지난달 표를 보고 헤매는 일이 없어졌다. 문호가 가까워졌다면 <a href="/blog/korea-documents-us-immigration">한국 서류 번역·공증 준비 경험</a>도 함께 확인하되, 실제 접수 가능 여부는 최신 공식 공지와 본인 사건의 법률 자문을 기준으로 판단해야 한다.</p>`,
    },
    removedAssets: [posts.get('visa-bulletin-where-to-check').cover_image],
  },
  {
    post: posts.get('back-to-school-shopping-list'),
    values: {
      title: '미국 백투스쿨 준비물 | 매년 사보고 줄인 학년별 장보기',
      meta_title: '미국 백투스쿨 준비물 | 실제로 줄인 학년별 장보기',
      cover_image: schoolCover,
      meta_description: '미국에서 자녀의 백투스쿨 준비물을 매년 사며 줄인 장보기 순서. 초·중·고 공통품과 계산기·크롬북을 언제 학교에 먼저 확인해야 하는지 실제 시행착오와 공식 시험 정책으로 정리했다.',
      content: `<p>미국에서 아이의 백투스쿨 준비물을 매년 사 봤지만, 가장 돈을 아낀 해는 세일 물건을 많이 산 해가 아니었다. <strong>집에 남은 물건을 먼저 꺼내고, 학교 리스트가 오기 전에는 기본품만 산 해</strong>였다. 초등 때 필요했던 교실 공용 티슈가 다음 해에는 없었고, 중·고등에서는 과목 선생님이 첫 주에 별도 목록을 주기도 했다.</p><img class="rounded-lg" src="${schoolCover}" alt="교실 책상과 의자에 놓인 실제 백팩과 학용품" width="75%"><p>아래는 모든 학교의 필수품을 단정한 표가 아니라 우리 집이 반복 구매를 줄이려고 쓰는 순서다. 가격과 기기 정책은 달라지므로 <strong>${checkedDate}에 시험기관 정책을 다시 확인</strong>했고, 최종 기준은 자녀 학교와 과목별 안내다.</p><h2>우리 집은 세 번에 나눠 산다</h2><ol><li><p><strong>학교 리스트 전</strong>: 작년 백팩·바인더·가위·계산기가 남아 있는지 확인하고, 연필과 공책처럼 반드시 쓰는 소모품만 산다.</p></li><li><p><strong>학교 리스트 후</strong>: 규격이 적힌 폴더, 노트, 미술용품을 맞춰 산다. 아마존은 같은 제품을 다시 주문하기 편했고 타겟·월마트는 크기와 재질을 직접 보기 좋았다.</p></li><li><p><strong>개학 첫 주 후</strong>: 과목별 계산기, 헤드폰, 특정 바인더처럼 교사가 지정한 물건만 추가한다.</p></li></ol><p>예전에는 7월 세일을 보고 다음 학년 것까지 미리 사두기도 했다. 하지만 싸게 산 물건도 아이가 쓰지 않으면 절약이 아니었다. 이제는 매장별 행사 시기를 고정 공식처럼 적지 않고, 같은 규격의 단가와 배송일을 그때 비교한다.</p><h2>학년이 달라도 먼저 확인하는 기본품</h2><ul><li><p>매일 메는 백팩, 물통, 필요한 경우 도시락통</p></li><li><p>#2 연필·지우개·공책·폴더·필통</p></li><li><p>가위와 풀 등 학교 리스트에 적힌 소모품</p></li></ul><p>우리 아이의 백팩은 한 학년이 끝나기 전에 심하게 망가진 적이 있어 이후에는 지퍼와 바닥 봉제를 먼저 봤다. 필기구도 부모가 대량으로 고르기보다 아이에게 물어봤다. 연필만 쓰던 아이가 굵은 0.7mm 샤프를 선호하게 된 뒤로는 안 쓰는 필기구를 사는 일이 줄었다.</p><h2>초등: 공용 물품은 작년 기억보다 올해 목록</h2><p>초등 때는 크레용, 워셔블 마커, 색연필, 안전가위, 풀 스틱처럼 소모가 빠른 물건이 많았다. 티슈나 물티슈를 교실 공용으로 보내달라는 해도 있었지만 계속 같은 요구가 나오지는 않았다. 그래서 ‘미국 초등학교는 반드시 기부해야 한다’고 일반화하지 않고, 교사 목록에 수량과 공용 여부가 적혔을 때만 챙긴다.</p><h2>중등: 과목 이동을 버티는 정리 도구</h2><p>중학교부터는 물건 수보다 정리 방식이 더 중요했다. 3링 바인더와 과목별 디바이더, 형광펜, 플래너를 후보로 두되 학교가 요구한 규격을 확인한다. 기본 공학용 계산기도 수업에 따라 모델 요구가 다르므로 “TI-30X면 무조건 충분하다”기보다 수학 교사에게 먼저 묻는 편이 안전하다.</p><h2>고등: 계산기와 노트북은 먼저 사지 않는다</h2><p>그래핑 계산기는 비싸고 시험 정책도 같지 않다. 현재 <a target="_blank" rel="noopener noreferrer" href="https://satsuite.collegeboard.org/in-school-assessments/calculator-policy">College Board SAT 계산기 정책</a>은 Bluebook 내장 Desmos 또는 허용되는 비-CAS 휴대용 계산기를 쓸 수 있다고 안내한다. <a target="_blank" rel="noopener noreferrer" href="https://apcentral.collegeboard.org/exam-administration-ordering-scores/administering-exams/exam-policies/calculator-policy">AP 계산기 정책</a>은 과목별로 다르고, <a target="_blank" rel="noopener noreferrer" href="https://www.act.org/content/act/en/products-and-services/the-act/test-day/calculator-policy.html">ACT 정책</a>도 별도다. 따라서 TI-84를 SAT·ACT·AP의 공통 ‘표준’이라고 단정하지 않고, 수강 과목과 응시 시험의 최신 정책을 확인한 뒤 새 제품이나 중고를 고른다.</p><p>노트북·크롬북도 마찬가지다. 학교가 대여하는지, 개인 기기 사용이 가능한지, 헤드폰 규격이 무엇인지 확인하기 전에는 사지 않는다. 특히 시험용 Bluebook은 개인 Chromebook을 지원하지 않고 학교 관리 Chromebook만 허용한다고 안내하므로, ‘Chromebook이면 다 된다’고 생각하면 안 된다.</p><h2>이번 주에 바로 할 체크</h2><ul><li><p>작년 가방과 서랍에서 재사용할 물건을 한곳에 모은다.</p></li><li><p>학교·교사 리스트에서 규격과 수량을 표시한다.</p></li><li><p>아이가 실제로 쓰는 필기구 취향을 묻는다.</p></li><li><p>계산기와 기기는 학교 대여·수업·시험 정책을 확인한 뒤 산다.</p></li></ul><p>우리 집 기준으로 가장 효과가 컸던 절약은 예상 비용표를 만드는 것이 아니라 구매를 늦출 항목을 정하는 일이었다. 기본품은 미리, 과목 전용품은 목록 뒤, 고가 기기는 확인 뒤라는 세 단계만 지켜도 남는 물건이 확실히 줄었다. 문구류 선택지가 궁금하다면 <a href="/blog/us-daiso-vs-korea-daiso">미국 다이소에서 직접 본 차이</a>, 중고 계산기를 찾는다면 <a href="/blog/us-secondhand-marketplace-apps">미국 중고거래 앱 경험</a>으로 이어서 볼 수 있다.</p>`,
    },
    removedAssets: [
      posts.get('back-to-school-shopping-list').cover_image,
      'https://jcdznrqhpaezhleqxayt.supabase.co/storage/v1/object/public/blog-images/1784731995853-02zlf9mfzd2m.jpg',
    ],
  },
  {
    post: posts.get('review-crystal-cove-irvines-best'),
    values: {
      title: '크리스탈 코브 후기 | 자주 가며 정한 주차장·산책 코스',
      meta_title: '크리스탈 코브 후기 | 실제 주차장·산책 코스',
      meta_description: '얼바인에서 크리스탈 코브를 여러 번 다녀오며 정한 주차장 선택법과 블러프·해변 산책 코스. 실제 주차 시행착오와 석양 귀가 팁, 최신 운영시간·주차비를 공식 자료로 확인했다.',
      content: `<img class="rounded-lg" src="${posts.get('review-crystal-cove-irvines-best').cover_image}" alt="크리스탈 코브 해변에서 직접 본 석양" width="75%"><p>얼바인에서 특별한 계획 없이 바다를 보고 싶을 때 우리 가족이 자주 찾게 된 곳이 Crystal Cove State Park다. 차로 20~30분 정도였지만, 처음 몇 번은 목적지를 정하지 않고 들어갔다가 넓은 주차장을 돌거나 원하는 해변과 먼 곳에 차를 댔다. 여러 번 다녀온 뒤에는 <strong>무엇을 할지 먼저 정하고 주차장을 고르는 것</strong>이 가장 중요하다는 결론이 남았다.</p><p><strong>정보 확인일: ${checkedDate}</strong> · 아래 운영시간과 요금은 <a target="_blank" rel="noopener noreferrer" href="https://www.parks.ca.gov/644">California State Parks의 Crystal Cove 공식 페이지</a>와 공원 안내지를 대조했다. 날씨·공사·특별요금은 방문 당일 다시 확인해야 한다.</p><h2>내가 주차장을 고르는 기준</h2><ul><li><p><strong>Los Trancos</strong>: 터널을 지나 Historic District와 Beachcomber Café 쪽으로 갈 때 선택한다.</p></li><li><p><strong>Reef Point</strong>: 절벽 위 전망과 해변을 섞어 걸을 때 편했다.</p></li><li><p><strong>Pelican Point</strong>: 북쪽 해변과 타이드풀 쪽을 볼 때 후보로 둔다.</p></li><li><p><strong>Moro</strong>: 해변 산책보다 백컨트리 하이킹이 목적일 때 맞다.</p></li></ul><p>우리는 오후에 방문하는 날이 많았고, 날씨 좋은 날에는 빈자리를 찾느라 주차장을 몇 바퀴 돈 적도 있었다. 그래서 주말에는 오전에 움직이고, 출발 전에 내비게이션 목적지를 공원 이름이 아니라 주차장 이름으로 잡는다. 얼바인에서는 405 또는 73번 도로에서 PCH로 이어지지만 교통에 따라 시간이 크게 달라져 ‘항상 20분’이라고 보지는 않는다.</p><h2>가장 자주 걸은 코스</h2><p>우리 가족은 대개 Reef Point 쪽 절벽 위 블러프를 걷다가 계단으로 해변에 내려가고, 모래사장을 걷고 다시 올라왔다. 바다와 언덕을 한 번에 볼 수 있고, 정해진 긴 코스를 완주해야 한다는 부담도 없었다. 평평한 산책이 목적이면 해변 쪽을 짧게 걷고, 운동이 목적이면 Moro Canyon을 별도 일정으로 잡는 편이 낫다.</p><p>아이와 타이드풀을 볼 때는 장소보다 저조 시간을 먼저 확인했다. Pelican Point나 Historic District 남쪽 바위 지대라도 물이 높으면 관찰할 공간이 줄어든다. 젖은 바위는 미끄럽고 보호구역 생물을 만지거나 옮기지 않는 것이 기본이라, 파도와 귀가 시간을 함께 본다.</p><h2>Historic District는 산책과 성격이 다르다</h2><p>Los Trancos에서 터널을 지나면 1930~40년대 해안 코티지가 남은 Historic District가 나온다. 공원 공식 설명은 이 구역에 빈티지 코티지 46채가 있다고 안내한다. Beachcomber Café는 모래사장 바로 앞이지만 우리는 아직 기다려서 식사한 적은 없다. 카페 후기가 아니라, 산책 중 오래된 해안 마을 풍경을 함께 볼 수 있다는 점 때문에 이 구역을 넣었다.</p><h2>석양을 본 날 가장 아쉬웠던 것</h2><p>해 질 무렵에는 하늘 색이 빠르게 바뀌어 사진보다 직접 보는 순간이 좋았다. 다만 “아직 밝다”고 생각하며 오래 머물렀다가 주변이 갑자기 어두워져 서둘러 차로 돌아간 적이 있다. 석양을 볼 때는 일몰 시각만 보지 않고, 해변에서 주차장까지 올라갈 시간과 어두워진 계단을 감안해 돌아선다.</p><img class="rounded-lg" src="https://jcdznrqhpaezhleqxayt.supabase.co/storage/v1/object/public/blog-images/1781671381741-dzxl91vtmhe.jpg" alt="크리스탈 코브 해변에서 직접 본 해 질 무렵 풍경" width="75%"><h2>현재 공식 운영 정보</h2><ul><li><p><strong>Day Use</strong>: 오전 6시부터 일몰까지. Historic District는 오전 6시부터 오후 10시까지다.</p></li><li><p><strong>차량 Day Use</strong>: 일반 $15, 특별 휴일·성수기·주말 요금 $20. 요금은 예고 없이 바뀔 수 있다.</p></li><li><p><strong>Los Trancos</strong>: 공원 공식 안내지에는 시간당 $5로 표시돼 있다. 종일 최대액은 최신 공식 자료에서 확인되지 않아 기존 글의 “약 $16”은 삭제했다.</p></li><li><p><strong>반려견</strong>: 포장 구역만 허용되며 해변과 백컨트리는 불가하다. 자세한 제한은 <a target="_blank" rel="noopener noreferrer" href="https://parks.ca.gov/dogs">California State Parks 반려견 안내</a>에서 확인한다.</p></li></ul><p>가볍게 걷고 싶다면 Reef Point, 역사지구가 목적이면 Los Trancos처럼 방문 이유를 하나만 정해도 첫 방문의 시행착오가 줄어든다. 하루 숙박 여행을 찾는다면 <a href="/blog/palm-springs-jw-marriott-resort">팜스프링 리조트 경험</a>, 다른 OC 반나절 코스라면 <a href="/blog/san-juan-capistrano-mission-review">샌 후안 카피스트라노 미션 후기</a>로 이어서 볼 수 있다.</p>`,
    },
    removedAssets: [],
  },
]

console.log(JSON.stringify({
  mode: applyChanges ? 'apply' : 'dry-run',
  posts: updates.map(({ post, values }) => ({
    slug: post.slug,
    oldChars: textLength(post.content),
    newChars: textLength(values.content),
    oldTitle: post.title,
    newTitle: values.title,
  })),
}, null, 2))

if (!applyChanges) process.exit(0)

for (const { post, values, removedAssets } of updates) {
  const { error } = await supabase.from('posts').update({ ...values, updated_at: new Date().toISOString() }).eq('id', post.id)
  if (error) throw error
  for (const imageUrl of removedAssets) {
    const { error: assetError } = await supabase.from('image_assets').upsert({
      image_url: imageUrl,
      host: new URL(imageUrl).hostname,
      rights_status: 'rejected',
      origin_type: 'unknown',
      verification_note: `Removed from published post ${checkedDate}; original source and license were not documented.`,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'image_url' })
    if (assetError) throw assetError
  }
}

console.log(`Updated ${updates.length} remaining critical posts.`)
