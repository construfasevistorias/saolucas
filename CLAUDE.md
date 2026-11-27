# Vistoria de Entrega · Construfase — contexto do projeto

Leia este arquivo antes de mexer no projeto. Ele resume o que foi combinado com o Eduardo
(Analista Comercial e Marketing da Construfase, Criciúma/SC). Fale com ele em português do Brasil
e **pergunte antes de concluir quando houver dúvida** (pedido explícito dele).

## O problema
Na entrega de chaves, um representante da Construfase (muitas vezes estagiário) acompanha o cliente
na primeira vistoria visual do apartamento. Hoje as ocorrências são anotadas em papel. Depois o
cliente vai ao escritório da obra assinar o termo. O engenheiro não vê nada em tempo real.

## O que o sistema faz
1. **Vistoria** (celular): escolhe a unidade (pela agenda do dia ou pela lista), vê proprietário,
   tipologia e planta, anota ocorrências por **cômodo** (lista da tipologia) e **área**
   (pintura, cerâmica, esquadrias...), com foto e ditado por voz. A IA sugere a solução, diz se
   dá para resolver na hora, qual equipe e o que falar ao cliente.
2. **Painel do engenheiro**: tempo real, KPIs, pendências por área, "Acionar equipe" e "Resolvida".
3. **Base de soluções**: lista editável pela equipe técnica; é a referência da IA.
4. **Unidades**: cadastro/importação colando colunas do Excel.
5. **Sem impressão de termo**: o FS010-02 já chega impresso e completo no escritório (só falta assinar).
   A impressão do FS010-02 com as ocorrências já existe (`telaTermo`), mas fica **desligada**
   (`TERMO_IMPRESSO: false` em `config.js`) até haver impressora em cada obra.
   O sistema serve para acompanhar as vistorias em tempo real (engenharia e administrador) e
   registrar as ocorrências na hora; o escritório consulta as pendências na tela da unidade.

## Documentos da Construfase usados
- **FS010-02 Rev. 14 – Termo de Vistoria e Recebimento do Imóvel**: impresso previamente pela
  Construfase (não é gerado pelo sistema, decisão do Eduardo em 17/11/2026). Regra do termo: havendo defeitos, a Construfase fica com as chaves e tem até **30 dias** para os
  reparos → `vistorias.chaves = 'retidas'` e `prazo_reparo`; o painel lista os prazos.
- **FS014-02 Rev. 04 – Lista de Serviços Corriqueiros**: infiltração, vazamento, pintura, elétrica,
  pisos e azulejos danificados, interfones, metais dos banheiros, vazamento de gás, telhados,
  pavimentação abaloada, infiltração em esquadrias, fechadura. Fora da lista → aprovação da
  gerência de Engenharia e Administrativa. A IA marca `corriqueiro` em cada ocorrência.
- FS010-05 (termo do condomínio/síndico) não é usado na unidade.

## Arquitetura
- Site estático (sem build): `index.html` + `app.js` (módulo ES) + `config.js`.
  Hospedagem: GitHub Pages, repositório `construfasevistorias/saolucas` → https://construfasevistorias.github.io/saolucas/ (Supabase: projeto ebojcleuctquzphzyepv, São Paulo)
- **Supabase**: Postgres + Auth (e-mail/senha, cadastro público desligado) + Storage (bucket
  `fotos`, privado) + Realtime. Esquema em `supabase/schema.sql`.
- **IA**: Edge Function `supabase/functions/sugerir` chama a API da Anthropic
  (segredo `ANTHROPIC_API_KEY`; modelo em `ANTHROPIC_MODEL`, padrão `claude-sonnet-5-5`).
  Se falhar, o site usa a busca local na base de soluções.
- **Modo demonstração**: com `config.js` vazio, tudo roda no navegador (localStorage +
  BroadcastChannel). Unidades reais do São Lucas com **nomes fictícios** (`unidades-demo.js`).

## Dados do Residencial São Lucas
- 4 blocos (01 a 04) × 44 unidades = 176. Andares 1–4: finais 01 a 10. Andar 5: coberturas 501–504.
- Tipologias e cômodos vêm das plantas (`img/plantas/*.jpg`, geradas dos PDFs do arquitetônico):
  - Finais 01/02: 3 dorm. c/ suíte (+ circulação) · Finais 03–06: 2 dorm. c/ suíte
  - Finais 07/08: dormitório casal (planta chama de "Suíte", mas não tem banheiro) + dormitório 1, 1 BWC · Finais 09/10: 2 dorm.
  - Coberturas: terraço, área de serviço, suíte, 2 dorm., 2 BWC (502/504: BWC suíte PCD)
- Agenda de entrega: 23 a 27/11/2026, duas equipes, vistoriadores por coluna (Eduardo, Ricardo...). Na planilha o Eduardo aparece por apelido; o `gerar_carga.py` troca para "Eduardo". Não usar o apelido em nada no sistema (pedido do Eduardo).
- **Dados pessoais (nomes, telefones) ficam só no Supabase.** `dados/` está no `.gitignore`;
  `dados/gerar_carga.py` gera `dados/sao-lucas-carga.sql` a partir das planilhas
  (Controle de Vendas e Agenda). Nunca subir CPF, valores ou dados de venda.

## Equipe (perfis)
- Admin: Eduardo · Engenheiras: Renata, Maria Eduarda
- Vistoriadores (estagiários que acompanham a vistoria): Ricardo, Henrique, Wesley, Junior, João Victor,
  Gabriel, Mario André, Ana, Lucas.
- **A agenda NÃO define quem faz a vistoria** (decisão do Eduardo, 23/11/2026): quem faz é quem iniciar com o próprio login
  (`vistorias.vistoriador_id`). As telas mostram "Vistoria feita por …" (`ultimaVistoria`/`nomeVistoriador`); o campo
  `agendamentos.responsavel` ficou sem uso.
- Logins curtos, só para o sistema: o usuário digita `ricardo` e o app completa `@vistoria.construfase.com.br`
  (`DOMINIO_LOGIN` no config.js; `emailDoUsuario()` no app.js). `supabase/equipe.sql` cria os 11 logins
  direto em auth.users/auth.identities com senha provisória e `trocar_senha: true` → `telaTrocarSenha` obrigatória
  no 1º acesso. Usuários: eduardo, renata, maria, ricardo, henrique, wesley, junior, joao, gabriel, mario, ana.

## Fotos e vídeos (24/11/2026)
- Formulário: Foto (câmera, oferece marcar), Vídeo (câmera) e Galeria (fotos e vídeos). Editor `desenharNaFoto()`
  com flecha, círculo e traço livre (vermelho/amarelo/branco). Vídeo vai sem compressão, limite `LIMITE_VIDEO_MB` = 45
  (Supabase grátis: 50 MB por arquivo, 1 GB no total). Vídeos ficam no mesmo bucket `fotos` e no mesmo campo `fotos[]`
  (`ehVideo()` pela extensão). Relatórios e termo usam só fotos.

## Normas técnicas (27/11/2026)
- `normas.js` (`window.NORMAS`): resumo por área (critério, como verificar, o que falar) + gerais (CDC 90 dias,
  NBR 17170, 14037/5674, 15575, FS014). Aparece: caixa no formulário ao escolher a área (`normaBoxHTML`), tela
  `#/normas` e link na base de soluções. Só resumo (texto ABNT é protegido). Números conferidos: NBR 13753
  (ressalto ≤ 1 mm; planeza 3 mm/2 m) e prazos NBR 17170 de cerâmica (conferir na norma impressa).

## Custo zero (decisão do Eduardo, 17/11/2026)
- Supabase plano Free + GitHub Pages. `IA: false` no config.js: sugestões só pela base (`sugestaoLocal`),
  sem chamar a Edge Function `sugerir`. A IA paga fica pronta para ligar depois (`IA: true`).
- Login do Eduardo: `eduardo`.

## Pendências / próximos passos
- Possível app (PWA) com modo offline para obra sem internet.
- Integração futura com o pós-obra (assistência técnica) usando as mesmas ocorrências.
