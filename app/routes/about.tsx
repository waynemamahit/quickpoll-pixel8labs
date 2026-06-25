import { Link } from "react-router";

export function meta() {
  return [
    { title: "New React Router App | About" },
    { name: "description", content: "About Page!" },
  ];
}

export default function About() {
  return (
    <div>
      <h1>THIS IS ABOUT PAGE</h1>
      <Link to="/">Back to Home</Link>
    </div>
  );
}
