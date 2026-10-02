/* Geração do relatório em PDF (jsPDF + AutoTable) e Excel (ExcelJS). */

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

  function carimbo() {
    const agora = new Date();
    return agora.toLocaleDateString("pt-BR") + " às " +
      agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

  /* ---------- PDF ---------- */

  const COR = {
    escuro: [33, 33, 33],
    claro: [241, 241, 241],
    fundo: [248, 248, 248],
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
  const EXIBIDOS_NO_TOPO = ["Nome", "Idade", "Sexo", "Data de Nascimento", "Data da Avaliação"];

  function gerarPdf(linhas, nomePaciente, cornell, shulman) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    const margem = 18;
    const util = largura - margem * 2;
    const limite = altura - 20;
    const geradoEm = carimbo();
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

    function novaPagina() {
      doc.addPage();
      cor(COR.escuro, "fill");
      doc.rect(0, 0, largura, 2.5, "F");
      y = 16;
    }

    function garantirEspaco(necessario) {
      if (y + necessario > limite) novaPagina();
    }

    function tituloSecao(texto) {
      garantirEspaco(16);
      fonte(10, "bold", COR.escuro);
      doc.text(texto.toUpperCase(), margem, y, { charSpace: 0.4 });
      cor(COR.linha, "draw");
      doc.setLineWidth(0.3);
      doc.line(margem, y + 2.5, margem + util, y + 2.5);
      y += 9;
    }

    /* Cabeçalho */
    cor(COR.escuro, "fill");
    doc.rect(0, 0, largura, 2.5, "F");

    fonte(19, "bold", COR.escuro);
    doc.text(TITULO, margem, 20);
    fonte(9.5, "normal", COR.suave);
    doc.text("Relatório da avaliação", margem, 26);

    const dataAvaliacao = dados["Data da Avaliação"] || "—";
    fonte(8, "normal", COR.suave);
    doc.text("DATA DA AVALIAÇÃO", largura - margem, 18.5, { align: "right", charSpace: 0.3 });
    fonte(11, "bold");
    doc.text(dataAvaliacao, largura - margem, 24.5, { align: "right" });

    /* Cartão do paciente */
    y = 34;
    const resumo = [
      dados["Idade"],
      dados["Sexo"],
      dados["Data de Nascimento"] ? "Nascimento: " + dados["Data de Nascimento"] : ""
    ].filter(Boolean).join("   •   ");
    const alturaCartao = resumo ? 22 : 16;
    cor(COR.claro, "fill");
    doc.roundedRect(margem, y, util, alturaCartao, 2.5, 2.5, "F");
    cor(COR.escuro, "fill");
    doc.roundedRect(margem, y, 2.2, alturaCartao, 1, 1, "F");
    fonte(7.5, "normal", COR.suave);
    doc.text("PACIENTE", margem + 8, y + 6.5, { charSpace: 0.3 });
    fonte(14, "bold");
    doc.text(doc.splitTextToSize(dados["Nome"] || "—", util - 14)[0], margem + 8, y + 12.5);
    if (resumo) {
      fonte(9.5, "normal", COR.suave);
      doc.text(resumo, margem + 8, y + 18);
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
        return { rotulo: linha[0], valor: doc.splitTextToSize(linha[1] || "—", coluna) };
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
    const larguraTexto = util - 10;
    const alturaTexto = 4.9;
    CAMPOS_TEXTO.forEach(function (rotulo) {
      const valor = dados[rotulo];
      fonte(10, "normal");
      const texto = doc.splitTextToSize(valor || "Não informado", larguraTexto);

      garantirEspaco(18);
      fonte(9.5, "bold", COR.escuro);
      doc.text(rotulo, margem, y);
      y += 3;

      let inicio = 0;
      while (inicio < texto.length) {
        const cabem = Math.max(1, Math.floor((limite - y - 8) / alturaTexto));
        const trecho = texto.slice(inicio, inicio + cabem);
        const alturaBloco = trecho.length * alturaTexto + 6;
        cor(COR.fundo, "fill");
        cor(COR.linha, "draw");
        doc.setLineWidth(0.2);
        doc.roundedRect(margem, y, util, alturaBloco, 2, 2, "FD");
        fonte(10, valor ? "normal" : "italic", valor ? COR.tinta : COR.suave);
        doc.text(trecho, margem + 5, y + 6.2, { lineHeightFactor: 1.35 });
        inicio += trecho.length;
        y += alturaBloco;
        if (inicio < texto.length) novaPagina();
      }
      y += 7;
    });

    /* Escala Cornell (só entra no relatório se algum item foi respondido) */
    if (cornell && cornell.respondidos > 0) {
      y += 3;
      garantirEspaco(70);
      tituloSecao("Escala Cornell para Depressão");

      const caixas = [
        ["ESCORE TOTAL", cornell.total + " / " + cornell.pontuacaoMaxima],
        ["ITENS RESPONDIDOS", cornell.respondidos + " de " + cornell.totalItens],
        ["INTERPRETAÇÃO", cornell.interpretacao +
          (cornell.respondidos < cornell.totalItens ? " (parcial)" : "")]
      ];
      const larguras = [36, 40, util - 36 - 40 - 8];
      let x = margem;
      caixas.forEach(function (caixa, i) {
        cor(COR.fundo, "fill");
        cor(COR.linha, "draw");
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, larguras[i], 15, 2, 2, "FD");
        fonte(7, "normal", COR.suave);
        doc.text(caixa[0], x + 4, y + 5.5, { charSpace: 0.3 });
        fonte(i === 2 ? 10.5 : 12, "bold");
        doc.text(doc.splitTextToSize(caixa[1], larguras[i] - 8)[0], x + 4, y + 11.5);
        x += larguras[i] + 4;
      });
      y += 21;

      const corpo = [];
      cornell.grupos.forEach(function (grupo) {
        corpo.push([{
          content: grupo.titulo,
          colSpan: 4,
          styles: { fontStyle: "bold", fillColor: COR.claro, textColor: COR.escuro, fontSize: 8.5 }
        }]);
        grupo.itens.forEach(function (item) {
          const respondido = item.pontos !== null;
          corpo.push([
            item.numero,
            item.texto,
            respondido ? item.resposta
              : { content: "Não respondido", styles: { fontStyle: "italic", textColor: COR.suave } },
            respondido ? item.pontos : "—"
          ]);
        });
      });
      corpo.push([
        { content: "Escore total", colSpan: 3, styles: { fontStyle: "bold", halign: "right" } },
        { content: String(cornell.total), styles: { fontStyle: "bold" } }
      ]);

      doc.autoTable({
        startY: y,
        margin: { left: margem, right: margem, top: 16, bottom: 22 },
        head: [["Nº", "Sinal avaliado", "Avaliação", "Pontos"]],
        body: corpo,
        theme: "plain",
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
        columnStyles: {
          0: { cellWidth: 10, halign: "center", textColor: COR.suave },
          2: { cellWidth: 42 },
          3: { cellWidth: 16, halign: "center" }
        },
        didDrawPage: function () {
          cor(COR.escuro, "fill");
          doc.rect(0, 0, largura, 2.5, "F");
        }
      });
      y = doc.lastAutoTable.finalY + 5;

      garantirEspaco(10);
      fonte(8, "normal", COR.suave);
      doc.text(doc.splitTextToSize("Referência: " + cornell.referencia +
        " Pontuação por item: impossibilitado de avaliar 0, ausente 0, leve 1, intenso 2.", util), margem, y);
      y += 8;
    }

    /* Relógio de Shulman (opcional: só entra se algo foi preenchido) */
    if (shulman && shulman.preenchido) {
      y += 6;
      const lado = 78;
      garantirEspaco(lado + 30);
      tituloSecao("Relógio de Shulman");

      const xTexto = shulman.imagem ? margem + lado + 8 : margem;
      const larguraTexto = util - (xTexto - margem);
      const topo = y;

      if (shulman.imagem) {
        cor(COR.linha, "draw");
        doc.setLineWidth(0.2);
        doc.roundedRect(margem, topo, lado, lado, 2, 2, "S");
        doc.addImage(shulman.imagem, "PNG", margem + 2, topo + 2, lado - 4, lado - 4);
      }

      cor(COR.fundo, "fill");
      cor(COR.linha, "draw");
      doc.setLineWidth(0.2);
      doc.roundedRect(xTexto, topo, larguraTexto, 15, 2, 2, "FD");
      fonte(7, "normal", COR.suave);
      doc.text("PONTUAÇÃO", xTexto + 4, topo + 5.5, { charSpace: 0.3 });
      fonte(12, "bold");
      doc.text(shulman.pontuacao === null ? "Não pontuado"
        : shulman.pontuacao + " / " + shulman.pontuacaoMaxima, xTexto + 4, topo + 11.5);

      let yTexto = topo + 22;
      if (shulman.descricao) {
        fonte(9.5, "bold", COR.escuro);
        doc.text("Classificação", xTexto, yTexto);
        fonte(10, "normal");
        const linhasDescricao = doc.splitTextToSize(shulman.descricao, larguraTexto);
        doc.text(linhasDescricao, xTexto, yTexto + 5, { lineHeightFactor: 1.35 });
        yTexto += 8 + linhasDescricao.length * 4.9;
      }
      fonte(9.5, "bold", COR.escuro);
      doc.text("Observações", xTexto, yTexto);
      fonte(10, shulman.observacoes ? "normal" : "italic", shulman.observacoes ? COR.tinta : COR.suave);
      const linhasObs = doc.splitTextToSize(shulman.observacoes || "Não informado", larguraTexto);
      const espacoObs = Math.max(1, Math.floor((limite - yTexto - 5) / 4.9));
      doc.text(linhasObs.slice(0, espacoObs), xTexto, yTexto + 5, { lineHeightFactor: 1.35 });
      yTexto += 5 + Math.min(linhasObs.length, espacoObs) * 4.9;

      y = Math.max(shulman.imagem ? topo + lado : 0, yTexto) + 6;
      garantirEspaco(10);
      fonte(8, "normal", COR.suave);
      doc.text(doc.splitTextToSize("Referência: " + shulman.referencia, util), margem, y);
    }

    /* Rodapé */
    const paginas = doc.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      cor(COR.linha, "draw");
      doc.setLineWidth(0.3);
      doc.line(margem, altura - 13, largura - margem, altura - 13);
      fonte(7.5, "normal", COR.suave);
      doc.text("Gerado em " + geradoEm, margem, altura - 8.5);
      doc.text("Página " + i + " de " + paginas, largura - margem, altura - 8.5, { align: "right" });
    }

    doc.save(nomeArquivo(nomePaciente, "pdf"));
  }

  /* ---------- Excel ---------- */

  function alturaLinha(texto, caracteresPorLinha) {
    const linhas = String(texto || "").split("\n").reduce(function (total, trecho) {
      return total + Math.max(1, Math.ceil(trecho.length / caracteresPorLinha));
    }, 0);
    return Math.max(21, linhas * 15 + 6);
  }

  async function gerarExcel(linhas, nomePaciente, cornell, shulman) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = TITULO;
    workbook.created = new Date();

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

    sheet.columns = [{ width: 30 }, { width: 75 }];

    const borda = { style: "thin", color: { argb: "FF3C3C3C" } };
    const bordas = { top: borda, left: borda, bottom: borda, right: borda };

    sheet.mergeCells("A1:B1");
    const titulo = sheet.getCell("A1");
    titulo.value = TITULO;
    titulo.font = { name: "Calibri", size: 16, bold: true };
    titulo.alignment = { horizontal: "center", vertical: "middle" };
    titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    titulo.border = bordas;
    sheet.getCell("B1").border = bordas;
    sheet.getRow(1).height = 30;

    linhas.forEach(function (linha) {
      const row = sheet.addRow([linha[0], linha[1]]);
      row.height = alturaLinha(linha[1], 80);
      row.getCell(1).font = { name: "Calibri", size: 11, bold: true };
      row.getCell(2).font = { name: "Calibri", size: 11 };
      row.eachCell({ includeEmpty: true }, function (cell) {
        cell.border = bordas;
        cell.alignment = { vertical: "middle", wrapText: true };
      });
    });

    if (cornell && cornell.respondidos > 0) {
      sheet.addRow([]).height = 10;
      const cabecalho = sheet.addRow(["Escala Cornell para Depressão"]);
      sheet.mergeCells(cabecalho.number, 1, cabecalho.number, 2);
      cabecalho.height = 24;
      cabecalho.getCell(1).font = { name: "Calibri", size: 13, bold: true };
      cabecalho.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      cabecalho.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
      cabecalho.getCell(1).border = bordas;

      function linhaCornell(rotulo, valorCelula, destaque) {
        const row = sheet.addRow([rotulo, valorCelula]);
        row.height = alturaLinha(rotulo, 32);
        row.getCell(1).font = { name: "Calibri", size: 11, bold: !!destaque };
        row.getCell(2).font = { name: "Calibri", size: 11, bold: !!destaque };
        row.eachCell({ includeEmpty: true }, function (cell) {
          cell.border = bordas;
          cell.alignment = { vertical: "middle", wrapText: true };
        });
      }

      cornell.grupos.forEach(function (grupo) {
        const titulo = sheet.addRow([grupo.titulo]);
        sheet.mergeCells(titulo.number, 1, titulo.number, 2);
        titulo.getCell(1).font = { name: "Calibri", size: 11, bold: true, italic: true };
        titulo.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
        titulo.getCell(1).border = bordas;
        grupo.itens.forEach(function (item) {
          linhaCornell(item.numero + ". " + item.texto,
            item.pontos === null ? "Não respondido" : item.resposta + " (" + item.pontos + ")");
        });
      });
      linhaCornell("Escore total", cornell.total + " / " + cornell.pontuacaoMaxima, true);
      linhaCornell("Interpretação", cornell.interpretacao +
        (cornell.respondidos < cornell.totalItens ? " (parcial: " + cornell.respondidos + " de " +
          cornell.totalItens + " itens)" : ""), true);
      linhaCornell("Referência", cornell.referencia);
    }

    if (shulman && shulman.preenchido) {
      sheet.addRow([]).height = 10;
      const cabecalho = sheet.addRow(["Relógio de Shulman"]);
      sheet.mergeCells(cabecalho.number, 1, cabecalho.number, 2);
      cabecalho.height = 24;
      cabecalho.getCell(1).font = { name: "Calibri", size: 13, bold: true };
      cabecalho.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      cabecalho.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
      cabecalho.getCell(1).border = bordas;

      [
        ["Pontuação", shulman.pontuacao === null ? "Não pontuado"
          : shulman.pontuacao + " / " + shulman.pontuacaoMaxima, true],
        ["Classificação", shulman.descricao || "—"],
        ["Observações", shulman.observacoes || "Não informado"],
        ["Referência", shulman.referencia]
      ].forEach(function (linha) {
        const row = sheet.addRow([linha[0], linha[1]]);
        row.height = alturaLinha(linha[1], 80);
        row.getCell(1).font = { name: "Calibri", size: 11, bold: true };
        row.getCell(2).font = { name: "Calibri", size: 11, bold: !!linha[2] };
        row.eachCell({ includeEmpty: true }, function (cell) {
          cell.border = bordas;
          cell.alignment = { vertical: "middle", wrapText: true };
        });
      });

      /* Desenho do relógio numa linha alta, ocupando as duas colunas. */
      if (shulman.imagem) {
        const linhaImagem = sheet.addRow(["Desenho"]);
        sheet.mergeCells(linhaImagem.number, 1, linhaImagem.number, 2);
        linhaImagem.height = 240;
        linhaImagem.getCell(1).font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF7A7A7A" } };
        linhaImagem.getCell(1).alignment = { vertical: "top" };
        linhaImagem.getCell(1).border = bordas;
        const idImagem = workbook.addImage({ base64: shulman.imagem, extension: "png" });
        sheet.addImage(idImagem, {
          tl: { col: 1, row: linhaImagem.number - 1 + 0.04 },
          ext: { width: 305, height: 305 }
        });
      }
    }

    const rodape = sheet.addRow([]);
    rodape.height = 8;
    const info = sheet.addRow(["Relatório gerado em " + carimbo()]);
    sheet.mergeCells(info.number, 1, info.number, 2);
    info.getCell(1).font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF7A7A7A" } };

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
      versao: 1,
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
