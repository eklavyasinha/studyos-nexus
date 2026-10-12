// Exports the supplied scaffold only. Never reads browser progress or private notes.
import { createServer } from "vite";
import { writeFile } from "node:fs/promises";

const server = await createServer({ server: { middlewareMode: true } });
try {
  const { STARTING_SCHEDULE } = await server.ssrLoadModule(
    "/src/pages/study-schedule-data.ts",
  );
  const { PERSONAL_ROADMAP } = await server.ssrLoadModule(
    "/src/pages/personal-roadmap-data.ts",
  );
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const titles = new Map(
    PERSONAL_ROADMAP.map((module) => [module.key, module.title]),
  );
  const rows = [
    [
      "Date",
      "Weekday",
      "Start",
      "End",
      "Course",
      "Topic",
      "Task",
      "Activity",
      "Minutes",
      "Completion criteria",
      "Classification",
      "Prerequisites",
      "Roadmap phase",
      "Milestone",
      "Optional",
      "Module key",
      "Schedule ID",
    ],
    ...STARTING_SCHEDULE.map((task) => [
      task.date,
      new Date(`${task.date}T12:00:00`).toLocaleDateString("en-GB", {
        weekday: "long",
      }),
      task.startTime,
      task.endTime,
      task.course,
      task.stage,
      task.title,
      task.description,
      task.duration,
      task.completionCriteria,
      "Extra self-study · not official coursework",
      task.prerequisites.map((key) => titles.get(key) || key).join("; "),
      task.roadmapPhase,
      task.milestone,
      task.sessionType.startsWith("optional") ? "Yes" : "No",
      task.moduleKey,
      task.scheduleId,
    ]),
  ];
  await writeFile(
    "docs/PERSONAL-PLAN.csv",
    rows.map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n",
  );
  const lines = [
    "# StudyOS Nexus — editable course maps",
    "",
    "These are supplied-source planning scaffolds, not an official complete lecture catalogue. Practice prompts are suggestions. Nothing here marks real progress complete. Java runs in VS Code, not in the website. Prerequisites and completion gates govern progress rather than calendar dates.",
    "",
  ];
  for (const course of ["java-dsa", "sigma-8"]) {
    lines.push(
      `## ${course === "java-dsa" ? "Java + DSA" : "Sigma 8.0 Web Development"}`,
      "",
    );
    for (const module of PERSONAL_ROADMAP.filter(
      (item) => item.course === course,
    )) {
      lines.push(
        `### ${module.courseOrder}. ${module.title}`,
        `Stage: ${module.stage}`,
        `Prerequisites: ${module.prerequisites.map((key) => titles.get(key) || key).join(", ") || "None"}`,
        "",
        module.description,
        "",
        `- Beginner practice: ${module.beginnerPractice}`,
        `- Independent coding: ${module.independentExercise}`,
        `- Common mistakes: ${module.commonMistakes}`,
        `- Revision notes: ${module.revisionNotes}`,
        "- Completion gate:",
        ...module.completionCriteria.map((line) => `  - ${line}`),
        "",
        `Stable module key: \`${module.key}\``,
        "",
      );
    }
  }
  await writeFile("docs/COURSE-MAPS.md", lines.join("\n") + "\n");
  console.log(
    `Exported ${STARTING_SCHEDULE.length} uncompleted schedule tasks and ${PERSONAL_ROADMAP.length} editable module definitions; no private browser data was read.`,
  );
} finally {
  await server.close();
}
