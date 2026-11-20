// 서버 주소: .env 에 VITE_API_URL 을 적으면 바뀌고, 없으면 로컬 서버를 쓴다
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// 서버가 돌려준 오류(상태 코드 + 메시지)
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string | null
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // 서버가 꺼져 있거나 네트워크가 끊긴 경우
    throw new ApiError(0, '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요')
  }

  if (!response.ok) {
    let message = '문제가 생겼어요. 잠시 후 다시 시도해 주세요'
    try {
      const data = await response.json()
      // FastAPI 는 detail 에 문자열(직접 만든 오류) 또는 배열(입력값 검증 오류)을 담는다
      if (typeof data.detail === 'string') message = data.detail
      else if (Array.isArray(data.detail)) message = '입력값을 확인해 주세요'
    } catch {
      // JSON 이 아니면 기본 메시지 사용
    }
    throw new ApiError(response.status, message)
  }

  return (await response.json()) as T
}
