import { useEffect, useState } from "react";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  topics: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
}

function Repositories() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load user's repositories initially
  useEffect(() => {
    fetch("http://localhost:5000/api/repositories", {
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch repositories");
        }

        return response.json();
      })
      .then((data) => {
        const formattedRepositories = data.repositories.map(
          (repo: any) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            open_issues: repo.open_issues_count,
            topics: repo.topics || [],
            owner: {
              login: repo.owner?.login || "",
              avatar_url: repo.owner?.avatar_url || "",
            },
          })
        );

        setRepositories(formattedRepositories);
      })
      .catch((error) => {
        console.error(error);
        setError("Unable to load repositories.");
      });
  }, []);

  const searchRepositories = async () => {
    if (!search.trim()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      let url =
        `http://localhost:5000/api/search-repositories?q=${encodeURIComponent(
          search
        )}`;

      if (language) {
        url += `&language=${encodeURIComponent(language)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

      setRepositories(data.repositories);
    } catch (error) {
      console.error(error);
      setError("Unable to search repositories.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Repository Explorer
        </h1>

        <p className="mt-2 text-gray-600">
          Discover open-source projects on GitHub.
        </p>
      </div>

      {/* Search */}
      <div className="mb-8 flex flex-col gap-3 md:flex-row">

        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              searchRepositories();
            }
          }}
          className="flex-1 rounded-lg border px-4 py-3 outline-none focus:ring-2"
        />

        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="rounded-lg border px-4 py-3"
        >
          <option value="">All Languages</option>
          <option value="JavaScript">JavaScript</option>
          <option value="TypeScript">TypeScript</option>
          <option value="Python">Python</option>
          <option value="C++">C++</option>
          <option value="Java">Java</option>
          <option value="Go">Go</option>
          <option value="Rust">Rust</option>
        </select>

        <button
          onClick={searchRepositories}
          disabled={loading}
          className="rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>

      </div>

      {/* Error */}
      {error && (
        <p className="mb-6 text-red-500">
          {error}
        </p>
      )}

      {/* Repository Cards */}
      {repositories.length === 0 ? (
        <p>No repositories found.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="rounded-xl border p-6 shadow-sm transition hover:shadow-md"
            >

              <div className="mb-3">
                <h2 className="text-xl font-semibold">
                  {repo.name}
                </h2>

                <p className="text-sm text-gray-500">
                  {repo.full_name}
                </p>
              </div>

              <p className="mb-4 min-h-[48px] text-sm text-gray-600">
                {repo.description ||
                  "No description available."}
              </p>

              {/* Language */}
              {repo.language && (
                <div className="mb-4">
                  <span className="rounded-full border px-3 py-1 text-sm">
                    {repo.language}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="mb-4 flex gap-4 text-sm">
                <span>⭐ {repo.stars}</span>
                <span>🍴 {repo.forks}</span>
                <span>🐛 {repo.open_issues}</span>
              </div>

              {/* Topics */}
              {repo.topics?.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {repo.topics.slice(0, 4).map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              )}

              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                View on GitHub →
              </a>

            </div>
          ))}

        </div>
      )}

    </div>
  );
}

export default Repositories;