// --- PACOTES DE REQUISIÇÃO ---
// Criar novo pacote de requisição
app.post('/api/pacotes', async (req, res) => {
    try {
        const { userId, centroCusto, projeto, justificativa, itens } = req.body;
        if (!userId || !centroCusto || !projeto || !Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({ success: false, message: 'Dados do pacote incompletos.' });
        }
        const pacoteId = await db.criarPacoteRequisicao({ userId, centroCusto, projeto, justificativa }, itens);
        res.json({ success: true, pacoteId });
    } catch (error) {
        console.error('Erro ao criar pacote:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar pacote.' });
    }
});

// Listar pacotes do usuário
app.get('/api/pacotes/usuario/:userId', async (req, res) => {
    try {
        const pacotes = await db.buscarPacotesUsuario(req.params.userId);
        // Buscar itens de cada pacote
        for (const pacote of pacotes) {
            pacote.itens = await db.buscarItensPacote(pacote.id);
        }
        res.json(pacotes);
    } catch (error) {
        console.error('Erro ao buscar pacotes do usuário:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar pacotes.' });
    }
});

// Listar pacotes pendentes para admin
app.get('/api/pacotes/pendentes', async (req, res) => {
    try {
        const pacotes = await db.buscarPacotesPendentes();
        for (const pacote of pacotes) {
            pacote.itens = await db.buscarItensPacote(pacote.id);
        }
        res.json(pacotes);
    } catch (error) {
        console.error('Erro ao buscar pacotes pendentes:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar pacotes pendentes.' });
    }
});

// Aprovar ou negar item do pacote
app.post('/api/pacotes/item/:itemPacoteId/status', async (req, res) => {
    try {
        const { status, observacoes } = req.body;
        const itemPacote = await db.buscarItemPacotePorId(req.params.itemPacoteId);
        if (!itemPacote) return res.status(404).json({ success: false, message: 'Item não encontrado.' });
        await db.atualizarStatusItemPacote(itemPacote.id, status, observacoes || null);
        // Atualizar status do pacote conforme os itens
        const itens = await db.buscarItensPacote(itemPacote.pacoteId);
        const todosAprovados = itens.every(i => i.status === 'APROVADO');
        const todosNegados = itens.every(i => i.status === 'NEGADO');
        let statusPacote = 'PARCIAL';
        if (todosAprovados) statusPacote = 'APROVADO';
        else if (todosNegados) statusPacote = 'NEGADO';
        await db.atualizarStatusPacote(itemPacote.pacoteId, statusPacote);
        // Se aprovado, descontar estoque
        if (status === 'APROVADO') {
            await db.descontarEstoque(itemPacote.itemId, itemPacote.quantidade);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar status do item do pacote:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar status do item.' });
    }
});

// Aprovar ou negar pacote inteiro
app.post('/api/pacotes/:pacoteId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const pacote = await db.buscarPacotePorId(req.params.pacoteId);
        if (!pacote) return res.status(404).json({ success: false, message: 'Pacote não encontrado.' });
        await db.atualizarStatusPacote(pacote.id, status);
        // Atualizar todos os itens do pacote
        const itens = await db.buscarItensPacote(pacote.id);
        for (const item of itens) {
            await db.atualizarStatusItemPacote(item.id, status);
            if (status === 'APROVADO') {
                await db.descontarEstoque(item.itemId, item.quantidade);
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar status do pacote:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar status do pacote.' });
    }
});
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Rotas de autenticação
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email e senha são obrigatórios' 
            });
        }

        const usuario = await db.autenticarUsuario(email, password);
        
        if (usuario) {
            res.json({
                success: true,
                user: usuario,
                message: 'Login realizado com sucesso'
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, userType } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nome, email e senha são obrigatórios'
            });
        }

        // Verificar se o usuário já existe
        const usuarioExistente = await db.buscarUsuarioPorEmail(email);
        if (usuarioExistente) {
            return res.status(400).json({
                success: false,
                message: 'Usuário já existe com este email'
            });
        }

        const novoUsuario = await db.cadastrarUsuario({
            name,
            email,
            password,
            userType: userType || 'user'
        });

        res.json({
            success: true,
            user: novoUsuario,
            message: 'Usuário cadastrado com sucesso'
        });
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rotas para itens
app.get('/api/itens', async (req, res) => {
    try {
        const itens = await db.buscarItens();
        res.json(itens);
    } catch (error) {
        console.error('Erro ao buscar itens:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar itens'
        });
    }
});

app.get('/api/itens/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const item = await db.buscarItemPorId(id);
        
        if (item) {
            res.json(item);
        } else {
            res.status(404).json({
                success: false,
                message: 'Item não encontrado'
            });
        }
    } catch (error) {
        console.error('Erro ao buscar item:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar item'
        });
    }
});

app.post('/api/itens', async (req, res) => {
    try {
        const itemData = req.body;
        
        // Verificar se já existe um item com o mesmo nome e WBS
        const itemExistente = await db.buscarItemPorNomeEWBS(itemData.nome, itemData.serie);
        
        let resultado;
        if (itemExistente) {
            // Se o item existe, atualiza a quantidade
            const novaQuantidade = itemExistente.quantidade + parseInt(itemData.quantidade || 0);
            await db.atualizarQuantidadeItem(itemExistente.id, novaQuantidade);
            
            // Registrar movimentação de entrada
            await db.inserirMovimentacao({
                itemId: itemExistente.id,
                itemNome: itemExistente.nome,
                tipo: 'entrada',
                quantidade: parseInt(itemData.quantidade || 0),
                origem: itemData.origem || 'Não especificada',
                descricao: 'Adição ao estoque existente'
            });
            
            resultado = {
                success: true,
                itemId: itemExistente.id,
                message: 'Quantidade atualizada com sucesso',
                atualizacao: true,
                quantidadeAnterior: itemExistente.quantidade,
                novaQuantidade: novaQuantidade
            };
        } else {
            // Se não existe, cria um novo item
            const novoItemId = await db.inserirItem(itemData);
            
            // Registrar movimentação inicial
            if (itemData.quantidade > 0) {
                await db.inserirMovimentacao({
                    itemId: novoItemId,
                    itemNome: itemData.nome,
                    tipo: 'entrada',
                    quantidade: parseInt(itemData.quantidade || 0),
                    origem: itemData.origem || 'Cadastro inicial',
                    descricao: 'Cadastro inicial do item'
                });
            }
            
            resultado = {
                success: true,
                itemId: novoItemId,
                message: 'Item cadastrado com sucesso',
                atualizacao: false
            };
        }
        
        res.json(resultado);
    } catch (error) {
        console.error('Erro ao processar item:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar item',
            error: error.message
        });
    }
});

// Rota para unificar itens duplicados
app.post('/api/unificar-itens', async (req, res) => {
    try {
        const resultado = await db.unificarItensDuplicados();
        res.json({
            success: true,
            message: 'Itens duplicados unificados com sucesso',
            ...resultado
        });
    } catch (error) {
        console.error('Erro ao unificar itens:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao unificar itens: ' + error.message
        });
    }
});

// Rotas para requisições
app.post('/api/requisicoes', async (req, res) => {
    try {
        const { userId, itemId, quantidade, centroCusto, projeto, justificativa } = req.body;
        
        if (!userId || !itemId || !quantidade || !centroCusto || !projeto) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos obrigatórios devem ser preenchidos'
            });
        }

        // Verificar se o item existe e tem quantidade suficiente
        const item = await db.buscarItemPorId(itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado'
            });
        }

        if (item.quantidade < quantidade) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade insuficiente no estoque'
            });
        }

        const requisicaoId = await db.criarRequisicao({
            userId,
            itemId,
            quantidade,
            centroCusto,
            projeto,
            justificativa
        });

        res.json({
            success: true,
            requisicaoId: requisicaoId,
            message: 'Requisição criada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar requisição:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar requisição'
        });
    }
});

app.get('/api/requisicoes/usuario/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const requisicoes = await db.buscarRequisicoesUsuario(userId);
        res.json(requisicoes);
    } catch (error) {
        console.error('Erro ao buscar requisições do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar requisições'
        });
    }
});

app.get('/api/requisicoes/pendentes', async (req, res) => {
    try {
        const requisicoes = await db.buscarRequisicoesPendentes();
        res.json(requisicoes);
    } catch (error) {
        console.error('Erro ao buscar requisições pendentes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar requisições pendentes'
        });
    }
});

app.post('/api/requisicoes/:id/aprovar', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscar dados da requisição corretamente
        const requisicao = await db.buscarRequisicaoPorId(id);
        
        if (!requisicao) {
            return res.status(404).json({
                success: false,
                message: 'Requisição não encontrada'
            });
        }

        // Verificar se ainda há quantidade no estoque
        const item = await db.buscarItemPorId(requisicao.itemId);
        if (item.quantidade < requisicao.quantidade) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade insuficiente no estoque'
            });
        }

        // Atualizar status da requisição
        await db.atualizarStatusRequisicao(id, 'aprovada', 'Aprovada pelo administrador');
        
        // Descontar do estoque
        await db.descontarEstoque(requisicao.itemId, requisicao.quantidade);
        
        // Registrar movimentação
        await db.inserirMovimentacao({
            itemId: requisicao.itemId,
            itemNome: item.nome,
            tipo: 'saida',
            quantidade: requisicao.quantidade,
            destino: requisicao.centroCusto,
            descricao: `Requisição aprovada - Projeto: ${requisicao.projeto}`
        });

        res.json({
            success: true,
            message: 'Requisição aprovada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao aprovar requisição:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao aprovar requisição'
        });
    }
});

app.post('/api/requisicoes/:id/rejeitar', async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        
        await db.atualizarStatusRequisicao(id, 'rejeitada', motivo || 'Rejeitada pelo administrador');
        
        res.json({
            success: true,
            message: 'Requisição rejeitada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao rejeitar requisição:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao rejeitar requisição'
        });
    }
});

// Rotas para movimentações
app.get('/api/movimentacoes', async (req, res) => {
    try {
        const { dias = 30 } = req.query;
        const movimentacoes = await db.buscarMovimentacoes(dias);
        res.json(movimentacoes);
    } catch (error) {
        console.error('Erro ao buscar movimentações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar movimentações'
        });
    }
});

// Rota para exportar banco de dados
app.get('/api/exportar-banco', async (req, res) => {
    try {
        // Buscar todos os dados necessários
        const itens = await db.buscarItens();
        const movimentacoes = await db.buscarMovimentacoes();

        // Criar objeto com todos os dados
        const dadosExportacao = {
            data_exportacao: new Date().toISOString(),
            itens: itens,
            movimentacoes: movimentacoes
        };

        res.json(dadosExportacao);
    } catch (error) {
        console.error('Erro ao exportar banco:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao exportar banco de dados',
            error: error.message
        });
    }
});

// Rota para importar banco de dados (sincronização)
app.post('/api/importar-banco', async (req, res) => {
    try {
        const dados = req.body;
        if (!dados || !Array.isArray(dados.itens)) {
            return res.status(400).json({
                success: false,
                error: 'Formato de dados inválido: não contém itens.'
            });
        }
        // Importar dados usando a função do banco
        const resultado = await db.importarDados(dados);
        res.json({
            success: true,
            itensImportados: resultado.itensImportados,
            movimentacoesImportadas: resultado.movimentacoesImportadas
        });
    } catch (error) {
        console.error('Erro ao importar banco:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao importar banco de dados.'
        });
    }
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// Rota para servir o HTML principal

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/requisi', (req, res) => {
    res.sendFile(path.join(__dirname, 'requisi.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    
    // Verificar integridade do banco
    db.verificarBanco().then(isOk => {
        if (isOk) {
            console.log('Banco de dados verificado e funcionando');
        } else {
            console.error('Problemas detectados no banco de dados');
        }
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nDesligando servidor...');
    db.fecharConexao();
    process.exit(0);
});

// Rota para retirada de item
app.post('/api/itens/:id/retirar', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidade, destino, observacao } = req.body;

        if (!quantidade || !destino) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade e destino são obrigatórios'
            });
        }

        // Verificar se o item existe
        const item = await db.buscarItemPorId(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado'
            });
        }

        // Verificar se há quantidade suficiente
        if (item.quantidade < quantidade) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade insuficiente no estoque'
            });
        }

        // Descontar do estoque
        await db.descontarEstoque(id, quantidade);

        // Registrar movimentação
        await db.inserirMovimentacao({
            itemId: item.id,
            itemNome: item.nome,
            tipo: 'saida',
            quantidade: quantidade,
            destino: destino,
            descricao: observacao || 'Retirada direta do estoque'
        });

        res.json({
            success: true,
            message: 'Retirada realizada com sucesso',
            novaQuantidade: item.quantidade - quantidade
        });
    } catch (error) {
        console.error('Erro ao realizar retirada:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao realizar retirada',
            error: error.message
        });
    }
});
// Adicione esta rota no seu server.js, junto com as outras rotas de itens

// Rota para atualizar item completo
app.put('/api/itens/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const itemData = req.body;
        
        // Verificar se o item existe
        const itemExistente = await db.buscarItemPorId(id);
        if (!itemExistente) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado'
            });
        }

        // Atualizar item no banco de dados
        const sql = `
            UPDATE itens SET 
                nome = ?, 
                serie = ?, 
                descricao = ?, 
                origem = ?, 
                destino = ?, 
                valor = ?, 
                nf = ?, 
                quantidade = ?, 
                minimo = ?, 
                ideal = ?, 
                infos = ?
            WHERE id = ?
        `;

        await db.run(sql, [
            itemData.nome || itemExistente.nome,
            itemData.serie || itemExistente.serie,
            itemData.descricao || itemExistente.descricao,
            itemData.origem || itemExistente.origem,
            itemData.destino || itemExistente.destino,
            itemData.valor || itemExistente.valor,
            itemData.nf || itemExistente.nf,
            itemData.quantidade !== undefined ? itemData.quantidade : itemExistente.quantidade,
            itemData.minimo !== undefined ? itemData.minimo : itemExistente.minimo,
            itemData.ideal !== undefined ? itemData.ideal : itemExistente.ideal,
            itemData.infos || itemExistente.infos,
            id
        ]);

        // Se a quantidade foi alterada, registrar movimentação
        if (itemData.quantidade !== undefined && itemData.quantidade !== itemExistente.quantidade) {
            const diferenca = itemData.quantidade - itemExistente.quantidade;
            const tipo = diferenca > 0 ? 'entrada' : 'saida';
            const quantidade = Math.abs(diferenca);

            await db.inserirMovimentacao({
                itemId: parseInt(id),
                itemNome: itemData.nome || itemExistente.nome,
                tipo: tipo,
                quantidade: quantidade,
                origem: tipo === 'entrada' ? 'Atualização de item' : null,
                destino: tipo === 'saida' ? 'Atualização de item' : null,
                descricao: `Quantidade ${tipo === 'entrada' ? 'aumentada' : 'diminuída'} via edição do item`
            });
        }

        // Buscar item atualizado
        const itemAtualizado = await db.buscarItemPorId(id);

        res.json({
            success: true,
            message: 'Item atualizado com sucesso',
            item: itemAtualizado
        });
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar item',
            error: error.message
        });
    }
});

// Rota alternativa para atualizar apenas campos específicos (PATCH)
app.patch('/api/itens/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Verificar se o item existe
        const itemExistente = await db.buscarItemPorId(id);
        if (!itemExistente) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado'
            });
        }

        // Construir query dinamicamente baseada nos campos enviados
        const camposPermitidos = ['nome', 'serie', 'descricao', 'origem', 'destino', 'valor', 'nf', 'quantidade', 'minimo', 'ideal', 'infos'];
        const camposParaAtualizar = [];
        const valores = [];

        Object.keys(updates).forEach(campo => {
            if (camposPermitidos.includes(campo)) {
                camposParaAtualizar.push(`${campo} = ?`);
                valores.push(updates[campo]);
            }
        });

        if (camposParaAtualizar.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum campo válido para atualizar'
            });
        }

        valores.push(id); // Adicionar ID para a cláusula WHERE

        const sql = `UPDATE itens SET ${camposParaAtualizar.join(', ')} WHERE id = ?`;
        await db.run(sql, valores);

        // Se a quantidade foi alterada, registrar movimentação
        if (updates.quantidade !== undefined && updates.quantidade !== itemExistente.quantidade) {
            const diferenca = updates.quantidade - itemExistente.quantidade;
            const tipo = diferenca > 0 ? 'entrada' : 'saida';
            const quantidade = Math.abs(diferenca);

            await db.inserirMovimentacao({
                itemId: parseInt(id),
                itemNome: updates.nome || itemExistente.nome,
                tipo: tipo,
                quantidade: quantidade,
                origem: tipo === 'entrada' ? 'Atualização parcial' : null,
                destino: tipo === 'saida' ? 'Atualização parcial' : null,
                descricao: `Quantidade ${tipo === 'entrada' ? 'aumentada' : 'diminuída'} via edição parcial`
            });
        }

        // Buscar item atualizado
        const itemAtualizado = await db.buscarItemPorId(id);

        res.json({
            success: true,
            message: 'Item atualizado com sucesso',
            item: itemAtualizado,
            camposAtualizados: Object.keys(updates)
        });
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar item',
            error: error.message
        });
    }
});

// Adicione esta rota no seu server.js, junto com as outras rotas de itens

// Rota para adicionar estoque ao item
app.post('/api/itens/:id/adicionar', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidade, origem, observacao } = req.body;

        if (!quantidade || quantidade <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade deve ser um número positivo'
            });
        }

        // Verificar se o item existe
        const item = await db.buscarItemPorId(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado'
            });
        }

        // Calcular nova quantidade
        const novaQuantidade = item.quantidade + parseInt(quantidade);

        // Atualizar estoque
        await db.atualizarQuantidadeItem(id, novaQuantidade);

        // Registrar movimentação
        await db.inserirMovimentacao({
            itemId: item.id,
            itemNome: item.nome,
            tipo: 'entrada',
            quantidade: parseInt(quantidade),
            origem: origem || 'Adição manual',
            descricao: observacao || 'Adição manual ao estoque'
        });

        res.json({
            success: true,
            message: 'Estoque adicionado com sucesso',
            quantidadeAnterior: item.quantidade,
            quantidadeAdicionada: parseInt(quantidade),
            novaQuantidade: novaQuantidade
        });
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao adicionar estoque',
            error: error.message
        });
    }
});

// Rota para deletar item
app.delete('/api/itens/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se o item existe
        const item = await db.buscarItemPorId(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado'
            });
        }

        // Verificar se há requisições pendentes para este item
        const requisicoesPendentes = await db.buscarRequisicoesPendentes();
        const temRequisicaoPendente = requisicoesPendentes.some(req => req.itemId === parseInt(id));
        
        if (temRequisicaoPendente) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível remover o item pois existem requisições pendentes'
            });
        }

        // Remover o item
        await db.removerItem(id);
        
        res.json({
            success: true,
            message: 'Item removido com sucesso'
        });
    } catch (error) {
        console.error('Erro ao remover item:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao remover item'
        });
    }
});

module.exports = app;