# 百变书屋 API 文档

## 概述

本文档详细说明了百变书屋项目的RESTful API接口。所有API请求的基础URL为：`http://localhost:3001/api`。

## 认证要求

除了特别标注的公开接口外，所有API请求都需要进行身份验证。认证使用JWT令牌，通过以下方式传递：

```
Authorization: Bearer <your_token>
```

## 通用响应格式

所有API响应都遵循以下格式：

### 成功响应

```json
{
  "success": true,
  "data": { /* 响应数据对象 */ },
  "message": "操作成功"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## 状态码

API使用以下HTTP状态码：

- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未授权，需要认证
- `403 Forbidden` - 权限不足
- `404 Not Found` - 资源不存在
- `422 Unprocessable Entity` - 验证错误
- `500 Internal Server Error` - 服务器内部错误

## API端点

### 认证 API

#### 用户注册

```
POST /auth/register
```

注册新用户账号。

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名，3-20个字符 |
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码，至少6个字符 |

**请求示例**

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "createdAt": "2023-05-10T08:30:00Z"
    }
  },
  "message": "注册成功"
}
```

#### 用户登录

```
POST /auth/login
```

用户登录获取认证令牌。

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码 |

**请求示例**

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "expiresIn": 86400
  },
  "message": "登录成功"
}
```

#### 忘记密码

```
POST /auth/forgot-password
```

发送密码重置验证码到用户邮箱。

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| email | string | 是 | 用户邮箱地址 |

**请求示例**

```json
{
  "email": "test@example.com"
}
```

**响应示例**

```json
{
  "success": true,
  "message": "验证码已发送到您的邮箱"
}
```

#### 验证重置码

```
POST /auth/verify-reset-code
```

验证密码重置验证码是否有效。

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| email | string | 是 | 用户邮箱地址 |
| code | string | 是 | 收到的验证码 |

**请求示例**

```json
{
  "email": "test@example.com",
  "code": "123456"
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "valid": true
  },
  "message": "验证码有效"
}
```

#### 重置密码

```
POST /auth/reset-password
```

使用验证码重置密码。

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| email | string | 是 | 用户邮箱地址 |
| code | string | 是 | 验证码 |
| newPassword | string | 是 | 新密码 |

**请求示例**

```json
{
  "email": "test@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

**响应示例**

```json
{
  "success": true,
  "message": "密码重置成功"
}
```

### 用户 API

#### 获取当前用户信息

```
GET /users/me
```

获取当前登录用户的详细信息。

**请求头**

```
Authorization: Bearer <your_token>
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "avatar": null,
      "bio": null,
      "createdAt": "2023-05-10T08:30:00Z",
      "preferences": {
        "emailNotifications": true,
        "theme": "light"
      }
    }
  }
}
```

#### 更新用户信息

```
PUT /users/me
```

更新当前用户的个人信息。

**请求头**

```
Authorization: Bearer <your_token>
```

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 否 | 新的用户名 |
| avatar | string | 否 | 头像URL |
| bio | string | 否 | 个人简介 |
| preferences | object | 否 | 用户偏好设置 |

**请求示例**

```json
{
  "bio": "热爱阅读的图书爱好者",
  "preferences": {
    "emailNotifications": false,
    "theme": "dark"
  }
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "avatar": null,
      "bio": "热爱阅读的图书爱好者",
      "preferences": {
        "emailNotifications": false,
        "theme": "dark"
      }
    }
  },
  "message": "用户信息更新成功"
}
```

#### 修改密码

```
POST /users/change-password
```

更改当前用户的密码。

**请求头**

```
Authorization: Bearer <your_token>
```

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| currentPassword | string | 是 | 当前密码 |
| newPassword | string | 是 | 新密码 |

**请求示例**

```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

**响应示例**

```json
{
  "success": true,
  "message": "密码修改成功"
}
```

### 书籍 API

#### 获取书籍列表

```
GET /books
```

获取书籍列表，支持分页、筛选和排序。

**查询参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| page | number | 否 | 页码，默认为1 |
| limit | number | 否 | 每页数量，默认为20，最大100 |
| category | string | 否 | 按分类筛选 |
| sort | string | 否 | 排序字段，可选值：title, author, publishDate, rating |
| order | string | 否 | 排序方向，可选值：asc, desc |

**响应示例**

```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": 1,
        "title": "活着",
        "author": "余华",
        "cover": "https://example.com/covers/1.jpg",
        "description": "《活着》是中国作家余华的代表作...",
        "category": "文学小说",
        "rating": 4.8,
        "publishDate": "1993-05-01"
      },
      // 更多书籍...
    ],
    "pagination": {
      "total": 120,
      "page": 1,
      "limit": 20,
      "pages": 6
    }
  }
}
```

#### 获取书籍详情

```
GET /books/:bookId
```

获取指定书籍的详细信息。

**路径参数**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| bookId | number | 书籍ID |

**响应示例**

```json
{
  "success": true,
  "data": {
    "book": {
      "id": 1,
      "title": "活着",
      "author": "余华",
      "cover": "https://example.com/covers/1.jpg",
      "description": "《活着》是中国作家余华的代表作...",
      "category": "文学小说",
      "rating": 4.8,
      "publishDate": "1993-05-01",
      "pages": 226,
      "publisher": "作家出版社",
      "isbn": "9787506365437",
      "language": "中文",
      "content": "/books/1/content.epub",
      "tags": ["经典", "中国文学", "当代文学"]
    }
  }
}
```

#### 搜索书籍

```
GET /books/search
```

根据关键词搜索书籍。

**查询参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| q | string | 是 | 搜索关键词 |
| page | number | 否 | 页码，默认为1 |
| limit | number | 否 | 每页数量，默认为20 |

**响应示例**

```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": 1,
        "title": "活着",
        "author": "余华",
        "cover": "https://example.com/covers/1.jpg",
        "description": "《活着》是中国作家余华的代表作...",
        "category": "文学小说",
        "rating": 4.8
      },
      // 更多匹配的书籍...
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

#### 获取图书推荐

```
POST /books/recommendations
```

基于用户偏好获取个性化图书推荐。

**请求头**

```
Authorization: Bearer <your_token>
```

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| preferences | object | 否 | 额外的偏好设置 |
| limit | number | 否 | 返回的推荐数量，默认为10 |

**请求示例**

```json
{
  "preferences": {
    "categories": ["科幻", "悬疑"],
    "excludeRead": true
  },
  "limit": 5
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": 42,
        "title": "三体",
        "author": "刘慈欣",
        "cover": "https://example.com/covers/42.jpg",
        "description": "地球文明向宇宙发出信息...",
        "category": "科幻",
        "rating": 4.9,
        "reason": "根据您对科幻类书籍的兴趣推荐"
      },
      // 更多推荐...
    ]
  }
}
```

### 书架 API

#### 获取用户书架

```
GET /users/bookshelf
```

获取当前用户的书架内容。

**请求头**

```
Authorization: Bearer <your_token>
```

**查询参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| status | string | 否 | 筛选阅读状态，可选值：reading, completed, toRead |
| sort | string | 否 | 排序字段，可选值：title, author, addedAt, progress |
| order | string | 否 | 排序方向，可选值：asc, desc，默认为desc |

**响应示例**

```json
{
  "success": true,
  "data": {
    "bookshelf": [
      {
        "id": 1,
        "bookId": 42,
        "title": "三体",
        "author": "刘慈欣",
        "cover_image": "https://example.com/covers/42.jpg",
        "status": "reading",
        "progress": 35,
        "rating": null,
        "addedAt": "2023-05-01T10:30:00Z",
        "lastReadAt": "2023-05-05T18:45:00Z"
      },
      // 更多书架项目...
    ]
  }
}
```

#### 添加书籍到书架

```
POST /books/:bookId/bookshelf
```

将书籍添加到用户的书架。

**请求头**

```
Authorization: Bearer <your_token>
```

**路径参数**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| bookId | number | 要添加的书籍ID |

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| status | string | 否 | 阅读状态，可选值：reading, completed, toRead，默认为toRead |

**请求示例**

```json
{
  "status": "reading"
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "shelfItem": {
      "id": 1,
      "bookId": 42,
      "status": "reading",
      "progress": 0,
      "addedAt": "2023-05-10T15:30:00Z"
    }
  },
  "message": "书籍已添加到书架"
}
```

#### 从书架移除书籍

```
DELETE /books/:bookId/bookshelf
```

从用户的书架中移除指定书籍。

**请求头**

```
Authorization: Bearer <your_token>
```

**路径参数**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| bookId | number | 要移除的书籍ID |

**响应示例**

```json
{
  "success": true,
  "message": "书籍已从书架移除"
}
```

#### 更新阅读进度

```
PUT /books/:bookId/reading-progress
```

更新书架中书籍的阅读进度。

**请求头**

```
Authorization: Bearer <your_token>
```

**路径参数**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| bookId | number | 书籍ID |

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| progress | number | 是 | 阅读进度，0-100之间的整数 |
| currentPage | number | 否 | 当前阅读页码 |
| readingTime | number | 否 | 本次阅读时长(秒) |

**请求示例**

```json
{
  "progress": 45,
  "currentPage": 102,
  "readingTime": 1800
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "progress": 45,
    "currentPage": 102,
    "lastReadAt": "2023-05-10T16:45:00Z",
    "totalReadingTime": 5400
  },
  "message": "阅读进度已更新"
}
```

### 社区 API

#### 获取书籍评论

```
GET /books/:bookId/comments
```

获取指定书籍的评论列表。

**路径参数**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| bookId | number | 书籍ID |

**查询参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| page | number | 否 | 页码，默认为1 |
| limit | number | 否 | 每页数量，默认为20 |
| sort | string | 否 | 排序方式，可选值：latest, popular，默认为latest |

**响应示例**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "userId": 2,
        "username": "bookfan",
        "avatar": "https://example.com/avatars/user2.jpg",
        "content": "这本书改变了我的世界观，强烈推荐！",
        "rating": 5,
        "likes": 24,
        "createdAt": "2023-04-15T10:20:00Z",
        "replies": [
          {
            "id": 5,
            "userId": 3,
            "username": "readinglover",
            "content": "完全同意，这本书确实很棒！",
            "createdAt": "2023-04-15T11:05:00Z"
          }
        ]
      },
      // 更多评论...
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

#### 添加书籍评论

```
POST /books/:bookId/comments
```

为指定书籍添加评论。

**请求头**

```
Authorization: Bearer <your_token>
```

**路径参数**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| bookId | number | 书籍ID |

**请求参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| content | string | 是 | 评论内容 |
| rating | number | 否 | 评分，1-5之间的整数 |
| parentId | number | 否 | 如果是回复，父评论ID |

**请求示例**

```json
{
  "content": "这是一本很棒的书，情节扣人心弦！",
  "rating": 5
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "comment": {
      "id": 43,
      "bookId": 1,
      "userId": 1,
      "content": "这是一本很棒的书，情节扣人心弦！",
      "rating": 5,
      "createdAt": "2023-05-10T17:30:00Z"
    }
  },
  "message": "评论发布成功"
}
```

#### 点赞评论

```
POST /comments/:commentId/like
```

对评论点赞或取消点赞。

**请求头**

```
Authorization: Bearer <your_token>
```

**路径参数**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| commentId | number | 评论ID |

**响应示例**

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 25
  },
  "message": "点赞成功"
}
```

### 阅读统计 API

#### 获取阅读统计数据

```
GET /stats/reading
```

获取用户的阅读统计数据。

**请求头**

```
Authorization: Bearer <your_token>
```

**查询参数**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| period | string | 否 | 时间段，可选值：week, month, year, all，默认为month |

**响应示例**

```json
{
  "success": true,
  "data": {
    "totalBooks": 15,
    "completedBooks": 8,
    "inProgressBooks": 3,
    "totalPages": 3240,
    "totalReadingTime": 432000,
    "dailyAverage": 45,
    "timeDistribution": {
      "morning": 35,
      "afternoon": 25,
      "evening": 40
    },
    "categoryDistribution": {
      "科幻": 30,
      "文学": 25,
      "历史": 20,
      "心理学": 15,
      "其他": 10
    },
    "readingStreak": {
      "current": 7,
      "longest": 14
    }
  }
}
```

## 错误代码

| 错误代码 | 描述 |
|----------|------|
| AUTH_REQUIRED | 需要认证 |
| INVALID_CREDENTIALS | 无效的凭据 |
| EMAIL_ALREADY_EXISTS | 邮箱已被注册 |
| USERNAME_ALREADY_EXISTS | 用户名已被使用 |
| INVALID_TOKEN | 无效的令牌 |
| TOKEN_EXPIRED | 令牌已过期 |
| PERMISSION_DENIED | 权限不足 |
| RESOURCE_NOT_FOUND | 资源不存在 |
| VALIDATION_ERROR | 验证错误 |
| INTERNAL_ERROR | 服务器内部错误 |

## 限流策略

为了保护API不被滥用，我们实施了以下限流策略：

- 认证API: 每IP每分钟10次请求
- 普通API: 每用户每分钟50次请求
- 特殊API（如搜索、推荐）: 每用户每分钟20次请求

超过限制将返回429状态码。

## 版本信息

- 当前API版本: v1
- 最后更新时间: 2023年5月10日
- 下一版本计划: v2（预计2023年8月发布）

---

如有任何问题或需要进一步的API支持，请联系开发团队。 