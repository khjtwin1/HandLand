import base64
import binascii

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from server.inference.fingerspelling import predict_fingerspelling

router = APIRouter(prefix="/inference", tags=["inference"])

class FingerspellingRequest(BaseModel):
    image: str
    target: str | None = None   # 학습 중인 글자


@router.post("/fingerspelling")
def fingerspelling(body: FingerspellingRequest):
    data = body.image.split(",", 1)[1] if body.image.startswith("data:") else body.image
    try:
        image_bytes = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="이미지 형식이 올바르지 않아요")

    try:
        return predict_fingerspelling(image_bytes, body.target)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
