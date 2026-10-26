import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { MAX_TASKS } from "./checkForm";

interface TaskListFieldProps {
  id: string;
  tasks: readonly string[];
  error?: string | null;
  onChange: (tasks: string[]) => void;
}

/** The tasks, each its own labelled input: edit, Remove, or Add a task, up to six. */
export function TaskListField({ id, tasks, error, onChange }: TaskListFieldProps) {
  const errorId = `${id}-error`;
  const set = (index: number, value: string) => onChange(tasks.map((task, at) => (at === index ? value : task)));
  return (
    <fieldset data-field={id} aria-describedby={errorId} className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">Tasks</legend>
      <ol className="flex flex-col gap-2">
        {tasks.map((task, index) => (
          // Tasks have no ids of their own, and the inputs are controlled, so the position is a safe key.
          <li key={index} className="flex items-start gap-2">
            <label htmlFor={`${id}-${index}`} className="sr-only">
              Task {index + 1}
            </label>
            {/* Grows with its text (two lines at least), so a whole task can be read and edited on a phone. */}
            <textarea
              id={`${id}-${index}`}
              value={task}
              rows={2}
              maxLength={120}
              aria-invalid={error && task.trim().length < 3 ? true : undefined}
              onChange={(event) => set(index, event.target.value)}
              className="min-h-22 w-full resize-y border border-edge field-sizing-content bg-paper px-3 py-2 text-[1rem] text-ink aria-invalid:border-2 aria-invalid:border-stop aria-invalid:focus-visible:outline-stop aria-invalid:focus-visible:outline-offset-0"
            />
            {tasks.length > 1 ? (
              <Button variant="quiet" aria-label={`Remove task ${index + 1}`} onClick={() => onChange(tasks.filter((_, at) => at !== index))}>
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
      {tasks.length < MAX_TASKS ? (
        <Button variant="secondary" onClick={() => onChange([...tasks, ""])}>
          Add a task
        </Button>
      ) : null}
      <FormError id={errorId} message={error} />
    </fieldset>
  );
}
