# Major Enhancement: TinyRouter.js v2.0 - Feature-Rich Client-Side Router

This PR introduces significant enhancements to TinyRouter.js while maintaining backward compatibility. The router has evolved from a simple ~950-byte library to a comprehensive ~2.5KB routing solution with enterprise-grade features.

## New Features

### Route Pattern Enhancements
- **Optional Parameters**: Support for `{param?}` syntax
- **Wildcard Routes**: Use `*` for catch-all patterns
- **Route Priorities**: Control matching order with priority system
- **Named Routes**: Assign names and generate URLs programmatically

### Middleware & Hooks
- **Global Middleware**: Add cross-cutting concerns that run on all routes
- **Enhanced Error Handling**: Comprehensive error management with custom handlers
- **Async Support**: Basic promise handling in route handlers

### Navigation & State Management
- **Enhanced Navigation**: Rich options for query params, hash, silent mode, force refresh
- **Current Route Info**: Get active route details programmatically
- **Route Caching**: Performance optimization through intelligent caching
- **Hash Mode**: Alternative routing for compatibility scenarios

### Developer Experience
- **Query & Hash Handling**: Full support for URL query parameters and fragments
- **Flexible Configuration**: Extensive options for trailing slashes, case sensitivity, base URLs
- **Cleanup Support**: Proper resource management with `destroy()` method
- **Better Context**: Enhanced context object with more route information

## API Changes

### Backward Compatible Changes
```javascript
// v1.x still works
r.navigate('/users/123', { filter: 'active' }, 'settings');

// v2.x enhanced syntax
r.navigate('/users/123', {
  query: { filter: 'active' },
  hash: 'settings',
  silent: false
});
```

### New Methods
- `r.use(middleware)` - Add global middleware
- `r.url(name, params)` - Generate URLs from named routes  
- `r.current()` - Get current route information
- `r.destroy()` - Clean up router instance

### Enhanced Route Registration
```javascript
// Named routes with priorities
r.on('/users/{id}', handler, { name: 'user.show', priority: 10 });

// Optional parameters and wildcards
r.on('/blog/{slug?}', blogHandler);
r.on('/files/*', fileHandler);
```

## Impact

- **Size**: Increased from ~950 bytes to ~2.5KB (still very lightweight)
- **Performance**: Added route caching for improved navigation speed
- **Compatibility**: 100% backward compatible with existing v1.x code
- **Functionality**: Significantly expanded capabilities for complex SPA requirements

## Testing

- All existing functionality tested and working
- New features include comprehensive error handling
- Examples updated in README with real-world usage patterns
- Demo remains functional with enhanced capabilities

## Documentation

- Complete README overhaul with detailed examples
- Migration guide for v1.x users
- Comprehensive API reference
- Progressive examples from basic to advanced usage

## Use Cases

This enhancement makes TinyRouter suitable for:
- Simple vanilla JS SPAs (original use case)
- Complex applications requiring middleware and error handling
- Applications needing programmatic URL generation
- Projects requiring hash-based routing compatibility
- Applications with authentication/authorization concerns

The router maintains its core philosophy of being lightweight and dependency-free while providing the functionality needed for real-world applications.

## Files Changed

- `tinyrouter.js` - Complete rewrite with enhanced functionality
- `README.md` - Comprehensive documentation update
- Package size increased from ~950 bytes to ~2.5KB minified+gzipped

## Breaking Changes

None - fully backward compatible

## Migration Required

No - existing code works unchanged

## Recommended Actions

Review new features and gradually adopt enhanced patterns where beneficial.
