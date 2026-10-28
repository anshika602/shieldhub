function Profile() {
  const loginWithGitHub = () => {
    window.location.href = "http://localhost:5000/auth/github";
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <button
        onClick={loginWithGitHub}
        className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
      >
        Login with GitHub
      </button>
    </div>
  );
}

export default Profile;