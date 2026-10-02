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
  const linkCornell = document.querySelector('[data-secao="cornell"]');
  const linkDados = document.querySelector('[data-secao="dados"]');
  const botoesIr = document.querySelectorAll("[data-ir]");
  const botoesDaSecao = document.querySelectorAll("[data-na-secao]");

  /* Libera a Escala Cornell só depois dos dados obrigatórios do paciente. */
  function atualizarEtapas() {
    const liberada = dadosCompletos();
    linkCornell.classList.toggle("bloqueada", !liberada);
    linkCornell.setAttribute("aria-disabled", String(!liberada));
    linkCornell.title = liberada ? "" : "Preencha os dados do paciente para liberar";
    linkDados.classList.toggle("concluida", liberada);
    const r = Cornell.resultado();
    linkCornell.classList.toggle("concluida", liberada && r.respondidos === r.totalItens);
  }

  function mostrarSecao(nome) {
    if (nome !== "dados" && !dadosCompletos()) {
      mostrarSecao("dados");
      validar();
      mostrarAviso("Preencha os dados obrigatórios do paciente para liberar a Escala Cornell.");
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
      botao.hidden = botao.dataset.naSecao !== nome;
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
    limparErros();
    atualizarEtapas();
  }

  function formularioPreenchido() {
    return Array.from(form.elements).some(function (el) {
      if (el.readOnly || !el.name || el.id === "data-avaliacao") return false;
      if (el.type === "radio") return el.checked;
      return el.value && el.value.trim() !== "";
    });
  }

  /* ---------- Eventos ---------- */

  Cornell.iniciar(form);
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
  const opcaoDados = document.getElementById("conteudo-dados");
  const infoCornell = document.getElementById("conteudo-cornell-info");

  /* A opção com a escala só fica disponível se algum item foi respondido. */
  function prepararConteudo() {
    const r = Cornell.resultado();
    const temEscala = r.respondidos > 0;
    opcaoCompleto.disabled = !temEscala;
    opcaoCompleto.closest(".format").classList.toggle("indisponivel", !temEscala);
    if (!temEscala) infoCornell.textContent = "Escala ainda não preenchida";
    else if (r.respondidos < r.totalItens) infoCornell.textContent = "Parcial: " + r.respondidos + " de " + r.totalItens + " itens respondidos";
    else infoCornell.textContent = "Escala completa (escore " + r.total + ")";
    (temEscala ? opcaoCompleto : opcaoDados).checked = true;
  }

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    if (!dadosCompletos()) {
      mostrarSecao("dados");
      validar();
      mostrarAviso("Preencha os dados obrigatórios do paciente para gerar o relatório.");
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
    const cornell = formRelatorio.elements.conteudo.value === "completo" ? Cornell.resultado() : null;
    const nome = valor("nome");

    botaoBaixar.disabled = true;
    botaoBaixar.textContent = "Gerando...";
    try {
      if (formato === "excel") await Relatorio.gerarExcel(dados, nome, cornell);
      else Relatorio.gerarPdf(dados, nome, cornell);
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

  /* Os dados não são salvos: avisa antes de fechar a página com o formulário preenchido. */
  window.addEventListener("beforeunload", function (evento) {
    if (formularioPreenchido()) {
      evento.preventDefault();
      evento.returnValue = "";
    }
  });
})();
