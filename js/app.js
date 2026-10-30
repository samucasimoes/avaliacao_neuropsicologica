/* Comportamento do formulário: cálculos, máscaras, navegação e geração do relatório. */

(function () {
  const form = document.getElementById("form-avaliacao");
  const campoNome = document.getElementById("nome");
  const campoNascimento = document.getElementById("nascimento");
  const campoIdade = document.getElementById("idade");
  const campoTelefone = document.getElementById("telefone");
  const campoDataAvaliacao = document.getElementById("data-avaliacao");
  const selects = form.querySelectorAll("select");
  const modalLimpar = document.getElementById("modal-limpar");
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

  /* ---------- Idade ---------- */

  /* Calcula pela data de nascimento. Sem ela, mantém a idade digitada à mão. */
  function calcularIdade() {
    const valor = campoNascimento.value;
    if (!valor) return;
    const nascimento = new Date(valor + "T00:00:00");
    const referencia = campoDataAvaliacao.value
      ? new Date(campoDataAvaliacao.value + "T00:00:00")
      : new Date();
    let idade = referencia.getFullYear() - nascimento.getFullYear();
    const mes = referencia.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && referencia.getDate() < nascimento.getDate())) idade--;
    campoIdade.value = idade >= 0 && idade < 130 ? String(idade) : "";
  }

  /* Só números na idade digitada (aceita também valores antigos como "82 anos"). */
  function limparIdade() {
    campoIdade.value = campoIdade.value.replace(/\D/g, "").slice(0, 3);
  }

  function idadeNumero() {
    const idade = parseInt(campoIdade.value, 10);
    return isNaN(idade) ? null : idade;
  }

  function textoIdade(idade) {
    return idade + (idade === 1 ? " ano" : " anos");
  }

  /* ---------- Nome ---------- */

  const PARTICULAS = ["da", "das", "de", "do", "dos", "e"];

  /* Primeira letra de cada nome em maiúscula ("maria da silva" -> "Maria da Silva"). */
  function capitalizarNome() {
    const inicio = campoNome.selectionStart;
    const fim = campoNome.selectionEnd;
    campoNome.value = campoNome.value.toLowerCase().replace(/[^\s]+/g, function (palavra, posicao) {
      if (posicao > 0 && PARTICULAS.indexOf(palavra) !== -1) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    });
    if (document.activeElement === campoNome) campoNome.setSelectionRange(inicio, fim);
  }

  /* Título da página: nome e idade do paciente. */
  const tituloPagina = document.getElementById("titulo-pagina");

  function atualizarTitulo() {
    const nome = campoNome.value.trim();
    const idade = idadeNumero();
    const partes = [nome, idade === null ? "" : textoIdade(idade)].filter(Boolean);
    tituloPagina.textContent = partes.length ? partes.join(" · ") : "Nova avaliação";
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

  /* ---------- Campos vazios dos dados do paciente ---------- */

  const camposDados = Array.from(form.querySelectorAll("#secao-dados [name]")).filter(function (el) {
    return !el.readOnly;
  });

  function dadosVazios() {
    return camposDados.filter(function (el) { return el.value.trim() === ""; });
  }

  /* ---------- Etapas ---------- */

  const secoes = document.querySelectorAll(".secao");
  /* Etapas escondidas (.etapa-oculta, ex.: IQCODE) ficam fora da navegação, dos avisos
     e do relatório. O menu é renumerado para não pular números. */
  const linksSecao = Array.from(document.querySelectorAll("[data-secao]")).filter(function (link) {
    return !link.closest(".etapa-oculta");
  });
  linksSecao.forEach(function (link, i) {
    link.querySelector(".step-num").textContent = String(i + 1);
  });
  const ordem = linksSecao.map(function (link) { return link.dataset.secao; });
  const botaoAnterior = document.getElementById("btn-anterior");
  const botaoProxima = document.getElementById("btn-proxima");
  const botaoGerar = document.getElementById("btn-gerar");
  const botaoGerarSecundario = document.getElementById("btn-gerar-secundario");
  const ICONE_COMPLETA = '<svg class="step-ok" viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>';
  let secaoAtual = "dados";

  /* Nome da etapa como aparece no menu, sem o número. */
  function nomeEtapa(id) {
    const link = linksSecao[ordem.indexOf(id)];
    const numero = link.querySelector(".step-num").textContent;
    return link.textContent.trim().slice(numero.length).trim();
  }

  /* Aba 100%: todos os campos da etapa preenchidos. */
  function etapaCompleta(id) {
    if (id === "dados") return dadosVazios().length === 0;
    if (id === "cornell") return Cornell.completa();
    if (id === "shulman") return true;
    return Secoes.completa(id);
  }

  /* Marca em verde, com o ícone de correto, as abas com todos os campos preenchidos. */
  function atualizarEtapas() {
    linksSecao.forEach(function (link) {
      const id = link.dataset.secao;
      const completa = etapaCompleta(id);
      link.classList.toggle("completa", completa);
      link.title = "Ir para: " + nomeEtapa(id) + (completa ? " (100% preenchida)" : "");
    });
  }

  function atualizarNavegacao() {
    const posicao = ordem.indexOf(secaoAtual);
    const anterior = ordem[posicao - 1];
    const proxima = ordem[posicao + 1];
    botaoAnterior.hidden = !anterior;
    if (anterior) {
      botaoAnterior.querySelector(".btn-rotulo").textContent = nomeEtapa(anterior);
      botaoAnterior.title = "Voltar para " + nomeEtapa(anterior);
    }
    botaoProxima.hidden = !proxima;
    botaoGerarSecundario.hidden = !proxima;
    botaoGerar.hidden = !!proxima;
    if (proxima) {
      botaoProxima.querySelector(".btn-rotulo").textContent = "Continuar: " + nomeEtapa(proxima);
      botaoProxima.title = "Continuar para " + nomeEtapa(proxima);
    }
  }

  function mostrarSecao(nome) {
    secaoAtual = nome;
    secoes.forEach(function (secao) {
      secao.hidden = secao.id !== "secao-" + nome;
    });
    linksSecao.forEach(function (link) {
      const ativo = link.dataset.secao === nome;
      link.classList.toggle("active", ativo);
      if (ativo) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    atualizarNavegacao();
    window.scrollTo({ top: 0 });
  }

  /* Etapas na ordem dos números do menu, para o relatório. */
  function secoesDoRelatorio() {
    return linksSecao
      .map(function (link) {
        return { id: link.dataset.secao, numero: Number(link.querySelector(".step-num").textContent) };
      })
      /* O Relógio de Shulman fica só na tela: não sai na impressão. */
      .filter(function (etapa) { return etapa.id !== "dados" && etapa.id !== "shulman"; })
      .sort(function (a, b) { return a.numero - b.numero; })
      .map(function (etapa) {
        const conteudo = etapa.id === "cornell" ? Cornell.relatorio()
          : Secoes.relatorio(etapa.id);
        if (conteudo) conteudo.id = etapa.id;
        return conteudo;
      })
      .filter(Boolean);
  }

  /* ---------- Dados para o relatório ---------- */

  function valor(id) {
    return document.getElementById(id).value.trim();
  }

  function coletarDados() {
    const idade = idadeNumero() === null ? "" : textoIdade(idadeNumero());
    return [
      ["Nome", valor("nome")],
      ["Idade", idade],
      ["Data de Nascimento", formatarData(campoNascimento.value)],
      ["Escolaridade", valor("escolaridade")],
      ["Profissão", valor("profissao")],
      ["Telefone", valor("telefone")],
      ["Médico solicitante", valor("medico-solicitante")],
      ["Endereço", valor("endereco")],
      ["História Patológica", valor("historia-patologica")],
      ["História Familiar", valor("historia-familiar")],
      ["Medicamentos em Uso", valor("medicamentos")],
      ["Informante", valor("informante")],
      ["Avaliações", valor("avaliacoes")],
      ["Data da Avaliação", formatarData(campoDataAvaliacao.value)]
    ];
  }

  /* Versão dos nomes dos campos (rascunho e backup .json). Ao renomear ou remover
     campos, suba a versão e converta os nomes antigos em migrarCampos. */
  const VERSAO_CAMPOS = 3;

  /* Converte campos salvos antes da versão 3:
     - Encaminhador virou Médico solicitante;
     - a aba Curva de aprendizagem virou RAVLT (com a coluna DP antes da Classificação);
     - saíram "Traumatismo craniano" (Resumo, item 14) e o TMR (Memória, linha 5);
     - a lista de Funções avaliadas mudou: volta ao padrão (tudo marcado). */
  function migrarCampos(campos) {
    if ((Number(campos.versaoCampos) || 2) >= VERSAO_CAMPOS) return campos;
    const novos = {};
    Object.keys(campos).forEach(function (nome) {
      let novo = nome;
      let m;
      if (nome === "encaminhador") {
        novo = "medicoSolicitante";
      } else if (nome === "curva-analise") {
        novo = "ravlt-comentarios";
      } else if ((m = /^curva-ravlt-(\d+)-(\d+)$/.exec(nome))) {
        novo = "ravlt-tabela-" + m[1] + "-" + (m[2] === "3" ? "4" : m[2]);
      } else if ((m = /^resumo-fatores-(\d+)$/.exec(nome))) {
        const n = Number(m[1]);
        if (n === 14) return;
        if (n > 14) novo = "resumo-fatores-" + (n - 1);
      } else if (/^funcoes-lista-\d+$/.test(nome) || /^memoria-testes-5-/.test(nome)) {
        return;
      }
      novos[novo] = campos[nome];
    });
    return novos;
  }

  /* Campos editáveis (pelo atributo name), usados no backup .json. */
  function coletarCampos() {
    const campos = { versaoCampos: VERSAO_CAMPOS };
    Array.from(form.elements).forEach(function (el) {
      if (!el.name || el.readOnly) return;
      if (el.type === "radio") {
        if (!(el.name in campos)) campos[el.name] = "";
        if (el.checked) campos[el.name] = el.value;
      } else if (el.type === "checkbox") {
        campos[el.name] = el.checked;
      } else {
        campos[el.name] = el.value;
      }
    });
    return campos;
  }

  function preencherCampos(campos) {
    campos = migrarCampos(campos);
    form.reset();
    Array.from(form.elements).forEach(function (el) {
      if (!el.name || el.readOnly || !(el.name in campos)) return;
      const valorCampo = campos[el.name] == null ? "" : String(campos[el.name]);
      if (el.type === "radio") {
        el.checked = el.value === valorCampo;
        return;
      }
      if (el.type === "checkbox") {
        el.checked = campos[el.name] === true;
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
    limparIdade();
    capitalizarNome();
    calcularIdade();
    atualizarTitulo();
    atualizarContadores();
    selects.forEach(atualizarSelect);
    Cornell.atualizar();
    Cornell.limparPendentes();
    Secoes.atualizar();
    atualizarEtapas();
  }

  function formularioPreenchido() {
    return Array.from(form.elements).some(function (el) {
      if (el.readOnly || !el.name || el.id === "data-avaliacao") return false;
      if (el.type === "radio") return el.checked;
      if (el.type === "checkbox") return el.checked !== el.defaultChecked;
      if (el.defaultValue && el.value === el.defaultValue) return false;
      return el.value && el.value.trim() !== "";
    });
  }

  /* ---------- Acessibilidade ---------- */

  /* Toda área clicável ou campo mostra uma dica (title) ao passar o mouse. */
  function aplicarTitulos() {
    document.querySelectorAll("input, select, textarea, button, label").forEach(function (el) {
      if (el.title || el.type === "radio" || el.type === "file") return;
      let dica = "";
      if (el.tagName === "LABEL") {
        if (!el.querySelector("input")) return;
        dica = el.textContent.trim();
      } else if (el.tagName === "BUTTON") {
        dica = el.textContent.trim() || el.getAttribute("aria-label") || "";
      } else {
        dica = (el.labels && el.labels[0] ? el.labels[0].textContent.trim() : "") ||
          el.getAttribute("aria-label") || el.placeholder || "";
        if (dica && el.tagName === "SELECT") dica = "Escolha: " + dica;
        else if (dica && el.type !== "checkbox") dica = "Preencha: " + dica;
      }
      if (dica) el.title = dica.replace(/\s+/g, " ");
    });
  }

  /* Contador de caracteres nos textos longos ("120 / 700"), para o texto caber na folha. */
  const contadores = [];

  function criarContadores() {
    form.querySelectorAll("textarea[maxlength]").forEach(function (area) {
      const contador = document.createElement("span");
      contador.className = "contador";
      contador.setAttribute("aria-live", "polite");
      area.insertAdjacentElement("afterend", contador);
      contadores.push({ area: area, el: contador });
    });
    atualizarContadores();
  }

  function atualizarContadores() {
    contadores.forEach(function (c) {
      const usados = c.area.value.length;
      c.el.textContent = usados + " / " + c.area.maxLength + " caracteres";
      c.el.title = "Limite de caracteres para o texto caber na folha da impressão";
      c.el.classList.toggle("no-limite", usados >= c.area.maxLength);
    });
  }

  /* ---------- Eventos ---------- */

  Cornell.iniciar(form);
  Secoes.iniciar(form, {
    aviso: mostrarAviso,
    paciente: function () {
      return { nome: valor("nome"), idade: idadeNumero(), sexo: valor("sexo") };
    },
    origens: {
      cornell: function () {
        const r = Cornell.resultado();
        if (!r.respondidos) return null;
        const parcial = r.respondidos < r.totalItens;
        return {
          valor: String(r.total),
          texto: r.interpretacao + (parcial ? " (parcial)" : ""),
          nivel: r.total >= 12 ? "alto" : r.total >= 9 ? "medio" : "baixo"
        };
      }
    }
  });
  linksSecao.forEach(function (link) {
    link.insertAdjacentHTML("beforeend", ICONE_COMPLETA);
  });
  campoNascimento.max = hojeISO();
  campoDataAvaliacao.value = hojeISO();
  selects.forEach(atualizarSelect);

  campoNascimento.addEventListener("change", calcularIdade);
  campoIdade.addEventListener("input", limparIdade);
  campoNome.addEventListener("input", capitalizarNome);
  ["input", "change"].forEach(function (tipo) {
    form.addEventListener(tipo, atualizarTitulo);
  });
  campoDataAvaliacao.addEventListener("change", calcularIdade);
  campoTelefone.addEventListener("input", mascararTelefone);
  selects.forEach(function (select) {
    select.addEventListener("change", function () { atualizarSelect(select); });
  });

  ["input", "change"].forEach(function (tipo) {
    form.addEventListener(tipo, function () {
      Secoes.atualizar();
      atualizarEtapas();
    });
  });
  atualizarEtapas();
  atualizarNavegacao();
  atualizarTitulo();
  criarContadores();
  aplicarTitulos();
  form.addEventListener("input", atualizarContadores);
  form.addEventListener("reset", function () { setTimeout(atualizarContadores); });

  linksSecao.forEach(function (link) {
    link.addEventListener("click", function (evento) {
      evento.preventDefault();
      mostrarSecao(link.dataset.secao);
    });
  });

  botaoAnterior.addEventListener("click", function () {
    mostrarSecao(ordem[ordem.indexOf(secaoAtual) - 1]);
  });

  botaoProxima.addEventListener("click", function () {
    mostrarSecao(ordem[ordem.indexOf(secaoAtual) + 1]);
  });

  document.getElementById("btn-topo").addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
    campoNome.focus({ preventScroll: true });
  });

  const botoesImprimir = [botaoGerar, botaoGerarSecundario];

  /* Imprimir Avaliação: baixa o PDF completo direto, sem perguntas. */
  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    toast.hidden = true;
    botoesImprimir.forEach(function (botao) { botao.disabled = true; });
    try {
      Relatorio.gerarPdf(coletarDados(), valor("nome"), secoesDoRelatorio());
      mostrarAviso("Avaliação em PDF baixada.");
    } catch (erro) {
      console.error(erro);
      mostrarAviso("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      botoesImprimir.forEach(function (botao) { botao.disabled = false; });
    }
  });

  /* Gerar Arquivo: baixa só o .json, que depois volta pelo botão Carregar Documento. */
  document.getElementById("btn-gerar-arquivo").addEventListener("click", function () {
    toast.hidden = true;
    try {
      Relatorio.gerarBackup(coletarCampos(), valor("nome"));
      mostrarAviso("Arquivo da avaliação (.json) baixado.");
    } catch (erro) {
      console.error(erro);
      mostrarAviso("Não foi possível gerar o arquivo. Tente novamente.");
    }
  });

  /* Ctrl+P (Cmd+P no Mac) imprime o relatório completo, e não a página do formulário.
     O PDF abre numa nova aba já com a janela de impressão. Se a impressão for aberta
     pelo menu do navegador, o CSS (@media print) mostra só um aviso. */
  function imprimirRelatorio() {
    let endereco;
    try {
      endereco = Relatorio.gerarPdf(coletarDados(), valor("nome"), secoesDoRelatorio(), { imprimir: true });
    } catch (erro) {
      console.error(erro);
      mostrarAviso("Não foi possível abrir a impressão. Tente novamente.");
      return;
    }
    if (!window.open(endereco, "_blank")) {
      mostrarAviso("O navegador bloqueou a nova aba. Permita pop-ups para imprimir com Ctrl+P ou use Imprimir Avaliação.");
    }
  }

  document.addEventListener("keydown", function (evento) {
    if ((evento.ctrlKey || evento.metaKey) && !evento.altKey && !evento.shiftKey &&
        evento.key.toLowerCase() === "p") {
      evento.preventDefault();
      imprimirRelatorio();
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
    selects.forEach(atualizarSelect);
    atualizarTitulo();
    Cornell.atualizar();
    Cornell.limparPendentes();
    Secoes.atualizar();
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
        mostrarAviso("Documento carregado. Você já pode editar os campos.");
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
        const secaoSalva = salvo.secao === "curva" ? "ravlt" : salvo.secao;
        if (secaoSalva && ordem.indexOf(secaoSalva) !== -1) mostrarSecao(secaoSalva);
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
