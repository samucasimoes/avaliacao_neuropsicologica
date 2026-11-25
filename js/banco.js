/* Firebase: login (Authentication) e banco de dados (Firestore).
   Coleções:
   - avaliacoes/{id}: paciente, campos (os mesmos nomes do formulário e do .json), secao,
     status ("em_andamento" ou "concluida"), responsavelNome/Uid (quem iniciou), criadoEm,
     atualizadoEm e atualizadoPorNome (quem fez a última alteração)
     (ficam guardadas sem prazo; só quem iniciou a avaliação pode excluí-la).
   - profissionais/{uid}: nome e e-mail de cada acesso (usado na saudação), senhaDefinida
     (true depois que a pessoa troca a senha provisória do primeiro acesso), ativo (false =
     acesso desativado) e excluido (true = acesso excluído; a conta do Authentication é
     apagada de vez na próxima vez que a pessoa tentar entrar).
   Os acessos são criados pelo administrador (ADMIN_EMAIL) na aba Administração. Quem não
   tem o registro em profissionais (ou está desativado) não lê nem grava nada no banco. */

const Banco = (function () {
  /* Dono do sistema: só este e-mail vê a aba Administração (as regras do Firestore conferem). */
  const ADMIN_EMAIL = "avaliacaoneuropsicologica26@gmail.com";

  const config = window.FIREBASE_CONFIG || {};
  const configurado = !!(window.firebase && config.apiKey && config.projectId &&
    !/COLE_AQUI|SEU-PROJETO/.test(config.apiKey + config.projectId));

  let auth = null;
  let db = null;
  if (configurado) {
    firebase.initializeApp(config);
    auth = firebase.auth();
    auth.languageCode = "pt-BR";
    db = firebase.firestore();
  }

  const agora = function () { return firebase.firestore.FieldValue.serverTimestamp(); };
  const colecao = function (nome) { return db.collection(nome); };

  const ERROS = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/missing-email": "Digite o e-mail.",
    "auth/missing-password": "Digite a senha.",
    "auth/user-disabled": "Este acesso foi desativado.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
    "auth/weak-password": "Senha fraca. Use no mínimo 8 caracteres, com letras e números.",
    "auth/requires-recent-login": "Por segurança, saia e entre de novo antes de trocar a senha.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    "auth/network-request-failed": "Sem conexão com a internet.",
    "auth/email-already-in-use": "Já existe uma conta com este e-mail no Firebase.",
    "auth/operation-not-allowed": "O login por e-mail e senha não está ativado no Firebase (Authentication > Método de login).",
    "sem-acesso": "Este e-mail não tem acesso ao sistema. Fale com o administrador do sistema.",
    "desativado": "Este acesso foi desativado. Fale com o administrador do sistema.",
    "ja-cadastrado": "Este e-mail já tem acesso ao sistema.",
    "auth/unauthorized-domain":"Este endereço não está autorizado no Firebase (Authentication > Configurações > Domínios autorizados).",
    "permission-denied": "Sem permissão para acessar os dados. Confira as regras do Firestore.",
    "unavailable": "Sem conexão com o banco de dados. Tente de novo em instantes.",
    "not-found": "Avaliação não encontrada."
  };

  function mensagemErro(erro) {
    return (erro && ERROS[erro.code]) || (erro && erro.message) || "Não foi possível concluir. Tente novamente.";
  }

  /* "vania.souza@clinica.com" -> "Vania Souza" (até a pessoa escolher o nome). */
  function nomeDoEmail(email) {
    return String(email || "").split("@")[0].split(/[._-]+/).filter(Boolean).map(function (p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(" ");
  }

  function lerDoc(doc) {
    const dados = doc.data({ serverTimestamps: "estimate" });
    dados.id = doc.id;
    return dados;
  }

  /* ---------- Login ---------- */

  /* O acesso vale só enquanto a aba estiver aberta: ao fechar a aba (ou o navegador) o
     usuário precisa entrar de novo. Recarregar a página ou navegar dentro do sistema na
     mesma aba não desloga, e não há tempo limite enquanto a aba estiver aberta.
     A marca fica no sessionStorage, que o navegador apaga quando a aba é fechada; ela também
     derruba acessos antigos que ficaram salvos com "Lembrar meu acesso". */
  const CHAVE_SESSAO = "sessaoAbaAtiva";

  function marcarSessao(ativa) {
    try {
      if (ativa) sessionStorage.setItem(CHAVE_SESSAO, "1");
      else sessionStorage.removeItem(CHAVE_SESSAO);
    } catch (erro) { /* sem acesso ao sessionStorage */ }
  }

  function sessaoDaAba() {
    try { return sessionStorage.getItem(CHAVE_SESSAO) === "1"; }
    catch (erro) { return true; /* sem sessionStorage não dá para conferir */ }
  }

  function entrar(email, senha) {
    marcarSessao(true);
    return auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).then(function () {
      return auth.signInWithEmailAndPassword(email, senha);
    });
  }

  function sair() {
    marcarSessao(false);
    return auth.signOut();
  }

  function recuperarSenha(email) {
    return auth.sendPasswordResetEmail(email);
  }

  /* Regra da senha: no mínimo 8 caracteres, com pelo menos uma letra e um número.
     Devolve a mensagem do problema, ou "" se estiver tudo certo. */
  function validarNovaSenha(nova, confirmar) {
    if (!nova) return "Digite a nova senha.";
    if (nova.length < 8) return "A nova senha precisa ter no mínimo 8 caracteres.";
    if (!/[A-Za-zÀ-ÿ]/.test(nova) || !/[0-9]/.test(nova)) return "A nova senha precisa ter letras e números.";
    if (!confirmar) return "Confirme a nova senha.";
    if (nova !== confirmar) return "As senhas não são iguais.";
    return "";
  }

  function ehAdmin() {
    const u = usuario();
    return !!(u && String(u.email || "").toLowerCase() === ADMIN_EMAIL);
  }

  /* O registro em profissionais libera o acesso (ativo e não excluído). Registros antigos,
     sem o campo ativo, contam como ativos. */
  function liberado(dados) {
    return !!dados && dados.ativo !== false && dados.excluido !== true;
  }

  /* Situação de quem acabou de entrar: acesso "ok", "desativado" ou "sem-acesso" (sem
     registro ou excluído), e se ainda precisa trocar a senha provisória do primeiro acesso.
     Lê direto do servidor, para não decidir por um dado antigo. */
  function situacaoAcesso() {
    const u = usuario();
    return colecao("profissionais").doc(u.uid).get({ source: "server" }).then(function (doc) {
      const dados = doc.exists ? doc.data() : null;
      let acesso = "ok";
      if (!ehAdmin()) {
        if (!dados || dados.excluido === true) acesso = "sem-acesso";
        else if (dados.ativo === false) acesso = "desativado";
      }
      return {
        acesso: acesso,
        excluido: !!(dados && dados.excluido === true),
        senhaDefinida: !!(dados && dados.senhaDefinida === true)
      };
    });
  }

  /* Acesso recusado no login: sai. Sem acesso (excluído pelo administrador, ou conta criada
     fora do sistema) a própria conta é apagada do Authentication, liberando o e-mail para
     um novo cadastro. */
  function recusarAcesso(situacao) {
    const u = usuario();
    if (!u) return Promise.resolve();
    let passo = Promise.resolve();
    if (situacao.acesso === "sem-acesso") {
      if (situacao.excluido) {
        passo = colecao("profissionais").doc(u.uid).delete().catch(function (erro) {
          console.warn("Registro do acesso excluído:", erro);
        });
      }
      passo = passo.then(function () { return u.delete(); }).catch(function (erro) {
        console.warn("Conta sem acesso:", erro);
      });
    }
    return passo.then(function () { return auth.currentUser ? auth.signOut() : null; });
  }

  /* Avisa (uma vez) se o acesso de quem está no sistema for desativado ou excluído. */
  function vigiarAcesso(retorno) {
    const u = usuario();
    if (!u || ehAdmin()) return function () {};
    let avisado = false;
    return colecao("profissionais").doc(u.uid).onSnapshot(function (doc) {
      if (avisado || doc.metadata.fromCache) return;
      if (!liberado(doc.exists ? doc.data() : null)) {
        avisado = true;
        retorno();
      }
    }, function (erro) { console.warn("Acompanhamento do acesso:", erro); });
  }

  function marcarSenhaDefinida() {
    const u = usuario();
    return colecao("profissionais").doc(u.uid).set(
      { senhaDefinida: true, email: u.email, atualizadoEm: agora() }, { merge: true });
  }

  /* Troca a senha de quem acabou de entrar (primeiro acesso). */
  function definirSenha(nova) {
    return usuario().updatePassword(nova).then(marcarSenhaDefinida);
  }

  /* Troca a senha pelo menu do usuário: confere a senha atual antes. */
  function trocarSenha(atual, nova) {
    const u = usuario();
    const credencial = firebase.auth.EmailAuthProvider.credential(u.email, atual);
    return u.reauthenticateWithCredential(credencial)
      .catch(function (erro) {
        if (erro && /wrong-password|invalid-credential|invalid-login-credentials/.test(erro.code)) {
          throw { code: "senha-atual", message: "A senha atual está incorreta." };
        }
        throw erro;
      })
      .then(function () { return u.updatePassword(nova); })
      .then(marcarSenhaDefinida);
  }

  function aoMudarUsuario(retorno) {
    if (!configurado) {
      retorno(null);
      return;
    }
    auth.onAuthStateChanged(function (u) {
      /* Acesso que não foi aberto nesta aba (aba fechada e reaberta, ou login antigo
         salvo no navegador): sai e avisa como "sem usuário" na próxima chamada. */
      if (u && !sessaoDaAba()) {
        auth.signOut();
        return;
      }
      retorno(u);
    });
  }

  function usuario() {
    return auth ? auth.currentUser : null;
  }

  /* ---------- Perfil ---------- */

  /* Lê o perfil de quem entrou; no primeiro acesso, cria com o nome do e-mail. */
  function perfil() {
    const u = usuario();
    const ref = colecao("profissionais").doc(u.uid);
    return ref.get().then(function (doc) {
      const admin = ehAdmin();
      if (!admin && !liberado(doc.exists ? doc.data() : null)) throw { code: "sem-acesso" };
      if (doc.exists && doc.data().nome) return lerDoc(doc);
      const novo = { nome: u.displayName || nomeDoEmail(u.email), email: u.email, atualizadoEm: agora() };
      if (admin && !doc.exists) novo.ativo = true;
      return ref.set(novo, { merge: true }).then(function () {
        const dados = Object.assign({}, doc.exists ? doc.data() : {}, novo);
        dados.id = u.uid;
        return dados;
      });
    });
  }

  /* Troca o nome de quem entrou (menu do usuário). Devolve o nome gravado. */
  function alterarNome(nome) {
    const u = usuario();
    const limpo = String(nome || "").trim().replace(/\s+/g, " ");
    return colecao("profissionais").doc(u.uid)
      .set({ nome: limpo, email: u.email, atualizadoEm: agora() }, { merge: true })
      .then(function () {
        /* Também no Authentication; se falhar, o nome do Firestore já basta. */
        return u.updateProfile({ displayName: limpo }).catch(function (erro) {
          console.warn("Nome no Authentication:", erro);
        });
      })
      .then(function () { return limpo; });
  }

  /* ---------- Avaliações ---------- */

  /* Cria (sem id) ou atualiza a avaliação. Devolve o id. */
  function salvarAvaliacao(id, dados, responsavelNome) {
    const nomeUsuario = responsavelNome || nomeDoEmail(usuario().email);
    /* Quem fez a última alteração (mostrado no Início: "Atualizada por ..."). */
    const registro = Object.assign({}, dados, {
      atualizadoEm: agora(),
      atualizadoPorNome: nomeUsuario
    });
    if (id) {
      return colecao("avaliacoes").doc(id).update(registro)
        .then(function () { return id; })
        .catch(function (erro) {
          /* Já foi excluída: grava de novo como avaliação nova. */
          if (erro && erro.code === "not-found") return salvarAvaliacao(null, dados, responsavelNome);
          throw erro;
        });
    }
    Object.assign(registro, {
      status: dados.status || "em_andamento",
      criadoEm: agora(),
      responsavelUid: usuario().uid,
      responsavelNome: nomeUsuario
    });
    return colecao("avaliacoes").add(registro).then(function (ref) { return ref.id; });
  }

  /* Da mais recente para a mais antiga. */
  function listarAvaliacoes(limite) {
    return colecao("avaliacoes")
      .orderBy("atualizadoEm", "desc")
      .limit(limite || 100)
      .get()
      .then(function (r) { return r.docs.map(lerDoc); });
  }

  /* Grava só a etapa aberta (sem mudar a data nem quem alterou): usado quando a pessoa
     só navega pela avaliação, sem mudar o conteúdo. */
  function salvarSecao(id, secao) {
    return colecao("avaliacoes").doc(id).update({ secao: secao });
  }

  function abrirAvaliacao(id) {
    return colecao("avaliacoes").doc(id).get().then(function (doc) {
      if (!doc.exists) throw { code: "not-found" };
      return lerDoc(doc);
    });
  }

  /* Corrige só o status (Concluída quando todas as etapas estão 100%), sem mexer na data da
     última alteração. */
  function marcarStatus(id, status) {
    return colecao("avaliacoes").doc(id).update({ status: status });
  }

  /* Exclusão pelas Avaliações Pendentes: as regras do Firestore só deixam quem iniciou a avaliação. */
  function excluirAvaliacao(id) {
    return colecao("avaliacoes").doc(id).delete();
  }

  /* ---------- Administração (só ADMIN_EMAIL; as regras do Firestore conferem) ---------- */

  /* Todos os acessos, menos os excluídos. */
  function listarUsuarios() {
    return colecao("profissionais").get().then(function (r) {
      return r.docs.map(lerDoc).filter(function (p) { return p.excluido !== true; });
    });
  }

  function buscarPorEmail(email) {
    return colecao("profissionais").where("email", "==", email).get()
      .then(function (r) { return r.docs.map(lerDoc); });
  }

  /* Segunda instância do Firebase só para cadastrar: criar a conta nela não troca quem
     está logado (o administrador continua no sistema). */
  function authCadastro() {
    const existente = firebase.apps.filter(function (a) { return a.name === "cadastro"; })[0];
    const app = existente || firebase.initializeApp(config, "cadastro");
    const a = app.auth();
    a.languageCode = "pt-BR";
    return a;
  }

  function limparNome(nome) {
    return String(nome || "").trim().replace(/\s+/g, " ");
  }

  /* Cria o acesso com a senha provisória. No primeiro login a pessoa troca por uma senha
     pessoal (senhaDefinida: false). Se o e-mail for de um acesso excluído que ainda está no
     Authentication, recusa com { code: "excluido", usuario } para o administrador restaurar. */
  function criarUsuario(nome, email, senha) {
    const endereco = String(email || "").trim().toLowerCase();
    const limpo = limparNome(nome);
    return buscarPorEmail(endereco).then(function (achados) {
      const comAcesso = achados.filter(function (p) { return p.excluido !== true; })[0];
      if (comAcesso || endereco === ADMIN_EMAIL) throw { code: "ja-cadastrado" };
      const excluido = achados[0];
      const cadastro = authCadastro();
      return cadastro.setPersistence(firebase.auth.Auth.Persistence.NONE)
        .then(function () { return cadastro.createUserWithEmailAndPassword(endereco, senha); })
        .then(function (credencial) {
          const novo = credencial.user;
          const registro = {
            nome: limpo,
            email: endereco,
            ativo: true,
            excluido: false,
            senhaDefinida: false,
            criadoEm: agora(),
            criadoPor: usuario().email,
            atualizadoEm: agora()
          };
          return colecao("profissionais").doc(novo.uid).set(registro)
            .catch(function (erro) {
              /* Não deixa uma conta sem registro para trás. */
              return novo.delete().catch(function () {}).then(function () { throw erro; });
            })
            .then(function () {
              return novo.updateProfile({ displayName: limpo }).catch(function () {});
            })
            .then(function () { return { id: novo.uid, nome: limpo, email: endereco }; });
        })
        .catch(function (erro) {
          if (erro && erro.code === "auth/email-already-in-use" && excluido) {
            throw { code: "excluido", usuario: excluido };
          }
          throw erro;
        })
        .finally(function () { return cadastro.signOut().catch(function () {}); });
    });
  }

  function alterarUsuario(uid, campos) {
    return colecao("profissionais").doc(uid).update(Object.assign({}, campos, {
      atualizadoEm: agora(),
      alteradoPor: usuario().email
    }));
  }

  /* Desativar / dar acesso de novo. */
  function definirAtivo(uid, ativo) {
    return alterarUsuario(uid, { ativo: ativo });
  }

  /* Excluir: some da lista e perde o acesso na hora. A conta do Authentication é apagada de
     vez quando a pessoa tentar entrar de novo (o e-mail fica livre para outro cadastro). */
  function excluirUsuario(uid) {
    return alterarUsuario(uid, { excluido: true, ativo: false, excluidoEm: agora() });
  }

  /* Acesso excluído cadastrado de novo: volta com a senha que a pessoa já tinha. */
  function restaurarUsuario(uid, nome) {
    const campos = { excluido: false, ativo: true };
    if (limparNome(nome)) campos.nome = limparNome(nome);
    return alterarUsuario(uid, campos);
  }

  /* Redefinir a senha de um usuário: o Firebase manda um link por e-mail para a pessoa
     criar uma senha nova (a atual vale até ela trocar). */
  function enviarRedefinicao(email) {
    return auth.sendPasswordResetEmail(email);
  }

  return {
    configurado: configurado,
    ADMIN_EMAIL: ADMIN_EMAIL,
    ehAdmin: ehAdmin,
    situacaoAcesso: situacaoAcesso,
    recusarAcesso: recusarAcesso,
    vigiarAcesso: vigiarAcesso,
    listarUsuarios: listarUsuarios,
    criarUsuario: criarUsuario,
    definirAtivo: definirAtivo,
    excluirUsuario: excluirUsuario,
    restaurarUsuario: restaurarUsuario,
    enviarRedefinicao: enviarRedefinicao,
    mensagemErro: mensagemErro,
    nomeDoEmail: nomeDoEmail,
    entrar: entrar,
    sair: sair,
    recuperarSenha: recuperarSenha,
    validarNovaSenha: validarNovaSenha,
    definirSenha: definirSenha,
    trocarSenha: trocarSenha,
    aoMudarUsuario: aoMudarUsuario,
    usuario: usuario,
    perfil: perfil,
    alterarNome: alterarNome,
    salvarAvaliacao: salvarAvaliacao,
    salvarSecao: salvarSecao,
    listarAvaliacoes: listarAvaliacoes,
    abrirAvaliacao: abrirAvaliacao,
    marcarStatus: marcarStatus,
    excluirAvaliacao: excluirAvaliacao
  };
})();
