// Módulo isolado de verificação da IA (Não interfere na importação da DRE)
function verificarDivergenciaDRE_IA() {
  const container = document.getElementById('container-ia-insights');
  if (!container) return;

  if (typeof receitasOrcadas === 'undefined') return;

  // Busca a chave do mês ativo no sistema ou pega a última cadastrada nas receitas
  const mesesDisponiveis = Object.keys(receitasOrcadas);
  if (mesesDisponiveis.length === 0) return;

  // Tenta usar o mês selecionado globalmente ou o último importado (ex: "08-2026")
  const chaveMesAtivo = (typeof mesAtualDRE !== 'undefined' && mesAtualDRE) 
    ? mesAtualDRE 
    : mesesDisponiveis[mesesDisponiveis.length - 1];

  const orcadosMes = receitasOrcadas[chaveMesAtivo] || {};
  const totalReceitaOrcadaSomaSetores = Object.values(orcadosMes).reduce((a, b) => a + b, 0);

  const totalReceitaOrcadaSintetica = 6692366.53; // Valor sintético consolidado
  const diffDREOculta = totalReceitaOrcadaSintetica - totalReceitaOrcadaSomaSetores;

  if (Math.abs(diffDREOculta) > 1 && totalReceitaOrcadaSomaSetores > 0) {
    if (document.getElementById('card-auditoria-dre')) return;

    const cardAlertaDRE = document.createElement('div');
    cardAlertaDRE.id = "card-auditoria-dre";
    cardAlertaDRE.className = "p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 shadow-sm mb-2";
    cardAlertaDRE.innerHTML = `
      <div class="font-bold text-amber-900 flex items-center justify-between mb-1">
        <span>⚠️ AUDITORIA DRE: Divergência de Detalhamento Detectada</span>
        <span class="bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded text-[10px] font-extrabold">
          Diferença: R$ ${formatarMoedaBR(diffDREOculta)}
        </span>
      </div>
      <div class="text-[11px] leading-relaxed">
        O total consolidado orçado na DRE é <strong>R$ ${formatarMoedaBR(totalReceitaOrcadaSintetica)}</strong>, mas a soma dos centros de custo detalhados é <strong>R$ ${formatarMoedaBR(totalReceitaOrcadaSomaSetores)}</strong>.<br>
        Existe um valor não detalhado nas sublinhas de <strong>R$ ${formatarMoedaBR(diffDREOculta)}</strong> (referente ao MAP/FAP / Bourbon Bistrot).
      </div>
    `;
    container.insertBefore(cardAlertaDRE, container.firstChild);
  }
}

// Executa a verificação periodicamente
setInterval(verificarDivergenciaDRE_IA, 1000);