# PoC-4: Supabase Edge Function → Groq API

## 검증 목표
Supabase Edge Function에서 Groq Whisper API 호출 가능 여부

## 가설
Supabase Edge Function(Deno)에서 외부 API(Groq)를 호출하고 응답을 반환할 수 있다

## 성공 기준
- [x] Supabase CLI 설치 및 프로젝트 링크 ✅
- [x] Edge Function 생성 및 배포 성공 ✅
- [x] Edge Function에서 Groq API 호출 성공 ✅
- [x] 한국어 오디오 base64 → Groq → 텍스트 반환 확인 ✅

## 테스트 결과

**상태**: ✅ 검증 완료 (2026-01-27)

### 테스트 결과

| 단계 | 결과 | 상세 |
|------|------|------|
| Supabase CLI 설치 | ✅ | brew install supabase/tap/supabase (v2.72.7) |
| 프로젝트 링크 | ✅ | supabase link --project-ref szfferwyetqzqlotoktf |
| Edge Function 생성 | ✅ | supabase functions new transcribe |
| GROQ_API_KEY 시크릿 설정 | ✅ | supabase secrets set |
| Edge Function 배포 | ✅ | supabase functions deploy transcribe --no-verify-jwt |
| Groq API 호출 | ✅ | base64 → Blob → FormData → Groq Whisper API |
| 한국어 인식 | ✅ | 입력과 동일 (100% 정확도) |
| 처리 시간 | ✅ | 367ms (Edge Function + Groq 합산) |

### 테스트 입출력

```
입력: "안녕하세요. 오늘 회의에서 논의할 주요 안건은 신제품 출시 일정과 마케팅 전략입니다."
출력: " 안녕하세요. 오늘 회의에서 논의할 주요 안건은 신제품 출시 일정과 마케팅 전략입니다."
정확도: 100%
처리시간: 367ms
```

## 결론

**✅ Supabase Edge Function에서 Groq API 호출이 정상 작동함을 확인**

- Deno 런타임에서 `fetch` + `FormData`로 외부 API 호출 가능
- base64 → Blob → FormData 변환이 Deno에서 정상 작동
- 한국어 음성인식 100% 정확도
- 처리 시간 367ms (사용자 체감 즉시)

## 핵심 발견

1. **Deno에서 FormData 지원**: `new FormData()`, `new Blob()` 모두 사용 가능
2. **외부 API 호출 제한 없음**: Groq API 호출에 제한 없음
3. **JWT 검증 비활성화 가능**: `--no-verify-jwt` 플래그로 공개 엔드포인트 생성 가능 (프로덕션에서는 JWT 검증 활성화 필요)
4. **콜드 스타트 영향 미미**: 첫 호출도 367ms로 충분히 빠름

## 다음 단계

1. Week 2 백엔드 개발 시작
2. generate-text Edge Function 추가 (후처리/톤 적용)
3. JWT 인증 추가 (프로덕션용)
