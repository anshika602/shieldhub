import { useEffect, useState } from "react";

interface User {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

interface Repository {
  id: number;
  name: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}
interface Recommendation {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  matchScore: number;
  scoreBreakdown: {
    language: number;
    topics: number;
    popularity: number;
    activity: number;
  };
}

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
const [skills, setSkills] = useState<
  { language: string; repositories: number }[]
>([]);
const [recommendations, setRecommendations] =
  useState<Recommendation[]>([]);

const [selectedLanguage, setSelectedLanguage] =
  useState("All");

const [minimumScore, setMinimumScore] = useState(0);

const [activity, setActivity] = useState({
  commits: 0,
  pullRequests: 0,
  issues: 0,
  stars: 0,
  totalEvents: 0,
});

const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:5000/auth/me", {
        credentials: "include",
      }).then((response) => {
        if (!response.ok) {
          throw new Error("Not authenticated");
        }

        return response.json();
      }),

      fetch("http://localhost:5000/api/repositories", {
        credentials: "include",
      }).then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch repositories");
        }

        return response.json();
      }),
      fetch("http://localhost:5000/api/skills", {
        credentials: "include",
      }).then((response) => {
        if (!response.ok) throw new Error("Failed to fetch skills");
        return response.json();
      }),
      fetch("http://localhost:5000/api/activity", {
        credentials: "include",
      }).then((response) => {
        if (!response.ok) throw new Error("Failed to fetch activity");
        return response.json();
      }),

          fetch("http://localhost:5000/api/recommendations", {
        credentials: "include",
      }).then((response) => {
        if (!response.ok) throw new Error("Failed to fetch recommendations");
        return response.json();
      }),
    ])
      .then(([userData, repositoryData, skillsData, activityData, recommendationsData]) => {
        setUser(userData.user);
        setRepositories(repositoryData.repositories);
         setSkills(skillsData.skills);
         setActivity(activityData);
         setRecommendations(recommendationsData.recommendations);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-xl">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold">
            Welcome to ShieldHub
          </h1>

          <p className="mb-6 text-gray-600">
            Connect your GitHub account to get started.
          </p>

          <button
            onClick={() => {
              window.location.href =
                "http://localhost:5000/auth/github";
            }}
            className="rounded-lg bg-black px-6 py-3 font-semibold text-white"
          >
            Login with GitHub
          </button>
        </div>
      </div>
    );
  }

  const totalStars = repositories.reduce(
    (sum, repo) => sum + repo.stargazers_count,
    0
  );

  const totalForks = repositories.reduce(
    (sum, repo) => sum + repo.forks_count,
    0
  );
  const recommendationLanguages = [
  ...new Set(
    recommendations
      .map((repo) => repo.language)
      .filter((language): language is string => Boolean(language))
  ),
].sort();

const filteredRecommendations = recommendations.filter((repo) => {
  const matchesLanguage =
    selectedLanguage === "All" ||
    repo.language === selectedLanguage;

  const matchesScore = repo.matchScore >= minimumScore;

  return matchesLanguage && matchesScore;
});

  return (
    <div className="p-8">

      {/* Profile */}
      <div className="mb-10 flex items-center gap-4">
        <img
          src={user.avatar_url}
          alt={user.login}
          className="h-16 w-16 rounded-full"
        />

        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user.name || user.login} 👋
          </h1>

          <p className="text-gray-600">
            @{user.login}
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-3">

        <div className="rounded-xl border p-6 shadow-sm">
          <p className="text-gray-500">
            Repositories
          </p>

          <p className="mt-2 text-3xl font-bold">
            {repositories.length}
          </p>
        </div>

        <div className="rounded-xl border p-6 shadow-sm">
          <p className="text-gray-500">
            Total Stars
          </p>

          <p className="mt-2 text-3xl font-bold">
            ⭐ {totalStars}
          </p>
        </div>

        <div className="rounded-xl border p-6 shadow-sm">
          <p className="text-gray-500">
            Total Forks
          </p>

          <p className="mt-2 text-3xl font-bold">
            🍴 {totalForks}
          </p>
        </div>

      </div>
      <div className="mt-8">
  <h2 className="mb-4 text-xl font-bold">
    GitHub Activity
  </h2>

  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

    <div className="rounded-lg border p-5">
      <p className="text-gray-500">Commits</p>
      <p className="mt-2 text-3xl font-bold">
        {activity.commits}
      </p>
    </div>

    <div className="rounded-lg border p-5">
      <p className="text-gray-500">Pull Requests</p>
      <p className="mt-2 text-3xl font-bold">
        {activity.pullRequests}
      </p>
    </div>

    <div className="rounded-lg border p-5">
      <p className="text-gray-500">Issues</p>
      <p className="mt-2 text-3xl font-bold">
        {activity.issues}
      </p>
    </div>

    <div className="rounded-lg border p-5">
      <p className="text-gray-500">Stars</p>
      <p className="mt-2 text-3xl font-bold">
        {activity.stars}
      </p>
    </div>

  </div>
</div>

      {/* Languages */}
      <div className="mt-8">
  <h2 className="mb-4 text-xl font-bold">
    Your Tech Stack
  </h2>

  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {skills.map((skill) => (
      <div
        key={skill.language}
        className="rounded-lg border p-4"
      >
        <h3 className="font-semibold">
          {skill.language}
        </h3>

        <p className="text-gray-500">
          Used in {skill.repositories} repositories
        </p>
      </div>
      
    ))}
  </div>
</div>


   {/* Languages */}
<div className="mt-8">
  <h2 className="mb-4 text-xl font-bold">
    Your Tech Stack
  </h2>

  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {skills.map((skill) => (
      <div
        key={skill.language}
        className="rounded-lg border p-4"
      >
        <h3 className="font-semibold">
          {skill.language}
        </h3>

        <p className="text-gray-500">
          Used in {skill.repositories} repositories
        </p>
      </div>
    ))}
  </div>
</div>

     
{/* Recommendations */}
<div className="mt-8">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
    <div>
      <h2 className="text-xl font-bold">
        Recommended for You
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Repositories ranked using your GitHub profile.
      </p>
    </div>

    <div className="flex flex-wrap gap-3">
      <select
        value={selectedLanguage}
        onChange={(e) => setSelectedLanguage(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm"
        aria-label="Filter by programming language"
      >
        <option value="All">All languages</option>

        {recommendationLanguages.map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </select>

      <select
        value={minimumScore}
        onChange={(e) => setMinimumScore(Number(e.target.value))}
        className="rounded-lg border px-3 py-2 text-sm"
        aria-label="Minimum match score"
      >
        <option value={0}>Any match score</option>
        <option value={40}>40% or higher</option>
        <option value={60}>60% or higher</option>
        <option value={80}>80% or higher</option>
      </select>
    </div>
  </div>

  <p className="mb-4 text-sm text-gray-500">
    Showing {filteredRecommendations.length} of{" "}
    {recommendations.length} recommendations
  </p>

  {filteredRecommendations.length === 0 ? (
    <div className="rounded-xl border p-8 text-center">
      <h3 className="font-semibold">
        No matching repositories
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        Try selecting another language or lowering the
        minimum match score.
      </p>

      <button
        onClick={() => {
          setSelectedLanguage("All");
          setMinimumScore(0);
        }}
        className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
      >
        Reset filters
      </button>
    </div>
  ) : (
    <div className="grid gap-4 md:grid-cols-2">
      {filteredRecommendations.slice(0, 6).map((repo) => (
        <div
          key={repo.id}
          className="rounded-xl border p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                {repo.name}
              </h3>

              <p className="text-sm text-gray-500">
                {repo.full_name}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
              {repo.matchScore}% Match
            </span>
          </div>

          <p className="mt-3 text-sm text-gray-600">
            {repo.description || "No description available."}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>⭐ {repo.stars}</span>
            <span>🍴 {repo.forks}</span>
            <span>💻 {repo.language || "Unknown"}</span>
          </div>

          {repo.topics?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {repo.topics.slice(0, 5).map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          <details className="mt-4 rounded-lg bg-gray-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Why this recommendation?
            </summary>

            <div className="mt-3 space-y-3 text-sm">
              {(
                [
                  ["Language", repo.scoreBreakdown.language, 40],
                  ["Topics", repo.scoreBreakdown.topics, 25],
                  ["Popularity", repo.scoreBreakdown.popularity, 20],
                  ["Activity", repo.scoreBreakdown.activity, 15],
                ] as const
              ).map(([label, score, weight]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between gap-2">
                    <span>{label} ({weight}% weight)</span>
                    <span className="font-medium">
                      {score}/100
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${Math.max(0, Math.min(100, score))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              <p className="border-t pt-2 text-xs text-gray-500">
                The match score is a weighted estimate based
                on language, topics, popularity and activity.
                It is not a probability of user satisfaction.
              </p>
            </div>
          </details>

          <div className="mt-4 text-right">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              View Repository →
            </a>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

</div>
  );
}

export default Dashboard;