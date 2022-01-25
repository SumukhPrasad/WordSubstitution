# Packaging For Extentions

To package this app as an extention for browsers, follow these steps:
- Run `npm run build` and then copy the [public](public) folder to your project.
- Set the default popup action in your manifest to [`public/index.html`](public/index.html).