// Estado da Aplicação
let dados = {
    categorias: [
        { id: 1, nome: 'Saúde', cor: '#2ecc71' },
        { id: 2, nome: 'Produtividade', cor: '#3498db' },
        { id: 3, nome: 'Pessoal', cor: '#9b59b6' }
    ],
    habitos: [],
    tarefas: []
};

let editandoId = null;
let editandoTipo = null;
let acaoConfirmar = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    inicializarEventos();
    atualizarVisaoDiaria();
    renderizarHabitos();
    renderizarTarefas();
    renderizarCategorias();
});

// Carregar dados do localStorage (simulando Replit JSON)
function carregarDados() {
    const dadosSalvos = localStorage.getItem('plannerDados');
    if (dadosSalvos) {
        dados = JSON.parse(dadosSalvos);
    }
}

// Salvar dados no localStorage
function salvarDados() {
    localStorage.setItem('plannerDados', JSON.stringify(dados));
}

// Navegação por Abas
function inicializarEventos() {
    // Navegação
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            if (tabId === 'visao-diaria') atualizarVisaoDiaria();
        });
    });

    // Botões de adicionar
    document.getElementById('btn-add-habito').addEventListener('click', () => abrirModalHabito());
    document.getElementById('btn-add-tarefa').addEventListener('click', () => abrirModalTarefa());
    document.getElementById('btn-add-categoria').addEventListener('click', () => abrirModalCategoria());

    // Formulários
    document.getElementById('form-habito').addEventListener('submit', salvarHabito);
    document.getElementById('form-tarefa').addEventListener('submit', salvarTarefa);
    document.getElementById('form-categoria').addEventListener('submit', salvarCategoria);

    // Botões de cancelar
    document.getElementById('btn-cancelar-habito').addEventListener('click', () => fecharModal('modal-habito'));
    document.getElementById('btn-cancelar-tarefa').addEventListener('click', () => fecharModal('modal-tarefa'));
    document.getElementById('btn-cancelar-categoria').addEventListener('click', () => fecharModal('modal-categoria'));
    document.getElementById('btn-cancelar-confirmar').addEventListener('click', () => fecharModal('modal-confirmar'));

    // Fechar modal clicando no X ou fora
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Export/Import
    document.getElementById('btn-exportar').addEventListener('click', exportarJSON);
    document.getElementById('file-importar').addEventListener('change', importarJSON);

    // Confirmação
    document.getElementById('btn-confirmar-acao').addEventListener('click', () => {
        if (acaoConfirmar) acaoConfirmar();
        fecharModal('modal-confirmar');
    });
}

// Visão Diária
function atualizarVisaoDiaria() {
    const hoje = new Date();
    const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('data-atual').textContent = hoje.toLocaleDateString('pt-BR', opcoes);

    const habitosHoje = dados.habitos;
    
    // Filtro melhorado para tarefas de hoje
    const tarefasHoje = dados.tarefas.filter(t => {
        if (!t.data) return false;
        const dataTarefa = new Date(t.data + 'T00:00:00');
        const hojeString = hoje.toISOString().split('T')[0];
        return t.data === hojeString;
    });

    // Estatísticas
    const habitosConcluidos = habitosHoje.filter(h => {
        const historicoHoje = h.historico?.find(d => new Date(d).toDateString() === hoje.toDateString());
        return historicoHoje !== undefined;
    }).length;

    const tarefasConcluidas = tarefasHoje.filter(t => t.concluida).length;

    document.getElementById('habitos-hoje-total').textContent = habitosHoje.length;
    document.getElementById('habitos-concluidos').textContent = habitosConcluidos;
    document.getElementById('tarefas-hoje-total').textContent = tarefasHoje.length;

    // Hábitos de hoje
    renderizarHabitosHoje(habitosHoje, hoje);

    // Tarefas de hoje
    renderizarTarefasHoje(tarefasHoje);

    // Próximos eventos
    renderizarProximosEventos(hoje);

    // Gráfico
    renderizarGraficoCategorias(habitosHoje, hoje);
}

function renderizarHabitosHoje(habitos, hoje) {
    const container = document.getElementById('habitos-hoje-lista');
    
    if (habitos.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhum hábito cadastrado</p></div>';
        return;
    }

    habitos.sort((a, b) => a.horario.localeCompare(b.horario));

    container.innerHTML = habitos.map(h => {
        const concluido = h.historico?.some(d => new Date(d).toDateString() === hoje.toDateString());
        const categoria = dados.categorias.find(c => c.id === h.categoriaId);
        
        return `
            <div class="item ${concluido ? 'concluido' : ''}">
                <div class="item-content">
                    <input type="checkbox" class="checkbox-custom" 
                           ${concluido ? 'checked' : ''} 
                           onchange="toggleHabito(${h.id})">
                    <div class="item-info">
                        <div class="item-titulo">${h.nome}</div>
                        <div class="item-detalhes">
                            ${h.horario} • 
                            <span class="badge-categoria" style="background: ${categoria?.cor}">${categoria?.nome}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderizarTarefasHoje(tarefas) {
    const container = document.getElementById('tarefas-hoje-lista');
    
    if (tarefas.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhuma tarefa para hoje</p></div>';
        return;
    }

    tarefas.sort((a, b) => a.hora.localeCompare(b.hora));

    container.innerHTML = tarefas.map(t => `
        <div class="item ${t.concluida ? 'concluido' : ''}">
            <div class="item-content">
                <input type="checkbox" class="checkbox-custom" 
                       ${t.concluida ? 'checked' : ''} 
                       onchange="toggleTarefa(${t.id})">
                <div class="item-info">
                    <div class="item-titulo">${t.titulo}</div>
                    <div class="item-detalhes">
                        ${t.hora} • 
                        <span class="badge badge-${t.prioridade}">${t.prioridade.toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderizarProximosEventos(hoje) {
    const container = document.getElementById('proximos-eventos');
    
    const proximasTarefas = dados.tarefas
        .filter(t => new Date(t.data) > hoje && !t.concluida)
        .sort((a, b) => new Date(a.data) - new Date(b.data))
        .slice(0, 5);

    if (proximasTarefas.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhum evento próximo</p></div>';
        return;
    }

    container.innerHTML = proximasTarefas.map(t => {
        const data = new Date(t.data);
        const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        return `
            <div class="item">
                <div class="item-info">
                    <div class="item-titulo">${t.titulo}</div>
                    <div class="item-detalhes">
                        ${dataFormatada} às ${t.hora} • 
                        <span class="badge badge-${t.prioridade}">${t.prioridade.toUpperCase()}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderizarGraficoCategorias(habitos, hoje) {
    const canvas = document.getElementById('grafico-categorias');
    const ctx = canvas.getContext('2d');
    
    // Limpar canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
    if (habitos.length === 0) return;

    // Calcular progresso por categoria
    const progressoPorCategoria = {};
    let total = 0;
    
    dados.categorias.forEach(cat => {
        const habitosCategoria = habitos.filter(h => h.categoriaId === cat.id);
        if (habitosCategoria.length === 0) return;
        
        const concluidos = habitosCategoria.filter(h => 
            h.historico?.some(d => new Date(d).toDateString() === hoje.toDateString())
        ).length;
        
        progressoPorCategoria[cat.nome] = {
            valor: concluidos,
            total: habitosCategoria.length,
            cor: cat.cor
        };
        total += habitosCategoria.length;
    });

    if (total === 0) return;

    // Desenhar gráfico de pizza
    const centerX = canvas.width / 3;
    const centerY = canvas.height / 2;
    const radius = 70;
    let startAngle = -Math.PI / 2;

    Object.keys(progressoPorCategoria).forEach(nome => {
        const catData = progressoPorCategoria[nome];
        const sliceAngle = (catData.total / total) * 2 * Math.PI;
        
        // Desenhar fatia
        ctx.fillStyle = catData.cor;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        
        // Borda branca
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        startAngle += sliceAngle;
    });
    
    // Legenda à direita
    let yLegend = 30;
    const xLegend = canvas.width / 2 + 20;
    
    Object.keys(progressoPorCategoria).forEach(nome => {
        const catData = progressoPorCategoria[nome];
        const percentual = Math.round((catData.valor / catData.total) * 100);
        
        // Quadrado colorido
        ctx.fillStyle = catData.cor;
        ctx.fillRect(xLegend, yLegend - 10, 15, 15);
        
        // Texto
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(nome, xLegend + 22, yLegend + 2);
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText(`${catData.valor}/${catData.total} (${percentual}%)`, xLegend + 22, yLegend + 18);
        
        yLegend += 40;
    });
}

// Gerar últimos N dias para calendário visual
function gerarUltimosDias(quantidade) {
    const dias = [];
    const hoje = new Date();
    for (let i = quantidade - 1; i >= 0; i--) {
        const dia = new Date(hoje);
        dia.setDate(hoje.getDate() - i);
        dia.setHours(0, 0, 0, 0);
        dias.push(dia);
    }
    return dias;
}

// Hábitos
function renderizarHabitos() {
    const container = document.getElementById('lista-habitos');
    
    if (dados.habitos.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhum hábito cadastrado. Clique em "Adicionar Hábito" para começar!</p></div>';
        return;
    }

    const hoje = new Date();

    container.innerHTML = dados.habitos.map(h => {
        const categoria = dados.categorias.find(c => c.id === h.categoriaId);
        const diasConcluidos = h.historico?.length || 0;
        const progresso = (diasConcluidos / h.metaDias) * 100;
        const concluido = h.historico?.some(d => new Date(d).toDateString() === hoje.toDateString());
        
        // Calendário visual dos últimos 7 dias - versão compacta
        const ultimosDias = gerarUltimosDias(7);
        const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        const calendarioHTML = ultimosDias.map((dia, index) => {
            const diaCompleto = h.historico?.some(d => 
                new Date(d).toDateString() === dia.toDateString()
            );
            const isHoje = dia.toDateString() === hoje.toDateString();
            const diaSemana = diasSemana[dia.getDay()];
            
            return `<div class="dia-check-wrapper">
                        <span class="dia-label">${diaSemana}</span>
                        <span class="dia-check ${diaCompleto ? 'concluido' : ''} ${isHoje ? 'hoje' : ''}" 
                              title="${dia.toLocaleDateString('pt-BR')}">
                            ${diaCompleto ? '✓' : ''}
                        </span>
                    </div>`;
        }).join('');
        
        return `
            <div class="item">
                <div class="item-content">
                    <input type="checkbox" class="checkbox-custom" 
                           ${concluido ? 'checked' : ''} 
                           onchange="toggleHabito(${h.id})">
                    <div class="item-info">
                        <div class="item-titulo">${h.nome}</div>
                        <div class="item-detalhes">
                            ${h.horario} • 
                            <span class="badge-categoria" style="background: ${categoria?.cor}">${categoria?.nome}</span> •
                            ${diasConcluidos}/${h.metaDias} dias • 
                            Streak: ${calcularStreak(h.historico)} dias
                        </div>
                        <div class="progresso-bar">
                            <div class="progresso-fill" style="width: ${Math.min(progresso, 100)}%"></div>
                        </div>
                        <div class="historico-dias">${calendarioHTML}</div>
                    </div>
                </div>
                <div class="item-acoes">
                    <button class="btn-icon" onclick="editarHabito(${h.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="confirmarExclusao(() => excluirHabito(${h.id}), 'Excluir este hábito?')" title="Excluir">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function calcularStreak(historico) {
    if (!historico || historico.length === 0) return 0;
    
    const datas = historico.map(d => new Date(d)).sort((a, b) => b - a);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let dataEsperada = new Date(hoje);
    
    for (const data of datas) {
        const dataHistorico = new Date(data);
        dataHistorico.setHours(0, 0, 0, 0);
        
        if (dataHistorico.getTime() === dataEsperada.getTime()) {
            streak++;
            dataEsperada.setDate(dataEsperada.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

function toggleHabito(id) {
    const habito = dados.habitos.find(h => h.id === id);
    if (!habito) return;
    
    if (!habito.historico) habito.historico = [];
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojString = hoje.toISOString();
    
    const index = habito.historico.findIndex(d => new Date(d).toDateString() === hoje.toDateString());
    
    if (index > -1) {
        habito.historico.splice(index, 1);
    } else {
        habito.historico.push(hojString);
    }
    
    salvarDados();
    if (window.salvarDadosNuvem) {
        salvarDadosNuvem();
    }
    renderizarHabitos();
    atualizarVisaoDiaria();
}

function abrirModalHabito(id = null) {
    editandoId = id;
    const modal = document.getElementById('modal-habito');
    const form = document.getElementById('form-habito');
    
    // Atualizar dropdown de categorias
    const selectCategoria = document.getElementById('habito-categoria');
    selectCategoria.innerHTML = dados.categorias.map(c => 
        `<option value="${c.id}">${c.nome}</option>`
    ).join('');
    
    if (id) {
        const habito = dados.habitos.find(h => h.id === id);
        document.getElementById('modal-habito-titulo').textContent = 'Editar Hábito';
        document.getElementById('habito-nome').value = habito.nome;
        document.getElementById('habito-meta').value = habito.metaDias;
        document.getElementById('habito-categoria').value = habito.categoriaId;
        document.getElementById('habito-horario').value = habito.horario;
    } else {
        document.getElementById('modal-habito-titulo').textContent = 'Adicionar Hábito';
        form.reset();
    }
    
    modal.classList.add('active');
}

function salvarHabito(e) {
    e.preventDefault();
    
    const habito = {
        nome: document.getElementById('habito-nome').value,
        metaDias: parseInt(document.getElementById('habito-meta').value),
        categoriaId: parseInt(document.getElementById('habito-categoria').value),
        horario: document.getElementById('habito-horario').value
    };
    
    if (editandoId) {
        const index = dados.habitos.findIndex(h => h.id === editandoId);
        dados.habitos[index] = { ...dados.habitos[index], ...habito };
    } else {
        habito.id = Date.now();
        habito.historico = [];
        dados.habitos.push(habito);
    }
    
    salvarDados();
    if (window.salvarDadosNuvem) {
        salvarDadosNuvem();
    }
    renderizarHabitos();
    fecharModal('modal-habito');
    editandoId = null;
}

function editarHabito(id) {
    abrirModalHabito(id);
}

function excluirHabito(id) {
    dados.habitos = dados.habitos.filter(h => h.id !== id);
    salvarDados();
    if (window.salvarDadosNuvem) {
        salvarDadosNuvem();
    }
    renderizarHabitos();
    atualizarVisaoDiaria();
}

// Tarefas
function renderizarTarefas() {
    const container = document.getElementById('lista-tarefas');
    
    if (dados.tarefas.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhuma tarefa cadastrada. Clique em "Adicionar Tarefa" para começar!</p></div>';
        return;
    }

    const tarefasOrdenadas = [...dados.tarefas].sort((a, b) => {
        const dataA = new Date(a.data + ' ' + a.hora);
        const dataB = new Date(b.data + ' ' + b.hora);
        return dataA - dataB;
    });

    container.innerHTML = tarefasOrdenadas.map(t => {
        const data = new Date(t.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        
        return `
            <div class="item ${t.concluida ? 'concluido' : ''}">
                <div class="item-content">
                    <input type="checkbox" class="checkbox-custom" 
                           ${t.concluida ? 'checked' : ''} 
                           onchange="toggleTarefa(${t.id})">
                    <div class="item-info">
                        <div class="item-titulo">${t.titulo}</div>
                        <div class="item-detalhes">
                            ${dataFormatada} às ${t.hora} • 
                            <span class="badge badge-${t.prioridade}">${t.prioridade.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div class="item-acoes">
                    <button class="btn-icon" onclick="editarTarefa(${t.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="confirmarExclusao(() => excluirTarefa(${t.id}), 'Excluir esta tarefa?')" title="Excluir">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleTarefa(id) {
    const tarefa = dados.tarefas.find(t => t.id === id);
    if (!tarefa) return;
    
    tarefa.concluida = !tarefa.concluida;
    
    salvarDados();
    if (window.salvarDadosNuvem) {
        salvarDadosNuvem();
    }
    renderizarTarefas();
    atualizarVisaoDiaria();
}

function abrirModalTarefa(id = null) {
    editandoId = id;
    const modal = document.getElementById('modal-tarefa');
    const form = document.getElementById('form-tarefa');
    
    if (id) {
        const tarefa = dados.tarefas.find(t => t.id === id);
        document.getElementById('modal-tarefa-titulo').textContent = 'Editar Tarefa';
        document.getElementById('tarefa-titulo').value = tarefa.titulo;
        document.getElementById('tarefa-data').value = tarefa.data;
        document.getElementById('tarefa-hora').value = tarefa.hora;
        document.getElementById('tarefa-prioridade').value = tarefa.prioridade;
    } else {
        document.getElementById('modal-tarefa-titulo').textContent = 'Adicionar Tarefa';
        form.reset();
        // Definir data de hoje como padrão
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('tarefa-data').value = hoje;
    }
    
    modal.classList.add('active');
}

function salvarTarefa(e) {
    e.preventDefault();
    
    const tarefa = {
        titulo: document.getElementById('tarefa-titulo').value,
        data: document.getElementById('tarefa-data').value,
        hora: document.getElementById('tarefa-hora').value,
        prioridade: document.getElementById('tarefa-prioridade').value
    };
    
    if (editandoId) {
        const index = dados.tarefas.findIndex(t => t.id === editandoId);
        dados.tarefas[index] = { ...dados.tarefas[index], ...tarefa };
    } else {
        tarefa.id = Date.now();
        tarefa.concluida = false;
        dados.tarefas.push(tarefa);
    }
    
    salvarDados();
    if (window.salvarDadosNuvem) {
        salvarDadosNuvem();
    }
    renderizarTarefas();
    fecharModal('modal-tarefa');
    editandoId = null;
}

function editarTarefa(id) {
    abrirModalTarefa(id);
}

function excluirTarefa(id) {
    dados.tarefas = dados.tarefas.filter(t => t.id !== id);
    salvarDados();
    if (window.salvarDadosNuvem) {
        salvarDadosNuvem();
    }
    renderizarTarefas();
    atualizarVisaoDiaria();
}

// Categorias
function renderizarCategorias() {
    const container = document.getElementById('lista-categorias');
    
    container.innerHTML = dados.categorias.map(c => `
        <div class="item">
            <div class="item-content">
                <span class="categoria-cor" style="background: ${c.cor}"></span>
                <div class="item-info">
                    <div class="item-titulo">${c.nome}</div>
                </div>
            </div>
            <div class="item-acoes">
                <button class="btn-icon" onclick="editarCategoria(${c.id})" title="Editar">✏️</button>
                <button class="btn-icon" onclick="confirmarExclusao(() => excluirCategoria(${c.id}), 'Excluir esta categoria? Isso afetará os hábitos relacionados.')" title="Excluir">🗑️</button>
            </div>
        </div>
    `).join('');
}

function abrirModalCategoria(id = null) {
    editandoId = id;
    const modal = document.getElementById('modal-categoria');
    const form = document.getElementById('form-categoria');
    
    if (id) {
        const categoria = dados.categorias.find(c => c.id === id);
        document.getElementById('modal-categoria-titulo').textContent = 'Editar Categoria';
        document.getElementById('categoria-nome').value = categoria.nome;
        document.getElementById('categoria-cor').value = categoria.cor;
    } else {
        document.getElementById('modal-categoria-titulo').textContent = 'Adicionar Categoria';
        form.reset();
    }
    
    modal.classList.add('active');
}

function salvarCategoria(e) {
    e.preventDefault();
    
    const categoria = {
        nome: document.getElementById('categoria-nome').value,
        cor: document.getElementById('categoria-cor').value
    };
    
    if (editandoId) {
        const index = dados.categorias.findIndex(c => c.id === editandoId);
        dados.categorias[index] = { ...dados.categorias[index], ...categoria };
    } else {
        categoria.id = Date.now();
        dados.categorias.push(categoria);
    }
    
    salvarDados();
    if (window.salvarDadosNuvem) {
        salvarDadosNuvem();
    }
    renderizarCategorias();
    renderizarHabitos();
    atualizarVisaoDiaria();
    fecharModal('modal-categoria');
    editandoId = null;
}

function editarCategoria(id) {
    abrirModalCategoria(id);
}

function excluirCategoria(id) {
    dados.categorias = dados.categorias.filter(c => c.id !== id);
    salvarDados();
    if (window.salvarDadosNuvem) {
        salvarDadosNuvem();
    }
    renderizarCategorias();
    renderizarHabitos();
    atualizarVisaoDiaria();
}

// Confirmação
function confirmarExclusao(acao, mensagem) {
    acaoConfirmar = acao;
    document.getElementById('confirmar-mensagem').textContent = mensagem;
    document.getElementById('modal-confirmar').classList.add('active');
}

// Modais
function fecharModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    editandoId = null;
}

// Export/Import
function exportarJSON() {
    const dataStr = JSON.stringify(dados, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importarJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const dadosImportados = JSON.parse(event.target.result);
            
            if (confirm('Importar dados? Isso substituirá todos os dados atuais.')) {
                dados = dadosImportados;
                salvarDados();
                renderizarHabitos();
                renderizarTarefas();
                renderizarCategorias();
                atualizarVisaoDiaria();
                alert('Dados importados com sucesso!');
            }
        } catch (error) {
            alert('Erro ao importar arquivo. Verifique se é um arquivo JSON válido.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}
