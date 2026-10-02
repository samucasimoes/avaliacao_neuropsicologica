/* Relógio de Shulman: área de desenho com círculo, pontuação e imagem para o relatório. */

const Shulman = (function () {
  const PONTUACOES = [
    { valor: 5, texto: "Relógio perfeito" },
    { valor: 4, texto: "Erros visuoespaciais leves (ex.: espaçamento irregular dos números)" },
    { valor: 3, texto: "Representação incorreta de 11h10, com boa organização visuoespacial" },
    { valor: 2, texto: "Desorganização visuoespacial moderada, que impede marcar 11h10 corretamente" },
    { valor: 1, texto: "Desorganização visuoespacial grave" },
    { valor: 0, texto: "Incapaz de fazer qualquer representação razoável de um relógio" }
  ];

  const PONTUACAO_MAXIMA = 5;
  const REFERENCIA = "Pontuação de Shulman de 0 a 5: 5 relógio perfeito; pontuações mais baixas indicam pior desempenho.";

  /* O desenho é feito em 800 x 800 e o círculo fica no centro, igual ao SVG da tela. */
  const TAMANHO = 800;
  const CIRCULO = { x: 400, y: 400, raio: 360, espessura: 4 };
  const CANETA = { cor: "#1f1f1f", espessura: 5 };
  const BORRACHA = { espessura: 34 };
  const LIMITE_DESFAZER = 25;

  let form = null;
  let canvas = null;
  let ctx = null;
  let ferramenta = "caneta";
  let desenhando = false;
  let historico = [];

  function criar(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  /* ---------- Desenho ---------- */

  function ponto(evento) {
    const area = canvas.getBoundingClientRect();
    return {
      x: (evento.clientX - area.left) * (TAMANHO / area.width),
      y: (evento.clientY - area.top) * (TAMANHO / area.height)
    };
  }

  function configurarTraco() {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (ferramenta === "borracha") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = BORRACHA.espessura;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = CANETA.cor;
      ctx.lineWidth = CANETA.espessura;
    }
  }

  function guardarEstado() {
    historico.push(ctx.getImageData(0, 0, TAMANHO, TAMANHO));
    if (historico.length > LIMITE_DESFAZER) historico.shift();
    atualizarBotoes();
  }

  function iniciarTraco(evento) {
    if (evento.button !== undefined && evento.button !== 0) return;
    evento.preventDefault();
    try {
      canvas.setPointerCapture(evento.pointerId);
    } catch (erro) {
      /* Sem captura o traço só para ao sair da área; segue desenhando. */
    }
    guardarEstado();
    desenhando = true;
    configurarTraco();
    const p = ponto(evento);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y);
    ctx.stroke();
  }

  function continuarTraco(evento) {
    if (!desenhando) return;
    const agrupados = evento.getCoalescedEvents ? evento.getCoalescedEvents() : [];
    (agrupados.length ? agrupados : [evento]).forEach(function (e) {
      const p = ponto(e);
      ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  function terminarTraco() {
    if (!desenhando) return;
    desenhando = false;
    ctx.closePath();
    avisarMudanca();
  }

  function desfazer() {
    const anterior = historico.pop();
    if (!anterior) return;
    ctx.putImageData(anterior, 0, 0);
    atualizarBotoes();
    avisarMudanca();
  }

  function apagarDesenho() {
    if (!temDesenho()) return;
    guardarEstado();
    ctx.clearRect(0, 0, TAMANHO, TAMANHO);
    avisarMudanca();
  }

  function escolherFerramenta(nome) {
    ferramenta = nome;
    document.querySelectorAll("[data-ferramenta]").forEach(function (botao) {
      botao.setAttribute("aria-pressed", String(botao.dataset.ferramenta === nome));
    });
    canvas.classList.toggle("modo-borracha", nome === "borracha");
  }

  function atualizarBotoes() {
    document.getElementById("shulman-desfazer").disabled = historico.length === 0;
  }

  /* Avisa o restante da página, como faria a mudança de um campo. */
  function avisarMudanca() {
    canvas.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function temDesenho() {
    const pixels = ctx.getImageData(0, 0, TAMANHO, TAMANHO).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] !== 0) return true;
    }
    return false;
  }

  /* ---------- Backup ---------- */

  /* Só os traços (fundo transparente), para o backup .json. */
  function desenho() {
    return temDesenho() ? canvas.toDataURL("image/png") : "";
  }

  function limpar() {
    ctx.clearRect(0, 0, TAMANHO, TAMANHO);
    historico = [];
    escolherFerramenta("caneta");
    atualizarBotoes();
    atualizar();
  }

  function carregar(dataUrl) {
    limpar();
    if (!dataUrl) return;
    const imagem = new Image();
    imagem.onload = function () {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(imagem, 0, 0, TAMANHO, TAMANHO);
      avisarMudanca();
    };
    imagem.src = dataUrl;
  }

  /* ---------- Relatório ---------- */

  /* Desenho completo (fundo branco + círculo + traços) em PNG. */
  function imagem() {
    const saida = document.createElement("canvas");
    saida.width = TAMANHO;
    saida.height = TAMANHO;
    const c = saida.getContext("2d");
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, TAMANHO, TAMANHO);
    c.strokeStyle = "#222222";
    c.lineWidth = CIRCULO.espessura;
    c.beginPath();
    c.arc(CIRCULO.x, CIRCULO.y, CIRCULO.raio, 0, Math.PI * 2);
    c.stroke();
    c.drawImage(canvas, 0, 0);
    return saida.toDataURL("image/png");
  }

  function pontuacaoEscolhida() {
    const marcado = form.querySelector('input[name="shulman"]:checked');
    if (!marcado) return null;
    return PONTUACOES.find(function (p) { return String(p.valor) === marcado.value; }) || null;
  }

  function resultado() {
    const pontuacao = pontuacaoEscolhida();
    const observacoes = document.getElementById("shulman-observacoes").value.trim();
    const comDesenho = temDesenho();
    return {
      preenchido: !!pontuacao || comDesenho || observacoes !== "",
      pontuacao: pontuacao ? pontuacao.valor : null,
      descricao: pontuacao ? pontuacao.texto : "",
      pontuacaoMaxima: PONTUACAO_MAXIMA,
      observacoes: observacoes,
      imagem: comDesenho ? imagem() : null,
      referencia: REFERENCIA
    };
  }

  /* ---------- Tela ---------- */

  function montarPontuacoes(container) {
    PONTUACOES.forEach(function (p) {
      const rotulo = criar("label", "shulman-opcao");
      const radio = criar("input", "opcao-radio");
      radio.type = "radio";
      radio.name = "shulman";
      radio.value = String(p.valor);
      rotulo.appendChild(radio);
      const caixa = criar("span", "shulman-opcao-caixa");
      caixa.appendChild(criar("span", "shulman-opcao-valor", String(p.valor)));
      caixa.appendChild(criar("span", "shulman-opcao-texto", p.texto));
      rotulo.appendChild(caixa);
      container.appendChild(rotulo);
    });
  }

  function atualizar() {
    const pontuacao = pontuacaoEscolhida();
    document.getElementById("shulman-pontuacao").textContent = pontuacao ? pontuacao.valor : "—";
    const selo = document.getElementById("shulman-classificacao");
    selo.textContent = pontuacao ? pontuacao.texto : "Sem pontuação";
    selo.classList.toggle("nivel-baixo", !!pontuacao && pontuacao.valor >= 4);
    selo.classList.toggle("nivel-medio", !!pontuacao && pontuacao.valor === 3);
    selo.classList.toggle("nivel-alto", !!pontuacao && pontuacao.valor <= 2);
  }

  function iniciar(formulario) {
    form = formulario;
    canvas = document.getElementById("shulman-canvas");
    canvas.width = TAMANHO;
    canvas.height = TAMANHO;
    ctx = canvas.getContext("2d", { willReadFrequently: true });

    canvas.addEventListener("pointerdown", iniciarTraco);
    canvas.addEventListener("pointermove", continuarTraco);
    canvas.addEventListener("pointerup", terminarTraco);
    canvas.addEventListener("pointercancel", terminarTraco);
    canvas.addEventListener("pointerleave", terminarTraco);

    document.querySelectorAll("[data-ferramenta]").forEach(function (botao) {
      botao.addEventListener("click", function () { escolherFerramenta(botao.dataset.ferramenta); });
    });
    document.getElementById("shulman-desfazer").addEventListener("click", desfazer);
    document.getElementById("shulman-apagar").addEventListener("click", apagarDesenho);

    const opcoes = document.getElementById("shulman-opcoes");
    montarPontuacoes(opcoes);
    opcoes.addEventListener("change", atualizar);

    escolherFerramenta("caneta");
    atualizarBotoes();
    atualizar();
  }

  return {
    iniciar: iniciar,
    atualizar: atualizar,
    resultado: resultado,
    pontuado: function () { return !!pontuacaoEscolhida(); },
    temDesenho: temDesenho,
    desenho: desenho,
    carregar: carregar,
    limpar: limpar
  };
})();
