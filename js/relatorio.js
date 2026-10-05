/* Geração do relatório em PDF (jsPDF + AutoTable) e Excel (ExcelJS).
   Cada etapa entrega uma lista de blocos ({ tipo, ... }) e aqui eles viram páginas. */

const Relatorio = (function () {
  const TITULO = "Avaliação Neuropsicológica";

  function nomeArquivo(nome, extensao) {
    const base = (nome || "paciente")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return "avaliacao-neuropsicologica-" + (base || "paciente") + "." + extensao;
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

  /* A fonte padrão do PDF não tem alguns símbolos. */
  function textoPdf(texto) {
    return String(texto === null || texto === undefined ? "" : texto)
      .replace(/≥/g, ">=")
      .replace(/≤/g, "<=")
      .replace(/▪/g, "•");
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
    linha: [214, 214, 214]
  };

  const CAMPOS_TEXTO = [
    "Informante",
    "Medicamentos em Uso",
    "História Patológica",
    "História Familiar",
    "Avaliações"
  ];

  /* Já aparecem no cabeçalho e no cartão do paciente. */
  const EXIBIDOS_NO_TOPO = ["Nome", "Idade", "Data de Nascimento", "Data da Avaliação"];

  function gerarPdf(linhas, nomePaciente, secoes) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    const margem = 18;
    const util = largura - margem * 2;
    const limite = altura - 20;
    const alturaTexto = 4.9;
    const dados = {};
    linhas.forEach(function (linha) { dados[linha[0]] = linha[1]; });
    let y = 0;

    function cor(rgb, tipo) {
      if (tipo === "fill") doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      else if (tipo === "draw") doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      else doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    }

    function fonte(tamanho, estilo, rgb) {
      doc.setFont("helvetica", estilo || "normal");
      doc.setFontSize(tamanho);
      cor(rgb || COR.tinta);
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

    function tituloSecao(texto) {
      garantirEspaco(24);
      fonte(10, "bold", COR.escuro);
      doc.text(textoPdf(texto).toUpperCase(), margem, y, { charSpace: 0.4 });
      cor(COR.linha, "draw");
      doc.setLineWidth(0.3);
      doc.line(margem, y + 2.5, margem + util, y + 2.5);
      y += 9;
    }

    /* Texto corrido que pode continuar na página seguinte. */
    function paragrafo(texto, tamanho, estilo, rgb, largura) {
      fonte(tamanho, estilo, rgb);
      const linhasTexto = doc.splitTextToSize(textoPdf(texto), largura || util);
      const passo = tamanho * 0.47;
      linhasTexto.forEach(function (linhaTexto) {
        garantirEspaco(passo + 1);
        doc.text(linhaTexto, margem, y);
        y += passo;
      });
    }

    /* Rótulo em negrito + caixa com borda (sem fundo), dividida entre páginas se preciso. */
    function caixaTexto(rotulo, valor) {
      fonte(10, "normal");
      const texto = doc.splitTextToSize(textoPdf(valor || "Não informado"), util - 10);

      garantirEspaco(18);
      fonte(9.5, "bold", COR.escuro);
      doc.text(textoPdf(rotulo), margem, y);
      y += 3;

      let inicio = 0;
      while (inicio < texto.length) {
        const cabem = Math.max(1, Math.floor((limite - y - 8) / alturaTexto));
        const trecho = texto.slice(inicio, inicio + cabem);
        const alturaBloco = trecho.length * alturaTexto + 6;
        borda(margem, y, util, alturaBloco);
        fonte(10, valor ? "normal" : "italic", valor ? COR.tinta : COR.suave);
        doc.text(trecho, margem + 5, y + 6.2, { lineHeightFactor: 1.35 });
        inicio += trecho.length;
        y += alturaBloco;
        if (inicio < texto.length) novaPagina();
      }
      y += 7;
    }

    /* Caixas de resultado lado a lado; a última ocupa o resto e quebra linha se preciso. */
    function caixas(lista) {
      const espaco = 4;
      const ultima = lista.length - 1;
      fonte(12, "bold");
      const larguras = lista.map(function (caixa, i) {
        return i === ultima ? 0 : Math.max(34, doc.getTextWidth(textoPdf(caixa[1])) + 12);
      });
      const usadas = larguras.reduce(function (a, b) { return a + b; }, 0) + espaco * ultima;
      larguras[ultima] = util - usadas;
      fonte(10.5, "bold");
      const linhasUltima = doc.splitTextToSize(textoPdf(lista[ultima][1]), larguras[ultima] - 8);
      const alturaCaixa = 10.5 + linhasUltima.length * 4.6;
      garantirEspaco(alturaCaixa + 6);
      let x = margem;
      lista.forEach(function (caixa, i) {
        borda(x, y, larguras[i], alturaCaixa);
        fonte(7, "normal", COR.suave);
        doc.text(textoPdf(caixa[0]).toUpperCase(), x + 4, y + 5.5, { charSpace: 0.3 });
        if (i === ultima) {
          fonte(10.5, "bold");
          doc.text(linhasUltima, x + 4, y + 11.5, { lineHeightFactor: 1.25 });
        } else {
          fonte(12, "bold");
          doc.text(textoPdf(caixa[1]), x + 4, y + 11.5);
        }
        x += larguras[i] + espaco;
      });
      y += alturaCaixa + 6;
    }

    function tabela(bloco) {
      const colunas = bloco.cabecalho.length;
      const corpo = bloco.linhas.map(function (linha) {
        if (linha.grupo) {
          return [{
            content: textoPdf(linha.grupo),
            colSpan: colunas,
            styles: { fontStyle: "bold", textColor: COR.escuro, fontSize: 8.5, halign: "left" }
          }];
        }
        const estilo = linha.destaque ? { fontStyle: "bold" }
          : linha.suave ? { fontStyle: "italic", textColor: COR.suave } : null;
        return celulasDe(linha).map(function (valor) {
          const texto = textoPdf(valor);
          return estilo ? { content: texto, styles: estilo } : texto;
        });
      });

      garantirEspaco(16);
      doc.autoTable({
        startY: y,
        margin: { left: margem, right: margem, top: 16, bottom: 22 },
        head: [bloco.cabecalho.map(textoPdf)],
        body: corpo,
        theme: "plain",
        rowPageBreak: "avoid",
        styles: {
          font: "helvetica",
          fontSize: 9,
          textColor: COR.tinta,
          cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 },
          lineColor: COR.linha,
          lineWidth: { bottom: 0.2 },
          valign: "middle"
        },
        headStyles: {
          fontStyle: "bold",
          fontSize: 8,
          textColor: COR.suave,
          lineWidth: { bottom: 0.4 },
          lineColor: COR.escuro
        },
        columnStyles: bloco.estilos || {},
        didDrawPage: faixaTopo
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    function lista(itens) {
      itens.forEach(function (item) {
        fonte(10, "normal");
        const linhasItem = doc.splitTextToSize(textoPdf(item), util - 6);
        garantirEspaco(linhasItem.length * alturaTexto + 1);
        doc.text("•", margem + 1, y);
        doc.text(linhasItem, margem + 6, y, { lineHeightFactor: 1.35 });
        y += linhasItem.length * alturaTexto + 0.8;
      });
      y += 4;
    }

    function imagem(bloco) {
      const alturaTotal = bloco.altura + (bloco.titulo ? 7 : 0);
      garantirEspaco(alturaTotal + 4);
      if (bloco.titulo) {
        fonte(9.5, "bold", COR.escuro);
        doc.text(textoPdf(bloco.titulo), margem, y);
        y += 4;
      }
      const x = margem + (util - bloco.largura) / 2;
      doc.addImage(bloco.imagem, "PNG", x, y, bloco.largura, bloco.altura);
      if (bloco.borda) borda(x, y, bloco.largura, bloco.altura);
      y += bloco.altura + 6;
    }

    function assinaturas(pessoas) {
      garantirEspaco(42);
      y += 4;
      fonte(10, "normal");
      doc.text("Atenciosamente,", margem, y);
      y += 24;
      const coluna = util / pessoas.length;
      pessoas.forEach(function (pessoa, i) {
        const centro = margem + coluna * i + coluna / 2;
        const meia = Math.min(32, coluna / 2 - 6);
        cor(COR.tinta, "draw");
        doc.setLineWidth(0.3);
        doc.line(centro - meia, y, centro + meia, y);
        fonte(10, "bold");
        doc.text(textoPdf(pessoa.nome), centro, y + 5, { align: "center" });
        fonte(9, "normal", COR.suave);
        doc.text(textoPdf(pessoa.registro), centro, y + 10, { align: "center" });
      });
      y += 16;
    }

    function desenharBloco(bloco) {
      switch (bloco.tipo) {
        case "caixas": caixas(bloco.caixas); break;
        case "tabela": tabela(bloco); break;
        case "texto": caixaTexto(bloco.rotulo, bloco.texto); break;
        case "lista": lista(bloco.itens); break;
        case "imagem": imagem(bloco); break;
        case "assinaturas": assinaturas(bloco.pessoas); break;
        case "subtitulo":
          y += bloco.menor ? 1 : 3;
          garantirEspaco(18);
          fonte(bloco.menor ? 9.5 : 10.5, "bold", COR.escuro);
          doc.text(textoPdf(bloco.texto), margem, y);
          y += bloco.menor ? 3 : 6;
          break;
        case "paragrafo":
          paragrafo(bloco.texto, 10, bloco.negrito ? "bold" : "normal", COR.tinta);
          y += 4;
          break;
        case "nota":
          paragrafo(bloco.texto, 8, "normal", COR.suave);
          y += 5;
          break;
      }
    }

    /* Cabeçalho */
    faixaTopo();
    fonte(19, "bold", COR.escuro);
    doc.text(TITULO, margem, 20);
    fonte(9.5, "normal", COR.suave);
    doc.text("Relatório da avaliação", margem, 26);

    fonte(8, "normal", COR.suave);
    doc.text("DATA DA AVALIAÇÃO", largura - margem, 18.5, { align: "right", charSpace: 0.3 });
    fonte(11, "bold");
    doc.text(dados["Data da Avaliação"] || "—", largura - margem, 24.5, { align: "right" });

    /* Cartão do paciente (só borda, sem fundo) */
    y = 34;
    const resumo = [
      dados["Idade"],
      dados["Data de Nascimento"] ? "Nascimento: " + dados["Data de Nascimento"] : ""
    ].filter(Boolean).join("   •   ");
    const alturaCartao = resumo ? 22 : 16;
    borda(margem, y, util, alturaCartao);
    fonte(7.5, "normal", COR.suave);
    doc.text("PACIENTE", margem + 6, y + 6.5, { charSpace: 0.3 });
    fonte(14, "bold");
    doc.text(doc.splitTextToSize(textoPdf(dados["Nome"] || "—"), util - 12)[0], margem + 6, y + 12.5);
    if (resumo) {
      fonte(9.5, "normal", COR.suave);
      doc.text(resumo, margem + 6, y + 18);
    }
    y += alturaCartao + 12;

    /* Identificação em duas colunas */
    tituloSecao("Identificação");
    const identificacao = linhas.filter(function (linha) {
      return EXIBIDOS_NO_TOPO.indexOf(linha[0]) === -1 && CAMPOS_TEXTO.indexOf(linha[0]) === -1;
    });
    const coluna = (util - 8) / 2;
    for (let i = 0; i < identificacao.length; i += 2) {
      const par = identificacao.slice(i, i + 2).map(function (linha) {
        return { rotulo: linha[0], valor: doc.splitTextToSize(textoPdf(linha[1] || "—"), coluna) };
      });
      const linhasTexto = Math.max.apply(null, par.map(function (c) { return c.valor.length; }));
      const alturaLinha = 6 + linhasTexto * 4.8 + 4;
      garantirEspaco(alturaLinha);
      par.forEach(function (campo, j) {
        const x = margem + j * (coluna + 8);
        fonte(7.5, "normal", COR.suave);
        doc.text(campo.rotulo.toUpperCase(), x, y, { charSpace: 0.3 });
        fonte(10.5, "normal", campo.valor[0] === "—" ? COR.suave : COR.tinta);
        doc.text(campo.valor, x, y + 5.5);
      });
      y += alturaLinha;
      if (i + 2 < identificacao.length) {
        cor(COR.linha, "draw");
        doc.setLineWidth(0.2);
        doc.line(margem, y - 4, margem + util, y - 4);
        y += 2;
      }
    }
    y += 6;

    /* Informações clínicas em blocos de texto */
    tituloSecao("Informações clínicas");
    CAMPOS_TEXTO.forEach(function (rotulo) {
      caixaTexto(rotulo, dados[rotulo]);
    });

    /* Etapas da avaliação, na ordem do menu. As de folha única ocupam uma página só delas. */
    let aposFolhaUnica = false;
    (secoes || []).forEach(function (secao) {
      if (secao.paginaPropria || aposFolhaUnica) novaPagina();
      else y += 4;
      tituloSecao(secao.titulo);
      secao.blocos.forEach(desenharBloco);
      aposFolhaUnica = !!secao.paginaPropria;
    });

    /* Rodapé: só a numeração das páginas */
    const paginas = doc.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      cor(COR.linha, "draw");
      doc.setLineWidth(0.3);
      doc.line(margem, altura - 13, largura - margem, altura - 13);
      fonte(7.5, "normal", COR.suave);
      doc.text("Página " + i + " de " + paginas, largura - margem, altura - 8.5, { align: "right" });
    }

    doc.save(nomeArquivo(nomePaciente, "pdf"));
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
          linhaMesclada([bloco.texto], 1, !!bloco.negrito, 130);
          break;
        case "subtitulo":
          linhaMesclada([bloco.texto], 1, true);
          break;
        case "lista":
          bloco.itens.forEach(function (item) { linhaMesclada(["• " + item], 1, false, 130); });
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
        case "assinaturas":
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

  function gerarBackup(campos, nomePaciente) {
    const conteudo = {
      tipo: TIPO_BACKUP,
      versao: 2,
      geradoEm: new Date().toISOString(),
      campos: campos
    };
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: "application/json" });
    baixar(blob, nomeArquivo(nomePaciente, "json"));
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
