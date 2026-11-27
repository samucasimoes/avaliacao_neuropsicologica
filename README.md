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
  com todas as páginas, o mesmo que Ctrl+P. As etapas podem ser abertas em qualquer ordem. No rodapé, à
  esquerda do botão de continuar, fica **Gerar PDF** (relatório completo). Tudo é salvo
  sozinho no banco ("Salvo às …" ao lado do título).
- **Avaliações Pendentes** – as avaliações em andamento, com pesquisa pelo nome do paciente,
  o aviso de quanto tempo falta para serem apagadas, **Editar avaliação** e **Excluir avaliação**
  (com confirmação, só para quem iniciou; as regras do Firestore também barram a exclusão por
  outra pessoa e a troca do dono da avaliação).
- **Avaliações Concluídas** – as avaliações com todas as etapas 100% preenchidas, com pesquisa
  pelo nome, **Visualizar** (abre o formulário só para leitura; *Editar avaliação* destrava),
  **Imprimir** (todas as páginas ou só as escolhidas) e **Salvar PDF e arquivo** (PDF e .json).
- **Ajuda** – resumo de como usar.
- **Administração** – só aparece para o dono do sistema (`avaliacaoneuropsicologica26@gmail.com`).
  Veja **Acessos ao sistema** abaixo.

### Acessos ao sistema (aba Administração)

O administrador é o e-mail `avaliacaoneuropsicologica26@gmail.com` (constante `ADMIN_EMAIL` em
`js/banco.js` e função `ehAdmin()` em `firestore.rules`; se trocar, troque nos dois). Essa conta
precisa existir no Authentication. Tudo é feito pela aba, sem abrir o console do Firebase:

- **Novo acesso** – nome, e-mail e senha provisória (o botão **Gerar** sorteia uma). Depois de
  criar, aparecem os dados para enviar à pessoa, com o botão **Copiar**. No primeiro login a
  pessoa entra com a senha provisória e o sistema pede para ela criar uma senha pessoal.
- **Redefinir senha** – o Firebase envia para o e-mail da pessoa um link para criar uma senha
  nova (a senha atual vale até ela trocar). Sem servidor (plano gratuito do Firebase) o
  administrador não consegue digitar a senha de outra pessoa.
- **Desativar acesso / Dar acesso** – a pessoa desativada não entra e, se estiver com o
  sistema aberto, volta na hora para o login. Ao dar o acesso de novo, ela entra com a mesma senha.
- **Excluir usuário** – a pessoa some da lista e perde o acesso na hora. A conta do
  Authentication é apagada de vez quando ela tentar entrar de novo. Se o administrador criar o
  acesso com o mesmo e-mail antes disso, o sistema oferece **Restaurar acesso** (com a senha que
  a pessoa já tinha). As avaliações que ela iniciou continuam no banco.

O acesso vale pelo registro em `profissionais` (campos `ativo` e `excluido`), conferido pelas
regras do Firestore: uma conta criada por fora do sistema, desativada ou excluída não lê nem
grava nada. Registros antigos, sem o campo `ativo`, contam como ativos. Uma conta que entra sem
registro (criada por fora) é apagada do Authentication no próprio login.

### Status: pendente ou concluída

Uma avaliação fica **Concluída** quando é concluída pelo botão **Concluir e Imprimir
Avaliação** (campo `finalizada` nos campos salvos) ou, sozinha, quando todas as etapas estão
100% preenchidas (o check verde no menu de etapas), a mesma regra do "Concluído" no nome do PDF.
O status é gravado a cada salvamento, e as listas conferem e corrigem no banco as avaliações
antigas.

### Guardadas sem prazo

As avaliações ficam guardadas no banco **sem prazo para exclusão**: nada é apagado sozinho. Só
quem iniciou a avaliação pode excluí-la (as regras do Firestore, `firestore.rules`, conferem) —
publique as regras de novo depois desta mudança.

## Firebase

1. No console do Firebase, abra o projeto e ative **Authentication > Método de login > E-mail/senha**.
2. Crie o banco em **Firestore Database** e, em **Regras**, cole o conteúdo de `firestore.rules`
   e clique em **Publicar**.
3. Em **Configurações do projeto > Seus apps**, crie um app da Web (`</>`) e copie o objeto
   `firebaseConfig` para `js/firebase-config.js`.
4. Os acessos são criados pelo administrador na aba **Administração** (não existe cadastro
   pela tela de login). Depois desta mudança, publique as regras novas (`firestore.rules`):
   sem elas o banco recusa o cadastro.
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
acesso ele vem do nome digitado pelo administrador (ou do e-mail) e pode ser trocado no menu do
usuário em **Alterar nome**.

## Etapas do formulário

Nenhum campo é obrigatório.
As abas com todos os campos preenchidos ficam verdes, com um ícone de correto.

1. **Dados do paciente** – o nome fica com as iniciais em maiúscula; a idade é calculada
   pela data de nascimento ou pode ser digitada quando ela não for conhecida. O sexo é
   usado só nas referências e não sai no relatório. Também tem Médico solicitante e
   Endereço. O topo da página mostra o nome e a idade.
2. **Resumo** – fatores de risco (Sim / Não / Não disponível). "Sexo feminino" aparece
   abaixo de "Baixa escolaridade" só quando o sexo nos Dados do paciente é Feminino.
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
7. **GAI**, **GDS**, **Escala de Desesperança de Beck (BHS)** e **Inventário de Depressão de
   Beck (BDI)** – uma aba para cada, só com o campo Escore do paciente e a legenda. Na
   impressão saem juntas numa folha, depois do Pfeffer.
8. **Escala Cornell** – escore e interpretação automáticos. Opções: Impossibilitado de
   avaliar, Ausente, Leve e Intenso. Na impressão o escore e a legenda saem no fim da folha.
9. **Humor e comportamento** – quadro com os resultados de Katz, Pfeffer, GAI, GDS, BHS,
   BDI, IQCODE e Cornell, todos vindos das próprias abas, com interpretação na tela. Fica só na
   tela: não sai na impressão (o resultado e a legenda de cada escala saem na folha dela).

Na tela, as tabelas seguem uma grade (`gradeColunas` em `js/secoes.js` e `.tabela-grade` em
`css/style.css`): ocupam a largura da aba e cada tipo de coluna (rótulo, escore, coluna estreita,
calculada, classificação) tem sempre a mesma largura, então as colunas de tabelas diferentes
ficam alinhadas.

Em todas as escalas, a legenda tem duas colunas: o escore à esquerda e a interpretação à
direita. Na impressão, o "ESCORE DO PACIENTE" fica alinhado no lado direito da folha.
10. **MoCA** – escore por domínio e total; valor acima do máximo fica em vermelho com
    aviso e não entra no total até ser corrigido. A coluna Escore máximo fica só na tela. Os
    comentários sobre o Teste do Relógio de Shulman saem na mesma folha da tabela.
    **IQCODE** – aba logo depois do MoCA, só com o escore (aceita decimal, ex.: 3,6). Na
    impressão sai no fim da folha do MoCA, com o título e o escore terminando junto com a
    linha do título.
11. **Relógio de Shulman** – só o título e "Marque no relógio 11 horas e 10 minutos";
    fica só na tela, não sai no relatório.
12. **Linguagem** – fluência fonêmica (F-A-S com total) e semântica, e textos. A coluna
    Média do F-A-S é a mediana para a idade do paciente (60 a 69, 70 a 79, 80 ou mais) e o
    tempo de escolaridade escolhido acima da tabela (1 a 3, 4 a 7, 8 a 11, 12 anos ou mais;
    tabela `FAS_MEDIANAS` em `js/definicoes.js`). O tempo de escolaridade e a média ficam só na
    tela, para a profissional se basear: não saem na impressão. Na impressão
    a explicação dos testes de fluência verbal tem letra 10.
    No fim fica a tabela dos **Testes da Bateria do CERAD** (Consortium to Establish a Registry
    for Alzheimer's Disease): Memória, Evocação e Reconhecimento da lista de palavras (vêm do
    RAVLT: Total A1–A5, A7 e Reconhecimento, mas podem ser alterados), Praxia construtiva e
    Evocação da praxia construtiva (digitadas), com Total e Classificação.
13. **Funções executivas** – texto das funções executivas (testes analisados sublinhados) e
    Bateria de Avaliação Frontal (FAB) e, abaixo dela, os testes complementares (provérbios,
    cinco pontos, sinos, corte de linhas e labirintos); na impressão o título é "Funções Executivas".
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
    mais lento que o percentil 10, sai "< 10". Cada forma tem, no fim da linha, a caixa **Incapaz de realizar**:
    marcada, o tempo sai com esse texto (sem percentil), inclusive na Trilha B da Atenção
    alternada. 17. **Praxias**,
    18. **Bateria Wechsler**, 19. **Stroop Test**: a coluna
    Referência é o tempo médio da Versão Victoria para a idade do paciente (1ª cartela =
    cores de estímulos, 2ª = palavras sem interferência, 3ª = com interferência),
    arredondado (tabela `STROOP_TEMPOS` em `js/definicoes.js`). A referência fica só na tela,
    para a profissional se basear: não sai na impressão.
20. **Interpretação dos resultados** – um campo por domínio; na impressão sai numa
    tabela (domínio e resultado).
21. **Conclusão** – texto sem limite de caracteres e assinaturas dos profissionais. Na
    impressão a letra não diminui: o texto longo continua na folha seguinte, e
    "Rio de Janeiro, ___ de ___ de ___." (para escrever a data à mão) e as assinaturas ficam
    no fim da última folha.

O questionário completo do **IQCODE** (26 itens) está fora de uso: o código continua no
projeto, mas a aba fica escondida (`display: none`) e não sai no relatório; o escore do
IQCODE é digitado na aba IQCODE (`iqcode-escore`), logo depois do MoCA. Para voltar com o questionário, remova a
classe `etapa-oculta` e o `style` da aba no `index.html`.

O relatório segue a ordem dos números das etapas e só traz as etapas preenchidas.
Na impressão, algumas abas saem juntas na mesma folha: dados do paciente + Resumo,
Memória verbal e visual + Atenção (da aba Trilhas), Stroop Test + Trilhas e
Praxias + Bateria Wechsler.
Na impressão os títulos ficam centralizados com letra 14 e o restante com letra 12; as
páginas não são numeradas. Os subtítulos ficam em caixa alta, com letra 13. Nas tabelas, a linha embaixo dos títulos das
colunas é cinza e a última linha é preta, separando uma escala da outra (na última tabela da
aba, como o Resumo e as legendas no fim da folha, ela fica cinza-clara como as outras). As palavras em
inglês saem em itálico (nos títulos, numa linha abaixo, com letra 12; o título "Stroop Test",
todo em inglês, tem 14); nos textos de `js/definicoes.js` elas ficam entre asteriscos (`*Stroop Test*`) e o
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
a impressão com todas as páginas, o mesmo que Ctrl+P (não baixa o arquivo).
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

O botão **Gerar PDF** baixa o relatório em PDF e, em **Avaliações Concluídas**,
**Salvar PDF e arquivo** baixa também a avaliação em `.json`. Os arquivos saem com o nome do
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
- `js/admin.js` – aba Administração (criar, redefinir senha, desativar, dar acesso, excluir)
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
