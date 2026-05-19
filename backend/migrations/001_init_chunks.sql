-- pgvector 확장 활성화
create extension if not exists vector;

-- chunks 테이블
create table if not exists chunks (
    id            uuid primary key default gen_random_uuid(),
    document_name text        not null,
    page          int         not null,
    content       text        not null,
    embedding     vector(768) not null,
    created_at    timestamptz not null default now()
);

-- 코사인 거리 기반 HNSW 인덱스
create index if not exists chunks_embedding_hnsw_idx
    on chunks
    using hnsw (embedding vector_cosine_ops);
