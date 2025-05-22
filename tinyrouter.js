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

    // Case sensitivity for route matching
    caseSensitive: false,

    // Trailing slash handling: 'ignore', 'enforce', 'remove'
    trailingSlash: 'ignore',

    // Error handler for route execution errors
    onError: null,

    // Base URL for all routes
    baseUrl: '',

    // Use hash-based routing instead of history API
    hashMode: false,
};

class Router {
    constructor(options) {
        this.routes = [];
        this.routeCache = new Map();
        this.namedRoutes = {};
        this.middleware = [];
        this.options = { ..._default_options, ...options };
        this._boundHandleNavigation = this._handleNavigation.bind(this);
    }

    // Register a new route with optional handlers and metadata.
    on(path, handlers, options = {}) {
        if (!path || typeof path !== 'string') {
            throw new Error('Route path must be a non-empty string');
        }
        if (!handlers) {
            throw new Error('Route handlers are required');
        }

        if (typeof handlers === 'function') {
            handlers = { on: handlers };
        }

        const { name = null, priority = 0 } = options;
        const { regex, params } = this._parsePath(path);
        const route = { path, regex, params, handlers, priority, name };
        
        this.routes.push(route);
        this.routes.sort((a, b) => b.priority - a.priority);

        if (name) {
            this.namedRoutes[name] = route;
        }

        return this;
    }

    // Create route group with prefix and optional handlers.
    group(prefix, groupHandlers = {}) {
        const parent = this;
        return {
            on: (subPath, handlers, options = {}) => {
                if (typeof handlers === 'function') {
                    handlers = { on: handlers };
                }

                const path = prefix + subPath;
                const mergedHandlers = this._mergeHandlers(groupHandlers, handlers);
                parent.on(path, mergedHandlers, options);
            }
        };
    }

    // Add global middleware
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware must be a function');
        }
        this.middleware.push(middleware);
        return this;
    }

    // Initialize router and bind events.
    ready() {
        const eventName = this.options.hashMode ? 'hashchange' : 'popstate';
        window.addEventListener(eventName, this._boundHandleNavigation);
        this.bind(document);
        this._handleNavigation();
        return this;
    }

    // Bind navigation to elements with the configured attribute.
    bind(parent) {
        const attrib = this.options.selectorAttrib;
        if (!attrib) {
            return this;
        }

        parent.querySelectorAll(`[${attrib}]`).forEach(el => {
            let path = el.getAttribute(attrib) || el.getAttribute('href');

            // If there's no path or the element was already handled, skip it.
            if (!path || el.dataset['router']) {
                return;
            }
            el.dataset['router'] = 'true';

            el.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(path);
            });
        });

        return this;
    }

    // Navigate to a URL with enhanced options.
    navigate(path, options = {}) {
        const {
            query = {},
            hash = '',
            pushState = true,
            force = false,
            silent = false
        } = options;

        // Handle base URL
        if (this.options.baseUrl && !path.startsWith(this.options.baseUrl)) {
            path = this.options.baseUrl + path;
        }

        // Handle trailing slash
        path = this._normalizeTrailingSlash(path);

        const url = this._makeURL(path, query, hash);
        const currentUrl = this.options.hashMode 
            ? window.location.hash
            : `${window.location.pathname}${window.location.search}${window.location.hash}`;

        if (!force && currentUrl === url) {
            if (!silent) this._handleNavigation();
            return this;
        }

        if (this.options.hashMode) {
            window.location.hash = url;
        } else {
            const method = pushState ? 'pushState' : 'replaceState';
            window.history[method]({}, '', url);
        }

        if (!silent) this._handleNavigation();
        return this;
    }

    // Generate URL from named route
    url(name, params = {}, options = {}) {
        const route = this.namedRoutes[name];
        if (!route) {
            throw new Error(`Route '${name}' not found`);
        }

        let path = route.path;
        
        // Replace parameters
        for (const [key, value] of Object.entries(params)) {
            path = path.replace(`{${key}}`, encodeURIComponent(value));
            path = path.replace(`{${key}?}`, encodeURIComponent(value));
        }

        // Remove optional parameters that weren't provided
        path = path.replace(/\{[^}]+\?\}/g, '');

        return this._makeURL(path, options.query, options.hash);
    }

    // Get current route information
    current() {
        const path = this.options.hashMode 
            ? window.location.hash.slice(1) || '/'
            : window.location.pathname;

        for (const route of this.routes) {
            const match = path.match(route.regex);
            if (match) {
                const params = this._extractParams(route.params, match);
                return {
                    path: route.path,
                    name: route.name,
                    params,
                    query: this._getQueryParams(),
                    hash: window.location.hash.slice(1)
                };
            }
        }
        return null;
    }

    // Clean up router
    destroy() {
        const eventName = this.options.hashMode ? 'hashchange' : 'popstate';
        window.removeEventListener(eventName, this._boundHandleNavigation);
        
        // Remove all bound click listeners
        document.querySelectorAll('[data-router]').forEach(el => {
            delete el.dataset.router;
        });
        
        this.routes = [];
        this.routeCache.clear();
        this.namedRoutes = {};
        this.middleware = [];
    }

    // Parse path into regex and parameter names with enhanced support.
    _parsePath(path) {
        const params = [];
        let regex = path
            // Optional parameters: {param?}
            .replace(/\{(\w+)\?\}/g, (match, name) => {
                params.push({ name, optional: true });
                return '([^/]*)?';
            })
            // Required parameters: {param}
            .replace(/\{(\w+)\}/g, (match, name) => {
                params.push({ name, optional: false });
                return '([^/]+)';
            })
            // Wildcard support: *
            .replace(/\*/g, '(.*)');

        const flags = this.options.caseSensitive ? '' : 'i';
        return { regex: new RegExp(`^${regex}$`, flags), params };
    }

    // Handle URL change and execute matching route.
    _handleNavigation() {
        const path = this.options.hashMode 
            ? window.location.hash.slice(1) || '/'
            : window.location.pathname;
        
        const normalizedPath = this._normalizeTrailingSlash(path);
        const state = window.history.state;

        // Check cache first
        const cacheKey = `${normalizedPath}${window.location.search}${window.location.hash}`;
        if (this.routeCache.has(cacheKey)) {
            const cached = this.routeCache.get(cacheKey);
            this._execHandlers(cached.handlers, cached.ctx);
            return;
        }

        // Iterate through the routes and stop at the first match.
        for (const route of this.routes) {
            const match = normalizedPath.match(route.regex);
            if (!match) continue;

            // Extract parameters from the URL.
            const params = this._extractParams(route.params, match);

            // Create the handler callback context.
            const ctx = {
                path: route.path,
                params,
                query: this._getQueryParams(),
                hash: window.location.hash.slice(1),
                state,
                location: window.location,
                router: this
            };

            // Cache the result
            this.routeCache.set(cacheKey, { handlers: route.handlers, ctx });

            this._execHandlers(route.handlers, ctx);
            return;
        }

        // If no route matched, execute the default handler if provided.
        if (this.options.defaultHandler) {
            const ctx = {
                path: normalizedPath,
                params: {},
                query: this._getQueryParams(),
                hash: window.location.hash.slice(1),
                state,
                location: window.location,
                router: this
            };
            
            try {
                this.options.defaultHandler(ctx);
            } catch (error) {
                this._handleError(error, ctx);
            }
        }
    }

    // Execute handlers in sequence with error handling and middleware support.
    _execHandlers(handlers, ctx) {
        const chain = [];
        
        // Add global middleware first
        chain.push(...this.middleware);
        
        // Then route-specific handlers
        if (handlers.before) chain.push(...[handlers.before].flat());
        if (handlers.on) chain.push(handlers.on);
        if (handlers.after) chain.push(...[handlers.after].flat());

        // Execute chain with ability to stop execution
        for (const fn of chain) {
            if (typeof fn === 'function') {
                try {
                    const result = fn(ctx);
                    // Allow handlers to stop the chain by returning false
                    if (result === false) break;
                    // Support for promises (basic async support)
                    if (result && typeof result.then === 'function') {
                        result.catch(error => this._handleError(error, ctx));
                    }
                } catch (error) {
                    this._handleError(error, ctx);
                    break;
                }
            }
        }
    }

    // Handle errors in route execution
    _handleError(error, ctx) {
        console.error('Router handler error:', error);
        if (this.options.onError && typeof this.options.onError === 'function') {
            try {
                this.options.onError(error, ctx);
            } catch (handlerError) {
                console.error('Error in error handler:', handlerError);
            }
        }
    }

    // Merge group handlers with route handlers.
    _mergeHandlers(group, route) {
        return {
            before: [...[group.before].flat().filter(Boolean), ...[route.before].flat().filter(Boolean)],
            on: route.on || group.on,
            after: [...[route.after].flat().filter(Boolean), ...[group.after].flat().filter(Boolean)]
        };
    }

    // Build complete URL from components.
    _makeURL(path, query, hash) {
        let qs = '';

        if (query && Object.keys(query).length > 0) {
            qs = (query instanceof URLSearchParams) 
                ? query.toString() 
                : new URLSearchParams(query).toString();
        }

        return path + (qs ? `?${qs}` : '') + (hash ? `#${hash}` : '');
    }

    // Extract parameters from regex match
    _extractParams(paramDefs, match) {
        const params = {};
        paramDefs.forEach((param, i) => {
            const value = match[i + 1];
            const paramName = typeof param === 'string' ? param : param.name;
            if (value !== undefined) {
                params[paramName] = decodeURIComponent(value);
            }
        });
        return params;
    }

    // Get current query parameters as object
    _getQueryParams() {
        const searchParams = new URLSearchParams(window.location.search);
        return Object.fromEntries(searchParams.entries());
    }

    // Normalize trailing slash based on options
    _normalizeTrailingSlash(path) {
        if (this.options.trailingSlash === 'ignore') {
            return path;
        }
        
        if (path === '/') return path;
        
        if (this.options.trailingSlash === 'enforce') {
            return path.endsWith('/') ? path : path + '/';
        }
        
        if (this.options.trailingSlash === 'remove') {
            return path.endsWith('/') ? path.slice(0, -1) : path;
        }
        
        return path;
    }
}
