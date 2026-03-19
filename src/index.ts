import { createClient } from "./client";
import { registerCandidateTools } from "./tools/candidates";
import { registerPositionTools } from "./tools/positions";
import { registerStatisticsTools } from "./tools/statistics";
import { registerScheduleTools } from "./tools/schedule";
import { registerRecruitmentTools } from "./tools/recruitment";
import { registerInterviewWriteTools } from "./tools/interviews_write";
import { registerPipelineTools } from "./tools/pipeline";
import { registerEvaluationTools } from "./tools/evaluations";

export default function (api: any) {
  const cfg = api.pluginConfig ?? {};
  const apiUrl = cfg.apiUrl || "http://localhost:8000/api";
  const username = cfg.username || "";
  const password = cfg.password || "";

  if (!username || !password) {
    console.warn(
      "[openclaw-ihrflow] username/password not configured. " +
      "Tools registered but will fail until config is set. " +
      "Set plugins.entries.openclaw-ihrflow.config in OpenClaw settings.",
    );
  }

  const client = createClient(apiUrl, username, password, cfg.tenantId);

  registerCandidateTools(api, client);
  registerPositionTools(api, client);
  registerStatisticsTools(api, client);
  registerScheduleTools(api, client);
  registerRecruitmentTools(api, client);
  registerInterviewWriteTools(api, client);
  registerPipelineTools(api, client);
  registerEvaluationTools(api, client);
}
