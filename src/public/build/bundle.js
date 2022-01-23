
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var $schema = [
    	"en-us",
    	"en-gb",
    	"explanation"
    ];
    var words = [
    	[
    		"acronym",
    		"initialism",
    		"acronyms are pronounced as words (e.g. NATO); initialisms consist of initial letters pronounced separately (e.g. BBC)"
    	],
    	[
    		"adapter",
    		"adaptor",
    		""
    	],
    	[
    		"adrenalin",
    		"adrenaline",
    		""
    	],
    	[
    		"agenda",
    		"agendum",
    		"'agendum' is the singular form; 'agenda' is the plural"
    	],
    	[
    		"airplane",
    		"aeroplane",
    		""
    	],
    	[
    		"already",
    		"",
    		"some en-us speakers nonsensically add 'already' to the end of sentences => remove"
    	],
    	[
    		"aluminum",
    		"aluminium",
    		"en_US usage is based on the brand Aluminum, en_GB based on the element"
    	],
    	[
    		"analog",
    		"analogue",
    		""
    	],
    	[
    		"analyze",
    		"analyse",
    		""
    	],
    	[
    		"analyzed",
    		"analysed",
    		""
    	],
    	[
    		"analyzer",
    		"analyser",
    		""
    	],
    	[
    		"analyzing",
    		"analysing",
    		""
    	],
    	[
    		"anchor",
    		"newsreader",
    		"someone who reads the news on television/radio"
    	],
    	[
    		"anemia",
    		"anaemia",
    		""
    	],
    	[
    		"anesthesia",
    		"anaesthesia",
    		""
    	],
    	[
    		"anesthesiologist",
    		"anaesthetist",
    		""
    	],
    	[
    		"anesthetic",
    		"anaesthetic",
    		""
    	],
    	[
    		"annex",
    		"annexe",
    		"verb: 'annex'; noun: 'annexe'"
    	],
    	[
    		"antennas",
    		"antennae",
    		""
    	],
    	[
    		"antialiased",
    		"anti-aliased",
    		""
    	],
    	[
    		"antialiasing",
    		"anti-aliasing",
    		""
    	],
    	[
    		"anymore",
    		"any more",
    		""
    	],
    	[
    		"appall",
    		"appal",
    		""
    	],
    	[
    		"archeology",
    		"archaeology",
    		""
    	],
    	[
    		"armor",
    		"armour",
    		""
    	],
    	[
    		"ass",
    		"arse",
    		"'ass' means 'donkey'; 'arse' is a vulgar word for the buttocks"
    	],
    	[
    		"artifact",
    		"artefact",
    		""
    	],
    	[
    		"authorization",
    		"authorisation",
    		""
    	],
    	[
    		"authorizational",
    		"authorisational",
    		""
    	],
    	[
    		"authorize",
    		"authorise",
    		""
    	],
    	[
    		"authorized",
    		"authorised",
    		""
    	],
    	[
    		"authorizing",
    		"authorising",
    		""
    	],
    	[
    		"automobile",
    		"motorcar",
    		""
    	],
    	[
    		"ax",
    		"axe",
    		""
    	],
    	[
    		"backward",
    		"backwards",
    		"use 'backward' only as an adjective"
    	],
    	[
    		"balk",
    		"baulk",
    		""
    	],
    	[
    		"barnyard",
    		"farmyard",
    		""
    	],
    	[
    		"basicly",
    		"basically",
    		""
    	],
    	[
    		"bathroom",
    		"toilet",
    		"when referring to a WC, not a room with a bath"
    	],
    	[
    		"beet",
    		"beetroot",
    		""
    	],
    	[
    		"behavior",
    		"behaviour",
    		""
    	],
    	[
    		"behoove",
    		"behove",
    		""
    	],
    	[
    		"bill",
    		"note",
    		"\"a £100 note\""
    	],
    	[
    		"binder clip",
    		"bulldog clip",
    		""
    	],
    	[
    		"bobsled",
    		"bobsleigh",
    		""
    	],
    	[
    		"boogey",
    		"bogey",
    		""
    	],
    	[
    		"brace",
    		"curly bracket",
    		""
    	],
    	[
    		"braces",
    		"curly brackets",
    		"'braces' could mean a type of orthodontic treatment"
    	],
    	[
    		"braked",
    		"broke",
    		""
    	],
    	[
    		"broil",
    		"grill",
    		""
    	],
    	[
    		"buddy",
    		"mate",
    		""
    	],
    	[
    		"bullhorn",
    		"megaphone",
    		""
    	],
    	[
    		"burned",
    		"burnt",
    		""
    	],
    	[
    		"bum",
    		"tramp",
    		"'bum' can also mean 'buttocks'"
    	],
    	[
    		"cafe",
    		"café",
    		""
    	],
    	[
    		"caliber",
    		"calibre",
    		""
    	],
    	[
    		"canceled",
    		"cancelled",
    		""
    	],
    	[
    		"canceling",
    		"cancelling",
    		""
    	],
    	[
    		"candy",
    		"sweet",
    		""
    	],
    	[
    		"candy bar",
    		"chocolate bar",
    		""
    	],
    	[
    		"canned",
    		"tinned",
    		""
    	],
    	[
    		"capitalization",
    		"capitalisation",
    		""
    	],
    	[
    		"capitalize",
    		"capitalise",
    		""
    	],
    	[
    		"capitalized",
    		"capitalised",
    		""
    	],
    	[
    		"capitalizing",
    		"capitalising",
    		""
    	],
    	[
    		"carburetor",
    		"carburettor",
    		""
    	],
    	[
    		"cart",
    		"trolley",
    		"\"a shopping trolley\""
    	],
    	[
    		"case insensitive",
    		"case-insensitive",
    		""
    	],
    	[
    		"case sensitive",
    		"case-sensitive",
    		""
    	],
    	[
    		"caster",
    		"castor",
    		""
    	],
    	[
    		"catalog",
    		"catalogue",
    		""
    	],
    	[
    		"categorization",
    		"categorisation",
    		""
    	],
    	[
    		"categorize",
    		"categorise",
    		""
    	],
    	[
    		"categorized",
    		"categorised",
    		""
    	],
    	[
    		"categorizing",
    		"categorising",
    		""
    	],
    	[
    		"CCW",
    		"ACW",
    		"CCW as in Counter-clockwise"
    	],
    	[
    		"chapstick",
    		"lip balm",
    		""
    	],
    	[
    		"centimeter",
    		"centimetre",
    		""
    	],
    	[
    		"center",
    		"centre",
    		""
    	],
    	[
    		"centered",
    		"centred",
    		""
    	],
    	[
    		"centering",
    		"centring",
    		""
    	],
    	[
    		"centralization",
    		"centralisation",
    		""
    	],
    	[
    		"centralize",
    		"centralise",
    		""
    	],
    	[
    		"centralized",
    		"centralised",
    		""
    	],
    	[
    		"centralizing",
    		"centralising",
    		""
    	],
    	[
    		"cesium",
    		"caesium",
    		""
    	],
    	[
    		"check",
    		"cheque",
    		"\"a bank cheque\""
    	],
    	[
    		"check",
    		"tick",
    		"tick the box"
    	],
    	[
    		"checkbox",
    		"tickbox",
    		""
    	],
    	[
    		"checked",
    		"chequered",
    		"\"a game of chequers\", \"a chequered floor\""
    	],
    	[
    		"checked",
    		"ticked",
    		"\"the box is ticked\""
    	],
    	[
    		"checker",
    		"chequer",
    		""
    	],
    	[
    		"checkerboard",
    		"chequerboard",
    		""
    	],
    	[
    		"checkered",
    		"chequered",
    		""
    	],
    	[
    		"chips",
    		"crisps",
    		""
    	],
    	[
    		"cipher",
    		"cypher",
    		""
    	],
    	[
    		"coffee shop",
    		"café",
    		""
    	],
    	[
    		"cold",
    		"neutral",
    		"the connection in an electrical circuit that returns current to the source"
    	],
    	[
    		"color",
    		"colour",
    		""
    	],
    	[
    		"colored",
    		"coloured",
    		""
    	],
    	[
    		"colorer",
    		"colourer",
    		""
    	],
    	[
    		"colorful",
    		"colourful",
    		""
    	],
    	[
    		"coloring",
    		"colouring",
    		""
    	],
    	[
    		"colorkey",
    		"colour-key",
    		""
    	],
    	[
    		"colorspace",
    		"colour-space",
    		""
    	],
    	[
    		"congress",
    		"parliament",
    		""
    	],
    	[
    		"congressman",
    		"Member of Parliament, MP",
    		""
    	],
    	[
    		"cookie",
    		"biscuit",
    		"could refer to a web/internet cookie"
    	],
    	[
    		"cooperate",
    		"co-operate",
    		""
    	],
    	[
    		"coordinate",
    		"co-ordinate",
    		""
    	],
    	[
    		"corn",
    		"maize",
    		""
    	],
    	[
    		"cornsilk",
    		"maize silk",
    		""
    	],
    	[
    		"cotton candy",
    		"candy floss",
    		""
    	],
    	[
    		"counterclockwise",
    		"anti-clockwise",
    		""
    	],
    	[
    		"counter-clockwise",
    		"anti-clockwise",
    		""
    	],
    	[
    		"coupe",
    		"coupé",
    		""
    	],
    	[
    		"coveralls",
    		"overalls",
    		""
    	],
    	[
    		"cozy",
    		"cosy",
    		""
    	],
    	[
    		"curb",
    		"kerb",
    		"a kerb is the edge of the pavement, to curb is to limit something"
    	],
    	[
    		"curriculums",
    		"curricula",
    		""
    	],
    	[
    		"customizable",
    		"customisable",
    		""
    	],
    	[
    		"customization",
    		"customisation",
    		""
    	],
    	[
    		"customize",
    		"customise",
    		""
    	],
    	[
    		"customized",
    		"customised",
    		""
    	],
    	[
    		"customizing",
    		"customising",
    		""
    	],
    	[
    		"dealed",
    		"dealt",
    		""
    	],
    	[
    		"defense",
    		"defence",
    		""
    	],
    	[
    		"delete",
    		"Permanently Delete",
    		"make this change if a Delete action will bypass the Rubbish Bin (Trash)"
    	],
    	[
    		"dialed",
    		"dialled",
    		""
    	],
    	[
    		"dialer",
    		"dialler",
    		""
    	],
    	[
    		"dialing",
    		"dialling",
    		""
    	],
    	[
    		"dialog",
    		"dialogue",
    		""
    	],
    	[
    		"diaper",
    		"nappy",
    		""
    	],
    	[
    		"diarrhea",
    		"diarrhoea",
    		""
    	],
    	[
    		"digitization",
    		"digitisation",
    		""
    	],
    	[
    		"digitize",
    		"digitise",
    		""
    	],
    	[
    		"digitized",
    		"digitised",
    		""
    	],
    	[
    		"digitizer",
    		"digitiser",
    		""
    	],
    	[
    		"digitizing",
    		"digitising",
    		""
    	],
    	[
    		"dishrag",
    		"dish cloth",
    		""
    	],
    	[
    		"dishtowel",
    		"tea towel",
    		""
    	],
    	[
    		"disk",
    		"disc",
    		"If describing a round object (e.g. a CD or DVD), use 'disc'. Otherwise, use 'disk'."
    	],
    	[
    		"disorganized",
    		"disorganised",
    		""
    	],
    	[
    		"distill",
    		"distil",
    		""
    	],
    	[
    		"donut",
    		"doughnut",
    		""
    	],
    	[
    		"downspout",
    		"drainpipe",
    		""
    	],
    	[
    		"downward",
    		"downwards",
    		"use 'downward' only as an adjective"
    	],
    	[
    		"Dr.",
    		"Dr",
    		"Only use a full stop if the final letter of the abbreviation is not the final letter of the word it is abbreviating. So, 'Doctor' = 'Dr' but 'Drive' = 'Dr.'"
    	],
    	[
    		"draft",
    		"draught",
    		""
    	],
    	[
    		"dreamed",
    		"dreamt",
    		""
    	],
    	[
    		"drugstore",
    		"pharmacy",
    		""
    	],
    	[
    		"dumpster",
    		"skip",
    		""
    	],
    	[
    		"eastward",
    		"eastwards",
    		"use 'eastward' only as an adjective"
    	],
    	[
    		"eggplant",
    		"aubergine",
    		""
    	],
    	[
    		"e-mails",
    		"e-mail",
    		""
    	],
    	[
    		"email",
    		"e-mail",
    		"The e in e-mail is pronounced as a distinct letter rather than as part of the following word. If it were the latter, the pronunciation would be merged with the following letter, in this case the letter m. The first syllable is pronounced ee, not em."
    	],
    	[
    		"emails",
    		"e-mail",
    		""
    	],
    	[
    		"encyclopedia",
    		"encyclopaedia",
    		""
    	],
    	[
    		"endeavor",
    		"endeavour",
    		""
    	],
    	[
    		"England",
    		"Britain",
    		"a common mistake amongst some Americans is to refer to the whole island as 'England'"
    	],
    	[
    		"English",
    		"British",
    		"a common mistake amongst some Americans is to refer to the whole island as 'England'"
    	],
    	[
    		"English",
    		"Imperial",
    		"Americans often refer to imperial system of measurements as 'English'"
    	],
    	[
    		"enology",
    		"oenology",
    		""
    	],
    	[
    		"equaled",
    		"equalled",
    		""
    	],
    	[
    		"equaling",
    		"equalling",
    		""
    	],
    	[
    		"equalize",
    		"equalise",
    		""
    	],
    	[
    		"equalized",
    		"equalised",
    		""
    	],
    	[
    		"equalizer",
    		"equaliser",
    		""
    	],
    	[
    		"equalizing",
    		"equalising",
    		""
    	],
    	[
    		"esophagus",
    		"oesophagus",
    		""
    	],
    	[
    		"esthetics",
    		"aesthetics",
    		""
    	],
    	[
    		"estrogen",
    		"oestrogen",
    		""
    	],
    	[
    		"expressway",
    		"motorway",
    		""
    	],
    	[
    		"fag",
    		"homosexual",
    		"'fag' means 'cigarette' in en-GB"
    	],
    	[
    		"fall",
    		"autumn",
    		""
    	],
    	[
    		"familiarization",
    		"familiarisation",
    		""
    	],
    	[
    		"familiarize",
    		"familiarise",
    		""
    	],
    	[
    		"familiarized",
    		"familiarised",
    		""
    	],
    	[
    		"familiarizing",
    		"familiarising",
    		""
    	],
    	[
    		"fanny",
    		"buttocks",
    		"'fanny' is a vulgar word"
    	],
    	[
    		"fanny pack",
    		"bum bag",
    		""
    	],
    	[
    		"faucet",
    		"tap",
    		""
    	],
    	[
    		"favor",
    		"favour",
    		""
    	],
    	[
    		"favored",
    		"favoured",
    		""
    	],
    	[
    		"favoring",
    		"favouring",
    		""
    	],
    	[
    		"favorite",
    		"favourite",
    		""
    	],
    	[
    		"fetus",
    		"foetus",
    		""
    	],
    	[
    		"fiber",
    		"fibre",
    		""
    	],
    	[
    		"filet",
    		"fillet",
    		""
    	],
    	[
    		"fill out",
    		"fill in",
    		""
    	],
    	[
    		"flashlight",
    		"torch",
    		""
    	],
    	[
    		"flatware",
    		"cutlery",
    		""
    	],
    	[
    		"flavor",
    		"flavour",
    		""
    	],
    	[
    		"flavored",
    		"flavoured",
    		""
    	],
    	[
    		"flavoring",
    		"flavouring",
    		""
    	],
    	[
    		"forever",
    		"for ever",
    		"In en_GB, 'for ever' means for eternity (or a very long time), as in \"I have been waiting for you for ever.\" 'Forever' means continually, always, as in \"They are forever arguing.\""
    	],
    	[
    		"formulas",
    		"formulae",
    		""
    	],
    	[
    		"forums",
    		"fora",
    		""
    	],
    	[
    		"forward",
    		"forwards",
    		"use 'forward' only as an adjective"
    	],
    	[
    		"forward slash",
    		"slash",
    		"redundant: a slash is 'forward' by definition"
    	],
    	[
    		"fourth",
    		"quarter",
    		"fourths are quarters"
    	],
    	[
    		"freeway",
    		"motorway",
    		""
    	],
    	[
    		"french fries",
    		"hot chips",
    		""
    	],
    	[
    		"freshman",
    		"fresher",
    		""
    	],
    	[
    		"fries",
    		"chips",
    		"French fries"
    	],
    	[
    		"fueled",
    		"fuelled",
    		""
    	],
    	[
    		"fueling",
    		"fuelling",
    		""
    	],
    	[
    		"furor",
    		"furore",
    		""
    	],
    	[
    		"garbage",
    		"rubbish",
    		""
    	],
    	[
    		"gas",
    		"petrol",
    		"a commonly-used (and imprecise) abbreviation for 'gasoline' is 'gas'"
    	],
    	[
    		"gasoline",
    		"petrol",
    		""
    	],
    	[
    		"globalization",
    		"globalisation",
    		""
    	],
    	[
    		"globalizational",
    		"globalisational",
    		""
    	],
    	[
    		"globalize",
    		"globalise",
    		""
    	],
    	[
    		"globalized",
    		"globalised",
    		""
    	],
    	[
    		"globalizing",
    		"globalising",
    		""
    	],
    	[
    		"globaly",
    		"globally",
    		""
    	],
    	[
    		"glycerin",
    		"glycerine",
    		""
    	],
    	[
    		"goiter",
    		"goitre",
    		""
    	],
    	[
    		"gotten",
    		"got",
    		"Use 'got' unless using the humorously-intended phrase 'ill-gotten'."
    	],
    	[
    		"gray",
    		"grey",
    		""
    	],
    	[
    		"graylist",
    		"greylist",
    		""
    	],
    	[
    		"graylisted",
    		"greylisted",
    		""
    	],
    	[
    		"graylisting",
    		"greylisting",
    		""
    	],
    	[
    		"ground",
    		"earth",
    		"The term 'ground' and 'grounding' are used in US electrical engineering to represent electrical equipment that is securely bonded to the ground (i.e. that on which we stand) for safety reasons. In the UK the equivalent terms are 'earth' and 'earthing'."
    	],
    	[
    		"grounded",
    		"earthed",
    		"The term 'ground' and 'grounding' are used in US electrical engineering to represent electrical equipment that is securely bonded to the ground (i.e. that on which we stand) for safety reasons. In the UK the equivalent terms are 'earth' and 'earthing'."
    	],
    	[
    		"grounding",
    		"earthing",
    		"The term 'ground' and 'grounding' are used in US electrical engineering to represent electrical equipment that is securely bonded to the ground (i.e. that on which we stand) for safety reasons. In the UK the equivalent terms are 'earth' and 'earthing'."
    	],
    	[
    		"guerilla",
    		"guerrilla",
    		""
    	],
    	[
    		"gynecology",
    		"gynaecology",
    		""
    	],
    	[
    		"hanged",
    		"hung",
    		""
    	],
    	[
    		"harbor",
    		"harbour",
    		""
    	],
    	[
    		"harbored",
    		"harboured",
    		""
    	],
    	[
    		"harboring",
    		"harbouring",
    		""
    	],
    	[
    		"hemophilia",
    		"haemophilia",
    		""
    	],
    	[
    		"hemophiliac",
    		"haemophiliac",
    		""
    	],
    	[
    		"hauler",
    		"haulier",
    		""
    	],
    	[
    		"hobo",
    		"homeless person",
    		""
    	],
    	[
    		"homeopathic",
    		"homoeopathic",
    		""
    	],
    	[
    		"homeopathy",
    		"homoeopathy",
    		""
    	],
    	[
    		"honor",
    		"honour",
    		""
    	],
    	[
    		"honored",
    		"honoured",
    		""
    	],
    	[
    		"honoring",
    		"honouring",
    		""
    	],
    	[
    		"hood",
    		"bonnet",
    		"The lid of the engine compartment of a car."
    	],
    	[
    		"hot",
    		"live, active",
    		"Phase ('active') electrical connection"
    	],
    	[
    		"humor",
    		"humour",
    		""
    	],
    	[
    		"humored",
    		"humoured",
    		""
    	],
    	[
    		"humoring",
    		"humouring",
    		""
    	],
    	[
    		"infeasible",
    		"unfeasible",
    		""
    	],
    	[
    		"initialization",
    		"initialisation",
    		""
    	],
    	[
    		"initializational",
    		"initialisational",
    		""
    	],
    	[
    		"initialize",
    		"initialise",
    		""
    	],
    	[
    		"initialized",
    		"initialised",
    		""
    	],
    	[
    		"initializer",
    		"initialiser",
    		""
    	],
    	[
    		"initializing",
    		"initialising",
    		""
    	],
    	[
    		"inquire",
    		"enquire",
    		"enquire is to be used for general senses of 'ask', while inquire is reserved for uses meaning 'make a formal investigation'."
    	],
    	[
    		"inquiry",
    		"enquiry",
    		"enquire is to be used for general senses of 'ask', while inquire is reserved for uses meaning 'make a formal investigation'."
    	],
    	[
    		"insure",
    		"ensure",
    		"use 'ensure' unless talking about insurance"
    	],
    	[
    		"internet",
    		"Internet",
    		"internet with a small i refers to an internetwork, a connection of two or more distinct computer networks. The Internet with a capital I is the largest such internetwork."
    	],
    	[
    		"internationalization",
    		"internationalisation",
    		""
    	],
    	[
    		"internationalizational",
    		"internationalisational",
    		""
    	],
    	[
    		"internationalize",
    		"internationalise",
    		""
    	],
    	[
    		"internationalized",
    		"internationalised",
    		""
    	],
    	[
    		"internationalizing",
    		"internationalising",
    		""
    	],
    	[
    		"jail",
    		"gaol",
    		""
    	],
    	[
    		"jello",
    		"jelly",
    		""
    	],
    	[
    		"jell-o",
    		"jelly",
    		""
    	],
    	[
    		"jelly",
    		"jam",
    		"in en_US, 'jelly' can mean 'jam'"
    	],
    	[
    		"jeweled",
    		"jewelled",
    		""
    	],
    	[
    		"jeweler",
    		"jeweller",
    		""
    	],
    	[
    		"jewelery",
    		"jewellery",
    		""
    	],
    	[
    		"journaling",
    		"journalling",
    		""
    	],
    	[
    		"judgment",
    		"judgement",
    		""
    	],
    	[
    		"kilometer",
    		"kilometre",
    		""
    	],
    	[
    		"kiwi",
    		"kiwifruit",
    		"'kiwi' is a bird, not a fruit"
    	],
    	[
    		"kneeled",
    		"knelt",
    		""
    	],
    	[
    		"labeled",
    		"labelled",
    		""
    	],
    	[
    		"labeler",
    		"labeller",
    		""
    	],
    	[
    		"labeling",
    		"labelling",
    		""
    	],
    	[
    		"labor",
    		"labour",
    		""
    	],
    	[
    		"labored",
    		"laboured",
    		""
    	],
    	[
    		"laboring",
    		"labouring",
    		""
    	],
    	[
    		"ladybug",
    		"ladybird",
    		""
    	],
    	[
    		"last name",
    		"surname",
    		""
    	],
    	[
    		"leaned",
    		"leant",
    		""
    	],
    	[
    		"leaped",
    		"lept",
    		""
    	],
    	[
    		"learned",
    		"learnt",
    		""
    	],
    	[
    		"leukemia",
    		"leukaemia",
    		""
    	],
    	[
    		"license",
    		"licence",
    		"'license' is a verb, 'licence' is a noun"
    	],
    	[
    		"license plate",
    		"number plate",
    		""
    	],
    	[
    		"licorice",
    		"liquorice",
    		""
    	],
    	[
    		"lighted",
    		"lit",
    		""
    	],
    	[
    		"line",
    		"mains",
    		"mains power - the primary electrical power supply wires entering a building, connected to the Main fuses or breakers ; or mains lead - the flexible electric cable from plug to appliance"
    	],
    	[
    		"liter",
    		"litre",
    		""
    	],
    	[
    		"localization",
    		"localisation",
    		""
    	],
    	[
    		"localizational",
    		"localisational",
    		""
    	],
    	[
    		"localize",
    		"localise",
    		""
    	],
    	[
    		"localized",
    		"localised",
    		""
    	],
    	[
    		"localizing",
    		"localising",
    		""
    	],
    	[
    		"mail",
    		"post",
    		""
    	],
    	[
    		"mailbox",
    		"letterbox",
    		""
    	],
    	[
    		"mailman",
    		"postman",
    		""
    	],
    	[
    		"mail slot",
    		"letterbox",
    		""
    	],
    	[
    		"math",
    		"maths",
    		""
    	],
    	[
    		"medieval",
    		"mediaeval",
    		""
    	],
    	[
    		"meter",
    		"metre",
    		"are we referring to the measurement unit or a measuring device?"
    	],
    	[
    		"micrometer",
    		"micrometre",
    		"micrometre is a measurement, micrometer is a measuring device"
    	],
    	[
    		"milliliter",
    		"millilitre",
    		""
    	],
    	[
    		"millimeter",
    		"millimetre",
    		""
    	],
    	[
    		"minimize",
    		"minimise",
    		""
    	],
    	[
    		"minimized",
    		"minimised",
    		""
    	],
    	[
    		"minimizing",
    		"minimising",
    		""
    	],
    	[
    		"misspelled",
    		"misspelt",
    		""
    	],
    	[
    		"modeled",
    		"modelled",
    		""
    	],
    	[
    		"modeler",
    		"modeller",
    		""
    	],
    	[
    		"modeling",
    		"modelling",
    		""
    	],
    	[
    		"mold",
    		"mould",
    		""
    	],
    	[
    		"molt",
    		"moult",
    		""
    	],
    	[
    		"mom",
    		"mum",
    		""
    	],
    	[
    		"momma",
    		"mumma",
    		""
    	],
    	[
    		"mommy",
    		"mummy",
    		""
    	],
    	[
    		"mom-and-pop",
    		"mum-and-dad",
    		""
    	],
    	[
    		"most",
    		"almost",
    		"some en-us speakers erroneously use 'most' to mean 'almost'"
    	],
    	[
    		"movie",
    		"film",
    		""
    	],
    	[
    		"movies",
    		"cinema",
    		""
    	],
    	[
    		"movies",
    		"films",
    		""
    	],
    	[
    		"Mr.",
    		"Mr",
    		"Only use a full stop if the final letter of the abbreviation is not the final letter of the word it is abbreviating. So, 'Mister' = 'Mr'."
    	],
    	[
    		"Mrs.",
    		"Mrs",
    		"Only use a full stop if the final letter of the abbreviation is not the final letter of the word it is abbreviating. So, 'Missus' = 'Mrs'."
    	],
    	[
    		"Ms.",
    		"Ms",
    		"The title, \"Ms\", is not an abbreviation."
    	],
    	[
    		"mustache",
    		"moustache",
    		""
    	],
    	[
    		"nanometer",
    		"nanometre",
    		""
    	],
    	[
    		"neighbor",
    		"neighbour",
    		""
    	],
    	[
    		"neighboring",
    		"neighbouring",
    		""
    	],
    	[
    		"neuron",
    		"neurone",
    		""
    	],
    	[
    		"newsdealer",
    		"newsagent",
    		""
    	],
    	[
    		"normalcy",
    		"normality",
    		""
    	],
    	[
    		"normalization",
    		"normalisation",
    		""
    	],
    	[
    		"normalize",
    		"normalise",
    		""
    	],
    	[
    		"normalized",
    		"normalised",
    		""
    	],
    	[
    		"normalizing",
    		"normalising",
    		""
    	],
    	[
    		"northward",
    		"northwards",
    		"use 'northward' only as an adjective"
    	],
    	[
    		"offense",
    		"offence",
    		""
    	],
    	[
    		"off of",
    		"off",
    		""
    	],
    	[
    		"oftentimes",
    		"often",
    		""
    	],
    	[
    		"onward",
    		"onwards",
    		"use 'onward' only as an adjective"
    	],
    	[
    		"optimization",
    		"optimisation",
    		""
    	],
    	[
    		"optimizational",
    		"optimisational",
    		""
    	],
    	[
    		"optimize",
    		"optimise",
    		""
    	],
    	[
    		"optimized",
    		"optimised",
    		""
    	],
    	[
    		"optimizing",
    		"optimising",
    		""
    	],
    	[
    		"organization",
    		"organisation",
    		""
    	],
    	[
    		"organizational",
    		"organisational",
    		""
    	],
    	[
    		"organize",
    		"organise",
    		""
    	],
    	[
    		"organized",
    		"organised",
    		""
    	],
    	[
    		"organizer",
    		"organiser",
    		""
    	],
    	[
    		"organizing",
    		"organising",
    		""
    	],
    	[
    		"ornery",
    		"irritable",
    		""
    	],
    	[
    		"orthopedic",
    		"orthopaedic",
    		""
    	],
    	[
    		"ouster",
    		"ousting",
    		""
    	],
    	[
    		"pacifier",
    		"dummy",
    		""
    	],
    	[
    		"pajamas",
    		"pyjamas",
    		""
    	],
    	[
    		"paneled",
    		"panelled",
    		""
    	],
    	[
    		"paneling",
    		"panelling",
    		""
    	],
    	[
    		"pants",
    		"trousers",
    		"'pants' are an undergarment"
    	],
    	[
    		"pantyhose",
    		"tights",
    		""
    	],
    	[
    		"paren",
    		"bracket",
    		""
    	],
    	[
    		"parentheses",
    		"brackets",
    		""
    	],
    	[
    		"parenthesis",
    		"bracket",
    		""
    	],
    	[
    		"parenthesized",
    		"bracketed",
    		""
    	],
    	[
    		"parking lot",
    		"car park",
    		""
    	],
    	[
    		"pediatric",
    		"paediatric",
    		""
    	],
    	[
    		"period",
    		"full stop",
    		""
    	],
    	[
    		"persnickety",
    		"pernickety",
    		""
    	],
    	[
    		"picometer",
    		"picometre",
    		""
    	],
    	[
    		"plow",
    		"plough",
    		""
    	],
    	[
    		"pop",
    		"dad",
    		""
    	],
    	[
    		"popsicle",
    		"ice lolly",
    		""
    	],
    	[
    		"porch",
    		"veranda",
    		"a 'porch' is a covered structure in front of the entrance to a building, but not a veranda"
    	],
    	[
    		"postpend",
    		"suffix",
    		""
    	],
    	[
    		"pound sign",
    		"hash",
    		"are we referring to the symbol for pound stering, or a number sign?"
    	],
    	[
    		"power cord",
    		"flex/mains lead, mains wire/wiring",
    		""
    	],
    	[
    		"practice",
    		"practise",
    		"'practise' is a verb, 'practice' is a noun"
    	],
    	[
    		"premiere",
    		"première",
    		""
    	],
    	[
    		"prepend",
    		"prefix",
    		""
    	],
    	[
    		"prioritization",
    		"prioritisation",
    		""
    	],
    	[
    		"prioritize",
    		"prioritise",
    		""
    	],
    	[
    		"prioritized",
    		"prioritised",
    		""
    	],
    	[
    		"prioritizing",
    		"prioritising",
    		""
    	],
    	[
    		"program",
    		"programme",
    		"Contextual: use 'program' in computing contexts, and 'programme' everywhere else (e.g. a computer program, a television programme)"
    	],
    	[
    		"prong",
    		"pin",
    		""
    	],
    	[
    		"proved",
    		"proven",
    		""
    	],
    	[
    		"pry",
    		"prise",
    		"To open/lift something. 'Pry' means to ask questions."
    	],
    	[
    		"quint",
    		"quin",
    		""
    	],
    	[
    		"railroad",
    		"railway",
    		""
    	],
    	[
    		"randomization",
    		"randomisation",
    		""
    	],
    	[
    		"randomize",
    		"randomise",
    		""
    	],
    	[
    		"randomized",
    		"randomised",
    		""
    	],
    	[
    		"randomizing",
    		"randomising",
    		""
    	],
    	[
    		"rappel",
    		"abseil",
    		""
    	],
    	[
    		"realator",
    		"real estate agent",
    		""
    	],
    	[
    		"realization",
    		"realisation",
    		""
    	],
    	[
    		"realize",
    		"realise",
    		""
    	],
    	[
    		"realized",
    		"realised",
    		""
    	],
    	[
    		"realizing",
    		"realising",
    		""
    	],
    	[
    		"recognizable",
    		"recognisable",
    		""
    	],
    	[
    		"recognize",
    		"recognise",
    		""
    	],
    	[
    		"recognized",
    		"recognised",
    		""
    	],
    	[
    		"recognizing",
    		"recognising",
    		""
    	],
    	[
    		"reinitialize",
    		"reinitialise",
    		""
    	],
    	[
    		"reinitialized",
    		"reinitialised",
    		""
    	],
    	[
    		"reinitializing",
    		"reinitialising",
    		""
    	],
    	[
    		"resume",
    		"CV",
    		"common misspelling of résumé => curriculum vitae"
    	],
    	[
    		"résumé",
    		"CV",
    		"curriculum vitae"
    	],
    	[
    		"route",
    		"round",
    		"a set of regular visits that you make to a number of places or people, especially in order to deliver products as part of your job"
    	],
    	[
    		"row house",
    		"terraced house",
    		""
    	],
    	[
    		"rumor",
    		"rumour",
    		""
    	],
    	[
    		"rumored",
    		"rumoured",
    		""
    	],
    	[
    		"saber",
    		"sabre",
    		""
    	],
    	[
    		"sailboat",
    		"sailing boat",
    		""
    	],
    	[
    		"sanitarium",
    		"sanatorium",
    		""
    	],
    	[
    		"Santa Claus",
    		"Father Christmas",
    		""
    	],
    	[
    		"scalawag",
    		"scallywag",
    		""
    	],
    	[
    		"scepter",
    		"sceptre",
    		""
    	],
    	[
    		"schedule",
    		"timetable",
    		"schedule: a list of planned activities or things to be done showing the times or dates when they are intended to happen or be done ; timetable: a list of the times when events are planned to happen, especially the times when buses, trains and planes leave and arrive"
    	],
    	[
    		"season",
    		"series",
    		"a set of television or radio broadcasts on the same subject or using the same characters but in different situations"
    	],
    	[
    		"serialization",
    		"serialisation",
    		""
    	],
    	[
    		"serializational",
    		"serialisational",
    		""
    	],
    	[
    		"serialize",
    		"serialise",
    		""
    	],
    	[
    		"serialized",
    		"serialised",
    		""
    	],
    	[
    		"serializing",
    		"serialising",
    		""
    	],
    	[
    		"shivaree",
    		"charivari",
    		""
    	],
    	[
    		"sidewalk",
    		"pavement",
    		""
    	],
    	[
    		"signaled",
    		"signalled",
    		""
    	],
    	[
    		"signaling",
    		"signalling",
    		""
    	],
    	[
    		"simultanous",
    		"simultaneous",
    		""
    	],
    	[
    		"skeptic",
    		"sceptic",
    		""
    	],
    	[
    		"skeptical",
    		"sceptical",
    		""
    	],
    	[
    		"skepticism",
    		"scepticism",
    		""
    	],
    	[
    		"sled",
    		"sleigh",
    		""
    	],
    	[
    		"sneakers",
    		"trainers",
    		""
    	],
    	[
    		"snicker",
    		"snigger",
    		""
    	],
    	[
    		"soapbox",
    		"podium",
    		""
    	],
    	[
    		"soccer",
    		"football",
    		""
    	],
    	[
    		"soda",
    		"soft drink",
    		""
    	],
    	[
    		"solitaire",
    		"patience",
    		"the card game"
    	],
    	[
    		"southward",
    		"southwards",
    		"use 'southward' only as an adjective"
    	],
    	[
    		"specialization",
    		"specialisation",
    		""
    	],
    	[
    		"specializational",
    		"specialisational",
    		""
    	],
    	[
    		"specialize",
    		"specialise",
    		""
    	],
    	[
    		"specialized",
    		"specialised",
    		""
    	],
    	[
    		"specializing",
    		"specialising",
    		""
    	],
    	[
    		"specialty",
    		"speciality",
    		""
    	],
    	[
    		"specter",
    		"spectre",
    		""
    	],
    	[
    		"spelled",
    		"spelt",
    		""
    	],
    	[
    		"spider",
    		"spyder",
    		"For a two-seat convertible car."
    	],
    	[
    		"spilled",
    		"spilt",
    		""
    	],
    	[
    		"spiraled",
    		"spiralled",
    		""
    	],
    	[
    		"spiraling",
    		"spiralling",
    		""
    	],
    	[
    		"spoiled",
    		"spoilt",
    		""
    	],
    	[
    		"St",
    		"St.",
    		"'St' = 'Saint' and 'St.' = 'Street'"
    	],
    	[
    		"St.",
    		"St",
    		"'St' = 'Saint' and 'St.' = 'Street'"
    	],
    	[
    		"standardize",
    		"standardise",
    		""
    	],
    	[
    		"stickshift",
    		"gear stick",
    		""
    	],
    	[
    		"story",
    		"storey",
    		"Level of a building."
    	],
    	[
    		"stories",
    		"storeys",
    		"Levels of a building."
    	],
    	[
    		"streetcar",
    		"tram",
    		""
    	],
    	[
    		"stroller",
    		"pram",
    		""
    	],
    	[
    		"sulfur",
    		"sulphur",
    		""
    	],
    	[
    		"sulfurous",
    		"sulphurous",
    		""
    	],
    	[
    		"summarization",
    		"summarisation",
    		""
    	],
    	[
    		"summarizational",
    		"summarisational",
    		""
    	],
    	[
    		"summarize",
    		"summarise",
    		""
    	],
    	[
    		"summarized",
    		"summarised",
    		""
    	],
    	[
    		"summarizing",
    		"summarising",
    		""
    	],
    	[
    		"sweater",
    		"jumper",
    		""
    	],
    	[
    		"symbolization",
    		"symbolisation",
    		""
    	],
    	[
    		"symbolizational",
    		"symbolisational",
    		""
    	],
    	[
    		"symbolize",
    		"symbolise",
    		""
    	],
    	[
    		"symbolized",
    		"symbolised",
    		""
    	],
    	[
    		"symbolizing",
    		"symbolising",
    		""
    	],
    	[
    		"synchronization",
    		"synchronisation",
    		""
    	],
    	[
    		"synchronizational",
    		"synchronisational",
    		""
    	],
    	[
    		"synchronize",
    		"synchronise",
    		""
    	],
    	[
    		"synchronized",
    		"synchronised",
    		""
    	],
    	[
    		"synchronizing",
    		"synchronising",
    		""
    	],
    	[
    		"synthesize",
    		"synthesise",
    		""
    	],
    	[
    		"taffy",
    		"toffee",
    		""
    	],
    	[
    		"tailpipe",
    		"exhaust pipe",
    		""
    	],
    	[
    		"taliban",
    		"taleban",
    		"latinisation used by the UK press"
    	],
    	[
    		"teleprompter",
    		"autocue",
    		""
    	],
    	[
    		"templatization",
    		"templatisation",
    		""
    	],
    	[
    		"templatizational",
    		"templatisational",
    		""
    	],
    	[
    		"templatize",
    		"templatise",
    		""
    	],
    	[
    		"templatized",
    		"templatised",
    		""
    	],
    	[
    		"templatizing",
    		"templatising",
    		""
    	],
    	[
    		"theater",
    		"theatre",
    		""
    	],
    	[
    		"thumbtack",
    		"drawing pin",
    		""
    	],
    	[
    		"tic-tac-toe",
    		"noughts and crosses",
    		""
    	],
    	[
    		"tidbit",
    		"titbit",
    		""
    	],
    	[
    		"tire",
    		"tyre",
    		"Rubber part of a wheel."
    	],
    	[
    		"totaled",
    		"totalled",
    		""
    	],
    	[
    		"totaler",
    		"totaller",
    		""
    	],
    	[
    		"totaling",
    		"totalling",
    		""
    	],
    	[
    		"toward",
    		"towards",
    		"use 'toward' only as an adjective"
    	],
    	[
    		"trackless trolley",
    		"trolleybus",
    		""
    	],
    	[
    		"transportation",
    		"transport",
    		""
    	],
    	[
    		"trapezium",
    		"trapezoid",
    		"A quadrilateral with no two sides parallel and no equal sides."
    	],
    	[
    		"trapezoid",
    		"trapezium",
    		"A quadrilateral with two non-adjacent parallel sides."
    	],
    	[
    		"trash",
    		"rubbish, Rubbish Bin",
    		"When referring to generic waste, use 'rubbish'. When referring to the place where deleted files go, use 'Rubbish Bin'"
    	],
    	[
    		"truck",
    		"lorry",
    		""
    	],
    	[
    		"trunk",
    		"boot",
    		"The luggage compartment of a car."
    	],
    	[
    		"turnpike",
    		"toll road",
    		""
    	],
    	[
    		"turtleneck",
    		"polo neck",
    		"A type of neck on a sweater."
    	],
    	[
    		"tuxedo",
    		"dinner jacket",
    		""
    	],
    	[
    		"uncategorized",
    		"uncategorised",
    		""
    	],
    	[
    		"undershirt",
    		"singlet",
    		""
    	],
    	[
    		"unauthorized",
    		"unauthorised",
    		""
    	],
    	[
    		"uninitialization",
    		"uninitialisation",
    		""
    	],
    	[
    		"uninitializational",
    		"uninitialisational",
    		""
    	],
    	[
    		"uninitialize",
    		"uninitialise",
    		""
    	],
    	[
    		"uninitialized",
    		"uninitialised",
    		""
    	],
    	[
    		"uninitializing",
    		"uninitialising",
    		""
    	],
    	[
    		"unorganized",
    		"unorganised",
    		""
    	],
    	[
    		"unrecognizable",
    		"unrecognisable",
    		""
    	],
    	[
    		"unrecognized",
    		"unrecognised",
    		""
    	],
    	[
    		"upcoming",
    		"forthcoming",
    		""
    	],
    	[
    		"upscale",
    		"upmarket",
    		""
    	],
    	[
    		"upward",
    		"upwards",
    		"use 'upward' only as an adjective"
    	],
    	[
    		"useable",
    		"usable",
    		""
    	],
    	[
    		"utilization",
    		"utilisation",
    		""
    	],
    	[
    		"utilize",
    		"utilise",
    		""
    	],
    	[
    		"utilized",
    		"utilised",
    		""
    	],
    	[
    		"utilizing",
    		"utilising",
    		""
    	],
    	[
    		"vacation",
    		"holiday",
    		""
    	],
    	[
    		"vacationer",
    		"holidaymaker",
    		""
    	],
    	[
    		"vapor",
    		"vapour",
    		""
    	],
    	[
    		"vectorization",
    		"vectorisation",
    		""
    	],
    	[
    		"vectorizational",
    		"vectorisational",
    		""
    	],
    	[
    		"vectorize",
    		"vectorise",
    		""
    	],
    	[
    		"vectorized",
    		"vectorised",
    		""
    	],
    	[
    		"vectorizer",
    		"vectoriser",
    		""
    	],
    	[
    		"vectorizing",
    		"vectorising",
    		""
    	],
    	[
    		"virtualization",
    		"virtualisation",
    		""
    	],
    	[
    		"virtualize",
    		"virtualise",
    		""
    	],
    	[
    		"virtualized",
    		"virtualised",
    		""
    	],
    	[
    		"virtualizing",
    		"virtualising",
    		""
    	],
    	[
    		"vise",
    		"vice",
    		""
    	],
    	[
    		"visualization",
    		"visualisation",
    		""
    	],
    	[
    		"visualize",
    		"visualise",
    		""
    	],
    	[
    		"visualized",
    		"visualised",
    		""
    	],
    	[
    		"visualizing",
    		"visualising",
    		""
    	],
    	[
    		"vs.",
    		"vs",
    		"abbreviation of versus"
    	],
    	[
    		"web",
    		"Web",
    		"Capitalised when referring to the World Wide Web (e.g. a Web browser)."
    	],
    	[
    		"westward",
    		"westwards",
    		"use 'westward' only as an adjective"
    	],
    	[
    		"windshield",
    		"windscreen",
    		""
    	],
    	[
    		"yogurt",
    		"yoghurt",
    		""
    	],
    	[
    		"zee",
    		"zed",
    		"Phonetic spelling of the 26th letter of the English alphabet."
    	],
    	[
    		"ZIP code",
    		"postcode",
    		""
    	],
    	[
    		"zucchini",
    		"courgette",
    		""
    	]
    ];
    var patterns = [
    	[
    		"*alog",
    		"*alogue",
    		"catalogue, dialogue (except dialog in computing)"
    	],
    	[
    		"*e*",
    		"*ae*",
    		"encyclopaedia, anaesthetic, archaeology"
    	],
    	[
    		"*ed",
    		"*t",
    		"spelt, spilt, spoilt, dreamt, knelt, burnt"
    	],
    	[
    		"*er",
    		"*re",
    		"centre, theatre, fibre, litre, metre, millimetre"
    	],
    	[
    		"*in",
    		"*ine",
    		"adrenaline, glycerine"
    	],
    	[
    		"*iza*",
    		"*isa*",
    		"civilisation, organisational"
    	],
    	[
    		"*ize",
    		"*ise",
    		"colourise, organise, maximise, minimise, but not size"
    	],
    	[
    		"*led",
    		"*lled",
    		"labelled"
    	],
    	[
    		"*or",
    		"*our",
    		"colour, favour, honour"
    	],
    	[
    		"*rrhea",
    		"*rrhoea",
    		"diarrhoea, gonorrhoea"
    	],
    	[
    		"*se",
    		"*ce",
    		"only when a noun: licence, practice, advice, defence"
    	],
    	[
    		"*yze",
    		"*yse",
    		"analyse"
    	],
    	[
    		"e*",
    		"oe*",
    		"oestrogen"
    	],
    	[
    		"multi*",
    		"multi-*",
    		"'multi-storey', but not 'multiple'"
    	],
    	[
    		"Dr., Mr., Mrs.",
    		"Dr, Mr, Mrs",
    		"Only use a full stop if the final letter of the abbreviation is not the final letter of the word it is abbreviating."
    	],
    	[
    		"St, St.",
    		"St, St.",
    		"St = Saint ; St. = Street"
    	],
    	[
    		"aluminum",
    		"aluminium",
    		""
    	],
    	[
    		"check",
    		"tick",
    		"the tick box"
    	],
    	[
    		"check",
    		"cheque",
    		"a bank cheque"
    	],
    	[
    		"checker",
    		"chequer",
    		"a game of chequers, a chequered floor"
    	],
    	[
    		"counter-clockwise",
    		"anti-clockwise",
    		"rotate anti-clockwise"
    	],
    	[
    		"delete",
    		"Permanently Delete",
    		"make this change if a Delete action will bypass the Rubbish Bin (Trash)"
    	],
    	[
    		"disk",
    		"disc, disk",
    		"Contextual: If describing a round object (e.g. a CD or DVD), use 'disc'. Otherwise, use 'disk' (e.g. a hard disk drive)."
    	],
    	[
    		"gasoline",
    		"petrol",
    		""
    	],
    	[
    		"gray",
    		"grey",
    		""
    	],
    	[
    		"hood",
    		"bonnet",
    		"The lid covering the engine compartment of a car."
    	],
    	[
    		"mom",
    		"mum / mam",
    		"mother"
    	],
    	[
    		"parentheses",
    		"brackets",
    		""
    	],
    	[
    		"period",
    		"full stop",
    		""
    	],
    	[
    		"program",
    		"programme, program",
    		"Contextual: use 'program' in computing contexts, and 'programme' everywhere else (e.g. a computer program, a television programme)"
    	],
    	[
    		"pound sign",
    		"hash",
    		""
    	],
    	[
    		"sulfur",
    		"sulphur",
    		""
    	],
    	[
    		"trunk",
    		"boot",
    		"The luggage compartment of a car."
    	],
    	[
    		"trash",
    		"rubbish, the Rubbish Bin",
    		"When referring to generic waste, use 'rubbish'. When referring to the place where deleted files go, use 'the Rubbish Bin' (note the capitalisation)."
    	],
    	[
    		"zee",
    		"zed",
    		"pronunciation of the final letter of the English alphabet"
    	],
    	[
    		"ZIP code",
    		"postcode",
    		"Be careful with this one. A correct English translation may be referring to the American postal system, in which case \"ZIP code\" is correct."
    	]
    ];
    var data = {
    	$schema: $schema,
    	words: words,
    	patterns: patterns
    };

    const wordList = data.words;
    const patternsList = data.patterns;

    function getData(selector, value) {
         var matchingElements = [];
         (selector == "word" ? wordList : patternsList).forEach((element) => {
              if (element[0].toUpperCase().includes(value.toUpperCase()) || element[1].toUpperCase().includes(value.toUpperCase())) {
                   matchingElements.push(element);
              }
         });
         return matchingElements;
    }

    function getSchema() {
         return data.$schema;
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    let current = writable({});

    /* src/components/WordInput.svelte generated by Svelte v3.46.2 */
    const file$2 = "src/components/WordInput.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (25:10) {#each $current.content as suggestionArray}
    function create_each_block$1(ctx) {
    	let html_tag;
    	let raw_value = (/*suggestionArray*/ ctx[4][0] + " / " + /*suggestionArray*/ ctx[4][1]).replaceAll(/*$current*/ ctx[0].search, "<b>" + /*$current*/ ctx[0].search + "</b>") + "";
    	let br;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			br = element("br");
    			html_tag.a = br;
    			add_location(br, file$2, 25, 136, 968);
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$current*/ 1 && raw_value !== (raw_value = (/*suggestionArray*/ ctx[4][0] + " / " + /*suggestionArray*/ ctx[4][1]).replaceAll(/*$current*/ ctx[0].search, "<b>" + /*$current*/ ctx[0].search + "</b>") + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) html_tag.d();
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(25:10) {#each $current.content as suggestionArray}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let main;
    	let form;
    	let input;
    	let br;
    	let t0;
    	let select;
    	let option0;
    	let option1;
    	let t3;
    	let div;
    	let mounted;
    	let dispose;
    	let each_value = /*$current*/ ctx[0].content;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			form = element("form");
    			input = element("input");
    			br = element("br");
    			t0 = text("\n          Search for: ");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Words";
    			option1 = element("option");
    			option1.textContent = "Patterns";
    			t3 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Word");
    			add_location(input, file$2, 17, 10, 483);
    			add_location(br, file$2, 17, 86, 559);
    			option0.__value = "word";
    			option0.value = option0.__value;
    			add_location(option0, file$2, 19, 15, 641);
    			option1.__value = "pattern";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 20, 15, 692);
    			if (/*$current*/ ctx[0].selector === void 0) add_render_callback(() => /*select_change_handler*/ ctx[3].call(select));
    			add_location(select, file$2, 18, 22, 586);
    			add_location(form, file$2, 16, 5, 441);
    			add_location(div, file$2, 23, 5, 772);
    			add_location(main, file$2, 15, 0, 429);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, form);
    			append_dev(form, input);
    			append_dev(form, br);
    			append_dev(form, t0);
    			append_dev(form, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			select_option(select, /*$current*/ ctx[0].selector);
    			append_dev(main, t3);
    			append_dev(main, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "keyup", prevent_default(/*handleKeyup*/ ctx[1]), false, true, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[3]),
    					listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[2]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$current*/ 1) {
    				select_option(select, /*$current*/ ctx[0].selector);
    			}

    			if (dirty & /*$current*/ 1) {
    				each_value = /*$current*/ ctx[0].content;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $current;
    	validate_store(current, 'current');
    	component_subscribe($$self, current, $$value => $$invalidate(0, $current = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WordInput', slots, []);

    	set_store_value(
    		current,
    		$current = {
    			content: [],
    			search: null,
    			selector: "word"
    		},
    		$current
    	);

    	function handleKeyup(e) {
    		if (e.target.value == '') return;
    		set_store_value(current, $current.search = e.target.value, $current);
    		set_store_value(current, $current.content = getData($current.selector, $current.search), $current);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WordInput> was created with unknown prop '${key}'`);
    	});

    	function submit_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function select_change_handler() {
    		$current.selector = select_value(this);
    		current.set($current);
    	}

    	$$self.$capture_state = () => ({ getData, current, handleKeyup, $current });
    	return [$current, handleKeyup, submit_handler, select_change_handler];
    }

    class WordInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WordInput",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/WordMeanings.svelte generated by Svelte v3.46.2 */
    const file$1 = "src/components/WordMeanings.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (11:5) {:else}
    function create_else_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*$current*/ ctx[0].content;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$current, schema*/ 3) {
    				each_value = /*$current*/ ctx[0].content;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(11:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (9:5) {#if $current.search == null}
    function create_if_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("No word/pattern selected.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(9:5) {#if $current.search == null}",
    		ctx
    	});

    	return block;
    }

    // (12:5) {#each $current.content as wordOrPatternArray}
    function create_each_block(ctx) {
    	let t0_value = /*schema*/ ctx[1][0] + "";
    	let t0;
    	let t1;
    	let t2_value = /*wordOrPatternArray*/ ctx[2][0] + "";
    	let t2;
    	let br0;
    	let t3;
    	let t4_value = /*schema*/ ctx[1][1] + "";
    	let t4;
    	let t5;
    	let t6_value = /*wordOrPatternArray*/ ctx[2][1] + "";
    	let t6;
    	let br1;
    	let t7;
    	let t8_value = /*schema*/ ctx[1][2] + "";
    	let t8;
    	let t9;

    	let t10_value = (/*wordOrPatternArray*/ ctx[2][2] == ""
    	? "None."
    	: /*wordOrPatternArray*/ ctx[2][2]) + "";

    	let t10;
    	let br2;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = text(t2_value);
    			br0 = element("br");
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = text(": ");
    			t6 = text(t6_value);
    			br1 = element("br");
    			t7 = space();
    			t8 = text(t8_value);
    			t9 = text(": ");
    			t10 = text(t10_value);
    			br2 = element("br");
    			add_location(br0, file$1, 12, 46, 354);
    			add_location(br1, file$1, 13, 46, 405);
    			add_location(br2, file$1, 14, 86, 496);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, br2, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$current*/ 1 && t2_value !== (t2_value = /*wordOrPatternArray*/ ctx[2][0] + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*$current*/ 1 && t6_value !== (t6_value = /*wordOrPatternArray*/ ctx[2][1] + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*$current*/ 1 && t10_value !== (t10_value = (/*wordOrPatternArray*/ ctx[2][2] == ""
    			? "None."
    			: /*wordOrPatternArray*/ ctx[2][2]) + "")) set_data_dev(t10, t10_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(br2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(12:5) {#each $current.content as wordOrPatternArray}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;

    	function select_block_type(ctx, dirty) {
    		if (/*$current*/ ctx[0].search == null) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if_block.c();
    			add_location(main, file$1, 7, 0, 165);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if_block.m(main, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(main, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $current;
    	validate_store(current, 'current');
    	component_subscribe($$self, current, $$value => $$invalidate(0, $current = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WordMeanings', slots, []);
    	const schema = getSchema();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WordMeanings> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ current, getSchema, schema, $current });
    	return [$current, schema];
    }

    class WordMeanings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WordMeanings",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let style;
    	let t1;
    	let main;
    	let wordinput;
    	let t2;
    	let wordmeanings;
    	let current;
    	wordinput = new WordInput({ $$inline: true });
    	wordmeanings = new WordMeanings({ $$inline: true });

    	const block = {
    		c: function create() {
    			style = element("style");
    			style.textContent = "body {\n\t\t\tmax-width: 600px;\n\t\t\tmax-height: 300px;\n\t\t}";
    			t1 = space();
    			main = element("main");
    			create_component(wordinput.$$.fragment);
    			t2 = space();
    			create_component(wordmeanings.$$.fragment);
    			add_location(style, file, 6, 1, 153);
    			attr_dev(main, "class", "svelte-1ad9dpu");
    			add_location(main, file, 13, 0, 242);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, style);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(wordinput, main, null);
    			append_dev(main, t2);
    			mount_component(wordmeanings, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wordinput.$$.fragment, local);
    			transition_in(wordmeanings.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wordinput.$$.fragment, local);
    			transition_out(wordmeanings.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(style);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    			destroy_component(wordinput);
    			destroy_component(wordmeanings);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ WordInput, WordMeanings });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
