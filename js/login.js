/* Tela de login: entrar, mostrar a senha, recuperar a senha por e-mail e, no primeiro
   acesso, trocar a senha provisória (criada pelo administrador) por uma senha pessoal. Quem foi
   desativado ou excluído na aba Administração não entra. */

(function () {
  const form = document.getElementById("form-login");
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  const aviso = document.getElementById("aviso-login");
  const botaoEntrar = document.getElementById("btn-entrar");

  const formSenha = document.getElementById("form-senha");
  const novaSenha = document.getElementById("nova-senha");
  const confirmarSenha = document.getElementById("confirmar-senha");
  const avisoSenha = document.getElementById("aviso-senha");
  const botaoSalvar = document.getElementById("btn-salvar-senha");

  function mostrarEm(caixa, mensagem, tipo) {
    caixa.textContent = mensagem;
    caixa.className = "aviso" + (tipo === "ok" ? " aviso-ok" : "");
    caixa.hidden = !mensagem;
  }

  function mostrar(mensagem, tipo) { mostrarEm(aviso, mensagem, tipo); }

  function ocupado(botao, sim, texto) {
    botao.disabled = sim;
    botao.querySelector("span").textContent = texto;
  }

  if (!Banco.configurado) {
    mostrar("O Firebase ainda não foi configurado. Cole a configuração do projeto em js/firebase-config.js.");
    botaoEntrar.disabled = true;
    return;
  }

  /* Mostrar/esconder senha (um botão de olho em cada campo de senha). */
  document.querySelectorAll("[data-olho]").forEach(function (botao) {
    const campo = document.getElementById(botao.dataset.olho);
    botao.addEventListener("click", function () {
      const visivel = campo.type === "password";
      campo.type = visivel ? "text" : "password";
      botao.setAttribute("aria-pressed", String(visivel));
      botao.classList.toggle("aberto", visivel);
      const rotulo = visivel ? "Esconder senha" : "Mostrar senha";
      botao.setAttribute("aria-label", rotulo);
      botao.title = rotulo;
      campo.focus();
    });
  });

  /* Depois de entrar: confere se o acesso está liberado pelo administrador; no primeiro
     acesso pede a senha nova; se não, vai para o sistema. */
  function seguir() {
    return Banco.situacaoAcesso().then(function (situacao) {
      if (situacao.acesso !== "ok") {
        return Banco.recusarAcesso(situacao).then(function () {
          entrando = false;
          formSenha.hidden = true;
          form.hidden = false;
          ocupado(botaoEntrar, false, "Entrar");
          senha.value = "";
          mostrar(Banco.mensagemErro({ code: situacao.acesso }));
        });
      }
      if (!situacao.senhaDefinida) abrirCriarSenha();
      else window.location.replace("index.html");
    });
  }

  function abrirCriarSenha() {
    form.hidden = true;
    formSenha.hidden = false;
    document.getElementById("senha-usuario").value = Banco.usuario().email;
    mostrarEm(avisoSenha, "");
    novaSenha.value = "";
    confirmarSenha.value = "";
    novaSenha.focus();
  }

  function voltarAoLogin() {
    Banco.sair().finally(function () {
      formSenha.hidden = true;
      form.hidden = false;
      entrando = false;
      ocupado(botaoEntrar, false, "Entrar");
      senha.value = "";
      senha.focus();
    });
  }

  /* Já entrou nesta aba (por exemplo, recarregou a página): vai direto para o sistema
     (ou para a troca de senha, se ainda não trocou a provisória). */
  let entrando = false;
  Banco.aoMudarUsuario(function (usuario) {
    if (!usuario || entrando) return;
    entrando = true;
    seguir().catch(function (erro) {
      entrando = false;
      mostrar(Banco.mensagemErro(erro));
    });
  });

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mostrar("");
    if (!email.value.trim()) { mostrar("Digite o e-mail."); email.focus(); return; }
    if (!senha.value) { mostrar("Digite a senha."); senha.focus(); return; }
    entrando = true;
    ocupado(botaoEntrar, true, "Entrando…");
    Banco.entrar(email.value.trim(), senha.value)
      .then(seguir)
      .catch(function (erro) {
        entrando = false;
        mostrar(Banco.mensagemErro(erro));
        ocupado(botaoEntrar, false, "Entrar");
        senha.select();
      });
  });

  formSenha.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mostrarEm(avisoSenha, "");
    const problema = Banco.validarNovaSenha(novaSenha.value, confirmarSenha.value);
    if (problema) {
      mostrarEm(avisoSenha, problema);
      (/Confirme|iguais/.test(problema) ? confirmarSenha : novaSenha).focus();
      return;
    }
    if (senha.value && novaSenha.value === senha.value) {
      mostrarEm(avisoSenha, "A nova senha precisa ser diferente da senha provisória.");
      novaSenha.focus();
      return;
    }
    ocupado(botaoSalvar, true, "Salvando…");
    Banco.definirSenha(novaSenha.value)
      .then(function () { window.location.replace("index.html"); })
      .catch(function (erro) {
        ocupado(botaoSalvar, false, "Salvar senha e entrar");
        if (erro && erro.code === "auth/requires-recent-login") {
          /* Acesso feito há muito tempo: precisa entrar de novo para trocar a senha. */
          voltarAoLogin();
          mostrar("Por segurança, entre de novo com a senha que você recebeu para criar a sua.");
          return;
        }
        mostrarEm(avisoSenha, Banco.mensagemErro(erro));
      });
  });

  document.getElementById("btn-voltar").addEventListener("click", voltarAoLogin);

  document.getElementById("btn-esqueci").addEventListener("click", function () {
    const endereco = email.value.trim();
    if (!endereco) {
      mostrar("Digite seu e-mail no campo acima e clique de novo em Esqueci minha senha.");
      email.focus();
      return;
    }
    Banco.recuperarSenha(endereco)
      .then(function () {
        mostrar("Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.", "ok");
      })
      .catch(function (erro) {
        /* Não revela se o e-mail existe ou não. */
        if (erro && erro.code === "auth/user-not-found") {
          mostrar("Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.", "ok");
        } else {
          mostrar(Banco.mensagemErro(erro));
        }
      });
  });
})();
