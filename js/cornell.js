/* Escala Cornell para Depressão: itens, montagem da tela e cálculo do escore. */

const Cornell = (function () {
  const OPCOES = [
    { valor: "impossibilitado", rotulo: "Não avaliável", nome: "Impossibilitado de avaliar", pontos: 0 },
    { valor: "ausente", rotulo: "Ausente", nome: "Ausente", pontos: 0 },
    { valor: "leve", rotulo: "Leve", nome: "Leve", pontos: 1 },
    { valor: "intenso", rotulo: "Intenso", nome: "Intenso", pontos: 2 }
  ];

  const GRUPOS = [
    {
      titulo: "Sinais relacionados ao humor",
      itens: [
        ["Ansiedade", "expressão ansiosa, preocupações"],
        ["Tristeza", "expressão triste, voz triste, choroso(a)"],
        ["Falta de reação a eventos prazerosos", ""],
        ["Irritabilidade", "facilmente aborrecido(a), temperamento explosivo"]
      ]
    },
    {
      titulo: "Distúrbios de comportamento",
      itens: [
        ["Agitação", "inquietação constante"],
        ["Retardo", "movimentos lentos, fala lenta, reação lenta"],
        ["Queixas físicas múltiplas", "escore 0 se forem apenas sintomas gastrointestinais"],
        ["Perda de interesse", "menor envolvimento em atividades usuais"]
      ]
    },
    {
      titulo: "Sinais físicos",
      itens: [
        ["Perda do apetite", "come menos que o usual"],
        ["Perda de peso", "marque 2 pontos se for maior que 2,2 kg em um mês"],
        ["Falta de energia", "facilmente fatigado(a), incapaz de sustentar atividades"]
      ]
    },
    {
      titulo: "Funções cíclicas",
      itens: [
        ["Variação diurna de humor", "os sintomas são piores pela manhã"],
        ["Dificuldade para dormir", "indo dormir mais tarde que o usual"],
        ["Desperta muitas vezes durante o sono", ""],
        ["Despertar precoce", "mais cedo que o usual"]
      ]
    },
    {
      titulo: "Distúrbio de ideação",
      itens: [
        ["Suicídio", "sente que a vida não vale a pena, tem desejos suicidas ou faz tentativas de suicídio"],
        ["Baixa autoestima", "culpa-se, deprecia-se, sentimentos de fracasso"],
        ["Pessimismo", "antecipa o pior"],
        ["Delírios congruentes com o humor", "delírios de pobreza, doença ou perda"]
      ]
    }
  ];

  const TOTAL_ITENS = 19;
  const PONTUACAO_MAXIMA = 38;
  const REFERENCIA = "0 a 8: ausência de depressão; 9 a 11: depressão leve; 12 ou mais: depressão moderada a grave.";

  let form = null;

  function nomeCampo(numero) {
    return "cornell" + numero;
  }

  function interpretar(total) {
    if (total >= 12) return { texto: "Depressão moderada a grave", nivel: "alto" };
    if (total >= 9) return { texto: "Depressão leve", nivel: "medio" };
    return { texto: "Ausência de depressão", nivel: "baixo" };
  }

  /* Percorre os itens numerados de 1 a 19. */
  function cadaItem(callback) {
    let numero = 0;
    GRUPOS.forEach(function (grupo) {
      grupo.itens.forEach(function (item) {
        numero++;
        callback(numero, item[0], item[1], grupo);
      });
    });
  }

  function criar(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  function montar(container) {
    let grupoAtual = null;
    cadaItem(function (numero, texto, nota, grupo) {
      if (grupo !== grupoAtual) {
        grupoAtual = grupo;
        container.appendChild(criar("h3", "escala-grupo", grupo.titulo));
      }

      const linha = criar("div", "escala-item");
      linha.setAttribute("role", "radiogroup");
      linha.setAttribute("aria-labelledby", nomeCampo(numero) + "-texto");

      const descricao = criar("p", "escala-texto");
      descricao.id = nomeCampo(numero) + "-texto";
      descricao.appendChild(criar("span", "escala-num", String(numero)));
      descricao.appendChild(document.createTextNode(texto));
      if (nota) descricao.appendChild(criar("span", "escala-nota", "(" + nota + ")"));
      linha.appendChild(descricao);

      const opcoes = criar("div", "escala-opcoes");
      OPCOES.forEach(function (opcao) {
        const rotulo = criar("label", "opcao");
        rotulo.title = opcao.nome + " (" + opcao.pontos + (opcao.pontos === 1 ? " ponto)" : " pontos)");
        const radio = criar("input", "opcao-radio");
        radio.type = "radio";
        radio.name = nomeCampo(numero);
        radio.value = opcao.valor;
        rotulo.appendChild(radio);
        const caixa = criar("span", "opcao-caixa");
        caixa.appendChild(criar("span", "opcao-texto", opcao.rotulo));
        caixa.appendChild(criar("span", "opcao-pontos", String(opcao.pontos)));
        rotulo.appendChild(caixa);
        opcoes.appendChild(rotulo);
      });
      linha.appendChild(opcoes);
      container.appendChild(linha);
    });
  }

  function respostaDe(numero) {
    const marcado = form.querySelector('input[name="' + nomeCampo(numero) + '"]:checked');
    if (!marcado) return null;
    return OPCOES.find(function (opcao) { return opcao.valor === marcado.value; }) || null;
  }

  /* Resultado completo, usado na tela e no relatório. */
  function resultado() {
    const grupos = [];
    let total = 0;
    let respondidos = 0;
    let grupoAtual = null;

    cadaItem(function (numero, texto, nota, grupo) {
      if (grupo !== grupoAtual) {
        grupoAtual = grupo;
        grupos.push({ titulo: grupo.titulo, itens: [] });
      }
      const resposta = respostaDe(numero);
      if (resposta) {
        total += resposta.pontos;
        respondidos++;
      }
      grupos[grupos.length - 1].itens.push({
        numero: numero,
        texto: nota ? texto + " (" + nota + ")" : texto,
        resposta: resposta ? resposta.nome : "",
        pontos: resposta ? resposta.pontos : null
      });
    });

    return {
      total: total,
      respondidos: respondidos,
      totalItens: TOTAL_ITENS,
      pontuacaoMaxima: PONTUACAO_MAXIMA,
      interpretacao: respondidos ? interpretar(total).texto : "",
      referencia: REFERENCIA,
      grupos: grupos
    };
  }

  /* Conteúdo para o relatório (só entra se algum item foi respondido). */
  function relatorio() {
    const r = resultado();
    if (!r.respondidos) return null;
    const linhas = [];
    r.grupos.forEach(function (grupo) {
      linhas.push({ grupo: grupo.titulo });
      grupo.itens.forEach(function (item) {
        linhas.push(item.pontos === null
          ? { celulas: [item.numero, item.texto, "Não respondido", "—"], suave: true }
          : [item.numero, item.texto, item.resposta, item.pontos]);
      });
    });
    linhas.push({ celulas: ["", "Escore total", "", r.total], destaque: true });

    return {
      titulo: "Escala Cornell para Depressão",
      blocos: [
        {
          tipo: "caixas",
          caixas: [
            ["Escore total", r.total + " / " + r.pontuacaoMaxima],
            ["Itens respondidos", r.respondidos + " de " + r.totalItens],
            ["Interpretação", r.interpretacao + (r.respondidos < r.totalItens ? " (parcial)" : "")]
          ]
        },
        {
          tipo: "tabela",
          cabecalho: ["Nº", "Sinal avaliado", "Avaliação", "Pontos"],
          linhas: linhas,
          estilos: { 0: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 42 }, 3: { cellWidth: 16, halign: "center" } }
        }
      ]
    };
  }

  function atualizar() {
    const r = resultado();
    document.getElementById("cornell-total").textContent = r.total;
    document.getElementById("cornell-respondidos").textContent = r.respondidos;

    const selo = document.getElementById("cornell-interpretacao");
    selo.classList.remove("nivel-baixo", "nivel-medio", "nivel-alto");
    if (!r.respondidos) {
      selo.textContent = "Nenhum item respondido";
    } else {
      const interpretacao = interpretar(r.total);
      selo.textContent = interpretacao.texto + (r.respondidos < TOTAL_ITENS ? " (parcial)" : "");
      selo.classList.add("nivel-" + interpretacao.nivel);
    }

    document.getElementById("btn-cornell-ausente").disabled = r.respondidos === TOTAL_ITENS;

    /* Tira o destaque de pendente dos itens que já foram respondidos. */
    cadaItem(function (numero) {
      if (respostaDe(numero)) linhaDe(numero).classList.remove("pendente");
    });
  }

  function linhaDe(numero) {
    return document.getElementById(nomeCampo(numero) + "-texto").closest(".escala-item");
  }

  function completa() {
    return resultado().respondidos === TOTAL_ITENS;
  }

  /* Destaca os itens sem resposta e leva até o primeiro deles. */
  function validar() {
    let primeiro = null;
    cadaItem(function (numero) {
      const pendente = !respostaDe(numero);
      linhaDe(numero).classList.toggle("pendente", pendente);
      if (pendente && !primeiro) primeiro = numero;
    });
    if (primeiro) {
      linhaDe(primeiro).scrollIntoView({ block: "center" });
      form.querySelector('input[name="' + nomeCampo(primeiro) + '"]').focus({ preventScroll: true });
    }
    return !primeiro;
  }

  function limparPendentes() {
    cadaItem(function (numero) { linhaDe(numero).classList.remove("pendente"); });
  }

  function marcarRestantesAusente() {
    cadaItem(function (numero) {
      if (!respostaDe(numero)) {
        form.querySelector('input[name="' + nomeCampo(numero) + '"][value="ausente"]').checked = true;
      }
    });
    /* Avisa o restante da página, como faria um clique em cada opção. */
    document.getElementById("cornell-itens").dispatchEvent(new Event("change", { bubbles: true }));
  }

  function iniciar(formulario) {
    form = formulario;
    const container = document.getElementById("cornell-itens");
    montar(container);
    container.addEventListener("change", atualizar);
    document.getElementById("btn-cornell-ausente").addEventListener("click", marcarRestantesAusente);
    atualizar();
  }

  return {
    iniciar: iniciar,
    atualizar: atualizar,
    resultado: resultado,
    relatorio: relatorio,
    completa: completa,
    validar: validar,
    limparPendentes: limparPendentes
  };
})();
