// ============================================
// CONFIGURAÇÃO DO FIREBASE - ClaraPlan
// Sistema de Código de Acesso
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBFTbSdWSKOIsakGrKIdeBpPMeGSe4fBo",
    authDomain: "claraplan.firebaseapp.com",
    projectId: "claraplan",
    storageBucket: "claraplan.firebasestorage.app",
    messagingSenderId: "657425592514",
    appId: "1:657425592514:web:0ac29c2ed43f30f91fcb5b"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referências
const db = firebase.firestore();

// ============================================
// SISTEMA DE CÓDIGO DE ACESSO
// ============================================

let codigoAtual = null;

// Verificar se já tem código salvo
const codigoSalvo = localStorage.getItem('claraplan_codigo');
if (codigoSalvo) {
    codigoAtual = codigoSalvo;
    mostrarApp();
    carregarDadosNuvem();
} else {
    mostrarTelaAcesso();
}

function mostrarTelaAcesso() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-loading').style.display = 'none';
}

function mostrarApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('user-email').textContent = `Código: ${codigoAtual}`;
}

// Entrar com código
document.getElementById('codigo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const codigo = document.getElementById('input-codigo').value.trim();
    
    if (codigo.length < 4) {
        alert('O código deve ter no mínimo 4 caracteres.');
        return;
    }
    
    try {
        document.getElementById('auth-loading').style.display = 'block';
        document.getElementById('codigo-form').style.display = 'none';
        
        // Hash do código
        const hashCodigo = await gerarHash(codigo);
        
        // Verificar se código está permitido
        const permitido = await verificarCodigoPermitido(hashCodigo);
        
        if (!permitido) {
            alert('❌ Código não autorizado. Entre em contato com o administrador.');
            document.getElementById('auth-loading').style.display = 'none';
            document.getElementById('codigo-form').style.display = 'block';
            return;
        }
        
        codigoAtual = hashCodigo;
        
        // Salvar código localmente
        localStorage.setItem('claraplan_codigo', codigoAtual);
        
        // Carregar dados
        await carregarDadosNuvem();
        
        mostrarApp();
    } catch (error) {
        console.error('Erro ao entrar:', error);
        alert('Erro ao conectar. Verifique sua internet.');
        document.getElementById('auth-loading').style.display = 'none';
        document.getElementById('codigo-form').style.display = 'block';
    }
});

// Verificar se código está na lista de permitidos
async function verificarCodigoPermitido(hashCodigo) {
    try {
        const doc = await db.collection('configuracoes').doc('codigos_permitidos').get();
        
        if (!doc.exists) {
            // Se não existe, criar com lista vazia (primeiro uso)
            console.log('⚠️ Lista de códigos não encontrada. Configure no Firebase.');
            return false;
        }
        
        const dados = doc.data();
        const listaPermitidos = dados.codigos || [];
        
        return listaPermitidos.includes(hashCodigo);
    } catch (error) {
        console.error('Erro ao verificar código:', error);
        return false;
    }
}

// Sair
document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('Deseja sair? Você precisará digitar o código novamente.')) {
        localStorage.removeItem('claraplan_codigo');
        codigoAtual = null;
        document.getElementById('input-codigo').value = '';
        document.getElementById('codigo-form').style.display = 'block';
        mostrarTelaAcesso();
    }
});

// ============================================
// HASH DO CÓDIGO (SHA-256)
// ============================================

async function gerarHash(codigo) {
    const msgBuffer = new TextEncoder().encode(codigo);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 32); // Usar primeiros 32 chars
}

// ============================================
// SINCRONIZAÇÃO AUTOMÁTICA COM PROXY
// ============================================

// Aguardar carregamento completo
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🔄 Iniciando sistema de sincronização automática...');
        
        // Interceptar mudanças no objeto dados
        if (window.dados) {
            const handler = {
                set(target, property, value) {
                    target[property] = value;
                    console.log('💾 Mudança detectada, salvando...');
                    salvarDadosNuvem();
                    return true;
                }
            };
            
            // Criar proxy para interceptar mudanças
            const dadosProxy = new Proxy(window.dados, handler);
            
            // Substituir dados original
            Object.defineProperty(window, 'dados', {
                get() { return dadosProxy; },
                set(newValue) { 
                    console.log('💾 Dados atualizados, salvando...');
                    dadosProxy = newValue;
                    salvarDadosNuvem();
                }
            });
        }
        
        // Também sobrescrever salvarDados como backup
        const salvarOriginal = window.salvarDados;
        window.salvarDados = function() {
            console.log('💾 salvarDados() chamado');
            if (salvarOriginal) salvarOriginal();
            salvarDadosNuvem();
        };
        
        console.log('✅ Sistema de sincronização ativado!');
    }, 500);
});

// ============================================
// SINCRONIZAÇÃO FIRESTORE
// ============================================

async function salvarDadosNuvem() {
    if (!codigoAtual) {
        console.log('⚠️ Código não definido, pulando salvamento');
        return;
    }
    
    // Debounce para evitar salvamentos muito frequentes
    clearTimeout(window.salvarTimeout);
    window.salvarTimeout = setTimeout(async () => {
        try {
            // Acessar dados global sem window
            const dadosAtuais = typeof dados !== 'undefined' ? dados : window.dados;
            
            if (!dadosAtuais) {
                console.error('❌ Dados não encontrados');
                return;
            }
            
            await db.collection('planners').doc(codigoAtual).set({
                categorias: dadosAtuais.categorias,
                habitos: dadosAtuais.habitos,
                tarefas: dadosAtuais.tarefas,
                ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Dados salvos na nuvem');
        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
        }
    }, 1000); // Aguarda 1 segundo sem mudanças antes de salvar
}

async function carregarDadosNuvem() {
    if (!codigoAtual) return;
    
    try {
        const doc = await db.collection('planners').doc(codigoAtual).get();
        
        if (doc.exists) {
            const dadosNuvem = doc.data();
            dados.categorias = dadosNuvem.categorias || dados.categorias;
            dados.habitos = dadosNuvem.habitos || [];
            dados.tarefas = dadosNuvem.tarefas || [];
            
            // Atualizar interface
            renderizarCategorias();
            renderizarHabitos();
            renderizarTarefas();
            atualizarVisaoDiaria();
            
            console.log('✅ Dados carregados da nuvem');
        } else {
            console.log('ℹ️ Primeiro acesso com este código');
        }
    } catch (error) {
        console.error('Erro ao carregar:', error);
    }
}


