type PhaseNoticeProps = {
  title: string;
  body: string;
};

export function PhaseNotice({ title, body }: PhaseNoticeProps) {
  return (
    <div className="phase-notice" role="note">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
