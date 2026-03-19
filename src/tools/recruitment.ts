import { Type } from "@sinclair/typebox";
import type { IHRFlowClient } from "../client";

export function registerRecruitmentTools(api: any, client: IHRFlowClient) {
  api.registerTool({
    name: "ihrflow_create_recruitment_need",
    description: "创建招聘需求（新岗位）。",
    parameters: Type.Object({
      title: Type.String({ description: "岗位名称，如 '高级Java工程师'" }),
      department: Type.String({ description: "所属部门" }),
      headcount: Type.Optional(Type.Number({ description: "招聘人数，默认1", default: 1 })),
      description: Type.Optional(Type.String({ description: "岗位描述" })),
      requirements: Type.Optional(Type.String({ description: "岗位要求" })),
      salary_range: Type.Optional(Type.String({ description: "薪资范围，如 '20k-30k'" })),
      location: Type.Optional(Type.String({ description: "工作地点" })),
    }),
    async execute(
      _id: string,
      params: {
        title: string;
        department: string;
        headcount?: number;
        description?: string;
        requirements?: string;
        salary_range?: string;
        location?: string;
      },
    ) {
      const payload: Record<string, any> = {
        title: params.title,
        department: params.department,
        headcount: params.headcount ?? 1,
      };
      if (params.description) payload.description = params.description;
      if (params.requirements) payload.requirements = params.requirements;
      if (params.salary_range) payload.salary_range = params.salary_range;
      if (params.location) payload.location = params.location;

      const data = await client.post("/positions", payload);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });

  api.registerTool({
    name: "ihrflow_search_talent",
    description:
      "人才语义搜索。使用AI向量匹配（Redis 向量 + Neo4j 标签 + 降级文本匹配），按技能、经历、背景等维度进行智能搜索。",
    parameters: Type.Object({
      query: Type.String({
        description: "自然语言搜索描述，如 '3年以上Python后端开发经验，熟悉微服务架构'",
      }),
      top_k: Type.Optional(Type.Number({ description: "返回结果数量，默认10", default: 10 })),
    }),
    async execute(_id: string, params: { query: string; top_k?: number }) {
      const topK = params.top_k ?? 10;
      const data = await client.post("/talent-assistant/chat", {
        message: params.query,
        filter_talent_pool: true,
      });

      const results = (data.ranked_resumes ?? [])
        .slice(0, topK)
        .map((r: any) => ({
          id: r.resume_id ?? "",
          name: r.name ?? "",
          match_score: r.match_score,
          skills: r.skills ?? [],
          location: r.location ?? "",
          experience: r.experience ?? 0,
          match_type: r.match_type ?? "",
          match_label: r.match_label ?? "",
        }));

      return {
        content: [
          { type: "text", text: JSON.stringify({ query: params.query, results }) },
        ],
      };
    },
  });
}
