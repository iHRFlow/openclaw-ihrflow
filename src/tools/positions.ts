import { Type } from "@sinclair/typebox";
import type { IHRFlowClient } from "../client";

export function registerPositionTools(api: any, client: IHRFlowClient) {
  api.registerTool({
    name: "ihrflow_list_positions",
    description:
      "列出招聘岗位。可按状态筛选。",
    parameters: Type.Object({
      status: Type.Optional(
        Type.String({
          description: "岗位状态: pending(待发布), active(招聘中), paused(暂停), closed(已关闭)。不传返回全部。",
        }),
      ),
      page: Type.Optional(Type.Number({ description: "页码，默认1", default: 1 })),
      page_size: Type.Optional(Type.Number({ description: "每页数量，默认10", default: 10 })),
    }),
    async execute(
      _id: string,
      params: { status?: string; page?: number; page_size?: number },
    ) {
      const qp: Record<string, string | number> = {
        page: params.page ?? 1,
        page_size: Math.min(Math.max(params.page_size ?? 10, 1), 100),
      };
      if (params.status) qp["status"] = params.status;

      const data = await client.get("/positions", qp);
      const items: any[] = data.items ?? data.data ?? [];
      const total: number = data.total ?? items.length;

      const positions = items.map((p: any) => ({
        id: p.id,
        title: p.title ?? "",
        department: p.department ?? "",
        status: p.status ?? "",
        headcount: p.headcount,
        hired_count: p.hired_count ?? 0,
        recruiter_name: p.recruiter_name ?? "",
        location: p.location ?? "",
        salary_range: p.salary_range ?? "",
      }));

      return {
        content: [
          { type: "text", text: JSON.stringify({ total, page: params.page ?? 1, positions }) },
        ],
      };
    },
  });

  api.registerTool({
    name: "ihrflow_get_position_detail",
    description:
      "获取岗位详情，包括职位描述、要求、面试流程等完整信息。",
    parameters: Type.Object({
      position_id: Type.String({ description: "岗位ID" }),
    }),
    async execute(_id: string, params: { position_id: string }) {
      const data = await client.get(`/positions/${params.position_id}`);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });

  api.registerTool({
    name: "ihrflow_get_position_candidates",
    description:
      "获取某个岗位下的候选人列表。可按筛选状态和姓名搜索。",
    parameters: Type.Object({
      position_id: Type.String({ description: "岗位ID" }),
      status: Type.Optional(
        Type.String({
          description: "候选人筛选状态: pending(待筛选), approved(通过), rejected(淘汰), interviewing(面试中)",
        }),
      ),
      search: Type.Optional(Type.String({ description: "候选人姓名或邮箱搜索关键词" })),
      page: Type.Optional(Type.Number({ description: "页码，默认1", default: 1 })),
      page_size: Type.Optional(Type.Number({ description: "每页数量，默认10", default: 10 })),
    }),
    async execute(
      _id: string,
      params: { position_id: string; status?: string; search?: string; page?: number; page_size?: number },
    ) {
      const qp: Record<string, string | number> = {
        page: params.page ?? 1,
        page_size: Math.min(Math.max(params.page_size ?? 10, 1), 100),
      };
      if (params.status) qp["status"] = params.status;
      if (params.search) qp["search"] = params.search.slice(0, 200);

      const data = await client.get(`/positions/${params.position_id}/candidates`, qp);
      const items: any[] = data.items ?? data.data ?? [];
      const total: number = data.total ?? items.length;

      const candidates = items.map((c: any) => ({
        resume_id: c.resume_id ?? c.id,
        name: c.name ?? "",
        screening_status: c.screening_status ?? c.status ?? "",
        applied_at: c.applied_at ?? c.created_at ?? "",
        email: c.email ?? "",
      }));

      return {
        content: [
          { type: "text", text: JSON.stringify({ total, page: params.page ?? 1, candidates }) },
        ],
      };
    },
  });

  api.registerTool({
    name: "ihrflow_update_position_status",
    description:
      "更新岗位状态（发布/暂停/关闭）。",
    parameters: Type.Object({
      position_id: Type.String({ description: "岗位ID" }),
      status: Type.String({
        description: "目标状态: active(发布招聘), paused(暂停招聘), closed(关闭岗位)",
      }),
    }),
    async execute(_id: string, params: { position_id: string; status: string }) {
      const valid = new Set(["active", "paused", "closed"]);
      if (!valid.has(params.status)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `无效的目标状态，可选: ${[...valid].sort().join(", ")}` }) }],
        };
      }
      const data = await client.patch(`/positions/${params.position_id}/status`, { status: params.status });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });
}
