# ECI Tour System AI Backend

Python Azure Functions v1 app for the lightweight guide AI endpoint.

## Folder layout

```txt
ai-backend/
  host.json
  requirements.txt
  local.settings.json
  sample-request.json
  guide_ai/
    __init__.py
    function.json
```

## Local run

From `ECI Tour System/eci-mock-site/ai-backend`:

```bash
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell/Git Bash may differ
pip install -r requirements.txt
func start
```

Endpoint:

```txt
POST http://localhost:7071/api/guide_ai
```

## Required local setting

Set this before testing:

```json
"OPENAI_API_KEY": "your-real-key"
```

## Request body

See `sample-request.json`.
