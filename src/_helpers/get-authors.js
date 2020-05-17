import { authors } from './store.js';

export const getAuthors = async (data = [], fetch) => {
  const authorIds = new Set();
  let authorMap = new Map();
  let authorData = [];

  authors.subscribe((value) => {
    authorMap = value;
  });

  // creating unique author ids from the posts
  data.forEach((d) => {
    if (!authorMap.get(d.authorId)) {
      authorIds.add(d.authorId);
    }
  });

  if (authorIds.size > 0) {
    // getting author data for all unique authors to avoid multi fetch
    authorData = await Promise.all(
      Array.from(authorIds).map(async (id) => {
        // feching author data
        const res = await fetch(`BASE_PATH/users/${id}`);
        return res.json();
      })
    );
    // creating a Map to hold unique authors by authorId as key
    authorData.forEach((u) => {
      authorMap.set(u._id, u);
    });
    authors.set(authorMap);
  }

  return authorMap;
};
