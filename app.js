// Tenta ler do localStorage primeiro (cache local)
let lancamentos = JSON.parse(localStorage.getItem('requisicoes_dados')) || [];
let receitasOrcadas = JSON.parse(localStorage.getItem('requisicoes_receitas_orcadas')) || {};
let receitasRealizadas = JSON.parse(localStorage.getItem('requisicoes_receitas_realizadas')) || {};
let despesasOrcadas = JSON.parse(localStorage.getItem('requisicoes_despesas_orcadas')) || {};

// BUSCA AUTOMÁTICA DA NUVEM (FIREBASE)
if (typeof firebase !== 'undefined' && firebase.database) {
  firebase.database().ref('dados_dashboard').on('value', (snapshot) => {
    const dados = snapshot.val();
    if (dados) {
      if (dados.lancamentos) lancamentos = dados.lancamentos;
      if (dados.receitasOrcadas) receitasOrcadas = dados.receitasOrcadas;
      if (dados.receitasRealizadas) receitasRealizadas = dados.receitasRealizadas;
      if (dados.despesasOrcadas) despesasOrcadas = dados.despesasOrcadas;

      // Atualiza o backup no localStorage
      localStorage.setItem('requisicoes_dados', JSON.stringify(lancamentos));
      localStorage.setItem('requisicoes_receitas_orcadas', JSON.stringify(receitasOrcadas));
      localStorage.setItem('requisicoes_receitas_realizadas', JSON.stringify(receitasRealizadas));
      localStorage.setItem('requisicoes_despesas_orcadas', JSON.stringify(despesasOrcadas));

      // Atualiza a tela automaticamente para todos os usuários
      if (typeof atualizarDashboard === 'function') atualizarDashboard();
      if (typeof renderizarHistorico === 'function') renderizarHistorico();
      if (typeof filtrarLancamentos === 'function') filtrarLancamentos();
      if (typeof renderizarFormBudgets === 'function') renderizarFormBudgets();
      if (typeof atualizarGraficos === 'function') atualizarGraficos();
    }
  });
}

// Função auxiliar para enviar alterações para a nuvem
function sincronizarComFirebase() {
  if (typeof firebase !== 'undefined' && firebase.database) {
    firebase.database().ref('dados_dashboard').set({
      lancamentos: typeof lancamentos !== 'undefined' ? lancamentos : [],
      receitasOrcadas: typeof receitasOrcadas !== 'undefined' ? receitasOrcadas : {},
      receitasRealizadas: typeof receitasRealizadas !== 'undefined' ? receitasRealizadas : {},
      despesasOrcadas: typeof despesasOrcadas !== 'undefined' ? despesasOrcadas : {}
    }).then(() => {
      console.log("✅ Dados salvos no Firebase!");
    }).catch(err => console.error("❌ Erro ao salvar no Firebase:", err));
  }
}

// Escuta alterações de outras máquinas e atualiza a tela na hora
if (typeof firebase !== 'undefined' && firebase.database) {
  firebase.database().ref('dados_dashboard').on('value', (snapshot) => {
    const dados = snapshot.val();
    if (dados) {
      if (dados.lancamentos) lancamentos = dados.lancamentos;
      if (dados.receitasOrcadas) receitasOrcadas = dados.receitasOrcadas;
      if (dados.receitasRealizadas) receitasRealizadas = dados.receitasRealizadas;
      if (dados.despesasOrcadas) despesasOrcadas = dados.despesasOrcadas;
      if (typeof renderizarTabela === 'function') renderizarTabela();
      if (typeof atualizarDashboards === 'function') atualizarDashboards();
    }
  });
}

const mapeamentoDeptos = {
  "2401": "Restaurante Vezzoso Cucina",
  "2407": "Restaurante Kibô Japanese",
  "2408": "Restaurante Tom Espaço Gastronômico",
  "2409": "Restaurante Bourbon Bistrot",
  "2410": "Bar Piscina 1963",
  "2411": "Bar Principal 1963",
  "2413": "Bar Piscina Bugainville",
  "2414": "Gelateria Vezzoso",
  "2415": "Bar Piscina Acqua Food",
  "2426": "Fun Beach",
  "2495": "Room Bar",
  "2496": "Room Service",
  "2499": "Banquetes",
  "2400": "Cozinha Central",
  "0000": "Refeitorio"
};

const departamentosLista = Object.values(mapeamentoDeptos);
const diasNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
let chartDeptos = null;

if (typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
}

function formatarMoedaBR(valor) {
  const num = parseFloat(valor) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function converterTextoParaNumero(str) {
  if (!str) return 0;
  const limpo = String(str).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').replace('-', '').trim();
  return parseFloat(limpo) || 0;
}

function atualizarTotaisTopo() {
  let totalRecOrcada = 0;
  let totalRecRealizada = 0;
  let totalDespOrcada = 0;
  let totalDespRealizada = 0;

  document.querySelectorAll('.input-rec-orcada').forEach(i => totalRecOrcada += converterTextoParaNumero(i.value));
  document.querySelectorAll('.input-rec-realizada').forEach(i => totalRecRealizada += converterTextoParaNumero(i.value));
  document.querySelectorAll('.input-desp-orcada').forEach(i => totalDespOrcada += converterTextoParaNumero(i.value));
  document.querySelectorAll('.input-desp-realizada').forEach(i => totalDespRealizada += converterTextoParaNumero(i.value));

  const elRecOrc = document.getElementById('rec-orcada-total');
  const elRecReal = document.getElementById('rec-realizada-total');
  const elDespOrc = document.getElementById('desp-orcada-total');
  const elDespReal = document.getElementById('desp-realizada-total');

  if (elRecOrc) elRecOrc.value = "R$ " + formatarMoedaBR(totalRecOrcada);
  if (elRecReal) elRecReal.value = "R$ " + formatarMoedaBR(totalRecRealizada);
  if (elDespOrc) elDespOrc.value = "R$ " + formatarMoedaBR(totalDespOrcada);
  if (elDespReal) elDespReal.value = "R$ " + formatarMoedaBR(totalDespRealizada);
}

document.addEventListener('DOMContentLoaded', () => {
  const elData = document.getElementById('data');
  if (elData) elData.valueAsDate = new Date();
  popularSelectsDepartamentos();
  inicializarSeletoresMes();
  filtrarLancamentos();
});

function popularSelectsDepartamentos() {
  const selectForm = document.getElementById('departamento');
  const selectFiltro = document.getElementById('filtro-depto');

  if (selectForm) {
    selectForm.innerHTML = '<option value="">Selecione o setor...</option>';
    departamentosLista.forEach(depto => {
      const opt = document.createElement('option');
      opt.value = depto;
      opt.textContent = depto;
      selectForm.appendChild(opt);
    });
  }

  if (selectFiltro) {
    selectFiltro.innerHTML = '<option value="todos">Todos os Deptos</option>';
    departamentosLista.forEach(depto => {
      const opt = document.createElement('option');
      opt.value = depto;
      opt.textContent = depto;
      selectFiltro.appendChild(opt);
    });
  }
}

function inicializarSeletoresMes() {
  const hoje = new Date();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
  const anoAtual = hoje.getFullYear();
  const valorMesAno = `${anoAtual}-${mesAtual}`;

  const selectBudget = document.getElementById('budget-mes-ano');
  if (selectBudget && !selectBudget.value) {
    selectBudget.value = valorMesAno;
  }
}

function obterChaveMes(dataString) {
  const partes = dataString.split('-');
  return `${partes[1]}-${partes[0]}`;
}

function mudarAba(aba) {
  const btnLanc = document.getElementById('btn-tab-lancamentos');
  const btnBudg = document.getElementById('btn-tab-budgets');
  const btnDash = document.getElementById('btn-tab-dashboard');

  const abaLanc = document.getElementById('aba-lancamentos');
  const abaBudg = document.getElementById('aba-budgets');
  const abaDash = document.getElementById('aba-dashboard');

  [btnLanc, btnBudg, btnDash].forEach(b => {
    if (b) b.className = "px-3 py-1 rounded-lg text-xs font-semibold hover:bg-hotel-dark text-emerald-100 transition";
  });

  if (abaLanc) abaLanc.classList.add('hidden');
  if (abaBudg) abaBudg.classList.add('hidden');
  if (abaDash) abaDash.classList.add('hidden');

  if (aba === 'lancamentos') {
    if (abaLanc) abaLanc.classList.remove('hidden');
    if (btnLanc) btnLanc.className = "px-3 py-1 rounded-lg text-xs font-semibold bg-white text-hotel-primary shadow transition";
  } else if (aba === 'budgets') {
    if (abaBudg) abaBudg.classList.remove('hidden');
    if (btnBudg) btnBudg.className = "px-3 py-1 rounded-lg text-xs font-semibold bg-white text-hotel-primary shadow transition";
    renderizarFormBudgets();
  } else {
    if (abaDash) abaDash.classList.remove('hidden');
    if (btnDash) btnDash.className = "px-3 py-1 rounded-lg text-xs font-semibold bg-white text-hotel-primary shadow transition";
    atualizarGraficos();
  }
}

function renderizarFormBudgets() {
  inicializarSeletoresMes();
  const mesAnoInput = document.getElementById('budget-mes-ano').value;
  if (!mesAnoInput) return;

  const chaveMes = obterChaveMes(mesAnoInput);
  const recOrcDoMes = receitasOrcadas[chaveMes] || {};
  const recRealDoMes = receitasRealizadas[chaveMes] || {};
  const despOrcDoMes = despesasOrcadas[chaveMes] || {};

  const partesMes = mesAnoInput.split('-');
  const anoSel = parseInt(partesMes[0]);
  const mesSel = parseInt(partesMes[1]) - 1;

  const custosAcumuladosPorDepto = {};
  lancamentos.forEach(item => {
    const p = item.data.split('-');
    const a = parseInt(p[0]);
    const m = parseInt(p[1]) - 1;

    if (a === anoSel && m === mesSel) {
      custosAcumuladosPorDepto[item.departamento] = (custosAcumuladosPorDepto[item.departamento] || 0) + item.valor;
    }
  });

  const container = document.getElementById('lista-inputs-budget');
  if (!container) return;
  container.innerHTML = '';

  departamentosLista.forEach(depto => {
    const valRecOrcada = recOrcDoMes[depto] || 0;
    const valRecRealizada = recRealDoMes[depto] || 0;
    const valDespOrcada = despOrcDoMes[depto] || 0;
    const valDespRealizada = custosAcumuladosPorDepto[depto] || 0;

    const saldo = valDespOrcada - valDespRealizada;
    const percConsumido = valDespOrcada > 0 ? ((valDespRealizada / valDespOrcada) * 100).toFixed(1) : '0.0';
    const corBadge = saldo < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800';

    const div = document.createElement('div');
    div.className = "bg-gray-50 p-2 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs";
    div.innerHTML = `
      <div class="md:col-span-3 font-semibold text-gray-800 truncate">${depto}</div>

      <!-- 1. Receita Orçada -->
      <div class="md:col-span-2 relative">
        <input type="text" data-depto="${depto}" value="${formatarMoedaBR(valRecOrcada)}" oninput="atualizarTotaisTopo()"
               class="input-rec-orcada w-full pl-2 pr-1 py-1 border border-gray-300 rounded font-medium text-gray-700 focus:outline-none">
      </div>

      <!-- 2. Receita Realizada -->
      <div class="md:col-span-2 relative">
        <input type="text" data-depto="${depto}" value="${formatarMoedaBR(valRecRealizada)}" oninput="atualizarTotaisTopo()"
               class="input-rec-realizada w-full pl-2 pr-1 py-1 border border-blue-200 bg-blue-50/30 rounded font-medium text-blue-900 focus:outline-none">
      </div>

      <!-- 3. Despesa Orçada -->
      <div class="md:col-span-2 relative">
        <input type="text" data-depto="${depto}" value="${formatarMoedaBR(valDespOrcada)}" oninput="atualizarTotaisTopo()"
               class="input-desp-orcada w-full pl-2 pr-1 py-1 border border-purple-200 bg-purple-50/30 rounded font-bold text-purple-900 focus:outline-none">
      </div>

      <!-- 4. Requisições Lançadas & Saldo -->
      <div class="md:col-span-3 grid grid-cols-2 gap-1 items-center">
        <input type="text" value="${formatarMoedaBR(valDespRealizada)}" readonly
               class="input-desp-realizada w-full pl-2 pr-1 py-1 border border-amber-300 bg-amber-50/50 rounded font-extrabold text-amber-900">
        <div class="text-center ${corBadge} p-1 rounded font-bold text-[11px] truncate">
          R$ ${formatarMoedaBR(saldo)} (${percConsumido}%)
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  atualizarTotaisTopo();
}

function salvarBudgets(e) {
  e.preventDefault();
  const mesAnoInput = document.getElementById('budget-mes-ano').value;
  const chaveMes = obterChaveMes(mesAnoInput);

  if (!receitasOrcadas[chaveMes]) receitasOrcadas[chaveMes] = {};
  if (!receitasRealizadas[chaveMes]) receitasRealizadas[chaveMes] = {};
  if (!despesasOrcadas[chaveMes]) despesasOrcadas[chaveMes] = {};

  const inputsRecOrc = document.querySelectorAll('.input-rec-orcada');
  const inputsRecReal = document.querySelectorAll('.input-rec-realizada');
  const inputsDespOrc = document.querySelectorAll('.input-desp-orcada');

  departamentosLista.forEach((depto, idx) => {
    receitasOrcadas[chaveMes][depto] = converterTextoParaNumero(inputsRecOrc[idx].value);
    receitasRealizadas[chaveMes][depto] = converterTextoParaNumero(inputsRecReal[idx].value);
    despesasOrcadas[chaveMes][depto] = converterTextoParaNumero(inputsDespOrc[idx].value);
  });

  localStorage.setItem('requisicoes_receitas_orcadas', JSON.stringify(receitasOrcadas));
  localStorage.setItem('requisicoes_receitas_realizadas', JSON.stringify(receitasRealizadas));
  localStorage.setItem('requisicoes_despesas_orcadas', JSON.stringify(despesasOrcadas));

  sincronizarComFirebase();

  renderizarFormBudgets();
  alert(`✅ Dados DRE salvos com sucesso para ${chaveMes}!`);
}

function importarRelatorioDRE(evento) {
  const file = evento.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

      const mesAnoInput = document.getElementById('budget-mes-ano').value;
      const chaveMes = obterChaveMes(mesAnoInput);

      receitasOrcadas[chaveMes] = {};
      receitasRealizadas[chaveMes] = {};
      despesasOrcadas[chaveMes] = {};

      const converterParaNumero = (val) => {
        if (typeof val === 'number') return isNaN(val) ? 0 : Math.abs(val);
        if (!val) return 0;
        const textoLimpo = String(val).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').replace('-', '').trim();
        const num = parseFloat(textoLimpo);
        return isNaN(num) ? 0 : num;
      };

      let contaAtual = null;

      rows.forEach((row) => {
        if (!row || row.length < 1) return;

        const deptoTexto = row[0] ? String(row[0]).trim() : '';
        const deptoLower = deptoTexto.toLowerCase();

        if (
          deptoTexto.includes('3.11.102.001') || 
          deptoTexto.includes('3.11.102.003') || 
          deptoTexto.includes('3.11.102.004') || 
          deptoTexto.includes('3.11.102.018') || 
          (deptoLower.includes('receita') && deptoLower.includes('alimento'))
        ) {
          contaAtual = 'RECEITA_ALIMENTOS';
          return;
        }

        if (
          deptoTexto.includes('3.12.102.001') || 
          deptoTexto.includes('3.12.102.003') || 
          (deptoLower.includes('custo') && deptoLower.includes('alimento'))
        ) {
          contaAtual = 'DESPESA_ALIMENTOS';
          return;
        }

        if (
          deptoTexto.includes('3.11.102.002') || 
          deptoTexto.includes('3.11.102.005') || 
          deptoTexto.includes('3.12.102.002') || 
          deptoLower.includes('bebida') || 
          deptoLower.includes('percentuais')
        ) {
          contaAtual = null;
          return;
        }

        if (contaAtual) {
          const match = deptoTexto.match(/24\d{2}/);
          if (match) {
            const codigoDRE = match[0];
            const nomeLimpo = mapeamentoDeptos[codigoDRE];

            if (nomeLimpo) {
              const valOrcado = converterParaNumero(row[2]); 
              const valRealizado = converterParaNumero(row[4]); 

              if (contaAtual === 'RECEITA_ALIMENTOS') {
                receitasOrcadas[chaveMes][nomeLimpo] = (receitasOrcadas[chaveMes][nomeLimpo] || 0) + valOrcado;
                receitasRealizadas[chaveMes][nomeLimpo] = (receitasRealizadas[chaveMes][nomeLimpo] || 0) + valRealizado;
              } else if (contaAtual === 'DESPESA_ALIMENTOS') {
                despesasOrcadas[chaveMes][nomeLimpo] = (despesasOrcadas[chaveMes][nomeLimpo] || 0) + valOrcado;
              }
            }
          }
        }
      });

      localStorage.setItem('requisicoes_receitas_orcadas', JSON.stringify(receitasOrcadas));
      localStorage.setItem('requisicoes_receitas_realizadas', JSON.stringify(receitasRealizadas));
      localStorage.setItem('requisicoes_despesas_orcadas', JSON.stringify(despesasOrcadas));

      sincronizarComFirebase();

      renderizarFormBudgets();
      alert(`✅ DRE Importada com Sucesso para ${chaveMes}!\nTodas as receitas e custos de alimentos foram consolidados.`);

    } catch (err) {
      console.error(err);
      alert('⚠️ Ocorreu um erro ao processar a planilha DRE.');
    }
  };
  reader.readAsArrayBuffer(file);
}

document.getElementById('form-requisicao').addEventListener('submit', (e) => {
  e.preventDefault();

  const index = parseInt(document.getElementById('edit-index').value);
  const dataVal = document.getElementById('data').value;
  const deptoVal = document.getElementById('departamento').value;
  const valorVal = parseFloat(document.getElementById('valor').value);

  const chaveMes = obterChaveMes(dataVal);
  const tetoDesp = (despesasOrcadas[chaveMes] && despesasOrcadas[chaveMes][deptoVal]) ? despesasOrcadas[chaveMes][deptoVal] : 0;

  if (tetoDesp > 0) {
    const partesNovaData = dataVal.split('-');
    const mesNovo = parseInt(partesNovaData[1]) - 1;
    const anoNovo = parseInt(partesNovaData[0]);

    const totalMesAtual = lancamentos.reduce((acc, item, idx) => {
      if (idx === index) return acc;
      const p = item.data.split('-');
      const m = parseInt(p[1]) - 1;
      const a = parseInt(p[0]);
      if (item.departamento === deptoVal && m === mesNovo && a === anoNovo) {
        return acc + item.valor;
      }
      return acc;
    }, 0);

    if (totalMesAtual + valorVal > tetoDesp) {
      const excesso = (totalMesAtual + valorVal) - tetoDesp;
      alert(`⚠️ ATENÇÃO: Este lançamento excede o Teto de Despesa do setor (${deptoVal}) em R$ ${formatarMoedaBR(excesso)}!\nO lançamento será gravado para fins de registro.`);
    }
  }

  const partes = dataVal.split('-');
  const dataObj = new Date(partes[0], partes[1] - 1, partes[2]);

  const novoItem = {
    data: dataVal,
    diaSemanaIndex: dataObj.getDay(),
    departamento: deptoVal,
    valor: valorVal
  };

  if (index === -1) {
    lancamentos.push(novoItem);
  } else {
    lancamentos[index] = novoItem;
  }

  localStorage.setItem('requisicoes_dados', JSON.stringify(lancamentos));

  sincronizarComFirebase();

  limparFormulario();
  filtrarLancamentos();
});

function obterIntervaloSemana(dataRef) {
  const d = new Date(dataRef);
  const diaSemana = d.getDay();
  const diffSegunda = d.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
  
  const inicioSegunda = new Date(d.setDate(diffSegunda));
  inicioSegunda.setHours(0,0,0,0);
  
  const fimDomingo = new Date(inicioSegunda);
  fimDomingo.setDate(inicioSegunda.getDate() + 6);
  fimDomingo.setHours(23,59,59,999);

  return { inicio: inicioSegunda, fim: fimDomingo };
}

function alternarModoFiltro() {
  const modo = document.getElementById('filtro-modo').value;
  const inputDataBase = document.getElementById('filtro-data-base');

  if (modo === 'semana_especifica') {
    inputDataBase.classList.remove('hidden');
    if (!inputDataBase.value) inputDataBase.valueAsDate = new Date();
  } else {
    inputDataBase.classList.add('hidden');
  }
  filtrarLancamentos();
}

function filtrarLancamentos() {
  const modo = document.getElementById('filtro-modo').value;
  const deptoFiltro = document.getElementById('filtro-depto').value;
  const inputDataBase = document.getElementById('filtro-data-base').value;
  const infoSemana = document.getElementById('info-semana-atual');

  let dataRef = new Date();
  if (modo === 'semana_especifica' && inputDataBase) {
    const p = inputDataBase.split('-');
    dataRef = new Date(p[0], p[1] - 1, p[2]);
  }

  const { inicio, fim } = obterIntervaloSemana(dataRef);

  const lancamentosFiltrados = lancamentos.filter((item, index) => {
    item._originalIndex = index;
    const partes = item.data.split('-');
    const itemData = new Date(partes[0], partes[1] - 1, partes[2]);

    let passaData = true;
    if (modo === 'semana_atual' || modo === 'semana_especifica') {
      passaData = itemData >= inicio && itemData <= fim;
    } else if (modo === 'mes_atual') {
      const hoje = new Date();
      passaData = itemData.getMonth() === hoje.getMonth() && itemData.getFullYear() === hoje.getFullYear();
    }

    let passaDepto = (deptoFiltro === 'todos') || (item.departamento === deptoFiltro);

    return passaData && passaDepto;
  });

  if (modo === 'semana_atual' || modo === 'semana_especifica') {
    infoSemana.innerText = `Exibindo semana de ${inicio.toLocaleDateString('pt-BR')} (Seg) a ${fim.toLocaleDateString('pt-BR')} (Dom)`;
  } else if (modo === 'mes_atual') {
    infoSemana.innerText = `Exibindo lançamentos do mês atual`;
  } else {
    infoSemana.innerText = `Exibindo todo o histórico registrado`;
  }

  renderizarTabela(lancamentosFiltrados);
}

function renderizarTabela(dadosExibicao) {
  const tbody = document.getElementById('tabela-corpo');
  const totalFiltroEl = document.getElementById('total-filtro');
  tbody.innerHTML = '';

  let totalAcumulado = 0;

  if (dadosExibicao.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum lançamento encontrado para este período.</td></tr>`;
    totalFiltroEl.innerText = "R$ 0,00";
    return;
  }

  dadosExibicao.sort((a, b) => new Date(b.data) - new Date(a.data));

  dadosExibicao.forEach((item) => {
    totalAcumulado += item.valor;
    const tr = document.createElement('tr');
    tr.className = "hover:bg-emerald-50/50 transition";

    const dataFormatada = item.data.split('-').reverse().join('/');
    const valorFormatado = "R$ " + formatarMoedaBR(item.valor);

    tr.innerHTML = `
      <td class="p-2 font-medium text-gray-700">${dataFormatada}</td>
      <td class="p-2 text-gray-600">${diasNomes[item.diaSemanaIndex]}</td>
      <td class="p-2 font-semibold text-hotel-primary">${item.departamento}</td>
      <td class="p-2 font-bold text-gray-800">${valorFormatado}</td>
      <td class="p-2 text-center space-x-1">
        <button onclick="prepararEdicao(${item._originalIndex})" class="px-2 py-0.5 bg-amber-500 text-white text-[11px] rounded hover:bg-amber-600 font-medium">Editar</button>
        <button onclick="excluirItem(${item._originalIndex})" class="px-2 py-0.5 bg-red-600 text-white text-[11px] rounded hover:bg-red-700 font-medium">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  totalFiltroEl.innerText = "R$ " + formatarMoedaBR(totalAcumulado);
}

function prepararEdicao(indexOriginal) {
  const item = lancamentos[indexOriginal];
  document.getElementById('edit-index').value = indexOriginal;
  document.getElementById('data').value = item.data;
  document.getElementById('departamento').value = item.departamento;
  document.getElementById('valor').value = item.valor;

  document.getElementById('form-titulo').innerHTML = "<span>✏️</span> Editar Lançamento";
  document.getElementById('btn-salvar').innerText = "Atualizar";
  document.getElementById('btn-cancelar').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirItem(indexOriginal) {
  if (confirm("Deseja realmente excluir este lançamento?")) {
    lancamentos.splice(indexOriginal, 1);
    localStorage.setItem('requisicoes_dados', JSON.stringify(lancamentos));

    sincronizarComFirebase();

    filtrarLancamentos();
  }
}

function limparFormulario() {
  document.getElementById('form-requisicao').reset();
  document.getElementById('edit-index').value = "-1";
  document.getElementById('data').valueAsDate = new Date();
  document.getElementById('form-titulo').innerHTML = "<span>📝</span> Novo Lançamento";
  document.getElementById('btn-salvar').innerText = "Salvar";
  document.getElementById('btn-cancelar').classList.add('hidden');
}

function formatarK(valor) {
  if (valor === 0) return 'R$ 0';
  if (valor >= 1000) {
    return 'R$ ' + (valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k';
  }
  return 'R$ ' + valor.toLocaleString('pt-BR');
}

function atualizarGraficos() {
  const modoDash = document.getElementById('dash-filtro-periodo')?.value || 'mes_atual';
  const { inicio, fim } = obterIntervaloSemana(new Date());

  const dadosDash = lancamentos.filter(item => {
    const partes = item.data.split('-');
    const itemData = new Date(partes[0], partes[1] - 1, partes[2]);

    if (modoDash === 'semana_atual') {
      return itemData >= inicio && itemData <= fim;
    } else if (modoDash === 'mes_atual') {
      const hoje = new Date();
      return itemData.getMonth() === hoje.getMonth() && itemData.getFullYear() === hoje.getFullYear();
    }
    return true;
  });

  const totaisPorDepto = {};
  let totalGeral = 0;

  dadosDash.forEach(item => {
    totalGeral += item.valor;
    totaisPorDepto[item.departamento] = (totaisPorDepto[item.departamento] || 0) + item.valor;
  });

  const hoje = new Date();
  const chaveMesAtual = `${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
  const recRealDoMes = receitasRealizadas[chaveMesAtual] || {};
  const despOrcDoMes = despesasOrcadas[chaveMesAtual] || {};

  let receitaRealizadaHotel = 0;
  let despesaOrcadaHotel = 0;

  departamentosLista.forEach(d => {
    receitaRealizadaHotel += (recRealDoMes[d] || 0);
    despesaOrcadaHotel += (despOrcDoMes[d] || 0);
  });

  document.getElementById('dash-card-total').innerText = "R$ " + formatarMoedaBR(totalGeral);
  
  const elPerc = document.getElementById('dash-card-percentual');
  if (receitaRealizadaHotel > 0) {
    const cmvReal = ((totalGeral / receitaRealizadaHotel) * 100).toFixed(1);
    elPerc.innerText = `${cmvReal}%`;
    elPerc.className = `text-xl font-extrabold mt-0.5 ${cmvReal > 29.0 ? 'text-red-400' : 'text-emerald-400'}`;
  } else {
    elPerc.innerText = 'N/A';
    elPerc.className = 'text-xl font-extrabold text-slate-500 mt-0.5';
  }

  let topDepto = '-';
  let maiorValor = 0;
  for (let depto in totaisPorDepto) {
    if (totaisPorDepto[depto] > maiorValor) {
      maiorValor = totaisPorDepto[depto];
      topDepto = depto;
    }
  }
  document.getElementById('dash-card-top-depto').innerText = topDepto;

  const labelsDeptos = [];
  const percentuaisExibicaoBarra = []; 
  const percentuaisReais = [];         
  const valoresGastos = [];
  const valoresTetos = [];
  const coresGastos = [];

  const analiseIA = [];

  departamentosLista.forEach(depto => {
    const gasto = totaisPorDepto[depto] || 0;
    const despOrc = despOrcDoMes[depto] || 0;
    const recReal = recRealDoMes[depto] || 0;

    if (gasto > 0 || despOrc > 0) {
      labelsDeptos.push(depto);
      valoresGastos.push(gasto);
      valoresTetos.push(despOrc);

      let percConsumidoDesp = 0;
      if (despOrc > 0) {
        percConsumidoDesp = (gasto / despOrc) * 100;
      } else if (gasto > 0) {
        percConsumidoDesp = 100;
      }

      const cmvLocal = recReal > 0 ? ((gasto / recReal) * 100) : 0;
      
      percentuaisReais.push(percConsumidoDesp);
      percentuaisExibicaoBarra.push(Math.min(100, parseFloat(percConsumidoDesp.toFixed(1))));

      if (despOrc > 0 && gasto > despOrc) {
        coresGastos.push('#ef4444');
      } else if (despOrc > 0 && percConsumidoDesp >= 80.0) {
        coresGastos.push('#f59e0b');
      } else {
        coresGastos.push('#10b981');
      }

      analiseIA.push({
        depto,
        gasto,
        despOrc,
        recReal,
        cmvLocal,
        saldo: despOrc - gasto,
        percConsumidoDesp
      });
    }
  });

  if (chartDeptos) chartDeptos.destroy();
  chartDeptos = new Chart(document.getElementById('chartDeptos'), {
    type: 'bar',
    data: {
      labels: labelsDeptos,
      datasets: [
        {
          label: '% Consumido do Orçamento',
          data: percentuaisExibicaoBarra,
          backgroundColor: coresGastos,
          borderRadius: 4,
          barThickness: 20,
          grouped: false,
          order: 1
        },
        {
          label: 'Teto Orçado (100%)',
          data: percentuaisExibicaoBarra.map(() => 100),
          backgroundColor: '#334155',
          borderRadius: 4,
          barThickness: 20,
          grouped: false,
          order: 2
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { right: 180 }
      },
      plugins: {
        legend: { 
          display: true, 
          position: 'top', 
          labels: { color: '#f8fafc', font: { size: 11, weight: 'bold' } } 
        },
        datalabels: {
          font: { weight: 'bold', size: 10 },
          anchor: 'end',
          align: 'end',
          offset: 8,
          color: (ctx) => {
            const perc = percentuaisReais[ctx.dataIndex];
            if (perc > 100) return '#ef4444';
            if (perc >= 80) return '#fb923c';
            return '#34d399';
          },
          formatter: (value, ctx) => {
            if (ctx.datasetIndex === 0) {
              const percReal = percentuaisReais[ctx.dataIndex];
              const gasto = valoresGastos[ctx.dataIndex];
              const teto = valoresTetos[ctx.dataIndex];

              if (teto === 0 && gasto > 0) {
                return `🚨 Sem Teto (${formatarK(gasto)})`;
              }

              if (percReal > 100) {
                return `🚨 ${percReal.toFixed(1)}% (${formatarK(gasto)} / ${formatarK(teto)})`;
              }

              return `${percReal.toFixed(1)}% (${formatarK(gasto)} / ${formatarK(teto)})`;
            }
            return '';
          }
        }
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: { 
            callback: (val) => val + '%', 
            color: '#94a3b8', 
            font: { size: 10 } 
          },
          grid: { color: '#1e293b' }
        },
        y: {
          ticks: { color: '#f8fafc', font: { size: 11, weight: 'bold' } },
          grid: { display: false }
        }
      }
    }
  });

  renderizarInsightsIA(analiseIA);
}

function renderizarInsightsIA(listaAnalise) {
  const container = document.getElementById('container-ia-insights');
  if (!container) return;

  container.innerHTML = '';

  const hoje = new Date();
  const chaveMesAtual = `${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
  
  const recOrcTotal = Object.values(receitasOrcadas[chaveMesAtual] || {}).reduce((a, b) => a + b, 0);
  const recRealTotal = Object.values(receitasRealizadas[chaveMesAtual] || {}).reduce((a, b) => a + b, 0);
  const despOrcTotal = Object.values(despesasOrcadas[chaveMesAtual] || {}).reduce((a, b) => a + b, 0);
  
  const reqLancTotal = lancamentos.reduce((acc, item) => {
    const p = item.data.split('-');
    if (parseInt(p[1]) === (hoje.getMonth() + 1) && parseInt(p[0]) === hoje.getFullYear()) {
      return acc + item.valor;
    }
    return acc;
  }, 0);

  if (recOrcTotal > 0 || despOrcTotal > 0) {
    const pctReceita = recOrcTotal > 0 ? ((recRealTotal / recOrcTotal) * 100).toFixed(1) : '0.0';
    const cmvMetaPct = recOrcTotal > 0 ? (despOrcTotal / recOrcTotal) * 100 : 0;
    const cmvRealPct = recRealTotal > 0 ? (reqLancTotal / recRealTotal) * 100 : 0;

    const META_CMV_ALVO = 23.0;
    const pontosEconomizados = META_CMV_ALVO - cmvRealPct;
    const savingPontosRS = recRealTotal * (pontosEconomizados / 100);

    const savingFormatado = savingPontosRS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const corBadgeSaving = savingPontosRS >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800';

    const cardGlobal = document.createElement('div');
    cardGlobal.className = "p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 shadow-sm mb-2";
    cardGlobal.innerHTML = `
      <div class="font-bold text-blue-800 flex items-center justify-between mb-1">
        <span class="flex items-center gap-1">📈 PANORAMA FINANCEIRO & SAVING (CMV)</span>
        <span class="${corBadgeSaving} px-1.5 py-0.5 rounded font-extrabold text-[10px]">
          💰 Saving: ${savingFormatado} (${pontosEconomizados.toFixed(1)} p.p. de folga)
        </span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-1.5 mt-1 font-medium text-[11px]">
        <div>• <strong>Meta Receita:</strong> ${pctReceita}% real.</div>
        <div>• <strong>CMV Realizado:</strong> ${cmvRealPct.toFixed(1)}%</div>
        <div>• <strong>Meta Operacional:</strong> ${META_CMV_ALVO.toFixed(1)}%</div>
        <div>• <strong>Economia (Saving):</strong> <strong class="text-emerald-700">${savingFormatado}</strong></div>
      </div>
    `;
    container.appendChild(cardGlobal);
  }

  const estourados = listaAnalise.filter(i => i.saldo < 0);
  const atencao = listaAnalise.filter(i => i.saldo >= 0 && i.percConsumidoDesp >= 80);
  const folga = listaAnalise.filter(i => i.saldo > 0).sort((a, b) => b.saldo - a.saldo);

  if (estourados.length > 0) {
    estourados.forEach(item => {
      let sugestaoHTML = '';
      if (folga.length > 0) {
        const doador = folga[0];
        sugestaoHTML = `
          <div class="mt-1.5 pt-1.5 border-t border-red-200/60 text-[10px] text-red-900 font-medium">
            💡 <strong>Remanejamento Sugerido:</strong> Transferir até 
            <strong>R$ ${formatarMoedaBR(Math.abs(item.saldo))}</strong> do saldo restante de <strong>${doador.depto}</strong> (Sobra: R$ ${formatarMoedaBR(doador.saldo)}).
          </div>
        `;
      }

      const card = document.createElement('div');
      card.className = "p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 shadow-sm mb-2";
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <span class="font-bold text-red-700">🚨 DESPESA EXCEDIDA</span>
          <span class="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-bold">${item.percConsumidoDesp.toFixed(1)}% do Orçado</span>
        </div>
        <p class="mt-1 font-semibold text-gray-800">
          <strong>${item.depto}</strong> excedeu o orçado em <strong>R$ ${formatarMoedaBR(Math.abs(item.saldo))}</strong>.
        </p>
        <p class="text-[10px] text-gray-600 mt-0.5">CMV sobre Receita Real: <strong>${item.cmvLocal.toFixed(1)}%</strong></p>
        ${sugestaoHTML}
      `;
      container.appendChild(card);
    });
  }

  if (atencao.length > 0) {
    atencao.forEach(item => {
      const card = document.createElement('div');
      card.className = "p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 shadow-sm mb-2";
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <span class="font-bold text-amber-800">⚠️ ATENÇÃO AO ORÇAMENTO</span>
          <span class="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">${item.percConsumidoDesp.toFixed(1)}%</span>
        </div>
        <p class="mt-1 text-amber-950 font-medium">
          <strong>${item.depto}</strong> atingiu ${item.percConsumidoDesp.toFixed(1)}% do orçado. Saldo restante: R$ ${formatarMoedaBR(item.saldo)}.
        </p>
      `;
      container.appendChild(card);
    });
  }

  if (estourados.length === 0 && atencao.length === 0) {
    const card = document.createElement('div');
    card.className = "p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 shadow-sm";
    card.innerHTML = `
      <div class="flex items-center gap-1 font-bold text-emerald-700">
        <span>✅</span> OPERAÇÃO ORÇAMENTÁRIA SAUDÁVEL
      </div>
      <p class="mt-1 text-emerald-900">
        Todos os setores operam dentro dos limites orçados de insumos.
      </p>
    `;
    container.appendChild(card);
  }
}