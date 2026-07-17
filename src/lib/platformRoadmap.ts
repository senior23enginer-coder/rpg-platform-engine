import roadmap from "../../public/platform/completion-roadmap.json";

export type RoadmapAreaStatus = "pending" | "initial" | "prototype" | "partial" | "in_progress" | "done";
export type RoadmapAreaPriority = "critical" | "high" | "medium" | "low";

export type RoadmapArea = {
  id: string;
  title: string;
  status: RoadmapAreaStatus;
  priority: RoadmapAreaPriority;
  owner: string;
  acceptance: string[];
};

export function getPlatformRoadmapAreas() {
  return roadmap.areas as RoadmapArea[];
}

export function getPlatformRoadmapSummary() {
  const areas = getPlatformRoadmapAreas();
  const done = areas.filter((area) => area.status === "done").length;
  const criticalOpen = areas.filter((area) => area.priority === "critical" && area.status !== "done");
  const inProgress = areas.filter((area) => area.status === "in_progress" || area.status === "partial" || area.status === "prototype");
  const pending = areas.filter((area) => area.status === "pending" || area.status === "initial");
  const completion = areas.length ? Math.round((done / areas.length) * 100) : 0;

  return {
    areas,
    total: areas.length,
    done,
    criticalOpen,
    inProgress,
    pending,
    completion,
    nextCritical: criticalOpen.slice(0, 4),
  };
}
