-- 데이터 복원 스냅샷: irvine-library-teen-volunteer 글.
-- 이 글의 content/메타는 MCP(execute_sql)로 직접 편집했으므로(링크·시간표 정리,
-- 분량 간소화, alt 한국어화, 내부링크 추가) DB 이관·복원 시 동일 상태를 재현하도록 남긴다.
-- slug 기준 UPSERT라 재실행 안전하지만, 운영 DB에는 이미 반영돼 있으니 재적용 불필요
-- (사용자가 /admin에서 계속 편집하므로 라이브에 함부로 재실행하지 말 것 — 순수 복원용).
--
-- 주의: content/메타 전용 스냅샷이다. 전체 글(57개) 데이터 복원은 마이그레이션이 아니라
-- Supabase 백업(pg_dump)이 담당한다. 여기 담는 건 "내가 MCP로 손댄 데이터"만.

insert into posts (
  id, slug, title, content, excerpt, tags, cluster, category,
  status, meta_title, meta_description, social_hook, cover_image
) values (
  'daf16a27-145e-4686-91b5-6bb76b69831a',
  'irvine-library-teen-volunteer',
  '얼바인 도서관 청소년 봉사활동 신청 | 나이·학년 조건과 면접 없는 자리 고르기',
  $body$<p>봉사 신청서를 프린트해서 애들이랑 도서관까지 걸어갔다. 접수대에 내면 되는 줄 알았는데, 가서야 알았다. 여기서 받는 게 아니라 온라인으로만 넣는 거였다.</p><p>한국에서 서류란 들고 가서 내는 것이었으니 당연히 그럴 줄 알았다. 헛걸음한 김에 이것저것 물어보고 와서, 집에서 애들이 직접 폼을 채워 넣었다. 아직 신청한 지 이틀째라 결과는 모른다. 그래서 이 글은 붙었다는 후기가 아니라, 신청서를 넣기까지 알아야 했던 것들의 기록이다.</p><img class="rounded-lg" src="https://images.pexels.com/photos/1184589/pexels-photo-1184589.png?auto=compress&amp;cs=tinysrgb&amp;h=650&amp;w=940" alt="얼바인 공공도서관 서가에 꽂힌 책들" width="50%"><h2>신청은 온라인으로만 받는다</h2><p>얼바인 공공도서관 청소년 봉사는 처음부터 끝까지 온라인이다. Volgistics라는 외부 시스템으로 지원서 접수부터 배정, 스케줄, 봉사 시간 집계까지 돌아간다. <a target="_blank" rel="nofollow noopener" href="https://www.volgistics.com/appform/677418036">청소년 자원봉사 신청 폼</a>에 들어가 항목을 채우고 Submit을 누르면 끝이고, 그다음은 Teen Volunteer Coordinator가 이메일로 연락을 준다. 도서관에 종이를 들고 갈 일도, 접수증도 없다.</p><p>폼은 이름·생년월일·학교 같은 인적사항과 보호자 비상연락처, 지원할 자리를 고르는 정도라 겁먹을 게 없다. 서술형으로 뭘 쓰라는 것도 없어서 애들이 앉은자리에서 다 채웠다. 부모가 대신 해줄 구석이 거의 없다.</p><h2>나이 말고 학년 조건이 따로 있다</h2><p>대상은 만 14~17세다. 18세부터는 이 폼이 아니라 <a target="_blank" rel="nofollow noopener" href="https://www.volgistics.com/appform/1224996191">성인 자원봉사 폼</a>으로 따로 신청한다. 고3 나이대라면 생일이 지났는지부터 확인하는 게 좋다.</p><p>내가 처음 헷갈린 게 여기다. 신청 폼에는 나이만 적혀 있는데, 프로그램 설명을 읽어보니 <strong>학년 조건이 하나 더 붙어 있었다.</strong> 학년도 중에 돌아가는 자리는 <strong>9~12학년</strong>이 대상이다. 우리 집 10학년은 걸릴 게 없는데 8학년은 기준에 안 맞는다. 폼에서 나이만 물어보니 넣는 것 자체는 되지만 배정은 별개 문제다. 중학생 자녀라면 여기서 한 번 멈춰야 한다. 다만 시기를 달리하면 중학생도 들어갈 자리가 있는데, 뒤에 적었다.</p><h2>자리는 세 종류, 면접 유무가 갈린다</h2><p>청소년 봉사 자리는 세 종류이고 성격이 꽤 다르다. 각 자리가 무슨 일을 하는지는 <a target="_blank" rel="nofollow noopener" href="https://www.volgistics.com/od/756545">자원봉사 활동 안내</a>에 정리돼 있다.</p><ul><li><p><strong>Volunteer Service Sessions</strong> — 학교 봉사 시간을 채우려는 학생을 겨냥한 자리. 정해진 시간에 가서 씨앗 손질, 공작 재료 준비, 책·장난감 닦기 같은 걸 돕는다. 한 번에 두 시간까지 인정되고 <strong>면접이 없다.</strong></p></li><li><p><strong>Program Assistance</strong> — 도서관 행사를 돕는다. 어린이 스토리타임이나 어른 공예 프로그램의 준비·정리·인원 관리. 한 달에 최소 두 번 나가야 하고 짧은 면접이 있다.</p></li><li><p><strong>Teen Advisory Group</strong> — 청소년 프로그램에 의견을 내는 자문 그룹이라 봉사보다 활동에 가깝다. 면접이 있고, 이 폼 외에 <a target="_blank" rel="nofollow noopener" href="https://forms.gle/TVMBVtpJhyXjegZK7">별도의 온라인 관심 신청서</a>를 하나 더 내야 한다. 빼먹으면 지원이 완성되지 않는다.</p></li></ul><p>우리 애들은 면접이 없는 Volunteer Service Sessions로 넣었다. 관문이 하나 없으면 걸러질 일이 적고, 처음 하는 봉사라면 일단 자리를 잡는 게 먼저라고 봤다. 그런데 신청을 다 하고 안내문을 다시 읽다 놓친 걸 발견했다. <strong>여러 자리에 동시에 지원해도 된다.</strong> 면접 없는 쪽을 안전하게 잡아두고 면접 있는 쪽도 같이 넣을 수 있었다는 얘기다. 우리는 하나만 골랐는데, 선택지를 스스로 좁힐 이유는 없었다.</p><h2>지점 선택이 곧 일정 선택이다</h2><p>폼에서는 프로그램 세 개와 지점 세 곳을 조합한 아홉 개 중 하나를 고른다. 처음엔 프로그램이 중요하다고 봤는데, 지나고 보니 지점이 더 현실적인 문제였다.</p><p>봉사의 진짜 비용은 봉사 시간이 아니라 <strong>부모의 운전</strong>이다. 데려다주고 데리러 가는 일이 붙는 순간 애 일정이 아니라 온 가족 일정이 된다. 우리는 걸어갈 수 있는 지점을 골랐고, 애들이 알아서 나가고 돌아온다. 결과적으로 이게 프로그램 종류보다 생활에 훨씬 큰 차이를 만들었다.</p><p>거리 말고 하나 더. 면접 있는 자리는 <strong>면접 날짜가, 자문 그룹은 월례 회의 요일이 지점마다 다르게 잡혀 있다.</strong> 지점을 고르는 순간 앞으로의 일정 요일까지 정해지는 셈이라, 아이 학원·운동 스케줄과 겹치지 않는지 먼저 맞춰보는 게 좋다. 정확한 날짜와 요일은 회차마다 바뀌니 <a target="_blank" rel="nofollow noopener" href="https://cityofirvine.gov/irvine-public-library/lets-connect">도서관 청소년 봉사 일정 안내 (청소년 자원봉사 기회)</a>에서 확인한다.</p><p>지점은 세 곳이다. Heritage Park Library(14361 Yale Avenue), University Park Library(4512 Sandburg Way), Katie Wheeler Library(13109 Old Myford Road). 아이가 혼자 오갈 수 있는 곳이 있는지부터 지도로 확인해 보길 권한다.</p><h2>왜 오래 산 사람도 이 프로그램을 모를까</h2><p>얼바인 도서관은 원래 오렌지카운티 공공도서관 소속이었다가 시 운영으로 넘어왔다. Heritage Park와 University Park가 2025년 7월에 전환돼 그해 8월에, Katie Wheeler는 2026년 1월에 넘어와 3월에 다시 문을 열었다. 지금의 얼바인 공공도서관 체제 자체가 이제 막 1년 된 셈이다. 프로그램과 봉사 자리도 새로 짜인 것들이라 예전 정보로 찾으면 안 나오는 게 당연하다.</p><p>참고로 성인 자원봉사도 있는데, 확인해 보니 현재 자리가 다 찬 상태였다. 학부모가 같이 해볼 생각이라면 시기를 봐야 한다.</p><h2>신청 창구는 일 년에 두 번 열린다</h2><p>이번에 알아보면서 제일 중요하다고 느낀 게 이거다. 이 봉사는 아무 때나 넣을 수 있는 게 아니라 <strong>정해진 시기에 창구가 열렸다 닫힌다.</strong> 마감된 기간에는 신청 자체가 막힌다.</p><p>가을부터 시작하는 학년도 봉사는 <strong>8월 1일에 신청이 다시 열린다.</strong> 자리가 차는 대로 마감되고 이후 지원서는 대기자로 넘어간다. 우리 애들이 넣은 게 8월 초였는데, 알고 그런 게 아니라 운이 좋았다. 8월 1일이면 마침 <a href="/blog/back-to-school-shopping-list">백투스쿨 준비물</a>을 챙기는 시기라, 새 학기 쇼핑 목록에 이 신청도 같이 적어두면 놓치지 않는다.</p><p>여름 독서 프로그램 봉사는 완전히 별개 모집이다. <strong>5월 초에 열려 5월 말에 닫히고,</strong> 6월 중순 오리엔테이션 참석이 필수다. 여기서 중학생 자녀를 둔 집이 눈여겨볼 게 있다. 이 여름 봉사는 대상이 <strong>8~11학년</strong>이라 8학년을 명시적으로 포함한다. 프로그램마다 기준이 다르니, 중학생이면 여름 모집을 노리는 게 오히려 확실하다.</p><p>기억할 날짜는 두 개다. <strong>봄에는 5월 초, 여름 끝자락에는 8월 1일.</strong> 이 두 시점에 한 번씩 들여다보면 놓치지 않는다.</p><h2>모집 상황은 어디서 보나</h2><p>나는 프로그램 소개 글만 보고 있었는데, 지금 모집이 열렸는지 닫혔는지는 다른 데 뜬다. 시 홈페이지의 <a target="_blank" rel="nofollow noopener" href="https://cityofirvine.gov/irvine-public-library/volunteer-opportunities">도서관 자원봉사 안내 페이지</a>다. 즐겨찾기 해두고 5월과 8월에 한 번씩 열어보면 된다.</p><p>도서관 밖으로도 방법이 있다. 얼바인 학군이 학생 봉사 기회를 모아둔 <a target="_blank" rel="nofollow noopener" href="https://sites.google.com/iusd.org/volunteer-opportunities/home">별도 사이트</a>에 병원·튜터링·푸드뱅크·박물관까지 스무 곳 넘게 정리돼 있고, 봉사 시간 기록·서명 방법도 안내된다. 다만 학군이 각 단체의 질까지 보증하지는 않는다고 붙어 있으니, 실제로 보낼 곳은 부모가 한 번 더 확인하는 게 맞다.</p><h2>정리하면</h2><ol><li><p>신청은 <strong>온라인으로만</strong> 받는다.</p></li><li><p>대상은 <strong>만 14~17세</strong>인데 <strong>학년 조건(9~12학년)</strong>이 따로 있다. 중학생이면 <strong>8~11학년 대상인 여름 독서 프로그램</strong>을 노려라.</p></li><li><p>창구는 일 년에 두 번. <strong>학년도 자리는 8월 1일, 여름 자리는 5월</strong>에 열리고 차면 닫힌다.</p></li><li><p>자리는 셋. <strong>Volunteer Service Sessions만 면접이 없다.</strong> 여러 자리에 동시 지원도 된다.</p></li><li><p><strong>면접일·회의 요일이 지점마다 다르니</strong> 지점 선택이 곧 일정 선택이다. 아이가 혼자 오갈 수 있는 곳부터 보라.</p></li></ol><p>봉사 시간을 채우려 시작하는 집이 많겠지만, 걸어서 갈 수 있는 곳에 아이가 스스로 가서 두 시간을 보내고 온다는 것 자체가 나쁘지 않다. 부모가 태워다 주는 활동만 잔뜩 만들어 놓으면 결국 아이도 부모도 지친다. 자리를 고를 때 이 점을 같이 봤으면 한다.</p><blockquote><p>이 글은 내가 직접 신청 과정을 거치며 확인한 내용을 바탕으로 적은 것이다. 신청은 마쳤으나 배정 결과는 아직 받지 못한 상태다. 모집 자리와 면접 일정, 지원 조건, 신청 폼 주소는 모집 회차에 따라 바뀔 수 있으니 넣기 전에 도서관 공지를 다시 확인하길 권한다.</p></blockquote>$body$,
  $ex$얼바인 공공도서관 청소년 봉사활동을 직접 신청하며 확인한 것들. 신청서를 들고 도서관에 갔다가 온라인 접수인 걸 알게 된 이야기부터 만 14~17세 나이 조건과 따로 있는 학년 기준, 면접 있는 자리와 없는 자리, 신청 창구가 열리는 시기까지 정리했다.$ex$,
  array['얼바인 도서관','미국 청소년 봉사활동','봉사시간','미국 백투스쿨','얼바인 생활정보'],
  'kids',
  '정보',
  'published',
  '얼바인 도서관 청소년 봉사활동 신청 방법과 나이·학년 조건',
  $md$얼바인 도서관 틴 발런티어 신청은 온라인으로만 받는다. 학년도 자리는 8월 1일, 여름 자리는 5월에 열린다. 나이와 학년 조건, 면접 유무, 지점별 일정 차이를 신청하며 확인한 대로 적었다.$md$,
  $hook$애들 봉사 자리 알아보다가 도서관까지 걸어갔다 그냥 돌아왔다.
서류가 모자라서도, 자리가 없어서도 아니었다.
미국 산 지 몇 년인데 아직도 이런다.$hook$,
  'https://images.pexels.com/photos/1184589/pexels-photo-1184589.png?auto=compress&cs=tinysrgb&h=650&w=940'
)
on conflict (slug) do update set
  title = excluded.title,
  content = excluded.content,
  excerpt = excluded.excerpt,
  tags = excluded.tags,
  cluster = excluded.cluster,
  category = excluded.category,
  status = excluded.status,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  social_hook = excluded.social_hook,
  cover_image = excluded.cover_image;
