-- Company document archive — general-purpose store for legal, tax, insurance,
-- permits, contracts, and other corporate documents.

create table if not exists company_documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Other',
  document_date date,
  file_url text,
  notes text,
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_documents_category_idx on company_documents(category);
create index if not exists company_documents_date_idx on company_documents(document_date desc);
