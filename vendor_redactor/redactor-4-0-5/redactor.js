/*
    Redactor
    Version 4.0.5
    Updated: March 5, 2024

    http://imperavi.com/redactor/

    Copyright (c) 2009-2024, Imperavi Ltd.
    License: http://imperavi.com/redactorx/license/
*/
if (typeof CodeMirror === 'undefined') { var CodeMirror; }
(function() {
var DomCache = [0];
var DomExpando = 'data' + new Date().getTime();
var DomVersion30 = '15.02.2024';
var Dom = function(selector, context) {
    return this.parse(selector, context);
};

Dom.ready = function(fn) {
    document.addEventListener('DOMContentLoaded', fn);
};

Dom.prototype = {
    get length() {
        return this.nodes.length;
    },
    parse(s, c) {
        var n;
        var rehtml = /^\s*<(\w+|!)[^>]*>/;

        if (!s) {
            n = [];
        }
        else if (s instanceof Dom) {
            this.nodes = s.nodes;
            return s;
        }
        else if (rehtml.test(s)) {
            n = this.create(s);
        }
        else if (typeof s !== 'string') {
            if (s.nodeType && s.nodeType === 11) n = s.childNodes;
            else n = (s.nodeType || this._isWindowNode(s)) ? [s] : s;
        }
        else {
            n = this._query(s, c);
        }

        this.nodes = this._slice(n);
    },
    create(html) {
        if (/^<(\w+)\s*\/?>(?:<\/\1>|)$/.test(html)) {
            return [document.createElement(RegExp.$1)];
        }

        var elmns = [];
        var c = document.createElement('div');
        c.innerHTML = html;
        for (var i = 0, l = c.childNodes.length; i < l; i++) {
            elmns.push(c.childNodes[i]);
        }

        return elmns;
    },

    // dataset/dataget
    dataset(key, value) {
        return this.each(function($node) {
            DomCache[this.dataindex($node.get())][key] = value;
        });
    },
    dataget(key) {
        return DomCache[this.dataindex(this.get())][key];
    },
    dataindex(el) {
        var index = el[DomExpando];
        var nextIndex = DomCache.length;

        if (!index) {
            index = nextIndex;
            if (el) el[DomExpando] = nextIndex;
            DomCache[index] = {};
        }

        return index;
    },

    // add
    add(n) {
        this.nodes = this.nodes.concat(this._array(n));
        return this;
    },

    // get
    get(index) {
        return this.nodes[(index || 0)] || false;
    },
    getAll() {
        return this.nodes;
    },
    eq(index) {
        return new Dom(this.nodes[index]);
    },
    first() {
        return new Dom(this.nodes[0]);
    },
    last() {
        return new Dom(this.nodes[this.nodes.length - 1]);
    },
    contents() {
        return this.get().childNodes;
    },

    // loop
    each(fn) {
        var len = this.nodes.length;
        for (var i = 0; i < len; i++) {
            fn.call(this, new Dom(this.nodes[i]), i);
        }

        return this;
    },

    // traversing
    is(s) {
        return (this.filter(s).length > 0);
    },
    filter(s) {
        var fn;
        if (s === undefined) {
            return this;
        }
        else if (typeof s === 'function') {
            fn = function(node) { return s(new Dom(node)); };
        }
        else {
            fn = function(node) {
                if ((s && s.nodeType) || s instanceof Node) {
                    return (s === node);
                }
                else {
                    node.matches = node.matches || node.msMatchesSelector || node.webkitMatchesSelector;
                    return (node.nodeType === 1) ? node.matches(s || '*') : false;
                }
            };
        }

        return new Dom(this.nodes.filter.call(this.nodes, fn));
    },
    not(filter) {
        return this.filter(function(node) { return !new Dom(node).is(filter || true); });
    },
    find(s) {
        var n = [];
        this.each(function($n) {
            var node = $n.get();
            var ns = this._query(s, node);
            for (var i = 0; i < ns.length; i++) {
                n.push(ns[i]);
            }
        });

        return new Dom(n);
    },
    children(s) {
        var n = [];
        this.each(function($n) {
            var node = $n.get();
            if (node.children) {
                var ns = node.children;
                for (var i = 0; i < ns.length; i++) {
                    n.push(ns[i]);
                }
            }
        });

        return new Dom(n).filter(s);
    },
    parent(s) {
        var node = this.get();
        var p = (node.parentNode) ? node.parentNode : false;
        return (p) ? new Dom(p).filter(s) : new Dom();
    },
    parents(s, c) {
        c = this._context(c);

        var n = [];
        this.each(function($n) {
            var node = $n.get();
            var p = node.parentNode;
            while (p && p !== c) {
                if (s) {
                    if (new Dom(p).is(s)) { n.push(p); }
                }
                else {
                    n.push(p);
                }

                p = p.parentNode;
            }
        });

        return new Dom(n);
    },
    closest(s, c) {
        c = this._context(c);
        s = (typeof s === 'string') ? s : this._node(s);

        var n = [];
        var isNode = (s && s.nodeType);
        this.each(function($n) {
            var node = $n.get();
            do {
                if (node && ((isNode && node === s) || new Dom(node).is(s))) {
                    return n.push(node);
                }
            } while ((node = node.parentNode) && node !== c);
        });

        return new Dom(n);
    },
    next(s) {
        return this._sibling(s, 'nextSibling');
    },
    nextElement(s) {
        return this._sibling(s, 'nextElementSibling');
    },
    prev(s) {
        return this._sibling(s, 'previousSibling');
    },
    prevElement(s) {
        return this._sibling(s, 'previousElementSibling');
    },

    // css
    css(name, value) {
        if (value === undefined && (typeof name !== 'object')) {
            var node = this.get();
            if (name === 'width' || name === 'height') {
                return (node.style) ? this._getHeightOrWidth(name) + 'px' : undefined;
            }
            else {
                return (node.style) ? getComputedStyle(node, null)[name] : undefined;
            }
        }

        // set
        return this.each(function($n) {
            var node = $n.get();
            var o = {}, val;
            if (typeof name === 'object') o = name;
            else o[name] = value;

            for (var key in o) {
                if (node.style) {
                    node.style[key] = o[key];
                }
            }
        });
    },

    // attr
    attr(name, value, data) {
        data = (data) ? 'data-' : '';

        if (typeof value === 'undefined' && (typeof name !== 'object')) {
            var node = this.get();
            if (node && node.nodeType !== 3) {
                return (name === 'checked') ? node.checked : this._boolean(node.getAttribute(data + name));
            }
            else {
                return;
            }
        }

        // set
        return this.each(function($n) {
            var node = $n.get();
            var o = {};
            if (typeof name === 'object') o = name;
            else o[name] = value;

            for (var key in o) {
                if (node.nodeType !== 3) {
                    if (key === 'checked') node.checked = o[key];
                    else node.setAttribute(data + key, o[key]);
                }
            }
        });
    },
    data(name, value) {
        if (name === undefined || name === true) {
            var reDataAttr = /^data-(.+)$/;
            var attrs = this.get().attributes;

            var data = {};
            var replacer = function (g) { return g[1].toUpperCase(); };

            for (var key in attrs) {
                if (attrs[key] && reDataAttr.test(attrs[key].nodeName)) {
                    var dataName = attrs[key].nodeName.match(reDataAttr)[1];
                    var val = attrs[key].value;
                    if (name !== true) {
                        dataName = dataName.replace(/-([a-z])/g, replacer);
                    }

                    if (val.search(/^{/) !== -1) val = this._object(val);
                    else val = (this._number(val)) ? parseFloat(val) : this._boolean(val);

                    data[dataName] = val;
                }
            }

            return data;
        }

        return this.attr(name, value, true);
    },
    val(value) {
        if (value === undefined) {
            var el = this.get();
            if (el.type && el.type === 'checkbox') return el.checked;
            else return el.value;
        }

        return this.each(function($n) {
            var el = $n.get();
            if (el.type && el.type === 'checkbox') el.checked = value;
            else el.value = value;
        });
    },
    removeAttr(value) {
        return this.each(function($n) {
            var node = $n.get();
            var fn = function(name) { if (node.nodeType !== 3) node.removeAttribute(name); };
            value.split(' ').forEach(fn);
        });
    },

    // class
    addClass(value) {
        return this._eachClass(value, 'add');
    },
    removeClass(value) {
        return this._eachClass(value, 'remove');
    },
    toggleClass(value) {
        return this._eachClass(value, 'toggle');
    },
    hasClass(value) {
        var node = this.get();
        if (value) {
            var classes = value.split(' ');
            return (node.classList) ? node.matches('.' + classes.join('.')) : false;
        }
        else {
            return false;
        }
    },

    // html & text
    empty() {
        return this.each(function($n) { $n.get().innerHTML = ''; });
    },
    html(html) {
        return (html === undefined) ? (this.get().innerHTML || '') : this.empty().append(html);
    },
    text(text) {
        return (text === undefined) ? (this.get().textContent || '') : this.each(function($n) { $n.get().textContent = text; });
    },

    // manipulation
    after(html) {
        return this._inject(html, function(frag, node) {
            if (typeof frag === 'string') {
                node.insertAdjacentHTML('afterend', frag);
            }
            else {
                if (node.parentNode !== null) {
                    for (var i = frag instanceof Node ? [frag] : this._array(frag).reverse(), s = 0; s < i.length; s++) {
                        node.parentNode.insertBefore(i[s], node.nextSibling);
                    }
                }
            }

            return node;
        });
    },
    before(html) {
        return this._inject(html, function(frag, node) {
            if (typeof frag === 'string') {
                node.insertAdjacentHTML('beforebegin', frag);
            }
            else {
                var elms = (frag instanceof Node) ? [frag] : this._array(frag);
                for (var i = 0; i < elms.length; i++) {
                    node.parentNode.insertBefore(elms[i], node);
                }
            }

            return node;
        });
    },
    append(html) {
        return this._inject(html, function(frag, node) {
            if (typeof frag === 'string' || typeof frag === 'number') {
                node.insertAdjacentHTML('beforeend', frag);
            }
            else {
                var elms = (frag instanceof Node) ? [frag] : this._array(frag);
                for (var i = 0; i < elms.length; i++) {
                    node.appendChild(elms[i]);
                }
            }

            return node;
        });
    },
    prepend(html) {
        return this._inject(html, function(frag, node) {
            if (typeof frag === 'string' || typeof frag === 'number') {
                node.insertAdjacentHTML('afterbegin', frag);
            }
            else {
                var elms = (frag instanceof Node) ? [frag] : this._array(frag).reverse();
                for (var i = 0; i < elms.length; i++) {
                    node.insertBefore(elms[i], node.firstChild);
                }
            }

            return node;
        });
    },
    wrap(html) {
        return this._inject(html, function(frag, node) {
            var wrapper = (typeof frag === 'string' || typeof frag === 'number') ? this.create(frag)[0] : (frag instanceof Node) ? frag : this._array(frag)[0];

            if (node.parentNode) {
                node.parentNode.insertBefore(wrapper, node);
            }

            wrapper.appendChild(node);
            return wrapper;
        });
    },
    unwrap() {
        return this.each(function($n) {
            var node = $n.get();
            var docFrag = document.createDocumentFragment();
            while (node.firstChild) {
                var child = node.removeChild(node.firstChild);
                docFrag.appendChild(child);
            }

            if (node.parentNode) node.parentNode.replaceChild(docFrag, node);
        });
    },
    replaceWith(html) {
        return this._inject(html, function(frag, node) {
            var docFrag = document.createDocumentFragment();
            var elms = (typeof frag === 'string' || typeof frag === 'number') ? this.create(frag) : (frag instanceof Node) ? [frag] : this._array(frag);

            for (var i = 0; i < elms.length; i++) {
                docFrag.appendChild(elms[i]);
            }

            var result = docFrag.childNodes[0];
            if (node.parentNode) {
                node.parentNode.replaceChild(docFrag, node);
            }

            return result;
        });
    },
    remove() {
        return this.each(function($n) {
            var node = $n.get();
            if (node.parentNode) node.parentNode.removeChild(node);
        });
    },
    clone(events) {
        var n = [];
        this.each(function($n) {
            var node = $n.get();
            var copy = this._clone(node);
            if (events) copy = this._cloneEvents(node, copy);
            n.push(copy);
        });

        return new Dom(n);
    },

    // show/hide
    show() {
        return this.each(function($n) {
            var node = $n.get();
            if (!node.style || !this._hasDisplayNone(node)) return;

            var target = node.getAttribute('domTargetShow');
            node.style.setProperty('display', (target) ? target : 'block', 'important');
            node.removeAttribute('domTargetShow');

        }.bind(this));
    },
    hide() {
        return this.each(function($n) {
            var node = $n.get();
            if (!node.style || this._hasDisplayNone(node)) return;

            var display = node.style.display;
            if (display !== 'block') node.setAttribute('domTargetShow', display);
            node.style.setProperty('display', 'none', 'important');
        });
    },

    // dimensions
    scrollTop(value) {
        var node = this.get();
        var isWindow = this._isWindowNode(node);
        var isDocument = (node.nodeType === 9);
        var el = (isDocument) ? (node.scrollingElement || node.body.parentNode || node.body || node.documentElement) : node;

        if (typeof value !== 'undefined') {
            value = parseInt(value);
            if (isWindow) node.scrollTo(0, value);
            else el.scrollTop = value;
            return;
        }

        return (isWindow) ? node.pageYOffset : el.scrollTop;
    },
    offset() {
        return this._getPos('offset');
    },
    position() {
        return this._getPos('position');
    },
    width(value) {
        return (value !== undefined) ? this.css('width', parseInt(value) + 'px') : this._getSize('width', 'Width');
    },
    height(value) {
        return (value !== undefined) ? this.css('height', parseInt(value) + 'px') : this._getSize('height', 'Height');
    },
    outerWidth() {
        return this._getSize('width', 'Width', 'outer');
    },
    outerHeight() {
        return this._getSize('height', 'Height', 'outer');
    },
    innerWidth() {
        return this._getSize('width', 'Width', 'inner');
    },
    innerHeight() {
        return this._getSize('height', 'Height', 'inner');
    },

    // events
    click() {
        return this._trigger('click');
    },
    focus() {
        return this._trigger('focus');
    },
    blur() {
        return this._trigger('blur');
    },
    on(names, handler, one) {
        return this.each(function($n) {
            var node = $n.get();
            var events = names.split(' ');
            for (var i = 0; i < events.length; i++) {
                var event = this._getEventName(events[i]);
                var namespace = this._getEventNamespace(events[i]);

                handler = (one) ? this._getOneHandler(handler, names) : handler;
                node.addEventListener(event, handler);

                node._e = node._e || {};
                node._e[namespace] = node._e[namespace] || {};
                node._e[namespace][event] = node._e[namespace][event] || [];
                node._e[namespace][event].push(handler);
            }

        });
    },
    one(events, handler) {
        return this.on(events, handler, true);
    },
    off(names, handler) {
        var testEvent = function(name, key, event) { return (name === event); };
        var testNamespace = function(name, key, event, namespace) { return (key === namespace); };
        var testEventNamespace = function(name, key, event, namespace) { return (name === event && key === namespace); };
        var testPositive = function() { return true; };

        if (names === undefined) {
            // all
            return this.each(function($n) {
                this._offEvent($n.get(), false, false, handler, testPositive);
            });
        }

        return this.each(function($n) {
            var node = $n.get();
            var events = names.split(' ');

            for (var i = 0; i < events.length; i++) {
                var event = this._getEventName(events[i]);
                var namespace = this._getEventNamespace(events[i]);

                // 1) event without namespace
                if (namespace === '_events') this._offEvent(node, event, namespace, handler, testEvent);
                // 2) only namespace
                else if (!event && namespace !== '_events') this._offEvent(node, event, namespace, handler, testNamespace);
                // 3) event + namespace
                else this._offEvent(node, event, namespace, handler, testEventNamespace);
            }
        });
    },

    // form
    serialize(asObject) {
        var obj = {};
        var elms = this.get().elements;
        for (var i = 0; i < elms.length; i++) {
            var el = elms[i];
            if (/(checkbox|radio)/.test(el.type) && !el.checked) continue;
            if (!el.name || el.disabled || el.type === 'file') continue;

            if (el.type === 'select-multiple') {
                for (var z = 0; z < el.options.length; z++) {
                    var opt = el.options[z];
                    if (opt.selected) obj[el.name] = opt.value;
                }
            }

            obj[el.name] = (this._number(el.value)) ? parseFloat(el.value) : this._boolean(el.value);
        }

        return (asObject) ? obj : this._params(obj);
    },

    // animation
    scroll() {
        this.get().scrollIntoView({ behavior: 'smooth' });
    },
    fadeIn(speed, fn) {
        var anim = this._anim(speed, fn, 500);

        return this.each(function($n) {
            $n.css({ 'display': 'block', 'opacity': 0, 'animation': 'fadeIn ' + anim.speed + 's ease-in-out' }).removeClass('hidden');
            $n.one('animationend', function() {
                $n.css({ 'opacity': '', 'animation': '' });
                if (anim.fn) anim.fn($n);
            });
        });
    },
    fadeOut(speed, fn) {
        var anim = this._anim(speed, fn, 300);

        return this.each(function($n) {
            $n.css({ 'opacity': 1, 'animation': 'fadeOut ' + anim.speed + 's ease-in-out' });
            $n.one('animationend', function() {
                $n.css({ 'display': 'none', 'opacity': '', 'animation': '' });
                if (anim.fn) anim.fn($n);
            });
        });
    },
    slideUp(speed, fn) {
        var anim = this._anim(speed, fn, 300);

        return this.each(function($n) {
            $n.height($n.height());
            $n.css({ 'overflow': 'hidden', 'animation': 'slideUp ' + anim.speed + 's ease-out' });
            $n.one('animationend', function() {
                $n.css({ 'display': 'none', 'height': '', 'animation': '' });
                if (anim.fn) anim.fn($n);
            });
        });
    },
    slideDown(speed, fn) {
        var anim = this._anim(speed, fn, 400);

        return this.each(function($n) {
            $n.height($n.height());
            $n.css({ 'display': 'block', 'overflow': 'hidden', 'animation': 'slideDown ' + anim.speed + 's ease-in-out' }).removeClass('hidden');
            $n.one('animationend', function() {
                $n.css({ 'overflow': '', 'height': '', 'animation': '' });
                if (anim.fn) anim.fn($n);
            });
        });
    },

    // private
    _queryContext(s, c) {
        c = this._context(c);
        return (c.nodeType !== 3 && typeof c.querySelectorAll === 'function') ? c.querySelectorAll(s) : [];
    },
    _query(s, c) {
        var d = document;
        if (c) {
            return this._queryContext(s, c);
        }
        else if (/^[.#]?[\w-]*$/.test(s)) {
            if (s[0] === '#') {
                var el = d.getElementById(s.slice(1));
                return el ? [el] : [];
            }
            if (s[0] === '.') {
                return d.getElementsByClassName(s.slice(1));
            }

            return d.getElementsByTagName(s);
        }

        return d.querySelectorAll(s);
    },
    _context(c) {
        return (!c) ? document : ((typeof c === 'string') ? document.querySelector(c) : c);
    },
    _sibling(s, method) {
        var isNode = (s && s.nodeType);
        var sibling;

        this.each(function($n) {
            var node = $n.get();
            do {
                node = node[method];
                 if (node && ((isNode && node === s) || new Dom(node).is(s))) {
                    sibling = node;
                    return;
                }
            }
            while (node);
        });

        return new Dom(sibling);
    },
    _slice(o) {
        return (!o || o.length === 0) ? [] : (o.length) ? [].slice.call(o.nodes || o) : [o];
    },
    _array(o) {
        if (o === undefined) return [];
        else if (o instanceof NodeList) {
            return Array.from(o);
        }

        return (o instanceof Dom) ? o.nodes : o;
    },
    _object(str) {
        var jsonStr = str.replace(/(\w+:)|(\w+ :)/g, function(matchedStr) {
            return '"' + matchedStr.substring(0, matchedStr.length - 1) + '":';
        });

        return JSON.parse(jsonStr);
    },
    _params(obj) {
        var params = '';
        Object.keys(obj).forEach(function(key) {
            params += '&' + this._encodeUri(key) + '=' + this._encodeUri(obj[key]);
        }.bind(this));

        return params.replace(/^&/, '');
    },
    _boolean(str) {
        if (str === 'true') return true;
        else if (str === 'false') return false;

        return str;
    },
    _number(str) {
        return !isNaN(str) && !isNaN(parseFloat(str));
    },
    _inject(html, fn) {
        var len = this.nodes.length;
        var nodes = [];
        while (len--) {
            var res = (typeof html === 'function') ? html.call(this, this.nodes[len]) : html;
            var el = (len === 0) ? res : this._clone(res);
            var node = fn.call(this, el, this.nodes[len]);

            if (node) {
                if (node.dom) nodes.push(node.get());
                else nodes.push(node);
            }
        }

        return new Dom(nodes);
    },
    _clone(node) {
        if (typeof node === 'undefined') return;
        if (typeof node === 'string') return node;
        else if (node instanceof Node || node.nodeType) return node.cloneNode(true);
        else if ('length' in node) {
            return [].map.call(this._array(node), function(el) { return el.cloneNode(true); });
        }
    },
    _cloneEvents(node, copy) {
        var events = node._e;
        if (events) {
            copy._e = events;
            for (var name in events._events) {
                if (events._events.hasOwnProperty(name)) {
                    for (var i = 0; i < events._events[name].length; i++) {
                        copy.addEventListener(name, events._events[name][i]);
                    }
                }
            }
        }

        return copy;
    },
    _trigger(name) {
        var node = this.get();
        if (node && node.nodeType !== 3) node[name]();
        return this;
    },
    _encodeUri(str) {
        return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
    },
    _getSize(name, cname) {
        var el = this.get();
        var value = 0;
        if (el.nodeType === 3) {
            value = 0;
        }
        else if (el.nodeType === 9) {
            value = this._getDocSize(el, cname);
        }
        else if (this._isWindowNode(el)) {
            value = window['inner' + cname];
        }
        else {
            value = this._getHeightOrWidth(name);
        }

        return Math.round(value);
    },
    _getDocSize(node, type) {
        var body = node.body, html = node.documentElement;
        return Math.max(body['scroll' + type], body['offset' + type], html['client' + type], html['scroll' + type], html['offset' + type]);
    },
    _getPos(type) {
        var node = this.get();
        var dim = { top: 0, left: 0 };
        if (node.nodeType === 3 || this._isWindowNode(node) || node.nodeType === 9) {
            return dim;
        }
        else if (type === 'position') {
            return { top: node.offsetTop, left: node.offsetLeft };
        }
        else if (type === 'offset') {
            var rect = node.getBoundingClientRect();
            var doc = node.ownerDocument;
            var docElem = doc.documentElement;
            var win = doc.defaultView;

            return {
                top: rect.top + win.pageYOffset - docElem.clientTop,
                left: rect.left + win.pageXOffset - docElem.clientLeft
            };
        }

        return dim;
    },
    _getHeightOrWidth(name, type) {
        var cname = name.charAt(0).toUpperCase() + name.slice(1);
        var mode = (type) ? type : 'offset';
        var result = 0;
        var el = this.get();
        var style = getComputedStyle(el, null);
        var $targets = this.parents().filter(function($n) {
            var node = $n.get();
            return (node.nodeType === 1 && getComputedStyle(node, null).display === 'none') ? node : false;
        });

        if (style.display === 'none') $targets.add(el);
        if ($targets.length !== 0) {
            var fixStyle = 'visibility: hidden !important; display: block !important;';
            var tmp = [];

            $targets.each(function($n) {
                var thisStyle = $n.attr('style');
                if (thisStyle !== null) tmp.push(thisStyle);
                $n.attr('style', (thisStyle !== null) ? thisStyle + ';' + fixStyle : fixStyle);
            });

            result = el[mode + cname];

            $targets.each(function($n, i) {
                if (tmp[i] === undefined) $n.removeAttr('style');
                else $n.attr('style', tmp[i]);
            });
        }
        else {
            result = el[mode + cname];
        }

        return result;
    },
    _eachClass(value, type) {
        return this.each(function($n) {
            if (value) {
                var node = $n.get();
                var fn = function(name) { if (node.classList) node.classList[type](name); };
                value.split(' ').forEach(fn);
            }
        });
    },
    _getOneHandler(handler, events) {
        var self = this;
        return function() {
            handler.apply(this, arguments);
            self.off(events);
        };
    },
    _getEventNamespace(event) {
        var arr = event.split('.');
        var namespace = (arr[1]) ? arr[1] : '_events';
        return (arr[2]) ? namespace + arr[2] : namespace;
    },
    _getEventName(event) {
        return event.split('.')[0];
    },
    _offEvent(node, event, namespace, handler, condition) {
        for (var key in node._e) {
            if (node._e.hasOwnProperty(key)) {
                for (var name in node._e[key]) {
                    if (condition(name, key, event, namespace)) {
                        var handlers = node._e[key][name];
                        for (var i = 0; i < handlers.length; i++) {
                            if (typeof handler !== 'undefined' && handlers[i].toString() !== handler.toString()) {
                                continue;
                            }

                            node.removeEventListener(name, handlers[i]);
                            node._e[key][name].splice(i, 1);

                            if (node._e[key][name].length === 0) delete node._e[key][name];
                            if (Object.keys(node._e[key]).length === 0) delete node._e[key];
                        }
                    }
                }
            }
        }
    },
    _hasDisplayNone(el) {
        return (el.style.display === 'none') || ((el.currentStyle) ? el.currentStyle.display : getComputedStyle(el, null).display) === 'none';
    },
    _anim(speed, fn, speedDef) {
        if (typeof speed === 'function') {
            fn = speed;
            speed = speedDef;
        }
        else {
            speed = speed || speedDef;
        }

        return {
            fn: fn,
            speed: speed/1000
        };
    },
    _isWindowNode(node) {
        return (node === window || (node.parent && node.parent === window));
    },
    _node(el) {
        return new Dom(el).get();
    }
};
// Version 2.0 | 26.11.2021
var Ajax = {};

Ajax.settings = {};
Ajax.post = function(options) { return new AjaxRequest('post', options); };
Ajax.get = function(options) { return new AjaxRequest('get', options); };
Ajax.request = function(method, options) { return new AjaxRequest(method, options); };

var AjaxRequest = function(method, options) {
    var defaults = {
        method: method,
        url: '',
        before() {},
        success() {},
        error() {},
        data: false,
        async: true,
        headers: {}
    };

    this.p = this.extend(defaults, options);
    this.p = this.extend(this.p, Ajax.settings);
    this.p.method = this.p.method.toUpperCase();

    this.prepareData();

    this.xhr = new XMLHttpRequest();
    this.xhr.open(this.p.method, this.p.url, this.p.async);

    this.setHeaders();

    var before = (typeof this.p.before === 'function') ? this.p.before(this.xhr) : true;
    if (before !== false) {
        this.send();
    }
};

AjaxRequest.prototype = {
    extend(obj1, obj2) {
        if (obj2) {
            Object.keys(obj2).forEach(function(key) {
                obj1[key] = obj2[key];
            });
        }
        return obj1;
    },
    prepareData() {
        if (['POST', 'PUT'].indexOf(this.p.method) !== -1 && !this.isFormData()) this.p.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        if (typeof this.p.data === 'object' && !this.isFormData()) this.p.data = this.toParams(this.p.data);
        if (this.p.method === 'GET') {
            var sign = (this.p.url.search(/\?/) !== -1) ? '&' : '?';
            this.p.url = (this.p.data) ? this.p.url + sign + this.p.data : this.p.url;
        }
    },
    setHeaders() {
        this.xhr.setRequestHeader('X-Requested-With', this.p.headers['X-Requested-With'] || 'XMLHttpRequest');
        Object.keys(this.p.headers).forEach(function(key) {
            this.xhr.setRequestHeader(key, this.p.headers[key]);
        }.bind(this));
    },
    isFormData() {
        return (typeof window.FormData !== 'undefined' && this.p.data instanceof window.FormData);
    },
    isComplete() {
        return !(this.xhr.status < 200 || (this.xhr.status >= 300 && this.xhr.status !== 304));
    },
    send() {
        if (this.p.async) {
            this.xhr.onload = this.loaded.bind(this);
            this.xhr.send(this.p.data);
        }
        else {
            this.xhr.send(this.p.data);
            this.loaded.call(this);
        }
    },
    loaded() {
        var response;
        if (this.isComplete()) {
            response = this.parseResponse();
            if (typeof this.p.success === 'function') this.p.success(response, this.xhr);
        }
        else {
            response = this.parseResponse();
            if (typeof this.p.error === 'function') this.p.error(response, this.xhr, this.xhr.status);
        }
    },
    parseResponse() {
        var response = this.xhr.response;
        var json = this.parseJson(response);
        return (json) ? json : response;
    },
    parseJson(str) {
        try {
            var o = JSON.parse(str);
            if (o && typeof o === 'object') {
                return o;
            }

        } catch (e) {
            return false;
        }

        return false;
    },
    toParams(obj) {
        return Object.keys(obj).map(
            function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }
        ).join('&');
    }
};
/*jshint esversion: 6 */
// Unique ID
let re_uuid = 0;

// Init
let Redactor = function(selector, settings) {
    return RedactorInit(selector, settings);
};

// Class
let RedactorInit = function(selector, settings) {
    let $elms = new Dom(selector),
        instance;

    $elms.each(function($el) {
        instance = $el.dataget(Redactor.namespace);
        if (!instance) {
            // Initialization
            instance = new App($el, settings, re_uuid);
            $el.dataset(Redactor.namespace, instance);
            Redactor.instances[re_uuid] = instance;
            re_uuid++;
        }
    });

    return ($elms.length > 1) ? Redactor.instances : instance;
};

// Dom & Ajax
Redactor.dom = function(selector, context) { return new Dom(selector, context); };
Redactor.ajax = Ajax;

// Globals
Redactor.mapping = {};
Redactor._mixins = {};
Redactor.instances = [];
Redactor.namespace = 'redactor';
Redactor.version = '4.0.5';
Redactor.settings = {};
Redactor.lang = {};
Redactor.triggers = {};
Redactor.keycodes = {
    BACKSPACE: 8,
    DELETE: 46,
    UP: 38,
    DOWN: 40,
    ENTER: 13,
    SPACE: 32,
    ESC: 27,
    TAB: 9,
    CTRL: 17,
    META: 91,
    SHIFT: 16,
    ALT: 18,
    RIGHT: 39,
    LEFT: 37
};


// Add
Redactor.add = function(type, name, obj) {
    // translations
    if (obj.translations) {
        Redactor.lang = Redactor.extend(true, Redactor.lang, obj.translations);
    }

    // defaults
    if (type !== 'block' && obj.defaults) {
        let localopts = {};
        localopts[name] = obj.defaults;
        Redactor.opts = Redactor.extend(true, Redactor.opts, localopts);
    }

    // extend block props
    if (obj.nested) {
       Redactor.opts.nested.push(name);
       Redactor.opts.nestedValue.push(obj.nested);
    }
    if (typeof obj.parser !== 'undefined' && obj.parser === false) {
       Redactor.opts.nonparse.push(name);
    }
    if (obj.triggers) {
        Redactor.triggers = Redactor.extend(true, Redactor.triggers, obj.triggers);
    }

    // mixins
    if (type === 'mixin') {
        Redactor._mixins[name] = obj;
    }
    else {
        // prototype
        let F = function() {};
        F.prototype = obj;

        // mixins
        if (obj.mixins) {
            for (let z = 0; z < obj.mixins.length; z++) {
                Redactor.inherit(F, Redactor._mixins[obj.mixins[z]]);
            }
        }

        if (typeof Redactor.mapping[type] === 'undefined') {
            Redactor.mapping[type] = {};
        }
        Redactor.mapping[type][name] = { type: type, proto: F, obj: obj };
    }
};

// Error
Redactor.error = function(exception) {
    throw exception;
};

// Message
Redactor.message = function(message) {
    console.log(message);
};

// Lang
Redactor.addLang = function(lang, obj) {
    if (typeof lang === 'object') {
        Redactor.lang = Redactor.extend(true, {}, Redactor.lang, lang);
    }
    else {
        if (typeof Redactor.lang[lang] === 'undefined') {
            Redactor.lang[lang] = {};
        }
        Redactor.lang[lang] = Redactor.extend(true, Redactor.lang[lang], obj);

    }
};

// Extend
Redactor.extend = function() {
    let extended = {},
        deep = false,
        i = 0,
        prop,
        merge,
        length = arguments.length;

    if (Object.prototype.toString.call(arguments[0]) === '[object Boolean]') {
        deep = arguments[0];
        i++;
    }

    merge = function(obj) {
        for (prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                if (obj[prop] && obj[prop].set === true) {
                    extended[prop] = {};
                }

                if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
                    extended[prop] = Redactor.extend(true, extended[prop], obj[prop]);
                }
                else {
                    extended[prop] = obj[prop];
                }

                if (typeof extended[prop] !== 'undefined') {
                    delete extended[prop].set;
                }
            }
        }
    };

    for (; i < length; i++) {
        let obj = arguments[i];
        merge(obj);
    }

    return extended;
};

// Inherit
Redactor.inherit = function(current, parent) {
    let F = function() {};
    F.prototype = parent;
    let f = new F();

    for (let prop in current.prototype) {
        if (current.prototype.__lookupGetter__(prop)) f.__defineGetter__(prop, current.prototype.__lookupGetter__(prop));
        else f[prop] = current.prototype[prop];
    }

    current.prototype = f;
    current.prototype.super = parent;

    return current;
};
Redactor.opts = {
    plugins: [],
    focus: false, // true, 'end'
    content: false,
    data: false,
    output: false,
    lang: 'en',
    breakline: false,
    markup: 'p',
    nocontainer: false,
    nostyle: false,
    https: false,
    clicktoedit: false,
    theme: 'auto', // light, dark
    placeholder: false,
    disabled: false,
    dataBlock: 'data-block',
    classname: 'rx-content',
    dir: 'ltr',
    reloadmarker: true,
    addPosition: 'top', // bottom
    spellcheck: true,
    grammarly: false,
    notranslate: false,
    width: '100%', // string
    padding: '20px 28px',
    minHeight: '72px', // string: '500px', false
    maxHeight: false, // string: '500px', false
    classes: false,
    iframe: false,
    templateSyntax: false,
    source: true,
    enterKey: true, // false
    drop: true,
    draggable: false,
    reorder: true,
    scrollTarget: window,
    sync: true,
    codemirror: false,
    codemirrorSrc: false,
    ai: false,
    bsmodal: false,
    block: {
        outline: true
    },
    colorpicker: {
        size: false,
        wrap: false,
        row: false,
        width: false
    },
    container: {
        border: true
    },
    state: {
        limit: 200
    },
    autosave: {
        url: false,
        name: false,
        data: false,
        method: 'post'
    },
    toolbar: {
        raised: false,
        target: false,
        sticky: true,
        stickyMinHeight: 200, // pixels
        stickyTopOffset: 0 // number
    },
    statusbar: {
        target: false
    },
    pathbar: false,
    control: true,
    context: false,
    clean: {
        comments: false,
        enter: true,
        enterinline: false
    },
    tab: {
        key: true,
        spaces: false // true or number of spaces
    },
    format: true,
    addbar: true,
    extrabar: true,
    addbarItems: {},
    inlineItems: {},
    formatItems: {},
    buttons: {
        toolbar: ['add', 'ai-tools', 'html', 'format', 'bold', 'italic', 'deleted', 'moreinline', 'list', 'link', 'image', 'table'],
        extrabar: ['hotkeys'], // undo, redo
        control: ['toggle'], // , 'add'
        context: ['ai-tools', 'format', 'bold', 'italic', 'deleted', 'moreinline', 'link'], // highlight, sub, sup, kbd
        icons: false
    },
    popups: {
        format: ['text', 'h1', 'h2', 'h3', 'h4', 'quote', 'bulletlist', 'numberedlist', 'todo'], // h5, h6, address
        control: ['add', 'move-up', 'move-down', 'duplicate', 'trash'],
        addbar: ['ai-tools', 'ai-image', 'text', 'heading', 'image', 'todo', 'list', 'embed', 'table', 'quote', 'pre', 'line', 'layout', 'wrapper'], // address, dlist
        inline: ['code', 'underline', 'sup', 'sub', 'highlight', 'removeinline']
    },
    active: {
        tags: {
            'b': ['bold'],
            'strong': ['bold'],
            'i': ['italic'],
            'em': ['italic'],
            'del': ['deleted'],
            'u': ['underline'],
            'a': ['link'],
            'code': ['code'],
            'mark': ['mark'],
            'sub': ['subscript'],
            'sup': ['superscript'],
            'h1': ['h1'],
            'h2': ['h2'],
            'h3': ['h3'],
            'h4': ['h4'],
            'h5': ['h5'],
            'h6': ['h6'],
            'ul': ['bulletlist'],
            'ol': ['numberedlist']
        },
        blocks: {
           'listitem': ['list'],
           'list': ['list'],
           'pre': ['pre'],
           'table': ['table'],
           'cell': ['table'],
           'image': ['image'],
           'embed': ['embed'],
           'layout': ['layout'],
           'wrapper': ['wrapper'],
           'todo': ['todo'],
           'text': ['text'],
           'quote': ['quote']
        }
    },
    paste: {
        clean: true,
        autoparse: true,
        paragraphize: true,
        plaintext: false,
        linkTarget: false,
        images: true,
        links: true,
        keepClass: [],
        keepStyle: [],
        keepAttrs: ['td', 'th'],
        formTags: ['form', 'input', 'button', 'select', 'textarea', 'legend', 'fieldset'],
        blockTags: ['pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tbody', 'thead', 'tfoot', 'th', 'tr', 'td', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'p', 'hr', 'figure', 'iframe', 'figcaption', 'address'],
        inlineTags: ['a', 'svg', 'img', 'br', 'strong', 'ins', 'code', 'del', 'span', 'samp', 'kbd', 'sup', 'sub', 'mark', 'var', 'cite', 'small', 'b', 'u', 'em', 'i', 'abbr']
    },

    // blocks
    image: {
        states: true,
        upload: false,
        url: true,
        select: false,
        selectMethod: 'get',
        name: 'file',
        data: false,
        drop: true,
        multiple: true,
        clipboard: true,
        types: ['image/*'],
        tag: 'figure', // p, div, figure
        newtab: false,
        link: true,
        width: false
    },
    layouts: {
        'single': {
            title: '## layout.single-column ##',
            pattern: '100%'
        },
        'two-columns': {
            title: '## layout.two-columns ##',
            pattern: '50%|50%'
        },
        'three-columns': {
            title: '## layout.three-columns ##',
            pattern: '33%|33%|33%'
        },
        'four-columns': {
            title: '## layout.four-columns ##',
            pattern: '25%|25%|25%|25%'
        },
        '60-40': {
            title: '60/40',
            pattern: '60%|40%'
        },
        '40-60': {
            title: '40/60',
            pattern: '40%|60%'
        }
    },
    wrapper: {
        template: '<div></div>'
    },
    figcaption: {
        template: '<figcaption></figcaption>'
    },
    line: {
        template: '<hr>'
    },
    noneditable: {
        remove: true,
        select: true
    },
    pre: {
        template: '<pre></pre>',
        spaces: 4 // or false
    },
    table: {
        template: '<table><tr><td></td><td></td></tr><tr><td></td><td></td></tr></table>',
        nowrap: 'nowrap'
    },
    todo: {
        templateItem: '[ ]',
        templateItemDone: '[x]',
        templateInput: '<input type="checkbox">',
        templateContent: '<div></div></li>'
    },
    quote: {
        template: '<blockquote><p data-placeholder="Quote..."></p><p><cite data-placeholder="Attribution"></cite></p></blockquote>'
    },
    embed: {
        classname: 'embed-content',
        responsive: false,
        responsiveClassname: 'embed-responsive',
        script: true
    },
    outset: {
        none: 'none',
        left: 'outset-left',
        both: 'outset-both',
        right: 'outset-right'
    },
    wrap: {
        none: 'none',
        left: 'float-left',
        center: 'wrap-center',
        right: 'float-right'
    },
    colors: {
        base:   ['#000000', '#ffffff'],
        gray:   ['#212529', '#343a40', '#495057', '#868e96', '#adb5bd', '#ced4da', '#dee2e6', '#e9ecef', '#f1f3f5', '#f8f9fa'],
        red:    ["#c92a2a", "#e03131", "#f03e3e", "#fa5252", "#ff6b6b", "#ff8787", "#ffa8a8", "#ffc9c9", "#ffe3e3", "#fff5f5"],
        pink:   ["#a61e4d", "#c2255c", "#d6336c", "#e64980", "#f06595", "#f783ac", "#faa2c1", "#fcc2d7", "#ffdeeb", "#fff0f6"],
        grape:  ["#862e9c", "#9c36b5", "#ae3ec9", "#be4bdb", "#cc5de8", "#da77f2", "#e599f7", "#eebefa", "#f3d9fa", "#f8f0fc"],
        violet: ["#5f3dc4", "#6741d9", "#7048e8", "#7950f2", "#845ef7", "#9775fa", "#b197fc", "#d0bfff", "#e5dbff", "#f3f0ff"],
        indigo: ["#364fc7", "#3b5bdb", "#4263eb", "#4c6ef5", "#5c7cfa", "#748ffc", "#91a7ff", "#bac8ff", "#dbe4ff", "#edf2ff"],
        blue:   ["#1864ab", "#1971c2", "#1c7ed6", "#228be6", "#339af0", "#4dabf7", "#74c0fc", "#a5d8ff", "#d0ebff", "#e7f5ff"],
        cyan:   ["#0b7285", "#0c8599", "#1098ad", "#15aabf", "#22b8cf", "#3bc9db", "#66d9e8", "#99e9f2", "#c5f6fa", "#e3fafc"],
        teal:   ["#087f5b", "#099268", "#0ca678", "#12b886", "#20c997", "#38d9a9", "#63e6be", "#96f2d7", "#c3fae8", "#e6fcf5"],
        green:  ["#2b8a3e", "#2f9e44", "#37b24d", "#40c057", "#51cf66", "#69db7c", "#8ce99a", "#b2f2bb", "#d3f9d8", "#ebfbee"],
        lime:   ["#5c940d", "#66a80f", "#74b816", "#82c91e", "#94d82d", "#a9e34b", "#c0eb75", "#d8f5a2", "#e9fac8", "#f4fce3"],
        yellow: ["#e67700", "#f08c00", "#f59f00", "#fab005", "#fcc419", "#ffd43b", "#ffe066", "#ffec99", "#fff3bf", "#fff9db"],
        orange: ["#d9480f", "#e8590c", "#f76707", "#fd7e14", "#ff922b", "#ffa94d", "#ffc078", "#ffd8a8", "#ffe8cc", "#fff4e6"]
    },
    hotkeysAdd: false,
    hotkeysRemove: false,
    hotkeysBase: {
        'meta+z': '## hotkeys.meta-z ##',
        'meta+shift+z': '## hotkeys.meta-shift-z ##',
        'meta+a': '## hotkeys.meta-a ##',
        'meta+shift+a': '## hotkeys.meta-shift-a ##'
    },
    hotkeys: {
        'ctrl+shift+o, meta+shift+o': {
            title: '## hotkeys.meta-shift-o ##',
            name: 'meta+shift+o',
            command: 'addbar.popup'
        },
        'ctrl+shift+d, meta+shift+d': {
            title: '## hotkeys.meta-shift-d ##',
            name: 'meta+shift+d',
            command: 'block.duplicate'
        },
        'ctrl+shift+up, meta+shift+up': {
            title: '## hotkeys.meta-shift-up ##',
            name: 'meta+shift+&uarr;',
            command: 'block.moveUp'
        },
        'ctrl+shift+down, meta+shift+down': {
            title: '## hotkeys.meta-shift-down ##',
            name: 'meta+shift+&darr;',
            command: 'block.moveDown'
        },
        'ctrl+shift+m, meta+shift+m': {
            title: '## hotkeys.meta-shift-m ##',
            name: 'meta+shift+m',
            command: 'inline.removeFormat'
        },
        'ctrl+b, meta+b': {
            title: '## hotkeys.meta-b ##',
            name: 'meta+b',
            command: 'inline.set',
            params: { tag: 'b' }
        },
        'ctrl+i, meta+i': {
            title: '## hotkeys.meta-i ##',
            name: 'meta+i',
            command: 'inline.set',
            params: { tag: 'i' }
        },
        'ctrl+u, meta+u': {
            title: '## hotkeys.meta-u ##',
            name: 'meta+u',
            command: 'inline.set',
            params: { tag: 'u' }
        },
        'ctrl+h, meta+h': {
            title: '## hotkeys.meta-h ##',
            name: 'meta+h',
            command: 'inline.set',
            params: { tag: 'sup' }
        },
        'ctrl+l, meta+l': {
            title: '## hotkeys.meta-l ##',
            name: 'meta+l',
            command: 'inline.set',
            params: { tag: 'sub' }
        },
        'ctrl+alt+0, meta+alt+0': {
            title: '## hotkeys.meta-alt-0 ##',
            name: 'meta+alt+0',
            command: 'format.set',
            params: { tag: 'p' }
        },
        'ctrl+alt+1, meta+alt+1': {
            title: '## hotkeys.meta-alt-1 ##',
            name: 'meta+alt+1',
            command: 'format.set',
            params: { tag: 'h1' }
        },
        'ctrl+alt+2, meta+alt+2': {
            title: '## hotkeys.meta-alt-2 ##',
            name: 'meta+alt+2',
            command: 'format.set',
            params: { tag: 'h2' }
        },
        'ctrl+alt+3, meta+alt+3': {
            title: '## hotkeys.meta-alt-3 ##',
            name: 'meta+alt+3',
            command: 'format.set',
            params: { tag: 'h3' }
        },
        'ctrl+alt+4, meta+alt+4': {
            title: '## hotkeys.meta-alt-4 ##',
            name: 'meta+alt+4',
            command: 'format.set',
            params: { tag: 'h4' }
        },
        'ctrl+alt+5, meta+alt+5': {
            title: '## hotkeys.meta-alt-5 ##',
            name: 'meta+alt+5',
            command: 'format.set',
            params: { tag: 'h5' }
        },
        'ctrl+alt+6, meta+alt+6': {
            title: '## hotkeys.meta-alt-6 ##',
            name: 'meta+alt+6',
            command: 'format.set',
            params: { tag: 'h6' }
        },
        'ctrl+shift+7, meta+shift+7': {
            title: '## hotkeys.meta-shift-7 ##',
            name: 'meta+shift+7',
            command: 'format.set',
            params: { tag: 'ol'}
        },
        'ctrl+shift+8, meta+shift+8': {
            title: '## hotkeys.meta-shift-8 ##',
            name: 'meta+shift+8',
            command: 'format.set',
            params: { tag: 'ul' }
        },
        'ctrl+], meta+]': {
            title: '## hotkeys.meta-indent ##',
            name: 'meta+]',
            command: 'list.indent'
        },
        'ctrl+[, meta+[': {
            title: '## hotkeys.meta-outdent ##',
            name: 'meta+[',
            command: 'list.outdent'
        },
        'ctrl+k, meta+k': {
            title: '## hotkeys.meta-k ##',
            name: 'meta+k',
            command: 'link.format'
        }
    },

    // private
    markerChar: '\ufeff',
    containers: {
        main: ['toolbox', 'editor', 'source', 'preview', 'statusbar'],
        toolbox: ['pathbar', 'toolbar']
    },
    modes: {
        'nocontainer': {
            toolbar: false,
            extrabar: false,
            pathbar: false,
            padding: '0'
        }
    },
    buttonsObj: {
        'ai-tools': {
            title: '## buttons.ai-tools ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 3C18.5523 3 19 3.44772 19 4C19 4.26522 19.1054 4.51957 19.2929 4.70711C19.4804 4.89464 19.7348 5 20 5C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7C19.7348 7 19.4804 7.10536 19.2929 7.29289C19.1054 7.48043 19 7.73478 19 8C19 8.55228 18.5523 9 18 9C17.4477 9 17 8.55228 17 8C17 7.73478 16.8946 7.48043 16.7071 7.29289C16.5196 7.10536 16.2652 7 16 7C15.4477 7 15 6.55228 15 6C15 5.44772 15.4477 5 16 5C16.2652 5 16.5196 4.89464 16.7071 4.70711C16.8946 4.51957 17 4.26522 17 4C17 3.44772 17.4477 3 18 3ZM9 5C9.55228 5 10 5.44772 10 6C10 7.32608 10.5268 8.59785 11.4645 9.53553C12.4021 10.4732 13.6739 11 15 11C15.5523 11 16 11.4477 16 12C16 12.5523 15.5523 13 15 13C13.6739 13 12.4021 13.5268 11.4645 14.4645C10.5268 15.4021 10 16.6739 10 18C10 18.5523 9.55228 19 9 19C8.44772 19 8 18.5523 8 18C8 16.6739 7.47322 15.4021 6.53553 14.4645C5.59785 13.5268 4.32608 13 3 13C2.44772 13 2 12.5523 2 12C2 11.4477 2.44772 11 3 11C4.32608 11 5.59785 10.4732 6.53553 9.53553C7.47322 8.59785 8 7.32608 8 6C8 5.44772 8.44772 5 9 5ZM9 9.60559C8.70843 10.0908 8.35673 10.5428 7.94975 10.9497C7.54276 11.3567 7.09082 11.7084 6.60559 12C7.09082 12.2916 7.54276 12.6433 7.94975 13.0503C8.35673 13.4572 8.70843 13.9092 9 14.3944C9.29157 13.9092 9.64327 13.4572 10.0503 13.0503C10.4572 12.6433 10.9092 12.2916 11.3944 12C10.9092 11.7084 10.4572 11.3567 10.0503 10.9497C9.64327 10.5428 9.29157 10.0908 9 9.60559ZM16.7071 16.7071C16.8946 16.5196 17 16.2652 17 16C17 15.4477 17.4477 15 18 15C18.5523 15 19 15.4477 19 16C19 16.2652 19.1054 16.5196 19.2929 16.7071C19.4804 16.8946 19.7348 17 20 17C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19C19.7348 19 19.4804 19.1054 19.2929 19.2929C19.1054 19.4804 19 19.7348 19 20C19 20.5523 18.5523 21 18 21C17.4477 21 17 20.5523 17 20C17 19.7348 16.8946 19.4804 16.7071 19.2929C16.5196 19.1054 16.2652 19 16 19C15.4477 19 15 18.5523 15 18C15 17.4477 15.4477 17 16 17C16.2652 17 16.5196 16.8946 16.7071 16.7071Z"/></svg>',
            observer: 'ai.observe',
            command: 'ai.popup'
        },
        'ai-image': {
            title: '## buttons.ai-image ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 3C18.5523 3 19 3.44772 19 4C19 4.26522 19.1054 4.51957 19.2929 4.70711C19.4804 4.89464 19.7348 5 20 5C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7C19.7348 7 19.4804 7.10536 19.2929 7.29289C19.1054 7.48043 19 7.73478 19 8C19 8.55228 18.5523 9 18 9C17.4477 9 17 8.55228 17 8C17 7.73478 16.8946 7.48043 16.7071 7.29289C16.5196 7.10536 16.2652 7 16 7C15.4477 7 15 6.55228 15 6C15 5.44772 15.4477 5 16 5C16.2652 5 16.5196 4.89464 16.7071 4.70711C16.8946 4.51957 17 4.26522 17 4C17 3.44772 17.4477 3 18 3ZM9 5C9.55228 5 10 5.44772 10 6C10 7.32608 10.5268 8.59785 11.4645 9.53553C12.4021 10.4732 13.6739 11 15 11C15.5523 11 16 11.4477 16 12C16 12.5523 15.5523 13 15 13C13.6739 13 12.4021 13.5268 11.4645 14.4645C10.5268 15.4021 10 16.6739 10 18C10 18.5523 9.55228 19 9 19C8.44772 19 8 18.5523 8 18C8 16.6739 7.47322 15.4021 6.53553 14.4645C5.59785 13.5268 4.32608 13 3 13C2.44772 13 2 12.5523 2 12C2 11.4477 2.44772 11 3 11C4.32608 11 5.59785 10.4732 6.53553 9.53553C7.47322 8.59785 8 7.32608 8 6C8 5.44772 8.44772 5 9 5ZM9 9.60559C8.70843 10.0908 8.35673 10.5428 7.94975 10.9497C7.54276 11.3567 7.09082 11.7084 6.60559 12C7.09082 12.2916 7.54276 12.6433 7.94975 13.0503C8.35673 13.4572 8.70843 13.9092 9 14.3944C9.29157 13.9092 9.64327 13.4572 10.0503 13.0503C10.4572 12.6433 10.9092 12.2916 11.3944 12C10.9092 11.7084 10.4572 11.3567 10.0503 10.9497C9.64327 10.5428 9.29157 10.0908 9 9.60559ZM16.7071 16.7071C16.8946 16.5196 17 16.2652 17 16C17 15.4477 17.4477 15 18 15C18.5523 15 19 15.4477 19 16C19 16.2652 19.1054 16.5196 19.2929 16.7071C19.4804 16.8946 19.7348 17 20 17C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19C19.7348 19 19.4804 19.1054 19.2929 19.2929C19.1054 19.4804 19 19.7348 19 20C19 20.5523 18.5523 21 18 21C17.4477 21 17 20.5523 17 20C17 19.7348 16.8946 19.4804 16.7071 19.2929C16.5196 19.1054 16.2652 19 16 19C15.4477 19 15 18.5523 15 18C15 17.4477 15.4477 17 16 17C16.2652 17 16.5196 16.8946 16.7071 16.7071Z"/></svg>',
            observer: 'ai.observe',
            command: 'ai.promptImage',
        },
        'add': {
            title: '## buttons.add ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M13 3.75C13 3.19772 12.5523 2.75 12 2.75C11.4477 2.75 11 3.19772 11 3.75V11H3.75C3.19772 11 2.75 11.4477 2.75 12C2.75 12.5523 3.19772 13 3.75 13H11V20.25C11 20.8023 11.4477 21.25 12 21.25C12.5523 21.25 13 20.8023 13 20.25V13H20.25C20.8023 13 21.25 12.5523 21.25 12C21.25 11.4477 20.8023 11 20.25 11H13V3.75Z"/></svg>',
            command: 'addbar.popup'
        },
        'html': {
            title: '## buttons.html ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.9701 4.24253C15.1041 3.70673 14.7783 3.1638 14.2425 3.02985C13.7067 2.8959 13.1638 3.22166 13.0299 3.75746L9.02986 19.7575C8.89591 20.2933 9.22167 20.8362 9.75746 20.9701C10.2933 21.1041 10.8362 20.7783 10.9701 20.2425L14.9701 4.24253ZM7.70711 7.29289C8.09763 7.68341 8.09763 8.31658 7.70711 8.7071L4.41421 12L7.70711 15.2929C8.09763 15.6834 8.09763 16.3166 7.70711 16.7071C7.31658 17.0976 6.68342 17.0976 6.29289 16.7071L2.29289 12.7071C1.90237 12.3166 1.90237 11.6834 2.29289 11.2929L6.29289 7.29289C6.68342 6.90236 7.31658 6.90236 7.70711 7.29289ZM16.2929 7.29289C16.6834 6.90236 17.3166 6.90236 17.7071 7.29289L21.7071 11.2929C22.0976 11.6834 22.0976 12.3166 21.7071 12.7071L17.7071 16.7071C17.3166 17.0976 16.6834 17.0976 16.2929 16.7071C15.9024 16.3166 15.9024 15.6834 16.2929 15.2929L19.5858 12L16.2929 8.7071C15.9024 8.31658 15.9024 7.68341 16.2929 7.29289Z"/></svg>',
            command: 'source.toggle'
        },
        'format': {
            title: '## buttons.format ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.32413 6.98804C6.14654 7.2864 6 7.75331 6 8.5C6 9.24669 6.14654 9.7136 6.32413 10.012C6.49608 10.3008 6.73889 10.5026 7.06782 10.6511C7.58542 10.8849 8.24184 10.9625 9 10.9879V6.01213C8.24184 6.03755 7.58542 6.11512 7.06782 6.34887C6.73889 6.49742 6.49608 6.69917 6.32413 6.98804ZM6.24464 12.4739C7.10428 12.8621 8.10853 12.9642 9 12.9908V19C9 19.5523 9.44772 20 10 20C10.5523 20 11 19.5523 11 19V12V6H15V19C15 19.5523 15.4477 20 16 20C16.5523 20 17 19.5523 17 19V6H18C18.5523 6 19 5.55228 19 5C19 4.44772 18.5523 4 18 4H16H15C14.9996 4 14.9993 4 14.9989 4L10 4L9.99773 4L9.90325 3.99997C8.84701 3.99946 7.4124 3.99876 6.24464 4.52613C5.60483 4.81508 5.01952 5.26959 4.60554 5.96509C4.1972 6.65111 4 7.49669 4 8.5C4 9.50331 4.1972 10.3489 4.60554 11.0349C5.01952 11.7304 5.60483 12.1849 6.24464 12.4739Z"/></svg>',
            command: 'format.popup'
        },
        'bold': {
            title: '## buttons.bold ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 4C6.44772 4 6 4.44772 6 5V12V19C6 19.5523 6.44772 20 7 20H14C15.1935 20 16.3381 19.5259 17.182 18.682C18.0259 17.8381 18.5 16.6935 18.5 15.5C18.5 14.3065 18.0259 13.1619 17.182 12.318C16.9031 12.0391 16.5914 11.8006 16.2559 11.6063C17.0535 10.7703 17.5 9.65816 17.5 8.5C17.5 7.30653 17.0259 6.16193 16.182 5.31802C15.3381 4.47411 14.1935 4 13 4H7ZM13 13H8V18H14C14.663 18 15.2989 17.7366 15.7678 17.2678C16.2366 16.7989 16.5 16.163 16.5 15.5C16.5 14.837 16.2366 14.2011 15.7678 13.7322C15.2989 13.2634 14.663 13 14 13H13ZM13 11C13.663 11 14.2989 10.7366 14.7678 10.2678C15.2366 9.79893 15.5 9.16304 15.5 8.5C15.5 7.83696 15.2366 7.20107 14.7678 6.73223C14.2989 6.26339 13.663 6 13 6H8V11H13Z"/></svg>',
            command: 'inline.set',
            params: { tag: 'b' }
        },
        'italic': {
            title: '## buttons.italic ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.0222 4H17C17.5523 4 18 4.44772 18 5C18 5.55228 17.5523 6 17 6H14.7543L11.3257 18H13C13.5523 18 14 18.4477 14 19C14 19.5523 13.5523 20 13 20H10.023C10.0081 20.0003 9.99304 20.0003 9.97798 20H7C6.44772 20 6 19.5523 6 19C6 18.4477 6.44772 18 7 18H9.24571L12.6743 6H11C10.4477 6 10 5.55228 10 5C10 4.44772 10.4477 4 11 4H13.9768C13.9919 3.99966 14.007 3.99965 14.0222 4Z"/></svg>',
            command: 'inline.set',
            params: { tag: 'i' }
        },
        'deleted': {
            title: '## buttons.deleted ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.8776 4.46266C14.0175 4.14012 13.0023 3.98493 11.9923 3.99999H11C9.80652 3.99999 8.66193 4.4741 7.81802 5.31801C6.9741 6.16193 6.5 7.30652 6.5 8.49999C6.5 9.39648 6.76751 10.2654 7.25832 11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H13.0058C13.6667 13.0015 14.3003 13.2647 14.7678 13.7322C15.2366 14.2011 15.5 14.837 15.5 15.5C15.5 16.163 15.2366 16.7989 14.7678 17.2678C14.2989 17.7366 13.663 18 13 18H11.5L11.4842 18.0001C10.6801 18.0128 9.9163 17.8865 9.32462 17.6647C8.70357 17.4318 8.45244 17.1652 8.38892 17.0419C8.13594 16.551 7.53288 16.3581 7.04194 16.6111C6.551 16.864 6.35809 17.4671 6.61107 17.9581C7.00105 18.7149 7.78931 19.2249 8.62237 19.5373C9.4825 19.8599 10.4977 20.0151 11.5077 20H13C14.1935 20 15.3381 19.5259 16.182 18.682C17.0259 17.8381 17.5 16.6935 17.5 15.5C17.5 14.6035 17.2325 13.7346 16.7417 13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13.0083C13.0055 11 13.0028 11 13 11H11C10.337 11 9.70107 10.7366 9.23223 10.2678C8.76339 9.79892 8.5 9.16303 8.5 8.49999C8.5 7.83695 8.76339 7.20107 9.23223 6.73223C9.70107 6.26338 10.337 5.99999 11 5.99999H12L12.0158 5.99987C12.8199 5.98715 13.5837 6.11344 14.1754 6.33532C14.7964 6.56822 15.0476 6.83478 15.1111 6.95805C15.3641 7.44899 15.9671 7.64189 16.4581 7.38892C16.949 7.13594 17.1419 6.53287 16.8889 6.04193C16.4989 5.28513 15.7107 4.77506 14.8776 4.46266Z"/></svg>',
            command: 'inline.set',
            params: { tag: 'del' }
        },
        'moreinline': {
            title: '## buttons.more-formatting ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 12C3 10.8954 3.89543 10 5 10C6.10457 10 7 10.8954 7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12ZM10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12ZM19 10C17.8954 10 17 10.8954 17 12C17 13.1046 17.8954 14 19 14C20.1046 14 21 13.1046 21 12C21 10.8954 20.1046 10 19 10Z"/></svg>',
            command: 'inline.popup'
        },
        'link': {
            title: '## buttons.link ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.1946 6.14687L11.7568 6.65369C11.3957 7.07164 10.7643 7.11778 10.3463 6.75676C9.92836 6.39573 9.88222 5.76425 10.2432 5.34631L10.7062 4.81031C10.7222 4.79189 10.7387 4.77405 10.7559 4.75684C11.8813 3.63165 13.4075 2.99958 14.9989 2.99969C16.5903 2.99981 18.1165 3.63209 19.2417 4.75744C20.3669 5.8828 20.9989 7.40904 20.9988 9.00042C20.9987 10.5918 20.3664 12.118 19.2411 13.2432C19.2246 13.2596 19.2075 13.2756 19.1899 13.2909L18.6559 13.7549C18.239 14.1171 17.6074 14.0728 17.2452 13.6559C16.8829 13.239 16.9272 12.6074 17.3441 12.2452L17.8502 11.8054C18.5859 11.0576 18.9987 10.0502 18.9988 9.00028C18.9989 7.93934 18.5775 6.92181 17.8273 6.17156C17.0772 5.4213 16.0597 4.99977 14.9988 4.99969C13.9493 4.99962 12.9424 5.41192 12.1946 6.14687ZM15.7071 8.29289C16.0976 8.68342 16.0976 9.31658 15.7071 9.70711L9.70711 15.7071C9.31658 16.0976 8.68342 16.0976 8.29289 15.7071C7.90237 15.3166 7.90237 14.6834 8.29289 14.2929L14.2929 8.29289C14.6834 7.90237 15.3166 7.90237 15.7071 8.29289ZM6.7494 10.3379C7.11509 10.7517 7.07603 11.3837 6.66216 11.7494L6.16037 12.1928C5.7956 12.5583 5.50555 12.9915 5.30653 13.4681C5.10411 13.953 4.99988 14.4731 4.99988 14.9985C4.99988 15.5239 5.10411 16.044 5.30653 16.5289C5.50895 17.0137 5.80554 17.4535 6.17913 17.8229L6.17916 17.8229C6.9407 18.576 7.96851 18.9984 9.03952 18.9984C10.0866 18.9984 11.0923 18.5947 11.8483 17.873L12.1975 17.4034C12.527 16.9602 13.1534 16.868 13.5966 17.1975C14.0399 17.527 14.132 18.1534 13.8025 18.5966L13.4055 19.1306C13.3754 19.1712 13.3421 19.2095 13.3062 19.2451C12.1702 20.3684 10.6371 20.9984 9.03952 20.9984C7.44197 20.9984 5.90886 20.3684 4.77291 19.2451C4.21121 18.6897 3.76528 18.0284 3.46093 17.2994C3.15659 16.5705 2.99988 15.7884 2.99988 14.9985C2.99988 14.2086 3.15659 13.4265 3.46093 12.6976C3.76528 11.9686 4.21121 11.3073 4.77291 10.7519C4.78621 10.7388 4.79987 10.726 4.81388 10.7136L5.33788 10.2506C5.75175 9.88493 6.38371 9.92399 6.7494 10.3379Z"/></svg>',
            observer: 'link.observe',
            command: 'link.popup'
        },
        'link-text': {
            title: '## buttons.link-text ##',
            command: 'link.open'
        },
        'unlink': {
            title: '## buttons.unlink ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 1C7.55228 1 8 1.44772 8 2V4C8 4.55228 7.55228 5 7 5C6.44772 5 6 4.55228 6 4V2C6 1.44772 6.44772 1 7 1ZM12.1946 6.14687L11.7568 6.65369C11.3957 7.07164 10.7643 7.11778 10.3463 6.75676C9.92836 6.39573 9.88222 5.76425 10.2432 5.34631L10.7062 4.81031C10.7222 4.79189 10.7387 4.77405 10.7559 4.75684C11.8813 3.63165 13.4075 2.99958 14.9989 2.99969C16.5903 2.99981 18.1165 3.63209 19.2417 4.75744C20.3669 5.8828 20.9989 7.40905 20.9988 9.00043C20.9987 10.5918 20.3664 12.118 19.2411 13.2432C19.2246 13.2596 19.2075 13.2756 19.1899 13.2909L18.6559 13.7549C18.239 14.1171 17.6074 14.0728 17.2452 13.6559C16.8829 13.239 16.9272 12.6074 17.3441 12.2452L17.8502 11.8054C18.5859 11.0576 18.9987 10.0502 18.9988 9.00028C18.9989 7.93934 18.5775 6.92181 17.8273 6.17156C17.0772 5.4213 16.0597 4.99977 14.9988 4.99969C13.9493 4.99962 12.9424 5.41192 12.1946 6.14687ZM1 7C1 6.44772 1.44772 6 2 6H4C4.55228 6 5 6.44772 5 7C5 7.55228 4.55228 8 4 8H2C1.44772 8 1 7.55228 1 7ZM15.7071 8.29289C16.0976 8.68342 16.0976 9.31658 15.7071 9.70711L9.70711 15.7071C9.31658 16.0976 8.68342 16.0976 8.29289 15.7071C7.90237 15.3166 7.90237 14.6834 8.29289 14.2929L14.2929 8.29289C14.6834 7.90237 15.3166 7.90237 15.7071 8.29289ZM6.7494 10.3379C7.11509 10.7517 7.07603 11.3837 6.66216 11.7494L6.16037 12.1928C5.7956 12.5583 5.50555 12.9915 5.30653 13.4681C5.10411 13.953 4.99988 14.4731 4.99988 14.9985C4.99988 15.5239 5.10411 16.044 5.30653 16.5289C5.50895 17.0137 5.80554 17.4535 6.17913 17.8229L6.17916 17.8229C6.9407 18.576 7.96851 18.9984 9.03952 18.9984C10.0866 18.9984 11.0923 18.5947 11.8483 17.873L12.1975 17.4034C12.527 16.9602 13.1534 16.868 13.5966 17.1975C14.0399 17.527 14.132 18.1534 13.8025 18.5966L13.4055 19.1306C13.3754 19.1712 13.3421 19.2095 13.3062 19.2451C12.1702 20.3684 10.6371 20.9984 9.03952 20.9984C7.44197 20.9984 5.90886 20.3684 4.77291 19.2451C4.21121 18.6897 3.76528 18.0284 3.46093 17.2994C3.15659 16.5705 2.99988 15.7884 2.99988 14.9985C2.99988 14.2086 3.15659 13.4265 3.46093 12.6976C3.76528 11.9686 4.21121 11.3073 4.77291 10.7519C4.78621 10.7388 4.79987 10.726 4.81388 10.7136L5.33788 10.2506C5.75175 9.88493 6.38371 9.92399 6.7494 10.3379ZM19 17C19 16.4477 19.4477 16 20 16H22C22.5523 16 23 16.4477 23 17C23 17.5523 22.5523 18 22 18H20C19.4477 18 19 17.5523 19 17ZM17 19C17.5523 19 18 19.4477 18 20V22C18 22.5523 17.5523 23 17 23C16.4477 23 16 22.5523 16 22V20C16 19.4477 16.4477 19 17 19Z"/></svg>',
            command: 'link.unlink'
        },
        'image': {
            title: '## buttons.image ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 7C5 5.89543 5.89543 5 7 5H17C18.1046 5 19 5.89543 19 7V12.5858L18.7071 12.2929L18.6934 12.2794C18.091 11.6998 17.3358 11.3301 16.5 11.3301C15.6642 11.3301 14.909 11.6998 14.3066 12.2794L14.2929 12.2929L14 12.5858L11.7071 10.2929L11.6934 10.2794C11.091 9.6998 10.3358 9.33014 9.5 9.33014C8.66419 9.33014 7.909 9.6998 7.30662 10.2794L7.29289 10.2929L5 12.5858V7ZM15.4142 14L15.6997 13.7146C16.0069 13.4213 16.2841 13.3301 16.5 13.3301C16.7159 13.3301 16.9931 13.4213 17.3003 13.7146L19 15.4142V17C19 18.1046 18.1046 19 17 19H7C5.89543 19 5 18.1046 5 17V15.4142L8.69966 11.7146C9.0069 11.4213 9.28406 11.3301 9.5 11.3301C9.71594 11.3301 9.9931 11.4213 10.3003 11.7146L13.2929 14.7071L15.2929 16.7071C15.6834 17.0976 16.3166 17.0976 16.7071 16.7071C17.0976 16.3166 17.0976 15.6834 16.7071 15.2929L15.4142 14ZM21 15.001V17C21 19.2091 19.2091 21 17 21H7C4.79086 21 3 19.2091 3 17V15.0002V14.9998V7C3 4.79086 4.79086 3 7 3H17C19.2091 3 21 4.79086 21 7V14.999C21 14.9997 21 15.0003 21 15.001ZM15 7C14.4477 7 14 7.44772 14 8C14 8.55228 14.4477 9 15 9H15.01C15.5623 9 16.01 8.55228 16.01 8C16.01 7.44772 15.5623 7 15.01 7H15Z"/></svg>',
            observer: 'image.observe',
            command: 'image.popup'
        },
        'unwrap': {
            title: '## buttons.unwrap ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.29289 2.29289C2.68342 1.90237 3.31658 1.90237 3.70711 2.29289L21.7071 20.2929C22.0976 20.6834 22.0976 21.3166 21.7071 21.7071C21.3166 22.0976 20.6834 22.0976 20.2929 21.7071L18 19.4142V20C18 20.5523 17.5523 21 17 21C16.4477 21 16 20.5523 16 20V18H8V20C8 20.5523 7.55228 21 7 21C6.44772 21 6 20.5523 6 20V18H4C3.44772 18 3 17.5523 3 17C3 16.4477 3.44772 16 4 16H6V8H4C3.44772 8 3 7.55228 3 7C3 6.44772 3.44772 6 4 6H4.58579L2.29289 3.70711C1.90237 3.31658 1.90237 2.68342 2.29289 2.29289ZM8 9.41421L14.5858 16H8V9.41421ZM17 3C17.5523 3 18 3.44772 18 4V6H20C20.5523 6 21 6.44772 21 7C21 7.55228 20.5523 8 20 8H18V13C18 13.5523 17.5523 14 17 14C16.4477 14 16 13.5523 16 13V8H11C10.4477 8 10 7.55228 10 7C10 6.44772 10.4477 6 11 6H16V4C16 3.44772 16.4477 3 17 3Z"/></svg>',
            command: 'block.unwrap'
        },
        'outset': {
            title: '## buttons.outset ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 4C6 3.44772 6.44772 3 7 3H17C17.5523 3 18 3.44772 18 4C18 4.55229 17.5523 5 17 5L7 5C6.44772 5 6 4.55228 6 4ZM3.58579 7.58579C3.96086 7.21071 4.46957 7 5 7H19C19.5304 7 20.0391 7.21071 20.4142 7.58579C20.7893 7.96086 21 8.46957 21 9V15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H5C4.46957 17 3.96086 16.7893 3.58579 16.4142C3.21071 16.0391 3 15.5304 3 15V9C3 8.46957 3.21071 7.96086 3.58579 7.58579ZM19 9H5L5 15H19V9ZM7 19C6.44772 19 6 19.4477 6 20C6 20.5523 6.44772 21 7 21H17C17.5523 21 18 20.5523 18 20C18 19.4477 17.5523 19 17 19H7Z"/></svg>',
            observer: 'image.observe',
            command: 'image.popupOutset'
        },
        'wrap': {
            title: '## buttons.wrap-image ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.58579 4.58579C3.96086 4.21071 4.46957 4 5 4H9C9.53043 4 10.0391 4.21071 10.4142 4.58579C10.7893 4.96086 11 5.46957 11 6V10C11 10.5304 10.7893 11.0391 10.4142 11.4142C10.0391 11.7893 9.53043 12 9 12H5C4.46957 12 3.96086 11.7893 3.58579 11.4142C3.21071 11.0391 3 10.5304 3 10V6C3 5.46957 3.21071 4.96086 3.58579 4.58579ZM9 6L5 6L5 10H9V6ZM13 7C13 6.44772 13.4477 6 14 6H20C20.5523 6 21 6.44772 21 7C21 7.55228 20.5523 8 20 8H14C13.4477 8 13 7.55228 13 7ZM13 11C13 10.4477 13.4477 10 14 10H20C20.5523 10 21 10.4477 21 11C21 11.5523 20.5523 12 20 12H14C13.4477 12 13 11.5523 13 11ZM3 15C3 14.4477 3.44772 14 4 14H20C20.5523 14 21 14.4477 21 15C21 15.5523 20.5523 16 20 16H4C3.44772 16 3 15.5523 3 15ZM3 19C3 18.4477 3.44772 18 4 18H20C20.5523 18 21 18.4477 21 19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19Z"/></svg>',
            observer: 'image.observe',
            command: 'image.popupWrap'
        },
        'move-up': {
            title: '## buttons.move-up ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.2929 4.29289C11.6834 3.90237 12.3166 3.90237 12.7071 4.29289L16.7071 8.29289C17.0976 8.68342 17.0976 9.31658 16.7071 9.70711C16.3166 10.0976 15.6834 10.0976 15.2929 9.70711L13 7.41421V19C13 19.5523 12.5523 20 12 20C11.4477 20 11 19.5523 11 19V7.41421L8.70711 9.70711C8.31658 10.0976 7.68342 10.0976 7.29289 9.70711C6.90237 9.31658 6.90237 8.68342 7.29289 8.29289L11.2929 4.29289Z"/></svg>',
            command: 'block.moveUp'
        },
        'move-down': {
            title: '## buttons.move-down ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 4C12.5523 4 13 4.44772 13 5V16.5858L15.2929 14.2929C15.6834 13.9024 16.3166 13.9024 16.7071 14.2929C17.0976 14.6834 17.0976 15.3166 16.7071 15.7071L12.7071 19.7071C12.3166 20.0976 11.6834 20.0976 11.2929 19.7071L7.29289 15.7071C6.90237 15.3166 6.90237 14.6834 7.29289 14.2929C7.68342 13.9024 8.31658 13.9024 8.70711 14.2929L11 16.5858V5C11 4.44772 11.4477 4 12 4Z"/></svg>',
            command: 'block.moveDown'
        },
        'list': {
            title: '## buttons.list ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 6C6 5.44772 5.55228 5 5 5C4.44772 5 4 5.44772 4 6V6.01C4 6.56228 4.44772 7.01 5 7.01C5.55228 7.01 6 6.56228 6 6.01V6ZM9 5C8.44772 5 8 5.44772 8 6C8 6.55228 8.44772 7 9 7H20C20.5523 7 21 6.55228 21 6C21 5.44772 20.5523 5 20 5H9ZM9 11C8.44772 11 8 11.4477 8 12C8 12.5523 8.44772 13 9 13H20C20.5523 13 21 12.5523 21 12C21 11.4477 20.5523 11 20 11H9ZM8 18C8 17.4477 8.44772 17 9 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H9C8.44772 19 8 18.5523 8 18ZM5 11C5.55228 11 6 11.4477 6 12V12.01C6 12.5623 5.55228 13.01 5 13.01C4.44772 13.01 4 12.5623 4 12.01V12C4 11.4477 4.44772 11 5 11ZM6 18C6 17.4477 5.55228 17 5 17C4.44772 17 4 17.4477 4 18V18.01C4 18.5623 4.44772 19.01 5 19.01C5.55228 19.01 6 18.5623 6 18.01V18Z"/></svg>',
            command: 'list.popup'
        },
        'numberedlist': {
            title: '## buttons.numbered-list ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.38267 3.07612C6.75635 3.2309 6.99999 3.59554 6.99999 4V10C6.99999 10.5523 6.55227 11 5.99999 11C5.44771 11 4.99999 10.5523 4.99999 10V6.41421L4.7071 6.70711C4.31657 7.09763 3.68341 7.09763 3.29288 6.70711C2.90236 6.31658 2.90236 5.68342 3.29288 5.29289L5.29288 3.29289C5.57888 3.00689 6.009 2.92134 6.38267 3.07612ZM9.99999 6C9.99999 5.44771 10.4477 5 11 5H20C20.5523 5 21 5.44771 21 6C21 6.55228 20.5523 7 20 7H11C10.4477 7 9.99999 6.55228 9.99999 6ZM9.99999 12C9.99999 11.4477 10.4477 11 11 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H11C10.4477 13 9.99999 12.5523 9.99999 12ZM5.99999 15C5.73477 15 5.48042 15.1054 5.29288 15.2929C5.10535 15.4804 4.99999 15.7348 4.99999 16C4.99999 16.5523 4.55227 17 3.99999 17C3.44771 17 2.99999 16.5523 2.99999 16C2.99999 15.2043 3.31606 14.4413 3.87867 13.8787C4.44128 13.3161 5.20434 13 5.99999 13C6.79564 13 7.5587 13.3161 8.12131 13.8787C8.68392 14.4413 8.99999 15.2043 8.99999 16C8.99999 16.6051 8.73548 17.0689 8.47379 17.402C8.28592 17.6411 8.03874 17.8824 7.84515 18.0714C7.79485 18.1205 7.74818 18.166 7.7071 18.2071C7.68572 18.2285 7.66339 18.2489 7.64017 18.2682L6.76204 19H7.99999C8.55228 19 8.99999 19.4477 8.99999 20C8.99999 20.5523 8.55228 21 7.99999 21H3.99999C3.57897 21 3.20304 20.7363 3.05972 20.3404C2.91639 19.9445 3.03637 19.5013 3.35981 19.2318L6.32564 16.7602C6.37812 16.7081 6.42975 16.6576 6.47777 16.6106L6.4872 16.6014C6.54925 16.5407 6.605 16.4861 6.65796 16.4328C6.76524 16.3249 6.84297 16.2404 6.90119 16.1663C6.95852 16.0933 6.98291 16.0478 6.99308 16.0238C7.00043 16.0064 7.00009 16.0014 7 16.0002C7 16.0001 6.99999 16.0001 6.99999 16C6.99999 15.7348 6.89463 15.4804 6.7071 15.2929C6.51956 15.1054 6.26521 15 5.99999 15ZM11 18C11 17.4477 11.4477 17 12 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H12C11.4477 19 11 18.5523 11 18Z"/></svg>',
            command: 'format.set'
        },
        'bulletlist': {
            title: '## buttons.bullet-list ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 6C6 5.44772 5.55228 5 5 5C4.44772 5 4 5.44772 4 6V6.01C4 6.56228 4.44772 7.01 5 7.01C5.55228 7.01 6 6.56228 6 6.01V6ZM9 5C8.44772 5 8 5.44772 8 6C8 6.55228 8.44772 7 9 7H20C20.5523 7 21 6.55228 21 6C21 5.44772 20.5523 5 20 5H9ZM9 11C8.44772 11 8 11.4477 8 12C8 12.5523 8.44772 13 9 13H20C20.5523 13 21 12.5523 21 12C21 11.4477 20.5523 11 20 11H9ZM8 18C8 17.4477 8.44772 17 9 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H9C8.44772 19 8 18.5523 8 18ZM5 11C5.55228 11 6 11.4477 6 12V12.01C6 12.5623 5.55228 13.01 5 13.01C4.44772 13.01 4 12.5623 4 12.01V12C4 11.4477 4.44772 11 5 11ZM6 18C6 17.4477 5.55228 17 5 17C4.44772 17 4 17.4477 4 18V18.01C4 18.5623 4.44772 19.01 5 19.01C5.55228 19.01 6 18.5623 6 18.01V18Z"/></svg>',
            command: 'format.set'
        },
        'indent': {
            title: '## buttons.indent ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 6C8 5.44772 8.44772 5 9 5H20C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7H9C8.44772 7 8 6.55228 8 6ZM3.29289 7.29289C3.68342 6.90237 4.31658 6.90237 4.70711 7.29289L8.70711 11.2929C9.09763 11.6834 9.09763 12.3166 8.70711 12.7071L4.70711 16.7071C4.31658 17.0976 3.68342 17.0976 3.29289 16.7071C2.90237 16.3166 2.90237 15.6834 3.29289 15.2929L6.58579 12L3.29289 8.70711C2.90237 8.31658 2.90237 7.68342 3.29289 7.29289ZM13 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H13C12.4477 13 12 12.5523 12 12C12 11.4477 12.4477 11 13 11ZM8 18C8 17.4477 8.44772 17 9 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H9C8.44772 19 8 18.5523 8 18Z"/></svg>',
            command: 'list.indent'
        },
        'outdent': {
            title: '## buttons.outdent ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 6C12 5.44772 12.4477 5 13 5H20C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7H13C12.4477 7 12 6.55228 12 6ZM8.70711 7.29289C9.09763 7.68342 9.09763 8.31658 8.70711 8.70711L5.41421 12L8.70711 15.2929C9.09763 15.6834 9.09763 16.3166 8.70711 16.7071C8.31658 17.0976 7.68342 17.0976 7.29289 16.7071L3.29289 12.7071C2.90237 12.3166 2.90237 11.6834 3.29289 11.2929L7.29289 7.29289C7.68342 6.90237 8.31658 6.90237 8.70711 7.29289ZM10 12C10 11.4477 10.4477 11 11 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H11C10.4477 13 10 12.5523 10 12ZM12 18C12 17.4477 12.4477 17 13 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H13C12.4477 19 12 18.5523 12 18Z"/></svg>',
            command: 'list.outdent'
        },
        'dlist': {
            title: '## buttons.definition-list ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 5C5.36739 5 5.24021 5.05268 5.14645 5.14645C5.05268 5.24021 5 5.36739 5 5.5V7H6V5.5C6 5.36739 5.94732 5.24021 5.85355 5.14645C5.75979 5.05268 5.63261 5 5.5 5ZM8 5.5C8 4.83696 7.73661 4.20107 7.26777 3.73223C6.79893 3.26339 6.16304 3 5.5 3C4.83696 3 4.20107 3.26339 3.73223 3.73223C3.26339 4.20107 3 4.83696 3 5.5V10C3 10.5523 3.44772 11 4 11C4.55228 11 5 10.5523 5 10V9H6V10C6 10.5523 6.44772 11 7 11C7.55228 11 8 10.5523 8 10V5.5ZM10 6C10 5.44772 10.4477 5 11 5H20C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7H11C10.4477 7 10 6.55228 10 6ZM10 12C10 11.4477 10.4477 11 11 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H11C10.4477 13 10 12.5523 10 12ZM3 14C3 13.4477 3.44772 13 4 13H5.5C6.16304 13 6.79893 13.2634 7.26777 13.7322C7.73661 14.2011 8 14.837 8 15.5C8 16.044 7.82267 16.5698 7.50001 17C7.82267 17.4302 8 17.956 8 18.5C8 19.163 7.73661 19.7989 7.26777 20.2678C6.79893 20.7366 6.16304 21 5.5 21H4C3.44772 21 3 20.5523 3 20V14ZM5 18V19H5.5C5.63261 19 5.75978 18.9473 5.85355 18.8536C5.94732 18.7598 6 18.6326 6 18.5C6 18.3674 5.94732 18.2402 5.85355 18.1464C5.75978 18.0527 5.63261 18 5.5 18H5ZM5.5 16C5.63261 16 5.75978 15.9473 5.85355 15.8536C5.94732 15.7598 6 15.6326 6 15.5C6 15.3674 5.94732 15.2402 5.85355 15.1464C5.75979 15.0527 5.63261 15 5.5 15H5V16H5.5ZM10 18C10 17.4477 10.4477 17 11 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H11C10.4477 19 10 18.5523 10 18Z"/></svg>',
            command: 'block.add'
        },
        'hotkeys': {
            title: '## buttons.hotkeys ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 8C3 7.44772 3.44772 7 4 7H20C20.5523 7 21 7.44772 21 8V16C21 16.5523 20.5523 17 20 17H4C3.44772 17 3 16.5523 3 16V8ZM4 5C2.34315 5 1 6.34315 1 8V16C1 17.6569 2.34315 19 4 19H20C21.6569 19 23 17.6569 23 16V8C23 6.34315 21.6569 5 20 5H4ZM7 14C7 13.4477 6.55228 13 6 13C5.44772 13 5 13.4477 5 14V14.01C5 14.5623 5.44772 15.01 6 15.01C6.55228 15.01 7 14.5623 7 14.01V14ZM6 9C6.55228 9 7 9.44772 7 10V10.01C7 10.5623 6.55228 11.01 6 11.01C5.44772 11.01 5 10.5623 5 10.01V10C5 9.44772 5.44772 9 6 9ZM11 10C11 9.44772 10.5523 9 10 9C9.44771 9 9 9.44772 9 10V10.01C9 10.5623 9.44771 11.01 10 11.01C10.5523 11.01 11 10.5623 11 10.01V10ZM14 9C14.5523 9 15 9.44772 15 10V10.01C15 10.5623 14.5523 11.01 14 11.01C13.4477 11.01 13 10.5623 13 10.01V10C13 9.44772 13.4477 9 14 9ZM19 10C19 9.44772 18.5523 9 18 9C17.4477 9 17 9.44772 17 10V10.01C17 10.5623 17.4477 11.01 18 11.01C18.5523 11.01 19 10.5623 19 10.01V10ZM18 13C18.5523 13 19 13.4477 19 14V14.01C19 14.5623 18.5523 15.01 18 15.01C17.4477 15.01 17 14.5623 17 14.01V14C17 13.4477 17.4477 13 18 13ZM10 13C9.44771 13 9 13.4477 9 14C9 14.5523 9.44771 15 10 15H14C14.5523 15 15 14.5523 15 14C15 13.4477 14.5523 13 14 13H10Z"/></svg>',
            command: 'hotkeys.popup'
        },
        'undo': {
            title: '## buttons.undo ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.70711 4.29289C10.0976 4.68342 10.0976 5.31658 9.70711 5.70711L7.41421 8H16C17.3261 8 18.5979 8.52678 19.5355 9.46447C20.4732 10.4021 21 11.6739 21 13C21 14.3261 20.4732 15.5979 19.5355 16.5355C18.5979 17.4732 17.3261 18 16 18H15C14.4477 18 14 17.5523 14 17C14 16.4477 14.4477 16 15 16H16C16.7956 16 17.5587 15.6839 18.1213 15.1213C18.6839 14.5587 19 13.7956 19 13C19 12.2044 18.6839 11.4413 18.1213 10.8787C17.5587 10.3161 16.7956 10 16 10H7.41421L9.70711 12.2929C10.0976 12.6834 10.0976 13.3166 9.70711 13.7071C9.31658 14.0976 8.68342 14.0976 8.29289 13.7071L4.29329 9.7075C4.29316 9.70737 4.29303 9.70724 4.29289 9.70711C4.29219 9.7064 4.29148 9.70569 4.29078 9.70498C4.19595 9.6096 4.12432 9.49986 4.07588 9.38278C4.02699 9.26488 4 9.13559 4 9C4 8.86441 4.02699 8.73512 4.07588 8.61722C4.12468 8.49927 4.19702 8.38877 4.29289 8.29289L8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289Z"/></svg>',
            command: 'state.undo'
        },
        'redo': {
            title: '## buttons.redo ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.2929 4.29289C14.9024 4.68342 14.9024 5.31658 15.2929 5.70711L17.5858 8H9C7.67392 8 6.40215 8.52678 5.46447 9.46447C4.52678 10.4021 4 11.6739 4 13C4 14.3261 4.52678 15.5979 5.46447 16.5355C6.40215 17.4732 7.67392 18 9 18H10C10.5523 18 11 17.5523 11 17C11 16.4477 10.5523 16 10 16H9C8.20435 16 7.44129 15.6839 6.87868 15.1213C6.31607 14.5587 6 13.7956 6 13C6 12.2044 6.31607 11.4413 6.87868 10.8787C7.44129 10.3161 8.20435 10 9 10H17.5858L15.2929 12.2929C14.9024 12.6834 14.9024 13.3166 15.2929 13.7071C15.6834 14.0976 16.3166 14.0976 16.7071 13.7071L20.7067 9.7075C20.7068 9.70737 20.707 9.70724 20.7071 9.70711C20.7078 9.7064 20.7085 9.70569 20.7092 9.70498C20.804 9.6096 20.8757 9.49986 20.9241 9.38278C20.973 9.26488 21 9.13559 21 9C21 8.86441 20.973 8.73512 20.9241 8.61722C20.8753 8.49927 20.803 8.38877 20.7071 8.29289L16.7071 4.29289C16.3166 3.90237 15.6834 3.90237 15.2929 4.29289Z"/></svg>',
            command: 'state.redo'
        },
        'toggle': {
            title: '## buttons.toggle ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 7C3.44772 7 3 7.44772 3 8C3 8.55228 3.44772 9 4 9H20C20.5523 9 21 8.55228 21 8C21 7.44772 20.5523 7 20 7H4ZM4 15C3.44772 15 3 15.4477 3 16C3 16.5523 3.44772 17 4 17H20C20.5523 17 21 16.5523 21 16C21 15.4477 20.5523 15 20 15H4Z"/></svg>',
            command: 'control.popup'
        },
        'duplicate': {
            title: '## buttons.duplicate ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 3C5.20435 3 4.44129 3.31607 3.87868 3.87868C3.31607 4.44129 3 5.20435 3 6V14C3 14.7956 3.31607 15.5587 3.87868 16.1213C4.44129 16.6839 5.20435 17 6 17H7V18C7 19.6569 8.34315 21 10 21H18C19.6569 21 21 19.6569 21 18V10C21 8.34315 19.6569 7 18 7H17V6C17 5.20435 16.6839 4.44129 16.1213 3.87868C15.5587 3.31607 14.7956 3 14 3H6ZM15 7V6C15 5.73478 14.8946 5.48043 14.7071 5.29289C14.5196 5.10536 14.2652 5 14 5H6C5.73478 5 5.48043 5.10536 5.29289 5.29289C5.10536 5.48043 5 5.73478 5 6V14C5 14.2652 5.10536 14.5196 5.29289 14.7071C5.48043 14.8946 5.73478 15 6 15H7V10C7 8.34315 8.34315 7 10 7H15ZM9 16V18C9 18.5523 9.44772 19 10 19H18C18.5523 19 19 18.5523 19 18V10C19 9.44772 18.5523 9 18 9H16H10C9.44772 9 9 9.44772 9 10V16Z"/></svg>',
            command: 'block.duplicate'
        },
        'trash': {
            title: '## buttons.delete ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 2C9.46957 2 8.96086 2.21071 8.58579 2.58579C8.21071 2.96086 8 3.46957 8 4V6H5.01218H4.99004H4C3.44772 6 3 6.44772 3 7C3 7.55229 3.44772 8 4 8H4.07986L5.00034 19.0458C5.01222 19.8249 5.32687 20.5695 5.87867 21.1213C6.44128 21.6839 7.20434 22 7.99999 22H16C16.7956 22 17.5587 21.6839 18.1213 21.1213C18.6731 20.5695 18.9878 19.8249 18.9996 19.0458L19.9201 8H20C20.5523 8 21 7.55229 21 7C21 6.44772 20.5523 6 20 6H19.0099H18.9878H16V4C16 3.46957 15.7893 2.96086 15.4142 2.58579C15.0391 2.21071 14.5304 2 14 2H10ZM14 6V4L10 4L10 6H14ZM9 8H6.08679L6.99654 18.9169C6.99884 18.9446 6.99999 18.9723 6.99999 19C6.99999 19.2652 7.10535 19.5196 7.29289 19.7071C7.48042 19.8946 7.73478 20 7.99999 20H16C16.2652 20 16.5196 19.8946 16.7071 19.7071C16.8946 19.5196 17 19.2652 17 19C17 18.9723 17.0011 18.9446 17.0034 18.9169L17.9132 8H15H9ZM10 10C10.5523 10 11 10.4477 11 11V17C11 17.5523 10.5523 18 10 18C9.44772 18 9 17.5523 9 17V11C9 10.4477 9.44772 10 10 10ZM15 11C15 10.4477 14.5523 10 14 10C13.4477 10 13 10.4477 13 11V17C13 17.5523 13.4477 18 14 18C14.5523 18 15 17.5523 15 17V11Z"/></svg>',
            danger: true,
            command: 'block.remove'
        },
        'table': {
            title: '## buttons.table ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 4C4.73478 4 4.48043 4.10536 4.29289 4.29289C4.10536 4.48043 4 4.73478 4 5V9H9V4H5ZM5 2C4.20435 2 3.44129 2.31607 2.87868 2.87868C2.31607 3.44129 2 4.20435 2 5V19C2 19.7957 2.31607 20.5587 2.87868 21.1213C3.44129 21.6839 4.20435 22 5 22H19C19.7957 22 20.5587 21.6839 21.1213 21.1213C21.6839 20.5587 22 19.7957 22 19V5C22 4.20435 21.6839 3.44129 21.1213 2.87868C20.5587 2.31607 19.7957 2 19 2H5ZM11 4V9H20V5C20 4.73478 19.8946 4.48043 19.7071 4.29289C19.5196 4.10536 19.2652 4 19 4H11ZM20 11H11V20H19C19.2652 20 19.5196 19.8946 19.7071 19.7071C19.8946 19.5196 20 19.2652 20 19V11ZM9 20V11H4V19C4 19.2652 4.10536 19.5196 4.29289 19.7071C4.48043 19.8946 4.73478 20 5 20H9Z"/></svg>',
            observer: 'table.observe',
            command: 'block.add'
        },
        'cell-setting': {
            title: '## table.cell-setting ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 3C6.55228 3 7 3.44772 7 4V7.17157C7.4179 7.31933 7.80192 7.55928 8.12132 7.87868C8.68393 8.44129 9 9.20435 9 10C9 10.7956 8.68393 11.5587 8.12132 12.1213C7.80192 12.4407 7.4179 12.6807 7 12.8284V20C7 20.5523 6.55228 21 6 21C5.44772 21 5 20.5523 5 20V12.8284C4.5821 12.6807 4.19808 12.4407 3.87868 12.1213C3.31607 11.5587 3 10.7956 3 10C3 9.20435 3.31607 8.44129 3.87868 7.87868C4.19808 7.55928 4.5821 7.31933 5 7.17157V4C5 3.44772 5.44772 3 6 3ZM12 3C12.5523 3 13 3.44772 13 4V13.1716C13.4179 13.3193 13.8019 13.5593 14.1213 13.8787C14.6839 14.4413 15 15.2043 15 16C15 16.7957 14.6839 17.5587 14.1213 18.1213C13.8019 18.4407 13.4179 18.6807 13 18.8284V20C13 20.5523 12.5523 21 12 21C11.4477 21 11 20.5523 11 20V18.8284C10.5821 18.6807 10.1981 18.4407 9.87868 18.1213C9.31607 17.5587 9 16.7957 9 16C9 15.2043 9.31607 14.4413 9.87868 13.8787C10.1981 13.5593 10.5821 13.3193 11 13.1716V4C11 3.44772 11.4477 3 12 3ZM18 3C18.5523 3 19 3.44772 19 4V4.17157C19.4179 4.31933 19.8019 4.55927 20.1213 4.87868C20.6839 5.44129 21 6.20435 21 7C21 7.79565 20.6839 8.55871 20.1213 9.12132C19.8019 9.44072 19.4179 9.68067 19 9.82843V20C19 20.5523 18.5523 21 18 21C17.4477 21 17 20.5523 17 20V9.82843C16.5821 9.68067 16.1981 9.44072 15.8787 9.12132C15.3161 8.55871 15 7.79565 15 7C15 6.20435 15.3161 5.44129 15.8787 4.87868C16.1981 4.55927 16.5821 4.31933 17 4.17157V4C17 3.44772 17.4477 3 18 3ZM18 6C17.7348 6 17.4804 6.10536 17.2929 6.29289C17.1054 6.48043 17 6.73478 17 7C17 7.26522 17.1054 7.51957 17.2929 7.70711C17.4804 7.89464 17.7348 8 18 8C18.2652 8 18.5196 7.89464 18.7071 7.70711C18.8946 7.51957 19 7.26522 19 7C19 6.73478 18.8946 6.48043 18.7071 6.29289C18.5196 6.10536 18.2652 6 18 6ZM6 9C5.73478 9 5.48043 9.10536 5.29289 9.29289C5.10536 9.48043 5 9.73478 5 10C5 10.2652 5.10536 10.5196 5.29289 10.7071C5.48043 10.8946 5.73478 11 6 11C6.26522 11 6.51957 10.8946 6.70711 10.7071C6.89464 10.5196 7 10.2652 7 10C7 9.73478 6.89464 9.48043 6.70711 9.29289C6.51957 9.10536 6.26522 9 6 9ZM12 15C11.7348 15 11.4804 15.1054 11.2929 15.2929C11.1054 15.4804 11 15.7348 11 16C11 16.2652 11.1054 16.5196 11.2929 16.7071C11.4804 16.8946 11.7348 17 12 17C12.2652 17 12.5196 16.8946 12.7071 16.7071C12.8946 16.5196 13 16.2652 13 16C13 15.7348 12.8946 15.4804 12.7071 15.2929C12.5196 15.1054 12.2652 15 12 15Z"/></svg>',
            command: 'table.cellSetting'
        },
        'embed': {
            title: '## buttons.embed ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 6C5.73478 6 5.48043 6.10536 5.29289 6.29289C5.10536 6.48043 5 6.73478 5 7V11C5 11.2652 4.89464 11.5196 4.70711 11.7071L4.41421 12L4.70711 12.2929C4.89464 12.4804 5 12.7348 5 13V17C5 17.2652 5.10536 17.5196 5.29289 17.7071C5.48043 17.8946 5.73478 18 6 18C6.55228 18 7 18.4477 7 19C7 19.5523 6.55228 20 6 20C5.20435 20 4.44129 19.6839 3.87868 19.1213C3.31607 18.5587 3 17.7956 3 17V13.4142L2.29289 12.7071C1.90237 12.3166 1.90237 11.6834 2.29289 11.2929L3 10.5858V7C3 6.20435 3.31607 5.44129 3.87868 4.87868C4.44129 4.31607 5.20435 4 6 4C6.55228 4 7 4.44772 7 5C7 5.55228 6.55228 6 6 6ZM17 5C17 4.44772 17.4477 4 18 4C18.7956 4 19.5587 4.31607 20.1213 4.87868C20.6839 5.44129 21 6.20435 21 7V10.5858L21.7071 11.2929C22.0976 11.6834 22.0976 12.3166 21.7071 12.7071L21 13.4142V17C21 17.7957 20.6839 18.5587 20.1213 19.1213C19.5587 19.6839 18.7957 20 18 20C17.4477 20 17 19.5523 17 19C17 18.4477 17.4477 18 18 18C18.2652 18 18.5196 17.8946 18.7071 17.7071C18.8946 17.5196 19 17.2652 19 17V13C19 12.7348 19.1054 12.4804 19.2929 12.2929L19.5858 12L19.2929 11.7071C19.1054 11.5196 19 11.2652 19 11V7C19 6.73478 18.8946 6.48043 18.7071 6.29289C18.5196 6.10536 18.2652 6 18 6C17.4477 6 17 5.55228 17 5ZM12 8C12.5523 8 13 8.44772 13 9V11H15C15.5523 11 16 11.4477 16 12C16 12.5523 15.5523 13 15 13H13V15C13 15.5523 12.5523 16 12 16C11.4477 16 11 15.5523 11 15V13H9C8.44772 13 8 12.5523 8 12C8 11.4477 8.44772 11 9 11H11V9C11 8.44772 11.4477 8 12 8Z"/></svg>',
            observer: 'embed.observe',
            command: 'embed.popup'
        },
        'quote': {
            title: '## buttons.quote ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.58579 5.58579C4.96086 5.21071 5.46957 5 6 5H9C9.53043 5 10.0391 5.21071 10.4142 5.58579C10.7893 5.96086 11 6.46957 11 7V13C11 14.5025 10.6219 15.8236 9.78098 16.8747C8.94259 17.9227 7.72684 18.5989 6.24262 18.9701C5.70684 19.1041 5.16387 18.7784 5.02988 18.2426C4.89588 17.7068 5.2216 17.1639 5.75738 17.0299C6.94016 16.7341 7.72441 16.2438 8.21927 15.6253C8.7116 15.0099 9 14.1645 9 13V12H6C5.46957 12 4.96086 11.7893 4.58579 11.4142C4.21071 11.0391 4 10.5304 4 10V7C4 6.46957 4.21071 5.96086 4.58579 5.58579ZM9 10V7L6 7L6 10H9ZM13.5858 5.58579C13.9609 5.21071 14.4696 5 15 5H18C18.5304 5 19.0391 5.21071 19.4142 5.58579C19.7893 5.96086 20 6.46957 20 7V13C20 14.5025 19.6219 15.8236 18.781 16.8747C17.9426 17.9227 16.7268 18.5989 15.2426 18.9701C14.7068 19.1041 14.1639 18.7784 14.0299 18.2426C13.8959 17.7068 14.2216 17.1639 14.7574 17.0299C15.9402 16.7341 16.7244 16.2438 17.2193 15.6253C17.7116 15.0099 18 14.1645 18 13V12H15C14.4696 12 13.9609 11.7893 13.5858 11.4142C13.2107 11.0391 13 10.5304 13 10V7C13 6.46957 13.2107 5.96086 13.5858 5.58579ZM18 10L18 7H15V10H18Z"/></svg>',
            command: 'format.set'
        },
        'layout': {
            title: '## buttons.layout ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H20C20.5304 2 21.0391 2.21071 21.4142 2.58579C21.7893 2.96086 22 3.46957 22 4V20C22 20.5304 21.7893 21.0391 21.4142 21.4142C21.0391 21.7893 20.5304 22 20 22H4C3.46957 22 2.96086 21.7893 2.58579 21.4142C2.21071 21.0391 2 20.5304 2 20V4C2 3.46957 2.21071 2.96086 2.58579 2.58579ZM13 20H20V4H13V20ZM11 4V20H4V4H11Z"/></svg>',
            command: 'layout.popup'
        },
        'wrapper': {
            title: '## buttons.wrapper ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 6C4.73478 6 4.48043 6.10536 4.29289 6.29289C4.10536 6.48043 4 6.73478 4 7V17C4 17.2652 4.10536 17.5196 4.29289 17.7071C4.48043 17.8946 4.73478 18 5 18H19C19.2652 18 19.5196 17.8946 19.7071 17.7071C19.8946 17.5196 20 17.2652 20 17V7C20 6.73478 19.8946 6.48043 19.7071 6.29289C19.5196 6.10536 19.2652 6 19 6H5ZM2.87868 4.87868C3.44129 4.31607 4.20435 4 5 4H19C19.7957 4 20.5587 4.31607 21.1213 4.87868C21.6839 5.44129 22 6.20435 22 7V17C22 17.7957 21.6839 18.5587 21.1213 19.1213C20.5587 19.6839 19.7957 20 19 20H5C4.20435 20 3.44129 19.6839 2.87868 19.1213C2.31607 18.5587 2 17.7956 2 17V7C2 6.20435 2.31607 5.44129 2.87868 4.87868Z"/></svg>',
            command: 'block.add'
        },
        'todo': {
            title: '## buttons.todo ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.79289 3.79289C7.18342 3.40237 7.81658 3.40237 8.20711 3.79289C8.59763 4.18342 8.59763 4.81658 8.20711 5.20711L5.70711 7.70711C5.31658 8.09763 4.68342 8.09763 4.29289 7.70711L2.79289 6.20711C2.40237 5.81658 2.40237 5.18342 2.79289 4.79289C3.18342 4.40237 3.81658 4.40237 4.20711 4.79289L5 5.58579L6.79289 3.79289ZM10 6C10 5.44772 10.4477 5 11 5H20C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7H11C10.4477 7 10 6.55228 10 6ZM8.20711 9.79289C8.59763 10.1834 8.59763 10.8166 8.20711 11.2071L5.70711 13.7071C5.31658 14.0976 4.68342 14.0976 4.29289 13.7071L2.79289 12.2071C2.40237 11.8166 2.40237 11.1834 2.79289 10.7929C3.18342 10.4024 3.81658 10.4024 4.20711 10.7929L5 11.5858L6.79289 9.79289C7.18342 9.40237 7.81658 9.40237 8.20711 9.79289ZM10 12C10 11.4477 10.4477 11 11 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H11C10.4477 13 10 12.5523 10 12ZM8.20711 15.7929C8.59763 16.1834 8.59763 16.8166 8.20711 17.2071L5.70711 19.7071C5.31658 20.0976 4.68342 20.0976 4.29289 19.7071L2.79289 18.2071C2.40237 17.8166 2.40237 17.1834 2.79289 16.7929C3.18342 16.4024 3.81658 16.4024 4.20711 16.7929L5 17.5858L6.79289 15.7929C7.18342 15.4024 7.81658 15.4024 8.20711 15.7929ZM10 18C10 17.4477 10.4477 17 11 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H11C10.4477 19 10 18.5523 10 18Z"/></svg>',
            command: 'format.set'
        },
        'pre': {
            title: '## buttons.code-snippet ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.2425 3.02986C14.7783 3.16381 15.1041 3.70674 14.9701 4.24254L10.9701 20.2425C10.8362 20.7783 10.2933 21.1041 9.75746 20.9701C9.22167 20.8362 8.89591 20.2933 9.02986 19.7575L13.0299 3.75746C13.1638 3.22167 13.7067 2.89591 14.2425 3.02986ZM7.70711 7.29289C8.09763 7.68342 8.09763 8.31658 7.70711 8.70711L4.41421 12L7.70711 15.2929C8.09763 15.6834 8.09763 16.3166 7.70711 16.7071C7.31658 17.0976 6.68342 17.0976 6.29289 16.7071L2.29289 12.7071C1.90237 12.3166 1.90237 11.6834 2.29289 11.2929L6.29289 7.29289C6.68342 6.90237 7.31658 6.90237 7.70711 7.29289ZM16.2929 7.29289C16.6834 6.90237 17.3166 6.90237 17.7071 7.29289L21.7071 11.2929C22.0976 11.6834 22.0976 12.3166 21.7071 12.7071L17.7071 16.7071C17.3166 17.0976 16.6834 17.0976 16.2929 16.7071C15.9024 16.3166 15.9024 15.6834 16.2929 15.2929L19.5858 12L16.2929 8.70711C15.9024 8.31658 15.9024 7.68342 16.2929 7.29289Z"/></svg>',
            command: 'block.add'
        },
        'line': {
            title: '## buttons.line ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 12C3 11.4477 3.44772 11 4 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H4C3.44772 13 3 12.5523 3 12Z"/></svg>',
            command: 'block.add'
        },
        'parent': {
            title: '## buttons.parent ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 6H16C16.5523 6 17 6.44772 17 7C17 7.55228 16.5523 8 16 8H9.41421L17.7071 16.2929C18.0976 16.6834 18.0976 17.3166 17.7071 17.7071C17.3166 18.0976 16.6834 18.0976 16.2929 17.7071L8 9.41421V16C8 16.5523 7.55228 17 7 17C6.44772 17 6 16.5523 6 16V7C6 6.44772 6.44772 6 7 6Z"/></svg>',
            command: 'block.setParent'
        },
        'code': {
            title: '## buttons.code ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.2425 3.02986C14.7783 3.16381 15.1041 3.70674 14.9701 4.24254L10.9701 20.2425C10.8362 20.7783 10.2933 21.1041 9.75746 20.9701C9.22167 20.8362 8.89591 20.2933 9.02986 19.7575L13.0299 3.75746C13.1638 3.22167 13.7067 2.89591 14.2425 3.02986ZM7.70711 7.29289C8.09763 7.68342 8.09763 8.31658 7.70711 8.70711L4.41421 12L7.70711 15.2929C8.09763 15.6834 8.09763 16.3166 7.70711 16.7071C7.31658 17.0976 6.68342 17.0976 6.29289 16.7071L2.29289 12.7071C1.90237 12.3166 1.90237 11.6834 2.29289 11.2929L6.29289 7.29289C6.68342 6.90237 7.31658 6.90237 7.70711 7.29289ZM16.2929 7.29289C16.6834 6.90237 17.3166 6.90237 17.7071 7.29289L21.7071 11.2929C22.0976 11.6834 22.0976 12.3166 21.7071 12.7071L17.7071 16.7071C17.3166 17.0976 16.6834 17.0976 16.2929 16.7071C15.9024 16.3166 15.9024 15.6834 16.2929 15.2929L19.5858 12L16.2929 8.70711C15.9024 8.31658 15.9024 7.68342 16.2929 7.29289Z"/></svg>',
            command: 'inline.set',
            params: { tag: 'code' }
        },
        'underline': {
            title: '## buttons.underline ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 4C7.55228 4 8 4.44772 8 5V10C8 11.0609 8.42143 12.0783 9.17157 12.8284C9.92172 13.5786 10.9391 14 12 14C13.0609 14 14.0783 13.5786 14.8284 12.8284C15.5786 12.0783 16 11.0609 16 10V5C16 4.44772 16.4477 4 17 4C17.5523 4 18 4.44772 18 5V10C18 11.5913 17.3679 13.1174 16.2426 14.2426C15.1174 15.3679 13.5913 16 12 16C10.4087 16 8.88258 15.3679 7.75736 14.2426C6.63214 13.1174 6 11.5913 6 10V5C6 4.44772 6.44772 4 7 4ZM4 19C4 18.4477 4.44772 18 5 18H19C19.5523 18 20 18.4477 20 19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19Z"/></svg>',
            command: 'inline.set',
            params: { tag: 'u' }
        },
        'highlight': {
            title: '## buttons.highlight ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7929 3.79289C13.5109 3.07492 14.4846 2.67157 15.5 2.67157C16.5154 2.67157 17.4891 3.07492 18.2071 3.79289C18.9251 4.51086 19.3284 5.48464 19.3284 6.5C19.3284 7.51536 18.9251 8.48913 18.2071 9.2071L17.2085 10.2057C17.2081 10.2061 17.2076 10.2066 17.2071 10.2071C17.2066 10.2076 17.2061 10.2081 17.2057 10.2085L9.20854 18.2057C9.20807 18.2061 9.20759 18.2066 9.20711 18.2071C9.20663 18.2076 9.20615 18.2081 9.20567 18.2085L7.70711 19.7071C7.51957 19.8946 7.26522 20 7 20H3C2.44772 20 2 19.5523 2 19V15C2 14.7348 2.10536 14.4804 2.29289 14.2929L12.7929 3.79289ZM12.5 6.91421L5.91421 13.5L8.5 16.0858L15.0858 9.5L12.5 6.91421ZM16.5 8.08579L13.9142 5.5L14.2071 5.2071C14.55 4.86421 15.0151 4.67157 15.5 4.67157C15.9849 4.67157 16.45 4.86421 16.7929 5.2071C17.1358 5.55 17.3284 6.01507 17.3284 6.5C17.3284 6.98493 17.1358 7.44999 16.7929 7.79289L16.5 8.08579ZM7.08579 17.5L4.5 14.9142L4 15.4142V18H6.58579L7.08579 17.5ZM16.2929 14.2929C16.4804 14.1054 16.7348 14 17 14H21C21.5523 14 22 14.4477 22 15V19C22 19.5523 21.5523 20 21 20H13C12.5955 20 12.2309 19.7564 12.0761 19.3827C11.9213 19.009 12.0069 18.5789 12.2929 18.2929L16.2929 14.2929ZM20 16H17.4142L15.4142 18H20V16Z"/></svg>',
            command: 'inline.set',
            params: { tag: 'mark' }
        },
        'sup': {
            title: '## buttons.superscript ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.9565 3.09068C18.7281 2.88025 19.5517 2.98495 20.2461 3.38175C20.5899 3.57822 20.8917 3.8405 21.1342 4.1536C21.3767 4.4667 21.5551 4.82449 21.6593 5.20655C21.7635 5.5886 21.7914 5.98744 21.7415 6.38029C21.6915 6.77313 21.5647 7.1523 21.3682 7.49613C21.3352 7.55397 21.2964 7.60836 21.2526 7.6585L19.2037 9.99999H21C21.5523 9.99999 22 10.4477 22 11C22 11.5523 21.5523 12 21 12H17C16.6076 12 16.2515 11.7705 16.0893 11.4132C15.9272 11.0559 15.989 10.6368 16.2474 10.3415L19.6701 6.42985C19.7146 6.33455 19.7441 6.23275 19.7574 6.12807C19.7743 5.99576 19.7648 5.86144 19.7298 5.73278C19.6947 5.60411 19.6346 5.48362 19.5529 5.37818C19.4713 5.27273 19.3696 5.1844 19.2538 5.11824C19.02 4.9846 18.7426 4.94934 18.4828 5.02021C18.2229 5.09108 18.0019 5.26227 17.8682 5.49613C17.5942 5.97565 16.9834 6.14225 16.5038 5.86824C16.0243 5.59423 15.8577 4.98337 16.1317 4.50385C16.5285 3.80945 17.1849 3.30112 17.9565 3.09068ZM4.37528 6.21913C4.80654 5.87412 5.43584 5.94404 5.78084 6.3753L8.99998 10.3992L12.2191 6.3753C12.5641 5.94404 13.1934 5.87412 13.6247 6.21913C14.0559 6.56414 14.1259 7.19343 13.7808 7.62469L10.2806 12L13.7808 16.3753C14.1259 16.8066 14.0559 17.4359 13.6247 17.7809C13.1934 18.1259 12.5641 18.056 12.2191 17.6247L8.99998 13.6008L5.78084 17.6247C5.43584 18.056 4.80654 18.1259 4.37528 17.7809C3.94402 17.4359 3.8741 16.8066 4.21911 16.3753L7.71935 12L4.21911 7.62469C3.8741 7.19343 3.94402 6.56414 4.37528 6.21913Z"/></svg>',
            command: 'inline.set',
            params: { tag: 'sup' }
        },
        'sub': {
            title: '## buttons.subscript ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.37528 6.21914C4.80654 5.87413 5.43584 5.94405 5.78084 6.37531L8.99998 10.3992L12.2191 6.37531C12.5641 5.94405 13.1934 5.87413 13.6247 6.21914C14.0559 6.56415 14.1259 7.19344 13.7808 7.6247L10.2806 12L13.7808 16.3753C14.1259 16.8066 14.0559 17.4359 13.6247 17.7809C13.1934 18.1259 12.5641 18.056 12.2191 17.6247L8.99998 13.6008L5.78084 17.6247C5.43584 18.056 4.80654 18.1259 4.37528 17.7809C3.94402 17.4359 3.8741 16.8066 4.21911 16.3753L7.71935 12L4.21911 7.6247C3.8741 7.19344 3.94402 6.56415 4.37528 6.21914ZM17.9565 12.0907C18.3386 11.9865 18.7374 11.9586 19.1303 12.0085C19.5231 12.0585 19.9023 12.1853 20.2461 12.3818C20.5899 12.5782 20.8917 12.8405 21.1342 13.1536C21.3767 13.4667 21.5551 13.8245 21.6593 14.2066C21.7635 14.5886 21.7914 14.9875 21.7415 15.3803C21.6915 15.7731 21.5647 16.1523 21.3682 16.4961C21.3352 16.554 21.2964 16.6084 21.2526 16.6585L19.2037 19H21C21.5523 19 22 19.4477 22 20C22 20.5523 21.5523 21 21 21H17C16.6076 21 16.2515 20.7705 16.0893 20.4132C15.9272 20.0559 15.989 19.6368 16.2474 19.3415L19.6701 15.4299C19.7146 15.3346 19.7441 15.2328 19.7574 15.1281C19.7743 14.9958 19.7648 14.8615 19.7298 14.7328C19.6947 14.6041 19.6346 14.4836 19.5529 14.3782C19.4713 14.2727 19.3696 14.1844 19.2538 14.1182C19.138 14.0521 19.0104 14.0094 18.878 13.9926C18.7457 13.9757 18.6114 13.9851 18.4828 14.0202C18.3541 14.0553 18.2336 14.1154 18.1282 14.1971C18.0227 14.2787 17.9344 14.3804 17.8682 14.4961C17.5942 14.9757 16.9834 15.1423 16.5038 14.8682C16.0243 14.5942 15.8577 13.9834 16.1317 13.5039C16.3282 13.16 16.5905 12.8583 16.9036 12.6158C17.2167 12.3733 17.5745 12.1949 17.9565 12.0907Z"/></svg>',
            command: 'inline.set',
            params: { tag: 'sub' }
        },
        'removeinline': {
            title: '## buttons.clear-all-styles ##',
            position: 'last',
            command: 'inline.removeFormat'
        },
        'heading': {
            title: '## buttons.heading ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 6C2 5.44772 2.44772 5 3 5H5C5.55228 5 6 5.44772 6 6C6 6.55228 5.55228 7 5 7V11H11V7C10.4477 7 10 6.55228 10 6C10 5.44772 10.4477 5 11 5H13C13.5523 5 14 5.44772 14 6C14 6.55228 13.5523 7 13 7V17C13.5523 17 14 17.4477 14 18C14 18.5523 13.5523 19 13 19H11C10.4477 19 10 18.5523 10 18C10 17.4477 10.4477 17 11 17V13H5V17C5.55228 17 6 17.4477 6 18C6 18.5523 5.55228 19 5 19H3C2.44772 19 2 18.5523 2 18C2 17.4477 2.44772 17 3 17V7C2.44772 7 2 6.55228 2 6ZM19.3827 9.07612C19.7564 9.2309 20 9.59554 20 10V18C20 18.5523 19.5523 19 19 19C18.4477 19 18 18.5523 18 18V12.4142L17.7071 12.7071C17.3166 13.0976 16.6834 13.0976 16.2929 12.7071C15.9024 12.3166 15.9024 11.6834 16.2929 11.2929L18.2929 9.29289C18.5789 9.0069 19.009 8.92134 19.3827 9.07612Z"/></svg>',
            command: 'block.add'
        },
        'text': {
            title: '## buttons.text ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 6C5 5.44772 5.44772 5 6 5H18C18.5523 5 19 5.44772 19 6C19 6.55228 18.5523 7 18 7H13V18C13 18.5523 12.5523 19 12 19C11.4477 19 11 18.5523 11 18V7H6C5.44772 7 5 6.55228 5 6Z"/></svg>',
            command: 'format.set'
        },
        'h1': {
            title: '## buttons.heading ## 1',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 6C2 5.44772 2.44772 5 3 5H5C5.55228 5 6 5.44772 6 6C6 6.55228 5.55228 7 5 7V11H11V7C10.4477 7 10 6.55228 10 6C10 5.44772 10.4477 5 11 5H13C13.5523 5 14 5.44772 14 6C14 6.55228 13.5523 7 13 7V17C13.5523 17 14 17.4477 14 18C14 18.5523 13.5523 19 13 19H11C10.4477 19 10 18.5523 10 18C10 17.4477 10.4477 17 11 17V13H5V17C5.55228 17 6 17.4477 6 18C6 18.5523 5.55228 19 5 19H3C2.44772 19 2 18.5523 2 18C2 17.4477 2.44772 17 3 17V7C2.44772 7 2 6.55228 2 6ZM19.3827 9.07612C19.7564 9.2309 20 9.59554 20 10V18C20 18.5523 19.5523 19 19 19C18.4477 19 18 18.5523 18 18V12.4142L17.7071 12.7071C17.3166 13.0976 16.6834 13.0976 16.2929 12.7071C15.9024 12.3166 15.9024 11.6834 16.2929 11.2929L18.2929 9.29289C18.5789 9.0069 19.009 8.92134 19.3827 9.07612Z"/></svg>',
            command: 'format.set'
        },
        'h2': {
            title: '## buttons.heading ## 2',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 6C2 5.44772 2.44772 5 3 5H5C5.55228 5 6 5.44772 6 6C6 6.55228 5.55228 7 5 7V11H11V7C10.4477 7 10 6.55228 10 6C10 5.44772 10.4477 5 11 5H13C13.5523 5 14 5.44772 14 6C14 6.55228 13.5523 7 13 7V17C13.5523 17 14 17.4477 14 18C14 18.5523 13.5523 19 13 19H11C10.4477 19 10 18.5523 10 18C10 17.4477 10.4477 17 11 17V13H5V17C5.55228 17 6 17.4477 6 18C6 18.5523 5.55228 19 5 19H3C2.44772 19 2 18.5523 2 18C2 17.4477 2.44772 17 3 17V7C2.44772 7 2 6.55228 2 6ZM19 11C18.7348 11 18.4804 11.1054 18.2929 11.2929C18.1054 11.4804 18 11.7348 18 12C18 12.5523 17.5523 13 17 13C16.4477 13 16 12.5523 16 12C16 11.2043 16.3161 10.4413 16.8787 9.87868C17.4413 9.31607 18.2043 9 19 9C19.7957 9 20.5587 9.31607 21.1213 9.87868C21.6839 10.4413 22 11.2043 22 12C22 12.5095 21.8269 12.9956 21.6442 13.3786C21.4547 13.776 21.2129 14.1483 20.9883 14.4523L20.9769 14.4674L19.0297 17.001H21C21.5523 17.001 22 17.4487 22 18.001C22 18.5533 21.5523 19.001 21 19.001H17C16.6191 19.001 16.2713 18.7846 16.103 18.443C15.9346 18.1013 15.975 17.6936 16.2071 17.3916L19.3851 13.2564C19.5575 13.0223 19.7216 12.7639 19.839 12.5176C19.9646 12.2544 20 12.0815 20 12C20 11.7348 19.8946 11.4804 19.7071 11.2929C19.5196 11.1054 19.2652 11 19 11Z"/></svg>',
            command: 'format.set'
        },
        'h3': {
            title: '## buttons.heading ## 3',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 6C2 5.44772 2.44772 5 3 5H5C5.55228 5 6 5.44772 6 6C6 6.55228 5.55228 7 5 7V11H11V7C10.4477 7 10 6.55228 10 6C10 5.44772 10.4477 5 11 5H13C13.5523 5 14 5.44772 14 6C14 6.55228 13.5523 7 13 7V17C13.5523 17 14 17.4477 14 18C14 18.5523 13.5523 19 13 19H11C10.4477 19 10 18.5523 10 18C10 17.4477 10.4477 17 11 17V13H5V17C5.55228 17 6 17.4477 6 18C6 18.5523 5.55228 19 5 19H3C2.44772 19 2 18.5523 2 18C2 17.4477 2.44772 17 3 17V7C2.44772 7 2 6.55228 2 6ZM17.8519 9.22836C18.4001 9.0013 19.0033 8.94189 19.5853 9.05764C20.1672 9.1734 20.7018 9.45912 21.1213 9.87868C21.5409 10.2982 21.8266 10.8328 21.9424 11.4147C22.0581 11.9967 21.9987 12.5999 21.7716 13.1481C21.6417 13.4618 21.4601 13.7495 21.2361 14C21.4601 14.2505 21.6417 14.5382 21.7716 14.8519C21.9987 15.4001 22.0581 16.0033 21.9424 16.5853C21.8266 17.1672 21.5409 17.7018 21.1213 18.1213C20.7018 18.5409 20.1672 18.8266 19.5853 18.9424C19.0033 19.0581 18.4001 18.9987 17.8519 18.7716C17.3038 18.5446 16.8352 18.1601 16.5056 17.6667C16.1759 17.1734 16 16.5933 16 16C16 15.4477 16.4477 15 17 15C17.5523 15 18 15.4477 18 16C18 16.1978 18.0586 16.3911 18.1685 16.5556C18.2784 16.72 18.4346 16.8482 18.6173 16.9239C18.8 16.9996 19.0011 17.0194 19.1951 16.9808C19.3891 16.9422 19.5673 16.847 19.7071 16.7071C19.847 16.5673 19.9422 16.3891 19.9808 16.1951C20.0194 16.0011 19.9996 15.8 19.9239 15.6173C19.8482 15.4346 19.72 15.2784 19.5556 15.1685C19.3911 15.0587 19.1978 15 19 15C18.4477 15 18 14.5523 18 14C18 13.4477 18.4477 13 19 13C19.1978 13 19.3911 12.9414 19.5556 12.8315C19.72 12.7216 19.8482 12.5654 19.9239 12.3827C19.9996 12.2 20.0194 11.9989 19.9808 11.8049C19.9422 11.6109 19.847 11.4327 19.7071 11.2929C19.5673 11.153 19.3891 11.0578 19.1951 11.0192C19.0011 10.9806 18.8 11.0004 18.6173 11.0761C18.4346 11.1518 18.2784 11.28 18.1685 11.4444C18.0586 11.6089 18 11.8022 18 12C18 12.5523 17.5523 13 17 13C16.4477 13 16 12.5523 16 12C16 11.4067 16.1759 10.8266 16.5056 10.3333C16.8352 9.83994 17.3038 9.45543 17.8519 9.22836Z"/></svg>',
            command: 'format.set'
        },
        'h4': {
            title: '## buttons.heading ## 4',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 6C2 5.44772 2.44772 5 3 5H5C5.55228 5 6 5.44772 6 6C6 6.55228 5.55228 7 5 7V11H11V7C10.4477 7 10 6.55228 10 6C10 5.44772 10.4477 5 11 5H13C13.5523 5 14 5.44772 14 6C14 6.55228 13.5523 7 13 7V17C13.5523 17 14 17.4477 14 18C14 18.5523 13.5523 19 13 19H11C10.4477 19 10 18.5523 10 18C10 17.4477 10.4477 17 11 17V13H5V17C5.55228 17 6 17.4477 6 18C6 18.5523 5.55228 19 5 19H3C2.44772 19 2 18.5523 2 18C2 17.4477 2.44772 17 3 17V7C2.44772 7 2 6.55228 2 6ZM20.2898 9.04291C20.7115 9.17061 21 9.55933 21 10V15C21.5523 15 22 15.4477 22 16C22 16.5523 21.5523 17 21 17V18C21 18.5523 20.5523 19 20 19C19.4477 19 19 18.5523 19 18V17H16C15.6312 17 15.2923 16.797 15.1183 16.4719C14.9443 16.1467 14.9634 15.7522 15.1679 15.4453L19.1679 9.4453C19.4124 9.07864 19.868 8.91521 20.2898 9.04291ZM19 15V13.3028L17.8685 15H19Z"/></svg>',
            command: 'format.set'
        },
        'h5': {
            title: '## buttons.heading ## 5',
            command: 'format.set'
        },
        'h6': {
            title: '## buttons.heading ## 6',
            command: 'format.set'
        },
        'address': {
            title: '## buttons.address ##',
            command: 'format.set'
        }
    },
    nested: [],
    nestedValue: [],
    nonparse: [],
    inlineGroups: {},
    tags: {
        denied: ['font', 'html', 'head', 'link', 'title', 'body', 'meta', 'applet', 'marquee'],
        incode: ['!DOCTYPE', '!doctype', 'html', 'head', 'link', 'title', 'body', 'meta', 'textarea', 'style'],
        form: ['form', 'input', 'button', 'select', 'textarea', 'legend', 'fieldset'],
        inline: ['a', 'svg', 'span', 'strong', 'strike', 'b', 'u', 'em', 'i', 'code', 'del', 'ins', 'samp', 'kbd', 'sup', 'sub', 'mark', 'var', 'cite', 'small', 'abbr'],
        block: ['pre', 'hr', 'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',  'dl', 'dt', 'dd', 'div', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'th', 'td', 'blockquote', 'output', 'figcaption', 'figure', 'address', 'main', 'section', 'header', 'footer', 'aside', 'article', 'iframe'],
        parser: ['pre', 'hr', 'ul', 'ol', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'address', 'blockquote', 'figure', 'iframe', 'form', 'dl', 'div', 'section', 'header', 'footer', 'article', 'main', 'aside']
    },
    regex: {
        youtube: /^https?\:\/\/(?:www\.youtube(?:\-nocookie)?\.com\/|m\.youtube\.com\/|youtube\.com\/)?(?:ytscreeningroom\?vi?=|youtu\.be\/|vi?\/|live|user\/.+\/u\/\w{1,2}\/|embed\/|watch\?(?:.*\&)?vi?=|\&vi?=|\?(?:.*\&)?vi?=)([^#\&\?\n\/<>"']*)/gi,
        vimeo: /(http|https)?:\/\/(?:www.|player.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:\/[a-zA-Z0-9_-]+)?/gi,
        imageurl: /((https?|www)[^\s]+\.)(jpe?g|png|gif)(\?[^\s-]+)?/gi,
        url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z\u00F0-\u02AF0-9()!@:%_+.~#?&//=]*)/gi,
        aurl1: /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim,
        aurl2: /(^|[^\/])(www\.[\S]+(\b|$))/gim
    }
};
Redactor.lang['en'] = {
    "accessibility": {
        "help-label": "Rich text editor"
    },
    "placeholders": {
        "figcaption": "Type caption (optional)"
    },
    "modal": {
        "link": "Link",
        "image": "Image",
        "add-image": "Add Image"
    },
    "embed": {
        "embed": "Embed",
        "caption": "Caption",
        "description": "Paste any embed/html code or enter the url (vimeo or youtube video only)",
        "responsive-video": "Responsive video"
    },
    "image": {
        "or": "or",
        "alt-text": "Alt Text",
        "link": "Link",
        "width": "Width",
        "caption": "Caption",
        "link-in-new-tab": "Open link in new tab",
        "url-placeholder": "Paste url of image...",
        "upload-new-placeholder": "Drag to upload a new image<br>or click to select"
    },
    "link": {
        "link": "Link",
        "edit-link": "Edit Link",
        "unlink": "Unlink",
        "link-in-new-tab": "Open link in new tab",
        "text": "Text",
        "url": "URL"
    },
    "table": {
        "width": "Width",
        "nowrap": "Nowrap",
        "table-cell": "Table cell",
        "select-table": "Select table",
        "select-cell": "Select cell",
        "cell-setting": "Cell setting",
        "add-head": "Add head",
        "remove-head": "Remove head",
        "add-row-below": "Add row below",
        "add-row-above": "Add row above",
        "remove-row": "Remove row",
        "add-column-after": "Add column after",
        "add-column-before": "Add column before",
        "remove-column": "Remove column",
        "delete-table": "Delete table"
    },
    "buttons": {
        "add": "Add",
        "insert": "Insert",
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "ai-tools": "AI Tools",
        "ai-image": "AI Image",
        "html": "HTML",
        "format": "Format",
        "bold": "Bold",
        "italic": "Italic",
        "deleted": "Deleted",
        "more-formatting": "More formatting",
        "link": "Link",
        "link-text": "Link Text",
        "unlink": "Unlink",
        "image": "Image",
        "unwrap": "Unwrap",
        "outset": "Outset",
        "wrap-image": "Wrap image",
        "move-up": "Move up",
        "move-down": "Move down",
        "list": "List",
        "numbered-list": "Numbered list",
        "bullet-list": "Bullet list",
        "indent": "Indent",
        "outdent": "Outdent",
        "definition-list": "Definition list",
        "hotkeys": "Hotkeys",
        "undo": "Undo",
        "redo": "Redo",
        "toggle": "Toggle",
        "duplicate": "Duplicate",
        "delete": "Delete",
        "table": "Table",
        "embed": "Embed",
        "quote": "Quote",
        "layout": "Layout",
        "wrapper": "Wrapper",
        "todo": "Todo",
        "code-snippet": "Code snippet",
        "line": "Line",
        "parent": "Parent",
        "code": "Code",
        "underline": "Underline",
        "highlight": "Highlight",
        "superscript": "Superscript",
        "subscript": "Subscript",
        "clear-all-styles": "Clear all styles",
        "heading": "Heading",
        "text": "Text",
        "address": "Address"
    },
    "colorpicker": {
        "remove-color":  "Remove color",
        "remove-background":  "Remove background color",
        "color": "Color",
        "background": "Background",
        "set-color": "Set color"
    },
    "pathbar": {
        "title": "Body"
    },
    "layout": {
        "single-column": "Single column",
        "two-columns": "Two columns",
        "three-columns": "Three columns",
        "four-columns": "Four columns"
    },
    "outset": {
        "outset-none": "Outset none",
        "outset-left": "Outset left",
        "outset-both": "Outset both",
        "outset-right": "Outset right"
    },
    "wrap": {
        "wrap-none": "Wrap none",
        "wrap-left": "Wrap left",
        "wrap-center": "Wrap center",
        "wrap-right": "Wrap right"
    },
    "blocks": {
        "address": "Address",
        "cell": "Cell",
        "column": "Column",
        "dlist": "Definition List",
        "embed": "Embed",
        "figcaption": "Figcaption",
        "heading": "Heading",
        "image": "Image",
        "wrapper": "Wrapper",
        "layout": "Layout",
        "line": "Line",
        "list": "List",
        "listitem": "Item",
        "noneditable": "Noneditable",
        "pre": "Pre",
        "quote": "Quote",
        "row": "Row",
        "table": "Table",
        "text": "Text",
        "todo": "Todo",
        "todoitem": "Item",
        "mergetag": "Mergetag"
    },
    "hotkeys": {
        "meta-shift-a": "Select text in the block",
        "meta-a": "Select all blocks",
        "meta-z": "Undo",
        "meta-shift-z": "Redo",
        "meta-shift-m": "Remove inline format",
        "meta-b": "Bold",
        "meta-i": "Italic",
        "meta-u": "Underline",
        "meta-h": "Superscript",
        "meta-l": "Subscript",
        "meta-k": "Link",
        "meta-alt-0": "Normal text",
        "meta-alt-1": "Heading 1",
        "meta-alt-2": "Heading 2",
        "meta-alt-3": "Heading 3",
        "meta-alt-4": "Heading 4",
        "meta-alt-5": "Heading 5",
        "meta-alt-6": "Heading 6",
        "meta-shift-7": "Ordered List",
        "meta-shift-8": "Unordered List",
        "meta-indent": "Indent",
        "meta-outdent": "Outdent",
        "meta-shift-backspace": "Delete block",
        "meta-shift-o": "Add block",
        "meta-shift-d": "Duplicate block",
        "meta-shift-up": "Move line up",
        "meta-shift-down": "Move line down"
    }
};
/*jshint esversion: 6 */
let App = function($element, settings, uuid) {
    // globals
    this.dom = Redactor.dom;
    this.ajax = Redactor.ajax;
    this.uuid = uuid;
    this.$win = this.dom(window);
    this.$doc = this.dom(document);
    this.$body = this.dom('body');
    this.keycodes = Redactor.keycodes;
    this.element = new AppElement($element);
    this.app = this;

    // local
    this.disableMode = false;
    this._priority = ['container', 'source', 'editor', 'theme', 'toolbar', 'extrabar'];
    this._plugins = [];
    this._triggers = {};
    this._props = {};

    // initial
    this.initialSettings = settings;
    this.started = false;

    // opts & lang
    this._initCore();
    this._initModes();

    // start
    if (this.opts.get('clicktoedit')) {
        this.click();
    }
    else {
        this.start();
    }
};

App.prototype = {
    // clicktoedit
    click() {
        this.element.one('click.rx-clicktoedit', this.startClick.bind(this));
    },
    startClick(e) {
        e.preventDefault();
        e.stopPropagation();

        let marker = this.create('marker');

        // create marker
        this.broadcast('clicktoedit.before.start');
        marker.save();

        // start
        this.start(false, true);

        // restore marker
        marker.restore();

        this._iterate('click');
        this.broadcast('clicktoedit.start');
    },

    // start
    start(settings, click) {
        if (this.isStarted()) return;
        if (settings) this.initialSettings = settings;
        if (this.opts.get('clicktoedit') && click !== true) {
            this.element.off('click.rx-clicktoedit');
            this.startClick(false);
            return;
        }

        // core
        this._initCore();
        this._initModes();

        // starting
        this.broadcast('app.before.start');

        // hide element
        this.element.hideElement();

        // modules & plugins
        this._iterate('init');
        this._iterate('start');
        this._iterate('load');

        // started
        this.started = true;
        this.broadcast('app.start');

        // disabled
        this._buildDisabled();
    },
    isStarted() {
        return this.started;
    },

    // stop
    stop() {
        if (this.isStopped()) return;

        // stopping
        this.broadcast('app.before.stop');

        // stop
        this._iterate('stop');

        // show element
        this.element.showElement();

        // stopped
        this._plugins = [];
        this.started = false;

        // click to edit
        if (this.opts.get('clicktoedit')) {
            this.element.one('click.rx-clicktoedit', this.startClick.bind(this));
        }

        this.broadcast('app.stop');
    },
    isStopped() {
        return !this.started;
    },

    // disable
    disable() {
        let selection = this.app.create('selection');

        this.source.close();
        this.editor.disable();
        this.toolbar.disable();
        this.extrabar.disable();
        this.context.close();
        this.tooltip.close();
        this.dropdown.close();
        this.modal.close();
        this.path.disable();
        this.statusbar.disable();
        this.block.unset();
        this.blocks.unset();

        selection.remove();

        this.disableMode = true;
    },
    isDisabled() {
        return this.disableMode;
    },

    // enable
    enable() {
        this.editor.enable();
        this.toolbar.enable();
        this.extrabar.enable();
        this.path.enable();
        this.statusbar.enable();

        this.disableMode = false;
    },

    // editor & win/doc
    getLayout() {
        return this.getEditor();
    },
    getEditor() {
        return (this.editor) ? this.editor.getEditor() : false;
    },
    getWin() {
        return this.$win;
    },
    getWinNode() {
        return this.$win.get();
    },
    getDoc() {
        return this.$doc;
    },
    getDocNode() {
        return this.$doc.get();
    },
    getBody() {
        return this.$body;
    },


    // has
    has(name) {
        return (this[name] || this._plugins[name]);
    },

    // add
    addTrigger(name, instance, func) {
        if (typeof this._triggers[name] === 'undefined') {
            this._triggers[name] = [];
        }

        this._triggers[name].push({ instance: instance, func: func });
    },

    // destroy
    destroy() {
        // destory
        this.sync.destroy();
        this.theme.destroy();

        // stop
        this.stop();

        // broadcast
        this.broadcast('app.destroy');

        // element and instance
        this.element.dataset(Redactor.namespace, false);
        this._clearInstance();
    },

    // props
    isProp(name) {
        return this.getProp(name);
    },
    setProp(name, value) {
        this._props[name] = value;
    },
    getProp(name) {
        return this._props[name];
    },
    removeProp(name) {
        delete this._props[name];
    },

    // broadcast
    broadcast(name, params) {
        let event = (params instanceof AppEvent) ? params : new AppEvent(name, params);

        // plugins & callbacks
        this._broadcastTriggers(name, event);
        this._broadcastPlugins(name, event);
        this._broadcastCallbacks(name, event);

        return event;
    },
    broadcastHtml(name, html) {
        return this.broadcast(name, { html: html }).get('html');
    },
    _broadcastTriggers(name, event) {
        if (typeof this._triggers[name] === 'undefined') return;

        let triggers = this._triggers[name];
        for (let i = 0; i < triggers.length; i++) {
            let trigger = triggers[i];
            trigger.instance[trigger.func].call(trigger.instance, event);
        }
    },
    _broadcastPlugins(name, event) {
        let i = 0,
            z,
            max = this._plugins.length,
            obj,
            arr,
            ns,
            plugin;


        for (i; i < max; i++) {
            plugin = this._plugins[i];
            if (typeof this[plugin].subscribe === 'undefined') continue;

            obj = this[plugin].subscribe;
            for (let [key, item] of Object.entries(obj)) {
                arr = key.split(',');

                for (z = 0; z < arr.length; z++) {
                    ns = arr[z].trim();
                    if (ns === name) {
                        if (typeof item === 'string') {
                            this[plugin][item].call(this[plugin], event);
                        }
                        else {
                            item.call(this[plugin], event);
                        }
                    }
                }
            }
        }
    },
    _broadcastCallbacks(name, event) {
        let setting = this.opts.get('callbacks');
        let callbacks = (setting) ? setting : {};
        if (typeof callbacks[name] === 'function') {
            callbacks[name].call(this, event);
        }
    },

    // api
    api(name) {
        if (!name) return;

        let args = [].slice.call(arguments, 1),
            namespaces = name.split("."),
            func = namespaces.pop(),
            context = this,
            i = 0,
            max = namespaces.length;

        for ( i = 0; i < max; i++) {
            context = context[namespaces[i]];
        }

        if (context && typeof context[func] === 'function') {
            return context[func].apply(context, args);
        }
    },

    // create
    create(name) {
        let arr = name.split('.'),
            type = 'class';

        if (arr.length > 1) {
            type = arr[0];
            name = arr[1];
        }

        if (typeof Redactor.mapping[type][name] === 'undefined') {
            if (type === 'block') {
                Redactor.message(type + ' "' + name + '" not found');
                name = 'wrapper';
            }
            else {
                Redactor.error('The ' + type + ' "' + name + '" does not exist.');
            }
        }


        let args = [].slice.call(arguments, 1),
            instance = new Redactor.mapping[type][name].proto();

        // extend
        instance._name = name;
        instance.app = this;

        let maps = ['uuid', 'dom', 'ajax', '$win', '$doc', '$body'];
        for (var i = 0; i < maps.length; i++) {
           instance[maps[i]] = this[maps[i]];
        }

        // lang & settings
        if (this.lang) instance.lang = this.lang;
        if (this.opts) instance.opts = this.opts;

        // init
        let result;
        if (instance.init) {
            result = instance.init.apply(instance, args);
        }

        return (result) ? result : instance;
    },

    // init
    _initCore() {
        this.opts = this.create('opts');
        this.lang = this.create('lang', this.opts);
    },
    _initModes() {
        // opts
        if (this.opts.is('nocontainer')) {
            this.opts.extend(this.opts.get('modes.nocontainer'));
        }
    },

    // iterate
    _iterate(method) {
        let name,
            plugins;

        // priority
        for (let i = 0; i < this._priority.length; i++) {
            name = this._priority[i];
            if (typeof Redactor.mapping.module[name] !== 'undefined') {
                this._iterateItem('module', name, method);
            }
        }

        // modules
        for (name of Object.keys(Redactor.mapping.module)) {
            if (this._priority.includes(name)) continue;
            this._iterateItem('module', name, method);
        }

        // plugins
        if (typeof Redactor.mapping.plugin !== 'undefined') {
            plugins = this.opts.get('plugins');
            for (let i = 0; i < plugins.length; i++) {
                name = plugins[i];
                if (typeof Redactor.mapping.plugin[name] === 'undefined') continue;

                if (method === 'init') {
                    this._plugins.push(name);
                }
                this._iterateItem('plugin', name, method);
            }
        }
    },
    _iterateItem(type, name, method) {
        if (method === 'init') {
            this[name] = this.create(type + '.' + name);
        }
        else {
            this._call(this[name], method);
        }
    },

    // call
    _call(instance, method) {
        if (typeof instance[method] === 'function') {
            instance[method].apply(instance);
        }
    },

    // build
    _buildDisabled() {
        this.disableMode = (this.opts.get('disabled') || this.element.isDisabled());
        if (this.disableMode) {
            this.disable();
        }
    },

    // clear
    _clearInstance() {
        let index = Redactor.instances.indexOf(this.uuid);
        if (index > -1) {
            Redactor.instances.splice(index, 1);
        }
    }
};
/*jshint esversion: 6 */
class AppElement extends Dom {
    constructor($el) {
        super();
        this.parse($el);
    }
    isTextarea() {
        return (this.get().tagName === 'TEXTAREA');
    }
    isDisabled() {
        return (this.attr('disabled') !== null);
    }
    hideElement() {
        if (this.isTextarea()) {
            this.hide();
        }
    }
    showElement() {
        if (this.isTextarea()) {
            this.show();
        }
    }
    setHtml(content) {
        if (this.isTextarea()) {
            this.val(content);
        }
        else {
            this.html(content);
        }
    }
    getHtml() {
        return (this.isTextarea()) ? this.val() : this.html();
    }
    getName() {
        return this.attr('name');
    }
    getPlaceholder() {
        return this.attr('placeholder');
    }
}
/*jshint esversion: 6 */
class AppEvent {
    constructor(name, params) {
        // local
        this.name = name;
        this.params = (typeof params === 'undefined') ? {} : params;
        this.stopped = false;
    }
    is(name) {
        if (Array.isArray(name)) {
            for (let i = 0; i < name.length; i++) {
                if (this.params[name[i]]) {
                    return true;
                }
            }
        }
        else {
            return this.get(name);
        }
    }
    has(name) {
        return (typeof this.params[name] !== 'undefined');
    }
    get(name) {
        return (this.has(name)) ? this.params[name] : null;
    }
    getName() {
        return this.name;
    }
    dump() {
        return this.params;
    }
    set(name, value) {
        this.params[name] = value;
    }
    stop() {
        this.stopped = true;
    }
    isStopped() {
        return this.stopped;
    }
}
/*jshint esversion: 6 */
Redactor.add('mixin', 'block', {
    commonDefaults: {
        uid: { getter: 'getUid', setter: 'setUid' },
        time: { getter: 'getTime', setter: 'setTime', trigger: 'updateTime' },
        id: { getter: 'getId', setter: 'setId' },
        style: { getter: 'getStyle', setter: 'setStyle' },
        classname: { getter: 'getClassname', setter: 'setClassname' },
        attrs: { getter: 'getAttrs', setter: 'setAttrs' },
        placeholder: { getter: 'getPlaceholder', setter: 'setPlaceholder' }
    },
    init(source, params, render) {
        // create element
        if (source instanceof Dom || source instanceof Element) {
            this.element = source;
            this.params = params;
        }
        else {
            this.params = source;
        }

        this.renderDataBlock = render;
        this.params = (this.params) ? this.params : {};

        if (this.start) this.start();
        this.render();
    },
    render() {
        // data create
        this._createData(this.params);

        // parse
        if (this.element) {
            this.$block = this.dom(this.element);
            if (this.parse) this.parse();
        }
        // build
        else {
            this.element = this.create();
            this.$block = this.element;
            if (this.build) this.build();
        }

        // data build
        this.data.build();

        // stop render for non parse block like noneditable, embed
        if (this.renderDataBlock === false) {
            return;
        }

        // render inline blocks
        this._renderInlineBlocks();

        // render props
        this.$block.dataset('instance', this);
        this.$block.attr('data-rx-type', this.getType());

        // inline
        if (this.isInline()) {
            this.$block.attr('data-rx-inline', true);
        }

        // editable
        if (this.isEditable()) {
            this.$block.attr('contenteditable', true);
        }
        else if (this.isEditable() === false) {
            this.$block.attr('contenteditable', false);
        }

        // focusable
        if (this.isFocusable()) {
            this.$block.attr('data-rx-focusable', true);
        }
    },
    trigger(mutation) {
        let triggers = this._buildTriggers();

        // call
        for (let [key, item] of Object.entries(triggers)) {
            let arr = item.trigger.split('.');
            if (arr.length === 1) {
                this[item.trigger].apply(this);
            }
            else {
                this.app.api(item.trigger, this);
            }
        }
    },

    // is
    isAllowedButton(name, obj) {
        let blocks = obj.blocks,
            type = this.getType();

        // all
        if (typeof obj.blocks === 'undefined') {
            return true;
        }

        // except
        if (blocks.except && blocks.except.indexOf(type) !== -1) {
            return false;
        }

        // modes
        if (blocks.all) {
            if (blocks.all === true || blocks.all === 'all') return true;
            else if (blocks.all === 'editable' && this.isEditable()) return true;
            else if (blocks.all === 'first-level' && this.isFirstLevel()) return true;
            else if (blocks.all === 'noneditable' && this.isType('noneditable')) return true;
        }

        // types
        if ((Array.isArray(blocks.types) && blocks.types.indexOf(type) !== -1)) {
            return true;
        }

        return false;
    },
    isFocusable() {
        return (typeof this.props.focusable !== 'undefined');
    },
    isInline() {
        return this.props.inline;
    },
    isEditable() {
        return this.props.editable;
    },
    isType(type) {
        let types = (Array.isArray(type)) ? type : [type];
        return (types.indexOf(this.props.type) !== -1);
    },
    isFigure() {
        return (this.getTag() === 'figure');
    },
    isFirstLevel() {
        return this.$block.attr('data-rx-first-level');
    },
    isEmpty(trim) {
        return this._isEmpty(this.$block, trim);
    },
    isParent() {
        return this.props.parent;
    },
    isLastElement() {
        return true;
    },
    isAllSelected() {
        if (this.isEditable()) {
            let selection = this.app.create('selection');

            return selection.isAll(this.$block);
        }
        else {
            return true;
        }
    },
    isCaretStart() {
        let caret = this.app.create('caret'),
            selection = this.app.create('selection'),
            current,
            $item,
            $prev;

        if (this.isType(['list', 'todo'])) {
            if (!selection.is()) return true;

            // check if the item is the first
            current = selection.getCurrent();
            $item = this.dom(current).closest('li');
            $prev = $item.prevElement();
            if ($prev.length === 0) {
                return caret.is(this.$block, 'start');
            }
            else {
                return false;
            }
        }
        else if (this.isEditable()) {
            return caret.is(this.$block, 'start');
        }

        return true;
    },
    isCaretEnd() {
        let caret = this.app.create('caret');

        if (this.isType('address')) {
            return caret.is(this.$block, 'end', false, true, false);
        }
        else if (this.isEditable() || this.isType(['todo', 'list'])) {
            return caret.is(this.$block, 'end');
        }


        return true;
    },
    isReorder() {
        return (this.props.reorder === false) ? false : true;
    },
    isContext() {
        return this.props.context;
    },

    // has
    hasTime() {
        return this.$block.attr('data-time');
    },
    hasUid() {
        return this.$block.attr('data-uid');
    },

    // get
    getTitle() {
        let type = this.getType(),
            titles = this.lang.get('blocks'),
            title = this.$block.attr('data-title');

        title = (typeof titles[type] !== 'undefined') ? titles[type] : title;
        title = (title) ? title : (type.charAt(0).toUpperCase() + type.slice(1));

        return title;
    },
    getProp(name) {
        return (typeof this.props[name] !== 'undefined') ? this.props[name] : null;
    },
    getType() {
        return this.props.type;
    },
    getTag() {
        return this.$block.get().tagName.toLowerCase();
    },
    getBlock() {
        return this.$block;
    },
    getJson() {
        return this.data.getData(true);
    },
    getOuterHtml() {
        return this.$block.get().outerHTML;
    },
    getHtml() {
        return this.$block.html();
    },
    getPlainText() {
        return this._getPlainText(this.$block);
    },
    getOffset() {
        return this.$block.offset();
    },
    getFirstLevel() {
        let $el = this.$block.closest('[data-rx-first-level]').last();
        if ($el.length !== 0) {
            return $el.dataget('instance');
        }

        return false;
    },
    getClosest(type) {
        let $el = this.$block.parent().closest(this._buildTraverseSelector(type));

        return ($el.length !== 0) ? $el.dataget('instance') : false;
    },
    getNextParent() {
        let parent = (this.isType('todoitem')) ? this.getClosest(['todo']) : this.getClosest(['table', 'wrapper', 'layout']),
            next = false;
        if (parent) {
            next = parent.getNext();
        }

        return next;
    },
    getPrevParent() {
        let parent = (this.isType('todoitem')) ? this.getClosest(['todo']) : this.getClosest(['table', 'wrapper', 'layout']),
            prev = false;
        if (parent) {
            prev = parent.getPrev();
        }

        return prev;
    },
    getParent() {
        let prop = this.props.parent,
            $el;

        if (typeof prop !== 'undefined') {
            $el = this.$block.parent().closest(this._buildTraverseSelector(prop));
        }
        else {
            $el = this.$block.parent().closest('[data-rx-type]');
        }

        return ($el && $el.length !== 0) ? $el.dataget('instance') : false;
    },
    getFirst(type) {
        type = (type) ? '=' + type : '';

        let $el = this.$block.find('[data-rx-type' + type + ']').first();
        if ($el.length !== 0) {
            return $el.dataget('instance');
        }

        return false;
    },
    getLast(type) {
        type = (type) ? '=' + type : '';

        let $el = this.$block.find('[data-rx-type' + type + ']').last();
        if ($el.length !== 0) {
            return $el.dataget('instance');
        }

        return false;
    },
    getNext(type) {
        let $el = this.$block.nextElement();
        return ($el.length !== 0 && $el.is(this._buildTraverseSelector(type))) ? $el.dataget('instance') : false;
    },
    getPrev(type) {
        let $el = this.$block.prevElement();

        return ($el.length !== 0 && $el.is(this._buildTraverseSelector(type))) ? $el.dataget('instance') : false;
    },
    getControl() {
        return (this.isInline()) ? false : this.props.control;
    },
    getToolbar() {
        return this.props.toolbar;
    },
    getExtrabar() {
        return this.props.extrabar;
    },
    getButtons(type) {
        return this.props[type];
    },
    getPlaceholder() {
        return this.$block.attr('data-placeholder');
    },
    getId() {
        return this.$block.attr('id');
    },
    getStyle() {
        let $clone = this.$block.clone(),
            utils = this.app.create('utils'),
            style = $clone.attr('style'),
            obj = utils.cssToObject(style);

        if (this.isType('column')) {
            delete obj['flex-basis'];
        }

        return (Object.keys(obj).length !== 0) ? obj : null;
    },
    getAttrs() {
        let attrs = {};
        if (this.params.attrs) {
            for (let key of Object.keys(this.params.attrs)) {
                attrs[key] = this.$block.data(key);
            }
        }

        return (Object.keys(attrs).length !== 0) ? attrs : null;
    },
    getAttr(name) {
        return (this.params.attrs && this.params.attrs[name]) ? this.params.attrs[name] : null;
    },
    getClassname(items) {
        let $clone = this.$block.clone(),
            value;

        if (items) {
            value = 'none';
            for (let [key, val] of Object.entries(items)) {
                if (this.$block.hasClass(val)) {
                    value = key;
                }
            }

            return value;
        }
        else {
            $clone.removeClass('rx-block-placeholder rx-block-focus rx-block-control-focus data-rx-parsed data-rx-first-level data-rx-inline data-rx-focusable');
            value = $clone.attr('class');

            return (value === '') ? null : value;
        }
    },
    getContent() {
        let $clone = this.$block.clone();
        $clone = this.unparseInlineBlocks($clone);

        return $clone.html().trim();
    },
    getChildren() {
        let $children = this.$block.children(),
            children = [],
            instance,
            data;

        $children.each(function($node) {
            instance = $node.dataget('instance');
            if (instance) {
                children.push(instance.getJson());
            }
        });

        return children;
    },
    getUid() {
        return this.$block.attr('data-uid');
    },
    getTime() {
        let value = this.$block.attr('data-time');
        return (value === true || value === false) ? null : value;
    },
    getData(assembly) {
        return this.data.getData(assembly);
    },
    get(name) {
        return this.data.get(name);
    },

    // set
    set(name, value) {
        this.data.set(name, value);
    },
    setData(data) {
        this.data.setData(data);
    },
    setEmpty() {
        if (this.isType('todoitem')) {
            this.$content.html('');
        }
        else {
            this.$block.html('');
        }
    },
    setContent(value) {
        this.$block.html(value);
    },
    setId(value) {
        this._setAttr(this.$block, 'id', value);
    },
    setStyle(value) {
        let cleaner = this.app.create('cleaner');

        this.$block.css(value);
        if (this.$block.attr('style') === '') {
            this.$block.removeAttr('style');
        }

        cleaner.cacheElementStyle(this.$block);
    },
    setClassname(value, items) {
        if (items) {
            this._removeObjClasses(items);
        }

        if (value !== 'none') {
            this.$block.addClass(value);
        }
    },
    setAttr(name, value) {
        this.params.attrs = this.params.attrs || {};
        this.params.attrs[name] = value;
        this.$block.attr(name, value, true);
    },
    setAttrs(value) {
        if (!value) return;
        for (let [key, item] of Object.entries(value)) {
            this.setAttr(key, item);
        }
    },
    setUid(value) {
        this._setAttr(this.$block, 'data-uid', value);
    },
    setTime(value) {
        this._setAttr(this.$block, 'data-time', value);
    },
    setPlaceholder(value) {
        this._setAttr(this.$block, 'data-placeholder', value);
    },
    setCaret(point) {
        let caret = this.app.create('caret');
        caret.set(this.$block, point);
    },

    // update
    updateTime() {
        if (this.hasTime()) {
            this.setTime((new Date()).getTime());
        }
    },

    // generate
    generateUid() {
        return Date.now().toString(36) + Math.floor(Math.pow(10, 12) + Math.random() * 9*Math.pow(10, 12)).toString(36);
    },

    // duplicate
    duplicate(empty) {
        let type = this.getType(),
            $clone = this.$block.clone();

        $clone.removeClass('rx-block-focus');

        // make it empty
        if (empty) {
            $clone.html('');
        }

        return this.app.create('block.' + type, $clone);
    },
    duplicateEmpty() {
        return this.duplicate(true);
    },

    // remove
    removeAttr(name) {
        if (this.params.attrs && this.params.attrs[name]) {
            delete this.params.attrs[name];
        }

        this.$block.removeAttr(name);
    },
    removeData(name) {
        this.data.remove(name);
    },
    removeCaption() {
        if (this.figcaption) {
            this.$figcaption.remove();
            this.figcaption = false;
            this.$figcaption = false;
        }
    },
    remove(params) {
        let defs = {
            traverse: false,
            broadcast: false
        };
        let type = this.getType();
        let parent = (this.isInline()) ? this.getParent() : false;

        // params
        params = Redactor.extend({}, defs, params);

        // traverse
        if (params.traverse) {
            this._removeTraverse();
        }
        else {
            // remove
            this.$block.remove();

            // set parent for inline
            if (parent) {
                this.app.block.set(parent);
            }
        }

        // broadcast
        if (params.broadcast) {
            this.app.broadcast('block.remove', { type: type });
        }
    },

    // insert
    insert(params) {
        let insertion = this.app.create('insertion'),
            inserted,
            defs = {
                instance: false,
                position: 'after',
                caret: false,
                remove: true,
                type: 'add',
                current: this
            };

        // set params
        params = Redactor.extend({}, defs, params);

        // insert
        inserted = insertion.insert(params);

        // broadcast
        if (params.type === 'add') {
            this.app.broadcast('block.add', { inserted: inserted });
        }

        // return
        return inserted;
    },
    insertEmpty(params) {
        params = params || {};
        params.instance = this.app.block.create();

        return this.insert(params);
    },

    // change
    change(newInstance, broadcast) {
        let $newBlock = newInstance.getBlock();

        this.$block.after($newBlock);
        this.$block.remove();

        // rebuild
        this.app.editor.build();

        // set
        this.app.block.set($newBlock);

        // broadcast
        if (broadcast !== false) {
            this.app.broadcast('block.change', { instance: newInstance });
        }
    },

    // move
    move(direction) {
        let target = (direction === 'up') ? this.getPrev() : this.getNext(),
            func = (direction === 'up') ? 'before' : 'after',
            $block;

        if (!target) return;

        // save selection
        if (this.isEditable()) {
            this.app.editor.save(this.getBlock());
        }

        // move
        $block = target.getBlock();
        $block[func](this.getBlock());

        // set force
        this.app.block.set(this, false, true);

        // restore selection
        if (this.isEditable()) {
           this.app.editor.restore(false);
        }
    },

    // append
    appendNext() {
        let next = this.getNext(),
            html = next.getHtml(),
            type = this.getType(),
            nextType = next.getType(),
            insert = true,
            remove = true,
            $item,
            $blocks,
            checkinline = true;

        // next empty
        if (next.isEmpty()) {
            next.remove();
            return;
        }
        // current empty
        else if (this.isEmpty()) {
            this.remove();
            this.app.block.set(next, 'start');
            return;
        }

        // not empty
        // code
        if (type === 'pre' && nextType !== 'pre') {
            html = next.getPlainText();
        }

        // next type
        if (nextType === 'list') {
            if (type === 'list') {
                var $items = next.getBlock().children();
                this.$block.append($items);

                insert = false;
                remove = true;
            }
            else {
                html = this._appendListHtml(next.getBlock(), html);
                remove = next.isEmpty();
            }
        }

        // append
        if (insert) {
            if (nextType === 'dlist' && type === 'dlist') {
                $blocks = next.getBlock().children();
                this.$block.append($blocks);
                next.remove();
                return;
            }
            else if (nextType === 'dlist') {
                html = this._appendDlistHtml(html);
            }
            else if (nextType === 'todo') {
                $item =  next.getFirstItem();
                html = next.getFirstContent().html();
                $item.remove();
                remove = next.isEmpty();
            }
            else if (nextType === 'pre') {
                html = next.getContent();
                checkinline = false;
            }
            else if (nextType === 'quote') {
                html = next.getPlainText();
            }

            this._insertHtml(html, checkinline);
        }

        // remove
        if (remove) {
            next.remove();
        }

    },
    appendToPrev() {
        let prev = this.getPrev(),
            prevType = prev.getType(),
            html = this.getHtml(),
            type = this.getType(),
            insert = true,
            remove = true,
            $blocks,
            caret = this.app.create('caret'),
            checkinline = true;

        // current empty
        if (this.isEmpty()) {
            this.remove();
            this.app.block.set(prev, 'end');
            return;
        }
        // prev empty
        else if (prev.isEmpty()) {
            prev.remove();
            return;
        }

        // not empty
        // code
        if (type !== 'pre' && prevType === 'pre') {
            html = this.getPlainText();
        }

        // current type
        if (type === 'list') {
            if (prevType === 'list') {
                var $items = this.getBlock().children();
                this.app.block.set(prev, 'end');
                prev.getBlock().append($items);

                insert = false;
                remove = true;
            }
            else {
                html = this._appendListHtml(this.getBlock(), html);
                remove = this.isEmpty();
            }
        }
        if (type === 'dlist') {
            html = this._appendDlistHtml(html);
        }


        // append
        if (insert) {

            checkinline = (prevType === 'todo') ? false : checkinline;
            checkinline = (prevType === 'pre') ? false : checkinline;

            if (type === 'dlist' && prevType === 'dlist') {
                $blocks = this.$block.children();
                prev.getBlock().append($blocks);
                caret.set($blocks.first(), 'start');
                this.remove();
                return;
            }
            else if (type === 'quote') {
                html = this.$block.text();
            }


            // set
            this.app.block.set(prev, 'end');
            this._insertHtml(html, checkinline);
        }

        // remove
        if (remove) {
            this.remove();
        }
    },

    // parse
    parseItems(selector, type) {
        this.$block.find(selector).each(function($node) {
            if (!$node.attr('data-rx-type')) {
                this.app.create('block.' + type, $node);
            }
        }.bind(this));
    },
    parseCaption() {
        let $figcaption = this.$block.find('figcaption');
        if ($figcaption.length !== 0) {
            this.figcaption = this.app.create('block.figcaption', $figcaption);
            this.$figcaption = this.figcaption.getBlock();
        }
    },

    // unparse
    unparseInlineBlocks($el) {
        $el.find('[data-rx-inline]').removeAttr('data-rx-type data-rx-inline contenteditable tabindex').removeClass('rx-block-focus');
        if ($el.attr('class') === '') {
            $el.removeAttr('class');
        }

        return $el;
    },

    // =private
    _buildCaption(caption) {
        if (this.isFigure() && caption) {
            let $figcaption = this.$block.find('figcaption');
            if ($figcaption.length !== 0) {
                this.figcaption = this.app.create('block.figcaption', $figcaption, { content: caption });
                this.$figcaption = this.figcaption.getBlock();
            }
            else {
                this.figcaption = this.app.create('block.figcaption', { content: caption });
                this.$figcaption = this.figcaption.getBlock();
                this.$block.append(this.$figcaption);
            }
        }
    },
    _buildTraverseSelector(type) {
        let selector;
        if (Array.isArray(type)) {
            selector = '[data-rx-type=' + type.join('],[data-rx-type=') + ']';
        }
        else {
            type = (type) ? '=' + type : '';
            selector = '[data-rx-type' + type + ']';
        }

        return selector;
    },
    _buildTriggers() {
        let triggers = Redactor.extend(true, {}, Redactor.triggers),
            data = this.data.dump();

        for (let [key, item] of Object.entries(data)) {
            if (item.trigger) {
                triggers[key] = { trigger: item.trigger };
            }
        }

        return triggers;
    },
    _setAttr($el, name, value) {
        if (value === '') {
            $el.removeAttr(name);
        }
        else {
            $el.attr(name, value);
        }
    },
    _createData(params) {
        this.data = this.app.create('block-data', this, this.defaults, this.commonDefaults, params);
    },
    _createInstance(type, props) {
        return this.app.create('block.' + type, props);
    },
    _renderInlineBlocks() {
        if (this.isType('noneditable')) return;

        let type;

        this.$block.find('[' + this.opts.get('dataBlock') + ']').each(function($node) {
            if (!$node.attr('data-rx-type')) {
                type = $node.attr(this.opts.get('dataBlock'));
                this.app.create('block.' + type, $node);
            }
        }.bind(this));
    },
    _isEmpty(el, trim) {
        let $el = this.dom(el),
            text = $el.text(),
            utils = this.app.create('utils'),
            brs = $el.find('br').length,
            svgs = $el.find('svg').length;

        // clean
        text = utils.removeInvisibleChars(text);
        text = text.replace(/\r?\n/g, '');

        if (text) {
            text = text.trim();
        }

        return (text === '' && svgs == 0 && brs < 2);
    },
    _insertHtml(html, checkinline) {
        let caret = this.app.create('caret'),
            selection = this.app.create('selection'),
            insertion = this.app.create('insertion'),
            inline = selection.getTopInline();

        if (checkinline !== false && inline) {
            // set caret after inline
            caret.set(inline, 'after');
        }

        // insert
        insertion.insertHtml(html, 'start');
    },
    _appendListHtml($target, html) {
        let $item = $target.find('li').first(),
            cleaner = this.app.create('cleaner');

        html = $item.html().trim();
        html = html.replace(/<\/li>/gi, '</li><br>');
        html = html.replace(/<(ul|ol)/gi, '<br><$1');
        html = cleaner.removeTags(html, ['ul', 'ol', 'li']);
        html = html.trim();
        html = html.replace(/<br\s?\/?>$/gi, '');

        $item.remove();

        return html;
    },
    _appendDlistHtml(html) {
        let utils = this.app.create('utils');

        return utils.wrap(html, function($w) {
            $w.find('dt, dd').unwrap();
        }.bind(this));
    },
    _getPlainText($el) {
        let html = $el.html(),
            marker = this.app.create('marker'),
            utils = this.app.create('utils');

        html = marker.replaceToText(html);
        html = utils.getTextFromHtml(html, { nl: true });
        html = marker.replaceToMarker(html);

        return html;
    },
    _buildObjClasses(obj) {
        let classes = [];
        for (let val of Object.values(obj)) {
            classes.push(val);
        }

        return classes;
    },
    _removeObjClasses(obj) {
        let classes = this._buildObjClasses(obj),
            elm = this.app.create('element');

        this.$block.removeClass(classes.join(' '));
        elm.removeEmptyAttr(this.$block, 'class');
    },
    _removeTraverse() {
        let next = this.getNext(),
            prev = this.getPrev(),
            parent = this.getClosest(['wrapper', 'todo', 'list']),
            parentNeverEmpty = this.getClosest(['column', 'cell']),
            emptyBlock;

        // remove
        this.$block.remove();

        // parent
        if (parent && parent.isEmpty(true)) {
            next = parent.getNext();
            prev = parent.getPrev();
            parent.remove();
        }

        // never empty
        if (parentNeverEmpty && parentNeverEmpty.isEmpty(true)) {
            emptyBlock = this.create();
            parentNeverEmpty.insert({ instance: emptyBlock, position: 'append' });
            this.app.block.set(emptyBlock, 'start');
            return;
        }

        if (next) {
            this.app.block.set(next, 'start');
        }
        else if (prev) {
            this.app.block.set(prev, 'end');
        }
        else {
            this.app.block.unset();
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('mixin', 'toolbar', {
    stop() {
        if (!this.opts.is(this.type)) return;

        this.$toolbar.remove();
        this.currentType = false;
        this.customButtons = {};
        this.removeButtons = [];
    },
    remove(name) {
        if (!this.opts.is(this.type)) return;

        if (Array.isArray(name)) {
            for (let i = 0; i < name.length; i++) {
                this.removeButtons.push(name[i]);
            }
        }
        else {
            this.removeButtons.push(name);
        }
    },
    disable() {
        if (!this.opts.is(this.type)) return;

        this._findButtons().each(function($btn) {
            $btn.dataget('instance').disable();
        });
    },
    enable() {
        if (!this.opts.is(this.type)) return;

        this._findButtons().each(function($btn) {
            $btn.dataget('instance').enable();
        });
    },
    setActive(name) {
        if (!this.opts.is(this.type)) return;

        this.unsetActive();
        let button = this._findButtonInstance(name);
        if (button) {
            button.setActive();
        }
    },
    setActiveKeys(keys, styles) {
        if (!this.opts.is(this.type)) return;

        for (let i = 0; i < keys.length; i++) {
            let button = this._findButtonInstance(keys[i]);
            if (button) {
                button.setActive();
            }
        }

        // styles
        this._findButtons().each(function($node) {
            this.app.button.setButtonColor($node, styles);
        }.bind(this));
    },
    setToggled(name) {
        if (!this.opts.is(this.type)) return;

        this.unsetToggled();
        this._findButtonInstance(name).setToggled();
    },
    unsetActive(name) {
        if (!this.opts.is(this.type)) return;

        if (name) {
            this._findButtonInstance(name).unsetActive();
        }
        else {
            this._findButtons().each(function($btn) {
                $btn.dataget('instance').unsetActive();
                $btn.dataget('instance').resetBackground();
            });
        }
    },
    unsetToggled(name, except) {
        if (!this.opts.is(this.type)) return;

        if (name) {
            this._findButtonInstance(name).unsetToggled();
        }
        else {
            this._findButtons().each(function($btn) {
                let button = $btn.dataget('instance');
                button.unsetToggled();

                if (!except || (except && button.getName() !== except)) {
                    $btn.removeClass('rx-in-modal');
                }
            });
        }
    },
    getButtons() {
        return this._findButtons();
    },
    getButton(name) {
        return this._findButtonInstance(name);
    },
    getElement() {
        return this.$toolbar;
    },

    // =private
    _add(name, obj) {
        if (this.app.isStarted()) {
            let button,
                btnObj = this.app.button.buildObject(this.type, name, obj);

            // add direct
            button = this.app.create('button', name, btnObj, this.$toolbarButtons, this.type);
        }
        else {
            this.customButtons[name] = obj;
            this.app.button.add(name, obj);
        }
    },
    _build($container) {
        this.$container = $container;
        this.$toolbar = this.dom('<div>').addClass('rx-' + this.type + ' rx-' + this.type + '-' + this.uuid);
        this.$toolbarButtons = this.dom('<div>').addClass('rx-' + this.type + '-buttons');

        this.$toolbar.append(this.$toolbarButtons);
        this.$container.append(this.$toolbar);
    },
    _buildButtons() {
        let buttons = [...this.opts.get('buttons.' + this.type)],
            customButtons = this.customButtons;

        this.app.button.build(buttons, customButtons, this.type, this.$toolbarButtons, this.removeButtons);

        let instance = this.app.block.get();
        this.currentType = (instance) ? instance.getType() : false;

    },
    _buildBlockButtons() {
        this.app.button.buildBlockButtons(this.type, this.$toolbarButtons);
    },
    _findButton(name) {
        return this.$toolbarButtons.find('[data-name=' + name + ']');
    },
    _findButtonInstance(name) {
        let $btn = this._findButton(name);
        if ($btn.length !== 0) {
            return $btn.dataget('instance');
        }
    },
    _findButtons() {
        return this.$toolbarButtons.find('.rx-button-' + this.type);
    }
});
/*jshint esversion: 6 */
Redactor.add('mixin', 'tool', {
    init(name, obj, popup, data) {
        this.name = name;
        this.setter = popup.getSetter();
        this.popup = popup;
        this.data = data;
        this.obj = this._observe(obj);
        this.prefix = 'rx';

        if (this.obj) {
            this._build();
        }
    },
    getElement() {
        return this.$tool;
    },
    getInput() {
        return this.$input;
    },
    getValue() {
        var value = this.$input.val();
        return value.trim();
    },
    setValue(value) {
        this.$input.val(value);
    },
    setFocus() {
        this.$input.focus();
    },
    trigger(value) {
        this.setValue(value);

        if (this.setter) {
            this.app.api(this.setter, this.popup);
        }
    },

    // private
    _build() {
        this._buildTool();
        this._buildLabel();
        this._buildInputElement();
        this._buildInput();
        this._buildEvent();

        // props
        if (this._has('placeholder')) this.$input.attr('placeholder', this.lang.parse(this.obj.placeholder));
        if (this._has('width')) this.$input.css('width', this.obj.width);
        if (this._has('classname')) this.$input.addClass(this.obj.classname);
    },
    _buildInputElement() {
        this.$input = this.dom('<' + this._getInputParam('tag') + '>').addClass(this.prefix + this._getInputParam('classname'));
        this.$input.attr({ 'name': this.name, 'type': this._getInputParam('type'), 'data-type': this.type });
        this.$input.dataset('instance', this);
    },
    _buildInput() {
        return;
    },
    _buildEvent() {
        let types = ['segment'];
        if (types.indexOf(this.type) === -1 && this.setter) {
            let events = (this.type === 'checkbox' || this.type === 'select') ? 'change' : 'input blur';
            events = (this.type === 'number') ? events + ' change' : events;
            this.$input.on(events, this._catchSetter.bind(this));
        }
    },
    _buildTool() {
        this.$tool = this.dom('<div>').addClass(this.prefix + '-form-item').dataset('instance', this);
    },
    _buildLabel() {
        if (this.type !== 'checkbox' && this._has('label')) {
            this.$label = this.dom('<label>').addClass(this.prefix + '-form-label').html(this.lang.parse(this.obj.label));

            if (this.obj.hint) {
                let $hint = this.dom('<span class="rx-form-hint">').html('(' + this.lang.parse(this.obj.hint) + ')');
                this.$label.append($hint);
            }

            this.$tool.append(this.$label);

        }
    },
    _getInputParam(name) {
        return (this.input && typeof this.input[name] !== 'undefined') ? this.input[name] : '';
    },
    _get(name) {
        return this.obj[name];
    },
    _has(name) {
        return Object.prototype.hasOwnProperty.call(this.obj, name);
    },
    _observe(obj) {
        if (Object.prototype.hasOwnProperty.call(obj, 'observer')) {
            obj = this.app.api(obj.observer, obj, this.name);
        }

        return obj;
    },
    _catchSetter(e) {
        if (e.type === 'keydown' && e.which !== 13) return;
        if (e.type === 'keydown') e.preventDefault();

        // call setter
        this.app.api(this.setter, this.popup);
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'opts', {
    init() {
        this.opts = this._build(this.app.initialSettings);
    },
    dump() {
        return this.opts;
    },
    is(name) {
        let value = this.get(name);
        return (typeof value !== 'undefined' && value !== false);
    },
    set(name, value) {
        name.split('.').reduce((o,p,i) => o[p] = name.split('.').length === ++i ? value : o[p] || {}, this.opts);
    },
    get(name) {
        return name.split('.').reduce((p, c) => p?.[c], this.opts);
    },
    extend(obj) {
        this.opts = Redactor.extend(true, {}, this.opts, obj);
    },
    remove(name) {
        let segments = name.split('.'),
            last = segments.pop();

        delete segments.reduce((o, k) => o[k] || {}, this.opts)[last];
    },

    // private
    _build(setting) {
        let opts,
            key,
            arr,
            i = 0,
            ns,
            data = this._buildElementData();

        opts = Redactor.extend(true, {}, Redactor.opts);
        opts = Redactor.extend(true, opts, Redactor.settings);
        opts = Redactor.extend(true, opts, data);
        opts = Redactor.extend(true, opts, setting);

        // build callbacks
        if (opts.subscribe) {
            opts.callbacks = {};
            for (let [key, item] of Object.entries(opts.subscribe)) {
                arr = key.split(',');
                for (i = 0; i < arr.length; i++) {
                    ns = arr[i].trim();
                    opts.callbacks[ns] = item;
                }
            }
        }

        // build translations
        if (opts.translations) {
            Redactor.addLang(opts.translations);
        }

        return opts;
    },
    _buildElementData() {
        let dataset = this.app.element.data(true),
            data = {};

        for (let [name, value] of Object.entries(dataset)) {
            name.split('-').reduce((o,p,i) => o[p] = name.split('-').length === ++i ? value : o[p] || {}, data);
        }

        return data;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'lang', {
    init(opts) {
        this.opts = opts;
        this.langKey = this.opts.get('lang');

        // build
        this.vars = this._build();
    },
    dump() {
        return this.vars;
    },
    has(name) {
        return (this.get(name) !== '');
    },
    set(obj) {
        let opts = Redactor.extend(true, Redactor.lang, obj);
        this.vars = this._build();
    },
    get(name) {
        let value = this._get(name, this.vars);
        if (typeof value === 'undefined' && this.langKey !== 'en') {
            value = this._get(name, Redactor.lang.en);
        }

        return (typeof value === 'undefined') ? '' : value;
    },
    parse(str) {
        let matches,
            i = 0,
            max,
            key;

        if (typeof str !== 'string') {
            return str;
        }

        matches = str.match(/## (.*?) ##/g);
        if (matches) {
            for (i = 0, max = matches.length; i < max; i++) {
                key = matches[i].replace(/^##\s/g, '').replace(/\s##$/g, '');
                str = str.replace(matches[i], this.get(key));
            }
        }

        return str;
    },

    // private
    _get(name, vars) {
        return name.split('.').reduce((p, c) => p?.[c], vars);
    },
    _build() {
        let vars = Redactor.lang.en;
        if (this.langKey !== 'en') {
            vars = (Redactor.lang[this.langKey] !== 'undefined') ? Redactor.lang[this.langKey] : vars;
        }
        return vars;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'accessibility', {
    init(editor) {
        this.$editor = editor.getEditor();

        // build
        this._buildRole();
        this._buildLabel();
    },
    destroy() {
        this.$editor.removeAttr('aria-labelledby role');
    },

    // private
    _buildRole() {
        this.$editor.attr({ 'aria-labelledby': 'rx-voice', 'role': 'presentation' });
    },
    _buildLabel() {
        let html = this.lang.get('accessibility.help-label'),
            $label = this._createLabel(html);

        // append
        this.app.container.get('main').prepend($label);
    },
    _createLabel(html) {
        let $label = this.dom('<span>'),
            params = { 'id': 'rx-voice-' + this.uuid, 'aria-hidden': false };

        $label.addClass('rx-voice-label');
        $label.attr(params);
        $label.html(html);

        return $label;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'content', {
    init() {
        // local
        this.sourceType = 'element'; // content, data, element
        this.type = (this.opts.is('data')) ? 'json' : 'html';

         // build
        this._buildContent();
        this._buildBroadcast();
        this._buildParsed();
        this._buildUnparsed();
    },

    // get
    getSourceType() {
        return this.sourceType;
    },
    getType() {
        return this.type;
    },
    getContent(cleanup) {
        let content = this.app.editor.getHtml(),
            unparser = this.app.create('unparser'),
            tidy = this.app.create('tidy');

        content = unparser.unparse(content);

        if (cleanup) {
            content = tidy.parse(content);
        }

        return content;
    },
    getJson() {
        let blocks = [];

        let $layout = this.app.editor.getEditor();
        let $elms = $layout.children('[data-rx-type]');
        $elms.each(function($el) {
            let instance = $el.dataget('instance');
            blocks.push(instance.getJson());
        });

        return blocks;
    },
    set(content) {
        this.content = content;
        this._buildParsed();
        this._buildUnparsed();
    },

    // is
    isJson() {
        return (this.type === 'json');
    },

    // private
    _buildContent() {
        this.content = this._getElementContent();
    },
    _buildBroadcast() {
        this.content = this.app.broadcastHtml('editor.before.load', this.content);
    },
    _buildParsed() {
         // parse
        let parser = this.app.create('parser');
        let $nodes = parser.parse(this.content, { type: this.type, start: true, nodes: true });

        // set
        this.app.editor.setHtml($nodes);
    },
    _buildUnparsed() {
        let unparser = this.app.create('unparser');
        let content = this.app.editor.getHtml();
        content = unparser.unparse(content);

        // set to source
        this.app.source.setContent(content);

        // set unparsed to element
        if (!this.isJson() && this.app.element.isTextarea()) {
            this.app.editor.setSource(content);
        }
    },
    _getElementContent() {
        let content;
        if (this.opts.is('content')) {
            this.sourceType = 'content';
            content = this.opts.get('content');
        }
        else if (this.opts.is('data')) {
            this.sourceType = 'data';
            content = this.opts.get('data');
        }
        else {
            content = this.app.element.getHtml();
        }

        return content;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'offset', {
    get(el) {
        this.node = this._getEl(el);

        let sel = this.app.getWinNode().getSelection(),
            offset = false,
            range,
            cloned,
            start;

        if (sel && sel.rangeCount > 0) {
            range = sel.getRangeAt(0);
            if (this.node.contains(sel.anchorNode)) {
                cloned = range.cloneRange();
                cloned.selectNodeContents(this.node);
                cloned.setEnd(range.startContainer, range.startOffset);

                start = cloned.toString().length;
                offset = {
                    start: start,
                    end: start + range.toString().length
                };
            }
        }

        return offset;
    },
    set(offset, el) {
        this.node = this._getEl(el);

        if (offset === false) {
            offset = { start: 0, end: 0 };
        }

        let charIndex = 0, range = this.app.getDocNode().createRange(),
            nodeStack = [this.node],
            node,
            foundStart = false,
            stop = false,
            nextCharIndex,
            i,
            sel;

        range.setStart(this.node, 0);
        range.collapse(true);

        while (!stop && (node = nodeStack.pop())) {
            if (node.nodeType === 3) {
                nextCharIndex = charIndex + node.length;

                if (!foundStart && offset.start >= charIndex && offset.start <= nextCharIndex) {
                    range.setStart(node, offset.start - charIndex);
                    foundStart = true;
                }

                if (foundStart && offset.end >= charIndex && offset.end <= nextCharIndex) {
                    range.setEnd(node, offset.end - charIndex);
                    stop = true;
                }

                charIndex = nextCharIndex;
            }
            else {
                i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        sel = this.app.getWinNode().getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    },

    // private
    _getEl(el) {
        return (!el) ? this.app.getEditor().get() : this.dom(el).get();
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'marker', {
    insert() {
        this.remove();

        let selection = this.app.create('selection'),
            range = selection.getRange(),
            both = (!selection.isCollapsed());

        if (!range) return;

        let start = this._build('start'),
            end = this._build('end'),
            cloned = range.cloneRange();

        if (both) {
            cloned.collapse(false);
            cloned.insertNode(end);
        }

        cloned.setStart(range.startContainer, range.startOffset);
        cloned.collapse(true);
        cloned.insertNode(start);

        range.setStartAfter(start);

        if (both) {
            range.setEndBefore(end);
        }

        selection.updateRange(range);
    },
    save() {
        this.insert();
    },
    restore() {
        let start = this.find('start'),
            end = this.find('end'),
            selection = this.app.create('selection'),
            selRange = selection.getRange(),
            range = (selRange) ? selRange : this.app.getDocNode().createRange(),
            prev,
            next;

        if (start) {
            prev = (end) ? end.previousSibling : false;
            next = start.nextSibling;

            next = (next && next.nodeType === 3 && next.textContent.replace(/[\n\t]/g, '') === '') ? false : next;

            if (!end) {
                if (next) {
                    range.selectNodeContents(next);
                    range.collapse(true);
                }
                else {
                    this._restoreInject(range, start);
                }
            }
            else if (next && next.id === 'rx-selection-marker-end') {
                this._restoreInject(range, start);
            }
            else {
                if (prev && next) {
                    range.selectNodeContents(prev);
                    range.collapse(false);
                    range.setStart(next, 0);
                }
                else if (prev && !next) {
                    range.selectNodeContents(prev);
                    range.collapse(false);
                    range.setStartAfter(start);
                }
                else {
                    range.setStartAfter(start);
                    range.setEndBefore(end);
                }
            }

            this._remove(start);
            this._remove(end);

            // set range
            selection.setRange(range);
        }
    },
    find(pos) {
        let $editor = this.app.getEditor(),
            result = false,
            $start,
            $end,
            start,
            end;

        if ($editor) {
            $start = $editor.find('#rx-selection-marker-start');
            $end = $editor.find('#rx-selection-marker-end');
            start = ($start.length !== 0) ? $start.get() : false;
            end = ($end.length !== 0) ? $end.get() : false;

            if (pos) {
                result = (pos === 'start') ? start : end;
            }
            else {
                result = {
                    start: start,
                    end: end
                };
            }
        }

        return result;
    },
    replaceToText(html) {
        let utils = this.app.create('utils');

        return utils.wrap(html, function($w) {
            $w.find('#rx-selection-marker-start').replaceWith('---marker-start---');
            $w.find('#rx-selection-marker-end').replaceWith('---marker-end---');
        });
    },
    replaceToMarker(html) {

        html = html.replace('---marker-start---', this._build('start').outerHTML);
        html = html.replace('---marker-end---', this._build('end').outerHTML);

        return html;
    },
    remove() {
        this._remove(this.find('start'));
        this._remove(this.find('end'));
    },

    // private
    _remove(el) {
        if (el) {
            let parent = this._getParent(el);
            el.parentNode.removeChild(el);
            if (parent) parent.normalize();
        }
    },
    _build(pos) {
        let $marker = this.dom('<span>');
        $marker.attr('id', 'rx-selection-marker-' + pos);
        $marker.addClass('rx-selection-marker');
        $marker.html(this.opts.get('markerChar'));

        return $marker.get();
    },
    _restoreInject(range, start) {
        let utils = this.app.create('utils'),
            textNode = utils.createInvisibleChar();

        range.selectNodeContents(textNode);
        range.collapse(false);
    },
    _getParent(el) {
        let tags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'div', 'address', 'ul', 'ol', 'dl', 'td', 'th', 'blockquote'],
            $parent = this.dom(el).closest(tags.join(','));

        return ($parent.length !== 0) ? $parent.get() : false;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'caret', {
    set(el, type) {
        let node = this._getNode(el),
            selection = this.app.create('selection'),
            range = this.app.getDocNode().createRange(),
            map = { 'start': '_setStart', 'end': '_setEnd', 'before': '_setBefore', 'after': '_setAfter' };

        if (!type || !node || !this._isInPage(node)) {
            return;
        }

        // non editable inline node
        if (this._isInline(node) && this._isNoneditable(node)) {
            if (type === 'start') type = 'before';
            else if (type === 'end') type = 'after';
        }

        // set
        this[map[type]](range, node);
        selection.setRange(range);
    },
    is(el, type, removeblocks, trimmed, br) {
        let node = this._getNode(el),
            sel = this.app.getWinNode().getSelection(),
            result = false,
            position,
            size;

        if (!node || !sel.isCollapsed) {
            return result;
        }

        position = this._getPosition(node, trimmed, br);
        size = this._getSize(node, removeblocks, trimmed);

        if (type === 'end') {
            result = (position === size);
        }
        else if (type === 'start') {
            result = (position === 0);
        }

        return result;
    },

    // private
    _getNode(el) {
        return this.dom(el).get();
    },
    _setStart(range, node) {
        range.setStart(node, 0);
        range.collapse(true);

        // block node has first inline
        let inline = this._getInlineInside(node);
        if (inline) {
            range = this._setStartInline(range, inline);
        }

        // inline node
        if (this._isInline(node)) {
            this._insertInvisibleNode(range);
        }
    },
    _setStartInline(range, inline) {
        let elm = this.app.create('element'),
            inlines = elm.getInlines(inline),
            node = inlines[0];

        range.selectNodeContents(node);
        range.collapse(true);
    },
    _setEnd(range, node) {
        // block node has last inline
        let last = (node.nodeType === 1) ? node.lastChild : false,
            lastInline = (last && this._isInline(last));

        if (lastInline) {
            node = last;
            if (node.childNodes.length === 1) {
                let inline = node.childNodes[0];
                if (inline.nodeType === 1 && inline.tagName.toLowerCase() === 'svg') {
                    this._setAfter(range, node);
                    return;
                }
            }
        }

        range.selectNodeContents(node);
        range.collapse(false);
    },
    _setBefore(range, node) {
        range.setStartBefore(node);
        range.collapse(true);

        // inline node
        if (this._isInline(node)) {
            this._insertInvisibleNode(range, node);
        }
    },
    _setAfter(range, node) {
        range.setStartAfter(node);
        range.collapse(true);

        // inline node
        let tag = (node.nodeType !== 3) ? node.tagName.toLowerCase() : false;
        if (this._isInline(node) || tag === 'br' || tag === 'svg') {
            this._insertInvisibleNode(range);
        }
    },
    _insertInvisibleNode(range, before) {
        let utils = this.app.create('utils'),
            textNode = utils.createInvisibleChar();

        if (before) {
            before.parentNode.insertBefore(textNode, before);
        }
        else {
            range.insertNode(textNode);
        }

        range.selectNodeContents(textNode);
        range.collapse(false);
    },
    _getInlineInside(node) {
        let inline = node.firstChild,
            inside;

        if (this._isInline(inline)) {
            inside = inline.firstChild;
            while (inside) {
                if (this._isInline(inside)) {
                    return inside;
                }
                inside = inside.firstChild;
            }

            return inline;
        }
    },
    _getSize(node, removeblocks, trimmed) {
        let str,
            isTextNode = (node.nodeType === 3),
            $node,
            $cloned;

        if (removeblocks && removeblocks.length !== 0) {
            $node = this.dom(node);
            $cloned = $node.clone();
            $cloned.find(removeblocks.join(',')).remove();
            str = $cloned.html().trim();
        }
        else {
            str = (isTextNode) ? node.textContent : node.innerHTML;
            str = (isTextNode || trimmed === false) ? str : str.trim();
        }

        return this._trimmed(str, isTextNode, trimmed).length;
    },
    _getPosition(node, trimmed, br) {
        let sel = this.app.getWinNode().getSelection();

        if (sel.rangeCount === 0) {
            return false;
        }

        let range = sel.getRangeAt(0),
            caretRange = range.cloneRange(),
            tmp = document.createElement("div"),
            isTextNode = (node.nodeType === 3),
            str,
            brEnd;

        caretRange.selectNodeContents(node);
        caretRange.setEnd(range.endContainer, range.endOffset);
        tmp.appendChild(caretRange.cloneContents());

        str = (isTextNode || trimmed === false) ? tmp.innerHTML : tmp.innerHTML.trim();
        brEnd = (str.search(/<\/?br\s?\/?>$/g) !== -1) ? 1 : 0;
        if (br === false) {
            brEnd = 0;
        }

        str = this._trimmed(str, isTextNode, trimmed);

        return str.length + brEnd;
    },
    _trimmed(str, isTextNode, trimmed) {
        let utils = this.app.create('utils');

        if (trimmed === false) {
            str = str.replace(/\n$/g, '');
            return str;
        }

        str = utils.removeInvisibleChars(str);
        str = str.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, '');
        str = str.replace(/\s+/g, ' ');
        if (str !== '' && !isTextNode) {
            str = str.replace(/\s$/, '');
        }

        return str;
    },
    _isInline(node) {
        let element = this.app.create('element');

        return element.is(node, 'inline');
    },
    _isInPage(node) {
        let isIn = false,
            doc = this.app.getDocNode();

        if (node && node.nodeType) {
            isIn = (node === doc.body) ? false : doc.body.contains(node);
        }

        return isIn;
    },
    _isNoneditable(node) {
        return (node.getAttribute('contenteditable') === 'false');
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'selection', {
    init() {
        this.sel = this._getSelection();
    },

    // is
    is(el) {
        let node,
            nodes,
            i = 0,
            max;

        if (typeof el !== 'undefined') {
            node = this.dom(el).get();
            nodes = this.getNodes();
            max = nodes.length;
            for (i; i < max; i++) {
                if (nodes[i] === node) {
                    return true;
                }
            }
        }
        else {
            return !!this.sel;
        }

        return false;
    },
    isTool(e) {
        if (!e) return false;
        return (this.dom(e.target).closest('.rx-in-tool').length !== 0);
    },
    isIn(el) {
        let node = this.dom(el).get(),
            current = this.getCurrent();

        return (current && node) ? node.contains(current) : false;
    },
    isCollapsed() {
        let range = this.getRange();

        return this._getCollapsed(this.sel, range);
    },
    isAll(el) {
        if (this.isCollapsed()) return false;

        let isEditor = (!el),
            node = (el) ? this.dom(el).get() : this.app.editor.getEditor().get(),
            isNode = (isEditor) ? true : this.is(node),
            range = this.getRange();

        if (isNode) {
            return ((typeof node.textContent !== 'undefined') && (node.textContent.trim().length === range.toString().trim().length));
        }
        else {
            return false;
        }
    },
    isBackwards() {
        let backwards = false,
            sel = this.sel,
            range;

        if (sel && !sel.collapsed) {
            range = this.app.getDocNode().createRange();
            range.setStart(sel.anchorNode, sel.anchorOffset);
            range.setEnd(sel.focusNode, sel.focusOffset);
            backwards = range.collapsed;
            range.detach();
        }

        return backwards;
    },

    // get
    get() {
        return this.sel;
    },
    getRange() {
        return this._getRange(this.sel);
    },
    getCurrent() {
        return this._getCurrent(this.sel);
    },
    getParent() {
        let current = this.getCurrent();
        return this._getParent(current);
    },
    getNodes(data) {
        let range = this.getRange(),
            nodes = [],
            partial = (data && data.partial);

        if (!this.is()) {
            return nodes;
        }

        // all selected
        if (this.app.editor.isSelectAll()) {
            nodes = [...this.app.editor.getEditor().get().getElementsByTagName("*")];
        }
        else {
            nodes = this._getRangeNodes(range, partial);
            // remove duplicates
            nodes = [...new Set(nodes)];
        }

        return (nodes.length > 0) ? this._filterNodes(nodes, range, data) : nodes;
    },
    getPosition(type) {
        let range = this.getRange(),
            pos = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 },
            offset,
            rect;

        if (this.app.getWinNode().getSelection && range.getBoundingClientRect) {
            range = range.cloneRange();

            if (type == 'end') {
                range.setStart(range.endContainer, range.endOffset);
            }
            else {
                offset = (range.startOffset-1);
                range.setStart(range.startContainer, (offset < 0) ? 0 : offset);
            }

            rect = range.getBoundingClientRect();
            pos = { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: (rect.right - rect.left), height: (rect.bottom - rect.top) };
        }

        return pos;
    },

    getClosest(selector) {
        let current = this.getCurrent(),
            $el =  this.dom(current).closest(selector);

        return ($el.length !== 0) ? $el.get() : false;
    },
    getElement(el) {
        return this._getElement(el, 'element');
    },
    getInline(el) {
        return this._getElement(el, 'inline');
    },
    getTopInline(el) {
        let node = (el) ? this.dom(el).get() : this.getCurrent(),
            inlines = [];

        while (node) {
            if (this._getElement(node, 'inline')) {
                inlines.push(node);
            }
            else {
                break;
            }

            node = node.parentNode;
        }

        return inlines[inlines.length-1];
    },
    getBlock(el) {
        return this._getElement(el, 'block');
    },
    getDataBlock(el) {
        let node = el || this.getCurrent();

        if (node) {
            node = this.dom(node).get();
            while (node) {
                if (node.nodeType === 1 && node.getAttribute('data-rx-type')) {
                    return this.dom(node);
                }

                node = node.parentNode;
            }
        }

        return this.dom();
    },
    getText(position, len) {
        let range = this.getRange(),
            text = false,
            el,
            cloned;

        if (!this.sel) return false;
        if (position && range) {
            len = (typeof len === 'undefined') ? 1 : len;

            el = this.app.editor.getEditor().get();
            cloned = range.cloneRange();

            if (position === 'before') {
                cloned.collapse(true);
                cloned.setStart(el, 0);

                text = cloned.toString().slice(-len);
            }
            else if (position === 'after') {
                cloned.selectNodeContents(el);
                cloned.setStart(range.endContainer, range.endOffset);

                text = cloned.toString().slice(0, len);
            }
        }
        else {
            text = (this.sel) ? this.sel.toString() : '';
        }

        return text;
    },
    getHtml() {
        let html = '',
            range,
            cloned,
            div;

        if (this.sel) {
            range = this.getRange();
            cloned = range.cloneContents();
            div = document.createElement('div');
            div.appendChild(cloned);
            html = div.innerHTML;
            html = html.replace(/<p><\/p>$/i, '');
        }

        return html;
    },

    // range
    setRange(range) {
        let sel = this.app.getWinNode().getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    },
    updateRange(range) {
        if (this.sel) {
            this.sel.removeAllRanges();
            this.sel.addRange(range);
        }
    },

    // select
    select(el) {
        let node = (el) ? this.dom(el).get() : this.app.editor.getEditor().get();
        if (!node) return;

        let range = this.app.getDocNode().createRange();

        range.selectNodeContents(node);
        this.setRange(range);
    },

    // remove
    remove() {
        if (this.sel) {
            this.sel.removeAllRanges();
            this.sel = false;
        }
    },
    truncate() {
        let range = this.getRange();
        if (!this.isCollapsed() && range) {
            range.deleteContents();
        }
    },

    // collapse
    collapse(type) {
        type = type || 'start';

        if (this.sel && !this.isCollapsed()) {
            if (type === 'start') this.sel.collapseToStart();
            else this.sel.collapseToEnd();
        }
    },

    // private
    _getSelection() {
        let current,
            $current,
            sel = this.app.getWinNode().getSelection(),
            $editor = this.app.getEditor();

        if (sel.rangeCount > 0) {
            current = sel.anchorNode;
            $current = this.dom(current);
            if ($current.closest($editor).length === 0) {
                return false;
            }

            return sel;
        }

        return false;
    },
    _getRange(selection) {
        return (selection) ? ((selection.rangeCount > 0) ? selection.getRangeAt(0) : false) : false;
    },
    _getCurrent(selection) {
        return (selection) ? selection.anchorNode : false;
    },
    _getParent(current) {
        return (current) ? current.parentNode : false;
    },
    _getElement(el, type) {
        let element = this.app.create('element'),
            node;

        if (this.sel) {
            node = el || this.getCurrent();
            node = this.dom(node).get();

            while (node) {
                if (element.is(node, type)) {
                    return node;
                }

                node = node.parentNode;
            }
        }

        return false;
    },
    _getCollapsed(selection, range) {
        let collapsed = false;
        if (!selection || !range) collapsed = true;
        else if (selection && selection.isCollapsed) collapsed = true;
        else if (range && range.toString().length === 0) collapsed = true;

        return collapsed;
    },
    _getRangeNodes(range, partial) {
        let start = range.startContainer.childNodes[range.startOffset] || range.startContainer,
            end = range.endContainer.childNodes[range.endOffset] || range.endContainer,
            commonAncestor = range.commonAncestorContainer,
            nodes = [],
            node;

        if (!this.app.editor.isEditor(start)) {
            nodes.push(start);
        }

        if (partial) {
            // push first element
            if (start.nodeType === 3) {
                nodes.unshift(this.getBlock(start));
            }

            for (node = start; node; node = this._getNextNode(node)) {
                if (node === commonAncestor) break;
                if (node.nodeType !== 3 && this.dom(node.parentNode).closest(commonAncestor).length === 0) break;

                nodes.push(node);
                if (node === end) break;
            }
        }
        else {
            for (node = start.parentNode; node; node = node.parentNode) {
                if (this.app.editor.isEditor(node)) break;
                nodes.push(node);
                if (node === commonAncestor) break;
            }

            nodes.reverse();
            for (node = start; node; node = this._getNextNode(node)) {
                if (node.nodeType !== 3 && node.tagName === 'TR') {
                    nodes.unshift(this.dom(node).closest('table').get());
                }
                if (node.nodeType !== 3 && this.dom(node.parentNode).closest(commonAncestor).length === 0) break;

                nodes.push(node);
                if (node === end) break;
            }
        }

        return nodes;
    },
    _getNextNode(node) {
        if (node.firstChild) return node.firstChild;

        while (node) {
            if (node.nextSibling) return node.nextSibling;
            node = node.parentNode;
        }
    },
    _getSelectedText() {
        let selected = this.getText();
        return (selected) ? selected.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&") : '';
    },
    _filterNodes(nodes, range, data) {
        let selected = this._getSelectedText(),
            finalNodes = [],
            max = nodes.length,
            i = 0,
            push,
            element = this.app.create('element');

        for (i; i < max; i++) {
            push = true;
            if (this.app.editor.isEditor(nodes[i])) {
                push = false;
            }

            if (data) {
                push = (data.types) ? this._filterByTypes(push, data, nodes[i], element) : push;
                push = (data.selected) ? this._filterBySelected(push, data, nodes[i], range, selected) : push;
                push = (data.tags) ? this._filterByTags(push, data, nodes[i]) : push;
                push = (data.type) ? this._filterByType(push, data, nodes[i], element) : push;
            }

            if (push) {
                finalNodes.push(nodes[i]);
            }
        }

        return finalNodes;
    },
    _filterByTags(push, data, node) {
        let isTagName = (typeof node.tagName !== 'undefined');

        if (!isTagName) {
            push = false;
        }
        else if (isTagName && data.tags.indexOf(node.tagName.toLowerCase()) === -1) {
            push = false;
        }

        return push;
    },
    _filterBySelected(push, data, node, range, selected) {
        if (data.selected === true && !this._containsNodeText(range, node)) {
            push = false;
        }
        else if (data.selected === 'inside') {
            if (node.nodeType === 1 && node.tagName === 'A') {
                push = true;
            }
            else if (!this._isTextSelected(node, selected)) {
                push = false;
            }
        }

        return push;
    },
    _filterByType(push, data, node, elm) {
        let type = data.type;
        if (data.inline === false) {
            type = 'block-data-not-inline';
        }

         if (data.type === 'inline') {
            if (data.link) {
                if (!elm.is(node, data.type)) {
                    push = false;
                }
            }
            else {
                if ((node.nodeType === 1 && node.tagName === 'A') || !elm.is(node, data.type)) {
                    push = false;
                }
            }
            if (data.buttons) {
                if (elm.is(node, data.type, false)) {
                    push = true;
                }
            }
        }
        else if (!elm.is(node, type)) {
            push = false;
        }

        return push;
    },
    _filterByTypes(push, data, node, element) {
        let type = element.getType(node);
        if (data.types.indexOf(type) === -1) {
            push = false;
        }

        return push;
    },
    _isInNodesArray(nodes, node) {
        return (nodes.indexOf(node) !== -1);
    },
    _isTextSelected(node, selected) {
        let utils = this.app.create('utils'),
            text = (node.nodeType !== 9) ? utils.removeInvisibleChars(node.textContent) : '';

        return (
            selected === text || text.search(selected) !== -1 || selected.search(new RegExp('^' + utils.escapeRegExp(text) + '$')) !== -1
        );
    },
    _isBackwards() {
        let backwards = false,
            sel = this.get(),
            range;

        if (sel && !sel.collapsed) {
            range = this.app.getDocNode().createRange();
            range.setStart(sel.selection.anchorNode, sel.selection.anchorOffset);
            range.setEnd(sel.selection.focusNode, sel.selection.focusOffset);
            backwards = range.collapsed;
            range.detach();
        }

        return backwards;
    },
    _containsNodeText(range, node) {
        let treeWalker = this.app.getDocNode().createTreeWalker(node, NodeFilter.SHOW_TEXT, { acceptNode(node) { return NodeFilter.FILTER_ACCEPT; } }, false),
            first,
            last,
            textNode,
            nodeRange;

        while ((textNode = treeWalker.nextNode())) {
            if (!first) {
                first = textNode;
            }
            last = textNode;
        }

        nodeRange = range.cloneRange();
        if (first) {
            nodeRange.setStart(first, 0);
            nodeRange.setEnd(last, last.length);
        }
        else {
            nodeRange.selectNodeContents(node);
        }
        return (range.compareBoundaryPoints(Range.START_TO_START, nodeRange) < 1 && range.compareBoundaryPoints(Range.END_TO_END, nodeRange) > -1);
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'utils', {
    // invisible chars
    createInvisibleChar() {
        return document.createTextNode(this.opts.get('markerChar'));
    },
    searchInvisibleChars(str) {
        return str.search(/^\uFEFF$/g);
    },
    removeInvisibleChars(str) {
        return str.replace(/\uFEFF/g, '');
    },

    // wrap
    wrap(html, func) {
        let $w = this.dom('<div>').html(html);
        func($w);

        html = $w.html();
        $w.remove();

        return html;
    },

    // empty
    isEmptyHtml(html, emptyparagraph) {
        let cleaner = this.app.create('cleaner');

        html = html.trim();
        html = cleaner.removeInvisibleChars(html);
        html = html.replace(/^&nbsp;$/gi, '1');
        html = html.replace(/&nbsp;/gi, '');
        html = html.replace(/<\/?br\s?\/?>/g, '');
        html = html.replace(/\s/g, '');
        html = html.replace(/^<p>\s\S<\/p>$/i, '');
        html = html.replace(/<hr(.*?[^>])>$/i, 'hr');
        html = html.replace(/<iframe(.*?[^>])>$/i, 'iframe');
        html = html.replace(/<source(.*?[^>])>$/i, 'source');

        // remove comments
        html = cleaner.removeComments(html);

        // remove empty tags
        html = (emptyparagraph) ? html.replace(/<p[^>]*><\/p>/gi, '') : html;
        html = (emptyparagraph) ? html.replace(/<div[^>]*><\/div>/gi, '') : html;
        html = html.replace(/<[^/>]><\/[^>]+>/gi, '');
        html = html.replace(/<[^/>]><\/[^>]+>/gi, '');

        // trim
        html = html.trim();

        return (html === '');
    },
    isLine(html) {
        let $el = this.dom(document.createElement("div")).html(html),
            tags = this.opts.get('tags');

        return ($el.find(tags.block.join(',') + ',img').length === 0);
    },

    // extract
    extractHtmlFromCaret(el) {
        let node = this._getNode(el),
            selection = this.app.create('selection'),
            range = selection.getRange(),
            cloned;

        if (range) {
            cloned = range.cloneRange();
            cloned.selectNodeContents(node);
            cloned.setStart(range.endContainer, range.endOffset);

            return cloned.extractContents();
        }
    },
    getTextFromHtml(html, params) {
        let $tmp,
            str = '',
            arr,
            i = 0,
            cleaner = this.app.create('cleaner'),
            defs = {
                br: false,
                nl: false,
                trimlines: true,
                images: false,
                links: false
            };

        params = Redactor.extend({}, defs, params);

        html = cleaner.store(html, 'code');
        html = (params.links) ? cleaner.store(html, 'links') : html;
        html = (params.images) ? cleaner.store(html, 'images') : html;
        html = html.replace(/\n\s+<span/gi, ' <span');
        html = html.replace(/span>\n\s+/gi, 'span> ');
        html = html.replace(/<(ul|ol)>\s+<li>/gi, '<$1><li>');
        html = html.replace(/<li[^>]*>\n/gi, '<li$1>');
        html = html.replace(/<p[^>]*>(\s+|)<\/p>/gi, 'xemptyz');
        html = html.replace(/<!--[\s\S]*?-->/gi, '');
        html = html.replace(/<style[\s\S]*?style>/gi, '');
        html = html.replace(/<script[\s\S]*?script>/gi, '');
        html = html.replace(/<\/(div|li|dt|dd|td|p|H[1-6])>\n?/gi, '</$1>\n');
        html = html.replace(/&(lt|gt);/gi, 'x$1z');

        $tmp = this.dom('<div>').html(html);

        html = this.getText($tmp.get());

        // trim lines
        if (params.trimlines) {
            str = '';
            arr = html.split("\n");
            for (i; i < arr.length; i++) {
                str += arr[i].trim() + '\n';
            }
            html = str;
        }

        html = html.replace(/[\n]+/g, "\n");
        html = html.replace('xemptyz', "\n");
        html = html.replace(/x(lt|gt)z/gi, '&$1;');

        // keep newlines
        if (params.br) {
            html = html.replace(/\n/g, "<br>\n");
            html = html.replace(/<br\s?\/?>\n?$/gi, '');
        }
        else {
            html = (params.nl) ? html : html.replace(/\n/gi, ' ');
        }

        html = cleaner.restore(html, 'code');
        html = (params.links) ? cleaner.restore(html, 'links') : html;
        html = (params.images) ? cleaner.restore(html, 'images') : html;

        html = html.replace(/<pre[^>]*>/g, '');
        html = html.replace(/<code[^>]*>/g, '');
        html = html.replace(/<\/pre>\n?/g, '');
        html = html.replace(/<\/code>/g, '');

        if (!params.images) {
            html = html.replace(/<img[\s\S]*?>/gi, '');
            html = html.replace(/<a[^>]*>(\s+|)<\/a>/gi, '');
        }

        return html.trim();
    },
    getText(node) {
        var rv = '';

        if (node.nodeType === 3) {
            rv = node.nodeValue;
        }
        else {
            for (var i = 0; i < node.childNodes.length; i++) {
                rv += this.getText(node.childNodes[i]);
            }

            var d = (node.nodeType === 1) ? getComputedStyle(node).getPropertyValue('display') : '';
            if (d.match(/^block/) || d.match(/list/) || node.tagName === 'BR' || node.tagName === 'HR') {
                rv += "\n";
            }
        }

        return rv;
    },

    // parse
    parseLists(text) {
        let lines = text.split('\n');
        let str = '';
        for (let i = 0; i < lines.length; i++) {
            lines[i] = lines[i].replace(/^\- (.*)$/g, "<ul><li>\n$1</li></ul>").replace(/^\d\.(.*)$/g, "<ol><li>\n$1</li></ol>");
            str = str + lines[i] + '\n';
        }

        return str.replace(/(<\/ul>[\n]+<ul>|<\/ol>[\n]+<ol>)/g, "");
    },

    // arrays
    extendArrayWithoutDuplicates(arr, extend) {
        return [...new Set([...arr, ...extend])];
    },
    extendArray(arr, extend) {
        arr = [...arr];
        if (extend) {
            for (let i = 0 ; i < extend.length; i++) {
                arr.push(extend[i]);
            }
        }

        return arr;
    },
    removeFromArrayByValue(arr, val) {
        let index,
            i = 0,
            max;

        val = (Array.isArray(val)) ? val : [val];
        for (i = 0, max = val.length; i < max; i++) {
            index = arr.indexOf(val[i]);
            if (index > -1) arr.splice(index, 1);
        }
        return arr;
    },
    sumOfArray(arr) {
        return arr.reduce(function(a, b) {
            return parseInt(a) + parseInt(b);
        }, 0);
    },

    // css
    cssToObject(str) {
        let regex = /([\w-]*)\s*:\s*([^;]*)/g,
            match,
            props = {};

        do {
            match = regex.exec(str);
            if (match != null) {
                props[match[1]] = this._normalizeValue(match[1], match[2].trim());
            }
        }
        while (match);

        return props;
    },
    _normalizeValue(key, val) {
        val = (typeof val === 'string') ? val.replace(/'/g, '"') : val;
        val = val.trim().replace(/;$/, '');
        if (key.search(/color|background/) !== -1) {
            val = this.convertRgb2hex(val);
            val = val.toLowerCase();
        }
        if (key.search(/family/) !== -1) {
            val = val.replace(/"/g, '');
        }
        if (key === 'border') {
            let match = val.match(/rgb\((.*?)\)/gi);
            if (match) {
                val = val.replace(match[0], this.convertRgb2hex(match[0]));
            }
        }

        return val;
    },

    // color
    getInvertedColor(hex) {
        hex = (hex === '' || hex === null || typeof hex === 'undefined') ? '#ffffff' : hex;
        hex = this.normalizeColor(hex);
        hex = this._removeHexDiese(hex);

        var r = parseInt(hex.slice(0, 2), 16),
            g = parseInt(hex.slice(2, 4), 16),
            b = parseInt(hex.slice(4, 6), 16);

        return ((r * 0.299 + g * 0.587 + b * 0.114) > 186) ? 'black' : 'white';
    },
    normalizeColor(color) {
        color = (color) ? this.convertRgb2hex(color) : color;
        color = (color) ? this.convertShorthex2long(color) : color;

        return color;
    },
    convertRgb2hex(color) {
        if (color.search(/^rgb/i) === -1) {
            return color;
        }

        var arr = color.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);

        return (arr && arr.length === 4) ? "#" +
        ("0" + parseInt(arr[1],10).toString(16)).slice(-2) +
        ("0" + parseInt(arr[2],10).toString(16)).slice(-2) +
        ("0" + parseInt(arr[3],10).toString(16)).slice(-2) : '';
    },
    convertShorthex2long(hex) {
        hex = this._removeHexDiese(hex);
        return (hex.length === 3) ? '#' + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] : '#' + hex;
    },
    replaceRgbToHex(html) {
        return html.replace(/rgb\((.*?)\)/g, function (match, capture) {
            let a = capture.split(',');
            let b = a.map(function(x) {
                x = parseInt(x).toString(16);
                return (x.length === 1) ? '0' + x : x;
            });

            return '#' + b.join("");
        });
    },

    // escape
    escapeRegExp(s) {
        return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    },
    escapeBackslash(s) {
        return s.replace(/\//g, '/');
    },

    // data
    extendData(data, obj) {
        for (let key in obj) {
            if (key === 'elements') {
                data = this._extendDataElements(data, obj[key]);
            }
            else {
                data = this._setData(data, key, obj[key]);
            }
        }

        return data;
    },

    // random
    getRandomId() {
        let id = '',
            possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < 12; i++) {
            id += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return id;
    },

    // =private
    _extendDataElements(data, value) {
        this.dom(value).each(function($node) {
            if ($node.get().tagName === 'FORM') {
                let serializedData = $node.serialize(true);
                Object.keys(serializedData).forEach(function(key) {
                    data = this._setData(data, key, serializedData[key]);
                }.bind(this));
            }
            else {
                let name = ($node.attr('name')) ? $node.attr('name') : $node.attr('id');
                data = this._setData(data, name, $node.val());
            }
        }.bind(this));

        return data;
    },
    _setData(data, name, value) {
        if (data instanceof FormData) data.append(name, value);
        else data[name] = value;

        return data;
    },
    _getNode(el) {
        return this.dom(el).get();
    },
    _removeHexDiese(hex) {
        return (hex.indexOf('#') === 0) ? hex.slice(1) : hex;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'block-data', {
    init(block, defaults, commonDefaults, params) {
        this.block = block;
        this.data = Redactor.extend(true, defaults, commonDefaults);
        this._buildParams(params);
    },
    build() {
        for (let [key, item] of Object.entries(this.data)) {
            if (item.value && item.setter && typeof this.block[item.setter] === 'function') {
                this.block[item.setter].call(this.block, item.value);
            }
        }
    },
    dump() {
        return this.data;
    },
    get(name) {
        if (typeof this.data[name] !== 'undefined' && this.data[name].hasOwnProperty('value')) {
            return this.data[name].value;
        }
    },
    set(name, value) {
        if (typeof this.data[name] === 'undefined') {
            this.data[name] = {};
        }

        this.data[name].value = value;
    },
    add(name, obj) {
        if (typeof this.data[name] === 'undefined') {
            this.data[name] = [];
        }

        this.data[name].push(obj);
    },
    remove(name) {
        delete this.data[name];
    },

    // setter
    setData(data) {
        for (let key in data) {
            if (!this.data[key]) continue;
            this.block[this.data[key].setter].call(this.block, data[key]);
        }
    },

    // getter
    getData(assembly) {
        let value,
            data = { type: this.block.getType() };

        for (let [key, item] of Object.entries(this.data)) {
            if (assembly !== true && (key === 'items' || key === 'children')) {
                continue;
            }

            if (assembly && item.getter === 'getHtml' && key === 'text') {
                item.getter = 'getContent';
            }

            if (item.getter && typeof this.block[item.getter] === 'function') {
                value = this.block[item.getter].apply(this.block);
                if (value !== null) {
                    data[key] = value;
                }
            }
        }

        return data;
    },

    // values
    getValues() {
        let data = {};
        for (let [key, item] of Object.entries(this.data)) {
            if (item.value) {
                data[key] = item.value;
            }
        }

        return data;
    },

    // private
    _buildParams(params) {
        if (params) {
            for (let [key, value] of Object.entries(params)) {
                this.set(key, value);
            }
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'parser', {
    init() {
        this.defaults = {
            type: 'html', // json, line
            start: false,
            nodes: false,
            state: false
        };
        this.parsedAttr = 'data-rx-type';
    },
    build(html) {
        return this._buildNodes(html);
    },
    parse(html, defaults) {
        let parser,
            content = '';

        // extend params
        this.defaults = Redactor.extend(true, this.defaults, defaults);

        // parser
        switch (this.defaults.type) {
            case 'json':
                parser = this.app.create('parser-json', this);
                break;
            case 'line':
                parser = this.app.create('parser-line', this);
                break;
            default:
                parser = this.app.create('parser-html', this);
        }

        // parse
        content = parser.parse(html, this.defaults);

        // html & line
        if (this.defaults.type !== 'json') {
            content = this._buildResult(content);
        }

        return content;
    },
    clean(html, setting) {
        let instance,
            templateSyntax = this.opts.get('templateSyntax'),
            nonparse = this.opts.get('nonparse'),
            utils = this.app.create('utils'),
            cleaner = this.app.create('cleaner');

        // template syntax
        if (templateSyntax) {
            this.opts.set('clean.comments', false);
            html = cleaner.storeTemplateSyntax(html, templateSyntax);
        }


        // email blocks
        if (this.app.has('email')) {
            html = this.app.email.parseBlocks(html);
        }

        // store comments
        html = cleaner.storeComments(html);

        // fix &curren; entity in the links
        html = html.replace(/¤t/gi, '&current');

        // encode
        if (setting && setting.start && this.app.element.isTextarea()) {
            html = cleaner.encodeCode(html);
        }

        // sanitize
        html = cleaner.sanitize(html);

        // convert
        html = cleaner.convertForms(html);
        html = cleaner.convertFrames(html);

        // store
        for (let i = 0; i < nonparse.length; i++) {
            html = cleaner.store(html, nonparse[i]);
        }
        // store noparse
        html = cleaner.store(html, 'embed');
        html = cleaner.store(html, 'svg');
        html = cleaner.store(html, 'noparse');

        // remove tags & doctype
        html = cleaner.removeTags(html, this.opts.get('tags.denied'));
        html = cleaner.removeDoctype(html);

        // remove style & script tag
        html = cleaner.removeTagsWithContent(html, ['script', 'style']);

        // remove empty spans
        html = cleaner.removeEmptySpans(html);

        // add https for links and images
        html = cleaner.addHttps(html);
        html = cleaner.removeBlockTagsInside(html, ['li', 'dt', 'dd', 'address']);

        // cache styles for block and inline tags and img
        html = cleaner.cacheStyle(html);

        // restore
        for (let i = 0; i < nonparse.length; i++) {
            html = cleaner.restore(html, nonparse[i]);
        }
        // restore noparse
        html = cleaner.restore(html, 'embed');
        html = cleaner.restore(html, 'noparse');
        html = cleaner.restore(html, 'svg');

        // restore comments
        html = cleaner.restoreComments(html);

        // remove comments
        html = (this.opts.is('clean.comments')) ? cleaner.removeComments(html) : html;

        // empty or paragraphize
        if (utils.isEmptyHtml(html)) {
            html = this.app.block.createHtml();
        }
        else {
            let paragraphizer = this.app.create('paragraphizer');
            html = paragraphizer.parse(html);
        }

        return html;
    },
    replaceTags(html) {
        let tags = this.opts.get('replaceTags');
        if (!tags) {
            return html;
        }

        let keys = Object.keys(tags),
            utils = this.app.create('utils'),
            elm = this.app.create('element');

        if (typeof html === 'string') {
            html = utils.wrap(html, function($w) {
                $w.find(keys.join(',')).each(function($node) {
                    elm.replaceToTag($node, tags[$node.get().tagName.toLowerCase()]);
                });
            });
        }
        else {
            html.find(keys.join(',')).each(function($node) {
                elm.replaceToTag($node, tags[$node.get().tagName.toLowerCase()]);
            });
        }

        return html;
    },

    // private
    _buildResult(content) {
        if (this.defaults.nodes) {
            let $layout = this._buildNodes(content);

            // email
            if (this.app.has('email')) {
                $layout = this.app.email.parse($layout);
            }

            // nodes
            content = $layout.get().childNodes;
        }

        return content;
    },
    _buildNodes(html) {
        let $layout = this.dom('<div>');
        $layout.html(html);
        $layout.find('[' + this.parsedAttr + ']').each(this._buildNode.bind(this));

        return $layout;
    },
    _buildNode($node) {
        let type = $node.attr(this.parsedAttr);
        let instance = this.app.create('block.' + type, $node);
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'parser-html', {
    init(parser) {
        this.parser = parser;
        this.parsedAttr = parser.parsedAttr;
    },
    parse(html, defaults) {
        this.defaults = defaults;

        let instance,
            utils = this.app.create('utils'),
            elm = this.app.create('element'),
            paragraphizer = this.app.create('paragraphizer');

        // utils
        this.utils = utils;
        this.elm = elm;

        html = html.trim();
        html = this.app.broadcastHtml('editor.before.parse', html);

        // check empty
        if (utils.isEmptyHtml(html)) {
            html = this.app.block.createHtml();
        }
        // clean & parse
        else {
            html = this.parser.clean(html, this.defaults);
            html = this._parseBlocks(html);
            html = this.parser.replaceTags(html);

            // parse inside div layers (incl. breakline)
            html = paragraphizer.parseLayers(html);
            html = this._parseLayersNodes(html);
        }

        // broadcast
        html = this.app.broadcastHtml('editor.parse', html);

        return html;
    },

    // private
    _parseBlocks(html) {
        let predefined = this.app.create('predefined');

        return this.utils.wrap(html, function($w) {
            // parse elements
            this._parseElements($w);

            // predefined classes
            predefined.parse($w);
        }.bind(this));
    },
    _parseElements($block) {
        let nodes = this.elm.getBlocks($block),
            i = 0,
            max;

        // blocks
        for (i = 0, max = nodes.length; i < max; i++) {
            this._parseNode(nodes[i]);
        }
    },
    _parseNode(el) {
        let $el = this.dom(el),
            index,
            nested = this.opts.get('nested'),
            nestedValue = this.opts.get('nestedValue'),
            tag = el.tagName.toLowerCase(),
            type = this._parseType($el, tag),
            imageTag = this.opts.get('image.tag'),
            elm;

        // set
        if (type) {
            $el.attr(this.parsedAttr, type);
        }

        // check image tag
        //if (type === 'image') {
        //    if (tag !== imageTag) {
        //        elm = this.app.create('element');
        //        $el = elm.replaceToTag($el, imageTag, true);
        //    }
        //}

        // nested
        index = nested.indexOf(type);
        if (index !== -1) {
            if (nestedValue[index] === true) {
                this._parseElements($el);
            }
            else {
                $el.find(nestedValue[index]).each(this._parseElements.bind(this));
            }
        }
    },
    _parseType($el, tag) {
        let type;
        let dataBlock = this.opts.get('dataBlock');

        if ($el.attr(this.parsedAttr)) {
            type = $el.attr(this.parsedAttr);
        }
        // blocks
        else if ($el.attr(dataBlock)) {
            type = $el.attr(dataBlock);
        }
        else {
            type = this._parseTypeByTag($el, tag);
        }

        return type;
    },
    _parseTypeByTag($el, tag) {
        let type;
        switch (tag) {
            case 'p':
                type = 'text';
                if (this._isImageBlock($el, 'p')) {
                    type = 'image';
                }
                break;
            case 'figure':
                type = 'embed';
                if (this._isImageBlock($el, 'figure')) {
                    type = 'image';
                }
                else if (this._hasChild($el, 'pre')) {
                    type = 'pre';
                }
                else if (this._hasChild($el, 'blockquote')) {
                    type = 'quote';
                }
                break;
            case 'div':
                type = 'wrapper';
                if (this._isImageBlock($el, 'div')) {
                    type = 'image';
                }
                else if (this._isTextBlock($el)) {
                    type = 'text';
                }
                break;
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                type = 'heading';
                break;
            case 'blockquote':
                type = 'quote';
                break;
            case 'table':
                type = 'table';
                break;
            case 'pre':
                type = 'pre';
                break;
            case 'hr':
                type = 'line';
                break;
            case 'dl':
                type = 'dlist';
                break;
            case 'address':
                type = 'address';
                break;
            case 'ul':
            case 'ol':
                type = 'list';
                if (this._isTodo($el)) {
                    type = 'todo';
                }
                break;
            default:
                type = 'wrapper';
                break;
        }

        return type;
    },
    _parseLayersNodes(html) {
        let predefined = this.app.create('predefined');

        return this.utils.wrap(html, function($w) {
            $w.find('[data-rx-tag]').each(this._parseLayersDataTag.bind(this));
            $w.find('[data-rx-type=wrapper],[data-rx-type=column]').each(function($node) {
                this._parseElements($node);
                predefined.parse($node);
            }.bind(this));
        }.bind(this));
    },
    _parseLayersDataTag($node) {
        if (!$node.attr('data-rx-type')) {

            let type = 'text';
            if (this._isImageBlock($node, 'div')) {
                type = 'image';
                $node.removeAttr('data-rx-tag');
            }

            $node.attr(this.parsedAttr, type);
        }
    },

    // is
    _isImageBlock($el, tag) {
        let $img = $el.find('img'),
            $cont,
            $target,
            $parent,
            parentTag;

        if ($img.length === 0) return;
        if (tag === 'div' && $img.closest('figure').length !== 0) return;

        $target = $img;
        $parent = $img.parent();
        $cont = $parent;
        parentTag = ($parent.length !== 0) ? $parent.get().tagName : false;

        if (parentTag && (parentTag === 'A' || parentTag === 'SPAN')) {
            $target = $parent;
            $cont = $parent.parent();
        }

        if ($cont.get() !== $el.get()) {
            return;
        }

        if ($target.prevElement().length !== 0) return;
        if (tag !== 'figure' && $target.nextElement().length !== 0) return;

        return true;
    },
    _isTextBlock($el) {
        let $first = $el.children().first();
        if ($first.length === 0 || !this.elm.is($first, 'block')) {
            return true;
        }
    },
    _isTodo($el) {
        let $first = $el.children().first(),
            item,
            itemDone,
            content;
        if ($first.length != 0) {
            content = $first.html();
            item = content.startsWith(this.opts.get('todo.templateItem'));
            itemDone = content.startsWith(this.opts.get('todo.templateItemDone'));

            if (item || itemDone) {
                return true;
            }
        }

        return false;
    },
    // has
    _hasChild($el, tag) {
        let $pre,
            $quote,
            $script;

        if (tag === 'pre') {
            $pre = $el.find('pre');
            if ($pre.length !== 0) {
                return true;
            }
        }
        else if (tag === 'blockquote') {
            $quote = $el.find('blockquote');
            $script = $el.find('script');
            if ($script.length === 0 && $quote.length !== 0) {
                return true;
            }
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'parser-json', {
    init(parser) {
        this.parser = parser;
        this.parsedAttr = parser.parsedAttr;
    },
    parse(json, defaults) {
        this.defaults = defaults;

        let result,
            utils = this.app.create('utils'),
            predefined = this.app.create('predefined'),
            $layout = this.dom('<div>');

        // render
        $layout = this._render($layout, json.blocks);
        predefined.parse($layout);

        // result
        if (this.defaults.nodes) {
            result = $layout.children();
        }
        else {
            result = $layout.html();
        }

        // replace tags
        result = this.parser.replaceTags(result);

        return result;
    },

    // private
    _render($layout, obj, render) {
        let val,
            instance,
            $block,
            $node,
            localRender,
            nonparse = this.opts.get('nonparse');

        for (val of Object.values(obj)) {
             instance = this.app.create('block.' + val.type, val, render);
            $block = instance.getBlock();
            localRender = (nonparse.indexOf(val.type) !== -1 || render === false) ? false : undefined;

            if (val.children) {
                this._render($block, val.children, localRender);
            }

            $layout.append($block);
        }

        return $layout;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'parser-line', {
    init(parser) {
        this.parser = parser;
        this.parsedAttr = parser.parsedAttr;
    },
    parse(html, defaults) {
        this.defaults = defaults;

        if (html === ' ') {
            html = '&nbsp;';
        }
        else {
            // broadcast
            html = this.app.broadcastHtml('editor.before.parse', html);

            // inlines
            html = this._parseInlineBlocks(html);

            // clean
            html = this._clean(html);

            // broadcast
            html = this.app.broadcastHtml('editor.parse', html);
        }

        return html;
    },

    // private
    _clean(html) {
        let cleaner = this.app.create('cleaner');

        // convert newlines to br
        //html = cleaner.store(html, 'svg');
        //html = html.replace(/\r?\n/g, "<br>");
        //html = cleaner.restore(html, 'svg');

        html = cleaner.encodeCode(html);
        html = cleaner.sanitize(html);
        html = cleaner.removeEmptySpans(html);
        html = cleaner.addHttps(html);
        html = this.parser.replaceTags(html);

        return html;
    },
    _parseInlineBlocks(html) {
        let type,
            utils = this.app.create('utils');

        return utils.wrap(html, function($w) {
            $w.find('[' + this.opts.get('dataBlock') + ']').each(function($node) {
                if (!$node.attr('data-rx-type')) {
                    type = $node.attr(this.opts.get('dataBlock'));
                    this.app.create('block.' + type, $node);
                }
            }.bind(this));
        }.bind(this));
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'unparser', {
    init() {
        this.defaults = {
            type: 'html', // json
            state: false,
            clipboard: false
        };
        this.parsedAttr = 'data-rx-type';
    },
    unparse(html, defaults) {
        this.defaults = Redactor.extend(true, this.defaults, defaults);
        return this._unparse(html);
    },
    unparseClasses($el) {
        $el.removeClass('rx-block-placeholder rx-block-focus rx-block-meta-focus rx-block-control-focus');
        $el.removeClass('rx-nowrap');

        return $el;
    },

    // private
    _unparse(html) {
        let templateSyntax = this.opts.get('templateSyntax'),
            utils = this.app.create('utils'),
            predefined = this.app.create('predefined'),
            parser = this.app.create('parser'),
            cleaner = this.app.create('cleaner'),
            classes = this.opts.get('classes');

        html = html.trim();
        html = this.app.broadcastHtml('editor.before.unparse', html);

        // email blocks
        if (this.app.has('email') && !this.defaults.clipboard) {
            html = this.app.email.unparseBlocks(html);
        }

        // empty
        if (utils.isEmptyHtml(html)) {
            return '';
        }

        // revert
        html = cleaner.revertForms(html);
        html = cleaner.revertFrames(html);

        // store
        html = cleaner.store(html, 'noneditable');
        html = cleaner.store(html, 'embed');

        // link nofollow
        html = cleaner.addNofollow(html);

        // remove selection markers
        html = cleaner.removeMarkers(html);
        html = cleaner.removeInvisibleChars(html);

        // restore
        html = cleaner.restore(html, 'noneditable');
        html = cleaner.restore(html, 'embed');

        // restore data style cache
        html = cleaner.recacheStyle(html);

        // remove empty attrs
        html = cleaner.removeEmptyAttrs(html, ['style', 'class', 'rel', 'alt', 'title']);

        // replace tags
        html = parser.replaceTags(html);

        // unparse
        html = this._unparseAllTags(html);
        html = this._unparseDataType(html);
        html = this._unparseDataTag(html);

        // remove empty attrs again
        html = cleaner.removeEmptyAttrs(html, ['style', 'class', 'rel', 'alt', 'title']);

        // add predefined classes
        if (classes) {
            html = utils.wrap(html, function($w) {
                predefined.parse($w);
            }.bind(this));
        }

        // template syntax
        if (templateSyntax) {
            html = cleaner.restoreTemplateSyntax(html, templateSyntax);
        }

        // if empty
        if (html === '<p></p>') {
            html = '';
        }

        // email
        if (this.app.has('email')) {
            html = this.app.email.unparse(html);
        }

        // replace quot
        html = html.replace(/&quot;(.*?)&quot;/gi, "'$1'");
        html = utils.replaceRgbToHex(html);

        // broadcast
        return this.app.broadcastHtml('editor.unparse', html);
    },
    _unparseAllTags(html) {
        let utils = this.app.create('utils');

        return utils.wrap(html, function($w) {
            $w.find('.rx-ai-main').remove();
            $w.find('.rx-inserted-node').remove();
            $w.find('*').removeAttr('contenteditable data-gramm_editor');

             // remove images states
             if (!this.opts.is('image.states')) {
                 $w.find('img').removeAttr('data-image');
             }
        }.bind(this));
    },
    _unparseDataType(html, safe) {
        let state = this.defaults.state,
            utils = this.app.create('utils'),
            cleaner = this.app.create('cleaner'),
            $elms;

        return utils.wrap(html, function($w) {
            $elms = $w.find('[data-rx-type]');

            if (state !== true) {
                $elms.removeClass('rx-block-state');
            }

            $elms.removeAttr('tabindex data-rx-parsed data-rx-width data-rx-first-level data-rx-inline data-rx-focusable');
            $elms = this.unparseClasses($elms);
            $elms.each(this._unparseByType.bind(this));
            $elms.removeAttr('data-rx-type');

            $w.find('figcaption').removeAttr('data-rx-type data-placeholder').each(cleaner.removeEmptyTag.bind(this));

        }.bind(this));
    },
    _unparseByType($node) {
        let type = $node.attr('data-rx-type');

        if (type === 'embed') {
            this._unparseEmbed($node);
        }
        else if (type === 'todo') {
            this._unparseTodo($node);
        }
    },
    _unparseDataTag(html) {
        let utils = this.app.create('utils');

        html = utils.wrap(html, function($w) {
            $w.find('[data-rx-tag]').each(function(node) {
                let $node = this.dom(node);
                $node.removeAttr('data-rx-tag');

                if (utils.isEmptyHtml($node.html())) {
                    $node.html('<br>').unwrap();
                }
                else if (node.lastChild && node.lastChild.tagName === 'BR') {
                    $node.unwrap();
                }
                else {
                    $node.append('<br>').unwrap();
                }
            }.bind(this));
        }.bind(this));

        html = html.replace(/<br\s?\/?>$/g, '');
        html = html.replace(/<br\s?\/?><\/(td|th|div)>/g, '</$1>');

        return html;
    },
    _unparseEmbed($node) {
        let code = decodeURI($node.attr('data-embed-content')),
            $el = $node.find('.' + this.opts.get('embed.classname'));

        $el.html(code);
        $node.removeAttr('data-embed-content');
    },
    _unparseTodo($node) {
        $node.find('li').each(function($el) {
            let content,
                value = $el.attr('data-checked'),
                checked = (value === '0') ? '[ ]' : '[x]';

            $el.find('[data-rx-type]').removeAttr('data-rx-type');
            $el.removeAttr('data-checked');

            content = $el.find('div').html();
            $el.html(checked + ' ' + content);

        });
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'event-action', {
    drop(e, html, position, cleanDrop) {
        let elm = this.app.create('element'),
            insertion = this.app.create('insertion'),
            utils = this.app.create('utils'),
            autoparse = this.app.create('autoparse');

        let func = (position === 'after') ? 'getFirstLevel' : 'getDataBlock';
        let target = elm[func](e.target);
        target = (target.length === 0) ? this.app.blocks.get({ first: true }) : target;

        // set target
        this.app.block.set(target);

        // drop point
        if (!position) {
            insertion.insertPoint(e);
        }

        let clean = true;
        let parse = true;
        let instance = this.app.block.get();
        let isAll = this.app.editor.isSelectAll();
        if (instance && instance.isType('pre') && !isAll) {
            clean = false;
            parse = false;
            html = utils.getTextFromHtml(html, { nl: true, trimlines: false });
        }

        if (cleanDrop === false) {
            clean = false;
            html = autoparse.parse(html);
        }

        // empty
        if (html === '') {
            return;
        }

        // autoparse
        html = (clean) ? autoparse.parse(html) : html;

        // insert
        return insertion.insert({ html: html, clean: clean, parse: parse, position: position });
    },
    paste(e) {
        e.preventDefault();

        let data = e.clipboardData,
            clipboard = this.app.create('clipboard'),
            utils = this.app.create('utils'),
            cleaner = this.app.create('cleaner'),
            insertion = this.app.create('insertion'),
            autoparse = this.app.create('autoparse'),
            instance = this.app.block.get(),
            url = data.getData('URL'),
            rtf = data.getData('text/rtf'),
            html = clipboard.getContent(data),
            imageUpload = (this.opts.is('image') && this.opts.is('image.upload')),
            imageInserted = this.app.image.insertFromClipboard(data),
            images,
            event,
            inserted,
            clean = true,
            parse = true,
            isAll = this.app.editor.isSelectAll();

        // image
        if (imageUpload && imageInserted) {
            return;
        }

        // broadcast
        this.app.event.setPasteEvent();
        event = this.app.broadcast('editor.before.paste', { e: e, html: html });
        if (event.isStopped()) {
            this.app.event.unsetPasteEvent();
            return;
        }

        html = event.get('html');

        // get safari anchor links
        html = (!url || url === '') ? html : url;

        // clean
        if (this.opts.is('paste.plaintext')) {
            clean = false;
            parse = false;
            html = utils.getTextFromHtml(html, { br: true });
        }
        else if (instance && instance.getType() === 'pre' && !isAll) {
            clean = false;
            parse = false;
            html = utils.getTextFromHtml(html, { nl: true, trimlines: false });
        }
        else if (!this.opts.is('paste.clean')) {
            clean = false;
        }

        html = (this.opts.is('paste.links')) ? html : cleaner.removeTags(html, ['a']);
        html = (this.opts.is('paste.images')) ? html : cleaner.removeTags(html, ['img']);

        // empty
        if (html === '') {
            this.app.event.unsetPasteEvent();
            return;
        }

        // local images
        if (rtf) {
            images = this._findLocalImages(html);
            html = this._replaceLocalImages(html, images, this._extractImagesFromRtf(rtf));
        }

        // autoparse
        html = (clean) ? autoparse.parse(html) : html;

        // insert
        inserted = insertion.insert({ html: html, clean: clean, parse: parse });

        // upload inserted base64 or blob
        if (this.opts.is('image.upload')) {
            this.app.image.parseInserted(inserted);
        }

        // placeholder
        this.app.placeholder.toggle();

        // broadcast
        this.app.broadcast('editor.paste', inserted);
        this.app.event.unsetPasteEvent();
    },
    copy(e) {
        this._action(e, 'copy');
    },
    cut(e) {
        this._action(e, 'cut');
    },

    // =private
    _action(e, name) {
        let html = false,
            obj = {},
            clipboard = this.app.create('clipboard'),
            selection = this.app.create('selection'),
            instance = this.app.block.get();

        // do nothing
        if (instance && instance.isEditable() && selection.isCollapsed()) {
            return;
        }

        // stop event
        e.preventDefault();

        // all selected
        if (this.app.editor.isSelectAll()) {
            obj = { html: this.app.editor.getEditor().html(), remove: 'all' };
        }
        // multiple selection
        else if (this.app.blocks.is()) {
            obj = { html: selection.getHtml(), remove: 'content' };
        }
        // single editable
        else if (instance && instance.isEditable()) {
            obj = this._copyFromEditable(name, instance, selection);
        }
        // single non editable
        else if (instance) {
            obj = this._copyFromNonEditable(name, instance);
        }

        // broadcast
        var event = this.app.broadcast('editor.before.' + name, { e: e, html: obj.html });
        if (event.isStopped()) {
            return;
        }

        // delete content
        if (name === 'cut') {
            this._cutDeleteContent(obj, selection);
        }

        html = event.get('html');

        // set to clipboard
        clipboard.setContent(e, html);

        // broadcast
        return this.app.broadcastHtml('editor.' + name, html);
    },
    _cutDeleteContent(obj, selection) {
        this.app.control.close();
        this.app.context.close();

        if (obj.remove === 'instance') {
            obj.instance.remove({ broadcast: true });
        }
        else if (obj.remove === 'all') {
            this.app.editor.setEmpty();
        }
        else if (obj.remove !== false) {
            selection.truncate();
        }
    },
    _copyFromEditable(name, instance, selection) {
        let type = instance.getType(),
            html = selection.getHtml(),
            remove = 'content';

        if (type === 'figcaption' || type === 'cell' || type === 'paragraph') {
            remove = 'content';
        }
        else if (instance.isAllSelected()) {
            html = instance.getOuterHtml();
            remove = 'instance';
        }
        else if (type === 'list') {
            var tag = instance.getTag();
            // contains li
            html = selection.getHtml();
            if (html.search(/<li/gi) !== -1) {
                // does not have li at start
                if (html.search(/^<li/g) === -1) {
                    html = '<li>' + html + '</li>';
                }

                // wrap to list
                html = '<' + tag + '>' + html + '</' + tag + '>';
            }
        }

        return { html: html, remove: remove, instance: instance };
    },
    _copyFromNonEditable(name, instance) {
        let html = instance.getOuterHtml(),
            remove = false;

        // remove block
        if (name === 'cut') {
            remove = 'instance';
        }

        return { html: html, remove: remove, instance: instance };
    },

    // local images
    _findLocalImages(html) {
        let images = [],
            utils = this.app.create('utils');

        utils.wrap(html, function($w) {
            $w.find('img').each(function($node) {
                if ($node.attr('src').search(/^file:\/\//) !== -1) {
                    images.push($node.attr('src'));
                }
            });
        });

        return images;
    },
    _extractImagesFromRtf(rtf) {
        if (!rtf) return [];

        let reHeader = /{\\pict[\s\S]+?\\bliptag-?\d+(\\blipupi-?\d+)?({\\\*\\blipuid\s?[\da-fA-F]+)?[\s}]*?/,
            reImage = new RegExp('(?:(' + reHeader.source + '))([\\da-fA-F\\s]+)\\}', 'g'),
            images = rtf.match(reImage),
            res = [],
            i = 0,
            type;

        if (!images) return [];


        for (i; i < images.length; i++) {
            type = false;

            if (images[i].indexOf('\\pngblip') !== -1) {
                type = 'image/png';
            }
            else if (images[i].indexOf('\\jpegblip') !== -1) {
                type = 'image/jpeg';
            }

            if (type) {
                res.push({
                    hex: images[i].replace(reHeader, '').replace(/[^\da-fA-F]/g, ''),
                    type: type
                });
            }
        }

        return res;
    },
    _convertHexToBase64(str) {
        return btoa(str.match(/\w{2}/g).map(function(char) {
            return String.fromCharCode(parseInt(char, 16));
        }).join(''));
    },
    _replaceLocalImages(html, images, sources) {
        if (images.length === sources.length) {
            let i = 0,
                src;
            for (i; i < images.length; i++) {
                src = 'data:' + sources[i].type + ';base64,' + this._convertHexToBase64(sources[i].hex);
                html = html.replace(new RegExp('src="' + images[i] + '"', 'g'), 'src="' + src + '"');
            }
        }

        return html;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'cleaner', {
    init() {
        this.stored = {};
        this.storedIndex = 0;
        this.storedComments = [];
        this._selectors = {
            code: ['pre', 'code'],
            embed: ['figure'],
            noneditable: ['[' + this.opts.get('dataBlock') + '=noneditable]'],
            noparse: ['[data-noparse]'],
            images: ['img'],
            svg: ['svg'],
            links: ['a'],
            lists: ['ul', 'ol']
        };
    },
    // clean
    clean(html) {

        html = this.app.broadcastHtml('editor.before.clean', html);

        // local
        let stored = {},
            storedIndex = 0,
            restored = {},
            isPages = this._isPages(html),
            isMsWord = this._isHtmlMsWord(html),
            isEditor = this._isEditor(html),
            pasteTags = this.opts.get('paste.blockTags'),
            inlineTags = this.opts.get('paste.inlineTags'),
            formTags = this.opts.get('paste.formTags'),
            deniedTags = this.opts.get('tags.denied'),
            exceptedTags = pasteTags.concat(inlineTags).concat(formTags);

        // store
        html = this.store(html, 'embed', stored, storedIndex);
        html = this.store(html, 'svg', stored, storedIndex);

        // remove doctype tag
        html = this.removeDoctype(html);

        // remove denied tags
        html = this.removeTags(html, deniedTags);
        html = html.trim();

        // remove comments
        html = this.removeComments(html);

        // remove style & script tag
        html = this.removeTagsWithContent(html, ['script', 'style']);

        // clean pages
        html = (isPages) ? this._cleanPages(html) : html;

        // clean gdocs
        html = (isMsWord) ? html : this._cleanGDocs(html);

        // encode php code
        html = this.encodePhp(html);

        // remove tags
        if (isEditor) {
            exceptedTags = exceptedTags.concat(['div']);
        }

        html = this.removeTagsExcept(html, exceptedTags);

        // clean ms word
        html = (isMsWord) ? this._cleanMsWord(html) : html;

        // classes & attrs
        restored = this._removeClassesAttrs(html, stored, isEditor);
        html = restored.html;

        // restore
        if (!restored.flag) {
            html = this.restore(html, 'embed', stored);
        }
        html = this.restore(html, 'svg', stored);

        // work with style
        if (isEditor) {
            // cache styles for block and inline tags and img
            html = this.cacheStyle(html);
        }
        else {
            // remove style
            html = this.removeStyleAttr(html);
        }

        // remove empty inline
        html = this.removeEmptyInlines(html);

        // clean empty
        html = html.replace(/<figure[^>]*><\/figure>/gi, '');
        html = html.replace(/<p>&nbsp;<\/p>/gi, '<p></p>');
        html = html.replace(/<p><br\s?\/?><\/p>/gi, '<p></p>');

        // gmail list paste
        html = html.replace(/^<li/gi, '<ul><li');
        html = html.replace(/<\/li>$/gi, '</li></ul>');

        if (isMsWord || isPages) {
            html = html.replace(/<p><\/p>/gi, '');
            html = html.replace(/<p>\s<\/p>/gi, '');
        }

        html = this._tidyCleanUp(html);

        // broadcast
        return this.app.broadcastHtml('editor.clean', html);
    },
    _tidyCleanUp(html) {
        let utils = this.app.create('utils');

        return utils.wrap(html, function($w) {
            // clean apple space
            $w.find('.Apple-converted-space').unwrap();

            // tidy lists
            // place ul/ol into li
            $w.find('ul, ol').each(this._placeListToItem.bind(this));

            // remove p in li
            $w.find('li p').unwrap();

        }.bind(this));
    },
    _removeClassesAttrs(html, stored, isEditor) {
        let restored = false,
            utils = this.app.create('utils'),
            keepClass = this.opts.get('paste.keepClass'),
            keepAttrs = this.opts.get('paste.keepAttrs'),
            filterClass = (keepClass.length !== 0) ? keepClass.join(',') : '',
            filterAttrs = (keepAttrs.length !== 0) ? keepAttrs.join(',') : '',
            $elms,
            node,
            attrs,
            i,
            name;

        // paste event clean embed figure/frame
        if (!isEditor && this.app.event.isPasteEvent()) {
            html = this.restore(html, 'embed', stored);
            restored = true;
        }

        // remove class && attrs if the pasting is not from the editor
        if (!isEditor) {
            html = utils.wrap(html, function($w) {
                $elms = $w.find('*');
                $elms.not(filterClass).removeAttr('class');
                $elms.not(filterAttrs).each(function($node) {
                    node = $node.get();
                    attrs = node.attributes;

                    for (i = attrs.length - 1; i >= 0; i--) {
                        name = attrs[i].name;

                        if (name === 'class' || name === 'dir' || name.search(/^data-/) !== -1) continue;
                        if (node.tagName === 'IMG' && (name === 'src' || name === 'alt')) continue;
                        if (node.tagName === 'A' && (name === 'href' || name === 'target')) continue;

                        node.removeAttribute(name);
                    }
                });
            });
        }

        return { html: html, flag: restored };
    },
    _isEditor(html) {
        return html.match(new RegExp('meta\\stype="rx-editor"', 'i'));
    },
    _isHtmlMsWord(html) {
        return html.match(/class="?Mso|style="[^"]*\bmso-|style='[^'']*\bmso-|w:WordDocument/i);
    },
    _isPages(html) {
        return html.match(/name="Generator"\scontent="Cocoa\sHTML\sWriter"/i);
    },
    _cleanPages(html) {
        html = html.replace(/\sclass="s[0-9]"/gi, '');
        html = html.replace(/\sclass="p[0-9]"/gi, '');

        return html;
    },
    _cleanGDocs(html) {
        if (html.search(/docs-internal-guid/i) !== -1) {
            let utils = this.app.create('utils');

            html = utils.wrap(html, function($w) {
                var $elms = $w.find('h1, h2, h3, h4, h5, h6');
                $elms.each(function($node) {
                    $node.find('span').unwrap();
                });
            });
            html = html.replace(/ dir="[^>]*"/gi, '');
        }

        html = html.replace(/<b\sid="internal-source-marker(.*?)">([\w\W]*?)<\/b>/gi, "$2");
        html = html.replace(/<b(.*?)id="docs-internal-guid(.*?)">([\w\W]*?)<\/b>/gi, "$3");
        html = html.replace(/<span[^>]*(font-style:\s?italic;\s?font-weight:\s?(bold|600|700)|font-weight:\s?(bold|600|700);\s?font-style:\s?italic)[^>]*>([\w\W]*?)<\/span>/gi, '<b><i>$4</i></b>');
        html = html.replace(/<span[^>]*font-style:\s?italic[^>]*>([\w\W]*?)<\/span>/gi, '<i>$1</i>');
        html = html.replace(/<span[^>]*font-weight:\s?(bold|600|700)[^>]*>([\w\W]*?)<\/span>/gi, '<b>$2</b>');

        return html;
    },
    _cleanMsWord(html) {
        let utils = this.app.create('utils');

        // comments
        html = html.replace(/<!--[\s\S]+?-->/gi, '');
        html = html.trim();
        html = html.replace(/<(!|script[^>]*>.*?<\/script(?=[>\s])|\/?(\?xml(:\w+)?|meta|link|style|\w:\w+)(?=[\s/>]))[^>]*>/gi, '');
        html = html.replace(/<(\/?)s>/gi, "<$1strike>");
        html = html.replace(/&nbsp;/gi, ' ');
        html = html.replace(/<span\s+style\s*=\s*"\s*mso-spacerun\s*:\s*yes\s*;?\s*"\s*>([\s\u00a0]*)<\/span>/gi, function(str, spaces) {
            return (spaces.length > 0) ? spaces.replace(/./, " ").slice(Math.floor(spaces.length/2)).split("").join("\u00a0") : '';
        });

        html = utils.wrap(html, function($w) {
            // build lists
            $w.find('p').each(function($node) {
                let matches = /mso-list:\w+ \w+([0-9]+)/.exec($node.attr('style'));
                if (matches) {
                    $node.attr('data-listLevel',  parseInt(matches[1], 10));
                }
            });

            // parse Lists
            this._parseWordLists($w);

            $w.find('[align]').removeAttr('align');
            $w.find('[name]').removeAttr('name');
            $w.find('span').each(function($node) {
                let str = $node.attr('style'),
                    matches = /mso-list:Ignore/.exec(str);

                if (matches) $node.remove();
                else $node.unwrap();
            });
            $w.find('[style]').removeAttr('style');
            $w.find("[class^='Mso']").removeAttr('class');
            $w.find('a').filter(function($node) { return !$node.attr('href'); }).unwrap();

        }.bind(this));

        html = html.replace(/<p><img(.*?)>/gi, "<p><img$1></p><p>");
        html = html.replace(/<p[^>]*><\/p>/gi, '');
        html = html.replace(/<li>·/gi, '<li>');
        html = html.trim();

        // remove spaces between
        html = html.replace(/\/(p|ul|ol|h1|h2|h3|h4|h5|h6|blockquote)>\s+<(p|ul|ol|h1|h2|h3|h4|h5|h6|blockquote)/gi, '/$1>\n<$2');

        let result = '',
            lines = html.split(/\n/),
            max = lines.length,
            i = 0,
            space;

        for (i; i < max; i++) {
            space = (lines[i] !== '' && lines[i].search(/>$/) === -1) ? ' ' : '\n';
            result += lines[i] + space;
        }

        //result = result.replace(/<p>\s?<\/p>/gi, '');
        result = result.trim();

        return result;
    },
    _parseWordLists($w) {
        let lastLevel = 0,
            $item = null,
            $list = null,
           $listChild = null;

        $w.find('p').each(function($node) {
            let level = $node.attr('data-listLevel');
            if (level === null && $node.hasClass('MsoListParagraphCxSpMiddle')) {
                level = 1;
            }

            if (level !== null) {
                let txt = $node.text(),
                    listTag = (/^\s*\w+\./.test(txt)) ? '<ol></ol>' : '<ul></ul>';

                // new parent list
                if ($node.hasClass('MsoListParagraphCxSpFirst') || $node.hasClass('MsoNormal')) {
                    $list = this.dom(listTag);
                    $node.before($list);
                }
                // new child list
                else if (level > lastLevel && lastLevel !== 0) {
                    $listChild = this.dom(listTag);
                    $item.append($listChild);
                    $list = $listChild;
                }
                // level up
                if (level < lastLevel) {
                    let len = lastLevel - level + 1,
                        i = 0;

                    for (i; i < len; i++) {
                        $list = $list.parent();
                    }
                }

                // create item
                $node.find('span').first().unwrap();
                $item = this.dom('<li>' + $node.html().trim() + '</li>');
                if ($list === null) {
                    $node.before(listTag);
                    $list = $node.prev();
                }

                // append
                $list.append($item);
                $node.remove();

                lastLevel = level;
            }
            else {
                $list = null;
                lastLevel = 0;
            }
        }.bind(this));
    },
    _placeListToItem($node) {
        let node = $node.get(),
            prev = node.previousSibling,
            $li;

        if (prev && prev.tagName === 'LI') {
            $li = this.dom(prev);
            $li.find('p').unwrap();
            $li.append(node);
        }
    },

    // escape
    escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    },

    // remove
    removeDoctype(html) {
        return html.replace(new RegExp("<!doctype[^>]*>", 'gi'), '');
    },
    removeComments(html) {
        return html.replace(/<!--[\s\S]*?-->\n?/g, '');
    },
    removeInvisibleChars(str) {
        return str.replace(/\uFEFF/g, '');
    },
    removeMarkers(html) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('.rx-plus-button').remove();
            $w.find('.rx-pastemarker').removeClass('rx-pastemarker');
            $w.find('.rx-pasteitems').removeClass('rx-pasteitems');
            $w.find('.rx-selection-marker').remove();
        }.bind(this));
    },
    removeEmptySpans(html) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('span').each(this.removeEmptySpan.bind(this));
        }.bind(this));
    },
    removeEmptyInlines(html) {
        let utils = this.app.create('utils'),
            tags = this.opts.get('tags');

        return utils.wrap(html, function($w) {
            $w.find(tags.inline.join(',')).each(this.removeEmptyTag.bind(this));
        }.bind(this));
    },
    removeEmptyAttrs(html, attrs) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            for (var i = 0; i < attrs.length; i++) {
                $w.find('[' + attrs[i] + '=""]').removeAttr(attrs[i]);
            }
        });
    },
    removeEmptyTag($node) {
        let html = $node.html().trim();
        if ($node.get().attributes.length === 0 && html === '') {
            $node.unwrap();
        }
    },
    removeEmptySpan($node) {
        if ($node.get().attributes.length === 0) {
            $node.unwrap();
        }
    },
    removeTags(input, denied) {
        let re = (denied) ? /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi : /(<([^>]+)>)/gi;
        let replacer = (!denied) ? '' : function ($0, $1) {
            return denied.indexOf($1.toLowerCase()) === -1 ? $0 : '';
        };

        return input.replace(re, replacer);
    },
    removeTagsWithContent(html, tags) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find(tags.join(',')).remove();
        });
    },
    removeTagsExcept(input, except) {
        let tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

        if (except === undefined) {
            return input.replace(/(<([^>]+)>)/gi, '');
        }

        return input.replace(tags, function($0, $1) {
            return except.indexOf($1.toLowerCase()) === -1 ? '' : $0;
        });
    },
    removeBlockTags(html, tags, except) {
        let opt = this.opts.get('tags'),
            utils = this.app.create('utils'),
            blocks = [...opt.block];

        // except
        if (except) {
            blocks = utils.removeFromArrayByValue(blocks, except);
        }

        // extend
        if (tags) {
            blocks = (tags) ? utils.extendArray(blocks, tags) : blocks;
        }

        return this.removeTags(html, blocks);
    },
    removeBlockTagsInside(html, tags) {
        let utils = this.app.create('utils');

        this.blockListTags = utils.removeFromArrayByValue(this.opts.get('tags.block').concat(), ['ul', 'ol', 'li']);

        return utils.wrap(html, function($w) {
            $w.find(tags.join(',')).each(this._removeBlockTagsInside.bind(this));
        }.bind(this));
    },
    _removeBlockTagsInside($node) {
        let tags = ($node.get().tagName === 'LI') ? this.blockListTags : this.opts.get('tags.block');
        $node.find(tags.join(',')).append('<br>').unwrap();
    },
    removeInlineStyles(html) {
        let utils = this.app.create('utils');

        let inlines = utils.removeFromArrayByValue(this.opts.get('tags.inline'), 'a');

        return utils.wrap(html, function($w) {
            $w.find(inlines.join(',')).removeAttr('style');
        });
    },
    removeStyleAttr(html, filter) {
        let utils = this.app.create('utils');

        filter = filter || '';

        return utils.wrap(html, function($w) {
            $w.find('*').not('[data-rx-style-cache]' + filter).removeAttr('style');
        }.bind(this));
    },
    removeBreakline(html) {
        return html.replace(/<br\s?\/?>/gi, '');
    },

    // add
    addNofollow(html) {
        if (!this.opts.is('link.nofollow')) {
            return html;
        }

        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('a').attr('rel', 'nofollow');
        });
    },
    addHttps(html) {
        if (!this.opts.is('editor.https')) {
            return html;
        }

        html = html.replace('href="http://', 'href="https://');
        html = html.replace('src="http://', 'src="https://');
        html = html.replace('srcset="http://', 'srcset="https://');

        return html;
    },
    addBrToBlocks(html) {
        return html.replace(/<\/(div|li|dt|dd|td|p|H[1-6])>\n?/gi, '</$1><br>');
    },

    // convert
    convertForms(html) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('form').each(this._convertForm.bind(this));
        }.bind(this));
    },
    convertFrames(html) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('iframe').each(this._convertFrame.bind(this));
        }.bind(this));
    },
    revertForms(html) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('.rx-div-form').each(this._revertForm.bind(this));
        }.bind(this));
    },
    revertFrames(html) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('.rx-figure-iframe').each(this._revertFrame.bind(this));
        }.bind(this));
    },
    _convertForm($node) {
        let elm = this.app.create('element');
        let $el = elm.replaceToTag($node, 'div');
        $el.addClass('rx-div-form');
    },
    _convertFrame($node) {
        if ($node.closest('figure').length === 0) {
            $node.wrap('<figure>');
            $node.parent().addClass('rx-figure-iframe');
        }
    },
    _revertForm($node) {
        let elm = this.app.create('element');
        let $el = elm.replaceToTag($node, 'form');
        $el.removeClass('rx-div-form');
    },
    _revertFrame($node) {
        if ($node.get().attributes.length === 0 && $node.find('figcaption').length === 0 && $node.find('div').length === 0) {
            $node.unwrap();
        }
        else {
            $node.removeClass('rx-figure-iframe');
        }
    },

    // encode
    encodeEntities(str) {
        return this.decodeEntities(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    encodePhp(html) {
        html = html.replace('<?php', '&lt;?php');
        html = html.replace('<?', '&lt;?');
        html = html.replace('?>', '?&gt;');

        return html;
    },
    encodeCode(html) {
        html = this.encodeAttrSings(html);

        // replace all tags
        html = html.replace(/<\s/gi, '&lt; ');
        html = html.replace(/<([^>]+)</gi, '&lt;$1<');
        html = html.replace(/<(.*?)>/gi, 'xtagstartz$1xtagendz');

        // revert pre / code
        html = html.replace(/xtagstartzpre(.*?)xtagendz/g, '<pre$1>');
        html = html.replace(/xtagstartzcode(.*?)xtagendz/g, '<code$1>');
        html = html.replace(/xtagstartz\/codextagendz/g, '</code>');
        html = html.replace(/xtagstartz\/prextagendz/g, '</pre>');

        // encode
        html = this._encodeCode(html);

        // revert all tags
        html = html.replace(/xtagstartz([\w\W]*?)xtagendz/g, '<$1>');
        html = html.replace(/xtagstartz\/(.*?)xtagendz/g, '</$1>');

        html = this.decodeAttrSings(html);

        return html;
    },
    encodeAttrSings(html) {
        let matches = html.match(/="(.*?)"/g),
            i = 0,
            max,
            str;

        if (matches !== null) {
            for (i = 0, max = matches.length; i < max; i++) {
                if (matches[i].search(/^"</) !== -1 || matches[i].search(/>"$/) !== -1) {
                    continue;
                }

                str = matches[i].replace('>', 'xmoresignz');
                str = str.replace('<', 'xlesssignz');
                html = html.replace(matches[i], str);
            }
        }

        return html;
    },
    decodeAttrSings(html) {
        html = html.replace(/xmoresignz/gi, '>');
        html = html.replace(/xlesssignz/gi, '<');

        return html;
    },
    decodeEntities(str) {
        return String(str).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    },
    decodeHref(html) {
        let pattern = "(href=\".*?)(&amp;)(.*?\">)",
            matches = html.match(new RegExp(pattern, 'g')),
            i = 0,
            max;

        if (matches !== null) {
            for (i = 0, max = matches.length; i < max; i++) {
                html = html.replace(matches[i], matches[i].replace(/&amp;/g, '&'));
            }
        }

        return html;
    },
    _encodeCode(html) {
        let utils = this.app.create('utils');

        return utils.wrap(html, function($w) {
            $w.find('pre code, pre, code').each(this._encodeNode.bind(this));
        }.bind(this));
    },
    _encodeNode($node) {
        let node = $node.get(),
            first = node.firstChild,
            html = node.innerHTML,
            encoded;

        if (node.tagName === 'PRE' && first && first.tagName === 'CODE') {
            return;
        }

        html = html.replace(/xtagstartz/g, '<');
        html = html.replace(/xtagendz/g, '>');

        encoded = this.decodeEntities(html);
        node.textContent = this._encodeNodeHtml(encoded);
    },
    _encodeNodeHtml(html) {
        let spaces = this.opts.get('pre.spaces');

        html = html.replace(/&nbsp;/g, ' ').replace(/<br\s?\/?>/g, '\n');
        html = (spaces) ? html.replace(/\t/g, new Array(spaces + 1).join(' ')) : html;

        return html;
    },

    // keeper
    store(html, name) {
        let selectors = this._selectors[name],
            i = 0,
            max,
            matched;

        for (i = 0, max = selectors.length; i < max; i++) {
            matched = this._getElementsFromHtml(html, selectors[i]);
            html = this._store(html, name, matched);
        }

        return html;
    },
    storeComments(html) {
        let comments = html.match(new RegExp('<!--([\\w\\W]*?)-->', 'gi'));
        if (comments === null) return html;

        for (let i = 0; i < comments.length; i++) {
            html = html.replace(comments[i], '#####xstarthtmlcommentzz' + i + 'xendhtmlcommentzz#####');
            this.storedComments.push(comments[i]);
        }

        return html;
    },
    storeTemplateSyntax(html, delims) {
        let key, name;
        for (let [key, item] of Object.entries(delims)) {
            name = 'ts__' + key;
            html = html.replace(new RegExp(item[0] + '(.*?)' + item[1], 'gi'), '<!--' + name + '$1' + name + '-->');
        }

        return html;
    },
    restore(html, name) {
        let i = 0,
            max;

        if (typeof this.stored[name] === 'undefined') {
            return html;
        }

        for (i = 0, max = this.stored[name].length; i < max; i++) {
            html = html.replace('####_' + name + i + '_####', this.stored[name][i]);
        }

        return html;
    },
    restoreComments(html) {
        let str;
        for (let i = 0; i < this.storedComments.length; i++) {
            str = this.storedComments[i].replace(/\$/gi, '&#36;');
            html = html.replace('#####xstarthtmlcommentzz' + i + 'xendhtmlcommentzz#####', str);
        }

        return html;
    },
    restoreTemplateSyntax(html, delims) {
        let key, name, utils = this.app.create('utils');
        for (let [key, item] of Object.entries(delims)) {
            name = 'ts__' + key;
            html = html.replace(new RegExp('<!--' + name + '(.*?)' + name + '-->', 'gi'), utils.escapeBackslash(item[0]) + '$1' + utils.escapeBackslash(item[1]));
        }

        // handlebars partials
        html = html.replace(/\{\{&gt;/gi, '{{>');

        return html;
    },
    cacheStyle(html) {
        let utils = this.app.create('utils');
        let tags = this.opts.get('tags');
        let selector = tags.block.join(',') + ',img,' + tags.inline.join(',');

        return utils.wrap(html, function($w) {
            $w.find(selector).each(this.cacheElementStyle.bind(this));
        }.bind(this));
    },
    cacheElementStyle($el) {
        let name = 'data-rx-style-cache',
            style = $el.attr('style');

        if (style) {
            style = style.replace(/"/g, '');
            $el.attr(name, style);
        }
        else if (!style || style === '') {
            $el.removeAttr(name);
        }
    },
    recacheStyle(html) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('[data-rx-style-cache]').each(this.recacheElementStyle.bind(this));
        }.bind(this));
    },
    recacheElementStyle($el) {
        let name = 'data-rx-style-cache',
            style = $el.attr(name);

        $el.attr('style', style).removeAttr(name);
    },
    _store(html, name, matched) {
        let i = 0,
            max;

        if (!matched) {
            return html;
        }
        if (typeof this.stored[name] === 'undefined') {
            this.stored[name] = [];
        }

        for (i = 0, max = matched.length; i < max; i++) {
            this.stored[name][this.storedIndex] = matched[i];
            html = html.replace(matched[i], '####_' + name + this.storedIndex + '_####');
            this.storedIndex++;
        }

        return html;
    },
    _getElementsFromHtml(html, selector) {
        let matched = [],
            $div = this.dom('<div>').html(html);

        $div.find(selector).each(function($node) {
            matched.push($node.get().outerHTML);
        });

        return matched;
    },

    // sanitizer
    sanitize(html) {
        let utils = this.app.create('utils');
        html = utils.wrap(html, function($w) {
            $w.find('[src]').each(this._sanitizeSrc);
            $w.find('a').each(this._sanitizeHref);
            $w.find('a,b,i,strong,em,svg,img,details,audio').each(this._sanitizeEvents);
        }.bind(this));

        return html;
    },
    _sanitizeSrc($node) {
        let node = $node.get(),
            src = node.getAttribute('src');

        if (src.search(/^javascript:/i) !== -1 || (node.tagName !== 'IMG' && src.search(/^data:/i) !== -1)) {
            node.setAttribute('src', '');
        }
    },
    _sanitizeHref($node) {
        let node = $node.get(),
            str = node.getAttribute('href');

        if (str && str.search(/^javascript:/i) !== -1) {
            node.setAttribute('href', '');
        }
    },
    _sanitizeEvents($node) {
        $node.removeAttr('onload onerror ontoggle onwheel onmouseover oncopy');
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'button', {
    init(name, obj, $container, type) {
        this.$container = $container;
        this.name = name;
        this.obj = obj || {};
        this.type = type;
        this.activeClass = 'active';
        this.disableClass = 'disable';
        this.toggledClass = 'toggled';

        // observe
        let res = this._observe(obj);
        if (typeof res === 'undefined' || res === false) {
            return;
        }
        else {
            this.obj = res;
        }

        // is allowed
        if (!this._check()) {
            return;
        }

        // build
        this._build();
    },
    observe() {
        if (this.has('observer')) {
            let obj = this.app.api(this.obj.observer, this.obj, this.name, this.type);
            if (obj) {
                this._renderTitle(this.obj.title);
                this._renderClassname(this.obj.classname);
                this._renderCommand(this.obj.command);
                this._renderIcon(this.obj.icon);
            }
        }
    },
    isButton() {
        return true;
    },
    getType() {
        return this.type;
    },
    getContainer() {
        return this.$container;
    },
    getName() {
        return this.name;
    },
    getTitle() {
        return this.title;
    },
    getTemplate() {
        return (this.has('template')) ? this.obj.template : false;
    },
    getObj(name) {
        return (name) ? this.obj[name] : this.obj;
    },
    getParams() {
        return (this.has('params')) ? this.obj.params : false;
    },
    getOffset() {
        return this.$button.offset();
    },
    getRect() {
        let offset = this.$button.offset(),
            width = this.$button.width(),
            height = this.$button.height(),
            top = Math.round(offset.top),
            left = Math.round(offset.left);

        return {
            top: top,
            left: left,
            bottom: top + height,
            right: left + width,
            width: width,
            height: height
        };
    },
    getWidth() {
        return this.$button.width();
    },
    getHeight() {
        return this.$button.height();
    },
    getDimension() {
        return {
            width: this.$button.width(),
            height: this.$button.height()
        };
    },
    getToolbarType() {
        return this.toolbarType;
    },
    getElement() {
        return this.$button;
    },
    getIcon() {
        return this.$icon.html();
    },
    getCommand() {
        return this.$button.attr('data-command');
    },
    setTitle(title) {
        title = this.lang.parse(title);

        this.$title.html(title);
        this.$button.attr({
            'aria-label': title,
            'data-tooltip': title
        });
    },
    setIcon(icon) {
        if (icon.startsWith('<')) {
            this.$icon.html(icon);
        }
        else {
            let buttons = this.opts.get('buttonsObj'),
                btn = buttons[icon];

            if (btn) {
                let icon = this._getIcon(btn.icon);
                this.$icon.html(btn.icon);
            }
        }
    },
    setCommand(command) {
        this._renderCommand(command);
    },
    setColor(color) {
        this.$icon.find('svg path').attr('fill', color);
    },
    setBackground(color) {
        let utils = this.app.create('utils'),
            fill = utils.getInvertedColor(color);

        this.$button.addClass('rx-button-icon-color');
        this.$icon.css({ 'background-color': color });
        this.$icon.find('svg path').attr('fill', fill);
    },
    resetColor(color) {
        this.$icon.find('svg path').removeAttr('fill');
    },
    resetBackground() {
        this.$button.removeClass('rx-button-icon-color');
        this.$icon.css({ 'background-color': '' });
        this.$icon.find('svg path').removeAttr('fill');
    },
    setToggled() {
        this.$button.removeClass(this.disableClass).addClass(this.toggledClass);
    },
    setActive() {
        this.$button.removeClass(this.disableClass).addClass(this.activeClass);
    },
    unsetToggled() {
        this.$button.removeClass(this.toggledClass);
    },
    unsetActive() {
        this.$button.removeClass(this.activeClass);
    },
    disable() {
        this.$button.removeClass(this.toggledClass).removeClass(this.activeClass).addClass(this.disableClass);
    },
    enable() {
        this.$button.removeClass(this.disableClass);
    },
    has(name) {
        return Object.hasOwn(this.obj, name);
    },
    trigger(e) {
        e.preventDefault();
        e.stopPropagation();

        // editor focus
        this.app.editor.setFocus();

        if (this.$button.hasClass('rx-in-dropdown')) {
            this._catchDropdownClose(e);
        }
        else {
            this._catchCommand(e, this.$button);
        }
    },

    // private
    _check() {
        let instance = this.app.block.get();
        if (instance && !instance.isAllowedButton(this.name, this.obj)) {
            return false;
        }

        return true;
    },
    _build() {
        this._buildToolbarType();

        if (this.has('html')) {
            this._buildHtml();
        }
        else {
            this._buildButton();
        }

        this._buildIcon();
        this._buildTitle();
        this._buildData();
        this._buildTooltip();
        this._buildPosition();
        this._buildActive();
    },
    _buildToolbarType() {
        if (this.type === 'toolbar' || this.type === 'extrabar') {
            this.toolbarType = 'toolbar';
        }
        else if (this.type === 'dropdown') {
            this.toolbarType = false;
        }
        else {
            this.toolbarType = this.type;
        }
    },
    _buildTitle() {
        this._renderTitle(this.obj.title);
        this.$button.append(this.$title);
    },
    _buildTooltip() {
        if (this.has('tooltip') && !this.obj.tooltip || this.has('text')) return;
        if (this.type !== 'control' && this.type !== 'dropdown') {
            this.tooltip = this.app.create('tooltip', this.$button, this.title);
        }
    },
    _buildData() {
        // data
        this.$button.attr({
            'data-name': this.name,
            'data-toolbar': this.toolbarType,
        });

        // command
        this._renderCommand(this.obj.command);
    },
    _buildHtml() {
        this.title = this.name;

        this.$button = this.dom('<div>');
        this.$button.html(this.obj.html);

        // classname
        this._renderClassname(this.obj.classname);
    },
    _buildButton() {
        let attrs = {
            'href': '#',
            'role': 'button',
            'tabindex': -1
        };

        this.$button = this.dom('<a>');
        this.$button.attr(attrs);
        this.$button.addClass('rx-button');
        this.$button.dataset('instance', this);

        // text
        if (this.has('text')) {
            this.$button.addClass('rx-button-text');
        }

        // danger
        if (this.has('danger')) {
            this.$button.addClass('rx-button-danger');
        }

        // type
        if (this.type) {
            this.$button.addClass('rx-button-' + this.type);
        }

        // classname
        this._renderClassname(this.obj.classname);
    },
    _buildIcon() {
        let icon = (this.has('icon')) ? this._getIcon(this.obj.icon) : '';
        if (!icon) icon = '';

        this.$icon = this.dom('<span>');
        this.$icon.addClass('rx-button-icon');
        this.$icon.html(icon);

        this.$button.append(this.$icon);
    },
    _buildPosition() {
        if (!this.$container) return;

        if (!this.has('position')) {
            this.$container.append(this.$button);
            return;
        }

        // position
        let pos = this.obj.position,
            type = Object.hasOwn(pos, 'after') ? 'after' : 'before',
            first = Object.hasOwn(pos, 'first'),
            name = pos[type],
            $el;

        if (pos === 'first') {
            this.$container.prepend(this.$button);
        }
        else if (pos === 'last') {
            this.$container.append(this.$button);
        }
        else if (typeof pos === 'object') {
            $el = this._findPosition(name);

            if ($el) {
                $el[type](this.$button);
            }
            else {
                if (first) {
                    this.$container.prepend(this.$button);
                }
                else {
                    this.$container.append(this.$button);
                }
            }
        }
    },
    _buildActive() {
        if (!this.has('active')) return;
        if (this.obj.active) {
            this.$button.addClass(this.activeClass);
        }
    },
    _findPosition(name) {
        let $el = false,
            i = 0;

        if (Array.isArray(name)) {
            for (i; i < name.length; i++) {
                $el = this.$container.find('[data-name=' + name[i] + ']');
                if ($el.length !== 0) break;
            }
        }
        else {
            $el = this.$container.find('[data-name=' + name + ']');
        }

        return ($el && $el.length !== 0) ? $el : false;
    },
    _getIcon(icon) {
        if (this.opts.is('buttons.icons') && this.opts.is('buttons.icons.' + this.name)) {
            icon = this.opts.get('buttons.icons.' + this.name);
        }

        return icon;
    },
    _stop(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    _observe(obj) {
        if (this.has('observer')) {
            obj = this.app.api(obj.observer, obj, this.name, this.type);
        }

        return obj;
    },
    _catch(e) {
        e.preventDefault();
        e.stopPropagation();

        let $btn = this.dom(e.target).closest('.rx-button');
        if ($btn.hasClass('disable')) return;

        // editor focus
        this.app.editor.setFocus();

        if ($btn.hasClass('rx-in-dropdown')) {
            this._catchDropdownClose(e);
        }
        else {
            this._catchCommand(e, $btn);
        }
    },
    _catchDropdownClose(e) {
        this.app.dropdown.close();
        this.app.tooltip.close();
    },
    _catchCommand(e, $btn) {
        // popup button
        if (this.toolbarType) {
            this.app.button.set(this, this.toolbarType);
        }

        let command = $btn.attr('data-command'),
            name = $btn.attr('data-name'),
            instance = $btn.dataget('instance');

        // command
        this.app.api(command, this.getParams(), instance, name, e);
        this.app.tooltip.close();
    },
    _renderTitle(title) {
        this.title = (typeof title !== 'undefined') ? this.lang.parse(title) : '';

        this.$title = this.dom('<span>').addClass('rx-button-title');
        this.$title.html(this.title);

        this.$button.attr({
            'data-tooltip': this.title,
            'aria-label': this.title
        });
    },
    _renderClassname(classname) {
        if (classname) {
            this.$button.addClass(classname);
        }
    },
    _renderCommand(command) {
        this.$button.attr('data-command', command || false);

        // func
        let func = (command) ? '_catch' : '_stop';

        // events
        this.$button.off('.rx-button');
        this.$button.on('click.rx-button', this[func].bind(this));
        this.$button.on('dragstart.rx-button', function(e) { e.preventDefault(); return; });
    },
    _renderIcon(icon) {
        if (!icon) return;

        icon = this._getIcon(icon);
        if (!icon || icon === '') return;

        this.$icon.html(icon);
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'predefined', {
    parse($el) {
        let types,
            datatype,
            selector,
            classes = this.opts.get('classes');

        if (!classes) {
            return;
        }

        // element
        $el = $el || this.app.getEditor();

        if (typeof classes.tags !== 'undefined') {
            $el.find(this._getElements('tags').join(',')).each(this._addTagClass.bind(this));
        }

        if (typeof classes.blocks !== 'undefined') {
            types = this._getElements('blocks');
            datatype = 'data-rx-type';
            selector = '[' + datatype + '=' + types.join('],[' + datatype + '=') + ']';
            $el.find(selector).each(this._addBlockClass.bind(this));
        }
    },

    // private
    _addTagClass($node) {
        let tag = $node.get().tagName.toLowerCase(),
            classes = this.opts.get('classes.tags');

        if (typeof classes[tag] !== 'undefined') {
            $node.addClass(classes[tag]);
        }
    },
    _addBlockClass($node) {
        let type = $node.attr('data-rx-type'),
            classes = this.opts.get('classes.blocks');

        if (typeof classes[type] !== 'undefined') {
            $node.addClass(classes[type]);
        }
    },
    _getElements(type) {
        let arr = [],
            classes = this.opts.get('classes.' + type);

        Object.keys(classes).forEach(function(key) {
            arr.push(key);
        });

        return arr;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'tidy', {
    parse(code, type) {
        let cleaner = this.app.create('cleaner');
        code = cleaner.encodeAttrSings(code);

        // clean setup
        let ownLine = ['li'],
            contOwnLine = ['li'],
            newLevel = ['p', 'ul', 'ol', 'li', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'dl', 'dt', 'dd'],
            i = 0,
            codeLength = code.length,
            point = 0,
            start = null,
            end = null,
            tag = '',
            out = '',
            cont = '';

        if (type === 'email') {
            ownLine = [...ownLine, ...['style', 'meta']];
            newLevel = [...newLevel, ...['title', 'head', 'body']];
        }

        this.lineBefore = new RegExp('^<(/?' + ownLine.join('|/?' ) + '|' + contOwnLine.join('|') + ')[ >]');
        this.lineAfter = new RegExp('^<(/?' + ownLine.join('|/?' ) + '|/' + contOwnLine.join('|/') + ')[ >]');
        this.newLevel = new RegExp('^</?(' + newLevel.join('|' ) + ')[ >]');
        this.cleanlevel = 0;

        for (; i < codeLength; i++) {
            point = i;

            // if no more tags, copy and exit
            if (-1 === code.substr(i).indexOf('<')) {
                out += code.substr(i);

                return this.finish(out);
            }

            // copy verbatim until a tag
            while (point < codeLength && code.charAt(point) !== '<') {
                point++;
            }

            if (i !== point) {
                cont = code.substr(i, point - i);
                if (!cont.match(/^\s{2,}$/g)) {
                    if ('\n' === out.charAt(out.length - 1)) out += this.getTabs();
                    else if ('\n' === cont.charAt(0)) {
                        out += '\n' + this.getTabs();
                        cont = cont.replace(/^\s+/, '');
                    }

                    out += cont;
                }

                //if (cont.match(/\n/)) out += '\n' + this.getTabs();
            }

            start = point;

            // find the end of the tag
            while (point < codeLength && '>' !== code.charAt(point)) {
                point++;
            }

            tag = code.substr(start, point - start);
            i = point;

            var t;

            if ('!--' === tag.substr(1, 3)) {
                if (!tag.match(/--$/)) {
                    while ('-->' !== code.substr(point, 3)) {
                        point++;
                    }
                    point += 2;
                    tag = code.substr(start, point - start);
                    i = point;
                }

                if ('\n' !== out.charAt(out.length - 1)) out += '\n';

                out += this.getTabs();
                out += tag + '>\n';
            }
            else if ('!' === tag[1]) {
                out = this.placeTag(tag + '>', out);
            }
            else if ('?' === tag[1]) {
                out += tag + '>\n';
            }
            else if (t === tag.match(/^<(script|style|pre)/i)) {
                t[1] = t[1].toLowerCase();
                tag = this.cleanTag(tag);
                out = this.placeTag(tag, out);
                end = String(code.substr(i + 1)).toLowerCase().indexOf('</' + t[1]);

                if (end) {
                    cont = code.substr(i + 1, end);
                    i += end;
                    out += cont;
                }
            }
            else {
                tag = this.cleanTag(tag);
                out = this.placeTag(tag, out);
            }
        }

        return this.finish(out);
    },
    getTabs() {
        let s = '',
            i = 0;

        for (i; i < this.cleanlevel; i++ ) {
            s += '    ';
        }

        return s;
    },
    finish(code) {
        let cleaner = this.app.create('cleaner');

        code = code.replace(/\n\s*\n/g, '\n');
        code = code.replace(/^[\s\n]*/, '');
        code = code.replace(/[\s\n]*$/, '');
        code = code.replace(/<li(.*?)>[\s\n]*/gi, '<li$1>');
        code = code.replace(/<(p|h1|h2|h3|h4|h5|h6|li|td|th)(.*?)>[\s\n]*<\/\1>/gi, '<$1$2></$1>');
        code = code.replace(/[\s\n]*<\/li>/gi, '</li>');
        code = code.replace(/<script(.*?)>\n<\/script>/gi, '<script$1></script>');
        code = code.replace(/\n(.*?)<link(.*?)><style/gi, '\n$1<link$2>\n$1<style');
        code = code.replace(/\n\s*<pre/gi, '\n<pre');
        code = code.replace(/><link/gi, '>\n<link');
        code = code.replace(/><\/head/gi, '>\n</head');
        code = cleaner.decodeAttrSings(code);

        this.cleanlevel = 0;

        return code;
    },
    cleanTag(tag) {
        let tagout = '',
            suffix = '',
            m;

        tag = tag.replace(/\n/g, ' ');
        tag = tag.replace(/\s{2,}/g, ' ');
        tag = tag.replace(/^\s+|\s+$/g, ' ');

        if (tag.match(/\/$/)) {
            suffix = '/';
            tag = tag.replace(/\/+$/, '');
        }

        while (m = /\s*([^= ]+)(?:=((['"']).*?\3|[^ ]+))?/.exec(tag)) {
            if (m[2]) tagout += m[1].toLowerCase() + '=' + m[2];
            else if (m[1]) tagout += m[1].toLowerCase();

            tagout += ' ';
            tag = tag.substr(m[0].length);
        }

        return tagout.replace(/\s*$/, '') + suffix + '>';
    },
    placeTag(tag, out) {
        let nl = tag.match(this.newLevel);

        if (tag.match(this.lineBefore) || nl) {
            out = out.replace(/\s*$/, '');
            out += '\n';
        }

        if (nl && '/' === tag.charAt(1)) this.cleanlevel--;
        if ('\n' === out.charAt(out.length - 1)) out += this.getTabs();
        if (nl && '/' !== tag.charAt(1)) this.cleanlevel++;

        out += tag;

        if (tag.match(this.lineAfter) || tag.match(this.newLevel)) {
            out = out.replace(/ *$/, '');
            out += '\n';
        }

        return out;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'paragraphizer', {
    parse(html) {
        html = this._parse(html);
        html = this._parseTable(html);

        return html;
    },
    parseLayers(html) {
        let code, utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('[data-rx-type="wrapper"]').each(function($node) {
                code = this._parse($node.html());
                $node.html(code);
            }.bind(this));
            $w.find('[data-rx-type="column"]').each(function($node) {
                code = this._parse($node.html());
                $node.html(code);
            }.bind(this));
        }.bind(this));
    },

    // private
    _parse(html, typemarkup) {
        this.remStart = '#####replace';
        this.remEnd = '#####';
        this.tags = this._getTags();

        // build markup tag
        let breakline = this.opts.get('breakline'),
            tag = (breakline || typemarkup) ? 'sdivtag' : this.opts.get('markup'),
            attr = (typemarkup) ? 'tbr' : 'br',
            str = '',
            arr,
            i = 0,
            max,
            stored = [],
            cleaner = this.app.create('cleaner');

        // store
        html = this._storeTags(html, stored);
        html = cleaner.storeComments(html);

         // trim
        html = html.trim();
        html = this._trimLinks(html);

        // replace new lines
        html = html.replace(/xparagraphmarkerz(?:\r\n|\r|\n)$/g, '');
        html = html.replace(/xparagraphmarkerz$/g, '');
        html = html.replace(/xparagraphmarkerz(?:\r\n|\r|\n)/g, '\n');
        html = html.replace(/xparagraphmarkerz/g, '\n');

        if (breakline) {
            html = html.replace(/<br\s?\/?>(?:\r\n|\r|\n)/gi, 'xbreakmarkerz\n');
            html = html.replace(/<br\s?\/?>/gi, 'xbreakmarkerz\n');
            html = html.replace(/xbreakmarkerz\n<\//gi, 'xbreakmarkerz</');
        }
        else {
            html = html.replace(/[\n]+/g, "\n");
        }

        // wrap to tag
        str = '';
        arr = html.split("\n");
        for (i = 0, max = arr.length; i < max; i++) {
            str += '<' + tag + '>' + arr[i].trim() + '</' + tag + '>\n';
        }

        // trim new line at the end
        html = str.replace(/\n$/, '');

        // clean
        html = html.replace(new RegExp('<' + tag + '>\\s+#####', 'gi'), '#####');
        html = html.replace(new RegExp('<' + tag + '>#####', 'gi'), '#####');
        html = html.replace(new RegExp('#####</' + tag + '>', 'gi'), '#####');

        // replace marker
        html = (breakline) ? html.replace(/xbreakmarkerz/gi, "<br>") : html;

        // restore
        html = this._restoreTags(html, stored);
        html = cleaner.restoreComments(html);

        // remove empty
        if (breakline) {
            html = html.replace(new RegExp('<' + tag + '></' + tag + '>', 'gi'), '<' + tag + '><br></' + tag + '>');
        }

        // clean empty
        html = html.replace(/<(p|h1|h2|h3|h4|h5|h6|li|td|th)(.*?)>[\s\n]*<\/\1>/gi, '<$1$2></$1>');
        html = html.replace(/<p(.*?)><\/?br\s?\/?><\/p>/gi, "<p$1></p>");
        html = html.replace(/<div(.*?)><\/?br\s?\/?><\/div>/gi, "<div$1></div>");
        html = html.replace(/<\/?br\s?\/?><\/div>/gi, "</div>");
        html = html.replace(/<\/?br\s?\/?><\/li>/gi, "</li>");

        // clean restored
        html = html.replace(new RegExp('<sdivtag>', 'gi'), '<div data-rx-tag="' + attr + '">');
        html = html.replace(new RegExp('sdivtag', 'gi'), 'div');
        html = html.replace(/<\/([^>]+)><div data-rx-tag/g, '</$1>\n<div data-rx-tag');

        return html;
    },
    _parseTable(html) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('td, th').each(this._parseCell.bind(this));
        }.bind(this));
    },
    _parseCell(node) {
        let $node = this.dom(node),
            code;

        code = this._parse($node.html(), 'table');
        $node.html(code);
    },
    _getTags() {
        return ['pre', 'hr', 'ul', 'ol', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'address', 'blockquote', 'figure', 'iframe', 'form', 'dl', 'div', 'section', 'header', 'footer', 'article', 'main', 'aside',
        'form', 'audio', 'figcaption', 'object', 'style', 'script', 'iframe', 'select', 'input', 'textarea',
        'button', 'option', 'map', 'area', 'math', 'fieldset', 'legend', 'hgroup', 'nav', 'details', 'menu', 'summary'];

    },
    _storeTags(html, stored) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find(this.tags.join(', ')).each(function($node, i) {
                this._replaceTag($node, i, stored);
            }.bind(this));
        }.bind(this));
    },
    _restoreTags(html, stored) {
        for (let i = 0; i < stored.length; i++) {
            let str = stored[i].replace(/\$/gi, '&#36;');
            html = html.replace(this.remStart + i + this.remEnd, str);
        }

        return html;
    },
    _replaceTag($node, i, stored) {
        let node = $node.get(),
            replacement = document.createTextNode(this.remStart + i + this.remEnd + 'xparagraphmarkerz');

        stored.push(node.outerHTML);
        node.parentNode.replaceChild(replacement, node);
    },
    _trimLinks(html) {
        let utils = this.app.create('utils');
        return utils.wrap(html, function($w) {
            $w.find('a').each(this._trimLink.bind(this));
        }.bind(this));
    },
    _trimLink($node) {
        $node.html($node.html().trim());
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'tooltip', {
    init($button, title) {
        this.eventname = 'rx-button-' + this.uuid;
        this._build($button, title);
    },

    // private
    _build($btn, title) {
        title = this._cleanTitle(title);
        if (title) {
            $btn.on('mouseover.' + this.eventname, this._open.bind(this));
            $btn.on('mouseout.' + this.eventname, this._close.bind(this));
        }
    },
    _close() {
        if (this.$tooltip) {
            this.$tooltip.remove();
        }
    },
    _open(e) {
        let $btn = this._getButton(e);
        if (this.app.dropdown.isOpen() && this.app.button.getType() === 'toolbar') {
            return;
        }
        if (this.app.modal.isOpen() || $btn.hasClass('disable')) {
            return;
        }

        // create
        this.$tooltip = this._create($btn);

        // append
        this.app.$body.append(this.$tooltip);

        // position
        this._setPosition($btn);
    },
    _create($btn) {
        return this.dom('<span>').addClass('rx-tooltip').html($btn.attr('data-tooltip'));
    },
    _cleanTitle(title) {
        return (title) ? title.replace(/(<([^>]+)>)/gi, '') : false;
    },
    _setPosition($btn) {
        let type = $btn.attr('data-toolbar'),
            offset = $btn.offset(),
            height = $btn.height(),
            width = $btn.width(),
            tooltipWidth = this.$tooltip.width(),
            tooltipHeight = this.$tooltip.height(),
            rect = this.app.editor.getRect(),
            top = (offset.top + height),
            left,
            posTop = this.app.dropdown.isPositionTop();

        // right edge
        if (rect.right < (offset.left + tooltipWidth)) {
            left = (offset.left + width - tooltipWidth);
        }
        else {
            left = (offset.left);
        }

        // context
        if (type === 'context') {
            top = offset.top - tooltipHeight - 2;
        }

        // reposition
        if (posTop) {
            top = offset.top + height + 2;
        }

        this._buildDepth();
        this.$tooltip.css({
            top: top + 'px',
            left: left + 'px'
        });
    },
    _buildDepth() {
        this.$tooltip.css('z-index', 1060);

        if (this.app.isProp('fullscreen')) {
            this.$tooltip.css('z-index', 10002);
        }
    },
    _getButton(e) {
        return this.dom(e.target).closest('.rx-button');
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'dropdown', {
    init(name, params) {
        let defs = {
            type: false,
            button: false,
            width: false,
            maxWidth: false,
            items: false,
            remove: false,
            extend: false,
            getter: false,
            setter: false,
            builder: false,
            observer: false,
            html: false,
            listen: true,
            keys: []
        };

        this.params = Redactor.extend({}, defs, params);
        this.name = name;

        if (this.params.html) {
            this.params.listen = false;
        }

        // build
        this.closeAll();
        this._build();
    },
    isOpen() {
        return (this.app.$body.find('.rx-dropdown').length !== 0);
    },
    open(e, button) {
        // button
        this.button = button;

        // build
        if (this.params.html) {
            this._buildHtml();

        }
        else {
            this._buildItems();
        }
        this._buildName();
        this._buildWidth();
        this._buildDepth();
        this._buildPosition();
        this._buildHeight();
        this._buildActiveKeys();
        this._startEvents();

        if (this.button && this.button.isButton) {
            this.button.getElement().addClass('rx-in-dropdown toggled');
        }

        this.$dropdown.show();

        if (this.params.listen) {
            this.app.getDoc().on('keydown.rx-dropdown', this._listen.bind(this));
        }
    },
    close() {
        this._stopEvents();
        if (this.button && this.button.isButton) {
            this.button.getElement().removeClass('rx-in-dropdown toggled');
        }
        this.$dropdown.remove();
        this.app.$body.find('.rx-colorpicker-' + this.uuid).remove();
    },
    closeAll() {
        this.app.$body.find('.rx-dropdown').each(function($node) {
            $node.dataget('instance').close();
        });
    },
    getName() {
        return this.name;
    },
    updatePosition(e) {
        if (this.$dropdown) {
            this._buildPosition(e);
            this._buildHeight();
        }
    },
    getElement() {
        return this.$dropdown;
    },

    // private
    _buildWidth() {
        if (this.params.width) {
            this.$dropdown.css('width', this.params.width);
        }
        if (this.params.maxWidth) {
            this.$dropdown.css('max-width', this.params.maxWidth);
        }
    },
    _buildPosition(e) {
        let { button, type } = this.app.button;
        let topFix = 1,
            leftFix = 2,
            width,
            offset,
            scrollTop = (this.app.scroll.isTarget() && e) ? this.app.scroll.getScrollTop() : 0,
            $target = this.app.scroll.getTarget(),
            targetTop = $target.offset().top,
            targetTolerance = parseInt($target.css('padding-top')),
            rect = this.app.editor.getRect(),
            height,
            top,
            left,
            dropdownWidth;

        leftFix = (type === 'context') ? -2 : (type === 'toolbar') ? 0 : leftFix;
        topFix = (type === 'context') ? 1 : topFix;

        let bodyRect = this.app.$body.get().getBoundingClientRect();

        if (type === 'control') {
            width = this.app.control.getElement().width();
            offset = this.app.control.getElement().offset();
        }
        else if (button && button.isButton) {
            width = button.getWidth();
            offset = button.getOffset();
            height = button.getHeight();
        }
        else {
            width = 0;
            offset = this.app.toolbar.getElement().offset();
            height = this.app.toolbar.getElement().height();
            type = 'toolbar';
        }

        // calculate
        if (['toolbar', 'context'].includes(type)) {
            top = offset.top + height + topFix;
            left = offset.left;
        }
        else {
            top = offset.top + topFix;
            left = offset.left + width + leftFix;
        }

        // show
        this.$dropdown.show();
        dropdownWidth = this.$dropdown.width();

        // check edges
        if (['toolbar', 'context'].includes(type)) {
            // check right edge
            left = (rect.right < left + dropdownWidth) ? offset.left - dropdownWidth + width : left;
            // check left edge
            left = (rect.left < left) ? offset.left + leftFix : left;
        }
        else {
            // check right edge
            left = (rect.right < left + dropdownWidth) ? offset.left - dropdownWidth - leftFix : left;
            // check left edge
            left = (rect.left < left) ? offset.left + width + leftFix : left;
        }

        // check bottom edge
        if (type === 'context' && (bodyRect.bottom < top + 200)) {
            // reposition
            top = top - this.$dropdown.height() - height - 4;
            this.$dropdown.attr('data-rx-pos', 'top');
        }
        else {
            this.$dropdown.removeAttr('data-rx-pos');
        }

        if (e && targetTop + targetTolerance > top) {
            this.$dropdown.hide();
        }
        else if (this.opts.is('maxHeight') && this.app.button.getType() !== 'toolbar') {
            let $editor = this.app.editor.getEditor();
            let editorBottom = $editor.offset().top + $editor.height();
            let editorTop = $editor.offset().top;

            if (top > editorBottom || editorTop > top) {
                this.$dropdown.hide();
            }
        }

        this.$dropdown.css({
            top: top + 'px',
            left: left + 'px'
        });

    },
    _buildHeight() {
        let targetHeight,
            top,
            cropHeight,
            $target = this.app.scroll.getTarget(),
            tolerance = 10,
            offset = this.$dropdown.offset();

        if (this.app.scroll.isTarget()) {
            top = offset.top - $target.offset().top;
            targetHeight = $target.height() - parseInt($target.css('border-bottom-width'));
        }
        else {
            top = offset.top - $target.scrollTop();
            targetHeight = $target.height();
        }

        cropHeight = targetHeight - top - tolerance;
        this.$dropdown.css('max-height', cropHeight + 'px');
    },
    _buildActiveKeys() {
        if (this.params.keys.length !== 0) {
            this._setActiveKeys(this.params.keys);
        }
    },
    _buildName() {
        this.$dropdown.attr('data-rx-dropdown-name', this.name);
        this.$dropdown.addClass('rx-dropdown-' + this.name);
    },
    _buildDepth() {
        if (this.opts.is('bsmodal')) {
            this.$dropdown.css('z-index', 1061);
        }
        if (this.app.isProp('fullscreen')) {
            this.$dropdown.css('z-index', 10001);
        }
    },
    _buildHtml() {
        this.$dropdownItems.append(this.params.html);
    },
    _buildItems() {
        let buttons = this.params.items,
            customButtons = (this.params.extend) ? this.params.extend : {},
            $buttons,
            types = ['text', 'address', 'list', 'todo', 'quote', 'dlist'],
            dropdownType = 'dropdown',
            removeButtons = [];

        if (this.app.button.getType() === 'control' && this.name === 'control') {
            dropdownType = 'control';
            let extendFromOpts = this.opts.get('control.add');
            if (extendFromOpts) {
                customButtons = Redactor.extend(true, {}, customButtons, extendFromOpts);
            }
            let extendRemoveFromOpts = this.opts.get('control.hide');
            if (extendRemoveFromOpts) {
                removeButtons = [...removeButtons, ...extendRemoveFromOpts];
            }
        }

        if (this.params.remove) {
            removeButtons = this.params.remove;
        }

        this.app.button.build(buttons, customButtons, 'dropdown', this.$dropdownItems, removeButtons);
        this.app.button.buildBlockButtons(dropdownType, this.$dropdownItems, removeButtons);

        // change button command
        if (this.name === 'addbar') {
            $buttons = this.$dropdown.find('.rx-button-dropdown');
            $buttons.each(function($node) {
                let name = $node.attr('data-name');
                if (types.indexOf(name) !== -1) {
                    $node.attr('data-command', 'block.add');
                }
            });
        }

    },
    _build() {
        this.$dropdown = this.dom('<div>').addClass('rx-dropdown rx-dropdown-' + this.uuid);
        this.$dropdown.hide();
        this.$dropdown.dataset('instance', this);
        this.$dropdown.attr({
            'dir': this.opts.get('dir'),
            'rx-data-theme': this.app.theme.get()
        });

        if (this.params.type) {
            this.$dropdown.addClass('rx-dropdown-type-' + this.params.type);
        }

        this.$dropdownItems = this.dom('<div>').addClass('rx-dropdown-items');
        this.$dropdown.append(this.$dropdownItems);

        // append
        this.app.$body.append(this.$dropdown);
    },
    _startEvents() {
        this.app.scroll.getTarget().on('resize.rx-dropdown scroll.rx-dropdown', this.updatePosition.bind(this));
        this.app.editor.getEditor().on('scroll.rx-dropdown', this.updatePosition.bind(this));
    },
    _stopEvents() {
        this.app.scroll.getTarget().off('.rx-dropdown');
        this.app.editor.getEditor().off('.rx-dropdown');
        this.app.getDoc().off('.rx-dropdown');
    },
    _listen(e) {
        switch(e.which) {
            case 9: // tab
                e.preventDefault();
                this._select('next');
            break;
            case 40: // down
                e.preventDefault();
                this._select('next');
            break;
            case 38: // up
                e.preventDefault();
                this._select('prev');
            break;
            case 13: // enter
                e.preventDefault();
                this._set(e);
            break;
        }
    },
    _select(type) {
        let $links = this.$dropdown.find('.rx-button');
        if ($links.length === 0) return;

        let $active = this.$dropdown.find('.active');

        $links.removeClass('active');

        let $item = this._selectItem($active, $links, type);
        $item.addClass('active');

        let itemHeight = $item.outerHeight();
        let itemTop = $item.position().top;
        let itemsScrollTop = this.$dropdown.scrollTop();
        let scrollTop = itemTop + itemHeight * 2;
        let itemsHeight = this.$dropdown.outerHeight();

        this.$dropdown.scrollTop(
            scrollTop > itemsScrollTop + itemsHeight ? scrollTop - itemsHeight :
                itemTop - itemHeight < itemsScrollTop ? itemTop - itemHeight :
                itemsScrollTop
        );
    },
    _selectItem($active, $links, type) {
        let $item;
        let isActive = ($active.length !== 0);
        let size = (type === 'next') ? 0 : ($links.length - 1);

        if (isActive) {
            $item = $active[type]();
        }

        if (!isActive || !$item || $item.length === 0) {
            $item = $links.eq(size);
        }

        return $item;
    },
    _set(e) {
        let $button = this.$dropdown.find('.active');
        let button = $button.dataget('instance');
        if (button) {
            button.trigger(e);
        }
    },
    _setActiveKeys(keys) {
        for (let i = 0; i < keys.length; i++) {
            this.$dropdown.find('[data-name=' + keys[i] + ']').addClass('active');
        }
    },
    _unsetActive() {
        this.$dropdown.find('.rx-button-dropdown').removeClass('active');
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'element', {
    // is
    is(el, type, filter) {
        let res = false,
            node = (type === 'text') ? el : this._getNode(el);

        if (type === 'inline') {
            res = (this._isElement(node) && this._isInlineTag(node.tagName, (filter === false) ? false : node));
        }
        else if (type === 'block-data') {
            res = (this._isElement(node) && node.hasAttribute('data-rx-type'));
        }
        else if (type === 'block-data-not-inline') {
            res = (this._isElement(node) && node.hasAttribute('data-rx-type') && !node.hasAttribute('data-rx-inline'));
        }
        else if (type === 'block-first') {
            res = (this._isElement(node) && node.hasAttribute('data-rx-first-level'));
        }
        else if (type === 'block') {
            res = (this._isElement(node) && this._isBlockTag(node.tagName));
        }
        else if (type === 'element') {
            res = this._isElement(node);
        }
        else if (type === 'text') {
            res = (typeof node === 'string' && !/^\s*<(\w+|!)[^>]*>/.test(node)) ? true : this._isTextNode(node);
        }
        else if (type === 'list') {
            res = (this._isElement(node) && (['ul', 'ol'].indexOf(node.tagName.toLowerCase()) !== -1));
        }
        else if (type === 'heading') {
            res = (this._isElement(node) && (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(node.tagName.toLowerCase()) !== -1));
        }

        return res;
    },
    isType(el, type) {
        return (type == this.getType(el));
    },
    isTag(el, tag) {
        return (this._getNode(el).tagName.toLowerCase() === tag);
    },
    isEmpty(el) {
        let node = this._getNode(el);
        if (node) {
            return (node.nodeType === 3) ? (node.textContent.trim().replace(/\n/, '') === '') : (node.innerHTML === '');
        }

        return false;
    },
    isScrollVisible(el) {
        let $scrollTarget = this.app.scroll.getTarget(),
            $el = this.dom(el),
            docViewTop = $scrollTarget.scrollTop(),
            docViewBottom = docViewTop + $scrollTarget.height(),
            elemTop = $el.offset().top;

        return (elemTop <= docViewBottom);
    },

    // scroll
    scrollTo($el, tolerance) {
        $el = this.dom($el);

        if (this.isScrollVisible($el)) return;

        tolerance = tolerance || 60;

        let offset = $el.offset(),
            $target = this.app.scroll.getTarget(),
            value = offset.top - tolerance;

        $target.scrollTop(value);
        setTimeout(function() {
            $target.scrollTop(value);
        }, 1);
    },

    // get
    getInlines(el) {
        let inlines = [],
            node = el;

        while (node) {
            if (this.is(node, 'inline')) {
                inlines.push(node);
            }

            node = node.parentNode;
        }

        return inlines;
    },
    getType(el) {
        return this.dom(el).attr('data-rx-type');
    },
    getDataBlock(el, type) {
        let selector = (type) ? '[data-rx-type='+ type +']' : '[data-rx-type]',
            $el = this.dom(el).closest(selector);

        return ($el.length !== 0) ? $el : false;
    },
    getFirstLevel(el) {
        return this.dom(el).closest('[data-rx-first-level]');
    },

    // compare
    compareStyle(el, obj) {
        let len = Object.keys(obj).length,
            utils = this.app.create('utils'),
            $el = this.dom(el),
            css = utils.cssToObject($el.attr('style')),
            cssSize = Object.keys(css).length,
            size = 0;

        if (cssSize !== len) {
            return false;
        }
        else {
            for (let [key, val] of Object.entries(css)) {
                if (obj[key]) {
                    let value = obj[key];
                    value = this._normalizeValue(key, value);
                    val = this._normalizeValue(key, val);

                    if (value === val) {
                        size++;
                    }
                }
            }
        }

        return (cssSize === size);
    },

    // has
    hasAttrs(el, obj) {
        let len = Object.keys(obj).length,
            $el = this.dom(el),
            size = 0;

        for (let [key, val] of Object.entries(obj)) {
            let value = $el.attr(key);

            if (value === val) {
                size++;
            }
        }

        return (len === size);
    },
    hasStyle(el, obj) {
        if (!obj) return false;

        let $el = this.dom(el),
            len = Object.keys(obj).length,
            size = 0;

        for (let [key, val] of Object.entries(obj)) {
            let value = $el.css(key);
            value = this._normalizeValue(key, value);
            val = this._normalizeValue(key, val);

            if (value === val) {
                size++;
            }
        }

        return (len === size);
    },
    hasParent(el, type) {
        return (this.dom(el).closest('[data-rx-type='+ type +']').length !== 0);
    },

    // split
    split(el) {
        let $el = this.dom(el),
            node = this._getNode(el),
            type,
            utils = this.app.create('utils'),
            tag = node.tagName.toLowerCase(),
            fragment = utils.extractHtmlFromCaret(el),
            $secondPart,
            $last,
            html;

        if (fragment.nodeType && fragment.nodeType === 11) {
            fragment = this.dom(fragment.childNodes);
        }

        $secondPart = this.dom('<' + tag + ' />');
        $secondPart = this.cloneAttrs(el, $secondPart);
        $secondPart.append(fragment);
        $el.after($secondPart);

        $last = $el.children().last();
        if (this.is($last, 'inline')) {
            html = $last.html();
            html = utils.removeInvisibleChars(html);
            if (html === '') {
                $last.remove();
            }
        }

        type = this.getType($secondPart);
        if (type) {
            this.app.create('block.' + type, $secondPart);
        }

        if ($el.html() === '') $el.remove();

        return $secondPart;
    },

    // clone
    cloneEmpty(el) {
        let $el = this.dom(el),
            tag = $el.get().tagName.toLowerCase();

        return this.dom('<' + tag + '>');
    },
    cloneAttrs(elFrom, elTo) {
        let $elTo = this.dom(elTo),
            attrs = this._getNode(elFrom).attributes,
            attr,
            len = attrs.length;

        while (len--) {
            attr = attrs[len];
            $elTo.attr(attr.name, attr.value);
        }

        return $elTo;
    },

    // attrs
    getAttrs(el) {
        let node = this._getNode(el),
            attr = {},
            i = 0,
            val;

        if (node.attributes != null && node.attributes.length) {
            for (i; i < node.attributes.length; i++) {
                val = node.attributes[i].nodeValue;
                val = (this._isNumber(val)) ? parseFloat(val) : this._getBooleanFromStr(val);
                attr[node.attributes[i].nodeName] = val;
            }
        }

        return attr;
    },
    removeEmptyAttr(el, name) {
        let $el = this.dom(el),
            empty = false;

        if ($el.attr(name) === '') {
            $el.removeAttr(name);
            empty = true;
        }

        return empty;
    },

    // replace
    replaceToTag(el, tag, keepchildnodes) {
        return this.dom(el).replaceWith(function(node) {
            let $el = this.dom('<' + tag + '>'),
                attrs,
                i = 0,
                max;

            if (!keepchildnodes) {
                $el.append(node.innerHTML);
            }

            if (node.attributes) {
                attrs = node.attributes;
                for (i = 0, max = attrs.length; i < max; i++) {
                    $el.attr(attrs[i].nodeName, attrs[i].value);
                }
            }

            if (keepchildnodes) {
                while (node.childNodes.length > 0) {
                    $el.append(this.dom(node.firstChild));
                }
            }

            return $el;
        }.bind(this));
    },

    // blocks
    getBlocks(el, parsertags) {
        let node = this._getNode(el),
            nodes,
            tags,
            i = 0,
            max,
            finalNodes = [];

        nodes = node.childNodes;
        tags = parsertags || this.opts.get('tags.parser');

        for (i = 0, max = nodes.length; i < max; i++) {
            if (nodes[i].nodeType === 1 && tags.indexOf(nodes[i].tagName.toLowerCase()) !== -1) {
                finalNodes.push(nodes[i]);
            }
        }

        return finalNodes;
    },

    // =private
    _getNode(el) {
        return this.dom(el).get();
    },
    _getBooleanFromStr(str) {
        if (str === 'true') return true;
        else if (str === 'false') return false;

        return str;
    },
    _isNumber(str) {
        return !isNaN(str) && !isNaN(parseFloat(str));
    },
    _isTag(tag) {
        return (tag !== undefined && tag);
    },
    _isTextNode(el) {
        let node = this._getNode(el);

        return (node && node.nodeType && node.nodeType === 3);
    },
    _isBlockTag(tag) {
        let tags = this.opts.get('tags.block');

        return (tags.indexOf(tag.toLowerCase()) !== -1);
    },
    _isInlineTag(tag, node) {
        let tags = this.opts.get('tags.inline');
        if (node) {
            let $node = this.dom(node);
            if ($node.hasClass('email-button')) return false;
        }

        return (tags.indexOf(tag.toLowerCase()) !== -1);
    },
    _isElement(node) {
        return (node && node.nodeType && node.nodeType === 1);
    },
    _normalizeValue(key, val) {
        let utils = this.app.create('utils');

        val = (typeof val === 'string') ? val.replace(/'/g, '"') : val;
        val = val.trim().replace(/;$/, '');
        if (key.search(/color|background/) !== -1) {
            val = utils.convertRgb2hex(val);
            val = val.toLowerCase();
        }
        if (key.search(/family/) !== -1) {
            val = val.replace(/"/g, '');
        }

        return val;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'fragment', {
    create(node) {
        return (this.is(node)) ? node : this._create(node);
    },
    is(obj) {
        return (typeof obj === 'object' && obj.frag);
    },
    insert(fragment) {
        let selection = this.app.create('selection'),
            range = selection.getRange(),
            start;

        if (!range) return;

        if (selection.isCollapsed()) {
            start = range.startContainer;
            if (start.nodeType !== 3 && start.tagName === 'BR') {
                start.parentNode.removeChild(start);
            }
        }
        else {
            range.deleteContents();
        }

        if (fragment.frag) {
            range.insertNode(fragment.frag);
        }
        else {
            range.insertNode(fragment);
        }
    },

    // =private
    _create(html) {
        let el = (typeof html === 'string') ? this._createContainer(html) : this.dom('<div>').append(html).get(),
            frag = document.createDocumentFragment(),
            node,
            firstNode,
            lastNode,
            nodes = [],
            i = 0,
            n;

        while ((node = el.firstChild)) {
            i++;
            n = frag.appendChild(node);
            if (i === 1) firstNode = n;

            nodes.push(n);
            lastNode = n;
        }

        return { frag: frag, first: firstNode, last: lastNode, nodes: nodes };
    },
    _createContainer(html) {
        let $div = this.dom('<div>');

        if (typeof html === 'string') {
            $div.html(html);
        }
        else {
            $div.append(this.dom(html).clone(true));
        }

        return $div.get();
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'insertion', {
    set(params) {
        return this.insert(params, 'set');
    },
    setEmpty() {
        let remove = this.opts.get('noneditable.remove'),
            $editor = this.app.editor.getEditor(),
            nodes = [];

        if (remove == false) {
            //$editor.find('[' + this.opts.get('dataBlock') + '=noneditable]').each(function($node) {
            //    nodes.push($node.clone(true));
            //});
        }

        $editor.html('');

        if (nodes.length !== 0) {
            //nodes.forEach(function($node) {
            //    $editor.append($node);
            //});
        }

    },
    insert(params, type) {
        let $inserted,
            defs = {
                target: false,
                position: false,
                html: false,
                clean: false,
                parse: true,
                current: false,
                instance: false,
                caret: false,
                remove: true,
                type: false
            };

        // params
        this.p = Redactor.extend({}, defs, params);

        // broadcast before
        if (this.p.html) {
            this.p.html = this.app.broadcastHtml('editor.before.insert', this.p.html);
        }

        // type
        if (type === 'set' || this.app.editor.isSelectAll()) {
            // set
            $inserted = this._setContent();
        }
        else {
            // insert
            $inserted = this._insertContent();
        }

        // broadcast after
        if ($inserted) {
            this.app.broadcast('editor.insert', { inserted: $inserted });
        }

        setTimeout(function() {
            this.app.observer.observe();
        }.bind(this), 0);

        // return
        return $inserted;
    },
    insertNewline(caret, doublenode) {
        let str = (doublenode) ? '\n\n' : '\n';

        return this._insertFragment({ node: document.createTextNode(str) }, (caret) ? caret : 'after');
    },
    insertPoint(e) {
        let range,
            utils = this.app.create('utils'),
            caret = this.app.create('caret'),
            marker = utils.createInvisibleChar(),
            x = e.clientX,
            y = e.clientY,
            pos,
            sel,
            doc = this.app.getDocNode();

        if (doc.caretPositionFromPoint) {
            pos = doc.caretPositionFromPoint(x, y);
            sel = doc.getSelection();
            range = sel.getRangeAt(0);
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
            range.insertNode(marker);
        }
        else if (doc.caretRangeFromPoint) {
            range = doc.caretRangeFromPoint(x, y);
            range.insertNode(marker);
        }

        caret.set(marker, 'after');
    },
    insertBreakline(caret, split) {
        let selection = this.app.create('selection'),
            inlines = selection.getNodes({ type: 'inline' });

        if (split !== false && selection.isCollapsed() && inlines.length !== 0) {
            return this._splitInline(inlines, document.createElement('br'));
        }
        else {
            return this._insertFragment({ node: document.createElement('br') }, (caret) ? caret : 'after');
        }
    },
    insertNode(node, caret, splitinline) {
        let inlines,
            selection = this.app.create('selection');

        if (splitinline) {
            inlines = selection.getNodes({ type: 'inline' });
            if (inlines.length !== 0) {
                return this._splitInline(inlines, node);
            }
        }

        return this._insertFragment({ node: this.dom(node).get() }, caret);
    },
    insertHtml(html, caret) {
        return this._insertFragment({ html: html }, caret);
    },
    insertText(text, point) {
        let instance = this.app.block.get(),
            selection = this.app.create('selection'),
            caret = this.app.create('caret'),
            utils = this.app.create('utils'),
            node,
            range;

        if (!instance || (instance && !instance.isEditable())) {
            this.insert({ html: text, caret: point });
            return;
        }

        if (selection.is()) {
            text = utils.getTextFromHtml(text, { nl: true });
            node = document.createTextNode(text);
            range = selection.getRange();
            range.deleteContents();
            range.insertNode(node);

            point = point || 'end';
            caret.set(node, point);
        }

        return node;
    },

    // detect
    detectPosition($target, position) {
        if (position) {
            return position;
        }

        // caret position
        let caret = this.app.create('caret'),
            isStart = caret.is($target, 'start'),
            isEnd = caret.is($target, 'end');

        // end
        if (isEnd) {
            position = 'after';
        }
        // start
        else if (isStart) {
            position = 'before';
        }
        // middle
        else {
            position = 'split';
        }

        return position;
    },

    // split
    _splitInline(inlines, node) {
        let elm = this.app.create('element'),
            caret = this.app.create('caret'),
            $part = elm.split(inlines[0]);

        $part.before(node);
        if ($part.html() === '') {
            $part.remove();
        }

        caret.set($part, 'start');

        return this.dom(node);
    },

    // insert
    _insertContent() {
        let inserted;

        // insert instance
        if (this.p.instance) {
            inserted = this._insertInstance();
        }
        // insert html
        else {
            inserted = this._insertHtml();
        }

        return inserted;
    },
    _insertHtml() {
        let current = (this.p.current) ? this.p.current : this.app.block.get(),
            utils = this.app.create('utils');

        // element
        if (typeof this.p.html !== 'string') {
            this.p.html = this.dom(this.p.html).get().outerHTML;
        }

        // check
        this.isEmpty = utils.isEmptyHtml(this.p.html);
        this.isLine = utils.isLine(this.p.html);

        // check empty
        if (this.isEmpty) return;

        // 0) target
        if (this.p.target) {
            this._createEmptyBlock();
            return this._insertToTarget();
        }
        // 1) blocks selected
        else if (this.app.blocks.is()) {
            this._createEmptyBlock();
            this.app.context.close();
            return this._insertToBlocks();
        }
        // 2) no one selected
        else if (!current) {
            this._createEmptyBlock();
            return this._insertToEditor();
        }
        // 3) table to table
        else if (this._isTableToTable(current, this.p.html)) {
            return;
        }
        // 4) list to list
        else if (this._isListToList(current, this.p.html)) {
            return this._insertToList(current);
        }
        // 5) one selected editable
        else if (current && (current.isEditable() || current.isType('quote') || current.isInline())) {
            if (this.isEmpty) return;
            return this._insertToOneEditable(current);
        }
        // 6) one selected not editable
        else if (current && !current.isEditable()) {
            this._createEmptyBlock();
            return this._insertToOneNotEditable(current);
        }
        // 7) all other cases
        else {
            return;
        }
    },
    _insertToTarget() {
        let position = (this.p.position) ? this.p.position : 'after',
            $block = this.dom(this.p.target);

        // clean
        this.p.html = this._clean(this.p.html);

        // parse
        let nodes = this._parse(this.p.html);
        let $inserted = this.dom(nodes);

        // last node
        let $lastNode = this._getLastNode(nodes);

        // insert
        $block[position](nodes);

        // rebuild
        this.app.editor.build();

        // focus
        this.app.block.set($lastNode, 'end', false, true);

        return $inserted;
    },
    _insertToBlocks() {
        let selection = this.app.create('selection'),
            nodes,
            $nodes,
            position = 'before',
            $lastNode,
            $inserted,
            last,
            $block;

        // clean
        this.p.html = this._clean(this.p.html);

        // parse
        nodes = this._parse(this.p.html);
        $inserted = this.dom(nodes);

        // last node
        $lastNode = this._getLastNode(nodes);

        // insert
        if (this.isLine) {
            nodes = this._insertFragment({ fragment: nodes });

            // focus
            this.app.block.set($lastNode, 'end');
        }
        else {
            // remove selection
            selection.truncate();
            this.app.context.close();

            // insert
            last = this.app.blocks.get({ last: true, selected: true, instances: true });
            $block = last.getBlock();

            if (last.isType('listitem') && this._isListToList(last, this.p.html)) {
                $nodes = this.dom(nodes);
                $block[position]($nodes.children());
            }
            else {
                $block[position](nodes);
            }

            // rebuild
            this.app.editor.build();

            // focus
            this.app.block.set($lastNode, 'end');
        }

        return $inserted;
    },
    _insertToEditor() {
        let elm = this.app.create('element'),
            nodes,
            current,
            position,
            $inserted,
            $lastNode,
            $block;

        // clean
        this.p.html = this._clean(this.p.html);

        // parse
        nodes = this._parse(this.p.html);
        $inserted = this.dom(nodes);

        // last node
        $lastNode = this._getLastNode(nodes);

        // position
        if (this.opts.get('addPosition') === 'top') {
            current = this.app.blocks.get({ first: true, instances: true });
            position = 'before';
        }
        else {
            current = this.app.blocks.get({ last: true, instances: true });
            position = 'after';
        }

        // insert
        $block = current.getBlock();
        $block[position](nodes);

        // scroll
        elm.scrollTo($lastNode);

        // rebuild
        this.app.editor.build();

        // focus
        this.app.block.set($lastNode, 'end');

        return $inserted;
    },
    _insertToList(current) {
        let selection = this.app.create('selection'),
            position,
            $items,
            nodes,
            $nodes,
            $lastNode,
            $block = current.getBlock();

        // clean
        this.p.html = this._clean(this.p.html);

        // parse
        nodes = this._parse(this.p.html);
        $nodes = this.dom(nodes);

        // last node
        $lastNode = this._getLastNode(nodes);

        // append to list
        if (current.isType('list')) {
            $items = $nodes.children();
            $block.append($items);
        }
        else {
            position = this.detectPosition($block, position);

            // remove selection
            selection.truncate();
            this.app.context.close();

            // insert
            if (position === 'split') {
                $items = nodes;
                this._insertFragment({ fragment: nodes });
            }
            else {
                $items = $nodes.children();
                $block[position]($items);
            }
        }

        // rebuild
        this.app.editor.build();

        // focus
        this.app.block.set($lastNode, 'end');

        return $items;
    },
    _insertToTable(current) {

    },
    _insertToOneEditable(current) {
        let utils = this.app.create('utils'),
            selection = this.app.create('selection'),
            elm = this.app.create('element'),
            caret = this.app.create('caret'),
            nodes,
            remove = false,
            position = this.p.position,
            $lastNode,
            $inserted,
            $block = current.getBlock();

        // clean
        this.p.html = this._clean(this.p.html);
        this.p.html = this._cleanSpecial(this.p.html, current);

        // parse
        nodes = this._parse(this.p.html);
        $inserted = this.dom(nodes);

        // last node
        $lastNode = this._getLastNode(nodes);

        // inline
        if (current.isInline()) {
            if (!current.isEditable()) {
                caret.set($block, 'after');
                current.remove();
            }
        }

        // insert
        if (this.isLine) {
            let $li = this.dom(nodes).find('li');
            if (current.isType('todoitem')) {
                let $tmpnodes = this.dom('<div>').append(nodes);
                nodes = this._insertFragment({ html: $tmpnodes.text() }, (this.p.caret) ? this.p.caret : 'end');
            }
            if (current.isType('listitem') && $li.length !== 0) {
                nodes = this.dom(nodes).find('li').html();
                nodes = this._insertFragment({ html: nodes }, (this.p.caret) ? this.p.caret : 'end');
            }
            else {
                nodes = this._insertFragment({ fragment: nodes }, (this.p.caret) ? this.p.caret : 'end');
            }
            $inserted = this.dom(nodes);
        }
        else {
            // detect position
            if (utils.isEmptyHtml($block.html())) {
                remove = (this.p.type === 'input') ? false : true;
                position = 'after';
            }
            else {
                position = (position) ? position : this.detectPosition($block, position);
            }

            // remove selection
            if (!remove) {
                selection.truncate();
                this.app.context.close();
            }

            // insert
            if (position === 'split') {
                let $part = elm.split($block).before(nodes);

                // clean up
                this._cleanUpPart($part);
            }
            else {
                $block[position](nodes);
            }

            // remove
            if (remove) {
                current.remove();
            }

            // rebuild
            this.app.editor.build();

            // focus
            this.app.block.set($lastNode, 'end');
        }

        return $inserted;
    },
    _insertToOneNotEditable(current) {
        let nodes,
            position = 'after',
            $lastNode,
            $inserted,
            $block = current.getBlock();

        // clean
        this.p.html = this._clean(this.p.html);

        // parse
        nodes = this._parse(this.p.html);
        $inserted = this.dom(nodes);

        // last node
        $lastNode = this._getLastNode(nodes);

        // parent
        if (current.isType(['cell', 'row', 'column'])) {
            current = current.getParent();
            $block = current.getBlock();
        }

        // insert
        $block[position](nodes);

        // rebuild
        this.app.editor.build();

        // focus
        this.app.block.set($lastNode, 'end');

        return $inserted;
    },
    _insertInstance() {
        let current = (this.p.current) ? this.p.current : this.app.block.get(),
            position = this.p.position,
            elm = this.app.create('element'),
            caret = this.app.create('caret'),
            $block = this.p.instance.getBlock(),
            $wrapper,
            $part,
            $items,
            remove = false,
            action = false,
            $current;

        // caret
        this.p.caret = (this.p.instance.isType(['table', 'quote', 'layout'])) ? 'start' : ((this.p.caret) ? this.p.caret : 'end');

        // not selected
        if (!current) {
            if (this.opts.get('addPosition') === 'top') {
                current = this.app.blocks.get({ first: true, instances: true });
                position = 'before';
            }
            else {
                current = this.app.blocks.get({ last: true, instances: true });
                position = 'after';
            }

            $current = current.getBlock();
            if (this.p.instance.isInline()) {
                let wrapper = this.app.block.create();
                $wrapper = wrapper.getBlock();
                $wrapper.append($block);
            }
            else if (this.p.instance.isType('list') && current.isType('list')) {
                $items = this.p.instance.getItems();
                current.getBlock().append($items);
            }

            if ($wrapper) {
                $current[position]($wrapper);
            }
            else {
                $current[position]($block);
            }

            // rebuild
            this.app.editor.build();

            // set & caret
            if (this.p.caret) {
                setTimeout(function() {
                    this.app.block.set($block, this.p.caret);

                    // scroll
                    elm.scrollTo($block);
                }.bind(this), 0);
            }

            // return
            return this.p.instance;
        }

        if (current.isEditable()) {
            // detect position
            position = this.detectPosition(current.getBlock(), false);
        }

        // table to table
        if (this.p.instance.isType('table') && (current.isType('table') || current.getClosest('table'))) {
            if (current.isType('table')) {
                position = 'after';
            }
            else {
                return;
            }
        }


        // list to listitem
        if (this.p.instance.isType('list') && current.isType('listitem')) {
            $items = this.p.instance.getItems();
            $part = elm.split(current.getBlock());
            $part.prepend($items);
        }
        // list to list
        else if (this.p.instance.isType('list') && current.isType('list')) {
            $items = this.p.instance.getItems();
            current.getBlock().append($items);
        }
        else {
            $current = current.getBlock();


            // check
            if (this.p.instance.isInline()) {
                if (current.isInline()) {
                    position = 'after';
                }
                else if (current.isEditable()) {
                    position = 'fragment';
                }
                else if (!current.isEditable()) {
                    position = 'after';

                    let wrapper = this.app.block.create();
                    $wrapper = wrapper.getBlock();
                    $wrapper.append($block);
                }
            }
            else if (current.isInline()) {
                position = 'split';
                caret.set($current, 'after');
                $current = $current.parent().closest('[data-rx-type]');
                remove = true;
            }
            else if (current.isType(['cell', 'column'])) {
                position = (this.p.position) ? position : 'prepend';
            }
            else if (current.isType(['row', 'figcaption'])) {
                position = (position === 'split') ? 'after' : position;
                $current = current.getParent().getBlock();
            }
            else if (current.isType('todo')) {
                if (this.p.instance.isType('todoitem')) {
                    position = 'append';
                }
                else if (this.p.instance.isType('todo')) {
                    $block = this.p.instance.getItems();
                    position = 'append';
                }
            }
            else if (current.isType('quote')) {
                if (current.isCaretStart()) {
                    position = 'before';
                }
                else if (current.isCaretEnd()) {
                    position = 'after';
                }
                else {
                    position = 'split';
                }
            }
            else if (current.isType('todoitem')) {
                if (this.p.instance.isType('todoitem')) {
                    position = 'after';
                }
                else if (this.p.instance.isType('todo')) {
                    $block = this.p.instance.getItems();
                    position = 'after';
                }
                else {
                    $current = current.getParent().getBlock();
                    if (current.getParent().isCaretStart()) {
                        position = 'before';
                    }
                    else if (current.getParent().isCaretEnd()) {
                        position = 'after';
                    }
                    else {
                        position = 'split';
                        action = 'list-empty';
                        current.setCaret('end');
                    }
                }
            }
            else if (current.isType('listitem')) {
                $current = current.getBlock().parents('ul, ol').last();

                if (current.getParentTopInstance().isCaretStart()) {
                    position = 'before';
                }
                else if (current.getParentTopInstance().isCaretEnd()) {
                    position = 'after';
                }
                else {
                    position = 'split';
                    action = 'list-normalize';
                }
            }
            else if (current.isType('list') && position === 'split') {
                action = 'list-empty';
            }

            if (this.p.type === 'duplicate') {
                position = 'after';
            }

            // insert
            if (position === 'split') {
                $part = elm.split($current);
                $part.before($block);

                if (action === 'list-empty') {
                    $part.find('li').first().remove();
                }
                else if (action === 'list-normalize') {
                    let $li = $part.find('li').first();
                    let $liClone = $li.clone();
                    $liClone.find('ol, ul').remove();
                    if ($liClone.text().trim() === '') {
                        let $ul = $li.find('ol, ul').first().children();
                        $ul.find('ul, ol').each(function($node) {
                            $node.removeAttr('data-rx-type');
                            this.app.create('block.list', $node);
                        }.bind(this));
                        $part.find('li').each(function($node) {
                            $node.removeAttr('data-rx-type');
                            this.app.create('block.listitem', $node);
                        }.bind(this));
                        $li.before($ul);
                        $li.remove();

                    }
                }

                // clean up
                this._cleanUpPart($part);
            }
            else if (position === 'fragment') {
                this._insertFragment({ node: $block.get() }, 'start');
            }
            else {
                if ($wrapper) {
                    $current[position]($wrapper);
                }
                else {
                    $current[position]($block);
                }
            }

            if (remove) {
                current.remove();
            }
            else if (this.p.remove && current.isEditable() && current.isEmpty()) {
                current.remove();
            }
        }

        // rebuild
        this.app.editor.build();

        // set & caret
        if (this.p.caret) {
            setTimeout(function() {
                this.app.block.set($block, this.p.caret);
            }.bind(this), 0);
        }

        // return
        return this.p.instance;
    },
    _insertFragment(obj, point) {
        let fragment,
            frag = this.app.create('fragment'),
            caret = this.app.create('caret'),
            target;

        if (obj.html || obj.fragment) {
            fragment = frag.create(obj.html || obj.fragment);
            frag.insert(fragment);
        }
        else {
            frag.insert(obj.node);
        }

        if (point) {
            target = (obj.node) ? obj.node : ((point === 'start') ? fragment.first : fragment.last);
            caret.set(target, point);
        }

        if (obj.node) {
            return this.dom(obj.node);
        }
        else {
            return this.dom(fragment.nodes);
        }
    },

    // set
    _setContent() {
        let utils = this.app.create('utils'),
            $lastNode,
            $firstNode,
            $node,
            $inserted,
            nodes;

        // check
        this.isEmpty = utils.isEmptyHtml(this.p.html);
        this.isLine = utils.isLine(this.p.html);

        // empty block
        this._createEmptyBlock();

        // clean
        this.p.html = this._clean(this.p.html);

        // parse
        nodes = this._parse(this.p.html);
        $inserted = this.dom(nodes);

        // first & last node
        $lastNode = this._getLastNode(nodes);
        $firstNode = this._getFirstNode(nodes);

        // set
        this.app.editor.unsetSelectAll();
        this.setEmpty();
        this.app.editor.getEditor().append(nodes);

        // caret
        if (this.p.caret) {
            $node = (this.p.caret === 'start') ? $firstNode : $lastNode;
            setTimeout(function() {
                this.app.block.set($node, this.p.caret);
            }.bind(this), 0);
        }

        // broadcast empty
        if (this.isEmpty) {
            this.app.broadcast('editor.empty');
        }

        // rebuild
        this.app.editor.build();

        // broadcast
        this.app.broadcast('editor.set', { inserted: $inserted });

        return $inserted;
    },

    // parse
    _parse(html) {
        let parser = this.app.create('parser'),
            $parsed;

        if (this.p.parse) {
            $parsed = parser.parse(html, { type: this._getParseType(), nodes: true });
        }
        else {
            $parsed = parser.build(html);
            $parsed = $parsed.get().childNodes;
        }

        return $parsed;
    },
    _getParseType() {
        return (this.isLine) ? 'line' : 'html';
    },

    // clean
    _clean(html) {
        let cleaner = this.app.create('cleaner');

        return (this.p.clean) ? cleaner.clean(html) : html;
    },
    _cleanSpecial(html, current) {
        let clean,
            cleaner = this.app.create('cleaner'),
            extend,
            except,
            type = current.getType();

        if (['address', 'figcaption', 'quote', 'todoitem', 'dlist'].indexOf(type) !== -1) {
            clean = true;
        }
        else if (type === 'list' || type === 'listitem') {
            clean = true;
            except = ['ul', 'ol', 'li'];
        }
        else if (type === 'pre') {
            clean = true;
        }

        if (clean) {
            this.isLine = true;

            if (type === 'pre') {
                html = cleaner.removeBreakline(html);
            }
            else if (type !== 'list' && type !== 'listitem') {
                html = cleaner.addBrToBlocks(html);
            }

            html = cleaner.removeBlockTags(html, extend, except);
            html = html.replace(/<br\s?\/?>\n?$/gi, '');
        }

        return html;
    },
    _cleanUpPart($part) {
        $part.find('.rx-block-focus').removeClass('rx-block-focus rx-block-control-focus');
        $part.removeClass('rx-block-focus rx-block-control-focus');
    },

    // other
    _createEmptyBlock() {
        if (this.isLine) {
            this.p.html = this.app.block.createHtml(this.p.html);
        }
    },
    _isListToList(instance, html) {
        let $target = instance.getBlock(),
            type = instance.getType(),
            $list = this.dom('<div>').html(html);

        $list.find('meta').remove();
        // unwrap b fixes google docs
        $list.find('b').unwrap();
        $list = $list.children().first();

        return ((type === 'list' || type === 'listitem') && $list.length !== 0 && ['ul', 'ol'].indexOf($list.get().tagName.toLowerCase()) !== -1);
    },
    _isTableToTable(instance, html) {
        let closest = instance.getClosest('table'),
            $el = this.dom('<div>').html(html);

        return (closest && $el.find('table').length !== 0);
    },
    _getFirstNode(nodes) {
        return this.dom(nodes[0]);
    },
    _getLastNode(nodes) {
        return this.dom(nodes[nodes.length-1]);
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'clipboard', {
    getContent(clipboard) {
        let type = (this.isPlainText(clipboard)) ? 'text/plain' : 'text/html',
            html = clipboard.getData(type),
            cleaner = this.app.create('cleaner');

        // html
        return (type === 'text/plain') ?  cleaner.escapeHtml(html) : html;
    },
    setContent(e, html, text) {
        let clipboard = e.clipboardData,
            utils = this.app.create('utils'),
            unparser = this.app.create('unparser');

        // unparse
        html = unparser.unparse(html, { clipboard: true });
        html = '<meta type="rx-editor"/>' + html;

        // text
        text = text || utils.getTextFromHtml(html, { nl: true });

        // set
        clipboard.setData('text/html', html);
        clipboard.setData('text/plain', text);
    },
    isPlainText(clipboard) {
        let text = clipboard.getData('text/plain'),
            html = clipboard.getData('text/html');

        if (html && html.trim() !== '') {
            return false;
        }
        else {
            return (text !== null);
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'autoparse', {
    parse(html) {
        if (!this.opts.is('paste.autoparse')) {
            return html;
        }

        let instance = this.app.block.get(),
            tags = ['figure', 'html', 'form', 'pre', 'div', 'span', 'video', 'object', 'iframe', 'code', 'a', 'img', 'link', 'script'],
            singleTags = ['div', 'img', 'html', 'span'],
            stored = [],
            z = 0,
            i = 0,
            y = 0,
            reTags,
            matched,
            aurl1 = this.opts.get('regex.aurl1'),
            aurl2 = this.opts.get('regex.aurl2'),
            imageurl = this.opts.get('regex.imageurl'),
            cleaner = this.app.create('cleaner');

        // store comments
        html = cleaner.storeComments(html);
        html = cleaner.store(html, 'svg');

        // remove doctype tag
        html = cleaner.removeDoctype(html);

        // store tags
        for (i = 0; i < tags.length; i++) {
            reTags = (singleTags.indexOf(tags[i]) !== -1) ? '<' + tags[i] + '[^>]*>' : '<' + tags[i] + '[^>]*>([\\w\\W]*?)</' + tags[i] + '>';
            matched = html.match(new RegExp(reTags, 'gi'));

            if (matched !== null) {
                for (y = 0; y < matched.length; y++) {
                    html = html.replace(matched[y], '#####replaceparse' + z + '#####');
                    stored.push(matched[y]);
                    z++;
                }
            }
        }

        // links
        html = html.replace('&amp;', '&');
        if ((html.match(aurl1) || html.match(aurl2)) && !html.match(imageurl)) {
            html = this._formatLinks(html);
        }

        // images
        if (html.match(imageurl)) {
            let imagesMatches = html.match(imageurl);
            for (i = 0; i < imagesMatches.length; i++) {
                html = html.replace(imagesMatches[i], this._splitBlock(instance, '<img src="' + imagesMatches[i] + '">'));
            }
        }

        // restore
        html = this._restoreReplaced(stored, html);
        html = cleaner.restoreComments(html);
        html = cleaner.restore(html, 'svg');

        // repeat for nested tags
        html = this._restoreReplaced(stored, html);

        return html;
    },

    // private
    _splitBlock(instance, str) {
        return (instance) ? str = "\n" + str + "\n" : str;
    },
    _formatLinks(content) {
        let linkTarget = this.opts.get('paste.linkTarget'),
            aurl1 = this.opts.get('regex.aurl1'),
            aurl2 = this.opts.get('regex.aurl2'),
            https = this.opts.get('https'),
            target = (linkTarget !== false) ? ' target="' + linkTarget + '"' : '',
            protocol = (https) ? 'https' : 'http',
            self = this;

        content = content.replace(aurl1, function(url) {
            return '<a href="' + url + '"' + target + '>' + self._subLinkText(url) + '</a>';
        });

        content = content.replace(aurl2, function(match, before, url) {
            return before + '<a href="' + protocol + '://' + url + '"' + target + '>' + self._subLinkText(url) + '</a>';
        });

        return content;
    },
    _subLinkText(text) {
        let size = this.opts.get('link.size');

        text = (text.length > size) ? text.substring(0, size) + '...' : text;
        text = (text.search('%') === -1) ? decodeURIComponent(text) : text;

        return text;
    },
    _restoreReplaced(stored, html) {
        let i = 0,
            max = stored.length;

        for (i; i < max; i++) {
            html = html.replace('#####replaceparse' + i + '#####', stored[i]);
        }

        return html;
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'stack', {
    init() {
        this.data = false;
    },
    create(name, params) {
        let defs = {
            title: false,
            footer: false,
            setter: false,
            getter: false,
            form: false,
            button: false,
            width: '240px'
        };

        this.params = Redactor.extend({}, defs, params);
        this.name = name;

        // build
        this._build();
        this._buildBody();
        this._buildFooter();
    },
    render() {
        // render
        this._renderForm();
        this._renderFooter();

        // width
        this.app.modal.updateWidth(this.params.width);
    },
    renderFocus(name) {
        if(this.form) {
            this.form.renderFocus(name);
        }
    },
    setData(data) {
        this.data = data;
    },
    hasForm() {
        return this.params.form;
    },
    getTitle() {
        return this.params.title;
    },
    getStack() {
        return this.$stack;
    },
    getBody() {
        return this.$body;
    },
    getForm() {
        return this.$body;
    },
    getButtonPrimary() {
        return this.$footer.find('.rx-form-button-primary');
    },
    getFooter() {
        return this.$footer;
    },
    getFormItem(name) {
        return (this.form) ? this.form.getItem(name) : null;
    },
    getInput(name) {
        return (this.form) ? this.form.getInput(name) : null;
    },
    getTool(name) {
        return (this.form) ? this.form.getTool(name) : null;
    },
    getData(name) {
        return (this.form) ? this.form.getData(name) : null;
    },

    // =private
    _build() {
        this.$stack = this.dom('<div>').addClass('rx-modal-stack');
    },
    _buildBody() {
        this.$body = this.dom('<div>').addClass('rx-modal-body');
        this.$stack.append(this.$body);
    },
    _buildFooter() {
        this.$footer = this.dom('<div>').addClass('rx-modal-footer');
        this.$stack.append(this.$footer);
    },
    _renderForm() {
        if (!this.params.form) return;

        this.form = this.app.create('form');
        this.form.create({
            data: this.data,
            setter: this.params.setter,
            getter: this.params.getter,
            items: this.params.form
        });

        // append
        this.$form = this.form.getElement();
        this.$body.append(this.$form);
    },
    _renderFooter() {
        this.footerbuttons = 0;
        let buttons = this.params.footer;
        if (!buttons) return;

        this.$footer.html('');

        // buttons
        for (let [key, item] of Object.entries(buttons)) {
            if (item === false) continue;

            var button = this.app.create('stack-button', key, this, item);
            this.$footer.append(button.getElement());
            this.footerbuttons++;
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'stack-button', {
    init(name, popup, obj) {
        this.prefix  = 'rx';
        this.name = name;
        this.obj = obj;
        this.popup = popup;

        this.$button = this.dom('<button>').addClass(this.prefix + '-form-button');
        this.$button.attr('data-name', this.name);
        this.$button.html(this.lang.parse(this.obj.title));
        this.$button.dataset('instance', this);

        if (this._has('type')) this.$button.addClass(this.prefix + '-form-button-' + this.obj.type);
        if (this._has('classname')) this.$button.addClass(this.obj.classname);
        if (this._has('fullwidth')) this.$button.addClass(this.prefix + '-form-button-fullwidth');
        if (this._has('right')) this.$button.addClass(this.prefix + '-form-button-push-right');

        // event
        this.$button.on('click.' + this.prefix + '-popup-button' + this.uuid, this._catch.bind(this));
    },
    getName() {
        return this.name;
    },
    getElement() {
        return this.$button;
    },
    invokeCommand() {
        this._invoke();
    },


    // private
    _has(name) {
        return Object.prototype.hasOwnProperty.call(this.obj, name);
    },
    _catch(e) {
        e.preventDefault();
        e.stopPropagation();

        if (this._has('command')) {
            this._invoke(e);
        }
        else if (this._has('close')) {
            this.app.popup.close();
        }
    },
    _invoke(e) {
        this.app.api(this.obj.command, this.popup, this.name, e);
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'upload', {
    defaults: {
        type: 'image',
        box: false,
        url: false,
        cover: true, // 'cover'
        name: 'file',
        data: false,
        multiple: true,
        placeholder: false,
        hidden: true,
        target: false,
        success: false,
        error: false,
        remove: false,
        trigger: false,
        input: false
    },
    init($el, params, trigger) {
        this.eventname = 'rx-upload';

        if ($el) {
            this._build($el, params, trigger);
        }
    },
    send(e, files, params, trigger) {
        this.p = this._buildParams(params, trigger);
        this._send(e, files);
    },
    complete: function(response, e) {
        this._complete(response, e);
    },

    // api
    setImage(url) {
        if (this.p.input) return;

        if (this.$image) this.$image.remove();
        if (this.Redactoremove) this.Redactoremove.remove();

        if (url === '') {
            this.$placeholder.show();
        }
        else {
            this.$placeholder.hide();
            this._buildImage(url);

            if (this.p.remove) {
                this._buildRemove();
            }
        }
    },

    // build
    _build($el, params, trigger) {
        this.p = this._buildParams(params, trigger);
        this.$element = this.dom($el);

        var tag = this.$element.get().tagName;
        if (tag === 'INPUT') {
            this._buildByInput();
        }
        else {
            this._buildByBox();
        }
    },
    _buildImage(url) {
        this.$image = this.dom('<img>');
        this.$image.attr('src', url);
        this.$box.append(this.$image);

        if (this.p.input === false) {
            this.$box.off('click.' + this.eventname);
            this.$image.on('click.' + this.eventname, this._click.bind(this));
        }
    },
    _buildRemove() {
        this.Redactoremove = this.dom('<span>');
        this.Redactoremove.addClass('rx-upload-remove');
        this.Redactoremove.on('click', this._removeImage.bind(this));
        this.$box.append(this.Redactoremove);
    },
    _buildParams(params, trigger) {
        params = Redactor.extend(true, this.defaults, params);
        if (trigger) params.trigger = trigger;

        return params;
    },
    _buildByInput() {

        this.$input = this.$element;

        // box
        if (this.p.box) {
            this._buildBox();
            this._buildPlaceholder();
        }
        // input
        else {
            this.p.input = true;
        }

        this._buildAccept();
        this._buildMultiple();
        this._buildEvents();
    },
    _buildByBox() {
        this._buildInput();
        this._buildAccept();
        this._buildMultiple();
        this._buildBox();
        this._buildPlaceholder();
        this._buildEvents();
    },
    _buildBox() {
        this.$box = this.dom('<div>').addClass('rx-form-upload-box');
        this.$element.before(this.$box);

        // cover
        if (this.p.cover === false) {
            this.$box.addClass('rx-form-upload-cover-off');
        }

        // hide
        if (this.p.hidden) {
            this.$element.hide();
        }
    },
    _buildPlaceholder() {
        if (!this.p.placeholder) return;
        this.$placeholder = this.dom('<span>').addClass('rx-form-upload-placeholder');
        this.$placeholder.html(this.p.placeholder);
        this.$box.append(this.$placeholder);
    },
    _buildInput() {
        this.$input = this.dom('<input>');
        this.$input.attr('type', 'file');
        this.$input.attr('name', this._getUploadParam());
        this.$input.hide();

        this.$element.before(this.$input);
    },
    _buildAccept() {
        if (this.p.type !== 'image') return;

        var types = this.opts.get('image.types').join(',');
        this.$input.attr('accept', types);
    },
    _buildMultiple() {
        if (this.p.type !== 'image') return;

        if (this.p.multiple) {
            this.$input.attr('multiple', 'multiple');
        }
        else {
            this.$input.removeAttr('multiple');
        }
    },
    _buildEvents() {
        this.$input.on('change.' + this.eventname + '-' + this.uuid, this._change.bind(this));

        if (this.p.input === false) {
            this.$box.on('click.' + this.eventname, this._click.bind(this));
            this.$box.on('drop.' + this.eventname, this._drop.bind(this));
            this.$box.on('dragover.' + this.eventname, this._dragover.bind(this));
            this.$box.on('dragleave.' + this.eventname, this._dragleave.bind(this));
        }
    },
    _buildData(name, files, data) {
        if (this.p.multiple === 'single') {
            data.append(name, files[0]);
        }
        else if (this.p.multiple) {
            for (var i = 0; i < files.length; i++) {
                data.append(name + '[]', files[i]);
            }
        }
        else {
            data.append(name + '[]', files[0]);
        }

        return data;
    },

    // remove
    _removeImage(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (this.$image) this.$image.remove();
        if (this.Redactoremove) this.Redactoremove.remove();

        this.$placeholder.show();

        if (this.p.input === false) {
            this.$box.on('click.' + this.eventname, this._click.bind(this));
        }

        if (e) {
            this.app.api(this.p.remove, e);
        }
    },

    // get
    _getUploadParam() {
        return this.p.name;
    },


    // events
    _click(e) {
        e.preventDefault();
        this.$input.click();
    },
    _change(e) {
        this._send(e, this.$input.get().files);
    },
    _drop(e) {
        e.preventDefault();
        this._send(e);
    },
    _dragover(e) {
        e.preventDefault();
        this._setStatus('hover');
        return false;
    },
    _dragleave(e) {
        e.preventDefault();
        this._removeStatus();
        return false;
    },

    // set
    _setStatus(status) {
        if (this.p.input || !this.p.box) return;
        this._removeStatus();
        this.$box.addClass('rx-form-upload-' + status);
    },

    // remove
    _removeStatus() {
        if (this.p.input || !this.p.box) return;
        var status = ['hover', 'error'];
        for (var i = 0; i < status.length; i++) {
            this.$box.removeClass('rx-form-upload-' + status[i]);
        }
    },

    // send
    _send(e, files) {
        files =  files || e.dataTransfer.files;

        var data = new FormData();
        var name = this._getUploadParam();
        let utils = this.app.create('utils');

        data = this._buildData(name, files, data);
        data = utils.extendData(data, this.p.data);

        // send data
        this._sendData(e, files, data);
    },
    _sendData(e, files, data) {
        if (typeof this.p.url === 'function') {
            this.p.url.call(this.app, this, { data: data, files: files, e: e });
        }
        else {
            this.app.progress.show();
            this.ajax.post({
                url: this.p.url,
                data: data,
                before: function(xhr) {
                    var event = this.app.broadcast('upload.before.send', { xhr: xhr, data: data, files: files, e: e });
                    if (event.isStopped()) {
                        this.app.progress.hide();
                        return false;
                    }
                }.bind(this),
                success: function(response) {
                    this._complete(response, e);
                }.bind(this),
                error: function(response) {
                    this._complete(response, e);
                }.bind(this)
            });
        }
    },

    // complete
    _complete(response, e) {
        if (response && response.error) {
            this._setStatus('error');

            if (this.p.error) {
                this.app.broadcast('upload.error', { response: response });
                this.app.api(this.p.error, response, e);
            }
        }
        else {
            this._removeStatus();
            this._trigger(response);

            if (this.p.success) {
                this.app.broadcast('upload.complete', { response: response });
                this.app.api(this.p.success, response, e);
            }
        }

        setTimeout(function() {
            this.app.progress.hide();
        }.bind(this), 500);
    },
    _trigger(response) {
        if (this.p.trigger) {
            if (response && response.url) {
                var instance = this.p.trigger.instance;
                var method = this.p.trigger.method;
                instance[method].call(instance, response.url);
            }
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'colorpicker', {
    build(params) {
        this.$colorpicker = this.dom('<div class="rx-colorpicker rx-colorpicker-' + this.uuid + '">');

        this._build(params, this.$colorpicker);
        this.app.$body.append(this.$colorpicker);

        this._buildPosition();
        this._buildEvents();

        return this.$colorpicker;
    },
    create(params) {
        let $dropdown = this.dom('<div class="rx-dropdown-box">');
        this._build(params, $dropdown);
        return $dropdown;
    },

    // =private
    _buildPosition(e) {
        let offset = this.params.$toggle.offset();
        let width = this.params.$toggle.width();
        //let scrollTop = (this.app.scroll.isTarget() && e) ? this.app.scroll.getScrollTop() : 0;
        let top = offset.top;
        let left = offset.left + width;

        if (offset.left === 0) {
            this.$colorpicker.hide();
        }
        else {
            this.$colorpicker.show();
        }

        this.$colorpicker.css({
            top: top + 'px',
            left: left + 'px'
        });

        // depth
        this._buildDepth();
    },
    _buildDepth() {
        if (this.opts.is('bsmodal')) {
            this.$colorpicker.css('z-index', 1061);
        }
        if (this.app.isProp('fullscreen')) {
            this.$colorpicker.css('z-index', 10001);
        }
    },
    _buildEvents() {
        this.app.scroll.getTarget().on('resize.rx-colorpicker scroll.rx-colorpicker', this._buildPosition.bind(this));
    },
    _build(params, $target) {
        let defs = {
            $toggle: false,
            colors: false,
            method: false,
            style: {},
            name: 'color',
            tabs: false,
            set: false,
            input: false,
            remove: false
        };

        this.params = Redactor.extend({}, defs, params);
        this.currentColor = (this.params.style.color) ? this.params.style.color : false;
        this.currentBackgroundColor = (this.params.style.background) ? this.params.style.background : false;

        // layers
        let $layer = this.dom('<div class="rx-dropdown-layer rx-dropdown-layer-' + this.params.name + '">').attr('data-type', this.params.name);
        let $box, button;

        // tabs
        if (this.params.tabs) {
            let $tabs = this.dom('<div class="rx-dropdown-tabs">');
            $target.append($tabs);

            let tabs = this.params.tabs;
            for (let i = 0; i < tabs.length; i++) {
                let $tab = this.dom('<a href="#">').attr('data-tab', tabs[i]).addClass('rx-dropdown-tab rx-dropdown-tab-' + tabs[i]).html(this.lang.get('colorpicker.' + tabs[i]));
                $tab.on('click.rx-dropdown-tab', this._selectTab.bind(this));

                if (i === 0) {
                    $tab.addClass('active');
                }

                $tabs.append($tab);

                // colors
                $box = this._buildPicker(tabs[i]);

                // layer
                $layer = this.dom('<div class="rx-dropdown-layer rx-dropdown-layer-' + tabs[i] + '">').attr('data-type', tabs[i]);
                $layer.append($box);
                $layer.on('mouseover', this._outColor.bind(this));

                // input
                this._createInput($layer, tabs[i]);

                // remove
                if (this.params.remove && this.params.remove[tabs[i]]) {
                    let value = this.params.remove[tabs[i]];
                    button = this.app.create('button', 'remove', this._createRemoveButton(tabs[i], value), false, 'dropdown');
                    $layer.append(button.getElement());

                }

                // hide
                if (i === tabs.length-1) {
                    $layer.hide();
                }

                $target.append($layer);
            }

        }
        else {
            $box = this._buildPicker(this.params.name);
            $layer.append($box);
            $layer.on('mouseover', this._outColor.bind(this));

            // input
            this._createInput($layer, this.params.name);

            // remove
            if (this.params.remove) {
                button = this.app.create('button', 'remove', this._createRemoveButton(this.params.name, this.params.remove), false, 'dropdown');
                $layer.append(button.getElement());
            }

            $target.append($layer);
        }
    },
    _createInput($layer, type) {
        if (!this.params.input) return;

        let $item = this.dom('<div>').addClass('rx-form-box');
        let $label = this.dom('<label>').addClass('rx-form-label').html(this.lang.get('colorpicker.set-color'));
        let $box = this.dom('<div>').addClass('rx-form-flex');
        let $input = this.dom('<input type="input">').addClass('rx-form-input rx-form-input-' + type + ' rx-in-tool');
        let $button = this.dom('<button">').attr('data-rule', type).addClass('rx-form-button rx-in-tool').html('&rarr;');
        $button.on('click', this._setFromInput.bind(this));

        let value = (type === 'color') ? this.currentColor : this.currentBackgroundColor;
        value = (!value) ? '' : value;
        $input.val(value);

        $box.append($input);
        $box.append($button);

        $item.append($label);
        $item.append($box);
        $layer.append($item);

        this.input = true;
    },
    _createRemoveButton(type, command) {
        return {
            position: 'last',
            title: this.lang.get('colorpicker.remove-' + type),
            command: command
        };
    },
    _inColor(e) {
        if (!this.input) return;

        let $el = this.dom(e.target).closest('a');
        let type = $el.data('rule');
        let value = $el.attr('rel');
        let $layer = $el.closest('.rx-dropdown-layer');
        let $input = $layer.find('.rx-form-input-' + type);

        if (!$layer.attr('data-color')) {
            let oldValue = $input.val();
            oldValue = (oldValue === 'false' || oldValue === '') ? 'empty' : oldValue;

            $layer.attr('data-color', oldValue );
        }

        $input.val(value);
    },
    _outColor(e) {
        if (!this.input) return;

        let $el = this.dom(e.target);
        let $target = $el.closest('.rx-dropdown-color-box');
        if ($target.length === 0) {
            let $layer = $el.closest('.rx-dropdown-layer');
            let type = $layer.data('type');
            let color = $layer.attr('data-color');
            let $input = $layer.find('.rx-form-input-' + type);
            if (color) {
                $input.val((color === 'empty') ? '' : color);
                $layer.removeAttr('data-color');
            }
        }

    },
    _getColorToInput($el, type) {

        return ;

    },
    _selectTab(e) {
        e.preventDefault();
        e.stopPropagation();

        let $target = this.dom(e.target);
        let $dropdown = $target.closest('.rx-dropdown-box');
        let name = $target.attr('data-tab');

        $dropdown.find('.rx-dropdown-layer').hide();
        $dropdown.find('.rx-dropdown-tab').removeClass('active');
        $dropdown.find('.rx-dropdown-layer-' + name).show();
        $dropdown.find('.rx-dropdown-tab-' + name).addClass('active');
    },
    _buildPicker(name) {
        let $box = this.dom('<div class="rx-dropdown-color-box rx-dropdown-box-' + name + '">');
        let $colorBox = this.dom('<div class="rx-dropdown-swatches">');
        let rule = (name == 'background') ? 'background' : 'color';
        let len = this.params.colors.length;
        let row = this.opts.get('colorpicker.row');
        let size = this.opts.get('colorpicker.size');
        let wrap = this.opts.get('colorpicker.wrap');
        let width = this.opts.get('colorpicker.width');
        if (wrap) {
            $colorBox.addClass('rx-dropdown-swatches-wrap');
        }
        if (width) {
            $colorBox.css('max-width', width);
        }

        for (let [key, item] of Object.entries(this.params.colors)) {
            let $div = this.dom('<div class="rx-dropdown-swatches-colors">');
            if (row) {
                $div.addClass('rx-dropdown-swatches-colors-row');
            }

            for (let i = 0; i < item.length; i++) {
                let color = item[i];
                let $swatch = this.dom('<a href="#" tabindex="-1" class="rx-dropdown-swatch">');
                if (size) {
                    $swatch.addClass('rx-dropdown-swatch-size-' + size);
                }

                $swatch.attr({ 'rel': color, 'data-rule': rule });
                $swatch.css({ 'background': color });
                $swatch.on('click', this._set.bind(this));
                $swatch.on('mouseover', this._inColor.bind(this));
                $swatch.attr({ 'title': key + '-' + i });

                if (color === '#fff' || color === '#ffffff') {
                    $swatch.addClass('rx-dropdown-color-contrast');
                }

                if (rule === 'color' && this.currentColor === color) {
                    $swatch.addClass('active');
                }
                if (rule === 'background' && this.currentBackgroundColor === color) {
                    $swatch.addClass('active');
                }

                $div.append($swatch);
            }

            $colorBox.append($div);
        }

        $box.append($colorBox);
        return $box;
    },
    _setFromInput(e) {
        e.preventDefault();
        e.stopPropagation();

        let $el = this.dom(e.target);
        let value = $el.prev().val();
        if (value === '') return;

        let utils = this.app.create('utils');
        let color = utils.normalizeColor(value);
        let style = ($el.data('rule') === 'color') ? { 'color': color } : { 'background': color };
        let params = { tag: 'span', style: style };

        this._call(color, params);
    },
    _set(e) {
        e.preventDefault();
        e.stopPropagation();

        let $el = this.dom(e.target).closest('a'),
            color = $el.attr('rel'),
            style = ($el.data('rule') === 'color') ? { 'color': color } : { 'background': color },
            params = { tag: 'span', style: style };

        this._call(color, params);
    },
    _call(color, params) {
        if (this.params.method) {
            this.params.method.call(this, color);
        }
        else {
            this.app.api(this.params.set, params);
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('class', 'form', {
    init() {
        this.tools = {};
        this.data = false;
    },
    create(params) {
        let defs = {
            title: false,
            data: false,
            width: false,
            items: false,
            focus: false,
            setter: false,
            getter: false,
            footer: false

        };

        this.params = Redactor.extend({}, defs, params);
        this.data = this.params.data;

        // build
        this._build();
        this._buildTitle();
        this._buildData();
        this._buildForm();
        this._buildFocus();
        this._buildFooter();
    },
    renderFocus(name) {
        this._buildFocus(name);
    },
    setData(data) {
        this.data = data;
    },
    getSetter() {
        return this.params.setter;
    },
    getElement() {
        return this.$form;
    },
    getItem(name) {
        let tool = this.getTool(name);

        return (tool) ? tool.getInput().closest('.rx-form-item') : this.dom();
    },
    getInput(name) {
        let tool = this.getTool(name);
        return (tool) ? tool.getInput() : this.dom();
    },
    getTool(name) {
        return (typeof this.tools[name] !== 'undefined') ? this.tools[name] : false;
    },
    getData(name) {
        let data;
        if (name) {
            if (typeof this.tools[name] !== 'undefined') {
                data = this.tools[name].getValue();
            }
        }
        else {
            data = {};
            Object.keys(this.tools).forEach(function(key) {
                data[key] = this.tools[key].getValue();
            }.bind(this));
        }

        return data;
    },

    // =private
    _build() {
        this.$form = this.dom('<div>').addClass('rx-form rx-form-' + this.uuid);

        if (this.params.width) {
            this.$form.css('width', this.params.width);
        }
    },
    _buildData() {
        if (!this.data) {
            this.data = (this.params.getter) ? this.app.api(this.params.getter, this) : false;
        }
    },
    _buildFocus(name) {
        name = name || this.params.focus;
        if (name && typeof this.tools[name] !== 'undefined') {
            this.tools[name].setFocus();
        }
    },
    _buildTitle() {
        if (!this.params.title) return;

        this.$title = this.dom('<div>').addClass('rx-form-title');
        this.$title.html(this.lang.parse(this.params.title));

        this.$form.append(this.$title);
    },
    _buildFooter() {
        if (!this.params.footer) return;

        this.$footer = this.dom('<div>').addClass('rx-form-footer');
        this.$form.append(this.$footer);

        let buttons = this.params.footer;
        for (let [key, item] of Object.entries(buttons)) {
            var button = this.app.create('stack-button', key, this, item);
            this.$footer.append(button.getElement());
        }
    },
    _buildForm() {
        this._renderTools();
        this._renderData();

        // enter events
        this.$form.find('input[type=text],input[type=url],input[type=email]').on('keydown.rx-form', function(e) {
            if (e.which === 13) {
                e.preventDefault();
                return false;
            }
        }.bind(this));
    },
    _renderTools() {
        for (let [key, item] of Object.entries(this.params.items)) {
            if (item.title) {
                let $title = this.dom('<div class="rx-form-section-title">');
                $title.html(this.lang.parse(item.title));
                this.$form.append($title);
                continue;
            }

            if (key === 'flex') {
                let $target = this.dom('<div class="rx-form-container-flex">');
                this.$form.append($target);
                for (let [name, val] of Object.entries(item)) {
                    this._renderTool(name, val, $target);
                }
            }
            else {
                this._renderTool(key, item, this.$form);
            }
        }
    },
    _renderTool(name, obj, $target) {
        let tool = this.app.create('tool.' + obj.type, name, obj, this, this.data);
        let $tool = tool.getElement();
        if ($tool) {
            this.tools[name] = tool;
            $target.append($tool);
        }
    },
    _renderData() {
        if (!this.data) return;
        for (let name in this.data) {
            if (typeof this.tools[name] !== 'undefined') {
                this.tools[name].setValue(this.data[name]);
            }
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'container', {
    init() {
        this.containers = {};
        this.targets = {};
        this.blur = 'rx-in-blur';
        this.focus = 'rx-in-focus';
    },
    start() {
        // build
        this.$container = this._createMain();


        // bootstrap modal
        this._buildBSModal();
        this._build(this.$container, this.opts.get('containers.main'));

        this._buildExternal('toolbox');
        this._buildExternal('statusbar');
    },
    stop() {
        this.app.editor.destroy();

        for (let [key, item] of Object.entries(this.containers)) {
            item.remove();
        }
        this.$container.remove();
        this.containers = {};
        this.targets = {};
    },
    get(name) {
        return (name === 'main') ? this.$container : this.containers[name];
    },
    toggle() {
        this._focusExternal('toolbox');
        this._focusExternal('statusbar');
    },
    setFocus() {
        this.$container.removeClass(this.blur).addClass(this.focus);
    },
    setBlur() {
        this.$container.removeClass(this.focus).addClass(this.blur);
    },
    hasFocus() {
        return this.$container.hasClass(this.focus);
    },
    isExternal(name) {
        return this.targets[name];
    },

    // private
    _build(target, containers) {
        let name,
            i = 0,
            max;

        for (i = 0, max = containers.length; i < max; i++) {
            name = containers[i];
            this.containers[name] = this._createContainer(name, target);

            // nested
            this._buildNested(name, this.containers[name]);
        }
    },
    _buildNested(name, target) {
        let containers = this.opts.get('containers.' + name);
        if (containers) {
            this._build(target, containers);
        }
    },
    _buildExternal(name) {
        let $containers = this.app.$body.find('.rx-' + name + '-external');
        $containers.css('display', 'none');
        $containers.last().css('display', '');
    },
    _buildBSModal() {
        this.opts.set('bsmodal', (this.$container.closest('.modal-dialog').length !== 0));
    },
    _buildTarget(target) {
        return (target) ? this.dom(target) : this.$container;
    },
    _focusExternal(name) {
        let $containers = this.app.$body.find('.rx-' + name + '-external');
        $containers.css('display', 'none');

        let $current = this.app.$body.find('.rx-' + name + '-external.rx-' + name + '-container-' + this.uuid);
        $current.css('display', '');
    },
    _createMain() {
        let $container = this.dom('<div>').attr('rx-uuid', this.uuid).addClass('rx-container rx-container-' + this.uuid);

        // container style
        if (!this.opts.is('nocontainer')) {
            $container.addClass('rx-main-container');
        }

        // place
        this.app.element.after($container);

        return $container;
    },
    _createContainer(name, target) {
        // local
        let externalTarget = (name === 'toolbox') ? this.opts.get('toolbar.target') : this.opts.get(name + '.target');
        externalTarget = (name === 'toolbar') ? false : externalTarget;
        if (externalTarget) {
            this.targets[name] = externalTarget;
            target = externalTarget;
        }

        // build
        let $container = this.dom('<div>').addClass('rx-' + name + '-container rx-' + name + '-container-' + this.uuid);
        let $target = this._buildTarget(target);

        // external classname
        if (this.isExternal(name)) {
            $container.addClass('rx-' + name + '-external');
        }

        // append
        $target.append($container);

        return $container;
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'source', {
    init() {
        this.eventname = 'rx-source-events';
    },
    start() {
        // build
        this._build();
    },
    setContent(content) {
        this.$source.val(content);
    },
    getContent() {
        let html = this.$source.val();
        html = this.app.codemirror.val(html);

        return html;
    },
    getElement() {
        return this.$source;
    },
    getSource() {
        return this.$source;
    },
    update(html) {
        this.app.editor.setSource(html);
    },
    is() {
        const $cont = this.app.container.get('source');
        if ($cont.length === 0) return false;

        return ($cont.css('display') !== 'none');
    },
    toggle() {
        if (this.is()) {
            this.close();
        }
        else {
            this.open();
        }
    },
    open() {
        let editor = this.app.container.get('editor'),
            source = this.app.container.get('source'),
            tidy = this.app.create('tidy'),
            cm,
            html,
            height;

        // broadcast
        this.app.broadcast('source.before.open');

        // content
        html = this.app.editor.getContent();
        html = tidy.parse(html);

        // height
        height = editor.height();

        this.$source.height(height);
        this.$source.val(html);
        this.$source.on('focus.' + this.eventname, this._handleFocus.bind(this));
        this.$source.on('input.' + this.eventname, this._handleChanges.bind(this));
        this.$source.on('keydown.' + this.eventname, this.app.input.handleTextareaTab.bind(this));

        this.app.blocks.unset();
        this.app.block.unset();
        this.app.editor.unsetSelectAll();

        // toggle
        editor.hide();
        source.show();

        // codemirror
        cm = this.app.codemirror.create({ el: this.$source, height: height, focus: true });
        if (cm) {
            cm.on('change', this._handleChanges.bind(this));
            cm.on('focus', this._handleFocus.bind(this));
        }

        // ui
        this.app.dropdown.close();
        this.app.modal.close();
        this.app.control.close();
        this.app.context.close();
        this.app.path.disable();
        this.app.extrabar.disable();
        this.app.statusbar.disable();
        this.app.toolbar.disable();
        this.app.toolbar.disableSticky();
        this.app.toolbar.setToggled('html');

        // broadcast
        this.app.broadcast('source.open');
    },
    close() {
        if (!this.is()) return;

        // broadcast
        this.app.broadcast('source.before.close');

        let editor = this.app.container.get('editor'),
            source = this.app.container.get('source'),
            html = this.getContent();

        this.app.codemirror.destroy();

        source.hide();
        editor.show();

        // set code
        this.app.editor.setContent({ html: html, caret: 'start' });

        // ui
        this.app.path.enable();
        this.app.extrabar.enable();
        this.app.statusbar.enable();
        this.app.toolbar.enable();
        this.app.toolbar.enableSticky();
        this.app.toolbar.unsetToggled('html');

        // broadcast
        this.app.broadcast('source.close');
    },

    // private
    _build() {
        this.$source = this.dom('<textarea>');
        this.$source.addClass('rx-source');
        this.$source.attr('data-gramm_editor', false);

        this.app.container.get('source').append(this.$source);
    },
    _handleFocus() {
        this.app.editor.setFocus();
    },
    _handleChanges(e) {
        let html = this.getContent();

        this.update(html);
        this.app.broadcast('source.change', { e: e });
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'editor', {
    init() {
        this.savedSelection = false;
        this.rawhtml = '';
    },
    start() {
        // build
        this._build();
        this._buildOptions();
        this._buildBlurClass();
        this._buildAccessibility();
        this._buildEditable();
        this._buildContent();
        this._buildFrame();

        // load
        this._load();
    },
    stop() {
        if (this.$overlay) {
            this.$overlay.remove();
        }

        if (this.app.element.isTextarea()) return;

        this.$editor.removeClass('rx-editor rx-empty rx-editor-breakline ' + this.opts.get('classname'));
        this.$editor.removeAttr('style dir');

        if (this.savedStyles) this.$editor.attr('style', this.savedStyles);
        if (this.savedDir) this.$editor.attr('dir', this.savedDir);

        this.$editor.html(this.getContent());
    },
    load() {
        if (this.opts.is('focus')) {
            this.setFocus(this.opts.get('focus'));
        }
    },
    click() {
        // click to edit
        let selection = this.app.create('selection'),
            block = selection.getDataBlock();

        setTimeout(function() {
            this.app.block.set(block);
        }.bind(this), 1);
    },
    disable() {
        this.$editor.addClass('rx-editor-disabled');

        // overlay
        this.$overlay = this.dom('<div>').addClass('rx-editor-overlay');
        this.app.container.get('main').append(this.$overlay);
    },
    enable() {
        this.$editor.removeClass('rx-editor-disabled');
        this.$overlay.remove();
    },
    destroy() {
        if (!this.app.element.isTextarea()) {
            this.$editor.removeClass('rx-editor rx-editor-' + this.uuid + ' rx-empty rx-editor-breakline rx-editor-disabled rx-placeholder');
            this.$editor.removeAttr('contenteditable data-gramm_editor');
            this.app.container.get('main').before(this.$editor);
            this.a11y.destroy();
        }
    },
    build() {
        let predefined = this.app.create('predefined');

        this.app.blocks.build();
        this.app.embed.build();
        this.app.image.observeStates();
        predefined.parse(this.$editor);
        this.app.observer.observe();
    },

    // save & restore
    save(el) {
        let instance,
            offset = this.app.create('offset');

        if (el !== false) {
            instance = this.app.block.get();
            el = (instance && !this.app.blocks.is()) ? instance.getBlock() : this.getEditor();
        }

        this.savedSelection = { el: el, offset: offset.get(el) };
    },
    restore(set) {
        if (!this.savedSelection) return;

        let el = this.savedSelection.el,
            offset = this.app.create('offset');

        let instance = this.dom(el).dataget('instance');
        if (instance && set !== false) {
            this.app.block.set(el);
        }

        if (el && this.savedSelection.offset) {
            el.focus();
        }

        if (this.savedSelection.offset) {
            offset.set(this.savedSelection.offset, el);
        }
        this.savedSelection = false;
    },

    // has
    hasFocus() {
        return this.app.container.hasFocus();
    },

    // select
    unsetSelectAll() {
        if (!this.isSelectAll()) return;

        this.$editor.removeClass('rx-select-all');

        // unset
        this.app.block.unset();
        this.app.blocks.unset();

        // broadcast
        this.app.broadcast('editor.unselect');
    },

    // get
    getLayout() {
        return this.$editor;
    },
    getEditor() {
        return this.$editor;
    },
    getRect() {
        let offset = this.$editor.offset(),
            width = this.$editor.width(),
            height = this.$editor.height(),
            top = Math.round(offset.top),
            left = Math.round(offset.left);

        return {
            top: top,
            left: left,
            bottom: top + height,
            right: left + width,
            width: width,
            height: height
        };
    },
    getWidth() {
        return this.$editor.width();
    },
    getHtml() {
        return this.getEditor().html();
    },
    getEmail(cleanup) {
        if (this.app.has('email')) {
            return this.app.email.getEmail(cleanup);
        }

        return this.getContent();
    },
    getContent(cleanup) {
        return this.content.getContent(cleanup);
    },
    getJson() {
        let data = this.getSourceJson() || {};
        data.blocks = this.content.getJson();

        return data;
    },
    getSourceJson() {
        return this.opts.get('data');
    },
    getSource() {
        return this.$source.val();
    },
    getRawHtml() {
        return this.rawhtml;
    },

    // set
    setContent(params) {
        let insertion = this.app.create('insertion');
        insertion.set(params);
    },
    setJson(data) {
        this.opts.set('data', data);
        this.content.set(data);
    },
    setHtml(html) {
        this.getEditor().html(html);
    },
    setEmpty() {
        let instance = this.app.block.create(),
            insertion = this.app.create('insertion');

        insertion.setEmpty();
        this.getEditor().append(instance.getBlock());

        // rebuild
        this.build();

        // focus
        this.setFocus('end');

        // broadcast
        this.app.broadcast('editor.empty');
    },
    setFocus(position) {
        let $target, i = 0, max;

        if (position) {
            position = (position === true) ? 'start' : position;
            $target = (position === 'start') ? this.app.blocks.get({ first: true }) : this.app.blocks.get({ last: true });

            this.app.block.set($target, position);
            this.app.container.setFocus();
        }
        else {
            if (this.hasFocus()) {
                return;
            }

            max = Redactor.instances.length;
            for (i = 0; i < max; i++) {
                if (Redactor.instances[i] !== this.app) {
                    Redactor.instances[i].editor.setBlur();
                }
            }

            this.app.container.setFocus();
            this.app.container.toggle();
            this.app.broadcast('editor.focus');
        }
    },
    setBlur(e) {
        if (!this.hasFocus() || !this.$editor) {
            return;
        }

        let event = this.app.broadcast('editor.before.blur', { e: e }),
            selection = this.app.create('selection');
        if (event.isStopped()) {
            if (e) e.preventDefault();
            return;
        }

        this.app.container.setBlur();
        selection.remove();

        if (!this.app.source.is()) {
            this.app.block.unset();
            this.app.blocks.unset();
            this.app.dropdown.close();
            this.app.modal.close();
            this.app.control.close();
            this.app.context.close();
            this.app.path.build();

            // unset
            this.app.toolbar.unsetActive();
            this.app.extrabar.unsetActive();
            this.app.context.unsetActive();
        }

        // broadcast
        this.app.broadcast('editor.blur', { e: e });
    },
    setSelectAll(blocks, broadcast) {
        if (this.isSelectAll()) return;

        let selection = this.app.create('selection');

        // class
        this.$editor.addClass('rx-select-all');

        // set blocks
        blocks = (blocks) ? blocks : this.app.blocks.get({ firstLevel: true });
        this.app.block.unset();
        this.app.blocks.set(blocks);
        selection.select(this.$editor);

        // broadcast
        if (broadcast !== false) {
            this.app.broadcast('editor.select');
        }
    },
    setSource(html) {
        this.$source.val(html);
    },
    setOutput(html) {
        if (!this.opts.is('output')) return;

        let selector = this.opts.get('output');
        let $el = this.dom(selector);
        let isInput = ['textarea', 'input'].includes($el.get().tagName.toLowerCase());

        isInput ? $el.val(html) : $el.html(html);
    },

    // insert
    insertContent(params) {
        let insertion = this.app.create('insertion');
        insertion.insert(params);
    },

    // is
    isSelectAll() {
        return this.$editor.hasClass('rx-select-all');
    },
    isEmpty() {
        let utils = this.app.create('utils');
        let html = this.getEditor().html();
        return utils.isEmptyHtml(html, true);
    },
    isEditor(el) {
        return (this.dom(el).get() === this.getEditor().get());
    },

    // private
    _build() {
        let source = false,
            $cont = this.app.container.get('editor');

        // build
        if (this.app.element.isTextarea()) {
            this.$editor = this.dom('<div>');
            this.$source = this.app.element;
        }
        else {
            this.$editor = this.app.element;
            this.$source = this.dom('<textarea>').hide();
            source = true;
        }

        // content styles
        if (!this.opts.is('nostyle')) {
            this.$editor.addClass(this.opts.get('classname'));
        }

        // breakline styles
        if (this.opts.is('breakline')) {
            this.$editor.addClass('rx-editor-breakline');
        }

        // utility styles
        this.$editor.addClass('rx-editor rx-editor-' + this.uuid + ' rx-empty');

        // append
        $cont.append(this.$editor);
        if (source) {
            $cont.append(this.$source);
        }
    },
    _buildEditable() {
        this.getEditor().attr('contenteditable', true);
    },
    _buildOptions() {
        let o = this.opts.dump(),
            dir = o.dir,
            width =  (o.width) ?  o.width : '100%';

        if (!this.app.element.isTextarea()) {
            this.savedStyles = this.app.element.attr('style');
            this.savedDir = this.app.element.attr('dir');
        }

        // width
        this.$editor.css('max-width', width);

        // dir
        if (this.app.element.attr('dir')) {
            dir = this.app.element.attr('dir');
        }
        this.$editor.attr('dir', dir);

        // padding
        this.$editor.css('padding', o.padding);

        // min height
        if (o.minHeight) {
            this.$editor.css('min-height', o.minHeight);
        }

        // max height
        if (o.maxHeight) {
            this.$editor.css({
                'max-height': o.maxHeight,
                'overflow': 'auto'
            });
        }

        // main container
        let $cont = this.app.container.get('main');
        if (!this.opts.is('container.border')) {
            $cont.css('border', 'none');
        }

        // grammar
        if (o.notranslate) this.$editor.addClass('notranslate');
        if (!o.spellcheck) this.$editor.attr('spellcheck', false);
        if (!o.grammarly) this.$editor.attr('data-gramm_editor', false);
    },
    _buildContent() {
        this.rawhtml = this.app.element.getHtml().trim();
        this.content = this.app.create('content');
    },
    _buildBlurClass() {
        if (this.opts.get('clicktoedit')) {
            this.app.container.setFocus();
        }
        else {
            this.app.container.setBlur();
        }
    },
    _buildAccessibility() {
        this.a11y = this.app.create('accessibility', this);
    },
    _buildDraggable() {
        let $items = this.app.$body.find('[data-rx-drop-id]');
        $items.each(function($node) {
            $node.attr('draggable', true);
            $node.on('dragstart', function(e) {
                let $target = this.dom(e.target);
                let id = $target.attr('data-rx-drop-id');
                e.dataTransfer.setData('item', id);
            }.bind(this));
        }.bind(this));

    },
    _buildFrame() {
        if (!this.opts.is('iframe')) return;

        this._iframe = window.parent.document.getElementById(this.opts.get('iframe'));
        this._iframe.setAttribute('scrolling', 'no');

        const config = { childList: true, subtree: true };
        const observer = new MutationObserver(this._resizeIframe.bind(this));

        this.app.$win.on('load', this._resizeIframe.bind(this));
        observer.observe(document.body, config);
        this._resizeIframe();
    },
    _load() {
        try {
            this._loaded();
        }
        catch(e) {
            Redactor.error(e);
        }
    },
    _loaded() {
        this.app.event.build();
        this.app.placeholder.trigger();
        this.app.blocks.build();
        this.app.sync.build();
        this.app.embed.build();
        this.app.observer.build();

        // draggable
        this._buildDraggable();

        // broadcast
        this.app.broadcast('editor.load');
    },
    _resizeIframe() {
        const height = document.body.scrollHeight;
        this._iframe.style.height = height + 'px';
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'theme', {
    init() {
        this.dataAttr ='rx-data-theme';
    },
    start() {
        // build
        this._build();
    },
    stop() {
        this.app.container.get('main').removeAttr(this.dataAttr);
    },
    destroy() {
        this._mediaQuery().removeEventListener('change', this._change.bind(this));
    },
    set(theme) {
        this.app.container.get('main').attr(this.dataAttr, theme);

        // trigger
        this.app.control.updateTheme(theme);
        this.app.tooltip.updateTheme(theme);
        this.app.dropdown.updateTheme(theme);
        this.app.modal.updateTheme(theme);
        this.app.context.updateTheme(theme);

        // broadcast
        this.app.broadcast('editor.theme', theme);
    },
    get() {
        return this.app.container.get('main').attr(this.dataAttr);
    },

    // private
    _detect() {
        let theme = 'light';
        if (localStorage.getItem('theme') && localStorage.getItem('theme') === 'dark') {
            theme = 'dark';
        }
        else if (!window.matchMedia) {
            return theme;
        }
        else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            theme = 'dark';
        }

        return theme;
    },
    _change() {
        let theme = this._detect();
        this.set(theme);
    },
    _build() {
        let theme = this._detect(),
            appTheme = this.opts.get('theme');

        this.opts.set('globalTheme', theme);
        if (appTheme == 'auto') {
            this._mediaQuery().addEventListener('change', this._change.bind(this));
        }
        else {
            theme = appTheme;
        }

        this.set(theme);
    },
    _mediaQuery() {
        return window.matchMedia('(prefers-color-scheme: dark)');
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'addbar', {
    init() {
        this.customButtons = {};
        this.removeButtons = [];
    },
    add(name, obj) {
        this.customButtons[name] = obj;
        this.app.button.add(name, obj);
    },
    remove(name) {
        if (Array.isArray(name)) {
            for (let i = 0; i < name.length; i++) {
                this.removeButtons.push(name[i]);
            }
        }
        else {
            this.removeButtons.push(name);
        }
    },
    popup(e, button) {
        let buttons = [...this.opts.get('popups.addbar')],
            addbarItems = this.opts.get('addbarItems') || {},
            dropdown;

        this.customButtons = Redactor.extend(true, {}, addbarItems, this.customButtons);

        dropdown = this.app.create('dropdown', 'addbar', { items: buttons, extend: this.customButtons, remove: this.removeButtons });
        this.app.dropdown.open(e, button, dropdown);
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'block', {
    init() {
        this.instance = false;
        this.$block = false;
        this.tool = false;
    },
    create(html) {
        let instance = this.app.create('block.text');
        if (html) {
            instance.getBlock().html(html);
        }

        return instance;
    },
    createHtml(html) {
        return this.create(html).getOuterHtml();
    },
    trigger(mutation) {
        if (!this.is()) return;
        if (this.instance.isEditable() && this.instance.isEmpty()) {
            this.instance.setEmpty();
        }

        if (mutation.type === 'childlist' || mutation.type === 'characterData') {
            this.instance.trigger(mutation);
        }
    },
    isTool() {
        return this.tool;
    },
    setTool(name) {
        this.tool = name;
        this.app.observer.trigger = (name) ? false : true;
        if (typeof name === 'string' || name === true) {
            this.unset();
        }
    },

    is($el) {
        return ($el) ? this._isBlockActive($el) : this.get();
    },
    setParent(params) {
        if (!this.is()) return;

        // popup
        this.app.dropdown.close();
        this.app.modal.close();

        // parent
        let parent;
        if (params && params.cell) {
            parent = this.instance.getClosest('cell');
        }
        else {
            parent = this.instance.getClosest(['list', 'wrapper', 'layout', 'todo', 'table']);
        }

        if (parent) {
            this.set(parent, 'force');
            //this.app.control.trigger();
        }
    },
    set(el, caret, force) {
        if (!el) return;

        // check if active
        if (force !== true && this._isBlockActive(el)) {
            return;
        }

        // unset
        this.app.editor.unsetSelectAll();
        this.app.blocks.unset();
        this.unset();

        // set
        this.instance = this._getInstance(el);
        if (!this.instance) {
            return;
        }

        // check noneditable
        if (this.instance.isType('noneditable') && !this.opts.is('noneditable.select')) {
            this.instance = false;
            return false;
        }

        // parent
        let parent = this.instance.isParent();
        if (parent) {
            this.instance = this.instance.getParent();
        }

        // set block & focus
        this.$block = this.instance.getBlock();
        this.$block.addClass('rx-block-focus');

        // control focus
        if (this.opts.is('block.outline') && this.opts.is('control') && !this.instance.isFocusable() && this.instance.getControl()) {
            this.$block.addClass('rx-block-control-focus');
        }

        // caret
        this._setCaret(caret);

        // ui
        this.app.toolbar.build();
        this.app.extrabar.build();
        this.app.control.build();
        this.app.path.build();

        // broadcast
        this.app.broadcast('block.set', { instance: this.instance });
    },
    setData(data) {
        if (!this.instance) return;

        this.instance.setData(data);
    },
    unset() {
        if (!this.instance) return;

        // remove focus
        if (this.$block) {
            this.$block.removeClass('rx-block-focus rx-block-control-focus');
        }

        // reset
        this.instance = false;
        this.$block = false;
        this.setTool(false);

        // ui
        this.app.control.close();
        this.app.context.close();
        this.app.path.build();

        // broadcast
        this.app.broadcast('block.unset');
    },
    get() {
        return this.instance;
    },
    getData() {
        return (this.instance) ? this.instance.getData() : null;
    },
    unwrap() {
        if (!this.is()) return;
        if (!this.instance.isType(['layout', 'wrapper'])) return;

        this.app.dropdown.close();

        let type = this.instance.getType(),
            $block = this.instance.getBlock(),
            $first = $block.children().first();

        if (type === 'wrapper') {
            $block.unwrap();
        }
        else if (type === 'layout') {
            $first = $first.children().first();

            $block.find('[data-rx-type=column]').unwrap();
            $block.unwrap();
        }

        this.set($first, 'start');
        this.app.editor.build();
    },
    remove(params) {
        if (!this.is()) return;

        // popup
        this.app.dropdown.close();
        this.app.modal.close();

        let type = this.instance.getType(),
            defs = {
                traverse: true
            },
            p = Redactor.extend({}, defs, params),
            data = (type === 'image') ? this._getDataImage() : {};


        if (p.traverse) {
            this.instance.remove({ traverse: true });
        }
        else {
            this.instance.remove();
            this.unset();
        }

        // broadcast image
        if (type === 'image') {
            this.app.broadcast('image.remove', data);
        }

        // broadcast
        this.app.broadcast('block.remove', { type: type });

        // check empty
        if (this.app.editor.isEmpty()) {
            this.app.editor.setEmpty();
        }
    },
    change(instance, broadcast) {
        if (!this.is()) return;

        this.instance.change(instance, broadcast);
    },
    insert(params) {
        if (!this.is()) return;

        return this.instance.insert(params);
    },
    add(e, button, name) {
        // popup
        this.app.dropdown.close();
        this.app.modal.close();

        let insertion = this.app.create('insertion'),
            instance,
            params = button.getParams(),
            template = button.getTemplate(),
            position = 'after',
            newInstance,
            inserted;

        // template
        if (template) {
            inserted = insertion.insert({ html: template, position: position });
        }
        else {
            newInstance = this.app.create('block.' + name);
            inserted = insertion.insert({ instance: newInstance, position: position, type: 'add' });
        }

        // broadcast
        this.app.broadcast('block.add', { inserted: inserted });

        // return
        return inserted;
    },
    duplicate() {
        if (!this.is()) return;

        // popup
        this.app.dropdown.close();
        this.app.modal.close();

        // clone
        let clone = this.instance.duplicate(),
            instance = this.instance.insert({
                instance: clone,
                position: 'after',
                caret: 'start',
                type: 'duplicate'
            });

        // broadcast
        this.app.broadcast('block.duplicate', { instance: instance });

        // return
        return instance;
    },
    moveUp() {
        if (!this.is()) return;

        this.instance.move('up');
    },
    moveDown() {
        if (!this.is()) return;

        this.instance.move('down');
    },

    // private
    _getInstance(el) {
        return (el && el.app) ? el : this.dom(el).dataget('instance');
    },
    _getDataImage() {
        return {
            url: this.instance.getSrc(),
            id: this.instance.getId()
        };
    },
    _isBlockActive(el) {
        return (this.instance && (this.dom(el).get() === this.$block.get()));
    },
    _setCaret(point) {
        let types = ['embed', 'image', 'line', 'noneditable'],
            extend = ['layout', 'wrapper', 'table', 'cell'],
            lists = ['todo', 'list'],
            utils = this.app.create('utils'),
            type = this.instance.getType();

        if (point === 'force') {
            types = utils.extendArray(types, extend);
        }

        if (types.indexOf(type) !== -1 || (this.instance.isInline() && !this.instance.isEditable())) {
            this._setFocus();
        }
        else if (!point && lists.indexOf(type) !== -1) {
             this._setFocus();
        }
        else if (point === 'force' && lists.indexOf(type) !== -1) {
             this._setFocus();
        }
        else if (point && point !== 'force') {
            this.instance.setCaret(point);
        }
    },
    _setFocus() {
        let selection = this.app.create('selection');

        this.app.scroll.save();
        this.$block.attr('tabindex', '-1');
        this.$block.focus();
        selection.collapse();
        setTimeout(function() {
            selection.remove();
        }, 1);
        this.app.scroll.restore();
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'blocks', {
    init() {
        this.selected = [];
        this.focusClass = 'rx-block-meta-focus';
    },
    build() {
        let name = 'data-rx-first-level',
            $editor = this.app.editor.getEditor();

        $editor.find('[' + name + ']').removeAttr(name);
        $editor.children('[data-rx-type]').attr(name, true);
    },
    trigger(mutation) {
        if (!this.is()) return;

        if (mutation.type === 'childlist' || mutation.type === 'characterData') {
            let selected = this.get({ selected: true, instances: true });
            selected.forEach(function(instance) {
                instance.trigger(mutation);
            });
        }
    },
    is() {
        return (this.selected.length > 0);
    },
    set(blocks) {
        this.unset();
        this.selected = (Array.isArray(blocks)) ? blocks : blocks.getAll();

        let $block;
        this.selected.forEach(function(value, key) {
            $block = this.dom(value);
            $block.addClass(this.focusClass);
        }.bind(this));

        // pathbar
        this.app.path.build();
    },
    setInstances(instances) {
        this.unset();

        let blocks = [],
            $block;

        instances.forEach(function(instance) {
            $block = instance.getBlock();
            $block.addClass(this.focusClass);
            blocks.push($block);
        }.bind(this));

        // set
        this.selected = blocks;

        // pathbar
        this.app.path.build();
    },
    unset() {
        this.selected = [];
        this.app.editor.getEditor().find('.' + this.focusClass).removeClass(this.focusClass);
        this.app.block.setTool(false);
    },
    has(filter) {
        return (this.count(filter) !== 0);
    },
    count(filter) {
        return this.get(filter).length;
    },
    get(filter) {
        let $editor = this.app.editor.getEditor(),
            $blocks = $editor.find('[data-rx-type]'),
            instances = [];

        if (filter) {
            if (filter.selected) $blocks = $blocks.filter('.' + this.focusClass);
            if (filter.firstLevel) $blocks = $blocks.filter('[data-rx-first-level]');
            if (filter.firstLevel === false) $blocks = $blocks.not('[data-rx-first-level]');
            if (filter.type) $blocks = $blocks.filter(this._getTypesSelector(filter.type));
            if (filter.editable) $blocks = $blocks.filter('[contenteditable=true]');
            if (filter.first) $blocks = $blocks.first();
            if (filter.last) $blocks = $blocks.last();
        }

        // instances
        if (filter && filter.instances) {
            $blocks.each(function($node) {
                instances.push($node.dataget('instance'));
            });

            return (filter.first || filter.last) ? instances[0] : instances;
        }

        return $blocks;
    },
    removeAll() {
        if (this.app.editor.isSelectAll()) {
            this._removeAllSelected();
            return this.get({ first: true });
        }

        let $blocks = this.get({ selected: true });
        $blocks.each(function($node) {
            let $target = $node.closest('[data-rx-first-level]');
            $target.remove();
        });
    },
    remove(traverse) {
        if (this.app.editor.isSelectAll()) {
            this._removeAllSelected();
            return;
        }

        let $blocks = this.get({ selected: true }),
            blocks,
            $last = $blocks.last(),
            $next = this._getNextElement($last);

        // remove
        blocks = $blocks.getAll().reverse();
        blocks.forEach(this._removeSelected.bind(this));

        // fill empty
        blocks = this.get({ selected: true, type: ['cell', 'column'], instances: true });
        blocks.forEach(this._fillEmptyBlocks.bind(this));

        // traverse
        if (traverse && $next.length !== 0) {
            this.app.block.set($next, 'start');
        }
        else {
            this.app.context.close();
        }
    },

    // private
    _removeAllSelected() {
        this.app.editor.setEmpty();
        this.app.editor.unsetSelectAll();
        this.app.editor.setFocus('start');
    },
    _removeSelected(node) {
        let $node = this.dom(node),
            instance = $node.dataget('instance'),
            type = instance.getType(),
            parent = instance.isParent(),
            types = ['wrapper', 'layout', 'table', 'todo', 'list'],
            emptyTypes = ['todo', 'list', 'wrapper'],
            ignoreNoneditable = (type === 'noneditable' && !this.opts.is('noneditable.remove')),
            ignoreTypes = ['cell', 'row', 'column', 'figcaption'],
            remove = false;

        // ignore noneditable
        if (ignoreNoneditable) {
            remove = false;
        }
        // ignore if has parent
        else if (ignoreTypes.indexOf(type) === -1) {
            if (types.indexOf(type) !== -1) {
                if (type === 'table' && this._isTableSelected($node)) {
                    remove = true;
                }
                else if (emptyTypes.indexOf(type) !== -1 && instance.isEmpty(true)) {
                    remove = true;
                }
                else if (type === 'layout' && this._isLayoutSelected($node, instance)) {
                    remove = true;
                }
            }
            else {
                remove = true;
            }
        }

        if (remove) {
            instance.remove({ traverse: false });
        }
    },
    _fillEmptyBlocks(instance) {
        if (instance.isEmpty()) {
            let emptyInstance = this.app.block.create();
            instance.getBlock().append(emptyInstance.getBlock());
        }
    },
    _getTypesSelector(type) {
        return (Array.isArray(type)) ? '[data-rx-type=' + type.join('],[data-rx-type=') + ']' : '[data-rx-type='+ type +']';
    },
    _getNextElement($last) {
        let $next = $last.nextElement(),
            instance = $last.dataget('instance'),
            type = instance.getType(),
            types = ['todoitem', 'listitem'],
            closest = instance.getClosest(['cell', 'column']);

        if (types.indexOf(type) !== -1 && instance.isLastElement()) {
            $next = instance.getParent().getBlock().nextElement();
        }
        else if (closest && closest.isLastElement()) {
            $next = closest.getParent().getBlock().nextElement();
        }

        return $next;
    },
    _isLayoutSelected($node, instance) {
        let columns = instance.getColumns(),
            columnsSize = columns.length,
            columnsSelectedSize = 0;

        columns.forEach(function(column) {
            if (column.getBlock().hasClass(this.focusClass) && column.isEmpty()) {
                columnsSelectedSize++;
            }
        }.bind(this));

        return (columnsSize === columnsSelectedSize);

    },
    _isTableSelected($node) {
        let $rows = $node.find('tr'),
            rowsSize = $rows.length,
            rowsSelectedSize = $rows.filter('.' + this.focusClass).length;

        return (rowsSize === rowsSelectedSize);
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'context', {
    init() {
        this.eventName = 'rx-context';
        this.customButtons = {};
        this.blockButtons = {};
        this.removeButtons = [];
        this.instance = false;
    },
    start() {
        if (!this.opts.is('context')) return;

        // container
        this.$container = this.app.$body;

        // build
        this._build(this.$container);

        // hide
        this.$context.hide();
    },
    stop() {
        if (!this.opts.is('context')) return;

        this.$context.remove();
        this.currentType = false;
        this.customButtons = {};
        this.removeButtons = [];
        this.app.scroll.getTarget().off('.' + this.eventName);
    },
    remove(name) {
        if (!this.opts.is('context')) return;
        this.removeButtons.push(name);
    },
    add(name, obj, block) {
        if (this.app.isStarted()) {
            let button,
                btnObj = this.app.button.buildObject('context', name, obj);

            // add direct
            button = this.app.create('button', name, btnObj, this.$contextButtons, 'context');
        }
        else {
            if (block) {
                this.blockButtons[name] = obj;
            }
            else {
                this.customButtons[name] = obj;
            }

            this.app.button.add(name, obj);
        }
    },
    unsetToggled(name, except) {
        if (!this.opts.is('context')) return;

        if (name) {
            this._findButtonInstance(name).unsetToggled();
        }
        else {
            this._findButtons().each(function($btn) {
                let button = $btn.dataget('instance');
                button.unsetToggled();

                if (!except || (except && button.getName() !== except)) {
                    $btn.removeClass('rx-in-modal');
                }
            });
        }
    },
    getButtons() {
        return this._findButtons();
    },
    getButton(name) {
        return this._findButtonInstance(name);
    },
    getElement() {
        return this.$context;
    },
    getInstance() {
        return this.instance;
    },
    unsetActive(name) {
        if (!this.opts.is('context')) return;

        if (name) {
            this._findButtonInstance(name).unsetActive();
        }
        else {
            this._findButtons().each(function($btn) {
                $btn.dataget('instance').unsetActive();
            });
        }
    },
    setActiveKeys(keys, styles) {
        if (!this.opts.is('context')) return;

        for (let i = 0; i < keys.length; i++) {
            let button = this._findButtonInstance(keys[i]);
            if (button) {
                button.setActive();
            }
        }

        // styles
        this._findButtons().each(function($node) {
            this.app.button.setButtonColor($node, styles);
        }.bind(this));
    },
    isOpen() {
        if (!this.opts.is('context')) return;
        return this.$context.hasClass('open');
    },
    close() {
        this._close();
    },
    open(e) {
        if (!this.opts.is('context')) return;
        if (this.app.block.isTool()) return;

        if (this.opts.is('context.click')) {
            this._open(e);
            return;
        }

        let selection = this.app.create('selection');
        let blockSelection = (e) ? this._getBlockSelection(e) : true;
        let inlineSelection = this._getInlineSelection(e);

        if (selection.is() && selection.isTool(e)) {
            this.app.block.setTool(true);
            return;
        }

        // context
        if (blockSelection && selection.is() && !selection.isCollapsed()) {
            this._open(e);
        }
        else if (inlineSelection && inlineSelection.length !== 0) {
            this.instance = inlineSelection.dataget('instance');
            if (this.instance.isContext()) {
                this._open(e);
            }
        }
        else {
            this._close();
        }
    },
    updateEvents() {
        if (!this.opts.is('context')) return;

        this.app.scroll.getTarget().off('.' + this.eventName);
        this.app.editor.getEditor().off('.' + this.eventname);
        this._buildEvents();
    },
    updateTheme(theme) {
        this.app.$body.find('.rx-context').attr('rx-data-theme', theme);
    },
    updatePosition(e) {
        if (!this.opts.is('context') || this.app.modal.isOpen()) return;

        let width = this.$context.width();
        let rect = this.app.editor.getRect();
         let scrollTop = this.app.getDoc().scrollTop();
        let selection = this.app.create('selection');
        let pos = selection.getPosition('end');
        let topFix = 2;
        let leftFix = 2;
        let left = pos.left + leftFix;
        let top = pos.bottom  + scrollTop;

        // left edge
        if ((left - width) < rect.left) {
            left = pos.left ;
        }
        // right edge
        else if ((left + width) > rect.right) {
            left = pos.left - width - leftFix;
        }

        if (pos.left === 0 && pos.right === 0 && this.instance) {
            let offset = this.instance.getOffset();
            let $block = this.instance.getBlock();
            let height = $block.height();
            left = offset.left;
            top = offset.top + height;
        }

        this._buildDepth();
        this.$context.css({
            left: left + 'px',
            top: (top + topFix) + 'px'
        });
    },

    // private
    _open(e) {
        if (this.instance) {
            this.$contextButtons.html('');
        }

        this._buildButtons();

        if (this.$contextButtons.html() === '') {
            this.instance = false;
        }

        this._buildPosition(e);
        this._buildEvents();

        this.app.modal.close(e);

        // broadcast
        this.app.broadcast('context.open');
    },
    _close() {
        if (!this.opts.is('context')) return;
        if (!this.$context.hasClass('open')) return;

        this.$context.hide().removeClass('open');
        this.instance = false;

        // stop events
        this.app.scroll.getTarget().off('.' + this.eventname);
        this.app.editor.getEditor().off('.' + this.eventname);

        // broadcast
        this.app.broadcast('context.close');
    },
    _getBlockSelection(e) {
        return (this.dom(e.target).closest('[data-rx-inline], [data-rx-type=noneditable], [data-rx-type=figcaption]').length !== 0) ? false : true;
    },
    _getInlineSelection(e) {
        return (e) ? this.dom(e.target).closest('[data-rx-inline]') : false;
    },
    _buildPosition(e) {
        // open state
        this.$context.addClass('open');

        this.updatePosition(e);

        // open
        this.$context.show();
    },
    _buildEvents() {
        let $target = this.app.scroll.getTarget();

        if (this.app.scroll.isTarget()) {
            $target.on('scroll.' + this.eventname, this._scroll.bind(this));
        }

        $target.on('resize.' + this.eventName, this.updatePosition.bind(this));
        this.app.editor.getEditor().on('scroll.' + this.eventname, this._scroll.bind(this));
    },
    _build($container) {
        this.$container = $container;
        this.$context = this.dom('<div>').addClass('rx-context rx-context-' + this.uuid);
        this.$contextButtons = this.dom('<div>').addClass('rx-context-buttons');

        this.$context.append(this.$contextButtons);
        this.$container.append(this.$context);
    },
    _buildDepth() {
        // bs modal
        if (this.opts.is('bsmodal')) {
            this.$context.css('z-index', 1060);
        }
        if (this.app.isProp('fullscreen')) {
            this.$context.css('z-index', 10001);
        }
    },
    _buildButtons() {
        let buttons = [...this.opts.get('buttons.context')],
            customButtons = this.customButtons;

        if (this.instance) {
            buttons = [];
            customButtons = this.blockButtons;
            this.$contextButtons.html('');
        }

        this.app.button.build(buttons, customButtons, 'context', this.$contextButtons, this.removeButtons);

        let instance = this.app.block.get();
        this.currentType = (instance) ? instance.getType() : false;

    },
    _findButton(name) {
        return this.$contextButtons.find('[data-name=' + name + ']');
    },
    _findButtonInstance(name) {
        let $btn = this._findButton(name);
        if ($btn.length !== 0) {
            return $btn.dataget('instance');
        }
    },
    _findButtons() {
        return this.$contextButtons.find('.rx-button-context');
    },
    _scroll() {
        const saveSelectionIfNeeded = () => {
            if (this.app.modal.isOpen()) {
                this.app.editor.save();
            }
        };

        const updateContextPositionAndVisibility = ($element, tolerance = 0) => {
            const elementTop = $element.offset().top + tolerance;
            const elementBottom = elementTop + $element.height();
            const contextBottom = contextTop + this.$context.height();

            if (contextBottom > elementBottom || elementTop > contextTop) {
                this.$context.hide();
                return true; // context is already hidden
            }
            else if (this.isOpen()) {
                this.$context.show();
                saveSelectionIfNeeded();
                return false;
            }
        };

        if (this.app.modal.isOpen()) {
            this.app.editor.restore();
        }

        const selection = this.app.create('selection');
        const position = selection.getPosition('end');
        const scrollTop = this.app.getDoc().scrollTop();
        const topFix = 2;
        const contextTop = position.bottom + scrollTop + topFix;

        this.$context.css('top', `${contextTop}px`);

        let alreadyHidden = false;

        if (this.app.scroll.isTarget()) {
            const $target = this.app.scroll.getTarget();
            alreadyHidden = updateContextPositionAndVisibility($target, 20);
        }

        if (this.opts.is('maxHeight') && !alreadyHidden) {
            const $editor = this.app.editor.getEditor();
            updateContextPositionAndVisibility($editor);
        }
    },
    _isInstance($el) {
        let instance = this.app.block.get();
        let isInstance = (instance && instance.isEditable());
        let isType = (instance && instance.getType() !== 'pre');

        return (isInstance && isType);
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'control', {
    init() {
        this.eventName = 'rx-control';
        this.customButtons = {};
        this.removeButtons = [];
    },
    start() {
        if (!this.opts.is('control')) return;

        // container
        this.$container = this.app.$body;

        // build
        this._build(this.$container);

        // hide
        this.$control.hide();
    },
    stop() {
        if (!this.opts.is('control')) return;

        this.$control.remove();
        this.app.scroll.getTarget().off('.' + this.eventName);
        this.currentType = false;
        this.customButtons = {};
        this.removeButtons = [];
    },
    add(name, obj) {
        this.customButtons[name] = obj;
        this.app.button.add(name, obj);
    },
    remove(name) {
        if (!this.opts.is('control')) return;
        if (Array.isArray(name)) {
            for (let i = 0; i < name.length; i++) {
                this.removeButtons.push(name[i]);
            }
        }
        else {
            this.removeButtons.push(name);
        }
    },
    build() {
        let instance = this.app.block.get();
        if (!instance) {
            this.close();
        }
        else {
            this.open(instance);
        }
    },
    trigger() {
        if (!this.opts.is('control')) return;

        let button = this.getButton('toggle');
        button.getElement().click();
    },
    popup(e, button) {
        if (this.app.dropdown.isOpen() && this.app.dropdown.getName() === 'control') {
            this.app.dropdown.close();
            return;
        }

        let buttons = [...this.opts.get('popups.control')],
            dropdown,
            index,
            utils = this.app.create('utils');

        // check parent
        let parent = this.instance.getClosest(['list', 'wrapper', 'layout', 'todo', 'table']);
        if (parent) {
            let obj1,
                obj2;

            if (this.instance.isType('cell')) {
                buttons = [];

                obj1 = {
                    name: 'parent',
                    title: '## table.select-table ##',
                };

                buttons.push(obj1);
                buttons.push('cell-setting');
            }
            else if (this.instance.getClosest('cell')) {
                obj1 = {
                    name: 'parent',
                    title: '## table.select-table ##'
                };
                obj2 = {
                    name: 'parent',
                    title: '## table.select-cell ##',
                    params: { cell: true }
                };

                buttons.unshift(obj2);
                buttons.unshift(obj1);

            }
            else {
                buttons.unshift('parent');
            }
        }

        // dropdown
        dropdown = this.app.create('dropdown', 'control', { items: buttons, extend: this.customButtons, remove: this.removeButtons });
        this.app.dropdown.open(e, button, dropdown);
    },
    open(instance) {
        if (!this.opts.is('control')) return;
        this.instance = instance;

        let control = this.instance.getControl(),
            parent = this.instance.isParent();

        // control
        if (control === false) {
            this.close();
            return;
        }

        // parent
        if (parent) {
            this.instance = this.instance.getParent();
        }

        // open
        if (this.instance) {
            let theme = this.app.theme.get();

            // build
            this._buildEvents();
            this._buildButtons();

            // show
            this.$control.attr('rx-data-theme', theme);
            this.$control.show();
            this.updatePosition();
            this.app.dropdown.updatePosition();

            let button = this.getButton('toggle');
            if (this.opts.is('reorder') && this.instance.isReorder()) {
                this.app.reorder.build(button, this.$control, this.instance);
            }
        }
        else {
            this.close();
        }
    },
    close() {
        if (!this.opts.is('control') || !this.$control) return;

        // hide
        this.$control.hide();

        this.app.scroll.getTarget().off('.' + this.eventName);
        this.app.editor.getEditor().off('.' + this.eventName);
        this.instance = false;
    },
    updateTheme(theme) {
        this.app.$body.find('.rx-control').attr('rx-data-theme', theme);
    },
    updateEvents() {
        if (!this.opts.is('control')) return;

        this.app.scroll.getTarget().off('.' + this.eventName);
        this.app.editor.getEditor().off('.' + this.eventName);

        this._buildEvents();
    },
    updatePosition() {
        if (!this.opts.is('control')) return;
        if (!this.instance) {
            this.close();
            return;
        }

        let offset = this.instance.getOffset();
        let width = this.$control.width();
        let topOutlineFix = 2;
        let leftOutlineFix =  3;
        let paddingTop = parseInt(this.instance.getBlock().css('padding-top'));
        if (this.instance.isType('line') && paddingTop === 0) {
            topOutlineFix = 14;
        }

        let top = (offset.top - topOutlineFix);
        let left = (offset.left - width - leftOutlineFix);

        // show
        this.$control.show();

        // scroll target top/bottom hide
        if (this.app.scroll.isTarget()) {
            let $target = this.app.scroll.getTarget();
            let targetBottom = $target.offset().top + $target.height(),
                targetTop = $target.offset().top,
                bottom = top + this.$control.height(),
                targetTolerance = parseInt($target.css('padding-top'));

            if (bottom > targetBottom || (targetTop + targetTolerance) > top) {
                this.$control.hide();
            }
        }

        // editor top/bottom hide
        if (this.opts.is('maxHeight')) {
            let $editor = this.app.editor.getEditor();
            let editorBottom = $editor.offset().top + $editor.height();
            let editorTop = $editor.offset().top;
            let checkBottom = top + this.$control.height();

            if (checkBottom > editorBottom || editorTop > top) {
                this.$control.hide();
            }
        }

        // position
        this._buildDepth();
        this.$control.css({
            top: top + 'px',
            left: left + 'px'
        });
    },
    getButtons() {
        return this._findButtons();
    },
    getButton(name) {
        return this._findButtonInstance(name);
    },
    getElement() {
        return this.$control;
    },

    // private
    _build($container) {
        this.$container = $container;
        this.$control = this.dom('<div>').addClass('rx-control rx-control-' + this.uuid);
        this.$controlButtons = this.dom('<div>').addClass('rx-control-buttons');

        this.$control.append(this.$controlButtons);
        this.$container.append(this.$control);
    },
    _buildDepth() {
        // bs modal
        if (this.opts.is('bsmodal')) {
            this.$control.css('z-index', 1060);
        }
        if (this.app.isProp('fullscreen')) {
            this.$control.css('z-index', 10001);
        }
    },
    _buildEvents() {
        let $target = this.app.scroll.getTarget();
        $target.on('resize.' + this.eventName, this.updatePosition.bind(this));
        $target.on('scroll.' + this.eventName, this.updatePosition.bind(this));
        this.app.editor.getEditor().on('scroll.' + this.eventName, this.updatePosition.bind(this));
    },
    _buildButtons() {
        let buttons = [...this.opts.get('buttons.control')],
            customButtons = false;

        this.app.button.build(buttons, customButtons, 'control', this.$controlButtons);

        let instance = this.app.block.get();
        this.currentType = (instance) ? instance.getType() : false;
    },
    _findButton(name) {
        return this.$controlButtons.find('[data-name=' + name + ']');
    },
    _findButtonInstance(name) {
        let $btn = this._findButton(name);
        if ($btn.length !== 0) {
            return $btn.dataget('instance');
        }
    },
    _findButtons() {
        return this.$controlButtons.find('.rx-button-control');
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'embed', {
    modals: {
        add: {
            title: '## embed.embed ##',
            width: '100%',
            form: {
                embed: { type: 'textarea', label: '## embed.description ##', rows: 6 },
                caption: { type: 'input', label: '## embed.caption ##' },
                responsive: { type: 'checkbox', text: '## embed.responsive-video ##' }
            },
            footer: {
                insert: { title: '## buttons.insert ##', command: 'embed.insert', type: 'primary' },
                cancel: { title: '## buttons.cancel ##', command: 'modal.close' }
            }
        },
        edit: {
            title: '## embed.embed ##',
            width: '100%',
            form: {
                embed: { type: 'textarea', label: '## embed.description ##', rows: 6 },
                caption: { type: 'input', label: '## embed.caption ##' },
                responsive: { type: 'checkbox', text: '## embed.responsive-video ##' }
            },
            footer: {
                save: { title: '## buttons.save ##', command: 'embed.save', type: 'primary' },
                cancel: { title: '## buttons.cancel ##', command: 'modal.close' },
                remove: { title: '## buttons.delete ##', command: 'embed.remove', type: 'danger', right: true }
            }
        }
    },
    observe(obj, name) {
        if (!this.opts.is('embed')) {
            return false;
        }

        let instance = this.app.block.get();
        if (instance && instance.isType('embed')) {
             obj.command = 'embed.edit';
        }

        return obj;
    },
    build(scripts) {
        if (scripts) {
            this._callScripts(scripts);
        }
        else {
            this._findScripts();
        }
    },
    popup(e, button) {
        let stack = this.app.create('stack');
        stack.create('embed', this.modals.add);

        // open
        this.app.modal.open({ name: 'embed', stack: stack, title: 'Snippets', focus: 'embed', button: button });

        // checkbox
        if (this.opts.is('embed.responsive')) {
            stack.getInput('responsive').attr('checked', true);
        }

        // codemirror
        this._buildCodemirror(stack);
    },
    edit(params, button) {
        let instance = this.app.block.get();
        let data = {
            embed: instance.getContent(),
            caption: instance.getCaption(),
            responsive: instance.isResponsive()
        };

        // stack & data
        let stack = this.app.create('stack');
        stack.create('embed', this.modals.edit);
        stack.setData(data);

        // open
        this.app.modal.open({ button: button, name: 'embed', stack: stack, focus: 'embed' });

        // codemirror
        this._buildCodemirror(stack);
    },
    insert(stack) {
        this.app.modal.close();

        // data
        let data = stack.getData();
        let code = this._getEmbedCode(data);
        if (code === '') {
            return;
        }

        // create
        let instance = this._createInstance(data, code),
            insertion = this.app.create('insertion');

        insertion.insert({ instance: instance });
    },
    save(stack) {
        this.app.modal.close();

        // data
        let current = this.app.block.get();
        let data = stack.getData();
        let code = this._getEmbedCode(data);
        if (code === '') {
            this.app.block.remove();
            return;
        }

        // create
        let instance = this._createInstance(data, code, current);

        // change
        if (this._isNeedToChange(data, instance, current)) {
            this.app.block.change(instance);
        }
    },
    remove() {
        this.app.modal.close();
        this.app.block.remove();
    },

    // =private
    _buildCodemirror(stack) {
        let $input = stack.getInput('embed');

        this.app.codemirror.create({ el: $input, height: '200px', focus: true });
        this.app.modal.updatePosition();
    },
    _getEmbedCode(data) {
        let code = data.embed.trim(),
            cleaner = this.app.create('cleaner');

        code = this.app.codemirror.val(code);
        code = this._removeScript(code);
        code = cleaner.sanitize(code);
        code = (!this._isHtmlString(code) && code !== '') ? this._parseUrl(code) : code;

        return code;
    },
    _isHtmlString(str) {
        return /^\s*<(\w+|!)[^>]*>/.test(str);
    },
    _isFigure(str) {
        return /^<figure/.test(str);
    },
    _isNeedToChange(data, instance, current) {
        if (current.getContent() !== instance.getContent()) return true;
        if (data.responsive !== current.isResponsive()) return true;
        if (data.caption !== current.getCaption()) return true;
    },
    _removeScript(code) {
        if (!this.opts.is('embed.script')) {
            let cleaner = this.app.create('cleaner');
            code = cleaner.removeTagsWithContent(code, ['script']);
        }
        return code;
    },
    _parseUrl(str) {
        let iframeStart = '<iframe width="560" height="315" src="',
            iframeEnd = '" frameborder="0" allowfullscreen></iframe>',
            parsed,
            youtube = this.opts.get('regex.youtube'),
            vimeo = this.opts.get('regex.vimeo');

        if (str.match(youtube)) {
            let yturl = '//www.youtube.com';
            if (str.search('youtube-nocookie.com') !== -1) {
                yturl = '//www.youtube-nocookie.com';
            }

            parsed = str.replace(youtube, yturl + '/embed/$1');
            return iframeStart + parsed + iframeEnd;
        }
        else if (str.match(vimeo)) {
            parsed = str.replace(vimeo, '//player.vimeo.com/video/$2');
            return iframeStart + parsed + iframeEnd;
        }

        return str;
    },
    _createInstance(data, code, current) {
        let $figure,
            figure;

        if (current) {
            figure = current.duplicateEmpty();
            $figure = figure.getBlock();
            $figure.html(code);
        }
        else {
            $figure = (this._isFigure(code)) ? code : '<figure>' + code + '</figure>';
            $figure = this.dom($figure);
        }

        return this.app.create('block.embed', $figure, { caption: data.caption, responsive: data.responsive });
    },
    _findScripts() {
        let scripts = this.app.editor.getEditor().find('[data-rx-type=embed]').find('script').getAll();
        this.build.call(this, scripts);
    },
    _callScripts(scripts) {
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].src !== '') {
                let src = scripts[i].src;
                let $script = this.dom('<script>').attr({ 'src': src, 'async': true, 'defer': 'true' });

                this.app.getDoc().find('head script[src="' + src + '"]').remove();
                $script.on('load', function() {
                    if (src.search('instagram') !== -1) {
                        var win = this.app.getWinNode();
                        if (win.instgrm) {
                            win.instgrm.Embeds.process();
                        }
                    }
                    this.build(scripts.slice(i + 1));
                }.bind(this));

                let head = this.app.getDoc().get().getElementsByTagName('head')[0];
                if (head) head.appendChild($script.get());
            }
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'event', {
    init() {
        this.trigger = true;
        this.pasteEvent = false;
        this.blockMouseDown = false;
        this.isPopupMouseUp = false;
        this.docBlur = true;
        this.eventChecked = false;
        this.dragoverEvent = false;
        this.imageDrag = false;

        // events
        this.events = {
            editor: ['click', 'touchstart', 'mouseover', 'mouseup', 'mousedown', 'keyup', 'keydown',
                     'drop', 'dragstart', 'dragover', 'dragleave'],
            doc: ['keydown', 'mousedown', 'mouseup', 'click', 'paste', 'cut', 'copy'],
            win: ['focus']
        };
    },
    build() {
        this.buildInterval = setInterval(function() {
            if (this.app.isStarted()) {
                this._stopLinkEvents();
                this._startEvents();

                clearInterval(this.buildInterval);
            }
        }.bind(this), 1);
    },
    stop() {
        this._stopEvents();
    },
    run() {
        this._startEvents();
    },
    pause() {
        this._stopEvents();
    },
    isPasteEvent() {
        return this.pasteEvent;
    },
    setPasteEvent() {
        this.pasteEvent = true;
    },
    unsetPasteEvent() {
        this.pasteEvent = false;
    },

    // editor
    onmouseup(e) {
        // set block (timeout to wait for collapsed when clicking on selection)
        setTimeout(function() {
            if (!this.trigger || this._isToolClick(e)) return;

            // click inside editor
            this._checkClick(e);

            // context
            setTimeout(function() {
                this.app.context.open(e);
                this.app.observer.observe();
            }.bind(this), 1);

            // state
            this.app.state.add(e);

            // block mousedown
            this.blockMouseDown = false;

            // broadcast
            this.app.broadcast('editor.mouseup', { e: e });

        }.bind(this), 0);
    },
    onmousedown(e) {
        if (!this.trigger || this._isToolClick(e)) return;

        // prevent set by coords if selection has started inside block
        if (!this.app.editor.isEditor(e.target)) {
            this.blockMouseDown = e;
        }

        // placeholder
        this.app.placeholder.handleClick(e);

        // broadcast
        this.app.broadcast('editor.mousedown', { e: e });
    },
    onclick(e) {
        this.app.broadcast('editor.click', { e: e });
    },
    ontouchstart(e) {
        // state
        this.app.state.add(e);
    },
    onmouseover(e) {
        if (!this.trigger) return;

        this.app.broadcast('editor.mouseover', { e: e });
    },
    onkeyup(e) {
        // broadcast
        let event = this.app.broadcast('editor.keyup', this._buildEventKeysObj(e)),
            key = e.which,
            k = this.app.keycodes,
            $block;

        if (event.isStopped()) {
            return e.preventDefault();
        }

        if (this.app.dropdown.isOpen()) return;

        let selection = this.app.create('selection');
        // catch arrow down/up for editable in the middle position
        if (key === k.DOWN || key === k.UP) {
            $block = selection.getDataBlock();
            if ($block.length !== 0 && !this.app.block.is($block)) {
                // set
                this.app.block.set($block);
            }
        }

        // backspace & empty
        if (key === k.BACKSPACE && this.app.editor.isEmpty()) {
            this.app.editor.setEmpty();
        }

        // observer
        if (key === k.LEFT || key === k.RIGHT || key === k.DOWN || key === k.UP) {
            this.app.observer.observe();
        }

    },
    onkeydown(e) {
        // broadcast
        this.app.broadcast('editor.keydown', { e: e });
    },
    ondrop(e) {
        if (!this.opts.is('drop')) return e.preventDefault();

        // broadcast
        var event = this.app.broadcast('editor.drop', { e: e });
        if (event.isStopped()) return e.preventDefault();

        // drop
        let html,
            dt = e.dataTransfer,
            item = dt.getData('item'),
            action = this.app.create('event-action'),
            draggableItems = this.opts.get('draggable');


        if (item !== '') {
            e.preventDefault();

            if (draggableItems && typeof draggableItems[item] !== 'undefined') {
                html = draggableItems[item];
            }
            else {
                html = this.dom('[data-rx-drop-item=' + item + ']').html();
                html = html.trim();
            }

            // drop
            if (html) {
                action.drop(e, html, 'after', false);
            }
        }
        else if (this.opts.is('image') && this.opts.is('image.upload') && dt.files !== null && dt.files.length > 0) {
            e.preventDefault();
            this.app.image.drop(e, dt);
        }
        else {
            html = dt.getData("text/html");
            html = (html.trim() === '') ? dt.getData('Text') : html;

            // drop
            let dropped = action.drop(e, html);
            if (this.imageDrag && dropped.instances.length !== 0) {
                let instance = dropped.instances[0];
                instance.change(this.imageDrag, false);
            }
        }

        // clean up
        this._removeDrag();
        this.imageDrag = false;
        this.app.observer.trigger = true;
        this.app.editor.setFocus();
    },
    ondragstart(e) {
        let $block = this._getBlockFirst(e.target),
            elm = this.app.create('element');

        if ($block.length !== 0 && elm.isType($block, 'image')) {
            this.imageDrag = $block.dataget('instance');
        }

        this.app.broadcast('editor.dragstart', { e: e });
    },
    ondragover(e) {
        e.preventDefault();
        this.dragoverEvent = true;
        this.app.observer.trigger = false;
        this._removeDrag();

        // data
        let types = e.dataTransfer.types;
        if (types.indexOf('item') !== -1) {
            let $block = this._getBlock(e.target);
            if ($block.length !== 0) {
                let $pl = this.dom('<div>').addClass('rx-draggable-placeholder');
                $block.after($pl);
            }
        }

        // broadcast
        this.app.broadcast('editor.dragover', { e: e });
    },
    ondragleave(e) {
        e.preventDefault();
        this.dragoverEvent = true;
        this.app.observer.trigger = true;
        this._removeDrag();

        // broadcast
        this.app.broadcast('editor.dragleave', { e: e });
    },

    // doc
    ondockeydown(e) {
        if (this.app.block.isTool()) return;
        if (this.app.dropdown.isOpen() || this.app.modal.isOpen()) {
            if (this._isEsc(e)) {
                this.app.dropdown.close();
                this.app.modal.close();
            }
        }

        if (this.app.modal.isOpen()) {
            if (this._isEnter(e)) {
                let stack = this.app.modal.getStack();
                if (stack.hasForm() !== false && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    let $btn = stack.getButtonPrimary();
                    $btn.dataget('instance').invokeCommand();
                    return;
                }
            }
        }

        if (this._isOutsideEditor(e)) {
            return;
        }

        if (this.app.dropdown.isOpen() || this.app.modal.isOpen() || this.app.source.is()) return;
        if (this.app.editor.hasFocus()) {
            let event = this.app.broadcast('document.keydown', this._buildEventKeysObj(e));
            if (event.isStopped()) {
                return e.preventDefault();
            }

            let selection = this.app.create('selection');
            let caret = this.app.create('caret');
            let inline = selection.getInline();
            let key = e.which;
            if (inline && caret.is(inline, 'end') && key === this.app.keycodes.RIGHT && inline.style.display !== 'block') {
                e.preventDefault();
                caret.set(inline, 'after');
                return;
            }

            // context
            this.app.context.close(e);

            // enter key
            if (!this.opts.is('enterKey') && e.which === 13) {
                e.preventDefault();
                return;
            }

            // listen undo & redo
            if (this.app.state.listen(e)) {
                return;
            }

            // esc
            if (this._isEsc(e)) {
                let selection = this.app.create('selection');
                this.app.block.unset();
                selection.remove();
            }

            // handle shortcut
            if (this.app.hotkeys.handle(e)) {
                return;
            }

            // input
            this.app.input.handle(event);
        }
    },
    ondocmousedown(e) {
        this.isPopupMouseUp = (this.dom(e.target).closest('.rx-modal-' + this.uuid + ', .rx-dropdown-' + this.uuid).length !== 0);

        // broadcast
        this.app.broadcast('document.mousedown', { e: e });
    },
    ondocmouseup(e) {
        if (this._isToolClick(e)) return;

        // click inside editor container
        if (this.isPopupMouseUp === false) {
            this._checkContainerClick(e);
        }

        // broadcast
        this.app.broadcast('document.mouseup', { e: e });
    },
    ondocclick(e) {
        if (this._isToolClick(e)) return;

        if ((this.app.dropdown.isOpen() || this.app.modal.isOpen()) && this._isEditorContainer(e)) {
            this.app.dropdown.close();
            this.app.modal.close(e);
            return;
        }
        else if (!this._isOutsideEditor(e) || this.trigger === false) {
            return true;
        }

        if (this.app.modal.isOpen()) {
            if (this.isPopupMouseUp === false) {
                this.app.modal.close(false);
            }
        }
        else if (this.app.dropdown.isOpen()) {
            if (this.isPopupMouseUp === false) {
                this.app.dropdown.close(false);
            }
        }
        else {
            if (this.docBlur) {
                this.app.editor.setBlur(e);
            }
        }

        // broadcast
        this.app.broadcast('document.click', { e: e });
    },
    ondocpaste(e) {
        if (!this._isEditorFocus()) return;

        let action = this.app.create('event-action');
        action.paste(e);
    },
    ondoccopy(e) {
        if (!this._isEditorFocus()) return;

        let action = this.app.create('event-action');
        action.copy(e);
    },
    ondoccut(e) {
        if (!this._isEditorFocus()) return;

        let action = this.app.create('event-action');
        action.cut(e);
    },

    onparentdockeydown(e) {
        if (this.app.dropdown.isOpen() || this.app.modal.isOpen()) {
            if (this._isEsc(e)) {
                this.app.dropdown.close();
                this.app.modal.close();
            }
        }
    },
    onparentdocclick(e) {
        if (this.app.modal.isOpen()) {
            if (this.isPopupMouseUp === false) {
                this.app.modal.close(false);
            }
        }
        else if (this.app.dropdown.isOpen()) {
            if (this.isPopupMouseUp === false) {
                this.app.dropdown.close(false);
            }
        }
        else {
            this.app.editor.setBlur(e);
        }

        // broadcast
        this.app.broadcast('document.click', { e: e });
    },


    // win
    onwinfocus() {
        let instance = this.app.block.get(),
            selection;

        if (instance && !instance.isEditable()) {
            setTimeout(function() {
                selection = this.app.create('selection');
                selection.remove();
            }.bind(this), 0);
            return;
        }
    },

    // start
    _startEvents() {
        let eventname = 'rx-events';

        this._buildTargetEvents(this.app.editor.getEditor(), this.events.editor, eventname, '');
        this._buildTargetEvents(this.$doc, this.events.doc, eventname, 'doc');
        this._buildTargetEvents(this.$win, this.events.win, eventname, 'win');

        if (this.opts.is('iframe')) {
            let $target = this.dom(window.parent.document);
            $target.on('keydown.' + eventname, this.onparentdockeydown.bind(this));
            $target.on('click.' + eventname, this.onparentdocclick.bind(this));
        }
    },

    // build
    _buildTargetEvents($target, events, eventname, type) {
        for (var i = 0; i < events.length; i++) {
            $target.on(events[i] + '.' + eventname, this['on' + type + events[i]].bind(this));
        }
    },
    _buildEventKeysObj(e) {
        let key = e.which,
            k = this.app.keycodes,
            arrowKeys = [k.UP, k.DOWN, k.LEFT, k.RIGHT],
            isAlphaKeys = ((!e.ctrlKey && !e.metaKey) && ((key >= 48 && key <= 57) || (key >= 65 && key <= 90)));

        return {
            'e': e,
            'key': key,
            'ctrl': (e.ctrlKey || e.metaKey),
            'shift': (e.shiftKey),
            'alt': (e.altKey),
            'select': ((e.ctrlKey || e.metaKey) && !e.altKey && key === 65),
            'select-block': ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && key === 65),
            'enter': (key === k.ENTER),
            'space': (key === k.SPACE),
            'esc': (key === k.ESC),
            'tab': (key === k.TAB && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey),
            'delete': (key === k.DELETE),
            'backspace': (key === k.BACKSPACE),
            'alpha': isAlphaKeys,
            'arrow': (arrowKeys.indexOf(key) !== -1),
            'left': (key === k.LEFT),
            'right': (key === k.RIGHT),
            'up': (key === k.UP),
            'down': (key === k.DOWN),
            'left-right': (key === k.LEFT || key === k.RIGHT),
            'up-left': (key === k.UP || key === k.LEFT),
            'down-right': (key === k.DOWN || key === k.RIGHT)
        };
    },

    // stop
    _stopEvents() {
        let eventname = 'rx-events';

        this.app.editor.getEditor().off('.' + eventname);
        this.$doc.off('.' + eventname);
        this.$win.off('.' + eventname);

        if (this.opts.is('iframe')) {
            this.dom(window.parent.document).off('.' + eventname);
        }
    },
    _stopLinkEvents() {
        let eventname = 'rx-prevent-events';
        this.app.editor.getEditor().on('click.' + eventname  + ' dblclick.' + eventname, this._stopLinkEvent.bind(this));
    },
    _stopLinkEvent(e) {
        let $link = this.dom(e.target).closest('a');
        if ($link.length !== 0) e.preventDefault();
    },

    // is
    _isEsc(e) {
        return (e.which === this.app.keycodes.ESC);
    },
    _isEnter(e) {
        return (e.which === this.app.keycodes.ENTER);
    },
    _isEditorFocus() {
        if ((this.app.dropdown.isOpen() || this.app.modal.isOpen()) || this.app.source.is()) {
            return false;
        }
        else {
            return (this.app.block.is() || this.app.blocks.is() || this.app.editor.isSelectAll());
        }
    },
    _isEditorClick(e) {
        if (this.app.editor.isEditor(e.target)) {
            e.preventDefault();
            return true;
        }
    },
    _isEditorContainerClick(e) {
        if (this.app.isStopped()) return;
        let container = this.app.container.get('editor').get();

        if (e.target === container) {
            e.preventDefault();
            return true;
        }
    },
    _isEditorContainer(e) {
        return (this.dom(e.target).closest('.rx-container-' + this.uuid).length !== 0);
    },
    _isEditorTarget(el) {
        return (this.dom(el).closest('.rx-editor-container-' + this.uuid).length !== 0);
    },
    _isOutsideEditor(e) {
        let $target = this.dom(e.target);
        let targets = ['-modal-', '-form-', '-toolbar-container-', '-control-'];

        return ($target.closest('.rx' + targets.join(this.uuid + ',.rx') + this.uuid).length === 0 && $target.closest('.rx-editor-' + this.uuid).length === 0);
    },
    _isToolClick(e) {
        if (this.dom(e.target).closest('.rx-in-tool').length !== 0) {
            this.app.block.setTool(true);
            return true;
        }

        return false;
    },

    // check
    _checkClick(e) {
        if (this.eventChecked) return;

        let selection = this.app.create('selection'),
            $block = this._getBlockFromTarget(e.target),
            instance = $block.dataget('instance');


        // inside tool
        if (selection.is() && selection.isTool(e)) {
            this.app.block.setTool(true);
            return;
        }

        // outside multiple selection
        if (this.app.blocks.is()) {
            if (!$block.hasClass('rx-block-meta-focus') && instance && instance.isType('image')) {
                this._setBlockByClick(e);
                return;
            }
        }

        let blocks = [];
        if (selection.getRange()) {
            blocks = selection.getNodes({ type: 'block', partial: true } );
            blocks = this._normalizeBlocks(blocks);
        }

        // selection inside block
        if (blocks.length === 1 && !selection.isCollapsed() && this.blockMouseDown) {
            this._setBlockByClick(this.blockMouseDown);
        }
        // outside editor
        else if (!this.blockMouseDown && this._isEditorClick(e)) {
            this._setBlockByCoords(e);
        }
        // without focus
        else if (!selection.getRange()) {
            this._setBlockByClick(e);
        }
        // multiple selection
        else if (!selection.isCollapsed()) {
            this._setMultipleBlocks(e);
        }
        // one block
        else {
            this._setBlockByClick(e);
        }
    },
    _checkContainerClick(e) {
        this.docBlur = true;
        this.eventChecked = false;

        // selection and overlap to control
        if (this.blockMouseDown) {
            let $target = this.dom(e.target).closest('.rx-control');
            if ($target.length !== 0) {
                this._setBlockByClick(this.blockMouseDown, true);
                return;
            }
        }

        let selection = this.app.create('selection');
        let blocks = [];
        if (selection.getRange()) {
            blocks = selection.getNodes({ type: 'block', partial: true } );
            blocks = this._normalizeBlocks(blocks);
        }

        // click inside editor
        if (this._isEditorContainerClick(e)) {
            this._setBlockByCoords(e);
        }
        // click outside editor
        else {
            // selection inside one block
            if (this.blockMouseDown && blocks.length === 1 && !selection.isCollapsed()) {
                this.eventChecked = true;
                this.docBlur = false;
                this._setBlockByClick(this.blockMouseDown);
                return;
            }
            // selection inside multiple blocks
            else if (this.blockMouseDown && !selection.isCollapsed()) {
                this.eventChecked = true;
                this.docBlur = false;
                this._setMultipleBlocks(e);
            }
        }
    },

    // get
    _getBlockFromTarget(target) {
        return this.dom(target).closest('[data-rx-type]');
    },
    _getBlock(target) {
        return this.dom(target).closest('[data-rx-type]');
    },
    _getBlockFirst(target) {
        return this.dom(target).closest('[data-rx-first-level]');
    },

    // remove
    _removeDrag() {
        this.app.editor.getEditor().find('.rx-draggable-placeholder').remove();
    },

    // set
    _setBlockByCoords(e) {
        let $blocks = this.app.blocks.get({ firstLevel: true }),
            coords = [],
            distances = [],
            heightIndex = false,
            closestIndex,
            distance,
            rect,
            y,
            x,
            $block;

        $blocks.each(function($node) {
            rect = $node.get().getBoundingClientRect();
            coords.push([rect.x, rect.y, rect.y + rect.height]);
        });

        coords.forEach(function(coord, index) {
            y = parseInt(e.clientY);
            x = parseInt(e.clientX);
            if (coord[1] < y && y < coord[2]) {
                heightIndex = index;
                return;
            }
            distance = Math.hypot(coord[0]-x, coord[1]-y);
            distances.push(parseInt(distance));
        });

        closestIndex = (heightIndex !== false) ? heightIndex : distances.indexOf(Math.min.apply(Math, distances));

        $block = $blocks.eq(closestIndex);
        this.app.editor.setFocus();
        this.app.block.set($block, 'start');
    },
    _setBlockByClick(e, force) {
        let $block = this._getBlockFromTarget(e.target);
        let selection = this.app.create('selection');
        let $dataBlock = selection.getDataBlock();

        // click outside li item but inside list
        //if ($block.length !== 0 && $dataBlock.get().tagName === 'LI' && $block.get() !== $dataBlock.get()) {
        //    $block = $dataBlock;
        //}

        if ($block.length !== 0) {
            let instance = $block.dataget('instance');
            let point = (instance.isEditable()) ? false : 'force';

            force = (force) ? force : (point !== false);

            this.app.editor.setFocus();
            this.app.block.set($block, point, force);
        }
    },
    _setBlock(e) {
        // set focus event
        this.app.editor.setFocus();

        let selection = this.app.create('selection'),
            $block = (e) ? this._getBlockFromTarget(e.target) : selection.getDataBlock(),
            caret = false;

        if ($block.length === 0) {
            $block = this.app.blocks.get({ first: true });
            caret = 'start';
        }

        // set
        this.app.block.set($block, caret);
    },
    _setMultipleBlocks(e) {
        // set focus event
        this.app.editor.setFocus();
        this.app.editor.unsetSelectAll();

        let selection = this.app.create('selection'),
            elm = this.app.create('element'),
            $block = (e) ? this._getBlockFromTarget(e.target) : false,
            blocks = selection.getNodes({ type: 'block', partial: true }),
            blocksAll,
            nodes;

        // one
        if ($block && blocks.length === 1) {
            this.app.block.set($block);
            this.app.blocks.unset();
        }
        // all
        else if (selection.isAll()) {
            blocksAll = this.app.blocks.get({ firstLevel: true });
            nodes = selection.getNodes({ type: 'block' });
            if (blocksAll.length === nodes.length) {
                this.app.editor.setSelectAll(blocksAll);
            }
            else {
                this.app.block.unset();
                this.app.blocks.set(blocks);
            }
        }
        // multiple
        else if (blocks.length > 1) {
            if (this._checkInside(elm, blocks, 'quote')) {
                $block = elm.getDataBlock($block, 'quote');

                // one
                this.app.block.set($block);
                this.app.blocks.unset();
            }
            else if (this._checkInside(elm, blocks, 'noneditable')) {
                $block = elm.getDataBlock($block, 'noneditable');

                // one
                this.app.block.set($block);
                this.app.blocks.unset();
            }
            else {
               let normalized = this._normalizeBlocks(blocks);

                // multiple
                this.app.block.unset();
                this.app.blocks.set(normalized);
            }
        }
        // one
        else {
            this.app.block.set($block);
            this.app.blocks.unset();
        }
    },
    _checkInside(elm, blocks, type) {
        let size = 0,
            len = blocks.length;

        blocks.forEach(function(value, key) {
            if (elm.hasParent(value, type)) {
                size++;
            }
        });

        return (size === len);
    },
    _normalizeBlocks(blocks) {
        let normalized = [],
            $block ;

        for (let i = 0; i < blocks.length; i++) {
            $block = this.dom(blocks[i]);
            if (!$block.attr('data-rx-type')) {
                $block = $block.closest('[data-rx-type]');
            }

            // is not in the array
            if (normalized.indexOf($block.get()) === -1) {
                normalized.push($block.get());
            }
        }

        return normalized;
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'extrabar', {
    mixins: ['toolbar'],
    init() {
        this.type = 'extrabar';
        this.eventname = 'rx-toolbar';
        this.customButtons = {};
        this.removeButtons = [];
    },
    start() {
        if (!this.opts.is('extrabar')) return;

        // container
        this.$container = this.app.container.get('toolbar');

        // build
        this._build(this.$container);
    },
    load() {
        if (!this.opts.is('extrabar')) return;

        this._buildButtons();
    },
    add(name, obj) {
        this._add(name, obj);
    },
    build() {
        if (!this.opts.is('extrabar')) return;

        let instance = this.app.block.get(),
            type = (instance) ? instance.getType() : false;

        if (this.currentType !== type) {
            this._buildButtons();
            this._buildBlockButtons();
        }
        else {
            this.app.button.observe(this.$toolbarButtons);
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'format', {
    init() {
        this.removeButtons = [];
    },
    popup(e, button) {
        let buttons = [...this.opts.get('popups.format')];
        let formatItems = this.opts.get('formatItems');
        let dropdown;
        let activeKeys = this.app.observer.getKeys();

        if (formatItems) {
            for (let [key, item] of Object.entries(formatItems)) {
                item.command = 'format.set';
            }
        }

        dropdown = this.app.create('dropdown', 'format', { items: buttons, extend: formatItems, keys: activeKeys, remove: this.removeButtons });
        this.app.dropdown.open(e, button, dropdown);
    },
    remove(name) {
        if (Array.isArray(name)) {
            for (let i = 0; i < name.length; i++) {
                this.removeButtons.push(name[i]);
            }
        }
        else {
            this.removeButtons.push(name);
        }
    },
    set(params, button, name) {
        if (this.app.block.isTool()) return;

        let selection = this.app.create('selection'),
            instance = this.app.block.get(),
            instances = [];

        // dropdown
        this.app.dropdown.close();

        // params
        this.params = params || {};
        this.name = name;
        this.tag = this._buildTag();
        this.type = this._buildType();
        this.multiple = false;
        this.isSelectAll = this.app.editor.isSelectAll();
        this.$editor = this.app.editor.getEditor();
        this.blocks = [];

        if (!this.isSelectAll && selection.isCollapsed(selection)) {
            if (instance) {
                instances.push(instance);
            }
        }
        else {
            if (this.app.blocks.is()) {
                instances = this.app.blocks.get({ selected: true, instances: true });
                this.multiple = true;
            }
            else {
                if (instance) {
                    instances.push(instance);
                }
            }
        }

        // format
        if (instances.length !== 0) {
            // broadcast
            this.app.broadcast('format.before.set', { instances: instances });

            // format
            this._format(instances);
        }
    },

    // =private
    _format(instances) {
        let type,
            marker = this.app.create('marker'),
            types = ['text', 'heading', 'address', 'list', 'listitem', 'todo', 'todoitem', 'quote', 'pre'],
            elm = this.app.create('element'),
            newInstance;

        // save
        if (!this.isSelectAll) {
            marker.save();
        }

        // loop
        instances.forEach(function(instance) {
            if (types.indexOf(instance.getType()) === -1) return;

            let hasSameTag = this._hasSameTag(instance);
            if (!this.multiple && hasSameTag && !this._isParams() && (this.type === 'heading' || this.type === 'address')) {
                newInstance = this._convertToText(instance, elm);
            }
            else if (instance.isType(['text', 'heading', 'address'])) {
                newInstance = this._convertText(this.type, instance, elm);
            }
            else if (instance.isType('listitem')) {
                let type = (!this._hasSameTag(instance) && this.listType) ? 'list' : this.type;
                newInstance = this._convertListItem(type, instance, elm);
            }
            else if (instance.isType('todoitem')) {
                newInstance = this._convertTodoItem(this.type, instance, elm);
            }
            else if (instance.isType(['pre', 'quote'])) {
                newInstance = this._convertPreQuote(this.type, instance, elm);
            }
            else if (instance.isType('list')) {
                newInstance = this._convertList(this.type, instance, elm);
            }
            else if (instance.isType('todo')) {
                newInstance = this._convertTodo(this.type, instance, elm);
            }
            else if (this.isSelectAll) {
                if ((this.type === 'heading' || this.type === 'text') && instance.isType(['list', 'todo'])) {
                    newInstance = this._convertAllSelected(instance);
                }
                else if (this.type === 'list' && !hasSameTag && instance.isType('list')) {
                    newInstance = this._convertAllSelectedList(instance, elm);
                }
            }

            if (hasSameTag && instance.isType(this.type)) {
                 this.blocks.push(instance);
            }

            if (newInstance) {
                if (Array.isArray(newInstance)) {
                    for (let i = 0; i < newInstance.length; i++) {
                        this.blocks.push(newInstance[i]);
                    }
                }
                else {
                    this.blocks.push(newInstance);
                }
            }


        }.bind(this));

        // convert formatted
        this.$editor.find('.rx-format-todo-to-listitem').each(function($node) { this._convertFormattedTodoToList($node, elm); }.bind(this));
        this.$editor.find('.rx-format-todo-to-text').each(function($node) { this._convertFormattedTodoToText($node, elm); }.bind(this));
        this.$editor.find('.rx-format-list-to-text').each(function($node) { this._convertFormattedListToText($node, elm); }.bind(this));
        this.$editor.find('.rx-format-listitem-to-todo').each(function($node) { this._convertFormattedListToTodo($node, elm); }.bind(this));

        // combine selected
        let selection = this.app.create('selection');
        if (selection.is()) {
            this._combineSelected(selection, 'list');
            this._combineSelected(selection, 'todo');
        }

        // build
        setTimeout(function() {
            this._buildConverted(marker);
        }.bind(this), 0);

    },
    _buildConverted(marker) {
        let selection = this.app.create('selection');

        // set params
        this._setParams(selection);

        if (!this.isSelectAll) {
            // restore
            marker.restore();

            if (this.multiple) {
                let blocks = selection.getNodes({ type: 'block', partial: true });
                this.app.blocks.set(blocks);
                this.app.broadcast('format.set', { $nodes: this.dom(blocks) });
            }
            else {
                let block = selection.getDataBlock();
                if (block.length === 0) {
                    let $block = this.app.editor.getEditor().find('.rx-block-focus');
                    if ($block.length !== 0) {
                        block = $block.dataget('instance');
                    }
                }

                let pointer = (block.isEmpty && block.isEmpty()) ? 'start' : false;
                this.app.block.set(block, pointer);
                this.app.broadcast('format.set', { $nodes: this.dom(block) });
            }

            this.app.editor.build();

            if (!selection.isCollapsed()) {
                this.app.context.open();
            }
        }
        else {
            this.app.editor.unsetSelectAll();
            this.app.editor.build();
            this.app.editor.setSelectAll(false, false);

            let $blocks = this.app.blocks.get();
            this.app.broadcast('format.set', { $nodes: $blocks });
        }
    },
    _setParams(selection) {
        if (!selection.is()) return;

        let blocks = selection.getNodes({ tags: [this.tag], partial: true }),
            $blocks = this.dom([]),
            elm = this.app.create('element'),
            len = blocks.length,
            classParamSize = 0,
            styleParamSize = 0,
            attrsParamSize = 0;

        // check
        for (let i = 0; i < len; i++) {
            let $block = this.dom(blocks[i]);
            $blocks.add($block);

            // classname
            if (this.params.classname && $block.hasClass(this.params.classname)) {
                classParamSize++;
            }
            // style
            if (this.params.style && elm.hasStyle($block, this.params.style)) {
                styleParamSize++;
            }
            // attrs
            if (this.params.attrs && elm.hasAttrs($block, this.params.attrs)) {
                attrsParamSize++;
            }
        }


        if (len !== 0) {
            this._setClass($blocks, len, classParamSize);
            this._setStyle($blocks, len, styleParamSize);
            this._setAttrs($blocks, len, attrsParamSize);
        }
    },
    _setAttrs($blocks, len, size) {
        if (!this.params.attrs) return;

        let obj = this.params.attrs;
        $blocks.each(function($node) {
            let instance = $node.dataget('instance');
            if (instance) {
                if (len === size) {
                    for (let key of Object.keys(obj)) {
                        instance.removeAttr(key);
                    }
                }
                else {
                    for (let [key, val] of Object.entries(obj)) {
                        instance.setAttr(key, val);
                    }
                }
            }
        });
    },
    _setStyle($blocks, len, size) {
        if (!this.params.style) return;

        let cleaner = this.app.create('cleaner'),
            obj = this.params.style;

        if (len === size) {
            Object.keys(obj).forEach((i) => obj[i] = '');
        }

        $blocks.css(obj);
        $blocks.each(function($node) {
            cleaner.cacheElementStyle($node);
            if ($node.attr('style') === '') {
                $node.removeAttr('style');
            }
        });
    },
    _setClass($blocks, len, size) {
        if (!this.params.classname) return;

        let func = (len === size) ? 'removeClass' : 'addClass';
        $blocks[func](this.params.classname);
    },

    _combineSelected(selection, type) {
        let blocks = selection.getNodes({ types: [type], partial: true });
        for (let i = 0; i < blocks.length; i++) {
            let $el = this.dom(blocks[i]);
            let instance = $el.dataget('instance');
            if (instance) {
                let prev = instance.getPrev(type);
                if (prev && prev.getTag() === instance.getTag()) {
                    prev.getBlock().append(instance.getBlock().children());
                    instance.remove();
                }
            }
        }
    },
    _findConvertedItem(type, newType, itemType, $node, elm) {
        let selector = '[data-rx-type=' + itemType + ']',
            first = $node.find(selector).first().prevElement().get(),
            last,
            block,
            $newEl;

        if (first) {
            $newEl = elm.cloneEmpty($node);
            if (newType === 'list') {
                $newEl = elm.replaceToTag($newEl, this.tag);
            }
            $node.after($newEl);
            block = this.app.create('block.' + newType, $newEl);
            this.blocks.push(block);
            while(first.nextSibling) {
                $newEl.append(first.nextSibling);
            }
        }
        else {
            $newEl = $node;
            if (newType === 'list') {
                $newEl = elm.replaceToTag($newEl, this.tag);
            }
            block = this.app.create('block.' + newType, $newEl);
            this.blocks.push(block);
        }

        last = $newEl.find(selector).last().get();
        if (last) {
            let $newEl2 = elm.cloneEmpty($node);
            $newEl.after($newEl2);
            this.app.create('block.' + type, $newEl2);
            while(last.nextSibling) {
                  $newEl2.append(last.nextSibling);
            }
        }

        return $newEl;
    },
    _findConvertedText(type, $node, elm) {
        let selector = '[data-rx-type=text],[data-rx-type=heading]',
            first = $node.find(selector).first().prevElement().get(),
            last,
            $newEl;

        if (first) {
            $newEl = elm.cloneEmpty($node);
            $newEl = elm.replaceToTag($newEl, this.tag);
            $node.after($newEl);
            while(first.nextSibling) {
                $newEl.append(first.nextSibling);
            }
        }
        else {
            $newEl = $node;
        }

        last = $newEl.find(selector).last().get();
        if (last) {
            let $newEl2 = elm.cloneEmpty($node);
            $newEl.after($newEl2);
            this.app.create('block.' + type, $newEl2);
            while(last.nextSibling) {
                  $newEl2.append(last.nextSibling);
            }
        }

        return $newEl;
    },
    _convertAllSelectedList(instance, elm) {
        let $el = instance.getBlock();
        return this._replaceListToListElement('list', this.tag, $el, elm);
    },
    _convertAllSelected(instance) {
        let $block = instance.getBlock(),
            $items = $block.children(),
            blocks = [];

        $items.each(function($node) {
            let item = $node.dataget('instance'),
                content = item.getContent(),
                block = (this.type === 'text') ? this.app.create('block.text', { content: content }) : this.app.create('block.heading', { level: this.tag.replace('h', ''), content: content });

            item.getBlock().after(block.getBlock());
            item.remove();

            blocks.push(block);

        }.bind(this));

        $block.unwrap();

        return blocks;
    },
    _convertFormattedListToText($node, elm) {
        let $nodes = $node.find('li');
        let size = $nodes.length;

        // all
        if (size === 0) {
            $node.unwrap();
        }
        else {
            let $newEl = this._findConvertedText('list', $node, elm);

            // clean up
            let $next = $newEl.nextElement();
            if ($next.attr('data-rx-type') === 'list' && $next.get().children.length === 0) {
                $next.remove();
            }
            $newEl.unwrap();
        }

        $node.removeClass('rx-format-todo-to-text');
    },
    _convertFormattedTodoToText($node, elm) {
        let $nodes = $node.find('li');
        let todoSize = $nodes.length;

        // all
        if (todoSize === 0) {
            $node.unwrap();
        }
        else {
            let $newEl = this._findConvertedText('todo', $node, elm);

            // clean up
            let $next = $newEl.nextElement();
            if ($next.attr('data-rx-type') === 'todo' && $next.get().children.length === 0) {
                $next.remove();
            }
            $newEl.unwrap();
        }

        $node.removeClass('rx-format-todo-to-text');
    },
    _convertFormattedListToTodo($node, elm) {
        let $nodes = $node.find('li'),
            listSize = $nodes.length,
            todoSize = $node.find('[data-rx-type=todoitem]').length,
            block;

        // all
        if (todoSize === listSize) {
            $node.removeAttr('data-rx-type');
            $node.children().removeAttr('data-rx-type');
            block = this.app.create('block.todo', $node);
            this.blocks.push(block);
        }
        else {
            let $newEl = this._findConvertedItem('list', 'todo', 'todoitem', $node, elm);

            // clean up
            let $next = $newEl.nextElement();
            if ($next.attr('data-rx-type') === 'list' && $next.get().children.length === 0) {
                $next.remove();
            }
        }

        $node.removeClass('rx-format-listitem-to-todo');
    },
    _convertFormattedTodoToList($node, elm) {
        let $nodes = $node.find('li'),
            instance = $node.dataget('instance'),
            attrs = (instance) ? instance.getAttrs() : null,
            todoSize = $nodes.length,
            listSize = $node.find('[data-rx-type=listitem]').length,
            block;

        // all
        if (todoSize === listSize) {
            $node = elm.replaceToTag($node, this.tag);
            $node.removeAttr('data-rx-type');
            $node.children().removeAttr('data-rx-type');
            block = this.app.create('block.list', $node);
            block.setAttrs(attrs);
            this.blocks.push(block);
        }
        else {
            let $newEl = this._findConvertedItem('todo', 'list', 'listitem', $node, elm);

            // clean up
            let $next = $newEl.nextElement();
            if ($next.attr('data-rx-type') === 'todo' && $next.get().children.length === 0) {
                $next.remove();
            }
        }

        $node.removeClass('rx-format-todo-to-listitem');

    },
    _convertToText(instance, elm) {
        return this._replaceTo('text', this.opts.get('markup'), instance, elm);
    },
    _convertText(type, instance, elm) {
        if (type === 'heading') {
            return this._replaceTo('heading', this.tag, instance, elm);
        }
        else if (type === 'text' || type === 'address') {
            return this._replaceTo('text', this.opts.get('markup'), instance, elm);
        }
        else if (type === 'list') {
            return this._replaceToList(instance);
        }
        else if (type === 'todo') {
            return this._replaceToTodo(instance);
        }
        else if (type === 'quote') {
            return this._replaceToQuote(instance);
        }
    },
    _convertList(type, instance, elm) {
        let $el = instance.getBlock(),
            items = instance.getItems(),
            item,
            first,
            block;

        if (type === 'text' || type === 'heading') {
            for (let i = 0; i < items.length; i++) {
                block = (type === 'text') ? this.app.create('block.text', { content: items[i] }) : this.app.create('block.heading', { level: this.tag.replace('h', ''), content: items[i] });
                if (i === 0) first = block;
                instance.getBlock().before(block.getBlock());
            }

            if (first) {
                this.app.block.set(first.getBlock(), 'start');
            }
            instance.remove();
        }
        else if (type === 'list') {
            return this._replaceListToList(this.tag, instance, elm);
        }
        else if (type === 'quote') {
            let str = '';
            for (let i = 0; i < items.length; i++) {
                str = str + items[i];
            }

            block = this.app.create('block.quote', { content: str });
            instance.getBlock().before(block.getBlock());
            this.app.block.set(block.getBlock(), 'start');
            instance.remove();
        }
        else if (type === 'todo') {
            block = this.app.create('block.todo');
            instance.getBlock().before(block.getBlock());
            block.setEmpty();

            for (let i = 0; i < items.length; i++) {
                item = this.app.create('block.todoitem', { content: items[i] });
                block.getBlock().append(item.getBlock());
            }

            this.app.block.set(block.getBlock(), 'start');
            instance.remove();
        }

    },
    _convertListItem(type, instance, elm) {
        if (type === 'text') {
            if (!instance.hasParentList()) {
                return this._replaceListTodoToText('text', 'list', instance);
            }
        }
        else if (type === 'heading') {
            if (!instance.hasParentList()) {
                return this._replaceListTodoToText('heading', 'list', instance);
            }
        }
        else if (type === 'todo') {
            let content = instance.getContent(),
                block = this.app.create('block.todoitem', { content: content }),
                $block = block.getBlock();

            instance.getBlock().after($block);
            instance.remove();

            // set tmp class
            $block.closest('[data-rx-type=list]').addClass('rx-format-listitem-to-todo');

            return block;
        }
        else if (type === 'list') {
            return this._replaceListToList(this.tag, instance, elm);
        }
    },
    _convertTodo(type, instance, elm) {
        let $el = instance.getBlock(),
            items = instance.getItems(),
            first,
            item,
            block;

        if (type === 'text' || type === 'heading') {

            for (let i = 0; i < items.length; i++) {
                block = (type === 'text') ? this.app.create('block.text', { content: items[i].content }) : this.app.create('block.heading', { level: this.tag.replace('h', ''), content: items[i].content });
                if (i === 0) first = block;
                instance.getBlock().before(block.getBlock());
            }

            if (first) {
                this.app.block.set(first.getBlock(), 'start');
            }
            instance.remove();
        }
        else if (type === 'quote') {
            let str = '';
            for (let i = 0; i < items.length; i++) {
                str = str + items[i].content;
            }

            block = this.app.create('block.quote', { content: str });
            instance.getBlock().before(block.getBlock());
            this.app.block.set(block.getBlock(), 'start');
            instance.remove();
        }
        else if (type === 'list') {
            block = this.app.create('block.list', { numbered: (this.tag === 'ol') });
            instance.getBlock().before(block.getBlock());
            block.setEmpty();

            for (let i = 0; i < items.length; i++) {
                item = this.app.create('block.listitem', { content: items[i].content });
                block.getBlock().append(item.getBlock());
            }

            this.app.block.set(block.getBlock(), 'start');
            instance.remove();
        }
    },
    _convertTodoItem(type, instance, elm) {
        if (type === 'text') {
            return this._replaceListTodoToText('text', 'todo', instance);
        }
        else if (type === 'heading') {
            return this._replaceListTodoToText('heading', 'todo', instance);
        }
        else if (type === 'list') {
            return this._replaceTodoToList(instance);
        }
    },
    _convertPreQuote(type, instance, elm) {
        if (type === 'text') {
            return this._replaceToText(instance);
        }
        else if (type === 'heading') {
            return this._replaceToHeading(instance);
        }
        else if (type === 'list') {
            return this._replaceToList(instance);
        }
        else if (type === 'todo') {
            return this._replaceToTodo(instance);
        }
        else if (type === 'quote') {
            return this._replaceToQuote(instance);
        }
    },
    _replaceToList(instance) {
        let content = instance.getPlainText(),
            block = this.app.create('block.list', { numbered: (this.tag === 'ol') });

        block.getFirstItemInstance().setContent(content);

        let dataStyle = instance.getBlock().attr('data-rx-style-cache');
        if (dataStyle) {
            block.getBlock().attr('style', dataStyle);
        }

        instance.getBlock().after(block.getBlock());
        instance.remove();

        return block;
    },
    _replaceToTodo(instance) {
        let content = instance.getPlainText(),
            block = this.app.create('block.todo');

        block.getFirstItemInstance().setContent(content);
        instance.getBlock().after(block.getBlock());
        instance.remove();

        return block;
    },
    _replaceToQuote(instance) {
        let content = instance.getPlainText(),
            block = this.app.create('block.quote', { content: content });

        let dataStyle = instance.getBlock().attr('data-rx-style-cache');
        if (dataStyle) {
            block.getBlock().attr('style', dataStyle);
        }

        instance.getBlock().after(block.getBlock());
        instance.remove();

        return block;
    },
    _replaceToHeading(instance) {
        let content = instance.getContent(),
            block = this.app.create('block.heading', { level: this.tag.replace('h', ''), content: content });

        instance.getBlock().after(block.getBlock());
        instance.remove();

        return block;
    },
    _replaceToText(instance) {
        let content = instance.getContent(),
            block = this.app.create('block.text', { content: content });

        instance.getBlock().after(block.getBlock());
        instance.remove();

        return block;
    },
    _replaceListTodoToText(mode, type, instance) {
        let content = instance.getContent(),
            block = (mode === 'text') ? this.app.create('block.text', { content: content }) : this.app.create('block.heading', { level: this.tag.replace('h', ''), content: content }),
            $block = block.getBlock();

        instance.getBlock().after($block);
        instance.remove();

        // set tmp class
        $block.closest('[data-rx-type=' + type + ']').addClass('rx-format-' + type + '-to-text');

        return block;
    },
    _replaceTodoToList(instance) {
        let content = instance.getContent(),
            block = this.app.create('block.listitem', { content: content }),
            $block = block.getBlock();

        instance.getBlock().after($block);
        instance.remove();

        // set tmp class
        $block.closest('[data-rx-type=todo]').addClass('rx-format-todo-to-listitem');

        return block;
    },
    _replaceListToList(tag, instance, elm) {
        let $el = instance.getBlock(),
            newType = 'list',
            $newBlock;

        if (instance.isType('listitem')) {
            $el = instance.getParentTop();
        }

        if (tag === $el.get().tagName.toLowerCase()) {
            return;
        }

        // replace
        return this._replaceListToListElement(newType, tag, $el, elm);

    },
    _replaceListToListElement(type, tag, $el, elm) {
        // replace
        let instance = $el.dataget('instance'),
            attrs = (instance) ? instance.getAttrs() : null,
            $newBlock = elm.replaceToTag($el, tag),
            block;

        $newBlock.removeAttr('data-rx-type');
        $newBlock.children().removeAttr('data-rx-type');

        // parse instance
        block = this.app.create('block.' + type, $newBlock);
        block.setAttrs(attrs);

        // replace children
        $newBlock.find('ol, ul').each(function($list) {
            this._replaceListToListElement(type, tag, $list, elm);
        }.bind(this));

        return block;
    },
    _replaceTo(newType, tag, instance, elm) {
        let $el = instance.getBlock(),
            elTag = instance.getTag(),
            block,
            attrs = instance.getAttrs(),
            $newBlock;

        if (tag === elTag) return;

        // replace
        $newBlock = elm.replaceToTag($el, tag);
        $newBlock.removeAttr('data-rx-type');

        // parse instance
        block = this.app.create('block.' + newType, $newBlock);
        block.setAttrs(attrs);

        return block;
    },
    _buildTag() {
        let tag = this.name;
        if (this.name === 'numberedlist') {
            tag = 'ol';
        }
        else if (this.name === 'bulletlist') {
            tag = 'ul';
        }
        else if (this.name === 'text') {
            tag = this.opts.get('markup');
        }
        else if (this.params.tag) {
            tag = this.params.tag;
        }

        return tag;
    },
    _buildType() {
        let type = this.params.type || this.name;

        if (['text', 'p', 'div'].indexOf(this.tag) !== -1) {
            type = 'text';
        }
        else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(this.tag) !== -1) {
            type = 'heading';
        }
        else if (['ol', 'ul'].indexOf(this.tag) !== -1) {
            type = 'list';
        }

        return type;
    },
    _isParams() {
        return (this.params.style || this.params.classname || this.params.attrs);
    },
    _hasSameTag(instance) {
        let tag = instance.getTag();

        if (instance.isType('quote') && this.tag === 'quote') {
            return true;
        }
        else if (instance.isType(['todo', 'todoitem']) && this.tag === 'todo') {
            return true;
        }

        return (tag === this.tag);
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'hotkeys', {
    init() {
        // remove
        if (this.opts.is('hotkeysRemove')) {
            let keys = this.opts.get('hotkeysRemove');
            for (let i = 0; i < keys.length; i++) {
                this.remove(keys[i]);
            }
        }

        // add
        if (this.opts.is('hotkeysAdd')) {
            let obj = this.opts.get('hotkeysAdd');
            for (let [key, val] of Object.entries(obj)) {
                this.opts.set('hotkeys.' + key, val);
            }
        }

        // local
        this.hotkeys = this.opts.get('hotkeys');

        // based on https://github.com/jeresig/jquery.hotkeys
        this.hotkeysKeys = {
            8: "backspace", 9: "tab", 10: "return", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
            20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
            37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del", 59: ";", 61: "=",
            96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
            104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
            112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
            120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 173: "-", 186: ";", 187: "=",
            188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: "'"
        };

        this.hotkeysShiftNums = {
            "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
            "8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<",
            ".": ">",  "/": "?",  "\\": "|"
        };
    },
    add(keys, obj) {
        this.hotkeys[keys] = obj;
    },
    remove(key) {
        this.opts.set('hotkeys', this._remove(key, this.opts.get('hotkeys')));
        this.opts.set('hotkeysBase', this._remove(key, this.opts.get('hotkeysBase')));
    },
    popup(e, button) {
        let meta = (/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) ? 'Cmd' : 'Crtl',
            items = {},
            z = 0;

        // items
        z = this._buildPopupItems(items, z, this.opts.get('hotkeysBase'), meta, 'base');
        this._buildPopupItems(items, z, this.hotkeys, meta);

        // create
        let dropdown = this.app.create('dropdown', 'hotkeys', { width: '320px', items: items });
        this.app.dropdown.open(e, button, dropdown);
    },
    handle(e) {
        this.triggered = false;

        // disable browser's hot keys for bold and italic if shortcuts off
        if (this.hotkeys === false) {
            if ((e.ctrlKey || e.metaKey) && (e.which === 66 || e.which === 73)) {
                e.preventDefault();
            }
            return true;
        }

        // build
        if (e.ctrlKey || e.metaKey || e.shoftKey || e.altKey) {
            for (let [key, item] of Object.entries(this.hotkeys)) {
                this._build(e, key, item);
            }
        }

        return (this.triggered);
    },

    // =private
    _buildPopupItems(items, z, hotkeys, meta, type) {
        for (let [key, item] of Object.entries(hotkeys)) {
            let $item = this.dom('<div>'),
                title = (type === 'base') ? item : item.title,
                $title = this.dom('<span>').addClass('rx-dropdown-item-title').html(this.lang.parse(title)),
                $kbd = this.dom('<span>').addClass('rx-dropdown-item-hotkey');

            let name = (type === 'base') ? key.replace('meta', meta) : item.name.replace('meta', meta);
            let arr = name.split('+');

            for (let i = 0; i < arr.length; i++) {
                if (arr[i] === 'Cmd' || arr[i] === 'Ctrl') {
                    arr[i] = '<span class="rx-hk-meta">' + arr[i] + '</span>';
                }
                else if (arr[i] === 'alt') {
                    arr[i] = '<span class="rx-hk-alt">Alt</span>';
                }
                else if (arr[i] === 'shift') {
                    arr[i] = '<span class="rx-hk-shift">Shift</span>';
                }
                else {
                    arr[i] = '<span>' + ((arr[i].search(/&/) === -1) ? arr[i].toUpperCase() : arr[i]) + '</span>';
                }
            }
            $kbd.html(arr.join('+'));

            $item.append($title);
            $item.append($kbd);

            items[z] = { title: title, classname: 'rx-dropdown-item', html: $item.html() };

            z++;
        }

        return z;
    },
    _build(e, str, obj) {
        let keys = str.split(',');
        let len = keys.length;
        for (let i = 0; i < len; i++) {
            if (typeof keys[i] === 'string' && !Object.prototype.hasOwnProperty.call(obj, 'trigger')) {
                this._handler(e, keys[i].trim(), obj);
            }
        }
    },
    _handler(e, keys, obj) {
        keys = keys.toLowerCase().split(" ");

        let special = this.hotkeysKeys[e.keyCode],
            character = (e.which !== 91) ? String.fromCharCode(e.which).toLowerCase() : false,
            modif = "",
            possible = {},
            cmdKeys = ["meta", "ctrl", "alt", "shift"];

        for (let i = 0; i < cmdKeys.length; i++) {
            let specialKey = cmdKeys[i];
            if (e[specialKey + 'Key'] && special !== specialKey) {
                modif += specialKey + '+';
            }
        }

        // right cmd
        if (e.keyCode === 93) {
            modif += 'meta+';
        }

        if (special) possible[modif + special] = true;
        if (character) {
            possible[modif + character] = true;
            possible[modif + this.hotkeysShiftNums[character]] = true;

            // "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
            if (modif === "shift+") {
                possible[this.hotkeysShiftNums[character]] = true;
            }
        }

        let len = keys.length;
        for (let z = 0; z < len; z++) {
            if (possible[keys[z]]) {

                e.preventDefault();
                this.triggered = true;
                this.app.api(obj.command, obj.params, e);
                return;
            }
        }
    },
    _remove(keys, obj) {
        return Object.keys(obj).reduce(function(object, key) {
            if (key !== keys) { object[key] = obj[key]; }
            return object;
        }, {});
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'image', {
    modals: {
        add: {
            title: '## modal.add-image ##',
            width: '100%'
        },
        edit: {
            title: '## modal.image ##',
            width: '100%',
            getter: 'block.getData',
            form: {
                width: { type: 'input', width: '100px', label: '## image.width ##', observer: 'image.observeImageWidth' },
                alt: { type: 'input', label: '## image.alt-text ##' },
                caption: { type: 'input', label: '## image.caption ##', observer: 'image.observeImageCaption' },
                url: { type: 'input', label: '## image.link ##', observer: 'image.observeImageLink' },
                target: { type: 'checkbox', text: '## image.link-in-new-tab ##', observer: 'image.observeImageLink' }
            },
            footer:  {
                'save': { title: '## buttons.save ##', command: 'image.save', type: 'primary' },
                'cancel': { title: '## buttons.cancel ##', command: 'modal.close' },
                'remove': { title: '## buttons.delete ##', command: 'image.remove', type: 'danger', right: true }
            }
        }
    },
    init() {
        this.dataStates = [];
    },
    popupWrap(e, button) {
        let items = this.opts.get('wrap'),
            buttons = {},
            instance = this.app.block.get(),
            classname = (instance) ? instance.getClassname(items) : 'none';

        for (let [key, value] of Object.entries(items)) {
            buttons[key] = {
                title: this.lang.get('wrap.wrap-' + key),
                command: 'image.wrap',
                active: (key === classname),
                params: {
                    classname: value
                }
            };
        }

        let dropdown = this.app.create('dropdown', 'wrap', { items: buttons });
        this.app.dropdown.open(e, button, dropdown);
    },
    popupOutset(e, button) {
        let items = this.opts.get('outset'),
            buttons = {},
            instance = this.app.block.get(),
            classname = (instance) ? instance.getClassname(items) : 'none';

        for (let [key, value] of Object.entries(items)) {
            buttons[key] = {
                title: this.lang.get('outset.outset-' + key),
                command: 'image.outset',
                active: (key === classname),
                params: {
                    classname: value
                }
            };
        }

        let dropdown = this.app.create('dropdown', 'wrap', { items: buttons });
        this.app.dropdown.open(e, button, dropdown);
    },
    popup(e, button) {
        let stack = this.app.create('stack');
        stack.create('image', this.modals.add);
        let $modal = stack.getBody();

        this._createImageByUrl($modal);
        this._createOrSection($modal);
        this._createUploadBox($modal);
        this._createSelectBox($modal);

        // open
        this.app.modal.open({ name: 'image', stack: stack, button: button });

        if (this.opts.is('image.url')) {
            this.$urlinput.focus();
        }
    },
    edit(e, button) {
        let stack = this.app.create('stack');
        stack.create('image-edit', this.modals.edit);
        let $modal = stack.getBody();

        // upload
        this._buildEditUpload($modal);

        // open
        this.app.modal.open({ name: 'image-edit', stack: stack, button: button });
    },
    wrap(params) {
        this.app.dropdown.close();

        let name = params.classname,
            items = this.opts.get('wrap'),
            instance = this.app.block.get();

        if (instance) {
            instance.setClassname(name, items);
            this.app.control.updatePosition();
            this.app.broadcast('image.wrap', { image: instance });
        }
    },
    outset(params) {
        this.app.dropdown.close();

        let name = params.classname,
            items = this.opts.get('outset'),
            instance = this.app.block.get();

        if (instance) {
            instance.setClassname(name, items);
            this.app.control.updatePosition();
            this.app.broadcast('image.outset', { image: instance });
        }
    },
    observe(obj, name) {
        if (name === 'image') {
            let instance = this.app.block.get();
            if (instance && instance.isType('image')) {
                obj.command = 'image.edit';
            }
        }
        else if (name === 'wrap' && !this.opts.is('wrap')) {
            return;
        }
        else if (name === 'outset' && !this.opts.is('outset')) {
            return;
        }

        return obj;
    },
    observeStates() {
        this._findImages().each(this._addImageState.bind(this));
    },
    observeImageLink(obj) {
        return (this.opts.is('image.link')) ? obj : false;
    },
    observeImageCaption(obj) {
        let instance = this.app.block.get();
        if (instance && instance.isFigure()) {
            return obj;
        }

        return false;
    },
    observeImageWidth(obj) {
        return (this.opts.is('image.width')) ? obj : false;
    },
    drop(e, dt) {
        let files = [];
        for (let i = 0; i < dt.files.length; i++) {
            let file = dt.files[i] || dt.items[i].getAsFile();
            if (file) {
                files.push(file);
            }
        }

        let params = {
            url: this.opts.get('image.upload'),
            name: this.opts.get('image.name'),
            data: this.opts.get('image.data'),
            multiple: this.opts.get('image.multiple'),
            success: 'image.insertByDrop',
            error: 'image.error'
        };

        if (files.length > 0) {
            let $block = this.dom(e.target).closest('[data-rx-type]');
            if ($block.length !== 0) {
                this.app.block.set($block);
            }

            // upload
            let upload = this.app.create('upload');
            upload.send(e, files, params);
        }
    },
    parseInserted(inserted) {
        if (!this.opts.is('image.upload')) return;

        let files = [];
        let params = {
            url: this.opts.get('image.upload'),
            name: this.opts.get('image.name'),
            data: this.opts.get('image.data'),
            multiple: true,
            success: 'image.insertFromInserted',
            error: 'image.error'
        };
        this.pasteInsertedImages = [];
        this.resolved = [];

        let fetchImages = 0;
        let instances = [];
        inserted.each(function($node) {
            let inst = $node.dataget('instance');
            if (inst) {
                instances.push(inst);
            }
        });

        for (let i = 0; i < instances.length; i++) {
            let instance = instances[i];
            let type = instance.getType();
            if (type === 'image') {
                let src = instance.getSrc();
                if (src.search(/^data:/i) !== -1) {
                    let blob = this._dataURLtoFile(src, 'image' + i);
                    files.push(blob);
                    this.pasteInsertedImages.push(instance);
                }
                else if (src.search(/^blob:/i) !== -1) {
                    fetchImages++;
                    this.pasteInsertedImages.push(instance);
                    let self = this;
                    function sendFile(src, i) {
                        var xhr = new XMLHttpRequest();
                        xhr.open('GET', src, true);
                        xhr.responseType = 'blob';
                        xhr.onload = function(e) {
                          if (xhr.status == 200) {
                            let blob = xhr.response;
                            let file = new File([blob], 'image' + i, { type: "image/png" });
                            self.resolved.push(file);
                          }
                        };
                        xhr.send();
                    }
                    sendFile(src, i);
                }
            }
        }

        if (fetchImages !== 0) {
            let interval = setInterval(function() {
                if (this.resolved.length === fetchImages) {
                    clearInterval(interval);
                    let upload = this.app.create('upload');
                    upload.send(false, this.resolved, params);
                }
            }.bind(this), 100);
        }

        if (files.length !== 0) {
            let upload = this.app.create('upload');
            upload.send(false, files, params);
        }
    },
    paste(blob, e) {
        if (!this.opts.is('image.upload')) return;

        let params = {
            url: this.opts.get('image.upload'),
            name: this.opts.get('image.name'),
            data: this.opts.get('image.data'),
            multiple: this.opts.get('image.multiple'),
            success: 'image.insertFromBlob',
            error: 'image.error'
        };

        // upload
        let upload = this.app.create('upload');
        upload.send(e, [blob], params);
    },
    insertFromClipboard(clipboard) {
        let text = clipboard.getData("text/plain") || clipboard.getData("text/html");
        text = text.trim();

        if (text !== '') {
            return;
        }

        let items = clipboard.items;
        let blob = null;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") === 0) {
                blob = items[i].getAsFile();
            }
        }

        if (blob !== null) {
            this.paste(blob);
            return true;
        }
    },
    insertFromBlob(response) {
        this.insert(response);
    },
    insertFromInserted(response) {
        let z = 0;
        for (let [key, item] of Object.entries(response)) {
            this.pasteInsertedImages[z].setImage(item);
            z++;
        }
    },
    insertByDrop(response, e) {
        if (this.app.block.is()) {
            let instance = this.app.block.get();
            let target = e.target;
            let type = instance.getType();
            let isChange = (type === 'image');
            let insertion = this.app.create('insertion');

            if (isChange) {
                this.change(response);
                return;
            }
            else if (e && instance.isEditable()) {
                insertion.insertPoint(e);
            }
        }

        this.insert(response);
    },
    insertByUrl(e) {
        e.preventDefault();

        let str = this.$urlinput.val();
        if (str.trim() === '') {
            return;
        }

        let utils = this.app.create('utils');
        let response = {
            file: { url: str, id: utils.getRandomId() }
        };

        // insert
        this.insert(response);
    },
    insertByUpload(response) {
        this.insert(response);
    },
    insertFromSelect(e) {
        e.preventDefault();

        let $target = this.dom(e.target);
        let obj = $target.data();
        let attrs = ['id', 'alt', 'caption', 'url', 'width', 'height'];
        for (let i = 0; i < attrs.length; i++) {
            let val = $target.attr('data-' + attrs[i]);
            if (val !== null) { obj[attrs[i]] = val; }
        }

        // insert
        this.insert({ file: obj }, true);
    },
    insert(response, select) {
        this.app.modal.close();

        // insert
        this.imageslen = 0;
        this.imagescount = 0;

        // tag
        let tag = this.opts.get('image.tag');
        let insertion = this.app.create('insertion');

        // loop
        for (let [key, item] of Object.entries(response)) {
            let $source = this.dom('<' + tag + '>');
            let $image = this._createImageFromResponseItem(item);

            $source.append($image);

            let instance = this.app.create('block.image', $source);
            insertion.insert({ instance: instance });

            // broadcast
            let eventType = (select) ? 'select' : 'upload';
            this.app.broadcast('image.' + eventType, { instance: instance, data: item });

            this.$last = instance.getBlock();
            this.imageslen++;
        }
    },
    createUploadBox(upload, $body) {
        if (!upload) return;

        let $upload = this.dom('<div>');
        $body.append($upload);

        return $upload;
    },
    createSelectBox(select, $body, callback) {
        if (!select) return;

        // images box
        this.$selectbox = this._createImagesBox($body);

        if (typeof select === 'object') {
            this._parseList(select, callback);
        }
        else {
            let getdata = (this.opts.is('reloadmarker')) ? { d: new Date().getTime() } : {};

            this.ajax.request(this.opts.get('image.selectMethod'), {
                url: select,
                data: getdata,
                success: function(data) {
                    this._parseList(data, callback);
                }.bind(this)
            });
        }
    },
    changeClone(response) {
        for (let [key, item] of Object.entries(response)) {
            this.$imageclone.attr('src', item.url);
            break;
        }

        this.change(response, false);
    },
    change(response, closepopup) {
        if (closepopup !== false) {
            this.app.modal.close();
        }

        var instance = this.app.block.get();
        for (var key in response) {
            if (response.hasOwnProperty(key)) {
                instance.setImage(response[key]);

                // broadcast
                this.app.broadcast('image.change', response[key]);
                this.app.broadcast('image.upload', { instance: instance, data: response[key] });
                return;
            }
        }

        // build predefined classes
        this.app.parser.buildPredefinedClasses();
    },
    save(stack) {
        let data = stack.getData();

        this.app.modal.close();
        this.app.block.setData(data);
    },
    remove() {
        this.app.modal.close();
        this.app.block.remove();
    },
    error(response) {
        this.app.broadcast('image.upload.error', { response: response });
    },

    // =private
    _buildUpload($item, callback) {
        if (!this.opts.is('image.upload')) return;

        let params = {
            box: true,
            placeholder: this.lang.get('image.upload-new-placeholder'),
            url: this.opts.get('image.upload'),
            name: this.opts.get('image.name'),
            data: this.opts.get('image.data'),
            multiple: this.opts.get('image.multiple'),
            success: callback,
            error: 'image.error'
        };

        this.app.create('upload', $item, params);
    },
    _buildEditUpload($modal) {
        if (!this.opts.is('image.upload')) return;

        let instance = this.app.block.get();

        // form item
        let $item = this._createFormItem();
        $item.addClass('rx-form-item-edit-image-box');

        // image
        this.$imageclone = instance.getImage().clone();
        this.$imageclone.removeAttr('width height style');

        var $imageitem = this.dom('<div>').addClass('rx-form-item-image');

        $imageitem.append(this.$imageclone);
        $item.append($imageitem);

        // upload item
        this.$upload = this.dom('<div>');
        $item.append(this.$upload);

        // append to popup
        $modal.prepend($item);

        // build upload
        this._buildUpload(this.$upload, 'image.changeClone');
    },
    _createImageFromResponseItem(item) {
        let $image = this.dom('<img>').attr('src', item.url).one('load', this._checkImageLoad.bind(this));

        let attrs = ['id', 'alt', 'width', 'height'];
        attrs.forEach(attr => {
            if (item[attr] !== undefined) {
                $image.attr(attr, item[attr]);
            }
        });

        // srcset & data-image
        if (item.id) $image.attr('data-image', item.id);
        if (item.srcset) $image.attr('srcset', item.srcset);

        // link
        if (item.link) {
            let $link = this.dom('<a>');
            $link.attr('href', item.link);
            $image.wrap($link);
            $image = $link;
        }

        return $image;
    },
    _createSelectBox($body) {
        this.createSelectBox(this.opts.get('image.select'), $body, 'image.insertFromSelect');
    },
    _createImagesBox($body) {
        let $box = this.dom('<div>').addClass('rx-modal-images-box');
        $body.append($box);

        return $box;
    },
    _createOrSection($modal) {
        if (this.opts.is('image.url') && (this.opts.is('image.upload') || this.opts.is('image.select'))) {
            let $section = this.dom('<div>').addClass('rx-modal-image-section-or');
            $section.html(this.lang.get('image.or'));
            $modal.append($section);
        }
    },
    _createImageByUrl($modal) {
        if (!this.opts.is('image.url')) return;

        var $item = this._createFormItem();

        this.$urlinput = this._createUrlInput();
        this.$urlbutton = this._createUrlButton();

        $item.append(this.$urlinput);
        $item.append(this.$urlbutton);

        $modal.append($item);

        // focus
        this.$urlinput.focus();
    },
    _createUploadBox($body) {
        this.$upload = this.createUploadBox(this.opts.get('image.upload'), $body);
        this._buildUpload(this.$upload, 'image.insertByUpload');
    },
    _createFormItem() {
        return this.dom('<div>').addClass('rx-form-container-flex');
    },
    _createUrlInput() {
        let $input = this.dom('<input>').addClass('rx-form-input');
        $input.attr('placeholder', this.lang.get('image.url-placeholder'));

        return $input;
    },
    _createUrlButton() {
        let $button = this.dom('<button>').addClass('rx-form-button rx-form-button-primary');
        $button.html(this.lang.get('buttons.insert'));
        $button.one('click', this.insertByUrl.bind(this));

        return $button;
    },
    _checkImageLoad() {
        this.imagescount++;
        if (this.imagescount === this.imageslen) {
            this.app.block.unset();
            this.app.block.set(this.$last);
        }
    },
    _parseList(data, callback) {
        for (let [key, item] of Object.entries(data)) {
            if (typeof item !== 'object') continue;

            let $img = this.dom('<img>');
            let url = (item.thumb) ? item.thumb : item.url;

            $img.addClass('rx-modal-event');
            $img.attr('src', url);
            $img.attr('data-url', item.url);
            $img.attr('data-callback', callback);

            let attrs = ['id', 'alt', 'caption', 'link', 'width', 'height'];
            for (let i = 0; i < attrs.length; i++) {
                if (Object.prototype.hasOwnProperty.call(item, attrs[i])) {
                    $img.attr('data-' + attrs[i], item[attrs[i]]);
                }
            }

            $img.on('click.rx-modal-event-' + this.uuid, function(e) {
                let $target = this.dom(e.target);
                let callback = $target.attr('data-callback');

                this.app.api(callback, e);

            }.bind(this));

            this.$selectbox.append($img);
        }

    },
    _blobToImage(blob) {
      return new Promise(resolve => {
        const url = URL.createObjectURL(blob);
        let img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.src = url;
      });
    },
    _dataURLtoFile(dataurl, filename) {
        let arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);

        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new File([u8arr], filename, {type:mime});
    },
    _findImages() {
        return this.app.editor.getEditor().find('[data-image]');
    },
    _addImageState($node) {
        let id = $node.attr('data-image');
        this.dataStates[id] = { type: 'image', status: true, url: $node.attr('src'), $img: $node, id: id };
    },
    _setImageState(url, status) {
        this.dataStates[url].status = status;
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'inline', {
    popup(e, button) {
        let buttons = [...this.opts.get('popups.inline')],
            inlineItems = this.opts.get('inlineItems'),
            dropdown,
            activeKeys = this.app.observer.getKeys();

        if (inlineItems) {
            for (let item of Object.values(inlineItems)) {
                item.command = 'inline.set';
            }
        }

        dropdown = this.app.create('dropdown', 'inline', { items: buttons, extend: inlineItems, keys: activeKeys });
        this.app.dropdown.open(e, button, dropdown);
    },
    set(params) {
        if (this.app.block.isTool()) return;

        let $nodes = this.dom([]),
            selection = this.app.create('selection');

        // close
        this.app.dropdown.close();

        // params
        this.params = params || {};

        // normalize style
        if (this.params.style) {
            let obj = {};
            for (let [key, val] of Object.entries(this.params.style)) {
                let str = key.replace( /([A-Z])/g, " $1" );
                str = str.split(' ').join('-').toLowerCase();
                obj[str] = val;
            }

            this.params.style = obj;
        }

        if (!selection.getRange()) return;

        if (selection.isCollapsed()) {
            $nodes = this._formatCollapsed();
        }
        else {
            $nodes = this._formatUncollapsed();
        }

        this.app.context.updatePosition();
        this.app.broadcast('inline.set', { $nodes: $nodes });
        this.app.sync.trigger();
        this.app.observer.observe();

        return $nodes;
    },
    remove(params) {
        let selection = this.app.create('selection'),
            cleaner = this.app.create('cleaner'),
            inlines = selection.getNodes({ type: 'inline', link: true }),
            inline = selection.getTopInline();

        // make split
        if (selection.isCollapsed() && inline) {
            let caret = this.app.create('caret'),
                tag = inline.tagName.toLowerCase(),
                $target = this._insertSplit(inline, tag);

            caret.set($target, 'before');
            return;
        }

        // remove
        this.app.editor.save();
        if (params.style) {
            let arr = (Array.isArray(params.style)) ? params.style : [params.style];
            for (let i = 0; i < inlines.length; i++) {
                let $el = this.dom(inlines[i]);
                $el.removeAttr('data-rx-style-cache');
                for (let z = 0; z < arr.length; z++) {
                    $el.css(arr[z], '');
                }
                if ($el.attr('style') === '') {
                    $el.removeAttr('style');
                }
                cleaner.cacheElementStyle($el);
            }
        }
        else if (params.classname) {
            for (let i = 0; i < inlines.length; i++) {
                let $el = this.dom(inlines[i]);
                $el.removeClass(params.classname);
                if ($el.attr('class') === '') {
                    $el.removeAttr('class');
                }
            }
        }
        this.app.editor.restore();
        this.app.observer.observe();
    },
    removeFormat() {
        this.app.dropdown.close();
        this.app.modal.close();

        // instance
        let instance = this.app.block.get(),
            $block,
            nodes,
            selection = this.app.create('selection'),
            i = 0,
            $node;

        if (!instance) return;

        // save selection
        $block = instance.getBlock();
        this.app.editor.save($block);

        nodes = selection.getNodes({ type: 'inline', link: true });
        for (i; i < nodes.length; i++) {
            $node = this.dom(nodes[i]);

            if (nodes[i].tagName === 'A') {
                $node.removeAttr('style data-rx-style-cache');
                continue;
            }

            if (!$node.attr('data-rx-type')) {
                $node.unwrap();
            }
        }

        // restore selection
        this.app.editor.restore();
        this.app.observer.observe();
    },
    _formatCollapsed() {
        let node,
            selection = this.app.create('selection'),
            caret = this.app.create('caret'),
            utils = this.app.create('utils'),
            inline = selection.getInline(),
            $inline = this.dom(inline),
            tags = this._getTags(),
            hasSameTag = this._isSameTag(inline, tags),
            point = (this.params && this.params.caret) ? this.params.caret : false;

        // save
        this.app.editor.save();

        // 1) not inline
        if (!inline) {
            node = this._insertInline(this.params.tag, point);
            node = this._setParams(node);
        }
        // 2) inline is empty
        else if (inline && utils.isEmptyHtml(inline.innerHTML)) {
            // 2.1) has same tag
            if (hasSameTag) {
                // 2.2.1) params
                if (this._isParams()) {
                    // all the same
                    if (this._hasAllSameParams(inline)) {
                        caret.set(inline, (point) ? point : 'after');
                        $inline.remove();
                    }
                    else if (this._hasSameClassname(inline)) {
                        this.app.editor.restore();
                        node = this._setStyle(inline);
                    }
                    else if (this._hasSameStyle(inline)) {
                        this.app.editor.restore();
                        node = this._setClassname(inline);
                    }
                    // not the same
                    else {
                        this.app.editor.restore();
                        node = this._setParams(inline);
                    }
                }
                // 2.2.2) no params
                else {
                    caret.set(inline, (point) ? point : 'after');
                    $inline.remove();
                }
            }
            // 2.2) has a different tag
            else {
                node = this._insertInline(this.params.tag, point);
                node = this._setParams(node);
            }
        }
        // 3) inline isn't empty
        else if (inline) {
            // 3.1) has same tag
            if (hasSameTag) {
                // 3.1.1) params
                if (this._isParams()) {
                    // all the same
                    if (this._hasAllSameParams(inline)) {
                        this._makeSplit(inline, point);
                    }
                    else if (this._hasSameClassname(inline)) {
                        node = this._insertInline(this.params.tag, point);
                        node = this._setStyle(node);
                    }
                    else if (this._hasSameStyle(inline)) {
                        node = this._insertInline(this.params.tag, point);
                        node = this._setClassname(node);
                    }
                    // not the same
                    else {
                        node = this._insertInline(this.params.tag, point);
                        node = this._setParams(node);
                    }
                }
                // 3.1.2) no params
                else {
                    this._makeSplit(inline, point);
                }
            }
            // 3.2) has a different tag
            else {
                node = this._insertInline(this.params.tag, point);
                node = this._setParams(node);
            }
        }

        return this.dom(node);
    },
    _formatUncollapsed() {

        let selection = this.app.create('selection'),
            caret = this.app.create('caret'),
            $nodes = false,
            selectedAll = this.app.editor.isSelectAll(),
            $blocks = this.dom(selection.getNodes({ type: 'block', partial: true }));

        let inlines = selection.getNodes({ type: 'inline' });

        // convert tags
        this.app.editor.save();
        this._convertTags($blocks, inlines);
        this.app.editor.restore();

        // convert strike
        this.app.editor.save();
        this._convertToStrike();
        this.app.editor.restore();

        // apply strike
        this.app.getDocNode().execCommand('strikethrough');

        // revert strike
        this.app.editor.save();
        $nodes = this._revertToInlines($blocks);
        this.app.editor.restore();

        // clean up
        this._clearEmptyStyle();

        // apply params
        this.app.editor.save();
        $nodes.each(this._applyParams.bind(this));
        this.app.editor.restore();

        // normalize
        $blocks.each(function($node) {
            $node.get().normalize();
        });

        // revert tags
        this.app.editor.save();
        this._revertTags($blocks);
        this.app.editor.restore();

        // caret
        if (this.params.caret) {
            let $last = $nodes.last();
            caret.set($last, this.params.caret);
        }

        // all selected
        if (selectedAll) {
            this.app.editor.setSelectAll();
        }

        return $nodes;
    },

    // params
    _isParams() {
        return (this.params.style || this.params.classname);
    },
    _applyParams($node) {
        let tag = $node.get().tagName.toLowerCase(),
            tags = this._getTags(),
            utils = this.app.create('utils'),
            $parent = $node.parent(),
            hasSameTag = ($parent.length !== 0) ? this._isSameTag($parent.get(), tags) : false;

        if (hasSameTag && $parent.text() === $node.text()) {
            // parent has same params keys
            if (this.params.style) {
                let obj = this.params.style,
                    parentObj = utils.cssToObject($parent.attr('style')),
                    len = Object.keys(obj).length,
                    size = 0;

                for (let key of Object.keys(obj)) {
                    if (parentObj[key]) {
                        size++;
                    }
                }

                if (size === len) {
                    $parent.unwrap();
                }
                else {
                    $node.unwrap();
                    this._applyParamsToNode($parent, tag);
                }
            }
        }

        this._applyParamsToNode($node, tag);
    },
    _applyParamsToNode($node, tag) {
        $node.removeAttr('data-rx-style-cache');
        if ($node.attr('class') === '') $node.removeAttr('class');
        if ($node.get().attributes.length === 0) {
            if (this._isParams() && this.params.tag === 'span') {
                this._setParams($node);
                this._clearSpanInside($node);
            }
            else if (tag === 'span') {
                $node.unwrap();
            }
        }
        else if (this._isParams()) {
            this._setParams($node);
            this._clearSpanInside($node);
        }
    },
    _setParams(el) {
        el = this._setClassname(el);
        el = this._setStyle(el);

        return el;
    },
    _setClassname(el) {
        let $node = this.dom(el);

        if (this.params.classname) {
            // remove group classes
            if (this.params.group) {
                let optName = 'inlineGroups.' + this.params.group;
                let classes = (this.opts.is(optName)) ? this.opts.get(optName) : false;
                if (classes) {
                    $node.removeClass(classes.join(' '));
                }
            }
            // remove class
            else {
                $node.removeAttr('class');
            }

            // add class
            $node.addClass(this.params.classname);
        }

        return $node.get();
    },
    _setStyle(el) {
        let $node = this.dom(el),
            cleaner = this.app.create('cleaner');

        if (this.params.style) {
            $node.css(this.params.style);
            cleaner.cacheElementStyle($node);
        }

        return $node.get();
    },
    _hasAllSameParams(el) {
        return (this._hasSameClassname(el) && this._hasSameStyle(el));
    },
    _hasSameClassname(el) {
        let $el = this.dom(el);

        if (this.params.classname) {
            return $el.hasClass(this.params.classname);
        }

        return true;
    },
    _hasSameStyle(el) {
        let $el = this.dom(el),
            elm = this.app.create('element');

        if (this.params.style) {
            return elm.compareStyle($el, this.params.style);
        }

        return true;
    },

    // insert
    _makeSplit(inline, point) {
        let caret = this.app.create('caret'),
            isEnd = caret.is(inline, 'end'),
            target = inline;

        if (isEnd) {
            point = 'after';
        }
        else {
            target = this._insertSplit(inline);
        }

        caret.set(target, (point) ? point : 'before');
    },
    _insertSplit(inline, tag) {
        let utils = this.app.create('utils'),
            elm = this.app.create('element'),
            $inline = this.dom(inline),
            extractedContent = utils.extractHtmlFromCaret(inline),
            $secondPart = this.dom('<' + (tag || this.params.tag) + ' />'),
            div = document.createElement("div");

        div.appendChild(extractedContent);

        $secondPart = elm.cloneAttrs(inline, $secondPart);
        $secondPart.append(div.innerHTML);

        $inline.after($secondPart);

        return $secondPart;
    },
    _insertInline(tag, point) {
        let insertion = this.app.create('insertion');

        return insertion.insertNode(document.createElement(tag), (point) ? point : 'start');
    },

    // tag
    _isSameTag(inline, tags) {
        return (inline && tags.indexOf(inline.tagName.toLowerCase()) !== -1);
    },
    _getTags() {
        let tags = [this.params.tag];
        if (this.params.tag === 'b' || this.params.tag === 'strong') {
            tags = ['b', 'strong'];
        }
        else if (this.params.tag === 'i' || this.params.tag === 'em') {
            tags = ['i', 'em'];
        }

        return tags;
    },

    // convert
    _convertToStrike() {
        let selection = this.app.create('selection'),
            utils = this.app.create('utils'),
            inlines = selection.getNodes({ type: 'inline', link: true, buttons: true }),
            selected = selection.getText().replace(/[-[\]/{}()*+?.\\^$|]/g, "\$&"),
            tags = this._getTags(),
            inline,
            $inline,
            tag,
            hasSameArgs,
            convertable = false;

        for (let i = 0 ; i < inlines.length; i++) {
            inline = inlines[i];
            $inline = this.dom(inline);
            tag = inlines[i].tagName.toLowerCase();
            hasSameArgs = this._hasAllSameParams(inline);

            // link fully selected
            if (tag === 'a') {
                if (this.params.tag === 'span' && this._isFullySelected(inline, selected)) {
                    let css = utils.cssToObject($inline.attr('style'))
                    $inline.addClass('rx-inline-convertable');
                    $inline.removeAttr('data-rx-style-cache');
                    if (css && css['text-decoration']) {
                        $inline.attr('data-rx-inline-line', css['text-decoration']);
                    }
                    continue;
                }
            }

            if (tags.indexOf(tag) !== -1) {
                if (this.params.tag === 'span' && this._isFullySelected(inline, selected)) {
                    $inline.addClass('rx-inline-convertable');
                    $inline.removeAttr('data-rx-style-cache');
                }
                else if (hasSameArgs && this.params.tag !== 'a') {
                    this._replaceToStrike($inline);
                }
                else if (this.params.tag === 'span') {
                    if (this.params.style && this._hasSameStyle($inline)) {
                        convertable = true;
                    }
                    if (this.params.classname && this._hasSameClassname($inline)) {
                        convertable = true;
                    }

                    if (convertable) {
                        $inline.addClass('rx-inline-convertable');
                        $inline.removeAttr('data-rx-style-cache');
                    }
                    else {
                        $inline.addClass('rx-inline-unconvertable');
                    }
                }
                else if (!hasSameArgs) {
                    $inline.addClass('rx-inline-convertable');
                    $inline.removeAttr('data-rx-style-cache');
                }
            }
        }
    },
    _convertInlineBlocks($blocks) {
         $blocks.find('[data-rx-inline]').each(function($node) {
            if ($node.attr('contenteditable') === true) {
                $node.addClass('rx-inlineblock-editable').attr('contenteditable', false);
            }
        });
    },
    _convertTag(tag, $blocks) {
        let elm = this.app.create('element');

        if (this.params.tag !== tag) {
            $blocks.find(tag).each(function($node) {
                let $el = elm.replaceToTag($node, 'span');
                $el.addClass('rx-convertable-' + tag);
            });
        }
        else if (this.params.tag === 'del') {
            $blocks.find(tag).each(function($node) {
                elm.replaceToTag($node, 'strike');
            });
        }
    },
    _convertTags($blocks, inlines) {
        this._convertTag('del', $blocks);
        this._convertTag('u', $blocks);
        this._convertInlineBlocks($blocks);
    },
    _replaceToStrike($el) {
        $el.replaceWith(function(node) {
            return this.dom('<strike>').append($el.contents());
        }.bind(this));
    },
    _revertInlineBlocks($blocks) {
        $blocks.find('.rx-inlineblock-editable').removeClass('rx-inlineblock-editable').attr('contenteditable', true);
    },
    _revertTag(tag, $blocks) {
        let elm = this.app.create('element');
        $blocks.find('span.rx-convertable-' + tag).each(function(node) {
            let $el = elm.replaceToTag(node, tag);
            $el.removeAttr('class');
        }.bind(this));
    },
    _revertTags($blocks) {
        this._revertTag('u', $blocks);
        this._revertTag('del', $blocks);
        this._revertInlineBlocks($blocks);
    },
    _revertToInlines($blocks) {
        let $nodes = this.dom([]),
            elm = this.app.create('element');

        if (this.params.tag !== 'u') {
            $blocks.find('u').unwrap();
        }

        // styled
        $blocks.each(function($node) {
            $node.find('*').each(function($el) {
                if ($el.get().style.textDecorationLine) {
                   $el.css('text-decoration-line', '');
                   $el.wrap('<u>');
                   if ($el.attr('style') === '') {
                       $el.removeAttr('style');
                   }
               }
           });
        });

        // span convertable
        $blocks.find('.rx-inline-convertable').each(function($node) {
            $node.find('strike').each(function($strike) {
                if ($node.text() === $strike.text()) {
                    $strike.unwrap();
                }
            });
            $node.removeClass('rx-inline-convertable');

            let lineDecoration = $node.attr('data-rx-inline-line');
            if (lineDecoration) {
                $node.css('text-decoration', lineDecoration);
                $node.removeAttr('data-rx-inline-line');
            }

            elm.removeEmptyAttr($node, 'class');
            if (this._hasAllSameParams($node)) {
                $node.unwrap();
            }
            else {
                $nodes.add($node);
            }

        }.bind(this));

        // span unconvertable
        $blocks.find('span.rx-inline-unconvertable').each(function($node) {
            $node.removeClass('rx-inline-unconvertable');
            elm.removeEmptyAttr($node, 'class');

        }.bind(this));

        // strike
        $blocks.find('strike').each(function($node) {
            $node = elm.replaceToTag($node, this.params.tag);
            $nodes.add($node);
        }.bind(this));

        return $nodes;

    },
    _clearEmptyStyle() {
        let selection = this.app.create('selection'),
            inlines = selection.getNodes({ type: 'inline' }),
            i = 0,
            max = inlines.length,
            childNodes,
            z = 0;

        for (i; i < max; i++) {
            this._clearEmptyStyleAttr(inlines[i]);

            childNodes = inlines[i].childNodes;
            if (childNodes) {
                for (z; z < childNodes.length; z++) {
                    this._clearEmptyStyleAttr(childNodes[z]);
                }
            }
        }
    },
    _clearEmptyStyleAttr(node) {
        if (node.nodeType !== 3 && node.getAttribute('style') === '') {
            node.removeAttribute('style');
        }
    },
    _clearSpanInside($node) {
        $node.find('span').each(function($el) {
            if (this.params.classname) {
                $el.removeAttr('class');
            }
            if (this.params.styles) {
                for (let key of Object.keys(this.params.styles)) {
                    $el.css(key, '');
                }
            }

            if ($el.attr('class') === '') $el.removeAttr('class');
            if ($el.attr('style') === '') $el.removeAttr('style');

            if ($el.get().attributes.length === 0) {
                $el.unwrap();
            }

        }.bind(this));
    },
    _isFullySelected(node, selected) {
        let utils = this.app.create('utils'),
            text = utils.removeInvisibleChars(node.textContent);

        return (selected === text || selected.search(new RegExp('^' + utils.escapeRegExp(text) + '$')) !== -1);
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'link', {
    dropdowns: {
        format: {
            link: { title: '## link.link ##', command: 'link.popupCreate', icon: false, shortcut: 'Ctrl+k' },
            unlink: { title: '## link.unlink ##', command: 'link.unlink', icon: false }
        },
        change: {
            link: { title: '## link.edit-link ##', command: 'link.popupEdit', icon: false,  shortcut: 'Ctrl+k' },
            unlink: { title: '## link.unlink ##', command: 'link.unlink', icon: false }
        }
    },
    modals: {
        create: {
            title: '## modal.link ##',
            width: '600px',
            form:  {
                text: { type: 'input', label: '## link.text ##' },
                url: { type: 'input', label: '## link.url ##' },
                target: { type: 'checkbox', text: '## link.link-in-new-tab ##' }
            },
            footer: {
                insert: { title: '## buttons.insert ##', command: 'link.insert', type: 'primary' },
                cancel: { title: '## buttons.cancel ##', command: 'modal.close' }
            }
        },
        edit: {
            title: '## modal.link ##',
            width: '600px',
            form: {
                text: { type: 'input', label: '## link.text ##' },
                url: { type: 'input', label: '## link.url ##' },
                target: { type: 'checkbox', text: '## link.link-in-new-tab ##' }
            },
            footer: {
                save: { title: '## buttons.save ##', command: 'link.save', type: 'primary' },
                cancel: { title: '## buttons.cancel ##', command: 'modal.close' }
            }
        }
    },
    init() {
        this.truncateSize = 24;
    },
    popup(e, button) {
        let $link = this.get(),
            len = $link.length,
            selection = this.app.create('selection'),
            text = selection.getText(),
            stack;

        if (!selection.is() || len === 0) {
            this.popupCreate(e, button);
        }
        else if (len === 1) {
            let dropdown = this.app.create('dropdown', 'link', { items: this.dropdowns.change });
            this.app.dropdown.open(e, button, dropdown);
        }
    },
    popupCreate(e, button) {
        let selection = this.app.create('selection');
        let text = selection.getText();

        let stack = this.app.create('stack');
        stack.create('image', this.modals.create);

        stack.setData({
            text: (text) ? text : '',
            target: this.opts.get('link.target')
        });

        this.app.modal.open({ name: 'link', focus: 'text', stack: stack, button: button });
    },
    popupEdit(e, button) {
        let stack = this.app.create('stack');
        stack.create('image', this.modals.edit);

        let $link = this.get();
        let data = this._getLinkData($link);

        stack.setData(data);
        this.app.modal.open({ name: 'link', focus: 'url', stack: stack, button: button });
    },
    set(data) {
        let selection = this.app.create('selection');
        let nodes = this.app.inline.set({ tag: 'a' });
        let $link = this.dom(nodes.first());

        if (!data.text) {
            data.text = selection.getText();
        }

        // save
        this.app.editor.save();

        data = this._setData(data, $link);
        if (!data) {
            this.app.editor.restore();
        }
        else {
            selection.select($link);
            this.app.broadcast('link.add', { element: $link, data: data });
        }

        this.app.observer.observe();
    },
    save(stack) {
        this.app.modal.close();

        let $link = this.get();

        // save
        this.app.editor.save();

        let data = stack.getData();
        data = this._setData(data, $link);

        // restore
        this.app.editor.restore();
        this.app.observer.observe();

        // broadcast
        this.app.broadcast('link.change', { element: $link, data: data });
    },
    insert(stack) {
        this.app.modal.close();
        this.set(stack.getData());
    },
    open(e, button) {
        let params = button.getParams();
        if (params.href) {
            this.app.getWinNode().open(params.href, "_blank");
        }
    },
    observe(obj, name, toolbar) {
        let selection = this.app.create('selection');

        if (toolbar === 'context' && name === 'link' && selection.is()) {
            let $links = this.getLinks();
            if ($links.length === 1) {
                let linkText = $links.eq(0).attr('href');

                this.app.context.add('link-text', {
                    title: this._truncateLinkText(linkText),
                    tooltip: false,
                    text: true,
                    params: { href: linkText }
                });
                this.app.context.add('unlink');
            }
            else if ($links.length > 1) {
                this.app.context.add('unlink');
            }
        }

        return obj;

    },
    unlink() {
        this.app.modal.close();
        this.app.dropdown.close();
        this.app.context.close();

        let selection = this.app.create('selection'),
            links = selection.getNodes({ tags: ['a'] }),
            $link;

        if (links.length === 0) return;

        // save selection
        this.app.editor.save();

        // unlink
        links.forEach(function(link) {
            $link = this.dom(link);

            let data = { url: $link.attr('href'), text: $link.text() };

            // broadcast
            this.app.broadcast('link.remove', { data: data });

            // remove
            $link.unwrap();
        }.bind(this));

        // restore selection
        this.app.editor.restore();
        this.app.observer.observe();
    },
    getLinks() {
        return this._getLinks();
    },
    get() {
        let links = this._getLinks();

        return (links.length !== 0) ? links.eq(0) : this.dom();
    },

    // =private
    _setData(data, $link) {

        data = this._cleanUrl(data);
        data = this._encodeUrl(data);

        if (data.url === '') {
            $link.unwrap();
            this.app.editor.restore();
            return;
        }

        data = this._setUrl($link, data);

        if ($link.length === 1) {
            data = this._setText($link, data);
        }

        data = this._setTarget($link, data);

        // set element
        data.element = $link;

        return data;
    },
    _setUrl($link, data) {
        $link.attr('href', data.url);

        return data;
    },
    _setText($link, data) {
        data.text = (data.text === '') ? data.url : data.text;
        $link.text(data.text);

        return data;
    },
    _setTarget($link, data) {
        if (data.target) {
            $link.attr('target', '_blank');
        }
        else {
            $link.removeAttr('target');
        }

        return data;
    },
    _getLinkData($link) {
        let data = {};

        if ($link.length !== 0) {
            data = {
                text: $link.text(),
                url: $link.attr('href'),
                target: $link.attr('target') || this.opts.get('link.target')
            };

            // clean
            data = this._encodeUrl(data);
        }

        return data;
    },
    _getLinks() {
        let selection = this.app.create('selection');
        if (!selection.is()) {
            return this.dom();
        }

        let links = selection.getNodes({ tags: ['a'] });

        return (links.length !== 0) ? this.dom(links) : this.dom();
    },
    _truncateLinkText(text) {
        text = text.replace(/^https?\:\/\//i, '');
        return (text.length > this.truncateSize) ? text.substring(0, this.truncateSize) + '...' : text;
    },
    _cleanUrl(data) {
        let cleaner = this.app.create('cleaner');

        data.url = cleaner.escapeHtml(data.url);
        data.url = (data.url.search(/^javascript:/i) !== -1) ? '' : data.url;

        return data;
    },
    _encodeUrl(data) {
        data.url = (data.url) ? data.url.replace(/&amp;/g, '&') : '';

        return data;
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'list', {
    dropdowns: {
        list: ['bulletlist', 'numberedlist'],
        haslist: ['bulletlist', 'numberedlist', 'indent', 'outdent']
    },
    popup(e, button) {
        let items = (this._isList()) ? this.dropdowns.haslist : this.dropdowns.list;

        let dropdown = this.app.create('dropdown', 'list', { items: items });
        this.app.dropdown.open(e, button, dropdown);
    },
    indent() {
        let selection = this.app.create('selection'),
            item = selection.getBlock(),
            $item = this.dom(item),
            $prev = $item.prevElement(),
            prev = $prev.get(),
            isIndent = (selection.isCollapsed() && item && prev && prev.tagName === 'LI');

        if (isIndent) {
            this.app.editor.save(item);

            $prev = this.dom(prev);
            let $prevChild = $prev.children('ul, ol');
            let $list = $item.closest('ul, ol');

            if ($prevChild.length !== 0) {
                $prevChild.append($item);
            }
            else {
                let listTag = $list.get().tagName.toLowerCase();
                let $newList = this.dom('<' + listTag + '>');

                $newList.append($item);
                $prev.append($newList);
            }

            this.app.editor.restore();
            this.app.control.updatePosition();
        }

        return isIndent;
    },
    outdent() {
        let selection = this.app.create('selection'),
            item = selection.getBlock(),
            $item = this.dom(item),
            isOutdent = false;

        if (selection.isCollapsed() && item) {
            let $listItem = $item.parent(),
                $liItem = $listItem.closest('li'),
                $prev = $item.prevElement(),
                $next = $item.nextElement(),
                prev = $prev.get(),
                next = $next.get(),
                nextItems,
                $newList,
                isTop = (prev === false),
                isMiddle = (prev !== false && next !== false);

            // replace to text
            if (isTop) {
                let instance = this.app.block.get();

                if (!instance.hasParentList()) {
                    this.app.dropdown.close();
                    this.app.context.close();
                    this.app.editor.save(false);

                    let list = instance.getParent();
                    let $list = list.getBlock();
                    let text = this.app.block.create(instance.getContent());

                    $list.before(text.getBlock());
                    instance.getBlock().remove();

                    if ($list.children().length === 0) {
                        $list.remove();
                    }

                    this.app.editor.build();
                    this.app.block.set(text);
                    this.app.editor.restore();

                    return isOutdent;
                }
            }

            this.app.editor.save(item);

            // out
            if ($liItem.length !== 0) {
                if (isMiddle) {
                    nextItems = this._getAllNext($item.get());
                    $newList = this.dom('<' + $listItem.get().tagName.toLowerCase() + '>');

                    for (var i = 0; i < nextItems.length; i++) {
                        $newList.append(nextItems[i]);
                    }

                    $liItem.after($item);
                    $item.append($newList);
                }
                else {
                    $liItem.after($item);

                    if ($listItem.children().length === 0) {
                        $listItem.remove();
                    }
                    else {
                        if (isTop) $item.append($listItem);
                    }
                }

                isOutdent = true;
            }

            this.app.editor.restore();
            this.app.control.updatePosition();
        }

        return isOutdent;
    },

    // private
    _isList() {
        let instance = this.app.block.get();

        return (instance && instance.isType('listitem'));
    },
    _getAllNext(next) {
        let nodes = [],
            $next;

        while (next) {
            $next = this.dom(next).nextElement();
            next = $next.get();

            if (next) nodes.push(next);
            else return nodes;
        }

        return nodes;
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'observer', {
    init() {
        this.styles = false;
        this.observer = false;
        this.trigger = true;
    },
    build() {
        if (!this.opts.is('sync') || !window.MutationObserver) return;

        const editorElement = this.app.editor.getEditor().get();
        const observerOptions = {
            attributes: true,
            subtree: true,
            childList: true,
            characterData: true,
            characterDataOldValue: true
        };

        this.observer = this._build(editorElement);
        this.observer.observe(editorElement, observerOptions);
    },
    stop() {
        if (this.observer) this.observer.disconnect();
        this.trigger = true;
    },
    addKeys(type, name, value) {
        this.opts.set('active.' + type + '.' + name, value);
    },
    getKeys() {
        this.styles = {};
        return this._getKeys();
    },
    getStyles() {
        return this.styles;
    },
    observeUnset() {
        this._observeUnset();
    },
    observe() {
        if (!this.opts.is('toolbar') && !this.opts.is('extrabar') && !this.app.context.isOpen()) {
            return;
        }

        this.styles = {};
        let buttons = this._getKeys();

        // unset
        this._observeUnset();

        // set
        if (buttons.length !== 0) {
            this.app.toolbar.setActiveKeys(buttons, this.styles);
            this.app.extrabar.setActiveKeys(buttons, this.styles);
            this.app.context.setActiveKeys(buttons, this.styles);
        }
    },

    // private
    _build(el) {
        return new MutationObserver(function(mutations) {
            this._observe(mutations[mutations.length-1], el);
        }.bind(this));
    },
    _getKeys() {
        let instance = this.app.block.get(),
            atags = this.opts.get('active.tags'),
            ablocks = this.opts.get('active.blocks'),
            type = (instance) ? instance.getType() : false,
            tag = (instance) ? instance.getTag() : false,
            selection = this.app.create('selection'),
            inlines = (selection.is()) ? selection.getNodes({ type: 'inline', selected: 'inside', link: true, buttons: true }) : [],
            tags = this._getObservedTags(tag, inlines),
            types = [],
            buttons = [],
            keys;

        // check table
        if (instance) {
            let parentTypes = ['table', 'layout', 'wrapper'];
            for (let z = 0; z < parentTypes.length; z++) {
                if (instance.getClosest(parentTypes[z])) types.push(parentTypes[z]);
            }
            if (instance.isType('todoitem')) {
                types.push('todo');
            }
            if (instance.isType('listitem')) {
                let parentList = instance.getParentTopInstance();
                if (parentList) {
                    let listTag = parentList.getTag();
                    tags.push(listTag);
                }
            }
        }

        // tags
        for (let i = 0; i < tags.length; i++) {
            keys = atags[tags[i]];
            if (keys) {
                if (tags[i] === 'ul' && (type && type === 'todo' || types.indexOf('todo') !== -1)) {
                    continue;
                }
                buttons = buttons.concat(keys);
            }
        }

        // types
        if (type) {
            keys = ablocks[type];
            if (keys) {
                buttons = buttons.concat(keys);
            }

            for (let y = 0; y < types.length; y++) {
                buttons.push(types[y]);
            }
        }

        return buttons;
    },
    _getObservedTags(tag, inlines) {
        let tags = [],
            inline,
            $inline,
            css,
            utils = this.app.create('utils');

        if (tag) {
            tags.push(tag);
        }

        if (inlines.length > 0) {
            for (var i = 0; i < inlines.length; i++) {
                inline = inlines[i];
                css = utils.cssToObject(inline.getAttribute('style'));

                if (css && css.color) this.styles.color = css.color;
                if (css && css.background) this.styles.background = css.background;

                tags.push(inline.tagName.toLowerCase());
            }
        }

        return tags;
    },
    _observeUnset() {
        this.app.toolbar.unsetActive();
        this.app.extrabar.unsetActive();
        this.app.context.unsetActive();
    },
    _observe(mutation, el) {
        if (mutation.type === 'attributes' && mutation.target === el) {
            return;
        }

        // sync
        if (this.trigger) {
            this.app.broadcast('observer.change');
            this.app.placeholder.trigger();
            this.app.block.trigger(mutation);
            this.app.blocks.trigger(mutation);
            this.app.sync.trigger();
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'path', {
    init() {
        this.classname = 'rx-pathbar';
        this.activeClass = 'active';
        this.pathItemClass = 'rx-pathbar-item';
    },
    start() {
        if (!this.opts.is('pathbar')) return;

        this.$pathbar = this.dom('<div>').attr('dir', this.opts.get('dir'));
        this.$pathbar.addClass(this.classname + ' ' + this.classname + '-' + this.uuid);

        this.app.container.get('pathbar').append(this.$pathbar);

        // build
        this._buildRoot();
        this._buildActive();
    },
    build() {
        if (!this.opts.is('pathbar')) return;

        this._clear();
        this._buildRoot();

        if (!this.app.blocks.is()) {
            this._buildItems();
            this._buildActive();
        }
    },
    enable() {
        if (!this.opts.is('pathbar')) return;
        this.$pathbar.removeClass('disable');
    },
    disable() {
        if (!this.opts.is('pathbar')) return;
        this.$pathbar.addClass('disable');
    },

    // =private
    _clear() {
        this.$pathbar.find('.' + this.pathItemClass).off('.rx-path-' + this.uuid);
        this.$pathbar.html('');
    },
    _createItem() {
        return this.dom('<span>').addClass(this.pathItemClass);
    },
    _buildRoot() {
        let title = this.opts.get('pathbar.title');
        title = title || this.lang.get('pathbar.title');

        this._buildItem(false, title);
    },
    _buildItems() {
        var current = this.app.block.get();
        if (!current) return;

        // parents
        let $parents = current.getBlock().parents('[data-rx-type]');
        $parents.nodes.reverse();
        $parents.each(this._buildParentItem.bind(this));

        // current
        this._buildItem(current);
    },
    _buildParentItem($el) {
        let instance = $el.dataget('instance'),
            ignoreTypes = ['row', 'cell', 'column'];

        if (!instance.isType(ignoreTypes)) {
            this._buildItem(instance);
        }
    },
    _buildItem(instance, root) {
        let $item = this._createItem();
        $item.dataset('instance', instance);
        $item.on('click.rx-path-' + this.uuid, this._selectItem.bind(this));

        this._buildTitle($item, root || instance.getTitle());
        this.$pathbar.append($item);
    },
    _buildTitle($item, title) {
        let $title = this.dom('<span>').html(title);
        $item.append($title);
    },
    _buildActive() {
        this.$pathbar.find('.' + this.pathItemClass).removeClass(this.activeClass).last().addClass(this.activeClass);
    },
    _selectItem(e) {
        e.stopPropagation();
        e.preventDefault();

        if (this.$pathbar.hasClass('disable')) return;

        let $item = this.dom(e.target).closest('.' + this.pathItemClass),
            instance = $item.dataget('instance');

        this.app.dropdown.close();
        this.app.context.close();
        this.app.modal.close();

        if (instance) {
            this.app.block.set(instance);
        }
        else {
            this._clear();
            this._buildRoot();
            this._buildActive();

            this.app.block.unset();
            this.app.blocks.unset();
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'placeholder', {
    init() {
        this.placeholderClass = 'rx-placeholder';
    },
    start() {
        let oh = this.opts.get('placeholder');
        let ph = this.app.element.getPlaceholder();

        if (oh || ph) {
            this.app.editor.getEditor().attr('placeholder', ph || oh);
        }
    },
    handleClick(e) {
        if (this.dom(e.target).hasClass(this.placeholderClass)) {
            e.preventDefault();
            e.stopPropagation();
            this.app.editor.setFocus('start');
        }
    },
    trigger() {
        this.$editor = this.app.editor.getEditor();
        if (this.app.editor.isEmpty()) {
            this.show();
        }
        else {
            this.hide();
        }
    },
    set(content) {
        this.$editor.attr('placeholder', content);
    },
    toggle() {
        if (this.observerTimer) {
            clearTimeout(this.observerTimer);
        }
        this.observerTimer = setTimeout(this.trigger.bind(this), 10);
    },
    show() {
        this.$editor.addClass(this.placeholderClass);
    },
    hide() {
        this.$editor.removeClass(this.placeholderClass);
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'state', {
    init() {
        this.storage = false;
        this.undoStorage = [];
        this.redoStorage = [];
    },
    load() {
        this.clear();
        this._load();
    },
    stop() {
        this.clear();
    },
    get() {
        return this.undoStorage;
    },
    clear() {
        this.storage = false;
        this.undoStorage = [];
        this.redoStorage = [];
    },
    trigger() {
        let state = this._createState();
        this._addState(state);
    },
    add(e) {
        if ((e && (e.ctrlKey || e.metaKey || this._isUndo(e) || this._isRedo(e))) || !this.app.observer.trigger) {
            return;
        }

        // state
        let state = this._createState();
        this._setState(state);
    },
    listen(e) {
        // undo
        if (this._isUndo(e)) {
            e.preventDefault();
            this.undo();
            return true;
        }
        // redo
        else if (this._isRedo(e)) {
            e.preventDefault();
            this.redo();
            return true;
        }
    },
    undo() {
        if (!this._hasUndo()) return;

        let state,
            parser = this.app.create('parser'),
            $parsed;

        state = this._getUndo();
        if (state) {
            this._setRedo();

            $parsed = parser.parse(state.html, { type: 'html', nodes: true });
            this._rebuild($parsed, state, 'undo');
        }
    },
    redo() {
        if (!this._hasRedo()) return;

        let state,
            parser = this.app.create('parser'),
            $parsed;

        state = this.redoStorage.pop();
        if (state) {
            this._addState(state);
            $parsed = parser.parse(state.html, { type: 'html', nodes: true });
            this._rebuild($parsed, state, 'redo');
            this.undoStorage.splice(this.undoStorage.length-1, 1);
        }
    },


    // private
    _load() {
        let state = this._createState();

        this.undoStorage.push(state);
        this.storage = state;
    },
    _rebuild($parsed, state, type) {
        let offset = this.app.create('offset'),
            $editor = this.app.editor.getEditor();

        $editor.html($parsed);
        this.app.editor.build();

        let $el = $editor.find('.rx-block-state');
        if ($el.length !== 0) {
            setTimeout(function() {
                this.app.block.set($el);
                offset.set(state.offset, $el);
                $el.removeClass('rx-block-state');
            }.bind(this), 1);
        }
        else {
            offset.set(state.offset);
            this.app.event._setMultipleBlocks();
        }

        this.app.broadcast('state.' + type, state);
    },
    _isUndo(e) {
        let key = e.which,
            ctrl = e.ctrlKey || e.metaKey;

        return (ctrl && key === 90 && !e.shiftKey && !e.altKey);
    },
    _isRedo(e) {
        let key = e.which,
            ctrl = e.ctrlKey || e.metaKey;

        return (ctrl && ((key === 90 && e.shiftKey) || (key === 89 && !e.shiftKey)) && !e.altKey);
    },
    _hasUndo() {
        return (this.undoStorage.length !== 0);
    },
    _hasRedo() {
        return (this.redoStorage.length !== 0);
    },
    _getUndo() {
        let pos = this.undoStorage.length-2;
        if (pos !== -1) {
            this.undoStorage.splice(pos+1, 1);
        }

        return this.undoStorage[pos];
    },
    _createState() {
        let html = (this.app.has('email')) ? this.app.email.getContent() : this.app.editor.getEditor().html();
        let utils = this.app.create('utils'),
            unparser = this.app.create('unparser'),
            offset = this.app.create('offset'),
            instance = this.app.block.get(),
            el = (instance && instance.isEditable()) ? instance.getBlock() : false,
            unparsed;

        let offsetObj = offset.get(el);
        if (this.app.blocks.is()) {
            offsetObj = offset.get();
        }
        else {
            html = utils.wrap(html, function($w) {
                $w.find('.rx-block-focus').addClass('rx-block-state');
            }.bind(this));
        }

        unparsed = unparser.unparse(html, { state: true });
        return { html: unparsed, offset: offsetObj };
    },
    _setState(state) {
        let pos = this.undoStorage.length-1;
        if (pos >= 0) {
            this.undoStorage[pos] = state;
        }
    },
    _addState(state) {
        let last = this.undoStorage[this.undoStorage.length-1];
        if (typeof last === 'undefined' || last.html !== state.html) {
            this.undoStorage.push({ html: state.html, offset: state.offset, synced: true });
            this._removeOverStorage();
        }
    },
    _setRedo() {
        let state = this._createState(),
            limit = this.opts.get('state.limit');

        this.redoStorage.push(state);
        this.redoStorage = this.redoStorage.slice(0, limit);
    },
    _removeOverStorage() {
        let limit = this.opts.get('state.limit');

        if (this.undoStorage.length > limit) {
            this.undoStorage = this.undoStorage.slice(0, (this.undoStorage.length - limit));
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'statusbar', {
    init() {
        this.classname = 'rx-statusbar';
    },
    start() {
        this.$statusbar = this.dom('<div>').attr('dir', this.opts.get('dir'));
        this.$statusbar.addClass(this.classname + ' ' + this.classname + '-' + this.uuid);

        this.app.container.get('statusbar').append(this.$statusbar);
    },
    enable() {
        this.$statusbar.removeClass('disable');
    },
    disable() {
        this.$statusbar.addClass('disable');
    },
    add(name, html) {
        return this.update(name, html);
    },
    update(name, html) {
        let $item = this.get(name);
        if ($item.length === 0) {
            $item = this._buildItem(name);
        }

        return $item.html(html);
    },
    getElement() {
        return this.$statusbar;
    },
    get(name) {
        let s = (name) ? '[data-name=' + name + ']' : '[data-name]';
        return this.$statusbar.find(s);
    },
    remove(name) {
        this.get(name).remove();
    },
    clear() {
        this.$statusbar.html('');
    },

    // private
    _buildItem(name) {
        let $item = this.dom('<span>').addClass(this.classname + '-item');
        $item.attr('data-name', name);

        // append
        this.$statusbar.append($item);

        return $item;
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'sync', {
    build() {
        this.syncedHtml = this.app.element.getHtml();
    },
    destroy() {
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }
    },
    trigger() {
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }
        this.typingTimer = setTimeout(this.update.bind(this), 300);
    },
    update() {
        let html = this._getHtml();
        if (this.is(html)) {
            this._sync(html);
        }
    },
    invoke() {
        let html = this._getHtml();
        this.syncedHtml = html;
        this._sync(html);
    },
    is(html) {
        let sync = false;
        if (this.syncedHtml !== html) {
            this.syncedHtml = html;
            sync = true;
        }

        return sync;
    },

    // private
    _getHtml() {
        const unparser = this.app.create('unparser');
        let html = this.app.editor.getHtml();

        return unparser.unparse(html);
    },
    _sync(html) {
        let event = this.app.broadcast('editor.before.change', { html: html });
        if (!event.isStopped()) {
            let content = event.get('html');

            this.app.editor.setOutput(content);
            this.app.editor.setSource(content);
            this.app.autosave.send();
            this.app.state.trigger();
            this.app.broadcast('editor.change', event);
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'table', {
    dropdowns: {
        items: {
            addhead: { title: '## table.add-head ##', command: 'table.addHead' },
            addcolumnbefore: { title: '## table.add-column-before ##', command: 'table.addColumnBefore' },
            addcolumnafter: { title: '## table.add-column-after ##', command: 'table.addColumnAfter' },
            addrowbelow: { title: '## table.add-row-below ##', command: 'table.addRowBelow' },
            addrowabove: { title: '## table.add-row-above ##', command: 'table.addRowAbove' },
            removehead: { title: '## table.remove-head ##', command: 'table.removeHead', divider: 'top' },
            removecolumn: { title: '## table.remove-column ##', command: 'table.removeColumn' },
            removerow: { title: '## table.remove-row ##', command: 'table.removeRow' },
            removetable: { title: '## table.delete-table ##', command: 'table.removeTable', divider: 'top', danger: true }
        }
    },
    modals: {
        cell: {
            title: '## table.table-cell ##',
            width: '300px',
            form: {
                width: { type: 'input', label: '## table.width ##' },
                nowrap: { type: 'checkbox', text: '## table.nowrap ##' }
            },
            footer: {
                insert: { title: '## buttons.save ##', command: 'table.save', type: 'primary' },
                cancel: { title: '## buttons.cancel ##', command: 'modal.close' }
            }
        }
    },
    observe(obj, name, toolbar) {
        if (!this.opts.is('table')) {
            return false;
        }

        if (toolbar !== 'dropdown') {
            let instance = this.app.block.get();
            if (instance && instance.getClosest('table')) {
                obj.command = 'table.popup';
            }
        }

        return obj;
    },
    popup(e, button) {
        let dropdown = this.app.create('dropdown', 'table', { items: this.dropdowns.items });
        this.app.dropdown.open(e, button, dropdown);
    },
    addHead() {
        let instance = this.app.block.get();
        let cell = (instance.isType('cell')) ? instance : instance.getClosest('cell');
        let table = cell.getTable();
        let $block = table.getBlock();

        // remove
        this.removeHead();

        let columns =  $block.find('tr').first().children('td, th').length;
        let $head = this.dom('<thead>');
        let $newRow = this._buildRow(false, columns, '<th>');

        $head.append($newRow);
        $block.prepend($head);

        // set
        this.app.block.set($newRow.children('td, th').first(), 'start');
    },
    addRowBelow() {
        this._addRow('below');
    },
    addRowAbove() {
        this._addRow('above');
    },
    addColumnBefore() {
        this._addColumn('before');
    },
    addColumnAfter() {
        this._addColumn('after');
    },
    removeHead() {
        this.app.modal.close();
        this.app.dropdown.close();

        let instance = this.app.block.get();
        let cell = (instance.isType('cell')) ? instance : instance.getClosest('cell');
        let table = cell.getTable();
        let $block = table.getBlock();
        let $head = $block.find('thead');
        if ($head.length !== 0) {
            $head.remove();
            this.app.block.set($block, 'start');
        }
    },
    removeRow() {
        this.app.modal.close();
        this.app.dropdown.close();
        this.app.control.close();

        let instance = this.app.block.get();
        let cell = (instance.isType('cell')) ? instance : instance.getClosest('cell');
        let table = cell.getTable();
        let row = cell.getRow();
        let $block = row.getBlock();
        let $head = $block.closest('thead');
        if ($head.length !== 0) {
            $head.remove();
        }
        else {
            row.remove();
        }

        let $rows = table.getRows();
        if ($rows.length !== 0) {
            this.app.block.set(table.getFirstBlock(), 'start');
        }
        else {
            table.remove({ traverse: true });
        }
    },
    removeColumn() {
        this.app.modal.close();
        this.app.dropdown.close();
        this.app.control.close();

        let instance = this.app.block.get();
        let cell = (instance.isType('cell')) ? instance : instance.getClosest('cell');
        let table = cell.getTable();
        let $block = cell.getBlock();
        let $table = $block.closest('table');
        let $row = $block.closest('tr');
        let index = 0;
        $row.find('td, th').each(function($node, i) {
            if ($node.get() === $block.get()) {
                index = i;
            }
        });

        $table.find('tr').each(function($node) {
            let cellNode = $node.find('td, th').get(index);
            let $cellNode = this.dom(cellNode);
            $cellNode.remove();
        }.bind(this));

        let $rows = table.getCells();
        if ($rows.length !== 0) {
            let findIndex = index-1;
            findIndex = (findIndex < 0) ? 0 : findIndex;
            let $target;
            if (findIndex !== 0) {
                $target = this.dom($table.find('tr').first().find('td, th').get(findIndex));
                let rowTarget = $target.dataget('instance');
                $target = rowTarget.getFirstElement();
            }
            else {
                $target = table.getFirstBlock();
            }

            this.app.block.set($target, 'start');
        }
        else {
            table.remove({ traverse: true });
        }
    },
    removeTable() {
        this.app.modal.close();
        this.app.dropdown.close();

        let instance = this.app.block.get();
        let table = instance.getClosest('table');
        table.remove({ traverse: true });
    },
    cellSetting(e, button) {

        let instance = this.app.block.get();
        let stack = this.app.create('stack');
        stack.create('cell-setting', this.modals.cell);

        // data
        stack.setData({
            width: instance.getWidth(),
            nowrap: instance.getNowrap()
        });

        // open
        this.app.modal.open({ name: 'cell-setting', stack: stack, focus: 'width', button: button });
    },
    save(stack) {
        this.app.modal.close();

        // data
        let data = stack.getData();
        let instance = this.app.block.get();

        if (data.width !== '') {
            instance.setWidth(data.width);
        }

        instance.setNowrap(data.nowrap);
        this.app.control.updatePosition();
    },

    // =private
    _addColumn(name) {
        this.app.modal.close();
        this.app.dropdown.close();

        let instance = this.app.block.get();
        let $block = (instance.isType('cell')) ? instance.getBlock() : instance.getClosest('cell').getBlock();
        let $table = $block.closest('table');
        let $row = $block.closest('tr');
        let index = $block.get().cellIndex;
        let rowIndex = $row.get().rowIndex;
        let $newCell;

        $table.find('tr').each(function($node, i) {
            let cell = $node.find('td, th').get(index);
            let $cell = this.dom(cell);
            let $td = $cell.clone();
            $td.removeClass('rx-block-focus').html('');

            // create instance
            this.app.create('block.cell', $td);
            let text = this.app.block.create();
            $td.append(text.getBlock());

            if (rowIndex === i) {
                $newCell = $td;
            }

            // after / before
             $cell[name]($td);

        }.bind(this));

        // set focus
        if ($newCell) {
            let newCell = $newCell.dataget('instance');
            this.app.block.set(newCell.getFirstElement(), 'start');
        }
    },
    _addRow(name) {
        this.app.modal.close();
        this.app.dropdown.close();

        let position = (name === 'below') ? 'after' : 'before',
            instance = this.app.block.get(),
            $block = instance.getClosest('row').getBlock(),
            $row = $block.closest('tr'),
            $head = $block.closest('thead'),
            columns = $row.children('td, th').length,
            $newRow = this._buildRow($row, columns, '<td>');

        if ($head.length !== 0) {
            $head.after($newRow);
        }
        else {
            $row[position]($newRow);
        }

        // set focus
        let newRow = $newRow.dataget('instance');
        this.app.block.set(newRow.getFirstElement(), 'start');
    },
    _buildRow($row, columns, tag) {
        let cell,
            text;

        if ($row === false) {
            $row = this.dom('<tr>');
            for (let i = 0; i < columns; i++) {
                let $cell = this.dom(tag);

                // create instance
                this.app.create('block.cell', $cell);

                // append
                $row.append($cell);
            }
        }
        else {
            $row = $row.clone();
            $row.find('td, th').removeClass('rx-block-focus').html('');
        }

        // create instances
        this.app.create('block.row', $row);
        $row.find('td, th').each(function($node) {
            cell = this.app.create('block.cell', $node);
            text = this.app.block.create();
            cell.getBlock().append(text.getBlock());
        }.bind(this));


        return $row;
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'toolbar', {
    mixins: ['toolbar'],
    init() {
        this.type = 'toolbar';
        this.eventname = 'rx-toolbar';
        this.customButtons = {};
        this.removeButtons = [];
    },
    start() {
        if (!this.opts.is('toolbar')) return;

        // container
        this.$container = this.app.container.get('toolbar');
        this.$toolbox = this.app.container.get('toolbox');

        // build
        this._build(this.$container);
        this._buildRaised();

        // sticky
        this.enableSticky();
    },
    load() {
        if (!this.opts.is('toolbar')) return;

        this._buildButtons();
    },
    add(name, obj) {
        this._add(name, obj);
    },
    build() {
        if (!this.opts.is('toolbar')) return;

        let instance = this.app.block.get(),
            type = (instance) ? instance.getType() : false;

        if (this.currentType !== type) {
            this._buildButtons();
            this._buildBlockButtons();
        }
        else {
            this.app.button.observe(this.$toolbarButtons);
        }
    },
    enableSticky() {
        if (!this.opts.is('toolbar.sticky') || this.opts.is('toolbar.target')) return;

        this.$toolbox.addClass('rx-sticky');
        this.$toolbox.css('top', this.opts.get('toolbar.stickyTopOffset') + 'px');

        // event
        this._startStickyEvent();
        if (this.opts.is('iframe')) {
            this._observeSticky();
        }
    },
    disableSticky() {
        if (!this.opts.is('toolbar.sticky')) return;

        this.$toolbox.removeClass('rx-sticky');
        this.$toolbox.css('top', '');

        // event
        this._stopStickyEvent();
    },
    isRaised() {
        return this.opts.is('toolbar.raised');
    },
    isExternal() {
        return this.opts.is('toolbar.target');
    },
    isSticky() {
        let $main = this.app.container.get('main');
        let tolerance = (this.isRaised()) ? parseInt(this.$toolbox.css('margin-top')) : 0;
        let mainTop = $main.offset().top + parseInt($main.css('border-top-width')) + tolerance;
        let containerTop = this.$toolbox.offset().top;

        return (containerTop > mainTop || containerTop < mainTop);
    },
    rebuildSticky() {
        this._observeSticky();
    },

    // private
    _buildRaised() {
        if (this.opts.is('toolbar.raised')) {
            this.$toolbox.addClass('rx-raised');
        }
    },
    _getStickyTarget() {
        return (this.opts.is('iframe')) ? this.dom(window.parent.document) : this.app.scroll.getTarget();
    },
    _startStickyEvent() {
        this._getStickyTarget().on('scroll.' + this.eventname, this._observeSticky.bind(this));
    },
    _stopStickyEvent() {
        this._getStickyTarget().off('.' + this.eventname);
    },
    _observeSticky() {
        if (this.app.source.is()) {
            this.$toolbox.css('top', 0);
            return;
        }

        if (this.opts.is('iframe')) {
            this._stickyScroll();
            return;
        }

        let $scrollTarget = this.app.scroll.getTarget();
        let paddingTop = (this.app.scroll.isTarget()) ? parseInt($scrollTarget.css('padding-top')) : 0;
        let offset = parseInt(this.opts.get('toolbar.stickyTopOffset'));
        let topOffset = (0 - paddingTop + offset);

        if (this.app.isProp('fullscreen')) {
            topOffset = 0;
        }

        this.$toolbox.css({
            'top': topOffset + 'px'
        });

        // broadcast
        if (this.isSticky()) {
            this.$toolbox.addClass('rx-sticky-on');
            this.app.broadcast('toolbar.sticky');
        }
        else {
            this.$toolbox.removeClass('rx-sticky-on');
            this.app.broadcast('toolbar.static');
        }
    },
    _stickyScroll() {
        let topOffset = parseInt(this.opts.get('toolbar.stickyTopOffset'));
        let iframe = window.parent.document.getElementById(this.opts.get('iframe'));
        let iframeOffset = this.dom(iframe).offset().top;
        let stickyOffset = iframeOffset;
        let scrollTop = this.dom(window.parent.document).scrollTop();

        if (scrollTop > stickyOffset) {
             this.$toolbox.css({
                'position': 'fixed',
                'z-index': 1060,
                'width': this.app.editor.getEditor().width() + 'px',
                'top': (topOffset + scrollTop - iframeOffset) + 'px'
            });
            this.$toolbox.addClass('rx-sticky-on');
            this.app.broadcast('toolbar.sticky');
        }
        else {
            this.$toolbox.css({
                'position': '',
                'z-index': '',
                'width': '',
                'top': ''
            });
            this.$toolbox.removeClass('rx-sticky-on');
            this.app.broadcast('toolbar.static');
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'tooltip', {
    stop() {
        this.close();
    },
    close() {
        this._find().remove();
    },
    updateTheme(theme) {
        this._find().attr('rx-data-theme', theme);
    },

    // =private
    _find() {
        return this.app.$body.find('.rx-tooltip');
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'scroll', {
    init() {
        this.scrolltop = false;
    },
    save() {
        this.scrolltop = this.getTarget().scrollTop();
    },
    restore() {
        if (this.scrolltop !== false) {
            this.getTarget().scrollTop(this.scrolltop);
            this.scrolltop = false;
        }
    },
    getScrollTop() {
        return this.getTarget().scrollTop();
    },
    isTarget() {
        return (this.opts.get('scrollTarget') !== window);
    },
    resetTarget() {
        if (this.reserved) {
            this.opts.set('scrollTarget', this.reserved);
            this.reserved = false;
        }
    },
    setTarget(el) {
        this.reserved = this.opts.get('scrollTarget');
        this.opts.set('scrollTarget', el);
    },
    getTarget() {
        return this.dom(this.opts.get('scrollTarget'));
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'reorder', {
    build(button, $control, instance) {
        if (!button) return;

        this.$control = $control;
        this.instance = instance;
        this.$button = button.getElement();

        this.$button.on('click.rx-reorder-button', this._pressStop.bind(this));
        this.$button.on('mousedown.rx-reorder-button touchstart.rx-reorder-button', this._press.bind(this));
    },

    // private
    _pressStop() {
        clearTimeout(this.dragTimeout);
        this.$button.removeClass('rx-in-dragging');
    },
    _press() {
        this.dragTimeout = setTimeout(function() {
            this.$button.addClass('rx-in-dragging');
            this.app.getWin().on('mouseup.rx-reorder-button touchend.rx-reorder-button', this._release.bind(this));
            this.app.getWin().on('mousemove.rx-reorder-button touchmove.rx-reorder-button', this._move.bind(this));
        }.bind(this), 200);
    },
    _release(e) {
        this.$button.removeClass('rx-handle x-in-dragging');
        this.app.getWin().off('.rx-reorder-button');

        this.app.observer.trigger = true;
        this.app.event.trigger = false;

        this.oldY = 0;
        this.dragging = false;
        this._trashDragItem();
        this.app.control.updatePosition();
        this.$control.show();

        setTimeout(function() {
            // set block
            this.app.block.set(this.instance, 'start', true);

            // start events
            this.app.event.trigger = true;

        }.bind(this), 1);
    },
    _move(e) {
        e.preventDefault();
        if (!this.$button.hasClass('rx-in-dragging')) {
            return;
        }

        let item,
            containers = ['list', 'todo', 'cell', 'column', 'wrapper'],
            $container,
            $targetContainer,
            direction = false,
            deltaY = 0,
            point = e.pageY,
            tolerance = 40,
            editorPos = this.app.editor.getRect(),
            scrollTop = this.app.getDoc().scrollTop(),
            topStop = (scrollTop > editorPos.top) ? scrollTop + tolerance : editorPos.top + tolerance,
            bottomStop = this.app.getWin().height() + scrollTop - tolerance,
            topEdge = editorPos.top,
            bottomEdge = editorPos.top + this.app.editor.getEditor().height();


        if (!this.$button.hasClass('rx-handle')) {
            item = this.instance.getBlock().get();

            this.$button.addClass('rx-handle');
            this.dragging = true;
            this.$dragItem = this._makeDragItem(item, e.target);
            this.$control.hide();
        }

        // close
        this.app.dropdown.close();

        // direction & delta
        deltaY = (this.oldY === 0) ? deltaY : this.oldY - e.pageY;
        if (deltaY > 0) {
            direction = 'up';
        } else if (deltaY < 0) {
            direction = 'down';
        }

        // move
        this._moveItem(this.$dragItem, deltaY);
        this.oldY = e.pageY;

        // autoscroll
        if (this.app.scroll.isTarget()) {
            let $target = this.app.scroll.getTarget(),
                targetOffset = $target.offset();

            topEdge = targetOffset.top;
            topStop = (scrollTop > editorPos.top) ? targetOffset.top + tolerance : topStop;
            bottomEdge = targetOffset.top + $target.height();
            bottomStop = bottomEdge - tolerance;
        }

        // scroll up
        if (direction === 'up' && point < topStop && point > topEdge) {
            this._scroll(-10);
        }
        // scroll down
        else if (direction === 'down' && point > bottomStop && point < bottomEdge) {
            this._scroll(10);
        }

        // containers
        $container = this.app.editor.getEditor();
        $targetContainer = this.instance.getClosest(containers);
        if ($targetContainer) {
            $container = $targetContainer.getBlock();
        }

        // place
        let $elms = $container.children(),
            max = $elms.length,
            subItem,
            $subItem,
            b;

        for (b = 0; b < max; b++) {
            subItem = $elms.eq(b).get();
            $subItem = this.dom(subItem);

            if (subItem === this.$clickItem.get()) {
                continue;
            }

            if (this._isOver($subItem)) {
                this._swapItems(subItem);
            }
        }
    },
    _isOver($target) {
        var y = this.$dragItem.offset().top;
        var offset = $target.offset();
        var height = $target.height();

        return (y > offset.top && y < (offset.top + height));
    },
    _scroll(step) {
        let $target = (this.app.scroll.isTarget()) ? this.app.scroll.getTarget() : this.app.getWin(),
            scrollY = $target.scrollTop();

        $target.scrollTop(scrollY + step);
    },
    _swapItems(target) {
        let y = this.$dragItem.offset().top,
            $item = this.$clickItem,
            $target = this.dom(target),
            offset = $target.offset(),
            height = $target.height()/2,
            func = (height + offset.top > y) ? 'before' : 'after';

        $target[func]($item);
    },
    _moveItem($item, deltaY) {
        let top = $item.offset().top;
        top -= deltaY;

        $item.css('top', top + 'px');
        this.$control.css('top', top + 'px');
    },
    _makeDragItem(item) {
        this._trashDragItem();

        let $item = this.dom(item);
        let offset = $item.offset();
        let theme = this.app.theme.get();
        let $cloned;
        let $dragItem;

        this.$clickItem = $item;
        this.$clickItem.addClass('rx-drag-active');

        $cloned = $item.clone();
        $cloned.removeClass('rx-drag-active rx-element-active');
        $cloned.css({
            'font-family': $item.css('font-family'),
            'font-size': $item.css('font-size'),
            'line-height': $item.css('line-height'),
            'margin': 0,
            'padding': 0
        });

        $dragItem = this.dom('<div>').addClass('rx-dragging');
        $dragItem.append($cloned);
        $dragItem.attr('rx-data-theme', theme);
        $dragItem.css({
            'opacity': 0.95,
            'position': 'absolute',
            'z-index': 999,
            'left': offset.left + 'px',
            'top': offset.top + 'px',
            'width': $item.width() + 'px'
        });

        this.app.$body.append($dragItem);

        return $dragItem;
    },
    _trashDragItem() {
        if (this.$dragItem && this.$clickItem) {
            this.$clickItem.removeClass('rx-drag-active');
            this.$clickItem = null;

            this.$dragItem.remove();
            this.$dragItem = null;
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'dropdown', {
    init() {
        this.dropdown = false;
    },
    isOpen() {
        if (!this.dropdown) return;

        return this.dropdown.isOpen();
    },
    isPositionTop() {
        if (!this.dropdown) return false;

        let $dropdown = this.dropdown.getElement();
        return (this.isOpen() && $dropdown.attr('data-rx-pos') === 'top');
    },
    open(e, button, dropdown) {
        this.app.editor.save();
        this.dropdown = dropdown;

        // broadcast
        this.app.broadcast('dropdown.before.open', { dropdown: this.dropdown });

        // open
        this.dropdown.open(e, button);

        this.app.modal.close();
        this.app.observer.observe();

        // broadcast
        this.app.broadcast('dropdown.open', { dropdown: this.dropdown });
    },
    close() {
        if (!this.dropdown) return;

        this.dropdown.close();
        this.dropdown = false;

        // broadcast
        this.app.broadcast('dropdown.close');
    },
    getName() {
        if (!this.dropdown) return;

        return this.dropdown.getName();
    },
    updateTheme(theme) {
        if (!this.dropdown) return;

        this.dropdown.getElement().attr('rx-data-theme', theme);
    },
    updatePosition() {
        if (!this.dropdown) return;

        this.dropdown.updatePosition();
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'modal', {
    init() {
        this.saved = false;
    },
    start() {
        this._build();
        this._buildStacks();
        this._buildHeader();
    },
    stop() {
        this._stopEvents();
        this._stop();
    },
    isOpen() {
        return (this.$modal && this.$modal.hasClass('open'));
    },
    open(params) {
        let defs = {
            name: false,
            stack: false,
            button: false,
            focus: false
        };

        this.params = Redactor.extend({}, defs, params);
        this.button = this.params.button;
        this.stack = this.params.stack;
        this.name = this.params.name;

        if (this.button && this.button.isButton) {
            this.app.toolbar.unsetToggled(false, this.button.getName());
            this.app.extrabar.unsetToggled(false, this.button.getName());
            this.app.context.unsetToggled(false, this.button.getName());

            let $btn = this.button.getElement();
            if ($btn.hasClass('rx-in-modal')) {
                this.close();
                return;
            }
            else {
                $btn.addClass('rx-in-modal toggled');
            }
        }

        // open
        this.app.editor.save();
        this.app.dropdown.close();
        this._open();
    },
    close(e) {
        if (!this.isOpen()) return;

        if (!e) {
            this.app.editor.restore();
        }

        this._stopEvents();
        this.$modal.hide();
        this.$modal.removeClass('open');

        if (this.button && this.button.isButton) {
            this.button.getElement().removeClass('rx-in-modal toggled');
        }

        this.button = false;
        this.stack = false;
        this.name = false;

        // broadcast
        this.app.broadcast('modal.close');
    },
    getHeader() {
        return this.$header;
    },
    getBody() {
        return this.stack.getBody();
    },
    getFooter() {
        return this.stack.getFooter();
    },
    getStack() {
        return this.stack;
    },
    getElement() {
        return this.$modal;
    },
    getName() {
        return this.name;
    },
    getButton() {
        return this.button;
    },
    updateWidth(width) {
        let $cont = this.app.container.get('main');
        let contWidth = $cont.width();
        let padLeft = parseInt($cont.css('border-left-width'));
        let padRight = parseInt($cont.css('border-right-width'));
        let fullwidth = (width === '100%');

        if (width === '100%' || contWidth < parseInt(width)) {
            if (contWidth > 880) {
                fullwidth = false;
            }

            contWidth = (contWidth > 880) ? 880 : contWidth;

            width = (contWidth - padLeft - padRight);
            width = (width < 300) ? 300 : width;
            width = width + 'px';
        }

        this.$modal.css({ 'width': width });
        this.$modal.attr('data-width', width);
        this.$modal.attr('data-fullwidth', fullwidth);
    },
    updateTheme(theme) {
        if (this.$modal) {
            this.$modal.attr('rx-data-theme', theme);
        }
    },
    updatePosition(e) {
        this._buildPosition(e);
        setTimeout(this._buildHeight.bind(this), 0);
        this._buildDepth();
    },
    updateOnScroll() {
        if (this.isOpen()) {
            this._buildPosition();
            setTimeout(this._buildHeight.bind(this), 0);
        }
    },

    // =private
    _open() {
        // broadcast
        this.app.broadcast('modal.before.open', { modal: this, stack: this.stack });

        // stacks
        this.$stacks.html('');
        this.$stacks.append(this.stack.getStack());

        // render
        this._renderName();
        this._renderHeader();

        // render stack
        this.stack.render();

        // build
        this._buildPosition();
        setTimeout(this._buildHeight.bind(this), 0);
        this._buildDepth();

        // events
        this._startEvents();

        // open
        this.$modal.show();
        this.$modal.addClass('open');

        // focus
        this.stack.renderFocus(this.params.focus);

        // broadcast
        this.app.broadcast('modal.open', { modal: this, stack: this.stack });
    },
    _startEvents() {
        let $target = (this.opts.is('iframe')) ? this.dom(window.parent.document) : this.app.scroll.getTarget();

        $target.on('resize.rx-modal', this.updatePosition.bind(this));
        $target.on('scroll.rx-modal', this.updateOnScroll.bind(this));
        this.app.editor.getEditor().on('scroll.rx-modal', this.updateOnScroll.bind(this));
    },
    _stopEvents() {
        let $target = (this.opts.is('iframe')) ? this.dom(window.parent.document) : this.app.scroll.getTarget();

        $target.off('.rx-modal');
        this.app.editor.getEditor().off('.rx-modal');
    },
    _stop() {
        if (this.$modal) this.$modal.remove();
    },
    _renderHeader() {
        let title = this.stack.getTitle();

        this.$header.html('');

        if (title) {
            this.$header.html(this.lang.parse(title));
            this._buildClose();
        }
    },
    _renderName() {
        this.$modal.attr('rx-modal-name', this.name);
    },
    _build() {
        this.$modal = this.dom('<div>').addClass('rx-modal rx-modal-' + this.uuid);
        this.$modal.hide();
        this.$modal.attr({
            'dir': this.opts.get('dir'),
            'rx-data-theme': this.app.theme.get()
        });

        // append
        this.app.$body.append(this.$modal);
    },
    _buildClose() {
        let $close = this.dom('<span>').addClass('rx-modal-close');
        $close.one('click', this._catchClose.bind(this));

        this.$header.append($close);
    },
    _buildHeader() {
        this.$header = this.dom('<div>').addClass('rx-modal-header');
        this.$modal.prepend(this.$header);
    },
    _buildStacks() {
        this.$stacks = this.dom('<div>').addClass('rx-modal-stacks');
        this.$modal.append(this.$stacks);
    },
    _buildDepth() {
        if (this.opts.is('bsmodal')) {
            this.$modal.css('z-index', 1061);
        }
        if (this.app.isProp('fullscreen')) {
            this.$modal.css('z-index', 10002);
        }
    },
    _buildPosition() {
        const $toolbox = this.app.container.get('toolbox');
        const contRect = this.app.$body.get().getBoundingClientRect();
        const editorRect = this.app.container.get('main').get().getBoundingClientRect();
        const type = this.app.button.getType();
        const modalHeight = this.$modal.height();
        const modalFullWidth = this.$modal.attr('data-fullwidth');

        let modalWidth = parseInt(this.$modal.attr('data-width'));
        let top = 0, left = 0, leftOffset = 0;
        let button = (type === 'control') ? this.app.control.getButton('toggle') : this.button;
        let buttonRect = button.getRect();
        let spaceLeft = buttonRect ? buttonRect.left - contRect.left : 0;
        let spaceRight = buttonRect ? contRect.right - buttonRect.right : 0;

        if (modalFullWidth) {
            if (type === 'toolbar') {
                top = $toolbox.offset().top + $toolbox.height();
            }
            else {
                top = buttonRect.top + buttonRect.height;

                leftOffset = 10;
                modalWidth = modalWidth - 20;
                this.$modal.css({ 'width': modalWidth + 'px' });
            }

            left = editorRect.left + leftOffset;
        }
        else {
            left = editorRect.left;
            top = buttonRect.top + buttonRect.height;

            if (spaceRight >= modalWidth) {
                left = buttonRect.left; // right of the button
            }
            else if (spaceLeft >= modalWidth) {
                left = buttonRect.left + buttonRect.width - modalWidth; // left of the button
            }
        }

        if (this.opts.is('maxHeight')) {
            let $editor = this.app.editor.getEditor();
            let editorBottom = $editor.offset().top + $editor.height();
            let editorTop = $editor.offset().top;

            if (top > editorBottom || editorTop > top) {
                this.$modal.hide();
            }
            else if (this.app.modal.isOpen()) {
                this.$modal.show();
            }
        }

        let $target = this.app.scroll.getTarget();
        if (modalWidth > $target.width()) {
            this.$modal.css({ 'width': $target.width() + 'px' });
        }
        else {
            this.$modal.css({ 'width': modalWidth + 'px' });
        }

        // set
        this.$modal.css({
            top: top + 'px',
            left: left + 'px'
        });
    },
    _buildHeight() {
        let targetHeight, top;
        let $target = this.app.scroll.getTarget();
        let tolerance = 0;
        let offset = this.$modal.offset();
        let cropHeight;

        if (this.app.scroll.isTarget()) {
            top = offset.top - $target.offset().top + parseInt($target.css('padding-top'));
            targetHeight = $target.height() - parseInt($target.css('border-bottom-width'));

            cropHeight = targetHeight - top - tolerance;
        }
        else {
            top = offset.top - $target.scrollTop();
            targetHeight = $target.height();
            cropHeight = targetHeight - top - tolerance;
        }

        this.$modal.css('max-height', cropHeight + 'px');
    },
    _catchClose(e) {
        e.preventDefault();
        e.stopPropagation();

        this.close();
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'button', {
    init() {
        this.register = {};
        this.button = false;
        this.type = false;
    },
    add(name, obj) {
        this.register[name] = obj;
    },
    set(button, type) {
        this.button = button;
        this.type = type;
    },
    getButton() {
        return this.button;
    },
    getType() {
        return this.type;
    },
    observe($container) {
        $container.find('.rx-button').each(function($node) {
            let instance = $node.dataget('instance');
            if (instance) {
                instance.observe();
            }
        });
    },
    setButtonColor($node, styles) {
        let instance = $node.dataget('instance');
        if (instance && instance.has('color')) {
            if (styles && Object.keys(styles).length !== 0) {
                if (styles.color && styles.background) {
                    instance.setBackground(styles.background);
                    instance.setColor(styles.color);
                }
                else {
                    instance.setBackground(styles.color || styles.background);
                }
            }
            else {
                instance.resetBackground();
            }
        }
    },
    build(buttons, customButtons, type, $container, removeButtons) {
        let finalButtons = [],
            obj = {},
            button;

        // buttons array
        if (Array.isArray(buttons)) {
            buttons.forEach(function(name) {
                if (typeof name === 'object') {
                    obj = this.buildObject(type, name.name, name);
                }
                else {
                    obj = this.buildObject(type, name);
                }

                if (obj) {
                    finalButtons.push(obj);
                }
            }.bind(this));
        }
        // buttons object
        else {
            for (let [key, item] of Object.entries(buttons)) {
                obj = this.buildObject(type, key, item);
                if (obj) {
                    finalButtons.push(obj);
                }
            }
        }

        // extend custom buttons
        let extendFromOpts = this.opts.get(type + '.add');
        if (extendFromOpts && type !== 'control') {
            customButtons = Redactor.extend(true, {}, customButtons, extendFromOpts);
        }

        // custom buttons object
        for (let [key, item] of Object.entries(customButtons)) {
            obj = this.buildObject(type, key, item);
            if (obj) {
                finalButtons.push(obj);
            }
        }

        // shift buttons with last position
        let lastItem;
        for (let [key, item] of Object.entries(finalButtons)) {
            if (item.position === 'last') {
                lastItem = Redactor.extend(true, {}, item);
                delete finalButtons[key];
            }
        }
        if (lastItem) {
            finalButtons[Object.keys(finalButtons).length+1] = lastItem;
        }

        // get toggled
        let $toggled = $container.find('.toggled');
        let toggled = {};
        $toggled.each(function($node) {
            let btn = $node.dataget('instance');
            let btnName = btn.getName();
            toggled[btnName] = {
                title: btn.getTitle(),
                icon: btn.getIcon(),
                command: btn.getCommand()
            };
        });

        // clear
        $container.html('');

        // extend remove buttons
        let extendRemoveFromOpts = this.opts.get(type + '.hide');
        if (extendRemoveFromOpts && type !== 'control') {
            if (!removeButtons) {
                removeButtons = [];
            }
            removeButtons = [...removeButtons, ...extendRemoveFromOpts];
        }

        // build buttons
        for (let item of Object.values(finalButtons)) {
            if (removeButtons && removeButtons.indexOf(item.name) !== -1) {
                continue;
            }

            button = this.app.create('button', item.name, item, $container, type);

            // toggled
            for (let [key, btn] of Object.entries(toggled)) {
                if (key === item.name) {
                    button.setToggled();
                    button.setIcon(btn.icon);
                    button.setCommand(btn.command);
                    button.setTitle(btn.title);
                }
            }
        }
    },
    buildBlockButtons(type, $container, removeButtons) {
        let block = this.app.block.get();
        if (!block) return;

        let buttons = block.getButtons(type) || {};

        // add
        for (let [key, item] of Object.entries(buttons)) {
            let obj = this.buildObject(type, key, item);

            if ((removeButtons && removeButtons.indexOf(key) !== -1) || this._isHiddenButton(type, key)) {
                continue;
            }
            else {
                this.app.create('button', key, obj, $container, type);
            }
        }

    },
    buildObject(type, name, extend) {
        let btnObj = this._getButtonObj(name);

        if (extend) {
            btnObj = (btnObj) ? Redactor.extend(true, {}, btnObj, extend) : Redactor.extend(true, {}, extend);
        }
        else {
            btnObj = (btnObj) ? Redactor.extend(true, {}, btnObj) : {};
        }

        // set name
        btnObj.name = (typeof btnObj.name !== 'undefined') ? btnObj.name : name;

        // check hidden
        return (this._isHiddenButton(type, name)) ? false : btnObj;
    },

    // =private
    _isHiddenButton(type, name) {
        let opt = this.opts.get(type),
            instance = this.app.block.get(),
            hidden = (opt) ? opt.hide : false,
            map = {
            'add': 'addbar',
            'html': 'source',
            'format': 'format',
            'line': 'line',
            'pre': 'pre',
            'quote': 'quote',
            'layout': 'layouts',
            'wrapper': 'wrapper',
            'table': 'table',
            'image': 'image'
        };

        if (typeof map[name] !== 'undefined' && !this.opts.is(map[name])) return true;
        if (hidden && hidden.indexOf(name) !== -1) return true;
        if (name === 'trash' && instance && instance.isType('noneditable') && !this.opts.is('noneditable.remove')) return true;
        if (name === 'trash' && instance && instance.isType('column')) return true;

        return false;
    },
    _getButtonObj(name) {
        let buttons = this.opts.get('buttonsObj');
        let obj = (buttons[name]) ? buttons[name] : false;
        obj = (!obj && this.register[name]) ? this.register[name] : obj;

        return obj;
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'codemirror', {
    init() {
        this.cm = false;
    },
    create(params) {
        if (!this.is()) return;

        let opts = this.opts.get('codemirror'),
            instance = this.opts.get('codemirrorSrc');

        opts = (typeof opts === 'object') ? opts : {};
        instance = (instance) ? instance : CodeMirror;

        this.cm = instance.fromTextArea(this.dom(params.el).get(), opts);

        if (params.height) this.cm.setSize(null, params.height);
        if (params.focus) this.cm.focus();

        return this.cm;
    },
    destroy() {
        if (this.cm) {
            this.cm.toTextArea();
            this.cm = false;
        }
    },
    is() {
        return this.opts.get('codemirror');
    },
    val(html) {
        if (this.is() && this.cm) {
            html = this.cm.getValue();
        }

        return html;
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'autosave', {
    send() {
        if (this.opts.is('autosave.url')) {
            this._send();
        }
    },

    // private
    _getName() {
        let name,
            autosaveName = this.opts.get('autosave.name');

        if (autosaveName) {
            name = autosaveName;
        }
        else {
            name = this.app.element.getName();
            name = (!name) ? 'content' + this.uuid : name;
        }

        return name;
    },
    _send() {
        let name = this._getName(),
            url = this.opts.get('autosave.url'),
            method = this.opts.get('autosave.method'),
            autosaveData = this.opts.get('autosave.data'),
            utils = this.app.create('utils'),
            data = {};

        data[name] = this.app.element.getHtml();
        data = utils.extendData(data, autosaveData);

        this.ajax.request(method, {
            url: url,
            data: data,
            before: function(xhr) {
                let event = this.app.broadcast('autosave.before.send', { xhr: xhr, name: name, data: data });
                if (event.isStopped()) {
                    return false;
                }
            }.bind(this),
            success: function(response) {
                this._complete(response, name, data);
            }.bind(this)
        });
    },
    _complete(response, name, data) {
        let callback = (response && response.error) ? 'autosave.error' : 'autosave.send';
        this.app.broadcast(callback, { name: name, data: data, response: response });
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'input', {
    handle(event) {
        let e = event.get('e'),
            key = event.get('key');

        if (this._doSelectAll(e, event)) {
            return;
        }

        // typing
        if (event.is(['enter', 'delete', 'backspace', 'alpha', 'space'])) {
            this.app.control.updatePosition();
        }

        // events
        if (event.is('enter') && event.is('shift')) {
            this.handleShiftEnter(e, key, event);
        }
        else if (event.is('enter')) {
            this.handleEnter(e, key, event);
        }
        else if (event.is('space') && event.is('shift')) {
            this.handleShiftSpace(e, key, event);
        }
        else if (event.is('space')) {
            this.handleSpace(e, key, event);
        }
        else if (event.is('tab') && this.opts.is('tab.key')) {
            this.handleTab(e, key, event);
        }
        else if (event.is('arrow')) {
            if (event.is('ctrl') && event.is('up')) {
                this.handleArrowCtrl(e, key, event);
                return;
            }
            if (event.is(['shift', 'alt', 'ctrl'])) return;

            this.handleArrow(e, key, event);
        }
        else if (event.is(['delete', 'backspace'])) {
            this.handleDelete(e, key, event);
        }
    },
    handleSpace(e, key, event) {
        let instance = this.app.block.get(),
            selection = this.app.create('selection'),
            caret = this.app.create('caret');

        // multiple selection
        if (this.app.blocks.is()) {
            let $first = this.app.blocks.get({ first: true, selected: true });

            selection.truncate();
            caret.set($first, 'end');
            return;
        }

        // handle block space
        if (instance.handleSpace && instance.handleSpace(e, key, event)) {
            return;
        }

        // inline block
        if (instance.isInline()) {
            if (!instance.isEditable() || (instance.isEditable() && instance.isAllSelected())) {
                e.preventDefault();
                caret.set(instance.getBlock(), 'after');
                instance.remove();
            }
            return;
        }
        // editable
        else if (instance.isEditable() && instance.isAllSelected()) {
            e.preventDefault();
            instance.setEmpty();
            return;
        }
        // non editable
        else if (!instance.isEditable()) {
            e.preventDefault();
            instance.insertEmpty({ position: 'after', caret: 'start', type: 'input' });
            instance.remove({ broadcast: true });
        }
    },
    handleEnter(e, key, event) {
        let instance = this.app.block.get(),
            selection = this.app.create('selection'),
            insertion = this.app.create('insertion'),
            caret = this.app.create('caret');


        // multiple selection
        if (this.app.blocks.is()) {
            e.preventDefault();
            selection.truncate();
            return;
        }

        // inside selection
        if (!instance.isInline() && this._deleteInsideSelection(e)) {
            return;
        }

        // inline block
        if (instance.isInline()) {
            e.preventDefault();
            if (!instance.isEditable() || (instance.isEditable() && instance.isAllSelected())) {
                caret.set(instance.getBlock(), 'after');
                instance.remove();
            }
            return;
        }
        // editable
        else if (instance.isEditable()) {
            // all block selected
            if (instance.isAllSelected()) {
                e.preventDefault();
                instance.setEmpty();
                return;
            }
            // partial selected
            else if (!selection.isCollapsed()) {
                e.preventDefault();
                if (instance.isType('pre')) {
                    insertion.insertNewline();
                }
                else {
                    insertion.insertBreakline();
                }
                return;
            }
        }
        // non editable
        else if (!instance.isEditable()) {
            e.preventDefault();
            if (instance.isType('list')) {
                let $parent = instance.getBlock().closest('li');
                if ($parent.length === 0) {
                    instance.insertEmpty({ position: 'after', caret: 'start', type: 'input' });
                    return;
                }
                else {
                    instance.remove();
                    this.app.block.set($parent, 'end');
                    return;
                }
            }
            else if (instance.isType('cell')) {
                e.preventDefault();
                instance.getBlock().html('');
                let newInstance = this.app.block.create();
                instance.getBlock().append(newInstance.getBlock());
                this.app.editor.build();
                this.app.block.set(newInstance.getBlock(), 'start');
                return;
            }
            else {
                instance.insertEmpty({ position: 'after', caret: 'start', type: 'input' });
                return;
            }
        }

        // handle block enter
        if (instance.handleEnter) {
            instance.handleEnter(e, key, event);
        }
    },
    handleTab(e, key, event) {
        let instance = this.app.block.get(),
            insertion = this.app.create('insertion'),
            selection = this.app.create('selection'),
            next,
            last;


        // multiple selection
        if (this.app.blocks.is()) {
            e.preventDefault();
            instance = this.app.blocks.get({ last: true, selected: true });
            selection.collapse('end');
            this.app.block.set(instance);
            this.app.context.close();
            return;
        }

        // handle block tab
        if (instance && instance.handleTab && instance.handleTab(e, key, event)) {
            return;
        }

        // tab as spaces
        if (instance && this.opts.is('tab.spaces') && instance.isEditable()) {
            e.preventDefault();
            let num = this.opts.get('tab.spaces');
            let node = document.createTextNode(Array(num + 1).join('\u00a0'));
            insertion.insertNode(node, 'end');
            return;
        }
        // set next
        else if (instance) {
            this._traverseNext(e, instance);
        }
    },
    handleArrowCtrl(e, key, event) {
        let selection = this.app.create('selection');

        this.app.editor.unsetSelectAll();
        selection.remove();
        this.app.editor.setFocus('start');
    },
    handleArrow(e, key, event) {

        let instance = this.app.block.get(),
            caret = this.app.create('caret'),
            selection = this.app.create('selection');

        // all selected
        if (this.app.editor.isSelectAll()) {
            e.preventDefault();
            let target = (event.is('down-right')) ? this.app.blocks.get({ last: true }) : this.app.blocks.get({ first: true });
            let point = (event.is('down-right')) ? 'end' : 'start';
            this.app.editor.unsetSelectAll();
            selection.truncate();
            this.app.block.set(target, point);
            return;
        }
        // multiple selection
        else if (this.app.blocks.is()) {
            e.preventDefault();
            instance = (event.is('down-right')) ? this.app.blocks.get({ last: true, selected: true }) : this.app.blocks.get({ first: true, selected: true });
            selection.collapse((event.is('down-right')) ? 'end' : 'start');
            this.app.block.set(instance);
            this.app.context.close();
            return;
        }

        if (!instance) {
            return;
        }

        // trim invisible char
        if (instance.isEditable() && event.is(['left', 'right']) && this._trimInvisibleChar(e, (event.is('left') ? 'left' : 'right'))) {
            return;
        }

        // handle block
        if (instance.handleArrow && instance.handleArrow(e, key, event)) {
            return;
        }

        // noneditable & lists
        if (!instance.isEditable() || instance.isType(['todo', 'list'])) {
            if (event.is('up-left')) {
                return this._traversePrev(e, instance);
            }
            else if (event.is('down-right')) {
                return this._traverseNext(e, instance);
            }
        }
        else if (instance.isEditable()) {
            if (event.is('down-right') && instance.isCaretEnd()) {
                let next;
                let table = instance.getClosest('table');
                if (table) {
                    e.preventDefault();
                    next = table.getNext();
                    if (next) {
                        this.app.block.set(next, 'start');
                    }
                    else {
                        let newInstance = this.app.block.create();
                        table.insert({ instance: newInstance, position: 'after', type: 'input' });
                    }
                    return;
                }
                else {
                    next = instance.getNext();
                    if (next) {
                       e.preventDefault();
                       this.app.block.set(next, 'start');
                       return;
                    }
                }
            }
        }
    },
    handleDelete(e, key, event) {
        let instance = this.app.block.get(),
            isBackspace = event.is('backspace'),
            isDelete = event.is('delete'),
            selection = this.app.create('selection'),
            data;


        // editor empty
        if (this.app.editor.isEmpty()) {
            e.preventDefault();
            return;
        }
        // multiple selection
        else if (this.app.blocks.is()) {
            e.preventDefault();
            let $first = this.app.blocks.get({ first: true, selected: true });
            selection.truncate();
            this.app.block.set($first, 'end');
            this.app.block.get().appendNext();
            this.app.context.close();
            return;
        }

        // trim invisible char
        if (instance && instance.isEditable() && this._trimInvisibleChar(e, (event.is('backspace') ? 'left' : 'right'), isDelete)) {
            return;
        }

        // inline
        let inline = selection.getInline();
        if (inline && inline.innerHTML.length === 1) {
            e.preventDefault();
            inline.innerHTML = '';
            return;
        }

        // handle block
        if (instance.handleDelete && instance.handleDelete(e, key, event)) {
            return;
        }

        // inline block
        if (instance.isInline()) {
            return this._deleteInlineBlock(e, instance);
        }
        // non editable
        else if (!instance.isEditable()) {
            return this._deleteNotEditable(e, instance);
        }
        // editable
        else if (instance.isEditable()) {
            return this._deleteEditable(e, instance, event);
        }
    },
    handleShiftEnter(e) {
        let instance = this.app.block.get(),
            insertion = this.app.create('insertion'),
            selection = this.app.create('selection'),
            caret = this.app.create('caret');

        // multiple selection
        if (this.app.blocks.is()) {
            e.preventDefault();
            let $first = this.app.blocks.get({ first: true, selected: true });

            selection.truncate();
            caret.set($first, 'end');
            insertion.insertBreakline();
            return;
        }

        // inside selection
        if (this._deleteInsideSelection(e)) {
            return;
        }

        // inline block
        if (instance.isInline()) {
            e.preventDefault();
            if (!instance.isEditable()) {
                caret.set(instance.getBlock(), 'after');
                instance.remove();
            }

            return;
        }
        // editable
        else if (instance.isEditable()) {
            e.preventDefault();
            insertion.insertBreakline();
        }
        // non editable
        else {
            e.preventDefault();
            instance.insertEmpty({ position: 'after', caret: 'start', type: 'input' });
        }


    },
    handleShiftSpace(e) {
        let instance = this.app.block.get(),
            insertion = this.app.create('insertion'),
            selection = this.app.create('selection'),
            caret = this.app.create('caret');

        // multiple selection
        if (this.app.blocks.is()) {
            e.preventDefault();

            let $first = this.app.blocks.get({ first: true, selected: true });

            selection.truncate();
            caret.set($first, 'end');
            insertion.insertHtml('&nbsp;', 'end');
            return;
        }

        // inline block
        if (instance.isInline()) {
            return;
        }
        // editable
        else if (instance.isEditable()) {
            // selected all
            if (instance.isAllSelected()) {
                e.preventDefault();
                instance.setEmpty();
                return;
            }
            else if (!instance.isType('pre')) {
                e.preventDefault();
                insertion.insertHtml('&nbsp;', 'end');
                return;
            }
        }
    },
    handleTextareaTab(e) {
        if (e.keyCode !== 9) return true;
        e.preventDefault();

        let el = e.target,
            val = el.value,
            start = el.selectionStart;

        el.value = val.substring(0, start) + "    " + val.substring(el.selectionEnd);
        el.selectionStart = el.selectionEnd = start + 4;
    },

    // =private
    _deleteInlineBlock(e, instance) {
        let caret = this.app.create('caret'),
            $block = instance.getBlock(),
            $parent = $block.parent().closest('[data-rx-type]');

        if (instance.isEditable() && !instance.isAllSelected()) return;

        e.preventDefault();
        caret.set($block, 'after');
        instance.remove();
        this.app.block.set($parent);
        this.app.context.close();
        return;
    },
    _deleteEditable(e, instance, event) {

        let next = instance.getNext(),
            prev = instance.getPrev(),
            isBackspace = event.is('backspace'),
            isDelete = event.is('delete'),
            selection = this.app.create('selection');

        // all block selected
        if (instance.isAllSelected()) {
            e.preventDefault();
            if (instance.isType('quote')) {
                this.app.block.remove();
            }
            else {
                instance.setEmpty();
            }
            this.app.context.close();
            return;
        }

        // delete & end
        if (isDelete && next && instance.isCaretEnd()) {
            e.preventDefault();

            if (!next.isEditable() && !next.isType(['list', 'todo'])) {
                this.app.block.set(next);

                // remove
                if (instance.isEmpty()) {
                    instance.remove({ broadcast: true });
                }
            }
            else {
                if (next.getType() === 'pre') {
                    // remove
                    if (instance.isEmpty()) {
                        instance.remove({ broadcast: true });
                        return;
                    }
                }

                instance.appendNext();
            }

            this.app.context.close();
            return;
        }
        // backspace & start
        else if (isBackspace && prev && instance.isCaretStart()) {
            let caret = this.app.create('caret');
            e.preventDefault();
            if (!prev.isEditable() && !prev.isType(['list', 'todo'])) {
                this.app.block.set(prev, 'force');

                // remove
                if (instance.isEmpty()) {
                    instance.remove({ broadcast: true });
                }
            }
            else {
                if (prev.getType() === 'pre') {
                    // remove
                    if (instance.isEmpty()) {
                        instance.remove({ broadcast: true });
                        return;
                    }
                }

                instance.appendToPrev();
                this.app.control.updatePosition();
            }

            this.app.context.close();
            return;
        }
        else if (!selection.isCollapsed()) {
            e.preventDefault();
            selection.truncate();
            this.app.context.close();
            return;
        }
    },
    _deleteNotEditable(e, instance) {
        let next = instance.getNext(),
            prev = instance.getPrev(),
            type = instance.getType(),
            data = {};

        e.preventDefault();
        if (type === 'image') {
            data = {
                url: instance.getSrc(),
                id: instance.getId()
            };
        }

        // remove
        instance.remove({ broadcast: true });

        // broadcast image
        if (type === 'image') {
            this.app.broadcast('image.remove', data);
        }

        // set next
        if (next) {
            this.app.block.set(next, 'start');
        }
        else if (prev) {
            this.app.block.set(prev, 'end');
        }
        else {
            if (this.app.editor.isEmpty()) {
                this.app.editor.setEmpty();
            }
            else {
                this.app.block.unset();
            }
        }
    },
    _deleteInsideSelection(e) {
        let selection = this.app.create('selection'),
            caret = this.app.create('caret'),
            blocks;

        if (!selection.isCollapsed()) {
            blocks = selection.getNodes({ type: 'block' });
            if (blocks.length > 1) {
                e.preventDefault();
                selection.truncate();
                caret.set(blocks[0], 'end');
                return true;
            }
        }

        return false;
    },
    _doSelectAll(e, event) {
        // if select all & action key - make empty
        if (this._isAllSelected(event)) {
            this._setEditorEmpty(e, event);
            return true;
        }

        // select block
        if (event.is('select-block')) {
            let instance = this.app.block.get();
            let $target;
            if (instance && instance.isEditable()) {
                let selection = this.app.create('selection');
                    $target = instance.getBlock();

                if (instance.isType('todoitem')) {
                    $target = instance.getContentItem();
                }
                else if (instance.isType('quote')) {
                    $target = instance.getCurrentItem();
                }

                e.preventDefault();
                selection.select($target);
                return;
            }
        }
        // select all
        else if (event.is('select')) {
            e.preventDefault();
            this.app.editor.setSelectAll();
            return true;
        }
    },
    _traverseNext(e, instance) {
        let next = instance.getNext();
        if (next) {
            e.preventDefault();
            this.app.block.set(next, 'start');
            return;
        }
        else {
            next = instance.getNextParent();
            if (next) {
                e.preventDefault();
                this.app.block.set(next, 'start');
                return;
            }
        }
    },
    _traversePrev(e, instance) {
        let next = instance.getPrev();
        if (next) {
            e.preventDefault();
            this.app.block.set(next, 'end');
            return;
        }
        else {
            next = instance.getPrevParent();
            if (next) {
                e.preventDefault();
                this.app.block.set(next, 'end');
                return;
            }
        }
    },
    _isAllSelected(event) {
        return (this.app.editor.isSelectAll() && event.is(['enter', 'delete', 'backspace', 'alpha', 'space']));
    },
    _setEditorEmpty(e, event) {
        if (!event.is(['alpha', 'space'])) e.preventDefault();
        this.app.editor.setEmpty();
    },
    _trimInvisibleChar(e, pointer, remove) {
        let direction = (pointer === 'left') ? 'before' : 'after',
            selection = this.app.create('selection'),
            offset = this.app.create('offset'),
            current = selection.getCurrent(),
            isChar = this._isInvisibleChar(selection, current, direction),
            el;

        if (isChar && pointer === 'left') {
            el = current;
            this.dom(el).replaceWith(el.textContent.replace(/\uFEFF/g, ''));
        }
        else if (isChar && remove && current && current.nextSibling) {
            el = current.nextSibling;
            this.dom(el).replaceWith(el.textContent.replace(/\uFEFF/g, ''));
        }
        else if (isChar && pointer === 'right') {
            e.preventDefault();
            let data = offset.get();
            offset.set(false, { start: data.start + 1, end: data.end + 1 });
            return true;
        }
    },
    _isInvisibleChar(selection, current, type) {
        let utils = this.app.create('utils'),
            text = selection.getText(type);

        return (current && current.nodeType === 3 && utils.searchInvisibleChars(text) === 0);
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'progress', {
    stop() {
        this.hide();
    },
    show($target) {
        this.hide();

        this.$progress = this.dom('<div>').addClass('rx-editor-progress');
        this.$progress.attr('id', 'rx-progress');

        this.$progressBar = this.dom('<span>');
        this.$progress.append(this.$progressBar);

        if ($target) {
            $target.html('').append(this.$progress);
        }
        else {
            this.app.$body.append(this.$progress);
        }
    },
    hide() {
        this.app.$body.find('#rx-progress').remove();
    }
});
/*jshint esversion: 6 */
Redactor.add('module', 'layout', {
    popup(e, button) {
        let items = this.opts.get('layouts');
        items = Redactor.extend(true, {}, items);

        for (let [key, item] of Object.entries(items)) {
            item.command = 'layout.insert';
            item.params = Redactor.extend(true, {}, item);
        }

        let dropdown = this.app.create('dropdown', 'layout', { items: items });
        this.app.dropdown.open(e, button, dropdown);
    },
    insert(params) {
        this.app.dropdown.close();

        let instance = this.app.create('block.layout', params);
        let insertion = this.app.create('insertion');
        insertion.insert({ instance: instance });
    }
});
/*jshint esversion: 6 */
Redactor.add('tool', 'checkbox', {
    mixins: ['tool'],
    type: 'checkbox',
    input: {
        tag: 'input',
        type: 'checkbox',
        classname: '-form-checkbox'
    },
    getValue() {
        return this.$input.val();
    },

    // private
    _buildInput() {
        this.$box = this.dom('<label>').addClass(this.prefix + '-form-checkbox-item');
        this.$box.append(this.$input);

        // checkbox text
        if (this._has('text')) {
            var $span = this.dom('<span>').html(this.lang.parse(this.obj.text));
            this.$box.append($span);
        }

        this.$tool.append(this.$box);
    }
});
/*jshint esversion: 6 */
Redactor.add('tool', 'input', {
    mixins: ['tool'],
    type: 'input',
    input: {
        tag: 'input',
        type: 'text',
        classname: '-form-input'
    },

    // private
    _buildInput() {
        this.$tool.append(this.$input);
    }
});
/*jshint esversion: 6 */
Redactor.add('tool', 'number', {
    mixins: ['tool'],
    type: 'number',
    input: {
        tag: 'input',
        type: 'number',
        classname: '-form-input'
    },

    // private
    _buildInput() {
        this.$input.attr({ min: 0 }).css('max-width', '100px');
        this.$tool.append(this.$input);
    }
});
/*jshint esversion: 6 */
Redactor.add('tool', 'segment', {
    mixins: ['tool'],
    type: 'segment',
    input: {
        tag: 'input',
        type: 'hidden',
        classname: '-form-input'
    },
    setValue(value) {
        this.$segment.find('.' + this.prefix + '-form-segment-item').removeClass('active');
        this.$segment.find('[data-segment=' + value + ']').addClass('active');
        this.$input.val(value);
    },

    // private
    _buildInput() {
        this.$segment = this.dom('<div>').addClass(this.prefix + '-form-segment');

        var segments = this.obj.segments;
        for (var [name, segment] of Object.entries(segments)) {
            var $segment = this.dom('<span>').addClass(this.prefix + '-form-segment-item');
            $segment.attr('data-segment', name).on('click', this._catchSegment.bind(this));

            if (segment.icon) {
                $segment.html(segment.icon);
            }
            else {
                $segment.html(segment.name);
            }

            this.$segment.append($segment);
        }

        this.$segment.append(this.$input);
        this.$tool.append(this.$segment);
    },
    _catchSegment(e) {
        e.preventDefault();
        e.stopPropagation();

        var $item = this.dom(e.target).closest('.' + this.prefix + '-form-segment-item');
        var value = $item.attr('data-segment');

        this.$segment.find('.' + this.prefix + '-form-segment-item').removeClass('active');
        $item.addClass('active');
        this.$input.val(value);

        // call setter
        this.app.api(this.setter, this.popup);
    }
});
/*jshint esversion: 6 */
Redactor.add('tool', 'select', {
    mixins: ['tool'],
    type: 'select',
    input: {
        tag: 'select',
        classname: '-form-select'
    },

    // private
    _buildInput() {
        for (var value in this.obj.options) {
            if (this.obj.options.hasOwnProperty(value)) {
                var $option = this.dom('<option>');
                $option.val(value);
                $option.html(this.lang.parse(this.obj.options[value]));

                this.$input.append($option);
            }
        }

        this.$tool.append(this.$input);
    }
});
/*jshint esversion: 6 */
Redactor.add('tool', 'textarea', {
    mixins: ['tool'],
    type: 'textarea',
    input: {
        tag: 'textarea',
        classname: '-form-textarea'
    },
    setFocus() {
        this.$input.focus();
        this.$input.get().setSelectionRange(0, 0);
        this.$input.scrollTop(0);
    },

    // private
    _buildInput() {
        if (this._has('rows')) {
            this.$input.attr('rows', this._get('rows'));
        }

        this.$input.attr('data-gramm_editor', false);
        this.$tool.append(this.$input);
    }
});
/*jshint esversion: 6 */
Redactor.add('tool', 'upload', {
    mixins: ['tool'],
    type: 'upload',
    input: {
        tag: 'input',
        type: 'hidden',
        classname: '-form-input'
    },
    setValue(value) {
        value = (value) ? value : '';

        if (this.upload) {
            this.upload.setImage(value);
        }

        this.$input.val(value);
    },

    // private
    _buildInput() {
        // input
        this.$tool.append(this.$input);
        this._buildUpload();
    },
    _buildUpload() {
        this.$upload = this.dom('<input>').attr('type', 'file');
        this.$tool.append(this.$upload);

        // tool trigger method
        var trigger = {};
        if (this._has('trigger') && this._get('trigger')) {
            trigger = {
                instance: this,
                method: 'trigger'
            };
        }

        // create upload
        this.upload = this.app.create('upload', this.$upload, this.obj.upload, trigger);
    }
});
/*jshint esversion: 6 */
Redactor.add('tool', 'color', {
    mixins: ['tool'],
    type: 'color',
    input: {
        tag: 'input',
        type: 'text',
        classname: '-form-input'
    },
    setValue(value) {
        if (!value) value = '';
        this.$input.val(value);

        if (value === '') value = '#ffffff';
        this.$toggle.css('background-color', value);
    },


    // private
    _buildInput() {
        this.$item = this.dom('<div class="rx-form-color-container">');
        this.$toggle = this.dom('<div class="rx-form-color-toggle">');

        this.$item.append(this.$input);
        this.$item.append(this.$toggle);

        this.$input.on('keyup blur', this._changeColor.bind(this));
        this.$toggle.on('click', this._toggleColorpicker.bind(this));

        this.$tool.append(this.$item);
    },
    _changeColor() {
        let value = this.$input.val();
        let utils = this.app.create('utils');
        value = utils.normalizeColor(value);

        if (value.length === 5) return;
        if (value.length > 3) {
            this.$toggle.css('background-color', value);
        }
    },
    _setColor(value) {
        this._closeColorpicker();

        let utils = this.app.create('utils');
        value = utils.normalizeColor(value);

        this.trigger(value);
    },
    _toggleColorpicker(e) {
        e.preventDefault();
        e.stopPropagation();

        if (this.$colorpicker) {
            this._closeColorpicker();
            return;
        }

        let value = this.getValue();
        let colorpicker = this.app.create('colorpicker');
        this.$colorpicker = colorpicker.build({
            $toggle: this.$toggle,
            colors: this.opts.get('colors'),
            style: {
                color: value
            },
            method: function(color) {
                this._setColor(color);
            }.bind(this)

        });
    },
    _closeColorpicker() {
        this.app.$body.find('.rx-colorpicker-' + this.uuid).remove();
        this.$colorpicker = false;
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'address', {
    mixins: ['block'],
    props: {
        type: 'address',
        editable: true,
        inline: false,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' }
    },
    create() {
        return this.dom('<address>');
    },

    handleEnter(e) {
        e.preventDefault();

        if (this.isEmpty() || this.isCaretEnd()) {
            if (this._removeEmptyBrTags()) {
                this._insertAfterEmptyBlock();
                return;
            }
        }

        return this._insertBreakline();
    },

    // Remove empty <br> at the end
    _removeEmptyBrTags() {
        const $nodes = this.$block.children();
        const len = $nodes.length;
        const $last = $nodes.eq(len - 1);
        const $lastPrev = $nodes.eq(len - 2);
        let html = this.$block.html().trim();
        html = this.app.create('utils').removeInvisibleChars(html);

        if (html.endsWith('<br>') || html.endsWith('<br/>')) {
            $last.remove();
            return true;
        }

        return false;
    },

    // Inserting an empty block after the current block
    _insertAfterEmptyBlock() {
        this.insertEmpty({ position: 'after', caret: 'start', type: 'input' });
    },

    // Inserting a line break
    _insertBreakline() {
        this.app.create('insertion').insertBreakline();
        return true;
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'dlist', {
    mixins: ['block'],
    props: {
        type: 'dlist',
        editable: true,
        inline: false,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        items: { getter: 'getItems' }
    },
    create() {
        let $el = this.dom('<dl>'),
            $dt = this.dom('<dt>').html('Term'),
            $dd = this.dom('<dd>').html('Description');

        $el.append($dt);
        $el.append($dd);

        return $el;
    },
    build() {
        this._buildItems();
    },
    setCaret(point) {
        let caret = this.app.create('caret'),
            $el = (point === 'start') ? this.getFirstItem() : this.getLastItem();

        caret.set($el, point);
    },

    // get
    getLastItem() {
        return this.$block.children().last();
    },
    getFirstItem() {
        return this.$block.children().first();
    },
    getItems() {
        let arr = [],
            $next,
            $cloneTerm,
            $cloneDesc,
            obj = {};

        this.$block.find('dt').each(function($node) {
            obj = {};
            $cloneTerm = $node.clone();
            $cloneTerm = this.unparseInlineBlocks($cloneTerm);
            obj.term = $cloneTerm.html();

            $next = $node.nextElement();
            if ($next.length !== 0) {
                $cloneDesc = $next.clone();
                $cloneDesc = this.unparseInlineBlocks($cloneDesc);
                obj.desc = $cloneDesc.html();
            }

            arr.push(obj);
        }.bind(this));

        return arr;
    },

    // handle
    handleEnter(e, key, event) {
        e.preventDefault();

        let insertion = this.app.create('insertion'),
            selection = this.app.create('selection'),
            utils = this.app.create('utils'),
            caret = this.app.create('caret'),
            currentItem,
            $currentItem,
            tag,
            isItemEmpty,
            $newItem;

        // empty or end
        if (this.isEmpty() || this.isCaretEnd()) {
            currentItem = selection.getBlock();
            $currentItem = this.dom(currentItem);
            tag = currentItem.tagName.toLowerCase();
            isItemEmpty = utils.isEmptyHtml(currentItem.innerHTML);

            if (tag === 'dt' && isItemEmpty) {
                // remove empty
                $currentItem.remove();

                // insert
                this.insertEmpty({ position: 'after', caret: 'start', type: 'input' });
                return true;
            }

            // insert dt or dd
            if (tag === 'dt') {
                $newItem = this.dom('<dd>');
            }
            else {
                $newItem = this.dom('<dt>');
            }

            this.dom(currentItem).after($newItem);
            caret.set($newItem, 'start');
        }
        // start
        else if (this.isCaretStart()) {
            return true;
        }
        // middle
        else {
            insertion.insertBreakline();
        }

        return true;
    },

    // private
    _buildItems() {
        let items = this.data.get('items'),
            item,
            $term,
            $desc;

        if (items) {
            this.$block.html('');

            for (item of items) {
                $term = this.dom('<dt>').html(item.term);
                $desc = this.dom('<dd>').html(item.desc);

                this.$block.append($term);
                this.$block.append($desc);
            }
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'embed', {
    mixins: ['block'],
    parser: false,
    props: {
        type: 'embed',
        focusable: true,
        editable: false,
        inline: false,
        control: {
            'embed': {
                position: { after: 'add' }
            }
        }
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' },
        caption: { getter: 'getCaption', setter: 'setCaption' },
        responsive: { getter: 'getResponsive', setter: 'setResponsive' }
    },
    start() {
        // local
        this.embedClassname = this.opts.get('embed.classname');
        this.responsiveClassname = this.opts.get('embed.responsiveClassname');
    },
    create() {
        return this.dom('<figure>');
    },
    parse() {
        let $figcaption = this.$block.find('figcaption'),
            $clone,
            content;

        this.$embed = (this.embedClassname) ? this.$block.find('.' + this.embedClassname) : this.$block;
        if (this.$embed.length === 0) {
            $clone = this.$block.clone();
            $clone.find('figcaption').remove();
            content = $clone.html();

            // create
            this.$embed = this._createEmbed();

            // revert caption
            if ($figcaption.length !== 0) {
                this.$block.append($figcaption);
            }
        }
        else {
            content = this.$embed.html();
        }

        // responsive
        if (this.opts.is('embed.responsive')) {
            this.$embed.addClass(this.responsiveClassname);
        }

        this.parseCaption();
        this.setContent(content);
    },
    build() {
        // create
        this.$embed = this._createEmbed();

        // responsive
        if (this.opts.is('embed.responsive')) {
            this.$embed.addClass(this.responsiveClassname);
        }
    },
    getContent() {
        let content = decodeURI(this.$block.attr('data-embed-content'));
        content = content.trim();

        return content;
    },
    getCaption() {
        let caption = null;
        if (this.figcaption) {
            caption = this.figcaption.getContent();
        }

        return caption;
    },
    getResponsive() {
        let responsive = this.$embed.hasClass(this.responsiveClassname);

        return (responsive) ? true : null;
    },
    isResponsive() {
        return this.getResponsive();
    },
    setContent(content) {
        content = content.trim();

        this.$embed.html(content);
        this._buildContent(content);
    },
    setCaption(caption) {
        if (this.figcaption) {
            this.figcaption.setContent(caption);
        }
        else {
            this._buildCaption(caption);
        }
    },
    setResponsive(responsive) {
        if (responsive) {
            this.$embed.addClass(this.responsiveClassname);
        }
    },

    // private
    _buildContent(content) {
        this.$block.attr('data-embed-content', encodeURI(content));
    },
    _createEmbed() {
        if (this.embedClassname) {
            let $embed = this.dom('<div>').addClass(this.embedClassname);

            this.$block.html('');
            this.$block.append($embed);

            return $embed;
        }
        else {
            return this.$block;
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'figcaption', {
    mixins: ['block'],
    props: {
        type: 'figcaption',
        editable: true,
        inline: false,
        control: false
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' }
    },
    create() {
        return this.dom(this.opts.get('figcaption.template'));
    },
    parse() {
        this._parsePlaceholder();
    },
    build() {
        this._buildPlaceholder();
    },

    // get
    getFigure() {
        return this.$block.closest('figure').dataget('instance');
    },

    // handle
    handleDelete(e, key, event) {
        if (event.is('delete') && this.isCaretEnd()) {
            e.preventDefault();
            return true;
        }
        return;
    },
    handleArrow(e, key, event) {
        if ((event.is('up-left') && this.isCaretStart()) || (event.is('down-right') && this.isCaretEnd())) {
            e.preventDefault();
            let parent = this.getFigure();
            this.app.block.set(parent);
            return true;
        }
    },
    handleTab(e) {
        e.preventDefault();
        let parent = this.getFigure();
        this.app.block.set(parent);
        return true;
    },
    handleEnter(e) {
        e.preventDefault();

        let insertion = this.app.create('insertion');

        // empty or end
        if (this.isEmpty() || this.isCaretEnd() || this.isCaretStart()) {
            return true;
        }
        // middle
        else {
            insertion.insertBreakline();
        }

        return true;
    },

    // private
    _buildPlaceholder() {
        this.setPlaceholder(this.lang.get('placeholders.figcaption'));
    },
    _parsePlaceholder() {
        let ph = this.$block.attr('data-placeholder');
        if (!ph) {
            this.setPlaceholder(this.lang.get('placeholders.figcaption'));
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'heading', {
    mixins: ['block'],
    props: {
        type: 'heading',
        editable: true,
        inline: false,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' },
        level: { getter: 'getLevel', setter: 'setLevel' }
    },
    create() {
        return this.dom('<' + this._createHeadingTag() + '>');
    },

    // set
    setLevel(value) {
        let elm,
            level = this.getLevel();

        if (level !== Number(value)) {
            elm = this.app.create('element');
            this.$block = elm.replaceToTag(this.$block, 'h' + value);
        }
    },

    // get
    getLevel() {
        return Number(this.getTag().replace('h', ''));
    },

    // handle
    handleEnter(e) {
        e.preventDefault();

        // empty or end
        if (this.isEmpty() || this.isCaretEnd()) {
            this.insertEmpty({ position: 'after', caret: 'start', remove: false, type: 'input' });
        }
        // start
        else if (this.isCaretStart()) {
            this.insert({ instance: this.duplicateEmpty(), position: 'before', type: 'input' });
        }
        // middle
        else {
            let elm = this.app.create('element');
            $part = elm.split(this.$block);
            this.app.block.set($part, 'start');
        }

        return true;
    },

    // private
    _createHeadingTag() {
        return 'h' + (this.data.get('level') || 2);
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'image', {
    mixins: ['block'],
    props: {
        type: 'image',
        focusable: true,
        editable: false,
        inline: false,
        control: {
            'image': {
                position: { after: 'add' }
            },
            'wrap': {
                position: { after: 'image' }
            },
            'outset': {
                position: { after: 'image' }
            }
        }
    },
    defaults: {
        src: { getter: 'getSrc', setter: 'setSrc' },
        srcset: { getter: 'getSrcset', setter: 'setSrcset' },
        url: { getter: 'getUrl', setter: 'setUrl' },
        alt: { getter: 'getAlt', setter: 'setAlt' },
        width: { getter: 'getWidth', setter: 'setWidth' },
        target: { getter: 'getTarget', setter: 'setTarget'},
        caption: { getter: 'getCaption', setter: 'setCaption' },
        wrap: { getter: 'getWrap' },
    },
    create() {
        return this.dom('<' + this.opts.get('image.tag') + '>');
    },
    parse() {
        this._parseImage();
        this._parseLink();
        this.parseCaption();
    },
    build() {
        this._buildImageTag();
        this._buildImage();
        this._buildLink();
    },
    getSrc() {
        return this.$image.attr('src');
    },
    getAlt() {
        return this.$image.attr('alt');
    },
    getSrcset() {
        return this.$image.attr('srcset');
    },
    getUrl() {
        let url = null;
        if (this.$link) {
            url = this.$link.attr('href');
        }

        return url;
    },
    getTarget() {
        let target = null;
        if (this.$link) {
            target = this.$link.attr('target');
            target = (target === '_blank') ? true : null;
        }

        return target;
    },
    getWrap() {
        let tag = this.$block.get().tagName.toLowerCase();

        return (tag === this.opts.get('image.tag')) ? null : tag;
    },
    getCaption() {
        let caption = null;
        if (this.figcaption) {
            caption = this.figcaption.getContent();
        }

        return caption;
    },
    getWidth() {
        let width = this.$image.attr('width');
        let utils = this.app.create('utils');
        let css = utils.cssToObject(this.$image.attr('style'));
        if (css.width) {
            this._width = true;
            width = css.width.replace('px', '');
        }

        return (width) ? width : null;
    },
    getImage() {
        return this.$image;
    },
    setImage(data) {
        this.$image.attr('src', data.url);

        if (data.id) this.$image.attr('data-image', data.id);
        if (data.srcset) this.$image.attr('srcset', data.srcset);
    },
    setAlt(value) {
        value = value.replace(/"/g, "'");

        this.$image.attr('alt', value);
    },
    setSrc(value) {
        this.$image.attr('src', value);
    },
    setSrcset(value) {
        this.$image.attr('srcset', value);
    },
    setWidth(value) {
        value = (value) ? value.trim() : '';

        this.$image.removeAttr('width height');
        this.$image.css({ 'width': '', 'height': '' });
        if (this.$image.attr('style') === '') {
            this.$image.removeAttr('style');
        }

        if (value !== '') {
            let percent = (value.search(/%/) !== -1);
            let width = (percent) ? value : parseInt(value);
            let ratio = this.$image.width() / this.$image.height();
            let height = Math.round(width / ratio);
            let func = (this._width) ? 'css' : 'attr';

            if (percent) {
                this.$image.removeAttr('height');
                this.$image[func]({ 'width': width });
            }
            else {
                width = (this._width) ? width + 'px' : width;
                height = (this._width) ? height + 'px' : height;

                this.$image[func]({ 'width': width, 'height': height });
            }
        }

        this._width = false;

        let cleaner = this.app.create('cleaner');
        cleaner.cacheElementStyle(this.$image);

        // broadcast
        this.app.broadcast('image.position');
        this.app.control.updatePosition();
    },
    setCaption(caption) {
        if (this.figcaption) {
            this.figcaption.setContent(caption);
        }
        else {
            this._buildCaption(caption);
        }
    },
    setUrl(value) {
        if (this.$link) {
            if (value === '') {
                this.$link.unwrap();
                this.$link = false;
            }
            else {
                this.$link.attr('href', value);
            }
        }
        else {
            if (value === '') {
                return;
            }
            else {
                this.$link = this.dom('<a>');
                this.$image.wrap(this.$link);
                this.$link.attr('href', value);
            }
        }
    },
    setTarget(value) {
        if (this.$link) {
            if (value && value !== '') {
                this.$link.attr('target', '_blank');
            }
            else {
                this.$link.removeAttr('target');
            }
        }
    },

    // parse
    _parseImage() {
        let obj = this.data.get('img');

        this.$image = this.$block.find('img');

        // params
        if (obj) {
            this._buildImageParams(obj);
        }
    },
    _parseLink() {
        let $link = this.$block.find('a');
        if ($link.closest('figcaption').length !== 0) return;

        if ($link.length !== 0) {
            this.$link = $link;
        }
    },

    // build
    _buildImageTag() {
        let tag = this.getTag(),
            imageTag = this.opts.get('image.tag'),
            newTag,
            elm,
            dataTag = this.data.get('wrap');

        if (tag !== imageTag || (dataTag && tag !== dataTag)) {
            elm = this.app.create('element');
            newTag = (dataTag) ? dataTag : imageTag;
            this.$block = elm.replaceToTag(this.$block, newTag, true);
        }
    },
    _buildImage() {
        let obj = this.data.getValues();

        this.$image = this.dom('<img>');
        this.$block.append(this.$image);

        // params
        if (obj) {
            this._buildImageParams(obj);
        }
    },
    _buildImageParams(obj) {
        for (let [key, value] of Object.entries(obj)) {
            switch (key) {
                case 'src':
                case 'alt':
                case 'srcset':
                    this.$image.attr(key, value);
                    break;
            }
        }
    },
    _buildLink() {
        let obj = this.data.getValues();
        if (obj) {
            this.$link = this.dom('<a>');
            this.$image.wrap(this.$link);

            // params
            this._buildLinkParams(obj);
        }
    },
    _buildLinkParams(obj) {
        for (let [key, value] of Object.entries(obj)) {
            switch (key) {
                case 'target':
                    if (value) {
                        this.$link.attr('target', '_blank');
                    }
                    break;
                case 'url':
                    this.$link.attr('href', value);
                    break;
            }
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'wrapper', {
    mixins: ['block'],
    nested: true,
    props: {
        type: 'wrapper',
        focusable: true,
        inline: false,
        control: {
            'unwrap': {
                position: { after: 'add' }
            }
        }
    },
    defaults: {
        wrap: { getter: 'getWrap', setter: 'setWrap' },
        children: { getter: 'getChildren' }
    },
    create() {
        let $wrapper = this.dom(this.opts.get('wrapper.template'));
        if (this.app.has('email')) {
            $wrapper.addClass('email-wrapper');
        }

        return $wrapper;
    },
    build() {
        if (!this.params.children) {
            this.fillEmpty();
        }
    },
    parse() {
        if (this.app.has('email')) {
            this.$block.addClass('email-wrapper');
        }
    },
    setCaret(point) {
        let $el = this.getFirstBlock(),
            selection = this.app.create('selection');

        if ($el.length !== 0 && $el.dataget('instance')) {
            this.app.block.set($el, point);
        }
        else {
            this.app.scroll.save();
            this.$block.attr('tabindex', '-1');
            this.$block.focus();
            selection.collapse();
            setTimeout(function() {
                selection.remove();
            }, 1);
            this.app.scroll.restore();
        }
    },
    setWrap(tag) {
        let elm = this.app.create('element');

        this.$block = elm.replaceToTag(this.$block, tag);
    },
    getWrap() {
        let tag = this.$block.get().tagName.toLowerCase();

        return (tag === 'div') ? null : tag;
    },
    getFirstBlock() {
        return this.$block.children().first();
    },
    fillEmpty() {
        if (this.isEmpty()) {
            let emptyInstance = this.app.block.create();
            this.$block.append(emptyInstance.getBlock());
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'layout', {
    mixins: ['block'],
    nested: true,
    props: {
        type: 'layout',
        focusable: true,
        inline: false,
        control: {
            'unwrap': {
                position: { after: 'add' }
            },
            'layout': {
                position: { after: 'add' }
            }
        }
    },
    defaults: {
        children: { getter: 'getChildren' }
    },
    create() {
        return this.dom('<div>').attr(this.opts.get('dataBlock'), 'layout');
    },
    build() {
        if (!this.params.children) {
            if (this.params.pattern) {
                let pattern = this.params.pattern.split('|'),
                    column,
                    obj = {};

                if (this.params.grid) {
                    this.$block.addClass(this.params.grid);
                }

                for (let i = 0; i < pattern.length; i++) {
                    if (pattern[i].search('%') !== -1) {
                        obj = { width: pattern[i] };
                    }
                    else if (pattern[i] !== '-') {
                        obj = { classname: pattern[i] };
                    }

                    column = this.app.create('block.column', obj);
                    this.$block.append(column.getBlock());
                }
            }
            else {
                let column1 = this.app.create('block.column', { width: '50%' }),
                    column2 = this.app.create('block.column', { width: '50%' });

                this.$block.append(column1.getBlock());
                this.$block.append(column2.getBlock());
            }
        }
    },
    setCaret(point) {
        let $el = (point === 'start') ? this.getFirstBlock() : this.getLastBlock();

        this.app.block.set($el, point);
    },
    getFirstBlock() {
        return this.getFirstColumn().children().first();
    },
    getFirstColumn() {
        return this.$block.find('[data-rx-type=column]').first();
    },
    getLastBlock() {
        return this.getLastColumn().children().last();
    },
    getLastColumn() {
        return this.$block.find('[data-rx-type=column]').last();
    },
    getColumns() {
        let $columns = this.$block.find('[data-rx-type=column]'),
            columns = [],
            instance;

        $columns.each(function($node) {
            instance = $node.dataget('instance');
            columns.push(instance);
        });

        return columns;
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'column', {
    mixins: ['block'],
    nested: true,
    props: {
        type: 'column',
        inline: false
    },
    defaults: {
        children: { getter: 'getChildren' },
        width: { getter: 'getWidth', setter: 'setWidth' }
    },
    create() {
        return this.dom('<div>').attr(this.opts.get('dataBlock'), 'column');
    },
    build() {
        if (!this.params.children && this.isEmpty()) {
            let block = this.app.block.create();
            this.$block.append(block.getBlock());
        }
    },
    isLastElement() {
        return (this.$block.nextElement().length === 0);
    },
    setWidth(width) {
        this.$block.css('flex-basis', width);
    },
    getWidth() {
        return this.$block.css('flex-basis');
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'line', {
    mixins: ['block'],
    props: {
        type: 'line',
        focusable: true,
        editable: false,
        inline: false
    },
    create() {
        return this.dom(this.opts.get('line.template'));
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'list', {
    mixins: ['block'],
    props: {
        type: 'list',
        focusable: true,
        inline: false,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        numbered: { getter: 'getNumbered' },
        items: { getter: 'getItems' }
    },
    create() {
        let tag = this._createTag(),
            $el = this.dom('<' + tag + '>'),
            $item = this.dom('<li>');

        $el.append($item);

        return $el;
    },
    parse() {
        this.parseItems('ul, ol', 'list');
        this.parseItems('li', 'listitem');
    },
    build() {
        this._buildItems();
        this.parseItems('ul, ol', 'list');
        this.parseItems('li', 'listitem');
    },
    setCaret(point) {
        let $el = (point === 'start') ? this.getFirsItem() : this.getLastItem();

        this.app.block.set($el, point);
    },
    getFirsItem() {
        return this.$block.find('li').first();
    },
    getFirstItemInstance() {
        return this.getFirsItem().dataget('instance');
    },
    getLastItem() {
        return this.$block.find('li').last();
    },
    getLastItemInstance() {
        return this.getLastItem().dataget('instance');
    },
    getNumbered() {
        return (this.getTag() === 'ol') ? true : null;
    },
    getItems() {
        let $items = this.$block.children(),
            instance,
            items = [];

        $items.each(function($node) {
            instance = $node.dataget('instance');
            items.push(instance.getContent());
        });

        return items;
    },

    // private
    _createTag() {
        let numbered = this.data.get('numbered') || false;

        return (numbered) ? 'ol' : 'ul';
    },
    _buildItems() {
        let items = this.data.get('items'),
            item,
            $item;

        if (items) {
            this.$block.html('');

            for (item of items) {
                $item = this.dom('<li>');
                $item.html(item);
                this.$block.append($item);
            }
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'listitem', {
    mixins: ['block'],
    props: {
        type: 'listitem',
        editable: true,
        inline: false,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' }
    },
    create() {
        return this.dom('<li>');
    },
    isListEnd() {
        return this.getParent().isCaretEnd();
    },
    isFirstElement() {
        return (this.$block.prevElement().length === 0);
    },
    isLastElement() {
        return (this.$block.nextElement().length === 0);
    },
    hasParentList() {
        return (this.$block.parent().closest('li').length !== 0);
    },
    hasChild() {
        return (this.$block.find('ul, ol').length !== 0);
    },
    getChild() {
        return this.$block.find('ul, ol').first();
    },
    getParentTop() {
        return this.$block.parents('ul, ol').last();
    },
    getParentTopInstance() {
        return this.getParentTop().dataget('instance');
    },
    getParentItem() {
        return this.$block.parent().closest('li').dataget('instance');
    },
    getParent() {
        return this.$block.parent().closest(this._buildTraverseSelector('list')).dataget('instance');
    },
    getContent() {
        let $clone = this.$block.clone(),
            content;

        $clone.find('ul, ol').before('<br>').unwrap();
        $clone = this.unparseInlineBlocks($clone);

        content = $clone.html();
        content = content.replace(/<li[^>]*>/g, '');
        content = content.replace(/<\/li>/g, '\n');
        content = content.replace(/\s\s+/g, ' ');
        content = content.replace(/\t/g, '');
        content = content.trim();

        return content;
    },

    // handle
    handleArrow(e, key, event) {
        if (event.is('up-left')) {
            return this._traversePrev(e);
        }
        else if (event.is('down-right')) {
            return this._traverseNext(e);
        }
    },
    handleDelete(e, key, event) {
        let parent = this.getParent(),
            $blocks;

        if (event.is('backspace') && this.isCaretStart() && !this.hasParentList()) {
            e.preventDefault();
            let html = this.getContent();
            let instance = this.app.block.create(html);

            this.remove();
            parent.getBlock().before(instance.getBlock());
            this.app.block.set(instance, 'start');

            return true;
        }
        else if (event.is('delete') && this.isCaretEnd() && !this.hasParentList()) {
            let next = this.getParent().getNext();
            if (next) {
                e.preventDefault();

                if (next.isType('quote')) {
                    let html = next.getBlock().text();
                    this._insertHtml(html);
                    next.remove();
                }
                else if (next.isEditable()) {
                    let html = next.getHtml();
                    this._insertHtml(html);
                    next.remove();
                }
                else if (next.isType('todo')) {
                    $item =  next.getFirstItem();
                    html = next.getFirstContent().html();
                    $item.remove();
                    this._insertHtml(html);
                    if (next.isEmpty()) {
                        next.remove();
                    }
                }
                else if (next.isType('list')) {
                    let $blocks = next.getBlock().children();
                    this.$block.append($blocks);
                    next.remove();
                }
                else {
                    this.app.block.set(next, 'start');
                }
                return true;
            }
        }
    },
    handleTab(e) {
        let indent, next;

        if (this.isEmpty()) {
            e.preventDefault();
            indent = this.app.list.indent();
            if (indent) {
                return true;
            }
        }

        if (this.isCaretStart() || this.isCaretEnd()) {
            next = this.getNext();
            if (next) {
                e.preventDefault();
                this.app.block.set(next, 'start');
                return true;
            }
        }
        else {
            if (this.opts.is('tab.spaces') && !this.isCaretStart()) {
                return;
            }

            e.preventDefault();
            this.app.list.indent();
            return true;
        }
    },
    handleEnter(e) {
        e.preventDefault();

        let instance,
            elm = this.app.create('element'),
            selection = this.app.create('selection'),
            utils = this.app.create('utils'),
            caret = this.app.create('caret'),
            $part,
            $cloned,
            isCurrentEnd = caret.is(this.$block, 'end', ['ul', 'ol']);

        if (this.hasChild() && isCurrentEnd) {
            $part = this.getChild();
            instance = this._createItem();
            $cloned = $part.clone();
            $part.remove();
            this.app.block.set(instance, 'start');
            instance.getBlock().append(utils.createInvisibleChar());
            instance.getBlock().append($cloned);
        }
        // empty or end
        else if (this.isEmpty() || this.isCaretEnd()) {
            let item = selection.getDataBlock();
            let prev = (item) ? this.dom(item).dataget('instance') : false;
            if (prev && !this.hasParentList() && prev.isEmpty()) {
                let pos = (this.isListEnd()) ? 'after' : 'split';
                this.getParent().insertEmpty({ position: pos, caret: 'start', type: 'input' });
                prev.remove();
                return true;
            }

            instance = this._createItem();
            this.app.block.set(instance, 'start');

            // event
            this.app.broadcast('list.item', { instance: instance });
        }
        // start
        else if (this.isCaretStart()) {
            instance = this._createItem('before');
            this.app.block.set(this);
        }
        // middle
        else {
            $part = elm.split(this.$block);
            instance = this._createItem();
            instance.setContent($part.html());
            $part.remove();
            this.app.block.set(instance, 'start');

            // event
            this.app.broadcast('list.item', { instance: instance });
        }

        return true;
    },

    // =private
    _traversePrev(e) {
        if (!this.isFirstElement()) return;

        e.preventDefault();

        let parent = this.getParent();
        if (this.hasParentList()) {
            parent = this.getParentItem();
        }

        next = parent.getPrev();
        if (next) {
            e.preventDefault();
            this.app.block.set(next, 'end');
            return;
        }
        else {
            next = parent.getPrevParent();
            if (next) {
                e.preventDefault();
                this.app.block.set(next, 'end');
                return;
            }
        }

        return true;
    },
    _traverseNext(e) {
        if (!this.isLastElement()) return;

        e.preventDefault();

        let parent = this.getParent();
        if (this.hasParentList()) {
            parent = this.getParentItem();
        }

        next = parent.getNext();
        if (next) {
            e.preventDefault();
            this.app.block.set(next, 'start');
            return;
        }
        else {
            next = parent.getNextParent();
            if (next) {
                e.preventDefault();
                this.app.block.set(next, 'start');
                return;
            }
        }

        return true;
    },
    _createItem(position) {
        let instance = this.app.create('block.listitem');

        position = (position) ? position : 'after';

        this.$block[position](instance.getBlock());

        return instance;
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'noneditable', {
    mixins: ['block'],
    parser: false,
    props: {
        type: 'noneditable',
        focusable: true,
        editable: false,
        inline: false
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' }
    },
    create() {
        return this.dom('<div>').attr(this.opts.get('dataBlock'), 'noneditable');
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'pre', {
    mixins: ['block'],
    props: {
        type: 'pre',
        editable: true,
        inline: false,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' },
        caption: { getter: 'getCaption', setter: 'setCaption' }
    },
    create() {
        return this.dom(this.opts.get('pre.template'));
    },
    parse() {
        this.parseCaption();
    },
    getPlainText() {
        return this._getPlainText(this._getCodeElement());
    },

    setContent(value) {
        let $el = this._getCodeElement();
        $el.html(value);
    },
    setCaption(caption) {
        if (this.figcaption) {
            this.figcaption.setContent(caption);
        }
        else {
            this._buildCaption(caption);
        }
    },
    setCaret(point) {
        let caret = this.app.create('caret'),
            $el = this._getCodeElement();

        caret.set($el, point);
    },

    getContent() {
        let $el = this._getCodeElement(),
            html = $el.html().trim();

        return html;
    },
    getCaption() {
        let caption = null;
        if (this.figcaption) {
            caption = this.figcaption.getContent();
        }

        return caption;
    },

    // handle
    handleTab(e) {
        e.preventDefault();
        let num = this.opts.get('pre.spaces'),
            insertion = this.app.create('insertion'),
            selection = this.app.create('selection'),
            node = document.createTextNode(Array(num + 1).join(' ')),
            isEnd = this.isCaretEnd(),
            prev,
            text;

         insertion.insertNode(node, 'end');
         if (isEnd) {
            prev = selection.getCurrent().previousSibling;
            text = prev.textContent;
            if (text.search(/\n\n/g) !== -1) {
                prev.textContent = text.replace(/\n\n/g, '\n');
            }

        }
         return true;
    },
    handleArrow(e, key, event) {
        let next = this.getNext();
        if (!next && this.isCaretEnd() && event.is('down')) {
            e.preventDefault();
            let instance = this.app.block.create();
            this.insert({ instance: instance, position: 'after', caret: 'start', remove: false, type: 'input' });
            return true;
        }
    },
    handleEnter(e) {
        e.preventDefault();

        let last = this.$block.html().search(/\n$/),
            insertion = this.app.create('insertion');

        if (this.isCaretEnd() && last === -1) {
            insertion.insertNewline('after', true);
        }
        else {
            insertion.insertNewline();
        }

        return true;
    },

    // private
    _getCodeElement() {
        let $pre = this.$block.find('pre'),
            $code = this.$block.find('code'),
            $el = this.$block;

        if ($code.length !== 0) {
            $el = $code;
        }
        else if ($pre.length !== 0) {
            $el = $pre;
        }

        return $el;
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'quote', {
    mixins: ['block'],
    props: {
        type: 'quote',
        editable: true,
        inline: false,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' },
        caption: { getter: 'getCaption', setter: 'setCaption' }
    },
    create() {
        return this.dom(this.opts.get('quote.template'));
    },
    parse() {
        this._parseItem();
        this._parseCaption();
    },
    build() {
        this._parseItem();
        this._parseCaption();
    },
    isEmpty(trim) {
        let $item = this.getCurrentItem();
        return this._isEmpty($item, trim);
    },
    getPlaceholder() {
        return this.getItem().attr('data-placeholder');
    },
    getCurrentItem() {
        let selection = this.app.create('selection'),
            block = selection.getParent(),
            $item = this.$quoteitem;

        if (this._isCaption(block)) {
            $item = this.$quotecaption;
        }

        return $item;
    },
    getItem() {
        return this.$quoteitem;
    },
    setCaret(point) {
        let caret = this.app.create('caret');
        caret.set(this.$quoteitem, point);
    },
    setContent(value) {
        this.$quoteitem.html(value);
    },
    setEmpty() {
        let $item = this.getCurrentItem();
        $item.html('');
    },
    setPlaceholder(value) {
        this._setAttr(this.getItem(), 'data-placeholder', value);
    },
    setCaption(caption) {
        this.$quotecaption.html(caption);
    },
    getContent() {
        return this.$quoteitem.html();
    },
    getCaption() {
        let caption = null;
        if (this.$quotecaption) {
            caption = this.$quotecaption.html();
        }

        return caption;
    },

    // handle
    handleDelete(e, key, event) {
        let caret = this.app.create('caret'),
            selection = this.app.create('selection'),
            item = this._getItemFromSelection(selection),
            caption = this._getCaptionFromSelection(selection),
            prev = this.getPrev();

        // caption
        if (event.is('backspace') && this._isCaption(caption) && caret.is(caption, 'start')) {
            let ph = this.dom(caption).attr('data-placehoder');
            let html = this.dom(caption).html();
            let utils = this.app.create('utils');
            if (utils.isEmptyHtml(html) && !ph) {
                e.preventDefault();
                this.$quotecaption.remove();
                return true;
            }

            e.preventDefault();
            this.$quotecaption.find('br').remove();
            return true;
        }
        else if (event.is('delete') && this._isCaption(caption) && caret.is(caption, 'end')) {
            e.preventDefault();
            return true;
        }
        else if (event.is('delete') && this._isItem(item) && caret.is(item, 'end')) {
            e.preventDefault();
            return true;
        }
        else if (event.is('backspace') && this._isItem(item) && caret.is(item, 'start')) {
            if (prev && prev.isEditable()) {
                e.preventDefault();
                this.app.block.set(prev, 'end');
                this._insertHtml(this.getPlainText());
                this.remove();

                return true;
            }
        }
    },
    handleArrow(e, key, event) {
        let next = this.getNext();
        if (!next && this.isCaretEnd() && event.is('down')) {
            e.preventDefault();
            let instance = this.app.block.create();
            this.insert({ instance: instance, position: 'after', caret: 'start', remove: false, type: 'input' });
            return true;
        }
    },
    handleEnter(e) {
        e.preventDefault();

        let insertion = this.app.create('insertion'),
            caret = this.app.create('caret'),
            selection = this.app.create('selection'),
            caption = this._getCaptionFromSelection(selection),
            caretStart = caret.is(caption, 'start'),
            caretEnd = caret.is(caption, 'end');

        // caption
        if (this._isCaption(caption)) {
            if (caretEnd) {
                e.preventDefault();
                let instance = this.app.block.create();
                this.insert({ instance: instance, position: 'after', caret: 'start', remove: false, type: 'input' });
                return true;
            }
            else if (caretStart) {
                return true;
            }
            // middle & cite
            else if (this.$quotecaption.get().tagName === 'CITE') {
                // insert br without split
                insertion.insertBreakline(false, false);
                return true;
            }

        }
        else {
            // insert br
            insertion.insertBreakline();
            return true;
        }
    },

    // private
    _isCaption(el) {
        return (el && this.$quotecaption && el === this.$quotecaption.get());
    },
    _isItem(el) {
        return (el && el === this.$quoteitem.get());
    },
    _getItemFromSelection(selection) {
        return selection.getBlock();
    },
    _getCaptionFromSelection(selection) {
        let block;
        if (this.$quotecaption && this.$quotecaption.get().tagName === 'CITE') {
            block = selection.getClosest('cite');
        }
        else {
            block = selection.getParent();
        }

        return block;
    },
    _parseItem() {
        this.$quoteitem = this.$block.find('p').first();
    },
    _parseCaption() {
        let $caption = (this.isFigure()) ? this.$block.find('figcaption') : this.$block.find('p').last(),
            $cite = $caption.find('cite');
        if ($cite.length !== 0) {
            $caption = $cite;
        }

        this.$quotecaption = ($caption.length !== 0) ? $caption : false;
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'table', {
    mixins: ['block'],
    nested: 'td, th',
    props: {
        type: 'table',
        focusable: true,
        inline: false,
        control: {
            'table': {
                position: { after: 'add' }
            }
        }
    },
    defaults: {
        head: { getter: 'getHead' },
        foot: { getter: 'getFoot' },
        items: { getter: 'getItems' }
    },
    create() {
        return this.dom(this.opts.get('table.template'));
    },
    build() {
        this._buildItems();
        this._buildNowrap();

        this.parseItems('tr', 'row');
        this.parseItems('td, th', 'cell');
        this.fillEmpty();
    },
    parse() {
        this._buildNowrap();

        this.parseItems('tr', 'row');
        this.parseItems('td, th', 'cell');
    },
    setCaret(point) {
        let $el = (point === 'start') ? this.getFirstBlock() : this.getLastBlock();

        this.app.block.set($el, point);
    },
    getFirstBlock() {
        return this.getFirstCell().children().first();
    },
    getFirstCell() {
        return this.$block.find('th, td').first();
    },
    getLastBlock() {
        return this.getLastCell().children().last();
    },
    getLastCell() {
        return this.$block.find('th, td').last();
    },
    getRows() {
        return this.$block.find('tr');
    },
    getCells() {
        return this.$block.find('th, td');
    },
    getHead() {
        let val = this.$block.find('thead');

        return (val.length === 0) ? null : true;
    },
    getFoot() {
        let val = this.$block.find('tfoot');

        return (val.length === 0) ? null : true;
    },
    getItems() {
        let items = [],
            row,
            $clone,
            $cells,
            blockTags = this.opts.get('tags.block'),
            $rows = this.$block.find('tr');

        $rows.each(function($node) {
            row = [];
            $cells = $node.find('th, td');
            $cells.each(function($cell) {
                $clone = $cell.clone();
                $clone = this.unparseInlineBlocks($clone);
                $clone.find(blockTags.join(',')).unwrap();
                row.push($clone.html().trim());
            }.bind(this));

            items.push(row);
        }.bind(this));


        return items;
    },

    fillEmpty() {
        let $cells = this.getCells();
        $cells.each(function($node) {
            let instance = $node.dataget('instance');
            if (instance.isEmpty()) {
                let emptyInstance = this.app.block.create();
                instance.getBlock().append(emptyInstance.getBlock());
            }
        }.bind(this));
    },

    // private
    _buildItems() {
        let items = this.data.get('items'),
            head = this.data.get('head'),
            foot = this.data.get('foot'),
            $head,
            $body,
            $foot,
            $row,
            $cell,
            text,
            content,
            item,
            tag,
            max = (items) ? items.length : 0,
            z = 0;

        if (items) {
            $head = this.dom('<thead>');
            $body = this.dom('<tbody>');
            $foot = this.dom('<tfoot>');

            for (item of items) {
                z++;
                $row = this.dom('<tr>');

                if (head && z === 1) {
                    tag = 'th';
                    $head.append($row);
                }
                else if (foot && z === max) {
                    tag = 'td';
                    $foot.append($row);
                }
                else {
                    tag = 'td';
                    $body.append($row);
                }

                for (content of item) {
                    $cell = this.dom('<' + tag + '>');
                    text = this.app.create('block.text', { table: true });
                    text.getBlock().html(content);

                    $cell.append(text.getBlock());
                    $row.append($cell);
                }
            }

            this.$block.html('');
            if (head) {
                this.$block.append($head);
            }

            // body
            this.$block.append($body);

            if (foot) {
                this.$block.append($foot);
            }
        }
    },
    _buildNowrap() {
        let nowrap = this.opts.get('table.nowrap');
        this.$block.find('th, td').filter('.' + nowrap).addClass('rx-nowrap');
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'cell', {
    mixins: ['block'],
    props: {
        type: 'cell',
        inline: false,
        focusable: true,
        reorder: false
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' },
        width: { getter: 'getWidth', setter: 'setWidth' },
        nowrap: { getter: 'getNowrap', setter: 'setNowrap' }
    },
    create() {
        return this.dom('<td>');
    },
    getTable() {
        return this.getClosest('table');
    },
    getRow() {
        return this.getClosest('row');
    },
    getNextCell() {
        let cell = this.getNext();
        if (!cell) {
            let row = this.getClosest('row');
            if (row) {
                let nextRow = row.getNextRow();
                if (nextRow) {
                    cell = nextRow.getFirst('cell');
                }
            }
        }

        return cell;
    },
    getPrevCell() {
        let cell = this.getPrev();
        if (!cell) {
            let row = this.getClosest('row');
            if (row) {
                let prevRow = row.getPrevRow();
                if (prevRow) {
                    cell = prevRow.getLast('cell');
                }
            }
        }

        return cell;
    },
    getFirstElement() {
        return this.$block.find('[data-rx-type]').first();
    },
    getWidth() {
        let value = this.$block.attr('width');

        return (value) ? value : '';
    },
    getNowrap() {
        return this.$block.hasClass('rx-nowrap');
    },
    setWidth(value) {
        this._eachCell(function($cell) {
            if (value === '') {
                $cell.removeAttr('width');
            }
            else {
                value = (value.search('%') !== -1) ? value : value.replace('px', '');
                $cell.attr('width', value);
            }
        });
    },
    setNowrap(value) {
        this._eachCell(function($cell) {
            let classes = this.opts.get('table.nowrap') + ' rx-nowrap';
            if (value) {
                $cell.addClass(classes);
            }
            else {
                $cell.removeClass(classes);
            }
        }.bind(this));
    },
    setCaret(point) {
        let caret = this.app.create('caret');
        caret.set(this.getFirstElement(), point);
    },
    isLastElement() {
        let table = this.getParent(),
            $last = table.getBlock().find('th, td').last();

        return (this.$block.get() === $last.get());
    },
    handleTab(e) {
        e.preventDefault();

        var next = this.getNextCell();
        if (next) {
            this.app.block.set(next, 'start');
        }
        else {
            next = this.getClosest('table').getNext();
            if (next) {
                this.app.block.set(next, 'start');
            }
        }

        return true;
    },

    // private
    _eachCell(func) {
        let index = 0;
        let $table = this.$block.closest('table');

        // index
        this.$block.closest('tr').find('td, th').each(function($node, i) {
            if ($node.get() === this.$block.get()) index = i;
        }.bind(this));

        $table.find('tr').each(function($node) {
            let cell = $node.find('td, th').get(index);
            let $cell = this.dom(cell);
            func($cell);

        }.bind(this));
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'row', {
    mixins: ['block'],
    props: {
        type: 'row',
        inline: false,
        focusable: true,
        control: false
    },
    create() {
        return this.dom('<tr>');
    },
    getTable() {
        return this.getClosest('table');
    },
    getFirstElement() {
        return this.$block.find('td, th').first().find('[data-rx-type]').first();
    },
    getLastElement() {
        return this.$block.find('td, th').last().find('[data-rx-type]').first();
    },
    getNextRow() {
        let row = this.getNext();
        let $parent = this.$block.parent();
        if (!row && $parent.get().tagName !== 'TABLE') {
            row = $parent.nextElement().find('tr').first().dataget('instance');
        }

        return row;
    },
    getPrevRow() {
        let row = this.getPrev();
        let $parent = this.$block.parent();
        if (!row && $parent.get().tagName !== 'TABLE') {
            row = $parent.prevElement().find('tr').last().dataget('instance');
        }

        return row;
    },
    setCaret(point) {
        let caret = this.app.create('caret');
        caret.set(this.getFirstElement(), point);
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'text', {
    mixins: ['block'],
    props: {
        type: 'text',
        editable: true,
        inline: false,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' }
    },
    create() {
        if (this.params.table) {
            return this.dom('<div data-rx-tag="tbr">');
        }
        else {
            return (this.opts.is('breakline')) ? this.dom('<div data-rx-tag="br">') : this.dom('<' + this.opts.get('markup') + '>');
        }
    },

    // handle
    handleEnter(e) {
        e.preventDefault();

        let clone,
            elm = this.app.create('element'),
            $block,
            $part;

        // empty or end
        if (this.isEmpty() || this.isCaretEnd()) {
            if (this.$block.attr('data-rx-tag') === 'tbr') {
                clone = this.app.create('block.text', { table: true });
            }
            else {
                clone = this.app.block.create();
            }

            // clone paragraph styles
            if (!this.opts.is('clean.enter')) {
                clone = this.duplicateEmpty();

                // remove id attr
                clone.getBlock().removeAttr('id');
            }

            if (!this.opts.is('clean.enterinline')) {
                clone = this._cloneInline(clone);
            }

            this.insert({ instance: clone, position: 'after', caret: 'start', remove: false, type: 'input' });
        }
        // start
        else if (this.isCaretStart()) {
            clone = this.duplicate();
            clone.getBlock().html('');

            this.insert({ instance: clone, position: 'before', type: 'input' });
        }
        // middle
        else {
            $block = this.getBlock();
            $part = elm.split($block);
            this.app.block.set($part, 'start');
        }

        return true;
    },

    // =private
    _cloneInline(clone) {
        // clone inline
        let selection = this.app.create('selection'),
            elm = this.app.create('element'),
            inline = selection.getInline(),
            cloned,
            inlines,
            clonedInline;

        if (inline) {
            inlines = elm.getAllInlines(inline);
            for (let i = 0; i < inlines.length; i++) {
                if (inlines[i].tagName === 'A') {
                    continue;
                }
                if (i === 0) {
                    cloned = inlines[i].cloneNode();
                    cloned.removeAttribute('id');
                    cloned.innerHTML = '';
                }
                else {
                    clonedInline = inlines[i].cloneNode();
                    clonedInline.removeAttribute('id');
                    clonedInline.innerHTML = '';
                    cloned.appendChild(clonedInline);
                }
            }

            if (cloned) {
                clone = this.app.block.create(cloned.outerHTML);
            }
        }

        return clone;
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'todo', {
    mixins: ['block'],
    props: {
        type: 'todo',
        focusable: true,
        inline: false,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        items: { getter: 'getItems' }
    },
    create() {
        let $el = this.dom('<ul>'),
            item = this.app.create('block.todoitem');

        $el.append(item.getBlock());

        return $el;
    },
    parse() {
        this.parseItems('li', 'todoitem');
    },
    build() {
        this._buildItems();
        this.parseItems('li', 'todoitem');
    },
    setCaret(point) {
        let $el = (point === 'start') ? this.getFirstItem() : this.getLastItem();
        this.app.block.set($el, point);
    },
    getItems() {
        let $items = this.$block.children(),
            instance,
            items = [];

        $items.each(function($node) {
            instance = $node.dataget('instance');
            items.push({
                'content': instance.getContent(),
                'checked': instance.getChecked()
            });
        });

        return items;
    },
    getFirstItem() {
        return this.$block.children().first();
    },
    getFirstItemInstance() {
        return this.getFirstItem().dataget('instance');
    },
    getFirstContent() {
        return this.getFirstItem().find('div').first();
    },
    getLastItem() {
        return this.$block.children().last();
    },
    getLastItemInstance() {
        return this.getLastItem().dataget('instance');
    },
    getLastContent() {
        return this.getLastItem().find('div').last();
    },

    // private
    _buildItems() {
        let items = this.data.get('items'),
            item,
            instance,
            $item;

        if (items) {
            this.$block.html('');

            for (item of items) {
                instance = this.app.create('block.todoitem', item);
                $item = instance.getBlock();
                this.$block.append($item);
            }
        }
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'todoitem', {
    mixins: ['block'],
    props: {
        type: 'todoitem',
        inline: false,
        editable: true,
        control: {
            'format': {
                position: { after: 'add', first: true }
            }
        }
    },
    defaults: {
        content: { setter: 'setContent', getter: 'getContent' },
        checked:  { setter: 'setChecked', getter: 'getChecked' }
    },
    create() {
        return this.dom('<li>');
    },
    parse() {
        this._parse();
    },
    build() {
        this.$block.html(this.opts.get('todo.templateItem'));
        this._parse();
    },
    setCaret(point) {
        let caret = this.app.create('caret');
        caret.set(this.$content, point);
    },
    isFirstElement() {
        return (this.$block.prevElement().length === 0);
    },
    isLastElement() {
        return (this.$block.nextElement().length === 0);
    },
    isListEnd() {
        return this.getParent().isCaretEnd();
    },
    getContentItem() {
        return this.$content;
    },
    getParent() {
        return this.$block.parent().closest(this._buildTraverseSelector('todo')).dataget('instance');
    },
    getContent() {
        let $clone = this.$content.clone();
        $clone = this.unparseInlineBlocks($clone);

        return $clone.html().trim();
    },
    getChecked() {
        let val = this.$block.attr('data-checked');

        return (val === '1');
    },
    setContent(content) {
        this.$content.html(content);
    },
    setChecked(value) {
        this.$input.attr('checked', value);
        this.$block.attr('data-checked', (value) ? '1' : '0');
    },
    setPlaceholder(value) {
        this.$content.attr('data-placeholder', value);
    },
    setEmpty() {
        this.$content.html('');
    },

    // handle
    handleArrow(e, key, event) {
        if (event.is('left') && this.isCaretStart() || event.is('up')) {
            return this._traversePrev(e);
        }
        else if (event.is('right') && this.isCaretEnd() || event.is('down')) {
            return this._traverseNext(e);
        }
    },
    handleDelete(e, key, event) {
        let next = this.getNext(),
            prev = this.getPrev(),
            parent = this.getParent(),
            content,
            $blocks;

        if (event.is('delete') && this.isCaretEnd() && next && next.isType('todoitem')) {
            e.preventDefault();

            // insert
            content = next.getPlainText();
            next.remove();
            this._insertHtml(content, false);
            return true;
        }
        else if (event.is('backspace') && this.isCaretStart() && prev && prev.isType('todoitem')) {
            e.preventDefault();

            // insert
            content = this.getPlainText();
            this.remove();
            this.app.block.set(prev, 'end');
            this._insertHtml(content, false);

            return true;
        }
        else if (event.is('delete') && this.isCaretEnd() && this.isLastElement()) {
            next = this.getNextParent();

            if (next) {
                e.preventDefault();
                if (next.isType('quote')) {
                    let html = next.getBlock().text();
                    this._insertHtml(html, false);
                    next.remove();
                }
                else if (next.isEditable()) {
                    let html = next.getHtml();
                    this._insertHtml(html, false);
                    next.remove();
                }
                else if (next.isType('todo')) {
                    $blocks = next.getBlock().children();
                    parent.getBlock().append($blocks);
                    next.remove();
                }
                else if (next.isType('list')) {
                    let $item = next.getBlock().children().first();
                    let html = $item.html();
                    $item.remove();
                    this._insertHtml(html, false);
                    if (next.isEmpty()) {
                        next.remove();
                    }
                }
                else {
                    this.app.block.set(next, 'start');
                }

                return true;
            }
        }
        else if (event.is('backspace') && this.isCaretStart() && this.isFirstElement()) {
            next = this.getPrevParent();

            if (next) {
                e.preventDefault();

                if (next.isEditable()) {
                    let html = this.getContent();
                    this.app.block.set(next, 'end');
                    this._insertHtml(html);
                    this.remove();
                    if (parent.isEmpty()) {
                        parent.remove();
                    }
                }
                else if (next.isType('todo')) {
                    $blocks = parent.getBlock().children();
                    next.getBlock().append($blocks);
                    this.app.block.set($blocks.first(), 'start', true);
                    parent.remove();
                }
                else if (next.isType('list')) {
                    let html = this.getContent();
                    let $item = next.getLastItem();
                    this.app.block.set($item , 'end');
                    this._insertHtml(html);
                    this.remove();
                    if (parent.isEmpty()) {
                        parent.remove();
                    }
                }
                else {
                    this.app.block.set(next, 'start');
                }
                return true;
            }
        }
    },
    handleTab(e) {
        return this._traverseNext(e);
    },
    handleEnter(e) {
        e.preventDefault();

        let instance,
            elm = this.app.create('element'),
            selection = this.app.create('selection'),
            $part;

        // empty or end
        if (this.isEmpty() || this.isCaretEnd()) {

            let item = selection.getDataBlock();
            let prev = (item) ? this.dom(item).dataget('instance') : false;
            if (prev && this.isListEnd() && prev.isEmpty()) {
                this.getParent().insertEmpty({ position: 'after', caret: 'start', type: 'input' });
                prev.remove();
                return true;
            }

            instance = this._createItem();
            this.app.block.set(instance, 'start');
        }
        // start
        else if (this.isCaretStart()) {
            instance = this._createItem('before');
            this.app.block.set(instance, 'start');
        }
        // middle
        else {
            $part = elm.split(this.$content);
            instance = this._createItem();
            instance.setContent($part.html());
            $part.remove();
            this.app.block.set(instance, 'start');

        }

        return true;
    },

    // private
    _traversePrev(e) {
        e.preventDefault();
        let parent = (this.isFirstElement()) ? this.getParent() : this;
        let next = parent.getPrev();
        if (next) {
            e.preventDefault();
            this.app.block.set(next, 'end');
            return;
        }
        else {
            next = parent.getPrevParent();
            if (next) {
                e.preventDefault();
                this.app.block.set(next, 'end');
                return;
            }
        }

        return true;
    },
    _traverseNext(e) {
        e.preventDefault();
        let parent = (this.isLastElement()) ? this.getParent() : this;
        let next = parent.getNext();
        if (next) {
            e.preventDefault();
            this.app.block.set(next, 'start');
            return;
        }
        else {
            next = parent.getNextParent();
            if (next) {
                e.preventDefault();
                this.app.block.set(next, 'start');
                return;
            }
        }

        return true;

    },
    _createItem(position) {
        let instance = this.app.create('block.todoitem');

        position = (position) ? position : 'after';

        this.$block[position](instance.getBlock());

        return instance;
    },
    _parse() {
        let html = this.$block.html(),
            ph = this.$block.attr('data-placeholder'),
            item = this.opts.get('todo.templateItem'),
            itemDone = this.opts.get('todo.templateItemDone'),
            $input = this.$block.find('input'),
            $content = this.$block.find('div');

        this.$input = ($input.length !== 0) ? $input : this.dom(this.opts.get('todo.templateInput'));
        this.$input.attr('tabindex', '-1');

        this.$content = ($content.length !== 0) ? $content : this.dom(this.opts.get('todo.templateContent'));
        this.$content.attr('contenteditable', true);


        if (ph) {
            this.setPlaceholder(ph);
        }

        if (html.startsWith(itemDone)) {
            html = html.replace(itemDone, '');
            this.$input.attr('checked', true);
            this.$block.attr('data-checked', '1');
        }
        else if (html.startsWith(item)) {
            html = html.replace(item, '');
            this.$input.attr('checked', false);
            this.$block.attr('data-checked', '0');
        }

        if ($input.length === 0 && $content.length === 0) {
            html = html.trim();
            this.$content.html(html);
            this.$block.html('');
        }

        if ($input.length === 0) {
            this.$block.append(this.$input);
        }

        if ($content.length === 0) {
            this.$block.append(this.$content);
        }

        this.$input.on('click.rx-todo', this._clickInput.bind(this));
    },
    _clickInput(e) {
        let val = (this.$input.attr('checked')) ? '1' : '0';

        this.$block.attr('data-checked', val);
    }
});
/*jshint esversion: 6 */
Redactor.add('block', 'mergetag', {
    mixins: ['block'],
    props: {
        type: 'mergetag',
        editable: false,
        control: false,
        inline: true,
        context: true
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' }
    },
    create() {
        return this.dom('<span>').attr(this.opts.get('dataBlock'), 'mergetag');
    }
});

    window.Redactor = Redactor;

    // Data attribute load
    window.addEventListener('load', function() {
        Redactor('[data-redactor]');
    });

    // Export for webpack
    if (typeof module === 'object' && module.exports) {
        module.exports = Redactor;
        module.exports.Redactor = Redactor;
    }
}());