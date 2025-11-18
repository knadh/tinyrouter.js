export default {
    new: function (options = {}) {
        return new Router(options);
    }
};

const _default_options = {
    // An onClick->navigate() is attached to all elements with this attribute.
    // If this attrib has a value, that's used as the path. Otherwise, if the
    // element has a href, that's used as the path.
    selectorAttrib: 'data-route',

    // If a route is not matched, this handler is called.
    defaultHandler: null,
};

class Router {
    constructor(options) {
        this.routes = [];
        this.options = { ..._default_options, ...options };
        this.beforeEachHandlers = [];
        this.afterEachHandlers = [];
    }

    // Register a beforeEach handler that runs before every navigation.
    beforeEach(handler) {
        this.beforeEachHandlers.push(handler);
        return this;
    }

    // Register an afterEach handler that runs after every navigation.
    afterEach(handler) {
        this.afterEachHandlers.push(handler);
        return this;
    }

    // Register a new route with optional handlers.
    on(path, handlers) {
        if (typeof handlers === 'function') {
            handlers = { on: handlers };
        }

        const { regex, params } = this._parsePath(path);
        this.routes.push({ path, regex, params, handlers });
    }

    // Create route group with prefix and optional handlers.
    group(prefix, groupHandlers = {}) {
        const parent = this;
        return {
            on: (subPath, handlers) => {
                if (typeof handlers === 'function') {
                    handlers = { on: handlers };
                }

                const path = prefix + subPath;
                const mergedHandlers = this._mergeHandlers(groupHandlers, handlers);
                parent.on(path, mergedHandlers);
            }
        };
    }

    // Initialize router and bind events.
    ready() {
        window.addEventListener('popstate', () => this._handleNavigation());
        this.bind(document);
        this._handleNavigation();
        return this;
    }

    // Bind navigation to elements with the configured attribute.
    bind(parent) {
        const attrib = this.options.selectorAttrib;
        if (!attrib) {
            return;
        }

        parent.querySelectorAll(`[${attrib}]`).forEach(el => {
            let path = el.dataset[attrib] ? el.dataset[attrib] : el.getAttribute('href');

            // If there's no path or the element was already handled, skip it.
            if (!path || el.dataset['router']) {
                return;
            }
            el.dataset['router'] = true;

            el.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(path);
            });
        });
    }

    // Navigate to a URL.
    navigate(path, query = {}, hash = '', pushState = true) {
        const url = this._makeURL(path, query, hash);

        // If the current page is the same as the target URL, don't change the history,
        // but execute the handlers.
        if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== url) {
            const method = pushState ? 'pushState' : 'replaceState';
            window.history[method]({}, '', url);
        }

        this._handleNavigation();
    }

    // Parse path into regex and parameter names.
    _parsePath(path) {
        const params = [];
        const regex = new RegExp('^' + path.replace(/\{\w+\}/g, match => {
            params.push(match.slice(1, -1));
            return '([^/]+)';
        }) + '$');

        return { regex, params };
    }

    // Handle URL change and execute matching route.
    _handleNavigation() {
        const { pathname: path } = window.location;
        const state = window.history.state;

        // Iterate through the routes and stop at the first match.
        for (const route of this.routes) {
            const match = path.match(route.regex);
            if (!match) continue;

            // Extract parameters from the URL.
            const params = route.params.reduce((acc, name, i) => {
                acc[name] = match[i + 1];
                return acc;
            }, {});

            // Create the handler callback context.
            const ctx = {
                path: route.path,
                params,
                state,
                location: window.location,
            };

            this._execHandlers(route.handlers, ctx);
            return;
        }

        // If no route matched, execute the default handler if provided.
        this.options.defaultHandler && this.options.defaultHandler({
            path,
            params: {},
            state,
            location: window.location
        })
    }

    // Execute handlers in sequence: beforeEach -> before -> on -> after -> afterEach.
    _execHandlers(handlers, ctx) {
        const chain = [];
        
        // Add global beforeEach handlers
        chain.push(...this.beforeEachHandlers);
        
        // Add route-specific handlers
        handlers.before && chain.push(...[handlers.before].flat());
        handlers.on && chain.push(handlers.on);
        handlers.after && chain.push(...[handlers.after].flat());
        
        // Add global afterEach handlers
        chain.push(...this.afterEachHandlers);

        chain.forEach(fn => fn && fn(ctx));
    }

    // Merge group handlers with route handlers.
    _mergeHandlers(group, route) {
        return {
            before: [group.before, route.before].filter(Boolean),
            on: route.on || group.on,
            after: [route.after, group.after].filter(Boolean)
        };
    }

    // Build complete URL from components. query should be a URLSearchParams object or a {key:value} object.
    _makeURL(path, query, hash) {
        let qs = null;

        if (query) {
            qs = (query instanceof URLSearchParams) ? query.toString() : new URLSearchParams(query).toString();
        }

        return path + (qs ? `?${qs}` : '') + (hash ? `#${hash}` : '');
    }
}
