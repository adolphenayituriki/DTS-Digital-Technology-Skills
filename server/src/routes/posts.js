import { Router } from "express";
import Post from "../models/Post.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import { pick } from "../utils/pick.js";
import { parsePage, pageResponse } from "../utils/pagination.js";

const router = Router();

// What an editor may change. Deliberately excludes `author`: it is stamped from
// the signed-in user on create and is not reassignable, so a post can never be
// re-attributed to someone else after the fact. `_id`, `createdAt` and
// `updatedAt` are not editable on any route.
const EDITABLE = [
  "title",
  "content",
  "excerpt",
  "category",
  "isPublished",
  "featuredImage",
  "steps",
];

// The create handler stores `steps` as an array, so a non-array would fail
// validation on update. Drop it instead of letting it surface as a 500.
const normalizeSteps = (payload) => {
  if (!("steps" in payload)) return payload;
  if (Array.isArray(payload.steps)) return payload;
  const { steps, ...rest } = payload;
  return rest;
};

// Cards and search results need a blurb, never an article.
//
// This endpoint used to ship the full `content` of every published post to two
// consumers: the news grid, which renders title/image/excerpt, and the navbar
// search index, which matches on title alone. Article bodies are the bulk of a
// post's bytes, so the news page was paying for every full article to draw a row
// of cards, and the navbar did it again the first time someone typed a letter.
// Neither body was ever rendered from this route - the detail page at /:slug
// still returns it in full.
//
// Tags are stripped because `content` is stored as HTML: taking a raw substring
// of `<p>` markup produces a broken fragment in the card, which is what the old
// `p.content.substring(0, 120)` fallback did.
const stripTags = (html) => String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

router.get("/", async (req, res) => {
  try {
    const posts = await Post.find({ isPublished: true })
      .populate("author", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      posts.map(({ content, ...rest }) => ({
        ...rest,
        // Serves both the card and the list's own search, so dropping `content`
        // does not silently remove the ability to find a post by its text.
        summary: stripTags(rest.excerpt || content).slice(0, 180),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/all", auth, requireRole("admin", "editor", "secretary"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePage(req.query);
    const filter = {};
    const [posts, total] = await Promise.all([
      Post.find(filter).populate("author", "name").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Post.countDocuments(filter),
    ]);

    // `content` is deliberately retained here, unlike the public route: the admin
    // editor populates its textarea straight from a row, so projecting it out
    // would hand the editor an empty body and a save would erase the article.
    // Paging is what bounds the payload - every full post still ships, just 50 at
    // a time instead of all of them.
    res.json(
      pageResponse({ items: posts, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).populate(
      "author",
      "name"
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const { title, content, excerpt, featuredImage, category, isPublished, steps } =
      req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required" });
    }

    const post = await Post.create({
      title,
      content,
      excerpt,
      featuredImage,
      category,
      isPublished,
      steps: Array.isArray(steps) ? steps : [],
      author: req.user._id,
    });

    res.status(201).json(post);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A post with a similar title already exists" });
    }
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", auth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const payload = normalizeSteps(pick(req.body, EDITABLE));
    const post = await Post.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A post with a similar title already exists" });
    }
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
