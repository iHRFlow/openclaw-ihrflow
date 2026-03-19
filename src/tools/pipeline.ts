import { Type } from "@sinclair/typebox";
import type { IHRFlowClient } from "../client";

const ACTION_ENDPOINTS: Record<string, string> = {
  hr_approve: "/resume-screening/{id}/hr-approve",
  hr_reject: "/resume-screening/{id}/hr-reject",
  dept_approve: "/resume-screening/{id}/dept-approve",
  dept_reject: "/resume-screening/{id}/dept-reject",
  final_approve: "/resume-screening/{id}/final-approve",
  final_reject: "/resume-screening/{id}/final-reject",
};

export function registerPipelineTools(api: any, client: IHRFlowClient) {
  api.registerTool({
    name: "ihrflow_update_screening_status",
    description:
      "推进候选人筛选流程。\n" +
      "招聘流程: pending → hr_approve → dept_approve → (interview) → final_approve\n" +
      "每个阶段都可 approve（通过）或 reject（淘汰）。",
    parameters: Type.Object({
      resume_id: Type.String({ description: "候选人简历ID" }),
      action: Type.String({
        description:
          "流程动作: hr_approve(HR初筛通过), hr_reject(HR初筛淘汰), dept_approve(部门筛选通过), dept_reject(部门筛选淘汰), final_approve(终审通过), final_reject(终审淘汰)",
      }),
      notes: Type.Optional(Type.String({ description: "备注说明（可选）" })),
    }),
    async execute(
      _id: string,
      params: { resume_id: string; action: string; notes?: string },
    ) {
      const template = ACTION_ENDPOINTS[params.action];
      if (!template) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `无效的流程动作，可选: ${Object.keys(ACTION_ENDPOINTS).sort().join(", ")}` }),
          }],
        };
      }
      const endpoint = template.replace("{id}", params.resume_id);
      const body = params.notes ? { notes: params.notes.slice(0, 1000) } : undefined;
      const data = await client.post(endpoint, body);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });
}
