<script context="module">
  import { authors } from "../../_helpers/store.js";
  export async function preload({ params, query }) {
    // the `slug` parameter is available because
    // this file is called [slug].svelte
    let authorMap = new Map();
    authors.subscribe(value => {
      authorMap = value;
    });

    const res = await this.fetch(`BASE_PATH/posts/route/${params.slug}`);
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
        const res = await this.fetch(`BASE_PATH/users/${data.authorId}`);
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
</script>

<script>
  import Author from "../../components/Author.svelte";
  import hljs from "highlight.js/lib/core";
  import javascript from "highlight.js/lib/languages/javascript";
  import bash from "highlight.js/lib/languages/bash";
  import sql from "highlight.js/lib/languages/sql";
  import scss from "highlight.js/lib/languages/scss";
  import json from "highlight.js/lib/languages/json";
  import css from "highlight.js/lib/languages/css";
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("sql", sql);
  hljs.registerLanguage("scss", scss);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("css", css);

  export let post;
  export let authorData;

  const highlight = source => {
    const { value: highlighted } = hljs.highlightAuto(source);
    return highlighted;
  };

  let pageViews = 0;
  if (typeof fetch !== "function") {
    global.fetch = require("node-fetch");
  }
  fetch(`BASE_PATH/posts-meta-data/${post._id}`)
    .then(response => response.json())
    .then(({ count }) => {
      pageViews = count;
    });
</script>

<style>
  /*
		By default, CSS is locally scoped to the component,
		and any unused styles are dead-code-eliminated.
		In this page, Svelte can't know which elements are
		going to appear inside the {{{post.html}}} block,
		so we have to use the :global(...) modifier to target
		all elements inside .content
	*/
  /* .content :global(h2) {
    font-size: 1.4em;
    font-weight: 500;
  } */

  /* .content :global(pre) {
    background-color: #f9f9f9;
    box-shadow: inset 1px 1px 5px rgba(0, 0, 0, 0.05);
    padding: 0.5em;
    border-radius: 2px;
    overflow-x: auto;
  } */

  /* .content :global(pre) :global(code) {
    background-color: transparent;
    padding: 0;
  }

  .content :global(ul) {
    line-height: 1.5;
  }

  .content :global(li) {
    margin: 0 0 0.5em 0;
  } */

  @media only screen and (min-width: 800px) {
    .post--metadata {
      display: grid;
      grid-template-columns: 0.8fr 2.2fr 0.4fr 1fr;
      -webkit-box-align: center;
      align-items: center;
    }
  }

  .post__tag {
    padding: 3px 5px;
    background-color: #dcdcdc;
    margin: 2px 3px;
    border-radius: 3px;
    display: inline-block;
  }
  .post--body {
    margin: 0px 10px;
  }

  pre {
    margin-bottom: 1em;
    padding: 5%;
    width: auto;
    /* max-height: 900px; */
    overflow: auto;
    font-size: 1.4em;
    line-height: 1.3em;
  }

  img {
    max-width: 100%;
  }
  .center {
    display: block;
    margin: 50px auto;
    box-shadow: -3px 8px 10px #d8d8d8;
    width: 100%;
    max-width: -webkit-max-content;
    max-width: -moz-max-content;
    max-width: max-content;
    border-radius: 2px;
  }

  .post--title {
    font-size: 36px;
    margin: 15px 0 5px;
    font-weight: lighter;
  }
  .post--sub-title {
    font-weight: lighter;
    font-size: 22px;
    margin-top: 10px;
  }

  .post--metadata {
    margin-top: 10px;
  }

  h3 {
    font-size: 2rem;
    font-weight: 600;
    color: var(--textblack);
  }
</style>

<svelte:head>
  <title>{post.title}</title>
  <meta name="keywords" content={post.subTitle} />
  <meta name="description" content={post.tags.join(', ')} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@_hectane" />
  <meta name="twitter:creator" content="@velusgautam" />
  <meta name="twitter:title" content={post.title} />
  <meta name="twitter:description" content={post.subTitle} />
  <meta name="twitter:image" content={`ASSET_BASE/${post.route}/title.jpg`} />

  <meta property="og:url" content={`https://hectane.com/blog/${post.route}`} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={post.title} />
  <meta property="og:description" content={post.subTitle} />
  <meta property="og:image" content={`ASSET_BASE/${post.route}/title.jpg`} />
</svelte:head>

<div class="content">
  <h1 class="post--title">{post.title}</h1>
  <h4 class="post--sub-title">{post.subTitle}</h4>
  <picture>
    <source
      srcset={`ASSET_BASE/${post.route}/mobile.webp`}
      media="(max-width: 420px)"
      type="image/webp" />
    <source
      srcset={`ASSET_BASE/${post.route}/mobile.jpg`}
      media="(max-width: 420px)"
      type="image/jpg" />
    <source
      srcset={`ASSET_BASE/${post.route}/listing.webp`}
      media="( max-width:799px)"
      type="image/webp" />
    <source
      srcset={`ASSET_BASE/${post.route}/listing.jpg`}
      media="(max-width:799px)"
      type="image/jpg" />
    <source
      srcset={`ASSET_BASE/${post.route}/title.webp`}
      media="(min-width: 800px)"
      type="image/webp" />
    <source
      srcset={`ASSET_BASE/${post.route}/title.jpg`}
      media="(min-width: 800px)"
      type="image/jpg" />
    <img
      class="post-title-image"
      src={`ASSET_BASE/${post.route}/title.jpg`}
      alt={post.title} />
  </picture>
  <div class="post--metadata">
    <Author
      name={authorData.name}
      avathar={authorData.avathar}
      createdDate={post.createdDate} />
    <div class="post__tags">
      {#each post.tags as tag}
        <span class="post__tag">{tag}</span>
      {/each}
    </div>
    <div class="post__views">{pageViews} views</div>
  </div>
  <div class="post--body">
    {#each post.body as { type, data }}
      {#if type === 'image'}
        <picture>
          <img
            alt={data.caption}
            class={`${data.withBorder ? 'border ' : ''}${data.withBackground ? 'background ' : ''}${data.stretched ? 'stretched' : 'center'}`}
            src={`${data.url.replace(/\.[^/.]+$/, '')}.jpg`} />
        </picture>
      {/if}
      {#if type === 'header'}
        {#if data.level === 1}
          <h1>{data.text}</h1>
        {/if}
        {#if data.level === 2}
          <h2>{data.text}</h2>
        {/if}
        {#if data.level === 3}
          <h3>{data.text}</h3>
        {/if}
        {#if data.level === 4}
          <h4>{data.text}</h4>
        {/if}
      {/if}
      {#if type === 'code'}
        <pre class="hljs">
          <code>
            {@html `${highlight(data.code)}`}
          </code>
        </pre>
      {/if}
      {#if type === 'paragraph'}
        <p>
          {@html data.text}
        </p>
      {/if}
    {/each}
  </div>
</div>
