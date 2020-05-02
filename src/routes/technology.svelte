<script context="module">
  export async function preload({ path }, session) {
    console.log("path", path);
    console.log("session", session);

    const res = await this.fetch(`http://localhost:3200/posts${path}/7`);

    const data = await res.json();

    // checking if data status is 200 and data is an array
    if (res.status === 200 && Array.isArray(data)) {
      // creating a new set to hold unique author ids
      const authorIds = new Set();

      // creating unique author ids from the posts
      data.forEach(d => authorIds.add(d.authorId));

      // getting author data for all unique authors to avoid multi fetch
      const authorData = await Promise.all(
        Array.from(authorIds).map(async id => {
          // feching author data
          const res = await this.fetch(`http://localhost:3200/users/${id}`);
          return res.json();
        })
      );

      // creating a Map to hold unique authors by authorId as key
      const authorMap = new Map(authorData.map(u => [u._id, u]));

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
