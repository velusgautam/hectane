<script context="module">
  import { getAuthors } from "../_helpers/get-authors.js";
  export async function preload({ path }, session) {
    const res = await this.fetch(`https://backend.hectane.com/posts${path}/7`);

    const data = await res.json();

    // checking if data status is 200 and data is an array
    if (res.status === 200 && Array.isArray(data)) {
      const authorMap = await getAuthors(data, this.fetch);
      return { posts: data, authorMap };
    } else {
      this.error(res.status, data.message);
    }
  }
</script>

<script>
  import Post from "../components/Post.svelte";
  export let posts;
  export let authorMap;
</script>

<svelte:head>
  <title>Hectane | Home Page</title>
  <meta
    name="description"
    content="Hectane is a simple blog covering experiences from its authors. It
    now covers areas like Technology, Interviews, Travelogue and Learnings. I
    Velu S Gautam (Core Developer) of the blog invite contributions from others
    with similar experiences. The below topics are the top 10 in the page now. " />
</svelte:head>

<div class="listing--container">
  {#each posts as post}
    <Post {post} author={authorMap.get(post.authorId)} />
  {/each}
</div>
