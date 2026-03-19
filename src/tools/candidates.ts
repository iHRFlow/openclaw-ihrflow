import { Type } from "@sinclair/typebox";
import type { IHRFlowClient } from "../client";

function extractResumes(data: any): any[] {
  return (data.ranked_resumes ?? []).map((r: any) => ({
    id: r.resume_id ?? "",
    name: r.name ?? "",
    match_score: r.match_score,
    skills: r.skills ?? [],
    location: r.location ?? "",
    experience: r.experience ?? 0,
    match_type: r.match_type ?? "",
    match_label: r.match_label ?? "",
    is_exact_match: r.is_exact_match ?? false,
  }));
}

export function registerCandidateTools(api: any, client: IHRFlowClient) {
  api.registerTool({
    name: "ihrflow_search_candidates",
    description:
      "搜索候选人简历。支持按姓名、技能、学历、工作经历等关键词搜索。底层使用人才助手语义搜索引擎，支持技能匹配、同义词扩展等智能搜索。",
    parameters: Type.Object({
      keyword: Type.String({ description: "搜索关键词，如 'Java 3年经验'、'张三'、'北京大学'" }),
      page: Type.Optional(Type.Number({ description: "页码，默认1", default: 1 })),
      page_size: Type.Optional(Type.Number({ description: "每页数量，默认10，最大100", default: 10 })),
    }),
    async execute(_id: string, params: { keyword: string; page?: number; page_size?: number }) {
      const data = await client.post("/talent-assistant/chat", {
        message: params.keyword,
        filter_talent_pool: false,
      });
      const all = extractResumes(data);
      const page = params.page ?? 1;
      const size = Math.min(Math.max(params.page_size ?? 10, 1), 100);
      const start = (page - 1) * size;
      const candidates = all.slice(start, start + size);

      return {
        content: [
          { type: "text", text: JSON.stringify({ total: all.length, page, candidates }) },
        ],
      };
    },
  });

  api.registerTool({
    name: "ihrflow_get_resume_detail",
    description:
      "获取候选人简历详情，包括教育经历、工作经历、技能标签等完整信息。",
    parameters: Type.Object({
      resume_id: Type.String({ description: "简历ID" }),
    }),
    async execute(_id: string, params: { resume_id: string }) {
      const data = await client.get(`/resumes/${params.resume_id}`);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });

  api.registerTool({
    name: "ihrflow_add_resume_note",
    description:
      "为候选人简历添加备注。用于记录沟通情况、评价、注意事项等。",
    parameters: Type.Object({
      resume_id: Type.String({ description: "简历ID" }),
      content: Type.String({ description: "备注内容，最多2000字" }),
    }),
    async execute(_id: string, params: { resume_id: string; content: string }) {
      if (!params.content?.trim()) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "备注内容不能为空" }) }] };
      }
      const data = await client.post(`/resumes/${params.resume_id}/notes`, {
        content: params.content.trim().slice(0, 2000),
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });

  api.registerTool({
    name: "ihrflow_recommend_candidate_for_position",
    description:
      "将候选人推荐到指定岗位。",
    parameters: Type.Object({
      resume_id: Type.String({ description: "候选人简历ID" }),
      position_id: Type.String({ description: "目标岗位ID" }),
      reason: Type.Optional(Type.String({ description: "推荐理由（可选）" })),
    }),
    async execute(_id: string, params: { resume_id: string; position_id: string; reason?: string }) {
      const payload: Record<string, any> = { position_id: params.position_id };
      if (params.reason) payload.reason = params.reason.slice(0, 1000);
      const data = await client.post(`/resumes/${params.resume_id}/recommend-position`, payload);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });
}
