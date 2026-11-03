/* Tela de login: entrar, mostrar a senha e recuperar a senha por e-mail. */

(function () {
  const form = document.getElementById("form-login");
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  const lembrar = document.getElementById("lembrar");
  const aviso = document.getElementById("aviso-login");
  const botaoEntrar = document.getElementById("btn-entrar");
  const botaoOlho = document.getElementById("btn-olho");

  function mostrar(mensagem, tipo) {
    aviso.textContent = mensagem;
    aviso.className = "aviso" + (tipo === "ok" ? " aviso-ok" : "");
    aviso.hidden = !mensagem;
  }

  if (!Banco.configurado) {
    mostrar("O Firebase ainda não foi configurado. Cole a configuração do projeto em js/firebase-config.js.");
    botaoEntrar.disabled = true;
    return;
  }

  /* Já entrou antes (Lembrar meu acesso): vai direto para o sistema. */
  let entrando = false;
  Banco.aoMudarUsuario(function (usuario) {
    if (usuario && !entrando) window.location.replace("index.html");
  });

  botaoOlho.addEventListener("click", function () {
    const visivel = senha.type === "password";
    senha.type = visivel ? "text" : "password";
    botaoOlho.setAttribute("aria-pressed", String(visivel));
    botaoOlho.classList.toggle("aberto", visivel);
    const rotulo = visivel ? "Esconder senha" : "Mostrar senha";
    botaoOlho.setAttribute("aria-label", rotulo);
    botaoOlho.title = rotulo;
    senha.focus();
  });

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mostrar("");
    if (!email.value.trim()) { mostrar("Digite o e-mail."); email.focus(); return; }
    if (!senha.value) { mostrar("Digite a senha."); senha.focus(); return; }
    entrando = true;
    botaoEntrar.disabled = true;
    botaoEntrar.querySelector("span").textContent = "Entrando…";
    Banco.entrar(email.value.trim(), senha.value, lembrar.checked)
      .then(function () { window.location.replace("index.html"); })
      .catch(function (erro) {
        entrando = false;
        mostrar(Banco.mensagemErro(erro));
        botaoEntrar.disabled = false;
        botaoEntrar.querySelector("span").textContent = "Entrar";
        senha.select();
      });
  });

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
