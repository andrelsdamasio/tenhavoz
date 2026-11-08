-- Marca se o cliente já foi avisado de que o pagamento dele foi recebido mas a
-- página ainda não está no ar (um aviso por pagamento).
alter table public.payment_followups
  add column if not exists customer_alerted_at timestamptz;
