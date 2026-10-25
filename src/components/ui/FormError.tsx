import { SUPPORT_EMAIL } from "@/config/contact";
import { splitContactLink } from "@/domain/messages";

interface FormErrorProps {
  id?: string;
  message?: string | null;
}

/** "contact us" in any message becomes a link that opens an email to support. */
function MessageText({ message }: { message: string }) {
  const parts = splitContactLink(message);
  if (!parts) return message;
  return (
    <>
      {parts.before}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
        {parts.phrase}
      </a>
      {parts.after}
    </>
  );
}

/**
 * The error slot under a field or a form. Always rendered, so aria-describedby
 * always points at a real element, and announced politely when it fills. A
 * new message fades in (motion 4 in docs/DESIGN.md); keying on the text
 * replays the fade when the message changes.
 */
export function FormError({ id, message }: FormErrorProps) {
  return (
    <p id={id} aria-live="polite" className="text-sm text-stop">
      {message ? (
        <span key={message} className="animate-error-in">
          <MessageText message={message} />
        </span>
      ) : null}
    </p>
  );
}
