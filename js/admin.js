/* Administração (só o administrador, Banco.ADMIN_EMAIL): criar acesso com senha provisória,
   redefinir a senha (link por e-mail), desativar, dar acesso de novo e excluir.
   As regras do Firestore conferem tudo isso no banco; esta tela só monta os botões. */

window.Admin = (function () {
  const aviso = function (texto) { window.Formulario.mostrarAviso(texto); };

  const form = document.getElementById("form-novo-usuario");
  const campoNome = document.getElementById("admin-nome");
  const campoEmail = document.getElementById("admin-email");
  const campoSenha = document.getElementById("admin-senha");
  const erro = document.getElementById("admin-erro");
  const botaoCriar = document.getElementById("admin-criar");
  const criado = document.getElementById("admin-criado");
  const criadoDados = document.getElementById("admin-criado-dados");

  const ul = document.getElementById("admin-lista");
  const vazio = document.getElementById("admin-vazio");
  const total = document.getElementById("admin-total");
  const busca = document.getElementById("admin-busca");

  const modal = document.getElementById("modal-admin");
  const modalTitulo = document.getElementById("admin-modal-titulo");
  const modalTexto = document.getElementById("admin-modal-texto");
  const modalDica = document.getElementById("admin-modal-dica");
  const modalConfirmar = document.getElementById("admin-modal-confirmar");

  const ICONE_PESSOA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
  const ICONE_OK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/></svg>';
  const ICONE_RELOGIO = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const ICONE_BLOQUEIO = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/></svg>';
  const ICONE_ESCUDO = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/></svg>';
  const ICONE_CHAVE = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m17 6 3 3"/><path d="m15 8 2 2"/></svg>';
  const ICONE_PAUSA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 9v6"/><path d="M14 9v6"/></svg>';
  const ICONE_PLAY = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5Z"/></svg>';
  const ICONE_LIXEIRA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

  /* ---------- Utilidades ---------- */

  function normalizar(texto) {
    return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function data(valor) {
    if (!valor || !valor.toDate) return "";
    const d = valor.toDate();
    const dois = function (n) { return String(n).padStart(2, "0"); };
    return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  /* Mesma regra do nome do paciente: "ana da silva" -> "Ana da Silva". */
  const PARTICULAS = ["da", "das", "de", "do", "dos", "e"];

  function capitalizar(nome) {
    return String(nome || "").trim().replace(/\s+/g, " ").toLowerCase()
      .replace(/[^\s]+/g, function (palavra, posicao) {
        if (posicao > 0 && PARTICULAS.indexOf(palavra) !== -1) return palavra;
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      });
  }

  function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /* Senha provisória aleatória: 10 caracteres, letras e números, sem os que se confundem
     (0/O, 1/l/I). */
  function gerarSenha() {
    const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    const numeros = "23456789";
    const todos = letras + numeros;
    const sorteio = new Uint32Array(10);
    window.crypto.getRandomValues(sorteio);
    const chars = Array.from(sorteio, function (n, i) {
      const fonte = i === 0 ? letras : i === 1 ? numeros : todos;
      return fonte.charAt(n % fonte.length);
    });
    /* Embaralha para a letra e o número garantidos não ficarem sempre no começo. */
    for (let i = chars.length - 1; i > 0; i--) {
      const j = sorteio[i] % (i + 1);
      const t = chars[i]; chars[i] = chars[j]; chars[j] = t;
    }
    return chars.join("");
  }

  /* ---------- Confirmação ---------- */

  let pendente = null;

  function confirmar(opcoes) {
    pendente = opcoes;
    modalTitulo.textContent = opcoes.titulo;
    modalTexto.innerHTML = opcoes.texto;
    modalDica.textContent = opcoes.dica || "";
    modalDica.hidden = !opcoes.dica;
    modalConfirmar.textContent = opcoes.botao;
    modalConfirmar.className = "btn " + (opcoes.perigo ? "btn-danger" : "btn-primary");
    modal.returnValue = "";
    modal.showModal();
  }

  modal.addEventListener("close", function () {
    const pedido = pendente;
    pendente = null;
    if (!pedido) return;
    if (modal.returnValue === "confirmar") pedido.acao();
    else if (pedido.origem) pedido.origem.focus();
  });

  /* Texto seguro dentro do HTML do modal. */
  function forte(texto) {
    const b = document.createElement("strong");
    b.textContent = texto;
    return b.outerHTML;
  }

  /* ---------- Novo acesso ---------- */

  function mostrarErro(mensagem, campo) {
    erro.textContent = mensagem || "";
    erro.hidden = !mensagem;
    [campoNome, campoEmail, campoSenha].forEach(function (c) { c.classList.toggle("invalido", c === campo); });
    if (campo) campo.focus();
  }

  [campoNome, campoEmail, campoSenha].forEach(function (c) {
    c.addEventListener("input", function () { c.classList.remove("invalido"); });
  });

  document.getElementById("admin-gerar").addEventListener("click", function () {
    campoSenha.value = gerarSenha();
    campoSenha.classList.remove("invalido");
    campoSenha.focus();
    campoSenha.select();
  });

  let textoCopiar = "";

  function mostrarCriado(email, senha) {
    const endereco = new URL("login.html", window.location.href).href;
    textoCopiar = "Acesso ao sistema de Avaliação Neuropsicológica\n" +
      "Endereço: " + endereco + "\nE-mail: " + email + "\nSenha provisória: " + senha +
      "\nNo primeiro acesso, o sistema pede para você criar uma senha pessoal.";
    criadoDados.replaceChildren();
    [["E-mail", email], ["Senha provisória", senha]].forEach(function (par, i) {
      if (i) criadoDados.appendChild(document.createTextNode(" · "));
      criadoDados.appendChild(document.createTextNode(par[0] + ": "));
      const b = document.createElement("strong");
      b.textContent = par[1];
      criadoDados.appendChild(b);
    });
    criado.hidden = false;
  }

  document.getElementById("admin-copiar").addEventListener("click", function () {
    if (!navigator.clipboard) { aviso("Não foi possível copiar. Selecione o texto e copie à mão."); return; }
    navigator.clipboard.writeText(textoCopiar)
      .then(function () { aviso("Dados do acesso copiados."); })
      .catch(function () { aviso("Não foi possível copiar. Selecione o texto e copie à mão."); });
  });

  function ocupado(sim) {
    botaoCriar.disabled = sim;
    botaoCriar.lastChild.textContent = sim ? " Criando…" : " Criar acesso";
  }

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    criado.hidden = true;
    const nome = capitalizar(campoNome.value);
    campoNome.value = nome;
    const email = campoEmail.value.trim().toLowerCase();
    const senha = campoSenha.value;
    if (nome.length < 2) { mostrarErro("Digite o nome da pessoa.", campoNome); return; }
    if (!emailValido(email)) { mostrarErro("Digite um e-mail válido.", campoEmail); return; }
    const problema = Banco.validarNovaSenha(senha, senha).replace("A nova senha", "A senha provisória").replace("Digite a nova senha.", "Digite a senha provisória ou clique em Gerar.");
    if (problema) { mostrarErro(problema, campoSenha); return; }
    mostrarErro("");
    ocupado(true);
    Banco.criarUsuario(nome, email, senha)
      .then(function () {
        form.reset();
        mostrarCriado(email, senha);
        aviso("Acesso de " + nome + " criado.");
        carregar();
      })
      .catch(function (falha) {
        if (falha && falha.code === "excluido") {
          oferecerRestauracao(falha.usuario, nome);
          return;
        }
        console.error(falha);
        if (falha && falha.code === "auth/email-already-in-use") {
          mostrarErro("Já existe uma conta com este e-mail no Firebase, mas sem acesso ao sistema. " +
            "Ela é apagada sozinha quando a pessoa tentar entrar; depois disso, crie o acesso de novo.", campoEmail);
        } else if (falha && falha.code === "ja-cadastrado") {
          mostrarErro(Banco.mensagemErro(falha), campoEmail);
        } else if (falha && falha.code === "permission-denied") {
          mostrarErro("O banco recusou o cadastro. Publique as regras novas do Firestore (firestore.rules) e tente de novo.");
        } else {
          mostrarErro(Banco.mensagemErro(falha));
        }
      })
      .then(function () { ocupado(false); });
  });

  /* E-mail de um acesso excluído que ainda está no Authentication: dá o acesso de volta. */
  function oferecerRestauracao(usuario, nome) {
    confirmar({
      titulo: "Restaurar acesso?",
      texto: "O e-mail " + forte(usuario.email) + " já teve acesso e foi excluído. Dá para restaurar o acesso, com a senha que a pessoa já usava.",
      dica: "A senha provisória digitada não vale para este e-mail. Se a pessoa não lembrar a senha, use Redefinir senha depois de restaurar.",
      botao: "Restaurar acesso",
      origem: botaoCriar,
      acao: function () {
        Banco.restaurarUsuario(usuario.id, nome)
          .then(function () {
            form.reset();
            aviso("Acesso de " + (nome || usuario.email) + " restaurado.");
            carregar();
          })
          .catch(function (falha) {
            console.error(falha);
            mostrarErro(Banco.mensagemErro(falha));
          });
      }
    });
  }

  /* ---------- Lista de usuários ---------- */

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

  function selo(classe, icone, texto, titulo) {
    const s = document.createElement("span");
    s.className = "status " + classe;
    s.innerHTML = icone;
    s.appendChild(document.createTextNode(texto));
    if (titulo) s.title = titulo;
    return s;
  }

  function ehOAdmin(p) {
    return String(p.email || "").toLowerCase() === Banco.ADMIN_EMAIL;
  }

  /* Faz a ação no banco com o botão travado; depois recarrega a lista. */
  function executar(b, promessa, sucesso) {
    b.disabled = true;
    return promessa()
      .then(function () {
        aviso(sucesso);
        carregar();
      })
      .catch(function (falha) {
        console.error(falha);
        b.disabled = false;
        aviso(falha && falha.code === "permission-denied"
          ? "O banco recusou a alteração. Publique as regras novas do Firestore (firestore.rules)."
          : "Não foi possível concluir: " + Banco.mensagemErro(falha));
      });
  }

  function itemUsuario(p) {
    const li = document.createElement("li");
    li.className = "historico-item admin-item";
    const nome = p.nome || Banco.nomeDoEmail(p.email) || "Sem nome";
    const admin = ehOAdmin(p);
    const ativo = p.ativo !== false;
    li.dataset.busca = normalizar(nome + " " + (p.email || ""));
    if (!ativo) li.classList.add("admin-desativado");

    li.innerHTML =
      '<div class="historico-info">' +
        '<p class="historico-nome">' + ICONE_PESSOA + "<span></span></p>" +
        '<p class="historico-detalhes"></p>' +
        '<div class="historico-selos"></div>' +
      "</div>" +
      '<div class="historico-acoes"></div>';
    li.querySelector(".historico-nome span").textContent = nome;
    const detalhes = [p.email || "—"];
    if (data(p.criadoEm)) detalhes.push("Criado em " + data(p.criadoEm));
    li.querySelector(".historico-detalhes").textContent = detalhes.join(" · ");

    const selos = li.querySelector(".historico-selos");
    if (admin) {
      selos.appendChild(selo("status-admin", ICONE_ESCUDO, "Administrador", "Dono do sistema"));
    } else if (!ativo) {
      selos.appendChild(selo("status-desativado", ICONE_BLOQUEIO, "Desativado", "Não consegue entrar no sistema"));
    } else {
      selos.appendChild(selo("status-concluida", ICONE_OK, "Ativo", "Pode entrar no sistema"));
    }
    if (!admin && p.senhaDefinida !== true) {
      selos.appendChild(selo("status-andamento", ICONE_RELOGIO, "Aguardando primeiro acesso",
        "Ainda não entrou para trocar a senha provisória"));
    }

    const acoes = li.querySelector(".historico-acoes");
    if (admin) return li;

    acoes.appendChild(botao("btn-light", ICONE_CHAVE, "Redefinir senha",
      "Enviar para " + p.email + " um link para criar uma senha nova",
      function (b) {
        confirmar({
          titulo: "Redefinir senha?",
          texto: "O Firebase vai enviar para " + forte(p.email) + " um link para " + forte(nome) + " criar uma senha nova.",
          dica: "A senha atual continua valendo até a pessoa criar a nova pelo link. Se o e-mail não chegar, peça para olhar o spam.",
          botao: "Enviar link",
          origem: b,
          acao: function () {
            executar(b, function () { return Banco.enviarRedefinicao(p.email); },
              "Link para redefinir a senha enviado para " + p.email + ".")
              .then(function () { b.disabled = false; });
          }
        });
      }));

    if (ativo) {
      acoes.appendChild(botao("btn-light", ICONE_PAUSA, "Desativar acesso",
        "Bloquear a entrada de " + nome + " no sistema",
        function (b) {
          confirmar({
            titulo: "Desativar acesso?",
            texto: forte(nome) + " não vai conseguir entrar no sistema nem ver as avaliações. Se estiver com o sistema aberto, sai na hora.",
            dica: "Dá para dar o acesso de novo a qualquer momento, com a mesma senha.",
            botao: "Desativar",
            perigo: true,
            origem: b,
            acao: function () {
              executar(b, function () { return Banco.definirAtivo(p.id, false); },
                "Acesso de " + nome + " desativado.");
            }
          });
        }));
    } else {
      acoes.appendChild(botao("btn-primary", ICONE_PLAY, "Dar acesso",
        "Liberar de novo a entrada de " + nome + " no sistema",
        function (b) {
          executar(b, function () { return Banco.definirAtivo(p.id, true); },
            "Acesso de " + nome + " liberado.");
        }));
    }

    acoes.appendChild(botao("btn-excluir", ICONE_LIXEIRA, "Excluir usuário",
      "Excluir o acesso de " + nome,
      function (b) {
        confirmar({
          titulo: "Excluir usuário?",
          texto: "O acesso de " + forte(nome) + " (" + forte(p.email) + ") será excluído e a pessoa não entra mais no sistema.",
          dica: "As avaliações que ela iniciou continuam no banco. Para ela voltar, crie o acesso de novo com o mesmo e-mail.",
          botao: "Excluir",
          perigo: true,
          origem: b,
          acao: function () {
            executar(b, function () { return Banco.excluirUsuario(p.id); },
              "Acesso de " + nome + " excluído.");
          }
        });
      }));
    return li;
  }

  function filtrar() {
    const termo = normalizar(busca.value);
    let visiveis = 0;
    Array.from(ul.children).forEach(function (li) {
      const mostra = !termo || li.dataset.busca.indexOf(termo) !== -1;
      li.hidden = !mostra;
      if (mostra) visiveis++;
    });
    const quantos = ul.children.length;
    total.textContent = termo ? visiveis + " de " + quantos
      : quantos === 1 ? "1 usuário" : quantos + " usuários";
    if (!quantos) vazio.textContent = "Nenhum usuário cadastrado.";
    else if (!visiveis) vazio.textContent = "Nenhum usuário encontrado com “" + busca.value.trim() + "”.";
    vazio.hidden = visiveis > 0;
  }

  busca.addEventListener("input", filtrar);

  /* Administrador primeiro; depois ativos e desativados, cada grupo em ordem alfabética. */
  function ordenar(lista) {
    return lista.slice().sort(function (a, b) {
      const pa = ehOAdmin(a) ? 0 : a.ativo !== false ? 1 : 2;
      const pb = ehOAdmin(b) ? 0 : b.ativo !== false ? 1 : 2;
      if (pa !== pb) return pa - pb;
      return String(a.nome || a.email || "").localeCompare(String(b.nome || b.email || ""), "pt-BR");
    });
  }

  let pedido = 0;

  function carregar() {
    if (!Banco.ehAdmin()) return;
    if (!ul.children.length) {
      vazio.textContent = "Carregando…";
      vazio.hidden = false;
    }
    const meu = ++pedido;
    Banco.listarUsuarios()
      .then(function (lista) {
        if (meu !== pedido) return;
        ul.replaceChildren.apply(ul, ordenar(lista).map(itemUsuario));
        filtrar();
      })
      .catch(function (falha) {
        if (meu !== pedido) return;
        console.error(falha);
        ul.replaceChildren();
        vazio.textContent = falha && falha.code === "permission-denied"
          ? "O banco recusou a lista de usuários. Publique as regras novas do Firestore (firestore.rules)."
          : Banco.mensagemErro(falha);
        vazio.hidden = false;
      });
  }

  return { carregar: carregar };
})();
