-- gemini-embedding-001 기본 차원(3072)에 맞게 컬럼 업데이트
-- HNSW 인덱스는 2000차원 제한으로 제거 (MVP 규모에서 sequential scan으로 대체)

-- 기존 인덱스 제거
drop index if exists chunks_embedding_hnsw_idx;

-- 컬럼 차원 변경 (768 → 3072)
alter table chunks
    alter column embedding type vector(3072);
