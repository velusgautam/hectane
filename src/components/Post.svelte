<script>
  export let post;
  export let author;
</script>

<style>
  .post--container {
    /* grid-area: post; */
    align-self: start;
  }
  @media only screen and (min-width: 800px) {
    .listing--container > :nth-child(1) {
      grid-column: 1 / 4;
      display: grid;
      grid-template-columns: 2fr 1fr;
      grid-column-gap: 5px;
    }

    .listing--container :nth-child(1) .post--title-image {
      grid-column: 1 / 2;
      grid-row: 1 / 4;
      align-self: start;
      /* height: 350px; */
    }

    .listing--container :nth-child(1) .post--header {
      margin-top: 0px;
      margin-left: 15px;
      display: block;
    }

    .listing--container :nth-child(1) .post--header .post--title,
    .listing--container :nth-child(1) .post--header .post--subTitle {
      margin-top: 0px;
    }

    .listing--container :nth-child(1) .post--author {
      grid-column: 2 / 3;
      grid-row: 3 / 4;
      align-self: start;
      margin-left: 15px;
    }
  }

  .post--title-image {
    display: block;
    margin-bottom: 15px;
    width: 100%;
  }

  a {
    text-decoration: none;
    color: var(--textBlack);
  }

  .post--title {
    font-size: 1.5rem;
    font-weight: 500;
  }

  .post--author {
    display: flex;
    align-items: center;
    animation: falldown 1s ease;
  }

  .post--author .img {
    border-radius: 100%;
    border: 2px solid #b3b3b3;
    box-shadow: -3px 6px 6px #d8d8d8;
  }

  .details {
    font-size: small;
    margin-left: 8px;
  }

  @keyframes falldown {
    0% {
      opacity: 0;
      transform: translateY(-50px);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

<div class="post--container">

  <a href={`./blog/${post.route}`}>
    <img
      class="post--title-image"
      src={`https://assets.hectane.com/${post.route}/listing.jpg`}
      alt={post.route} />
  </a>
  <div>
    <a href={`./blog/${post.route}`} class="post--header">
      <h3 class="post--title">{post.title}</h3>
      <p class="post--subTitle">{post.subTitle}</p>
    </a>

    <div class="post--author">
      <img class="img" src={author.avathar} alt="Velu S Gautam" />
      <div class="details">
        <div class="name">{author.name}</div>
        <div class="date">
          {new Date(post.createdDate)
            .toJSON()
            .slice(0, 10)
            .split('-')
            .reverse()
            .join('-')}
        </div>
      </div>
    </div>
  </div>

</div>
