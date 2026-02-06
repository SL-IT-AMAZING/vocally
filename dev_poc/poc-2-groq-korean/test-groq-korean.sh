#!/bin/bash

# PoC-2: Groq 한국어 정확도 테스트
# 이 스크립트는 Groq Whisper API의 한국어 인식 성능을 테스트합니다

set -e

echo "=== PoC-2: Groq 한국어 정확도 테스트 ==="
echo ""

# .env 파일 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env 파일이 없습니다. .env.example을 복사하여 설정하세요."
    exit 1
fi

# 환경변수 확인
if [ -z "$GROQ_API_KEY" ] || [ "$GROQ_API_KEY" = "your-groq-api-key" ]; then
    echo "❌ GROQ_API_KEY가 설정되지 않았습니다."
    exit 1
fi

echo "✅ 환경변수 확인 완료"
echo ""

# Step 1: Groq API 연결 테스트
echo "Step 1: Groq API 연결 테스트..."
MODELS_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "https://api.groq.com/openai/v1/models" \
    -H "Authorization: Bearer $GROQ_API_KEY")

HTTP_CODE=$(echo "$MODELS_RESPONSE" | tail -n1)
BODY=$(echo "$MODELS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Groq API 연결 성공"
    echo ""
    echo "사용 가능한 Whisper 모델:"
    echo "$BODY" | grep -o '"id":"whisper[^"]*"' | sed 's/"id":"//g' | sed 's/"//g' | while read model; do
        echo "   - $model"
    done
else
    echo "❌ Groq API 연결 실패 (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi

# Step 2: 테스트 오디오 파일 확인
echo ""
echo "Step 2: 테스트 오디오 파일 확인..."

if [ -f "test_korean.wav" ]; then
    echo "✅ test_korean.wav 파일 발견"

    # Step 3: 음성 인식 테스트
    echo ""
    echo "Step 3: 한국어 음성 인식 테스트..."
    echo "   모델: whisper-large-v3"
    echo "   언어: ko (한국어)"
    echo ""

    START_TIME=$(date +%s.%N)

    TRANSCRIBE_RESPONSE=$(curl -s \
        "https://api.groq.com/openai/v1/audio/transcriptions" \
        -H "Authorization: Bearer $GROQ_API_KEY" \
        -F "file=@test_korean.wav" \
        -F "model=whisper-large-v3" \
        -F "language=ko" \
        -F "response_format=json")

    END_TIME=$(date +%s.%N)
    ELAPSED=$(echo "$END_TIME - $START_TIME" | bc)

    echo "결과:"
    echo "$TRANSCRIBE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('텍스트:', data.get('text', 'N/A'))" 2>/dev/null || echo "$TRANSCRIBE_RESPONSE"
    echo ""
    echo "⏱️  처리 시간: ${ELAPSED}초"

    if (( $(echo "$ELAPSED < 5" | bc -l) )); then
        echo "✅ 5초 이내 처리 완료"
    else
        echo "⚠️  처리 시간이 5초를 초과했습니다"
    fi
else
    echo "⚠️  test_korean.wav 파일이 없습니다."
    echo ""
    echo "테스트를 진행하려면:"
    echo "1. 한국어 음성을 녹음하여 test_korean.wav로 저장"
    echo "2. 또는 TTS로 테스트 문장 생성"
    echo ""
    echo "권장 테스트 문장:"
    echo "- '안녕하세요, 오늘 회의 자료를 검토해 주세요.'"
    echo "- '분기별 매출 보고서와 KPI 달성률을 확인하겠습니다.'"
    echo ""

    # TTS 없이 간단한 API 작동 확인
    echo "API 작동 확인을 위해 빈 요청 테스트..."
fi

echo ""
echo "=== 테스트 완료 ==="
