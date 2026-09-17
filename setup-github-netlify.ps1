# Script de setup: Git init + GitHub + Netlify
# Corre este script em PowerShell como Administrador

$projectPath = "C:\Users\luism\.gemini\antigravity\scratch\orchestra-app"

Write-Host "=== OrquestraApp — Setup GitHub + Netlify ===" -ForegroundColor Cyan

# 1. Verificar se Git está instalado
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git não encontrado. A instalar..." -ForegroundColor Yellow
    winget install Git.Git --accept-source-agreements --accept-package-agreements
    # Atualizar PATH para esta sessão
    $env:PATH = "C:\Program Files\Git\bin;$env:PATH"
    Write-Host "Git instalado!" -ForegroundColor Green
}

Set-Location $projectPath

# 2. Inicializar repositório Git
Write-Host "`n[1/4] Inicializando repositório Git..." -ForegroundColor Cyan
git init
git add .
git commit -m "feat: initial commit — OrquestraApp"

Write-Host "`nRepositório Git inicializado com sucesso!" -ForegroundColor Green

# 3. Instruções para GitHub
Write-Host "`n[2/4] Próximos passos — GitHub:" -ForegroundColor Cyan
Write-Host "  1. Vai a https://github.com/new e cria um repositório chamado 'orchestra-app'"
Write-Host "  2. Copia o URL do repositório (ex: https://github.com/SEU_USER/orchestra-app.git)"
Write-Host "  3. Corre os comandos abaixo (substitui <URL> pelo teu URL):"
Write-Host ""
Write-Host '     git remote add origin <URL>' -ForegroundColor White
Write-Host '     git branch -M main' -ForegroundColor White
Write-Host '     git push -u origin main' -ForegroundColor White

# 4. Instruções para Netlify
Write-Host "`n[3/4] Próximos passos — Netlify:" -ForegroundColor Cyan
Write-Host "  1. Vai a https://app.netlify.com → 'Add new site' → 'Import an existing project'"
Write-Host "  2. Conecta ao GitHub e seleciona o repositório 'orchestra-app'"
Write-Host "  3. Configurações de build (já preenchidas automaticamente pelo netlify.toml):"
Write-Host "     Build command:  npm run build" -ForegroundColor White
Write-Host "     Publish dir:    dist" -ForegroundColor White
Write-Host "  4. Em 'Environment variables', adiciona:"
Write-Host "     VITE_GOOGLE_CLIENT_ID = <o-teu-client-id>" -ForegroundColor White
Write-Host "     VITE_GOOGLE_API_KEY   = <a-tua-api-key>" -ForegroundColor White

# 5. Google OAuth
Write-Host "`n[4/4] Atualizar Google OAuth (IMPORTANTE):" -ForegroundColor Cyan
Write-Host "  Após o deploy no Netlify, tens um URL como https://meu-site.netlify.app"
Write-Host "  Vai a: console.cloud.google.com → APIs & Services → Credentials → OAuth Client ID"
Write-Host "  Adiciona nas 'Authorized JavaScript origins':"
Write-Host "     https://meu-site.netlify.app" -ForegroundColor White
Write-Host "  (substitui pelo teu URL Netlify real)"

Write-Host "`n=== Setup concluído! ===" -ForegroundColor Green
