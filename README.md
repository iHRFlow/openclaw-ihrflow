# openclaw-ihrflow

OpenClaw 原生插件，将 iHRFlow 人才管理平台的核心能力直接集成到 OpenClaw 中，零延迟调用后端 API。

## 架构

```
OpenClaw
  └── openclaw-ihrflow plugin (in-process)
        └── IHRFlowClient (fetch + JWT)
              └── iHRFlow Backend REST API (https://ihrflow.com/api)
```

插件在 OpenClaw 进程内运行，直接通过 HTTP 调用 iHRFlow 后端，无需中间 MCP Server。

## 安装

### 开发模式（推荐）

```bash
openclaw plugins install -l ./openclaw-plugin
```

### 手动安装

```bash
openclaw plugins install -l /path/to/hireflow/openclaw-plugin
```

## 配置

在 OpenClaw 的 Settings Raw 中添加以下配置：

```json
{
  "plugins": {
    "entries": {
      "openclaw-ihrflow": {
        "enabled": true,
        "config": {
          "apiUrl": "https://ihrflow.com/api",
          "username": "your-username",
          "password": "your-password",
          "tenantId": "your-tenant"
        }
      }
    },
    "allow": ["openclaw-ihrflow"]
  }
}
```

> **注意**：如果已有其他 `plugins` 配置，请合并 `entries` 和 `allow` 内容，不要覆盖。

配置完成后重启 OpenClaw：

```bash
openclaw gateway restart
```

## 可用工具（19 个）

### 候选人管理

| 工具名 | 说明 | 类型 |
|--------|------|------|
| `ihrflow_search_candidates` | 搜索候选人简历（关键词） | 只读 |
| `ihrflow_get_resume_detail` | 获取简历详情 | 只读 |
| `ihrflow_add_resume_note` | 为简历添加备注 | 写入 |
| `ihrflow_recommend_candidate_for_position` | 推荐候选人到岗位 | 写入 |
| `ihrflow_search_talent` | 人才语义搜索（AI 向量匹配） | 只读 |

### 岗位管理

| 工具名 | 说明 | 类型 |
|--------|------|------|
| `ihrflow_list_positions` | 列出招聘岗位 | 只读 |
| `ihrflow_get_position_detail` | 获取岗位详情 | 只读 |
| `ihrflow_get_position_candidates` | 获取岗位下的候选人列表 | 只读 |
| `ihrflow_update_position_status` | 更新岗位状态 | 写入 |
| `ihrflow_create_recruitment_need` | 创建招聘需求（新岗位） | 写入 |

### 面试管理

| 工具名 | 说明 | 类型 |
|--------|------|------|
| `ihrflow_list_interviews` | 列出面试安排 | 只读 |
| `ihrflow_get_interview_detail` | 获取面试详情 | 只读 |
| `ihrflow_get_today_schedule` | 获取今日日程 | 只读 |
| `ihrflow_create_interview` | 创建面试安排 | 写入 |
| `ihrflow_cancel_interview` | 取消面试 | 写入 |
| `ihrflow_reschedule_interview` | 重新安排面试 | 写入 |

### 流程与评价

| 工具名 | 说明 | 类型 |
|--------|------|------|
| `ihrflow_update_screening_status` | 推进候选人筛选流程 | 写入 |
| `ihrflow_submit_interview_feedback` | 提交面试反馈评价 | 写入 |
| `ihrflow_get_recruitment_statistics` | 获取招聘整体统计 | 只读 |

## 与 MCP Server / Skill 方案的对比

| | 原生插件 (Plugin) | MCP Server (直连) | Skill (MCP Client) |
|---|---|---|---|
| **延迟** | 最低（进程内） | 中等（HTTP → MCP） | 中等（curl → MCP） |
| **部署** | 插件安装即用 | Docker 运行 MCP Server | 安装 Skill + 脚本 |
| **通用性** | 仅 OpenClaw | 任何 MCP 客户端 | OpenClaw |
| **认证** | 插件配置中填写 | 支持多用户动态登录 | Skill 环境变量 |
| **适用场景** | 低延迟、个人使用 | 多客户端、多用户共享 | 无 Docker、纯 Skill |

## 开发

插件使用 TypeScript 编写，OpenClaw 通过 `jiti` 直接加载 `.ts` 文件，无需构建步骤。

```
openclaw-plugin/
  package.json              # 插件元数据和依赖
  openclaw.plugin.json      # OpenClaw 插件清单
  tsconfig.json             # TypeScript 配置
  src/
    index.ts                # 入口：注册所有工具
    client.ts               # IHRFlowClient: HTTP + JWT 认证
    tools/
      candidates.ts         # search_candidates, get_resume_detail, add_resume_note, recommend_candidate
      positions.ts          # list_positions, get_position_detail, get_position_candidates, update_position_status
      statistics.ts         # get_recruitment_statistics
      schedule.ts           # get_today_schedule, list_interviews, get_interview_detail
      recruitment.ts        # create_recruitment_need, search_talent
      interviews_write.ts   # create_interview, cancel_interview, reschedule_interview
      pipeline.ts           # update_screening_status
      evaluations.ts        # submit_interview_feedback
```

修改代码后重启 OpenClaw 即可生效：

```bash
openclaw gateway restart
```
