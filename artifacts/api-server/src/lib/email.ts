export function sendInterviewInviteEmail(candidateEmail: string, candidateId: number): void {
  console.log(`Sending email to ${candidateEmail} with link: /schedule/${candidateId}`);
}
