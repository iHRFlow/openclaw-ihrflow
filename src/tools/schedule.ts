import { Type } from "@sinclair/typebox";
import type { IHRFlowClient } from "../client";

export function registerScheduleTools(api: any, client: IHRFlowClient) {
  api.registerTool({
    name: "ihrflow_get_today_schedule",
    description: "获取今日日程安排，包括面试、会议等。",
    parameters: Type.Object({}),
    async execute() {
      const today = new Date().toISOString().slice(0, 10);
      const data = await client.get("/schedule/events", {
        start_date: today,
        end_date: today,
        include_external: true,
      });
      const events: any[] = Array.isArray(data) ? data : data.items ?? [];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ date: today, event_count: events.length, events }),
          },
        ],
      };
    },
  });

  api.registerTool({
    name: "ihrflow_list_interviews",
    description:
      "列出面试安排。可按状态筛选。",
    parameters: Type.Object({
      status: Type.Optional(
        Type.String({
          description:
            "面试状态: to_be_scheduled(待安排), scheduled(已安排), pending_evaluation(待评价), completed(已完成), cancelled(已取消)",
        }),
      ),
      page: Type.Optional(Type.Number({ description: "页码", default: 1 })),
      page_size: Type.Optional(Type.Number({ description: "每页数量", default: 10 })),
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

      const data = await client.get("/interviews", qp);
      const items: any[] = data.items ?? data.data ?? [];
      const total: number = data.total ?? items.length;

      const interviews = items.map((i: any) => ({
        id: i.id,
        candidate_name: i.candidate_name ?? "",
        position_title: i.position_title ?? "",
        interviewer_name: i.interviewer_name ?? "",
        scheduled_time: i.scheduled_time ?? "",
        status: i.status ?? "",
        round_number: i.round_number,
        interview_type: i.interview_type ?? "",
      }));

      return {
        content: [
          { type: "text", text: JSON.stringify({ total, page: params.page ?? 1, interviews }) },
        ],
      };
    },
  });

  api.registerTool({
    name: "ihrflow_get_interview_detail",
    description:
      "获取面试详情，包括面试官、时间安排、评价反馈等。",
    parameters: Type.Object({
      interview_id: Type.String({ description: "面试ID" }),
    }),
    async execute(_id: string, params: { interview_id: string }) {
      const data = await client.get(`/interviews/${params.interview_id}`);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });
}
