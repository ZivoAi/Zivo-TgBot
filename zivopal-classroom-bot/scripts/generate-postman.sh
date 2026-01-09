#!/bin/bash

# Postman Collection Generator for ZivoPal Classroom Bot API

cat > postman_collection.json << 'EOF'
{
  "info": {
    "_postman_id": "zivopal-classroom-bot",
    "name": "ZivoPal Classroom Bot API",
    "description": "Teacher Dashboard and Management Endpoints",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health",
      "item": [
        {
          "name": "Health Check",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/health",
              "host": ["{{base_url}}"],
              "path": ["health"]
            }
          }
        },
        {
          "name": "Readiness Check",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/readiness",
              "host": ["{{base_url}}"],
              "path": ["readiness"]
            }
          }
        }
      ]
    },
    {
      "name": "Class Reports",
      "item": [
        {
          "name": "Get Class Engagement Report",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{auth_token}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/v1/teachers/classes/{{class_id}}/report",
              "host": ["{{base_url}}"],
              "path": ["api", "v1", "teachers", "classes", "{{class_id}}", "report"]
            },
            "description": "Get weekly class engagement report with leaderboard and struggling students"
          }
        }
      ]
    },
    {
      "name": "Student Management",
      "item": [
        {
          "name": "Get Student Metrics",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{auth_token}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/v1/teachers/classes/{{class_id}}/students/{{student_id}}/metrics",
              "host": ["{{base_url}}"],
              "path": ["api", "v1", "teachers", "classes", "{{class_id}}", "students", "{{student_id}}", "metrics"]
            },
            "description": "Get individual student engagement metrics"
          }
        },
        {
          "name": "Mute Student",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{auth_token}}",
                "type": "text"
              },
              {
                "key": "Content-Type",
                "value": "application/json",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"duration\": 3600000,\n  \"reason\": \"Repeated spam violations\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/v1/teachers/classes/{{class_id}}/students/{{student_id}}/mute",
              "host": ["{{base_url}}"],
              "path": ["api", "v1", "teachers", "classes", "{{class_id}}", "students", "{{student_id}}", "mute"]
            },
            "description": "Mute a student for a specified duration"
          }
        }
      ]
    },
    {
      "name": "Curriculum",
      "item": [
        {
          "name": "Search Curriculum Topics",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/v1/curriculum/{{framework}}/search?keyword={{keyword}}",
              "host": ["{{base_url}}"],
              "path": ["api", "v1", "curriculum", "{{framework}}", "search"],
              "query": [
                {
                  "key": "keyword",
                  "value": "{{keyword}}"
                }
              ]
            },
            "description": "Search curriculum topics. Frameworks: zimsec, cambridge, us_k12"
          }
        }
      ]
    },
    {
      "name": "Documentation",
      "item": [
        {
          "name": "OpenAPI Spec",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/docs",
              "host": ["{{base_url}}"],
              "path": ["api", "docs"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "auth_token",
      "value": "YOUR_JWT_TOKEN_HERE",
      "type": "string"
    },
    {
      "key": "class_id",
      "value": "class-123",
      "type": "string"
    },
    {
      "key": "student_id",
      "value": "student-456",
      "type": "string"
    },
    {
      "key": "framework",
      "value": "zimsec",
      "type": "string"
    },
    {
      "key": "keyword",
      "value": "Shakespeare",
      "type": "string"
    }
  ]
}
EOF

echo "Postman collection generated: postman_collection.json"
echo ""
echo "To import:"
echo "1. Open Postman"
echo "2. Click 'Import' > 'Upload Files'"
echo "3. Select postman_collection.json"
echo "4. Update variables (base_url, auth_token, etc.)"
