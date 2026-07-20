"""
Shared media-upload validation constants.

Single source of truth for both upload paths:
  - trip cover photos (direct multipart upload, routers/trips.py)
  - activity media (presigned S3 PUT, routers/activities.py + s3_service.py)
"""

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
