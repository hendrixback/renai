import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ListChecksIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TaskRow } from "@/lib/tasks";
import { isOverdue } from "@/lib/tasks-shared";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

export function OpenTasksWidget({
  myTasks,
  teamOpen,
  teamOverdue,
}: {
  /** Open + in-progress tasks assigned to the current user. Up to 5. */
  myTasks: ReadonlyArray<TaskRow>;
  /** Total open + in-progress across the team. */
  teamOpen: number;
  /** Total overdue across the team. */
  teamOverdue: number;
}) {
  const now = new Date();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecksIcon className="size-5" />
            Your open tasks
          </CardTitle>
          <CardDescription>
            {teamOpen} open across the team
            {teamOverdue > 0 ? (
              <span className="text-destructive">
                {" · "}
                {teamOverdue} overdue
              </span>
            ) : null}
            .
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href="/tasks">View all</Link>}
        />
      </CardHeader>
      <CardContent>
        {myTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2Icon className="size-8 text-emerald-500/70" />
            <p className="text-sm text-muted-foreground">
              You&apos;re all caught up — no tasks assigned to you.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {myTasks.map((task) => {
              const overdue = isOverdue(task, now);
              return (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm"
                >
                  {overdue ? (
                    <AlertTriangleIcon
                      className="size-4 shrink-0 text-destructive"
                      aria-label="Overdue"
                    />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                  <span className="flex-1 truncate font-medium">
                    {task.title}
                  </span>
                  <Badge
                    variant={
                      task.priority === "CRITICAL"
                        ? "destructive"
                        : task.priority === "HIGH"
                          ? "default"
                          : task.priority === "LOW"
                            ? "outline"
                            : "secondary"
                    }
                  >
                    {task.priority.toLowerCase()}
                  </Badge>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {task.dueDate ? (
                      <span
                        className={
                          overdue ? "font-medium text-destructive" : ""
                        }
                      >
                        due {dateFormatter.format(task.dueDate)}
                      </span>
                    ) : (
                      "no due date"
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
