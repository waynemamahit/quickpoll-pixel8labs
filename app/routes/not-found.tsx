export function meta() {
  return [
    { title: "Page Not Found" },
    { name: "description", content: "The requested page could not be found." },
  ];
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-base-content/20 mb-4">404</h1>
        <p className="text-xl text-base-content/60">Page not found</p>
      </div>
    </div>
  );
}
