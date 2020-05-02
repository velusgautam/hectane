<script>
  export let segment;
</script>

<style>
  .page--title {
    color: var(--textBlack);
    font-size: 1.8rem;
    font-weight: 500;
    border-bottom: 1px solid var(--lightgrey);
  }
</style>

{#if segment !== 'blog'}
  <header class="container margin-auto padding-left20 padding-right20">
    <h1 class="page--title">
      {segment === undefined ? 'Home' : String(segment)
            .charAt(0)
            .toUpperCase() + String(segment).slice(1)}
    </h1>
  </header>
{/if}
