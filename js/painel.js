/* Painel: exige login, troca de tela pelo menu lateral (Início, Avaliações,
   Profissionais, Ajuda), lista as avaliações do banco e o menu do usuário. */

(function () {
  const VIEWS = ["inicio", "avaliacoes", "profissionais", "ajuda"];
  const views = {};
  VIEWS.forEach(function (nome) { views[nome] = document.getElementById("view-" + nome); });
  const itensMenu = document.querySelectorAll(".menu-item");
  const aviso = window.Formulario.mostrarAviso;

  let perfil = null;
  let mostrarTodas = false;

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
      });
  });

  function mostrarNome(nome) {
    const primeiro = String(nome || "").trim().split(/\s+/)[0] || "";
    document.getElementById("usuario-nome").textContent = primeiro;
    document.getElementById("saudacao-nome").textContent = primeiro;
    document.getElementById("perfil-nome").value = nome || "";
    window.Formulario.definirResponsavel(nome);
  }

  /* ---------- Telas ---------- */

  function viewDoEndereco() {
    const nome = window.location.hash.replace("#", "");
    return VIEWS.indexOf(nome) !== -1 ? nome : "inicio";
  }

  function irPara(nome) {
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
    if (nome === "profissionais") carregarProfissionais();
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
    if (mostrarTodas) {
      mostrarTodas = false;
      carregarLista();
    }
    document.getElementById("lista-avaliacoes").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("btn-ver-todas").addEventListener("click", function () {
    mostrarTodas = !mostrarTodas;
    carregarLista();
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

    const abrir = function () {
      tr.classList.add("abrindo");
      window.Formulario.abrir(av.id)
        .then(function () {
          history.pushState(null, "", "#avaliacoes");
          irPara("avaliacoes");
        })
        .catch(function (erro) {
          if (erro && erro.message === "cancelado") return;
          aviso(Banco.mensagemErro(erro));
        })
        .then(function () { tr.classList.remove("abrindo"); });
    };
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
    document.getElementById("lista-titulo").textContent = mostrarTodas ? "Todas as avaliações" : "Avaliações em andamento";
    document.getElementById("btn-ver-todas").textContent = mostrarTodas ? "Só em andamento" : "Ver todas";
    if (!corpoLista.children.length) mensagemLista("Carregando…");
    const pedido = ++pedidoLista;
    Banco.listarAvaliacoes(mostrarTodas ? 200 : 100)
      .then(function (lista) {
        if (pedido !== pedidoLista) return;
        const itens = mostrarTodas ? lista : lista.filter(function (av) { return av.status !== "concluida"; }).slice(0, 8);
        if (!itens.length) {
          mensagemLista(mostrarTodas ? "Nenhuma avaliação salva ainda." : "Nenhuma avaliação em andamento. Clique em Iniciar nova avaliação para começar.");
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

  /* ---------- Profissionais ---------- */

  const corpoProfissionais = document.getElementById("profissionais-corpo");

  function carregarProfissionais() {
    Banco.listarProfissionais()
      .then(function (lista) {
        corpoProfissionais.replaceChildren.apply(corpoProfissionais, lista.map(function (p) {
          const tr = document.createElement("tr");
          tr.appendChild(celula(p.nome || "—"));
          tr.appendChild(celula(p.email || "—"));
          return tr;
        }));
      })
      .catch(function (erro) { aviso(Banco.mensagemErro(erro)); });
  }

  document.getElementById("form-perfil").addEventListener("submit", function (evento) {
    evento.preventDefault();
    const nome = document.getElementById("perfil-nome").value.trim().replace(/\s+/g, " ");
    if (!nome) {
      aviso("Digite seu nome.");
      return;
    }
    Banco.salvarNome(nome)
      .then(function () {
        perfil = Object.assign(perfil || {}, { nome: nome });
        mostrarNome(nome);
        carregarProfissionais();
        aviso("Nome salvo.");
      })
      .catch(function (erro) { aviso(Banco.mensagemErro(erro)); });
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
