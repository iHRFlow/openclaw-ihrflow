import { Type } from "@sinclair/typebox";
import type { IHRFlowClient } from "../client";

export function registerInterviewWriteTools(api: any, client: IHRFlowClient) {
  api.registerTool({
    name: "ihrflow_create_interview",
    description: "创建面试安排。",
    parameters: Type.Object({
      resume_id: Type.String({ description: "候选人简历ID" }),
      position_id: Type.String({ description: "岗位ID" }),
      interviewer_id: Type.String({ description: "面试官用户ID" }),
      scheduled_at: Type.String({ description: '面试时间，ISO 8601 格式，如 "2026-03-15T14:00:00"' }),
      duration_minutes: Type.Optional(Type.Number({ description: "面试时长（分钟），默认60", default: 60 })),
      round_number: Type.Optional(Type.Number({ description: "面试轮次（如 1、2、3）" })),
      round_name: Type.Optional(Type.String({ description: "面试轮次名称（如 '技术面'、'HR面'）" })),
      location_type: Type.Optional(Type.String({ description: "面试形式: online(线上), offline(线下)，默认online", default: "online" })),
      meeting_link: Type.Optional(Type.String({ description: "线上面试链接" })),
    }),
    async execute(
      _id: string,
      params: {
        resume_id: string;
        position_id: string;
        interviewer_id: string;
        scheduled_at: string;
        duration_minutes?: number;
        round_number?: number;
        round_name?: string;
        location_type?: string;
        meeting_link?: string;
      },
    ) {
      const locType = params.location_type ?? "online";
      if (locType !== "online" && locType !== "offline") {
        return { content: [{ type: "text", text: JSON.stringify({ error: "无效的面试形式，可选: online, offline" }) }] };
      }
      if (!params.scheduled_at?.trim()) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "面试时间不能为空" }) }] };
      }

      const payload: Record<string, any> = {
        resume_id: params.resume_id,
        position_id: params.position_id,
        interviewer_id: params.interviewer_id,
        scheduled_at: params.scheduled_at.trim(),
        duration_minutes: Math.min(Math.max(params.duration_minutes ?? 60, 15), 480),
        location_type: locType,
      };
      if (params.round_number != null) payload.round_number = Math.min(Math.max(params.round_number, 1), 10);
      if (params.round_name) payload.round_name = params.round_name.slice(0, 100);
      if (params.meeting_link) payload.meeting_link = params.meeting_link.slice(0, 500);

      const data = await client.post("/interviews/", payload);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });

  api.registerTool({
    name: "ihrflow_cancel_interview",
    description: "取消面试安排。",
    parameters: Type.Object({
      interview_id: Type.String({ description: "面试ID" }),
    }),
    async execute(_id: string, params: { interview_id: string }) {
      const data = await client.put(`/interviews/${params.interview_id}/cancel`);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });

  api.registerTool({
    name: "ihrflow_reschedule_interview",
    description: "重新安排面试时间。",
    parameters: Type.Object({
      interview_id: Type.String({ description: "面试ID" }),
      new_date: Type.String({ description: "新的面试日期，格式 YYYY-MM-DD" }),
      new_time: Type.String({ description: "新的面试时间，格式 HH:MM" }),
      reason: Type.Optional(Type.String({ description: "改期原因" })),
    }),
    async execute(
      _id: string,
      params: { interview_id: string; new_date: string; new_time: string; reason?: string },
    ) {
      if (!params.new_date?.trim()) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "新日期不能为空" }) }] };
      }
      if (!params.new_time?.trim()) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "新时间不能为空" }) }] };
      }
      const payload: Record<string, any> = {
        new_date: params.new_date.trim(),
        new_time: params.new_time.trim(),
      };
      if (params.reason) payload.reason = params.reason.slice(0, 500);

      const data = await client.put(`/interviews/${params.interview_id}/reschedule`, payload);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });
}
