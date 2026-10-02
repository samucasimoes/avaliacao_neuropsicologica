# Avaliação Neuropsicológica

Formulário web para preencher a avaliação e gerar o relatório em **PDF** ou **Excel**.
Etapas disponíveis:

1. **Dados do paciente** – nome, data de nascimento, sexo, escolaridade e data da
   avaliação são obrigatórios para avançar.
2. **Escala Cornell para Depressão** – liberada depois dos dados obrigatórios; escore
   e interpretação calculados automaticamente. Todos os 19 itens são obrigatórios
   para gerar o relatório.

Ao gerar o relatório, escolha entre **dados do paciente + Escala Cornell** ou
**somente os dados do paciente**.
Nenhum dado é salvo: tudo acontece no navegador.

## Como usar

Abra o `index.html` no navegador (funciona sem servidor e sem internet;
só a fonte Figtree depende de conexão).

## Backup para editar depois

Ao gerar o relatório, um arquivo `.json` é baixado junto. Para continuar ou
corrigir uma avaliação, clique em **Carregar backup**, escolha esse arquivo e
os campos serão preenchidos novamente.

## Estrutura

- `index.html` – página e formulário
- `css/style.css` – estilos
- `js/app.js` – comportamento do formulário (navegação entre etapas, idade automática, máscara de telefone, validação)
- `js/cornell.js` – itens, pontuação e interpretação da Escala Cornell
- `js/relatorio.js` – geração do PDF, do Excel e do backup `.json`
- `libs/` – jsPDF, jsPDF-AutoTable e ExcelJS (cópias locais)
