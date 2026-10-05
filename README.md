# Avaliação Neuropsicológica

Formulário web para preencher a avaliação e gerar o relatório em **PDF** ou **Excel**.
As etapas seguem a planilha da avaliação e aparecem no menu lateral:

1. **Dados do paciente** – nome, data de nascimento, sexo, escolaridade e data da
   avaliação são obrigatórios e liberam as outras etapas.
2. **Resumo** – fatores de risco (Sim / Não / Não disponível). "Sexo feminino" é
   marcado sozinho a partir do sexo informado.
3. **Funções avaliadas** – lista já marcada; desmarque o que não foi avaliado.
4. **Protocolos aplicados** – texto fixo, entra só na impressão.
5. **Escala de Katz** – conta as dependências (0 a 6) e interpreta.
6. **Pfeffer** – Questionário de Atividades Funcionais (0 a 30).
7. **Escala Cornell** – escore e interpretação automáticos; os 19 itens são
   obrigatórios para gerar o relatório.
8. **Humor e comportamento** – quadro com Katz, Pfeffer, IQCODE e Cornell (vindos das
   abas) e GAI, GDS e BHS (digitados), com interpretação.
9. **IQCODE** – 16 itens, média calculada.
10. **MoCA** – escore por domínio e total.
11. **Relógio de Shulman** – desenho dentro do círculo, pontuação de 0 a 5 e observações.
12. **CERAD / Funções executivas** – CERAD e Bateria de Avaliação Frontal (FAB).
13. **Linguagem** – fluência fonêmica (F-A-S com total) e semântica, e textos.
14. **Curva de aprendizagem** – RAVLT com total, interferências, esquecimento e
    gráfico; memória verbal e visual.
15. **Digit Span**, 16. **Trilhas** (com atenção), 17. **Praxias**,
    18. **Bateria Wechsler**, 19. **Stroop Test** (com testes complementares).
20. **Interpretação dos resultados** – um campo por domínio.
21. **Conclusão** – texto e assinaturas dos profissionais.

O relatório segue a ordem dos números do menu e só traz as etapas preenchidas.
Ao gerar, escolha entre **dados do paciente + escalas** ou **somente os dados do paciente**.
Nenhum dado é salvo: tudo acontece no navegador.

## Como usar

Abra o `index.html` no navegador (funciona sem servidor e sem internet;
só a fonte Figtree depende de conexão).

## Backup para editar depois

Ao gerar o relatório, um arquivo `.json` é baixado junto. Para continuar ou
corrigir uma avaliação, clique em **Carregar backup** (no topo da página),
escolha esse arquivo e os campos serão preenchidos novamente.

## Estrutura

- `index.html` – página, menu e formulário dos dados do paciente, Cornell e Shulman
- `css/style.css` – estilos
- `js/app.js` – comportamento geral (navegação entre etapas, idade automática, máscara de telefone, validação, backup)
- `js/definicoes.js` – conteúdo das demais etapas: itens, colunas, textos e cálculos da planilha
- `js/secoes.js` – monta as etapas de `definicoes.js` na tela e no relatório
- `js/cornell.js` – itens, pontuação e interpretação da Escala Cornell
- `js/shulman.js` – área de desenho, pontuação e imagem do Relógio de Shulman
- `js/relatorio.js` – geração do PDF, do Excel e do backup `.json`
- `libs/` – jsPDF, jsPDF-AutoTable e ExcelJS (cópias locais)
