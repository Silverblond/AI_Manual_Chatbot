-- 코사인 유사도 기반 청크 검색 RPC 함수
create or replace function match_chunks(
    query_embedding vector(3072),
    match_count      int default 5
)
returns table (
    id            uuid,
    document_name text,
    page          int,
    content       text,
    similarity    float
)
language sql stable
as $$
    select
        id,
        document_name,
        page,
        content,
        1 - (embedding <=> query_embedding) as similarity
    from chunks
    order by embedding <=> query_embedding
    limit match_count;
$$;
