<script>
  export let segment;
</script>

<style>
  nav {
    font-weight: 300;
    padding: 0 1em;
    grid-area: nav;
  }

  ul {
    margin: 0 auto;
    padding: 0;
    display: flex;
    justify-content: space-evenly;
    flex-wrap: wrap;
    width: fit-content;
  }

  li {
    list-style-type: none;
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

  h3 {
    text-align: center;
    padding: 0px 15px;
  }

  h3 img {
    width: 100%;
    max-width: min-content;
  }
</style>

<div>
  <h3>
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
          Travelogue
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
