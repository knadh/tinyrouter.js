# tinyrouter.js

A tiny, vanilla JS client-side router for single-page apps on top of the browser's `window.history` API.
No dependencies and ~950 bytes minified+gzipped. Ideal for simple vanilla JS single-page applications, using with AplineJS etc.

## Features

- Dynamic route parameters using the `{param}` syntax
- Route grouping with shared handlers
- Support for before/after handler hooks
- Automatic optional binding to `<a>` and other tags for navigation

[**View demo**](https://knadh.github.io/tinyrouter.js/demo)

## Usage

```
npm install @knadh/tinyrouter
```

### Basic

```javascript
import router from @knadh/tinyrouter;

// Create router instance.
const r = router.new({
  defaultHandler: (ctx) => console.log('Route not found', ctx.location.pathname)
});

// Register routes.
r.on('/', (ctx) => console.log(ctx));
r.on('/users/{id}', (ctx) => console.log('User profile', ctx.params.id));

// Initialize router.
r.ready();

r.navigate('/users/42', { filter: 'active' }, 'settings');
```

### Advanced

```javascript
// Route with before/handler hooks.
r.on('/posts/{id}', {
  before: (ctx) => console.log('Before post handler'),
  on: (ctx) => console.log('Post content', ctx.params.id),
  after: (ctx) => console.log('After post handler')
});

// Route group.
const admin = r.group('/admin', {
  before: (ctx) => checkAdminAuth()
});

// These routes are automatically prefixed with /admin and the before()
// callback on the group is triggered for all of them. 
admin.on('/dashboard', (ctx) => renderDashboard());
admin.on('/users/{id}', (ctx) => renderUserEditor(ctx.params.id));

// Programmatic navigation.
r.navigate('/users/42', { filter: 'active' }, 'settings');
```

See the [demo source](https://github.com/knadh/tinyrouter.js/blob/master/404.html) for a full working example.

### Link binding

Simply add the `data-route` attribute to links for automatic on-click naviation.

```html
<a href="/users/42" data-route>View User</a>
```


## API

| Method | Description |
|--------|-------------|
| `router.New(options)` | Creates a new router instance. See `_default_options{}` in the source code for options. |
| `r.on(path, handler)` | Registers a route handler |
| `r.group(prefix, handlers{})` | Creates a group of routes with a common prefix |
| `r.ready()` | Initializes the router |
| `r.navigate(path, query, hash, pushState)` | Navigates to a new route |
| `r.bind(parent)` | Binds navigate() onclick of all elements in the parent tagged with `data-route` |

Licensed under the MIT License.
