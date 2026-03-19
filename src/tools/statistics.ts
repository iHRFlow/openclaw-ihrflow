import { Type } from "@sinclair/typebox";
import type { IHRFlowClient } from "../client";

export function registerStatisticsTools(api: any, client: IHRFlowClient) {
  api.registerTool({
    name: "ihrflow_get_recruitment_statistics",
    description:
      "获取招聘整体统计数据，包括各状态岗位数量、面试统计、候选人管道等。",
    parameters: Type.Object({}),
    async execute() {
      const [posStats, interviewStats] = await Promise.all([
        client.get("/positions/stats"),
        client.get("/interviews/stats"),
      ]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              position_stats: posStats,
              interview_stats: interviewStats,
            }),
          },
        ],
      };
    },
  });
}
