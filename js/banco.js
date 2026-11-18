/* Firebase: login (Authentication) e banco de dados (Firestore).
   Coleções:
   - avaliacoes/{id}: paciente, campos (os mesmos nomes do formulário e do .json), secao,
     status ("em_andamento" ou "concluida"), responsavelNome/Uid, criadoEm, atualizadoEm
     e expiraEm (30 dias depois da última alteração; depois disso é apagada de vez).
   - profissionais/{uid}: nome e e-mail de quem já entrou (usado na saudação).
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

  /* Cada avaliação fica guardada por 30 dias depois da última alteração. */
  const DIAS_GUARDADA = 30;
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
          /* Já foi apagada (passou dos 30 dias): grava de novo como avaliação nova. */
          if (erro && erro.code === "not-found") return salvarAvaliacao(null, dados, responsavelNome);
          throw erro;
        });
    }
    Object.assign(registro, {
      status: "em_andamento",
      criadoEm: agora(),
      responsavelUid: usuario().uid,
      responsavelNome: responsavelNome || nomeDoEmail(usuario().email)
    });
    return colecao("avaliacoes").add(registro).then(function (ref) { return ref.id; });
  }

  /* Só as dos últimos 30 dias (as mais antigas são apagadas), da mais recente para a mais antiga. */
  function listarAvaliacoes(limite) {
    return colecao("avaliacoes")
      .where("atualizadoEm", ">=", limiteGuarda())
      .orderBy("atualizadoEm", "desc")
      .limit(limite || 100)
      .get()
      .then(function (r) { return r.docs.map(lerDoc); });
  }

  /* Apaga de vez as avaliações sem alteração há mais de 30 dias (feito ao entrar no sistema).
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

  /* Exclusão pelo histórico: as regras do Firestore só deixam quem iniciou a avaliação. */
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
    aoMudarUsuario: aoMudarUsuario,
    usuario: usuario,
    perfil: perfil,
    salvarAvaliacao: salvarAvaliacao,
    listarAvaliacoes: listarAvaliacoes,
    apagarExpiradas: apagarExpiradas,
    expiraEm: expiraEm,
    DIAS_GUARDADA: DIAS_GUARDADA,
    abrirAvaliacao: abrirAvaliacao,
    excluirAvaliacao: excluirAvaliacao
  };
})();
