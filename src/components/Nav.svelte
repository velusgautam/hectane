<script>
  export let segment;
</script>

<style>
  nav {
    /* border-bottom: 1px solid rgba(255, 62, 0, 0.1); */
    font-weight: 300;
    padding: 0 1em;
    /* margin: 0 20px; */
    grid-area: nav;
    display: -webkit-box;
    display: flex;
    -webkit-box-pack: center;
    justify-content: center;
    -webkit-box-align: center;
    align-items: center;
    flex-wrap: wrap;
  }

  ul {
    margin: 0;
    padding: 0;
  }

  /* clearfix */
  ul::after {
    content: "";
    display: block;
    clear: both;
  }

  li {
    display: block;
    float: left;
  }

  [aria-current] {
    position: relative;
    display: inline-block;
  }

  [aria-current]::after {
    position: absolute;
    content: "";
    width: calc(100% - 1em);
    height: 2px;
    background-color: rgb(255, 62, 0);
    display: block;
    bottom: -1px;
  }

  a {
    text-decoration: none;
    padding: 1em 0.5em;
    display: block;
    color: var(--black);
  }
</style>

<div>
  <h3 style="text-align:center">
    <picture>
      <source srcset="logo.webp" type="image/webp" />
      <img src="logo.png" alt="hectane logo" />
    </picture>
  </h3>
  <nav class="margin-auto container ">
    <ul>
      <li>
        <a
          rel="prefetch"
          aria-current={segment === undefined ? 'page' : undefined}
          href=".">
          Home
        </a>
      </li>
      <li>
        <a
          rel="prefetch"
          aria-current={segment === 'technology' ? 'page' : undefined}
          href="technology">
          Technology
        </a>
      </li>
      <li>
        <a
          rel="prefetch"
          aria-current={segment === 'interviews' ? 'page' : undefined}
          href="interviews">
          Interviews
        </a>
      </li>
      <li>
        <a
          rel="prefetch"
          aria-current={segment === 'learnings' ? 'page' : undefined}
          href="learnings">
          Learnings
        </a>
      </li>
      <li>
        <a
          rel="prefetch"
          aria-current={segment === 'travelogue' ? 'page' : undefined}
          href="travelogue">
          Travelouge
        </a>
      </li>

      <!-- for the blog link, we're using rel=prefetch so that Sapper prefetches
		     the blog data when we hover over the link or tap it on a touchscreen -->
      <!-- <li>
      <a
        rel="prefetch"
        aria-current={segment === 'blog' ? 'page' : undefined}
        href="blog">
        blog
      </a>
    </li> -->
    </ul>
  </nav>
</div>
