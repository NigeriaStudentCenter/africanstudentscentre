# africanstudentscentre.com: hosting

The site is static and is served by **GitHub Pages** from the `docs/` folder on `main`.
The repo is `NigeriaStudentCenter/africanstudentscentre`.

## Audit form
- The form posts to FormSubmit (formsubmit.co), which emails each request to `john@africanstudentscentre.com`.
- Activated on 8 Nov 2026.
- The form's `action` uses FormSubmit's code `3ea7073fef8e24e8899c5cc600bb72a7` instead of the email address, so no address appears in the page source.
- Microsoft 365 flagged FormSubmit mail as phishing. Defender → Tenant Allow/Block Lists has an allow entry for `submissions@formsubmit.co` (removed 45 days after last use). If leads stop arriving, check quarantine and that entry.

## DNS at GoDaddy (africanstudentscentre.com)
| Type  | Name | Value |
|-------|------|-------|
| A     | @    | 185.199.108.153 |
| A     | @    | 185.199.109.153 |
| A     | @    | 185.199.110.153 |
| A     | @    | 185.199.111.153 |
| CNAME | www  | nigeriastudentcenter.github.io |

Remove any other `A` record on `@`, such as GoDaddy's parking or forwarding record.
**Leave the MX, TXT and email records alone.** They keep `john@africanstudentscentre.com` working.

Once DNS resolves, go to the repo's Settings → Pages and tick **Enforce HTTPS**.

## Updating the site
Edit the files in `docs/`, then commit and push to `main`. Pages redeploys in about a minute.

