import uuid
import boto3
from botocore.config import Config
from app.config import settings

s3_client = boto3.client(
    "s3",
    region_name=settings.aws_s3_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    config=Config(
        signature_version="s3v4",
        s3={"addressing_style": "virtual"}
    ),
)


def generate_upload_url(
    activity_id: int, filename: str, content_type: str, content_length: int
) -> tuple[str, str]:
    """
    Signing ContentLength binds it into X-Amz-SignedHeaders (verified locally —
    SigV4 includes it once passed as a Param), so S3 rejects the PUT outright if
    the actual request's Content-Length header doesn't match this exact value.
    Caller is responsible for capping content_length before calling this.
    """
    s3_key = f"activities/{activity_id}/{uuid.uuid4()}-{filename}"
    url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.aws_s3_bucket,
            "Key": s3_key,
            "ContentType": content_type,
            "ContentLength": content_length,
        },
        ExpiresIn=300,
    )
    return url, s3_key


def generate_download_url(s3_key: str) -> str:
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.aws_s3_bucket, "Key": s3_key},
        ExpiresIn=3600,
    )