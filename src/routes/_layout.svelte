<script>
  import Nav from "../components/Nav.svelte";
  import Header from "../components/Header.svelte";
  import Footer from "../components/Footer.svelte";
  export let segment;
</script>

<Nav {segment} />
<Header {segment} />
<section class="container margin-auto padding-left20 padding-right20">
  <slot />
</section>
<Footer />
