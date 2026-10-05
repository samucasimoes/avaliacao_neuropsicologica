/* Monta as etapas descritas em definicoes.js: tela, cálculos e conteúdo do relatório. */

const Secoes = (function () {
  let form = null;
  let contexto = { paciente: function () { return {}; }, origens: {} };
  const secoes = [];
  const porId = {};

  /* ---------- Utilidades ---------- */

  function criar(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined && texto !== null && texto !== "") el.textContent = texto;
    return el;
  }

  function valorDe(nome) {
    const el = form.elements.namedItem(nome);
    if (!el) return "";
    if (el instanceof RadioNodeList) return el.value;
    if (el.type === "checkbox") return el.checked;
    return el.value.trim();
  }

  function numero(texto) {
    if (texto === "" || texto === null || texto === undefined) return null;
    const n = Number(String(texto).replace(",", "."));
    return isFinite(n) ? n : null;
  }

  function textoNumero(n) {
    return n === null ? "—" : formatarNumero(n);
  }

  /* Opção em formato de pílula (mesmo visual da Escala Cornell). */
  function pilula(nome, valor, rotulo, pontos, dica) {
    const label = criar("label", "opcao");
    label.title = dica || rotulo;
    const radio = criar("input", "opcao-radio");
    radio.type = "radio";
    radio.name = nome;
    radio.value = valor;
    label.appendChild(radio);
    const caixa = criar("span", "opcao-caixa");
    caixa.appendChild(criar("span", "opcao-texto", rotulo));
    if (pontos !== null && pontos !== undefined) {
      caixa.appendChild(criar("span", "opcao-pontos", String(pontos)));
      label.title = (dica || rotulo) + " (" + pontos + (pontos === 1 ? " ponto)" : " pontos)");
    }
    label.appendChild(caixa);
    return label;
  }

  function selo(el, texto, nivel) {
    el.textContent = texto;
    el.hidden = !texto;
    el.classList.remove("nivel-baixo", "nivel-medio", "nivel-alto");
    if (nivel) el.classList.add("nivel-" + nivel);
  }

  /* Não deixa digitar valor acima do máximo (ex.: escore máximo do MoCA). */
  function limitarMaximo(input, maximo, rotulo) {
    input.addEventListener("input", function () {
      const n = numero(input.value);
      if (n === null) return;
      if (n > maximo) {
        input.value = String(maximo);
        if (contexto.aviso) contexto.aviso("O valor máximo para " + rotulo + " é " + maximo + ".");
      } else if (n < 0) {
        input.value = "0";
      }
    });
  }

  /* ---------- Blocos ---------- */

  /* Itens com as mesmas opções para todos (Resumo, Pfeffer, IQCODE). */
  function blocoOpcoes(secao, b) {
    const itens = b.itens.map(function (item, i) {
      return typeof item === "string"
        ? { numero: i + 1, texto: item, opcoes: b.opcoes }
        : { numero: i + 1, texto: item.texto, opcoes: item.opcoes };
    });

    function nome(n) {
      return secao.id + "-" + b.id + "-" + n;
    }

    function resposta(n) {
      const v = valorDe(nome(n));
      return itens[n - 1].opcoes.find(function (o) { return o.valor === v; }) || null;
    }

    return {
      montar: function (container) {
        const lista = criar("div", "escala");
        itens.forEach(function (item) {
          const linha = criar("div", "escala-item" + (b.empilhado ? " empilhado" : ""));
          linha.setAttribute("role", "radiogroup");
          linha.setAttribute("aria-labelledby", nome(item.numero) + "-texto");
          const texto = criar("p", "escala-texto");
          texto.id = nome(item.numero) + "-texto";
          texto.appendChild(criar("span", "escala-num", String(item.numero)));
          texto.appendChild(document.createTextNode(item.texto));
          linha.appendChild(texto);

          const opcoes = criar("div", "escala-opcoes");
          if (!b.empilhado) opcoes.style.setProperty("--colunas", item.opcoes.length);
          item.opcoes.forEach(function (o) {
            const pontos = b.mostrarPontos && !o.semPontos ? o.pontos : null;
            opcoes.appendChild(pilula(nome(item.numero), o.valor, o.rotulo, pontos,
              "Item " + item.numero + ": " + o.rotulo));
          });
          linha.appendChild(opcoes);
          lista.appendChild(linha);
        });
        container.appendChild(lista);
      },
      pontuacao: function () {
        let total = 0;
        let respondidos = 0;
        itens.forEach(function (item) {
          const r = resposta(item.numero);
          if (!r) return;
          respondidos++;
          total += r.pontos || 0;
        });
        return { total: total, respondidos: respondidos, totalItens: itens.length };
      },
      preenchido: function () {
        return itens.some(function (item) { return resposta(item.numero); });
      },
      completo: function () {
        return itens.every(function (item) { return resposta(item.numero); });
      },
      relatorio: function () {
        const linhas = [];
        itens.forEach(function (item) {
          const r = resposta(item.numero);
          if (!r) return;
          const linha = [item.numero, item.texto, r.rotulo];
          if (b.mostrarPontos) linha.push(r.semPontos ? "—" : r.pontos);
          linhas.push(linha);
        });
        if (!linhas.length) return [];
        const cabecalho = ["Nº", b.colunaItem || "Item", "Resposta"];
        if (b.mostrarPontos) cabecalho.push("Pontos");
        return [{
          tipo: "tabela",
          cabecalho: cabecalho,
          linhas: linhas,
          estilos: { 0: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 46 }, 3: { cellWidth: 16, halign: "center" } }
        }];
      }
    };
  }

  /* Cada item com suas próprias descrições (Escala de Katz). */
  function blocoEscolhas(secao, b) {
    function nome(n) {
      return secao.id + "-" + b.id + "-" + n;
    }

    function resposta(i) {
      const v = Number(valorDe(nome(i + 1)));
      const item = b.itens[i];
      if (!v || !item.opcoes[v - 1]) return null;
      return { texto: item.opcoes[v - 1], pontos: item.pontos[v - 1] };
    }

    return {
      montar: function (container) {
        b.itens.forEach(function (item, i) {
          const grupo = criar("div", "escolha-item");
          grupo.setAttribute("role", "radiogroup");
          grupo.setAttribute("aria-labelledby", nome(i + 1) + "-texto");
          const titulo = criar("p", "escala-texto");
          titulo.id = nome(i + 1) + "-texto";
          titulo.appendChild(criar("span", "escala-num", String(i + 1)));
          titulo.appendChild(document.createTextNode(item.titulo));
          grupo.appendChild(titulo);

          const opcoes = criar("div", "escolha-opcoes");
          item.opcoes.forEach(function (texto, j) {
            const label = criar("label", "shulman-opcao");
            label.title = item.titulo + ": " + texto + " (" + b.rotulosPontos[item.pontos[j]] + ")";
            const radio = criar("input", "opcao-radio");
            radio.type = "radio";
            radio.name = nome(i + 1);
            radio.value = String(j + 1);
            label.appendChild(radio);
            const caixa = criar("span", "shulman-opcao-caixa");
            caixa.appendChild(criar("span", "shulman-opcao-texto", texto));
            caixa.appendChild(criar("span", "escolha-tag", b.rotulosPontos[item.pontos[j]]));
            label.appendChild(caixa);
            opcoes.appendChild(label);
          });
          grupo.appendChild(opcoes);
          container.appendChild(grupo);
        });
      },
      pontuacao: function () {
        let total = 0;
        let respondidos = 0;
        b.itens.forEach(function (item, i) {
          const r = resposta(i);
          if (!r) return;
          respondidos++;
          total += r.pontos;
        });
        return { total: total, respondidos: respondidos, totalItens: b.itens.length };
      },
      preenchido: function () {
        return b.itens.some(function (item, i) { return resposta(i); });
      },
      completo: function () {
        return b.itens.every(function (item, i) { return resposta(i); });
      },
      relatorio: function () {
        const linhas = [];
        b.itens.forEach(function (item, i) {
          const r = resposta(i);
          if (r) linhas.push([i + 1, item.titulo, r.texto, b.rotulosPontos[r.pontos]]);
        });
        if (!linhas.length) return [];
        return [{
          tipo: "tabela",
          cabecalho: ["Nº", b.colunaItem || "Item", "Descrição assinalada", "Classificação"],
          linhas: linhas,
          estilos: { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 52 }, 3: { cellWidth: 28 } }
        }];
      }
    };
  }

  /* Lista de marcar (Funções avaliadas). */
  function blocoChecklist(secao, b) {
    function nome(n) {
      return secao.id + "-" + b.id + "-" + n;
    }

    function marcados() {
      const lista = b.itens.filter(function (item, i) { return valorDe(nome(i + 1)) === true; });
      if (b.outros) {
        valorDe(nome("outros")).split("\n").forEach(function (linha) {
          if (linha.trim()) lista.push(linha.trim());
        });
      }
      return lista;
    }

    return {
      montar: function (container) {
        const grade = criar("div", "checklist");
        b.itens.forEach(function (item, i) {
          const label = criar("label", "check");
          label.title = "Marcar ou desmarcar: " + item;
          const caixa = criar("input", "check-caixa");
          caixa.type = "checkbox";
          caixa.name = nome(i + 1);
          caixa.value = "sim";
          caixa.defaultChecked = true;
          label.appendChild(caixa);
          label.appendChild(criar("span", "check-texto", item));
          grade.appendChild(label);
        });
        container.appendChild(grade);

        if (b.outros) {
          const campo = criar("div", "field");
          const label = criar("label", "label", b.outros);
          label.htmlFor = nome("outros");
          const area = criar("textarea", "input textarea short");
          area.id = nome("outros");
          area.name = nome("outros");
          area.placeholder = "Uma por linha";
          campo.appendChild(label);
          campo.appendChild(area);
          container.appendChild(campo);
        }
      },
      preenchido: function () {
        return marcados().length > 0;
      },
      completo: function () {
        return marcados().length > 0;
      },
      relatorio: function () {
        const lista = marcados();
        return lista.length ? [{ tipo: "lista", itens: lista }] : [];
      }
    };
  }

  /* Texto fixo em tópicos (Protocolos aplicados): entra sempre no relatório. */
  function blocoLista(secao, b) {
    return {
      montar: function (container) {
        if (b.introducao) container.appendChild(criar("p", "paragrafo", b.introducao));
        const ul = criar("ul", "lista-fixa");
        b.itens.forEach(function (item) { ul.appendChild(criar("li", "", item)); });
        container.appendChild(ul);
      },
      preenchido: function () { return false; },
      completo: function () { return true; },
      relatorio: function () {
        const blocos = [];
        if (b.introducao) blocos.push({ tipo: "paragrafo", texto: b.introducao });
        blocos.push({ tipo: "lista", itens: b.itens });
        return blocos;
      }
    };
  }

  /* Tabela de teste: escores digitados, totais calculados e classificação. */
  function blocoTabela(secao, b) {
    const linhas = b.linhas.map(function (linha, i) {
      return Object.assign({ indice: i + 1, chave: linha.chave || String(i + 1) }, linha);
    });
    const porChave = {};
    linhas.forEach(function (linha) { porChave[linha.chave] = linha; });
    const saidas = [];
    const referencias = [];

    function nome(linha, coluna) {
      return secao.id + "-" + b.id + "-" + linha.indice + "-" + (coluna + 1);
    }

    function calculado(linha, coluna) {
      return !!(linha.calculos && linha.calculos[coluna]);
    }

    const acesso = {
      num: function (chave, coluna) {
        const linha = porChave[chave];
        if (!linha) return null;
        if (calculado(linha, coluna)) return linha.calculos[coluna](acesso);
        return numero(valorDe(nome(linha, coluna)));
      }
    };

    /* Valor de referência da linha conforme a idade e o sexo do paciente. */
    function referencia(linha) {
      if (!linha.referencia) return "";
      const p = contexto.paciente();
      if (p.idade === null || p.idade === undefined || !p.sexo) return "";
      const faixa = linha.referencia.find(function (f) { return p.idade >= f.de && p.idade <= f.ate; });
      if (!faixa) return "";
      return (p.sexo === "Masculino" ? faixa.homem : faixa.mulher)
        .toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }

    /* Colunas que não são digitadas nem contam como preenchimento. */
    function informativa(coluna) {
      return coluna.tipo === "fixo" || coluna.tipo === "referencia";
    }

    /* Valor de uma célula como texto (vazio se não preenchida). */
    function celula(linha, coluna) {
      const tipo = b.colunas[coluna].tipo;
      if (tipo === "referencia") return referencia(linha);
      if (calculado(linha, coluna)) {
        const v = linha.calculos[coluna](acesso);
        return v === null ? "" : formatarNumero(v);
      }
      if (tipo === "fixo") return linha.fixos ? linha.fixos[coluna] || "" : "";
      if (tipo === "calculo") return "";
      return valorDe(nome(linha, coluna));
    }

    function linhaPreenchida(linha) {
      return b.colunas.some(function (coluna, c) {
        return !informativa(coluna) && celula(linha, c) !== "";
      });
    }

    /* Todas as células digitáveis da linha preenchidas. */
    function linhaCompleta(linha) {
      return b.colunas.every(function (coluna, c) {
        return informativa(coluna) || coluna.tipo === "calculo" || calculado(linha, c) ||
          celula(linha, c) !== "";
      });
    }

    function linhaDigitada(linha) {
      return b.colunas.some(function (coluna, c) {
        return !informativa(coluna) && !calculado(linha, c) && celula(linha, c) !== "";
      });
    }

    return {
      montar: function (container) {
        if (b.titulo) container.appendChild(criar("h3", "escala-grupo", b.titulo));
        const rolagem = criar("div", "tabela-rolagem");
        const tabela = criar("table", "tabela-teste");
        const thead = criar("thead");
        const cabecalho = criar("tr");
        cabecalho.appendChild(criar("th", "", b.colunaRotulo || ""));
        b.colunas.forEach(function (coluna) {
          const th = criar("th", coluna.estreita ? "estreita" : coluna.tipo === "classe" ? "classe" : "", coluna.rotulo);
          cabecalho.appendChild(th);
        });
        thead.appendChild(cabecalho);
        tabela.appendChild(thead);

        const tbody = criar("tbody");
        linhas.forEach(function (linha) {
          const tr = criar("tr", linha.destaque ? "destaque" : "");
          const th = criar("th", "", linha.rotulo);
          th.scope = "row";
          tr.appendChild(th);
          b.colunas.forEach(function (coluna, c) {
            const td = criar("td", coluna.estreita ? "estreita" : "");
            const rotulo = linha.rotulo + " – " + coluna.rotulo;
            if (calculado(linha, c)) {
              const saida = criar("output", "calc", "—");
              saida.setAttribute("aria-label", rotulo);
              saidas.push({ el: saida, linha: linha, coluna: c });
              td.appendChild(saida);
            } else if (coluna.tipo === "fixo") {
              td.appendChild(criar("span", "fixo", linha.fixos ? linha.fixos[c] : ""));
            } else if (coluna.tipo === "referencia") {
              const ref = criar("span", "fixo referencia", "");
              if (linha.referencia) referencias.push({ el: ref, linha: linha });
              td.appendChild(ref);
            } else if (coluna.tipo === "calculo") {
              td.appendChild(criar("span", "fixo", ""));
            } else if (coluna.tipo === "classe") {
              const grupo = criar("div", "classe-opcoes");
              grupo.setAttribute("role", "radiogroup");
              grupo.setAttribute("aria-label", rotulo);
              coluna.opcoes.forEach(function (opcao) {
                grupo.appendChild(pilula(nome(linha, c), opcao, opcao.replace(" do esperado", ""), null,
                  linha.rotulo + ": " + opcao));
              });
              td.appendChild(grupo);
            } else {
              const input = criar("input", "input input-tabela");
              input.name = nome(linha, c);
              input.setAttribute("aria-label", rotulo);
              input.title = rotulo + (linha.maximo !== undefined ? " (de 0 a " + linha.maximo + ")" : "");
              input.autocomplete = "off";
              if (coluna.tipo === "numero") {
                input.inputMode = "decimal";
                if (linha.maximo !== undefined) {
                  input.type = "number";
                  input.min = "0";
                  input.max = String(linha.maximo);
                  input.step = "1";
                  limitarMaximo(input, linha.maximo, linha.rotulo);
                } else {
                  input.type = "text";
                }
              } else {
                input.type = "text";
              }
              td.appendChild(input);
            }
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        tabela.appendChild(tbody);
        rolagem.appendChild(tabela);
        container.appendChild(rolagem);
      },
      atualizar: function () {
        saidas.forEach(function (s) {
          s.el.value = textoNumero(s.linha.calculos[s.coluna](acesso));
        });
        referencias.forEach(function (r) {
          const valor = referencia(r.linha);
          r.el.textContent = valor || "—";
          r.el.title = valor ? "Referência para a idade e o sexo do paciente"
            : "Informe a data de nascimento e o sexo (60 a 89 anos) nos dados do paciente";
        });
      },
      valor: function (chave, coluna) {
        return acesso.num(chave, coluna);
      },
      preenchido: function () {
        return linhas.some(linhaDigitada);
      },
      completo: function () {
        return linhas.every(linhaCompleta);
      },
      relatorio: function () {
        const corpo = linhas.filter(linhaPreenchida).map(function (linha) {
          const celulas = [linha.rotulo].concat(b.colunas.map(function (coluna, c) {
            return celula(linha, c) || "—";
          }));
          return linha.destaque ? { celulas: celulas, destaque: true } : celulas;
        });
        if (!corpo.length) return [];
        const blocos = [];
        if (b.titulo) blocos.push({ tipo: "subtitulo", texto: b.titulo, menor: true });
        blocos.push({
          tipo: "tabela",
          cabecalho: [b.colunaRotulo || ""].concat(b.colunas.map(function (c) { return c.rotulo; })),
          linhas: corpo
        });
        return blocos;
      }
    };
  }

  function blocoTexto(secao, b) {
    const nome = secao.id + "-" + b.id;
    return {
      montar: function (container) {
        const campo = criar("div", "field");
        const label = criar("label", "label", b.rotulo);
        label.htmlFor = nome;
        const area = criar("textarea", "input textarea" + (b.alto ? " alta" : ""));
        area.id = nome;
        area.name = nome;
        area.placeholder = b.placeholder || "Digite aqui...";
        area.title = b.rotulo;
        campo.appendChild(label);
        campo.appendChild(area);
        container.appendChild(campo);
      },
      preenchido: function () {
        return valorDe(nome) !== "";
      },
      completo: function () {
        return valorDe(nome) !== "";
      },
      relatorio: function () {
        const texto = valorDe(nome);
        return texto ? [{ tipo: "texto", rotulo: b.rotulo, texto: texto }] : [];
      }
    };
  }

  /* Campos de uma linha com rótulo (domínios da Interpretação dos resultados). */
  function blocoCampos(secao, b) {
    function nome(n) {
      return secao.id + "-" + b.id + "-" + n;
    }

    function preenchidos() {
      const lista = [];
      b.itens.forEach(function (rotulo, i) {
        const valor = valorDe(nome(i + 1));
        if (valor) lista.push(rotulo + ": " + valor);
      });
      return lista;
    }

    return {
      montar: function (container) {
        const grade = criar("div", "campos-grade");
        b.itens.forEach(function (rotulo, i) {
          const campo = criar("div", "field");
          const label = criar("label", "label", rotulo);
          label.htmlFor = nome(i + 1);
          const input = criar("input", "input");
          input.type = "text";
          input.id = nome(i + 1);
          input.name = nome(i + 1);
          input.title = rotulo;
          input.autocomplete = "off";
          campo.appendChild(label);
          campo.appendChild(input);
          grade.appendChild(campo);
        });
        container.appendChild(grade);
      },
      preenchido: function () {
        return preenchidos().length > 0;
      },
      completo: function () {
        return preenchidos().length === b.itens.length;
      },
      relatorio: function () {
        const lista = preenchidos();
        return lista.length ? [{ tipo: "lista", itens: lista }] : [];
      }
    };
  }

  /* Textos fixos: só entram no relatório quando o grupo tem algo preenchido. */
  function blocoEstatico(classe, tipoRelatorio) {
    return function (secao, b) {
      return {
        montar: function (container) {
          container.appendChild(criar(tipoRelatorio === "subtitulo" ? "h3" : "p", classe, b.texto));
        },
        preenchido: function () { return false; },
      completo: function () { return true; },
        relatorio: function (grupoPreenchido) {
          return grupoPreenchido ? [{ tipo: tipoRelatorio, texto: b.texto }] : [];
        }
      };
    };
  }

  /* Frase que depende dos dados do paciente ("A avaliação do Sr. ... revelou:"). */
  function blocoFrase(secao, b) {
    let el = null;
    return {
      montar: function (container) {
        el = criar("p", "frase");
        container.appendChild(el);
      },
      atualizar: function () {
        el.textContent = b.texto(contexto.paciente());
      },
      preenchido: function () { return false; },
      completo: function () { return true; },
      relatorio: function (grupoPreenchido) {
        return grupoPreenchido ? [{ tipo: "paragrafo", texto: b.texto(contexto.paciente()), negrito: true }] : [];
      }
    };
  }

  /* Gráfico de linha da curva de aprendizagem, desenhado a partir de uma tabela da mesma etapa. */
  function blocoGrafico(secao, b) {
    const LARGURA = 720;
    const ALTURA = 300;
    let canvas = null;

    function pontos() {
      const tabela = secao.bloco(b.tabela);
      return b.pontos.map(function (chave) {
        return { rotulo: chave.toUpperCase(), valor: tabela.valor(chave, 0) };
      });
    }

    function desenhar() {
      const ctx = canvas.getContext("2d");
      const lista = pontos();
      const maior = Math.max.apply(null, [b.maximo].concat(lista.map(function (p) { return p.valor || 0; })));
      const topo = Math.ceil(maior / 3) * 3;
      const area = { x: 48, y: 22, w: LARGURA - 72, h: ALTURA - 70 };

      ctx.clearRect(0, 0, LARGURA, ALTURA);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, LARGURA, ALTURA);
      ctx.font = "13px Figtree, Arial, sans-serif";
      ctx.textBaseline = "middle";

      for (let v = 0; v <= topo; v += 3) {
        const y = area.y + area.h - (v / topo) * area.h;
        ctx.strokeStyle = v === 0 ? "#555555" : "#e1e1e1";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(area.x, y);
        ctx.lineTo(area.x + area.w, y);
        ctx.stroke();
        ctx.fillStyle = "#666666";
        ctx.textAlign = "right";
        ctx.fillText(String(v), area.x - 10, y);
      }

      const folga = 24;
      const passo = (area.w - folga * 2) / (lista.length - 1);
      const posicoes = lista.map(function (p, i) {
        return {
          x: area.x + folga + i * passo,
          y: p.valor === null ? null : area.y + area.h - (Math.min(p.valor, topo) / topo) * area.h
        };
      });

      ctx.textAlign = "center";
      ctx.fillStyle = "#333333";
      lista.forEach(function (p, i) {
        ctx.fillText(p.rotulo, posicoes[i].x, area.y + area.h + 20);
      });

      ctx.strokeStyle = "#2b5e4e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let continuando = false;
      posicoes.forEach(function (pos) {
        if (pos.y === null) {
          continuando = false;
          return;
        }
        if (continuando) ctx.lineTo(pos.x, pos.y);
        else ctx.moveTo(pos.x, pos.y);
        continuando = true;
      });
      ctx.stroke();

      posicoes.forEach(function (pos, i) {
        if (pos.y === null) return;
        ctx.fillStyle = "#2b5e4e";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1f2e2a";
        ctx.font = "600 13px Figtree, Arial, sans-serif";
        ctx.fillText(formatarNumero(lista[i].valor), pos.x, pos.y - 15);
        ctx.font = "13px Figtree, Arial, sans-serif";
      });
    }

    function temPontos() {
      return pontos().some(function (p) { return p.valor !== null; });
    }

    return {
      montar: function (container) {
        const caixa = criar("figure", "grafico");
        caixa.appendChild(criar("figcaption", "label", b.titulo));
        canvas = criar("canvas", "grafico-canvas");
        canvas.width = LARGURA;
        canvas.height = ALTURA;
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", b.titulo);
        caixa.appendChild(canvas);
        container.appendChild(caixa);
      },
      atualizar: desenhar,
      preenchido: function () { return false; },
      completo: function () { return true; },
      relatorio: function () {
        if (!temPontos()) return [];
        desenhar();
        return [{
          tipo: "imagem",
          titulo: b.titulo,
          imagem: canvas.toDataURL("image/png"),
          largura: 150,
          altura: 150 * ALTURA / LARGURA
        }];
      }
    };
  }

  /* Quadro de Humor e comportamento: resultados de outras abas e escores digitados. */
  function blocoResultados(secao, b) {
    const linhas = [];

    function nome(n) {
      return secao.id + "-" + b.id + "-" + n;
    }

    function resultadoDe(item, i) {
      if (item.origem) {
        if (contexto.origens[item.origem]) return contexto.origens[item.origem]();
        return resultado(item.origem);
      }
      const n = numero(valorDe(nome(i + 1)));
      if (n === null) return null;
      const r = item.interpretar(n);
      return { valor: formatarNumero(n), texto: r.texto, nivel: r.nivel };
    }

    return {
      montar: function (container) {
        const rolagem = criar("div", "tabela-rolagem");
        const tabela = criar("table", "tabela-teste");
        const thead = criar("thead");
        const tr = criar("tr");
        ["Escalas, inventários e questionários", "Resultado", "Interpretação"].forEach(function (t, i) {
          tr.appendChild(criar("th", i === 1 ? "estreita" : "", t));
        });
        thead.appendChild(tr);
        tabela.appendChild(thead);
        const tbody = criar("tbody");
        b.itens.forEach(function (item, i) {
          const linha = criar("tr");
          const th = criar("th", "", item.rotulo);
          th.scope = "row";
          linha.appendChild(th);
          const tdValor = criar("td", "estreita");
          let saida = null;
          if (item.origem) {
            saida = criar("output", "calc", "—");
            tdValor.appendChild(saida);
          } else {
            const input = criar("input", "input input-tabela");
            input.type = "number";
            input.min = "0";
            input.max = String(item.maximo);
            input.step = "1";
            input.inputMode = "numeric";
            input.name = nome(i + 1);
            input.setAttribute("aria-label", item.rotulo + " – resultado");
            input.title = item.rotulo + " (de 0 a " + item.maximo + ")";
            limitarMaximo(input, item.maximo, item.rotulo);
            tdValor.appendChild(input);
          }
          linha.appendChild(tdValor);
          const tdTexto = criar("td");
          const seloEl = criar("span", "selo");
          tdTexto.appendChild(seloEl);
          linha.appendChild(tdTexto);
          tbody.appendChild(linha);
          linhas.push({ item: item, saida: saida, selo: seloEl });
        });
        tabela.appendChild(tbody);
        rolagem.appendChild(tabela);
        container.appendChild(rolagem);
      },
      atualizar: function () {
        linhas.forEach(function (l, i) {
          const r = resultadoDe(l.item, i);
          if (l.saida) l.saida.value = r ? r.valor : "—";
          selo(l.selo, r ? r.texto : (l.item.origem ? "Preencha a aba correspondente" : "—"), r ? r.nivel : "");
        });
      },
      preenchido: function () {
        return b.itens.some(function (item, i) { return resultadoDe(item, i); });
      },
      completo: function () {
        return b.itens.every(function (item, i) { return item.origem || resultadoDe(item, i); });
      },
      relatorio: function () {
        const corpo = [];
        b.itens.forEach(function (item, i) {
          const r = resultadoDe(item, i);
          if (r) corpo.push([item.rotulo, r.valor, r.texto]);
        });
        if (!corpo.length) return [];
        return [{
          tipo: "tabela",
          cabecalho: ["Escalas, inventários e questionários", "Resultado", "Interpretação"],
          linhas: corpo,
          estilos: { 1: { cellWidth: 24, halign: "center" }, 2: { cellWidth: 62 } }
        }];
      }
    };
  }

  /* Assinaturas dos profissionais (Conclusão): já vêm preenchidas e podem ser editadas. */
  function blocoAssinaturas(secao, b) {
    function nome(n, campo) {
      return secao.id + "-" + b.id + "-" + n + "-" + campo;
    }

    function campoTexto(rotulo, nomeCampo, padrao) {
      const campo = criar("div", "field");
      const label = criar("label", "label", rotulo);
      label.htmlFor = nomeCampo;
      const input = criar("input", "input");
      input.type = "text";
      input.id = nomeCampo;
      input.name = nomeCampo;
      input.defaultValue = padrao;
      input.title = rotulo;
      input.autocomplete = "off";
      campo.appendChild(label);
      campo.appendChild(input);
      return campo;
    }

    return {
      montar: function (container) {
        container.appendChild(criar("h3", "escala-grupo", "Assinaturas"));
        const grade = criar("div", "campos-grade");
        b.pessoas.forEach(function (pessoa, i) {
          grade.appendChild(campoTexto("Profissional " + (i + 1), nome(i + 1, "nome"), pessoa.nome));
          grade.appendChild(campoTexto("Registro " + (i + 1), nome(i + 1, "registro"), pessoa.registro));
        });
        container.appendChild(grade);
      },
      preenchido: function () { return false; },
      completo: function () { return true; },
      relatorio: function () {
        const pessoas = b.pessoas.map(function (pessoa, i) {
          return { nome: valorDe(nome(i + 1, "nome")), registro: valorDe(nome(i + 1, "registro")) };
        }).filter(function (p) { return p.nome || p.registro; });
        return pessoas.length ? [{ tipo: "assinaturas", pessoas: pessoas }] : [];
      }
    };
  }

  const TIPOS = {
    opcoes: blocoOpcoes,
    escolhas: blocoEscolhas,
    checklist: blocoChecklist,
    lista: blocoLista,
    tabela: blocoTabela,
    texto: blocoTexto,
    campos: blocoCampos,
    paragrafo: blocoEstatico("paragrafo", "paragrafo"),
    nota: blocoEstatico("escala-legenda", "nota"),
    subtitulo: blocoEstatico("escala-grupo subtitulo", "subtitulo"),
    frase: blocoFrase,
    grafico: blocoGrafico,
    resultados: blocoResultados,
    assinaturas: blocoAssinaturas
  };

  /* ---------- Etapas ---------- */

  function montarResumo(secao) {
    const caixas = secao.def.resumo(secao.api);
    secao.resumoEl.textContent = "";
    caixas.forEach(function (caixa) {
      const dado = criar("div", "resumo-dado" + (caixa.selo !== undefined ? " resumo-largo" : ""));
      dado.appendChild(criar("span", "resumo-rotulo", caixa.rotulo));
      if (caixa.selo !== undefined) {
        const s = criar("span", "selo");
        selo(s, caixa.selo, caixa.nivel);
        dado.appendChild(s);
      } else {
        const valor = criar("span", "resumo-valor");
        valor.appendChild(criar("strong", "", String(caixa.valor)));
        if (caixa.de) valor.appendChild(document.createTextNode(" / " + caixa.de));
        dado.appendChild(valor);
      }
      secao.resumoEl.appendChild(dado);
    });
  }

  function montarSecao(def) {
    const el = document.getElementById("secao-" + def.id);
    if (!el) return;
    const secao = { id: def.id, def: def, el: el, blocos: [], porBloco: {}, resumoEl: null };
    secao.bloco = function (id) { return secao.porBloco[id]; };
    secao.api = { bloco: secao.bloco };

    const cabeca = criar("div", "card-head");
    cabeca.appendChild(criar("h2", "card-title", def.titulo));
    if (def.descricao) cabeca.appendChild(criar("p", "card-text", def.descricao));
    el.appendChild(cabeca);

    if (def.resumo) {
      secao.resumoEl = criar("div", "escala-resumo");
      el.appendChild(secao.resumoEl);
    }

    def.blocos.forEach(function (b) {
      const bloco = TIPOS[b.tipo](secao, b);
      bloco.tipo = b.tipo;
      bloco.montar(el);
      secao.blocos.push(bloco);
      if (b.id) secao.porBloco[b.id] = bloco;
    });

    secoes.push(secao);
    porId[def.id] = secao;
  }

  function atualizar() {
    secoes.forEach(function (secao) {
      secao.blocos.forEach(function (bloco) {
        if (bloco.atualizar) bloco.atualizar();
      });
      if (secao.resumoEl) montarResumo(secao);
    });
  }

  function preenchida(id) {
    const secao = porId[id];
    return !!secao && secao.blocos.some(function (bloco) { return bloco.preenchido(); });
  }

  /* Todos os campos da etapa preenchidos (aba 100%). */
  function completa(id) {
    const secao = porId[id];
    return !!secao && secao.blocos.every(function (bloco) { return bloco.completo(); });
  }

  /* Resultado resumido da etapa (usado no quadro de Humor e comportamento). */
  function resultado(id) {
    const secao = porId[id];
    if (!secao || !secao.def.resultado) return null;
    return secao.def.resultado(secao.api);
  }

  /* Conteúdo da etapa para o relatório, ou null se não houver nada para imprimir.
     Subtítulos dividem a etapa em grupos; os textos fixos de um grupo só entram
     quando algo do grupo foi preenchido. */
  function relatorio(id) {
    const secao = porId[id];
    if (!secao) return null;
    const temDados = preenchida(id);
    if (!temDados && !secao.def.sempreImprimir) return null;

    const blocos = [];
    const r = resultado(id);
    if (r) {
      const caixas = secao.def.resumo(secao.api).filter(function (caixa) {
        return caixa.selo !== "";
      }).map(function (caixa) {
        return [caixa.rotulo, caixa.selo !== undefined ? caixa.selo
          : String(caixa.valor) + (caixa.de ? " / " + caixa.de : "")];
      });
      blocos.push({ tipo: "caixas", caixas: caixas });
    }

    const grupos = [[]];
    secao.blocos.forEach(function (bloco) {
      if (bloco.tipo === "subtitulo") grupos.push([]);
      grupos[grupos.length - 1].push(bloco);
    });
    grupos.forEach(function (grupo) {
      const grupoPreenchido = grupo.some(function (bloco) { return bloco.preenchido(); });
      grupo.forEach(function (bloco) {
        bloco.relatorio(grupoPreenchido).forEach(function (item) { blocos.push(item); });
      });
    });

    return blocos.length ? { titulo: secao.def.titulo, blocos: blocos } : null;
  }

  function iniciar(formulario, opcoes) {
    form = formulario;
    contexto = Object.assign(contexto, opcoes || {});
    DEFINICOES.forEach(montarSecao);
    atualizar();
  }

  return {
    iniciar: iniciar,
    atualizar: atualizar,
    preenchida: preenchida,
    completa: completa,
    resultado: resultado,
    relatorio: relatorio,
    existe: function (id) { return !!porId[id]; }
  };
})();
