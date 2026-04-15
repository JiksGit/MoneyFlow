# GitHub Actions Self-hosted Runner 설치 스크립트 (Windows)
# 사용법: .\scripts\setup-runner.ps1 -Token <RUNNER_TOKEN> -Repo <owner/repo>
#
# RUNNER_TOKEN 발급: GitHub repo → Settings → Actions → Runners → New self-hosted runner

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,

    [Parameter(Mandatory=$true)]
    [string]$Repo   # 예: hyunjik/MoneyFlow
)

$RunnerDir = "C:\actions-runner"
$RunnerVersion = "2.316.1"

Write-Host "GitHub Actions Self-hosted Runner 설치 시작..." -ForegroundColor Cyan

# 디렉토리 생성
New-Item -ItemType Directory -Force -Path $RunnerDir | Out-Null
Set-Location $RunnerDir

# Runner 다운로드
$Url = "https://github.com/actions/runner/releases/download/v${RunnerVersion}/actions-runner-win-x64-${RunnerVersion}.zip"
Write-Host "다운로드: $Url"
Invoke-WebRequest -Uri $Url -OutFile "actions-runner.zip"
Expand-Archive -Path "actions-runner.zip" -DestinationPath $RunnerDir -Force
Remove-Item "actions-runner.zip"

# Runner 구성
Write-Host "Runner 구성 중..." -ForegroundColor Cyan
.\config.cmd `
    --url "https://github.com/$Repo" `
    --token $Token `
    --name "moneyflow-local-runner" `
    --labels "self-hosted,windows,moneyflow" `
    --work "_work" `
    --unattended

# Windows 서비스로 등록 (부팅 시 자동 시작)
Write-Host "Windows 서비스 등록 중..." -ForegroundColor Cyan
.\svc.cmd install
.\svc.cmd start

Write-Host ""
Write-Host "✅ Runner 설치 완료!" -ForegroundColor Green
Write-Host "   GitHub repo Settings → Actions → Runners 에서 확인하세요."
Write-Host "   서비스명: actions.runner.$($Repo.Replace('/', '.').ToLower()).moneyflow-local-runner"
