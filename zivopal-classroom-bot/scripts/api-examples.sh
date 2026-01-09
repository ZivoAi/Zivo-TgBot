#!/bin/bash

# Sample cURL requests for testing the API

echo "=== ZivoPal Classroom Bot API - cURL Examples ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-your-jwt-token}"
CLASS_ID="${CLASS_ID:-class-123}"
STUDENT_ID="${STUDENT_ID:-student-456}"

echo -e "${GREEN}Base URL: $BASE_URL${NC}"
echo -e "${GREEN}Auth Token: ${AUTH_TOKEN:0:20}...${NC}"
echo ""

# 1. Health Check
echo -e "${GREEN}1. Health Check${NC}"
curl -s -X GET "$BASE_URL/health" | jq . || echo "Failed to connect"
echo ""

# 2. Readiness Check
echo -e "${GREEN}2. Readiness Check${NC}"
curl -s -X GET "$BASE_URL/readiness" | jq . || echo "Failed to connect"
echo ""

# 3. Get Class Engagement Report
echo -e "${GREEN}3. Get Class Engagement Report${NC}"
curl -s -X GET "$BASE_URL/api/v1/teachers/classes/$CLASS_ID/report" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq .
echo ""

# 4. Get Student Metrics
echo -e "${GREEN}4. Get Student Metrics${NC}"
curl -s -X GET "$BASE_URL/api/v1/teachers/classes/$CLASS_ID/students/$STUDENT_ID/metrics" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq .
echo ""

# 5. Mute Student
echo -e "${GREEN}5. Mute Student (POST)${NC}"
curl -s -X POST "$BASE_URL/api/v1/teachers/classes/$CLASS_ID/students/$STUDENT_ID/mute" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 3600000,
    "reason": "Repeated violations"
  }' | jq .
echo ""

# 6. Search Curriculum - ZIMSEC
echo -e "${GREEN}6. Search Curriculum (ZIMSEC)${NC}"
curl -s -X GET "$BASE_URL/api/v1/curriculum/zimsec/search?keyword=Shakespeare" \
  -H "Content-Type: application/json" | jq .
echo ""

# 7. Search Curriculum - Cambridge
echo -e "${GREEN}7. Search Curriculum (Cambridge)${NC}"
curl -s -X GET "$BASE_URL/api/v1/curriculum/cambridge/search?keyword=math" \
  -H "Content-Type: application/json" | jq .
echo ""

# 8. OpenAPI Docs
echo -e "${GREEN}8. OpenAPI/Swagger Documentation${NC}"
curl -s -X GET "$BASE_URL/api/docs" | jq . | head -20
echo ""

echo -e "${GREEN}=== Examples Complete ===${NC}"
