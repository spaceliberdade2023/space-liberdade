"""
Script para atualizar todas as páginas HTML estáticas com a nova marca
"Space Liberdade" e adicionar a barra de cotações.
"""
import re
import os
import glob

# Páginas e categoria ativa
paginas = {
    'index.html':       'capa',
    'politica.html':    'politica',
    'economia.html':    'economia',
    'tecnologia.html':  'tecnologia',
    'esportes.html':    'esportes',
    'cultura.html':     'cultura',
    'noticia-1.html':   'politica',
    'noticia-2.html':   'tecnologia',
    'noticia-3.html':   'esportes',
    'noticia-4.html':   'economia',
    'noticia-5.html':   'cultura',
}

def cabecalho_novo(ativo):
    def cls(item): return ' class="ativo"' if ativo == item else ''
    return f'''<div class="barra-superior">
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
        <li><a href="/"{cls('capa')}>Capa</a></li>
        <li><a href="/politica"{cls('politica')}>Política</a></li>
        <li><a href="/economia"{cls('economia')}>Economia</a></li>
        <li><a href="/tecnologia"{cls('tecnologia')}>Tecnologia</a></li>
        <li><a href="/esportes"{cls('esportes')}>Esportes</a></li>
        <li><a href="/cultura"{cls('cultura')}>Cultura</a></li>
        <li><a href="#">Mundo</a></li>
        <li><a href="#">Opinião</a></li>
        <li><a href="/ultimas">Últimas</a></li>
    </ul>
</nav>

<div class="ultima-hora">
    <div class="ultima-hora-conteudo">
        <span class="ultima-hora-tag">Última hora</span>
        <span class="ultima-hora-texto"><a href="/noticia-1">Congresso aprova reforma tributária após sete anos de debate — texto segue para sanção presidencial</a></span>
    </div>
</div>'''

# Padrão: tudo do <body> até o fim do <nav class="menu">...</nav>
PAD = re.compile(
    r'<body>\s*(.*?)</nav>\s*',
    re.DOTALL
)

# Substituir links .html por rotas limpas no resto do arquivo
def limpar_links(html):
    # Substitui href="X.html" por href="/X" para as páginas conhecidas
    paginas_links = ['index', 'politica', 'economia', 'tecnologia',
                     'esportes', 'cultura', 'noticia-1', 'noticia-2',
                     'noticia-3', 'noticia-4', 'noticia-5']
    for p in paginas_links:
        rota = '/' if p == 'index' else f'/{p}'
        html = html.replace(f'href="{p}.html"', f'href="{rota}"')
    return html

# Atualizar rodapé (substituir links .html)
def atualizar_rodape(html):
    # O rodapé tem links como <a href="politica.html">. Já tratado em limpar_links.
    return html

base_dir = os.path.dirname(os.path.abspath(__file__))

for arquivo, ativo in paginas.items():
    caminho = os.path.join(base_dir, arquivo)
    if not os.path.exists(caminho):
        print(f"NÃO ENCONTRADO: {arquivo}")
        continue

    with open(caminho, 'r', encoding='utf-8') as f:
        html = f.read()

    novo_cab = cabecalho_novo(ativo)

    # Substituir cabeçalho
    novo_html, n = PAD.subn(f'<body>\n\n{novo_cab}\n\n', html, count=1)
    if n == 0:
        print(f"⚠ Cabeçalho não encontrado em: {arquivo}")
        continue

    # Atualizar título
    novo_html = re.sub(
        r'<title>(.*?)O Diário(.*?)</title>',
        r'<title>\1Space Liberdade\2</title>',
        novo_html
    )

    # Substituir links .html por rotas limpas
    novo_html = limpar_links(novo_html)

    # Atualizar marca no rodapé (de "O Diário" para "Space Liberdade")
    novo_html = novo_html.replace('<div class="marca">O Diário</div>',
                                  '<div class="marca">Space Liberdade</div>')
    novo_html = novo_html.replace('<em>O Diário</em>', '<em>Space Liberdade</em>')
    novo_html = novo_html.replace('© 2026 O DIÁRIO', '© 2026 SPACE LIBERDADE')

    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(novo_html)

    print(f"✓ Atualizado: {arquivo} (categoria ativa: {ativo})")

print("\nTodos os arquivos atualizados.")
