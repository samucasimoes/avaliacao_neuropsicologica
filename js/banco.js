/* Firebase: login (Authentication) e banco de dados (Firestore).
   Coleções:
   - avaliacoes/{id}: paciente, campos (os mesmos nomes do formulário e do .json), secao,
     status ("em_andamento" ou "concluida"), responsavelNome/Uid, criadoEm, atualizadoEm
     e expiraEm (6 meses, 180 dias, depois da última alteração; depois disso é apagada de vez).
   - profissionais/{uid}: nome e e-mail de quem já entrou (usado na saudação) e senhaDefinida
     (true depois que a pessoa troca a senha provisória do primeiro acesso).
   Os acessos são criados no console do Firebase (Authentication > Usuários). */

const Banco = (function () {
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

  /* Cada avaliação fica guardada por 6 meses (180 dias) depois da última alteração. */
  const DIAS_GUARDADA = 180;
  const DIA_MS = 24 * 60 * 60 * 1000;

  function limiteGuarda() {
    return new Date(Date.now() - DIAS_GUARDADA * DIA_MS);
  }

  /* Quando a avaliação será apagada (a partir da última alteração). */
  function expiraEm(avaliacao) {
    const base = avaliacao.atualizadoEm && avaliacao.atualizadoEm.toDate
      ? avaliacao.atualizadoEm.toDate() : new Date();
    return new Date(base.getTime() + DIAS_GUARDADA * DIA_MS);
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
    "auth/unauthorized-domain": "Este endereço não está autorizado no Firebase (Authentication > Configurações > Domínios autorizados).",
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

  function entrar(email, senha, lembrar) {
    const persistencia = lembrar ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;
    return auth.setPersistence(persistencia).then(function () {
      return auth.signInWithEmailAndPassword(email, senha);
    });
  }

  function sair() {
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

  /* Primeiro acesso: a senha ainda é a provisória criada no console do Firebase. */
  function precisaDefinirSenha() {
    const u = usuario();
    return colecao("profissionais").doc(u.uid).get().then(function (doc) {
      return !(doc.exists && doc.data().senhaDefinida === true);
    });
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
    auth.onAuthStateChanged(retorno);
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
      if (doc.exists && doc.data().nome) return lerDoc(doc);
      const novo = { nome: u.displayName || nomeDoEmail(u.email), email: u.email, atualizadoEm: agora() };
      return ref.set(novo, { merge: true }).then(function () {
        novo.id = u.uid;
        return novo;
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
    const registro = Object.assign({}, dados, {
      atualizadoEm: agora(),
      expiraEm: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + DIAS_GUARDADA * DIA_MS))
    });
    if (id) {
      return colecao("avaliacoes").doc(id).update(registro)
        .then(function () { return id; })
        .catch(function (erro) {
          /* Já foi apagada (passou do prazo): grava de novo como avaliação nova. */
          if (erro && erro.code === "not-found") return salvarAvaliacao(null, dados, responsavelNome);
          throw erro;
        });
    }
    Object.assign(registro, {
      status: dados.status || "em_andamento",
      criadoEm: agora(),
      responsavelUid: usuario().uid,
      responsavelNome: responsavelNome || nomeDoEmail(usuario().email)
    });
    return colecao("avaliacoes").add(registro).then(function (ref) { return ref.id; });
  }

  /* Só as que ainda estão no prazo (as mais antigas são apagadas), da mais recente para a mais antiga. */
  function listarAvaliacoes(limite) {
    return colecao("avaliacoes")
      .where("atualizadoEm", ">=", limiteGuarda())
      .orderBy("atualizadoEm", "desc")
      .limit(limite || 100)
      .get()
      .then(function (r) { return r.docs.map(lerDoc); });
  }

  /* Apaga de vez as avaliações sem alteração há mais de 6 meses (feito ao entrar no sistema).
     As regras do Firestore só deixam apagar as que já passaram do prazo. */
  function apagarExpiradas() {
    return colecao("avaliacoes")
      .where("atualizadoEm", "<", limiteGuarda())
      .limit(100)
      .get()
      .then(function (r) {
        if (r.empty) return 0;
        const lote = db.batch();
        r.docs.forEach(function (doc) { lote.delete(doc.ref); });
        return lote.commit().then(function () { return r.size; });
      });
  }

  function abrirAvaliacao(id) {
    return colecao("avaliacoes").doc(id).get().then(function (doc) {
      if (!doc.exists) throw { code: "not-found" };
      return lerDoc(doc);
    });
  }

  /* Corrige só o status (Concluída quando todas as etapas estão 100%), sem mexer na data da
     última alteração, para não adiar a exclusão. */
  function marcarStatus(id, status) {
    return colecao("avaliacoes").doc(id).update({ status: status });
  }

  /* Exclusão pelas Avaliações Pendentes: as regras do Firestore só deixam quem iniciou a avaliação. */
  function excluirAvaliacao(id) {
    return colecao("avaliacoes").doc(id).delete();
  }

  return {
    configurado: configurado,
    mensagemErro: mensagemErro,
    nomeDoEmail: nomeDoEmail,
    entrar: entrar,
    sair: sair,
    recuperarSenha: recuperarSenha,
    validarNovaSenha: validarNovaSenha,
    precisaDefinirSenha: precisaDefinirSenha,
    definirSenha: definirSenha,
    trocarSenha: trocarSenha,
    aoMudarUsuario: aoMudarUsuario,
    usuario: usuario,
    perfil: perfil,
    alterarNome: alterarNome,
    salvarAvaliacao: salvarAvaliacao,
    listarAvaliacoes: listarAvaliacoes,
    apagarExpiradas: apagarExpiradas,
    expiraEm: expiraEm,
    DIAS_GUARDADA: DIAS_GUARDADA,
    abrirAvaliacao: abrirAvaliacao,
    marcarStatus: marcarStatus,
    excluirAvaliacao: excluirAvaliacao
  };
})();
