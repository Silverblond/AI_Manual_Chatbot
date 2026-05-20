-- upsert 중복 방지를 위한 unique constraint 추가
alter table chunks
    add constraint chunks_doc_page_content_unique
    unique (document_name, page, content);
