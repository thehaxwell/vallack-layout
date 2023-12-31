var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data(text, data) {
		data = '' + data;
		if (text.data === data) return;
		text.data = /** @type {string} */ (data);
	}

	/**
	 * @returns {void} */
	function toggle_class(element, name, toggle) {
		// The `!!` is required because an `undefined` flag means flipping the current state.
		element.classList.toggle(name, !!toggle);
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
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

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
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

	/** @returns {void} */
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

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	/** @returns {void} */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
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
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
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
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	const PUBLIC_VERSION = '4';

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	var d$1=Object.defineProperty;var e=(c,a)=>{for(var b in a)d$1(c,b,{get:a[b],enumerable:!0});};

	var w={};e(w,{convertFileSrc:()=>u$1,invoke:()=>d,transformCallback:()=>s$1});function l(){return window.crypto.getRandomValues(new Uint32Array(1))[0]}function s$1(r,n=!1){let e=l(),t=`_${e}`;return Object.defineProperty(window,t,{value:o=>(n&&Reflect.deleteProperty(window,t),r?.(o)),writable:!1,configurable:!0}),e}async function d(r,n={}){return new Promise((e,t)=>{let o=s$1(i=>{e(i),Reflect.deleteProperty(window,`_${a}`);},!0),a=s$1(i=>{t(i),Reflect.deleteProperty(window,`_${o}`);},!0);window.__TAURI_IPC__({cmd:r,callback:o,error:a,...n});})}function u$1(r,n="asset"){let e=encodeURIComponent(r);return navigator.userAgent.includes("Windows")?`https://${n}.localhost/${e}`:`${n}://localhost/${e}`}

	async function a$1(i){return d("tauri",i)}

	var W={};e(W,{TauriEvent:()=>c,emit:()=>D,listen:()=>E,once:()=>_});async function s(n,t){return a$1({__tauriModule:"Event",message:{cmd:"unlisten",event:n,eventId:t}})}async function m(n,t,r){await a$1({__tauriModule:"Event",message:{cmd:"emit",event:n,windowLabel:t,payload:r}});}async function a(n,t,r){return a$1({__tauriModule:"Event",message:{cmd:"listen",event:n,windowLabel:t,handler:s$1(r)}}).then(i=>async()=>s(n,i))}async function u(n,t,r){return a(n,t,i=>{r(i),s(n,i.id).catch(()=>{});})}var c=(e=>(e.WINDOW_RESIZED="tauri://resize",e.WINDOW_MOVED="tauri://move",e.WINDOW_CLOSE_REQUESTED="tauri://close-requested",e.WINDOW_CREATED="tauri://window-created",e.WINDOW_DESTROYED="tauri://destroyed",e.WINDOW_FOCUS="tauri://focus",e.WINDOW_BLUR="tauri://blur",e.WINDOW_SCALE_FACTOR_CHANGED="tauri://scale-change",e.WINDOW_THEME_CHANGED="tauri://theme-changed",e.WINDOW_FILE_DROP="tauri://file-drop",e.WINDOW_FILE_DROP_HOVER="tauri://file-drop-hover",e.WINDOW_FILE_DROP_CANCELLED="tauri://file-drop-cancelled",e.MENU="tauri://menu",e.CHECK_UPDATE="tauri://update",e.UPDATE_AVAILABLE="tauri://update-available",e.INSTALL_UPDATE="tauri://update-install",e.STATUS_UPDATE="tauri://update-status",e.DOWNLOAD_PROGRESS="tauri://update-download-progress",e))(c||{});async function E(n,t){return a(n,null,t)}async function _(n,t){return u(n,null,t)}async function D(n,t){return m(n,void 0,t)}

	function listen(callback) {
	  if (typeof window.__TAURI__ == "undefined") {
	    callback({layer: 0});
	  }
	  else {
	    callback({layer: window.__START_LAYER__});
	    E('update-keyboard', (event) => callback(event.payload)).then();
	  }
	}

	/* src/lib/Circle/Normal.svelte generated by Svelte v4.2.0 */

	function create_fragment$a(ctx) {
		let div6;
		let div2;
		let div0;
		let t0_value = /*labels*/ ctx[0].north + "";
		let t0;
		let t1;
		let div1;
		let t2_value = /*labels*/ ctx[0].east + "";
		let t2;
		let t3;
		let div5;
		let div3;
		let t4_value = /*labels*/ ctx[0].west + "";
		let t4;
		let t5;
		let div4;
		let t6_value = /*labels*/ ctx[0].south + "";
		let t6;

		return {
			c() {
				div6 = element("div");
				div2 = element("div");
				div0 = element("div");
				t0 = text(t0_value);
				t1 = space();
				div1 = element("div");
				t2 = text(t2_value);
				t3 = space();
				div5 = element("div");
				div3 = element("div");
				t4 = text(t4_value);
				t5 = space();
				div4 = element("div");
				t6 = text(t6_value);
				attr(div0, "class", "kbd svelte-r1gen5");
				attr(div1, "class", "kbd svelte-r1gen5");
				attr(div2, "class", "flex svelte-r1gen5");
				attr(div3, "class", "kbd svelte-r1gen5");
				attr(div4, "class", "kbd svelte-r1gen5");
				attr(div5, "class", "flex svelte-r1gen5");
				attr(div6, "class", "switches-container svelte-r1gen5");
				toggle_class(div6, "active", /*isActive*/ ctx[1]);
			},
			m(target, anchor) {
				insert(target, div6, anchor);
				append(div6, div2);
				append(div2, div0);
				append(div0, t0);
				append(div2, t1);
				append(div2, div1);
				append(div1, t2);
				append(div6, t3);
				append(div6, div5);
				append(div5, div3);
				append(div3, t4);
				append(div5, t5);
				append(div5, div4);
				append(div4, t6);
			},
			p(ctx, [dirty]) {
				if (dirty & /*labels*/ 1 && t0_value !== (t0_value = /*labels*/ ctx[0].north + "")) set_data(t0, t0_value);
				if (dirty & /*labels*/ 1 && t2_value !== (t2_value = /*labels*/ ctx[0].east + "")) set_data(t2, t2_value);
				if (dirty & /*labels*/ 1 && t4_value !== (t4_value = /*labels*/ ctx[0].west + "")) set_data(t4, t4_value);
				if (dirty & /*labels*/ 1 && t6_value !== (t6_value = /*labels*/ ctx[0].south + "")) set_data(t6, t6_value);

				if (dirty & /*isActive*/ 2) {
					toggle_class(div6, "active", /*isActive*/ ctx[1]);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div6);
				}
			}
		};
	}

	function instance$a($$self, $$props, $$invalidate) {
		let { labels = { north: "", east: "", south: "", west: "" } } = $$props;
		let { isActive = false } = $$props;

		$$self.$$set = $$props => {
			if ('labels' in $$props) $$invalidate(0, labels = $$props.labels);
			if ('isActive' in $$props) $$invalidate(1, isActive = $$props.isActive);
		};

		return [labels, isActive];
	}

	class Normal extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$a, create_fragment$a, safe_not_equal, { labels: 0, isActive: 1 });
		}
	}

	/* src/lib/Circle/MouseButtons.svelte generated by Svelte v4.2.0 */

	function create_fragment$9(ctx) {
		let div6;

		return {
			c() {
				div6 = element("div");
				div6.innerHTML = `<div class="flex svelte-r1gen5"><div class="kbd svelte-r1gen5"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6C4 4.93913 4.42143 3.92172 5.17157 3.17157C5.92172 2.42143 6.93913 2 8 2C9.06087 2 10.0783 2.42143 10.8284 3.17157C11.5786 3.92172 12 4.93913 12 6V10C12 11.0609 11.5786 12.0783 10.8284 12.8284C10.0783 13.5786 9.06087 14 8 14C6.93913 14 5.92172 13.5786 5.17157 12.8284C4.42143 12.0783 4 11.0609 4 10V6Z" stroke="black" stroke-width="1.5" stroke-linejoin="round"></path><path d="M8 4.66667V7.33334" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></div> <div class="kbd svelte-r1gen5"><svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 15.5833C7.13055 15.5833 5.96181 15.0993 4.99375 14.1313C4.02569 13.1632 3.54167 11.9944 3.54167 10.625V6.375C3.54167 5.00556 4.02569 3.83681 4.99375 2.86876C5.96181 1.9007 7.13055 1.41667 8.5 1.41667C9.86944 1.41667 11.0382 1.9007 12.0062 2.86876C12.9743 3.83681 13.4583 5.00556 13.4583 6.375V10.625C13.4583 11.9944 12.9743 13.1632 12.0062 14.1313C11.0382 15.0993 9.86944 15.5833 8.5 15.5833ZM4.95833 6.375H7.79167V2.90417C6.97708 3.06945 6.3011 3.47674 5.76371 4.12605C5.22632 4.77535 4.95786 5.525 4.95833 6.375ZM8.5 14.1667C9.47986 14.1667 10.3152 13.8212 11.0061 13.1304C11.6969 12.4395 12.0421 11.6044 12.0417 10.625V7.79167H4.95833V10.625C4.95833 11.6049 5.30376 12.4402 5.99462 13.1311C6.68549 13.8219 7.52061 14.1671 8.5 14.1667Z" fill="black"></path></svg></div></div> <div class="flex svelte-r1gen5"><div class="kbd svelte-r1gen5"><svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none"><g clip-path="url(#clip0_16_2)"><path d="M18.2452 0.875005C17.7144 0.904197 17.1907 1.03954 16.7245 1.26247C15.4817 1.85516 14.4458 2.9052 13.6567 3.69516C13.579 3.75732 13.5153 3.83516 13.4697 3.92361C13.4241 4.01206 13.3977 4.10913 13.3922 4.20849C13.3866 4.30784 13.4021 4.40724 13.4376 4.5002C13.4731 4.59316 13.5278 4.6776 13.5981 4.74799C13.6684 4.81838 13.7528 4.87315 13.8458 4.90872C13.9387 4.94429 14.0381 4.95987 14.1374 4.95443C14.2368 4.94899 14.3339 4.92266 14.4224 4.87716C14.5109 4.83165 14.5888 4.768 14.651 4.69035C15.4295 3.91189 16.4114 3.00074 17.3332 2.56108C17.794 2.3417 18.2107 2.24439 18.6043 2.28508C18.998 2.32577 19.4032 2.47527 19.849 2.92024C20.6 3.67216 20.6425 4.30554 20.3178 5.18751C19.995 6.06947 19.1882 7.12039 18.2178 8.08993C17.2889 9.01877 16.5954 9.88393 16.2822 10.7995C16.1227 11.2542 16.0952 11.7447 16.2029 12.2144C16.3106 12.6841 16.5491 13.1136 16.8908 13.4534C17.618 14.1805 18.6698 14.3468 19.627 13.9779C20.585 13.6099 21.5404 12.8394 22.6125 11.7664C22.6902 11.7042 22.7538 11.6263 22.7993 11.5378C22.8448 11.4493 22.8712 11.3522 22.8766 11.2528C22.8821 11.1535 22.8665 11.0541 22.8309 10.9612C22.7953 10.8682 22.7406 10.7838 22.6702 10.7135C22.5998 10.6432 22.5153 10.5885 22.4224 10.553C22.3294 10.5175 22.23 10.502 22.1307 10.5075C22.0313 10.5131 21.9343 10.5395 21.8458 10.5851C21.7573 10.6307 21.6795 10.6944 21.6173 10.7721C20.6098 11.7797 19.742 12.4157 19.1298 12.651C18.5177 12.8872 18.2744 12.8465 17.886 12.4582C17.488 12.0601 17.449 11.7929 17.6366 11.2418C17.825 10.6907 18.3602 9.93789 19.213 9.08512C20.2524 8.04658 21.1936 6.91781 21.6457 5.68466C22.0968 4.45327 21.9358 3.01754 20.8433 1.92504C20.2117 1.29254 19.4952 0.949313 18.7707 0.875005C18.5958 0.860838 18.4201 0.860838 18.2452 0.875005ZM8.79042 3.52885C7.38164 3.61191 6.05317 4.21235 5.06 5.21493L4.11877 6.15616L7.68554 9.72204L8.65242 8.75427C8.51116 8.47133 8.46191 8.1513 8.51156 7.83897C8.56121 7.52665 8.70727 7.23766 8.92931 7.01247L9.89708 6.04558C10.1221 5.82362 10.411 5.67759 10.7231 5.62794C11.0353 5.5783 11.3552 5.62751 11.638 5.7687L12.6606 4.74608C11.5595 3.88831 10.1861 3.45616 8.79219 3.52885H8.79042ZM13.7115 5.76781L12.6332 6.84616C12.7393 7.11688 12.7644 7.41259 12.7055 7.69732C12.6466 7.98205 12.5062 8.24353 12.3015 8.44997L11.3337 9.41685C11.1273 9.62143 10.866 9.76169 10.5815 9.82058C10.2969 9.87947 10.0014 9.85446 9.73077 9.74858L8.70815 10.7712L12.3015 14.338L13.2418 13.3976C15.326 11.3135 15.4728 8.03774 13.7115 5.76781ZM10.9745 6.48701C10.8075 6.49149 10.6488 6.561 10.5322 6.68074L9.56446 7.64762C9.44884 7.76581 9.38409 7.92458 9.38409 8.08993C9.38409 8.25527 9.44884 8.41404 9.56446 8.53224L9.81392 8.78081C9.93001 8.90135 10.0889 8.97127 10.2562 8.97543C10.4234 8.97089 10.5822 8.90103 10.6985 8.78081L11.6663 7.81393C11.7861 7.69749 11.8554 7.53864 11.8592 7.37162C11.8549 7.20453 11.7853 7.04577 11.6654 6.92931L11.4177 6.68074C11.3604 6.62082 11.2918 6.57278 11.216 6.53939C11.1401 6.506 11.0583 6.48789 10.9754 6.48612L10.9745 6.48701ZM3.26158 7.01247L1.93465 8.31108C-0.325539 10.5722 -0.325539 14.2601 1.93465 16.5212C2.47189 17.0586 3.10973 17.4848 3.81173 17.7756C4.51373 18.0665 5.26614 18.2162 6.026 18.2162C6.78586 18.2162 7.53827 18.0665 8.24027 17.7756C8.94227 17.4848 9.58011 17.0586 10.1173 16.5212L11.4443 15.1943L3.26158 7.01247Z" fill="black"></path><path d="M18 19.5L12.75 22.5311V16.4689L18 19.5Z" fill="black"></path><path d="M23 19.5L17.75 22.5311V16.4689L23 19.5Z" fill="black"></path></g><defs><clipPath id="clip0_16_2"><rect width="23" height="23" fill="white"></rect></clipPath></defs></svg></div> <div class="kbd svelte-r1gen5"><svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 15.5833C7.13055 15.5833 5.96181 15.0993 4.99375 14.1313C4.02569 13.1632 3.54167 11.9944 3.54167 10.625V6.375C3.54167 5.00556 4.02569 3.83681 4.99375 2.86876C5.96181 1.9007 7.13055 1.41667 8.5 1.41667C9.86944 1.41667 11.0382 1.9007 12.0062 2.86876C12.9743 3.83681 13.4583 5.00556 13.4583 6.375V10.625C13.4583 11.9944 12.9743 13.1632 12.0062 14.1313C11.0382 15.0993 9.86944 15.5833 8.5 15.5833ZM9.20833 6.375H12.0417C12.0417 5.525 11.7732 4.77535 11.2363 4.12605C10.6994 3.47674 10.0234 3.06945 9.20833 2.90417V6.375ZM8.5 14.1667C9.47986 14.1667 10.3152 13.8212 11.0061 13.1304C11.6969 12.4395 12.0421 11.6044 12.0417 10.625V7.79167H4.95833V10.625C4.95833 11.6049 5.30376 12.4402 5.99462 13.1311C6.68549 13.8219 7.52061 14.1671 8.5 14.1667Z" fill="black"></path></svg></div></div>`;
				attr(div6, "class", "switches-container svelte-r1gen5");
				toggle_class(div6, "active", /*isActive*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, div6, anchor);
			},
			p(ctx, [dirty]) {
				if (dirty & /*isActive*/ 1) {
					toggle_class(div6, "active", /*isActive*/ ctx[0]);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div6);
				}
			}
		};
	}

	function instance$9($$self, $$props, $$invalidate) {
		const labels = [];
		let { isActive = false } = $$props;

		$$self.$$set = $$props => {
			if ('isActive' in $$props) $$invalidate(0, isActive = $$props.isActive);
		};

		return [isActive, labels];
	}

	class MouseButtons extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$9, create_fragment$9, safe_not_equal, { labels: 1, isActive: 0 });
		}

		get labels() {
			return this.$$.ctx[1];
		}
	}

	/* src/lib/Circle/DirectionalArrows.svelte generated by Svelte v4.2.0 */

	function create_fragment$8(ctx) {
		let div6;

		return {
			c() {
				div6 = element("div");
				div6.innerHTML = `<div class="flex svelte-r1gen5"><div class="kbd svelte-r1gen5"><svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.94 0L0 6H4V16H6V6H10L4.94 0Z" fill="black"></path></svg></div> <div class="kbd svelte-r1gen5"><svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0V4H0V6H10V10L16 4.94L10 0Z" fill="black"></path></svg></div></div> <div class="flex svelte-r1gen5"><div class="kbd svelte-r1gen5"><svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 0L0 5.06L6 10V6H16V4H6V0Z" fill="black"></path></svg></div> <div class="kbd svelte-r1gen5"><svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0V10H0L5.06 16L10 10H6V0H4Z" fill="black"></path></svg></div></div>`;
				attr(div6, "class", "switches-container svelte-r1gen5");
				toggle_class(div6, "active", /*isActive*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, div6, anchor);
			},
			p(ctx, [dirty]) {
				if (dirty & /*isActive*/ 1) {
					toggle_class(div6, "active", /*isActive*/ ctx[0]);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div6);
				}
			}
		};
	}

	function instance$8($$self, $$props, $$invalidate) {
		const labels = [];
		let { isActive = false } = $$props;

		$$self.$$set = $$props => {
			if ('isActive' in $$props) $$invalidate(0, isActive = $$props.isActive);
		};

		return [isActive, labels];
	}

	class DirectionalArrows extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$8, create_fragment$8, safe_not_equal, { labels: 1, isActive: 0 });
		}

		get labels() {
			return this.$$.ctx[1];
		}
	}

	/* src/lib/Circle/MouseCursor.svelte generated by Svelte v4.2.0 */

	function create_fragment$7(ctx) {
		let div;

		return {
			c() {
				div = element("div");
				div.innerHTML = `<svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18.2452 2.87501C17.7144 2.9042 17.1907 3.03954 16.7245 3.26247C15.4816 3.85516 14.4458 4.9052 13.6567 5.69516C13.579 5.75732 13.5153 5.83516 13.4697 5.92361C13.4241 6.01206 13.3977 6.10913 13.3921 6.20849C13.3866 6.30784 13.4021 6.40724 13.4376 6.5002C13.4731 6.59316 13.5278 6.6776 13.5981 6.74799C13.6684 6.81838 13.7528 6.87315 13.8458 6.90872C13.9387 6.94429 14.0381 6.95987 14.1374 6.95443C14.2368 6.94899 14.3339 6.92266 14.4224 6.87716C14.5109 6.83165 14.5888 6.768 14.651 6.69035C15.4295 5.91189 16.4114 5.00074 17.3331 4.56108C17.794 4.3417 18.2107 4.24439 18.6043 4.28508C18.998 4.32577 19.4031 4.47527 19.849 4.92024C20.6 5.67216 20.6425 6.30554 20.3178 7.18751C19.995 8.06947 19.1882 9.12039 18.2178 10.0899C17.2889 11.0188 16.5954 11.8839 16.2822 12.7995C16.1227 13.2542 16.0952 13.7447 16.2029 14.2144C16.3106 14.6841 16.5491 15.1136 16.8908 15.4534C17.618 16.1805 18.6698 16.3468 19.627 15.9779C20.585 15.6099 21.5404 14.8394 22.6125 13.7664C22.6902 13.7042 22.7538 13.6263 22.7993 13.5378C22.8448 13.4493 22.8712 13.3522 22.8766 13.2528C22.882 13.1535 22.8665 13.0541 22.8309 12.9612C22.7953 12.8682 22.7406 12.7838 22.6702 12.7135C22.5998 12.6432 22.5153 12.5885 22.4224 12.553C22.3294 12.5175 22.23 12.502 22.1307 12.5075C22.0313 12.5131 21.9342 12.5395 21.8458 12.5851C21.7573 12.6307 21.6795 12.6944 21.6173 12.7721C20.6098 13.7797 19.742 14.4157 19.1298 14.651C18.5176 14.8872 18.2744 14.8465 17.886 14.4582C17.488 14.0601 17.449 13.7929 17.6366 13.2418C17.825 12.6907 18.3602 11.9379 19.213 11.0851C20.2524 10.0466 21.1936 8.91781 21.6456 7.68466C22.0968 6.45327 21.9358 5.01754 20.8433 3.92504C20.2117 3.29254 19.4951 2.94931 18.7706 2.87501C18.5958 2.86084 18.4201 2.86084 18.2452 2.87501ZM8.79042 5.52885C7.38164 5.61191 6.05317 6.21235 5.05999 7.21493L4.11876 8.15616L7.68553 11.722L8.65242 10.7543C8.51116 10.4713 8.4619 10.1513 8.51155 9.83897C8.5612 9.52665 8.70726 9.23766 8.9293 9.01247L9.89707 8.04558C10.1221 7.82362 10.411 7.67759 10.7231 7.62794C11.0353 7.5783 11.3552 7.62751 11.638 7.7687L12.6606 6.74608C11.5595 5.88831 10.1861 5.45616 8.79218 5.52885H8.79042ZM13.7115 7.76781L12.6332 8.84616C12.7392 9.11688 12.7644 9.41259 12.7055 9.69732C12.6466 9.98205 12.5062 10.2435 12.3015 10.45L11.3337 11.4169C11.1273 11.6214 10.866 11.7617 10.5814 11.8206C10.2969 11.8795 10.0014 11.8545 9.73076 11.7486L8.70815 12.7712L12.3015 16.338L13.2418 15.3976C15.326 13.3135 15.4728 10.0377 13.7115 7.76781ZM10.9745 8.48701C10.8075 8.49149 10.6488 8.561 10.5322 8.68074L9.56445 9.64762C9.44883 9.76581 9.38408 9.92458 9.38408 10.0899C9.38408 10.2553 9.44883 10.414 9.56445 10.5322L9.81392 10.7808C9.93001 10.9013 10.0889 10.9713 10.2562 10.9754C10.4234 10.9709 10.5822 10.901 10.6985 10.7808L11.6663 9.81393C11.7861 9.69749 11.8554 9.53864 11.8591 9.37162C11.8548 9.20453 11.7853 9.04577 11.6654 8.92931L11.4177 8.68074C11.3604 8.62082 11.2918 8.57278 11.2159 8.53939C11.14 8.506 11.0583 8.48789 10.9754 8.48612L10.9745 8.48701ZM3.26157 9.01247L1.93465 10.3111C-0.325546 12.5722 -0.325546 16.2601 1.93465 18.5212C2.47189 19.0586 3.10972 19.4848 3.81172 19.7756C4.51372 20.0665 5.26613 20.2162 6.02599 20.2162C6.78585 20.2162 7.53826 20.0665 8.24026 19.7756C8.94226 19.4848 9.5801 19.0586 10.1173 18.5212L11.4443 17.1943L3.26157 9.01247Z" fill="black"></path></svg>`;
				attr(div, "class", "cardinal-levers-container svelte-1oe5snq");
				toggle_class(div, "active", /*isActive*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, div, anchor);
			},
			p(ctx, [dirty]) {
				if (dirty & /*isActive*/ 1) {
					toggle_class(div, "active", /*isActive*/ ctx[0]);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function instance$7($$self, $$props, $$invalidate) {
		const labels = [];
		let { isActive = false } = $$props;

		$$self.$$set = $$props => {
			if ('isActive' in $$props) $$invalidate(0, isActive = $$props.isActive);
		};

		return [isActive, labels];
	}

	class MouseCursor extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$7, create_fragment$7, safe_not_equal, { labels: 1, isActive: 0 });
		}

		get labels() {
			return this.$$.ctx[1];
		}
	}

	/* src/lib/Circle/MouseScroll.svelte generated by Svelte v4.2.0 */

	function create_fragment$6(ctx) {
		let div2;

		return {
			c() {
				div2 = element("div");

				div2.innerHTML = `<div class="flex svelte-1pcrdqi"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.172 16.818L7.757 18.232L12 22.475L16.243 18.232L14.828 16.818L12 19.647L9.172 16.818ZM14.828 7.18199L16.243 5.76799L12 1.52499L7.757 5.76799L9.172 7.18199L12 4.35399L14.828 7.18199Z" fill="black"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9ZM12 11C12.2652 11 12.5196 11.1054 12.7071 11.2929C12.8946 11.4804 13 11.7348 13 12C13 12.2652 12.8946 12.5196 12.7071 12.7071C12.5196 12.8946 12.2652 13 12 13C11.7348 13 11.4804 12.8946 11.2929 12.7071C11.1054 12.5196 11 12.2652 11 12C11 11.7348 11.1054 11.4804 11.2929 11.2929C11.4804 11.1054 11.7348 11 12 11Z" fill="black"></path></svg>
    +
    <div class="ml-1 flex items-center svelte-1pcrdqi"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.182 9.17199L5.768 7.75699L1.525 12L5.768 16.243L7.182 14.828L4.353 12L7.182 9.17199ZM16.818 14.828L18.232 16.243L22.475 12L18.232 7.75699L16.818 9.17199L19.646 12L16.818 14.828Z" fill="black"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12ZM13 12C13 12.2652 12.8946 12.5196 12.7071 12.7071C12.5196 12.8946 12.2652 13 12 13C11.7348 13 11.4804 12.8946 11.2929 12.7071C11.1054 12.5196 11 12.2652 11 12C11 11.7348 11.1054 11.4804 11.2929 11.2929C11.4804 11.1054 11.7348 11 12 11C12.2652 11 12.5196 11.1054 12.7071 11.2929C12.8946 11.4804 13 11.7348 13 12Z" fill="black"></path></svg></div></div>`;

				attr(div2, "class", "cardinal-levers-container svelte-1pcrdqi");
				toggle_class(div2, "active", /*isActive*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, div2, anchor);
			},
			p(ctx, [dirty]) {
				if (dirty & /*isActive*/ 1) {
					toggle_class(div2, "active", /*isActive*/ ctx[0]);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div2);
				}
			}
		};
	}

	function instance$6($$self, $$props, $$invalidate) {
		const labels = [];
		let { isActive = false } = $$props;

		$$self.$$set = $$props => {
			if ('isActive' in $$props) $$invalidate(0, isActive = $$props.isActive);
		};

		return [isActive, labels];
	}

	class MouseScroll extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$6, create_fragment$6, safe_not_equal, { labels: 1, isActive: 0 });
		}

		get labels() {
			return this.$$.ctx[1];
		}
	}

	/* src/lib/Circle/ModifierKeys.svelte generated by Svelte v4.2.0 */

	function create_fragment$5(ctx) {
		let div6;

		return {
			c() {
				div6 = element("div");
				div6.innerHTML = `<div class="flex svelte-1lmfb2x"><div class="kbd svelte-1lmfb2x">Win <br/> only</div> <div class="kbd svelte-1lmfb2x">+ <br/> Shift</div></div> <div class="flex svelte-1lmfb2x"><div class="kbd svelte-1lmfb2x">+ <br/> Alt</div> <div class="kbd svelte-1lmfb2x">Alt <br/> only</div></div>`;
				attr(div6, "class", "switches-container svelte-1lmfb2x");
				toggle_class(div6, "active", /*isActive*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, div6, anchor);
			},
			p(ctx, [dirty]) {
				if (dirty & /*isActive*/ 1) {
					toggle_class(div6, "active", /*isActive*/ ctx[0]);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div6);
				}
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		const labels = [];
		let { isActive = false } = $$props;

		$$self.$$set = $$props => {
			if ('isActive' in $$props) $$invalidate(0, isActive = $$props.isActive);
		};

		return [isActive, labels];
	}

	class ModifierKeys extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$5, create_fragment$5, safe_not_equal, { labels: 1, isActive: 0 });
		}

		get labels() {
			return this.$$.ctx[1];
		}
	}

	/* src/lib/SpecialCircleContainer.svelte generated by Svelte v4.2.0 */

	function create_else_block$1(ctx) {
		let t;

		return {
			c() {
				t = text("(Unknown special circle)");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			p: noop,
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (21:46) 
	function create_if_block_4(ctx) {
		let modifierkeys;
		let current;
		modifierkeys = new ModifierKeys({ props: { isActive: /*isActive*/ ctx[0] } });

		return {
			c() {
				create_component(modifierkeys.$$.fragment);
			},
			m(target, anchor) {
				mount_component(modifierkeys, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const modifierkeys_changes = {};
				if (dirty & /*isActive*/ 1) modifierkeys_changes.isActive = /*isActive*/ ctx[0];
				modifierkeys.$set(modifierkeys_changes);
			},
			i(local) {
				if (current) return;
				transition_in(modifierkeys.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(modifierkeys.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(modifierkeys, detaching);
			}
		};
	}

	// (19:41) 
	function create_if_block_3$1(ctx) {
		let directionarrows;
		let current;
		directionarrows = new DirectionalArrows({ props: { isActive: /*isActive*/ ctx[0] } });

		return {
			c() {
				create_component(directionarrows.$$.fragment);
			},
			m(target, anchor) {
				mount_component(directionarrows, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const directionarrows_changes = {};
				if (dirty & /*isActive*/ 1) directionarrows_changes.isActive = /*isActive*/ ctx[0];
				directionarrows.$set(directionarrows_changes);
			},
			i(local) {
				if (current) return;
				transition_in(directionarrows.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(directionarrows.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(directionarrows, detaching);
			}
		};
	}

	// (17:35) 
	function create_if_block_2$1(ctx) {
		let mousecursor;
		let current;
		mousecursor = new MouseCursor({ props: { isActive: /*isActive*/ ctx[0] } });

		return {
			c() {
				create_component(mousecursor.$$.fragment);
			},
			m(target, anchor) {
				mount_component(mousecursor, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const mousecursor_changes = {};
				if (dirty & /*isActive*/ 1) mousecursor_changes.isActive = /*isActive*/ ctx[0];
				mousecursor.$set(mousecursor_changes);
			},
			i(local) {
				if (current) return;
				transition_in(mousecursor.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(mousecursor.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(mousecursor, detaching);
			}
		};
	}

	// (15:35) 
	function create_if_block_1$1(ctx) {
		let mousescroll;
		let current;
		mousescroll = new MouseScroll({ props: { isActive: /*isActive*/ ctx[0] } });

		return {
			c() {
				create_component(mousescroll.$$.fragment);
			},
			m(target, anchor) {
				mount_component(mousescroll, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const mousescroll_changes = {};
				if (dirty & /*isActive*/ 1) mousescroll_changes.isActive = /*isActive*/ ctx[0];
				mousescroll.$set(mousescroll_changes);
			},
			i(local) {
				if (current) return;
				transition_in(mousescroll.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(mousescroll.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(mousescroll, detaching);
			}
		};
	}

	// (13:2) {#if type == "mouse-buttons"}
	function create_if_block$1(ctx) {
		let mousebuttons;
		let current;
		mousebuttons = new MouseButtons({ props: { isActive: /*isActive*/ ctx[0] } });

		return {
			c() {
				create_component(mousebuttons.$$.fragment);
			},
			m(target, anchor) {
				mount_component(mousebuttons, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const mousebuttons_changes = {};
				if (dirty & /*isActive*/ 1) mousebuttons_changes.isActive = /*isActive*/ ctx[0];
				mousebuttons.$set(mousebuttons_changes);
			},
			i(local) {
				if (current) return;
				transition_in(mousebuttons.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(mousebuttons.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(mousebuttons, detaching);
			}
		};
	}

	function create_fragment$4(ctx) {
		let div;
		let current_block_type_index;
		let if_block;
		let current;

		const if_block_creators = [
			create_if_block$1,
			create_if_block_1$1,
			create_if_block_2$1,
			create_if_block_3$1,
			create_if_block_4,
			create_else_block$1
		];

		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*type*/ ctx[1] == "mouse-buttons") return 0;
			if (/*type*/ ctx[1] == "mouse-scroll") return 1;
			if (/*type*/ ctx[1] == "mouse-cursor") return 2;
			if (/*type*/ ctx[1] == "directional-arrows") return 3;
			if (/*type*/ ctx[1] == "shortcuts-modifier-keys") return 4;
			return 5;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				div = element("div");
				if_block.c();
			},
			m(target, anchor) {
				insert(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div, null);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				if_blocks[current_block_type_index].d();
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { isActive = false } = $$props;
		let { type = "" } = $$props;

		$$self.$$set = $$props => {
			if ('isActive' in $$props) $$invalidate(0, isActive = $$props.isActive);
			if ('type' in $$props) $$invalidate(1, type = $$props.type);
		};

		return [isActive, type];
	}

	class SpecialCircleContainer extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$4, create_fragment$4, safe_not_equal, { isActive: 0, type: 1 });
		}
	}

	/* src/lib/Layer.svelte generated by Svelte v4.2.0 */

	function create_else_block_3(ctx) {
		let normal;
		let current;

		normal = new Normal({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: /*labels*/ ctx[1].leftUpper
				}
			});

		return {
			c() {
				create_component(normal.$$.fragment);
			},
			m(target, anchor) {
				mount_component(normal, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const normal_changes = {};
				if (dirty & /*isActive*/ 1) normal_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) normal_changes.labels = /*labels*/ ctx[1].leftUpper;
				normal.$set(normal_changes);
			},
			i(local) {
				if (current) return;
				transition_in(normal.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(normal.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(normal, detaching);
			}
		};
	}

	// (22:6) {#if labels.leftUpper.hasOwnProperty("special")}
	function create_if_block_3(ctx) {
		let specialcirclecontainer;
		let current;

		specialcirclecontainer = new SpecialCircleContainer({
				props: {
					isActive: /*isActive*/ ctx[0],
					type: /*labels*/ ctx[1].leftUpper.special
				}
			});

		return {
			c() {
				create_component(specialcirclecontainer.$$.fragment);
			},
			m(target, anchor) {
				mount_component(specialcirclecontainer, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const specialcirclecontainer_changes = {};
				if (dirty & /*isActive*/ 1) specialcirclecontainer_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) specialcirclecontainer_changes.type = /*labels*/ ctx[1].leftUpper.special;
				specialcirclecontainer.$set(specialcirclecontainer_changes);
			},
			i(local) {
				if (current) return;
				transition_in(specialcirclecontainer.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(specialcirclecontainer.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(specialcirclecontainer, detaching);
			}
		};
	}

	// (31:6) {:else}
	function create_else_block_2(ctx) {
		let normal;
		let current;

		normal = new Normal({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: /*labels*/ ctx[1].rightUpper
				}
			});

		return {
			c() {
				create_component(normal.$$.fragment);
			},
			m(target, anchor) {
				mount_component(normal, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const normal_changes = {};
				if (dirty & /*isActive*/ 1) normal_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) normal_changes.labels = /*labels*/ ctx[1].rightUpper;
				normal.$set(normal_changes);
			},
			i(local) {
				if (current) return;
				transition_in(normal.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(normal.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(normal, detaching);
			}
		};
	}

	// (29:6) {#if labels.rightUpper.hasOwnProperty("special")}
	function create_if_block_2(ctx) {
		let specialcirclecontainer;
		let current;

		specialcirclecontainer = new SpecialCircleContainer({
				props: {
					isActive: /*isActive*/ ctx[0],
					type: /*labels*/ ctx[1].rightUpper.special
				}
			});

		return {
			c() {
				create_component(specialcirclecontainer.$$.fragment);
			},
			m(target, anchor) {
				mount_component(specialcirclecontainer, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const specialcirclecontainer_changes = {};
				if (dirty & /*isActive*/ 1) specialcirclecontainer_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) specialcirclecontainer_changes.type = /*labels*/ ctx[1].rightUpper.special;
				specialcirclecontainer.$set(specialcirclecontainer_changes);
			},
			i(local) {
				if (current) return;
				transition_in(specialcirclecontainer.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(specialcirclecontainer.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(specialcirclecontainer, detaching);
			}
		};
	}

	// (40:6) {:else}
	function create_else_block_1(ctx) {
		let normal;
		let current;

		normal = new Normal({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: /*labels*/ ctx[1].leftLower
				}
			});

		return {
			c() {
				create_component(normal.$$.fragment);
			},
			m(target, anchor) {
				mount_component(normal, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const normal_changes = {};
				if (dirty & /*isActive*/ 1) normal_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) normal_changes.labels = /*labels*/ ctx[1].leftLower;
				normal.$set(normal_changes);
			},
			i(local) {
				if (current) return;
				transition_in(normal.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(normal.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(normal, detaching);
			}
		};
	}

	// (38:6) {#if labels.leftLower.hasOwnProperty("special")}
	function create_if_block_1(ctx) {
		let specialcirclecontainer;
		let current;

		specialcirclecontainer = new SpecialCircleContainer({
				props: {
					isActive: /*isActive*/ ctx[0],
					type: /*labels*/ ctx[1].leftLower.special
				}
			});

		return {
			c() {
				create_component(specialcirclecontainer.$$.fragment);
			},
			m(target, anchor) {
				mount_component(specialcirclecontainer, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const specialcirclecontainer_changes = {};
				if (dirty & /*isActive*/ 1) specialcirclecontainer_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) specialcirclecontainer_changes.type = /*labels*/ ctx[1].leftLower.special;
				specialcirclecontainer.$set(specialcirclecontainer_changes);
			},
			i(local) {
				if (current) return;
				transition_in(specialcirclecontainer.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(specialcirclecontainer.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(specialcirclecontainer, detaching);
			}
		};
	}

	// (47:6) {:else}
	function create_else_block(ctx) {
		let normal;
		let current;

		normal = new Normal({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: /*labels*/ ctx[1].rightLower
				}
			});

		return {
			c() {
				create_component(normal.$$.fragment);
			},
			m(target, anchor) {
				mount_component(normal, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const normal_changes = {};
				if (dirty & /*isActive*/ 1) normal_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) normal_changes.labels = /*labels*/ ctx[1].rightLower;
				normal.$set(normal_changes);
			},
			i(local) {
				if (current) return;
				transition_in(normal.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(normal.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(normal, detaching);
			}
		};
	}

	// (45:6) {#if labels.rightLower.hasOwnProperty("special")}
	function create_if_block(ctx) {
		let specialcirclecontainer;
		let current;

		specialcirclecontainer = new SpecialCircleContainer({
				props: {
					isActive: /*isActive*/ ctx[0],
					type: /*labels*/ ctx[1].rightLower.special
				}
			});

		return {
			c() {
				create_component(specialcirclecontainer.$$.fragment);
			},
			m(target, anchor) {
				mount_component(specialcirclecontainer, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const specialcirclecontainer_changes = {};
				if (dirty & /*isActive*/ 1) specialcirclecontainer_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) specialcirclecontainer_changes.type = /*labels*/ ctx[1].rightLower.special;
				specialcirclecontainer.$set(specialcirclecontainer_changes);
			},
			i(local) {
				if (current) return;
				transition_in(specialcirclecontainer.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(specialcirclecontainer.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(specialcirclecontainer, detaching);
			}
		};
	}

	function create_fragment$3(ctx) {
		let div1;
		let div0;
		let span0;
		let t1;
		let span1;
		let t3;
		let div8;
		let div4;
		let div2;
		let show_if_3;
		let current_block_type_index;
		let if_block0;
		let t4;
		let div3;
		let show_if_2;
		let current_block_type_index_1;
		let if_block1;
		let t5;
		let div7;
		let div5;
		let show_if_1;
		let current_block_type_index_2;
		let if_block2;
		let t6;
		let div6;
		let show_if;
		let current_block_type_index_3;
		let if_block3;
		let current;
		const if_block_creators = [create_if_block_3, create_else_block_3];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (dirty & /*labels*/ 2) show_if_3 = null;
			if (show_if_3 == null) show_if_3 = !!/*labels*/ ctx[1].leftUpper.hasOwnProperty("special");
			if (show_if_3) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx, -1);
		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
		const if_block_creators_1 = [create_if_block_2, create_else_block_2];
		const if_blocks_1 = [];

		function select_block_type_1(ctx, dirty) {
			if (dirty & /*labels*/ 2) show_if_2 = null;
			if (show_if_2 == null) show_if_2 = !!/*labels*/ ctx[1].rightUpper.hasOwnProperty("special");
			if (show_if_2) return 0;
			return 1;
		}

		current_block_type_index_1 = select_block_type_1(ctx, -1);
		if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
		const if_block_creators_2 = [create_if_block_1, create_else_block_1];
		const if_blocks_2 = [];

		function select_block_type_2(ctx, dirty) {
			if (dirty & /*labels*/ 2) show_if_1 = null;
			if (show_if_1 == null) show_if_1 = !!/*labels*/ ctx[1].leftLower.hasOwnProperty("special");
			if (show_if_1) return 0;
			return 1;
		}

		current_block_type_index_2 = select_block_type_2(ctx, -1);
		if_block2 = if_blocks_2[current_block_type_index_2] = if_block_creators_2[current_block_type_index_2](ctx);
		const if_block_creators_3 = [create_if_block, create_else_block];
		const if_blocks_3 = [];

		function select_block_type_3(ctx, dirty) {
			if (dirty & /*labels*/ 2) show_if = null;
			if (show_if == null) show_if = !!/*labels*/ ctx[1].rightLower.hasOwnProperty("special");
			if (show_if) return 0;
			return 1;
		}

		current_block_type_index_3 = select_block_type_3(ctx, -1);
		if_block3 = if_blocks_3[current_block_type_index_3] = if_block_creators_3[current_block_type_index_3](ctx);

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				span0 = element("span");
				span0.textContent = "L1";
				t1 = text("\n    +\n    ");
				span1 = element("span");
				span1.textContent = "R1";
				t3 = space();
				div8 = element("div");
				div4 = element("div");
				div2 = element("div");
				if_block0.c();
				t4 = space();
				div3 = element("div");
				if_block1.c();
				t5 = space();
				div7 = element("div");
				div5 = element("div");
				if_block2.c();
				t6 = space();
				div6 = element("div");
				if_block3.c();
				attr(span0, "class", "trigger left svelte-c0y6wk");
				toggle_class(span0, "active", /*isActive*/ ctx[0]);
				toggle_class(span0, "down", /*isVisitedByHoldingL1*/ ctx[2]);
				attr(span1, "class", "trigger right svelte-c0y6wk");
				toggle_class(span1, "active", /*isActive*/ ctx[0]);
				toggle_class(span1, "down", /*isVisitedByHoldingR1*/ ctx[3]);
				attr(div0, "class", "container svelte-c0y6wk");
				attr(div1, "class", "label svelte-c0y6wk");
				attr(div2, "class", "m-1 svelte-c0y6wk");
				attr(div3, "class", "m-1 svelte-c0y6wk");
				attr(div4, "class", "flex svelte-c0y6wk");
				attr(div5, "class", "m-1 svelte-c0y6wk");
				attr(div6, "class", "m-1 svelte-c0y6wk");
				attr(div7, "class", "flex svelte-c0y6wk");
				attr(div8, "class", "keys-set-container svelte-c0y6wk");
				toggle_class(div8, "active", /*isActive*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, span0);
				append(div0, t1);
				append(div0, span1);
				insert(target, t3, anchor);
				insert(target, div8, anchor);
				append(div8, div4);
				append(div4, div2);
				if_blocks[current_block_type_index].m(div2, null);
				append(div4, t4);
				append(div4, div3);
				if_blocks_1[current_block_type_index_1].m(div3, null);
				append(div8, t5);
				append(div8, div7);
				append(div7, div5);
				if_blocks_2[current_block_type_index_2].m(div5, null);
				append(div7, t6);
				append(div7, div6);
				if_blocks_3[current_block_type_index_3].m(div6, null);
				current = true;
			},
			p(ctx, [dirty]) {
				if (!current || dirty & /*isActive*/ 1) {
					toggle_class(span0, "active", /*isActive*/ ctx[0]);
				}

				if (!current || dirty & /*isVisitedByHoldingL1*/ 4) {
					toggle_class(span0, "down", /*isVisitedByHoldingL1*/ ctx[2]);
				}

				if (!current || dirty & /*isActive*/ 1) {
					toggle_class(span1, "active", /*isActive*/ ctx[0]);
				}

				if (!current || dirty & /*isVisitedByHoldingR1*/ 8) {
					toggle_class(span1, "down", /*isVisitedByHoldingR1*/ ctx[3]);
				}

				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx, dirty);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block0 = if_blocks[current_block_type_index];

					if (!if_block0) {
						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block0.c();
					} else {
						if_block0.p(ctx, dirty);
					}

					transition_in(if_block0, 1);
					if_block0.m(div2, null);
				}

				let previous_block_index_1 = current_block_type_index_1;
				current_block_type_index_1 = select_block_type_1(ctx, dirty);

				if (current_block_type_index_1 === previous_block_index_1) {
					if_blocks_1[current_block_type_index_1].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks_1[previous_block_index_1], 1, 1, () => {
						if_blocks_1[previous_block_index_1] = null;
					});

					check_outros();
					if_block1 = if_blocks_1[current_block_type_index_1];

					if (!if_block1) {
						if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
						if_block1.c();
					} else {
						if_block1.p(ctx, dirty);
					}

					transition_in(if_block1, 1);
					if_block1.m(div3, null);
				}

				let previous_block_index_2 = current_block_type_index_2;
				current_block_type_index_2 = select_block_type_2(ctx, dirty);

				if (current_block_type_index_2 === previous_block_index_2) {
					if_blocks_2[current_block_type_index_2].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks_2[previous_block_index_2], 1, 1, () => {
						if_blocks_2[previous_block_index_2] = null;
					});

					check_outros();
					if_block2 = if_blocks_2[current_block_type_index_2];

					if (!if_block2) {
						if_block2 = if_blocks_2[current_block_type_index_2] = if_block_creators_2[current_block_type_index_2](ctx);
						if_block2.c();
					} else {
						if_block2.p(ctx, dirty);
					}

					transition_in(if_block2, 1);
					if_block2.m(div5, null);
				}

				let previous_block_index_3 = current_block_type_index_3;
				current_block_type_index_3 = select_block_type_3(ctx, dirty);

				if (current_block_type_index_3 === previous_block_index_3) {
					if_blocks_3[current_block_type_index_3].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks_3[previous_block_index_3], 1, 1, () => {
						if_blocks_3[previous_block_index_3] = null;
					});

					check_outros();
					if_block3 = if_blocks_3[current_block_type_index_3];

					if (!if_block3) {
						if_block3 = if_blocks_3[current_block_type_index_3] = if_block_creators_3[current_block_type_index_3](ctx);
						if_block3.c();
					} else {
						if_block3.p(ctx, dirty);
					}

					transition_in(if_block3, 1);
					if_block3.m(div6, null);
				}

				if (!current || dirty & /*isActive*/ 1) {
					toggle_class(div8, "active", /*isActive*/ ctx[0]);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block0);
				transition_in(if_block1);
				transition_in(if_block2);
				transition_in(if_block3);
				current = true;
			},
			o(local) {
				transition_out(if_block0);
				transition_out(if_block1);
				transition_out(if_block2);
				transition_out(if_block3);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
					detach(t3);
					detach(div8);
				}

				if_blocks[current_block_type_index].d();
				if_blocks_1[current_block_type_index_1].d();
				if_blocks_2[current_block_type_index_2].d();
				if_blocks_3[current_block_type_index_3].d();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { isActive = false } = $$props;
		let { labels = {} } = $$props;
		let { isVisitedByHoldingL1 = false } = $$props;
		let { isVisitedByHoldingR1 = false } = $$props;

		$$self.$$set = $$props => {
			if ('isActive' in $$props) $$invalidate(0, isActive = $$props.isActive);
			if ('labels' in $$props) $$invalidate(1, labels = $$props.labels);
			if ('isVisitedByHoldingL1' in $$props) $$invalidate(2, isVisitedByHoldingL1 = $$props.isVisitedByHoldingL1);
			if ('isVisitedByHoldingR1' in $$props) $$invalidate(3, isVisitedByHoldingR1 = $$props.isVisitedByHoldingR1);
		};

		return [isActive, labels, isVisitedByHoldingL1, isVisitedByHoldingR1];
	}

	class Layer extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$3, create_fragment$3, safe_not_equal, {
				isActive: 0,
				labels: 1,
				isVisitedByHoldingL1: 2,
				isVisitedByHoldingR1: 3
			});
		}
	}

	/* src/lib/Row.svelte generated by Svelte v4.2.0 */

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[2] = list[i];
		return child_ctx;
	}

	// (13:2) {#each labelsSet as labels}
	function create_each_block(ctx) {
		let div;
		let layer;
		let t;
		let current;

		layer = new Layer({
				props: {
					isActive: /*labels*/ ctx[2].activeLayerIndexes.includes(/*activeLayer*/ ctx[0]),
					labels: /*activeLayer*/ ctx[0] > 7 && /*labels*/ ctx[2].hasOwnProperty("shortcutsMode")
					? /*labels*/ ctx[2].shortcutsMode
					: /*labels*/ ctx[2].normalMode,
					isVisitedByHoldingL1: /*labels*/ ctx[2].isVisitedByHoldingL1,
					isVisitedByHoldingR1: /*labels*/ ctx[2].isVisitedByHoldingR1
				}
			});

		return {
			c() {
				div = element("div");
				create_component(layer.$$.fragment);
				t = space();
				attr(div, "class", "m-1 svelte-a3l9io");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(layer, div, null);
				append(div, t);
				current = true;
			},
			p(ctx, dirty) {
				const layer_changes = {};
				if (dirty & /*labelsSet, activeLayer*/ 3) layer_changes.isActive = /*labels*/ ctx[2].activeLayerIndexes.includes(/*activeLayer*/ ctx[0]);

				if (dirty & /*activeLayer, labelsSet*/ 3) layer_changes.labels = /*activeLayer*/ ctx[0] > 7 && /*labels*/ ctx[2].hasOwnProperty("shortcutsMode")
				? /*labels*/ ctx[2].shortcutsMode
				: /*labels*/ ctx[2].normalMode;

				if (dirty & /*labelsSet*/ 2) layer_changes.isVisitedByHoldingL1 = /*labels*/ ctx[2].isVisitedByHoldingL1;
				if (dirty & /*labelsSet*/ 2) layer_changes.isVisitedByHoldingR1 = /*labels*/ ctx[2].isVisitedByHoldingR1;
				layer.$set(layer_changes);
			},
			i(local) {
				if (current) return;
				transition_in(layer.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(layer.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(layer);
			}
		};
	}

	function create_fragment$2(ctx) {
		let div;
		let current;
		let each_value = ensure_array_like(/*labelsSet*/ ctx[1]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		return {
			c() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div, "class", "flex svelte-a3l9io");
			},
			m(target, anchor) {
				insert(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}

				current = true;
			},
			p(ctx, [dirty]) {
				if (dirty & /*labelsSet, activeLayer*/ 3) {
					each_value = ensure_array_like(/*labelsSet*/ ctx[1]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(div, null);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let { activeLayer = 0 } = $$props;
		let { labelsSet = [] } = $$props;

		$$self.$$set = $$props => {
			if ('activeLayer' in $$props) $$invalidate(0, activeLayer = $$props.activeLayer);
			if ('labelsSet' in $$props) $$invalidate(1, labelsSet = $$props.labelsSet);
		};

		return [activeLayer, labelsSet];
	}

	class Row extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$2, safe_not_equal, { activeLayer: 0, labelsSet: 1 });
		}
	}

	/* src/lib/Layout.svelte generated by Svelte v4.2.0 */

	function create_fragment$1(ctx) {
		let div1;
		let row0;
		let t0;
		let div0;
		let t6;
		let row1;
		let current;

		row0 = new Row({
				props: {
					labelsSet: /*layers*/ ctx[1].slice(0, 4),
					activeLayer: /*activeLayer*/ ctx[0]
				}
			});

		row1 = new Row({
				props: {
					labelsSet: /*layers*/ ctx[1].slice(4, 8),
					activeLayer: /*activeLayer*/ ctx[0]
				}
			});

		return {
			c() {
				div1 = element("div");
				create_component(row0.$$.fragment);
				t0 = space();
				div0 = element("div");
				div0.innerHTML = `Double-click <span class="l1 svelte-1pe0nty">L1</span> or <span class="r1 svelte-1pe0nty">R1</span> to go up or down (Hold to go back on release)`;
				t6 = space();
				create_component(row1.$$.fragment);
				attr(div0, "class", "instructions svelte-1pe0nty");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				mount_component(row0, div1, null);
				append(div1, t0);
				append(div1, div0);
				append(div1, t6);
				mount_component(row1, div1, null);
				current = true;
			},
			p(ctx, [dirty]) {
				const row0_changes = {};
				if (dirty & /*activeLayer*/ 1) row0_changes.activeLayer = /*activeLayer*/ ctx[0];
				row0.$set(row0_changes);
				const row1_changes = {};
				if (dirty & /*activeLayer*/ 1) row1_changes.activeLayer = /*activeLayer*/ ctx[0];
				row1.$set(row1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(row0.$$.fragment, local);
				transition_in(row1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(row0.$$.fragment, local);
				transition_out(row1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				destroy_component(row0);
				destroy_component(row1);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { activeLayer = 0 } = $$props;

		// there are 8 layers, the first 4 (indexed 0 to 3)
		// are at the top. The last 4 (indexed 4 to 7)
		// are at the bottom.
		let layers = [
			// 0
			{
				activeLayerIndexes: [0, 8, 16, 17, 18, 19],
				isVisitedByHoldingL1: false,
				isVisitedByHoldingR1: false,
				normalMode: {
					rightUpper: {
						north: "I",
						east: "O",
						south: "A",
						west: "N"
					},
					rightLower: {
						north: "i",
						east: "o",
						south: "a",
						west: "n"
					},
					leftUpper: {
						north: "T",
						east: "H",
						south: "E",
						west: "R"
					},
					leftLower: {
						north: "t",
						east: "h",
						south: "e",
						west: "r"
					}
				},
				shortcutsMode: {
					rightUpper: { special: "shortcuts-modifier-keys" },
					rightLower: {
						north: "i",
						east: "o",
						south: "a",
						west: "n"
					},
					leftUpper: { special: "shortcuts-modifier-keys" },
					leftLower: {
						north: "t",
						east: "h",
						south: "e",
						west: "r"
					}
				}
			},
			// 1
			{
				activeLayerIndexes: [1, 9, 20, 21, 22, 23],
				isVisitedByHoldingL1: true,
				isVisitedByHoldingR1: false,
				normalMode: {
					rightUpper: {
						north: "K",
						east: "↵",
						south: "B",
						west: "G"
					},
					rightLower: {
						north: "k",
						east: "➟",
						south: "b",
						west: "g"
					},
					leftUpper: {
						north: "L",
						east: "P",
						south: "D",
						west: "Esc"
					},
					leftLower: {
						north: "l",
						east: "p",
						south: "d",
						west: "⌫"
					}
				},
				shortcutsMode: {
					rightUpper: { special: "shortcuts-modifier-keys" },
					rightLower: {
						north: "k",
						east: "➟",
						south: "b",
						west: "g"
					},
					leftUpper: { special: "shortcuts-modifier-keys" },
					leftLower: {
						north: "l",
						east: "p",
						south: "d",
						west: "⌫"
					}
				}
			},
			// 2
			{
				activeLayerIndexes: [2, 10, 24, 25, 26, 27],
				isVisitedByHoldingL1: false,
				isVisitedByHoldingR1: true,
				normalMode: {
					rightUpper: {
						north: "Y",
						east: "F",
						south: "V",
						west: "M"
					},
					rightLower: {
						north: "y",
						east: "f",
						south: "v",
						west: "m"
					},
					leftUpper: {
						north: "W",
						east: "C",
						south: "S",
						west: "U"
					},
					leftLower: {
						north: "w",
						east: "c",
						south: "s",
						west: "u"
					}
				},
				shortcutsMode: {
					rightUpper: { special: "shortcuts-modifier-keys" },
					rightLower: {
						north: "y",
						east: "f",
						south: "v",
						west: "m"
					},
					leftUpper: { special: "shortcuts-modifier-keys" },
					leftLower: {
						north: "w",
						east: "c",
						south: "s",
						west: "u"
					}
				}
			},
			// 3
			{
				activeLayerIndexes: [3, 11, 28, 29, 30, 31],
				isVisitedByHoldingL1: true,
				isVisitedByHoldingR1: true,
				normalMode: {
					leftUpper: {
						north: "Z",
						east: "",
						south: "",
						west: "J"
					},
					leftLower: {
						north: "z",
						east: "",
						south: "",
						west: "j"
					},
					rightUpper: {
						north: "Q",
						east: "X",
						south: "👁️",
						west: ""
					},
					rightLower: {
						north: "q",
						east: "x",
						south: "",
						west: ""
					}
				},
				shortcutsMode: {
					leftUpper: { special: "shortcuts-modifier-keys" },
					leftLower: {
						north: "z",
						east: "",
						south: "",
						west: "j"
					},
					rightUpper: { special: "shortcuts-modifier-keys" },
					rightLower: {
						north: "q",
						east: "x",
						south: "",
						west: ""
					}
				}
			},
			// 4
			{
				activeLayerIndexes: [4, 12, 32, 33, 34, 35],
				isVisitedByHoldingL1: false,
				isVisitedByHoldingR1: false,
				normalMode: {
					rightUpper: { special: "mouse-buttons" },
					rightLower: { special: "mouse-scroll" },
					leftUpper: { special: "directional-arrows" },
					leftLower: { special: "mouse-cursor" }
				},
				shortcutsMode: {
					rightUpper: { north: "", east: "", south: "", west: "" },
					rightLower: { north: "", east: "", south: "", west: "" },
					leftUpper: { north: "", east: "", south: "", west: "" },
					leftLower: { north: "", east: "", south: "", west: "" }
				}
			},
			// 5
			{
				activeLayerIndexes: [5, 13, 36, 37, 38, 39],
				isVisitedByHoldingL1: true,
				isVisitedByHoldingR1: false,
				normalMode: {
					rightUpper: {
						north: "%",
						east: "^",
						south: "&",
						west: "*"
					},
					rightLower: {
						north: "5",
						east: "6",
						south: "7",
						west: "8"
					},
					leftUpper: {
						north: "!",
						east: "@",
						south: "#",
						west: "$"
					},
					leftLower: {
						north: "1",
						east: "2",
						south: "3",
						west: "4"
					}
				},
				shortcutsMode: {
					rightUpper: { north: "", east: "", south: "", west: "" },
					rightLower: { north: "", east: "", south: "", west: "" },
					leftUpper: { north: "", east: "", south: "", west: "" },
					leftLower: { north: "", east: "", south: "", west: "" }
				}
			},
			// 6
			{
				activeLayerIndexes: [6, 14, 40, 41, 42, 43],
				isVisitedByHoldingL1: false,
				isVisitedByHoldingR1: true,
				normalMode: {
					rightUpper: {
						north: "\"",
						east: ":",
						south: "}",
						west: "{"
					},
					rightLower: {
						north: "'",
						east: ";",
						south: "]",
						west: "["
					},
					leftUpper: {
						north: "(",
						east: ")",
						south: ">",
						west: "<"
					},
					leftLower: {
						north: "9",
						east: "0",
						south: ".",
						west: ","
					}
				},
				shortcutsMode: {
					rightUpper: { north: "", east: "", south: "", west: "" },
					rightLower: { north: "", east: "", south: "", west: "" },
					leftUpper: { north: "", east: "", south: "", west: "" },
					leftLower: { north: "", east: "", south: "", west: "" }
				}
			},
			// 7
			{
				activeLayerIndexes: [7, 15, 44, 45, 46, 47],
				isVisitedByHoldingL1: true,
				isVisitedByHoldingR1: true,
				normalMode: {
					rightUpper: {
						north: "⇤",
						east: "|",
						south: "👁️",
						west: ""
					},
					rightLower: {
						north: "⇥",
						east: "\\",
						south: "",
						west: ""
					},
					leftUpper: {
						north: "_",
						east: "?",
						south: "+",
						west: "~"
					},
					leftLower: {
						north: "-",
						east: "/",
						south: "=",
						west: "`"
					}
				},
				shortcutsMode: {
					rightUpper: { north: "", east: "", south: "", west: "" },
					rightLower: { north: "", east: "", south: "", west: "" },
					leftUpper: { north: "", east: "", south: "", west: "" },
					leftLower: { north: "", east: "", south: "", west: "" }
				}
			}
		];

		$$self.$$set = $$props => {
			if ('activeLayer' in $$props) $$invalidate(0, activeLayer = $$props.activeLayer);
		};

		return [activeLayer, layers];
	}

	class Layout extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { activeLayer: 0 });
		}
	}

	/* src/App.svelte generated by Svelte v4.2.0 */

	function create_fragment(ctx) {
		let div2;
		let div0;
		let layout;
		let t0;
		let div1;
		let current;

		layout = new Layout({
				props: { activeLayer: /*activeLayer*/ ctx[0] }
			});

		return {
			c() {
				div2 = element("div");
				div0 = element("div");
				create_component(layout.$$.fragment);
				t0 = space();
				div1 = element("div");
				div1.innerHTML = `Hold <strong>R2</strong> to go to Ctrl mode`;
				attr(div0, "class", "m-1");
				attr(div1, "class", "shortcuts-indicator-container svelte-1e8ug76");
				toggle_class(div1, "active", /*activeLayer*/ ctx[0] > 7);
				attr(div2, "class", "flex justify-center svelte-1e8ug76");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				mount_component(layout, div0, null);
				append(div2, t0);
				append(div2, div1);
				current = true;
			},
			p(ctx, [dirty]) {
				const layout_changes = {};
				if (dirty & /*activeLayer*/ 1) layout_changes.activeLayer = /*activeLayer*/ ctx[0];
				layout.$set(layout_changes);

				if (!current || dirty & /*activeLayer*/ 1) {
					toggle_class(div1, "active", /*activeLayer*/ ctx[0] > 7);
				}
			},
			i(local) {
				if (current) return;
				transition_in(layout.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(layout.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				destroy_component(layout);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let activeLayer = 0;

		listen(payload => {
			$$invalidate(0, activeLayer = payload.layer);
		});

		return [activeLayer];
	}

	class App extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, {});
		}
	}

	const app = new App({
	  target: document.body,
	  props: {
	    name: 'Daffodil',
	  },
	});

	return app;

})();
