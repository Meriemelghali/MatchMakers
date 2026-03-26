$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

if (-not (Test-Path ".\\.venv")) {
  python -m venv .venv
}

.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8001

