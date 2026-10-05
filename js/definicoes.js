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

const PFEFFER_CORTE = 5;
const IQCODE_CORTE = 3.5;

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
          "Sexo feminino",
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
          "Uso de álcool e/ou substâncias benzodiazepínicas"
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
          "Stroop Test",
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
        valor: r.total + " / 6",
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
    titulo: "Questionário de Atividades Funcionais de Pfeffer",
    descricao: "Pergunte ao informante sobre a capacidade do paciente em cada atividade.",
    blocos: [
      {
        tipo: "opcoes",
        id: "itens",
        colunaItem: "Atividade",
        empilhado: true,
        mostrarPontos: true,
        opcoes: [
          { valor: "capaz", rotulo: "Sim, é capaz", pontos: 0 },
          { valor: "nunca-poderia", rotulo: "Nunca o fez, mas poderia fazer agora", pontos: 0 },
          { valor: "dificuldade", rotulo: "Com alguma dificuldade, mas faz", pontos: 1 },
          { valor: "nunca-dificuldade", rotulo: "Nunca fez e teria dificuldade agora", pontos: 1 },
          { valor: "ajuda", rotulo: "Necessita de ajuda", pontos: 2 },
          { valor: "incapaz", rotulo: "Não é capaz", pontos: 3 }
        ],
        itens: [
          "Ele(a) manuseia seu próprio dinheiro?",
          "Ele(a) é capaz de comprar roupas, comida, coisas para casa sozinho(a)?",
          "Ele(a) é capaz de esquentar a água para o café e apagar o fogo?",
          "Ele(a) é capaz de preparar uma comida?",
          "Ele(a) é capaz de manter-se em dia com as atualidades, com os acontecimentos da comunidade ou da vizinhança?",
          "Ele(a) é capaz de prestar atenção, entender e discutir um programa de rádio ou televisão, um jornal ou uma revista?",
          "Ele(a) é capaz de lembrar-se de compromissos, acontecimentos familiares, feriados?",
          "Ele(a) é capaz de manusear seus próprios remédios?",
          "Ele(a) é capaz de passear pela vizinhança e encontrar o caminho de volta para casa?",
          "Ele(a) pode ser deixado(a) em casa sozinho(a) de forma segura?"
        ]
      },
      {
        tipo: "nota",
        texto: "Pontuação de 0 a 30: quanto maior, maior a dependência. Escores a partir de " + PFEFFER_CORTE + " sugerem comprometimento funcional."
      }
    ],
    resultado: function (s) {
      const r = s.bloco("itens").pontuacao();
      if (!r.respondidos) return null;
      const parcial = r.respondidos < r.totalItens;
      const alterado = r.total >= PFEFFER_CORTE;
      return {
        valor: r.total + " / 30",
        texto: (alterado ? "Sugere comprometimento funcional" : "Sem comprometimento funcional") +
          (parcial ? " (parcial)" : ""),
        nivel: alterado ? "alto" : "baixo"
      };
    },
    resumo: function (s) {
      const r = s.bloco("itens").pontuacao();
      const resultado = this.resultado(s);
      return [
        { rotulo: "Escore total", valor: r.total, de: "30" },
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
        texto: "Katz: 0 independente em todas as seis funções a 6 dependente em todas. Pfeffer: 0 a 30, escores a partir de " + PFEFFER_CORTE + " sugerem comprometimento funcional. GAI: 10 ou mais sugere ansiedade em nível significativo. GDS (Yesavage): 0 a 4 normal; 5 a 10 pode sugerir sintomas depressivos leves a moderados; acima de 10 sintomas depressivos graves. Cornell: 0 a 8 ausência de depressão; 9 a 11 depressão leve; 12 ou mais depressão moderada a grave. IQCODE: escores maiores ou iguais a 3,5 sugerem declínio cognitivo frente ao nível pré-mórbido. BHS: 0 a 4 desesperança mínima; 5 a 8 leve; 9 a 13 moderada; 14 a 20 grave."
      }
    ]
  },

  {
    id: "iqcode",
    titulo: "IQCODE",
    descricao: "Informant Questionnaire on Cognitive Decline in the Elderly (versão de 16 itens). Compare a situação atual do paciente com a de 10 anos atrás.",
    blocos: [
      {
        tipo: "opcoes",
        id: "itens",
        colunaItem: "Comparado a 10 anos atrás, como está em",
        mostrarPontos: true,
        opcoes: [
          { valor: "1", rotulo: "Muito melhor", pontos: 1 },
          { valor: "2", rotulo: "Um pouco melhor", pontos: 2 },
          { valor: "3", rotulo: "Sem mudança", pontos: 3 },
          { valor: "4", rotulo: "Um pouco pior", pontos: 4 },
          { valor: "5", rotulo: "Muito pior", pontos: 5 }
        ],
        itens: [
          "Lembrar de coisas sobre a família e amigos (profissões, aniversários, endereços)",
          "Lembrar de coisas que aconteceram recentemente",
          "Lembrar de conversas dos últimos dias",
          "Lembrar seu endereço e número de telefone",
          "Lembrar em que dia e mês estamos",
          "Lembrar onde as coisas são usualmente guardadas",
          "Lembrar onde encontrar coisas guardadas em lugar diferente do usual",
          "Saber como funcionam as máquinas e aparelhos da casa",
          "Aprender a usar um aparelho novo da casa",
          "Aprender coisas novas em geral",
          "Acompanhar uma história em um livro ou na televisão",
          "Tomar decisões em questões do dia a dia",
          "Lidar com dinheiro para fazer compras",
          "Lidar com questões financeiras (pensão, banco)",
          "Lidar com outros problemas aritméticos do dia a dia (quanta comida comprar, quanto tempo passou entre visitas)",
          "Usar sua inteligência para entender o que está acontecendo e raciocinar"
        ]
      },
      {
        tipo: "nota",
        texto: "Escore = média das respostas (1 a 5). Escores maiores ou iguais a 3,5 sugerem a presença de declínio cognitivo frente ao nível pré-mórbido."
      }
    ],
    resultado: function (s) {
      const r = s.bloco("itens").pontuacao();
      if (!r.respondidos) return null;
      const media = Math.round((r.total / r.respondidos) * 100) / 100;
      const alterado = media >= IQCODE_CORTE;
      return {
        valor: formatarNumero(media),
        texto: (alterado ? "Sugere declínio cognitivo" : "Sem indicação de declínio cognitivo") +
          (r.respondidos < r.totalItens ? " (parcial)" : ""),
        nivel: alterado ? "alto" : "baixo"
      };
    },
    resumo: function (s) {
      const r = s.bloco("itens").pontuacao();
      const resultado = this.resultado(s);
      return [
        { rotulo: "Média", valor: resultado ? resultado.valor : "—", de: "5" },
        { rotulo: "Respondidos", valor: r.respondidos, de: String(r.totalItens) },
        { rotulo: "Interpretação", selo: resultado ? resultado.texto : "Nenhum item respondido", nivel: resultado ? resultado.nivel : "" }
      ];
    }
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
    descricao: "Teste Auditivo Verbal de Rey (RAVLT): total, interferências e esquecimento são calculados automaticamente.",
    blocos: [
      {
        tipo: "tabela",
        id: "ravlt",
        titulo: "Memória verbal: lista de palavras",
        colunaRotulo: "Tentativa",
        colunas: [
          { rotulo: "Escore", tipo: "numero" },
          { rotulo: "Classificação", tipo: "classe", opcoes: CLASSE_2 }
        ],
        linhas: [
          { rotulo: "A1", chave: "a1" },
          { rotulo: "A2", chave: "a2" },
          { rotulo: "A3", chave: "a3" },
          { rotulo: "A4", chave: "a4" },
          { rotulo: "A5", chave: "a5" },
          {
            rotulo: "Total A1 – A5",
            chave: "total",
            destaque: true,
            calculos: {
              0: function (t) {
                return somaPreenchidos(["a1", "a2", "a3", "a4", "a5"].map(function (k) { return t.num(k, 0); }));
              }
            }
          },
          { rotulo: "B1", chave: "b1" },
          { rotulo: "A6", chave: "a6" },
          { rotulo: "A7", chave: "a7" },
          {
            rotulo: "Interferência proativa (B1/A1)",
            calculos: { 0: function (t) { return razao(t.num("b1", 0), t.num("a1", 0)); } }
          },
          {
            rotulo: "Interferência retroativa (A6/A5)",
            calculos: { 0: function (t) { return razao(t.num("a6", 0), t.num("a5", 0)); } }
          },
          {
            rotulo: "Esquecimento (A7/A6)",
            calculos: { 0: function (t) { return razao(t.num("a7", 0), t.num("a6", 0)); } }
          },
          { rotulo: "Reconhecimento", chave: "reconhecimento" }
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
          const feminino = paciente.sexo === "Feminino";
          const masculino = paciente.sexo === "Masculino";
          const tratamento = feminino ? "da Sra." : masculino ? "do Sr." : "do(a) Sr(a).";
          return "A avaliação " + tratamento + " " + (paciente.nome || "—") + " revelou:";
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
