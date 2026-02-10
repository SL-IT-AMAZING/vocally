# PoC-3: Firebase → Supabase 마이그레이션 범위 ✅ 검증완료

## 검증 목표

Vocally 코드에서 Firebase 의존성 파악

## 가설

Firebase 교체가 2주 내 가능하다

## 성공 기준

- [x] Firebase import 위치 전체 파악
- [x] 변경 필요 파일 수 < 20개 ✅ (15개)
- [x] 핵심 로직 변경 없이 교체 가능 ✅ (Repository 패턴 사용)

## 검증 결과: ✅ 성공

### Firebase Auth 직접 사용 (4개 파일)

```
apps/desktop/src/repos/auth.repo.ts      # 핵심 - CloudAuthRepo 클래스
apps/desktop/src/utils/auth.utils.ts     # getEffectiveAuth() 유틸
apps/desktop/src/types/auth.types.ts     # 타입 정의
apps/desktop/src/main.tsx                # Firebase 초기화
```

### Cloud Functions 호출 - invokeHandler (11개 파일)

```
apps/desktop/src/repos/user.repo.ts
apps/desktop/src/repos/term.repo.ts
apps/desktop/src/repos/transcribe-audio.repo.ts
apps/desktop/src/repos/generate-text.repo.ts
apps/desktop/src/repos/index.ts
apps/desktop/src/utils/price.utils.ts
apps/desktop/src/components/settings/SettingsPage.tsx
apps/desktop/src/components/root/AppSideEffects.tsx
apps/desktop/src/components/payment/PaymentDialog.tsx
apps/desktop/src/actions/member.actions.ts
apps/desktop/src/actions/login.actions.ts
```

## 결론

**✅ 마이그레이션 가능**

- 총 15개 파일 수정 필요
- Repository 패턴으로 추상화되어 있어 `CloudAuthRepo`만 `SupabaseAuthRepo`로 교체하면 됨
- `invokeHandler`를 Supabase Edge Function 호출로 교체 필요
- 예상 작업량: 3-5일 (Auth), 2-3일 (Cloud Functions)

## 검증 명령어

```bash
# Firebase 의존성 검색
grep -r "firebase" apps/desktop/src/ --include="*.ts" --include="*.tsx" | wc -l
# 결과: 4개 파일

# Cloud Functions 호출 검색
grep -r "invokeHandler" apps/desktop/src/ --include="*.ts" --include="*.tsx"
# 결과: 11개 파일
```

## 다음 단계

1. PoC-1 (Supabase OAuth) 검증 후 진행
2. `SupabaseAuthRepo` 클래스 구현
3. `invokeSupabaseFunction` 유틸 구현
4. 11개 파일에서 import 교체
