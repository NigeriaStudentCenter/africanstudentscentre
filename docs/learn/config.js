// Public settings only. No keys or secrets belong here.
window.ASC_COURSE = {
  api: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:7072/api' : 'https://func-asc-course.azurewebsites.net/api'
};
