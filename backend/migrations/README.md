# Migrations

Supabase는 자체 마이그레이션 CLI 대신 **SQL Editor에서 1회 실행**하는 방식을 사용한다.

## 적용 순서

1. [Supabase 대시보드](https://supabase.com/dashboard) → 해당 프로젝트 선택
2. 좌측 메뉴 **SQL Editor** 클릭
3. 아래 파일을 순서대로 붙여넣고 **Run** 실행

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `001_init_chunks.sql` | pgvector 확장 + chunks 테이블 + HNSW 인덱스 |
| 2 | `002_update_embedding_dim.sql` | 임베딩 차원 768 → 3072 (gemini-embedding-001 기준) |

## 확인

```sql
select * from chunks limit 1;
```

에러 없이 빈 결과가 반환되면 정상.
