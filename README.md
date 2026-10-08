# Avaliação Neuropsicológica

Formulário web para preencher a avaliação e gerar o relatório em **PDF** ou **Excel**.
As etapas aparecem no menu lateral e podem ser abertas em qualquer ordem.
Nenhum campo é obrigatório: ao gerar o relatório, um aviso lista o que ficou vazio.
As abas com todos os campos preenchidos ficam verdes, com um ícone de correto.

1. **Dados do paciente** – o nome fica com as iniciais em maiúscula; a idade é calculada
   pela data de nascimento ou pode ser digitada quando ela não for conhecida. O sexo é
   usado só nas referências e não sai no relatório. O topo da página mostra o nome e a idade.
2. **Resumo** – fatores de risco (Sim / Não / Não disponível).
3. **Funções avaliadas** – lista já marcada.
4. **Protocolos aplicados** – texto fixo, sai só na impressão.
5. **Escala de Katz** – conta as dependências (0 a 6) e interpreta.
6. **Pfeffer** – Questionário de Atividades Funcionais, pontuação total de 0 a 30.
7. **Escala Cornell** – escore e interpretação automáticos.
8. **IQCODE** – 26 itens; cada coluna vale o número do topo (1 a 5), soma-se valor ×
   quantidade de marcações e divide-se por 26. "Não se aplica" e "Não sabe" não somam.
9. **Humor e comportamento** – total de Katz, Pfeffer, IQCODE e Cornell (vindos das
   abas) e GAI, GDS e BHS (digitados), com interpretação na tela. Na impressão saem só os
   resultados e a legenda das escalas.
10. **MoCA** – escore por domínio e total; valor acima do máximo fica em vermelho com aviso
    e não entra no total até ser corrigido. O comentário sai na mesma folha da tabela.
11. **Relógio de Shulman** – só o título e "Marque no relógio 11 horas e 10 minutos";
    no relatório sai uma folha em branco para o desenho no papel.
12. **CERAD / Funções executivas** – CERAD e Bateria de Avaliação Frontal (FAB).
13. **Linguagem** – fluência fonêmica (F-A-S com total) e semântica, e textos.
14. **Curva de aprendizagem** – RAVLT com total, interferências, esquecimento e
    gráfico; a classificação é escolhida pelo profissional. A coluna Referência mostra
    o valor esperado em todas as linhas do RAVLT conforme a idade
    (60 a 89 anos) e o sexo do paciente. A idade aparece ao lado do título, só na tela.
15. **Memória verbal e visual** – memória lógica e visual, com classificação.
16. **Trilhas** (com atenção), 17. **Praxias**,
    18. **Digit Span / Bateria Wechsler**, 19. **Stroop Test** (com testes complementares).
20. **Interpretação dos resultados** – um campo por domínio.
21. **Conclusão** – texto e assinaturas dos profissionais.

O relatório segue a ordem dos números do menu e só traz as etapas preenchidas.
Na impressão, algumas abas saem juntas na mesma folha: dados do paciente + Resumo,
Escala de Katz + Pfeffer, Memória verbal e visual + Trilhas (com Atenção) e
Praxias + Digit Span / Bateria Wechsler.
Cada aba ocupa uma folha: os textos têm limite de caracteres (com contador na tela) e,
se o conteúdo for grande, a letra diminui até caber.
Ao gerar, escolha entre **dados do paciente + escalas** ou **somente os dados do paciente**.
Nenhum dado é salvo: tudo acontece no navegador.

Todos os botões, campos e opções mostram uma dica ao passar o mouse.

## Como usar

Abra o `index.html` no navegador (funciona sem servidor e sem internet;
só a fonte Figtree depende de conexão).

## Backup para editar depois

Ao gerar o relatório, um arquivo `.json` é baixado junto. Para continuar ou
corrigir uma avaliação, clique em **Carregar documento** (no fim do menu lateral),
escolha esse arquivo e os campos serão preenchidos novamente.

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
