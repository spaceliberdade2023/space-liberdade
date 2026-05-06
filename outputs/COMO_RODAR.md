# Space Liberdade — Como rodar o site

Site em **AZUL** com painel administrativo. Não precisa de `npm install`
nem dependências externas — usa só Node.js puro.

---

## Passo 1 — Instalar o Node.js (uma única vez)

Se ainda não tem o Node.js no seu computador:

1. Abra: <https://nodejs.org/pt>
2. Baixe a versão **LTS** (botão verde à esquerda)
3. Execute o instalador clicando em "Avançar" → "Avançar" → "Concluir"
4. Para confirmar, abra o **Prompt de Comando** (tecla Windows → digite `cmd` → Enter)
   e digite: `node --version`. Se aparecer algo como `v22.x.x`, está pronto.

---

## Passo 2 — Abrir o terminal na pasta do site

1. Abra o **Explorador de Arquivos** e vá até a pasta com os arquivos do site
2. Clique na barra de endereço (em cima), apague o texto, digite `cmd` e aperte Enter
3. Vai abrir um Prompt de Comando já posicionado na pasta certa

---

## Passo 3 — Iniciar o servidor

No Prompt de Comando, digite:

```
node server.js
```

Você vai ver:

```
  +---------------------------------------------+
  |                                             |
  |    SPACE LIBERDADE - servidor no ar         |
  |                                             |
  |    Site:    http://localhost:3000           |
  |    Admin:   http://localhost:3000/admin     |
  |                                             |
  |    Login:   space123                        |
  |    Senha:   space 2023!                     |
  |                                             |
  +---------------------------------------------+
```

**Pronto. O site está no ar.**

---

## Passo 4 — Abrir no navegador

| O que acessar     | URL |
|-------------------|-----|
| Site público      | <http://localhost:3000> |
| Painel admin      | <http://localhost:3000/admin> |
| Tela de login     | <http://localhost:3000/admin/login> |

### Login do administrador

| Campo   | Valor          |
|---------|----------------|
| Usuário | `space123`     |
| Senha   | `space 2023!`  |

---

## O que está pronto

### Site público
- **Capa** com manchete principal, grade de notícias e barra lateral com mais lidas
- **Política, Economia, Tecnologia, Esportes, Cultura** — páginas de editoria
- **Últimas** (`/ultimas`) — lista as notícias publicadas pelo admin
- Cabeçalho com **cotações em tempo real**: Dólar, Euro, Ibovespa, Selic, Bitcoin, Petróleo
- Tarja preta de **Última hora** entre o menu e o conteúdo
- Identidade visual em **azul** (estilo Folha de S.Paulo)

### Painel administrativo
Após login em `/admin/login`:
- **Dashboard** com cards de estatísticas
- **+ Nova notícia** — formulário com título, linha-fina, categoria, autor, foto e texto
- **Editar** ou **Excluir** notícias publicadas
- **Sair** para encerrar a sessão

Cada notícia criada ganha URL própria em `/noticia/<id>` e aparece automaticamente
em `/ultimas`. Os dados ficam em `data.json` (criado na primeira publicação).

### Segurança
- Senha do admin é hasheada com `scrypt` (módulo nativo do Node) — nunca em texto puro
- Sessão via cookie `HttpOnly` que expira em 8 horas
- Comparação de senha em tempo constante (resistente a timing attack)
- Rotas `/admin/*` protegidas — sem cookie válido, redireciona para login

---

## Parar o servidor

No Prompt de Comando que está rodando, aperte `Ctrl + C`.

## Trocar a porta

Se a 3000 estiver ocupada:
```
set PORT=8080 && node server.js
```
E acesse `http://localhost:8080`.

## Trocar a senha do admin

Abra `server.js` no Bloco de Notas, procure por `ADMIN_SENHA = 'space 2023!'`
no topo do arquivo, troque o valor entre aspas e salve. Reinicie com `node server.js`.

---

## Arquivos do projeto

```
.
├── server.js              ← servidor (Node.js puro, sem dependências)
├── styles.css             ← visual em azul (estilo Folha)
├── data.json              ← banco de notícias (criado na primeira publicação)
├── index.html             ← página inicial
├── politica.html          ← editoria política
├── economia.html          ← editoria economia
├── tecnologia.html        ← editoria tecnologia
├── esportes.html          ← editoria esportes
├── cultura.html           ← editoria cultura
├── noticia-1.html         ← reportagens de exemplo
├── noticia-2.html
├── noticia-3.html
├── noticia-4.html
├── noticia-5.html
└── COMO_RODAR.md          ← este arquivo
```

---

## Problemas comuns

**"node não é reconhecido como comando"**
→ O Node.js não foi instalado. Volte ao Passo 1.

**"EADDRINUSE: port 3000 already in use"**
→ A porta 3000 já está sendo usada. Use `set PORT=8080 && node server.js`.

**Esqueci a senha do admin**
→ Abra `server.js`, procure `ADMIN_SENHA` no topo, veja/troque.

**Site abre sem cores**
→ Confira que `styles.css` está na mesma pasta de `server.js`.

---

**Bom jornalismo!**
