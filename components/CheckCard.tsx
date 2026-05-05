"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckResult, WorkflowStatus } from "@/types";

const SEVERITY_STYLES = {
  high: "bg-red-500/10 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const STATUS_ICON = {
  pass: "✓",
  warn: "⚠",
  fail: "✕",
};

const STATUS_COLOR = {
  pass: "text-brand",
  warn: "text-yellow-400",
  fail: "text-red-400",
};

const CARD_BORDER = {
  pass: "border-zinc-800",
  warn: "border-yellow-500/30",
  fail: "border-red-500/40",
};

const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  fixed: "Fixed",
  ignored: "Ignored",
};

const WORKFLOW_STYLES: Record<WorkflowStatus, string> = {
  open: "bg-zinc-800 text-zinc-300 border-zinc-700",
  in_progress: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  fixed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  ignored: "bg-zinc-700/40 text-zinc-400 border-zinc-700",
};

export default function CheckCard({
  check,
  onWorkflowChange,
}: {
  check: CheckResult;
  onWorkflowChange?: (
    check: CheckResult,
    updates: {
      workflowStatus: WorkflowStatus;
      assignedTo?: string | null;
      dueAt?: string | null;
      notes?: string;
    }
  ) => void;
}) {
  const workflowStatus = check.workflowStatus ?? "open";
  const showWorkflow = check.status !== "pass" && !!onWorkflowChange;
  const initialDueDate = useMemo(() => parseDateParts(check.dueAt), [check.dueAt]);
  const [draftStatus, setDraftStatus] = useState<WorkflowStatus>(workflowStatus);
  const [assignedTo, setAssignedTo] = useState(check.assignedTo ?? "");
  const [dueMonth, setDueMonth] = useState(initialDueDate.month);
  const [dueDay, setDueDay] = useState(initialDueDate.day);
  const [dueYear, setDueYear] = useState(initialDueDate.year);
  const [notes, setNotes] = useState(check.notes ?? "");

  useEffect(() => {
    const nextDueDate = parseDateParts(check.dueAt);
    setDraftStatus(check.workflowStatus ?? "open");
    setAssignedTo(check.assignedTo ?? "");
    setDueMonth(nextDueDate.month);
    setDueDay(nextDueDate.day);
    setDueYear(nextDueDate.year);
    setNotes(check.notes ?? "");
  }, [check.assignedTo, check.dueAt, check.notes, check.workflowStatus]);

  const dueAt = formatDateParts(dueYear, dueMonth, dueDay);

  const saveWorkflow = (nextStatus = draftStatus) => {
    onWorkflowChange?.(check, {
      workflowStatus: nextStatus,
      assignedTo,
      dueAt,
      notes,
    });
  };

  return (
    <div className={`bg-zinc-900 border ${CARD_BORDER[check.status]} rounded-xl p-6`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-xl ${STATUS_COLOR[check.status]}`}>
            {STATUS_ICON[check.status]}
          </span>
          <h3 className="text-white font-semibold">{check.checkName}</h3>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full border ${SEVERITY_STYLES[check.severity]}`}
        >
          {check.severity}
        </span>
      </div>

      <p className="text-zinc-400 text-sm mb-3">{check.description}</p>

      {showWorkflow && (
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${WORKFLOW_STYLES[workflowStatus]}`}
            >
              {WORKFLOW_LABELS[workflowStatus]}
            </span>
            {(["open", "in_progress", "fixed", "ignored"] as WorkflowStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setDraftStatus(status)}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  draftStatus === status
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {WORKFLOW_LABELS[status]}
              </button>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
            <input
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.currentTarget.value)}
              placeholder="Assign owner"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-brand focus:outline-none"
            />
            <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
              <input
                inputMode="numeric"
                maxLength={2}
                value={dueMonth}
                onChange={(event) => setDueMonth(cleanDateNumber(event.currentTarget.value, 2))}
                placeholder="MM"
                aria-label="Due month"
                className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-brand focus:outline-none"
              />
              <input
                inputMode="numeric"
                maxLength={2}
                value={dueDay}
                onChange={(event) => setDueDay(cleanDateNumber(event.currentTarget.value, 2))}
                placeholder="DD"
                aria-label="Due day"
                className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-brand focus:outline-none"
              />
              <input
                inputMode="numeric"
                maxLength={4}
                value={dueYear}
                onChange={(event) => setDueYear(cleanDateNumber(event.currentTarget.value, 4))}
                placeholder="YYYY"
                aria-label="Due year"
                className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-brand focus:outline-none"
              />
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
            placeholder="Add ops notes"
            rows={2}
            className="mt-2 w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-brand focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveWorkflow()}
              className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-brand/90"
            >
              Save plan
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftStatus("fixed");
                saveWorkflow("fixed");
              }}
              className="rounded-md border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10"
            >
              Mark fixed
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftStatus("ignored");
                saveWorkflow("ignored");
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
            >
              Ignore
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 text-sm mb-4">
        <span className="text-zinc-500">
          Count: <span className="text-white">{check.count.toLocaleString()}</span>
        </span>
        <span className="text-zinc-500">
          Affected: <span className="text-white">{check.percentage}%</span>
        </span>
      </div>

      {check.exampleRecords && check.exampleRecords.length > 0 && check.status !== "pass" && (
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
            Sample records
          </p>
          <div className="space-y-2">
            {check.exampleRecords.slice(0, 5).map((record) => {
              const content = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-200">
                      {record.label}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {[record.detail, record.secondary].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {record.url && (
                    <span className="text-xs font-semibold text-brand">Open</span>
                  )}
                </>
              );

              return record.url ? (
                <a
                  key={record.id}
                  href={record.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-md border border-zinc-800 px-3 py-2 transition-colors hover:border-zinc-700"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={record.id}
                  className="flex items-center gap-3 rounded-md border border-zinc-800 px-3 py-2"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {check.fixSteps.length > 0 && check.status !== "pass" && (
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            How to fix
          </p>
          <ul className="space-y-1">
            {check.fixSteps.map((step, i) => (
              <li key={i} className="text-sm text-zinc-400 flex gap-2">
                <span className="text-brand shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function cleanDateNumber(value: string, length: number) {
  return value.replace(/\D/g, "").slice(0, length);
}

function parseDateParts(value?: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function formatDateParts(year: string, month: string, day: string) {
  if (!year && !month && !day) return null;
  if (year.length !== 4 || month.length === 0 || day.length === 0) return null;

  const paddedMonth = month.padStart(2, "0");
  const paddedDay = day.padStart(2, "0");
  const date = new Date(`${year}-${paddedMonth}-${paddedDay}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(paddedMonth) ||
    date.getUTCDate() !== Number(paddedDay)
  ) {
    return null;
  }

  return `${year}-${paddedMonth}-${paddedDay}`;
}
