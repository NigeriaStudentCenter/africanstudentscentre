# africanstudentscentre.com: hosting

The site is static and is served by **GitHub Pages** from the `docs/` folder on `main`.
The repo is `NigeriaStudentCenter/africanstudentscentre`.

## Audit form
- The form posts to FormSubmit (formsubmit.co), which emails each request to `john@africanstudentscentre.com`.
- **One-time activation:** the first submission sends an activation email to that address. Click the link in it, or no requests will be delivered.
- After activating, FormSubmit gives you a random alias. To hide the email address from the page source, replace `john@africanstudentscentre.com` in the form's `action` in `docs/index.html` with that alias.

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

## Email accounts still to create
`privacy@africanstudentscentre.com`, or a forwarder for it, because the privacy notice links to it.
