// database.js - Sistema de Gerenciamento de Estoque
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, 'estoque.db');
        this.db = null;
        this.initialize();
    }

    initialize() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Erro ao conectar com o banco de dados:', err.message);
            } else {
                console.log('Conectado ao banco de dados SQLite.');
                this.db.run('PRAGMA foreign_keys = ON');
                this.initializeDatabase();
            }
        });
    }

    async initializeDatabase() {
        // Tabela de usuários
        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                userType TEXT DEFAULT 'user' CHECK(userType IN ('user', 'admin')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de itens
        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS itens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                serie TEXT,
                descricao TEXT,
                origem TEXT,
                destino TEXT,
                valor REAL DEFAULT 0,
                nf TEXT,
                quantidade INTEGER DEFAULT 0,
                minimo INTEGER DEFAULT 0,
                ideal INTEGER DEFAULT 0,
                infos TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de movimentações
        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS movimentacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                item_nome TEXT NOT NULL,
                tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
                quantidade INTEGER NOT NULL,
                origem TEXT,
                destino TEXT,
                descricao TEXT,
                data DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES itens (id)
            )
        `);

        // Tabela de pacotes de requisição
        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS pacotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                userName TEXT,
                centroCusto TEXT NOT NULL,
                projeto TEXT NOT NULL,
                justificativa TEXT,
                status TEXT DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'APROVADO', 'REJEITADO', 'PARCIAL')),
                observacoes TEXT,
                data DATETIME DEFAULT CURRENT_TIMESTAMP,
                aprovado_por INTEGER,
                aprovado_em DATETIME,
                FOREIGN KEY (userId) REFERENCES usuarios (id),
                FOREIGN KEY (aprovado_por) REFERENCES usuarios (id)
            )
        `);

        // Tabela de itens do pacote
        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS pacote_itens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pacoteId INTEGER NOT NULL,
                itemId INTEGER NOT NULL,
                itemNome TEXT NOT NULL,
                quantidade INTEGER NOT NULL,
                quantidadeAprovada INTEGER DEFAULT 0,
                status TEXT DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'APROVADO', 'REJEITADO', 'ENTREGUE')),
                observacoes TEXT,
                FOREIGN KEY (pacoteId) REFERENCES pacotes (id) ON DELETE CASCADE,
                FOREIGN KEY (itemId) REFERENCES itens (id)
            )
        `);

        // Criar usuários padrão se não existirem
        await this.createDefaultUsers();
    }

    async createDefaultUsers() {
        const adminExists = await this.dbGet("SELECT id FROM usuarios WHERE email = 'admin@sistema.com'");
        if (!adminExists) {
            await this.dbRun(`
                INSERT INTO usuarios (name, email, password, userType) 
                VALUES ('Administrador', 'admin@sistema.com', 'admin123', 'admin')
            `);
            console.log('Usuário admin criado: admin@sistema.com / admin123');
        }

        const userExists = await this.dbGet("SELECT id FROM usuarios WHERE email = 'user@sistema.com'");
        if (!userExists) {
            await this.dbRun(`
                INSERT INTO usuarios (name, email, password, userType) 
                VALUES ('Usuário Teste', 'user@sistema.com', 'user123', 'user')
            `);
            console.log('Usuário comum criado: user@sistema.com / user123');
        }
    }

    // Funções auxiliares para promisificar operações do SQLite
    dbRun(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    dbGet(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    dbAll(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // API de Usuários
    async createUser(userData) {
        const { name, email, password, userType = 'user' } = userData;
        return await this.dbRun(
            'INSERT INTO usuarios (name, email, password, userType) VALUES (?, ?, ?, ?)',
            [name, email, password, userType]
        );
    }

    async getUserByEmail(email) {
        return await this.dbGet('SELECT * FROM usuarios WHERE email = ?', [email]);
    }

    async getUserById(id) {
        return await this.dbGet('SELECT * FROM usuarios WHERE id = ?', [id]);
    }

    // API de Itens
    async getAllItens() {
        return await this.dbAll('SELECT * FROM itens ORDER BY nome');
    }

    async getItemById(id) {
        return await this.dbGet('SELECT * FROM itens WHERE id = ?', [id]);
    }

    async createItem(itemData) {
        const { nome, serie, descricao, origem, destino, valor, nf, quantidade, minimo, ideal, infos } = itemData;
        const result = await this.dbRun(`
            INSERT INTO itens (nome, serie, descricao, origem, destino, valor, nf, quantidade, minimo, ideal, infos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [nome, serie, descricao, origem, destino, valor, nf, quantidade, minimo, ideal, infos]);
        
        if (quantidade > 0) {
            await this.createMovimentacao({
                item_id: result.id,
                item_nome: nome,
                tipo: 'entrada',
                quantidade: quantidade,
                origem: origem || 'Cadastro inicial',
                descricao: 'Cadastro inicial do item'
            });
        }
        
        return result;
    }

    async updateItem(id, itemData) {
        const { nome, serie, descricao, origem, destino, valor, nf, quantidade, minimo, ideal, infos } = itemData;
        return await this.dbRun(`
            UPDATE itens 
            SET nome = ?, serie = ?, descricao = ?, origem = ?, destino = ?, valor = ?, nf = ?, 
                quantidade = ?, minimo = ?, ideal = ?, infos = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [nome, serie, descricao, origem, destino, valor, nf, quantidade, minimo, ideal, infos, id]);
    }

    async deleteItem(id) {
        return await this.dbRun('DELETE FROM itens WHERE id = ?', [id]);
    }

    // API de Movimentações
    async adicionarEstoque(itemId, quantidade, observacao = '') {
        const item = await this.getItemById(itemId);
        if (!item) throw new Error('Item não encontrado');

        const novaQuantidade = item.quantidade + quantidade;
        await this.dbRun('UPDATE itens SET quantidade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                   [novaQuantidade, itemId]);

        return await this.createMovimentacao({
            item_id: itemId,
            item_nome: item.nome,
            tipo: 'entrada',
            quantidade: quantidade,
            origem: 'Adição manual',
            descricao: observacao || 'Adição de estoque'
        });
    }

    async retirarEstoque(itemId, quantidade, destino, observacao = '') {
        const item = await this.getItemById(itemId);
        if (!item) throw new Error('Item não encontrado');
        if (item.quantidade < quantidade) throw new Error('Quantidade insuficiente em estoque');

        const novaQuantidade = item.quantidade - quantidade;
        await this.dbRun('UPDATE itens SET quantidade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                   [novaQuantidade, itemId]);

        return await this.createMovimentacao({
            item_id: itemId,
            item_nome: item.nome,
            tipo: 'saida',
            quantidade: quantidade,
            destino: destino,
            descricao: observacao || 'Retirada de estoque'
        });
    }

    async createMovimentacao(movData) {
        const { item_id, item_nome, tipo, quantidade, origem, destino, descricao } = movData;
        return await this.dbRun(`
            INSERT INTO movimentacoes (item_id, item_nome, tipo, quantidade, origem, destino, descricao)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [item_id, item_nome, tipo, quantidade, origem, destino, descricao]);
    }

    async getMovimentacoes(dias = 30) {
        return await this.dbAll(`
            SELECT * FROM movimentacoes 
            WHERE data >= datetime('now', '-${dias} days')
            ORDER BY data DESC
        `);
    }

    // API de Pacotes de Requisição
    async createPacote(pacoteData) {
        const { userId, centroCusto, projeto, justificativa, itens } = pacoteData;
        
        const user = await this.getUserById(userId);
        const userName = user ? user.name : `ID: ${userId}`;
        
        const pacoteResult = await this.dbRun(`
            INSERT INTO pacotes (userId, userName, centroCusto, projeto, justificativa)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, userName, centroCusto, projeto, justificativa]);
        
        const pacoteId = pacoteResult.id;
        
        for (const item of itens) {
            const itemData = await this.getItemById(item.itemId);
            const itemNome = itemData ? itemData.nome : `ID: ${item.itemId}`;
            
            await this.dbRun(`
                INSERT INTO pacote_itens (pacoteId, itemId, itemNome, quantidade)
                VALUES (?, ?, ?, ?)
            `, [pacoteId, item.itemId, itemNome, item.quantidade]);
        }
        
        return pacoteResult;
    }

    async getPacotesByUserId(userId) {
        const pacotes = await this.dbAll('SELECT * FROM pacotes WHERE userId = ? ORDER BY data DESC', [userId]);
        
        for (const pacote of pacotes) {
            pacote.itens = await this.dbAll(`
                SELECT pi.*, i.nome as itemNome 
                FROM pacote_itens pi
                LEFT JOIN itens i ON pi.itemId = i.id
                WHERE pi.pacoteId = ?
            `, [pacote.id]);
        }
        
        return pacotes;
    }

    async getPacotesPendentes() {
        const pacotes = await this.dbAll("SELECT * FROM pacotes WHERE status = 'PENDENTE' ORDER BY data ASC");
        
        for (const pacote of pacotes) {
            pacote.itens = await this.dbAll(`
                SELECT pi.*, i.nome as itemNome 
                FROM pacote_itens pi
                LEFT JOIN itens i ON pi.itemId = i.id
                WHERE pi.pacoteId = ?
            `, [pacote.id]);
        }
        
        return pacotes;
    }

    async getPacoteById(id) {
        const pacote = await this.dbGet('SELECT * FROM pacotes WHERE id = ?', [id]);
        if (pacote) {
            pacote.itens = await this.dbAll(`
                SELECT pi.*, i.nome as itemNome, i.quantidade as estoqueAtual
                FROM pacote_itens pi
                LEFT JOIN itens i ON pi.itemId = i.id
                WHERE pi.pacoteId = ?
            `, [id]);
        }
        return pacote;
    }

    async updatePacoteStatus(id, status, observacoes = '', aprovadoPor = null) {
        return await this.dbRun(`
            UPDATE pacotes 
            SET status = ?, observacoes = ?, aprovado_por = ?, aprovado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, observacoes, aprovadoPor, id]);
    }

    async updatePacoteItemStatus(pacoteId, itemId, status, quantidadeAprovada, observacoes = '') {
        return await this.dbRun(`
            UPDATE pacote_itens 
            SET status = ?, quantidadeAprovada = ?, observacoes = ?
            WHERE pacoteId = ? AND itemId = ?
        `, [status, quantidadeAprovada, observacoes, pacoteId, itemId]);
    }

    async processarEntregaPacote(pacoteId, itensAprovados, adminId) {
        const pacote = await this.getPacoteById(pacoteId);
        if (!pacote) throw new Error('Pacote não encontrado');

        for (const itemAprovado of itensAprovados) {
            const { itemId, quantidadeAprovada } = itemAprovado;
            
            const item = await this.getItemById(itemId);
            if (!item) continue;

            if (item.quantidade >= quantidadeAprovada) {
                await this.retirarEstoque(
                    itemId, 
                    quantidadeAprovada, 
                    `${pacote.centroCusto} - ${pacote.projeto}`,
                    `Entrega de requisição #${pacoteId} - ${pacote.justificativa}`
                );

                await this.updatePacoteItemStatus(
                    pacoteId, 
                    itemId, 
                    'ENTREGUE', 
                    quantidadeAprovada, 
                    'Item entregue com sucesso'
                );
            } else {
                await this.updatePacoteItemStatus(
                    pacoteId, 
                    itemId, 
                    'REJEITADO', 
                    0, 
                    `Estoque insuficiente. Disponível: ${item.quantidade}, Solicitado: ${quantidadeAprovada}`
                );
            }
        }

        const itensEntregues = await this.dbAll(`
            SELECT COUNT(*) as total FROM pacote_itens 
            WHERE pacoteId = ? AND status = 'ENTREGUE'
        `, [pacoteId]);
        
        const totalItens = await this.dbAll(`
            SELECT COUNT(*) as total FROM pacote_itens 
            WHERE pacoteId = ?
        `, [pacoteId]);

        let statusFinal = 'APROVADO';
        if (itensEntregues[0].total === 0) {
            statusFinal = 'REJEITADO';
        } else if (itensEntregues[0].total < totalItens[0].total) {
            statusFinal = 'PARCIAL';
        }

        await this.updatePacoteStatus(pacoteId, statusFinal, 'Processamento concluído', adminId);
        
        return { statusFinal, itensProcessados: itensAprovados.length };
    }

    // Funções Utilitárias
    async unificarItens() {
        const itens = await this.dbAll('SELECT * FROM itens ORDER BY nome, serie');
        const grupos = new Map();
        
        for (const item of itens) {
            const chave = `${item.nome}|${item.serie || ''}`;
            if (!grupos.has(chave)) {
                grupos.set(chave, []);
            }
            grupos.get(chave).push(item);
        }
        
        let totalUnificados = 0;
        
        for (const [chave, grupo] of grupos) {
            if (grupo.length > 1) {
                grupo.sort((a, b) => a.id - b.id);
                const principal = grupo[0];
                const duplicados = grupo.slice(1);
                
                let quantidadeTotal = principal.quantidade;
                for (const dup of duplicados) {
                    quantidadeTotal += dup.quantidade;
                }
                
                await this.dbRun('UPDATE itens SET quantidade = ? WHERE id = ?', [quantidadeTotal, principal.id]);
                
                for (const dup of duplicados) {
                    await this.dbRun('DELETE FROM itens WHERE id = ?', [dup.id]);
                }
                
                totalUnificados += duplicados.length;
            }
        }
        
        return { totalUnificados, totalItensUnicos: grupos.size };
    }

    async exportarBanco() {
        const itens = await this.getAllItens();
        const movimentacoes = await this.getMovimentacoes(365);
        return { itens, movimentacoes };
    }

    async importarBanco(dados) {
        const { itens, movimentacoes } = dados;
        
        await this.dbRun('DELETE FROM movimentacoes');
        await this.dbRun('DELETE FROM itens');
        
        let itensImportados = 0;
        let movimentacoesImportadas = 0;
        
        for (const item of itens) {
            await this.dbRun(`
                INSERT INTO itens (nome, serie, descricao, origem, destino, valor, nf, quantidade, minimo, ideal, infos)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [item.nome, item.serie, item.descricao, item.origem, item.destino, item.valor, 
                item.nf, item.quantidade, item.minimo, item.ideal, item.infos]);
            itensImportados++;
        }
        
        if (movimentacoes && movimentacoes.length > 0) {
            for (const mov of movimentacoes) {
                await this.dbRun(`
                    INSERT INTO movimentacoes (item_id, item_nome, tipo, quantidade, origem, destino, descricao, data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [mov.item_id, mov.item_nome, mov.tipo, mov.quantidade, mov.origem, mov.destino, mov.descricao, mov.data]);
                movimentacoesImportadas++;
            }
        }
        
        return { itensImportados, movimentacoesImportadas };
    }

    async healthCheck() {
        try {
            await this.dbGet('SELECT 1');
            return { status: 'connected' };
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Erro ao fechar conexão com o banco:', err.message);
                } else {
                    console.log('Conexão com o banco fechada com sucesso.');
                }
            });
        }
    }
}

// Criar e exportar instância única do DatabaseManager
const dbManager = new DatabaseManager();
module.exports = dbManager;
