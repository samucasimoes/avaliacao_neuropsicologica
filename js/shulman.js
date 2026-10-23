/* Relógio de Shulman: só o título e a instrução na tela.
   Por enquanto não sai na impressão (veja secoesDoRelatorio em app.js);
   relatorio() fica aqui para quando voltar. */

const Shulman = (function () {
  const INSTRUCAO = "Marque no relógio 11 horas e 10 minutos.";

  function relatorio() {
    return {
      titulo: "Relógio de Shulman",
      blocos: [{ tipo: "paragrafo", texto: INSTRUCAO, negrito: true }]
    };
  }

  return { relatorio: relatorio };
})();
