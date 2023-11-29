var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	const identity = (x) => x;

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

	/** @param {number | string} value
	 * @returns {[number, string]}
	 */
	function split_css_unit(value) {
		const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
		return split ? [parseFloat(split[1]), split[2] || 'px'] : [/** @type {number} */ (value), 'px'];
	}

	const is_client = typeof window !== 'undefined';

	/** @type {() => number} */
	let now = is_client ? () => window.performance.now() : () => Date.now();

	let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop;

	const tasks = new Set();

	/**
	 * @param {number} now
	 * @returns {void}
	 */
	function run_tasks(now) {
		tasks.forEach((task) => {
			if (!task.c(now)) {
				tasks.delete(task);
				task.f();
			}
		});
		if (tasks.size !== 0) raf(run_tasks);
	}

	/**
	 * Creates a new task that runs on each raf frame
	 * until it returns a falsy value or is aborted
	 * @param {import('./private.js').TaskCallback} callback
	 * @returns {import('./private.js').Task}
	 */
	function loop(callback) {
		/** @type {import('./private.js').TaskEntry} */
		let task;
		if (tasks.size === 0) raf(run_tasks);
		return {
			promise: new Promise((fulfill) => {
				tasks.add((task = { c: callback, f: fulfill }));
			}),
			abort() {
				tasks.delete(task);
			}
		};
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
	 * @param {Node} node
	 * @returns {ShadowRoot | Document}
	 */
	function get_root_for_style(node) {
		if (!node) return document;
		const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
		if (root && /** @type {ShadowRoot} */ (root).host) {
			return /** @type {ShadowRoot} */ (root);
		}
		return node.ownerDocument;
	}

	/**
	 * @param {Node} node
	 * @returns {CSSStyleSheet}
	 */
	function append_empty_stylesheet(node) {
		const style_element = element('style');
		// For transitions to work without 'style-src: unsafe-inline' Content Security Policy,
		// these empty tags need to be allowed with a hash as a workaround until we move to the Web Animations API.
		// Using the hash for the empty string (for an empty tag) works in all browsers except Safari.
		// So as a workaround for the workaround, when we append empty style tags we set their content to /* empty */.
		// The hash 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' will then work even in Safari.
		style_element.textContent = '/* empty */';
		append_stylesheet(get_root_for_style(node), style_element);
		return style_element.sheet;
	}

	/**
	 * @param {ShadowRoot | Document} node
	 * @param {HTMLStyleElement} style
	 * @returns {CSSStyleSheet}
	 */
	function append_stylesheet(node, style) {
		append(/** @type {Document} */ (node).head || node, style);
		return style.sheet;
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
	 * @template {keyof SVGElementTagNameMap} K
	 * @param {K} name
	 * @returns {SVGElement}
	 */
	function svg_element(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
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
	 * @returns {Text} */
	function empty() {
		return text('');
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
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
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

	// we need to store the information for multiple documents because a Svelte application could also contain iframes
	// https://github.com/sveltejs/svelte/issues/3624
	/** @type {Map<Document | ShadowRoot, import('./private.d.ts').StyleInformation>} */
	const managed_styles = new Map();

	let active = 0;

	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	/**
	 * @param {string} str
	 * @returns {number}
	 */
	function hash(str) {
		let hash = 5381;
		let i = str.length;
		while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
		return hash >>> 0;
	}

	/**
	 * @param {Document | ShadowRoot} doc
	 * @param {Element & ElementCSSInlineStyle} node
	 * @returns {{ stylesheet: any; rules: {}; }}
	 */
	function create_style_information(doc, node) {
		const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
		managed_styles.set(doc, info);
		return info;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {number} a
	 * @param {number} b
	 * @param {number} duration
	 * @param {number} delay
	 * @param {(t: number) => number} ease
	 * @param {(t: number, u: number) => string} fn
	 * @param {number} uid
	 * @returns {string}
	 */
	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
		const step = 16.666 / duration;
		let keyframes = '{\n';
		for (let p = 0; p <= 1; p += step) {
			const t = a + (b - a) * ease(p);
			keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
		}
		const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
		const name = `__svelte_${hash(rule)}_${uid}`;
		const doc = get_root_for_style(node);
		const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
		if (!rules[name]) {
			rules[name] = true;
			stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
		}
		const animation = node.style.animation || '';
		node.style.animation = `${
		animation ? `${animation}, ` : ''
	}${name} ${duration}ms linear ${delay}ms 1 both`;
		active += 1;
		return name;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {string} [name]
	 * @returns {void}
	 */
	function delete_rule(node, name) {
		const previous = (node.style.animation || '').split(', ');
		const next = previous.filter(
			name
				? (anim) => anim.indexOf(name) < 0 // remove specific animation
				: (anim) => anim.indexOf('__svelte') === -1 // remove all Svelte animations
		);
		const deleted = previous.length - next.length;
		if (deleted) {
			node.style.animation = next.join(', ');
			active -= deleted;
			if (!active) clear_rules();
		}
	}

	/** @returns {void} */
	function clear_rules() {
		raf(() => {
			if (active) return;
			managed_styles.forEach((info) => {
				const { ownerNode } = info.stylesheet;
				// there is no ownerNode if it runs on jsdom.
				if (ownerNode) detach(ownerNode);
			});
			managed_styles.clear();
		});
	}

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

	/**
	 * @type {Promise<void> | null}
	 */
	let promise;

	/**
	 * @returns {Promise<void>}
	 */
	function wait() {
		if (!promise) {
			promise = Promise.resolve();
			promise.then(() => {
				promise = null;
			});
		}
		return promise;
	}

	/**
	 * @param {Element} node
	 * @param {INTRO | OUTRO | boolean} direction
	 * @param {'start' | 'end'} kind
	 * @returns {void}
	 */
	function dispatch(node, direction, kind) {
		node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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

	/**
	 * @type {import('../transition/public.js').TransitionConfig}
	 */
	const null_transition = { duration: 0 };

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @param {boolean} intro
	 * @returns {{ run(b: 0 | 1): void; end(): void; }}
	 */
	function create_bidirectional_transition(node, fn, params, intro) {
		/**
		 * @type {TransitionOptions} */
		const options = { direction: 'both' };
		let config = fn(node, params, options);
		let t = intro ? 0 : 1;

		/**
		 * @type {Program | null} */
		let running_program = null;

		/**
		 * @type {PendingProgram | null} */
		let pending_program = null;
		let animation_name = null;

		/** @type {boolean} */
		let original_inert_value;

		/**
		 * @returns {void} */
		function clear_animation() {
			if (animation_name) delete_rule(node, animation_name);
		}

		/**
		 * @param {PendingProgram} program
		 * @param {number} duration
		 * @returns {Program}
		 */
		function init(program, duration) {
			const d = /** @type {Program['d']} */ (program.b - t);
			duration *= Math.abs(d);
			return {
				a: t,
				b: program.b,
				d,
				duration,
				start: program.start,
				end: program.start + duration,
				group: program.group
			};
		}

		/**
		 * @param {INTRO | OUTRO} b
		 * @returns {void}
		 */
		function go(b) {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop,
				css
			} = config || null_transition;

			/**
			 * @type {PendingProgram} */
			const program = {
				start: now() + delay,
				b
			};

			if (!b) {
				// @ts-ignore todo: improve typings
				program.group = outros;
				outros.r += 1;
			}

			if ('inert' in node) {
				if (b) {
					if (original_inert_value !== undefined) {
						// aborted/reversed outro — restore previous inert value
						node.inert = original_inert_value;
					}
				} else {
					original_inert_value = /** @type {HTMLElement} */ (node).inert;
					node.inert = true;
				}
			}

			if (running_program || pending_program) {
				pending_program = program;
			} else {
				// if this is an intro, and there's a delay, we need to do
				// an initial tick and/or apply CSS animation immediately
				if (css) {
					clear_animation();
					animation_name = create_rule(node, t, b, duration, delay, easing, css);
				}
				if (b) tick(0, 1);
				running_program = init(program, duration);
				add_render_callback(() => dispatch(node, b, 'start'));
				loop((now) => {
					if (pending_program && now > pending_program.start) {
						running_program = init(pending_program, duration);
						pending_program = null;
						dispatch(node, running_program.b, 'start');
						if (css) {
							clear_animation();
							animation_name = create_rule(
								node,
								t,
								running_program.b,
								running_program.duration,
								0,
								easing,
								config.css
							);
						}
					}
					if (running_program) {
						if (now >= running_program.end) {
							tick((t = running_program.b), 1 - t);
							dispatch(node, running_program.b, 'end');
							if (!pending_program) {
								// we're done
								if (running_program.b) {
									// intro — we can tidy up immediately
									clear_animation();
								} else {
									// outro — needs to be coordinated
									if (!--running_program.group.r) run_all(running_program.group.c);
								}
							}
							running_program = null;
						} else if (now >= running_program.start) {
							const p = now - running_program.start;
							t = running_program.a + running_program.d * easing(p / running_program.duration);
							tick(t, 1 - t);
						}
					}
					return !!(running_program || pending_program);
				});
			}
		}
		return {
			run(b) {
				if (is_function(config)) {
					wait().then(() => {
						const opts = { direction: b ? 'in' : 'out' };
						// @ts-ignore
						config = config(opts);
						go(b);
					});
				} else {
					go(b);
				}
			},
			end() {
				clear_animation();
				running_program = pending_program = null;
			}
		};
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

	/* src/lib/CharactersLevel/CardinalKeysSet.svelte generated by Svelte v4.2.0 */

	function create_else_block_1(ctx) {
		let div;

		function select_block_type_2(ctx, dirty) {
			if (/*isCardinalMoveArrows*/ ctx[2]) return create_if_block_2;
			if (/*isMouseButtons*/ ctx[3]) return create_if_block_3;
			return create_else_block_2;
		}

		let current_block_type = select_block_type_2(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				div = element("div");
				if_block.c();
				attr(div, "class", "switches-container svelte-1ok4fb9");
				toggle_class(div, "active", /*isActive*/ ctx[1]);
			},
			m(target, anchor) {
				insert(target, div, anchor);
				if_block.m(div, null);
			},
			p(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div, null);
					}
				}

				if (dirty & /*isActive*/ 2) {
					toggle_class(div, "active", /*isActive*/ ctx[1]);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				if_block.d();
			}
		};
	}

	// (11:0) {#if isMouseCursorMovement || isMouseScrollMovement}
	function create_if_block$1(ctx) {
		let div;

		function select_block_type_1(ctx, dirty) {
			if (/*isMouseCursorMovement*/ ctx[4]) return create_if_block_1;
			return create_else_block;
		}

		let current_block_type = select_block_type_1(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				div = element("div");
				if_block.c();
				attr(div, "class", "cardinal-levers-container svelte-1ok4fb9");
				toggle_class(div, "active", /*isActive*/ ctx[1]);
			},
			m(target, anchor) {
				insert(target, div, anchor);
				if_block.m(div, null);
			},
			p(ctx, dirty) {
				if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div, null);
					}
				}

				if (dirty & /*isActive*/ 2) {
					toggle_class(div, "active", /*isActive*/ ctx[1]);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				if_block.d();
			}
		};
	}

	// (103:2) {:else}
	function create_else_block_2(ctx) {
		let div2;
		let div0;
		let t0_value = /*labels*/ ctx[0][0] + "";
		let t0;
		let t1;
		let div1;
		let t2_value = /*labels*/ ctx[0][1] + "";
		let t2;
		let t3;
		let div5;
		let div3;
		let t4_value = /*labels*/ ctx[0][3] + "";
		let t4;
		let t5;
		let div4;
		let t6_value = /*labels*/ ctx[0][2] + "";
		let t6;

		return {
			c() {
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
				attr(div0, "class", "kbd svelte-1ok4fb9");
				attr(div1, "class", "kbd svelte-1ok4fb9");
				attr(div2, "class", "flex svelte-1ok4fb9");
				attr(div3, "class", "kbd svelte-1ok4fb9");
				attr(div4, "class", "kbd svelte-1ok4fb9");
				attr(div5, "class", "flex svelte-1ok4fb9");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				append(div0, t0);
				append(div2, t1);
				append(div2, div1);
				append(div1, t2);
				insert(target, t3, anchor);
				insert(target, div5, anchor);
				append(div5, div3);
				append(div3, t4);
				append(div5, t5);
				append(div5, div4);
				append(div4, t6);
			},
			p(ctx, dirty) {
				if (dirty & /*labels*/ 1 && t0_value !== (t0_value = /*labels*/ ctx[0][0] + "")) set_data(t0, t0_value);
				if (dirty & /*labels*/ 1 && t2_value !== (t2_value = /*labels*/ ctx[0][1] + "")) set_data(t2, t2_value);
				if (dirty & /*labels*/ 1 && t4_value !== (t4_value = /*labels*/ ctx[0][3] + "")) set_data(t4, t4_value);
				if (dirty & /*labels*/ 1 && t6_value !== (t6_value = /*labels*/ ctx[0][2] + "")) set_data(t6, t6_value);
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
					detach(t3);
					detach(div5);
				}
			}
		};
	}

	// (64:27) 
	function create_if_block_3(ctx) {
		let div2;
		let t1;
		let div5;

		return {
			c() {
				div2 = element("div");
				div2.innerHTML = `<div class="kbd svelte-1ok4fb9"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6C4 4.93913 4.42143 3.92172 5.17157 3.17157C5.92172 2.42143 6.93913 2 8 2C9.06087 2 10.0783 2.42143 10.8284 3.17157C11.5786 3.92172 12 4.93913 12 6V10C12 11.0609 11.5786 12.0783 10.8284 12.8284C10.0783 13.5786 9.06087 14 8 14C6.93913 14 5.92172 13.5786 5.17157 12.8284C4.42143 12.0783 4 11.0609 4 10V6Z" stroke="black" stroke-width="1.5" stroke-linejoin="round"></path><path d="M8 4.66667V7.33334" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></div> <div class="kbd svelte-1ok4fb9"><svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 15.5833C7.13055 15.5833 5.96181 15.0993 4.99375 14.1313C4.02569 13.1632 3.54167 11.9944 3.54167 10.625V6.375C3.54167 5.00556 4.02569 3.83681 4.99375 2.86876C5.96181 1.9007 7.13055 1.41667 8.5 1.41667C9.86944 1.41667 11.0382 1.9007 12.0062 2.86876C12.9743 3.83681 13.4583 5.00556 13.4583 6.375V10.625C13.4583 11.9944 12.9743 13.1632 12.0062 14.1313C11.0382 15.0993 9.86944 15.5833 8.5 15.5833ZM4.95833 6.375H7.79167V2.90417C6.97708 3.06945 6.3011 3.47674 5.76371 4.12605C5.22632 4.77535 4.95786 5.525 4.95833 6.375ZM8.5 14.1667C9.47986 14.1667 10.3152 13.8212 11.0061 13.1304C11.6969 12.4395 12.0421 11.6044 12.0417 10.625V7.79167H4.95833V10.625C4.95833 11.6049 5.30376 12.4402 5.99462 13.1311C6.68549 13.8219 7.52061 14.1671 8.5 14.1667Z" fill="black"></path></svg></div>`;
				t1 = space();
				div5 = element("div");
				div5.innerHTML = `<div class="kbd svelte-1ok4fb9"><svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none"><g clip-path="url(#clip0_16_2)"><path d="M18.2452 0.875005C17.7144 0.904197 17.1907 1.03954 16.7245 1.26247C15.4817 1.85516 14.4458 2.9052 13.6567 3.69516C13.579 3.75732 13.5153 3.83516 13.4697 3.92361C13.4241 4.01206 13.3977 4.10913 13.3922 4.20849C13.3866 4.30784 13.4021 4.40724 13.4376 4.5002C13.4731 4.59316 13.5278 4.6776 13.5981 4.74799C13.6684 4.81838 13.7528 4.87315 13.8458 4.90872C13.9387 4.94429 14.0381 4.95987 14.1374 4.95443C14.2368 4.94899 14.3339 4.92266 14.4224 4.87716C14.5109 4.83165 14.5888 4.768 14.651 4.69035C15.4295 3.91189 16.4114 3.00074 17.3332 2.56108C17.794 2.3417 18.2107 2.24439 18.6043 2.28508C18.998 2.32577 19.4032 2.47527 19.849 2.92024C20.6 3.67216 20.6425 4.30554 20.3178 5.18751C19.995 6.06947 19.1882 7.12039 18.2178 8.08993C17.2889 9.01877 16.5954 9.88393 16.2822 10.7995C16.1227 11.2542 16.0952 11.7447 16.2029 12.2144C16.3106 12.6841 16.5491 13.1136 16.8908 13.4534C17.618 14.1805 18.6698 14.3468 19.627 13.9779C20.585 13.6099 21.5404 12.8394 22.6125 11.7664C22.6902 11.7042 22.7538 11.6263 22.7993 11.5378C22.8448 11.4493 22.8712 11.3522 22.8766 11.2528C22.8821 11.1535 22.8665 11.0541 22.8309 10.9612C22.7953 10.8682 22.7406 10.7838 22.6702 10.7135C22.5998 10.6432 22.5153 10.5885 22.4224 10.553C22.3294 10.5175 22.23 10.502 22.1307 10.5075C22.0313 10.5131 21.9343 10.5395 21.8458 10.5851C21.7573 10.6307 21.6795 10.6944 21.6173 10.7721C20.6098 11.7797 19.742 12.4157 19.1298 12.651C18.5177 12.8872 18.2744 12.8465 17.886 12.4582C17.488 12.0601 17.449 11.7929 17.6366 11.2418C17.825 10.6907 18.3602 9.93789 19.213 9.08512C20.2524 8.04658 21.1936 6.91781 21.6457 5.68466C22.0968 4.45327 21.9358 3.01754 20.8433 1.92504C20.2117 1.29254 19.4952 0.949313 18.7707 0.875005C18.5958 0.860838 18.4201 0.860838 18.2452 0.875005ZM8.79042 3.52885C7.38164 3.61191 6.05317 4.21235 5.06 5.21493L4.11877 6.15616L7.68554 9.72204L8.65242 8.75427C8.51116 8.47133 8.46191 8.1513 8.51156 7.83897C8.56121 7.52665 8.70727 7.23766 8.92931 7.01247L9.89708 6.04558C10.1221 5.82362 10.411 5.67759 10.7231 5.62794C11.0353 5.5783 11.3552 5.62751 11.638 5.7687L12.6606 4.74608C11.5595 3.88831 10.1861 3.45616 8.79219 3.52885H8.79042ZM13.7115 5.76781L12.6332 6.84616C12.7393 7.11688 12.7644 7.41259 12.7055 7.69732C12.6466 7.98205 12.5062 8.24353 12.3015 8.44997L11.3337 9.41685C11.1273 9.62143 10.866 9.76169 10.5815 9.82058C10.2969 9.87947 10.0014 9.85446 9.73077 9.74858L8.70815 10.7712L12.3015 14.338L13.2418 13.3976C15.326 11.3135 15.4728 8.03774 13.7115 5.76781ZM10.9745 6.48701C10.8075 6.49149 10.6488 6.561 10.5322 6.68074L9.56446 7.64762C9.44884 7.76581 9.38409 7.92458 9.38409 8.08993C9.38409 8.25527 9.44884 8.41404 9.56446 8.53224L9.81392 8.78081C9.93001 8.90135 10.0889 8.97127 10.2562 8.97543C10.4234 8.97089 10.5822 8.90103 10.6985 8.78081L11.6663 7.81393C11.7861 7.69749 11.8554 7.53864 11.8592 7.37162C11.8549 7.20453 11.7853 7.04577 11.6654 6.92931L11.4177 6.68074C11.3604 6.62082 11.2918 6.57278 11.216 6.53939C11.1401 6.506 11.0583 6.48789 10.9754 6.48612L10.9745 6.48701ZM3.26158 7.01247L1.93465 8.31108C-0.325539 10.5722 -0.325539 14.2601 1.93465 16.5212C2.47189 17.0586 3.10973 17.4848 3.81173 17.7756C4.51373 18.0665 5.26614 18.2162 6.026 18.2162C6.78586 18.2162 7.53827 18.0665 8.24027 17.7756C8.94227 17.4848 9.58011 17.0586 10.1173 16.5212L11.4443 15.1943L3.26158 7.01247Z" fill="black"></path><path d="M18 19.5L12.75 22.5311V16.4689L18 19.5Z" fill="black"></path><path d="M23 19.5L17.75 22.5311V16.4689L23 19.5Z" fill="black"></path></g><defs><clipPath id="clip0_16_2"><rect width="23" height="23" fill="white"></rect></clipPath></defs></svg></div> <div class="kbd svelte-1ok4fb9"><svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 15.5833C7.13055 15.5833 5.96181 15.0993 4.99375 14.1313C4.02569 13.1632 3.54167 11.9944 3.54167 10.625V6.375C3.54167 5.00556 4.02569 3.83681 4.99375 2.86876C5.96181 1.9007 7.13055 1.41667 8.5 1.41667C9.86944 1.41667 11.0382 1.9007 12.0062 2.86876C12.9743 3.83681 13.4583 5.00556 13.4583 6.375V10.625C13.4583 11.9944 12.9743 13.1632 12.0062 14.1313C11.0382 15.0993 9.86944 15.5833 8.5 15.5833ZM9.20833 6.375H12.0417C12.0417 5.525 11.7732 4.77535 11.2363 4.12605C10.6994 3.47674 10.0234 3.06945 9.20833 2.90417V6.375ZM8.5 14.1667C9.47986 14.1667 10.3152 13.8212 11.0061 13.1304C11.6969 12.4395 12.0421 11.6044 12.0417 10.625V7.79167H4.95833V10.625C4.95833 11.6049 5.30376 12.4402 5.99462 13.1311C6.68549 13.8219 7.52061 14.1671 8.5 14.1667Z" fill="black"></path></svg></div>`;
				attr(div2, "class", "flex svelte-1ok4fb9");
				attr(div5, "class", "flex svelte-1ok4fb9");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				insert(target, t1, anchor);
				insert(target, div5, anchor);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(div2);
					detach(t1);
					detach(div5);
				}
			}
		};
	}

	// (35:2) {#if isCardinalMoveArrows}
	function create_if_block_2(ctx) {
		let div2;
		let t1;
		let div5;

		return {
			c() {
				div2 = element("div");
				div2.innerHTML = `<div class="kbd svelte-1ok4fb9"><svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.94 0L0 6H4V16H6V6H10L4.94 0Z" fill="black"></path></svg></div> <div class="kbd svelte-1ok4fb9"><svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0V4H0V6H10V10L16 4.94L10 0Z" fill="black"></path></svg></div>`;
				t1 = space();
				div5 = element("div");
				div5.innerHTML = `<div class="kbd svelte-1ok4fb9"><svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 0L0 5.06L6 10V6H16V4H6V0Z" fill="black"></path></svg></div> <div class="kbd svelte-1ok4fb9"><svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0V10H0L5.06 16L10 10H6V0H4Z" fill="black"></path></svg></div>`;
				attr(div2, "class", "flex svelte-1ok4fb9");
				attr(div5, "class", "flex svelte-1ok4fb9");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				insert(target, t1, anchor);
				insert(target, div5, anchor);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(div2);
					detach(t1);
					detach(div5);
				}
			}
		};
	}

	// (17:2) {:else}
	function create_else_block(ctx) {
		let div1;

		return {
			c() {
				div1 = element("div");

				div1.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.172 16.818L7.757 18.232L12 22.475L16.243 18.232L14.828 16.818L12 19.647L9.172 16.818ZM14.828 7.18199L16.243 5.76799L12 1.52499L7.757 5.76799L9.172 7.18199L12 4.35399L14.828 7.18199Z" fill="black"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9ZM12 11C12.2652 11 12.5196 11.1054 12.7071 11.2929C12.8946 11.4804 13 11.7348 13 12C13 12.2652 12.8946 12.5196 12.7071 12.7071C12.5196 12.8946 12.2652 13 12 13C11.7348 13 11.4804 12.8946 11.2929 12.7071C11.1054 12.5196 11 12.2652 11 12C11 11.7348 11.1054 11.4804 11.2929 11.2929C11.4804 11.1054 11.7348 11 12 11Z" fill="black"></path></svg>
    +
    <div class="ml-1 flex items-center svelte-1ok4fb9"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.182 9.17199L5.768 7.75699L1.525 12L5.768 16.243L7.182 14.828L4.353 12L7.182 9.17199ZM16.818 14.828L18.232 16.243L22.475 12L18.232 7.75699L16.818 9.17199L19.646 12L16.818 14.828Z" fill="black"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12ZM13 12C13 12.2652 12.8946 12.5196 12.7071 12.7071C12.5196 12.8946 12.2652 13 12 13C11.7348 13 11.4804 12.8946 11.2929 12.7071C11.1054 12.5196 11 12.2652 11 12C11 11.7348 11.1054 11.4804 11.2929 11.2929C11.4804 11.1054 11.7348 11 12 11C12.2652 11 12.5196 11.1054 12.7071 11.2929C12.8946 11.4804 13 11.7348 13 12Z" fill="black"></path></svg></div>`;

				attr(div1, "class", "flex svelte-1ok4fb9");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}
			}
		};
	}

	// (13:2) {#if isMouseCursorMovement}
	function create_if_block_1(ctx) {
		let svg;
		let path;

		return {
			c() {
				svg = svg_element("svg");
				path = svg_element("path");
				attr(path, "d", "M18.2452 2.87501C17.7144 2.9042 17.1907 3.03954 16.7245 3.26247C15.4816 3.85516 14.4458 4.9052 13.6567 5.69516C13.579 5.75732 13.5153 5.83516 13.4697 5.92361C13.4241 6.01206 13.3977 6.10913 13.3921 6.20849C13.3866 6.30784 13.4021 6.40724 13.4376 6.5002C13.4731 6.59316 13.5278 6.6776 13.5981 6.74799C13.6684 6.81838 13.7528 6.87315 13.8458 6.90872C13.9387 6.94429 14.0381 6.95987 14.1374 6.95443C14.2368 6.94899 14.3339 6.92266 14.4224 6.87716C14.5109 6.83165 14.5888 6.768 14.651 6.69035C15.4295 5.91189 16.4114 5.00074 17.3331 4.56108C17.794 4.3417 18.2107 4.24439 18.6043 4.28508C18.998 4.32577 19.4031 4.47527 19.849 4.92024C20.6 5.67216 20.6425 6.30554 20.3178 7.18751C19.995 8.06947 19.1882 9.12039 18.2178 10.0899C17.2889 11.0188 16.5954 11.8839 16.2822 12.7995C16.1227 13.2542 16.0952 13.7447 16.2029 14.2144C16.3106 14.6841 16.5491 15.1136 16.8908 15.4534C17.618 16.1805 18.6698 16.3468 19.627 15.9779C20.585 15.6099 21.5404 14.8394 22.6125 13.7664C22.6902 13.7042 22.7538 13.6263 22.7993 13.5378C22.8448 13.4493 22.8712 13.3522 22.8766 13.2528C22.882 13.1535 22.8665 13.0541 22.8309 12.9612C22.7953 12.8682 22.7406 12.7838 22.6702 12.7135C22.5998 12.6432 22.5153 12.5885 22.4224 12.553C22.3294 12.5175 22.23 12.502 22.1307 12.5075C22.0313 12.5131 21.9342 12.5395 21.8458 12.5851C21.7573 12.6307 21.6795 12.6944 21.6173 12.7721C20.6098 13.7797 19.742 14.4157 19.1298 14.651C18.5176 14.8872 18.2744 14.8465 17.886 14.4582C17.488 14.0601 17.449 13.7929 17.6366 13.2418C17.825 12.6907 18.3602 11.9379 19.213 11.0851C20.2524 10.0466 21.1936 8.91781 21.6456 7.68466C22.0968 6.45327 21.9358 5.01754 20.8433 3.92504C20.2117 3.29254 19.4951 2.94931 18.7706 2.87501C18.5958 2.86084 18.4201 2.86084 18.2452 2.87501ZM8.79042 5.52885C7.38164 5.61191 6.05317 6.21235 5.05999 7.21493L4.11876 8.15616L7.68553 11.722L8.65242 10.7543C8.51116 10.4713 8.4619 10.1513 8.51155 9.83897C8.5612 9.52665 8.70726 9.23766 8.9293 9.01247L9.89707 8.04558C10.1221 7.82362 10.411 7.67759 10.7231 7.62794C11.0353 7.5783 11.3552 7.62751 11.638 7.7687L12.6606 6.74608C11.5595 5.88831 10.1861 5.45616 8.79218 5.52885H8.79042ZM13.7115 7.76781L12.6332 8.84616C12.7392 9.11688 12.7644 9.41259 12.7055 9.69732C12.6466 9.98205 12.5062 10.2435 12.3015 10.45L11.3337 11.4169C11.1273 11.6214 10.866 11.7617 10.5814 11.8206C10.2969 11.8795 10.0014 11.8545 9.73076 11.7486L8.70815 12.7712L12.3015 16.338L13.2418 15.3976C15.326 13.3135 15.4728 10.0377 13.7115 7.76781ZM10.9745 8.48701C10.8075 8.49149 10.6488 8.561 10.5322 8.68074L9.56445 9.64762C9.44883 9.76581 9.38408 9.92458 9.38408 10.0899C9.38408 10.2553 9.44883 10.414 9.56445 10.5322L9.81392 10.7808C9.93001 10.9013 10.0889 10.9713 10.2562 10.9754C10.4234 10.9709 10.5822 10.901 10.6985 10.7808L11.6663 9.81393C11.7861 9.69749 11.8554 9.53864 11.8591 9.37162C11.8548 9.20453 11.7853 9.04577 11.6654 8.92931L11.4177 8.68074C11.3604 8.62082 11.2918 8.57278 11.2159 8.53939C11.14 8.506 11.0583 8.48789 10.9754 8.48612L10.9745 8.48701ZM3.26157 9.01247L1.93465 10.3111C-0.325546 12.5722 -0.325546 16.2601 1.93465 18.5212C2.47189 19.0586 3.10972 19.4848 3.81172 19.7756C4.51372 20.0665 5.26613 20.2162 6.02599 20.2162C6.78585 20.2162 7.53826 20.0665 8.24026 19.7756C8.94226 19.4848 9.5801 19.0586 10.1173 18.5212L11.4443 17.1943L3.26157 9.01247Z");
				attr(path, "fill", "black");
				attr(svg, "width", "23");
				attr(svg, "height", "23");
				attr(svg, "viewBox", "0 0 23 23");
				attr(svg, "fill", "none");
				attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			},
			m(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path);
			},
			d(detaching) {
				if (detaching) {
					detach(svg);
				}
			}
		};
	}

	function create_fragment$6(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*isMouseCursorMovement*/ ctx[4] || /*isMouseScrollMovement*/ ctx[5]) return create_if_block$1;
			return create_else_block_1;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, [dirty]) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};
	}

	function instance$6($$self, $$props, $$invalidate) {
		let { labels = [] } = $$props;
		let { isActive = false } = $$props;
		let { isCardinalMoveArrows = false } = $$props;
		let { isMouseButtons = false } = $$props;
		let { isMouseCursorMovement = false } = $$props;
		let { isMouseScrollMovement = false } = $$props;

		$$self.$$set = $$props => {
			if ('labels' in $$props) $$invalidate(0, labels = $$props.labels);
			if ('isActive' in $$props) $$invalidate(1, isActive = $$props.isActive);
			if ('isCardinalMoveArrows' in $$props) $$invalidate(2, isCardinalMoveArrows = $$props.isCardinalMoveArrows);
			if ('isMouseButtons' in $$props) $$invalidate(3, isMouseButtons = $$props.isMouseButtons);
			if ('isMouseCursorMovement' in $$props) $$invalidate(4, isMouseCursorMovement = $$props.isMouseCursorMovement);
			if ('isMouseScrollMovement' in $$props) $$invalidate(5, isMouseScrollMovement = $$props.isMouseScrollMovement);
		};

		return [
			labels,
			isActive,
			isCardinalMoveArrows,
			isMouseButtons,
			isMouseCursorMovement,
			isMouseScrollMovement
		];
	}

	let CardinalKeysSet$1 = class CardinalKeysSet extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$6, create_fragment$6, safe_not_equal, {
				labels: 0,
				isActive: 1,
				isCardinalMoveArrows: 2,
				isMouseButtons: 3,
				isMouseCursorMovement: 4,
				isMouseScrollMovement: 5
			});
		}
	};

	/* src/lib/CharactersLevel/TriggersIndicator.svelte generated by Svelte v4.2.0 */

	function create_fragment$5(ctx) {
		let div;
		let span0;
		let t1;
		let span1;

		return {
			c() {
				div = element("div");
				span0 = element("span");
				span0.textContent = "L1";
				t1 = text("\n  +\n  ");
				span1 = element("span");
				span1.textContent = "R1";
				attr(span0, "class", "trigger left svelte-1ww3h4c");
				toggle_class(span0, "active", /*isActive*/ ctx[2]);
				toggle_class(span0, "down", /*l1Down*/ ctx[0]);
				attr(span1, "class", "trigger right svelte-1ww3h4c");
				toggle_class(span1, "active", /*isActive*/ ctx[2]);
				toggle_class(span1, "down", /*r1Down*/ ctx[1]);
				attr(div, "class", "container svelte-1ww3h4c");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, span0);
				append(div, t1);
				append(div, span1);
			},
			p(ctx, [dirty]) {
				if (dirty & /*isActive*/ 4) {
					toggle_class(span0, "active", /*isActive*/ ctx[2]);
				}

				if (dirty & /*l1Down*/ 1) {
					toggle_class(span0, "down", /*l1Down*/ ctx[0]);
				}

				if (dirty & /*isActive*/ 4) {
					toggle_class(span1, "active", /*isActive*/ ctx[2]);
				}

				if (dirty & /*r1Down*/ 2) {
					toggle_class(span1, "down", /*r1Down*/ ctx[1]);
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

	function instance$5($$self, $$props, $$invalidate) {
		let { l1Down = false } = $$props;
		let { r1Down = true } = $$props;
		let { isActive = false } = $$props;

		$$self.$$set = $$props => {
			if ('l1Down' in $$props) $$invalidate(0, l1Down = $$props.l1Down);
			if ('r1Down' in $$props) $$invalidate(1, r1Down = $$props.r1Down);
			if ('isActive' in $$props) $$invalidate(2, isActive = $$props.isActive);
		};

		return [l1Down, r1Down, isActive];
	}

	class TriggersIndicator extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$5, create_fragment$5, safe_not_equal, { l1Down: 0, r1Down: 1, isActive: 2 });
		}
	}

	/* src/lib/CharactersLevel/ControllerKeysSet.svelte generated by Svelte v4.2.0 */

	function create_fragment$4(ctx) {
		let div0;
		let triggersindicator;
		let t0;
		let div7;
		let div3;
		let div1;
		let cardinalkeysset0;
		let t1;
		let div2;
		let cardinalkeysset1;
		let t2;
		let div6;
		let div4;
		let cardinalkeysset2;
		let t3;
		let div5;
		let cardinalkeysset3;
		let current;

		triggersindicator = new TriggersIndicator({
				props: {
					l1Down: /*stepNum*/ ctx[2] > 1,
					isActive: /*isActive*/ ctx[0],
					r1Down: /*stepNum*/ ctx[2] == 1 || /*stepNum*/ ctx[2] == 3
				}
			});

		cardinalkeysset0 = new CardinalKeysSet$1({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: /*labels*/ ctx[1].slice(4, 8),
					isCardinalMoveArrows: /*isMouseControls*/ ctx[3]
				}
			});

		cardinalkeysset1 = new CardinalKeysSet$1({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: /*labels*/ ctx[1].slice(12, 16),
					isMouseButtons: /*isMouseControls*/ ctx[3]
				}
			});

		cardinalkeysset2 = new CardinalKeysSet$1({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: /*labels*/ ctx[1].slice(0, 4),
					isMouseCursorMovement: /*isMouseControls*/ ctx[3]
				}
			});

		cardinalkeysset3 = new CardinalKeysSet$1({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: /*labels*/ ctx[1].slice(8, 12),
					isMouseScrollMovement: /*isMouseControls*/ ctx[3]
				}
			});

		return {
			c() {
				div0 = element("div");
				create_component(triggersindicator.$$.fragment);
				t0 = space();
				div7 = element("div");
				div3 = element("div");
				div1 = element("div");
				create_component(cardinalkeysset0.$$.fragment);
				t1 = space();
				div2 = element("div");
				create_component(cardinalkeysset1.$$.fragment);
				t2 = space();
				div6 = element("div");
				div4 = element("div");
				create_component(cardinalkeysset2.$$.fragment);
				t3 = space();
				div5 = element("div");
				create_component(cardinalkeysset3.$$.fragment);
				attr(div0, "class", "label svelte-1p1muql");
				attr(div1, "class", "m-1 svelte-1p1muql");
				attr(div2, "class", "m-1 svelte-1p1muql");
				attr(div3, "class", "flex svelte-1p1muql");
				attr(div4, "class", "m-1 svelte-1p1muql");
				attr(div5, "class", "m-1 svelte-1p1muql");
				attr(div6, "class", "flex svelte-1p1muql");
				attr(div7, "class", "keys-set-container svelte-1p1muql");
				toggle_class(div7, "active", /*isActive*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, div0, anchor);
				mount_component(triggersindicator, div0, null);
				insert(target, t0, anchor);
				insert(target, div7, anchor);
				append(div7, div3);
				append(div3, div1);
				mount_component(cardinalkeysset0, div1, null);
				append(div3, t1);
				append(div3, div2);
				mount_component(cardinalkeysset1, div2, null);
				append(div7, t2);
				append(div7, div6);
				append(div6, div4);
				mount_component(cardinalkeysset2, div4, null);
				append(div6, t3);
				append(div6, div5);
				mount_component(cardinalkeysset3, div5, null);
				current = true;
			},
			p(ctx, [dirty]) {
				const triggersindicator_changes = {};
				if (dirty & /*stepNum*/ 4) triggersindicator_changes.l1Down = /*stepNum*/ ctx[2] > 1;
				if (dirty & /*isActive*/ 1) triggersindicator_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*stepNum*/ 4) triggersindicator_changes.r1Down = /*stepNum*/ ctx[2] == 1 || /*stepNum*/ ctx[2] == 3;
				triggersindicator.$set(triggersindicator_changes);
				const cardinalkeysset0_changes = {};
				if (dirty & /*isActive*/ 1) cardinalkeysset0_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) cardinalkeysset0_changes.labels = /*labels*/ ctx[1].slice(4, 8);
				if (dirty & /*isMouseControls*/ 8) cardinalkeysset0_changes.isCardinalMoveArrows = /*isMouseControls*/ ctx[3];
				cardinalkeysset0.$set(cardinalkeysset0_changes);
				const cardinalkeysset1_changes = {};
				if (dirty & /*isActive*/ 1) cardinalkeysset1_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) cardinalkeysset1_changes.labels = /*labels*/ ctx[1].slice(12, 16);
				if (dirty & /*isMouseControls*/ 8) cardinalkeysset1_changes.isMouseButtons = /*isMouseControls*/ ctx[3];
				cardinalkeysset1.$set(cardinalkeysset1_changes);
				const cardinalkeysset2_changes = {};
				if (dirty & /*isActive*/ 1) cardinalkeysset2_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) cardinalkeysset2_changes.labels = /*labels*/ ctx[1].slice(0, 4);
				if (dirty & /*isMouseControls*/ 8) cardinalkeysset2_changes.isMouseCursorMovement = /*isMouseControls*/ ctx[3];
				cardinalkeysset2.$set(cardinalkeysset2_changes);
				const cardinalkeysset3_changes = {};
				if (dirty & /*isActive*/ 1) cardinalkeysset3_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*labels*/ 2) cardinalkeysset3_changes.labels = /*labels*/ ctx[1].slice(8, 12);
				if (dirty & /*isMouseControls*/ 8) cardinalkeysset3_changes.isMouseScrollMovement = /*isMouseControls*/ ctx[3];
				cardinalkeysset3.$set(cardinalkeysset3_changes);

				if (!current || dirty & /*isActive*/ 1) {
					toggle_class(div7, "active", /*isActive*/ ctx[0]);
				}
			},
			i(local) {
				if (current) return;
				transition_in(triggersindicator.$$.fragment, local);
				transition_in(cardinalkeysset0.$$.fragment, local);
				transition_in(cardinalkeysset1.$$.fragment, local);
				transition_in(cardinalkeysset2.$$.fragment, local);
				transition_in(cardinalkeysset3.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(triggersindicator.$$.fragment, local);
				transition_out(cardinalkeysset0.$$.fragment, local);
				transition_out(cardinalkeysset1.$$.fragment, local);
				transition_out(cardinalkeysset2.$$.fragment, local);
				transition_out(cardinalkeysset3.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div0);
					detach(t0);
					detach(div7);
				}

				destroy_component(triggersindicator);
				destroy_component(cardinalkeysset0);
				destroy_component(cardinalkeysset1);
				destroy_component(cardinalkeysset2);
				destroy_component(cardinalkeysset3);
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { isActive = false } = $$props;
		let { labels = [] } = $$props;
		let { stepNum = 0 } = $$props;
		let { isMouseControls = false } = $$props;

		$$self.$$set = $$props => {
			if ('isActive' in $$props) $$invalidate(0, isActive = $$props.isActive);
			if ('labels' in $$props) $$invalidate(1, labels = $$props.labels);
			if ('stepNum' in $$props) $$invalidate(2, stepNum = $$props.stepNum);
			if ('isMouseControls' in $$props) $$invalidate(3, isMouseControls = $$props.isMouseControls);
		};

		return [isActive, labels, stepNum, isMouseControls];
	}

	class ControllerKeysSet extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$4, create_fragment$4, safe_not_equal, {
				isActive: 0,
				labels: 1,
				stepNum: 2,
				isMouseControls: 3
			});
		}
	}

	/* src/lib/CharactersLevel/index.svelte generated by Svelte v4.2.0 */

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[3] = list[i];
		child_ctx[5] = i;
		return child_ctx;
	}

	function get_each_context_1$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[3] = list[i];
		child_ctx[5] = i;
		return child_ctx;
	}

	// (48:4) {#each level1Labels as labels,idx}
	function create_each_block_1$1(ctx) {
		let div;
		let controllerkeysset;
		let current;

		controllerkeysset = new ControllerKeysSet({
				props: {
					isActive: /*idx*/ ctx[5] == /*activeLayer*/ ctx[0],
					labels: /*labels*/ ctx[3],
					stepNum: /*idx*/ ctx[5]
				}
			});

		return {
			c() {
				div = element("div");
				create_component(controllerkeysset.$$.fragment);
				attr(div, "class", "m-1 svelte-1ub7hnj");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(controllerkeysset, div, null);
				current = true;
			},
			p(ctx, dirty) {
				const controllerkeysset_changes = {};
				if (dirty & /*activeLayer*/ 1) controllerkeysset_changes.isActive = /*idx*/ ctx[5] == /*activeLayer*/ ctx[0];
				controllerkeysset.$set(controllerkeysset_changes);
			},
			i(local) {
				if (current) return;
				transition_in(controllerkeysset.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(controllerkeysset.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(controllerkeysset);
			}
		};
	}

	// (56:4) {#each level2Labels as labels,idx}
	function create_each_block$1(ctx) {
		let div;
		let controllerkeysset;
		let current;

		controllerkeysset = new ControllerKeysSet({
				props: {
					isActive: /*idx*/ ctx[5] + 4 == /*activeLayer*/ ctx[0],
					labels: /*labels*/ ctx[3],
					stepNum: /*idx*/ ctx[5],
					isMouseControls: /*idx*/ ctx[5] == 0
				}
			});

		return {
			c() {
				div = element("div");
				create_component(controllerkeysset.$$.fragment);
				attr(div, "class", "m-1 svelte-1ub7hnj");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(controllerkeysset, div, null);
				current = true;
			},
			p(ctx, dirty) {
				const controllerkeysset_changes = {};
				if (dirty & /*activeLayer*/ 1) controllerkeysset_changes.isActive = /*idx*/ ctx[5] + 4 == /*activeLayer*/ ctx[0];
				controllerkeysset.$set(controllerkeysset_changes);
			},
			i(local) {
				if (current) return;
				transition_in(controllerkeysset.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(controllerkeysset.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(controllerkeysset);
			}
		};
	}

	function create_fragment$3(ctx) {
		let div3;
		let div0;
		let t0;
		let div1;
		let t6;
		let div2;
		let current;
		let each_value_1 = ensure_array_like(/*level1Labels*/ ctx[1]);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
		}

		const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
			each_blocks_1[i] = null;
		});

		let each_value = ensure_array_like(/*level2Labels*/ ctx[2]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		return {
			c() {
				div3 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t0 = space();
				div1 = element("div");
				div1.innerHTML = `Double-click <span class="l1 svelte-1ub7hnj">L1</span> or <span class="r1 svelte-1ub7hnj">R1</span> to go up or down (Hold to go back on release)`;
				t6 = space();
				div2 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div0, "class", "flex svelte-1ub7hnj");
				attr(div1, "class", "instructions svelte-1ub7hnj");
				attr(div2, "class", "flex svelte-1ub7hnj");
			},
			m(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div0);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div0, null);
					}
				}

				append(div3, t0);
				append(div3, div1);
				append(div3, t6);
				append(div3, div2);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div2, null);
					}
				}

				current = true;
			},
			p(ctx, [dirty]) {
				if (dirty & /*activeLayer, level1Labels*/ 3) {
					each_value_1 = ensure_array_like(/*level1Labels*/ ctx[1]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
							transition_in(each_blocks_1[i], 1);
						} else {
							each_blocks_1[i] = create_each_block_1$1(child_ctx);
							each_blocks_1[i].c();
							transition_in(each_blocks_1[i], 1);
							each_blocks_1[i].m(div0, null);
						}
					}

					group_outros();

					for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
						out(i);
					}

					check_outros();
				}

				if (dirty & /*activeLayer, level2Labels*/ 5) {
					each_value = ensure_array_like(/*level2Labels*/ ctx[2]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(div2, null);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out_1(i);
					}

					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value_1.length; i += 1) {
					transition_in(each_blocks_1[i]);
				}

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				each_blocks_1 = each_blocks_1.filter(Boolean);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					transition_out(each_blocks_1[i]);
				}

				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div3);
				}

				destroy_each(each_blocks_1, detaching);
				destroy_each(each_blocks, detaching);
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { activeLayer = 0 } = $$props;

		let level1Labels = [
			[
				"t",
				"h",
				"e",
				"r",
				"T",
				"H",
				"E",
				"R",
				"i",
				"o",
				"a",
				"n",
				"I",
				"O",
				"A",
				"N"
			],
			[
				"w",
				"c",
				"s",
				"u",
				"W",
				"C",
				"S",
				"U",
				"y",
				"f",
				"v",
				"m",
				"Y",
				"f",
				"V",
				"M"
			],
			[
				"l",
				"p",
				"d",
				"⌫",
				"L",
				"P",
				"D",
				"Esc",
				"k",
				"➟",
				"b",
				"g",
				"K",
				"↵",
				"B",
				"G"
			],
			["z", "", "", "j", "Z", "", "", "J", "q", "x", "", "", "Q", "X", "", ""]
		];

		let level2Labels = [
			["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
			[
				"1",
				"2",
				"3",
				"4",
				"!",
				"@",
				"#",
				"$",
				"5",
				"6",
				"7",
				"8",
				"%",
				"^",
				"&",
				"*"
			],
			[
				"9",
				"0",
				".",
				",",
				"(",
				")",
				">",
				"<",
				"'",
				";",
				"]",
				"[",
				"\"",
				":",
				"}",
				"{"
			],
			["-", "/", "=", "`", "_", "?", "+", "~", "⇥", "\\", "", "", "⇤", "|", "", ""]
		];

		$$self.$$set = $$props => {
			if ('activeLayer' in $$props) $$invalidate(0, activeLayer = $$props.activeLayer);
		};

		return [activeLayer, level1Labels, level2Labels];
	}

	class CharactersLevel extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$3, create_fragment$3, safe_not_equal, { activeLayer: 0 });
		}
	}

	/* src/lib/ShortcutsLevel/CardinalKeysSet.svelte generated by Svelte v4.2.0 */

	function create_fragment$2(ctx) {
		let div6;
		let div2;
		let div0;
		let t0_value = /*labels*/ ctx[0][0] + "";
		let t0;
		let t1;
		let div1;
		let t2_value = /*labels*/ ctx[0][1] + "";
		let t2;
		let t3;
		let div5;
		let div3;
		let t4_value = /*labels*/ ctx[0][3] + "";
		let t4;
		let t5;
		let div4;
		let t6_value = /*labels*/ ctx[0][2] + "";
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
				attr(div0, "class", "kbd svelte-1mag2gv");
				attr(div1, "class", "kbd svelte-1mag2gv");
				attr(div2, "class", "flex svelte-1mag2gv");
				attr(div3, "class", "kbd svelte-1mag2gv");
				attr(div4, "class", "kbd svelte-1mag2gv");
				attr(div5, "class", "flex svelte-1mag2gv");
				attr(div6, "class", "switches-container svelte-1mag2gv");
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
				if (dirty & /*labels*/ 1 && t0_value !== (t0_value = /*labels*/ ctx[0][0] + "")) set_data(t0, t0_value);
				if (dirty & /*labels*/ 1 && t2_value !== (t2_value = /*labels*/ ctx[0][1] + "")) set_data(t2, t2_value);
				if (dirty & /*labels*/ 1 && t4_value !== (t4_value = /*labels*/ ctx[0][3] + "")) set_data(t4, t4_value);
				if (dirty & /*labels*/ 1 && t6_value !== (t6_value = /*labels*/ ctx[0][2] + "")) set_data(t6, t6_value);

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

	function instance$2($$self, $$props, $$invalidate) {
		let { labels = [] } = $$props;
		let { isActive = false } = $$props;

		$$self.$$set = $$props => {
			if ('labels' in $$props) $$invalidate(0, labels = $$props.labels);
			if ('isActive' in $$props) $$invalidate(1, isActive = $$props.isActive);
		};

		return [labels, isActive];
	}

	class CardinalKeysSet extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$2, safe_not_equal, { labels: 0, isActive: 1 });
		}
	}

	/* src/lib/ShortcutsLevel/index.svelte generated by Svelte v4.2.0 */

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[3] = list[i];
		child_ctx[5] = i;
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[3] = list[i];
		child_ctx[5] = i;
		return child_ctx;
	}

	// (43:4) {#each labels.slice(0,8) as label,idx}
	function create_each_block_1(ctx) {
		let div2;
		let div0;
		let t1;
		let div1;
		let t3;

		return {
			c() {
				div2 = element("div");
				div0 = element("div");
				div0.textContent = `${/*label*/ ctx[3]}`;
				t1 = space();
				div1 = element("div");
				div1.textContent = `${getNumbering(/*idx*/ ctx[5])}`;
				t3 = space();
				attr(div0, "class", "text svelte-1ve2vwm");
				attr(div1, "class", "numbering svelte-1ve2vwm");
				attr(div2, "class", "label justify-end svelte-1ve2vwm");
				toggle_class(div2, "mb-4", /*idx*/ ctx[5] == 3);
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				append(div2, t1);
				append(div2, div1);
				append(div2, t3);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(div2);
				}
			}
		};
	}

	// (65:4) {#each labels.slice(8,16) as label,idx}
	function create_each_block(ctx) {
		let div2;
		let div0;
		let t1;
		let div1;
		let t3;

		return {
			c() {
				div2 = element("div");
				div0 = element("div");
				div0.textContent = `${getNumbering(/*idx*/ ctx[5])}`;
				t1 = space();
				div1 = element("div");
				div1.textContent = `${/*label*/ ctx[3]}`;
				t3 = space();
				attr(div0, "class", "numbering svelte-1ve2vwm");
				attr(div1, "class", "text svelte-1ve2vwm");
				attr(div2, "class", "label svelte-1ve2vwm");
				toggle_class(div2, "mb-4", /*idx*/ ctx[5] == 3);
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				append(div2, t1);
				append(div2, div1);
				append(div2, t3);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(div2);
				}
			}
		};
	}

	function create_fragment$1(ctx) {
		let div9;
		let div0;
		let t0;
		let div7;
		let div3;
		let div1;
		let cardinalkeysset0;
		let t1;
		let div2;
		let cardinalkeysset1;
		let t2;
		let div6;
		let div4;
		let cardinalkeysset2;
		let t3;
		let div5;
		let cardinalkeysset3;
		let t4;
		let div8;
		let current;
		let each_value_1 = ensure_array_like(/*labels*/ ctx[2].slice(0, 8));
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		cardinalkeysset0 = new CardinalKeysSet({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: ["N", "E", "S", "W"],
					isCardinalMoveArrows: /*isMouseControls*/ ctx[1]
				}
			});

		cardinalkeysset1 = new CardinalKeysSet({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: ["N", "E", "S", "W"],
					isMouseButtons: /*isMouseControls*/ ctx[1]
				}
			});

		cardinalkeysset2 = new CardinalKeysSet({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: ["n", "e", "s", "w"],
					isMouseCursorMovement: /*isMouseControls*/ ctx[1]
				}
			});

		cardinalkeysset3 = new CardinalKeysSet({
				props: {
					isActive: /*isActive*/ ctx[0],
					labels: ["n", "e", "s", "w"],
					isMouseScrollMovement: /*isMouseControls*/ ctx[1]
				}
			});

		let each_value = ensure_array_like(/*labels*/ ctx[2].slice(8, 16));
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c() {
				div9 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t0 = space();
				div7 = element("div");
				div3 = element("div");
				div1 = element("div");
				create_component(cardinalkeysset0.$$.fragment);
				t1 = space();
				div2 = element("div");
				create_component(cardinalkeysset1.$$.fragment);
				t2 = space();
				div6 = element("div");
				div4 = element("div");
				create_component(cardinalkeysset2.$$.fragment);
				t3 = space();
				div5 = element("div");
				create_component(cardinalkeysset3.$$.fragment);
				t4 = space();
				div8 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div0, "class", "mx-2 svelte-1ve2vwm");
				attr(div1, "class", "m-1 svelte-1ve2vwm");
				attr(div2, "class", "m-1 svelte-1ve2vwm");
				attr(div3, "class", "flex svelte-1ve2vwm");
				attr(div4, "class", "m-1 svelte-1ve2vwm");
				attr(div5, "class", "m-1 svelte-1ve2vwm");
				attr(div6, "class", "flex svelte-1ve2vwm");
				attr(div7, "class", "keys-set-container svelte-1ve2vwm");
				toggle_class(div7, "active", /*isActive*/ ctx[0]);
				attr(div8, "class", "mx-2 svelte-1ve2vwm");
				attr(div9, "class", "flex items-center svelte-1ve2vwm");
			},
			m(target, anchor) {
				insert(target, div9, anchor);
				append(div9, div0);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div0, null);
					}
				}

				append(div9, t0);
				append(div9, div7);
				append(div7, div3);
				append(div3, div1);
				mount_component(cardinalkeysset0, div1, null);
				append(div3, t1);
				append(div3, div2);
				mount_component(cardinalkeysset1, div2, null);
				append(div7, t2);
				append(div7, div6);
				append(div6, div4);
				mount_component(cardinalkeysset2, div4, null);
				append(div6, t3);
				append(div6, div5);
				mount_component(cardinalkeysset3, div5, null);
				append(div9, t4);
				append(div9, div8);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div8, null);
					}
				}

				current = true;
			},
			p(ctx, [dirty]) {
				if (dirty & /*getNumbering, labels*/ 4) {
					each_value_1 = ensure_array_like(/*labels*/ ctx[2].slice(0, 8));
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
						} else {
							each_blocks_1[i] = create_each_block_1(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(div0, null);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}

					each_blocks_1.length = each_value_1.length;
				}

				const cardinalkeysset0_changes = {};
				if (dirty & /*isActive*/ 1) cardinalkeysset0_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*isMouseControls*/ 2) cardinalkeysset0_changes.isCardinalMoveArrows = /*isMouseControls*/ ctx[1];
				cardinalkeysset0.$set(cardinalkeysset0_changes);
				const cardinalkeysset1_changes = {};
				if (dirty & /*isActive*/ 1) cardinalkeysset1_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*isMouseControls*/ 2) cardinalkeysset1_changes.isMouseButtons = /*isMouseControls*/ ctx[1];
				cardinalkeysset1.$set(cardinalkeysset1_changes);
				const cardinalkeysset2_changes = {};
				if (dirty & /*isActive*/ 1) cardinalkeysset2_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*isMouseControls*/ 2) cardinalkeysset2_changes.isMouseCursorMovement = /*isMouseControls*/ ctx[1];
				cardinalkeysset2.$set(cardinalkeysset2_changes);
				const cardinalkeysset3_changes = {};
				if (dirty & /*isActive*/ 1) cardinalkeysset3_changes.isActive = /*isActive*/ ctx[0];
				if (dirty & /*isMouseControls*/ 2) cardinalkeysset3_changes.isMouseScrollMovement = /*isMouseControls*/ ctx[1];
				cardinalkeysset3.$set(cardinalkeysset3_changes);

				if (!current || dirty & /*isActive*/ 1) {
					toggle_class(div7, "active", /*isActive*/ ctx[0]);
				}

				if (dirty & /*labels, getNumbering*/ 4) {
					each_value = ensure_array_like(/*labels*/ ctx[2].slice(8, 16));
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div8, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i(local) {
				if (current) return;
				transition_in(cardinalkeysset0.$$.fragment, local);
				transition_in(cardinalkeysset1.$$.fragment, local);
				transition_in(cardinalkeysset2.$$.fragment, local);
				transition_in(cardinalkeysset3.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(cardinalkeysset0.$$.fragment, local);
				transition_out(cardinalkeysset1.$$.fragment, local);
				transition_out(cardinalkeysset2.$$.fragment, local);
				transition_out(cardinalkeysset3.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div9);
				}

				destroy_each(each_blocks_1, detaching);
				destroy_component(cardinalkeysset0);
				destroy_component(cardinalkeysset1);
				destroy_component(cardinalkeysset2);
				destroy_component(cardinalkeysset3);
				destroy_each(each_blocks, detaching);
			}
		};
	}

	function getNumbering(idx) {
		if (idx == 0) return 'N'; else if (idx == 1) return 'E'; else if (idx == 2) return 'S'; else if (idx == 3) return 'W'; else if (idx == 4) return 'n'; else if (idx == 5) return 'e'; else if (idx == 6) return 's'; else if (idx == 7) return 'w';
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { isActive = true } = $$props;
		let { isMouseControls = false } = $$props;

		let labels = [
			"_",
			"Redo (Ctrl + Shift + z)",
			"_",
			"Undo (Ctrl + z)",
			"_",
			"_",
			"_",
			"_",
			"Select all (Ctrl + a)",
			"Copy (Ctrl + c)",
			"Paste (Ctrl + v)",
			"Cut (Ctrl + x)",
			"_",
			"_",
			"_",
			"_"
		];

		$$self.$$set = $$props => {
			if ('isActive' in $$props) $$invalidate(0, isActive = $$props.isActive);
			if ('isMouseControls' in $$props) $$invalidate(1, isMouseControls = $$props.isMouseControls);
		};

		return [isActive, isMouseControls, labels];
	}

	class ShortcutsLevel extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { isActive: 0, isMouseControls: 1 });
		}
	}

	/*
	Adapted from https://github.com/mattdesl
	Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
	*/

	/**
	 * https://svelte.dev/docs/svelte-easing
	 * @param {number} t
	 * @returns {number}
	 */
	function cubicOut(t) {
		const f = t - 1.0;
		return f * f * f + 1.0;
	}

	/**
	 * Animates the x and y positions and the opacity of an element. `in` transitions animate from the provided values, passed as parameters to the element's default values. `out` transitions animate from the element's default values to the provided values.
	 *
	 * https://svelte.dev/docs/svelte-transition#fly
	 * @param {Element} node
	 * @param {import('./public').FlyParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function fly(
		node,
		{ delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}
	) {
		const style = getComputedStyle(node);
		const target_opacity = +style.opacity;
		const transform = style.transform === 'none' ? '' : style.transform;
		const od = target_opacity * (1 - opacity);
		const [xValue, xUnit] = split_css_unit(x);
		const [yValue, yUnit] = split_css_unit(y);
		return {
			delay,
			duration,
			easing,
			css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - od * u}`
		};
	}

	/* src/App.svelte generated by Svelte v4.2.0 */

	function create_if_block(ctx) {
		let div;
		let shortcutslayer;
		let div_transition;
		let current;
		shortcutslayer = new ShortcutsLevel({});

		return {
			c() {
				div = element("div");
				create_component(shortcutslayer.$$.fragment);
				attr(div, "class", "overlay svelte-1e8ug76");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(shortcutslayer, div, null);
				current = true;
			},
			i(local) {
				if (current) return;
				transition_in(shortcutslayer.$$.fragment, local);

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: 50 }, true);
						div_transition.run(1);
					});
				}

				current = true;
			},
			o(local) {
				transition_out(shortcutslayer.$$.fragment, local);

				if (local) {
					if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: 50 }, false);
					div_transition.run(0);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(shortcutslayer);
				if (detaching && div_transition) div_transition.end();
			}
		};
	}

	function create_fragment(ctx) {
		let div2;
		let div0;
		let characterslevel;
		let t0;
		let div1;
		let t4;
		let current;

		characterslevel = new CharactersLevel({
				props: { activeLayer: /*activeLayer*/ ctx[0] }
			});

		let if_block = /*activeLayer*/ ctx[0] === 8 && create_if_block();

		return {
			c() {
				div2 = element("div");
				div0 = element("div");
				create_component(characterslevel.$$.fragment);
				t0 = space();
				div1 = element("div");
				div1.innerHTML = `Hold <strong>R2</strong> to go to shortcuts mode`;
				t4 = space();
				if (if_block) if_block.c();
				attr(div0, "class", "m-1");
				attr(div1, "class", "shortcuts-indicator-container svelte-1e8ug76");
				toggle_class(div1, "active", /*activeLayer*/ ctx[0] === 8);
				attr(div2, "class", "flex justify-center svelte-1e8ug76");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				mount_component(characterslevel, div0, null);
				append(div2, t0);
				append(div2, div1);
				append(div2, t4);
				if (if_block) if_block.m(div2, null);
				current = true;
			},
			p(ctx, [dirty]) {
				const characterslevel_changes = {};
				if (dirty & /*activeLayer*/ 1) characterslevel_changes.activeLayer = /*activeLayer*/ ctx[0];
				characterslevel.$set(characterslevel_changes);

				if (!current || dirty & /*activeLayer*/ 1) {
					toggle_class(div1, "active", /*activeLayer*/ ctx[0] === 8);
				}

				if (/*activeLayer*/ ctx[0] === 8) {
					if (if_block) {
						if (dirty & /*activeLayer*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block();
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(div2, null);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(characterslevel.$$.fragment, local);
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(characterslevel.$$.fragment, local);
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				destroy_component(characterslevel);
				if (if_block) if_block.d();
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
