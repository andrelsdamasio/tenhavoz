-- Adiciona 'refunded' como status possível de payments. Esse status é
-- setado automaticamente pelos webhooks (Stripe: evento charge.refunded;
-- Mercado Pago: payment.status = 'refunded' na notificação) quando o
-- reembolso é feito de verdade no painel do Stripe/Mercado Pago — o app
-- nunca dispara um reembolso, só reflete o que já aconteceu lá pra
-- aparecer no relatório do /admin.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check check (status in ('pending', 'confirmed', 'failed', 'refunded'));
