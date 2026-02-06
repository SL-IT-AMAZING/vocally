#!/bin/bash

# PoC-1: Supabase OAuth 테스트
# 이 스크립트는 Supabase 연결을 테스트합니다

set -e

echo "=== PoC-1: Supabase OAuth 테스트 ==="
echo ""

# .env 파일 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env 파일이 없습니다. .env.example을 복사하여 설정하세요."
    exit 1
fi

# 환경변수 확인
if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://your-project.supabase.co" ]; then
    echo "❌ SUPABASE_URL이 설정되지 않았습니다."
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ] || [ "$SUPABASE_ANON_KEY" = "your-anon-key" ]; then
    echo "❌ SUPABASE_ANON_KEY가 설정되지 않았습니다."
    exit 1
fi

echo "✅ 환경변수 확인 완료"
echo "   URL: $SUPABASE_URL"
echo ""

# Step 1: Supabase 연결 테스트
echo "Step 1: Supabase 연결 테스트..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "$SUPABASE_URL/rest/v1/" \
    -H "apikey: $SUPABASE_ANON_KEY")

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Supabase 연결 성공 (HTTP $RESPONSE)"
else
    echo "❌ Supabase 연결 실패 (HTTP $RESPONSE)"
    exit 1
fi

# Step 2: Auth 엔드포인트 테스트
echo ""
echo "Step 2: Auth 엔드포인트 테스트..."
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "$SUPABASE_URL/auth/v1/settings" \
    -H "apikey: $SUPABASE_ANON_KEY")

if [ "$AUTH_RESPONSE" = "200" ]; then
    echo "✅ Auth 엔드포인트 접근 성공 (HTTP $AUTH_RESPONSE)"
else
    echo "⚠️  Auth 엔드포인트 접근 실패 (HTTP $AUTH_RESPONSE)"
fi

# Step 3: OAuth 프로바이더 확인
echo ""
echo "Step 3: OAuth 프로바이더 확인..."
PROVIDERS=$(curl -s "$SUPABASE_URL/auth/v1/settings" \
    -H "apikey: $SUPABASE_ANON_KEY" | grep -o '"external_[^"]*":true' || echo "none")

if [ "$PROVIDERS" != "none" ]; then
    echo "✅ 활성화된 프로바이더:"
    echo "$PROVIDERS" | sed 's/"external_//g' | sed 's/":true//g' | while read provider; do
        echo "   - $provider"
    done
else
    echo "⚠️  활성화된 외부 OAuth 프로바이더가 없습니다."
    echo "   Supabase Dashboard → Authentication → Providers에서 설정하세요."
fi

echo ""
echo "=== 테스트 완료 ==="
echo ""
echo "다음 단계:"
echo "1. Supabase Dashboard에서 Google/Kakao OAuth 설정"
echo "2. test-oauth-browser.html을 브라우저에서 열어 실제 로그인 테스트"
