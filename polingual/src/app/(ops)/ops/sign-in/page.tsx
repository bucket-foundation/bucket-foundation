import { Button, Card, Eyebrow, Field, Input, Stack, Title } from "@/ui";
import { FOUNDER_EMAIL } from "@/lib/ops/gate";
import { requestCode, verifyCode } from "../actions";
import { assertAdminHost } from "../session";
import s from "../ops.module.css";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  not_founder: "Only the founder account can open this dashboard.",
  bad_code: "That code did not match. Check the latest email.",
  too_many_requests: "Too many tries. Wait ten minutes.",
  send_failed: "The email did not send. Try again in a minute.",
  offline: "The sign-in service did not answer.",
  no_session: "Sign-in did not return a session.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; email?: string }> }) {
  await assertAdminHost();
  const q = await searchParams;
  const email = q.email || FOUNDER_EMAIL;
  return (
    <main className={s.page}>
      <Card pad="lg" className={s.signIn}>
        <Stack>
          <Eyebrow>Polingual ops</Eyebrow>
          <Title>Sign in</Title>
          {q.error && <p role="alert" className={s.error}>{ERRORS[q.error] ?? q.error.replaceAll("_", " ")}</p>}
          {q.sent ? (
            <form action={verifyCode} className={s.form}>
              <input type="hidden" name="email" value={email} />
              <Field label="Code from your email">
                <Input name="code" inputMode="numeric" autoComplete="one-time-code" required />
              </Field>
              <Button type="submit">Sign in</Button>
            </form>
          ) : (
            <form action={requestCode} className={s.form}>
              <Field label="Email">
                <Input name="email" type="email" defaultValue={FOUNDER_EMAIL} required />
              </Field>
              <Button type="submit">Send code</Button>
            </form>
          )}
        </Stack>
      </Card>
    </main>
  );
}
