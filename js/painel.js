/* Painel: exige login, troca de tela pelo menu lateral (Início, Nova Avaliação,
   Histórico de Avaliações, Ajuda), lista as avaliações do banco e o menu do usuário. */

(function () {
  const VIEWS = ["inicio", "avaliacoes", "historico", "ajuda"];
  /* Título da barra do topo em cada tela (em Nova Avaliação vem o cabeçalho da etapa). */
  const TITULOS = {
    inicio: ["Início", "Resumo das avaliações em andamento"],
    historico: ["Histórico de Avaliações", "Avaliações dos últimos " + Banco.DIAS_GUARDADA + " dias"],
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
        /* Apaga de vez as que passaram dos 30 dias sem alteração. */
        Banco.apagarExpiradas().catch(function (erro) { console.warn("Limpeza do histórico:", erro); });
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
    if (nome === "historico") window.Formulario.salvar().then(carregarHistorico);
  }

  /* Links do menu e da marca (as etapas do formulário têm o próprio controle). */
  document.addEventListener("click", function (evento) {
    const link = evento.target.closest('a[href^="#"]');
    if (!link || link.dataset.secao) return;
    const nome = link.getAttribute("href").slice(1);
    if (VIEWS.indexOf(nome) === -1) return;
    evento.preventDefault();
    fecharMenuUsuario();
    history.pushState(null, "", "#" + nome);
    irPara(nome);
  });

  window.addEventListener("popstate", function () { irPara(viewDoEndereco()); });

  /* ---------- Início: atalhos ---------- */

  document.getElementById("btn-nova-avaliacao").addEventListener("click", function () {
    window.Formulario.nova().then(function () {
      history.pushState(null, "", "#avaliacoes");
      irPara("avaliacoes");
      document.getElementById("nome").focus();
    }).catch(function () { /* cancelado */ });
  });

  document.getElementById("btn-ver-andamento").addEventListener("click", function () {
    document.getElementById("lista-avaliacoes").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- Início: lista de avaliações ---------- */

  const corpoLista = document.getElementById("lista-corpo");
  const listaVazia = document.getElementById("lista-vazia");

  function dataHora(valor) {
    if (!valor || !valor.toDate) return "—";
    const d = valor.toDate();
    const dois = function (n) { return String(n).padStart(2, "0"); };
    return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear() +
      " às " + dois(d.getHours()) + ":" + dois(d.getMinutes());
  }

  const ICONE_PESSOA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
  const ICONE_SETA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const ICONE_RELOGIO = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const ICONE_OK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/></svg>';

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
    const concluida = av.status === "concluida";
    tdStatus.innerHTML = '<span class="status ' + (concluida ? "status-concluida" : "status-andamento") + '">' +
      (concluida ? ICONE_OK + "Concluída" : ICONE_RELOGIO + "Em andamento") + "</span>";
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

  function abrirAvaliacao(id, el) {
    el.classList.add("abrindo");
    return window.Formulario.abrir(id)
      .then(function () {
        history.pushState(null, "", "#avaliacoes");
        irPara("avaliacoes");
      })
      .catch(function (erro) {
        if (erro && erro.message === "cancelado") return;
        aviso(Banco.mensagemErro(erro));
      })
      .then(function () { el.classList.remove("abrindo"); });
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
    Banco.listarAvaliacoes(100)
      .then(function (lista) {
        if (pedido !== pedidoLista) return;
        const itens = lista.filter(function (av) { return av.status !== "concluida"; }).slice(0, 8);
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

  /* ---------- Histórico de Avaliações ---------- */

  const listaHistorico = document.getElementById("historico-lista");
  const historicoVazio = document.getElementById("historico-vazio");
  const historicoTotal = document.getElementById("historico-total");
  const ICONE_ALERTA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5"/><path d="M12 16h.01"/></svg>';
  const ICONE_BAIXAR = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  const ICONE_ABRIR = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="m10 13 2 2 3-3"/></svg>';

  /* "Será apagada em 12 dias", "amanhã", "hoje"… e o nível do alerta (cor). */
  function prazo(av) {
    const restante = Banco.expiraEm(av).getTime() - Date.now();
    const horas = Math.max(0, Math.ceil(restante / 3600000));
    const dias = Math.ceil(restante / 86400000);
    let texto;
    if (horas < 24) texto = horas <= 1 ? "Será apagada em menos de 1 hora" : "Será apagada em " + horas + " horas";
    else if (dias === 1) texto = "Será apagada amanhã";
    else texto = "Será apagada em " + dias + " dias";
    return { texto: texto, nivel: dias <= 3 ? "urgente" : dias <= 7 ? "atencao" : "normal", dias: dias };
  }

  function itemHistorico(av) {
    const li = document.createElement("li");
    li.className = "historico-item";
    const nome = av.paciente || "Paciente sem nome";
    const p = prazo(av);
    const concluida = av.status === "concluida";

    li.innerHTML =
      '<div class="historico-info">' +
        '<p class="historico-nome">' + ICONE_PESSOA + '<span></span></p>' +
        '<p class="historico-detalhes"></p>' +
      "</div>" +
      '<span class="status ' + (concluida ? "status-concluida" : "status-andamento") + '">' +
        (concluida ? ICONE_OK + "Concluída" : ICONE_RELOGIO + "Em andamento") + "</span>" +
      '<span class="prazo prazo-' + p.nivel + '" title="Apagada de vez ' + Banco.DIAS_GUARDADA + ' dias depois da última alteração">' +
        ICONE_ALERTA + "<span></span></span>" +
      '<div class="historico-acoes">' +
        '<button class="btn btn-light btn-pequeno" type="button" data-acao="abrir">' + ICONE_ABRIR + "Abrir</button>" +
        '<button class="btn btn-primary btn-pequeno" type="button" data-acao="baixar">' + ICONE_BAIXAR + "Salvar PDF e arquivo</button>" +
      "</div>";
    li.querySelector(".historico-nome span").textContent = nome;
    li.querySelector(".historico-detalhes").textContent =
      "Atualizada em " + dataHora(av.atualizadoEm) + " · Responsável: " + (av.responsavelNome || "—");
    li.querySelector(".prazo span").textContent = p.texto;

    const botaoAbrir = li.querySelector('[data-acao="abrir"]');
    const botaoBaixar = li.querySelector('[data-acao="baixar"]');
    botaoAbrir.title = "Abrir a avaliação de " + nome + " no formulário";
    botaoBaixar.title = "Baixar o PDF e o arquivo (.json) da avaliação de " + nome;
    botaoAbrir.addEventListener("click", function () { abrirAvaliacao(av.id, li); });
    botaoBaixar.addEventListener("click", function () {
      botaoBaixar.disabled = true;
      window.Formulario.baixarArquivos(av.id)
        .then(function () { aviso("PDF e arquivo (.json) de " + nome + " baixados."); })
        .catch(function (erro) {
          console.error(erro);
          aviso("Não foi possível gerar os arquivos: " + Banco.mensagemErro(erro));
        })
        .then(function () { botaoBaixar.disabled = false; });
    });
    return li;
  }

  let pedidoHistorico = 0;

  function carregarHistorico() {
    if (!listaHistorico.children.length) {
      historicoVazio.textContent = "Carregando…";
      historicoVazio.hidden = false;
    }
    const pedido = ++pedidoHistorico;
    Banco.listarAvaliacoes(300)
      .then(function (lista) {
        if (pedido !== pedidoHistorico) return;
        historicoTotal.textContent = lista.length === 1 ? "1 avaliação" : lista.length + " avaliações";
        listaHistorico.replaceChildren.apply(listaHistorico, lista.map(itemHistorico));
        historicoVazio.textContent = "Nenhuma avaliação nos últimos " + Banco.DIAS_GUARDADA + " dias.";
        historicoVazio.hidden = lista.length > 0;
      })
      .catch(function (erro) {
        if (pedido !== pedidoHistorico) return;
        console.error(erro);
        listaHistorico.replaceChildren();
        historicoVazio.textContent = Banco.mensagemErro(erro);
        historicoVazio.hidden = false;
      });
  }

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
