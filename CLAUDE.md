@AGENTS.md

# Supabase Migration Rules

**규칙: DB 변경은 반드시 마이그레이션 파일을 먼저 생성한 후 실행한다.**

## 파일 위치
```
supabase/migrations/<timestamp>_<description>.sql
```

## 파일명 규칙
- 형식: `YYYYMMDDHHMMSS_설명.sql`
- 예시: `20260610143000_add_tags_table.sql`

## 순서 (반드시 지킬 것)
1. `supabase/migrations/` 에 `.sql` 파일 **먼저 생성**
2. 파일 내용 작성 및 검토
3. Supabase SQL Editor 또는 MCP로 실행

## 기존 마이그레이션
- `20260610000000_init_posts.sql` — posts 테이블 초기 스키마
