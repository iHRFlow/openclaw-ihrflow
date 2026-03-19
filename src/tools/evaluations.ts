import { Type } from "@sinclair/typebox";
import type { IHRFlowClient } from "../client";

export function registerEvaluationTools(api: any, client: IHRFlowClient) {
  api.registerTool({
    name: "ihrflow_submit_interview_feedback",
    description:
      "提交面试反馈评价。先创建评价记录，再提交面试官反馈。",
    parameters: Type.Object({
      interview_id: Type.String({ description: "面试ID" }),
      passed: Type.Boolean({ description: "是否通过面试" }),
      feedback: Type.String({ description: "面试评价内容（至少10个字符）" }),
      score: Type.Optional(Type.Number({ description: "面试评分 1-100（可选）" })),
      notes: Type.Optional(Type.String({ description: "补充备注（可选）" })),
    }),
    async execute(
      _id: string,
      params: { interview_id: string; passed: boolean; feedback: string; score?: number; notes?: string },
    ) {
      if (!params.feedback || params.feedback.trim().length < 10) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "面试评价内容至少需要10个字符" }) }] };
      }

      const evalData = await client.post(`/interview-evaluations/${params.interview_id}/evaluation`);
      const evaluationId = evalData.id ?? evalData.evaluation_id;
      if (!evaluationId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "创建评价记录失败，未获取到评价ID" }) }] };
      }

      const payload: Record<string, any> = {
        manual_passed: params.passed,
        manual_feedback: params.feedback.trim().slice(0, 5000),
      };
      if (params.score != null) payload.manual_score = Math.min(Math.max(params.score, 1), 100);
      if (params.notes) payload.manual_notes = params.notes.slice(0, 2000);

      const result = await client.post(`/interview-evaluations/${evaluationId}/manual-feedback`, payload);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  });
}
