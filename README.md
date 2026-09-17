# 🎻 OrquestraApp

Aplicação web completa para gestão de orquestras, construída com **React + TypeScript + Tailwind CSS**, autenticação via **Google OAuth 2.0** e **Google Sheets** como base de dados.

---

## 📋 Funcionalidades

- **Dashboard** — visão geral da orquestra com estatísticas por naipe, repertório e avaliações
- **Gestão de Alunos** — CRUD completo sincronizado com Google Sheets
- **Plano de Palco** — editor visual com drag & drop de alunos para estantes
- **Repertório** — gestão de peças com badges de estado e filtros
- **Avaliações** — avaliação por estrelas, histórico por aluno/critério e exportação CSV
- **Tema claro/escuro** — toggle com preferência persistida
- **Sincronização** — botão de sync e operações em tempo real com o Sheets

---

## 🛠️ Stack Técnica

| Tecnologia | Uso |
|---|---|
| Vite + React 18 | Build tool e framework UI |
| TypeScript | Tipagem estática |
| Tailwind CSS v3 | Estilização |
| @dnd-kit | Drag & drop do plano de palco |
| Google Identity Services (GSI) | OAuth 2.0 (sem backend) |
| Google Sheets API v4 | Base de dados via REST |
| lucide-react | Ícones |
| react-hot-toast | Notificações |

---

## ⚙️ Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- Uma conta Google
- Um projeto no [Google Cloud Console](https://console.cloud.google.com/)

---

## 🚀 Setup Inicial

### 1. Clonar e instalar dependências

```bash
cd orchestra-app
npm install
```

### 2. Criar o ficheiro `.env`

```bash
cp .env.example .env
```

Preenche com as tuas credenciais Google (ver passo seguinte).

### 3. Configurar o Google Cloud Project

#### a) Criar projeto e ativar APIs

1. Vai a [console.cloud.google.com](https://console.cloud.google.com/)
2. Cria um novo projeto (ex: `orquestra-app`)
3. Em **APIs & Services → Library**, ativa:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API**
   - ✅ **Google People API** (para o perfil do utilizador)

#### b) Criar OAuth 2.0 Client ID

1. Vai a **APIs & Services → Credentials**
2. Clica **+ CREATE CREDENTIALS → OAuth client ID**
3. Seleciona **Web application**
4. Em **Authorized JavaScript origins** adiciona:
   ```
   http://localhost:5173
   ```
5. Em **Authorized redirect URIs** adiciona:
   ```
   http://localhost:5173
   ```
6. Clica **CREATE** e copia o **Client ID**

> ⚠️ Se a app ainda estiver em modo *Testing*, vai a **OAuth consent screen → Test users** e adiciona o teu email.

#### c) Criar API Key

1. Em **Credentials → + CREATE CREDENTIALS → API key**
2. Copia a chave gerada
3. (Opcional) Restringe a chave às APIs necessárias

#### d) Preencher o `.env`

```env
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSy...
```

### 4. Preparar o Google Spreadsheet

1. Vai a [sheets.google.com](https://sheets.google.com) e cria um novo ficheiro
2. Certifica-te que está partilhado (ou que és o proprietário) com a conta Google que usas para login
3. Copia o URL ou o ID do spreadsheet (a parte entre `/d/` e `/edit` no URL)

> A aplicação cria automaticamente as abas necessárias na primeira ligação:
> **Alunos**, **Repertório**, **Avaliações**, **Critérios**, **PlanosPalco**

### 5. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) no browser.

---

## 📊 Estrutura do Spreadsheet

### Aba: Alunos
| Nome | Naipe | Email | Nível | Ativo |
|---|---|---|---|---|
| João Silva | Violinos I | joao@email.com | Avançado | sim |

### Aba: Repertório
| Título | Compositor | Dificuldade | Duração | Estado | Notas |
|---|---|---|---|---|---|
| Sinfonia nº5 | Beethoven | Difícil | 35min | em ensaio | |

### Aba: Avaliações
| Nome Aluno | Naipe | Critério | Pontuação | Data | Observações |
|---|---|---|---|---|---|
| João Silva | Violinos I | Afinação | 4 | 2024-01-15 | Boa progressão |

### Aba: Critérios
| Nome do Critério | Descrição | Peso |
|---|---|---|
| Afinação | Precisão de afinação | 1 |
| Ritmo | Precisão rítmica | 1 |

### Aba: PlanosPalco
Gerida automaticamente pela aplicação (JSON serializado).

---

## 📁 Estrutura do Projeto

```
src/
├── api/
│   ├── googleAuth.ts     # OAuth 2.0 via Google Identity Services
│   └── sheetsApi.ts      # Wrapper Google Sheets API v4
├── components/
│   ├── layout/           # Sidebar, TopBar
│   ├── dashboard/        # Dashboard com estatísticas
│   ├── students/         # Lista e formulário de alunos
│   ├── stagePlan/        # Plano de palco com drag & drop
│   ├── repertoire/       # Lista e formulário de repertório
│   └── evaluations/      # Formulário e histórico de avaliações
├── context/
│   ├── AuthContext.tsx   # Estado de autenticação Google
│   ├── SheetsContext.tsx # Configuração do spreadsheet
│   └── ThemeContext.tsx  # Tema claro/escuro
├── hooks/
│   ├── useStudents.ts    # CRUD alunos
│   ├── useRepertoire.ts  # CRUD repertório
│   ├── useEvaluations.ts # CRUD avaliações + critérios
│   └── useStagePlans.ts  # Planos de palco persistidos
├── types/
│   └── index.ts          # Todos os tipos TypeScript
└── utils/
    └── csvExport.ts      # Export CSV + cálculos
```

---

## 🔧 Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 5173) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |

---

## 🔒 Segurança

- O token de acesso OAuth é guardado **em memória** (não no localStorage) por segurança
- O token expira após 1 hora; a re-autenticação é silenciosa se o utilizador estiver com a sessão Google ativa
- O `VITE_GOOGLE_API_KEY` é exposto no browser (normal para apps client-side) — restringe-o nas configurações do Google Cloud Console

---

## 🐛 Problemas comuns

**"VITE_GOOGLE_CLIENT_ID não configurado"**
→ Certifica-te que criaste o ficheiro `.env` com as variáveis corretas e que reiniciaste o servidor.

**"Erro 403 ao aceder ao Sheets"**
→ Verifica que o Spreadsheet está partilhado com a tua conta Google ou que és o proprietário.

**"popup_closed_by_user"**
→ O popup de login foi fechado antes de completar. Tenta novamente.

**Token expirado após 1 hora**
→ Clica em "Sincronizar" — a re-autenticação é automática se a sessão Google estiver ativa.

---

## 🌐 Deploy: GitHub + Netlify

### 1. Instalar Git (se necessário)

```powershell
winget install Git.Git --accept-source-agreements --accept-package-agreements
# Reinicia o terminal após instalar
```

### 2. Inicializar repositório Git

```bash
cd orchestra-app
git init
git add .
git commit -m "feat: initial commit — OrquestraApp"
```

### 3. Criar repositório no GitHub

1. Vai a [github.com/new](https://github.com/new)
2. Nome: `orchestra-app` (ou outro à tua escolha)
3. Visibilidade: Public ou Private
4. **Não** inicializes com README, .gitignore ou licença
5. Clica **Create repository** e copia o URL

```bash
git remote add origin https://github.com/SEU_USER/orchestra-app.git
git branch -M main
git push -u origin main
```

### 4. Deploy no Netlify

1. Vai a [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Conecta ao **GitHub** e seleciona o repositório `orchestra-app`
3. As configurações de build são detetadas automaticamente pelo `netlify.toml`:
   | Campo | Valor |
   |---|---|
   | Build command | `npm run build` |
   | Publish directory | `dist` |
4. Antes de fazer deploy, adiciona as **Environment Variables**:
   - Em **Site settings → Environment variables** → **Add variable**:

   | Key | Value |
   |---|---|
   | `VITE_GOOGLE_CLIENT_ID` | `<o-teu-client-id>.apps.googleusercontent.com` |
   | `VITE_GOOGLE_API_KEY` | `AIzaSy...` |

5. Clica **Deploy site** — o Netlify fará o build e publicará em `https://xxx.netlify.app`

> 💡 **Deploy automático**: a cada `git push` para `main`, o Netlify faz re-deploy automaticamente.

### 5. Atualizar OAuth no Google Cloud Console

Após o deploy, copia o teu URL Netlify (ex: `https://orchestra-app.netlify.app`) e:

1. Vai a [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Clica no teu **OAuth 2.0 Client ID**
3. Em **Authorized JavaScript origins** adiciona:
   ```
   https://orchestra-app.netlify.app
   ```
4. Guarda — o OAuth passará a funcionar no domínio de produção.

> ⚠️ Podes ter um domínio personalizado no Netlify (ex: `orquestra.pt`) — nesse caso adiciona também esse domínio nas origins.

### 6. Domínio personalizado (opcional)

No Netlify: **Site settings → Domain management → Add a domain** — segue as instruções para configurar DNS.

---

## 🔄 Fluxo de trabalho Git

```bash
# Fazer alterações locais
git add .
git commit -m "fix: descrição da alteração"
git push

# O Netlify deteta o push e faz re-deploy automaticamente
```
