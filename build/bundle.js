
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.0' }, detail), true));
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
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

    /* src\App.svelte generated by Svelte v3.44.0 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let body;
    	let h2;
    	let t1;
    	let h40;
    	let t3;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let p0;
    	let t6;
    	let hr0;
    	let t7;
    	let h41;
    	let t9;
    	let img1;
    	let img1_src_value;
    	let t10;
    	let p1;
    	let t12;
    	let hr1;
    	let t13;
    	let h42;
    	let t15;
    	let img2;
    	let img2_src_value;
    	let t16;
    	let p2;
    	let t18;
    	let hr2;
    	let t19;
    	let h43;
    	let t21;
    	let img3;
    	let img3_src_value;
    	let t22;
    	let p3;
    	let t24;
    	let hr3;
    	let t25;
    	let h44;
    	let t27;
    	let img4;
    	let img4_src_value;
    	let t28;
    	let p4;
    	let t30;
    	let hr4;
    	let t31;
    	let h45;
    	let t33;
    	let img5;
    	let img5_src_value;
    	let t34;
    	let p5;
    	let t36;
    	let hr5;
    	let t37;
    	let h46;
    	let t39;
    	let img6;
    	let img6_src_value;
    	let t40;
    	let p6;
    	let t42;
    	let hr6;
    	let t43;
    	let h47;
    	let t45;
    	let img7;
    	let img7_src_value;
    	let t46;
    	let p7;
    	let t48;
    	let hr7;
    	let t49;
    	let h48;
    	let t51;
    	let img8;
    	let img8_src_value;
    	let t52;
    	let p8;
    	let t54;
    	let hr8;
    	let t55;
    	let h49;
    	let t57;
    	let img9;
    	let img9_src_value;
    	let t58;
    	let p9;
    	let t60;
    	let hr9;
    	let t61;
    	let h410;
    	let t63;
    	let img10;
    	let img10_src_value;
    	let t64;
    	let p10;
    	let t66;
    	let hr10;
    	let t67;
    	let h411;
    	let t69;
    	let img11;
    	let img11_src_value;
    	let t70;
    	let p11;

    	const block = {
    		c: function create() {
    			body = element("body");
    			h2 = element("h2");
    			h2.textContent = "อัลบั้มรวมผลงาน";
    			t1 = space();
    			h40 = element("h4");
    			h40.textContent = "รูปที่1";
    			t3 = space();
    			img0 = element("img");
    			t4 = space();
    			p0 = element("p");
    			p0.textContent = "งานชิ้นนี้เป็นงานชิ้นเเรกที่วาดภาพวิวธรรมชาติ";
    			t6 = space();
    			hr0 = element("hr");
    			t7 = space();
    			h41 = element("h4");
    			h41.textContent = "รูปที่2";
    			t9 = space();
    			img1 = element("img");
    			t10 = space();
    			p1 = element("p");
    			p1.textContent = "รูปนี้เกิดจากการนําโทนสีที่ชอบมารวมกันจนเป็นภาพท้องฟ้าที่มี5สี";
    			t12 = space();
    			hr1 = element("hr");
    			t13 = space();
    			h42 = element("h4");
    			h42.textContent = "รูปที่3";
    			t15 = space();
    			img2 = element("img");
    			t16 = space();
    			p2 = element("p");
    			p2.textContent = "รูปนี้เป็นท้องฟ้าที่โล่งโปร่งสดใสเเล้วก็มีนกที่โบยบิน";
    			t18 = space();
    			hr2 = element("hr");
    			t19 = space();
    			h43 = element("h4");
    			h43.textContent = "รูปที่4";
    			t21 = space();
    			img3 = element("img");
    			t22 = space();
    			p3 = element("p");
    			p3.textContent = "รูปนี้ได้รับเเรงบันดาลใจมาจากผลไม้ที่ฉันชอบกิน";
    			t24 = space();
    			hr3 = element("hr");
    			t25 = space();
    			h44 = element("h4");
    			h44.textContent = "รูปที่5";
    			t27 = space();
    			img4 = element("img");
    			t28 = space();
    			p4 = element("p");
    			p4.textContent = "รูปนี้เป็นรูปเซตอาหารเช้า ที่กินเป็นประจําในทุกๆเช้า";
    			t30 = space();
    			hr4 = element("hr");
    			t31 = space();
    			h45 = element("h4");
    			h45.textContent = "รูปที่6";
    			t33 = space();
    			img5 = element("img");
    			t34 = space();
    			p5 = element("p");
    			p5.textContent = "รูปนี้เป็นรูปเเรกที่เลือกโทนสีด้วยตัวเองทั้งหมด เเละเป็นการนําโทนสีที่น่ารักๆมารวมกัน";
    			t36 = space();
    			hr5 = element("hr");
    			t37 = space();
    			h46 = element("h4");
    			h46.textContent = "รูปที่7";
    			t39 = space();
    			img6 = element("img");
    			t40 = space();
    			p6 = element("p");
    			p6.textContent = "รูปนี้เป็นรูปท้องฟ้าในยามเย็นตอนที่พระอาทิตย์กําลังจะตกดิน";
    			t42 = space();
    			hr6 = element("hr");
    			t43 = space();
    			h47 = element("h4");
    			h47.textContent = "รูปที่8";
    			t45 = space();
    			img7 = element("img");
    			t46 = space();
    			p7 = element("p");
    			p7.textContent = "รูปนี้เป็นรูปท้องฟ้าในยามที่พระอาทิตย์กําลังลับขอบฟ้า";
    			t48 = space();
    			hr7 = element("hr");
    			t49 = space();
    			h48 = element("h4");
    			h48.textContent = "รูปที่9";
    			t51 = space();
    			img8 = element("img");
    			t52 = space();
    			p8 = element("p");
    			p8.textContent = "ส่วนรูปนี้เป็นรูปของเซตซูชิที่ชอบกิน";
    			t54 = space();
    			hr8 = element("hr");
    			t55 = space();
    			h49 = element("h4");
    			h49.textContent = "รูปที่10";
    			t57 = space();
    			img9 = element("img");
    			t58 = space();
    			p9 = element("p");
    			p9.textContent = "รูปนี้ก็เป็นอีกหนึ่งรูปที่เลือกดทนสีที่ชอบมาใส่ในภาพ";
    			t60 = space();
    			hr9 = element("hr");
    			t61 = space();
    			h410 = element("h4");
    			h410.textContent = "รูปที่11";
    			t63 = space();
    			img10 = element("img");
    			t64 = space();
    			p10 = element("p");
    			p10.textContent = "ภาพนี้เป็นทุ่งหญ้าอันกว้างขวางที่มีฉากหลังเป็นฟ้าสดใส";
    			t66 = space();
    			hr10 = element("hr");
    			t67 = space();
    			h411 = element("h4");
    			h411.textContent = "รูปที่12";
    			t69 = space();
    			img11 = element("img");
    			t70 = space();
    			p11 = element("p");
    			p11.textContent = "รูปนี้คือรูปป่าสนที่อยู่ริมทะเลสาบเเละมีภูเขาอยู่ล้อมรอบ";
    			add_location(h2, file, 5, 8, 74);
    			add_location(h40, file, 8, 8, 129);
    			if (!src_url_equal(img0.src, img0_src_value = "https://lh3.googleusercontent.com/-vJa37XPIzRs/YW70RwYT1vI/AAAAAAAAB9w/WumFpnSTBYQumZjgCZMmTpUjK2b8n0j8QCMICGAYYCw/s83-c/1.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file, 11, 8, 176);
    			add_location(p0, file, 12, 8, 326);
    			add_location(hr0, file, 15, 8, 409);
    			add_location(h41, file, 16, 8, 422);
    			if (!src_url_equal(img1.src, img1_src_value = "https://lh3.googleusercontent.com/-mTE8VXATQMs/YW700Ft-QQI/AAAAAAAAB-U/xCivrXoKbB0OwEznTX52Wy4si1i4dJp2gCMICGAYYCw/s83-c/2.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file, 19, 8, 469);
    			add_location(p1, file, 20, 8, 619);
    			add_location(hr1, file, 23, 8, 719);
    			add_location(h42, file, 24, 8, 732);
    			if (!src_url_equal(img2.src, img2_src_value = "https://lh3.googleusercontent.com/-7C6Ws0a_wlc/YW71DsHfQsI/AAAAAAAAB-4/9mtYZ5zux5MIvVXX6y9lC0XFF9dHeJWAQCMICGAYYCw/s83-c/3.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file, 27, 8, 779);
    			add_location(p2, file, 28, 8, 929);
    			add_location(hr2, file, 31, 8, 1020);
    			add_location(h43, file, 32, 8, 1033);
    			if (!src_url_equal(img3.src, img3_src_value = "https://lh3.googleusercontent.com/-l-lkOYodSsw/YW71R29fb2I/AAAAAAAAB_U/YKuO0TB-9PMkrZSfZOA_-rBxagI7qyDmwCMICGAYYCw/s83-c/4.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file, 35, 8, 1080);
    			add_location(p3, file, 36, 8, 1230);
    			add_location(hr3, file, 39, 8, 1314);
    			add_location(h44, file, 40, 8, 1327);
    			if (!src_url_equal(img4.src, img4_src_value = "https://lh3.googleusercontent.com/-Yp52MCWB384/YW71keMbvJI/AAAAAAAAB_4/mmRsw1X2d0sCXAtE3HL1_AxifVipGv1kwCMICGAYYCw/s83-c/5.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file, 43, 8, 1374);
    			add_location(p4, file, 44, 8, 1524);
    			add_location(hr4, file, 47, 8, 1614);
    			add_location(h45, file, 48, 8, 1627);
    			if (!src_url_equal(img5.src, img5_src_value = "https://lh3.googleusercontent.com/-dA93dfhvDJU/YW7102BmYCI/AAAAAAAACAg/D7gUxn7hqQwdJS3EpzPIY6wAQn8_YflvQCMICGAYYCw/s83-c/6.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file, 51, 8, 1674);
    			add_location(p5, file, 52, 8, 1824);
    			add_location(hr5, file, 55, 8, 1947);
    			add_location(h46, file, 56, 8, 1960);
    			if (!src_url_equal(img6.src, img6_src_value = "https://lh3.googleusercontent.com/-_MKn3UW7Q78/YW72Hdxtr-I/AAAAAAAACBE/q3b4ftPTH3w33LTsSrfosWBhG2ofe8YfwCMICGAYYCw/s83-c/7.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			add_location(img6, file, 59, 8, 2007);
    			add_location(p6, file, 60, 8, 2157);
    			add_location(hr6, file, 63, 8, 2253);
    			add_location(h47, file, 64, 8, 2266);
    			if (!src_url_equal(img7.src, img7_src_value = "https://lh3.googleusercontent.com/-7igJwU6Cbi4/YW72XQg0sLI/AAAAAAAACBo/hRA9v1DsvRYsFp_xo6e-WILylhuGbVLTwCMICGAYYCw/s83-c/8.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "");
    			add_location(img7, file, 67, 8, 2313);
    			add_location(p7, file, 68, 8, 2463);
    			add_location(hr7, file, 71, 8, 2554);
    			add_location(h48, file, 72, 8, 2567);
    			if (!src_url_equal(img8.src, img8_src_value = "https://lh3.googleusercontent.com/-GcvQZNqoFj4/YW73amkPF7I/AAAAAAAACCs/ehRIqyZhH6A-L-4A75DvizS-7kv7wDHbwCMICGAYYCw/s83-c/9.jpg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			add_location(img8, file, 75, 8, 2614);
    			add_location(p8, file, 76, 8, 2764);
    			add_location(hr8, file, 77, 8, 2816);
    			add_location(h49, file, 78, 8, 2829);
    			if (!src_url_equal(img9.src, img9_src_value = "https://lh3.googleusercontent.com/-3uQmnZqla9E/YW74QyJwi5I/AAAAAAAACDQ/09ikbeh61XYirxYBE5QmvJmeqL2D__xxQCMICGAYYCw/s83-c/10.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			add_location(img9, file, 81, 8, 2877);
    			add_location(p9, file, 82, 8, 3028);
    			add_location(hr9, file, 83, 8, 3096);
    			add_location(h410, file, 84, 8, 3109);
    			if (!src_url_equal(img10.src, img10_src_value = "https://lh3.googleusercontent.com/-p9i63RYyBPM/YW74hITy7ZI/AAAAAAAACD0/c3D9u2COcs4iPtUUiVQNHoH2Av5EYR-IgCMICGAYYCw/s83-c/11.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "alt", "");
    			add_location(img10, file, 87, 8, 3157);
    			add_location(p10, file, 88, 8, 3308);
    			add_location(hr10, file, 89, 8, 3377);
    			add_location(h411, file, 90, 8, 3390);
    			if (!src_url_equal(img11.src, img11_src_value = "https://lh3.googleusercontent.com/-TfAZ36Cl1LM/YW742Haf-BI/AAAAAAAACEY/KXfoM8gCsAUEP8jPDsHLrPoP_fLSk5ThwCMICGAYYCw/s83-c/12.jpg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			add_location(img11, file, 93, 8, 3438);
    			add_location(p11, file, 94, 8, 3589);
    			attr_dev(body, "align", "center");
    			add_location(body, file, 3, 0, 40);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, body, anchor);
    			append_dev(body, h2);
    			append_dev(body, t1);
    			append_dev(body, h40);
    			append_dev(body, t3);
    			append_dev(body, img0);
    			append_dev(body, t4);
    			append_dev(body, p0);
    			append_dev(body, t6);
    			append_dev(body, hr0);
    			append_dev(body, t7);
    			append_dev(body, h41);
    			append_dev(body, t9);
    			append_dev(body, img1);
    			append_dev(body, t10);
    			append_dev(body, p1);
    			append_dev(body, t12);
    			append_dev(body, hr1);
    			append_dev(body, t13);
    			append_dev(body, h42);
    			append_dev(body, t15);
    			append_dev(body, img2);
    			append_dev(body, t16);
    			append_dev(body, p2);
    			append_dev(body, t18);
    			append_dev(body, hr2);
    			append_dev(body, t19);
    			append_dev(body, h43);
    			append_dev(body, t21);
    			append_dev(body, img3);
    			append_dev(body, t22);
    			append_dev(body, p3);
    			append_dev(body, t24);
    			append_dev(body, hr3);
    			append_dev(body, t25);
    			append_dev(body, h44);
    			append_dev(body, t27);
    			append_dev(body, img4);
    			append_dev(body, t28);
    			append_dev(body, p4);
    			append_dev(body, t30);
    			append_dev(body, hr4);
    			append_dev(body, t31);
    			append_dev(body, h45);
    			append_dev(body, t33);
    			append_dev(body, img5);
    			append_dev(body, t34);
    			append_dev(body, p5);
    			append_dev(body, t36);
    			append_dev(body, hr5);
    			append_dev(body, t37);
    			append_dev(body, h46);
    			append_dev(body, t39);
    			append_dev(body, img6);
    			append_dev(body, t40);
    			append_dev(body, p6);
    			append_dev(body, t42);
    			append_dev(body, hr6);
    			append_dev(body, t43);
    			append_dev(body, h47);
    			append_dev(body, t45);
    			append_dev(body, img7);
    			append_dev(body, t46);
    			append_dev(body, p7);
    			append_dev(body, t48);
    			append_dev(body, hr7);
    			append_dev(body, t49);
    			append_dev(body, h48);
    			append_dev(body, t51);
    			append_dev(body, img8);
    			append_dev(body, t52);
    			append_dev(body, p8);
    			append_dev(body, t54);
    			append_dev(body, hr8);
    			append_dev(body, t55);
    			append_dev(body, h49);
    			append_dev(body, t57);
    			append_dev(body, img9);
    			append_dev(body, t58);
    			append_dev(body, p9);
    			append_dev(body, t60);
    			append_dev(body, hr9);
    			append_dev(body, t61);
    			append_dev(body, h410);
    			append_dev(body, t63);
    			append_dev(body, img10);
    			append_dev(body, t64);
    			append_dev(body, p10);
    			append_dev(body, t66);
    			append_dev(body, hr10);
    			append_dev(body, t67);
    			append_dev(body, h411);
    			append_dev(body, t69);
    			append_dev(body, img11);
    			append_dev(body, t70);
    			append_dev(body, p11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(body);
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
    	let name = 'Cream';
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ name });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) name = $$props.name;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
