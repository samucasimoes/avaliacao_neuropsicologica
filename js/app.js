/* Comportamento do formulário: cálculos, máscaras, validação e geração do relatório. */

(function () {
  const form = document.getElementById("form-avaliacao");
  const campoNome = document.getElementById("nome");
  const campoNascimento = document.getElementById("nascimento");
  const campoIdade = document.getElementById("idade");
  const campoTelefone = document.getElementById("telefone");
  const campoDataAvaliacao = document.getElementById("data-avaliacao");
  const selects = form.querySelectorAll("select");
  const relogio = document.getElementById("relogio");
  const modalRelatorio = document.getElementById("modal-relatorio");
  const formRelatorio = document.getElementById("form-relatorio");
  const modalLimpar = document.getElementById("modal-limpar");
  const botaoBaixar = document.getElementById("btn-baixar");
  const toast = document.getElementById("toast");
  let timerToast = null;

  /* ---------- Utilidades ---------- */

  function hojeISO() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function formatarData(iso) {
    if (!iso) return "";
    const partes = iso.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
  }

  function mostrarAviso(mensagem) {
    toast.textContent = mensagem;
    toast.hidden = false;
    clearTimeout(timerToast);
    timerToast = setTimeout(function () { toast.hidden = true; }, 3500);
  }

  /* ---------- Relógio ---------- */

  function atualizarRelogio() {
    const agora = new Date();
    relogio.textContent = agora.toLocaleDateString("pt-BR") + "  " +
      agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    relogio.dateTime = agora.toISOString();
  }

  /* ---------- Idade ---------- */

  function calcularIdade() {
    const valor = campoNascimento.value;
    if (!valor) {
      campoIdade.value = "—";
      return;
    }
    const nascimento = new Date(valor + "T00:00:00");
    const referencia = campoDataAvaliacao.value
      ? new Date(campoDataAvaliacao.value + "T00:00:00")
      : new Date();
    let idade = referencia.getFullYear() - nascimento.getFullYear();
    const mes = referencia.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && referencia.getDate() < nascimento.getDate())) idade--;
    campoIdade.value = idade >= 0 && idade < 130 ? idade + (idade === 1 ? " ano" : " anos") : "—";
  }

  /* ---------- Telefone ---------- */

  function mascararTelefone() {
    const n = campoTelefone.value.replace(/\D/g, "").slice(0, 11);
    let texto = n;
    if (n.length > 10) texto = "(" + n.slice(0, 2) + ") " + n.slice(2, 7) + "-" + n.slice(7);
    else if (n.length > 6) texto = "(" + n.slice(0, 2) + ") " + n.slice(2, 6) + "-" + n.slice(6);
    else if (n.length > 2) texto = "(" + n.slice(0, 2) + ") " + n.slice(2);
    else if (n.length > 0) texto = "(" + n;
    campoTelefone.value = texto;
  }

  /* ---------- Selects sem valor ficam com cor de placeholder ---------- */

  function atualizarSelect(select) {
    select.classList.toggle("empty", !select.value);
  }

  /* ---------- Validação dos dados do paciente ---------- */

  const camposObrigatorios = Array.from(form.querySelectorAll("#secao-dados [required]"));

  function vazio(el) {
    return el.value.trim() === "";
  }

  function marcarErro(el, comErro) {
    el.classList.toggle("invalid", comErro);
    const erro = el.closest(".field").querySelector(".field-error");
    if (erro) erro.hidden = !comErro;
  }

  function limparErros() {
    camposObrigatorios.forEach(function (el) { marcarErro(el, false); });
  }

  function dadosCompletos() {
    return camposObrigatorios.every(function (el) { return !vazio(el); });
  }

  /* Mostra os erros e foca o primeiro campo obrigatório vazio. */
  function validar() {
    const vazios = camposObrigatorios.filter(vazio);
    camposObrigatorios.forEach(function (el) { marcarErro(el, vazios.indexOf(el) !== -1); });
    if (vazios.length) vazios[0].focus();
    return vazios.length === 0;
  }

  /* ---------- Etapas ---------- */

  const secoes = document.querySelectorAll(".secao");
  const linksSecao = document.querySelectorAll("[data-secao]");
  const linkDados = document.querySelector('[data-secao="dados"]');
  const linkCornell = document.querySelector('[data-secao="cornell"]');
  const linkShulman = document.querySelector('[data-secao="shulman"]');
  const botoesIr = document.querySelectorAll("[data-ir]");
  const botoesDaSecao = document.querySelectorAll("[data-na-secao]");

  /* Libera as escalas só depois dos dados obrigatórios do paciente. */
  function atualizarEtapas() {
    const liberada = dadosCompletos();
    [linkCornell, linkShulman].forEach(function (link) {
      link.classList.toggle("bloqueada", !liberada);
      link.setAttribute("aria-disabled", String(!liberada));
      link.title = liberada ? "" : "Preencha os dados do paciente para liberar";
    });
    linkDados.classList.toggle("concluida", liberada);
    linkCornell.classList.toggle("concluida", liberada && Cornell.completa());
    linkShulman.classList.toggle("concluida", liberada && Shulman.pontuado());
  }

  function mostrarSecao(nome) {
    if (nome !== "dados" && !dadosCompletos()) {
      mostrarSecao("dados");
      validar();
      mostrarAviso("Preencha os dados obrigatórios do paciente para liberar as escalas.");
      return;
    }
    secoes.forEach(function (secao) {
      secao.hidden = secao.id !== "secao-" + nome;
    });
    linksSecao.forEach(function (link) {
      const ativo = link.dataset.secao === nome;
      link.classList.toggle("active", ativo);
      if (ativo) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    botoesDaSecao.forEach(function (botao) {
      botao.hidden = botao.dataset.naSecao.split(" ").indexOf(nome) === -1;
    });
    window.scrollTo({ top: 0 });
  }

  /* ---------- Dados para o relatório ---------- */

  function valor(id) {
    return document.getElementById(id).value.trim();
  }

  function coletarDados() {
    const idade = campoIdade.value === "—" ? "" : campoIdade.value;
    return [
      ["Nome", valor("nome")],
      ["Idade", idade],
      ["Data de Nascimento", formatarData(campoNascimento.value)],
      ["Sexo", valor("sexo")],
      ["Escolaridade", valor("escolaridade")],
      ["Profissão", valor("profissao")],
      ["Telefone", valor("telefone")],
      ["Encaminhador", valor("encaminhador")],
      ["História Patológica", valor("historia-patologica")],
      ["História Familiar", valor("historia-familiar")],
      ["Medicamentos em Uso", valor("medicamentos")],
      ["Informante", valor("informante")],
      ["Avaliações", valor("avaliacoes")],
      ["Data da Avaliação", formatarData(campoDataAvaliacao.value)]
    ];
  }

  /* Campos editáveis (pelo atributo name), usados no backup .json. */
  function coletarCampos() {
    const campos = {};
    Array.from(form.elements).forEach(function (el) {
      if (!el.name || el.readOnly) return;
      if (el.type === "radio") {
        if (!(el.name in campos)) campos[el.name] = "";
        if (el.checked) campos[el.name] = el.value;
      } else {
        campos[el.name] = el.value;
      }
    });
    campos.shulmanDesenho = Shulman.desenho();
    return campos;
  }

  function preencherCampos(campos) {
    form.reset();
    Array.from(form.elements).forEach(function (el) {
      if (!el.name || el.readOnly || !(el.name in campos)) return;
      const valorCampo = campos[el.name] == null ? "" : String(campos[el.name]);
      if (el.type === "radio") {
        el.checked = el.value === valorCampo;
        return;
      }
      /* Mantém valores de listas que não existem mais nas opções. */
      if (el.tagName === "SELECT" && valorCampo &&
          !Array.from(el.options).some(function (o) { return o.value === valorCampo; })) {
        el.add(new Option(valorCampo, valorCampo));
      }
      el.value = valorCampo;
    });
    if (!campoDataAvaliacao.value) campoDataAvaliacao.value = hojeISO();
    mascararTelefone();
    calcularIdade();
    selects.forEach(atualizarSelect);
    Cornell.atualizar();
    Cornell.limparPendentes();
    Shulman.carregar(campos.shulmanDesenho);
    Shulman.atualizar();
    limparErros();
    atualizarEtapas();
  }

  function formularioPreenchido() {
    return Array.from(form.elements).some(function (el) {
      if (el.readOnly || !el.name || el.id === "data-avaliacao") return false;
      if (el.type === "radio") return el.checked;
      return el.value && el.value.trim() !== "";
    }) || Shulman.temDesenho();
  }

  /* ---------- Eventos ---------- */

  Cornell.iniciar(form);
  Shulman.iniciar(form);
  campoNascimento.max = hojeISO();
  campoDataAvaliacao.value = hojeISO();
  atualizarRelogio();
  setInterval(atualizarRelogio, 15000);
  selects.forEach(atualizarSelect);

  campoNascimento.addEventListener("change", calcularIdade);
  campoDataAvaliacao.addEventListener("change", calcularIdade);
  campoTelefone.addEventListener("input", mascararTelefone);
  selects.forEach(function (select) {
    select.addEventListener("change", function () { atualizarSelect(select); });
  });

  camposObrigatorios.forEach(function (el) {
    ["input", "change"].forEach(function (tipo) {
      el.addEventListener(tipo, function () {
        if (!vazio(el)) marcarErro(el, false);
      });
    });
  });

  form.addEventListener("input", atualizarEtapas);
  form.addEventListener("change", atualizarEtapas);
  atualizarEtapas();

  linksSecao.forEach(function (link) {
    link.addEventListener("click", function (evento) {
      evento.preventDefault();
      mostrarSecao(link.dataset.secao);
    });
  });

  botoesIr.forEach(function (botao) {
    botao.addEventListener("click", function () { mostrarSecao(botao.dataset.ir); });
  });

  document.getElementById("btn-topo").addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
    campoNome.focus({ preventScroll: true });
  });

  const opcaoCompleto = document.getElementById("conteudo-completo");
  const infoCornell = document.getElementById("conteudo-cornell-info");
  const infoShulman = document.getElementById("conteudo-shulman-info");

  /* O modal só abre com a Cornell completa, então a opção com as escalas vem marcada. */
  function prepararConteudo() {
    infoCornell.textContent = "Cornell completa (escore " + Cornell.resultado().total + ")";
    const shulman = Shulman.resultado();
    if (!shulman.preenchido) infoShulman.textContent = "Relógio de Shulman não preenchido";
    else if (shulman.pontuacao === null) infoShulman.textContent = "Relógio de Shulman sem pontuação";
    else infoShulman.textContent = "Relógio de Shulman (" + shulman.pontuacao + " / " + shulman.pontuacaoMaxima + ")";
    opcaoCompleto.checked = true;
  }

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    if (!dadosCompletos()) {
      mostrarSecao("dados");
      validar();
      mostrarAviso("Preencha os dados obrigatórios do paciente para gerar o relatório.");
      return;
    }
    if (!Cornell.completa()) {
      const r = Cornell.resultado();
      mostrarSecao("cornell");
      Cornell.validar();
      mostrarAviso("Responda todos os itens da Escala Cornell para gerar o relatório (" +
        r.respondidos + " de " + r.totalItens + " respondidos).");
      return;
    }
    toast.hidden = true;
    prepararConteudo();
    modalRelatorio.showModal();
  });

  document.getElementById("btn-cancelar").addEventListener("click", function () {
    modalRelatorio.close();
  });

  formRelatorio.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    const formato = formRelatorio.elements.formato.value;
    const dados = coletarDados();
    const comEscalas = formRelatorio.elements.conteudo.value === "completo";
    const cornell = comEscalas ? Cornell.resultado() : null;
    const shulman = comEscalas ? Shulman.resultado() : null;
    const nome = valor("nome");

    botaoBaixar.disabled = true;
    botaoBaixar.textContent = "Gerando...";
    try {
      if (formato === "excel") await Relatorio.gerarExcel(dados, nome, cornell, shulman);
      else Relatorio.gerarPdf(dados, nome, cornell, shulman);
      /* Pequena pausa para o navegador não bloquear o segundo download. */
      await new Promise(function (resolve) { setTimeout(resolve, 400); });
      Relatorio.gerarBackup(coletarCampos(), nome);
      modalRelatorio.close();
      mostrarAviso("Relatório " + (formato === "excel" ? "Excel" : "PDF") + " e backup (.json) baixados.");
    } catch (erro) {
      console.error(erro);
      mostrarAviso("Não foi possível gerar o relatório. Tente novamente.");
    } finally {
      botaoBaixar.disabled = false;
      botaoBaixar.textContent = "Baixar relatório";
    }
  });

  document.getElementById("btn-limpar").addEventListener("click", function () {
    modalLimpar.returnValue = "";
    modalLimpar.showModal();
  });

  modalLimpar.addEventListener("close", function () {
    if (modalLimpar.returnValue !== "confirmar") return;
    form.reset();
    campoDataAvaliacao.value = hojeISO();
    campoIdade.value = "—";
    limparErros();
    selects.forEach(atualizarSelect);
    Cornell.atualizar();
    Cornell.limparPendentes();
    Shulman.limpar();
    atualizarEtapas();
    mostrarSecao("dados");
    mostrarAviso("Campos limpos.");
    campoNome.focus();
  });

  const arquivoBackup = document.getElementById("arquivo-backup");

  document.getElementById("btn-backup").addEventListener("click", function () {
    arquivoBackup.value = "";
    arquivoBackup.click();
  });

  arquivoBackup.addEventListener("change", function () {
    const arquivo = arquivoBackup.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = function () {
      try {
        preencherCampos(Relatorio.lerBackup(leitor.result));
        mostrarSecao("dados");
        mostrarAviso("Backup carregado. Você já pode editar os campos.");
        campoNome.focus();
      } catch (erro) {
        mostrarAviso(erro.message);
      }
    };
    leitor.onerror = function () {
      mostrarAviso("Não foi possível ler o arquivo.");
    };
    leitor.readAsText(arquivo, "UTF-8");
  });

  /* ---------- Rascunho automático (TEMPORÁRIO, só para testes) ----------
     Salva os campos no navegador (localStorage) e preenche de novo ao voltar ao site.
     Para remover: apague este bloco inteiro e a condição RASCUNHO_ATIVO no beforeunload abaixo. */

  const RASCUNHO_ATIVO = true;
  const CHAVE_RASCUNHO = "avaliacao-neuropsicologica-rascunho";

  if (RASCUNHO_ATIVO) {
    let timerRascunho = null;

    const gravarRascunho = function () {
      clearTimeout(timerRascunho);
      const secaoVisivel = document.querySelector(".secao:not([hidden])");
      try {
        localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({
          campos: coletarCampos(),
          secao: secaoVisivel ? secaoVisivel.id.replace("secao-", "") : "dados"
        }));
      } catch (erro) {
        console.warn("Não foi possível salvar o rascunho.", erro);
      }
    };

    const salvarRascunho = function () {
      clearTimeout(timerRascunho);
      timerRascunho = setTimeout(gravarRascunho, 400);
    };

    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || "null");
      if (salvo && salvo.campos) {
        preencherCampos(salvo.campos);
        if (salvo.secao && salvo.secao !== "dados" && dadosCompletos()) mostrarSecao(salvo.secao);
      }
    } catch (erro) {
      console.warn("Não foi possível carregar o rascunho.", erro);
    }

    /* Cliques cobrem troca de etapa, limpar campos e carregar backup. */
    ["input", "change"].forEach(function (tipo) { form.addEventListener(tipo, salvarRascunho); });
    document.addEventListener("click", salvarRascunho);
    modalLimpar.addEventListener("close", salvarRascunho);
    /* Ao sair ou trocar de aba, grava na hora (cobre também o backup, que carrega depois do clique). */
    window.addEventListener("pagehide", gravarRascunho);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") gravarRascunho();
    });

    document.querySelector(".status").lastChild.textContent = " Rascunho salvo neste navegador (modo de teste)";
  }

  /* ---------- Fim do rascunho automático ---------- */

  /* Os dados não são salvos: avisa antes de fechar a página com o formulário preenchido. */
  window.addEventListener("beforeunload", function (evento) {
    if (!RASCUNHO_ATIVO && formularioPreenchido()) {
      evento.preventDefault();
      evento.returnValue = "";
    }
  });
})();
