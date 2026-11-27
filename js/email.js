/* Envio da avaliação por email, pelo Gmail (API do Gmail) ou pelo Outlook (Microsoft Graph),
   com o PDF anexado. Na primeira vez abre a janela de login do Google ou da Microsoft; depois a
   conta escolhida fica salva neste navegador para o usuário do sistema que a escolheu, e os
   próximos envios não pedem login de novo (no máximo uma janela que fecha sozinha).
   Configuração: js/email-config.js. */

const Email = (function () {
  const config = window.EMAIL_CONFIG || {};
  const CHAVE_CONTAS = "avaliacao-neuropsicologica-email-contas";
  /* Outlook: limite do Microsoft Graph para anexo enviado direto no sendMail. */
  const LIMITE_OUTLOOK = 3 * 1024 * 1024;
  /* Gmail: limite de anexos do próprio Gmail. */
  const LIMITE_GMAIL = 25 * 1024 * 1024;

  /* ---------- Contas salvas (por usuário do sistema) ---------- */

  function uid() {
    const usuario = window.Banco && Banco.usuario && Banco.usuario();
    return usuario ? usuario.uid : "anonimo";
  }

  function lerContas() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_CONTAS) || "{}") || {};
    } catch (erro) {
      return {};
    }
  }

  function contasDoUsuario() {
    return lerContas()[uid()] || {};
  }

  function salvarConta(provedor, dados) {
    const todas = lerContas();
    const minhas = todas[uid()] || {};
    if (dados) minhas[provedor] = dados; else delete minhas[provedor];
    todas[uid()] = minhas;
    try {
      localStorage.setItem(CHAVE_CONTAS, JSON.stringify(todas));
    } catch (erro) {
      console.warn("Não foi possível salvar a conta de email.", erro);
    }
  }

  function erro(mensagem, codigo) {
    const e = new Error(mensagem);
    e.code = codigo || "email";
    return e;
  }

  /* ---------- Base64 e mensagem MIME ---------- */

  function bytesParaBase64(bytes) {
    let binario = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binario);
  }

  function textoParaBase64(texto) {
    return bytesParaBase64(new TextEncoder().encode(texto));
  }

  function blobParaBase64(blob) {
    return blob.arrayBuffer().then(function (buffer) { return bytesParaBase64(new Uint8Array(buffer)); });
  }

  /* Quebra o base64 em linhas de 76 caracteres (limite das mensagens de email). */
  function linhas76(base64) {
    return base64.replace(/.{76}/g, "$&\r\n");
  }

  /* Cabeçalho com acentos (RFC 2047), em pedaços curtos para não passar do tamanho da linha. */
  function cabecalhoUtf8(texto) {
    if (/^[\x20-\x7e]*$/.test(texto)) return texto;
    const partes = [];
    let atual = "";
    Array.from(texto).forEach(function (letra) {
      if (new TextEncoder().encode(atual + letra).length > 42) {
        partes.push(atual);
        atual = "";
      }
      atual += letra;
    });
    if (atual) partes.push(atual);
    return partes.map(function (p) { return "=?UTF-8?B?" + textoParaBase64(p) + "?="; }).join("\r\n ");
  }

  function mensagemMime(dados, anexoBase64) {
    const limite = "limite-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const nome = cabecalhoUtf8(dados.anexo.nome);
    return [
      "To: " + dados.para.join(", "),
      "Subject: " + cabecalhoUtf8(dados.assunto),
      "MIME-Version: 1.0",
      'Content-Type: multipart/mixed; boundary="' + limite + '"',
      "",
      "--" + limite,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      linhas76(textoParaBase64(dados.mensagem || "")),
      "--" + limite,
      'Content-Type: application/pdf; name="' + nome + '"',
      'Content-Disposition: attachment; filename="' + nome + '"',
      "Content-Transfer-Encoding: base64",
      "",
      linhas76(anexoBase64),
      "--" + limite + "--",
      ""
    ].join("\r\n");
  }

  function lerErroApi(resposta) {
    return resposta.text().then(function (texto) {
      let detalhe = texto;
      try {
        const json = JSON.parse(texto);
        detalhe = (json.error && (json.error.message || json.error.code)) || texto;
      } catch (e) { /* não é JSON */ }
      const falha = erro(detalhe || ("Erro " + resposta.status), "http-" + resposta.status);
      falha.status = resposta.status;
      throw falha;
    });
  }

  /* ---------- Gmail (Google Identity Services + API do Gmail) ---------- */

  const ESCOPO_GMAIL = "https://www.googleapis.com/auth/gmail.send email";
  let clienteGoogle = null;
  let tokenGmail = null; /* { valor, expira, uid } */

  function googleCarregado() {
    return !!(window.google && google.accounts && google.accounts.oauth2);
  }

  /* Abre a janela do Google (precisa ser chamado direto no clique, senão o navegador bloqueia). */
  function pedirTokenGoogle(trocarConta) {
    return new Promise(function (resolver, rejeitar) {
      if (!googleCarregado()) {
        rejeitar(erro("O login do Google ainda não carregou. Confira a internet e tente de novo."));
        return;
      }
      if (!clienteGoogle) {
        clienteGoogle = google.accounts.oauth2.initTokenClient({
          client_id: config.googleClientId,
          scope: ESCOPO_GMAIL,
          callback: function () {}
        });
      }
      clienteGoogle.callback = function (resposta) {
        if (resposta.error) {
          rejeitar(erro(resposta.error_description || resposta.error, resposta.error));
          return;
        }
        if (!google.accounts.oauth2.hasGrantedAllScopes(resposta, "https://www.googleapis.com/auth/gmail.send")) {
          rejeitar(erro("Para enviar, marque a permissão de enviar emails na janela do Google.", "sem-permissao"));
          return;
        }
        tokenGmail = {
          valor: resposta.access_token,
          expira: Date.now() + (Number(resposta.expires_in) || 3600) * 1000,
          uid: uid()
        };
        resolver(tokenGmail.valor);
      };
      clienteGoogle.error_callback = function (falha) {
        rejeitar(erro(falha && falha.type === "popup_failed_to_open"
          ? "O navegador bloqueou a janela de login. Permita pop-ups e tente de novo."
          : "Login do Google cancelado.", "cancelado"));
      };
      const conta = contasDoUsuario().gmail;
      const pedido = { prompt: trocarConta || !conta ? "select_account" : "" };
      if (conta && !trocarConta) pedido.hint = conta;
      clienteGoogle.requestAccessToken(pedido);
    });
  }

  function tokenGoogle(trocarConta) {
    if (!trocarConta && tokenGmail && tokenGmail.uid === uid() && contasDoUsuario().gmail &&
        Date.now() < tokenGmail.expira - 60000) {
      return Promise.resolve(tokenGmail.valor);
    }
    return pedirTokenGoogle(trocarConta);
  }

  function emailDoGoogle(token) {
    return fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: "Bearer " + token }
    }).then(function (r) { return r.ok ? r.json() : lerErroApi(r); })
      .then(function (info) {
        salvarConta("gmail", info.email || "");
        return info.email || "";
      });
  }

  function conectarGmail(trocarConta) {
    return tokenGoogle(trocarConta).then(emailDoGoogle);
  }

  function enviarGmail(dados) {
    if (dados.anexo.blob.size > LIMITE_GMAIL) {
      return Promise.reject(erro("O PDF passa de 25 MB, o limite do Gmail. Escolha menos páginas."));
    }
    /* O token (e a janela, se precisar) vem primeiro, ainda no clique. */
    return tokenGoogle(false)
      .then(function (token) {
        const conta = contasDoUsuario().gmail;
        return Promise.all([token, conta ? conta : emailDoGoogle(token), blobParaBase64(dados.anexo.blob)]);
      })
      .then(function (r) {
        const token = r[0];
        return fetch("https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "message/rfc822" },
          body: mensagemMime(dados, r[2])
        }).then(function (resposta) {
          if (resposta.status === 401) tokenGmail = null;
          return resposta.ok ? r[1] : lerErroApi(resposta);
        });
      });
  }

  /* ---------- Outlook (MSAL + Microsoft Graph) ---------- */

  const ESCOPOS_OUTLOOK = ["User.Read", "Mail.Send"];
  let appMicrosoft = null;
  let microsoftPronto = null;

  function iniciarMicrosoft() {
    if (microsoftPronto) return microsoftPronto;
    if (!config.microsoftClientId || !window.msal) {
      microsoftPronto = Promise.reject(erro("O login da Microsoft não carregou."));
      microsoftPronto.catch(function () {});
      return microsoftPronto;
    }
    appMicrosoft = new msal.PublicClientApplication({
      auth: {
        clientId: config.microsoftClientId,
        authority: "https://login.microsoftonline.com/common",
        /* Página em branco: a janela de login volta para ela e fecha sozinha. */
        redirectUri: new URL("email-retorno.html", window.location.href).href
      },
      cache: { cacheLocation: "localStorage" }
    });
    microsoftPronto = appMicrosoft.initialize();
    return microsoftPronto;
  }

  function contaMicrosoftSalva() {
    const salva = contasDoUsuario().outlook;
    if (!salva || !appMicrosoft) return null;
    return appMicrosoft.getAccountByHomeId(salva.id) || null;
  }

  function guardarContaMicrosoft(resposta) {
    salvarConta("outlook", { id: resposta.account.homeAccountId, email: resposta.account.username });
    return resposta.accessToken;
  }

  function mensagemErroMicrosoft(falha) {
    const codigo = falha && falha.errorCode;
    if (codigo === "user_cancelled") return erro("Login da Microsoft cancelado.", "cancelado");
    if (codigo === "popup_window_error" || codigo === "empty_window_error") {
      return erro("O navegador bloqueou a janela de login. Permita pop-ups e tente de novo.", "cancelado");
    }
    return erro((falha && (falha.errorMessage || falha.message)) || "Não foi possível entrar na conta da Microsoft.");
  }

  function tokenMicrosoft(trocarConta) {
    return iniciarMicrosoft().then(function () {
      const conta = trocarConta ? null : contaMicrosoftSalva();
      if (!conta) {
        return appMicrosoft.loginPopup({ scopes: ESCOPOS_OUTLOOK, prompt: "select_account" })
          .then(guardarContaMicrosoft, function (falha) { throw mensagemErroMicrosoft(falha); });
      }
      return appMicrosoft.acquireTokenSilent({ scopes: ESCOPOS_OUTLOOK, account: conta })
        .then(guardarContaMicrosoft)
        .catch(function () {
          return appMicrosoft.acquireTokenPopup({ scopes: ESCOPOS_OUTLOOK, account: conta, loginHint: conta.username })
            .then(guardarContaMicrosoft, function (falha) { throw mensagemErroMicrosoft(falha); });
        });
    });
  }

  function conectarOutlook(trocarConta) {
    return tokenMicrosoft(trocarConta).then(function () { return contasDoUsuario().outlook.email; });
  }

  function enviarOutlook(dados) {
    if (dados.anexo.blob.size > LIMITE_OUTLOOK) {
      return Promise.reject(erro("O PDF passa de 3 MB, o limite do envio pelo Outlook. Escolha menos páginas ou use o Gmail."));
    }
    return tokenMicrosoft(false)
      .then(function (token) {
        return Promise.all([token, blobParaBase64(dados.anexo.blob)]);
      })
      .then(function (r) {
        return fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
          method: "POST",
          headers: { Authorization: "Bearer " + r[0], "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              subject: dados.assunto,
              body: { contentType: "Text", content: dados.mensagem || "" },
              toRecipients: dados.para.map(function (endereco) { return { emailAddress: { address: endereco } }; }),
              attachments: [{
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: dados.anexo.nome,
                contentType: "application/pdf",
                contentBytes: r[1]
              }]
            },
            saveToSentItems: true
          })
        });
      })
      .then(function (resposta) {
        return resposta.ok ? contasDoUsuario().outlook.email : lerErroApi(resposta);
      });
  }

  /* Já deixa o login da Microsoft pronto, para a janela abrir direto no clique. */
  if (config.microsoftClientId) iniciarMicrosoft().catch(function () {});

  /* ---------- Para o painel ---------- */

  const PROVEDORES = {
    gmail: { nome: "Gmail", configurado: function () { return !!config.googleClientId; }, conectar: conectarGmail, enviar: enviarGmail },
    outlook: { nome: "Outlook", configurado: function () { return !!config.microsoftClientId; }, conectar: conectarOutlook, enviar: enviarOutlook }
  };

  function provedor(nome) {
    const p = PROVEDORES[nome];
    if (!p) throw erro("Email desconhecido: " + nome);
    return p;
  }

  return {
    nome: function (nome) { return provedor(nome).nome; },
    configurado: function (nome) { return provedor(nome).configurado(); },
    /* Email da conta salva para o usuário do sistema ("" se ainda não entrou). */
    conta: function (nome) {
      const salva = contasDoUsuario()[nome];
      return (salva && (salva.email || salva)) || "";
    },
    /* Escolher outra conta (abre a janela de login). Devolve o email da conta. */
    trocarConta: function (nome) {
      return provedor(nome).conectar(true);
    },
    /* dados: { para: [emails], assunto, mensagem, anexo: { blob, nome } }.
       Devolve o email de quem enviou. */
    enviar: function (nome, dados) {
      const p = provedor(nome);
      if (!p.configurado()) {
        return Promise.reject(erro("O envio pelo " + p.nome + " ainda não foi configurado (js/email-config.js).", "sem-config"));
      }
      return p.enviar(dados);
    }
  };
})();
