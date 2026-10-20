# Spotei — Car Spotting

Aplicativo React Native + Expo + TypeScript criado para Programação Mobile II. A organização segue `aula-30-09`: telas em `src/app`, componentes simples, hooks, tipos, serviços com Axios, SQLite, AsyncStorage e stores Zustand. A interface usa `StyleSheet`, fundo escuro, ciano, magenta e roxo, com bordas arredondadas. Novo spot fica no ícone superior esquerdo e Explorar no direito; a barra inferior contém Início, Ranking e Perfil.

O perfil prioriza as fotos em uma grade de três colunas. Conquistas têm uma aba própria, e privacidade, moderação e saída ficam na engrenagem. Criar um spot segue três etapas: foto, identificação do carro e publicação. As opções da demonstração ficam recolhidas; câmera e galeria são os atalhos principais.

Após o scan, o nome e a raridade aparecem no centro e diminuem até se encaixar no topo. Só então entram a foto inteira, versão, ano, geração e características. A conferência usa um cabeçalho simples, sem abas, câmera, galeria ou avisos técnicos. “Editar” reúne as correções e a escolha entre carros da mesma foto; “Salvar e publicar” continua sendo a ação principal. Rascunhos retomados não repetem a revelação, e a preferência de movimento reduzido é respeitada.

A prévia usa o mesmo quadro do feed e dos detalhes da publicação. O ícone de duas setas alterna entre mostrar a foto inteira, com margens da cor do app, e preencher o quadro com recorte visual central. A escolha é salva no rascunho, na publicação e na fila offline; a imagem original e a análise da IA continuam inteiras. Publicações antigas sem configuração mostram a foto inteira por padrão. A grade do perfil continua usando miniaturas.

Os contadores de seguidores e seguindo abrem listas de perfis; o contador de spots leva à grade. Os três pontinhos abrem o menu da publicação, e o ícone de comentário leva ao campo de texto. Registros rejeitados continuam acessíveis ao autor e ao moderador. A moderação permite invalidar registros, arquivar denúncias mantendo o histórico e ajustar a raridade dos modelos identificados pela IA. A recuperação por e-mail aparece apenas no modo de conta online.

## Abrir o aplicativo

As dependências já foram instaladas nesta pasta. Em outro computador, instale Node.js 24 LTS e execute:

```powershell
cd "C:\Mobile II\trabalho\spotei-app"
npm install
npm start
```

Escaneie o QR code com o Expo Go compatível com SDK 57. O computador e o aparelho precisam conseguir se comunicar pela rede. Para o navegador: `npm run web`. Nenhuma chave é necessária para a demonstração.

Na tela inicial, escolha **Entrar no app** quando a IA real estiver habilitada, ou **Entrar na demonstração** no modo simulado. A conta de moderação é separada e também aparece nessa tela. Com `EXPO_PUBLIC_APP_MODE=demo`, contas e publicações existem somente neste aparelho; não use senhas de contas reais para testes.

## Reconhecimento real com Gemini no Expo

O `.env` privado deste computador já foi configurado. Em outro computador, copie `.env.example` para `.env`, preencha `GEMINI_API_KEY` e reinicie `npm start`. As variáveis usadas são:

```dotenv
EXPO_PUBLIC_APP_MODE=demo
EXPO_PUBLIC_IA_MODE=gemini
GEMINI_API_KEY=SUA_CHAVE_PRIVADA
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.5-flash
```

Abra **Novo spot** e use **Fotografar** ou **Galeria**. O scan e a análise começam automaticamente. A imagem preparada é enviada por Axios para `src/app/api/analisar+api.ts`. Somente essa rota do servidor lê a chave e consulta o Google. O endereço é obtido do Expo, inclusive no celular; mantenha o computador ligado, o Expo aberto e os dois aparelhos na mesma rede. Não coloque a chave em nenhuma variável `EXPO_PUBLIC_`.

Falhas temporárias de conexão, tempo limite ou respostas 5xx permitem até três tentativas, com intervalos crescentes e prazo total de 50 segundos. `GEMINI_FALLBACK_MODEL` define o modelo de reserva; ele recebe a mesma foto se o principal falhar. Cota ou chave inválida não disparam tentativas adicionais. Pedidos simultâneos da mesma foto compartilham a análise em andamento. Alterações no `.env` exigem reiniciar o Expo; `GET /api/analisar` informa o modelo ativo sem expor a chave.

O resultado real informa marca, modelo, possível versão e uma estimativa de raridade. Campos desconhecidos ficam vazios. É possível corrigir o resultado, escolher um carro principal quando houver vários, escrever a legenda e publicar. Os registros identificados pela IA ficam em revisão, sem pontos antecipados, até a aprovação na moderação local.

Esse modo usa **IA real e dados sociais locais**. A rota de desenvolvimento fica desabilitada em produção e tem limite global de 5 análises por minuto e 50 por dia, além da cota da conta Google. Análises da mesma foto são reutilizadas em memória durante a execução do servidor. Não há troca silenciosa por resultado simulado se o Google falhar. Para um app distribuído sem o Expo aberto, configure o backend autenticado do Supabase descrito abaixo.

Para experimentar tudo sem chamadas ao Google, use `EXPO_PUBLIC_IA_MODE=simulada` e reinicie o Expo. Nesse modo, os cenários demonstrativos voltam a aparecer.

## O que funciona na demonstração

- Feed com fotografias incluídas no projeto, abas Last Spot (você e quem segue) e Global Spot (comunidade), atualização por gesto e páginas de 12 itens.
- Cadastro local, login, sessão persistente, logout, edição de nome, usuário, biografia, cidade e avatar.
- Curtir, descurtir, comentar, excluir comentários próprios, seguir e deixar de seguir.
- Fotografar, selecionar da galeria, preparar JPEG com limite de resolução, salvar rascunho e publicar.
- Análise real com `EXPO_PUBLIC_IA_MODE=gemini`, ou **explicitamente simulada** por cenário escolhido com `EXPO_PUBLIC_IA_MODE=simulada`.
- Garagem sem duplicação de modelo/geração/versão, filtros por marca e raridade, ordenação por data ou pontos.
- Ranking geral, semanal e mensal com filtro de cidade, níveis e conquistas.
- Denúncias, aprovação/rejeição, correção de identificação, edição de raridade e histórico de pontos na conta administrativa demonstrativa.

As fotografias são ilustrativas; versões e anos não confirmados permanecem desconhecidos. As raridades da demo são cenários didáticos, inclusive o Ferrari no cenário lendário. Isso não equivale a uma classificação histórica verificada. As contas demo e admin demo não são habilitadas em produção.

## Correspondência com Trabalho.pdf

| Critério | Implementação |
| --- | --- |
| React Native, Expo, componentização e StyleSheet | `src/app`, `src/components` e `src/utils/tema.ts` |
| Pelo menos 3 telas com parâmetros | 3 abas, telas Novo spot e Explorar pelo topo, além de publicação, carro e usuário com `[id]` |
| Formulário com 4 campos variados e validação | Cadastro: nome, usuário, e-mail, senha e switch. Publicação: marca, modelo, versão, cidade, legenda e switch |
| Zustand global | `useSessao.ts` e `useSincronizacao.ts` |
| Persistência local/offline | SQLite no celular; AsyncStorage para sessão, prévia web, cache e fila persistente |
| Axios + TanStack Query | GET, POST, PATCH, PUT e DELETE em `services/supabase.ts`; queries, mutations, estados de erro/carregamento e invalidação |
| Grupo 1: câmera, galeria e arquivos | `expo-image-picker`, `expo-image-manipulator` e `expo-file-system` em `services/fotografia.ts` |

O recurso central implementado é o **grupo 1**. Não há GPS, biometria, áudio, sensores ou notificações no fluxo do app. Se o sorteio da equipe foi de outro grupo, será necessário adaptar o recurso central.

No modo demo, o cadastro e as interações sociais operam localmente. O reconhecimento Gemini faz uma requisição HTTP real. **As operações HTTP de cadastro e CRUD social ficam no modo produção com Supabase**. Para apresentar essas operações em sala, configure o backend e demonstre a rede com uma conta real de teste.

## Arquivos principais

```text
src/
  app/                  telas e navegação Expo Router
  components/           botões, campos, fotos, cartões e cabeçalho
  db/                   SQLite e dados demonstrativos
  hooks/                TanStack Query e mutações
  services/             demo, Supabase e preparação de fotografias
  server/               consulta privada ao Gemini e tratamento de erros
  stores/               sessão e sincronização com Zustand
  types/                tipos em português
  utils/                Axios, fila, regras e cores
supabase/
  migrations/           banco, RLS e funções transacionais
  functions/identify-vehicle/  Gemini somente no backend
  seed.sql              catálogo inicial com estimativas identificadas
testes/                 regras, PostgreSQL e fluxo no navegador
```

Não foi alterado o projeto de referência. As telas compartilham componentes; as regras do modo real ficam no servidor. Os comentários explicam as decisões importantes, sem comentar cada linha.

## Habilitar Supabase e Gemini

1. Crie um projeto Supabase e uma chave Gemini na sua própria conta.
2. Copie `.env.example` para `.env`. Preencha a URL e a chave **pública** do Supabase e use `EXPO_PUBLIC_APP_MODE=production`.
3. No SQL Editor do Supabase, execute as migrações de `supabase/migrations` em ordem de data (`202610070001_spotei.sql`, `202610140001_denuncias.sql` e `202610200001_enquadramento.sql`) e por fim `supabase/seed.sql`. Se o banco já existir, aplique apenas as migrações novas. Em um projeto vazio, também é possível usar a CLI:

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push --include-seed
```

4. Copie `supabase/.env.example` para `supabase/.env` e preencha `GEMINI_API_KEY` e `GEMINI_MODEL`. O modelo é configurável; escolha um Flash multimodal que sua conta ofereça e que suporte resposta estruturada. Implante:

```powershell
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy identify-vehicle
```

5. Cadastre-se no app. Para habilitar sua conta administrativa, execute no SQL Editor com o ID real da conta:

```sql
insert into public.user_roles(usuario_id, administrador)
values ('UUID_DA_SUA_CONTA', true)
on conflict(usuario_id) do update set administrador = true;
```

6. Em Auth > URL Configuration, autorize `spotei://redefinir-senha` para builds nativos e a URL web `/redefinir-senha` para o navegador. `EXPO_PUBLIC_RECOVERY_URL` permite definir uma URL de recuperação específica. Configure o envio de e-mail do Supabase e confirme o e-mail do cadastro.
7. Reinicie o Expo depois de editar `.env`: `npx expo start --clear`.

Nunca coloque Gemini ou a chave `service_role` em variáveis `EXPO_PUBLIC_`. A função obtém as credenciais de Supabase pelo ambiente do servidor. `verify_jwt=false` só desativa a checagem do gateway: a função **valida o token com Supabase Auth em cada chamada** antes de acessar a foto.

## Regras e segurança

- Pontos: comum 10, incomum 30, raro 80, épico 200, lendário 500. O modo real consulta `rarity_tiers` para mostrar os valores configurados no banco.
- O primeiro registro aprovado de cada combinação gera pontos. Fotos adicionais são permitidas, sem crédito repetido. Likes e comentários não pontuam.
- Épicos, lendários, correções e entradas provisórias passam por revisão antes de pontuar.
- A publicação usa uma RPC transacional com bloqueio por usuário, restrições únicas e ID idempotente. O cliente não possui permissão de escrita no saldo ou histórico.
- Excluir o primeiro registro transfere o crédito para o próximo registro aprovado do mesmo carro, se existir. Sem outro registro, o saldo é estornado. Invalidar ou alterar raridade também recalcula coleção e conquistas.
- RLS protege todas as tabelas. Fotos ficam em bucket privado e usam URLs temporárias; avatares são públicos. Operações administrativas verificam permissões no backend.
- A função verifica proprietário, JPEG e tamanho, calcula hash dos bytes, reutiliza análises e limita a 5 solicitações por minuto e 50 por dia.
- Gemini retorna JSON validado. Quando há vários carros, é possível selecionar o principal. Marca/modelo/versão podem ser corrigidos antes de publicar; os pontos não são editáveis.
- O catálogo inicial distingue estimativas de classificações verificadas. `verificado` indica aprovação editorial para uso; o campo `classificacao` registra o tipo de evidência. Nenhum número de fabricação foi inventado.
- `hash_perceptual` prepara a estrutura para detecção de semelhança; o algoritmo de semelhança visual ainda não está implementado.

## Offline e privacidade

A demo funciona sem internet com fotos do projeto e dados persistidos. No modo real, o app reabre dados já consultados quando a rede falha; fotos baixadas têm cache de disco. Rascunhos e cópias de fotos sobrevivem a reinicializações.

Reconhecimento real exige internet. Depois que uma identificação existe, uma publicação que falha por falta de rede entra na fila, aparece no perfil com zero pontos definitivos e é reenviada ao reconectar, ao voltar ao app ou ao tocar no ícone de nuvem. Erros de validação do servidor não são convertidos em publicações fictícias. A fila é separada por usuário. Curtidas, comentários, exclusões e edições reais exigem conexão.

GPS não é solicitado. A cidade é manual. A preparação JPEG remove os metadados originais. O editor de placas, solicitação automática de exclusão de conta e exportação completa de dados pessoais não foram implementados; a página de privacidade apresenta os controles disponíveis. Em produção, a exclusão do post remove o registro social; a limpeza dos arquivos órfãos do Storage precisa ser configurada como rotina administrativa.

## Marca e fotografias

`components/Logo.tsx` contém uma reprodução vetorial baseada na imagem enviada. O arquivo original da logo não apareceu entre os anexos acessíveis no sistema de arquivos; portanto a reprodução não é idêntica ao original. Para usar a arte original, coloque-a em `assets/logo.png` e substitua o conteúdo de `Logo.tsx` por um componente `Image` com `contentFit="contain"`.

As fotografias de demonstração são do Unsplash e foram incluídas no projeto para funcionar offline. Fontes: [Porsche](https://images.unsplash.com/photo-1503376780353-7e6692767b70), [BMW](https://images.unsplash.com/photo-1555215695-3004980ad54e), [Ferrari](https://images.unsplash.com/photo-1592198084033-aade902d1aae), [SUV Ford](https://images.unsplash.com/photo-1533473359331-0135ef1b58bf), [Fiat](https://images.unsplash.com/photo-1549317661-bd32c8ce0db2), [Mustang](https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd). São arquivos de apresentação, não conteúdo enviado por usuários reais.

## Testes e apresentação

Ao tirar uma foto ou selecionar na galeria, a análise começa automaticamente. A tela de scan mantém a foto inteira enquanto aguarda a IA. Em seguida, abre a conferência dos dados, com seleção de candidatos, correção da identificação, legenda e cidade. Só o botão **Salvar e publicar**, após a confirmação do usuário, cria o registro e atualiza perfil e feed. Cancelar o scan mantém um rascunho; falhas permitem tentar novamente sem publicar. As regras de moderação e pontuação continuam valendo.

Com o Expo aberto, `npm run test:publicacao` verifica esse fluxo completo, incluindo a animação, cancelamento, resposta atrasada, correções, persistência e foto no perfil/feed. `npm run test:enquadramento` verifica fotos horizontais e verticais com os quatro cantos preservados. Ambos usam respostas controladas e não consomem a cota do Gemini.

A galeria permite imagens sem exigir extensão JPEG. Os formatos que o aparelho consegue abrir são convertidos automaticamente para JPEG, preservando todo o enquadramento. No iOS, o seletor pede uma representação compatível e pode baixar a foto do iCloud. No envio local ao Gemini, o app transmite base64 em JSON para evitar diferenças de buffers binários entre web, Android e iOS. O servidor também reconhece JPEG, PNG, WebP, HEIC e HEIF pelo conteúdo real e usa o MIME correspondente, conforme os [formatos aceitos pelo Gemini](https://ai.google.dev/gemini-api/docs/image-understanding?hl=pt-br#supported-image-formats). Imagens corrompidas e formatos que o dispositivo não consegue decodificar ainda precisam ser substituídos pelo arquivo original; o app não promete abrir arquivos de edição ou RAW de qualquer câmera.

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
npx expo export --platform web
```

Para testar câmera/galeria pela interface com **chamadas reais ao Google**, deixe `npm start` rodando na porta 8081, instale o navegador de testes com `npx playwright install chromium` e execute `npm run test:ia`. Esse teste usa a cota da sua conta. Para repetir os fluxos sociais simulados, use `EXPO_PUBLIC_IA_MODE=simulada`, reinicie o Expo e execute `npm run test:fluxo`. Os testes criam um navegador isolado e salvam capturas em `qa/`.

`npm run test:auditoria` verifica cadastro/login, edição e foto de perfil, menus, curtidas, foco e exclusão de comentários, seguidores, busca, ranking, garagem, exclusão com confirmação, denúncias, aprovação/rejeição, catálogo, paginação, rascunho, recuperação de falhas e links inválidos. Esse roteiro usa dados isolados no navegador e respostas controladas da IA, sem consumir a cota do Gemini; o teste de IA real continua separado.

Foram validados TypeScript, lint, dependências Expo, compilação web/Android/iOS, regras da demo, esquema de resposta da IA e migração SQL executada em PostgreSQL via PGlite. Os testes do banco substituem apenas Auth/Storage por estruturas locais; não substituem as funções de pontuação. O fluxo no navegador também verificou seleção real de arquivo pela galeria, preparação JPEG, publicação pendente sem pontos antecipados e aprovação administrativa.

Não foi possível executar câmera ou SQLite em um aparelho físico neste ambiente. O botão Fotografar é testado no navegador por seleção de arquivo; no celular ele abre a câmera nativa. As chamadas ao Gemini são reais. O Supabase ainda precisa das credenciais e de um teste de integração no projeto hospedado. As dependências transitivas do SDK 57 possuem avisos no `npm audit`; não foram aplicados os downgrades incompatíveis sugeridos automaticamente.

Roteiro de apresentação: entrar na demo, publicar uma foto, mostrar validação e câmera/galeria, abrir garagem/ranking, desligar a internet e reabrir dados, explicar Zustand e SQLite, e usar uma conta Supabase de teste para demonstrar GET e mutações HTTP. Teste a permissão negada da câmera no celular antes de apresentar.
