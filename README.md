# Avaliação Neuropsicológica

Formulário web para preencher a avaliação e gerar o relatório em **PDF**.
As etapas aparecem no menu lateral e podem ser abertas em qualquer ordem.
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
   (Escala de Independência para as Atividades de Alterações de Vida Diária)". No fim das
   questões há o campo **Escore do paciente** (sai como "ESCORE DO PACIENTE: 3"); em branco,
   vale o total calculado, que aparece como dica no campo. Depois vêm a legenda e a
   referência (letra 9, em negrito).
6. **Pfeffer** – Questionário de Atividades Funcionais, escore do paciente de 0 a 30. Na
   impressão o título é "Escalas, Inventários e Questionários", com o nome do questionário
   logo abaixo (letra 13); o escore e a legenda saem no fim da folha.
7. **GAI**, **GDS**, **Escala de Desesperança de Beck (BHS)** e **IQCODE** – uma aba para
   cada, só com o campo Escore do paciente (o IQCODE aceita decimal, ex.: 3,6) e a legenda
   (o IQCODE não tem legenda). Na impressão saem juntas numa folha, depois do Pfeffer.
8. **Escala Cornell** – escore e interpretação automáticos. Opções: Impossibilitado de
   avaliar, Ausente, Leve e Intenso. Na impressão o escore e a legenda saem no fim da folha.
9. **Humor e comportamento** – quadro com os resultados de Katz, Pfeffer, GAI, GDS, BHS,
   IQCODE e Cornell, todos vindos das próprias abas, com interpretação na tela. Na impressão
   sai só o quadro; a legenda de cada escala sai na folha dela.

Em todas as escalas, a legenda tem duas colunas: o escore numa e a interpretação na outra.
10. **MoCA** – escore por domínio e total; valor acima do máximo fica em vermelho com aviso
    e não entra no total até ser corrigido. Os comentários sobre o Teste do Relógio de Shulman
    saem na mesma folha da tabela.
11. **Relógio de Shulman** – só o título e "Marque no relógio 11 horas e 10 minutos";
    fica só na tela, não sai no relatório.
12. **CERAD / Funções executivas** – CERAD e Bateria de Avaliação Frontal (FAB). Os escores
    do CERAD vêm das abas já preenchidas (fluência Animais e Frutas e Nomeação de Boston da
    Linguagem, total do MoCA, e do RAVLT o Total A1–A5 como fixação, o A7 como evocação e o
    Reconhecimento); só Praxia construtiva e Evocação tardia da praxia são digitadas. Na
    impressão o título é "Consortium to Establish a Registry for Alzheimer's Disease", com
    "Bateria do CERAD e Funções Executivas" logo abaixo.
13. **Linguagem** – fluência fonêmica (F-A-S com total) e semântica, e textos.
14. **RAVLT** – total, interferências, esquecimento e curva de aprendizagem (gráfico);
    a classificação é escolhida pelo profissional. As colunas Referência e DP mostram o
    valor esperado e o desvio padrão conforme a idade (60 a 89 anos) e o sexo do paciente
    e ficam só na tela (tabelas `RAVLT_REFERENCIA` e `RAVLT_DP` em `js/definicoes.js`). Na impressão o título é "Teste de Aprendizagem Auditivo-Verbal
    de Rey - (RAVLT)". A idade aparece ao lado do título, só na tela.
15. **Memória verbal e visual** – memória lógica e visual, e memória imediata e
    operacional (Digit Span), com classificação.
16. **Trilhas** (com atenção sustentada, seletiva e alternada), 17. **Praxias**,
    18. **Bateria Wechsler**, 19. **Stroop Test** (com testes complementares).
20. **Interpretação dos resultados** – um campo por domínio; na impressão sai numa
    tabela (domínio e resultado).
21. **Conclusão** – texto (até 3.000 caracteres, quase a folha toda) e assinaturas dos
    profissionais. Na impressão, "Rio de Janeiro, ___ de ___ de ___." (para escrever a data à
    mão) e as assinaturas ficam no fim da folha.

O questionário completo do **IQCODE** (26 itens) está fora de uso: o código continua no
projeto, mas a aba fica escondida (`display: none`) e não sai no relatório; o escore do
IQCODE é digitado na aba IQCODE (`iqcode-escore`). Para voltar com o questionário, remova a
classe `etapa-oculta` e o `style` da aba no `index.html`.

O relatório segue a ordem dos números do menu e só traz as etapas preenchidas.
Na impressão, algumas abas saem juntas na mesma folha: dados do paciente + Resumo,
Memória verbal e visual + Trilhas (com Atenção) e
Praxias + Bateria Wechsler.
Na impressão os títulos ficam centralizados com letra 14 e o restante com letra 12; as
páginas não são numeradas. No cabeçalho da primeira folha os rótulos ficam com a primeira
letra de cada palavra em maiúscula (ex.: "Paciente", "Médico Solicitante").
Os dados do paciente podem ser digitados em minúsculo: na impressão, nome, profissão, médico
solicitante e endereço saem com a primeira letra de cada palavra em maiúscula, e os textos
(informante, medicamentos, histórias e avaliações) com a primeira letra de cada frase em
maiúscula. Siglas e o resto do texto ficam como foram digitados. Os escores saem sem o máximo (ex.: "14", não "14 / 30").
Cada aba ocupa uma folha: os textos têm limite de caracteres (com contador na tela); se o
conteúdo não couber, primeiro os espaços entre os blocos e nas linhas das tabelas encolhem e,
só se ainda faltar lugar, a letra diminui naquela folha até caber, sem passar para outra
página (os títulos mantêm o mesmo tamanho).
O botão **Imprimir Avaliação** baixa o PDF completo direto, sem perguntas.
A tecla ENTER não baixa o relatório (nos textos longos ela só quebra a linha).
Nenhum dado é salvo: tudo acontece no navegador.

**Ctrl+P** (Cmd+P no Mac) não imprime a página do formulário: abre o relatório completo em
PDF numa nova aba, já com a janela de impressão. Se o navegador bloquear a nova aba,
permita pop-ups para o site. Pelo menu do navegador, a impressão mostra só um aviso.

Todos os botões, campos e opções mostram uma dica ao passar o mouse.

## Como usar

Abra o `index.html` no navegador (funciona sem servidor e sem internet;
só a fonte Figtree depende de conexão).

## Backup para editar depois

O botão **Imprimir Avaliação** baixa o relatório em PDF e o botão
**Gerar Arquivo** baixa a avaliação em `.json`. Os arquivos saem com o nome do
paciente e a data em que foram gerados (ex.: `Maria da Silva - 30-10-2026.pdf`). Para continuar ou
corrigir uma avaliação, clique em **Carregar documento** (no fim do menu lateral),
escolha esse arquivo e os campos serão preenchidos novamente. Backups e rascunhos
antigos são convertidos para os nomes de campos atuais (`migrarCampos` em `js/app.js`).

## Estrutura

- `index.html` – página, menu e formulário dos dados do paciente, Cornell e Shulman
- `css/style.css` – estilos
- `js/app.js` – comportamento geral (navegação entre etapas, idade automática, máscara de telefone, validação, backup)
- `js/definicoes.js` – conteúdo das demais etapas: itens, colunas, textos e cálculos da planilha
- `js/secoes.js` – monta as etapas de `definicoes.js` na tela e no relatório
- `js/cornell.js` – itens, pontuação e interpretação da Escala Cornell
- `js/shulman.js` – folha do Relógio de Shulman no relatório
- `js/relatorio.js` – geração do PDF, do Excel e do backup `.json`
- `assets/favicon/` – ícones da aba do navegador (Twemoji, licença CC-BY 4.0, ver `about.txt`)
- `libs/` – jsPDF, jsPDF-AutoTable e ExcelJS (cópias locais)
