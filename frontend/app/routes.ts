import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"), // Page de connexion "/"
  route("dashboard", "routes/dashboard.tsx"), // Dashboard "/dashboard"
  route("ajouter-camion", "routes/ajouter-camion.tsx"), // Ajout/modification/suppression
] satisfies RouteConfig;
