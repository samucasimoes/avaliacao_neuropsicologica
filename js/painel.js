/* Painel: exige login, troca de tela pelo menu lateral (Início, Nova Avaliação,
   Avaliações Pendentes, Avaliações Concluídas, Ajuda), lista as avaliações do banco e o
   menu do usuário. */

(function () {
  const VIEWS = ["inicio", "avaliacoes", "pendentes", "concluidas", "ajuda"];
  /* Título da barra do topo em cada tela (em Nova Avaliação vem o cabeçalho da etapa). */
  const TITULOS = {
    inicio: ["Início", "Resumo das avaliações em andamento"],
    pendentes: ["Avaliações Pendentes", "Avaliações em andamento, para continuar ou excluir"],
    concluidas: ["Avaliações Concluídas", "Avaliações com todas as etapas preenchidas"],
    ajuda: ["Ajuda", "Como usar o sistema"]
  };
  const views = {};
  VIEWS.forEach(function (nome) { views[nome] = document.getElementById("view-" + nome); });
  const itensMenu = document.querySelectorAll(".menu-item");
  const aviso = window.Formulario.mostrarAviso;

  let perfil = null;

  /* ---------- Login obrigatório ---------- */

  if (!Banco.configurado) {
    window.location.replace("login.html");
    return;
  }

  Banco.aoMudarUsuario(function (usuario) {
    if (!usuario) {
      window.location.replace("login.html");
      return;
    }
    document.getElementById("usuario-email").textContent = usuario.email;
    mostrarNome(Banco.nomeDoEmail(usuario.email));
    document.body.classList.remove("aguardando-login");
    Banco.perfil()
      .then(function (dados) {
        perfil = dados;
        mostrarNome(dados.nome);
      })
      .catch(function (erro) {
        console.error(erro);
        aviso(Banco.mensagemErro(erro));
      })
      .then(function () {
        window.Formulario.ativarBanco(perfil ? perfil.nome : "");
        irPara(viewDoEndereco());
        /* Apaga de vez as que passaram de 6 meses sem alteração. */
        Banco.apagarExpiradas().catch(function (erro) { console.warn("Limpeza das avaliações:", erro); });
      });
  });

  function mostrarNome(nome) {
    const primeiro = String(nome || "").trim().split(/\s+/)[0] || "";
    document.getElementById("usuario-nome").textContent = primeiro;
    document.getElementById("saudacao-nome").textContent = primeiro;
    window.Formulario.definirResponsavel(nome);
  }

  /* ---------- Telas ---------- */

  function viewDoEndereco() {
    const nome = window.location.hash.replace("#", "");
    /* Endereço antigo do Histórico de Avaliações. */
    if (nome === "historico") return "pendentes";
    return VIEWS.indexOf(nome) !== -1 ? nome : "inicio";
  }

  /* Posição de cada item para a entrada em cascata no menu lateral (o CSS usa --i). */
  function numerarCascata(itens) {
    Array.from(itens).forEach(function (item, i) { item.style.setProperty("--i", String(i)); });
  }
  numerarCascata(document.querySelectorAll(".menu .menu-item"));
  numerarCascata(document.querySelectorAll(".menu-voltar, .menu-etapas-titulo, .menu-etapas .steps-list li:not(.etapa-oculta)"));
  const menuPrincipal = document.querySelector(".menu");
  const appbarView = document.getElementById("appbar-view");
  const appbarTitulo = document.getElementById("appbar-view-titulo");
  const appbarTexto = document.getElementById("appbar-view-texto");

  /* A barra do topo muda de altura (cabeçalho das etapas): o CSS usa a altura para
     posicionar o que fica preso logo abaixo dela (ex.: resumo das escalas). */
  const appbar = document.querySelector(".appbar");
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      document.documentElement.style.setProperty("--altura-appbar", appbar.offsetHeight + "px");
    }).observe(appbar);
  }
  const menuEtapas = document.querySelector(".menu-etapas");

  function irPara(nome) {
    /* Em Nova Avaliação o menu lateral mostra as etapas no lugar do menu principal
       e a barra do topo mostra o cabeçalho da etapa aberta. */
    const avaliando = nome === "avaliacoes";
    document.body.classList.toggle("modo-avaliacao", avaliando);
    menuPrincipal.inert = avaliando;
    menuEtapas.inert = !avaliando;
    appbarView.hidden = avaliando;
    if (!avaliando) {
      appbarTitulo.textContent = TITULOS[nome][0];
      appbarTexto.textContent = TITULOS[nome][1];
      /* Reinicia a animação de entrada do título. */
      appbarView.classList.remove("surgindo");
      void appbarView.offsetWidth;
      appbarView.classList.add("surgindo");
    }
    window.Formulario.exibirCabecalho(avaliando);
    VIEWS.forEach(function (v) { views[v].hidden = v !== nome; });
    itensMenu.forEach(function (item) {
      const ativo = item.dataset.view === nome;
      item.classList.toggle("active", ativo);
      if (ativo) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    if (window.location.hash !== "#" + nome) history.replaceState(null, "", "#" + nome);
    window.scrollTo({ top: 0 });
    if (nome === "inicio") window.Formulario.salvar().then(carregarLista);
    if (listas[nome]) window.Formulario.salvar().then(function () { carregarAba(nome); });
  }

  function abrirFormulario() {
    history.pushState(null, "", "#avaliacoes");
    irPara("avaliacoes");
  }

  /* Nova Avaliação (menu lateral ou atalho do Início): sempre começa com o formulário
     vazio. A avaliação que estava aberta continua salva no banco. */
  function novaAvaliacao() {
    fecharMenuUsuario();
    window.Formulario.nova().then(function () {
      abrirFormulario();
      document.getElementById("nome").focus();
    }).catch(function () { /* cancelado */ });
  }

  /* Links do menu e da marca (as etapas do formulário têm o próprio controle). */
  document.addEventListener("click", function (evento) {
    const link = evento.target.closest('a[href^="#"]');
    if (!link || link.dataset.secao) return;
    const nome = link.getAttribute("href").slice(1);
    if (VIEWS.indexOf(nome) === -1) return;
    evento.preventDefault();
    if (nome === "avaliacoes" && link.closest(".menu")) {
      novaAvaliacao();
      return;
    }
    fecharMenuUsuario();
    history.pushState(null, "", "#" + nome);
    irPara(nome);
  });

  window.addEventListener("popstate", function () { irPara(viewDoEndereco()); });

  /* ---------- Início: atalhos ---------- */

  document.getElementById("btn-nova-avaliacao").addEventListener("click", novaAvaliacao);

  /* Carregar arquivo de avaliação: usa o mesmo seletor do botão do formulário. Quando o
     arquivo é lido, o formulário avisa (avaliacao-carregada) e a tela troca. */
  document.getElementById("btn-carregar-arquivo").addEventListener("click", function () {
    document.getElementById("btn-backup").click();
  });

  document.addEventListener("avaliacao-carregada", function () {
    if (views.avaliacoes.hidden) abrirFormulario();
  });

  /* ---------- Utilidades das listas ---------- */

  function dataHora(valor) {
    if (!valor || !valor.toDate) return "—";
    const d = valor.toDate();
    const dois = function (n) { return String(n).padStart(2, "0"); };
    return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear() +
      " às " + dois(d.getHours()) + ":" + dois(d.getMinutes());
  }

  function concluida(av) {
    return av.status === "concluida";
  }

  const ICONE_PESSOA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
  const ICONE_SETA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const ICONE_RELOGIO = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const ICONE_OK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/></svg>';
  const ICONE_ALERTA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5"/><path d="M12 16h.01"/></svg>';
  const ICONE_BAIXAR = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  const ICONE_LIXEIRA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
  const ICONE_EDITAR = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></svg>';
  const ICONE_OLHO = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICONE_IMPRESSORA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>';

  function seloStatus(av) {
    return '<span class="status ' + (concluida(av) ? "status-concluida" : "status-andamento") + '">' +
      (concluida(av) ? ICONE_OK + "Concluída" : ICONE_RELOGIO + "Em andamento") + "</span>";
  }

  /* Lista do banco com o status conferido (todas as etapas 100% = Concluída). */
  function buscarAvaliacoes(limite) {
    return Banco.listarAvaliacoes(limite).then(function (lista) {
      return window.Formulario.conferirStatus(lista);
    });
  }

  function abrirAvaliacao(id, el, opcoes) {
    el.classList.add("abrindo");
    return window.Formulario.abrir(id, opcoes)
      .then(abrirFormulario)
      .catch(function (erro) {
        if (erro && erro.message === "cancelado") return;
        aviso(Banco.mensagemErro(erro));
      })
      .then(function () { el.classList.remove("abrindo"); });
  }

  /* Pesquisa pelo nome sem diferenciar maiúsculas nem acentos ("joao" acha "João"). */
  function normalizar(texto) {
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  /* ---------- Início: lista de avaliações em andamento ---------- */

  const corpoLista = document.getElementById("lista-corpo");
  const listaVazia = document.getElementById("lista-vazia");

  function celula(texto, classe) {
    const td = document.createElement("td");
    if (classe) td.className = classe;
    td.textContent = texto;
    return td;
  }

  function linhaAvaliacao(av) {
    const tr = document.createElement("tr");
    tr.tabIndex = 0;
    tr.className = "linha-clicavel";
    const nome = av.paciente || "Paciente sem nome";
    tr.title = "Abrir a avaliação de " + nome;

    const tdPaciente = document.createElement("td");
    tdPaciente.className = "col-paciente";
    tdPaciente.innerHTML = ICONE_PESSOA;
    const span = document.createElement("span");
    span.textContent = nome;
    tdPaciente.appendChild(span);
    tr.appendChild(tdPaciente);

    tr.appendChild(celula(dataHora(av.atualizadoEm)));
    tr.appendChild(celula(av.responsavelNome || "—"));

    const tdStatus = document.createElement("td");
    tdStatus.innerHTML = seloStatus(av);
    tr.appendChild(tdStatus);

    const tdSeta = document.createElement("td");
    tdSeta.className = "col-seta";
    tdSeta.innerHTML = ICONE_SETA;
    tr.appendChild(tdSeta);

    const abrir = function () { abrirAvaliacao(av.id, tr); };
    tr.addEventListener("click", abrir);
    tr.addEventListener("keydown", function (evento) {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        abrir();
      }
    });
    return tr;
  }

  function mensagemLista(texto) {
    corpoLista.replaceChildren();
    listaVazia.textContent = texto;
    listaVazia.hidden = !texto;
  }

  let pedidoLista = 0;

  function carregarLista() {
    if (!corpoLista.children.length) mensagemLista("Carregando…");
    const pedido = ++pedidoLista;
    buscarAvaliacoes(300)
      .then(function (lista) {
        if (pedido !== pedidoLista) return;
        const itens = lista.filter(function (av) { return !concluida(av); }).slice(0, 8);
        if (!itens.length) {
          mensagemLista("Nenhuma avaliação em andamento. Clique em Iniciar nova avaliação para começar.");
          return;
        }
        listaVazia.hidden = true;
        corpoLista.replaceChildren.apply(corpoLista, itens.map(linhaAvaliacao));
      })
      .catch(function (erro) {
        if (pedido !== pedidoLista) return;
        console.error(erro);
        mensagemLista(Banco.mensagemErro(erro));
      });
  }

  /* ---------- Prazo até a exclusão ----------
     Contagem regressiva ("Será apagada em 179d 23h 59min 08s") e o nível do alerta (cor).
     Atualiza a cada segundo enquanto Pendentes ou Concluídas está aberta. */

  function textoPrazo(restante) {
    if (restante <= 0) return "Prazo vencido: será apagada no próximo acesso";
    const total = Math.floor(restante / 1000);
    const dias = Math.floor(total / 86400);
    const horas = Math.floor((total % 86400) / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const segundos = total % 60;
    const dois = function (n) { return String(n).padStart(2, "0"); };
    return "Será apagada em " + (dias ? dias + "d " : "") + dois(horas) + "h " +
      dois(minutos) + "min " + dois(segundos) + "s";
  }

  function nivelPrazo(restante) {
    const dias = restante / 86400000;
    return dias <= 7 ? "urgente" : dias <= 30 ? "atencao" : "normal";
  }

  function prazo(av) {
    const expira = Banco.expiraEm(av).getTime();
    const restante = expira - Date.now();
    return { expira: expira, texto: textoPrazo(restante), nivel: nivelPrazo(restante) };
  }

  let relogio = null;

  function atualizarPrazos() {
    const aberta = Object.keys(listas).filter(function (nome) { return !views[nome].hidden; })[0];
    if (!aberta) {
      clearInterval(relogio);
      relogio = null;
      return;
    }
    const agora = Date.now();
    listas[aberta].ul.querySelectorAll(".prazo[data-expira]").forEach(function (el) {
      const restante = Number(el.dataset.expira) - agora;
      el.querySelector("span").textContent = textoPrazo(restante);
      el.className = "prazo prazo-" + nivelPrazo(restante);
    });
  }

  function ligarRelogio() {
    if (!relogio) relogio = setInterval(atualizarPrazos, 1000);
  }

  /* ---------- Avaliações Pendentes e Concluídas ---------- */

  const listas = {};
  ["pendentes", "concluidas"].forEach(function (nome) {
    listas[nome] = {
      nome: nome,
      ul: document.getElementById(nome + "-lista"),
      vazio: document.getElementById(nome + "-vazio"),
      total: document.getElementById(nome + "-total"),
      busca: document.getElementById(nome + "-busca"),
      itens: [],
      pedido: 0
    };
    listas[nome].busca.addEventListener("input", function () { filtrar(listas[nome]); });
  });

  function botao(classe, icone, texto, titulo, acao) {
    const b = document.createElement("button");
    b.className = "btn btn-pequeno " + classe;
    b.type = "button";
    b.innerHTML = icone;
    b.appendChild(document.createTextNode(texto));
    b.title = titulo;
    b.addEventListener("click", function () { acao(b); });
    return b;
  }

  function itemLista(av, lista) {
    const li = document.createElement("li");
    li.className = "historico-item";
    const nome = av.paciente || "Paciente sem nome";
    const p = prazo(av);
    li.dataset.busca = normalizar(nome);

    li.innerHTML =
      '<div class="historico-info">' +
        '<p class="historico-nome">' + ICONE_PESSOA + '<span></span></p>' +
        '<p class="historico-detalhes"></p>' +
        '<div class="historico-selos">' + seloStatus(av) +
          '<span class="prazo prazo-' + p.nivel + '" data-expira="' + p.expira + '" title="Apagada de vez ' + Banco.DIAS_GUARDADA + ' dias (6 meses) depois da última alteração">' +
            ICONE_ALERTA + "<span></span></span>" +
        "</div>" +
      "</div>" +
      '<div class="historico-acoes"></div>';
    li.querySelector(".historico-nome span").textContent = nome;
    li.querySelector(".historico-detalhes").textContent =
      "Atualizada em " + dataHora(av.atualizadoEm) + " · Responsável: " + (av.responsavelNome || "—");
    li.querySelector(".prazo span").textContent = p.texto;
    const acoes = li.querySelector(".historico-acoes");

    if (lista.nome === "pendentes") {
      acoes.appendChild(botao("btn-primary", ICONE_EDITAR, "Editar avaliação",
        "Abrir a avaliação de " + nome + " no formulário para continuar",
        function () { abrirAvaliacao(av.id, li); }));
      /* Só quem iniciou a avaliação pode excluir (as regras do Firestore também conferem). */
      const usuario = Banco.usuario();
      if (usuario && av.responsavelUid === usuario.uid) {
        acoes.appendChild(botao("btn-excluir", ICONE_LIXEIRA, "Excluir avaliação",
          "Excluir de vez a avaliação de " + nome,
          function (b) { confirmarExclusao(av, li, b, lista); }));
      }
    } else {
      acoes.appendChild(botao("btn-light", ICONE_OLHO, "Visualizar",
        "Abrir a avaliação de " + nome + " só para leitura",
        function () { abrirAvaliacao(av.id, li, { somenteLeitura: true }); }));
      acoes.appendChild(botao("btn-light", ICONE_IMPRESSORA, "Imprimir",
        "Imprimir todas as páginas ou só as escolhidas da avaliação de " + nome,
        function (b) { escolherImpressao(av, b); }));
      acoes.appendChild(botao("btn-primary", ICONE_BAIXAR, "Salvar PDF e arquivo",
        "Baixar o PDF e o arquivo (.json) da avaliação de " + nome,
        function (b) {
          b.disabled = true;
          window.Formulario.baixarArquivos(av.id)
            .then(function () { aviso("PDF e arquivo (.json) de " + nome + " baixados."); })
            .catch(function (erro) {
              console.error(erro);
              aviso("Não foi possível gerar os arquivos: " + Banco.mensagemErro(erro));
            })
            .then(function () { b.disabled = false; });
        }));
    }
    return li;
  }

  function textoVazio(lista) {
    return lista.nome === "pendentes"
      ? "Nenhuma avaliação pendente."
      : "Nenhuma avaliação concluída. Ela aparece aqui quando todas as etapas ficam 100% preenchidas.";
  }

  /* Mostra só os itens cujo nome do paciente contém o que foi digitado. */
  function filtrar(lista) {
    const termo = normalizar(lista.busca.value);
    let visiveis = 0;
    Array.from(lista.ul.children).forEach(function (li) {
      const mostra = !termo || li.dataset.busca.indexOf(termo) !== -1;
      li.hidden = !mostra;
      if (mostra) visiveis++;
    });
    const total = lista.ul.children.length;
    lista.total.textContent = termo
      ? visiveis + " de " + total
      : total === 1 ? "1 avaliação" : total + " avaliações";
    if (!total) lista.vazio.textContent = textoVazio(lista);
    else if (!visiveis) lista.vazio.textContent = "Nenhum paciente encontrado com “" + lista.busca.value.trim() + "”.";
    lista.vazio.hidden = visiveis > 0;
  }

  function carregarAba(nome) {
    const lista = listas[nome];
    if (!lista.ul.children.length) {
      lista.vazio.textContent = "Carregando…";
      lista.vazio.hidden = false;
    }
    const pedido = ++lista.pedido;
    buscarAvaliacoes(300)
      .then(function (todas) {
        if (pedido !== lista.pedido) return;
        const itens = todas.filter(function (av) { return concluida(av) === (nome === "concluidas"); });
        lista.ul.replaceChildren.apply(lista.ul, itens.map(function (av) { return itemLista(av, lista); }));
        filtrar(lista);
        ligarRelogio();
      })
      .catch(function (erro) {
        if (pedido !== lista.pedido) return;
        console.error(erro);
        lista.ul.replaceChildren();
        lista.vazio.textContent = Banco.mensagemErro(erro);
        lista.vazio.hidden = false;
      });
  }

  /* ---------- Imprimir: todas ou só as páginas escolhidas ----------
     Usado no Imprimir das Avaliações Concluídas e no Imprimir Avaliação do topo do formulário. */

  const modalImprimir = document.getElementById("modal-imprimir");
  const listaPaginas = document.getElementById("imprimir-lista");
  const campoPaginas = document.getElementById("imprimir-paginas");
  const botaoConfirmarImpressao = document.getElementById("imprimir-confirmar");
  let pendenteImpressao = null;

  function modoImpressao() {
    return modalImprimir.querySelector('input[name="imprimir-modo"]:checked').value;
  }

  function paginasMarcadas() {
    return Array.from(listaPaginas.querySelectorAll("input:checked")).map(function (c) { return c.value; });
  }

  function atualizarModalImpressao() {
    const escolher = modoImpressao() === "escolher";
    campoPaginas.disabled = !escolher;
    botaoConfirmarImpressao.disabled = escolher && !paginasMarcadas().length;
  }

  function escolherImpressao(av, origem) {
    let paginas;
    try {
      paginas = window.Formulario.paginas(av.campos);
    } catch (erro) {
      console.error(erro);
      aviso("Não foi possível montar as páginas desta avaliação.");
      return;
    }
    pendenteImpressao = { av: av, origem: origem };
    document.getElementById("imprimir-nome").textContent = av.paciente || "paciente sem nome";
    modalImprimir.querySelector('input[value="todas"]').checked = true;
    listaPaginas.replaceChildren.apply(listaPaginas, paginas.map(function (pagina) {
      const label = document.createElement("label");
      label.className = "imprimir-opcao";
      const caixa = document.createElement("input");
      caixa.type = "checkbox";
      caixa.value = pagina.id;
      caixa.checked = true;
      label.appendChild(caixa);
      label.appendChild(document.createTextNode(" " + pagina.titulo));
      return label;
    }));
    atualizarModalImpressao();
    modalImprimir.returnValue = "";
    modalImprimir.showModal();
  }

  const botaoImprimirTopo = document.getElementById("btn-imprimir-topo");
  botaoImprimirTopo.addEventListener("click", function () {
    escolherImpressao(window.Formulario.atual(), botaoImprimirTopo);
  });

  modalImprimir.addEventListener("change", atualizarModalImpressao);
  document.getElementById("imprimir-marcar").addEventListener("click", function () {
    listaPaginas.querySelectorAll("input").forEach(function (c) { c.checked = true; });
    atualizarModalImpressao();
  });
  document.getElementById("imprimir-desmarcar").addEventListener("click", function () {
    listaPaginas.querySelectorAll("input").forEach(function (c) { c.checked = false; });
    atualizarModalImpressao();
  });

  /* Baixa o PDF direto, com todas as páginas ou só as escolhidas. */
  botaoConfirmarImpressao.addEventListener("click", function () {
    const pedido = pendenteImpressao;
    if (!pedido) return;
    const ids = modoImpressao() === "escolher" ? paginasMarcadas() : null;
    try {
      window.Formulario.imprimir(pedido.av.campos, ids);
      aviso("Avaliação em PDF baixada.");
    } catch (erro) {
      console.error(erro);
      aviso("Não foi possível gerar o PDF. Tente novamente.");
    }
  });

  modalImprimir.addEventListener("close", function () {
    const pedido = pendenteImpressao;
    pendenteImpressao = null;
    if (pedido && modalImprimir.returnValue !== "confirmar") pedido.origem.focus();
  });

  /* ---------- Excluir (com confirmação) ---------- */

  const modalExcluir = document.getElementById("modal-excluir");
  let pendenteExclusao = null;

  function confirmarExclusao(av, li, botaoExcluir, lista) {
    pendenteExclusao = { av: av, li: li, botao: botaoExcluir, lista: lista };
    document.getElementById("excluir-nome").textContent = av.paciente || "paciente sem nome";
    modalExcluir.returnValue = "";
    modalExcluir.showModal();
  }

  modalExcluir.addEventListener("close", function () {
    const pedido = pendenteExclusao;
    pendenteExclusao = null;
    if (!pedido || modalExcluir.returnValue !== "confirmar") {
      if (pedido) pedido.botao.focus();
      return;
    }
    const nome = pedido.av.paciente || "paciente sem nome";
    pedido.botao.disabled = true;
    Banco.excluirAvaliacao(pedido.av.id)
      .then(function () {
        window.Formulario.esquecer(pedido.av.id);
        pedido.li.classList.add("saindo");
        setTimeout(function () {
          pedido.li.remove();
          filtrar(pedido.lista);
        }, 320);
        aviso("Avaliação de " + nome + " excluída.");
      })
      .catch(function (erro) {
        console.error(erro);
        pedido.botao.disabled = false;
        /* O botão só aparece para quem iniciou; se o banco recusar, quase sempre é porque
           as regras novas do Firestore (firestore.rules) ainda não foram publicadas. */
        aviso(erro && erro.code === "permission-denied"
          ? "O banco recusou a exclusão. Publique as regras novas do Firestore (firestore.rules) e tente de novo."
          : "Não foi possível excluir: " + Banco.mensagemErro(erro));
      });
  });

  /* ---------- Menu do usuário ---------- */

  const botaoUsuario = document.getElementById("btn-usuario");
  const menuUsuario = document.getElementById("usuario-menu");

  function fecharMenuUsuario() {
    menuUsuario.hidden = true;
    botaoUsuario.setAttribute("aria-expanded", "false");
  }

  botaoUsuario.addEventListener("click", function (evento) {
    evento.stopPropagation();
    const abrir = menuUsuario.hidden;
    menuUsuario.hidden = !abrir;
    botaoUsuario.setAttribute("aria-expanded", String(abrir));
  });

  document.addEventListener("click", function (evento) {
    if (!menuUsuario.hidden && !evento.target.closest(".usuario")) fecharMenuUsuario();
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && !menuUsuario.hidden) {
      fecharMenuUsuario();
      botaoUsuario.focus();
    }
  });

  document.getElementById("btn-sair").addEventListener("click", function () {
    fecharMenuUsuario();
    window.Formulario.encerrar()
      .then(function () { return Banco.sair(); })
      .then(function () { window.location.replace("login.html"); })
      .catch(function (erro) { aviso(Banco.mensagemErro(erro)); });
  });
})();
