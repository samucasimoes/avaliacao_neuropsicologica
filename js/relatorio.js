/* Geração do relatório em PDF (jsPDF + AutoTable) e Excel (ExcelJS).
   Cada etapa entrega uma lista de blocos ({ tipo, ... }) e aqui eles viram páginas. */

const Relatorio = (function () {
  const TITULO = "Avaliação Neuropsicológica";

  /* Ex.: "Maria da Silva - 30-10-2026 - Pendente.pdf" (nome do paciente, data em que o
     arquivo foi gerado e situação: Concluído com todas as etapas 100% preenchidas). */
  function nomeArquivo(nome, extensao, situacao) {
    const base = String(nome || "")
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\.+|\.+$/g, "");
    const hoje = new Date();
    const data = [hoje.getDate(), hoje.getMonth() + 1]
      .map(function (n) { return String(n).padStart(2, "0"); })
      .concat(hoje.getFullYear())
      .join("-");
    return [base || "Paciente", data, situacao].filter(Boolean).join(" - ") + "." + extensao;
  }

  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* A fonte padrão do PDF não tem alguns símbolos. Com manterMaiorIgual, o "≥" fica
     para ser desenhado à parte (texto com marcas, abaixo). */
  function textoPdf(texto, manterMaiorIgual) {
    const t = String(texto === null || texto === undefined ? "" : texto)
      .replace(/≤/g, "<=")
      .replace(/▪/g, "•");
    return manterMaiorIgual ? t : t.replace(/≥/g, ">=");
  }

  /* Marcas nos textos da impressão (em definicoes.js):
     *texto* = palavras em inglês, em itálico; **texto** = negrito; __texto__ = sublinhado.
     O "≥" também passa por aqui, porque é desenhado (a fonte do PDF não tem o sinal). */
  const MARCAS = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__)/;

  function temMarcas(texto) {
    return /\*[^*]+\*|__[^_]+__|≥/.test(String(texto));
  }

  function semMarcas(texto) {
    return String(texto).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/__([^_]+)__/g, "$1");
  }

  function segmentos(texto) {
    return String(texto).split(MARCAS).filter(Boolean).map(function (parte) {
      if (/^\*\*[^*]+\*\*$/.test(parte)) return { t: parte.slice(2, -2), negrito: true };
      if (/^\*[^*]+\*$/.test(parte)) return { t: parte.slice(1, -1), italico: true };
      if (/^__[^_]+__$/.test(parte)) return { t: parte.slice(2, -2), sublinhado: true };
      return { t: parte };
    });
  }

  /* Linha de tabela: array simples ou { celulas, destaque, suave } ou { grupo }. */
  function celulasDe(linha) {
    return Array.isArray(linha) ? linha : linha.celulas;
  }

  /* ---------- PDF ---------- */

  const COR = {
    escuro: [33, 33, 33],
    tinta: [25, 25, 25],
    suave: [112, 112, 112],
    linha: [214, 214, 214],
    /* Linhas que dividem as questões da Escala de Katz. */
    divisoria: [120, 120, 120]
  };

  /* Tamanhos da letra na impressão: títulos 14, subtítulos 13 e o restante 12.
     O subtítulo logo abaixo do título da aba (ex.: Pfeffer) tem 2 a menos que o título, em itálico. */
  const TAMANHO_TITULO = 14;
  const TAMANHO_SUBTITULO = 13;
  const TAMANHO_SUBTITULO_ABA = TAMANHO_TITULO - 4;
  /* Textos menores (ex.: explicação da fluência verbal, textos da Memória verbal e visual). */
  const TAMANHO_MENOR = 10;
  const TAMANHO_TEXTO = 12;
  /* Referência bibliográfica no fim da folha (Escala de Katz). */
  const TAMANHO_REFERENCIA = 9;
  /* Distância entre as linhas de um texto em letra 12 (mm). */
  const PASSO_LINHA = 5.6;

  const CAMPOS_TEXTO = [
    "Informante",
    "Medicamentos em Uso",
    "História Patológica",
    "História Familiar",
    "Avaliações"
  ];

  /* Já aparecem no cabeçalho e no cartão do paciente. */
  const EXIBIDOS_NO_TOPO = ["Nome", "Idade", "Data de Nascimento"];

  /* Palavras que ficam em minúsculo no meio de um rótulo ("Data da Avaliação"). */
  const PARTICULAS = ["a", "as", "o", "os", "da", "das", "de", "do", "dos", "e", "em"];

  /* Rótulos do cabeçalho padronizados: primeira letra de cada palavra em maiúscula
     e o resto em minúsculo ("MÉDICO SOLICITANTE" -> "Médico Solicitante"). */
  function primeiraMaiuscula(texto) {
    return String(texto).toLowerCase().split(" ").map(function (palavra, i) {
      if (i > 0 && PARTICULAS.indexOf(palavra) !== -1) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    }).join(" ");
  }

  /* Dados do paciente na impressão: o que foi digitado em minúsculo sai com maiúscula
     (o formulário guarda o texto como foi digitado). Nos campos curtos, cada palavra
     começa com maiúscula ("professora aposentada" -> "Professora Aposentada"); nos textos,
     cada frase ("filha. mora com a paciente" -> "Filha. Mora com a paciente").
     Só a primeira letra muda: siglas e o resto do que foi digitado ficam como estão. */
  const CAMPOS_PALAVRAS = ["Nome", "Profissão", "Médico solicitante", "Endereço", "Escolaridade"];

  function maiusculaPalavras(texto) {
    return String(texto).split(" ").map(function (palavra, i) {
      if (i > 0 && PARTICULAS.indexOf(palavra) !== -1) return palavra;
      return palavra.replace(/\p{L}/u, function (letra) { return letra.toUpperCase(); });
    }).join(" ");
  }

  function maiusculaFrases(texto) {
    return String(texto).replace(/(^|[.!?]\s+|\n\s*)(\p{L})/gu, function (tudo, antes, letra) {
      return antes + letra.toUpperCase();
    });
  }

  function formatarDado(rotulo, valor) {
    if (!valor) return valor;
    if (CAMPOS_PALAVRAS.indexOf(rotulo) !== -1) return maiusculaPalavras(valor);
    if (CAMPOS_TEXTO.indexOf(rotulo) !== -1) return maiusculaFrases(valor);
    return valor;
  }

  /* Na identificação, ocupam a linha inteira (textos longos). */
  const CAMPOS_LARGOS = ["Endereço"];

  /* Cada aba ocupa uma folha: a letra é 12 e, só se o conteúdo não couber,
     a folha é refeita com letra um pouco menor até caber. */
  const ESCALA_INICIAL = 1;
  const ESCALA_MINIMA = 0.5;
  const PASSO_ESCALA = 0.05;
  /* Numa folha cheia, os espaços entre os blocos e nas linhas das tabelas encolhem
     (até 55%) antes da letra, para a letra ficar o maior possível. */
  const ESPACOS = [1, 0.85, 0.7, 0.55];

  /* Com opcoes.imprimir, devolve o endereço (blob) do PDF, que abre já com a janela
     de impressão (usado no Ctrl+P), em vez de baixar o arquivo. */
  function gerarPdf(linhas, nomePaciente, secoes, opcoes) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    const margem = 18;
    const util = largura - margem * 2;
    const meio = largura / 2;
    /* Borda direita do "ESCORE DO PACIENTE": a margem menos o recuo das células. */
    const DIREITA_VALORES = margem + util - 2.5;
    /* Sem rodapé (não há numeração das páginas): o conteúdo vai até 16 mm do fim da folha. */
    const limite = altura - 16;
    linhas = linhas.map(function (linha) { return [linha[0], formatarDado(linha[0], linha[1])]; });
    const dados = {};
    linhas.forEach(function (linha) { dados[linha[0]] = linha[1]; });
    let y = 0;
    let k = 1;
    /* Fator dos espaços da folha atual (veja ESPACOS). */
    let c = 1;
    /* Espaçamento extra das tabelas da etapa atual (ex.: MoCA). */
    let espacamento = 1;

    /* Medida proporcional à escala da folha atual. */
    function e(medida) {
      return medida * k;
    }

    /* Espaço entre blocos: segue a escala da folha e encolhe com "c" nas folhas cheias. */
    function g(medida) {
      return medida * k * c;
    }

    /* Depois de tabelas, caixas e imagens: a parte fixa evita que o texto
       seguinte encoste na linha de baixo quando os espaços encolhem. */
    function depoisDeBloco() {
      return e(3.5) + g(2.5);
    }

    function passo() {
      return e(PASSO_LINHA);
    }

    function cor(rgb, tipo) {
      if (tipo === "fill") doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      else if (tipo === "draw") doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      else doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    }

    /* Letra do texto: 12 (ou "tamanho"), um pouco menor numa folha que precisou encolher. */
    function fonte(estilo, rgb, tamanho) {
      doc.setFont("helvetica", estilo || "normal");
      doc.setFontSize((tamanho || TAMANHO_TEXTO) * k);
      cor(rgb || COR.tinta);
    }

    /* ---------- Texto com marcas (inglês em itálico, sublinhado e o sinal ≥) ---------- */

    function estiloFonte(base, italico, negrito) {
      const bold = base === "bold" || negrito;
      if (!italico) return bold ? "bold" : base || "normal";
      return bold ? "bolditalic" : "italic";
    }

    function emMm(tamanho) {
      return tamanho / doc.internal.scaleFactor;
    }

    /* O "≥" desenhado com traços: o ">" em cima e o traço logo abaixo. */
    function larguraMaiorIgual(tamanho) {
      return emMm(tamanho) * 0.62;
    }

    function desenharMaiorIgual(x, yBase, tamanho, negrito) {
      const em = emMm(tamanho);
      const x0 = x + em * 0.05;
      const w = em * 0.5;
      doc.setLineWidth(em * (negrito ? 0.085 : 0.06));
      doc.lines([[w, em * 0.2], [-w, em * 0.2]], x0, yBase - em * 0.62, [1, 1], "S", false);
      doc.line(x0, yBase - em * 0.06, x0 + w, yBase - em * 0.06);
    }

    /* Quebra o texto com marcas em linhas; cada linha é uma lista de pedaços com largura. */
    function linhasRicas(texto, larguraMax, base, tamanho) {
      const pedacos = [];
      segmentos(textoPdf(texto, true)).forEach(function (seg) {
        seg.t.split(/( +|\n)/).forEach(function (parte) {
          if (!parte) return;
          if (parte === "\n") pedacos.push({ quebra: true });
          else if (!parte.trim()) pedacos.push({ espaco: true, italico: seg.italico, negrito: seg.negrito, sublinhado: seg.sublinhado });
          else pedacos.push({ t: parte === "≥" ? parte : parte.replace(/≥/g, ">="), italico: seg.italico, negrito: seg.negrito, sublinhado: seg.sublinhado });
        });
      });
      const linhasTexto = [[]];
      let usada = 0;
      function aparar(linha) {
        while (linha.length && linha[linha.length - 1].espaco) usada -= linha.pop().w;
      }
      pedacos.forEach(function (pedaco) {
        if (pedaco.quebra) {
          aparar(linhasTexto[linhasTexto.length - 1]);
          linhasTexto.push([]);
          usada = 0;
          return;
        }
        doc.setFont("helvetica", estiloFonte(base, pedaco.italico, pedaco.negrito));
        doc.setFontSize(tamanho);
        const w = pedaco.t === "≥" ? larguraMaiorIgual(tamanho) : doc.getTextWidth(pedaco.espaco ? " " : pedaco.t);
        let linha = linhasTexto[linhasTexto.length - 1];
        if (pedaco.espaco) {
          if (linha.length) {
            linha.push(Object.assign({ w: w }, pedaco));
            usada += w;
          }
          return;
        }
        /* Palavra maior que a largura (ex.: comentário digitado sem espaços): quebra no
           meio, letra a letra, em vez de passar da célula. */
        if (w > larguraMax && pedaco.t.length > 1) {
          let trecho = "";
          Array.from(pedaco.t).forEach(function (letra) {
            if (trecho && usada + doc.getTextWidth(trecho + letra) > larguraMax) {
              linha.push(Object.assign({}, pedaco, { t: trecho, w: doc.getTextWidth(trecho) }));
              linha = [];
              linhasTexto.push(linha);
              usada = 0;
              trecho = "";
            }
            trecho += letra;
          });
          const wTrecho = doc.getTextWidth(trecho);
          linha.push(Object.assign({}, pedaco, { t: trecho, w: wTrecho }));
          usada += wTrecho;
          return;
        }
        if (usada + w > larguraMax && linha.some(function (p) { return !p.espaco; })) {
          aparar(linha);
          linha = [];
          linhasTexto.push(linha);
          usada = 0;
        }
        linha.push(Object.assign({ w: w }, pedaco));
        usada += w;
      });
      linhasTexto.forEach(function (linha) {
        while (linha.length && linha[linha.length - 1].espaco) linha.pop();
      });
      return linhasTexto;
    }

    function larguraLinhaRica(linha) {
      return linha.reduce(function (total, p) { return total + p.w; }, 0);
    }

    function desenharLinhaRica(linha, x, yBase, base, tamanho, rgb) {
      let cx = x;
      linha.forEach(function (p) {
        doc.setFont("helvetica", estiloFonte(base, p.italico, p.negrito));
        doc.setFontSize(tamanho);
        cor(rgb);
        cor(rgb, "draw");
        if (p.t === "≥") desenharMaiorIgual(cx, yBase, tamanho, base === "bold");
        else if (!p.espaco) doc.text(p.t, cx, yBase);
        if (p.sublinhado) {
          doc.setLineWidth(emMm(tamanho) * 0.05);
          doc.line(cx, yBase + emMm(tamanho) * 0.14, cx + p.w, yBase + emMm(tamanho) * 0.14);
        }
        cx += p.w;
      });
    }

    function faixaTopo() {
      cor(COR.escuro, "fill");
      doc.rect(0, 0, largura, 2.5, "F");
    }

    function novaPagina() {
      doc.addPage();
      faixaTopo();
      y = 16;
    }

    function garantirEspaco(necessario) {
      if (y + necessario > limite) novaPagina();
    }

    function borda(x, topo, w, h) {
      cor(COR.linha, "draw");
      doc.setLineWidth(0.2);
      doc.roundedRect(x, topo, w, h, 2, 2, "S");
    }

    /* Quebra o texto em linhas que cabem na largura, contando o espaço entre as letras. */
    function quebrarLinhas(texto, larguraMax, espacoLetras) {
      const linhasTexto = [];
      let atual = "";
      const larguraDe = function (t) { return doc.getTextWidth(t) + espacoLetras * Math.max(0, t.length - 1); };
      texto.split(/\s+/).filter(Boolean).forEach(function (palavra) {
        const tentativa = atual ? atual + " " + palavra : palavra;
        if (atual && larguraDe(tentativa) > larguraMax) {
          linhasTexto.push(atual);
          atual = palavra;
        } else {
          atual = tentativa;
        }
      });
      if (atual) linhasTexto.push(atual);
      return linhasTexto;
    }

    /* Escreve linhas centralizadas na folha; devolve a altura usada. */
    function textoCentralizado(linhasTexto, passoLinha, espacoLetras) {
      linhasTexto.forEach(function (linhaTexto, i) {
        const w = doc.getTextWidth(linhaTexto) + espacoLetras * Math.max(0, linhaTexto.length - 1);
        doc.text(linhaTexto, meio - w / 2, y + i * passoLinha, espacoLetras ? { charSpace: espacoLetras } : undefined);
      });
      return (linhasTexto.length - 1) * passoLinha;
    }

    /* Os títulos ficam centralizados e têm sempre o mesmo tamanho (14), mesmo quando
       a folha é refeita com letra menor para caber. */
    /* tamanhoIngles: letra da parte em inglês (12; o Stroop Test, só em inglês, usa 14). */
    function tituloSecao(texto, tamanhoIngles) {
      garantirEspaco(26);
      /* No meio da folha, uma folga fixa para o título (que não diminui) não encostar
         no bloco de cima quando a letra e os espaços da folha encolhem. */
      if (y > 16) y += 3.5;
      /* A parte em inglês (*...*) sai numa linha abaixo, em itálico e letra 12
         (ex.: GDS e, embaixo, "(Geriatric Depression Scale)"). */
      const bruto = String(texto);
      const portugues = bruto.replace(/\*[^*]+\*/g, " ").replace(/\s+/g, " ").trim();
      const ingles = (bruto.match(/\*[^*]+\*/g) || []).map(function (m) { return m.slice(1, -1); }).join(" ");
      const maiusculo = function (t) { return textoPdf(t).toUpperCase().replace(/\bMOCA\b/g, "MoCA"); };
      cor(COR.escuro);
      if (portugues) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(TAMANHO_TITULO);
        y += textoCentralizado(quebrarLinhas(maiusculo(portugues), util, 0.3), 6.4, 0.3);
      }
      if (ingles) {
        if (portugues) y += 5.8;
        doc.setFont("helvetica", "bolditalic");
        doc.setFontSize(tamanhoIngles || TAMANHO_TEXTO);
        y += textoCentralizado(quebrarLinhas(maiusculo(ingles), util, 0.2), (tamanhoIngles || TAMANHO_TEXTO) * 0.45, 0.2);
      }
      cor(COR.linha, "draw");
      doc.setLineWidth(0.3);
      doc.line(margem, y + 3, margem + util, y + 3);
      y += 10.5;
    }

    /* Subtítulo logo abaixo do título da aba (ex.: Questionário de Atividades Funcionais):
       4 a menos que o título (letra 10), em itálico. */
    function subtituloSecao(texto) {
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(TAMANHO_SUBTITULO_ABA);
      cor(COR.escuro);
      y += textoCentralizado(quebrarLinhas(textoPdf(texto).toUpperCase(), util, 0), 4.6, 0);
      y += 7.5;
    }

    /* Subtítulo dentro da folha: centralizado, em caixa alta, negrito, letra 13.
       Tem uma folga fixa em cima (não encolhe nas folhas cheias), para ficar mais perto
       da própria tabela do que da tabela de cima. */
    function subtitulo(texto, menor, tamanho) {
      y += 2.5 + g(menor ? 1.5 : 3.5);
      garantirEspaco(e(16) + 6);
      /* A parte em inglês (*...*) sai numa linha abaixo, em itálico e letra 12
         (ex.: Testes da Bateria do CERAD e, embaixo, "(Consortium to Establish...)"). */
      const portugues = String(texto).replace(/\*[^*]+\*/g, " ").replace(/\s+/g, " ").trim();
      const ingles = (String(texto).match(/\*[^*]+\*/g) || []).map(function (m) { return m.slice(1, -1); }).join(" ");
      doc.setFont("helvetica", "bold");
      /* tamanho: subtítulo com letra própria (padrão 13). */
      doc.setFontSize(tamanho || TAMANHO_SUBTITULO);
      cor(COR.escuro);
      y += textoCentralizado(quebrarLinhas(textoPdf(portugues).toUpperCase(), util, 0), 6, 0);
      if (ingles) {
        y += 5.4;
        doc.setFont("helvetica", "bolditalic");
        doc.setFontSize(TAMANHO_TEXTO);
        y += textoCentralizado(quebrarLinhas(textoPdf(ingles).toUpperCase(), util, 0), 5.2, 0);
      }
      y += menor ? 4.2 : 5 + g(2);
    }

    function paragrafo(texto, estilo, rgb, tamanho) {
      const tamanhoFonte = (tamanho || TAMANHO_TEXTO) * k;
      const passoTexto = e((tamanho || TAMANHO_TEXTO) * 0.47);
      if (temMarcas(texto)) {
        linhasRicas(texto, util, estilo, tamanhoFonte).forEach(function (linha) {
          garantirEspaco(passoTexto + 1);
          desenharLinhaRica(linha, margem, y, estilo, tamanhoFonte, rgb || COR.tinta);
          y += passoTexto;
        });
        return;
      }
      fonte(estilo, rgb, tamanho);
      const linhasTexto = doc.splitTextToSize(textoPdf(texto), util);
      linhasTexto.forEach(function (linhaTexto) {
        garantirEspaco(passoTexto + 1);
        doc.text(linhaTexto, margem, y);
        y += passoTexto;
      });
    }

    /* Rótulo em negrito e o texto logo abaixo, sem borda. "compacto" usa espaços menores. */
    function caixaTexto(rotulo, valor, compacto) {
      const passoTexto = e(compacto ? 5.3 : PASSO_LINHA);
      fonte("normal");
      const texto = doc.splitTextToSize(textoPdf(valor || "Não informado"), util);

      garantirEspaco(e(compacto ? 14 : 18));
      /* Sem rótulo (ex.: comentário do RAVLT), só o texto. */
      if (rotulo) {
        fonte("bold", COR.escuro);
        doc.text(textoPdf(rotulo), margem, y);
        y += e(compacto ? 5.6 : 6.2);
      }

      let inicio = 0;
      while (inicio < texto.length) {
        const cabem = Math.max(1, Math.floor((limite - y) / passoTexto) + 1);
        const trecho = texto.slice(inicio, inicio + cabem);
        fonte(valor ? "normal" : "italic", valor ? COR.tinta : COR.suave);
        trecho.forEach(function (linhaTexto, i) {
          doc.text(linhaTexto, margem, y + i * passoTexto);
        });
        inicio += trecho.length;
        y += (trecho.length - 1) * passoTexto;
        if (inicio < texto.length) novaPagina();
      }
      y += e(2.5) + g(compacto ? 4 : 5.5);
    }

    /* Caixas de resultado lado a lado; a última ocupa o resto e quebra linha se preciso.
       Uma caixa sozinha fica só do tamanho do conteúdo. */
    function caixas(lista) {
      const espaco = 4;
      const ultima = lista.length > 1 ? lista.length - 1 : -1;
      const larguras = lista.map(function (caixa, i) {
        if (i === ultima) return 0;
        fonte("bold");
        const valor = doc.getTextWidth(textoPdf(caixa[1]));
        fonte("normal");
        const rotulo = textoPdf(caixa[0]).toUpperCase();
        const larguraRotulo = doc.getTextWidth(rotulo) + rotulo.length * 0.3;
        return Math.max(34, valor + 12, larguraRotulo + 10);
      });
      let linhasUltima = [""];
      if (ultima !== -1) {
        const usadas = larguras.reduce(function (a, b) { return a + b; }, 0) + espaco * ultima;
        larguras[ultima] = util - usadas;
        fonte("bold");
        linhasUltima = doc.splitTextToSize(textoPdf(lista[ultima][1]), larguras[ultima] - 8);
      }
      const alturaCaixa = e(11.5 + linhasUltima.length * PASSO_LINHA);
      garantirEspaco(alturaCaixa + depoisDeBloco());
      let x = margem;
      lista.forEach(function (caixa, i) {
        borda(x, y, larguras[i], alturaCaixa);
        fonte("normal", COR.suave);
        doc.text(textoPdf(caixa[0]).toUpperCase(), x + 4, y + e(6.5), { charSpace: 0.3 });
        fonte("bold");
        if (i === ultima) {
          doc.text(linhasUltima, x + 4, y + e(13), { lineHeightFactor: 1.3 });
        } else {
          doc.text(textoPdf(caixa[1]), x + 4, y + e(13));
        }
        x += larguras[i] + espaco;
      });
      y += alturaCaixa + depoisDeBloco();
    }

    function tabela(bloco) {
      const colunas = bloco.cabecalho.length;
      const corpo = bloco.linhas.map(function (linha) {
        if (linha.grupo) {
          return [{
            content: textoPdf(linha.grupo),
            colSpan: colunas,
            styles: { fontStyle: "bold", textColor: COR.escuro, halign: "left" }
          }];
        }
        const estilo = linha.destaque ? { fontStyle: "bold" }
          : linha.suave ? { fontStyle: "italic", textColor: COR.suave } : null;
        return celulasDe(linha).map(function (valor) {
          /* Com marcas (inglês, sublinhado, ≥): a tabela mede o texto simples e o texto
             com as marcas é desenhado por cima (didDrawCell). */
          /* Com trecho em negrito (**...**), a tabela mede o texto todo em negrito, para a
             célula ficar alta o bastante; o desenho usa a letra normal fora do negrito. */
          if (temMarcas(valor)) {
            const negrito = /\*\*[^*]+\*\*/.test(String(valor));
            const estiloCelula = Object.assign({}, estilo || {}, negrito ? { fontStyle: "bold" } : {});
            return { content: textoPdf(semMarcas(valor)), rico: String(valor), base: estilo && estilo.fontStyle, styles: estiloCelula };
          }
          const texto = textoPdf(valor);
          return estilo ? { content: texto, styles: estilo } : texto;
        });
      });

      /* As colunas de valores (depois da primeira) nunca ficam mais estreitas que o próprio
         conteúdo: um texto comprido na primeira coluna (ex.: comentário sem espaços) quebra
         linha em vez de espremer o Escore. */
      const estilosColunas = Object.assign({}, bloco.estilos || {});
      if (colunas > 1) {
        for (let i = 1; i < colunas; i++) {
          const proprio = estilosColunas[i] || {};
          if (proprio.cellWidth) continue;
          doc.setFontSize(e(TAMANHO_TEXTO));
          doc.setFont("helvetica", "bold");
          let largura = doc.getTextWidth(textoPdf(semMarcas(bloco.cabecalho[i] || "")));
          bloco.linhas.forEach(function (linha) {
            if (linha.grupo) return;
            String(textoPdf(semMarcas(celulasDe(linha)[i] || ""))).split("\n").forEach(function (parte) {
              largura = Math.max(largura, doc.getTextWidth(parte));
            });
          });
          estilosColunas[i] = Object.assign({}, proprio, { minCellWidth: Math.max(proprio.minCellWidth || 0, largura + 5.5) });
        }
      }

      garantirEspaco(e(16));
      doc.autoTable({
        startY: y,
        margin: { left: margem, right: margem, top: 16, bottom: altura - limite },
        /* O cabeçalho segue o alinhamento da coluna (ex.: Pontos centralizado). */
        head: [bloco.cabecalho.map(function (titulo, i) {
          const alinhamento = bloco.estilos && bloco.estilos[i] && bloco.estilos[i].halign;
          return alinhamento ? { content: textoPdf(titulo), styles: { halign: alinhamento } } : textoPdf(titulo);
        })],
        body: corpo,
        theme: "plain",
        rowPageBreak: "avoid",
        styles: {
          font: "helvetica",
          fontSize: e(TAMANHO_TEXTO),
          textColor: COR.tinta,
          cellPadding: { top: g(1.8 * espacamento), bottom: g(1.8 * espacamento), left: 2.5, right: 2.5 },
          lineColor: COR.linha,
          lineWidth: { bottom: 0.2 },
          valign: "middle"
        },
        /* Linha cinza embaixo dos títulos das colunas e linha preta no fim da tabela,
           separando uma escala da outra. */
        headStyles: {
          fontStyle: "bold",
          fontSize: e(TAMANHO_TEXTO),
          textColor: COR.suave,
          lineWidth: { bottom: 0.4 },
          lineColor: COR.divisoria
        },
        didParseCell: function (data) {
          /* Na última tabela da aba (ex.: Resumo, legenda do Pfeffer) não há escala depois:
             o fim fica com a linha cinza-clara das outras linhas. */
          if (data.section === "body" && data.row.index === corpo.length - 1 && !bloco.ultimoDaAba) {
            data.cell.styles.lineColor = COR.escuro;
            data.cell.styles.lineWidth = { bottom: 0.4 };
          }
        },
        columnStyles: estilosColunas,
        didDrawPage: faixaTopo,
        willDrawCell: function (data) {
          if (data.cell.raw && data.cell.raw.rico) data.cell.text = [""];
        },
        didDrawCell: function (data) {
          const cell = data.cell;
          if (!cell.raw || !cell.raw.rico) return;
          const tamanho = cell.styles.fontSize;
          const base = /\*\*[^*]+\*\*/.test(cell.raw.rico) ? cell.raw.base || "normal" : cell.styles.fontStyle;
          const rgb = Array.isArray(cell.styles.textColor) ? cell.styles.textColor
            : [cell.styles.textColor, cell.styles.textColor, cell.styles.textColor];
          const linhasCelula = linhasRicas(cell.raw.rico, cell.width - cell.padding("left") - cell.padding("right"), base, tamanho);
          /* Mesma posição que a tabela usaria para o texto (centro vertical da célula). */
          const pos = cell.getTextPos();
          const l = emMm(tamanho);
          const a = l * doc.getLineHeightFactor();
          const topo = pos.y + l * (2 - 1.15) - linhasCelula.length / 2 * a;
          linhasCelula.forEach(function (linha, i) {
            const w = larguraLinhaRica(linha);
            const x = cell.styles.halign === "center" ? pos.x - w / 2 : cell.styles.halign === "right" ? pos.x - w : pos.x;
            desenharLinhaRica(linha, x, topo + i * a, base, tamanho, rgb);
          });
        }
      });
      y = doc.lastAutoTable.finalY + depoisDeBloco();
    }

    /* Lista em tópicos. Com preencherFolha, os itens se espalham para ocupar a folha toda. */
    function lista(itens, preencherFolha) {
      fonte("normal");
      const quebras = itens.map(function (item) {
        if (temMarcas(item)) return { ricas: linhasRicas(item, util - 6, "normal", TAMANHO_TEXTO * k), length: 0 };
        return doc.splitTextToSize(textoPdf(item), util - 6);
      });
      quebras.forEach(function (q) { if (q.ricas) q.length = q.ricas.length; });
      const linhasTotal = quebras.reduce(function (t, l) { return t + l.length; }, 0);
      let folga = e(0.8);
      if (preencherFolha) {
        const sobra = limite - y - e(6) - linhasTotal * passo();
        folga = Math.min(e(14), Math.max(folga, sobra / Math.max(1, itens.length)));
      } else {
        folga = g(0.8);
      }
      quebras.forEach(function (linhasItem) {
        fonte("normal");
        garantirEspaco(linhasItem.length * passo() + 1);
        doc.text("•", margem + 1, y);
        if (linhasItem.ricas) {
          linhasItem.ricas.forEach(function (linha, i) {
            desenharLinhaRica(linha, margem + 6, y + i * passo(), "normal", TAMANHO_TEXTO * k, COR.tinta);
          });
        } else {
          doc.text(linhasItem, margem + 6, y, { lineHeightFactor: 1.32 });
        }
        y += linhasItem.length * passo() + folga;
      });
      y += g(4);
    }

    /* Escala de Katz como a folha de papel: cada área com as descrições e um círculo;
       o da descrição assinalada sai preenchido. */
    function tituloArea(texto) {
      const i = texto.indexOf(" (");
      return i === -1 ? texto.toUpperCase() : texto.slice(0, i).toUpperCase() + texto.slice(i);
    }

    function escolhas(bloco) {
      if (bloco.introducao) {
        paragrafo(bloco.introducao, "bold", COR.tinta);
        y += g(3);
      }
      const passoItem = e(5.4);
      bloco.itens.forEach(function (item) {
        fonte("bold");
        const titulo = doc.splitTextToSize(textoPdf(item.numero + " - " + tituloArea(item.titulo)), util);
        fonte("normal");
        const opcoes = item.opcoes.map(function (texto) {
          return doc.splitTextToSize(textoPdf(texto), util - 10);
        });
        const alturaItem = titulo.length * passoItem + g(1.8) + opcoes.reduce(function (total, linhasOpcao) {
          return total + linhasOpcao.length * passoItem + g(1.6);
        }, 0) + e(2.4) + g(0.8);
        garantirEspaco(alturaItem);

        fonte("bold", COR.escuro);
        doc.text(titulo, margem, y, { lineHeightFactor: 1.27 });
        y += titulo.length * passoItem + g(1.8);
        let ultimaLinha = y;
        opcoes.forEach(function (linhasOpcao, j) {
          const cx = margem + 4;
          const cy = y - e(1.4);
          cor(COR.escuro, "draw");
          doc.setLineWidth(0.3);
          doc.circle(cx, cy, e(1.7), "S");
          if (j === item.marcada) {
            cor(COR.escuro, "fill");
            doc.circle(cx, cy, e(0.95), "F");
          }
          fonte("normal");
          doc.text(linhasOpcao, margem + 9, y, { lineHeightFactor: 1.27 });
          ultimaLinha = y + (linhasOpcao.length - 1) * passoItem;
          y += linhasOpcao.length * passoItem + g(1.6);
        });
        /* Linha mais escura entre as questões, sem encostar no texto de cima nem no de baixo. */
        const linhaY = ultimaLinha + e(2.4) + g(0.8);
        cor(COR.divisoria, "draw");
        doc.setLineWidth(0.35);
        doc.line(margem, linhaY, margem + util, linhaY);
        y = linhaY + e(5) + g(1);
      });
      y += g(2);
    }

    /* "ESCORE DO PACIENTE: 3" no fim das questões (Escala de Katz). */
    function escore(bloco) {
      garantirEspaco(passo() + depoisDeBloco());
      y += g(1);
      fonte("bold", COR.escuro);
      if (bloco.alinharTitulo) {
        /* Termina junto com a linha cinza embaixo do título (IQCODE). */
        doc.text(textoPdf(bloco.rotulo).toUpperCase() + ": " + textoPdf(bloco.valor), margem + util, y, { align: "right" });
      } else {
        /* Alinhado à direita da folha. */
        doc.text(textoPdf(bloco.rotulo).toUpperCase() + ": " + textoPdf(bloco.valor), DIREITA_VALORES, y, { align: "right" });
      }
      y += depoisDeBloco() + g(2);
    }

    function imagem(bloco) {
      /* Com a letra maior, a imagem não passa da largura da folha. */
      const w = Math.min(util, e(bloco.largura));
      const h = w * bloco.altura / bloco.largura;
      garantirEspaco(h + (bloco.titulo ? 10 : 0) + e(4));
      if (bloco.titulo) {
        /* Título do gráfico (ex.: Curva de Aprendizagem): como os subtítulos. */
        doc.setFont("helvetica", "bold");
        doc.setFontSize(TAMANHO_SUBTITULO);
        cor(COR.escuro);
        doc.text(textoPdf(bloco.titulo).toUpperCase(), meio, y, { align: "center" });
        y += 5;
      }
      const x = margem + (util - w) / 2;
      doc.addImage(bloco.imagem, "PNG", x, y, w, h);
      if (bloco.borda) borda(x, y, w, h);
      y += h + depoisDeBloco();
    }

    /* Local com espaço para o dia, o mês e o ano, e as assinaturas no fim da folha. */
    function assinaturas(bloco) {
      const pessoas = bloco.pessoas || [];
      const alturaLocal = bloco.local ? e(14) : 0;
      const alturaAssinaturas = pessoas.length ? e(36) : 0;
      const alturaTotal = alturaLocal + alturaAssinaturas;
      garantirEspaco(alturaTotal + e(6));
      y = Math.max(y + e(6), limite - alturaTotal);
      if (bloco.local) {
        fonte("normal");
        doc.text(textoPdf(bloco.local) + ", _______ de ________________________ de __________.", margem, y);
        y += alturaLocal;
      }
      if (!pessoas.length) return;
      fonte("normal");
      doc.text("Atenciosamente,", margem, y);
      y += e(22);
      const coluna = util / pessoas.length;
      pessoas.forEach(function (pessoa, i) {
        const centro = margem + coluna * i + coluna / 2;
        const meia = Math.min(34, coluna / 2 - 6);
        cor(COR.tinta, "draw");
        doc.setLineWidth(0.3);
        doc.line(centro - meia, y, centro + meia, y);
        fonte("bold");
        doc.text(textoPdf(pessoa.nome), centro, y + e(5.5), { align: "center" });
        fonte("normal", COR.suave);
        doc.text(textoPdf(pessoa.registro), centro, y + e(11), { align: "center" });
      });
      y += e(14);
    }

    function desenharBloco(bloco) {
      switch (bloco.tipo) {
        case "caixas": caixas(bloco.caixas); break;
        case "tabela": tabela(bloco); break;
        case "texto": caixaTexto(bloco.rotulo, bloco.texto); break;
        case "lista": lista(bloco.itens, bloco.preencherFolha); break;
        case "escolhas": escolhas(bloco); break;
        case "escore": escore(bloco); break;
        case "imagem": imagem(bloco); break;
        case "assinaturas": assinaturas(bloco); break;
        case "subtitulo":
          subtitulo(bloco.texto, bloco.menor, bloco.tamanho);
          break;
        case "paragrafo":
          /* tamanho: letra menor (ex.: 10); cinza: texto explicativo em cinza. */
          paragrafo(bloco.texto, bloco.negrito ? "bold" : "normal", bloco.cinza ? COR.suave : COR.tinta, bloco.tamanho);
          y += g(bloco.tamanho ? 3 : 4);
          break;
        case "nota":
          paragrafo(bloco.texto, "normal", COR.suave);
          y += g(5);
          break;
        case "referencia": {
          /* Referência bibliográfica (ex.: fim da Escala de Katz): sempre letra 9, em negrito,
             mesmo quando a folha encolhe para caber. */
          y += g(2);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(TAMANHO_REFERENCIA);
          cor(COR.suave);
          const linhasReferencia = doc.splitTextToSize(textoPdf(bloco.texto), util);
          const passoReferencia = TAMANHO_REFERENCIA * 0.47;
          linhasReferencia.forEach(function (linhaTexto) {
            garantirEspaco(passoReferencia + 1);
            doc.text(linhaTexto, margem, y);
            y += passoReferencia;
          });
          y += g(3);
          break;
        }
        case "legenda":
          /* Uma linha por item; os títulos (terminados em ":") em negrito. */
          y += g(2);
          bloco.texto.split("\n").forEach(function (linha) {
            if (!linha) {
              y += g(1.5);
              return;
            }
            paragrafo(linha, /:$/.test(linha) ? "bold" : "normal", COR.tinta);
          });
          y += g(4);
          break;
      }
    }

    /* Primeira folha: cabeçalho, paciente, identificação e informações clínicas. */
    function folhaDados() {
      /* Cabeçalho: título centralizado (14). */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(TAMANHO_TITULO);
      cor(COR.escuro);
      y = 15;
      textoCentralizado([TITULO.toUpperCase()], 0, 0.3);

      /* Paciente: nome, idade e nascimento. O nome sai inteiro, como foi digitado: se não
         couber na linha, quebra e o cartão cresce. */
      y = 21;
      fonte("normal", COR.suave);
      const xNome = margem + 4 + doc.getTextWidth("Paciente:") + 3;
      const resumo = [
        dados["Idade"] ? "Idade: " + dados["Idade"] : "",
        dados["Data de Nascimento"] ? "Nascimento: " + dados["Data de Nascimento"] : ""
      ].filter(Boolean).join("   •   ");
      const larguraResumo = resumo ? doc.getTextWidth(resumo) + 6 : 0;
      fonte("bold");
      const nome = doc.splitTextToSize(textoPdf(dados["Nome"] || "—"),
        Math.max(30, margem + util - 4 - larguraResumo - xNome));
      const linhaNome = e(5.3);
      const alturaCartao = e(12) + (nome.length - 1) * linhaNome;
      borda(margem, y, util, alturaCartao);
      doc.text(nome, xNome, y + e(7.8), { lineHeightFactor: linhaNome / (doc.getFontSize() * 25.4 / 72) });
      fonte("normal", COR.suave);
      doc.text("Paciente:", margem + 4, y + e(7.8));
      if (resumo) doc.text(resumo, margem + util - 4, y + e(7.8), { align: "right" });
      y += alturaCartao + g(7);

      /* Identificação em três colunas por linha; os campos largos (Endereço) ocupam a linha toda. */
      tituloSecao("Identificação");
      const identificacao = linhas.filter(function (linha) {
        return EXIBIDOS_NO_TOPO.indexOf(linha[0]) === -1 && CAMPOS_TEXTO.indexOf(linha[0]) === -1;
      });
      const porLinha = 3;
      const coluna = (util - 6 * (porLinha - 1)) / porLinha;
      const estreitos = identificacao.filter(function (linha) { return CAMPOS_LARGOS.indexOf(linha[0]) === -1; });
      const grupos = [];
      for (let i = 0; i < estreitos.length; i += porLinha) grupos.push(estreitos.slice(i, i + porLinha));
      identificacao.forEach(function (linha) {
        if (CAMPOS_LARGOS.indexOf(linha[0]) !== -1) grupos.push([linha]);
      });
      grupos.forEach(function (linhasGrupo) {
        const largo = linhasGrupo.length === 1 && CAMPOS_LARGOS.indexOf(linhasGrupo[0][0]) !== -1;
        const larguraCampo = largo ? util : coluna;
        const grupo = linhasGrupo.map(function (linha) {
          fonte("normal");
          const valor = doc.splitTextToSize(textoPdf(linha[1] || "—"), larguraCampo);
          const rotulo = doc.splitTextToSize(primeiraMaiuscula(linha[0]), larguraCampo);
          return { rotulo: rotulo, valor: valor };
        });
        const linhasRotulo = Math.max.apply(null, grupo.map(function (c) { return c.rotulo.length; }));
        const linhasTexto = Math.max.apply(null, grupo.map(function (c) { return c.valor.length; }));
        const alturaRotulo = e(5.4) * linhasRotulo;
        const alturaLinha = alturaRotulo + e(linhasTexto * 5.3) + g(3);
        garantirEspaco(alturaLinha);
        grupo.forEach(function (campo, j) {
          const x = margem + j * (coluna + 6);
          fonte("normal", COR.suave);
          doc.text(campo.rotulo, x, y, { lineHeightFactor: 1.27 });
          fonte("normal", campo.valor[0] === "—" ? COR.suave : COR.tinta);
          doc.text(campo.valor, x, y + alturaRotulo, { lineHeightFactor: 1.25 });
        });
        y += alturaLinha;
      });
      y += g(3);

      /* Informações clínicas em blocos de texto compactos */
      tituloSecao("Informações clínicas");
      CAMPOS_TEXTO.forEach(function (rotulo) {
        caixaTexto(rotulo, dados[rotulo], true);
      });
    }

    /* Desenha uma folha com a letra "escala" e os espaços "espacos".
       Com apagar, desenha só para medir: apaga e diz se coube numa página. */
    function desenharFolha(desenhar, escala, espacos, apagar) {
      k = escala;
      c = espacos;
      const antes = doc.getNumberOfPages();
      novaPagina();
      desenhar();
      const depois = doc.getNumberOfPages();
      if (apagar) {
        for (let p = depois; p > antes; p--) doc.deletePage(p);
      }
      return depois === antes + 1;
    }

    /* Cada aba numa folha só, com a maior letra que couber (no máximo 12): primeiro acha
       a letra (com os espaços mais apertados), depois devolve o máximo de espaço possível. */
    function folhaUnica(desenhar) {
      const apertado = ESPACOS[ESPACOS.length - 1];
      const cabe = function (escala, espacos) {
        return desenharFolha(desenhar, escala, espacos, true);
      };
      let escala = ESCALA_INICIAL;
      while (escala > ESCALA_MINIMA && !cabe(escala, apertado)) {
        escala = Math.max(ESCALA_MINIMA, Math.round((escala - PASSO_ESCALA) * 1000) / 1000);
      }
      /* Meio degrau acima, para aproveitar o branco que sobra no fim da folha. */
      const meioDegrau = Math.round((escala + PASSO_ESCALA / 2) * 1000) / 1000;
      if (escala < ESCALA_INICIAL && cabe(meioDegrau, apertado)) escala = meioDegrau;
      let espacos = apertado;
      for (let i = 0; i < ESPACOS.length - 1; i++) {
        if (cabe(escala, ESPACOS[i])) {
          espacos = ESPACOS[i];
          break;
        }
      }
      desenharFolha(desenhar, escala, espacos, false);
      k = 1;
      c = 1;
    }

    /* Monta as folhas: uma etapa com juntarCom sai na mesma folha da etapa indicada
       (ex.: Resumo junto com os dados do paciente; Trilhas junto com Memória verbal e visual). */
    const folhas = [{ ids: ["dados"], partes: [{ dados: true }] }];
    (secoes || []).forEach(function (secao) {
      /* Um bloco "quebraFolha" leva o resto da aba para outra folha, sem repetir o título
         (ex.: a curva de aprendizagem do RAVLT). Pedaços vazios são ignorados. */
      const pedacos = [[]];
      secao.blocos.forEach(function (bloco) {
        if (bloco.tipo === "quebraFolha") pedacos.push([]);
        else pedacos[pedacos.length - 1].push(bloco);
      });
      const cheios = pedacos.filter(function (p) { return p.length; });
      if (!cheios.length) return;

      const anterior = folhas[folhas.length - 1];
      /* juntarCom: uma aba ou uma lista (ex.: GDS junta com a GAI; se a GAI não sair, a GDS
         abre a folha e as seguintes juntam com ela). */
      const juntar = [].concat(secao.juntarCom || []);
      if (juntar.some(function (id) { return anterior.ids.indexOf(id) !== -1; })) {
        anterior.ids.push(secao.id);
        anterior.partes.push({ secao: secao, blocos: cheios[0], junto: true });
      } else {
        folhas.push({ ids: [secao.id], partes: [{ secao: secao, blocos: cheios[0], junto: false }] });
      }
      cheios.slice(1).forEach(function (blocos) {
        folhas.push({ ids: [secao.id], partes: [{ secao: secao, blocos: blocos, continuacao: true }] });
      });
    });

    /* Impressão de páginas escolhidas sem os dados do paciente: a folha dos dados perde
       essa parte (o Resumo, que sai junto com ela, passa a abrir a folha). */
    if (opcoes && opcoes.semDados) {
      folhas[0].partes = folhas[0].partes.filter(function (parte) { return !parte.dados; });
      if (folhas[0].partes.length) folhas[0].partes[0] = Object.assign({}, folhas[0].partes[0], { junto: false });
      else folhas.shift();
    }

    folhas.forEach(function (folha) {
      /* Etapa com variasFolhas (Conclusão): letra normal, e o que não couber continua na
         folha seguinte. As outras: uma folha só, diminuindo a letra se preciso. */
      const variasFolhas = folha.partes.some(function (parte) { return parte.secao && parte.secao.variasFolhas; });
      const desenharEm = variasFolhas
        ? function (desenhar) { desenharFolha(desenhar, ESCALA_INICIAL, 1, false); k = 1; c = 1; }
        : folhaUnica;
      desenharEm(function () {
        folha.partes.forEach(function (parte) {
          if (parte.dados) {
            folhaDados();
            return;
          }
          /* Junto de outra etapa, sai sem o título próprio quando os subtítulos bastam
             (ex.: Atenção, da aba Trilhas, na folha da Memória verbal e visual). */
          const comSubtitulos = parte.secao.semTituloJunto || parte.blocos.some(function (b) { return b.soJunto; });
          espacamento = parte.secao.espacamento || 1;
          /* espacoAntes: folga maior, em mm (ex.: IQCODE no fim da folha do MoCA). */
          if (parte.junto) y += parte.secao.espacoAntes || g(4);
          if (!parte.continuacao && (!parte.junto || !comSubtitulos)) {
            tituloSecao(parte.secao.titulo, parte.secao.tamanhoTituloIngles);
            if (parte.secao.subtitulo) subtituloSecao(parte.secao.subtitulo);
          }
          parte.blocos.forEach(function (bloco, i) {
            if (bloco.soJunto && !parte.junto) return;
            if (bloco.tipo === "tabela" && i === parte.blocos.length - 1) bloco = Object.assign({}, bloco, { ultimoDaAba: true });
            desenharBloco(bloco);
          });
          espacamento = 1;
        });
      });
    });
    /* A primeira página criada pelo jsPDF fica em branco: as folhas começam na segunda.
       Não há rodapé nem numeração das páginas. */
    doc.deletePage(1);

    /* O título do PDF é o nome do arquivo: na impressão (que abre numa aba, sem baixar),
       o navegador usa ele como nome ao salvar ("Maria da Silva - 30-10-2026 - Pendente"). */
    const arquivo = nomeArquivo(nomePaciente, "pdf", opcoes && opcoes.situacao);
    doc.setProperties({ title: arquivo.replace(/\.pdf$/, "") });
    doc.viewerPreferences({ DisplayDocTitle: true });

    if (opcoes && opcoes.imprimir) {
      doc.autoPrint();
      return doc.output("bloburl");
    }
    doc.save(arquivo);
    return null;
  }

  /* ---------- Excel ---------- */

  const COLUNAS_EXCEL = 5;

  function alturaLinha(texto, caracteresPorLinha) {
    const linhas = String(texto || "").split("\n").reduce(function (total, trecho) {
      return total + Math.max(1, Math.ceil(trecho.length / caracteresPorLinha));
    }, 0);
    return Math.max(21, linhas * 15 + 6);
  }

  async function gerarExcel(linhas, nomePaciente, secoes) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = TITULO;

    const sheet = workbook.addWorksheet("Avaliação", {
      pageSetup: {
        paperSize: 9,
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true
      }
    });

    sheet.columns = [{ width: 42 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }];

    const borda = { style: "thin", color: { argb: "FF3C3C3C" } };
    const bordas = { top: borda, left: borda, bottom: borda, right: borda };

    function estilizar(row, negrito) {
      row.eachCell({ includeEmpty: true }, function (cell) {
        cell.border = bordas;
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.font = { name: "Calibri", size: 11, bold: !!negrito };
      });
    }

    /* Linha com o texto ocupando todas as colunas a partir de "inicio". */
    function linhaMesclada(valores, inicio, negrito, caracteres) {
      const conteudo = valores.slice();
      while (conteudo.length < COLUNAS_EXCEL) conteudo.push("");
      const row = sheet.addRow(conteudo);
      if (inicio < COLUNAS_EXCEL) sheet.mergeCells(row.number, inicio, row.number, COLUNAS_EXCEL);
      row.height = alturaLinha(valores[valores.length - 1], caracteres || 100);
      estilizar(row, negrito);
      return row;
    }

    function titulo(texto, tamanho) {
      const row = linhaMesclada([texto], 1, true);
      row.height = tamanho > 12 ? 30 : 24;
      row.getCell(1).font = { name: "Calibri", size: tamanho, bold: true };
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    }

    function campo(rotulo, valor, negrito) {
      const row = linhaMesclada([rotulo, valor], 2, negrito, 80);
      row.getCell(1).font = { name: "Calibri", size: 11, bold: true };
    }

    function blocoExcel(bloco) {
      switch (bloco.tipo) {
        case "caixas":
          bloco.caixas.forEach(function (c) { campo(c[0], c[1], true); });
          break;
        case "texto":
          campo(bloco.rotulo, bloco.texto);
          break;
        case "paragrafo":
        case "nota":
        case "referencia":
        case "legenda":
          linhaMesclada([bloco.texto], 1, !!bloco.negrito, 130);
          break;
        case "subtitulo":
          linhaMesclada([bloco.texto], 1, true);
          break;
        case "lista":
          bloco.itens.forEach(function (item) { linhaMesclada(["• " + item], 1, false, 130); });
          break;
        case "escolhas":
          if (bloco.introducao) linhaMesclada([bloco.introducao], 1, true, 130);
          bloco.itens.forEach(function (item) {
            linhaMesclada([item.numero + " - " + item.titulo], 1, true, 130);
            item.opcoes.forEach(function (texto, j) {
              linhaMesclada([(j === item.marcada ? "(X) " : "(   ) ") + texto], 1, false, 130);
            });
          });
          break;
        case "tabela": {
          const total = bloco.cabecalho.length;
          const ajustar = function (valores, negrito) {
            const conteudo = valores.map(function (v) { return v === null || v === undefined ? "" : v; });
            if (total <= COLUNAS_EXCEL) {
              const row = linhaMesclada(conteudo, total, negrito, 40);
              row.height = alturaLinha(conteudo[0] || conteudo[1], 40);
              return row;
            }
            const row = sheet.addRow(conteudo);
            estilizar(row, negrito);
            return row;
          };
          ajustar(bloco.cabecalho, true);
          bloco.linhas.forEach(function (linha) {
            if (linha.grupo) linhaMesclada([linha.grupo], 1, true);
            else ajustar(celulasDe(linha), !!linha.destaque);
          });
          break;
        }
        case "imagem":
          adicionarImagem(bloco.imagem, 520, Math.round(520 * bloco.altura / bloco.largura));
          break;
        case "escore":
          campo(bloco.rotulo, bloco.valor, true);
          break;
        case "assinaturas":
          if (bloco.local) linhaMesclada([bloco.local + ", ____ de ______________ de ______."], 1, false);
          linhaMesclada(["Atenciosamente,"], 1, false);
          bloco.pessoas.forEach(function (p) { campo(p.nome, p.registro); });
          break;
      }
    }

    function adicionarImagem(base64, w, h) {
      const row = linhaMesclada([""], 1, false);
      row.height = h * 0.78;
      const id = workbook.addImage({ base64: base64, extension: "png" });
      sheet.addImage(id, { tl: { col: 0.1, row: row.number - 1 + 0.05 }, ext: { width: w, height: h } });
    }

    titulo(TITULO, 16);
    linhas.forEach(function (linha) { campo(linha[0], linha[1]); });

    (secoes || []).forEach(function (secao) {
      sheet.addRow([]).height = 10;
      titulo(secao.titulo, 13);
      if (secao.subtitulo) titulo(secao.subtitulo, 12);
      secao.blocos.forEach(blocoExcel);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    baixar(blob, nomeArquivo(nomePaciente, "xlsx"));
  }

  /* ---------- Backup (.json) ---------- */

  const TIPO_BACKUP = "avaliacao-neuropsicologica";

  function gerarBackup(campos, nomePaciente, situacao) {
    const conteudo = {
      tipo: TIPO_BACKUP,
      versao: 2,
      geradoEm: new Date().toISOString(),
      campos: campos
    };
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: "application/json" });
    baixar(blob, nomeArquivo(nomePaciente, "json", situacao));
  }

  /* Devolve os campos do backup ou lança erro se o arquivo não for válido. */
  function lerBackup(texto) {
    let conteudo;
    try {
      conteudo = JSON.parse(texto);
    } catch (erro) {
      throw new Error("O arquivo não é um JSON válido.");
    }
    if (!conteudo || conteudo.tipo !== TIPO_BACKUP || typeof conteudo.campos !== "object") {
      throw new Error("Este arquivo não é um backup da avaliação neuropsicológica.");
    }
    return conteudo.campos;
  }

  return {
    gerarPdf: gerarPdf,
    gerarExcel: gerarExcel,
    gerarBackup: gerarBackup,
    lerBackup: lerBackup
  };
})();
