# Avaliação Neuropsicológica

Sistema web para preencher a avaliação e gerar o relatório em **PDF**, com login e as
avaliações salvas no banco de dados (Firebase).

## Telas

- **Login** (`login.html`) – e-mail e senha, "Lembrar meu acesso" e "Esqueci minha senha"
  (envia um link por e-mail). Sem login, o sistema volta para esta tela.
- **Início** – saudação, atalhos *Iniciar nova avaliação* e *Carregar arquivo de avaliação*
  (abre um .json salvo antes), e a lista das avaliações em andamento (clique numa linha para
  abrir). *Ver todas* leva às Avaliações Pendentes.
- **Nova Avaliação** – o formulário, sempre vazio ao entrar pelo menu (a avaliação anterior
  continua salva). Ao entrar nesta aba, o menu lateral troca (com animação) para as etapas da
  avaliação, com **Início** no topo para voltar e, no pé, **+ Carregar arquivo** (traz uma
  avaliação de um backup .json). A barra do topo mostra o título e a explicação da etapa aberta,
  e o formulário tem **Imprimir Avaliação** no fim da barra do título, à direita: abre a impressão
  com a opção de imprimir todas as páginas ou só as escolhidas. As etapas podem ser abertas em qualquer ordem. No rodapé, à
  esquerda do botão de continuar, ficam **Gerar PDF** e **Gerar Arquivo** (.json). Tudo é salvo
  sozinho no banco ("Salvo às …" ao lado do título).
- **Avaliações Pendentes** – as avaliações em andamento, com pesquisa pelo nome do paciente,
  o aviso de quanto tempo falta para serem apagadas, **Editar avaliação** e **Excluir avaliação**
  (com confirmação, só para quem iniciou; as regras do Firestore também barram a exclusão por
  outra pessoa e a troca do dono da avaliação).
- **Avaliações Concluídas** – as avaliações com todas as etapas 100% preenchidas, com pesquisa
  pelo nome, **Visualizar** (abre o formulário só para leitura; *Editar avaliação* destrava),
  **Imprimir** (todas as páginas ou só as escolhidas) e **Salvar PDF e arquivo** (PDF e .json).
- **Ajuda** – resumo de como usar.

### Status: pendente ou concluída

Uma avaliação fica **Concluída** sozinha quando todas as etapas estão 100% preenchidas (o check
verde no menu de etapas), a mesma regra do "Concluído" no nome do PDF. O status é gravado a cada
salvamento, e as listas conferem e corrigem no banco as avaliações antigas.

### 6 meses no banco

Cada avaliação fica guardada por **6 meses (180 dias) depois da última alteração** e depois é
**apagada de vez**. A limpeza é feita pelo próprio sistema sempre que alguém entra, e as regras
do Firestore (`firestore.rules`) só deixam apagar as que já passaram do prazo — publique as regras
de novo depois desta mudança. Cada avaliação também tem o campo `expiraEm`: se quiser, dá para
criar uma política de TTL no Firestore com esse campo (opcional).

## Firebase

1. No console do Firebase, abra o projeto e ative **Authentication > Método de login > E-mail/senha**.
2. Crie o banco em **Firestore Database** e, em **Regras**, cole o conteúdo de `firestore.rules`
   e clique em **Publicar**.
3. Em **Configurações do projeto > Seus apps**, crie um app da Web (`</>`) e copie o objeto
   `firebaseConfig` para `js/firebase-config.js`.
4. Crie os acessos em **Authentication > Usuários > Adicionar usuário** (não existe cadastro
   pela tela de login).
5. Se o site estiver publicado num domínio próprio (ou GitHub Pages), adicione o endereço em
   **Authentication > Configurações > Domínios autorizados**. `localhost` já vem autorizado.

### Publicar no Firebase Hosting

`firebase.json` e `.firebaserc` já apontam para o projeto `avaliacao-neuro`. Com o
[Firebase CLI](https://firebase.google.com/docs/cli) instalado e logado (`firebase login`):

- Prévia com link próprio, que expira sozinha (para mostrar e aprovar uma versão):
  `firebase hosting:channel:deploy nova-versao --expires 30d`
- Site oficial (`https://avaliacao-neuro.web.app`): `firebase deploy --only hosting`
- Regras do Firestore (em vez de colar no console): `firebase deploy --only firestore:rules`

O sistema precisa ser aberto por um endereço `http(s)://` (não funciona abrindo o arquivo
direto com dois cliques). Para testar no computador: `python3 -m http.server` na pasta do
projeto e abrir `http://localhost:8000`.

No banco, cada avaliação fica em `avaliacoes` com os campos do formulário (os mesmos nomes do
arquivo .json), o nome do paciente, a etapa aberta, o status e quem iniciou. O nome de cada
profissional (usado na saudação e como responsável) fica em `profissionais`: no primeiro
acesso ele vem do e-mail e pode ser corrigido pelo próprio console do Firestore.

## Etapas do formulário

Nenhum campo é obrigatório.
As abas com todos os campos preenchidos ficam verdes, com um ícone de correto.

1. **Dados do paciente** – o nome fica com as iniciais em maiúscula; a idade é calculada
   pela data de nascimento ou pode ser digitada quando ela não for conhecida. O sexo é
   usado só nas referências e não sai no relatório. Também tem Médico solicitante e
   Endereço. O topo da página mostra o nome e a idade.
2. **Resumo** – fatores de risco (Sim / Não / Não disponível).
3. **Funções avaliadas** – lista já marcada.
4. **Protocolos aplicados** – texto fixo, sai só na impressão.
5. **Escala de Katz** – conta as dependências (0 a 6) e interpreta na tela. Enunciado e
   opções iguais à folha de papel (Lino et al., Cad. Saúde Pública). Na impressão sai como
   a folha: cada área com as descrições e a assinalada marcada, com o título "Escala de Katz
   (Escala de Independência para as Atividades de Alterações de Vida Diária)". Logo abaixo das
   questões vem a referência (letra 9, em negrito) e, abaixo dela, o campo **Escore do
   paciente** (sai como "ESCORE DO PACIENTE: 3"; em branco, vale o total calculado, que
   aparece como dica no campo) e a legenda.
6. **Pfeffer** – Questionário de Atividades Funcionais, escore do paciente de 0 a 30. Na
   impressão o título é "Escalas, Inventários e Questionários", com o nome do questionário
   logo abaixo (letra 10, em itálico); o escore e a legenda saem no fim da folha.
7. **GAI**, **GDS**, **Escala de Desesperança de Beck (BHS)** e **IQCODE** – uma aba para
   cada, só com o campo Escore do paciente (o IQCODE aceita decimal, ex.: 3,6) e a legenda
   (o IQCODE não tem legenda). Na impressão saem juntas numa folha, depois do Pfeffer.
8. **Escala Cornell** – escore e interpretação automáticos. Opções: Impossibilitado de
   avaliar, Ausente, Leve e Intenso. Na impressão o escore e a legenda saem no fim da folha.
9. **Humor e comportamento** – quadro com os resultados de Katz, Pfeffer, GAI, GDS, BHS,
   IQCODE e Cornell, todos vindos das próprias abas, com interpretação na tela. Fica só na
   tela: não sai na impressão (o resultado e a legenda de cada escala saem na folha dela).

Em todas as escalas, a legenda tem duas colunas: o escore à esquerda e a interpretação à
direita. Na impressão, o "ESCORE DO PACIENTE" fica alinhado no lado direito da folha.
10. **MoCA** – escore por domínio e total; valor acima do máximo fica em vermelho com aviso
    e não entra no total até ser corrigido. Os comentários sobre o Teste do Relógio de Shulman
    saem na mesma folha da tabela.
11. **Relógio de Shulman** – só o título e "Marque no relógio 11 horas e 10 minutos";
    fica só na tela, não sai no relatório.
12. **CERAD / Funções executivas** – CERAD e Bateria de Avaliação Frontal (FAB). Os escores
    do CERAD vêm das abas já preenchidas (fluência Animais e Frutas da Linguagem, total do
    MoCA, e do RAVLT o Total A1–A5 como fixação, o A7 como evocação e o Reconhecimento);
    Nomeação de Boston, Praxia construtiva e Evocação tardia da praxia são digitadas aqui
    (só números). Na impressão o título é "Consortium to Establish a Registry for Alzheimer's
    Disease", e os testes analisados das Funções executivas saem sublinhados.
13. **Linguagem** – fluência fonêmica (F-A-S com total) e semântica, e textos. A coluna
    Média do F-A-S é a mediana para a idade do paciente (60 a 69, 70 a 79, 80 ou mais) e o
    tempo de escolaridade escolhido acima da tabela (1 a 3, 4 a 7, 8 a 11, 12 anos ou mais;
    tabela `FAS_MEDIANAS` em `js/definicoes.js`). O tempo de escolaridade e a média ficam só na
    tela, para a profissional se basear: não saem na impressão. Na impressão
    sai antes do CERAD, e a explicação dos testes de fluência verbal tem letra 10.
14. **RAVLT** – total, interferências, esquecimento e curva de aprendizagem (gráfico);
    a classificação é escolhida pelo profissional. As colunas Referência e DP mostram o
    valor esperado e o desvio padrão conforme a idade (60 a 89 anos) e o sexo do paciente
    e ficam só na tela (tabelas `RAVLT_REFERENCIA` e `RAVLT_DP` em `js/definicoes.js`). Na impressão o título é "Teste de Aprendizagem Auditivo-Verbal
    de Rey - (RAVLT)". A idade aparece ao lado do título, só na tela. Na impressão o B1 não
    aparece, o texto explicativo tem letra 10 e o comentário sai sem o rótulo.
15. **Memória verbal e visual** – memória lógica e visual, e memória imediata e
    operacional (Digit Span), com classificação.
16. **Trilhas** (com atenção sustentada, seletiva e alternada): o percentil do Teste das
    Trilhas é calculado pela idade do paciente e pelo tempo em segundos, pela tabela de Davies
    (1968) em `TRILHAS_TEMPOS` (`js/definicoes.js`); acima de 79 anos usa a faixa de 70 a 79 e,
    mais lento que o percentil 10, sai "< 10". 17. **Praxias**,
    18. **Bateria Wechsler**, 19. **Stroop Test** (com testes complementares): a coluna
    Referência é o tempo médio da Versão Victoria para a idade do paciente (1ª cartela =
    cores de estímulos, 2ª = palavras sem interferência, 3ª = com interferência),
    arredondado (tabela `STROOP_TEMPOS` em `js/definicoes.js`). A referência fica só na tela,
    para a profissional se basear: não sai na impressão.
20. **Interpretação dos resultados** – um campo por domínio; na impressão sai numa
    tabela (domínio e resultado).
21. **Conclusão** – texto (até 3.000 caracteres, quase a folha toda) e assinaturas dos
    profissionais. Na impressão, "Rio de Janeiro, ___ de ___ de ___." (para escrever a data à
    mão) e as assinaturas ficam no fim da folha.

O questionário completo do **IQCODE** (26 itens) está fora de uso: o código continua no
projeto, mas a aba fica escondida (`display: none`) e não sai no relatório; o escore do
IQCODE é digitado na aba IQCODE (`iqcode-escore`). Para voltar com o questionário, remova a
classe `etapa-oculta` e o `style` da aba no `index.html`.

O relatório segue a ordem dos números das etapas e só traz as etapas preenchidas.
Na impressão, algumas abas saem juntas na mesma folha: dados do paciente + Resumo,
Memória verbal e visual + Trilhas (com Atenção) e
Praxias + Bateria Wechsler.
Na impressão os títulos ficam centralizados com letra 14 e o restante com letra 12; as
páginas não são numeradas. Os subtítulos ficam em caixa alta, com letra 13 (o "Teste das
Trilhas", que fica dentro de Trilhas, tem 10). Nas tabelas, a linha embaixo dos títulos das
colunas é cinza e a última linha é preta, separando uma escala da outra (na última tabela da
aba, como o Resumo e as legendas no fim da folha, ela fica cinza-clara como as outras). As palavras em
inglês saem em itálico (nos títulos, numa linha abaixo, com letra 12; o título "Stroop Test",
todo em inglês, tem 14), menos na folha do
CERAD; nos textos de `js/definicoes.js` elas ficam entre asteriscos (`*Stroop Test*`) e o
sublinhado entre dois sublinhados (`__texto__`). Tempos saem com aspas no fim (ex.: 10").
Um valor digitado numa aba não é digitado de novo: os Dígitos da Wechsler vêm do Digit Span
(Memória), a Trilha B da Atenção alternada vem do tempo da Forma B, e o Teste dos Sinos do
Stroop vem da Atenção seletiva. No cabeçalho da primeira folha os rótulos ficam com a primeira
letra de cada palavra em maiúscula (ex.: "Paciente", "Médico Solicitante").
Os dados do paciente podem ser digitados em minúsculo: na impressão, nome, profissão, médico
solicitante e endereço saem com a primeira letra de cada palavra em maiúscula, e os textos
(informante, medicamentos, histórias e avaliações) com a primeira letra de cada frase em
maiúscula. Siglas e o resto do texto ficam como foram digitados. Os escores saem sem o máximo (ex.: "14", não "14 / 30").
Cada aba ocupa uma folha: os textos têm limite de caracteres (com contador na tela); se o
conteúdo não couber, primeiro os espaços entre os blocos e nas linhas das tabelas encolhem e,
só se ainda faltar lugar, a letra diminui naquela folha até caber, sem passar para outra
página (os títulos mantêm o mesmo tamanho).
O botão **Gerar PDF** baixa o PDF completo direto, sem perguntas. **Imprimir Avaliação** abre
a impressão numa nova aba, com todas as páginas ou só as escolhidas.
A tecla ENTER não baixa o relatório (nos textos longos ela só quebra a linha).
Nenhum dado é salvo: tudo acontece no navegador.

**Ctrl+P** (Cmd+P no Mac) não imprime a página do formulário: abre o relatório completo em
PDF numa nova aba, já com a janela de impressão. Se o navegador bloquear a nova aba,
permita pop-ups para o site. Pelo menu do navegador, a impressão mostra só um aviso.

Todos os botões, campos e opções mostram uma dica ao passar o mouse.

## Como usar

Abra o endereço do site (ou `http://localhost:8000` para testar, veja **Firebase** acima) e
entre com e-mail e senha. É preciso internet para o login e o banco de dados.

## Backup para editar depois

O botão **Gerar PDF** baixa o relatório em PDF e o botão
**Gerar Arquivo** baixa a avaliação em `.json`. Os arquivos saem com o nome do
paciente, a data em que foram gerados e a situação: **Concluído** quando todas as etapas estão 100% preenchidas, senão **Pendente** (ex.: `Maria da Silva - 30-10-2026 - Pendente.pdf`). Para continuar ou
corrigir uma avaliação, clique em **Carregar arquivo** (no menu lateral do formulário),
escolha esse arquivo e os campos serão preenchidos novamente (vira uma avaliação nova no banco). Backups e rascunhos
antigos são convertidos para os nomes de campos atuais (`migrarCampos` em `js/app.js`).

## Estrutura

- `login.html`, `css/login.css`, `js/login.js` – tela de login
- `index.html` – menu lateral, Início, Ajuda e o formulário (dados do paciente, Cornell e Shulman)
- `css/style.css` – estilos
- `js/firebase-config.js` – configuração do projeto no Firebase (preencher)
- `js/banco.js` – login e leitura/gravação no Firestore
- `js/painel.js` – exige login, troca de telas, lista de avaliações e menu do usuário
- `firestore.rules` – regras de acesso do banco (colar no console do Firebase)
- `assets/cerebro-login.webp` – imagem do cérebro da tela de login (fundo transparente)
- `js/app.js` – comportamento do formulário (etapas, idade automática, máscara de telefone, backup, salvamento automático no banco)
- `js/definicoes.js` – conteúdo das demais etapas: itens, colunas, textos e cálculos da planilha
- `js/secoes.js` – monta as etapas de `definicoes.js` na tela e no relatório
- `js/cornell.js` – itens, pontuação e interpretação da Escala Cornell
- `js/shulman.js` – folha do Relógio de Shulman no relatório
- `js/relatorio.js` – geração do PDF, do Excel e do backup `.json`
- `assets/favicon/` – ícones da aba do navegador (Twemoji, licença CC-BY 4.0, ver `about.txt`)
- `libs/` – jsPDF, jsPDF-AutoTable e ExcelJS (cópias locais)
