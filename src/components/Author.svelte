<script>
  export let avathar;
  export let name;
  export let createdDate;
</script>

<style>
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
      opacity: 0.5;
      transform: translateY(-1px);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

<div class="post--author">
  <img class="img" src={avathar} alt="Velu S Gautam" />
  <div class="details">
    <div class="name">{name}</div>
    <div class="date">
      {new Date(createdDate)
        .toJSON()
        .slice(0, 10)
        .split('-')
        .reverse()
        .join('-')}
    </div>
  </div>
</div>
