// @ts-check

/**
 * Bluesky Keyboard Navigation Extension
 *
 * Adds keyboard shortcuts to Bluesky (bsky.app):
 * - j: Move down to next post
 * - k: Move up to previous post
 * - l: Like/unlike the current post
 * - Enter: Open the current post
 *
 * Works in both the main feed and in thread views.
 * The currently focused post is highlighted with a blue outline.
 * Navigation automatically scrolls posts into view, accounting for the fixed header.
 *
 * Keyboard shortcuts are disabled when typing in input fields or textareas.
 */

// Style for focused posts
const style = document.createElement("style");
style.textContent = `
  .bsky-focused-post {
    outline: 2px solid #0085ff !important;
    outline-offset: -2px;
  }
`;
document.head.appendChild(style);

let currentFocusedPost = null;

// Add flag to track programmatic clicks
let isExtensionClick = false;

function getAllPosts() {
  // Check if we're in a thread view by looking at the URL
  const isThreadView = /\/post\/[a-zA-Z0-9]+$/.test(window.location.pathname);

  // Use different selectors based on whether we're in a thread or feed view
  const selector = isThreadView
    ? 'div[data-testid^="postThreadItem-by-"]'
    : 'div[data-testid^="feedItem-by-"]';

  console.log(selector);

  return Array.from(document.querySelectorAll(selector));
}

function focusPost(post) {
  // Remove focus from previous post
  if (currentFocusedPost) {
    currentFocusedPost.classList.remove("bsky-focused-post");
  }

  // Add focus to new post
  currentFocusedPost = post;
  post.classList.add("bsky-focused-post");

  // Calculate scroll position accounting for fixed header
  const headerOffset = 49;
  const postPosition =
    post.getBoundingClientRect().top + window.scrollY - headerOffset;

  // Scroll instantly to the adjusted position
  window.scrollTo({
    top: postPosition,
    behavior: "auto", // 'auto' for instant scrolling instead of 'smooth'
  });
}

function likeCurrentPost() {
  if (!currentFocusedPost) return;

  // Find the like button within the focused post
  const likeButton = currentFocusedPost.querySelector(
    'div[aria-label^="Like ("],div[aria-label^="Unlike ("]'
  );
  if (likeButton) {
    isExtensionClick = true;
    likeButton.click();
    isExtensionClick = false;
  }
}

function openCurrentPost() {
  if (!currentFocusedPost) {
    return;
  }
  isExtensionClick = true;
  currentFocusedPost.click();
  isExtensionClick = false;
  currentFocusedPost.classList.remove("bsky-focused-post");
  currentFocusedPost = null;
}

/**
 * @param {Array<Element>} posts
 * @returns {Element | undefined}
 */
function getFirstVisiblePost(posts) {
  const headerOffset = 49;

  // First try to find a post that's significantly visible
  const wellVisiblePost = posts.find((post) => {
    const rect = post.getBoundingClientRect();
    // Require that at least half the post is visible and it's not substantially above the header
    const postHeight = rect.bottom - rect.top;
    const visibleHeight =
      Math.min(rect.bottom, window.innerHeight) -
      Math.max(rect.top, headerOffset);
    return visibleHeight > postHeight / 2 && rect.bottom > headerOffset;
  });

  if (wellVisiblePost) {
    return wellVisiblePost;
  }

  // Fall back to first partially visible post
  return posts.find((post) => {
    const rect = post.getBoundingClientRect();
    return rect.bottom > headerOffset && rect.top < window.innerHeight;
  });
}

function handleKeyPress(event) {
  // Only handle keys when not in an input field
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    openCurrentPost();
    return;
  }
  if (event.key !== "j" && event.key !== "k" && event.key !== "l") {
    return;
  }

  // For the rest of these, we want to infer a current post
  // if needed.
  const posts = getAllPosts();
  if (!posts.length) return;

  let wasFocused = true;
  let currentPostIndex = null;
  if (currentFocusedPost) {
    currentPostIndex = posts.indexOf(currentFocusedPost);
    if (currentPostIndex === -1) {
      currentFocusedPost = null;
    }
  }
  if (!currentFocusedPost) {
    wasFocused = false;
    currentFocusedPost = getFirstVisiblePost(posts);
    if (!currentFocusedPost) {
      return;
    }
    focusPost(currentFocusedPost);
  }

  if (event.key === "l") {
    event.preventDefault();
    likeCurrentPost();
    return;
  }

  if (!wasFocused) {
    return;
  }

  if (event.key === "j" || event.key === "k") {
    event.preventDefault();

    const currentIndex = posts.indexOf(currentFocusedPost);
    if (currentIndex === -1) {
      return;
    }

    let nextIndex;
    if (event.key === "j") {
      // Move down
      nextIndex = Math.min(currentIndex + 1, posts.length - 1);
    } else {
      // Move up
      nextIndex = Math.max(currentIndex - 1, 0);
    }

    focusPost(posts[nextIndex]);
  }
}

// Add keyboard listener
document.addEventListener("keydown", handleKeyPress);

// Add click listener to clear focus on user clicks
document.addEventListener("click", (event) => {
  if (!isExtensionClick) {
    currentFocusedPost?.classList.remove("bsky-focused-post");
    currentFocusedPost = null;
  }
});

// Focus first post on load
window.addEventListener("load", () => {
  const posts = getAllPosts();
  if (posts.length) {
    const firstVisible = getFirstVisiblePost(posts);
    if (firstVisible) {
      focusPost(firstVisible);
    }
  }
});
