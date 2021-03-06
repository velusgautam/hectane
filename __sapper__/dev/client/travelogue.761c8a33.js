import { S as SvelteComponentDev, i as init, d as dispatch_dev, s as safe_not_equal, z as validate_each_argument, v as validate_slots, p as create_component, q as claim_component, r as mount_component, u as transition_in, x as transition_out, y as destroy_component, e as element, a as space, A as query_selector_all, c as claim_element, h as detach_dev, f as claim_space, b as children, j as attr_dev, k as add_location, m as append_dev, l as insert_dev, B as check_outros, C as destroy_each, D as group_outros } from './client.ff83d44f.js';
import './Author.75e42c03.js';
import { g as getAuthors, P as Post } from './Post.c1a660bd.js';

/* src/routes/travelogue.svelte generated by Svelte v3.21.0 */
const file = "src/routes/travelogue.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[2] = list[i];
	return child_ctx;
}

// (36:2) {#each posts as post}
function create_each_block(ctx) {
	let current;

	const post = new Post({
			props: {
				post: /*post*/ ctx[2],
				author: /*authorMap*/ ctx[1].get(/*post*/ ctx[2].authorId)
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(post.$$.fragment);
		},
		l: function claim(nodes) {
			claim_component(post.$$.fragment, nodes);
		},
		m: function mount(target, anchor) {
			mount_component(post, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const post_changes = {};
			if (dirty & /*posts*/ 1) post_changes.post = /*post*/ ctx[2];
			if (dirty & /*authorMap, posts*/ 3) post_changes.author = /*authorMap*/ ctx[1].get(/*post*/ ctx[2].authorId);
			post.$set(post_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(post.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(post.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(post, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(36:2) {#each posts as post}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let meta;
	let t;
	let div;
	let current;
	let each_value = /*posts*/ ctx[0];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	const block = {
		c: function create() {
			meta = element("meta");
			t = space();
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			this.h();
		},
		l: function claim(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-przq4i\"]", document.head);
			meta = claim_element(head_nodes, "META", { name: true, content: true });
			head_nodes.forEach(detach_dev);
			t = claim_space(nodes);
			div = claim_element(nodes, "DIV", { class: true });
			var div_nodes = children(div);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].l(div_nodes);
			}

			div_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			document.title = "Hectane | Home Page";
			attr_dev(meta, "name", "description");
			attr_dev(meta, "content", "Hectane is a simple blog covering experiences from its authors. It\n    now covers areas like Technology, Interviews, Travelogue and Learnings. I\n    Velu S Gautam (Core Developer) of the blog invite contributions from others\n    with similar experiences. The below topics are the top 10 in the page now. ");
			add_location(meta, file, 26, 2, 706);
			attr_dev(div, "class", "listing--container");
			add_location(div, file, 34, 0, 1073);
		},
		m: function mount(target, anchor) {
			append_dev(document.head, meta);
			insert_dev(target, t, anchor);
			insert_dev(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*posts, authorMap*/ 3) {
				each_value = /*posts*/ ctx[0];
				validate_each_argument(each_value);
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
		i: function intro(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o: function outro(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d: function destroy(detaching) {
			detach_dev(meta);
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(div);
			destroy_each(each_blocks, detaching);
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

async function preload({ path }, session) {
	const res = await this.fetch(`http://localhost:3200/posts${path}/7`);
	const data = await res.json();

	// checking if data status is 200 and data is an array
	if (res.status === 200 && Array.isArray(data)) {
		const authorMap = await getAuthors(data, this.fetch);
		return { posts: data, authorMap };
	} else {
		this.error(res.status, data.message);
	}
}

function instance($$self, $$props, $$invalidate) {
	let { posts } = $$props;
	let { authorMap } = $$props;
	const writable_props = ["posts", "authorMap"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Travelogue> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Travelogue", $$slots, []);

	$$self.$set = $$props => {
		if ("posts" in $$props) $$invalidate(0, posts = $$props.posts);
		if ("authorMap" in $$props) $$invalidate(1, authorMap = $$props.authorMap);
	};

	$$self.$capture_state = () => ({
		getAuthors,
		preload,
		Post,
		posts,
		authorMap
	});

	$$self.$inject_state = $$props => {
		if ("posts" in $$props) $$invalidate(0, posts = $$props.posts);
		if ("authorMap" in $$props) $$invalidate(1, authorMap = $$props.authorMap);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [posts, authorMap];
}

class Travelogue extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, { posts: 0, authorMap: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Travelogue",
			options,
			id: create_fragment.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*posts*/ ctx[0] === undefined && !("posts" in props)) {
			console.warn("<Travelogue> was created without expected prop 'posts'");
		}

		if (/*authorMap*/ ctx[1] === undefined && !("authorMap" in props)) {
			console.warn("<Travelogue> was created without expected prop 'authorMap'");
		}
	}

	get posts() {
		throw new Error("<Travelogue>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set posts(value) {
		throw new Error("<Travelogue>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get authorMap() {
		throw new Error("<Travelogue>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set authorMap(value) {
		throw new Error("<Travelogue>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default Travelogue;
export { preload };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhdmVsb2d1ZS43NjFjOGEzMy5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3JvdXRlcy90cmF2ZWxvZ3VlLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0IGNvbnRleHQ9XCJtb2R1bGVcIj5cbiAgaW1wb3J0IHsgZ2V0QXV0aG9ycyB9IGZyb20gXCIuLi9faGVscGVycy9nZXQtYXV0aG9ycy5qc1wiO1xuICBleHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJlbG9hZCh7IHBhdGggfSwgc2Vzc2lvbikge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMuZmV0Y2goYEJBU0VfUEFUSC9wb3N0cyR7cGF0aH0vN2ApO1xuXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcy5qc29uKCk7XG5cbiAgICAvLyBjaGVja2luZyBpZiBkYXRhIHN0YXR1cyBpcyAyMDAgYW5kIGRhdGEgaXMgYW4gYXJyYXlcbiAgICBpZiAocmVzLnN0YXR1cyA9PT0gMjAwICYmIEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgIGNvbnN0IGF1dGhvck1hcCA9IGF3YWl0IGdldEF1dGhvcnMoZGF0YSwgdGhpcy5mZXRjaCk7XG5cbiAgICAgIHJldHVybiB7IHBvc3RzOiBkYXRhLCBhdXRob3JNYXAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lcnJvcihyZXMuc3RhdHVzLCBkYXRhLm1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuPC9zY3JpcHQ+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBQb3N0IGZyb20gXCIuLi9jb21wb25lbnRzL1Bvc3Quc3ZlbHRlXCI7XG4gIGV4cG9ydCBsZXQgcG9zdHM7XG4gIGV4cG9ydCBsZXQgYXV0aG9yTWFwO1xuPC9zY3JpcHQ+XG5cbjxzdmVsdGU6aGVhZD5cbiAgPHRpdGxlPkhlY3RhbmUgfCBIb21lIFBhZ2U8L3RpdGxlPlxuICA8bWV0YVxuICAgIG5hbWU9XCJkZXNjcmlwdGlvblwiXG4gICAgY29udGVudD1cIkhlY3RhbmUgaXMgYSBzaW1wbGUgYmxvZyBjb3ZlcmluZyBleHBlcmllbmNlcyBmcm9tIGl0cyBhdXRob3JzLiBJdFxuICAgIG5vdyBjb3ZlcnMgYXJlYXMgbGlrZSBUZWNobm9sb2d5LCBJbnRlcnZpZXdzLCBUcmF2ZWxvZ3VlIGFuZCBMZWFybmluZ3MuIElcbiAgICBWZWx1IFMgR2F1dGFtIChDb3JlIERldmVsb3Blcikgb2YgdGhlIGJsb2cgaW52aXRlIGNvbnRyaWJ1dGlvbnMgZnJvbSBvdGhlcnNcbiAgICB3aXRoIHNpbWlsYXIgZXhwZXJpZW5jZXMuIFRoZSBiZWxvdyB0b3BpY3MgYXJlIHRoZSB0b3AgMTAgaW4gdGhlIHBhZ2Ugbm93LiBcIiAvPlxuPC9zdmVsdGU6aGVhZD5cblxuPGRpdiBjbGFzcz1cImxpc3RpbmctLWNvbnRhaW5lclwiPlxuICB7I2VhY2ggcG9zdHMgYXMgcG9zdH1cbiAgICA8UG9zdCB7cG9zdH0gYXV0aG9yPXthdXRob3JNYXAuZ2V0KHBvc3QuYXV0aG9ySWQpfSAvPlxuICB7L2VhY2h9XG48L2Rpdj5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OzswQkFvQ3lCLEdBQVMsSUFBQyxHQUFHLFVBQUMsR0FBSSxJQUFDLFFBQVE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7MkVBQTNCLEdBQVMsSUFBQyxHQUFHLFVBQUMsR0FBSSxJQUFDLFFBQVE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs0QkFEM0MsR0FBSzs7OztnQ0FBVixNQUFJOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsyQkFBQyxHQUFLOzs7OytCQUFWLE1BQUk7Ozs7Ozs7Ozs7Ozs7Ozs7d0JBQUosTUFBSTs7Ozs7Ozs7OztrQ0FBSixNQUFJOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2VBakNnQixPQUFPLEdBQUcsSUFBSSxJQUFJLE9BQU87T0FDdkMsR0FBRyxTQUFTLElBQUksQ0FBQyxLQUFLLCtCQUFtQixJQUFJO09BRTdDLElBQUksU0FBUyxHQUFHLENBQUMsSUFBSTs7O0tBR3ZCLEdBQUcsQ0FBQyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSTtRQUNwQyxTQUFTLFNBQVMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSztXQUUxQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVM7O0VBRS9CLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTzs7Ozs7T0FYNUIsS0FBSztPQUNMLFNBQVM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7In0=
