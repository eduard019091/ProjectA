// Função para adicionar item ao pacote (compatível com requisi.html)
window.pacoteItens = window.pacoteItens || [];
window.pacoteInfo = window.pacoteInfo || null;

function adicionarItemPacote() {
    const itemSelect = document.getElementById('itemRequisicao');
    const quantidadeInput = document.getElementById('quantidadeRequisicao');
    const centroCustoInput = document.getElementById('centroCusto');
    const projetoInput = document.getElementById('projeto');
    
    const itemId = itemSelect.value;
    const itemNome = itemSelect.options[itemSelect.selectedIndex].text;
    const quantidade = parseInt(quantidadeInput.value);
    const centroCusto = centroCustoInput.value.trim();
    const projeto = projetoInput.value.trim();

    // Validações
    if (!itemId || !quantidade || quantidade < 1) {
        alert('Selecione um item e informe uma quantidade válida.');
        return;
    }

    if (!centroCusto || !projeto) {
        alert('Centro de custo e projeto são obrigatórios.');
        return;
    }

    // Se é o primeiro item do pacote, salvar as informações do pacote
    if (window.pacoteItens.length === 0) {
        window.pacoteInfo = {
            centroCusto: centroCusto,
            projeto: projeto
        };
        
        // Desabilitar os campos para manter consistência
        centroCustoInput.disabled = true;
        projetoInput.disabled = true;
        
        // Mostrar mensagem informativa
        mostrarMensagemPacote();
    } else {
        // Verificar se os valores coincidem com o pacote
        if (centroCusto !== window.pacoteInfo.centroCusto || projeto !== window.pacoteInfo.projeto) {
            alert(`Este pacote já está configurado para:\nCentro de Custo: ${window.pacoteInfo.centroCusto}\nProjeto: ${window.pacoteInfo.projeto}\n\nTodos os itens devem ter os mesmos valores.`);
            return;
        }
    }

    // Verificar se o item já está no pacote
    const itemExistente = window.pacoteItens.find(item => item.itemId === itemId);
    if (itemExistente) {
        // Se já existe, somar a quantidade
        itemExistente.quantidade += quantidade;
    } else {
        // Se não existe, adicionar novo item
        window.pacoteItens.push({ 
            itemId, 
            itemNome, 
            quantidade 
        });
    }

    atualizarTabelaPacoteItens();
    atualizarContadorPacote();
    
    // Limpar apenas a seleção do item e quantidade
    itemSelect.value = '';
    quantidadeInput.value = '';
// ...existing code...

let userData = {};
    try {
        userData = JSON.parse(sessionStorage.getItem('currentUser')) || 
                  JSON.parse(localStorage.getItem('userData')) || {};
    } catch (e) {
        console.error('Erro ao recuperar dados do usuário:', e);
    }
    
    if (!userData.id) {
        console.log('Usuário não identificado, redirecionando para login');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('Usuário identificado:', userData);
    
    // Configurar interface baseada no tipo de usuário
    configureUserInterface();
    

function mostrarMensagemPacote() {
    // Criar ou atualizar mensagem informativa
    let mensagemDiv = document.getElementById('mensagemPacote');
    if (!mensagemDiv) {
        mensagemDiv = document.createElement('div');
        mensagemDiv.id = 'mensagemPacote';
        mensagemDiv.style.cssText = `
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
            color: #0066cc;
        `;
        
        // Inserir após o formulário de nova requisição
        const form = document.getElementById('requisicaoForm');
        if (form) {
            form.parentNode.insertBefore(mensagemDiv, form.nextSibling);
        }
    }
    
    if (window.pacoteInfo) {
        mensagemDiv.innerHTML = `
            <strong>📦 Modo Pacote Ativo</strong><br>
            Centro de Custo: <strong>${window.pacoteInfo.centroCusto}</strong><br>
            Projeto: <strong>${window.pacoteInfo.projeto}</strong><br>
            <small>Todos os itens adicionados terão essas informações. <button type="button" onclick="limparPacote()" style="background:none;border:none;color:#0066cc;text-decoration:underline;cursor:pointer;">Limpar pacote</button></small>
        `;
    }
}
}

function atualizarContadorPacote() {
    const contador = window.pacoteItens.length;
    const totalItens = window.pacoteItens.reduce((total, item) => total + item.quantidade, 0);
    
    // Atualizar título da seção
    const tituloSecao = document.querySelector('h3');
    if (tituloSecao && tituloSecao.textContent.includes('Pacote')) {
        tituloSecao.textContent = `Pacote de Requisição (${contador} tipos de itens, ${totalItens} unidades)`;
    }
}

function atualizarTabelaPacoteItens() {
    const tbody = document.querySelector('#tabelaPacoteItens tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (window.pacoteItens.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" style="text-align:center;color:#666;">Nenhum item adicionado ao pacote</td>';
        tbody.appendChild(tr);
        return;
    }
    
    window.pacoteItens.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.itemNome.split('(')[0].trim()}</td>
            <td>
                <input type="number" value="${item.quantidade}" min="1" 
                       onchange="atualizarQuantidadeItem(${idx}, this.value)"
                       style="width:60px;text-align:center;">
            </td>
            <td>
                <button type="button" class="btn btn-danger btn-sm" onclick="removerItemPacote(${idx})">
                    Remover
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarQuantidadeItem(index, novaQuantidade) {
    const quantidade = parseInt(novaQuantidade);
    if (quantidade > 0) {
        window.pacoteItens[index].quantidade = quantidade;
        atualizarContadorPacote();
    } else {
        alert('Quantidade deve ser maior que zero');
        atualizarTabelaPacoteItens(); // Restaurar valor anterior
    }
}

function removerItemPacote(index) {
    if (confirm('Deseja remover este item do pacote?')) {
        window.pacoteItens.splice(index, 1);
        atualizarTabelaPacoteItens();
        atualizarContadorPacote();
        
        // Se não há mais itens, reabilitar os campos
        if (window.pacoteItens.length === 0) {
            limparPacote();
        }
    }
}

function limparPacote() {
    if (window.pacoteItens.length > 0) {
        if (!confirm('Deseja limpar todo o pacote? Todos os itens serão removidos.')) {
            return;
        }
    }
    
    window.pacoteItens = [];
    window.pacoteInfo = null;
    
    // Reabilitar campos
    const centroCustoInput = document.getElementById('centroCusto');
    const projetoInput = document.getElementById('projeto');
    if (centroCustoInput) centroCustoInput.disabled = false;
    if (projetoInput) projetoInput.disabled = false;
    
    // Limpar campos
    if (centroCustoInput) centroCustoInput.value = '';
    if (projetoInput) projetoInput.value = '';
    
    // Remover mensagem
    const mensagemDiv = document.getElementById('mensagemPacote');
    if (mensagemDiv) {
        mensagemDiv.remove();
    }
    
    atualizarTabelaPacoteItens();
    atualizarContadorPacote();
}


// 5. Atualizar função de envio para usar dados corretos
function enviarPacoteRequisicao() {
    if (window.pacoteItens.length === 0) {
        alert('Adicione pelo menos um item ao pacote antes de enviar.');
        return;
    }

    if (!window.pacoteInfo) {
        alert('Informações do pacote não encontradas.');
        return;
    }

    const justificativa = document.getElementById('justificativa').value.trim();
    
    // Tentar pegar userData de ambos os locais
    let userData = {};
    try {
        userData = JSON.parse(sessionStorage.getItem('currentUser')) || 
                  JSON.parse(localStorage.getItem('userData')) || {};
    } catch (e) {
        console.error('Erro ao recuperar dados do usuário:', e);
    }
    
    if (!userData.id) {
        alert('Usuário não identificado. Faça login novamente.');
        window.location.href = 'login.html';
        return;
    }

    // Preparar dados do pacote
    const pacoteData = {
        userId: parseInt(userData.id),  // Garantir que é número
        centroCusto: window.pacoteInfo.centroCusto,
        projeto: window.pacoteInfo.projeto,
        justificativa: justificativa || '',
        itens: window.pacoteItens.map(item => ({
            itemId: parseInt(item.itemId),
            quantidade: parseInt(item.quantidade)
        }))
    };
    
    console.log('Enviando pacote:', pacoteData);

    // Enviar pacote
    fetch('/api/pacotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pacoteData)
    })
    .then(response => {
        console.log('Resposta do servidor:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Dados recebidos:', data);
        if (data.success) {
            alert('Pacote de requisição enviado com sucesso!');
            
            // Limpar formulário e pacote
            document.getElementById('justificativa').value = '';
            limparPacote();
            
            // Recarregar listas
            carregarMinhasRequisicoes();
            if (isUserAdmin()) {
                carregarRequisicoesParaAprovar();
            }
        } else {
            alert(data.message || 'Erro ao enviar pacote');
        }
    })
    .catch(error => {
        console.error('Erro ao enviar pacote:', error);
        alert('Erro ao enviar pacote de requisição');
    });
}

// Adicione estas funções ao seu arquivo requisi.js

// Função para verificar se o usuário é admin
function isUserAdmin() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    return userData.userType === 'admin';
}

// Função para configurar visibilidade dos elementos baseado no tipo de usuário
function configureUserInterface() {
    const isAdmin = isUserAdmin();
    
    // Mostrar/ocultar botão "Voltar ao Estoque" para usuários admin
    const btnVoltar = document.getElementById('btnVoltarEstoque') || document.querySelector('.btn-voltar-estoque');
    if (btnVoltar) {
        btnVoltar.style.display = isAdmin ? 'block' : 'none';
        btnVoltar.onclick = null;
        if (isAdmin) {
            btnVoltar.addEventListener('click', function() {
                window.location.href = 'index.html';
            });
        }
    }
    function carregarRequisicoesParaAprovar() {
    if (!isUserAdmin()) {
        console.log('Usuário não é admin, não carregando requisições para aprovar');
        return;
    }
    
    console.log('Carregando pacotes pendentes para aprovação...');
    
    fetch('/api/pacotes/pendentes')
        .then(res => {
            console.log('Resposta de pacotes pendentes:', res.status);
            return res.json();
        })
        .then(pacotes => {
            console.log('Pacotes pendentes recebidos:', pacotes);
            
            const tbody = document.querySelector('#tabelaAprovarRequisicoes tbody');
            if (!tbody) {
                console.error('Tabela de aprovar requisições não encontrada');
                return;
            }
            
            tbody.innerHTML = '';
            
            if (!pacotes || pacotes.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="7" style="text-align:center;color:#666;">Nenhum pacote pendente</td>';
                tbody.appendChild(tr);
                return;
            }
            
            pacotes.forEach(pacote => {
                const statusPacote = pacote.status || 'PENDENTE';
                const dataFormatada = new Date(pacote.data).toLocaleString('pt-BR');
                const qtdItens = pacote.itens ? pacote.itens.length : 0;
                const solicitante = pacote.userName || `ID: ${pacote.userId}`;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${dataFormatada}</td>
                    <td>${solicitante}</td>
                    <td>${pacote.centroCusto}</td>
                    <td>${pacote.projeto}</td>
                    <td><span class="status-${statusPacote.toLowerCase()}">${statusPacote}</span></td>
                    <td>${qtdItens}</td>
                    <td>
                        <button class="btn btn-sm" onclick="verDetalhesPacoteAdmin(${pacote.id})">Gerenciar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar pacotes pendentes:', error);
            const tbody = document.querySelector('#tabelaAprovarRequisicoes tbody');
            if (tbody) {
                tbody.innerHTML = '<td colspan="7" style="text-align:center;color:#f00;">Erro ao carregar pacotes pendentes</td>';
            }
        });
}


    // Mostrar/ocultar seção de aprovar requisições baseado no tipo de usuário
    const adminButtons = document.querySelectorAll('.admin-only');
    adminButtons.forEach(button => {
        if (!isAdmin) {
            button.style.display = 'none';
        } else {
            button.style.display = 'block';
        }
    });
    
    // Ajustar layout dos botões de navegação se necessário
    const navButtons = document.querySelector('.nav-buttons');
    if (navButtons && !isAdmin) {
        navButtons.style.justifyContent = 'flex-start';
    }
}

// Função para verificar acesso ao estoque (adicionar ao arquivo principal do estoque)
function verificarAcessoEstoque() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (!userData.userType || userData.userType !== 'admin') {
        alert('Acesso negado! Apenas administradores podem acessar o sistema de estoque.');
        window.location.href = 'requisi.html'; // Redirecionar para requisições
        return false;
    }
    return true;
}

// Função para inicializar o sistema de requisições
function inicializarSistema() {
    console.log('Inicializando sistema de requisições...');

    // Verificar se o usuário está logado
    const userData = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (!userData.id) {
        alert('Você precisa estar logado para acessar o sistema.');
        window.location.href = 'login.html';
        return;
    }
    // Carregar dados específicos do usuário
    carregarDadosUsuario();
    // Carregar itens para o select
    carregarItensSelect();
    // Carregar pacotes do usuário
    carregarMinhasRequisicoes();
    // Se for admin, carregar pacotes pendentes
    if (isUserAdmin()) {
        carregarPacotesPendentes();
    }
    // Configurar interface baseada no tipo de usuário (mover para o final)
    setTimeout(() => {
        configureUserInterface();
    }, 100);
}

// Função para carregar dados do usuário logado
function carregarDadosUsuario() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    
    // Você pode adicionar um indicador do tipo de usuário na interface
    const userTypeIndicator = document.createElement('div');
    userTypeIndicator.className = 'user-type-indicator';
    userTypeIndicator.innerHTML = `
        <span class="user-info">
            Logado como: <strong>${userData.name}</strong> 
            ${userData.userType === 'admin' ? '(Administrador)' : '(Usuário)'}
        </span>
    `;
    
    // Adicionar ao header
    const header = document.querySelector('.header');
    if (header) {
        header.appendChild(userTypeIndicator);
    }
}

// Modificar a função existente de carregar itens para o select
function carregarItensSelect() {
    fetch('/api/itens')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('itemRequisicao');
            select.innerHTML = '<option value="">Selecione um item...</option>';
            
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.nome} (Disponível: ${item.quantidade})`;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar itens:', error);
        });
}

// Adicionar verificação de acesso ao estoque no arquivo principal do estoque
// Esta função deve ser chamada no início do arquivo script do estoque
function protegerPaginaEstoque() {
    document.addEventListener('DOMContentLoaded', function() {
        if (!verificarAcessoEstoque()) {
            return; // Impede a execução do resto do código
        }
        
        // Resto da inicialização do sistema de estoque...
    });
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    inicializarSistemaRequisicoes();
    adicionarBotaoLogout();
});

// Função para logout com limpeza completa
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Adicionar botão de logout na interface
function adicionarBotaoLogout() {
    const logoutButton = document.createElement('button');
    logoutButton.className = 'btn btn-logout';
    logoutButton.textContent = 'Sair';
    logoutButton.onclick = logout;
    logoutButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 200px;
        background: #dc3545;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
    document.body.appendChild(logoutButton);

// Função única e robusta para carregar as requisições do usuário
function carregarMinhasRequisicoes() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('userData') || '{}');
    if (!userData.id) {
        alert('Usuário não identificado. Faça login novamente.');
        window.location.href = 'login.html';
        return;
    }
    fetch(`/api/pacotes/usuario/${userData.id}`)
        .then(res => res.json())
        .then(pacotes => {
            const tbody = document.querySelector('#tabelaMinhasRequisicoes tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            if (!pacotes || pacotes.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="6" style="text-align:center;color:#666;">Nenhum pacote encontrado</td>';
                tbody.appendChild(tr);
                return;
            }
            pacotes.forEach(pacote => {
                const statusPacote = pacote.status || 'PENDENTE';
                const dataFormatada = new Date(pacote.data).toLocaleString('pt-BR');
                const qtdItens = pacote.itens ? pacote.itens.length : 0;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${dataFormatada}</td>
                    <td>${pacote.centroCusto}</td>
                    <td>${pacote.projeto}</td>
                    <td><span class="status-${statusPacote.toLowerCase()}">${statusPacote}</span></td>
                    <td>${qtdItens}</td>
                    <td>
                        <button class="btn btn-sm" onclick="verDetalhesPacote(${pacote.id})">Ver Detalhes</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            const tbody = document.querySelector('#tabelaMinhasRequisicoes tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c00;">Erro ao carregar pacotes</td></tr>';
            }
        });
}


// Função para carregar meus pacotes foi removida. Use apenas carregarMinhasRequisicoes().

// Função para carregar pacotes pendentes (admin)
function carregarPacotesPendentes() {
    if (!isUserAdmin()) return;
    
    fetch('/api/pacotes/pendentes')
        .then(response => response.json())
        .then(data => {
            const tabela = document.getElementById('tabelaPacotesPendentes');
            if (!tabela) return;
            
            const tbody = tabela.getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';
            
            data.forEach(pacote => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(pacote.data).toLocaleDateString()}</td>
                    <td>${pacote.centroCusto}</td>
                    <td>${pacote.projeto}</td>
                    <td>${pacote.itens ? pacote.itens.length : 0} itens</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="gerenciarPacote(${pacote.id})">
                            Gerenciar
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar pacotes pendentes:', error);
        });
}

// 4. Corrigir função verDetalhesPacote
function verDetalhesPacote(pacoteId) {
    const userData = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('userData') || '{}');
    
    fetch(`/api/pacotes/usuario/${userData.id}`)
        .then(res => res.json())
        .then(pacotes => {
            const pacote = pacotes.find(p => p.id === pacoteId);
            if (!pacote) {
                alert('Pacote não encontrado');
                return;
            }
            
            let html = `
                <div class="pacote-detalhes">
                    <h4>Detalhes do Pacote #${pacote.id}</h4>
                    <p><strong>Centro de Custo:</strong> ${pacote.centroCusto}</p>
                    <p><strong>Projeto:</strong> ${pacote.projeto}</p>
                    <p><strong>Justificativa:</strong> ${pacote.justificativa || 'Não informada'}</p>
                    <p><strong>Status do Pacote:</strong> <span class="status-${(pacote.status||'pendente').toLowerCase()}">${pacote.status||'PENDENTE'}</span></p>
                    <h5>Itens:</h5>
                    <ul class="lista-itens-pacote">
            `;
            
            if (pacote.itens && pacote.itens.length > 0) {
                pacote.itens.forEach(item => {
                    const statusItem = item.status || 'PENDENTE';
                    html += `
                        <li>
                            <strong>${item.itemNome}</strong> - 
                            Quantidade: ${item.quantidade} - 
                            Status: <span class="status-${statusItem.toLowerCase()}">${statusItem}</span>
                            ${item.observacoes ? `<br><small>Obs: ${item.observacoes}</small>` : ''}
                        </li>
                    `;
                });
            } else {
                html += '<li>Nenhum item encontrado</li>';
            }
            
            html += '</ul></div>';
            
            document.getElementById('conteudoDetalhesPacote').innerHTML = html;
            document.getElementById('modalDetalhesPacote').style.display = 'block';
        })
        .catch(error => {
            console.error('Erro ao carregar detalhes do pacote:', error);
            alert('Erro ao carregar detalhes do pacote');
        });
}
}

