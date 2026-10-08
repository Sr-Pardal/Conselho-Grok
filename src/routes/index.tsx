import { createFileRoute } from "@tanstack/react-router";
import { CouncilApp } from "@/components/council-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CouncilApp />;
}
