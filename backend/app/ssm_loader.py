import boto3
import os
from botocore.config import Config
from pathlib import Path

SSM_PREFIX = "/tripmind/prod/"
SSM_REGION = "ap-southeast-1"

def load_ssm_parameters() -> None:
    """
    Prepare os.environ with all config values before pydantic-settings
    instantiates Settings().

    Step 1 — .env pre-load:
      Manually parses backend/.env and sets any key not already in
      os.environ. This runs before pydantic reads .env so that
      LOCAL_DEV (and other .env values) are available immediately.
      Keys already set in os.environ (e.g. by the test conftest or
      the shell) are never overwritten.

    Step 2 — LOCAL_DEV guard:
      If LOCAL_DEV=true is now in os.environ (from .env or the shell),
      the function returns immediately. No SSM call is made, and all
      config comes from .env / the shell environment. Use this in
      local development to prevent SSM from overwriting DATABASE_URL
      with the production RDS endpoint.

    Step 3 — SSM fetch (production only):
      Fetches all parameters under /tripmind/prod/ from AWS SSM
      Parameter Store and injects them into os.environ. Only sets a
      key if it is not already present, so shell-level overrides take
      precedence. Fails silently if SSM is unreachable — the app will
      fall back to whatever is already in os.environ / .env.
    """
    # Manually read .env to get LOCAL_DEV before pydantic loads it
    env_file = Path(__file__).parent.parent / '.env'
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                key = key.strip()
                if key not in os.environ:
                    os.environ[key] = value.strip()

    # Now the LOCAL_DEV check will work
    if os.environ.get('LOCAL_DEV') == 'true':
        return
    try:
        client = boto3.client(
            'ssm',
            region_name=SSM_REGION,
            config=Config(
                connect_timeout=2,
                read_timeout=2,
                retries={'max_attempts': 0}
            )
        )
        paginator = client.get_paginator('get_parameters_by_path')
        for page in paginator.paginate(
            Path=SSM_PREFIX,
            WithDecryption=True
        ):
            for param in page['Parameters']:
                key = param['Name'].replace(SSM_PREFIX, '')
                if key not in os.environ:
                    os.environ[key] = param['Value']
    except Exception:
        pass  # silently fall back to .env / environment vars
