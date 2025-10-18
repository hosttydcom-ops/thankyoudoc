# Deployment Configuration for SPA Routing

## Issue: 404 Error on Page Reload

This is a common issue with Single Page Applications (SPAs) where the server doesn't know how to handle client-side routes.

## Solutions by Platform:

### Netlify
Create `public/_redirects` file (already created):
```
/*    /index.html   200
```

### Vercel
Create `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Apache
Create `.htaccess` in public folder:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Nginx
Add to server configuration:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### GitHub Pages
Create `public/404.html` that redirects to `index.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Single Page App</title>
  <script type="text/javascript">
    // Single Page Apps for GitHub Pages
    // MIT License
    // https://github.com/rafgraph/spa-github-pages
    // This script takes the current url and converts the path and query
    // string into just a pathname and uses that as the new location
    // This approach allows for a single page app to function on GitHub Pages.
    (function(l) {
      if (l.search[1] === '/' ) {
        var decoded = l.search.slice(1).split('&').map(function(s) { 
          return s.replace(/~and~/g, '&')
        }).join('?');
        window.history.replaceState(null, null,
            l.pathname.slice(0, -1) + decoded + l.hash
        );
      }
    }(window.location))
  </script>
</head>
<body>
  <script type="text/javascript">
    // Single Page Apps for GitHub Pages
    // MIT License
    // https://github.com/rafgraph/spa-github-pages
    // This script checks to see if a redirect is present in the query string,
    // converts it back into the correct url and adds it to the
    // browser's history using window.history.replaceState(...),
    // which won't cause the browser to attempt to load the new url.
    // When the single page app is loaded further down in this file,
    // the correct url will be waiting in the browser's history for
    // the single page app to route accordingly.
    (function(l) {
      if (l.search) {
        var q = {};
        l.search.slice(1).split('&').forEach(function(v) {
          var a = v.split('=');
          q[a[0]] = a.slice(1).join('=').replace(/~and~/g, '&');
        });
        if (q.p !== undefined) {
          window.history.replaceState(null, null,
              l.pathname.slice(0, -1) + (q.p || '') +
              (q.q ? ('?' + q.q) : '') + l.hash
          );
        }
      }
    }(window.location))
  </script>
  <script type="text/javascript">
    // Single Page Apps for GitHub Pages
    // MIT License
    // https://github.com/rafgraph/spa-github-pages
    // This script takes the current url and converts the path and query
    // string into just a pathname and uses that as the new location
    // This approach allows for a single page app to function on GitHub Pages.
    (function(l) {
      if (l.search[1] === '/' ) {
        var decoded = l.search.slice(1).split('&').map(function(s) { 
          return s.replace(/~and~/g, '&')
        }).join('?');
        window.history.replaceState(null, null,
            l.pathname.slice(0, -1) + decoded + l.hash
        );
      }
    }(window.location))
  </script>
</body>
</html>
```

## Build Commands

```bash
npm run build
```

The built files will be in the `dist` folder. Deploy the contents of the `dist` folder to your hosting platform.
