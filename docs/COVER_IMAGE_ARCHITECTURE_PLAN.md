# 书籍封面获取改造方案

## 一、目标

当前平台首页和推荐链路中的书籍封面主要依赖外部直链，尤其是豆瓣封面源。现有方案存在以下问题：

- 外部图片链接稳定性差
- 存在防盗链、热链拦截、失效、403 等问题
- AI 直接生成 `coverUrl` 不可靠，容易出现幻觉链接
- 前端对封面失败的恢复能力有限
- 不同页面对封面处理逻辑分散

本次改造目标是把“封面来源”与“前端展示 URL”彻底解耦，建立统一的封面获取与存储体系。

## 二、设计结论

不建议把豆瓣简单替换成另一个单一外部渠道。

推荐采用：

- 多源采集
- 后端统一解析
- 本地或对象存储缓存
- 前端只使用平台自有封面 URL

即：

外部渠道只是“采集源”，平台自己的封面存储才是“展示源”。

## 三、总体架构

建议新增一个统一服务：

- `CoverResolverService`

并将封面相关逻辑拆为以下几个层级：

1. 查询层

- 根据 `isbn / title / author / publisher` 进行封面查找
- 优先本地查找，再查外部源

2. 来源适配层

- 每个外部源实现独立 adapter
- 统一返回标准结构

3. 校验层

- 验证图片类型、尺寸、内容有效性
- 过滤默认图、无效图、小图、营销图

4. 存储层

- 下载封面到平台本地或对象存储
- 生成稳定的内部 URL

5. 回写层

- 将封面结果写回数据库
- 记录来源、状态、原始 URL、更新时间

## 四、推荐来源分级

### P0：平台自有封面

来源：

- 管理后台人工上传
- 数据导入时附带封面
- 已缓存的封面文件

特点：

- 最稳定
- 优先级最高

### P1：官方合作/开放平台源

候选：

- 当当开放平台
- 京东开放平台
- 出版社/图书合作方接口

特点：

- 合法性和稳定性优于网页抓取
- 适合作为自动采集主源

### P2：公共书目封面源

候选：

- Open Library Covers API
- Google Books API
- Internet Archive 相关书目资源

特点：

- 适合作为兜底补充
- 中文图书覆盖率未必理想

### P3：临时低可信源

候选：

- 历史遗留外链
- 搜索结果页抓取
- 低置信度匹配结果

特点：

- 只做临时兜底
- 不建议直接长期使用

## 五、对京东和当当的建议

### 1. 是否可以考虑京东、当当

可以考虑，但前提是作为“采集源”，而不是直接把它们的商品主图 URL 给前端长期展示。

### 2. 为什么不能直接拿它们的页面图片作为最终方案

- 商品页图片链接可能变化
- 存在热链限制
- 有些图片带营销元素，不是标准封面
- 可能存在授权和合规问题
- 一旦外部链接变更，平台历史数据会批量失效

### 3. 正确使用方式

- 通过官方开放能力获取图书图片或商品主图
- 后端下载并缓存到平台自己的存储
- 前端只访问平台自己的封面地址

### 4. 渠道优先级建议

建议优先尝试：

1. 当当官方开放能力
2. 京东官方开放能力
3. 公共书目兜底源

## 六、数据模型改造建议

建议在 `books` 表新增以下字段：

- `isbn13`
- `isbn10`
- `cover_source`
- `cover_original_url`
- `cover_storage_key`
- `cover_status`
- `cover_last_verified_at`
- `cover_width`
- `cover_height`
- `cover_hash`
- `cover_confidence`

### 字段说明

#### `cover_source`

取值示例：

- `manual`
- `local`
- `dangdang`
- `jd`
- `openlibrary`
- `googlebooks`
- `legacy`

#### `cover_status`

建议值：

- `missing`
- `pending`
- `resolved`
- `failed`
- `manual`

#### `cover_confidence`

用于记录自动匹配置信度，例如：

- 1.00：ISBN 精确命中
- 0.95：标题 + 作者精确命中
- 0.80：标题模糊匹配
- 0.60：人工待确认

## 七、接口与服务设计

### 1. 核心服务

建议新增：

- `server/src/services/cover/CoverResolverService.js`
- `server/src/services/cover/adapters/DangdangCoverAdapter.js`
- `server/src/services/cover/adapters/JDCoverAdapter.js`
- `server/src/services/cover/adapters/OpenLibraryCoverAdapter.js`
- `server/src/services/cover/adapters/GoogleBooksCoverAdapter.js`
- `server/src/services/cover/CoverStorageService.js`
- `server/src/services/cover/CoverValidationService.js`

### 2. Adapter 统一接口

```js
async resolve({ isbn13, isbn10, title, author, publisher }) {
  return {
    found: true,
    source: 'dangdang',
    originalUrl: 'https://...',
    confidence: 0.95,
    matchType: 'isbn',
    metadata: {
      width: 500,
      height: 700
    }
  };
}
```

### 3. CoverResolverService 建议职责

- 先查数据库已有封面
- 再按来源优先级调用 adapter
- 命中后走校验和下载
- 成功后写回数据库
- 返回稳定内部 URL

### 4. 封面 URL 返回规范

前端不要再用外部直链。

统一返回：

- `/covers/{bookId}.jpg`

或者：

- `https://cdn.example.com/book-covers/{storageKey}`

## 八、封面获取流程

推荐流程如下：

1. AI 只负责返回书名、作者、分类、简介，不再返回 `coverUrl`
2. 后端拿到推荐结果后，根据书名和作者做书籍归一化
3. 优先查询本地是否已有封面
4. 如果没有，则调用 `CoverResolverService`
5. 依次走各个 adapter
6. 获取候选图片后进行校验
7. 校验通过后下载到本地或对象存储
8. 写回数据库封面字段
9. 前端读取平台内部封面 URL

## 九、封面校验规则

建议增加统一校验，避免错误封面进入系统。

### 基础校验

- URL 可访问
- HTTP 状态为 200
- MIME 为图片类型
- 文件大小合理
- 图片尺寸不能过小

### 内容校验

- 宽高比符合常见图书封面比例
- 不应是空白图或默认占位图
- 不应是营销海报、活动 Banner
- 不应带明显水印或价格信息

### 命中校验

- 优先 ISBN 精确匹配
- 标题 + 作者一致优先
- 标题模糊匹配时降低置信度
- 低置信度结果进入待审核状态

## 十、存储方案

### 开发阶段

建议先使用本地目录：

- `server/public/covers/`

优点：

- 改造快
- 调试方便

### 生产阶段

建议迁移到对象存储：

- 阿里云 OSS
- AWS S3
- 腾讯云 COS
- MinIO

并建议配合 CDN。

## 十一、前端改造建议

### 1. 前端展示原则

前端只展示平台自己的封面 URL，不再依赖豆瓣、京东、当当等外部 URL。

### 2. 前端降级策略

- 第一优先：平台稳定封面 URL
- 第二优先：本地默认占位图
- 第三优先：显示分类占位卡片

### 3. 前端不再做的事情

- 不再直接对豆瓣图片做特殊兼容
- 不再对外部图源做复杂重试
- 不再依赖 AI 返回 `coverUrl`

## 十二、任务拆分建议

### 第一阶段：基础能力建设

目标：

- 停止 AI 直接返回封面 URL
- 引入统一封面服务
- 接通本地封面存储
- 前端只消费内部封面 URL

产出：

- 新服务目录
- 数据库字段迁移
- 封面内部 URL 规范

### 第二阶段：接入真实采集源

目标：

- 接入至少一个官方开放源
- 加入一个公共兜底源

建议顺序：

1. 当当
2. 京东
3. Open Library / Google Books

### 第三阶段：批量回填

目标：

- 对历史书籍做封面回填
- 对推荐结果做异步封面补全

建议增加：

- `server/src/scripts/backfill-book-covers.js`

### 第四阶段：后台运营支持

目标：

- 允许人工纠错
- 可查看封面来源、状态、更新时间
- 支持重新抓取

## 十三、推荐的接口设计

### 1. 获取书籍详情

返回：

- `coverUrl`: 平台内部稳定地址
- `coverSource`
- `coverStatus`

### 2. 管理端接口

建议增加：

- `POST /api/books/:id/cover/resolve`
- `POST /api/books/:id/cover/upload`
- `POST /api/books/:id/cover/retry`
- `GET /api/books/:id/cover/meta`

### 3. 批量接口

- `POST /api/books/covers/backfill`

## 十四、和当前 AI 推荐链路的关系

当前推荐链路已经开始返回真实 AI 结果。

建议下一步做如下调整：

### 当前状态

- AI 返回书名、作者、分类、简介、封面 URL

### 建议状态

- AI 只返回书名、作者、分类、简介
- 封面交由 `CoverResolverService` 处理

这样可以把“推荐结果质量”和“封面稳定性”分开治理。

## 十五、风险与注意事项

### 1. 合规风险

- 不建议长期直接展示外部电商图片直链
- 优先使用开放平台或明确授权来源

### 2. 错配风险

- 中文书名重复较多
- 没有 ISBN 时容易错图
- 必须有置信度和人工兜底

### 3. 成本风险

- 下载和存储图片会增加存储成本
- 批量补全会增加外部请求成本

### 4. 技术风险

- 图片格式和尺寸差异大
- 某些源响应慢或有限流
- 某些图源会返回非标准内容

## 十六、最终推荐方案

推荐采用以下最终路线：

1. 平台内部建立统一封面服务
2. AI 不再直接决定封面 URL
3. 优先接入一个官方图书源
4. 外部源只负责采集，不负责前端展示
5. 所有封面统一缓存到平台自己的存储
6. 前端始终只使用平台自己的封面地址

## 十七、实施优先级

建议按以下优先级推进：

1. 先完成封面架构改造
2. 再接入一个稳定来源
3. 再做历史数据回填
4. 最后补充人工维护能力

## 十八、建议的下一步

如果准备开始实施，建议下一轮直接做以下内容：

1. 设计数据库迁移字段
2. 设计 `CoverResolverService` 文件结构
3. 去掉 AI 返回 `coverUrl` 的依赖
4. 为首页推荐接入内部封面 URL 机制
5. 先接一个最容易落地的封面源

建议先从：

- 本地稳定封面存储
- 一个 adapter
- 首页推荐链路改造

这三项开始。
