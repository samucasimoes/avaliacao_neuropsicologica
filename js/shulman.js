/* Relógio de Shulman: só o título e a instrução. No relatório sai uma folha em branco
   para o paciente desenhar no papel. */

const Shulman = (function () {
  const INSTRUCAO = "Marque no relógio 11 horas e 10 minutos.";

  function relatorio() {
    return {
      titulo: "Relógio de Shulman",
      paginaPropria: true,
      blocos: [{ tipo: "paragrafo", texto: INSTRUCAO, negrito: true }]
    };
  }

  return { relatorio: relatorio };
})();
