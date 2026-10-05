/* Relógio de Shulman: tela em branco para o desenho e imagem para o relatório. */

const Shulman = (function () {
  const INSTRUCAO = "Marque no relógio 11 horas e 10 minutos.";

  /* O desenho é feito em 800 x 800. */
  const TAMANHO = 800;
  const CANETA = { cor: "#1f1f1f", espessura: 5 };
  const BORRACHA = { espessura: 34 };
  const LIMITE_DESFAZER = 25;

  let canvas = null;
  let ctx = null;
  let ferramenta = "caneta";
  let desenhando = false;
  let historico = [];

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

  /* Mostra a área de desenho em tela cheia, útil no celular e no tablet. */
  function expandir(ativo) {
    const area = document.querySelector(".shulman-desenho");
    const botao = document.getElementById("shulman-expandir");
    area.classList.toggle("expandido", ativo);
    document.body.classList.toggle("desenho-expandido", ativo);
    botao.setAttribute("aria-pressed", String(ativo));
    botao.querySelector(".expandir-texto").textContent = ativo ? "Fechar" : "Expandir";
    botao.title = ativo ? "Voltar ao tamanho normal" : "Desenhar em tela cheia";
    if (ativo) area.scrollTop = 0;
  }

  function expandido() {
    return document.querySelector(".shulman-desenho").classList.contains("expandido");
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
    expandir(false);
    escolherFerramenta("caneta");
    atualizarBotoes();
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

  /* Desenho completo (fundo branco + traços) em PNG. */
  function imagem() {
    const saida = document.createElement("canvas");
    saida.width = TAMANHO;
    saida.height = TAMANHO;
    const c = saida.getContext("2d");
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, TAMANHO, TAMANHO);
    c.drawImage(canvas, 0, 0);
    return saida.toDataURL("image/png");
  }

  /* Conteúdo para o relatório (só entra se houver desenho). */
  function relatorio() {
    if (!temDesenho()) return null;
    return {
      titulo: "Relógio de Shulman",
      blocos: [
        { tipo: "paragrafo", texto: INSTRUCAO, negrito: true },
        { tipo: "imagem", imagem: imagem(), largura: 95, altura: 95, borda: true }
      ]
    };
  }

  function iniciar() {
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
    document.getElementById("shulman-expandir").addEventListener("click", function () {
      expandir(!expandido());
    });
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && expandido()) expandir(false);
    });

    escolherFerramenta("caneta");
    atualizarBotoes();
  }

  return {
    iniciar: iniciar,
    relatorio: relatorio,
    temDesenho: temDesenho,
    desenho: desenho,
    carregar: carregar,
    limpar: limpar
  };
})();
