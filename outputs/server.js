/**
 * Space Liberdade — Servidor backend (Node.js puro, sem dependências)
 *
 * - Serve as páginas estáticas (capa, política, economia, etc.)
 * - Painel administrativo em /admin (login obrigatório)
 * - Admin pode criar / editar / excluir notícias (salvas em data.json)
 * - Notícias criadas aparecem em /ultimas e em /noticia/:id
 *
 * Para iniciar (não precisa de npm install):
 *   node server.js
 *
 * Acessar em http://localhost:3000
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const url    = require('url');

const PORT = process.env.PORT || 3000;
const RAIZ = __dirname;

// ============================================================
// CONFIG: usuário admin
// ============================================================
const ADMIN_USUARIO = 'space123';
const ADMIN_SENHA   = 'space 2023!';

// Hasheia a senha com scrypt (módulo nativo) e armazena só o hash
const SALT = crypto.randomBytes(16);
const ADMIN_HASH = crypto.scryptSync(ADMIN_SENHA, SALT, 64);

function senhaConfere(tentativa) {
    if (typeof tentativa !== 'string') return false;
    const hash = crypto.scryptSync(tentativa, SALT, 64);
    return crypto.timingSafeEqual(hash, ADMIN_HASH);
}

// ============================================================
// SESSÕES (em memória — apaga ao reiniciar o servidor)
// ============================================================
const sessoes = new Map();

function novaSessao(usuario) {
    const id = crypto.randomBytes(24).toString('hex');
    sessoes.set(id, {
        usuario,
        criadaEm: Date.now(),
        expiraEm: Date.now() + 1000 * 60 * 60 * 8 // 8 horas
    });
    return id;
}

function lerSessao(req) {
    const cookie = req.headers.cookie || '';
    const m = cookie.match(/sl_sess=([a-f0-9]+)/);
    if (!m) return null;
    const sess = sessoes.get(m[1]);
    if (!sess) return null;
    if (Date.now() > sess.expiraEm) { sessoes.delete(m[1]); return null; }
    return { id: m[1], ...sess };
}

function setCookieSessao(res, id) {
    res.setHeader('Set-Cookie',
        `sl_sess=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 8}`);
}

function limparCookieSessao(res) {
    res.setHeader('Set-Cookie', 'sl_sess=; Path=/; HttpOnly; Max-Age=0');
}

// ============================================================
// PERSISTÊNCIA
// ============================================================
const ARQUIVO_DADOS = path.join(RAIZ, 'data.json');

function carregarArtigos() {
    try {
        if (!fs.existsSync(ARQUIVO_DADOS)) return [];
        return JSON.parse(fs.readFileSync(ARQUIVO_DADOS, 'utf-8'));
    } catch (e) { console.error('Erro ao ler data.json:', e.message); return []; }
}

function salvarArtigos(lista) {
    fs.writeFileSync(ARQUIVO_DADOS, JSON.stringify(lista, null, 2), 'utf-8');
}

// ============================================================
// HELPERS
// ============================================================
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function paragrafosHtml(texto) {
    if (!texto) return '';
    return texto.split(/\n{2,}/)
        .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('\n');
}

function lerCorpo(req) {
    return new Promise((resolve, reject) => {
        let dados = '';
        req.on('data', c => { dados += c; if (dados.length > 1e6) req.destroy(); });
        req.on('end', () => {
            const obj = {};
            new url.URLSearchParams(dados).forEach((v, k) => { obj[k] = v; });
            resolve(obj);
        });
        req.on('error', reject);
    });
}

function responder(res, status, contentType, corpo, headers = {}) {
    res.writeHead(status, { 'Content-Type': contentType, ...headers });
    res.end(corpo);
}

function redirecionar(res, destino) {
    res.writeHead(302, { Location: destino });
    res.end();
}

function servirArquivo(res, arquivo, contentType = 'text/html; charset=utf-8') {
    const caminho = path.join(RAIZ, arquivo);
    if (!fs.existsSync(caminho)) return responder(res, 404, 'text/plain', 'Não encontrado');
    fs.readFile(caminho, (err, dados) => {
        if (err) return responder(res, 500, 'text/plain', 'Erro');
        responder(res, 200, contentType, dados);
    });
}

// ============================================================
// CABEÇALHO/RODAPÉ COMPARTILHADO (pages dinâmicas)
// ============================================================
function renderizarPagina({ titulo, ativo, conteudo }) {
    function cls(item) { return ativo === item ? ' class="ativo"' : ''; }
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titulo}</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<div class="barra-superior">
    <div class="barra-superior-conteudo">
        <span>Terça-feira, 5 de maio de 2026 &nbsp; • &nbsp; São Paulo, 22°C &nbsp; • &nbsp; Edição nº 42.879</span>
        <span><a href="#">Assine</a><a href="#">Newsletter</a><a href="/admin/login">Admin</a></span>
    </div>
</div>
<header class="cabecalho">
    <div class="cabecalho-conteudo">
        <div class="esquerda">Brasil &nbsp;•&nbsp; Política &nbsp;•&nbsp; Economia<br>Tecnologia &nbsp;•&nbsp; Cultura</div>
        <div class="logo-bloco">
            <a href="/" class="logo">Space Liberdade</a>
            <div class="subtitulo">— jornalismo livre, independente e direto ao ponto —</div>
        </div>
        <div class="direita">Terça-feira<br>5 maio 2026<br>Edição nº 42.879</div>
    </div>
</header>
<div class="cotacoes">
    <div class="cotacoes-conteudo">
        <div class="cotacao"><span class="cotacao-rotulo">Dólar</span><span class="cotacao-valor">R$ 4,82</span><span class="cotacao-var baixa">0,82%</span></div>
        <div class="cotacao"><span class="cotacao-rotulo">Euro</span><span class="cotacao-valor">R$ 5,21</span><span class="cotacao-var baixa">0,45%</span></div>
        <div class="cotacao"><span class="cotacao-rotulo">Ibovespa</span><span class="cotacao-valor">145.927</span><span class="cotacao-var alta">1,84%</span></div>
        <div class="cotacao"><span class="cotacao-rotulo">Selic</span><span class="cotacao-valor">9,75%</span><span class="cotacao-var baixa">a.a.</span></div>
        <div class="cotacao"><span class="cotacao-rotulo">Bitcoin</span><span class="cotacao-valor">US$ 71.480</span><span class="cotacao-var alta">2,14%</span></div>
        <div class="cotacao"><span class="cotacao-rotulo">Petróleo</span><span class="cotacao-valor">US$ 84,12</span><span class="cotacao-var alta">0,68%</span></div>
    </div>
</div>
<nav class="menu">
    <ul>
        <li><a href="/"${cls('capa')}>Capa</a></li>
        <li><a href="/politica"${cls('politica')}>Política</a></li>
        <li><a href="/economia"${cls('economia')}>Economia</a></li>
        <li><a href="/tecnologia"${cls('tecnologia')}>Tecnologia</a></li>
        <li><a href="/esportes"${cls('esportes')}>Esportes</a></li>
        <li><a href="/cultura"${cls('cultura')}>Cultura</a></li>
        <li><a href="#">Mundo</a></li>
        <li><a href="#">Opinião</a></li>
        <li><a href="/ultimas"${cls('ultimas')}>Últimas</a></li>
    </ul>
</nav>
<div class="ultima-hora">
    <div class="ultima-hora-conteudo">
        <span class="ultima-hora-tag">Última hora</span>
        <span class="ultima-hora-texto"><a href="/noticia-1">Congresso aprova reforma tributária após sete anos de debate — texto segue para sanção presidencial</a></span>
    </div>
</div>
<div class="container"><main>
${conteudo}
</main></div>
<footer>
    <div class="rodape-conteudo">
        <div>
            <div class="marca">Space Liberdade</div>
            <p>Jornalismo independente, livre e direto ao ponto.</p>
        </div>
        <div><h4>Editorias</h4><ul>
            <li><a href="/politica">Política</a></li><li><a href="/economia">Economia</a></li>
            <li><a href="/tecnologia">Tecnologia</a></li><li><a href="/esportes">Esportes</a></li>
            <li><a href="/cultura">Cultura</a></li>
        </ul></div>
        <div><h4>Institucional</h4><ul>
            <li><a href="#">Quem somos</a></li><li><a href="#">Princípios editoriais</a></li><li><a href="#">Contato</a></li>
        </ul></div>
        <div><h4>Acesso</h4><ul>
            <li><a href="/admin/login">Admin</a></li><li><a href="#">Newsletter</a></li>
        </ul></div>
    </div>
    <div class="copyright">© 2026 SPACE LIBERDADE — TODOS OS DIREITOS RESERVADOS</div>
</footer>
</body>
</html>`;
}

function layoutAdmin(tituloPagina, usuario, conteudo) {
    return `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="UTF-8"><title>${escapeHtml(tituloPagina)} — Space Liberdade Admin</title>
<link rel="stylesheet" href="/styles.css"></head><body>
<div class="admin-cabecalho">
    <div class="admin-cabecalho-conteudo">
        <div class="marca-admin">
            <a href="/admin" class="logo">Space Liberdade</a>
            <span class="titulo-admin">Admin</span>
        </div>
        <div class="acoes-admin">
            <span style="color:#ccc;font-size:13px;">olá, <strong style="color:#fff;">${escapeHtml(usuario)}</strong></span>
            <a href="/admin">Painel</a>
            <a href="/admin/nova">Nova notícia</a>
            <a href="/" target="_blank">Ver site</a>
            <a href="/admin/logout">Sair</a>
        </div>
    </div>
</div>
<div class="admin-corpo"><div class="admin-painel">${conteudo}</div></div>
</body></html>`;
}

function formularioArtigo(artigo) {
    const a = artigo || {};
    const acao   = artigo ? `/admin/editar/${a.id}` : '/admin/nova';
    const titulo = artigo ? 'Editar notícia' : 'Nova notícia';
    const cats = ['Política','Economia','Tecnologia','Esportes','Cultura','Mundo','Opinião','Saúde'];
    return `
        <h1 class="admin-titulo">${titulo}</h1>
        <form class="formulario" method="POST" action="${acao}">
            <div class="campo"><label for="titulo">Título *</label>
                <input type="text" id="titulo" name="titulo" required value="${escapeHtml(a.titulo || '')}"></div>
            <div class="campo"><label for="linhaFina">Linha-fina (subtítulo)</label>
                <input type="text" id="linhaFina" name="linhaFina" value="${escapeHtml(a.linhaFina || '')}"></div>
            <div class="campo"><label for="categoria">Categoria</label>
                <select id="categoria" name="categoria"><option value="">— selecione —</option>
                ${cats.map(c => `<option value="${c}"${a.categoria === c ? ' selected' : ''}>${c}</option>`).join('')}
                </select></div>
            <div class="campo"><label for="autor">Autor</label>
                <input type="text" id="autor" name="autor" value="${escapeHtml(a.autor || 'Redação')}"></div>
            <div class="campo"><label for="imagem">URL da imagem (opcional)</label>
                <input type="url" id="imagem" name="imagem" placeholder="https://..." value="${escapeHtml(a.imagem || '')}"></div>
            <div class="campo"><label for="corpo">Texto da notícia *</label>
                <textarea id="corpo" name="corpo" required placeholder="Escreva o texto. Separe parágrafos com uma linha em branco.">${escapeHtml(a.corpo || '')}</textarea></div>
            <div class="acoes">
                <button type="submit" class="botao">${artigo ? 'Salvar alterações' : 'Publicar notícia'}</button>
                <a href="/admin" class="botao botao-secundario">Cancelar</a>
            </div>
        </form>`;
}

// ============================================================
// ROTEAMENTO
// ============================================================
const PAGINAS_ESTATICAS = {
    '/':           'index.html',
    '/politica':   'politica.html',
    '/economia':   'economia.html',
    '/tecnologia': 'tecnologia.html',
    '/esportes':   'esportes.html',
    '/cultura':    'cultura.html',
    '/noticia-1':  'noticia-1.html',
    '/noticia-2':  'noticia-2.html',
    '/noticia-3':  'noticia-3.html',
    '/noticia-4':  'noticia-4.html',
    '/noticia-5':  'noticia-5.html'
};

const servidor = http.createServer(async (req, res) => {
    const u = url.parse(req.url, true);
    const caminho = u.pathname;
    const sess = lerSessao(req);

    try {
        // Arquivos estáticos
        if (caminho === '/styles.css') return servirArquivo(res, 'styles.css', 'text/css; charset=utf-8');

        // Páginas HTML estáticas
        if (PAGINAS_ESTATICAS[caminho] && req.method === 'GET') {
            return servirArquivo(res, PAGINAS_ESTATICAS[caminho]);
        }

        // /ultimas — lista dinâmica
        if (caminho === '/ultimas' && req.method === 'GET') {
            const artigos = carregarArtigos().sort((a, b) =>
                new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

            const cartoes = artigos.length === 0
                ? `<p style="font-style:italic;color:#888;padding:30px 0;text-align:center;">Nenhuma notícia da redação publicada ainda. Faça login no <a href="/admin/login">painel administrativo</a> para criar a primeira.</p>`
                : artigos.map(a => `
                    <article style="display:grid;grid-template-columns:1fr 280px;gap:20px;padding:22px 0;border-bottom:1px solid #e5e5e5;">
                        <div>
                            <span class="tag-categoria">${escapeHtml(a.categoria || 'Notícia')}</span>
                            <h2 style="font-family:'Roboto Slab',serif;font-size:24px;line-height:1.2;margin:8px 0;font-weight:700;"><a href="/noticia/${a.id}" style="color:#111;">${escapeHtml(a.titulo)}</a></h2>
                            <p style="color:#555;font-size:15px;line-height:1.5;">${escapeHtml(a.linhaFina || '')}</p>
                            <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:8px;">Por <strong>${escapeHtml(a.autor || 'Redação')}</strong> • ${new Date(a.criadoEm).toLocaleString('pt-BR')}</p>
                        </div>
                        ${a.imagem ? `<img src="${escapeHtml(a.imagem)}" alt="" style="width:100%;height:160px;object-fit:cover;">` : ''}
                    </article>`).join('');

            return responder(res, 200, 'text/html; charset=utf-8', renderizarPagina({
                titulo: 'Últimas — Space Liberdade',
                ativo: 'ultimas',
                conteudo: `<div class="cabecalho-categoria"><h1>Últimas Notícias</h1><p>Reportagens publicadas pela redação do Space Liberdade.</p></div><div>${cartoes}</div>`
            }));
        }

        // /noticia/:id — artigo dinâmico
        const matchNoticia = caminho.match(/^\/noticia\/([a-f0-9]+)$/);
        if (matchNoticia && req.method === 'GET') {
            const id = matchNoticia[1];
            const artigo = carregarArtigos().find(a => a.id === id);
            if (!artigo) {
                return responder(res, 404, 'text/html; charset=utf-8', renderizarPagina({
                    titulo: '404 — Space Liberdade', ativo: '',
                    conteudo: '<div style="text-align:center;padding:60px 0;"><h1>404</h1><p>Notícia não encontrada.</p><p><a href="/">← Voltar para a capa</a></p></div>'
                }));
            }
            return responder(res, 200, 'text/html; charset=utf-8', renderizarPagina({
                titulo: `${artigo.titulo} — Space Liberdade`,
                ativo: (artigo.categoria || '').toLowerCase().replace('í','i'),
                conteudo: `<article class="artigo">
                    <span class="tag-categoria">${escapeHtml(artigo.categoria || 'Notícia')}</span>
                    <h1>${escapeHtml(artigo.titulo)}</h1>
                    ${artigo.linhaFina ? `<p class="linha-fina">${escapeHtml(artigo.linhaFina)}</p>` : ''}
                    <div class="meta">
                        <span>Por <strong>${escapeHtml(artigo.autor || 'Redação')}</strong></span>
                        <span>${new Date(artigo.criadoEm).toLocaleString('pt-BR')}</span>
                    </div>
                    ${artigo.imagem ? `<figure><img src="${escapeHtml(artigo.imagem)}" alt=""></figure>` : ''}
                    ${paragrafosHtml(artigo.corpo)}
                </article>`
            }));
        }

        // ============== ADMIN ==============
        // GET /admin/login
        if (caminho === '/admin/login' && req.method === 'GET') {
            if (sess) return redirecionar(res, '/admin');
            const erro = u.query.erro ? '<div class="alerta">Usuário ou senha incorretos.</div>' : '';
            return responder(res, 200, 'text/html; charset=utf-8', `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Login Admin — Space Liberdade</title>
<link rel="stylesheet" href="/styles.css"></head><body>
<div class="tela-login"><div class="caixa-login">
    <div class="marca-login"><a href="/" class="logo">Space Liberdade</a></div>
    <h2>Acesso administrativo</h2>${erro}
    <form method="POST" action="/admin/login">
        <div class="campo"><label for="usuario">Usuário</label>
            <input type="text" id="usuario" name="usuario" autofocus required></div>
        <div class="campo"><label for="senha">Senha</label>
            <input type="password" id="senha" name="senha" required></div>
        <button type="submit">Entrar</button>
    </form>
    <div class="voltar-site"><a href="/">← Voltar ao site</a></div>
</div></div></body></html>`);
        }

        // POST /admin/login
        if (caminho === '/admin/login' && req.method === 'POST') {
            const corpo = await lerCorpo(req);
            if (corpo.usuario === ADMIN_USUARIO && senhaConfere(corpo.senha)) {
                const id = novaSessao(ADMIN_USUARIO);
                setCookieSessao(res, id);
                return redirecionar(res, '/admin');
            }
            return redirecionar(res, '/admin/login?erro=1');
        }

        // /admin/logout
        if (caminho === '/admin/logout') {
            if (sess) sessoes.delete(sess.id);
            limparCookieSessao(res);
            return redirecionar(res, '/admin/login');
        }

        // Tudo abaixo de /admin* exige login
        if (caminho.startsWith('/admin') && !sess) {
            return redirecionar(res, '/admin/login');
        }

        // GET /admin (dashboard)
        if (caminho === '/admin' && req.method === 'GET') {
            const artigos = carregarArtigos().sort((a, b) =>
                new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
            const total = artigos.length;
            const hoje = artigos.filter(a => new Date(a.criadoEm).toDateString() === new Date().toDateString()).length;

            const linhas = artigos.length === 0
                ? '<tr><td colspan="5" class="vazio">Nenhuma notícia cadastrada ainda. Clique em "Nova notícia" para começar.</td></tr>'
                : artigos.map(a => `<tr>
                    <td><strong>${escapeHtml(a.titulo)}</strong></td>
                    <td>${escapeHtml(a.categoria || '—')}</td>
                    <td>${escapeHtml(a.autor || '—')}</td>
                    <td>${new Date(a.criadoEm).toLocaleString('pt-BR')}</td>
                    <td>
                        <a href="/noticia/${a.id}" target="_blank">Ver</a>
                        <a href="/admin/editar/${a.id}">Editar</a>
                        <a href="/admin/excluir/${a.id}" onclick="return confirm('Excluir esta notícia?');" style="color:#aa1414;">Excluir</a>
                    </td></tr>`).join('');

            return responder(res, 200, 'text/html; charset=utf-8', layoutAdmin('Painel administrativo', sess.usuario, `
                <h1 class="admin-titulo">Painel administrativo</h1>
                <div class="cards-stats">
                    <div class="card-stat"><div class="numero">${total}</div><div class="rotulo">Notícias publicadas</div></div>
                    <div class="card-stat"><div class="numero">${hoje}</div><div class="rotulo">Publicadas hoje</div></div>
                    <div class="card-stat"><div class="numero">5</div><div class="rotulo">Editorias ativas</div></div>
                </div>
                <div class="admin-acoes-topo">
                    <a href="/admin/nova" class="botao">+ Nova notícia</a>
                    <a href="/" class="botao botao-secundario" target="_blank">Ver site público</a>
                </div>
                <table class="tabela">
                    <thead><tr><th>Título</th><th>Categoria</th><th>Autor</th><th>Publicado em</th><th>Ações</th></tr></thead>
                    <tbody>${linhas}</tbody>
                </table>`));
        }

        // GET /admin/nova
        if (caminho === '/admin/nova' && req.method === 'GET') {
            return responder(res, 200, 'text/html; charset=utf-8',
                layoutAdmin('Nova notícia', sess.usuario, formularioArtigo(null)));
        }

        // POST /admin/nova
        if (caminho === '/admin/nova' && req.method === 'POST') {
            const c = await lerCorpo(req);
            if (!c.titulo || !c.corpo) return redirecionar(res, '/admin/nova?erro=1');
            const artigos = carregarArtigos();
            artigos.push({
                id: crypto.randomBytes(6).toString('hex'),
                titulo: c.titulo.trim(),
                linhaFina: (c.linhaFina || '').trim(),
                categoria: (c.categoria || '').trim(),
                autor: (c.autor || 'Redação').trim(),
                imagem: (c.imagem || '').trim(),
                corpo: c.corpo.trim(),
                criadoEm: new Date().toISOString(),
                atualizadoEm: new Date().toISOString()
            });
            salvarArtigos(artigos);
            return redirecionar(res, '/admin');
        }

        // GET /admin/editar/:id
        const matchEditar = caminho.match(/^\/admin\/editar\/([a-f0-9]+)$/);
        if (matchEditar && req.method === 'GET') {
            const a = carregarArtigos().find(x => x.id === matchEditar[1]);
            if (!a) return redirecionar(res, '/admin');
            return responder(res, 200, 'text/html; charset=utf-8',
                layoutAdmin('Editar notícia', sess.usuario, formularioArtigo(a)));
        }
        if (matchEditar && req.method === 'POST') {
            const c = await lerCorpo(req);
            const artigos = carregarArtigos();
            const idx = artigos.findIndex(x => x.id === matchEditar[1]);
            if (idx === -1) return redirecionar(res, '/admin');
            artigos[idx] = {
                ...artigos[idx],
                titulo: (c.titulo || '').trim(),
                linhaFina: (c.linhaFina || '').trim(),
                categoria: (c.categoria || '').trim(),
                autor: (c.autor || 'Redação').trim(),
                imagem: (c.imagem || '').trim(),
                corpo: (c.corpo || '').trim(),
                atualizadoEm: new Date().toISOString()
            };
            salvarArtigos(artigos);
            return redirecionar(res, '/admin');
        }

        // GET /admin/excluir/:id
        const matchExcluir = caminho.match(/^\/admin\/excluir\/([a-f0-9]+)$/);
        if (matchExcluir) {
            salvarArtigos(carregarArtigos().filter(a => a.id !== matchExcluir[1]));
            return redirecionar(res, '/admin');
        }

        // 404
        return responder(res, 404, 'text/html; charset=utf-8', renderizarPagina({
            titulo: '404 — Space Liberdade', ativo: '',
            conteudo: '<div style="text-align:center;padding:60px 0;"><h1 style="font-size:80px;margin-bottom:0;">404</h1><p style="font-size:20px;color:#555;">A página que você procura não existe.</p><p style="margin-top:20px;"><a href="/" style="color:#003a8c;font-weight:700;">← Voltar para a capa</a></p></div>'
        }));

    } catch (e) {
        console.error('Erro:', e);
        return responder(res, 500, 'text/plain', 'Erro interno do servidor');
    }
});

servidor.listen(PORT, () => {
    console.log('');
    console.log('  +---------------------------------------------+');
    console.log('  |                                             |');
    console.log('  |    SPACE LIBERDADE - servidor no ar         |');
    console.log('  |                                             |');
    console.log('  |    Site:    http://localhost:' + PORT + '          |');
    console.log('  |    Admin:   http://localhost:' + PORT + '/admin    |');
    console.log('  |                                             |');
    console.log('  |    Login:   space123                        |');
    console.log('  |    Senha:   space 2023!                     |');
    console.log('  |                                             |');
    console.log('  +---------------------------------------------+');
    console.log('');
});
