(function(global) {
    function require(key) {
        return ({
            './querystring' : function() {
                var module = {};

                /* ../lib/querystring.js begin */
var hasOwnProp = Object.prototype.hasOwnProperty,
    toString = Object.prototype.toString,
    isArray = function(subject) {
        return toString.call(subject) === '[object Array]';
    };

var querystring = {

    /**
     * @param {String} str
     * @returns {String}
     */
    decode : function(str) {
        var ret;

        try {
            ret = decodeURIComponent(str.replace(/\+/g, '%20'));
        } catch (e) {
            ret = str;
        }

        return ret;
    },

    /**
     * Parse a string "param1=value1&param2=value2&param2&param3=value3"
     * and return object:
     * {
     *     param1 : value1,
     *     parma2 : [ value2, '' ],
     *     param3 : value3
     * }
     * @link http://nodejs.org/api/querystring.html#querystring_querystring_parse_str_sep_eq
     * @param {String} query
     * @param {String} [sep='&']
     * @param {String} [eq='=']
     * @returns {Object}
     */
    parse : function(query, sep, eq) {
        var params = {},
            queryParams,
            tmp, value, key,
            i, size;

        if (typeof query !== 'string' || query === '') {
            return params;
        }

        sep || (sep = '&');
        eq || (eq = '=');

        queryParams = query.split(sep);

        for (i = 0, size = queryParams.length; i < size; ++i) {
            tmp = queryParams[i].split(eq);
            value = typeof tmp[1] !== 'undefined' ? querystring.decode(tmp[1]) : '';
            key = querystring.decode(tmp[0]);

            if (hasOwnProp.call(params, key)) {
                if ( ! isArray(params[key])) {
                    params[key] = [ params[key], value ];
                } else {
                    params[key].push(value);
                }
            } else {
                params[key] = value;
            }
        }

        return params;
    },

    /**
     * Build querystring from object
     * @link http://nodejs.org/api/querystring.html#querystring_querystring_stringify_obj_sep_eq
     * @param {Object} params
     * @param {String} [sep='&']
     * @param {String} [eq='=']
     * @returns {String}
     */
    stringify : function(params, sep, eq) {
        var query = '',
            value,
            typeOf,
            tmpArray,
            i, size, key;

        if ( ! params) {
            return query;
        }

        sep || (sep = '&');
        eq || (eq = '=');

        for (key in params) {
            if (hasOwnProp.call(params, key)) {
                tmpArray = [].concat(params[key]);
                for (i = 0, size = tmpArray.length; i < size; ++i) {
                    typeOf = typeof tmpArray[i];

                    if (typeOf === 'object' || typeOf === 'undefined') {
                        value = '';
                    } else {
                        value = encodeURIComponent(tmpArray[i]);
                    }

                    query += sep + encodeURIComponent(key) + eq + value;
                }
            }
        }

        return query.substr(sep.length);
    }

};

module.exports = querystring;

/* ../lib/querystring.js end */


                return module.exports;
            },
            './route' : function() {
                var module = {};

                /* ../lib/route.js begin */
var hasOwnProp = Object.prototype.hasOwnProperty,
    has = function(ctx, name) {
        return hasOwnProp.call(ctx, name);
    },
    toString = Object.prototype.toString,
    isArray = function(subject) {
        return toString.call(subject) === '[object Array]';
    };

var querystring = require('./querystring');

var escape = (function() {
    var SPECIAL_CHARS = [ '/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\' ],
        SPECIAL_CHARS_REGEXP = new RegExp('(\\' + SPECIAL_CHARS.join('|\\') + ')', 'g');

    return function(text) {
        return text.replace(SPECIAL_CHARS_REGEXP, '\\$1');
    };
})();

var EXPANDO = String(Math.random()).substr(2, 5);

var PARAM_OPENED_CHAR = '<';
var PARAM_CLOSED_CHAR = '>';

var GROUP_OPENED_CHAR = '(';
var GROUP_CLOSED_CHAR = ')';

var PARAM_NAME_REGEXP_SOURCE = '[a-zA-Z_][\\w\\-]*';
var PARAM_VALUE_REGEXP_SOURCE = '[\\w\\-\\.~]+';

var PARSE_PARAMS_REGEXP =
    new RegExp(
        '(' +
            escape(PARAM_OPENED_CHAR) + PARAM_NAME_REGEXP_SOURCE +
            escape(PARAM_CLOSED_CHAR) + '|' +
            '[^' + escape(PARAM_OPENED_CHAR) + escape(PARAM_CLOSED_CHAR) + ']+' + '|' +
            escape(PARAM_OPENED_CHAR) + '|' +
            escape(PARAM_CLOSED_CHAR) +
            ')',
        'g');

var TRAILING_SLASH_PARAM_NAME = 'ts_' + EXPANDO;
var TRAILING_SLASH_PARAM_VALUE = '/';
var TRAILING_SLASH_PARAM_VALUE_ESCAPED = escape('/');

var QUERY_STRING_PARAM_NAME = 'qs_' + EXPANDO;

/**
 * @typedef {Object|String} RouteOptions If it's a string it means pattern for path match
 * @property {String} [name] Name of the route
 * @property {String} pattern Pattern for path match
 * @property {Object} [conditions] Conditions for params in pattern
 * @property {Object} [defaults] Defaults values for params in pattern
 * @property {Object} [data] Data that will be bonded with route
 * @property {Function} [filterMatch] Function that will be applied after match method with its result
 * @property {Function} [filterBuild] Function that will be applied before build method with input params
 */

/**
 * Creates new route
 * @constructor
 * @param {RouteOptions} options
 */
function Route(options) {
    if ( ! (this instanceof Route)) {
        return new Route(options);
    }

    typeof options === 'string' && (options = { pattern : options });

    if ( ! options || typeof options !== 'object') {
        throw new Error('You must specify options');
    }

    if (typeof options.pattern !== 'string') {
        throw new Error('You must specify the pattern of the route');
    }

    /**
     * @type {RouteOptions}
     * @private
     */
    this._options = options;

    options.conditions && typeof options.conditions === 'object' || (options.conditions = {});
    options.defaults && typeof options.defaults === 'object' || (options.defaults = {});

    if (options.isTrailingSlashOptional !== false) {
        options.pattern += GROUP_OPENED_CHAR + PARAM_OPENED_CHAR +
            TRAILING_SLASH_PARAM_NAME +
            PARAM_CLOSED_CHAR + GROUP_CLOSED_CHAR;
        options.conditions[TRAILING_SLASH_PARAM_NAME] = TRAILING_SLASH_PARAM_VALUE_ESCAPED;
    }

    /* query_string */
    options.pattern += GROUP_OPENED_CHAR +
        '?' + PARAM_OPENED_CHAR + QUERY_STRING_PARAM_NAME + PARAM_CLOSED_CHAR +
        GROUP_CLOSED_CHAR;
    options.conditions[QUERY_STRING_PARAM_NAME] = '.*';
    /* /query_string */

    /**
     * @type {Array}
     * @private
     */
    this._parts = this._parsePattern(options.pattern);

    this._buildParseRegExp();
    this._buildBuildFn();
}

/**
 * @param {String} pattern
 * @returns {Array}
 * @private
 */
Route.prototype._parsePattern = function(pattern) {
    var parts = [],
        part = '',
        character,
        i = 0, j, size,
        countOpened = 0,
        isFindingClosed = false,
        length = pattern.length;

    while (i < length) {
        character = pattern.charAt(i++);

        if (character === GROUP_OPENED_CHAR) {
            if (isFindingClosed) {
                ++countOpened;
                part += character;
            } else {
                this._parseParams(part, parts);
                part = '';
                countOpened = 0;
                isFindingClosed = true;
            }
        } else if (character === GROUP_CLOSED_CHAR) {
            /*jshint maxdepth:10*/
            if (isFindingClosed) {
                if (countOpened === 0) {
                    part = {
                        what : 'optional',
                        dependOnParams : [],
                        parts : this._parsePattern(part)
                    };

                    parts.push(part);

                    for (j = 0, size = part.parts.length; j < size; ++j) {
                        if (part.parts[j] && part.parts[j].what === 'param') {
                            part.dependOnParams.push(part.parts[j].name);
                        }
                    }

                    part = '';
                    isFindingClosed = false;
                } else {
                    --countOpened;
                    part += character;
                }
            } else {
                part += character;
            }
        } else {
            part += character;
        }
    }

    this._parseParams(part, parts);

    return parts;
};

/**
 * @param {String} pattern
 * @param {Array} parts
 * @private
 */
Route.prototype._parseParams = function(pattern, parts) {
    var matches = pattern.match(PARSE_PARAMS_REGEXP),
        i, size,
        part;

    if (matches) {
        for (i = 0, size = matches.length; i < size; ++i) {
            part = matches[i];

            if (part.charAt(0) === PARAM_OPENED_CHAR && part.charAt(part.length - 1) === PARAM_CLOSED_CHAR) {
                parts.push({
                    what : 'param',
                    name : part.substr(1, part.length - 2)
                });
            } else {
                parts.push(part);
            }
        }
    }
};

/**
 * @private
 */
Route.prototype._buildParseRegExp = function() {
    this._reqExpParamsMap = [];
    this._parseRegExpSource = '^' + this._buildParseRegExpParts(this._parts) + '$';
    this._parseRegExp = new RegExp(this._parseRegExpSource);
};

/**
 * @param {Array} parts
 * @returns {String}
 * @private
 */
Route.prototype._buildParseRegExpParts = function(parts) {
    var ret = '',
        i, size,
        part;

    for (i = 0, size = parts.length; i < size; ++i) {
        part = parts[i];

        if (typeof part === 'string') {
            ret += escape(part);
        } else if (part.what === 'param') {
            this._reqExpParamsMap.push(part.name);
            ret += '(' + this._buildParamValueRegExpSource(part.name) + ')';
        } else {
            ret += '(?:' + this._buildParseRegExpParts(part.parts) + ')?';
        }
    }

    return ret;
};

/**
 * @param {String} paramName
 * @returns {String}
 * @private
 */
Route.prototype._buildParamValueRegExpSource = function(paramName) {
    var ret,
        condition = this._options.conditions[paramName];

    if (condition) {
        if (isArray(condition)) {
            ret = '(?:' + condition.join('|') + ')';
        } else {
            ret = condition + '';
        }
    } else {
        ret =  PARAM_VALUE_REGEXP_SOURCE;
    }

    return ret;
};

/**
 * @private
 */
Route.prototype._buildBuildFn = function() {
    this._mainParamsMap = {};
    this._buildFnSource = 'var h=({}).hasOwnProperty;return ' + this._buildBuildFnParts(this._parts) + ';';
    /*jshint evil:true */
    this._buildFn = new Function('p', this._buildFnSource);
};

/**
 * @param {Array} parts
 * @returns {String}
 * @private
 */
Route.prototype._buildBuildFnParts = function(parts) {
    var ret = '""',
        i, sizeI, j, sizeJ,
        part, name,
        defaults = this._options.defaults;

    for (i = 0, sizeI = parts.length; i < sizeI; ++i) {
        part = parts[i];

        if (typeof part === 'string') {
            ret += '+"' + escape(part) + '"' ;
        } else if (part.what === 'param') {
            this._mainParamsMap[part.name] = true;
            ret += '+(h.call(p,"' + escape(part.name) + '")?' +
                'p["' + escape(part.name) + '"]:' +
                (has(defaults, part.name) ?
                 '"' + escape(defaults[part.name]) +  '"' :
                 '""') +
                ')';
        } else {
            ret += '+((false';

            for (j = 0, sizeJ = part.dependOnParams.length; j < sizeJ; ++j) {
                name = part.dependOnParams[j];

                ret += '||(h.call(p,"' + escape(name) + '")' +
                    (has(defaults, name) ?
                     '&&p["' + escape(name) + '"]!=="' +
                         escape(defaults[name]) + '"' :
                     '') +
                    ')';
            }

            ret += ')?(' + this._buildBuildFnParts(part.parts) + '):"")';
        }
    }

    return ret;
};

/**
 * @param {Object|Function} data
 * @returns {Boolean}
 * @private
 */
Route.prototype._isDataMatched = function(data) {
    var routeData = this._options.data,
        key;

    if (typeof data === 'function') {
        return Boolean(data(routeData));
    } else if (data && typeof data === 'object') {
        for (key in data) {
            if (has(data, key)) {
                if ( ! routeData || typeof routeData !== 'object' || routeData[key] !== data[key]) {
                    return false;
                }
            }
        }
    }

    return true;
};

/**
 * Matches path with route
 * @param {String} path
 * @param {Function|Object} [data]
 * @returns {Object|null}
 */
Route.prototype.match = function(path, data) {
    var ret = null,
        paramName,
        matches,
        i, size,
        key,
        queryParams,
        options = this._options,
        filter = options.postMatch,
        defaults = options.defaults;

    if (typeof path !== 'string' || (data && ! this._isDataMatched(data))) {
        return ret;
    }

    matches = path.match(this._parseRegExp);

    if (matches) {
        ret = {};

        for (i = 1, size = matches.length; i < size; ++i) {
            if (typeof matches[i] !== 'undefined' && /* for IE lt 9*/ matches[i] !== '') {
                paramName = this._reqExpParamsMap[i - 1];
                if (paramName !== TRAILING_SLASH_PARAM_NAME) {
                    ret[paramName] = matches[i];
                } else if (path.charAt(path.length - 2) === TRAILING_SLASH_PARAM_VALUE) {
                    return null;
                }
            }
        }

        queryParams = querystring.parse(ret[QUERY_STRING_PARAM_NAME]);
        for (key in queryParams) {
            if (has(queryParams, key) && ! has(ret, key)) {
                ret[key] = queryParams[key];
            }
        }
        delete ret[QUERY_STRING_PARAM_NAME];

        for (key in defaults) {
            if (has(defaults, key) && ! has(ret, key)) {
                ret[key] = defaults[key];
            }
        }
    }

    if (ret && typeof filter === 'function') {
        ret = filter(ret);
        if ( ! (ret && typeof ret === 'object')) {
            ret = null;
        }
    }

    return ret;
};

/**
 * Build path from params
 * @param {Object} params
 * @returns {String}
 */
Route.prototype.build = function(params) {
    var newParams = {},
        queryParams = {},
        queryString,
        key,
        filter = this._options.preBuild;

    if (typeof filter === 'function') {
        params = filter(params);
    }

    for (key in params) {
        if (
            has(params, key) &&
                params[key] !== null &&
                typeof params[key] !== 'undefined'
            ) {
            if (this._mainParamsMap[key]) {
                newParams[key] = params[key];
            } else {
                queryParams[key] = params[key];
            }
        }
    }

    queryString = querystring.stringify(queryParams);
    queryString && (newParams[QUERY_STRING_PARAM_NAME] = queryString);

    return this._buildFn(newParams);
};

/**
 * Returns binded with route data
 * @returns {*}
 */
Route.prototype.getData = function() {
    return this._options.data;
};

/**
 * Returns name of the route
 * @returns {*}
 */
Route.prototype.getName = function() {
    return this._options.name;
};

module.exports = Route;

/* ../lib/route.js end */


                return module.exports;
            },
            './router' : function() {
                var module = {};

                /* ../lib/router.js begin */
var Route = require('./route');

/**
 * Creates new Router
 * @constructor
 */
function Router() {
    if ( ! (this instanceof Router)) {
        return new Router();
    }

    this._routes = [];
    this._routesByName = {};
}

/**
 * Add route
 * @param {RouteOptions} options
 * @returns {Route}
 */
Router.prototype.addRoute = function(options) {
    var route,
        name;

    route = new Route(options);

    this._routes.push(route);
    name = route.getName();
    name && (this._routesByName[name] = route);

    return route;
};

/**
 * Returns all successfully matched routes
 * @returns {[ Route, Object ][]}
 */
Router.prototype.find = function() {
    var ret = [],
        parsed,
        i, size,
        routes = this._routes;

    for (i = 0, size = routes.length; i < size; ++i) {
        parsed = routes[i].match.apply(routes[i], arguments);
        if (parsed !== null) {
            ret.push([ routes[i], parsed ]);
        }
    }

    return ret;
};

/**
 * Returns first successfully matched route
 * @returns {[ Route, Object ]|null}
 */
Router.prototype.findFirst = function() {
    var parsed,
        i, size,
        routes = this._routes;

    for (i = 0, size = routes.length; i < size; ++i) {
        parsed = routes[i].match.apply(routes[i], arguments);
        if (parsed !== null) {
            return [ routes[i], parsed ];
        }
    }

    return null;
};

/**
 * Returns a route by its name
 * @param {String} name
 * @returns {Route}
 */
Router.prototype.getRouteByName = function(name) {
    return this._routesByName[name] || null;
};

/**
 * @static
 * @type {Route}
 */
Router.Route = Route;

module.exports = Router;

/* ../lib/router.js end */


                return module.exports;
            }
        })[key]();
    }

    var Router = require('./router'),
        defineAsGlobal = true;

    // CommonJS
    if (global.module && typeof module.exports === 'object') {
        module.exports = Router;
        defineAsGlobal = false;
    }

    // YModules support
    if (global.modules && modules.define && modules.require) {
        modules.define('susanin', function(provide) {
            provide(Router);
        });
        defineAsGlobal = false;
    }

    // AMD support
    if (typeof global.define === 'function' && define.amd) {
        define(function() {
            return Router;
        });
        defineAsGlobal = false;
    }

    defineAsGlobal && (global.Susanin = Router);

})(this);