-- Agenda o e-mail do resumo das vistorias todo dia às 18h (horário de Brasília = 21h UTC).
-- Rode no SQL Editor DEPOIS de publicar a função "resumo-diario" e cadastrar os segredos.
-- Troque SEGREDO-AQUI pelo mesmo valor do segredo RESUMO_SEGREDO.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('resumo-vistorias') where exists (select 1 from cron.job where jobname = 'resumo-vistorias');
select cron.schedule('resumo-vistorias', '0 21 * * *', $$
  select net.http_post(
    url := 'https://ebojcleuctquzphzyepv.supabase.co/functions/v1/resumo-diario',
    headers := '{"Content-Type":"application/json","x-segredo":"SEGREDO-AQUI"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

-- Conferir: select jobname, schedule from cron.job;
-- Testar agora (manda mesmo sem atividade): troque o body acima por '{"forcar":true}' e rode só o select net.http_post(...)
