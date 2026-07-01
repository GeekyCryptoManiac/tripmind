from typing import Any
import boto3
import os

SSM_PREFIX = "/tripmind/prod/"
SSM_REGION = "ap-southeast-1"

def load_ssm_parameters() -> None:
    """
    Fetch all parameters under /tripmind/prod/ from SSM
    and inject them into os.environ so pydantic-settings
    can read them at Settings() instantiation time.

    Only sets a key if it is not already present in os.environ
    — this allows local .env overrides to take precedence,
    and means the function is safe to call in all environments.

    Fails silently if SSM is unreachable (e.g. local dev
    without AWS credentials) — the app will fall back to
    .env values.
    """
    try:
        client = boto3.client('ssm', region_name=SSM_REGION)
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
