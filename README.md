# Avaliação Neuropsicológica

Sistema web para preencher a avaliação e gerar o relatório em **PDF**, com login e as
avaliações salvas no banco de dados (Firebase).

## Telas

- **Login** (`login.html`) – e-mail e senha, "Lembrar meu acesso" e "Esqueci minha senha"
  (envia um link por e-mail). Sem login, o sistema volta para esta tela.
- **Início** – saudação, atalhos *Iniciar nova avaliação* e *Ver avaliações em andamento*, e a
  lista das avaliações em andamento (clique numa linha para abrir). *Ver todas* leva ao Histórico.
- **Nova Avaliação** – o formulário. Ao entrar nesta aba, o menu lateral troca (com animação) para
  as etapas da avaliação, com **Início** no topo para voltar, e a barra do topo mostra o título e a
  explicação da etapa aberta (o `card-head` da etapa é levado para lá). As etapas podem ser
  abertas em qualquer ordem.
- **Histórico de Avaliações** – as avaliações dos últimos 30 dias, cada uma com o aviso de quanto
  tempo falta para ser apagada, **Abrir** e **Salvar PDF e arquivo** (baixa o PDF e o .json).
  **Excluir** (com confirmação) aparece só para quem iniciou a avaliação; as regras do
  Firestore também barram a exclusão por outra pessoa e a troca do dono da avaliação. Tudo é salvo sozinho no banco ("Salvo às …" ao lado do título).
  *+ Carregar arquivo* traz uma avaliação de um backup (.json). *Limpar campos* começa uma
  nova avaliação (a anterior continua salva).
- **Ajuda** – resumo de como usar.

### 30 dias no banco

Para gastar pouco do banco, cada avaliação fica guardada por **30 dias depois da última
alteração** e depois é **apagada de vez**. A limpeza é feita pelo próprio sistema sempre que
alguém entra, e as regras do Firestore (`firestore.rules`) só deixam apagar as que já passaram
do prazo — publique as regras de novo depois desta mudança. As listas só leem as avaliações
dos últimos 30 dias. Cada avaliação também tem o campo `expiraEm`: se quiser, dá para criar
uma política de TTL no Firestore com esse campo (opcional).

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
   a folha: cada área com as descrições e a assinalada marcada, sem as caixas de resumo.
6. **Pfeffer** – Questionário de Atividades Funcionais, escore do paciente de 0 a 30.
7. **Escala Cornell** – escore e interpretação automáticos. Opções: Impossibilitado de
   avaliar, Ausente, Leve e Intenso. Na impressão sai só o escore do paciente.
8. **Humor e comportamento** – total de Katz, Pfeffer e Cornell (vindos das
   abas) e GAI, GDS e BHS (digitados), com interpretação na tela. Na impressão saem só os
   resultados e a legenda das escalas.
9. **MoCA** – escore por domínio e total; valor acima do máximo fica em vermelho com aviso
    e não entra no total até ser corrigido. Os comentários sobre o Relógio de Shulman saem
    na mesma folha da tabela.
10. **Relógio de Shulman** – só o título e "Marque no relógio 11 horas e 10 minutos";
    fica só na tela, não sai no relatório.
11. **CERAD / Funções executivas** – CERAD e Bateria de Avaliação Frontal (FAB).
12. **Linguagem** – fluência fonêmica (F-A-S com total) e semântica, e textos.
13. **RAVLT** – total, interferências, esquecimento e curva de aprendizagem (gráfico);
    a classificação é escolhida pelo profissional. As colunas Referência e DP mostram o
    valor esperado e o desvio padrão conforme a idade (60 a 89 anos) e o sexo do paciente
    e ficam só na tela (tabelas `RAVLT_REFERENCIA` e `RAVLT_DP` em `js/definicoes.js`). Na impressão o título é "Teste de Aprendizagem Auditivo-Verbal
    de Rey - (RAVLT)". A idade aparece ao lado do título, só na tela.
14. **Memória verbal e visual** – memória lógica e visual, e memória imediata e
    operacional (Digit Span), com classificação.
15. **Trilhas** (com atenção sustentada, seletiva e alternada), 16. **Praxias**,
    17. **Bateria Wechsler**, 18. **Stroop Test** (com testes complementares).
19. **Interpretação dos resultados** – um campo por domínio; na impressão sai numa
    tabela (domínio e resultado).
20. **Conclusão** – texto e assinaturas dos profissionais.

A escala **IQCODE** está fora de uso por enquanto: o código continua no projeto, mas a
aba fica escondida (`display: none`), não aparece em Humor e comportamento e não sai
no relatório. Para voltar, remova a classe `etapa-oculta` e o `style` da aba no
`index.html` e o `oculto: true` da linha do IQCODE em `js/definicoes.js`.

O relatório segue a ordem dos números das etapas e só traz as etapas preenchidas.
Na impressão, algumas abas saem juntas na mesma folha: dados do paciente + Resumo,
Memória verbal e visual + Trilhas (com Atenção) e
Praxias + Bateria Wechsler.
Cada aba ocupa uma folha: os textos têm limite de caracteres (com contador na tela) e,
se o conteúdo for grande, a letra diminui até caber (os títulos mantêm o mesmo tamanho).
O botão **Imprimir Avaliação** baixa o PDF completo direto, sem perguntas.
Nenhum dado é salvo: tudo acontece no navegador.

**Ctrl+P** (Cmd+P no Mac) não imprime a página do formulário: abre o relatório completo em
PDF numa nova aba, já com a janela de impressão. Se o navegador bloquear a nova aba,
permita pop-ups para o site. Pelo menu do navegador, a impressão mostra só um aviso.

Todos os botões, campos e opções mostram uma dica ao passar o mouse.

## Como usar

Abra o endereço do site (ou `http://localhost:8000` para testar, veja **Firebase** acima) e
entre com e-mail e senha. É preciso internet para o login e o banco de dados.

## Backup para editar depois

O botão **Imprimir Avaliação** baixa o relatório em PDF e o botão
**Gerar Arquivo** baixa a avaliação em `.json`. Os arquivos saem com o nome do
paciente, a data em que foram gerados e a situação: **Concluído** quando todas as etapas estão 100% preenchidas, senão **Pendente** (ex.: `Maria da Silva - 30-10-2026 - Pendente.pdf`). Para continuar ou
corrigir uma avaliação, clique em **Carregar arquivo** (no topo do formulário),
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
