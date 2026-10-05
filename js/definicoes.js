/* Conteúdo das etapas montadas automaticamente (textos, itens, colunas e cálculos da planilha).
   Dados do paciente, Escala Cornell e Relógio de Shulman têm arquivos próprios. */

const CLASSE_3 = ["Abaixo do esperado", "Dentro do esperado", "Acima do esperado"];
const CLASSE_2 = ["Abaixo do esperado", "Dentro do esperado"];
const CLASSE_2_INVERTIDA = ["Dentro do esperado", "Abaixo do esperado"];

/* Soma só os valores preenchidos; devolve null se nenhum foi preenchido. */
function somaPreenchidos(valores) {
  const preenchidos = valores.filter(function (v) { return v !== null; });
  if (!preenchidos.length) return null;
  return preenchidos.reduce(function (total, v) { return total + v; }, 0);
}

function formatarNumero(n) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function razao(a, b) {
  if (a === null || b === null || b === 0) return null;
  return Math.round((a / b) * 100) / 100;
}

const KATZ_INTERPRETACAO = [
  "Independente em todas as seis funções",
  "Independente em cinco funções e dependente em uma função",
  "Independente em quatro funções e dependente em duas funções",
  "Independente em três funções e dependente em três funções",
  "Independente em duas funções e dependente em quatro funções",
  "Independente em uma função e dependente em cinco funções",
  "Dependente em todas as seis funções"
];

/* RAVLT: valores de referência por faixa de idade (60 a 89 anos), [homem, mulher]. */
const RAVLT_FAIXAS = [[60, 64], [65, 69], [70, 74], [75, 79], [80, 84], [85, 89]];

function referenciaRavlt(valores) {
  return RAVLT_FAIXAS.map(function (faixa, i) {
    return { de: faixa[0], ate: faixa[1], homem: valores[i][0], mulher: valores[i][1] };
  });
}

const RAVLT_REFERENCIA = {
  a1: referenciaRavlt([[5.6, 6.0], [5.3, 6.0], [5.0, 6.1], [4.9, 4.8], [3.5, 4.9], [4.1, 4.5]]),
  a2: referenciaRavlt([[7.6, 7.9], [7.8, 8.7], [7.4, 7.6], [6.3, 5.9], [5.5, 8.1], [6.1, 8.0]]),
  a3: referenciaRavlt([[9.0, 10.0], [9.0, 9.9], [7.8, 9.4], [7.0, 6.9], [6.5, 6.9], [6.6, 6.5]]),
  a4: referenciaRavlt([[10.2, 11.3], [9.9, 10.8], [10.0, 10.7], [8.0, 8.0], [8.5, 7.9], [7.8, 7.4]]),
  a5: referenciaRavlt([[11.8, 12.2], [11.1, 12.0], [10.1, 11.3], [10.7, 10.5], [9.4, 10.1], [9.5, 10.1]]),
  b1: referenciaRavlt([[4.6, 4.7], [4.4, 5.0], [4.4, 4.8], [4.1, 3.7], [2.8, 3.0], [3.8, 3.6]]),
  a6: referenciaRavlt([[10.7, 11.1], [9.3, 10.6], [9.2, 9.5], [8.4, 8.6], [8.2, 9.2], [7.4, 7.5]]),
  a7: referenciaRavlt([[9.8, 10.6], [9.1, 10.5], [8.2, 9.2], [7.9, 7.9], [7.2, 7.3], [6.1, 6.6]]),
  itp: referenciaRavlt([[0.9, 0.8], [0.8, 0.9], [0.9, 0.8], [0.8, 0.8], [0.8, 0.6], [0.9, 0.9]]),
  itr: referenciaRavlt([[0.9, 0.9], [0.8, 0.9], [0.9, 0.8], [0.8, 0.8], [0.9, 0.9], [0.8, 0.7]]),
  ve: referenciaRavlt([[0.9, 1.0], [1.0, 1.0], [0.9, 1.0], [0.9, 0.9], [0.9, 0.8], [0.8, 0.9]]),
  total: referenciaRavlt([[44.2, 47.3], [43.1, 47.5], [40.3, 45.0], [36.8, 36.1], [33.3, 35.8], [34.0, 34.8]]),
  rec: referenciaRavlt([[10.8, 11.9], [9.6, 11.6], [7.2, 9.0], [7.5, 6.2], [5.5, 6.1], [2.3, 6.2]])
};

const IQCODE_CORTE = 3.5;
const IQCODE_DIVISOR = 26;

const PFEFFER_OPCOES = [
  { valor: "0", rotulo: "Normal, ou nunca o fez mas poderia fazê-lo agora", pontos: 0 },
  { valor: "1", rotulo: "Faz com dificuldades, ou nunca o fez e agora teria dificuldades", pontos: 1 },
  { valor: "2", rotulo: "Necessita de ajuda", pontos: 2 },
  { valor: "3", rotulo: "Não é capaz", pontos: 3 }
];

function interpretarGai(n) {
  return n >= 10 ? { texto: "Sugere ansiedade em nível significativo", nivel: "alto" }
    : { texto: "Sem ansiedade em nível significativo", nivel: "baixo" };
}

function interpretarGds(n) {
  if (n > 10) return { texto: "Sintomas depressivos em nível grave", nivel: "alto" };
  if (n >= 5) return { texto: "Pode sugerir sintomas depressivos leves a moderados", nivel: "medio" };
  return { texto: "Normal", nivel: "baixo" };
}

function interpretarBhs(n) {
  if (n >= 14) return { texto: "Desesperança grave", nivel: "alto" };
  if (n >= 9) return { texto: "Desesperança moderada", nivel: "alto" };
  if (n >= 5) return { texto: "Desesperança leve", nivel: "medio" };
  return { texto: "Desesperança mínima", nivel: "baixo" };
}

const DEFINICOES = [
  {
    id: "resumo",
    titulo: "Resumo",
    descricao: "Fatores de risco do paciente. Marque Sim, Não ou Não disponível para cada item.",
    blocos: [
      {
        tipo: "opcoes",
        id: "fatores",
        colunaItem: "Fator de risco",
        opcoes: [
          { valor: "sim", rotulo: "Sim" },
          { valor: "nao", rotulo: "Não" },
          { valor: "nd", rotulo: "Não disponível" }
        ],
        itens: [
          "Histórico familiar de 1° grau para DA",
          "Baixa escolaridade",
          "Hipertensão arterial",
          "Hiperlipidemia",
          "Obesidade",
          "Gene APOE (preditor de risco para DA de início tardio)",
          "Pouca atividade física",
          "Tabagismo",
          "Histórico de traumatismo craniano",
          "Histórico de acidente vascular encefálico",
          "Histórico de depressão",
          "Diabetes",
          "Uso de álcool e/ou substâncias benzodiazepínicas",
          "Traumatismo craniano",
          "Deficiência auditiva",
          "Deficiência visual"
        ]
      }
    ]
  },

  {
    id: "funcoes",
    titulo: "Funções avaliadas",
    descricao: "Desmarque as funções que não foram avaliadas. A lista marcada entra no relatório.",
    blocos: [
      {
        tipo: "checklist",
        id: "lista",
        outros: "Outras funções avaliadas",
        itens: [
          "Atenção",
          "Orientação",
          "Memória Verbal, Não Verbal, Visual e Lógica",
          "Capacidade de Aprendizado",
          "Conhecimentos Gerais",
          "Linguagem Expressiva e Receptiva",
          "Percepção",
          "Praxias",
          "Cálculo",
          "Destreza visuo-motora",
          "Raciocínio lógico",
          "Habilidade Construtiva",
          "Capacidade de Planejamento",
          "Capacidade de Abstração",
          "Humor"
        ]
      }
    ]
  },

  {
    id: "protocolos",
    titulo: "Protocolos aplicados",
    descricao: "Texto fixo: não há nada para preencher. Ele aparece somente na impressão do relatório completo.",
    sempreImprimir: true,
    blocos: [
      {
        tipo: "lista",
        id: "lista",
        introducao: "Foram aplicados protocolos fixos: CERAD (Consortium to Establish a Registry for Alzheimer's Disease) e testes complementares para todos os domínios cognitivos:",
        itens: [
          "Testes de Atenção",
          "Testes de Linguagem",
          "Teste das três figuras e três formas",
          "Testes de Memória Verbal, Não verbal, Visual e Lógica",
          "Testes de Funções Executivas (bateria de avaliação frontal)",
          "Teste das Trilhas",
          "Labirintos",
          "Testes de Interpretação",
          "Stroop Test",
          "Testes de Figuras Geométricas",
          "Mini Exame do Estado Mental",
          "Montreal Cognitive Assessment (MoCA)",
          "Fluência Verbal – Fonética e Semântica",
          "Curva de Aprendizagem Verbal – RAVLT",
          "Teste de Dígitos",
          "Testes de Controle Atencional",
          "TMR (teste de memória de reconhecimento)",
          "Praxias Construtivas",
          "Testes de Gnosias",
          "Teste dos Cinco pontos",
          "Teste do Relógio",
          "Escala de Depressão Geriátrica (GDS)",
          "Escala de Atividades Instrumentais de Vida Diária (Lawton)",
          "IQCODE (Informant Questionnaire on Cognitive Decline in Elderly)",
          "Escalas de Beck",
          "Escala Cornell para depressão",
          "Subtestes: Completar Figuras, Códigos, Semelhanças, Dígitos, Cubos, Sequência de Números e Letras, Raciocínio Matricial"
        ]
      }
    ]
  },

  {
    id: "katz",
    titulo: "Escala de Katz",
    descricao: "Para cada área de funcionamento, assinale a descrição que se aplica ao paciente (a palavra “ajuda” significa supervisão, orientação ou auxílio pessoal).",
    blocos: [
      {
        tipo: "escolhas",
        id: "itens",
        colunaItem: "Área de funcionamento",
        rotulosPontos: ["Independente", "Dependente"],
        itens: [
          {
            titulo: "Tomar banho (leito, banheira ou chuveiro)",
            pontos: [0, 0, 1],
            opcoes: [
              "Não recebe ajuda (entra e sai da banheira ou chuveiro sozinho(a))",
              "Recebe ajuda para lavar apenas uma parte do corpo (costas, perna)",
              "Recebe ajuda para lavar mais de uma parte do corpo, ou não toma banho sozinho(a)"
            ]
          },
          {
            titulo: "Vestir-se (pega roupas, inclusive peças íntimas nos armários e gavetas)",
            pontos: [0, 0, 1],
            opcoes: [
              "Pega as roupas e veste-se completamente, sem ajuda",
              "Pega as roupas e veste-se sem ajuda, exceto para amarrar os sapatos",
              "Recebe ajuda para pegar as roupas ou vestir-se, ou permanece parcial ou completamente sem roupa"
            ]
          },
          {
            titulo: "Uso do vaso sanitário (ida ao banheiro, higiene íntima e arrumação das roupas)",
            pontos: [0, 1, 1],
            opcoes: [
              "Vai ao banheiro, limpa-se e ajeita as roupas sem ajuda (pode usar bengala, andador ou cadeira de rodas e pode usar comadre ou urinol à noite)",
              "Recebe ajuda para ir ao banheiro ou para limpar-se ou para ajeitar as roupas após evacuação ou micção, ou para usar comadre ou urinol à noite",
              "Não vai ao banheiro para eliminações fisiológicas"
            ]
          },
          {
            titulo: "Transferência",
            pontos: [0, 1, 1],
            opcoes: [
              "Deita-se e sai da cama, senta-se e levanta-se da cadeira sem ajuda (pode estar usando objeto para apoio como bengala ou andador)",
              "Deita-se e sai da cama e/ou senta-se e levanta-se da cadeira com ajuda",
              "Não sai da cama"
            ]
          },
          {
            titulo: "Continência",
            pontos: [0, 1, 1],
            opcoes: [
              "Controla inteiramente a micção e evacuação",
              "Tem acidentes ocasionais",
              "Necessita de ajuda para manter o controle da micção e evacuação; usa cateter ou é incontinente"
            ]
          },
          {
            titulo: "Alimentação",
            pontos: [0, 0, 1],
            opcoes: [
              "Alimenta-se sem ajuda",
              "Alimenta-se sozinho(a), mas recebe ajuda para cortar carne ou passar manteiga no pão",
              "Recebe ajuda para alimentar-se, ou é alimentado(a) parcialmente ou completamente pelo uso de cateteres ou fluidos intravenosos"
            ]
          }
        ]
      },
      {
        tipo: "nota",
        texto: "Pontuação: 0 independente em todas as seis funções; 1 independente em cinco e dependente em uma; 2 independente em quatro e dependente em duas; 3 independente em três e dependente em três; 4 independente em duas e dependente em quatro; 5 independente em uma e dependente em cinco; 6 dependente em todas as seis funções. Ref.: Adaptação Transcultural da Escala de Independência em Atividades da Vida Diária (Escala de Katz). Cad. Saúde Pública, Rio de Janeiro, 2007 – Lino, Pereira, Camacho, Telles e Buksman."
      }
    ],
    resultado: function (s) {
      const r = s.bloco("itens").pontuacao();
      if (!r.respondidos) return null;
      const parcial = r.respondidos < r.totalItens;
      return {
        valor: String(r.total),
        texto: parcial ? "Parcial: " + r.respondidos + " de " + r.totalItens + " áreas avaliadas"
          : KATZ_INTERPRETACAO[r.total],
        nivel: parcial ? "" : r.total === 0 ? "baixo" : r.total <= 2 ? "medio" : "alto"
      };
    },
    resumo: function (s) {
      const r = s.bloco("itens").pontuacao();
      const resultado = this.resultado(s);
      return [
        { rotulo: "Dependências", valor: r.total, de: "6" },
        { rotulo: "Áreas avaliadas", valor: r.respondidos, de: String(r.totalItens) },
        { rotulo: "Interpretação", selo: resultado ? resultado.texto : "Nenhuma área avaliada", nivel: resultado ? resultado.nivel : "" }
      ];
    }
  },

  {
    id: "pfeffer",
    titulo: "Questionário de Atividades Funcionais (Pfeffer)",
    descricao: "Pergunte ao informante sobre a capacidade do paciente em cada atividade.",
    blocos: [
      { tipo: "campos", id: "avaliador", itens: ["Avaliador"] },
      {
        tipo: "opcoes",
        id: "itens",
        colunaItem: "Atividade",
        empilhado: true,
        mostrarPontos: true,
        opcoes: PFEFFER_OPCOES,
        itens: [
          "Ele(a) manuseia seu próprio dinheiro?",
          "Ele(a) é capaz de comprar roupas, comida, coisas para casa sozinho(a)?",
          "Ele(a) é capaz de esquentar água para o café e apagar o fogo?",
          "Ele(a) é capaz de preparar uma comida?",
          "Ele(a) é capaz de manter-se em dia com as atualidades, com os acontecimentos da comunidade ou da vizinhança?",
          "Ele(a) é capaz de prestar atenção, entender e discutir um programa de rádio ou televisão, um jornal ou uma revista?",
          "Ele(a) é capaz de lembrar-se de compromissos, acontecimentos familiares, feriados?",
          "Ele(a) é capaz de manusear seus próprios remédios?",
          "Ele(a) é capaz de passear pela vizinhança e encontrar o caminho de volta para casa?",
          {
            texto: "Ele(a) pode ser deixado(a) em casa sozinho(a) de forma segura?",
            opcoes: [
              { valor: "0", rotulo: "Normal ou nunca ficou, mas poderia ficar agora", pontos: 0 },
              { valor: "1", rotulo: "Sim, mas com precauções ou nunca ficou e agora teria dificuldade", pontos: 1 },
              { valor: "2", rotulo: "Sim, por períodos curtos", pontos: 2 },
              { valor: "3", rotulo: "Não poderia", pontos: 3 }
            ]
          }
        ]
      }
    ],
    resultado: function (s) {
      const r = s.bloco("itens").pontuacao();
      if (!r.respondidos) return null;
      return {
        valor: String(r.total),
        texto: r.respondidos < r.totalItens ? "Parcial: " + r.respondidos + " de " + r.totalItens + " respondidos" : "",
        nivel: ""
      };
    },
    resumo: function (s) {
      const r = s.bloco("itens").pontuacao();
      return [
        { rotulo: "Pontuação total", valor: r.total, de: "30" },
        { rotulo: "Respondidos", valor: r.respondidos, de: String(r.totalItens) }
      ];
    }
  },

  {
    id: "iqcode",
    titulo: "IQCODE (Informant Questionnaire on Cognitive Decline in Elderly)",
    descricao: "Peça ao informante que se lembre de como o paciente estava há 10 anos e compare com o estado atual. Se a pessoa nunca fez a tarefa, marque “Não se aplica”; se o familiar não tiver certeza, marque “Não sabe”.",
    blocos: [
      {
        tipo: "opcoes",
        id: "itens",
        colunaItem: "Comparado a 10 anos atrás, como essa pessoa está em",
        empilhado: true,
        mostrarPontos: true,
        opcoes: [
          { valor: "1", rotulo: "Muito melhor", pontos: 1 },
          { valor: "2", rotulo: "Melhor", pontos: 2 },
          { valor: "3", rotulo: "Não muito alterado", pontos: 3 },
          { valor: "4", rotulo: "Pior", pontos: 4 },
          { valor: "5", rotulo: "Muito pior", pontos: 5 },
          { valor: "na", rotulo: "Não se aplica", pontos: 0, semPontos: true },
          { valor: "ns", rotulo: "Não sabe", pontos: 0, semPontos: true }
        ],
        itens: [
          "Reconhecer familiares e amigos",
          "Lembrar-se dos nomes dos familiares e amigos",
          "Lembrar-se de fatos sobre os familiares e amigos (ex.: profissão, aniversários, endereços)",
          "Lembrar-se de fatos que aconteceram há pouco tempo",
          "Lembrar-se de conversas dos últimos dias",
          "Esquecer o que queria dizer no meio da conversa",
          "Lembrar-se do seu próprio endereço e telefone",
          "Lembrar-se em que dia e mês estamos",
          "Lembrar-se onde as coisas são guardadas atualmente (roupas, talheres etc.)",
          "Lembrar onde encontrar coisas que foram guardadas em lugares diferentes daqueles em que costumava guardar",
          "Adaptar-se a qualquer mudança no dia a dia",
          "Saber utilizar aparelhos domésticos",
          "Aprender a usar um aparelho doméstico novo",
          "Aprender coisas novas em geral",
          "Lembrar-se de coisas que aconteceram na sua juventude",
          "Lembrar-se de coisas que aprendeu na sua juventude",
          "Entender o significado de palavras pouco utilizadas",
          "Entender artigos de revistas e jornais",
          "Acompanhar histórias em livros ou televisão (filmes, seriados, novelas)",
          "Escrever para amigos ou para fins profissionais",
          "Conhecer fatos históricos importantes",
          "Tomar decisões no dia a dia",
          "Lidar com dinheiro para as compras",
          "Lidar com suas finanças (conta bancária, aposentadoria)",
          "Lidar com outros cálculos do dia a dia, por exemplo: quantidade de comida a comprar, há quanto tempo não recebe visitas de amigos ou parentes",
          "Compreender e pensar sobre o que se passa à sua volta"
        ]
      },
      {
        tipo: "nota",
        texto: "Cálculo: cada coluna vale o número indicado no topo (Muito melhor 1, Melhor 2, Não muito alterado 3, Pior 4, Muito pior 5). Soma-se o valor da coluna vezes a quantidade de vezes que ela foi marcada e o resultado é dividido por " + IQCODE_DIVISOR + ". “Não se aplica” e “Não sabe” não somam pontos. Escores maiores ou iguais a 3,5 sugerem declínio cognitivo frente ao nível pré-mórbido."
      }
    ],
    resultado: function (s) {
      const r = s.bloco("itens").pontuacao();
      if (!r.respondidos) return null;
      const escore = Math.round((r.total / IQCODE_DIVISOR) * 100) / 100;
      const alterado = escore >= IQCODE_CORTE;
      return {
        valor: formatarNumero(escore),
        texto: (alterado ? "Sugere declínio cognitivo" : "Sem indicação de declínio cognitivo") +
          (r.respondidos < r.totalItens ? " (parcial)" : ""),
        nivel: alterado ? "alto" : "baixo"
      };
    },
    resumo: function (s) {
      const r = s.bloco("itens").pontuacao();
      const resultado = this.resultado(s);
      return [
        { rotulo: "Total (soma ÷ " + IQCODE_DIVISOR + ")", valor: resultado ? resultado.valor : "—" },
        { rotulo: "Respondidos", valor: r.respondidos, de: String(r.totalItens) },
        { rotulo: "Interpretação", selo: resultado ? resultado.texto : "Nenhum item respondido", nivel: resultado ? resultado.nivel : "" }
      ];
    }
  },

  {
    id: "humor",
    titulo: "Humor e comportamento",
    descricao: "Escalas, inventários e questionários. Katz, Pfeffer, IQCODE e Cornell vêm das próprias abas; GAI, GDS e BHS são digitados aqui.",
    blocos: [
      {
        tipo: "resultados",
        id: "escalas",
        itens: [
          { rotulo: "Escala de independência para as atividades de vida diária (Katz)", origem: "katz" },
          { rotulo: "Questionário de atividades funcionais (Pfeffer)", origem: "pfeffer" },
          { rotulo: "IQCODE (investigação de declínio cognitivo)", origem: "iqcode" },
          { rotulo: "GAI (inventário de ansiedade) autorrelato", maximo: 20, interpretar: interpretarGai },
          { rotulo: "GDS (Yesavage escala de depressão) autorrelato", maximo: 15, interpretar: interpretarGds },
          { rotulo: "Cornell escala para depressão (relato familiar)", origem: "cornell" },
          { rotulo: "BHS (escala de desesperança) autorrelato", maximo: 20, interpretar: interpretarBhs }
        ]
      },
      {
        tipo: "nota",
        texto: "Katz: 0 independente em todas as seis funções a 6 dependente em todas. Pfeffer: pontuação total de 0 a 30. GAI: 10 ou mais sugere ansiedade em nível significativo. GDS (Yesavage): 0 a 4 normal; 5 a 10 pode sugerir sintomas depressivos leves a moderados; acima de 10 sintomas depressivos graves. Cornell: 0 a 8 ausência de depressão; 9 a 11 depressão leve; 12 ou mais depressão moderada a grave. IQCODE: escores maiores ou iguais a 3,5 sugerem declínio cognitivo frente ao nível pré-mórbido. BHS: 0 a 4 desesperança mínima; 5 a 8 leve; 9 a 13 moderada; 14 a 20 grave."
      }
    ]
  },

  {
    id: "moca",
    titulo: "Montreal Cognitive Assessment (MoCA)",
    descricao: "Digite o escore do paciente em cada domínio. O total é calculado automaticamente.",
    blocos: [
      {
        tipo: "tabela",
        id: "dominios",
        colunaRotulo: "Domínio",
        colunas: [
          { rotulo: "Escore do paciente", tipo: "numero" },
          { rotulo: "Escore máximo", tipo: "fixo" }
        ],
        linhas: [
          { rotulo: "Visuoespacial / Funções executivas", chave: "visuo", maximo: 5, fixos: ["", "5"] },
          { rotulo: "Nomeação", chave: "nomeacao", maximo: 3, fixos: ["", "3"] },
          { rotulo: "Atenção: sequência de números", chave: "numeros", maximo: 2, fixos: ["", "2"] },
          { rotulo: "Atenção: letras", chave: "letras", maximo: 1, fixos: ["", "1"] },
          { rotulo: "Atenção: subtração", chave: "subtracao", maximo: 3, fixos: ["", "3"] },
          { rotulo: "Linguagem (repetição)", chave: "repeticao", maximo: 2, fixos: ["", "2"] },
          { rotulo: "Linguagem (fluência verbal)", chave: "fluencia", maximo: 1, fixos: ["", "1"] },
          { rotulo: "Abstração", chave: "abstracao", maximo: 2, fixos: ["", "2"] },
          { rotulo: "Memória e evocação tardia", chave: "memoria", maximo: 5, fixos: ["", "5"] },
          { rotulo: "Orientação", chave: "orientacao", maximo: 6, fixos: ["", "6"] },
          {
            rotulo: "Total",
            chave: "total",
            destaque: true,
            fixos: ["", "30"],
            calculos: {
              0: function (t) {
                return somaPreenchidos(["visuo", "nomeacao", "numeros", "letras", "subtracao",
                  "repeticao", "fluencia", "abstracao", "memoria", "orientacao"].map(function (k) { return t.num(k, 0); }));
              }
            }
          }
        ]
      }
    ],
    resumo: function (s) {
      const total = s.bloco("dominios").valor("total", 0);
      return [{ rotulo: "Escore total", valor: total === null ? "—" : total, de: "30" }];
    }
  },

  {
    id: "cerad",
    titulo: "Bateria do CERAD e Funções executivas",
    descricao: "CERAD (Consortium to Establish a Registry for Alzheimer's Disease) e Bateria de Avaliação Frontal (FAB).",
    blocos: [
      {
        tipo: "tabela",
        id: "cerad",
        titulo: "Bateria do CERAD",
        colunaRotulo: "Teste",
        colunas: [
          { rotulo: "Escore obtido", tipo: "texto" },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_2_INVERTIDA }
        ],
        linhas: [
          { rotulo: "Fluência verbal: Animais" },
          { rotulo: "Fluência verbal: Frutas" },
          { rotulo: "Nomeação de Boston" },
          { rotulo: "MoCA (Montreal Cognitive Assessment)" },
          { rotulo: "Memória verbal (fixação)" },
          { rotulo: "Praxia construtiva" },
          { rotulo: "Memória verbal (evocação)" },
          { rotulo: "Memória verbal (reconhecimento)" },
          { rotulo: "Evocação tardia da praxia" }
        ]
      },
      { tipo: "subtitulo", texto: "Funções executivas" },
      {
        tipo: "paragrafo",
        texto: "Conjunto de habilidades e princípios de organização necessários para lidar com situações visando adoção de conduta apropriada, responsável e efetiva. Incluem formulação de objetivos e de conceitos, motivação, planejamento, autorregulação, “insight”, abstração, análise, manipulação de conhecimentos adquiridos e flexibilidade mental. (Testes analisados: Stroop Test, Trilhas A e B, Semelhanças, Labirintos, Teste de Controle Mental, Teste de Fluência Verbal por categoria semântica e fonêmica, Teste do Relógio de Shulman, Teste dos Sinos, Interpretação de Provérbios.)"
      },
      {
        tipo: "tabela",
        id: "fab",
        titulo: "Bateria de Avaliação Frontal (FAB)",
        colunaRotulo: "Subteste",
        colunas: [
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_2_INVERTIDA }
        ],
        linhas: [
          { rotulo: "Controle inibitório" },
          { rotulo: "Fluência verbal" },
          { rotulo: "Similaridades" },
          { rotulo: "Sequências motoras (palma, punho, lado)" },
          { rotulo: "Instruções conflitantes (sensibilidade à interferência)" },
          { rotulo: "Preensão" }
        ]
      }
    ]
  },

  {
    id: "linguagem",
    titulo: "Linguagem",
    descricao: "Fluência verbal fonêmica e semântica, expressão, nomeação, leitura, escrita e compreensão.",
    blocos: [
      {
        tipo: "tabela",
        id: "fonemica",
        titulo: "Fluência fonêmica",
        colunaRotulo: "Teste",
        colunas: [
          { rotulo: "F", tipo: "numero", estreita: true },
          { rotulo: "A", tipo: "numero", estreita: true },
          { rotulo: "S", tipo: "numero", estreita: true },
          { rotulo: "Total", tipo: "calculo", estreita: true },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_3 }
        ],
        linhas: [
          {
            rotulo: "Fluência fonêmica (F-A-S)",
            chave: "fas",
            calculos: {
              3: function (t) { return somaPreenchidos([t.num("fas", 0), t.num("fas", 1), t.num("fas", 2)]); }
            }
          }
        ]
      },
      {
        tipo: "tabela",
        id: "semantica",
        titulo: "Fluência semântica",
        colunaRotulo: "Categoria",
        colunas: [
          { rotulo: "Escore", tipo: "numero" },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_3 }
        ],
        linhas: [
          { rotulo: "Animais" },
          { rotulo: "Frutas" }
        ]
      },
      {
        tipo: "paragrafo",
        texto: "Testes de fluência verbal: o teste de fluência semântica avalia a produção e a fluência da linguagem semântica por categoria, atenção sustentada, organização, memória semântica (que contém a representação permanente de nossos conhecimentos sobre objetos, fatos e conceitos), estratégia e perseveração. O teste de fluência fonêmica avalia linguagem, planejamento, organização, julgamento e atenção."
      },
      { tipo: "texto", id: "expressao", rotulo: "Expressão" },
      { tipo: "texto", id: "boston", rotulo: "Nomeação de Boston" },
      { tipo: "texto", id: "leitura", rotulo: "Leitura" },
      { tipo: "texto", id: "escrita", rotulo: "Escrita" },
      { tipo: "texto", id: "compreensao", rotulo: "Compreensão" }
    ]
  },

  {
    id: "curva",
    titulo: "Curva de aprendizagem",
    mostrarIdade: true,
    descricao: "Teste Auditivo Verbal de Rey (RAVLT): digite os escores; total, interferências e esquecimento são calculados automaticamente. A classificação (abaixo ou dentro do esperado) é definida pelo profissional, não pelo escore.",
    blocos: [
      {
        tipo: "tabela",
        id: "ravlt",
        titulo: "Memória verbal: lista de palavras",
        colunaRotulo: "Tentativa",
        colunas: [
          { rotulo: "Escore", tipo: "numero" },
          { rotulo: "Referência", tipo: "referencia" },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_2 }
        ],
        linhas: [
          { rotulo: "A1", chave: "a1", referencia: RAVLT_REFERENCIA.a1 },
          { rotulo: "A2", chave: "a2", referencia: RAVLT_REFERENCIA.a2 },
          { rotulo: "A3", chave: "a3", referencia: RAVLT_REFERENCIA.a3 },
          { rotulo: "A4", chave: "a4", referencia: RAVLT_REFERENCIA.a4 },
          { rotulo: "A5", chave: "a5", referencia: RAVLT_REFERENCIA.a5 },
          {
            rotulo: "Total A1 – A5",
            referencia: RAVLT_REFERENCIA.total,
            chave: "total",
            destaque: true,
            calculos: {
              0: function (t) {
                return somaPreenchidos(["a1", "a2", "a3", "a4", "a5"].map(function (k) { return t.num(k, 0); }));
              }
            }
          },
          { rotulo: "B1", chave: "b1", referencia: RAVLT_REFERENCIA.b1 },
          { rotulo: "A6", chave: "a6", referencia: RAVLT_REFERENCIA.a6 },
          { rotulo: "A7", chave: "a7", referencia: RAVLT_REFERENCIA.a7 },
          {
            rotulo: "Interferência proativa (B1/A1)",
            referencia: RAVLT_REFERENCIA.itp,
            calculos: { 0: function (t) { return razao(t.num("b1", 0), t.num("a1", 0)); } }
          },
          {
            rotulo: "Interferência retroativa (A6/A5)",
            referencia: RAVLT_REFERENCIA.itr,
            calculos: { 0: function (t) { return razao(t.num("a6", 0), t.num("a5", 0)); } }
          },
          {
            rotulo: "Esquecimento (A7/A6)",
            referencia: RAVLT_REFERENCIA.ve,
            calculos: { 0: function (t) { return razao(t.num("a7", 0), t.num("a6", 0)); } }
          },
          { rotulo: "Reconhecimento", chave: "reconhecimento", referencia: RAVLT_REFERENCIA.rec }
        ]
      },
      {
        tipo: "paragrafo",
        texto: "RAVLT – Teste de aprendizagem verbal que permite estabelecer uma curva de uma lista de palavras ao longo de 5 tentativas. A pontuação corresponde ao número de itens evocados. Permite avaliar ainda a repercussão da introdução de distratores (lista B), a evocação tardia após 30 minutos à exposição da lista A e a capacidade de reconhecimento na reapresentação das palavras da lista A. Estrutura da tarefa: A1 leitura da lista A seguida de recuperação imediata pelo paciente (A2, A3, A4, A5 – idem) / Leitura da lista B (um distrator) seguida da recuperação imediata pelo paciente / A6 – recuperação livre da lista A sem leitura do examinador. A7 (recuperação tardia) após 30 min da recuperação de A6. Reconhecimento tardio das palavras constantes da lista A que foi repetida e recuperada 5 vezes anteriormente."
      },
      {
        tipo: "grafico",
        id: "grafico",
        titulo: "Teste Auditivo Verbal de Rey – RAVLT",
        tabela: "ravlt",
        maximo: 15,
        pontos: ["a1", "a2", "a3", "a4", "a5", "a6", "a7"]
      },
      {
        tipo: "texto",
        id: "analise",
        rotulo: "Curva de aprendizagem",
        alto: true,
        placeholder: "Descreva o desempenho: memória de curto e longo prazo, interferências, reconhecimento, velocidade de esquecimento..."
      },
      { tipo: "subtitulo", texto: "Memória verbal e visual" },
      {
        tipo: "tabela",
        id: "memoria",
        colunaRotulo: "Teste",
        colunas: [
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_3 }
        ],
        linhas: [
          { rotulo: "Memória lógica imediata" },
          { rotulo: "Memória lógica tardia" },
          { rotulo: "Memória visual imediata: figuras geométricas" },
          { rotulo: "Memória visual evocação: figuras geométricas" },
          { rotulo: "Memória visual: memória de reconhecimento (TMR)" }
        ]
      },
      {
        tipo: "paragrafo",
        texto: "Memória lógica: recuperação de 2 histórias lógicas imediatamente após sua leitura (resgate imediato: memória lógica I) e após 30 min (resgate tardio: memória lógica II). Teste que avalia armazenamento e recuperação de informações. Memória visual: apresentação de figuras geométricas que devem ser reproduzidas de imediato (memória visual de curto prazo) e após aproximadamente 25 min (memória visual tardia)."
      }
    ]
  },

  {
    id: "digitspan",
    titulo: "Digit Span",
    descricao: "Memória imediata e memória operacional.",
    blocos: [
      {
        tipo: "tabela",
        id: "ordens",
        colunaRotulo: "Digit Span",
        colunas: [
          { rotulo: "Escore", tipo: "numero" },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_2 }
        ],
        linhas: [
          { rotulo: "Ordem direta (memória imediata)" },
          { rotulo: "Ordem inversa (memória operacional)" }
        ]
      },
      {
        tipo: "paragrafo",
        texto: "Teste que consiste em repetição seriada de números. Espera-se que o paciente seja capaz de repetir até 7 dígitos na ordem direta (7 ± 2) e 4 dígitos na ordem inversa."
      }
    ]
  },

  {
    id: "trilhas",
    titulo: "Trilhas",
    descricao: "Teste das Trilhas (formas A e B) e testes de atenção.",
    blocos: [
      {
        tipo: "paragrafo",
        texto: "Estes testes se referem à capacidade atentiva, destreza visuomotora, rapidez de processamento, capacidade de alternar continuamente conceitos distintos, flexibilidade cognitiva, resistência à interferência e rapidez na tomada de decisão."
      },
      {
        tipo: "tabela",
        id: "formas",
        titulo: "Teste das Trilhas",
        colunaRotulo: "Forma",
        colunas: [
          { rotulo: "Erros", tipo: "numero" },
          { rotulo: "Tempo (segundos)", tipo: "numero" },
          { rotulo: "Percentil", tipo: "numero" }
        ],
        linhas: [
          { rotulo: "Forma A" },
          { rotulo: "Forma B" }
        ]
      },
      { tipo: "subtitulo", texto: "Atenção" },
      {
        tipo: "paragrafo",
        texto: "Avaliada através de testes que aferem a capacidade de manter-se atento de forma continuada (atenção concentrada), de atentar seletivamente para informações relevantes a despeito de estímulos distratores (atenção seletiva), de ser capaz de ora manter o foco de atenção num estímulo ora em outro (atenção alternada / flexibilidade mental). Foram avaliados todos os aspectos da atenção: sustentação, seletividade e alternância."
      },
      {
        tipo: "tabela",
        id: "sustentada",
        titulo: "Atenção sustentada",
        colunaRotulo: "Teste",
        colunas: [
          { rotulo: "Escore", tipo: "texto" },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_3 }
        ],
        linhas: [
          { rotulo: "Controle mental" },
          { rotulo: "Meses do ano (modo inverso)" },
          { rotulo: "Trilha A" },
          { rotulo: "Sequência de números e letras" }
        ]
      },
      {
        tipo: "tabela",
        id: "seletiva",
        titulo: "Atenção seletiva",
        colunaRotulo: "Teste",
        colunas: [
          { rotulo: "Escore", tipo: "texto" },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_3 }
        ],
        linhas: [
          { rotulo: "Sinos" }
        ]
      }
    ]
  },

  {
    id: "praxias",
    titulo: "Praxias",
    descricao: "Classifique cada tipo de praxia.",
    blocos: [
      {
        tipo: "paragrafo",
        texto: "As apraxias são perturbações da atividade gestual, quer se trate de movimentos adaptados a um fim, quer de manipulação real, quer de mímica de objetos, e que não são explicadas nem por um dano motor, nem por um dano sensitivo, nem por uma alteração intelectual, e que surgem quando da lesão de certas áreas cerebrais."
      },
      {
        tipo: "tabela",
        id: "tipos",
        colunaRotulo: "Praxias",
        colunas: [
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_3 }
        ],
        linhas: [
          { rotulo: "Ideomotoras" },
          { rotulo: "Cinéticas" },
          { rotulo: "Ideatórias" },
          { rotulo: "Construtivas" }
        ]
      }
    ]
  },

  {
    id: "wechsler",
    titulo: "Bateria Wechsler",
    descricao: "Subtestes da escala Wechsler.",
    blocos: [
      {
        tipo: "tabela",
        id: "subtestes",
        colunaRotulo: "Subteste",
        colunas: [
          { rotulo: "Escore", tipo: "texto" },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_3 }
        ],
        linhas: [
          { rotulo: "Semelhanças" },
          { rotulo: "Raciocínio Matricial" },
          { rotulo: "Sequência de números e letras" },
          { rotulo: "Completar Figuras" },
          { rotulo: "Cubos" },
          { rotulo: "Códigos" }
        ]
      },
      {
        tipo: "paragrafo",
        texto: "Cubos: conjunto de padrões geométricos bidimensionais formados com cubos que o examinando deve reproduzir em graus crescentes de dificuldade (avalia habilidade construtiva e organização perceptiva)."
      },
      {
        tipo: "paragrafo",
        texto: "Semelhanças: série de pares de palavras apresentadas oralmente. O examinando deve explicar os conceitos comuns que são representados pelas palavras (avalia formação de conceitos e julgamento)."
      },
      {
        tipo: "paragrafo",
        texto: "Raciocínio Matricial: série de padrões incompletos colocados em uma matriz que o examinando deve completar apontando a alternativa correta entre cinco alternativas possíveis (avalia processamento da informação visual e raciocínio abstrato)."
      },
      {
        tipo: "paragrafo",
        texto: "Sequência de Números e Letras: sequência de números e letras apresentadas oralmente que o examinando deve repetir colocando os números em ordem crescente e as letras em ordem alfabética (avalia memória operacional auditiva e atenção)."
      },
      {
        tipo: "paragrafo",
        texto: "Completar Figuras: conjunto de figuras representando objetos e ambientes; em cada figura falta uma parte importante que o examinando deve identificar (avalia raciocínio sobre material visual)."
      },
      {
        tipo: "paragrafo",
        texto: "Dígitos: sequências numéricas apresentadas oralmente que o examinando deve repetir literalmente na ordem direta e na ordem inversa (avalia capacidade de armazenamento a curto prazo e atenção; a ordem direta avalia memória de curto prazo e a ordem inversa, memória operacional)."
      },
      {
        tipo: "paragrafo",
        texto: "Códigos: série de números, cada qual associado a um símbolo correspondente. O examinando deve escrever o símbolo associado a cada número (avalia desempenho psicomotor e atenção sustentada)."
      }
    ]
  },

  {
    id: "stroop",
    titulo: "Stroop Test",
    descricao: "Stroop Test e testes complementares (provérbios, cinco pontos, sinos, corte de linhas e labirintos).",
    blocos: [
      {
        tipo: "paragrafo",
        texto: "Teste que avalia atenção, resistência à interferência, impulsividade e flexibilidade de pensamento."
      },
      {
        tipo: "tabela",
        id: "fases",
        colunaRotulo: "Fases",
        colunas: [
          { rotulo: "Tempo do paciente", tipo: "texto" },
          { rotulo: "Média", tipo: "texto" },
          { rotulo: "Erros", tipo: "numero" },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_3 }
        ],
        linhas: [
          { rotulo: "Nomear cores de estímulos" },
          { rotulo: "Nomear cores de palavras (sem interferência)" },
          { rotulo: "Nomear cores de palavras (com interferência)" }
        ]
      },
      { tipo: "subtitulo", texto: "Testes complementares" },
      {
        tipo: "tabela",
        id: "complementares",
        colunaRotulo: "Teste",
        colunas: [
          { rotulo: "Escore", tipo: "texto" }
        ],
        linhas: [
          { rotulo: "Teste de interpretação de Provérbios: avalia raciocínio, abstração e julgamento" },
          { rotulo: "Teste dos Cinco Pontos: avalia a performance visuoconstrutiva e motora" },
          { rotulo: "Teste dos Sinos: avalia percepção visual, orientação espacial, atenção seletiva e sustentada, disfunção do hemisfério direito com negligência à esquerda" },
          { rotulo: "Teste do Corte de Linhas: avalia orientação espacial, disfunção do hemisfério direito com negligência à esquerda" },
          { rotulo: "Teste dos Labirintos: envolve planejamento e previsão" }
        ]
      }
    ]
  },

  {
    id: "interpretacao",
    titulo: "Interpretação dos resultados",
    descricao: "Descreva o resultado de cada domínio (ex.: preservada, levemente comprometida). Só os domínios preenchidos entram no relatório.",
    blocos: [
      {
        tipo: "paragrafo",
        texto: "A avaliação neuropsicológica compreende o exame de diferentes domínios cognitivos como: a memória, a atenção, a linguagem, a capacidade de planejamento, de cálculo, de raciocínio lógico, de julgamento, a percepção visual e a destreza motora. Permite indicar o quanto a memória ou outro domínio cognitivo se apresenta diferente do esperado, comparando os dados obtidos com população da mesma idade, sexo e escolaridade, a fim de estabelecer a presença ou não de disfunções cognitivas, auxiliando o médico(a) no diagnóstico diferencial."
      },
      {
        tipo: "frase",
        texto: function (paciente) {
          return "A avaliação de " + (paciente.nome || "—") + " revelou:";
        }
      },
      {
        tipo: "campos",
        id: "dominios",
        itens: [
          "Atividades básicas de vida diária",
          "Atividades instrumentais de vida diária",
          "Orientação autopsíquica",
          "Orientação temporal",
          "Orientação espacial",
          "Memória verbal imediata",
          "Memória verbal tardia",
          "Reconhecimento de material verbal",
          "Memória visual",
          "Memória lógica I e II",
          "Memória operacional",
          "Fluência verbal por categoria semântica",
          "Fluência verbal por categoria fonêmica",
          "Nomeação",
          "Escrita",
          "Cálculo mental",
          "Raciocínio perceptual",
          "Habilidade construtiva e organização visuoespacial",
          "Atenção seletiva",
          "Atenção sustentada",
          "Atenção alternada",
          "Praxias",
          "Funções executivas"
        ]
      },
      { tipo: "texto", id: "observacoes", rotulo: "Observações", placeholder: "Considerações adicionais sobre os resultados..." }
    ]
  },

  {
    id: "conclusao",
    titulo: "Conclusão",
    descricao: "Conclusão da avaliação e assinatura dos profissionais.",
    sempreImprimir: true,
    blocos: [
      { tipo: "texto", id: "texto", rotulo: "Conclusão", alto: true, placeholder: "Escreva a conclusão da avaliação..." },
      {
        tipo: "assinaturas",
        id: "assinaturas",
        pessoas: [
          { nome: "Vania Buksman", registro: "CRP 05/43969" },
          { nome: "Lelia Galvis", registro: "CRP 05/43970" }
        ]
      }
    ]
  }
];
