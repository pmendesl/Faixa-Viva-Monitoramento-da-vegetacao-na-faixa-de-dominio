/* =========================================================================
   Faixa Viva — Sprint 3
   Classificação automática da vegetação monitorada na faixa de domínio.

   Roteiro do arquivo:
   1. Faixas de classificação (array de objetos)
   2. Pontos monitorados (array de objetos)
   3. Estado da aplicação e referências do DOM
   4. Funções de classificação
   5. Funções auxiliares de formatação
   6. Renderização dinâmica (resumo, perfil, tabela, critérios)
   7. Entrada de dados e validação
   8. Eventos e inicialização
   ========================================================================= */


/* ---------- 1. Faixas de classificação -----------------------------------
   Cada faixa reúne, em um único objeto: o intervalo de altura em centímetros,
   o nome da classificação, a classe CSS que dá a cor e a ação recomendada.
   Mudar a regra de negócio é mudar apenas este array.
   Referência adotada pelo grupo: 50 cm é o limite tolerado na faixa de domínio.
------------------------------------------------------------------------- */

const FAIXAS = [
  {
    nome: "Normal",
    minima: 0,
    maxima: 30,
    classe: "nivel--normal",
    descricao: "Vegetação bem abaixo do limite de 50 cm.",
    acao: "Manter apenas o monitoramento por satélite.",
    prazo: "Próxima leitura no ciclo regular, em 30 dias"
  },
  {
    nome: "Atenção",
    minima: 30,
    maxima: 45,
    classe: "nivel--atencao",
    descricao: "Vegetação se aproximando do limite de 50 cm.",
    acao: "Reinspecionar o trecho e incluí-lo no planejamento de roçada.",
    prazo: "Reinspeção em até 15 dias"
  },
  {
    nome: "Risco",
    minima: 45,
    maxima: 60,
    classe: "nivel--risco",
    descricao: "Vegetação no limite de 50 cm ou acima dele.",
    acao: "Programar roçada com equipe e sinalização do trecho.",
    prazo: "Execução em até 7 dias"
  },
  {
    nome: "Crítico",
    minima: 60,
    maxima: Infinity,
    classe: "nivel--critico",
    descricao: "Vegetação muito acima do limite, com perda de visibilidade.",
    acao: "Acionar equipe de roçada imediatamente e sinalizar o trecho.",
    prazo: "Intervenção em até 24 horas"
  }
];

/* Escala do gráfico e limite contratual, em centímetros. */
const ESCALA_MAXIMA = 100;
const LIMITE_CONTRATUAL = 50;


/* ---------- 2. Pontos monitorados ----------------------------------------
   Dados de altura recebidos do monitoramento. A classificação NÃO é gravada
   aqui: ela é calculada em tempo de execução a partir da altura.
------------------------------------------------------------------------- */

const PONTOS_INICIAIS = [
  { local: "km 24+300", detalhe: "pista sul, talude direito",     km: 24.3, altura: 18 },
  { local: "km 26+000", detalhe: "pista norte, canteiro central", km: 26.0, altura: 24 },
  { local: "km 27+800", detalhe: "pista sul, acostamento",        km: 27.8, altura: 33 },
  { local: "km 29+500", detalhe: "pista norte, talude esquerdo",  km: 29.5, altura: 41 },
  { local: "km 31+200", detalhe: "alça de acesso, saída 31",      km: 31.2, altura: 47 },
  { local: "km 33+000", detalhe: "pista sul, canteiro central",   km: 33.0, altura: 52 },
  { local: "km 35+600", detalhe: "pista norte, talude direito",   km: 35.6, altura: 58 },
  { local: "km 37+400", detalhe: "pista sul, defensa metálica",   km: 37.4, altura: 49 },
  { local: "km 39+100", detalhe: "pista norte, acostamento",      km: 39.1, altura: 64 },
  { local: "km 41+700", detalhe: "alça de retorno, km 41",        km: 41.7, altura: 73 },
  { local: "km 44+200", detalhe: "pista sul, talude direito",     km: 44.2, altura: 88 },
  { local: "km 46+500", detalhe: "pista norte, área de escape",   km: 46.5, altura: 29 }
];


/* ---------- 3. Estado da aplicação e referências do DOM ------------------ */

let pontos = PONTOS_INICIAIS.map(function (ponto) {
  return Object.assign({}, ponto);
});

let filtroAtual = "todos";      // "todos" ou o nome de uma classificação
let ordemAtual = "km";          // "km" ou "altura"
let localDestacado = null;      // ponto selecionado no gráfico

const perfilEixo    = document.getElementById("perfilEixo");
const perfilPontos  = document.getElementById("perfilPontos");
const perfilLimite  = document.querySelector(".perfil__limite");
const resumo        = document.getElementById("resumo");
const criterios     = document.getElementById("criterios");
const corpoTabela   = document.getElementById("corpoTabela");
const contadorPontos= document.getElementById("contadorPontos");
const filtros       = document.getElementById("filtros");
const selectOrdem   = document.getElementById("selectOrdem");
const mensagemVazio = document.getElementById("vazio");
const aviso         = document.getElementById("aviso");

const formLeitura = document.getElementById("formLeitura");
const btnRestaurar = document.getElementById("btnRestaurar");

const CAMPOS = [
  { input: document.getElementById("inputLocal"),  erro: document.getElementById("erroLocal") },
  { input: document.getElementById("inputKm"),     erro: document.getElementById("erroKm") },
  { input: document.getElementById("inputAltura"), erro: document.getElementById("erroAltura") }
];


/* ---------- 4. Funções de classificação ----------------------------------
   Coração da solução: recebe uma altura e devolve a faixa correspondente.
------------------------------------------------------------------------- */

function classificarAltura(altura) {
  let faixaEncontrada = null;

  FAIXAS.forEach(function (faixa) {
    if (altura >= faixa.minima && altura < faixa.maxima) {
      faixaEncontrada = faixa;
    }
  });

  /* Segurança: altura fora de qualquer intervalo previsto cai na faixa mais
     grave, para que nenhum ponto fique sem classificação no painel. */
  if (faixaEncontrada === null) {
    faixaEncontrada = FAIXAS[FAIXAS.length - 1];
  }

  return faixaEncontrada;
}

/* Devolve a lista de pontos já classificada, filtrada e ordenada. */
function prepararPontos() {
  const classificados = pontos.map(function (ponto) {
    return Object.assign({}, ponto, { faixa: classificarAltura(ponto.altura) });
  });

  const filtrados = classificados.filter(function (ponto) {
    if (filtroAtual === "todos") {
      return true;
    }
    return ponto.faixa.nome === filtroAtual;
  });

  filtrados.sort(function (a, b) {
    if (ordemAtual === "altura") {
      return b.altura - a.altura;      // maior altura primeiro
    }
    return a.km - b.km;                // ordem de quilometragem
  });

  return filtrados;
}


/* ---------- 5. Funções auxiliares de formatação -------------------------- */

function rotularFaixa(faixa) {
  if (faixa.maxima === Infinity) {
    return faixa.minima + " cm ou mais";
  }
  return faixa.minima + " a " + faixa.maxima + " cm";
}

/* Converte a altura em porcentagem da escala do gráfico. */
function alturaEmPorcentagem(altura) {
  const proporcao = (altura / ESCALA_MAXIMA) * 100;
  return Math.min(proporcao, 100);
}

function mostrarAviso(texto, faixa) {
  aviso.textContent = texto;
  aviso.className = "aviso " + (faixa ? faixa.classe : "");
  aviso.hidden = false;
}


/* ---------- 6. Renderização dinâmica -------------------------------------
   Todo o conteúdo abaixo é criado por JavaScript: o HTML entrega apenas os
   contêineres vazios.
------------------------------------------------------------------------- */

/* 6.1 Contadores por classificação */
function renderizarResumo() {
  resumo.innerHTML = "";

  FAIXAS.forEach(function (faixa) {
    let total = 0;

    pontos.forEach(function (ponto) {
      if (classificarAltura(ponto.altura).nome === faixa.nome) {
        total = total + 1;
      }
    });

    const item = document.createElement("div");
    item.className = "resumo__item " + faixa.classe;

    const numero = document.createElement("span");
    numero.className = "resumo__numero";
    numero.textContent = total;

    const nome = document.createElement("span");
    nome.className = "resumo__nome";
    nome.textContent = faixa.nome;

    const intervalo = document.createElement("span");
    intervalo.className = "resumo__faixa";
    intervalo.textContent = rotularFaixa(faixa);

    item.appendChild(numero);
    item.appendChild(nome);
    item.appendChild(intervalo);
    resumo.appendChild(item);
  });
}

/* 6.2 Perfil da faixa: uma barra por ponto, colorida pela classificação */
function renderizarPerfil() {
  perfilEixo.innerHTML = "";
  perfilPontos.innerHTML = "";

  /* Linhas horizontais de referência (0, 25, 50, 75 e 100 cm) */
  [0, 25, 50, 75, 100].forEach(function (valor) {
    const marca = document.createElement("div");
    marca.className = "perfil__marca";
    marca.style.bottom = (valor / ESCALA_MAXIMA) * 100 + "%";

    const rotulo = document.createElement("span");
    rotulo.textContent = valor;
    marca.appendChild(rotulo);
    perfilEixo.appendChild(marca);
  });

  /* Linha tracejada do limite contratual */
  perfilLimite.style.bottom = (LIMITE_CONTRATUAL / ESCALA_MAXIMA) * 100 + "%";

  /* Barras, sempre em ordem de quilometragem */
  const ordenados = pontos.slice().sort(function (a, b) {
    return a.km - b.km;
  });

  ordenados.forEach(function (ponto) {
    const faixa = classificarAltura(ponto.altura);

    const item = document.createElement("li");
    item.className = "barra " + faixa.classe;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "barra__botao";
    botao.style.height = alturaEmPorcentagem(ponto.altura) + "%";
    botao.title = ponto.local + ": " + ponto.altura + " cm, " + faixa.nome;
    botao.setAttribute("aria-label", botao.title);

    if (ponto.local === localDestacado) {
      botao.classList.add("esta-ativa");
    }

    const valor = document.createElement("span");
    valor.className = "barra__valor";
    valor.textContent = ponto.altura;
    botao.appendChild(valor);

    botao.addEventListener("click", function () {
      destacarPonto(ponto.local);
    });

    item.appendChild(botao);
    perfilPontos.appendChild(item);
  });
}

/* 6.3 Tabela: localização, altura, classificação e ação recomendada */
function renderizarTabela() {
  const lista = prepararPontos();

  corpoTabela.innerHTML = "";

  lista.forEach(function (ponto) {
    const linha = document.createElement("tr");
    linha.className = "linha " + ponto.faixa.classe;

    if (ponto.local === localDestacado) {
      linha.classList.add("esta-destacada");
    }

    /* Coluna 1: localização */
    const celulaLocal = document.createElement("td");
    celulaLocal.className = "local";
    celulaLocal.textContent = ponto.local;

    const detalhe = document.createElement("span");
    detalhe.className = "local__detalhe";
    detalhe.textContent = ponto.detalhe;
    celulaLocal.appendChild(detalhe);

    /* Coluna 2: altura da vegetação */
    const celulaAltura = document.createElement("td");
    celulaAltura.className = "altura";
    celulaAltura.textContent = ponto.altura + " ";

    const unidade = document.createElement("span");
    unidade.className = "altura__unidade";
    unidade.textContent = "cm";
    celulaAltura.appendChild(unidade);

    /* Coluna 3: classificação */
    const celulaClasse = document.createElement("td");
    const selo = document.createElement("span");
    selo.className = "selo " + ponto.faixa.classe;

    const pontoCor = document.createElement("span");
    pontoCor.className = "selo__ponto";
    selo.appendChild(pontoCor);
    selo.appendChild(document.createTextNode(ponto.faixa.nome));
    celulaClasse.appendChild(selo);

    /* Coluna 4: ação recomendada */
    const celulaAcao = document.createElement("td");
    celulaAcao.className = "acao";
    celulaAcao.textContent = ponto.faixa.acao;

    const prazo = document.createElement("span");
    prazo.className = "acao__prazo";
    prazo.textContent = ponto.faixa.prazo;
    celulaAcao.appendChild(prazo);

    linha.appendChild(celulaLocal);
    linha.appendChild(celulaAltura);
    linha.appendChild(celulaClasse);
    linha.appendChild(celulaAcao);
    corpoTabela.appendChild(linha);
  });

  /* Estado vazio e contagem exibida abaixo do título */
  mensagemVazio.hidden = lista.length > 0;

  if (filtroAtual === "todos") {
    contadorPontos.textContent = lista.length + " pontos monitorados no trecho.";
  } else {
    contadorPontos.textContent = lista.length + " de " + pontos.length +
      " pontos na classificação " + filtroAtual + ".";
  }
}

/* 6.4 Botões de filtro, criados a partir do mesmo array de faixas */
function renderizarFiltros() {
  filtros.innerHTML = "";

  const opcoes = [{ nome: "todos", rotulo: "Todos", classe: "filtro--todos" }];

  FAIXAS.forEach(function (faixa) {
    opcoes.push({ nome: faixa.nome, rotulo: faixa.nome, classe: faixa.classe });
  });

  opcoes.forEach(function (opcao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "filtro " + opcao.classe;
    botao.textContent = opcao.rotulo;

    if (opcao.nome === filtroAtual) {
      botao.classList.add("esta-ativo");
    }

    botao.addEventListener("click", function () {
      filtroAtual = opcao.nome;
      renderizarFiltros();
      renderizarTabela();
    });

    filtros.appendChild(botao);
  });
}

/* 6.5 Documentação das faixas, exibida na própria interface */
function renderizarCriterios() {
  criterios.innerHTML = "";

  FAIXAS.forEach(function (faixa) {
    const item = document.createElement("li");
    item.className = "criterio " + faixa.classe;

    const intervalo = document.createElement("p");
    intervalo.className = "criterio__faixa";
    intervalo.textContent = rotularFaixa(faixa);

    const nome = document.createElement("p");
    nome.className = "criterio__nome";
    nome.textContent = faixa.nome;

    const texto = document.createElement("p");
    texto.className = "criterio__texto";
    texto.textContent = faixa.descricao + " " + faixa.acao;

    item.appendChild(intervalo);
    item.appendChild(nome);
    item.appendChild(texto);
    criterios.appendChild(item);
  });
}

/* Redesenha o painel inteiro. */
function atualizarPainel() {
  renderizarResumo();
  renderizarPerfil();
  renderizarFiltros();
  renderizarTabela();
}

/* Seleciona um ponto a partir do gráfico e rola até a linha correspondente. */
function destacarPonto(local) {
  localDestacado = local;

  /* Se o filtro ativo esconde o ponto clicado, volta para a lista completa. */
  const ponto = pontos.find(function (item) {
    return item.local === local;
  });

  if (ponto && filtroAtual !== "todos" && classificarAltura(ponto.altura).nome !== filtroAtual) {
    filtroAtual = "todos";
    renderizarFiltros();
  }

  renderizarPerfil();
  renderizarTabela();

  const linha = corpoTabela.querySelector(".esta-destacada");
  if (linha) {
    linha.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}


/* ---------- 7. Entrada de dados e validação ------------------------------ */

function limparErro(campo) {
  campo.input.classList.remove("tem-erro");
  campo.erro.hidden = true;
  campo.erro.textContent = "";
}

function marcarErro(campo, mensagem) {
  campo.input.classList.add("tem-erro");
  campo.erro.textContent = mensagem;
  campo.erro.hidden = false;
}

function lerFormulario() {
  CAMPOS.forEach(limparErro);

  const local  = CAMPOS[0].input.value.trim();
  const km     = Number(CAMPOS[1].input.value);
  const altura = Number(CAMPOS[2].input.value);
  let valido = true;

  if (local === "") {
    marcarErro(CAMPOS[0], "Informe a localização do ponto.");
    valido = false;
  }

  if (CAMPOS[1].input.value.trim() === "" || isNaN(km) || km < 0) {
    marcarErro(CAMPOS[1], "Use um km válido.");
    valido = false;
  }

  if (CAMPOS[2].input.value.trim() === "" || isNaN(altura)) {
    marcarErro(CAMPOS[2], "Informe a altura medida.");
    valido = false;
  } else if (altura < 0) {
    marcarErro(CAMPOS[2], "A altura não pode ser negativa.");
    valido = false;
  } else if (altura > 300) {
    marcarErro(CAMPOS[2], "Acima de 300 cm a leitura é considerada erro de sensor.");
    valido = false;
  }

  if (!valido) {
    return null;
  }

  return { local: local, detalhe: "leitura registrada no painel", km: km, altura: altura };
}

function registrarLeitura(leitura) {
  const existente = pontos.findIndex(function (ponto) {
    return ponto.local.toLowerCase() === leitura.local.toLowerCase();
  });

  if (existente >= 0) {
    /* Atualiza a leitura do ponto já monitorado, preservando a descrição. */
    pontos[existente].altura = leitura.altura;
    pontos[existente].km = leitura.km;
  } else {
    pontos.push(leitura);
  }

  const faixa = classificarAltura(leitura.altura);

  atualizarPainel();
  destacarPonto(leitura.local);

  mostrarAviso(
    leitura.local + " classificado como " + faixa.nome + " (" + leitura.altura + " cm). " +
    faixa.acao + " " + faixa.prazo + ".",
    faixa
  );

  formLeitura.reset();
  CAMPOS[0].input.focus();
}


/* ---------- 8. Eventos e inicialização ----------------------------------- */

formLeitura.addEventListener("submit", function (evento) {
  evento.preventDefault();

  const leitura = lerFormulario();
  if (leitura !== null) {
    registrarLeitura(leitura);
  }
});

btnRestaurar.addEventListener("click", function () {
  pontos = PONTOS_INICIAIS.map(function (ponto) {
    return Object.assign({}, ponto);
  });

  filtroAtual = "todos";
  localDestacado = null;
  CAMPOS.forEach(limparErro);
  formLeitura.reset();
  aviso.hidden = true;
  atualizarPainel();
});

selectOrdem.addEventListener("change", function () {
  ordemAtual = selectOrdem.value;
  renderizarTabela();
});

/* Limpa a mensagem de erro conforme o usuário corrige o campo. */
CAMPOS.forEach(function (campo) {
  campo.input.addEventListener("input", function () {
    limparErro(campo);
  });
});

atualizarPainel();