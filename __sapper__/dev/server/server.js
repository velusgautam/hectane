'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var sirv = _interopDefault(require('sirv'));
var polka = _interopDefault(require('polka'));
var compression = _interopDefault(require('compression'));
var fs = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));
var Stream = _interopDefault(require('stream'));
var http = _interopDefault(require('http'));
var Url = _interopDefault(require('url'));
var https = _interopDefault(require('https'));
var zlib = _interopDefault(require('zlib'));

function noop() { }
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function null_to_empty(value) {
    return value == null ? '' : value;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
const escaped = {
    '"': '&quot;',
    "'": '&#39;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};
function escape(html) {
    return String(html).replace(/["'&<>]/g, match => escaped[match]);
}
function each(items, fn) {
    let str = '';
    for (let i = 0; i < items.length; i += 1) {
        str += fn(items[i], i);
    }
    return str;
}
const missing_component = {
    $$render: () => ''
};
function validate_component(component, name) {
    if (!component || !component.$$render) {
        if (name === 'svelte:component')
            name += ' this={...}';
        throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
    }
    return component;
}
let on_destroy;
function create_ssr_component(fn) {
    function $$render(result, props, bindings, slots) {
        const parent_component = current_component;
        const $$ = {
            on_destroy,
            context: new Map(parent_component ? parent_component.$$.context : []),
            // these will be immediately discarded
            on_mount: [],
            before_update: [],
            after_update: [],
            callbacks: blank_object()
        };
        set_current_component({ $$ });
        const html = fn(result, props, bindings, slots);
        set_current_component(parent_component);
        return html;
    }
    return {
        render: (props = {}, options = {}) => {
            on_destroy = [];
            const result = { title: '', head: '', css: new Set() };
            const html = $$render(result, props, {}, options);
            run_all(on_destroy);
            return {
                html,
                css: {
                    code: Array.from(result.css).map(css => css.code).join('\n'),
                    map: null // TODO
                },
                head: result.title + result.head
            };
        },
        $$render
    };
}
function add_attribute(name, value, boolean) {
    if (value == null || (boolean && !value))
        return '';
    return ` ${name}${value === true ? '' : `=${typeof value === 'string' ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
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
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

const authors = writable(new Map());

const getAuthors = async (data = [], fetch) => {
  const authorIds = new Set();
  let authorMap = new Map();
  let authorData = [];

  authors.subscribe((value) => {
    authorMap = value;
  });

  // creating unique author ids from the posts
  data.forEach((d) => {
    if (!authorMap.get(d.authorId)) {
      authorIds.add(d.authorId);
    }
  });

  if (authorIds.size > 0) {
    // getting author data for all unique authors to avoid multi fetch
    authorData = await Promise.all(
      Array.from(authorIds).map(async (id) => {
        // feching author data
        const res = await fetch(`http://localhost:3200/users/${id}`);
        return res.json();
      })
    );
    // creating a Map to hold unique authors by authorId as key
    authorData.forEach((u) => {
      authorMap.set(u._id, u);
    });
    authors.set(authorMap);
  }

  return authorMap;
};

/* src/components/Author.svelte generated by Svelte v3.21.0 */

const css = {
	code: ".post--author.svelte-4agr4z.svelte-4agr4z{display:flex;align-items:center;animation:svelte-4agr4z-falldown 1s ease}.post--author.svelte-4agr4z .img.svelte-4agr4z{border-radius:100%;border:2px solid #b3b3b3;box-shadow:-3px 6px 6px #d8d8d8}.details.svelte-4agr4z.svelte-4agr4z{font-size:small;margin-left:8px}@keyframes svelte-4agr4z-falldown{0%{opacity:0.5;transform:translateY(-1px)}100%{opacity:1;transform:translateY(0)}}",
	map: "{\"version\":3,\"file\":\"Author.svelte\",\"sources\":[\"Author.svelte\"],\"sourcesContent\":[\"<script>\\n  export let avathar;\\n  export let name;\\n  export let createdDate;\\n</script>\\n\\n<style>\\n  .post--author {\\n    display: flex;\\n    align-items: center;\\n    animation: falldown 1s ease;\\n  }\\n\\n  .post--author .img {\\n    border-radius: 100%;\\n    border: 2px solid #b3b3b3;\\n    box-shadow: -3px 6px 6px #d8d8d8;\\n  }\\n\\n  .details {\\n    font-size: small;\\n    margin-left: 8px;\\n  }\\n\\n  @keyframes falldown {\\n    0% {\\n      opacity: 0.5;\\n      transform: translateY(-1px);\\n    }\\n\\n    100% {\\n      opacity: 1;\\n      transform: translateY(0);\\n    }\\n  }\\n</style>\\n\\n<div class=\\\"post--author\\\">\\n  <img class=\\\"img\\\" src={avathar} alt=\\\"Velu S Gautam\\\" />\\n  <div class=\\\"details\\\">\\n    <div class=\\\"name\\\">{name}</div>\\n    <div class=\\\"date\\\">\\n      {new Date(createdDate)\\n        .toJSON()\\n        .slice(0, 10)\\n        .split('-')\\n        .reverse()\\n        .join('-')}\\n    </div>\\n  </div>\\n</div>\\n\"],\"names\":[],\"mappings\":\"AAOE,aAAa,4BAAC,CAAC,AACb,OAAO,CAAE,IAAI,CACb,WAAW,CAAE,MAAM,CACnB,SAAS,CAAE,sBAAQ,CAAC,EAAE,CAAC,IAAI,AAC7B,CAAC,AAED,2BAAa,CAAC,IAAI,cAAC,CAAC,AAClB,aAAa,CAAE,IAAI,CACnB,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,OAAO,CACzB,UAAU,CAAE,IAAI,CAAC,GAAG,CAAC,GAAG,CAAC,OAAO,AAClC,CAAC,AAED,QAAQ,4BAAC,CAAC,AACR,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,GAAG,AAClB,CAAC,AAED,WAAW,sBAAS,CAAC,AACnB,EAAE,AAAC,CAAC,AACF,OAAO,CAAE,GAAG,CACZ,SAAS,CAAE,WAAW,IAAI,CAAC,AAC7B,CAAC,AAED,IAAI,AAAC,CAAC,AACJ,OAAO,CAAE,CAAC,CACV,SAAS,CAAE,WAAW,CAAC,CAAC,AAC1B,CAAC,AACH,CAAC\"}"
};

const Author = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { avathar } = $$props;
	let { name } = $$props;
	let { createdDate } = $$props;
	if ($$props.avathar === void 0 && $$bindings.avathar && avathar !== void 0) $$bindings.avathar(avathar);
	if ($$props.name === void 0 && $$bindings.name && name !== void 0) $$bindings.name(name);
	if ($$props.createdDate === void 0 && $$bindings.createdDate && createdDate !== void 0) $$bindings.createdDate(createdDate);
	$$result.css.add(css);

	return `<div class="${"post--author svelte-4agr4z"}"><img class="${"img svelte-4agr4z"}"${add_attribute("src", avathar, 0)} alt="${"Velu S Gautam"}">
  <div class="${"details svelte-4agr4z"}"><div class="${"name"}">${escape(name)}</div>
    <div class="${"date"}">${escape(new Date(createdDate).toJSON().slice(0, 10).split("-").reverse().join("-"))}</div></div></div>`;
});

/* src/components/Post.svelte generated by Svelte v3.21.0 */

const css$1 = {
	code: ".post--container.svelte-g9b0pe.svelte-g9b0pe{align-self:start}@media only screen and (min-width: 800px){.listing--container>.svelte-g9b0pe.svelte-g9b0pe:nth-child(1){grid-column:1 / 4;display:grid;grid-template-columns:2fr 1fr;grid-column-gap:5px}.listing--container .svelte-g9b0pe:nth-child(1) .post--title-image.svelte-g9b0pe{grid-column:1 / 2;grid-row:1 / 4;align-self:start}.listing--container .svelte-g9b0pe:nth-child(1) .post--header.svelte-g9b0pe{margin-top:0px;margin-left:15px;display:block}.listing--container .svelte-g9b0pe:nth-child(1) .post--header .post--title.svelte-g9b0pe,.listing--container .svelte-g9b0pe:nth-child(1) .post--header .post--subTitle.svelte-g9b0pe{margin-top:0px}.listing--container :nth-child(1) .post--author{grid-column:2 / 3;grid-row:3 / 4;align-self:start;margin-left:15px}}.post--title-image.svelte-g9b0pe.svelte-g9b0pe{display:block;margin-bottom:15px;width:100%}a.svelte-g9b0pe.svelte-g9b0pe{text-decoration:none;color:var(--textBlack)}.post--title.svelte-g9b0pe.svelte-g9b0pe{font-size:1.5rem;font-weight:500}@keyframes svelte-g9b0pe-falldown{0%{opacity:0;transform:translateY(-50px)}100%{opacity:1;transform:translateY(0)}}",
	map: "{\"version\":3,\"file\":\"Post.svelte\",\"sources\":[\"Post.svelte\"],\"sourcesContent\":[\"<script>\\n  import Author from \\\"./Author.svelte\\\";\\n  export let post;\\n  export let author;\\n</script>\\n\\n<style>\\n  .post--container {\\n    /* grid-area: post; */\\n    align-self: start;\\n  }\\n  @media only screen and (min-width: 800px) {\\n    .listing--container > :nth-child(1) {\\n      grid-column: 1 / 4;\\n      display: grid;\\n      grid-template-columns: 2fr 1fr;\\n      grid-column-gap: 5px;\\n    }\\n\\n    .listing--container :nth-child(1) .post--title-image {\\n      grid-column: 1 / 2;\\n      grid-row: 1 / 4;\\n      align-self: start;\\n      /* height: 350px; */\\n    }\\n\\n    .listing--container :nth-child(1) .post--header {\\n      margin-top: 0px;\\n      margin-left: 15px;\\n      display: block;\\n    }\\n\\n    .listing--container :nth-child(1) .post--header .post--title,\\n    .listing--container :nth-child(1) .post--header .post--subTitle {\\n      margin-top: 0px;\\n    }\\n\\n    :global(.listing--container :nth-child(1) .post--author) {\\n      grid-column: 2 / 3;\\n      grid-row: 3 / 4;\\n      align-self: start;\\n      margin-left: 15px;\\n    }\\n  }\\n\\n  .post--title-image {\\n    display: block;\\n    margin-bottom: 15px;\\n    width: 100%;\\n  }\\n\\n  a {\\n    text-decoration: none;\\n    color: var(--textBlack);\\n  }\\n\\n  .post--title {\\n    font-size: 1.5rem;\\n    font-weight: 500;\\n  }\\n\\n  /* .post--author {\\n    display: flex;\\n    align-items: center;\\n    animation: falldown 1s ease;\\n  }\\n\\n  .post--author .img {\\n    border-radius: 100%;\\n    border: 2px solid #b3b3b3;\\n    box-shadow: -3px 6px 6px #d8d8d8;\\n  }\\n\\n  .details {\\n    font-size: small;\\n    margin-left: 8px;\\n  } */\\n\\n  @keyframes falldown {\\n    0% {\\n      opacity: 0;\\n      transform: translateY(-50px);\\n    }\\n\\n    100% {\\n      opacity: 1;\\n      transform: translateY(0);\\n    }\\n  }\\n</style>\\n\\n<div class=\\\"post--container\\\">\\n\\n  <a href={`./blog/${post.route}`} rel=\\\"prefetch\\\">\\n    <img\\n      class=\\\"post--title-image\\\"\\n      src={`https://assets.hectane.com/${post.route}/listing.jpg`}\\n      alt={post.route} />\\n  </a>\\n  <div>\\n    <a href={`./blog/${post.route}`} class=\\\"post--header\\\" rel=\\\"prefetch\\\">\\n      <h3 class=\\\"post--title\\\">{post.title}</h3>\\n      <p class=\\\"post--subTitle\\\">{post.subTitle}</p>\\n    </a>\\n\\n    <!-- <div class=\\\"post--author\\\">\\n      <img class=\\\"img\\\" src={author.avathar} alt=\\\"Velu S Gautam\\\" />\\n      <div class=\\\"details\\\">\\n        <div class=\\\"name\\\">{author.name}</div>\\n        <div class=\\\"date\\\">\\n          {new Date(post.createdDate)\\n            .toJSON()\\n            .slice(0, 10)\\n            .split('-')\\n            .reverse()\\n            .join('-')}\\n        </div>\\n      </div>\\n    </div> -->\\n    <Author\\n      name={author.name}\\n      avathar={author.avathar}\\n      createdDate={post.createdDate} />\\n  </div>\\n\\n</div>\\n\"],\"names\":[],\"mappings\":\"AAOE,gBAAgB,4BAAC,CAAC,AAEhB,UAAU,CAAE,KAAK,AACnB,CAAC,AACD,OAAO,IAAI,CAAC,MAAM,CAAC,GAAG,CAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AACzC,mBAAmB,6BAAG,WAAW,CAAC,CAAC,AAAC,CAAC,AACnC,WAAW,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CAClB,OAAO,CAAE,IAAI,CACb,qBAAqB,CAAE,GAAG,CAAC,GAAG,CAC9B,YAAY,GAAG,CAAE,GAAG,AACtB,CAAC,AAED,mBAAmB,eAAC,WAAW,CAAC,CAAC,CAAC,kBAAkB,cAAC,CAAC,AACpD,WAAW,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CAClB,QAAQ,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CACf,UAAU,CAAE,KAAK,AAEnB,CAAC,AAED,mBAAmB,eAAC,WAAW,CAAC,CAAC,CAAC,aAAa,cAAC,CAAC,AAC/C,UAAU,CAAE,GAAG,CACf,WAAW,CAAE,IAAI,CACjB,OAAO,CAAE,KAAK,AAChB,CAAC,AAED,QAAQ,WAAW,eAAC,WAAW,CAAC,CAAC,CAAC,aAAa,CAAC,0BAAY,CAC5D,mBAAmB,eAAC,WAAW,CAAC,CAAC,CAAC,aAAa,CAAC,eAAe,cAAC,CAAC,AAC/D,CAAC,SAAS,CAAE,GAAG,AACjB,CAAC,AAEO,+BAA+B,gBAAgB,AAAE,CAAC,AACxD,WAAW,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CAClB,QAAQ,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CACf,UAAU,CAAE,KAAK,CACjB,WAAW,CAAE,IAAI,AACnB,CAAC,AACH,CAAC,AAED,kBAAkB,4BAAC,CAAC,AAClB,OAAO,CAAE,KAAK,CACd,aAAa,CAAE,IAAI,CACnB,KAAK,CAAE,IAAI,AACb,CAAC,AAED,CAAC,4BAAC,CAAC,AACD,eAAe,CAAE,IAAI,CACrB,KAAK,CAAE,IAAI,WAAW,CAAC,AACzB,CAAC,AAED,YAAY,4BAAC,CAAC,AACZ,SAAS,CAAE,MAAM,CACjB,WAAW,CAAE,GAAG,AAClB,CAAC,AAmBD,WAAW,sBAAS,CAAC,AACnB,EAAE,AAAC,CAAC,AACF,OAAO,CAAE,CAAC,CACV,SAAS,CAAE,WAAW,KAAK,CAAC,AAC9B,CAAC,AAED,IAAI,AAAC,CAAC,AACJ,OAAO,CAAE,CAAC,CACV,SAAS,CAAE,WAAW,CAAC,CAAC,AAC1B,CAAC,AACH,CAAC\"}"
};

const Post = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { post } = $$props;
	let { author } = $$props;
	if ($$props.post === void 0 && $$bindings.post && post !== void 0) $$bindings.post(post);
	if ($$props.author === void 0 && $$bindings.author && author !== void 0) $$bindings.author(author);
	$$result.css.add(css$1);

	return `<div class="${"post--container svelte-g9b0pe"}"><a${add_attribute("href", `./blog/${post.route}`, 0)} rel="${"prefetch"}" class="${"svelte-g9b0pe"}"><img class="${"post--title-image svelte-g9b0pe"}"${add_attribute("src", `https://assets.hectane.com/${post.route}/listing.jpg`, 0)}${add_attribute("alt", post.route, 0)}></a>
  <div class="${"svelte-g9b0pe"}"><a${add_attribute("href", `./blog/${post.route}`, 0)} class="${"post--header svelte-g9b0pe"}" rel="${"prefetch"}"><h3 class="${"post--title svelte-g9b0pe"}">${escape(post.title)}</h3>
      <p class="${"post--subTitle svelte-g9b0pe"}">${escape(post.subTitle)}</p></a>

    
    ${validate_component(Author, "Author").$$render(
		$$result,
		{
			name: author.name,
			avathar: author.avathar,
			createdDate: post.createdDate
		},
		{},
		{}
	)}</div></div>`;
});

/* src/routes/index.svelte generated by Svelte v3.21.0 */

async function preload({ path }) {
	const res = await this.fetch("http://localhost:3200/posts/limit/7");
	const data = await res.json();

	// checking if data status is 200 and data is an array
	if (res.status === 200 && Array.isArray(data)) {
		// creating a new set to hold unique author ids
		const authorMap = await getAuthors(data, this.fetch);

		return { posts: data, authorMap };
	} else {
		this.error(res.status, data.message);
	}
}

const Routes = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { posts } = $$props;
	let { authorMap } = $$props;
	if ($$props.posts === void 0 && $$bindings.posts && posts !== void 0) $$bindings.posts(posts);
	if ($$props.authorMap === void 0 && $$bindings.authorMap && authorMap !== void 0) $$bindings.authorMap(authorMap);

	return `${($$result.head += `${($$result.title = `<title>Hectane | Home Page</title>`, "")}<meta name="${"description"}" content="${"Hectane is a simple blog covering experiences from its authors. It\n    now covers areas like Technology, Interviews, Travelogue and Learnings. I\n    Velu S Gautam (Core Developer) of the blog invite contributions from others\n    with similar experiences. The below topics are the top 10 in the page now. "}">`, "")}

<div class="${"listing--container"}">${each(posts, post => `${validate_component(Post, "Post").$$render(
		$$result,
		{
			post,
			author: authorMap.get(post.authorId)
		},
		{},
		{}
	)}`)}</div>`;
});

/* src/routes/interviews.svelte generated by Svelte v3.21.0 */

async function preload$1({ path }, session) {
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

const Interviews = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { posts } = $$props;
	let { authorMap } = $$props;
	if ($$props.posts === void 0 && $$bindings.posts && posts !== void 0) $$bindings.posts(posts);
	if ($$props.authorMap === void 0 && $$bindings.authorMap && authorMap !== void 0) $$bindings.authorMap(authorMap);

	return `${($$result.head += `${($$result.title = `<title>Hectane | Home Page</title>`, "")}<meta name="${"description"}" content="${"Hectane is a simple blog covering experiences from its authors. It\n    now covers areas like Technology, Interviews, Travelogue and Learnings. I\n    Velu S Gautam (Core Developer) of the blog invite contributions from others\n    with similar experiences. The below topics are the top 10 in the page now. "}">`, "")}

<div class="${"listing--container"}">${each(posts, post => `${validate_component(Post, "Post").$$render(
		$$result,
		{
			post,
			author: authorMap.get(post.authorId)
		},
		{},
		{}
	)}`)}</div>`;
});

/* src/routes/technology.svelte generated by Svelte v3.21.0 */

async function preload$2({ path }, session) {
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

const Technology = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { posts } = $$props;
	let { authorMap } = $$props;
	if ($$props.posts === void 0 && $$bindings.posts && posts !== void 0) $$bindings.posts(posts);
	if ($$props.authorMap === void 0 && $$bindings.authorMap && authorMap !== void 0) $$bindings.authorMap(authorMap);

	return `${($$result.head += `${($$result.title = `<title>Hectane | Home Page</title>`, "")}<meta name="${"description"}" content="${"Hectane is a simple blog covering experiences from its authors. It\n    now covers areas like Technology, Interviews, Travelogue and Learnings. I\n    Velu S Gautam (Core Developer) of the blog invite contributions from others\n    with similar experiences. The below topics are the top 10 in the page now. "}">`, "")}

<div class="${"listing--container"}">${each(posts, post => `${validate_component(Post, "Post").$$render(
		$$result,
		{
			post,
			author: authorMap.get(post.authorId)
		},
		{},
		{}
	)}`)}</div>`;
});

/* src/routes/travelogue.svelte generated by Svelte v3.21.0 */

async function preload$3({ path }, session) {
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

const Travelogue = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { posts } = $$props;
	let { authorMap } = $$props;
	if ($$props.posts === void 0 && $$bindings.posts && posts !== void 0) $$bindings.posts(posts);
	if ($$props.authorMap === void 0 && $$bindings.authorMap && authorMap !== void 0) $$bindings.authorMap(authorMap);

	return `${($$result.head += `${($$result.title = `<title>Hectane | Home Page</title>`, "")}<meta name="${"description"}" content="${"Hectane is a simple blog covering experiences from its authors. It\n    now covers areas like Technology, Interviews, Travelogue and Learnings. I\n    Velu S Gautam (Core Developer) of the blog invite contributions from others\n    with similar experiences. The below topics are the top 10 in the page now. "}">`, "")}

<div class="${"listing--container"}">${each(posts, post => `${validate_component(Post, "Post").$$render(
		$$result,
		{
			post,
			author: authorMap.get(post.authorId)
		},
		{},
		{}
	)}`)}</div>`;
});

/* src/routes/learnings.svelte generated by Svelte v3.21.0 */

async function preload$4({ path }, session) {
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

const Learnings = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { posts } = $$props;
	let { authorMap } = $$props;
	if ($$props.posts === void 0 && $$bindings.posts && posts !== void 0) $$bindings.posts(posts);
	if ($$props.authorMap === void 0 && $$bindings.authorMap && authorMap !== void 0) $$bindings.authorMap(authorMap);

	return `${($$result.head += `${($$result.title = `<title>Hectane | Home Page</title>`, "")}<meta name="${"description"}" content="${"Hectane is a simple blog covering experiences from its authors. It\n    now covers areas like Technology, Interviews, Travelogue and Learnings. I\n    Velu S Gautam (Core Developer) of the blog invite contributions from others\n    with similar experiences. The below topics are the top 10 in the page now. "}">`, "")}

<div class="${"listing--container"}">${each(posts, post => `${validate_component(Post, "Post").$$render(
		$$result,
		{
			post,
			author: authorMap.get(post.authorId)
		},
		{},
		{}
	)}`)}</div>`;
});

/* src/routes/about.svelte generated by Svelte v3.21.0 */

const About = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	return `${($$result.head += `${($$result.title = `<title>About</title>`, "")}`, "")}

<h1>About this site</h1>

<p>This is the &#39;about&#39; page. There&#39;s not much here.</p>`;
});

// https://github.com/substack/deep-freeze/blob/master/index.js
function deepFreeze (o) {
  Object.freeze(o);

  var objIsFunction = typeof o === 'function';

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (o.hasOwnProperty(prop)
    && o[prop] !== null
    && (typeof o[prop] === "object" || typeof o[prop] === "function")
    // IE11 fix: https://github.com/highlightjs/highlight.js/issues/2318
    // TODO: remove in the future
    && (objIsFunction ? prop !== 'caller' && prop !== 'callee' && prop !== 'arguments' : true)
    && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });

  return o;
}

function escapeHTML(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


/**
 * performs a shallow merge of multiple objects into one
 *
 * @arguments list of objects with properties to merge
 * @returns a single new object
 */
function inherit(parent) {  // inherit(parent, override_obj, override_obj, ...)
  var key;
  var result = {};
  var objects = Array.prototype.slice.call(arguments, 1);

  for (key in parent)
    result[key] = parent[key];
  objects.forEach(function(obj) {
    for (key in obj)
      result[key] = obj[key];
  });
  return result;
}

/* Stream merging */


function tag(node) {
  return node.nodeName.toLowerCase();
}


function nodeStream(node) {
  var result = [];
  (function _nodeStream(node, offset) {
    for (var child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3)
        offset += child.nodeValue.length;
      else if (child.nodeType === 1) {
        result.push({
          event: 'start',
          offset: offset,
          node: child
        });
        offset = _nodeStream(child, offset);
        // Prevent void elements from having an end tag that would actually
        // double them in the output. There are more void elements in HTML
        // but we list only those realistically expected in code display.
        if (!tag(child).match(/br|hr|img|input/)) {
          result.push({
            event: 'stop',
            offset: offset,
            node: child
          });
        }
      }
    }
    return offset;
  })(node, 0);
  return result;
}

function mergeStreams(original, highlighted, value) {
  var processed = 0;
  var result = '';
  var nodeStack = [];

  function selectStream() {
    if (!original.length || !highlighted.length) {
      return original.length ? original : highlighted;
    }
    if (original[0].offset !== highlighted[0].offset) {
      return (original[0].offset < highlighted[0].offset) ? original : highlighted;
    }

    /*
    To avoid starting the stream just before it should stop the order is
    ensured that original always starts first and closes last:

    if (event1 == 'start' && event2 == 'start')
      return original;
    if (event1 == 'start' && event2 == 'stop')
      return highlighted;
    if (event1 == 'stop' && event2 == 'start')
      return original;
    if (event1 == 'stop' && event2 == 'stop')
      return highlighted;

    ... which is collapsed to:
    */
    return highlighted[0].event === 'start' ? original : highlighted;
  }

  function open(node) {
    function attr_str(a) {
      return ' ' + a.nodeName + '="' + escapeHTML(a.value).replace(/"/g, '&quot;') + '"';
    }
    result += '<' + tag(node) + [].map.call(node.attributes, attr_str).join('') + '>';
  }

  function close(node) {
    result += '</' + tag(node) + '>';
  }

  function render(event) {
    (event.event === 'start' ? open : close)(event.node);
  }

  while (original.length || highlighted.length) {
    var stream = selectStream();
    result += escapeHTML(value.substring(processed, stream[0].offset));
    processed = stream[0].offset;
    if (stream === original) {
      /*
      On any opening or closing tag of the original markup we first close
      the entire highlighted node stack, then render the original tag along
      with all the following original tags at the same offset and then
      reopen all the tags on the highlighted stack.
      */
      nodeStack.reverse().forEach(close);
      do {
        render(stream.splice(0, 1)[0]);
        stream = selectStream();
      } while (stream === original && stream.length && stream[0].offset === processed);
      nodeStack.reverse().forEach(open);
    } else {
      if (stream[0].event === 'start') {
        nodeStack.push(stream[0].node);
      } else {
        nodeStack.pop();
      }
      render(stream.splice(0, 1)[0]);
    }
  }
  return result + escapeHTML(value.substr(processed));
}

var utils = /*#__PURE__*/Object.freeze({
  __proto__: null,
  escapeHTML: escapeHTML,
  inherit: inherit,
  nodeStream: nodeStream,
  mergeStreams: mergeStreams
});

const SPAN_CLOSE = '</span>';

const emitsWrappingTags = (node) => {
  return !!node.kind;
};

class HTMLRenderer {
  constructor(tree, options) {
    this.buffer = "";
    this.classPrefix = options.classPrefix;
    tree.walk(this);
  }

  // renderer API

  addText(text) {
    this.buffer += escapeHTML(text);
  }

  openNode(node) {
    if (!emitsWrappingTags(node)) return;

    let className = node.kind;
    if (!node.sublanguage)
      className = `${this.classPrefix}${className}`;
    this.span(className);
  }

  closeNode(node) {
    if (!emitsWrappingTags(node)) return;

    this.buffer += SPAN_CLOSE;
  }

  // helpers

  span(className) {
    this.buffer += `<span class="${className}">`;
  }

  value() {
    return this.buffer;
  }
}

class TokenTree {
  constructor() {
    this.rootNode = { children: [] };
    this.stack = [ this.rootNode ];
  }

  get top() {
    return this.stack[this.stack.length - 1];
  }

  get root() { return this.rootNode };

  add(node) {
    this.top.children.push(node);
  }

  openNode(kind) {
    let node = { kind, children: [] };
    this.add(node);
    this.stack.push(node);
  }

  closeNode() {
    if (this.stack.length > 1)
      return this.stack.pop();
  }

  closeAllNodes() {
    while (this.closeNode());
  }

  toJSON() {
    return JSON.stringify(this.rootNode, null, 4);
  }

  walk(builder) {
    return this.constructor._walk(builder, this.rootNode);
  }

  static _walk(builder, node) {
    if (typeof node === "string") {
      builder.addText(node);
    } else if (node.children) {
      builder.openNode(node);
      node.children.forEach((child) => this._walk(builder, child));
      builder.closeNode(node);
    }
    return builder;
  }

  static _collapse(node) {
    if (!node.children) {
      return;
    }
    if (node.children.every(el => typeof el === "string")) {
      node.text = node.children.join("");
      delete node["children"];
    } else {
      node.children.forEach((child) => {
        if (typeof child === "string") return;
        TokenTree._collapse(child);
      });
    }
  }
}

/**
  Currently this is all private API, but this is the minimal API necessary
  that an Emitter must implement to fully support the parser.

  Minimal interface:

  - addKeyword(text, kind)
  - addText(text)
  - addSublanguage(emitter, subLangaugeName)
  - finalize()
  - openNode(kind)
  - closeNode()
  - closeAllNodes()
  - toHTML()

*/
class TokenTreeEmitter extends TokenTree {
  constructor(options) {
    super();
    this.options = options;
  }

  addKeyword(text, kind) {
    if (text === "") { return; }

    this.openNode(kind);
    this.addText(text);
    this.closeNode();
  }

  addText(text) {
    if (text === "") { return; }

    this.add(text);
  }

  addSublanguage(emitter, name) {
    let node = emitter.root;
    node.kind = name;
    node.sublanguage = true;
    this.add(node);
  }

  toHTML() {
    let renderer = new HTMLRenderer(this, this.options);
    return renderer.value();
  }

  finalize() {
    return;
  }

}

function escape$1(value) {
  return new RegExp(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
}

function source(re) {
  // if it's a regex get it's source,
  // otherwise it's a string already so just return it
  return (re && re.source) || re;
}

function countMatchGroups(re) {
  return (new RegExp(re.toString() + '|')).exec('').length - 1;
}

function startsWith(re, lexeme) {
  var match = re && re.exec(lexeme);
  return match && match.index === 0;
}

// join logically computes regexps.join(separator), but fixes the
// backreferences so they continue to match.
// it also places each individual regular expression into it's own
// match group, keeping track of the sequencing of those match groups
// is currently an exercise for the caller. :-)
function join(regexps, separator) {
  // backreferenceRe matches an open parenthesis or backreference. To avoid
  // an incorrect parse, it additionally matches the following:
  // - [...] elements, where the meaning of parentheses and escapes change
  // - other escape sequences, so we do not misparse escape sequences as
  //   interesting elements
  // - non-matching or lookahead parentheses, which do not capture. These
  //   follow the '(' with a '?'.
  var backreferenceRe = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
  var numCaptures = 0;
  var ret = '';
  for (var i = 0; i < regexps.length; i++) {
    numCaptures += 1;
    var offset = numCaptures;
    var re = source(regexps[i]);
    if (i > 0) {
      ret += separator;
    }
    ret += "(";
    while (re.length > 0) {
      var match = backreferenceRe.exec(re);
      if (match == null) {
        ret += re;
        break;
      }
      ret += re.substring(0, match.index);
      re = re.substring(match.index + match[0].length);
      if (match[0][0] == '\\' && match[1]) {
        // Adjust the backreference.
        ret += '\\' + String(Number(match[1]) + offset);
      } else {
        ret += match[0];
        if (match[0] == '(') {
          numCaptures++;
        }
      }
    }
    ret += ")";
  }
  return ret;
}

// Common regexps
const IDENT_RE = '[a-zA-Z]\\w*';
const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

// Common modes
const BACKSLASH_ESCAPE = {
  begin: '\\\\[\\s\\S]', relevance: 0
};
const APOS_STRING_MODE = {
  className: 'string',
  begin: '\'', end: '\'',
  illegal: '\\n',
  contains: [BACKSLASH_ESCAPE]
};
const QUOTE_STRING_MODE = {
  className: 'string',
  begin: '"', end: '"',
  illegal: '\\n',
  contains: [BACKSLASH_ESCAPE]
};
const PHRASAL_WORDS_MODE = {
  begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
};
const COMMENT = function (begin, end, inherits) {
  var mode = inherit(
    {
      className: 'comment',
      begin: begin, end: end,
      contains: []
    },
    inherits || {}
  );
  mode.contains.push(PHRASAL_WORDS_MODE);
  mode.contains.push({
    className: 'doctag',
    begin: '(?:TODO|FIXME|NOTE|BUG|XXX):',
    relevance: 0
  });
  return mode;
};
const C_LINE_COMMENT_MODE = COMMENT('//', '$');
const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');
const HASH_COMMENT_MODE = COMMENT('#', '$');
const NUMBER_MODE = {
  className: 'number',
  begin: NUMBER_RE,
  relevance: 0
};
const C_NUMBER_MODE = {
  className: 'number',
  begin: C_NUMBER_RE,
  relevance: 0
};
const BINARY_NUMBER_MODE = {
  className: 'number',
  begin: BINARY_NUMBER_RE,
  relevance: 0
};
const CSS_NUMBER_MODE = {
  className: 'number',
  begin: NUMBER_RE + '(' +
    '%|em|ex|ch|rem'  +
    '|vw|vh|vmin|vmax' +
    '|cm|mm|in|pt|pc|px' +
    '|deg|grad|rad|turn' +
    '|s|ms' +
    '|Hz|kHz' +
    '|dpi|dpcm|dppx' +
    ')?',
  relevance: 0
};
const REGEXP_MODE = {
  // this outer rule makes sure we actually have a WHOLE regex and not simply
  // an expression such as:
  //
  //     3 / something
  //
  // (which will then blow up when regex's `illegal` sees the newline)
  begin: /(?=\/[^\/\n]*\/)/,
  contains: [{
    className: 'regexp',
    begin: /\//, end: /\/[gimuy]*/,
    illegal: /\n/,
    contains: [
      BACKSLASH_ESCAPE,
      {
        begin: /\[/, end: /\]/,
        relevance: 0,
        contains: [BACKSLASH_ESCAPE]
      }
    ]
  }]
};
const TITLE_MODE = {
  className: 'title',
  begin: IDENT_RE,
  relevance: 0
};
const UNDERSCORE_TITLE_MODE = {
  className: 'title',
  begin: UNDERSCORE_IDENT_RE,
  relevance: 0
};
const METHOD_GUARD = {
  // excludes method names from keyword processing
  begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
  relevance: 0
};

var MODES = /*#__PURE__*/Object.freeze({
  __proto__: null,
  IDENT_RE: IDENT_RE,
  UNDERSCORE_IDENT_RE: UNDERSCORE_IDENT_RE,
  NUMBER_RE: NUMBER_RE,
  C_NUMBER_RE: C_NUMBER_RE,
  BINARY_NUMBER_RE: BINARY_NUMBER_RE,
  RE_STARTERS_RE: RE_STARTERS_RE,
  BACKSLASH_ESCAPE: BACKSLASH_ESCAPE,
  APOS_STRING_MODE: APOS_STRING_MODE,
  QUOTE_STRING_MODE: QUOTE_STRING_MODE,
  PHRASAL_WORDS_MODE: PHRASAL_WORDS_MODE,
  COMMENT: COMMENT,
  C_LINE_COMMENT_MODE: C_LINE_COMMENT_MODE,
  C_BLOCK_COMMENT_MODE: C_BLOCK_COMMENT_MODE,
  HASH_COMMENT_MODE: HASH_COMMENT_MODE,
  NUMBER_MODE: NUMBER_MODE,
  C_NUMBER_MODE: C_NUMBER_MODE,
  BINARY_NUMBER_MODE: BINARY_NUMBER_MODE,
  CSS_NUMBER_MODE: CSS_NUMBER_MODE,
  REGEXP_MODE: REGEXP_MODE,
  TITLE_MODE: TITLE_MODE,
  UNDERSCORE_TITLE_MODE: UNDERSCORE_TITLE_MODE,
  METHOD_GUARD: METHOD_GUARD
});

// keywords that should have no default relevance value
var COMMON_KEYWORDS = 'of and for in not or if then'.split(' ');

// compilation

function compileLanguage(language) {

  function langRe(value, global) {
    return new RegExp(
      source(value),
      'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
    );
  }

  /**
    Stores multiple regular expressions and allows you to quickly search for
    them all in a string simultaneously - returning the first match.  It does
    this by creating a huge (a|b|c) regex - each individual item wrapped with ()
    and joined by `|` - using match groups to track position.  When a match is
    found checking which position in the array has content allows us to figure
    out which of the original regexes / match groups triggered the match.

    The match object itself (the result of `Regex.exec`) is returned but also
    enhanced by merging in any meta-data that was registered with the regex.
    This is how we keep track of which mode matched, and what type of rule
    (`illegal`, `begin`, end, etc).
  */
  class MultiRegex {
    constructor() {
      this.matchIndexes = {};
      this.regexes = [];
      this.matchAt = 1;
      this.position = 0;
    }

    addRule(re, opts) {
      opts.position = this.position++;
      this.matchIndexes[this.matchAt] = opts;
      this.regexes.push([opts, re]);
      this.matchAt += countMatchGroups(re) + 1;
    }

    compile() {
      if (this.regexes.length === 0) {
        // avoids the need to check length every time exec is called
        this.exec = () => null;
      }
      let terminators = this.regexes.map(el => el[1]);
      this.matcherRe = langRe(join(terminators, '|'), true);
      this.lastIndex = 0;
    }

    exec(s) {
      this.matcherRe.lastIndex = this.lastIndex;
      let match = this.matcherRe.exec(s);
      if (!match) { return null; }

      let i = match.findIndex((el, i) => i>0 && el!=undefined);
      let matchData = this.matchIndexes[i];

      return Object.assign(match, matchData);
    }
  }

  /*
    Created to solve the key deficiently with MultiRegex - there is no way to
    test for multiple matches at a single location.  Why would we need to do
    that?  In the future a more dynamic engine will allow certain matches to be
    ignored.  An example: if we matched say the 3rd regex in a large group but
    decided to ignore it - we'd need to started testing again at the 4th
    regex... but MultiRegex itself gives us no real way to do that.

    So what this class creates MultiRegexs on the fly for whatever search
    position they are needed.

    NOTE: These additional MultiRegex objects are created dynamically.  For most
    grammars most of the time we will never actually need anything more than the
    first MultiRegex - so this shouldn't have too much overhead.

    Say this is our search group, and we match regex3, but wish to ignore it.

      regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0

    What we need is a new MultiRegex that only includes the remaining
    possibilities:

      regex4 | regex5                               ' ie, startAt = 3

    This class wraps all that complexity up in a simple API... `startAt` decides
    where in the array of expressions to start doing the matching. It
    auto-increments, so if a match is found at position 2, then startAt will be
    set to 3.  If the end is reached startAt will return to 0.

    MOST of the time the parser will be setting startAt manually to 0.
  */
  class ResumableMultiRegex {
    constructor() {
      this.rules = [];
      this.multiRegexes = [];
      this.count = 0;

      this.lastIndex = 0;
      this.regexIndex = 0;
    }

    getMatcher(index) {
      if (this.multiRegexes[index]) return this.multiRegexes[index];

      let matcher = new MultiRegex();
      this.rules.slice(index).forEach(([re, opts])=> matcher.addRule(re,opts));
      matcher.compile();
      this.multiRegexes[index] = matcher;
      return matcher;
    }

    considerAll() {
      this.regexIndex = 0;
    }

    addRule(re, opts) {
      this.rules.push([re, opts]);
      if (opts.type==="begin") this.count++;
    }

    exec(s) {
      let m = this.getMatcher(this.regexIndex);
      m.lastIndex = this.lastIndex;
      let result = m.exec(s);
      if (result) {
        this.regexIndex += result.position + 1;
        if (this.regexIndex === this.count) // wrap-around
          this.regexIndex = 0;
      }

      // this.regexIndex = 0;
      return result;
    }
  }

  function buildModeRegex(mode) {

    let mm = new ResumableMultiRegex();

    mode.contains.forEach(term => mm.addRule(term.begin, {rule: term, type: "begin" }));

    if (mode.terminator_end)
      mm.addRule(mode.terminator_end, {type: "end"} );
    if (mode.illegal)
      mm.addRule(mode.illegal, {type: "illegal"} );

    return mm;
  }

  // TODO: We need negative look-behind support to do this properly
  function skipIfhasPrecedingOrTrailingDot(match) {
    let before = match.input[match.index-1];
    let after = match.input[match.index + match[0].length];
    if (before === "." || after === ".") {
      return {ignoreMatch: true };
    }
  }

  /** skip vs abort vs ignore
   *
   * @skip   - The mode is still entered and exited normally (and contains rules apply),
   *           but all content is held and added to the parent buffer rather than being
   *           output when the mode ends.  Mostly used with `sublanguage` to build up
   *           a single large buffer than can be parsed by sublanguage.
   *
   *             - The mode begin ands ends normally.
   *             - Content matched is added to the parent mode buffer.
   *             - The parser cursor is moved forward normally.
   *
   * @abort  - A hack placeholder until we have ignore.  Aborts the mode (as if it
   *           never matched) but DOES NOT continue to match subsequent `contains`
   *           modes.  Abort is bad/suboptimal because it can result in modes
   *           farther down not getting applied because an earlier rule eats the
   *           content but then aborts.
   *
   *             - The mode does not begin.
   *             - Content matched by `begin` is added to the mode buffer.
   *             - The parser cursor is moved forward accordingly.
   *
   * @ignore - Ignores the mode (as if it never matched) and continues to match any
   *           subsequent `contains` modes.  Ignore isn't technically possible with
   *           the current parser implementation.
   *
   *             - The mode does not begin.
   *             - Content matched by `begin` is ignored.
   *             - The parser cursor is not moved forward.
   */

  function compileMode(mode, parent) {
    if (mode.compiled)
      return;
    mode.compiled = true;

    // __onBegin is considered private API, internal use only
    mode.__onBegin = null;

    mode.keywords = mode.keywords || mode.beginKeywords;
    if (mode.keywords)
      mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);

    mode.lexemesRe = langRe(mode.lexemes || /\w+/, true);

    if (parent) {
      if (mode.beginKeywords) {
        // for languages with keywords that include non-word characters checking for
        // a word boundary is not sufficient, so instead we check for a word boundary
        // or whitespace - this does no harm in any case since our keyword engine
        // doesn't allow spaces in keywords anyways and we still check for the boundary
        // first
        mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')(?=\\b|\\s)';
        mode.__onBegin = skipIfhasPrecedingOrTrailingDot;
      }
      if (!mode.begin)
        mode.begin = /\B|\b/;
      mode.beginRe = langRe(mode.begin);
      if (mode.endSameAsBegin)
        mode.end = mode.begin;
      if (!mode.end && !mode.endsWithParent)
        mode.end = /\B|\b/;
      if (mode.end)
        mode.endRe = langRe(mode.end);
      mode.terminator_end = source(mode.end) || '';
      if (mode.endsWithParent && parent.terminator_end)
        mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
    }
    if (mode.illegal)
      mode.illegalRe = langRe(mode.illegal);
    if (mode.relevance == null)
      mode.relevance = 1;
    if (!mode.contains) {
      mode.contains = [];
    }
    mode.contains = [].concat(...mode.contains.map(function(c) {
      return expand_or_clone_mode(c === 'self' ? mode : c);
    }));
    mode.contains.forEach(function(c) {compileMode(c, mode);});

    if (mode.starts) {
      compileMode(mode.starts, parent);
    }

    mode.matcher = buildModeRegex(mode);
  }

  // self is not valid at the top-level
  if (language.contains && language.contains.includes('self')) {
    throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.")
  }
  compileMode(language);
}

function dependencyOnParent(mode) {
  if (!mode) return false;

  return mode.endsWithParent || dependencyOnParent(mode.starts);
}

function expand_or_clone_mode(mode) {
  if (mode.variants && !mode.cached_variants) {
    mode.cached_variants = mode.variants.map(function(variant) {
      return inherit(mode, {variants: null}, variant);
    });
  }

  // EXPAND
  // if we have variants then essentially "replace" the mode with the variants
  // this happens in compileMode, where this function is called from
  if (mode.cached_variants)
    return mode.cached_variants;

  // CLONE
  // if we have dependencies on parents then we need a unique
  // instance of ourselves, so we can be reused with many
  // different parents without issue
  if (dependencyOnParent(mode))
    return inherit(mode, { starts: mode.starts ? inherit(mode.starts) : null });

  if (Object.isFrozen(mode))
    return inherit(mode);

  // no special dependency issues, just return ourselves
  return mode;
}


// keywords

function compileKeywords(rawKeywords, case_insensitive) {
  var compiled_keywords = {};

  if (typeof rawKeywords === 'string') { // string
    splitAndCompile('keyword', rawKeywords);
  } else {
    Object.keys(rawKeywords).forEach(function (className) {
      splitAndCompile(className, rawKeywords[className]);
    });
  }
return compiled_keywords;

// ---

function splitAndCompile(className, str) {
  if (case_insensitive) {
    str = str.toLowerCase();
  }
  str.split(' ').forEach(function(keyword) {
    var pair = keyword.split('|');
    compiled_keywords[pair[0]] = [className, scoreForKeyword(pair[0], pair[1])];
  });
}
}

function scoreForKeyword(keyword, providedScore) {
// manual scores always win over common keywords
// so you can force a score of 1 if you really insist
if (providedScore)
  return Number(providedScore);

return commonKeyword(keyword) ? 0 : 1;
}

function commonKeyword(word) {
return COMMON_KEYWORDS.includes(word.toLowerCase());
}

var version = "10.0.1";

/*
Syntax highlighting with language autodetection.
https://highlightjs.org/
*/

const escape$1$1 = escapeHTML;
const inherit$1 = inherit;

const { nodeStream: nodeStream$1, mergeStreams: mergeStreams$1 } = utils;


const HLJS = function(hljs) {

  // Convenience variables for build-in objects
  var ArrayProto = [];

  // Global internal variables used within the highlight.js library.
  var languages = {},
      aliases   = {},
      plugins   = [];

  // safe/production mode - swallows more errors, tries to keep running
  // even if a single syntax or parse hits a fatal error
  var SAFE_MODE = true;

  // Regular expressions used throughout the highlight.js library.
  var fixMarkupRe      = /((^(<[^>]+>|\t|)+|(?:\n)))/gm;

  var LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";

  // Global options used when within external APIs. This is modified when
  // calling the `hljs.configure` function.
  var options = {
    noHighlightRe: /^(no-?highlight)$/i,
    languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
    classPrefix: 'hljs-',
    tabReplace: null,
    useBR: false,
    languages: undefined,
    // beta configuration options, subject to change, welcome to discuss
    // https://github.com/highlightjs/highlight.js/issues/1086
    __emitter: TokenTreeEmitter
  };

  /* Utility functions */

  function shouldNotHighlight(language) {
    return options.noHighlightRe.test(language);
  }

  function blockLanguage(block) {
    var match;
    var classes = block.className + ' ';

    classes += block.parentNode ? block.parentNode.className : '';

    // language-* takes precedence over non-prefixed class names.
    match = options.languageDetectRe.exec(classes);
    if (match) {
      var language = getLanguage(match[1]);
      if (!language) {
        console.warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
        console.warn("Falling back to no-highlight mode for this block.", block);
      }
      return language ? match[1] : 'no-highlight';
    }

    return classes
      .split(/\s+/)
      .find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
  }

  /**
   * Core highlighting function.
   *
   * @param {string} languageName - the language to use for highlighting
   * @param {string} code - the code to highlight
   * @param {boolean} ignore_illegals - whether to ignore illegal matches, default is to bail
   * @param {array<mode>} continuation - array of continuation modes
   *
   * @returns an object that represents the result
   * @property {string} language - the language name
   * @property {number} relevance - the relevance score
   * @property {string} value - the highlighted HTML code
   * @property {string} code - the original raw code
   * @property {mode} top - top of the current mode stack
   * @property {boolean} illegal - indicates whether any illegal matches were found
  */
  function highlight(languageName, code, ignore_illegals, continuation) {
    var context = {
      code,
      language: languageName
    };
    // the plugin can change the desired language or the code to be highlighted
    // just be changing the object it was passed
    fire("before:highlight", context);

    // a before plugin can usurp the result completely by providing it's own
    // in which case we don't even need to call highlight
    var result = context.result ?
      context.result :
      _highlight(context.language, context.code, ignore_illegals, continuation);

    result.code = context.code;
    // the plugin can change anything in result to suite it
    fire("after:highlight", result);

    return result;
  }

  // private highlight that's used internally and does not fire callbacks
  function _highlight(languageName, code, ignore_illegals, continuation) {
    var codeToHighlight = code;

    function endOfMode(mode, lexeme) {
      if (startsWith(mode.endRe, lexeme)) {
        while (mode.endsParent && mode.parent) {
          mode = mode.parent;
        }
        return mode;
      }
      if (mode.endsWithParent) {
        return endOfMode(mode.parent, lexeme);
      }
    }

    function keywordMatch(mode, match) {
      var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0];
      return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
    }

    function processKeywords() {
      var keyword_match, last_index, match, buf;

      if (!top.keywords) {
        emitter.addText(mode_buffer);
        return;
      }

      last_index = 0;
      top.lexemesRe.lastIndex = 0;
      match = top.lexemesRe.exec(mode_buffer);
      buf = "";

      while (match) {
        buf += mode_buffer.substring(last_index, match.index);
        keyword_match = keywordMatch(top, match);
        var kind = null;
        if (keyword_match) {
          emitter.addText(buf);
          buf = "";

          relevance += keyword_match[1];
          kind = keyword_match[0];
          emitter.addKeyword(match[0], kind);
        } else {
          buf += match[0];
        }
        last_index = top.lexemesRe.lastIndex;
        match = top.lexemesRe.exec(mode_buffer);
      }
      buf += mode_buffer.substr(last_index);
      emitter.addText(buf);
    }

    function processSubLanguage() {
      if (mode_buffer === "") return;

      var explicit = typeof top.subLanguage === 'string';

      if (explicit && !languages[top.subLanguage]) {
        emitter.addText(mode_buffer);
        return;
      }

      var result = explicit ?
                   _highlight(top.subLanguage, mode_buffer, true, continuations[top.subLanguage]) :
                   highlightAuto(mode_buffer, top.subLanguage.length ? top.subLanguage : undefined);

      // Counting embedded language score towards the host language may be disabled
      // with zeroing the containing mode relevance. Use case in point is Markdown that
      // allows XML everywhere and makes every XML snippet to have a much larger Markdown
      // score.
      if (top.relevance > 0) {
        relevance += result.relevance;
      }
      if (explicit) {
        continuations[top.subLanguage] = result.top;
      }
      emitter.addSublanguage(result.emitter, result.language);
    }

    function processBuffer() {
      if (top.subLanguage != null)
        processSubLanguage();
      else
        processKeywords();
      mode_buffer = '';
    }

    function startNewMode(mode) {
      if (mode.className) {
        emitter.openNode(mode.className);
      }
      top = Object.create(mode, {parent: {value: top}});
    }

    function doIgnore(lexeme) {
      if (top.matcher.regexIndex === 0) {
        // no more regexs to potentially match here, so we move the cursor forward one
        // space
        mode_buffer += lexeme[0];
        return 1;
      } else {
        // no need to move the cursor, we still have additional regexes to try and
        // match at this very spot
        continueScanAtSamePosition = true;
        return 0;
      }
    }

    function doBeginMatch(match) {
      var lexeme = match[0];
      var new_mode = match.rule;

      if (new_mode.__onBegin) {
        let res = new_mode.__onBegin(match) || {};
        if (res.ignoreMatch)
          return doIgnore(lexeme);
      }

      if (new_mode && new_mode.endSameAsBegin) {
        new_mode.endRe = escape$1( lexeme );
      }

      if (new_mode.skip) {
        mode_buffer += lexeme;
      } else {
        if (new_mode.excludeBegin) {
          mode_buffer += lexeme;
        }
        processBuffer();
        if (!new_mode.returnBegin && !new_mode.excludeBegin) {
          mode_buffer = lexeme;
        }
      }
      startNewMode(new_mode);
      return new_mode.returnBegin ? 0 : lexeme.length;
    }

    function doEndMatch(match) {
      var lexeme = match[0];
      var matchPlusRemainder = codeToHighlight.substr(match.index);
      var end_mode = endOfMode(top, matchPlusRemainder);
      if (!end_mode) { return; }

      var origin = top;
      if (origin.skip) {
        mode_buffer += lexeme;
      } else {
        if (!(origin.returnEnd || origin.excludeEnd)) {
          mode_buffer += lexeme;
        }
        processBuffer();
        if (origin.excludeEnd) {
          mode_buffer = lexeme;
        }
      }
      do {
        if (top.className) {
          emitter.closeNode();
        }
        if (!top.skip && !top.subLanguage) {
          relevance += top.relevance;
        }
        top = top.parent;
      } while (top !== end_mode.parent);
      if (end_mode.starts) {
        if (end_mode.endSameAsBegin) {
          end_mode.starts.endRe = end_mode.endRe;
        }
        startNewMode(end_mode.starts);
      }
      return origin.returnEnd ? 0 : lexeme.length;
    }

    function processContinuations() {
      var list = [];
      for(var current = top; current !== language; current = current.parent) {
        if (current.className) {
          list.unshift(current.className);
        }
      }
      list.forEach(item => emitter.openNode(item));
    }

    var lastMatch = {};
    function processLexeme(text_before_match, match) {

      var err;
      var lexeme = match && match[0];

      // add non-matched text to the current mode buffer
      mode_buffer += text_before_match;

      if (lexeme == null) {
        processBuffer();
        return 0;
      }



      // we've found a 0 width match and we're stuck, so we need to advance
      // this happens when we have badly behaved rules that have optional matchers to the degree that
      // sometimes they can end up matching nothing at all
      // Ref: https://github.com/highlightjs/highlight.js/issues/2140
      if (lastMatch.type=="begin" && match.type=="end" && lastMatch.index == match.index && lexeme === "") {
        // spit the "skipped" character that our regex choked on back into the output sequence
        mode_buffer += codeToHighlight.slice(match.index, match.index + 1);
        if (!SAFE_MODE) {
          err = new Error('0 width match regex');
          err.languageName = languageName;
          err.badRule = lastMatch.rule;
          throw(err);
        }
        return 1;
      }
      lastMatch = match;

      if (match.type==="begin") {
        return doBeginMatch(match);
      } else if (match.type==="illegal" && !ignore_illegals) {
        // illegal match, we do not continue processing
        err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.className || '<unnamed>') + '"');
        err.mode = top;
        throw err;
      } else if (match.type==="end") {
        var processed = doEndMatch(match);
        if (processed != undefined)
          return processed;
      }

      /*
      Why might be find ourselves here?  Only one occasion now.  An end match that was
      triggered but could not be completed.  When might this happen?  When an `endSameasBegin`
      rule sets the end rule to a specific match.  Since the overall mode termination rule that's
      being used to scan the text isn't recompiled that means that any match that LOOKS like
      the end (but is not, because it is not an exact match to the beginning) will
      end up here.  A definite end match, but when `doEndMatch` tries to "reapply"
      the end rule and fails to match, we wind up here, and just silently ignore the end.

      This causes no real harm other than stopping a few times too many.
      */

      mode_buffer += lexeme;
      return lexeme.length;
    }

    var language = getLanguage(languageName);
    if (!language) {
      console.error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
      throw new Error('Unknown language: "' + languageName + '"');
    }

    compileLanguage(language);
    var top = continuation || language;
    var continuations = {}; // keep continuations for sub-languages
    var result;
    var emitter = new options.__emitter(options);
    processContinuations();
    var mode_buffer = '';
    var relevance = 0;
    var match, processedCount, index = 0;

    try {
      var continueScanAtSamePosition = false;
      top.matcher.considerAll();

      while (true) {
        if (continueScanAtSamePosition) {
          continueScanAtSamePosition = false;
          // only regexes not matched previously will now be
          // considered for a potential match
        } else {
          top.matcher.lastIndex = index;
          top.matcher.considerAll();
        }
        match = top.matcher.exec(codeToHighlight);
        // console.log("match", match[0], match.rule && match.rule.begin)
        if (!match)
          break;
        let beforeMatch = codeToHighlight.substring(index, match.index);
        processedCount = processLexeme(beforeMatch, match);
        index = match.index + processedCount;
      }
      processLexeme(codeToHighlight.substr(index));
      emitter.closeAllNodes();
      emitter.finalize();
      result = emitter.toHTML();

      return {
        relevance: relevance,
        value: result,
        language: languageName,
        illegal: false,
        emitter: emitter,
        top: top
      };
    } catch (err) {
      if (err.message && err.message.includes('Illegal')) {
        return {
          illegal: true,
          illegalBy: {
            msg: err.message,
            context: codeToHighlight.slice(index-100,index+100),
            mode: err.mode
          },
          sofar: result,
          relevance: 0,
          value: escape$1$1(codeToHighlight),
          emitter: emitter,
        };
      } else if (SAFE_MODE) {
        return {
          relevance: 0,
          value: escape$1$1(codeToHighlight),
          emitter: emitter,
          language: languageName,
          top: top,
          errorRaised: err
        };
      } else {
        throw err;
      }
    }
  }

  // returns a valid highlight result, without actually
  // doing any actual work, auto highlight starts with
  // this and it's possible for small snippets that
  // auto-detection may not find a better match
  function justTextHighlightResult(code) {
    const result = {
      relevance: 0,
      emitter: new options.__emitter(options),
      value: escape$1$1(code),
      illegal: false,
      top: PLAINTEXT_LANGUAGE
    };
    result.emitter.addText(code);
    return result;
  }

  /*
  Highlighting with language detection. Accepts a string with the code to
  highlight. Returns an object with the following properties:

  - language (detected language)
  - relevance (int)
  - value (an HTML string with highlighting markup)
  - second_best (object with the same structure for second-best heuristically
    detected language, may be absent)

  */
  function highlightAuto(code, languageSubset) {
    languageSubset = languageSubset || options.languages || Object.keys(languages);
    var result = justTextHighlightResult(code);
    var second_best = result;
    languageSubset.filter(getLanguage).filter(autoDetection).forEach(function(name) {
      var current = _highlight(name, code, false);
      current.language = name;
      if (current.relevance > second_best.relevance) {
        second_best = current;
      }
      if (current.relevance > result.relevance) {
        second_best = result;
        result = current;
      }
    });
    if (second_best.language) {
      result.second_best = second_best;
    }
    return result;
  }

  /*
  Post-processing of the highlighted markup:

  - replace TABs with something more useful
  - replace real line-breaks with '<br>' for non-pre containers

  */
  function fixMarkup(value) {
    if (!(options.tabReplace || options.useBR)) {
      return value;
    }

    return value.replace(fixMarkupRe, function(match, p1) {
        if (options.useBR && match === '\n') {
          return '<br>';
        } else if (options.tabReplace) {
          return p1.replace(/\t/g, options.tabReplace);
        }
        return '';
    });
  }

  function buildClassName(prevClassName, currentLang, resultLang) {
    var language = currentLang ? aliases[currentLang] : resultLang,
        result   = [prevClassName.trim()];

    if (!prevClassName.match(/\bhljs\b/)) {
      result.push('hljs');
    }

    if (!prevClassName.includes(language)) {
      result.push(language);
    }

    return result.join(' ').trim();
  }

  /*
  Applies highlighting to a DOM node containing code. Accepts a DOM node and
  two optional parameters for fixMarkup.
  */
  function highlightBlock(block) {
    var node, originalStream, result, resultNode, text;
    var language = blockLanguage(block);

    if (shouldNotHighlight(language))
        return;

    fire("before:highlightBlock",
      { block: block, language: language});

    if (options.useBR) {
      node = document.createElement('div');
      node.innerHTML = block.innerHTML.replace(/\n/g, '').replace(/<br[ \/]*>/g, '\n');
    } else {
      node = block;
    }
    text = node.textContent;
    result = language ? highlight(language, text, true) : highlightAuto(text);

    originalStream = nodeStream$1(node);
    if (originalStream.length) {
      resultNode = document.createElement('div');
      resultNode.innerHTML = result.value;
      result.value = mergeStreams$1(originalStream, nodeStream$1(resultNode), text);
    }
    result.value = fixMarkup(result.value);

    fire("after:highlightBlock", { block: block, result: result});

    block.innerHTML = result.value;
    block.className = buildClassName(block.className, language, result.language);
    block.result = {
      language: result.language,
      re: result.relevance
    };
    if (result.second_best) {
      block.second_best = {
        language: result.second_best.language,
        re: result.second_best.relevance
      };
    }
  }

  /*
  Updates highlight.js global options with values passed in the form of an object.
  */
  function configure(user_options) {
    options = inherit$1(options, user_options);
  }

  /*
  Applies highlighting to all <pre><code>..</code></pre> blocks on a page.
  */
  function initHighlighting() {
    if (initHighlighting.called)
      return;
    initHighlighting.called = true;

    var blocks = document.querySelectorAll('pre code');
    ArrayProto.forEach.call(blocks, highlightBlock);
  }

  /*
  Attaches highlighting to the page load event.
  */
  function initHighlightingOnLoad() {
    window.addEventListener('DOMContentLoaded', initHighlighting, false);
  }

  const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: 'Plain text' };

  function registerLanguage(name, language) {
    var lang;
    try { lang = language(hljs); }
    catch (error) {
      console.error("Language definition for '{}' could not be registered.".replace("{}", name));
      // hard or soft error
      if (!SAFE_MODE) { throw error; } else { console.error(error); }
      // languages that have serious errors are replaced with essentially a
      // "plaintext" stand-in so that the code blocks will still get normal
      // css classes applied to them - and one bad language won't break the
      // entire highlighter
      lang = PLAINTEXT_LANGUAGE;
    }
    // give it a temporary name if it doesn't have one in the meta-data
    if (!lang.name)
      lang.name = name;
    languages[name] = lang;
    lang.rawDefinition = language.bind(null,hljs);

    if (lang.aliases) {
      lang.aliases.forEach(function(alias) {aliases[alias] = name;});
    }
  }

  function listLanguages() {
    return Object.keys(languages);
  }

  /*
    intended usage: When one language truly requires another

    Unlike `getLanguage`, this will throw when the requested language
    is not available.
  */
  function requireLanguage(name) {
    var lang = getLanguage(name);
    if (lang) { return lang; }

    var err = new Error('The \'{}\' language is required, but not loaded.'.replace('{}',name));
    throw err;
  }

  function getLanguage(name) {
    name = (name || '').toLowerCase();
    return languages[name] || languages[aliases[name]];
  }

  function autoDetection(name) {
    var lang = getLanguage(name);
    return lang && !lang.disableAutodetect;
  }

  function addPlugin(plugin, options) {
    plugins.push(plugin);
  }

  function fire(event, args) {
    var cb = event;
    plugins.forEach(function (plugin) {
      if (plugin[cb]) {
        plugin[cb](args);
      }
    });
  }

  /* Interface definition */

  Object.assign(hljs,{
    highlight,
    highlightAuto,
    fixMarkup,
    highlightBlock,
    configure,
    initHighlighting,
    initHighlightingOnLoad,
    registerLanguage,
    listLanguages,
    getLanguage,
    requireLanguage,
    autoDetection,
    inherit: inherit$1,
    addPlugin
  });

  hljs.debugMode = function() { SAFE_MODE = false; };
  hljs.safeMode = function() { SAFE_MODE = true; };
  hljs.versionString = version;

  for (const key in MODES) {
    if (typeof MODES[key] === "object")
      deepFreeze(MODES[key]);
  }

  // merge all the modes/regexs into our main object
  Object.assign(hljs, MODES);

  return hljs;
};

// export an "instance" of the highlighter
var highlight = HLJS({});

var core = highlight;

/*
Language: JavaScript
Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
Category: common, scripting
Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
*/

function javascript(hljs) {
  var FRAGMENT = {
    begin: '<>',
    end: '</>'
  };
  var XML_TAG = {
    begin: /<[A-Za-z0-9\\._:-]+/,
    end: /\/[A-Za-z0-9\\._:-]+>|\/>/
  };
  var IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  var KEYWORDS = {
    keyword:
      'in of if for while finally var new function do return void else break catch ' +
      'instanceof with throw case default try this switch continue typeof delete ' +
      'let yield const export super debugger as async await static ' +
      // ECMAScript 6 modules import
      'import from as'
    ,
    literal:
      'true false null undefined NaN Infinity',
    built_in:
      'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent ' +
      'encodeURI encodeURIComponent escape unescape Object Function Boolean Error ' +
      'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError ' +
      'TypeError URIError Number Math Date String RegExp Array Float32Array ' +
      'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array ' +
      'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require ' +
      'module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect ' +
      'Promise'
  };
  var NUMBER = {
    className: 'number',
    variants: [
      { begin: '\\b(0[bB][01]+)n?' },
      { begin: '\\b(0[oO][0-7]+)n?' },
      { begin: hljs.C_NUMBER_RE + 'n?' }
    ],
    relevance: 0
  };
  var SUBST = {
    className: 'subst',
    begin: '\\$\\{', end: '\\}',
    keywords: KEYWORDS,
    contains: []  // defined later
  };
  var HTML_TEMPLATE = {
    begin: 'html`', end: '',
    starts: {
      end: '`', returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: 'xml',
    }
  };
  var CSS_TEMPLATE = {
    begin: 'css`', end: '',
    starts: {
      end: '`', returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: 'css',
    }
  };
  var TEMPLATE_STRING = {
    className: 'string',
    begin: '`', end: '`',
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  SUBST.contains = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    TEMPLATE_STRING,
    NUMBER,
    hljs.REGEXP_MODE
  ];
  var PARAMS_CONTAINS = SUBST.contains.concat([
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.C_LINE_COMMENT_MODE
  ]);
  var PARAMS = {
    className: 'params',
    begin: /\(/, end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    contains: PARAMS_CONTAINS
  };

  return {
    name: 'JavaScript',
    aliases: ['js', 'jsx', 'mjs', 'cjs'],
    keywords: KEYWORDS,
    contains: [
      {
        className: 'meta',
        relevance: 10,
        begin: /^\s*['"]use (strict|asm)['"]/
      },
      {
        className: 'meta',
        begin: /^#!/, end: /$/
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      TEMPLATE_STRING,
      hljs.C_LINE_COMMENT_MODE,
      hljs.COMMENT(
        '/\\*\\*',
        '\\*/',
        {
          relevance : 0,
          contains : [
            {
              className : 'doctag',
              begin : '@[A-Za-z]+',
              contains : [
                {
                  className: 'type',
                  begin: '\\{',
                  end: '\\}',
                  relevance: 0
                },
                {
                  className: 'variable',
                  begin: IDENT_RE + '(?=\\s*(-)|$)',
                  endsParent: true,
                  relevance: 0
                },
                // eat spaces (not newlines) so we can find
                // types or variables
                {
                  begin: /(?=[^\n])\s/,
                  relevance: 0
                },
              ]
            }
          ]
        }
      ),
      hljs.C_BLOCK_COMMENT_MODE,
      NUMBER,
      { // object attr container
        begin: /[{,\n]\s*/, relevance: 0,
        contains: [
          {
            begin: IDENT_RE + '\\s*:', returnBegin: true,
            relevance: 0,
            contains: [{className: 'attr', begin: IDENT_RE, relevance: 0}]
          }
        ]
      },
      { // "value" container
        begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
        keywords: 'return throw case',
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.REGEXP_MODE,
          {
            className: 'function',
            begin: '(\\(.*?\\)|' + IDENT_RE + ')\\s*=>', returnBegin: true,
            end: '\\s*=>',
            contains: [
              {
                className: 'params',
                variants: [
                  {
                    begin: IDENT_RE
                  },
                  {
                    begin: /\(\s*\)/,
                  },
                  {
                    begin: /\(/, end: /\)/,
                    excludeBegin: true, excludeEnd: true,
                    keywords: KEYWORDS,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          },
          { // could be a comma delimited list of params to a function call
            begin: /,/, relevance: 0,
          },
          {
            className: '',
            begin: /\s/,
            end: /\s*/,
            skip: true,
          },
          { // JSX
            variants: [
              { begin: FRAGMENT.begin, end: FRAGMENT.end },
              { begin: XML_TAG.begin, end: XML_TAG.end }
            ],
            subLanguage: 'xml',
            contains: [
              {
                begin: XML_TAG.begin, end: XML_TAG.end, skip: true,
                contains: ['self']
              }
            ]
          },
        ],
        relevance: 0
      },
      {
        className: 'function',
        beginKeywords: 'function', end: /\{/, excludeEnd: true,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: IDENT_RE}),
          PARAMS
        ],
        illegal: /\[|%/
      },
      {
        begin: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      },

      hljs.METHOD_GUARD,
      { // ES6 class
        className: 'class',
        beginKeywords: 'class', end: /[{;=]/, excludeEnd: true,
        illegal: /[:"\[\]]/,
        contains: [
          {beginKeywords: 'extends'},
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        beginKeywords: 'constructor', end: /\{/, excludeEnd: true
      },
      {
        begin:'(get|set)\\s*(?=' + IDENT_RE+ '\\()',
        end: /{/,
        keywords: "get set",
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: IDENT_RE}),
          { begin: /\(\)/ }, // eat to avoid empty params
          PARAMS
        ]

      }
    ],
    illegal: /#(?!!)/
  };
}

var javascript_1 = javascript;

/*
Language: Bash
Author: vah <vahtenberg@gmail.com>
Contributrors: Benjamin Pannell <contact@sierrasoftworks.com>
Website: https://www.gnu.org/software/bash/
Category: common
*/

function bash(hljs) {
  const VAR = {};
  const BRACED_VAR = {
    begin: /\$\{/, end:/\}/,
    contains: [
      { begin: /:-/, contains: [VAR] } // default values
    ]
  };
  Object.assign(VAR,{
    className: 'variable',
    variants: [
      {begin: /\$[\w\d#@][\w\d_]*/},
      BRACED_VAR
    ]
  });

  const SUBST = {
    className: 'subst',
    begin: /\$\(/, end: /\)/,
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  const QUOTE_STRING = {
    className: 'string',
    begin: /"/, end: /"/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      VAR,
      SUBST
    ]
  };
  SUBST.contains.push(QUOTE_STRING);
  const ESCAPED_QUOTE = {
    className: '',
    begin: /\\"/

  };
  const APOS_STRING = {
    className: 'string',
    begin: /'/, end: /'/
  };
  const ARITHMETIC = {
    begin: /\$\(\(/,
    end: /\)\)/,
    contains: [
      { begin: /\d+#[0-9a-f]+/, className: "number" },
      hljs.NUMBER_MODE,
      VAR
    ]
  };
  const SHEBANG = {
    className: 'meta',
    begin: /^#![^\n]+sh\s*$/,
    relevance: 10
  };
  const FUNCTION = {
    className: 'function',
    begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
    returnBegin: true,
    contains: [hljs.inherit(hljs.TITLE_MODE, {begin: /\w[\w\d_]*/})],
    relevance: 0
  };

  return {
    name: 'Bash',
    aliases: ['sh', 'zsh'],
    lexemes: /\b-?[a-z\._]+\b/,
    keywords: {
      keyword:
        'if then else elif fi for while in do done case esac function',
      literal:
        'true false',
      built_in:
        // Shell built-ins
        // http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
        'break cd continue eval exec exit export getopts hash pwd readonly return shift test times ' +
        'trap umask unset ' +
        // Bash built-ins
        'alias bind builtin caller command declare echo enable help let local logout mapfile printf ' +
        'read readarray source type typeset ulimit unalias ' +
        // Shell modifiers
        'set shopt ' +
        // Zsh built-ins
        'autoload bg bindkey bye cap chdir clone comparguments compcall compctl compdescribe compfiles ' +
        'compgroups compquote comptags comptry compvalues dirs disable disown echotc echoti emulate ' +
        'fc fg float functions getcap getln history integer jobs kill limit log noglob popd print ' +
        'pushd pushln rehash sched setcap setopt stat suspend ttyctl unfunction unhash unlimit ' +
        'unsetopt vared wait whence where which zcompile zformat zftp zle zmodload zparseopts zprof ' +
        'zpty zregexparse zsocket zstyle ztcp',
      _:
        '-ne -eq -lt -gt -f -d -e -s -l -a' // relevance booster
    },
    contains: [
      SHEBANG,
      FUNCTION,
      ARITHMETIC,
      hljs.HASH_COMMENT_MODE,
      QUOTE_STRING,
      ESCAPED_QUOTE,
      APOS_STRING,
      VAR
    ]
  };
}

var bash_1 = bash;

/*
 Language: SQL
 Contributors: Nikolay Lisienko <info@neor.ru>, Heiko August <post@auge8472.de>, Travis Odom <travis.a.odom@gmail.com>, Vadimtro <vadimtro@yahoo.com>, Benjamin Auder <benjamin.auder@gmail.com>
 Website: https://en.wikipedia.org/wiki/SQL
 Category: common
 */

function sql(hljs) {
  var COMMENT_MODE = hljs.COMMENT('--', '$');
  return {
    name: 'SQL',
    case_insensitive: true,
    illegal: /[<>{}*]/,
    contains: [
      {
        beginKeywords:
          'begin end start commit rollback savepoint lock alter create drop rename call ' +
          'delete do handler insert load replace select truncate update set show pragma grant ' +
          'merge describe use explain help declare prepare execute deallocate release ' +
          'unlock purge reset change stop analyze cache flush optimize repair kill ' +
          'install uninstall checksum restore check backup revoke comment values with',
        end: /;/, endsWithParent: true,
        lexemes: /[\w\.]+/,
        keywords: {
          keyword:
            'as abort abs absolute acc acce accep accept access accessed accessible account acos action activate add ' +
            'addtime admin administer advanced advise aes_decrypt aes_encrypt after agent aggregate ali alia alias ' +
            'all allocate allow alter always analyze ancillary and anti any anydata anydataset anyschema anytype apply ' +
            'archive archived archivelog are as asc ascii asin assembly assertion associate asynchronous at atan ' +
            'atn2 attr attri attrib attribu attribut attribute attributes audit authenticated authentication authid ' +
            'authors auto autoallocate autodblink autoextend automatic availability avg backup badfile basicfile ' +
            'before begin beginning benchmark between bfile bfile_base big bigfile bin binary_double binary_float ' +
            'binlog bit_and bit_count bit_length bit_or bit_xor bitmap blob_base block blocksize body both bound ' +
            'bucket buffer_cache buffer_pool build bulk by byte byteordermark bytes cache caching call calling cancel ' +
            'capacity cascade cascaded case cast catalog category ceil ceiling chain change changed char_base ' +
            'char_length character_length characters characterset charindex charset charsetform charsetid check ' +
            'checksum checksum_agg child choose chr chunk class cleanup clear client clob clob_base clone close ' +
            'cluster_id cluster_probability cluster_set clustering coalesce coercibility col collate collation ' +
            'collect colu colum column column_value columns columns_updated comment commit compact compatibility ' +
            'compiled complete composite_limit compound compress compute concat concat_ws concurrent confirm conn ' +
            'connec connect connect_by_iscycle connect_by_isleaf connect_by_root connect_time connection ' +
            'consider consistent constant constraint constraints constructor container content contents context ' +
            'contributors controlfile conv convert convert_tz corr corr_k corr_s corresponding corruption cos cost ' +
            'count count_big counted covar_pop covar_samp cpu_per_call cpu_per_session crc32 create creation ' +
            'critical cross cube cume_dist curdate current current_date current_time current_timestamp current_user ' +
            'cursor curtime customdatum cycle data database databases datafile datafiles datalength date_add ' +
            'date_cache date_format date_sub dateadd datediff datefromparts datename datepart datetime2fromparts ' +
            'day day_to_second dayname dayofmonth dayofweek dayofyear days db_role_change dbtimezone ddl deallocate ' +
            'declare decode decompose decrement decrypt deduplicate def defa defau defaul default defaults ' +
            'deferred defi defin define degrees delayed delegate delete delete_all delimited demand dense_rank ' +
            'depth dequeue des_decrypt des_encrypt des_key_file desc descr descri describ describe descriptor ' +
            'deterministic diagnostics difference dimension direct_load directory disable disable_all ' +
            'disallow disassociate discardfile disconnect diskgroup distinct distinctrow distribute distributed div ' +
            'do document domain dotnet double downgrade drop dumpfile duplicate duration each edition editionable ' +
            'editions element ellipsis else elsif elt empty enable enable_all enclosed encode encoding encrypt ' +
            'end end-exec endian enforced engine engines enqueue enterprise entityescaping eomonth error errors ' +
            'escaped evalname evaluate event eventdata events except exception exceptions exchange exclude excluding ' +
            'execu execut execute exempt exists exit exp expire explain explode export export_set extended extent external ' +
            'external_1 external_2 externally extract failed failed_login_attempts failover failure far fast ' +
            'feature_set feature_value fetch field fields file file_name_convert filesystem_like_logging final ' +
            'finish first first_value fixed flash_cache flashback floor flush following follows for forall force foreign ' +
            'form forma format found found_rows freelist freelists freepools fresh from from_base64 from_days ' +
            'ftp full function general generated get get_format get_lock getdate getutcdate global global_name ' +
            'globally go goto grant grants greatest group group_concat group_id grouping grouping_id groups ' +
            'gtid_subtract guarantee guard handler hash hashkeys having hea head headi headin heading heap help hex ' +
            'hierarchy high high_priority hosts hour hours http id ident_current ident_incr ident_seed identified ' +
            'identity idle_time if ifnull ignore iif ilike ilm immediate import in include including increment ' +
            'index indexes indexing indextype indicator indices inet6_aton inet6_ntoa inet_aton inet_ntoa infile ' +
            'initial initialized initially initrans inmemory inner innodb input insert install instance instantiable ' +
            'instr interface interleaved intersect into invalidate invisible is is_free_lock is_ipv4 is_ipv4_compat ' +
            'is_not is_not_null is_used_lock isdate isnull isolation iterate java join json json_exists ' +
            'keep keep_duplicates key keys kill language large last last_day last_insert_id last_value lateral lax lcase ' +
            'lead leading least leaves left len lenght length less level levels library like like2 like4 likec limit ' +
            'lines link list listagg little ln load load_file lob lobs local localtime localtimestamp locate ' +
            'locator lock locked log log10 log2 logfile logfiles logging logical logical_reads_per_call ' +
            'logoff logon logs long loop low low_priority lower lpad lrtrim ltrim main make_set makedate maketime ' +
            'managed management manual map mapping mask master master_pos_wait match matched materialized max ' +
            'maxextents maximize maxinstances maxlen maxlogfiles maxloghistory maxlogmembers maxsize maxtrans ' +
            'md5 measures median medium member memcompress memory merge microsecond mid migration min minextents ' +
            'minimum mining minus minute minutes minvalue missing mod mode model modification modify module monitoring month ' +
            'months mount move movement multiset mutex name name_const names nan national native natural nav nchar ' +
            'nclob nested never new newline next nextval no no_write_to_binlog noarchivelog noaudit nobadfile ' +
            'nocheck nocompress nocopy nocycle nodelay nodiscardfile noentityescaping noguarantee nokeep nologfile ' +
            'nomapping nomaxvalue nominimize nominvalue nomonitoring none noneditionable nonschema noorder ' +
            'nopr nopro noprom nopromp noprompt norely noresetlogs noreverse normal norowdependencies noschemacheck ' +
            'noswitch not nothing notice notnull notrim novalidate now nowait nth_value nullif nulls num numb numbe ' +
            'nvarchar nvarchar2 object ocicoll ocidate ocidatetime ociduration ociinterval ociloblocator ocinumber ' +
            'ociref ocirefcursor ocirowid ocistring ocitype oct octet_length of off offline offset oid oidindex old ' +
            'on online only opaque open operations operator optimal optimize option optionally or oracle oracle_date ' +
            'oradata ord ordaudio orddicom orddoc order ordimage ordinality ordvideo organization orlany orlvary ' +
            'out outer outfile outline output over overflow overriding package pad parallel parallel_enable ' +
            'parameters parent parse partial partition partitions pascal passing password password_grace_time ' +
            'password_lock_time password_reuse_max password_reuse_time password_verify_function patch path patindex ' +
            'pctincrease pctthreshold pctused pctversion percent percent_rank percentile_cont percentile_disc ' +
            'performance period period_add period_diff permanent physical pi pipe pipelined pivot pluggable plugin ' +
            'policy position post_transaction pow power pragma prebuilt precedes preceding precision prediction ' +
            'prediction_cost prediction_details prediction_probability prediction_set prepare present preserve ' +
            'prior priority private private_sga privileges procedural procedure procedure_analyze processlist ' +
            'profiles project prompt protection public publishingservername purge quarter query quick quiesce quota ' +
            'quotename radians raise rand range rank raw read reads readsize rebuild record records ' +
            'recover recovery recursive recycle redo reduced ref reference referenced references referencing refresh ' +
            'regexp_like register regr_avgx regr_avgy regr_count regr_intercept regr_r2 regr_slope regr_sxx regr_sxy ' +
            'reject rekey relational relative relaylog release release_lock relies_on relocate rely rem remainder rename ' +
            'repair repeat replace replicate replication required reset resetlogs resize resource respect restore ' +
            'restricted result result_cache resumable resume retention return returning returns reuse reverse revoke ' +
            'right rlike role roles rollback rolling rollup round row row_count rowdependencies rowid rownum rows ' +
            'rtrim rules safe salt sample save savepoint sb1 sb2 sb4 scan schema schemacheck scn scope scroll ' +
            'sdo_georaster sdo_topo_geometry search sec_to_time second seconds section securefile security seed segment select ' +
            'self semi sequence sequential serializable server servererror session session_user sessions_per_user set ' +
            'sets settings sha sha1 sha2 share shared shared_pool short show shrink shutdown si_averagecolor ' +
            'si_colorhistogram si_featurelist si_positionalcolor si_stillimage si_texture siblings sid sign sin ' +
            'size size_t sizes skip slave sleep smalldatetimefromparts smallfile snapshot some soname sort soundex ' +
            'source space sparse spfile split sql sql_big_result sql_buffer_result sql_cache sql_calc_found_rows ' +
            'sql_small_result sql_variant_property sqlcode sqldata sqlerror sqlname sqlstate sqrt square standalone ' +
            'standby start starting startup statement static statistics stats_binomial_test stats_crosstab ' +
            'stats_ks_test stats_mode stats_mw_test stats_one_way_anova stats_t_test_ stats_t_test_indep ' +
            'stats_t_test_one stats_t_test_paired stats_wsr_test status std stddev stddev_pop stddev_samp stdev ' +
            'stop storage store stored str str_to_date straight_join strcmp strict string struct stuff style subdate ' +
            'subpartition subpartitions substitutable substr substring subtime subtring_index subtype success sum ' +
            'suspend switch switchoffset switchover sync synchronous synonym sys sys_xmlagg sysasm sysaux sysdate ' +
            'sysdatetimeoffset sysdba sysoper system system_user sysutcdatetime table tables tablespace tablesample tan tdo ' +
            'template temporary terminated tertiary_weights test than then thread through tier ties time time_format ' +
            'time_zone timediff timefromparts timeout timestamp timestampadd timestampdiff timezone_abbr ' +
            'timezone_minute timezone_region to to_base64 to_date to_days to_seconds todatetimeoffset trace tracking ' +
            'transaction transactional translate translation treat trigger trigger_nestlevel triggers trim truncate ' +
            'try_cast try_convert try_parse type ub1 ub2 ub4 ucase unarchived unbounded uncompress ' +
            'under undo unhex unicode uniform uninstall union unique unix_timestamp unknown unlimited unlock unnest unpivot ' +
            'unrecoverable unsafe unsigned until untrusted unusable unused update updated upgrade upped upper upsert ' +
            'url urowid usable usage use use_stored_outlines user user_data user_resources users using utc_date ' +
            'utc_timestamp uuid uuid_short validate validate_password_strength validation valist value values var ' +
            'var_samp varcharc vari varia variab variabl variable variables variance varp varraw varrawc varray ' +
            'verify version versions view virtual visible void wait wallet warning warnings week weekday weekofyear ' +
            'wellformed when whene whenev wheneve whenever where while whitespace window with within without work wrapped ' +
            'xdb xml xmlagg xmlattributes xmlcast xmlcolattval xmlelement xmlexists xmlforest xmlindex xmlnamespaces ' +
            'xmlpi xmlquery xmlroot xmlschema xmlserialize xmltable xmltype xor year year_to_month years yearweek',
          literal:
            'true false null unknown',
          built_in:
            'array bigint binary bit blob bool boolean char character date dec decimal float int int8 integer interval number ' +
            'numeric real record serial serial8 smallint text time timestamp tinyint varchar varchar2 varying void'
        },
        contains: [
          {
            className: 'string',
            begin: '\'', end: '\'',
            contains: [{begin: '\'\''}]
          },
          {
            className: 'string',
            begin: '"', end: '"',
            contains: [{begin: '""'}]
          },
          {
            className: 'string',
            begin: '`', end: '`'
          },
          hljs.C_NUMBER_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          COMMENT_MODE,
          hljs.HASH_COMMENT_MODE
        ]
      },
      hljs.C_BLOCK_COMMENT_MODE,
      COMMENT_MODE,
      hljs.HASH_COMMENT_MODE
    ]
  };
}

var sql_1 = sql;

/*
Language: SCSS
Description: Scss is an extension of the syntax of CSS.
Author: Kurt Emch <kurt@kurtemch.com>
Website: https://sass-lang.com
Category: common, css
*/
function scss(hljs) {
  var AT_IDENTIFIER = '@[a-z-]+'; // @font-face
  var AT_MODIFIERS = "and or not only";
  var IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
  var VARIABLE = {
    className: 'variable',
    begin: '(\\$' + IDENT_RE + ')\\b'
  };
  var HEXCOLOR = {
    className: 'number', begin: '#[0-9A-Fa-f]+'
  };
  var DEF_INTERNALS = {
    className: 'attribute',
    begin: '[A-Z\\_\\.\\-]+', end: ':',
    excludeEnd: true,
    illegal: '[^\\s]',
    starts: {
      endsWithParent: true, excludeEnd: true,
      contains: [
        HEXCOLOR,
        hljs.CSS_NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: 'meta', begin: '!important'
        }
      ]
    }
  };
  return {
    name: 'SCSS',
    case_insensitive: true,
    illegal: '[=/|\']',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'selector-id', begin: '\\#[A-Za-z0-9_-]+',
        relevance: 0
      },
      {
        className: 'selector-class', begin: '\\.[A-Za-z0-9_-]+',
        relevance: 0
      },
      {
        className: 'selector-attr', begin: '\\[', end: '\\]',
        illegal: '$'
      },
      {
        className: 'selector-tag', // begin: IDENT_RE, end: '[,|\\s]'
        begin: '\\b(a|abbr|acronym|address|area|article|aside|audio|b|base|big|blockquote|body|br|button|canvas|caption|cite|code|col|colgroup|command|datalist|dd|del|details|dfn|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|frame|frameset|(h[1-6])|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|keygen|label|legend|li|link|map|mark|meta|meter|nav|noframes|noscript|object|ol|optgroup|option|output|p|param|pre|progress|q|rp|rt|ruby|samp|script|section|select|small|span|strike|strong|style|sub|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|tt|ul|var|video)\\b',
        relevance: 0
      },
      {
        className: 'selector-pseudo',
        begin: ':(visited|valid|root|right|required|read-write|read-only|out-range|optional|only-of-type|only-child|nth-of-type|nth-last-of-type|nth-last-child|nth-child|not|link|left|last-of-type|last-child|lang|invalid|indeterminate|in-range|hover|focus|first-of-type|first-line|first-letter|first-child|first|enabled|empty|disabled|default|checked|before|after|active)'
      },
      {
        className: 'selector-pseudo',
        begin: '::(after|before|choices|first-letter|first-line|repeat-index|repeat-item|selection|value)'
      },
      VARIABLE,
      {
        className: 'attribute',
        begin: '\\b(src|z-index|word-wrap|word-spacing|word-break|width|widows|white-space|visibility|vertical-align|unicode-bidi|transition-timing-function|transition-property|transition-duration|transition-delay|transition|transform-style|transform-origin|transform|top|text-underline-position|text-transform|text-shadow|text-rendering|text-overflow|text-indent|text-decoration-style|text-decoration-line|text-decoration-color|text-decoration|text-align-last|text-align|tab-size|table-layout|right|resize|quotes|position|pointer-events|perspective-origin|perspective|page-break-inside|page-break-before|page-break-after|padding-top|padding-right|padding-left|padding-bottom|padding|overflow-y|overflow-x|overflow-wrap|overflow|outline-width|outline-style|outline-offset|outline-color|outline|orphans|order|opacity|object-position|object-fit|normal|none|nav-up|nav-right|nav-left|nav-index|nav-down|min-width|min-height|max-width|max-height|mask|marks|margin-top|margin-right|margin-left|margin-bottom|margin|list-style-type|list-style-position|list-style-image|list-style|line-height|letter-spacing|left|justify-content|initial|inherit|ime-mode|image-orientation|image-resolution|image-rendering|icon|hyphens|height|font-weight|font-variant-ligatures|font-variant|font-style|font-stretch|font-size-adjust|font-size|font-language-override|font-kerning|font-feature-settings|font-family|font|float|flex-wrap|flex-shrink|flex-grow|flex-flow|flex-direction|flex-basis|flex|filter|empty-cells|display|direction|cursor|counter-reset|counter-increment|content|column-width|column-span|column-rule-width|column-rule-style|column-rule-color|column-rule|column-gap|column-fill|column-count|columns|color|clip-path|clip|clear|caption-side|break-inside|break-before|break-after|box-sizing|box-shadow|box-decoration-break|bottom|border-width|border-top-width|border-top-style|border-top-right-radius|border-top-left-radius|border-top-color|border-top|border-style|border-spacing|border-right-width|border-right-style|border-right-color|border-right|border-radius|border-left-width|border-left-style|border-left-color|border-left|border-image-width|border-image-source|border-image-slice|border-image-repeat|border-image-outset|border-image|border-color|border-collapse|border-bottom-width|border-bottom-style|border-bottom-right-radius|border-bottom-left-radius|border-bottom-color|border-bottom|border|background-size|background-repeat|background-position|background-origin|background-image|background-color|background-clip|background-attachment|background-blend-mode|background|backface-visibility|auto|animation-timing-function|animation-play-state|animation-name|animation-iteration-count|animation-fill-mode|animation-duration|animation-direction|animation-delay|animation|align-self|align-items|align-content)\\b',
        illegal: '[^\\s]'
      },
      {
        begin: '\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b'
      },
      {
        begin: ':', end: ';',
        contains: [
          VARIABLE,
          HEXCOLOR,
          hljs.CSS_NUMBER_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          {
            className: 'meta', begin: '!important'
          }
        ]
      },
      // matching these here allows us to treat them more like regular CSS
      // rules so everything between the {} gets regular rule highlighting,
      // which is what we want for page and font-face
      {
        begin: '@(page|font-face)',
        lexemes: AT_IDENTIFIER,
        keywords: '@page @font-face'
      },
      {
        begin: '@', end: '[{;]',
        returnBegin: true,
        keywords: AT_MODIFIERS,
        contains: [
          {
            begin: AT_IDENTIFIER,
            className: "keyword"
          },
          VARIABLE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          HEXCOLOR,
          hljs.CSS_NUMBER_MODE,
          // {
          //   begin: '\\s[A-Za-z0-9_.-]+',
          //   relevance: 0
          // }
        ]
      }
    ]
  };
}

var scss_1 = scss;

/*
Language: JSON
Description: JSON (JavaScript Object Notation) is a lightweight data-interchange format.
Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
Website: http://www.json.org
Category: common, protocols
*/

function json(hljs) {
  var LITERALS = {literal: 'true false null'};
  var ALLOWED_COMMENTS = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE
  ];
  var TYPES = [
    hljs.QUOTE_STRING_MODE,
    hljs.C_NUMBER_MODE
  ];
  var VALUE_CONTAINER = {
    end: ',', endsWithParent: true, excludeEnd: true,
    contains: TYPES,
    keywords: LITERALS
  };
  var OBJECT = {
    begin: '{', end: '}',
    contains: [
      {
        className: 'attr',
        begin: /"/, end: /"/,
        contains: [hljs.BACKSLASH_ESCAPE],
        illegal: '\\n',
      },
      hljs.inherit(VALUE_CONTAINER, {begin: /:/})
    ].concat(ALLOWED_COMMENTS),
    illegal: '\\S'
  };
  var ARRAY = {
    begin: '\\[', end: '\\]',
    contains: [hljs.inherit(VALUE_CONTAINER)], // inherit is a workaround for a bug that makes shared modes with endsWithParent compile only the ending of one of the parents
    illegal: '\\S'
  };
  TYPES.push(OBJECT, ARRAY);
  ALLOWED_COMMENTS.forEach(function(rule) {
    TYPES.push(rule);
  });
  return {
    name: 'JSON',
    contains: TYPES,
    keywords: LITERALS,
    illegal: '\\S'
  };
}

var json_1 = json;

/*
Language: CSS
Category: common, css
Website: https://developer.mozilla.org/en-US/docs/Web/CSS
*/

function css$2(hljs) {
  var FUNCTION_LIKE = {
    begin: /[\w-]+\(/, returnBegin: true,
    contains: [
      {
        className: 'built_in',
        begin: /[\w-]+/
      },
      {
        begin: /\(/, end: /\)/,
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.CSS_NUMBER_MODE,
        ]
      }
    ]
  };
  var ATTRIBUTE = {
    className: 'attribute',
    begin: /\S/, end: ':', excludeEnd: true,
    starts: {
      endsWithParent: true, excludeEnd: true,
      contains: [
        FUNCTION_LIKE,
        hljs.CSS_NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: 'number', begin: '#[0-9A-Fa-f]+'
        },
        {
          className: 'meta', begin: '!important'
        }
      ]
    }
  };
  var AT_IDENTIFIER = '@[a-z-]+'; // @font-face
  var AT_MODIFIERS = "and or not only";
  var AT_PROPERTY_RE = /@\-?\w[\w]*(\-\w+)*/; // @-webkit-keyframes
  var IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
  var RULE = {
    begin: /(?:[A-Z\_\.\-]+|--[a-zA-Z0-9_-]+)\s*:/, returnBegin: true, end: ';', endsWithParent: true,
    contains: [
      ATTRIBUTE
    ]
  };

  return {
    name: 'CSS',
    case_insensitive: true,
    illegal: /[=\/|'\$]/,
    contains: [
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'selector-id', begin: /#[A-Za-z0-9_-]+/
      },
      {
        className: 'selector-class', begin: /\.[A-Za-z0-9_-]+/
      },
      {
        className: 'selector-attr',
        begin: /\[/, end: /\]/,
        illegal: '$',
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
        ]
      },
      {
        className: 'selector-pseudo',
        begin: /:(:)?[a-zA-Z0-9\_\-\+\(\)"'.]+/
      },
      // matching these here allows us to treat them more like regular CSS
      // rules so everything between the {} gets regular rule highlighting,
      // which is what we want for page and font-face
      {
        begin: '@(page|font-face)',
        lexemes: AT_IDENTIFIER,
        keywords: '@page @font-face'
      },
      {
        begin: '@', end: '[{;]', // at_rule eating first "{" is a good thing
                                 // because it doesn’t let it to be parsed as
                                 // a rule set but instead drops parser into
                                 // the default mode which is how it should be.
        illegal: /:/, // break on Less variables @var: ...
        returnBegin: true,
        contains: [
          {
            className: 'keyword',
            begin: AT_PROPERTY_RE
          },
          {
            begin: /\s/, endsWithParent: true, excludeEnd: true,
            relevance: 0,
            keywords: AT_MODIFIERS,
            contains: [
              {
                begin: /[a-z-]+:/,
                className:"attribute"
              },
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.CSS_NUMBER_MODE
            ]
          }
        ]
      },
      {
        className: 'selector-tag', begin: IDENT_RE,
        relevance: 0
      },
      {
        begin: '{', end: '}',
        illegal: /\S/,
        contains: [
          hljs.C_BLOCK_COMMENT_MODE,
          RULE,
        ]
      }
    ]
  };
}

var css_1 = css$2;

/* src/routes/blog/[slug].svelte generated by Svelte v3.21.0 */

const css$1$1 = {
	code: "@media only screen and (min-width: 800px){.post--metadata.svelte-w1evog{display:grid;grid-template-columns:0.8fr 2.2fr 0.4fr 1fr;-webkit-box-align:center;align-items:center}}.post__tag.svelte-w1evog{padding:3px 5px;background-color:#dcdcdc;margin:2px 3px;border-radius:3px;display:inline-block}.post--body.svelte-w1evog{margin:0px 10px}pre.svelte-w1evog{margin-bottom:1em;padding:5%;width:auto;overflow:auto;font-size:1.4em;line-height:1.3em}img.svelte-w1evog{max-width:100%}.center.svelte-w1evog{display:block;margin:50px auto;box-shadow:-3px 8px 10px #d8d8d8;width:100%;max-width:-webkit-max-content;max-width:-moz-max-content;max-width:max-content;border-radius:2px}.post--title.svelte-w1evog{font-size:36px;margin:15px 0 5px;font-weight:lighter}.post--sub-title.svelte-w1evog{font-weight:lighter;font-size:22px;margin-top:10px}.post--metadata.svelte-w1evog{margin-top:10px}h3.svelte-w1evog{font-size:2rem;font-weight:600;color:var(--textblack)}",
	map: "{\"version\":3,\"file\":\"[slug].svelte\",\"sources\":[\"[slug].svelte\"],\"sourcesContent\":[\"<script context=\\\"module\\\">\\n  import { authors } from \\\"../../_helpers/store.js\\\";\\n  export async function preload({ params, query }) {\\n    // the `slug` parameter is available because\\n    // this file is called [slug].svelte\\n    let authorMap = new Map();\\n    authors.subscribe(value => {\\n      authorMap = value;\\n    });\\n\\n    const res = await this.fetch(`http://localhost:3200/posts/route/${params.slug}`);\\n    const data = await res.json();\\n\\n    if (res.status === 200) {\\n      let authorMap = new Map();\\n      let authorData = [];\\n\\n      const unsubscribe = authors.subscribe(value => {\\n        authorMap = value;\\n      });\\n\\n      // creating unique author ids from the posts\\n\\n      if (!authorMap.get(data.authorId)) {\\n        // getting author data for all unique authors to avoid multi fetch\\n        const res = await this.fetch(`http://localhost:3200/users/${data.authorId}`);\\n        authorData = await res.json();\\n\\n        authors.update(map => {\\n          return map.set(authorData._id, authorData);\\n        });\\n      } else {\\n        authorData = authorMap.get(data.authorId);\\n      }\\n\\n      return { post: data, authorData };\\n    } else {\\n      this.error(res.status, data.message);\\n    }\\n  }\\n</script>\\n\\n<script>\\n  import Author from \\\"../../components/Author.svelte\\\";\\n  import hljs from \\\"highlight.js/lib/core\\\";\\n  import javascript from \\\"highlight.js/lib/languages/javascript\\\";\\n  import bash from \\\"highlight.js/lib/languages/bash\\\";\\n  import sql from \\\"highlight.js/lib/languages/sql\\\";\\n  import scss from \\\"highlight.js/lib/languages/scss\\\";\\n  import json from \\\"highlight.js/lib/languages/json\\\";\\n  import css from \\\"highlight.js/lib/languages/css\\\";\\n  hljs.registerLanguage(\\\"javascript\\\", javascript);\\n  hljs.registerLanguage(\\\"bash\\\", bash);\\n  hljs.registerLanguage(\\\"sql\\\", sql);\\n  hljs.registerLanguage(\\\"scss\\\", scss);\\n  hljs.registerLanguage(\\\"json\\\", json);\\n  hljs.registerLanguage(\\\"css\\\", css);\\n\\n  export let post;\\n  export let authorData;\\n\\n  const highlight = source => {\\n    const { value: highlighted } = hljs.highlightAuto(source);\\n    return highlighted;\\n  };\\n\\n  let pageViews = 0;\\n  if (typeof fetch !== \\\"function\\\") {\\n    global.fetch = require(\\\"node-fetch\\\");\\n  }\\n  fetch(`http://localhost:3200/posts-meta-data/${post._id}`)\\n    .then(response => response.json())\\n    .then(({ count }) => {\\n      pageViews = count;\\n    });\\n</script>\\n\\n<style>\\n  /*\\n\\t\\tBy default, CSS is locally scoped to the component,\\n\\t\\tand any unused styles are dead-code-eliminated.\\n\\t\\tIn this page, Svelte can't know which elements are\\n\\t\\tgoing to appear inside the {{{post.html}}} block,\\n\\t\\tso we have to use the :global(...) modifier to target\\n\\t\\tall elements inside .content\\n\\t*/\\n  /* .content :global(h2) {\\n    font-size: 1.4em;\\n    font-weight: 500;\\n  } */\\n\\n  /* .content :global(pre) {\\n    background-color: #f9f9f9;\\n    box-shadow: inset 1px 1px 5px rgba(0, 0, 0, 0.05);\\n    padding: 0.5em;\\n    border-radius: 2px;\\n    overflow-x: auto;\\n  } */\\n\\n  /* .content :global(pre) :global(code) {\\n    background-color: transparent;\\n    padding: 0;\\n  }\\n\\n  .content :global(ul) {\\n    line-height: 1.5;\\n  }\\n\\n  .content :global(li) {\\n    margin: 0 0 0.5em 0;\\n  } */\\n\\n  @media only screen and (min-width: 800px) {\\n    .post--metadata {\\n      display: grid;\\n      grid-template-columns: 0.8fr 2.2fr 0.4fr 1fr;\\n      -webkit-box-align: center;\\n      align-items: center;\\n    }\\n  }\\n\\n  .post__tag {\\n    padding: 3px 5px;\\n    background-color: #dcdcdc;\\n    margin: 2px 3px;\\n    border-radius: 3px;\\n    display: inline-block;\\n  }\\n  .post--body {\\n    margin: 0px 10px;\\n  }\\n\\n  pre {\\n    margin-bottom: 1em;\\n    padding: 5%;\\n    width: auto;\\n    /* max-height: 900px; */\\n    overflow: auto;\\n    font-size: 1.4em;\\n    line-height: 1.3em;\\n  }\\n\\n  img {\\n    max-width: 100%;\\n  }\\n  .center {\\n    display: block;\\n    margin: 50px auto;\\n    box-shadow: -3px 8px 10px #d8d8d8;\\n    width: 100%;\\n    max-width: -webkit-max-content;\\n    max-width: -moz-max-content;\\n    max-width: max-content;\\n    border-radius: 2px;\\n  }\\n\\n  .post--title {\\n    font-size: 36px;\\n    margin: 15px 0 5px;\\n    font-weight: lighter;\\n  }\\n  .post--sub-title {\\n    font-weight: lighter;\\n    font-size: 22px;\\n    margin-top: 10px;\\n  }\\n\\n  .post--metadata {\\n    margin-top: 10px;\\n  }\\n\\n  h3 {\\n    font-size: 2rem;\\n    font-weight: 600;\\n    color: var(--textblack);\\n  }\\n</style>\\n\\n<svelte:head>\\n  <title>{post.title}</title>\\n  <meta name=\\\"keywords\\\" content={post.tags.join(', ')} />\\n  <meta name=\\\"description\\\" content={post.subTitle} />\\n\\n  <meta name=\\\"twitter:card\\\" content=\\\"summary_large_image\\\" />\\n  <meta name=\\\"twitter:site\\\" content=\\\"@_hectane\\\" />\\n  <meta name=\\\"twitter:creator\\\" content=\\\"@velusgautam\\\" />\\n  <meta name=\\\"twitter:title\\\" content={post.title} />\\n  <meta name=\\\"twitter:description\\\" content={post.subTitle} />\\n  <meta name=\\\"twitter:image\\\" content={`https://assets.hectane.com/${post.route}/title.jpg`} />\\n\\n  <meta property=\\\"og:url\\\" content={`https://hectane.com/blog/${post.route}`} />\\n  <meta property=\\\"og:type\\\" content=\\\"article\\\" />\\n  <meta property=\\\"og:title\\\" content={post.title} />\\n  <meta property=\\\"og:description\\\" content={post.subTitle} />\\n  <meta property=\\\"og:image\\\" content={`https://assets.hectane.com/${post.route}/title.jpg`} />\\n</svelte:head>\\n\\n<div class=\\\"content\\\">\\n  <h1 class=\\\"post--title\\\">{post.title}</h1>\\n  <h4 class=\\\"post--sub-title\\\">{post.subTitle}</h4>\\n  <picture>\\n    <source\\n      srcset={`https://assets.hectane.com/${post.route}/mobile.webp`}\\n      media=\\\"(max-width: 420px)\\\"\\n      type=\\\"image/webp\\\" />\\n    <source\\n      srcset={`https://assets.hectane.com/${post.route}/mobile.jpg`}\\n      media=\\\"(max-width: 420px)\\\"\\n      type=\\\"image/jpg\\\" />\\n    <source\\n      srcset={`https://assets.hectane.com/${post.route}/listing.webp`}\\n      media=\\\"( max-width:799px)\\\"\\n      type=\\\"image/webp\\\" />\\n    <source\\n      srcset={`https://assets.hectane.com/${post.route}/listing.jpg`}\\n      media=\\\"(max-width:799px)\\\"\\n      type=\\\"image/jpg\\\" />\\n    <source\\n      srcset={`https://assets.hectane.com/${post.route}/title.webp`}\\n      media=\\\"(min-width: 800px)\\\"\\n      type=\\\"image/webp\\\" />\\n    <source\\n      srcset={`https://assets.hectane.com/${post.route}/title.jpg`}\\n      media=\\\"(min-width: 800px)\\\"\\n      type=\\\"image/jpg\\\" />\\n    <img\\n      class=\\\"post-title-image\\\"\\n      src={`https://assets.hectane.com/${post.route}/title.jpg`}\\n      alt={post.title} />\\n  </picture>\\n  <div class=\\\"post--metadata\\\">\\n    <Author\\n      name={authorData.name}\\n      avathar={authorData.avathar}\\n      createdDate={post.createdDate} />\\n    <div class=\\\"post__tags\\\">\\n      {#each post.tags as tag}\\n        <span class=\\\"post__tag\\\">{tag}</span>\\n      {/each}\\n    </div>\\n    <div class=\\\"post__views\\\">{pageViews} views</div>\\n  </div>\\n  <div class=\\\"post--body\\\">\\n    {#each post.body as { type, data }}\\n      {#if type === 'image'}\\n        <picture>\\n          <img\\n            alt={data.caption}\\n            class={`${data.withBorder ? 'border ' : ''}${data.withBackground ? 'background ' : ''}${data.stretched ? 'stretched' : 'center'}`}\\n            src={`${data.url.replace(/\\\\.[^/.]+$/, '')}.jpg`} />\\n        </picture>\\n      {/if}\\n      {#if type === 'header'}\\n        {#if data.level === 1}\\n          <h1>{data.text}</h1>\\n        {/if}\\n        {#if data.level === 2}\\n          <h2>{data.text}</h2>\\n        {/if}\\n        {#if data.level === 3}\\n          <h3>{data.text}</h3>\\n        {/if}\\n        {#if data.level === 4}\\n          <h4>{data.text}</h4>\\n        {/if}\\n      {/if}\\n      {#if type === 'code'}\\n        <pre class=\\\"hljs\\\">\\n          <code>\\n            {@html `${highlight(data.code)}`}\\n          </code>\\n        </pre>\\n      {/if}\\n      {#if type === 'paragraph'}\\n        <p>\\n          {@html data.text}\\n        </p>\\n      {/if}\\n    {/each}\\n  </div>\\n</div>\\n\"],\"names\":[],\"mappings\":\"AAgHE,OAAO,IAAI,CAAC,MAAM,CAAC,GAAG,CAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AACzC,eAAe,cAAC,CAAC,AACf,OAAO,CAAE,IAAI,CACb,qBAAqB,CAAE,KAAK,CAAC,KAAK,CAAC,KAAK,CAAC,GAAG,CAC5C,iBAAiB,CAAE,MAAM,CACzB,WAAW,CAAE,MAAM,AACrB,CAAC,AACH,CAAC,AAED,UAAU,cAAC,CAAC,AACV,OAAO,CAAE,GAAG,CAAC,GAAG,CAChB,gBAAgB,CAAE,OAAO,CACzB,MAAM,CAAE,GAAG,CAAC,GAAG,CACf,aAAa,CAAE,GAAG,CAClB,OAAO,CAAE,YAAY,AACvB,CAAC,AACD,WAAW,cAAC,CAAC,AACX,MAAM,CAAE,GAAG,CAAC,IAAI,AAClB,CAAC,AAED,GAAG,cAAC,CAAC,AACH,aAAa,CAAE,GAAG,CAClB,OAAO,CAAE,EAAE,CACX,KAAK,CAAE,IAAI,CAEX,QAAQ,CAAE,IAAI,CACd,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,KAAK,AACpB,CAAC,AAED,GAAG,cAAC,CAAC,AACH,SAAS,CAAE,IAAI,AACjB,CAAC,AACD,OAAO,cAAC,CAAC,AACP,OAAO,CAAE,KAAK,CACd,MAAM,CAAE,IAAI,CAAC,IAAI,CACjB,UAAU,CAAE,IAAI,CAAC,GAAG,CAAC,IAAI,CAAC,OAAO,CACjC,KAAK,CAAE,IAAI,CACX,SAAS,CAAE,mBAAmB,CAC9B,SAAS,CAAE,gBAAgB,CAC3B,SAAS,CAAE,WAAW,CACtB,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,YAAY,cAAC,CAAC,AACZ,SAAS,CAAE,IAAI,CACf,MAAM,CAAE,IAAI,CAAC,CAAC,CAAC,GAAG,CAClB,WAAW,CAAE,OAAO,AACtB,CAAC,AACD,gBAAgB,cAAC,CAAC,AAChB,WAAW,CAAE,OAAO,CACpB,SAAS,CAAE,IAAI,CACf,UAAU,CAAE,IAAI,AAClB,CAAC,AAED,eAAe,cAAC,CAAC,AACf,UAAU,CAAE,IAAI,AAClB,CAAC,AAED,EAAE,cAAC,CAAC,AACF,SAAS,CAAE,IAAI,CACf,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,IAAI,WAAW,CAAC,AACzB,CAAC\"}"
};

async function preload$5({ params, query }) {

	authors.subscribe(value => {
	});

	const res = await this.fetch(`http://localhost:3200/posts/route/${params.slug}`);
	const data = await res.json();

	if (res.status === 200) {
		let authorMap = new Map();
		let authorData = [];

		const unsubscribe = authors.subscribe(value => {
			authorMap = value;
		});

		// creating unique author ids from the posts
		if (!authorMap.get(data.authorId)) {
			// getting author data for all unique authors to avoid multi fetch
			const res = await this.fetch(`http://localhost:3200/users/${data.authorId}`);

			authorData = await res.json();

			authors.update(map => {
				return map.set(authorData._id, authorData);
			});
		} else {
			authorData = authorMap.get(data.authorId);
		}

		return { post: data, authorData };
	} else {
		this.error(res.status, data.message);
	}
}

const U5Bslugu5D = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	core.registerLanguage("javascript", javascript_1);
	core.registerLanguage("bash", bash_1);
	core.registerLanguage("sql", sql_1);
	core.registerLanguage("scss", scss_1);
	core.registerLanguage("json", json_1);
	core.registerLanguage("css", css_1);
	let { post } = $$props;
	let { authorData } = $$props;

	const highlight = source => {
		const { value: highlighted } = core.highlightAuto(source);
		return highlighted;
	};

	let pageViews = 0;

	if (typeof fetch !== "function") {
		global.fetch = require("node-fetch");
	}

	fetch(`http://localhost:3200/posts-meta-data/${post._id}`).then(response => response.json()).then(({ count }) => {
		pageViews = count;
	});

	if ($$props.post === void 0 && $$bindings.post && post !== void 0) $$bindings.post(post);
	if ($$props.authorData === void 0 && $$bindings.authorData && authorData !== void 0) $$bindings.authorData(authorData);
	$$result.css.add(css$1$1);

	return `${($$result.head += `${($$result.title = `<title>${escape(post.title)}</title>`, "")}<meta name="${"keywords"}"${add_attribute("content", post.tags.join(", "), 0)}><meta name="${"description"}"${add_attribute("content", post.subTitle, 0)}><meta name="${"twitter:card"}" content="${"summary_large_image"}"><meta name="${"twitter:site"}" content="${"@_hectane"}"><meta name="${"twitter:creator"}" content="${"@velusgautam"}"><meta name="${"twitter:title"}"${add_attribute("content", post.title, 0)}><meta name="${"twitter:description"}"${add_attribute("content", post.subTitle, 0)}><meta name="${"twitter:image"}"${add_attribute("content", `https://assets.hectane.com/${post.route}/title.jpg`, 0)}><meta property="${"og:url"}"${add_attribute("content", `https://hectane.com/blog/${post.route}`, 0)}><meta property="${"og:type"}" content="${"article"}"><meta property="${"og:title"}"${add_attribute("content", post.title, 0)}><meta property="${"og:description"}"${add_attribute("content", post.subTitle, 0)}><meta property="${"og:image"}"${add_attribute("content", `https://assets.hectane.com/${post.route}/title.jpg`, 0)}>`, "")}

<div class="${"content"}"><h1 class="${"post--title svelte-w1evog"}">${escape(post.title)}</h1>
  <h4 class="${"post--sub-title svelte-w1evog"}">${escape(post.subTitle)}</h4>
  <picture><source${add_attribute("srcset", `https://assets.hectane.com/${post.route}/mobile.webp`, 0)} media="${"(max-width: 420px)"}" type="${"image/webp"}">
    <source${add_attribute("srcset", `https://assets.hectane.com/${post.route}/mobile.jpg`, 0)} media="${"(max-width: 420px)"}" type="${"image/jpg"}">
    <source${add_attribute("srcset", `https://assets.hectane.com/${post.route}/listing.webp`, 0)} media="${"( max-width:799px)"}" type="${"image/webp"}">
    <source${add_attribute("srcset", `https://assets.hectane.com/${post.route}/listing.jpg`, 0)} media="${"(max-width:799px)"}" type="${"image/jpg"}">
    <source${add_attribute("srcset", `https://assets.hectane.com/${post.route}/title.webp`, 0)} media="${"(min-width: 800px)"}" type="${"image/webp"}">
    <source${add_attribute("srcset", `https://assets.hectane.com/${post.route}/title.jpg`, 0)} media="${"(min-width: 800px)"}" type="${"image/jpg"}">
    <img class="${"post-title-image svelte-w1evog"}"${add_attribute("src", `https://assets.hectane.com/${post.route}/title.jpg`, 0)}${add_attribute("alt", post.title, 0)}></picture>
  <div class="${"post--metadata svelte-w1evog"}">${validate_component(Author, "Author").$$render(
		$$result,
		{
			name: authorData.name,
			avathar: authorData.avathar,
			createdDate: post.createdDate
		},
		{},
		{}
	)}
    <div class="${"post__tags"}">${each(post.tags, tag => `<span class="${"post__tag svelte-w1evog"}">${escape(tag)}</span>`)}</div>
    <div class="${"post__views"}">${escape(pageViews)} views</div></div>
  <div class="${"post--body svelte-w1evog"}">${each(post.body, ({ type, data }) => `${type === "image"
	? `<picture><img${add_attribute("alt", data.caption, 0)} class="${escape(null_to_empty(`${data.withBorder ? "border " : ""}${data.withBackground ? "background " : ""}${data.stretched ? "stretched" : "center"}`)) + " svelte-w1evog"}"${add_attribute("src", `${data.url.replace(/\.[^/.]+$/, "")}.jpg`, 0)}>
        </picture>`
	: ``}
      ${type === "header"
	? `${data.level === 1 ? `<h1>${escape(data.text)}</h1>` : ``}
        ${data.level === 2 ? `<h2>${escape(data.text)}</h2>` : ``}
        ${data.level === 3
		? `<h3 class="${"svelte-w1evog"}">${escape(data.text)}</h3>`
		: ``}
        ${data.level === 4 ? `<h4>${escape(data.text)}</h4>` : ``}`
	: ``}
      ${type === "code"
	? `<pre class="${"hljs svelte-w1evog"}"><code>${`${highlight(data.code)}`}</code>
        </pre>`
	: ``}
      ${type === "paragraph"
	? `<p>${data.text}
        </p>`
	: ``}`)}</div></div>`;
});

/* src/components/Nav.svelte generated by Svelte v3.21.0 */

const css$3 = {
	code: "nav.svelte-1q45jjg.svelte-1q45jjg{font-weight:300;padding:0 1em;grid-area:nav}ul.svelte-1q45jjg.svelte-1q45jjg{margin:0 auto;padding:0;display:flex;justify-content:space-evenly;flex-wrap:wrap;width:fit-content}li.svelte-1q45jjg.svelte-1q45jjg{list-style-type:none}[aria-current].svelte-1q45jjg.svelte-1q45jjg{position:relative;display:inline-block}[aria-current].svelte-1q45jjg.svelte-1q45jjg::after{position:absolute;content:\"\";width:calc(100% - 1em);height:2px;background-color:rgb(255, 62, 0);display:block;bottom:-1px}a.svelte-1q45jjg.svelte-1q45jjg{text-decoration:none;padding:1em 0.5em;display:block;color:var(--black)}h3.svelte-1q45jjg.svelte-1q45jjg{text-align:center;padding:0px 15px}h3.svelte-1q45jjg img.svelte-1q45jjg{width:100%;max-width:min-content}",
	map: "{\"version\":3,\"file\":\"Nav.svelte\",\"sources\":[\"Nav.svelte\"],\"sourcesContent\":[\"<script>\\n  export let segment;\\n</script>\\n\\n<style>\\n  nav {\\n    font-weight: 300;\\n    padding: 0 1em;\\n    grid-area: nav;\\n  }\\n\\n  ul {\\n    margin: 0 auto;\\n    padding: 0;\\n    display: flex;\\n    justify-content: space-evenly;\\n    flex-wrap: wrap;\\n    width: fit-content;\\n  }\\n\\n  li {\\n    list-style-type: none;\\n  }\\n\\n  [aria-current] {\\n    position: relative;\\n    display: inline-block;\\n  }\\n\\n  [aria-current]::after {\\n    position: absolute;\\n    content: \\\"\\\";\\n    width: calc(100% - 1em);\\n    height: 2px;\\n    background-color: rgb(255, 62, 0);\\n    display: block;\\n    bottom: -1px;\\n  }\\n\\n  a {\\n    text-decoration: none;\\n    padding: 1em 0.5em;\\n    display: block;\\n    color: var(--black);\\n  }\\n\\n  h3 {\\n    text-align: center;\\n    padding: 0px 15px;\\n  }\\n\\n  h3 img {\\n    width: 100%;\\n    max-width: min-content;\\n  }\\n</style>\\n\\n<div>\\n  <h3>\\n    <picture>\\n      <source srcset=\\\"logo.webp\\\" type=\\\"image/webp\\\" />\\n      <img src=\\\"logo.png\\\" alt=\\\"hectane logo\\\" />\\n    </picture>\\n  </h3>\\n  <nav class=\\\"margin-auto container \\\">\\n    <ul>\\n      <li>\\n        <a\\n          rel=\\\"prefetch\\\"\\n          aria-current={segment === undefined ? 'page' : undefined}\\n          href=\\\".\\\">\\n          Home\\n        </a>\\n      </li>\\n      <li>\\n        <a\\n          rel=\\\"prefetch\\\"\\n          aria-current={segment === 'technology' ? 'page' : undefined}\\n          href=\\\"technology\\\">\\n          Technology\\n        </a>\\n      </li>\\n      <li>\\n        <a\\n          rel=\\\"prefetch\\\"\\n          aria-current={segment === 'interviews' ? 'page' : undefined}\\n          href=\\\"interviews\\\">\\n          Interviews\\n        </a>\\n      </li>\\n      <li>\\n        <a\\n          rel=\\\"prefetch\\\"\\n          aria-current={segment === 'learnings' ? 'page' : undefined}\\n          href=\\\"learnings\\\">\\n          Learnings\\n        </a>\\n      </li>\\n      <li>\\n        <a\\n          rel=\\\"prefetch\\\"\\n          aria-current={segment === 'travelogue' ? 'page' : undefined}\\n          href=\\\"travelogue\\\">\\n          Travelogue\\n        </a>\\n      </li>\\n\\n      <!-- for the blog link, we're using rel=prefetch so that Sapper prefetches\\n\\t\\t     the blog data when we hover over the link or tap it on a touchscreen -->\\n      <!-- <li>\\n      <a\\n        rel=\\\"prefetch\\\"\\n        aria-current={segment === 'blog' ? 'page' : undefined}\\n        href=\\\"blog\\\">\\n        blog\\n      </a>\\n    </li> -->\\n    </ul>\\n  </nav>\\n</div>\\n\"],\"names\":[],\"mappings\":\"AAKE,GAAG,8BAAC,CAAC,AACH,WAAW,CAAE,GAAG,CAChB,OAAO,CAAE,CAAC,CAAC,GAAG,CACd,SAAS,CAAE,GAAG,AAChB,CAAC,AAED,EAAE,8BAAC,CAAC,AACF,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,CAAC,CACV,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,YAAY,CAC7B,SAAS,CAAE,IAAI,CACf,KAAK,CAAE,WAAW,AACpB,CAAC,AAED,EAAE,8BAAC,CAAC,AACF,eAAe,CAAE,IAAI,AACvB,CAAC,AAED,CAAC,YAAY,CAAC,8BAAC,CAAC,AACd,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,YAAY,AACvB,CAAC,AAED,CAAC,YAAY,+BAAC,OAAO,AAAC,CAAC,AACrB,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,EAAE,CACX,KAAK,CAAE,KAAK,IAAI,CAAC,CAAC,CAAC,GAAG,CAAC,CACvB,MAAM,CAAE,GAAG,CACX,gBAAgB,CAAE,IAAI,GAAG,CAAC,CAAC,EAAE,CAAC,CAAC,CAAC,CAAC,CACjC,OAAO,CAAE,KAAK,CACd,MAAM,CAAE,IAAI,AACd,CAAC,AAED,CAAC,8BAAC,CAAC,AACD,eAAe,CAAE,IAAI,CACrB,OAAO,CAAE,GAAG,CAAC,KAAK,CAClB,OAAO,CAAE,KAAK,CACd,KAAK,CAAE,IAAI,OAAO,CAAC,AACrB,CAAC,AAED,EAAE,8BAAC,CAAC,AACF,UAAU,CAAE,MAAM,CAClB,OAAO,CAAE,GAAG,CAAC,IAAI,AACnB,CAAC,AAED,iBAAE,CAAC,GAAG,eAAC,CAAC,AACN,KAAK,CAAE,IAAI,CACX,SAAS,CAAE,WAAW,AACxB,CAAC\"}"
};

const Nav = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { segment } = $$props;
	if ($$props.segment === void 0 && $$bindings.segment && segment !== void 0) $$bindings.segment(segment);
	$$result.css.add(css$3);

	return `<div><h3 class="${"svelte-1q45jjg"}"><picture><source srcset="${"logo.webp"}" type="${"image/webp"}">
      <img src="${"logo.png"}" alt="${"hectane logo"}" class="${"svelte-1q45jjg"}"></picture></h3>
  <nav class="${"margin-auto container  svelte-1q45jjg"}"><ul class="${"svelte-1q45jjg"}"><li class="${"svelte-1q45jjg"}"><a rel="${"prefetch"}"${add_attribute("aria-current", segment === undefined ? "page" : undefined, 0)} href="${"."}" class="${"svelte-1q45jjg"}">Home
        </a></li>
      <li class="${"svelte-1q45jjg"}"><a rel="${"prefetch"}"${add_attribute("aria-current", segment === "technology" ? "page" : undefined, 0)} href="${"technology"}" class="${"svelte-1q45jjg"}">Technology
        </a></li>
      <li class="${"svelte-1q45jjg"}"><a rel="${"prefetch"}"${add_attribute("aria-current", segment === "interviews" ? "page" : undefined, 0)} href="${"interviews"}" class="${"svelte-1q45jjg"}">Interviews
        </a></li>
      <li class="${"svelte-1q45jjg"}"><a rel="${"prefetch"}"${add_attribute("aria-current", segment === "learnings" ? "page" : undefined, 0)} href="${"learnings"}" class="${"svelte-1q45jjg"}">Learnings
        </a></li>
      <li class="${"svelte-1q45jjg"}"><a rel="${"prefetch"}"${add_attribute("aria-current", segment === "travelogue" ? "page" : undefined, 0)} href="${"travelogue"}" class="${"svelte-1q45jjg"}">Travelogue
        </a></li>

      
      </ul></nav></div>`;
});

/* src/components/Header.svelte generated by Svelte v3.21.0 */

const css$4 = {
	code: ".page--title.svelte-zsnm1j{color:var(--textBlack);font-size:1.8rem;font-weight:500;border-bottom:1px solid var(--lightgrey)}",
	map: "{\"version\":3,\"file\":\"Header.svelte\",\"sources\":[\"Header.svelte\"],\"sourcesContent\":[\"<script>\\n  export let segment;\\n</script>\\n\\n<style>\\n  .page--title {\\n    color: var(--textBlack);\\n    font-size: 1.8rem;\\n    font-weight: 500;\\n    border-bottom: 1px solid var(--lightgrey);\\n  }\\n</style>\\n\\n{#if segment !== 'blog'}\\n  <header class=\\\"container margin-auto padding-left20 padding-right20\\\">\\n    <h1 class=\\\"page--title\\\">\\n      {segment === undefined ? 'Home' : String(segment)\\n            .charAt(0)\\n            .toUpperCase() + String(segment).slice(1)}\\n    </h1>\\n  </header>\\n{/if}\\n\"],\"names\":[],\"mappings\":\"AAKE,YAAY,cAAC,CAAC,AACZ,KAAK,CAAE,IAAI,WAAW,CAAC,CACvB,SAAS,CAAE,MAAM,CACjB,WAAW,CAAE,GAAG,CAChB,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,WAAW,CAAC,AAC3C,CAAC\"}"
};

const Header = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { segment } = $$props;
	if ($$props.segment === void 0 && $$bindings.segment && segment !== void 0) $$bindings.segment(segment);
	$$result.css.add(css$4);

	return `${segment !== "blog"
	? `<header class="${"container margin-auto padding-left20 padding-right20"}"><h1 class="${"page--title svelte-zsnm1j"}">${escape(segment === undefined
		? "Home"
		: String(segment).charAt(0).toUpperCase() + String(segment).slice(1))}</h1></header>`
	: ``}`;
});

/* src/components/Footer.svelte generated by Svelte v3.21.0 */

const css$5 = {
	code: ".footer-text.svelte-1nbsi5i{border-top:1px solid var(--lightgrey);margin:20px;padding-top:10px;display:grid;justify-items:right;grid-template-columns:1fr;grid-template-rows:none}",
	map: "{\"version\":3,\"file\":\"Footer.svelte\",\"sources\":[\"Footer.svelte\"],\"sourcesContent\":[\"<style>\\n  .footer-text {\\n    border-top: 1px solid var(--lightgrey);\\n    margin: 20px;\\n    padding-top: 10px;\\n    display: grid;\\n    justify-items: right;\\n    grid-template-columns: 1fr;\\n    grid-template-rows: none;\\n  }\\n</style>\\n\\n<footer class=\\\"margin-auto container\\\">\\n  <div class=\\\"footer-text\\\">\\n    {`Hectane All Rights Reserved. Copyright 2018 - ${new Date().getFullYear()}`}\\n  </div>\\n</footer>\\n\"],\"names\":[],\"mappings\":\"AACE,YAAY,eAAC,CAAC,AACZ,UAAU,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,WAAW,CAAC,CACtC,MAAM,CAAE,IAAI,CACZ,WAAW,CAAE,IAAI,CACjB,OAAO,CAAE,IAAI,CACb,aAAa,CAAE,KAAK,CACpB,qBAAqB,CAAE,GAAG,CAC1B,kBAAkB,CAAE,IAAI,AAC1B,CAAC\"}"
};

const Footer = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	$$result.css.add(css$5);
	return `<footer class="${"margin-auto container"}"><div class="${"footer-text svelte-1nbsi5i"}">${escape(`Hectane All Rights Reserved. Copyright 2018 - ${new Date().getFullYear()}`)}</div></footer>`;
});

/* src/routes/_layout.svelte generated by Svelte v3.21.0 */

const Layout = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { segment } = $$props;
	if ($$props.segment === void 0 && $$bindings.segment && segment !== void 0) $$bindings.segment(segment);

	return `${validate_component(Nav, "Nav").$$render($$result, { segment }, {}, {})}
${validate_component(Header, "Header").$$render($$result, { segment }, {}, {})}
<section class="${"container margin-auto padding-left20 padding-right20"}">${$$slots.default ? $$slots.default({}) : ``}</section>
${validate_component(Footer, "Footer").$$render($$result, {}, {}, {})}`;
});

/* src/routes/_error.svelte generated by Svelte v3.21.0 */

const css$6 = {
	code: "h1.svelte-17w3omn,p.svelte-17w3omn{margin:0 auto}h1.svelte-17w3omn{font-size:2.8em;font-weight:700;margin:0 0 0.5em 0}p.svelte-17w3omn{margin:1em auto}@media(min-width: 480px){h1.svelte-17w3omn{font-size:4em}}",
	map: "{\"version\":3,\"file\":\"_error.svelte\",\"sources\":[\"_error.svelte\"],\"sourcesContent\":[\"<script>\\n  export let status;\\n  export let error;\\n\\n  const dev = \\\"development\\\" === \\\"development\\\";\\n</script>\\n\\n<style>\\n  h1,\\n  p {\\n    margin: 0 auto;\\n  }\\n\\n  h1 {\\n    font-size: 2.8em;\\n    font-weight: 700;\\n    margin: 0 0 0.5em 0;\\n  }\\n\\n  p {\\n    margin: 1em auto;\\n  }\\n\\n  @media (min-width: 480px) {\\n    h1 {\\n      font-size: 4em;\\n    }\\n  }\\n</style>\\n\\n<svelte:head>\\n  <title>{status}</title>\\n</svelte:head>\\n\\n<h1>{status}</h1>\\n\\n<p>{error.message}</p>\\n\\n{#if dev && error.stack}\\n  <pre>{error.stack}</pre>\\n{/if}\\n\"],\"names\":[],\"mappings\":\"AAQE,iBAAE,CACF,CAAC,eAAC,CAAC,AACD,MAAM,CAAE,CAAC,CAAC,IAAI,AAChB,CAAC,AAED,EAAE,eAAC,CAAC,AACF,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,GAAG,CAChB,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,KAAK,CAAC,CAAC,AACrB,CAAC,AAED,CAAC,eAAC,CAAC,AACD,MAAM,CAAE,GAAG,CAAC,IAAI,AAClB,CAAC,AAED,MAAM,AAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AACzB,EAAE,eAAC,CAAC,AACF,SAAS,CAAE,GAAG,AAChB,CAAC,AACH,CAAC\"}"
};

const Error$1 = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { status } = $$props;
	let { error } = $$props;
	if ($$props.status === void 0 && $$bindings.status && status !== void 0) $$bindings.status(status);
	if ($$props.error === void 0 && $$bindings.error && error !== void 0) $$bindings.error(error);
	$$result.css.add(css$6);

	return `${($$result.head += `${($$result.title = `<title>${escape(status)}</title>`, "")}`, "")}

<h1 class="${"svelte-17w3omn"}">${escape(status)}</h1>

<p class="${"svelte-17w3omn"}">${escape(error.message)}</p>

${ error.stack
	? `<pre>${escape(error.stack)}</pre>`
	: ``}`;
});

// This file is generated by Sapper — do not edit it!

const d = decodeURIComponent;

const manifest = {
	server_routes: [
		
	],

	pages: [
		{
			// index.svelte
			pattern: /^\/$/,
			parts: [
				{ name: "index", file: "index.svelte", component: Routes, preload: preload }
			]
		},

		{
			// interviews.svelte
			pattern: /^\/interviews\/?$/,
			parts: [
				{ name: "interviews", file: "interviews.svelte", component: Interviews, preload: preload$1 }
			]
		},

		{
			// technology.svelte
			pattern: /^\/technology\/?$/,
			parts: [
				{ name: "technology", file: "technology.svelte", component: Technology, preload: preload$2 }
			]
		},

		{
			// travelogue.svelte
			pattern: /^\/travelogue\/?$/,
			parts: [
				{ name: "travelogue", file: "travelogue.svelte", component: Travelogue, preload: preload$3 }
			]
		},

		{
			// learnings.svelte
			pattern: /^\/learnings\/?$/,
			parts: [
				{ name: "learnings", file: "learnings.svelte", component: Learnings, preload: preload$4 }
			]
		},

		{
			// about.svelte
			pattern: /^\/about\/?$/,
			parts: [
				{ name: "about", file: "about.svelte", component: About }
			]
		},

		{
			// blog/[slug].svelte
			pattern: /^\/blog\/([^\/]+?)\/?$/,
			parts: [
				null,
				{ name: "blog_$slug", file: "blog/[slug].svelte", component: U5Bslugu5D, preload: preload$5, params: match => ({ slug: d(match[1]) }) }
			]
		}
	],

	root: Layout,
	root_preload: () => {},
	error: Error$1
};

const build_dir = "__sapper__/dev";

const src_dir = "src";

const CONTEXT_KEY = {};

/* src/node_modules/@sapper/internal/App.svelte generated by Svelte v3.21.0 */

const App = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { stores } = $$props;
	let { error } = $$props;
	let { status } = $$props;
	let { segments } = $$props;
	let { level0 } = $$props;
	let { level1 = null } = $$props;
	setContext(CONTEXT_KEY, stores);
	if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0) $$bindings.stores(stores);
	if ($$props.error === void 0 && $$bindings.error && error !== void 0) $$bindings.error(error);
	if ($$props.status === void 0 && $$bindings.status && status !== void 0) $$bindings.status(status);
	if ($$props.segments === void 0 && $$bindings.segments && segments !== void 0) $$bindings.segments(segments);
	if ($$props.level0 === void 0 && $$bindings.level0 && level0 !== void 0) $$bindings.level0(level0);
	if ($$props.level1 === void 0 && $$bindings.level1 && level1 !== void 0) $$bindings.level1(level1);

	return `


${validate_component(Layout, "Layout").$$render($$result, Object.assign({ segment: segments[0] }, level0.props), {}, {
		default: () => `${error
		? `${validate_component(Error$1, "Error").$$render($$result, { error, status }, {}, {})}`
		: `${validate_component(level1.component || missing_component, "svelte:component").$$render($$result, Object.assign(level1.props), {}, {})}`}`
	})}`;
});

/**
 * @param typeMap [Object] Map of MIME type -> Array[extensions]
 * @param ...
 */
function Mime() {
  this._types = Object.create(null);
  this._extensions = Object.create(null);

  for (var i = 0; i < arguments.length; i++) {
    this.define(arguments[i]);
  }

  this.define = this.define.bind(this);
  this.getType = this.getType.bind(this);
  this.getExtension = this.getExtension.bind(this);
}

/**
 * Define mimetype -> extension mappings.  Each key is a mime-type that maps
 * to an array of extensions associated with the type.  The first extension is
 * used as the default extension for the type.
 *
 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
 *
 * If a type declares an extension that has already been defined, an error will
 * be thrown.  To suppress this error and force the extension to be associated
 * with the new type, pass `force`=true.  Alternatively, you may prefix the
 * extension with "*" to map the type to extension, without mapping the
 * extension to the type.
 *
 * e.g. mime.define({'audio/wav', ['wav']}, {'audio/x-wav', ['*wav']});
 *
 *
 * @param map (Object) type definitions
 * @param force (Boolean) if true, force overriding of existing definitions
 */
Mime.prototype.define = function(typeMap, force) {
  for (var type in typeMap) {
    var extensions = typeMap[type].map(function(t) {return t.toLowerCase()});
    type = type.toLowerCase();

    for (var i = 0; i < extensions.length; i++) {
      var ext = extensions[i];

      // '*' prefix = not the preferred type for this extension.  So fixup the
      // extension, and skip it.
      if (ext[0] == '*') {
        continue;
      }

      if (!force && (ext in this._types)) {
        throw new Error(
          'Attempt to change mapping for "' + ext +
          '" extension from "' + this._types[ext] + '" to "' + type +
          '". Pass `force=true` to allow this, otherwise remove "' + ext +
          '" from the list of extensions for "' + type + '".'
        );
      }

      this._types[ext] = type;
    }

    // Use first extension as default
    if (force || !this._extensions[type]) {
      var ext = extensions[0];
      this._extensions[type] = (ext[0] != '*') ? ext : ext.substr(1);
    }
  }
};

/**
 * Lookup a mime type based on extension
 */
Mime.prototype.getType = function(path) {
  path = String(path);
  var last = path.replace(/^.*[/\\]/, '').toLowerCase();
  var ext = last.replace(/^.*\./, '').toLowerCase();

  var hasPath = last.length < path.length;
  var hasDot = ext.length < last.length - 1;

  return (hasDot || !hasPath) && this._types[ext] || null;
};

/**
 * Return file extension associated with a mime type
 */
Mime.prototype.getExtension = function(type) {
  type = /^\s*([^;\s]*)/.test(type) && RegExp.$1;
  return type && this._extensions[type.toLowerCase()] || null;
};

var Mime_1 = Mime;

var standard = {"application/andrew-inset":["ez"],"application/applixware":["aw"],"application/atom+xml":["atom"],"application/atomcat+xml":["atomcat"],"application/atomsvc+xml":["atomsvc"],"application/bdoc":["bdoc"],"application/ccxml+xml":["ccxml"],"application/cdmi-capability":["cdmia"],"application/cdmi-container":["cdmic"],"application/cdmi-domain":["cdmid"],"application/cdmi-object":["cdmio"],"application/cdmi-queue":["cdmiq"],"application/cu-seeme":["cu"],"application/dash+xml":["mpd"],"application/davmount+xml":["davmount"],"application/docbook+xml":["dbk"],"application/dssc+der":["dssc"],"application/dssc+xml":["xdssc"],"application/ecmascript":["ecma","es"],"application/emma+xml":["emma"],"application/epub+zip":["epub"],"application/exi":["exi"],"application/font-tdpfr":["pfr"],"application/geo+json":["geojson"],"application/gml+xml":["gml"],"application/gpx+xml":["gpx"],"application/gxf":["gxf"],"application/gzip":["gz"],"application/hjson":["hjson"],"application/hyperstudio":["stk"],"application/inkml+xml":["ink","inkml"],"application/ipfix":["ipfix"],"application/java-archive":["jar","war","ear"],"application/java-serialized-object":["ser"],"application/java-vm":["class"],"application/javascript":["js","mjs"],"application/json":["json","map"],"application/json5":["json5"],"application/jsonml+json":["jsonml"],"application/ld+json":["jsonld"],"application/lost+xml":["lostxml"],"application/mac-binhex40":["hqx"],"application/mac-compactpro":["cpt"],"application/mads+xml":["mads"],"application/manifest+json":["webmanifest"],"application/marc":["mrc"],"application/marcxml+xml":["mrcx"],"application/mathematica":["ma","nb","mb"],"application/mathml+xml":["mathml"],"application/mbox":["mbox"],"application/mediaservercontrol+xml":["mscml"],"application/metalink+xml":["metalink"],"application/metalink4+xml":["meta4"],"application/mets+xml":["mets"],"application/mods+xml":["mods"],"application/mp21":["m21","mp21"],"application/mp4":["mp4s","m4p"],"application/msword":["doc","dot"],"application/mxf":["mxf"],"application/n-quads":["nq"],"application/n-triples":["nt"],"application/octet-stream":["bin","dms","lrf","mar","so","dist","distz","pkg","bpk","dump","elc","deploy","exe","dll","deb","dmg","iso","img","msi","msp","msm","buffer"],"application/oda":["oda"],"application/oebps-package+xml":["opf"],"application/ogg":["ogx"],"application/omdoc+xml":["omdoc"],"application/onenote":["onetoc","onetoc2","onetmp","onepkg"],"application/oxps":["oxps"],"application/patch-ops-error+xml":["xer"],"application/pdf":["pdf"],"application/pgp-encrypted":["pgp"],"application/pgp-signature":["asc","sig"],"application/pics-rules":["prf"],"application/pkcs10":["p10"],"application/pkcs7-mime":["p7m","p7c"],"application/pkcs7-signature":["p7s"],"application/pkcs8":["p8"],"application/pkix-attr-cert":["ac"],"application/pkix-cert":["cer"],"application/pkix-crl":["crl"],"application/pkix-pkipath":["pkipath"],"application/pkixcmp":["pki"],"application/pls+xml":["pls"],"application/postscript":["ai","eps","ps"],"application/pskc+xml":["pskcxml"],"application/raml+yaml":["raml"],"application/rdf+xml":["rdf","owl"],"application/reginfo+xml":["rif"],"application/relax-ng-compact-syntax":["rnc"],"application/resource-lists+xml":["rl"],"application/resource-lists-diff+xml":["rld"],"application/rls-services+xml":["rs"],"application/rpki-ghostbusters":["gbr"],"application/rpki-manifest":["mft"],"application/rpki-roa":["roa"],"application/rsd+xml":["rsd"],"application/rss+xml":["rss"],"application/rtf":["rtf"],"application/sbml+xml":["sbml"],"application/scvp-cv-request":["scq"],"application/scvp-cv-response":["scs"],"application/scvp-vp-request":["spq"],"application/scvp-vp-response":["spp"],"application/sdp":["sdp"],"application/set-payment-initiation":["setpay"],"application/set-registration-initiation":["setreg"],"application/shf+xml":["shf"],"application/sieve":["siv","sieve"],"application/smil+xml":["smi","smil"],"application/sparql-query":["rq"],"application/sparql-results+xml":["srx"],"application/srgs":["gram"],"application/srgs+xml":["grxml"],"application/sru+xml":["sru"],"application/ssdl+xml":["ssdl"],"application/ssml+xml":["ssml"],"application/tei+xml":["tei","teicorpus"],"application/thraud+xml":["tfi"],"application/timestamped-data":["tsd"],"application/voicexml+xml":["vxml"],"application/wasm":["wasm"],"application/widget":["wgt"],"application/winhlp":["hlp"],"application/wsdl+xml":["wsdl"],"application/wspolicy+xml":["wspolicy"],"application/xaml+xml":["xaml"],"application/xcap-diff+xml":["xdf"],"application/xenc+xml":["xenc"],"application/xhtml+xml":["xhtml","xht"],"application/xml":["xml","xsl","xsd","rng"],"application/xml-dtd":["dtd"],"application/xop+xml":["xop"],"application/xproc+xml":["xpl"],"application/xslt+xml":["xslt"],"application/xspf+xml":["xspf"],"application/xv+xml":["mxml","xhvml","xvml","xvm"],"application/yang":["yang"],"application/yin+xml":["yin"],"application/zip":["zip"],"audio/3gpp":["*3gpp"],"audio/adpcm":["adp"],"audio/basic":["au","snd"],"audio/midi":["mid","midi","kar","rmi"],"audio/mp3":["*mp3"],"audio/mp4":["m4a","mp4a"],"audio/mpeg":["mpga","mp2","mp2a","mp3","m2a","m3a"],"audio/ogg":["oga","ogg","spx"],"audio/s3m":["s3m"],"audio/silk":["sil"],"audio/wav":["wav"],"audio/wave":["*wav"],"audio/webm":["weba"],"audio/xm":["xm"],"font/collection":["ttc"],"font/otf":["otf"],"font/ttf":["ttf"],"font/woff":["woff"],"font/woff2":["woff2"],"image/aces":["exr"],"image/apng":["apng"],"image/bmp":["bmp"],"image/cgm":["cgm"],"image/dicom-rle":["drle"],"image/emf":["emf"],"image/fits":["fits"],"image/g3fax":["g3"],"image/gif":["gif"],"image/heic":["heic"],"image/heic-sequence":["heics"],"image/heif":["heif"],"image/heif-sequence":["heifs"],"image/ief":["ief"],"image/jls":["jls"],"image/jp2":["jp2","jpg2"],"image/jpeg":["jpeg","jpg","jpe"],"image/jpm":["jpm"],"image/jpx":["jpx","jpf"],"image/jxr":["jxr"],"image/ktx":["ktx"],"image/png":["png"],"image/sgi":["sgi"],"image/svg+xml":["svg","svgz"],"image/t38":["t38"],"image/tiff":["tif","tiff"],"image/tiff-fx":["tfx"],"image/webp":["webp"],"image/wmf":["wmf"],"message/disposition-notification":["disposition-notification"],"message/global":["u8msg"],"message/global-delivery-status":["u8dsn"],"message/global-disposition-notification":["u8mdn"],"message/global-headers":["u8hdr"],"message/rfc822":["eml","mime"],"model/3mf":["3mf"],"model/gltf+json":["gltf"],"model/gltf-binary":["glb"],"model/iges":["igs","iges"],"model/mesh":["msh","mesh","silo"],"model/stl":["stl"],"model/vrml":["wrl","vrml"],"model/x3d+binary":["*x3db","x3dbz"],"model/x3d+fastinfoset":["x3db"],"model/x3d+vrml":["*x3dv","x3dvz"],"model/x3d+xml":["x3d","x3dz"],"model/x3d-vrml":["x3dv"],"text/cache-manifest":["appcache","manifest"],"text/calendar":["ics","ifb"],"text/coffeescript":["coffee","litcoffee"],"text/css":["css"],"text/csv":["csv"],"text/html":["html","htm","shtml"],"text/jade":["jade"],"text/jsx":["jsx"],"text/less":["less"],"text/markdown":["markdown","md"],"text/mathml":["mml"],"text/mdx":["mdx"],"text/n3":["n3"],"text/plain":["txt","text","conf","def","list","log","in","ini"],"text/richtext":["rtx"],"text/rtf":["*rtf"],"text/sgml":["sgml","sgm"],"text/shex":["shex"],"text/slim":["slim","slm"],"text/stylus":["stylus","styl"],"text/tab-separated-values":["tsv"],"text/troff":["t","tr","roff","man","me","ms"],"text/turtle":["ttl"],"text/uri-list":["uri","uris","urls"],"text/vcard":["vcard"],"text/vtt":["vtt"],"text/xml":["*xml"],"text/yaml":["yaml","yml"],"video/3gpp":["3gp","3gpp"],"video/3gpp2":["3g2"],"video/h261":["h261"],"video/h263":["h263"],"video/h264":["h264"],"video/jpeg":["jpgv"],"video/jpm":["*jpm","jpgm"],"video/mj2":["mj2","mjp2"],"video/mp2t":["ts"],"video/mp4":["mp4","mp4v","mpg4"],"video/mpeg":["mpeg","mpg","mpe","m1v","m2v"],"video/ogg":["ogv"],"video/quicktime":["qt","mov"],"video/webm":["webm"]};

var lite = new Mime_1(standard);

function get_server_route_handler(routes) {
	async function handle_route(route, req, res, next) {
		req.params = route.params(route.pattern.exec(req.path));

		const method = req.method.toLowerCase();
		// 'delete' cannot be exported from a module because it is a keyword,
		// so check for 'del' instead
		const method_export = method === 'delete' ? 'del' : method;
		const handle_method = route.handlers[method_export];
		if (handle_method) {
			if (process.env.SAPPER_EXPORT) {
				const { write, end, setHeader } = res;
				const chunks = [];
				const headers = {};

				// intercept data so that it can be exported
				res.write = function(chunk) {
					chunks.push(Buffer.from(chunk));
					write.apply(res, arguments);
				};

				res.setHeader = function(name, value) {
					headers[name.toLowerCase()] = value;
					setHeader.apply(res, arguments);
				};

				res.end = function(chunk) {
					if (chunk) chunks.push(Buffer.from(chunk));
					end.apply(res, arguments);

					process.send({
						__sapper__: true,
						event: 'file',
						url: req.url,
						method: req.method,
						status: res.statusCode,
						type: headers['content-type'],
						body: Buffer.concat(chunks).toString()
					});
				};
			}

			const handle_next = (err) => {
				if (err) {
					res.statusCode = 500;
					res.end(err.message);
				} else {
					process.nextTick(next);
				}
			};

			try {
				await handle_method(req, res, handle_next);
			} catch (err) {
				console.error(err);
				handle_next(err);
			}
		} else {
			// no matching handler for method
			process.nextTick(next);
		}
	}

	return function find_route(req, res, next) {
		for (const route of routes) {
			if (route.pattern.test(req.path)) {
				handle_route(route, req, res, next);
				return;
			}
		}

		next();
	};
}

/*!
 * cookie
 * Copyright(c) 2012-2014 Roman Shtylman
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module exports.
 * @public
 */

var parse_1 = parse;
var serialize_1 = serialize;

/**
 * Module variables.
 * @private
 */

var decode = decodeURIComponent;
var encode = encodeURIComponent;
var pairSplitRegExp = /; */;

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 *
 * @param {string} str
 * @param {object} [options]
 * @return {object}
 * @public
 */

function parse(str, options) {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }

  var obj = {};
  var opt = options || {};
  var pairs = str.split(pairSplitRegExp);
  var dec = opt.decode || decode;

  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    var eq_idx = pair.indexOf('=');

    // skip things that don't look like key=value
    if (eq_idx < 0) {
      continue;
    }

    var key = pair.substr(0, eq_idx).trim();
    var val = pair.substr(++eq_idx, pair.length).trim();

    // quoted values
    if ('"' == val[0]) {
      val = val.slice(1, -1);
    }

    // only assign once
    if (undefined == obj[key]) {
      obj[key] = tryDecode(val, dec);
    }
  }

  return obj;
}

/**
 * Serialize data into a cookie header.
 *
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 *
 * serialize('foo', 'bar', { httpOnly: true })
 *   => "foo=bar; httpOnly"
 *
 * @param {string} name
 * @param {string} val
 * @param {object} [options]
 * @return {string}
 * @public
 */

function serialize(name, val, options) {
  var opt = options || {};
  var enc = opt.encode || encode;

  if (typeof enc !== 'function') {
    throw new TypeError('option encode is invalid');
  }

  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }

  var value = enc(val);

  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError('argument val is invalid');
  }

  var str = name + '=' + value;

  if (null != opt.maxAge) {
    var maxAge = opt.maxAge - 0;
    if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
    str += '; Max-Age=' + Math.floor(maxAge);
  }

  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError('option domain is invalid');
    }

    str += '; Domain=' + opt.domain;
  }

  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError('option path is invalid');
    }

    str += '; Path=' + opt.path;
  }

  if (opt.expires) {
    if (typeof opt.expires.toUTCString !== 'function') {
      throw new TypeError('option expires is invalid');
    }

    str += '; Expires=' + opt.expires.toUTCString();
  }

  if (opt.httpOnly) {
    str += '; HttpOnly';
  }

  if (opt.secure) {
    str += '; Secure';
  }

  if (opt.sameSite) {
    var sameSite = typeof opt.sameSite === 'string'
      ? opt.sameSite.toLowerCase() : opt.sameSite;

    switch (sameSite) {
      case true:
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'strict':
        str += '; SameSite=Strict';
        break;
      case 'none':
        str += '; SameSite=None';
        break;
      default:
        throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}

/**
 * Try decoding a string using a decoding function.
 *
 * @param {string} str
 * @param {function} decode
 * @private
 */

function tryDecode(str, decode) {
  try {
    return decode(str);
  } catch (e) {
    return str;
  }
}

var cookie = {
	parse: parse_1,
	serialize: serialize_1
};

var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$';
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
    '<': '\\u003C',
    '>': '\\u003E',
    '/': '\\u002F',
    '\\': '\\\\',
    '\b': '\\b',
    '\f': '\\f',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\0': '\\0',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join('\0');
function devalue(value) {
    var counts = new Map();
    function walk(thing) {
        if (typeof thing === 'function') {
            throw new Error("Cannot stringify a function");
        }
        if (counts.has(thing)) {
            counts.set(thing, counts.get(thing) + 1);
            return;
        }
        counts.set(thing, 1);
        if (!isPrimitive(thing)) {
            var type = getType(thing);
            switch (type) {
                case 'Number':
                case 'String':
                case 'Boolean':
                case 'Date':
                case 'RegExp':
                    return;
                case 'Array':
                    thing.forEach(walk);
                    break;
                case 'Set':
                case 'Map':
                    Array.from(thing).forEach(walk);
                    break;
                default:
                    var proto = Object.getPrototypeOf(thing);
                    if (proto !== Object.prototype &&
                        proto !== null &&
                        Object.getOwnPropertyNames(proto).sort().join('\0') !== objectProtoOwnPropertyNames) {
                        throw new Error("Cannot stringify arbitrary non-POJOs");
                    }
                    if (Object.getOwnPropertySymbols(thing).length > 0) {
                        throw new Error("Cannot stringify POJOs with symbolic keys");
                    }
                    Object.keys(thing).forEach(function (key) { return walk(thing[key]); });
            }
        }
    }
    walk(value);
    var names = new Map();
    Array.from(counts)
        .filter(function (entry) { return entry[1] > 1; })
        .sort(function (a, b) { return b[1] - a[1]; })
        .forEach(function (entry, i) {
        names.set(entry[0], getName(i));
    });
    function stringify(thing) {
        if (names.has(thing)) {
            return names.get(thing);
        }
        if (isPrimitive(thing)) {
            return stringifyPrimitive(thing);
        }
        var type = getType(thing);
        switch (type) {
            case 'Number':
            case 'String':
            case 'Boolean':
                return "Object(" + stringify(thing.valueOf()) + ")";
            case 'RegExp':
                return thing.toString();
            case 'Date':
                return "new Date(" + thing.getTime() + ")";
            case 'Array':
                var members = thing.map(function (v, i) { return i in thing ? stringify(v) : ''; });
                var tail = thing.length === 0 || (thing.length - 1 in thing) ? '' : ',';
                return "[" + members.join(',') + tail + "]";
            case 'Set':
            case 'Map':
                return "new " + type + "([" + Array.from(thing).map(stringify).join(',') + "])";
            default:
                var obj = "{" + Object.keys(thing).map(function (key) { return safeKey(key) + ":" + stringify(thing[key]); }).join(',') + "}";
                var proto = Object.getPrototypeOf(thing);
                if (proto === null) {
                    return Object.keys(thing).length > 0
                        ? "Object.assign(Object.create(null)," + obj + ")"
                        : "Object.create(null)";
                }
                return obj;
        }
    }
    var str = stringify(value);
    if (names.size) {
        var params_1 = [];
        var statements_1 = [];
        var values_1 = [];
        names.forEach(function (name, thing) {
            params_1.push(name);
            if (isPrimitive(thing)) {
                values_1.push(stringifyPrimitive(thing));
                return;
            }
            var type = getType(thing);
            switch (type) {
                case 'Number':
                case 'String':
                case 'Boolean':
                    values_1.push("Object(" + stringify(thing.valueOf()) + ")");
                    break;
                case 'RegExp':
                    values_1.push(thing.toString());
                    break;
                case 'Date':
                    values_1.push("new Date(" + thing.getTime() + ")");
                    break;
                case 'Array':
                    values_1.push("Array(" + thing.length + ")");
                    thing.forEach(function (v, i) {
                        statements_1.push(name + "[" + i + "]=" + stringify(v));
                    });
                    break;
                case 'Set':
                    values_1.push("new Set");
                    statements_1.push(name + "." + Array.from(thing).map(function (v) { return "add(" + stringify(v) + ")"; }).join('.'));
                    break;
                case 'Map':
                    values_1.push("new Map");
                    statements_1.push(name + "." + Array.from(thing).map(function (_a) {
                        var k = _a[0], v = _a[1];
                        return "set(" + stringify(k) + ", " + stringify(v) + ")";
                    }).join('.'));
                    break;
                default:
                    values_1.push(Object.getPrototypeOf(thing) === null ? 'Object.create(null)' : '{}');
                    Object.keys(thing).forEach(function (key) {
                        statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
                    });
            }
        });
        statements_1.push("return " + str);
        return "(function(" + params_1.join(',') + "){" + statements_1.join(';') + "}(" + values_1.join(',') + "))";
    }
    else {
        return str;
    }
}
function getName(num) {
    var name = '';
    do {
        name = chars[num % chars.length] + name;
        num = ~~(num / chars.length) - 1;
    } while (num >= 0);
    return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
    return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
    if (typeof thing === 'string')
        return stringifyString(thing);
    if (thing === void 0)
        return 'void 0';
    if (thing === 0 && 1 / thing < 0)
        return '-0';
    var str = String(thing);
    if (typeof thing === 'number')
        return str.replace(/^(-)?0\./, '$1.');
    return str;
}
function getType(thing) {
    return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
    return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
    return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
    return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
    return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
    var result = '"';
    for (var i = 0; i < str.length; i += 1) {
        var char = str.charAt(i);
        var code = char.charCodeAt(0);
        if (char === '"') {
            result += '\\"';
        }
        else if (char in escaped$1) {
            result += escaped$1[char];
        }
        else if (code >= 0xd800 && code <= 0xdfff) {
            var next = str.charCodeAt(i + 1);
            // If this is the beginning of a [high, low] surrogate pair,
            // add the next two characters, otherwise escape
            if (code <= 0xdbff && (next >= 0xdc00 && next <= 0xdfff)) {
                result += char + str[++i];
            }
            else {
                result += "\\u" + code.toString(16).toUpperCase();
            }
        }
        else {
            result += char;
        }
    }
    result += '"';
    return result;
}

// Based on https://github.com/tmpvar/jsdom/blob/aa85b2abf07766ff7bf5c1f6daafb3726f2f2db5/lib/jsdom/living/blob.js

// fix for "Readable" isn't a named export issue
const Readable = Stream.Readable;

const BUFFER = Symbol('buffer');
const TYPE = Symbol('type');

class Blob {
	constructor() {
		this[TYPE] = '';

		const blobParts = arguments[0];
		const options = arguments[1];

		const buffers = [];
		let size = 0;

		if (blobParts) {
			const a = blobParts;
			const length = Number(a.length);
			for (let i = 0; i < length; i++) {
				const element = a[i];
				let buffer;
				if (element instanceof Buffer) {
					buffer = element;
				} else if (ArrayBuffer.isView(element)) {
					buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
				} else if (element instanceof ArrayBuffer) {
					buffer = Buffer.from(element);
				} else if (element instanceof Blob) {
					buffer = element[BUFFER];
				} else {
					buffer = Buffer.from(typeof element === 'string' ? element : String(element));
				}
				size += buffer.length;
				buffers.push(buffer);
			}
		}

		this[BUFFER] = Buffer.concat(buffers);

		let type = options && options.type !== undefined && String(options.type).toLowerCase();
		if (type && !/[^\u0020-\u007E]/.test(type)) {
			this[TYPE] = type;
		}
	}
	get size() {
		return this[BUFFER].length;
	}
	get type() {
		return this[TYPE];
	}
	text() {
		return Promise.resolve(this[BUFFER].toString());
	}
	arrayBuffer() {
		const buf = this[BUFFER];
		const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		return Promise.resolve(ab);
	}
	stream() {
		const readable = new Readable();
		readable._read = function () {};
		readable.push(this[BUFFER]);
		readable.push(null);
		return readable;
	}
	toString() {
		return '[object Blob]';
	}
	slice() {
		const size = this.size;

		const start = arguments[0];
		const end = arguments[1];
		let relativeStart, relativeEnd;
		if (start === undefined) {
			relativeStart = 0;
		} else if (start < 0) {
			relativeStart = Math.max(size + start, 0);
		} else {
			relativeStart = Math.min(start, size);
		}
		if (end === undefined) {
			relativeEnd = size;
		} else if (end < 0) {
			relativeEnd = Math.max(size + end, 0);
		} else {
			relativeEnd = Math.min(end, size);
		}
		const span = Math.max(relativeEnd - relativeStart, 0);

		const buffer = this[BUFFER];
		const slicedBuffer = buffer.slice(relativeStart, relativeStart + span);
		const blob = new Blob([], { type: arguments[2] });
		blob[BUFFER] = slicedBuffer;
		return blob;
	}
}

Object.defineProperties(Blob.prototype, {
	size: { enumerable: true },
	type: { enumerable: true },
	slice: { enumerable: true }
});

Object.defineProperty(Blob.prototype, Symbol.toStringTag, {
	value: 'Blob',
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * fetch-error.js
 *
 * FetchError interface for operational errors
 */

/**
 * Create FetchError instance
 *
 * @param   String      message      Error message for human
 * @param   String      type         Error type for machine
 * @param   String      systemError  For Node.js system error
 * @return  FetchError
 */
function FetchError(message, type, systemError) {
  Error.call(this, message);

  this.message = message;
  this.type = type;

  // when err.type is `system`, err.code contains system error code
  if (systemError) {
    this.code = this.errno = systemError.code;
  }

  // hide custom error implementation details from end-users
  Error.captureStackTrace(this, this.constructor);
}

FetchError.prototype = Object.create(Error.prototype);
FetchError.prototype.constructor = FetchError;
FetchError.prototype.name = 'FetchError';

let convert;
try {
	convert = require('encoding').convert;
} catch (e) {}

const INTERNALS = Symbol('Body internals');

// fix an issue where "PassThrough" isn't a named export for node <10
const PassThrough = Stream.PassThrough;

/**
 * Body mixin
 *
 * Ref: https://fetch.spec.whatwg.org/#body
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
function Body(body) {
	var _this = this;

	var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
	    _ref$size = _ref.size;

	let size = _ref$size === undefined ? 0 : _ref$size;
	var _ref$timeout = _ref.timeout;
	let timeout = _ref$timeout === undefined ? 0 : _ref$timeout;

	if (body == null) {
		// body is undefined or null
		body = null;
	} else if (isURLSearchParams(body)) {
		// body is a URLSearchParams
		body = Buffer.from(body.toString());
	} else if (isBlob(body)) ; else if (Buffer.isBuffer(body)) ; else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
		// body is ArrayBuffer
		body = Buffer.from(body);
	} else if (ArrayBuffer.isView(body)) {
		// body is ArrayBufferView
		body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
	} else if (body instanceof Stream) ; else {
		// none of the above
		// coerce to string then buffer
		body = Buffer.from(String(body));
	}
	this[INTERNALS] = {
		body,
		disturbed: false,
		error: null
	};
	this.size = size;
	this.timeout = timeout;

	if (body instanceof Stream) {
		body.on('error', function (err) {
			const error = err.name === 'AbortError' ? err : new FetchError(`Invalid response body while trying to fetch ${_this.url}: ${err.message}`, 'system', err);
			_this[INTERNALS].error = error;
		});
	}
}

Body.prototype = {
	get body() {
		return this[INTERNALS].body;
	},

	get bodyUsed() {
		return this[INTERNALS].disturbed;
	},

	/**
  * Decode response as ArrayBuffer
  *
  * @return  Promise
  */
	arrayBuffer() {
		return consumeBody.call(this).then(function (buf) {
			return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		});
	},

	/**
  * Return raw response as Blob
  *
  * @return Promise
  */
	blob() {
		let ct = this.headers && this.headers.get('content-type') || '';
		return consumeBody.call(this).then(function (buf) {
			return Object.assign(
			// Prevent copying
			new Blob([], {
				type: ct.toLowerCase()
			}), {
				[BUFFER]: buf
			});
		});
	},

	/**
  * Decode response as json
  *
  * @return  Promise
  */
	json() {
		var _this2 = this;

		return consumeBody.call(this).then(function (buffer) {
			try {
				return JSON.parse(buffer.toString());
			} catch (err) {
				return Body.Promise.reject(new FetchError(`invalid json response body at ${_this2.url} reason: ${err.message}`, 'invalid-json'));
			}
		});
	},

	/**
  * Decode response as text
  *
  * @return  Promise
  */
	text() {
		return consumeBody.call(this).then(function (buffer) {
			return buffer.toString();
		});
	},

	/**
  * Decode response as buffer (non-spec api)
  *
  * @return  Promise
  */
	buffer() {
		return consumeBody.call(this);
	},

	/**
  * Decode response as text, while automatically detecting the encoding and
  * trying to decode to UTF-8 (non-spec api)
  *
  * @return  Promise
  */
	textConverted() {
		var _this3 = this;

		return consumeBody.call(this).then(function (buffer) {
			return convertBody(buffer, _this3.headers);
		});
	}
};

// In browsers, all properties are enumerable.
Object.defineProperties(Body.prototype, {
	body: { enumerable: true },
	bodyUsed: { enumerable: true },
	arrayBuffer: { enumerable: true },
	blob: { enumerable: true },
	json: { enumerable: true },
	text: { enumerable: true }
});

Body.mixIn = function (proto) {
	for (const name of Object.getOwnPropertyNames(Body.prototype)) {
		// istanbul ignore else: future proof
		if (!(name in proto)) {
			const desc = Object.getOwnPropertyDescriptor(Body.prototype, name);
			Object.defineProperty(proto, name, desc);
		}
	}
};

/**
 * Consume and convert an entire Body to a Buffer.
 *
 * Ref: https://fetch.spec.whatwg.org/#concept-body-consume-body
 *
 * @return  Promise
 */
function consumeBody() {
	var _this4 = this;

	if (this[INTERNALS].disturbed) {
		return Body.Promise.reject(new TypeError(`body used already for: ${this.url}`));
	}

	this[INTERNALS].disturbed = true;

	if (this[INTERNALS].error) {
		return Body.Promise.reject(this[INTERNALS].error);
	}

	let body = this.body;

	// body is null
	if (body === null) {
		return Body.Promise.resolve(Buffer.alloc(0));
	}

	// body is blob
	if (isBlob(body)) {
		body = body.stream();
	}

	// body is buffer
	if (Buffer.isBuffer(body)) {
		return Body.Promise.resolve(body);
	}

	// istanbul ignore if: should never happen
	if (!(body instanceof Stream)) {
		return Body.Promise.resolve(Buffer.alloc(0));
	}

	// body is stream
	// get ready to actually consume the body
	let accum = [];
	let accumBytes = 0;
	let abort = false;

	return new Body.Promise(function (resolve, reject) {
		let resTimeout;

		// allow timeout on slow response body
		if (_this4.timeout) {
			resTimeout = setTimeout(function () {
				abort = true;
				reject(new FetchError(`Response timeout while trying to fetch ${_this4.url} (over ${_this4.timeout}ms)`, 'body-timeout'));
			}, _this4.timeout);
		}

		// handle stream errors
		body.on('error', function (err) {
			if (err.name === 'AbortError') {
				// if the request was aborted, reject with this Error
				abort = true;
				reject(err);
			} else {
				// other errors, such as incorrect content-encoding
				reject(new FetchError(`Invalid response body while trying to fetch ${_this4.url}: ${err.message}`, 'system', err));
			}
		});

		body.on('data', function (chunk) {
			if (abort || chunk === null) {
				return;
			}

			if (_this4.size && accumBytes + chunk.length > _this4.size) {
				abort = true;
				reject(new FetchError(`content size at ${_this4.url} over limit: ${_this4.size}`, 'max-size'));
				return;
			}

			accumBytes += chunk.length;
			accum.push(chunk);
		});

		body.on('end', function () {
			if (abort) {
				return;
			}

			clearTimeout(resTimeout);

			try {
				resolve(Buffer.concat(accum, accumBytes));
			} catch (err) {
				// handle streams that have accumulated too much data (issue #414)
				reject(new FetchError(`Could not create Buffer from response body for ${_this4.url}: ${err.message}`, 'system', err));
			}
		});
	});
}

/**
 * Detect buffer encoding and convert to target encoding
 * ref: http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
 *
 * @param   Buffer  buffer    Incoming buffer
 * @param   String  encoding  Target encoding
 * @return  String
 */
function convertBody(buffer, headers) {
	if (typeof convert !== 'function') {
		throw new Error('The package `encoding` must be installed to use the textConverted() function');
	}

	const ct = headers.get('content-type');
	let charset = 'utf-8';
	let res, str;

	// header
	if (ct) {
		res = /charset=([^;]*)/i.exec(ct);
	}

	// no charset in content type, peek at response body for at most 1024 bytes
	str = buffer.slice(0, 1024).toString();

	// html5
	if (!res && str) {
		res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str);
	}

	// html4
	if (!res && str) {
		res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(str);

		if (res) {
			res = /charset=(.*)/i.exec(res.pop());
		}
	}

	// xml
	if (!res && str) {
		res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str);
	}

	// found charset
	if (res) {
		charset = res.pop();

		// prevent decode issues when sites use incorrect encoding
		// ref: https://hsivonen.fi/encoding-menu/
		if (charset === 'gb2312' || charset === 'gbk') {
			charset = 'gb18030';
		}
	}

	// turn raw buffers into a single utf-8 buffer
	return convert(buffer, 'UTF-8', charset).toString();
}

/**
 * Detect a URLSearchParams object
 * ref: https://github.com/bitinn/node-fetch/issues/296#issuecomment-307598143
 *
 * @param   Object  obj     Object to detect by type or brand
 * @return  String
 */
function isURLSearchParams(obj) {
	// Duck-typing as a necessary condition.
	if (typeof obj !== 'object' || typeof obj.append !== 'function' || typeof obj.delete !== 'function' || typeof obj.get !== 'function' || typeof obj.getAll !== 'function' || typeof obj.has !== 'function' || typeof obj.set !== 'function') {
		return false;
	}

	// Brand-checking and more duck-typing as optional condition.
	return obj.constructor.name === 'URLSearchParams' || Object.prototype.toString.call(obj) === '[object URLSearchParams]' || typeof obj.sort === 'function';
}

/**
 * Check if `obj` is a W3C `Blob` object (which `File` inherits from)
 * @param  {*} obj
 * @return {boolean}
 */
function isBlob(obj) {
	return typeof obj === 'object' && typeof obj.arrayBuffer === 'function' && typeof obj.type === 'string' && typeof obj.stream === 'function' && typeof obj.constructor === 'function' && typeof obj.constructor.name === 'string' && /^(Blob|File)$/.test(obj.constructor.name) && /^(Blob|File)$/.test(obj[Symbol.toStringTag]);
}

/**
 * Clone body given Res/Req instance
 *
 * @param   Mixed  instance  Response or Request instance
 * @return  Mixed
 */
function clone(instance) {
	let p1, p2;
	let body = instance.body;

	// don't allow cloning a used body
	if (instance.bodyUsed) {
		throw new Error('cannot clone body after it is used');
	}

	// check that body is a stream and not form-data object
	// note: we can't clone the form-data object without having it as a dependency
	if (body instanceof Stream && typeof body.getBoundary !== 'function') {
		// tee instance body
		p1 = new PassThrough();
		p2 = new PassThrough();
		body.pipe(p1);
		body.pipe(p2);
		// set instance body to teed body and return the other teed body
		instance[INTERNALS].body = p1;
		body = p2;
	}

	return body;
}

/**
 * Performs the operation "extract a `Content-Type` value from |object|" as
 * specified in the specification:
 * https://fetch.spec.whatwg.org/#concept-bodyinit-extract
 *
 * This function assumes that instance.body is present.
 *
 * @param   Mixed  instance  Any options.body input
 */
function extractContentType(body) {
	if (body === null) {
		// body is null
		return null;
	} else if (typeof body === 'string') {
		// body is string
		return 'text/plain;charset=UTF-8';
	} else if (isURLSearchParams(body)) {
		// body is a URLSearchParams
		return 'application/x-www-form-urlencoded;charset=UTF-8';
	} else if (isBlob(body)) {
		// body is blob
		return body.type || null;
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		return null;
	} else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
		// body is ArrayBuffer
		return null;
	} else if (ArrayBuffer.isView(body)) {
		// body is ArrayBufferView
		return null;
	} else if (typeof body.getBoundary === 'function') {
		// detect form data input from form-data module
		return `multipart/form-data;boundary=${body.getBoundary()}`;
	} else if (body instanceof Stream) {
		// body is stream
		// can't really do much about this
		return null;
	} else {
		// Body constructor defaults other things to string
		return 'text/plain;charset=UTF-8';
	}
}

/**
 * The Fetch Standard treats this as if "total bytes" is a property on the body.
 * For us, we have to explicitly get it with a function.
 *
 * ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
 *
 * @param   Body    instance   Instance of Body
 * @return  Number?            Number of bytes, or null if not possible
 */
function getTotalBytes(instance) {
	const body = instance.body;


	if (body === null) {
		// body is null
		return 0;
	} else if (isBlob(body)) {
		return body.size;
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		return body.length;
	} else if (body && typeof body.getLengthSync === 'function') {
		// detect form data input from form-data module
		if (body._lengthRetrievers && body._lengthRetrievers.length == 0 || // 1.x
		body.hasKnownLength && body.hasKnownLength()) {
			// 2.x
			return body.getLengthSync();
		}
		return null;
	} else {
		// body is stream
		return null;
	}
}

/**
 * Write a Body to a Node.js WritableStream (e.g. http.Request) object.
 *
 * @param   Body    instance   Instance of Body
 * @return  Void
 */
function writeToStream(dest, instance) {
	const body = instance.body;


	if (body === null) {
		// body is null
		dest.end();
	} else if (isBlob(body)) {
		body.stream().pipe(dest);
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		dest.write(body);
		dest.end();
	} else {
		// body is stream
		body.pipe(dest);
	}
}

// expose Promise
Body.Promise = global.Promise;

/**
 * headers.js
 *
 * Headers class offers convenient helpers
 */

const invalidTokenRegex = /[^\^_`a-zA-Z\-0-9!#$%&'*+.|~]/;
const invalidHeaderCharRegex = /[^\t\x20-\x7e\x80-\xff]/;

function validateName(name) {
	name = `${name}`;
	if (invalidTokenRegex.test(name) || name === '') {
		throw new TypeError(`${name} is not a legal HTTP header name`);
	}
}

function validateValue(value) {
	value = `${value}`;
	if (invalidHeaderCharRegex.test(value)) {
		throw new TypeError(`${value} is not a legal HTTP header value`);
	}
}

/**
 * Find the key in the map object given a header name.
 *
 * Returns undefined if not found.
 *
 * @param   String  name  Header name
 * @return  String|Undefined
 */
function find(map, name) {
	name = name.toLowerCase();
	for (const key in map) {
		if (key.toLowerCase() === name) {
			return key;
		}
	}
	return undefined;
}

const MAP = Symbol('map');
class Headers {
	/**
  * Headers class
  *
  * @param   Object  headers  Response headers
  * @return  Void
  */
	constructor() {
		let init = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

		this[MAP] = Object.create(null);

		if (init instanceof Headers) {
			const rawHeaders = init.raw();
			const headerNames = Object.keys(rawHeaders);

			for (const headerName of headerNames) {
				for (const value of rawHeaders[headerName]) {
					this.append(headerName, value);
				}
			}

			return;
		}

		// We don't worry about converting prop to ByteString here as append()
		// will handle it.
		if (init == null) ; else if (typeof init === 'object') {
			const method = init[Symbol.iterator];
			if (method != null) {
				if (typeof method !== 'function') {
					throw new TypeError('Header pairs must be iterable');
				}

				// sequence<sequence<ByteString>>
				// Note: per spec we have to first exhaust the lists then process them
				const pairs = [];
				for (const pair of init) {
					if (typeof pair !== 'object' || typeof pair[Symbol.iterator] !== 'function') {
						throw new TypeError('Each header pair must be iterable');
					}
					pairs.push(Array.from(pair));
				}

				for (const pair of pairs) {
					if (pair.length !== 2) {
						throw new TypeError('Each header pair must be a name/value tuple');
					}
					this.append(pair[0], pair[1]);
				}
			} else {
				// record<ByteString, ByteString>
				for (const key of Object.keys(init)) {
					const value = init[key];
					this.append(key, value);
				}
			}
		} else {
			throw new TypeError('Provided initializer must be an object');
		}
	}

	/**
  * Return combined header value given name
  *
  * @param   String  name  Header name
  * @return  Mixed
  */
	get(name) {
		name = `${name}`;
		validateName(name);
		const key = find(this[MAP], name);
		if (key === undefined) {
			return null;
		}

		return this[MAP][key].join(', ');
	}

	/**
  * Iterate over all headers
  *
  * @param   Function  callback  Executed for each item with parameters (value, name, thisArg)
  * @param   Boolean   thisArg   `this` context for callback function
  * @return  Void
  */
	forEach(callback) {
		let thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

		let pairs = getHeaders(this);
		let i = 0;
		while (i < pairs.length) {
			var _pairs$i = pairs[i];
			const name = _pairs$i[0],
			      value = _pairs$i[1];

			callback.call(thisArg, value, name, this);
			pairs = getHeaders(this);
			i++;
		}
	}

	/**
  * Overwrite header values given name
  *
  * @param   String  name   Header name
  * @param   String  value  Header value
  * @return  Void
  */
	set(name, value) {
		name = `${name}`;
		value = `${value}`;
		validateName(name);
		validateValue(value);
		const key = find(this[MAP], name);
		this[MAP][key !== undefined ? key : name] = [value];
	}

	/**
  * Append a value onto existing header
  *
  * @param   String  name   Header name
  * @param   String  value  Header value
  * @return  Void
  */
	append(name, value) {
		name = `${name}`;
		value = `${value}`;
		validateName(name);
		validateValue(value);
		const key = find(this[MAP], name);
		if (key !== undefined) {
			this[MAP][key].push(value);
		} else {
			this[MAP][name] = [value];
		}
	}

	/**
  * Check for header name existence
  *
  * @param   String   name  Header name
  * @return  Boolean
  */
	has(name) {
		name = `${name}`;
		validateName(name);
		return find(this[MAP], name) !== undefined;
	}

	/**
  * Delete all header values given name
  *
  * @param   String  name  Header name
  * @return  Void
  */
	delete(name) {
		name = `${name}`;
		validateName(name);
		const key = find(this[MAP], name);
		if (key !== undefined) {
			delete this[MAP][key];
		}
	}

	/**
  * Return raw headers (non-spec api)
  *
  * @return  Object
  */
	raw() {
		return this[MAP];
	}

	/**
  * Get an iterator on keys.
  *
  * @return  Iterator
  */
	keys() {
		return createHeadersIterator(this, 'key');
	}

	/**
  * Get an iterator on values.
  *
  * @return  Iterator
  */
	values() {
		return createHeadersIterator(this, 'value');
	}

	/**
  * Get an iterator on entries.
  *
  * This is the default iterator of the Headers object.
  *
  * @return  Iterator
  */
	[Symbol.iterator]() {
		return createHeadersIterator(this, 'key+value');
	}
}
Headers.prototype.entries = Headers.prototype[Symbol.iterator];

Object.defineProperty(Headers.prototype, Symbol.toStringTag, {
	value: 'Headers',
	writable: false,
	enumerable: false,
	configurable: true
});

Object.defineProperties(Headers.prototype, {
	get: { enumerable: true },
	forEach: { enumerable: true },
	set: { enumerable: true },
	append: { enumerable: true },
	has: { enumerable: true },
	delete: { enumerable: true },
	keys: { enumerable: true },
	values: { enumerable: true },
	entries: { enumerable: true }
});

function getHeaders(headers) {
	let kind = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'key+value';

	const keys = Object.keys(headers[MAP]).sort();
	return keys.map(kind === 'key' ? function (k) {
		return k.toLowerCase();
	} : kind === 'value' ? function (k) {
		return headers[MAP][k].join(', ');
	} : function (k) {
		return [k.toLowerCase(), headers[MAP][k].join(', ')];
	});
}

const INTERNAL = Symbol('internal');

function createHeadersIterator(target, kind) {
	const iterator = Object.create(HeadersIteratorPrototype);
	iterator[INTERNAL] = {
		target,
		kind,
		index: 0
	};
	return iterator;
}

const HeadersIteratorPrototype = Object.setPrototypeOf({
	next() {
		// istanbul ignore if
		if (!this || Object.getPrototypeOf(this) !== HeadersIteratorPrototype) {
			throw new TypeError('Value of `this` is not a HeadersIterator');
		}

		var _INTERNAL = this[INTERNAL];
		const target = _INTERNAL.target,
		      kind = _INTERNAL.kind,
		      index = _INTERNAL.index;

		const values = getHeaders(target, kind);
		const len = values.length;
		if (index >= len) {
			return {
				value: undefined,
				done: true
			};
		}

		this[INTERNAL].index = index + 1;

		return {
			value: values[index],
			done: false
		};
	}
}, Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())));

Object.defineProperty(HeadersIteratorPrototype, Symbol.toStringTag, {
	value: 'HeadersIterator',
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * Export the Headers object in a form that Node.js can consume.
 *
 * @param   Headers  headers
 * @return  Object
 */
function exportNodeCompatibleHeaders(headers) {
	const obj = Object.assign({ __proto__: null }, headers[MAP]);

	// http.request() only supports string as Host header. This hack makes
	// specifying custom Host header possible.
	const hostHeaderKey = find(headers[MAP], 'Host');
	if (hostHeaderKey !== undefined) {
		obj[hostHeaderKey] = obj[hostHeaderKey][0];
	}

	return obj;
}

/**
 * Create a Headers object from an object of headers, ignoring those that do
 * not conform to HTTP grammar productions.
 *
 * @param   Object  obj  Object of headers
 * @return  Headers
 */
function createHeadersLenient(obj) {
	const headers = new Headers();
	for (const name of Object.keys(obj)) {
		if (invalidTokenRegex.test(name)) {
			continue;
		}
		if (Array.isArray(obj[name])) {
			for (const val of obj[name]) {
				if (invalidHeaderCharRegex.test(val)) {
					continue;
				}
				if (headers[MAP][name] === undefined) {
					headers[MAP][name] = [val];
				} else {
					headers[MAP][name].push(val);
				}
			}
		} else if (!invalidHeaderCharRegex.test(obj[name])) {
			headers[MAP][name] = [obj[name]];
		}
	}
	return headers;
}

const INTERNALS$1 = Symbol('Response internals');

// fix an issue where "STATUS_CODES" aren't a named export for node <10
const STATUS_CODES = http.STATUS_CODES;

/**
 * Response class
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
class Response {
	constructor() {
		let body = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
		let opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		Body.call(this, body, opts);

		const status = opts.status || 200;
		const headers = new Headers(opts.headers);

		if (body != null && !headers.has('Content-Type')) {
			const contentType = extractContentType(body);
			if (contentType) {
				headers.append('Content-Type', contentType);
			}
		}

		this[INTERNALS$1] = {
			url: opts.url,
			status,
			statusText: opts.statusText || STATUS_CODES[status],
			headers,
			counter: opts.counter
		};
	}

	get url() {
		return this[INTERNALS$1].url || '';
	}

	get status() {
		return this[INTERNALS$1].status;
	}

	/**
  * Convenience property representing if the request ended normally
  */
	get ok() {
		return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
	}

	get redirected() {
		return this[INTERNALS$1].counter > 0;
	}

	get statusText() {
		return this[INTERNALS$1].statusText;
	}

	get headers() {
		return this[INTERNALS$1].headers;
	}

	/**
  * Clone this response
  *
  * @return  Response
  */
	clone() {
		return new Response(clone(this), {
			url: this.url,
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
			ok: this.ok,
			redirected: this.redirected
		});
	}
}

Body.mixIn(Response.prototype);

Object.defineProperties(Response.prototype, {
	url: { enumerable: true },
	status: { enumerable: true },
	ok: { enumerable: true },
	redirected: { enumerable: true },
	statusText: { enumerable: true },
	headers: { enumerable: true },
	clone: { enumerable: true }
});

Object.defineProperty(Response.prototype, Symbol.toStringTag, {
	value: 'Response',
	writable: false,
	enumerable: false,
	configurable: true
});

const INTERNALS$2 = Symbol('Request internals');

// fix an issue where "format", "parse" aren't a named export for node <10
const parse_url = Url.parse;
const format_url = Url.format;

const streamDestructionSupported = 'destroy' in Stream.Readable.prototype;

/**
 * Check if a value is an instance of Request.
 *
 * @param   Mixed   input
 * @return  Boolean
 */
function isRequest(input) {
	return typeof input === 'object' && typeof input[INTERNALS$2] === 'object';
}

function isAbortSignal(signal) {
	const proto = signal && typeof signal === 'object' && Object.getPrototypeOf(signal);
	return !!(proto && proto.constructor.name === 'AbortSignal');
}

/**
 * Request class
 *
 * @param   Mixed   input  Url or Request instance
 * @param   Object  init   Custom options
 * @return  Void
 */
class Request {
	constructor(input) {
		let init = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		let parsedURL;

		// normalize input
		if (!isRequest(input)) {
			if (input && input.href) {
				// in order to support Node.js' Url objects; though WHATWG's URL objects
				// will fall into this branch also (since their `toString()` will return
				// `href` property anyway)
				parsedURL = parse_url(input.href);
			} else {
				// coerce input to a string before attempting to parse
				parsedURL = parse_url(`${input}`);
			}
			input = {};
		} else {
			parsedURL = parse_url(input.url);
		}

		let method = init.method || input.method || 'GET';
		method = method.toUpperCase();

		if ((init.body != null || isRequest(input) && input.body !== null) && (method === 'GET' || method === 'HEAD')) {
			throw new TypeError('Request with GET/HEAD method cannot have body');
		}

		let inputBody = init.body != null ? init.body : isRequest(input) && input.body !== null ? clone(input) : null;

		Body.call(this, inputBody, {
			timeout: init.timeout || input.timeout || 0,
			size: init.size || input.size || 0
		});

		const headers = new Headers(init.headers || input.headers || {});

		if (inputBody != null && !headers.has('Content-Type')) {
			const contentType = extractContentType(inputBody);
			if (contentType) {
				headers.append('Content-Type', contentType);
			}
		}

		let signal = isRequest(input) ? input.signal : null;
		if ('signal' in init) signal = init.signal;

		if (signal != null && !isAbortSignal(signal)) {
			throw new TypeError('Expected signal to be an instanceof AbortSignal');
		}

		this[INTERNALS$2] = {
			method,
			redirect: init.redirect || input.redirect || 'follow',
			headers,
			parsedURL,
			signal
		};

		// node-fetch-only options
		this.follow = init.follow !== undefined ? init.follow : input.follow !== undefined ? input.follow : 20;
		this.compress = init.compress !== undefined ? init.compress : input.compress !== undefined ? input.compress : true;
		this.counter = init.counter || input.counter || 0;
		this.agent = init.agent || input.agent;
	}

	get method() {
		return this[INTERNALS$2].method;
	}

	get url() {
		return format_url(this[INTERNALS$2].parsedURL);
	}

	get headers() {
		return this[INTERNALS$2].headers;
	}

	get redirect() {
		return this[INTERNALS$2].redirect;
	}

	get signal() {
		return this[INTERNALS$2].signal;
	}

	/**
  * Clone this request
  *
  * @return  Request
  */
	clone() {
		return new Request(this);
	}
}

Body.mixIn(Request.prototype);

Object.defineProperty(Request.prototype, Symbol.toStringTag, {
	value: 'Request',
	writable: false,
	enumerable: false,
	configurable: true
});

Object.defineProperties(Request.prototype, {
	method: { enumerable: true },
	url: { enumerable: true },
	headers: { enumerable: true },
	redirect: { enumerable: true },
	clone: { enumerable: true },
	signal: { enumerable: true }
});

/**
 * Convert a Request to Node.js http request options.
 *
 * @param   Request  A Request instance
 * @return  Object   The options object to be passed to http.request
 */
function getNodeRequestOptions(request) {
	const parsedURL = request[INTERNALS$2].parsedURL;
	const headers = new Headers(request[INTERNALS$2].headers);

	// fetch step 1.3
	if (!headers.has('Accept')) {
		headers.set('Accept', '*/*');
	}

	// Basic fetch
	if (!parsedURL.protocol || !parsedURL.hostname) {
		throw new TypeError('Only absolute URLs are supported');
	}

	if (!/^https?:$/.test(parsedURL.protocol)) {
		throw new TypeError('Only HTTP(S) protocols are supported');
	}

	if (request.signal && request.body instanceof Stream.Readable && !streamDestructionSupported) {
		throw new Error('Cancellation of streamed requests with AbortSignal is not supported in node < 8');
	}

	// HTTP-network-or-cache fetch steps 2.4-2.7
	let contentLengthValue = null;
	if (request.body == null && /^(POST|PUT)$/i.test(request.method)) {
		contentLengthValue = '0';
	}
	if (request.body != null) {
		const totalBytes = getTotalBytes(request);
		if (typeof totalBytes === 'number') {
			contentLengthValue = String(totalBytes);
		}
	}
	if (contentLengthValue) {
		headers.set('Content-Length', contentLengthValue);
	}

	// HTTP-network-or-cache fetch step 2.11
	if (!headers.has('User-Agent')) {
		headers.set('User-Agent', 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)');
	}

	// HTTP-network-or-cache fetch step 2.15
	if (request.compress && !headers.has('Accept-Encoding')) {
		headers.set('Accept-Encoding', 'gzip,deflate');
	}

	let agent = request.agent;
	if (typeof agent === 'function') {
		agent = agent(parsedURL);
	}

	if (!headers.has('Connection') && !agent) {
		headers.set('Connection', 'close');
	}

	// HTTP-network fetch step 4.2
	// chunked encoding is handled by Node.js

	return Object.assign({}, parsedURL, {
		method: request.method,
		headers: exportNodeCompatibleHeaders(headers),
		agent
	});
}

/**
 * abort-error.js
 *
 * AbortError interface for cancelled requests
 */

/**
 * Create AbortError instance
 *
 * @param   String      message      Error message for human
 * @return  AbortError
 */
function AbortError(message) {
  Error.call(this, message);

  this.type = 'aborted';
  this.message = message;

  // hide custom error implementation details from end-users
  Error.captureStackTrace(this, this.constructor);
}

AbortError.prototype = Object.create(Error.prototype);
AbortError.prototype.constructor = AbortError;
AbortError.prototype.name = 'AbortError';

// fix an issue where "PassThrough", "resolve" aren't a named export for node <10
const PassThrough$1 = Stream.PassThrough;
const resolve_url = Url.resolve;

/**
 * Fetch function
 *
 * @param   Mixed    url   Absolute url or Request instance
 * @param   Object   opts  Fetch options
 * @return  Promise
 */
function fetch$1(url, opts) {

	// allow custom promise
	if (!fetch$1.Promise) {
		throw new Error('native promise missing, set fetch.Promise to your favorite alternative');
	}

	Body.Promise = fetch$1.Promise;

	// wrap http.request into fetch
	return new fetch$1.Promise(function (resolve, reject) {
		// build request object
		const request = new Request(url, opts);
		const options = getNodeRequestOptions(request);

		const send = (options.protocol === 'https:' ? https : http).request;
		const signal = request.signal;

		let response = null;

		const abort = function abort() {
			let error = new AbortError('The user aborted a request.');
			reject(error);
			if (request.body && request.body instanceof Stream.Readable) {
				request.body.destroy(error);
			}
			if (!response || !response.body) return;
			response.body.emit('error', error);
		};

		if (signal && signal.aborted) {
			abort();
			return;
		}

		const abortAndFinalize = function abortAndFinalize() {
			abort();
			finalize();
		};

		// send request
		const req = send(options);
		let reqTimeout;

		if (signal) {
			signal.addEventListener('abort', abortAndFinalize);
		}

		function finalize() {
			req.abort();
			if (signal) signal.removeEventListener('abort', abortAndFinalize);
			clearTimeout(reqTimeout);
		}

		if (request.timeout) {
			req.once('socket', function (socket) {
				reqTimeout = setTimeout(function () {
					reject(new FetchError(`network timeout at: ${request.url}`, 'request-timeout'));
					finalize();
				}, request.timeout);
			});
		}

		req.on('error', function (err) {
			reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
			finalize();
		});

		req.on('response', function (res) {
			clearTimeout(reqTimeout);

			const headers = createHeadersLenient(res.headers);

			// HTTP fetch step 5
			if (fetch$1.isRedirect(res.statusCode)) {
				// HTTP fetch step 5.2
				const location = headers.get('Location');

				// HTTP fetch step 5.3
				const locationURL = location === null ? null : resolve_url(request.url, location);

				// HTTP fetch step 5.5
				switch (request.redirect) {
					case 'error':
						reject(new FetchError(`redirect mode is set to error: ${request.url}`, 'no-redirect'));
						finalize();
						return;
					case 'manual':
						// node-fetch-specific step: make manual redirect a bit easier to use by setting the Location header value to the resolved URL.
						if (locationURL !== null) {
							// handle corrupted header
							try {
								headers.set('Location', locationURL);
							} catch (err) {
								// istanbul ignore next: nodejs server prevent invalid response headers, we can't test this through normal request
								reject(err);
							}
						}
						break;
					case 'follow':
						// HTTP-redirect fetch step 2
						if (locationURL === null) {
							break;
						}

						// HTTP-redirect fetch step 5
						if (request.counter >= request.follow) {
							reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 6 (counter increment)
						// Create a new Request object.
						const requestOpts = {
							headers: new Headers(request.headers),
							follow: request.follow,
							counter: request.counter + 1,
							agent: request.agent,
							compress: request.compress,
							method: request.method,
							body: request.body,
							signal: request.signal,
							timeout: request.timeout
						};

						// HTTP-redirect fetch step 9
						if (res.statusCode !== 303 && request.body && getTotalBytes(request) === null) {
							reject(new FetchError('Cannot follow redirect with body being a readable stream', 'unsupported-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 11
						if (res.statusCode === 303 || (res.statusCode === 301 || res.statusCode === 302) && request.method === 'POST') {
							requestOpts.method = 'GET';
							requestOpts.body = undefined;
							requestOpts.headers.delete('content-length');
						}

						// HTTP-redirect fetch step 15
						resolve(fetch$1(new Request(locationURL, requestOpts)));
						finalize();
						return;
				}
			}

			// prepare response
			res.once('end', function () {
				if (signal) signal.removeEventListener('abort', abortAndFinalize);
			});
			let body = res.pipe(new PassThrough$1());

			const response_options = {
				url: request.url,
				status: res.statusCode,
				statusText: res.statusMessage,
				headers: headers,
				size: request.size,
				timeout: request.timeout,
				counter: request.counter
			};

			// HTTP-network fetch step 12.1.1.3
			const codings = headers.get('Content-Encoding');

			// HTTP-network fetch step 12.1.1.4: handle content codings

			// in following scenarios we ignore compression support
			// 1. compression support is disabled
			// 2. HEAD request
			// 3. no Content-Encoding header
			// 4. no content response (204)
			// 5. content not modified response (304)
			if (!request.compress || request.method === 'HEAD' || codings === null || res.statusCode === 204 || res.statusCode === 304) {
				response = new Response(body, response_options);
				resolve(response);
				return;
			}

			// For Node v6+
			// Be less strict when decoding compressed responses, since sometimes
			// servers send slightly invalid responses that are still accepted
			// by common browsers.
			// Always using Z_SYNC_FLUSH is what cURL does.
			const zlibOptions = {
				flush: zlib.Z_SYNC_FLUSH,
				finishFlush: zlib.Z_SYNC_FLUSH
			};

			// for gzip
			if (codings == 'gzip' || codings == 'x-gzip') {
				body = body.pipe(zlib.createGunzip(zlibOptions));
				response = new Response(body, response_options);
				resolve(response);
				return;
			}

			// for deflate
			if (codings == 'deflate' || codings == 'x-deflate') {
				// handle the infamous raw deflate response from old servers
				// a hack for old IIS and Apache servers
				const raw = res.pipe(new PassThrough$1());
				raw.once('data', function (chunk) {
					// see http://stackoverflow.com/questions/37519828
					if ((chunk[0] & 0x0F) === 0x08) {
						body = body.pipe(zlib.createInflate());
					} else {
						body = body.pipe(zlib.createInflateRaw());
					}
					response = new Response(body, response_options);
					resolve(response);
				});
				return;
			}

			// for br
			if (codings == 'br' && typeof zlib.createBrotliDecompress === 'function') {
				body = body.pipe(zlib.createBrotliDecompress());
				response = new Response(body, response_options);
				resolve(response);
				return;
			}

			// otherwise, use response as-is
			response = new Response(body, response_options);
			resolve(response);
		});

		writeToStream(req, request);
	});
}
/**
 * Redirect code matching
 *
 * @param   Number   code  Status code
 * @return  Boolean
 */
fetch$1.isRedirect = function (code) {
	return code === 301 || code === 302 || code === 303 || code === 307 || code === 308;
};

// expose Promise
fetch$1.Promise = global.Promise;

function get_page_handler(
	manifest,
	session_getter
) {
	const get_build_info =  () => JSON.parse(fs.readFileSync(path.join(build_dir, 'build.json'), 'utf-8'))
		;

	const template =  () => read_template(src_dir)
		;

	const has_service_worker = fs.existsSync(path.join(build_dir, 'service-worker.js'));

	const { server_routes, pages } = manifest;
	const error_route = manifest.error;

	function bail(req, res, err) {
		console.error(err);

		const message =  escape_html(err.message) ;

		res.statusCode = 500;
		res.end(`<pre>${message}</pre>`);
	}

	function handle_error(req, res, statusCode, error) {
		handle_page({
			pattern: null,
			parts: [
				{ name: null, component: error_route }
			]
		}, req, res, statusCode, error || new Error('Unknown error in preload function'));
	}

	async function handle_page(page, req, res, status = 200, error = null) {
		const is_service_worker_index = req.path === '/service-worker-index.html';
		const build_info




 = get_build_info();

		res.setHeader('Content-Type', 'text/html');
		res.setHeader('Cache-Control',  'no-cache' );

		// preload main.js and current route
		// TODO detect other stuff we can preload? images, CSS, fonts?
		let preloaded_chunks = Array.isArray(build_info.assets.main) ? build_info.assets.main : [build_info.assets.main];
		if (!error && !is_service_worker_index) {
			page.parts.forEach(part => {
				if (!part) return;

				// using concat because it could be a string or an array. thanks webpack!
				preloaded_chunks = preloaded_chunks.concat(build_info.assets[part.name]);
			});
		}

		if (build_info.bundler === 'rollup') {
			// TODO add dependencies and CSS
			const link = preloaded_chunks
				.filter(file => file && !file.match(/\.map$/))
				.map(file => `<${req.baseUrl}/client/${file}>;rel="modulepreload"`)
				.join(', ');

			res.setHeader('Link', link);
		} else {
			const link = preloaded_chunks
				.filter(file => file && !file.match(/\.map$/))
				.map((file) => {
					const as = /\.css$/.test(file) ? 'style' : 'script';
					return `<${req.baseUrl}/client/${file}>;rel="preload";as="${as}"`;
				})
				.join(', ');

			res.setHeader('Link', link);
		}

		const session = session_getter(req, res);

		let redirect;
		let preload_error;

		const preload_context = {
			redirect: (statusCode, location) => {
				if (redirect && (redirect.statusCode !== statusCode || redirect.location !== location)) {
					throw new Error(`Conflicting redirects`);
				}
				location = location.replace(/^\//g, ''); // leading slash (only)
				redirect = { statusCode, location };
			},
			error: (statusCode, message) => {
				preload_error = { statusCode, message };
			},
			fetch: (url, opts) => {
				const parsed = new Url.URL(url, `http://127.0.0.1:${process.env.PORT}${req.baseUrl ? req.baseUrl + '/' :''}`);

				if (opts) {
					opts = Object.assign({}, opts);

					const include_cookies = (
						opts.credentials === 'include' ||
						opts.credentials === 'same-origin' && parsed.origin === `http://127.0.0.1:${process.env.PORT}`
					);

					if (include_cookies) {
						opts.headers = Object.assign({}, opts.headers);

						const cookies = Object.assign(
							{},
							cookie.parse(req.headers.cookie || ''),
							cookie.parse(opts.headers.cookie || '')
						);

						const set_cookie = res.getHeader('Set-Cookie');
						(Array.isArray(set_cookie) ? set_cookie : [set_cookie]).forEach(str => {
							const match = /([^=]+)=([^;]+)/.exec(str);
							if (match) cookies[match[1]] = match[2];
						});

						const str = Object.keys(cookies)
							.map(key => `${key}=${cookies[key]}`)
							.join('; ');

						opts.headers.cookie = str;
					}
				}

				return fetch$1(parsed.href, opts);
			}
		};

		let preloaded;
		let match;
		let params;

		try {
			const root_preloaded = manifest.root_preload
				? manifest.root_preload.call(preload_context, {
					host: req.headers.host,
					path: req.path,
					query: req.query,
					params: {}
				}, session)
				: {};

			match = error ? null : page.pattern.exec(req.path);


			let toPreload = [root_preloaded];
			if (!is_service_worker_index) {
				toPreload = toPreload.concat(page.parts.map(part => {
					if (!part) return null;

					// the deepest level is used below, to initialise the store
					params = part.params ? part.params(match) : {};

					return part.preload
						? part.preload.call(preload_context, {
							host: req.headers.host,
							path: req.path,
							query: req.query,
							params
						}, session)
						: {};
				}));
			}

			preloaded = await Promise.all(toPreload);
		} catch (err) {
			if (error) {
				return bail(req, res, err)
			}

			preload_error = { statusCode: 500, message: err };
			preloaded = []; // appease TypeScript
		}

		try {
			if (redirect) {
				const location = Url.resolve((req.baseUrl || '') + '/', redirect.location);

				res.statusCode = redirect.statusCode;
				res.setHeader('Location', location);
				res.end();

				return;
			}

			if (preload_error) {
				handle_error(req, res, preload_error.statusCode, preload_error.message);
				return;
			}

			const segments = req.path.split('/').filter(Boolean);

			// TODO make this less confusing
			const layout_segments = [segments[0]];
			let l = 1;

			page.parts.forEach((part, i) => {
				layout_segments[l] = segments[i + 1];
				if (!part) return null;
				l++;
			});

			const props = {
				stores: {
					page: {
						subscribe: writable({
							host: req.headers.host,
							path: req.path,
							query: req.query,
							params
						}).subscribe
					},
					preloading: {
						subscribe: writable(null).subscribe
					},
					session: writable(session)
				},
				segments: layout_segments,
				status: error ? status : 200,
				error: error ? error instanceof Error ? error : { message: error } : null,
				level0: {
					props: preloaded[0]
				},
				level1: {
					segment: segments[0],
					props: {}
				}
			};

			if (!is_service_worker_index) {
				let l = 1;
				for (let i = 0; i < page.parts.length; i += 1) {
					const part = page.parts[i];
					if (!part) continue;

					props[`level${l++}`] = {
						component: part.component,
						props: preloaded[i + 1] || {},
						segment: segments[i]
					};
				}
			}

			const { html, head, css } = App.render(props);

			const serialized = {
				preloaded: `[${preloaded.map(data => try_serialize(data)).join(',')}]`,
				session: session && try_serialize(session, err => {
					throw new Error(`Failed to serialize session data: ${err.message}`);
				}),
				error: error && try_serialize(props.error)
			};

			let script = `__SAPPER__={${[
				error && `error:${serialized.error},status:${status}`,
				`baseUrl:"${req.baseUrl}"`,
				serialized.preloaded && `preloaded:${serialized.preloaded}`,
				serialized.session && `session:${serialized.session}`
			].filter(Boolean).join(',')}};`;

			if (has_service_worker) {
				script += `if('serviceWorker' in navigator)navigator.serviceWorker.register('${req.baseUrl}/service-worker.js');`;
			}

			const file = [].concat(build_info.assets.main).filter(file => file && /\.js$/.test(file))[0];
			const main = `${req.baseUrl}/client/${file}`;

			if (build_info.bundler === 'rollup') {
				if (build_info.legacy_assets) {
					const legacy_main = `${req.baseUrl}/client/legacy/${build_info.legacy_assets.main}`;
					script += `(function(){try{eval("async function x(){}");var main="${main}"}catch(e){main="${legacy_main}"};var s=document.createElement("script");try{new Function("if(0)import('')")();s.src=main;s.type="module";s.crossOrigin="use-credentials";}catch(e){s.src="${req.baseUrl}/client/shimport@${build_info.shimport}.js";s.setAttribute("data-main",main);}document.head.appendChild(s);}());`;
				} else {
					script += `var s=document.createElement("script");try{new Function("if(0)import('')")();s.src="${main}";s.type="module";s.crossOrigin="use-credentials";}catch(e){s.src="${req.baseUrl}/client/shimport@${build_info.shimport}.js";s.setAttribute("data-main","${main}")}document.head.appendChild(s)`;
				}
			} else {
				script += `</script><script src="${main}">`;
			}

			let styles;

			// TODO make this consistent across apps
			// TODO embed build_info in placeholder.ts
			if (build_info.css && build_info.css.main) {
				const css_chunks = new Set();
				if (build_info.css.main) css_chunks.add(build_info.css.main);
				page.parts.forEach(part => {
					if (!part) return;
					const css_chunks_for_part = build_info.css.chunks[part.file];

					if (css_chunks_for_part) {
						css_chunks_for_part.forEach(file => {
							css_chunks.add(file);
						});
					}
				});

				styles = Array.from(css_chunks)
					.map(href => `<link rel="stylesheet" href="client/${href}">`)
					.join('');
			} else {
				styles = (css && css.code ? `<style>${css.code}</style>` : '');
			}

			// users can set a CSP nonce using res.locals.nonce
			const nonce_attr = (res.locals && res.locals.nonce) ? ` nonce="${res.locals.nonce}"` : '';

			const body = template()
				.replace('%sapper.base%', () => `<base href="${req.baseUrl}/">`)
				.replace('%sapper.scripts%', () => `<script${nonce_attr}>${script}</script>`)
				.replace('%sapper.html%', () => html)
				.replace('%sapper.head%', () => `<noscript id='sapper-head-start'></noscript>${head}<noscript id='sapper-head-end'></noscript>`)
				.replace('%sapper.styles%', () => styles);

			res.statusCode = status;
			res.end(body);
		} catch(err) {
			if (error) {
				bail(req, res, err);
			} else {
				handle_error(req, res, 500, err);
			}
		}
	}

	return function find_route(req, res, next) {
		if (req.path === '/service-worker-index.html') {
			const homePage = pages.find(page => page.pattern.test('/'));
			handle_page(homePage, req, res);
			return;
		}

		for (const page of pages) {
			if (page.pattern.test(req.path)) {
				handle_page(page, req, res);
				return;
			}
		}

		handle_error(req, res, 404, 'Not found');
	};
}

function read_template(dir = build_dir) {
	return fs.readFileSync(`${dir}/template.html`, 'utf-8');
}

function try_serialize(data, fail) {
	try {
		return devalue(data);
	} catch (err) {
		if (fail) fail(err);
		return null;
	}
}

function escape_html(html) {
	const chars = {
		'"' : 'quot',
		"'": '#39',
		'&': 'amp',
		'<' : 'lt',
		'>' : 'gt'
	};

	return html.replace(/["'&<>]/g, c => `&${chars[c]};`);
}

function middleware(opts


 = {}) {
	const { session, ignore } = opts;

	let emitted_basepath = false;

	return compose_handlers(ignore, [
		(req, res, next) => {
			if (req.baseUrl === undefined) {
				let { originalUrl } = req;
				if (req.url === '/' && originalUrl[originalUrl.length - 1] !== '/') {
					originalUrl += '/';
				}

				req.baseUrl = originalUrl
					? originalUrl.slice(0, -req.url.length)
					: '';
			}

			if (!emitted_basepath && process.send) {
				process.send({
					__sapper__: true,
					event: 'basepath',
					basepath: req.baseUrl
				});

				emitted_basepath = true;
			}

			if (req.path === undefined) {
				req.path = req.url.replace(/\?.*/, '');
			}

			next();
		},

		fs.existsSync(path.join(build_dir, 'service-worker.js')) && serve({
			pathname: '/service-worker.js',
			cache_control: 'no-cache, no-store, must-revalidate'
		}),

		fs.existsSync(path.join(build_dir, 'service-worker.js.map')) && serve({
			pathname: '/service-worker.js.map',
			cache_control: 'no-cache, no-store, must-revalidate'
		}),

		serve({
			prefix: '/client/',
			cache_control:  'no-cache' 
		}),

		get_server_route_handler(manifest.server_routes),

		get_page_handler(manifest, session || noop$1)
	].filter(Boolean));
}

function compose_handlers(ignore, handlers) {
	const total = handlers.length;

	function nth_handler(n, req, res, next) {
		if (n >= total) {
			return next();
		}

		handlers[n](req, res, () => nth_handler(n+1, req, res, next));
	}

	return !ignore
		? (req, res, next) => nth_handler(0, req, res, next)
		: (req, res, next) => {
			if (should_ignore(req.path, ignore)) {
				next();
			} else {
				nth_handler(0, req, res, next);
			}
		};
}

function should_ignore(uri, val) {
	if (Array.isArray(val)) return val.some(x => should_ignore(uri, x));
	if (val instanceof RegExp) return val.test(uri);
	if (typeof val === 'function') return val(uri);
	return uri.startsWith(val.charCodeAt(0) === 47 ? val : `/${val}`);
}

function serve({ prefix, pathname, cache_control }



) {
	const filter = pathname
		? (req) => req.path === pathname
		: (req) => req.path.startsWith(prefix);

	const read =  (file) => fs.readFileSync(path.join(build_dir, file))
		;

	return (req, res, next) => {
		if (filter(req)) {
			const type = lite.getType(req.path);

			try {
				const file = path.posix.normalize(decodeURIComponent(req.path));
				const data = read(file);

				res.setHeader('Content-Type', type);
				res.setHeader('Cache-Control', cache_control);
				res.end(data);
			} catch (err) {
				res.statusCode = 404;
				res.end('not found');
			}
		} else {
			next();
		}
	};
}

function noop$1(){}

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === 'development';

polka() // You can also use Express
	.use(
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		middleware()
	)
	.listen(PORT, err => {
		if (err) console.log('error', err);
	});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9ub2RlX21vZHVsZXMvc3ZlbHRlL2ludGVybmFsL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3RvcmUvaW5kZXgubWpzIiwiLi4vLi4vLi4vc3JjL19oZWxwZXJzL3N0b3JlLmpzIiwiLi4vLi4vLi4vc3JjL19oZWxwZXJzL2dldC1hdXRob3JzLmpzIiwiLi4vLi4vLi4vc3JjL2NvbXBvbmVudHMvQXV0aG9yLnN2ZWx0ZSIsIi4uLy4uLy4uL3NyYy9jb21wb25lbnRzL1Bvc3Quc3ZlbHRlIiwiLi4vLi4vLi4vc3JjL3JvdXRlcy9pbmRleC5zdmVsdGUiLCIuLi8uLi8uLi9zcmMvcm91dGVzL2ludGVydmlld3Muc3ZlbHRlIiwiLi4vLi4vLi4vc3JjL3JvdXRlcy90ZWNobm9sb2d5LnN2ZWx0ZSIsIi4uLy4uLy4uL3NyYy9yb3V0ZXMvdHJhdmVsb2d1ZS5zdmVsdGUiLCIuLi8uLi8uLi9zcmMvcm91dGVzL2xlYXJuaW5ncy5zdmVsdGUiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9jb3JlLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2hpZ2hsaWdodC5qcy9saWIvbGFuZ3VhZ2VzL2phdmFzY3JpcHQuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvYmFzaC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9oaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9zcWwuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvc2Nzcy5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9oaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9qc29uLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2hpZ2hsaWdodC5qcy9saWIvbGFuZ3VhZ2VzL2Nzcy5qcyIsIi4uLy4uLy4uL3NyYy9yb3V0ZXMvYmxvZy9bc2x1Z10uc3ZlbHRlIiwiLi4vLi4vLi4vc3JjL2NvbXBvbmVudHMvTmF2LnN2ZWx0ZSIsIi4uLy4uLy4uL3NyYy9jb21wb25lbnRzL0hlYWRlci5zdmVsdGUiLCIuLi8uLi8uLi9zcmMvY29tcG9uZW50cy9Gb290ZXIuc3ZlbHRlIiwiLi4vLi4vLi4vc3JjL3JvdXRlcy9fbGF5b3V0LnN2ZWx0ZSIsIi4uLy4uLy4uL3NyYy9yb3V0ZXMvX2Vycm9yLnN2ZWx0ZSIsIi4uLy4uLy4uL3NyYy9ub2RlX21vZHVsZXMvQHNhcHBlci9pbnRlcm5hbC9tYW5pZmVzdC1zZXJ2ZXIubWpzIiwiLi4vLi4vLi4vc3JjL25vZGVfbW9kdWxlcy9Ac2FwcGVyL2ludGVybmFsL3NoYXJlZC5tanMiLCIuLi8uLi8uLi9zcmMvbm9kZV9tb2R1bGVzL0BzYXBwZXIvaW50ZXJuYWwvQXBwLnN2ZWx0ZSIsIi4uLy4uLy4uL3NyYy9ub2RlX21vZHVsZXMvQHNhcHBlci9zZXJ2ZXIubWpzIiwiLi4vLi4vLi4vc3JjL3NlcnZlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBub29wKCkgeyB9XG5jb25zdCBpZGVudGl0eSA9IHggPT4geDtcbmZ1bmN0aW9uIGFzc2lnbih0YXIsIHNyYykge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBmb3IgKGNvbnN0IGsgaW4gc3JjKVxuICAgICAgICB0YXJba10gPSBzcmNba107XG4gICAgcmV0dXJuIHRhcjtcbn1cbmZ1bmN0aW9uIGlzX3Byb21pc2UodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cbmZ1bmN0aW9uIGFkZF9sb2NhdGlvbihlbGVtZW50LCBmaWxlLCBsaW5lLCBjb2x1bW4sIGNoYXIpIHtcbiAgICBlbGVtZW50Ll9fc3ZlbHRlX21ldGEgPSB7XG4gICAgICAgIGxvYzogeyBmaWxlLCBsaW5lLCBjb2x1bW4sIGNoYXIgfVxuICAgIH07XG59XG5mdW5jdGlvbiBydW4oZm4pIHtcbiAgICByZXR1cm4gZm4oKTtcbn1cbmZ1bmN0aW9uIGJsYW5rX29iamVjdCgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZShudWxsKTtcbn1cbmZ1bmN0aW9uIHJ1bl9hbGwoZm5zKSB7XG4gICAgZm5zLmZvckVhY2gocnVuKTtcbn1cbmZ1bmN0aW9uIGlzX2Z1bmN0aW9uKHRoaW5nKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmZ1bmN0aW9uIHNhZmVfbm90X2VxdWFsKGEsIGIpIHtcbiAgICByZXR1cm4gYSAhPSBhID8gYiA9PSBiIDogYSAhPT0gYiB8fCAoKGEgJiYgdHlwZW9mIGEgPT09ICdvYmplY3QnKSB8fCB0eXBlb2YgYSA9PT0gJ2Z1bmN0aW9uJyk7XG59XG5mdW5jdGlvbiBub3RfZXF1YWwoYSwgYikge1xuICAgIHJldHVybiBhICE9IGEgPyBiID09IGIgOiBhICE9PSBiO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVfc3RvcmUoc3RvcmUsIG5hbWUpIHtcbiAgICBpZiAoc3RvcmUgIT0gbnVsbCAmJiB0eXBlb2Ygc3RvcmUuc3Vic2NyaWJlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJyR7bmFtZX0nIGlzIG5vdCBhIHN0b3JlIHdpdGggYSAnc3Vic2NyaWJlJyBtZXRob2RgKTtcbiAgICB9XG59XG5mdW5jdGlvbiBzdWJzY3JpYmUoc3RvcmUsIC4uLmNhbGxiYWNrcykge1xuICAgIGlmIChzdG9yZSA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBub29wO1xuICAgIH1cbiAgICBjb25zdCB1bnN1YiA9IHN0b3JlLnN1YnNjcmliZSguLi5jYWxsYmFja3MpO1xuICAgIHJldHVybiB1bnN1Yi51bnN1YnNjcmliZSA/ICgpID0+IHVuc3ViLnVuc3Vic2NyaWJlKCkgOiB1bnN1Yjtcbn1cbmZ1bmN0aW9uIGdldF9zdG9yZV92YWx1ZShzdG9yZSkge1xuICAgIGxldCB2YWx1ZTtcbiAgICBzdWJzY3JpYmUoc3RvcmUsIF8gPT4gdmFsdWUgPSBfKSgpO1xuICAgIHJldHVybiB2YWx1ZTtcbn1cbmZ1bmN0aW9uIGNvbXBvbmVudF9zdWJzY3JpYmUoY29tcG9uZW50LCBzdG9yZSwgY2FsbGJhY2spIHtcbiAgICBjb21wb25lbnQuJCQub25fZGVzdHJveS5wdXNoKHN1YnNjcmliZShzdG9yZSwgY2FsbGJhY2spKTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZV9zbG90KGRlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgZm4pIHtcbiAgICBpZiAoZGVmaW5pdGlvbikge1xuICAgICAgICBjb25zdCBzbG90X2N0eCA9IGdldF9zbG90X2NvbnRleHQoZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBmbik7XG4gICAgICAgIHJldHVybiBkZWZpbml0aW9uWzBdKHNsb3RfY3R4KTtcbiAgICB9XG59XG5mdW5jdGlvbiBnZXRfc2xvdF9jb250ZXh0KGRlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgZm4pIHtcbiAgICByZXR1cm4gZGVmaW5pdGlvblsxXSAmJiBmblxuICAgICAgICA/IGFzc2lnbigkJHNjb3BlLmN0eC5zbGljZSgpLCBkZWZpbml0aW9uWzFdKGZuKGN0eCkpKVxuICAgICAgICA6ICQkc2NvcGUuY3R4O1xufVxuZnVuY3Rpb24gZ2V0X3Nsb3RfY2hhbmdlcyhkZWZpbml0aW9uLCAkJHNjb3BlLCBkaXJ0eSwgZm4pIHtcbiAgICBpZiAoZGVmaW5pdGlvblsyXSAmJiBmbikge1xuICAgICAgICBjb25zdCBsZXRzID0gZGVmaW5pdGlvblsyXShmbihkaXJ0eSkpO1xuICAgICAgICBpZiAoJCRzY29wZS5kaXJ0eSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbGV0cztcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGxldHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zdCBtZXJnZWQgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IE1hdGgubWF4KCQkc2NvcGUuZGlydHkubGVuZ3RoLCBsZXRzLmxlbmd0aCk7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgbWVyZ2VkW2ldID0gJCRzY29wZS5kaXJ0eVtpXSB8IGxldHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWVyZ2VkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkJHNjb3BlLmRpcnR5IHwgbGV0cztcbiAgICB9XG4gICAgcmV0dXJuICQkc2NvcGUuZGlydHk7XG59XG5mdW5jdGlvbiBleGNsdWRlX2ludGVybmFsX3Byb3BzKHByb3BzKSB7XG4gICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgZm9yIChjb25zdCBrIGluIHByb3BzKVxuICAgICAgICBpZiAoa1swXSAhPT0gJyQnKVxuICAgICAgICAgICAgcmVzdWx0W2tdID0gcHJvcHNba107XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmZ1bmN0aW9uIGNvbXB1dGVfcmVzdF9wcm9wcyhwcm9wcywga2V5cykge1xuICAgIGNvbnN0IHJlc3QgPSB7fTtcbiAgICBrZXlzID0gbmV3IFNldChrZXlzKTtcbiAgICBmb3IgKGNvbnN0IGsgaW4gcHJvcHMpXG4gICAgICAgIGlmICgha2V5cy5oYXMoaykgJiYga1swXSAhPT0gJyQnKVxuICAgICAgICAgICAgcmVzdFtrXSA9IHByb3BzW2tdO1xuICAgIHJldHVybiByZXN0O1xufVxuZnVuY3Rpb24gb25jZShmbikge1xuICAgIGxldCByYW4gPSBmYWxzZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgaWYgKHJhbilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgICAgZm4uY2FsbCh0aGlzLCAuLi5hcmdzKTtcbiAgICB9O1xufVxuZnVuY3Rpb24gbnVsbF90b19lbXB0eSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZTtcbn1cbmZ1bmN0aW9uIHNldF9zdG9yZV92YWx1ZShzdG9yZSwgcmV0LCB2YWx1ZSA9IHJldCkge1xuICAgIHN0b3JlLnNldCh2YWx1ZSk7XG4gICAgcmV0dXJuIHJldDtcbn1cbmNvbnN0IGhhc19wcm9wID0gKG9iaiwgcHJvcCkgPT4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG5mdW5jdGlvbiBhY3Rpb25fZGVzdHJveWVyKGFjdGlvbl9yZXN1bHQpIHtcbiAgICByZXR1cm4gYWN0aW9uX3Jlc3VsdCAmJiBpc19mdW5jdGlvbihhY3Rpb25fcmVzdWx0LmRlc3Ryb3kpID8gYWN0aW9uX3Jlc3VsdC5kZXN0cm95IDogbm9vcDtcbn1cblxuY29uc3QgaXNfY2xpZW50ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCc7XG5sZXQgbm93ID0gaXNfY2xpZW50XG4gICAgPyAoKSA9PiB3aW5kb3cucGVyZm9ybWFuY2Uubm93KClcbiAgICA6ICgpID0+IERhdGUubm93KCk7XG5sZXQgcmFmID0gaXNfY2xpZW50ID8gY2IgPT4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNiKSA6IG5vb3A7XG4vLyB1c2VkIGludGVybmFsbHkgZm9yIHRlc3RpbmdcbmZ1bmN0aW9uIHNldF9ub3coZm4pIHtcbiAgICBub3cgPSBmbjtcbn1cbmZ1bmN0aW9uIHNldF9yYWYoZm4pIHtcbiAgICByYWYgPSBmbjtcbn1cblxuY29uc3QgdGFza3MgPSBuZXcgU2V0KCk7XG5mdW5jdGlvbiBydW5fdGFza3Mobm93KSB7XG4gICAgdGFza3MuZm9yRWFjaCh0YXNrID0+IHtcbiAgICAgICAgaWYgKCF0YXNrLmMobm93KSkge1xuICAgICAgICAgICAgdGFza3MuZGVsZXRlKHRhc2spO1xuICAgICAgICAgICAgdGFzay5mKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodGFza3Muc2l6ZSAhPT0gMClcbiAgICAgICAgcmFmKHJ1bl90YXNrcyk7XG59XG4vKipcbiAqIEZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkhXG4gKi9cbmZ1bmN0aW9uIGNsZWFyX2xvb3BzKCkge1xuICAgIHRhc2tzLmNsZWFyKCk7XG59XG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgdGFzayB0aGF0IHJ1bnMgb24gZWFjaCByYWYgZnJhbWVcbiAqIHVudGlsIGl0IHJldHVybnMgYSBmYWxzeSB2YWx1ZSBvciBpcyBhYm9ydGVkXG4gKi9cbmZ1bmN0aW9uIGxvb3AoY2FsbGJhY2spIHtcbiAgICBsZXQgdGFzaztcbiAgICBpZiAodGFza3Muc2l6ZSA9PT0gMClcbiAgICAgICAgcmFmKHJ1bl90YXNrcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcHJvbWlzZTogbmV3IFByb21pc2UoZnVsZmlsbCA9PiB7XG4gICAgICAgICAgICB0YXNrcy5hZGQodGFzayA9IHsgYzogY2FsbGJhY2ssIGY6IGZ1bGZpbGwgfSk7XG4gICAgICAgIH0pLFxuICAgICAgICBhYm9ydCgpIHtcbiAgICAgICAgICAgIHRhc2tzLmRlbGV0ZSh0YXNrKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGFwcGVuZCh0YXJnZXQsIG5vZGUpIHtcbiAgICB0YXJnZXQuYXBwZW5kQ2hpbGQobm9kZSk7XG59XG5mdW5jdGlvbiBpbnNlcnQodGFyZ2V0LCBub2RlLCBhbmNob3IpIHtcbiAgICB0YXJnZXQuaW5zZXJ0QmVmb3JlKG5vZGUsIGFuY2hvciB8fCBudWxsKTtcbn1cbmZ1bmN0aW9uIGRldGFjaChub2RlKSB7XG4gICAgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xufVxuZnVuY3Rpb24gZGVzdHJveV9lYWNoKGl0ZXJhdGlvbnMsIGRldGFjaGluZykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlcmF0aW9ucy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBpZiAoaXRlcmF0aW9uc1tpXSlcbiAgICAgICAgICAgIGl0ZXJhdGlvbnNbaV0uZChkZXRhY2hpbmcpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGVsZW1lbnQobmFtZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5hbWUpO1xufVxuZnVuY3Rpb24gZWxlbWVudF9pcyhuYW1lLCBpcykge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5hbWUsIHsgaXMgfSk7XG59XG5mdW5jdGlvbiBvYmplY3Rfd2l0aG91dF9wcm9wZXJ0aWVzKG9iaiwgZXhjbHVkZSkge1xuICAgIGNvbnN0IHRhcmdldCA9IHt9O1xuICAgIGZvciAoY29uc3QgayBpbiBvYmopIHtcbiAgICAgICAgaWYgKGhhc19wcm9wKG9iaiwgaylcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICYmIGV4Y2x1ZGUuaW5kZXhPZihrKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIHRhcmdldFtrXSA9IG9ialtrXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuZnVuY3Rpb24gc3ZnX2VsZW1lbnQobmFtZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgbmFtZSk7XG59XG5mdW5jdGlvbiB0ZXh0KGRhdGEpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YSk7XG59XG5mdW5jdGlvbiBzcGFjZSgpIHtcbiAgICByZXR1cm4gdGV4dCgnICcpO1xufVxuZnVuY3Rpb24gZW1wdHkoKSB7XG4gICAgcmV0dXJuIHRleHQoJycpO1xufVxuZnVuY3Rpb24gbGlzdGVuKG5vZGUsIGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICByZXR1cm4gKCkgPT4gbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zKTtcbn1cbmZ1bmN0aW9uIHByZXZlbnRfZGVmYXVsdChmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICByZXR1cm4gZm4uY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIHN0b3BfcHJvcGFnYXRpb24oZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHJldHVybiBmbi5jYWxsKHRoaXMsIGV2ZW50KTtcbiAgICB9O1xufVxuZnVuY3Rpb24gc2VsZihmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0ID09PSB0aGlzKVxuICAgICAgICAgICAgZm4uY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIGF0dHIobm9kZSwgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKVxuICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICAgIGVsc2UgaWYgKG5vZGUuZ2V0QXR0cmlidXRlKGF0dHJpYnV0ZSkgIT09IHZhbHVlKVxuICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIHNldF9hdHRyaWJ1dGVzKG5vZGUsIGF0dHJpYnV0ZXMpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgY29uc3QgZGVzY3JpcHRvcnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhub2RlLl9fcHJvdG9fXyk7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgICAgICBpZiAoYXR0cmlidXRlc1trZXldID09IG51bGwpIHtcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoa2V5ID09PSAnc3R5bGUnKSB7XG4gICAgICAgICAgICBub2RlLnN0eWxlLmNzc1RleHQgPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoa2V5ID09PSAnX192YWx1ZScgfHwgZGVzY3JpcHRvcnNba2V5XSAmJiBkZXNjcmlwdG9yc1trZXldLnNldCkge1xuICAgICAgICAgICAgbm9kZVtrZXldID0gYXR0cmlidXRlc1trZXldO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXR0cihub2RlLCBrZXksIGF0dHJpYnV0ZXNba2V5XSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBzZXRfc3ZnX2F0dHJpYnV0ZXMobm9kZSwgYXR0cmlidXRlcykge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgYXR0cihub2RlLCBrZXksIGF0dHJpYnV0ZXNba2V5XSk7XG4gICAgfVxufVxuZnVuY3Rpb24gc2V0X2N1c3RvbV9lbGVtZW50X2RhdGEobm9kZSwgcHJvcCwgdmFsdWUpIHtcbiAgICBpZiAocHJvcCBpbiBub2RlKSB7XG4gICAgICAgIG5vZGVbcHJvcF0gPSB2YWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGF0dHIobm9kZSwgcHJvcCwgdmFsdWUpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHhsaW5rX2F0dHIobm9kZSwgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgIG5vZGUuc2V0QXR0cmlidXRlTlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCBhdHRyaWJ1dGUsIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIGdldF9iaW5kaW5nX2dyb3VwX3ZhbHVlKGdyb3VwKSB7XG4gICAgY29uc3QgdmFsdWUgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGdyb3VwLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGlmIChncm91cFtpXS5jaGVja2VkKVxuICAgICAgICAgICAgdmFsdWUucHVzaChncm91cFtpXS5fX3ZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuZnVuY3Rpb24gdG9fbnVtYmVyKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSAnJyA/IHVuZGVmaW5lZCA6ICt2YWx1ZTtcbn1cbmZ1bmN0aW9uIHRpbWVfcmFuZ2VzX3RvX2FycmF5KHJhbmdlcykge1xuICAgIGNvbnN0IGFycmF5ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByYW5nZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgYXJyYXkucHVzaCh7IHN0YXJ0OiByYW5nZXMuc3RhcnQoaSksIGVuZDogcmFuZ2VzLmVuZChpKSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5O1xufVxuZnVuY3Rpb24gY2hpbGRyZW4oZWxlbWVudCkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKGVsZW1lbnQuY2hpbGROb2Rlcyk7XG59XG5mdW5jdGlvbiBjbGFpbV9lbGVtZW50KG5vZGVzLCBuYW1lLCBhdHRyaWJ1dGVzLCBzdmcpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgaWYgKG5vZGUubm9kZU5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGxldCBqID0gMDtcbiAgICAgICAgICAgIHdoaWxlIChqIDwgbm9kZS5hdHRyaWJ1dGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZSA9IG5vZGUuYXR0cmlidXRlc1tqXTtcbiAgICAgICAgICAgICAgICBpZiAoYXR0cmlidXRlc1thdHRyaWJ1dGUubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlLm5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBub2Rlcy5zcGxpY2UoaSwgMSlbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN2ZyA/IHN2Z19lbGVtZW50KG5hbWUpIDogZWxlbWVudChuYW1lKTtcbn1cbmZ1bmN0aW9uIGNsYWltX3RleHQobm9kZXMsIGRhdGEpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgIG5vZGUuZGF0YSA9ICcnICsgZGF0YTtcbiAgICAgICAgICAgIHJldHVybiBub2Rlcy5zcGxpY2UoaSwgMSlbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRleHQoZGF0YSk7XG59XG5mdW5jdGlvbiBjbGFpbV9zcGFjZShub2Rlcykge1xuICAgIHJldHVybiBjbGFpbV90ZXh0KG5vZGVzLCAnICcpO1xufVxuZnVuY3Rpb24gc2V0X2RhdGEodGV4dCwgZGF0YSkge1xuICAgIGRhdGEgPSAnJyArIGRhdGE7XG4gICAgaWYgKHRleHQuZGF0YSAhPT0gZGF0YSlcbiAgICAgICAgdGV4dC5kYXRhID0gZGF0YTtcbn1cbmZ1bmN0aW9uIHNldF9pbnB1dF92YWx1ZShpbnB1dCwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgIT0gbnVsbCB8fCBpbnB1dC52YWx1ZSkge1xuICAgICAgICBpbnB1dC52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHNldF9pbnB1dF90eXBlKGlucHV0LCB0eXBlKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaW5wdXQudHlwZSA9IHR5cGU7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICB9XG59XG5mdW5jdGlvbiBzZXRfc3R5bGUobm9kZSwga2V5LCB2YWx1ZSwgaW1wb3J0YW50KSB7XG4gICAgbm9kZS5zdHlsZS5zZXRQcm9wZXJ0eShrZXksIHZhbHVlLCBpbXBvcnRhbnQgPyAnaW1wb3J0YW50JyA6ICcnKTtcbn1cbmZ1bmN0aW9uIHNlbGVjdF9vcHRpb24oc2VsZWN0LCB2YWx1ZSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0Lm9wdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uID0gc2VsZWN0Lm9wdGlvbnNbaV07XG4gICAgICAgIGlmIChvcHRpb24uX192YWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIG9wdGlvbi5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBzZWxlY3Rfb3B0aW9ucyhzZWxlY3QsIHZhbHVlKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWxlY3Qub3B0aW9ucy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBjb25zdCBvcHRpb24gPSBzZWxlY3Qub3B0aW9uc1tpXTtcbiAgICAgICAgb3B0aW9uLnNlbGVjdGVkID0gfnZhbHVlLmluZGV4T2Yob3B0aW9uLl9fdmFsdWUpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHNlbGVjdF92YWx1ZShzZWxlY3QpIHtcbiAgICBjb25zdCBzZWxlY3RlZF9vcHRpb24gPSBzZWxlY3QucXVlcnlTZWxlY3RvcignOmNoZWNrZWQnKSB8fCBzZWxlY3Qub3B0aW9uc1swXTtcbiAgICByZXR1cm4gc2VsZWN0ZWRfb3B0aW9uICYmIHNlbGVjdGVkX29wdGlvbi5fX3ZhbHVlO1xufVxuZnVuY3Rpb24gc2VsZWN0X211bHRpcGxlX3ZhbHVlKHNlbGVjdCkge1xuICAgIHJldHVybiBbXS5tYXAuY2FsbChzZWxlY3QucXVlcnlTZWxlY3RvckFsbCgnOmNoZWNrZWQnKSwgb3B0aW9uID0+IG9wdGlvbi5fX3ZhbHVlKTtcbn1cbi8vIHVuZm9ydHVuYXRlbHkgdGhpcyBjYW4ndCBiZSBhIGNvbnN0YW50IGFzIHRoYXQgd291bGRuJ3QgYmUgdHJlZS1zaGFrZWFibGVcbi8vIHNvIHdlIGNhY2hlIHRoZSByZXN1bHQgaW5zdGVhZFxubGV0IGNyb3Nzb3JpZ2luO1xuZnVuY3Rpb24gaXNfY3Jvc3NvcmlnaW4oKSB7XG4gICAgaWYgKGNyb3Nzb3JpZ2luID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY3Jvc3NvcmlnaW4gPSBmYWxzZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucGFyZW50KSB7XG4gICAgICAgICAgICAgICAgdm9pZCB3aW5kb3cucGFyZW50LmRvY3VtZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY3Jvc3NvcmlnaW4gPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjcm9zc29yaWdpbjtcbn1cbmZ1bmN0aW9uIGFkZF9yZXNpemVfbGlzdGVuZXIobm9kZSwgZm4pIHtcbiAgICBjb25zdCBjb21wdXRlZF9zdHlsZSA9IGdldENvbXB1dGVkU3R5bGUobm9kZSk7XG4gICAgY29uc3Qgel9pbmRleCA9IChwYXJzZUludChjb21wdXRlZF9zdHlsZS56SW5kZXgpIHx8IDApIC0gMTtcbiAgICBpZiAoY29tcHV0ZWRfc3R5bGUucG9zaXRpb24gPT09ICdzdGF0aWMnKSB7XG4gICAgICAgIG5vZGUuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgIH1cbiAgICBjb25zdCBpZnJhbWUgPSBlbGVtZW50KCdpZnJhbWUnKTtcbiAgICBpZnJhbWUuc2V0QXR0cmlidXRlKCdzdHlsZScsIGBkaXNwbGF5OiBibG9jazsgcG9zaXRpb246IGFic29sdXRlOyB0b3A6IDA7IGxlZnQ6IDA7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7IGAgK1xuICAgICAgICBgb3ZlcmZsb3c6IGhpZGRlbjsgYm9yZGVyOiAwOyBvcGFjaXR5OiAwOyBwb2ludGVyLWV2ZW50czogbm9uZTsgei1pbmRleDogJHt6X2luZGV4fTtgKTtcbiAgICBpZnJhbWUuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgaWZyYW1lLnRhYkluZGV4ID0gLTE7XG4gICAgbGV0IHVuc3Vic2NyaWJlO1xuICAgIGlmIChpc19jcm9zc29yaWdpbigpKSB7XG4gICAgICAgIGlmcmFtZS5zcmMgPSBgZGF0YTp0ZXh0L2h0bWwsPHNjcmlwdD5vbnJlc2l6ZT1mdW5jdGlvbigpe3BhcmVudC5wb3N0TWVzc2FnZSgwLCcqJyl9PC9zY3JpcHQ+YDtcbiAgICAgICAgdW5zdWJzY3JpYmUgPSBsaXN0ZW4od2luZG93LCAnbWVzc2FnZScsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PT0gaWZyYW1lLmNvbnRlbnRXaW5kb3cpXG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZnJhbWUuc3JjID0gJ2Fib3V0OmJsYW5rJztcbiAgICAgICAgaWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlID0gbGlzdGVuKGlmcmFtZS5jb250ZW50V2luZG93LCAncmVzaXplJywgZm4pO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBhcHBlbmQobm9kZSwgaWZyYW1lKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBkZXRhY2goaWZyYW1lKTtcbiAgICAgICAgaWYgKHVuc3Vic2NyaWJlKVxuICAgICAgICAgICAgdW5zdWJzY3JpYmUoKTtcbiAgICB9O1xufVxuZnVuY3Rpb24gdG9nZ2xlX2NsYXNzKGVsZW1lbnQsIG5hbWUsIHRvZ2dsZSkge1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0W3RvZ2dsZSA/ICdhZGQnIDogJ3JlbW92ZSddKG5hbWUpO1xufVxuZnVuY3Rpb24gY3VzdG9tX2V2ZW50KHR5cGUsIGRldGFpbCkge1xuICAgIGNvbnN0IGUgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnQ3VzdG9tRXZlbnQnKTtcbiAgICBlLmluaXRDdXN0b21FdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UsIGRldGFpbCk7XG4gICAgcmV0dXJuIGU7XG59XG5mdW5jdGlvbiBxdWVyeV9zZWxlY3Rvcl9hbGwoc2VsZWN0b3IsIHBhcmVudCA9IGRvY3VtZW50LmJvZHkpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShwYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xufVxuY2xhc3MgSHRtbFRhZyB7XG4gICAgY29uc3RydWN0b3IoaHRtbCwgYW5jaG9yID0gbnVsbCkge1xuICAgICAgICB0aGlzLmUgPSBlbGVtZW50KCdkaXYnKTtcbiAgICAgICAgdGhpcy5hID0gYW5jaG9yO1xuICAgICAgICB0aGlzLnUoaHRtbCk7XG4gICAgfVxuICAgIG0odGFyZ2V0LCBhbmNob3IgPSBudWxsKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpbnNlcnQodGFyZ2V0LCB0aGlzLm5baV0sIGFuY2hvcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50ID0gdGFyZ2V0O1xuICAgIH1cbiAgICB1KGh0bWwpIHtcbiAgICAgICAgdGhpcy5lLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIHRoaXMubiA9IEFycmF5LmZyb20odGhpcy5lLmNoaWxkTm9kZXMpO1xuICAgIH1cbiAgICBwKGh0bWwpIHtcbiAgICAgICAgdGhpcy5kKCk7XG4gICAgICAgIHRoaXMudShodG1sKTtcbiAgICAgICAgdGhpcy5tKHRoaXMudCwgdGhpcy5hKTtcbiAgICB9XG4gICAgZCgpIHtcbiAgICAgICAgdGhpcy5uLmZvckVhY2goZGV0YWNoKTtcbiAgICB9XG59XG5cbmNvbnN0IGFjdGl2ZV9kb2NzID0gbmV3IFNldCgpO1xubGV0IGFjdGl2ZSA9IDA7XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZGFya3NreWFwcC9zdHJpbmctaGFzaC9ibG9iL21hc3Rlci9pbmRleC5qc1xuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgbGV0IGkgPSBzdHIubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pXG4gICAgICAgIGhhc2ggPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSBeIHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgIHJldHVybiBoYXNoID4+PiAwO1xufVxuZnVuY3Rpb24gY3JlYXRlX3J1bGUobm9kZSwgYSwgYiwgZHVyYXRpb24sIGRlbGF5LCBlYXNlLCBmbiwgdWlkID0gMCkge1xuICAgIGNvbnN0IHN0ZXAgPSAxNi42NjYgLyBkdXJhdGlvbjtcbiAgICBsZXQga2V5ZnJhbWVzID0gJ3tcXG4nO1xuICAgIGZvciAobGV0IHAgPSAwOyBwIDw9IDE7IHAgKz0gc3RlcCkge1xuICAgICAgICBjb25zdCB0ID0gYSArIChiIC0gYSkgKiBlYXNlKHApO1xuICAgICAgICBrZXlmcmFtZXMgKz0gcCAqIDEwMCArIGAleyR7Zm4odCwgMSAtIHQpfX1cXG5gO1xuICAgIH1cbiAgICBjb25zdCBydWxlID0ga2V5ZnJhbWVzICsgYDEwMCUgeyR7Zm4oYiwgMSAtIGIpfX1cXG59YDtcbiAgICBjb25zdCBuYW1lID0gYF9fc3ZlbHRlXyR7aGFzaChydWxlKX1fJHt1aWR9YDtcbiAgICBjb25zdCBkb2MgPSBub2RlLm93bmVyRG9jdW1lbnQ7XG4gICAgYWN0aXZlX2RvY3MuYWRkKGRvYyk7XG4gICAgY29uc3Qgc3R5bGVzaGVldCA9IGRvYy5fX3N2ZWx0ZV9zdHlsZXNoZWV0IHx8IChkb2MuX19zdmVsdGVfc3R5bGVzaGVldCA9IGRvYy5oZWFkLmFwcGVuZENoaWxkKGVsZW1lbnQoJ3N0eWxlJykpLnNoZWV0KTtcbiAgICBjb25zdCBjdXJyZW50X3J1bGVzID0gZG9jLl9fc3ZlbHRlX3J1bGVzIHx8IChkb2MuX19zdmVsdGVfcnVsZXMgPSB7fSk7XG4gICAgaWYgKCFjdXJyZW50X3J1bGVzW25hbWVdKSB7XG4gICAgICAgIGN1cnJlbnRfcnVsZXNbbmFtZV0gPSB0cnVlO1xuICAgICAgICBzdHlsZXNoZWV0Lmluc2VydFJ1bGUoYEBrZXlmcmFtZXMgJHtuYW1lfSAke3J1bGV9YCwgc3R5bGVzaGVldC5jc3NSdWxlcy5sZW5ndGgpO1xuICAgIH1cbiAgICBjb25zdCBhbmltYXRpb24gPSBub2RlLnN0eWxlLmFuaW1hdGlvbiB8fCAnJztcbiAgICBub2RlLnN0eWxlLmFuaW1hdGlvbiA9IGAke2FuaW1hdGlvbiA/IGAke2FuaW1hdGlvbn0sIGAgOiBgYH0ke25hbWV9ICR7ZHVyYXRpb259bXMgbGluZWFyICR7ZGVsYXl9bXMgMSBib3RoYDtcbiAgICBhY3RpdmUgKz0gMTtcbiAgICByZXR1cm4gbmFtZTtcbn1cbmZ1bmN0aW9uIGRlbGV0ZV9ydWxlKG5vZGUsIG5hbWUpIHtcbiAgICBjb25zdCBwcmV2aW91cyA9IChub2RlLnN0eWxlLmFuaW1hdGlvbiB8fCAnJykuc3BsaXQoJywgJyk7XG4gICAgY29uc3QgbmV4dCA9IHByZXZpb3VzLmZpbHRlcihuYW1lXG4gICAgICAgID8gYW5pbSA9PiBhbmltLmluZGV4T2YobmFtZSkgPCAwIC8vIHJlbW92ZSBzcGVjaWZpYyBhbmltYXRpb25cbiAgICAgICAgOiBhbmltID0+IGFuaW0uaW5kZXhPZignX19zdmVsdGUnKSA9PT0gLTEgLy8gcmVtb3ZlIGFsbCBTdmVsdGUgYW5pbWF0aW9uc1xuICAgICk7XG4gICAgY29uc3QgZGVsZXRlZCA9IHByZXZpb3VzLmxlbmd0aCAtIG5leHQubGVuZ3RoO1xuICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuYW5pbWF0aW9uID0gbmV4dC5qb2luKCcsICcpO1xuICAgICAgICBhY3RpdmUgLT0gZGVsZXRlZDtcbiAgICAgICAgaWYgKCFhY3RpdmUpXG4gICAgICAgICAgICBjbGVhcl9ydWxlcygpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNsZWFyX3J1bGVzKCkge1xuICAgIHJhZigoKSA9PiB7XG4gICAgICAgIGlmIChhY3RpdmUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGFjdGl2ZV9kb2NzLmZvckVhY2goZG9jID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlc2hlZXQgPSBkb2MuX19zdmVsdGVfc3R5bGVzaGVldDtcbiAgICAgICAgICAgIGxldCBpID0gc3R5bGVzaGVldC5jc3NSdWxlcy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoaS0tKVxuICAgICAgICAgICAgICAgIHN0eWxlc2hlZXQuZGVsZXRlUnVsZShpKTtcbiAgICAgICAgICAgIGRvYy5fX3N2ZWx0ZV9ydWxlcyA9IHt9O1xuICAgICAgICB9KTtcbiAgICAgICAgYWN0aXZlX2RvY3MuY2xlYXIoKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2FuaW1hdGlvbihub2RlLCBmcm9tLCBmbiwgcGFyYW1zKSB7XG4gICAgaWYgKCFmcm9tKVxuICAgICAgICByZXR1cm4gbm9vcDtcbiAgICBjb25zdCB0byA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKGZyb20ubGVmdCA9PT0gdG8ubGVmdCAmJiBmcm9tLnJpZ2h0ID09PSB0by5yaWdodCAmJiBmcm9tLnRvcCA9PT0gdG8udG9wICYmIGZyb20uYm90dG9tID09PSB0by5ib3R0b20pXG4gICAgICAgIHJldHVybiBub29wO1xuICAgIGNvbnN0IHsgZGVsYXkgPSAwLCBkdXJhdGlvbiA9IDMwMCwgZWFzaW5nID0gaWRlbnRpdHksIFxuICAgIC8vIEB0cy1pZ25vcmUgdG9kbzogc2hvdWxkIHRoaXMgYmUgc2VwYXJhdGVkIGZyb20gZGVzdHJ1Y3R1cmluZz8gT3Igc3RhcnQvZW5kIGFkZGVkIHRvIHB1YmxpYyBhcGkgYW5kIGRvY3VtZW50YXRpb24/XG4gICAgc3RhcnQ6IHN0YXJ0X3RpbWUgPSBub3coKSArIGRlbGF5LCBcbiAgICAvLyBAdHMtaWdub3JlIHRvZG86XG4gICAgZW5kID0gc3RhcnRfdGltZSArIGR1cmF0aW9uLCB0aWNrID0gbm9vcCwgY3NzIH0gPSBmbihub2RlLCB7IGZyb20sIHRvIH0sIHBhcmFtcyk7XG4gICAgbGV0IHJ1bm5pbmcgPSB0cnVlO1xuICAgIGxldCBzdGFydGVkID0gZmFsc2U7XG4gICAgbGV0IG5hbWU7XG4gICAgZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgIG5hbWUgPSBjcmVhdGVfcnVsZShub2RlLCAwLCAxLCBkdXJhdGlvbiwgZGVsYXksIGVhc2luZywgY3NzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRlbGF5KSB7XG4gICAgICAgICAgICBzdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBzdG9wKCkge1xuICAgICAgICBpZiAoY3NzKVxuICAgICAgICAgICAgZGVsZXRlX3J1bGUobm9kZSwgbmFtZSk7XG4gICAgICAgIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgbG9vcChub3cgPT4ge1xuICAgICAgICBpZiAoIXN0YXJ0ZWQgJiYgbm93ID49IHN0YXJ0X3RpbWUpIHtcbiAgICAgICAgICAgIHN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGFydGVkICYmIG5vdyA+PSBlbmQpIHtcbiAgICAgICAgICAgIHRpY2soMSwgMCk7XG4gICAgICAgICAgICBzdG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFydW5uaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXJ0ZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHAgPSBub3cgLSBzdGFydF90aW1lO1xuICAgICAgICAgICAgY29uc3QgdCA9IDAgKyAxICogZWFzaW5nKHAgLyBkdXJhdGlvbik7XG4gICAgICAgICAgICB0aWNrKHQsIDEgLSB0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBzdGFydCgpO1xuICAgIHRpY2soMCwgMSk7XG4gICAgcmV0dXJuIHN0b3A7XG59XG5mdW5jdGlvbiBmaXhfcG9zaXRpb24obm9kZSkge1xuICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShub2RlKTtcbiAgICBpZiAoc3R5bGUucG9zaXRpb24gIT09ICdhYnNvbHV0ZScgJiYgc3R5bGUucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBzdHlsZTtcbiAgICAgICAgY29uc3QgYSA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIG5vZGUuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICBub2RlLnN0eWxlLndpZHRoID0gd2lkdGg7XG4gICAgICAgIG5vZGUuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICBhZGRfdHJhbnNmb3JtKG5vZGUsIGEpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGFkZF90cmFuc2Zvcm0obm9kZSwgYSkge1xuICAgIGNvbnN0IGIgPSBub2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmIChhLmxlZnQgIT09IGIubGVmdCB8fCBhLnRvcCAhPT0gYi50b3ApIHtcbiAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKG5vZGUpO1xuICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBzdHlsZS50cmFuc2Zvcm0gPT09ICdub25lJyA/ICcnIDogc3R5bGUudHJhbnNmb3JtO1xuICAgICAgICBub2RlLnN0eWxlLnRyYW5zZm9ybSA9IGAke3RyYW5zZm9ybX0gdHJhbnNsYXRlKCR7YS5sZWZ0IC0gYi5sZWZ0fXB4LCAke2EudG9wIC0gYi50b3B9cHgpYDtcbiAgICB9XG59XG5cbmxldCBjdXJyZW50X2NvbXBvbmVudDtcbmZ1bmN0aW9uIHNldF9jdXJyZW50X2NvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICBjdXJyZW50X2NvbXBvbmVudCA9IGNvbXBvbmVudDtcbn1cbmZ1bmN0aW9uIGdldF9jdXJyZW50X2NvbXBvbmVudCgpIHtcbiAgICBpZiAoIWN1cnJlbnRfY29tcG9uZW50KVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZ1bmN0aW9uIGNhbGxlZCBvdXRzaWRlIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbmApO1xuICAgIHJldHVybiBjdXJyZW50X2NvbXBvbmVudDtcbn1cbmZ1bmN0aW9uIGJlZm9yZVVwZGF0ZShmbikge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmJlZm9yZV91cGRhdGUucHVzaChmbik7XG59XG5mdW5jdGlvbiBvbk1vdW50KGZuKSB7XG4gICAgZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQub25fbW91bnQucHVzaChmbik7XG59XG5mdW5jdGlvbiBhZnRlclVwZGF0ZShmbikge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmFmdGVyX3VwZGF0ZS5wdXNoKGZuKTtcbn1cbmZ1bmN0aW9uIG9uRGVzdHJveShmbikge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLm9uX2Rlc3Ryb3kucHVzaChmbik7XG59XG5mdW5jdGlvbiBjcmVhdGVFdmVudERpc3BhdGNoZXIoKSB7XG4gICAgY29uc3QgY29tcG9uZW50ID0gZ2V0X2N1cnJlbnRfY29tcG9uZW50KCk7XG4gICAgcmV0dXJuICh0eXBlLCBkZXRhaWwpID0+IHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gY29tcG9uZW50LiQkLmNhbGxiYWNrc1t0eXBlXTtcbiAgICAgICAgaWYgKGNhbGxiYWNrcykge1xuICAgICAgICAgICAgLy8gVE9ETyBhcmUgdGhlcmUgc2l0dWF0aW9ucyB3aGVyZSBldmVudHMgY291bGQgYmUgZGlzcGF0Y2hlZFxuICAgICAgICAgICAgLy8gaW4gYSBzZXJ2ZXIgKG5vbi1ET00pIGVudmlyb25tZW50P1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBjdXN0b21fZXZlbnQodHlwZSwgZGV0YWlsKTtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5zbGljZSgpLmZvckVhY2goZm4gPT4ge1xuICAgICAgICAgICAgICAgIGZuLmNhbGwoY29tcG9uZW50LCBldmVudCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5mdW5jdGlvbiBzZXRDb250ZXh0KGtleSwgY29udGV4dCkge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmNvbnRleHQuc2V0KGtleSwgY29udGV4dCk7XG59XG5mdW5jdGlvbiBnZXRDb250ZXh0KGtleSkge1xuICAgIHJldHVybiBnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5jb250ZXh0LmdldChrZXkpO1xufVxuLy8gVE9ETyBmaWd1cmUgb3V0IGlmIHdlIHN0aWxsIHdhbnQgdG8gc3VwcG9ydFxuLy8gc2hvcnRoYW5kIGV2ZW50cywgb3IgaWYgd2Ugd2FudCB0byBpbXBsZW1lbnRcbi8vIGEgcmVhbCBidWJibGluZyBtZWNoYW5pc21cbmZ1bmN0aW9uIGJ1YmJsZShjb21wb25lbnQsIGV2ZW50KSB7XG4gICAgY29uc3QgY2FsbGJhY2tzID0gY29tcG9uZW50LiQkLmNhbGxiYWNrc1tldmVudC50eXBlXTtcbiAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICAgIGNhbGxiYWNrcy5zbGljZSgpLmZvckVhY2goZm4gPT4gZm4oZXZlbnQpKTtcbiAgICB9XG59XG5cbmNvbnN0IGRpcnR5X2NvbXBvbmVudHMgPSBbXTtcbmNvbnN0IGludHJvcyA9IHsgZW5hYmxlZDogZmFsc2UgfTtcbmNvbnN0IGJpbmRpbmdfY2FsbGJhY2tzID0gW107XG5jb25zdCByZW5kZXJfY2FsbGJhY2tzID0gW107XG5jb25zdCBmbHVzaF9jYWxsYmFja3MgPSBbXTtcbmNvbnN0IHJlc29sdmVkX3Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbmxldCB1cGRhdGVfc2NoZWR1bGVkID0gZmFsc2U7XG5mdW5jdGlvbiBzY2hlZHVsZV91cGRhdGUoKSB7XG4gICAgaWYgKCF1cGRhdGVfc2NoZWR1bGVkKSB7XG4gICAgICAgIHVwZGF0ZV9zY2hlZHVsZWQgPSB0cnVlO1xuICAgICAgICByZXNvbHZlZF9wcm9taXNlLnRoZW4oZmx1c2gpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHRpY2soKSB7XG4gICAgc2NoZWR1bGVfdXBkYXRlKCk7XG4gICAgcmV0dXJuIHJlc29sdmVkX3Byb21pc2U7XG59XG5mdW5jdGlvbiBhZGRfcmVuZGVyX2NhbGxiYWNrKGZuKSB7XG4gICAgcmVuZGVyX2NhbGxiYWNrcy5wdXNoKGZuKTtcbn1cbmZ1bmN0aW9uIGFkZF9mbHVzaF9jYWxsYmFjayhmbikge1xuICAgIGZsdXNoX2NhbGxiYWNrcy5wdXNoKGZuKTtcbn1cbmxldCBmbHVzaGluZyA9IGZhbHNlO1xuY29uc3Qgc2Vlbl9jYWxsYmFja3MgPSBuZXcgU2V0KCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgICBpZiAoZmx1c2hpbmcpXG4gICAgICAgIHJldHVybjtcbiAgICBmbHVzaGluZyA9IHRydWU7XG4gICAgZG8ge1xuICAgICAgICAvLyBmaXJzdCwgY2FsbCBiZWZvcmVVcGRhdGUgZnVuY3Rpb25zXG4gICAgICAgIC8vIGFuZCB1cGRhdGUgY29tcG9uZW50c1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpcnR5X2NvbXBvbmVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IGRpcnR5X2NvbXBvbmVudHNbaV07XG4gICAgICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQoY29tcG9uZW50KTtcbiAgICAgICAgICAgIHVwZGF0ZShjb21wb25lbnQuJCQpO1xuICAgICAgICB9XG4gICAgICAgIGRpcnR5X2NvbXBvbmVudHMubGVuZ3RoID0gMDtcbiAgICAgICAgd2hpbGUgKGJpbmRpbmdfY2FsbGJhY2tzLmxlbmd0aClcbiAgICAgICAgICAgIGJpbmRpbmdfY2FsbGJhY2tzLnBvcCgpKCk7XG4gICAgICAgIC8vIHRoZW4sIG9uY2UgY29tcG9uZW50cyBhcmUgdXBkYXRlZCwgY2FsbFxuICAgICAgICAvLyBhZnRlclVwZGF0ZSBmdW5jdGlvbnMuIFRoaXMgbWF5IGNhdXNlXG4gICAgICAgIC8vIHN1YnNlcXVlbnQgdXBkYXRlcy4uLlxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcl9jYWxsYmFja3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrID0gcmVuZGVyX2NhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgIGlmICghc2Vlbl9jYWxsYmFja3MuaGFzKGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgICAgIC8vIC4uLnNvIGd1YXJkIGFnYWluc3QgaW5maW5pdGUgbG9vcHNcbiAgICAgICAgICAgICAgICBzZWVuX2NhbGxiYWNrcy5hZGQoY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVuZGVyX2NhbGxiYWNrcy5sZW5ndGggPSAwO1xuICAgIH0gd2hpbGUgKGRpcnR5X2NvbXBvbmVudHMubGVuZ3RoKTtcbiAgICB3aGlsZSAoZmx1c2hfY2FsbGJhY2tzLmxlbmd0aCkge1xuICAgICAgICBmbHVzaF9jYWxsYmFja3MucG9wKCkoKTtcbiAgICB9XG4gICAgdXBkYXRlX3NjaGVkdWxlZCA9IGZhbHNlO1xuICAgIGZsdXNoaW5nID0gZmFsc2U7XG4gICAgc2Vlbl9jYWxsYmFja3MuY2xlYXIoKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZSgkJCkge1xuICAgIGlmICgkJC5mcmFnbWVudCAhPT0gbnVsbCkge1xuICAgICAgICAkJC51cGRhdGUoKTtcbiAgICAgICAgcnVuX2FsbCgkJC5iZWZvcmVfdXBkYXRlKTtcbiAgICAgICAgY29uc3QgZGlydHkgPSAkJC5kaXJ0eTtcbiAgICAgICAgJCQuZGlydHkgPSBbLTFdO1xuICAgICAgICAkJC5mcmFnbWVudCAmJiAkJC5mcmFnbWVudC5wKCQkLmN0eCwgZGlydHkpO1xuICAgICAgICAkJC5hZnRlcl91cGRhdGUuZm9yRWFjaChhZGRfcmVuZGVyX2NhbGxiYWNrKTtcbiAgICB9XG59XG5cbmxldCBwcm9taXNlO1xuZnVuY3Rpb24gd2FpdCgpIHtcbiAgICBpZiAoIXByb21pc2UpIHtcbiAgICAgICAgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICBwcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgcHJvbWlzZSA9IG51bGw7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cbmZ1bmN0aW9uIGRpc3BhdGNoKG5vZGUsIGRpcmVjdGlvbiwga2luZCkge1xuICAgIG5vZGUuZGlzcGF0Y2hFdmVudChjdXN0b21fZXZlbnQoYCR7ZGlyZWN0aW9uID8gJ2ludHJvJyA6ICdvdXRybyd9JHtraW5kfWApKTtcbn1cbmNvbnN0IG91dHJvaW5nID0gbmV3IFNldCgpO1xubGV0IG91dHJvcztcbmZ1bmN0aW9uIGdyb3VwX291dHJvcygpIHtcbiAgICBvdXRyb3MgPSB7XG4gICAgICAgIHI6IDAsXG4gICAgICAgIGM6IFtdLFxuICAgICAgICBwOiBvdXRyb3MgLy8gcGFyZW50IGdyb3VwXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGNoZWNrX291dHJvcygpIHtcbiAgICBpZiAoIW91dHJvcy5yKSB7XG4gICAgICAgIHJ1bl9hbGwob3V0cm9zLmMpO1xuICAgIH1cbiAgICBvdXRyb3MgPSBvdXRyb3MucDtcbn1cbmZ1bmN0aW9uIHRyYW5zaXRpb25faW4oYmxvY2ssIGxvY2FsKSB7XG4gICAgaWYgKGJsb2NrICYmIGJsb2NrLmkpIHtcbiAgICAgICAgb3V0cm9pbmcuZGVsZXRlKGJsb2NrKTtcbiAgICAgICAgYmxvY2suaShsb2NhbCk7XG4gICAgfVxufVxuZnVuY3Rpb24gdHJhbnNpdGlvbl9vdXQoYmxvY2ssIGxvY2FsLCBkZXRhY2gsIGNhbGxiYWNrKSB7XG4gICAgaWYgKGJsb2NrICYmIGJsb2NrLm8pIHtcbiAgICAgICAgaWYgKG91dHJvaW5nLmhhcyhibG9jaykpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIG91dHJvaW5nLmFkZChibG9jayk7XG4gICAgICAgIG91dHJvcy5jLnB1c2goKCkgPT4ge1xuICAgICAgICAgICAgb3V0cm9pbmcuZGVsZXRlKGJsb2NrKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmIChkZXRhY2gpXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrLmQoMSk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJsb2NrLm8obG9jYWwpO1xuICAgIH1cbn1cbmNvbnN0IG51bGxfdHJhbnNpdGlvbiA9IHsgZHVyYXRpb246IDAgfTtcbmZ1bmN0aW9uIGNyZWF0ZV9pbl90cmFuc2l0aW9uKG5vZGUsIGZuLCBwYXJhbXMpIHtcbiAgICBsZXQgY29uZmlnID0gZm4obm9kZSwgcGFyYW1zKTtcbiAgICBsZXQgcnVubmluZyA9IGZhbHNlO1xuICAgIGxldCBhbmltYXRpb25fbmFtZTtcbiAgICBsZXQgdGFzaztcbiAgICBsZXQgdWlkID0gMDtcbiAgICBmdW5jdGlvbiBjbGVhbnVwKCkge1xuICAgICAgICBpZiAoYW5pbWF0aW9uX25hbWUpXG4gICAgICAgICAgICBkZWxldGVfcnVsZShub2RlLCBhbmltYXRpb25fbmFtZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdvKCkge1xuICAgICAgICBjb25zdCB7IGRlbGF5ID0gMCwgZHVyYXRpb24gPSAzMDAsIGVhc2luZyA9IGlkZW50aXR5LCB0aWNrID0gbm9vcCwgY3NzIH0gPSBjb25maWcgfHwgbnVsbF90cmFuc2l0aW9uO1xuICAgICAgICBpZiAoY3NzKVxuICAgICAgICAgICAgYW5pbWF0aW9uX25hbWUgPSBjcmVhdGVfcnVsZShub2RlLCAwLCAxLCBkdXJhdGlvbiwgZGVsYXksIGVhc2luZywgY3NzLCB1aWQrKyk7XG4gICAgICAgIHRpY2soMCwgMSk7XG4gICAgICAgIGNvbnN0IHN0YXJ0X3RpbWUgPSBub3coKSArIGRlbGF5O1xuICAgICAgICBjb25zdCBlbmRfdGltZSA9IHN0YXJ0X3RpbWUgKyBkdXJhdGlvbjtcbiAgICAgICAgaWYgKHRhc2spXG4gICAgICAgICAgICB0YXNrLmFib3J0KCk7XG4gICAgICAgIHJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICBhZGRfcmVuZGVyX2NhbGxiYWNrKCgpID0+IGRpc3BhdGNoKG5vZGUsIHRydWUsICdzdGFydCcpKTtcbiAgICAgICAgdGFzayA9IGxvb3Aobm93ID0+IHtcbiAgICAgICAgICAgIGlmIChydW5uaW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vdyA+PSBlbmRfdGltZSkge1xuICAgICAgICAgICAgICAgICAgICB0aWNrKDEsIDApO1xuICAgICAgICAgICAgICAgICAgICBkaXNwYXRjaChub2RlLCB0cnVlLCAnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5vdyA+PSBzdGFydF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBlYXNpbmcoKG5vdyAtIHN0YXJ0X3RpbWUpIC8gZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB0aWNrKHQsIDEgLSB0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcnVubmluZztcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGxldCBzdGFydGVkID0gZmFsc2U7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3RhcnQoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBkZWxldGVfcnVsZShub2RlKTtcbiAgICAgICAgICAgIGlmIChpc19mdW5jdGlvbihjb25maWcpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnID0gY29uZmlnKCk7XG4gICAgICAgICAgICAgICAgd2FpdCgpLnRoZW4oZ28pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZ28oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgaW52YWxpZGF0ZSgpIHtcbiAgICAgICAgICAgIHN0YXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZW5kKCkge1xuICAgICAgICAgICAgaWYgKHJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgICAgICAgcnVubmluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZV9vdXRfdHJhbnNpdGlvbihub2RlLCBmbiwgcGFyYW1zKSB7XG4gICAgbGV0IGNvbmZpZyA9IGZuKG5vZGUsIHBhcmFtcyk7XG4gICAgbGV0IHJ1bm5pbmcgPSB0cnVlO1xuICAgIGxldCBhbmltYXRpb25fbmFtZTtcbiAgICBjb25zdCBncm91cCA9IG91dHJvcztcbiAgICBncm91cC5yICs9IDE7XG4gICAgZnVuY3Rpb24gZ28oKSB7XG4gICAgICAgIGNvbnN0IHsgZGVsYXkgPSAwLCBkdXJhdGlvbiA9IDMwMCwgZWFzaW5nID0gaWRlbnRpdHksIHRpY2sgPSBub29wLCBjc3MgfSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG4gICAgICAgIGlmIChjc3MpXG4gICAgICAgICAgICBhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIDEsIDAsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MpO1xuICAgICAgICBjb25zdCBzdGFydF90aW1lID0gbm93KCkgKyBkZWxheTtcbiAgICAgICAgY29uc3QgZW5kX3RpbWUgPSBzdGFydF90aW1lICsgZHVyYXRpb247XG4gICAgICAgIGFkZF9yZW5kZXJfY2FsbGJhY2soKCkgPT4gZGlzcGF0Y2gobm9kZSwgZmFsc2UsICdzdGFydCcpKTtcbiAgICAgICAgbG9vcChub3cgPT4ge1xuICAgICAgICAgICAgaWYgKHJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAobm93ID49IGVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpY2soMCwgMSk7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKG5vZGUsIGZhbHNlLCAnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghLS1ncm91cC5yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIHdpbGwgcmVzdWx0IGluIGBlbmQoKWAgYmVpbmcgY2FsbGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc28gd2UgZG9uJ3QgbmVlZCB0byBjbGVhbiB1cCBoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5fYWxsKGdyb3VwLmMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5vdyA+PSBzdGFydF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBlYXNpbmcoKG5vdyAtIHN0YXJ0X3RpbWUpIC8gZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB0aWNrKDEgLSB0LCB0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcnVubmluZztcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChpc19mdW5jdGlvbihjb25maWcpKSB7XG4gICAgICAgIHdhaXQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZygpO1xuICAgICAgICAgICAgZ28oKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBnbygpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBlbmQocmVzZXQpIHtcbiAgICAgICAgICAgIGlmIChyZXNldCAmJiBjb25maWcudGljaykge1xuICAgICAgICAgICAgICAgIGNvbmZpZy50aWNrKDEsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5pbWF0aW9uX25hbWUpXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZV9ydWxlKG5vZGUsIGFuaW1hdGlvbl9uYW1lKTtcbiAgICAgICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuZnVuY3Rpb24gY3JlYXRlX2JpZGlyZWN0aW9uYWxfdHJhbnNpdGlvbihub2RlLCBmbiwgcGFyYW1zLCBpbnRybykge1xuICAgIGxldCBjb25maWcgPSBmbihub2RlLCBwYXJhbXMpO1xuICAgIGxldCB0ID0gaW50cm8gPyAwIDogMTtcbiAgICBsZXQgcnVubmluZ19wcm9ncmFtID0gbnVsbDtcbiAgICBsZXQgcGVuZGluZ19wcm9ncmFtID0gbnVsbDtcbiAgICBsZXQgYW5pbWF0aW9uX25hbWUgPSBudWxsO1xuICAgIGZ1bmN0aW9uIGNsZWFyX2FuaW1hdGlvbigpIHtcbiAgICAgICAgaWYgKGFuaW1hdGlvbl9uYW1lKVxuICAgICAgICAgICAgZGVsZXRlX3J1bGUobm9kZSwgYW5pbWF0aW9uX25hbWUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbml0KHByb2dyYW0sIGR1cmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGQgPSBwcm9ncmFtLmIgLSB0O1xuICAgICAgICBkdXJhdGlvbiAqPSBNYXRoLmFicyhkKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGE6IHQsXG4gICAgICAgICAgICBiOiBwcm9ncmFtLmIsXG4gICAgICAgICAgICBkLFxuICAgICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgICBzdGFydDogcHJvZ3JhbS5zdGFydCxcbiAgICAgICAgICAgIGVuZDogcHJvZ3JhbS5zdGFydCArIGR1cmF0aW9uLFxuICAgICAgICAgICAgZ3JvdXA6IHByb2dyYW0uZ3JvdXBcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ28oYikge1xuICAgICAgICBjb25zdCB7IGRlbGF5ID0gMCwgZHVyYXRpb24gPSAzMDAsIGVhc2luZyA9IGlkZW50aXR5LCB0aWNrID0gbm9vcCwgY3NzIH0gPSBjb25maWcgfHwgbnVsbF90cmFuc2l0aW9uO1xuICAgICAgICBjb25zdCBwcm9ncmFtID0ge1xuICAgICAgICAgICAgc3RhcnQ6IG5vdygpICsgZGVsYXksXG4gICAgICAgICAgICBiXG4gICAgICAgIH07XG4gICAgICAgIGlmICghYikge1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSB0b2RvOiBpbXByb3ZlIHR5cGluZ3NcbiAgICAgICAgICAgIHByb2dyYW0uZ3JvdXAgPSBvdXRyb3M7XG4gICAgICAgICAgICBvdXRyb3MuciArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChydW5uaW5nX3Byb2dyYW0pIHtcbiAgICAgICAgICAgIHBlbmRpbmdfcHJvZ3JhbSA9IHByb2dyYW07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBpZiB0aGlzIGlzIGFuIGludHJvLCBhbmQgdGhlcmUncyBhIGRlbGF5LCB3ZSBuZWVkIHRvIGRvXG4gICAgICAgICAgICAvLyBhbiBpbml0aWFsIHRpY2sgYW5kL29yIGFwcGx5IENTUyBhbmltYXRpb24gaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgICAgICBjbGVhcl9hbmltYXRpb24oKTtcbiAgICAgICAgICAgICAgICBhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIHQsIGIsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGIpXG4gICAgICAgICAgICAgICAgdGljaygwLCAxKTtcbiAgICAgICAgICAgIHJ1bm5pbmdfcHJvZ3JhbSA9IGluaXQocHJvZ3JhbSwgZHVyYXRpb24pO1xuICAgICAgICAgICAgYWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiBkaXNwYXRjaChub2RlLCBiLCAnc3RhcnQnKSk7XG4gICAgICAgICAgICBsb29wKG5vdyA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHBlbmRpbmdfcHJvZ3JhbSAmJiBub3cgPiBwZW5kaW5nX3Byb2dyYW0uc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcnVubmluZ19wcm9ncmFtID0gaW5pdChwZW5kaW5nX3Byb2dyYW0sIGR1cmF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ19wcm9ncmFtID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2gobm9kZSwgcnVubmluZ19wcm9ncmFtLmIsICdzdGFydCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3NzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhcl9hbmltYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbl9uYW1lID0gY3JlYXRlX3J1bGUobm9kZSwgdCwgcnVubmluZ19wcm9ncmFtLmIsIHJ1bm5pbmdfcHJvZ3JhbS5kdXJhdGlvbiwgMCwgZWFzaW5nLCBjb25maWcuY3NzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocnVubmluZ19wcm9ncmFtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub3cgPj0gcnVubmluZ19wcm9ncmFtLmVuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGljayh0ID0gcnVubmluZ19wcm9ncmFtLmIsIDEgLSB0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKG5vZGUsIHJ1bm5pbmdfcHJvZ3JhbS5iLCAnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBlbmRpbmdfcHJvZ3JhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlJ3JlIGRvbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVubmluZ19wcm9ncmFtLmIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW50cm8g4oCUIHdlIGNhbiB0aWR5IHVwIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyX2FuaW1hdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3V0cm8g4oCUIG5lZWRzIHRvIGJlIGNvb3JkaW5hdGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghLS1ydW5uaW5nX3Byb2dyYW0uZ3JvdXAucilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bl9hbGwocnVubmluZ19wcm9ncmFtLmdyb3VwLmMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bm5pbmdfcHJvZ3JhbSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobm93ID49IHJ1bm5pbmdfcHJvZ3JhbS5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcCA9IG5vdyAtIHJ1bm5pbmdfcHJvZ3JhbS5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHQgPSBydW5uaW5nX3Byb2dyYW0uYSArIHJ1bm5pbmdfcHJvZ3JhbS5kICogZWFzaW5nKHAgLyBydW5uaW5nX3Byb2dyYW0uZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGljayh0LCAxIC0gdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhKHJ1bm5pbmdfcHJvZ3JhbSB8fCBwZW5kaW5nX3Byb2dyYW0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcnVuKGIpIHtcbiAgICAgICAgICAgIGlmIChpc19mdW5jdGlvbihjb25maWcpKSB7XG4gICAgICAgICAgICAgICAgd2FpdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZygpO1xuICAgICAgICAgICAgICAgICAgICBnbyhiKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGdvKGIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBlbmQoKSB7XG4gICAgICAgICAgICBjbGVhcl9hbmltYXRpb24oKTtcbiAgICAgICAgICAgIHJ1bm5pbmdfcHJvZ3JhbSA9IHBlbmRpbmdfcHJvZ3JhbSA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBoYW5kbGVfcHJvbWlzZShwcm9taXNlLCBpbmZvKSB7XG4gICAgY29uc3QgdG9rZW4gPSBpbmZvLnRva2VuID0ge307XG4gICAgZnVuY3Rpb24gdXBkYXRlKHR5cGUsIGluZGV4LCBrZXksIHZhbHVlKSB7XG4gICAgICAgIGlmIChpbmZvLnRva2VuICE9PSB0b2tlbilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaW5mby5yZXNvbHZlZCA9IHZhbHVlO1xuICAgICAgICBsZXQgY2hpbGRfY3R4ID0gaW5mby5jdHg7XG4gICAgICAgIGlmIChrZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2hpbGRfY3R4ID0gY2hpbGRfY3R4LnNsaWNlKCk7XG4gICAgICAgICAgICBjaGlsZF9jdHhba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdHlwZSAmJiAoaW5mby5jdXJyZW50ID0gdHlwZSkoY2hpbGRfY3R4KTtcbiAgICAgICAgbGV0IG5lZWRzX2ZsdXNoID0gZmFsc2U7XG4gICAgICAgIGlmIChpbmZvLmJsb2NrKSB7XG4gICAgICAgICAgICBpZiAoaW5mby5ibG9ja3MpIHtcbiAgICAgICAgICAgICAgICBpbmZvLmJsb2Nrcy5mb3JFYWNoKChibG9jaywgaSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gaW5kZXggJiYgYmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwX291dHJvcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbl9vdXQoYmxvY2ssIDEsIDEsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvLmJsb2Nrc1tpXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrX291dHJvcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmZvLmJsb2NrLmQoMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBibG9jay5jKCk7XG4gICAgICAgICAgICB0cmFuc2l0aW9uX2luKGJsb2NrLCAxKTtcbiAgICAgICAgICAgIGJsb2NrLm0oaW5mby5tb3VudCgpLCBpbmZvLmFuY2hvcik7XG4gICAgICAgICAgICBuZWVkc19mbHVzaCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaW5mby5ibG9jayA9IGJsb2NrO1xuICAgICAgICBpZiAoaW5mby5ibG9ja3MpXG4gICAgICAgICAgICBpbmZvLmJsb2Nrc1tpbmRleF0gPSBibG9jaztcbiAgICAgICAgaWYgKG5lZWRzX2ZsdXNoKSB7XG4gICAgICAgICAgICBmbHVzaCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpc19wcm9taXNlKHByb21pc2UpKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRfY29tcG9uZW50ID0gZ2V0X2N1cnJlbnRfY29tcG9uZW50KCk7XG4gICAgICAgIHByb21pc2UudGhlbih2YWx1ZSA9PiB7XG4gICAgICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQoY3VycmVudF9jb21wb25lbnQpO1xuICAgICAgICAgICAgdXBkYXRlKGluZm8udGhlbiwgMSwgaW5mby52YWx1ZSwgdmFsdWUpO1xuICAgICAgICAgICAgc2V0X2N1cnJlbnRfY29tcG9uZW50KG51bGwpO1xuICAgICAgICB9LCBlcnJvciA9PiB7XG4gICAgICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQoY3VycmVudF9jb21wb25lbnQpO1xuICAgICAgICAgICAgdXBkYXRlKGluZm8uY2F0Y2gsIDIsIGluZm8uZXJyb3IsIGVycm9yKTtcbiAgICAgICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChudWxsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGlmIHdlIHByZXZpb3VzbHkgaGFkIGEgdGhlbi9jYXRjaCBibG9jaywgZGVzdHJveSBpdFxuICAgICAgICBpZiAoaW5mby5jdXJyZW50ICE9PSBpbmZvLnBlbmRpbmcpIHtcbiAgICAgICAgICAgIHVwZGF0ZShpbmZvLnBlbmRpbmcsIDApO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmIChpbmZvLmN1cnJlbnQgIT09IGluZm8udGhlbikge1xuICAgICAgICAgICAgdXBkYXRlKGluZm8udGhlbiwgMSwgaW5mby52YWx1ZSwgcHJvbWlzZSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpbmZvLnJlc29sdmVkID0gcHJvbWlzZTtcbiAgICB9XG59XG5cbmNvbnN0IGdsb2JhbHMgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICA/IHdpbmRvd1xuICAgIDogdHlwZW9mIGdsb2JhbFRoaXMgIT09ICd1bmRlZmluZWQnXG4gICAgICAgID8gZ2xvYmFsVGhpc1xuICAgICAgICA6IGdsb2JhbCk7XG5cbmZ1bmN0aW9uIGRlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuICAgIGJsb2NrLmQoMSk7XG4gICAgbG9va3VwLmRlbGV0ZShibG9jay5rZXkpO1xufVxuZnVuY3Rpb24gb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuICAgIHRyYW5zaXRpb25fb3V0KGJsb2NrLCAxLCAxLCAoKSA9PiB7XG4gICAgICAgIGxvb2t1cC5kZWxldGUoYmxvY2sua2V5KTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGZpeF9hbmRfZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKSB7XG4gICAgYmxvY2suZigpO1xuICAgIGRlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCk7XG59XG5mdW5jdGlvbiBmaXhfYW5kX291dHJvX2FuZF9kZXN0cm95X2Jsb2NrKGJsb2NrLCBsb29rdXApIHtcbiAgICBibG9jay5mKCk7XG4gICAgb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCk7XG59XG5mdW5jdGlvbiB1cGRhdGVfa2V5ZWRfZWFjaChvbGRfYmxvY2tzLCBkaXJ0eSwgZ2V0X2tleSwgZHluYW1pYywgY3R4LCBsaXN0LCBsb29rdXAsIG5vZGUsIGRlc3Ryb3ksIGNyZWF0ZV9lYWNoX2Jsb2NrLCBuZXh0LCBnZXRfY29udGV4dCkge1xuICAgIGxldCBvID0gb2xkX2Jsb2Nrcy5sZW5ndGg7XG4gICAgbGV0IG4gPSBsaXN0Lmxlbmd0aDtcbiAgICBsZXQgaSA9IG87XG4gICAgY29uc3Qgb2xkX2luZGV4ZXMgPSB7fTtcbiAgICB3aGlsZSAoaS0tKVxuICAgICAgICBvbGRfaW5kZXhlc1tvbGRfYmxvY2tzW2ldLmtleV0gPSBpO1xuICAgIGNvbnN0IG5ld19ibG9ja3MgPSBbXTtcbiAgICBjb25zdCBuZXdfbG9va3VwID0gbmV3IE1hcCgpO1xuICAgIGNvbnN0IGRlbHRhcyA9IG5ldyBNYXAoKTtcbiAgICBpID0gbjtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGNvbnN0IGNoaWxkX2N0eCA9IGdldF9jb250ZXh0KGN0eCwgbGlzdCwgaSk7XG4gICAgICAgIGNvbnN0IGtleSA9IGdldF9rZXkoY2hpbGRfY3R4KTtcbiAgICAgICAgbGV0IGJsb2NrID0gbG9va3VwLmdldChrZXkpO1xuICAgICAgICBpZiAoIWJsb2NrKSB7XG4gICAgICAgICAgICBibG9jayA9IGNyZWF0ZV9lYWNoX2Jsb2NrKGtleSwgY2hpbGRfY3R4KTtcbiAgICAgICAgICAgIGJsb2NrLmMoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkeW5hbWljKSB7XG4gICAgICAgICAgICBibG9jay5wKGNoaWxkX2N0eCwgZGlydHkpO1xuICAgICAgICB9XG4gICAgICAgIG5ld19sb29rdXAuc2V0KGtleSwgbmV3X2Jsb2Nrc1tpXSA9IGJsb2NrKTtcbiAgICAgICAgaWYgKGtleSBpbiBvbGRfaW5kZXhlcylcbiAgICAgICAgICAgIGRlbHRhcy5zZXQoa2V5LCBNYXRoLmFicyhpIC0gb2xkX2luZGV4ZXNba2V5XSkpO1xuICAgIH1cbiAgICBjb25zdCB3aWxsX21vdmUgPSBuZXcgU2V0KCk7XG4gICAgY29uc3QgZGlkX21vdmUgPSBuZXcgU2V0KCk7XG4gICAgZnVuY3Rpb24gaW5zZXJ0KGJsb2NrKSB7XG4gICAgICAgIHRyYW5zaXRpb25faW4oYmxvY2ssIDEpO1xuICAgICAgICBibG9jay5tKG5vZGUsIG5leHQsIGxvb2t1cC5oYXMoYmxvY2sua2V5KSk7XG4gICAgICAgIGxvb2t1cC5zZXQoYmxvY2sua2V5LCBibG9jayk7XG4gICAgICAgIG5leHQgPSBibG9jay5maXJzdDtcbiAgICAgICAgbi0tO1xuICAgIH1cbiAgICB3aGlsZSAobyAmJiBuKSB7XG4gICAgICAgIGNvbnN0IG5ld19ibG9jayA9IG5ld19ibG9ja3NbbiAtIDFdO1xuICAgICAgICBjb25zdCBvbGRfYmxvY2sgPSBvbGRfYmxvY2tzW28gLSAxXTtcbiAgICAgICAgY29uc3QgbmV3X2tleSA9IG5ld19ibG9jay5rZXk7XG4gICAgICAgIGNvbnN0IG9sZF9rZXkgPSBvbGRfYmxvY2sua2V5O1xuICAgICAgICBpZiAobmV3X2Jsb2NrID09PSBvbGRfYmxvY2spIHtcbiAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICAgICAgICAgIG5leHQgPSBuZXdfYmxvY2suZmlyc3Q7XG4gICAgICAgICAgICBvLS07XG4gICAgICAgICAgICBuLS07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIW5ld19sb29rdXAuaGFzKG9sZF9rZXkpKSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgb2xkIGJsb2NrXG4gICAgICAgICAgICBkZXN0cm95KG9sZF9ibG9jaywgbG9va3VwKTtcbiAgICAgICAgICAgIG8tLTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghbG9va3VwLmhhcyhuZXdfa2V5KSB8fCB3aWxsX21vdmUuaGFzKG5ld19rZXkpKSB7XG4gICAgICAgICAgICBpbnNlcnQobmV3X2Jsb2NrKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaWRfbW92ZS5oYXMob2xkX2tleSkpIHtcbiAgICAgICAgICAgIG8tLTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWx0YXMuZ2V0KG5ld19rZXkpID4gZGVsdGFzLmdldChvbGRfa2V5KSkge1xuICAgICAgICAgICAgZGlkX21vdmUuYWRkKG5ld19rZXkpO1xuICAgICAgICAgICAgaW5zZXJ0KG5ld19ibG9jayk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB3aWxsX21vdmUuYWRkKG9sZF9rZXkpO1xuICAgICAgICAgICAgby0tO1xuICAgICAgICB9XG4gICAgfVxuICAgIHdoaWxlIChvLS0pIHtcbiAgICAgICAgY29uc3Qgb2xkX2Jsb2NrID0gb2xkX2Jsb2Nrc1tvXTtcbiAgICAgICAgaWYgKCFuZXdfbG9va3VwLmhhcyhvbGRfYmxvY2sua2V5KSlcbiAgICAgICAgICAgIGRlc3Ryb3kob2xkX2Jsb2NrLCBsb29rdXApO1xuICAgIH1cbiAgICB3aGlsZSAobilcbiAgICAgICAgaW5zZXJ0KG5ld19ibG9ja3NbbiAtIDFdKTtcbiAgICByZXR1cm4gbmV3X2Jsb2Nrcztcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlX2VhY2hfa2V5cyhjdHgsIGxpc3QsIGdldF9jb250ZXh0LCBnZXRfa2V5KSB7XG4gICAgY29uc3Qga2V5cyA9IG5ldyBTZXQoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3Qga2V5ID0gZ2V0X2tleShnZXRfY29udGV4dChjdHgsIGxpc3QsIGkpKTtcbiAgICAgICAgaWYgKGtleXMuaGFzKGtleSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGhhdmUgZHVwbGljYXRlIGtleXMgaW4gYSBrZXllZCBlYWNoYCk7XG4gICAgICAgIH1cbiAgICAgICAga2V5cy5hZGQoa2V5KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldF9zcHJlYWRfdXBkYXRlKGxldmVscywgdXBkYXRlcykge1xuICAgIGNvbnN0IHVwZGF0ZSA9IHt9O1xuICAgIGNvbnN0IHRvX251bGxfb3V0ID0ge307XG4gICAgY29uc3QgYWNjb3VudGVkX2ZvciA9IHsgJCRzY29wZTogMSB9O1xuICAgIGxldCBpID0gbGV2ZWxzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGNvbnN0IG8gPSBsZXZlbHNbaV07XG4gICAgICAgIGNvbnN0IG4gPSB1cGRhdGVzW2ldO1xuICAgICAgICBpZiAobikge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gbykge1xuICAgICAgICAgICAgICAgIGlmICghKGtleSBpbiBuKSlcbiAgICAgICAgICAgICAgICAgICAgdG9fbnVsbF9vdXRba2V5XSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBuKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhY2NvdW50ZWRfZm9yW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlW2tleV0gPSBuW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGFjY291bnRlZF9mb3Jba2V5XSA9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV2ZWxzW2ldID0gbjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIG8pIHtcbiAgICAgICAgICAgICAgICBhY2NvdW50ZWRfZm9yW2tleV0gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3Qga2V5IGluIHRvX251bGxfb3V0KSB7XG4gICAgICAgIGlmICghKGtleSBpbiB1cGRhdGUpKVxuICAgICAgICAgICAgdXBkYXRlW2tleV0gPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB1cGRhdGU7XG59XG5mdW5jdGlvbiBnZXRfc3ByZWFkX29iamVjdChzcHJlYWRfcHJvcHMpIHtcbiAgICByZXR1cm4gdHlwZW9mIHNwcmVhZF9wcm9wcyA9PT0gJ29iamVjdCcgJiYgc3ByZWFkX3Byb3BzICE9PSBudWxsID8gc3ByZWFkX3Byb3BzIDoge307XG59XG5cbi8vIHNvdXJjZTogaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2UvaW5kaWNlcy5odG1sXG5jb25zdCBib29sZWFuX2F0dHJpYnV0ZXMgPSBuZXcgU2V0KFtcbiAgICAnYWxsb3dmdWxsc2NyZWVuJyxcbiAgICAnYWxsb3dwYXltZW50cmVxdWVzdCcsXG4gICAgJ2FzeW5jJyxcbiAgICAnYXV0b2ZvY3VzJyxcbiAgICAnYXV0b3BsYXknLFxuICAgICdjaGVja2VkJyxcbiAgICAnY29udHJvbHMnLFxuICAgICdkZWZhdWx0JyxcbiAgICAnZGVmZXInLFxuICAgICdkaXNhYmxlZCcsXG4gICAgJ2Zvcm1ub3ZhbGlkYXRlJyxcbiAgICAnaGlkZGVuJyxcbiAgICAnaXNtYXAnLFxuICAgICdsb29wJyxcbiAgICAnbXVsdGlwbGUnLFxuICAgICdtdXRlZCcsXG4gICAgJ25vbW9kdWxlJyxcbiAgICAnbm92YWxpZGF0ZScsXG4gICAgJ29wZW4nLFxuICAgICdwbGF5c2lubGluZScsXG4gICAgJ3JlYWRvbmx5JyxcbiAgICAncmVxdWlyZWQnLFxuICAgICdyZXZlcnNlZCcsXG4gICAgJ3NlbGVjdGVkJ1xuXSk7XG5cbmNvbnN0IGludmFsaWRfYXR0cmlidXRlX25hbWVfY2hhcmFjdGVyID0gL1tcXHMnXCI+Lz1cXHV7RkREMH0tXFx1e0ZERUZ9XFx1e0ZGRkV9XFx1e0ZGRkZ9XFx1ezFGRkZFfVxcdXsxRkZGRn1cXHV7MkZGRkV9XFx1ezJGRkZGfVxcdXszRkZGRX1cXHV7M0ZGRkZ9XFx1ezRGRkZFfVxcdXs0RkZGRn1cXHV7NUZGRkV9XFx1ezVGRkZGfVxcdXs2RkZGRX1cXHV7NkZGRkZ9XFx1ezdGRkZFfVxcdXs3RkZGRn1cXHV7OEZGRkV9XFx1ezhGRkZGfVxcdXs5RkZGRX1cXHV7OUZGRkZ9XFx1e0FGRkZFfVxcdXtBRkZGRn1cXHV7QkZGRkV9XFx1e0JGRkZGfVxcdXtDRkZGRX1cXHV7Q0ZGRkZ9XFx1e0RGRkZFfVxcdXtERkZGRn1cXHV7RUZGRkV9XFx1e0VGRkZGfVxcdXtGRkZGRX1cXHV7RkZGRkZ9XFx1ezEwRkZGRX1cXHV7MTBGRkZGfV0vdTtcbi8vIGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL3N5bnRheC5odG1sI2F0dHJpYnV0ZXMtMlxuLy8gaHR0cHM6Ly9pbmZyYS5zcGVjLndoYXR3Zy5vcmcvI25vbmNoYXJhY3RlclxuZnVuY3Rpb24gc3ByZWFkKGFyZ3MsIGNsYXNzZXNfdG9fYWRkKSB7XG4gICAgY29uc3QgYXR0cmlidXRlcyA9IE9iamVjdC5hc3NpZ24oe30sIC4uLmFyZ3MpO1xuICAgIGlmIChjbGFzc2VzX3RvX2FkZCkge1xuICAgICAgICBpZiAoYXR0cmlidXRlcy5jbGFzcyA9PSBudWxsKSB7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzLmNsYXNzID0gY2xhc3Nlc190b19hZGQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzLmNsYXNzICs9ICcgJyArIGNsYXNzZXNfdG9fYWRkO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBzdHIgPSAnJztcbiAgICBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICBpZiAoaW52YWxpZF9hdHRyaWJ1dGVfbmFtZV9jaGFyYWN0ZXIudGVzdChuYW1lKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBhdHRyaWJ1dGVzW25hbWVdO1xuICAgICAgICBpZiAodmFsdWUgPT09IHRydWUpXG4gICAgICAgICAgICBzdHIgKz0gXCIgXCIgKyBuYW1lO1xuICAgICAgICBlbHNlIGlmIChib29sZWFuX2F0dHJpYnV0ZXMuaGFzKG5hbWUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSlcbiAgICAgICAgICAgICAgICBzdHIgKz0gXCIgXCIgKyBuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN0ciArPSBgICR7bmFtZX09XCIke1N0cmluZyh2YWx1ZSkucmVwbGFjZSgvXCIvZywgJyYjMzQ7JykucmVwbGFjZSgvJy9nLCAnJiMzOTsnKX1cImA7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3RyO1xufVxuY29uc3QgZXNjYXBlZCA9IHtcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjMzk7JyxcbiAgICAnJic6ICcmYW1wOycsXG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0Oydcbn07XG5mdW5jdGlvbiBlc2NhcGUoaHRtbCkge1xuICAgIHJldHVybiBTdHJpbmcoaHRtbCkucmVwbGFjZSgvW1wiJyY8Pl0vZywgbWF0Y2ggPT4gZXNjYXBlZFttYXRjaF0pO1xufVxuZnVuY3Rpb24gZWFjaChpdGVtcywgZm4pIHtcbiAgICBsZXQgc3RyID0gJyc7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBzdHIgKz0gZm4oaXRlbXNbaV0sIGkpO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xufVxuY29uc3QgbWlzc2luZ19jb21wb25lbnQgPSB7XG4gICAgJCRyZW5kZXI6ICgpID0+ICcnXG59O1xuZnVuY3Rpb24gdmFsaWRhdGVfY29tcG9uZW50KGNvbXBvbmVudCwgbmFtZSkge1xuICAgIGlmICghY29tcG9uZW50IHx8ICFjb21wb25lbnQuJCRyZW5kZXIpIHtcbiAgICAgICAgaWYgKG5hbWUgPT09ICdzdmVsdGU6Y29tcG9uZW50JylcbiAgICAgICAgICAgIG5hbWUgKz0gJyB0aGlzPXsuLi59JztcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGA8JHtuYW1lfT4gaXMgbm90IGEgdmFsaWQgU1NSIGNvbXBvbmVudC4gWW91IG1heSBuZWVkIHRvIHJldmlldyB5b3VyIGJ1aWxkIGNvbmZpZyB0byBlbnN1cmUgdGhhdCBkZXBlbmRlbmNpZXMgYXJlIGNvbXBpbGVkLCByYXRoZXIgdGhhbiBpbXBvcnRlZCBhcyBwcmUtY29tcGlsZWQgbW9kdWxlc2ApO1xuICAgIH1cbiAgICByZXR1cm4gY29tcG9uZW50O1xufVxuZnVuY3Rpb24gZGVidWcoZmlsZSwgbGluZSwgY29sdW1uLCB2YWx1ZXMpIHtcbiAgICBjb25zb2xlLmxvZyhge0BkZWJ1Z30gJHtmaWxlID8gZmlsZSArICcgJyA6ICcnfSgke2xpbmV9OiR7Y29sdW1ufSlgKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codmFsdWVzKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgcmV0dXJuICcnO1xufVxubGV0IG9uX2Rlc3Ryb3k7XG5mdW5jdGlvbiBjcmVhdGVfc3NyX2NvbXBvbmVudChmbikge1xuICAgIGZ1bmN0aW9uICQkcmVuZGVyKHJlc3VsdCwgcHJvcHMsIGJpbmRpbmdzLCBzbG90cykge1xuICAgICAgICBjb25zdCBwYXJlbnRfY29tcG9uZW50ID0gY3VycmVudF9jb21wb25lbnQ7XG4gICAgICAgIGNvbnN0ICQkID0ge1xuICAgICAgICAgICAgb25fZGVzdHJveSxcbiAgICAgICAgICAgIGNvbnRleHQ6IG5ldyBNYXAocGFyZW50X2NvbXBvbmVudCA/IHBhcmVudF9jb21wb25lbnQuJCQuY29udGV4dCA6IFtdKSxcbiAgICAgICAgICAgIC8vIHRoZXNlIHdpbGwgYmUgaW1tZWRpYXRlbHkgZGlzY2FyZGVkXG4gICAgICAgICAgICBvbl9tb3VudDogW10sXG4gICAgICAgICAgICBiZWZvcmVfdXBkYXRlOiBbXSxcbiAgICAgICAgICAgIGFmdGVyX3VwZGF0ZTogW10sXG4gICAgICAgICAgICBjYWxsYmFja3M6IGJsYW5rX29iamVjdCgpXG4gICAgICAgIH07XG4gICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudCh7ICQkIH0pO1xuICAgICAgICBjb25zdCBodG1sID0gZm4ocmVzdWx0LCBwcm9wcywgYmluZGluZ3MsIHNsb3RzKTtcbiAgICAgICAgc2V0X2N1cnJlbnRfY29tcG9uZW50KHBhcmVudF9jb21wb25lbnQpO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVuZGVyOiAocHJvcHMgPSB7fSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgICAgICAgICBvbl9kZXN0cm95ID0gW107XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB7IHRpdGxlOiAnJywgaGVhZDogJycsIGNzczogbmV3IFNldCgpIH07XG4gICAgICAgICAgICBjb25zdCBodG1sID0gJCRyZW5kZXIocmVzdWx0LCBwcm9wcywge30sIG9wdGlvbnMpO1xuICAgICAgICAgICAgcnVuX2FsbChvbl9kZXN0cm95KTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgaHRtbCxcbiAgICAgICAgICAgICAgICBjc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogQXJyYXkuZnJvbShyZXN1bHQuY3NzKS5tYXAoY3NzID0+IGNzcy5jb2RlKS5qb2luKCdcXG4nKSxcbiAgICAgICAgICAgICAgICAgICAgbWFwOiBudWxsIC8vIFRPRE9cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGhlYWQ6IHJlc3VsdC50aXRsZSArIHJlc3VsdC5oZWFkXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICAkJHJlbmRlclxuICAgIH07XG59XG5mdW5jdGlvbiBhZGRfYXR0cmlidXRlKG5hbWUsIHZhbHVlLCBib29sZWFuKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwgfHwgKGJvb2xlYW4gJiYgIXZhbHVlKSlcbiAgICAgICAgcmV0dXJuICcnO1xuICAgIHJldHVybiBgICR7bmFtZX0ke3ZhbHVlID09PSB0cnVlID8gJycgOiBgPSR7dHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IEpTT04uc3RyaW5naWZ5KGVzY2FwZSh2YWx1ZSkpIDogYFwiJHt2YWx1ZX1cImB9YH1gO1xufVxuZnVuY3Rpb24gYWRkX2NsYXNzZXMoY2xhc3Nlcykge1xuICAgIHJldHVybiBjbGFzc2VzID8gYCBjbGFzcz1cIiR7Y2xhc3Nlc31cImAgOiBgYDtcbn1cblxuZnVuY3Rpb24gYmluZChjb21wb25lbnQsIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgaW5kZXggPSBjb21wb25lbnQuJCQucHJvcHNbbmFtZV07XG4gICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29tcG9uZW50LiQkLmJvdW5kW2luZGV4XSA9IGNhbGxiYWNrO1xuICAgICAgICBjYWxsYmFjayhjb21wb25lbnQuJCQuY3R4W2luZGV4XSk7XG4gICAgfVxufVxuZnVuY3Rpb24gY3JlYXRlX2NvbXBvbmVudChibG9jaykge1xuICAgIGJsb2NrICYmIGJsb2NrLmMoKTtcbn1cbmZ1bmN0aW9uIGNsYWltX2NvbXBvbmVudChibG9jaywgcGFyZW50X25vZGVzKSB7XG4gICAgYmxvY2sgJiYgYmxvY2subChwYXJlbnRfbm9kZXMpO1xufVxuZnVuY3Rpb24gbW91bnRfY29tcG9uZW50KGNvbXBvbmVudCwgdGFyZ2V0LCBhbmNob3IpIHtcbiAgICBjb25zdCB7IGZyYWdtZW50LCBvbl9tb3VudCwgb25fZGVzdHJveSwgYWZ0ZXJfdXBkYXRlIH0gPSBjb21wb25lbnQuJCQ7XG4gICAgZnJhZ21lbnQgJiYgZnJhZ21lbnQubSh0YXJnZXQsIGFuY2hvcik7XG4gICAgLy8gb25Nb3VudCBoYXBwZW5zIGJlZm9yZSB0aGUgaW5pdGlhbCBhZnRlclVwZGF0ZVxuICAgIGFkZF9yZW5kZXJfY2FsbGJhY2soKCkgPT4ge1xuICAgICAgICBjb25zdCBuZXdfb25fZGVzdHJveSA9IG9uX21vdW50Lm1hcChydW4pLmZpbHRlcihpc19mdW5jdGlvbik7XG4gICAgICAgIGlmIChvbl9kZXN0cm95KSB7XG4gICAgICAgICAgICBvbl9kZXN0cm95LnB1c2goLi4ubmV3X29uX2Rlc3Ryb3kpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gRWRnZSBjYXNlIC0gY29tcG9uZW50IHdhcyBkZXN0cm95ZWQgaW1tZWRpYXRlbHksXG4gICAgICAgICAgICAvLyBtb3N0IGxpa2VseSBhcyBhIHJlc3VsdCBvZiBhIGJpbmRpbmcgaW5pdGlhbGlzaW5nXG4gICAgICAgICAgICBydW5fYWxsKG5ld19vbl9kZXN0cm95KTtcbiAgICAgICAgfVxuICAgICAgICBjb21wb25lbnQuJCQub25fbW91bnQgPSBbXTtcbiAgICB9KTtcbiAgICBhZnRlcl91cGRhdGUuZm9yRWFjaChhZGRfcmVuZGVyX2NhbGxiYWNrKTtcbn1cbmZ1bmN0aW9uIGRlc3Ryb3lfY29tcG9uZW50KGNvbXBvbmVudCwgZGV0YWNoaW5nKSB7XG4gICAgY29uc3QgJCQgPSBjb21wb25lbnQuJCQ7XG4gICAgaWYgKCQkLmZyYWdtZW50ICE9PSBudWxsKSB7XG4gICAgICAgIHJ1bl9hbGwoJCQub25fZGVzdHJveSk7XG4gICAgICAgICQkLmZyYWdtZW50ICYmICQkLmZyYWdtZW50LmQoZGV0YWNoaW5nKTtcbiAgICAgICAgLy8gVE9ETyBudWxsIG91dCBvdGhlciByZWZzLCBpbmNsdWRpbmcgY29tcG9uZW50LiQkIChidXQgbmVlZCB0b1xuICAgICAgICAvLyBwcmVzZXJ2ZSBmaW5hbCBzdGF0ZT8pXG4gICAgICAgICQkLm9uX2Rlc3Ryb3kgPSAkJC5mcmFnbWVudCA9IG51bGw7XG4gICAgICAgICQkLmN0eCA9IFtdO1xuICAgIH1cbn1cbmZ1bmN0aW9uIG1ha2VfZGlydHkoY29tcG9uZW50LCBpKSB7XG4gICAgaWYgKGNvbXBvbmVudC4kJC5kaXJ0eVswXSA9PT0gLTEpIHtcbiAgICAgICAgZGlydHlfY29tcG9uZW50cy5wdXNoKGNvbXBvbmVudCk7XG4gICAgICAgIHNjaGVkdWxlX3VwZGF0ZSgpO1xuICAgICAgICBjb21wb25lbnQuJCQuZGlydHkuZmlsbCgwKTtcbiAgICB9XG4gICAgY29tcG9uZW50LiQkLmRpcnR5WyhpIC8gMzEpIHwgMF0gfD0gKDEgPDwgKGkgJSAzMSkpO1xufVxuZnVuY3Rpb24gaW5pdChjb21wb25lbnQsIG9wdGlvbnMsIGluc3RhbmNlLCBjcmVhdGVfZnJhZ21lbnQsIG5vdF9lcXVhbCwgcHJvcHMsIGRpcnR5ID0gWy0xXSkge1xuICAgIGNvbnN0IHBhcmVudF9jb21wb25lbnQgPSBjdXJyZW50X2NvbXBvbmVudDtcbiAgICBzZXRfY3VycmVudF9jb21wb25lbnQoY29tcG9uZW50KTtcbiAgICBjb25zdCBwcm9wX3ZhbHVlcyA9IG9wdGlvbnMucHJvcHMgfHwge307XG4gICAgY29uc3QgJCQgPSBjb21wb25lbnQuJCQgPSB7XG4gICAgICAgIGZyYWdtZW50OiBudWxsLFxuICAgICAgICBjdHg6IG51bGwsXG4gICAgICAgIC8vIHN0YXRlXG4gICAgICAgIHByb3BzLFxuICAgICAgICB1cGRhdGU6IG5vb3AsXG4gICAgICAgIG5vdF9lcXVhbCxcbiAgICAgICAgYm91bmQ6IGJsYW5rX29iamVjdCgpLFxuICAgICAgICAvLyBsaWZlY3ljbGVcbiAgICAgICAgb25fbW91bnQ6IFtdLFxuICAgICAgICBvbl9kZXN0cm95OiBbXSxcbiAgICAgICAgYmVmb3JlX3VwZGF0ZTogW10sXG4gICAgICAgIGFmdGVyX3VwZGF0ZTogW10sXG4gICAgICAgIGNvbnRleHQ6IG5ldyBNYXAocGFyZW50X2NvbXBvbmVudCA/IHBhcmVudF9jb21wb25lbnQuJCQuY29udGV4dCA6IFtdKSxcbiAgICAgICAgLy8gZXZlcnl0aGluZyBlbHNlXG4gICAgICAgIGNhbGxiYWNrczogYmxhbmtfb2JqZWN0KCksXG4gICAgICAgIGRpcnR5XG4gICAgfTtcbiAgICBsZXQgcmVhZHkgPSBmYWxzZTtcbiAgICAkJC5jdHggPSBpbnN0YW5jZVxuICAgICAgICA/IGluc3RhbmNlKGNvbXBvbmVudCwgcHJvcF92YWx1ZXMsIChpLCByZXQsIC4uLnJlc3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcmVzdC5sZW5ndGggPyByZXN0WzBdIDogcmV0O1xuICAgICAgICAgICAgaWYgKCQkLmN0eCAmJiBub3RfZXF1YWwoJCQuY3R4W2ldLCAkJC5jdHhbaV0gPSB2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoJCQuYm91bmRbaV0pXG4gICAgICAgICAgICAgICAgICAgICQkLmJvdW5kW2ldKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAocmVhZHkpXG4gICAgICAgICAgICAgICAgICAgIG1ha2VfZGlydHkoY29tcG9uZW50LCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0pXG4gICAgICAgIDogW107XG4gICAgJCQudXBkYXRlKCk7XG4gICAgcmVhZHkgPSB0cnVlO1xuICAgIHJ1bl9hbGwoJCQuYmVmb3JlX3VwZGF0ZSk7XG4gICAgLy8gYGZhbHNlYCBhcyBhIHNwZWNpYWwgY2FzZSBvZiBubyBET00gY29tcG9uZW50XG4gICAgJCQuZnJhZ21lbnQgPSBjcmVhdGVfZnJhZ21lbnQgPyBjcmVhdGVfZnJhZ21lbnQoJCQuY3R4KSA6IGZhbHNlO1xuICAgIGlmIChvcHRpb25zLnRhcmdldCkge1xuICAgICAgICBpZiAob3B0aW9ucy5oeWRyYXRlKSB7XG4gICAgICAgICAgICBjb25zdCBub2RlcyA9IGNoaWxkcmVuKG9wdGlvbnMudGFyZ2V0KTtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAkJC5mcmFnbWVudCAmJiAkJC5mcmFnbWVudC5sKG5vZGVzKTtcbiAgICAgICAgICAgIG5vZGVzLmZvckVhY2goZGV0YWNoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAkJC5mcmFnbWVudCAmJiAkJC5mcmFnbWVudC5jKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuaW50cm8pXG4gICAgICAgICAgICB0cmFuc2l0aW9uX2luKGNvbXBvbmVudC4kJC5mcmFnbWVudCk7XG4gICAgICAgIG1vdW50X2NvbXBvbmVudChjb21wb25lbnQsIG9wdGlvbnMudGFyZ2V0LCBvcHRpb25zLmFuY2hvcik7XG4gICAgICAgIGZsdXNoKCk7XG4gICAgfVxuICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChwYXJlbnRfY29tcG9uZW50KTtcbn1cbmxldCBTdmVsdGVFbGVtZW50O1xuaWYgKHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIFN2ZWx0ZUVsZW1lbnQgPSBjbGFzcyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICBzdXBlcigpO1xuICAgICAgICAgICAgdGhpcy5hdHRhY2hTaGFkb3coeyBtb2RlOiAnb3BlbicgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIHRvZG86IGltcHJvdmUgdHlwaW5nc1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy4kJC5zbG90dGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSB0b2RvOiBpbXByb3ZlIHR5cGluZ3NcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZENoaWxkKHRoaXMuJCQuc2xvdHRlZFtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2soYXR0ciwgX29sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgdGhpc1thdHRyXSA9IG5ld1ZhbHVlO1xuICAgICAgICB9XG4gICAgICAgICRkZXN0cm95KCkge1xuICAgICAgICAgICAgZGVzdHJveV9jb21wb25lbnQodGhpcywgMSk7XG4gICAgICAgICAgICB0aGlzLiRkZXN0cm95ID0gbm9vcDtcbiAgICAgICAgfVxuICAgICAgICAkb24odHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIFRPRE8gc2hvdWxkIHRoaXMgZGVsZWdhdGUgdG8gYWRkRXZlbnRMaXN0ZW5lcj9cbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9ICh0aGlzLiQkLmNhbGxiYWNrc1t0eXBlXSB8fCAodGhpcy4kJC5jYWxsYmFja3NbdHlwZV0gPSBbXSkpO1xuICAgICAgICAgICAgY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IGNhbGxiYWNrcy5pbmRleE9mKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggIT09IC0xKVxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgJHNldCgpIHtcbiAgICAgICAgICAgIC8vIG92ZXJyaWRkZW4gYnkgaW5zdGFuY2UsIGlmIGl0IGhhcyBwcm9wc1xuICAgICAgICB9XG4gICAgfTtcbn1cbmNsYXNzIFN2ZWx0ZUNvbXBvbmVudCB7XG4gICAgJGRlc3Ryb3koKSB7XG4gICAgICAgIGRlc3Ryb3lfY29tcG9uZW50KHRoaXMsIDEpO1xuICAgICAgICB0aGlzLiRkZXN0cm95ID0gbm9vcDtcbiAgICB9XG4gICAgJG9uKHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9ICh0aGlzLiQkLmNhbGxiYWNrc1t0eXBlXSB8fCAodGhpcy4kJC5jYWxsYmFja3NbdHlwZV0gPSBbXSkpO1xuICAgICAgICBjYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IGNhbGxiYWNrcy5pbmRleE9mKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIH07XG4gICAgfVxuICAgICRzZXQoKSB7XG4gICAgICAgIC8vIG92ZXJyaWRkZW4gYnkgaW5zdGFuY2UsIGlmIGl0IGhhcyBwcm9wc1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZGlzcGF0Y2hfZGV2KHR5cGUsIGRldGFpbCkge1xuICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoY3VzdG9tX2V2ZW50KHR5cGUsIE9iamVjdC5hc3NpZ24oeyB2ZXJzaW9uOiAnMy4yMS4wJyB9LCBkZXRhaWwpKSk7XG59XG5mdW5jdGlvbiBhcHBlbmRfZGV2KHRhcmdldCwgbm9kZSkge1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTUluc2VydFwiLCB7IHRhcmdldCwgbm9kZSB9KTtcbiAgICBhcHBlbmQodGFyZ2V0LCBub2RlKTtcbn1cbmZ1bmN0aW9uIGluc2VydF9kZXYodGFyZ2V0LCBub2RlLCBhbmNob3IpIHtcbiAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01JbnNlcnRcIiwgeyB0YXJnZXQsIG5vZGUsIGFuY2hvciB9KTtcbiAgICBpbnNlcnQodGFyZ2V0LCBub2RlLCBhbmNob3IpO1xufVxuZnVuY3Rpb24gZGV0YWNoX2Rldihub2RlKSB7XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NUmVtb3ZlXCIsIHsgbm9kZSB9KTtcbiAgICBkZXRhY2gobm9kZSk7XG59XG5mdW5jdGlvbiBkZXRhY2hfYmV0d2Vlbl9kZXYoYmVmb3JlLCBhZnRlcikge1xuICAgIHdoaWxlIChiZWZvcmUubmV4dFNpYmxpbmcgJiYgYmVmb3JlLm5leHRTaWJsaW5nICE9PSBhZnRlcikge1xuICAgICAgICBkZXRhY2hfZGV2KGJlZm9yZS5uZXh0U2libGluZyk7XG4gICAgfVxufVxuZnVuY3Rpb24gZGV0YWNoX2JlZm9yZV9kZXYoYWZ0ZXIpIHtcbiAgICB3aGlsZSAoYWZ0ZXIucHJldmlvdXNTaWJsaW5nKSB7XG4gICAgICAgIGRldGFjaF9kZXYoYWZ0ZXIucHJldmlvdXNTaWJsaW5nKTtcbiAgICB9XG59XG5mdW5jdGlvbiBkZXRhY2hfYWZ0ZXJfZGV2KGJlZm9yZSkge1xuICAgIHdoaWxlIChiZWZvcmUubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgZGV0YWNoX2RldihiZWZvcmUubmV4dFNpYmxpbmcpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGxpc3Rlbl9kZXYobm9kZSwgZXZlbnQsIGhhbmRsZXIsIG9wdGlvbnMsIGhhc19wcmV2ZW50X2RlZmF1bHQsIGhhc19zdG9wX3Byb3BhZ2F0aW9uKSB7XG4gICAgY29uc3QgbW9kaWZpZXJzID0gb3B0aW9ucyA9PT0gdHJ1ZSA/IFtcImNhcHR1cmVcIl0gOiBvcHRpb25zID8gQXJyYXkuZnJvbShPYmplY3Qua2V5cyhvcHRpb25zKSkgOiBbXTtcbiAgICBpZiAoaGFzX3ByZXZlbnRfZGVmYXVsdClcbiAgICAgICAgbW9kaWZpZXJzLnB1c2goJ3ByZXZlbnREZWZhdWx0Jyk7XG4gICAgaWYgKGhhc19zdG9wX3Byb3BhZ2F0aW9uKVxuICAgICAgICBtb2RpZmllcnMucHVzaCgnc3RvcFByb3BhZ2F0aW9uJyk7XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NQWRkRXZlbnRMaXN0ZW5lclwiLCB7IG5vZGUsIGV2ZW50LCBoYW5kbGVyLCBtb2RpZmllcnMgfSk7XG4gICAgY29uc3QgZGlzcG9zZSA9IGxpc3Rlbihub2RlLCBldmVudCwgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NUmVtb3ZlRXZlbnRMaXN0ZW5lclwiLCB7IG5vZGUsIGV2ZW50LCBoYW5kbGVyLCBtb2RpZmllcnMgfSk7XG4gICAgICAgIGRpc3Bvc2UoKTtcbiAgICB9O1xufVxuZnVuY3Rpb24gYXR0cl9kZXYobm9kZSwgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgIGF0dHIobm9kZSwgYXR0cmlidXRlLCB2YWx1ZSk7XG4gICAgaWYgKHZhbHVlID09IG51bGwpXG4gICAgICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVJlbW92ZUF0dHJpYnV0ZVwiLCB7IG5vZGUsIGF0dHJpYnV0ZSB9KTtcbiAgICBlbHNlXG4gICAgICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVNldEF0dHJpYnV0ZVwiLCB7IG5vZGUsIGF0dHJpYnV0ZSwgdmFsdWUgfSk7XG59XG5mdW5jdGlvbiBwcm9wX2Rldihub2RlLCBwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICBub2RlW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVNldFByb3BlcnR5XCIsIHsgbm9kZSwgcHJvcGVydHksIHZhbHVlIH0pO1xufVxuZnVuY3Rpb24gZGF0YXNldF9kZXYobm9kZSwgcHJvcGVydHksIHZhbHVlKSB7XG4gICAgbm9kZS5kYXRhc2V0W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVNldERhdGFzZXRcIiwgeyBub2RlLCBwcm9wZXJ0eSwgdmFsdWUgfSk7XG59XG5mdW5jdGlvbiBzZXRfZGF0YV9kZXYodGV4dCwgZGF0YSkge1xuICAgIGRhdGEgPSAnJyArIGRhdGE7XG4gICAgaWYgKHRleHQuZGF0YSA9PT0gZGF0YSlcbiAgICAgICAgcmV0dXJuO1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVNldERhdGFcIiwgeyBub2RlOiB0ZXh0LCBkYXRhIH0pO1xuICAgIHRleHQuZGF0YSA9IGRhdGE7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZV9lYWNoX2FyZ3VtZW50KGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnc3RyaW5nJyAmJiAhKGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiAnbGVuZ3RoJyBpbiBhcmcpKSB7XG4gICAgICAgIGxldCBtc2cgPSAneyNlYWNofSBvbmx5IGl0ZXJhdGVzIG92ZXIgYXJyYXktbGlrZSBvYmplY3RzLic7XG4gICAgICAgIGlmICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIGFyZyAmJiBTeW1ib2wuaXRlcmF0b3IgaW4gYXJnKSB7XG4gICAgICAgICAgICBtc2cgKz0gJyBZb3UgY2FuIHVzZSBhIHNwcmVhZCB0byBjb252ZXJ0IHRoaXMgaXRlcmFibGUgaW50byBhbiBhcnJheS4nO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHZhbGlkYXRlX3Nsb3RzKG5hbWUsIHNsb3QsIGtleXMpIHtcbiAgICBmb3IgKGNvbnN0IHNsb3Rfa2V5IG9mIE9iamVjdC5rZXlzKHNsb3QpKSB7XG4gICAgICAgIGlmICghfmtleXMuaW5kZXhPZihzbG90X2tleSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgPCR7bmFtZX0+IHJlY2VpdmVkIGFuIHVuZXhwZWN0ZWQgc2xvdCBcIiR7c2xvdF9rZXl9XCIuYCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5jbGFzcyBTdmVsdGVDb21wb25lbnREZXYgZXh0ZW5kcyBTdmVsdGVDb21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zIHx8ICghb3B0aW9ucy50YXJnZXQgJiYgIW9wdGlvbnMuJCRpbmxpbmUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCd0YXJnZXQnIGlzIGEgcmVxdWlyZWQgb3B0aW9uYCk7XG4gICAgICAgIH1cbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG4gICAgJGRlc3Ryb3koKSB7XG4gICAgICAgIHN1cGVyLiRkZXN0cm95KCk7XG4gICAgICAgIHRoaXMuJGRlc3Ryb3kgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYENvbXBvbmVudCB3YXMgYWxyZWFkeSBkZXN0cm95ZWRgKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgICAgIH07XG4gICAgfVxuICAgICRjYXB0dXJlX3N0YXRlKCkgeyB9XG4gICAgJGluamVjdF9zdGF0ZSgpIHsgfVxufVxuZnVuY3Rpb24gbG9vcF9ndWFyZCh0aW1lb3V0KSB7XG4gICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGlmIChEYXRlLm5vdygpIC0gc3RhcnQgPiB0aW1lb3V0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluZmluaXRlIGxvb3AgZGV0ZWN0ZWRgKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmV4cG9ydCB7IEh0bWxUYWcsIFN2ZWx0ZUNvbXBvbmVudCwgU3ZlbHRlQ29tcG9uZW50RGV2LCBTdmVsdGVFbGVtZW50LCBhY3Rpb25fZGVzdHJveWVyLCBhZGRfYXR0cmlidXRlLCBhZGRfY2xhc3NlcywgYWRkX2ZsdXNoX2NhbGxiYWNrLCBhZGRfbG9jYXRpb24sIGFkZF9yZW5kZXJfY2FsbGJhY2ssIGFkZF9yZXNpemVfbGlzdGVuZXIsIGFkZF90cmFuc2Zvcm0sIGFmdGVyVXBkYXRlLCBhcHBlbmQsIGFwcGVuZF9kZXYsIGFzc2lnbiwgYXR0ciwgYXR0cl9kZXYsIGJlZm9yZVVwZGF0ZSwgYmluZCwgYmluZGluZ19jYWxsYmFja3MsIGJsYW5rX29iamVjdCwgYnViYmxlLCBjaGVja19vdXRyb3MsIGNoaWxkcmVuLCBjbGFpbV9jb21wb25lbnQsIGNsYWltX2VsZW1lbnQsIGNsYWltX3NwYWNlLCBjbGFpbV90ZXh0LCBjbGVhcl9sb29wcywgY29tcG9uZW50X3N1YnNjcmliZSwgY29tcHV0ZV9yZXN0X3Byb3BzLCBjcmVhdGVFdmVudERpc3BhdGNoZXIsIGNyZWF0ZV9hbmltYXRpb24sIGNyZWF0ZV9iaWRpcmVjdGlvbmFsX3RyYW5zaXRpb24sIGNyZWF0ZV9jb21wb25lbnQsIGNyZWF0ZV9pbl90cmFuc2l0aW9uLCBjcmVhdGVfb3V0X3RyYW5zaXRpb24sIGNyZWF0ZV9zbG90LCBjcmVhdGVfc3NyX2NvbXBvbmVudCwgY3VycmVudF9jb21wb25lbnQsIGN1c3RvbV9ldmVudCwgZGF0YXNldF9kZXYsIGRlYnVnLCBkZXN0cm95X2Jsb2NrLCBkZXN0cm95X2NvbXBvbmVudCwgZGVzdHJveV9lYWNoLCBkZXRhY2gsIGRldGFjaF9hZnRlcl9kZXYsIGRldGFjaF9iZWZvcmVfZGV2LCBkZXRhY2hfYmV0d2Vlbl9kZXYsIGRldGFjaF9kZXYsIGRpcnR5X2NvbXBvbmVudHMsIGRpc3BhdGNoX2RldiwgZWFjaCwgZWxlbWVudCwgZWxlbWVudF9pcywgZW1wdHksIGVzY2FwZSwgZXNjYXBlZCwgZXhjbHVkZV9pbnRlcm5hbF9wcm9wcywgZml4X2FuZF9kZXN0cm95X2Jsb2NrLCBmaXhfYW5kX291dHJvX2FuZF9kZXN0cm95X2Jsb2NrLCBmaXhfcG9zaXRpb24sIGZsdXNoLCBnZXRDb250ZXh0LCBnZXRfYmluZGluZ19ncm91cF92YWx1ZSwgZ2V0X2N1cnJlbnRfY29tcG9uZW50LCBnZXRfc2xvdF9jaGFuZ2VzLCBnZXRfc2xvdF9jb250ZXh0LCBnZXRfc3ByZWFkX29iamVjdCwgZ2V0X3NwcmVhZF91cGRhdGUsIGdldF9zdG9yZV92YWx1ZSwgZ2xvYmFscywgZ3JvdXBfb3V0cm9zLCBoYW5kbGVfcHJvbWlzZSwgaGFzX3Byb3AsIGlkZW50aXR5LCBpbml0LCBpbnNlcnQsIGluc2VydF9kZXYsIGludHJvcywgaW52YWxpZF9hdHRyaWJ1dGVfbmFtZV9jaGFyYWN0ZXIsIGlzX2NsaWVudCwgaXNfY3Jvc3NvcmlnaW4sIGlzX2Z1bmN0aW9uLCBpc19wcm9taXNlLCBsaXN0ZW4sIGxpc3Rlbl9kZXYsIGxvb3AsIGxvb3BfZ3VhcmQsIG1pc3NpbmdfY29tcG9uZW50LCBtb3VudF9jb21wb25lbnQsIG5vb3AsIG5vdF9lcXVhbCwgbm93LCBudWxsX3RvX2VtcHR5LCBvYmplY3Rfd2l0aG91dF9wcm9wZXJ0aWVzLCBvbkRlc3Ryb3ksIG9uTW91bnQsIG9uY2UsIG91dHJvX2FuZF9kZXN0cm95X2Jsb2NrLCBwcmV2ZW50X2RlZmF1bHQsIHByb3BfZGV2LCBxdWVyeV9zZWxlY3Rvcl9hbGwsIHJhZiwgcnVuLCBydW5fYWxsLCBzYWZlX25vdF9lcXVhbCwgc2NoZWR1bGVfdXBkYXRlLCBzZWxlY3RfbXVsdGlwbGVfdmFsdWUsIHNlbGVjdF9vcHRpb24sIHNlbGVjdF9vcHRpb25zLCBzZWxlY3RfdmFsdWUsIHNlbGYsIHNldENvbnRleHQsIHNldF9hdHRyaWJ1dGVzLCBzZXRfY3VycmVudF9jb21wb25lbnQsIHNldF9jdXN0b21fZWxlbWVudF9kYXRhLCBzZXRfZGF0YSwgc2V0X2RhdGFfZGV2LCBzZXRfaW5wdXRfdHlwZSwgc2V0X2lucHV0X3ZhbHVlLCBzZXRfbm93LCBzZXRfcmFmLCBzZXRfc3RvcmVfdmFsdWUsIHNldF9zdHlsZSwgc2V0X3N2Z19hdHRyaWJ1dGVzLCBzcGFjZSwgc3ByZWFkLCBzdG9wX3Byb3BhZ2F0aW9uLCBzdWJzY3JpYmUsIHN2Z19lbGVtZW50LCB0ZXh0LCB0aWNrLCB0aW1lX3Jhbmdlc190b19hcnJheSwgdG9fbnVtYmVyLCB0b2dnbGVfY2xhc3MsIHRyYW5zaXRpb25faW4sIHRyYW5zaXRpb25fb3V0LCB1cGRhdGVfa2V5ZWRfZWFjaCwgdmFsaWRhdGVfY29tcG9uZW50LCB2YWxpZGF0ZV9lYWNoX2FyZ3VtZW50LCB2YWxpZGF0ZV9lYWNoX2tleXMsIHZhbGlkYXRlX3Nsb3RzLCB2YWxpZGF0ZV9zdG9yZSwgeGxpbmtfYXR0ciB9O1xuIiwiaW1wb3J0IHsgbm9vcCwgc2FmZV9ub3RfZXF1YWwsIHN1YnNjcmliZSwgcnVuX2FsbCwgaXNfZnVuY3Rpb24gfSBmcm9tICcuLi9pbnRlcm5hbCc7XG5leHBvcnQgeyBnZXRfc3RvcmVfdmFsdWUgYXMgZ2V0IH0gZnJvbSAnLi4vaW50ZXJuYWwnO1xuXG5jb25zdCBzdWJzY3JpYmVyX3F1ZXVlID0gW107XG4vKipcbiAqIENyZWF0ZXMgYSBgUmVhZGFibGVgIHN0b3JlIHRoYXQgYWxsb3dzIHJlYWRpbmcgYnkgc3Vic2NyaXB0aW9uLlxuICogQHBhcmFtIHZhbHVlIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7U3RhcnRTdG9wTm90aWZpZXJ9c3RhcnQgc3RhcnQgYW5kIHN0b3Agbm90aWZpY2F0aW9ucyBmb3Igc3Vic2NyaXB0aW9uc1xuICovXG5mdW5jdGlvbiByZWFkYWJsZSh2YWx1ZSwgc3RhcnQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzdWJzY3JpYmU6IHdyaXRhYmxlKHZhbHVlLCBzdGFydCkuc3Vic2NyaWJlLFxuICAgIH07XG59XG4vKipcbiAqIENyZWF0ZSBhIGBXcml0YWJsZWAgc3RvcmUgdGhhdCBhbGxvd3MgYm90aCB1cGRhdGluZyBhbmQgcmVhZGluZyBieSBzdWJzY3JpcHRpb24uXG4gKiBAcGFyYW0geyo9fXZhbHVlIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7U3RhcnRTdG9wTm90aWZpZXI9fXN0YXJ0IHN0YXJ0IGFuZCBzdG9wIG5vdGlmaWNhdGlvbnMgZm9yIHN1YnNjcmlwdGlvbnNcbiAqL1xuZnVuY3Rpb24gd3JpdGFibGUodmFsdWUsIHN0YXJ0ID0gbm9vcCkge1xuICAgIGxldCBzdG9wO1xuICAgIGNvbnN0IHN1YnNjcmliZXJzID0gW107XG4gICAgZnVuY3Rpb24gc2V0KG5ld192YWx1ZSkge1xuICAgICAgICBpZiAoc2FmZV9ub3RfZXF1YWwodmFsdWUsIG5ld192YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbmV3X3ZhbHVlO1xuICAgICAgICAgICAgaWYgKHN0b3ApIHsgLy8gc3RvcmUgaXMgcmVhZHlcbiAgICAgICAgICAgICAgICBjb25zdCBydW5fcXVldWUgPSAhc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICAgICAgICAgICAgICAgIHNbMV0oKTtcbiAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlcl9xdWV1ZS5wdXNoKHMsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJ1bl9xdWV1ZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN1YnNjcmliZXJfcXVldWUubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXJfcXVldWVbaV1bMF0oc3Vic2NyaWJlcl9xdWV1ZVtpICsgMV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXJfcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gdXBkYXRlKGZuKSB7XG4gICAgICAgIHNldChmbih2YWx1ZSkpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzdWJzY3JpYmUocnVuLCBpbnZhbGlkYXRlID0gbm9vcCkge1xuICAgICAgICBjb25zdCBzdWJzY3JpYmVyID0gW3J1biwgaW52YWxpZGF0ZV07XG4gICAgICAgIHN1YnNjcmliZXJzLnB1c2goc3Vic2NyaWJlcik7XG4gICAgICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHN0b3AgPSBzdGFydChzZXQpIHx8IG5vb3A7XG4gICAgICAgIH1cbiAgICAgICAgcnVuKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHN0b3AoKTtcbiAgICAgICAgICAgICAgICBzdG9wID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgc2V0LCB1cGRhdGUsIHN1YnNjcmliZSB9O1xufVxuZnVuY3Rpb24gZGVyaXZlZChzdG9yZXMsIGZuLCBpbml0aWFsX3ZhbHVlKSB7XG4gICAgY29uc3Qgc2luZ2xlID0gIUFycmF5LmlzQXJyYXkoc3RvcmVzKTtcbiAgICBjb25zdCBzdG9yZXNfYXJyYXkgPSBzaW5nbGVcbiAgICAgICAgPyBbc3RvcmVzXVxuICAgICAgICA6IHN0b3JlcztcbiAgICBjb25zdCBhdXRvID0gZm4ubGVuZ3RoIDwgMjtcbiAgICByZXR1cm4gcmVhZGFibGUoaW5pdGlhbF92YWx1ZSwgKHNldCkgPT4ge1xuICAgICAgICBsZXQgaW5pdGVkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgcGVuZGluZyA9IDA7XG4gICAgICAgIGxldCBjbGVhbnVwID0gbm9vcDtcbiAgICAgICAgY29uc3Qgc3luYyA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChwZW5kaW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZm4oc2luZ2xlID8gdmFsdWVzWzBdIDogdmFsdWVzLCBzZXQpO1xuICAgICAgICAgICAgaWYgKGF1dG8pIHtcbiAgICAgICAgICAgICAgICBzZXQocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNsZWFudXAgPSBpc19mdW5jdGlvbihyZXN1bHQpID8gcmVzdWx0IDogbm9vcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgdW5zdWJzY3JpYmVycyA9IHN0b3Jlc19hcnJheS5tYXAoKHN0b3JlLCBpKSA9PiBzdWJzY3JpYmUoc3RvcmUsICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdmFsdWVzW2ldID0gdmFsdWU7XG4gICAgICAgICAgICBwZW5kaW5nICY9IH4oMSA8PCBpKTtcbiAgICAgICAgICAgIGlmIChpbml0ZWQpIHtcbiAgICAgICAgICAgICAgICBzeW5jKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sICgpID0+IHtcbiAgICAgICAgICAgIHBlbmRpbmcgfD0gKDEgPDwgaSk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgaW5pdGVkID0gdHJ1ZTtcbiAgICAgICAgc3luYygpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gc3RvcCgpIHtcbiAgICAgICAgICAgIHJ1bl9hbGwodW5zdWJzY3JpYmVycyk7XG4gICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgIH07XG4gICAgfSk7XG59XG5cbmV4cG9ydCB7IGRlcml2ZWQsIHJlYWRhYmxlLCB3cml0YWJsZSB9O1xuIiwiaW1wb3J0IHsgd3JpdGFibGUgfSBmcm9tICdzdmVsdGUvc3RvcmUnO1xuXG5leHBvcnQgY29uc3QgYXV0aG9ycyA9IHdyaXRhYmxlKG5ldyBNYXAoKSk7XG4iLCJpbXBvcnQgeyBhdXRob3JzIH0gZnJvbSAnLi9zdG9yZS5qcyc7XG5cbmV4cG9ydCBjb25zdCBnZXRBdXRob3JzID0gYXN5bmMgKGRhdGEgPSBbXSwgZmV0Y2gpID0+IHtcbiAgY29uc3QgYXV0aG9ySWRzID0gbmV3IFNldCgpO1xuICBsZXQgYXV0aG9yTWFwID0gbmV3IE1hcCgpO1xuICBsZXQgYXV0aG9yRGF0YSA9IFtdO1xuXG4gIGF1dGhvcnMuc3Vic2NyaWJlKCh2YWx1ZSkgPT4ge1xuICAgIGF1dGhvck1hcCA9IHZhbHVlO1xuICB9KTtcblxuICAvLyBjcmVhdGluZyB1bmlxdWUgYXV0aG9yIGlkcyBmcm9tIHRoZSBwb3N0c1xuICBkYXRhLmZvckVhY2goKGQpID0+IHtcbiAgICBpZiAoIWF1dGhvck1hcC5nZXQoZC5hdXRob3JJZCkpIHtcbiAgICAgIGF1dGhvcklkcy5hZGQoZC5hdXRob3JJZCk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoYXV0aG9ySWRzLnNpemUgPiAwKSB7XG4gICAgLy8gZ2V0dGluZyBhdXRob3IgZGF0YSBmb3IgYWxsIHVuaXF1ZSBhdXRob3JzIHRvIGF2b2lkIG11bHRpIGZldGNoXG4gICAgYXV0aG9yRGF0YSA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgQXJyYXkuZnJvbShhdXRob3JJZHMpLm1hcChhc3luYyAoaWQpID0+IHtcbiAgICAgICAgLy8gZmVjaGluZyBhdXRob3IgZGF0YVxuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChgQkFTRV9QQVRIL3VzZXJzLyR7aWR9YCk7XG4gICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgfSlcbiAgICApO1xuICAgIC8vIGNyZWF0aW5nIGEgTWFwIHRvIGhvbGQgdW5pcXVlIGF1dGhvcnMgYnkgYXV0aG9ySWQgYXMga2V5XG4gICAgYXV0aG9yRGF0YS5mb3JFYWNoKCh1KSA9PiB7XG4gICAgICBhdXRob3JNYXAuc2V0KHUuX2lkLCB1KTtcbiAgICB9KTtcbiAgICBhdXRob3JzLnNldChhdXRob3JNYXApO1xuICB9XG5cbiAgcmV0dXJuIGF1dGhvck1hcDtcbn07XG4iLCI8c2NyaXB0PlxuICBleHBvcnQgbGV0IGF2YXRoYXI7XG4gIGV4cG9ydCBsZXQgbmFtZTtcbiAgZXhwb3J0IGxldCBjcmVhdGVkRGF0ZTtcbjwvc2NyaXB0PlxuXG48c3R5bGU+XG4gIC5wb3N0LS1hdXRob3Ige1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBhbmltYXRpb246IGZhbGxkb3duIDFzIGVhc2U7XG4gIH1cblxuICAucG9zdC0tYXV0aG9yIC5pbWcge1xuICAgIGJvcmRlci1yYWRpdXM6IDEwMCU7XG4gICAgYm9yZGVyOiAycHggc29saWQgI2IzYjNiMztcbiAgICBib3gtc2hhZG93OiAtM3B4IDZweCA2cHggI2Q4ZDhkODtcbiAgfVxuXG4gIC5kZXRhaWxzIHtcbiAgICBmb250LXNpemU6IHNtYWxsO1xuICAgIG1hcmdpbi1sZWZ0OiA4cHg7XG4gIH1cblxuICBAa2V5ZnJhbWVzIGZhbGxkb3duIHtcbiAgICAwJSB7XG4gICAgICBvcGFjaXR5OiAwLjU7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoLTFweCk7XG4gICAgfVxuXG4gICAgMTAwJSB7XG4gICAgICBvcGFjaXR5OiAxO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApO1xuICAgIH1cbiAgfVxuPC9zdHlsZT5cblxuPGRpdiBjbGFzcz1cInBvc3QtLWF1dGhvclwiPlxuICA8aW1nIGNsYXNzPVwiaW1nXCIgc3JjPXthdmF0aGFyfSBhbHQ9XCJWZWx1IFMgR2F1dGFtXCIgLz5cbiAgPGRpdiBjbGFzcz1cImRldGFpbHNcIj5cbiAgICA8ZGl2IGNsYXNzPVwibmFtZVwiPntuYW1lfTwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJkYXRlXCI+XG4gICAgICB7bmV3IERhdGUoY3JlYXRlZERhdGUpXG4gICAgICAgIC50b0pTT04oKVxuICAgICAgICAuc2xpY2UoMCwgMTApXG4gICAgICAgIC5zcGxpdCgnLScpXG4gICAgICAgIC5yZXZlcnNlKClcbiAgICAgICAgLmpvaW4oJy0nKX1cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2Rpdj5cbiIsIjxzY3JpcHQ+XG4gIGltcG9ydCBBdXRob3IgZnJvbSBcIi4vQXV0aG9yLnN2ZWx0ZVwiO1xuICBleHBvcnQgbGV0IHBvc3Q7XG4gIGV4cG9ydCBsZXQgYXV0aG9yO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cbiAgLnBvc3QtLWNvbnRhaW5lciB7XG4gICAgLyogZ3JpZC1hcmVhOiBwb3N0OyAqL1xuICAgIGFsaWduLXNlbGY6IHN0YXJ0O1xuICB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1pbi13aWR0aDogODAwcHgpIHtcbiAgICAubGlzdGluZy0tY29udGFpbmVyID4gOm50aC1jaGlsZCgxKSB7XG4gICAgICBncmlkLWNvbHVtbjogMSAvIDQ7XG4gICAgICBkaXNwbGF5OiBncmlkO1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAyZnIgMWZyO1xuICAgICAgZ3JpZC1jb2x1bW4tZ2FwOiA1cHg7XG4gICAgfVxuXG4gICAgLmxpc3RpbmctLWNvbnRhaW5lciA6bnRoLWNoaWxkKDEpIC5wb3N0LS10aXRsZS1pbWFnZSB7XG4gICAgICBncmlkLWNvbHVtbjogMSAvIDI7XG4gICAgICBncmlkLXJvdzogMSAvIDQ7XG4gICAgICBhbGlnbi1zZWxmOiBzdGFydDtcbiAgICAgIC8qIGhlaWdodDogMzUwcHg7ICovXG4gICAgfVxuXG4gICAgLmxpc3RpbmctLWNvbnRhaW5lciA6bnRoLWNoaWxkKDEpIC5wb3N0LS1oZWFkZXIge1xuICAgICAgbWFyZ2luLXRvcDogMHB4O1xuICAgICAgbWFyZ2luLWxlZnQ6IDE1cHg7XG4gICAgICBkaXNwbGF5OiBibG9jaztcbiAgICB9XG5cbiAgICAubGlzdGluZy0tY29udGFpbmVyIDpudGgtY2hpbGQoMSkgLnBvc3QtLWhlYWRlciAucG9zdC0tdGl0bGUsXG4gICAgLmxpc3RpbmctLWNvbnRhaW5lciA6bnRoLWNoaWxkKDEpIC5wb3N0LS1oZWFkZXIgLnBvc3QtLXN1YlRpdGxlIHtcbiAgICAgIG1hcmdpbi10b3A6IDBweDtcbiAgICB9XG5cbiAgICA6Z2xvYmFsKC5saXN0aW5nLS1jb250YWluZXIgOm50aC1jaGlsZCgxKSAucG9zdC0tYXV0aG9yKSB7XG4gICAgICBncmlkLWNvbHVtbjogMiAvIDM7XG4gICAgICBncmlkLXJvdzogMyAvIDQ7XG4gICAgICBhbGlnbi1zZWxmOiBzdGFydDtcbiAgICAgIG1hcmdpbi1sZWZ0OiAxNXB4O1xuICAgIH1cbiAgfVxuXG4gIC5wb3N0LS10aXRsZS1pbWFnZSB7XG4gICAgZGlzcGxheTogYmxvY2s7XG4gICAgbWFyZ2luLWJvdHRvbTogMTVweDtcbiAgICB3aWR0aDogMTAwJTtcbiAgfVxuXG4gIGEge1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICBjb2xvcjogdmFyKC0tdGV4dEJsYWNrKTtcbiAgfVxuXG4gIC5wb3N0LS10aXRsZSB7XG4gICAgZm9udC1zaXplOiAxLjVyZW07XG4gICAgZm9udC13ZWlnaHQ6IDUwMDtcbiAgfVxuXG4gIC8qIC5wb3N0LS1hdXRob3Ige1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBhbmltYXRpb246IGZhbGxkb3duIDFzIGVhc2U7XG4gIH1cblxuICAucG9zdC0tYXV0aG9yIC5pbWcge1xuICAgIGJvcmRlci1yYWRpdXM6IDEwMCU7XG4gICAgYm9yZGVyOiAycHggc29saWQgI2IzYjNiMztcbiAgICBib3gtc2hhZG93OiAtM3B4IDZweCA2cHggI2Q4ZDhkODtcbiAgfVxuXG4gIC5kZXRhaWxzIHtcbiAgICBmb250LXNpemU6IHNtYWxsO1xuICAgIG1hcmdpbi1sZWZ0OiA4cHg7XG4gIH0gKi9cblxuICBAa2V5ZnJhbWVzIGZhbGxkb3duIHtcbiAgICAwJSB7XG4gICAgICBvcGFjaXR5OiAwO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKC01MHB4KTtcbiAgICB9XG5cbiAgICAxMDAlIHtcbiAgICAgIG9wYWNpdHk6IDE7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7XG4gICAgfVxuICB9XG48L3N0eWxlPlxuXG48ZGl2IGNsYXNzPVwicG9zdC0tY29udGFpbmVyXCI+XG5cbiAgPGEgaHJlZj17YC4vYmxvZy8ke3Bvc3Qucm91dGV9YH0gcmVsPVwicHJlZmV0Y2hcIj5cbiAgICA8aW1nXG4gICAgICBjbGFzcz1cInBvc3QtLXRpdGxlLWltYWdlXCJcbiAgICAgIHNyYz17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS9saXN0aW5nLmpwZ2B9XG4gICAgICBhbHQ9e3Bvc3Qucm91dGV9IC8+XG4gIDwvYT5cbiAgPGRpdj5cbiAgICA8YSBocmVmPXtgLi9ibG9nLyR7cG9zdC5yb3V0ZX1gfSBjbGFzcz1cInBvc3QtLWhlYWRlclwiIHJlbD1cInByZWZldGNoXCI+XG4gICAgICA8aDMgY2xhc3M9XCJwb3N0LS10aXRsZVwiPntwb3N0LnRpdGxlfTwvaDM+XG4gICAgICA8cCBjbGFzcz1cInBvc3QtLXN1YlRpdGxlXCI+e3Bvc3Quc3ViVGl0bGV9PC9wPlxuICAgIDwvYT5cblxuICAgIDwhLS0gPGRpdiBjbGFzcz1cInBvc3QtLWF1dGhvclwiPlxuICAgICAgPGltZyBjbGFzcz1cImltZ1wiIHNyYz17YXV0aG9yLmF2YXRoYXJ9IGFsdD1cIlZlbHUgUyBHYXV0YW1cIiAvPlxuICAgICAgPGRpdiBjbGFzcz1cImRldGFpbHNcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hbWVcIj57YXV0aG9yLm5hbWV9PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJkYXRlXCI+XG4gICAgICAgICAge25ldyBEYXRlKHBvc3QuY3JlYXRlZERhdGUpXG4gICAgICAgICAgICAudG9KU09OKClcbiAgICAgICAgICAgIC5zbGljZSgwLCAxMClcbiAgICAgICAgICAgIC5zcGxpdCgnLScpXG4gICAgICAgICAgICAucmV2ZXJzZSgpXG4gICAgICAgICAgICAuam9pbignLScpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PiAtLT5cbiAgICA8QXV0aG9yXG4gICAgICBuYW1lPXthdXRob3IubmFtZX1cbiAgICAgIGF2YXRoYXI9e2F1dGhvci5hdmF0aGFyfVxuICAgICAgY3JlYXRlZERhdGU9e3Bvc3QuY3JlYXRlZERhdGV9IC8+XG4gIDwvZGl2PlxuXG48L2Rpdj5cbiIsIjxzY3JpcHQgY29udGV4dD1cIm1vZHVsZVwiPlxuICBpbXBvcnQgeyBnZXRBdXRob3JzIH0gZnJvbSBcIi4uL19oZWxwZXJzL2dldC1hdXRob3JzLmpzXCI7XG4gIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcmVsb2FkKHsgcGF0aCB9KSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5mZXRjaChcIkJBU0VfUEFUSC9wb3N0cy9saW1pdC83XCIpO1xuXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcy5qc29uKCk7XG5cbiAgICAvLyBjaGVja2luZyBpZiBkYXRhIHN0YXR1cyBpcyAyMDAgYW5kIGRhdGEgaXMgYW4gYXJyYXlcbiAgICBpZiAocmVzLnN0YXR1cyA9PT0gMjAwICYmIEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgIC8vIGNyZWF0aW5nIGEgbmV3IHNldCB0byBob2xkIHVuaXF1ZSBhdXRob3IgaWRzXG5cbiAgICAgIGNvbnN0IGF1dGhvck1hcCA9IGF3YWl0IGdldEF1dGhvcnMoZGF0YSwgdGhpcy5mZXRjaCk7XG5cbiAgICAgIHJldHVybiB7IHBvc3RzOiBkYXRhLCBhdXRob3JNYXAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lcnJvcihyZXMuc3RhdHVzLCBkYXRhLm1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuPC9zY3JpcHQ+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBQb3N0IGZyb20gXCIuLi9jb21wb25lbnRzL1Bvc3Quc3ZlbHRlXCI7XG4gIGV4cG9ydCBsZXQgcG9zdHM7XG4gIGV4cG9ydCBsZXQgYXV0aG9yTWFwO1xuPC9zY3JpcHQ+XG5cbjxzdmVsdGU6aGVhZD5cbiAgPHRpdGxlPkhlY3RhbmUgfCBIb21lIFBhZ2U8L3RpdGxlPlxuICA8bWV0YVxuICAgIG5hbWU9XCJkZXNjcmlwdGlvblwiXG4gICAgY29udGVudD1cIkhlY3RhbmUgaXMgYSBzaW1wbGUgYmxvZyBjb3ZlcmluZyBleHBlcmllbmNlcyBmcm9tIGl0cyBhdXRob3JzLiBJdFxuICAgIG5vdyBjb3ZlcnMgYXJlYXMgbGlrZSBUZWNobm9sb2d5LCBJbnRlcnZpZXdzLCBUcmF2ZWxvZ3VlIGFuZCBMZWFybmluZ3MuIElcbiAgICBWZWx1IFMgR2F1dGFtIChDb3JlIERldmVsb3Blcikgb2YgdGhlIGJsb2cgaW52aXRlIGNvbnRyaWJ1dGlvbnMgZnJvbSBvdGhlcnNcbiAgICB3aXRoIHNpbWlsYXIgZXhwZXJpZW5jZXMuIFRoZSBiZWxvdyB0b3BpY3MgYXJlIHRoZSB0b3AgMTAgaW4gdGhlIHBhZ2Ugbm93LiBcIiAvPlxuPC9zdmVsdGU6aGVhZD5cblxuPGRpdiBjbGFzcz1cImxpc3RpbmctLWNvbnRhaW5lclwiPlxuICB7I2VhY2ggcG9zdHMgYXMgcG9zdH1cbiAgICA8UG9zdCB7cG9zdH0gYXV0aG9yPXthdXRob3JNYXAuZ2V0KHBvc3QuYXV0aG9ySWQpfSAvPlxuICB7L2VhY2h9XG48L2Rpdj5cbiIsIjxzY3JpcHQgY29udGV4dD1cIm1vZHVsZVwiPlxuICBpbXBvcnQgeyBnZXRBdXRob3JzIH0gZnJvbSBcIi4uL19oZWxwZXJzL2dldC1hdXRob3JzLmpzXCI7XG4gIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcmVsb2FkKHsgcGF0aCB9LCBzZXNzaW9uKSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5mZXRjaChgQkFTRV9QQVRIL3Bvc3RzJHtwYXRofS83YCk7XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcblxuICAgIC8vIGNoZWNraW5nIGlmIGRhdGEgc3RhdHVzIGlzIDIwMCBhbmQgZGF0YSBpcyBhbiBhcnJheVxuICAgIGlmIChyZXMuc3RhdHVzID09PSAyMDAgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgY29uc3QgYXV0aG9yTWFwID0gYXdhaXQgZ2V0QXV0aG9ycyhkYXRhLCB0aGlzLmZldGNoKTtcblxuICAgICAgcmV0dXJuIHsgcG9zdHM6IGRhdGEsIGF1dGhvck1hcCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVycm9yKHJlcy5zdGF0dXMsIGRhdGEubWVzc2FnZSk7XG4gICAgfVxuICB9XG48L3NjcmlwdD5cblxuPHNjcmlwdD5cbiAgaW1wb3J0IFBvc3QgZnJvbSBcIi4uL2NvbXBvbmVudHMvUG9zdC5zdmVsdGVcIjtcbiAgZXhwb3J0IGxldCBwb3N0cztcbiAgZXhwb3J0IGxldCBhdXRob3JNYXA7XG48L3NjcmlwdD5cblxuPHN2ZWx0ZTpoZWFkPlxuICA8dGl0bGU+SGVjdGFuZSB8IEhvbWUgUGFnZTwvdGl0bGU+XG4gIDxtZXRhXG4gICAgbmFtZT1cImRlc2NyaXB0aW9uXCJcbiAgICBjb250ZW50PVwiSGVjdGFuZSBpcyBhIHNpbXBsZSBibG9nIGNvdmVyaW5nIGV4cGVyaWVuY2VzIGZyb20gaXRzIGF1dGhvcnMuIEl0XG4gICAgbm93IGNvdmVycyBhcmVhcyBsaWtlIFRlY2hub2xvZ3ksIEludGVydmlld3MsIFRyYXZlbG9ndWUgYW5kIExlYXJuaW5ncy4gSVxuICAgIFZlbHUgUyBHYXV0YW0gKENvcmUgRGV2ZWxvcGVyKSBvZiB0aGUgYmxvZyBpbnZpdGUgY29udHJpYnV0aW9ucyBmcm9tIG90aGVyc1xuICAgIHdpdGggc2ltaWxhciBleHBlcmllbmNlcy4gVGhlIGJlbG93IHRvcGljcyBhcmUgdGhlIHRvcCAxMCBpbiB0aGUgcGFnZSBub3cuIFwiIC8+XG48L3N2ZWx0ZTpoZWFkPlxuXG48ZGl2IGNsYXNzPVwibGlzdGluZy0tY29udGFpbmVyXCI+XG4gIHsjZWFjaCBwb3N0cyBhcyBwb3N0fVxuICAgIDxQb3N0IHtwb3N0fSBhdXRob3I9e2F1dGhvck1hcC5nZXQocG9zdC5hdXRob3JJZCl9IC8+XG4gIHsvZWFjaH1cbjwvZGl2PlxuIiwiPHNjcmlwdCBjb250ZXh0PVwibW9kdWxlXCI+XG4gIGltcG9ydCB7IGdldEF1dGhvcnMgfSBmcm9tIFwiLi4vX2hlbHBlcnMvZ2V0LWF1dGhvcnMuanNcIjtcbiAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByZWxvYWQoeyBwYXRoIH0sIHNlc3Npb24pIHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLmZldGNoKGBCQVNFX1BBVEgvcG9zdHMke3BhdGh9LzdgKTtcblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXMuanNvbigpO1xuXG4gICAgLy8gY2hlY2tpbmcgaWYgZGF0YSBzdGF0dXMgaXMgMjAwIGFuZCBkYXRhIGlzIGFuIGFycmF5XG4gICAgaWYgKHJlcy5zdGF0dXMgPT09IDIwMCAmJiBBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICBjb25zdCBhdXRob3JNYXAgPSBhd2FpdCBnZXRBdXRob3JzKGRhdGEsIHRoaXMuZmV0Y2gpO1xuXG4gICAgICByZXR1cm4geyBwb3N0czogZGF0YSwgYXV0aG9yTWFwIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZXJyb3IocmVzLnN0YXR1cywgZGF0YS5tZXNzYWdlKTtcbiAgICB9XG4gIH1cbjwvc2NyaXB0PlxuXG48c2NyaXB0PlxuICBpbXBvcnQgUG9zdCBmcm9tIFwiLi4vY29tcG9uZW50cy9Qb3N0LnN2ZWx0ZVwiO1xuICBleHBvcnQgbGV0IHBvc3RzO1xuICBleHBvcnQgbGV0IGF1dGhvck1hcDtcbjwvc2NyaXB0PlxuXG48c3ZlbHRlOmhlYWQ+XG4gIDx0aXRsZT5IZWN0YW5lIHwgSG9tZSBQYWdlPC90aXRsZT5cbiAgPG1ldGFcbiAgICBuYW1lPVwiZGVzY3JpcHRpb25cIlxuICAgIGNvbnRlbnQ9XCJIZWN0YW5lIGlzIGEgc2ltcGxlIGJsb2cgY292ZXJpbmcgZXhwZXJpZW5jZXMgZnJvbSBpdHMgYXV0aG9ycy4gSXRcbiAgICBub3cgY292ZXJzIGFyZWFzIGxpa2UgVGVjaG5vbG9neSwgSW50ZXJ2aWV3cywgVHJhdmVsb2d1ZSBhbmQgTGVhcm5pbmdzLiBJXG4gICAgVmVsdSBTIEdhdXRhbSAoQ29yZSBEZXZlbG9wZXIpIG9mIHRoZSBibG9nIGludml0ZSBjb250cmlidXRpb25zIGZyb20gb3RoZXJzXG4gICAgd2l0aCBzaW1pbGFyIGV4cGVyaWVuY2VzLiBUaGUgYmVsb3cgdG9waWNzIGFyZSB0aGUgdG9wIDEwIGluIHRoZSBwYWdlIG5vdy4gXCIgLz5cbjwvc3ZlbHRlOmhlYWQ+XG5cbjxkaXYgY2xhc3M9XCJsaXN0aW5nLS1jb250YWluZXJcIj5cbiAgeyNlYWNoIHBvc3RzIGFzIHBvc3R9XG4gICAgPFBvc3Qge3Bvc3R9IGF1dGhvcj17YXV0aG9yTWFwLmdldChwb3N0LmF1dGhvcklkKX0gLz5cbiAgey9lYWNofVxuPC9kaXY+XG4iLCI8c2NyaXB0IGNvbnRleHQ9XCJtb2R1bGVcIj5cbiAgaW1wb3J0IHsgZ2V0QXV0aG9ycyB9IGZyb20gXCIuLi9faGVscGVycy9nZXQtYXV0aG9ycy5qc1wiO1xuICBleHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJlbG9hZCh7IHBhdGggfSwgc2Vzc2lvbikge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMuZmV0Y2goYEJBU0VfUEFUSC9wb3N0cyR7cGF0aH0vN2ApO1xuXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcy5qc29uKCk7XG5cbiAgICAvLyBjaGVja2luZyBpZiBkYXRhIHN0YXR1cyBpcyAyMDAgYW5kIGRhdGEgaXMgYW4gYXJyYXlcbiAgICBpZiAocmVzLnN0YXR1cyA9PT0gMjAwICYmIEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgIGNvbnN0IGF1dGhvck1hcCA9IGF3YWl0IGdldEF1dGhvcnMoZGF0YSwgdGhpcy5mZXRjaCk7XG5cbiAgICAgIHJldHVybiB7IHBvc3RzOiBkYXRhLCBhdXRob3JNYXAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lcnJvcihyZXMuc3RhdHVzLCBkYXRhLm1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuPC9zY3JpcHQ+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBQb3N0IGZyb20gXCIuLi9jb21wb25lbnRzL1Bvc3Quc3ZlbHRlXCI7XG4gIGV4cG9ydCBsZXQgcG9zdHM7XG4gIGV4cG9ydCBsZXQgYXV0aG9yTWFwO1xuPC9zY3JpcHQ+XG5cbjxzdmVsdGU6aGVhZD5cbiAgPHRpdGxlPkhlY3RhbmUgfCBIb21lIFBhZ2U8L3RpdGxlPlxuICA8bWV0YVxuICAgIG5hbWU9XCJkZXNjcmlwdGlvblwiXG4gICAgY29udGVudD1cIkhlY3RhbmUgaXMgYSBzaW1wbGUgYmxvZyBjb3ZlcmluZyBleHBlcmllbmNlcyBmcm9tIGl0cyBhdXRob3JzLiBJdFxuICAgIG5vdyBjb3ZlcnMgYXJlYXMgbGlrZSBUZWNobm9sb2d5LCBJbnRlcnZpZXdzLCBUcmF2ZWxvZ3VlIGFuZCBMZWFybmluZ3MuIElcbiAgICBWZWx1IFMgR2F1dGFtIChDb3JlIERldmVsb3Blcikgb2YgdGhlIGJsb2cgaW52aXRlIGNvbnRyaWJ1dGlvbnMgZnJvbSBvdGhlcnNcbiAgICB3aXRoIHNpbWlsYXIgZXhwZXJpZW5jZXMuIFRoZSBiZWxvdyB0b3BpY3MgYXJlIHRoZSB0b3AgMTAgaW4gdGhlIHBhZ2Ugbm93LiBcIiAvPlxuPC9zdmVsdGU6aGVhZD5cblxuPGRpdiBjbGFzcz1cImxpc3RpbmctLWNvbnRhaW5lclwiPlxuICB7I2VhY2ggcG9zdHMgYXMgcG9zdH1cbiAgICA8UG9zdCB7cG9zdH0gYXV0aG9yPXthdXRob3JNYXAuZ2V0KHBvc3QuYXV0aG9ySWQpfSAvPlxuICB7L2VhY2h9XG48L2Rpdj5cbiIsIjxzY3JpcHQgY29udGV4dD1cIm1vZHVsZVwiPlxuICBpbXBvcnQgeyBnZXRBdXRob3JzIH0gZnJvbSBcIi4uL19oZWxwZXJzL2dldC1hdXRob3JzLmpzXCI7XG4gIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcmVsb2FkKHsgcGF0aCB9LCBzZXNzaW9uKSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5mZXRjaChgQkFTRV9QQVRIL3Bvc3RzJHtwYXRofS83YCk7XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcblxuICAgIC8vIGNoZWNraW5nIGlmIGRhdGEgc3RhdHVzIGlzIDIwMCBhbmQgZGF0YSBpcyBhbiBhcnJheVxuICAgIGlmIChyZXMuc3RhdHVzID09PSAyMDAgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgY29uc3QgYXV0aG9yTWFwID0gYXdhaXQgZ2V0QXV0aG9ycyhkYXRhLCB0aGlzLmZldGNoKTtcbiAgICAgIHJldHVybiB7IHBvc3RzOiBkYXRhLCBhdXRob3JNYXAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lcnJvcihyZXMuc3RhdHVzLCBkYXRhLm1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuPC9zY3JpcHQ+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBQb3N0IGZyb20gXCIuLi9jb21wb25lbnRzL1Bvc3Quc3ZlbHRlXCI7XG4gIGV4cG9ydCBsZXQgcG9zdHM7XG4gIGV4cG9ydCBsZXQgYXV0aG9yTWFwO1xuPC9zY3JpcHQ+XG5cbjxzdmVsdGU6aGVhZD5cbiAgPHRpdGxlPkhlY3RhbmUgfCBIb21lIFBhZ2U8L3RpdGxlPlxuICA8bWV0YVxuICAgIG5hbWU9XCJkZXNjcmlwdGlvblwiXG4gICAgY29udGVudD1cIkhlY3RhbmUgaXMgYSBzaW1wbGUgYmxvZyBjb3ZlcmluZyBleHBlcmllbmNlcyBmcm9tIGl0cyBhdXRob3JzLiBJdFxuICAgIG5vdyBjb3ZlcnMgYXJlYXMgbGlrZSBUZWNobm9sb2d5LCBJbnRlcnZpZXdzLCBUcmF2ZWxvZ3VlIGFuZCBMZWFybmluZ3MuIElcbiAgICBWZWx1IFMgR2F1dGFtIChDb3JlIERldmVsb3Blcikgb2YgdGhlIGJsb2cgaW52aXRlIGNvbnRyaWJ1dGlvbnMgZnJvbSBvdGhlcnNcbiAgICB3aXRoIHNpbWlsYXIgZXhwZXJpZW5jZXMuIFRoZSBiZWxvdyB0b3BpY3MgYXJlIHRoZSB0b3AgMTAgaW4gdGhlIHBhZ2Ugbm93LiBcIiAvPlxuPC9zdmVsdGU6aGVhZD5cblxuPGRpdiBjbGFzcz1cImxpc3RpbmctLWNvbnRhaW5lclwiPlxuICB7I2VhY2ggcG9zdHMgYXMgcG9zdH1cbiAgICA8UG9zdCB7cG9zdH0gYXV0aG9yPXthdXRob3JNYXAuZ2V0KHBvc3QuYXV0aG9ySWQpfSAvPlxuICB7L2VhY2h9XG48L2Rpdj5cbiIsIi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zdWJzdGFjay9kZWVwLWZyZWV6ZS9ibG9iL21hc3Rlci9pbmRleC5qc1xuZnVuY3Rpb24gZGVlcEZyZWV6ZSAobykge1xuICBPYmplY3QuZnJlZXplKG8pO1xuXG4gIHZhciBvYmpJc0Z1bmN0aW9uID0gdHlwZW9mIG8gPT09ICdmdW5jdGlvbic7XG5cbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgIGlmIChvLmhhc093blByb3BlcnR5KHByb3ApXG4gICAgJiYgb1twcm9wXSAhPT0gbnVsbFxuICAgICYmICh0eXBlb2Ygb1twcm9wXSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2Ygb1twcm9wXSA9PT0gXCJmdW5jdGlvblwiKVxuICAgIC8vIElFMTEgZml4OiBodHRwczovL2dpdGh1Yi5jb20vaGlnaGxpZ2h0anMvaGlnaGxpZ2h0LmpzL2lzc3Vlcy8yMzE4XG4gICAgLy8gVE9ETzogcmVtb3ZlIGluIHRoZSBmdXR1cmVcbiAgICAmJiAob2JqSXNGdW5jdGlvbiA/IHByb3AgIT09ICdjYWxsZXInICYmIHByb3AgIT09ICdjYWxsZWUnICYmIHByb3AgIT09ICdhcmd1bWVudHMnIDogdHJ1ZSlcbiAgICAmJiAhT2JqZWN0LmlzRnJvemVuKG9bcHJvcF0pKSB7XG4gICAgICBkZWVwRnJlZXplKG9bcHJvcF0pO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIG87XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUhUTUwodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcbn1cblxuXG4vKipcbiAqIHBlcmZvcm1zIGEgc2hhbGxvdyBtZXJnZSBvZiBtdWx0aXBsZSBvYmplY3RzIGludG8gb25lXG4gKlxuICogQGFyZ3VtZW50cyBsaXN0IG9mIG9iamVjdHMgd2l0aCBwcm9wZXJ0aWVzIHRvIG1lcmdlXG4gKiBAcmV0dXJucyBhIHNpbmdsZSBuZXcgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIGluaGVyaXQocGFyZW50KSB7ICAvLyBpbmhlcml0KHBhcmVudCwgb3ZlcnJpZGVfb2JqLCBvdmVycmlkZV9vYmosIC4uLilcbiAgdmFyIGtleTtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICB2YXIgb2JqZWN0cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgZm9yIChrZXkgaW4gcGFyZW50KVxuICAgIHJlc3VsdFtrZXldID0gcGFyZW50W2tleV07XG4gIG9iamVjdHMuZm9yRWFjaChmdW5jdGlvbihvYmopIHtcbiAgICBmb3IgKGtleSBpbiBvYmopXG4gICAgICByZXN1bHRba2V5XSA9IG9ialtrZXldO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyogU3RyZWFtIG1lcmdpbmcgKi9cblxuXG5mdW5jdGlvbiB0YWcobm9kZSkge1xuICByZXR1cm4gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xufVxuXG5cbmZ1bmN0aW9uIG5vZGVTdHJlYW0obm9kZSkge1xuICB2YXIgcmVzdWx0ID0gW107XG4gIChmdW5jdGlvbiBfbm9kZVN0cmVhbShub2RlLCBvZmZzZXQpIHtcbiAgICBmb3IgKHZhciBjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZDsgY2hpbGQ7IGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmcpIHtcbiAgICAgIGlmIChjaGlsZC5ub2RlVHlwZSA9PT0gMylcbiAgICAgICAgb2Zmc2V0ICs9IGNoaWxkLm5vZGVWYWx1ZS5sZW5ndGg7XG4gICAgICBlbHNlIGlmIChjaGlsZC5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgZXZlbnQ6ICdzdGFydCcsXG4gICAgICAgICAgb2Zmc2V0OiBvZmZzZXQsXG4gICAgICAgICAgbm9kZTogY2hpbGRcbiAgICAgICAgfSk7XG4gICAgICAgIG9mZnNldCA9IF9ub2RlU3RyZWFtKGNoaWxkLCBvZmZzZXQpO1xuICAgICAgICAvLyBQcmV2ZW50IHZvaWQgZWxlbWVudHMgZnJvbSBoYXZpbmcgYW4gZW5kIHRhZyB0aGF0IHdvdWxkIGFjdHVhbGx5XG4gICAgICAgIC8vIGRvdWJsZSB0aGVtIGluIHRoZSBvdXRwdXQuIFRoZXJlIGFyZSBtb3JlIHZvaWQgZWxlbWVudHMgaW4gSFRNTFxuICAgICAgICAvLyBidXQgd2UgbGlzdCBvbmx5IHRob3NlIHJlYWxpc3RpY2FsbHkgZXhwZWN0ZWQgaW4gY29kZSBkaXNwbGF5LlxuICAgICAgICBpZiAoIXRhZyhjaGlsZCkubWF0Y2goL2JyfGhyfGltZ3xpbnB1dC8pKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgZXZlbnQ6ICdzdG9wJyxcbiAgICAgICAgICAgIG9mZnNldDogb2Zmc2V0LFxuICAgICAgICAgICAgbm9kZTogY2hpbGRcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2Zmc2V0O1xuICB9KShub2RlLCAwKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gbWVyZ2VTdHJlYW1zKG9yaWdpbmFsLCBoaWdobGlnaHRlZCwgdmFsdWUpIHtcbiAgdmFyIHByb2Nlc3NlZCA9IDA7XG4gIHZhciByZXN1bHQgPSAnJztcbiAgdmFyIG5vZGVTdGFjayA9IFtdO1xuXG4gIGZ1bmN0aW9uIHNlbGVjdFN0cmVhbSgpIHtcbiAgICBpZiAoIW9yaWdpbmFsLmxlbmd0aCB8fCAhaGlnaGxpZ2h0ZWQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gb3JpZ2luYWwubGVuZ3RoID8gb3JpZ2luYWwgOiBoaWdobGlnaHRlZDtcbiAgICB9XG4gICAgaWYgKG9yaWdpbmFsWzBdLm9mZnNldCAhPT0gaGlnaGxpZ2h0ZWRbMF0ub2Zmc2V0KSB7XG4gICAgICByZXR1cm4gKG9yaWdpbmFsWzBdLm9mZnNldCA8IGhpZ2hsaWdodGVkWzBdLm9mZnNldCkgPyBvcmlnaW5hbCA6IGhpZ2hsaWdodGVkO1xuICAgIH1cblxuICAgIC8qXG4gICAgVG8gYXZvaWQgc3RhcnRpbmcgdGhlIHN0cmVhbSBqdXN0IGJlZm9yZSBpdCBzaG91bGQgc3RvcCB0aGUgb3JkZXIgaXNcbiAgICBlbnN1cmVkIHRoYXQgb3JpZ2luYWwgYWx3YXlzIHN0YXJ0cyBmaXJzdCBhbmQgY2xvc2VzIGxhc3Q6XG5cbiAgICBpZiAoZXZlbnQxID09ICdzdGFydCcgJiYgZXZlbnQyID09ICdzdGFydCcpXG4gICAgICByZXR1cm4gb3JpZ2luYWw7XG4gICAgaWYgKGV2ZW50MSA9PSAnc3RhcnQnICYmIGV2ZW50MiA9PSAnc3RvcCcpXG4gICAgICByZXR1cm4gaGlnaGxpZ2h0ZWQ7XG4gICAgaWYgKGV2ZW50MSA9PSAnc3RvcCcgJiYgZXZlbnQyID09ICdzdGFydCcpXG4gICAgICByZXR1cm4gb3JpZ2luYWw7XG4gICAgaWYgKGV2ZW50MSA9PSAnc3RvcCcgJiYgZXZlbnQyID09ICdzdG9wJylcbiAgICAgIHJldHVybiBoaWdobGlnaHRlZDtcblxuICAgIC4uLiB3aGljaCBpcyBjb2xsYXBzZWQgdG86XG4gICAgKi9cbiAgICByZXR1cm4gaGlnaGxpZ2h0ZWRbMF0uZXZlbnQgPT09ICdzdGFydCcgPyBvcmlnaW5hbCA6IGhpZ2hsaWdodGVkO1xuICB9XG5cbiAgZnVuY3Rpb24gb3Blbihub2RlKSB7XG4gICAgZnVuY3Rpb24gYXR0cl9zdHIoYSkge1xuICAgICAgcmV0dXJuICcgJyArIGEubm9kZU5hbWUgKyAnPVwiJyArIGVzY2FwZUhUTUwoYS52YWx1ZSkucmVwbGFjZSgvXCIvZywgJyZxdW90OycpICsgJ1wiJztcbiAgICB9XG4gICAgcmVzdWx0ICs9ICc8JyArIHRhZyhub2RlKSArIFtdLm1hcC5jYWxsKG5vZGUuYXR0cmlidXRlcywgYXR0cl9zdHIpLmpvaW4oJycpICsgJz4nO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xvc2Uobm9kZSkge1xuICAgIHJlc3VsdCArPSAnPC8nICsgdGFnKG5vZGUpICsgJz4nO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVuZGVyKGV2ZW50KSB7XG4gICAgKGV2ZW50LmV2ZW50ID09PSAnc3RhcnQnID8gb3BlbiA6IGNsb3NlKShldmVudC5ub2RlKTtcbiAgfVxuXG4gIHdoaWxlIChvcmlnaW5hbC5sZW5ndGggfHwgaGlnaGxpZ2h0ZWQubGVuZ3RoKSB7XG4gICAgdmFyIHN0cmVhbSA9IHNlbGVjdFN0cmVhbSgpO1xuICAgIHJlc3VsdCArPSBlc2NhcGVIVE1MKHZhbHVlLnN1YnN0cmluZyhwcm9jZXNzZWQsIHN0cmVhbVswXS5vZmZzZXQpKTtcbiAgICBwcm9jZXNzZWQgPSBzdHJlYW1bMF0ub2Zmc2V0O1xuICAgIGlmIChzdHJlYW0gPT09IG9yaWdpbmFsKSB7XG4gICAgICAvKlxuICAgICAgT24gYW55IG9wZW5pbmcgb3IgY2xvc2luZyB0YWcgb2YgdGhlIG9yaWdpbmFsIG1hcmt1cCB3ZSBmaXJzdCBjbG9zZVxuICAgICAgdGhlIGVudGlyZSBoaWdobGlnaHRlZCBub2RlIHN0YWNrLCB0aGVuIHJlbmRlciB0aGUgb3JpZ2luYWwgdGFnIGFsb25nXG4gICAgICB3aXRoIGFsbCB0aGUgZm9sbG93aW5nIG9yaWdpbmFsIHRhZ3MgYXQgdGhlIHNhbWUgb2Zmc2V0IGFuZCB0aGVuXG4gICAgICByZW9wZW4gYWxsIHRoZSB0YWdzIG9uIHRoZSBoaWdobGlnaHRlZCBzdGFjay5cbiAgICAgICovXG4gICAgICBub2RlU3RhY2sucmV2ZXJzZSgpLmZvckVhY2goY2xvc2UpO1xuICAgICAgZG8ge1xuICAgICAgICByZW5kZXIoc3RyZWFtLnNwbGljZSgwLCAxKVswXSk7XG4gICAgICAgIHN0cmVhbSA9IHNlbGVjdFN0cmVhbSgpO1xuICAgICAgfSB3aGlsZSAoc3RyZWFtID09PSBvcmlnaW5hbCAmJiBzdHJlYW0ubGVuZ3RoICYmIHN0cmVhbVswXS5vZmZzZXQgPT09IHByb2Nlc3NlZCk7XG4gICAgICBub2RlU3RhY2sucmV2ZXJzZSgpLmZvckVhY2gob3Blbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChzdHJlYW1bMF0uZXZlbnQgPT09ICdzdGFydCcpIHtcbiAgICAgICAgbm9kZVN0YWNrLnB1c2goc3RyZWFtWzBdLm5vZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZVN0YWNrLnBvcCgpO1xuICAgICAgfVxuICAgICAgcmVuZGVyKHN0cmVhbS5zcGxpY2UoMCwgMSlbMF0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0ICsgZXNjYXBlSFRNTCh2YWx1ZS5zdWJzdHIocHJvY2Vzc2VkKSk7XG59XG5cbnZhciB1dGlscyA9IC8qI19fUFVSRV9fKi9PYmplY3QuZnJlZXplKHtcbiAgX19wcm90b19fOiBudWxsLFxuICBlc2NhcGVIVE1MOiBlc2NhcGVIVE1MLFxuICBpbmhlcml0OiBpbmhlcml0LFxuICBub2RlU3RyZWFtOiBub2RlU3RyZWFtLFxuICBtZXJnZVN0cmVhbXM6IG1lcmdlU3RyZWFtc1xufSk7XG5cbmNvbnN0IFNQQU5fQ0xPU0UgPSAnPC9zcGFuPic7XG5cbmNvbnN0IGVtaXRzV3JhcHBpbmdUYWdzID0gKG5vZGUpID0+IHtcbiAgcmV0dXJuICEhbm9kZS5raW5kO1xufTtcblxuY2xhc3MgSFRNTFJlbmRlcmVyIHtcbiAgY29uc3RydWN0b3IodHJlZSwgb3B0aW9ucykge1xuICAgIHRoaXMuYnVmZmVyID0gXCJcIjtcbiAgICB0aGlzLmNsYXNzUHJlZml4ID0gb3B0aW9ucy5jbGFzc1ByZWZpeDtcbiAgICB0cmVlLndhbGsodGhpcyk7XG4gIH1cblxuICAvLyByZW5kZXJlciBBUElcblxuICBhZGRUZXh0KHRleHQpIHtcbiAgICB0aGlzLmJ1ZmZlciArPSBlc2NhcGVIVE1MKHRleHQpO1xuICB9XG5cbiAgb3Blbk5vZGUobm9kZSkge1xuICAgIGlmICghZW1pdHNXcmFwcGluZ1RhZ3Mobm9kZSkpIHJldHVybjtcblxuICAgIGxldCBjbGFzc05hbWUgPSBub2RlLmtpbmQ7XG4gICAgaWYgKCFub2RlLnN1Ymxhbmd1YWdlKVxuICAgICAgY2xhc3NOYW1lID0gYCR7dGhpcy5jbGFzc1ByZWZpeH0ke2NsYXNzTmFtZX1gO1xuICAgIHRoaXMuc3BhbihjbGFzc05hbWUpO1xuICB9XG5cbiAgY2xvc2VOb2RlKG5vZGUpIHtcbiAgICBpZiAoIWVtaXRzV3JhcHBpbmdUYWdzKG5vZGUpKSByZXR1cm47XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBTUEFOX0NMT1NFO1xuICB9XG5cbiAgLy8gaGVscGVyc1xuXG4gIHNwYW4oY2xhc3NOYW1lKSB7XG4gICAgdGhpcy5idWZmZXIgKz0gYDxzcGFuIGNsYXNzPVwiJHtjbGFzc05hbWV9XCI+YDtcbiAgfVxuXG4gIHZhbHVlKCkge1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlcjtcbiAgfVxufVxuXG5jbGFzcyBUb2tlblRyZWUge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnJvb3ROb2RlID0geyBjaGlsZHJlbjogW10gfTtcbiAgICB0aGlzLnN0YWNrID0gWyB0aGlzLnJvb3ROb2RlIF07XG4gIH1cblxuICBnZXQgdG9wKCkge1xuICAgIHJldHVybiB0aGlzLnN0YWNrW3RoaXMuc3RhY2subGVuZ3RoIC0gMV07XG4gIH1cblxuICBnZXQgcm9vdCgpIHsgcmV0dXJuIHRoaXMucm9vdE5vZGUgfTtcblxuICBhZGQobm9kZSkge1xuICAgIHRoaXMudG9wLmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gIH1cblxuICBvcGVuTm9kZShraW5kKSB7XG4gICAgbGV0IG5vZGUgPSB7IGtpbmQsIGNoaWxkcmVuOiBbXSB9O1xuICAgIHRoaXMuYWRkKG5vZGUpO1xuICAgIHRoaXMuc3RhY2sucHVzaChub2RlKTtcbiAgfVxuXG4gIGNsb3NlTm9kZSgpIHtcbiAgICBpZiAodGhpcy5zdGFjay5sZW5ndGggPiAxKVxuICAgICAgcmV0dXJuIHRoaXMuc3RhY2sucG9wKCk7XG4gIH1cblxuICBjbG9zZUFsbE5vZGVzKCkge1xuICAgIHdoaWxlICh0aGlzLmNsb3NlTm9kZSgpKTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5yb290Tm9kZSwgbnVsbCwgNCk7XG4gIH1cblxuICB3YWxrKGJ1aWxkZXIpIHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5fd2FsayhidWlsZGVyLCB0aGlzLnJvb3ROb2RlKTtcbiAgfVxuXG4gIHN0YXRpYyBfd2FsayhidWlsZGVyLCBub2RlKSB7XG4gICAgaWYgKHR5cGVvZiBub2RlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBidWlsZGVyLmFkZFRleHQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlLmNoaWxkcmVuKSB7XG4gICAgICBidWlsZGVyLm9wZW5Ob2RlKG5vZGUpO1xuICAgICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZCkgPT4gdGhpcy5fd2FsayhidWlsZGVyLCBjaGlsZCkpO1xuICAgICAgYnVpbGRlci5jbG9zZU5vZGUobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBidWlsZGVyO1xuICB9XG5cbiAgc3RhdGljIF9jb2xsYXBzZShub2RlKSB7XG4gICAgaWYgKCFub2RlLmNoaWxkcmVuKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChub2RlLmNoaWxkcmVuLmV2ZXJ5KGVsID0+IHR5cGVvZiBlbCA9PT0gXCJzdHJpbmdcIikpIHtcbiAgICAgIG5vZGUudGV4dCA9IG5vZGUuY2hpbGRyZW4uam9pbihcIlwiKTtcbiAgICAgIGRlbGV0ZSBub2RlW1wiY2hpbGRyZW5cIl07XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjaGlsZCA9PT0gXCJzdHJpbmdcIikgcmV0dXJuO1xuICAgICAgICBUb2tlblRyZWUuX2NvbGxhcHNlKGNoaWxkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAgQ3VycmVudGx5IHRoaXMgaXMgYWxsIHByaXZhdGUgQVBJLCBidXQgdGhpcyBpcyB0aGUgbWluaW1hbCBBUEkgbmVjZXNzYXJ5XG4gIHRoYXQgYW4gRW1pdHRlciBtdXN0IGltcGxlbWVudCB0byBmdWxseSBzdXBwb3J0IHRoZSBwYXJzZXIuXG5cbiAgTWluaW1hbCBpbnRlcmZhY2U6XG5cbiAgLSBhZGRLZXl3b3JkKHRleHQsIGtpbmQpXG4gIC0gYWRkVGV4dCh0ZXh0KVxuICAtIGFkZFN1Ymxhbmd1YWdlKGVtaXR0ZXIsIHN1YkxhbmdhdWdlTmFtZSlcbiAgLSBmaW5hbGl6ZSgpXG4gIC0gb3Blbk5vZGUoa2luZClcbiAgLSBjbG9zZU5vZGUoKVxuICAtIGNsb3NlQWxsTm9kZXMoKVxuICAtIHRvSFRNTCgpXG5cbiovXG5jbGFzcyBUb2tlblRyZWVFbWl0dGVyIGV4dGVuZHMgVG9rZW5UcmVlIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIGFkZEtleXdvcmQodGV4dCwga2luZCkge1xuICAgIGlmICh0ZXh0ID09PSBcIlwiKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5vcGVuTm9kZShraW5kKTtcbiAgICB0aGlzLmFkZFRleHQodGV4dCk7XG4gICAgdGhpcy5jbG9zZU5vZGUoKTtcbiAgfVxuXG4gIGFkZFRleHQodGV4dCkge1xuICAgIGlmICh0ZXh0ID09PSBcIlwiKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5hZGQodGV4dCk7XG4gIH1cblxuICBhZGRTdWJsYW5ndWFnZShlbWl0dGVyLCBuYW1lKSB7XG4gICAgbGV0IG5vZGUgPSBlbWl0dGVyLnJvb3Q7XG4gICAgbm9kZS5raW5kID0gbmFtZTtcbiAgICBub2RlLnN1Ymxhbmd1YWdlID0gdHJ1ZTtcbiAgICB0aGlzLmFkZChub2RlKTtcbiAgfVxuXG4gIHRvSFRNTCgpIHtcbiAgICBsZXQgcmVuZGVyZXIgPSBuZXcgSFRNTFJlbmRlcmVyKHRoaXMsIHRoaXMub3B0aW9ucyk7XG4gICAgcmV0dXJuIHJlbmRlcmVyLnZhbHVlKCk7XG4gIH1cblxuICBmaW5hbGl6ZSgpIHtcbiAgICByZXR1cm47XG4gIH1cblxufVxuXG5mdW5jdGlvbiBlc2NhcGUodmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBSZWdFeHAodmFsdWUucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyksICdtJyk7XG59XG5cbmZ1bmN0aW9uIHNvdXJjZShyZSkge1xuICAvLyBpZiBpdCdzIGEgcmVnZXggZ2V0IGl0J3Mgc291cmNlLFxuICAvLyBvdGhlcndpc2UgaXQncyBhIHN0cmluZyBhbHJlYWR5IHNvIGp1c3QgcmV0dXJuIGl0XG4gIHJldHVybiAocmUgJiYgcmUuc291cmNlKSB8fCByZTtcbn1cblxuZnVuY3Rpb24gY291bnRNYXRjaEdyb3VwcyhyZSkge1xuICByZXR1cm4gKG5ldyBSZWdFeHAocmUudG9TdHJpbmcoKSArICd8JykpLmV4ZWMoJycpLmxlbmd0aCAtIDE7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0c1dpdGgocmUsIGxleGVtZSkge1xuICB2YXIgbWF0Y2ggPSByZSAmJiByZS5leGVjKGxleGVtZSk7XG4gIHJldHVybiBtYXRjaCAmJiBtYXRjaC5pbmRleCA9PT0gMDtcbn1cblxuLy8gam9pbiBsb2dpY2FsbHkgY29tcHV0ZXMgcmVnZXhwcy5qb2luKHNlcGFyYXRvciksIGJ1dCBmaXhlcyB0aGVcbi8vIGJhY2tyZWZlcmVuY2VzIHNvIHRoZXkgY29udGludWUgdG8gbWF0Y2guXG4vLyBpdCBhbHNvIHBsYWNlcyBlYWNoIGluZGl2aWR1YWwgcmVndWxhciBleHByZXNzaW9uIGludG8gaXQncyBvd25cbi8vIG1hdGNoIGdyb3VwLCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBzZXF1ZW5jaW5nIG9mIHRob3NlIG1hdGNoIGdyb3Vwc1xuLy8gaXMgY3VycmVudGx5IGFuIGV4ZXJjaXNlIGZvciB0aGUgY2FsbGVyLiA6LSlcbmZ1bmN0aW9uIGpvaW4ocmVnZXhwcywgc2VwYXJhdG9yKSB7XG4gIC8vIGJhY2tyZWZlcmVuY2VSZSBtYXRjaGVzIGFuIG9wZW4gcGFyZW50aGVzaXMgb3IgYmFja3JlZmVyZW5jZS4gVG8gYXZvaWRcbiAgLy8gYW4gaW5jb3JyZWN0IHBhcnNlLCBpdCBhZGRpdGlvbmFsbHkgbWF0Y2hlcyB0aGUgZm9sbG93aW5nOlxuICAvLyAtIFsuLi5dIGVsZW1lbnRzLCB3aGVyZSB0aGUgbWVhbmluZyBvZiBwYXJlbnRoZXNlcyBhbmQgZXNjYXBlcyBjaGFuZ2VcbiAgLy8gLSBvdGhlciBlc2NhcGUgc2VxdWVuY2VzLCBzbyB3ZSBkbyBub3QgbWlzcGFyc2UgZXNjYXBlIHNlcXVlbmNlcyBhc1xuICAvLyAgIGludGVyZXN0aW5nIGVsZW1lbnRzXG4gIC8vIC0gbm9uLW1hdGNoaW5nIG9yIGxvb2thaGVhZCBwYXJlbnRoZXNlcywgd2hpY2ggZG8gbm90IGNhcHR1cmUuIFRoZXNlXG4gIC8vICAgZm9sbG93IHRoZSAnKCcgd2l0aCBhICc/Jy5cbiAgdmFyIGJhY2tyZWZlcmVuY2VSZSA9IC9cXFsoPzpbXlxcXFxcXF1dfFxcXFwuKSpcXF18XFwoXFw/P3xcXFxcKFsxLTldWzAtOV0qKXxcXFxcLi87XG4gIHZhciBudW1DYXB0dXJlcyA9IDA7XG4gIHZhciByZXQgPSAnJztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZWdleHBzLmxlbmd0aDsgaSsrKSB7XG4gICAgbnVtQ2FwdHVyZXMgKz0gMTtcbiAgICB2YXIgb2Zmc2V0ID0gbnVtQ2FwdHVyZXM7XG4gICAgdmFyIHJlID0gc291cmNlKHJlZ2V4cHNbaV0pO1xuICAgIGlmIChpID4gMCkge1xuICAgICAgcmV0ICs9IHNlcGFyYXRvcjtcbiAgICB9XG4gICAgcmV0ICs9IFwiKFwiO1xuICAgIHdoaWxlIChyZS5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgbWF0Y2ggPSBiYWNrcmVmZXJlbmNlUmUuZXhlYyhyZSk7XG4gICAgICBpZiAobWF0Y2ggPT0gbnVsbCkge1xuICAgICAgICByZXQgKz0gcmU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0ICs9IHJlLnN1YnN0cmluZygwLCBtYXRjaC5pbmRleCk7XG4gICAgICByZSA9IHJlLnN1YnN0cmluZyhtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICBpZiAobWF0Y2hbMF1bMF0gPT0gJ1xcXFwnICYmIG1hdGNoWzFdKSB7XG4gICAgICAgIC8vIEFkanVzdCB0aGUgYmFja3JlZmVyZW5jZS5cbiAgICAgICAgcmV0ICs9ICdcXFxcJyArIFN0cmluZyhOdW1iZXIobWF0Y2hbMV0pICsgb2Zmc2V0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldCArPSBtYXRjaFswXTtcbiAgICAgICAgaWYgKG1hdGNoWzBdID09ICcoJykge1xuICAgICAgICAgIG51bUNhcHR1cmVzKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0ICs9IFwiKVwiO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbi8vIENvbW1vbiByZWdleHBzXG5jb25zdCBJREVOVF9SRSA9ICdbYS16QS1aXVxcXFx3Kic7XG5jb25zdCBVTkRFUlNDT1JFX0lERU5UX1JFID0gJ1thLXpBLVpfXVxcXFx3Kic7XG5jb25zdCBOVU1CRVJfUkUgPSAnXFxcXGJcXFxcZCsoXFxcXC5cXFxcZCspPyc7XG5jb25zdCBDX05VTUJFUl9SRSA9ICcoLT8pKFxcXFxiMFt4WF1bYS1mQS1GMC05XSt8KFxcXFxiXFxcXGQrKFxcXFwuXFxcXGQqKT98XFxcXC5cXFxcZCspKFtlRV1bLStdP1xcXFxkKyk/KSc7IC8vIDB4Li4uLCAwLi4uLCBkZWNpbWFsLCBmbG9hdFxuY29uc3QgQklOQVJZX05VTUJFUl9SRSA9ICdcXFxcYigwYlswMV0rKSc7IC8vIDBiLi4uXG5jb25zdCBSRV9TVEFSVEVSU19SRSA9ICchfCE9fCE9PXwlfCU9fCZ8JiZ8Jj18XFxcXCp8XFxcXCo9fFxcXFwrfFxcXFwrPXwsfC18LT18Lz18L3w6fDt8PDx8PDw9fDw9fDx8PT09fD09fD18Pj4+PXw+Pj18Pj18Pj4+fD4+fD58XFxcXD98XFxcXFt8XFxcXHt8XFxcXCh8XFxcXF58XFxcXF49fFxcXFx8fFxcXFx8PXxcXFxcfFxcXFx8fH4nO1xuXG4vLyBDb21tb24gbW9kZXNcbmNvbnN0IEJBQ0tTTEFTSF9FU0NBUEUgPSB7XG4gIGJlZ2luOiAnXFxcXFxcXFxbXFxcXHNcXFxcU10nLCByZWxldmFuY2U6IDBcbn07XG5jb25zdCBBUE9TX1NUUklOR19NT0RFID0ge1xuICBjbGFzc05hbWU6ICdzdHJpbmcnLFxuICBiZWdpbjogJ1xcJycsIGVuZDogJ1xcJycsXG4gIGlsbGVnYWw6ICdcXFxcbicsXG4gIGNvbnRhaW5zOiBbQkFDS1NMQVNIX0VTQ0FQRV1cbn07XG5jb25zdCBRVU9URV9TVFJJTkdfTU9ERSA9IHtcbiAgY2xhc3NOYW1lOiAnc3RyaW5nJyxcbiAgYmVnaW46ICdcIicsIGVuZDogJ1wiJyxcbiAgaWxsZWdhbDogJ1xcXFxuJyxcbiAgY29udGFpbnM6IFtCQUNLU0xBU0hfRVNDQVBFXVxufTtcbmNvbnN0IFBIUkFTQUxfV09SRFNfTU9ERSA9IHtcbiAgYmVnaW46IC9cXGIoYXxhbnx0aGV8YXJlfEknbXxpc24ndHxkb24ndHxkb2Vzbid0fHdvbid0fGJ1dHxqdXN0fHNob3VsZHxwcmV0dHl8c2ltcGx5fGVub3VnaHxnb25uYXxnb2luZ3x3dGZ8c298c3VjaHx3aWxsfHlvdXx5b3VyfHRoZXl8bGlrZXxtb3JlKVxcYi9cbn07XG5jb25zdCBDT01NRU5UID0gZnVuY3Rpb24gKGJlZ2luLCBlbmQsIGluaGVyaXRzKSB7XG4gIHZhciBtb2RlID0gaW5oZXJpdChcbiAgICB7XG4gICAgICBjbGFzc05hbWU6ICdjb21tZW50JyxcbiAgICAgIGJlZ2luOiBiZWdpbiwgZW5kOiBlbmQsXG4gICAgICBjb250YWluczogW11cbiAgICB9LFxuICAgIGluaGVyaXRzIHx8IHt9XG4gICk7XG4gIG1vZGUuY29udGFpbnMucHVzaChQSFJBU0FMX1dPUkRTX01PREUpO1xuICBtb2RlLmNvbnRhaW5zLnB1c2goe1xuICAgIGNsYXNzTmFtZTogJ2RvY3RhZycsXG4gICAgYmVnaW46ICcoPzpUT0RPfEZJWE1FfE5PVEV8QlVHfFhYWCk6JyxcbiAgICByZWxldmFuY2U6IDBcbiAgfSk7XG4gIHJldHVybiBtb2RlO1xufTtcbmNvbnN0IENfTElORV9DT01NRU5UX01PREUgPSBDT01NRU5UKCcvLycsICckJyk7XG5jb25zdCBDX0JMT0NLX0NPTU1FTlRfTU9ERSA9IENPTU1FTlQoJy9cXFxcKicsICdcXFxcKi8nKTtcbmNvbnN0IEhBU0hfQ09NTUVOVF9NT0RFID0gQ09NTUVOVCgnIycsICckJyk7XG5jb25zdCBOVU1CRVJfTU9ERSA9IHtcbiAgY2xhc3NOYW1lOiAnbnVtYmVyJyxcbiAgYmVnaW46IE5VTUJFUl9SRSxcbiAgcmVsZXZhbmNlOiAwXG59O1xuY29uc3QgQ19OVU1CRVJfTU9ERSA9IHtcbiAgY2xhc3NOYW1lOiAnbnVtYmVyJyxcbiAgYmVnaW46IENfTlVNQkVSX1JFLFxuICByZWxldmFuY2U6IDBcbn07XG5jb25zdCBCSU5BUllfTlVNQkVSX01PREUgPSB7XG4gIGNsYXNzTmFtZTogJ251bWJlcicsXG4gIGJlZ2luOiBCSU5BUllfTlVNQkVSX1JFLFxuICByZWxldmFuY2U6IDBcbn07XG5jb25zdCBDU1NfTlVNQkVSX01PREUgPSB7XG4gIGNsYXNzTmFtZTogJ251bWJlcicsXG4gIGJlZ2luOiBOVU1CRVJfUkUgKyAnKCcgK1xuICAgICclfGVtfGV4fGNofHJlbScgICtcbiAgICAnfHZ3fHZofHZtaW58dm1heCcgK1xuICAgICd8Y218bW18aW58cHR8cGN8cHgnICtcbiAgICAnfGRlZ3xncmFkfHJhZHx0dXJuJyArXG4gICAgJ3xzfG1zJyArXG4gICAgJ3xIenxrSHonICtcbiAgICAnfGRwaXxkcGNtfGRwcHgnICtcbiAgICAnKT8nLFxuICByZWxldmFuY2U6IDBcbn07XG5jb25zdCBSRUdFWFBfTU9ERSA9IHtcbiAgLy8gdGhpcyBvdXRlciBydWxlIG1ha2VzIHN1cmUgd2UgYWN0dWFsbHkgaGF2ZSBhIFdIT0xFIHJlZ2V4IGFuZCBub3Qgc2ltcGx5XG4gIC8vIGFuIGV4cHJlc3Npb24gc3VjaCBhczpcbiAgLy9cbiAgLy8gICAgIDMgLyBzb21ldGhpbmdcbiAgLy9cbiAgLy8gKHdoaWNoIHdpbGwgdGhlbiBibG93IHVwIHdoZW4gcmVnZXgncyBgaWxsZWdhbGAgc2VlcyB0aGUgbmV3bGluZSlcbiAgYmVnaW46IC8oPz1cXC9bXlxcL1xcbl0qXFwvKS8sXG4gIGNvbnRhaW5zOiBbe1xuICAgIGNsYXNzTmFtZTogJ3JlZ2V4cCcsXG4gICAgYmVnaW46IC9cXC8vLCBlbmQ6IC9cXC9bZ2ltdXldKi8sXG4gICAgaWxsZWdhbDogL1xcbi8sXG4gICAgY29udGFpbnM6IFtcbiAgICAgIEJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICB7XG4gICAgICAgIGJlZ2luOiAvXFxbLywgZW5kOiAvXFxdLyxcbiAgICAgICAgcmVsZXZhbmNlOiAwLFxuICAgICAgICBjb250YWluczogW0JBQ0tTTEFTSF9FU0NBUEVdXG4gICAgICB9XG4gICAgXVxuICB9XVxufTtcbmNvbnN0IFRJVExFX01PREUgPSB7XG4gIGNsYXNzTmFtZTogJ3RpdGxlJyxcbiAgYmVnaW46IElERU5UX1JFLFxuICByZWxldmFuY2U6IDBcbn07XG5jb25zdCBVTkRFUlNDT1JFX1RJVExFX01PREUgPSB7XG4gIGNsYXNzTmFtZTogJ3RpdGxlJyxcbiAgYmVnaW46IFVOREVSU0NPUkVfSURFTlRfUkUsXG4gIHJlbGV2YW5jZTogMFxufTtcbmNvbnN0IE1FVEhPRF9HVUFSRCA9IHtcbiAgLy8gZXhjbHVkZXMgbWV0aG9kIG5hbWVzIGZyb20ga2V5d29yZCBwcm9jZXNzaW5nXG4gIGJlZ2luOiAnXFxcXC5cXFxccyonICsgVU5ERVJTQ09SRV9JREVOVF9SRSxcbiAgcmVsZXZhbmNlOiAwXG59O1xuXG52YXIgTU9ERVMgPSAvKiNfX1BVUkVfXyovT2JqZWN0LmZyZWV6ZSh7XG4gIF9fcHJvdG9fXzogbnVsbCxcbiAgSURFTlRfUkU6IElERU5UX1JFLFxuICBVTkRFUlNDT1JFX0lERU5UX1JFOiBVTkRFUlNDT1JFX0lERU5UX1JFLFxuICBOVU1CRVJfUkU6IE5VTUJFUl9SRSxcbiAgQ19OVU1CRVJfUkU6IENfTlVNQkVSX1JFLFxuICBCSU5BUllfTlVNQkVSX1JFOiBCSU5BUllfTlVNQkVSX1JFLFxuICBSRV9TVEFSVEVSU19SRTogUkVfU1RBUlRFUlNfUkUsXG4gIEJBQ0tTTEFTSF9FU0NBUEU6IEJBQ0tTTEFTSF9FU0NBUEUsXG4gIEFQT1NfU1RSSU5HX01PREU6IEFQT1NfU1RSSU5HX01PREUsXG4gIFFVT1RFX1NUUklOR19NT0RFOiBRVU9URV9TVFJJTkdfTU9ERSxcbiAgUEhSQVNBTF9XT1JEU19NT0RFOiBQSFJBU0FMX1dPUkRTX01PREUsXG4gIENPTU1FTlQ6IENPTU1FTlQsXG4gIENfTElORV9DT01NRU5UX01PREU6IENfTElORV9DT01NRU5UX01PREUsXG4gIENfQkxPQ0tfQ09NTUVOVF9NT0RFOiBDX0JMT0NLX0NPTU1FTlRfTU9ERSxcbiAgSEFTSF9DT01NRU5UX01PREU6IEhBU0hfQ09NTUVOVF9NT0RFLFxuICBOVU1CRVJfTU9ERTogTlVNQkVSX01PREUsXG4gIENfTlVNQkVSX01PREU6IENfTlVNQkVSX01PREUsXG4gIEJJTkFSWV9OVU1CRVJfTU9ERTogQklOQVJZX05VTUJFUl9NT0RFLFxuICBDU1NfTlVNQkVSX01PREU6IENTU19OVU1CRVJfTU9ERSxcbiAgUkVHRVhQX01PREU6IFJFR0VYUF9NT0RFLFxuICBUSVRMRV9NT0RFOiBUSVRMRV9NT0RFLFxuICBVTkRFUlNDT1JFX1RJVExFX01PREU6IFVOREVSU0NPUkVfVElUTEVfTU9ERSxcbiAgTUVUSE9EX0dVQVJEOiBNRVRIT0RfR1VBUkRcbn0pO1xuXG4vLyBrZXl3b3JkcyB0aGF0IHNob3VsZCBoYXZlIG5vIGRlZmF1bHQgcmVsZXZhbmNlIHZhbHVlXG52YXIgQ09NTU9OX0tFWVdPUkRTID0gJ29mIGFuZCBmb3IgaW4gbm90IG9yIGlmIHRoZW4nLnNwbGl0KCcgJyk7XG5cbi8vIGNvbXBpbGF0aW9uXG5cbmZ1bmN0aW9uIGNvbXBpbGVMYW5ndWFnZShsYW5ndWFnZSkge1xuXG4gIGZ1bmN0aW9uIGxhbmdSZSh2YWx1ZSwgZ2xvYmFsKSB7XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoXG4gICAgICBzb3VyY2UodmFsdWUpLFxuICAgICAgJ20nICsgKGxhbmd1YWdlLmNhc2VfaW5zZW5zaXRpdmUgPyAnaScgOiAnJykgKyAoZ2xvYmFsID8gJ2cnIDogJycpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgIFN0b3JlcyBtdWx0aXBsZSByZWd1bGFyIGV4cHJlc3Npb25zIGFuZCBhbGxvd3MgeW91IHRvIHF1aWNrbHkgc2VhcmNoIGZvclxuICAgIHRoZW0gYWxsIGluIGEgc3RyaW5nIHNpbXVsdGFuZW91c2x5IC0gcmV0dXJuaW5nIHRoZSBmaXJzdCBtYXRjaC4gIEl0IGRvZXNcbiAgICB0aGlzIGJ5IGNyZWF0aW5nIGEgaHVnZSAoYXxifGMpIHJlZ2V4IC0gZWFjaCBpbmRpdmlkdWFsIGl0ZW0gd3JhcHBlZCB3aXRoICgpXG4gICAgYW5kIGpvaW5lZCBieSBgfGAgLSB1c2luZyBtYXRjaCBncm91cHMgdG8gdHJhY2sgcG9zaXRpb24uICBXaGVuIGEgbWF0Y2ggaXNcbiAgICBmb3VuZCBjaGVja2luZyB3aGljaCBwb3NpdGlvbiBpbiB0aGUgYXJyYXkgaGFzIGNvbnRlbnQgYWxsb3dzIHVzIHRvIGZpZ3VyZVxuICAgIG91dCB3aGljaCBvZiB0aGUgb3JpZ2luYWwgcmVnZXhlcyAvIG1hdGNoIGdyb3VwcyB0cmlnZ2VyZWQgdGhlIG1hdGNoLlxuXG4gICAgVGhlIG1hdGNoIG9iamVjdCBpdHNlbGYgKHRoZSByZXN1bHQgb2YgYFJlZ2V4LmV4ZWNgKSBpcyByZXR1cm5lZCBidXQgYWxzb1xuICAgIGVuaGFuY2VkIGJ5IG1lcmdpbmcgaW4gYW55IG1ldGEtZGF0YSB0aGF0IHdhcyByZWdpc3RlcmVkIHdpdGggdGhlIHJlZ2V4LlxuICAgIFRoaXMgaXMgaG93IHdlIGtlZXAgdHJhY2sgb2Ygd2hpY2ggbW9kZSBtYXRjaGVkLCBhbmQgd2hhdCB0eXBlIG9mIHJ1bGVcbiAgICAoYGlsbGVnYWxgLCBgYmVnaW5gLCBlbmQsIGV0YykuXG4gICovXG4gIGNsYXNzIE11bHRpUmVnZXgge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgdGhpcy5tYXRjaEluZGV4ZXMgPSB7fTtcbiAgICAgIHRoaXMucmVnZXhlcyA9IFtdO1xuICAgICAgdGhpcy5tYXRjaEF0ID0gMTtcbiAgICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICAgIH1cblxuICAgIGFkZFJ1bGUocmUsIG9wdHMpIHtcbiAgICAgIG9wdHMucG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uKys7XG4gICAgICB0aGlzLm1hdGNoSW5kZXhlc1t0aGlzLm1hdGNoQXRdID0gb3B0cztcbiAgICAgIHRoaXMucmVnZXhlcy5wdXNoKFtvcHRzLCByZV0pO1xuICAgICAgdGhpcy5tYXRjaEF0ICs9IGNvdW50TWF0Y2hHcm91cHMocmUpICsgMTtcbiAgICB9XG5cbiAgICBjb21waWxlKCkge1xuICAgICAgaWYgKHRoaXMucmVnZXhlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gYXZvaWRzIHRoZSBuZWVkIHRvIGNoZWNrIGxlbmd0aCBldmVyeSB0aW1lIGV4ZWMgaXMgY2FsbGVkXG4gICAgICAgIHRoaXMuZXhlYyA9ICgpID0+IG51bGw7XG4gICAgICB9XG4gICAgICBsZXQgdGVybWluYXRvcnMgPSB0aGlzLnJlZ2V4ZXMubWFwKGVsID0+IGVsWzFdKTtcbiAgICAgIHRoaXMubWF0Y2hlclJlID0gbGFuZ1JlKGpvaW4odGVybWluYXRvcnMsICd8JyksIHRydWUpO1xuICAgICAgdGhpcy5sYXN0SW5kZXggPSAwO1xuICAgIH1cblxuICAgIGV4ZWMocykge1xuICAgICAgdGhpcy5tYXRjaGVyUmUubGFzdEluZGV4ID0gdGhpcy5sYXN0SW5kZXg7XG4gICAgICBsZXQgbWF0Y2ggPSB0aGlzLm1hdGNoZXJSZS5leGVjKHMpO1xuICAgICAgaWYgKCFtYXRjaCkgeyByZXR1cm4gbnVsbDsgfVxuXG4gICAgICBsZXQgaSA9IG1hdGNoLmZpbmRJbmRleCgoZWwsIGkpID0+IGk+MCAmJiBlbCE9dW5kZWZpbmVkKTtcbiAgICAgIGxldCBtYXRjaERhdGEgPSB0aGlzLm1hdGNoSW5kZXhlc1tpXTtcblxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obWF0Y2gsIG1hdGNoRGF0YSk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICBDcmVhdGVkIHRvIHNvbHZlIHRoZSBrZXkgZGVmaWNpZW50bHkgd2l0aCBNdWx0aVJlZ2V4IC0gdGhlcmUgaXMgbm8gd2F5IHRvXG4gICAgdGVzdCBmb3IgbXVsdGlwbGUgbWF0Y2hlcyBhdCBhIHNpbmdsZSBsb2NhdGlvbi4gIFdoeSB3b3VsZCB3ZSBuZWVkIHRvIGRvXG4gICAgdGhhdD8gIEluIHRoZSBmdXR1cmUgYSBtb3JlIGR5bmFtaWMgZW5naW5lIHdpbGwgYWxsb3cgY2VydGFpbiBtYXRjaGVzIHRvIGJlXG4gICAgaWdub3JlZC4gIEFuIGV4YW1wbGU6IGlmIHdlIG1hdGNoZWQgc2F5IHRoZSAzcmQgcmVnZXggaW4gYSBsYXJnZSBncm91cCBidXRcbiAgICBkZWNpZGVkIHRvIGlnbm9yZSBpdCAtIHdlJ2QgbmVlZCB0byBzdGFydGVkIHRlc3RpbmcgYWdhaW4gYXQgdGhlIDR0aFxuICAgIHJlZ2V4Li4uIGJ1dCBNdWx0aVJlZ2V4IGl0c2VsZiBnaXZlcyB1cyBubyByZWFsIHdheSB0byBkbyB0aGF0LlxuXG4gICAgU28gd2hhdCB0aGlzIGNsYXNzIGNyZWF0ZXMgTXVsdGlSZWdleHMgb24gdGhlIGZseSBmb3Igd2hhdGV2ZXIgc2VhcmNoXG4gICAgcG9zaXRpb24gdGhleSBhcmUgbmVlZGVkLlxuXG4gICAgTk9URTogVGhlc2UgYWRkaXRpb25hbCBNdWx0aVJlZ2V4IG9iamVjdHMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHkuICBGb3IgbW9zdFxuICAgIGdyYW1tYXJzIG1vc3Qgb2YgdGhlIHRpbWUgd2Ugd2lsbCBuZXZlciBhY3R1YWxseSBuZWVkIGFueXRoaW5nIG1vcmUgdGhhbiB0aGVcbiAgICBmaXJzdCBNdWx0aVJlZ2V4IC0gc28gdGhpcyBzaG91bGRuJ3QgaGF2ZSB0b28gbXVjaCBvdmVyaGVhZC5cblxuICAgIFNheSB0aGlzIGlzIG91ciBzZWFyY2ggZ3JvdXAsIGFuZCB3ZSBtYXRjaCByZWdleDMsIGJ1dCB3aXNoIHRvIGlnbm9yZSBpdC5cblxuICAgICAgcmVnZXgxIHwgcmVnZXgyIHwgcmVnZXgzIHwgcmVnZXg0IHwgcmVnZXg1ICAgICcgaWUsIHN0YXJ0QXQgPSAwXG5cbiAgICBXaGF0IHdlIG5lZWQgaXMgYSBuZXcgTXVsdGlSZWdleCB0aGF0IG9ubHkgaW5jbHVkZXMgdGhlIHJlbWFpbmluZ1xuICAgIHBvc3NpYmlsaXRpZXM6XG5cbiAgICAgIHJlZ2V4NCB8IHJlZ2V4NSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnIGllLCBzdGFydEF0ID0gM1xuXG4gICAgVGhpcyBjbGFzcyB3cmFwcyBhbGwgdGhhdCBjb21wbGV4aXR5IHVwIGluIGEgc2ltcGxlIEFQSS4uLiBgc3RhcnRBdGAgZGVjaWRlc1xuICAgIHdoZXJlIGluIHRoZSBhcnJheSBvZiBleHByZXNzaW9ucyB0byBzdGFydCBkb2luZyB0aGUgbWF0Y2hpbmcuIEl0XG4gICAgYXV0by1pbmNyZW1lbnRzLCBzbyBpZiBhIG1hdGNoIGlzIGZvdW5kIGF0IHBvc2l0aW9uIDIsIHRoZW4gc3RhcnRBdCB3aWxsIGJlXG4gICAgc2V0IHRvIDMuICBJZiB0aGUgZW5kIGlzIHJlYWNoZWQgc3RhcnRBdCB3aWxsIHJldHVybiB0byAwLlxuXG4gICAgTU9TVCBvZiB0aGUgdGltZSB0aGUgcGFyc2VyIHdpbGwgYmUgc2V0dGluZyBzdGFydEF0IG1hbnVhbGx5IHRvIDAuXG4gICovXG4gIGNsYXNzIFJlc3VtYWJsZU11bHRpUmVnZXgge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgdGhpcy5ydWxlcyA9IFtdO1xuICAgICAgdGhpcy5tdWx0aVJlZ2V4ZXMgPSBbXTtcbiAgICAgIHRoaXMuY291bnQgPSAwO1xuXG4gICAgICB0aGlzLmxhc3RJbmRleCA9IDA7XG4gICAgICB0aGlzLnJlZ2V4SW5kZXggPSAwO1xuICAgIH1cblxuICAgIGdldE1hdGNoZXIoaW5kZXgpIHtcbiAgICAgIGlmICh0aGlzLm11bHRpUmVnZXhlc1tpbmRleF0pIHJldHVybiB0aGlzLm11bHRpUmVnZXhlc1tpbmRleF07XG5cbiAgICAgIGxldCBtYXRjaGVyID0gbmV3IE11bHRpUmVnZXgoKTtcbiAgICAgIHRoaXMucnVsZXMuc2xpY2UoaW5kZXgpLmZvckVhY2goKFtyZSwgb3B0c10pPT4gbWF0Y2hlci5hZGRSdWxlKHJlLG9wdHMpKTtcbiAgICAgIG1hdGNoZXIuY29tcGlsZSgpO1xuICAgICAgdGhpcy5tdWx0aVJlZ2V4ZXNbaW5kZXhdID0gbWF0Y2hlcjtcbiAgICAgIHJldHVybiBtYXRjaGVyO1xuICAgIH1cblxuICAgIGNvbnNpZGVyQWxsKCkge1xuICAgICAgdGhpcy5yZWdleEluZGV4ID0gMDtcbiAgICB9XG5cbiAgICBhZGRSdWxlKHJlLCBvcHRzKSB7XG4gICAgICB0aGlzLnJ1bGVzLnB1c2goW3JlLCBvcHRzXSk7XG4gICAgICBpZiAob3B0cy50eXBlPT09XCJiZWdpblwiKSB0aGlzLmNvdW50Kys7XG4gICAgfVxuXG4gICAgZXhlYyhzKSB7XG4gICAgICBsZXQgbSA9IHRoaXMuZ2V0TWF0Y2hlcih0aGlzLnJlZ2V4SW5kZXgpO1xuICAgICAgbS5sYXN0SW5kZXggPSB0aGlzLmxhc3RJbmRleDtcbiAgICAgIGxldCByZXN1bHQgPSBtLmV4ZWMocyk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHRoaXMucmVnZXhJbmRleCArPSByZXN1bHQucG9zaXRpb24gKyAxO1xuICAgICAgICBpZiAodGhpcy5yZWdleEluZGV4ID09PSB0aGlzLmNvdW50KSAvLyB3cmFwLWFyb3VuZFxuICAgICAgICAgIHRoaXMucmVnZXhJbmRleCA9IDA7XG4gICAgICB9XG5cbiAgICAgIC8vIHRoaXMucmVnZXhJbmRleCA9IDA7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1aWxkTW9kZVJlZ2V4KG1vZGUpIHtcblxuICAgIGxldCBtbSA9IG5ldyBSZXN1bWFibGVNdWx0aVJlZ2V4KCk7XG5cbiAgICBtb2RlLmNvbnRhaW5zLmZvckVhY2godGVybSA9PiBtbS5hZGRSdWxlKHRlcm0uYmVnaW4sIHtydWxlOiB0ZXJtLCB0eXBlOiBcImJlZ2luXCIgfSkpO1xuXG4gICAgaWYgKG1vZGUudGVybWluYXRvcl9lbmQpXG4gICAgICBtbS5hZGRSdWxlKG1vZGUudGVybWluYXRvcl9lbmQsIHt0eXBlOiBcImVuZFwifSApO1xuICAgIGlmIChtb2RlLmlsbGVnYWwpXG4gICAgICBtbS5hZGRSdWxlKG1vZGUuaWxsZWdhbCwge3R5cGU6IFwiaWxsZWdhbFwifSApO1xuXG4gICAgcmV0dXJuIG1tO1xuICB9XG5cbiAgLy8gVE9ETzogV2UgbmVlZCBuZWdhdGl2ZSBsb29rLWJlaGluZCBzdXBwb3J0IHRvIGRvIHRoaXMgcHJvcGVybHlcbiAgZnVuY3Rpb24gc2tpcElmaGFzUHJlY2VkaW5nT3JUcmFpbGluZ0RvdChtYXRjaCkge1xuICAgIGxldCBiZWZvcmUgPSBtYXRjaC5pbnB1dFttYXRjaC5pbmRleC0xXTtcbiAgICBsZXQgYWZ0ZXIgPSBtYXRjaC5pbnB1dFttYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aF07XG4gICAgaWYgKGJlZm9yZSA9PT0gXCIuXCIgfHwgYWZ0ZXIgPT09IFwiLlwiKSB7XG4gICAgICByZXR1cm4ge2lnbm9yZU1hdGNoOiB0cnVlIH07XG4gICAgfVxuICB9XG5cbiAgLyoqIHNraXAgdnMgYWJvcnQgdnMgaWdub3JlXG4gICAqXG4gICAqIEBza2lwICAgLSBUaGUgbW9kZSBpcyBzdGlsbCBlbnRlcmVkIGFuZCBleGl0ZWQgbm9ybWFsbHkgKGFuZCBjb250YWlucyBydWxlcyBhcHBseSksXG4gICAqICAgICAgICAgICBidXQgYWxsIGNvbnRlbnQgaXMgaGVsZCBhbmQgYWRkZWQgdG8gdGhlIHBhcmVudCBidWZmZXIgcmF0aGVyIHRoYW4gYmVpbmdcbiAgICogICAgICAgICAgIG91dHB1dCB3aGVuIHRoZSBtb2RlIGVuZHMuICBNb3N0bHkgdXNlZCB3aXRoIGBzdWJsYW5ndWFnZWAgdG8gYnVpbGQgdXBcbiAgICogICAgICAgICAgIGEgc2luZ2xlIGxhcmdlIGJ1ZmZlciB0aGFuIGNhbiBiZSBwYXJzZWQgYnkgc3VibGFuZ3VhZ2UuXG4gICAqXG4gICAqICAgICAgICAgICAgIC0gVGhlIG1vZGUgYmVnaW4gYW5kcyBlbmRzIG5vcm1hbGx5LlxuICAgKiAgICAgICAgICAgICAtIENvbnRlbnQgbWF0Y2hlZCBpcyBhZGRlZCB0byB0aGUgcGFyZW50IG1vZGUgYnVmZmVyLlxuICAgKiAgICAgICAgICAgICAtIFRoZSBwYXJzZXIgY3Vyc29yIGlzIG1vdmVkIGZvcndhcmQgbm9ybWFsbHkuXG4gICAqXG4gICAqIEBhYm9ydCAgLSBBIGhhY2sgcGxhY2Vob2xkZXIgdW50aWwgd2UgaGF2ZSBpZ25vcmUuICBBYm9ydHMgdGhlIG1vZGUgKGFzIGlmIGl0XG4gICAqICAgICAgICAgICBuZXZlciBtYXRjaGVkKSBidXQgRE9FUyBOT1QgY29udGludWUgdG8gbWF0Y2ggc3Vic2VxdWVudCBgY29udGFpbnNgXG4gICAqICAgICAgICAgICBtb2Rlcy4gIEFib3J0IGlzIGJhZC9zdWJvcHRpbWFsIGJlY2F1c2UgaXQgY2FuIHJlc3VsdCBpbiBtb2Rlc1xuICAgKiAgICAgICAgICAgZmFydGhlciBkb3duIG5vdCBnZXR0aW5nIGFwcGxpZWQgYmVjYXVzZSBhbiBlYXJsaWVyIHJ1bGUgZWF0cyB0aGVcbiAgICogICAgICAgICAgIGNvbnRlbnQgYnV0IHRoZW4gYWJvcnRzLlxuICAgKlxuICAgKiAgICAgICAgICAgICAtIFRoZSBtb2RlIGRvZXMgbm90IGJlZ2luLlxuICAgKiAgICAgICAgICAgICAtIENvbnRlbnQgbWF0Y2hlZCBieSBgYmVnaW5gIGlzIGFkZGVkIHRvIHRoZSBtb2RlIGJ1ZmZlci5cbiAgICogICAgICAgICAgICAgLSBUaGUgcGFyc2VyIGN1cnNvciBpcyBtb3ZlZCBmb3J3YXJkIGFjY29yZGluZ2x5LlxuICAgKlxuICAgKiBAaWdub3JlIC0gSWdub3JlcyB0aGUgbW9kZSAoYXMgaWYgaXQgbmV2ZXIgbWF0Y2hlZCkgYW5kIGNvbnRpbnVlcyB0byBtYXRjaCBhbnlcbiAgICogICAgICAgICAgIHN1YnNlcXVlbnQgYGNvbnRhaW5zYCBtb2Rlcy4gIElnbm9yZSBpc24ndCB0ZWNobmljYWxseSBwb3NzaWJsZSB3aXRoXG4gICAqICAgICAgICAgICB0aGUgY3VycmVudCBwYXJzZXIgaW1wbGVtZW50YXRpb24uXG4gICAqXG4gICAqICAgICAgICAgICAgIC0gVGhlIG1vZGUgZG9lcyBub3QgYmVnaW4uXG4gICAqICAgICAgICAgICAgIC0gQ29udGVudCBtYXRjaGVkIGJ5IGBiZWdpbmAgaXMgaWdub3JlZC5cbiAgICogICAgICAgICAgICAgLSBUaGUgcGFyc2VyIGN1cnNvciBpcyBub3QgbW92ZWQgZm9yd2FyZC5cbiAgICovXG5cbiAgZnVuY3Rpb24gY29tcGlsZU1vZGUobW9kZSwgcGFyZW50KSB7XG4gICAgaWYgKG1vZGUuY29tcGlsZWQpXG4gICAgICByZXR1cm47XG4gICAgbW9kZS5jb21waWxlZCA9IHRydWU7XG5cbiAgICAvLyBfX29uQmVnaW4gaXMgY29uc2lkZXJlZCBwcml2YXRlIEFQSSwgaW50ZXJuYWwgdXNlIG9ubHlcbiAgICBtb2RlLl9fb25CZWdpbiA9IG51bGw7XG5cbiAgICBtb2RlLmtleXdvcmRzID0gbW9kZS5rZXl3b3JkcyB8fCBtb2RlLmJlZ2luS2V5d29yZHM7XG4gICAgaWYgKG1vZGUua2V5d29yZHMpXG4gICAgICBtb2RlLmtleXdvcmRzID0gY29tcGlsZUtleXdvcmRzKG1vZGUua2V5d29yZHMsIGxhbmd1YWdlLmNhc2VfaW5zZW5zaXRpdmUpO1xuXG4gICAgbW9kZS5sZXhlbWVzUmUgPSBsYW5nUmUobW9kZS5sZXhlbWVzIHx8IC9cXHcrLywgdHJ1ZSk7XG5cbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBpZiAobW9kZS5iZWdpbktleXdvcmRzKSB7XG4gICAgICAgIC8vIGZvciBsYW5ndWFnZXMgd2l0aCBrZXl3b3JkcyB0aGF0IGluY2x1ZGUgbm9uLXdvcmQgY2hhcmFjdGVycyBjaGVja2luZyBmb3JcbiAgICAgICAgLy8gYSB3b3JkIGJvdW5kYXJ5IGlzIG5vdCBzdWZmaWNpZW50LCBzbyBpbnN0ZWFkIHdlIGNoZWNrIGZvciBhIHdvcmQgYm91bmRhcnlcbiAgICAgICAgLy8gb3Igd2hpdGVzcGFjZSAtIHRoaXMgZG9lcyBubyBoYXJtIGluIGFueSBjYXNlIHNpbmNlIG91ciBrZXl3b3JkIGVuZ2luZVxuICAgICAgICAvLyBkb2Vzbid0IGFsbG93IHNwYWNlcyBpbiBrZXl3b3JkcyBhbnl3YXlzIGFuZCB3ZSBzdGlsbCBjaGVjayBmb3IgdGhlIGJvdW5kYXJ5XG4gICAgICAgIC8vIGZpcnN0XG4gICAgICAgIG1vZGUuYmVnaW4gPSAnXFxcXGIoJyArIG1vZGUuYmVnaW5LZXl3b3Jkcy5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcpKD89XFxcXGJ8XFxcXHMpJztcbiAgICAgICAgbW9kZS5fX29uQmVnaW4gPSBza2lwSWZoYXNQcmVjZWRpbmdPclRyYWlsaW5nRG90O1xuICAgICAgfVxuICAgICAgaWYgKCFtb2RlLmJlZ2luKVxuICAgICAgICBtb2RlLmJlZ2luID0gL1xcQnxcXGIvO1xuICAgICAgbW9kZS5iZWdpblJlID0gbGFuZ1JlKG1vZGUuYmVnaW4pO1xuICAgICAgaWYgKG1vZGUuZW5kU2FtZUFzQmVnaW4pXG4gICAgICAgIG1vZGUuZW5kID0gbW9kZS5iZWdpbjtcbiAgICAgIGlmICghbW9kZS5lbmQgJiYgIW1vZGUuZW5kc1dpdGhQYXJlbnQpXG4gICAgICAgIG1vZGUuZW5kID0gL1xcQnxcXGIvO1xuICAgICAgaWYgKG1vZGUuZW5kKVxuICAgICAgICBtb2RlLmVuZFJlID0gbGFuZ1JlKG1vZGUuZW5kKTtcbiAgICAgIG1vZGUudGVybWluYXRvcl9lbmQgPSBzb3VyY2UobW9kZS5lbmQpIHx8ICcnO1xuICAgICAgaWYgKG1vZGUuZW5kc1dpdGhQYXJlbnQgJiYgcGFyZW50LnRlcm1pbmF0b3JfZW5kKVxuICAgICAgICBtb2RlLnRlcm1pbmF0b3JfZW5kICs9IChtb2RlLmVuZCA/ICd8JyA6ICcnKSArIHBhcmVudC50ZXJtaW5hdG9yX2VuZDtcbiAgICB9XG4gICAgaWYgKG1vZGUuaWxsZWdhbClcbiAgICAgIG1vZGUuaWxsZWdhbFJlID0gbGFuZ1JlKG1vZGUuaWxsZWdhbCk7XG4gICAgaWYgKG1vZGUucmVsZXZhbmNlID09IG51bGwpXG4gICAgICBtb2RlLnJlbGV2YW5jZSA9IDE7XG4gICAgaWYgKCFtb2RlLmNvbnRhaW5zKSB7XG4gICAgICBtb2RlLmNvbnRhaW5zID0gW107XG4gICAgfVxuICAgIG1vZGUuY29udGFpbnMgPSBbXS5jb25jYXQoLi4ubW9kZS5jb250YWlucy5tYXAoZnVuY3Rpb24oYykge1xuICAgICAgcmV0dXJuIGV4cGFuZF9vcl9jbG9uZV9tb2RlKGMgPT09ICdzZWxmJyA/IG1vZGUgOiBjKTtcbiAgICB9KSk7XG4gICAgbW9kZS5jb250YWlucy5mb3JFYWNoKGZ1bmN0aW9uKGMpIHtjb21waWxlTW9kZShjLCBtb2RlKTt9KTtcblxuICAgIGlmIChtb2RlLnN0YXJ0cykge1xuICAgICAgY29tcGlsZU1vZGUobW9kZS5zdGFydHMsIHBhcmVudCk7XG4gICAgfVxuXG4gICAgbW9kZS5tYXRjaGVyID0gYnVpbGRNb2RlUmVnZXgobW9kZSk7XG4gIH1cblxuICAvLyBzZWxmIGlzIG5vdCB2YWxpZCBhdCB0aGUgdG9wLWxldmVsXG4gIGlmIChsYW5ndWFnZS5jb250YWlucyAmJiBsYW5ndWFnZS5jb250YWlucy5pbmNsdWRlcygnc2VsZicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRVJSOiBjb250YWlucyBgc2VsZmAgaXMgbm90IHN1cHBvcnRlZCBhdCB0aGUgdG9wLWxldmVsIG9mIGEgbGFuZ3VhZ2UuICBTZWUgZG9jdW1lbnRhdGlvbi5cIilcbiAgfVxuICBjb21waWxlTW9kZShsYW5ndWFnZSk7XG59XG5cbmZ1bmN0aW9uIGRlcGVuZGVuY3lPblBhcmVudChtb2RlKSB7XG4gIGlmICghbW9kZSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBtb2RlLmVuZHNXaXRoUGFyZW50IHx8IGRlcGVuZGVuY3lPblBhcmVudChtb2RlLnN0YXJ0cyk7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZF9vcl9jbG9uZV9tb2RlKG1vZGUpIHtcbiAgaWYgKG1vZGUudmFyaWFudHMgJiYgIW1vZGUuY2FjaGVkX3ZhcmlhbnRzKSB7XG4gICAgbW9kZS5jYWNoZWRfdmFyaWFudHMgPSBtb2RlLnZhcmlhbnRzLm1hcChmdW5jdGlvbih2YXJpYW50KSB7XG4gICAgICByZXR1cm4gaW5oZXJpdChtb2RlLCB7dmFyaWFudHM6IG51bGx9LCB2YXJpYW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEVYUEFORFxuICAvLyBpZiB3ZSBoYXZlIHZhcmlhbnRzIHRoZW4gZXNzZW50aWFsbHkgXCJyZXBsYWNlXCIgdGhlIG1vZGUgd2l0aCB0aGUgdmFyaWFudHNcbiAgLy8gdGhpcyBoYXBwZW5zIGluIGNvbXBpbGVNb2RlLCB3aGVyZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBmcm9tXG4gIGlmIChtb2RlLmNhY2hlZF92YXJpYW50cylcbiAgICByZXR1cm4gbW9kZS5jYWNoZWRfdmFyaWFudHM7XG5cbiAgLy8gQ0xPTkVcbiAgLy8gaWYgd2UgaGF2ZSBkZXBlbmRlbmNpZXMgb24gcGFyZW50cyB0aGVuIHdlIG5lZWQgYSB1bmlxdWVcbiAgLy8gaW5zdGFuY2Ugb2Ygb3Vyc2VsdmVzLCBzbyB3ZSBjYW4gYmUgcmV1c2VkIHdpdGggbWFueVxuICAvLyBkaWZmZXJlbnQgcGFyZW50cyB3aXRob3V0IGlzc3VlXG4gIGlmIChkZXBlbmRlbmN5T25QYXJlbnQobW9kZSkpXG4gICAgcmV0dXJuIGluaGVyaXQobW9kZSwgeyBzdGFydHM6IG1vZGUuc3RhcnRzID8gaW5oZXJpdChtb2RlLnN0YXJ0cykgOiBudWxsIH0pO1xuXG4gIGlmIChPYmplY3QuaXNGcm96ZW4obW9kZSkpXG4gICAgcmV0dXJuIGluaGVyaXQobW9kZSk7XG5cbiAgLy8gbm8gc3BlY2lhbCBkZXBlbmRlbmN5IGlzc3VlcywganVzdCByZXR1cm4gb3Vyc2VsdmVzXG4gIHJldHVybiBtb2RlO1xufVxuXG5cbi8vIGtleXdvcmRzXG5cbmZ1bmN0aW9uIGNvbXBpbGVLZXl3b3JkcyhyYXdLZXl3b3JkcywgY2FzZV9pbnNlbnNpdGl2ZSkge1xuICB2YXIgY29tcGlsZWRfa2V5d29yZHMgPSB7fTtcblxuICBpZiAodHlwZW9mIHJhd0tleXdvcmRzID09PSAnc3RyaW5nJykgeyAvLyBzdHJpbmdcbiAgICBzcGxpdEFuZENvbXBpbGUoJ2tleXdvcmQnLCByYXdLZXl3b3Jkcyk7XG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmtleXMocmF3S2V5d29yZHMpLmZvckVhY2goZnVuY3Rpb24gKGNsYXNzTmFtZSkge1xuICAgICAgc3BsaXRBbmRDb21waWxlKGNsYXNzTmFtZSwgcmF3S2V5d29yZHNbY2xhc3NOYW1lXSk7XG4gICAgfSk7XG4gIH1cbnJldHVybiBjb21waWxlZF9rZXl3b3JkcztcblxuLy8gLS0tXG5cbmZ1bmN0aW9uIHNwbGl0QW5kQ29tcGlsZShjbGFzc05hbWUsIHN0cikge1xuICBpZiAoY2FzZV9pbnNlbnNpdGl2ZSkge1xuICAgIHN0ciA9IHN0ci50b0xvd2VyQ2FzZSgpO1xuICB9XG4gIHN0ci5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24oa2V5d29yZCkge1xuICAgIHZhciBwYWlyID0ga2V5d29yZC5zcGxpdCgnfCcpO1xuICAgIGNvbXBpbGVkX2tleXdvcmRzW3BhaXJbMF1dID0gW2NsYXNzTmFtZSwgc2NvcmVGb3JLZXl3b3JkKHBhaXJbMF0sIHBhaXJbMV0pXTtcbiAgfSk7XG59XG59XG5cbmZ1bmN0aW9uIHNjb3JlRm9yS2V5d29yZChrZXl3b3JkLCBwcm92aWRlZFNjb3JlKSB7XG4vLyBtYW51YWwgc2NvcmVzIGFsd2F5cyB3aW4gb3ZlciBjb21tb24ga2V5d29yZHNcbi8vIHNvIHlvdSBjYW4gZm9yY2UgYSBzY29yZSBvZiAxIGlmIHlvdSByZWFsbHkgaW5zaXN0XG5pZiAocHJvdmlkZWRTY29yZSlcbiAgcmV0dXJuIE51bWJlcihwcm92aWRlZFNjb3JlKTtcblxucmV0dXJuIGNvbW1vbktleXdvcmQoa2V5d29yZCkgPyAwIDogMTtcbn1cblxuZnVuY3Rpb24gY29tbW9uS2V5d29yZCh3b3JkKSB7XG5yZXR1cm4gQ09NTU9OX0tFWVdPUkRTLmluY2x1ZGVzKHdvcmQudG9Mb3dlckNhc2UoKSk7XG59XG5cbnZhciB2ZXJzaW9uID0gXCIxMC4wLjFcIjtcblxuLypcblN5bnRheCBoaWdobGlnaHRpbmcgd2l0aCBsYW5ndWFnZSBhdXRvZGV0ZWN0aW9uLlxuaHR0cHM6Ly9oaWdobGlnaHRqcy5vcmcvXG4qL1xuXG5jb25zdCBlc2NhcGUkMSA9IGVzY2FwZUhUTUw7XG5jb25zdCBpbmhlcml0JDEgPSBpbmhlcml0O1xuXG5jb25zdCB7IG5vZGVTdHJlYW06IG5vZGVTdHJlYW0kMSwgbWVyZ2VTdHJlYW1zOiBtZXJnZVN0cmVhbXMkMSB9ID0gdXRpbHM7XG5cblxuY29uc3QgSExKUyA9IGZ1bmN0aW9uKGhsanMpIHtcblxuICAvLyBDb252ZW5pZW5jZSB2YXJpYWJsZXMgZm9yIGJ1aWxkLWluIG9iamVjdHNcbiAgdmFyIEFycmF5UHJvdG8gPSBbXTtcblxuICAvLyBHbG9iYWwgaW50ZXJuYWwgdmFyaWFibGVzIHVzZWQgd2l0aGluIHRoZSBoaWdobGlnaHQuanMgbGlicmFyeS5cbiAgdmFyIGxhbmd1YWdlcyA9IHt9LFxuICAgICAgYWxpYXNlcyAgID0ge30sXG4gICAgICBwbHVnaW5zICAgPSBbXTtcblxuICAvLyBzYWZlL3Byb2R1Y3Rpb24gbW9kZSAtIHN3YWxsb3dzIG1vcmUgZXJyb3JzLCB0cmllcyB0byBrZWVwIHJ1bm5pbmdcbiAgLy8gZXZlbiBpZiBhIHNpbmdsZSBzeW50YXggb3IgcGFyc2UgaGl0cyBhIGZhdGFsIGVycm9yXG4gIHZhciBTQUZFX01PREUgPSB0cnVlO1xuXG4gIC8vIFJlZ3VsYXIgZXhwcmVzc2lvbnMgdXNlZCB0aHJvdWdob3V0IHRoZSBoaWdobGlnaHQuanMgbGlicmFyeS5cbiAgdmFyIGZpeE1hcmt1cFJlICAgICAgPSAvKCheKDxbXj5dKz58XFx0fCkrfCg/OlxcbikpKS9nbTtcblxuICB2YXIgTEFOR1VBR0VfTk9UX0ZPVU5EID0gXCJDb3VsZCBub3QgZmluZCB0aGUgbGFuZ3VhZ2UgJ3t9JywgZGlkIHlvdSBmb3JnZXQgdG8gbG9hZC9pbmNsdWRlIGEgbGFuZ3VhZ2UgbW9kdWxlP1wiO1xuXG4gIC8vIEdsb2JhbCBvcHRpb25zIHVzZWQgd2hlbiB3aXRoaW4gZXh0ZXJuYWwgQVBJcy4gVGhpcyBpcyBtb2RpZmllZCB3aGVuXG4gIC8vIGNhbGxpbmcgdGhlIGBobGpzLmNvbmZpZ3VyZWAgZnVuY3Rpb24uXG4gIHZhciBvcHRpb25zID0ge1xuICAgIG5vSGlnaGxpZ2h0UmU6IC9eKG5vLT9oaWdobGlnaHQpJC9pLFxuICAgIGxhbmd1YWdlRGV0ZWN0UmU6IC9cXGJsYW5nKD86dWFnZSk/LShbXFx3LV0rKVxcYi9pLFxuICAgIGNsYXNzUHJlZml4OiAnaGxqcy0nLFxuICAgIHRhYlJlcGxhY2U6IG51bGwsXG4gICAgdXNlQlI6IGZhbHNlLFxuICAgIGxhbmd1YWdlczogdW5kZWZpbmVkLFxuICAgIC8vIGJldGEgY29uZmlndXJhdGlvbiBvcHRpb25zLCBzdWJqZWN0IHRvIGNoYW5nZSwgd2VsY29tZSB0byBkaXNjdXNzXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2hpZ2hsaWdodGpzL2hpZ2hsaWdodC5qcy9pc3N1ZXMvMTA4NlxuICAgIF9fZW1pdHRlcjogVG9rZW5UcmVlRW1pdHRlclxuICB9O1xuXG4gIC8qIFV0aWxpdHkgZnVuY3Rpb25zICovXG5cbiAgZnVuY3Rpb24gc2hvdWxkTm90SGlnaGxpZ2h0KGxhbmd1YWdlKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMubm9IaWdobGlnaHRSZS50ZXN0KGxhbmd1YWdlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJsb2NrTGFuZ3VhZ2UoYmxvY2spIHtcbiAgICB2YXIgbWF0Y2g7XG4gICAgdmFyIGNsYXNzZXMgPSBibG9jay5jbGFzc05hbWUgKyAnICc7XG5cbiAgICBjbGFzc2VzICs9IGJsb2NrLnBhcmVudE5vZGUgPyBibG9jay5wYXJlbnROb2RlLmNsYXNzTmFtZSA6ICcnO1xuXG4gICAgLy8gbGFuZ3VhZ2UtKiB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgbm9uLXByZWZpeGVkIGNsYXNzIG5hbWVzLlxuICAgIG1hdGNoID0gb3B0aW9ucy5sYW5ndWFnZURldGVjdFJlLmV4ZWMoY2xhc3Nlcyk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICB2YXIgbGFuZ3VhZ2UgPSBnZXRMYW5ndWFnZShtYXRjaFsxXSk7XG4gICAgICBpZiAoIWxhbmd1YWdlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihMQU5HVUFHRV9OT1RfRk9VTkQucmVwbGFjZShcInt9XCIsIG1hdGNoWzFdKSk7XG4gICAgICAgIGNvbnNvbGUud2FybihcIkZhbGxpbmcgYmFjayB0byBuby1oaWdobGlnaHQgbW9kZSBmb3IgdGhpcyBibG9jay5cIiwgYmxvY2spO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxhbmd1YWdlID8gbWF0Y2hbMV0gOiAnbm8taGlnaGxpZ2h0JztcbiAgICB9XG5cbiAgICByZXR1cm4gY2xhc3Nlc1xuICAgICAgLnNwbGl0KC9cXHMrLylcbiAgICAgIC5maW5kKChfY2xhc3MpID0+IHNob3VsZE5vdEhpZ2hsaWdodChfY2xhc3MpIHx8IGdldExhbmd1YWdlKF9jbGFzcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvcmUgaGlnaGxpZ2h0aW5nIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbGFuZ3VhZ2VOYW1lIC0gdGhlIGxhbmd1YWdlIHRvIHVzZSBmb3IgaGlnaGxpZ2h0aW5nXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjb2RlIC0gdGhlIGNvZGUgdG8gaGlnaGxpZ2h0XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gaWdub3JlX2lsbGVnYWxzIC0gd2hldGhlciB0byBpZ25vcmUgaWxsZWdhbCBtYXRjaGVzLCBkZWZhdWx0IGlzIHRvIGJhaWxcbiAgICogQHBhcmFtIHthcnJheTxtb2RlPn0gY29udGludWF0aW9uIC0gYXJyYXkgb2YgY29udGludWF0aW9uIG1vZGVzXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgdGhlIHJlc3VsdFxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gbGFuZ3VhZ2UgLSB0aGUgbGFuZ3VhZ2UgbmFtZVxuICAgKiBAcHJvcGVydHkge251bWJlcn0gcmVsZXZhbmNlIC0gdGhlIHJlbGV2YW5jZSBzY29yZVxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gdmFsdWUgLSB0aGUgaGlnaGxpZ2h0ZWQgSFRNTCBjb2RlXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBjb2RlIC0gdGhlIG9yaWdpbmFsIHJhdyBjb2RlXG4gICAqIEBwcm9wZXJ0eSB7bW9kZX0gdG9wIC0gdG9wIG9mIHRoZSBjdXJyZW50IG1vZGUgc3RhY2tcbiAgICogQHByb3BlcnR5IHtib29sZWFufSBpbGxlZ2FsIC0gaW5kaWNhdGVzIHdoZXRoZXIgYW55IGlsbGVnYWwgbWF0Y2hlcyB3ZXJlIGZvdW5kXG4gICovXG4gIGZ1bmN0aW9uIGhpZ2hsaWdodChsYW5ndWFnZU5hbWUsIGNvZGUsIGlnbm9yZV9pbGxlZ2FscywgY29udGludWF0aW9uKSB7XG4gICAgdmFyIGNvbnRleHQgPSB7XG4gICAgICBjb2RlLFxuICAgICAgbGFuZ3VhZ2U6IGxhbmd1YWdlTmFtZVxuICAgIH07XG4gICAgLy8gdGhlIHBsdWdpbiBjYW4gY2hhbmdlIHRoZSBkZXNpcmVkIGxhbmd1YWdlIG9yIHRoZSBjb2RlIHRvIGJlIGhpZ2hsaWdodGVkXG4gICAgLy8ganVzdCBiZSBjaGFuZ2luZyB0aGUgb2JqZWN0IGl0IHdhcyBwYXNzZWRcbiAgICBmaXJlKFwiYmVmb3JlOmhpZ2hsaWdodFwiLCBjb250ZXh0KTtcblxuICAgIC8vIGEgYmVmb3JlIHBsdWdpbiBjYW4gdXN1cnAgdGhlIHJlc3VsdCBjb21wbGV0ZWx5IGJ5IHByb3ZpZGluZyBpdCdzIG93blxuICAgIC8vIGluIHdoaWNoIGNhc2Ugd2UgZG9uJ3QgZXZlbiBuZWVkIHRvIGNhbGwgaGlnaGxpZ2h0XG4gICAgdmFyIHJlc3VsdCA9IGNvbnRleHQucmVzdWx0ID9cbiAgICAgIGNvbnRleHQucmVzdWx0IDpcbiAgICAgIF9oaWdobGlnaHQoY29udGV4dC5sYW5ndWFnZSwgY29udGV4dC5jb2RlLCBpZ25vcmVfaWxsZWdhbHMsIGNvbnRpbnVhdGlvbik7XG5cbiAgICByZXN1bHQuY29kZSA9IGNvbnRleHQuY29kZTtcbiAgICAvLyB0aGUgcGx1Z2luIGNhbiBjaGFuZ2UgYW55dGhpbmcgaW4gcmVzdWx0IHRvIHN1aXRlIGl0XG4gICAgZmlyZShcImFmdGVyOmhpZ2hsaWdodFwiLCByZXN1bHQpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIHByaXZhdGUgaGlnaGxpZ2h0IHRoYXQncyB1c2VkIGludGVybmFsbHkgYW5kIGRvZXMgbm90IGZpcmUgY2FsbGJhY2tzXG4gIGZ1bmN0aW9uIF9oaWdobGlnaHQobGFuZ3VhZ2VOYW1lLCBjb2RlLCBpZ25vcmVfaWxsZWdhbHMsIGNvbnRpbnVhdGlvbikge1xuICAgIHZhciBjb2RlVG9IaWdobGlnaHQgPSBjb2RlO1xuXG4gICAgZnVuY3Rpb24gZW5kT2ZNb2RlKG1vZGUsIGxleGVtZSkge1xuICAgICAgaWYgKHN0YXJ0c1dpdGgobW9kZS5lbmRSZSwgbGV4ZW1lKSkge1xuICAgICAgICB3aGlsZSAobW9kZS5lbmRzUGFyZW50ICYmIG1vZGUucGFyZW50KSB7XG4gICAgICAgICAgbW9kZSA9IG1vZGUucGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtb2RlO1xuICAgICAgfVxuICAgICAgaWYgKG1vZGUuZW5kc1dpdGhQYXJlbnQpIHtcbiAgICAgICAgcmV0dXJuIGVuZE9mTW9kZShtb2RlLnBhcmVudCwgbGV4ZW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBrZXl3b3JkTWF0Y2gobW9kZSwgbWF0Y2gpIHtcbiAgICAgIHZhciBtYXRjaF9zdHIgPSBsYW5ndWFnZS5jYXNlX2luc2Vuc2l0aXZlID8gbWF0Y2hbMF0udG9Mb3dlckNhc2UoKSA6IG1hdGNoWzBdO1xuICAgICAgcmV0dXJuIG1vZGUua2V5d29yZHMuaGFzT3duUHJvcGVydHkobWF0Y2hfc3RyKSAmJiBtb2RlLmtleXdvcmRzW21hdGNoX3N0cl07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0tleXdvcmRzKCkge1xuICAgICAgdmFyIGtleXdvcmRfbWF0Y2gsIGxhc3RfaW5kZXgsIG1hdGNoLCBidWY7XG5cbiAgICAgIGlmICghdG9wLmtleXdvcmRzKSB7XG4gICAgICAgIGVtaXR0ZXIuYWRkVGV4dChtb2RlX2J1ZmZlcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbGFzdF9pbmRleCA9IDA7XG4gICAgICB0b3AubGV4ZW1lc1JlLmxhc3RJbmRleCA9IDA7XG4gICAgICBtYXRjaCA9IHRvcC5sZXhlbWVzUmUuZXhlYyhtb2RlX2J1ZmZlcik7XG4gICAgICBidWYgPSBcIlwiO1xuXG4gICAgICB3aGlsZSAobWF0Y2gpIHtcbiAgICAgICAgYnVmICs9IG1vZGVfYnVmZmVyLnN1YnN0cmluZyhsYXN0X2luZGV4LCBtYXRjaC5pbmRleCk7XG4gICAgICAgIGtleXdvcmRfbWF0Y2ggPSBrZXl3b3JkTWF0Y2godG9wLCBtYXRjaCk7XG4gICAgICAgIHZhciBraW5kID0gbnVsbDtcbiAgICAgICAgaWYgKGtleXdvcmRfbWF0Y2gpIHtcbiAgICAgICAgICBlbWl0dGVyLmFkZFRleHQoYnVmKTtcbiAgICAgICAgICBidWYgPSBcIlwiO1xuXG4gICAgICAgICAgcmVsZXZhbmNlICs9IGtleXdvcmRfbWF0Y2hbMV07XG4gICAgICAgICAga2luZCA9IGtleXdvcmRfbWF0Y2hbMF07XG4gICAgICAgICAgZW1pdHRlci5hZGRLZXl3b3JkKG1hdGNoWzBdLCBraW5kKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBidWYgKz0gbWF0Y2hbMF07XG4gICAgICAgIH1cbiAgICAgICAgbGFzdF9pbmRleCA9IHRvcC5sZXhlbWVzUmUubGFzdEluZGV4O1xuICAgICAgICBtYXRjaCA9IHRvcC5sZXhlbWVzUmUuZXhlYyhtb2RlX2J1ZmZlcik7XG4gICAgICB9XG4gICAgICBidWYgKz0gbW9kZV9idWZmZXIuc3Vic3RyKGxhc3RfaW5kZXgpO1xuICAgICAgZW1pdHRlci5hZGRUZXh0KGJ1Zik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc1N1Ykxhbmd1YWdlKCkge1xuICAgICAgaWYgKG1vZGVfYnVmZmVyID09PSBcIlwiKSByZXR1cm47XG5cbiAgICAgIHZhciBleHBsaWNpdCA9IHR5cGVvZiB0b3Auc3ViTGFuZ3VhZ2UgPT09ICdzdHJpbmcnO1xuXG4gICAgICBpZiAoZXhwbGljaXQgJiYgIWxhbmd1YWdlc1t0b3Auc3ViTGFuZ3VhZ2VdKSB7XG4gICAgICAgIGVtaXR0ZXIuYWRkVGV4dChtb2RlX2J1ZmZlcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHJlc3VsdCA9IGV4cGxpY2l0ID9cbiAgICAgICAgICAgICAgICAgICBfaGlnaGxpZ2h0KHRvcC5zdWJMYW5ndWFnZSwgbW9kZV9idWZmZXIsIHRydWUsIGNvbnRpbnVhdGlvbnNbdG9wLnN1Ykxhbmd1YWdlXSkgOlxuICAgICAgICAgICAgICAgICAgIGhpZ2hsaWdodEF1dG8obW9kZV9idWZmZXIsIHRvcC5zdWJMYW5ndWFnZS5sZW5ndGggPyB0b3Auc3ViTGFuZ3VhZ2UgOiB1bmRlZmluZWQpO1xuXG4gICAgICAvLyBDb3VudGluZyBlbWJlZGRlZCBsYW5ndWFnZSBzY29yZSB0b3dhcmRzIHRoZSBob3N0IGxhbmd1YWdlIG1heSBiZSBkaXNhYmxlZFxuICAgICAgLy8gd2l0aCB6ZXJvaW5nIHRoZSBjb250YWluaW5nIG1vZGUgcmVsZXZhbmNlLiBVc2UgY2FzZSBpbiBwb2ludCBpcyBNYXJrZG93biB0aGF0XG4gICAgICAvLyBhbGxvd3MgWE1MIGV2ZXJ5d2hlcmUgYW5kIG1ha2VzIGV2ZXJ5IFhNTCBzbmlwcGV0IHRvIGhhdmUgYSBtdWNoIGxhcmdlciBNYXJrZG93blxuICAgICAgLy8gc2NvcmUuXG4gICAgICBpZiAodG9wLnJlbGV2YW5jZSA+IDApIHtcbiAgICAgICAgcmVsZXZhbmNlICs9IHJlc3VsdC5yZWxldmFuY2U7XG4gICAgICB9XG4gICAgICBpZiAoZXhwbGljaXQpIHtcbiAgICAgICAgY29udGludWF0aW9uc1t0b3Auc3ViTGFuZ3VhZ2VdID0gcmVzdWx0LnRvcDtcbiAgICAgIH1cbiAgICAgIGVtaXR0ZXIuYWRkU3VibGFuZ3VhZ2UocmVzdWx0LmVtaXR0ZXIsIHJlc3VsdC5sYW5ndWFnZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0J1ZmZlcigpIHtcbiAgICAgIGlmICh0b3Auc3ViTGFuZ3VhZ2UgIT0gbnVsbClcbiAgICAgICAgcHJvY2Vzc1N1Ykxhbmd1YWdlKCk7XG4gICAgICBlbHNlXG4gICAgICAgIHByb2Nlc3NLZXl3b3JkcygpO1xuICAgICAgbW9kZV9idWZmZXIgPSAnJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdGFydE5ld01vZGUobW9kZSkge1xuICAgICAgaWYgKG1vZGUuY2xhc3NOYW1lKSB7XG4gICAgICAgIGVtaXR0ZXIub3Blbk5vZGUobW9kZS5jbGFzc05hbWUpO1xuICAgICAgfVxuICAgICAgdG9wID0gT2JqZWN0LmNyZWF0ZShtb2RlLCB7cGFyZW50OiB7dmFsdWU6IHRvcH19KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkb0lnbm9yZShsZXhlbWUpIHtcbiAgICAgIGlmICh0b3AubWF0Y2hlci5yZWdleEluZGV4ID09PSAwKSB7XG4gICAgICAgIC8vIG5vIG1vcmUgcmVnZXhzIHRvIHBvdGVudGlhbGx5IG1hdGNoIGhlcmUsIHNvIHdlIG1vdmUgdGhlIGN1cnNvciBmb3J3YXJkIG9uZVxuICAgICAgICAvLyBzcGFjZVxuICAgICAgICBtb2RlX2J1ZmZlciArPSBsZXhlbWVbMF07XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm8gbmVlZCB0byBtb3ZlIHRoZSBjdXJzb3IsIHdlIHN0aWxsIGhhdmUgYWRkaXRpb25hbCByZWdleGVzIHRvIHRyeSBhbmRcbiAgICAgICAgLy8gbWF0Y2ggYXQgdGhpcyB2ZXJ5IHNwb3RcbiAgICAgICAgY29udGludWVTY2FuQXRTYW1lUG9zaXRpb24gPSB0cnVlO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkb0JlZ2luTWF0Y2gobWF0Y2gpIHtcbiAgICAgIHZhciBsZXhlbWUgPSBtYXRjaFswXTtcbiAgICAgIHZhciBuZXdfbW9kZSA9IG1hdGNoLnJ1bGU7XG5cbiAgICAgIGlmIChuZXdfbW9kZS5fX29uQmVnaW4pIHtcbiAgICAgICAgbGV0IHJlcyA9IG5ld19tb2RlLl9fb25CZWdpbihtYXRjaCkgfHwge307XG4gICAgICAgIGlmIChyZXMuaWdub3JlTWF0Y2gpXG4gICAgICAgICAgcmV0dXJuIGRvSWdub3JlKGxleGVtZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChuZXdfbW9kZSAmJiBuZXdfbW9kZS5lbmRTYW1lQXNCZWdpbikge1xuICAgICAgICBuZXdfbW9kZS5lbmRSZSA9IGVzY2FwZSggbGV4ZW1lICk7XG4gICAgICB9XG5cbiAgICAgIGlmIChuZXdfbW9kZS5za2lwKSB7XG4gICAgICAgIG1vZGVfYnVmZmVyICs9IGxleGVtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChuZXdfbW9kZS5leGNsdWRlQmVnaW4pIHtcbiAgICAgICAgICBtb2RlX2J1ZmZlciArPSBsZXhlbWU7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzc0J1ZmZlcigpO1xuICAgICAgICBpZiAoIW5ld19tb2RlLnJldHVybkJlZ2luICYmICFuZXdfbW9kZS5leGNsdWRlQmVnaW4pIHtcbiAgICAgICAgICBtb2RlX2J1ZmZlciA9IGxleGVtZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3RhcnROZXdNb2RlKG5ld19tb2RlKTtcbiAgICAgIHJldHVybiBuZXdfbW9kZS5yZXR1cm5CZWdpbiA/IDAgOiBsZXhlbWUubGVuZ3RoO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRvRW5kTWF0Y2gobWF0Y2gpIHtcbiAgICAgIHZhciBsZXhlbWUgPSBtYXRjaFswXTtcbiAgICAgIHZhciBtYXRjaFBsdXNSZW1haW5kZXIgPSBjb2RlVG9IaWdobGlnaHQuc3Vic3RyKG1hdGNoLmluZGV4KTtcbiAgICAgIHZhciBlbmRfbW9kZSA9IGVuZE9mTW9kZSh0b3AsIG1hdGNoUGx1c1JlbWFpbmRlcik7XG4gICAgICBpZiAoIWVuZF9tb2RlKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgb3JpZ2luID0gdG9wO1xuICAgICAgaWYgKG9yaWdpbi5za2lwKSB7XG4gICAgICAgIG1vZGVfYnVmZmVyICs9IGxleGVtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghKG9yaWdpbi5yZXR1cm5FbmQgfHwgb3JpZ2luLmV4Y2x1ZGVFbmQpKSB7XG4gICAgICAgICAgbW9kZV9idWZmZXIgKz0gbGV4ZW1lO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3NCdWZmZXIoKTtcbiAgICAgICAgaWYgKG9yaWdpbi5leGNsdWRlRW5kKSB7XG4gICAgICAgICAgbW9kZV9idWZmZXIgPSBsZXhlbWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRvIHtcbiAgICAgICAgaWYgKHRvcC5jbGFzc05hbWUpIHtcbiAgICAgICAgICBlbWl0dGVyLmNsb3NlTm9kZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdG9wLnNraXAgJiYgIXRvcC5zdWJMYW5ndWFnZSkge1xuICAgICAgICAgIHJlbGV2YW5jZSArPSB0b3AucmVsZXZhbmNlO1xuICAgICAgICB9XG4gICAgICAgIHRvcCA9IHRvcC5wYXJlbnQ7XG4gICAgICB9IHdoaWxlICh0b3AgIT09IGVuZF9tb2RlLnBhcmVudCk7XG4gICAgICBpZiAoZW5kX21vZGUuc3RhcnRzKSB7XG4gICAgICAgIGlmIChlbmRfbW9kZS5lbmRTYW1lQXNCZWdpbikge1xuICAgICAgICAgIGVuZF9tb2RlLnN0YXJ0cy5lbmRSZSA9IGVuZF9tb2RlLmVuZFJlO1xuICAgICAgICB9XG4gICAgICAgIHN0YXJ0TmV3TW9kZShlbmRfbW9kZS5zdGFydHMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaWdpbi5yZXR1cm5FbmQgPyAwIDogbGV4ZW1lLmxlbmd0aDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzQ29udGludWF0aW9ucygpIHtcbiAgICAgIHZhciBsaXN0ID0gW107XG4gICAgICBmb3IodmFyIGN1cnJlbnQgPSB0b3A7IGN1cnJlbnQgIT09IGxhbmd1YWdlOyBjdXJyZW50ID0gY3VycmVudC5wYXJlbnQpIHtcbiAgICAgICAgaWYgKGN1cnJlbnQuY2xhc3NOYW1lKSB7XG4gICAgICAgICAgbGlzdC51bnNoaWZ0KGN1cnJlbnQuY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4gZW1pdHRlci5vcGVuTm9kZShpdGVtKSk7XG4gICAgfVxuXG4gICAgdmFyIGxhc3RNYXRjaCA9IHt9O1xuICAgIGZ1bmN0aW9uIHByb2Nlc3NMZXhlbWUodGV4dF9iZWZvcmVfbWF0Y2gsIG1hdGNoKSB7XG5cbiAgICAgIHZhciBlcnI7XG4gICAgICB2YXIgbGV4ZW1lID0gbWF0Y2ggJiYgbWF0Y2hbMF07XG5cbiAgICAgIC8vIGFkZCBub24tbWF0Y2hlZCB0ZXh0IHRvIHRoZSBjdXJyZW50IG1vZGUgYnVmZmVyXG4gICAgICBtb2RlX2J1ZmZlciArPSB0ZXh0X2JlZm9yZV9tYXRjaDtcblxuICAgICAgaWYgKGxleGVtZSA9PSBudWxsKSB7XG4gICAgICAgIHByb2Nlc3NCdWZmZXIoKTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG5cblxuXG4gICAgICAvLyB3ZSd2ZSBmb3VuZCBhIDAgd2lkdGggbWF0Y2ggYW5kIHdlJ3JlIHN0dWNrLCBzbyB3ZSBuZWVkIHRvIGFkdmFuY2VcbiAgICAgIC8vIHRoaXMgaGFwcGVucyB3aGVuIHdlIGhhdmUgYmFkbHkgYmVoYXZlZCBydWxlcyB0aGF0IGhhdmUgb3B0aW9uYWwgbWF0Y2hlcnMgdG8gdGhlIGRlZ3JlZSB0aGF0XG4gICAgICAvLyBzb21ldGltZXMgdGhleSBjYW4gZW5kIHVwIG1hdGNoaW5nIG5vdGhpbmcgYXQgYWxsXG4gICAgICAvLyBSZWY6IGh0dHBzOi8vZ2l0aHViLmNvbS9oaWdobGlnaHRqcy9oaWdobGlnaHQuanMvaXNzdWVzLzIxNDBcbiAgICAgIGlmIChsYXN0TWF0Y2gudHlwZT09XCJiZWdpblwiICYmIG1hdGNoLnR5cGU9PVwiZW5kXCIgJiYgbGFzdE1hdGNoLmluZGV4ID09IG1hdGNoLmluZGV4ICYmIGxleGVtZSA9PT0gXCJcIikge1xuICAgICAgICAvLyBzcGl0IHRoZSBcInNraXBwZWRcIiBjaGFyYWN0ZXIgdGhhdCBvdXIgcmVnZXggY2hva2VkIG9uIGJhY2sgaW50byB0aGUgb3V0cHV0IHNlcXVlbmNlXG4gICAgICAgIG1vZGVfYnVmZmVyICs9IGNvZGVUb0hpZ2hsaWdodC5zbGljZShtYXRjaC5pbmRleCwgbWF0Y2guaW5kZXggKyAxKTtcbiAgICAgICAgaWYgKCFTQUZFX01PREUpIHtcbiAgICAgICAgICBlcnIgPSBuZXcgRXJyb3IoJzAgd2lkdGggbWF0Y2ggcmVnZXgnKTtcbiAgICAgICAgICBlcnIubGFuZ3VhZ2VOYW1lID0gbGFuZ3VhZ2VOYW1lO1xuICAgICAgICAgIGVyci5iYWRSdWxlID0gbGFzdE1hdGNoLnJ1bGU7XG4gICAgICAgICAgdGhyb3coZXJyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIGxhc3RNYXRjaCA9IG1hdGNoO1xuXG4gICAgICBpZiAobWF0Y2gudHlwZT09PVwiYmVnaW5cIikge1xuICAgICAgICByZXR1cm4gZG9CZWdpbk1hdGNoKG1hdGNoKTtcbiAgICAgIH0gZWxzZSBpZiAobWF0Y2gudHlwZT09PVwiaWxsZWdhbFwiICYmICFpZ25vcmVfaWxsZWdhbHMpIHtcbiAgICAgICAgLy8gaWxsZWdhbCBtYXRjaCwgd2UgZG8gbm90IGNvbnRpbnVlIHByb2Nlc3NpbmdcbiAgICAgICAgZXJyID0gbmV3IEVycm9yKCdJbGxlZ2FsIGxleGVtZSBcIicgKyBsZXhlbWUgKyAnXCIgZm9yIG1vZGUgXCInICsgKHRvcC5jbGFzc05hbWUgfHwgJzx1bm5hbWVkPicpICsgJ1wiJyk7XG4gICAgICAgIGVyci5tb2RlID0gdG9wO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9IGVsc2UgaWYgKG1hdGNoLnR5cGU9PT1cImVuZFwiKSB7XG4gICAgICAgIHZhciBwcm9jZXNzZWQgPSBkb0VuZE1hdGNoKG1hdGNoKTtcbiAgICAgICAgaWYgKHByb2Nlc3NlZCAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgcmV0dXJuIHByb2Nlc3NlZDtcbiAgICAgIH1cblxuICAgICAgLypcbiAgICAgIFdoeSBtaWdodCBiZSBmaW5kIG91cnNlbHZlcyBoZXJlPyAgT25seSBvbmUgb2NjYXNpb24gbm93LiAgQW4gZW5kIG1hdGNoIHRoYXQgd2FzXG4gICAgICB0cmlnZ2VyZWQgYnV0IGNvdWxkIG5vdCBiZSBjb21wbGV0ZWQuICBXaGVuIG1pZ2h0IHRoaXMgaGFwcGVuPyAgV2hlbiBhbiBgZW5kU2FtZWFzQmVnaW5gXG4gICAgICBydWxlIHNldHMgdGhlIGVuZCBydWxlIHRvIGEgc3BlY2lmaWMgbWF0Y2guICBTaW5jZSB0aGUgb3ZlcmFsbCBtb2RlIHRlcm1pbmF0aW9uIHJ1bGUgdGhhdCdzXG4gICAgICBiZWluZyB1c2VkIHRvIHNjYW4gdGhlIHRleHQgaXNuJ3QgcmVjb21waWxlZCB0aGF0IG1lYW5zIHRoYXQgYW55IG1hdGNoIHRoYXQgTE9PS1MgbGlrZVxuICAgICAgdGhlIGVuZCAoYnV0IGlzIG5vdCwgYmVjYXVzZSBpdCBpcyBub3QgYW4gZXhhY3QgbWF0Y2ggdG8gdGhlIGJlZ2lubmluZykgd2lsbFxuICAgICAgZW5kIHVwIGhlcmUuICBBIGRlZmluaXRlIGVuZCBtYXRjaCwgYnV0IHdoZW4gYGRvRW5kTWF0Y2hgIHRyaWVzIHRvIFwicmVhcHBseVwiXG4gICAgICB0aGUgZW5kIHJ1bGUgYW5kIGZhaWxzIHRvIG1hdGNoLCB3ZSB3aW5kIHVwIGhlcmUsIGFuZCBqdXN0IHNpbGVudGx5IGlnbm9yZSB0aGUgZW5kLlxuXG4gICAgICBUaGlzIGNhdXNlcyBubyByZWFsIGhhcm0gb3RoZXIgdGhhbiBzdG9wcGluZyBhIGZldyB0aW1lcyB0b28gbWFueS5cbiAgICAgICovXG5cbiAgICAgIG1vZGVfYnVmZmVyICs9IGxleGVtZTtcbiAgICAgIHJldHVybiBsZXhlbWUubGVuZ3RoO1xuICAgIH1cblxuICAgIHZhciBsYW5ndWFnZSA9IGdldExhbmd1YWdlKGxhbmd1YWdlTmFtZSk7XG4gICAgaWYgKCFsYW5ndWFnZSkge1xuICAgICAgY29uc29sZS5lcnJvcihMQU5HVUFHRV9OT1RfRk9VTkQucmVwbGFjZShcInt9XCIsIGxhbmd1YWdlTmFtZSkpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxhbmd1YWdlOiBcIicgKyBsYW5ndWFnZU5hbWUgKyAnXCInKTtcbiAgICB9XG5cbiAgICBjb21waWxlTGFuZ3VhZ2UobGFuZ3VhZ2UpO1xuICAgIHZhciB0b3AgPSBjb250aW51YXRpb24gfHwgbGFuZ3VhZ2U7XG4gICAgdmFyIGNvbnRpbnVhdGlvbnMgPSB7fTsgLy8ga2VlcCBjb250aW51YXRpb25zIGZvciBzdWItbGFuZ3VhZ2VzXG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgZW1pdHRlciA9IG5ldyBvcHRpb25zLl9fZW1pdHRlcihvcHRpb25zKTtcbiAgICBwcm9jZXNzQ29udGludWF0aW9ucygpO1xuICAgIHZhciBtb2RlX2J1ZmZlciA9ICcnO1xuICAgIHZhciByZWxldmFuY2UgPSAwO1xuICAgIHZhciBtYXRjaCwgcHJvY2Vzc2VkQ291bnQsIGluZGV4ID0gMDtcblxuICAgIHRyeSB7XG4gICAgICB2YXIgY29udGludWVTY2FuQXRTYW1lUG9zaXRpb24gPSBmYWxzZTtcbiAgICAgIHRvcC5tYXRjaGVyLmNvbnNpZGVyQWxsKCk7XG5cbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGlmIChjb250aW51ZVNjYW5BdFNhbWVQb3NpdGlvbikge1xuICAgICAgICAgIGNvbnRpbnVlU2NhbkF0U2FtZVBvc2l0aW9uID0gZmFsc2U7XG4gICAgICAgICAgLy8gb25seSByZWdleGVzIG5vdCBtYXRjaGVkIHByZXZpb3VzbHkgd2lsbCBub3cgYmVcbiAgICAgICAgICAvLyBjb25zaWRlcmVkIGZvciBhIHBvdGVudGlhbCBtYXRjaFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRvcC5tYXRjaGVyLmxhc3RJbmRleCA9IGluZGV4O1xuICAgICAgICAgIHRvcC5tYXRjaGVyLmNvbnNpZGVyQWxsKCk7XG4gICAgICAgIH1cbiAgICAgICAgbWF0Y2ggPSB0b3AubWF0Y2hlci5leGVjKGNvZGVUb0hpZ2hsaWdodCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwibWF0Y2hcIiwgbWF0Y2hbMF0sIG1hdGNoLnJ1bGUgJiYgbWF0Y2gucnVsZS5iZWdpbilcbiAgICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgbGV0IGJlZm9yZU1hdGNoID0gY29kZVRvSGlnaGxpZ2h0LnN1YnN0cmluZyhpbmRleCwgbWF0Y2guaW5kZXgpO1xuICAgICAgICBwcm9jZXNzZWRDb3VudCA9IHByb2Nlc3NMZXhlbWUoYmVmb3JlTWF0Y2gsIG1hdGNoKTtcbiAgICAgICAgaW5kZXggPSBtYXRjaC5pbmRleCArIHByb2Nlc3NlZENvdW50O1xuICAgICAgfVxuICAgICAgcHJvY2Vzc0xleGVtZShjb2RlVG9IaWdobGlnaHQuc3Vic3RyKGluZGV4KSk7XG4gICAgICBlbWl0dGVyLmNsb3NlQWxsTm9kZXMoKTtcbiAgICAgIGVtaXR0ZXIuZmluYWxpemUoKTtcbiAgICAgIHJlc3VsdCA9IGVtaXR0ZXIudG9IVE1MKCk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlbGV2YW5jZTogcmVsZXZhbmNlLFxuICAgICAgICB2YWx1ZTogcmVzdWx0LFxuICAgICAgICBsYW5ndWFnZTogbGFuZ3VhZ2VOYW1lLFxuICAgICAgICBpbGxlZ2FsOiBmYWxzZSxcbiAgICAgICAgZW1pdHRlcjogZW1pdHRlcixcbiAgICAgICAgdG9wOiB0b3BcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyLm1lc3NhZ2UgJiYgZXJyLm1lc3NhZ2UuaW5jbHVkZXMoJ0lsbGVnYWwnKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlsbGVnYWw6IHRydWUsXG4gICAgICAgICAgaWxsZWdhbEJ5OiB7XG4gICAgICAgICAgICBtc2c6IGVyci5tZXNzYWdlLFxuICAgICAgICAgICAgY29udGV4dDogY29kZVRvSGlnaGxpZ2h0LnNsaWNlKGluZGV4LTEwMCxpbmRleCsxMDApLFxuICAgICAgICAgICAgbW9kZTogZXJyLm1vZGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNvZmFyOiByZXN1bHQsXG4gICAgICAgICAgcmVsZXZhbmNlOiAwLFxuICAgICAgICAgIHZhbHVlOiBlc2NhcGUkMShjb2RlVG9IaWdobGlnaHQpLFxuICAgICAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKFNBRkVfTU9ERSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlbGV2YW5jZTogMCxcbiAgICAgICAgICB2YWx1ZTogZXNjYXBlJDEoY29kZVRvSGlnaGxpZ2h0KSxcbiAgICAgICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgICAgIGxhbmd1YWdlOiBsYW5ndWFnZU5hbWUsXG4gICAgICAgICAgdG9wOiB0b3AsXG4gICAgICAgICAgZXJyb3JSYWlzZWQ6IGVyclxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIHJldHVybnMgYSB2YWxpZCBoaWdobGlnaHQgcmVzdWx0LCB3aXRob3V0IGFjdHVhbGx5XG4gIC8vIGRvaW5nIGFueSBhY3R1YWwgd29yaywgYXV0byBoaWdobGlnaHQgc3RhcnRzIHdpdGhcbiAgLy8gdGhpcyBhbmQgaXQncyBwb3NzaWJsZSBmb3Igc21hbGwgc25pcHBldHMgdGhhdFxuICAvLyBhdXRvLWRldGVjdGlvbiBtYXkgbm90IGZpbmQgYSBiZXR0ZXIgbWF0Y2hcbiAgZnVuY3Rpb24ganVzdFRleHRIaWdobGlnaHRSZXN1bHQoY29kZSkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgIHJlbGV2YW5jZTogMCxcbiAgICAgIGVtaXR0ZXI6IG5ldyBvcHRpb25zLl9fZW1pdHRlcihvcHRpb25zKSxcbiAgICAgIHZhbHVlOiBlc2NhcGUkMShjb2RlKSxcbiAgICAgIGlsbGVnYWw6IGZhbHNlLFxuICAgICAgdG9wOiBQTEFJTlRFWFRfTEFOR1VBR0VcbiAgICB9O1xuICAgIHJlc3VsdC5lbWl0dGVyLmFkZFRleHQoY29kZSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qXG4gIEhpZ2hsaWdodGluZyB3aXRoIGxhbmd1YWdlIGRldGVjdGlvbi4gQWNjZXB0cyBhIHN0cmluZyB3aXRoIHRoZSBjb2RlIHRvXG4gIGhpZ2hsaWdodC4gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG5cbiAgLSBsYW5ndWFnZSAoZGV0ZWN0ZWQgbGFuZ3VhZ2UpXG4gIC0gcmVsZXZhbmNlIChpbnQpXG4gIC0gdmFsdWUgKGFuIEhUTUwgc3RyaW5nIHdpdGggaGlnaGxpZ2h0aW5nIG1hcmt1cClcbiAgLSBzZWNvbmRfYmVzdCAob2JqZWN0IHdpdGggdGhlIHNhbWUgc3RydWN0dXJlIGZvciBzZWNvbmQtYmVzdCBoZXVyaXN0aWNhbGx5XG4gICAgZGV0ZWN0ZWQgbGFuZ3VhZ2UsIG1heSBiZSBhYnNlbnQpXG5cbiAgKi9cbiAgZnVuY3Rpb24gaGlnaGxpZ2h0QXV0byhjb2RlLCBsYW5ndWFnZVN1YnNldCkge1xuICAgIGxhbmd1YWdlU3Vic2V0ID0gbGFuZ3VhZ2VTdWJzZXQgfHwgb3B0aW9ucy5sYW5ndWFnZXMgfHwgT2JqZWN0LmtleXMobGFuZ3VhZ2VzKTtcbiAgICB2YXIgcmVzdWx0ID0ganVzdFRleHRIaWdobGlnaHRSZXN1bHQoY29kZSk7XG4gICAgdmFyIHNlY29uZF9iZXN0ID0gcmVzdWx0O1xuICAgIGxhbmd1YWdlU3Vic2V0LmZpbHRlcihnZXRMYW5ndWFnZSkuZmlsdGVyKGF1dG9EZXRlY3Rpb24pLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGN1cnJlbnQgPSBfaGlnaGxpZ2h0KG5hbWUsIGNvZGUsIGZhbHNlKTtcbiAgICAgIGN1cnJlbnQubGFuZ3VhZ2UgPSBuYW1lO1xuICAgICAgaWYgKGN1cnJlbnQucmVsZXZhbmNlID4gc2Vjb25kX2Jlc3QucmVsZXZhbmNlKSB7XG4gICAgICAgIHNlY29uZF9iZXN0ID0gY3VycmVudDtcbiAgICAgIH1cbiAgICAgIGlmIChjdXJyZW50LnJlbGV2YW5jZSA+IHJlc3VsdC5yZWxldmFuY2UpIHtcbiAgICAgICAgc2Vjb25kX2Jlc3QgPSByZXN1bHQ7XG4gICAgICAgIHJlc3VsdCA9IGN1cnJlbnQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHNlY29uZF9iZXN0Lmxhbmd1YWdlKSB7XG4gICAgICByZXN1bHQuc2Vjb25kX2Jlc3QgPSBzZWNvbmRfYmVzdDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qXG4gIFBvc3QtcHJvY2Vzc2luZyBvZiB0aGUgaGlnaGxpZ2h0ZWQgbWFya3VwOlxuXG4gIC0gcmVwbGFjZSBUQUJzIHdpdGggc29tZXRoaW5nIG1vcmUgdXNlZnVsXG4gIC0gcmVwbGFjZSByZWFsIGxpbmUtYnJlYWtzIHdpdGggJzxicj4nIGZvciBub24tcHJlIGNvbnRhaW5lcnNcblxuICAqL1xuICBmdW5jdGlvbiBmaXhNYXJrdXAodmFsdWUpIHtcbiAgICBpZiAoIShvcHRpb25zLnRhYlJlcGxhY2UgfHwgb3B0aW9ucy51c2VCUikpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWUucmVwbGFjZShmaXhNYXJrdXBSZSwgZnVuY3Rpb24obWF0Y2gsIHAxKSB7XG4gICAgICAgIGlmIChvcHRpb25zLnVzZUJSICYmIG1hdGNoID09PSAnXFxuJykge1xuICAgICAgICAgIHJldHVybiAnPGJyPic7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy50YWJSZXBsYWNlKSB7XG4gICAgICAgICAgcmV0dXJuIHAxLnJlcGxhY2UoL1xcdC9nLCBvcHRpb25zLnRhYlJlcGxhY2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1aWxkQ2xhc3NOYW1lKHByZXZDbGFzc05hbWUsIGN1cnJlbnRMYW5nLCByZXN1bHRMYW5nKSB7XG4gICAgdmFyIGxhbmd1YWdlID0gY3VycmVudExhbmcgPyBhbGlhc2VzW2N1cnJlbnRMYW5nXSA6IHJlc3VsdExhbmcsXG4gICAgICAgIHJlc3VsdCAgID0gW3ByZXZDbGFzc05hbWUudHJpbSgpXTtcblxuICAgIGlmICghcHJldkNsYXNzTmFtZS5tYXRjaCgvXFxiaGxqc1xcYi8pKSB7XG4gICAgICByZXN1bHQucHVzaCgnaGxqcycpO1xuICAgIH1cblxuICAgIGlmICghcHJldkNsYXNzTmFtZS5pbmNsdWRlcyhsYW5ndWFnZSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGxhbmd1YWdlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0LmpvaW4oJyAnKS50cmltKCk7XG4gIH1cblxuICAvKlxuICBBcHBsaWVzIGhpZ2hsaWdodGluZyB0byBhIERPTSBub2RlIGNvbnRhaW5pbmcgY29kZS4gQWNjZXB0cyBhIERPTSBub2RlIGFuZFxuICB0d28gb3B0aW9uYWwgcGFyYW1ldGVycyBmb3IgZml4TWFya3VwLlxuICAqL1xuICBmdW5jdGlvbiBoaWdobGlnaHRCbG9jayhibG9jaykge1xuICAgIHZhciBub2RlLCBvcmlnaW5hbFN0cmVhbSwgcmVzdWx0LCByZXN1bHROb2RlLCB0ZXh0O1xuICAgIHZhciBsYW5ndWFnZSA9IGJsb2NrTGFuZ3VhZ2UoYmxvY2spO1xuXG4gICAgaWYgKHNob3VsZE5vdEhpZ2hsaWdodChsYW5ndWFnZSkpXG4gICAgICAgIHJldHVybjtcblxuICAgIGZpcmUoXCJiZWZvcmU6aGlnaGxpZ2h0QmxvY2tcIixcbiAgICAgIHsgYmxvY2s6IGJsb2NrLCBsYW5ndWFnZTogbGFuZ3VhZ2V9KTtcblxuICAgIGlmIChvcHRpb25zLnVzZUJSKSB7XG4gICAgICBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBub2RlLmlubmVySFRNTCA9IGJsb2NrLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJycpLnJlcGxhY2UoLzxiclsgXFwvXSo+L2csICdcXG4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZSA9IGJsb2NrO1xuICAgIH1cbiAgICB0ZXh0ID0gbm9kZS50ZXh0Q29udGVudDtcbiAgICByZXN1bHQgPSBsYW5ndWFnZSA/IGhpZ2hsaWdodChsYW5ndWFnZSwgdGV4dCwgdHJ1ZSkgOiBoaWdobGlnaHRBdXRvKHRleHQpO1xuXG4gICAgb3JpZ2luYWxTdHJlYW0gPSBub2RlU3RyZWFtJDEobm9kZSk7XG4gICAgaWYgKG9yaWdpbmFsU3RyZWFtLmxlbmd0aCkge1xuICAgICAgcmVzdWx0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgcmVzdWx0Tm9kZS5pbm5lckhUTUwgPSByZXN1bHQudmFsdWU7XG4gICAgICByZXN1bHQudmFsdWUgPSBtZXJnZVN0cmVhbXMkMShvcmlnaW5hbFN0cmVhbSwgbm9kZVN0cmVhbSQxKHJlc3VsdE5vZGUpLCB0ZXh0KTtcbiAgICB9XG4gICAgcmVzdWx0LnZhbHVlID0gZml4TWFya3VwKHJlc3VsdC52YWx1ZSk7XG5cbiAgICBmaXJlKFwiYWZ0ZXI6aGlnaGxpZ2h0QmxvY2tcIiwgeyBibG9jazogYmxvY2ssIHJlc3VsdDogcmVzdWx0fSk7XG5cbiAgICBibG9jay5pbm5lckhUTUwgPSByZXN1bHQudmFsdWU7XG4gICAgYmxvY2suY2xhc3NOYW1lID0gYnVpbGRDbGFzc05hbWUoYmxvY2suY2xhc3NOYW1lLCBsYW5ndWFnZSwgcmVzdWx0Lmxhbmd1YWdlKTtcbiAgICBibG9jay5yZXN1bHQgPSB7XG4gICAgICBsYW5ndWFnZTogcmVzdWx0Lmxhbmd1YWdlLFxuICAgICAgcmU6IHJlc3VsdC5yZWxldmFuY2VcbiAgICB9O1xuICAgIGlmIChyZXN1bHQuc2Vjb25kX2Jlc3QpIHtcbiAgICAgIGJsb2NrLnNlY29uZF9iZXN0ID0ge1xuICAgICAgICBsYW5ndWFnZTogcmVzdWx0LnNlY29uZF9iZXN0Lmxhbmd1YWdlLFxuICAgICAgICByZTogcmVzdWx0LnNlY29uZF9iZXN0LnJlbGV2YW5jZVxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKlxuICBVcGRhdGVzIGhpZ2hsaWdodC5qcyBnbG9iYWwgb3B0aW9ucyB3aXRoIHZhbHVlcyBwYXNzZWQgaW4gdGhlIGZvcm0gb2YgYW4gb2JqZWN0LlxuICAqL1xuICBmdW5jdGlvbiBjb25maWd1cmUodXNlcl9vcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IGluaGVyaXQkMShvcHRpb25zLCB1c2VyX29wdGlvbnMpO1xuICB9XG5cbiAgLypcbiAgQXBwbGllcyBoaWdobGlnaHRpbmcgdG8gYWxsIDxwcmU+PGNvZGU+Li48L2NvZGU+PC9wcmU+IGJsb2NrcyBvbiBhIHBhZ2UuXG4gICovXG4gIGZ1bmN0aW9uIGluaXRIaWdobGlnaHRpbmcoKSB7XG4gICAgaWYgKGluaXRIaWdobGlnaHRpbmcuY2FsbGVkKVxuICAgICAgcmV0dXJuO1xuICAgIGluaXRIaWdobGlnaHRpbmcuY2FsbGVkID0gdHJ1ZTtcblxuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdwcmUgY29kZScpO1xuICAgIEFycmF5UHJvdG8uZm9yRWFjaC5jYWxsKGJsb2NrcywgaGlnaGxpZ2h0QmxvY2spO1xuICB9XG5cbiAgLypcbiAgQXR0YWNoZXMgaGlnaGxpZ2h0aW5nIHRvIHRoZSBwYWdlIGxvYWQgZXZlbnQuXG4gICovXG4gIGZ1bmN0aW9uIGluaXRIaWdobGlnaHRpbmdPbkxvYWQoKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBpbml0SGlnaGxpZ2h0aW5nLCBmYWxzZSk7XG4gIH1cblxuICBjb25zdCBQTEFJTlRFWFRfTEFOR1VBR0UgPSB7IGRpc2FibGVBdXRvZGV0ZWN0OiB0cnVlLCBuYW1lOiAnUGxhaW4gdGV4dCcgfTtcblxuICBmdW5jdGlvbiByZWdpc3Rlckxhbmd1YWdlKG5hbWUsIGxhbmd1YWdlKSB7XG4gICAgdmFyIGxhbmc7XG4gICAgdHJ5IHsgbGFuZyA9IGxhbmd1YWdlKGhsanMpOyB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiTGFuZ3VhZ2UgZGVmaW5pdGlvbiBmb3IgJ3t9JyBjb3VsZCBub3QgYmUgcmVnaXN0ZXJlZC5cIi5yZXBsYWNlKFwie31cIiwgbmFtZSkpO1xuICAgICAgLy8gaGFyZCBvciBzb2Z0IGVycm9yXG4gICAgICBpZiAoIVNBRkVfTU9ERSkgeyB0aHJvdyBlcnJvcjsgfSBlbHNlIHsgY29uc29sZS5lcnJvcihlcnJvcik7IH1cbiAgICAgIC8vIGxhbmd1YWdlcyB0aGF0IGhhdmUgc2VyaW91cyBlcnJvcnMgYXJlIHJlcGxhY2VkIHdpdGggZXNzZW50aWFsbHkgYVxuICAgICAgLy8gXCJwbGFpbnRleHRcIiBzdGFuZC1pbiBzbyB0aGF0IHRoZSBjb2RlIGJsb2NrcyB3aWxsIHN0aWxsIGdldCBub3JtYWxcbiAgICAgIC8vIGNzcyBjbGFzc2VzIGFwcGxpZWQgdG8gdGhlbSAtIGFuZCBvbmUgYmFkIGxhbmd1YWdlIHdvbid0IGJyZWFrIHRoZVxuICAgICAgLy8gZW50aXJlIGhpZ2hsaWdodGVyXG4gICAgICBsYW5nID0gUExBSU5URVhUX0xBTkdVQUdFO1xuICAgIH1cbiAgICAvLyBnaXZlIGl0IGEgdGVtcG9yYXJ5IG5hbWUgaWYgaXQgZG9lc24ndCBoYXZlIG9uZSBpbiB0aGUgbWV0YS1kYXRhXG4gICAgaWYgKCFsYW5nLm5hbWUpXG4gICAgICBsYW5nLm5hbWUgPSBuYW1lO1xuICAgIGxhbmd1YWdlc1tuYW1lXSA9IGxhbmc7XG4gICAgbGFuZy5yYXdEZWZpbml0aW9uID0gbGFuZ3VhZ2UuYmluZChudWxsLGhsanMpO1xuXG4gICAgaWYgKGxhbmcuYWxpYXNlcykge1xuICAgICAgbGFuZy5hbGlhc2VzLmZvckVhY2goZnVuY3Rpb24oYWxpYXMpIHthbGlhc2VzW2FsaWFzXSA9IG5hbWU7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbGlzdExhbmd1YWdlcygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMobGFuZ3VhZ2VzKTtcbiAgfVxuXG4gIC8qXG4gICAgaW50ZW5kZWQgdXNhZ2U6IFdoZW4gb25lIGxhbmd1YWdlIHRydWx5IHJlcXVpcmVzIGFub3RoZXJcblxuICAgIFVubGlrZSBgZ2V0TGFuZ3VhZ2VgLCB0aGlzIHdpbGwgdGhyb3cgd2hlbiB0aGUgcmVxdWVzdGVkIGxhbmd1YWdlXG4gICAgaXMgbm90IGF2YWlsYWJsZS5cbiAgKi9cbiAgZnVuY3Rpb24gcmVxdWlyZUxhbmd1YWdlKG5hbWUpIHtcbiAgICB2YXIgbGFuZyA9IGdldExhbmd1YWdlKG5hbWUpO1xuICAgIGlmIChsYW5nKSB7IHJldHVybiBsYW5nOyB9XG5cbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdUaGUgXFwne31cXCcgbGFuZ3VhZ2UgaXMgcmVxdWlyZWQsIGJ1dCBub3QgbG9hZGVkLicucmVwbGFjZSgne30nLG5hbWUpKTtcbiAgICB0aHJvdyBlcnI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRMYW5ndWFnZShuYW1lKSB7XG4gICAgbmFtZSA9IChuYW1lIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiBsYW5ndWFnZXNbbmFtZV0gfHwgbGFuZ3VhZ2VzW2FsaWFzZXNbbmFtZV1dO1xuICB9XG5cbiAgZnVuY3Rpb24gYXV0b0RldGVjdGlvbihuYW1lKSB7XG4gICAgdmFyIGxhbmcgPSBnZXRMYW5ndWFnZShuYW1lKTtcbiAgICByZXR1cm4gbGFuZyAmJiAhbGFuZy5kaXNhYmxlQXV0b2RldGVjdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFBsdWdpbihwbHVnaW4sIG9wdGlvbnMpIHtcbiAgICBwbHVnaW5zLnB1c2gocGx1Z2luKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpcmUoZXZlbnQsIGFyZ3MpIHtcbiAgICB2YXIgY2IgPSBldmVudDtcbiAgICBwbHVnaW5zLmZvckVhY2goZnVuY3Rpb24gKHBsdWdpbikge1xuICAgICAgaWYgKHBsdWdpbltjYl0pIHtcbiAgICAgICAgcGx1Z2luW2NiXShhcmdzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qIEludGVyZmFjZSBkZWZpbml0aW9uICovXG5cbiAgT2JqZWN0LmFzc2lnbihobGpzLHtcbiAgICBoaWdobGlnaHQsXG4gICAgaGlnaGxpZ2h0QXV0byxcbiAgICBmaXhNYXJrdXAsXG4gICAgaGlnaGxpZ2h0QmxvY2ssXG4gICAgY29uZmlndXJlLFxuICAgIGluaXRIaWdobGlnaHRpbmcsXG4gICAgaW5pdEhpZ2hsaWdodGluZ09uTG9hZCxcbiAgICByZWdpc3Rlckxhbmd1YWdlLFxuICAgIGxpc3RMYW5ndWFnZXMsXG4gICAgZ2V0TGFuZ3VhZ2UsXG4gICAgcmVxdWlyZUxhbmd1YWdlLFxuICAgIGF1dG9EZXRlY3Rpb24sXG4gICAgaW5oZXJpdDogaW5oZXJpdCQxLFxuICAgIGFkZFBsdWdpblxuICB9KTtcblxuICBobGpzLmRlYnVnTW9kZSA9IGZ1bmN0aW9uKCkgeyBTQUZFX01PREUgPSBmYWxzZTsgfTtcbiAgaGxqcy5zYWZlTW9kZSA9IGZ1bmN0aW9uKCkgeyBTQUZFX01PREUgPSB0cnVlOyB9O1xuICBobGpzLnZlcnNpb25TdHJpbmcgPSB2ZXJzaW9uO1xuXG4gIGZvciAoY29uc3Qga2V5IGluIE1PREVTKSB7XG4gICAgaWYgKHR5cGVvZiBNT0RFU1trZXldID09PSBcIm9iamVjdFwiKVxuICAgICAgZGVlcEZyZWV6ZShNT0RFU1trZXldKTtcbiAgfVxuXG4gIC8vIG1lcmdlIGFsbCB0aGUgbW9kZXMvcmVnZXhzIGludG8gb3VyIG1haW4gb2JqZWN0XG4gIE9iamVjdC5hc3NpZ24oaGxqcywgTU9ERVMpO1xuXG4gIHJldHVybiBobGpzO1xufTtcblxuLy8gZXhwb3J0IGFuIFwiaW5zdGFuY2VcIiBvZiB0aGUgaGlnaGxpZ2h0ZXJcbnZhciBoaWdobGlnaHQgPSBITEpTKHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBoaWdobGlnaHQ7XG4iLCIvKlxuTGFuZ3VhZ2U6IEphdmFTY3JpcHRcbkRlc2NyaXB0aW9uOiBKYXZhU2NyaXB0IChKUykgaXMgYSBsaWdodHdlaWdodCwgaW50ZXJwcmV0ZWQsIG9yIGp1c3QtaW4tdGltZSBjb21waWxlZCBwcm9ncmFtbWluZyBsYW5ndWFnZSB3aXRoIGZpcnN0LWNsYXNzIGZ1bmN0aW9ucy5cbkNhdGVnb3J5OiBjb21tb24sIHNjcmlwdGluZ1xuV2Vic2l0ZTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdFxuKi9cblxuZnVuY3Rpb24gamF2YXNjcmlwdChobGpzKSB7XG4gIHZhciBGUkFHTUVOVCA9IHtcbiAgICBiZWdpbjogJzw+JyxcbiAgICBlbmQ6ICc8Lz4nXG4gIH07XG4gIHZhciBYTUxfVEFHID0ge1xuICAgIGJlZ2luOiAvPFtBLVphLXowLTlcXFxcLl86LV0rLyxcbiAgICBlbmQ6IC9cXC9bQS1aYS16MC05XFxcXC5fOi1dKz58XFwvPi9cbiAgfTtcbiAgdmFyIElERU5UX1JFID0gJ1tBLVphLXokX11bMC05QS1aYS16JF9dKic7XG4gIHZhciBLRVlXT1JEUyA9IHtcbiAgICBrZXl3b3JkOlxuICAgICAgJ2luIG9mIGlmIGZvciB3aGlsZSBmaW5hbGx5IHZhciBuZXcgZnVuY3Rpb24gZG8gcmV0dXJuIHZvaWQgZWxzZSBicmVhayBjYXRjaCAnICtcbiAgICAgICdpbnN0YW5jZW9mIHdpdGggdGhyb3cgY2FzZSBkZWZhdWx0IHRyeSB0aGlzIHN3aXRjaCBjb250aW51ZSB0eXBlb2YgZGVsZXRlICcgK1xuICAgICAgJ2xldCB5aWVsZCBjb25zdCBleHBvcnQgc3VwZXIgZGVidWdnZXIgYXMgYXN5bmMgYXdhaXQgc3RhdGljICcgK1xuICAgICAgLy8gRUNNQVNjcmlwdCA2IG1vZHVsZXMgaW1wb3J0XG4gICAgICAnaW1wb3J0IGZyb20gYXMnXG4gICAgLFxuICAgIGxpdGVyYWw6XG4gICAgICAndHJ1ZSBmYWxzZSBudWxsIHVuZGVmaW5lZCBOYU4gSW5maW5pdHknLFxuICAgIGJ1aWx0X2luOlxuICAgICAgJ2V2YWwgaXNGaW5pdGUgaXNOYU4gcGFyc2VGbG9hdCBwYXJzZUludCBkZWNvZGVVUkkgZGVjb2RlVVJJQ29tcG9uZW50ICcgK1xuICAgICAgJ2VuY29kZVVSSSBlbmNvZGVVUklDb21wb25lbnQgZXNjYXBlIHVuZXNjYXBlIE9iamVjdCBGdW5jdGlvbiBCb29sZWFuIEVycm9yICcgK1xuICAgICAgJ0V2YWxFcnJvciBJbnRlcm5hbEVycm9yIFJhbmdlRXJyb3IgUmVmZXJlbmNlRXJyb3IgU3RvcEl0ZXJhdGlvbiBTeW50YXhFcnJvciAnICtcbiAgICAgICdUeXBlRXJyb3IgVVJJRXJyb3IgTnVtYmVyIE1hdGggRGF0ZSBTdHJpbmcgUmVnRXhwIEFycmF5IEZsb2F0MzJBcnJheSAnICtcbiAgICAgICdGbG9hdDY0QXJyYXkgSW50MTZBcnJheSBJbnQzMkFycmF5IEludDhBcnJheSBVaW50MTZBcnJheSBVaW50MzJBcnJheSAnICtcbiAgICAgICdVaW50OEFycmF5IFVpbnQ4Q2xhbXBlZEFycmF5IEFycmF5QnVmZmVyIERhdGFWaWV3IEpTT04gSW50bCBhcmd1bWVudHMgcmVxdWlyZSAnICtcbiAgICAgICdtb2R1bGUgY29uc29sZSB3aW5kb3cgZG9jdW1lbnQgU3ltYm9sIFNldCBNYXAgV2Vha1NldCBXZWFrTWFwIFByb3h5IFJlZmxlY3QgJyArXG4gICAgICAnUHJvbWlzZSdcbiAgfTtcbiAgdmFyIE5VTUJFUiA9IHtcbiAgICBjbGFzc05hbWU6ICdudW1iZXInLFxuICAgIHZhcmlhbnRzOiBbXG4gICAgICB7IGJlZ2luOiAnXFxcXGIoMFtiQl1bMDFdKyluPycgfSxcbiAgICAgIHsgYmVnaW46ICdcXFxcYigwW29PXVswLTddKyluPycgfSxcbiAgICAgIHsgYmVnaW46IGhsanMuQ19OVU1CRVJfUkUgKyAnbj8nIH1cbiAgICBdLFxuICAgIHJlbGV2YW5jZTogMFxuICB9O1xuICB2YXIgU1VCU1QgPSB7XG4gICAgY2xhc3NOYW1lOiAnc3Vic3QnLFxuICAgIGJlZ2luOiAnXFxcXCRcXFxceycsIGVuZDogJ1xcXFx9JyxcbiAgICBrZXl3b3JkczogS0VZV09SRFMsXG4gICAgY29udGFpbnM6IFtdICAvLyBkZWZpbmVkIGxhdGVyXG4gIH07XG4gIHZhciBIVE1MX1RFTVBMQVRFID0ge1xuICAgIGJlZ2luOiAnaHRtbGAnLCBlbmQ6ICcnLFxuICAgIHN0YXJ0czoge1xuICAgICAgZW5kOiAnYCcsIHJldHVybkVuZDogZmFsc2UsXG4gICAgICBjb250YWluczogW1xuICAgICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICAgIFNVQlNUXG4gICAgICBdLFxuICAgICAgc3ViTGFuZ3VhZ2U6ICd4bWwnLFxuICAgIH1cbiAgfTtcbiAgdmFyIENTU19URU1QTEFURSA9IHtcbiAgICBiZWdpbjogJ2Nzc2AnLCBlbmQ6ICcnLFxuICAgIHN0YXJ0czoge1xuICAgICAgZW5kOiAnYCcsIHJldHVybkVuZDogZmFsc2UsXG4gICAgICBjb250YWluczogW1xuICAgICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICAgIFNVQlNUXG4gICAgICBdLFxuICAgICAgc3ViTGFuZ3VhZ2U6ICdjc3MnLFxuICAgIH1cbiAgfTtcbiAgdmFyIFRFTVBMQVRFX1NUUklORyA9IHtcbiAgICBjbGFzc05hbWU6ICdzdHJpbmcnLFxuICAgIGJlZ2luOiAnYCcsIGVuZDogJ2AnLFxuICAgIGNvbnRhaW5zOiBbXG4gICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICBTVUJTVFxuICAgIF1cbiAgfTtcbiAgU1VCU1QuY29udGFpbnMgPSBbXG4gICAgaGxqcy5BUE9TX1NUUklOR19NT0RFLFxuICAgIGhsanMuUVVPVEVfU1RSSU5HX01PREUsXG4gICAgSFRNTF9URU1QTEFURSxcbiAgICBDU1NfVEVNUExBVEUsXG4gICAgVEVNUExBVEVfU1RSSU5HLFxuICAgIE5VTUJFUixcbiAgICBobGpzLlJFR0VYUF9NT0RFXG4gIF07XG4gIHZhciBQQVJBTVNfQ09OVEFJTlMgPSBTVUJTVC5jb250YWlucy5jb25jYXQoW1xuICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgaGxqcy5DX0xJTkVfQ09NTUVOVF9NT0RFXG4gIF0pO1xuICB2YXIgUEFSQU1TID0ge1xuICAgIGNsYXNzTmFtZTogJ3BhcmFtcycsXG4gICAgYmVnaW46IC9cXCgvLCBlbmQ6IC9cXCkvLFxuICAgIGV4Y2x1ZGVCZWdpbjogdHJ1ZSxcbiAgICBleGNsdWRlRW5kOiB0cnVlLFxuICAgIGNvbnRhaW5zOiBQQVJBTVNfQ09OVEFJTlNcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdKYXZhU2NyaXB0JyxcbiAgICBhbGlhc2VzOiBbJ2pzJywgJ2pzeCcsICdtanMnLCAnY2pzJ10sXG4gICAga2V5d29yZHM6IEtFWVdPUkRTLFxuICAgIGNvbnRhaW5zOiBbXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ21ldGEnLFxuICAgICAgICByZWxldmFuY2U6IDEwLFxuICAgICAgICBiZWdpbjogL15cXHMqWydcIl11c2UgKHN0cmljdHxhc20pWydcIl0vXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdtZXRhJyxcbiAgICAgICAgYmVnaW46IC9eIyEvLCBlbmQ6IC8kL1xuICAgICAgfSxcbiAgICAgIGhsanMuQVBPU19TVFJJTkdfTU9ERSxcbiAgICAgIGhsanMuUVVPVEVfU1RSSU5HX01PREUsXG4gICAgICBIVE1MX1RFTVBMQVRFLFxuICAgICAgQ1NTX1RFTVBMQVRFLFxuICAgICAgVEVNUExBVEVfU1RSSU5HLFxuICAgICAgaGxqcy5DX0xJTkVfQ09NTUVOVF9NT0RFLFxuICAgICAgaGxqcy5DT01NRU5UKFxuICAgICAgICAnL1xcXFwqXFxcXConLFxuICAgICAgICAnXFxcXCovJyxcbiAgICAgICAge1xuICAgICAgICAgIHJlbGV2YW5jZSA6IDAsXG4gICAgICAgICAgY29udGFpbnMgOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNsYXNzTmFtZSA6ICdkb2N0YWcnLFxuICAgICAgICAgICAgICBiZWdpbiA6ICdAW0EtWmEtel0rJyxcbiAgICAgICAgICAgICAgY29udGFpbnMgOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAndHlwZScsXG4gICAgICAgICAgICAgICAgICBiZWdpbjogJ1xcXFx7JyxcbiAgICAgICAgICAgICAgICAgIGVuZDogJ1xcXFx9JyxcbiAgICAgICAgICAgICAgICAgIHJlbGV2YW5jZTogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAndmFyaWFibGUnLFxuICAgICAgICAgICAgICAgICAgYmVnaW46IElERU5UX1JFICsgJyg/PVxcXFxzKigtKXwkKScsXG4gICAgICAgICAgICAgICAgICBlbmRzUGFyZW50OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgcmVsZXZhbmNlOiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBlYXQgc3BhY2VzIChub3QgbmV3bGluZXMpIHNvIHdlIGNhbiBmaW5kXG4gICAgICAgICAgICAgICAgLy8gdHlwZXMgb3IgdmFyaWFibGVzXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYmVnaW46IC8oPz1bXlxcbl0pXFxzLyxcbiAgICAgICAgICAgICAgICAgIHJlbGV2YW5jZTogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBobGpzLkNfQkxPQ0tfQ09NTUVOVF9NT0RFLFxuICAgICAgTlVNQkVSLFxuICAgICAgeyAvLyBvYmplY3QgYXR0ciBjb250YWluZXJcbiAgICAgICAgYmVnaW46IC9beyxcXG5dXFxzKi8sIHJlbGV2YW5jZTogMCxcbiAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBiZWdpbjogSURFTlRfUkUgKyAnXFxcXHMqOicsIHJldHVybkJlZ2luOiB0cnVlLFxuICAgICAgICAgICAgcmVsZXZhbmNlOiAwLFxuICAgICAgICAgICAgY29udGFpbnM6IFt7Y2xhc3NOYW1lOiAnYXR0cicsIGJlZ2luOiBJREVOVF9SRSwgcmVsZXZhbmNlOiAwfV1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB7IC8vIFwidmFsdWVcIiBjb250YWluZXJcbiAgICAgICAgYmVnaW46ICcoJyArIGhsanMuUkVfU1RBUlRFUlNfUkUgKyAnfFxcXFxiKGNhc2V8cmV0dXJufHRocm93KVxcXFxiKVxcXFxzKicsXG4gICAgICAgIGtleXdvcmRzOiAncmV0dXJuIHRocm93IGNhc2UnLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIGhsanMuQ19MSU5FX0NPTU1FTlRfTU9ERSxcbiAgICAgICAgICBobGpzLkNfQkxPQ0tfQ09NTUVOVF9NT0RFLFxuICAgICAgICAgIGhsanMuUkVHRVhQX01PREUsXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgYmVnaW46ICcoXFxcXCguKj9cXFxcKXwnICsgSURFTlRfUkUgKyAnKVxcXFxzKj0+JywgcmV0dXJuQmVnaW46IHRydWUsXG4gICAgICAgICAgICBlbmQ6ICdcXFxccyo9PicsXG4gICAgICAgICAgICBjb250YWluczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAncGFyYW1zJyxcbiAgICAgICAgICAgICAgICB2YXJpYW50czogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBiZWdpbjogSURFTlRfUkVcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luOiAvXFwoXFxzKlxcKS8sXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBiZWdpbjogL1xcKC8sIGVuZDogL1xcKS8sXG4gICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVCZWdpbjogdHJ1ZSwgZXhjbHVkZUVuZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAga2V5d29yZHM6IEtFWVdPUkRTLFxuICAgICAgICAgICAgICAgICAgICBjb250YWluczogUEFSQU1TX0NPTlRBSU5TXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7IC8vIGNvdWxkIGJlIGEgY29tbWEgZGVsaW1pdGVkIGxpc3Qgb2YgcGFyYW1zIHRvIGEgZnVuY3Rpb24gY2FsbFxuICAgICAgICAgICAgYmVnaW46IC8sLywgcmVsZXZhbmNlOiAwLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAnJyxcbiAgICAgICAgICAgIGJlZ2luOiAvXFxzLyxcbiAgICAgICAgICAgIGVuZDogL1xccyovLFxuICAgICAgICAgICAgc2tpcDogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHsgLy8gSlNYXG4gICAgICAgICAgICB2YXJpYW50czogW1xuICAgICAgICAgICAgICB7IGJlZ2luOiBGUkFHTUVOVC5iZWdpbiwgZW5kOiBGUkFHTUVOVC5lbmQgfSxcbiAgICAgICAgICAgICAgeyBiZWdpbjogWE1MX1RBRy5iZWdpbiwgZW5kOiBYTUxfVEFHLmVuZCB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgc3ViTGFuZ3VhZ2U6ICd4bWwnLFxuICAgICAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGJlZ2luOiBYTUxfVEFHLmJlZ2luLCBlbmQ6IFhNTF9UQUcuZW5kLCBza2lwOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5zOiBbJ3NlbGYnXVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgcmVsZXZhbmNlOiAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdmdW5jdGlvbicsXG4gICAgICAgIGJlZ2luS2V5d29yZHM6ICdmdW5jdGlvbicsIGVuZDogL1xcey8sIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgaGxqcy5pbmhlcml0KGhsanMuVElUTEVfTU9ERSwge2JlZ2luOiBJREVOVF9SRX0pLFxuICAgICAgICAgIFBBUkFNU1xuICAgICAgICBdLFxuICAgICAgICBpbGxlZ2FsOiAvXFxbfCUvXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBiZWdpbjogL1xcJFsoLl0vIC8vIHJlbGV2YW5jZSBib29zdGVyIGZvciBhIHBhdHRlcm4gY29tbW9uIHRvIEpTIGxpYnM6IGAkKHNvbWV0aGluZylgIGFuZCBgJC5zb21ldGhpbmdgXG4gICAgICB9LFxuXG4gICAgICBobGpzLk1FVEhPRF9HVUFSRCxcbiAgICAgIHsgLy8gRVM2IGNsYXNzXG4gICAgICAgIGNsYXNzTmFtZTogJ2NsYXNzJyxcbiAgICAgICAgYmVnaW5LZXl3b3JkczogJ2NsYXNzJywgZW5kOiAvW3s7PV0vLCBleGNsdWRlRW5kOiB0cnVlLFxuICAgICAgICBpbGxlZ2FsOiAvWzpcIlxcW1xcXV0vLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIHtiZWdpbktleXdvcmRzOiAnZXh0ZW5kcyd9LFxuICAgICAgICAgIGhsanMuVU5ERVJTQ09SRV9USVRMRV9NT0RFXG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luS2V5d29yZHM6ICdjb25zdHJ1Y3RvcicsIGVuZDogL1xcey8sIGV4Y2x1ZGVFbmQ6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luOicoZ2V0fHNldClcXFxccyooPz0nICsgSURFTlRfUkUrICdcXFxcKCknLFxuICAgICAgICBlbmQ6IC97LyxcbiAgICAgICAga2V5d29yZHM6IFwiZ2V0IHNldFwiLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIGhsanMuaW5oZXJpdChobGpzLlRJVExFX01PREUsIHtiZWdpbjogSURFTlRfUkV9KSxcbiAgICAgICAgICB7IGJlZ2luOiAvXFwoXFwpLyB9LCAvLyBlYXQgdG8gYXZvaWQgZW1wdHkgcGFyYW1zXG4gICAgICAgICAgUEFSQU1TXG4gICAgICAgIF1cblxuICAgICAgfVxuICAgIF0sXG4gICAgaWxsZWdhbDogLyMoPyEhKS9cbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBqYXZhc2NyaXB0O1xuIiwiLypcbkxhbmd1YWdlOiBCYXNoXG5BdXRob3I6IHZhaCA8dmFodGVuYmVyZ0BnbWFpbC5jb20+XG5Db250cmlidXRyb3JzOiBCZW5qYW1pbiBQYW5uZWxsIDxjb250YWN0QHNpZXJyYXNvZnR3b3Jrcy5jb20+XG5XZWJzaXRlOiBodHRwczovL3d3dy5nbnUub3JnL3NvZnR3YXJlL2Jhc2gvXG5DYXRlZ29yeTogY29tbW9uXG4qL1xuXG5mdW5jdGlvbiBiYXNoKGhsanMpIHtcbiAgY29uc3QgVkFSID0ge307XG4gIGNvbnN0IEJSQUNFRF9WQVIgPSB7XG4gICAgYmVnaW46IC9cXCRcXHsvLCBlbmQ6L1xcfS8sXG4gICAgY29udGFpbnM6IFtcbiAgICAgIHsgYmVnaW46IC86LS8sIGNvbnRhaW5zOiBbVkFSXSB9IC8vIGRlZmF1bHQgdmFsdWVzXG4gICAgXVxuICB9O1xuICBPYmplY3QuYXNzaWduKFZBUix7XG4gICAgY2xhc3NOYW1lOiAndmFyaWFibGUnLFxuICAgIHZhcmlhbnRzOiBbXG4gICAgICB7YmVnaW46IC9cXCRbXFx3XFxkI0BdW1xcd1xcZF9dKi99LFxuICAgICAgQlJBQ0VEX1ZBUlxuICAgIF1cbiAgfSk7XG5cbiAgY29uc3QgU1VCU1QgPSB7XG4gICAgY2xhc3NOYW1lOiAnc3Vic3QnLFxuICAgIGJlZ2luOiAvXFwkXFwoLywgZW5kOiAvXFwpLyxcbiAgICBjb250YWluczogW2hsanMuQkFDS1NMQVNIX0VTQ0FQRV1cbiAgfTtcbiAgY29uc3QgUVVPVEVfU1RSSU5HID0ge1xuICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgYmVnaW46IC9cIi8sIGVuZDogL1wiLyxcbiAgICBjb250YWluczogW1xuICAgICAgaGxqcy5CQUNLU0xBU0hfRVNDQVBFLFxuICAgICAgVkFSLFxuICAgICAgU1VCU1RcbiAgICBdXG4gIH07XG4gIFNVQlNULmNvbnRhaW5zLnB1c2goUVVPVEVfU1RSSU5HKTtcbiAgY29uc3QgRVNDQVBFRF9RVU9URSA9IHtcbiAgICBjbGFzc05hbWU6ICcnLFxuICAgIGJlZ2luOiAvXFxcXFwiL1xuXG4gIH07XG4gIGNvbnN0IEFQT1NfU1RSSU5HID0ge1xuICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgYmVnaW46IC8nLywgZW5kOiAvJy9cbiAgfTtcbiAgY29uc3QgQVJJVEhNRVRJQyA9IHtcbiAgICBiZWdpbjogL1xcJFxcKFxcKC8sXG4gICAgZW5kOiAvXFwpXFwpLyxcbiAgICBjb250YWluczogW1xuICAgICAgeyBiZWdpbjogL1xcZCsjWzAtOWEtZl0rLywgY2xhc3NOYW1lOiBcIm51bWJlclwiIH0sXG4gICAgICBobGpzLk5VTUJFUl9NT0RFLFxuICAgICAgVkFSXG4gICAgXVxuICB9O1xuICBjb25zdCBTSEVCQU5HID0ge1xuICAgIGNsYXNzTmFtZTogJ21ldGEnLFxuICAgIGJlZ2luOiAvXiMhW15cXG5dK3NoXFxzKiQvLFxuICAgIHJlbGV2YW5jZTogMTBcbiAgfTtcbiAgY29uc3QgRlVOQ1RJT04gPSB7XG4gICAgY2xhc3NOYW1lOiAnZnVuY3Rpb24nLFxuICAgIGJlZ2luOiAvXFx3W1xcd1xcZF9dKlxccypcXChcXHMqXFwpXFxzKlxcey8sXG4gICAgcmV0dXJuQmVnaW46IHRydWUsXG4gICAgY29udGFpbnM6IFtobGpzLmluaGVyaXQoaGxqcy5USVRMRV9NT0RFLCB7YmVnaW46IC9cXHdbXFx3XFxkX10qL30pXSxcbiAgICByZWxldmFuY2U6IDBcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdCYXNoJyxcbiAgICBhbGlhc2VzOiBbJ3NoJywgJ3pzaCddLFxuICAgIGxleGVtZXM6IC9cXGItP1thLXpcXC5fXStcXGIvLFxuICAgIGtleXdvcmRzOiB7XG4gICAgICBrZXl3b3JkOlxuICAgICAgICAnaWYgdGhlbiBlbHNlIGVsaWYgZmkgZm9yIHdoaWxlIGluIGRvIGRvbmUgY2FzZSBlc2FjIGZ1bmN0aW9uJyxcbiAgICAgIGxpdGVyYWw6XG4gICAgICAgICd0cnVlIGZhbHNlJyxcbiAgICAgIGJ1aWx0X2luOlxuICAgICAgICAvLyBTaGVsbCBidWlsdC1pbnNcbiAgICAgICAgLy8gaHR0cDovL3d3dy5nbnUub3JnL3NvZnR3YXJlL2Jhc2gvbWFudWFsL2h0bWxfbm9kZS9TaGVsbC1CdWlsdGluLUNvbW1hbmRzLmh0bWxcbiAgICAgICAgJ2JyZWFrIGNkIGNvbnRpbnVlIGV2YWwgZXhlYyBleGl0IGV4cG9ydCBnZXRvcHRzIGhhc2ggcHdkIHJlYWRvbmx5IHJldHVybiBzaGlmdCB0ZXN0IHRpbWVzICcgK1xuICAgICAgICAndHJhcCB1bWFzayB1bnNldCAnICtcbiAgICAgICAgLy8gQmFzaCBidWlsdC1pbnNcbiAgICAgICAgJ2FsaWFzIGJpbmQgYnVpbHRpbiBjYWxsZXIgY29tbWFuZCBkZWNsYXJlIGVjaG8gZW5hYmxlIGhlbHAgbGV0IGxvY2FsIGxvZ291dCBtYXBmaWxlIHByaW50ZiAnICtcbiAgICAgICAgJ3JlYWQgcmVhZGFycmF5IHNvdXJjZSB0eXBlIHR5cGVzZXQgdWxpbWl0IHVuYWxpYXMgJyArXG4gICAgICAgIC8vIFNoZWxsIG1vZGlmaWVyc1xuICAgICAgICAnc2V0IHNob3B0ICcgK1xuICAgICAgICAvLyBac2ggYnVpbHQtaW5zXG4gICAgICAgICdhdXRvbG9hZCBiZyBiaW5ka2V5IGJ5ZSBjYXAgY2hkaXIgY2xvbmUgY29tcGFyZ3VtZW50cyBjb21wY2FsbCBjb21wY3RsIGNvbXBkZXNjcmliZSBjb21wZmlsZXMgJyArXG4gICAgICAgICdjb21wZ3JvdXBzIGNvbXBxdW90ZSBjb21wdGFncyBjb21wdHJ5IGNvbXB2YWx1ZXMgZGlycyBkaXNhYmxlIGRpc293biBlY2hvdGMgZWNob3RpIGVtdWxhdGUgJyArXG4gICAgICAgICdmYyBmZyBmbG9hdCBmdW5jdGlvbnMgZ2V0Y2FwIGdldGxuIGhpc3RvcnkgaW50ZWdlciBqb2JzIGtpbGwgbGltaXQgbG9nIG5vZ2xvYiBwb3BkIHByaW50ICcgK1xuICAgICAgICAncHVzaGQgcHVzaGxuIHJlaGFzaCBzY2hlZCBzZXRjYXAgc2V0b3B0IHN0YXQgc3VzcGVuZCB0dHljdGwgdW5mdW5jdGlvbiB1bmhhc2ggdW5saW1pdCAnICtcbiAgICAgICAgJ3Vuc2V0b3B0IHZhcmVkIHdhaXQgd2hlbmNlIHdoZXJlIHdoaWNoIHpjb21waWxlIHpmb3JtYXQgemZ0cCB6bGUgem1vZGxvYWQgenBhcnNlb3B0cyB6cHJvZiAnICtcbiAgICAgICAgJ3pwdHkgenJlZ2V4cGFyc2UgenNvY2tldCB6c3R5bGUgenRjcCcsXG4gICAgICBfOlxuICAgICAgICAnLW5lIC1lcSAtbHQgLWd0IC1mIC1kIC1lIC1zIC1sIC1hJyAvLyByZWxldmFuY2UgYm9vc3RlclxuICAgIH0sXG4gICAgY29udGFpbnM6IFtcbiAgICAgIFNIRUJBTkcsXG4gICAgICBGVU5DVElPTixcbiAgICAgIEFSSVRITUVUSUMsXG4gICAgICBobGpzLkhBU0hfQ09NTUVOVF9NT0RFLFxuICAgICAgUVVPVEVfU1RSSU5HLFxuICAgICAgRVNDQVBFRF9RVU9URSxcbiAgICAgIEFQT1NfU1RSSU5HLFxuICAgICAgVkFSXG4gICAgXVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2g7XG4iLCIvKlxuIExhbmd1YWdlOiBTUUxcbiBDb250cmlidXRvcnM6IE5pa29sYXkgTGlzaWVua28gPGluZm9AbmVvci5ydT4sIEhlaWtvIEF1Z3VzdCA8cG9zdEBhdWdlODQ3Mi5kZT4sIFRyYXZpcyBPZG9tIDx0cmF2aXMuYS5vZG9tQGdtYWlsLmNvbT4sIFZhZGltdHJvIDx2YWRpbXRyb0B5YWhvby5jb20+LCBCZW5qYW1pbiBBdWRlciA8YmVuamFtaW4uYXVkZXJAZ21haWwuY29tPlxuIFdlYnNpdGU6IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1NRTFxuIENhdGVnb3J5OiBjb21tb25cbiAqL1xuXG5mdW5jdGlvbiBzcWwoaGxqcykge1xuICB2YXIgQ09NTUVOVF9NT0RFID0gaGxqcy5DT01NRU5UKCctLScsICckJyk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ1NRTCcsXG4gICAgY2FzZV9pbnNlbnNpdGl2ZTogdHJ1ZSxcbiAgICBpbGxlZ2FsOiAvWzw+e30qXS8sXG4gICAgY29udGFpbnM6IFtcbiAgICAgIHtcbiAgICAgICAgYmVnaW5LZXl3b3JkczpcbiAgICAgICAgICAnYmVnaW4gZW5kIHN0YXJ0IGNvbW1pdCByb2xsYmFjayBzYXZlcG9pbnQgbG9jayBhbHRlciBjcmVhdGUgZHJvcCByZW5hbWUgY2FsbCAnICtcbiAgICAgICAgICAnZGVsZXRlIGRvIGhhbmRsZXIgaW5zZXJ0IGxvYWQgcmVwbGFjZSBzZWxlY3QgdHJ1bmNhdGUgdXBkYXRlIHNldCBzaG93IHByYWdtYSBncmFudCAnICtcbiAgICAgICAgICAnbWVyZ2UgZGVzY3JpYmUgdXNlIGV4cGxhaW4gaGVscCBkZWNsYXJlIHByZXBhcmUgZXhlY3V0ZSBkZWFsbG9jYXRlIHJlbGVhc2UgJyArXG4gICAgICAgICAgJ3VubG9jayBwdXJnZSByZXNldCBjaGFuZ2Ugc3RvcCBhbmFseXplIGNhY2hlIGZsdXNoIG9wdGltaXplIHJlcGFpciBraWxsICcgK1xuICAgICAgICAgICdpbnN0YWxsIHVuaW5zdGFsbCBjaGVja3N1bSByZXN0b3JlIGNoZWNrIGJhY2t1cCByZXZva2UgY29tbWVudCB2YWx1ZXMgd2l0aCcsXG4gICAgICAgIGVuZDogLzsvLCBlbmRzV2l0aFBhcmVudDogdHJ1ZSxcbiAgICAgICAgbGV4ZW1lczogL1tcXHdcXC5dKy8sXG4gICAgICAgIGtleXdvcmRzOiB7XG4gICAgICAgICAga2V5d29yZDpcbiAgICAgICAgICAgICdhcyBhYm9ydCBhYnMgYWJzb2x1dGUgYWNjIGFjY2UgYWNjZXAgYWNjZXB0IGFjY2VzcyBhY2Nlc3NlZCBhY2Nlc3NpYmxlIGFjY291bnQgYWNvcyBhY3Rpb24gYWN0aXZhdGUgYWRkICcgK1xuICAgICAgICAgICAgJ2FkZHRpbWUgYWRtaW4gYWRtaW5pc3RlciBhZHZhbmNlZCBhZHZpc2UgYWVzX2RlY3J5cHQgYWVzX2VuY3J5cHQgYWZ0ZXIgYWdlbnQgYWdncmVnYXRlIGFsaSBhbGlhIGFsaWFzICcgK1xuICAgICAgICAgICAgJ2FsbCBhbGxvY2F0ZSBhbGxvdyBhbHRlciBhbHdheXMgYW5hbHl6ZSBhbmNpbGxhcnkgYW5kIGFudGkgYW55IGFueWRhdGEgYW55ZGF0YXNldCBhbnlzY2hlbWEgYW55dHlwZSBhcHBseSAnICtcbiAgICAgICAgICAgICdhcmNoaXZlIGFyY2hpdmVkIGFyY2hpdmVsb2cgYXJlIGFzIGFzYyBhc2NpaSBhc2luIGFzc2VtYmx5IGFzc2VydGlvbiBhc3NvY2lhdGUgYXN5bmNocm9ub3VzIGF0IGF0YW4gJyArXG4gICAgICAgICAgICAnYXRuMiBhdHRyIGF0dHJpIGF0dHJpYiBhdHRyaWJ1IGF0dHJpYnV0IGF0dHJpYnV0ZSBhdHRyaWJ1dGVzIGF1ZGl0IGF1dGhlbnRpY2F0ZWQgYXV0aGVudGljYXRpb24gYXV0aGlkICcgK1xuICAgICAgICAgICAgJ2F1dGhvcnMgYXV0byBhdXRvYWxsb2NhdGUgYXV0b2RibGluayBhdXRvZXh0ZW5kIGF1dG9tYXRpYyBhdmFpbGFiaWxpdHkgYXZnIGJhY2t1cCBiYWRmaWxlIGJhc2ljZmlsZSAnICtcbiAgICAgICAgICAgICdiZWZvcmUgYmVnaW4gYmVnaW5uaW5nIGJlbmNobWFyayBiZXR3ZWVuIGJmaWxlIGJmaWxlX2Jhc2UgYmlnIGJpZ2ZpbGUgYmluIGJpbmFyeV9kb3VibGUgYmluYXJ5X2Zsb2F0ICcgK1xuICAgICAgICAgICAgJ2JpbmxvZyBiaXRfYW5kIGJpdF9jb3VudCBiaXRfbGVuZ3RoIGJpdF9vciBiaXRfeG9yIGJpdG1hcCBibG9iX2Jhc2UgYmxvY2sgYmxvY2tzaXplIGJvZHkgYm90aCBib3VuZCAnICtcbiAgICAgICAgICAgICdidWNrZXQgYnVmZmVyX2NhY2hlIGJ1ZmZlcl9wb29sIGJ1aWxkIGJ1bGsgYnkgYnl0ZSBieXRlb3JkZXJtYXJrIGJ5dGVzIGNhY2hlIGNhY2hpbmcgY2FsbCBjYWxsaW5nIGNhbmNlbCAnICtcbiAgICAgICAgICAgICdjYXBhY2l0eSBjYXNjYWRlIGNhc2NhZGVkIGNhc2UgY2FzdCBjYXRhbG9nIGNhdGVnb3J5IGNlaWwgY2VpbGluZyBjaGFpbiBjaGFuZ2UgY2hhbmdlZCBjaGFyX2Jhc2UgJyArXG4gICAgICAgICAgICAnY2hhcl9sZW5ndGggY2hhcmFjdGVyX2xlbmd0aCBjaGFyYWN0ZXJzIGNoYXJhY3RlcnNldCBjaGFyaW5kZXggY2hhcnNldCBjaGFyc2V0Zm9ybSBjaGFyc2V0aWQgY2hlY2sgJyArXG4gICAgICAgICAgICAnY2hlY2tzdW0gY2hlY2tzdW1fYWdnIGNoaWxkIGNob29zZSBjaHIgY2h1bmsgY2xhc3MgY2xlYW51cCBjbGVhciBjbGllbnQgY2xvYiBjbG9iX2Jhc2UgY2xvbmUgY2xvc2UgJyArXG4gICAgICAgICAgICAnY2x1c3Rlcl9pZCBjbHVzdGVyX3Byb2JhYmlsaXR5IGNsdXN0ZXJfc2V0IGNsdXN0ZXJpbmcgY29hbGVzY2UgY29lcmNpYmlsaXR5IGNvbCBjb2xsYXRlIGNvbGxhdGlvbiAnICtcbiAgICAgICAgICAgICdjb2xsZWN0IGNvbHUgY29sdW0gY29sdW1uIGNvbHVtbl92YWx1ZSBjb2x1bW5zIGNvbHVtbnNfdXBkYXRlZCBjb21tZW50IGNvbW1pdCBjb21wYWN0IGNvbXBhdGliaWxpdHkgJyArXG4gICAgICAgICAgICAnY29tcGlsZWQgY29tcGxldGUgY29tcG9zaXRlX2xpbWl0IGNvbXBvdW5kIGNvbXByZXNzIGNvbXB1dGUgY29uY2F0IGNvbmNhdF93cyBjb25jdXJyZW50IGNvbmZpcm0gY29ubiAnICtcbiAgICAgICAgICAgICdjb25uZWMgY29ubmVjdCBjb25uZWN0X2J5X2lzY3ljbGUgY29ubmVjdF9ieV9pc2xlYWYgY29ubmVjdF9ieV9yb290IGNvbm5lY3RfdGltZSBjb25uZWN0aW9uICcgK1xuICAgICAgICAgICAgJ2NvbnNpZGVyIGNvbnNpc3RlbnQgY29uc3RhbnQgY29uc3RyYWludCBjb25zdHJhaW50cyBjb25zdHJ1Y3RvciBjb250YWluZXIgY29udGVudCBjb250ZW50cyBjb250ZXh0ICcgK1xuICAgICAgICAgICAgJ2NvbnRyaWJ1dG9ycyBjb250cm9sZmlsZSBjb252IGNvbnZlcnQgY29udmVydF90eiBjb3JyIGNvcnJfayBjb3JyX3MgY29ycmVzcG9uZGluZyBjb3JydXB0aW9uIGNvcyBjb3N0ICcgK1xuICAgICAgICAgICAgJ2NvdW50IGNvdW50X2JpZyBjb3VudGVkIGNvdmFyX3BvcCBjb3Zhcl9zYW1wIGNwdV9wZXJfY2FsbCBjcHVfcGVyX3Nlc3Npb24gY3JjMzIgY3JlYXRlIGNyZWF0aW9uICcgK1xuICAgICAgICAgICAgJ2NyaXRpY2FsIGNyb3NzIGN1YmUgY3VtZV9kaXN0IGN1cmRhdGUgY3VycmVudCBjdXJyZW50X2RhdGUgY3VycmVudF90aW1lIGN1cnJlbnRfdGltZXN0YW1wIGN1cnJlbnRfdXNlciAnICtcbiAgICAgICAgICAgICdjdXJzb3IgY3VydGltZSBjdXN0b21kYXR1bSBjeWNsZSBkYXRhIGRhdGFiYXNlIGRhdGFiYXNlcyBkYXRhZmlsZSBkYXRhZmlsZXMgZGF0YWxlbmd0aCBkYXRlX2FkZCAnICtcbiAgICAgICAgICAgICdkYXRlX2NhY2hlIGRhdGVfZm9ybWF0IGRhdGVfc3ViIGRhdGVhZGQgZGF0ZWRpZmYgZGF0ZWZyb21wYXJ0cyBkYXRlbmFtZSBkYXRlcGFydCBkYXRldGltZTJmcm9tcGFydHMgJyArXG4gICAgICAgICAgICAnZGF5IGRheV90b19zZWNvbmQgZGF5bmFtZSBkYXlvZm1vbnRoIGRheW9md2VlayBkYXlvZnllYXIgZGF5cyBkYl9yb2xlX2NoYW5nZSBkYnRpbWV6b25lIGRkbCBkZWFsbG9jYXRlICcgK1xuICAgICAgICAgICAgJ2RlY2xhcmUgZGVjb2RlIGRlY29tcG9zZSBkZWNyZW1lbnQgZGVjcnlwdCBkZWR1cGxpY2F0ZSBkZWYgZGVmYSBkZWZhdSBkZWZhdWwgZGVmYXVsdCBkZWZhdWx0cyAnICtcbiAgICAgICAgICAgICdkZWZlcnJlZCBkZWZpIGRlZmluIGRlZmluZSBkZWdyZWVzIGRlbGF5ZWQgZGVsZWdhdGUgZGVsZXRlIGRlbGV0ZV9hbGwgZGVsaW1pdGVkIGRlbWFuZCBkZW5zZV9yYW5rICcgK1xuICAgICAgICAgICAgJ2RlcHRoIGRlcXVldWUgZGVzX2RlY3J5cHQgZGVzX2VuY3J5cHQgZGVzX2tleV9maWxlIGRlc2MgZGVzY3IgZGVzY3JpIGRlc2NyaWIgZGVzY3JpYmUgZGVzY3JpcHRvciAnICtcbiAgICAgICAgICAgICdkZXRlcm1pbmlzdGljIGRpYWdub3N0aWNzIGRpZmZlcmVuY2UgZGltZW5zaW9uIGRpcmVjdF9sb2FkIGRpcmVjdG9yeSBkaXNhYmxlIGRpc2FibGVfYWxsICcgK1xuICAgICAgICAgICAgJ2Rpc2FsbG93IGRpc2Fzc29jaWF0ZSBkaXNjYXJkZmlsZSBkaXNjb25uZWN0IGRpc2tncm91cCBkaXN0aW5jdCBkaXN0aW5jdHJvdyBkaXN0cmlidXRlIGRpc3RyaWJ1dGVkIGRpdiAnICtcbiAgICAgICAgICAgICdkbyBkb2N1bWVudCBkb21haW4gZG90bmV0IGRvdWJsZSBkb3duZ3JhZGUgZHJvcCBkdW1wZmlsZSBkdXBsaWNhdGUgZHVyYXRpb24gZWFjaCBlZGl0aW9uIGVkaXRpb25hYmxlICcgK1xuICAgICAgICAgICAgJ2VkaXRpb25zIGVsZW1lbnQgZWxsaXBzaXMgZWxzZSBlbHNpZiBlbHQgZW1wdHkgZW5hYmxlIGVuYWJsZV9hbGwgZW5jbG9zZWQgZW5jb2RlIGVuY29kaW5nIGVuY3J5cHQgJyArXG4gICAgICAgICAgICAnZW5kIGVuZC1leGVjIGVuZGlhbiBlbmZvcmNlZCBlbmdpbmUgZW5naW5lcyBlbnF1ZXVlIGVudGVycHJpc2UgZW50aXR5ZXNjYXBpbmcgZW9tb250aCBlcnJvciBlcnJvcnMgJyArXG4gICAgICAgICAgICAnZXNjYXBlZCBldmFsbmFtZSBldmFsdWF0ZSBldmVudCBldmVudGRhdGEgZXZlbnRzIGV4Y2VwdCBleGNlcHRpb24gZXhjZXB0aW9ucyBleGNoYW5nZSBleGNsdWRlIGV4Y2x1ZGluZyAnICtcbiAgICAgICAgICAgICdleGVjdSBleGVjdXQgZXhlY3V0ZSBleGVtcHQgZXhpc3RzIGV4aXQgZXhwIGV4cGlyZSBleHBsYWluIGV4cGxvZGUgZXhwb3J0IGV4cG9ydF9zZXQgZXh0ZW5kZWQgZXh0ZW50IGV4dGVybmFsICcgK1xuICAgICAgICAgICAgJ2V4dGVybmFsXzEgZXh0ZXJuYWxfMiBleHRlcm5hbGx5IGV4dHJhY3QgZmFpbGVkIGZhaWxlZF9sb2dpbl9hdHRlbXB0cyBmYWlsb3ZlciBmYWlsdXJlIGZhciBmYXN0ICcgK1xuICAgICAgICAgICAgJ2ZlYXR1cmVfc2V0IGZlYXR1cmVfdmFsdWUgZmV0Y2ggZmllbGQgZmllbGRzIGZpbGUgZmlsZV9uYW1lX2NvbnZlcnQgZmlsZXN5c3RlbV9saWtlX2xvZ2dpbmcgZmluYWwgJyArXG4gICAgICAgICAgICAnZmluaXNoIGZpcnN0IGZpcnN0X3ZhbHVlIGZpeGVkIGZsYXNoX2NhY2hlIGZsYXNoYmFjayBmbG9vciBmbHVzaCBmb2xsb3dpbmcgZm9sbG93cyBmb3IgZm9yYWxsIGZvcmNlIGZvcmVpZ24gJyArXG4gICAgICAgICAgICAnZm9ybSBmb3JtYSBmb3JtYXQgZm91bmQgZm91bmRfcm93cyBmcmVlbGlzdCBmcmVlbGlzdHMgZnJlZXBvb2xzIGZyZXNoIGZyb20gZnJvbV9iYXNlNjQgZnJvbV9kYXlzICcgK1xuICAgICAgICAgICAgJ2Z0cCBmdWxsIGZ1bmN0aW9uIGdlbmVyYWwgZ2VuZXJhdGVkIGdldCBnZXRfZm9ybWF0IGdldF9sb2NrIGdldGRhdGUgZ2V0dXRjZGF0ZSBnbG9iYWwgZ2xvYmFsX25hbWUgJyArXG4gICAgICAgICAgICAnZ2xvYmFsbHkgZ28gZ290byBncmFudCBncmFudHMgZ3JlYXRlc3QgZ3JvdXAgZ3JvdXBfY29uY2F0IGdyb3VwX2lkIGdyb3VwaW5nIGdyb3VwaW5nX2lkIGdyb3VwcyAnICtcbiAgICAgICAgICAgICdndGlkX3N1YnRyYWN0IGd1YXJhbnRlZSBndWFyZCBoYW5kbGVyIGhhc2ggaGFzaGtleXMgaGF2aW5nIGhlYSBoZWFkIGhlYWRpIGhlYWRpbiBoZWFkaW5nIGhlYXAgaGVscCBoZXggJyArXG4gICAgICAgICAgICAnaGllcmFyY2h5IGhpZ2ggaGlnaF9wcmlvcml0eSBob3N0cyBob3VyIGhvdXJzIGh0dHAgaWQgaWRlbnRfY3VycmVudCBpZGVudF9pbmNyIGlkZW50X3NlZWQgaWRlbnRpZmllZCAnICtcbiAgICAgICAgICAgICdpZGVudGl0eSBpZGxlX3RpbWUgaWYgaWZudWxsIGlnbm9yZSBpaWYgaWxpa2UgaWxtIGltbWVkaWF0ZSBpbXBvcnQgaW4gaW5jbHVkZSBpbmNsdWRpbmcgaW5jcmVtZW50ICcgK1xuICAgICAgICAgICAgJ2luZGV4IGluZGV4ZXMgaW5kZXhpbmcgaW5kZXh0eXBlIGluZGljYXRvciBpbmRpY2VzIGluZXQ2X2F0b24gaW5ldDZfbnRvYSBpbmV0X2F0b24gaW5ldF9udG9hIGluZmlsZSAnICtcbiAgICAgICAgICAgICdpbml0aWFsIGluaXRpYWxpemVkIGluaXRpYWxseSBpbml0cmFucyBpbm1lbW9yeSBpbm5lciBpbm5vZGIgaW5wdXQgaW5zZXJ0IGluc3RhbGwgaW5zdGFuY2UgaW5zdGFudGlhYmxlICcgK1xuICAgICAgICAgICAgJ2luc3RyIGludGVyZmFjZSBpbnRlcmxlYXZlZCBpbnRlcnNlY3QgaW50byBpbnZhbGlkYXRlIGludmlzaWJsZSBpcyBpc19mcmVlX2xvY2sgaXNfaXB2NCBpc19pcHY0X2NvbXBhdCAnICtcbiAgICAgICAgICAgICdpc19ub3QgaXNfbm90X251bGwgaXNfdXNlZF9sb2NrIGlzZGF0ZSBpc251bGwgaXNvbGF0aW9uIGl0ZXJhdGUgamF2YSBqb2luIGpzb24ganNvbl9leGlzdHMgJyArXG4gICAgICAgICAgICAna2VlcCBrZWVwX2R1cGxpY2F0ZXMga2V5IGtleXMga2lsbCBsYW5ndWFnZSBsYXJnZSBsYXN0IGxhc3RfZGF5IGxhc3RfaW5zZXJ0X2lkIGxhc3RfdmFsdWUgbGF0ZXJhbCBsYXggbGNhc2UgJyArXG4gICAgICAgICAgICAnbGVhZCBsZWFkaW5nIGxlYXN0IGxlYXZlcyBsZWZ0IGxlbiBsZW5naHQgbGVuZ3RoIGxlc3MgbGV2ZWwgbGV2ZWxzIGxpYnJhcnkgbGlrZSBsaWtlMiBsaWtlNCBsaWtlYyBsaW1pdCAnICtcbiAgICAgICAgICAgICdsaW5lcyBsaW5rIGxpc3QgbGlzdGFnZyBsaXR0bGUgbG4gbG9hZCBsb2FkX2ZpbGUgbG9iIGxvYnMgbG9jYWwgbG9jYWx0aW1lIGxvY2FsdGltZXN0YW1wIGxvY2F0ZSAnICtcbiAgICAgICAgICAgICdsb2NhdG9yIGxvY2sgbG9ja2VkIGxvZyBsb2cxMCBsb2cyIGxvZ2ZpbGUgbG9nZmlsZXMgbG9nZ2luZyBsb2dpY2FsIGxvZ2ljYWxfcmVhZHNfcGVyX2NhbGwgJyArXG4gICAgICAgICAgICAnbG9nb2ZmIGxvZ29uIGxvZ3MgbG9uZyBsb29wIGxvdyBsb3dfcHJpb3JpdHkgbG93ZXIgbHBhZCBscnRyaW0gbHRyaW0gbWFpbiBtYWtlX3NldCBtYWtlZGF0ZSBtYWtldGltZSAnICtcbiAgICAgICAgICAgICdtYW5hZ2VkIG1hbmFnZW1lbnQgbWFudWFsIG1hcCBtYXBwaW5nIG1hc2sgbWFzdGVyIG1hc3Rlcl9wb3Nfd2FpdCBtYXRjaCBtYXRjaGVkIG1hdGVyaWFsaXplZCBtYXggJyArXG4gICAgICAgICAgICAnbWF4ZXh0ZW50cyBtYXhpbWl6ZSBtYXhpbnN0YW5jZXMgbWF4bGVuIG1heGxvZ2ZpbGVzIG1heGxvZ2hpc3RvcnkgbWF4bG9nbWVtYmVycyBtYXhzaXplIG1heHRyYW5zICcgK1xuICAgICAgICAgICAgJ21kNSBtZWFzdXJlcyBtZWRpYW4gbWVkaXVtIG1lbWJlciBtZW1jb21wcmVzcyBtZW1vcnkgbWVyZ2UgbWljcm9zZWNvbmQgbWlkIG1pZ3JhdGlvbiBtaW4gbWluZXh0ZW50cyAnICtcbiAgICAgICAgICAgICdtaW5pbXVtIG1pbmluZyBtaW51cyBtaW51dGUgbWludXRlcyBtaW52YWx1ZSBtaXNzaW5nIG1vZCBtb2RlIG1vZGVsIG1vZGlmaWNhdGlvbiBtb2RpZnkgbW9kdWxlIG1vbml0b3JpbmcgbW9udGggJyArXG4gICAgICAgICAgICAnbW9udGhzIG1vdW50IG1vdmUgbW92ZW1lbnQgbXVsdGlzZXQgbXV0ZXggbmFtZSBuYW1lX2NvbnN0IG5hbWVzIG5hbiBuYXRpb25hbCBuYXRpdmUgbmF0dXJhbCBuYXYgbmNoYXIgJyArXG4gICAgICAgICAgICAnbmNsb2IgbmVzdGVkIG5ldmVyIG5ldyBuZXdsaW5lIG5leHQgbmV4dHZhbCBubyBub193cml0ZV90b19iaW5sb2cgbm9hcmNoaXZlbG9nIG5vYXVkaXQgbm9iYWRmaWxlICcgK1xuICAgICAgICAgICAgJ25vY2hlY2sgbm9jb21wcmVzcyBub2NvcHkgbm9jeWNsZSBub2RlbGF5IG5vZGlzY2FyZGZpbGUgbm9lbnRpdHllc2NhcGluZyBub2d1YXJhbnRlZSBub2tlZXAgbm9sb2dmaWxlICcgK1xuICAgICAgICAgICAgJ25vbWFwcGluZyBub21heHZhbHVlIG5vbWluaW1pemUgbm9taW52YWx1ZSBub21vbml0b3Jpbmcgbm9uZSBub25lZGl0aW9uYWJsZSBub25zY2hlbWEgbm9vcmRlciAnICtcbiAgICAgICAgICAgICdub3ByIG5vcHJvIG5vcHJvbSBub3Byb21wIG5vcHJvbXB0IG5vcmVseSBub3Jlc2V0bG9ncyBub3JldmVyc2Ugbm9ybWFsIG5vcm93ZGVwZW5kZW5jaWVzIG5vc2NoZW1hY2hlY2sgJyArXG4gICAgICAgICAgICAnbm9zd2l0Y2ggbm90IG5vdGhpbmcgbm90aWNlIG5vdG51bGwgbm90cmltIG5vdmFsaWRhdGUgbm93IG5vd2FpdCBudGhfdmFsdWUgbnVsbGlmIG51bGxzIG51bSBudW1iIG51bWJlICcgK1xuICAgICAgICAgICAgJ252YXJjaGFyIG52YXJjaGFyMiBvYmplY3Qgb2NpY29sbCBvY2lkYXRlIG9jaWRhdGV0aW1lIG9jaWR1cmF0aW9uIG9jaWludGVydmFsIG9jaWxvYmxvY2F0b3Igb2NpbnVtYmVyICcgK1xuICAgICAgICAgICAgJ29jaXJlZiBvY2lyZWZjdXJzb3Igb2Npcm93aWQgb2Npc3RyaW5nIG9jaXR5cGUgb2N0IG9jdGV0X2xlbmd0aCBvZiBvZmYgb2ZmbGluZSBvZmZzZXQgb2lkIG9pZGluZGV4IG9sZCAnICtcbiAgICAgICAgICAgICdvbiBvbmxpbmUgb25seSBvcGFxdWUgb3BlbiBvcGVyYXRpb25zIG9wZXJhdG9yIG9wdGltYWwgb3B0aW1pemUgb3B0aW9uIG9wdGlvbmFsbHkgb3Igb3JhY2xlIG9yYWNsZV9kYXRlICcgK1xuICAgICAgICAgICAgJ29yYWRhdGEgb3JkIG9yZGF1ZGlvIG9yZGRpY29tIG9yZGRvYyBvcmRlciBvcmRpbWFnZSBvcmRpbmFsaXR5IG9yZHZpZGVvIG9yZ2FuaXphdGlvbiBvcmxhbnkgb3JsdmFyeSAnICtcbiAgICAgICAgICAgICdvdXQgb3V0ZXIgb3V0ZmlsZSBvdXRsaW5lIG91dHB1dCBvdmVyIG92ZXJmbG93IG92ZXJyaWRpbmcgcGFja2FnZSBwYWQgcGFyYWxsZWwgcGFyYWxsZWxfZW5hYmxlICcgK1xuICAgICAgICAgICAgJ3BhcmFtZXRlcnMgcGFyZW50IHBhcnNlIHBhcnRpYWwgcGFydGl0aW9uIHBhcnRpdGlvbnMgcGFzY2FsIHBhc3NpbmcgcGFzc3dvcmQgcGFzc3dvcmRfZ3JhY2VfdGltZSAnICtcbiAgICAgICAgICAgICdwYXNzd29yZF9sb2NrX3RpbWUgcGFzc3dvcmRfcmV1c2VfbWF4IHBhc3N3b3JkX3JldXNlX3RpbWUgcGFzc3dvcmRfdmVyaWZ5X2Z1bmN0aW9uIHBhdGNoIHBhdGggcGF0aW5kZXggJyArXG4gICAgICAgICAgICAncGN0aW5jcmVhc2UgcGN0dGhyZXNob2xkIHBjdHVzZWQgcGN0dmVyc2lvbiBwZXJjZW50IHBlcmNlbnRfcmFuayBwZXJjZW50aWxlX2NvbnQgcGVyY2VudGlsZV9kaXNjICcgK1xuICAgICAgICAgICAgJ3BlcmZvcm1hbmNlIHBlcmlvZCBwZXJpb2RfYWRkIHBlcmlvZF9kaWZmIHBlcm1hbmVudCBwaHlzaWNhbCBwaSBwaXBlIHBpcGVsaW5lZCBwaXZvdCBwbHVnZ2FibGUgcGx1Z2luICcgK1xuICAgICAgICAgICAgJ3BvbGljeSBwb3NpdGlvbiBwb3N0X3RyYW5zYWN0aW9uIHBvdyBwb3dlciBwcmFnbWEgcHJlYnVpbHQgcHJlY2VkZXMgcHJlY2VkaW5nIHByZWNpc2lvbiBwcmVkaWN0aW9uICcgK1xuICAgICAgICAgICAgJ3ByZWRpY3Rpb25fY29zdCBwcmVkaWN0aW9uX2RldGFpbHMgcHJlZGljdGlvbl9wcm9iYWJpbGl0eSBwcmVkaWN0aW9uX3NldCBwcmVwYXJlIHByZXNlbnQgcHJlc2VydmUgJyArXG4gICAgICAgICAgICAncHJpb3IgcHJpb3JpdHkgcHJpdmF0ZSBwcml2YXRlX3NnYSBwcml2aWxlZ2VzIHByb2NlZHVyYWwgcHJvY2VkdXJlIHByb2NlZHVyZV9hbmFseXplIHByb2Nlc3NsaXN0ICcgK1xuICAgICAgICAgICAgJ3Byb2ZpbGVzIHByb2plY3QgcHJvbXB0IHByb3RlY3Rpb24gcHVibGljIHB1Ymxpc2hpbmdzZXJ2ZXJuYW1lIHB1cmdlIHF1YXJ0ZXIgcXVlcnkgcXVpY2sgcXVpZXNjZSBxdW90YSAnICtcbiAgICAgICAgICAgICdxdW90ZW5hbWUgcmFkaWFucyByYWlzZSByYW5kIHJhbmdlIHJhbmsgcmF3IHJlYWQgcmVhZHMgcmVhZHNpemUgcmVidWlsZCByZWNvcmQgcmVjb3JkcyAnICtcbiAgICAgICAgICAgICdyZWNvdmVyIHJlY292ZXJ5IHJlY3Vyc2l2ZSByZWN5Y2xlIHJlZG8gcmVkdWNlZCByZWYgcmVmZXJlbmNlIHJlZmVyZW5jZWQgcmVmZXJlbmNlcyByZWZlcmVuY2luZyByZWZyZXNoICcgK1xuICAgICAgICAgICAgJ3JlZ2V4cF9saWtlIHJlZ2lzdGVyIHJlZ3JfYXZneCByZWdyX2F2Z3kgcmVncl9jb3VudCByZWdyX2ludGVyY2VwdCByZWdyX3IyIHJlZ3Jfc2xvcGUgcmVncl9zeHggcmVncl9zeHkgJyArXG4gICAgICAgICAgICAncmVqZWN0IHJla2V5IHJlbGF0aW9uYWwgcmVsYXRpdmUgcmVsYXlsb2cgcmVsZWFzZSByZWxlYXNlX2xvY2sgcmVsaWVzX29uIHJlbG9jYXRlIHJlbHkgcmVtIHJlbWFpbmRlciByZW5hbWUgJyArXG4gICAgICAgICAgICAncmVwYWlyIHJlcGVhdCByZXBsYWNlIHJlcGxpY2F0ZSByZXBsaWNhdGlvbiByZXF1aXJlZCByZXNldCByZXNldGxvZ3MgcmVzaXplIHJlc291cmNlIHJlc3BlY3QgcmVzdG9yZSAnICtcbiAgICAgICAgICAgICdyZXN0cmljdGVkIHJlc3VsdCByZXN1bHRfY2FjaGUgcmVzdW1hYmxlIHJlc3VtZSByZXRlbnRpb24gcmV0dXJuIHJldHVybmluZyByZXR1cm5zIHJldXNlIHJldmVyc2UgcmV2b2tlICcgK1xuICAgICAgICAgICAgJ3JpZ2h0IHJsaWtlIHJvbGUgcm9sZXMgcm9sbGJhY2sgcm9sbGluZyByb2xsdXAgcm91bmQgcm93IHJvd19jb3VudCByb3dkZXBlbmRlbmNpZXMgcm93aWQgcm93bnVtIHJvd3MgJyArXG4gICAgICAgICAgICAncnRyaW0gcnVsZXMgc2FmZSBzYWx0IHNhbXBsZSBzYXZlIHNhdmVwb2ludCBzYjEgc2IyIHNiNCBzY2FuIHNjaGVtYSBzY2hlbWFjaGVjayBzY24gc2NvcGUgc2Nyb2xsICcgK1xuICAgICAgICAgICAgJ3Nkb19nZW9yYXN0ZXIgc2RvX3RvcG9fZ2VvbWV0cnkgc2VhcmNoIHNlY190b190aW1lIHNlY29uZCBzZWNvbmRzIHNlY3Rpb24gc2VjdXJlZmlsZSBzZWN1cml0eSBzZWVkIHNlZ21lbnQgc2VsZWN0ICcgK1xuICAgICAgICAgICAgJ3NlbGYgc2VtaSBzZXF1ZW5jZSBzZXF1ZW50aWFsIHNlcmlhbGl6YWJsZSBzZXJ2ZXIgc2VydmVyZXJyb3Igc2Vzc2lvbiBzZXNzaW9uX3VzZXIgc2Vzc2lvbnNfcGVyX3VzZXIgc2V0ICcgK1xuICAgICAgICAgICAgJ3NldHMgc2V0dGluZ3Mgc2hhIHNoYTEgc2hhMiBzaGFyZSBzaGFyZWQgc2hhcmVkX3Bvb2wgc2hvcnQgc2hvdyBzaHJpbmsgc2h1dGRvd24gc2lfYXZlcmFnZWNvbG9yICcgK1xuICAgICAgICAgICAgJ3NpX2NvbG9yaGlzdG9ncmFtIHNpX2ZlYXR1cmVsaXN0IHNpX3Bvc2l0aW9uYWxjb2xvciBzaV9zdGlsbGltYWdlIHNpX3RleHR1cmUgc2libGluZ3Mgc2lkIHNpZ24gc2luICcgK1xuICAgICAgICAgICAgJ3NpemUgc2l6ZV90IHNpemVzIHNraXAgc2xhdmUgc2xlZXAgc21hbGxkYXRldGltZWZyb21wYXJ0cyBzbWFsbGZpbGUgc25hcHNob3Qgc29tZSBzb25hbWUgc29ydCBzb3VuZGV4ICcgK1xuICAgICAgICAgICAgJ3NvdXJjZSBzcGFjZSBzcGFyc2Ugc3BmaWxlIHNwbGl0IHNxbCBzcWxfYmlnX3Jlc3VsdCBzcWxfYnVmZmVyX3Jlc3VsdCBzcWxfY2FjaGUgc3FsX2NhbGNfZm91bmRfcm93cyAnICtcbiAgICAgICAgICAgICdzcWxfc21hbGxfcmVzdWx0IHNxbF92YXJpYW50X3Byb3BlcnR5IHNxbGNvZGUgc3FsZGF0YSBzcWxlcnJvciBzcWxuYW1lIHNxbHN0YXRlIHNxcnQgc3F1YXJlIHN0YW5kYWxvbmUgJyArXG4gICAgICAgICAgICAnc3RhbmRieSBzdGFydCBzdGFydGluZyBzdGFydHVwIHN0YXRlbWVudCBzdGF0aWMgc3RhdGlzdGljcyBzdGF0c19iaW5vbWlhbF90ZXN0IHN0YXRzX2Nyb3NzdGFiICcgK1xuICAgICAgICAgICAgJ3N0YXRzX2tzX3Rlc3Qgc3RhdHNfbW9kZSBzdGF0c19td190ZXN0IHN0YXRzX29uZV93YXlfYW5vdmEgc3RhdHNfdF90ZXN0XyBzdGF0c190X3Rlc3RfaW5kZXAgJyArXG4gICAgICAgICAgICAnc3RhdHNfdF90ZXN0X29uZSBzdGF0c190X3Rlc3RfcGFpcmVkIHN0YXRzX3dzcl90ZXN0IHN0YXR1cyBzdGQgc3RkZGV2IHN0ZGRldl9wb3Agc3RkZGV2X3NhbXAgc3RkZXYgJyArXG4gICAgICAgICAgICAnc3RvcCBzdG9yYWdlIHN0b3JlIHN0b3JlZCBzdHIgc3RyX3RvX2RhdGUgc3RyYWlnaHRfam9pbiBzdHJjbXAgc3RyaWN0IHN0cmluZyBzdHJ1Y3Qgc3R1ZmYgc3R5bGUgc3ViZGF0ZSAnICtcbiAgICAgICAgICAgICdzdWJwYXJ0aXRpb24gc3VicGFydGl0aW9ucyBzdWJzdGl0dXRhYmxlIHN1YnN0ciBzdWJzdHJpbmcgc3VidGltZSBzdWJ0cmluZ19pbmRleCBzdWJ0eXBlIHN1Y2Nlc3Mgc3VtICcgK1xuICAgICAgICAgICAgJ3N1c3BlbmQgc3dpdGNoIHN3aXRjaG9mZnNldCBzd2l0Y2hvdmVyIHN5bmMgc3luY2hyb25vdXMgc3lub255bSBzeXMgc3lzX3htbGFnZyBzeXNhc20gc3lzYXV4IHN5c2RhdGUgJyArXG4gICAgICAgICAgICAnc3lzZGF0ZXRpbWVvZmZzZXQgc3lzZGJhIHN5c29wZXIgc3lzdGVtIHN5c3RlbV91c2VyIHN5c3V0Y2RhdGV0aW1lIHRhYmxlIHRhYmxlcyB0YWJsZXNwYWNlIHRhYmxlc2FtcGxlIHRhbiB0ZG8gJyArXG4gICAgICAgICAgICAndGVtcGxhdGUgdGVtcG9yYXJ5IHRlcm1pbmF0ZWQgdGVydGlhcnlfd2VpZ2h0cyB0ZXN0IHRoYW4gdGhlbiB0aHJlYWQgdGhyb3VnaCB0aWVyIHRpZXMgdGltZSB0aW1lX2Zvcm1hdCAnICtcbiAgICAgICAgICAgICd0aW1lX3pvbmUgdGltZWRpZmYgdGltZWZyb21wYXJ0cyB0aW1lb3V0IHRpbWVzdGFtcCB0aW1lc3RhbXBhZGQgdGltZXN0YW1wZGlmZiB0aW1lem9uZV9hYmJyICcgK1xuICAgICAgICAgICAgJ3RpbWV6b25lX21pbnV0ZSB0aW1lem9uZV9yZWdpb24gdG8gdG9fYmFzZTY0IHRvX2RhdGUgdG9fZGF5cyB0b19zZWNvbmRzIHRvZGF0ZXRpbWVvZmZzZXQgdHJhY2UgdHJhY2tpbmcgJyArXG4gICAgICAgICAgICAndHJhbnNhY3Rpb24gdHJhbnNhY3Rpb25hbCB0cmFuc2xhdGUgdHJhbnNsYXRpb24gdHJlYXQgdHJpZ2dlciB0cmlnZ2VyX25lc3RsZXZlbCB0cmlnZ2VycyB0cmltIHRydW5jYXRlICcgK1xuICAgICAgICAgICAgJ3RyeV9jYXN0IHRyeV9jb252ZXJ0IHRyeV9wYXJzZSB0eXBlIHViMSB1YjIgdWI0IHVjYXNlIHVuYXJjaGl2ZWQgdW5ib3VuZGVkIHVuY29tcHJlc3MgJyArXG4gICAgICAgICAgICAndW5kZXIgdW5kbyB1bmhleCB1bmljb2RlIHVuaWZvcm0gdW5pbnN0YWxsIHVuaW9uIHVuaXF1ZSB1bml4X3RpbWVzdGFtcCB1bmtub3duIHVubGltaXRlZCB1bmxvY2sgdW5uZXN0IHVucGl2b3QgJyArXG4gICAgICAgICAgICAndW5yZWNvdmVyYWJsZSB1bnNhZmUgdW5zaWduZWQgdW50aWwgdW50cnVzdGVkIHVudXNhYmxlIHVudXNlZCB1cGRhdGUgdXBkYXRlZCB1cGdyYWRlIHVwcGVkIHVwcGVyIHVwc2VydCAnICtcbiAgICAgICAgICAgICd1cmwgdXJvd2lkIHVzYWJsZSB1c2FnZSB1c2UgdXNlX3N0b3JlZF9vdXRsaW5lcyB1c2VyIHVzZXJfZGF0YSB1c2VyX3Jlc291cmNlcyB1c2VycyB1c2luZyB1dGNfZGF0ZSAnICtcbiAgICAgICAgICAgICd1dGNfdGltZXN0YW1wIHV1aWQgdXVpZF9zaG9ydCB2YWxpZGF0ZSB2YWxpZGF0ZV9wYXNzd29yZF9zdHJlbmd0aCB2YWxpZGF0aW9uIHZhbGlzdCB2YWx1ZSB2YWx1ZXMgdmFyICcgK1xuICAgICAgICAgICAgJ3Zhcl9zYW1wIHZhcmNoYXJjIHZhcmkgdmFyaWEgdmFyaWFiIHZhcmlhYmwgdmFyaWFibGUgdmFyaWFibGVzIHZhcmlhbmNlIHZhcnAgdmFycmF3IHZhcnJhd2MgdmFycmF5ICcgK1xuICAgICAgICAgICAgJ3ZlcmlmeSB2ZXJzaW9uIHZlcnNpb25zIHZpZXcgdmlydHVhbCB2aXNpYmxlIHZvaWQgd2FpdCB3YWxsZXQgd2FybmluZyB3YXJuaW5ncyB3ZWVrIHdlZWtkYXkgd2Vla29meWVhciAnICtcbiAgICAgICAgICAgICd3ZWxsZm9ybWVkIHdoZW4gd2hlbmUgd2hlbmV2IHdoZW5ldmUgd2hlbmV2ZXIgd2hlcmUgd2hpbGUgd2hpdGVzcGFjZSB3aW5kb3cgd2l0aCB3aXRoaW4gd2l0aG91dCB3b3JrIHdyYXBwZWQgJyArXG4gICAgICAgICAgICAneGRiIHhtbCB4bWxhZ2cgeG1sYXR0cmlidXRlcyB4bWxjYXN0IHhtbGNvbGF0dHZhbCB4bWxlbGVtZW50IHhtbGV4aXN0cyB4bWxmb3Jlc3QgeG1saW5kZXggeG1sbmFtZXNwYWNlcyAnICtcbiAgICAgICAgICAgICd4bWxwaSB4bWxxdWVyeSB4bWxyb290IHhtbHNjaGVtYSB4bWxzZXJpYWxpemUgeG1sdGFibGUgeG1sdHlwZSB4b3IgeWVhciB5ZWFyX3RvX21vbnRoIHllYXJzIHllYXJ3ZWVrJyxcbiAgICAgICAgICBsaXRlcmFsOlxuICAgICAgICAgICAgJ3RydWUgZmFsc2UgbnVsbCB1bmtub3duJyxcbiAgICAgICAgICBidWlsdF9pbjpcbiAgICAgICAgICAgICdhcnJheSBiaWdpbnQgYmluYXJ5IGJpdCBibG9iIGJvb2wgYm9vbGVhbiBjaGFyIGNoYXJhY3RlciBkYXRlIGRlYyBkZWNpbWFsIGZsb2F0IGludCBpbnQ4IGludGVnZXIgaW50ZXJ2YWwgbnVtYmVyICcgK1xuICAgICAgICAgICAgJ251bWVyaWMgcmVhbCByZWNvcmQgc2VyaWFsIHNlcmlhbDggc21hbGxpbnQgdGV4dCB0aW1lIHRpbWVzdGFtcCB0aW55aW50IHZhcmNoYXIgdmFyY2hhcjIgdmFyeWluZyB2b2lkJ1xuICAgICAgICB9LFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgICAgICAgICBiZWdpbjogJ1xcJycsIGVuZDogJ1xcJycsXG4gICAgICAgICAgICBjb250YWluczogW3tiZWdpbjogJ1xcJ1xcJyd9XVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGJlZ2luOiAnXCInLCBlbmQ6ICdcIicsXG4gICAgICAgICAgICBjb250YWluczogW3tiZWdpbjogJ1wiXCInfV1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgICAgICAgICBiZWdpbjogJ2AnLCBlbmQ6ICdgJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaGxqcy5DX05VTUJFUl9NT0RFLFxuICAgICAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICAgICAgQ09NTUVOVF9NT0RFLFxuICAgICAgICAgIGhsanMuSEFTSF9DT01NRU5UX01PREVcbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICBDT01NRU5UX01PREUsXG4gICAgICBobGpzLkhBU0hfQ09NTUVOVF9NT0RFXG4gICAgXVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNxbDtcbiIsIi8qXG5MYW5ndWFnZTogU0NTU1xuRGVzY3JpcHRpb246IFNjc3MgaXMgYW4gZXh0ZW5zaW9uIG9mIHRoZSBzeW50YXggb2YgQ1NTLlxuQXV0aG9yOiBLdXJ0IEVtY2ggPGt1cnRAa3VydGVtY2guY29tPlxuV2Vic2l0ZTogaHR0cHM6Ly9zYXNzLWxhbmcuY29tXG5DYXRlZ29yeTogY29tbW9uLCBjc3NcbiovXG5mdW5jdGlvbiBzY3NzKGhsanMpIHtcbiAgdmFyIEFUX0lERU5USUZJRVIgPSAnQFthLXotXSsnOyAvLyBAZm9udC1mYWNlXG4gIHZhciBBVF9NT0RJRklFUlMgPSBcImFuZCBvciBub3Qgb25seVwiO1xuICB2YXIgSURFTlRfUkUgPSAnW2EtekEtWi1dW2EtekEtWjAtOV8tXSonO1xuICB2YXIgVkFSSUFCTEUgPSB7XG4gICAgY2xhc3NOYW1lOiAndmFyaWFibGUnLFxuICAgIGJlZ2luOiAnKFxcXFwkJyArIElERU5UX1JFICsgJylcXFxcYidcbiAgfTtcbiAgdmFyIEhFWENPTE9SID0ge1xuICAgIGNsYXNzTmFtZTogJ251bWJlcicsIGJlZ2luOiAnI1swLTlBLUZhLWZdKydcbiAgfTtcbiAgdmFyIERFRl9JTlRFUk5BTFMgPSB7XG4gICAgY2xhc3NOYW1lOiAnYXR0cmlidXRlJyxcbiAgICBiZWdpbjogJ1tBLVpcXFxcX1xcXFwuXFxcXC1dKycsIGVuZDogJzonLFxuICAgIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgaWxsZWdhbDogJ1teXFxcXHNdJyxcbiAgICBzdGFydHM6IHtcbiAgICAgIGVuZHNXaXRoUGFyZW50OiB0cnVlLCBleGNsdWRlRW5kOiB0cnVlLFxuICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgSEVYQ09MT1IsXG4gICAgICAgIGhsanMuQ1NTX05VTUJFUl9NT0RFLFxuICAgICAgICBobGpzLlFVT1RFX1NUUklOR19NT0RFLFxuICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICAgIHtcbiAgICAgICAgICBjbGFzc05hbWU6ICdtZXRhJywgYmVnaW46ICchaW1wb3J0YW50J1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9O1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdTQ1NTJyxcbiAgICBjYXNlX2luc2Vuc2l0aXZlOiB0cnVlLFxuICAgIGlsbGVnYWw6ICdbPS98XFwnXScsXG4gICAgY29udGFpbnM6IFtcbiAgICAgIGhsanMuQ19MSU5FX0NPTU1FTlRfTU9ERSxcbiAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLWlkJywgYmVnaW46ICdcXFxcI1tBLVphLXowLTlfLV0rJyxcbiAgICAgICAgcmVsZXZhbmNlOiAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdzZWxlY3Rvci1jbGFzcycsIGJlZ2luOiAnXFxcXC5bQS1aYS16MC05Xy1dKycsXG4gICAgICAgIHJlbGV2YW5jZTogMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnc2VsZWN0b3ItYXR0cicsIGJlZ2luOiAnXFxcXFsnLCBlbmQ6ICdcXFxcXScsXG4gICAgICAgIGlsbGVnYWw6ICckJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnc2VsZWN0b3ItdGFnJywgLy8gYmVnaW46IElERU5UX1JFLCBlbmQ6ICdbLHxcXFxcc10nXG4gICAgICAgIGJlZ2luOiAnXFxcXGIoYXxhYmJyfGFjcm9ueW18YWRkcmVzc3xhcmVhfGFydGljbGV8YXNpZGV8YXVkaW98YnxiYXNlfGJpZ3xibG9ja3F1b3RlfGJvZHl8YnJ8YnV0dG9ufGNhbnZhc3xjYXB0aW9ufGNpdGV8Y29kZXxjb2x8Y29sZ3JvdXB8Y29tbWFuZHxkYXRhbGlzdHxkZHxkZWx8ZGV0YWlsc3xkZm58ZGl2fGRsfGR0fGVtfGVtYmVkfGZpZWxkc2V0fGZpZ2NhcHRpb258ZmlndXJlfGZvb3Rlcnxmb3JtfGZyYW1lfGZyYW1lc2V0fChoWzEtNl0pfGhlYWR8aGVhZGVyfGhncm91cHxocnxodG1sfGl8aWZyYW1lfGltZ3xpbnB1dHxpbnN8a2JkfGtleWdlbnxsYWJlbHxsZWdlbmR8bGl8bGlua3xtYXB8bWFya3xtZXRhfG1ldGVyfG5hdnxub2ZyYW1lc3xub3NjcmlwdHxvYmplY3R8b2x8b3B0Z3JvdXB8b3B0aW9ufG91dHB1dHxwfHBhcmFtfHByZXxwcm9ncmVzc3xxfHJwfHJ0fHJ1Ynl8c2FtcHxzY3JpcHR8c2VjdGlvbnxzZWxlY3R8c21hbGx8c3BhbnxzdHJpa2V8c3Ryb25nfHN0eWxlfHN1YnxzdXB8dGFibGV8dGJvZHl8dGR8dGV4dGFyZWF8dGZvb3R8dGh8dGhlYWR8dGltZXx0aXRsZXx0cnx0dHx1bHx2YXJ8dmlkZW8pXFxcXGInLFxuICAgICAgICByZWxldmFuY2U6IDBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLXBzZXVkbycsXG4gICAgICAgIGJlZ2luOiAnOih2aXNpdGVkfHZhbGlkfHJvb3R8cmlnaHR8cmVxdWlyZWR8cmVhZC13cml0ZXxyZWFkLW9ubHl8b3V0LXJhbmdlfG9wdGlvbmFsfG9ubHktb2YtdHlwZXxvbmx5LWNoaWxkfG50aC1vZi10eXBlfG50aC1sYXN0LW9mLXR5cGV8bnRoLWxhc3QtY2hpbGR8bnRoLWNoaWxkfG5vdHxsaW5rfGxlZnR8bGFzdC1vZi10eXBlfGxhc3QtY2hpbGR8bGFuZ3xpbnZhbGlkfGluZGV0ZXJtaW5hdGV8aW4tcmFuZ2V8aG92ZXJ8Zm9jdXN8Zmlyc3Qtb2YtdHlwZXxmaXJzdC1saW5lfGZpcnN0LWxldHRlcnxmaXJzdC1jaGlsZHxmaXJzdHxlbmFibGVkfGVtcHR5fGRpc2FibGVkfGRlZmF1bHR8Y2hlY2tlZHxiZWZvcmV8YWZ0ZXJ8YWN0aXZlKSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLXBzZXVkbycsXG4gICAgICAgIGJlZ2luOiAnOjooYWZ0ZXJ8YmVmb3JlfGNob2ljZXN8Zmlyc3QtbGV0dGVyfGZpcnN0LWxpbmV8cmVwZWF0LWluZGV4fHJlcGVhdC1pdGVtfHNlbGVjdGlvbnx2YWx1ZSknXG4gICAgICB9LFxuICAgICAgVkFSSUFCTEUsXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ2F0dHJpYnV0ZScsXG4gICAgICAgIGJlZ2luOiAnXFxcXGIoc3JjfHotaW5kZXh8d29yZC13cmFwfHdvcmQtc3BhY2luZ3x3b3JkLWJyZWFrfHdpZHRofHdpZG93c3x3aGl0ZS1zcGFjZXx2aXNpYmlsaXR5fHZlcnRpY2FsLWFsaWdufHVuaWNvZGUtYmlkaXx0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbnx0cmFuc2l0aW9uLXByb3BlcnR5fHRyYW5zaXRpb24tZHVyYXRpb258dHJhbnNpdGlvbi1kZWxheXx0cmFuc2l0aW9ufHRyYW5zZm9ybS1zdHlsZXx0cmFuc2Zvcm0tb3JpZ2lufHRyYW5zZm9ybXx0b3B8dGV4dC11bmRlcmxpbmUtcG9zaXRpb258dGV4dC10cmFuc2Zvcm18dGV4dC1zaGFkb3d8dGV4dC1yZW5kZXJpbmd8dGV4dC1vdmVyZmxvd3x0ZXh0LWluZGVudHx0ZXh0LWRlY29yYXRpb24tc3R5bGV8dGV4dC1kZWNvcmF0aW9uLWxpbmV8dGV4dC1kZWNvcmF0aW9uLWNvbG9yfHRleHQtZGVjb3JhdGlvbnx0ZXh0LWFsaWduLWxhc3R8dGV4dC1hbGlnbnx0YWItc2l6ZXx0YWJsZS1sYXlvdXR8cmlnaHR8cmVzaXplfHF1b3Rlc3xwb3NpdGlvbnxwb2ludGVyLWV2ZW50c3xwZXJzcGVjdGl2ZS1vcmlnaW58cGVyc3BlY3RpdmV8cGFnZS1icmVhay1pbnNpZGV8cGFnZS1icmVhay1iZWZvcmV8cGFnZS1icmVhay1hZnRlcnxwYWRkaW5nLXRvcHxwYWRkaW5nLXJpZ2h0fHBhZGRpbmctbGVmdHxwYWRkaW5nLWJvdHRvbXxwYWRkaW5nfG92ZXJmbG93LXl8b3ZlcmZsb3cteHxvdmVyZmxvdy13cmFwfG92ZXJmbG93fG91dGxpbmUtd2lkdGh8b3V0bGluZS1zdHlsZXxvdXRsaW5lLW9mZnNldHxvdXRsaW5lLWNvbG9yfG91dGxpbmV8b3JwaGFuc3xvcmRlcnxvcGFjaXR5fG9iamVjdC1wb3NpdGlvbnxvYmplY3QtZml0fG5vcm1hbHxub25lfG5hdi11cHxuYXYtcmlnaHR8bmF2LWxlZnR8bmF2LWluZGV4fG5hdi1kb3dufG1pbi13aWR0aHxtaW4taGVpZ2h0fG1heC13aWR0aHxtYXgtaGVpZ2h0fG1hc2t8bWFya3N8bWFyZ2luLXRvcHxtYXJnaW4tcmlnaHR8bWFyZ2luLWxlZnR8bWFyZ2luLWJvdHRvbXxtYXJnaW58bGlzdC1zdHlsZS10eXBlfGxpc3Qtc3R5bGUtcG9zaXRpb258bGlzdC1zdHlsZS1pbWFnZXxsaXN0LXN0eWxlfGxpbmUtaGVpZ2h0fGxldHRlci1zcGFjaW5nfGxlZnR8anVzdGlmeS1jb250ZW50fGluaXRpYWx8aW5oZXJpdHxpbWUtbW9kZXxpbWFnZS1vcmllbnRhdGlvbnxpbWFnZS1yZXNvbHV0aW9ufGltYWdlLXJlbmRlcmluZ3xpY29ufGh5cGhlbnN8aGVpZ2h0fGZvbnQtd2VpZ2h0fGZvbnQtdmFyaWFudC1saWdhdHVyZXN8Zm9udC12YXJpYW50fGZvbnQtc3R5bGV8Zm9udC1zdHJldGNofGZvbnQtc2l6ZS1hZGp1c3R8Zm9udC1zaXplfGZvbnQtbGFuZ3VhZ2Utb3ZlcnJpZGV8Zm9udC1rZXJuaW5nfGZvbnQtZmVhdHVyZS1zZXR0aW5nc3xmb250LWZhbWlseXxmb250fGZsb2F0fGZsZXgtd3JhcHxmbGV4LXNocmlua3xmbGV4LWdyb3d8ZmxleC1mbG93fGZsZXgtZGlyZWN0aW9ufGZsZXgtYmFzaXN8ZmxleHxmaWx0ZXJ8ZW1wdHktY2VsbHN8ZGlzcGxheXxkaXJlY3Rpb258Y3Vyc29yfGNvdW50ZXItcmVzZXR8Y291bnRlci1pbmNyZW1lbnR8Y29udGVudHxjb2x1bW4td2lkdGh8Y29sdW1uLXNwYW58Y29sdW1uLXJ1bGUtd2lkdGh8Y29sdW1uLXJ1bGUtc3R5bGV8Y29sdW1uLXJ1bGUtY29sb3J8Y29sdW1uLXJ1bGV8Y29sdW1uLWdhcHxjb2x1bW4tZmlsbHxjb2x1bW4tY291bnR8Y29sdW1uc3xjb2xvcnxjbGlwLXBhdGh8Y2xpcHxjbGVhcnxjYXB0aW9uLXNpZGV8YnJlYWstaW5zaWRlfGJyZWFrLWJlZm9yZXxicmVhay1hZnRlcnxib3gtc2l6aW5nfGJveC1zaGFkb3d8Ym94LWRlY29yYXRpb24tYnJlYWt8Ym90dG9tfGJvcmRlci13aWR0aHxib3JkZXItdG9wLXdpZHRofGJvcmRlci10b3Atc3R5bGV8Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXN8Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1c3xib3JkZXItdG9wLWNvbG9yfGJvcmRlci10b3B8Ym9yZGVyLXN0eWxlfGJvcmRlci1zcGFjaW5nfGJvcmRlci1yaWdodC13aWR0aHxib3JkZXItcmlnaHQtc3R5bGV8Ym9yZGVyLXJpZ2h0LWNvbG9yfGJvcmRlci1yaWdodHxib3JkZXItcmFkaXVzfGJvcmRlci1sZWZ0LXdpZHRofGJvcmRlci1sZWZ0LXN0eWxlfGJvcmRlci1sZWZ0LWNvbG9yfGJvcmRlci1sZWZ0fGJvcmRlci1pbWFnZS13aWR0aHxib3JkZXItaW1hZ2Utc291cmNlfGJvcmRlci1pbWFnZS1zbGljZXxib3JkZXItaW1hZ2UtcmVwZWF0fGJvcmRlci1pbWFnZS1vdXRzZXR8Ym9yZGVyLWltYWdlfGJvcmRlci1jb2xvcnxib3JkZXItY29sbGFwc2V8Ym9yZGVyLWJvdHRvbS13aWR0aHxib3JkZXItYm90dG9tLXN0eWxlfGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzfGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXN8Ym9yZGVyLWJvdHRvbS1jb2xvcnxib3JkZXItYm90dG9tfGJvcmRlcnxiYWNrZ3JvdW5kLXNpemV8YmFja2dyb3VuZC1yZXBlYXR8YmFja2dyb3VuZC1wb3NpdGlvbnxiYWNrZ3JvdW5kLW9yaWdpbnxiYWNrZ3JvdW5kLWltYWdlfGJhY2tncm91bmQtY29sb3J8YmFja2dyb3VuZC1jbGlwfGJhY2tncm91bmQtYXR0YWNobWVudHxiYWNrZ3JvdW5kLWJsZW5kLW1vZGV8YmFja2dyb3VuZHxiYWNrZmFjZS12aXNpYmlsaXR5fGF1dG98YW5pbWF0aW9uLXRpbWluZy1mdW5jdGlvbnxhbmltYXRpb24tcGxheS1zdGF0ZXxhbmltYXRpb24tbmFtZXxhbmltYXRpb24taXRlcmF0aW9uLWNvdW50fGFuaW1hdGlvbi1maWxsLW1vZGV8YW5pbWF0aW9uLWR1cmF0aW9ufGFuaW1hdGlvbi1kaXJlY3Rpb258YW5pbWF0aW9uLWRlbGF5fGFuaW1hdGlvbnxhbGlnbi1zZWxmfGFsaWduLWl0ZW1zfGFsaWduLWNvbnRlbnQpXFxcXGInLFxuICAgICAgICBpbGxlZ2FsOiAnW15cXFxcc10nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBiZWdpbjogJ1xcXFxiKHdoaXRlc3BhY2V8d2FpdHx3LXJlc2l6ZXx2aXNpYmxlfHZlcnRpY2FsLXRleHR8dmVydGljYWwtaWRlb2dyYXBoaWN8dXBwZXJjYXNlfHVwcGVyLXJvbWFufHVwcGVyLWFscGhhfHVuZGVybGluZXx0cmFuc3BhcmVudHx0b3B8dGhpbnx0aGlja3x0ZXh0fHRleHQtdG9wfHRleHQtYm90dG9tfHRiLXJsfHRhYmxlLWhlYWRlci1ncm91cHx0YWJsZS1mb290ZXItZ3JvdXB8c3ctcmVzaXplfHN1cGVyfHN0cmljdHxzdGF0aWN8c3F1YXJlfHNvbGlkfHNtYWxsLWNhcHN8c2VwYXJhdGV8c2UtcmVzaXplfHNjcm9sbHxzLXJlc2l6ZXxydGx8cm93LXJlc2l6ZXxyaWRnZXxyaWdodHxyZXBlYXR8cmVwZWF0LXl8cmVwZWF0LXh8cmVsYXRpdmV8cHJvZ3Jlc3N8cG9pbnRlcnxvdmVybGluZXxvdXRzaWRlfG91dHNldHxvYmxpcXVlfG5vd3JhcHxub3QtYWxsb3dlZHxub3JtYWx8bm9uZXxudy1yZXNpemV8bm8tcmVwZWF0fG5vLWRyb3B8bmV3c3BhcGVyfG5lLXJlc2l6ZXxuLXJlc2l6ZXxtb3ZlfG1pZGRsZXxtZWRpdW18bHRyfGxyLXRifGxvd2VyY2FzZXxsb3dlci1yb21hbnxsb3dlci1hbHBoYXxsb29zZXxsaXN0LWl0ZW18bGluZXxsaW5lLXRocm91Z2h8bGluZS1lZGdlfGxpZ2h0ZXJ8bGVmdHxrZWVwLWFsbHxqdXN0aWZ5fGl0YWxpY3xpbnRlci13b3JkfGludGVyLWlkZW9ncmFwaHxpbnNpZGV8aW5zZXR8aW5saW5lfGlubGluZS1ibG9ja3xpbmhlcml0fGluYWN0aXZlfGlkZW9ncmFwaC1zcGFjZXxpZGVvZ3JhcGgtcGFyZW50aGVzaXN8aWRlb2dyYXBoLW51bWVyaWN8aWRlb2dyYXBoLWFscGhhfGhvcml6b250YWx8aGlkZGVufGhlbHB8aGFuZHxncm9vdmV8Zml4ZWR8ZWxsaXBzaXN8ZS1yZXNpemV8ZG91YmxlfGRvdHRlZHxkaXN0cmlidXRlfGRpc3RyaWJ1dGUtc3BhY2V8ZGlzdHJpYnV0ZS1sZXR0ZXJ8ZGlzdHJpYnV0ZS1hbGwtbGluZXN8ZGlzY3xkaXNhYmxlZHxkZWZhdWx0fGRlY2ltYWx8ZGFzaGVkfGNyb3NzaGFpcnxjb2xsYXBzZXxjb2wtcmVzaXplfGNpcmNsZXxjaGFyfGNlbnRlcnxjYXBpdGFsaXplfGJyZWFrLXdvcmR8YnJlYWstYWxsfGJvdHRvbXxib3RofGJvbGRlcnxib2xkfGJsb2NrfGJpZGktb3ZlcnJpZGV8YmVsb3d8YmFzZWxpbmV8YXV0b3xhbHdheXN8YWxsLXNjcm9sbHxhYnNvbHV0ZXx0YWJsZXx0YWJsZS1jZWxsKVxcXFxiJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgYmVnaW46ICc6JywgZW5kOiAnOycsXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgVkFSSUFCTEUsXG4gICAgICAgICAgSEVYQ09MT1IsXG4gICAgICAgICAgaGxqcy5DU1NfTlVNQkVSX01PREUsXG4gICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAnbWV0YScsIGJlZ2luOiAnIWltcG9ydGFudCdcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICAvLyBtYXRjaGluZyB0aGVzZSBoZXJlIGFsbG93cyB1cyB0byB0cmVhdCB0aGVtIG1vcmUgbGlrZSByZWd1bGFyIENTU1xuICAgICAgLy8gcnVsZXMgc28gZXZlcnl0aGluZyBiZXR3ZWVuIHRoZSB7fSBnZXRzIHJlZ3VsYXIgcnVsZSBoaWdobGlnaHRpbmcsXG4gICAgICAvLyB3aGljaCBpcyB3aGF0IHdlIHdhbnQgZm9yIHBhZ2UgYW5kIGZvbnQtZmFjZVxuICAgICAge1xuICAgICAgICBiZWdpbjogJ0AocGFnZXxmb250LWZhY2UpJyxcbiAgICAgICAgbGV4ZW1lczogQVRfSURFTlRJRklFUixcbiAgICAgICAga2V5d29yZHM6ICdAcGFnZSBAZm9udC1mYWNlJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgYmVnaW46ICdAJywgZW5kOiAnW3s7XScsXG4gICAgICAgIHJldHVybkJlZ2luOiB0cnVlLFxuICAgICAgICBrZXl3b3JkczogQVRfTU9ESUZJRVJTLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGJlZ2luOiBBVF9JREVOVElGSUVSLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiBcImtleXdvcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgVkFSSUFCTEUsXG4gICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgICAgSEVYQ09MT1IsXG4gICAgICAgICAgaGxqcy5DU1NfTlVNQkVSX01PREUsXG4gICAgICAgICAgLy8ge1xuICAgICAgICAgIC8vICAgYmVnaW46ICdcXFxcc1tBLVphLXowLTlfLi1dKycsXG4gICAgICAgICAgLy8gICByZWxldmFuY2U6IDBcbiAgICAgICAgICAvLyB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2NzcztcbiIsIi8qXG5MYW5ndWFnZTogSlNPTlxuRGVzY3JpcHRpb246IEpTT04gKEphdmFTY3JpcHQgT2JqZWN0IE5vdGF0aW9uKSBpcyBhIGxpZ2h0d2VpZ2h0IGRhdGEtaW50ZXJjaGFuZ2UgZm9ybWF0LlxuQXV0aG9yOiBJdmFuIFNhZ2FsYWV2IDxtYW5pYWNAc29mdHdhcmVtYW5pYWNzLm9yZz5cbldlYnNpdGU6IGh0dHA6Ly93d3cuanNvbi5vcmdcbkNhdGVnb3J5OiBjb21tb24sIHByb3RvY29sc1xuKi9cblxuZnVuY3Rpb24ganNvbihobGpzKSB7XG4gIHZhciBMSVRFUkFMUyA9IHtsaXRlcmFsOiAndHJ1ZSBmYWxzZSBudWxsJ307XG4gIHZhciBBTExPV0VEX0NPTU1FTlRTID0gW1xuICAgIGhsanMuQ19MSU5FX0NPTU1FTlRfTU9ERSxcbiAgICBobGpzLkNfQkxPQ0tfQ09NTUVOVF9NT0RFXG4gIF07XG4gIHZhciBUWVBFUyA9IFtcbiAgICBobGpzLlFVT1RFX1NUUklOR19NT0RFLFxuICAgIGhsanMuQ19OVU1CRVJfTU9ERVxuICBdO1xuICB2YXIgVkFMVUVfQ09OVEFJTkVSID0ge1xuICAgIGVuZDogJywnLCBlbmRzV2l0aFBhcmVudDogdHJ1ZSwgZXhjbHVkZUVuZDogdHJ1ZSxcbiAgICBjb250YWluczogVFlQRVMsXG4gICAga2V5d29yZHM6IExJVEVSQUxTXG4gIH07XG4gIHZhciBPQkpFQ1QgPSB7XG4gICAgYmVnaW46ICd7JywgZW5kOiAnfScsXG4gICAgY29udGFpbnM6IFtcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnYXR0cicsXG4gICAgICAgIGJlZ2luOiAvXCIvLCBlbmQ6IC9cIi8sXG4gICAgICAgIGNvbnRhaW5zOiBbaGxqcy5CQUNLU0xBU0hfRVNDQVBFXSxcbiAgICAgICAgaWxsZWdhbDogJ1xcXFxuJyxcbiAgICAgIH0sXG4gICAgICBobGpzLmluaGVyaXQoVkFMVUVfQ09OVEFJTkVSLCB7YmVnaW46IC86L30pXG4gICAgXS5jb25jYXQoQUxMT1dFRF9DT01NRU5UUyksXG4gICAgaWxsZWdhbDogJ1xcXFxTJ1xuICB9O1xuICB2YXIgQVJSQVkgPSB7XG4gICAgYmVnaW46ICdcXFxcWycsIGVuZDogJ1xcXFxdJyxcbiAgICBjb250YWluczogW2hsanMuaW5oZXJpdChWQUxVRV9DT05UQUlORVIpXSwgLy8gaW5oZXJpdCBpcyBhIHdvcmthcm91bmQgZm9yIGEgYnVnIHRoYXQgbWFrZXMgc2hhcmVkIG1vZGVzIHdpdGggZW5kc1dpdGhQYXJlbnQgY29tcGlsZSBvbmx5IHRoZSBlbmRpbmcgb2Ygb25lIG9mIHRoZSBwYXJlbnRzXG4gICAgaWxsZWdhbDogJ1xcXFxTJ1xuICB9O1xuICBUWVBFUy5wdXNoKE9CSkVDVCwgQVJSQVkpO1xuICBBTExPV0VEX0NPTU1FTlRTLmZvckVhY2goZnVuY3Rpb24ocnVsZSkge1xuICAgIFRZUEVTLnB1c2gocnVsZSk7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdKU09OJyxcbiAgICBjb250YWluczogVFlQRVMsXG4gICAga2V5d29yZHM6IExJVEVSQUxTLFxuICAgIGlsbGVnYWw6ICdcXFxcUydcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBqc29uO1xuIiwiLypcbkxhbmd1YWdlOiBDU1NcbkNhdGVnb3J5OiBjb21tb24sIGNzc1xuV2Vic2l0ZTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQ1NTXG4qL1xuXG5mdW5jdGlvbiBjc3MoaGxqcykge1xuICB2YXIgRlVOQ1RJT05fTElLRSA9IHtcbiAgICBiZWdpbjogL1tcXHctXStcXCgvLCByZXR1cm5CZWdpbjogdHJ1ZSxcbiAgICBjb250YWluczogW1xuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdidWlsdF9pbicsXG4gICAgICAgIGJlZ2luOiAvW1xcdy1dKy9cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luOiAvXFwoLywgZW5kOiAvXFwpLyxcbiAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgICBobGpzLkNTU19OVU1CRVJfTU9ERSxcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfTtcbiAgdmFyIEFUVFJJQlVURSA9IHtcbiAgICBjbGFzc05hbWU6ICdhdHRyaWJ1dGUnLFxuICAgIGJlZ2luOiAvXFxTLywgZW5kOiAnOicsIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgc3RhcnRzOiB7XG4gICAgICBlbmRzV2l0aFBhcmVudDogdHJ1ZSwgZXhjbHVkZUVuZDogdHJ1ZSxcbiAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgIEZVTkNUSU9OX0xJS0UsXG4gICAgICAgIGhsanMuQ1NTX05VTUJFUl9NT0RFLFxuICAgICAgICBobGpzLlFVT1RFX1NUUklOR19NT0RFLFxuICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICAgIHtcbiAgICAgICAgICBjbGFzc05hbWU6ICdudW1iZXInLCBiZWdpbjogJyNbMC05QS1GYS1mXSsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBjbGFzc05hbWU6ICdtZXRhJywgYmVnaW46ICchaW1wb3J0YW50J1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9O1xuICB2YXIgQVRfSURFTlRJRklFUiA9ICdAW2Etei1dKyc7IC8vIEBmb250LWZhY2VcbiAgdmFyIEFUX01PRElGSUVSUyA9IFwiYW5kIG9yIG5vdCBvbmx5XCI7XG4gIHZhciBBVF9QUk9QRVJUWV9SRSA9IC9AXFwtP1xcd1tcXHddKihcXC1cXHcrKSovOyAvLyBALXdlYmtpdC1rZXlmcmFtZXNcbiAgdmFyIElERU5UX1JFID0gJ1thLXpBLVotXVthLXpBLVowLTlfLV0qJztcbiAgdmFyIFJVTEUgPSB7XG4gICAgYmVnaW46IC8oPzpbQS1aXFxfXFwuXFwtXSt8LS1bYS16QS1aMC05Xy1dKylcXHMqOi8sIHJldHVybkJlZ2luOiB0cnVlLCBlbmQ6ICc7JywgZW5kc1dpdGhQYXJlbnQ6IHRydWUsXG4gICAgY29udGFpbnM6IFtcbiAgICAgIEFUVFJJQlVURVxuICAgIF1cbiAgfTtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdDU1MnLFxuICAgIGNhc2VfaW5zZW5zaXRpdmU6IHRydWUsXG4gICAgaWxsZWdhbDogL1s9XFwvfCdcXCRdLyxcbiAgICBjb250YWluczogW1xuICAgICAgaGxqcy5DX0JMT0NLX0NPTU1FTlRfTU9ERSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnc2VsZWN0b3ItaWQnLCBiZWdpbjogLyNbQS1aYS16MC05Xy1dKy9cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLWNsYXNzJywgYmVnaW46IC9cXC5bQS1aYS16MC05Xy1dKy9cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLWF0dHInLFxuICAgICAgICBiZWdpbjogL1xcWy8sIGVuZDogL1xcXS8sXG4gICAgICAgIGlsbGVnYWw6ICckJyxcbiAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnc2VsZWN0b3ItcHNldWRvJyxcbiAgICAgICAgYmVnaW46IC86KDopP1thLXpBLVowLTlcXF9cXC1cXCtcXChcXClcIicuXSsvXG4gICAgICB9LFxuICAgICAgLy8gbWF0Y2hpbmcgdGhlc2UgaGVyZSBhbGxvd3MgdXMgdG8gdHJlYXQgdGhlbSBtb3JlIGxpa2UgcmVndWxhciBDU1NcbiAgICAgIC8vIHJ1bGVzIHNvIGV2ZXJ5dGhpbmcgYmV0d2VlbiB0aGUge30gZ2V0cyByZWd1bGFyIHJ1bGUgaGlnaGxpZ2h0aW5nLFxuICAgICAgLy8gd2hpY2ggaXMgd2hhdCB3ZSB3YW50IGZvciBwYWdlIGFuZCBmb250LWZhY2VcbiAgICAgIHtcbiAgICAgICAgYmVnaW46ICdAKHBhZ2V8Zm9udC1mYWNlKScsXG4gICAgICAgIGxleGVtZXM6IEFUX0lERU5USUZJRVIsXG4gICAgICAgIGtleXdvcmRzOiAnQHBhZ2UgQGZvbnQtZmFjZSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luOiAnQCcsIGVuZDogJ1t7O10nLCAvLyBhdF9ydWxlIGVhdGluZyBmaXJzdCBcIntcIiBpcyBhIGdvb2QgdGhpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJlY2F1c2UgaXQgZG9lc27igJl0IGxldCBpdCB0byBiZSBwYXJzZWQgYXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEgcnVsZSBzZXQgYnV0IGluc3RlYWQgZHJvcHMgcGFyc2VyIGludG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBkZWZhdWx0IG1vZGUgd2hpY2ggaXMgaG93IGl0IHNob3VsZCBiZS5cbiAgICAgICAgaWxsZWdhbDogLzovLCAvLyBicmVhayBvbiBMZXNzIHZhcmlhYmxlcyBAdmFyOiAuLi5cbiAgICAgICAgcmV0dXJuQmVnaW46IHRydWUsXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAna2V5d29yZCcsXG4gICAgICAgICAgICBiZWdpbjogQVRfUFJPUEVSVFlfUkVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGJlZ2luOiAvXFxzLywgZW5kc1dpdGhQYXJlbnQ6IHRydWUsIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgICAgICAgICByZWxldmFuY2U6IDAsXG4gICAgICAgICAgICBrZXl3b3JkczogQVRfTU9ESUZJRVJTLFxuICAgICAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGJlZ2luOiAvW2Etei1dKzovLFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZTpcImF0dHJpYnV0ZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGhsanMuQVBPU19TVFJJTkdfTU9ERSxcbiAgICAgICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgICAgICAgaGxqcy5DU1NfTlVNQkVSX01PREVcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLXRhZycsIGJlZ2luOiBJREVOVF9SRSxcbiAgICAgICAgcmVsZXZhbmNlOiAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBiZWdpbjogJ3snLCBlbmQ6ICd9JyxcbiAgICAgICAgaWxsZWdhbDogL1xcUy8sXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgaGxqcy5DX0JMT0NLX0NPTU1FTlRfTU9ERSxcbiAgICAgICAgICBSVUxFLFxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNzcztcbiIsIjxzY3JpcHQgY29udGV4dD1cIm1vZHVsZVwiPlxuICBpbXBvcnQgeyBhdXRob3JzIH0gZnJvbSBcIi4uLy4uL19oZWxwZXJzL3N0b3JlLmpzXCI7XG4gIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcmVsb2FkKHsgcGFyYW1zLCBxdWVyeSB9KSB7XG4gICAgLy8gdGhlIGBzbHVnYCBwYXJhbWV0ZXIgaXMgYXZhaWxhYmxlIGJlY2F1c2VcbiAgICAvLyB0aGlzIGZpbGUgaXMgY2FsbGVkIFtzbHVnXS5zdmVsdGVcbiAgICBsZXQgYXV0aG9yTWFwID0gbmV3IE1hcCgpO1xuICAgIGF1dGhvcnMuc3Vic2NyaWJlKHZhbHVlID0+IHtcbiAgICAgIGF1dGhvck1hcCA9IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5mZXRjaChgQkFTRV9QQVRIL3Bvc3RzL3JvdXRlLyR7cGFyYW1zLnNsdWd9YCk7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcy5qc29uKCk7XG5cbiAgICBpZiAocmVzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICBsZXQgYXV0aG9yTWFwID0gbmV3IE1hcCgpO1xuICAgICAgbGV0IGF1dGhvckRhdGEgPSBbXTtcblxuICAgICAgY29uc3QgdW5zdWJzY3JpYmUgPSBhdXRob3JzLnN1YnNjcmliZSh2YWx1ZSA9PiB7XG4gICAgICAgIGF1dGhvck1hcCA9IHZhbHVlO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGNyZWF0aW5nIHVuaXF1ZSBhdXRob3IgaWRzIGZyb20gdGhlIHBvc3RzXG5cbiAgICAgIGlmICghYXV0aG9yTWFwLmdldChkYXRhLmF1dGhvcklkKSkge1xuICAgICAgICAvLyBnZXR0aW5nIGF1dGhvciBkYXRhIGZvciBhbGwgdW5pcXVlIGF1dGhvcnMgdG8gYXZvaWQgbXVsdGkgZmV0Y2hcbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5mZXRjaChgQkFTRV9QQVRIL3VzZXJzLyR7ZGF0YS5hdXRob3JJZH1gKTtcbiAgICAgICAgYXV0aG9yRGF0YSA9IGF3YWl0IHJlcy5qc29uKCk7XG5cbiAgICAgICAgYXV0aG9ycy51cGRhdGUobWFwID0+IHtcbiAgICAgICAgICByZXR1cm4gbWFwLnNldChhdXRob3JEYXRhLl9pZCwgYXV0aG9yRGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXV0aG9yRGF0YSA9IGF1dGhvck1hcC5nZXQoZGF0YS5hdXRob3JJZCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHBvc3Q6IGRhdGEsIGF1dGhvckRhdGEgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lcnJvcihyZXMuc3RhdHVzLCBkYXRhLm1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuPC9zY3JpcHQ+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBBdXRob3IgZnJvbSBcIi4uLy4uL2NvbXBvbmVudHMvQXV0aG9yLnN2ZWx0ZVwiO1xuICBpbXBvcnQgaGxqcyBmcm9tIFwiaGlnaGxpZ2h0LmpzL2xpYi9jb3JlXCI7XG4gIGltcG9ydCBqYXZhc2NyaXB0IGZyb20gXCJoaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9qYXZhc2NyaXB0XCI7XG4gIGltcG9ydCBiYXNoIGZyb20gXCJoaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9iYXNoXCI7XG4gIGltcG9ydCBzcWwgZnJvbSBcImhpZ2hsaWdodC5qcy9saWIvbGFuZ3VhZ2VzL3NxbFwiO1xuICBpbXBvcnQgc2NzcyBmcm9tIFwiaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvc2Nzc1wiO1xuICBpbXBvcnQganNvbiBmcm9tIFwiaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvanNvblwiO1xuICBpbXBvcnQgY3NzIGZyb20gXCJoaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9jc3NcIjtcbiAgaGxqcy5yZWdpc3Rlckxhbmd1YWdlKFwiamF2YXNjcmlwdFwiLCBqYXZhc2NyaXB0KTtcbiAgaGxqcy5yZWdpc3Rlckxhbmd1YWdlKFwiYmFzaFwiLCBiYXNoKTtcbiAgaGxqcy5yZWdpc3Rlckxhbmd1YWdlKFwic3FsXCIsIHNxbCk7XG4gIGhsanMucmVnaXN0ZXJMYW5ndWFnZShcInNjc3NcIiwgc2Nzcyk7XG4gIGhsanMucmVnaXN0ZXJMYW5ndWFnZShcImpzb25cIiwganNvbik7XG4gIGhsanMucmVnaXN0ZXJMYW5ndWFnZShcImNzc1wiLCBjc3MpO1xuXG4gIGV4cG9ydCBsZXQgcG9zdDtcbiAgZXhwb3J0IGxldCBhdXRob3JEYXRhO1xuXG4gIGNvbnN0IGhpZ2hsaWdodCA9IHNvdXJjZSA9PiB7XG4gICAgY29uc3QgeyB2YWx1ZTogaGlnaGxpZ2h0ZWQgfSA9IGhsanMuaGlnaGxpZ2h0QXV0byhzb3VyY2UpO1xuICAgIHJldHVybiBoaWdobGlnaHRlZDtcbiAgfTtcblxuICBsZXQgcGFnZVZpZXdzID0gMDtcbiAgaWYgKHR5cGVvZiBmZXRjaCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgZ2xvYmFsLmZldGNoID0gcmVxdWlyZShcIm5vZGUtZmV0Y2hcIik7XG4gIH1cbiAgZmV0Y2goYEJBU0VfUEFUSC9wb3N0cy1tZXRhLWRhdGEvJHtwb3N0Ll9pZH1gKVxuICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcbiAgICAudGhlbigoeyBjb3VudCB9KSA9PiB7XG4gICAgICBwYWdlVmlld3MgPSBjb3VudDtcbiAgICB9KTtcbjwvc2NyaXB0PlxuXG48c3R5bGU+XG4gIC8qXG5cdFx0QnkgZGVmYXVsdCwgQ1NTIGlzIGxvY2FsbHkgc2NvcGVkIHRvIHRoZSBjb21wb25lbnQsXG5cdFx0YW5kIGFueSB1bnVzZWQgc3R5bGVzIGFyZSBkZWFkLWNvZGUtZWxpbWluYXRlZC5cblx0XHRJbiB0aGlzIHBhZ2UsIFN2ZWx0ZSBjYW4ndCBrbm93IHdoaWNoIGVsZW1lbnRzIGFyZVxuXHRcdGdvaW5nIHRvIGFwcGVhciBpbnNpZGUgdGhlIHt7e3Bvc3QuaHRtbH19fSBibG9jayxcblx0XHRzbyB3ZSBoYXZlIHRvIHVzZSB0aGUgOmdsb2JhbCguLi4pIG1vZGlmaWVyIHRvIHRhcmdldFxuXHRcdGFsbCBlbGVtZW50cyBpbnNpZGUgLmNvbnRlbnRcblx0Ki9cbiAgLyogLmNvbnRlbnQgOmdsb2JhbChoMikge1xuICAgIGZvbnQtc2l6ZTogMS40ZW07XG4gICAgZm9udC13ZWlnaHQ6IDUwMDtcbiAgfSAqL1xuXG4gIC8qIC5jb250ZW50IDpnbG9iYWwocHJlKSB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogI2Y5ZjlmOTtcbiAgICBib3gtc2hhZG93OiBpbnNldCAxcHggMXB4IDVweCByZ2JhKDAsIDAsIDAsIDAuMDUpO1xuICAgIHBhZGRpbmc6IDAuNWVtO1xuICAgIGJvcmRlci1yYWRpdXM6IDJweDtcbiAgICBvdmVyZmxvdy14OiBhdXRvO1xuICB9ICovXG5cbiAgLyogLmNvbnRlbnQgOmdsb2JhbChwcmUpIDpnbG9iYWwoY29kZSkge1xuICAgIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xuICAgIHBhZGRpbmc6IDA7XG4gIH1cblxuICAuY29udGVudCA6Z2xvYmFsKHVsKSB7XG4gICAgbGluZS1oZWlnaHQ6IDEuNTtcbiAgfVxuXG4gIC5jb250ZW50IDpnbG9iYWwobGkpIHtcbiAgICBtYXJnaW46IDAgMCAwLjVlbSAwO1xuICB9ICovXG5cbiAgQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWluLXdpZHRoOiA4MDBweCkge1xuICAgIC5wb3N0LS1tZXRhZGF0YSB7XG4gICAgICBkaXNwbGF5OiBncmlkO1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAwLjhmciAyLjJmciAwLjRmciAxZnI7XG4gICAgICAtd2Via2l0LWJveC1hbGlnbjogY2VudGVyO1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICB9XG4gIH1cblxuICAucG9zdF9fdGFnIHtcbiAgICBwYWRkaW5nOiAzcHggNXB4O1xuICAgIGJhY2tncm91bmQtY29sb3I6ICNkY2RjZGM7XG4gICAgbWFyZ2luOiAycHggM3B4O1xuICAgIGJvcmRlci1yYWRpdXM6IDNweDtcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gIH1cbiAgLnBvc3QtLWJvZHkge1xuICAgIG1hcmdpbjogMHB4IDEwcHg7XG4gIH1cblxuICBwcmUge1xuICAgIG1hcmdpbi1ib3R0b206IDFlbTtcbiAgICBwYWRkaW5nOiA1JTtcbiAgICB3aWR0aDogYXV0bztcbiAgICAvKiBtYXgtaGVpZ2h0OiA5MDBweDsgKi9cbiAgICBvdmVyZmxvdzogYXV0bztcbiAgICBmb250LXNpemU6IDEuNGVtO1xuICAgIGxpbmUtaGVpZ2h0OiAxLjNlbTtcbiAgfVxuXG4gIGltZyB7XG4gICAgbWF4LXdpZHRoOiAxMDAlO1xuICB9XG4gIC5jZW50ZXIge1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIG1hcmdpbjogNTBweCBhdXRvO1xuICAgIGJveC1zaGFkb3c6IC0zcHggOHB4IDEwcHggI2Q4ZDhkODtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBtYXgtd2lkdGg6IC13ZWJraXQtbWF4LWNvbnRlbnQ7XG4gICAgbWF4LXdpZHRoOiAtbW96LW1heC1jb250ZW50O1xuICAgIG1heC13aWR0aDogbWF4LWNvbnRlbnQ7XG4gICAgYm9yZGVyLXJhZGl1czogMnB4O1xuICB9XG5cbiAgLnBvc3QtLXRpdGxlIHtcbiAgICBmb250LXNpemU6IDM2cHg7XG4gICAgbWFyZ2luOiAxNXB4IDAgNXB4O1xuICAgIGZvbnQtd2VpZ2h0OiBsaWdodGVyO1xuICB9XG4gIC5wb3N0LS1zdWItdGl0bGUge1xuICAgIGZvbnQtd2VpZ2h0OiBsaWdodGVyO1xuICAgIGZvbnQtc2l6ZTogMjJweDtcbiAgICBtYXJnaW4tdG9wOiAxMHB4O1xuICB9XG5cbiAgLnBvc3QtLW1ldGFkYXRhIHtcbiAgICBtYXJnaW4tdG9wOiAxMHB4O1xuICB9XG5cbiAgaDMge1xuICAgIGZvbnQtc2l6ZTogMnJlbTtcbiAgICBmb250LXdlaWdodDogNjAwO1xuICAgIGNvbG9yOiB2YXIoLS10ZXh0YmxhY2spO1xuICB9XG48L3N0eWxlPlxuXG48c3ZlbHRlOmhlYWQ+XG4gIDx0aXRsZT57cG9zdC50aXRsZX08L3RpdGxlPlxuICA8bWV0YSBuYW1lPVwia2V5d29yZHNcIiBjb250ZW50PXtwb3N0LnRhZ3Muam9pbignLCAnKX0gLz5cbiAgPG1ldGEgbmFtZT1cImRlc2NyaXB0aW9uXCIgY29udGVudD17cG9zdC5zdWJUaXRsZX0gLz5cblxuICA8bWV0YSBuYW1lPVwidHdpdHRlcjpjYXJkXCIgY29udGVudD1cInN1bW1hcnlfbGFyZ2VfaW1hZ2VcIiAvPlxuICA8bWV0YSBuYW1lPVwidHdpdHRlcjpzaXRlXCIgY29udGVudD1cIkBfaGVjdGFuZVwiIC8+XG4gIDxtZXRhIG5hbWU9XCJ0d2l0dGVyOmNyZWF0b3JcIiBjb250ZW50PVwiQHZlbHVzZ2F1dGFtXCIgLz5cbiAgPG1ldGEgbmFtZT1cInR3aXR0ZXI6dGl0bGVcIiBjb250ZW50PXtwb3N0LnRpdGxlfSAvPlxuICA8bWV0YSBuYW1lPVwidHdpdHRlcjpkZXNjcmlwdGlvblwiIGNvbnRlbnQ9e3Bvc3Quc3ViVGl0bGV9IC8+XG4gIDxtZXRhIG5hbWU9XCJ0d2l0dGVyOmltYWdlXCIgY29udGVudD17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS90aXRsZS5qcGdgfSAvPlxuXG4gIDxtZXRhIHByb3BlcnR5PVwib2c6dXJsXCIgY29udGVudD17YGh0dHBzOi8vaGVjdGFuZS5jb20vYmxvZy8ke3Bvc3Qucm91dGV9YH0gLz5cbiAgPG1ldGEgcHJvcGVydHk9XCJvZzp0eXBlXCIgY29udGVudD1cImFydGljbGVcIiAvPlxuICA8bWV0YSBwcm9wZXJ0eT1cIm9nOnRpdGxlXCIgY29udGVudD17cG9zdC50aXRsZX0gLz5cbiAgPG1ldGEgcHJvcGVydHk9XCJvZzpkZXNjcmlwdGlvblwiIGNvbnRlbnQ9e3Bvc3Quc3ViVGl0bGV9IC8+XG4gIDxtZXRhIHByb3BlcnR5PVwib2c6aW1hZ2VcIiBjb250ZW50PXtgQVNTRVRfQkFTRS8ke3Bvc3Qucm91dGV9L3RpdGxlLmpwZ2B9IC8+XG48L3N2ZWx0ZTpoZWFkPlxuXG48ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICA8aDEgY2xhc3M9XCJwb3N0LS10aXRsZVwiPntwb3N0LnRpdGxlfTwvaDE+XG4gIDxoNCBjbGFzcz1cInBvc3QtLXN1Yi10aXRsZVwiPntwb3N0LnN1YlRpdGxlfTwvaDQ+XG4gIDxwaWN0dXJlPlxuICAgIDxzb3VyY2VcbiAgICAgIHNyY3NldD17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS9tb2JpbGUud2VicGB9XG4gICAgICBtZWRpYT1cIihtYXgtd2lkdGg6IDQyMHB4KVwiXG4gICAgICB0eXBlPVwiaW1hZ2Uvd2VicFwiIC8+XG4gICAgPHNvdXJjZVxuICAgICAgc3Jjc2V0PXtgQVNTRVRfQkFTRS8ke3Bvc3Qucm91dGV9L21vYmlsZS5qcGdgfVxuICAgICAgbWVkaWE9XCIobWF4LXdpZHRoOiA0MjBweClcIlxuICAgICAgdHlwZT1cImltYWdlL2pwZ1wiIC8+XG4gICAgPHNvdXJjZVxuICAgICAgc3Jjc2V0PXtgQVNTRVRfQkFTRS8ke3Bvc3Qucm91dGV9L2xpc3Rpbmcud2VicGB9XG4gICAgICBtZWRpYT1cIiggbWF4LXdpZHRoOjc5OXB4KVwiXG4gICAgICB0eXBlPVwiaW1hZ2Uvd2VicFwiIC8+XG4gICAgPHNvdXJjZVxuICAgICAgc3Jjc2V0PXtgQVNTRVRfQkFTRS8ke3Bvc3Qucm91dGV9L2xpc3RpbmcuanBnYH1cbiAgICAgIG1lZGlhPVwiKG1heC13aWR0aDo3OTlweClcIlxuICAgICAgdHlwZT1cImltYWdlL2pwZ1wiIC8+XG4gICAgPHNvdXJjZVxuICAgICAgc3Jjc2V0PXtgQVNTRVRfQkFTRS8ke3Bvc3Qucm91dGV9L3RpdGxlLndlYnBgfVxuICAgICAgbWVkaWE9XCIobWluLXdpZHRoOiA4MDBweClcIlxuICAgICAgdHlwZT1cImltYWdlL3dlYnBcIiAvPlxuICAgIDxzb3VyY2VcbiAgICAgIHNyY3NldD17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS90aXRsZS5qcGdgfVxuICAgICAgbWVkaWE9XCIobWluLXdpZHRoOiA4MDBweClcIlxuICAgICAgdHlwZT1cImltYWdlL2pwZ1wiIC8+XG4gICAgPGltZ1xuICAgICAgY2xhc3M9XCJwb3N0LXRpdGxlLWltYWdlXCJcbiAgICAgIHNyYz17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS90aXRsZS5qcGdgfVxuICAgICAgYWx0PXtwb3N0LnRpdGxlfSAvPlxuICA8L3BpY3R1cmU+XG4gIDxkaXYgY2xhc3M9XCJwb3N0LS1tZXRhZGF0YVwiPlxuICAgIDxBdXRob3JcbiAgICAgIG5hbWU9e2F1dGhvckRhdGEubmFtZX1cbiAgICAgIGF2YXRoYXI9e2F1dGhvckRhdGEuYXZhdGhhcn1cbiAgICAgIGNyZWF0ZWREYXRlPXtwb3N0LmNyZWF0ZWREYXRlfSAvPlxuICAgIDxkaXYgY2xhc3M9XCJwb3N0X190YWdzXCI+XG4gICAgICB7I2VhY2ggcG9zdC50YWdzIGFzIHRhZ31cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJwb3N0X190YWdcIj57dGFnfTwvc3Bhbj5cbiAgICAgIHsvZWFjaH1cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwicG9zdF9fdmlld3NcIj57cGFnZVZpZXdzfSB2aWV3czwvZGl2PlxuICA8L2Rpdj5cbiAgPGRpdiBjbGFzcz1cInBvc3QtLWJvZHlcIj5cbiAgICB7I2VhY2ggcG9zdC5ib2R5IGFzIHsgdHlwZSwgZGF0YSB9fVxuICAgICAgeyNpZiB0eXBlID09PSAnaW1hZ2UnfVxuICAgICAgICA8cGljdHVyZT5cbiAgICAgICAgICA8aW1nXG4gICAgICAgICAgICBhbHQ9e2RhdGEuY2FwdGlvbn1cbiAgICAgICAgICAgIGNsYXNzPXtgJHtkYXRhLndpdGhCb3JkZXIgPyAnYm9yZGVyICcgOiAnJ30ke2RhdGEud2l0aEJhY2tncm91bmQgPyAnYmFja2dyb3VuZCAnIDogJyd9JHtkYXRhLnN0cmV0Y2hlZCA/ICdzdHJldGNoZWQnIDogJ2NlbnRlcid9YH1cbiAgICAgICAgICAgIHNyYz17YCR7ZGF0YS51cmwucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKX0uanBnYH0gLz5cbiAgICAgICAgPC9waWN0dXJlPlxuICAgICAgey9pZn1cbiAgICAgIHsjaWYgdHlwZSA9PT0gJ2hlYWRlcid9XG4gICAgICAgIHsjaWYgZGF0YS5sZXZlbCA9PT0gMX1cbiAgICAgICAgICA8aDE+e2RhdGEudGV4dH08L2gxPlxuICAgICAgICB7L2lmfVxuICAgICAgICB7I2lmIGRhdGEubGV2ZWwgPT09IDJ9XG4gICAgICAgICAgPGgyPntkYXRhLnRleHR9PC9oMj5cbiAgICAgICAgey9pZn1cbiAgICAgICAgeyNpZiBkYXRhLmxldmVsID09PSAzfVxuICAgICAgICAgIDxoMz57ZGF0YS50ZXh0fTwvaDM+XG4gICAgICAgIHsvaWZ9XG4gICAgICAgIHsjaWYgZGF0YS5sZXZlbCA9PT0gNH1cbiAgICAgICAgICA8aDQ+e2RhdGEudGV4dH08L2g0PlxuICAgICAgICB7L2lmfVxuICAgICAgey9pZn1cbiAgICAgIHsjaWYgdHlwZSA9PT0gJ2NvZGUnfVxuICAgICAgICA8cHJlIGNsYXNzPVwiaGxqc1wiPlxuICAgICAgICAgIDxjb2RlPlxuICAgICAgICAgICAge0BodG1sIGAke2hpZ2hsaWdodChkYXRhLmNvZGUpfWB9XG4gICAgICAgICAgPC9jb2RlPlxuICAgICAgICA8L3ByZT5cbiAgICAgIHsvaWZ9XG4gICAgICB7I2lmIHR5cGUgPT09ICdwYXJhZ3JhcGgnfVxuICAgICAgICA8cD5cbiAgICAgICAgICB7QGh0bWwgZGF0YS50ZXh0fVxuICAgICAgICA8L3A+XG4gICAgICB7L2lmfVxuICAgIHsvZWFjaH1cbiAgPC9kaXY+XG48L2Rpdj5cbiIsIjxzY3JpcHQ+XG4gIGV4cG9ydCBsZXQgc2VnbWVudDtcbjwvc2NyaXB0PlxuXG48c3R5bGU+XG4gIG5hdiB7XG4gICAgZm9udC13ZWlnaHQ6IDMwMDtcbiAgICBwYWRkaW5nOiAwIDFlbTtcbiAgICBncmlkLWFyZWE6IG5hdjtcbiAgfVxuXG4gIHVsIHtcbiAgICBtYXJnaW46IDAgYXV0bztcbiAgICBwYWRkaW5nOiAwO1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1ldmVubHk7XG4gICAgZmxleC13cmFwOiB3cmFwO1xuICAgIHdpZHRoOiBmaXQtY29udGVudDtcbiAgfVxuXG4gIGxpIHtcbiAgICBsaXN0LXN0eWxlLXR5cGU6IG5vbmU7XG4gIH1cblxuICBbYXJpYS1jdXJyZW50XSB7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgfVxuXG4gIFthcmlhLWN1cnJlbnRdOjphZnRlciB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIGNvbnRlbnQ6IFwiXCI7XG4gICAgd2lkdGg6IGNhbGMoMTAwJSAtIDFlbSk7XG4gICAgaGVpZ2h0OiAycHg7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDI1NSwgNjIsIDApO1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIGJvdHRvbTogLTFweDtcbiAgfVxuXG4gIGEge1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICBwYWRkaW5nOiAxZW0gMC41ZW07XG4gICAgZGlzcGxheTogYmxvY2s7XG4gICAgY29sb3I6IHZhcigtLWJsYWNrKTtcbiAgfVxuXG4gIGgzIHtcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgcGFkZGluZzogMHB4IDE1cHg7XG4gIH1cblxuICBoMyBpbWcge1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIG1heC13aWR0aDogbWluLWNvbnRlbnQ7XG4gIH1cbjwvc3R5bGU+XG5cbjxkaXY+XG4gIDxoMz5cbiAgICA8cGljdHVyZT5cbiAgICAgIDxzb3VyY2Ugc3Jjc2V0PVwibG9nby53ZWJwXCIgdHlwZT1cImltYWdlL3dlYnBcIiAvPlxuICAgICAgPGltZyBzcmM9XCJsb2dvLnBuZ1wiIGFsdD1cImhlY3RhbmUgbG9nb1wiIC8+XG4gICAgPC9waWN0dXJlPlxuICA8L2gzPlxuICA8bmF2IGNsYXNzPVwibWFyZ2luLWF1dG8gY29udGFpbmVyIFwiPlxuICAgIDx1bD5cbiAgICAgIDxsaT5cbiAgICAgICAgPGFcbiAgICAgICAgICByZWw9XCJwcmVmZXRjaFwiXG4gICAgICAgICAgYXJpYS1jdXJyZW50PXtzZWdtZW50ID09PSB1bmRlZmluZWQgPyAncGFnZScgOiB1bmRlZmluZWR9XG4gICAgICAgICAgaHJlZj1cIi5cIj5cbiAgICAgICAgICBIb21lXG4gICAgICAgIDwvYT5cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxhXG4gICAgICAgICAgcmVsPVwicHJlZmV0Y2hcIlxuICAgICAgICAgIGFyaWEtY3VycmVudD17c2VnbWVudCA9PT0gJ3RlY2hub2xvZ3knID8gJ3BhZ2UnIDogdW5kZWZpbmVkfVxuICAgICAgICAgIGhyZWY9XCJ0ZWNobm9sb2d5XCI+XG4gICAgICAgICAgVGVjaG5vbG9neVxuICAgICAgICA8L2E+XG4gICAgICA8L2xpPlxuICAgICAgPGxpPlxuICAgICAgICA8YVxuICAgICAgICAgIHJlbD1cInByZWZldGNoXCJcbiAgICAgICAgICBhcmlhLWN1cnJlbnQ9e3NlZ21lbnQgPT09ICdpbnRlcnZpZXdzJyA/ICdwYWdlJyA6IHVuZGVmaW5lZH1cbiAgICAgICAgICBocmVmPVwiaW50ZXJ2aWV3c1wiPlxuICAgICAgICAgIEludGVydmlld3NcbiAgICAgICAgPC9hPlxuICAgICAgPC9saT5cbiAgICAgIDxsaT5cbiAgICAgICAgPGFcbiAgICAgICAgICByZWw9XCJwcmVmZXRjaFwiXG4gICAgICAgICAgYXJpYS1jdXJyZW50PXtzZWdtZW50ID09PSAnbGVhcm5pbmdzJyA/ICdwYWdlJyA6IHVuZGVmaW5lZH1cbiAgICAgICAgICBocmVmPVwibGVhcm5pbmdzXCI+XG4gICAgICAgICAgTGVhcm5pbmdzXG4gICAgICAgIDwvYT5cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxhXG4gICAgICAgICAgcmVsPVwicHJlZmV0Y2hcIlxuICAgICAgICAgIGFyaWEtY3VycmVudD17c2VnbWVudCA9PT0gJ3RyYXZlbG9ndWUnID8gJ3BhZ2UnIDogdW5kZWZpbmVkfVxuICAgICAgICAgIGhyZWY9XCJ0cmF2ZWxvZ3VlXCI+XG4gICAgICAgICAgVHJhdmVsb2d1ZVxuICAgICAgICA8L2E+XG4gICAgICA8L2xpPlxuXG4gICAgICA8IS0tIGZvciB0aGUgYmxvZyBsaW5rLCB3ZSdyZSB1c2luZyByZWw9cHJlZmV0Y2ggc28gdGhhdCBTYXBwZXIgcHJlZmV0Y2hlc1xuXHRcdCAgICAgdGhlIGJsb2cgZGF0YSB3aGVuIHdlIGhvdmVyIG92ZXIgdGhlIGxpbmsgb3IgdGFwIGl0IG9uIGEgdG91Y2hzY3JlZW4gLS0+XG4gICAgICA8IS0tIDxsaT5cbiAgICAgIDxhXG4gICAgICAgIHJlbD1cInByZWZldGNoXCJcbiAgICAgICAgYXJpYS1jdXJyZW50PXtzZWdtZW50ID09PSAnYmxvZycgPyAncGFnZScgOiB1bmRlZmluZWR9XG4gICAgICAgIGhyZWY9XCJibG9nXCI+XG4gICAgICAgIGJsb2dcbiAgICAgIDwvYT5cbiAgICA8L2xpPiAtLT5cbiAgICA8L3VsPlxuICA8L25hdj5cbjwvZGl2PlxuIiwiPHNjcmlwdD5cbiAgZXhwb3J0IGxldCBzZWdtZW50O1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cbiAgLnBhZ2UtLXRpdGxlIHtcbiAgICBjb2xvcjogdmFyKC0tdGV4dEJsYWNrKTtcbiAgICBmb250LXNpemU6IDEuOHJlbTtcbiAgICBmb250LXdlaWdodDogNTAwO1xuICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1saWdodGdyZXkpO1xuICB9XG48L3N0eWxlPlxuXG57I2lmIHNlZ21lbnQgIT09ICdibG9nJ31cbiAgPGhlYWRlciBjbGFzcz1cImNvbnRhaW5lciBtYXJnaW4tYXV0byBwYWRkaW5nLWxlZnQyMCBwYWRkaW5nLXJpZ2h0MjBcIj5cbiAgICA8aDEgY2xhc3M9XCJwYWdlLS10aXRsZVwiPlxuICAgICAge3NlZ21lbnQgPT09IHVuZGVmaW5lZCA/ICdIb21lJyA6IFN0cmluZyhzZWdtZW50KVxuICAgICAgICAgICAgLmNoYXJBdCgwKVxuICAgICAgICAgICAgLnRvVXBwZXJDYXNlKCkgKyBTdHJpbmcoc2VnbWVudCkuc2xpY2UoMSl9XG4gICAgPC9oMT5cbiAgPC9oZWFkZXI+XG57L2lmfVxuIiwiPHN0eWxlPlxuICAuZm9vdGVyLXRleHQge1xuICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1saWdodGdyZXkpO1xuICAgIG1hcmdpbjogMjBweDtcbiAgICBwYWRkaW5nLXRvcDogMTBweDtcbiAgICBkaXNwbGF5OiBncmlkO1xuICAgIGp1c3RpZnktaXRlbXM6IHJpZ2h0O1xuICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyO1xuICAgIGdyaWQtdGVtcGxhdGUtcm93czogbm9uZTtcbiAgfVxuPC9zdHlsZT5cblxuPGZvb3RlciBjbGFzcz1cIm1hcmdpbi1hdXRvIGNvbnRhaW5lclwiPlxuICA8ZGl2IGNsYXNzPVwiZm9vdGVyLXRleHRcIj5cbiAgICB7YEhlY3RhbmUgQWxsIFJpZ2h0cyBSZXNlcnZlZC4gQ29weXJpZ2h0IDIwMTggLSAke25ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKX1gfVxuICA8L2Rpdj5cbjwvZm9vdGVyPlxuIiwiPHNjcmlwdD5cbiAgaW1wb3J0IE5hdiBmcm9tIFwiLi4vY29tcG9uZW50cy9OYXYuc3ZlbHRlXCI7XG4gIGltcG9ydCBIZWFkZXIgZnJvbSBcIi4uL2NvbXBvbmVudHMvSGVhZGVyLnN2ZWx0ZVwiO1xuICBpbXBvcnQgRm9vdGVyIGZyb20gXCIuLi9jb21wb25lbnRzL0Zvb3Rlci5zdmVsdGVcIjtcbiAgZXhwb3J0IGxldCBzZWdtZW50O1xuPC9zY3JpcHQ+XG5cbjxOYXYge3NlZ21lbnR9IC8+XG48SGVhZGVyIHtzZWdtZW50fSAvPlxuPHNlY3Rpb24gY2xhc3M9XCJjb250YWluZXIgbWFyZ2luLWF1dG8gcGFkZGluZy1sZWZ0MjAgcGFkZGluZy1yaWdodDIwXCI+XG4gIDxzbG90IC8+XG48L3NlY3Rpb24+XG48Rm9vdGVyIC8+XG4iLCI8c2NyaXB0PlxuICBleHBvcnQgbGV0IHN0YXR1cztcbiAgZXhwb3J0IGxldCBlcnJvcjtcblxuICBjb25zdCBkZXYgPSBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJkZXZlbG9wbWVudFwiO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cbiAgaDEsXG4gIHAge1xuICAgIG1hcmdpbjogMCBhdXRvO1xuICB9XG5cbiAgaDEge1xuICAgIGZvbnQtc2l6ZTogMi44ZW07XG4gICAgZm9udC13ZWlnaHQ6IDcwMDtcbiAgICBtYXJnaW46IDAgMCAwLjVlbSAwO1xuICB9XG5cbiAgcCB7XG4gICAgbWFyZ2luOiAxZW0gYXV0bztcbiAgfVxuXG4gIEBtZWRpYSAobWluLXdpZHRoOiA0ODBweCkge1xuICAgIGgxIHtcbiAgICAgIGZvbnQtc2l6ZTogNGVtO1xuICAgIH1cbiAgfVxuPC9zdHlsZT5cblxuPHN2ZWx0ZTpoZWFkPlxuICA8dGl0bGU+e3N0YXR1c308L3RpdGxlPlxuPC9zdmVsdGU6aGVhZD5cblxuPGgxPntzdGF0dXN9PC9oMT5cblxuPHA+e2Vycm9yLm1lc3NhZ2V9PC9wPlxuXG57I2lmIGRldiAmJiBlcnJvci5zdGFja31cbiAgPHByZT57ZXJyb3Iuc3RhY2t9PC9wcmU+XG57L2lmfVxuIiwiLy8gVGhpcyBmaWxlIGlzIGdlbmVyYXRlZCBieSBTYXBwZXIg4oCUIGRvIG5vdCBlZGl0IGl0IVxuaW1wb3J0IGNvbXBvbmVudF8wLCB7IHByZWxvYWQgYXMgcHJlbG9hZF8wIH0gZnJvbSBcIi4uLy4uLy4uL3JvdXRlcy9pbmRleC5zdmVsdGVcIjtcbmltcG9ydCBjb21wb25lbnRfMSwgeyBwcmVsb2FkIGFzIHByZWxvYWRfMSB9IGZyb20gXCIuLi8uLi8uLi9yb3V0ZXMvaW50ZXJ2aWV3cy5zdmVsdGVcIjtcbmltcG9ydCBjb21wb25lbnRfMiwgeyBwcmVsb2FkIGFzIHByZWxvYWRfMiB9IGZyb20gXCIuLi8uLi8uLi9yb3V0ZXMvdGVjaG5vbG9neS5zdmVsdGVcIjtcbmltcG9ydCBjb21wb25lbnRfMywgeyBwcmVsb2FkIGFzIHByZWxvYWRfMyB9IGZyb20gXCIuLi8uLi8uLi9yb3V0ZXMvdHJhdmVsb2d1ZS5zdmVsdGVcIjtcbmltcG9ydCBjb21wb25lbnRfNCwgeyBwcmVsb2FkIGFzIHByZWxvYWRfNCB9IGZyb20gXCIuLi8uLi8uLi9yb3V0ZXMvbGVhcm5pbmdzLnN2ZWx0ZVwiO1xuaW1wb3J0IGNvbXBvbmVudF81IGZyb20gXCIuLi8uLi8uLi9yb3V0ZXMvYWJvdXQuc3ZlbHRlXCI7XG5pbXBvcnQgY29tcG9uZW50XzYsIHsgcHJlbG9hZCBhcyBwcmVsb2FkXzYgfSBmcm9tIFwiLi4vLi4vLi4vcm91dGVzL2Jsb2cvW3NsdWddLnN2ZWx0ZVwiO1xuaW1wb3J0IHJvb3QgZnJvbSBcIi4uLy4uLy4uL3JvdXRlcy9fbGF5b3V0LnN2ZWx0ZVwiO1xuaW1wb3J0IGVycm9yIGZyb20gXCIuLi8uLi8uLi9yb3V0ZXMvX2Vycm9yLnN2ZWx0ZVwiO1xuXG5jb25zdCBkID0gZGVjb2RlVVJJQ29tcG9uZW50O1xuXG5leHBvcnQgY29uc3QgbWFuaWZlc3QgPSB7XG5cdHNlcnZlcl9yb3V0ZXM6IFtcblx0XHRcblx0XSxcblxuXHRwYWdlczogW1xuXHRcdHtcblx0XHRcdC8vIGluZGV4LnN2ZWx0ZVxuXHRcdFx0cGF0dGVybjogL15cXC8kLyxcblx0XHRcdHBhcnRzOiBbXG5cdFx0XHRcdHsgbmFtZTogXCJpbmRleFwiLCBmaWxlOiBcImluZGV4LnN2ZWx0ZVwiLCBjb21wb25lbnQ6IGNvbXBvbmVudF8wLCBwcmVsb2FkOiBwcmVsb2FkXzAgfVxuXHRcdFx0XVxuXHRcdH0sXG5cblx0XHR7XG5cdFx0XHQvLyBpbnRlcnZpZXdzLnN2ZWx0ZVxuXHRcdFx0cGF0dGVybjogL15cXC9pbnRlcnZpZXdzXFwvPyQvLFxuXHRcdFx0cGFydHM6IFtcblx0XHRcdFx0eyBuYW1lOiBcImludGVydmlld3NcIiwgZmlsZTogXCJpbnRlcnZpZXdzLnN2ZWx0ZVwiLCBjb21wb25lbnQ6IGNvbXBvbmVudF8xLCBwcmVsb2FkOiBwcmVsb2FkXzEgfVxuXHRcdFx0XVxuXHRcdH0sXG5cblx0XHR7XG5cdFx0XHQvLyB0ZWNobm9sb2d5LnN2ZWx0ZVxuXHRcdFx0cGF0dGVybjogL15cXC90ZWNobm9sb2d5XFwvPyQvLFxuXHRcdFx0cGFydHM6IFtcblx0XHRcdFx0eyBuYW1lOiBcInRlY2hub2xvZ3lcIiwgZmlsZTogXCJ0ZWNobm9sb2d5LnN2ZWx0ZVwiLCBjb21wb25lbnQ6IGNvbXBvbmVudF8yLCBwcmVsb2FkOiBwcmVsb2FkXzIgfVxuXHRcdFx0XVxuXHRcdH0sXG5cblx0XHR7XG5cdFx0XHQvLyB0cmF2ZWxvZ3VlLnN2ZWx0ZVxuXHRcdFx0cGF0dGVybjogL15cXC90cmF2ZWxvZ3VlXFwvPyQvLFxuXHRcdFx0cGFydHM6IFtcblx0XHRcdFx0eyBuYW1lOiBcInRyYXZlbG9ndWVcIiwgZmlsZTogXCJ0cmF2ZWxvZ3VlLnN2ZWx0ZVwiLCBjb21wb25lbnQ6IGNvbXBvbmVudF8zLCBwcmVsb2FkOiBwcmVsb2FkXzMgfVxuXHRcdFx0XVxuXHRcdH0sXG5cblx0XHR7XG5cdFx0XHQvLyBsZWFybmluZ3Muc3ZlbHRlXG5cdFx0XHRwYXR0ZXJuOiAvXlxcL2xlYXJuaW5nc1xcLz8kLyxcblx0XHRcdHBhcnRzOiBbXG5cdFx0XHRcdHsgbmFtZTogXCJsZWFybmluZ3NcIiwgZmlsZTogXCJsZWFybmluZ3Muc3ZlbHRlXCIsIGNvbXBvbmVudDogY29tcG9uZW50XzQsIHByZWxvYWQ6IHByZWxvYWRfNCB9XG5cdFx0XHRdXG5cdFx0fSxcblxuXHRcdHtcblx0XHRcdC8vIGFib3V0LnN2ZWx0ZVxuXHRcdFx0cGF0dGVybjogL15cXC9hYm91dFxcLz8kLyxcblx0XHRcdHBhcnRzOiBbXG5cdFx0XHRcdHsgbmFtZTogXCJhYm91dFwiLCBmaWxlOiBcImFib3V0LnN2ZWx0ZVwiLCBjb21wb25lbnQ6IGNvbXBvbmVudF81IH1cblx0XHRcdF1cblx0XHR9LFxuXG5cdFx0e1xuXHRcdFx0Ly8gYmxvZy9bc2x1Z10uc3ZlbHRlXG5cdFx0XHRwYXR0ZXJuOiAvXlxcL2Jsb2dcXC8oW15cXC9dKz8pXFwvPyQvLFxuXHRcdFx0cGFydHM6IFtcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0eyBuYW1lOiBcImJsb2dfJHNsdWdcIiwgZmlsZTogXCJibG9nL1tzbHVnXS5zdmVsdGVcIiwgY29tcG9uZW50OiBjb21wb25lbnRfNiwgcHJlbG9hZDogcHJlbG9hZF82LCBwYXJhbXM6IG1hdGNoID0+ICh7IHNsdWc6IGQobWF0Y2hbMV0pIH0pIH1cblx0XHRcdF1cblx0XHR9XG5cdF0sXG5cblx0cm9vdCxcblx0cm9vdF9wcmVsb2FkOiAoKSA9PiB7fSxcblx0ZXJyb3Jcbn07XG5cbmV4cG9ydCBjb25zdCBidWlsZF9kaXIgPSBcIl9fc2FwcGVyX18vZGV2XCI7XG5cbmV4cG9ydCBjb25zdCBzcmNfZGlyID0gXCJzcmNcIjtcblxuZXhwb3J0IGNvbnN0IGRldiA9IHRydWU7IiwiaW1wb3J0IHsgd3JpdGFibGUgfSBmcm9tICdzdmVsdGUvc3RvcmUnO1xuXG5leHBvcnQgY29uc3QgQ09OVEVYVF9LRVkgPSB7fTtcblxuZXhwb3J0IGNvbnN0IHByZWxvYWQgPSAoKSA9PiAoe30pOyIsIjwhLS0gVGhpcyBmaWxlIGlzIGdlbmVyYXRlZCBieSBTYXBwZXIg4oCUIGRvIG5vdCBlZGl0IGl0ISAtLT5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IHNldENvbnRleHQgfSBmcm9tICdzdmVsdGUnO1xuXHRpbXBvcnQgeyBDT05URVhUX0tFWSB9IGZyb20gJy4vc2hhcmVkJztcblx0aW1wb3J0IExheW91dCBmcm9tICcuLi8uLi8uLi9yb3V0ZXMvX2xheW91dC5zdmVsdGUnO1xuXHRpbXBvcnQgRXJyb3IgZnJvbSAnLi4vLi4vLi4vcm91dGVzL19lcnJvci5zdmVsdGUnO1xuXG5cdGV4cG9ydCBsZXQgc3RvcmVzO1xuXHRleHBvcnQgbGV0IGVycm9yO1xuXHRleHBvcnQgbGV0IHN0YXR1cztcblx0ZXhwb3J0IGxldCBzZWdtZW50cztcblx0ZXhwb3J0IGxldCBsZXZlbDA7XG5cdGV4cG9ydCBsZXQgbGV2ZWwxID0gbnVsbDtcblxuXHRzZXRDb250ZXh0KENPTlRFWFRfS0VZLCBzdG9yZXMpO1xuPC9zY3JpcHQ+XG5cbjxMYXlvdXQgc2VnbWVudD1cIntzZWdtZW50c1swXX1cIiB7Li4ubGV2ZWwwLnByb3BzfT5cblx0eyNpZiBlcnJvcn1cblx0XHQ8RXJyb3Ige2Vycm9yfSB7c3RhdHVzfS8+XG5cdHs6ZWxzZX1cblx0XHQ8c3ZlbHRlOmNvbXBvbmVudCB0aGlzPVwie2xldmVsMS5jb21wb25lbnR9XCIgey4uLmxldmVsMS5wcm9wc30vPlxuXHR7L2lmfVxuPC9MYXlvdXQ+IiwiaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGV2LCBidWlsZF9kaXIsIHNyY19kaXIsIG1hbmlmZXN0IH0gZnJvbSAnLi9pbnRlcm5hbC9tYW5pZmVzdC1zZXJ2ZXInO1xuaW1wb3J0IHsgd3JpdGFibGUgfSBmcm9tICdzdmVsdGUvc3RvcmUnO1xuaW1wb3J0IFN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQgQXBwIGZyb20gJy4vaW50ZXJuYWwvQXBwLnN2ZWx0ZSc7XG5cbi8qKlxuICogQHBhcmFtIHR5cGVNYXAgW09iamVjdF0gTWFwIG9mIE1JTUUgdHlwZSAtPiBBcnJheVtleHRlbnNpb25zXVxuICogQHBhcmFtIC4uLlxuICovXG5mdW5jdGlvbiBNaW1lKCkge1xuICB0aGlzLl90eXBlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHRoaXMuX2V4dGVuc2lvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5kZWZpbmUoYXJndW1lbnRzW2ldKTtcbiAgfVxuXG4gIHRoaXMuZGVmaW5lID0gdGhpcy5kZWZpbmUuYmluZCh0aGlzKTtcbiAgdGhpcy5nZXRUeXBlID0gdGhpcy5nZXRUeXBlLmJpbmQodGhpcyk7XG4gIHRoaXMuZ2V0RXh0ZW5zaW9uID0gdGhpcy5nZXRFeHRlbnNpb24uYmluZCh0aGlzKTtcbn1cblxuLyoqXG4gKiBEZWZpbmUgbWltZXR5cGUgLT4gZXh0ZW5zaW9uIG1hcHBpbmdzLiAgRWFjaCBrZXkgaXMgYSBtaW1lLXR5cGUgdGhhdCBtYXBzXG4gKiB0byBhbiBhcnJheSBvZiBleHRlbnNpb25zIGFzc29jaWF0ZWQgd2l0aCB0aGUgdHlwZS4gIFRoZSBmaXJzdCBleHRlbnNpb24gaXNcbiAqIHVzZWQgYXMgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciB0aGUgdHlwZS5cbiAqXG4gKiBlLmcuIG1pbWUuZGVmaW5lKHsnYXVkaW8vb2dnJywgWydvZ2EnLCAnb2dnJywgJ3NweCddfSk7XG4gKlxuICogSWYgYSB0eXBlIGRlY2xhcmVzIGFuIGV4dGVuc2lvbiB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gZGVmaW5lZCwgYW4gZXJyb3Igd2lsbFxuICogYmUgdGhyb3duLiAgVG8gc3VwcHJlc3MgdGhpcyBlcnJvciBhbmQgZm9yY2UgdGhlIGV4dGVuc2lvbiB0byBiZSBhc3NvY2lhdGVkXG4gKiB3aXRoIHRoZSBuZXcgdHlwZSwgcGFzcyBgZm9yY2VgPXRydWUuICBBbHRlcm5hdGl2ZWx5LCB5b3UgbWF5IHByZWZpeCB0aGVcbiAqIGV4dGVuc2lvbiB3aXRoIFwiKlwiIHRvIG1hcCB0aGUgdHlwZSB0byBleHRlbnNpb24sIHdpdGhvdXQgbWFwcGluZyB0aGVcbiAqIGV4dGVuc2lvbiB0byB0aGUgdHlwZS5cbiAqXG4gKiBlLmcuIG1pbWUuZGVmaW5lKHsnYXVkaW8vd2F2JywgWyd3YXYnXX0sIHsnYXVkaW8veC13YXYnLCBbJyp3YXYnXX0pO1xuICpcbiAqXG4gKiBAcGFyYW0gbWFwIChPYmplY3QpIHR5cGUgZGVmaW5pdGlvbnNcbiAqIEBwYXJhbSBmb3JjZSAoQm9vbGVhbikgaWYgdHJ1ZSwgZm9yY2Ugb3ZlcnJpZGluZyBvZiBleGlzdGluZyBkZWZpbml0aW9uc1xuICovXG5NaW1lLnByb3RvdHlwZS5kZWZpbmUgPSBmdW5jdGlvbih0eXBlTWFwLCBmb3JjZSkge1xuICBmb3IgKHZhciB0eXBlIGluIHR5cGVNYXApIHtcbiAgICB2YXIgZXh0ZW5zaW9ucyA9IHR5cGVNYXBbdHlwZV0ubWFwKGZ1bmN0aW9uKHQpIHtyZXR1cm4gdC50b0xvd2VyQ2FzZSgpfSk7XG4gICAgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXh0ZW5zaW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGV4dCA9IGV4dGVuc2lvbnNbaV07XG5cbiAgICAgIC8vICcqJyBwcmVmaXggPSBub3QgdGhlIHByZWZlcnJlZCB0eXBlIGZvciB0aGlzIGV4dGVuc2lvbi4gIFNvIGZpeHVwIHRoZVxuICAgICAgLy8gZXh0ZW5zaW9uLCBhbmQgc2tpcCBpdC5cbiAgICAgIGlmIChleHRbMF0gPT0gJyonKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWZvcmNlICYmIChleHQgaW4gdGhpcy5fdHlwZXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnQXR0ZW1wdCB0byBjaGFuZ2UgbWFwcGluZyBmb3IgXCInICsgZXh0ICtcbiAgICAgICAgICAnXCIgZXh0ZW5zaW9uIGZyb20gXCInICsgdGhpcy5fdHlwZXNbZXh0XSArICdcIiB0byBcIicgKyB0eXBlICtcbiAgICAgICAgICAnXCIuIFBhc3MgYGZvcmNlPXRydWVgIHRvIGFsbG93IHRoaXMsIG90aGVyd2lzZSByZW1vdmUgXCInICsgZXh0ICtcbiAgICAgICAgICAnXCIgZnJvbSB0aGUgbGlzdCBvZiBleHRlbnNpb25zIGZvciBcIicgKyB0eXBlICsgJ1wiLidcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fdHlwZXNbZXh0XSA9IHR5cGU7XG4gICAgfVxuXG4gICAgLy8gVXNlIGZpcnN0IGV4dGVuc2lvbiBhcyBkZWZhdWx0XG4gICAgaWYgKGZvcmNlIHx8ICF0aGlzLl9leHRlbnNpb25zW3R5cGVdKSB7XG4gICAgICB2YXIgZXh0ID0gZXh0ZW5zaW9uc1swXTtcbiAgICAgIHRoaXMuX2V4dGVuc2lvbnNbdHlwZV0gPSAoZXh0WzBdICE9ICcqJykgPyBleHQgOiBleHQuc3Vic3RyKDEpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBMb29rdXAgYSBtaW1lIHR5cGUgYmFzZWQgb24gZXh0ZW5zaW9uXG4gKi9cbk1pbWUucHJvdG90eXBlLmdldFR5cGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHBhdGggPSBTdHJpbmcocGF0aCk7XG4gIHZhciBsYXN0ID0gcGF0aC5yZXBsYWNlKC9eLipbL1xcXFxdLywgJycpLnRvTG93ZXJDYXNlKCk7XG4gIHZhciBleHQgPSBsYXN0LnJlcGxhY2UoL14uKlxcLi8sICcnKS50b0xvd2VyQ2FzZSgpO1xuXG4gIHZhciBoYXNQYXRoID0gbGFzdC5sZW5ndGggPCBwYXRoLmxlbmd0aDtcbiAgdmFyIGhhc0RvdCA9IGV4dC5sZW5ndGggPCBsYXN0Lmxlbmd0aCAtIDE7XG5cbiAgcmV0dXJuIChoYXNEb3QgfHwgIWhhc1BhdGgpICYmIHRoaXMuX3R5cGVzW2V4dF0gfHwgbnVsbDtcbn07XG5cbi8qKlxuICogUmV0dXJuIGZpbGUgZXh0ZW5zaW9uIGFzc29jaWF0ZWQgd2l0aCBhIG1pbWUgdHlwZVxuICovXG5NaW1lLnByb3RvdHlwZS5nZXRFeHRlbnNpb24gPSBmdW5jdGlvbih0eXBlKSB7XG4gIHR5cGUgPSAvXlxccyooW147XFxzXSopLy50ZXN0KHR5cGUpICYmIFJlZ0V4cC4kMTtcbiAgcmV0dXJuIHR5cGUgJiYgdGhpcy5fZXh0ZW5zaW9uc1t0eXBlLnRvTG93ZXJDYXNlKCldIHx8IG51bGw7XG59O1xuXG52YXIgTWltZV8xID0gTWltZTtcblxudmFyIHN0YW5kYXJkID0ge1wiYXBwbGljYXRpb24vYW5kcmV3LWluc2V0XCI6W1wiZXpcIl0sXCJhcHBsaWNhdGlvbi9hcHBsaXh3YXJlXCI6W1wiYXdcIl0sXCJhcHBsaWNhdGlvbi9hdG9tK3htbFwiOltcImF0b21cIl0sXCJhcHBsaWNhdGlvbi9hdG9tY2F0K3htbFwiOltcImF0b21jYXRcIl0sXCJhcHBsaWNhdGlvbi9hdG9tc3ZjK3htbFwiOltcImF0b21zdmNcIl0sXCJhcHBsaWNhdGlvbi9iZG9jXCI6W1wiYmRvY1wiXSxcImFwcGxpY2F0aW9uL2NjeG1sK3htbFwiOltcImNjeG1sXCJdLFwiYXBwbGljYXRpb24vY2RtaS1jYXBhYmlsaXR5XCI6W1wiY2RtaWFcIl0sXCJhcHBsaWNhdGlvbi9jZG1pLWNvbnRhaW5lclwiOltcImNkbWljXCJdLFwiYXBwbGljYXRpb24vY2RtaS1kb21haW5cIjpbXCJjZG1pZFwiXSxcImFwcGxpY2F0aW9uL2NkbWktb2JqZWN0XCI6W1wiY2RtaW9cIl0sXCJhcHBsaWNhdGlvbi9jZG1pLXF1ZXVlXCI6W1wiY2RtaXFcIl0sXCJhcHBsaWNhdGlvbi9jdS1zZWVtZVwiOltcImN1XCJdLFwiYXBwbGljYXRpb24vZGFzaCt4bWxcIjpbXCJtcGRcIl0sXCJhcHBsaWNhdGlvbi9kYXZtb3VudCt4bWxcIjpbXCJkYXZtb3VudFwiXSxcImFwcGxpY2F0aW9uL2RvY2Jvb2sreG1sXCI6W1wiZGJrXCJdLFwiYXBwbGljYXRpb24vZHNzYytkZXJcIjpbXCJkc3NjXCJdLFwiYXBwbGljYXRpb24vZHNzYyt4bWxcIjpbXCJ4ZHNzY1wiXSxcImFwcGxpY2F0aW9uL2VjbWFzY3JpcHRcIjpbXCJlY21hXCIsXCJlc1wiXSxcImFwcGxpY2F0aW9uL2VtbWEreG1sXCI6W1wiZW1tYVwiXSxcImFwcGxpY2F0aW9uL2VwdWIremlwXCI6W1wiZXB1YlwiXSxcImFwcGxpY2F0aW9uL2V4aVwiOltcImV4aVwiXSxcImFwcGxpY2F0aW9uL2ZvbnQtdGRwZnJcIjpbXCJwZnJcIl0sXCJhcHBsaWNhdGlvbi9nZW8ranNvblwiOltcImdlb2pzb25cIl0sXCJhcHBsaWNhdGlvbi9nbWwreG1sXCI6W1wiZ21sXCJdLFwiYXBwbGljYXRpb24vZ3B4K3htbFwiOltcImdweFwiXSxcImFwcGxpY2F0aW9uL2d4ZlwiOltcImd4ZlwiXSxcImFwcGxpY2F0aW9uL2d6aXBcIjpbXCJnelwiXSxcImFwcGxpY2F0aW9uL2hqc29uXCI6W1wiaGpzb25cIl0sXCJhcHBsaWNhdGlvbi9oeXBlcnN0dWRpb1wiOltcInN0a1wiXSxcImFwcGxpY2F0aW9uL2lua21sK3htbFwiOltcImlua1wiLFwiaW5rbWxcIl0sXCJhcHBsaWNhdGlvbi9pcGZpeFwiOltcImlwZml4XCJdLFwiYXBwbGljYXRpb24vamF2YS1hcmNoaXZlXCI6W1wiamFyXCIsXCJ3YXJcIixcImVhclwiXSxcImFwcGxpY2F0aW9uL2phdmEtc2VyaWFsaXplZC1vYmplY3RcIjpbXCJzZXJcIl0sXCJhcHBsaWNhdGlvbi9qYXZhLXZtXCI6W1wiY2xhc3NcIl0sXCJhcHBsaWNhdGlvbi9qYXZhc2NyaXB0XCI6W1wianNcIixcIm1qc1wiXSxcImFwcGxpY2F0aW9uL2pzb25cIjpbXCJqc29uXCIsXCJtYXBcIl0sXCJhcHBsaWNhdGlvbi9qc29uNVwiOltcImpzb241XCJdLFwiYXBwbGljYXRpb24vanNvbm1sK2pzb25cIjpbXCJqc29ubWxcIl0sXCJhcHBsaWNhdGlvbi9sZCtqc29uXCI6W1wianNvbmxkXCJdLFwiYXBwbGljYXRpb24vbG9zdCt4bWxcIjpbXCJsb3N0eG1sXCJdLFwiYXBwbGljYXRpb24vbWFjLWJpbmhleDQwXCI6W1wiaHF4XCJdLFwiYXBwbGljYXRpb24vbWFjLWNvbXBhY3Rwcm9cIjpbXCJjcHRcIl0sXCJhcHBsaWNhdGlvbi9tYWRzK3htbFwiOltcIm1hZHNcIl0sXCJhcHBsaWNhdGlvbi9tYW5pZmVzdCtqc29uXCI6W1wid2VibWFuaWZlc3RcIl0sXCJhcHBsaWNhdGlvbi9tYXJjXCI6W1wibXJjXCJdLFwiYXBwbGljYXRpb24vbWFyY3htbCt4bWxcIjpbXCJtcmN4XCJdLFwiYXBwbGljYXRpb24vbWF0aGVtYXRpY2FcIjpbXCJtYVwiLFwibmJcIixcIm1iXCJdLFwiYXBwbGljYXRpb24vbWF0aG1sK3htbFwiOltcIm1hdGhtbFwiXSxcImFwcGxpY2F0aW9uL21ib3hcIjpbXCJtYm94XCJdLFwiYXBwbGljYXRpb24vbWVkaWFzZXJ2ZXJjb250cm9sK3htbFwiOltcIm1zY21sXCJdLFwiYXBwbGljYXRpb24vbWV0YWxpbmsreG1sXCI6W1wibWV0YWxpbmtcIl0sXCJhcHBsaWNhdGlvbi9tZXRhbGluazQreG1sXCI6W1wibWV0YTRcIl0sXCJhcHBsaWNhdGlvbi9tZXRzK3htbFwiOltcIm1ldHNcIl0sXCJhcHBsaWNhdGlvbi9tb2RzK3htbFwiOltcIm1vZHNcIl0sXCJhcHBsaWNhdGlvbi9tcDIxXCI6W1wibTIxXCIsXCJtcDIxXCJdLFwiYXBwbGljYXRpb24vbXA0XCI6W1wibXA0c1wiLFwibTRwXCJdLFwiYXBwbGljYXRpb24vbXN3b3JkXCI6W1wiZG9jXCIsXCJkb3RcIl0sXCJhcHBsaWNhdGlvbi9teGZcIjpbXCJteGZcIl0sXCJhcHBsaWNhdGlvbi9uLXF1YWRzXCI6W1wibnFcIl0sXCJhcHBsaWNhdGlvbi9uLXRyaXBsZXNcIjpbXCJudFwiXSxcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiOltcImJpblwiLFwiZG1zXCIsXCJscmZcIixcIm1hclwiLFwic29cIixcImRpc3RcIixcImRpc3R6XCIsXCJwa2dcIixcImJwa1wiLFwiZHVtcFwiLFwiZWxjXCIsXCJkZXBsb3lcIixcImV4ZVwiLFwiZGxsXCIsXCJkZWJcIixcImRtZ1wiLFwiaXNvXCIsXCJpbWdcIixcIm1zaVwiLFwibXNwXCIsXCJtc21cIixcImJ1ZmZlclwiXSxcImFwcGxpY2F0aW9uL29kYVwiOltcIm9kYVwiXSxcImFwcGxpY2F0aW9uL29lYnBzLXBhY2thZ2UreG1sXCI6W1wib3BmXCJdLFwiYXBwbGljYXRpb24vb2dnXCI6W1wib2d4XCJdLFwiYXBwbGljYXRpb24vb21kb2MreG1sXCI6W1wib21kb2NcIl0sXCJhcHBsaWNhdGlvbi9vbmVub3RlXCI6W1wib25ldG9jXCIsXCJvbmV0b2MyXCIsXCJvbmV0bXBcIixcIm9uZXBrZ1wiXSxcImFwcGxpY2F0aW9uL294cHNcIjpbXCJveHBzXCJdLFwiYXBwbGljYXRpb24vcGF0Y2gtb3BzLWVycm9yK3htbFwiOltcInhlclwiXSxcImFwcGxpY2F0aW9uL3BkZlwiOltcInBkZlwiXSxcImFwcGxpY2F0aW9uL3BncC1lbmNyeXB0ZWRcIjpbXCJwZ3BcIl0sXCJhcHBsaWNhdGlvbi9wZ3Atc2lnbmF0dXJlXCI6W1wiYXNjXCIsXCJzaWdcIl0sXCJhcHBsaWNhdGlvbi9waWNzLXJ1bGVzXCI6W1wicHJmXCJdLFwiYXBwbGljYXRpb24vcGtjczEwXCI6W1wicDEwXCJdLFwiYXBwbGljYXRpb24vcGtjczctbWltZVwiOltcInA3bVwiLFwicDdjXCJdLFwiYXBwbGljYXRpb24vcGtjczctc2lnbmF0dXJlXCI6W1wicDdzXCJdLFwiYXBwbGljYXRpb24vcGtjczhcIjpbXCJwOFwiXSxcImFwcGxpY2F0aW9uL3BraXgtYXR0ci1jZXJ0XCI6W1wiYWNcIl0sXCJhcHBsaWNhdGlvbi9wa2l4LWNlcnRcIjpbXCJjZXJcIl0sXCJhcHBsaWNhdGlvbi9wa2l4LWNybFwiOltcImNybFwiXSxcImFwcGxpY2F0aW9uL3BraXgtcGtpcGF0aFwiOltcInBraXBhdGhcIl0sXCJhcHBsaWNhdGlvbi9wa2l4Y21wXCI6W1wicGtpXCJdLFwiYXBwbGljYXRpb24vcGxzK3htbFwiOltcInBsc1wiXSxcImFwcGxpY2F0aW9uL3Bvc3RzY3JpcHRcIjpbXCJhaVwiLFwiZXBzXCIsXCJwc1wiXSxcImFwcGxpY2F0aW9uL3Bza2MreG1sXCI6W1wicHNrY3htbFwiXSxcImFwcGxpY2F0aW9uL3JhbWwreWFtbFwiOltcInJhbWxcIl0sXCJhcHBsaWNhdGlvbi9yZGYreG1sXCI6W1wicmRmXCIsXCJvd2xcIl0sXCJhcHBsaWNhdGlvbi9yZWdpbmZvK3htbFwiOltcInJpZlwiXSxcImFwcGxpY2F0aW9uL3JlbGF4LW5nLWNvbXBhY3Qtc3ludGF4XCI6W1wicm5jXCJdLFwiYXBwbGljYXRpb24vcmVzb3VyY2UtbGlzdHMreG1sXCI6W1wicmxcIl0sXCJhcHBsaWNhdGlvbi9yZXNvdXJjZS1saXN0cy1kaWZmK3htbFwiOltcInJsZFwiXSxcImFwcGxpY2F0aW9uL3Jscy1zZXJ2aWNlcyt4bWxcIjpbXCJyc1wiXSxcImFwcGxpY2F0aW9uL3Jwa2ktZ2hvc3RidXN0ZXJzXCI6W1wiZ2JyXCJdLFwiYXBwbGljYXRpb24vcnBraS1tYW5pZmVzdFwiOltcIm1mdFwiXSxcImFwcGxpY2F0aW9uL3Jwa2ktcm9hXCI6W1wicm9hXCJdLFwiYXBwbGljYXRpb24vcnNkK3htbFwiOltcInJzZFwiXSxcImFwcGxpY2F0aW9uL3Jzcyt4bWxcIjpbXCJyc3NcIl0sXCJhcHBsaWNhdGlvbi9ydGZcIjpbXCJydGZcIl0sXCJhcHBsaWNhdGlvbi9zYm1sK3htbFwiOltcInNibWxcIl0sXCJhcHBsaWNhdGlvbi9zY3ZwLWN2LXJlcXVlc3RcIjpbXCJzY3FcIl0sXCJhcHBsaWNhdGlvbi9zY3ZwLWN2LXJlc3BvbnNlXCI6W1wic2NzXCJdLFwiYXBwbGljYXRpb24vc2N2cC12cC1yZXF1ZXN0XCI6W1wic3BxXCJdLFwiYXBwbGljYXRpb24vc2N2cC12cC1yZXNwb25zZVwiOltcInNwcFwiXSxcImFwcGxpY2F0aW9uL3NkcFwiOltcInNkcFwiXSxcImFwcGxpY2F0aW9uL3NldC1wYXltZW50LWluaXRpYXRpb25cIjpbXCJzZXRwYXlcIl0sXCJhcHBsaWNhdGlvbi9zZXQtcmVnaXN0cmF0aW9uLWluaXRpYXRpb25cIjpbXCJzZXRyZWdcIl0sXCJhcHBsaWNhdGlvbi9zaGYreG1sXCI6W1wic2hmXCJdLFwiYXBwbGljYXRpb24vc2lldmVcIjpbXCJzaXZcIixcInNpZXZlXCJdLFwiYXBwbGljYXRpb24vc21pbCt4bWxcIjpbXCJzbWlcIixcInNtaWxcIl0sXCJhcHBsaWNhdGlvbi9zcGFycWwtcXVlcnlcIjpbXCJycVwiXSxcImFwcGxpY2F0aW9uL3NwYXJxbC1yZXN1bHRzK3htbFwiOltcInNyeFwiXSxcImFwcGxpY2F0aW9uL3NyZ3NcIjpbXCJncmFtXCJdLFwiYXBwbGljYXRpb24vc3Jncyt4bWxcIjpbXCJncnhtbFwiXSxcImFwcGxpY2F0aW9uL3NydSt4bWxcIjpbXCJzcnVcIl0sXCJhcHBsaWNhdGlvbi9zc2RsK3htbFwiOltcInNzZGxcIl0sXCJhcHBsaWNhdGlvbi9zc21sK3htbFwiOltcInNzbWxcIl0sXCJhcHBsaWNhdGlvbi90ZWkreG1sXCI6W1widGVpXCIsXCJ0ZWljb3JwdXNcIl0sXCJhcHBsaWNhdGlvbi90aHJhdWQreG1sXCI6W1widGZpXCJdLFwiYXBwbGljYXRpb24vdGltZXN0YW1wZWQtZGF0YVwiOltcInRzZFwiXSxcImFwcGxpY2F0aW9uL3ZvaWNleG1sK3htbFwiOltcInZ4bWxcIl0sXCJhcHBsaWNhdGlvbi93YXNtXCI6W1wid2FzbVwiXSxcImFwcGxpY2F0aW9uL3dpZGdldFwiOltcIndndFwiXSxcImFwcGxpY2F0aW9uL3dpbmhscFwiOltcImhscFwiXSxcImFwcGxpY2F0aW9uL3dzZGwreG1sXCI6W1wid3NkbFwiXSxcImFwcGxpY2F0aW9uL3dzcG9saWN5K3htbFwiOltcIndzcG9saWN5XCJdLFwiYXBwbGljYXRpb24veGFtbCt4bWxcIjpbXCJ4YW1sXCJdLFwiYXBwbGljYXRpb24veGNhcC1kaWZmK3htbFwiOltcInhkZlwiXSxcImFwcGxpY2F0aW9uL3hlbmMreG1sXCI6W1wieGVuY1wiXSxcImFwcGxpY2F0aW9uL3hodG1sK3htbFwiOltcInhodG1sXCIsXCJ4aHRcIl0sXCJhcHBsaWNhdGlvbi94bWxcIjpbXCJ4bWxcIixcInhzbFwiLFwieHNkXCIsXCJybmdcIl0sXCJhcHBsaWNhdGlvbi94bWwtZHRkXCI6W1wiZHRkXCJdLFwiYXBwbGljYXRpb24veG9wK3htbFwiOltcInhvcFwiXSxcImFwcGxpY2F0aW9uL3hwcm9jK3htbFwiOltcInhwbFwiXSxcImFwcGxpY2F0aW9uL3hzbHQreG1sXCI6W1wieHNsdFwiXSxcImFwcGxpY2F0aW9uL3hzcGYreG1sXCI6W1wieHNwZlwiXSxcImFwcGxpY2F0aW9uL3h2K3htbFwiOltcIm14bWxcIixcInhodm1sXCIsXCJ4dm1sXCIsXCJ4dm1cIl0sXCJhcHBsaWNhdGlvbi95YW5nXCI6W1wieWFuZ1wiXSxcImFwcGxpY2F0aW9uL3lpbit4bWxcIjpbXCJ5aW5cIl0sXCJhcHBsaWNhdGlvbi96aXBcIjpbXCJ6aXBcIl0sXCJhdWRpby8zZ3BwXCI6W1wiKjNncHBcIl0sXCJhdWRpby9hZHBjbVwiOltcImFkcFwiXSxcImF1ZGlvL2Jhc2ljXCI6W1wiYXVcIixcInNuZFwiXSxcImF1ZGlvL21pZGlcIjpbXCJtaWRcIixcIm1pZGlcIixcImthclwiLFwicm1pXCJdLFwiYXVkaW8vbXAzXCI6W1wiKm1wM1wiXSxcImF1ZGlvL21wNFwiOltcIm00YVwiLFwibXA0YVwiXSxcImF1ZGlvL21wZWdcIjpbXCJtcGdhXCIsXCJtcDJcIixcIm1wMmFcIixcIm1wM1wiLFwibTJhXCIsXCJtM2FcIl0sXCJhdWRpby9vZ2dcIjpbXCJvZ2FcIixcIm9nZ1wiLFwic3B4XCJdLFwiYXVkaW8vczNtXCI6W1wiczNtXCJdLFwiYXVkaW8vc2lsa1wiOltcInNpbFwiXSxcImF1ZGlvL3dhdlwiOltcIndhdlwiXSxcImF1ZGlvL3dhdmVcIjpbXCIqd2F2XCJdLFwiYXVkaW8vd2VibVwiOltcIndlYmFcIl0sXCJhdWRpby94bVwiOltcInhtXCJdLFwiZm9udC9jb2xsZWN0aW9uXCI6W1widHRjXCJdLFwiZm9udC9vdGZcIjpbXCJvdGZcIl0sXCJmb250L3R0ZlwiOltcInR0ZlwiXSxcImZvbnQvd29mZlwiOltcIndvZmZcIl0sXCJmb250L3dvZmYyXCI6W1wid29mZjJcIl0sXCJpbWFnZS9hY2VzXCI6W1wiZXhyXCJdLFwiaW1hZ2UvYXBuZ1wiOltcImFwbmdcIl0sXCJpbWFnZS9ibXBcIjpbXCJibXBcIl0sXCJpbWFnZS9jZ21cIjpbXCJjZ21cIl0sXCJpbWFnZS9kaWNvbS1ybGVcIjpbXCJkcmxlXCJdLFwiaW1hZ2UvZW1mXCI6W1wiZW1mXCJdLFwiaW1hZ2UvZml0c1wiOltcImZpdHNcIl0sXCJpbWFnZS9nM2ZheFwiOltcImczXCJdLFwiaW1hZ2UvZ2lmXCI6W1wiZ2lmXCJdLFwiaW1hZ2UvaGVpY1wiOltcImhlaWNcIl0sXCJpbWFnZS9oZWljLXNlcXVlbmNlXCI6W1wiaGVpY3NcIl0sXCJpbWFnZS9oZWlmXCI6W1wiaGVpZlwiXSxcImltYWdlL2hlaWYtc2VxdWVuY2VcIjpbXCJoZWlmc1wiXSxcImltYWdlL2llZlwiOltcImllZlwiXSxcImltYWdlL2psc1wiOltcImpsc1wiXSxcImltYWdlL2pwMlwiOltcImpwMlwiLFwianBnMlwiXSxcImltYWdlL2pwZWdcIjpbXCJqcGVnXCIsXCJqcGdcIixcImpwZVwiXSxcImltYWdlL2pwbVwiOltcImpwbVwiXSxcImltYWdlL2pweFwiOltcImpweFwiLFwianBmXCJdLFwiaW1hZ2UvanhyXCI6W1wianhyXCJdLFwiaW1hZ2Uva3R4XCI6W1wia3R4XCJdLFwiaW1hZ2UvcG5nXCI6W1wicG5nXCJdLFwiaW1hZ2Uvc2dpXCI6W1wic2dpXCJdLFwiaW1hZ2Uvc3ZnK3htbFwiOltcInN2Z1wiLFwic3ZnelwiXSxcImltYWdlL3QzOFwiOltcInQzOFwiXSxcImltYWdlL3RpZmZcIjpbXCJ0aWZcIixcInRpZmZcIl0sXCJpbWFnZS90aWZmLWZ4XCI6W1widGZ4XCJdLFwiaW1hZ2Uvd2VicFwiOltcIndlYnBcIl0sXCJpbWFnZS93bWZcIjpbXCJ3bWZcIl0sXCJtZXNzYWdlL2Rpc3Bvc2l0aW9uLW5vdGlmaWNhdGlvblwiOltcImRpc3Bvc2l0aW9uLW5vdGlmaWNhdGlvblwiXSxcIm1lc3NhZ2UvZ2xvYmFsXCI6W1widThtc2dcIl0sXCJtZXNzYWdlL2dsb2JhbC1kZWxpdmVyeS1zdGF0dXNcIjpbXCJ1OGRzblwiXSxcIm1lc3NhZ2UvZ2xvYmFsLWRpc3Bvc2l0aW9uLW5vdGlmaWNhdGlvblwiOltcInU4bWRuXCJdLFwibWVzc2FnZS9nbG9iYWwtaGVhZGVyc1wiOltcInU4aGRyXCJdLFwibWVzc2FnZS9yZmM4MjJcIjpbXCJlbWxcIixcIm1pbWVcIl0sXCJtb2RlbC8zbWZcIjpbXCIzbWZcIl0sXCJtb2RlbC9nbHRmK2pzb25cIjpbXCJnbHRmXCJdLFwibW9kZWwvZ2x0Zi1iaW5hcnlcIjpbXCJnbGJcIl0sXCJtb2RlbC9pZ2VzXCI6W1wiaWdzXCIsXCJpZ2VzXCJdLFwibW9kZWwvbWVzaFwiOltcIm1zaFwiLFwibWVzaFwiLFwic2lsb1wiXSxcIm1vZGVsL3N0bFwiOltcInN0bFwiXSxcIm1vZGVsL3ZybWxcIjpbXCJ3cmxcIixcInZybWxcIl0sXCJtb2RlbC94M2QrYmluYXJ5XCI6W1wiKngzZGJcIixcIngzZGJ6XCJdLFwibW9kZWwveDNkK2Zhc3RpbmZvc2V0XCI6W1wieDNkYlwiXSxcIm1vZGVsL3gzZCt2cm1sXCI6W1wiKngzZHZcIixcIngzZHZ6XCJdLFwibW9kZWwveDNkK3htbFwiOltcIngzZFwiLFwieDNkelwiXSxcIm1vZGVsL3gzZC12cm1sXCI6W1wieDNkdlwiXSxcInRleHQvY2FjaGUtbWFuaWZlc3RcIjpbXCJhcHBjYWNoZVwiLFwibWFuaWZlc3RcIl0sXCJ0ZXh0L2NhbGVuZGFyXCI6W1wiaWNzXCIsXCJpZmJcIl0sXCJ0ZXh0L2NvZmZlZXNjcmlwdFwiOltcImNvZmZlZVwiLFwibGl0Y29mZmVlXCJdLFwidGV4dC9jc3NcIjpbXCJjc3NcIl0sXCJ0ZXh0L2NzdlwiOltcImNzdlwiXSxcInRleHQvaHRtbFwiOltcImh0bWxcIixcImh0bVwiLFwic2h0bWxcIl0sXCJ0ZXh0L2phZGVcIjpbXCJqYWRlXCJdLFwidGV4dC9qc3hcIjpbXCJqc3hcIl0sXCJ0ZXh0L2xlc3NcIjpbXCJsZXNzXCJdLFwidGV4dC9tYXJrZG93blwiOltcIm1hcmtkb3duXCIsXCJtZFwiXSxcInRleHQvbWF0aG1sXCI6W1wibW1sXCJdLFwidGV4dC9tZHhcIjpbXCJtZHhcIl0sXCJ0ZXh0L24zXCI6W1wibjNcIl0sXCJ0ZXh0L3BsYWluXCI6W1widHh0XCIsXCJ0ZXh0XCIsXCJjb25mXCIsXCJkZWZcIixcImxpc3RcIixcImxvZ1wiLFwiaW5cIixcImluaVwiXSxcInRleHQvcmljaHRleHRcIjpbXCJydHhcIl0sXCJ0ZXh0L3J0ZlwiOltcIipydGZcIl0sXCJ0ZXh0L3NnbWxcIjpbXCJzZ21sXCIsXCJzZ21cIl0sXCJ0ZXh0L3NoZXhcIjpbXCJzaGV4XCJdLFwidGV4dC9zbGltXCI6W1wic2xpbVwiLFwic2xtXCJdLFwidGV4dC9zdHlsdXNcIjpbXCJzdHlsdXNcIixcInN0eWxcIl0sXCJ0ZXh0L3RhYi1zZXBhcmF0ZWQtdmFsdWVzXCI6W1widHN2XCJdLFwidGV4dC90cm9mZlwiOltcInRcIixcInRyXCIsXCJyb2ZmXCIsXCJtYW5cIixcIm1lXCIsXCJtc1wiXSxcInRleHQvdHVydGxlXCI6W1widHRsXCJdLFwidGV4dC91cmktbGlzdFwiOltcInVyaVwiLFwidXJpc1wiLFwidXJsc1wiXSxcInRleHQvdmNhcmRcIjpbXCJ2Y2FyZFwiXSxcInRleHQvdnR0XCI6W1widnR0XCJdLFwidGV4dC94bWxcIjpbXCIqeG1sXCJdLFwidGV4dC95YW1sXCI6W1wieWFtbFwiLFwieW1sXCJdLFwidmlkZW8vM2dwcFwiOltcIjNncFwiLFwiM2dwcFwiXSxcInZpZGVvLzNncHAyXCI6W1wiM2cyXCJdLFwidmlkZW8vaDI2MVwiOltcImgyNjFcIl0sXCJ2aWRlby9oMjYzXCI6W1wiaDI2M1wiXSxcInZpZGVvL2gyNjRcIjpbXCJoMjY0XCJdLFwidmlkZW8vanBlZ1wiOltcImpwZ3ZcIl0sXCJ2aWRlby9qcG1cIjpbXCIqanBtXCIsXCJqcGdtXCJdLFwidmlkZW8vbWoyXCI6W1wibWoyXCIsXCJtanAyXCJdLFwidmlkZW8vbXAydFwiOltcInRzXCJdLFwidmlkZW8vbXA0XCI6W1wibXA0XCIsXCJtcDR2XCIsXCJtcGc0XCJdLFwidmlkZW8vbXBlZ1wiOltcIm1wZWdcIixcIm1wZ1wiLFwibXBlXCIsXCJtMXZcIixcIm0ydlwiXSxcInZpZGVvL29nZ1wiOltcIm9ndlwiXSxcInZpZGVvL3F1aWNrdGltZVwiOltcInF0XCIsXCJtb3ZcIl0sXCJ2aWRlby93ZWJtXCI6W1wid2VibVwiXX07XG5cbnZhciBsaXRlID0gbmV3IE1pbWVfMShzdGFuZGFyZCk7XG5cbmZ1bmN0aW9uIGdldF9zZXJ2ZXJfcm91dGVfaGFuZGxlcihyb3V0ZXMpIHtcblx0YXN5bmMgZnVuY3Rpb24gaGFuZGxlX3JvdXRlKHJvdXRlLCByZXEsIHJlcywgbmV4dCkge1xuXHRcdHJlcS5wYXJhbXMgPSByb3V0ZS5wYXJhbXMocm91dGUucGF0dGVybi5leGVjKHJlcS5wYXRoKSk7XG5cblx0XHRjb25zdCBtZXRob2QgPSByZXEubWV0aG9kLnRvTG93ZXJDYXNlKCk7XG5cdFx0Ly8gJ2RlbGV0ZScgY2Fubm90IGJlIGV4cG9ydGVkIGZyb20gYSBtb2R1bGUgYmVjYXVzZSBpdCBpcyBhIGtleXdvcmQsXG5cdFx0Ly8gc28gY2hlY2sgZm9yICdkZWwnIGluc3RlYWRcblx0XHRjb25zdCBtZXRob2RfZXhwb3J0ID0gbWV0aG9kID09PSAnZGVsZXRlJyA/ICdkZWwnIDogbWV0aG9kO1xuXHRcdGNvbnN0IGhhbmRsZV9tZXRob2QgPSByb3V0ZS5oYW5kbGVyc1ttZXRob2RfZXhwb3J0XTtcblx0XHRpZiAoaGFuZGxlX21ldGhvZCkge1xuXHRcdFx0aWYgKHByb2Nlc3MuZW52LlNBUFBFUl9FWFBPUlQpIHtcblx0XHRcdFx0Y29uc3QgeyB3cml0ZSwgZW5kLCBzZXRIZWFkZXIgfSA9IHJlcztcblx0XHRcdFx0Y29uc3QgY2h1bmtzID0gW107XG5cdFx0XHRcdGNvbnN0IGhlYWRlcnMgPSB7fTtcblxuXHRcdFx0XHQvLyBpbnRlcmNlcHQgZGF0YSBzbyB0aGF0IGl0IGNhbiBiZSBleHBvcnRlZFxuXHRcdFx0XHRyZXMud3JpdGUgPSBmdW5jdGlvbihjaHVuaykge1xuXHRcdFx0XHRcdGNodW5rcy5wdXNoKEJ1ZmZlci5mcm9tKGNodW5rKSk7XG5cdFx0XHRcdFx0d3JpdGUuYXBwbHkocmVzLCBhcmd1bWVudHMpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuXHRcdFx0XHRcdGhlYWRlcnNbbmFtZS50b0xvd2VyQ2FzZSgpXSA9IHZhbHVlO1xuXHRcdFx0XHRcdHNldEhlYWRlci5hcHBseShyZXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0cmVzLmVuZCA9IGZ1bmN0aW9uKGNodW5rKSB7XG5cdFx0XHRcdFx0aWYgKGNodW5rKSBjaHVua3MucHVzaChCdWZmZXIuZnJvbShjaHVuaykpO1xuXHRcdFx0XHRcdGVuZC5hcHBseShyZXMsIGFyZ3VtZW50cyk7XG5cblx0XHRcdFx0XHRwcm9jZXNzLnNlbmQoe1xuXHRcdFx0XHRcdFx0X19zYXBwZXJfXzogdHJ1ZSxcblx0XHRcdFx0XHRcdGV2ZW50OiAnZmlsZScsXG5cdFx0XHRcdFx0XHR1cmw6IHJlcS51cmwsXG5cdFx0XHRcdFx0XHRtZXRob2Q6IHJlcS5tZXRob2QsXG5cdFx0XHRcdFx0XHRzdGF0dXM6IHJlcy5zdGF0dXNDb2RlLFxuXHRcdFx0XHRcdFx0dHlwZTogaGVhZGVyc1snY29udGVudC10eXBlJ10sXG5cdFx0XHRcdFx0XHRib2R5OiBCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBoYW5kbGVfbmV4dCA9IChlcnIpID0+IHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuXHRcdFx0XHRcdHJlcy5lbmQoZXJyLm1lc3NhZ2UpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHByb2Nlc3MubmV4dFRpY2sobmV4dCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGF3YWl0IGhhbmRsZV9tZXRob2QocmVxLCByZXMsIGhhbmRsZV9uZXh0KTtcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cdFx0XHRcdGhhbmRsZV9uZXh0KGVycik7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIG5vIG1hdGNoaW5nIGhhbmRsZXIgZm9yIG1ldGhvZFxuXHRcdFx0cHJvY2Vzcy5uZXh0VGljayhuZXh0KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZnVuY3Rpb24gZmluZF9yb3V0ZShyZXEsIHJlcywgbmV4dCkge1xuXHRcdGZvciAoY29uc3Qgcm91dGUgb2Ygcm91dGVzKSB7XG5cdFx0XHRpZiAocm91dGUucGF0dGVybi50ZXN0KHJlcS5wYXRoKSkge1xuXHRcdFx0XHRoYW5kbGVfcm91dGUocm91dGUsIHJlcSwgcmVzLCBuZXh0KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdG5leHQoKTtcblx0fTtcbn1cblxuLyohXG4gKiBjb29raWVcbiAqIENvcHlyaWdodChjKSAyMDEyLTIwMTQgUm9tYW4gU2h0eWxtYW5cbiAqIENvcHlyaWdodChjKSAyMDE1IERvdWdsYXMgQ2hyaXN0b3BoZXIgV2lsc29uXG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICogQHB1YmxpY1xuICovXG5cbnZhciBwYXJzZV8xID0gcGFyc2U7XG52YXIgc2VyaWFsaXplXzEgPSBzZXJpYWxpemU7XG5cbi8qKlxuICogTW9kdWxlIHZhcmlhYmxlcy5cbiAqIEBwcml2YXRlXG4gKi9cblxudmFyIGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudDtcbnZhciBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQ7XG52YXIgcGFpclNwbGl0UmVnRXhwID0gLzsgKi87XG5cbi8qKlxuICogUmVnRXhwIHRvIG1hdGNoIGZpZWxkLWNvbnRlbnQgaW4gUkZDIDcyMzAgc2VjIDMuMlxuICpcbiAqIGZpZWxkLWNvbnRlbnQgPSBmaWVsZC12Y2hhciBbIDEqKCBTUCAvIEhUQUIgKSBmaWVsZC12Y2hhciBdXG4gKiBmaWVsZC12Y2hhciAgID0gVkNIQVIgLyBvYnMtdGV4dFxuICogb2JzLXRleHQgICAgICA9ICV4ODAtRkZcbiAqL1xuXG52YXIgZmllbGRDb250ZW50UmVnRXhwID0gL15bXFx1MDAwOVxcdTAwMjAtXFx1MDA3ZVxcdTAwODAtXFx1MDBmZl0rJC87XG5cbi8qKlxuICogUGFyc2UgYSBjb29raWUgaGVhZGVyLlxuICpcbiAqIFBhcnNlIHRoZSBnaXZlbiBjb29raWUgaGVhZGVyIHN0cmluZyBpbnRvIGFuIG9iamVjdFxuICogVGhlIG9iamVjdCBoYXMgdGhlIHZhcmlvdXMgY29va2llcyBhcyBrZXlzKG5hbWVzKSA9PiB2YWx1ZXNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyXG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gKiBAcmV0dXJuIHtvYmplY3R9XG4gKiBAcHVibGljXG4gKi9cblxuZnVuY3Rpb24gcGFyc2Uoc3RyLCBvcHRpb25zKSB7XG4gIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IHN0ciBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gIH1cblxuICB2YXIgb2JqID0ge307XG4gIHZhciBvcHQgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgcGFpcnMgPSBzdHIuc3BsaXQocGFpclNwbGl0UmVnRXhwKTtcbiAgdmFyIGRlYyA9IG9wdC5kZWNvZGUgfHwgZGVjb2RlO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFpciA9IHBhaXJzW2ldO1xuICAgIHZhciBlcV9pZHggPSBwYWlyLmluZGV4T2YoJz0nKTtcblxuICAgIC8vIHNraXAgdGhpbmdzIHRoYXQgZG9uJ3QgbG9vayBsaWtlIGtleT12YWx1ZVxuICAgIGlmIChlcV9pZHggPCAwKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB2YXIga2V5ID0gcGFpci5zdWJzdHIoMCwgZXFfaWR4KS50cmltKCk7XG4gICAgdmFyIHZhbCA9IHBhaXIuc3Vic3RyKCsrZXFfaWR4LCBwYWlyLmxlbmd0aCkudHJpbSgpO1xuXG4gICAgLy8gcXVvdGVkIHZhbHVlc1xuICAgIGlmICgnXCInID09IHZhbFswXSkge1xuICAgICAgdmFsID0gdmFsLnNsaWNlKDEsIC0xKTtcbiAgICB9XG5cbiAgICAvLyBvbmx5IGFzc2lnbiBvbmNlXG4gICAgaWYgKHVuZGVmaW5lZCA9PSBvYmpba2V5XSkge1xuICAgICAgb2JqW2tleV0gPSB0cnlEZWNvZGUodmFsLCBkZWMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIGRhdGEgaW50byBhIGNvb2tpZSBoZWFkZXIuXG4gKlxuICogU2VyaWFsaXplIHRoZSBhIG5hbWUgdmFsdWUgcGFpciBpbnRvIGEgY29va2llIHN0cmluZyBzdWl0YWJsZSBmb3JcbiAqIGh0dHAgaGVhZGVycy4gQW4gb3B0aW9uYWwgb3B0aW9ucyBvYmplY3Qgc3BlY2lmaWVkIGNvb2tpZSBwYXJhbWV0ZXJzLlxuICpcbiAqIHNlcmlhbGl6ZSgnZm9vJywgJ2JhcicsIHsgaHR0cE9ubHk6IHRydWUgfSlcbiAqICAgPT4gXCJmb289YmFyOyBodHRwT25seVwiXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWxcbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqIEBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBzZXJpYWxpemUobmFtZSwgdmFsLCBvcHRpb25zKSB7XG4gIHZhciBvcHQgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgZW5jID0gb3B0LmVuY29kZSB8fCBlbmNvZGU7XG5cbiAgaWYgKHR5cGVvZiBlbmMgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb24gZW5jb2RlIGlzIGludmFsaWQnKTtcbiAgfVxuXG4gIGlmICghZmllbGRDb250ZW50UmVnRXhwLnRlc3QobmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBuYW1lIGlzIGludmFsaWQnKTtcbiAgfVxuXG4gIHZhciB2YWx1ZSA9IGVuYyh2YWwpO1xuXG4gIGlmICh2YWx1ZSAmJiAhZmllbGRDb250ZW50UmVnRXhwLnRlc3QodmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgdmFsIGlzIGludmFsaWQnKTtcbiAgfVxuXG4gIHZhciBzdHIgPSBuYW1lICsgJz0nICsgdmFsdWU7XG5cbiAgaWYgKG51bGwgIT0gb3B0Lm1heEFnZSkge1xuICAgIHZhciBtYXhBZ2UgPSBvcHQubWF4QWdlIC0gMDtcbiAgICBpZiAoaXNOYU4obWF4QWdlKSkgdGhyb3cgbmV3IEVycm9yKCdtYXhBZ2Ugc2hvdWxkIGJlIGEgTnVtYmVyJyk7XG4gICAgc3RyICs9ICc7IE1heC1BZ2U9JyArIE1hdGguZmxvb3IobWF4QWdlKTtcbiAgfVxuXG4gIGlmIChvcHQuZG9tYWluKSB7XG4gICAgaWYgKCFmaWVsZENvbnRlbnRSZWdFeHAudGVzdChvcHQuZG9tYWluKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9uIGRvbWFpbiBpcyBpbnZhbGlkJyk7XG4gICAgfVxuXG4gICAgc3RyICs9ICc7IERvbWFpbj0nICsgb3B0LmRvbWFpbjtcbiAgfVxuXG4gIGlmIChvcHQucGF0aCkge1xuICAgIGlmICghZmllbGRDb250ZW50UmVnRXhwLnRlc3Qob3B0LnBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb24gcGF0aCBpcyBpbnZhbGlkJyk7XG4gICAgfVxuXG4gICAgc3RyICs9ICc7IFBhdGg9JyArIG9wdC5wYXRoO1xuICB9XG5cbiAgaWYgKG9wdC5leHBpcmVzKSB7XG4gICAgaWYgKHR5cGVvZiBvcHQuZXhwaXJlcy50b1VUQ1N0cmluZyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9uIGV4cGlyZXMgaXMgaW52YWxpZCcpO1xuICAgIH1cblxuICAgIHN0ciArPSAnOyBFeHBpcmVzPScgKyBvcHQuZXhwaXJlcy50b1VUQ1N0cmluZygpO1xuICB9XG5cbiAgaWYgKG9wdC5odHRwT25seSkge1xuICAgIHN0ciArPSAnOyBIdHRwT25seSc7XG4gIH1cblxuICBpZiAob3B0LnNlY3VyZSkge1xuICAgIHN0ciArPSAnOyBTZWN1cmUnO1xuICB9XG5cbiAgaWYgKG9wdC5zYW1lU2l0ZSkge1xuICAgIHZhciBzYW1lU2l0ZSA9IHR5cGVvZiBvcHQuc2FtZVNpdGUgPT09ICdzdHJpbmcnXG4gICAgICA/IG9wdC5zYW1lU2l0ZS50b0xvd2VyQ2FzZSgpIDogb3B0LnNhbWVTaXRlO1xuXG4gICAgc3dpdGNoIChzYW1lU2l0ZSkge1xuICAgICAgY2FzZSB0cnVlOlxuICAgICAgICBzdHIgKz0gJzsgU2FtZVNpdGU9U3RyaWN0JztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdsYXgnOlxuICAgICAgICBzdHIgKz0gJzsgU2FtZVNpdGU9TGF4JztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdHJpY3QnOlxuICAgICAgICBzdHIgKz0gJzsgU2FtZVNpdGU9U3RyaWN0JztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdub25lJzpcbiAgICAgICAgc3RyICs9ICc7IFNhbWVTaXRlPU5vbmUnO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbiBzYW1lU2l0ZSBpcyBpbnZhbGlkJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHN0cjtcbn1cblxuLyoqXG4gKiBUcnkgZGVjb2RpbmcgYSBzdHJpbmcgdXNpbmcgYSBkZWNvZGluZyBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBkZWNvZGVcbiAqIEBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gdHJ5RGVjb2RlKHN0ciwgZGVjb2RlKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZShzdHIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG52YXIgY29va2llID0ge1xuXHRwYXJzZTogcGFyc2VfMSxcblx0c2VyaWFsaXplOiBzZXJpYWxpemVfMVxufTtcblxudmFyIGNoYXJzID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpfJCc7XG52YXIgdW5zYWZlQ2hhcnMgPSAvWzw+XFxiXFxmXFxuXFxyXFx0XFwwXFx1MjAyOFxcdTIwMjldL2c7XG52YXIgcmVzZXJ2ZWQgPSAvXig/OmRvfGlmfGlufGZvcnxpbnR8bGV0fG5ld3x0cnl8dmFyfGJ5dGV8Y2FzZXxjaGFyfGVsc2V8ZW51bXxnb3RvfGxvbmd8dGhpc3x2b2lkfHdpdGh8YXdhaXR8YnJlYWt8Y2F0Y2h8Y2xhc3N8Y29uc3R8ZmluYWx8ZmxvYXR8c2hvcnR8c3VwZXJ8dGhyb3d8d2hpbGV8eWllbGR8ZGVsZXRlfGRvdWJsZXxleHBvcnR8aW1wb3J0fG5hdGl2ZXxyZXR1cm58c3dpdGNofHRocm93c3x0eXBlb2Z8Ym9vbGVhbnxkZWZhdWx0fGV4dGVuZHN8ZmluYWxseXxwYWNrYWdlfHByaXZhdGV8YWJzdHJhY3R8Y29udGludWV8ZGVidWdnZXJ8ZnVuY3Rpb258dm9sYXRpbGV8aW50ZXJmYWNlfHByb3RlY3RlZHx0cmFuc2llbnR8aW1wbGVtZW50c3xpbnN0YW5jZW9mfHN5bmNocm9uaXplZCkkLztcbnZhciBlc2NhcGVkID0ge1xuICAgICc8JzogJ1xcXFx1MDAzQycsXG4gICAgJz4nOiAnXFxcXHUwMDNFJyxcbiAgICAnLyc6ICdcXFxcdTAwMkYnLFxuICAgICdcXFxcJzogJ1xcXFxcXFxcJyxcbiAgICAnXFxiJzogJ1xcXFxiJyxcbiAgICAnXFxmJzogJ1xcXFxmJyxcbiAgICAnXFxuJzogJ1xcXFxuJyxcbiAgICAnXFxyJzogJ1xcXFxyJyxcbiAgICAnXFx0JzogJ1xcXFx0JyxcbiAgICAnXFwwJzogJ1xcXFwwJyxcbiAgICAnXFx1MjAyOCc6ICdcXFxcdTIwMjgnLFxuICAgICdcXHUyMDI5JzogJ1xcXFx1MjAyOSdcbn07XG52YXIgb2JqZWN0UHJvdG9Pd25Qcm9wZXJ0eU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoT2JqZWN0LnByb3RvdHlwZSkuc29ydCgpLmpvaW4oJ1xcMCcpO1xuZnVuY3Rpb24gZGV2YWx1ZSh2YWx1ZSkge1xuICAgIHZhciBjb3VudHMgPSBuZXcgTWFwKCk7XG4gICAgZnVuY3Rpb24gd2Fsayh0aGluZykge1xuICAgICAgICBpZiAodHlwZW9mIHRoaW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3Qgc3RyaW5naWZ5IGEgZnVuY3Rpb25cIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvdW50cy5oYXModGhpbmcpKSB7XG4gICAgICAgICAgICBjb3VudHMuc2V0KHRoaW5nLCBjb3VudHMuZ2V0KHRoaW5nKSArIDEpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvdW50cy5zZXQodGhpbmcsIDEpO1xuICAgICAgICBpZiAoIWlzUHJpbWl0aXZlKHRoaW5nKSkge1xuICAgICAgICAgICAgdmFyIHR5cGUgPSBnZXRUeXBlKHRoaW5nKTtcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ051bWJlcic6XG4gICAgICAgICAgICAgICAgY2FzZSAnU3RyaW5nJzpcbiAgICAgICAgICAgICAgICBjYXNlICdCb29sZWFuJzpcbiAgICAgICAgICAgICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgICAgICAgICBjYXNlICdSZWdFeHAnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgY2FzZSAnQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICB0aGluZy5mb3JFYWNoKHdhbGspO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTZXQnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ01hcCc6XG4gICAgICAgICAgICAgICAgICAgIEFycmF5LmZyb20odGhpbmcpLmZvckVhY2god2Fsayk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm90byAhPT0gT2JqZWN0LnByb3RvdHlwZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG8gIT09IG51bGwgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3RvKS5zb3J0KCkuam9pbignXFwwJykgIT09IG9iamVjdFByb3RvT3duUHJvcGVydHlOYW1lcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHN0cmluZ2lmeSBhcmJpdHJhcnkgbm9uLVBPSk9zXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHRoaW5nKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3Qgc3RyaW5naWZ5IFBPSk9zIHdpdGggc3ltYm9saWMga2V5c1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyh0aGluZykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7IHJldHVybiB3YWxrKHRoaW5nW2tleV0pOyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICB3YWxrKHZhbHVlKTtcbiAgICB2YXIgbmFtZXMgPSBuZXcgTWFwKCk7XG4gICAgQXJyYXkuZnJvbShjb3VudHMpXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGVudHJ5KSB7IHJldHVybiBlbnRyeVsxXSA+IDE7IH0pXG4gICAgICAgIC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBiWzFdIC0gYVsxXTsgfSlcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGVudHJ5LCBpKSB7XG4gICAgICAgIG5hbWVzLnNldChlbnRyeVswXSwgZ2V0TmFtZShpKSk7XG4gICAgfSk7XG4gICAgZnVuY3Rpb24gc3RyaW5naWZ5KHRoaW5nKSB7XG4gICAgICAgIGlmIChuYW1lcy5oYXModGhpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmFtZXMuZ2V0KHRoaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNQcmltaXRpdmUodGhpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyaW5naWZ5UHJpbWl0aXZlKHRoaW5nKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdHlwZSA9IGdldFR5cGUodGhpbmcpO1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ051bWJlcic6XG4gICAgICAgICAgICBjYXNlICdTdHJpbmcnOlxuICAgICAgICAgICAgY2FzZSAnQm9vbGVhbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiT2JqZWN0KFwiICsgc3RyaW5naWZ5KHRoaW5nLnZhbHVlT2YoKSkgKyBcIilcIjtcbiAgICAgICAgICAgIGNhc2UgJ1JlZ0V4cCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaW5nLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJuZXcgRGF0ZShcIiArIHRoaW5nLmdldFRpbWUoKSArIFwiKVwiO1xuICAgICAgICAgICAgY2FzZSAnQXJyYXknOlxuICAgICAgICAgICAgICAgIHZhciBtZW1iZXJzID0gdGhpbmcubWFwKGZ1bmN0aW9uICh2LCBpKSB7IHJldHVybiBpIGluIHRoaW5nID8gc3RyaW5naWZ5KHYpIDogJyc7IH0pO1xuICAgICAgICAgICAgICAgIHZhciB0YWlsID0gdGhpbmcubGVuZ3RoID09PSAwIHx8ICh0aGluZy5sZW5ndGggLSAxIGluIHRoaW5nKSA/ICcnIDogJywnO1xuICAgICAgICAgICAgICAgIHJldHVybiBcIltcIiArIG1lbWJlcnMuam9pbignLCcpICsgdGFpbCArIFwiXVwiO1xuICAgICAgICAgICAgY2FzZSAnU2V0JzpcbiAgICAgICAgICAgIGNhc2UgJ01hcCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwibmV3IFwiICsgdHlwZSArIFwiKFtcIiArIEFycmF5LmZyb20odGhpbmcpLm1hcChzdHJpbmdpZnkpLmpvaW4oJywnKSArIFwiXSlcIjtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdmFyIG9iaiA9IFwie1wiICsgT2JqZWN0LmtleXModGhpbmcpLm1hcChmdW5jdGlvbiAoa2V5KSB7IHJldHVybiBzYWZlS2V5KGtleSkgKyBcIjpcIiArIHN0cmluZ2lmeSh0aGluZ1trZXldKTsgfSkuam9pbignLCcpICsgXCJ9XCI7XG4gICAgICAgICAgICAgICAgdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaW5nKTtcbiAgICAgICAgICAgICAgICBpZiAocHJvdG8gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaW5nKS5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFwiT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKG51bGwpLFwiICsgb2JqICsgXCIpXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIDogXCJPYmplY3QuY3JlYXRlKG51bGwpXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHN0ciA9IHN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgaWYgKG5hbWVzLnNpemUpIHtcbiAgICAgICAgdmFyIHBhcmFtc18xID0gW107XG4gICAgICAgIHZhciBzdGF0ZW1lbnRzXzEgPSBbXTtcbiAgICAgICAgdmFyIHZhbHVlc18xID0gW107XG4gICAgICAgIG5hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUsIHRoaW5nKSB7XG4gICAgICAgICAgICBwYXJhbXNfMS5wdXNoKG5hbWUpO1xuICAgICAgICAgICAgaWYgKGlzUHJpbWl0aXZlKHRoaW5nKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlc18xLnB1c2goc3RyaW5naWZ5UHJpbWl0aXZlKHRoaW5nKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHR5cGUgPSBnZXRUeXBlKHRoaW5nKTtcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ051bWJlcic6XG4gICAgICAgICAgICAgICAgY2FzZSAnU3RyaW5nJzpcbiAgICAgICAgICAgICAgICBjYXNlICdCb29sZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzXzEucHVzaChcIk9iamVjdChcIiArIHN0cmluZ2lmeSh0aGluZy52YWx1ZU9mKCkpICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdSZWdFeHAnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZXNfMS5wdXNoKHRoaW5nLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzXzEucHVzaChcIm5ldyBEYXRlKFwiICsgdGhpbmcuZ2V0VGltZSgpICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdBcnJheSc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlc18xLnB1c2goXCJBcnJheShcIiArIHRoaW5nLmxlbmd0aCArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpbmcuZm9yRWFjaChmdW5jdGlvbiAodiwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50c18xLnB1c2gobmFtZSArIFwiW1wiICsgaSArIFwiXT1cIiArIHN0cmluZ2lmeSh2KSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTZXQnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZXNfMS5wdXNoKFwibmV3IFNldFwiKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50c18xLnB1c2gobmFtZSArIFwiLlwiICsgQXJyYXkuZnJvbSh0aGluZykubWFwKGZ1bmN0aW9uICh2KSB7IHJldHVybiBcImFkZChcIiArIHN0cmluZ2lmeSh2KSArIFwiKVwiOyB9KS5qb2luKCcuJykpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdNYXAnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZXNfMS5wdXNoKFwibmV3IE1hcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50c18xLnB1c2gobmFtZSArIFwiLlwiICsgQXJyYXkuZnJvbSh0aGluZykubWFwKGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGsgPSBfYVswXSwgdiA9IF9hWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwic2V0KFwiICsgc3RyaW5naWZ5KGspICsgXCIsIFwiICsgc3RyaW5naWZ5KHYpICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJy4nKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlc18xLnB1c2goT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaW5nKSA9PT0gbnVsbCA/ICdPYmplY3QuY3JlYXRlKG51bGwpJyA6ICd7fScpO1xuICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyh0aGluZykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzXzEucHVzaChcIlwiICsgbmFtZSArIHNhZmVQcm9wKGtleSkgKyBcIj1cIiArIHN0cmluZ2lmeSh0aGluZ1trZXldKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgc3RhdGVtZW50c18xLnB1c2goXCJyZXR1cm4gXCIgKyBzdHIpO1xuICAgICAgICByZXR1cm4gXCIoZnVuY3Rpb24oXCIgKyBwYXJhbXNfMS5qb2luKCcsJykgKyBcIil7XCIgKyBzdGF0ZW1lbnRzXzEuam9pbignOycpICsgXCJ9KFwiICsgdmFsdWVzXzEuam9pbignLCcpICsgXCIpKVwiO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG59XG5mdW5jdGlvbiBnZXROYW1lKG51bSkge1xuICAgIHZhciBuYW1lID0gJyc7XG4gICAgZG8ge1xuICAgICAgICBuYW1lID0gY2hhcnNbbnVtICUgY2hhcnMubGVuZ3RoXSArIG5hbWU7XG4gICAgICAgIG51bSA9IH5+KG51bSAvIGNoYXJzLmxlbmd0aCkgLSAxO1xuICAgIH0gd2hpbGUgKG51bSA+PSAwKTtcbiAgICByZXR1cm4gcmVzZXJ2ZWQudGVzdChuYW1lKSA/IG5hbWUgKyBcIl9cIiA6IG5hbWU7XG59XG5mdW5jdGlvbiBpc1ByaW1pdGl2ZSh0aGluZykge1xuICAgIHJldHVybiBPYmplY3QodGhpbmcpICE9PSB0aGluZztcbn1cbmZ1bmN0aW9uIHN0cmluZ2lmeVByaW1pdGl2ZSh0aGluZykge1xuICAgIGlmICh0eXBlb2YgdGhpbmcgPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4gc3RyaW5naWZ5U3RyaW5nKHRoaW5nKTtcbiAgICBpZiAodGhpbmcgPT09IHZvaWQgMClcbiAgICAgICAgcmV0dXJuICd2b2lkIDAnO1xuICAgIGlmICh0aGluZyA9PT0gMCAmJiAxIC8gdGhpbmcgPCAwKVxuICAgICAgICByZXR1cm4gJy0wJztcbiAgICB2YXIgc3RyID0gU3RyaW5nKHRoaW5nKTtcbiAgICBpZiAodHlwZW9mIHRoaW5nID09PSAnbnVtYmVyJylcbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eKC0pPzBcXC4vLCAnJDEuJyk7XG4gICAgcmV0dXJuIHN0cjtcbn1cbmZ1bmN0aW9uIGdldFR5cGUodGhpbmcpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaW5nKS5zbGljZSg4LCAtMSk7XG59XG5mdW5jdGlvbiBlc2NhcGVVbnNhZmVDaGFyKGMpIHtcbiAgICByZXR1cm4gZXNjYXBlZFtjXSB8fCBjO1xufVxuZnVuY3Rpb24gZXNjYXBlVW5zYWZlQ2hhcnMoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKHVuc2FmZUNoYXJzLCBlc2NhcGVVbnNhZmVDaGFyKTtcbn1cbmZ1bmN0aW9uIHNhZmVLZXkoa2V5KSB7XG4gICAgcmV0dXJuIC9eW18kYS16QS1aXVtfJGEtekEtWjAtOV0qJC8udGVzdChrZXkpID8ga2V5IDogZXNjYXBlVW5zYWZlQ2hhcnMoSlNPTi5zdHJpbmdpZnkoa2V5KSk7XG59XG5mdW5jdGlvbiBzYWZlUHJvcChrZXkpIHtcbiAgICByZXR1cm4gL15bXyRhLXpBLVpdW18kYS16QS1aMC05XSokLy50ZXN0KGtleSkgPyBcIi5cIiArIGtleSA6IFwiW1wiICsgZXNjYXBlVW5zYWZlQ2hhcnMoSlNPTi5zdHJpbmdpZnkoa2V5KSkgKyBcIl1cIjtcbn1cbmZ1bmN0aW9uIHN0cmluZ2lmeVN0cmluZyhzdHIpIHtcbiAgICB2YXIgcmVzdWx0ID0gJ1wiJztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICB2YXIgY2hhciA9IHN0ci5jaGFyQXQoaSk7XG4gICAgICAgIHZhciBjb2RlID0gY2hhci5jaGFyQ29kZUF0KDApO1xuICAgICAgICBpZiAoY2hhciA9PT0gJ1wiJykge1xuICAgICAgICAgICAgcmVzdWx0ICs9ICdcXFxcXCInO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNoYXIgaW4gZXNjYXBlZCkge1xuICAgICAgICAgICAgcmVzdWx0ICs9IGVzY2FwZWRbY2hhcl07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY29kZSA+PSAweGQ4MDAgJiYgY29kZSA8PSAweGRmZmYpIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gc3RyLmNoYXJDb2RlQXQoaSArIDEpO1xuICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyB0aGUgYmVnaW5uaW5nIG9mIGEgW2hpZ2gsIGxvd10gc3Vycm9nYXRlIHBhaXIsXG4gICAgICAgICAgICAvLyBhZGQgdGhlIG5leHQgdHdvIGNoYXJhY3RlcnMsIG90aGVyd2lzZSBlc2NhcGVcbiAgICAgICAgICAgIGlmIChjb2RlIDw9IDB4ZGJmZiAmJiAobmV4dCA+PSAweGRjMDAgJiYgbmV4dCA8PSAweGRmZmYpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGNoYXIgKyBzdHJbKytpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIlxcXFx1XCIgKyBjb2RlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ICs9IGNoYXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmVzdWx0ICs9ICdcIic7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gQmFzZWQgb24gaHR0cHM6Ly9naXRodWIuY29tL3RtcHZhci9qc2RvbS9ibG9iL2FhODViMmFiZjA3NzY2ZmY3YmY1YzFmNmRhYWZiMzcyNmYyZjJkYjUvbGliL2pzZG9tL2xpdmluZy9ibG9iLmpzXG5cbi8vIGZpeCBmb3IgXCJSZWFkYWJsZVwiIGlzbid0IGEgbmFtZWQgZXhwb3J0IGlzc3VlXG5jb25zdCBSZWFkYWJsZSA9IFN0cmVhbS5SZWFkYWJsZTtcblxuY29uc3QgQlVGRkVSID0gU3ltYm9sKCdidWZmZXInKTtcbmNvbnN0IFRZUEUgPSBTeW1ib2woJ3R5cGUnKTtcblxuY2xhc3MgQmxvYiB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXNbVFlQRV0gPSAnJztcblxuXHRcdGNvbnN0IGJsb2JQYXJ0cyA9IGFyZ3VtZW50c1swXTtcblx0XHRjb25zdCBvcHRpb25zID0gYXJndW1lbnRzWzFdO1xuXG5cdFx0Y29uc3QgYnVmZmVycyA9IFtdO1xuXHRcdGxldCBzaXplID0gMDtcblxuXHRcdGlmIChibG9iUGFydHMpIHtcblx0XHRcdGNvbnN0IGEgPSBibG9iUGFydHM7XG5cdFx0XHRjb25zdCBsZW5ndGggPSBOdW1iZXIoYS5sZW5ndGgpO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0XHRjb25zdCBlbGVtZW50ID0gYVtpXTtcblx0XHRcdFx0bGV0IGJ1ZmZlcjtcblx0XHRcdFx0aWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBCdWZmZXIpIHtcblx0XHRcdFx0XHRidWZmZXIgPSBlbGVtZW50O1xuXHRcdFx0XHR9IGVsc2UgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhlbGVtZW50KSkge1xuXHRcdFx0XHRcdGJ1ZmZlciA9IEJ1ZmZlci5mcm9tKGVsZW1lbnQuYnVmZmVyLCBlbGVtZW50LmJ5dGVPZmZzZXQsIGVsZW1lbnQuYnl0ZUxlbmd0aCk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG5cdFx0XHRcdFx0YnVmZmVyID0gQnVmZmVyLmZyb20oZWxlbWVudCk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEJsb2IpIHtcblx0XHRcdFx0XHRidWZmZXIgPSBlbGVtZW50W0JVRkZFUl07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YnVmZmVyID0gQnVmZmVyLmZyb20odHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnID8gZWxlbWVudCA6IFN0cmluZyhlbGVtZW50KSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2l6ZSArPSBidWZmZXIubGVuZ3RoO1xuXHRcdFx0XHRidWZmZXJzLnB1c2goYnVmZmVyKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzW0JVRkZFUl0gPSBCdWZmZXIuY29uY2F0KGJ1ZmZlcnMpO1xuXG5cdFx0bGV0IHR5cGUgPSBvcHRpb25zICYmIG9wdGlvbnMudHlwZSAhPT0gdW5kZWZpbmVkICYmIFN0cmluZyhvcHRpb25zLnR5cGUpLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKHR5cGUgJiYgIS9bXlxcdTAwMjAtXFx1MDA3RV0vLnRlc3QodHlwZSkpIHtcblx0XHRcdHRoaXNbVFlQRV0gPSB0eXBlO1xuXHRcdH1cblx0fVxuXHRnZXQgc2l6ZSgpIHtcblx0XHRyZXR1cm4gdGhpc1tCVUZGRVJdLmxlbmd0aDtcblx0fVxuXHRnZXQgdHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpc1tUWVBFXTtcblx0fVxuXHR0ZXh0KCkge1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpc1tCVUZGRVJdLnRvU3RyaW5nKCkpO1xuXHR9XG5cdGFycmF5QnVmZmVyKCkge1xuXHRcdGNvbnN0IGJ1ZiA9IHRoaXNbQlVGRkVSXTtcblx0XHRjb25zdCBhYiA9IGJ1Zi5idWZmZXIuc2xpY2UoYnVmLmJ5dGVPZmZzZXQsIGJ1Zi5ieXRlT2Zmc2V0ICsgYnVmLmJ5dGVMZW5ndGgpO1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWIpO1xuXHR9XG5cdHN0cmVhbSgpIHtcblx0XHRjb25zdCByZWFkYWJsZSA9IG5ldyBSZWFkYWJsZSgpO1xuXHRcdHJlYWRhYmxlLl9yZWFkID0gZnVuY3Rpb24gKCkge307XG5cdFx0cmVhZGFibGUucHVzaCh0aGlzW0JVRkZFUl0pO1xuXHRcdHJlYWRhYmxlLnB1c2gobnVsbCk7XG5cdFx0cmV0dXJuIHJlYWRhYmxlO1xuXHR9XG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiAnW29iamVjdCBCbG9iXSc7XG5cdH1cblx0c2xpY2UoKSB7XG5cdFx0Y29uc3Qgc2l6ZSA9IHRoaXMuc2l6ZTtcblxuXHRcdGNvbnN0IHN0YXJ0ID0gYXJndW1lbnRzWzBdO1xuXHRcdGNvbnN0IGVuZCA9IGFyZ3VtZW50c1sxXTtcblx0XHRsZXQgcmVsYXRpdmVTdGFydCwgcmVsYXRpdmVFbmQ7XG5cdFx0aWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJlbGF0aXZlU3RhcnQgPSAwO1xuXHRcdH0gZWxzZSBpZiAoc3RhcnQgPCAwKSB7XG5cdFx0XHRyZWxhdGl2ZVN0YXJ0ID0gTWF0aC5tYXgoc2l6ZSArIHN0YXJ0LCAwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVsYXRpdmVTdGFydCA9IE1hdGgubWluKHN0YXJ0LCBzaXplKTtcblx0XHR9XG5cdFx0aWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZWxhdGl2ZUVuZCA9IHNpemU7XG5cdFx0fSBlbHNlIGlmIChlbmQgPCAwKSB7XG5cdFx0XHRyZWxhdGl2ZUVuZCA9IE1hdGgubWF4KHNpemUgKyBlbmQsIDApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZWxhdGl2ZUVuZCA9IE1hdGgubWluKGVuZCwgc2l6ZSk7XG5cdFx0fVxuXHRcdGNvbnN0IHNwYW4gPSBNYXRoLm1heChyZWxhdGl2ZUVuZCAtIHJlbGF0aXZlU3RhcnQsIDApO1xuXG5cdFx0Y29uc3QgYnVmZmVyID0gdGhpc1tCVUZGRVJdO1xuXHRcdGNvbnN0IHNsaWNlZEJ1ZmZlciA9IGJ1ZmZlci5zbGljZShyZWxhdGl2ZVN0YXJ0LCByZWxhdGl2ZVN0YXJ0ICsgc3Bhbik7XG5cdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtdLCB7IHR5cGU6IGFyZ3VtZW50c1syXSB9KTtcblx0XHRibG9iW0JVRkZFUl0gPSBzbGljZWRCdWZmZXI7XG5cdFx0cmV0dXJuIGJsb2I7XG5cdH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQmxvYi5wcm90b3R5cGUsIHtcblx0c2l6ZTogeyBlbnVtZXJhYmxlOiB0cnVlIH0sXG5cdHR5cGU6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRzbGljZTogeyBlbnVtZXJhYmxlOiB0cnVlIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmxvYi5wcm90b3R5cGUsIFN5bWJvbC50b1N0cmluZ1RhZywge1xuXHR2YWx1ZTogJ0Jsb2InLFxuXHR3cml0YWJsZTogZmFsc2UsXG5cdGVudW1lcmFibGU6IGZhbHNlLFxuXHRjb25maWd1cmFibGU6IHRydWVcbn0pO1xuXG4vKipcbiAqIGZldGNoLWVycm9yLmpzXG4gKlxuICogRmV0Y2hFcnJvciBpbnRlcmZhY2UgZm9yIG9wZXJhdGlvbmFsIGVycm9yc1xuICovXG5cbi8qKlxuICogQ3JlYXRlIEZldGNoRXJyb3IgaW5zdGFuY2VcbiAqXG4gKiBAcGFyYW0gICBTdHJpbmcgICAgICBtZXNzYWdlICAgICAgRXJyb3IgbWVzc2FnZSBmb3IgaHVtYW5cbiAqIEBwYXJhbSAgIFN0cmluZyAgICAgIHR5cGUgICAgICAgICBFcnJvciB0eXBlIGZvciBtYWNoaW5lXG4gKiBAcGFyYW0gICBTdHJpbmcgICAgICBzeXN0ZW1FcnJvciAgRm9yIE5vZGUuanMgc3lzdGVtIGVycm9yXG4gKiBAcmV0dXJuICBGZXRjaEVycm9yXG4gKi9cbmZ1bmN0aW9uIEZldGNoRXJyb3IobWVzc2FnZSwgdHlwZSwgc3lzdGVtRXJyb3IpIHtcbiAgRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuXG4gIC8vIHdoZW4gZXJyLnR5cGUgaXMgYHN5c3RlbWAsIGVyci5jb2RlIGNvbnRhaW5zIHN5c3RlbSBlcnJvciBjb2RlXG4gIGlmIChzeXN0ZW1FcnJvcikge1xuICAgIHRoaXMuY29kZSA9IHRoaXMuZXJybm8gPSBzeXN0ZW1FcnJvci5jb2RlO1xuICB9XG5cbiAgLy8gaGlkZSBjdXN0b20gZXJyb3IgaW1wbGVtZW50YXRpb24gZGV0YWlscyBmcm9tIGVuZC11c2Vyc1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbn1cblxuRmV0Y2hFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5GZXRjaEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZldGNoRXJyb3I7XG5GZXRjaEVycm9yLnByb3RvdHlwZS5uYW1lID0gJ0ZldGNoRXJyb3InO1xuXG5sZXQgY29udmVydDtcbnRyeSB7XG5cdGNvbnZlcnQgPSByZXF1aXJlKCdlbmNvZGluZycpLmNvbnZlcnQ7XG59IGNhdGNoIChlKSB7fVxuXG5jb25zdCBJTlRFUk5BTFMgPSBTeW1ib2woJ0JvZHkgaW50ZXJuYWxzJyk7XG5cbi8vIGZpeCBhbiBpc3N1ZSB3aGVyZSBcIlBhc3NUaHJvdWdoXCIgaXNuJ3QgYSBuYW1lZCBleHBvcnQgZm9yIG5vZGUgPDEwXG5jb25zdCBQYXNzVGhyb3VnaCA9IFN0cmVhbS5QYXNzVGhyb3VnaDtcblxuLyoqXG4gKiBCb2R5IG1peGluXG4gKlxuICogUmVmOiBodHRwczovL2ZldGNoLnNwZWMud2hhdHdnLm9yZy8jYm9keVxuICpcbiAqIEBwYXJhbSAgIFN0cmVhbSAgYm9keSAgUmVhZGFibGUgc3RyZWFtXG4gKiBAcGFyYW0gICBPYmplY3QgIG9wdHMgIFJlc3BvbnNlIG9wdGlvbnNcbiAqIEByZXR1cm4gIFZvaWRcbiAqL1xuZnVuY3Rpb24gQm9keShib2R5KSB7XG5cdHZhciBfdGhpcyA9IHRoaXM7XG5cblx0dmFyIF9yZWYgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHt9LFxuXHQgICAgX3JlZiRzaXplID0gX3JlZi5zaXplO1xuXG5cdGxldCBzaXplID0gX3JlZiRzaXplID09PSB1bmRlZmluZWQgPyAwIDogX3JlZiRzaXplO1xuXHR2YXIgX3JlZiR0aW1lb3V0ID0gX3JlZi50aW1lb3V0O1xuXHRsZXQgdGltZW91dCA9IF9yZWYkdGltZW91dCA9PT0gdW5kZWZpbmVkID8gMCA6IF9yZWYkdGltZW91dDtcblxuXHRpZiAoYm9keSA9PSBudWxsKSB7XG5cdFx0Ly8gYm9keSBpcyB1bmRlZmluZWQgb3IgbnVsbFxuXHRcdGJvZHkgPSBudWxsO1xuXHR9IGVsc2UgaWYgKGlzVVJMU2VhcmNoUGFyYW1zKGJvZHkpKSB7XG5cdFx0Ly8gYm9keSBpcyBhIFVSTFNlYXJjaFBhcmFtc1xuXHRcdGJvZHkgPSBCdWZmZXIuZnJvbShib2R5LnRvU3RyaW5nKCkpO1xuXHR9IGVsc2UgaWYgKGlzQmxvYihib2R5KSkgOyBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIoYm9keSkpIDsgZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGJvZHkpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nKSB7XG5cdFx0Ly8gYm9keSBpcyBBcnJheUJ1ZmZlclxuXHRcdGJvZHkgPSBCdWZmZXIuZnJvbShib2R5KTtcblx0fSBlbHNlIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoYm9keSkpIHtcblx0XHQvLyBib2R5IGlzIEFycmF5QnVmZmVyVmlld1xuXHRcdGJvZHkgPSBCdWZmZXIuZnJvbShib2R5LmJ1ZmZlciwgYm9keS5ieXRlT2Zmc2V0LCBib2R5LmJ5dGVMZW5ndGgpO1xuXHR9IGVsc2UgaWYgKGJvZHkgaW5zdGFuY2VvZiBTdHJlYW0pIDsgZWxzZSB7XG5cdFx0Ly8gbm9uZSBvZiB0aGUgYWJvdmVcblx0XHQvLyBjb2VyY2UgdG8gc3RyaW5nIHRoZW4gYnVmZmVyXG5cdFx0Ym9keSA9IEJ1ZmZlci5mcm9tKFN0cmluZyhib2R5KSk7XG5cdH1cblx0dGhpc1tJTlRFUk5BTFNdID0ge1xuXHRcdGJvZHksXG5cdFx0ZGlzdHVyYmVkOiBmYWxzZSxcblx0XHRlcnJvcjogbnVsbFxuXHR9O1xuXHR0aGlzLnNpemUgPSBzaXplO1xuXHR0aGlzLnRpbWVvdXQgPSB0aW1lb3V0O1xuXG5cdGlmIChib2R5IGluc3RhbmNlb2YgU3RyZWFtKSB7XG5cdFx0Ym9keS5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRjb25zdCBlcnJvciA9IGVyci5uYW1lID09PSAnQWJvcnRFcnJvcicgPyBlcnIgOiBuZXcgRmV0Y2hFcnJvcihgSW52YWxpZCByZXNwb25zZSBib2R5IHdoaWxlIHRyeWluZyB0byBmZXRjaCAke190aGlzLnVybH06ICR7ZXJyLm1lc3NhZ2V9YCwgJ3N5c3RlbScsIGVycik7XG5cdFx0XHRfdGhpc1tJTlRFUk5BTFNdLmVycm9yID0gZXJyb3I7XG5cdFx0fSk7XG5cdH1cbn1cblxuQm9keS5wcm90b3R5cGUgPSB7XG5cdGdldCBib2R5KCkge1xuXHRcdHJldHVybiB0aGlzW0lOVEVSTkFMU10uYm9keTtcblx0fSxcblxuXHRnZXQgYm9keVVzZWQoKSB7XG5cdFx0cmV0dXJuIHRoaXNbSU5URVJOQUxTXS5kaXN0dXJiZWQ7XG5cdH0sXG5cblx0LyoqXG4gICogRGVjb2RlIHJlc3BvbnNlIGFzIEFycmF5QnVmZmVyXG4gICpcbiAgKiBAcmV0dXJuICBQcm9taXNlXG4gICovXG5cdGFycmF5QnVmZmVyKCkge1xuXHRcdHJldHVybiBjb25zdW1lQm9keS5jYWxsKHRoaXMpLnRoZW4oZnVuY3Rpb24gKGJ1Zikge1xuXHRcdFx0cmV0dXJuIGJ1Zi5idWZmZXIuc2xpY2UoYnVmLmJ5dGVPZmZzZXQsIGJ1Zi5ieXRlT2Zmc2V0ICsgYnVmLmJ5dGVMZW5ndGgpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuICAqIFJldHVybiByYXcgcmVzcG9uc2UgYXMgQmxvYlxuICAqXG4gICogQHJldHVybiBQcm9taXNlXG4gICovXG5cdGJsb2IoKSB7XG5cdFx0bGV0IGN0ID0gdGhpcy5oZWFkZXJzICYmIHRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpIHx8ICcnO1xuXHRcdHJldHVybiBjb25zdW1lQm9keS5jYWxsKHRoaXMpLnRoZW4oZnVuY3Rpb24gKGJ1Zikge1xuXHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oXG5cdFx0XHQvLyBQcmV2ZW50IGNvcHlpbmdcblx0XHRcdG5ldyBCbG9iKFtdLCB7XG5cdFx0XHRcdHR5cGU6IGN0LnRvTG93ZXJDYXNlKClcblx0XHRcdH0pLCB7XG5cdFx0XHRcdFtCVUZGRVJdOiBidWZcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuICAqIERlY29kZSByZXNwb25zZSBhcyBqc29uXG4gICpcbiAgKiBAcmV0dXJuICBQcm9taXNlXG4gICovXG5cdGpzb24oKSB7XG5cdFx0dmFyIF90aGlzMiA9IHRoaXM7XG5cblx0XHRyZXR1cm4gY29uc3VtZUJvZHkuY2FsbCh0aGlzKS50aGVuKGZ1bmN0aW9uIChidWZmZXIpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiBKU09OLnBhcnNlKGJ1ZmZlci50b1N0cmluZygpKTtcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRyZXR1cm4gQm9keS5Qcm9taXNlLnJlamVjdChuZXcgRmV0Y2hFcnJvcihgaW52YWxpZCBqc29uIHJlc3BvbnNlIGJvZHkgYXQgJHtfdGhpczIudXJsfSByZWFzb246ICR7ZXJyLm1lc3NhZ2V9YCwgJ2ludmFsaWQtanNvbicpKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipcbiAgKiBEZWNvZGUgcmVzcG9uc2UgYXMgdGV4dFxuICAqXG4gICogQHJldHVybiAgUHJvbWlzZVxuICAqL1xuXHR0ZXh0KCkge1xuXHRcdHJldHVybiBjb25zdW1lQm9keS5jYWxsKHRoaXMpLnRoZW4oZnVuY3Rpb24gKGJ1ZmZlcikge1xuXHRcdFx0cmV0dXJuIGJ1ZmZlci50b1N0cmluZygpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuICAqIERlY29kZSByZXNwb25zZSBhcyBidWZmZXIgKG5vbi1zcGVjIGFwaSlcbiAgKlxuICAqIEByZXR1cm4gIFByb21pc2VcbiAgKi9cblx0YnVmZmVyKCkge1xuXHRcdHJldHVybiBjb25zdW1lQm9keS5jYWxsKHRoaXMpO1xuXHR9LFxuXG5cdC8qKlxuICAqIERlY29kZSByZXNwb25zZSBhcyB0ZXh0LCB3aGlsZSBhdXRvbWF0aWNhbGx5IGRldGVjdGluZyB0aGUgZW5jb2RpbmcgYW5kXG4gICogdHJ5aW5nIHRvIGRlY29kZSB0byBVVEYtOCAobm9uLXNwZWMgYXBpKVxuICAqXG4gICogQHJldHVybiAgUHJvbWlzZVxuICAqL1xuXHR0ZXh0Q29udmVydGVkKCkge1xuXHRcdHZhciBfdGhpczMgPSB0aGlzO1xuXG5cdFx0cmV0dXJuIGNvbnN1bWVCb2R5LmNhbGwodGhpcykudGhlbihmdW5jdGlvbiAoYnVmZmVyKSB7XG5cdFx0XHRyZXR1cm4gY29udmVydEJvZHkoYnVmZmVyLCBfdGhpczMuaGVhZGVycyk7XG5cdFx0fSk7XG5cdH1cbn07XG5cbi8vIEluIGJyb3dzZXJzLCBhbGwgcHJvcGVydGllcyBhcmUgZW51bWVyYWJsZS5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEJvZHkucHJvdG90eXBlLCB7XG5cdGJvZHk6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRib2R5VXNlZDogeyBlbnVtZXJhYmxlOiB0cnVlIH0sXG5cdGFycmF5QnVmZmVyOiB7IGVudW1lcmFibGU6IHRydWUgfSxcblx0YmxvYjogeyBlbnVtZXJhYmxlOiB0cnVlIH0sXG5cdGpzb246IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHR0ZXh0OiB7IGVudW1lcmFibGU6IHRydWUgfVxufSk7XG5cbkJvZHkubWl4SW4gPSBmdW5jdGlvbiAocHJvdG8pIHtcblx0Zm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKEJvZHkucHJvdG90eXBlKSkge1xuXHRcdC8vIGlzdGFuYnVsIGlnbm9yZSBlbHNlOiBmdXR1cmUgcHJvb2Zcblx0XHRpZiAoIShuYW1lIGluIHByb3RvKSkge1xuXHRcdFx0Y29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoQm9keS5wcm90b3R5cGUsIG5hbWUpO1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBuYW1lLCBkZXNjKTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogQ29uc3VtZSBhbmQgY29udmVydCBhbiBlbnRpcmUgQm9keSB0byBhIEJ1ZmZlci5cbiAqXG4gKiBSZWY6IGh0dHBzOi8vZmV0Y2guc3BlYy53aGF0d2cub3JnLyNjb25jZXB0LWJvZHktY29uc3VtZS1ib2R5XG4gKlxuICogQHJldHVybiAgUHJvbWlzZVxuICovXG5mdW5jdGlvbiBjb25zdW1lQm9keSgpIHtcblx0dmFyIF90aGlzNCA9IHRoaXM7XG5cblx0aWYgKHRoaXNbSU5URVJOQUxTXS5kaXN0dXJiZWQpIHtcblx0XHRyZXR1cm4gQm9keS5Qcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKGBib2R5IHVzZWQgYWxyZWFkeSBmb3I6ICR7dGhpcy51cmx9YCkpO1xuXHR9XG5cblx0dGhpc1tJTlRFUk5BTFNdLmRpc3R1cmJlZCA9IHRydWU7XG5cblx0aWYgKHRoaXNbSU5URVJOQUxTXS5lcnJvcikge1xuXHRcdHJldHVybiBCb2R5LlByb21pc2UucmVqZWN0KHRoaXNbSU5URVJOQUxTXS5lcnJvcik7XG5cdH1cblxuXHRsZXQgYm9keSA9IHRoaXMuYm9keTtcblxuXHQvLyBib2R5IGlzIG51bGxcblx0aWYgKGJvZHkgPT09IG51bGwpIHtcblx0XHRyZXR1cm4gQm9keS5Qcm9taXNlLnJlc29sdmUoQnVmZmVyLmFsbG9jKDApKTtcblx0fVxuXG5cdC8vIGJvZHkgaXMgYmxvYlxuXHRpZiAoaXNCbG9iKGJvZHkpKSB7XG5cdFx0Ym9keSA9IGJvZHkuc3RyZWFtKCk7XG5cdH1cblxuXHQvLyBib2R5IGlzIGJ1ZmZlclxuXHRpZiAoQnVmZmVyLmlzQnVmZmVyKGJvZHkpKSB7XG5cdFx0cmV0dXJuIEJvZHkuUHJvbWlzZS5yZXNvbHZlKGJvZHkpO1xuXHR9XG5cblx0Ly8gaXN0YW5idWwgaWdub3JlIGlmOiBzaG91bGQgbmV2ZXIgaGFwcGVuXG5cdGlmICghKGJvZHkgaW5zdGFuY2VvZiBTdHJlYW0pKSB7XG5cdFx0cmV0dXJuIEJvZHkuUHJvbWlzZS5yZXNvbHZlKEJ1ZmZlci5hbGxvYygwKSk7XG5cdH1cblxuXHQvLyBib2R5IGlzIHN0cmVhbVxuXHQvLyBnZXQgcmVhZHkgdG8gYWN0dWFsbHkgY29uc3VtZSB0aGUgYm9keVxuXHRsZXQgYWNjdW0gPSBbXTtcblx0bGV0IGFjY3VtQnl0ZXMgPSAwO1xuXHRsZXQgYWJvcnQgPSBmYWxzZTtcblxuXHRyZXR1cm4gbmV3IEJvZHkuUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0bGV0IHJlc1RpbWVvdXQ7XG5cblx0XHQvLyBhbGxvdyB0aW1lb3V0IG9uIHNsb3cgcmVzcG9uc2UgYm9keVxuXHRcdGlmIChfdGhpczQudGltZW91dCkge1xuXHRcdFx0cmVzVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRhYm9ydCA9IHRydWU7XG5cdFx0XHRcdHJlamVjdChuZXcgRmV0Y2hFcnJvcihgUmVzcG9uc2UgdGltZW91dCB3aGlsZSB0cnlpbmcgdG8gZmV0Y2ggJHtfdGhpczQudXJsfSAob3ZlciAke190aGlzNC50aW1lb3V0fW1zKWAsICdib2R5LXRpbWVvdXQnKSk7XG5cdFx0XHR9LCBfdGhpczQudGltZW91dCk7XG5cdFx0fVxuXG5cdFx0Ly8gaGFuZGxlIHN0cmVhbSBlcnJvcnNcblx0XHRib2R5Lm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdGlmIChlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSB7XG5cdFx0XHRcdC8vIGlmIHRoZSByZXF1ZXN0IHdhcyBhYm9ydGVkLCByZWplY3Qgd2l0aCB0aGlzIEVycm9yXG5cdFx0XHRcdGFib3J0ID0gdHJ1ZTtcblx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBvdGhlciBlcnJvcnMsIHN1Y2ggYXMgaW5jb3JyZWN0IGNvbnRlbnQtZW5jb2Rpbmdcblx0XHRcdFx0cmVqZWN0KG5ldyBGZXRjaEVycm9yKGBJbnZhbGlkIHJlc3BvbnNlIGJvZHkgd2hpbGUgdHJ5aW5nIHRvIGZldGNoICR7X3RoaXM0LnVybH06ICR7ZXJyLm1lc3NhZ2V9YCwgJ3N5c3RlbScsIGVycikpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ym9keS5vbignZGF0YScsIGZ1bmN0aW9uIChjaHVuaykge1xuXHRcdFx0aWYgKGFib3J0IHx8IGNodW5rID09PSBudWxsKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKF90aGlzNC5zaXplICYmIGFjY3VtQnl0ZXMgKyBjaHVuay5sZW5ndGggPiBfdGhpczQuc2l6ZSkge1xuXHRcdFx0XHRhYm9ydCA9IHRydWU7XG5cdFx0XHRcdHJlamVjdChuZXcgRmV0Y2hFcnJvcihgY29udGVudCBzaXplIGF0ICR7X3RoaXM0LnVybH0gb3ZlciBsaW1pdDogJHtfdGhpczQuc2l6ZX1gLCAnbWF4LXNpemUnKSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0YWNjdW1CeXRlcyArPSBjaHVuay5sZW5ndGg7XG5cdFx0XHRhY2N1bS5wdXNoKGNodW5rKTtcblx0XHR9KTtcblxuXHRcdGJvZHkub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmIChhYm9ydCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGNsZWFyVGltZW91dChyZXNUaW1lb3V0KTtcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0cmVzb2x2ZShCdWZmZXIuY29uY2F0KGFjY3VtLCBhY2N1bUJ5dGVzKSk7XG5cdFx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdFx0Ly8gaGFuZGxlIHN0cmVhbXMgdGhhdCBoYXZlIGFjY3VtdWxhdGVkIHRvbyBtdWNoIGRhdGEgKGlzc3VlICM0MTQpXG5cdFx0XHRcdHJlamVjdChuZXcgRmV0Y2hFcnJvcihgQ291bGQgbm90IGNyZWF0ZSBCdWZmZXIgZnJvbSByZXNwb25zZSBib2R5IGZvciAke190aGlzNC51cmx9OiAke2Vyci5tZXNzYWdlfWAsICdzeXN0ZW0nLCBlcnIpKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG59XG5cbi8qKlxuICogRGV0ZWN0IGJ1ZmZlciBlbmNvZGluZyBhbmQgY29udmVydCB0byB0YXJnZXQgZW5jb2RpbmdcbiAqIHJlZjogaHR0cDovL3d3dy53My5vcmcvVFIvMjAxMS9XRC1odG1sNS0yMDExMDExMy9wYXJzaW5nLmh0bWwjZGV0ZXJtaW5pbmctdGhlLWNoYXJhY3Rlci1lbmNvZGluZ1xuICpcbiAqIEBwYXJhbSAgIEJ1ZmZlciAgYnVmZmVyICAgIEluY29taW5nIGJ1ZmZlclxuICogQHBhcmFtICAgU3RyaW5nICBlbmNvZGluZyAgVGFyZ2V0IGVuY29kaW5nXG4gKiBAcmV0dXJuICBTdHJpbmdcbiAqL1xuZnVuY3Rpb24gY29udmVydEJvZHkoYnVmZmVyLCBoZWFkZXJzKSB7XG5cdGlmICh0eXBlb2YgY29udmVydCAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdHRocm93IG5ldyBFcnJvcignVGhlIHBhY2thZ2UgYGVuY29kaW5nYCBtdXN0IGJlIGluc3RhbGxlZCB0byB1c2UgdGhlIHRleHRDb252ZXJ0ZWQoKSBmdW5jdGlvbicpO1xuXHR9XG5cblx0Y29uc3QgY3QgPSBoZWFkZXJzLmdldCgnY29udGVudC10eXBlJyk7XG5cdGxldCBjaGFyc2V0ID0gJ3V0Zi04Jztcblx0bGV0IHJlcywgc3RyO1xuXG5cdC8vIGhlYWRlclxuXHRpZiAoY3QpIHtcblx0XHRyZXMgPSAvY2hhcnNldD0oW147XSopL2kuZXhlYyhjdCk7XG5cdH1cblxuXHQvLyBubyBjaGFyc2V0IGluIGNvbnRlbnQgdHlwZSwgcGVlayBhdCByZXNwb25zZSBib2R5IGZvciBhdCBtb3N0IDEwMjQgYnl0ZXNcblx0c3RyID0gYnVmZmVyLnNsaWNlKDAsIDEwMjQpLnRvU3RyaW5nKCk7XG5cblx0Ly8gaHRtbDVcblx0aWYgKCFyZXMgJiYgc3RyKSB7XG5cdFx0cmVzID0gLzxtZXRhLis/Y2hhcnNldD0oWydcIl0pKC4rPylcXDEvaS5leGVjKHN0cik7XG5cdH1cblxuXHQvLyBodG1sNFxuXHRpZiAoIXJlcyAmJiBzdHIpIHtcblx0XHRyZXMgPSAvPG1ldGFbXFxzXSs/aHR0cC1lcXVpdj0oWydcIl0pY29udGVudC10eXBlXFwxW1xcc10rP2NvbnRlbnQ9KFsnXCJdKSguKz8pXFwyL2kuZXhlYyhzdHIpO1xuXG5cdFx0aWYgKHJlcykge1xuXHRcdFx0cmVzID0gL2NoYXJzZXQ9KC4qKS9pLmV4ZWMocmVzLnBvcCgpKTtcblx0XHR9XG5cdH1cblxuXHQvLyB4bWxcblx0aWYgKCFyZXMgJiYgc3RyKSB7XG5cdFx0cmVzID0gLzxcXD94bWwuKz9lbmNvZGluZz0oWydcIl0pKC4rPylcXDEvaS5leGVjKHN0cik7XG5cdH1cblxuXHQvLyBmb3VuZCBjaGFyc2V0XG5cdGlmIChyZXMpIHtcblx0XHRjaGFyc2V0ID0gcmVzLnBvcCgpO1xuXG5cdFx0Ly8gcHJldmVudCBkZWNvZGUgaXNzdWVzIHdoZW4gc2l0ZXMgdXNlIGluY29ycmVjdCBlbmNvZGluZ1xuXHRcdC8vIHJlZjogaHR0cHM6Ly9oc2l2b25lbi5maS9lbmNvZGluZy1tZW51L1xuXHRcdGlmIChjaGFyc2V0ID09PSAnZ2IyMzEyJyB8fCBjaGFyc2V0ID09PSAnZ2JrJykge1xuXHRcdFx0Y2hhcnNldCA9ICdnYjE4MDMwJztcblx0XHR9XG5cdH1cblxuXHQvLyB0dXJuIHJhdyBidWZmZXJzIGludG8gYSBzaW5nbGUgdXRmLTggYnVmZmVyXG5cdHJldHVybiBjb252ZXJ0KGJ1ZmZlciwgJ1VURi04JywgY2hhcnNldCkudG9TdHJpbmcoKTtcbn1cblxuLyoqXG4gKiBEZXRlY3QgYSBVUkxTZWFyY2hQYXJhbXMgb2JqZWN0XG4gKiByZWY6IGh0dHBzOi8vZ2l0aHViLmNvbS9iaXRpbm4vbm9kZS1mZXRjaC9pc3N1ZXMvMjk2I2lzc3VlY29tbWVudC0zMDc1OTgxNDNcbiAqXG4gKiBAcGFyYW0gICBPYmplY3QgIG9iaiAgICAgT2JqZWN0IHRvIGRldGVjdCBieSB0eXBlIG9yIGJyYW5kXG4gKiBAcmV0dXJuICBTdHJpbmdcbiAqL1xuZnVuY3Rpb24gaXNVUkxTZWFyY2hQYXJhbXMob2JqKSB7XG5cdC8vIER1Y2stdHlwaW5nIGFzIGEgbmVjZXNzYXJ5IGNvbmRpdGlvbi5cblx0aWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8IHR5cGVvZiBvYmouYXBwZW5kICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBvYmouZGVsZXRlICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBvYmouZ2V0ICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBvYmouZ2V0QWxsICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBvYmouaGFzICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBvYmouc2V0ICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gQnJhbmQtY2hlY2tpbmcgYW5kIG1vcmUgZHVjay10eXBpbmcgYXMgb3B0aW9uYWwgY29uZGl0aW9uLlxuXHRyZXR1cm4gb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdVUkxTZWFyY2hQYXJhbXMnIHx8IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBVUkxTZWFyY2hQYXJhbXNdJyB8fCB0eXBlb2Ygb2JqLnNvcnQgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYSBXM0MgYEJsb2JgIG9iamVjdCAod2hpY2ggYEZpbGVgIGluaGVyaXRzIGZyb20pXG4gKiBAcGFyYW0gIHsqfSBvYmpcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQmxvYihvYmopIHtcblx0cmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHR5cGVvZiBvYmouYXJyYXlCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG9iai50eXBlID09PSAnc3RyaW5nJyAmJiB0eXBlb2Ygb2JqLnN0cmVhbSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBvYmouY29uc3RydWN0b3IubmFtZSA9PT0gJ3N0cmluZycgJiYgL14oQmxvYnxGaWxlKSQvLnRlc3Qob2JqLmNvbnN0cnVjdG9yLm5hbWUpICYmIC9eKEJsb2J8RmlsZSkkLy50ZXN0KG9ialtTeW1ib2wudG9TdHJpbmdUYWddKTtcbn1cblxuLyoqXG4gKiBDbG9uZSBib2R5IGdpdmVuIFJlcy9SZXEgaW5zdGFuY2VcbiAqXG4gKiBAcGFyYW0gICBNaXhlZCAgaW5zdGFuY2UgIFJlc3BvbnNlIG9yIFJlcXVlc3QgaW5zdGFuY2VcbiAqIEByZXR1cm4gIE1peGVkXG4gKi9cbmZ1bmN0aW9uIGNsb25lKGluc3RhbmNlKSB7XG5cdGxldCBwMSwgcDI7XG5cdGxldCBib2R5ID0gaW5zdGFuY2UuYm9keTtcblxuXHQvLyBkb24ndCBhbGxvdyBjbG9uaW5nIGEgdXNlZCBib2R5XG5cdGlmIChpbnN0YW5jZS5ib2R5VXNlZCkge1xuXHRcdHRocm93IG5ldyBFcnJvcignY2Fubm90IGNsb25lIGJvZHkgYWZ0ZXIgaXQgaXMgdXNlZCcpO1xuXHR9XG5cblx0Ly8gY2hlY2sgdGhhdCBib2R5IGlzIGEgc3RyZWFtIGFuZCBub3QgZm9ybS1kYXRhIG9iamVjdFxuXHQvLyBub3RlOiB3ZSBjYW4ndCBjbG9uZSB0aGUgZm9ybS1kYXRhIG9iamVjdCB3aXRob3V0IGhhdmluZyBpdCBhcyBhIGRlcGVuZGVuY3lcblx0aWYgKGJvZHkgaW5zdGFuY2VvZiBTdHJlYW0gJiYgdHlwZW9mIGJvZHkuZ2V0Qm91bmRhcnkgIT09ICdmdW5jdGlvbicpIHtcblx0XHQvLyB0ZWUgaW5zdGFuY2UgYm9keVxuXHRcdHAxID0gbmV3IFBhc3NUaHJvdWdoKCk7XG5cdFx0cDIgPSBuZXcgUGFzc1Rocm91Z2goKTtcblx0XHRib2R5LnBpcGUocDEpO1xuXHRcdGJvZHkucGlwZShwMik7XG5cdFx0Ly8gc2V0IGluc3RhbmNlIGJvZHkgdG8gdGVlZCBib2R5IGFuZCByZXR1cm4gdGhlIG90aGVyIHRlZWQgYm9keVxuXHRcdGluc3RhbmNlW0lOVEVSTkFMU10uYm9keSA9IHAxO1xuXHRcdGJvZHkgPSBwMjtcblx0fVxuXG5cdHJldHVybiBib2R5O1xufVxuXG4vKipcbiAqIFBlcmZvcm1zIHRoZSBvcGVyYXRpb24gXCJleHRyYWN0IGEgYENvbnRlbnQtVHlwZWAgdmFsdWUgZnJvbSB8b2JqZWN0fFwiIGFzXG4gKiBzcGVjaWZpZWQgaW4gdGhlIHNwZWNpZmljYXRpb246XG4gKiBodHRwczovL2ZldGNoLnNwZWMud2hhdHdnLm9yZy8jY29uY2VwdC1ib2R5aW5pdC1leHRyYWN0XG4gKlxuICogVGhpcyBmdW5jdGlvbiBhc3N1bWVzIHRoYXQgaW5zdGFuY2UuYm9keSBpcyBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSAgIE1peGVkICBpbnN0YW5jZSAgQW55IG9wdGlvbnMuYm9keSBpbnB1dFxuICovXG5mdW5jdGlvbiBleHRyYWN0Q29udGVudFR5cGUoYm9keSkge1xuXHRpZiAoYm9keSA9PT0gbnVsbCkge1xuXHRcdC8vIGJvZHkgaXMgbnVsbFxuXHRcdHJldHVybiBudWxsO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuXHRcdC8vIGJvZHkgaXMgc3RyaW5nXG5cdFx0cmV0dXJuICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnO1xuXHR9IGVsc2UgaWYgKGlzVVJMU2VhcmNoUGFyYW1zKGJvZHkpKSB7XG5cdFx0Ly8gYm9keSBpcyBhIFVSTFNlYXJjaFBhcmFtc1xuXHRcdHJldHVybiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnO1xuXHR9IGVsc2UgaWYgKGlzQmxvYihib2R5KSkge1xuXHRcdC8vIGJvZHkgaXMgYmxvYlxuXHRcdHJldHVybiBib2R5LnR5cGUgfHwgbnVsbDtcblx0fSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIoYm9keSkpIHtcblx0XHQvLyBib2R5IGlzIGJ1ZmZlclxuXHRcdHJldHVybiBudWxsO1xuXHR9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChib2R5KSA9PT0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJykge1xuXHRcdC8vIGJvZHkgaXMgQXJyYXlCdWZmZXJcblx0XHRyZXR1cm4gbnVsbDtcblx0fSBlbHNlIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoYm9keSkpIHtcblx0XHQvLyBib2R5IGlzIEFycmF5QnVmZmVyVmlld1xuXHRcdHJldHVybiBudWxsO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBib2R5LmdldEJvdW5kYXJ5ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Ly8gZGV0ZWN0IGZvcm0gZGF0YSBpbnB1dCBmcm9tIGZvcm0tZGF0YSBtb2R1bGVcblx0XHRyZXR1cm4gYG11bHRpcGFydC9mb3JtLWRhdGE7Ym91bmRhcnk9JHtib2R5LmdldEJvdW5kYXJ5KCl9YDtcblx0fSBlbHNlIGlmIChib2R5IGluc3RhbmNlb2YgU3RyZWFtKSB7XG5cdFx0Ly8gYm9keSBpcyBzdHJlYW1cblx0XHQvLyBjYW4ndCByZWFsbHkgZG8gbXVjaCBhYm91dCB0aGlzXG5cdFx0cmV0dXJuIG51bGw7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gQm9keSBjb25zdHJ1Y3RvciBkZWZhdWx0cyBvdGhlciB0aGluZ3MgdG8gc3RyaW5nXG5cdFx0cmV0dXJuICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnO1xuXHR9XG59XG5cbi8qKlxuICogVGhlIEZldGNoIFN0YW5kYXJkIHRyZWF0cyB0aGlzIGFzIGlmIFwidG90YWwgYnl0ZXNcIiBpcyBhIHByb3BlcnR5IG9uIHRoZSBib2R5LlxuICogRm9yIHVzLCB3ZSBoYXZlIHRvIGV4cGxpY2l0bHkgZ2V0IGl0IHdpdGggYSBmdW5jdGlvbi5cbiAqXG4gKiByZWY6IGh0dHBzOi8vZmV0Y2guc3BlYy53aGF0d2cub3JnLyNjb25jZXB0LWJvZHktdG90YWwtYnl0ZXNcbiAqXG4gKiBAcGFyYW0gICBCb2R5ICAgIGluc3RhbmNlICAgSW5zdGFuY2Ugb2YgQm9keVxuICogQHJldHVybiAgTnVtYmVyPyAgICAgICAgICAgIE51bWJlciBvZiBieXRlcywgb3IgbnVsbCBpZiBub3QgcG9zc2libGVcbiAqL1xuZnVuY3Rpb24gZ2V0VG90YWxCeXRlcyhpbnN0YW5jZSkge1xuXHRjb25zdCBib2R5ID0gaW5zdGFuY2UuYm9keTtcblxuXG5cdGlmIChib2R5ID09PSBudWxsKSB7XG5cdFx0Ly8gYm9keSBpcyBudWxsXG5cdFx0cmV0dXJuIDA7XG5cdH0gZWxzZSBpZiAoaXNCbG9iKGJvZHkpKSB7XG5cdFx0cmV0dXJuIGJvZHkuc2l6ZTtcblx0fSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIoYm9keSkpIHtcblx0XHQvLyBib2R5IGlzIGJ1ZmZlclxuXHRcdHJldHVybiBib2R5Lmxlbmd0aDtcblx0fSBlbHNlIGlmIChib2R5ICYmIHR5cGVvZiBib2R5LmdldExlbmd0aFN5bmMgPT09ICdmdW5jdGlvbicpIHtcblx0XHQvLyBkZXRlY3QgZm9ybSBkYXRhIGlucHV0IGZyb20gZm9ybS1kYXRhIG1vZHVsZVxuXHRcdGlmIChib2R5Ll9sZW5ndGhSZXRyaWV2ZXJzICYmIGJvZHkuX2xlbmd0aFJldHJpZXZlcnMubGVuZ3RoID09IDAgfHwgLy8gMS54XG5cdFx0Ym9keS5oYXNLbm93bkxlbmd0aCAmJiBib2R5Lmhhc0tub3duTGVuZ3RoKCkpIHtcblx0XHRcdC8vIDIueFxuXHRcdFx0cmV0dXJuIGJvZHkuZ2V0TGVuZ3RoU3luYygpO1xuXHRcdH1cblx0XHRyZXR1cm4gbnVsbDtcblx0fSBlbHNlIHtcblx0XHQvLyBib2R5IGlzIHN0cmVhbVxuXHRcdHJldHVybiBudWxsO1xuXHR9XG59XG5cbi8qKlxuICogV3JpdGUgYSBCb2R5IHRvIGEgTm9kZS5qcyBXcml0YWJsZVN0cmVhbSAoZS5nLiBodHRwLlJlcXVlc3QpIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gICBCb2R5ICAgIGluc3RhbmNlICAgSW5zdGFuY2Ugb2YgQm9keVxuICogQHJldHVybiAgVm9pZFxuICovXG5mdW5jdGlvbiB3cml0ZVRvU3RyZWFtKGRlc3QsIGluc3RhbmNlKSB7XG5cdGNvbnN0IGJvZHkgPSBpbnN0YW5jZS5ib2R5O1xuXG5cblx0aWYgKGJvZHkgPT09IG51bGwpIHtcblx0XHQvLyBib2R5IGlzIG51bGxcblx0XHRkZXN0LmVuZCgpO1xuXHR9IGVsc2UgaWYgKGlzQmxvYihib2R5KSkge1xuXHRcdGJvZHkuc3RyZWFtKCkucGlwZShkZXN0KTtcblx0fSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIoYm9keSkpIHtcblx0XHQvLyBib2R5IGlzIGJ1ZmZlclxuXHRcdGRlc3Qud3JpdGUoYm9keSk7XG5cdFx0ZGVzdC5lbmQoKTtcblx0fSBlbHNlIHtcblx0XHQvLyBib2R5IGlzIHN0cmVhbVxuXHRcdGJvZHkucGlwZShkZXN0KTtcblx0fVxufVxuXG4vLyBleHBvc2UgUHJvbWlzZVxuQm9keS5Qcm9taXNlID0gZ2xvYmFsLlByb21pc2U7XG5cbi8qKlxuICogaGVhZGVycy5qc1xuICpcbiAqIEhlYWRlcnMgY2xhc3Mgb2ZmZXJzIGNvbnZlbmllbnQgaGVscGVyc1xuICovXG5cbmNvbnN0IGludmFsaWRUb2tlblJlZ2V4ID0gL1teXFxeX2BhLXpBLVpcXC0wLTkhIyQlJicqKy58fl0vO1xuY29uc3QgaW52YWxpZEhlYWRlckNoYXJSZWdleCA9IC9bXlxcdFxceDIwLVxceDdlXFx4ODAtXFx4ZmZdLztcblxuZnVuY3Rpb24gdmFsaWRhdGVOYW1lKG5hbWUpIHtcblx0bmFtZSA9IGAke25hbWV9YDtcblx0aWYgKGludmFsaWRUb2tlblJlZ2V4LnRlc3QobmFtZSkgfHwgbmFtZSA9PT0gJycpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGAke25hbWV9IGlzIG5vdCBhIGxlZ2FsIEhUVFAgaGVhZGVyIG5hbWVgKTtcblx0fVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZVZhbHVlKHZhbHVlKSB7XG5cdHZhbHVlID0gYCR7dmFsdWV9YDtcblx0aWYgKGludmFsaWRIZWFkZXJDaGFyUmVnZXgudGVzdCh2YWx1ZSkpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGAke3ZhbHVlfSBpcyBub3QgYSBsZWdhbCBIVFRQIGhlYWRlciB2YWx1ZWApO1xuXHR9XG59XG5cbi8qKlxuICogRmluZCB0aGUga2V5IGluIHRoZSBtYXAgb2JqZWN0IGdpdmVuIGEgaGVhZGVyIG5hbWUuXG4gKlxuICogUmV0dXJucyB1bmRlZmluZWQgaWYgbm90IGZvdW5kLlxuICpcbiAqIEBwYXJhbSAgIFN0cmluZyAgbmFtZSAgSGVhZGVyIG5hbWVcbiAqIEByZXR1cm4gIFN0cmluZ3xVbmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gZmluZChtYXAsIG5hbWUpIHtcblx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0Zm9yIChjb25zdCBrZXkgaW4gbWFwKSB7XG5cdFx0aWYgKGtleS50b0xvd2VyQ2FzZSgpID09PSBuYW1lKSB7XG5cdFx0XHRyZXR1cm4ga2V5O1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5jb25zdCBNQVAgPSBTeW1ib2woJ21hcCcpO1xuY2xhc3MgSGVhZGVycyB7XG5cdC8qKlxuICAqIEhlYWRlcnMgY2xhc3NcbiAgKlxuICAqIEBwYXJhbSAgIE9iamVjdCAgaGVhZGVycyAgUmVzcG9uc2UgaGVhZGVyc1xuICAqIEByZXR1cm4gIFZvaWRcbiAgKi9cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0bGV0IGluaXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IHVuZGVmaW5lZDtcblxuXHRcdHRoaXNbTUFQXSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cblx0XHRpZiAoaW5pdCBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcblx0XHRcdGNvbnN0IHJhd0hlYWRlcnMgPSBpbml0LnJhdygpO1xuXHRcdFx0Y29uc3QgaGVhZGVyTmFtZXMgPSBPYmplY3Qua2V5cyhyYXdIZWFkZXJzKTtcblxuXHRcdFx0Zm9yIChjb25zdCBoZWFkZXJOYW1lIG9mIGhlYWRlck5hbWVzKSB7XG5cdFx0XHRcdGZvciAoY29uc3QgdmFsdWUgb2YgcmF3SGVhZGVyc1toZWFkZXJOYW1lXSkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kKGhlYWRlck5hbWUsIHZhbHVlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gV2UgZG9uJ3Qgd29ycnkgYWJvdXQgY29udmVydGluZyBwcm9wIHRvIEJ5dGVTdHJpbmcgaGVyZSBhcyBhcHBlbmQoKVxuXHRcdC8vIHdpbGwgaGFuZGxlIGl0LlxuXHRcdGlmIChpbml0ID09IG51bGwpIDsgZWxzZSBpZiAodHlwZW9mIGluaXQgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRjb25zdCBtZXRob2QgPSBpbml0W1N5bWJvbC5pdGVyYXRvcl07XG5cdFx0XHRpZiAobWV0aG9kICE9IG51bGwpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBtZXRob2QgIT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdIZWFkZXIgcGFpcnMgbXVzdCBiZSBpdGVyYWJsZScpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gc2VxdWVuY2U8c2VxdWVuY2U8Qnl0ZVN0cmluZz4+XG5cdFx0XHRcdC8vIE5vdGU6IHBlciBzcGVjIHdlIGhhdmUgdG8gZmlyc3QgZXhoYXVzdCB0aGUgbGlzdHMgdGhlbiBwcm9jZXNzIHRoZW1cblx0XHRcdFx0Y29uc3QgcGFpcnMgPSBbXTtcblx0XHRcdFx0Zm9yIChjb25zdCBwYWlyIG9mIGluaXQpIHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIHBhaXIgIT09ICdvYmplY3QnIHx8IHR5cGVvZiBwYWlyW1N5bWJvbC5pdGVyYXRvcl0gIT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0VhY2ggaGVhZGVyIHBhaXIgbXVzdCBiZSBpdGVyYWJsZScpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwYWlycy5wdXNoKEFycmF5LmZyb20ocGFpcikpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yIChjb25zdCBwYWlyIG9mIHBhaXJzKSB7XG5cdFx0XHRcdFx0aWYgKHBhaXIubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdFYWNoIGhlYWRlciBwYWlyIG11c3QgYmUgYSBuYW1lL3ZhbHVlIHR1cGxlJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuYXBwZW5kKHBhaXJbMF0sIHBhaXJbMV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyByZWNvcmQ8Qnl0ZVN0cmluZywgQnl0ZVN0cmluZz5cblx0XHRcdFx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoaW5pdCkpIHtcblx0XHRcdFx0XHRjb25zdCB2YWx1ZSA9IGluaXRba2V5XTtcblx0XHRcdFx0XHR0aGlzLmFwcGVuZChrZXksIHZhbHVlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm92aWRlZCBpbml0aWFsaXplciBtdXN0IGJlIGFuIG9iamVjdCcpO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuICAqIFJldHVybiBjb21iaW5lZCBoZWFkZXIgdmFsdWUgZ2l2ZW4gbmFtZVxuICAqXG4gICogQHBhcmFtICAgU3RyaW5nICBuYW1lICBIZWFkZXIgbmFtZVxuICAqIEByZXR1cm4gIE1peGVkXG4gICovXG5cdGdldChuYW1lKSB7XG5cdFx0bmFtZSA9IGAke25hbWV9YDtcblx0XHR2YWxpZGF0ZU5hbWUobmFtZSk7XG5cdFx0Y29uc3Qga2V5ID0gZmluZCh0aGlzW01BUF0sIG5hbWUpO1xuXHRcdGlmIChrZXkgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXNbTUFQXVtrZXldLmpvaW4oJywgJyk7XG5cdH1cblxuXHQvKipcbiAgKiBJdGVyYXRlIG92ZXIgYWxsIGhlYWRlcnNcbiAgKlxuICAqIEBwYXJhbSAgIEZ1bmN0aW9uICBjYWxsYmFjayAgRXhlY3V0ZWQgZm9yIGVhY2ggaXRlbSB3aXRoIHBhcmFtZXRlcnMgKHZhbHVlLCBuYW1lLCB0aGlzQXJnKVxuICAqIEBwYXJhbSAgIEJvb2xlYW4gICB0aGlzQXJnICAgYHRoaXNgIGNvbnRleHQgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICogQHJldHVybiAgVm9pZFxuICAqL1xuXHRmb3JFYWNoKGNhbGxiYWNrKSB7XG5cdFx0bGV0IHRoaXNBcmcgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHVuZGVmaW5lZDtcblxuXHRcdGxldCBwYWlycyA9IGdldEhlYWRlcnModGhpcyk7XG5cdFx0bGV0IGkgPSAwO1xuXHRcdHdoaWxlIChpIDwgcGFpcnMubGVuZ3RoKSB7XG5cdFx0XHR2YXIgX3BhaXJzJGkgPSBwYWlyc1tpXTtcblx0XHRcdGNvbnN0IG5hbWUgPSBfcGFpcnMkaVswXSxcblx0XHRcdCAgICAgIHZhbHVlID0gX3BhaXJzJGlbMV07XG5cblx0XHRcdGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdmFsdWUsIG5hbWUsIHRoaXMpO1xuXHRcdFx0cGFpcnMgPSBnZXRIZWFkZXJzKHRoaXMpO1xuXHRcdFx0aSsrO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuICAqIE92ZXJ3cml0ZSBoZWFkZXIgdmFsdWVzIGdpdmVuIG5hbWVcbiAgKlxuICAqIEBwYXJhbSAgIFN0cmluZyAgbmFtZSAgIEhlYWRlciBuYW1lXG4gICogQHBhcmFtICAgU3RyaW5nICB2YWx1ZSAgSGVhZGVyIHZhbHVlXG4gICogQHJldHVybiAgVm9pZFxuICAqL1xuXHRzZXQobmFtZSwgdmFsdWUpIHtcblx0XHRuYW1lID0gYCR7bmFtZX1gO1xuXHRcdHZhbHVlID0gYCR7dmFsdWV9YDtcblx0XHR2YWxpZGF0ZU5hbWUobmFtZSk7XG5cdFx0dmFsaWRhdGVWYWx1ZSh2YWx1ZSk7XG5cdFx0Y29uc3Qga2V5ID0gZmluZCh0aGlzW01BUF0sIG5hbWUpO1xuXHRcdHRoaXNbTUFQXVtrZXkgIT09IHVuZGVmaW5lZCA/IGtleSA6IG5hbWVdID0gW3ZhbHVlXTtcblx0fVxuXG5cdC8qKlxuICAqIEFwcGVuZCBhIHZhbHVlIG9udG8gZXhpc3RpbmcgaGVhZGVyXG4gICpcbiAgKiBAcGFyYW0gICBTdHJpbmcgIG5hbWUgICBIZWFkZXIgbmFtZVxuICAqIEBwYXJhbSAgIFN0cmluZyAgdmFsdWUgIEhlYWRlciB2YWx1ZVxuICAqIEByZXR1cm4gIFZvaWRcbiAgKi9cblx0YXBwZW5kKG5hbWUsIHZhbHVlKSB7XG5cdFx0bmFtZSA9IGAke25hbWV9YDtcblx0XHR2YWx1ZSA9IGAke3ZhbHVlfWA7XG5cdFx0dmFsaWRhdGVOYW1lKG5hbWUpO1xuXHRcdHZhbGlkYXRlVmFsdWUodmFsdWUpO1xuXHRcdGNvbnN0IGtleSA9IGZpbmQodGhpc1tNQVBdLCBuYW1lKTtcblx0XHRpZiAoa2V5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXNbTUFQXVtrZXldLnB1c2godmFsdWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzW01BUF1bbmFtZV0gPSBbdmFsdWVdO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuICAqIENoZWNrIGZvciBoZWFkZXIgbmFtZSBleGlzdGVuY2VcbiAgKlxuICAqIEBwYXJhbSAgIFN0cmluZyAgIG5hbWUgIEhlYWRlciBuYW1lXG4gICogQHJldHVybiAgQm9vbGVhblxuICAqL1xuXHRoYXMobmFtZSkge1xuXHRcdG5hbWUgPSBgJHtuYW1lfWA7XG5cdFx0dmFsaWRhdGVOYW1lKG5hbWUpO1xuXHRcdHJldHVybiBmaW5kKHRoaXNbTUFQXSwgbmFtZSkgIT09IHVuZGVmaW5lZDtcblx0fVxuXG5cdC8qKlxuICAqIERlbGV0ZSBhbGwgaGVhZGVyIHZhbHVlcyBnaXZlbiBuYW1lXG4gICpcbiAgKiBAcGFyYW0gICBTdHJpbmcgIG5hbWUgIEhlYWRlciBuYW1lXG4gICogQHJldHVybiAgVm9pZFxuICAqL1xuXHRkZWxldGUobmFtZSkge1xuXHRcdG5hbWUgPSBgJHtuYW1lfWA7XG5cdFx0dmFsaWRhdGVOYW1lKG5hbWUpO1xuXHRcdGNvbnN0IGtleSA9IGZpbmQodGhpc1tNQVBdLCBuYW1lKTtcblx0XHRpZiAoa2V5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGRlbGV0ZSB0aGlzW01BUF1ba2V5XTtcblx0XHR9XG5cdH1cblxuXHQvKipcbiAgKiBSZXR1cm4gcmF3IGhlYWRlcnMgKG5vbi1zcGVjIGFwaSlcbiAgKlxuICAqIEByZXR1cm4gIE9iamVjdFxuICAqL1xuXHRyYXcoKSB7XG5cdFx0cmV0dXJuIHRoaXNbTUFQXTtcblx0fVxuXG5cdC8qKlxuICAqIEdldCBhbiBpdGVyYXRvciBvbiBrZXlzLlxuICAqXG4gICogQHJldHVybiAgSXRlcmF0b3JcbiAgKi9cblx0a2V5cygpIHtcblx0XHRyZXR1cm4gY3JlYXRlSGVhZGVyc0l0ZXJhdG9yKHRoaXMsICdrZXknKTtcblx0fVxuXG5cdC8qKlxuICAqIEdldCBhbiBpdGVyYXRvciBvbiB2YWx1ZXMuXG4gICpcbiAgKiBAcmV0dXJuICBJdGVyYXRvclxuICAqL1xuXHR2YWx1ZXMoKSB7XG5cdFx0cmV0dXJuIGNyZWF0ZUhlYWRlcnNJdGVyYXRvcih0aGlzLCAndmFsdWUnKTtcblx0fVxuXG5cdC8qKlxuICAqIEdldCBhbiBpdGVyYXRvciBvbiBlbnRyaWVzLlxuICAqXG4gICogVGhpcyBpcyB0aGUgZGVmYXVsdCBpdGVyYXRvciBvZiB0aGUgSGVhZGVycyBvYmplY3QuXG4gICpcbiAgKiBAcmV0dXJuICBJdGVyYXRvclxuICAqL1xuXHRbU3ltYm9sLml0ZXJhdG9yXSgpIHtcblx0XHRyZXR1cm4gY3JlYXRlSGVhZGVyc0l0ZXJhdG9yKHRoaXMsICdrZXkrdmFsdWUnKTtcblx0fVxufVxuSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShIZWFkZXJzLnByb3RvdHlwZSwgU3ltYm9sLnRvU3RyaW5nVGFnLCB7XG5cdHZhbHVlOiAnSGVhZGVycycsXG5cdHdyaXRhYmxlOiBmYWxzZSxcblx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdGNvbmZpZ3VyYWJsZTogdHJ1ZVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEhlYWRlcnMucHJvdG90eXBlLCB7XG5cdGdldDogeyBlbnVtZXJhYmxlOiB0cnVlIH0sXG5cdGZvckVhY2g6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRzZXQ6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRhcHBlbmQ6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRoYXM6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRkZWxldGU6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRrZXlzOiB7IGVudW1lcmFibGU6IHRydWUgfSxcblx0dmFsdWVzOiB7IGVudW1lcmFibGU6IHRydWUgfSxcblx0ZW50cmllczogeyBlbnVtZXJhYmxlOiB0cnVlIH1cbn0pO1xuXG5mdW5jdGlvbiBnZXRIZWFkZXJzKGhlYWRlcnMpIHtcblx0bGV0IGtpbmQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6ICdrZXkrdmFsdWUnO1xuXG5cdGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhoZWFkZXJzW01BUF0pLnNvcnQoKTtcblx0cmV0dXJuIGtleXMubWFwKGtpbmQgPT09ICdrZXknID8gZnVuY3Rpb24gKGspIHtcblx0XHRyZXR1cm4gay50b0xvd2VyQ2FzZSgpO1xuXHR9IDoga2luZCA9PT0gJ3ZhbHVlJyA/IGZ1bmN0aW9uIChrKSB7XG5cdFx0cmV0dXJuIGhlYWRlcnNbTUFQXVtrXS5qb2luKCcsICcpO1xuXHR9IDogZnVuY3Rpb24gKGspIHtcblx0XHRyZXR1cm4gW2sudG9Mb3dlckNhc2UoKSwgaGVhZGVyc1tNQVBdW2tdLmpvaW4oJywgJyldO1xuXHR9KTtcbn1cblxuY29uc3QgSU5URVJOQUwgPSBTeW1ib2woJ2ludGVybmFsJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZUhlYWRlcnNJdGVyYXRvcih0YXJnZXQsIGtpbmQpIHtcblx0Y29uc3QgaXRlcmF0b3IgPSBPYmplY3QuY3JlYXRlKEhlYWRlcnNJdGVyYXRvclByb3RvdHlwZSk7XG5cdGl0ZXJhdG9yW0lOVEVSTkFMXSA9IHtcblx0XHR0YXJnZXQsXG5cdFx0a2luZCxcblx0XHRpbmRleDogMFxuXHR9O1xuXHRyZXR1cm4gaXRlcmF0b3I7XG59XG5cbmNvbnN0IEhlYWRlcnNJdGVyYXRvclByb3RvdHlwZSA9IE9iamVjdC5zZXRQcm90b3R5cGVPZih7XG5cdG5leHQoKSB7XG5cdFx0Ly8gaXN0YW5idWwgaWdub3JlIGlmXG5cdFx0aWYgKCF0aGlzIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKSAhPT0gSGVhZGVyc0l0ZXJhdG9yUHJvdG90eXBlKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdWYWx1ZSBvZiBgdGhpc2AgaXMgbm90IGEgSGVhZGVyc0l0ZXJhdG9yJyk7XG5cdFx0fVxuXG5cdFx0dmFyIF9JTlRFUk5BTCA9IHRoaXNbSU5URVJOQUxdO1xuXHRcdGNvbnN0IHRhcmdldCA9IF9JTlRFUk5BTC50YXJnZXQsXG5cdFx0ICAgICAga2luZCA9IF9JTlRFUk5BTC5raW5kLFxuXHRcdCAgICAgIGluZGV4ID0gX0lOVEVSTkFMLmluZGV4O1xuXG5cdFx0Y29uc3QgdmFsdWVzID0gZ2V0SGVhZGVycyh0YXJnZXQsIGtpbmQpO1xuXHRcdGNvbnN0IGxlbiA9IHZhbHVlcy5sZW5ndGg7XG5cdFx0aWYgKGluZGV4ID49IGxlbikge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dmFsdWU6IHVuZGVmaW5lZCxcblx0XHRcdFx0ZG9uZTogdHJ1ZVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHR0aGlzW0lOVEVSTkFMXS5pbmRleCA9IGluZGV4ICsgMTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHR2YWx1ZTogdmFsdWVzW2luZGV4XSxcblx0XHRcdGRvbmU6IGZhbHNlXG5cdFx0fTtcblx0fVxufSwgT2JqZWN0LmdldFByb3RvdHlwZU9mKE9iamVjdC5nZXRQcm90b3R5cGVPZihbXVtTeW1ib2wuaXRlcmF0b3JdKCkpKSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShIZWFkZXJzSXRlcmF0b3JQcm90b3R5cGUsIFN5bWJvbC50b1N0cmluZ1RhZywge1xuXHR2YWx1ZTogJ0hlYWRlcnNJdGVyYXRvcicsXG5cdHdyaXRhYmxlOiBmYWxzZSxcblx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdGNvbmZpZ3VyYWJsZTogdHJ1ZVxufSk7XG5cbi8qKlxuICogRXhwb3J0IHRoZSBIZWFkZXJzIG9iamVjdCBpbiBhIGZvcm0gdGhhdCBOb2RlLmpzIGNhbiBjb25zdW1lLlxuICpcbiAqIEBwYXJhbSAgIEhlYWRlcnMgIGhlYWRlcnNcbiAqIEByZXR1cm4gIE9iamVjdFxuICovXG5mdW5jdGlvbiBleHBvcnROb2RlQ29tcGF0aWJsZUhlYWRlcnMoaGVhZGVycykge1xuXHRjb25zdCBvYmogPSBPYmplY3QuYXNzaWduKHsgX19wcm90b19fOiBudWxsIH0sIGhlYWRlcnNbTUFQXSk7XG5cblx0Ly8gaHR0cC5yZXF1ZXN0KCkgb25seSBzdXBwb3J0cyBzdHJpbmcgYXMgSG9zdCBoZWFkZXIuIFRoaXMgaGFjayBtYWtlc1xuXHQvLyBzcGVjaWZ5aW5nIGN1c3RvbSBIb3N0IGhlYWRlciBwb3NzaWJsZS5cblx0Y29uc3QgaG9zdEhlYWRlcktleSA9IGZpbmQoaGVhZGVyc1tNQVBdLCAnSG9zdCcpO1xuXHRpZiAoaG9zdEhlYWRlcktleSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0b2JqW2hvc3RIZWFkZXJLZXldID0gb2JqW2hvc3RIZWFkZXJLZXldWzBdO1xuXHR9XG5cblx0cmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBIZWFkZXJzIG9iamVjdCBmcm9tIGFuIG9iamVjdCBvZiBoZWFkZXJzLCBpZ25vcmluZyB0aG9zZSB0aGF0IGRvXG4gKiBub3QgY29uZm9ybSB0byBIVFRQIGdyYW1tYXIgcHJvZHVjdGlvbnMuXG4gKlxuICogQHBhcmFtICAgT2JqZWN0ICBvYmogIE9iamVjdCBvZiBoZWFkZXJzXG4gKiBAcmV0dXJuICBIZWFkZXJzXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhlYWRlcnNMZW5pZW50KG9iaikge1xuXHRjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKTtcblx0Zm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKG9iaikpIHtcblx0XHRpZiAoaW52YWxpZFRva2VuUmVnZXgudGVzdChuYW1lKSkge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXHRcdGlmIChBcnJheS5pc0FycmF5KG9ialtuYW1lXSkpIHtcblx0XHRcdGZvciAoY29uc3QgdmFsIG9mIG9ialtuYW1lXSkge1xuXHRcdFx0XHRpZiAoaW52YWxpZEhlYWRlckNoYXJSZWdleC50ZXN0KHZhbCkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoaGVhZGVyc1tNQVBdW25hbWVdID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRoZWFkZXJzW01BUF1bbmFtZV0gPSBbdmFsXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRoZWFkZXJzW01BUF1bbmFtZV0ucHVzaCh2YWwpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICghaW52YWxpZEhlYWRlckNoYXJSZWdleC50ZXN0KG9ialtuYW1lXSkpIHtcblx0XHRcdGhlYWRlcnNbTUFQXVtuYW1lXSA9IFtvYmpbbmFtZV1dO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gaGVhZGVycztcbn1cblxuY29uc3QgSU5URVJOQUxTJDEgPSBTeW1ib2woJ1Jlc3BvbnNlIGludGVybmFscycpO1xuXG4vLyBmaXggYW4gaXNzdWUgd2hlcmUgXCJTVEFUVVNfQ09ERVNcIiBhcmVuJ3QgYSBuYW1lZCBleHBvcnQgZm9yIG5vZGUgPDEwXG5jb25zdCBTVEFUVVNfQ09ERVMgPSBodHRwLlNUQVRVU19DT0RFUztcblxuLyoqXG4gKiBSZXNwb25zZSBjbGFzc1xuICpcbiAqIEBwYXJhbSAgIFN0cmVhbSAgYm9keSAgUmVhZGFibGUgc3RyZWFtXG4gKiBAcGFyYW0gICBPYmplY3QgIG9wdHMgIFJlc3BvbnNlIG9wdGlvbnNcbiAqIEByZXR1cm4gIFZvaWRcbiAqL1xuY2xhc3MgUmVzcG9uc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRsZXQgYm9keSA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogbnVsbDtcblx0XHRsZXQgb3B0cyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDoge307XG5cblx0XHRCb2R5LmNhbGwodGhpcywgYm9keSwgb3B0cyk7XG5cblx0XHRjb25zdCBzdGF0dXMgPSBvcHRzLnN0YXR1cyB8fCAyMDA7XG5cdFx0Y29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdHMuaGVhZGVycyk7XG5cblx0XHRpZiAoYm9keSAhPSBudWxsICYmICFoZWFkZXJzLmhhcygnQ29udGVudC1UeXBlJykpIHtcblx0XHRcdGNvbnN0IGNvbnRlbnRUeXBlID0gZXh0cmFjdENvbnRlbnRUeXBlKGJvZHkpO1xuXHRcdFx0aWYgKGNvbnRlbnRUeXBlKSB7XG5cdFx0XHRcdGhlYWRlcnMuYXBwZW5kKCdDb250ZW50LVR5cGUnLCBjb250ZW50VHlwZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpc1tJTlRFUk5BTFMkMV0gPSB7XG5cdFx0XHR1cmw6IG9wdHMudXJsLFxuXHRcdFx0c3RhdHVzLFxuXHRcdFx0c3RhdHVzVGV4dDogb3B0cy5zdGF0dXNUZXh0IHx8IFNUQVRVU19DT0RFU1tzdGF0dXNdLFxuXHRcdFx0aGVhZGVycyxcblx0XHRcdGNvdW50ZXI6IG9wdHMuY291bnRlclxuXHRcdH07XG5cdH1cblxuXHRnZXQgdXJsKCkge1xuXHRcdHJldHVybiB0aGlzW0lOVEVSTkFMUyQxXS51cmwgfHwgJyc7XG5cdH1cblxuXHRnZXQgc3RhdHVzKCkge1xuXHRcdHJldHVybiB0aGlzW0lOVEVSTkFMUyQxXS5zdGF0dXM7XG5cdH1cblxuXHQvKipcbiAgKiBDb252ZW5pZW5jZSBwcm9wZXJ0eSByZXByZXNlbnRpbmcgaWYgdGhlIHJlcXVlc3QgZW5kZWQgbm9ybWFsbHlcbiAgKi9cblx0Z2V0IG9rKCkge1xuXHRcdHJldHVybiB0aGlzW0lOVEVSTkFMUyQxXS5zdGF0dXMgPj0gMjAwICYmIHRoaXNbSU5URVJOQUxTJDFdLnN0YXR1cyA8IDMwMDtcblx0fVxuXG5cdGdldCByZWRpcmVjdGVkKCkge1xuXHRcdHJldHVybiB0aGlzW0lOVEVSTkFMUyQxXS5jb3VudGVyID4gMDtcblx0fVxuXG5cdGdldCBzdGF0dXNUZXh0KCkge1xuXHRcdHJldHVybiB0aGlzW0lOVEVSTkFMUyQxXS5zdGF0dXNUZXh0O1xuXHR9XG5cblx0Z2V0IGhlYWRlcnMoKSB7XG5cdFx0cmV0dXJuIHRoaXNbSU5URVJOQUxTJDFdLmhlYWRlcnM7XG5cdH1cblxuXHQvKipcbiAgKiBDbG9uZSB0aGlzIHJlc3BvbnNlXG4gICpcbiAgKiBAcmV0dXJuICBSZXNwb25zZVxuICAqL1xuXHRjbG9uZSgpIHtcblx0XHRyZXR1cm4gbmV3IFJlc3BvbnNlKGNsb25lKHRoaXMpLCB7XG5cdFx0XHR1cmw6IHRoaXMudXJsLFxuXHRcdFx0c3RhdHVzOiB0aGlzLnN0YXR1cyxcblx0XHRcdHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcblx0XHRcdGhlYWRlcnM6IHRoaXMuaGVhZGVycyxcblx0XHRcdG9rOiB0aGlzLm9rLFxuXHRcdFx0cmVkaXJlY3RlZDogdGhpcy5yZWRpcmVjdGVkXG5cdFx0fSk7XG5cdH1cbn1cblxuQm9keS5taXhJbihSZXNwb25zZS5wcm90b3R5cGUpO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhSZXNwb25zZS5wcm90b3R5cGUsIHtcblx0dXJsOiB7IGVudW1lcmFibGU6IHRydWUgfSxcblx0c3RhdHVzOiB7IGVudW1lcmFibGU6IHRydWUgfSxcblx0b2s6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRyZWRpcmVjdGVkOiB7IGVudW1lcmFibGU6IHRydWUgfSxcblx0c3RhdHVzVGV4dDogeyBlbnVtZXJhYmxlOiB0cnVlIH0sXG5cdGhlYWRlcnM6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRjbG9uZTogeyBlbnVtZXJhYmxlOiB0cnVlIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUmVzcG9uc2UucHJvdG90eXBlLCBTeW1ib2wudG9TdHJpbmdUYWcsIHtcblx0dmFsdWU6ICdSZXNwb25zZScsXG5cdHdyaXRhYmxlOiBmYWxzZSxcblx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdGNvbmZpZ3VyYWJsZTogdHJ1ZVxufSk7XG5cbmNvbnN0IElOVEVSTkFMUyQyID0gU3ltYm9sKCdSZXF1ZXN0IGludGVybmFscycpO1xuXG4vLyBmaXggYW4gaXNzdWUgd2hlcmUgXCJmb3JtYXRcIiwgXCJwYXJzZVwiIGFyZW4ndCBhIG5hbWVkIGV4cG9ydCBmb3Igbm9kZSA8MTBcbmNvbnN0IHBhcnNlX3VybCA9IFVybC5wYXJzZTtcbmNvbnN0IGZvcm1hdF91cmwgPSBVcmwuZm9ybWF0O1xuXG5jb25zdCBzdHJlYW1EZXN0cnVjdGlvblN1cHBvcnRlZCA9ICdkZXN0cm95JyBpbiBTdHJlYW0uUmVhZGFibGUucHJvdG90eXBlO1xuXG4vKipcbiAqIENoZWNrIGlmIGEgdmFsdWUgaXMgYW4gaW5zdGFuY2Ugb2YgUmVxdWVzdC5cbiAqXG4gKiBAcGFyYW0gICBNaXhlZCAgIGlucHV0XG4gKiBAcmV0dXJuICBCb29sZWFuXG4gKi9cbmZ1bmN0aW9uIGlzUmVxdWVzdChpbnB1dCkge1xuXHRyZXR1cm4gdHlwZW9mIGlucHV0ID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgaW5wdXRbSU5URVJOQUxTJDJdID09PSAnb2JqZWN0Jztcbn1cblxuZnVuY3Rpb24gaXNBYm9ydFNpZ25hbChzaWduYWwpIHtcblx0Y29uc3QgcHJvdG8gPSBzaWduYWwgJiYgdHlwZW9mIHNpZ25hbCA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHNpZ25hbCk7XG5cdHJldHVybiAhIShwcm90byAmJiBwcm90by5jb25zdHJ1Y3Rvci5uYW1lID09PSAnQWJvcnRTaWduYWwnKTtcbn1cblxuLyoqXG4gKiBSZXF1ZXN0IGNsYXNzXG4gKlxuICogQHBhcmFtICAgTWl4ZWQgICBpbnB1dCAgVXJsIG9yIFJlcXVlc3QgaW5zdGFuY2VcbiAqIEBwYXJhbSAgIE9iamVjdCAgaW5pdCAgIEN1c3RvbSBvcHRpb25zXG4gKiBAcmV0dXJuICBWb2lkXG4gKi9cbmNsYXNzIFJlcXVlc3Qge1xuXHRjb25zdHJ1Y3RvcihpbnB1dCkge1xuXHRcdGxldCBpbml0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiB7fTtcblxuXHRcdGxldCBwYXJzZWRVUkw7XG5cblx0XHQvLyBub3JtYWxpemUgaW5wdXRcblx0XHRpZiAoIWlzUmVxdWVzdChpbnB1dCkpIHtcblx0XHRcdGlmIChpbnB1dCAmJiBpbnB1dC5ocmVmKSB7XG5cdFx0XHRcdC8vIGluIG9yZGVyIHRvIHN1cHBvcnQgTm9kZS5qcycgVXJsIG9iamVjdHM7IHRob3VnaCBXSEFUV0cncyBVUkwgb2JqZWN0c1xuXHRcdFx0XHQvLyB3aWxsIGZhbGwgaW50byB0aGlzIGJyYW5jaCBhbHNvIChzaW5jZSB0aGVpciBgdG9TdHJpbmcoKWAgd2lsbCByZXR1cm5cblx0XHRcdFx0Ly8gYGhyZWZgIHByb3BlcnR5IGFueXdheSlcblx0XHRcdFx0cGFyc2VkVVJMID0gcGFyc2VfdXJsKGlucHV0LmhyZWYpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gY29lcmNlIGlucHV0IHRvIGEgc3RyaW5nIGJlZm9yZSBhdHRlbXB0aW5nIHRvIHBhcnNlXG5cdFx0XHRcdHBhcnNlZFVSTCA9IHBhcnNlX3VybChgJHtpbnB1dH1gKTtcblx0XHRcdH1cblx0XHRcdGlucHV0ID0ge307XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhcnNlZFVSTCA9IHBhcnNlX3VybChpbnB1dC51cmwpO1xuXHRcdH1cblxuXHRcdGxldCBtZXRob2QgPSBpbml0Lm1ldGhvZCB8fCBpbnB1dC5tZXRob2QgfHwgJ0dFVCc7XG5cdFx0bWV0aG9kID0gbWV0aG9kLnRvVXBwZXJDYXNlKCk7XG5cblx0XHRpZiAoKGluaXQuYm9keSAhPSBudWxsIHx8IGlzUmVxdWVzdChpbnB1dCkgJiYgaW5wdXQuYm9keSAhPT0gbnVsbCkgJiYgKG1ldGhvZCA9PT0gJ0dFVCcgfHwgbWV0aG9kID09PSAnSEVBRCcpKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdSZXF1ZXN0IHdpdGggR0VUL0hFQUQgbWV0aG9kIGNhbm5vdCBoYXZlIGJvZHknKTtcblx0XHR9XG5cblx0XHRsZXQgaW5wdXRCb2R5ID0gaW5pdC5ib2R5ICE9IG51bGwgPyBpbml0LmJvZHkgOiBpc1JlcXVlc3QoaW5wdXQpICYmIGlucHV0LmJvZHkgIT09IG51bGwgPyBjbG9uZShpbnB1dCkgOiBudWxsO1xuXG5cdFx0Qm9keS5jYWxsKHRoaXMsIGlucHV0Qm9keSwge1xuXHRcdFx0dGltZW91dDogaW5pdC50aW1lb3V0IHx8IGlucHV0LnRpbWVvdXQgfHwgMCxcblx0XHRcdHNpemU6IGluaXQuc2l6ZSB8fCBpbnB1dC5zaXplIHx8IDBcblx0XHR9KTtcblxuXHRcdGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyhpbml0LmhlYWRlcnMgfHwgaW5wdXQuaGVhZGVycyB8fCB7fSk7XG5cblx0XHRpZiAoaW5wdXRCb2R5ICE9IG51bGwgJiYgIWhlYWRlcnMuaGFzKCdDb250ZW50LVR5cGUnKSkge1xuXHRcdFx0Y29uc3QgY29udGVudFR5cGUgPSBleHRyYWN0Q29udGVudFR5cGUoaW5wdXRCb2R5KTtcblx0XHRcdGlmIChjb250ZW50VHlwZSkge1xuXHRcdFx0XHRoZWFkZXJzLmFwcGVuZCgnQ29udGVudC1UeXBlJywgY29udGVudFR5cGUpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGxldCBzaWduYWwgPSBpc1JlcXVlc3QoaW5wdXQpID8gaW5wdXQuc2lnbmFsIDogbnVsbDtcblx0XHRpZiAoJ3NpZ25hbCcgaW4gaW5pdCkgc2lnbmFsID0gaW5pdC5zaWduYWw7XG5cblx0XHRpZiAoc2lnbmFsICE9IG51bGwgJiYgIWlzQWJvcnRTaWduYWwoc2lnbmFsKSkge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgc2lnbmFsIHRvIGJlIGFuIGluc3RhbmNlb2YgQWJvcnRTaWduYWwnKTtcblx0XHR9XG5cblx0XHR0aGlzW0lOVEVSTkFMUyQyXSA9IHtcblx0XHRcdG1ldGhvZCxcblx0XHRcdHJlZGlyZWN0OiBpbml0LnJlZGlyZWN0IHx8IGlucHV0LnJlZGlyZWN0IHx8ICdmb2xsb3cnLFxuXHRcdFx0aGVhZGVycyxcblx0XHRcdHBhcnNlZFVSTCxcblx0XHRcdHNpZ25hbFxuXHRcdH07XG5cblx0XHQvLyBub2RlLWZldGNoLW9ubHkgb3B0aW9uc1xuXHRcdHRoaXMuZm9sbG93ID0gaW5pdC5mb2xsb3cgIT09IHVuZGVmaW5lZCA/IGluaXQuZm9sbG93IDogaW5wdXQuZm9sbG93ICE9PSB1bmRlZmluZWQgPyBpbnB1dC5mb2xsb3cgOiAyMDtcblx0XHR0aGlzLmNvbXByZXNzID0gaW5pdC5jb21wcmVzcyAhPT0gdW5kZWZpbmVkID8gaW5pdC5jb21wcmVzcyA6IGlucHV0LmNvbXByZXNzICE9PSB1bmRlZmluZWQgPyBpbnB1dC5jb21wcmVzcyA6IHRydWU7XG5cdFx0dGhpcy5jb3VudGVyID0gaW5pdC5jb3VudGVyIHx8IGlucHV0LmNvdW50ZXIgfHwgMDtcblx0XHR0aGlzLmFnZW50ID0gaW5pdC5hZ2VudCB8fCBpbnB1dC5hZ2VudDtcblx0fVxuXG5cdGdldCBtZXRob2QoKSB7XG5cdFx0cmV0dXJuIHRoaXNbSU5URVJOQUxTJDJdLm1ldGhvZDtcblx0fVxuXG5cdGdldCB1cmwoKSB7XG5cdFx0cmV0dXJuIGZvcm1hdF91cmwodGhpc1tJTlRFUk5BTFMkMl0ucGFyc2VkVVJMKTtcblx0fVxuXG5cdGdldCBoZWFkZXJzKCkge1xuXHRcdHJldHVybiB0aGlzW0lOVEVSTkFMUyQyXS5oZWFkZXJzO1xuXHR9XG5cblx0Z2V0IHJlZGlyZWN0KCkge1xuXHRcdHJldHVybiB0aGlzW0lOVEVSTkFMUyQyXS5yZWRpcmVjdDtcblx0fVxuXG5cdGdldCBzaWduYWwoKSB7XG5cdFx0cmV0dXJuIHRoaXNbSU5URVJOQUxTJDJdLnNpZ25hbDtcblx0fVxuXG5cdC8qKlxuICAqIENsb25lIHRoaXMgcmVxdWVzdFxuICAqXG4gICogQHJldHVybiAgUmVxdWVzdFxuICAqL1xuXHRjbG9uZSgpIHtcblx0XHRyZXR1cm4gbmV3IFJlcXVlc3QodGhpcyk7XG5cdH1cbn1cblxuQm9keS5taXhJbihSZXF1ZXN0LnByb3RvdHlwZSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSZXF1ZXN0LnByb3RvdHlwZSwgU3ltYm9sLnRvU3RyaW5nVGFnLCB7XG5cdHZhbHVlOiAnUmVxdWVzdCcsXG5cdHdyaXRhYmxlOiBmYWxzZSxcblx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdGNvbmZpZ3VyYWJsZTogdHJ1ZVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFJlcXVlc3QucHJvdG90eXBlLCB7XG5cdG1ldGhvZDogeyBlbnVtZXJhYmxlOiB0cnVlIH0sXG5cdHVybDogeyBlbnVtZXJhYmxlOiB0cnVlIH0sXG5cdGhlYWRlcnM6IHsgZW51bWVyYWJsZTogdHJ1ZSB9LFxuXHRyZWRpcmVjdDogeyBlbnVtZXJhYmxlOiB0cnVlIH0sXG5cdGNsb25lOiB7IGVudW1lcmFibGU6IHRydWUgfSxcblx0c2lnbmFsOiB7IGVudW1lcmFibGU6IHRydWUgfVxufSk7XG5cbi8qKlxuICogQ29udmVydCBhIFJlcXVlc3QgdG8gTm9kZS5qcyBodHRwIHJlcXVlc3Qgb3B0aW9ucy5cbiAqXG4gKiBAcGFyYW0gICBSZXF1ZXN0ICBBIFJlcXVlc3QgaW5zdGFuY2VcbiAqIEByZXR1cm4gIE9iamVjdCAgIFRoZSBvcHRpb25zIG9iamVjdCB0byBiZSBwYXNzZWQgdG8gaHR0cC5yZXF1ZXN0XG4gKi9cbmZ1bmN0aW9uIGdldE5vZGVSZXF1ZXN0T3B0aW9ucyhyZXF1ZXN0KSB7XG5cdGNvbnN0IHBhcnNlZFVSTCA9IHJlcXVlc3RbSU5URVJOQUxTJDJdLnBhcnNlZFVSTDtcblx0Y29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKHJlcXVlc3RbSU5URVJOQUxTJDJdLmhlYWRlcnMpO1xuXG5cdC8vIGZldGNoIHN0ZXAgMS4zXG5cdGlmICghaGVhZGVycy5oYXMoJ0FjY2VwdCcpKSB7XG5cdFx0aGVhZGVycy5zZXQoJ0FjY2VwdCcsICcqLyonKTtcblx0fVxuXG5cdC8vIEJhc2ljIGZldGNoXG5cdGlmICghcGFyc2VkVVJMLnByb3RvY29sIHx8ICFwYXJzZWRVUkwuaG9zdG5hbWUpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPbmx5IGFic29sdXRlIFVSTHMgYXJlIHN1cHBvcnRlZCcpO1xuXHR9XG5cblx0aWYgKCEvXmh0dHBzPzokLy50ZXN0KHBhcnNlZFVSTC5wcm90b2NvbCkpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPbmx5IEhUVFAoUykgcHJvdG9jb2xzIGFyZSBzdXBwb3J0ZWQnKTtcblx0fVxuXG5cdGlmIChyZXF1ZXN0LnNpZ25hbCAmJiByZXF1ZXN0LmJvZHkgaW5zdGFuY2VvZiBTdHJlYW0uUmVhZGFibGUgJiYgIXN0cmVhbURlc3RydWN0aW9uU3VwcG9ydGVkKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdDYW5jZWxsYXRpb24gb2Ygc3RyZWFtZWQgcmVxdWVzdHMgd2l0aCBBYm9ydFNpZ25hbCBpcyBub3Qgc3VwcG9ydGVkIGluIG5vZGUgPCA4Jyk7XG5cdH1cblxuXHQvLyBIVFRQLW5ldHdvcmstb3ItY2FjaGUgZmV0Y2ggc3RlcHMgMi40LTIuN1xuXHRsZXQgY29udGVudExlbmd0aFZhbHVlID0gbnVsbDtcblx0aWYgKHJlcXVlc3QuYm9keSA9PSBudWxsICYmIC9eKFBPU1R8UFVUKSQvaS50ZXN0KHJlcXVlc3QubWV0aG9kKSkge1xuXHRcdGNvbnRlbnRMZW5ndGhWYWx1ZSA9ICcwJztcblx0fVxuXHRpZiAocmVxdWVzdC5ib2R5ICE9IG51bGwpIHtcblx0XHRjb25zdCB0b3RhbEJ5dGVzID0gZ2V0VG90YWxCeXRlcyhyZXF1ZXN0KTtcblx0XHRpZiAodHlwZW9mIHRvdGFsQnl0ZXMgPT09ICdudW1iZXInKSB7XG5cdFx0XHRjb250ZW50TGVuZ3RoVmFsdWUgPSBTdHJpbmcodG90YWxCeXRlcyk7XG5cdFx0fVxuXHR9XG5cdGlmIChjb250ZW50TGVuZ3RoVmFsdWUpIHtcblx0XHRoZWFkZXJzLnNldCgnQ29udGVudC1MZW5ndGgnLCBjb250ZW50TGVuZ3RoVmFsdWUpO1xuXHR9XG5cblx0Ly8gSFRUUC1uZXR3b3JrLW9yLWNhY2hlIGZldGNoIHN0ZXAgMi4xMVxuXHRpZiAoIWhlYWRlcnMuaGFzKCdVc2VyLUFnZW50JykpIHtcblx0XHRoZWFkZXJzLnNldCgnVXNlci1BZ2VudCcsICdub2RlLWZldGNoLzEuMCAoK2h0dHBzOi8vZ2l0aHViLmNvbS9iaXRpbm4vbm9kZS1mZXRjaCknKTtcblx0fVxuXG5cdC8vIEhUVFAtbmV0d29yay1vci1jYWNoZSBmZXRjaCBzdGVwIDIuMTVcblx0aWYgKHJlcXVlc3QuY29tcHJlc3MgJiYgIWhlYWRlcnMuaGFzKCdBY2NlcHQtRW5jb2RpbmcnKSkge1xuXHRcdGhlYWRlcnMuc2V0KCdBY2NlcHQtRW5jb2RpbmcnLCAnZ3ppcCxkZWZsYXRlJyk7XG5cdH1cblxuXHRsZXQgYWdlbnQgPSByZXF1ZXN0LmFnZW50O1xuXHRpZiAodHlwZW9mIGFnZW50ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0YWdlbnQgPSBhZ2VudChwYXJzZWRVUkwpO1xuXHR9XG5cblx0aWYgKCFoZWFkZXJzLmhhcygnQ29ubmVjdGlvbicpICYmICFhZ2VudCkge1xuXHRcdGhlYWRlcnMuc2V0KCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG5cdH1cblxuXHQvLyBIVFRQLW5ldHdvcmsgZmV0Y2ggc3RlcCA0LjJcblx0Ly8gY2h1bmtlZCBlbmNvZGluZyBpcyBoYW5kbGVkIGJ5IE5vZGUuanNcblxuXHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgcGFyc2VkVVJMLCB7XG5cdFx0bWV0aG9kOiByZXF1ZXN0Lm1ldGhvZCxcblx0XHRoZWFkZXJzOiBleHBvcnROb2RlQ29tcGF0aWJsZUhlYWRlcnMoaGVhZGVycyksXG5cdFx0YWdlbnRcblx0fSk7XG59XG5cbi8qKlxuICogYWJvcnQtZXJyb3IuanNcbiAqXG4gKiBBYm9ydEVycm9yIGludGVyZmFjZSBmb3IgY2FuY2VsbGVkIHJlcXVlc3RzXG4gKi9cblxuLyoqXG4gKiBDcmVhdGUgQWJvcnRFcnJvciBpbnN0YW5jZVxuICpcbiAqIEBwYXJhbSAgIFN0cmluZyAgICAgIG1lc3NhZ2UgICAgICBFcnJvciBtZXNzYWdlIGZvciBodW1hblxuICogQHJldHVybiAgQWJvcnRFcnJvclxuICovXG5mdW5jdGlvbiBBYm9ydEVycm9yKG1lc3NhZ2UpIHtcbiAgRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICB0aGlzLnR5cGUgPSAnYWJvcnRlZCc7XG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cbiAgLy8gaGlkZSBjdXN0b20gZXJyb3IgaW1wbGVtZW50YXRpb24gZGV0YWlscyBmcm9tIGVuZC11c2Vyc1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbn1cblxuQWJvcnRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5BYm9ydEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEFib3J0RXJyb3I7XG5BYm9ydEVycm9yLnByb3RvdHlwZS5uYW1lID0gJ0Fib3J0RXJyb3InO1xuXG4vLyBmaXggYW4gaXNzdWUgd2hlcmUgXCJQYXNzVGhyb3VnaFwiLCBcInJlc29sdmVcIiBhcmVuJ3QgYSBuYW1lZCBleHBvcnQgZm9yIG5vZGUgPDEwXG5jb25zdCBQYXNzVGhyb3VnaCQxID0gU3RyZWFtLlBhc3NUaHJvdWdoO1xuY29uc3QgcmVzb2x2ZV91cmwgPSBVcmwucmVzb2x2ZTtcblxuLyoqXG4gKiBGZXRjaCBmdW5jdGlvblxuICpcbiAqIEBwYXJhbSAgIE1peGVkICAgIHVybCAgIEFic29sdXRlIHVybCBvciBSZXF1ZXN0IGluc3RhbmNlXG4gKiBAcGFyYW0gICBPYmplY3QgICBvcHRzICBGZXRjaCBvcHRpb25zXG4gKiBAcmV0dXJuICBQcm9taXNlXG4gKi9cbmZ1bmN0aW9uIGZldGNoKHVybCwgb3B0cykge1xuXG5cdC8vIGFsbG93IGN1c3RvbSBwcm9taXNlXG5cdGlmICghZmV0Y2guUHJvbWlzZSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignbmF0aXZlIHByb21pc2UgbWlzc2luZywgc2V0IGZldGNoLlByb21pc2UgdG8geW91ciBmYXZvcml0ZSBhbHRlcm5hdGl2ZScpO1xuXHR9XG5cblx0Qm9keS5Qcm9taXNlID0gZmV0Y2guUHJvbWlzZTtcblxuXHQvLyB3cmFwIGh0dHAucmVxdWVzdCBpbnRvIGZldGNoXG5cdHJldHVybiBuZXcgZmV0Y2guUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0Ly8gYnVpbGQgcmVxdWVzdCBvYmplY3Rcblx0XHRjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QodXJsLCBvcHRzKTtcblx0XHRjb25zdCBvcHRpb25zID0gZ2V0Tm9kZVJlcXVlc3RPcHRpb25zKHJlcXVlc3QpO1xuXG5cdFx0Y29uc3Qgc2VuZCA9IChvcHRpb25zLnByb3RvY29sID09PSAnaHR0cHM6JyA/IGh0dHBzIDogaHR0cCkucmVxdWVzdDtcblx0XHRjb25zdCBzaWduYWwgPSByZXF1ZXN0LnNpZ25hbDtcblxuXHRcdGxldCByZXNwb25zZSA9IG51bGw7XG5cblx0XHRjb25zdCBhYm9ydCA9IGZ1bmN0aW9uIGFib3J0KCkge1xuXHRcdFx0bGV0IGVycm9yID0gbmV3IEFib3J0RXJyb3IoJ1RoZSB1c2VyIGFib3J0ZWQgYSByZXF1ZXN0LicpO1xuXHRcdFx0cmVqZWN0KGVycm9yKTtcblx0XHRcdGlmIChyZXF1ZXN0LmJvZHkgJiYgcmVxdWVzdC5ib2R5IGluc3RhbmNlb2YgU3RyZWFtLlJlYWRhYmxlKSB7XG5cdFx0XHRcdHJlcXVlc3QuYm9keS5kZXN0cm95KGVycm9yKTtcblx0XHRcdH1cblx0XHRcdGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLmJvZHkpIHJldHVybjtcblx0XHRcdHJlc3BvbnNlLmJvZHkuZW1pdCgnZXJyb3InLCBlcnJvcik7XG5cdFx0fTtcblxuXHRcdGlmIChzaWduYWwgJiYgc2lnbmFsLmFib3J0ZWQpIHtcblx0XHRcdGFib3J0KCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgYWJvcnRBbmRGaW5hbGl6ZSA9IGZ1bmN0aW9uIGFib3J0QW5kRmluYWxpemUoKSB7XG5cdFx0XHRhYm9ydCgpO1xuXHRcdFx0ZmluYWxpemUoKTtcblx0XHR9O1xuXG5cdFx0Ly8gc2VuZCByZXF1ZXN0XG5cdFx0Y29uc3QgcmVxID0gc2VuZChvcHRpb25zKTtcblx0XHRsZXQgcmVxVGltZW91dDtcblxuXHRcdGlmIChzaWduYWwpIHtcblx0XHRcdHNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIGFib3J0QW5kRmluYWxpemUpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGZpbmFsaXplKCkge1xuXHRcdFx0cmVxLmFib3J0KCk7XG5cdFx0XHRpZiAoc2lnbmFsKSBzaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBhYm9ydEFuZEZpbmFsaXplKTtcblx0XHRcdGNsZWFyVGltZW91dChyZXFUaW1lb3V0KTtcblx0XHR9XG5cblx0XHRpZiAocmVxdWVzdC50aW1lb3V0KSB7XG5cdFx0XHRyZXEub25jZSgnc29ja2V0JywgZnVuY3Rpb24gKHNvY2tldCkge1xuXHRcdFx0XHRyZXFUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmVqZWN0KG5ldyBGZXRjaEVycm9yKGBuZXR3b3JrIHRpbWVvdXQgYXQ6ICR7cmVxdWVzdC51cmx9YCwgJ3JlcXVlc3QtdGltZW91dCcpKTtcblx0XHRcdFx0XHRmaW5hbGl6ZSgpO1xuXHRcdFx0XHR9LCByZXF1ZXN0LnRpbWVvdXQpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmVxLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdHJlamVjdChuZXcgRmV0Y2hFcnJvcihgcmVxdWVzdCB0byAke3JlcXVlc3QudXJsfSBmYWlsZWQsIHJlYXNvbjogJHtlcnIubWVzc2FnZX1gLCAnc3lzdGVtJywgZXJyKSk7XG5cdFx0XHRmaW5hbGl6ZSgpO1xuXHRcdH0pO1xuXG5cdFx0cmVxLm9uKCdyZXNwb25zZScsIGZ1bmN0aW9uIChyZXMpIHtcblx0XHRcdGNsZWFyVGltZW91dChyZXFUaW1lb3V0KTtcblxuXHRcdFx0Y29uc3QgaGVhZGVycyA9IGNyZWF0ZUhlYWRlcnNMZW5pZW50KHJlcy5oZWFkZXJzKTtcblxuXHRcdFx0Ly8gSFRUUCBmZXRjaCBzdGVwIDVcblx0XHRcdGlmIChmZXRjaC5pc1JlZGlyZWN0KHJlcy5zdGF0dXNDb2RlKSkge1xuXHRcdFx0XHQvLyBIVFRQIGZldGNoIHN0ZXAgNS4yXG5cdFx0XHRcdGNvbnN0IGxvY2F0aW9uID0gaGVhZGVycy5nZXQoJ0xvY2F0aW9uJyk7XG5cblx0XHRcdFx0Ly8gSFRUUCBmZXRjaCBzdGVwIDUuM1xuXHRcdFx0XHRjb25zdCBsb2NhdGlvblVSTCA9IGxvY2F0aW9uID09PSBudWxsID8gbnVsbCA6IHJlc29sdmVfdXJsKHJlcXVlc3QudXJsLCBsb2NhdGlvbik7XG5cblx0XHRcdFx0Ly8gSFRUUCBmZXRjaCBzdGVwIDUuNVxuXHRcdFx0XHRzd2l0Y2ggKHJlcXVlc3QucmVkaXJlY3QpIHtcblx0XHRcdFx0XHRjYXNlICdlcnJvcic6XG5cdFx0XHRcdFx0XHRyZWplY3QobmV3IEZldGNoRXJyb3IoYHJlZGlyZWN0IG1vZGUgaXMgc2V0IHRvIGVycm9yOiAke3JlcXVlc3QudXJsfWAsICduby1yZWRpcmVjdCcpKTtcblx0XHRcdFx0XHRcdGZpbmFsaXplKCk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0Y2FzZSAnbWFudWFsJzpcblx0XHRcdFx0XHRcdC8vIG5vZGUtZmV0Y2gtc3BlY2lmaWMgc3RlcDogbWFrZSBtYW51YWwgcmVkaXJlY3QgYSBiaXQgZWFzaWVyIHRvIHVzZSBieSBzZXR0aW5nIHRoZSBMb2NhdGlvbiBoZWFkZXIgdmFsdWUgdG8gdGhlIHJlc29sdmVkIFVSTC5cblx0XHRcdFx0XHRcdGlmIChsb2NhdGlvblVSTCAhPT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHQvLyBoYW5kbGUgY29ycnVwdGVkIGhlYWRlclxuXHRcdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRcdGhlYWRlcnMuc2V0KCdMb2NhdGlvbicsIGxvY2F0aW9uVVJMKTtcblx0XHRcdFx0XHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gaXN0YW5idWwgaWdub3JlIG5leHQ6IG5vZGVqcyBzZXJ2ZXIgcHJldmVudCBpbnZhbGlkIHJlc3BvbnNlIGhlYWRlcnMsIHdlIGNhbid0IHRlc3QgdGhpcyB0aHJvdWdoIG5vcm1hbCByZXF1ZXN0XG5cdFx0XHRcdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ2ZvbGxvdyc6XG5cdFx0XHRcdFx0XHQvLyBIVFRQLXJlZGlyZWN0IGZldGNoIHN0ZXAgMlxuXHRcdFx0XHRcdFx0aWYgKGxvY2F0aW9uVVJMID09PSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBIVFRQLXJlZGlyZWN0IGZldGNoIHN0ZXAgNVxuXHRcdFx0XHRcdFx0aWYgKHJlcXVlc3QuY291bnRlciA+PSByZXF1ZXN0LmZvbGxvdykge1xuXHRcdFx0XHRcdFx0XHRyZWplY3QobmV3IEZldGNoRXJyb3IoYG1heGltdW0gcmVkaXJlY3QgcmVhY2hlZCBhdDogJHtyZXF1ZXN0LnVybH1gLCAnbWF4LXJlZGlyZWN0JykpO1xuXHRcdFx0XHRcdFx0XHRmaW5hbGl6ZSgpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIEhUVFAtcmVkaXJlY3QgZmV0Y2ggc3RlcCA2IChjb3VudGVyIGluY3JlbWVudClcblx0XHRcdFx0XHRcdC8vIENyZWF0ZSBhIG5ldyBSZXF1ZXN0IG9iamVjdC5cblx0XHRcdFx0XHRcdGNvbnN0IHJlcXVlc3RPcHRzID0ge1xuXHRcdFx0XHRcdFx0XHRoZWFkZXJzOiBuZXcgSGVhZGVycyhyZXF1ZXN0LmhlYWRlcnMpLFxuXHRcdFx0XHRcdFx0XHRmb2xsb3c6IHJlcXVlc3QuZm9sbG93LFxuXHRcdFx0XHRcdFx0XHRjb3VudGVyOiByZXF1ZXN0LmNvdW50ZXIgKyAxLFxuXHRcdFx0XHRcdFx0XHRhZ2VudDogcmVxdWVzdC5hZ2VudCxcblx0XHRcdFx0XHRcdFx0Y29tcHJlc3M6IHJlcXVlc3QuY29tcHJlc3MsXG5cdFx0XHRcdFx0XHRcdG1ldGhvZDogcmVxdWVzdC5tZXRob2QsXG5cdFx0XHRcdFx0XHRcdGJvZHk6IHJlcXVlc3QuYm9keSxcblx0XHRcdFx0XHRcdFx0c2lnbmFsOiByZXF1ZXN0LnNpZ25hbCxcblx0XHRcdFx0XHRcdFx0dGltZW91dDogcmVxdWVzdC50aW1lb3V0XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHQvLyBIVFRQLXJlZGlyZWN0IGZldGNoIHN0ZXAgOVxuXHRcdFx0XHRcdFx0aWYgKHJlcy5zdGF0dXNDb2RlICE9PSAzMDMgJiYgcmVxdWVzdC5ib2R5ICYmIGdldFRvdGFsQnl0ZXMocmVxdWVzdCkgPT09IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0cmVqZWN0KG5ldyBGZXRjaEVycm9yKCdDYW5ub3QgZm9sbG93IHJlZGlyZWN0IHdpdGggYm9keSBiZWluZyBhIHJlYWRhYmxlIHN0cmVhbScsICd1bnN1cHBvcnRlZC1yZWRpcmVjdCcpKTtcblx0XHRcdFx0XHRcdFx0ZmluYWxpemUoKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBIVFRQLXJlZGlyZWN0IGZldGNoIHN0ZXAgMTFcblx0XHRcdFx0XHRcdGlmIChyZXMuc3RhdHVzQ29kZSA9PT0gMzAzIHx8IChyZXMuc3RhdHVzQ29kZSA9PT0gMzAxIHx8IHJlcy5zdGF0dXNDb2RlID09PSAzMDIpICYmIHJlcXVlc3QubWV0aG9kID09PSAnUE9TVCcpIHtcblx0XHRcdFx0XHRcdFx0cmVxdWVzdE9wdHMubWV0aG9kID0gJ0dFVCc7XG5cdFx0XHRcdFx0XHRcdHJlcXVlc3RPcHRzLmJvZHkgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0XHRcdHJlcXVlc3RPcHRzLmhlYWRlcnMuZGVsZXRlKCdjb250ZW50LWxlbmd0aCcpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBIVFRQLXJlZGlyZWN0IGZldGNoIHN0ZXAgMTVcblx0XHRcdFx0XHRcdHJlc29sdmUoZmV0Y2gobmV3IFJlcXVlc3QobG9jYXRpb25VUkwsIHJlcXVlc3RPcHRzKSkpO1xuXHRcdFx0XHRcdFx0ZmluYWxpemUoKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBwcmVwYXJlIHJlc3BvbnNlXG5cdFx0XHRyZXMub25jZSgnZW5kJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoc2lnbmFsKSBzaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBhYm9ydEFuZEZpbmFsaXplKTtcblx0XHRcdH0pO1xuXHRcdFx0bGV0IGJvZHkgPSByZXMucGlwZShuZXcgUGFzc1Rocm91Z2gkMSgpKTtcblxuXHRcdFx0Y29uc3QgcmVzcG9uc2Vfb3B0aW9ucyA9IHtcblx0XHRcdFx0dXJsOiByZXF1ZXN0LnVybCxcblx0XHRcdFx0c3RhdHVzOiByZXMuc3RhdHVzQ29kZSxcblx0XHRcdFx0c3RhdHVzVGV4dDogcmVzLnN0YXR1c01lc3NhZ2UsXG5cdFx0XHRcdGhlYWRlcnM6IGhlYWRlcnMsXG5cdFx0XHRcdHNpemU6IHJlcXVlc3Quc2l6ZSxcblx0XHRcdFx0dGltZW91dDogcmVxdWVzdC50aW1lb3V0LFxuXHRcdFx0XHRjb3VudGVyOiByZXF1ZXN0LmNvdW50ZXJcblx0XHRcdH07XG5cblx0XHRcdC8vIEhUVFAtbmV0d29yayBmZXRjaCBzdGVwIDEyLjEuMS4zXG5cdFx0XHRjb25zdCBjb2RpbmdzID0gaGVhZGVycy5nZXQoJ0NvbnRlbnQtRW5jb2RpbmcnKTtcblxuXHRcdFx0Ly8gSFRUUC1uZXR3b3JrIGZldGNoIHN0ZXAgMTIuMS4xLjQ6IGhhbmRsZSBjb250ZW50IGNvZGluZ3NcblxuXHRcdFx0Ly8gaW4gZm9sbG93aW5nIHNjZW5hcmlvcyB3ZSBpZ25vcmUgY29tcHJlc3Npb24gc3VwcG9ydFxuXHRcdFx0Ly8gMS4gY29tcHJlc3Npb24gc3VwcG9ydCBpcyBkaXNhYmxlZFxuXHRcdFx0Ly8gMi4gSEVBRCByZXF1ZXN0XG5cdFx0XHQvLyAzLiBubyBDb250ZW50LUVuY29kaW5nIGhlYWRlclxuXHRcdFx0Ly8gNC4gbm8gY29udGVudCByZXNwb25zZSAoMjA0KVxuXHRcdFx0Ly8gNS4gY29udGVudCBub3QgbW9kaWZpZWQgcmVzcG9uc2UgKDMwNClcblx0XHRcdGlmICghcmVxdWVzdC5jb21wcmVzcyB8fCByZXF1ZXN0Lm1ldGhvZCA9PT0gJ0hFQUQnIHx8IGNvZGluZ3MgPT09IG51bGwgfHwgcmVzLnN0YXR1c0NvZGUgPT09IDIwNCB8fCByZXMuc3RhdHVzQ29kZSA9PT0gMzA0KSB7XG5cdFx0XHRcdHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKGJvZHksIHJlc3BvbnNlX29wdGlvbnMpO1xuXHRcdFx0XHRyZXNvbHZlKHJlc3BvbnNlKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBGb3IgTm9kZSB2Nitcblx0XHRcdC8vIEJlIGxlc3Mgc3RyaWN0IHdoZW4gZGVjb2RpbmcgY29tcHJlc3NlZCByZXNwb25zZXMsIHNpbmNlIHNvbWV0aW1lc1xuXHRcdFx0Ly8gc2VydmVycyBzZW5kIHNsaWdodGx5IGludmFsaWQgcmVzcG9uc2VzIHRoYXQgYXJlIHN0aWxsIGFjY2VwdGVkXG5cdFx0XHQvLyBieSBjb21tb24gYnJvd3NlcnMuXG5cdFx0XHQvLyBBbHdheXMgdXNpbmcgWl9TWU5DX0ZMVVNIIGlzIHdoYXQgY1VSTCBkb2VzLlxuXHRcdFx0Y29uc3QgemxpYk9wdGlvbnMgPSB7XG5cdFx0XHRcdGZsdXNoOiB6bGliLlpfU1lOQ19GTFVTSCxcblx0XHRcdFx0ZmluaXNoRmx1c2g6IHpsaWIuWl9TWU5DX0ZMVVNIXG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBmb3IgZ3ppcFxuXHRcdFx0aWYgKGNvZGluZ3MgPT0gJ2d6aXAnIHx8IGNvZGluZ3MgPT0gJ3gtZ3ppcCcpIHtcblx0XHRcdFx0Ym9keSA9IGJvZHkucGlwZSh6bGliLmNyZWF0ZUd1bnppcCh6bGliT3B0aW9ucykpO1xuXHRcdFx0XHRyZXNwb25zZSA9IG5ldyBSZXNwb25zZShib2R5LCByZXNwb25zZV9vcHRpb25zKTtcblx0XHRcdFx0cmVzb2x2ZShyZXNwb25zZSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZm9yIGRlZmxhdGVcblx0XHRcdGlmIChjb2RpbmdzID09ICdkZWZsYXRlJyB8fCBjb2RpbmdzID09ICd4LWRlZmxhdGUnKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSB0aGUgaW5mYW1vdXMgcmF3IGRlZmxhdGUgcmVzcG9uc2UgZnJvbSBvbGQgc2VydmVyc1xuXHRcdFx0XHQvLyBhIGhhY2sgZm9yIG9sZCBJSVMgYW5kIEFwYWNoZSBzZXJ2ZXJzXG5cdFx0XHRcdGNvbnN0IHJhdyA9IHJlcy5waXBlKG5ldyBQYXNzVGhyb3VnaCQxKCkpO1xuXHRcdFx0XHRyYXcub25jZSgnZGF0YScsIGZ1bmN0aW9uIChjaHVuaykge1xuXHRcdFx0XHRcdC8vIHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM3NTE5ODI4XG5cdFx0XHRcdFx0aWYgKChjaHVua1swXSAmIDB4MEYpID09PSAweDA4KSB7XG5cdFx0XHRcdFx0XHRib2R5ID0gYm9keS5waXBlKHpsaWIuY3JlYXRlSW5mbGF0ZSgpKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ym9keSA9IGJvZHkucGlwZSh6bGliLmNyZWF0ZUluZmxhdGVSYXcoKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKGJvZHksIHJlc3BvbnNlX29wdGlvbnMpO1xuXHRcdFx0XHRcdHJlc29sdmUocmVzcG9uc2UpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBmb3IgYnJcblx0XHRcdGlmIChjb2RpbmdzID09ICdicicgJiYgdHlwZW9mIHpsaWIuY3JlYXRlQnJvdGxpRGVjb21wcmVzcyA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRib2R5ID0gYm9keS5waXBlKHpsaWIuY3JlYXRlQnJvdGxpRGVjb21wcmVzcygpKTtcblx0XHRcdFx0cmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UoYm9keSwgcmVzcG9uc2Vfb3B0aW9ucyk7XG5cdFx0XHRcdHJlc29sdmUocmVzcG9uc2UpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIG90aGVyd2lzZSwgdXNlIHJlc3BvbnNlIGFzLWlzXG5cdFx0XHRyZXNwb25zZSA9IG5ldyBSZXNwb25zZShib2R5LCByZXNwb25zZV9vcHRpb25zKTtcblx0XHRcdHJlc29sdmUocmVzcG9uc2UpO1xuXHRcdH0pO1xuXG5cdFx0d3JpdGVUb1N0cmVhbShyZXEsIHJlcXVlc3QpO1xuXHR9KTtcbn1cbi8qKlxuICogUmVkaXJlY3QgY29kZSBtYXRjaGluZ1xuICpcbiAqIEBwYXJhbSAgIE51bWJlciAgIGNvZGUgIFN0YXR1cyBjb2RlXG4gKiBAcmV0dXJuICBCb29sZWFuXG4gKi9cbmZldGNoLmlzUmVkaXJlY3QgPSBmdW5jdGlvbiAoY29kZSkge1xuXHRyZXR1cm4gY29kZSA9PT0gMzAxIHx8IGNvZGUgPT09IDMwMiB8fCBjb2RlID09PSAzMDMgfHwgY29kZSA9PT0gMzA3IHx8IGNvZGUgPT09IDMwODtcbn07XG5cbi8vIGV4cG9zZSBQcm9taXNlXG5mZXRjaC5Qcm9taXNlID0gZ2xvYmFsLlByb21pc2U7XG5cbmZ1bmN0aW9uIGdldF9wYWdlX2hhbmRsZXIoXG5cdG1hbmlmZXN0LFxuXHRzZXNzaW9uX2dldHRlclxuKSB7XG5cdGNvbnN0IGdldF9idWlsZF9pbmZvID0gZGV2XG5cdFx0PyAoKSA9PiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oYnVpbGRfZGlyLCAnYnVpbGQuanNvbicpLCAndXRmLTgnKSlcblx0XHQ6IChhc3NldHMgPT4gKCkgPT4gYXNzZXRzKShKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oYnVpbGRfZGlyLCAnYnVpbGQuanNvbicpLCAndXRmLTgnKSkpO1xuXG5cdGNvbnN0IHRlbXBsYXRlID0gZGV2XG5cdFx0PyAoKSA9PiByZWFkX3RlbXBsYXRlKHNyY19kaXIpXG5cdFx0OiAoc3RyID0+ICgpID0+IHN0cikocmVhZF90ZW1wbGF0ZShidWlsZF9kaXIpKTtcblxuXHRjb25zdCBoYXNfc2VydmljZV93b3JrZXIgPSBmcy5leGlzdHNTeW5jKHBhdGguam9pbihidWlsZF9kaXIsICdzZXJ2aWNlLXdvcmtlci5qcycpKTtcblxuXHRjb25zdCB7IHNlcnZlcl9yb3V0ZXMsIHBhZ2VzIH0gPSBtYW5pZmVzdDtcblx0Y29uc3QgZXJyb3Jfcm91dGUgPSBtYW5pZmVzdC5lcnJvcjtcblxuXHRmdW5jdGlvbiBiYWlsKHJlcSwgcmVzLCBlcnIpIHtcblx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cblx0XHRjb25zdCBtZXNzYWdlID0gZGV2ID8gZXNjYXBlX2h0bWwoZXJyLm1lc3NhZ2UpIDogJ0ludGVybmFsIHNlcnZlciBlcnJvcic7XG5cblx0XHRyZXMuc3RhdHVzQ29kZSA9IDUwMDtcblx0XHRyZXMuZW5kKGA8cHJlPiR7bWVzc2FnZX08L3ByZT5gKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGhhbmRsZV9lcnJvcihyZXEsIHJlcywgc3RhdHVzQ29kZSwgZXJyb3IpIHtcblx0XHRoYW5kbGVfcGFnZSh7XG5cdFx0XHRwYXR0ZXJuOiBudWxsLFxuXHRcdFx0cGFydHM6IFtcblx0XHRcdFx0eyBuYW1lOiBudWxsLCBjb21wb25lbnQ6IGVycm9yX3JvdXRlIH1cblx0XHRcdF1cblx0XHR9LCByZXEsIHJlcywgc3RhdHVzQ29kZSwgZXJyb3IgfHwgbmV3IEVycm9yKCdVbmtub3duIGVycm9yIGluIHByZWxvYWQgZnVuY3Rpb24nKSk7XG5cdH1cblxuXHRhc3luYyBmdW5jdGlvbiBoYW5kbGVfcGFnZShwYWdlLCByZXEsIHJlcywgc3RhdHVzID0gMjAwLCBlcnJvciA9IG51bGwpIHtcblx0XHRjb25zdCBpc19zZXJ2aWNlX3dvcmtlcl9pbmRleCA9IHJlcS5wYXRoID09PSAnL3NlcnZpY2Utd29ya2VyLWluZGV4Lmh0bWwnO1xuXHRcdGNvbnN0IGJ1aWxkX2luZm9cblxuXG5cblxuID0gZ2V0X2J1aWxkX2luZm8oKTtcblxuXHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L2h0bWwnKTtcblx0XHRyZXMuc2V0SGVhZGVyKCdDYWNoZS1Db250cm9sJywgZGV2ID8gJ25vLWNhY2hlJyA6ICdtYXgtYWdlPTYwMCcpO1xuXG5cdFx0Ly8gcHJlbG9hZCBtYWluLmpzIGFuZCBjdXJyZW50IHJvdXRlXG5cdFx0Ly8gVE9ETyBkZXRlY3Qgb3RoZXIgc3R1ZmYgd2UgY2FuIHByZWxvYWQ/IGltYWdlcywgQ1NTLCBmb250cz9cblx0XHRsZXQgcHJlbG9hZGVkX2NodW5rcyA9IEFycmF5LmlzQXJyYXkoYnVpbGRfaW5mby5hc3NldHMubWFpbikgPyBidWlsZF9pbmZvLmFzc2V0cy5tYWluIDogW2J1aWxkX2luZm8uYXNzZXRzLm1haW5dO1xuXHRcdGlmICghZXJyb3IgJiYgIWlzX3NlcnZpY2Vfd29ya2VyX2luZGV4KSB7XG5cdFx0XHRwYWdlLnBhcnRzLmZvckVhY2gocGFydCA9PiB7XG5cdFx0XHRcdGlmICghcGFydCkgcmV0dXJuO1xuXG5cdFx0XHRcdC8vIHVzaW5nIGNvbmNhdCBiZWNhdXNlIGl0IGNvdWxkIGJlIGEgc3RyaW5nIG9yIGFuIGFycmF5LiB0aGFua3Mgd2VicGFjayFcblx0XHRcdFx0cHJlbG9hZGVkX2NodW5rcyA9IHByZWxvYWRlZF9jaHVua3MuY29uY2F0KGJ1aWxkX2luZm8uYXNzZXRzW3BhcnQubmFtZV0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKGJ1aWxkX2luZm8uYnVuZGxlciA9PT0gJ3JvbGx1cCcpIHtcblx0XHRcdC8vIFRPRE8gYWRkIGRlcGVuZGVuY2llcyBhbmQgQ1NTXG5cdFx0XHRjb25zdCBsaW5rID0gcHJlbG9hZGVkX2NodW5rc1xuXHRcdFx0XHQuZmlsdGVyKGZpbGUgPT4gZmlsZSAmJiAhZmlsZS5tYXRjaCgvXFwubWFwJC8pKVxuXHRcdFx0XHQubWFwKGZpbGUgPT4gYDwke3JlcS5iYXNlVXJsfS9jbGllbnQvJHtmaWxlfT47cmVsPVwibW9kdWxlcHJlbG9hZFwiYClcblx0XHRcdFx0LmpvaW4oJywgJyk7XG5cblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0xpbmsnLCBsaW5rKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc3QgbGluayA9IHByZWxvYWRlZF9jaHVua3Ncblx0XHRcdFx0LmZpbHRlcihmaWxlID0+IGZpbGUgJiYgIWZpbGUubWF0Y2goL1xcLm1hcCQvKSlcblx0XHRcdFx0Lm1hcCgoZmlsZSkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IGFzID0gL1xcLmNzcyQvLnRlc3QoZmlsZSkgPyAnc3R5bGUnIDogJ3NjcmlwdCc7XG5cdFx0XHRcdFx0cmV0dXJuIGA8JHtyZXEuYmFzZVVybH0vY2xpZW50LyR7ZmlsZX0+O3JlbD1cInByZWxvYWRcIjthcz1cIiR7YXN9XCJgO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuam9pbignLCAnKTtcblxuXHRcdFx0cmVzLnNldEhlYWRlcignTGluaycsIGxpbmspO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNlc3Npb24gPSBzZXNzaW9uX2dldHRlcihyZXEsIHJlcyk7XG5cblx0XHRsZXQgcmVkaXJlY3Q7XG5cdFx0bGV0IHByZWxvYWRfZXJyb3I7XG5cblx0XHRjb25zdCBwcmVsb2FkX2NvbnRleHQgPSB7XG5cdFx0XHRyZWRpcmVjdDogKHN0YXR1c0NvZGUsIGxvY2F0aW9uKSA9PiB7XG5cdFx0XHRcdGlmIChyZWRpcmVjdCAmJiAocmVkaXJlY3Quc3RhdHVzQ29kZSAhPT0gc3RhdHVzQ29kZSB8fCByZWRpcmVjdC5sb2NhdGlvbiAhPT0gbG9jYXRpb24pKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb25mbGljdGluZyByZWRpcmVjdHNgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsb2NhdGlvbiA9IGxvY2F0aW9uLnJlcGxhY2UoL15cXC8vZywgJycpOyAvLyBsZWFkaW5nIHNsYXNoIChvbmx5KVxuXHRcdFx0XHRyZWRpcmVjdCA9IHsgc3RhdHVzQ29kZSwgbG9jYXRpb24gfTtcblx0XHRcdH0sXG5cdFx0XHRlcnJvcjogKHN0YXR1c0NvZGUsIG1lc3NhZ2UpID0+IHtcblx0XHRcdFx0cHJlbG9hZF9lcnJvciA9IHsgc3RhdHVzQ29kZSwgbWVzc2FnZSB9O1xuXHRcdFx0fSxcblx0XHRcdGZldGNoOiAodXJsLCBvcHRzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHBhcnNlZCA9IG5ldyBVcmwuVVJMKHVybCwgYGh0dHA6Ly8xMjcuMC4wLjE6JHtwcm9jZXNzLmVudi5QT1JUfSR7cmVxLmJhc2VVcmwgPyByZXEuYmFzZVVybCArICcvJyA6Jyd9YCk7XG5cblx0XHRcdFx0aWYgKG9wdHMpIHtcblx0XHRcdFx0XHRvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0cyk7XG5cblx0XHRcdFx0XHRjb25zdCBpbmNsdWRlX2Nvb2tpZXMgPSAoXG5cdFx0XHRcdFx0XHRvcHRzLmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScgfHxcblx0XHRcdFx0XHRcdG9wdHMuY3JlZGVudGlhbHMgPT09ICdzYW1lLW9yaWdpbicgJiYgcGFyc2VkLm9yaWdpbiA9PT0gYGh0dHA6Ly8xMjcuMC4wLjE6JHtwcm9jZXNzLmVudi5QT1JUfWBcblx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0aWYgKGluY2x1ZGVfY29va2llcykge1xuXHRcdFx0XHRcdFx0b3B0cy5oZWFkZXJzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0cy5oZWFkZXJzKTtcblxuXHRcdFx0XHRcdFx0Y29uc3QgY29va2llcyA9IE9iamVjdC5hc3NpZ24oXG5cdFx0XHRcdFx0XHRcdHt9LFxuXHRcdFx0XHRcdFx0XHRjb29raWUucGFyc2UocmVxLmhlYWRlcnMuY29va2llIHx8ICcnKSxcblx0XHRcdFx0XHRcdFx0Y29va2llLnBhcnNlKG9wdHMuaGVhZGVycy5jb29raWUgfHwgJycpXG5cdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0XHRjb25zdCBzZXRfY29va2llID0gcmVzLmdldEhlYWRlcignU2V0LUNvb2tpZScpO1xuXHRcdFx0XHRcdFx0KEFycmF5LmlzQXJyYXkoc2V0X2Nvb2tpZSkgPyBzZXRfY29va2llIDogW3NldF9jb29raWVdKS5mb3JFYWNoKHN0ciA9PiB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1hdGNoID0gLyhbXj1dKyk9KFteO10rKS8uZXhlYyhzdHIpO1xuXHRcdFx0XHRcdFx0XHRpZiAobWF0Y2gpIGNvb2tpZXNbbWF0Y2hbMV1dID0gbWF0Y2hbMl07XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0Y29uc3Qgc3RyID0gT2JqZWN0LmtleXMoY29va2llcylcblx0XHRcdFx0XHRcdFx0Lm1hcChrZXkgPT4gYCR7a2V5fT0ke2Nvb2tpZXNba2V5XX1gKVxuXHRcdFx0XHRcdFx0XHQuam9pbignOyAnKTtcblxuXHRcdFx0XHRcdFx0b3B0cy5oZWFkZXJzLmNvb2tpZSA9IHN0cjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZmV0Y2gocGFyc2VkLmhyZWYsIG9wdHMpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRsZXQgcHJlbG9hZGVkO1xuXHRcdGxldCBtYXRjaDtcblx0XHRsZXQgcGFyYW1zO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHJvb3RfcHJlbG9hZGVkID0gbWFuaWZlc3Qucm9vdF9wcmVsb2FkXG5cdFx0XHRcdD8gbWFuaWZlc3Qucm9vdF9wcmVsb2FkLmNhbGwocHJlbG9hZF9jb250ZXh0LCB7XG5cdFx0XHRcdFx0aG9zdDogcmVxLmhlYWRlcnMuaG9zdCxcblx0XHRcdFx0XHRwYXRoOiByZXEucGF0aCxcblx0XHRcdFx0XHRxdWVyeTogcmVxLnF1ZXJ5LFxuXHRcdFx0XHRcdHBhcmFtczoge31cblx0XHRcdFx0fSwgc2Vzc2lvbilcblx0XHRcdFx0OiB7fTtcblxuXHRcdFx0bWF0Y2ggPSBlcnJvciA/IG51bGwgOiBwYWdlLnBhdHRlcm4uZXhlYyhyZXEucGF0aCk7XG5cblxuXHRcdFx0bGV0IHRvUHJlbG9hZCA9IFtyb290X3ByZWxvYWRlZF07XG5cdFx0XHRpZiAoIWlzX3NlcnZpY2Vfd29ya2VyX2luZGV4KSB7XG5cdFx0XHRcdHRvUHJlbG9hZCA9IHRvUHJlbG9hZC5jb25jYXQocGFnZS5wYXJ0cy5tYXAocGFydCA9PiB7XG5cdFx0XHRcdFx0aWYgKCFwYXJ0KSByZXR1cm4gbnVsbDtcblxuXHRcdFx0XHRcdC8vIHRoZSBkZWVwZXN0IGxldmVsIGlzIHVzZWQgYmVsb3csIHRvIGluaXRpYWxpc2UgdGhlIHN0b3JlXG5cdFx0XHRcdFx0cGFyYW1zID0gcGFydC5wYXJhbXMgPyBwYXJ0LnBhcmFtcyhtYXRjaCkgOiB7fTtcblxuXHRcdFx0XHRcdHJldHVybiBwYXJ0LnByZWxvYWRcblx0XHRcdFx0XHRcdD8gcGFydC5wcmVsb2FkLmNhbGwocHJlbG9hZF9jb250ZXh0LCB7XG5cdFx0XHRcdFx0XHRcdGhvc3Q6IHJlcS5oZWFkZXJzLmhvc3QsXG5cdFx0XHRcdFx0XHRcdHBhdGg6IHJlcS5wYXRoLFxuXHRcdFx0XHRcdFx0XHRxdWVyeTogcmVxLnF1ZXJ5LFxuXHRcdFx0XHRcdFx0XHRwYXJhbXNcblx0XHRcdFx0XHRcdH0sIHNlc3Npb24pXG5cdFx0XHRcdFx0XHQ6IHt9O1xuXHRcdFx0XHR9KSk7XG5cdFx0XHR9XG5cblx0XHRcdHByZWxvYWRlZCA9IGF3YWl0IFByb21pc2UuYWxsKHRvUHJlbG9hZCk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0cmV0dXJuIGJhaWwocmVxLCByZXMsIGVycilcblx0XHRcdH1cblxuXHRcdFx0cHJlbG9hZF9lcnJvciA9IHsgc3RhdHVzQ29kZTogNTAwLCBtZXNzYWdlOiBlcnIgfTtcblx0XHRcdHByZWxvYWRlZCA9IFtdOyAvLyBhcHBlYXNlIFR5cGVTY3JpcHRcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0aWYgKHJlZGlyZWN0KSB7XG5cdFx0XHRcdGNvbnN0IGxvY2F0aW9uID0gVXJsLnJlc29sdmUoKHJlcS5iYXNlVXJsIHx8ICcnKSArICcvJywgcmVkaXJlY3QubG9jYXRpb24pO1xuXG5cdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gcmVkaXJlY3Quc3RhdHVzQ29kZTtcblx0XHRcdFx0cmVzLnNldEhlYWRlcignTG9jYXRpb24nLCBsb2NhdGlvbik7XG5cdFx0XHRcdHJlcy5lbmQoKTtcblxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwcmVsb2FkX2Vycm9yKSB7XG5cdFx0XHRcdGhhbmRsZV9lcnJvcihyZXEsIHJlcywgcHJlbG9hZF9lcnJvci5zdGF0dXNDb2RlLCBwcmVsb2FkX2Vycm9yLm1lc3NhZ2UpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHNlZ21lbnRzID0gcmVxLnBhdGguc3BsaXQoJy8nKS5maWx0ZXIoQm9vbGVhbik7XG5cblx0XHRcdC8vIFRPRE8gbWFrZSB0aGlzIGxlc3MgY29uZnVzaW5nXG5cdFx0XHRjb25zdCBsYXlvdXRfc2VnbWVudHMgPSBbc2VnbWVudHNbMF1dO1xuXHRcdFx0bGV0IGwgPSAxO1xuXG5cdFx0XHRwYWdlLnBhcnRzLmZvckVhY2goKHBhcnQsIGkpID0+IHtcblx0XHRcdFx0bGF5b3V0X3NlZ21lbnRzW2xdID0gc2VnbWVudHNbaSArIDFdO1xuXHRcdFx0XHRpZiAoIXBhcnQpIHJldHVybiBudWxsO1xuXHRcdFx0XHRsKys7XG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgcHJvcHMgPSB7XG5cdFx0XHRcdHN0b3Jlczoge1xuXHRcdFx0XHRcdHBhZ2U6IHtcblx0XHRcdFx0XHRcdHN1YnNjcmliZTogd3JpdGFibGUoe1xuXHRcdFx0XHRcdFx0XHRob3N0OiByZXEuaGVhZGVycy5ob3N0LFxuXHRcdFx0XHRcdFx0XHRwYXRoOiByZXEucGF0aCxcblx0XHRcdFx0XHRcdFx0cXVlcnk6IHJlcS5xdWVyeSxcblx0XHRcdFx0XHRcdFx0cGFyYW1zXG5cdFx0XHRcdFx0XHR9KS5zdWJzY3JpYmVcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHByZWxvYWRpbmc6IHtcblx0XHRcdFx0XHRcdHN1YnNjcmliZTogd3JpdGFibGUobnVsbCkuc3Vic2NyaWJlXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRzZXNzaW9uOiB3cml0YWJsZShzZXNzaW9uKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzZWdtZW50czogbGF5b3V0X3NlZ21lbnRzLFxuXHRcdFx0XHRzdGF0dXM6IGVycm9yID8gc3RhdHVzIDogMjAwLFxuXHRcdFx0XHRlcnJvcjogZXJyb3IgPyBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiB7IG1lc3NhZ2U6IGVycm9yIH0gOiBudWxsLFxuXHRcdFx0XHRsZXZlbDA6IHtcblx0XHRcdFx0XHRwcm9wczogcHJlbG9hZGVkWzBdXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGxldmVsMToge1xuXHRcdFx0XHRcdHNlZ21lbnQ6IHNlZ21lbnRzWzBdLFxuXHRcdFx0XHRcdHByb3BzOiB7fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoIWlzX3NlcnZpY2Vfd29ya2VyX2luZGV4KSB7XG5cdFx0XHRcdGxldCBsID0gMTtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBwYWdlLnBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRcdFx0Y29uc3QgcGFydCA9IHBhZ2UucGFydHNbaV07XG5cdFx0XHRcdFx0aWYgKCFwYXJ0KSBjb250aW51ZTtcblxuXHRcdFx0XHRcdHByb3BzW2BsZXZlbCR7bCsrfWBdID0ge1xuXHRcdFx0XHRcdFx0Y29tcG9uZW50OiBwYXJ0LmNvbXBvbmVudCxcblx0XHRcdFx0XHRcdHByb3BzOiBwcmVsb2FkZWRbaSArIDFdIHx8IHt9LFxuXHRcdFx0XHRcdFx0c2VnbWVudDogc2VnbWVudHNbaV1cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHsgaHRtbCwgaGVhZCwgY3NzIH0gPSBBcHAucmVuZGVyKHByb3BzKTtcblxuXHRcdFx0Y29uc3Qgc2VyaWFsaXplZCA9IHtcblx0XHRcdFx0cHJlbG9hZGVkOiBgWyR7cHJlbG9hZGVkLm1hcChkYXRhID0+IHRyeV9zZXJpYWxpemUoZGF0YSkpLmpvaW4oJywnKX1dYCxcblx0XHRcdFx0c2Vzc2lvbjogc2Vzc2lvbiAmJiB0cnlfc2VyaWFsaXplKHNlc3Npb24sIGVyciA9PiB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc2VyaWFsaXplIHNlc3Npb24gZGF0YTogJHtlcnIubWVzc2FnZX1gKTtcblx0XHRcdFx0fSksXG5cdFx0XHRcdGVycm9yOiBlcnJvciAmJiB0cnlfc2VyaWFsaXplKHByb3BzLmVycm9yKVxuXHRcdFx0fTtcblxuXHRcdFx0bGV0IHNjcmlwdCA9IGBfX1NBUFBFUl9fPXske1tcblx0XHRcdFx0ZXJyb3IgJiYgYGVycm9yOiR7c2VyaWFsaXplZC5lcnJvcn0sc3RhdHVzOiR7c3RhdHVzfWAsXG5cdFx0XHRcdGBiYXNlVXJsOlwiJHtyZXEuYmFzZVVybH1cImAsXG5cdFx0XHRcdHNlcmlhbGl6ZWQucHJlbG9hZGVkICYmIGBwcmVsb2FkZWQ6JHtzZXJpYWxpemVkLnByZWxvYWRlZH1gLFxuXHRcdFx0XHRzZXJpYWxpemVkLnNlc3Npb24gJiYgYHNlc3Npb246JHtzZXJpYWxpemVkLnNlc3Npb259YFxuXHRcdFx0XS5maWx0ZXIoQm9vbGVhbikuam9pbignLCcpfX07YDtcblxuXHRcdFx0aWYgKGhhc19zZXJ2aWNlX3dvcmtlcikge1xuXHRcdFx0XHRzY3JpcHQgKz0gYGlmKCdzZXJ2aWNlV29ya2VyJyBpbiBuYXZpZ2F0b3IpbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJyR7cmVxLmJhc2VVcmx9L3NlcnZpY2Utd29ya2VyLmpzJyk7YDtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZmlsZSA9IFtdLmNvbmNhdChidWlsZF9pbmZvLmFzc2V0cy5tYWluKS5maWx0ZXIoZmlsZSA9PiBmaWxlICYmIC9cXC5qcyQvLnRlc3QoZmlsZSkpWzBdO1xuXHRcdFx0Y29uc3QgbWFpbiA9IGAke3JlcS5iYXNlVXJsfS9jbGllbnQvJHtmaWxlfWA7XG5cblx0XHRcdGlmIChidWlsZF9pbmZvLmJ1bmRsZXIgPT09ICdyb2xsdXAnKSB7XG5cdFx0XHRcdGlmIChidWlsZF9pbmZvLmxlZ2FjeV9hc3NldHMpIHtcblx0XHRcdFx0XHRjb25zdCBsZWdhY3lfbWFpbiA9IGAke3JlcS5iYXNlVXJsfS9jbGllbnQvbGVnYWN5LyR7YnVpbGRfaW5mby5sZWdhY3lfYXNzZXRzLm1haW59YDtcblx0XHRcdFx0XHRzY3JpcHQgKz0gYChmdW5jdGlvbigpe3RyeXtldmFsKFwiYXN5bmMgZnVuY3Rpb24geCgpe31cIik7dmFyIG1haW49XCIke21haW59XCJ9Y2F0Y2goZSl7bWFpbj1cIiR7bGVnYWN5X21haW59XCJ9O3ZhciBzPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7dHJ5e25ldyBGdW5jdGlvbihcImlmKDApaW1wb3J0KCcnKVwiKSgpO3Muc3JjPW1haW47cy50eXBlPVwibW9kdWxlXCI7cy5jcm9zc09yaWdpbj1cInVzZS1jcmVkZW50aWFsc1wiO31jYXRjaChlKXtzLnNyYz1cIiR7cmVxLmJhc2VVcmx9L2NsaWVudC9zaGltcG9ydEAke2J1aWxkX2luZm8uc2hpbXBvcnR9LmpzXCI7cy5zZXRBdHRyaWJ1dGUoXCJkYXRhLW1haW5cIixtYWluKTt9ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzKTt9KCkpO2A7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2NyaXB0ICs9IGB2YXIgcz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO3RyeXtuZXcgRnVuY3Rpb24oXCJpZigwKWltcG9ydCgnJylcIikoKTtzLnNyYz1cIiR7bWFpbn1cIjtzLnR5cGU9XCJtb2R1bGVcIjtzLmNyb3NzT3JpZ2luPVwidXNlLWNyZWRlbnRpYWxzXCI7fWNhdGNoKGUpe3Muc3JjPVwiJHtyZXEuYmFzZVVybH0vY2xpZW50L3NoaW1wb3J0QCR7YnVpbGRfaW5mby5zaGltcG9ydH0uanNcIjtzLnNldEF0dHJpYnV0ZShcImRhdGEtbWFpblwiLFwiJHttYWlufVwiKX1kb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHMpYDtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2NyaXB0ICs9IGA8L3NjcmlwdD48c2NyaXB0IHNyYz1cIiR7bWFpbn1cIj5gO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgc3R5bGVzO1xuXG5cdFx0XHQvLyBUT0RPIG1ha2UgdGhpcyBjb25zaXN0ZW50IGFjcm9zcyBhcHBzXG5cdFx0XHQvLyBUT0RPIGVtYmVkIGJ1aWxkX2luZm8gaW4gcGxhY2Vob2xkZXIudHNcblx0XHRcdGlmIChidWlsZF9pbmZvLmNzcyAmJiBidWlsZF9pbmZvLmNzcy5tYWluKSB7XG5cdFx0XHRcdGNvbnN0IGNzc19jaHVua3MgPSBuZXcgU2V0KCk7XG5cdFx0XHRcdGlmIChidWlsZF9pbmZvLmNzcy5tYWluKSBjc3NfY2h1bmtzLmFkZChidWlsZF9pbmZvLmNzcy5tYWluKTtcblx0XHRcdFx0cGFnZS5wYXJ0cy5mb3JFYWNoKHBhcnQgPT4ge1xuXHRcdFx0XHRcdGlmICghcGFydCkgcmV0dXJuO1xuXHRcdFx0XHRcdGNvbnN0IGNzc19jaHVua3NfZm9yX3BhcnQgPSBidWlsZF9pbmZvLmNzcy5jaHVua3NbcGFydC5maWxlXTtcblxuXHRcdFx0XHRcdGlmIChjc3NfY2h1bmtzX2Zvcl9wYXJ0KSB7XG5cdFx0XHRcdFx0XHRjc3NfY2h1bmtzX2Zvcl9wYXJ0LmZvckVhY2goZmlsZSA9PiB7XG5cdFx0XHRcdFx0XHRcdGNzc19jaHVua3MuYWRkKGZpbGUpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzdHlsZXMgPSBBcnJheS5mcm9tKGNzc19jaHVua3MpXG5cdFx0XHRcdFx0Lm1hcChocmVmID0+IGA8bGluayByZWw9XCJzdHlsZXNoZWV0XCIgaHJlZj1cImNsaWVudC8ke2hyZWZ9XCI+YClcblx0XHRcdFx0XHQuam9pbignJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzdHlsZXMgPSAoY3NzICYmIGNzcy5jb2RlID8gYDxzdHlsZT4ke2Nzcy5jb2RlfTwvc3R5bGU+YCA6ICcnKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gdXNlcnMgY2FuIHNldCBhIENTUCBub25jZSB1c2luZyByZXMubG9jYWxzLm5vbmNlXG5cdFx0XHRjb25zdCBub25jZV9hdHRyID0gKHJlcy5sb2NhbHMgJiYgcmVzLmxvY2Fscy5ub25jZSkgPyBgIG5vbmNlPVwiJHtyZXMubG9jYWxzLm5vbmNlfVwiYCA6ICcnO1xuXG5cdFx0XHRjb25zdCBib2R5ID0gdGVtcGxhdGUoKVxuXHRcdFx0XHQucmVwbGFjZSgnJXNhcHBlci5iYXNlJScsICgpID0+IGA8YmFzZSBocmVmPVwiJHtyZXEuYmFzZVVybH0vXCI+YClcblx0XHRcdFx0LnJlcGxhY2UoJyVzYXBwZXIuc2NyaXB0cyUnLCAoKSA9PiBgPHNjcmlwdCR7bm9uY2VfYXR0cn0+JHtzY3JpcHR9PC9zY3JpcHQ+YClcblx0XHRcdFx0LnJlcGxhY2UoJyVzYXBwZXIuaHRtbCUnLCAoKSA9PiBodG1sKVxuXHRcdFx0XHQucmVwbGFjZSgnJXNhcHBlci5oZWFkJScsICgpID0+IGA8bm9zY3JpcHQgaWQ9J3NhcHBlci1oZWFkLXN0YXJ0Jz48L25vc2NyaXB0PiR7aGVhZH08bm9zY3JpcHQgaWQ9J3NhcHBlci1oZWFkLWVuZCc+PC9ub3NjcmlwdD5gKVxuXHRcdFx0XHQucmVwbGFjZSgnJXNhcHBlci5zdHlsZXMlJywgKCkgPT4gc3R5bGVzKTtcblxuXHRcdFx0cmVzLnN0YXR1c0NvZGUgPSBzdGF0dXM7XG5cdFx0XHRyZXMuZW5kKGJvZHkpO1xuXHRcdH0gY2F0Y2goZXJyKSB7XG5cdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0YmFpbChyZXEsIHJlcywgZXJyKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGhhbmRsZV9lcnJvcihyZXEsIHJlcywgNTAwLCBlcnIpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBmdW5jdGlvbiBmaW5kX3JvdXRlKHJlcSwgcmVzLCBuZXh0KSB7XG5cdFx0aWYgKHJlcS5wYXRoID09PSAnL3NlcnZpY2Utd29ya2VyLWluZGV4Lmh0bWwnKSB7XG5cdFx0XHRjb25zdCBob21lUGFnZSA9IHBhZ2VzLmZpbmQocGFnZSA9PiBwYWdlLnBhdHRlcm4udGVzdCgnLycpKTtcblx0XHRcdGhhbmRsZV9wYWdlKGhvbWVQYWdlLCByZXEsIHJlcyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Zm9yIChjb25zdCBwYWdlIG9mIHBhZ2VzKSB7XG5cdFx0XHRpZiAocGFnZS5wYXR0ZXJuLnRlc3QocmVxLnBhdGgpKSB7XG5cdFx0XHRcdGhhbmRsZV9wYWdlKHBhZ2UsIHJlcSwgcmVzKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhhbmRsZV9lcnJvcihyZXEsIHJlcywgNDA0LCAnTm90IGZvdW5kJyk7XG5cdH07XG59XG5cbmZ1bmN0aW9uIHJlYWRfdGVtcGxhdGUoZGlyID0gYnVpbGRfZGlyKSB7XG5cdHJldHVybiBmcy5yZWFkRmlsZVN5bmMoYCR7ZGlyfS90ZW1wbGF0ZS5odG1sYCwgJ3V0Zi04Jyk7XG59XG5cbmZ1bmN0aW9uIHRyeV9zZXJpYWxpemUoZGF0YSwgZmFpbCkge1xuXHR0cnkge1xuXHRcdHJldHVybiBkZXZhbHVlKGRhdGEpO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRpZiAoZmFpbCkgZmFpbChlcnIpO1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGVzY2FwZV9odG1sKGh0bWwpIHtcblx0Y29uc3QgY2hhcnMgPSB7XG5cdFx0J1wiJyA6ICdxdW90Jyxcblx0XHRcIidcIjogJyMzOScsXG5cdFx0JyYnOiAnYW1wJyxcblx0XHQnPCcgOiAnbHQnLFxuXHRcdCc+JyA6ICdndCdcblx0fTtcblxuXHRyZXR1cm4gaHRtbC5yZXBsYWNlKC9bXCInJjw+XS9nLCBjID0+IGAmJHtjaGFyc1tjXX07YCk7XG59XG5cbmZ1bmN0aW9uIG1pZGRsZXdhcmUob3B0c1xuXG5cbiA9IHt9KSB7XG5cdGNvbnN0IHsgc2Vzc2lvbiwgaWdub3JlIH0gPSBvcHRzO1xuXG5cdGxldCBlbWl0dGVkX2Jhc2VwYXRoID0gZmFsc2U7XG5cblx0cmV0dXJuIGNvbXBvc2VfaGFuZGxlcnMoaWdub3JlLCBbXG5cdFx0KHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cdFx0XHRpZiAocmVxLmJhc2VVcmwgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRsZXQgeyBvcmlnaW5hbFVybCB9ID0gcmVxO1xuXHRcdFx0XHRpZiAocmVxLnVybCA9PT0gJy8nICYmIG9yaWdpbmFsVXJsW29yaWdpbmFsVXJsLmxlbmd0aCAtIDFdICE9PSAnLycpIHtcblx0XHRcdFx0XHRvcmlnaW5hbFVybCArPSAnLyc7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXEuYmFzZVVybCA9IG9yaWdpbmFsVXJsXG5cdFx0XHRcdFx0PyBvcmlnaW5hbFVybC5zbGljZSgwLCAtcmVxLnVybC5sZW5ndGgpXG5cdFx0XHRcdFx0OiAnJztcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFlbWl0dGVkX2Jhc2VwYXRoICYmIHByb2Nlc3Muc2VuZCkge1xuXHRcdFx0XHRwcm9jZXNzLnNlbmQoe1xuXHRcdFx0XHRcdF9fc2FwcGVyX186IHRydWUsXG5cdFx0XHRcdFx0ZXZlbnQ6ICdiYXNlcGF0aCcsXG5cdFx0XHRcdFx0YmFzZXBhdGg6IHJlcS5iYXNlVXJsXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGVtaXR0ZWRfYmFzZXBhdGggPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVxLnBhdGggPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRyZXEucGF0aCA9IHJlcS51cmwucmVwbGFjZSgvXFw/LiovLCAnJyk7XG5cdFx0XHR9XG5cblx0XHRcdG5leHQoKTtcblx0XHR9LFxuXG5cdFx0ZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYnVpbGRfZGlyLCAnc2VydmljZS13b3JrZXIuanMnKSkgJiYgc2VydmUoe1xuXHRcdFx0cGF0aG5hbWU6ICcvc2VydmljZS13b3JrZXIuanMnLFxuXHRcdFx0Y2FjaGVfY29udHJvbDogJ25vLWNhY2hlLCBuby1zdG9yZSwgbXVzdC1yZXZhbGlkYXRlJ1xuXHRcdH0pLFxuXG5cdFx0ZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYnVpbGRfZGlyLCAnc2VydmljZS13b3JrZXIuanMubWFwJykpICYmIHNlcnZlKHtcblx0XHRcdHBhdGhuYW1lOiAnL3NlcnZpY2Utd29ya2VyLmpzLm1hcCcsXG5cdFx0XHRjYWNoZV9jb250cm9sOiAnbm8tY2FjaGUsIG5vLXN0b3JlLCBtdXN0LXJldmFsaWRhdGUnXG5cdFx0fSksXG5cblx0XHRzZXJ2ZSh7XG5cdFx0XHRwcmVmaXg6ICcvY2xpZW50LycsXG5cdFx0XHRjYWNoZV9jb250cm9sOiBkZXYgPyAnbm8tY2FjaGUnIDogJ21heC1hZ2U9MzE1MzYwMDAsIGltbXV0YWJsZSdcblx0XHR9KSxcblxuXHRcdGdldF9zZXJ2ZXJfcm91dGVfaGFuZGxlcihtYW5pZmVzdC5zZXJ2ZXJfcm91dGVzKSxcblxuXHRcdGdldF9wYWdlX2hhbmRsZXIobWFuaWZlc3QsIHNlc3Npb24gfHwgbm9vcClcblx0XS5maWx0ZXIoQm9vbGVhbikpO1xufVxuXG5mdW5jdGlvbiBjb21wb3NlX2hhbmRsZXJzKGlnbm9yZSwgaGFuZGxlcnMpIHtcblx0Y29uc3QgdG90YWwgPSBoYW5kbGVycy5sZW5ndGg7XG5cblx0ZnVuY3Rpb24gbnRoX2hhbmRsZXIobiwgcmVxLCByZXMsIG5leHQpIHtcblx0XHRpZiAobiA+PSB0b3RhbCkge1xuXHRcdFx0cmV0dXJuIG5leHQoKTtcblx0XHR9XG5cblx0XHRoYW5kbGVyc1tuXShyZXEsIHJlcywgKCkgPT4gbnRoX2hhbmRsZXIobisxLCByZXEsIHJlcywgbmV4dCkpO1xuXHR9XG5cblx0cmV0dXJuICFpZ25vcmVcblx0XHQ/IChyZXEsIHJlcywgbmV4dCkgPT4gbnRoX2hhbmRsZXIoMCwgcmVxLCByZXMsIG5leHQpXG5cdFx0OiAocmVxLCByZXMsIG5leHQpID0+IHtcblx0XHRcdGlmIChzaG91bGRfaWdub3JlKHJlcS5wYXRoLCBpZ25vcmUpKSB7XG5cdFx0XHRcdG5leHQoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG50aF9oYW5kbGVyKDAsIHJlcSwgcmVzLCBuZXh0KTtcblx0XHRcdH1cblx0XHR9O1xufVxuXG5mdW5jdGlvbiBzaG91bGRfaWdub3JlKHVyaSwgdmFsKSB7XG5cdGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHJldHVybiB2YWwuc29tZSh4ID0+IHNob3VsZF9pZ25vcmUodXJpLCB4KSk7XG5cdGlmICh2YWwgaW5zdGFuY2VvZiBSZWdFeHApIHJldHVybiB2YWwudGVzdCh1cmkpO1xuXHRpZiAodHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHZhbCh1cmkpO1xuXHRyZXR1cm4gdXJpLnN0YXJ0c1dpdGgodmFsLmNoYXJDb2RlQXQoMCkgPT09IDQ3ID8gdmFsIDogYC8ke3ZhbH1gKTtcbn1cblxuZnVuY3Rpb24gc2VydmUoeyBwcmVmaXgsIHBhdGhuYW1lLCBjYWNoZV9jb250cm9sIH1cblxuXG5cbikge1xuXHRjb25zdCBmaWx0ZXIgPSBwYXRobmFtZVxuXHRcdD8gKHJlcSkgPT4gcmVxLnBhdGggPT09IHBhdGhuYW1lXG5cdFx0OiAocmVxKSA9PiByZXEucGF0aC5zdGFydHNXaXRoKHByZWZpeCk7XG5cblx0Y29uc3QgY2FjaGUgPSBuZXcgTWFwKCk7XG5cblx0Y29uc3QgcmVhZCA9IGRldlxuXHRcdD8gKGZpbGUpID0+IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oYnVpbGRfZGlyLCBmaWxlKSlcblx0XHQ6IChmaWxlKSA9PiAoY2FjaGUuaGFzKGZpbGUpID8gY2FjaGUgOiBjYWNoZS5zZXQoZmlsZSwgZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihidWlsZF9kaXIsIGZpbGUpKSkpLmdldChmaWxlKTtcblxuXHRyZXR1cm4gKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cdFx0aWYgKGZpbHRlcihyZXEpKSB7XG5cdFx0XHRjb25zdCB0eXBlID0gbGl0ZS5nZXRUeXBlKHJlcS5wYXRoKTtcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y29uc3QgZmlsZSA9IHBhdGgucG9zaXgubm9ybWFsaXplKGRlY29kZVVSSUNvbXBvbmVudChyZXEucGF0aCkpO1xuXHRcdFx0XHRjb25zdCBkYXRhID0gcmVhZChmaWxlKTtcblxuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCB0eXBlKTtcblx0XHRcdFx0cmVzLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsIGNhY2hlX2NvbnRyb2wpO1xuXHRcdFx0XHRyZXMuZW5kKGRhdGEpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNDA0O1xuXHRcdFx0XHRyZXMuZW5kKCdub3QgZm91bmQnKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0bmV4dCgpO1xuXHRcdH1cblx0fTtcbn1cblxuZnVuY3Rpb24gbm9vcCgpe31cblxuZXhwb3J0IHsgbWlkZGxld2FyZSB9O1xuIiwiaW1wb3J0IHNpcnYgZnJvbSAnc2lydic7XG5pbXBvcnQgcG9sa2EgZnJvbSAncG9sa2EnO1xuaW1wb3J0IGNvbXByZXNzaW9uIGZyb20gJ2NvbXByZXNzaW9uJztcbmltcG9ydCAqIGFzIHNhcHBlciBmcm9tICdAc2FwcGVyL3NlcnZlcic7XG5cbmNvbnN0IHsgUE9SVCwgTk9ERV9FTlYgfSA9IHByb2Nlc3MuZW52O1xuY29uc3QgZGV2ID0gTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCc7XG5cbnBvbGthKCkgLy8gWW91IGNhbiBhbHNvIHVzZSBFeHByZXNzXG5cdC51c2UoXG5cdFx0Y29tcHJlc3Npb24oeyB0aHJlc2hvbGQ6IDAgfSksXG5cdFx0c2lydignc3RhdGljJywgeyBkZXYgfSksXG5cdFx0c2FwcGVyLm1pZGRsZXdhcmUoKVxuXHQpXG5cdC5saXN0ZW4oUE9SVCwgZXJyID0+IHtcblx0XHRpZiAoZXJyKSBjb25zb2xlLmxvZygnZXJyb3InLCBlcnIpO1xuXHR9KTtcbiJdLCJuYW1lcyI6WyJwcmVsb2FkIiwiZXNjYXBlIiwiZXNjYXBlJDEiLCJjc3MiLCJobGpzIiwiYmFzaCIsInNxbCIsImNvbXBvbmVudF8wIiwicHJlbG9hZF8wIiwiY29tcG9uZW50XzEiLCJwcmVsb2FkXzEiLCJjb21wb25lbnRfMiIsInByZWxvYWRfMiIsImNvbXBvbmVudF8zIiwicHJlbG9hZF8zIiwiY29tcG9uZW50XzQiLCJwcmVsb2FkXzQiLCJjb21wb25lbnRfNSIsImNvbXBvbmVudF82IiwicHJlbG9hZF82Iiwicm9vdCIsImVycm9yIiwiZXNjYXBlZCIsImZldGNoIiwibm9vcCIsInNhcHBlci5taWRkbGV3YXJlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxTQUFTLElBQUksR0FBRyxHQUFHO0FBZ0JuQixTQUFTLEdBQUcsQ0FBQyxFQUFFLEVBQUU7QUFDakIsSUFBSSxPQUFPLEVBQUUsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUFDRCxTQUFTLFlBQVksR0FBRztBQUN4QixJQUFJLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBQ0QsU0FBUyxPQUFPLENBQUMsR0FBRyxFQUFFO0FBQ3RCLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNyQixDQUFDO0FBSUQsU0FBUyxjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUM5QixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxLQUFLLE9BQU8sQ0FBQyxLQUFLLFVBQVUsQ0FBQyxD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b0c7QUFDaEgsWUFBWSxzR0FBc0c7QUFDbEgsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSx5R0FBeUc7QUFDckgsWUFBWSw2RkFBNkY7QUFDekcsWUFBWSw4R0FBOEc7QUFDMUgsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSxrR0FBa0c7QUFDOUcsWUFBWSw2RkFBNkY7QUFDekcsWUFBWSx1R0FBdUc7QUFDbkgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSxtR0FBbUc7QUFDL0csWUFBWSxzR0FBc0c7QUFDbEgsWUFBWSxrSEFBa0g7QUFDOUgsWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSxnR0FBZ0c7QUFDNUcsWUFBWSx5R0FBeUc7QUFDckgsWUFBWSx5R0FBeUc7QUFDckgsWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSx5R0FBeUc7QUFDckgsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSxzR0FBc0c7QUFDbEgsWUFBWSxpR0FBaUc7QUFDN0csWUFBWSxtR0FBbUc7QUFDL0csWUFBWSx5R0FBeUc7QUFDckgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSxxR0FBcUc7QUFDakgsWUFBWSxvR0FBb0c7QUFDaEgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSx5R0FBeUc7QUFDckgsWUFBWSx5RkFBeUY7QUFDckcsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSw4R0FBOEc7QUFDMUgsWUFBWSx1R0FBdUc7QUFDbkgsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSx1R0FBdUc7QUFDbkgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSxvSEFBb0g7QUFDaEksWUFBWSwyR0FBMkc7QUFDdkgsWUFBWSxrR0FBa0c7QUFDOUcsWUFBWSxxR0FBcUc7QUFDakgsWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSxzR0FBc0c7QUFDbEgsWUFBWSx5R0FBeUc7QUFDckgsWUFBWSxnR0FBZ0c7QUFDNUcsWUFBWSw4RkFBOEY7QUFDMUcsWUFBWSxxR0FB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QUFpQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsa0NBQWtDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDN3NQO0FBQ0EsSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEM7QUFDQSxTQUFTLHdCQUF3QixDQUFDLE1BQU0sRUFBRTtBQUMxQyxDQUFDLGVBQWUsWUFBWSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRTtBQUNwRCxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFB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
