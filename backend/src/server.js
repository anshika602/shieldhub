require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");

const app = express();
const PORT = 5000;

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

app.use(
  session({
    secret: "shieldhub-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  })
);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "ShieldHub backend is running!",
  });
});

app.get("/auth/github", (req, res) => {
  const githubAuthUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${process.env.GITHUB_CALLBACK_URL}` +
    `&scope=read:user user:email`;

  res.redirect(githubAuthUrl);
});
app.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("No authorization code received.");
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(400).json({
        message: "Failed to get GitHub access token",
        error: tokenData,
      });
    }
  

    // 2. Get GitHub user profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });

    const userData = await userResponse.json();

    // 3. Store user information in session
    req.session.githubUser = userData;

    // Store GitHub access token in session
req.session.githubAccessToken = tokenData.access_token;

    // 4. Send profile information to browser
    res.redirect("http://localhost:5173/");

  } catch (error) {
    console.error("GitHub OAuth error:", error);
    res.status(500).send("GitHub authentication failed.");
  }
});

app.get("/auth/me", (req, res) => {
  if (!req.session.githubUser) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  res.json({
    user: req.session.githubUser,
  });
});

app.get("/api/repositories", async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.githubUser) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    // Get GitHub access token from session
    const accessToken = req.session.githubAccessToken;

    if (!accessToken) {
      return res.status(401).json({
        message: "GitHub access token not found",
      });
    }

    // Fetch repositories from GitHub
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to fetch repositories from GitHub",
      });
    }

    const repositories = await response.json();

    res.json({
      repositories,
    });
  } catch (error) {
    console.error("Repository fetch error:", error);

    res.status(500).json({
      message: "Failed to fetch repositories",
    });
  }
});
app.get("/api/search-repositories", async (req, res) => {
  try {
    const { q, language, sort } = req.query;

    if (!q) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    // Build GitHub search query
    let searchQuery = q;

    if (language) {
      searchQuery += ` language:${language}`;
    }

    const githubUrl = new URL(
      "https://api.github.com/search/repositories"
    );

    githubUrl.searchParams.set("q", searchQuery);
    githubUrl.searchParams.set(
      "sort",
      sort || "stars"
    );
    githubUrl.searchParams.set("order", "desc");
    githubUrl.searchParams.set("per_page", "20");

    const response = await fetch(githubUrl, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();

      return res.status(response.status).json({
        message: "GitHub repository search failed",
        error: errorData,
      });
    }

    const data = await response.json();

    // Return only the information ShieldHub needs
    const repositories = data.items.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      open_issues: repo.open_issues_count,
      topics: repo.topics,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url,
      },
    }));

    res.json({
      total_count: data.total_count,
      repositories,
    });
  } catch (error) {
    console.error("Repository search error:", error);

    res.status(500).json({
      message: "Failed to search repositories",
    });
  }
});

app.get("/api/skills", async (req, res) => {
  try {
    if (!req.session.githubUser) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const accessToken = req.session.githubAccessToken;

    if (!accessToken) {
      return res.status(401).json({
        message: "GitHub access token not found",
      });
    }

    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to fetch repositories",
      });
    }

    const repositories = await response.json();

    const languageCount = {};

    repositories.forEach((repo) => {
      if (repo.language) {
        languageCount[repo.language] =
          (languageCount[repo.language] || 0) + 1;
      }
    });

    const skills = Object.entries(languageCount)
      .map(([language, repositories]) => ({
        language,
        repositories,
      }))
      .sort((a, b) => b.repositories - a.repositories);

    res.json({
      skills,
    });
  } catch (error) {
    console.error("Skills error:", error);

    res.status(500).json({
      message: "Failed to calculate skills",
    });
  }
});

// GitHub activity
app.get("/api/activity", async (req, res) => {
  try {
    console.log("Activity user:", req.session.githubUser?.login);
    console.log("Activity has token:", !!req.session.githubAccessToken);
    if (!req.session.githubUser) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const accessToken = req.session.githubAccessToken;

    if (!accessToken) {
      return res.status(401).json({
        message: "GitHub access token not found",
      });
    }

    const response = await fetch(
      `https://api.github.com/users/${req.session.githubUser.login}/events?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();

      console.log("GitHub Activity API Error:");
      console.log("Status:", response.status);
      console.log("Response:", errorData);

      return res.status(response.status).json({
        message: "Failed to fetch GitHub activity",
        githubError: errorData,
      });
    }

    const events = await response.json();

    let commits = 0;
    let pullRequests = 0;
    let issues = 0;
    let stars = 0;

    events.forEach((event) => {
      if (event.type === "PushEvent") {
        commits += event.payload.commits?.length || 0;
      }

      if (event.type === "PullRequestEvent") {
        pullRequests++;
      }

      if (event.type === "IssuesEvent") {
        issues++;
      }

      if (
        event.type === "WatchEvent" &&
        event.payload.action === "started"
      ) {
        stars++;
      }
    });

    res.json({
      commits,
      pullRequests,
      issues,
      stars,
      totalEvents: events.length,
    });
  } catch (error) {
    console.error("Activity error:", error);

    res.status(500).json({
      message: "Failed to calculate GitHub activity",
    });
  }
});

// ==========================================
// ShieldHub: Weighted Repository Recommendations
// ==========================================

// Calculate topic similarity using Jaccard similarity
function calculateTopicScore(userTopics, repoTopics) {
  if (!userTopics.length || !repoTopics.length) {
    return 0;
  }

  const userTopicSet = new Set(
    userTopics.map((topic) => topic.toLowerCase())
  );

  const repoTopicSet = new Set(
    repoTopics.map((topic) => topic.toLowerCase())
  );

  const intersection = [...userTopicSet].filter(
    (topic) => repoTopicSet.has(topic)
  ).length;

  const union = new Set([
    ...userTopicSet,
    ...repoTopicSet,
  ]).size;

  return union ? (intersection / union) * 100 : 0;
}

// Calculate repository activity score.
// More recently updated repositories receive higher scores.
function calculateActivityScore(pushedAt) {
  if (!pushedAt) return 0;

  const lastPush = new Date(pushedAt).getTime();

  if (Number.isNaN(lastPush)) return 0;

  const daysSincePush = Math.max(
    0,
    (Date.now() - lastPush) / (1000 * 60 * 60 * 24)
  );

  // Activity score decreases as the repository gets older.
  return 100 * Math.exp(-daysSincePush / 180);
}

// Calculate normalized popularity using star counts.
function calculatePopularityScore(stars, maxStars) {
  if (maxStars <= 0 || stars <= 0) return 0;

  return (
    (Math.log1p(stars) / Math.log1p(maxStars)) * 100
  );
}

// Calculate language score based on the user's repository history.
function calculateLanguageScore(language, languageCount, maxCount) {
  if (!language || maxCount <= 0) return 0;

  const count = languageCount[language] || 0;

  return (count / maxCount) * 100;
}

app.get("/api/recommendations", async (req, res) => {
  try {
    // 1. Check authentication
    if (!req.session.githubUser) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const accessToken = req.session.githubAccessToken;

    if (!accessToken) {
      return res.status(401).json({
        message: "GitHub access token not found",
      });
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // 2. Fetch the user's repositories
    const userReposResponse = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated",
      { headers }
    );

    if (!userReposResponse.ok) {
      return res.status(userReposResponse.status).json({
        message: "Failed to fetch user repositories",
      });
    }

    const userRepos = await userReposResponse.json();

    // 3. Analyze the user's programming languages and topics
    const languageCount = {};
    const userTopics = new Set();

    userRepos.forEach((repo) => {
      if (repo.language) {
        languageCount[repo.language] =
          (languageCount[repo.language] || 0) + 1;
      }

      (repo.topics || []).forEach((topic) => {
        userTopics.add(topic.toLowerCase());
      });
    });

    const userLanguages = Object.keys(languageCount);

 
    // 4. Find the user's most common languages.
    const topLanguages = Object.entries(languageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([language]) => language);

    // Avoid -Infinity when the user has no language data.
    const maxLanguageCount = Math.max(
      0,
      ...Object.values(languageCount)
    );

    // 5. Choose recommendation searches with fallbacks.
    let searchQueries = [];

    if (topLanguages.length > 0) {
      // Primary: search by programming languages.
      searchQueries = topLanguages.map(
        (language) => `language:${language} fork:false`
      );
    } else if (userTopics.size > 0) {
      // Fallback 1: search by the user's repository topics.
      searchQueries = [...userTopics]
        .slice(0, 3)
        .map((topic) => `topic:${topic} fork:false`);
    } else {
      // Fallback 2: discover popular public repositories.
      searchQueries = ["stars:>1000 fork:false"];
    }

    // 6. Search GitHub. One failed search should not stop the others.
    const searchResults = await Promise.all(
      searchQueries.map(async (query) => {
        try {
          const searchUrl = new URL(
            "https://api.github.com/search/repositories"
          );

          searchUrl.searchParams.set("q", query);
          searchUrl.searchParams.set("sort", "stars");
          searchUrl.searchParams.set("order", "desc");
          searchUrl.searchParams.set("per_page", "20");

          const response = await fetch(searchUrl, { headers });

          if (!response.ok) {
            console.error(
              `GitHub search failed (${response.status}) for: ${query}`
            );
            return [];
          }

          const data = await response.json();
          return data.items || [];
        } catch (error) {
          console.error(`Search error for "${query}":`, error);
          return [];
        }
      })
    );

    // Continue into the existing deduplication and scoring sections.


    // 5. Combine results and remove duplicate repositories
    const userRepoIds = new Set(
      userRepos.map((repo) => repo.id)
    );

    const uniqueRepos = new Map();

    searchResults.flat().forEach((repo) => {
      // Do not recommend the user's own repositories.
      if (userRepoIds.has(repo.id)) return;

      uniqueRepos.set(repo.id, repo);
    });

    const candidates = [...uniqueRepos.values()];

    if (candidates.length === 0) {
  return res.json({
    basedOn: topLanguages,
    recommendations: [],
    message:
      "No suitable repositories found. Try again later.",
  });
}

    // 6. Find the maximum star count for normalization
    const maxStars = Math.max(
      ...candidates.map((repo) => repo.stargazers_count || 0)
    );

    // 7. Calculate the weighted score for every repository
    const recommendations = candidates.map((repo) => {
      const languageScore = calculateLanguageScore(
        repo.language,
        languageCount,
        maxLanguageCount
      );

      const topicScore = calculateTopicScore(
        [...userTopics],
        repo.topics || []
      );

      const popularityScore = calculatePopularityScore(
        repo.stargazers_count || 0,
        maxStars
      );

      const activityScore = calculateActivityScore(
        repo.pushed_at
      );

      // Weighted scoring system: total weight = 100%
      const matchScore = Math.round(
        languageScore * 0.40 +
        topicScore * 0.25 +
        popularityScore * 0.20 +
        activityScore * 0.15
      );

      return {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        topics: repo.topics || [],
        pushed_at: repo.pushed_at,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },

        matchScore,

        scoreBreakdown: {
          language: Math.round(languageScore),
          topics: Math.round(topicScore),
          popularity: Math.round(popularityScore),
          activity: Math.round(activityScore),
        },
      };
    });

    // 8. Sort recommendations from highest to lowest score
    recommendations.sort(
      (a, b) => b.matchScore - a.matchScore
    );

    // 9. Send recommendations to the Dashboard
    res.json({
      basedOn: topLanguages,
      recommendations,
    });
  } catch (error) {
    console.error("Recommendation error:", error);

    res.status(500).json({
      message: "Failed to generate recommendations",
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});