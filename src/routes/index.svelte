<script context="module">
  export async function preload() {
    const res = await this.fetch("http://localhost:3200/posts/limit/7");
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data)) {
      const userIds = new Set();
      const userData = new Map();
      data.forEach(d => userIds.add(d.authorId));

      const userPromises = await Promise.all(
        Array.from(userIds).map(async id => {
          const res = await this.fetch(`http://localhost:3200/users/${id}`);
          return res.json();
        })
      );

      const userMap = new Map(userPromises.map(u => [u._id, u]));

      return { posts: data, userMap };
    } else {
      this.error(res.status, data.message);
    }
  }
</script>

<script>
  import Post from "../components/Post.svelte";
  export let posts;
  export let userMap;
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
    <Post {post} user={userMap.get(post.authorId)} />
  {/each}
</div>
