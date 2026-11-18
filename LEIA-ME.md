# Vistoria de Entrega · Construfase — como colocar no ar

São cerca de 30 minutos, uma vez só. Depois disso, o sistema roda sozinho.

## 1. Supabase (banco de dados, fotos e login)
1. Em **supabase.com**, crie um projeto chamado `vistoria-construfase`, região **South America (São Paulo)**.
2. Abra **SQL Editor > New query** e rode, nesta ordem, colando o conteúdo de cada arquivo e clicando em **Run**:
   1. `supabase/schema.sql`
   2. `supabase/seed-base-solucoes.sql`
   3. `sao-lucas-carga.sql`: tem nomes e telefones dos clientes. Eu mando por fora; ele **não vai para o GitHub**.
3. Desligue o cadastro aberto: **Authentication > Sign In / Providers > Email** e desmarque **Allow new users to sign up**.
4. Crie os logins da equipe. Abra `supabase/equipe.sql`, troque `TROQUE-AQUI` por uma senha provisória (mínimo 6 caracteres) e rode no **SQL Editor**. Os 11 logins são criados já com nome e papel:

   | Usuário | Pessoa | Papel |
   |---|---|---|
   | eduardo | Eduardo | Administrador |
   | renata · maria | Renata · Maria Eduarda | Engenharia |
   | ricardo · henrique · wesley · junior · joao · gabriel · mario · ana | Estagiários | Vistoriador(a) |

   Para entrar, a pessoa digita só o usuário e a senha provisória. No primeiro acesso, o sistema pede uma senha nova, só dela. Se alguém esquecer a senha, o final do `equipe.sql` mostra como redefinir.

## 2. IA paga: OPCIONAL, deixe para depois
Hoje o sistema roda com **custo zero**: `IA: false` no `config.js`, e a sugestão de solução sai da base de soluções (FS014-02). Se um dia quiser a IA da Anthropic, que cobra centavos por sugestão:

1. Em **console.anthropic.com**, cadastre o cartão e crie uma **API key**.
2. No Supabase, vá em **Edge Functions > Secrets** e crie o segredo `ANTHROPIC_API_KEY` com a chave.
3. Em **Edge Functions > Deploy a new function > Via Editor**, use o nome **`sugerir`**. Cole o conteúdo de `supabase/functions/sugerir/index.ts` e clique em **Deploy**.

4. No `config.js`, troque `IA: false` para `IA: true`.

## 3. Ligar o site ao Supabase
1. No Supabase, abra **Project Settings > API** e copie a **Project URL** e a **anon public key**.
2. No arquivo `config.js`, cole as duas em `SUPABASE_URL` e `SUPABASE_ANON_KEY`. A anon key pode ficar no site: a segurança vem do login e das regras do banco.

## 4. Publicar (GitHub Pages)
1. Suba os arquivos para o repositório `vistoria-construfase`, **menos a pasta `dados/`**.
2. Em **Settings > Pages**, selecione Branch `main`, pasta `/root`, e clique em **Save**.
3. O endereço fica `https://eduardinho164-spec.github.io/vistoria-construfase/`. Se quiser `vistoria.construfase.com.br`, faça igual ao `tour`: crie um CNAME no DNS.

## Uso no dia
- **Estagiário:** abre o link no celular, faz login, toca em **Fazer vistoria** > **Agenda** > unidade > **Iniciar vistoria** > **Anotar ocorrência** (cômodo, área, foto, IA) > **Concluir**.
- **Engenheiro:** abre **Painel do engenheiro** no computador ou tablet. As ocorrências aparecem na hora, com som.
- **Escritório:** o termo (FS010-02) já está impresso. Se precisar ver as pendências da unidade, abra a unidade no sistema.
- **Dica:** no celular, use "Adicionar à tela inicial" para o site abrir como aplicativo.
